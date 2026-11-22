'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Konto, HostZentrale } = require('../kern');

const URL_ = 'https://beispiel.supabase.co';
const G = '11111111-2222-3333-4444-555555555555';

function attrappe(regeln) {
  const aufrufe = [];
  const fetch = async (url, o) => {
    const pfad = url.replace(URL_, '');
    aufrufe.push({ pfad, methode: o.method, kopf: o.headers, werte: o.body ? JSON.parse(o.body) : undefined });
    for (const [muster, antwort] of regeln) {
      if (pfad.includes(muster)) {
        const a = typeof antwort === 'function' ? antwort(aufrufe.at(-1)) : antwort;
        if (a instanceof Error) throw a;
        return { status: a[0], ok: a[0] < 300, json: async () => a[1] };
      }
    }
    return { status: 404, ok: false, json: async () => ({ message: 'nicht gefunden' }) };
  };
  return { fetch, aufrufe };
}
const speicher = () => { let w = null; return { lade: () => w, sichere: (x) => { w = x; }, wert: () => w }; };
const sitzung = (n) => ({ access_token: 'zugang' + n, refresh_token: 'dauer' + n, expires_in: 3600, user: { email: 'nils@beispiel.de' } });

test('Konto: anmelden, Fehler in normaler Sprache, abmelden', async () => {
  const sp = speicher();
  const { fetch, aufrufe } = attrappe([
    ['grant_type=password', (a) => (a.werte.password === 'richtig' ? [200, sitzung(1)] : [400, { error_code: 'invalid_credentials' }])],
    ['logout', [204, null]],
  ]);
  const konto = new Konto({ url: URL_, apiSchluessel: 'api', speicher: sp, fetch });
  assert.equal(konto.angemeldet, false);
  assert.deepEqual(await konto.anmelden('nils@beispiel.de', 'falsch'), { ok: false, code: 'invalid_credentials', grund: 'E-Mail oder Passwort stimmen nicht' });
  assert.deepEqual(await konto.anmelden(' nils@beispiel.de ', 'richtig'), { ok: true, email: 'nils@beispiel.de' });
  assert.equal(aufrufe[1].werte.email, 'nils@beispiel.de');
  assert.equal(sp.wert(), 'dauer1', 'nur das Dauerticket wird aufbewahrt');
  assert.equal(await konto.zugang(), 'zugang1');
  await konto.abmelden();
  assert.equal(sp.wert(), null);
  assert.equal(await konto.zugang(), null);
  assert.equal(aufrufe.at(-1).kopf.authorization, 'Bearer zugang1');
});

test('Konto: anlegen mit Bestätigung per Mail, schwaches Passwort, keine Verbindung', async () => {
  const mail = attrappe([['signup', [200, { id: 'u1', email: 'a@b.de' }]]]);
  const k1 = new Konto({ url: URL_, apiSchluessel: 'api', speicher: speicher(), fetch: mail.fetch });
  assert.deepEqual(await k1.anlegen('a@b.de', 'langgenug1'), { ok: true, bestaetigen: true });
  assert.equal(k1.angemeldet, false);
  assert.equal((await k1.anlegen('a@b.de', 'kurz')).ok, false);
  assert.equal(mail.aufrufe.length, 1, 'ein zu kurzes Passwort geht gar nicht erst raus');

  const offline = attrappe([['', new Error('offline')]]);
  const k2 = new Konto({ url: URL_, apiSchluessel: 'api', speicher: speicher(), fetch: offline.fetch });
  assert.equal((await k2.anmelden('a@b.de', 'x')).grund, 'Keine Verbindung zur Zentrale');
});

