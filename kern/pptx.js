'use strict';
// PowerPoint rein und raus.
// Raus: jede Folie als scharfes Bild + Sprechernotizen (pptxgenjs).
// Rein: Texte, Bilder, Formen und Notizen aus einer .pptx als Kranich-Boards.

const JSZip = require('jszip');

const EMU_PRO_ZOLL = 914400;

async function pptxSchreiben(folien, { titel = 'Präsentation' } = {}) {
  const PptxGenJS = require('pptxgenjs');
  const p = new PptxGenJS();
  const erste = folien[0] || { breite: 1920, hoehe: 1080 };
  const breiteZoll = 13.333;
  const hoeheZoll = Math.round((breiteZoll * erste.hoehe / erste.breite) * 1000) / 1000;
  p.defineLayout({ name: 'KRANICH', width: breiteZoll, height: hoeheZoll });
  p.layout = 'KRANICH';
  p.title = titel;
  p.author = 'Kranich';
  for (const f of folien) {
    const s = p.addSlide();
    s.background = { color: 'FFFFFF' };
    // Bild einpassen, falls ein Board ein anderes Seitenverhältnis hat
    const z = Math.min(breiteZoll / f.breite, hoeheZoll / f.hoehe);
    const w = f.breite * z; const h = f.hoehe * z;
    s.addImage({ data: `image/png;base64,${f.png.toString('base64')}`, x: (breiteZoll - w) / 2, y: (hoeheZoll - h) / 2, w, h });
    // Texte als echte Textfelder darüber
    const zoll = w / f.breite; const pt = zoll * 72;
    for (const t of f.texte || []) {
      const teile = [];
      for (const l of t.laeufe || []) {
        if (l.umbruch) { if (teile.length) teile[teile.length - 1].options.breakLine = true; continue; }
        if (!l.text) continue;
        teile.push({ text: String(l.text), options: { fontSize: Math.max(4, Math.round(Number(l.groesse) * pt * 10) / 10), fontFace: String(l.schrift || 'Calibri').slice(0, 60), color: /^[0-9A-F]{6}$/i.test(l.farbe) ? l.farbe : '1D2742', bold: Boolean(l.fett), italic: Boolean(l.kursiv), underline: l.unter ? { style: 'sng' } : undefined } });
      }
      if (!teile.length) continue;
      s.addText(teile, { x: (breiteZoll - w) / 2 + t.x * zoll, y: (hoeheZoll - h) / 2 + t.y * zoll, w: Math.max(0.1, t.w * zoll), h: Math.max(0.1, t.h * zoll), margin: 0, valign: 'top', align: t.ausr === 'justify' ? 'justify' : t.ausr, fit: 'none', wrap: !t.einzeilig, lineSpacingMultiple: Math.min(3, Math.max(0.7, Number(t.zeile) || 1.2)), paraSpaceBefore: 0, paraSpaceAfter: 0 });
    }
    if (f.notiz) s.addNotes(String(f.notiz));
  }
  return p.write({ outputType: 'nodebuffer' });
}

// ---------- Lesen ----------
const ent = (t) => String(t).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const attr = (xml, name) => { const m = new RegExp(`\\b${name}="([^"]*)"`).exec(xml); return m ? m[1] : null; };

