'use strict';
// Schwalbe – Oberfläche: Start, Schreibtisch mit Blatt, Helfer links, Einstellungen.
(function () {
  const A = window.SCH;
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Kleinkram ----------
  const ICON = {
    kommentar: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
    spur: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3M4 4h7',
    haken: 'M5 12l5 5L20 7',
    kreuz: 'M6 6l12 12M18 6L6 18',
    abc: 'M4 16l3-9 3 9M5 13h4M13 8v8h3a2 2 0 0 0 0-4h-3m0 0h2.5a2 2 0 0 0 0-4H13M3 20l3 2 5-5',
    auge: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    links: 'M15 18l-6-6 6-6', zahnrad: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    zurueck: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3', vor: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3', plus: 'M12 5v14M5 12h14', muell: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
    export: 'M12 3v12M7 10l5 5 5-5M5 21h14', oeffnen: 'M3 7h6l2 2h10v10H3z', senden: 'M12 19V5M5 12l7-7 7 7', drucker: 'M6 9V3h12v6M6 18H4v-6h16v6h-2M6 14h12v7H6z',
    ul: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01', ol: 'M10 6h10M10 12h10M10 18h10M4 4v4M3 8h2M3 14h2l-2 3h2', links2: 'M3 6h18M3 12h12M3 18h16', mitte: 'M3 6h18M6 12h12M4 18h16', rechts: 'M3 6h18M9 12h12M5 18h16',
    radier: 'M7 21h10M5 15l9-9 5 5-9 9H6z', tabelle: 'M3 4h18v16H3zM3 10h18M3 15h18M9 4v16M15 4v16', bild: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9.5a1.5 1.5 0 1 0 0-.01',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1', umbruch: 'M4 4v5h16V4M4 20v-5h16v5M2 12h3M8 12h3M13 12h3M19 12h3', kalender: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
    marker: 'M15 4l5 5-9 9H6v-5zM4 21h16', einzug: 'M3 6h18M11 10h10M11 14h10M3 18h18M3 9l4 3-4 3', einzugweg: 'M3 6h18M11 10h10M11 14h10M3 18h18M7 9l-4 3 4 3', block: 'M3 6h18M3 12h18M3 18h18',
    lupe: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3', minus: 'M5 12h14', zitat: 'M7 8h4v4H7zM7 12c0 3-1 4-3 5M15 8h4v4h-4zM15 12c0 3-1 4-3 5', strich: 'M4 12h16', pdf: 'M6 2h9l5 5v15H6zM14 2v6h6', word: 'M6 2h9l5 5v15H6zM9 12l1.5 6 1.5-4 1.5 4 1.5-6',
  };
  const sym = (n, g = 16, d = 2) => `<svg width="${g}" height="${g}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${d}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;
  const vogel = (anim, g) => { const v = window.VOGEL?.[anim] || window.VOGEL?.['ruhezustand-2']; return v ? v.replace(/__G__/g, g).replace(' aria-hidden="true"', ' role="img" aria-label="Schwalbe"') : ''; };
  const oriVogel = (g) => { const v = window.ORI?.['ruhezustand-2']; return v ? `<span class="ori-bild">${v.replace(/__G__/g, g)}</span>` : ''; };
  const ORI_SPRUECHE = ['Endlich jemand, der Kommas mag.', 'Sie fliegt schneller, als du tippst.', 'Ich hätte es kürzer gesagt. Sag ich nur.', 'Schöner Satz. Fast so gut wie meine.', 'Lass sie ruhig mitlesen. Sie verrät nichts.'];
  function meldung(text, { knopf, aktion, dauer = 3600 } = {}) {
    document.querySelector('.meldung')?.remove();
    const m = document.createElement('div'); m.className = 'meldung'; m.setAttribute('role', 'status');
    m.innerHTML = `<span>${esc(text)}</span>${knopf ? `<button type="button">${esc(knopf)}</button>` : ''}`;
    if (knopf) m.querySelector('button').onclick = () => { aktion(); m.remove(); };
    document.body.appendChild(m); setTimeout(() => m.remove(), dauer);
  }
  function wann(iso) {
    if (!iso) return '';
    const d = new Date(iso); const j = new Date();
    const zeit = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === j.toDateString()) return `heute ${zeit}`;
    const g = new Date(j); g.setDate(j.getDate() - 1);
    if (d.toDateString() === g.toDateString()) return `gestern ${zeit}`;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function gruss() { const h = new Date().getHours(); return h < 11 ? 'Guten Morgen' : h < 17 ? 'Hallo' : 'Guten Abend'; }

  // ---------- HTML säubern (Einfügen, .docx, Antworten von Claude) ----------
  const ERLAUBT = { H1: 'h1', H2: 'h2', H3: 'h3', P: 'p', DIV: 'p', UL: 'ul', OL: 'ol', LI: 'li', STRONG: 'strong', B: 'strong', EM: 'em', I: 'em', U: 'u', S: 's', STRIKE: 's', DEL: 's', BLOCKQUOTE: 'blockquote', BR: 'br', HR: 'hr', SPAN: 'span', FONT: 'span', A: 'a', SUP: 'sup', SUB: 'sub', TABLE: 'table', THEAD: '', TBODY: '', TFOOT: '', TR: 'tr', TD: 'td', TH: 'th', IMG: 'img', NAV: 'nav', SECTION: 'p', ARTICLE: '', HEADER: '', FOOTER: '' };
  const SCHRIFTEN = ['Calibri', 'Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Segoe UI', 'Courier New', 'Source Serif 4', 'Bricolage Grotesque'];
  const FONT_GROESSE = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 36 };
  const farbeOk = (c) => /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,20})$/i.test(String(c || '').trim());
  function stilVon(k) {
    const st = []; const s = k.style || {};
    if (s.fontSize && /^[\d.]+(pt|px|em|rem|%)$/.test(s.fontSize)) st.push(`font-size:${s.fontSize}`);
    if (s.color && farbeOk(s.color)) st.push(`color:${s.color}`);
    const bg = s.backgroundColor; if (bg && farbeOk(bg) && !/^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/i.test(bg)) st.push(`background-color:${bg}`);
    if (s.fontFamily) st.push(`font-family:${s.fontFamily.replace(/[^\w\s,'"-]/g, '')}`);
    if (s.fontWeight && (s.fontWeight === 'bold' || Number(s.fontWeight) >= 600)) st.push('font-weight:700');
    if (s.fontStyle === 'italic') st.push('font-style:italic');
    if (/underline/.test(s.textDecoration || s.textDecorationLine || '')) st.push('text-decoration:underline');
    if (k.tagName === 'FONT') {
      if (k.getAttribute('color') && farbeOk(k.getAttribute('color'))) st.push(`color:${k.getAttribute('color')}`);
      if (k.getAttribute('face')) st.push(`font-family:${k.getAttribute('face').replace(/[^\w\s,'"-]/g, '')}`);
      if (k.getAttribute('size') && FONT_GROESSE[k.getAttribute('size')]) st.push(`font-size:${FONT_GROESSE[k.getAttribute('size')]}pt`);
    }
    return st;
  }
  function saeubern(html) {
    const doc = new DOMParser().parseFromString(`<div>${String(html || '')}</div>`, 'text/html');
    const raus = (knoten) => {
      let s = '';
      knoten.childNodes.forEach((k) => {
        if (k.nodeType === 3) { s += esc(k.textContent); return; }
        if (k.nodeType !== 1) return;
        const tag = k.tagName;
        if (['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'SVG', 'IFRAME', 'OBJECT', 'BUTTON', 'INPUT'].includes(tag)) return;
        if (k.classList?.contains('nicht-speichern')) return;
        if ((tag === 'INS' || tag === 'DEL') && k.classList.contains('aend')) { const t2 = tag.toLowerCase(); s += `<${t2} class="aend" data-autor="${esc(k.dataset.autor || '')}" data-zeit="${esc(k.dataset.zeit || '')}">${raus(k)}</${t2}>`; return; }
        if (tag === 'SPAN' && k.classList.contains('kom') && /^[\w-]{1,40}$/.test(k.dataset.kom || '')) { const st = stilVon(k); s += `<span class="kom" data-kom="${k.dataset.kom}"${st.length ? ` style="${esc(st.join(';'))}"` : ''}>${raus(k)}</span>`; return; }
        const neu = ERLAUBT[tag];
        if (neu === undefined || neu === '') { s += raus(k); return; }
        if (neu === 'br') { s += '<br>'; return; }
        if (neu === 'hr') { s += k.classList.contains('umbruch') || k.dataset.umbruch !== undefined ? '<hr class="umbruch">' : '<hr>'; return; }
        if (neu === 'img') {
          const src = k.getAttribute('src') || '';
          if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src)) return;
          const w = parseInt(k.style.width || k.getAttribute('width'), 10);
          const aus = /^(left|center|right)$/.test(k.dataset.aus || '') ? ` data-aus="${k.dataset.aus}"` : '';
          s += `<img src="${src}"${w ? ` style="width:${Math.min(w, 2000)}px"` : ''}${aus} alt="">`; return;
        }
        if (neu === 'nav') { if (k.classList.contains('inhalt')) s += '<nav class="inhalt" contenteditable="false"></nav>'; else s += raus(k); return; }
        if (neu === 'a') { const h = k.getAttribute('href') || ''; s += /^(https?:|mailto:)/i.test(h) ? `<a href="${esc(h)}">${raus(k)}</a>` : raus(k); return; }
        if (neu === 'span') { const st = stilVon(k); s += st.length ? `<span style="${esc(st.join(';'))}">${raus(k)}</span>` : raus(k); return; }
        let attr = '';
        if (/^(p|h[123]|li|blockquote)$/.test(neu)) {
          const st = [];
          if (/^(center|right|justify)$/.test(k.style?.textAlign || k.getAttribute('align') || '')) st.push(`text-align:${k.style.textAlign || k.getAttribute('align')}`);
          if (/^[\d.]+$/.test(k.style?.lineHeight || '')) st.push(`line-height:${k.style.lineHeight}`);
          const ml = parseInt(k.style?.marginLeft, 10); if (ml > 0) st.push(`margin-left:${Math.min(ml, 400)}px`);
          if (st.length) attr = ` style="${st.join(';')}"`;
        }
        if (neu === 'td' || neu === 'th') { const cs = parseInt(k.getAttribute('colspan'), 10); if (cs > 1) attr += ` colspan="${Math.min(cs, 20)}"`; if (/^(right|center)$/.test(k.style?.textAlign || '')) attr += ` style="text-align:${k.style.textAlign}"`; }
        if (neu === 'table') { const q = k.dataset.quelle || ''; s += /^albatros:[a-z0-9-]{6,40}:\d{1,3}$/.test(q) ? `<table data-quelle="${q}" data-quelle-name="${esc((k.dataset.quelleName || '').slice(0, 120))}" contenteditable="false">${raus(k)}</table>` : `<table>${raus(k)}</table>`; return; }
        const inhalt = raus(k);
        s += `<${neu}${attr}>${neu === 'td' || neu === 'th' ? (inhalt || '<br>') : inhalt}</${neu}>`;
      });
      return s;
    };
    let s = raus(doc.body.firstChild);
    if (s && !/^\s*<(h[123]|p|ul|ol|blockquote|hr|table|nav|img)/.test(s)) s = `<p>${s}</p>`;
    return s.replace(/<p>\s*<\/p>/g, '<p><br></p>');
  }

  // Blöcke für .docx
  const pt = (v) => { const m = /^([\d.]+)(pt|px)$/.exec(String(v || '')); return m ? (m[2] === 'px' ? Math.round(Number(m[1]) * 0.75 * 2) / 2 : Number(m[1])) : undefined; };
  const zuHex = (c) => { if (!c) return undefined; const d = document.createElement('i'); d.style.color = c; document.body.appendChild(d); const r = getComputedStyle(d).color; d.remove(); const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(r); return m ? `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}` : undefined; };
  function bloecke(wurzel) {
    const aus = [];
    const laeufe = (el) => {
      const liste = [];
      const geh = (k, st) => {
        if (k.nodeType === 3) { if (k.textContent) liste.push({ t: k.textContent.replace(/ /g, ' '), ...st }); return; }
        if (k.nodeType !== 1) return;
        if (k.tagName === 'BR') { liste.push({ t: '\n', ...st }); return; }
        if (k.tagName === 'IMG') return;
        const n = { ...st };
        if (/^(STRONG|B)$/.test(k.tagName)) n.f = true;
        if (/^(EM|I)$/.test(k.tagName)) n.k = true;
        if (k.tagName === 'U') n.u = true;
        if ((k.tagName === 'INS' || k.tagName === 'DEL') && k.classList.contains('aend')) n[k.tagName === 'INS' ? 'ins' : 'del'] = { autor: k.dataset.autor, zeit: k.dataset.zeit };
        else if (/^(S|STRIKE|DEL)$/.test(k.tagName)) n.s = true;
        if (k.classList?.contains('kom') && k.dataset.kom) n.kom = k.dataset.kom;
        if (k.tagName === 'SUP') n.hoch = true;
        if (k.tagName === 'SUB') n.tief = true;
        if (k.tagName === 'A' && k.getAttribute('href')) n.link = k.getAttribute('href');
        if (k.tagName === 'SPAN' || k.tagName === 'FONT') {
          const s = k.style;
          if (s.fontSize) n.groesse = pt(s.fontSize) || n.groesse;
          if (s.color) n.farbe = zuHex(s.color);
          if (s.backgroundColor) n.mark = zuHex(s.backgroundColor);
          if (s.fontFamily) n.schrift = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
          if (s.fontWeight === '700' || s.fontWeight === 'bold') n.f = true;
          if (s.fontStyle === 'italic') n.k = true;
          if (/underline/.test(s.textDecoration)) n.u = true;
        }
        k.childNodes.forEach((c) => geh(c, n));
      };
      el.childNodes.forEach((c) => geh(c, {}));
      while (liste.length && liste[liste.length - 1].t === '\n') liste.pop();
      return liste;
    };
    const ausr = (el) => (/^(center|right|justify)$/.test(el.style?.textAlign || '') ? el.style.textAlign : undefined);
    const abst = (el) => (/^[\d.]+$/.test(el.style?.lineHeight || '') ? Number(el.style.lineHeight) : undefined);
    const bilder = (el) => el.querySelectorAll('img').forEach((img) => {
      const m = /^data:image\/(png|jpe?g|gif);base64,(.+)$/i.exec(img.getAttribute('src') || ''); if (!m) return;
      aus.push({ art: 'bild', typ: m[1].toLowerCase(), daten: m[2], breite: img.width || img.naturalWidth, hoehe: img.height || img.naturalHeight, ausrichtung: img.dataset.aus });
    });
    const block = (k) => {
      if (k.nodeType === 3) { if (k.textContent.trim()) aus.push({ art: 'p', laeufe: [{ t: k.textContent }] }); return; }
      if (k.nodeType !== 1 || k.classList.contains('nicht-speichern')) return;
      const t = k.tagName;
      if (/^H[123]$/.test(t)) aus.push({ art: t.toLowerCase(), ausrichtung: ausr(k), laeufe: laeufe(k) });
      else if (t === 'UL' || t === 'OL') {
        const li = (liste, ebene) => liste.querySelectorAll(':scope > li').forEach((x) => {
          const kopie = x.cloneNode(true); kopie.querySelectorAll('ul,ol').forEach((u) => u.remove());
          aus.push({ art: liste.tagName.toLowerCase(), ebene, laeufe: laeufe(kopie) });
          x.querySelectorAll(':scope > ul, :scope > ol').forEach((u) => li(u, Math.min(ebene + 1, 2)));
        });
        li(k, 0);
      } else if (t === 'BLOCKQUOTE') aus.push({ art: 'zitat', laeufe: laeufe(k) });
      else if (t === 'HR') aus.push(k.classList.contains('umbruch') ? { art: 'umbruch' } : { art: 'p', laeufe: [{ t: '—————' }], ausrichtung: 'center' });
      else if (t === 'NAV' && k.classList.contains('inhalt')) aus.push({ art: 'inhalt' });
      else if (t === 'TABLE') aus.push({ art: 'tabelle', zeilen: [...k.rows].map((r) => [...r.cells].map((c) => ({ kopf: c.tagName === 'TH', laeufe: laeufe(c) }))) });
      else if (t === 'IMG') bilder({ querySelectorAll: () => [k] });
      else {
        const l = laeufe(k);
        if (l.length || !k.querySelector('img')) aus.push({ art: 'p', ausrichtung: ausr(k), abstand: abst(k), laeufe: l });
        bilder(k);
      }
    };
    wurzel.childNodes.forEach(block);
    return aus;
  }

  const S = { ansicht: 'start', liste: [], d: null, verlauf: [], denkt: false, helferZu: false, bereich: null, einst: null };
  try { S.helferZu = localStorage.getItem('helferZu') === 'ja'; } catch { /* egal */ }

  // ---------- Start ----------
  const VORLAGEN = [
    { k: 'brief', titel: 'Brief', unter: 'Mit Ort, Datum, Anrede und Gruß.', html: () => `<p>[Dein Name]<br>[Straße]<br>[PLZ Ort]</p><p><br></p><p>[Empfänger]<br>[Straße]<br>[PLZ Ort]</p><p style="text-align:right">[Ort], ${new Date().toLocaleDateString('de-DE')}</p><h2>[Betreff]</h2><p>Sehr geehrte Damen und Herren,</p><p><br></p><p>Mit freundlichen Grüßen</p><p>[Dein Name]</p>`, deko: 'brief' },
    { k: 'einladung', titel: 'Einladung', unter: 'Für Feier, Treffen oder Team.', html: () => '<h1>Einladung</h1><p>Liebe alle,</p><p>wir laden euch herzlich ein zu …</p><h2>Wann &amp; wo</h2><p>[Datum], ab [Uhrzeit] in [Ort]</p><h2>Programm</h2><ul><li>…</li></ul><h2>Anmeldung</h2><p>Gebt bis [Datum] kurz Bescheid.</p>', deko: 'einladung' },
    { k: 'notiz', titel: 'Notizen', unter: 'Besprechung mit To-dos.', html: () => `<h1>Besprechung ${new Date().toLocaleDateString('de-DE')}</h1><p><strong>Dabei:</strong> …</p><h2>Themen</h2><ol><li>…</li></ol><h2>To-dos</h2><ul><li>… (wer, bis wann)</li></ul>`, deko: 'notiz' },
    { k: 'leer', titel: 'Leeres Blatt', unter: 'Einfach losschreiben.', html: () => '<h1>Neues Dokument</h1><p><br></p>', deko: 'leer' },
  ];
  async function zeigeStart() {
    S.ansicht = 'start'; S.d = null;
    S.liste = await A.dokumente.liste();
    S.einst = await A.einstellungen.lesen();
    if (!S.autorGesetzt) { S.autorGesetzt = true; Pruefen.setzeAutor(S.einst?.name || await A.systemName?.() || 'Ich'); }
    const wer = S.einst?.weg === 'api' ? 'API' : S.einst?.weg === 'heim' ? 'Heim-PC' : `Claude · ${esc(S.einst?.claudeModell || 'opus')}`;
    app.innerHTML = `<header class="kopf"><span class="marke">${vogel('ruhezustand-2', 34)}<b>Schwalbe</b></span><div class="platz"></div>
        <span class="chip">${wer}</span>
        <button type="button" class="oo-hilfe" data-aktion="rundgang" title="Kurzer Rundgang" aria-label="Kurzer Rundgang">?</button>
        <button type="button" class="rund" data-aktion="importieren" title="Datei öffnen" aria-label="Datei öffnen">${sym('oeffnen', 18)}</button>
        <button type="button" class="rund" data-aktion="einstellungen" title="Einstellungen" aria-label="Einstellungen">${sym('zahnrad', 18)}</button></header>
      <main class="inhalt start">
        <p class="hand gruss">${gruss()}, Nils – was schreiben wir?</p>
        <h1 class="gross">Was willst du schreiben?</h1>
        <div class="karte wunsch"><textarea id="startwunsch" rows="2" placeholder="Ein Satz reicht, z. B. „Kündigung für mein Fitnessstudio zum Monatsende“"></textarea>
          <div class="reihe"><span class="leise">Die Schwalbe schreibt dir einen ersten Entwurf.</span><div class="platz"></div><button type="button" class="btn" data-aktion="startschreiben">Schreiben ${sym('senden', 14, 2.4)}</button></div></div>
        <div class="vorlagen">${VORLAGEN.map((v) => `<button type="button" class="karte vorlage" data-aktion="vorlage" data-k="${v.k}"><span class="deko deko-${v.deko}"><i></i><i></i><i></i><i></i></span><b>${esc(v.titel)}</b><small>${esc(v.unter)}</small></button>`).join('')}</div>
        <div class="unten">
          <section class="karte zuletzt"><div class="reihe"><h2>Zuletzt geschrieben</h2><div class="platz"></div><button type="button" class="btn weiss klein" data-aktion="neu">${sym('plus', 15)} Leeres Blatt</button></div>
            ${S.liste.length ? S.liste.slice(0, 8).map((d) => `<div class="datei" role="button" tabindex="0" data-aktion="oeffne" data-id="${esc(d.id)}"><span class="dateiblatt"></span><span class="dt"><b>${esc(d.name)}</b><small>${esc(d.anfang || 'leer')}</small></span><span class="leise">${d.woerter} Wörter · ${esc(wann(d.geaendert))}</span><button type="button" class="rund klein" data-aktion="loeschen" data-id="${esc(d.id)}" aria-label="Löschen">${sym('muell', 15)}</button></div>`).join('') : `<div class="leer">${vogel('liest', 46)}<span>Noch nichts geschrieben. Nimm oben eine Vorlage oder schreib los.</span></div>`}</section>
          <section class="karte mitgebracht"><h2>Word-Datei mitgebracht?</h2><div class="ablage" data-aktion="importieren"><b>Datei hierher ziehen</b><small>.docx oder .txt</small></div><button type="button" class="btn weiss breit" data-aktion="importieren">${sym('oeffnen', 15)} Datei öffnen</button></section>
        </div>
      </main>`;
    const w = app.querySelector('#startwunsch');
    w.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); aktionen.startschreiben(); } });
    setTimeout(() => window.Rundgang?.start(RUNDGANG_START()), 500);
  }

  // ---------- Dokument ----------
  async function oeffne(id) {
    const d = await A.dokumente.lesen(id);
    if (d?.fehler) { meldung('Dokument nicht gefunden.'); return zeigeStart(); }
    if (/⟦/.test(d.html || '')) {
      d.html = saeubern(Pruefen.markerAufloesen(d.html, d.aenderungen || {}));
      await A.dokumente.speichern({ id: d.id, name: d.name, html: d.html, kommentare: d.kommentare || [], markerFertig: true });
    }
    d.kommentare ||= [];
    S.d = d; S.verlauf = []; zeigeDokument();
  }
  let speicherUhr = null;
  function geaendert() {
    if (!S.d) return;
    const chip = app.querySelector('.gespeichert'); if (chip) chip.textContent = 'speichert …';
    clearTimeout(speicherUhr);
    speicherUhr = setTimeout(async () => {
      S.d.html = blatt() ? saeubern(blatt().innerHTML) : S.d.html;
      const r = await A.dokumente.speichern({ id: S.d.id, name: S.d.name, html: S.d.html, kopf: S.d.kopf || '', fuss: S.d.fuss || '', seitenzahlen: Boolean(S.d.seitenzahlen), kommentare: S.d.kommentare || [], verfolgen: Boolean(S.d.verfolgen) });
      const c = app.querySelector('.gespeichert'); if (c) c.textContent = r?.fehler ? 'nicht gespeichert!' : 'gespeichert';
    }, 600);
    zaehle(); gliederung(); clearTimeout(S.ivUhr); S.ivUhr = setTimeout(inhaltAktualisieren, 400);
    clearTimeout(S.komUhr); S.komUhr = setTimeout(() => { zeichneKommentare(); if (S.reiter === 'pruefen') { const z = app.querySelector('.aend-zahl'); const n = Pruefen.alle(blatt()).length; if (z) z.textContent = n ? `${n} Änderung${n === 1 ? '' : 'en'}` : ''; } }, 250);
  }
  const blatt = () => app.querySelector('.seite');

  const REITER = [['start', 'Start'], ['einfuegen', 'Einfügen'], ['seite', 'Seite'], ['pruefen', 'Überprüfen']];
  const GROESSEN = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];
  const MARKER = ['#fff59d', '#c8f7c5', '#b3e5fc', '#f8bbd0', '#ffe0b2', 'transparent'];
  const TEXTFARBEN = ['#1d1d1d', '#1e3f75', '#2c5aa0', '#b23a28', '#d2541b', '#2f7a4d', '#6a4fc7', '#7a7f8e'];
  function wz(cmd, inhalt, titel, extra = '') { return `<button type="button" class="wz" data-cmd="${cmd}" title="${esc(titel)}" aria-label="${esc(titel)}"${extra}>${inhalt}</button>`; }
  function wa(akt, inhalt, titel, extra = '') { return `<button type="button" class="wz" data-aktion="${akt}" title="${esc(titel)}" aria-label="${esc(titel)}"${extra}>${inhalt}</button>`; }
  const TZ = '<span class="tz"></span>';
  function wz2(akt, inhalt, titel, aus) { return `<button type="button" class="wz" data-aktion="${akt}" title="${esc(titel)}" aria-label="${esc(titel)}"${aus ? ' disabled' : ''}>${inhalt}</button>`; }
  function leiste() {
    const r = S.reiter || 'start';
    if (r === 'einfuegen') return `${wa('tabelle', `${sym('tabelle', 17)} Tabelle`, 'Tabelle einfügen')}${wa('albatros', `${sym('tabelle', 17)} Aus Albatros`, 'Tabelle aus Albatros einfügen – bleibt live und rechnet mit')}${wa('bild', `${sym('bild', 17)} Bild`, 'Bild einfügen')}${wa('link', `${sym('link', 17)} Link`, 'Link einfügen (Strg+K)')}${TZ}${wa('umbruch', `${sym('umbruch', 17)} Seitenumbruch`, 'Seitenumbruch (Strg+Enter)')}${wa('inhalt', `${sym('ul', 17)} Inhaltsverzeichnis`, 'Inhaltsverzeichnis einfügen')}${wa('linie', `${sym('strich', 17)} Linie`, 'Trennlinie')}${TZ}${wa('datum', `${sym('kalender', 17)} Datum`, 'Heutiges Datum')}${wz('superscript', 'x²', 'Hochgestellt')}${wz('subscript', 'x₂', 'Tiefgestellt')}`;
    if (r === 'pruefen') {
      const n = blatt() ? Pruefen.alle(blatt()).length : 0;
      return `${wa('kommentar', `${sym('kommentar', 17)} Kommentar`, 'Kommentar zur Markierung (Strg+Alt+M)')}${TZ}
        ${wa('verfolgen', `${sym('spur', 17)} Verfolgen`, 'Änderungen verfolgen an/aus (Strg+Umschalt+E)', ` aria-pressed="${Boolean(S.d.verfolgen)}"`)}
        ${wa('endfassung', `${sym('auge', 17)} ${S.endfassung ? 'Endfassung' : 'Markiert'}`, 'Umschalten: Änderungen zeigen oder Endfassung ansehen', ` aria-pressed="${Boolean(S.endfassung)}"`)}${TZ}
        ${wz2('aend-zurueck', sym('zurueck', 16), 'Vorherige Änderung', !n)}${wz2('aend-vor', sym('vor', 16), 'Nächste Änderung', !n)}
        ${wa('aend-an', `${sym('haken', 16)} Annehmen`, 'Änderung an der Schreibmarke annehmen')}${wa('aend-ab', `${sym('kreuz', 16)} Ablehnen`, 'Änderung an der Schreibmarke ablehnen')}
        ${wa('aend-alle-an', `${sym('haken', 16)} Alle`, 'Alle Änderungen annehmen')}${wa('aend-alle-ab', `${sym('kreuz', 16)} Alle`, 'Alle Änderungen ablehnen')}${TZ}
        ${wa('rechtschreibung', `${sym('abc', 17)} Rechtschreibung`, 'Rote Wellenlinien an/aus – Rechtsklick zeigt Vorschläge', ` aria-pressed="${S.rechtschreibung !== false}"`)}<span class="leise aend-zahl">${n ? `${n} Änderung${n === 1 ? '' : 'en'}` : ''}</span>`;
    }
    if (r === 'seite') return `<label class="wz-feld">Kopfzeile<input class="kf" data-kf="kopf" value="${esc(S.d.kopf || '')}" placeholder="z. B. Firma · Thema"></label><label class="wz-feld">Fußzeile<input class="kf" data-kf="fuss" value="${esc(S.d.fuss || '')}" placeholder="z. B. Name"></label><label class="wz-haken"><input type="checkbox" class="kf-seiten" ${S.d.seitenzahlen ? 'checked' : ''}> Seitenzahlen</label>${TZ}${wa('suchen', `${sym('lupe', 17)} Suchen & Ersetzen`, 'Suchen & Ersetzen (Strg+F)')}`;
    return `${wz('undo', sym('zurueck', 16), 'Rückgängig (Strg+Z)')}${wz('redo', sym('vor', 16), 'Wiederholen (Strg+Y)')}${TZ}
      <select class="absatz" aria-label="Absatzart" title="Absatzart"><option value="p">Text</option><option value="h1">Überschrift 1</option><option value="h2">Überschrift 2</option><option value="h3">Überschrift 3</option><option value="blockquote">Zitat</option></select>
      <select class="schrift" aria-label="Schriftart" title="Schriftart"><option value="">Schrift</option>${SCHRIFTEN.map((f) => `<option style="font-family:'${f}'">${f}</option>`).join('')}</select>
      <select class="groesse" aria-label="Schriftgröße" title="Schriftgröße"><option value="">Größe</option>${GROESSEN.map((g) => `<option value="${g}">${g}</option>`).join('')}</select>${TZ}
      ${wz('bold', '<b>F</b>', 'Fett (Strg+B)')}${wz('italic', '<i style="font-family:\'Source Serif 4\',serif">K</i>', 'Kursiv (Strg+I)')}${wz('underline', '<u>U</u>', 'Unterstrichen (Strg+U)')}${wz('strikeThrough', '<s>S</s>', 'Durchgestrichen')}
      <span class="farbwahl"><button type="button" class="wz" data-aktion="farbmenue" data-art="farbe" title="Schriftfarbe" aria-label="Schriftfarbe"><span class="A">A</span><i class="balken" style="background:${S.farbe || '#b23a28'}"></i></button><button type="button" class="wz" data-aktion="farbmenue" data-art="mark" title="Textmarker" aria-label="Textmarker">${sym('marker', 16)}<i class="balken" style="background:${S.mark || '#fff59d'}"></i></button></span>${TZ}
      ${wz('insertUnorderedList', sym('ul', 17), 'Aufzählung')}${wz('insertOrderedList', sym('ol', 17), 'Nummerierung')}${wz('outdent', sym('einzugweg', 17), 'Einzug verkleinern')}${wz('indent', sym('einzug', 17), 'Einzug vergrößern')}${TZ}
      ${wz('justifyLeft', sym('links2', 17), 'Linksbündig')}${wz('justifyCenter', sym('mitte', 17), 'Zentriert')}${wz('justifyRight', sym('rechts', 17), 'Rechtsbündig')}${wz('justifyFull', sym('block', 17), 'Blocksatz')}
      <select class="abstand" aria-label="Zeilenabstand" title="Zeilenabstand"><option value="">Abstand</option>${['1.0', '1.15', '1.5', '2.0'].map((v) => `<option>${v}</option>`).join('')}</select>${TZ}
      ${wz('removeFormat', sym('radier', 17), 'Formatierung entfernen')}`;
  }
  function zeigeLeiste() { const l = app.querySelector('.oo-leiste'); if (l) l.innerHTML = leiste(); app.querySelectorAll('.oo-menue [data-reiter]').forEach((m) => m.classList.toggle('an', m.dataset.reiter === (S.reiter || 'start'))); auswahlGeaendert(); }
  function kopfFussZeigen() {
    const k = app.querySelector('.kopfzeile'); const f = app.querySelector('.fusszeile');
    if (k) { k.textContent = S.d.kopf || ''; k.hidden = !S.d.kopf; }
    if (f) { f.innerHTML = `<span>${esc(S.d.fuss || '')}</span><span>${S.d.seitenzahlen ? 'Seite 1 von <b class="seitenzahl">1</b>' : ''}</span>`; f.hidden = !S.d.fuss && !S.d.seitenzahlen; }
  }

  function zeigeDokument() {
    S.ansicht = 'dokument';
    app.innerHTML = `<header class="oo-kopf">
        <button type="button" class="oo-ikon" data-aktion="start" title="Alle Dokumente" aria-label="Alle Dokumente">${vogel('ruhezustand-2', 30)}</button><b class="oo-app">Schwalbe</b>
        <div class="oo-dok"><b data-aktion="umbenennen" title="Zum Umbenennen klicken">${esc(S.d.name)}</b><small><span class="gespeichert">gespeichert</span></small></div>
        <nav class="oo-menue" aria-label="Menü">
          <div class="datei-wrap"><button type="button" class="m" data-aktion="dateimenue" aria-haspopup="true">Datei ▾</button></div>
          ${REITER.map(([k, t]) => `<button type="button" class="m${(S.reiter || 'start') === k ? ' an' : ''}" data-reiter="${k}">${t}</button>`).join('')}
        </nav>
        <div class="platz"></div>
        <button type="button" class="oo-teilen" data-aktion="docx" title="Als Word speichern (Strg+S)">Als Word</button>
        <button type="button" class="oo-hilfe" data-aktion="rundgang" title="Kurzer Rundgang" aria-label="Kurzer Rundgang">?</button>
        <button type="button" class="oo-ori" data-aktion="ori" title="Schwalbe fragen">${oriVogel(24)}Ori</button>
      </header>
      <main class="oo-flaeche">
        <svg class="oo-berge" aria-hidden="true" viewBox="0 0 1440 220" preserveAspectRatio="none"><path d="M0 130 C 300 80 600 170 900 120 S 1300 90 1440 120 V220 H0Z" fill="#4f7cc0" opacity=".35"/><path d="M0 180 C 360 150 700 210 1000 175 S 1340 165 1440 180 V220 H0Z" fill="#2c5aa0" opacity=".85"/></svg>
        <div class="oo-inhalt${S.helferZu ? ' zu' : ''}">
          <div class="oo-links">
            <div class="oo-sitzvogel" aria-hidden="true">${vogel('ruhezustand-2', 84)}</div>
            <aside class="oo-seite helfer" aria-label="Schwalbe hilft"></aside>
            <div class="oo-schiene"><button type="button" class="oo-klapp" data-aktion="helfer-klappen" aria-label="Schwalbe zeigen">›</button><button type="button" class="oo-schienenvogel" data-aktion="helfer-klappen" aria-label="Schwalbe">${vogel('ruhezustand-2', 34)}</button></div>
          </div>
          <div class="oo-rechts">
            <div class="oo-leiste" role="toolbar" aria-label="Werkzeuge">${leiste()}</div>
            <div class="oo-karte">
              <div class="schreibtisch">
                <nav class="gliederung" aria-label="Gliederung"></nav>
                <div class="blattrahmen"><div class="perforation" aria-hidden="true"></div>
                  <div class="kopfzeile nicht-speichern" aria-label="Kopfzeile" data-aktion="reiter-seite" title="Kopfzeile ändern: Reiter „Seite“"></div>
                  <article class="seite${S.endfassung ? ' endfassung' : ''}" contenteditable="true" spellcheck="${S.rechtschreibung !== false}" aria-label="Dokument">${saeubern(S.d.html)}</article>
                  <div class="fusszeile nicht-speichern" aria-label="Fußzeile" data-aktion="reiter-seite" title="Fußzeile ändern: Reiter „Seite“"></div>
                </div>
                <aside class="randspalte" aria-label="Kommentare"></aside>
              </div>
              <div class="schwebeleiste" hidden></div>
              <footer class="statuszeile"><span class="zahlen"></span><div class="platz"></div><span class="markiert"></span><span class="zoom"><button type="button" data-aktion="zoom" data-d="-10" aria-label="Kleiner">−</button><b>${S.zoom || 100} %</b><button type="button" data-aktion="zoom" data-d="10" aria-label="Größer">+</button></span></footer>
            </div>
          </div>
        </div>
      </main>`;
    const s = blatt();
    if (S.zoom && S.zoom !== 100) app.querySelector('.blattrahmen').style.zoom = S.zoom / 100;
    s.addEventListener('input', geaendert);
    s.addEventListener('beforeinput', (ev) => { if (S.d.verfolgen && Pruefen.vorEingabe(ev)) geaendert(); });
    s.addEventListener('click', (ev) => { const k = ev.target.closest?.('span.kom'); if (k) komAktiv(k.dataset.kom); });
    s.addEventListener('paste', (ev) => {
      const bild = [...(ev.clipboardData.items || [])].find((i) => i.type.startsWith('image/'));
      if (bild) { ev.preventDefault(); bildEinfuegen(bild.getAsFile()); return; }
      ev.preventDefault();
      const html = ev.clipboardData.getData('text/html');
      const text = ev.clipboardData.getData('text/plain');
      if (S.d.verfolgen) { Pruefen.textEinfuegen(text); geaendert(); return; }
      if (html) document.execCommand('insertHTML', false, saeubern(html));
      else document.execCommand('insertText', false, text);
    });
    s.addEventListener('drop', (ev) => {
      const f = [...(ev.dataTransfer?.files || [])].find((x) => x.type.startsWith('image/'));
      if (f) { ev.preventDefault(); ev.stopPropagation(); bildEinfuegen(f); }
      else if (ev.dataTransfer?.files?.length) ev.preventDefault();
    });
    s.addEventListener('click', (ev) => {
      S.live = ev.target.closest('table[data-quelle]') || null; if (S.live) zeigeSchwebe();
      const img = ev.target.closest('img');
      app.querySelectorAll('.seite img.gewaehlt').forEach((x) => x !== img && x.classList.remove('gewaehlt'));
      if (img) { img.classList.add('gewaehlt'); S.bild = img; zeigeSchwebe(); }
      else { S.bild = null; }
      const a = ev.target.closest('a[href]');
      if (a && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); A.linkOeffnen?.(a.getAttribute('href')); }
    });
    s.addEventListener('keydown', (ev) => {
      const k = ev.key.toLowerCase();
      if (ev.ctrlKey && !ev.shiftKey && k === 's') { ev.preventDefault(); aktionen.docx(); }
      if (ev.ctrlKey && k === 'p') { ev.preventDefault(); aktionen.drucken(); }
      if (ev.ctrlKey && (k === 'f' || k === 'h')) { ev.preventDefault(); aktionen.suchen(); }
      if (ev.ctrlKey && k === 'k') { ev.preventDefault(); aktionen.link(); }
      if (ev.ctrlKey && ev.altKey && k === 'm') { ev.preventDefault(); aktionen.kommentar(); }
      if (ev.ctrlKey && ev.shiftKey && k === 'e') { ev.preventDefault(); aktionen.verfolgen(); }
      if (ev.ctrlKey && ev.key === 'Enter') { ev.preventDefault(); aktionen.umbruch(); }
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && S.bild && S.bild.classList.contains('gewaehlt')) { ev.preventDefault(); aktionen['bild-weg'](); }
      if (ev.key === 'Tab') {
        const zelle = getSelection().anchorNode?.parentElement?.closest?.('td,th');
        if (zelle) { ev.preventDefault(); zellSprung(zelle, ev.shiftKey ? -1 : 1); }
        else if (getSelection().anchorNode?.parentElement?.closest?.('li')) { ev.preventDefault(); document.execCommand(ev.shiftKey ? 'outdent' : 'indent'); }
      }
    });
    app.querySelector('.schreibtisch').addEventListener('scroll', zeigeSchwebe, { passive: true });
    document.addEventListener('selectionchange', auswahlGeaendert);
    zeichneHelfer(); zaehle(); gliederung(); kopfFussZeigen(); inhaltAktualisieren(); auswahlGeaendert(); zeichneKommentare();
    if (s.querySelector('table[data-quelle]')) liveAktualisieren();
    // Neues, leeres Dokument: Schreibmarke in den ersten Absatz nach der Überschrift (nicht die Überschrift markieren)
    if (!s.textContent.trim() || s.textContent.trim() === 'Neues Dokument') {
      let ziel = s.querySelector('h1 + p') || s.querySelector('p');
      if (!ziel) { ziel = document.createElement('p'); ziel.innerHTML = '<br>'; s.appendChild(ziel); }
      const r = document.createRange(); r.selectNodeContents(ziel); r.collapse(true); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); s.focus();
    }
    setTimeout(() => window.Rundgang?.start(RUNDGANG()), 600);
  }

  // ---------- Tabellen ----------
  function zellSprung(zelle, d) {
    const tab = zelle.closest('table'); const alle = [...tab.querySelectorAll('td,th')]; let i = alle.indexOf(zelle) + d;
    if (i >= alle.length) { tabZeile(1); i = alle.length; }
    const z = [...tab.querySelectorAll('td,th')][Math.max(0, i)]; if (!z) return;
    const r = document.createRange(); r.selectNodeContents(z); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }
  const aktZelle = () => { const n = getSelection().anchorNode; const el = n?.nodeType === 1 ? n : n?.parentElement; return inBlatt(el) ? el?.closest('td,th') : null; };
  function tabZeile(d) {
    const z = aktZelle(); if (!z) return; const tr = z.parentElement; const neu = tr.cloneNode(true);
    neu.querySelectorAll('td,th').forEach((c) => { const td = document.createElement('td'); td.innerHTML = '<br>'; c.replaceWith(td); });
    if (d > 0) tr.after(neu); else tr.before(neu); geaendert(); zeigeSchwebe();
  }
  function tabSpalte(d) {
    const z = aktZelle(); if (!z) return; const i = z.cellIndex;
    [...z.closest('table').rows].forEach((r, ri) => { const c = r.cells[Math.min(i, r.cells.length - 1)]; const n = document.createElement(ri === 0 && c.tagName === 'TH' ? 'th' : 'td'); n.innerHTML = '<br>'; if (d > 0) c.after(n); else c.before(n); });
    geaendert(); zeigeSchwebe();
  }
  function tabWeg(was) {
    const z = aktZelle(); if (!z) return; const tab = z.closest('table');
    if (was === 'zeile') { if (tab.rows.length > 1) z.parentElement.remove(); else tab.remove(); }
    else if (was === 'spalte') { const i = z.cellIndex; if (tab.rows[0].cells.length > 1) [...tab.rows].forEach((r) => r.cells[Math.min(i, r.cells.length - 1)]?.remove()); else tab.remove(); }
    else tab.remove();
    geaendert(); zeigeSchwebe();
  }
  function tabKopf() {
    const z = aktZelle(); if (!z) return; const r0 = z.closest('table').rows[0];
    const zuTh = r0.cells[0].tagName !== 'TH';
    [...r0.cells].forEach((c) => { const n = document.createElement(zuTh ? 'th' : 'td'); n.innerHTML = c.innerHTML; c.replaceWith(n); });
    geaendert();
  }

  // ---------- Bilder ----------
  function bildEinfuegen(datei) {
    if (!datei || !/^image\/(png|jpe?g|gif|webp)$/.test(datei.type)) { meldung('Nur PNG, JPG oder GIF.'); return; }
    if (datei.size > 15 * 1024 * 1024) { meldung('Das Bild ist zu groß (max. 15 MB).'); return; }
    const leser = new FileReader();
    leser.onload = () => {
      const img = new Image();
      img.onload = () => {
        // große Fotos verkleinern, damit Dokumente schlank bleiben; WebP → PNG (Word kennt kein WebP)
        const max = 1600; const f = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const jpg = /jpe?g/.test(datei.type);
        const url = c.toDataURL(jpg ? 'image/jpeg' : 'image/png', 0.88);
        const w = Math.min(c.width, 620);
        bereichZurueck();
        document.execCommand('insertHTML', false, `<img src="${url}" style="width:${w}px" alt="">`);
        geaendert();
      };
      img.src = leser.result;
    };
    leser.readAsDataURL(datei);
  }

  // ---------- Schwebeleiste für Tabelle oder Bild ----------
  function zeigeSchwebe() {
    const sl = app.querySelector('.schwebeleiste'); if (!sl) return;
    const z = aktZelle(); const img = S.bild && S.bild.isConnected && S.bild.classList.contains('gewaehlt') ? S.bild : null;
    const live = !img && S.live?.isConnected ? S.live : null;
    const ziel = img || live || z?.closest('table');
    if (!ziel) { sl.hidden = true; return; }
    sl.innerHTML = live
      ? `<span class="sl-titel">Live aus Albatros</span><span class="sl-live">${esc(live.dataset.quelleName || '')}</span><button type="button" data-aktion="live-neu">Aktualisieren</button><button type="button" data-aktion="live-oeffnen">In Albatros öffnen</button><button type="button" data-aktion="live-loesen">Verknüpfung lösen</button><button type="button" data-aktion="live-weg" class="rot">Löschen</button>`
      : img
      ? `<span class="sl-titel">Bild</span><button type="button" data-aktion="bild-groesse" data-d="-0.15">${sym('minus', 15)} Kleiner</button><button type="button" data-aktion="bild-groesse" data-d="0.15">${sym('plus', 15)} Größer</button><span class="tz"></span><button type="button" data-aktion="bild-aus" data-a="left">${sym('links2', 15)}</button><button type="button" data-aktion="bild-aus" data-a="center">${sym('mitte', 15)}</button><button type="button" data-aktion="bild-aus" data-a="right">${sym('rechts', 15)}</button><span class="tz"></span><button type="button" data-aktion="bild-weg" class="rot">${sym('muell', 15)} Löschen</button>`
      : `<span class="sl-titel">Tabelle</span><button type="button" data-aktion="tab" data-w="zeile-oben">Zeile ↑</button><button type="button" data-aktion="tab" data-w="zeile-unten">Zeile ↓</button><button type="button" data-aktion="tab" data-w="spalte-links">Spalte ←</button><button type="button" data-aktion="tab" data-w="spalte-rechts">Spalte →</button><span class="tz"></span><button type="button" data-aktion="tab" data-w="kopf">Kopfzeile</button><span class="tz"></span><button type="button" data-aktion="tab" data-w="weg-zeile" class="rot">− Zeile</button><button type="button" data-aktion="tab" data-w="weg-spalte" class="rot">− Spalte</button><button type="button" data-aktion="tab" data-w="weg" class="rot">${sym('muell', 15)}</button>`;
    const karte = app.querySelector('.oo-karte').getBoundingClientRect(); const r = ziel.getBoundingClientRect();
    sl.hidden = false;
    const top = Math.min(Math.max(8, r.top - karte.top - sl.offsetHeight - 8), karte.height - sl.offsetHeight - 44);
    sl.style.top = `${top}px`; sl.style.left = `${Math.max(8, Math.min(r.left - karte.left, karte.width - sl.offsetWidth - 8))}px`;
  }

  // ---------- Inhaltsverzeichnis ----------
  function inhaltAktualisieren() {
    const s = blatt(); if (!s) return;
    const h = [...s.querySelectorAll('h1,h2,h3')].filter((x) => x.textContent.trim() && !x.closest('nav.inhalt'));
    s.querySelectorAll('nav.inhalt').forEach((n) => {
      n.setAttribute('contenteditable', 'false');
      n.innerHTML = `<b class="nicht-speichern">Inhalt</b>${h.length ? h.map((x, i) => `<div class="iv iv-${x.tagName.toLowerCase()} nicht-speichern" data-aktion="springe" data-i="${i}">${esc(x.textContent.trim())}</div>`).join('') : '<div class="iv nicht-speichern">Noch keine Überschriften.</div>'}`;
    });
  }

  // ---------- Suchen & Ersetzen ----------
  function sucheTreffer(begriff, gross) {
    const s = blatt(); const treffer = []; if (!begriff) return treffer;
    const w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
    const b = gross ? begriff : begriff.toLowerCase();
    while (w.nextNode()) {
      const n = w.currentNode; const t = gross ? n.textContent : n.textContent.toLowerCase();
      let i = t.indexOf(b); while (i >= 0) { treffer.push({ n, i }); i = t.indexOf(b, i + b.length); }
    }
    return treffer;
  }
  function suchFenster() {
    document.querySelector('.suchfenster')?.remove();
    const f = document.createElement('div'); f.className = 'suchfenster'; f.setAttribute('role', 'dialog');
    const vor = getSelection().toString().slice(0, 80);
    f.innerHTML = `<div class="reihe"><b>Suchen & Ersetzen</b><div class="platz"></div><button type="button" class="rund klein" data-zu aria-label="Schließen">✕</button></div>
      <input class="feld" id="s-such" placeholder="Suchen …" value="${esc(vor)}"><input class="feld" id="s-ers" placeholder="Ersetzen durch …">
      <label class="haken"><input type="checkbox" id="s-gross"> Groß/klein beachten</label>
      <div class="reihe"><span class="leise s-info"></span><div class="platz"></div><button type="button" class="btn weiss klein" data-s="weiter">Weiter</button><button type="button" class="btn weiss klein" data-s="ersetzen">Ersetzen</button><button type="button" class="btn klein" data-s="alle">Alle</button></div>`;
    app.querySelector('.oo-karte').appendChild(f);
    let pos = -1;
    const such = f.querySelector('#s-such'); const ers = f.querySelector('#s-ers'); const gross = f.querySelector('#s-gross'); const info = f.querySelector('.s-info');
    const zeige = () => { const t = sucheTreffer(such.value, gross.checked); info.textContent = such.value ? `${t.length} Treffer` : ''; return t; };
    const markiere = (t) => { const r = document.createRange(); r.setStart(t.n, t.i); r.setEnd(t.n, t.i + such.value.length); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); S.bereich = r.cloneRange(); t.n.parentElement.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    const weiter = () => { const t = zeige(); if (!t.length) return false; pos = (pos + 1) % t.length; markiere(t[pos]); info.textContent = `${pos + 1} von ${t.length}`; return true; };
    such.addEventListener('input', () => { pos = -1; zeige(); });
    such.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); weiter(); } if (ev.key === 'Escape') f.remove(); });
    ers.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') f.remove(); });
    f.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-zu]')) return f.remove();
      const a = ev.target.closest('[data-s]')?.dataset.s; if (!a) return;
      if (a === 'weiter') weiter();
      if (a === 'ersetzen') {
        const sel = getSelection(); const tr = gross.checked ? sel.toString() === such.value : sel.toString().toLowerCase() === such.value.toLowerCase();
        if (tr && inBlatt(sel.anchorNode)) { blatt().focus(); document.execCommand('insertText', false, ers.value); geaendert(); pos -= 1; }
        weiter();
      }
      if (a === 'alle') {
        let n = 0; let t;
        blatt().focus();
        while ((t = sucheTreffer(such.value, gross.checked)).length && n < 2000) {
          const x = t[0]; const r = document.createRange(); r.setStart(x.n, x.i); r.setEnd(x.n, x.i + such.value.length);
          const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); document.execCommand('insertText', false, ers.value); n += 1;
          if (ers.value.toLowerCase().includes(such.value.toLowerCase())) break;
        }
        geaendert(); info.textContent = `${n} ersetzt`;
      }
    });
    such.focus(); such.select(); if (such.value) zeige();
  }

  // ---------- Kleine Dialoge ----------
  function eingabe({ titel, felder, ja = 'OK' }) {
    return new Promise((fertig) => {
      const s = document.createElement('div'); s.className = 'schleier';
      s.innerHTML = `<div class="fenster" role="dialog" aria-modal="true" style="width:min(420px,94vw)"><h2>${esc(titel)}</h2>${felder.map((f, i) => `<label class="efeld"><span>${esc(f.label)}</span><input class="feld" data-i="${i}" type="${f.typ || 'text'}" value="${esc(f.wert ?? '')}" placeholder="${esc(f.platz || '')}" ${f.min != null ? `min="${f.min}" max="${f.max}"` : ''}></label>`).join('')}<div class="reihe" style="justify-content:flex-end;margin-top:6px"><button type="button" class="btn weiss" data-nein>Abbrechen</button><button type="button" class="btn" data-ja>${esc(ja)}</button></div></div>`;
      document.body.appendChild(s);
      const werte = () => [...s.querySelectorAll('input')].map((x) => x.value.trim());
      const zu = (w) => { s.remove(); fertig(w); bereichZurueck(); };
      s.addEventListener('click', (ev) => { if (ev.target.closest('[data-ja]')) zu(werte()); else if (ev.target === s || ev.target.closest('[data-nein]')) zu(null); });
      s.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); zu(werte()); } if (ev.key === 'Escape') zu(null); });
      s.querySelector('input').focus(); s.querySelector('input').select();
    });
  }
  function farbMenue(el, art) {
    document.querySelector('.farbmenue')?.remove();
    const m = document.createElement('div'); m.className = 'farbmenue';
    const liste = art === 'mark' ? MARKER : TEXTFARBEN;
    m.innerHTML = liste.map((c) => `<button type="button" data-c="${c}" style="background:${c === 'transparent' ? 'repeating-linear-gradient(45deg,#fff 0 4px,#e8e1d3 4px 8px)' : c}" title="${c === 'transparent' ? 'Kein Marker' : c}"></button>`).join('') + (art === 'farbe' ? '<label class="eigen" title="Eigene Farbe"><input type="color" value="#2c5aa0"></label>' : '');
    document.body.appendChild(m);
    const r = el.getBoundingClientRect(); m.style.left = `${r.left}px`; m.style.top = `${r.bottom + 6}px`;
    const setze = (c) => { bereichZurueck(); document.execCommand('styleWithCSS', false, true); document.execCommand(art === 'mark' ? 'hiliteColor' : 'foreColor', false, c); document.execCommand('styleWithCSS', false, false); if (art === 'mark') S.mark = c; else S.farbe = c; m.remove(); geaendert(); zeigeLeiste(); };
    m.addEventListener('mousedown', (ev) => { if (!ev.target.closest('input')) ev.preventDefault(); });
    m.addEventListener('click', (ev) => { const b = ev.target.closest('[data-c]'); if (b) setze(b.dataset.c); });
    m.querySelector('input')?.addEventListener('change', (ev) => setze(ev.target.value));
    setTimeout(() => document.addEventListener('mousedown', function weg(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('mousedown', weg); } }), 0);
  }
  function dateiMenue(el) {
    document.querySelector('.farbmenue')?.remove();
    const m = document.createElement('div'); m.className = 'farbmenue dateimenue';
    m.innerHTML = [['neu', 'plus', 'Neues Dokument'], ['importieren', 'oeffnen', 'Öffnen …'], ['docx', 'word', 'Als Word speichern'], ['pdf', 'pdf', 'Als PDF speichern'], ['drucken', 'drucker', 'Drucken'], ['start', 'links', 'Alle Dokumente']].map(([a, i, t]) => `<button type="button" data-aktion="${a}">${sym(i, 15)} ${t}</button>`).join('');
    document.body.appendChild(m);
    const r = el.getBoundingClientRect(); m.style.left = `${r.left}px`; m.style.top = `${r.bottom + 4}px`;
    m.addEventListener('click', (ev) => { const b = ev.target.closest('[data-aktion]'); if (b) { m.remove(); aktionen[b.dataset.aktion]?.(b, ev); } });
    setTimeout(() => document.addEventListener('mousedown', function weg(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('mousedown', weg); } }), 0);
  }
  // Schriftgröße/-art auf die Auswahl: über <font> und gleich in saubere <span>s umwandeln
  function schriftSetzen(art, wert) {
    bereichZurueck();
    if (getSelection().isCollapsed) { meldung('Erst Text markieren.'); return; }
    document.execCommand('styleWithCSS', false, false);
    if (art === 'groesse') document.execCommand('fontSize', false, '7');
    else document.execCommand('fontName', false, wert);
    const neue = [];
    blatt().querySelectorAll(art === 'groesse' ? 'font[size="7"]' : 'font[face]').forEach((f) => {
      const sp = document.createElement('span'); neue.push(sp);
      if (art === 'groesse') sp.style.fontSize = `${wert}pt`; else sp.style.fontFamily = wert;
      if (f.getAttribute('color')) sp.style.color = f.getAttribute('color');
      while (f.firstChild) sp.appendChild(f.firstChild);
      f.replaceWith(sp);
    });
    // Auswahl bleibt auf dem geänderten Text – so geht gleich danach Farbe oder Marker
    if (neue.length) { const r = document.createRange(); r.setStartBefore(neue[0]); r.setEndAfter(neue[neue.length - 1]); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); S.bereich = r.cloneRange(); }
    geaendert();
  }

  function zaehle() {
    const s = blatt(); const z = app.querySelector('.zahlen'); if (!s || !z) return;
    const text = s.innerText.replace(/\s+/g, ' ').trim();
    const woerter = text ? text.split(' ').length : 0;
    const seiten = Math.max(1, Math.ceil(s.scrollHeight / 1123) + s.querySelectorAll('hr.umbruch').length);
    z.innerHTML = `${woerter} ${woerter === 1 ? 'Wort' : 'Wörter'} · ${text.length} Zeichen · ${seiten} ${seiten === 1 ? 'Seite' : 'Seiten'} · Lesezeit ${Math.max(1, Math.round(woerter / 200))} Min.${S.d?.verfolgen ? ' · <b class="spur-an" data-aktion="verfolgen" title="Klicken zum Ausschalten">Änderungen werden verfolgt</b>' : ''}`;
    const sz = app.querySelector('.seitenzahl'); if (sz) sz.textContent = seiten;
  }
  function gliederung() {
    const g = app.querySelector('.gliederung'); const s = blatt(); if (!g || !s) return;
    const h = [...s.querySelectorAll('h1,h2,h3')].filter((x) => x.textContent.trim());
    g.innerHTML = `<b>Gliederung</b>${h.length ? h.map((x, i) => `<button type="button" class="gl gl-${x.tagName.toLowerCase()}" data-aktion="springe" data-i="${i}">${esc(x.textContent.trim().slice(0, 60))}</button>`).join('') : '<small>Überschriften erscheinen hier.</small>'}`;
  }
  function inBlatt(knoten) { const s = blatt(); return s && knoten && (knoten === s || s.contains(knoten)); }
  function auswahlGeaendert() {
    if (S.ansicht !== 'dokument') return;
    const sel = getSelection();
    if (!sel.rangeCount || !inBlatt(sel.anchorNode)) return;
    S.bereich = sel.getRangeAt(0).cloneRange();
    const text = sel.toString().trim();
    const m = app.querySelector('.markiert'); if (m) m.textContent = text ? `markiert: ${text.split(/\s+/).length} Wörter` : '';
    const h = app.querySelector('.auswahlhinweis'); if (h) h.textContent = text ? `Bezieht sich auf: „${text.slice(0, 40)}${text.length > 40 ? '…' : ''}“` : 'Ganzes Dokument';
    // Absatzart im Auswahlfeld zeigen
    let k = sel.anchorNode; while (k && k !== blatt() && !(k.nodeType === 1 && /^(H1|H2|H3|P|BLOCKQUOTE|LI)$/.test(k.tagName))) k = k.parentNode;
    const a = app.querySelector('.absatz'); if (a && k && k.nodeType === 1) a.value = /^(H1|H2|H3|BLOCKQUOTE)$/.test(k.tagName) ? k.tagName.toLowerCase() : 'p';
    app.querySelectorAll('.wz[data-cmd]').forEach((b) => { if (['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList', 'superscript', 'subscript', 'justifyCenter', 'justifyRight', 'justifyFull'].includes(b.dataset.cmd)) b.classList.toggle('an', document.queryCommandState(b.dataset.cmd)); });
    // Schriftgröße/-art der Schreibmarke zeigen
    const el = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
    if (el && inBlatt(el)) {
      const cs = getComputedStyle(el);
      const g = app.querySelector('.groesse'); if (g) { const p = Math.round(parseFloat(cs.fontSize) * 0.75); g.value = GROESSEN.includes(p) ? String(p) : ''; }
      const f = app.querySelector('.schrift'); if (f) { const n = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(); f.value = SCHRIFTEN.includes(n) ? n : ''; }
    }
    zeigeSchwebe();
  }
  function bloeckeDerAuswahl() {
    const s = blatt(); const r = S.bereich; if (!r || !inBlatt(r.startContainer)) return [];
    const top = (n) => { let k = n.nodeType === 1 ? n : n.parentElement; while (k && k.parentElement !== s && k !== s) k = k.parentElement; return k === s ? null : k; };
    const a = top(r.startContainer); const b = top(r.endContainer); if (!a) return [];
    const liste = []; let k = a; while (k) { liste.push(k); if (k === b) break; k = k.nextElementSibling; }
    return liste.flatMap((x) => (/^(UL|OL)$/.test(x.tagName) ? [...x.querySelectorAll('li')] : [x]));
  }
  function bereichZurueck() {
    const s = blatt(); if (!s) return;
    s.focus({ preventScroll: true });
    if (S.bereich && inBlatt(S.bereich.startContainer)) { const sel = getSelection(); sel.removeAllRanges(); sel.addRange(S.bereich); }
  }

  // ---------- Helfer links ----------
  function zeichneHelfer() {
    const h = app.querySelector('.helfer'); if (!h) return;
    h.innerHTML = `<header class="oo-seitenkopf"><span class="oo-wer"><b>Schwalbe</b><small>${S.denkt ? 'schreibt …' : 'Schreibt mit, fliegt schnell'}</small></span><button type="button" class="oo-pfeil" data-aktion="helfer-klappen" title="Einklappen" aria-label="Schwalbe einklappen">‹</button></header>
      <div class="schnell">
        <button type="button" data-aktion="frage" data-text="Mach den markierten Text (oder wenn nichts markiert ist, das ganze Dokument) kürzer und klarer, ohne Inhalt zu verlieren.">Kürzer</button>
        <button type="button" data-aktion="frage" data-text="Formuliere den markierten Text (oder das ganze Dokument) förmlicher und höflicher.">Förmlicher</button>
        <button type="button" data-aktion="frage" data-text="Korrigiere Rechtschreibung, Grammatik und Kommas im ganzen Dokument. Ändere sonst nichts am Inhalt und sag kurz, was du korrigiert hast.">Rechtschreibung</button>
        <button type="button" data-aktion="frage" data-text="Schreib an der Schreibmarke passend weiter (ein bis zwei Absätze).">Weiterschreiben</button>
      </div>
      <div class="gespraech" aria-live="polite"></div>
      <div class="oo-ori-karte">${oriVogel(30)}<b>${esc(ORI_SPRUECHE[Math.floor(Math.random() * ORI_SPRUECHE.length)])}</b></div>
      <div class="frage"><textarea id="frage" rows="2" placeholder="Was soll ich tun? z. B. „Schreib einen Schluss mit Dank ans Team“" aria-label="Wunsch an die Schwalbe"></textarea>
        <div class="reihe"><span class="leise auswahlhinweis">Ganzes Dokument</span><div class="platz"></div><button type="button" class="btn klein" data-aktion="senden" ${S.denkt ? 'disabled' : ''}>Los ${sym('senden', 14, 2.4)}</button></div></div>`;
    h.querySelector('#frage').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); aktionen.senden(); } });
    zeichneGespraech();
  }
  function zeichneGespraech() {
    const g = app.querySelector('.gespraech'); if (!g) return;
    if (!S.verlauf.length && !S.denkt) { g.innerHTML = `<div class="hallo">${vogel('liest', 40)}<span>Sag mir in normalen Worten, was du brauchst – ich schreib, kürze, formuliere um oder korrigiere. Markierst du vorher Text, kümmere ich mich nur darum.</span></div>`; return; }
    g.innerHTML = S.verlauf.map((v) => (v.wer === 'du' ? `<div class="du">${esc(v.text)}</div>` : `<div class="sie${v.fehler ? ' fehler' : ''}">${esc(v.text)}${v.rueck ? '<button type="button" class="rueck" data-aktion="rueckgaengig">Rückgängig</button>' : ''}</div>`)).join('') + (S.denkt ? `<div class="sie denkt">${vogel('schreibt', 34)}<span>Schreibt …</span></div>` : '');
    g.scrollTop = g.scrollHeight;
  }
  async function frageSchwalbe(wunsch, anzeige) {
    if (!wunsch || S.denkt) return;
    const sel = getSelection();
    const auswahl = S.bereich && !S.bereich.collapsed && inBlatt(S.bereich.startContainer) ? S.bereich.toString() : '';
    const bilderVorher = [...blatt().querySelectorAll('img')].map((i) => i.outerHTML);
    S.verlauf.push({ wer: 'du', text: anzeige || wunsch }); S.denkt = true; zeichneHelfer();
    const r = await A.assistent({ wunsch, html: blatt().innerHTML, auswahl, name: S.d.name });
    S.denkt = false;
    if (r?.fehler) { S.verlauf.push({ wer: 'sie', text: `Das hat nicht geklappt: ${r.fehler.nachricht}`, fehler: true }); zeichneHelfer(); return; }
    let geaendertJa = false;
    // [Bild]-Platzhalter wieder durch die echten Bilder ersetzen (die schicken wir nicht an Claude)
    let bildNr = 0;
    const html = r.html ? saeubern(String(r.html).replace(/\[Bild\]/g, () => bilderVorher[bildNr++] || '')) : '';
    if (html && r.aktion !== 'keine') {
      if (S.d.verfolgen && r.aktion === 'dokument') { const s = blatt(); s.innerHTML = saeubern(Pruefen.alsAenderungen(saeubern(s.innerHTML), html)); geaendertJa = true; }
      else if (S.d.verfolgen && r.aktion === 'auswahl' && auswahl) { bereichZurueck(); const rg = getSelection().getRangeAt(0); Pruefen.vorEingabe({ inputType: 'deleteContentForward', preventDefault() {} }); const neuHtml = Pruefen.alsEinfuegung(html.replace(/^<p>([\s\S]*)<\/p>$/, (m, i) => (/<\/?(p|h\d|ul|ol)/.test(i) ? m : i))); Pruefen.htmlEinfuegen(blatt(), neuHtml); geaendertJa = Boolean(rg); }
      else if (S.d.verfolgen && r.aktion === 'einfuegen') { bereichZurueck(); Pruefen.htmlEinfuegen(blatt(), Pruefen.alsEinfuegung(html)); geaendertJa = true; }
      else if (r.aktion === 'dokument') { const s = blatt(); s.focus(); const rg = document.createRange(); rg.selectNodeContents(s); sel.removeAllRanges(); sel.addRange(rg); document.execCommand('insertHTML', false, html); geaendertJa = true; }
      else if (r.aktion === 'auswahl' && auswahl) { bereichZurueck(); document.execCommand('insertHTML', false, html.replace(/^<p>([\s\S]*)<\/p>$/, (m, i) => (/<\/?(p|h\d|ul|ol)/.test(i) ? m : i))); geaendertJa = true; }
      else { bereichZurueck(); if (!S.bereich) { const s = blatt(); const rg = document.createRange(); rg.selectNodeContents(s); rg.collapse(false); sel.removeAllRanges(); sel.addRange(rg); } document.execCommand('insertHTML', false, html); geaendertJa = true; }
    }
    S.verlauf.push({ wer: 'sie', text: r.antwort || (geaendertJa ? 'Erledigt.' : '…'), rueck: geaendertJa });
    zeichneHelfer();
    if (geaendertJa) { geaendert(); const v = app.querySelector('.oo-sitzvogel'); if (v) { v.innerHTML = vogel('erledigt', 84); setTimeout(() => { if (v.isConnected) v.innerHTML = vogel('ruhezustand-2', 84); }, 2600); } }
  }

  // ---------- Druck / PDF ----------
  function druckHtml() {
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(S.d.name)}</title><style>
      @page{size:A4;margin:22mm 22mm 20mm}
      body{font:11.5pt/1.55 Georgia,'Times New Roman',serif;color:#1d1d1d;margin:0}
      h1{font:700 21pt/1.2 Arial,Helvetica,sans-serif;color:#1e3f75;margin:0 0 10pt}
      h2{font:700 14pt/1.3 Arial,Helvetica,sans-serif;color:#1e3f75;margin:16pt 0 6pt}
      h3{font:700 12pt/1.3 Arial,Helvetica,sans-serif;margin:12pt 0 4pt}
      p{margin:0 0 8pt}ul,ol{margin:0 0 8pt;padding-left:18pt}li{margin:0 0 3pt}
      blockquote{margin:0 0 8pt 14pt;padding-left:10pt;border-left:2pt solid #b9cdf0;color:#444;font-style:italic}
      h1,h2,h3{page-break-after:avoid}
      table{border-collapse:collapse;width:100%;margin:0 0 10pt;page-break-inside:auto}td,th{border:.6pt solid #b9c4d6;padding:4pt 6pt;vertical-align:top;font-size:10.5pt}th{background:#dbe6f7;text-align:left}
      img{max-width:100%;height:auto}img[data-aus=center]{display:block;margin:6pt auto}img[data-aus=right]{display:block;margin:6pt 0 6pt auto}
      hr{border:0;border-top:.6pt solid #ccc;margin:10pt 0}hr.umbruch{border:0;margin:0;page-break-after:always;break-after:page}
      ${S.endfassung ? 'del.aend{display:none}ins.aend{text-decoration:none}' : 'ins.aend{color:#1f6b3d;text-decoration:underline}del.aend{color:#b23a28}'}
      a{color:#1e4fa0}nav.inhalt{margin:0 0 14pt}nav.inhalt b{display:block;font:700 14pt Arial,sans-serif;color:#1e3f75;margin-bottom:6pt}nav.inhalt div{padding:2pt 0}nav.inhalt .h2{padding-left:14pt}nav.inhalt .h3{padding-left:28pt;color:#555}
    </style></head><body>${(() => {
      const h = [...blatt().querySelectorAll('h1,h2,h3')].filter((x) => x.textContent.trim() && !x.closest('nav.inhalt'));
      const iv = `<nav class="inhalt"><b>Inhalt</b>${h.map((x) => `<div class="${x.tagName.toLowerCase()}">${esc(x.textContent.trim())}</div>`).join('')}</nav>`;
      return saeubern(blatt().innerHTML).replace(/<nav class="inhalt" contenteditable="false"><\/nav>/g, iv);
    })()}</body></html>`;
  }

  // ---------- Einstellungen ----------
  async function einstellungen() {
    const e = await A.einstellungen.lesen();
    const s = document.createElement('div'); s.className = 'schleier';
    const eb = e.eingebaut || {};
    s.innerHTML = `<div class="fenster" role="dialog" aria-modal="true" style="width:min(640px,94vw)"><div class="reihe"><h2 style="flex:1">Einstellungen</h2><button type="button" class="rund" data-zu aria-label="Schließen">✕</button></div>
      <div class="ezeile"><div class="t"><b>Wer schreibt mit</b><span>Claude auf diesem PC, über deinen Heim-PC oder mit API-Schlüssel.</span></div>
        <div class="segment">${[['claude', 'Dieser PC'], ['heim', 'Heim-PC'], ['api', 'API']].map(([k, t]) => `<label><input type="radio" name="weg" value="${k}" ${(e.weg || 'claude') === k ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
      <div class="ezeile w-heim"><div class="t"><b>Adresse vom Heim-PC</b><span>Wie bei Kranich: dort unter Einstellungen → Heim-PC.</span></div><input class="feld" id="e-heimadr" value="${esc(e.heimAdresse)}" placeholder="http://mein-pc:4747"></div>
      <div class="ezeile w-heim"><div class="t"><b>Kopplungscode</b><span>${e.heimCodeGesetzt ? 'Gespeichert – leer lassen zum Behalten.' : 'Vom Heim-PC kopieren.'}</span></div><input class="feld" id="e-heimcode" type="password" placeholder="Code"></div>
      <div class="ezeile w-api"><div class="t"><b>API-Schlüssel</b><span>${e.apiSchluesselGesetzt ? 'Gespeichert – leer lassen zum Behalten.' : 'Beginnt mit sk-ant-'}</span></div><input class="feld" id="e-key" type="password" placeholder="sk-ant-…"></div>
      <div class="ezeile w-modell"><div class="t"><b>Modell</b><span>Opus schreibt am besten, Sonnet ist schneller.</span></div><select class="feld" id="e-modell" style="width:140px">${['opus', 'sonnet', 'haiku'].map((m) => `<option ${(e.claudeModell || 'opus') === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      <div class="ezeile"><div class="t"><b>Eingebautes Claude</b><span>${eb.da && eb.token ? `Eingerichtet (${esc(eb.version)}) – springt ein, wenn hier kein Claude Code ist.` : 'Nicht eingerichtet. Geht im Startfenster „Selbst gfaltet“ → Zahnrad → „Claude einrichten“.'}</span></div></div>
      <div class="ezeile"><div class="t"><b>Verbindung</b><span class="status">Noch nicht getestet.</span></div><button type="button" class="btn weiss" data-testen>Testen</button></div>
      <div class="reihe" style="justify-content:flex-end;padding-top:12px"><span class="leise" style="font-size:12.5px;flex:1">Schwalbe ${esc(e.version || '')}</span><button type="button" class="btn weiss" data-zu>Abbrechen</button><button type="button" class="btn" data-speichern>Speichern</button></div></div>`;
    document.body.appendChild(s);
    const zeigeWeg = () => { const w = s.querySelector('input[name="weg"]:checked').value; s.querySelectorAll('.w-heim').forEach((x) => { x.hidden = w !== 'heim'; }); s.querySelectorAll('.w-api').forEach((x) => { x.hidden = w !== 'api'; }); s.querySelectorAll('.w-modell').forEach((x) => { x.hidden = w === 'api'; }); };
    s.addEventListener('change', zeigeWeg); zeigeWeg();
    const werte = () => ({ weg: s.querySelector('input[name="weg"]:checked').value, heimAdresse: s.querySelector('#e-heimadr').value.trim(), heimCode: s.querySelector('#e-heimcode').value.trim(), apiSchluessel: s.querySelector('#e-key').value.trim(), claudeModell: s.querySelector('#e-modell').value });
    s.addEventListener('click', async (ev) => {
      if (ev.target === s || ev.target.closest('[data-zu]')) return s.remove();
      if (ev.target.closest('[data-speichern]')) { await A.einstellungen.setzen(werte()); s.remove(); meldung('Gespeichert.'); if (S.ansicht === 'start') zeigeStart(); return; }
      if (ev.target.closest('[data-testen]')) {
        await A.einstellungen.setzen(werte());
        const st = s.querySelector('.status'); st.textContent = 'Frage Claude …';
        const r = await A.hirnTesten();
        st.textContent = r?.fehler ? `Klappt nicht: ${r.fehler.nachricht}` : `Claude ist da (${r.weg === 'heim' ? 'über den Heim-PC' : r.weg === 'eingebaut' ? 'eingebautes Claude' : r.weg === 'api' ? 'API' : 'dieser PC'}).`;
      }
    });
    s.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') s.remove(); });
  }
  function frage({ titel, text, ja = 'OK' }) {
    return new Promise((fertig) => {
      const s = document.createElement('div'); s.className = 'schleier';
      s.innerHTML = `<div class="fenster" role="dialog" aria-modal="true" style="width:min(420px,94vw)"><h2>${esc(titel)}</h2><p class="leise">${esc(text)}</p><div class="reihe" style="justify-content:flex-end"><button type="button" class="btn weiss" data-nein>Abbrechen</button><button type="button" class="btn rot" data-ja>${esc(ja)}</button></div></div>`;
      document.body.appendChild(s);
      s.addEventListener('click', (ev) => { if (ev.target.closest('[data-ja]')) { s.remove(); fertig(true); } else if (ev.target === s || ev.target.closest('[data-nein]')) { s.remove(); fertig(false); } });
      s.querySelector('[data-ja]').focus();
    });
  }

  // ---------- Rundgang ----------
  const RUNDGANG_START = () => ({ app: 'schwalbe-start', farbe: '#2c5aa0', vogel: vogel('winkt', 52), schritte: [
    { ziel: '.wunsch', titel: 'Ich bin die Schwalbe.', text: 'Schreib hier in einem Satz, was du brauchst – ich fliege los und mach dir einen ersten Entwurf. Ein Brief, eine Einladung, eine Kündigung, egal.' },
    { ziel: '.vorlagen', titel: 'Oder nimm eine Vorlage', text: 'Brief, Einladung, Notizen oder einfach ein leeres Blatt. Platzhalter in eckigen Klammern füllst du dann selbst.' },
    { ziel: '.mitgebracht', titel: 'Word-Dateien gehen auch', text: 'Zieh eine .docx hier rein. Ich öffne sie, du schreibst weiter, und am Ende speicherst du sie wieder als Word oder PDF.' },
  ] });
  const RUNDGANG = () => ({ app: 'schwalbe', farbe: '#2c5aa0', vogel: vogel('winkt', 52), schritte: [
    { ziel: '.blattrahmen', titel: 'Dein Blatt', text: 'Hier schreibst du – wie in Word. Alles speichert sich von selbst, du musst nie auf Speichern drücken.' },
    { ziel: '.oo-leiste', titel: 'Die Werkzeuge', text: 'Oben wechselst du zwischen Start (Schrift, Größe, Farbe, Listen), Einfügen (Tabelle, Bild, Link, Inhaltsverzeichnis) und Seite (Kopf- und Fußzeile, Seitenzahlen). Strg+F sucht, Strg+Enter macht einen Seitenumbruch.' },
    { ziel: '.oo-seite', titel: 'Hier bin ich', text: 'Sag mir, was ich tun soll: kürzer, förmlicher, Fehler raus, weiterschreiben. Markierst du vorher Text, kümmer ich mich nur um den. Mit ‹ klappst du mich weg.' },
    { ziel: '.gliederung', titel: 'Gliederung', text: 'Deine Überschriften. Ein Klick, und du springst hin.' },
    { ziel: '.oo-menue', titel: 'Fertig?', text: 'Als Word (.docx) oder PDF speichern oder gleich drucken. Das ? oben rechts startet diesen Rundgang nochmal.' },
  ] });

  // ---------- Aktionen ----------
  // ---------- Live-Tabellen aus Albatros ----------
  async function liveAktualisieren(nurDiese) {
    const s = blatt(); if (!s) return 0;
    let n = 0;
    for (const t of nurDiese ? [nurDiese] : s.querySelectorAll('table[data-quelle]')) {
      const [, id, nr] = t.dataset.quelle.split(':');
      const r = await A.albatros.tabelle({ id, blatt: Number(nr) });
      if (r?.fehler) { t.classList.add('live-fehlt'); t.title = r.fehler.nachricht; continue; }
      t.classList.remove('live-fehlt'); t.title = `Live aus Albatros: ${r.name} · ${r.blatt}`;
      const name = `${r.name} · ${r.blatt}`;
      if (t.innerHTML.replace(/\s+/g, '') !== r.html.replace(/\s+/g, '')) { t.innerHTML = r.html; n++; }
      t.dataset.quelleName = name;
    }
    if (n) geaendert();
    return n;
  }
  async function albatrosWaehlen() {
    const liste = await A.albatros.liste();
    if (liste?.fehler || !liste?.length) { meldung('Keine Albatros-Tabellen gefunden. Erst in Albatros eine Tabelle anlegen.'); return; }
    bereichZurueck(); const merkBereich = S.bereich;
    const w = document.createElement('div'); w.className = 'schleier';
    w.innerHTML = `<div class="fenster" role="dialog" aria-modal="true" aria-label="Tabelle aus Albatros" style="width:min(560px,94vw)"><div class="reihe"><h2 class="h" style="flex:1">Tabelle aus Albatros</h2><button type="button" class="rund" data-zu aria-label="Schließen">✕</button></div>
      <p class="leise" style="margin:4px 0 12px">Die Tabelle bleibt mit Albatros verbunden: Änderst du dort Zahlen, stehen sie beim nächsten Öffnen auch hier.</p>
      <div class="alb-liste">${liste.map((t, i) => `<label class="alb-t"><input type="radio" name="alb" value="${esc(t.id)}" ${i ? '' : 'checked'}><span><b>${esc(t.name)}</b><small>${esc(wann(t.geaendert))}</small></span>${t.blaetter.length > 1 ? `<select data-blatt="${esc(t.id)}">${t.blaetter.map((b, k) => `<option value="${k}">${esc(b)}</option>`).join('')}</select>` : ''}</label>`).join('')}</div>
      <div class="reihe" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn weiss" data-zu>Abbrechen</button><button type="button" class="btn" data-ja>Einfügen</button></div></div>`;
    document.body.appendChild(w);
    w.addEventListener('click', async (ev) => {
      if (ev.target === w || ev.target.closest('[data-zu]')) { w.remove(); return; }
      if (!ev.target.closest('[data-ja]')) return;
      const id = w.querySelector('input[name=alb]:checked')?.value; if (!id) return;
      const nr = Number(w.querySelector(`select[data-blatt="${CSS.escape(id)}"]`)?.value || 0);
      const r = await A.albatros.tabelle({ id, blatt: nr });
      if (r?.fehler) { meldung(r.fehler.nachricht); return; }
      w.remove();
      S.bereich = merkBereich; bereichZurueck();
      Pruefen.htmlEinfuegen(blatt(), `<table data-quelle="albatros:${id}:${nr}" data-quelle-name="${esc(`${r.name} · ${r.blatt}`)}" contenteditable="false">${r.html}</table><p><br></p>`);
      geaendert(); meldung('Live-Tabelle eingefügt.');
    });
  }

  // ---------- Kommentare ----------
  const komAnker = (id) => [...(blatt()?.querySelectorAll(`span.kom[data-kom="${CSS.escape(id)}"]`) || [])];
  function zeichneKommentare() {
    const rand = app.querySelector('.randspalte'); const tisch = app.querySelector('.schreibtisch'); if (!rand || !blatt()) return;
    const liste = (S.d.kommentare || []).filter((k) => komAnker(k.id).length && (S.zeigeErledigte || !k.erledigt));
    const erledigt = (S.d.kommentare || []).filter((k) => k.erledigt && komAnker(k.id).length).length;
    blatt().querySelectorAll('span.kom').forEach((a) => { const k = S.d.kommentare?.find((x) => x.id === a.dataset.kom); a.classList.toggle('erledigt', !k || k.erledigt); a.classList.toggle('aktiv', a.dataset.kom === S.komAktiv); });
    tisch.classList.toggle('mit-rand', liste.length > 0 || erledigt > 0);
    if (!liste.length && !erledigt) { if (!rand.contains(document.activeElement)) rand.innerHTML = ''; return; }
    const tippt = rand.contains(document.activeElement) && document.activeElement.tagName === 'TEXTAREA';
    if (tippt && liste.every((k) => rand.querySelector(`.kom-karte[data-kom="${CSS.escape(k.id)}"]`))) { komPositionen(rand); return; }
    if (tippt) return;
    const offen = (k) => k.id === S.komBearbeiten || !k.text;
    rand.innerHTML = `${erledigt ? `<button type="button" class="kom-erledigte" data-aktion="kom-erledigte">${S.zeigeErledigte ? 'Erledigte ausblenden' : `${erledigt} erledigt – zeigen`}</button>` : ''}${liste.map((k) => `<div class="kom-karte${k.id === S.komAktiv ? ' aktiv' : ''}${k.erledigt ? ' ist-erledigt' : ''}" data-kom="${esc(k.id)}">
        <div class="kom-kopf"><span class="kom-avatar">${esc((k.autor || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase())}</span><b>${esc(k.autor || 'Unbekannt')}</b><small>${esc(wann(k.zeit))}</small>
          <span class="platz"></span><button type="button" class="kom-knopf" data-aktion="kom-erledigt" title="${k.erledigt ? 'Wieder öffnen' : 'Erledigt'}" aria-label="Erledigt">${sym(k.erledigt ? 'zurueck' : 'haken', 14)}</button><button type="button" class="kom-knopf" data-aktion="kom-loeschen" title="Kommentar löschen" aria-label="Löschen">${sym('muell', 14)}</button></div>
        ${offen(k) ? `<textarea class="kom-text" rows="2" placeholder="Kommentar schreiben …">${esc(k.text || '')}</textarea>` : `<p class="kom-inhalt" data-aktion="kom-bearbeiten" title="Klicken zum Ändern">${esc(k.text).replace(/\n/g, '<br>')}</p>`}
        ${(k.antworten || []).map((a) => `<div class="kom-antwort"><b>${esc(a.autor)}</b> <small>${esc(wann(a.zeit))}</small><p>${esc(a.text).replace(/\n/g, '<br>')}</p></div>`).join('')}
        ${k.id === S.komAktiv && k.text ? '<textarea class="kom-neu-antwort" rows="1" placeholder="Antworten …"></textarea>' : ''}
      </div>`).join('')}`;
    S.zeichnet = true; requestAnimationFrame(() => { S.zeichnet = false; });
    komPositionen(rand);
    const t = rand.querySelector('.kom-karte.aktiv textarea.kom-text'); if (t && S.komFokus) { t.focus(); S.komFokus = false; }
  }
  // An die Höhe der Textstelle setzen, ohne Überlappung
  function komPositionen(rand) {
    const oben0 = rand.getBoundingClientRect().top; let frei = rand.querySelector('.kom-erledigte') ? 34 : 0;
    rand.querySelectorAll('.kom-karte').forEach((c) => {
      const a = komAnker(c.dataset.kom)[0]; const soll = a ? a.getBoundingClientRect().top - oben0 : frei;
      const top = Math.max(soll, frei); c.style.top = `${top}px`; frei = top + c.offsetHeight + 8;
    });
    rand.style.minHeight = `${frei}px`;
  }
  function komAktiv(id) { if (S.komAktiv === id) return; S.komAktiv = id; zeichneKommentare(); }
  function komSpeichernAusFeld(t) {
    const c = t.closest('.kom-karte'); const k = S.d.kommentare.find((x) => x.id === c?.dataset.kom); if (!k) return;
    if (t.classList.contains('kom-text')) { k.text = t.value.trim(); if (k.text) S.komBearbeiten = null; }
    else if (t.value.trim()) { (k.antworten ||= []).push({ autor: Pruefen.autor(), text: t.value.trim(), zeit: new Date().toISOString() }); }
    geaendert(); zeichneKommentare();
  }

  const aktionen = {
    dateimenue: (el) => dateiMenue(el),
    farbmenue: (el) => farbMenue(el, el.dataset.art),
    'reiter-seite': () => { S.reiter = 'seite'; zeigeLeiste(); setTimeout(() => app.querySelector('.kf')?.focus(), 30); },
    tabelle: async () => {
      const w = await eingabe({ titel: 'Tabelle einfügen', felder: [{ label: 'Spalten', typ: 'number', wert: 3, min: 1, max: 12 }, { label: 'Zeilen', typ: 'number', wert: 3, min: 1, max: 60 }], ja: 'Einfügen' });
      if (!w) return;
      const sp = Math.min(12, Math.max(1, Number(w[0]) || 3)); const ze = Math.min(60, Math.max(1, Number(w[1]) || 3));
      const kopf = `<tr>${'<th><br></th>'.repeat(sp)}</tr>`; const rest = `<tr>${'<td><br></td>'.repeat(sp)}</tr>`.repeat(Math.max(0, ze - 1));
      bereichZurueck(); document.execCommand('insertHTML', false, `<table>${kopf}${rest}</table><p><br></p>`); geaendert();
    },
    bild: () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png,image/jpeg,image/gif,image/webp'; i.onchange = () => bildEinfuegen(i.files[0]); i.click(); },
    link: async () => {
      const text = S.bereich && !S.bereich.collapsed ? S.bereich.toString() : '';
      const w = await eingabe({ titel: 'Link einfügen', felder: [{ label: 'Adresse', wert: 'https://', platz: 'https://…' }, ...(text ? [] : [{ label: 'Text', platz: 'Was soll da stehen?' }])], ja: 'Einfügen' });
      if (!w || !/^(https?:\/\/.+|mailto:.+)$/i.test(w[0])) { if (w) meldung('Bitte eine Adresse mit https:// oder mailto: angeben.'); return; }
      bereichZurueck();
      if (text) document.execCommand('createLink', false, w[0]);
      else document.execCommand('insertHTML', false, `<a href="${esc(w[0])}">${esc(w[1] || w[0])}</a>&nbsp;`);
      geaendert();
    },
    umbruch: () => { bereichZurueck(); document.execCommand('insertHTML', false, '<hr class="umbruch"><p><br></p>'); geaendert(); },
    linie: () => { bereichZurueck(); document.execCommand('insertHTML', false, '<hr><p><br></p>'); geaendert(); },
    inhalt: () => { bereichZurueck(); document.execCommand('insertHTML', false, '<nav class="inhalt" contenteditable="false"></nav><p><br></p>'); inhaltAktualisieren(); geaendert(); },
    datum: () => { bereichZurueck(); document.execCommand('insertText', false, new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })); geaendert(); },
    suchen: () => suchFenster(),
    tab: (el) => { bereichZurueck(); ({ 'zeile-oben': () => tabZeile(-1), 'zeile-unten': () => tabZeile(1), 'spalte-links': () => tabSpalte(-1), 'spalte-rechts': () => tabSpalte(1), kopf: tabKopf, 'weg-zeile': () => tabWeg('zeile'), 'weg-spalte': () => tabWeg('spalte'), weg: () => tabWeg('tabelle') })[el.dataset.w]?.(); },
    'bild-groesse': (el) => { const b = S.bild; if (!b) return; const w = Math.round((b.width || 300) * (1 + Number(el.dataset.d))); b.style.width = `${Math.max(40, Math.min(w, 680))}px`; geaendert(); zeigeSchwebe(); },
    'bild-aus': (el) => { const b = S.bild; if (!b) return; b.dataset.aus = el.dataset.a; geaendert(); zeigeSchwebe(); },
    'bild-weg': () => { const b = S.bild; if (!b) return; b.remove(); S.bild = null; geaendert(); zeigeSchwebe(); },
    zoom: (el) => { S.zoom = Math.max(50, Math.min(200, (S.zoom || 100) + Number(el.dataset.d))); const r = app.querySelector('.blattrahmen'); if (r) r.style.zoom = S.zoom / 100; const b = app.querySelector('.zoom b'); if (b) b.textContent = `${S.zoom} %`; },
    start: () => zeigeStart(),
    einstellungen: () => einstellungen(),
    rundgang: () => window.Rundgang?.start(S.ansicht === 'start' ? RUNDGANG_START() : RUNDGANG(), true),
    oeffne: (el, ev) => { if (ev?.target?.closest('[data-aktion="loeschen"]')) return; oeffne(el.dataset.id); },
    loeschen: async (el) => {
      const d = S.liste.find((x) => x.id === el.dataset.id);
      if (!await frage({ titel: `„${d?.name || 'Dokument'}“ löschen?`, text: 'Das lässt sich nicht rückgängig machen.', ja: 'Löschen' })) return;
      await A.dokumente.loeschen(el.dataset.id); meldung('Gelöscht.'); zeigeStart();
    },
    neu: async () => { const d = await A.dokumente.neu('Neues Dokument'); oeffne(d.id); },
    vorlage: async (el) => { const v = VORLAGEN.find((x) => x.k === el.dataset.k); const d = await A.dokumente.neu(v.k === 'leer' ? 'Neues Dokument' : v.titel, v.html()); oeffne(d.id); },
    startschreiben: async () => {
      const w = app.querySelector('#startwunsch')?.value.trim(); if (!w) return app.querySelector('#startwunsch')?.focus();
      const name = w.replace(/^(schreib|mach|erstell)\w*\s+(mir\s+)?(eine?n?\s+)?/i, '').slice(0, 60) || 'Neues Dokument';
      const d = await A.dokumente.neu(name.charAt(0).toUpperCase() + name.slice(1), '<p><br></p>');
      await oeffne(d.id);
      frageSchwalbe(`Schreib mir dazu einen vollständigen ersten Entwurf als ganzes Dokument: ${w}`, w);
    },
    importieren: async () => { const r = await A.datei.importieren(); if (r?.abgebrochen) return; if (r?.fehler) return meldung(`Öffnen ging nicht: ${r.fehler.nachricht}`); oeffne(r.id); },
    albatros: () => albatrosWaehlen(),
    'live-neu': async () => { const n = await liveAktualisieren(S.live); meldung(n ? 'Tabelle aktualisiert.' : 'Schon aktuell.'); zeigeSchwebe(); },
    'live-oeffnen': () => { const [, id] = (S.live?.dataset.quelle || '').split(':'); if (id) A.albatros.oeffnen(id); },
    'live-loesen': () => { if (!S.live) return; S.live.removeAttribute('data-quelle'); S.live.removeAttribute('data-quelle-name'); S.live.removeAttribute('contenteditable'); S.live.classList.remove('live-fehlt'); S.live = null; geaendert(); zeigeSchwebe(); meldung('Verknüpfung gelöst – die Tabelle kannst du jetzt frei bearbeiten.'); },
    'live-weg': () => { if (!S.live) return; S.live.remove(); S.live = null; geaendert(); zeigeSchwebe(); },
    kommentar: () => {
      bereichZurueck();
      const sel = getSelection(); if (!sel.rangeCount || !inBlatt(sel.anchorNode)) { meldung('Erst Text markieren, dann Kommentar.'); return; }
      if (sel.isCollapsed) { sel.modify('move', 'backward', 'word'); sel.modify('extend', 'forward', 'word'); }
      if (sel.isCollapsed) { meldung('Erst Text markieren, dann Kommentar.'); return; }
      const id = `k${Date.now().toString(36)}`;
      const teile = Pruefen.wickle(sel.getRangeAt(0), () => { const e = document.createElement('span'); e.className = 'kom'; e.dataset.kom = id; return e; });
      if (!teile.length) return;
      (S.d.kommentare ||= []).push({ id, autor: Pruefen.autor(), text: '', zeit: new Date().toISOString(), erledigt: false, antworten: [] });
      S.komAktiv = id; S.komFokus = true; sel.collapseToEnd(); geaendert(); zeichneKommentare();
    },
    'kom-erledigt': (el) => { const k = S.d.kommentare.find((x) => x.id === el.closest('.kom-karte').dataset.kom); if (!k) return; k.erledigt = !k.erledigt; if (k.erledigt && S.komAktiv === k.id) S.komAktiv = null; geaendert(); zeichneKommentare(); },
    'kom-loeschen': (el) => { const id = el.closest('.kom-karte').dataset.kom; komAnker(id).forEach((a) => Pruefen.entpacken(a)); S.d.kommentare = S.d.kommentare.filter((x) => x.id !== id); geaendert(); zeichneKommentare(); },
    'kom-bearbeiten': (el) => { S.komBearbeiten = el.closest('.kom-karte').dataset.kom; S.komAktiv = S.komBearbeiten; S.komFokus = true; zeichneKommentare(); },
    'kom-erledigte': () => { S.zeigeErledigte = !S.zeigeErledigte; zeichneKommentare(); },
    verfolgen: () => { S.d.verfolgen = !S.d.verfolgen; meldung(S.d.verfolgen ? 'Änderungen werden jetzt verfolgt.' : 'Änderungen werden nicht mehr verfolgt.'); geaendert(); zeigeLeiste(); zaehle(); },
    endfassung: () => { S.endfassung = !S.endfassung; blatt()?.classList.toggle('endfassung', S.endfassung); zeigeLeiste(); },
    rechtschreibung: () => { S.rechtschreibung = S.rechtschreibung === false; const b = blatt(); if (b) { b.spellcheck = S.rechtschreibung; b.blur(); b.focus(); } zeigeLeiste(); },
    'aend-vor': () => { if (!Pruefen.springe(blatt(), 1)) meldung('Keine Änderungen im Dokument.'); },
    'aend-zurueck': () => { if (!Pruefen.springe(blatt(), -1)) meldung('Keine Änderungen im Dokument.'); },
    'aend-an': () => { bereichZurueck(); const l = Pruefen.betroffen(blatt()); if (!l.length) { Pruefen.springe(blatt(), 1); return; } l.forEach(Pruefen.annehmen); geaendert(); Pruefen.springe(blatt(), 1); zeigeLeiste(); },
    'aend-ab': () => { bereichZurueck(); const l = Pruefen.betroffen(blatt()); if (!l.length) { Pruefen.springe(blatt(), 1); return; } l.forEach(Pruefen.ablehnen); geaendert(); Pruefen.springe(blatt(), 1); zeigeLeiste(); },
    'aend-alle-an': () => { const l = Pruefen.alle(blatt()); l.forEach(Pruefen.annehmen); geaendert(); zeigeLeiste(); meldung(`${l.length} Änderungen angenommen.`); },
    'aend-alle-ab': () => { const l = Pruefen.alle(blatt()); l.forEach(Pruefen.ablehnen); geaendert(); zeigeLeiste(); meldung(`${l.length} Änderungen abgelehnt.`); },
    docx: async () => { const r = await A.datei.docx({ bloecke: bloecke(blatt()), name: S.d.name, opt: { kopf: S.d.kopf || '', fuss: S.d.fuss || '', seitenzahlen: Boolean(S.d.seitenzahlen), kommentare: S.d.kommentare || [] } }); if (r?.ok) meldung('Als Word gespeichert.', { knopf: 'Zeigen', aktion: () => A.datei.zeigen(r.datei) }); else if (r?.fehler) meldung(`Ging nicht: ${r.fehler.nachricht}`); },
    pdf: async () => { const r = await A.datei.pdf({ html: druckHtml(), name: S.d.name, kopf: S.d.kopf || '', fuss: S.d.fuss || '', seitenzahlen: Boolean(S.d.seitenzahlen) }); if (r?.ok) meldung('PDF gespeichert.', { knopf: 'Zeigen', aktion: () => A.datei.zeigen(r.datei) }); else if (r?.fehler) meldung(`Ging nicht: ${r.fehler.nachricht}`); },
    drucken: async () => { const r = await A.datei.drucken({ html: druckHtml() }); if (r?.fehler) meldung(`Drucken ging nicht: ${r.fehler.nachricht}`); },
    umbenennen: (el) => {
      const f = document.createElement('input'); f.value = S.d.name; f.className = 'umbenennen'; el.replaceWith(f); f.focus(); f.select();
      const fertig = () => { S.d.name = f.value.trim() || S.d.name; geaendert(); zeigeDokument(); };
      f.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') fertig(); if (ev.key === 'Escape') zeigeDokument(); });
      f.addEventListener('blur', fertig);
    },
    'helfer-klappen': () => { S.helferZu = !S.helferZu; try { localStorage.setItem('helferZu', S.helferZu ? 'ja' : 'nein'); } catch { /* egal */ } app.querySelector('.oo-inhalt')?.classList.toggle('zu', S.helferZu); },
    ori: () => { if (S.helferZu) aktionen['helfer-klappen'](); setTimeout(() => app.querySelector('#frage')?.focus(), 60); },
    senden: () => { const f = app.querySelector('#frage'); const w = f?.value.trim(); if (!w) return f?.focus(); f.value = ''; frageSchwalbe(w); },
    frage: (el) => frageSchwalbe(el.dataset.text, el.textContent.trim()),
    rueckgaengig: () => { blatt()?.focus(); document.execCommand('undo'); geaendert(); },
    springe: (el) => { const h = [...blatt().querySelectorAll('h1,h2,h3')].filter((x) => x.textContent.trim() && !x.closest('nav.inhalt'))[Number(el.dataset.i)]; h?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  };

  app.addEventListener('mousedown', (ev) => { if (ev.target.closest('.oo-leiste .wz, .schwebeleiste button')) ev.preventDefault(); });
  app.addEventListener('click', (ev) => {
    const rt = ev.target.closest('[data-reiter]'); if (rt) { S.reiter = rt.dataset.reiter; zeigeLeiste(); return; }
    const c = ev.target.closest('[data-cmd]');
    if (c) { bereichZurueck(); document.execCommand(c.dataset.cmd); geaendert(); auswahlGeaendert(); return; }
    const a = ev.target.closest('[data-aktion]');
    if (a && aktionen[a.dataset.aktion]) { aktionen[a.dataset.aktion](a, ev); return; }
    const karte = ev.target.closest('.kom-karte');
    if (karte && !ev.target.closest('textarea')) { komAktiv(karte.dataset.kom); komAnker(karte.dataset.kom)[0]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  });
  app.addEventListener('focusout', (ev) => { if (ev.target.matches?.('.kom-text, .kom-neu-antwort') && ev.target.isConnected && !S.zeichnet) setTimeout(() => komSpeichernAusFeld(ev.target), 0); });
  app.addEventListener('keydown', (ev) => {
    if (!ev.target.matches?.('.kom-text, .kom-neu-antwort')) return;
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ev.target.blur(); }
    if (ev.key === 'Escape') { ev.preventDefault(); const c = ev.target.closest('.kom-karte'); const k = S.d.kommentare.find((x) => x.id === c?.dataset.kom); if (k && !k.text && ev.target.classList.contains('kom-text')) { komAnker(k.id).forEach((x) => Pruefen.entpacken(x)); S.d.kommentare = S.d.kommentare.filter((x) => x !== k); S.komBearbeiten = null; geaendert(); zeichneKommentare(); } else ev.target.blur(); }
  });
  app.addEventListener('change', (ev) => {
    if (ev.target.matches('.absatz')) { bereichZurueck(); document.execCommand('formatBlock', false, ev.target.value); geaendert(); }
    if (ev.target.matches('.schrift') && ev.target.value) schriftSetzen('schrift', ev.target.value);
    if (ev.target.matches('.groesse') && ev.target.value) schriftSetzen('groesse', ev.target.value);
    if (ev.target.matches('.abstand') && ev.target.value) { const v = ev.target.value; bloeckeDerAuswahl().forEach((b) => { b.style.lineHeight = v; }); geaendert(); ev.target.value = ''; }
    if (ev.target.matches('.kf-seiten')) { S.d.seitenzahlen = ev.target.checked; kopfFussZeigen(); geaendert(); }
  });
  app.addEventListener('input', (ev) => { if (ev.target.matches('.kf')) { S.d[ev.target.dataset.kf] = ev.target.value.slice(0, 300); kopfFussZeigen(); geaendert(); } });
  app.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.datei[data-aktion]')) { ev.preventDefault(); aktionen.oeffne(ev.target, ev); } });
  // Datei aufs Fenster ziehen
  document.addEventListener('dragover', (ev) => ev.preventDefault());
  document.addEventListener('drop', async (ev) => {
    const f = ev.dataTransfer?.files?.[0]; if (!f) return;
    ev.preventDefault();
    const p = A.pfadVon(f); if (!/\.(docx|txt|md)$/i.test(p)) return meldung('Nur .docx oder .txt.');
    const r = await A.datei.importieren(p); if (r?.fehler) return meldung(`Öffnen ging nicht: ${r.fehler.nachricht}`); oeffne(r.id);
  });
  window.addEventListener('focus', () => { if (S.ansicht === 'dokument' && blatt()?.querySelector('table[data-quelle]')) liveAktualisieren(); });
  A.beimOeffnen(async (o) => { if (o.id) oeffne(o.id); else if (o.datei) { const r = await A.datei.importieren(o.datei); if (!r?.fehler) oeffne(r.id); } });
  window.SchwalbeTest = { saeubern, bloecke };

  zeigeStart();
})();
