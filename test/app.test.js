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

test('Dienste: Quarantäne verschiebt, stellt wieder her und löscht', async () => {
  const { dienste, heim, daten } = aufbau();
  const datei = path.join(heim, 'Downloads', 'Rechnung.pdf.exe');
  fs.writeFileSync(datei, 'inhalt');

  assert.equal((await dienste.quarantaeneVerschieben('relativ.exe', 'x')).ok, false);
  assert.equal((await dienste.quarantaeneVerschieben(path.join(heim, 'Downloads'), 'x')).ok, false, 'Ordner gehen nicht');
  assert.equal((await dienste.quarantaeneVerschieben(path.join(heim, 'fehlt.exe'), 'x')).ok, false);

  const rein = await dienste.quarantaeneVerschieben(datei, 'Doppelte Dateiendung');
  assert.equal(rein.ok, true);
  assert.equal(fs.existsSync(datei), false, 'am alten Ort ist sie weg');
  const liste = dienste.quarantaene();
  assert.equal(liste.length, 1);
  assert.equal(liste[0].ursprung, datei);
  assert.deepEqual(dienste.engineStatus().eigene.map((e) => [e.art, e.name]), [['schaedlich', 'Rechnung.pdf.exe']]);
  const drin = fs.readdirSync(path.join(daten, 'quarantaene')).filter((n) => n.endsWith('.kranich'));
  assert.equal(drin.length, 1, 'liegt mit Endung .kranich im Datenordner');

  // Am alten Ort liegt inzwischen etwas anderes: nicht überschreiben
  fs.writeFileSync(datei, 'andere');
  assert.equal((await dienste.quarantaeneWiederherstellen(liste[0].id)).ok, false);
  assert.equal(fs.readFileSync(datei, 'utf8'), 'andere');
  fs.unlinkSync(datei);
  assert.equal((await dienste.quarantaeneWiederherstellen(liste[0].id)).ok, true);
  assert.equal(fs.readFileSync(datei, 'utf8'), 'inhalt');
  assert.equal(dienste.quarantaene().length, 0);
  assert.equal(dienste.engineStatus().eigene.length, 0, 'zurückgeholt heißt: nicht mehr als schädlich gemerkt');

  const nochmal = await dienste.quarantaeneVerschieben(datei, 'x');
  assert.equal((await dienste.quarantaeneLoeschen(nochmal.eintrag.id)).ok, true);
  assert.equal(dienste.quarantaene().length, 0);
  assert.equal(fs.readdirSync(path.join(daten, 'quarantaene')).filter((n) => n.endsWith('.kranich')).length, 0);
  assert.equal((await dienste.quarantaeneLoeschen('gibtsnicht')).ok, false);
  assert.deepEqual(dienste.verlauf().map((e) => e.art), ['quar', 'quar', 'quar', 'quar']);
});

