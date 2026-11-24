'use strict';
// Vortrag: Boards als Folien im Vollbild, mit Übergängen, Referentenansicht,
// Laserpointer, Schwarzbild und Sprung per Nummer.
(() => {
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const UEBERGAENGE = [['keiner', 'Keiner'], ['blende', 'Überblenden'], ['schieben', 'Schieben'], ['zoom', 'Zoom'], ['wischen', 'Wischen']];
  const ANIMATIONEN = [['', 'Keine'], ['einblenden', 'Einblenden'], ['hoch', 'Von unten'], ['links', 'Von links'], ['rechts', 'Von rechts'], ['zoom', 'Heranzoomen']];
  const ANIM_CSS = '[data-anim]{opacity:0;transition:opacity .5s ease,transform .6s cubic-bezier(.2,.7,.2,1)}[data-anim="hoch"]{transform:translateY(70px)}[data-anim="links"]{transform:translateX(-90px)}[data-anim="rechts"]{transform:translateX(90px)}[data-anim="zoom"]{transform:scale(.82)}[data-anim].kr-da{opacity:1!important;transform:none!important}.kr-sofort,.kr-sofort [data-anim]{transition:none!important}';
  // Folienmaster: Fußzeile, Foliennummer, Logo auf jeder Folie
  function mitMaster(html, f, nr, gesamt, master) {
    if (!master || (!master.fuss && !master.nummer && !master.logo)) return html;
    const gr = Math.round(f.breite / 88);
    const teile = [];
    if (master.fuss || master.nummer) teile.push(`<div data-name="Fußzeile" style="position:absolute;left:${Math.round(f.breite * 0.04)}px;right:${Math.round(f.breite * 0.04)}px;bottom:${Math.round(f.hoehe * 0.035)}px;display:flex;justify-content:space-between;font:500 ${gr}px/1.2 'Segoe UI',Arial,sans-serif;color:${master.farbe || '#6b6f80'};z-index:2147483000;pointer-events:none"><span>${esc(master.fuss || '')}</span><span>${master.nummer ? `${nr} / ${gesamt}` : ''}</span></div>`);
    if (master.logo && /^data:image\/(png|jpe?g|svg\+xml|webp|gif);base64,/.test(master.logo)) teile.push(`<img data-name="Logo" src="${master.logo}" alt="" style="position:absolute;top:${Math.round(f.hoehe * 0.04)}px;right:${Math.round(f.breite * 0.035)}px;height:${Math.round(f.hoehe * 0.07)}px;width:auto;z-index:2147483000;pointer-events:none">`);
    const html2 = String(html);
    return /<\/body>/i.test(html2) ? html2.replace(/<\/body>/i, `${teile.join('')}</body>`) : html2 + teile.join('');
  }

  function starten(folien, start = 0, { titel = '', master = null } = {}) {
    folien = folien.filter((f) => f.html);
    let schritt = 0; let schrittAlle = false;
    const anims = (doc) => [...(doc?.querySelectorAll('[data-anim]') || [])].sort((a, b) => (Number(a.dataset.animNr) || 0) - (Number(b.dataset.animNr) || 0));
    const aktuellesDoc = () => [...el.querySelectorAll(referent ? '.vt-r-jetzt iframe' : '.vt-folie iframe')].pop()?.contentDocument;
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

    const rahmen = (f, cls = '', mitAnim = false) => {
      const i = document.createElement('iframe');
      i.setAttribute('sandbox', 'allow-same-origin');
      i.className = `vt-bild ${cls}`; i.title = f.name || 'Folie';
      i.style.width = `${f.breite}px`; i.style.height = `${f.hoehe}px`;
      let html = mitMaster(f.html, f, folien.indexOf(f) + 1, folien.length, master);
      html = html.replace(/<head[^>]*>/i, (m) => `${m}<style data-kranich-intern>${mitAnim ? ANIM_CSS : '[data-anim]{opacity:1}'}</style>`);
      i.srcdoc = window.Entwurf?.vorbereiten ? Entwurf.vorbereiten(html) : html;
      if (mitAnim) i.addEventListener('load', () => { const d = i.contentDocument; d.documentElement.classList.add('kr-sofort'); anims(d).forEach((a, k) => { if (schrittAlle || k < schritt) a.classList.add('kr-da'); }); if (schrittAlle) schritt = anims(d).length; requestAnimationFrame(() => requestAnimationFrame(() => d.documentElement.classList.remove('kr-sofort'))); }, { once: true });
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
      const neu = rahmen(f, art !== 'keiner' ? `rein-${art} ${richtung < 0 ? 'rueck' : ''}` : '', true);
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
    const gehe = (n, alleZeigen = false) => { const alt = nr; nr = Math.max(0, Math.min(folien.length - 1, n)); if (nr !== alt) { schritt = 0; schrittAlle = alleZeigen; zeige(nr > alt ? 1 : -1); } };
    const weiter = () => {
      const d = aktuellesDoc(); const liste = anims(d);
      if (schritt < liste.length) { liste[schritt].classList.add('kr-da'); schritt++; return; }
      if (nr < folien.length - 1) gehe(nr + 1); else if (!schwarz) schwarzbild(true);
    };
    const zurueck = () => {
      if (schwarz) { schwarzbild(false); return; }
      const d = aktuellesDoc(); const liste = anims(d);
      if (schritt > 0 && liste.length) { schritt--; liste[schritt]?.classList.remove('kr-da'); return; }
      gehe(nr - 1, true);
    };
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
      else if (k === 'End') gehe(folien.length - 1, true);
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

  window.Praesentation = { starten, UEBERGAENGE, ANIMATIONEN, mitMaster };
})();
