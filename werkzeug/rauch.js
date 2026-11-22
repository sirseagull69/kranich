// Rauchtest: startet das echte Programm, klickt sich durch die Oberflaeche
// und macht Bilder.
//   KRANICH_ROLLE=host|agent electron werkzeug/rauch.js   (BILDER=<Ordner>)
// Die Zentrale wird vorgespielt (werkzeug/spielzentrale.js), der Rest ist echt.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { app, BrowserWindow } = require('electron');
process.env.KRANICH_DATEN_FEST = '1';
process.env.KRANICH_SPIELZENTRALE = process.env.KRANICH_SPIELZENTRALE || 'voll';
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-rauch-')));
require('../main/main.js');

const agent = process.env.KRANICH_ROLLE === 'agent';
const bilder = process.env.BILDER || os.tmpdir();
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(() => setTimeout(async () => {
  const f = BrowserWindow.getAllWindows()[0];
  const js = (code) => f.webContents.executeJavaScript(code);
  const bild = async (name) => fs.writeFileSync(path.join(bilder, name + '.png'), (await f.webContents.capturePage()).toPNG());
  const klick = (text) => js(`(() => { const k = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)})); if (k) k.click(); return !!k; })()`);
  const tippe = (id, text) => js(`(() => { const e = document.getElementById(${JSON.stringify(id)}); if (e) e.value = ${JSON.stringify(text)}; return !!e; })()`);
  const text = () => js('document.body.innerText');
  const aus = { rolle: agent ? 'agent' : 'host', fehler: [] };
  f.webContents.on('console-message', (_e, stufe, t) => { if (stufe >= 2) aus.fehler.push(t); });
  try {
    await warte(1500);
    aus.node = await js('typeof require + "/" + typeof process');
    if (agent) await rauchAgent({ js, bild, klick, tippe, text, aus });
    else await rauchHost({ js, bild, klick, tippe, text, aus });
  } catch (e) { aus.fehler.push(e.message); }
  console.log('RAUCH ' + JSON.stringify(aus));
  app.exit(aus.fehler.length ? 1 : 0);
}, 2500));

async function rauchAgent({ bild, klick, tippe, text, aus }) {
  aus.groesse = BrowserWindow.getAllWindows()[0].getContentSize().join('x');
  await bild('a1-ungekoppelt');
  aus.ungekoppelt = (await text()).includes('Nicht gekoppelt');
  aus.koppeln = await klick('Jetzt koppeln'); await warte(400); await bild('a2-koppeln');
  await tippe('code', '1111 2222'); await klick('Koppeln'); await warte(700); await bild('a3-koppeln-fehler');
  aus.falscherCode = (await text()).includes('falsch oder abgelaufen');
  await tippe('code', '1234 5678'); await klick('Koppeln'); await warte(900); await bild('a4-gekoppelt');
  aus.gekoppelt = (await text()).includes('Gekoppelt als');
  await klick('Fertig'); await warte(1200); await bild('a5-status');
  aus.verbunden = (await text()).includes('Mit Host verbunden');
  aus.scan = await klick('Jetzt scannen'); await warte(2200); await bild('a6-scan-laeuft');
  aus.scanLaeuft = /Schnellscan läuft · seit 0:0\d/.test(await text());
  await warte(3200); await bild('a7-scan-fertig');
  aus.scanFertig = /Scan fertig nach 0:0\d/.test(await text());
  aus.probe = await klick('Probealarm'); await warte(1800); await bild('a8-probealarm');
  aus.probeText = /Probealarm erkannt/.test(await text());
}

