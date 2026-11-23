'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Speicher } = require('../kern/speicher');
const K = require('../kern/klopfen');
const H = require('../kern/helfer');
const W = require('../werkzeug/beispiel-wissen');
const { pruefe } = require('../kern/wissen');

// Kleiner Supabase-Ersatz im Speicher
function falscherDienst() {
  const zeilen = new Map(); let uhr = 0;
  const zeit = () => new Date(Date.UTC(2026, 10, 23, 12, 0, uhr++)).toISOString();
  const f = async (url, opt = {}) => {
    const u = new URL(url);
    if ((opt.method || 'GET') === 'GET') {
      const gt = u.searchParams.get('geaendert')?.replace('gt.', '');
      const liste = [...zeilen.values()].filter((z) => !gt || z.geaendert > gt).sort((a, b) => a.geaendert.localeCompare(b.geaendert));
      return { ok: true, status: 200, json: async () => liste };
    }
    const neu = JSON.parse(opt.body).map((z) => { const r = { ...z, geaendert: zeit() }; zeilen.set(z.id, r); return r; });
    return { ok: true, status: 201, json: async () => neu };
  };
  return { f, zeilen };
}
const konto = { url: 'https://x.supabase.co', schluessel: 'k', token: 't' };
const neuerSpeicher = (name) => new Speicher(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sp-')), 'd.json'), { geraet: name });

test('Einträge kommen auf dem zweiten Gerät an', async () => {
  const d = falscherDienst();
  const a = neuerSpeicher('Notebook'); const b = neuerSpeicher('Heim-PC');
  a.setze('notiz', null, { ziel: 'tel01', text: 'Hallo' });
  assert.strictEqual(a.wartend(), 1);
  const r = await a.sync(konto, d.f);
  assert.strictEqual(r.gesendet, 1); assert.strictEqual(a.wartend(), 0);
  await b.sync(konto, d.f);
  const n = b.alle('notiz');
  assert.strictEqual(n.length, 1); assert.strictEqual(n[0].text, 'Hallo'); assert.strictEqual(n[0]._geraet, 'Notebook');
});

test('Gleichzeitig geändert → Konflikt, lösbar mit „beide“', async () => {
  const d = falscherDienst();
  const a = neuerSpeicher('Notebook'); const b = neuerSpeicher('Heim-PC');
  const e = a.setze('stoerung', 'st-1', { was: 'Drucker', status: 'offen' });
  await a.sync(konto, d.f); await b.sync(konto, d.f);
  a.setze('stoerung', e.id, { was: 'Drucker', status: 'erledigt' });
  b.setze('stoerung', e.id, { was: 'Drucker', status: 'offen', loesung: 'Marcello ruft an' });
  await a.sync(konto, d.f);
  const r = await b.sync(konto, d.f);
  assert.strictEqual(r.konflikte, 1);
  b.loese('st-1', 'beide');
  assert.strictEqual(b.konflikte().length, 0);
  const alle = b.alle('stoerung');
  assert.strictEqual(alle.length, 2);
  assert.ok(alle.some((s) => s.status === 'erledigt'));
  assert.ok(alle.some((s) => /zweite Version/.test(s.was)));
});

test('Offline: Fehler, Änderung wartet', async () => {
  const a = neuerSpeicher('Notebook');
  a.setze('notiz', null, { ziel: 'x', text: 'y' });
  await assert.rejects(a.sync(konto, async () => { throw new Error('weg'); }), (f) => f.art === 'offline');
  assert.strictEqual(a.wartend(), 1);
});

test('Löschen wird synchronisiert', async () => {
  const d = falscherDienst();
  const a = neuerSpeicher('A'); const b = neuerSpeicher('B');
  const e = a.setze('freigabe', null, { pfad: '\\\\FILE01\\X' });
  await a.sync(konto, d.f); await b.sync(konto, d.f);
  assert.strictEqual(b.alle('freigabe').length, 1);
  a.loesche(e.id); await a.sync(konto, d.f); await b.sync(konto, d.f);
  assert.strictEqual(b.alle('freigabe').length, 0);
});

test('Ping: nur Antwort mit TTL zählt', () => {
  assert.strictEqual(K.werte(0, 'Antwort von 10.20.0.11: Bytes=32 Zeit<1ms TTL=128'), true);
  assert.strictEqual(K.werte(0, 'Antwort von 10.20.0.99: Zielhost nicht erreichbar.'), false);
  assert.strictEqual(K.werte(1, ''), false);
  assert.deepStrictEqual(K.pingBefehl('1.2.3.4', 'win32'), ['ping', ['-n', '1', '-w', '1500', '1.2.3.4']]);
});

test('Ping lehnt komische Ziele ab (kein Einschleusen)', async () => {
  let gerufen = false;
  const r = await K.pinge('1.2.3.4 & del *', { _exec: () => { gerufen = true; } });
  assert.strictEqual(r.an, false); assert.strictEqual(gerufen, false);
});

test('Helfer liest JSON-Antwort und Befehle', () => {
  const r = H.leseAntwort('Hier: {"antwort":"Telefonie läuft auf TEL01.","befehle":[{"zweck":"Dienst","befehl":"sc query eucsrv"}],"aehnlich":["st-1"]}');
  assert.strictEqual(r.antwort, 'Telefonie läuft auf TEL01.');
  assert.strictEqual(r.befehle[0].befehl, 'sc query eucsrv');
  assert.deepStrictEqual(r.aehnlich, ['st-1']);
  assert.strictEqual(H.leseAntwort('kein json').antwort, 'kein json');
});

test('Beispiel-Wissen: keine Passwörter, wird gelesen', () => {
  const alles = JSON.stringify(W);
  assert.ok(!/passwort\s*[:=]|kennwort\s*[:=]/i.test(alles));
  const t = H.wissensText({ grund: pruefe(W).grund, stoerungen: W.STOERUNGEN, anleitungen: W.ANLEITUNGEN });
  assert.ok(t.includes('TEL01') && t.includes('Passbolt'));
});

test('Grundstock auf zwei Geräten: kein Konflikt, Änderungen kommen an', async () => {
  const d = falscherDienst();
  const g = [{ art: 'anleitung', id: 'an-x', daten: { titel: 'Betankung', schritte: ['a'] } }];
  const a = neuerSpeicher('A'); const b = neuerSpeicher('B');
  a.grundstock(g); b.grundstock(g);
  assert.strictEqual(a.wartend(), 0);
  a.setze('anleitung', 'an-x', { titel: 'Betankung neu', schritte: ['a', 'b'] });
  await a.sync(konto, d.f);
  const r = await b.sync(konto, d.f);
  assert.strictEqual(r.konflikte, 0);
  assert.strictEqual(b.hole('an-x').titel, 'Betankung neu');
});

test('Wissens-Datei: prüft Art, filtert kaputte IPs, lehnt Passwörter ab', () => {
  assert.throws(() => pruefe('{"x":1}'), /keine Specht-Wissens-Datei/);
  assert.throws(() => pruefe('kein json'), /kein JSON/);
  const r = pruefe({ art: 'specht-wissen', SERVER: [{ name: 'A', ip: '10.0.0.1' }, { name: 'B', ip: '10.0.0.1; rm' }] });
  assert.strictEqual(r.grund.SERVER.length, 1);
  assert.throws(() => pruefe({ art: 'specht-wissen', SERVER: [], NOTIZ: 'Passwort: geheim' }), /Passwort/);
});

test('App selbst enthält keine Firmendaten', () => {
  const app = ['main/main.js', 'kern/wissen.js', 'kern/helfer.js', 'ui/app.js'].map((f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
  assert.ok(!/192\.168\.20\.\d/.test(app.replace(/192\.168\.20\.x/g, '')), 'keine internen IPs in der App');
  assert.ok(!/SRV0\d\d|riwa\.local|ritterwand/i.test(app), 'keine Firmennamen in der App');
});

test('Keine Firmendaten im ganzen Specht-Ordner (Repo ist öffentlich)', () => {
  const alle = [];
  const geh = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (['node_modules', 'ausgabe', 'rauch', 'schrift'].includes(f.name)) continue; const p = path.join(d, f.name); if (f.isDirectory()) geh(p); else if (/\.(js|json|html|css|md|yml)$/.test(f.name) && f.name !== 'package-lock.json') alle.push(p); } };
  geh(path.join(__dirname, '..'));
  for (const p of alle) {
    const t = fs.readFileSync(p, 'utf8').replace(/keine Firmennamen|riwa\|ritterwand|ritterwand-wissen/gi, '');
    assert.ok(!/192\.168\.20\.|riwa\.local|SRV0\d\d/i.test(t), `Firmendaten in ${path.relative(path.join(__dirname, '..'), p)}`);
  }
});
