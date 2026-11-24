'use strict';
// Dokumente der Schwalbe: eine JSON-Datei pro Dokument.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ID = /^[a-z0-9-]{6,40}$/;

class Dokumente {
  constructor(ordner) { this.ordner = ordner; fs.mkdirSync(ordner, { recursive: true }); }
  pfad(id) { if (!ID.test(String(id))) throw new Error('Ungültige Dokument-ID.'); return path.join(this.ordner, `${id}.json`); }
  liste() {
    const aus = [];
    for (const f of fs.readdirSync(this.ordner)) {
      if (!/\.json$/.test(f)) continue;
      try {
        const d = JSON.parse(fs.readFileSync(path.join(this.ordner, f), 'utf8'));
        const text = String(d.html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        aus.push({ id: d.id, name: d.name, geaendert: d.geaendert, woerter: text ? text.split(' ').length : 0, anfang: text.slice(0, 140) });
      } catch { /* kaputt */ }
    }
    return aus.sort((a, b) => String(b.geaendert).localeCompare(String(a.geaendert)));
  }
  neu(name = 'Neues Dokument', html = '<h1>Neues Dokument</h1><p></p>', extra = {}) {
    const d = { id: crypto.randomUUID().slice(0, 18), name: String(name).slice(0, 120), html: String(html), kopf: String(extra.kopf || ''), fuss: String(extra.fuss || ''), seitenzahlen: Boolean(extra.seitenzahlen), erstellt: new Date().toISOString(), geaendert: new Date().toISOString() };
    fs.writeFileSync(this.pfad(d.id), JSON.stringify(d), 'utf8');
    return d;
  }
  lesen(id) { return JSON.parse(fs.readFileSync(this.pfad(id), 'utf8')); }
  speichern(d) {
    const alt = (() => { try { return this.lesen(d.id); } catch { return {}; } })();
    const neu = { ...alt, id: d.id, name: String(d.name || 'Dokument').slice(0, 120), html: String(d.html || ''), geaendert: new Date().toISOString() };
    for (const k of ['kopf', 'fuss']) if (k in d) neu[k] = String(d[k] || '').slice(0, 300);
    if ('seitenzahlen' in d) neu.seitenzahlen = Boolean(d.seitenzahlen);
    fs.writeFileSync(this.pfad(d.id), JSON.stringify(neu), 'utf8');
    return { ok: true, geaendert: neu.geaendert };
  }
  loeschen(id) { fs.rmSync(this.pfad(id), { force: true }); return true; }
}
module.exports = { Dokumente };
