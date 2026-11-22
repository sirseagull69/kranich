'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Zentrale, Agent, dateiSpeicher } = require('../kern');

const URL_ = 'https://beispiel.supabase.co';
function attrappe(antworten) {
  const aufrufe = [];
  const fetch = async (url, optionen) => {
    const name = url.split('/').pop();
    aufrufe.push({ url, name, kopf: optionen.headers, werte: JSON.parse(optionen.body) });
    const a = antworten[name];
    if (a instanceof Error) throw a;
    const [status, daten] = a ?? [200, { ok: true }];
    return { status, ok: status < 300, json: async () => daten };
  };
  return { fetch, aufrufe };
}

test('Zentrale: ruft die vier Funktionen mit Geraete-Schluessel auf', async () => {
  const { fetch, aufrufe } = attrappe({ agent_auftraege: [200, [{ id: 'a1', art: 'schnellscan' }]] });
  const z = new Zentrale({ url: URL_ + '/', apiSchluessel: 'api', geraeteSchluessel: 'geheim', fetch });
  await z.sende({ zeit: 'jetzt' });
  assert.deepEqual(await z.holeAuftraege(), [{ id: 'a1', art: 'schnellscan' }]);
  await z.bestaetige('a1', { zustand: 'erledigt' });

  assert.deepEqual(aufrufe.map((a) => a.name), ['agent_melde', 'agent_auftraege', 'agent_bestaetige']);
  assert.equal(aufrufe[0].url, URL_ + '/rest/v1/rpc/agent_melde');
  assert.equal(aufrufe[0].kopf.apikey, 'api');
  assert.deepEqual(aufrufe[0].werte, { p_schluessel: 'geheim', p_meldung: { zeit: 'jetzt' } });
  assert.deepEqual(aufrufe[2].werte, { p_schluessel: 'geheim', p_auftrag: 'a1', p_ergebnis: { zustand: 'erledigt' } });
});

test('Zentrale: Fehler werden zu klaren Meldungen', async () => {
  const offline = attrappe({ agent_melde: new Error('getaddrinfo ENOTFOUND') });
  await assert.rejects(new Zentrale({ url: URL_, apiSchluessel: 'a', geraeteSchluessel: 'g', fetch: offline.fetch }).sende({}), /nicht erreichbar/);

  const falsch = attrappe({ agent_melde: [400, { code: '28000', message: 'Unbekannter Geräte-Schlüssel' }] });
  await assert.rejects(
    new Zentrale({ url: URL_, apiSchluessel: 'a', geraeteSchluessel: 'g', fetch: falsch.fetch }).sende({}),
    (f) => f.abgelehnt === true && /Unbekannter/.test(f.message),
  );
  assert.throws(() => new Zentrale({ url: 'http://unsicher', apiSchluessel: 'a' }), /https/);
  const leer = attrappe({ agent_auftraege: [200, null] });
  assert.deepEqual(await new Zentrale({ url: URL_, apiSchluessel: 'a', geraeteSchluessel: 'g', fetch: leer.fetch }).holeAuftraege(), []);
});

test('Zentrale: koppeln', async () => {
  const gut = attrappe({ agent_kopple: [200, { ok: true, geraet_id: 'g1', schluessel: 's'.repeat(64), name: 'PC', system: 'windows' }] });
  const k = await Zentrale.kopple({ url: URL_, apiSchluessel: 'a', code: '4821 7730', fetch: gut.fetch });
  assert.equal(k.ok, true);
  assert.deepEqual(gut.aufrufe[0].werte, { p_code: '4821 7730' });

  const bremse = attrappe({ agent_kopple: [400, { message: 'Zu viele falsche Codes.' }] });
  assert.deepEqual(await Zentrale.kopple({ url: URL_, apiSchluessel: 'a', code: '1', fetch: bremse.fetch }), { ok: false, grund: 'Zu viele falsche Codes.' });
});

test('Agent und Zentrale zusammen: melden, Auftrag holen, bestaetigen', async () => {
  const { fetch, aufrufe } = attrappe({ agent_auftraege: [200, [{ id: 'a7', art: 'erkennungsliste' }]] });
  const zentrale = new Zentrale({ url: URL_, apiSchluessel: 'a', geraeteSchluessel: 'g', fetch });
  const defender = {
    lage: async () => ({ status: { echtzeit: true }, funde: [], ampel: { stufe: 'ok', gruende: [] }, fehler: [] }),
    aktualisiereSignaturen: async () => ({}),
  };
  const datei = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-z-')), 'stand.json');
  const agent = new Agent({ geraet: { id: 'g1', name: 'PC', system: 'windows' }, transport: zentrale, defender, speicher: dateiSpeicher(datei), version: '0.1.0' });
  const runde = await agent.runde();
  assert.equal(runde.gemeldet.ok, true);
  assert.deepEqual(aufrufe.map((a) => a.name), ['agent_melde', 'agent_auftraege', 'agent_bestaetige']);
  assert.equal(aufrufe[0].werte.p_meldung.ampel.stufe, 'ok');
  assert.deepEqual(aufrufe[2].werte.p_ergebnis, { zustand: 'erledigt' });
});
