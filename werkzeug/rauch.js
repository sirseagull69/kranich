// Rauchtest: startet die echte App, klickt sich durch die Oberflaeche und
// macht Bilder. Aufruf: electron werkzeug/rauch.js   (BILDER=<Ordner>)
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { app, BrowserWindow } = require('electron');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-rauch-')));
require('../main/main.js');

const bilder = process.env.BILDER || os.tmpdir();
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(() => setTimeout(async () => {
  const f = BrowserWindow.getAllWindows()[0];
  const js = (code) => f.webContents.executeJavaScript(code);
  const bild = async (name) => fs.writeFileSync(path.join(bilder, name + '.png'), (await f.webContents.capturePage()).toPNG());
  const klick = (text) => js(`(() => { const k = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)})); if (k) k.click(); return !!k; })()`);
  const aus = { fehler: [] };
  f.webContents.on('console-message', (_e, stufe, text) => { if (stufe >= 2) aus.fehler.push(text); });
  try {
    await warte(1500);
    aus.knoepfe = await js('document.querySelectorAll("button").length');
    aus.status = await js('document.querySelector("h2,h1") && [...document.querySelectorAll("h1,h2")].map((h) => h.textContent.trim()).join(" | ")');
    await bild('1-uebersicht');
    aus.geraet = await js('(() => { const k = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Dieses Gerät")); if (k) k.click(); return !!k; })()');
    await warte(700); await bild('2-geraet-funde');
    aus.scanReiter = await klick('Scan'); await warte(500); await bild('3-scan');
    aus.autoReiter = await klick('Autostart') || await klick('Anmeldeobjekte'); await warte(500); await bild('4-autostart');
    aus.dlReiter = await klick('Downloads'); await warte(500); await bild('5-downloads');
    aus.verlauf = await klick('Verlauf'); await warte(500); await bild('6-verlauf');
    aus.quar = await klick('Quarantäne'); await warte(500); await bild('7-quarantaene');
    aus.einst = await klick('Einstellungen'); await warte(500); await bild('8-einstellungen');
    aus.node = await js('typeof require + "/" + typeof process');

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
    await klick('Details'); await warte(400); await bild('14-details');
    aus.fehlalarm = await klick('Das war ein Fehlalarm'); await warte(600);
    aus.labor = await klick('Labor'); await warte(500); await bild('15-labor');
  } catch (e) { aus.fehler.push(e.message); }
  console.log('RAUCH ' + JSON.stringify(aus));
  app.exit(aus.fehler.length ? 1 : 0);
}, 2500));
