'use strict';
// Echter Test: richtige Mausklicks und Tastendrücke wie ein Mensch (ohne Claude, Ping, Sync).
process.env.SPECHT_SPIEL = '1';
const _w = require('path').join(require('os').tmpdir(), 'specht-wissen-test.json');
require('fs').writeFileSync(_w, JSON.stringify(require('./beispiel-wissen.js')));
process.env.SPECHT_WISSEN_DATEI = _w;
const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs'); const os = require('os');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'specht-echt-')));
const fotos = path.join(__dirname, '..', 'rauch'); fs.mkdirSync(fotos, { recursive: true });
require('../main/main.js');
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
let fehler = 0;
app.whenReady().then(async () => {
  await warte(1500);
  const w = BrowserWindow.getAllWindows()[0]; w.setSize(1440, 900); w.focus();
  const wc = w.webContents; const js = (c) => wc.executeJavaScript(c);
  const pruefe = async (n, c) => { const ok = await js(c).catch((e) => (console.log(e.message), false)); console.log(`${ok ? 'OK  ' : 'FEHL'} ${n}`); if (!ok) fehler++; };
  const foto = async (n) => { await warte(450); fs.writeFileSync(path.join(fotos, `${n}.png`), (await wc.capturePage()).toPNG()); };
  wc.on('console-message', (_e, l, m) => { if (l >= 3) { console.log('KONSOLE', m); fehler++; } });
  const mitte = (sel) => js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return [Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)]})()`);
  const klick = async (sel) => {
    const p = await mitte(sel); if (!p) { console.log(`FEHL nicht gefunden: ${sel}`); fehler++; return; }
    await warte(60);
    const [x, y] = await mitte(sel);
    const oben = await js(`(()=>{const e=document.elementFromPoint(${x},${y}); const z=document.querySelector(${JSON.stringify(sel)}); return z===e||z.contains(e)})()`);
    if (!oben) { console.log(`FEHL verdeckt: ${sel}`); fehler++; }
    for (const t of ['mouseMove', 'mouseDown', 'mouseUp']) wc.sendInputEvent({ type: t, x, y, button: 'left', clickCount: 1 });
    await warte(300);
  };
  const tippe = async (text) => { for (const ch of text) { wc.sendInputEvent({ type: 'char', keyCode: ch }); await warte(15); } await warte(150); };
  const taste = async (k) => { wc.sendInputEvent({ type: 'keyDown', keyCode: k }); wc.sendInputEvent({ type: 'keyUp', keyCode: k }); await warte(300); };

  for (let i = 0; i < 30 && !(await js("!!document.querySelector('.kopf')")); i++) await warte(200);
  // Erster Start
  await pruefe('Erster Start erscheint', "!!document.querySelector('.schleier.start #st-mail')");
  await foto('s0-erster-start');
  await klick('#st-mail'); await tippe('nils@test.de');
  await klick('#st-pw'); await tippe('kurz');
  await klick('.start [data-s="an"]');
  await pruefe('Zu kurzes Kennwort wird gemeldet', "/8 Zeichen/.test(document.querySelector('.start .hinweisbox')?.textContent||'')");
  await klick('#st-pw'); await tippe('lang-genug-123');
  await klick('.start [data-s="an"]'); await warte(300);
  await pruefe('Schritt 2: Wissen laden', "/Wissen laden/.test(document.querySelector('.start h2')?.textContent||'')");
  await klick('.start [data-s="wissen"]'); await warte(400);
  await pruefe('Wissen geladen', "/Wissen ist drin/.test(document.querySelector('.start h2')?.textContent||'') && App.S.d.wissen.SERVER.length===12");
  await klick('.start [data-s="weiter3"]');
  await klick('.start [data-s="testen"]'); await warte(300);
  await pruefe('Claude-Test meldet passt', "/passt/.test(document.querySelector('.start .hinweisbox')?.textContent||'')");
  await klick('.start .btn.haupt[data-s="fertig"]');
  await pruefe('Erster Start zu', "!document.querySelector('.schleier.start')");

  // Übersicht nach dem Abklopfen
  for (let i = 0; i < 20 && !(await js("!!App.S.d.letzterKlopf")); i++) await warte(200);
  await warte(400);
  await pruefe('Übersicht: Satz mit Sachen zum Ansehen', "/Fast alles läuft/.test(document.querySelector('.titelkarte h1').textContent)");
  await pruefe('NAS02 rot, ALT01 grau', "document.querySelector('.kachel.rot [class*=punkt]')!==null && [...document.querySelectorAll('.kachel.grau b')].some(b=>/ALT01/.test(b.textContent))");
  await foto('s1-uebersicht');

  // Server öffnen, Notiz schreiben
  await klick('.kachel[data-id="tel01"]');
  await pruefe('Hinweis aus der Wissens-Datei', "/UCServer/.test(document.querySelector('.hinweisbox')?.textContent||'')");
  await pruefe('Server-Detail TEL01', "/TEL01/.test(document.querySelector('.titelkarte h1').textContent)");
  await klick('#neue-notiz'); await tippe('Dienstkonto beantragen');
  await klick('[data-a="notiz-dazu"]');
  await pruefe('Notiz steht da mit Gerät', "[...document.querySelectorAll('.notiz p')].some(p=>p.textContent==='Dienstkonto beantragen')");
  await foto('s2-server'); await pruefe('Knöpfe ganz sichtbar', "[...document.querySelectorAll('button')].filter(b=>b.offsetParent).every(b=>b.scrollWidth<=b.clientWidth+1)");
  // Suche
  await klick('#suche-server'); await tippe('veeam'); await warte(300);
  await pruefe('Suche filtert', "document.querySelectorAll('.serverliste .eintrag').length===2 && document.querySelector('#suche-server').value==='veeam'");
  // Gewollt aus
  await klick('.serverliste .eintrag[data-id="veeam01"]'); await klick('[data-a="gewollt"]');
  await pruefe('Gewollt aus gesetzt', "App.S.d.eintraege.some(e=>e.art==='gewollt_aus'&&e.ziel==='veeam01')");

  // Fragen
  await klick('#frage'); await tippe('Wo läuft ProCall?'); await taste('Enter'); await warte(500);
  await pruefe('Antwort mit Befehl', "!!document.querySelector('.helfer .befehl code') && /Passbolt/.test(document.querySelector('.gespraech').textContent)");
  await klick('.helfer [data-a="kopieren"]');
  await pruefe('Kopiert-Meldung', "/Kopiert|ging nicht/.test(document.querySelector('.toast')?.textContent||'')");
  await klick('.helfer [data-a="stoerung-oeffnen"]');
  await pruefe('Ähnliche Störung öffnet Tagebuch', "App.S.ansicht==='stoerungen' && !!document.querySelector('#st-was')");
  await foto('s3-stoerung'); await pruefe('Knöpfe ganz sichtbar', "[...document.querySelectorAll('button')].filter(b=>b.offsetParent).every(b=>b.scrollWidth<=b.clientWidth+1)");

  // Neue Störung
  await klick('[data-a="stoerung-zu"]');
  await klick('[data-a="stoerung-neu"]');
  await klick('#st-was'); await tippe('Drucker OG druckt nicht FILE01');
  await klick('[data-a="stoerung-speichern"]');
  await pruefe('Neue Störung im Tagebuch, mit Server verknüpft', "App.S.d.eintraege.some(e=>e.art==='stoerung'&&/Drucker OG/.test(e.was)&&e.server.includes('file01'))");

  // Anleitung + Erklären
  await klick('.seite [data-z="anleitungen"]');
  await klick('[data-a="anleitung-oeffnen"][data-id="an-betankung"]');
  await klick('[data-a="schritt-erklaeren"][data-i="1"]'); await warte(500);
  await pruefe('Schritt erklärt', "!!document.querySelector('.erklaerung')");
  await foto('s4-anleitung');
  await klick('[data-a="anleitung-bearbeiten"]');
  await klick('#an-titel'); await tippe(' neu');
  await klick('[data-a="anleitung-speichern"]');
  await pruefe('Anleitung gespeichert', "/neu$/.test(document.querySelector('.titelkarte h1').textContent)");

  // Freigaben
  await klick('.seite [data-z="freigaben"]');
  await klick('#fg-pfad'); await tippe('\\\\FILE01\\Projekte');
  await klick('#fg-recht'); await tippe('Jeder: Vollzugriff');
  await klick('[data-a="freigabe-dazu"]');
  await pruefe('Zu offene Freigabe rot', "!!document.querySelector('main.haupt .punkt.aus') && /Zu offen/.test(document.querySelector('main.haupt').textContent)");

  // Netz abhaken
  await klick('.seite [data-z="netz"]');
  await klick('.abhaken input[data-id="np-1"]'); await warte(200);
  await pruefe('Netzpunkt abgehakt', "App.S.d.eintraege.find(e=>e.id==='np-1').erledigt===true");
  await foto('s5-netz');

  // Backup, Lizenzen
  await klick('.seite [data-z="backup"]');
  await pruefe('Backup zeigt vollen Balken', "!!document.querySelector('.balken i.rot')");
  await klick('.seite [data-z="lizenzen"]'); await warte(400);
  await pruefe('Lizenzen: nicht verbunden', "/nicht verbunden/.test(document.querySelector('main.haupt').textContent)");

  // Einstellungen
  await klick('[data-a="ansicht"][data-z="einstellungen"]');
  await klick('[data-a="schalter"][data-k="autoKlopfen"]');
  await pruefe('Auto-Klopfen an', "document.querySelector('[data-k=autoKlopfen]').getAttribute('aria-checked')==='true'");
  await foto('s6-einstellungen'); await pruefe('Knöpfe ganz sichtbar', "[...document.querySelectorAll('button')].filter(b=>b.offsetParent).every(b=>b.scrollWidth<=b.clientWidth+1)");
  // Löschen mit eigener Abfrage
  await klick('.seite [data-z="stoerungen"]');
  await klick('.tagebuch-eintrag'); await klick('[data-a="stoerung-weg"]');
  await pruefe('Eigene Abfrage beim Löschen', "!!document.querySelector('.schleier [data-ja]')");
  await klick('.schleier [data-ja]');
  await pruefe('Gelöscht, Abfrage zu', "!document.querySelector('.schleier')");
  // Tippen geht danach weiter (Electron-Fehler nach Windows-Boxen)
  await klick('#tb-suche'); await tippe('gpo'); await warte(300);
  await pruefe('Tippen nach Abfrage geht', "document.querySelector('#tb-suche').value==='gpo'");
  // Helfer einklappen
  await klick('[data-a="helfer"]');
  await pruefe('Helfer eingeklappt', "!document.querySelector('.helfer')");
  // Abklopfen per Knopf
  await klick('.seite [data-z="uebersicht"]'); await klick('[data-a="klopfen"]'); await warte(800);
  await pruefe('Nochmal abgeklopft', "!App.S.klopft");
  // Schmal
  w.setSize(1180, 800); await warte(500);
  await pruefe('Schmal: nichts läuft über', "document.documentElement.scrollWidth<=window.innerWidth+1");
  await foto('s7-schmal');
  await pruefe('Kein Knopf gequetscht', "[...document.querySelectorAll('button')].filter(b=>b.offsetParent).every(b=>b.scrollWidth<=b.clientWidth+1)");
  console.log(fehler ? `Echttest: ${fehler} Fehler` : 'Echttest: alles gut'); app.exit(fehler ? 1 : 0);
});
