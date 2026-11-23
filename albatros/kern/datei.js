'use strict';
// Albatros – Dateien: eigene Tabellen (JSON), Excel (.xlsx) und CSV.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
// Fertig gebündelte Excel-Bibliothek (MIT), damit im Installer nichts fehlt
const ExcelJS = require('./fremd/exceljs.min.js');
const F = require('../ui/formeln');
const VBA = require('./vba');

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
      const ad = F.adresse(sp, ze); const v = werte[ad]; const roh = blatt.zellen[ad];
      let t = v === null || v === undefined ? '' : typeof roh === 'string' && !roh.startsWith('=') && F.datumArt(roh) ? roh : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
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

// Zahlenformat aus Excel → Albatros
function formatAusExcel(fmt) {
  if (!fmt || fmt === 'General' || fmt === '@') return fmt === '@' ? 'text' : null;
  if (/€|EUR/.test(fmt)) return 'eur';
  if (/%/.test(fmt)) return 'prozent';
  if (/^\[?h+\]?:mm(:ss)?$/i.test(fmt)) return 'uhrzeit';
  if (/[dt].*[my].*h/i.test(fmt)) return 'datumzeit';
  if (/mmmm\s*y/i.test(fmt) && !/d/i.test(fmt)) return 'monat';
  if (/(d|t).*m{3,}/i.test(fmt)) return 'datumlang';
  if (/[dmy]{2}/i.test(fmt)) return 'datum';
  if (/^#,##0\.00$|^0\.00$/.test(fmt)) return 'zahl';
  if (/^#,##0$/.test(fmt)) return 'ganz';
  return null;
}
const FORMAT_EXCEL = { eur: '#,##0.00 "€"', prozent: '0.0%', datum: 'dd.mm.yyyy', ganz: '#,##0', zahl: '#,##0.00', datumlang: 'd. mmmm yyyy', monat: 'mmmm yyyy', uhrzeit: 'hh:mm', datumzeit: 'dd.mm.yyyy hh:mm', text: '@' };
function listeMerken(b, a, formel) {
  let quelle;
  if (/^".*"$/.test(formel)) quelle = { werte: formel.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean) };
  else quelle = { bereich: formel.replace(/\$/g, '').replace(/^=/, '') };
  const k = JSON.stringify(quelle); b._listen = b._listen || {}; (b._listen[k] = b._listen[k] || []).push(a);
}
// Viele Einzelzellen → wenige Bereiche (spaltenweise)
function zusammenfassen(adressen) {
  const spalten = new Map();
  for (const a of adressen) { const z = F.zerlege(a); if (!spalten.has(z.sp)) spalten.set(z.sp, []); spalten.get(z.sp).push(z.ze); }
  const teile = [];
  for (const [sp, zeilen] of spalten) {
    zeilen.sort((x, y) => x - y); let von = zeilen[0], bis = zeilen[0];
    for (const ze of zeilen.slice(1).concat([Infinity])) { if (ze === bis + 1) { bis = ze; continue; } teile.push(von === bis ? F.adresse(sp, von) : `${F.adresse(sp, von)}:${F.adresse(sp, bis)}`); von = bis = ze; }
  }
  return teile[0] && teile.length === 1 ? teile[0] : teile.join(' ');
}
const OPS = { greaterThan: 'groesser', lessThan: 'kleiner', equal: 'gleich', notEqual: 'ungleich', between: 'zwischen' };
const OPS_ZURUECK = Object.fromEntries(Object.entries(OPS).map(([a, b]) => [b, a]));
const argbZuHex = (c) => (c && c.argb && c.argb.length === 8 ? `#${c.argb.slice(2).toLowerCase()}` : null);
function regelAusExcel(ref, r) {
  const bereich = String(ref || '').split(' ')[0]; if (!/^[A-Z]+\d+(:[A-Z]+\d+)?$/.test(bereich)) return null;
  const farbe = argbZuHex(r.style?.fill?.bgColor) || argbZuHex(r.style?.fill?.fgColor) || '#f8e1a8';
  const zahl = (x) => (x === undefined ? undefined : String(x).replace(/^"|"$/g, '').replace('.', ','));
  if (r.type === 'cellIs' && OPS[r.operator]) return { bereich, art: OPS[r.operator], wert: zahl(r.formulae?.[0]), wert2: zahl(r.formulae?.[1]), farbe };
  if (r.type === 'containsText') return { bereich, art: 'enthaelt', wert: r.text, farbe };
  if (r.type === 'duplicateValues') return { bereich, art: 'doppelt', farbe };
  if (r.type === 'dataBar') return { bereich, art: 'balken', farbe: argbZuHex(r.color) || '#9fd4b2' };
  if (r.type === 'expression' && r.formulae?.[0]) return { bereich, art: 'formel', wert: F.vonExcel(`=${r.formulae[0]}`), farbe };
  return null;
}
function regelNachExcel(rg) {
  const style = { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: `FF${String(rg.farbe || '#f8e1a8').replace('#', '').toUpperCase()}` } } };
  const z = (x) => { const n = F.alsZahl(x); return n !== null ? String(n) : `"${String(x ?? '').replace(/"/g, '""')}"`; };
  if (OPS_ZURUECK[rg.art]) return { type: 'cellIs', operator: OPS_ZURUECK[rg.art], formulae: rg.art === 'zwischen' ? [z(rg.wert), z(rg.wert2)] : [z(rg.wert)], style };
  if (rg.art === 'enthaelt') { const a = rg.bereich.split(':')[0]; return { type: 'containsText', operator: 'containsText', text: rg.wert, formulae: [`NOT(ISERROR(SEARCH("${String(rg.wert).replace(/"/g, '""')}",${a})))`], style }; }
  if (rg.art === 'doppelt') return { type: 'expression', formulae: [`COUNTIF(${absolut(rg.bereich)},${rg.bereich.split(':')[0]})>1`], style };
  if (rg.art === 'leer') return { type: 'expression', formulae: [`LEN(TRIM(${rg.bereich.split(':')[0]}))=0`], style };
  if (rg.art === 'balken') return { type: 'dataBar', minLength: 0, maxLength: 100, cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: `FF${String(rg.farbe || '#9fd4b2').replace('#', '').toUpperCase()}` } };
  if (rg.art === 'formel') return { type: 'expression', formulae: [F.nachExcel(String(rg.wert).startsWith('=') ? rg.wert : `=${rg.wert}`).slice(1)], style };
  return null;
}
const absolut = (b) => b.split(':').map((a) => a.replace(/^([A-Z]+)(\d+)$/, '$$$1$$$2')).join(':');

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
        const art = formatAusExcel(fmt);
        if (art && !(b.formate[a] === 'datum' && art !== 'datum' && /^[dmy]/i.test(fmt))) b.formate[a] = art;

        const farbe = cell.fill?.fgColor?.argb;
        if (cell.fill?.type === 'pattern' && farbe && farbe.length === 8 && farbe !== 'FFFFFFFF') b.farben[a] = `#${farbe.slice(2)}`;
      });
    });
    ws.columns?.forEach((c, i) => { if (c.width) b.breiten[F.nrZuSpalte(i)] = Math.round(c.width * 7.5); });
    // Verbundene Zellen, fixierte Zeilen/Spalten, bedingte Formatierung
    const verb = Object.values(ws._merges || {}).map((m) => m.range || m.model?.range || String(m)).filter((r) => /^[A-Z]+\d+:[A-Z]+\d+$/.test(r));
    if (verb.length) b.verbunden = verb;
    const v = (ws.views || []).find((x) => x.state === 'frozen');
    if (v && (v.xSplit || v.ySplit)) b.fixiert = { sp: v.xSplit || 0, ze: v.ySplit || 0 };
    for (const cf of ws.conditionalFormattings || []) for (const r of cf.rules || []) { const rg = regelAusExcel(cf.ref, r); if (rg) (b.regeln = b.regeln || []).push(rg); }
    // Auswahllisten (auch in leeren Zellen)
    for (const [k, dv] of Object.entries(ws.dataValidations?.model || {})) {
      if (!dv || dv.type !== 'list' || !dv.formulae?.[0]) continue;
      for (const teil of String(k).replace(/^range:/, '').split(' ')) { const r = F.bereich(teil); if (!r) continue; for (let ze = r.ze1; ze <= Math.min(r.ze2, r.ze1 + 20000); ze++) for (let sp = r.sp1; sp <= r.sp2; sp++) listeMerken(b, F.adresse(sp, ze), String(dv.formulae[0])); }
    }
    // Listen zusammenfassen
    if (b._listen) { b.listen = {}; for (const [quelle, adr] of Object.entries(b._listen)) b.listen[zusammenfassen(adr)] = JSON.parse(quelle); delete b._listen; }
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
      const datumArt = !String(roh).startsWith('=') ? F.datumArt(String(roh)) : null;
      if (String(roh).startsWith('=')) cell.value = { formula: F.nachExcel(roh).slice(1), result: w instanceof F.Fehler || Array.isArray(w) ? undefined : w };
      else if (b.formate?.[a] === 'text') cell.value = String(roh);
      else if (typeof w === 'number') cell.value = w;
      else cell.value = String(roh);
      const fmt = b.formate?.[a] || datumArt;
      if (fmt && typeof fmt === 'object' && fmt.eigen) cell.numFmt = String(fmt.eigen).replace(/T/g, 'd').replace(/J/g, 'y');
      else if (FORMAT_EXCEL[fmt]) cell.numFmt = FORMAT_EXCEL[fmt];
      if (b.fett?.[a]) cell.font = { bold: true };
      if (b.farben?.[a]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${b.farben[a].replace('#', '').toUpperCase()}` } };
    }
    for (const [sp, px] of Object.entries(b.breiten || {})) ws.getColumn(F.spalteZuNr(sp) + 1).width = Math.max(6, Math.round(px / 7.5));
    for (const v of b.verbunden || []) { try { ws.mergeCells(v); } catch { /* überlappt */ } }
    if (b.fixiert && (b.fixiert.ze || b.fixiert.sp)) ws.views = [{ state: 'frozen', xSplit: b.fixiert.sp || 0, ySplit: b.fixiert.ze || 0 }];
    for (const rg of b.regeln || []) { const r = regelNachExcel(rg); if (r) ws.addConditionalFormatting({ ref: rg.bereich, rules: [r] }); }
    for (const [bereich, q] of Object.entries(b.listen || {})) {
      const formel = q.werte ? `"${q.werte.join(',').slice(0, 250)}"` : absolut(String(q.bereich).replace(/^.*!/, (x) => x));
      for (const teil of bereich.split(' ')) { const r = F.bereich(teil); if (!r) continue; for (let ze = r.ze1; ze <= Math.min(r.ze2, r.ze1 + 5000); ze++) for (let sp = r.sp1; sp <= r.sp2; sp++) ws.getCell(F.adresse(sp, ze)).dataValidation = { type: 'list', allowBlank: true, formulae: [formel] }; }
    }
  }
  fs.writeFileSync(datei, Buffer.from(await wb.xlsx.writeBuffer()));
}

async function importieren(datei) {
  const endung = path.extname(datei).toLowerCase();
  const name = path.basename(datei, endung);
  if (endung === '.xlsx' || endung === '.xlsm' || endung === '.xltx') {
    const blaetter = await xlsxLesen(datei);
    const vba = endung === '.xlsm' ? VBA.ausXlsm(fs.readFileSync(datei)) : [];
    return { name, blaetter, vba };
  }
  if (endung === '.csv' || endung === '.txt' || endung === '.tsv') return { name, blaetter: csvLesen(fs.readFileSync(datei, 'utf8')) };
  throw new Error('Nur Excel-Dateien (.xlsx, .xlsm) und .csv gehen.');
}

module.exports = { formatAusExcel, regelAusExcel, regelNachExcel, Tabellen, leeresBlatt, csvLesen, csvSchreiben, xlsxLesen, xlsxSchreiben, importieren };
