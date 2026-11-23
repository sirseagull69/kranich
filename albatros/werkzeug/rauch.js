'use strict';
// Rauchtest: startet Albatros mit Spiel-Hirn, klickt durch und macht Fotos.
process.env.ALBATROS_SPIELHIRN = '1';
const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs'); const os = require('os');
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'alb-rauch-'));
app.setPath('userData', ordner);
const fotos = path.join(__dirname, '..', 'rauch'); fs.mkdirSync(fotos, { recursive: true });
require('../main/main.js');
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
let fehler = 0;
app.whenReady().then(async () => {
  await warte(1500);
  const w = BrowserWindow.getAllWindows()[0];
  w.setSize(1440, 900);
  const js = (c) => w.webContents.executeJavaScript(c);
  const foto = async (n) => { await warte(500); fs.writeFileSync(path.join(fotos, `${n}.png`), (await w.webContents.capturePage()).toPNG()); };
  const pruefe = async (name, c) => { const ok = await js(c).catch(() => false); console.log(`${ok ? 'OK  ' : 'FEHL'} ${name}`); if (!ok) fehler++; };
  w.webContents.on('console-message', (_e, l, m) => { if (l >= 3) { console.log('KONSOLE', m); fehler++; } });
  for (let i = 0; i < 30 && !(await js("!!document.querySelector('.karten .karte')")); i++) await warte(200);
  await pruefe('Start da', "!!document.querySelector('.karten .karte')");
  await foto('1-start');
  await js("document.querySelector('[data-k=verein]').click()"); await warte(900);
  await pruefe('Vorlage offen', "document.querySelectorAll('td[data-a]').length > 100");
  await pruefe('Summe gerechnet', "document.querySelector('td[data-a=E9]').textContent.includes('€')");
  // Spalte E markieren
  await js("document.querySelector('th[data-spalte=\"4\"]').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}))"); await warte(300);
  await pruefe('Werte im Helfer', "document.querySelector('.werte b').textContent.includes('€')");
  await foto('2-tabelle');
  // Tippen in Zelle
  await js("App.S.anker={sp:1,ze:6};App.S.ende={sp:1,ze:6}; document.querySelector('.rasterscroll').focus(); document.dispatchEvent(new KeyboardEvent('keydown',{key:'T',bubbles:true}))"); await warte(200);
  await js("const f=document.querySelector('.eingabefeld'); f.value='Test 12'; f.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))"); await warte(300);
  await pruefe('Getippt', "App.S.t.blaetter[0].zellen.B7 === 'Test 12'");
  await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}))"); await warte(300);
  await pruefe('Rückgängig', "App.S.t.blaetter[0].zellen.B7 === undefined");
  // Helfer fragen
  await js("App.frageAlbatros('Mach was und ein Diagramm')"); await warte(1500);
  await pruefe('Antwort im Gespräch', "document.querySelectorAll('.gespraech .er').length >= 1 && !!document.querySelector('.schleier .diagramm svg')");
  await foto('3-diagramm');
  await js("document.querySelector('.schleier [data-zu]').click()"); await warte(300);
  await foto('4-helfer');
  // Einstellungen
  await js("App.aktionen.einstellungen()"); await warte(500);
  await foto('5-einstellungen');
  await js("document.querySelector('.schleier').remove()");
  await js("App.zeigeStart()"); await warte(700);
  await pruefe('Liste zeigt Tabelle', "document.querySelectorAll('.datei').length >= 1");
  await foto('6-start-liste');
  console.log(fehler ? `Rauchtest: ${fehler} Fehler` : 'Rauchtest: alles gut');
  app.exit(fehler ? 1 : 0);
});