function relsLesen(xml) {
  const r = {};
  for (const m of String(xml || '').matchAll(/<Relationship\b[^>]*>/g)) r[attr(m[0], 'Id')] = { ziel: attr(m[0], 'Target'), typ: attr(m[0], 'Type') || '' };
  return r;
}
function pfad(basis, ziel) {
  if (ziel.startsWith('/')) return ziel.slice(1);
  const teile = basis.split('/'); teile.pop();
  for (const t of ziel.split('/')) { if (t === '..') teile.pop(); else if (t !== '.') teile.push(t); }
  return teile.join('/');
}
// Alle Elemente <tag ...>...</tag> auf oberster Ebene (verschachtelt gleichnamige mitgezählt)
function bloecke(xml, tag) {
  const aus = []; const re = new RegExp(`<${tag}[\\s>/]|</${tag}>`, 'g');
  let tiefe = 0; let start = -1; let m;
  while ((m = re.exec(xml))) {
    if (m[0].startsWith('</')) { tiefe--; if (tiefe === 0 && start >= 0) { aus.push(xml.slice(start, m.index + m[0].length)); start = -1; } } else {
      const ende = xml.indexOf('>', m.index); const selbst = xml[ende - 1] === '/';
      if (tiefe === 0) start = m.index;
      if (selbst) { if (tiefe === 0) { aus.push(xml.slice(start, ende + 1)); start = -1; } } else tiefe++;
    }
  }
  return aus;
}
function farbe(xml) {
  const m = /<a:srgbClr val="([0-9A-Fa-f]{6})"/.exec(xml || '');
  if (m) return `#${m[1].toLowerCase()}`;
  const s = /<a:schemeClr val="(\w+)"/.exec(xml || '');
  if (s) return { dk1: '#1d1d1d', tx1: '#1d1d1d', lt1: '#ffffff', bg1: '#ffffff', dk2: '#1f3a5f', tx2: '#1f3a5f', accent1: '#4472c4', accent2: '#ed7d31', accent3: '#a5a5a5', accent4: '#ffc000', accent5: '#5b9bd5', accent6: '#70ad47' }[s[1]] || null;
  return null;
}
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' };

function lage(xml) {
  const off = /<a:off x="(-?\d+)" y="(-?\d+)"/.exec(xml); const ext = /<a:ext cx="(\d+)" cy="(\d+)"/.exec(xml);
  return off && ext ? { x: Number(off[1]), y: Number(off[2]), w: Number(ext[1]), h: Number(ext[2]) } : null;
}

function absaetze(txBody, faktor, platzTyp) {
  const standardGr = platzTyp === 'title' || platzTyp === 'ctrTitle' ? 40 : platzTyp === 'subTitle' ? 26 : platzTyp === 'body' ? 28 : 18;
  let html = '';
  for (const p of bloecke(txBody, 'a:p')) {
    const pPr = /<a:pPr[^>]*>/.exec(p)?.[0] || '';
    const algn = attr(pPr, 'algn');
    const aufz = /<a:buChar /.test(p) || (/<a:buAutoNum /.test(p)) || (platzTyp === 'body' && !/<a:buNone/.test(p));
    let inhalt = ''; let ersteGr = '';
    for (const r of [...p.matchAll(/<a:(r)>[\s\S]*?<\/a:r>|<a:(br)\b[^>]*\/>|<a:(fld)\b[\s\S]*?<\/a:fld>/g)]) {
      if (r[2] === 'br') { inhalt += '<br>'; continue; }
      const rPr = /<a:rPr[^>]*(?:\/>|>[\s\S]*?<\/a:rPr>)/.exec(r[0])?.[0] || '';
      const t = ent((/<a:t>([\s\S]*?)<\/a:t>/.exec(r[0]) || [])[1] || '');
      if (!t) continue;
      const sz = Number(attr(rPr, 'sz')) || standardGr * 100;
      let st = `font-size:${Math.round(sz / 100 * faktor * 10) / 10}px;`;
      ersteGr ||= st;
      if (attr(rPr, 'b') === '1') st += 'font-weight:700;';
      if (attr(rPr, 'i') === '1') st += 'font-style:italic;';
      if (attr(rPr, 'u') && attr(rPr, 'u') !== 'none') st += 'text-decoration:underline;';
      const fa = farbe(/<a:solidFill>[\s\S]*?<\/a:solidFill>/.exec(rPr)?.[0]); if (fa) st += `color:${fa};`;
      inhalt += `<span style="${st}">${esc(t).replace(/\n/g, '<br>')}</span>`;
    }
    if (!inhalt) { html += '<p style="margin:0;min-height:.6em"></p>'; continue; }
    const ausr = { ctr: 'center', r: 'right', just: 'justify', l: 'left' }[algn] || (platzTyp === 'ctrTitle' || platzTyp === 'subTitle' ? 'center' : 'left');
    html += aufz ? `<li style="text-align:${ausr};${ersteGr}">${inhalt}</li>` : `<p style="margin:0 0 .25em;text-align:${ausr}">${inhalt}</p>`;
  }
  return html.replace(/(<li[\s\S]*?<\/li>)+/g, (m) => `<ul style="margin:0;padding-left:1.1em;list-style:disc outside">${m}</ul>`);
}