test('Konto: Ticket erneuert sich einmal, auch bei gleichzeitigen Anfragen, und überlebt Netzausfall', async () => {
  let uhr = 0; let n = 1; let netz = true;
  const sp = speicher();
  const { fetch, aufrufe } = attrappe([
    ['grant_type=password', () => [200, sitzung(n)]],
    ['grant_type=refresh_token', () => { if (!netz) return new Error('offline'); n += 1; return [200, sitzung(n)]; }],
  ]);
  const konto = new Konto({ url: URL_, apiSchluessel: 'api', speicher: sp, fetch, jetzt: () => uhr });
  await konto.anmelden('a@b.de', 'x');
  uhr = 3590 * 1000; // kurz vor Ablauf
  assert.deepEqual(await Promise.all([konto.zugang(), konto.zugang(), konto.zugang()]), ['zugang2', 'zugang2', 'zugang2']);
  assert.equal(aufrufe.filter((a) => a.pfad.includes('refresh_token')).length, 1);
  assert.equal(aufrufe.at(-1).werte.refresh_token, 'dauer1');
  assert.equal(sp.wert(), 'dauer2');

  // Neustart: nur das Dauerticket ist da
  const neu = new Konto({ url: URL_, apiSchluessel: 'api', speicher: sp, fetch, jetzt: () => uhr });
  assert.equal(neu.angemeldet, true);
  assert.equal(await neu.zugang(), 'zugang3');

  // Netzausfall meldet nicht ab
  uhr += 3600 * 1000; netz = false;
  assert.equal(await neu.zugang(), null);
  assert.equal(neu.angemeldet, true);
  netz = true;
  assert.equal(await neu.zugang(), 'zugang4');
});

test('Konto: ungültiges Dauerticket meldet ab', async () => {
  const sp = speicher(); sp.sichere('alt');
  const { fetch } = attrappe([['refresh_token', [400, { error_code: 'refresh_token_not_found' }]]]);
  const konto = new Konto({ url: URL_, apiSchluessel: 'api', speicher: sp, fetch });
  assert.equal(await konto.zugang(), null);
  assert.equal(konto.angemeldet, false);
  assert.equal(sp.wert(), null);
});

test('Host: liest Geräte, koppelt, sendet nur Aufträge von der festen Liste', async () => {
  const { fetch, aufrufe } = attrappe([
    ['grant_type=password', [200, sitzung(1)]],
    ['rpc/kopplung_erstellen', [200, '48217730']],
    ['geraete?select', [200, [{ id: G, name: 'Zephyrus', system: 'windows', ampel: 'ok' }]]],
    ['auftraege', (a) => (a.methode === 'POST' ? [201, [{ id: 'a1', ...a.werte, zustand: 'offen' }]] : [200, []])],
    ['geraete?id', [204, null]],
  ]);
  const konto = new Konto({ url: URL_, apiSchluessel: 'api', speicher: speicher(), fetch });
  const host = new HostZentrale({ url: URL_, apiSchluessel: 'api', konto, fetch });

  assert.deepEqual(await host.geraete(), { ok: false, grund: 'Nicht angemeldet', abgemeldet: true });
  await konto.anmelden('a@b.de', 'x');
  assert.equal((await host.geraete()).geraete[0].name, 'Zephyrus');
  assert.equal(aufrufe.at(-1).kopf.authorization, 'Bearer zugang1');
  assert.equal(aufrufe.at(-1).kopf.apikey, 'api');

  assert.deepEqual(await host.kopplungErstellen(' PC ', 'windows'), { ok: true, code: '48217730', gueltigMinuten: 10 });
  assert.deepEqual(aufrufe.at(-1).werte, { p_name: 'PC', p_system: 'windows' });
  assert.equal((await host.kopplungErstellen('x', 'playstation')).ok, false);

  const vorher = aufrufe.length;
  assert.equal((await host.auftragSenden(G, 'befehl')).ok, false);
  assert.equal((await host.auftragSenden(G, 'datei_loeschen')).ok, false);
  assert.equal((await host.auftragSenden("x'; drop table geraete;--", 'schnellscan')).ok, false);
  assert.equal(aufrufe.length, vorher, 'unerlaubte Aufträge gehen gar nicht erst raus');
  const a = await host.auftragSenden(G, 'schnellscan');
  assert.equal(a.auftrag.zustand, 'offen');
  assert.deepEqual(aufrufe.at(-1).werte, { geraet_id: G, art: 'schnellscan' });

  assert.equal((await host.geraetUmbenennen(G, '')).ok, false);
  assert.equal((await host.geraetUmbenennen(G, 'Laptop')).ok, true);
  assert.equal(aufrufe.at(-1).methode, 'PATCH');
  assert.equal((await host.geraetEntfernen(G)).ok, true);
  assert.equal((await host.funde('kaputt')).ok, false);
});
