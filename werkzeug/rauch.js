'use strict';
// Rauchtest: startet das echte Programm mit vorgespieltem Claude und klickt
// es durch. Bilder landen in ./rauch/. Aufruf: xvfb-run -a npx electron werkzeug/rauch.js
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
process.env.KRANICH_RAUCH = '1';
process.env.KRANICH_SPIELHIRN = process.env.KRANICH_SPIELHIRN || '1';
process.env.KRANICH_DATEN = fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-rauch-'));
const { app } = require('electron');
const { start } = require('../main/main');

const AUS = path.join(__dirname, '..', 'rauch');
fs.mkdirSync(AUS, { recursive: true });
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
let fehler = 0;

app.whenReady().then(async () => {
  const w = start();
  w.setSize(1440, 900);
  w.webContents.on('console-message', (_e, level, msg) => { if (level >= 3) { console.log('KONSOLE:', msg); fehler++; } });
  const js = (code) => w.webContents.executeJavaScript(code);
  const foto = async (name) => { await warte(350); const b = await w.webContents.capturePage(); fs.writeFileSync(path.join(AUS, `${name}.png`), b.toPNG()); console.log('Foto', name); };
  const pruefe = async (was, code) => { const ok = await js(code); console.log(ok ? 'OK  ' : 'FEHL', was); if (!ok) fehler++; };
  const bisDa = async (code, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await js(code)) return true; await warte(150); } return false; };

  try {
    await w.webContents.once('did-finish-load', () => {});
    await bisDa("!!document.querySelector('#start')");
    await foto('1-start');
    await pruefe('Start zeigt drei Karten', "document.querySelectorAll('.startkarte').length === 3");

    // Neuer Entwurf über das Eingabefeld
    await js("document.getElementById('startwunsch').value = 'Startseite für eine To-do-App'; App.aktionen['start-falten']()");
    await bisDa("App.S.kranich.zustand === 'denkt'", 3000);
    await foto('2-denkt');
    await bisDa("App.S.kranich.zustand === 'fertig'");
    await bisDa("document.querySelector('.leinwand iframe')?.contentDocument?.querySelector('[data-k]')");
    await warte(500);
    await pruefe('Entwurf liegt auf der Leinwand', "!!document.querySelector('.leinwand iframe').contentDocument.querySelector('h1')");
    await pruefe('Ebenen wurden gebaut', "document.querySelectorAll('.ebenen button').length >= 3");
    // Element anklicken
    await js("document.querySelector('.leinwand iframe').contentDocument.querySelector('button').click()");
    await warte(300);
    await pruefe('Auswahl gesetzt', "App.S.auswahl && /Neue Aufgabe/.test(App.S.auswahl.name)");
    await pruefe('Schnellmenü sichtbar', "!document.querySelector('.schnellmenue').hidden");
    await foto('3-werkbank-auswahl');
    await js("App.aktionen['schnell-groesser']()");
    await bisDa("App.S.kranich.zustand === 'fertig' && App.S.projekt.chat.length >= 4");
    await warte(600);
    await pruefe('Änderung landet als neue Fassung', "App.S.projekt.seiten[0].verlauf.length === 2");
    await foto('4-fertig');
    await js("App.aktionen.rueckgaengig()");
    await pruefe('Rückgängig springt zurück', "App.S.projekt.seiten[0].stand === 0");

    // Varianten
    await js("App.aktionen.varianten()");
    await bisDa("App.S.varianten && App.S.varianten.length === 3", 8000);
    await warte(800);
    await foto('5-varianten');
    await pruefe('Drei Varianten', "document.querySelectorAll('.variante iframe').length === 3");
    await js("document.querySelector('[data-aktion=\"variante-nehmen\"][data-i=\"1\"]').click()");
    await warte(500);
    await pruefe('Variante übernommen', "/Mutig/.test(App.S.projekt.seiten[0].verlauf.at(-1).was)");

    // Export
    await js("document.querySelector('[data-aktion=\"exportieren\"]').click()");
    await bisDa("!!document.querySelector('.dialog')");
    await warte(600);
    await foto('6-export');
    await js("document.querySelector('[data-format=\"html\"]').click(); document.querySelector('[data-los]').click()");
    await bisDa("!document.querySelector('.dialog')");
    await js("document.querySelector('[data-aktion=\"exportieren\"]').click()");
    await bisDa("!!document.querySelector('.dialog')");
    await js("document.querySelector('[data-faktor=\"2\"]').click(); document.querySelector('[data-los]').click()");
    await bisDa("!document.querySelector('.dialog')", 10000);
    const ordner = path.join(app.getPath('documents'), 'Kranich');
    const dateien = fs.existsSync(ordner) ? fs.readdirSync(ordner) : [];
    console.log(dateien.some((d) => d.endsWith('.html')) && dateien.some((d) => d.endsWith('.png')) ? 'OK   Export HTML und PNG' : `FEHL Export (${dateien})`);
    const png = dateien.filter((d) => d.endsWith('.png')).map((d) => path.join(ordner, d)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    if (png) { const { nativeImage } = require('electron'); const s = nativeImage.createFromPath(png).getSize(); console.log(s.width === 2880 ? 'OK  ' : 'FEHL', 'PNG in 2×', s); fs.copyFileSync(png, path.join(AUS, '7-export-ergebnis.png')); }

    // Bild-Modus
    await js("document.querySelector('[data-modus=\"bild\"]').click()");
    await warte(300);
    await foto('8-bild-leer');
    await js(`(async () => {
      const c = document.createElement('canvas'); c.width = 1200; c.height = 900;
      const k = c.getContext('2d'); k.fillStyle = '#f4f1ea'; k.fillRect(0, 0, 1200, 900);
      k.fillStyle = '#4a2f9a'; k.beginPath(); k.roundRect(450, 300, 300, 340, [10, 10, 60, 60]); k.fill();
      k.strokeStyle = '#4a2f9a'; k.lineWidth = 30; k.beginPath(); k.arc(770, 450, 70, -1.2, 1.2); k.stroke();
      window.KRANICH_OHNE_KI = true;
      await Bild.oeffneBild(c.toDataURL(), 'tasse.png');
      App.renderWerkbank();
    })()`);
    await warte(500);
    await pruefe('Bild geöffnet', "Bild.z.breite === 1200 && document.querySelectorAll('.werkzeuge button').length === 8");
    await foto('9-bild');
    await js("document.getElementById('wunsch').value = 'Hintergrund weg und auf 1080×1080'; App.aktionen.senden()");
    await bisDa("App.S.kranich.zustand === 'fertig'", 15000);
    await warte(500);
    await pruefe('Plan angewendet: 1080 × 1080', "Bild.z.breite === 1080 && Bild.z.hoehe === 1080");
    await pruefe('Hintergrund durchsichtig', "(() => { const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const k = c.getContext('2d'); for (const e of Bild.z.ebenen) k.drawImage(e.canvas, e.x, e.y); return k.getImageData(5, 5, 1, 1).data[3] === 0 && k.getImageData(540, 540, 1, 1).data[3] === 255; })()");
    await pruefe('Regler gesetzt', "Bild.z.anpassung.hell === 12 && Bild.z.anpassung.waerme === -8");
    await foto('10-bild-fertig');
    // Werkzeuge
    await js("App.aktionen.werkzeug({ dataset: { w: 'zuschneiden' } })");
    await js(`(() => { const f = document.getElementById('bildflaeche'); const r = f.getBoundingClientRect();
      const ev = (t, x, y) => f.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, pointerId: 1, bubbles: true }));
      ev('pointerdown', r.width * 0.4, r.height * 0.3); ev('pointermove', r.width * 0.6, r.height * 0.6); ev('pointerup', r.width * 0.6, r.height * 0.6); })()`);
    await warte(200);
    await foto('11-zuschneiden');
    await js("App.aktionen['zuschnitt-an']()");
    await pruefe('Zuschnitt verkleinert', "Bild.z.breite < 1080");
    await js("App.aktionen.rueckgaengig()");
    await pruefe('Rückgängig im Bild', "Bild.z.breite === 1080");
    // Speichern und neu laden
    await warte(1500);
    await js("App.aktionen['zum-start']()");
    await bisDa("!!document.querySelector('#start')");
    await warte(3500);
    await js("App.zeigeStart()");
    await warte(800);
    await foto('12-start-mit-projekt');
    await pruefe('Projekt in der Liste', "document.querySelectorAll('.projektkarte').length >= 1");
    await js("document.querySelector('[data-aktion=\"projekt-oeffnen\"]').click()");
    await bisDa("App.S.ansicht === 'werkbank'");
    await warte(600);
    await pruefe('Bild nach Neuladen da', "App.S.modus !== 'bild' || Bild.z.breite === 1080");
    await js("document.querySelector('[data-modus=\"bild\"]').click()");
    await warte(300);
    await pruefe('Bild-Ebenen gespeichert', "Bild.z.ebenen.length >= 1 && Bild.z.breite === 1080");
    await js("document.querySelector('[data-modus=\"entwurf\"]').click()");
    await warte(600);
    await pruefe('Entwurf nach Neuladen da', "!!document.querySelector('.leinwand iframe').contentDocument.querySelector('h1')");

    // Keine Verbindung
    process.env.KRANICH_SPIELHIRN = 'fehler';
    await js("document.getElementById('wunsch').value = 'Mach die Startseite schöner'; App.aktionen.senden()");
    await bisDa("App.S.kranich.zustand === 'fehler'");
    await warte(300);
    await pruefe('Fehler wird gezeigt', "!!document.querySelector('.hinweisband.fehler') && /Nochmal/.test(document.querySelector('.kranichleiste').textContent)");
    await foto('13-fehler');
    process.env.KRANICH_SPIELHIRN = '1';
    await js("App.aktionen.nochmal()");
    await bisDa("App.S.kranich.zustand === 'fertig'");
    await pruefe('Nochmal klappt danach', "App.S.kranich.zustand === 'fertig' && !document.querySelector('.hinweisband.fehler')");

    // Einstellungen
    await js("App.zeigeStart().then(() => document.querySelector('[data-aktion=\"einstellungen\"]').click())");
    await bisDa("!!document.querySelector('.dialog')");
    await warte(300);
    await foto('14-einstellungen');
  } catch (e) {
    console.log('ABBRUCH', e);
    fehler++;
  }
  console.log(fehler ? `Rauchtest: ${fehler} Fehler` : 'Rauchtest: alles gut');
  app.exit(fehler ? 1 : 0);
});
