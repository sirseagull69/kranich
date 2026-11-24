'use strict';
// Ori Office – gemeinsames Bauteil für alle Vögel: Datei-Ansicht (wie „Datei“ in Office),
// Optionen darin, eigene Klapplisten statt der grauen Windows-Listen.
// Quelle: gemeinsam/oo-rahmen.js – wird mit gemeinsam/verteilen.sh in jede App kopiert. Nicht in den Apps ändern.
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PFADE = {
    zurueck: 'M15 18l-6-6 6-6', plus: 'M12 5v14M5 12h14', oeffnen: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01', speichern: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
    unter: 'M12 4v11M7 10l5 5 5-5M5 20h14', export: 'M7 3h7l5 5v13H7zM14 3v5h5', drucken: 'M7 9V4h10v5M7 17H5v-6h14v6h-2M7 14h10v6H7z',
    optionen: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    schliessen: 'M6 6l12 12M18 6L6 18', datei: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6', tabelle: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
    folie: 'M3 5h18v12H3zM8 21h8M12 17v4', ordner: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', haken: 'M5 12l5 5L20 7',
    buch: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z', liste: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  };
  const sym = (n, g = 16) => `<svg width="${g}" height="${g}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PFADE[n] || n}"/></svg>`;
  const berge = (cls = 'oo-berge2') => `<svg class="${cls}" aria-hidden="true" viewBox="0 0 1440 220" preserveAspectRatio="none"><path d="M0 130 C 300 80 600 170 900 120 S 1300 90 1440 120 V220 H0Z" style="fill:var(--oo-fm)" opacity=".35"/><path d="M0 180 C 360 150 700 210 1000 175 S 1340 165 1440 180 V220 H0Z" style="fill:var(--oo-f)" opacity=".85"/></svg>`;

  // ---------------------------------------------------------------
  // Datei-Ansicht. nav: [[schluessel, symbol, titel] | '-'], zeige(k, inhalt, api) baut den rechten Teil.
  // klick(k, api) → true, wenn der Punkt direkt etwas tut (z. B. Drucken) statt eine Seite zu zeigen.
  // ---------------------------------------------------------------
  function backstage({ nav, start = 'info', vogel = '', zeige, klick, beimSchliessen }) {
    document.querySelector('.oo-bs')?.remove();
    const b = document.createElement('div'); b.className = 'oo-bs'; b.tabIndex = -1;
    b.innerHTML = `<nav class="oo-bs-nav"><button type="button" class="oo-bs-zurueck" data-bs="zurueck">${sym('zurueck', 18)}<span>Zurück</span></button>
        ${nav.map((x) => (x === '-' ? '<hr>' : `<button type="button" data-bs="${x[0]}">${sym(x[1], 17)}<span>${esc(x[2])}</span></button>`)).join('')}
        <div class="oo-bs-platz"></div><div class="oo-bs-vogel">${vogel}</div></nav>
      <main class="oo-bs-inhalt"></main>${berge('oo-bs-berge')}`;
    document.body.appendChild(b);
    const inhalt = b.querySelector('.oo-bs-inhalt');
    const api = {
      zu: () => { b.remove(); beimSchliessen?.(); },
      zeige: async (k) => {
        b.querySelectorAll('.oo-bs-nav [data-bs]').forEach((x) => x.classList.toggle('an', x.dataset.bs === k));
        inhalt.scrollTop = 0; await zeige(k, inhalt, api);
      },
      inhalt, element: b, esc, sym,
    };
    b.addEventListener('click', async (ev) => {
      const k = ev.target.closest('.oo-bs-nav [data-bs]')?.dataset.bs;
      if (!k) return;
      if (k === 'zurueck') return api.zu();
      if (klick && await klick(k, api)) return;
      api.zeige(k);
    });
    b.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !document.querySelector('.oo-auswahl')) api.zu(); });
    b.focus();
    api.zeige(start);
    return api;
  }

  // Bausteine für die Seiten
  const teile = {
    titel: (t) => `<h1>${esc(t)}</h1>`,
    gross: (attr, symbol, titel, text) => `<button type="button" class="oo-bs-gross" ${attr}>${sym(symbol, 22)}<span><b>${esc(titel)}</b><small>${esc(text)}</small></span></button>`,
    zeile: (attr, symbol, titel, text, wann = '') => `<button type="button" class="oo-bs-zeile" ${attr}>${sym(symbol, 18)}<span><b>${esc(titel)}</b><small>${esc(text)}</small></span><em>${esc(wann)}</em></button>`,
    info: (t, w) => `<div class="oo-bs-info"><span>${esc(t)}</span><b>${w}</b></div>`,
    kopf: (symbol, titel, unter) => `<div class="oo-bs-titel">${sym(symbol, 26)}<div><b>${esc(titel)}</b><small>${esc(unter)}</small></div></div>`,
  };

  // ---------------------------------------------------------------
  // Optionen in der Datei-Ansicht. Standard-Bereiche (Allgemein, KI, Über) für alle Apps,
  // dazu eigene Bereiche je App: extra = [[schluessel, titel, html(e)]] – Felder mit data-op="schluessel".
  // ---------------------------------------------------------------
  async function optionen(inhalt, { A, app, vogelName, vogel = '', neu = [], extra = [], allgemeinExtra = () => '', start = 'allgemein', fertig, zurueck, nachSpeichern }) {
    const e = await A.einstellungen.lesen(); const eb = e.eingebaut || {};
    const feld = (t, x, inp) => `<div class="oo-op-zeile"><span><b>${esc(t)}</b><small>${esc(x)}</small></span>${inp}</div>`;
    const BEREICHE = [['allgemein', 'Allgemein', () => `<p class="oo-leise">Name und Kürzel gelten für alle Vögel von Ori Office.</p>
        ${feld('Dein Name', 'Erscheint bei Kommentaren, Änderungen und Notizen', `<input class="oo-feld" data-op="autorName" value="${esc(e.autorName || '')}" placeholder="z. B. Nils Pohler">`)}
        ${feld('Kürzel', 'Zwei, drei Buchstaben', `<input class="oo-feld kurz" data-op="initialen" maxlength="4" value="${esc(e.initialen || '')}" placeholder="NP">`)}${allgemeinExtra(e)}`],
      ...extra,
      ['ki', `${vogelName} (KI)`, () => `
        <div class="oo-op-zeile"><span><b>Wer hilft mit</b><small>Claude auf diesem PC, über deinen Heim-PC oder mit API-Schlüssel.</small></span><div class="oo-segment">${[['claude', 'Dieser PC'], ['heim', 'Heim-PC'], ['api', 'API']].map(([k, t]) => `<label><input type="radio" name="oo-weg" value="${k}" ${(e.weg || 'claude') === k ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
        <div class="oo-op-zeile w-heim"><span><b>Adresse vom Heim-PC</b><small>Steht dort unter Einstellungen → Heim-PC</small></span><input class="oo-feld" data-op="heimAdresse" value="${esc(e.heimAdresse || '')}" placeholder="http://mein-pc:4747"></div>
        <div class="oo-op-zeile w-heim"><span><b>Kopplungscode</b><small>${e.heimCodeGesetzt ? 'Gespeichert – leer lassen zum Behalten.' : 'Vom Heim-PC kopieren.'}</small></span><input class="oo-feld" data-op="heimCode" type="password" placeholder="Code"></div>
        <div class="oo-op-zeile w-api"><span><b>API-Schlüssel</b><small>${e.apiSchluesselGesetzt ? 'Gespeichert – leer lassen zum Behalten.' : 'Beginnt mit sk-ant-'}</small></span><input class="oo-feld" data-op="apiSchluessel" type="password" placeholder="sk-ant-…"></div>
        <div class="oo-op-zeile w-modell"><span><b>Modell</b><small>Opus ist am stärksten, Sonnet schneller.</small></span><select class="oo-feld kurz2" data-op="claudeModell">${['opus', 'sonnet', 'haiku'].map((m) => `<option value="${m}" ${(e.claudeModell || 'opus') === m ? 'selected' : ''}>${m[0].toUpperCase() + m.slice(1)}</option>`).join('')}</select></div>
        <div class="oo-op-zeile"><span><b>Eingebautes Claude</b><small>${eb.da && eb.token ? `Eingerichtet (${esc(eb.version || '')})` : 'Nicht eingerichtet – geht im Startfenster → Zahnrad → „Claude einrichten“.'}</small></span></div>
        <div class="oo-op-zeile"><span><b>Verbindung</b><small class="oo-status">Noch nicht getestet.</small></span><button type="button" class="oo-btn weiss" data-oo-testen>Testen</button></div>`],
      ['ueber', 'Über', () => `<div class="oo-op-ueber"><div class="oo-op-ueber-vogel">${vogel}</div><div><b>${esc(app)} ${esc(e.version || '')}</b><small>Teil von Ori Office</small></div></div>
        ${neu.length ? `<h4>Neu in dieser Version</h4><ul class="oo-leise">${neu.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <div class="oo-reihe"><button type="button" class="oo-btn weiss" data-oo-rundgang>Rundgang starten</button></div>`],
    ];
    inhalt.innerHTML = `<h1>Optionen</h1><div class="oo-op"><nav class="oo-op-nav">${BEREICHE.map(([k, t]) => `<button type="button" data-opb="${k}">${esc(t)}</button>`).join('')}</nav>
      ${BEREICHE.map(([k, , html]) => `<section data-ops="${k}" hidden>${html(e)}</section>`).join('')}
      <div class="oo-op-fuss"><button type="button" class="oo-btn weiss" data-oo-zu>Abbrechen</button><button type="button" class="oo-btn" data-oo-ok>OK</button></div></div>`;
    const zeigeB = (k) => { inhalt.querySelectorAll('[data-ops]').forEach((x) => { x.hidden = x.dataset.ops !== k; }); inhalt.querySelectorAll('[data-opb]').forEach((x) => x.classList.toggle('an', x.dataset.opb === k)); };
    const zeigeWeg = () => { const w = inhalt.querySelector('input[name="oo-weg"]:checked')?.value; inhalt.querySelectorAll('.w-heim').forEach((x) => { x.hidden = w !== 'heim'; }); inhalt.querySelectorAll('.w-api').forEach((x) => { x.hidden = w !== 'api'; }); inhalt.querySelectorAll('.w-modell').forEach((x) => { x.hidden = w === 'api'; }); };
    const werte = () => {
      const w = { weg: inhalt.querySelector('input[name="oo-weg"]:checked')?.value || 'claude' };
      inhalt.querySelectorAll('[data-op]').forEach((x) => { const v = x.type === 'checkbox' ? x.checked : x.value.trim(); w[x.dataset.op] = x.type !== 'checkbox' && /^\d+$/.test(v) && x.dataset.zahl !== undefined ? Number(v) : v; });
      return w;
    };
    zeigeB(start); zeigeWeg();
    inhalt.onchange = zeigeWeg;
    inhalt.onclick = async (ev) => {
      const b = ev.target.closest('[data-opb]'); if (b) return zeigeB(b.dataset.opb);
      if (ev.target.closest('[data-oo-zu]')) return zurueck?.();
      if (ev.target.closest('[data-oo-rundgang]')) return fertig?.('rundgang');
      if (ev.target.closest('[data-oo-ok]')) { const neuE = await A.einstellungen.setzen(werte()); await nachSpeichern?.(neuE); return fertig?.('ok'); }
      if (ev.target.closest('[data-oo-testen]')) {
        await A.einstellungen.setzen(werte()); const st = inhalt.querySelector('.oo-status'); st.textContent = 'Frage Claude …';
        const r = await A.hirnTesten?.();
        st.textContent = !r ? 'Test geht hier nicht.' : r.fehler ? `Klappt nicht: ${r.fehler.nachricht}` : `Claude ist da (${r.weg === 'heim' ? 'über den Heim-PC' : r.weg === 'eingebaut' ? 'eingebautes Claude' : r.weg === 'api' ? 'API' : 'dieser PC'}).`;
      }
    };
  }

  // ---------------------------------------------------------------
  // Eigene Klapplisten für alle <select> (einmal einschalten)
  // ---------------------------------------------------------------
  let klappAn = false;
  function auswahllisten() {
    if (klappAn) return; klappAn = true;
    document.addEventListener('mousedown', (ev) => {
      const sel = ev.target.closest?.('select'); const offen = document.querySelector('.oo-auswahl');
      if (offen && !offen.contains(ev.target)) { offen.remove(); if (sel && offen.dataset.fuer === sel.dataset.ooId) { ev.preventDefault(); return; } }
      if (!sel || sel.multiple || sel.disabled || ev.button !== 0 || sel.closest('[data-native]')) return;
      ev.preventDefault();
      sel.dataset.ooId = sel.dataset.ooId || String(Math.random()).slice(2);
      const l = document.createElement('div'); l.className = 'oo-auswahl'; l.dataset.fuer = sel.dataset.ooId;
      const opts = [...sel.options].filter((o) => o.value !== '' || sel.options.length < 3);
      l.innerHTML = opts.map((o) => `<button type="button" data-v="${esc(o.value)}" class="${o.value === sel.value ? 'an' : ''}" ${o.getAttribute('style') ? `style="${esc(o.getAttribute('style'))}"` : ''}>${esc(o.textContent)}</button>`).join('');
      document.body.appendChild(l);
      const r = sel.getBoundingClientRect(); l.style.minWidth = `${Math.round(r.width)}px`;
      const h = Math.min(l.scrollHeight, 340); const unten = innerHeight - r.bottom;
      l.style.left = `${Math.round(Math.max(8, Math.min(r.left, innerWidth - l.offsetWidth - 10)))}px`;
      l.style.top = `${Math.round(unten > h + 10 ? r.bottom + 4 : Math.max(8, r.top - h - 4))}px`;
      l.querySelector('.an')?.scrollIntoView({ block: 'nearest' });
      l.addEventListener('mousedown', (e2) => e2.preventDefault());
      l.addEventListener('click', (e2) => { const bt = e2.target.closest('[data-v]'); if (!bt) return; l.remove(); if (sel.value !== bt.dataset.v || bt.dataset.v === '') { sel.value = bt.dataset.v; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } });
    }, true);
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') document.querySelector('.oo-auswahl')?.remove(); }, true);
    addEventListener('blur', () => document.querySelector('.oo-auswahl')?.remove());
    addEventListener('resize', () => document.querySelector('.oo-auswahl')?.remove());
  }

  window.OO = { backstage, optionen, auswahllisten, teile, sym, berge, esc };
})();
