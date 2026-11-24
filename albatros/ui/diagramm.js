'use strict';
// Albatros – Diagramme als SVG, ohne fremde Bibliothek.
// Arten: saeulen, gestapelt, quer, linie, flaeche, kreis, ring, punkte
// Eingabe: { namen: [..], reihen: [{ name, werte: [..] }] } – oder alt: daten: [{ name, wert }]
(function () {
  const FARBEN = ['#2f8a55', '#e8a53a', '#5b8fb9', '#c96f3b', '#8a6bbf', '#1d5e3a', '#d4b13a', '#7cc49a', '#b23a28', '#4a6d8c'];
  const ARTEN = [['saeulen', 'Säulen'], ['gestapelt', 'Gestapelt'], ['quer', 'Balken'], ['linie', 'Linie'], ['flaeche', 'Fläche'], ['kreis', 'Kreis'], ['ring', 'Ring'], ['punkte', 'Punkte']];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kurz = (n) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.` : Math.abs(n) >= 1e4 ? `${(n / 1e3).toLocaleString('de-DE', { maximumFractionDigits: 1 })} T` : n.toLocaleString('de-DE', { maximumFractionDigits: 2 }));
  const SCHRIFT = 'font-family="Bricolage Grotesque, sans-serif"';
  const TEXT = 'font-family="Source Serif 4, serif"';

  function schritt(spanne) {
    const roh = spanne / 4; const p = 10 ** Math.floor(Math.log10(roh || 1)); const n = roh / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  const kuerzen = (t, n) => (String(t).length > n ? `${String(t).slice(0, n - 1)}…` : String(t));

  function svg(opt) {
    let { namen, reihen, art = 'saeulen', titel = '', breite = 760, hoehe = 400, farben } = opt;
    if (art === 'balken') art = 'saeulen';
    if (!reihen && opt.daten) { namen = opt.daten.map((d) => d.name); reihen = [{ name: titel || 'Werte', werte: opt.daten.map((d) => d.wert) }]; }
    reihen = (reihen || []).filter((r) => r.werte?.some((v) => typeof v === 'number'));
    namen = namen || [];
    const F = farben?.length ? farben : FARBEN;
    const W = breite; const H = hoehe;
    const kopf = titel ? `<text x="20" y="30" ${SCHRIFT} font-weight="800" font-size="17" fill="#1d2742">${esc(kuerzen(titel, 60))}</text>` : '';
    const rahmen = (inhalt) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${kopf}${inhalt}</svg>`;
    if (!reihen.length) return rahmen(`<text x="${W / 2}" y="${H / 2}" text-anchor="middle" ${TEXT} font-size="15" fill="#7a7f8e">Keine Zahlen gefunden</text>`);
    const n = Math.max(...reihen.map((r) => r.werte.length));
    const nameVon = (i) => (namen[i] !== undefined && namen[i] !== '' ? String(namen[i]) : String(i + 1));
    const mehr = reihen.length > 1;
    const oben = titel ? 46 : 16;
    // Legende oben rechts (bei mehreren Reihen)
    const legende = (eintraege, x0 = W - 20) => {
      let x = x0; let s = '';
      for (const [i, t] of [...eintraege.entries()].reverse()) { const txt = kuerzen(t, 18); const w = txt.length * 7 + 26; x -= w; s += `<rect x="${x}" y="${oben - 30 + (titel ? 0 : 20)}" width="12" height="12" rx="3" fill="${F[i % F.length]}"/><text x="${x + 17}" y="${oben - 20 + (titel ? 0 : 20)}" ${TEXT} font-size="12.5" fill="#1d2742">${esc(txt)}</text>`; }
      return s;
    };

    if (art === 'kreis' || art === 'ring') {
      const werte = reihen[0].werte.map((v) => Math.max(0, typeof v === 'number' ? v : 0));
      const summe = werte.reduce((a, b) => a + b, 0) || 1;
      const r = Math.min(H / 2 - 34, W * 0.24); const cx = Math.min(W * 0.32, r + 40); const cy = oben + (H - oben) / 2;
      const innen = art === 'ring' ? r * 0.58 : 0;
      let w = -Math.PI / 2; let teile = '';
      werte.forEach((v, i) => {
        const anteil = v / summe; if (!anteil) return; const w2 = w + anteil * Math.PI * 2; const gross = anteil > 0.5 ? 1 : 0;
        const p = (rad, a) => `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
        if (anteil >= 0.9999) teiles();
        else if (innen) teile += `<path d="M${p(r, w)} A${r},${r} 0 ${gross} 1 ${p(r, w2)} L${p(innen, w2)} A${innen},${innen} 0 ${gross} 0 ${p(innen, w)} Z" fill="${F[i % F.length]}" stroke="#fff" stroke-width="2"/>`;
        else teile += `<path d="M${cx},${cy} L${p(r, w)} A${r},${r} 0 ${gross} 1 ${p(r, w2)} Z" fill="${F[i % F.length]}" stroke="#fff" stroke-width="2"/>`;
        if (anteil > 0.05) { const m = (w + w2) / 2; const rr = innen ? (r + innen) / 2 : r * 0.66; teile += `<text x="${cx + rr * Math.cos(m)}" y="${cy + rr * Math.sin(m) + 4}" text-anchor="middle" ${SCHRIFT} font-weight="700" font-size="12" fill="#fff">${Math.round(anteil * 100)} %</text>`; }
        w = w2;
        function teiles() { teile += innen ? `<circle cx="${cx}" cy="${cy}" r="${(r + innen) / 2}" fill="none" stroke="${F[i % F.length]}" stroke-width="${r - innen}"/>` : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${F[i % F.length]}"/>`; }
      });
      if (innen) teile += `<text x="${cx}" y="${cy + 6}" text-anchor="middle" ${SCHRIFT} font-weight="800" font-size="17" fill="#1d2742">${esc(kurz(summe))}</text>`;
      const lx = cx + r + 40; const zeilen = Math.min(werte.length, Math.floor((H - oben - 10) / 24));
      const leg = werte.slice(0, zeilen).map((v, i) => `<rect x="${lx}" y="${oben + 10 + i * 24}" width="12" height="12" rx="3" fill="${F[i % F.length]}"/><text x="${lx + 19}" y="${oben + 21 + i * 24}" ${TEXT} font-size="13" fill="#1d2742">${esc(kuerzen(nameVon(i), 22))}</text><text x="${W - 20}" y="${oben + 21 + i * 24}" text-anchor="end" ${SCHRIFT} font-size="12.5" fill="#5d6478">${esc(kurz(v))}</text>`).join('');
      return rahmen(teile + leg);
    }

    const gestapelt = art === 'gestapelt';
    const quer = art === 'quer';
    const alle = [];
    if (gestapelt) for (let i = 0; i < n; i++) { let pos = 0; let neg = 0; for (const r of reihen) { const v = r.werte[i]; if (typeof v === 'number') { if (v >= 0) pos += v; else neg += v; } } alle.push(pos, neg); }
    else for (const r of reihen) for (const v of r.werte) if (typeof v === 'number') alle.push(v);
    const max = Math.max(0, ...alle); const min = Math.min(0, ...alle);
    const s = schritt(max - min || 1); const hoch = Math.ceil(max / s) * s || s; const tief = Math.floor(min / s) * s;
    const L = quer ? Math.min(160, 18 + Math.max(...Array.from({ length: n }, (_, i) => kuerzen(nameVon(i), 20).length)) * 7) : 62;
    const R = 20; const O = oben + (mehr ? 14 : 4); const U = quer ? 34 : (n > 8 ? 74 : 40);
    const lg = mehr ? legende(reihen.map((r) => r.name)) : '';
    let g = '';
    if (art === 'punkte') {
      // x = Namen als Zahlen (wenn möglich), y = Werte
      const xs = Array.from({ length: n }, (_, i) => { const z = Number(String(nameVon(i)).replace(',', '.')); return Number.isFinite(z) ? z : i + 1; });
      const xmin = Math.min(...xs); const xmax = Math.max(...xs); const xs2 = schritt(xmax - xmin || 1); const xa = Math.floor(xmin / xs2) * xs2; const xb = Math.ceil(xmax / xs2) * xs2 || xs2;
      const X = (v) => L + (W - L - R) * (v - xa) / (xb - xa || 1); const Y = (v) => O + (H - O - U) * (1 - (v - tief) / (hoch - tief || 1));
      for (let v = tief; v <= hoch + 1e-9; v += s) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ebe5d8"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" ${SCHRIFT} font-size="11.5" fill="#7a7f8e">${esc(kurz(v))}</text>`;
      for (let v = xa; v <= xb + 1e-9; v += xs2) g += `<text x="${X(v)}" y="${H - U + 18}" text-anchor="middle" ${SCHRIFT} font-size="11.5" fill="#7a7f8e">${esc(kurz(v))}</text>`;
      reihen.forEach((r, ri) => r.werte.forEach((v, i) => { if (typeof v === 'number') g += `<circle cx="${X(xs[i])}" cy="${Y(v)}" r="5" fill="${F[ri % F.length]}" fill-opacity=".8"/>`; }));
      return rahmen(g + lg);
    }
    if (quer) {
      const X = (v) => L + (W - L - R) * (v - tief) / (hoch - tief || 1);
      const feld = (H - O - U) / n; const b = Math.min(34, feld * 0.7) / reihen.length;
      for (let v = tief; v <= hoch + 1e-9; v += s) g += `<line x1="${X(v)}" x2="${X(v)}" y1="${O}" y2="${H - U}" stroke="#ebe5d8"/><text x="${X(v)}" y="${H - U + 18}" text-anchor="middle" ${SCHRIFT} font-size="11.5" fill="#7a7f8e">${esc(kurz(v))}</text>`;
      for (let i = 0; i < n; i++) {
        const y0 = O + feld * i + (feld - b * reihen.length) / 2;
        if (feld >= 12) g += `<text x="${L - 8}" y="${O + feld * i + feld / 2 + 4}" text-anchor="end" ${TEXT} font-size="12.5" fill="#1d2742">${esc(kuerzen(nameVon(i), 20))}</text>`;
        reihen.forEach((r, ri) => { const v = r.werte[i]; if (typeof v !== 'number') return; const a = X(Math.min(0, v)); const e = X(Math.max(0, v)); g += `<rect x="${a}" y="${y0 + ri * b}" width="${Math.max(1, e - a)}" height="${Math.max(1, b - 2)}" rx="3" fill="${F[ri % F.length]}"/>`; });
      }
      return rahmen(`${g}<line x1="${X(0)}" x2="${X(0)}" y1="${O}" y2="${H - U}" stroke="#9aa0ae"/>${lg}`);
    }
    const Y = (v) => O + (H - O - U) * (1 - (v - tief) / (hoch - tief || 1));
    for (let v = tief; v <= hoch + 1e-9; v += s) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ebe5d8"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" ${SCHRIFT} font-size="11.5" fill="#7a7f8e">${esc(kurz(v))}</text>`;
    const feld = (W - L - R) / n;
    const jede = Math.ceil(n / Math.max(1, Math.floor((W - L - R) / 46)));
    for (let i = 0; i < n; i += jede) g += `<text transform="translate(${L + feld * i + feld / 2},${H - U + 16}) rotate(${n > 8 ? -35 : 0})" text-anchor="${n > 8 ? 'end' : 'middle'}" ${TEXT} font-size="12" fill="#1d2742">${esc(kuerzen(nameVon(i), 16))}</text>`;
    if (art === 'linie' || art === 'flaeche') {
      reihen.forEach((r, ri) => {
        const pkt = r.werte.map((v, i) => (typeof v === 'number' ? [L + feld * i + feld / 2, Y(v)] : null)).filter(Boolean);
        if (!pkt.length) return;
        const fa = F[ri % F.length];
        if (art === 'flaeche') g += `<path d="M${pkt[0][0]},${Y(Math.max(tief, 0))} ${pkt.map((p) => `L${p[0]},${p[1]}`).join(' ')} L${pkt[pkt.length - 1][0]},${Y(Math.max(tief, 0))} Z" fill="${fa}" fill-opacity="${mehr ? 0.28 : 0.35}"/>`;
        g += `<polyline points="${pkt.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${fa}" stroke-width="2.6" stroke-linejoin="round"/>`;
        if (pkt.length <= 40) g += pkt.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.6" fill="#fff" stroke="${fa}" stroke-width="2"/>`).join('');
      });
    } else {
      const b = Math.min(58, feld * 0.7);
      for (let i = 0; i < n; i++) {
        let pos = 0; let neg = 0;
        reihen.forEach((r, ri) => {
          const v = r.werte[i]; if (typeof v !== 'number') return;
          let y1; let y2; let x; let w;
          if (gestapelt) { x = L + feld * i + (feld - b) / 2; w = b; if (v >= 0) { y1 = Y(pos + v); y2 = Y(pos); pos += v; } else { y1 = Y(neg); y2 = Y(neg + v); neg += v; } }
          else { w = b / reihen.length; x = L + feld * i + (feld - b) / 2 + ri * w; y1 = Y(Math.max(0, v)); y2 = Y(Math.min(0, v)); }
          g += `<rect x="${x + (gestapelt ? 0 : 1)}" y="${y1}" width="${Math.max(1, w - (gestapelt ? 0 : 2))}" height="${Math.max(1, y2 - y1)}" rx="${gestapelt ? 1 : 3}" fill="${F[ri % F.length]}"><title>${esc(nameVon(i))}: ${esc(kurz(v))}</title></rect>`;
          if (!mehr && n <= 14 && b > 26) g += `<text x="${x + w / 2}" y="${v >= 0 ? y1 - 5 : y2 + 14}" text-anchor="middle" ${SCHRIFT} font-size="11" fill="#5d6478">${esc(kurz(v))}</text>`;
        });
      }
    }
    return rahmen(`${g}<line x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}" stroke="#9aa0ae"/>${lg}`);
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

  window.Diagramm = { svg, alsBild, ARTEN };
})();
