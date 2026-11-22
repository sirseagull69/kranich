'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const kern = require('../kern');
const { erstelleEinstellungen } = require('../main/einstellungen');
const { erstelleVerbund, VERBUND_FUER_OBERFLAECHE } = require('../main/verbund');

const URL_ = 'https://beispiel.supabase.co';
const krypto = { verschluessle: (t) => 'geheim:' + Buffer.from(t).toString('base64'), entschluessle: (g) => Buffer.from(g.slice(7), 'base64').toString() };
const SCHLUESSEL = 'f'.repeat(64);

function aufbau({ sicher = true } = {}) {
  const daten = fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-verbund-'));
  const welt = { kopple: { ok: true, geraet_id: 'g-1', schluessel: SCHLUESSEL, name: 'Zephyrus', system: 'windows' }, melden: [200, { ok: true }], aufrufe: [], ereignisse: [] };
  const fetch = async (url, o) => {
    const name = url.split('/').pop().split('?')[0];
    const werte = o.body ? JSON.parse(o.body) : undefined;
    welt.aufrufe.push({ name, werte, kopf: o.headers });
    const antwort = (s, d) => ({ status: s, ok: s < 300, json: async () => d });
    if (name === 'agent_kopple') return antwort(200, welt.kopple);
    if (name === 'agent_melde') return antwort(...welt.melden);
    if (name === 'agent_auftraege') return antwort(200, []);
    return antwort(404, {});
  };
  const neu = () => {
    const einstellungen = erstelleEinstellungen({ datei: path.join(daten, 'e.json'), ...(sicher ? krypto : { verschluessle: () => null, entschluessle: () => null }) });
    const defender = { lage: async () => ({ status: { echtzeit: true }, funde: [], ampel: { stufe: 'ok', gruende: [] }, fehler: [] }) };
    return erstelleVerbund({ kern, einstellungen, zugang: { url: URL_, apiSchluessel: 'api' }, plattform: 'win32', datenOrdner: daten, defender, version: '0.4.0', fetch, melde: (e) => welt.ereignisse.push(e) });
  };
  return { welt, neu, daten };
}
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

test('Verbund: koppeln, melden, Neustart, Schlüssel nie im Klartext', async () => {
  const { welt, neu, daten } = aufbau();
  let v = neu();
  assert.equal(v.agentStatus().gekoppelt, false);
  assert.equal((await v.agentKoppeln('123')).ok, false);
  assert.deepEqual(await v.agentKoppeln('4821 7730'), { ok: true, name: 'Zephyrus' });
  assert.deepEqual(welt.aufrufe[0].werte, { p_code: '48217730' });
  await warte(60);
  const meldung = welt.aufrufe.find((a) => a.name === 'agent_melde');
  assert.equal(meldung.werte.p_schluessel, SCHLUESSEL);
  assert.equal(meldung.werte.p_meldung.ampel.stufe, 'ok');
  assert.equal(meldung.werte.p_meldung.version, '0.4.0');
  const s = v.agentStatus();
  assert.equal(s.gekoppelt, true);
  assert.equal(s.verbunden, true);
  assert.ok(s.letzteMeldung);
  for (const datei of fs.readdirSync(daten)) assert.ok(!fs.readFileSync(path.join(daten, datei), 'utf8').includes(SCHLUESSEL), datei);
  assert.equal((await v.agentKoppeln('48217730')).ok, false, 'ein gekoppeltes Gerät koppelt nicht noch einmal');
  v.beende();

  v = neu(); // Neustart
  assert.equal(v.agentStatus().gekoppelt, true);
  assert.equal(v.starte(), true);
  await warte(60);
  assert.equal(welt.aufrufe.filter((a) => a.name === 'agent_melde').length, 2);
  v.beende();
});

test('Verbund: im Host entferntes Gerät entkoppelt sich, falscher Code, kein sicherer Speicher', async () => {
  const a = aufbau();
  const v = a.neu();
  await v.agentKoppeln('48217730');
  await warte(40);
  a.welt.melden = [400, { code: '28000', message: 'Unbekannter Geräte-Schlüssel' }];
  await v.agentJetzt();
  await warte(40);
  assert.equal(v.agentStatus().gekoppelt, false);
  assert.match(v.agentStatus().fehler, /im Host entfernt/);
  v.beende();

  const b = aufbau();
  b.welt.kopple = { ok: false, grund: 'Der Code stimmt nicht oder ist abgelaufen' };
  assert.deepEqual(await b.neu().agentKoppeln('00000000'), { ok: false, grund: 'Der Code stimmt nicht oder ist abgelaufen' });

  const c = aufbau({ sicher: false });
  const antwort = await c.neu().agentKoppeln('48217730');
  assert.equal(antwort.ok, false);
  assert.match(antwort.grund, /sichere Speicher/);
  assert.equal(fs.existsSync(path.join(c.daten, 'agent.json')), false);
});

test('Verbund: was die Oberfläche aufrufen darf, gibt es auch', () => {
  const v = aufbau().neu();
  for (const name of VERBUND_FUER_OBERFLAECHE) assert.equal(typeof v[name], 'function', name);
  assert.deepEqual(v.kontoStatus(), { angemeldet: false, email: null });
  assert.equal(v.eigenesSystem(), 'windows');
});
