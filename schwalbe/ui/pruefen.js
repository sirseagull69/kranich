'use strict';
// Überprüfen: Änderungen nachverfolgen (wie in Word) und Textstellen umwickeln (Kommentare).
// Einfügungen: <ins class="aend" data-autor data-zeit>, Löschungen: <del class="aend" …>.
window.Pruefen = (() => {
  let autor = 'Ich';
  const jetzt = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const el = (n) => (n?.nodeType === 3 ? n.parentElement : n);
  const meinIns = (n) => { const e = el(n)?.closest?.('ins.aend'); return e && e.dataset.autor === autor ? e : null; };
  const inDel = (n) => el(n)?.closest?.('del.aend') || null;
  // Nachbarknoten, leere Textknoten übersprungen
  function nachbar(n, richtung) { let k = richtung < 0 ? n.previousSibling : n.nextSibling; while (k && k.nodeType === 3 && !k.length) k = richtung < 0 ? k.previousSibling : k.nextSibling; return k; }
  const meinDel = (k) => k?.matches?.('del.aend') && k.dataset.autor === autor;
  function neu(tag) { const e = document.createElement(tag); e.className = 'aend'; e.dataset.autor = autor; e.dataset.zeit = jetzt(); return e; }
  function caret(knoten, offset) { const sel = getSelection(); const r = document.createRange(); r.setStart(knoten, offset); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }

  // Alle Textknoten eines Bereichs (an den Rändern geteilt) einzeln einwickeln.
  function textknoten(r) {
    let { startContainer: sc, startOffset: so, endContainer: ec, endOffset: eo } = r;
    if (ec.nodeType === 3 && eo < ec.length && eo > 0) ec.splitText(eo);
    if (sc.nodeType === 3 && so > 0 && so < sc.length) { const n = sc.splitText(so); if (ec === sc) { ec = n; eo -= so; } sc = n; so = 0; }
    const b = document.createRange();
    if (sc.nodeType === 3 && so >= sc.length) b.setStartAfter(sc); else b.setStart(sc, so);
    if (ec.nodeType === 3) { if (eo === 0) b.setEndBefore(ec); else b.setEnd(ec, ec.length); } else b.setEnd(ec, eo);
    const wurzel = b.commonAncestorContainer.nodeType === 3 ? b.commonAncestorContainer.parentNode : b.commonAncestorContainer;
    const liste = []; const w = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
    if (wurzel.nodeType === 3) liste.push(wurzel);
    while (w.nextNode()) { const n = w.currentNode; if (n.length && b.intersectsNode(n) && !el(n).closest('.nicht-speichern, nav.inhalt')) liste.push(n); }
    return liste;
  }
  function wickle(r, erzeuge, passt) {
    const aus = [];
    for (const n of textknoten(r)) {
      const vor = n.previousSibling;
      if (vor && passt?.(vor)) { vor.appendChild(n); if (!aus.includes(vor)) aus.push(vor); continue; }
      const h = erzeuge(); n.parentNode.insertBefore(h, n); h.appendChild(n); aus.push(h);
    }
    return aus;
  }

  // Bereich als gelöscht markieren; eigene, noch frische Einfügungen verschwinden direkt.
  function markiereGeloescht(r, richtung) {
    const anker = document.createTextNode('');
    if (richtung === 'zurueck') r.cloneRange().insertNode(anker);
    else { const e = r.cloneRange(); e.collapse(false); e.insertNode(anker); }
    let letzte = null; let erste = null;
    for (const n of textknoten(r)) {
      if (n === anker || inDel(n)) continue;
      const mi = meinIns(n);
      if (mi) { n.remove(); if (!mi.textContent) { if (mi.contains(anker)) mi.parentNode.insertBefore(anker, mi); mi.remove(); } continue; }
      const vor = nachbar(n, -1);
      let d;
      if (meinDel(vor)) { vor.appendChild(n); d = vor; } else { d = neu('del'); n.parentNode.insertBefore(d, n); d.appendChild(n); }
      erste ||= d; letzte = d;
    }
    // Nachbarn zusammenführen
    const nach = letzte && nachbar(letzte, 1);
    if (meinDel(nach) && nach !== letzte) { while (nach.firstChild) letzte.appendChild(nach.firstChild); nach.remove(); }
    const r2 = document.createRange();
    if (richtung === 'zurueck' && erste) r2.setStartBefore(erste);
    else if (richtung !== 'zurueck' && letzte) r2.setStartAfter(letzte);
    else if (anker.parentNode) {
      // Schreibmarke an echten Text setzen (leere Hilfsknoten mag Chromium nicht als Ort)
      const vor = nachbar(anker, -1); const nach = nachbar(anker, 1);
      if (vor?.nodeType === 3) r2.setStart(vor, vor.length);
      else if (vor?.nodeType === 1 && vor.lastChild?.nodeType === 3 && vor.matches('ins.aend')) r2.setStart(vor.lastChild, vor.lastChild.length);
      else if (nach?.nodeType === 3) r2.setStart(nach, 0);
      else r2.setStartBefore(anker);
    }
    r2.collapse(true);
    if (anker.parentNode) anker.remove();
    const s = getSelection(); s.removeAllRanges(); s.addRange(r2);
  }

  function textEinfuegen(text) {
    const sel = getSelection(); if (!sel.rangeCount || !text) return;
    let r = sel.getRangeAt(0);
    if (!r.collapsed) { markiereGeloescht(r, 'vor'); r = sel.getRangeAt(0); }
    const d = inDel(r.startContainer); if (d) { r.setStartAfter(d); r.collapse(true); }
    const sc = r.startContainer; const so = r.startOffset;
    const ins = meinIns(sc);
    if (ins && sc.nodeType === 3) { sc.insertData(so, text); caret(sc, so + text.length); return; }
    // direkt hinter einer eigenen Einfügung? Dann dort anhängen.
    const davor = sc.nodeType === 3 ? (so === 0 ? nachbar(sc, -1) : null) : (sc.childNodes[so - 1] && (sc.childNodes[so - 1].nodeType === 3 && !sc.childNodes[so - 1].length ? nachbar(sc.childNodes[so - 1], -1) : sc.childNodes[so - 1]));
    if (davor?.matches?.('ins.aend') && davor.dataset.autor === autor) {
      let t = davor.lastChild; if (!t || t.nodeType !== 3) { t = document.createTextNode(''); davor.appendChild(t); }
      t.appendData(text); caret(t, t.length); return;
    }
    const e = neu('ins'); const t = document.createTextNode(text); e.appendChild(t); r.insertNode(e); caret(t, t.length);
  }

  const blockVon = (n) => { let e = el(n); while (e && !/^(P|H[1-6]|LI|BLOCKQUOTE|TD|TH|DIV|ARTICLE)$/.test(e.tagName)) e = e.parentElement; return e; };
  // Steht die Schreibmarke am Anfang (zurück) bzw. Ende (vor) ihres Absatzes? Dann Absätze normal verbinden.
  function amAbsatzrand(zurueck) {
    const sel = getSelection(); if (!sel.rangeCount || !sel.isCollapsed) return false;
    const r = sel.getRangeAt(0); const b = blockVon(r.startContainer); if (!b) return false;
    const t = document.createRange(); t.selectNodeContents(b);
    if (zurueck) t.setEnd(r.startContainer, r.startOffset); else t.setStart(r.startContainer, r.startOffset);
    // gelöschter (durchgestrichener) Text zählt nicht als Inhalt
    const frag = t.cloneContents(); frag.querySelectorAll?.('del.aend').forEach((d) => d.remove());
    return !frag.textContent.length;
  }
  function loeschen(art) {
    const sel = getSelection(); if (!sel.rangeCount) return;
    const zurueck = /Backward/.test(art);
    const einheit = /Word/.test(art) ? 'word' : /Line|Soft|Hard/.test(art) ? 'lineboundary' : 'character';
    if (sel.isCollapsed) {
      for (let i = 0; i < 400; i++) {
        sel.modify('extend', zurueck ? 'backward' : 'forward', einheit);
        if (sel.isCollapsed) return;
        const r = sel.getRangeAt(0);
        const neuText = textknoten(r.cloneRange()).filter((n) => !inDel(n)).map((n) => n.data).join('');
        if (neuText.length) break;
        // nur schon Gelöschtes erfasst: Schreibmarke dahinter setzen und weiter
        if (zurueck) sel.collapseToStart(); else sel.collapseToEnd();
      }
    }
    if (sel.isCollapsed) return;
    markiereGeloescht(sel.getRangeAt(0), zurueck ? 'zurueck' : 'vor');
  }

  function vorEingabe(e) {
    const t = e.inputType || '';
    if (t === 'insertText' || t === 'insertReplacementText') { const tx = e.data ?? e.dataTransfer?.getData('text/plain'); if (tx == null) return; e.preventDefault(); textEinfuegen(tx); return true; }
    if (t === 'insertFromPaste' || t === 'insertFromDrop') { const tx = e.dataTransfer?.getData('text/plain'); if (!tx) return; e.preventDefault(); textEinfuegen(tx); return true; }
    if (t.startsWith('delete') && t !== 'deleteByDrag') {
      if (/Content(Backward|Forward)$/.test(t) && amAbsatzrand(/Backward/.test(t))) return false; // Absätze verbinden darf der Browser
      e.preventDefault(); loeschen(t); return true;
    }
    return false;
  }

  // ---------- Annehmen / Ablehnen ----------
  const entpacken = (e) => { const p = e.parentNode; while (e.firstChild) p.insertBefore(e.firstChild, e); e.remove(); p.normalize?.(); };
  const annehmen = (e) => (e.tagName === 'INS' ? entpacken(e) : e.remove());
  const ablehnen = (e) => (e.tagName === 'INS' ? e.remove() : entpacken(e));
  const alle = (wurzel) => [...wurzel.querySelectorAll('ins.aend, del.aend')];
  function betroffen(wurzel) {
    const sel = getSelection(); if (!sel.rangeCount) return [];
    const r = sel.getRangeAt(0);
    const hier = el(r.startContainer)?.closest?.('ins.aend, del.aend');
    if (r.collapsed) return hier && wurzel.contains(hier) ? [hier] : [];
    return alle(wurzel).filter((x) => r.intersectsNode(x));
  }
  function springe(wurzel, richtung) {
    const liste = alle(wurzel); if (!liste.length) return null;
    const sel = getSelection(); const r = sel.rangeCount ? sel.getRangeAt(richtung > 0 ? 0 : 0) : null;
    let ziel;
    if (!r) ziel = liste[0];
    else if (richtung > 0) ziel = liste.find((x) => { const p = document.createRange(); p.selectNode(x); return p.compareBoundaryPoints(Range.START_TO_END, r) > 0 && !x.contains(r.endContainer) && r.compareBoundaryPoints(Range.END_TO_START, p) <= 0; }) || liste[0];
    else ziel = [...liste].reverse().find((x) => { const p = document.createRange(); p.selectNode(x); return p.compareBoundaryPoints(Range.END_TO_START, r) < 0 && !x.contains(r.startContainer); }) || liste[liste.length - 1];
    const n = document.createRange(); n.selectNodeContents(ziel); sel.removeAllRanges(); sel.addRange(n);
    ziel.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return ziel;
  }

  // ---------- Vergleich (für Vorschläge der Schwalbe) ----------
  const woerter = (s) => s.match(/\s+|[^\s]+/g) || [];
  function wortDiff(alt, neuT) {
    const a = woerter(alt); const b = woerter(neuT);
    if (a.length * b.length > 400000) return [['-', alt], ['+', neuT]];
    const m = a.length; const n = b.length; const L = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const aus = []; let i = 0; let j = 0;
    const push = (art, t) => { const l = aus[aus.length - 1]; if (l && l[0] === art) l[1] += t; else aus.push([art, t]); };
    while (i < m && j < n) { if (a[i] === b[j]) { push('=', a[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) push('-', a[i++]); else push('+', b[j++]); }
    while (i < m) push('-', a[i++]); while (j < n) push('+', b[j++]);
    return aus;
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Neues HTML gegen den alten Inhalt halten und als Änderungen markiert zurückgeben.
  function alsAenderungen(altHtml, neuHtml) {
    const z = jetzt(); const at = `class="aend" data-autor="${esc(autor)}" data-zeit="${z}"`;
    const teile = (html) => { const d = document.createElement('div'); d.innerHTML = html; return [...d.children]; };
    const A = teile(altHtml); const B = teile(neuHtml);
    const ganz = (x, tag) => { const k = x.cloneNode(true); const w = document.createTreeWalker(k, NodeFilter.SHOW_TEXT); const ns = []; while (w.nextNode()) ns.push(w.currentNode); ns.forEach((n) => { if (!n.data.trim() && !n.data) return; const h = document.createElement(tag); h.className = 'aend'; h.dataset.autor = autor; h.dataset.zeit = z; n.parentNode.insertBefore(h, n); h.appendChild(n); }); return k.outerHTML; };
    // Blöcke über ihren Text paaren (LCS auf Blockebene)
    const ta = A.map((x) => x.textContent.trim()); const tb = B.map((x) => x.textContent.trim());
    const ahnlich = (p, q) => { if (p === q) return true; const w1 = new Set(p.split(/\s+/)); const w2 = q.split(/\s+/); const g = w2.filter((w) => w1.has(w)).length; return g / Math.max(w1.size, w2.length, 1) > 0.4; };
    const m = A.length; const n = B.length; const L = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = A[i].tagName === B[j].tagName && ahnlich(ta[i], tb[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    let out = ''; let i = 0; let j = 0;
    const paar = (x, y) => {
      if (x.innerHTML === y.innerHTML) return x.outerHTML;
      if (/^(UL|OL|TABLE)$/.test(x.tagName) || x.querySelector('img, table, nav') || y.querySelector('img, table, nav')) return ganz(x, 'del') + ganz(y, 'ins');
      if (ta[i] === tb[j]) return y.outerHTML; // nur Formatierung geändert
      const k = y.cloneNode(false);
      k.innerHTML = wortDiff(x.textContent, y.textContent).map(([art, t]) => (art === '=' ? esc(t) : `<${art === '+' ? 'ins' : 'del'} ${at}>${esc(t)}</${art === '+' ? 'ins' : 'del'}>`)).join('');
      return k.outerHTML;
    };
    while (i < m && j < n) {
      if (A[i].tagName === B[j].tagName && ahnlich(ta[i], tb[j])) { out += paar(A[i], B[j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out += ganz(A[i++], 'del'); else out += ganz(B[j++], 'ins');
    }
    while (i < m) out += ganz(A[i++], 'del'); while (j < n) out += ganz(B[j++], 'ins');
    return out;
  }
  // Nur Text in Einfügungen packen (für eingefügte Absätze)
  function alsEinfuegung(html) { const d = document.createElement('div'); d.innerHTML = html; const k = []; const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT); while (w.nextNode()) k.push(w.currentNode); k.forEach((n) => { const h = neu('ins'); n.parentNode.insertBefore(h, n); h.appendChild(n); }); return d.innerHTML; }

  // HTML an der Schreibmarke einfügen, ohne execCommand (das wirft <ins>/<del> weg)
  function htmlEinfuegen(wurzel, html) {
    const sel = getSelection(); if (!sel.rangeCount) return;
    const r = sel.getRangeAt(0); r.collapse(false);
    const t = document.createElement('template'); t.innerHTML = html;
    const block = /^(P|H[1-6]|UL|OL|TABLE|BLOCKQUOTE|HR|NAV|IMG)$/;
    if ([...t.content.children].some((k) => block.test(k.tagName))) {
      let top = el(r.startContainer); while (top && top.parentElement !== wurzel) top = top.parentElement;
      const letzte = t.content.lastChild;
      if (top) top.after(t.content); else wurzel.appendChild(t.content);
      if (letzte) { const n = document.createRange(); n.selectNodeContents(letzte); n.collapse(false); sel.removeAllRanges(); sel.addRange(n); }
    } else {
      const letzte = t.content.lastChild; r.insertNode(t.content);
      if (letzte) { const n = document.createRange(); n.setStartAfter(letzte); n.collapse(true); sel.removeAllRanges(); sel.addRange(n); }
    }
  }

  // Marker aus dem Word-Import (⟦K:1⟧ … ⟦/K:1⟧, ⟦I:3⟧ … ⟦/I⟧, ⟦D:4⟧ … ⟦/D⟧) in echte Elemente verwandeln.
  function markerAufloesen(html, meta = {}) {
    if (!/⟦/.test(html)) return html;
    const d = document.createElement('div'); d.innerHTML = html;
    const knoten = []; const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT); while (w.nextNode()) knoten.push(w.currentNode);
    const offen = { K: [], I: null, D: null };
    for (const n of knoten) {
      if (!/⟦/.test(n.data) && !offen.K.length && !offen.I && !offen.D) continue;
      const teile = n.data.split(/(⟦\/?[KID](?::\d+)?⟧)/);
      const frag = document.createDocumentFragment();
      for (const t of teile) {
        const mk = /^⟦(\/?)([KID])(?::(\d+))?⟧$/.exec(t);
        if (mk) {
          const [, zu, art, id] = mk;
          if (art === 'K') { if (zu) offen.K = offen.K.filter((x) => x !== id); else offen.K.push(id); } else offen[art] = zu ? null : (id || '0');
          continue;
        }
        if (!t) continue;
        let k = document.createTextNode(t);
        const huelle = (tag, info) => { const h = document.createElement(tag); h.className = 'aend'; h.dataset.autor = info?.autor || 'Unbekannt'; h.dataset.zeit = info?.zeit || ''; h.appendChild(k); k = h; };
        if (offen.D) huelle('del', meta[`D${offen.D}`]); else if (offen.I) huelle('ins', meta[`I${offen.I}`]);
        if (offen.K.length) { const s = document.createElement('span'); s.className = 'kom'; s.dataset.kom = `w${offen.K[offen.K.length - 1]}`; s.appendChild(k); k = s; }
        frag.appendChild(k);
      }
      n.replaceWith(frag);
    }
    return d.innerHTML;
  }

  return { setzeAutor: (a) => { autor = String(a || 'Ich').slice(0, 60); }, autor: () => autor, vorEingabe, textEinfuegen, wickle, annehmen, ablehnen, alle, betroffen, springe, alsAenderungen, alsEinfuegung, markerAufloesen, entpacken, htmlEinfuegen };
})();
