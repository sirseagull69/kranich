'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const kern = require('../kern');
const { erstelleEinstellungen } = require('../main/einstellungen');
const { erstelleDienste, FUER_OBERFLAECHE } = require('../main/dienste');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-app-'));
const SCHLUESSEL = 'a'.repeat(64);
const krypto = { verschluessle: (t) => 'geheim:' + Buffer.from(t).toString('base64'), entschluessle: (g) => Buffer.from(g.slice(7), 'base64').toString() };

function aufbau({ plattform = 'linux', defender = null, antworten = {} } = {}) {
  const daten = tmp();
  const heim = tmp();
  fs.mkdirSync(path.join(heim, 'Downloads'));
  const ereignisse = [];
  const aufrufe = [];
  const einstellungen = erstelleEinstellungen({ datei: path.join(daten, 'einstellungen.json'), ...krypto });
  const fetch = async (url, optionen) => {
    aufrufe.push({ url, schluessel: optionen.headers['x-apikey'] });
    const hash = url.split('/').pop();
    return antworten[hash] ?? { status: 404, ok: false };
  };
  const dienste = erstelleDienste({ kern, einstellungen, plattform, heimOrdner: heim, datenOrdner: daten, melde: (e) => ereignisse.push(e), defender, fetch });
  return { dienste, einstellungen, ereignisse, aufrufe, daten, heim };
}

test('Einstellungen: Standard, nur bekannte Werte, bleibt nach Neustart', () => {
  const datei = path.join(tmp(), 'e.json');
  const e = erstelleEinstellungen({ datei, ...krypto });
  assert.equal(e.lese().wacheAn, true);
  assert.equal(e.lese().vtHinterlegt, false);
  e.setze({ wacheAn: false, mitSystemStarten: 'ja', unbekannt: 1, benachrichtigungen: { fund: false, quatsch: true } });
  const neu = erstelleEinstellungen({ datei, ...krypto }).lese();
  assert.equal(neu.wacheAn, false);
  assert.equal(neu.mitSystemStarten, true, 'falscher Typ wird ignoriert');
  assert.equal(neu.benachrichtigungen.fund, false);
  assert.equal('unbekannt' in neu, false);
  assert.equal('quatsch' in neu.benachrichtigungen, false);
});

test('Einstellungen: Schluessel nie im Klartext und nie in lese()', () => {
  const datei = path.join(tmp(), 'e.json');
  const e = erstelleEinstellungen({ datei, ...krypto });
  assert.equal(e.setzeVtSchluessel('zu kurz').ok, false);
  assert.equal(e.setzeVtSchluessel('  ' + SCHLUESSEL + '\n').ok, true);
  assert.equal(e.lese().vtHinterlegt, true);
  assert.ok(!JSON.stringify(e.lese()).includes(SCHLUESSEL));
  assert.ok(!fs.readFileSync(datei, 'utf8').includes(SCHLUESSEL), 'nicht im Klartext in der Datei');
  assert.equal(erstelleEinstellungen({ datei, ...krypto }).vtSchluessel(), SCHLUESSEL);
  e.entferneVtSchluessel();
  assert.equal(erstelleEinstellungen({ datei, ...krypto }).vtSchluessel(), null);

  // Ohne sicheren Speicher wird nichts gespeichert
  const ohne = erstelleEinstellungen({ datei: path.join(tmp(), 'e.json'), verschluessle: () => null, entschluessle: () => null });
  assert.equal(ohne.setzeVtSchluessel(SCHLUESSEL).ok, false);
  assert.equal(ohne.lese().vtHinterlegt, false);
});

