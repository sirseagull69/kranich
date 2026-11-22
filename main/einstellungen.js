'use strict';
// Einstellungen von Kranich als JSON-Datei. Der VirusTotal-Schluessel wird
// nur verschluesselt gespeichert (ueber den Schluesselspeicher des Systems).
// Geht das nicht, wird er gar nicht gespeichert, nie im Klartext.

const fs = require('node:fs');
const path = require('node:path');

const STANDARD = {
  mitSystemStarten: true,
  imTrayWeiterlaufen: true,
  wacheAn: true,
  wacheOrdner: null, // null = Downloads-Ordner des Benutzers
  benachrichtigungen: { fund: true, warnung: true, scanFertig: true, quarantaene: true },
};

function erstelleEinstellungen({ datei, verschluessle, entschluessle }) {
  let stand = { ...STANDARD, benachrichtigungen: { ...STANDARD.benachrichtigungen } };
  let vtGeheim = null;
  try {
    const roh = JSON.parse(fs.readFileSync(datei, 'utf8'));
    stand = uebernimm(stand, roh);
    if (typeof roh.vtGeheim === 'string') vtGeheim = roh.vtGeheim;
  } catch {
    // erste Benutzung oder Datei beschaedigt: Standardwerte
  }

  function uebernimm(ziel, teil) {
    const neu = { ...ziel, benachrichtigungen: { ...ziel.benachrichtigungen } };
    for (const name of ['mitSystemStarten', 'imTrayWeiterlaufen', 'wacheAn']) {
      if (typeof teil?.[name] === 'boolean') neu[name] = teil[name];
    }
    if (teil && 'wacheOrdner' in teil && (teil.wacheOrdner === null || typeof teil.wacheOrdner === 'string')) {
      neu.wacheOrdner = teil.wacheOrdner || null;
    }
    for (const name of Object.keys(STANDARD.benachrichtigungen)) {
      if (typeof teil?.benachrichtigungen?.[name] === 'boolean') neu.benachrichtigungen[name] = teil.benachrichtigungen[name];
    }
    return neu;
  }

  function sichere() {
    fs.mkdirSync(path.dirname(datei), { recursive: true });
    const vorlaeufig = `${datei}.neu`;
    fs.writeFileSync(vorlaeufig, JSON.stringify({ ...stand, vtGeheim }, null, 2));
    fs.renameSync(vorlaeufig, datei);
  }

  return {
    // Was die Oberflaeche sehen darf. Der Schluessel selbst ist nie dabei.
    lese: () => ({ ...stand, benachrichtigungen: { ...stand.benachrichtigungen }, vtHinterlegt: vtGeheim !== null }),
    setze(teil) {
      stand = uebernimm(stand, teil);
      sichere();
      return this.lese();
    },
    setzeVtSchluessel(text) {
      const sauber = String(text ?? '').trim();
      if (!/^[A-Za-z0-9]{32,128}$/.test(sauber)) return { ok: false, grund: 'Das sieht nicht nach einem VirusTotal-Schlüssel aus' };
      const geheim = verschluessle(sauber);
      if (!geheim) return { ok: false, grund: 'Der sichere Speicher des Systems ist nicht verfügbar. Der Schlüssel wurde nicht gespeichert.' };
      vtGeheim = geheim;
      sichere();
      return { ok: true };
    },
    entferneVtSchluessel() {
      vtGeheim = null;
      sichere();
      return { ok: true };
    },
    // Nur fuer den Hauptprozess.
    vtSchluessel() {
      if (!vtGeheim) return null;
      try {
        return entschluessle(vtGeheim) || null;
      } catch {
        return null;
      }
    },
  };
}

module.exports = { erstelleEinstellungen, STANDARD };
