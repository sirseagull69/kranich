'use strict';
// Alles, was die Oberflaeche von Kranich verlangen kann. Bewusst ohne
// Electron, damit es sich ohne Fenster testen laesst. main.js haengt diese
// Dienste nur noch an Fenster, Tray und Benachrichtigungen.

const fs = require('node:fs');
const path = require('node:path');

function erstelleDienste({ kern, einstellungen, plattform, heimOrdner, datenOrdner, melde = () => {}, defender = null, fetch, rechnerName = 'Dieser Rechner', version = '0', leseAutostart = null }) {
  const autostartDatei = path.join(datenOrdner, 'autostart-bekannt.json');
  const verlaufDatei = path.join(datenOrdner, 'verlauf.json');
  const ignoriertDatei = path.join(datenOrdner, 'ignoriert.json');
  const quarOrdner = path.join(datenOrdner, 'quarantaene');
  const quarDatei = path.join(quarOrdner, 'liste.json');
  const autostartLesen = leseAutostart ?? (() => kern.leseAutostart());

  const leseJson = (datei, ersatz) => {
    try {
      return JSON.parse(fs.readFileSync(datei, 'utf8'));
    } catch {
      return ersatz;
    }
  };
  const schreibeJson = (datei, wert) => {
    fs.mkdirSync(path.dirname(datei), { recursive: true });
    const vorlaeufig = `${datei}.neu`;
    fs.writeFileSync(vorlaeufig, JSON.stringify(wert));
    fs.renameSync(vorlaeufig, datei);
  };

  // Verlauf: was Kranich auf diesem Geraet erlebt hat (die letzten 500).
  let verlauf = leseJson(verlaufDatei, []);
  function notiere(art, text) {
    const eintrag = { zeit: new Date().toISOString(), art, text };
    verlauf = [eintrag, ...verlauf].slice(0, 500);
    schreibeJson(verlaufDatei, verlauf);
    melde({ art: 'verlauf', eintrag });
  }
  let gemeldeteFunde = null; // Kennungen der Funde, die schon im Verlauf stehen
  const fundKennung = (f) => f.id || `${f.threatId}|${f.zeit}`;
  let wache = null;
  const downloads = []; // die letzten 50 Dateien der Download-Wache
  let laufenderScan = null;
  let schutzScanLaeuft = null;
  const autostartGemeldet = new Set();

  const neuerVt = () => new kern.VirusTotal({ schluessel: einstellungen.vtSchluessel(), fetch });
  let vt = neuerVt();

  const wacheOrdner = () => einstellungen.lese().wacheOrdner || path.join(heimOrdner, 'Downloads');
  const windows = plattform === 'win32' || Boolean(leseAutostart);

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
      const lage = await defender.lage();
      const ignoriert = new Set(leseJson(ignoriertDatei, []));
      const funde = lage.funde.map((f) => ({ ...f, kennung: fundKennung(f), ignoriert: ignoriert.has(fundKennung(f)) }));
      // Neue Funde einmal im Verlauf festhalten. Beim allerersten Blick
      // gilt alles Vorhandene als schon bekannt.
      const bekannt = gemeldeteFunde ?? new Set(leseJson(path.join(datenOrdner, 'funde-gesehen.json'), null) ?? funde.map((f) => f.kennung));
      for (const f of funde) {
        if (bekannt.has(f.kennung)) continue;
        bekannt.add(f.kennung);
        const datei = f.pfade[0] ? path.win32.basename(f.pfade[0]) : f.name;
        notiere('fund', f.offen ? `„${datei}“ wartet auf deine Entscheidung.` : `„${datei}“ gestoppt.`);
      }
      gemeldeteFunde = bekannt;
      schreibeJson(path.join(datenOrdner, 'funde-gesehen.json'), [...bekannt].slice(-2000));
      return { verfuegbar: true, ...lage, funde };
    },
    fundIgnorieren(kennung) {
      if (typeof kennung !== 'string' || !kennung) return { ok: false };
      const liste = new Set(leseJson(ignoriertDatei, []));
      liste.add(kennung);
      schreibeJson(ignoriertDatei, [...liste].slice(-2000));
      return { ok: true };
    },
    info: () => ({ plattform, name: einstellungen.lese().geraeteName || rechnerName, rechnerName, version, schutzLesbar: Boolean(defender), autostartLesbar: windows }),
    verlauf: () => [...verlauf],

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
        if (!ergebnis.abgebrochen) {
          const z = ergebnis.zusammenfassung;
          const auffaellig = z.schaedlich + z.verdaechtig;
          notiere('scan', `${ergebnis.ergebnisse.length} Dateien geprüft, ${auffaellig ? auffaellig + ' auffällig' : 'nichts Auffälliges'}.`);
        }
        return { ok: true, ...ergebnis, vtLimit: vt.limitErreicht };
      } finally {
        laufenderScan = null;
      }
    },
    scanAbbrechen() {
      laufenderScan?.abort();
      return { ok: true };
    },
    schutzScanStatus: () => ({ laeuft: schutzScanLaeuft }),
    async schutzScan(art) {
      if (!defender) return { ok: false, grund: 'Auf diesem System gibt es keinen Schutz, den Kranich steuern kann' };
      if (art !== 'schnell' && art !== 'voll') return { ok: false, grund: 'Unbekannte Scan-Art' };
      if (schutzScanLaeuft) return { ok: false, grund: 'Es läuft schon ein Scan' };
      schutzScanLaeuft = art;
      let ergebnis;
      try {
        ergebnis = await defender.scan(art);
      } finally {
        schutzScanLaeuft = null;
      }
      const n = ergebnis.neueFunde.length;
      notiere('scan', `${art === 'voll' ? 'Vollscan' : 'Schnellscan'} fertig, ${n ? (n === 1 ? '1 Fund' : n + ' Funde') : 'nichts gefunden'}.`);
      melde({ art: 'schutzscan-fertig', scan: art, neueFunde: n });
      return { ok: true, ...ergebnis };
    },

    // --- Autostart --------------------------------------------------------
    async autostart() {
      if (!windows) return { verfuegbar: false, eintraege: [], fehler: [] };
      const { eintraege, fehler } = await autostartLesen();
      const bekannt = leseBekannt();
      // Erster Lauf ohne Fehler: alles Vorhandene gilt als bekannt.
      if (!bekannt && !fehler.length) sichereBekannt(eintraege);
      const diff = bekannt ? kern.vergleiche(bekannt, eintraege) : { neu: [], geaendert: [] };
      const marke = (e) => `${e.herkunft}|${e.ort}|${e.name}`.toLowerCase();
      const neu = new Set(diff.neu.map(marke));
      for (const e of diff.neu) {
        if (autostartGemeldet.has(marke(e))) continue;
        autostartGemeldet.add(marke(e));
        notiere('warn', `Neuer Autostart-Eintrag „${e.name}“.`);
      }
      const geaendert = new Map(diff.geaendert.map((e) => [marke(e), e.befehlVorher]));
      return {
        verfuegbar: true,
        fehler,
        eintraege: eintraege.map((e) => ({ ...e, schluessel: marke(e), neu: neu.has(marke(e)), befehlVorher: geaendert.get(marke(e)) ?? null })),
      };
    },
    async autostartAlsBekannt(schluessel) {
      if (!windows) return { ok: false };
      const { eintraege, fehler } = await autostartLesen();
      if (fehler.length) return { ok: false, grund: 'Der Autostart konnte nicht vollständig gelesen werden' };
      const bekannt = leseBekannt() ?? [];
      const marke = (e) => `${e.herkunft}|${e.ort}|${e.name}`.toLowerCase();
      const ziel = eintraege.find((e) => marke(e) === schluessel);
      if (!ziel) return { ok: false, grund: 'Diesen Eintrag gibt es nicht mehr' };
      sichereBekannt([...bekannt.filter((e) => marke(e) !== schluessel), ziel]);
      return { ok: true };
    },

    // --- Quarantaene ------------------------------------------------------
    // Kranichs eigene Quarantaene: die Datei wird in den Datenordner von
    // Kranich verschoben und bekommt eine Endung, mit der sie nicht starten
    // kann. Nur auf ausdruecklichen Klick, nie von allein.
    quarantaene: () => leseJson(quarDatei, []),
    async quarantaeneVerschieben(pfad, grund) {
      if (typeof pfad !== 'string' || !path.isAbsolute(pfad)) return { ok: false, grund: 'Kein gültiger Pfad' };
      let info;
      try {
        info = await fs.promises.lstat(pfad);
      } catch {
        return { ok: false, grund: 'Die Datei gibt es nicht mehr' };
      }
      if (!info.isFile()) return { ok: false, grund: 'Nur einzelne Dateien können in Quarantäne' };
      const id = `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const ziel = path.join(quarOrdner, `${id}.kranich`);
      fs.mkdirSync(quarOrdner, { recursive: true });
      try {
        await verschiebe(pfad, ziel);
      } catch (fehler) {
        return { ok: false, grund: `Die Datei ließ sich nicht verschieben (${fehler.code ?? fehler.message})` };
      }
      const eintrag = { id, name: path.basename(pfad), ursprung: pfad, grund: String(grund ?? '').slice(0, 200), zeit: new Date().toISOString() };
      schreibeJson(quarDatei, [eintrag, ...leseJson(quarDatei, [])]);
      notiere('quar', `„${eintrag.name}“ in Quarantäne verschoben.`);
      return { ok: true, eintrag };
    },
    async quarantaeneWiederherstellen(id) {
      const liste = leseJson(quarDatei, []);
      const eintrag = liste.find((e) => e.id === id);
      if (!eintrag) return { ok: false, grund: 'Diesen Eintrag gibt es nicht mehr' };
      if (fs.existsSync(eintrag.ursprung)) return { ok: false, grund: 'Am alten Ort liegt inzwischen eine andere Datei mit diesem Namen' };
      try {
        fs.mkdirSync(path.dirname(eintrag.ursprung), { recursive: true });
        await verschiebe(path.join(quarOrdner, `${eintrag.id}.kranich`), eintrag.ursprung);
      } catch (fehler) {
        return { ok: false, grund: `Wiederherstellen hat nicht geklappt (${fehler.code ?? fehler.message})` };
      }
      schreibeJson(quarDatei, liste.filter((e) => e.id !== id));
      notiere('quar', `„${eintrag.name}“ wiederhergestellt.`);
      return { ok: true };
    },
    async quarantaeneLoeschen(id) {
      const liste = leseJson(quarDatei, []);
      const eintrag = liste.find((e) => e.id === id);
      if (!eintrag) return { ok: false, grund: 'Diesen Eintrag gibt es nicht mehr' };
      await fs.promises.rm(path.join(quarOrdner, `${eintrag.id}.kranich`), { force: true });
      schreibeJson(quarDatei, liste.filter((e) => e.id !== id));
      notiere('quar', `„${eintrag.name}“ endgültig gelöscht.`);
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
        if (ergebnis.urteil === 'schaedlich') notiere('fund', `Download „${ergebnis.name}“ ist schädlich.`);
        if (ergebnis.urteil === 'verdaechtig') notiere('warn', `Download „${ergebnis.name}“ sieht verdächtig aus.`);
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

// Verschiebt eine Datei, auch ueber Laufwerke hinweg.
async function verschiebe(von, nach) {
  try {
    await fs.promises.rename(von, nach);
  } catch (fehler) {
    if (fehler.code !== 'EXDEV') throw fehler;
    await fs.promises.copyFile(von, nach, fs.constants.COPYFILE_EXCL);
    await fs.promises.unlink(von);
  }
}

// Diese Namen darf die Oberflaeche aufrufen. Alles andere bleibt im Hauptprozess.
const FUER_OBERFLAECHE = [
  'lage', 'scanPfad', 'scanAbbrechen', 'schutzScan', 'autostart', 'autostartAlsBekannt',
  'wacheStart', 'wacheStopp', 'wacheStatus', 'einstellungenLesen', 'einstellungenSetzen',
  'vtSchluesselSetzen', 'vtSchluesselEntfernen',
  'info', 'verlauf', 'fundIgnorieren', 'schutzScanStatus',
  'quarantaene', 'quarantaeneVerschieben', 'quarantaeneWiederherstellen', 'quarantaeneLoeschen',
];

module.exports = { erstelleDienste, FUER_OBERFLAECHE };