async function pptxLesen(puffer, { zielBreite = 1920 } = {}) {
  const zip = await JSZip.loadAsync(puffer);
  const lies = async (p) => (zip.file(p) ? zip.file(p).async('string') : '');
  const pres = await lies('ppt/presentation.xml');
  if (!pres) throw new Error('Das ist keine PowerPoint-Datei.');
  const sz = /<p:sldSz cx="(\d+)" cy="(\d+)"/.exec(pres);
  const cx = sz ? Number(sz[1]) : 12192000; const cy = sz ? Number(sz[2]) : 6858000;
  const faktor = zielBreite / cx;
  const hoehe = Math.round(cy * faktor);
  const pxPt = zielBreite / (cx / EMU_PRO_ZOLL * 72); // px pro Punkt
  const presRels = relsLesen(await lies('ppt/_rels/presentation.xml.rels'));
  const ids = [...pres.matchAll(/<p:sldId [^>]*r:id="([^"]+)"/g)].map((m) => m[1]);
  const folien = [];
  for (const rid of ids) {
    const sp = pfad('ppt/presentation.xml', presRels[rid].ziel);
    const xml = await lies(sp);
    const rels = relsLesen(await lies(sp.replace(/slides\/(slide\d+\.xml)$/, 'slides/_rels/$1.rels')));
    // Layout für Platzhalter ohne eigene Lage
    const layoutRel = Object.values(rels).find((r) => r.typ.endsWith('/slideLayout'));
    const layoutXml = layoutRel ? await lies(pfad(sp, layoutRel.ziel)) : '';
    const platzLage = (typ, idx) => {
      for (const s of bloecke(layoutXml, 'p:sp')) {
        const ph = /<p:ph\b[^>]*>/.exec(s)?.[0]; if (!ph) continue;
        if ((typ && attr(ph, 'type') === typ) || (idx && attr(ph, 'idx') === idx)) { const l = lage(s); if (l) return l; }
      }
      if (typ === 'title' || typ === 'ctrTitle') return { x: cx * 0.07, y: cy * (typ === 'ctrTitle' ? 0.3 : 0.06), w: cx * 0.86, h: cy * 0.18 };
      return { x: cx * 0.07, y: cy * 0.27, w: cx * 0.86, h: cy * 0.62 };
    };
    let hg = '#ffffff';
    const bg = /<p:bg>[\s\S]*?<\/p:bg>/.exec(xml)?.[0]; if (bg) hg = farbe(bg) || hg;
    const teile = [];
    const baum = /<p:spTree>([\s\S]*)<\/p:spTree>/.exec(xml)?.[1] || '';
    const flach = [];
    for (const g of bloecke(baum, 'p:grpSp')) flach.push(...bloecke(g, 'p:sp'), ...bloecke(g, 'p:pic'));
    flach.push(...bloecke(baum, 'p:sp'), ...bloecke(baum, 'p:pic'));
    for (const el of flach) {
      const ph = /<p:ph\b[^>]*>/.exec(el)?.[0];
      const typ = ph ? (attr(ph, 'type') || 'body') : null;
      let l = lage(/<p:spPr>[\s\S]*?<\/p:spPr>|<p:spPr\/>/.exec(el)?.[0] || '');
      if (!l && ph) l = platzLage(attr(ph, 'type') || (attr(ph, 'idx') ? null : 'body'), attr(ph, 'idx'));
      if (!l) continue;
      const box = `left:${Math.round(l.x * faktor)}px;top:${Math.round(l.y * faktor)}px;width:${Math.round(l.w * faktor)}px;height:${Math.round(l.h * faktor)}px;`;
      if (el.startsWith('<p:pic')) {
        const emb = /r:embed="([^"]+)"/.exec(el)?.[1]; const r = emb && rels[emb]; if (!r) continue;
        const dp = pfad(sp, r.ziel); const f = zip.file(dp); if (!f) continue;
        const ext = dp.split('.').pop().toLowerCase(); if (!MIME[ext]) continue;
        const b64 = await f.async('base64');
        teile.push(`<img data-name="Bild" src="data:${MIME[ext]};base64,${b64}" style="position:absolute;${box}object-fit:contain" alt="">`);
        continue;
      }
      const spPr = /<p:spPr>[\s\S]*?<\/p:spPr>/.exec(el)?.[0] || '';
      const fuell = /<a:noFill\/>/.test(spPr.replace(/<a:ln[\s\S]*?<\/a:ln>/, '')) ? null : farbe(/<a:solidFill>[\s\S]*?<\/a:solidFill>/.exec(spPr.replace(/<a:ln[\s\S]*?<\/a:ln>/, ''))?.[0]);
      const rund = /prst="(roundRect|ellipse)"/.exec(spPr)?.[1];
      const tx = /<p:txBody>[\s\S]*?<\/p:txBody>/.exec(el)?.[0] || '';
      const text = tx ? absaetze(tx, pxPt, typ) : '';
      if (!text.replace(/<[^>]+>/g, '').trim() && !fuell) continue;
      const anker = attr(/<a:bodyPr[^>]*>/.exec(tx)?.[0] || '', 'anchor');
      const va = anker === 'ctr' ? 'center' : anker === 'b' ? 'flex-end' : 'flex-start';
      const name = typ === 'title' || typ === 'ctrTitle' ? 'Titel' : typ === 'subTitle' ? 'Untertitel' : text ? 'Text' : 'Form';
      teile.push(`<div data-name="${name}" style="position:absolute;${box}box-sizing:border-box;padding:${Math.round(7 * pxPt)}px ${Math.round(10 * pxPt)}px;display:flex;flex-direction:column;justify-content:${va};overflow:hidden;line-height:1.2;${fuell ? `background:${fuell};` : ''}${rund === 'ellipse' ? 'border-radius:50%;' : rund ? 'border-radius:12px;' : ''}">${text}</div>`);
    }
    // Notizen
    let notiz = '';
    const nRel = Object.values(rels).find((r) => r.typ.endsWith('/notesSlide'));
    if (nRel) {
      const nx = await lies(pfad(sp, nRel.ziel));
      for (const s of bloecke(nx, 'p:sp')) {
        if (!/<p:ph [^>]*type="body"/.test(s)) continue;
        notiz = bloecke(s, 'a:p').map((p) => [...p.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => ent(m[1])).join('')).join('\n').replace(/\r\n?/g, '\n').trim();
      }
    }
    const titel = (/data-name="Titel"[\s\S]*?>([\s\S]*?)<\/div>/.exec(teile.join(''))?.[1] || '').replace(/<[^>]+>/g, '').trim();
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>html,body{margin:0;width:${zielBreite}px;height:${hoehe}px;overflow:hidden}body{position:relative;background:${hg};font-family:"Segoe UI",Calibri,Arial,sans-serif;color:#1d1d1d}</style></head><body>${teile.join('\n')}</body></html>`;
    folien.push({ html, notiz, titel, breite: zielBreite, hoehe });
  }
  return { folien, breite: zielBreite, hoehe };
}

module.exports = { pptxSchreiben, pptxLesen };
