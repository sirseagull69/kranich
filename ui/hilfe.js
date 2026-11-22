'use strict';
// Kleine Helfer für die Oberfläche.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));

  function wann(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const jetzt = new Date();
    const uhr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const tage = Math.round((new Date(jetzt.toDateString()) - new Date(d.toDateString())) / 86400000);
    if (tage === 0) return `Heute, ${uhr}`;
    if (tage === 1) return `Gestern, ${uhr}`;
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  let meldungUhr = null;
  function meldung(text, { art = 'ok', knopf, aktion, dauer = 5000 } = {}) {
    document.querySelector('.meldung')?.remove();
    clearTimeout(meldungUhr);
    const el = document.createElement('div');
    el.className = 'meldung paper';
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="chip ${art === 'fehler' ? 'chip-rot' : 'chip-gruen'}">${art === 'fehler' ? 'Hoppla' : sym('haken', 13)}</span><span>${esc(text)}</span>${knopf ? `<button type="button" class="btn btn-s">${esc(knopf)}</button>` : ''}`;
    if (knopf) el.querySelector('button').onclick = () => { aktion?.(); el.remove(); };
    document.body.appendChild(el);
    meldungUhr = setTimeout(() => el.remove(), dauer);
  }

  // Wartet, bis eine Funktion eine Weile nicht mehr aufgerufen wurde.
  function spaeter(fn, ms) {
    let uhr = null;
    const f = (...a) => { clearTimeout(uhr); uhr = setTimeout(() => fn(...a), ms); };
    f.sofort = () => { clearTimeout(uhr); return fn(); };
    return f;
  }

  function ladeBild(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Bild ließ sich nicht laden.'));
      img.src = dataUrl;
    });
  }

  function dateiAlsDataUrl(datei) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(datei);
    });
  }

  window.H = { esc, wann, meldung, spaeter, ladeBild, dateiAlsDataUrl };
})();
