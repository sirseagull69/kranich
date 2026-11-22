'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Agent, dateiSpeicher, ERLAUBTE_AUFTRAEGE } = require('../kern');

const GERAET = { id: 'pc-1', name: 'PC', system: 'windows' };
const STATUS = { echtzeit: true };
const fund = (id, offen = false) => ({ id, threatId: 't', name: 'Trojan:X', zeit: '2026-11-22T08:00:00Z', offen });

function aufbau({ funde = [], autostart = null, auftraege = [], speicherDatei } = {}) {
  const welt = { funde, autostart, auftraege, online: true, gesendet: [], bestaetigt: [], scans: [], scanEnde: null };
  const defender = {
    lage: async () => ({ status: STATUS, funde: welt.funde, ampel: { stufe: 'ok', gruende: [] }, fehler: [] }),
    scan: async (art) => {
      welt.scans.push(art);
      if (welt.scanEnde) await welt.scanEnde;
      return { neueFunde: [fund('scan')] };
    },
    aktualisiereSignaturen: async () => STATUS,
  };
  const transport = {
    sende: async (m) => { if (!welt.online) throw new Error('offline'); welt.gesendet.push(m); },
    holeAuftraege: async () => { if (!welt.online) throw new Error('offline'); return welt.auftraege; },
    bestaetige: async (id, e) => { if (!welt.online) throw new Error('offline'); welt.bestaetigt.push({ id, ...e }); },
  };
  const datei = speicherDatei ?? path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-agent-')), 'stand.json');
  const neu = () => new Agent({
    geraet: GERAET, transport, defender, speicher: dateiSpeicher(datei), version: '0.3.0',
    leseAutostart: welt.autostart === null ? null : async () => ({ eintraege: welt.autostart, fehler: welt.autostartFehler ?? [] }),
    jetzt: () => new Date('2026-11-22T09:00:00Z'),
  });
  return { welt, neu, datei };
}

test('Agent meldet Lage und jeden Fund genau einmal', async () => {
  const { welt, neu } = aufbau({ funde: [fund('a', true)] });
  const agent = neu();
  await agent.runde();
  assert.equal(welt.gesendet[0].geraet.id, 'pc-1');
  assert.equal(welt.gesendet[0].zeit, '2026-11-22T09:00:00.000Z');
  assert.equal(welt.gesendet[0].offeneFunde, 1);
  assert.deepEqual(welt.gesendet[0].neueFunde.map((f) => f.id), ['a']);

  welt.funde = [fund('a', true), fund('b')];
  await agent.runde();
  assert.deepEqual(welt.gesendet[1].neueFunde.map((f) => f.id), ['b']);
  await agent.runde();
  assert.deepEqual(welt.gesendet[2].neueFunde, []);
});

test('Agent reicht Funde nach, wenn die Zentrale nicht erreichbar war, auch nach Neustart', async () => {
  const { welt, neu } = aufbau({ funde: [fund('a')] });
  welt.online = false;
  const erster = await neu().runde();
  assert.equal(erster.gemeldet.ok, false);
  assert.equal(welt.gesendet.length, 0);

  welt.online = true;
  await neu().runde(); // neuer Agent = Neustart
  assert.deepEqual(welt.gesendet[0].neueFunde.map((f) => f.id), ['a']);
  await neu().runde();
  assert.deepEqual(welt.gesendet[1].neueFunde, [], 'nach Neustart nicht doppelt');
});

test('Agent: Autostart, erster Lauf merkt nur, danach wird Neues gemeldet', async () => {
  const e = (name, befehl = 'x.exe') => ({ herkunft: 'autostart', name, befehl, ort: 'Run', benutzer: '' });
  const { welt, neu } = aufbau({ autostart: [e('OneDrive')] });
  const agent = neu();
  await agent.runde();
  assert.deepEqual(welt.gesendet[0].autostart, { neu: [], geaendert: [] });

  welt.autostart = [e('OneDrive'), e('Unbekannt', 'C:\\Temp\\a.exe')];
  await agent.runde();
  assert.deepEqual(welt.gesendet[1].autostart.neu.map((x) => x.name), ['Unbekannt']);
  await agent.runde();
  assert.deepEqual(welt.gesendet[2].autostart.neu, []);

  // Eine Quelle faellt aus: kein Vergleich, Stand bleibt
  welt.autostart = [];
  welt.autostartFehler = [{ herkunft: 'dienst', meldung: 'Zugriff verweigert' }];
  await agent.runde();
  assert.deepEqual(welt.gesendet[3].autostart.neu, []);
  assert.match(welt.gesendet[3].fehler[0], /Zugriff verweigert/);
  welt.autostartFehler = [];
  welt.autostart = [e('OneDrive'), e('Unbekannt', 'C:\\Temp\\a.exe')];
  await agent.runde();
  assert.deepEqual(welt.gesendet[4].autostart.neu, [], 'nichts gilt faelschlich als neu');
});

