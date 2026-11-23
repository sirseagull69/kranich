'use strict';
// Die Leinwand im Modus "Entwurf": eine unendliche Fläche mit vielen Boards.
// Jedes Board zeigt seinen Entwurf in einem abgeschotteten Rahmen (ohne
// Skripte). Elemente lassen sich anklicken, das aktive Board hat Ebenen.
(function () {
  const SCHRIFT = new URL('schrift/schrift.css', location.href).href;
  const INTERN = 'data-kranich-intern';
  const BAUSTEIN = /^(header|nav|main|section|aside|footer|article|form|button|a|h1|h2|h3|h4|p|ul|ol|li|img|svg|input|textarea|select|label|table|figure)$/;

  function vorbereiten(html, { interaktiv = false } = {}) {
    let text = String(html || '');
    const zusatz = `<link ${INTERN} rel="stylesheet" href="${SCHRIFT}">${interaktiv ? `<style ${INTERN}>*{cursor:default!important}a,button{cursor:pointer!important}</style>` : ''}`;
    if (/<head[^>]*>/i.test(text)) text = text.replace(/<head[^>]*>/i, (m) => m + zusatz);
    else text = zusatz + text;
    return text;
  }

  function serialisiere(doc) {
    const kopie = doc.documentElement.cloneNode(true);
    kopie.querySelectorAll(`[${INTERN}]`).forEach((e) => e.remove());
    return `<!doctype html>\n${kopie.outerHTML}`;
  }

  function nameVon(el) {
    if (el.dataset.name) return el.dataset.name;
    const tag = el.localName;
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    const art = { button: 'Knopf', a: 'Link', h1: 'Überschrift', h2: 'Überschrift', h3: 'Überschrift', h4: 'Überschrift', p: 'Text', img: 'Bild', svg: 'Grafik', input: 'Eingabefeld', textarea: 'Textfeld', select: 'Auswahlfeld', ul: 'Liste', ol: 'Liste', li: 'Listeneintrag', header: 'Kopfzeile', nav: 'Navigation', footer: 'Fußzeile', aside: 'Seitenleiste', form: 'Formular', table: 'Tabelle', label: 'Beschriftung' }[tag] || 'Bereich';
    return text && !['ul', 'ol', 'form', 'nav', 'section', 'main', 'header', 'aside', 'footer', 'table'].includes(tag) ? `${art} „${text}“` : art;
  }

  const STATUS = { wartet: ['Wartet', 'chip-grau'], laeuft: ['Wird gefaltet …', 'chip-zart'], pruefen: ['Prüft sich selbst …', 'chip-zart'], repariert: ['Wird repariert …', 'chip-gelb'], fertig: ['Fertig', 'chip-gruen'], fehler: ['Hat nicht geklappt', 'chip-rot'] };

  const z = {
    leinwand: null, welt: null, menue: null, plus: null, karte: null, cb: {},
    boards: new Map(),
    aktiv: null, zoom: 0.5, pan: { x: 40, y: 60 }, auto: true, auswahl: null, wiederWaehlen: null,
  };

  function montiere(leinwand, cb) {
    letzterZoom = null;
    z.leinwand = leinwand;
    z.cb = cb || {};
    z.boards = new Map();
    z.auswahl = null;
    z.aktiv = null;
    z.auto = true;
    leinwand.innerHTML = `<div class="welt"></div>
      <button type="button" class="board-dazu" aria-label="Board dazu" data-aktion="board-dazu" hidden>${sym('plus', 20, 2.4)}</button>
      <div class="schnellmenue paper" role="toolbar" aria-label="Schnellmenü" hidden>
        <button type="button" class="btn btn-s btn-q" data-aktion="schnell-groesser">Größer</button>
        <button type="button" class="btn btn-s btn-q" data-aktion="schnell-farbe"><span aria-hidden="true" style="width:12px;height:12px;border-radius:50%;background:#7c5cd6"></span>Farbe</button>
        <button type="button" class="btn btn-s btn-q" data-aktion="schnell-origami">${figur('ruhend', 18)} Wie in origami</button>
        <span class="strich" aria-hidden="true"></span>
        <button type="button" class="btn btn-s btn-q" style="color:#4a2f9a" data-aktion="schnell-frei">Freier Wunsch…</button>
      </div>
      <button type="button" class="btn btn-p btn-gross board-hinzu" data-aktion="board-dazu">${sym('plus', 16, 2.4)} Board hinzufügen</button>
      <div class="ansichtecke">
        <div class="uebersicht paper" aria-label="Übersicht der Leinwand"><div class="kartenflaeche"></div></div>
        <div class="ansichtleiste paper">
          <button type="button" class="btn btn-s btn-q" aria-label="Verkleinern" data-aktion="zoom-minus">−</button><b class="h zoomwert">100 %</b>
          <button type="button" class="btn btn-s btn-q" aria-label="Vergrößern" data-aktion="zoom-plus">+</button>
          <span class="strich"></span><button type="button" class="btn btn-s btn-q" data-aktion="zoom-einpassen" title="Alles zeigen" aria-label="Alles zeigen">${sym('verschieben', 15)}</button></div></div>`;
    z.welt = leinwand.querySelector('.welt');
    z.menue = leinwand.querySelector('.schnellmenue');
    z.plus = leinwand.querySelector('.board-dazu');
    z.karte = leinwand.querySelector('.kartenflaeche');
    leinwand.addEventListener('wheel', (e) => rad(e, e.clientX, e.clientY), { passive: false });
    let zug = null;
    // Leertaste gedrückt halten = überall verschieben (wie in Figma)
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || e.repeat || !z.leinwand?.isConnected || /INPUT|TEXTAREA/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
      e.preventDefault(); z.leinwand.classList.add('greifbereit');
    });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space' && !z.leinwand?.classList.contains('hand-an')) z.leinwand?.classList.remove('greifbereit'); });
    leinwand.addEventListener('pointerdown', (e) => {
      const frei = e.target === leinwand || e.target === z.welt || e.target.classList?.contains('boardstatus') || e.target.closest?.('.boardleer');
      const mitte = e.button === 1, leer = leinwand.classList.contains('greifbereit');
      if (!frei && !mitte && !leer) return;
      if (mitte || leer) e.preventDefault();
      zug = { x: e.clientX, y: e.clientY, px: z.pan.x, py: z.pan.y };
      leinwand.setPointerCapture(e.pointerId);
      leinwand.classList.add('zieht');
    });
    leinwand.addEventListener('pointermove', (e) => {
      if (!zug) return;
      z.pan.x = zug.px + e.clientX - zug.x; z.pan.y = zug.py + e.clientY - zug.y; z.auto = false; lege();
    });
    const los = (e) => {
      if (!zug) return;
      const bewegt = Math.abs(e.clientX - zug.x) + Math.abs(e.clientY - zug.y) > 4;
      zug = null; leinwand.classList.remove('zieht');
      if (!bewegt) waehleEl(null);
    };
    leinwand.addEventListener('pointerup', los);
    leinwand.addEventListener('pointercancel', los);
    z.karte.addEventListener('click', (e) => {
      const r = z.karte.getBoundingClientRect();
      const g = grenzen();
      const f = Math.min(r.width / g.b, r.height / g.h) * 0.92;
      const ox = (r.width - g.b * f) / 2, oy = (r.height - g.h * f) / 2;
      const wx = g.x + (e.clientX - r.left - ox) / f, wy = g.y + (e.clientY - r.top - oy) / f;
      z.pan.x = leinwand.clientWidth / 2 - wx * z.zoom;
      z.pan.y = leinwand.clientHeight / 2 - wy * z.zoom;
      z.auto = false; lege();
    });
    new ResizeObserver(() => { if (z.auto) einpassen(); else lege(); }).observe(leinwand);
  }

  // Bringt die Boards auf der Leinwand in Einklang mit den Seiten des Projekts.
  function zeigeAlle(seiten, aktivId) {
    const ids = new Set(seiten.map((s) => s.id));
    for (const [id, b] of z.boards) if (!ids.has(id)) { b.wrap.remove(); z.boards.delete(id); }
    for (const s of seiten) {
      let b = z.boards.get(s.id);
      if (!b) b = baueBoard(s);
      b.seite = s;
      Object.assign(b.wrap.style, { left: `${s.x}px`, top: `${s.y}px` });
      b.wrap.style.setProperty('--bb', String(s.breite));
      b.iframe.style.width = `${s.breite}px`; b.iframe.style.height = `${s.hoehe}px`;
      b.leer.style.width = `${s.breite}px`; b.leer.style.height = `${s.hoehe}px`;
      b.koerper.style.width = `${s.breite}px`; b.koerper.style.height = `${s.hoehe}px`;
      b.name.innerHTML = `<b>${H.esc(s.name)}</b><span>${H.esc(s.mass || `${s.breite} × ${s.hoehe}`)}</span>`;
      if (b.html !== s.html) {
        b.html = s.html;
        if (s.id === z.aktiv && z.auswahl) z.wiederWaehlen = z.auswahl.k;
        b.iframe.srcdoc = s.html ? vorbereiten(s.html, { interaktiv: true }) : '';
      }
      b.iframe.hidden = !s.html;
      b.leer.hidden = Boolean(s.html) || Boolean(b.status);
    }
    setzeAktiv(aktivId, { still: true });
    if (z.auto) einpassen(); else lege();
  }

  function baueBoard(s) {
    const wrap = document.createElement('div');
    wrap.className = 'board';
    wrap.dataset.id = s.id;
    wrap.innerHTML = `<button type="button" class="boardname lbl"></button>
      <div class="boardkoerper"><iframe title="${H.esc(s.name)}" sandbox="allow-same-origin"></iframe><div class="boardleer">${figur('ruhend', 60)}<span class="leise">Noch leer</span></div>
      <div class="boardstatus" hidden></div><div class="huelle" hidden></div><div class="auswahlrahmen" hidden><i style="left:-5px;top:-5px"></i><i style="right:-5px;top:-5px"></i><i style="left:-5px;bottom:-5px"></i><i style="right:-5px;bottom:-5px"></i><span class="masz"></span></div></div>`;
    z.welt.appendChild(wrap);
    const b = { seite: s, wrap, koerper: wrap.querySelector('.boardkoerper'), iframe: wrap.querySelector('iframe'), name: wrap.querySelector('.boardname'), leer: wrap.querySelector('.boardleer'), statusEl: wrap.querySelector('.boardstatus'), rahmen: wrap.querySelector('.auswahlrahmen'), huelle: wrap.querySelector('.huelle'), html: null, status: null };
    b.name.addEventListener('click', () => z.cb.beiBoard?.(b.seite.id));
    b.leer.addEventListener('click', () => z.cb.beiBoard?.(b.seite.id));
    b.iframe.addEventListener('load', () => beimLaden(b));
    z.boards.set(s.id, b);
    return b;
  }

  function setzeAktiv(id, { still = false } = {}) {
    const alt = z.aktiv;
    z.aktiv = id;
    for (const [bid, b] of z.boards) b.wrap.classList.toggle('aktiv', bid === id);
    if (alt !== id) {
      if (!z.wiederWaehlen) z.auswahl = null;
      const doc = z.boards.get(id)?.iframe.contentDocument;
      z.cb.beiEbenen?.(doc?.body?.children.length ? ebenen(doc) : []);
      if (!still) z.cb.beiAuswahl?.(null);
    }
    zeigeAuswahl();
  }

  function beimLaden(b) {
    const doc = b.iframe.contentDocument;
    if (!doc?.body || !doc.body.children.length) return;
    let neu = 0;
    let n = doc.querySelectorAll('[data-k]').length;
    doc.body.querySelectorAll('*').forEach((el) => {
      if (el.closest('svg') && el.localName !== 'svg') return;
      if (!el.dataset.k) { el.dataset.k = `k${++n}`; neu++; }
    });
    doc.addEventListener('click', (e) => {
      e.preventDefault();
      if (z.aktiv !== b.seite.id) z.cb.beiBoard?.(b.seite.id);
      const el = ziel(e.target);
      waehleEl(el && el !== doc.body ? el : null, b);
    }, true);
    doc.addEventListener('submit', (e) => e.preventDefault(), true);
    doc.addEventListener('mousemove', (e) => {
      const el = ziel(e.target);
      if (!el || el === doc.body) { b.huelle.hidden = true; return; }
      setzeRahmen(b.huelle, el);
    });
    doc.addEventListener('mouseleave', () => { b.huelle.hidden = true; });
    doc.addEventListener('wheel', (e) => {
      // Mausposition aus dem Board in Bildschirm-Koordinaten umrechnen
      const r = b.iframe.getBoundingClientRect();
      rad(e, r.left + e.clientX * z.zoom, r.top + e.clientY * z.zoom);
    }, { passive: false });
    if (neu) { b.html = serialisiere(doc); z.cb.beiHtml?.(b.seite.id, b.html); }
    if (b.seite.id === z.aktiv) {
      z.cb.beiEbenen?.(ebenen(doc));
      if (z.wiederWaehlen) {
        const el = doc.querySelector(`[data-k="${z.wiederWaehlen}"]`);
        z.wiederWaehlen = null;
        if (el) waehleEl(el, b);
      }
    }
  }

  function ziel(el) {
    let e = el;
    if (e?.closest?.('svg')) e = e.closest('svg');
    while (e && e.parentElement && e.parentElement !== e.ownerDocument.body && !e.dataset?.name && !BAUSTEIN.test(e.localName)) e = e.parentElement;
    return e;
  }

  function ebenen(doc) {
    const liste = [];
    const gehe = (el, tiefe) => {
      for (const kind of el.children) {
        if (liste.length >= 80) return;
        const zaehlt = kind.dataset.name || BAUSTEIN.test(kind.localName);
        if (zaehlt && kind.localName !== 'li') liste.push({ k: kind.dataset.k, name: nameVon(kind), tag: kind.localName, tiefe: Math.min(tiefe, 3) });
        if (kind.localName !== 'svg' && !['button', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'label'].includes(kind.localName)) gehe(kind, zaehlt ? tiefe + 1 : tiefe);
      }
    };
    gehe(doc.body, 0);
    return liste;
  }

  function setzeRahmen(el, zielEl) {
    const r = zielEl.getBoundingClientRect();
    Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    el.hidden = false;
    return r;
  }

  function waehleEl(el, b = z.boards.get(z.aktiv)) {
    if (!el || !b) { z.auswahl = null; zeigeAuswahl(); z.cb.beiAuswahl?.(null); return; }
    const r = el.getBoundingClientRect();
    z.auswahl = { k: el.dataset.k, name: nameVon(el), tag: el.localName, b: Math.round(r.width), h: Math.round(r.height), board: b.seite.id };
    zeigeAuswahl();
    z.cb.beiAuswahl?.(z.auswahl);
  }

  function waehle(k) {
    const b = z.boards.get(z.aktiv);
    waehleEl(k ? b?.iframe.contentDocument?.querySelector(`[data-k="${k}"]`) : null, b);
  }

  function zeigeAuswahl() {
    if (!z.leinwand) return;
    for (const b of z.boards.values()) b.rahmen.hidden = true;
    const b = z.boards.get(z.aktiv);
    const el = z.auswahl && b?.iframe.contentDocument?.querySelector(`[data-k="${z.auswahl.k}"]`);
    if (!el) { z.menue.hidden = true; zeigePlus(); return; }
    const r = setzeRahmen(b.rahmen, el);
    b.rahmen.querySelector('.masz').textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
    const s = b.seite;
    const x = z.pan.x + (s.x + r.left + r.width) * z.zoom;
    const y = z.pan.y + (s.y + r.top) * z.zoom;
    z.menue.hidden = false;
    const mb = z.menue.offsetWidth;
    z.menue.style.left = `${Math.max(8, Math.min(z.leinwand.clientWidth - mb - 8, x - mb))}px`;
    z.menue.style.top = `${Math.max(8, y - 60)}px`;
    zeigePlus();
  }

  function zeigePlus() {
    const b = z.boards.get(z.aktiv);
    if (!b) { z.plus.hidden = true; return; }
    const s = b.seite;
    // Nur zeigen, wenn rechts daneben Platz ist (sonst läge der Knopf auf dem Nachbarn)
    const nachbar = [...z.boards.values()].map((x) => x.seite).filter((o) => o.id !== s.id && o.x >= s.x + s.breite && o.y < s.y + s.hoehe && o.y + o.hoehe > s.y)
      .reduce((m, o) => Math.min(m, o.x), Infinity);
    if ((nachbar - s.x - s.breite) * z.zoom < 70) { z.plus.hidden = true; return; }
    z.plus.hidden = false;
    z.plus.style.left = `${z.pan.x + (s.x + s.breite) * z.zoom + 18}px`;
    z.plus.style.top = `${z.pan.y + (s.y + s.hoehe / 2) * z.zoom - 22}px`;
  }

  function grenzen() {
    const liste = [...z.boards.values()].map((b) => b.seite);
    if (!liste.length) return { x: 0, y: 0, b: 1440, h: 900 };
    const x1 = Math.min(...liste.map((s) => s.x)), y1 = Math.min(...liste.map((s) => s.y));
    const x2 = Math.max(...liste.map((s) => s.x + s.breite)), y2 = Math.max(...liste.map((s) => s.y + s.hoehe));
    return { x: x1, y: y1, b: x2 - x1, h: y2 - y1 };
  }

  // Mausrad / Touchpad: Strg (oder Pinch) zoomt stufenlos, sonst verschieben
  function rad(e, cx, cy) {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
    if (e.ctrlKey || e.metaKey) {
      const r = z.leinwand.getBoundingClientRect();
      zoom(Math.exp(-Math.max(-60, Math.min(60, dy)) * 0.006), { x: cx - r.left, y: cy - r.top });
      return;
    }
    if (e.shiftKey && !dx) { z.pan.x -= dy; } else { z.pan.x -= dx; z.pan.y -= dy; }
    z.auto = false; lege();
  }

  // Zeichnen gebündelt pro Bildschirm-Frame, Übersicht etwas seltener
  let rahmenWartet = false, letzterZoom = null, karteZeit = 0, karteSpaeter = null;
  function lege() {
    if (!z.leinwand || rahmenWartet) return;
    rahmenWartet = true;
    requestAnimationFrame(legeJetzt);
  }
  function legeJetzt() {
    rahmenWartet = false;
    const L = z.leinwand;
    if (!L) return;
    z.welt.style.transform = `translate3d(${z.pan.x}px, ${z.pan.y}px, 0) scale(${z.zoom})`;
    if (letzterZoom !== z.zoom) {
      letzterZoom = z.zoom;
      z.welt.style.setProperty('--gegenzoom', String(1 / z.zoom));
      z.welt.style.setProperty('--zoom', String(z.zoom));
      L.querySelector('.zoomwert').textContent = `${Math.round(z.zoom * 100)} %`;
    }
    zeigeAuswahl();
    const jetzt = performance.now();
    clearTimeout(karteSpaeter);
    if (jetzt - karteZeit > 80) { karteZeit = jetzt; zeichneKarte(); } else karteSpaeter = setTimeout(zeichneKarte, 90);
  }

  function zeichneKarte() {
    const g = grenzen();
    const r = { w: z.karte.clientWidth || 174, h: z.karte.clientHeight || 96 };
    const f = Math.min(r.w / g.b, r.h / g.h) * 0.92;
    const ox = (r.w - g.b * f) / 2, oy = (r.h - g.h * f) / 2;
    let html = '';
    for (const b of z.boards.values()) {
      const s = b.seite;
      html += `<span style="left:${ox + (s.x - g.x) * f}px;top:${oy + (s.y - g.y) * f}px;width:${Math.max(3, s.breite * f)}px;height:${Math.max(3, s.hoehe * f)}px;background:${s.id === z.aktiv ? '#7c5cd6' : '#d6caf9'}"></span>`;
    }
    const L = z.leinwand;
    const vx = (-z.pan.x / z.zoom - g.x) * f + ox, vy = (-z.pan.y / z.zoom - g.y) * f + oy;
    html += `<i style="left:${vx}px;top:${vy}px;width:${(L.clientWidth / z.zoom) * f}px;height:${(L.clientHeight / z.zoom) * f}px"></i>`;
    z.karte.innerHTML = html;
  }

  function einpassen() {
    const L = z.leinwand;
    if (!L || !L.clientWidth) return;
    const g = grenzen();
    z.zoom = Math.min(1, (L.clientWidth - 160) / g.b, (L.clientHeight - 190) / g.h);
    z.pan.x = (L.clientWidth - g.b * z.zoom) / 2 - g.x * z.zoom;
    z.pan.y = Math.max(56, (L.clientHeight - 60 - g.h * z.zoom) / 2) - g.y * z.zoom;
    z.auto = true;
    lege();
  }

  function zoom(faktor, punkt) {
    const L = z.leinwand;
    const mx = punkt ? punkt.x : L.clientWidth / 2, my = punkt ? punkt.y : L.clientHeight / 2;
    const neu = Math.min(3, Math.max(0.03, z.zoom * faktor));
    z.pan.x = mx - ((mx - z.pan.x) * neu) / z.zoom;
    z.pan.y = my - ((my - z.pan.y) * neu) / z.zoom;
    z.zoom = neu; z.auto = false;
    lege();
  }

  // Zustand eines Boards beim Anpassen: wartet, laeuft, fertig, fehler, null
  function setzeStatus(id, status) {
    const b = z.boards.get(id);
    if (!b) return;
    b.status = status;
    if (!status) { b.statusEl.hidden = true; b.leer.hidden = Boolean(b.seite.html); return; }
    const [text, art] = STATUS[status];
    b.statusEl.hidden = false;
    b.statusEl.className = `boardstatus ${status}`;
    b.statusEl.innerHTML = `${['laeuft', 'repariert'].includes(status) ? '<div class="faltblatt"></div>' : ''}<span class="chip ${art}">${status === 'fertig' ? sym('haken', 13) : ''}${text}</span>`;
    b.leer.hidden = true;
    if (status === 'fertig') setTimeout(() => { if (b.status === 'fertig') setzeStatus(id, null); }, 2500);
  }

  // Prozent am laufenden Board (Schätzung nach Zeit und Schritt)
  function setzeProzent(id, pct) {
    const b = z.boards.get(id);
    if (!b || !['laeuft', 'pruefen', 'repariert'].includes(b.status)) return;
    const chip = b.statusEl.querySelector('.chip');
    if (!chip) return;
    chip.textContent = `${{ laeuft: 'Faltet', pruefen: 'Prüft', repariert: 'Repariert' }[b.status]} · ${pct} %`;
    let bar = b.statusEl.querySelector('.prozentbalken');
    if (!bar) { bar = document.createElement('div'); bar.className = 'prozentbalken'; bar.innerHTML = '<i></i>'; b.statusEl.appendChild(bar); }
    bar.firstChild.style.width = `${pct}%`;
  }

  window.Entwurf = { setzeProzent,
    montiere, zeigeAlle, setzeAktiv, waehle, einpassen, zoom, vorbereiten, serialisiere, setzeStatus,
    get auswahl() { return z.auswahl; },
    zeigeBoard(id) {
      const b = z.boards.get(id);
      if (!b) return;
      const s = b.seite, L = z.leinwand;
      z.zoom = Math.min(1, (L.clientWidth - 200) / s.breite, (L.clientHeight - 200) / s.hoehe);
      z.pan.x = L.clientWidth / 2 - (s.x + s.breite / 2) * z.zoom;
      z.pan.y = L.clientHeight / 2 - (s.y + s.hoehe / 2) * z.zoom;
      z.auto = false; lege();
    },
  };
})();
