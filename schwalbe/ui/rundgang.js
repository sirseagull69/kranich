'use strict';
// Kurzer Rundgang: hebt nacheinander Bereiche hervor, der Vogel erklärt sie.
// Gleich in allen Vögeln (Albatros, Specht, Kranich, Schwalbe).
//   Rundgang.start({ app, farbe, vogel, schritte: [{ ziel, titel, text }] }, erzwingen)
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const schluessel = (app) => `rundgang-${app}-1`;
  function gesehen(app) { try { return localStorage.getItem(schluessel(app)) === 'ja'; } catch { return true; } }
  function merken(app) { try { localStorage.setItem(schluessel(app), 'ja'); } catch { /* egal */ } }

  function start(cfg, erzwingen = false) {
    if (!cfg?.schritte?.length) return;
    if (!erzwingen && gesehen(cfg.app)) return;
    document.querySelector('.rg-schleier')?.remove();
    const schritte = cfg.schritte.filter((s) => !s.ziel || document.querySelector(s.ziel));
    if (!schritte.length) return;
    let nr = 0;
    const s = document.createElement('div');
    s.className = 'rg-schleier';
    s.style.setProperty('--rg-farbe', cfg.farbe || '#2c5aa0');
    s.innerHTML = '<div class="rg-loch"></div><div class="rg-blase" role="dialog" aria-modal="true" aria-live="polite"></div>';
    document.body.appendChild(s);
    const loch = s.querySelector('.rg-loch');
    const blase = s.querySelector('.rg-blase');
    const ende = () => { merken(cfg.app); s.remove(); window.removeEventListener('resize', zeige); document.removeEventListener('keydown', taste, true); cfg.fertig?.(); };
    function zeige() {
      const sc = schritte[nr];
      const el = sc.ziel ? document.querySelector(sc.ziel) : null;
      const letzter = nr === schritte.length - 1;
      blase.innerHTML = `<div class="rg-kopf"><span class="rg-vogel">${cfg.vogel || ''}</span><div><small>${nr + 1} von ${schritte.length}</small><b>${esc(sc.titel)}</b></div></div>
        <p>${esc(sc.text)}</p>
        <div class="rg-fuss"><span class="rg-punkte">${schritte.map((_, i) => `<i class="${i === nr ? 'an' : ''}"></i>`).join('')}</span>
          ${letzter ? '' : '<button type="button" class="rg-leise" data-rg="weg">Überspringen</button>'}
          ${nr ? '<button type="button" class="rg-leise" data-rg="zurueck">Zurück</button>' : ''}
          <button type="button" class="rg-weiter" data-rg="weiter">${letzter ? 'Los geht’s' : 'Weiter'}</button></div>`;
      const W = window.innerWidth; const H = window.innerHeight;
      if (el) {
        const r = el.getBoundingClientRect(); const p = 8;
        const x = Math.max(4, r.left - p), y = Math.max(4, r.top - p), w = Math.min(W - x - 4, r.width + p * 2), h = Math.min(H - y - 4, r.height + p * 2);
        Object.assign(loch.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, opacity: 1 });
        const bw = 340; const bh = blase.offsetHeight || 200;
        let bx; let by;
        if (x + w + 16 + bw < W) { bx = x + w + 16; by = y; } // rechts daneben
        else if (x - 16 - bw > 0) { bx = x - 16 - bw; by = y; } // links daneben
        else { bx = Math.min(Math.max(16, x + w / 2 - bw / 2), W - bw - 16); by = y + h + 16 + bh < H ? y + h + 16 : Math.max(16, y - bh - 16); }
        by = Math.min(Math.max(16, by), H - bh - 16);
        Object.assign(blase.style, { left: `${bx}px`, top: `${by}px` });
      } else {
        Object.assign(loch.style, { left: `${W / 2}px`, top: `${H / 2}px`, width: '0px', height: '0px', opacity: 0 });
        Object.assign(blase.style, { left: `${W / 2 - 170}px`, top: `${H / 2 - 110}px` });
      }
      blase.querySelector('.rg-weiter').focus();
    }
    function taste(ev) {
      if (ev.key === 'Escape') { ev.stopPropagation(); ende(); }
      if (ev.key === 'ArrowRight' || ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); weiter(); }
      if (ev.key === 'ArrowLeft' && nr) { ev.preventDefault(); nr -= 1; zeige(); }
    }
    function weiter() { if (nr >= schritte.length - 1) ende(); else { nr += 1; zeige(); } }
    s.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-rg]'); if (!b) return;
      if (b.dataset.rg === 'weg') ende();
      if (b.dataset.rg === 'weiter') weiter();
      if (b.dataset.rg === 'zurueck') { nr -= 1; zeige(); }
    });
    window.addEventListener('resize', zeige);
    document.addEventListener('keydown', taste, true);
    zeige(); requestAnimationFrame(zeige);
  }
  window.Rundgang = { start, gesehen };
})();
