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
    const d = { id: crypto.randomUUID().slice(0, 18), name: String(name).slice(0, 120), html: String(html), kopf: String(extra.kopf || ''), fuss: String(extra.fuss || ''), seitenzahlen: Boolean(extra.seitenzahlen), kommentare: kommentareSauber(extra.kommentare), ...(extra.aenderungen && Object.keys(extra.aenderungen).length ? { aenderungen: extra.aenderungen } : {}), erstellt: new Date().toISOString(), geaendert: new Date().toISOString() };
    fs.writeFileSync(this.pfad(d.id), JSON.stringify(d), 'utf8');
    return d;
  }
  lesen(id) { return JSON.parse(fs.readFileSync(this.pfad(id), 'utf8')); }
  speichern(d) {
    const alt = (() => { try { return this.lesen(d.id); } catch { return {}; } })();
    const neu = { ...alt, id: d.id, name: String(d.name || 'Dokument').slice(0, 120), html: String(d.html || ''), geaendert: new Date().toISOString() };
    for (const k of ['kopf', 'fuss']) if (k in d) neu[k] = String(d[k] || '').slice(0, 300);
    if ('seitenzahlen' in d) neu.seitenzahlen = Boolean(d.seitenzahlen);
    if ('kommentare' in d) neu.kommentare = kommentareSauber(d.kommentare);
    if ('verfolgen' in d) neu.verfolgen = Boolean(d.verfolgen);
    if (d.markerFertig) delete neu.aenderungen;
    fs.writeFileSync(this.pfad(d.id), JSON.stringify(neu), 'utf8');
    return { ok: true, geaendert: neu.geaendert };
  }
  loeschen(id) { fs.rmSync(this.pfad(id), { force: true }); return true; }
}
function kommentareSauber(liste) {
  const t = (v, n) => String(v ?? '').slice(0, n);
  return (Array.isArray(liste) ? liste : []).slice(0, 500).filter((k) => /^[\w-]{1,40}$/.test(String(k?.id || ''))).map((k) => ({
    id: String(k.id), autor: t(k.autor, 60), text: t(k.text, 4000), zeit: t(k.zeit, 40), erledigt: Boolean(k.erledigt),
    antworten: (Array.isArray(k.antworten) ? k.antworten : []).slice(0, 50).map((a) => ({ autor: t(a?.autor, 60), text: t(a?.text, 4000), zeit: t(a?.zeit, 40) })),
  }));
}
module.exports = { Dokumente, kommentareSauber };
