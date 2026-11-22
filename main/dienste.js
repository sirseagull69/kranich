'use strict';
// Alles, was die Oberflaeche von Kranich verlangen kann. Bewusst ohne
// Electron, damit es sich ohne Fenster testen laesst. main.js haengt diese
// Dienste nur noch an Fenster, Tray und Benachrichtigungen.

const fs = require('node:fs');
const path = require('node:path');

function erstelleDienste({ kern, einstellungen, plattform, heimOrdner, datenOrdner, melde = () => {}, defender = null, fetch }) {
  const autostartDatei = path.join(datenOrdner, 'autostart-bekannt.json');
  let wache = null;
  const downloads = []; // die letzten 50 Dateien der Download-Wache
  let laufenderScan = null;

  const neuerVt = () => new kern.VirusTotal({ schluessel: einstellungen.vtSchluessel(), fetch });
  let vt = neuerVt();

  const wacheOrdner = () => einstellungen.lese().wacheOrdner || path.join(heimOrdner, 'Downloads');
  const windows = plattform === 'win32';

  function leseBekannt() {
    try {
      return JSON.parse(fs.readFileSync(autostartDatei, 'utf8'));
    } catch {
      return null;
    }
  }
  function sichereBekannt(liste) {
    fs.mkdirSync(datenOrdner, { recursive: true });
    fs.writeFileSync(autostartDatei, JSON.stringify(liste));
  }

  const dienste = {
    // --- Lage -------------------------------------------------------------
    async lage() {
      if (!defender) {
        return { verfuegbar: false, status: null, funde: [], ampel: { stufe: 'unbekannt', gruende: ['Auf diesem System kann Kranich den Schutz noch nicht auslesen'] }, fehler: [] };
      }
      return { verfuegbar: true, ...(await defender.lage()) };
    },

    // --- Scans ------------------------------------------------------------
    async scanPfad(pfad) {
      if (laufenderScan) return { ok: false, grund: 'Es läuft schon ein Scan' };
      if (typeof pfad !== 'string' || !path.isAbsolute(pfad)) return { ok: false, grund: 'Bitte eine Datei oder einen Ordner auswählen' };
      laufenderScan = new AbortController();
      try {
        const ergebnis = await kern.scanne(pfad, {
          vt,
          signal: laufenderScan.signal,
          beiFortschritt: (f) => melde({ art: 'scan-fortschritt', ...f }),
        });
        melde({ art: 'scan-fertig', zusammenfassung: ergebnis.zusammenfassung, abgebrochen: ergebnis.abgebrochen });
        return { ok: true, ...ergebnis, vtLimit: vt.limitErreicht };
      } finally {
        laufenderScan = null;
      }
    },
    scanAbbrechen() {
      laufenderScan?.abort();
      return { ok: true };
    },
    async schutzScan(art) {
      if (!defender) return { ok: false, grund: 'Auf diesem System gibt es keinen Schutz, den Kranich steuern kann' };
      if (art !== 'schnell' && art !== 'voll') return { ok: false, grund: 'Unbekannte Scan-Art' };
      const ergebnis = await defender.scan(art);
      melde({ art: 'schutzscan-fertig', scan: art, neueFunde: ergebnis.neueFunde.length });
      return { ok: true, ...ergebnis };
    },

    // --- Autostart --------------------------------------------------------
    async autostart() {
      if (!windows) return { verfuegbar: false, eintraege: [], fehler: [] };
      const { eintraege, fehler } = await kern.leseAutostart();
      const bekannt = leseBekannt();
      // Erster Lauf ohne Fehler: alles Vorhandene gilt als bekannt.
      if (!bekannt && !fehler.length) sichereBekannt(eintraege);
      const diff = bekannt ? kern.vergleiche(bekannt, eintraege) : { neu: [], geaendert: [] };
      const marke = (e) => `${e.herkunft}|${e.ort}|${e.name}`.toLowerCase();
      const neu = new Set(diff.neu.map(marke));
      const geaendert = new Map(diff.geaendert.map((e) => [marke(e), e.befehlVorher]));
      return {
        verfuegbar: true,
        fehler,
        eintraege: eintraege.map((e) => ({ ...e, schluessel: marke(e), neu: neu.has(marke(e)), befehlVorher: geaendert.get(marke(e)) ?? null })),
      };
    },
    async autostartAlsBekannt(schluessel) {
      if (!windows) return { ok: false };
      const { eintraege, fehler } = await kern.leseAutostart();
      if (fehler.length) return { ok: false, grund: 'Der Autostart konnte nicht vollständig gelesen werden' };
      const bekannt = leseBekannt() ?? [];
      const marke = (e) => `${e.herkunft}|${e.ort}|${e.name}`.toLowerCase();
      const ziel = eintraege.find((e) => marke(e) === schluessel);
      if (!ziel) return { ok: false, grund: 'Diesen Eintrag gibt es nicht mehr' };
      sichereBekannt([...bekannt.filter((e) => marke(e) !== schluessel), ziel]);
      return { ok: true };
    },

    // --- Download-Wache ---------------------------------------------------
    wacheStart() {
      if (wache) return { ok: true, ordner: wache.ordner };
      const ordner = wacheOrdner();
      if (!fs.existsSync(ordner)) return { ok: false, grund: `Den Ordner ${ordner} gibt es nicht` };
      wache = new kern.DownloadWache(ordner);
      wache.on('datei', async (pfad) => {
        const ergebnis = await kern.pruefeDatei(pfad, { vt });
        const eintrag = { ...ergebnis, zeit: new Date().toISOString() };
        downloads.unshift(eintrag);
        downloads.length = Math.min(downloads.length, 50);
        melde({ art: 'download', eintrag });
      });
      wache.on('fehler', (f) => melde({ art: 'wache-fehler', meldung: f.message }));
      wache.start();
      return { ok: true, ordner };
    },
    wacheStopp() {
      wache?.stopp();
      wache = null;
      return { ok: true };
    },
    wacheStatus: () => ({ an: Boolean(wache), ordner: wacheOrdner(), dateien: [...downloads] }),

    // --- Einstellungen ----------------------------------------------------
    einstellungenLesen: () => einstellungen.lese(),
    einstellungenSetzen(teil) {
      const vorher = einstellungen.lese();
      const neu = einstellungen.setze(teil);
      if (vorher.wacheOrdner !== neu.wacheOrdner && wache) {
        dienste.wacheStopp();
        dienste.wacheStart();
      }
      if (vorher.wacheAn !== neu.wacheAn) neu.wacheAn ? dienste.wacheStart() : dienste.wacheStopp();
      melde({ art: 'einstellungen', einstellungen: neu });
      return neu;
    },
    vtSchluesselSetzen(text) {
      const ergebnis = einstellungen.setzeVtSchluessel(text);
      if (ergebnis.ok) vt = neuerVt();
      return ergebnis;
    },
    vtSchluesselEntfernen() {
      einstellungen.entferneVtSchluessel();
      vt = neuerVt();
      return { ok: true };
    },

    // --- Start und Ende ---------------------------------------------------
    starte() {
      if (einstellungen.lese().wacheAn) dienste.wacheStart();
    },
    beende() {
      dienste.wacheStopp();
      laufenderScan?.abort();
    },
  };
  return dienste;
}

// Diese Namen darf die Oberflaeche aufrufen. Alles andere bleibt im Hauptprozess.
const FUER_OBERFLAECHE = [
  'lage', 'scanPfad', 'scanAbbrechen', 'schutzScan', 'autostart', 'autostartAlsBekannt',
  'wacheStart', 'wacheStopp', 'wacheStatus', 'einstellungenLesen', 'einstellungenSetzen',
  'vtSchluesselSetzen', 'vtSchluesselEntfernen',
];

module.exports = { erstelleDienste, FUER_OBERFLAECHE };