test('Dienste: neue Funde und neue Autostart-Einträge landen einmal im Verlauf, Ignorieren bleibt', async () => {
  const funde = [];
  const defender = { lage: async () => ({ status: { echtzeit: true }, funde: [...funde], ampel: { stufe: 'ok', gruende: [] }, fehler: [] }) };
  let eintraege = [{ herkunft: 'autostart', name: 'Steam', befehl: 'steam.exe', ort: 'Run', benutzer: '' }];
  const daten = tmp(); const heim = tmp();
  const einstellungen = erstelleEinstellungen({ datei: path.join(daten, 'e.json'), ...krypto });
  const neu = () => erstelleDienste({ kern, einstellungen, plattform: 'win32', heimOrdner: heim, datenOrdner: daten, defender, leseAutostart: async () => ({ eintraege, fehler: [] }), rechnerName: 'TESTPC' });
  let dienste = neu();

  funde.push({ id: 'alt', threatId: '1', name: 'Alt', pfade: ['C:\\a.exe'], zustand: 'in_quarantaene', offen: false, zeit: '2026-11-01T00:00:00Z' });
  await dienste.lage();
  assert.equal(dienste.verlauf().length, 0, 'was beim ersten Blick schon da ist, gilt als bekannt');
  funde.push({ id: 'neu', threatId: '2', name: 'Trojan', pfade: ['C:\\Users\\x\\b.exe'], zustand: 'erkannt', offen: true, zeit: '2026-11-22T00:00:00Z' });
  const lage = await dienste.lage();
  await dienste.lage();
  assert.deepEqual(dienste.verlauf().map((e) => e.text), ['„b.exe“ wartet auf deine Entscheidung.']);
  assert.equal(lage.funde[1].kennung, 'neu');

  assert.equal(dienste.fundIgnorieren('neu').ok, true);
  dienste = neu(); // Neustart
  const danach = await dienste.lage();
  assert.equal(danach.funde.find((f) => f.kennung === 'neu').ignoriert, true);
  assert.equal(dienste.verlauf().length, 1, 'nach Neustart nicht doppelt');

  await dienste.autostart();
  eintraege = [...eintraege, { herkunft: 'aufgabe', name: 'UpdaterSvc', befehl: 'x.exe', ort: '\\', benutzer: '' }];
  const a = await dienste.autostart();
  await dienste.autostart();
  assert.equal(a.eintraege.filter((e) => e.neu).length, 1);
  assert.equal(dienste.verlauf().filter((e) => e.art === 'warn').length, 1);
  assert.equal((await dienste.autostartAlsBekannt(a.eintraege.find((e) => e.neu).schluessel)).ok, true);
  assert.equal((await dienste.autostart()).eintraege.filter((e) => e.neu).length, 0);
  assert.equal(dienste.info().name, 'TESTPC');
  dienste.einstellungenSetzen({ geraeteName: '  Mein PC  ' });
  assert.equal(dienste.info().name, 'Mein PC');
});

test('Dienste: Probealarm und Testpaket laufen durch', async () => {
  const { dienste, heim } = aufbau();
  assert.deepEqual(await dienste.probealarm(), { ok: true, durch: 'kranich' });
  const t = await dienste.testpaket();
  assert.equal(t.bestanden, t.gesamt, JSON.stringify(t.zeilen.filter((z) => !z.bestanden)));
  assert.ok(t.gesamt >= 15);
  assert.ok(fs.existsSync(path.join(heim, 'Kranich-Testpaket', 'Rechnung.pdf.exe')));
  assert.equal(dienste.engineStatus().eigene.length, 0, 'der Lockvogel bleibt nicht in den eigenen Einträgen');
  assert.equal(dienste.engineStatus().regeln, 5);

  const sha = 'd'.repeat(64);
  assert.equal(dienste.eintragMerken('fehlalarm', sha, 'x.exe').ok, true);
  assert.equal(dienste.eintragMerken('quatsch', sha, 'x.exe').ok, false);
  assert.equal(dienste.engineStatus().eigene[0].art, 'fehlalarm');
  dienste.eintragVergessen(sha);
  assert.equal(dienste.engineStatus().eigene.length, 0);
});

test('Bruecke: Oberflaeche darf genau die freigegebenen Dienste aufrufen', () => {
  const preload = fs.readFileSync(path.join(__dirname, '..', 'main', 'preload.js'), 'utf8');
  const namen = [...preload.match(/const NAMEN = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const nurFenster = ['waehlePfad', 'zeigeImOrdner', 'oeffneSchutz'];
  assert.deepEqual(namen.filter((n) => !nurFenster.includes(n)).sort(), [...FUER_OBERFLAECHE].sort());
  const { dienste } = aufbau();
  for (const name of FUER_OBERFLAECHE) assert.equal(typeof dienste[name], 'function', name);
  assert.ok(!FUER_OBERFLAECHE.includes('beende') && !FUER_OBERFLAECHE.includes('starte'));
});
