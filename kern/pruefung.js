'use strict';
// Selbstprüfung: misst einen gerenderten Entwurf nach und findet typische
// Fehler. Die Messung läuft im unsichtbaren Fenster (siehe main.js), hier
// stehen das Messprogramm und die Auswertung.

// Läuft im Entwurf (Browser). Gibt eine Liste roher Funde zurück.
/* eslint-disable no-undef */
function messen(opt) {
  const W = opt.breite, Hh = opt.hoehe;
  const funde = [];
  const name = (el) => el.getAttribute('data-name') || `${el.localName}${el.textContent ? ` „${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24)}“` : ''}`;
  const rgb = (s) => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const grund = (el) => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // Verlauf/Bild: nicht messbar
      const c = rgb(cs.backgroundColor);
      if (c && c.a > 0.9) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const sichtbar = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 && r.width > 0 && r.height > 0; };
  const hatText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
  const alle = [...document.body.querySelectorAll('*')].filter((el) => !el.closest('svg') || el.localName === 'svg');
  for (const el of alle) {
    if (!sichtbar(el)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const k = el.getAttribute('data-k') || '';
    const ort = { x: Math.round(r.left), y: Math.round(r.top), b: Math.round(r.width), h: Math.round(r.height) };
    // 1. ragt aus der Fläche
    if ((r.right > W + 2 || r.bottom > Hh + 2) && r.left < W && r.top < Hh && cs.position !== 'fixed') {
      funde.push({ art: 'raus', k, name: name(el), ort, wert: `${Math.round(Math.max(r.right - W, r.bottom - Hh))} px` });
    }
    if (!hatText(el)) continue;
    // 2. Text läuft über oder wird abgeschnitten
    if ((el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis') || (el.scrollHeight > el.clientHeight + 4 && cs.overflowY !== 'visible')) {
      funde.push({ art: 'ueberlauf', k, name: name(el), ort });
    }
    // 3. Schrift zu klein
    const gr = parseFloat(cs.fontSize);
    if (gr < opt.minSchrift) funde.push({ art: 'klein', k, name: name(el), ort, wert: `${gr.toFixed(1)} px` });
    // 4. Kontrast
    const vorne = rgb(cs.color), hinten = grund(el);
    if (vorne && hinten) {
      const l1 = lum(vorne), l2 = lum(hinten);
      const verh = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const gross = gr >= 24 || (gr >= 18.6 && Number(cs.fontWeight) >= 700);
      if (verh < (gross ? 3 : 4.5)) funde.push({ art: 'kontrast', k, name: name(el), ort, wert: `${verh.toFixed(1)} : 1` });
    }
  }
  // 5. Klickflächen (nur für Touch-Formate)
  if (opt.touch) {
    for (const el of document.body.querySelectorAll('button, a, input, select, [data-ziel]')) {
      if (!sichtbar(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 40 || r.width < 40) funde.push({ art: 'ziel', k: el.getAttribute('data-k') || '', name: name(el), ort: { x: Math.round(r.left), y: Math.round(r.top), b: Math.round(r.width), h: Math.round(r.height) }, wert: `${Math.round(r.width)} × ${Math.round(r.height)} px` });
    }
  }
  return funde;
}
/* eslint-enable no-undef */

const ARTEN = {
  raus: 'ragt aus dem Bild',
  ueberlauf: 'Text läuft über',
  klein: 'Schrift zu klein',
  kontrast: 'Kontrast zu schwach',
  ziel: 'Klickfläche zu klein',
};

function messOptionen(format) {
  const touch = ['app', 'tablet', 'story'].includes(format?.id);
  return { breite: format.breite, hoehe: format.hoehe, minSchrift: format.druck ? 12 : touch ? 12 : 11, touch };
}

// Fasst rohe Funde zusammen: doppelte raus, Eltern-Kind-Doppelungen weg, höchstens 12.
function bewerte(funde) {
  const gesehen = new Set();
  const liste = [];
  for (const f of funde || []) {
    if (!ARTEN[f.art]) continue;
    const schluessel = `${f.art}|${f.k || f.name}`;
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);
    liste.push({ ...f, text: `${ARTEN[f.art]}${f.wert ? ` (${f.wert})` : ''}: ${f.name}` });
  }
  const gewicht = { raus: 0, ueberlauf: 1, kontrast: 2, ziel: 3, klein: 4 };
  return liste.sort((a, b) => gewicht[a.art] - gewicht[b.art]).slice(0, 12);
}

function auftragReparieren({ html, probleme, breite, hoehe }) {
  return `Die Selbstprüfung hat in diesem Entwurf (Fläche ${breite} × ${hoehe} px) Fehler gefunden. Behebe genau diese,
ohne den Rest zu verändern. Vorhandene data-k, data-name und data-ziel bleiben stehen.
${probleme.map((p, i) => `${i + 1}. ${p.text}${p.k ? ` (Element data-k="${p.k}")` : ''}`).join('\n')}

Regeln: Kontrast mindestens 4,5 : 1 (große Schrift 3 : 1), nichts ragt über die Fläche, Text passt in seinen Kasten,
Klickflächen mindestens 44 × 44 px auf Touch-Geräten.

AKTUELLES HTML:
\`\`\`html
${html}
\`\`\``;
}

module.exports = { messen, messCode: `(${messen.toString()})`, ARTEN, messOptionen, bewerte, auftragReparieren };
