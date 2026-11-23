'use strict';
// Albatros – liest die Excel-Makros (VBA) aus .xlsm-Dateien, nur als Text.
// Nichts davon wird ausgeführt: Der Helfer übersetzt sie in Albatros-Makros.
// Formate: ZIP → xl/vbaProject.bin (Compound File) → VBA/dir + Modul-Streams (MS-OVBA-komprimiert).
const zlib = require('node:zlib');

// ---------- ZIP: eine Datei herausholen ----------
function zipEintrag(buf, gesucht) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return null;
  const anzahl = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < anzahl && p + 46 <= buf.length; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) return null;
    const methode = buf.readUInt16LE(p + 10); const groesse = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), kl = buf.readUInt16LE(p + 32); const lokal = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl);
    if (name.toLowerCase() === gesucht.toLowerCase()) {
      const start = lokal + 30 + buf.readUInt16LE(lokal + 26) + buf.readUInt16LE(lokal + 28);
      const daten = buf.subarray(start, start + groesse);
      if (methode === 0) return Buffer.from(daten);
      if (methode === 8) return zlib.inflateRawSync(daten);
      return null;
    }
    p += 46 + nl + el + kl;
  }
  return null;
}

// ---------- Compound File (OLE) ----------
function cfb(buf) {
  if (buf.readUInt32LE(0) !== 0xe011cfd0) throw new Error('Kein VBA-Projekt.');
  const gs = 1 << buf.readUInt16LE(0x1e); const mgs = 1 << buf.readUInt16LE(0x20);
  const grenze = buf.readUInt32LE(0x38);
  const sektor = (id) => buf.subarray((id + 1) * gs, (id + 2) * gs);
  const ENDE = 0xfffffffa;
  // FAT-Sektoren aus der DIFAT
  const fatSektoren = [];
  for (let i = 0; i < 109; i++) { const id = buf.readUInt32LE(0x4c + i * 4); if (id < ENDE) fatSektoren.push(id); }
  let difat = buf.readUInt32LE(0x44); let schutz = 0;
  while (difat < ENDE && schutz++ < 10000) { const s = sektor(difat); for (let i = 0; i < gs / 4 - 1; i++) { const id = s.readUInt32LE(i * 4); if (id < ENDE) fatSektoren.push(id); } difat = s.readUInt32LE(gs - 4); }
  const fat = []; for (const id of fatSektoren) { const s = sektor(id); for (let i = 0; i < gs / 4; i++) fat.push(s.readUInt32LE(i * 4)); }
  const kette = (start, tabelle) => { const aus = []; let id = start; let n = 0; while (id < ENDE && n++ < 1e6) { aus.push(id); id = tabelle[id]; } return aus; };
  const lies = (start) => Buffer.concat(kette(start, fat).map(sektor));
  const verz = lies(buf.readUInt32LE(0x30));
  const eintraege = [];
  for (let o = 0; o + 128 <= verz.length; o += 128) {
    const nl = verz.readUInt16LE(o + 0x40);
    eintraege.push({ name: verz.toString('utf16le', o, o + Math.max(0, nl - 2)), typ: verz[o + 0x42], links: verz.readUInt32LE(o + 0x44), rechts: verz.readUInt32LE(o + 0x48), kind: verz.readUInt32LE(o + 0x4c), start: verz.readUInt32LE(o + 0x74), groesse: verz.readUInt32LE(o + 0x78) });
  }
  const wurzel = eintraege[0];
  const miniStrom = lies(wurzel.start);
  const minifat = []; { const m = lies(buf.readUInt32LE(0x3c)); for (let i = 0; i + 4 <= m.length; i += 4) minifat.push(m.readUInt32LE(i)); }
  const strom = (e) => {
    if (e.groesse < grenze) return Buffer.concat(kette(e.start, minifat).map((id) => miniStrom.subarray(id * mgs, (id + 1) * mgs))).subarray(0, e.groesse);
    return lies(e.start).subarray(0, e.groesse);
  };
  // Pfade aufbauen
  const pfade = new Map();
  const geh = (id, vor, tiefe = 0) => {
    if (id >= ENDE || !eintraege[id] || tiefe > 64) return;
    const e = eintraege[id];
    const pfad = vor ? `${vor}/${e.name}` : e.name;
    pfade.set(pfad.toLowerCase(), e);
    geh(e.links, vor, tiefe + 1); geh(e.rechts, vor, tiefe + 1);
    if (e.typ === 1) geh(e.kind, pfad, tiefe + 1);
  };
  geh(wurzel.kind, '');
  return { hol: (pfad) => { const e = pfade.get(pfad.toLowerCase()); return e ? strom(e) : null; }, pfade: [...pfade.keys()] };
}

