'use strict';
// Die Erkennungsliste: Fingerabdruecke bekannter Schaedlinge.
//
// Zwei Teile:
//   * die mitgelieferte bzw. heruntergeladene Liste (kommt spaeter aus dem
//     Labor, im Moment fast leer)
//   * eigene Eintraege des Benutzers: "das ist schaedlich" und
//     "das war ein Fehlalarm". Die bleiben bei jedem Update erhalten.

const fs = require('node:fs');
const path = require('node:path');

const FINGERABDRUCK = /^[0-9a-f]{64}$/;

class Erkennungsliste {
  constructor(ordner) {
    this._ordner = ordner;
    this._eigeneDatei = path.join(ordner, 'eigene.json');
    this._labor = new Map(); // Fingerabdruck -> Name
    this.stand = null;
    this._eigene = { schaedlich: {}, fehlalarm: {} };
    try {
      const roh = JSON.parse(fs.readFileSync(this._eigeneDatei, 'utf8'));
      this._eigene = { schaedlich: roh.schaedlich || {}, fehlalarm: roh.fehlalarm || {} };
    } catch {
      // noch keine eigenen Eintraege
    }
    this.ladeLabor(path.join(ordner, 'labor.txt'));
  }

  // Format: eine Zeile pro Schaedling, "fingerabdruck" oder "fingerabdruck name".
  // Zeilen mit # sind Kommentare, "# stand: 2026-11-22T06:00:00Z" nennt den Stand.
  ladeLabor(datei) {
    let text;
    try {
      text = fs.readFileSync(datei, 'utf8');
    } catch {
      return false;
    }
    const neu = new Map();
    let stand = null;
    for (const zeile of text.split('\n')) {
      const z = zeile.trim();
      if (!z) continue;
      if (z.startsWith('#')) {
        const m = z.match(/^#\s*stand:\s*(\S+)/i);
        if (m) stand = m[1];
        continue;
      }
      const [abdruck, ...rest] = z.split(/\s+/);
      if (FINGERABDRUCK.test(abdruck.toLowerCase())) neu.set(abdruck.toLowerCase(), rest.join(' '));
    }
    this._labor = neu;
    this.stand = stand;
    return true;
  }

  suche(sha256) {
    const s = String(sha256).toLowerCase();
    if (s in this._eigene.schaedlich) return { name: this._eigene.schaedlich[s].name || '', eigen: true };
    if (this._labor.has(s)) return { name: this._labor.get(s), eigen: false };
    return null;
  }
  istFehlalarm(sha256) {
    return String(sha256).toLowerCase() in this._eigene.fehlalarm;
  }

  _sichere() {
    fs.mkdirSync(this._ordner, { recursive: true });
    const vorlaeufig = `${this._eigeneDatei}.neu`;
    fs.writeFileSync(vorlaeufig, JSON.stringify(this._eigene, null, 2));
    fs.renameSync(vorlaeufig, this._eigeneDatei);
  }
  merke(art, sha256, name) {
    const s = String(sha256 ?? '').toLowerCase();
    if (!FINGERABDRUCK.test(s) || !(art in this._eigene)) return false;
    const andere = art === 'schaedlich' ? 'fehlalarm' : 'schaedlich';
    delete this._eigene[andere][s];
    this._eigene[art][s] = { name: String(name ?? '').slice(0, 120), zeit: new Date().toISOString() };
    this._sichere();
    return true;
  }
  vergiss(sha256) {
    const s = String(sha256 ?? '').toLowerCase();
    delete this._eigene.schaedlich[s];
    delete this._eigene.fehlalarm[s];
    this._sichere();
    return true;
  }
  eigene() {
    const liste = [];
    for (const art of ['schaedlich', 'fehlalarm']) {
      for (const [sha256, e] of Object.entries(this._eigene[art])) liste.push({ art, sha256, name: e.name, zeit: e.zeit });
    }
    return liste.sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));
  }
  zahlen() {
    return { labor: this._labor.size, schaedlich: Object.keys(this._eigene.schaedlich).length, fehlalarm: Object.keys(this._eigene.fehlalarm).length, stand: this.stand };
  }
}

module.exports = { Erkennungsliste };
