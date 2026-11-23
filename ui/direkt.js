'use strict';
// Kranich – direkt bearbeiten, ohne Claude zu fragen:
// Eigenschaften am Element, Bausteine ziehen, Werkzeuge (Text, Rechteck, Bild, Notiz),
// Text direkt tippen, Notizen auf der Leinwand und Vorschläge zum Annehmen.
(function () {
  const E = () => window.Entwurf;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let A = null; // Anbindung an app.js
  const abgelehnt = new Set();

  // ---------- Farben und Maße lesen ----------
  function rgbZuHex(c) {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c || '');
    if (!m || (m[4] !== undefined && Number(m[4]) < 0.05)) return null;
    return `#${[m[1], m[2], m[3]].map((x) => Math.round(Number(x)).toString(16).padStart(2, '0')).join('')}`;
  }
  const hell = (hex) => { const n = parseInt(hex.slice(1), 16); const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const kontrast = (a, b) => { const x = hell(a), y = hell(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function hintergrundVon(el) {
    let e = el;
    while (e && e.nodeType === 1) { const f = rgbZuHex(getComputedStyle(e).backgroundColor); if (f) return f; e = e.parentElement; }
    return '#ffffff';
  }
  // Die Farben, die im Board vorkommen (für die Farbkleckse)
  function palette(doc) {
    const zahl = new Map();
    const els = doc.body.querySelectorAll('*');
    for (let i = 0; i < els.length && i < 600; i++) {
      const cs = getComputedStyle(els[i]);
      for (const c of [cs.backgroundColor, cs.color]) { const h = rgbZuHex(c); if (h) zahl.set(h, (zahl.get(h) || 0) + 1); }
    }
    return [...zahl.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]).slice(0, 7);
  }
  const hauptfarbe = (doc) => {
    for (const el of doc.querySelectorAll('button, .btn, a[class*="knopf"], [class*="button"]')) { const h = rgbZuHex(getComputedStyle(el).backgroundColor); if (h && h !== '#ffffff') return h; }
    return '#7c5cd6';
  };
  const blatt = (el) => ![...el.children].some((k) => !['br', 'b', 'strong', 'i', 'em', 'span', 'small'].includes(k.localName));

  // ---------- Bausteine ----------
  const BAUSTEINE = [
    ['ueberschrift', 'Überschrift', 'M4 6v12M12 6v12M4 12h8M17 10l3-2v10'],
    ['text', 'Text', 'M4 7h16M4 12h16M4 17h10'],
    ['knopf', 'Knopf', 'M4 8h16v8H4zM9 12h6'],
    ['karte', 'Karte', 'M4 5h12l4 4v10H4z'],
    ['bild', 'Bild', 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4'],
    ['liste', 'Liste', 'M9 7h11M9 12h11M9 17h11M4 7h1M4 12h1M4 17h1'],
    ['eingabe', 'Eingabefeld', 'M4 8h16v8H4zM7 12h1'],
    ['linie', 'Trennlinie', 'M3 12h18'],
  ];
  const BILD = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9e1fd"/><stop offset="1" stop-color="#fbf0dc"/></linearGradient></defs><rect width="320" height="200" fill="url(#g)"/><circle cx="236" cy="62" r="26" fill="#9b82e8"/><path d="M0 200 L110 92 L190 160 L240 118 L320 190 V200Z" fill="#7c5cd6" opacity=".75"/></svg>')}`;

  function klone(doc, sel, text) {
    const v = doc.querySelector(sel); if (!v) return null;
    const n = v.cloneNode(true);
    n.querySelectorAll('[data-k]').forEach((x) => x.removeAttribute('data-k')); n.removeAttribute('data-k'); n.removeAttribute('id');
    if (text !== undefined && blatt(n)) n.textContent = text;
    return n;
  }
  function baustein(art, doc) {
    const farbe = hauptfarbe(doc);
    const neu = (html) => { const d = doc.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
    switch (art) {
      case 'ueberschrift': return klone(doc, 'h2', 'Neue Überschrift') || klone(doc, 'h1', 'Neue Überschrift') || neu('<h2 style="margin:16px 0 8px;font-size:26px">Neue Überschrift</h2>');
      case 'text': return klone(doc, 'p', 'Hier steht dein Text. Doppelklick zum Ändern.') || neu('<p style="margin:8px 0;line-height:1.5">Hier steht dein Text. Doppelklick zum Ändern.</p>');
      case 'knopf': return klone(doc, 'button', 'Neuer Knopf') || neu(`<button type="button" style="padding:12px 20px;border:0;border-radius:10px;background:${farbe};color:#fff;font:inherit;font-weight:700">Neuer Knopf</button>`);
      case 'karte': return klone(doc, '[class*="karte"], [class*="card"]') || neu(`<div style="padding:16px 18px;border-radius:12px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.08);margin:12px 0"><h3 style="margin:0 0 6px;font-size:18px">Neue Karte</h3><p style="margin:0;opacity:.75">Ein Satz, worum es geht.</p></div>`);
      case 'bild': return neu(`<img alt="Bild" src="${BILD}" style="display:block;width:100%;max-width:360px;aspect-ratio:16/10;object-fit:cover;border-radius:12px;margin:12px 0">`);
      case 'liste': return klone(doc, 'ul') || neu('<ul style="margin:10px 0;padding-left:20px;line-height:1.7"><li>Erster Punkt</li><li>Zweiter Punkt</li><li>Dritter Punkt</li></ul>');
      case 'eingabe': return neu(`<label style="display:flex;flex-direction:column;gap:6px;margin:10px 0;font-weight:600">Feldname<input placeholder="Hier tippen …" style="padding:11px 12px;border:1.5px solid #d9d2c4;border-radius:10px;font:inherit;font-weight:400"></label>`);
      case 'linie': return neu('<hr style="border:0;border-top:1.5px dashed #ddd5c6;margin:16px 0">');
      case 'rechteck': return neu(`<div data-name="Rechteck" style="width:180px;height:110px;border-radius:10px;background:${farbe};opacity:.85;margin:12px 0"></div>`);
      default: return null;
    }
  }
  const BEHAELTER = /^(div|section|main|article|aside|form|header|footer|nav|ul|ol|fieldset)$/;
  function einfuegen(b, ziel, node, was) {
    const doc = b.iframe.contentDocument;
    if (!ziel || ziel === doc.body) (doc.querySelector('main') || doc.body).appendChild(node);
    else if (node.localName === 'li' && ziel.localName === 'li') ziel.after(node);
    else if (BEHAELTER.test(ziel.localName) && ![...ziel.children].some((k) => /^(p|h\d|button|img|ul|div|section|a|input|label)$/.test(k.localName))) ziel.appendChild(node);
    else ziel.after(node);
    E().kennzeichne(doc, node);
    E().speichereDirekt(b, was);
    setTimeout(() => E().waehleEl(node, b), 30);
  }

  // ---------- Eigenschaften-Karte ----------
  function feld(name, wert, eigen, einheit = 'px') { return `<label class="ef"><span>${name}</span><input type="number" min="0" step="1" data-stil="${eigen}" value="${wert}" aria-label="${name}"><i>${einheit}</i></label>`; }
  function zeichne() {
    const box = document.querySelector('.eigenschaften'); if (!box) return;
    const a = E()?.aktiv(); const k = A.S.auswahl?.k;
    const el = k && a ? a.doc.querySelector(`[data-k="${k}"]`) : null;
    if (!el || A.S.modus !== 'entwurf') { box.hidden = true; return; }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const px = (v) => Math.round(parseFloat(v) || 0);
    const farben = palette(a.doc);
    const bg = rgbZuHex(cs.backgroundColor); const fg = rgbZuHex(cs.color) || '#1d2742';
    const textFeld = blatt(el) && !['img', 'input', 'svg', 'hr'].includes(el.localName);
    const fett = Number(cs.fontWeight) >= 600;
    const vorschlaege = pruefe(el, cs, a.doc).filter((v) => !abgelehnt.has(`${k}:${v.id}`));
    box.innerHTML = `<div class="ek"><b class="h">${esc(E().nameVon(el))}</b><small>${el.localName} · ${Math.round(r.width)} × ${Math.round(r.height)}</small></div>
      ${textFeld ? `<label class="eftext"><span>Text</span><textarea data-text rows="2" aria-label="Text">${esc(el.textContent.trim())}</textarea></label>` : ''}
      ${el.localName === 'img' ? '<button type="button" class="btn btn-s" data-direkt="bild-ersetzen" style="width:100%">Bild ersetzen …</button>' : ''}
      <div class="ef2">${feld('B', px(r.width), 'width')}${feld('H', px(r.height), 'height')}${feld('Ecke', px(cs.borderTopLeftRadius), 'borderRadius')}${feld('Innen', px(cs.paddingTop), 'padding')}${feld('Schrift', px(cs.fontSize), 'fontSize')}${feld('Abstand', px(cs.marginTop), 'margin')}</div>
      <div class="efreihe"><span>Fläche</span><div class="kleckse">${farben.map((f) => `<button type="button" class="klecks ${bg === f ? 'an' : ''}" data-farbe="backgroundColor" data-wert="${f}" style="background:${f}" title="${f}"></button>`).join('')}<label class="klecks frei" title="Eigene Farbe"><input type="color" data-farbwahl="backgroundColor" value="${bg || '#ffffff'}"></label><button type="button" class="klecks keine" data-farbe="backgroundColor" data-wert="transparent" title="Keine Fläche">✕</button></div></div>
      <div class="efreihe"><span>Schrift</span><div class="kleckse">${farben.slice(0, 5).map((f) => `<button type="button" class="klecks ${fg === f ? 'an' : ''}" data-farbe="color" data-wert="${f}" style="background:${f}" title="${f}"></button>`).join('')}<label class="klecks frei" title="Eigene Farbe"><input type="color" data-farbwahl="color" value="${fg}"></label>
        <button type="button" class="efknopf ${fett ? 'an' : ''}" data-direkt="fett" title="Fett"><b>F</b></button>${['left', 'center', 'right'].map((x) => `<button type="button" class="efknopf ${cs.textAlign === x || (x === 'left' && cs.textAlign === 'start') ? 'an' : ''}" data-ausrichten="${x}" title="${{ left: 'Links', center: 'Mitte', right: 'Rechts' }[x]}">${{ left: '⇤', center: '↔', right: '⇥' }[x]}</button>`).join('')}</div></div>
      <div class="efaktionen"><button type="button" class="efknopf" data-direkt="hoch" title="Nach vorne/oben">↑</button><button type="button" class="efknopf" data-direkt="runter" title="Nach hinten/unten">↓</button><button type="button" class="efknopf breit" data-direkt="doppeln">Duplizieren</button><button type="button" class="efknopf breit rot" data-direkt="weg">Löschen</button></div>
      ${vorschlaege.length ? `<div class="vorschlaege"><span class="vk">${window.figur ? window.figur('ruhend', 20) : ''} Kranich schlägt vor</span>${vorschlaege.map((v) => `<div class="vorschlag2"><b class="h">${esc(v.titel)}</b><span>${esc(v.text)}</span><div class="reihe"><button type="button" class="btn btn-s btn-p" data-ja="${v.id}">Ja, machen</button><button type="button" class="btn btn-s btn-q" data-nein="${v.id}">Lieber nicht</button></div></div>`).join('')}</div>` : ''}`;
    box.hidden = false;
    box._vorschlaege = vorschlaege;
  }

  // Kleine Prüfungen am gewählten Element
  function pruefe(el, cs, doc) {
    const aus = [];
    const r = el.getBoundingClientRect();
    const klickbar = /^(button|a|input|select|textarea)$/.test(el.localName) || el.getAttribute('role') === 'button';
    if (klickbar && r.height > 0 && r.height < 40) aus.push({ id: 'finger', titel: 'Größer für Finger', text: `Nur ${Math.round(r.height)} px hoch. Zum Antippen sind 44 px angenehmer.`, tun: () => { el.style.minHeight = '44px'; if (parseFloat(cs.paddingTop) < 10) el.style.paddingBlock = '10px'; } });
    const fs = parseFloat(cs.fontSize);
    if (blatt(el) && el.textContent.trim() && fs < 13) aus.push({ id: 'klein', titel: 'Schrift zu klein', text: `${Math.round(fs)} px ist schwer zu lesen – 14 px wären besser.`, tun: () => { el.style.fontSize = '14px'; } });
    const fg = rgbZuHex(cs.color); const bg = hintergrundVon(el);
    if (fg && el.textContent.trim() && blatt(el) && kontrast(fg, bg) < 4.5) aus.push({ id: 'kontrast', titel: 'Schwer lesbar', text: 'Schrift und Hintergrund sind sich zu ähnlich.', tun: () => { el.style.color = hell(bg) > 0.4 ? '#1d2742' : '#ffffff'; } });
    if (el.localName === 'img' && !el.getAttribute('alt')) aus.push({ id: 'alt', titel: 'Bildbeschreibung fehlt', text: 'Für Screenreader sollte das Bild einen kurzen Text haben.', claude: 'Gib dem Bild eine kurze, passende Bildbeschreibung (alt-Text).' });
    if (/^(h1|h2|h3|button)$/.test(el.localName) && el.textContent.trim().length > 60) aus.push({ id: 'lang', titel: 'Text kürzen', text: `${el.textContent.trim().length} Zeichen – kürzer wirkt stärker.`, claude: 'Kürze diesen Text deutlich, Sinn behalten.' });
    if (r.right > doc.documentElement.clientWidth + 2) aus.push({ id: 'raus', titel: 'Ragt über den Rand', text: 'Das Element ist breiter als das Board.', tun: () => { el.style.maxWidth = '100%'; el.style.boxSizing = 'border-box'; } });
    return aus.slice(0, 3);
  }

  function mitElement(fn, was) {
    const a = E().aktiv(); const el = a && A.S.auswahl ? a.doc.querySelector(`[data-k="${A.S.auswahl.k}"]`) : null;
    if (!el) return;
    fn(el, a);
    E().speichereDirekt(a.b, was);
    zeichne();
  }

  function stilWert(eigen, v) { if (v === '' || v === null) return ''; return ['width', 'height', 'borderRadius', 'padding', 'fontSize', 'margin'].includes(eigen) ? `${Math.max(0, Number(v))}px` : v; }

  function verbinde(box) {
    box.addEventListener('input', (ev) => {
      const t = ev.target; const a = E().aktiv(); const el = a?.doc.querySelector(`[data-k="${A.S.auswahl?.k}"]`); if (!el) return;
      if (t.dataset.stil) { el.style[t.dataset.stil] = stilWert(t.dataset.stil, t.value); E().zeigeAuswahl(); }
      if (t.hasAttribute('data-text')) { el.textContent = t.value; E().zeigeAuswahl(); }
      if (t.dataset.farbwahl) el.style[t.dataset.farbwahl] = t.value;
    });
    box.addEventListener('change', (ev) => {
      const t = ev.target;
      if (t.dataset.stil || t.hasAttribute('data-text') || t.dataset.farbwahl) mitElement(() => {}, t.hasAttribute('data-text') ? 'Text geändert' : 'Aussehen geändert');
    });
    box.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.dataset.stil) ev.target.blur(); ev.stopPropagation(); });
    box.addEventListener('click', async (ev) => {
      const t = ev.target.closest('button'); if (!t) return;
      if (t.dataset.farbe) return mitElement((el) => { el.style[t.dataset.farbe] = t.dataset.wert; }, 'Farbe geändert');
      if (t.dataset.ausrichten) return mitElement((el) => { el.style.textAlign = t.dataset.ausrichten; }, 'Ausgerichtet');
      if (t.dataset.ja) {
        const v = box._vorschlaege?.find((x) => x.id === t.dataset.ja); if (!v) return;
        if (v.tun) return mitElement(v.tun, v.titel);
        return A.sende(v.claude);
      }
      if (t.dataset.nein) { abgelehnt.add(`${A.S.auswahl?.k}:${t.dataset.nein}`); return zeichne(); }
      const d = t.dataset.direkt;
      if (d === 'fett') return mitElement((el, a) => { el.style.fontWeight = Number(getComputedStyle(el).fontWeight) >= 600 ? '400' : '700'; }, 'Fett');
      if (d === 'hoch') return mitElement((el) => { if (el.previousElementSibling) el.previousElementSibling.before(el); }, 'Verschoben');
      if (d === 'runter') return mitElement((el) => { if (el.nextElementSibling) el.nextElementSibling.after(el); }, 'Verschoben');
      if (d === 'doppeln') {
        const a = E().aktiv(); const el = a?.doc.querySelector(`[data-k="${A.S.auswahl?.k}"]`); if (!el) return;
        const n = el.cloneNode(true); el.after(n); E().kennzeichne(a.doc, n); E().speichereDirekt(a.b, 'Dupliziert'); setTimeout(() => E().waehleEl(n, a.b), 30); return;
      }
      if (d === 'weg') return A.loesche(A.S.auswahl?.k);
      if (d === 'bild-ersetzen') {
        const r = await window.K.datei.bildWaehlen(); if (!r || r.fehler || !r.dataUrl) return;
        return mitElement((el) => { el.src = r.dataUrl; }, 'Bild ersetzt');
      }
    });
  }

  // ---------- Text direkt tippen (Doppelklick) ----------
  function tippen(b, el) {
    if (!blatt(el) || ['img', 'input', 'svg', 'hr'].includes(el.localName)) return;
    el.contentEditable = 'true'; el.focus();
    const doc = b.iframe.contentDocument; const sel = doc.getSelection(); sel.selectAllChildren(el);
    const fertig = () => { el.removeAttribute('contenteditable'); E().speichereDirekt(b, 'Text geändert'); zeichne(); };
    el.addEventListener('blur', fertig, { once: true });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); } if (e.key === 'Escape') el.blur(); e.stopPropagation(); });
  }

  // ---------- Werkzeuge ----------
  async function setze(b, ziel) {
    const w = A.S.werkzeug;
    if (!['text', 'rechteck', 'bild'].includes(w)) return false;
    const doc = b.iframe.contentDocument;
    let node;
    if (w === 'bild') {
      const r = await window.K.datei.bildWaehlen(); if (!r || r.fehler || !r.dataUrl) { A.werkzeug('zeiger'); return true; }
      node = baustein('bild', doc); node.src = r.dataUrl; node.alt = r.name || 'Bild';
    } else node = baustein(w === 'text' ? 'text' : 'rechteck', doc);
    einfuegen(b, ziel, node, w === 'text' ? 'Text eingefügt' : w === 'bild' ? 'Bild eingefügt' : 'Rechteck eingefügt');
    A.werkzeug('zeiger');
    if (w === 'text') setTimeout(() => tippen(b, node), 80);
    return true;
  }

  // ---------- Notizen auf der Leinwand ----------
  function zeichneNotizen() {
    const welt = E()?.welt(); if (!welt || !A.S.projekt) return;
    welt.querySelectorAll('.notiz').forEach((n) => n.remove());
    for (const n of A.S.projekt.notizen || []) {
      const d = document.createElement('div');
      d.className = 'notiz'; d.dataset.id = n.id;
      d.style.left = `${n.x}px`; d.style.top = `${n.y}px`;
      d.innerHTML = `<span class="nz-griff" title="Ziehen zum Verschieben"></span><button type="button" class="nz-weg" title="Notiz löschen" aria-label="Notiz löschen">✕</button><div class="nz-text" contenteditable="true" spellcheck="false">${esc(n.text)}</div>`;
      welt.appendChild(d);
    }
  }
  function notizDazu(e) {
    const p = E().weltPunkt(e.clientX, e.clientY);
    A.S.projekt.notizen = A.S.projekt.notizen || [];
    const n = { id: `n${Date.now().toString(36)}`, x: Math.round(p.x), y: Math.round(p.y), text: 'Notiz …' };
    A.S.projekt.notizen.push(n);
    zeichneNotizen(); A.speichern();
    const t = E().welt().querySelector(`.notiz[data-id="${n.id}"] .nz-text`);
    if (t) { t.focus(); document.getSelection().selectAllChildren(t); }
    A.werkzeug('zeiger');
  }
  function notizEreignisse(leinwand) {
    leinwand.addEventListener('focusout', (e) => {
      const t = e.target.closest?.('.nz-text'); if (!t) return;
      const n = A.S.projekt?.notizen?.find((x) => x.id === t.parentElement.dataset.id); if (!n) return;
      n.text = t.innerText.trim().slice(0, 400) || 'Notiz';
      A.speichern();
    });
    leinwand.addEventListener('keydown', (e) => { if (e.target.closest?.('.nz-text')) e.stopPropagation(); });
    leinwand.addEventListener('click', (e) => {
      const w = e.target.closest?.('.nz-weg'); if (!w) return;
      A.S.projekt.notizen = (A.S.projekt.notizen || []).filter((x) => x.id !== w.parentElement.dataset.id);
      zeichneNotizen(); A.speichern();
    });
    leinwand.addEventListener('pointerdown', (e) => {
      const g = e.target.closest?.('.nz-griff'); if (!g) return;
      e.preventDefault(); e.stopPropagation();
      const el = g.parentElement; const n = A.S.projekt.notizen.find((x) => x.id === el.dataset.id);
      const start = { x: e.clientX, y: e.clientY, nx: n.x, ny: n.y }; const z = E().zoomWert();
      const bew = (ev) => { n.x = Math.round(start.nx + (ev.clientX - start.x) / z); n.y = Math.round(start.ny + (ev.clientY - start.y) / z); el.style.left = `${n.x}px`; el.style.top = `${n.y}px`; };
      const los = () => { window.removeEventListener('pointermove', bew); window.removeEventListener('pointerup', los); A.speichern(); };
      window.addEventListener('pointermove', bew); window.addEventListener('pointerup', los);
    }, true);
  }

  // ---------- Bausteine-Leiste (links) ----------
  function bausteinLeiste() {
    return `<span class="sk-titel hand">Bausteine <small>ziehen</small></span><div class="bausteine">${BAUSTEINE.map(([id, name, d]) => `<button type="button" class="bst" draggable="true" data-baustein="${id}" title="${name} aufs Board ziehen (oder klicken: kommt unter die Auswahl)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg><span>${name}</span></button>`).join('')}</div>`;
  }
  function ziehEreignisse(app) {
    let art = null;
    app.addEventListener('dragstart', (e) => {
      const b = e.target.closest?.('[data-baustein]'); if (!b) return;
      art = b.dataset.baustein; e.dataTransfer.setData('text/plain', art); e.dataTransfer.effectAllowed = 'copy';
      app.querySelector('.leinwand')?.classList.add('bausteinzug');
    });
    app.addEventListener('dragend', () => { art = null; app.querySelector('.leinwand')?.classList.remove('bausteinzug'); for (const b of document.querySelectorAll('.huelle')) b.hidden = true; });
    app.addEventListener('dragover', (e) => {
      if (!art || !e.target.closest?.('.leinwand')) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
      const p = E().punktAufBoard(e.clientX, e.clientY);
      for (const h of document.querySelectorAll('.huelle')) h.hidden = true;
      if (p) { const el = E().ziel(p.b.iframe.contentDocument.elementFromPoint(p.x, p.y)); E().hervorheben(p.b, el && el !== p.b.iframe.contentDocument.body ? el : null); }
    });
    app.addEventListener('drop', (e) => {
      if (!art || !e.target.closest?.('.leinwand')) return;
      e.preventDefault(); e.stopPropagation();
      const p = E().punktAufBoard(e.clientX, e.clientY);
      const was = art; art = null; app.querySelector('.leinwand')?.classList.remove('bausteinzug');
      if (!p) { window.H?.meldung('Auf ein Board ziehen.'); return; }
      A.waehleBoard(p.b.seite.id);
      const doc = p.b.iframe.contentDocument;
      const el = E().ziel(doc.elementFromPoint(p.x, p.y));
      einfuegen(p.b, el, baustein(was, doc), `${BAUSTEINE.find((x) => x[0] === was)?.[1] || 'Baustein'} eingefügt`);
    }, true);
    // Klick statt ziehen: unter die Auswahl (oder ans Ende)
    app.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-baustein]'); if (!b) return;
      const a = E().aktiv(); if (!a) { window.H?.meldung('Erst ein Board mit Inhalt wählen.'); return; }
      const el = A.S.auswahl?.k ? a.doc.querySelector(`[data-k="${A.S.auswahl.k}"]`) : null;
      einfuegen(a.b, el, baustein(b.dataset.baustein, a.doc), `${b.textContent.trim()} eingefügt`);
    });
  }

  window.Direkt = {
    init(anbindung) { A = anbindung; },
    montiert(app, leinwand) { notizEreignisse(leinwand); zeichneNotizen(); const box = app.querySelector('.eigenschaften'); if (box && !box._verbunden) { verbinde(box); box._verbunden = true; } },
    verbindeApp(app) { ziehEreignisse(app); },
    zeichne, zeichneNotizen, bausteinLeiste, setze, tippen, notizDazu,
  };
})();
