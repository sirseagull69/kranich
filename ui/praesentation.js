'use strict';
// Vortrag: Boards als Folien im Vollbild, mit Übergängen, Referentenansicht,
// Laserpointer, Schwarzbild und Sprung per Nummer.
(() => {
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const UEBERGAENGE = [['keiner', 'Keiner'], ['blende', 'Überblenden'], ['schieben', 'Schieben'], ['zoom', 'Zoom'], ['wischen', 'Wischen']];

  function starten(folien, start = 0, { titel = '' } = {}) {
    folien = folien.filter((f) => f.html);
    if (!folien.length) return;
    let nr = Math.max(0, Math.min(start, folien.length - 1));
    let referent = false; let schwarz = false; let laser = false; let eingabe = ''; let eingabeZeit = 0;
    const beginn = Date.now();
    const el = document.createElement('div');
    el.className = 'vortrag';
    el.tabIndex = -1;
    el.innerHTML = `<div class="vt-buehne"><div class="vt-folie"></div></div>
      <div class="vt-referent" hidden>
        <div class="vt-r-oben"><b class="vt-uhr"></b><span class="vt-dauer"></span><span class="vt-zahl"></span><button type="button" data-a="ende">Beenden (Esc)</button></div>
        <div class="vt-r-mitte"><div class="vt-r-jetzt"></div><div class="vt-r-rechts"><span class="vt-r-titel">Als Nächstes</span><div class="vt-r-naechste"></div><span class="vt-r-titel">Notizen</span><div class="vt-r-notiz"></div></div></div>
      </div>
      <div class="vt-schwarz" hidden></div><div class="vt-laser" hidden></div>
      <div class="vt-leiste"><button type="button" data-a="zurueck" title="Zurück (←)">‹</button><span class="vt-stand"></span><button type="button" data-a="weiter" title="Weiter (→)">›</button><span class="vt-strich"></span><button type="button" data-a="referent" title="Referentenansicht (R)">Referent</button><button type="button" data-a="laser" title="Laserpointer (L)">Laser</button><button type="button" data-a="ende" title="Beenden (Esc)">✕</button></div>
      <div class="vt-sprung" hidden></div>`;
    document.body.appendChild(el);
    window.kranich?.vollbild?.(true);
    el.focus();

    const rahmen = (f, cls = '') => {
      const i = document.createElement('iframe');
      i.setAttribute('sandbox', 'allow-same-origin');
      i.className = `vt-bild ${cls}`; i.title = f.name || 'Folie';
      i.style.width = `${f.breite}px`; i.style.height = `${f.hoehe}px`;
      i.srcdoc = window.Entwurf?.vorbereiten ? Entwurf.vorbereiten(f.html) : f.html;
      return i;
    };
    const einpassen = (box, f, platzB, platzH) => {
      const z = Math.min(platzB / f.breite, platzH / f.hoehe);
      box.style.width = `${f.breite * z}px`; box.style.height = `${f.hoehe * z}px`;
      for (const i of box.querySelectorAll('iframe')) i.style.transform = `scale(${z})`;
    };
    const vorschau = (box, f) => { box.innerHTML = ''; if (!f) { box.innerHTML = '<span class="vt-ende-hinweis">Ende der Präsentation</span>'; box.style.cssText = ''; return; } box.appendChild(rahmen(f)); einpassen(box, f, box.parentElement.clientWidth, box.parentElement.clientWidth * 0.5625); };

    function zeige(richtung = 0) {
      const f = folien[nr];
      const folie = el.querySelector(referent ? '.vt-r-jetzt' : '.vt-folie');
      el.querySelector('.vt-buehne').hidden = referent;
      el.querySelector('.vt-referent').hidden = !referent;
      const art = richtung && !referent ? (f.uebergang || 'keiner') : 'keiner';
      const alt = [...folie.querySelectorAll('iframe')];
      const neu = rahmen(f, art !== 'keiner' ? `rein-${art} ${richtung < 0 ? 'rueck' : ''}` : '');
      folie.appendChild(neu);
      if (referent) einpassen(folie, f, folie.parentElement.clientWidth * 0.62, window.innerHeight - 140);
      else einpassen(folie, f, window.innerWidth, window.innerHeight);
      if (art === 'keiner') alt.forEach((x) => x.remove());
      else { alt.forEach((x) => x.classList.add(`raus-${art}`, ...(richtung < 0 ? ['rueck'] : []))); setTimeout(() => alt.forEach((x) => x.remove()), 650); }
      el.querySelector('.vt-stand').textContent = `${nr + 1} / ${folien.length}`;
      if (referent) {
        vorschau(el.querySelector('.vt-r-naechste'), folien[nr + 1]);
        el.querySelector('.vt-r-notiz').innerHTML = f.notiz ? esc(f.notiz).replace(/\n/g, '<br>') : '<span class="leise">Keine Notizen zu dieser Folie.</span>';
        el.querySelector('.vt-zahl').textContent = `Folie ${nr + 1} von ${folien.length}${f.name ? ` · ${f.name}` : ''}`;
      }
    }
    const uhr = () => {
      if (!document.body.contains(el)) { clearInterval(takt); return; }
      const d = Math.floor((Date.now() - beginn) / 1000);
      el.querySelector('.vt-uhr').textContent = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      el.querySelector('.vt-dauer').textContent = `läuft seit ${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`;
    };
    const takt = setInterval(uhr, 1000); uhr();
    const gehe = (n) => { const alt = nr; nr = Math.max(0, Math.min(folien.length - 1, n)); if (nr !== alt) zeige(nr > alt ? 1 : -1); };
    const weiter = () => { if (nr < folien.length - 1) gehe(nr + 1); else if (!schwarz) schwarzbild(true); };
    const zurueck = () => { if (schwarz) { schwarzbild(false); return; } gehe(nr - 1); };
    const schwarzbild = (an = !schwarz) => { schwarz = an; el.querySelector('.vt-schwarz').hidden = !an; el.querySelector('.vt-schwarz').textContent = an && nr === folien.length - 1 ? 'Ende – Esc beendet' : ''; };
    const ende = () => {
      clearInterval(takt); document.removeEventListener('keydown', taste, true); window.removeEventListener('resize', groesse);
      window.kranich?.vollbild?.(false); el.remove();
    };
    const sprungZeigen = () => { const s = el.querySelector('.vt-sprung'); s.hidden = !eingabe; s.textContent = `Gehe zu Folie ${eingabe}`; };
    const taste = (e) => {
      const k = e.key;
      if (/^\d$/.test(k)) { if (Date.now() - eingabeZeit > 2500) eingabe = ''; eingabe += k; eingabeZeit = Date.now(); sprungZeigen(); e.preventDefault(); return; }
      if (k === 'Enter' && eingabe) { gehe(Number(eingabe) - 1); eingabe = ''; sprungZeigen(); e.preventDefault(); return; }
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter', 'n'].includes(k)) { weiter(); e.preventDefault(); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'p'].includes(k)) { zurueck(); e.preventDefault(); }
      else if (k === 'Home') gehe(0);
      else if (k === 'End') gehe(folien.length - 1);
      else if (k === 'Escape') { if (eingabe) { eingabe = ''; sprungZeigen(); } else ende(); }
      else if (k === 'b' || k === 'B' || k === '.') schwarzbild();
      else if (k === 'r' || k === 'R') { referent = !referent; el.querySelector('.vt-folie').innerHTML = ''; el.querySelector('.vt-r-jetzt').innerHTML = ''; zeige(); }
      else if (k === 'l' || k === 'L') { laser = !laser; el.classList.toggle('mit-laser', laser); el.querySelector('.vt-laser').hidden = !laser; }
      else return;
      e.stopPropagation();
    };
    document.addEventListener('keydown', taste, true);
    let ruheTimer;
    el.addEventListener('mousemove', (e) => {
      el.classList.add('maus'); clearTimeout(ruheTimer); ruheTimer = setTimeout(() => el.classList.remove('maus'), 2200);
      if (laser) { const l = el.querySelector('.vt-laser'); l.style.left = `${e.clientX}px`; l.style.top = `${e.clientY}px`; }
    });
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'ende') return ende();
      if (a === 'weiter') return weiter();
      if (a === 'zurueck') return zurueck();
      if (a === 'referent') return taste({ key: 'r', preventDefault() {}, stopPropagation() {} });
      if (a === 'laser') return taste({ key: 'l', preventDefault() {}, stopPropagation() {} });
      if (e.target.closest('.vt-leiste, .vt-referent')) return;
      weiter();
    });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); zurueck(); });
    const groesse = () => { el.querySelector('.vt-folie').innerHTML = ''; el.querySelector('.vt-r-jetzt').innerHTML = ''; zeige(); };
    window.addEventListener('resize', groesse);
    zeige();
    return { ende, gehe };
  }

  window.Praesentation = { starten, UEBERGAENGE };
})();
