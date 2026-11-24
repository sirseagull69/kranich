'use strict';
const fs = require('node:fs');
const path = require('node:path');

const STANDARD = {
  autorName: '', // gilt für alle Apps (gemeinsam.json)
  initialen: '',
  weg: 'claude', // 'claude' | 'heim' | 'api'
  heimAdresse: '', // z. B. http://mein-pc:4747 – Kranich auf dem Heim-PC
  heimCode: '', // Kopplungscode vom Heim-PC
  heimFreigabe: false, // dieser PC nimmt Aufträge von anderen Geräten an
  heimPort: 4747,
  heimEigenerCode: '',
  claudeProgramm: 'claude',
  claudeModell: 'opus',
  apiSchluessel: '',
  apiModell: 'claude-opus-5-5',
  lokalAn: false,
  lokalModell: 'gemma4:26b',
  lokalAdresse: 'http://127.0.0.1:11434',
  lookHinweise: '',
  standMitgeben: true, // Fotos vom aktuellen Stand der Familie mitschicken, wenn ein Wunsch eine App nennt
  exportOrdner: '',
  appOrdner: { origami: '', kranich: '', albatros: '', schreiben: '' },
};

// Diese Werte teilen sich alle Apps von Ori Office
const GEMEINSAM = ['autorName', 'initialen'];

class Einstellungen {
  constructor(datei, gemeinsamDatei) {
    this.datei = datei; this.gemeinsamDatei = gemeinsamDatei;
    this.werte = { ...STANDARD };
    try {
      const gelesen = JSON.parse(fs.readFileSync(datei, 'utf8'));
      this.werte = { ...STANDARD, ...gelesen, appOrdner: { ...STANDARD.appOrdner, ...(gelesen.appOrdner || {}) } };
    } catch { /* erste Benutzung */ }
    if (gemeinsamDatei) try { const g = JSON.parse(fs.readFileSync(gemeinsamDatei, 'utf8')); for (const k of GEMEINSAM) if (k in g) this.werte[k] = g[k]; } catch { /* noch keine */ }
  }

  alle() { return { ...this.werte, appOrdner: { ...this.werte.appOrdner } }; }

  // Für die Oberfläche: den Schlüssel nie im Klartext zurückgeben.
  fuerOberflaeche() {
    const w = this.alle();
    w.apiSchluesselGesetzt = Boolean(w.apiSchluessel);
    delete w.apiSchluessel;
    w.heimCodeGesetzt = Boolean(w.heimCode);
    delete w.heimCode;
    return w;
  }

  setze(neu = {}) {
    for (const [k, v] of Object.entries(neu)) {
      if (!(k in STANDARD)) continue;
      if ((k === 'apiSchluessel' || k === 'heimCode') && !v) continue; // leer lassen heißt: behalten
      if (k === 'appOrdner') this.werte.appOrdner = { ...this.werte.appOrdner, ...v };
      else this.werte[k] = typeof STANDARD[k] === 'boolean' ? Boolean(v) : typeof STANDARD[k] === 'number' ? (Number(v) || STANDARD[k]) : v;
    }
    fs.mkdirSync(path.dirname(this.datei), { recursive: true });
    fs.writeFileSync(this.datei, JSON.stringify(this.werte, null, 2), 'utf8');
    if (this.gemeinsamDatei) {
      let g = {}; try { g = JSON.parse(fs.readFileSync(this.gemeinsamDatei, 'utf8')); } catch { /* neu */ }
      for (const k of GEMEINSAM) g[k] = this.werte[k];
      fs.mkdirSync(path.dirname(this.gemeinsamDatei), { recursive: true }); fs.writeFileSync(this.gemeinsamDatei, JSON.stringify(g, null, 2), 'utf8');
    }
    return this.fuerOberflaeche();
  }
}

module.exports = { Einstellungen, STANDARD, GEMEINSAM };
