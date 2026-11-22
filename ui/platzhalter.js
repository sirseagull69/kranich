'use strict';
const aus = document.getElementById('aus');
const zeige = (wert) => { aus.textContent = typeof wert === 'string' ? wert : JSON.stringify(wert, null, 2); };
const bei = (id, funktion) => document.getElementById(id).addEventListener('click', async () => {
  zeige('Kranich schaut nach …');
  try { zeige(await funktion()); } catch (fehler) { zeige('Fehler: ' + fehler.message); }
});

bei('lage', () => window.kranich.lage());
bei('schnell', () => window.kranich.schutzScan('schnell'));
bei('autostart', () => window.kranich.autostart());
bei('wache', () => window.kranich.wacheStatus());
bei('datei', async () => { const p = await window.kranich.waehlePfad('datei'); return p ? window.kranich.scanPfad(p) : 'Abgebrochen.'; });
bei('ordner', async () => { const p = await window.kranich.waehlePfad('ordner'); return p ? window.kranich.scanPfad(p) : 'Abgebrochen.'; });

window.kranich.beiEreignis((ereignis) => {
  if (ereignis.art === 'scan-fortschritt') zeige(`Prüfe ${ereignis.nummer} von ${ereignis.gesamt}\n${ereignis.datei}`);
  if (ereignis.art === 'download') zeige(ereignis);
});
