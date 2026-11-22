'use strict';
// Nur fuer die Entwicklung. Spielt einen Windows-Schutz und einen Autostart
// vor, damit sich die Oberflaeche auch ohne Windows ansehen laesst:
//
//   KRANICH_SPIELDATEN=fund npm start      (oder: warnung, ruhig)
//
// In der installierten App wird das nie geladen.

module.exports = function spieldaten(lage) {
  const jetzt = Date.now();
  const vor = (minuten) => new Date(jetzt - minuten * 60000).toISOString();
  const status = {
    dienst: true, antivirus: true, echtzeit: lage !== 'warnung', manipulationsschutz: true, modus: 'Normal',
    signaturVersion: '1.413.102.0', signaturAlterTage: lage === 'warnung' ? 5 : 0, signaturStand: vor(120),
    letzterSchnellScan: vor(26 * 60), letzterVollScan: null,
  };
  const funde = lage === 'fund' ? [
    { id: '{A1}', threatId: '2147519003', name: 'Trojan:Win32/Wacatac', schwere: 'schwer', pfade: ['C:\\Users\\Nils\\Downloads\\Rechnung.pdf.exe'], zustand: 'in_quarantaene', offen: false, prozess: null, zeit: vor(20) },
    { id: '{B2}', threatId: '2147700001', name: 'PUA:Win32/Bundler', schwere: 'niedrig', pfade: ['C:\\Users\\Nils\\Downloads\\setup_treiber.msi'], zustand: 'erkannt', offen: true, prozess: null, zeit: vor(32) },
    { id: '{C3}', threatId: '2147519003', name: 'Virus:DOS/EICAR_Test_File', schwere: 'schwer', pfade: ['C:\\Users\\Nils\\Desktop\\probealarm.txt'], zustand: 'erkannt', offen: true, prozess: null, zeit: vor(0.5) },
  ] : [];
  const { bewerte } = require('../kern');
  const defender = {
    lage: async () => ({ status, funde, ampel: bewerte(status, funde), fehler: [] }),
    scan: async (art) => { await new Promise((r) => setTimeout(r, 4000)); return { art, neueFunde: [] }; },
    aktualisiereSignaturen: async () => status,
  };
  const e = (herkunft, name, befehl, ort) => ({ herkunft, name, befehl, ort, benutzer: 'Nils' });
  const eintraege = [
    e('autostart', 'Steam', '"C:\\Program Files (x86)\\Steam\\steam.exe" -silent', 'HKU\\...\\Run'),
    e('autostart', 'Ollama', 'C:\\Users\\Nils\\AppData\\Local\\Programs\\Ollama\\ollama app.exe', 'Startup'),
    e('dienst', 'NVDisplay.ContainerLocalSystem', '"C:\\Windows\\System32\\DriverStore\\NVDisplay.Container.exe" -s', 'NVIDIA Display Container LS'),
    e('aufgabe', 'origami', 'powershell.exe -File C:\\Users\\Nils\\origami\\start-dienst.ps1', '\\'),
  ];
  let aufrufe = 0;
  const leseAutostart = async () => {
    aufrufe++;
    // Ab dem zweiten Blick taucht in der Lage "warnung" ein neuer Eintrag auf.
    const neu = lage === 'warnung' && aufrufe > 1 ? [e('aufgabe', 'UpdaterSvc', 'C:\\Users\\Nils\\AppData\\Local\\Temp\\upd.exe /q', '\\')] : [];
    return { eintraege: [...eintraege, ...neu], fehler: [] };
  };
  return { defender, leseAutostart };
};
