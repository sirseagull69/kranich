'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const {
  sha256, pruefeName, VirusTotal, scanne, urteile, DownloadWache, ausJson, vergleiche, leseAutostart,
} = require('../kern');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-'));
}

function antwort(status, stats) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => ({ data: { attributes: { last_analysis_stats: stats, meaningful_name: 'x' } } }),
  };
}

// VirusTotal-Attrappe: Zuordnung Hash -> Antwort, zaehlt die Aufrufe.
function attrappe(tabelle) {
  const aufrufe = [];
  const fetch = async (url, optionen) => {
    aufrufe.push({ url, optionen });
    const hash = url.split('/').pop();
    return tabelle[hash] ?? antwort(404);
  };
  return { fetch, aufrufe };
}

const ohneWarten = { warte: async () => {}, jetzt: () => 0 };

test('sha256 stimmt mit dem bekannten Wert ueberein', async () => {
  const ordner = tmp();
  const datei = path.join(ordner, 'a.txt');
  fs.writeFileSync(datei, 'abc');
  assert.equal(await sha256(datei), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('Heuristik: Namen', () => {
  assert.equal(pruefeName('Urlaub.jpg').stufe, 'ok');
  assert.equal(pruefeName('bericht.final.pdf').stufe, 'ok');
  assert.equal(pruefeName('setup.exe').stufe, 'hinweis');
  assert.equal(pruefeName('tabelle.xlsm').stufe, 'hinweis');
  assert.equal(pruefeName('paket.zip').stufe, 'hinweis');

  const doppelt = pruefeName('Rechnung.pdf.exe');
  assert.equal(doppelt.stufe, 'verdaechtig');
  assert.match(doppelt.gruende[0], /Doppelte Dateiendung/);

  assert.equal(pruefeName('RECHNUNG.PDF.EXE').stufe, 'verdaechtig');
  assert.equal(pruefeName('Foto.jpg.scr').stufe, 'verdaechtig');
  assert.equal(pruefeName('Rechnung.pdf          .exe').stufe, 'verdaechtig');
  assert.equal(pruefeName('Rechnung\u202Efdp.exe').stufe, 'verdaechtig');
  // Versionsnummern sind keine Tarnung
  assert.equal(pruefeName('tool.v2.exe').stufe, 'hinweis');
});

test('VirusTotal: bekannt, unbekannt, Zwischenspeicher, Schluessel im Kopf', async () => {
  const { fetch, aufrufe } = attrappe({
    aaa: antwort(200, { malicious: 12, suspicious: 1, undetected: 50, harmless: 7, timeout: 3, 'type-unsupported': 9 }),
  });
  const vt = new VirusTotal({ schluessel: 'geheim', fetch, ...ohneWarten });

  const a = await vt.abfrage('aaa');
  assert.deepEqual(
    { status: a.status, boesartig: a.boesartig, verdaechtig: a.verdaechtig, gesamt: a.gesamt },
    { status: 'bekannt', boesartig: 12, verdaechtig: 1, gesamt: 70 },
  );
  assert.equal(aufrufe[0].url, 'https://www.virustotal.com/api/v3/files/aaa');
  assert.equal(aufrufe[0].optionen.headers['x-apikey'], 'geheim');

  assert.equal((await vt.abfrage('bbb')).status, 'unbekannt');
  await vt.abfrage('aaa');
  await vt.abfrage('bbb');
  assert.equal(aufrufe.length, 2, 'zweite Abfrage kommt aus dem Zwischenspeicher');
});

test('VirusTotal: ohne Schluessel kein Aufruf, 401 und 429 werden erkannt', async () => {
  const leer = attrappe({});
  assert.equal((await new VirusTotal({ fetch: leer.fetch }).abfrage('x')).status, 'kein_schluessel');
  assert.equal(leer.aufrufe.length, 0);

  const falsch = attrappe({ x: antwort(401) });
  assert.equal((await new VirusTotal({ schluessel: 'k', fetch: falsch.fetch, ...ohneWarten }).abfrage('x')).status, 'schluessel_falsch');

  const voll = attrappe({ x: antwort(429) });
  const vt = new VirusTotal({ schluessel: 'k', fetch: voll.fetch, ...ohneWarten });
  assert.equal((await vt.abfrage('x')).status, 'limit');
  assert.equal((await vt.abfrage('y')).status, 'limit');
  assert.equal(voll.aufrufe.length, 1, 'nach dem Limit wird nicht weiter gefragt');
});

test('VirusTotal: Netzfehler wird als Fehler gemeldet, nicht geworfen', async () => {
  const vt = new VirusTotal({ schluessel: 'k', fetch: async () => { throw new Error('offline'); }, ...ohneWarten });
  const e = await vt.abfrage('x');
  assert.equal(e.status, 'fehler');
  assert.match(e.meldung, /offline/);
});

test('VirusTotal: haelt den Abstand zwischen Abfragen ein', async () => {
  let uhr = 0;
  const pausen = [];
  const { fetch } = attrappe({});
  const vt = new VirusTotal({
    schluessel: 'k', fetch, proMinute: 4,
    jetzt: () => uhr,
    warte: async (ms) => { pausen.push(ms); uhr += ms; },
  });
  await Promise.all([vt.abfrage('a'), vt.abfrage('b'), vt.abfrage('c')]);
  assert.deepEqual(pausen, [15000, 15000]);
});

test('Urteil: Schwellen und getarnter Name', () => {
  const ok = { stufe: 'ok', gruende: [] };
  const tarn = { stufe: 'verdaechtig', gruende: ['Doppelte Dateiendung'] };
  const vt = (b, v = 0) => ({ status: 'bekannt', boesartig: b, verdaechtig: v, gesamt: 70 });
  assert.equal(urteile(ok, vt(0)).urteil, 'sauber');
  assert.equal(urteile(ok, vt(1)).urteil, 'verdaechtig');
  assert.equal(urteile(ok, vt(0, 2)).urteil, 'verdaechtig');
  assert.equal(urteile(ok, vt(3)).urteil, 'schaedlich');
  assert.equal(urteile(tarn, vt(0)).urteil, 'verdaechtig');
  assert.equal(urteile(tarn, vt(20)).urteil, 'schaedlich');
  assert.equal(urteile(ok, { status: 'unbekannt' }).urteil, 'unbekannt');
  assert.equal(urteile(tarn, { status: 'limit' }).urteil, 'verdaechtig');
  assert.equal(urteile(ok, { status: 'uebersprungen' }).urteil, 'nicht_geprueft');
});

test('Scan: Ordner, nur riskante Typen werden bei VirusTotal gefragt', async () => {
  const ordner = tmp();
  fs.mkdirSync(path.join(ordner, 'unter'));
  fs.writeFileSync(path.join(ordner, 'bild.jpg'), 'bild');
  fs.writeFileSync(path.join(ordner, 'setup.exe'), 'boese');
  fs.writeFileSync(path.join(ordner, 'unter', 'Rechnung.pdf.exe'), 'getarnt');
  fs.writeFileSync(path.join(ordner, 'unter', 'tool.exe'), 'gut');
  const h = (s) => crypto.createHash('sha256').update(s).digest('hex');

  const { fetch, aufrufe } = attrappe({
    [h('boese')]: antwort(200, { malicious: 30, suspicious: 0, undetected: 40, harmless: 0 }),
    [h('gut')]: antwort(200, { malicious: 0, suspicious: 0, undetected: 60, harmless: 10 }),
  });
  const vt = new VirusTotal({ schluessel: 'k', fetch, ...ohneWarten });
  const schritte = [];
  const { ergebnisse, zusammenfassung } = await scanne(ordner, { vt, beiFortschritt: (f) => schritte.push(f.nummer) });

  const nach = Object.fromEntries(ergebnisse.map((e) => [e.name, e]));
  assert.equal(nach['bild.jpg'].urteil, 'nicht_geprueft');
  assert.equal(nach['setup.exe'].urteil, 'schaedlich');
  assert.deepEqual(nach['setup.exe'].treffer, { boesartig: 30, verdaechtig: 0, gesamt: 70 });
  assert.equal(nach['Rechnung.pdf.exe'].urteil, 'verdaechtig');
  assert.equal(nach['tool.exe'].urteil, 'sauber');
  assert.equal(aufrufe.length, 3, 'bild.jpg wird nicht abgefragt');
  assert.deepEqual(schritte, [1, 2, 3, 4]);
  assert.deepEqual(zusammenfassung, { sauber: 1, verdaechtig: 1, schaedlich: 1, unbekannt: 0, nicht_geprueft: 1 });

  const alle = await scanne(ordner, { vt, alleAbfragen: true });
  assert.equal(alle.ergebnisse.find((e) => e.name === 'bild.jpg').urteil, 'unbekannt');
});

test('Scan: einzelne Datei wird immer abgefragt, fehlender Pfad ergibt leere Liste', async () => {
  const ordner = tmp();
  const datei = path.join(ordner, 'notiz.txt');
  fs.writeFileSync(datei, 'hallo');
  const { fetch, aufrufe } = attrappe({});
  const vt = new VirusTotal({ schluessel: 'k', fetch, ...ohneWarten });
  const { ergebnisse } = await scanne(datei, { vt });
  assert.equal(aufrufe.length, 1);
  assert.equal(ergebnisse[0].urteil, 'unbekannt');
  assert.equal((await scanne(path.join(ordner, 'gibtsnicht'), { vt })).ergebnisse.length, 0);
});

test('Scan: Abbrechen stoppt nach der laufenden Datei', async () => {
  const ordner = tmp();
  for (const n of ['a.exe', 'b.exe', 'c.exe']) fs.writeFileSync(path.join(ordner, n), n);
  const steuerung = new AbortController();
  const { fetch } = attrappe({});
  const vt = new VirusTotal({ schluessel: 'k', fetch, ...ohneWarten });
  const { ergebnisse, abgebrochen } = await scanne(ordner, {
    vt, signal: steuerung.signal,
    beiFortschritt: ({ nummer }) => { if (nummer === 2) steuerung.abort(); },
  });
  assert.equal(abgebrochen, true);
  assert.ok(ergebnisse.length < 3);
});

test('Download-Wache: meldet fertige Datei einmal, ignoriert laufende Downloads', async () => {
  const ordner = tmp();
  const wache = new DownloadWache(ordner, { ruheMs: 60 });
  const gemeldet = [];
  wache.on('datei', (p) => gemeldet.push(path.basename(p)));
  wache.start();
  try {
    const teil = path.join(ordner, 'film.mp4.crdownload');
    fs.writeFileSync(teil, 'a');
    await new Promise((r) => setTimeout(r, 100));
    fs.appendFileSync(teil, 'b');
    await new Promise((r) => setTimeout(r, 100));
    fs.renameSync(teil, path.join(ordner, 'film.mp4'));
    fs.writeFileSync(path.join(ordner, 'Rechnung.pdf.exe'), 'x');
    await new Promise((r) => setTimeout(r, 600));
    assert.deepEqual(gemeldet.sort(), ['Rechnung.pdf.exe', 'film.mp4']);
  } finally {
    wache.stopp();
  }
});

test('Autostart: PowerShell-Ausgabe lesen (Liste, einzelnes Objekt, leer, kaputt)', () => {
  const liste = '[{"Name":"OneDrive","Command":"\\"C:\\\\OneDrive.exe\\" /background","Location":"HKU\\\\Run","User":"nils"},{"Name":"Übung","Command":null,"Location":null,"User":null}]';
  const a = ausJson(liste, 'autostart');
  assert.equal(a.length, 2);
  assert.deepEqual(a[0], { herkunft: 'autostart', name: 'OneDrive', befehl: '"C:\\OneDrive.exe" /background', ort: 'HKU\\Run', benutzer: 'nils' });
  assert.equal(a[1].name, 'Übung');
  assert.equal(a[1].befehl, '');
  assert.equal(ausJson('\uFEFF{"Name":"Eins","Command":"x.exe"}', 'dienst').length, 1);
  assert.deepEqual(ausJson('', 'aufgabe'), []);
  assert.deepEqual(ausJson('kein json', 'aufgabe'), []);
});

test('Autostart: liest alle drei Quellen, ein Fehler stoppt die anderen nicht', async () => {
  const ausfuehren = async (befehl) => {
    if (befehl.includes('Win32_StartupCommand')) return '{"Name":"A","Command":"a.exe","Location":"Run"}';
    if (befehl.includes('Get-ScheduledTask')) throw new Error('Zugriff verweigert');
    return '[{"Name":"D","Command":"d.exe","Location":"Dienst D"}]';
  };
  const { eintraege, fehler } = await leseAutostart({ ausfuehren });
  assert.deepEqual(eintraege.map((e) => `${e.herkunft}:${e.name}`), ['autostart:A', 'dienst:D']);
  assert.deepEqual(fehler, [{ herkunft: 'aufgabe', meldung: 'Zugriff verweigert' }]);
});

test('Autostart: Vergleich findet neu, geaendert, entfernt', () => {
  const e = (name, befehl, herkunft = 'autostart') => ({ herkunft, name, befehl, ort: 'Run', benutzer: '' });
  const bekannt = [e('OneDrive', 'od.exe'), e('Steam', 'steam.exe'), e('Alt', 'alt.exe')];
  const aktuell = [e('onedrive', 'od.exe'), e('Steam', 'C:\\Temp\\x.exe'), e('Neu', 'neu.exe'), e('Steam', 'steam.exe', 'dienst')];
  const d = vergleiche(bekannt, aktuell);
  assert.deepEqual(d.neu.map((x) => `${x.herkunft}:${x.name}`), ['autostart:Neu', 'dienst:Steam']);
  assert.equal(d.geaendert.length, 1);
  assert.equal(d.geaendert[0].befehlVorher, 'steam.exe');
  assert.deepEqual(d.entfernt.map((x) => x.name), ['Alt']);
});
