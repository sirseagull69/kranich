'use strict';
// Scannt eine Datei oder einen Ordner und liefert pro Datei ein Urteil:
//   'sauber' | 'verdaechtig' | 'schaedlich' | 'unbekannt' | 'nicht_geprueft'

const fs = require('node:fs');
const path = require('node:path');
const { sha256 } = require('./hash');
const { pruefeName, istRiskanterTyp } = require('./heuristik');

// Ab so vielen Scannern, die "boesartig" sagen, gilt die Datei als schaedlich.
// Ein bis zwei Treffer sind oft Fehlalarme einzelner Scanner.
const SCHWELLE_SCHAEDLICH = 3;

function urteile(heuristik, vt) {
  const hinweise = [...heuristik.gruende];
  let urteil;

  if (vt.status === 'bekannt') {
    if (vt.boesartig >= SCHWELLE_SCHAEDLICH) urteil = 'schaedlich';
    else if (vt.boesartig > 0 || vt.verdaechtig > 0) urteil = 'verdaechtig';
    else urteil = 'sauber';
  } else if (vt.status === 'uebersprungen') {
    urteil = 'nicht_geprueft';
  } else {
    urteil = 'unbekannt';
    if (vt.status === 'unbekannt') hinweise.push('VirusTotal kennt diese Datei nicht');
    if (vt.status === 'kein_schluessel') hinweise.push('Kein VirusTotal-Schlüssel hinterlegt');
    if (vt.status === 'schluessel_falsch') hinweise.push('VirusTotal-Schlüssel wird abgelehnt');
    if (vt.status === 'limit') hinweise.push('VirusTotal-Limit erreicht');
    if (vt.status === 'fehler') hinweise.push(vt.meldung);
  }

  // Ein getarnter Name bleibt verdaechtig, auch wenn kein Scanner anschlaegt.
  if (heuristik.stufe === 'verdaechtig' && urteil !== 'schaedlich') urteil = 'verdaechtig';

  return { urteil, hinweise };
}

async function pruefeDatei(pfad, { vt, vtAbfragen = true, signal } = {}) {
  const basis = { pfad, name: path.basename(pfad) };
  try {
    const info = await fs.promises.stat(pfad);
    const heuristik = pruefeName(pfad);
    const hash = await sha256(pfad, { signal });
    const vtErgebnis = vt && vtAbfragen ? await vt.abfrage(hash) : { status: vt ? 'uebersprungen' : 'kein_schluessel' };
    const { urteil, hinweise } = urteile(heuristik, vtErgebnis);
    return {
      ...basis,
      groesse: info.size,
      sha256: hash,
      urteil,
      hinweise,
      treffer: vtErgebnis.status === 'bekannt'
        ? { boesartig: vtErgebnis.boesartig, verdaechtig: vtErgebnis.verdaechtig, gesamt: vtErgebnis.gesamt }
        : null,
      link: vtErgebnis.link ?? null,
    };
  } catch (fehler) {
    if (fehler.name === 'AbortError') throw fehler;
    return { ...basis, urteil: 'unbekannt', hinweise: [`Nicht lesbar: ${fehler.code ?? fehler.message}`], treffer: null, link: null };
  }
}

// Alle Dateien unter einem Pfad. Verknuepfungen (Symlinks) werden nicht verfolgt.
async function* dateienUnter(pfad) {
  let info;
  try {
    info = await fs.promises.lstat(pfad);
  } catch {
    return;
  }
  if (info.isSymbolicLink()) return;
  if (info.isFile()) {
    yield pfad;
    return;
  }
  if (!info.isDirectory()) return;
  let eintraege;
  try {
    eintraege = await fs.promises.readdir(pfad);
  } catch {
    return; // kein Zugriff
  }
  for (const name of eintraege.sort()) yield* dateienUnter(path.join(pfad, name));
}

// Scannt Datei oder Ordner.
//   alleAbfragen: false = im Ordner nur riskante Dateitypen bei VirusTotal
//   nachfragen (spart das Tageslimit). Einzelne Dateien werden immer gefragt.
async function scanne(pfad, { vt, alleAbfragen = false, beiFortschritt, signal } = {}) {
  const liste = [];
  for await (const datei of dateienUnter(pfad)) liste.push(datei);
  const einzeln = liste.length === 1 && path.resolve(liste[0]) === path.resolve(pfad);

  const ergebnisse = [];
  for (let i = 0; i < liste.length; i++) {
    if (signal?.aborted) break;
    const datei = liste[i];
    beiFortschritt?.({ nummer: i + 1, gesamt: liste.length, datei });
    const heuristik = pruefeName(datei);
    const fragen = einzeln || alleAbfragen || istRiskanterTyp(datei) || heuristik.stufe === 'verdaechtig';
    try {
      ergebnisse.push(await pruefeDatei(datei, { vt, vtAbfragen: fragen, signal }));
    } catch (fehler) {
      if (fehler.name === 'AbortError') break;
      throw fehler;
    }
  }
  return { ergebnisse, abgebrochen: Boolean(signal?.aborted), zusammenfassung: zaehle(ergebnisse) };
}

function zaehle(ergebnisse) {
  const z = { sauber: 0, verdaechtig: 0, schaedlich: 0, unbekannt: 0, nicht_geprueft: 0 };
  for (const e of ergebnisse) z[e.urteil]++;
  return z;
}

module.exports = { scanne, pruefeDatei, dateienUnter, urteile, SCHWELLE_SCHAEDLICH };