test('Dienste: Datei-Scan meldet Fortschritt, nutzt neuen Schluessel sofort', async () => {
  const { dienste, ereignisse, aufrufe, heim } = aufbau();
  const datei = path.join(heim, 'Downloads', 'Rechnung.pdf.exe');
  fs.writeFileSync(datei, 'x');

  const ohne = await dienste.scanPfad(datei);
  assert.equal(ohne.ok, true);
  assert.equal(ohne.ergebnisse[0].urteil, 'verdaechtig');
  assert.equal(aufrufe.length, 0, 'ohne Schlüssel keine Abfrage');

  assert.equal(dienste.vtSchluesselSetzen(SCHLUESSEL).ok, true);
  await dienste.scanPfad(datei);
  assert.equal(aufrufe.length, 1);
  assert.equal(aufrufe[0].schluessel, SCHLUESSEL);
  assert.ok(ereignisse.some((e) => e.art === 'scan-fortschritt'));
  assert.ok(ereignisse.some((e) => e.art === 'scan-fertig'));

  assert.equal((await dienste.scanPfad('relativ/pfad')).ok, false);
  assert.equal((await dienste.scanPfad(null)).ok, false);
});

test('Dienste: nur ein Scan gleichzeitig', async () => {
  const { dienste, heim } = aufbau();
  for (let i = 0; i < 30; i++) fs.writeFileSync(path.join(heim, 'Downloads', `d${i}.txt`), String(i));
  const [a, b] = await Promise.all([dienste.scanPfad(path.join(heim, 'Downloads')), dienste.scanPfad(path.join(heim, 'Downloads'))]);
  assert.equal(a.ok, true);
  assert.equal(b.ok, false);
  assert.equal((await dienste.scanPfad(path.join(heim, 'Downloads'))).ok, true, 'danach geht es wieder');
});

test('Dienste: Lage und Schutz-Scan mit und ohne Defender', async () => {
  const ohne = aufbau();
  assert.equal((await ohne.dienste.lage()).verfuegbar, false);
  assert.equal((await ohne.dienste.schutzScan('schnell')).ok, false);

  const scans = [];
  const defender = {
    lage: async () => ({ status: { echtzeit: true }, funde: [], ampel: { stufe: 'ok', gruende: [] }, fehler: [] }),
    scan: async (art) => { scans.push(art); return { art, neueFunde: [] }; },
  };
  const mit = aufbau({ plattform: 'win32', defender });
  assert.equal((await mit.dienste.lage()).ampel.stufe, 'ok');
  assert.equal((await mit.dienste.schutzScan('voll')).ok, true);
  assert.equal((await mit.dienste.schutzScan('pfad')).ok, false, 'freie Pfade gibt es hier nicht');
  assert.deepEqual(scans, ['voll']);
  assert.ok(mit.ereignisse.some((e) => e.art === 'schutzscan-fertig'));
});

test('Dienste: Download-Wache folgt den Einstellungen und meldet Dateien', async () => {
  const { dienste, ereignisse, heim } = aufbau();
  dienste.starte();
  assert.equal(dienste.wacheStatus().an, true);
  dienste.einstellungenSetzen({ wacheAn: false });
  assert.equal(dienste.wacheStatus().an, false);

  const anderer = path.join(heim, 'Eingang');
  fs.mkdirSync(anderer);
  dienste.einstellungenSetzen({ wacheAn: true, wacheOrdner: anderer });
  assert.equal(dienste.wacheStatus().ordner, anderer);
  dienste.wacheStopp();

  assert.equal(dienste.einstellungenSetzen({ wacheOrdner: path.join(heim, 'gibtsnicht') }).wacheOrdner, path.join(heim, 'gibtsnicht'));
  assert.equal(dienste.wacheStart().ok, false, 'fehlender Ordner wird gemeldet statt abzustürzen');
  dienste.beende();
  assert.ok(ereignisse.some((e) => e.art === 'einstellungen'));
});

test('Bruecke: Oberflaeche darf genau die freigegebenen Dienste aufrufen', () => {
  const preload = fs.readFileSync(path.join(__dirname, '..', 'main', 'preload.js'), 'utf8');
  const namen = [...preload.match(/const NAMEN = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const nurFenster = ['waehlePfad', 'zeigeImOrdner'];
  assert.deepEqual(namen.filter((n) => !nurFenster.includes(n)).sort(), [...FUER_OBERFLAECHE].sort());
  const { dienste } = aufbau();
  for (const name of FUER_OBERFLAECHE) assert.equal(typeof dienste[name], 'function', name);
  assert.ok(!FUER_OBERFLAECHE.includes('beende') && !FUER_OBERFLAECHE.includes('starte'));
});
