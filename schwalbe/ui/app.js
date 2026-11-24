'use strict';
// Schwalbe – Oberfläche: Start, Schreibtisch mit Blatt, Helfer links, Einstellungen.
(function () {
  const A = window.SCH;
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Kleinkram ----------
  const ICON = {
    links: 'M15 18l-6-6 6-6', zahnrad: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    zurueck: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3', vor: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3', plus: 'M12 5v14M5 12h14', muell: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
    export: 'M12 3v12M7 10l5 5 5-5M5 21h14', oeffnen: 'M3 7h6l2 2h10v10H3z', senden: 'M12 19V5M5 12l7-7 7 7', drucker: 'M6 9V3h12v6M6 18H4v-6h16v6h-2M6 14h12v7H6z',
    ul: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01', ol: 'M10 6h10M10 12h10M10 18h10M4 4v4M3 8h2M3 14h2l-2 3h2', links2: 'M3 6h18M3 12h12M3 18h16', mitte: 'M3 6h18M6 12h12M4 18h16', rechts: 'M3 6h18M9 12h12M5 18h16',
    radier: 'M7 21h10M5 15l9-9 5 5-9 9H6z', zitat: 'M7 8h4v4H7zM7 12c0 3-1 4-3 5M15 8h4v4h-4zM15 12c0 3-1 4-3 5', strich: 'M4 12h16', pdf: 'M6 2h9l5 5v15H6zM14 2v6h6', word: 'M6 2h9l5 5v15H6zM9 12l1.5 6 1.5-4 1.5 4 1.5-6',
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
  const ERLAUBT = { H1: 'h1', H2: 'h2', H3: 'h3', P: 'p', DIV: 'p', UL: 'ul', OL: 'ol', LI: 'li', STRONG: 'strong', B: 'strong', EM: 'em', I: 'em', U: 'u', S: 's', STRIKE: 's', DEL: 's', BLOCKQUOTE: 'blockquote', BR: 'br', HR: 'hr', SPAN: '', FONT: '', A: '' };
  function saeubern(html) {
    const doc = new DOMParser().parseFromString(`<div>${String(html || '')}</div>`, 'text/html');
    const raus = (knoten) => {
      let s = '';
      knoten.childNodes.forEach((k) => {
        if (k.nodeType === 3) { s += esc(k.textContent); return; }
        if (k.nodeType !== 1) return;
        const tag = k.tagName;
        if (['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'IMG', 'SVG', 'IFRAME', 'OBJECT'].includes(tag)) return;
        const neu = ERLAUBT[tag];
        if (neu === undefined || neu === '') { s += raus(k); return; }
        if (neu === 'br' || neu === 'hr') { s += `<${neu}>`; return; }
        const aus = /^(p|h[123])$/.test(neu) && /^(center|right|justify)$/.test(k.style?.textAlign || '') ? ` style="text-align:${k.style.textAlign}"` : '';
        s += `<${neu}${aus}>${raus(k)}</${neu}>`;
      });
      return s;
    };
    let s = raus(doc.body.firstChild);
    // lose Inline-Teile oben in Absätze packen
    if (s && !/^\s*<(h[123]|p|ul|ol|blockquote|hr)/.test(s)) s = `<p>${s}</p>`;
    return s.replace(/<p>\s*<\/p>/g, '<p><br></p>');
  }

  // Blöcke für .docx
  function bloecke(wurzel) {
    const aus = [];
    const laeufe = (el) => {
      const liste = [];
      const geh = (k, st) => {
        if (k.nodeType === 3) { if (k.textContent) liste.push({ t: k.textContent.replace(/ /g, ' '), ...st }); return; }
        if (k.nodeType !== 1) return;
        if (k.tagName === 'BR') { liste.push({ t: '\n', ...st }); return; }
        const n = { ...st };
        if (/^(STRONG|B)$/.test(k.tagName)) n.f = true;
        if (/^(EM|I)$/.test(k.tagName)) n.k = true;
        if (k.tagName === 'U') n.u = true;
        if (/^(S|STRIKE|DEL)$/.test(k.tagName)) n.s = true;
        k.childNodes.forEach((c) => geh(c, n));
      };
      el.childNodes.forEach((c) => geh(c, {}));
      // "\n" am Ende eines Absatzes weglassen (Chromium hängt <br> an leere Absätze)
      while (liste.length && liste[liste.length - 1].t === '\n') liste.pop();
      return liste;
    };
    const ausr = (el) => (/^(center|right|justify)$/.test(el.style?.textAlign || '') ? el.style.textAlign : undefined);
    wurzel.childNodes.forEach((k) => {
      if (k.nodeType === 3) { if (k.textContent.trim()) aus.push({ art: 'p', laeufe: [{ t: k.textContent }] }); return; }
      if (k.nodeType !== 1) return;
      const t = k.tagName;
      if (/^H[123]$/.test(t)) aus.push({ art: t.toLowerCase(), ausrichtung: ausr(k), laeufe: laeufe(k) });
      else if (t === 'UL' || t === 'OL') k.querySelectorAll(':scope > li').forEach((li) => aus.push({ art: t.toLowerCase(), laeufe: laeufe(li) }));
      else if (t === 'BLOCKQUOTE') aus.push({ art: 'zitat', laeufe: laeufe(k) });
      else if (t === 'HR') aus.push({ art: 'p', laeufe: [{ t: '—————' }], ausrichtung: 'center' });
      else aus.push({ art: 'p', ausrichtung: ausr(k), laeufe: laeufe(k) });
    });
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
    S.d = d; S.verlauf = []; zeigeDokument();
  }
  let speicherUhr = null;
  function geaendert() {
    if (!S.d) return;
    const chip = app.querySelector('.gespeichert'); if (chip) chip.textContent = 'speichert …';
    clearTimeout(speicherUhr);
    speicherUhr = setTimeout(async () => {
      S.d.html = blatt()?.innerHTML || S.d.html;
      const r = await A.dokumente.speichern({ id: S.d.id, name: S.d.name, html: S.d.html });
      const c = app.querySelector('.gespeichert'); if (c) c.textContent = r?.fehler ? 'nicht gespeichert!' : 'gespeichert';
    }, 600);
    zaehle(); gliederung();
  }
  const blatt = () => app.querySelector('.seite');

  function zeigeDokument() {
    S.ansicht = 'dokument';
    app.innerHTML = `<header class="oo-kopf">
        <button type="button" class="oo-ikon" data-aktion="start" title="Alle Dokumente" aria-label="Alle Dokumente">${vogel('ruhezustand-2', 30)}</button><b class="oo-app">Schwalbe</b>
        <div class="oo-dok"><b data-aktion="umbenennen" title="Zum Umbenennen klicken">${esc(S.d.name)}</b><small><span class="gespeichert">gespeichert</span></small></div>
        <nav class="oo-menue" aria-label="Datei">
          <button type="button" class="m" data-aktion="neu">Neu</button>
          <button type="button" class="m" data-aktion="importieren">Öffnen</button>
          <button type="button" class="m" data-aktion="docx">Als Word</button>
          <button type="button" class="m" data-aktion="pdf">Als PDF</button>
          <button type="button" class="m" data-aktion="drucken">Drucken</button>
        </nav>
        <div class="platz"></div>
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
            <div class="oo-leiste" role="toolbar" aria-label="Werkzeuge">
              <button type="button" class="wz" data-cmd="undo" title="Rückgängig (Strg+Z)" aria-label="Rückgängig">${sym('zurueck', 16)}</button>
              <button type="button" class="wz" data-cmd="redo" title="Wiederholen (Strg+Y)" aria-label="Wiederholen">${sym('vor', 16)}</button>
              <span class="tz"></span>
              <select class="absatz" aria-label="Absatzart"><option value="p">Text</option><option value="h1">Überschrift 1</option><option value="h2">Überschrift 2</option><option value="h3">Überschrift 3</option><option value="blockquote">Zitat</option></select>
              <span class="tz"></span>
              <button type="button" class="wz" data-cmd="bold" title="Fett (Strg+B)" aria-label="Fett"><b>F</b></button>
              <button type="button" class="wz" data-cmd="italic" title="Kursiv (Strg+I)" aria-label="Kursiv"><i style="font-family:'Source Serif 4',serif">K</i></button>
              <button type="button" class="wz" data-cmd="underline" title="Unterstrichen (Strg+U)" aria-label="Unterstrichen"><u>U</u></button>
              <button type="button" class="wz" data-cmd="strikeThrough" title="Durchgestrichen" aria-label="Durchgestrichen"><s>S</s></button>
              <span class="tz"></span>
              <button type="button" class="wz" data-cmd="insertUnorderedList" title="Aufzählung" aria-label="Aufzählung">${sym('ul', 17)}</button>
              <button type="button" class="wz" data-cmd="insertOrderedList" title="Nummerierung" aria-label="Nummerierung">${sym('ol', 17)}</button>
              <span class="tz"></span>
              <button type="button" class="wz" data-cmd="justifyLeft" title="Linksbündig" aria-label="Linksbündig">${sym('links2', 17)}</button>
              <button type="button" class="wz" data-cmd="justifyCenter" title="Zentriert" aria-label="Zentriert">${sym('mitte', 17)}</button>
              <button type="button" class="wz" data-cmd="justifyRight" title="Rechtsbündig" aria-label="Rechtsbündig">${sym('rechts', 17)}</button>
              <span class="tz"></span>
              <button type="button" class="wz" data-cmd="removeFormat" title="Formatierung entfernen" aria-label="Formatierung entfernen">${sym('radier', 17)}</button>
            </div>
            <div class="oo-karte">
              <div class="schreibtisch">
                <nav class="gliederung" aria-label="Gliederung"></nav>
                <div class="blattrahmen"><div class="perforation" aria-hidden="true"></div><article class="seite" contenteditable="true" spellcheck="true" aria-label="Dokument">${saeubern(S.d.html)}</article></div>
              </div>
              <footer class="statuszeile"><span class="zahlen"></span><div class="platz"></div><span class="markiert"></span></footer>
            </div>
          </div>
        </div>
      </main>`;
    const s = blatt();
    s.addEventListener('input', geaendert);
    s.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const html = ev.clipboardData.getData('text/html');
      const text = ev.clipboardData.getData('text/plain');
      if (html) document.execCommand('insertHTML', false, saeubern(html));
      else document.execCommand('insertText', false, text);
    });
    s.addEventListener('drop', (ev) => { if (ev.dataTransfer?.files?.length) ev.preventDefault(); });
    s.addEventListener('keydown', (ev) => {
      if (ev.ctrlKey && !ev.shiftKey && ev.key.toLowerCase() === 's') { ev.preventDefault(); aktionen.docx(); }
      if (ev.ctrlKey && ev.key.toLowerCase() === 'p') { ev.preventDefault(); aktionen.drucken(); }
    });
    document.addEventListener('selectionchange', auswahlGeaendert);
    zeichneHelfer(); zaehle(); gliederung(); auswahlGeaendert();
    if (!s.textContent.trim() || s.textContent.trim() === 'Neues Dokument') { const h = s.querySelector('h1'); if (h) { const r = document.createRange(); r.selectNodeContents(h); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } s.focus(); }
    setTimeout(() => window.Rundgang?.start(RUNDGANG()), 600);
  }

  function zaehle() {
    const s = blatt(); const z = app.querySelector('.zahlen'); if (!s || !z) return;
    const text = s.innerText.replace(/\s+/g, ' ').trim();
    const woerter = text ? text.split(' ').length : 0;
    const seiten = Math.max(1, Math.ceil(s.scrollHeight / 1123));
    z.textContent = `${woerter} ${woerter === 1 ? 'Wort' : 'Wörter'} · ${text.length} Zeichen · ${seiten} ${seiten === 1 ? 'Seite' : 'Seiten'} · Lesezeit ${Math.max(1, Math.round(woerter / 200))} Min.`;
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
    app.querySelectorAll('.wz[data-cmd]').forEach((b) => { if (['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'].includes(b.dataset.cmd)) b.classList.toggle('an', document.queryCommandState(b.dataset.cmd)); });
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
    S.verlauf.push({ wer: 'du', text: anzeige || wunsch }); S.denkt = true; zeichneHelfer();
    const r = await A.assistent({ wunsch, html: blatt().innerHTML, auswahl, name: S.d.name });
    S.denkt = false;
    if (r?.fehler) { S.verlauf.push({ wer: 'sie', text: `Das hat nicht geklappt: ${r.fehler.nachricht}`, fehler: true }); zeichneHelfer(); return; }
    let geaendertJa = false;
    const html = r.html ? saeubern(r.html) : '';
    if (html && r.aktion !== 'keine') {
      if (r.aktion === 'dokument') { const s = blatt(); s.focus(); const rg = document.createRange(); rg.selectNodeContents(s); sel.removeAllRanges(); sel.addRange(rg); document.execCommand('insertHTML', false, html); geaendertJa = true; }
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
    </style></head><body>${saeubern(blatt().innerHTML)}</body></html>`;
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
    { ziel: '.oo-leiste', titel: 'Die Werkzeuge', text: 'Überschriften, Fett, Listen, Ausrichtung. Strg+B, Strg+I und Strg+Z gehen natürlich auch.' },
    { ziel: '.oo-seite', titel: 'Hier bin ich', text: 'Sag mir, was ich tun soll: kürzer, förmlicher, Fehler raus, weiterschreiben. Markierst du vorher Text, kümmer ich mich nur um den. Mit ‹ klappst du mich weg.' },
    { ziel: '.gliederung', titel: 'Gliederung', text: 'Deine Überschriften. Ein Klick, und du springst hin.' },
    { ziel: '.oo-menue', titel: 'Fertig?', text: 'Als Word (.docx) oder PDF speichern oder gleich drucken. Das ? oben rechts startet diesen Rundgang nochmal.' },
  ] });

  // ---------- Aktionen ----------
  const aktionen = {
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
    docx: async () => { const r = await A.datei.docx({ bloecke: bloecke(blatt()), name: S.d.name }); if (r?.ok) meldung('Als Word gespeichert.', { knopf: 'Zeigen', aktion: () => A.datei.zeigen(r.datei) }); else if (r?.fehler) meldung(`Ging nicht: ${r.fehler.nachricht}`); },
    pdf: async () => { const r = await A.datei.pdf({ html: druckHtml(), name: S.d.name }); if (r?.ok) meldung('PDF gespeichert.', { knopf: 'Zeigen', aktion: () => A.datei.zeigen(r.datei) }); else if (r?.fehler) meldung(`Ging nicht: ${r.fehler.nachricht}`); },
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
    springe: (el) => { const h = [...blatt().querySelectorAll('h1,h2,h3')].filter((x) => x.textContent.trim())[Number(el.dataset.i)]; h?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  };

  app.addEventListener('mousedown', (ev) => { if (ev.target.closest('.oo-leiste .wz')) ev.preventDefault(); });
  app.addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-cmd]');
    if (c) { bereichZurueck(); document.execCommand(c.dataset.cmd); geaendert(); auswahlGeaendert(); return; }
    const a = ev.target.closest('[data-aktion]');
    if (a && aktionen[a.dataset.aktion]) aktionen[a.dataset.aktion](a, ev);
  });
  app.addEventListener('change', (ev) => {
    if (ev.target.matches('.absatz')) { bereichZurueck(); document.execCommand('formatBlock', false, ev.target.value); geaendert(); }
  });
  app.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.datei[data-aktion]')) { ev.preventDefault(); aktionen.oeffne(ev.target, ev); } });
  // Datei aufs Fenster ziehen
  document.addEventListener('dragover', (ev) => ev.preventDefault());
  document.addEventListener('drop', async (ev) => {
    const f = ev.dataTransfer?.files?.[0]; if (!f) return;
    ev.preventDefault();
    const p = A.pfadVon(f); if (!/\.(docx|txt|md)$/i.test(p)) return meldung('Nur .docx oder .txt.');
    const r = await A.datei.importieren(p); if (r?.fehler) return meldung(`Öffnen ging nicht: ${r.fehler.nachricht}`); oeffne(r.id);
  });
  A.beimOeffnen(async (o) => { if (o.id) oeffne(o.id); else if (o.datei) { const r = await A.datei.importieren(o.datei); if (!r?.fehler) oeffne(r.id); } });
  window.SchwalbeTest = { saeubern, bloecke };

  zeigeStart();
})();
