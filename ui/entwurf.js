'use strict';
// Die Leinwand im Modus "Entwurf": zeigt den Entwurf in einem abgeschotteten
// Rahmen (ohne Skripte), lässt Elemente anklicken und baut die Ebenenliste.
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

  const zustand = { iframe: null, lage: null, leinwand: null, rahmen: null, huelle: null, menue: null, b: 1440, h: 900, zoom: 1, pan: { x: 0, y: 0 }, auto: true, auswahl: null, cb: {} };

  function montiere(leinwand, cb) {
    zustand.leinwand = leinwand;
    zustand.cb = cb || {};
    leinwand.innerHTML = `
      <span class="lbl blattname"></span><div class="blattlage"><iframe title="Entwurf" sandbox="allow-same-origin"></iframe>
        <div class="huelle" hidden></div><div class="auswahlrahmen" hidden><i style="left:-5px;top:-5px"></i><i style="right:-5px;top:-5px"></i><i style="left:-5px;bottom:-5px"></i><i style="right:-5px;bottom:-5px"></i><span class="masz"></span></div></div>
      <div class="schnellmenue paper" role="toolbar" aria-label="Schnellmenü" hidden>
        <button type="button" class="btn btn-s btn-q" data-aktion="schnell-groesser">Größer</button>
        <button type="button" class="btn btn-s btn-q" data-aktion="schnell-farbe"><span aria-hidden="true" style="width:12px;height:12px;border-radius:50%;background:#7c5cd6"></span>Farbe</button>
        <button type="button" class="btn btn-s btn-q" data-aktion="schnell-origami">${figur('ruhend', 18)} Wie in origami</button>
        <span class="strich" aria-hidden="true"></span>
        <button type="button" class="btn btn-s btn-q" style="color:#4a2f9a" data-aktion="schnell-frei">Freier Wunsch…</button>
      </div>
      <div class="ansichtleiste"><span class="lbl" style="padding:0 6px">Ansicht</span>
        <button type="button" class="btn btn-s btn-q" aria-label="Verkleinern" data-aktion="zoom-minus">−</button><b class="h zoomwert">100 %</b>
        <button type="button" class="btn btn-s btn-q" aria-label="Vergrößern" data-aktion="zoom-plus">+</button>
        <button type="button" class="btn btn-s btn-q" data-aktion="zoom-einpassen">Einpassen</button></div>
      ${eselsohr(54)}`;
    zustand.lage = leinwand.querySelector('.blattlage');
    zustand.iframe = leinwand.querySelector('iframe');
    zustand.rahmen = leinwand.querySelector('.auswahlrahmen');
    zustand.huelle = leinwand.querySelector('.huelle');
    zustand.menue = leinwand.querySelector('.schnellmenue');
    zustand.iframe.addEventListener('load', beimLaden);
    leinwand.addEventListener('wheel', (e) => {
      if (e.ctrlKey) { e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); return; }
      zustand.pan.x -= e.deltaX; zustand.pan.y -= e.deltaY; zustand.auto = false; lege();
    }, { passive: false });
    new ResizeObserver(() => lege()).observe(leinwand);
  }

  function zeige(html, breite, hoehe, name) {
    zustand.b = breite; zustand.h = hoehe;
    zustand.iframe.style.width = `${breite}px`;
    zustand.iframe.style.height = `${hoehe}px`;
    zustand.leinwand.querySelector('.blattname').textContent = `${name} · ${breite} × ${hoehe}`;
    zustand.lage.hidden = !html;
    zustand.leinwand.querySelector('.blattname').hidden = !html;
    const k = zustand.auswahl?.k;
    zustand.auswahl = null;
    zustand.wiederWaehlen = k;
    zustand.iframe.srcdoc = html ? vorbereiten(html, { interaktiv: true }) : '';
    if (zustand.auto) einpassen(); else lege();
    zeigeAuswahl();
  }

  function beimLaden() {
    const doc = zustand.iframe.contentDocument;
    if (!doc?.body || !doc.body.children.length) return;
    let neu = 0;
    let n = doc.querySelectorAll('[data-k]').length;
    doc.body.querySelectorAll('*').forEach((el) => {
      if (el.closest('svg') && el.localName !== 'svg') return;
      if (!el.dataset.k) { el.dataset.k = `k${++n}`; neu++; }
    });
    doc.addEventListener('click', (e) => {
      e.preventDefault();
      const el = ziel(e.target);
      waehleEl(el && el !== doc.body ? el : null);
    }, true);
    doc.addEventListener('submit', (e) => e.preventDefault(), true);
    doc.addEventListener('mousemove', (e) => {
      const el = ziel(e.target);
      if (!el || el === doc.body) { zustand.huelle.hidden = true; return; }
      setzeRahmen(zustand.huelle, el);
    });
    doc.addEventListener('mouseleave', () => { zustand.huelle.hidden = true; });
    if (neu) zustand.cb.beiHtml?.(serialisiere(doc));
    zustand.cb.beiEbenen?.(ebenen(doc));
    if (zustand.wiederWaehlen) {
      const el = doc.querySelector(`[data-k="${zustand.wiederWaehlen}"]`);
      zustand.wiederWaehlen = null;
      if (el) waehleEl(el);
    }
  }

  // Klicks auf winzige Teile (Text in einem Knopf, Pfad in einer Grafik) auf den Baustein heben.
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

  function setzeRahmen(el, ziel) {
    const r = ziel.getBoundingClientRect();
    Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    el.hidden = false;
    return r;
  }

  function waehleEl(el) {
    if (!el) { zustand.auswahl = null; zeigeAuswahl(); zustand.cb.beiAuswahl?.(null); return; }
    const r = el.getBoundingClientRect();
    zustand.auswahl = { k: el.dataset.k, name: nameVon(el), tag: el.localName, b: Math.round(r.width), h: Math.round(r.height) };
    zeigeAuswahl();
    zustand.cb.beiAuswahl?.(zustand.auswahl);
  }

  function waehle(k) {
    const doc = zustand.iframe.contentDocument;
    waehleEl(k ? doc?.querySelector(`[data-k="${k}"]`) : null);
  }

  function zeigeAuswahl() {
    const doc = zustand.iframe?.contentDocument;
    const el = zustand.auswahl && doc?.querySelector(`[data-k="${zustand.auswahl.k}"]`);
    if (!el) { zustand.rahmen.hidden = true; zustand.menue.hidden = true; return; }
    const r = setzeRahmen(zustand.rahmen, el);
    zustand.rahmen.querySelector('.masz').textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
    // Schnellmenü in Bildschirmgröße über dem Element
    const z = zustand.zoom;
    const x = zustand.ox + (r.left + r.width) * z;
    const y = zustand.oy + r.top * z;
    zustand.menue.hidden = false;
    const mb = zustand.menue.offsetWidth;
    zustand.menue.style.left = `${Math.max(8, Math.min(zustand.leinwand.clientWidth - mb - 8, x - mb))}px`;
    zustand.menue.style.top = `${Math.max(8, y - 60)}px`;
  }

  function lege() {
    const L = zustand.leinwand;
    if (!L) return;
    const z = zustand.zoom;
    zustand.ox = Math.round((L.clientWidth - zustand.b * z) / 2 + zustand.pan.x);
    zustand.oy = Math.round(Math.max(56, (L.clientHeight - zustand.h * z) / 2) + zustand.pan.y);
    zustand.lage.style.transform = `translate(${zustand.ox}px, ${zustand.oy}px) scale(${z})`;
    const name = L.querySelector('.blattname');
    name.style.left = `${zustand.ox}px`; name.style.top = `${zustand.oy - 22}px`;
    L.querySelector('.zoomwert').textContent = `${Math.round(z * 100)} %`;
    zeigeAuswahl();
  }

  function einpassen() {
    const L = zustand.leinwand;
    if (!L || !L.clientWidth) return;
    zustand.zoom = Math.min(1, (L.clientWidth - 80) / zustand.b, (L.clientHeight - 130) / zustand.h);
    zustand.pan = { x: 0, y: 0 };
    zustand.auto = true;
    lege();
  }

  function zoom(faktor) {
    zustand.zoom = Math.min(3, Math.max(0.1, zustand.zoom * faktor));
    zustand.auto = false;
    lege();
  }

  window.Entwurf = {
    montiere, zeige, waehle, einpassen, zoom, vorbereiten, serialisiere,
    get auswahl() { return zustand.auswahl; },
  };
})();
