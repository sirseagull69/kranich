'use strict';
// Albatros – Dateien: eigene Tabellen (JSON), Excel (.xlsx) und CSV.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
// Fertig gebündelte Excel-Bibliothek (MIT), damit im Installer nichts fehlt
const ExcelJS = require('./fremd/exceljs.min.js');
const F = require('../ui/formeln');

const leeresBlatt = (name = 'Blatt 1') => ({ name, zellen: {}, formate: {}, farben: {}, fett: {}, breiten: {} });

class Tabellen {
  constructor(ordner) { this.ordner = ordner; fs.mkdirSync(ordner, { recursive: true }); }
  datei(id) { if (!/^[a-z0-9-]{6,40}$/.test(id)) throw new Error('Ungültige Tabelle.'); return path.join(this.ordner, `${id}.json`); }
  liste() {
    const aus = [];
    for (const f of fs.readdirSync(this.ordner)) {
      if (!f.endsWith('.json')) continue;
      try {
        const t = JSON.parse(fs.readFileSync(path.join(this.ordner, f), 'utf8'));
        const z = t.blaetter?.[0]?.zellen || {};
        aus.push({ id: t.id, name: t.name, geaendert: t.geaendert, blaetter: t.blaetter?.length || 1, zeilen: Math.max(0, ...Object.keys(z).map((a) => F.zerlege(a)?.ze + 1 || 0)) });
      } catch { /* kaputt */ }
    }
    return aus.sort((a, b) => String(b.geaendert).localeCompare(String(a.geaendert)));
  }
  neu(name = 'Neue Tabelle', blaetter = null) {
    const t = { id: `t${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`, name, erstellt: new Date().toISOString(), geaendert: new Date().toISOString(), blaetter: blaetter || [leeresBlatt()], gespraech: [] };
    this.speichern(t);
    return t;
  }
  lesen(id) { return JSON.parse(fs.readFileSync(this.datei(id), 'utf8')); }
  speichern(t) {
    t.geaendert = new Date().toISOString();
    const ziel = this.datei(t.id);
    fs.writeFileSync(`${ziel}.neu`, JSON.stringify(t));
    fs.renameSync(`${ziel}.neu`, ziel);
    return { ok: true, geaendert: t.geaendert };
  }
  loeschen(id) { fs.rmSync(this.datei(id), { force: true }); return true; }
}

