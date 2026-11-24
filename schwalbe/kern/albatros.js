'use strict';
// Live-Tabellen aus Albatros: liest die Tabellen direkt aus Albatros' Ordner und rechnet sie aus.
// (kern/albatros-formeln.js ist eine Kopie von albatros/ui/formeln.js – bei Änderungen mitkopieren.)
const fs = require('node:fs');
const path = require('node:path');
const F = require('./albatros-formeln');

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

class Albatros {
  constructor(appData) { this.ordner = path.join(appData, 'Albatros', 'tabellen'); }
  da() { return fs.existsSync(this.ordner); }
  liste() {
    if (!this.da()) return [];
    const aus = [];
    for (const f of fs.readdirSync(this.ordner)) {
      if (!/^[a-z0-9-]{6,40}\.json$/.test(f)) continue;
      try { const t = JSON.parse(fs.readFileSync(path.join(this.ordner, f), 'utf8')); aus.push({ id: t.id, name: t.name, geaendert: t.geaendert, blaetter: (t.blaetter || []).map((b) => b.name) }); } catch { /* kaputt */ }
    }
    return aus.sort((a, b) => String(b.geaendert).localeCompare(String(a.geaendert)));
  }
  lesen(id) {
    if (!/^[a-z0-9-]{6,40}$/.test(String(id))) throw new Error('Ungültige Tabelle.');
    const datei = path.join(this.ordner, `${id}.json`);
    if (!fs.existsSync(datei)) throw new Error('Die Albatros-Tabelle gibt es nicht mehr.');
    return JSON.parse(fs.readFileSync(datei, 'utf8'));
  }
  // Ein Blatt ausrechnen: { name, blatt, zeilen: [[{ text, fett, farbe, rechts }]], stand }
  blatt(id, blattNr = 0) {
    const t = this.lesen(id);
    const b = t.blaetter?.[blattNr] || t.blaetter?.[0];
    if (!b) throw new Error('Das Blatt fehlt.');
    const werte = F.rechneAlles(b, F.mappe(t.blaetter));
    const inBereich = (obj, ad) => { if (!obj) return undefined; if (obj[ad] !== undefined) return obj[ad]; const z = F.zerlege(ad); for (const [k, v] of Object.entries(obj)) { if (!k.includes(':')) continue; for (const teil of k.split(' ')) { const r = F.bereich(teil); if (r && z.sp >= r.sp1 && z.sp <= r.sp2 && z.ze >= r.ze1 && z.ze <= r.ze2) return v; } } return undefined; };
    let maxSp = -1; let maxZe = -1;
    for (const ad of Object.keys(b.zellen || {})) { if (b.zellen[ad] === '' || b.zellen[ad] == null) continue; const z = F.zerlege(ad); if (!z) continue; maxSp = Math.max(maxSp, z.sp); maxZe = Math.max(maxZe, z.ze); }
    const zeilen = [];
    for (let ze = 0; ze <= maxZe; ze++) {
      const reihe = [];
      for (let sp = 0; sp <= maxSp; sp++) {
        const ad = F.adresse(sp, ze); const w = werte[ad];
        const fmt = inBereich(b.formate, ad);
        let text = w instanceof F.Fehler ? String(w.text || w.code || '#FEHLER') : Array.isArray(w) ? '' : (fmt === 'text' && b.zellen[ad] !== undefined ? String(b.zellen[ad]) : F.zeige(w, fmt));
        if (text == null) text = '';
        reihe.push({ text: String(text), fett: Boolean(inBereich(b.fett, ad)), farbe: inBereich(b.farben, ad) || null, rechts: typeof w === 'number' });
      }
      zeilen.push(reihe);
    }
    // leere Zeilen am Anfang/Ende und ganz leere Zeilen in der Mitte bleiben, wie sie sind (Abstände gehören zur Tabelle)
    return { name: t.name, blatt: b.name, zeilen, stand: t.geaendert };
  }
  html(id, blattNr = 0) {
    const r = this.blatt(id, blattNr);
    const kopf = r.zeilen[0]?.every((c) => !c.text || c.fett) && r.zeilen.length > 1;
    const zelle = (c, tag) => `<${tag}${c.rechts ? ' style="text-align:right"' : ''}>${c.fett && tag === 'td' ? `<strong>${esc(c.text)}</strong>` : esc(c.text) || '<br>'}</${tag}>`;
    const rows = r.zeilen.map((z, i) => `<tr>${z.map((c) => zelle(c, kopf && i === 0 ? 'th' : 'td')).join('')}</tr>`).join('');
    return { ...r, html: rows };
  }
}
module.exports = { Albatros };
