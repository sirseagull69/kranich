'use strict';
// Gemeinsamer Aufruf von Windows PowerShell und Lesen ihrer JSON-Ausgabe.

const { execFile } = require('node:child_process');

const UTF8 = '[Console]::OutputEncoding=[Text.Encoding]::UTF8;';

// werte: Zusatzwerte, die als Umgebungsvariablen uebergeben werden. So
// landen Pfade nie im Befehlstext und koennen dort nichts anrichten.
function powershell(befehl, { werte = {}, signal } = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', UTF8 + befehl],
      { maxBuffer: 32 * 1024 * 1024, windowsHide: true, env: { ...process.env, ...werte }, signal },
      (fehler, ausgabe) => (fehler ? reject(fehler) : resolve(ausgabe)),
    );
  });
}

// PowerShell liefert bei einem Treffer ein Objekt, bei mehreren eine Liste,
// bei keinem gar nichts. Hier wird daraus immer eine Liste.
function jsonListe(text) {
  const roh = (text ?? '').replace(/^﻿/, '').trim();
  if (!roh) return [];
  try {
    const daten = JSON.parse(roh);
    return (Array.isArray(daten) ? daten : [daten]).filter((e) => e && typeof e === 'object');
  } catch {
    return [];
  }
}

module.exports = { powershell, jsonListe };