// ---------- CSV ----------
function csvLesen(text) {
  text = text.replace(/^﻿/, '');
  const ersteZeile = text.split(/\r?\n/)[0] || '';
  const trenner = [';', '\t', ','].sort((a, b) => ersteZeile.split(b).length - ersteZeile.split(a).length)[0];
  const zeilen = []; let zeile = []; let feld = ''; let inZ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inZ) { if (c === '"' && text[i + 1] === '"') { feld += '"'; i++; } else if (c === '"') inZ = false; else feld += c; continue; }
    if (c === '"') inZ = true;
    else if (c === trenner) { zeile.push(feld); feld = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; zeile.push(feld); zeilen.push(zeile); zeile = []; feld = ''; }
    else feld += c;
  }
  if (feld || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
  const b = leeresBlatt();
  zeilen.forEach((z, ze) => z.forEach((w, sp) => { if (w.trim() !== '') b.zellen[F.adresse(sp, ze)] = w; }));
  return [b];
}
function csvSchreiben(blatt, blaetter = null) {
  const werte = F.rechneAlles(blatt, blaetter ? F.mappe(blaetter) : null);
  let maxSp = 0, maxZe = 0;
  for (const a of Object.keys(blatt.zellen)) { const z = F.zerlege(a); if (z) { maxSp = Math.max(maxSp, z.sp); maxZe = Math.max(maxZe, z.ze); } }
  const zeilen = [];
  for (let ze = 0; ze <= maxZe; ze++) {
    const z = [];
    for (let sp = 0; sp <= maxSp; sp++) {
      const v = werte[F.adresse(sp, ze)];
      let t = v === null || v === undefined ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
      if (/[;"\n]/.test(t)) t = `"${t.replace(/"/g, '""')}"`;
      z.push(t);
    }
    zeilen.push(z.join(';'));
  }
  return `﻿${zeilen.join('\r\n')}`;
}

// ---------- Excel ----------
// Excel-Tabellen: Tabelle1[[#Headers];[Spalte]] usw. → normale Bezüge mit Blattname
function tabellenSammeln(wb) {
  const t = {};
  wb.eachSheet((ws) => {
    for (const x of (ws.getTables ? ws.getTables() : [])) {
      const m = (x.table || x).model || x.table || x;
      const ref = m.ref || m.tableRef; if (!m.name || !ref) continue;
      const [a, b] = ref.split(':'); const p = F.zerlege(a), q = F.zerlege(b || a); if (!p || !q) continue;
      t[m.name.toLowerCase()] = { blatt: ws.name, sp1: p.sp, ze1: p.ze, sp2: q.sp, ze2: q.ze, spalten: (m.columns || []).map((c) => String(c.name).toLowerCase()), summe: Boolean(m.totalsRow) };
    }
  });
  return t;
}
const quote = (n) => (/^[A-Za-z_][\w.]*$/.test(n) ? n : `'${n.replace(/'/g, "''")}'`);
function strukturBezuege(formel, tab, zeile) {
  if (!/\[/.test(formel)) return formel;
  return formel.replace(/([A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.]*)\[((?:\[[^\]]*\]|[^\]\[])*)\]/g, (ganz, name, innen) => {
    const t = tab[name.toLowerCase()]; if (!t) return ganz;
    const teile = innen.includes('[') ? [...innen.matchAll(/\[([^\]]*)\]/g)].map((x) => x[1]) : innen.split(/[;,]/);
    let bereich = '#data'; let spalten = [];
    for (let teil of teile.map((x) => x.trim())) {
      if (!teil) continue;
      if (teil.startsWith('@')) { bereich = '#this row'; teil = teil.slice(1).replace(/^\[|\]$/g, ''); if (!teil) continue; }
      if (teil.startsWith('#')) { bereich = teil.toLowerCase(); continue; }
      spalten.push(teil.replace(/'(.)/g, '$1').toLowerCase());
    }
    const idx = spalten.map((c) => t.spalten.indexOf(c));
    if (idx.some((i) => i < 0)) return ganz;
    const sp1 = idx.length ? t.sp1 + Math.min(...idx) : t.sp1; const sp2 = idx.length ? t.sp1 + Math.max(...idx) : t.sp2;
    let ze1 = t.ze1 + 1, ze2 = t.summe ? t.ze2 - 1 : t.ze2;
    if (bereich === '#headers') { ze1 = t.ze1; ze2 = t.ze1; }
    else if (bereich === '#all') { ze1 = t.ze1; ze2 = t.ze2; }
    else if (bereich === '#totals') { ze1 = t.ze2; ze2 = t.ze2; }
    else if (bereich === '#this row') { ze1 = zeile; ze2 = zeile; }
    const a = F.adresse(sp1, ze1), b = F.adresse(sp2, ze2);
    return `${quote(t.blatt)}!${a === b ? a : `${a}:${b}`}`;
  });
}

async function xlsxLesen(datei) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fs.readFileSync(datei));
  const tabellen = tabellenSammeln(wb);
  const blaetter = [];
  wb.eachSheet((ws) => {
    const b = leeresBlatt(ws.name);
    ws.eachRow({ includeEmpty: false }, (row, ze) => {
      row.eachCell({ includeEmpty: false }, (cell, sp) => {
        const a = F.adresse(sp - 1, ze - 1);
        const v = cell.value;
        let roh = null;
        if (v && typeof v === 'object' && 'formula' in v) roh = strukturBezuege(F.vonExcel(v.formula), tabellen, ze - 1);
        else if (v && typeof v === 'object' && 'sharedFormula' in v) roh = cell.formula ? strukturBezuege(F.vonExcel(cell.formula), tabellen, ze - 1) : (v.result ?? '');
        else if (v instanceof Date) { roh = String(Math.round((v.getTime() - Date.UTC(1899, 11, 30)) / 86400000)); b.formate[a] = 'datum'; }
        else if (v && typeof v === 'object' && 'richText' in v) roh = v.richText.map((t) => t.text).join('');
        else if (v && typeof v === 'object' && 'text' in v) roh = v.text;
        else if (typeof v === 'number') roh = String(v).replace('.', ',');
        else if (typeof v === 'boolean') roh = v ? 'WAHR' : 'FALSCH';
        else if (v !== null && v !== undefined) roh = String(v);
        if (roh !== null && String(roh).trim() !== '') b.zellen[a] = roh;
        if (cell.font?.bold) b.fett[a] = true;
        const fmt = String(cell.numFmt || '');
        if (/€|EUR/.test(fmt)) b.formate[a] = 'eur';
        else if (/%/.test(fmt)) b.formate[a] = 'prozent';
        else if (/[dmy]{2}/i.test(fmt) && !b.formate[a]) b.formate[a] = 'datum';
        const farbe = cell.fill?.fgColor?.argb;
        if (cell.fill?.type === 'pattern' && farbe && farbe.length === 8 && farbe !== 'FFFFFFFF') b.farben[a] = `#${farbe.slice(2)}`;
      });
    });
    ws.columns?.forEach((c, i) => { if (c.width) b.breiten[F.nrZuSpalte(i)] = Math.round(c.width * 7.5); });
    blaetter.push(b);
  });
  return blaetter.length ? blaetter : [leeresBlatt()];
}

async function xlsxSchreiben(tabelle, datei) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Albatros';
  for (const b of tabelle.blaetter) {
    const ws = wb.addWorksheet(String(b.name || 'Blatt').slice(0, 31).replace(/[\\/?*[\]:]/g, ' '));
    const werte = F.rechneAlles(b, F.mappe(tabelle.blaetter));
    for (const [a, roh] of Object.entries(b.zellen)) {
      const cell = ws.getCell(a);
      const w = werte[a];
      if (String(roh).startsWith('=')) cell.value = { formula: F.nachExcel(roh).slice(1), result: w instanceof F.Fehler ? undefined : w };
      else if (typeof w === 'number') cell.value = w;
      else cell.value = String(roh);
      const fmt = b.formate?.[a];
      if (fmt === 'eur') cell.numFmt = '#,##0.00 "€"';
      else if (fmt === 'prozent') cell.numFmt = '0.0%';
      else if (fmt === 'datum') cell.numFmt = 'dd.mm.yyyy';
      else if (fmt === 'ganz') cell.numFmt = '#,##0';
      if (b.fett?.[a]) cell.font = { bold: true };
      if (b.farben?.[a]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${b.farben[a].replace('#', '').toUpperCase()}` } };
    }
    for (const [sp, px] of Object.entries(b.breiten || {})) ws.getColumn(F.spalteZuNr(sp) + 1).width = Math.max(6, Math.round(px / 7.5));
  }
  fs.writeFileSync(datei, Buffer.from(await wb.xlsx.writeBuffer()));
}

async function importieren(datei) {
  const endung = path.extname(datei).toLowerCase();
  const name = path.basename(datei, endung);
  if (endung === '.xlsx' || endung === '.xlsm' || endung === '.xltx') return { name, blaetter: await xlsxLesen(datei) };
  if (endung === '.csv' || endung === '.txt' || endung === '.tsv') return { name, blaetter: csvLesen(fs.readFileSync(datei, 'utf8')) };
  throw new Error('Nur Excel-Dateien (.xlsx, .xlsm) und .csv gehen.');
}

module.exports = { Tabellen, leeresBlatt, csvLesen, csvSchreiben, xlsxLesen, xlsxSchreiben, importieren };