test('Agent fuehrt nur Auftraege von der festen Liste aus', async () => {
  assert.deepEqual(ERLAUBTE_AUFTRAEGE, ['melden', 'schnellscan', 'vollscan', 'erkennungsliste']);
  const { welt, neu } = aufbau({
    auftraege: [
      { id: 1, art: 'befehl', befehl: 'format c:' },
      { id: 2, art: 'datei_loeschen', pfad: 'C:\\' },
      { id: 3, art: 'erkennungsliste' },
      { id: 4 },
    ],
  });
  await neu().runde();
  assert.deepEqual(welt.bestaetigt.map((b) => [b.id, b.zustand]), [[1, 'abgelehnt'], [2, 'abgelehnt'], [3, 'erledigt'], [4, 'abgelehnt']]);
  assert.deepEqual(welt.scans, []);
});

test('Agent: Scan laeuft im Hintergrund, kein zweiter gleichzeitig, kein doppelter Start', async () => {
  const { welt, neu } = aufbau({ auftraege: [{ id: 10, art: 'vollscan' }, { id: 11, art: 'schnellscan' }] });
  let beende;
  welt.scanEnde = new Promise((r) => { beende = r; });
  const agent = neu();

  const r1 = await agent.runde();
  assert.deepEqual(r1.auftraege.map((a) => a.zustand), ['laeuft', 'abgelehnt']);
  assert.deepEqual(welt.bestaetigt.map((b) => b.id), [11]);

  welt.auftraege = [{ id: 10, art: 'vollscan' }]; // Zentrale liefert ihn noch einmal
  await agent.runde();
  assert.equal(welt.gesendet[1].scanLaeuft, true);
  assert.deepEqual(welt.scans, ['voll'], 'nicht doppelt gestartet');
  assert.equal(welt.bestaetigt.length, 1, 'laufender Scan wird nicht abgelehnt');

  beende();
  await agent.fertig();
  assert.deepEqual(welt.bestaetigt[1], { id: 10, zustand: 'erledigt', neueFunde: 1 });
});

test('Agent: Ergebnis wird nachgereicht statt den Auftrag erneut auszufuehren', async () => {
  const { welt, neu } = aufbau({ auftraege: [{ id: 20, art: 'schnellscan' }] });
  let beende;
  welt.scanEnde = new Promise((r) => { beende = r; });
  const agent = neu();
  await agent.runde();
  welt.online = false; // Bestaetigung geht verloren
  beende();
  await agent.fertig();
  assert.equal(welt.bestaetigt.length, 0);

  welt.online = true;
  await neu().runde(); // Neustart, Zentrale hat den Auftrag noch offen
  assert.deepEqual(welt.scans, ['schnell'], 'kein zweiter Scan');
  assert.deepEqual(welt.bestaetigt, [{ id: 20, zustand: 'erledigt', neueFunde: 1 }]);
});

test('Agent: Runden ueberlappen nicht, ohne Geraete-ID kein Start', async () => {
  const { welt, neu } = aufbau();
  const agent = neu();
  const [a, b] = await Promise.all([agent.runde(), agent.runde()]);
  assert.equal(b.uebersprungen, true);
  assert.equal(a.gemeldet.ok, true);
  assert.equal(welt.gesendet.length, 1);
  assert.throws(() => new Agent({ geraet: {}, transport: {}, speicher: dateiSpeicher('x') }), /Geräte-ID/);
});

test('Agent horcht zwischen den Runden nur auf Auftraege und meldet erst, wenn es etwas zu tun gab', async () => {
  const { welt, neu } = aufbau();
  const agent = neu();
  assert.deepEqual((await agent.horche()).auftraege, []);
  assert.equal(welt.gesendet.length, 0, 'ohne Auftrag keine Meldung');

  welt.auftraege = [{ id: 7, art: 'schnellscan' }];
  let ende;
  welt.scanEnde = new Promise((r) => { ende = r; });
  await agent.horche();
  assert.deepEqual(welt.scans, ['schnell']);
  assert.equal(welt.gesendet.at(-1).scanLaeuft, true, 'der Host sieht sofort, dass gescannt wird');
  welt.auftraege = []; // die Zentrale stellt einen bestaetigten Auftrag nicht noch einmal zu
  ende();
  await agent.fertig();
  assert.deepEqual(welt.bestaetigt.map((b) => [b.id, b.zustand]), [[7, 'erledigt']]);
});

test('Agent meldet auch einen Scan, der direkt am Geraet gestartet wurde', async () => {
  const { welt } = aufbau();
  let laeuft = true;
  const agent = new Agent({ geraet: GERAET, transport: { sende: async (m) => welt.gesendet.push(m), holeAuftraege: async () => [], bestaetige: async () => {} }, speicher: { lade: () => null, sichere: () => {} }, scanLaeuft: () => laeuft });
  await agent.runde();
  laeuft = false;
  await agent.runde();
  assert.deepEqual(welt.gesendet.map((m) => m.scanLaeuft), [true, false]);
});
