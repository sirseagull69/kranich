'use strict';
const fs = require('node:fs');
const path = require('node:path');

const STANDARD = {
  weg: 'claude', // 'claude' | 'api'
  claudeProgramm: 'claude',
  claudeModell: 'opus',
  apiSchluessel: '',
  apiModell: 'claude-opus-5-5',
  lokalAn: false,
  lokalModell: 'gemma4:26b',
  lokalAdresse: 'http://127.0.0.1:11434',
  lookHinweise: '',
  exportOrdner: '',
  appOrdner: { origami: '', kranich: '', albatros: '', schreiben: '' },
};

class Einstellungen {
  constructor(datei) {
    this.datei = datei;
    this.werte = { ...STANDARD };
    try {
      const gelesen = JSON.parse(fs.readFileSync(datei, 'utf8'));
      this.werte = { ...STANDARD, ...gelesen, appOrdner: { ...STANDARD.appOrdner, ...(gelesen.appOrdner || {}) } };
    } catch { /* erste Benutzung */ }
  }

  alle() { return { ...this.werte, appOrdner: { ...this.werte.appOrdner } }; }

  // Für die Oberfläche: den Schlüssel nie im Klartext zurückgeben.
  fuerOberflaeche() {
    const w = this.alle();
    w.apiSchluesselGesetzt = Boolean(w.apiSchluessel);
    delete w.apiSchluessel;
    return w;
  }

  setze(neu = {}) {
    for (const [k, v] of Object.entries(neu)) {
      if (!(k in STANDARD)) continue;
      if (k === 'apiSchluessel' && !v) continue; // leer lassen heißt: behalten
      if (k === 'appOrdner') this.werte.appOrdner = { ...this.werte.appOrdner, ...v };
      else this.werte[k] = typeof STANDARD[k] === 'boolean' ? Boolean(v) : v;
    }
    fs.mkdirSync(path.dirname(this.datei), { recursive: true });
    fs.writeFileSync(this.datei, JSON.stringify(this.werte, null, 2), 'utf8');
    return this.fuerOberflaeche();
  }
}

module.exports = { Einstellungen, STANDARD };
