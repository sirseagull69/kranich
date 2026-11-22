'use strict';
// Prueft nur den Dateinamen, ohne die Datei zu oeffnen.
// Ergebnis: { stufe: 'ok' | 'hinweis' | 'verdaechtig', gruende: [...] }

const path = require('node:path');

// Dateien, die beim Doppelklick Code ausfuehren koennen.
const AUSFUEHRBAR = new Set([
  // Windows
  'exe', 'scr', 'com', 'pif', 'bat', 'cmd', 'ps1', 'vbs', 'vbe', 'js', 'jse',
  'wsf', 'wsh', 'hta', 'msi', 'msp', 'lnk', 'jar', 'cpl', 'reg', 'dll',
  // macOS
  'app', 'command', 'pkg', 'dmg', 'scpt',
  // Android
  'apk',
]);

// Behaelter, in denen sich Ausfuehrbares versteckt.
const BEHAELTER = new Set(['zip', 'rar', '7z', 'iso', 'img', 'vhd', 'vhdx', 'cab']);

// Office-Dateien mit Makros.
const MAKRO = new Set(['docm', 'xlsm', 'pptm', 'dotm', 'xlam']);

// Endungen, die harmlos aussehen und gern als Tarnung benutzt werden.
const TARNUNG = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf',
  'jpg', 'jpeg', 'png', 'gif', 'mp3', 'mp4', 'avi', 'mov', 'csv',
]);

// Unsichtbare Zeichen, die die Leserichtung umdrehen ("exe.fdp" wird als
// "pdf.exe" angezeigt und umgekehrt).
const RICHTUNGSZEICHEN = /[‪-‮⁦-⁩‎‏]/;

function endung(name) {
  return path.extname(name).slice(1).toLowerCase();
}

function istRiskanterTyp(name) {
  const e = endung(name.trim());
  return AUSFUEHRBAR.has(e) || BEHAELTER.has(e) || MAKRO.has(e);
}

function pruefeName(dateiname) {
  const name = path.basename(dateiname);
  const gruende = [];
  let stufe = 'ok';
  const hoch = (neu) => {
    if (neu === 'verdaechtig' || (neu === 'hinweis' && stufe === 'ok')) stufe = neu;
  };

  if (RICHTUNGSZEICHEN.test(name)) {
    gruende.push('Versteckte Zeichen im Namen, die die Endung tarnen');
    hoch('verdaechtig');
  }

  const sauber = name.replace(RICHTUNGSZEICHEN, '').trim();
  const letzte = endung(sauber);
  const ohneLetzte = sauber.slice(0, sauber.length - letzte.length - 1);
  const vorletzte = endung(ohneLetzte.trim());

  if (AUSFUEHRBAR.has(letzte) && TARNUNG.has(vorletzte)) {
    gruende.push(`Doppelte Dateiendung (.${vorletzte}.${letzte})`);
    hoch('verdaechtig');
  }

  // "Rechnung.pdf          .exe": die echte Endung wird aus dem Bild geschoben.
  if (AUSFUEHRBAR.has(letzte) && /\s{3,}\.[^.]+$/.test(sauber)) {
    gruende.push('Viele Leerzeichen vor der Endung');
    hoch('verdaechtig');
  }

  if (stufe !== 'verdaechtig') {
    if (AUSFUEHRBAR.has(letzte)) {
      gruende.push('Ausführbare Datei');
      hoch('hinweis');
    } else if (MAKRO.has(letzte)) {
      gruende.push('Office-Datei mit Makros');
      hoch('hinweis');
    } else if (BEHAELTER.has(letzte)) {
      gruende.push('Archiv oder Abbild, Inhalt wird nicht geprüft');
      hoch('hinweis');
    }
  }

  return { stufe, gruende };
}

module.exports = { pruefeName, istRiskanterTyp, endung };
