'use strict';
// Autostart-Check fuer Windows. Liest nur, aendert nichts.
// Drei Quellen: Autostart (Registry + Autostart-Ordner), geplante
// Aufgaben, automatisch startende Dienste.

const { powershell } = require('./powershell');

const BEFEHLE = {
  autostart:
    'Get-CimInstance Win32_StartupCommand | ' +
    'Select-Object Name,Command,Location,User | ConvertTo-Json -Compress',
  aufgabe:
    "Get-ScheduledTask | Where-Object { $_.TaskPath -notlike '\\Microsoft\\*' } | ForEach-Object { " +
    '[pscustomobject]@{ Name=$_.TaskName; Location=$_.TaskPath; ' +
    'Command=(($_.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)".Trim() }) -join "; "); ' +
    'User=$_.Author } } | ConvertTo-Json -Compress',
  dienst:
    "Get-CimInstance Win32_Service -Filter \"StartMode='Auto'\" | " +
    'Select-Object Name,@{n="Command";e={$_.PathName}},@{n="Location";e={$_.DisplayName}},' +
    '@{n="User";e={$_.StartName}} | ConvertTo-Json -Compress',
};

// PowerShell liefert bei einem Treffer ein Objekt, bei mehreren eine Liste,
// bei keinem gar nichts. Hier wird daraus immer eine Liste.
function ausJson(text, herkunft) {
  const roh = (text ?? '').replace(/^﻿/, '').trim();
  if (!roh) return [];
  let daten;
  try {
    daten = JSON.parse(roh);
  } catch {
    return [];
  }
  const liste = Array.isArray(daten) ? daten : [daten];
  return liste
    .filter((e) => e && e.Name)
    .map((e) => ({
      herkunft,
      name: String(e.Name),
      befehl: e.Command ? String(e.Command).trim() : '',
      ort: e.Location ? String(e.Location) : '',
      benutzer: e.User ? String(e.User) : '',
    }));
}

async function leseAutostart({ ausfuehren = powershell } = {}) {
  if (ausfuehren === powershell && process.platform !== 'win32') {
    throw new Error('Der Autostart-Check läuft nur unter Windows');
  }
  const eintraege = [];
  const fehler = [];
  for (const [herkunft, befehl] of Object.entries(BEFEHLE)) {
    try {
      eintraege.push(...ausJson(await ausfuehren(befehl), herkunft));
    } catch (e) {
      fehler.push({ herkunft, meldung: e.message });
    }
  }
  return { eintraege, fehler };
}

const schluessel = (e) => `${e.herkunft}|${e.ort}|${e.name}`.toLowerCase();

// Vergleicht den gemerkten Stand mit dem aktuellen.
function vergleiche(bekannt, aktuell) {
  const alt = new Map(bekannt.map((e) => [schluessel(e), e]));
  const neuMap = new Map(aktuell.map((e) => [schluessel(e), e]));
  const neu = [];
  const geaendert = [];
  for (const [k, e] of neuMap) {
    const vorher = alt.get(k);
    if (!vorher) neu.push(e);
    else if (vorher.befehl !== e.befehl) geaendert.push({ ...e, befehlVorher: vorher.befehl });
  }
  const entfernt = bekannt.filter((e) => !neuMap.has(schluessel(e)));
  return { neu, geaendert, entfernt };
}

module.exports = { leseAutostart, vergleiche, ausJson, BEFEHLE };
