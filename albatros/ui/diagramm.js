'use strict';
// Albatros – Diagramme als SVG (Balken, Linie, Kreis), ohne fremde Bibliothek.
(function () {
  const FARBEN = ['#2f8a55', '#e8a53a', '#1d5e3a', '#7cc49a', '#c96f3b', '#5b8fb9', '#a8dcbb', '#8a6bbf'];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kurz = (n) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.` : Math.abs(n) >= 1e4 ? `${(n / 1e3).toLocaleString('de-DE', { maximumFractionDigits: 1 })} T` : n.toLocaleString('de-DE', { maximumFractionDigits: 2 }));

  function schritt(max) {
    const roh = max / 4; const p = 10 ** Math.floor(Math.log10(roh || 1)); const n = roh / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }

  // daten: [{ name, wert }]
  function svg({ daten, art = 'balken', titel = '', breite = 760, hoehe = 400 }) {
    const W = breite, H = hoehe;
    const kopf = titel ? `<text x="24" y="34" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="19" fill="#1d2742">${esc(titel)}</text>` : '';
    if (!daten.length) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${kopf}<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="sans-serif" fill="#5b6170">Keine Zahlen im Bereich</text></svg>`;
    if (art === 'kreis') {
      const summe = daten.reduce((s, d) => s + Math.max(0, d.wert), 0) || 1;
      const cx = 220, cy = H / 2 + 14, r = Math.min(150, H / 2 - 40);
      let w = -Math.PI / 2; let stuecke = '';
      daten.forEach((d, i) => {
        const anteil = Math.max(0, d.wert) / summe; const w2 = w + anteil * Math.PI * 2;
        const gross = anteil > 0.5 ? 1 : 0;
        const x1 = cx + r * Math.cos(w), y1 = cy + r * Math.sin(w), x2 = cx + r * Math.cos(w2), y2 = cy + r * Math.sin(w2);
        stuecke += anteil >= 0.9999 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${FARBEN[i % FARBEN.length]}"/>` : `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${gross} 1 ${x2},${y2} Z" fill="${FARBEN[i % FARBEN.length]}" stroke="#fff" stroke-width="2"/>`;
        w = w2;
      });
      const legende = daten.slice(0, 12).map((d, i) => `<rect x="420" y="${70 + i * 26}" width="14" height="14" rx="3" fill="${FARBEN[i % FARBEN.length]}"/><text x="442" y="${82 + i * 26}" font-family="Source Serif 4, serif" font-size="14" fill="#1d2742">${esc(String(d.name).slice(0, 28))} · ${Math.round((Math.max(0, d.wert) / summe) * 100)} %</text>`).join('');
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${kopf}${stuecke}${legende}</svg>`;
    }
    const L = 70, R = 20, O = titel ? 60 : 24, U = 70;
    const max = Math.max(0, ...daten.map((d) => d.wert)); const min = Math.min(0, ...daten.map((d) => d.wert));
    const s = schritt(max - min || 1); const oben = Math.ceil(max / s) * s || s; const unten = Math.floor(min / s) * s;
    const y = (v) => O + (H - O - U) * (1 - (v - unten) / (oben - unten || 1));
    let gitter = '';
    for (let v = unten; v <= oben + 1e-9; v += s) gitter += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#ebe5d8"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-family="Bricolage Grotesque, sans-serif" font-size="12" fill="#5b6170">${kurz(v)}</text>`;
    const n = daten.length; const feld = (W - L - R) / n;
    const zeigeName = (i) => n <= 16 || i % Math.ceil(n / 16) === 0;
    const namen = daten.map((d, i) => (zeigeName(i) ? `<text transform="translate(${L + feld * i + feld / 2},${H - U + 16}) rotate(${n > 8 ? -35 : 0})" text-anchor="${n > 8 ? 'end' : 'middle'}" font-family="Source Serif 4, serif" font-size="12.5" fill="#1d2742">${esc(String(d.name).slice(0, 18))}</text>` : '')).join('');
    let inhalt = '';
    if (art === 'linie') {
      const pkt = daten.map((d, i) => `${L + feld * i + feld / 2},${y(d.wert)}`);
      inhalt = `<polyline points="${pkt.join(' ')}" fill="none" stroke="#2f8a55" stroke-width="3" stroke-linejoin="round"/>${daten.map((d, i) => `<circle cx="${L + feld * i + feld / 2}" cy="${y(d.wert)}" r="4.5" fill="#fff" stroke="#2f8a55" stroke-width="2.5"/>`).join('')}`;
    } else {
      const b = Math.min(56, feld * 0.62); const maxI = daten.reduce((m, d, i) => (d.wert > daten[m].wert ? i : m), 0);
      inhalt = daten.map((d, i) => { const y1 = y(Math.max(0, d.wert)), y2 = y(Math.min(0, d.wert)); return `<rect x="${L + feld * i + (feld - b) / 2}" y="${y1}" width="${b}" height="${Math.max(1, y2 - y1)}" rx="4" fill="${i === maxI ? '#1d5e3a' : '#2f8a55'}"/>${n <= 14 ? `<text x="${L + feld * i + feld / 2}" y="${y1 - 6}" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-size="11.5" font-weight="700" fill="#1d2742">${kurz(d.wert)}</text>` : ''}`; }).join('');
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${kopf}${gitter}<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="#1d2742" stroke-width="1.2"/>${inhalt}${namen}</svg>`;
  }

  // SVG → PNG (Daten-Adresse)
  function alsBild(svgText, faktor = 2) {
    return new Promise((ok, fehler) => {
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = img.width * faktor; c.height = img.height * faktor;
        const g = c.getContext('2d'); g.scale(faktor, faktor); g.drawImage(img, 0, 0);
        URL.revokeObjectURL(url); ok(c.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); fehler(new Error('Bild klappt nicht.')); };
      img.src = url;
    });
  }

  window.Diagramm = { svg, alsBild };
})();
