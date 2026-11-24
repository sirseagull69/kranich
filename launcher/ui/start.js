'use strict';
// Selbst gfaltet – Startfenster
(function () {
  const N = window.nest;
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { apps: [], zuletzt: [], einst: {}, updates: {}, laedt: {} };

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

  // ---------- Ori Office: jeder Vogel mit Farbe, Rolle und Spruch ----------
  const ART = {
    origami: { name: 'Ori', rolle: 'Fragen & Erledigen', spruch: 'Sag einfach, was du brauchst.', hell: '#ffe3d1', mittel: '#ffb48a', farbe: '#d2541b', dunkel: '#7a2c0e' },
    albatros: { name: 'Albatros', rolle: 'Tabellen', spruch: 'Jede Zahl an ihrem Platz.', hell: '#d8eedf', mittel: '#a9dcbb', farbe: '#2f7a4d', dunkel: '#173f28' },
    kranich: { name: 'Kranich', rolle: 'Folien & Gestalten', spruch: 'Langweilig? Nicht mit mir.', hell: '#e8e0fb', mittel: '#c9b9f6', farbe: '#6a4fc7', dunkel: '#33246f' },
    schreiben: { name: 'Schwalbe', rolle: 'Schreiben', spruch: 'Schreibt mit. Fliegt schnell.', hell: '#dbe6f7', mittel: '#b9cdf0', farbe: '#2c5aa0', dunkel: '#1e3f75' },
    specht: { name: 'Specht', rolle: 'IT-Helfer', spruch: 'Ich klopf erst, wenn du willst.', hell: '#f8e0d9', mittel: '#f0b5a7', farbe: '#b23a28', dunkel: '#5c1910' },
  };
  const art = (a) => ART[a.id] || { name: a.name, rolle: a.aufgabe, spruch: '', hell: a.hell, mittel: a.hell, farbe: a.farbe, dunkel: '#1d2742' };
  const EULE = (g) => `<svg viewBox="0 0 100 100" width="${g}" height="${g}" aria-hidden="true"><polygon points="30,40 50,30 70,40 66,78 34,78" fill="#e0b25a"/><polygon points="30,40 50,30 50,78 34,78" fill="#c8922f"/><polygon points="30,40 36,24 44,35" fill="#9a6a12"/><polygon points="70,40 64,24 56,35" fill="#9a6a12"/><circle cx="42" cy="46" r="7" fill="#fff8ea"/><circle cx="58" cy="46" r="7" fill="#fff8ea"/><circle cx="42" cy="46" r="3" fill="#1d2742"/><circle cx="58" cy="46" r="3" fill="#1d2742"/><polygon points="47,53 53,53 50,59" fill="#e8590c"/><polygon points="40,78 44,84 48,78" fill="#9a6a12"/><polygon points="52,78 56,84 60,78" fill="#9a6a12"/></svg>`;
  const bild = (id, anim, g) => (window.VOEGEL?.[id] ? vogel(id, anim, g).replace(/<ellipse[^>]*>(<animate[^>]*><\/animate>)*<\/ellipse>/, '') : EULE(g));
  const RUHE = { origami: 'ruhezustand-2', kranich: 'ruhezustand-3', albatros: 'ruhezustand-4', specht: 'ruhezustand-2' };
  try { S.wahl = localStorage.getItem('wahl') || 'albatros'; } catch { S.wahl = 'albatros'; }
  const gewaehlt = () => S.apps.find((a) => a.id === S.wahl) || S.apps[0];

  // Was der große Knopf gerade tun soll
  function knopf(a) {
    const u = S.updates[a.id] || {}; const pct = S.laedt[a.id];
    if (pct != null) return { text: pct >= 100 ? 'Wird installiert …' : `Lädt ${pct} %`, aktion: '', aus: true };
    if (a.status === 'bald') return { text: 'Kommt bald', aktion: '', aus: true };
    if (u.update && a.status !== 'bereit') return { text: `Aktualisieren auf ${u.neu}`, aktion: 'update' };
    if (a.status === 'fehlt' || (a.web && !a.version && u.installierbar)) return u.installierbar ? { text: 'Installieren', aktion: 'update' } : { text: 'Nicht installiert', aktion: '', aus: true };
    if (a.status === 'adresse') return { text: 'Einrichten', aktion: 'einst' };
    return { text: 'Öffnen', aktion: 'oeffnen' };
  }
  function zeile(a) {
    const k = art(a); const an = a.id === S.wahl; const u = S.updates[a.id] || {};
    const marke = a.status === 'bald' ? '<span class="marke-bald">BALD</span>' : u.update ? '<span class="marke-neu">NEU</span>' : a.status === 'fehlt' ? '<span class="marke-bald">FEHLT</span>' : '';
    return `<button type="button" class="zeile ${an ? 'an' : ''}" data-wahl="${a.id}" style="--mittel:${k.mittel};--hell:${k.hell}" aria-pressed="${an}">
      <span class="ikon">${bild(a.id, RUHE[a.id] || 'ruhezustand-3', 44)}</span>
      <span class="txt"><b>${esc(k.name)}</b><span>${esc(k.rolle)}</span></span>${marke}</button>`;
  }
  function huegel(k) {
    return `<svg class="huegel" viewBox="0 0 850 686" preserveAspectRatio="none" aria-hidden="true"><path d="M0 600 C 200 560 420 630 620 590 S 800 570 850 585 V686 H0Z" fill="${k.hell}"/><path d="M0 640 C 260 615 520 670 850 640 V686 H0Z" fill="${k.mittel}" opacity=".55"/></svg>`;
  }

  function render() {
    const a = gewaehlt(); if (!a) return;
    const k = art(a); const kn = knopf(a); const u = S.updates[a.id] || {};
    const ver = a.version || u.installiert;
    const updates = Object.entries(S.updates).filter(([, x]) => x.update).length;
    const dateien = S.zuletzt.filter((d) => d.app === a.id).slice(0, 3);
    const weiter = (dateien.length ? dateien : S.zuletzt.slice(0, 3));
    app.innerHTML = `<nav class="seite" aria-label="Vögel">
        <div class="kopf">${bild('origami', 'ruhezustand-2', 42)}<div><b>Ori Office</b><span class="hand">${esc(gruss())}</span></div></div>
        <div class="liste-voegel">${S.apps.map(zeile).join('')}</div>
        <div class="platz"></div>
        ${updates ? `<button type="button" class="status upd" data-alle><i></i><span>${updates === 1 ? '1 Update' : `${updates} Updates`}</span><b>Alle holen</b></button>` : `<div class="status"><i></i>Alles aktuell</div>`}
        <div class="unten"><span class="ver">${S.version ? `Startfenster ${esc(S.version)}` : ''}</span><button type="button" class="rund" data-aktion="einst" title="Einstellungen" aria-label="Einstellungen">${ICON.zahnrad}</button></div>
      </nav>
      <main class="buehne" style="--farbe:${k.farbe};--mittel:${k.mittel};--dunkel:${k.dunkel};--hell:${k.hell}">
        ${huegel(k)}
        <div class="oben"><div class="datum"><b>${esc(new Date().toLocaleDateString('de-DE', { weekday: 'long' }))}</b><span>${esc(new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }))} · <span class="uhr">${esc(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))}</span></span></div></div>
        <div class="held">
          <div class="held-text">
            <span class="rolle">${esc(k.rolle.toUpperCase())}</span>
            <h1>${esc(k.name)}</h1>
            ${k.spruch ? `<p class="spruch">„${esc(k.spruch)}“</p>` : ''}
            <div class="knoepfe">
              <button type="button" class="los" data-los="${kn.aktion}" ${kn.aus ? 'disabled' : ''}>${esc(kn.text)}</button>
            </div>
            ${a.status === 'bereit' && u.update ? `<button type="button" class="upd-hinweis" data-los="update" ${S.laedt[a.id] != null ? 'disabled' : ''}><i></i><span>${S.laedt[a.id] != null ? `Lädt ${S.laedt[a.id]} % …` : `Version ${esc(u.neu)} ist da`}</span><b>${S.laedt[a.id] != null ? '' : 'Jetzt holen'}</b></button>` : `<span class="info">${ver && ver !== '0' ? `Version ${esc(ver)} · aktuell` : a.status === 'bald' ? 'Ist in Arbeit' : ''}</span>`}
          </div>
          <div class="held-vogel" data-held>${bild(a.id, RUHE[a.id] || 'ruhezustand-3', 320)}</div>
        </div>
        <div class="weiter">
          <span class="weiter-titel">${dateien.length ? `Weitermachen mit ${esc(k.name)}` : 'Zuletzt bearbeitet'}</span>
          <div class="weiter-liste">${weiter.length ? weiter.map((d) => { const x = S.apps.find((q) => q.id === d.app) || {}; return `<button type="button" class="datei" data-datei="${esc(d.id)}" data-app="${esc(d.app)}"><b>${esc(d.name)}</b><span>${esc(art(x).name || '')} · ${esc(wann(d.geaendert))}</span></button>`; }).join('') : '<span class="leer">Noch nichts bearbeitet – öffne einen Vogel und leg los.</span>'}</div>
        </div>
      </main>`;
  }
  function waehle(id) {
    if (S.wahl === id) return;
    S.wahl = id; try { localStorage.setItem('wahl', id); } catch { /* egal */ }
    render();
    const h = app.querySelector('[data-held]'); if (h) { h.classList.add('neu'); }
  }

  async function starte(id, args = [], karteEl) {
    const a = S.apps.find((x) => x.id === id);
    if (!a || a.status === 'bald') { meldung(`${a ? art(a).name : 'Das'} kommt bald.`); return; }
    if (a.status === 'adresse') { einstellungen(); return; }
    const held = app.querySelector('[data-held]');
    if (held && window.VOEGEL?.[id] && id === S.wahl) held.innerHTML = bild(id, 'senden', 320);
    const r = await N.starte(id, args);
    if (r?.fehler === 'fehlt') { if (S.updates[id]?.installierbar) aktualisiere(id); else meldung(`${a.name} ist noch nicht installiert.`); }
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
    const cs = await N.claudeStatus();
    const kranich = S.apps.find((a) => a.id === 'kranich');
    const s = document.createElement('div');
    s.className = 'schleier';
    s.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><div class="reihe"><h2 class="h" style="flex:1">Einstellungen</h2><button type="button" class="rund" data-zu aria-label="Schließen">✕</button></div>
      <div class="ezeile"><div class="t"><b>Adresse von origami</b><span>Wo origami läuft, z. B. die Adresse deines Heim-PCs.</span></div><input class="feld" id="e-adr" value="${esc(e.origamiAdresse)}" placeholder="http://…"></div>
      <div class="ezeile"><div class="t"><b>Nach dem Start schließen</b><span>Das Startfenster geht zu, sobald ein Vogel startet.</span></div><label class="schalter"><input type="checkbox" id="e-zu" ${e.nachStartSchliessen ? 'checked' : ''}><i></i></label></div>
      <div class="ezeile"><div class="t"><b>Wo liegt Kranich?</b><span>Nur ändern, wenn Kranich woanders installiert ist.</span></div><input class="feld" id="e-kranich" value="${esc(e.pfade?.kranich || '')}" placeholder="${esc(kranich?.pfad || '')}"></div>
      <div class="ezeile" style="flex-wrap:wrap"><div class="t"><b>Claude für alle Vögel</b><span id="c-info">${cs.da ? (cs.token ? `Eingerichtet (Version ${esc(cs.version)}). Läuft ohne Installation, auch auf dem Arbeits-Notebook.` : 'Heruntergeladen – fehlt noch der Anmelde-Token.') : 'Für Geräte ohne Claude Code: einmal laden (ca. 175 MB), dann nutzen alle Vögel es.'}</span></div>
        <button type="button" class="btn" style="background:#5b3fc4" data-claude-laden>${cs.da ? 'Neu laden' : 'Claude einrichten'}</button>
        <div id="c-token" style="flex-basis:100%;display:${cs.da && !cs.token ? 'flex' : 'none'};flex-direction:column;gap:8px;padding-top:10px">
          <span class="leise" style="font-size:13px">Klick auf „Hier anmelden“: Ein Fenster geht auf, im Browser mit deinem Claude-Konto bestätigen. Den Code (beginnt mit sk-ant-) aus dem Fenster kopieren und hier einfügen.</span>
          <button type="button" class="btn" style="background:#5b3fc4;align-self:flex-start" data-claude-anmelden>Hier anmelden</button>
          <div class="reihe"><input class="feld" id="c-tokfeld" type="password" placeholder="sk-ant-…" style="flex:1;width:auto"><button type="button" class="btn" style="background:#1d2742" data-claude-token>Prüfen</button></div></div>
        ${cs.token ? '<button type="button" class="btn q" style="margin-left:auto" data-claude-ab>Abmelden</button>' : ''}</div>
      <div class="reihe" style="justify-content:flex-end;padding-top:14px"><button type="button" class="btn q" data-zu>Abbrechen</button><button type="button" class="btn" style="background:#1d2742" data-speichern>Speichern</button></div></div>`;
    document.body.appendChild(s);
    const zu = () => s.remove();
    s.addEventListener('click', async (ev) => {
      if (ev.target === s || ev.target.closest('[data-zu]')) return zu();
      const info = s.querySelector('#c-info');
      if (ev.target.closest('[data-claude-laden]')) {
        const b = ev.target.closest('[data-claude-laden]'); b.disabled = true;
        N.beiClaudeFortschritt((p) => { info.textContent = `Lädt … ${p} %`; });
        const r = await N.claudeLaden();
        b.disabled = false;
        if (r.fehler) { info.textContent = `Klappt nicht: ${r.fehler}`; return; }
        info.textContent = `Geladen (Version ${r.version}). Jetzt noch der Token:`;
        s.querySelector('#c-token').style.display = 'flex';
        return;
      }
      if (ev.target.closest('[data-claude-token]')) {
        info.textContent = 'Prüfe den Token …';
        const r = await N.claudeToken(s.querySelector('#c-tokfeld').value);
        if (r.fehler) { info.textContent = `Klappt nicht: ${r.fehler}`; return; }
        info.textContent = 'Fertig! Claude läuft jetzt für alle Vögel.';
        s.querySelector('#c-token').style.display = 'none';
        meldung('Claude ist eingerichtet.');
        return;
      }
      if (ev.target.closest('[data-claude-anmelden]')) { const r = await N.claudeAnmeldenFenster(); if (r.fehler) info.textContent = r.fehler; return; }
      if (ev.target.closest('[data-claude-ab]')) { await N.claudeAbmelden(); info.textContent = 'Abgemeldet.'; return; }
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

  async function aktualisiere(id) {
    if (S.laedt[id] != null) return;
    S.laedt[id] = 0; render();
    const r = await N.updateLaden(id);
    if (r?.fehler) { delete S.laedt[id]; render(); meldung(r.fehler); return; }
    S.laedt[id] = 100; render();
    meldung(r.mac ? 'Download fertig – zieh das Programm in den Programme-Ordner.' : id === 'start' ? 'Wird installiert, das Startfenster geht gleich neu auf.' : 'Wird installiert … (falls es offen ist: vorher schließen)');
    if (id !== 'start') { setTimeout(async () => { delete S.laedt[id]; await laden(); }, 10000); setTimeout(() => laden(), 30000); }
  }

  app.addEventListener('click', (e) => {
    if (e.target.closest('[data-alle]')) return (async () => { for (const id of Object.keys(S.updates).filter((k) => k !== 'start' && S.updates[k].update)) await aktualisiere(id); if (S.updates.start?.update) await aktualisiere('start'); })();
    const w = e.target.closest('[data-wahl]'); if (w) return waehle(w.dataset.wahl);
    const d = e.target.closest('[data-datei]'); if (d) return starte(d.dataset.app, [`--oeffne=${d.dataset.datei}`]);
    const l = e.target.closest('[data-los]');
    if (l) { const id = S.wahl; if (l.dataset.los === 'oeffnen') return starte(id); if (l.dataset.los === 'update') return aktualisiere(id); if (l.dataset.los === 'einst') return einstellungen(); }
    const a = e.target.closest('[data-aktion]');
    if (a?.dataset.aktion === 'einst') return einstellungen();
  });
  app.addEventListener('dblclick', (e) => { const w = e.target.closest('[data-wahl]'); if (w) starte(w.dataset.wahl); });
  // Pfeiltasten in der Vogel-Liste, Enter öffnet
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.schleier') || e.target.closest('input,textarea')) return;
    const ids = S.apps.map((x) => x.id); const i = ids.indexOf(S.wahl);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); waehle(ids[(i + (e.key === 'ArrowDown' ? 1 : -1) + ids.length) % ids.length]); app.querySelector('.zeile.an')?.focus(); }
    if (e.key === 'Enter' && e.target === document.body) { const g = gewaehlt(); if (knopf(g).aktion === 'oeffnen') starte(g.id); }
  });
  // Die Vögel reagieren nicht auf die Maus, machen aber von selbst immer wieder etwas anderes
  const zuletzt = {};
  const stapel = {};
  function eigenes(id) {
    // Alle Animationen des Vogels einmal gemischt durchspielen, dann neu mischen – nie zweimal hintereinander dieselbe
    if (!stapel[id]?.length) {
      const alle = Object.keys(window.VOEGEL?.[id] || {}).filter((n) => n !== RUHE[id] && !/^ruhezustand$/.test(n));
      const l = alle.length ? alle : ['winkt', 'erledigt'];
      stapel[id] = l.sort(() => Math.random() - 0.5);
      if (stapel[id][0] === zuletzt[id] && stapel[id].length > 1) stapel[id].push(stapel[id].shift());
    }
    const x = stapel[id].shift(); zuletzt[id] = x; return x;
  }
  function zeigeKurz(anim, dauer) {
    const h = app.querySelector('[data-held]'); const id = S.wahl;
    if (!h || h.dataset.macht || !window.VOEGEL?.[id]) return;
    h.dataset.macht = '1'; h.innerHTML = bild(id, anim, 320);
    setTimeout(() => { if (!h.isConnected || S.wahl !== id) return; h.innerHTML = bild(id, RUHE[id] || 'ruhezustand-3', 320); delete h.dataset.macht; }, dauer);
  }


  async function laden() {
    [S.apps, S.zuletzt, S.version] = await Promise.all([N.apps(), N.zuletzt(), N.version()]);
    render();
    const u = await N.updates();
    if (u && !u.fehler) { S.updates = u; render(); }
  }
  N.beiFortschritt(({ id, pct }) => { S.laedt[id] = pct; const b = app.querySelector('.los'); if (id === S.wahl && b) b.textContent = pct >= 100 ? 'Wird installiert …' : `Lädt ${pct} %`; else if (id === 'start') render(); });
  laden();
  setTimeout(() => document.body.classList.add('ruhig'), 2000);
  setTimeout(() => { if (!document.querySelector('.schleier')) N.standFoto?.('startfenster'); }, 3000);
  setInterval(async () => { const u = await N.updates(); if (u && !u.fehler) { S.updates = u; if (!document.querySelector('.schleier')) render(); } }, 5 * 60 * 1000);
  // Zwischendurch macht der gewählte Vogel von selbst etwas
  setInterval(() => { if (!document.hidden) zeigeKurz(eigenes(S.wahl), 3600); }, 6500);
  setInterval(() => { const u = app.querySelector('.uhr'); if (u) u.textContent = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); }, 20000);
  // Auch die kleinen Vögel links machen ab und zu etwas – immer nur einer
  setInterval(() => {
    if (document.hidden) return;
    const ids = S.apps.map((x) => x.id).filter((id) => window.VOEGEL?.[id]);
    const id = ids[Math.floor(Math.random() * ids.length)];
    const ik = app.querySelector(`.zeile[data-wahl="${id}"] .ikon`); if (!ik || ik.dataset.macht) return;
    ik.dataset.macht = '1'; ik.innerHTML = bild(id, eigenes(`klein-${id}`.replace('klein-', '')) , 44);
    setTimeout(() => { if (ik.isConnected) { ik.innerHTML = bild(id, RUHE[id] || 'ruhezustand-3', 44); delete ik.dataset.macht; } }, 3400);
  }, 4200);
})();
