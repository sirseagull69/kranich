'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Engine, Erkennungsliste, legeLockvoegelAn, wieErwartet, scanne, eicarText, ausZip } = require('../kern');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-engine-'));

test('Engine: jeder Lockvogel fällt auf, jede Kontrolldatei bleibt ruhig', async () => {
  const ordner = tmp();
  const liste = new Erkennungsliste(path.join(tmp(), 'liste'));
  const voegel = legeLockvoegelAn(ordner);
  for (const v of voegel) if (v.inListe) liste.merke('schaedlich', v.sha256, 'Kranich-Lockvogel');
  const engine = new Engine({ liste });
  const { ergebnisse, zusammenfassung } = await scanne(ordner, { engine });
  const nach = Object.fromEntries(ergebnisse.map((e) => [e.name, e]));
  const falsch = [];
  for (const v of voegel) {
    const e = nach[v.datei];
    assert.ok(e, v.datei + ' fehlt im Ergebnis');
    if (!wieErwartet(v.erwartet, e.urteil)) falsch.push(`${v.datei}: erwartet ${v.erwartet}, bekommen ${e.urteil} (${e.hinweise.join('; ')})`);
    if (v.erwartet !== 'ruhig') assert.ok(e.gruende.length > 0, v.datei + ' braucht einen Grund in normaler Sprache');
  }
  assert.deepEqual(falsch, []);
  assert.equal(zusammenfassung.nicht_geprueft, 0, 'mit Engine wird jede Datei angesehen');
  assert.equal(nach['notizen.txt'].urteil, 'unauffaellig');
  assert.equal(nach['Angebot.docm'].regel, 'Makro startet Programm');
  assert.equal(nach['probealarm.txt'].regel, 'Probealarm');
});

test('Engine: Regeln greifen auch bei Skripten in Windows-Zeichensatz (UTF-16)', async () => {
  const ordner = tmp();
  const kodiert = Buffer.from("Write-Host 'x'", 'utf16le').toString('base64') + 'AAAAAAAA';
  fs.writeFileSync(path.join(ordner, 'a.ps1'), Buffer.from(`# powershell -enc ${kodiert}\n`, 'utf16le'));
  const { treffer } = await new Engine().pruefe(path.join(ordner, 'a.ps1'));
  assert.deepEqual(treffer.map((t) => t.regel), ['Verschleierter PowerShell-Befehl']);
});

test('Engine: Fehlalarm unterdrückt den Treffer, eigener Eintrag macht eine Datei schädlich', async () => {
  const ordner = tmp();
  const listenOrdner = path.join(tmp(), 'liste');
  const liste = new Erkennungsliste(listenOrdner);
  const [vogel] = legeLockvoegelAn(ordner).filter((v) => v.datei === 'aufraeumen.ps1');
  const harmlos = legeLockvoegelAn(ordner).find((v) => v.datei === 'notizen.txt');
  const engine = new Engine({ liste });
  const pruefe = async (name) => (await scanne(path.join(ordner, name), { engine })).ergebnisse[0];

  assert.equal((await pruefe('aufraeumen.ps1')).urteil, 'verdaechtig');
  assert.equal(liste.merke('fehlalarm', vogel.sha256, 'aufraeumen.ps1'), true);
  assert.equal((await pruefe('aufraeumen.ps1')).urteil, 'unauffaellig');

  assert.equal(liste.merke('schaedlich', harmlos.sha256, 'notizen.txt'), true);
  const e = await pruefe('notizen.txt');
  assert.equal(e.urteil, 'schaedlich');
  assert.match(e.gruende[0], /Bekannter Schädling: notizen.txt/);

  // Eigene Einträge überleben einen Neustart und lassen sich entfernen
  const neu = new Erkennungsliste(listenOrdner);
  assert.deepEqual(neu.eigene().map((x) => x.art).sort(), ['fehlalarm', 'schaedlich']);
  neu.vergiss(harmlos.sha256);
  assert.equal(new Erkennungsliste(listenOrdner).suche(harmlos.sha256), null);
  assert.equal(liste.merke('schaedlich', 'kein-fingerabdruck', 'x'), false);
});

test('Erkennungsliste: Liste aus dem Labor lesen', () => {
  const ordner = tmp();
  const a = 'a'.repeat(64); const b = 'B'.repeat(64);
  fs.writeFileSync(path.join(ordner, 'labor.txt'), `# Kranich-Erkennungsliste\n# stand: 2026-11-22T06:00:00Z\n${a} Trojan.Beispiel\n${b}\nkaputte zeile\n\n`);
  const liste = new Erkennungsliste(ordner);
  assert.deepEqual(liste.suche(a), { name: 'Trojan.Beispiel', eigen: false });
  assert.deepEqual(liste.suche(b.toLowerCase()), { name: '', eigen: false });
  assert.equal(liste.suche('c'.repeat(64)), null);
  assert.deepEqual(liste.zahlen(), { labor: 2, schaedlich: 0, fehlalarm: 0, stand: '2026-11-22T06:00:00Z' });
});

test('Engine: große und unlesbare Dateien, Zip ohne Makro, Quelldateien ohne Testtext', async () => {
  const engine = new Engine();
  assert.equal((await engine.pruefe(path.join(tmp(), 'fehlt.exe'))).geprueft, false);
  assert.equal(ausZip(Buffer.from('kein zip'), 'vbaproject.bin'), null);
  // Die Quelldateien dürfen den Testtext nicht am Stück enthalten, sonst
  // sperrt der Virenschutz Kranichs eigene Dateien weg.
  for (const datei of ['kern/engine/engine.js', 'kern/engine/lockvoegel.js', 'test/engine.test.js']) {
    assert.ok(!fs.readFileSync(path.join(__dirname, '..', datei), 'utf8').includes(eicarText()), datei);
  }
});
