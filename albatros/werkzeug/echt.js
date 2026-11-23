'use strict';
// Echter Test: richtige Mausklicks und Tastendrücke wie ein Mensch.
process.env.ALBATROS_SPIELHIRN = '1';
const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs'); const os = require('os');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'alb-echt-')));
require('../main/main.js');
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
let fehler = 0;
app.whenReady().then(async () => {
  await warte(1500);
  const w = BrowserWindow.getAllWindows()[0]; w.setSize(1440, 900); w.focus();
  const wc = w.webContents; const js = (c) => wc.executeJavaScript(c);
  const pruefe = async (n, c) => { const ok = await js(c).catch((e) => (console.log(e.message), false)); console.log(`${ok ? 'OK  ' : 'FEHL'} ${n}`); if (!ok) fehler++; };
  wc.on('console-message', (_e, l, m) => { if (l >= 3) { console.log('KONSOLE', m); fehler++; } });
  const mitte = async (sel) => js(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return [Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)]})()`);
  const klick = async (sel, doppel = false) => { const [x, y] = await mitte(sel); for (const t of ['mouseMove', 'mouseDown', 'mouseUp']) wc.sendInputEvent({ type: t, x, y, button: 'left', clickCount: 1 }); if (doppel) for (const t of ['mouseDown', 'mouseUp']) wc.sendInputEvent({ type: t, x, y, button: 'left', clickCount: 2 }); await warte(250); };
  const tippe = async (text) => { for (const ch of text) { wc.sendInputEvent({ type: 'keyDown', keyCode: ch }); wc.sendInputEvent({ type: 'char', keyCode: ch }); wc.sendInputEvent({ type: 'keyUp', keyCode: ch }); await warte(60); } };
  const taste = async (k) => { wc.sendInputEvent({ type: 'keyDown', keyCode: k }); wc.sendInputEvent({ type: 'keyUp', keyCode: k }); await warte(250); };
  for (let i = 0; i < 30 && !(await js("!!document.querySelector('[data-aktion=neu]')")); i++) await warte(200);
  await klick('[data-aktion=neu]'); await warte(800);
  // Tippen: ganzes Wort in B2
  await klick('td[data-a=B2]'); await tippe('hallo Welt'); await warte(200);
  console.log('WERT', await js("String(document.querySelector('.eingabefeld')?.value)+' | '+App.S.t.blaetter[0].zellen.B2+' | '+document.activeElement.className")); await pruefe('Feld bleibt offen beim Tippen', "document.querySelector('.eingabefeld')?.value === 'hallo Welt'");
  await taste('Enter');
  await pruefe('Ganzes Wort gespeichert', "App.S.t.blaetter[0].zellen.B2 === 'hallo Welt'");
  await pruefe('Eins runter', "App.S.anker.ze === 2 && App.S.anker.sp === 1");
  await tippe('12'); await taste('Enter'); await tippe('30'); await taste('Enter'); await tippe('=SUMME(B3:B4)'); await taste('Enter');
  await pruefe('Formel getippt rechnet', "document.querySelector('td[data-a=B5]').textContent.trim() === '42'");
  // Doppelklick bearbeiten
  await klick('td[data-a=B2]', true); await tippe('!'); await taste('Enter');
  console.log('WERT2', await js('App.S.t.blaetter[0].zellen.B2')); await pruefe('Doppelklick hängt an', "App.S.t.blaetter[0].zellen.B2 === 'hallo Welt!'");
  // Formelzeile
  await klick('td[data-a=C2]'); await klick('#formel'); await tippe('oben'); await taste('Enter');
  await pruefe('Formelzeile tippen', "App.S.t.blaetter[0].zellen.C2 === 'oben'");
  // Farbe
  await klick('td[data-a=B2]'); await klick('[data-aktion=farbmenue]');
  await pruefe('Farbmenü sichtbar & klickbar', "(()=>{const b=document.querySelector('.farben [data-farbe=\"#d4ecdc\"]'); if(!b) return false; const r=b.getBoundingClientRect(); return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===b})()");
  await klick('.farben [data-farbe="#d4ecdc"]');
  await pruefe('Farbe gesetzt', "App.S.t.blaetter[0].farben.B2 === '#d4ecdc' && !document.querySelector('.farben')");
  // Blatt dazu und löschen mit eigener Abfrage
  await klick('[data-aktion=blatt-dazu]'); await warte(300);
  await pruefe('Blatt 2 als Reiter', "App.S.t.blaetter.length===2 && [...document.querySelectorAll('.sl-blatt, .mini-reiter .mr')].some(e=>e.textContent.trim()==='Blatt 2')");
  const weg = await js("!!document.querySelector('[data-aktion=blatt-weg]')");
  if (weg) { await klick('[data-aktion=blatt-weg]'); await warte(300);
    await pruefe('Eigene Abfrage statt Windows-Box', "!!document.querySelector('.abfrage')");
    fs.writeFileSync(path.join(__dirname, '..', 'rauch', 'abfrage.png'), (await wc.capturePage()).toPNG());
    await klick('.abfrage [data-ja]');
    await pruefe('Blatt gelöscht', "App.S.t.blaetter.length===1 && !document.querySelector('.abfrage')"); }
  else console.log('INFO kein blatt-weg Knopf sichtbar');
  // große Tabelle: tippen nach Scrollen
  await js("{const b=App.S.t.blaetter[0]; for(let i=1;i<=3000;i++) b.zellen['A'+i]=String(i);} App.zeichneTabelle();");
  await klick('td[data-a=B2]'); await js("document.querySelector('.rasterscroll').scrollTop=60000"); await warte(400);
  const ad = await js("(()=>{const b=document.querySelector('.rasterscroll').getBoundingClientRect(); const d=document.querySelector('th[data-spalte=\"3\"]').getBoundingClientRect(); return document.elementFromPoint(d.left+20,b.top+b.height/2).closest('td').dataset.a})()");
  await klick(`td[data-a=${ad}]`); await tippe('weit unten'); await taste('Enter');
  console.log('WERT3', ad, await js(`App.S.t.blaetter[0].zellen.${ad}`)); await pruefe('Tippen weit unten', `App.S.t.blaetter[0].zellen.${ad} === 'weit unten'`);
  fs.writeFileSync(path.join(__dirname, '..', 'rauch', 'echt.png'), (await wc.capturePage()).toPNG());
  console.log(fehler ? `Echttest: ${fehler} Fehler` : 'Echttest: alles gut'); app.exit(fehler ? 1 : 0);
});
