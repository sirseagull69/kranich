'use strict';
// Boards für PowerPoint vorbereiten: Texte werden echte, bearbeitbare Textfelder,
// alles andere (Flächen, Bilder, Verläufe, Formen) kommt als Hintergrundbild darunter.
window.PptxExport = (() => {
  const hex = (rgb) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(rgb || ''); if (!m) return null; if (m[4] !== undefined && Number(m[4]) < 0.05) return null; return [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('').toUpperCase(); };
  const istInline = (cs) => /^inline(?!-block|-flex|-grid|-table)/.test(cs.display) || cs.display === 'contents';

  function laden(b) {
    return new Promise((ok) => {
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-same-origin');
      f.style.cssText = `position:fixed;left:-99999px;top:0;width:${b.breite}px;height:${b.hoehe}px;border:0;visibility:hidden;pointer-events:none`;
      document.body.appendChild(f);
      let fertig = false;
      const los = async () => { if (fertig) return; fertig = true; try { await f.contentDocument.fonts?.ready; } catch { /* egal */ } setTimeout(() => ok(f), 60); };
      f.addEventListener('load', los, { once: true });
      setTimeout(los, 4000);
      f.srcdoc = window.Entwurf?.vorbereiten ? Entwurf.vorbereiten(b.html) : b.html;
    });
  }

  function texteSammeln(doc, b) {
    const win = doc.defaultView; const body = doc.body; if (!body) return [];
    const blockVon = (n) => { let e = n.nodeType === 3 ? n.parentElement : n; while (e && e !== body && istInline(win.getComputedStyle(e))) e = e.parentElement; return e || body; };
    const gruppen = new Map();
    const w = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => {
        if (n.nodeType === 1) { if (/^(SCRIPT|STYLE|SVG|svg|NOSCRIPT|TEMPLATE|SELECT|TEXTAREA|INPUT|IFRAME|CANVAS|VIDEO)$/.test(n.tagName)) return NodeFilter.FILTER_REJECT; const cs = win.getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return NodeFilter.FILTER_REJECT; return n.tagName === 'BR' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; }
        return n.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    while (w.nextNode()) { const n = w.currentNode; const bl = blockVon(n); if (!gruppen.has(bl)) gruppen.set(bl, []); gruppen.get(bl).push(n); }
    const aus = [];
    for (const [bl, knoten] of gruppen) {
      const bcs = win.getComputedStyle(bl);
      let x1 = Infinity; let y1 = Infinity; let x2 = -Infinity; let y2 = -Infinity;
      const laeufe = [];
      const liste = bl.tagName === 'LI' ? (bl.parentElement?.tagName === 'OL' ? `${[...bl.parentElement.children].indexOf(bl) + 1}. ` : '• ') : '';
      if (liste && bcs.listStyleType !== 'none') laeufe.push({ text: liste, ...stil(win.getComputedStyle(bl)) });
      for (const n of knoten) {
        if (n.nodeType === 1) { laeufe.push({ umbruch: true }); continue; }
        const r = doc.createRange(); r.selectNodeContents(n);
        for (const q of r.getClientRects()) { if (!q.width) continue; x1 = Math.min(x1, q.left); y1 = Math.min(y1, q.top); x2 = Math.max(x2, q.right); y2 = Math.max(y2, q.bottom); }
        const cs = win.getComputedStyle(n.parentElement);
        let t = n.data.replace(/\s+/g, ' ');
        if (cs.whiteSpace.startsWith('pre')) t = n.data;
        if (cs.textTransform === 'uppercase') t = t.toUpperCase(); else if (cs.textTransform === 'lowercase') t = t.toLowerCase();
        laeufe.push({ text: t, ...stil(cs) });
      }
      if (!Number.isFinite(x1)) continue;
      // Ränder der Läufe säubern
      const textL = laeufe.filter((l, k) => l.text !== undefined && !(liste && k === 0));
      if (textL[0]) textL[0].text = textL[0].text.replace(/^\s+/, '');
      if (textL.length) textL[textL.length - 1].text = textL[textL.length - 1].text.replace(/\s+$/, '');
      if (x2 < 0 || y2 < 0 || x1 > b.breite || y1 > b.hoehe) continue;
      const gr = parseFloat(bcs.fontSize) || 16;
      const lh = parseFloat(bcs.lineHeight);
      const ausr = { center: 'center', right: 'right', end: 'right', justify: 'justify' }[bcs.textAlign] || 'left';
      const zeileF = Number.isFinite(lh) ? lh / gr : 1.2;
      const marke = liste && bcs.listStyleType !== 'none' ? gr * (liste.length > 2 ? 1.6 : 1.1) : 0;
      x1 -= marke;
      const extra = Math.max(6, (x2 - x1) * 0.06 + gr * 0.4);
      const einzeilig = (y2 - y1) < gr * zeileF * 1.5;
      aus.push({ x: x1 - (ausr === 'right' ? extra : ausr === 'center' ? extra / 2 : 0), y: y1, w: x2 - x1 + extra, h: y2 - y1, ausr, zeile: zeileF, einzeilig, laeufe });
      bl.setAttribute('data-kr-text', '');
    }
    return aus;
  }
  function stil(cs) {
    return { groesse: parseFloat(cs.fontSize) || 16, schrift: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), farbe: hex(cs.color) || '1D2742', fett: Number(cs.fontWeight) >= 600 || cs.fontWeight === 'bold', kursiv: cs.fontStyle === 'italic', unter: /underline/.test(cs.textDecorationLine || cs.textDecoration) };
  }

  async function folien(boards, fortschritt) {
    const aus = [];
    for (const [i, b] of boards.entries()) {
      fortschritt?.(i + 1, boards.length);
      const f = await laden(b);
      try {
        const doc = f.contentDocument;
        const texte = texteSammeln(doc, b);
        const st = doc.createElement('style');
        st.textContent = '*{-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}li::marker{color:transparent!important}input::placeholder,textarea::placeholder{color:transparent!important}';
        doc.head ? doc.head.appendChild(st) : doc.documentElement.appendChild(st);
        const kopie = doc.documentElement.cloneNode(true);
        kopie.querySelectorAll('[data-kranich-intern]').forEach((e) => e.remove());
        aus.push({ name: b.name, breite: b.breite, hoehe: b.hoehe, notiz: b.notiz || '', hintergrund: `<!doctype html>\n${kopie.outerHTML}`, texte });
      } finally { f.remove(); }
    }
    return aus;
  }
  return { folien };
})();
