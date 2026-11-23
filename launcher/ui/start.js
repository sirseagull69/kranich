'use strict';
// Selbst gfaltet – Startfenster
(function () {
  const N = window.nest;
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { apps: [], zuletzt: [], einst: {} };

  const vogel = (id, anim, g) => {
    const v = window.VOEGEL?.[id]?.[anim];
    return v ? v.replace(/__G__/g, g).replace(' aria-hidden="true"', '') : '';
  };
  const ICON = {
    zahnrad: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  };

  function wann(iso) {
    if (!iso) return '';
    const d = new Date(iso), jetzt = new Date();
    const zeit = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === jetzt.toDateString()) return `Heute, ${zeit}`;
    const gestern = new Date(jetzt); gestern.setDate(jetzt.getDate() - 1);
    if (d.toDateString() === gestern.toDateString()) return `Gestern, ${zeit}`;
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  }
  function gruss() {
    const h = new Date().getHours();
    return h < 11 ? 'Guten Morgen, Nils' : h < 17 ? 'Hallo, Nils' : 'Guten Abend, Nils';
  }
  function meldung(text) {
    document.querySelector('.meldung')?.remove();
    const m = document.createElement('div'); m.className = 'meldung'; m.textContent = text;
    document.body.appendChild(m); setTimeout(() => m.remove(), 3200);
  }

  const STATUS = { bereit: ['Bereit', ''], adresse: ['Adresse fehlt', 'grau'], bald: ['Kommt bald', 'grau'], fehlt: ['Nicht installiert', 'grau'] };
  const LOS = { bereit: 'Öffnen →', adresse: 'Einrichten', bald: '', fehlt: 'Installieren' };

  function karte(a) {
    const [st, art] = STATUS[a.status] || STATUS.fehlt;
    const bild = window.VOEGEL?.[a.id] ? vogel(a.id, 'ruhezustand-3', 140) : '<span class="papier"></span>';
    return `<button type="button" class="vogel ${a.status === 'bald' ? 'bald' : ''}" style="--farbe:${a.farbe};--hell:${a.hell}" data-app="${a.id}" ${a.status === 'bald' ? 'aria-disabled="true"' : ''}>
      <span class="bild">${bild}</span><b class="h">${esc(a.name)}</b><span class="aufgabe">${esc(a.aufgabe)}</span>
      <span class="fuss"><span class="chip ${art}"><i></i>${st}</span><span class="los">${LOS[a.status] || ''}</span></span></button>`;
  }

  function render() {
    const origami = S.apps.find((a) => a.id === 'origami');
    app.innerHTML = `<header><div class="marke"><span class="blatt"><i></i></span><b class="h">Selbst gfaltet</b></div><div class="platz"></div>
        <button type="button" class="rund" data-aktion="einst" title="Einstellungen" aria-label="Einstellungen">${ICON.zahnrad}</button></header>
      <main>
        <div class="gruss"><span class="hand">${esc(gruss())} – welcher Vogel darf heute?</span><h1>Was machen wir heute?</h1></div>
        <div class="voegel">${S.apps.map(karte).join('')}</div>
        <div class="zeile2">
          <section class="karte frag" style="--hell:${origami?.hell}"><h2>${vogel('origami', 'denkt-nach', 30)}origami fragen</h2>
            <textarea id="frage" placeholder="Frag origami etwas, z. B. „Was steht heute an?“" aria-label="Frage an origami"></textarea>
            <div class="reihe"><span class="leise" style="font-size:13px;flex:1">${origami?.status === 'bereit' ? 'Öffnet origami mit deiner Frage.' : 'Trag zuerst die Adresse von origami ein (Zahnrad oben rechts).'}</span><button type="button" class="btn" data-aktion="fragen">Fragen</button></div></section>
          <section class="karte"><h2>Zuletzt bearbeitet</h2>
            <div class="liste">${S.zuletzt.length ? S.zuletzt.map((d) => { const a = S.apps.find((x) => x.id === d.app) || {}; return `<button type="button" class="datei" style="--hell:${a.hell}" data-datei="${esc(d.id)}" data-app="${esc(d.app)}"><span class="vor" ${d.vorschau ? `style="background-image:url('${d.vorschau}')"` : ''}></span><span class="txt"><b>${esc(d.name)}</b><span>${esc(a.name || '')} · ${esc(d.info)}</span></span><span class="wann">${esc(wann(d.geaendert))}</span></button>`; }).join('') : '<div class="leer">Noch nichts bearbeitet. Öffne oben einen Vogel und leg los.</div>'}</div></section>
        </div>
      </main>`;
    document.getElementById('frage').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fragen(); } });
  }

  async function starte(id, args = [], karteEl) {
    const a = S.apps.find((x) => x.id === id);
    if (!a || a.status === 'bald') { meldung(`${a?.name || 'Das'} kommt bald.`); return; }
    if (a.status === 'adresse') { einstellungen(); return; }
    const bild = karteEl?.querySelector('.bild');
    if (bild && window.VOEGEL?.[id]) bild.innerHTML = vogel(id, 'senden', 140);
    const r = await N.starte(id, args);
    if (r?.fehler === 'fehlt') meldung(`${a.name} ist noch nicht installiert – die Download-Seite ist offen.`);
    else if (r?.fehler === 'adresse') einstellungen();
    else if (r?.fehler) meldung(r.fehler);
    else meldung(`${a.name} startet …`);
  }

  async function fragen() {
    const t = document.getElementById('frage').value.trim();
    if (!t) { document.getElementById('frage').focus(); return; }
    await starte('origami', [`--frage=${t}`]);
  }

  async function einstellungen() {
    const e = await N.einst();
    const kranich = S.apps.find((a) => a.id === 'kranich');
    const s = document.createElement('div');
    s.className = 'schleier';
    s.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><div class="reihe"><h2 class="h" style="flex:1">Einstellungen</h2><button type="button" class="rund" data-zu aria-label="Schließen">✕</button></div>
      <div class="ezeile"><div class="t"><b>Adresse von origami</b><span>Wo origami läuft, z. B. die Adresse deines Heim-PCs.</span></div><input class="feld" id="e-adr" value="${esc(e.origamiAdresse)}" placeholder="http://…"></div>
      <div class="ezeile"><div class="t"><b>Nach dem Start schließen</b><span>Das Startfenster geht zu, sobald ein Vogel startet.</span></div><label class="schalter"><input type="checkbox" id="e-zu" ${e.nachStartSchliessen ? 'checked' : ''}><i></i></label></div>
      <div class="ezeile"><div class="t"><b>Wo liegt Kranich?</b><span>Nur ändern, wenn Kranich woanders installiert ist.</span></div><input class="feld" id="e-kranich" value="${esc(e.pfade?.kranich || '')}" placeholder="${esc(kranich?.pfad || '')}"></div>
      <div class="reihe" style="justify-content:flex-end;padding-top:14px"><button type="button" class="btn q" data-zu>Abbrechen</button><button type="button" class="btn" style="background:#1d2742" data-speichern>Speichern</button></div></div>`;
    document.body.appendChild(s);
    const zu = () => s.remove();
    s.addEventListener('click', async (ev) => {
      if (ev.target === s || ev.target.closest('[data-zu]')) return zu();
      if (ev.target.closest('[data-speichern]')) {
        const pfade = { ...(e.pfade || {}) };
        const k = s.querySelector('#e-kranich').value.trim();
        if (k) pfade.kranich = k; else delete pfade.kranich;
        await N.einstSetzen({ origamiAdresse: s.querySelector('#e-adr').value, nachStartSchliessen: s.querySelector('#e-zu').checked, pfade });
        zu(); await laden(); meldung('Gespeichert.');
      }
    });
    s.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') zu(); });
    s.querySelector('#e-adr').focus();
  }

  app.addEventListener('click', (e) => {
    const d = e.target.closest('[data-datei]');
    if (d) return starte(d.dataset.app, [`--oeffne=${d.dataset.datei}`]);
    const v = e.target.closest('.vogel');
    if (v) return starte(v.dataset.app, [], v);
    const a = e.target.closest('[data-aktion]');
    if (a?.dataset.aktion === 'einst') return einstellungen();
    if (a?.dataset.aktion === 'fragen') return fragen();
  });
  // Drüberfahren: der Vogel winkt
  app.addEventListener('mouseover', (e) => {
    const v = e.target.closest('.vogel');
    if (!v || v.dataset.winkt || !window.VOEGEL?.[v.dataset.app] || v.classList.contains('bald')) return;
    v.dataset.winkt = '1';
    v.querySelector('.bild').innerHTML = vogel(v.dataset.app, 'winkt', 140);
    setTimeout(() => { if (!v.isConnected) return; v.querySelector('.bild').innerHTML = vogel(v.dataset.app, 'ruhezustand-3', 140); delete v.dataset.winkt; }, 2300);
  });

  async function laden() {
    [S.apps, S.zuletzt] = await Promise.all([N.apps(), N.zuletzt()]);
    render();
  }
  laden();
})();