async function rauchHost({ js, bild, klick, tippe, text, aus }) {
  await bild('0-anmeldung');
  aus.anmeldung = (await text()).includes('Kranich Host');
  await tippe('lmail', 'nils@beispiel.de'); await tippe('lpw', 'falsch'); await klick('Anmelden'); await warte(600); await bild('0b-falsches-passwort');
  aus.falschesPasswort = (await text()).includes('Falsches Passwort');
  await tippe('lpw', 'richtig-lang'); await klick('Anmelden'); await warte(1500);
  aus.knoepfe = await js('document.querySelectorAll("button").length');
  aus.status = await js('[...document.querySelectorAll("h1,h2")].map((h) => h.textContent.trim()).join(" | ")');
  aus.geraete = (await text()).includes("MacBook");
  await bild('1-uebersicht');
  aus.geraet = await js('(() => { const k = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Dieses Gerät")); if (k) k.click(); return !!k; })()');
  await warte(700); await bild('2-geraet-funde');
  aus.systemScan = await klick('Schnellscan'); await warte(2300); await bild('2b-scan-laeuft');
  aus.scanLaeuft = /Schnellscan läuft\s*seit 0:0\d/.test(await text());
  await warte(2600); await bild('2c-scan-fertig');
  aus.scanFertig = /Schnellscan fertig nach 0:0\d/.test(await text());
  aus.scanReiter = await klick('Scan'); await warte(500); await bild('3-scan');
  aus.autoReiter = await klick('Autostart') || await klick('Anmeldeobjekte'); await warte(500); await bild('4-autostart');
  aus.dlReiter = await klick('Downloads'); await warte(500); await bild('5-downloads');

  // Entfernte Geraete: ansehen und einen Auftrag senden.
  await klick('Übersicht'); await warte(400);
  aus.fern = await js('(() => { const k = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("MacBook")); if (k) k.click(); return !!k; })()');
  await warte(900); await bild('16-fern-offline');
  aus.fernFund = (await text()).includes('Wacatac');
  await klick('Übersicht'); await warte(400);
  await js('(() => { const k = [...document.querySelectorAll("button")].find((b) => /^PC/.test(b.textContent.trim()) && b.textContent.includes("Windows")); if (k) k.click(); return !!k; })()');
  await warte(900);
  aus.auftrag = await klick('Schnellscan'); await warte(1200); await bild('17-auftrag-gesendet');
  aus.auftragGesendet = (await text()).includes('Auftrag gesendet');
  await warte(8500); await bild('18-auftrag-laeuft');
  aus.auftragLaeuft = (await text()).includes('Gerät arbeitet');
  await warte(9500); await bild('19-auftrag-fertig');
  aus.auftragFertig = /Fertig heute/.test(await text());

  aus.verlauf = await klick('Verlauf'); await warte(500); await bild('6-verlauf');
  aus.quar = await klick('Quarantäne'); await warte(500); await bild('7-quarantaene');
  aus.einst = await klick('Einstellungen'); await warte(500); await bild('8-einstellungen');
  await klick('Geräte'); await warte(400);
  aus.hinzu = await klick('Gerät hinzufügen'); await warte(400); await bild('20-geraet-typ');
  await klick('Windows-PC'); await warte(700); await bild('21-kopplungscode');
  aus.code = (await text()).includes('1234 5678');
  await klick('Fertig'); await warte(300);

  // Echter Datei-Scan und echte Quarantaene, einmal durch die Oberflaeche.
  const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-probe-'));
  for (const [n, t] of [['Rechnung.pdf.exe', 'x'], ['urlaub.jpg', 'bild'], ['notizen.txt', 'text'], ['setup.exe', 'y']]) fs.writeFileSync(path.join(probe, n), t);
  await js(`window.kranichOberflaeche.dateiScan(${JSON.stringify(probe)})`);
  await warte(1500); await bild('9-scan-ergebnis');
  aus.zeilen = await js('[...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "In Quarantäne").length');
  aus.inQuar = await klick('In Quarantäne'); await warte(1800);
  aus.dateiWeg = !fs.existsSync(path.join(probe, 'Rechnung.pdf.exe'));
  await klick('Quarantäne'); await warte(600); await bild('10-quarantaene-voll');
  aus.zurueck = await klick('Wiederherstellen'); await warte(900);
  aus.dateiWiederDa = fs.existsSync(path.join(probe, 'Rechnung.pdf.exe'));
  await klick('Verlauf'); await warte(500); await bild('11-verlauf-voll');

  // Engine: Probealarm, Testpaket, Labor.
  await klick('Einstellungen'); await warte(300);
  aus.engineReiter = await klick('Engine'); await warte(400);
  aus.probe = await klick('Probealarm starten'); await warte(1500); await bild('12-engine');
  const paket = await js('window.kranich.testpaket().then((t) => ({ bestanden: t.bestanden, gesamt: t.gesamt, falsch: t.zeilen.filter((z) => !z.bestanden) }))');
  aus.testpaket = paket;
  await warte(900); await bild('13-testpaket');
  aus.labor = await klick('Labor'); await warte(500); await bild('15-labor');
  aus.abmelden = await klick('Abmelden'); await warte(600);
  aus.abgemeldet = (await text()).includes('Anmelden');
}