// ---------- MS-OVBA-Dekompression ----------
function entpacke(buf, ab = 0) {
  if (buf[ab] !== 1) throw new Error('VBA-Daten unbekannt.');
  const aus = []; let p = ab + 1;
  while (p + 2 <= buf.length) {
    const kopf = buf.readUInt16LE(p); p += 2;
    const groesse = (kopf & 0x0fff) + 3; const gepackt = (kopf >> 15) & 1; const ende = Math.min(buf.length, p - 2 + groesse);
    const startAus = aus.length;
    if (!gepackt) { for (let i = 0; i < 4096 && p < buf.length; i++) aus.push(buf[p++]); continue; }
    while (p < ende) {
      const flags = buf[p++];
      for (let bit = 0; bit < 8 && p < ende; bit++) {
        if (!((flags >> bit) & 1)) { aus.push(buf[p++]); continue; }
        const token = buf.readUInt16LE(p); p += 2;
        const diff = aus.length - startAus;
        const bits = Math.max(Math.ceil(Math.log2(diff || 1)), 4);
        const laengenMaske = 0xffff >> bits;
        const laenge = (token & laengenMaske) + 3; const abstand = (token >> (16 - bits)) + 1;
        for (let i = 0; i < laenge; i++) aus.push(aus[aus.length - abstand]);
      }
    }
    p = ende;
  }
  return Buffer.from(aus);
}

// ---------- Module lesen ----------
function moduleLesen(vbaBin) {
  const c = cfb(vbaBin);
  const dir = c.hol('VBA/dir'); if (!dir) return [];
  const d = entpacke(dir);
  let p = 0; let seite = 1252; const liste = []; let akt = null;
  while (p + 6 <= d.length) {
    const id = d.readUInt16LE(p); let groesse = d.readUInt32LE(p + 2); p += 6;
    if (id === 0x0009) groesse = 6; // PROJECTVERSION: Größe steht falsch drin
    const daten = d.subarray(p, p + groesse); p += groesse;
    if (id === 0x0003 && daten.length >= 2) seite = daten.readUInt16LE(0);
    else if (id === 0x0019) { akt = { name: dekodiere(daten, seite), strom: null, ab: 0 }; liste.push(akt); }
    else if (id === 0x001a && akt) akt.strom = dekodiere(daten, seite);
    else if (id === 0x0031 && akt && daten.length >= 4) akt.ab = daten.readUInt32LE(0);
    else if (id === 0x0021 && akt) akt.art = 'modul';
    else if (id === 0x0022 && akt) akt.art = 'klasse';
  }
  const aus = [];
  for (const m of liste) {
    const s = c.hol(`VBA/${m.strom || m.name}`); if (!s) continue;
    let code = '';
    try { code = dekodiere(entpacke(s, m.ab), seite); } catch { continue; }
    const sauber = code.replace(/\r\n?/g, '\n').split('\n').filter((z) => !/^Attribute VB_/.test(z)).join('\n').trim();
    if (sauber && /\b(Sub|Function|Property)\b/i.test(sauber)) aus.push({ name: m.name, code: sauber });
  }
  return aus;
}
function dekodiere(buf, seite) {
  const namen = { 1252: 'windows-1252', 1250: 'windows-1250', 65001: 'utf-8', 437: 'ibm437', 850: 'ibm850' };
  try { return new TextDecoder(namen[seite] || 'windows-1252').decode(buf); } catch { return buf.toString('latin1'); }
}

// Aus einer .xlsm-Datei (Buffer)
function ausXlsm(buf) {
  const bin = zipEintrag(buf, 'xl/vbaProject.bin');
  if (!bin) return [];
  try { return moduleLesen(bin); } catch { return []; }
}

module.exports = { ausXlsm, moduleLesen, entpacke, cfb, zipEintrag };
