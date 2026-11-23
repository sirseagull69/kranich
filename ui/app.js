'use strict';
// Kranich – Steuerung der Oberfläche.
(function () {
  const K = window.kranich;
  const { esc } = H;
  const app = document.getElementById('app');

  const S = {
    ansicht: 'start', startLasche: 'start', liste: [], vorschauen: {},
    projekt: null, modus: 'entwurf', seiteId: null, ebenen: [], auswahl: null,
    leisteLasche: 'kranich', anhang: null,
    kranich: { zustand: 'bereit', schritte: [], letzter: null, fehler: null, meldung: '' },
    varianten: null, variantenWunsch: '', mischen: new Set(), variantenLaeuft: false,
    speichert: false, einstellungen: {}, formate: [], gruppen: [], neuFormat: 'web', formatSuche: '', eigenEinheit: 'px',
  };
  window.S = S;

  const seite = () => S.projekt?.seiten.find((s) => s.id === S.seiteId) || S.projekt?.seiten[0];

  // ---------- Speichern ----------
  const speichernSpaeter = H.spaeter(async () => {
    if (!S.projekt) return;
    S.speichert = true; zeigeSpeicherchip();
    if (Bild.hatBild() || S.projekt.bild?.ebenen?.length) {
      S.projekt.bild = await Bild.speichere((datei, url) => K.projekte.dateiSchreiben(S.projekt.id, datei, url));
    }
    await K.projekte.speichern(S.projekt);
    S.speichert = false; zeigeSpeicherchip();
  }, 700);

  const vorschauSpaeter = H.spaeter(async () => {
    if (!S.projekt) return;
    if (S.modus === 'bild' && Bild.hatBild()) {
      await K.projekte.dateiSchreiben(S.projekt.id, 'vorschau.png', Bild.vorschau(480));
    } else if (seite()?.html) {
      await K.projekte.vorschauAusHtml(S.projekt.id, seite().html, seite().breite, seite().hoehe);
    }
  }, 2500);

  function geaendert({ vorschau = true } = {}) {
    speichernSpaeter();
    if (vorschau) vorschauSpaeter();
  }

  function zeigeSpeicherchip() {
    const el = document.querySelector('.speicherchip');
    if (!el) return;
    el.className = `chip speicherchip ${S.speichert ? 'chip-grau' : 'chip-gruen'}`;
    el.innerHTML = S.speichert ? 'Speichert …' : `${sym('haken', 13)}Gespeichert`;
  }

  // ---------- Start ----------
  async function zeigeStart() {
    S.ansicht = 'start';
    S.projekt = null;
    app.innerHTML = '';
    const liste = await K.projekte.liste();
    S.liste = Array.isArray(liste) ? liste : [];
    for (const p of S.liste) {
      if (p.vorschau && !S.vorschauen[p.id + p.geaendert]) {
        S.vorschauen[p.id + p.geaendert] = await K.projekte.dateiLesen(p.id, 'vorschau.png');
      }
    }
    renderStart();
  }

  function karteNeu(art, titel, text, bild) {
    return `<button type="button" class="startkarte cardw" data-aktion="neu" data-art="${art}"><div class="card">
      <div class="bildfeld">${bild}</div>
      <div class="ktitel">${sym(art === 'bild' ? 'zuschneiden' : art === 'ausbild' ? 'mischen' : art === 'app' ? 'varianten' : 'seite', 18)}<span class="h">${titel}</span></div>
      <span class="ktext">${text}</span></div></button>`;
  }

  function projektKarte(p) {
    const url = S.vorschauen[p.id + p.geaendert];
    return `<div class="projektkarte cardw"><button type="button" class="btn btn-s weg" data-aktion="projekt-weg" data-id="${p.id}" aria-label="Projekt löschen">${sym('muell', 14)}</button>
      <button type="button" style="border:0;padding:0;background:transparent;width:100%;text-align:left;font:inherit;color:inherit" data-aktion="projekt-oeffnen" data-id="${p.id}"><div class="card">
      <div class="vorschau" style="${url ? `background-image:url('${url}')` : ''}">${url ? '' : figur('ruhend', 40)}</div>
      <span class="pname h">${esc(p.name)}${p.seite ? ` · ${esc(p.seite)}` : ''}</span>
      <span class="pinfo"><span class="chip ${p.art === 'bild' ? 'chip-gelb' : p.app ? 'chip-gruen' : 'chip-zart'}">${p.art === 'bild' ? 'Bild' : p.app ? 'App' : 'Entwurf'}</span>${esc(H.wann(p.geaendert))}</span></div></button></div>`;
  }

  function renderStart() {
    const l = S.startLasche;
    const projekteHtml = S.liste.length ? S.liste.map(projektKarte).join('') : '<div class="leerhinweis">Noch keine Projekte. Fang links mit einer Karte an.</div>';
    let blatt;
    if (l === 'start') {
      blatt = `<div class="startoben"><div class="neu">
          <div style="display:flex;align-items:baseline;gap:14px"><h1 class="h">Neu</h1><span class="hand" style="font-size:22px">womit fangen wir an?</span></div>
          <div class="karten3">
            ${karteNeu('entwurf', 'Oberfläche entwerfen', 'Eine App-Seite, ein Fenster oder eine Webseite von Grund auf.', '<div style="width:118px;height:80px;background:#fff;box-shadow:0 2px 6px rgba(30,40,70,.18);display:flex;flex-direction:column;position:relative;z-index:1"><span style="height:16px;background:#4a2f9a"></span><span style="display:flex;flex-direction:column;gap:5px;padding:9px"><span style="height:5px;width:80%;background:#d6caf9"></span><span style="height:5px;width:60%;background:#d6caf9"></span></span><span style="position:absolute;right:9px;bottom:9px;width:34px;height:12px;background:#7c5cd6"></span></div>')}
            ${karteNeu('bild', 'Bild bearbeiten', 'Zuschneiden, freistellen, Farben anpassen – per Wort oder Werkzeug.', '<span style="width:58px;height:54px;background:#4a2f9a;border-radius:5px 5px 16px 16px;position:relative;z-index:1"></span>')}
            ${karteNeu('app', 'Ganze App entwerfen', 'Alle Bildschirme mit Plan, Abläufen und Zuständen.', `<div style="display:grid;grid-template-columns:repeat(3,30px);gap:6px;position:relative;z-index:1">${'<span style="height:22px;background:#fff;box-shadow:0 1px 3px rgba(30,40,70,.18)"></span>'.repeat(4)}<span style="height:22px;background:#7c5cd6"></span><span style="height:22px;background:#4a2f9a"></span></div>`)}
            ${karteNeu('ausbild', 'Aus Bild eine Oberfläche', 'Screenshot oder Skizze rein, bearbeitbarer Entwurf raus.', `<div style="display:flex;align-items:center;gap:10px;position:relative;z-index:1"><div style="width:58px;height:58px;background:#fff;box-shadow:0 2px 6px rgba(30,40,70,.18);transform:rotate(-4deg);padding:8px"><span style="display:block;height:4px;width:80%;background:#5b6170;margin-bottom:6px"></span><span style="display:block;height:4px;width:60%;background:#5b6170"></span></div><span style="color:#4a2f9a">${sym('senden', 18)}</span><div style="width:64px;height:64px;background:#fff;box-shadow:0 2px 6px rgba(30,40,70,.18);padding:8px;display:flex;flex-direction:column;gap:5px"><span style="height:7px;width:70%;background:#4a2f9a"></span><span style="height:5px;width:90%;background:#d9d0bc"></span><span style="margin-top:auto;height:10px;width:50%;background:#6243c4;align-self:flex-end"></span></div></div>`)}
          </div>
          <div class="hinweis">${figur('ruhend', 30)}<span>Kranich kennt den Look der origami-Familie und hält sich daran.</span></div>
        </div>
        <div class="zuletzt"><div style="display:flex;align-items:baseline;justify-content:space-between"><h2 class="h">Zuletzt geöffnet</h2><button type="button" class="btn btn-s btn-q" data-aktion="lasche" data-lasche="alle">Alle Projekte</button></div>
          <div class="projektliste">${S.liste.length ? S.liste.slice(0, 4).map(projektKarte).join('') : '<div class="leerhinweis">Noch nichts gefaltet.</div>'}</div></div></div>
        <div class="falteingabe">${figur('ruhend', 30)}<input id="startwunsch" placeholder="Was soll Kranich falten?" aria-label="Was soll Kranich falten?">
          ${S.anhang ? `<span class="anhang"><img src="${S.anhang.dataUrl}" alt=""><button type="button" class="btn btn-s btn-q" data-aktion="anhang-weg">Entfernen</button></span>` : ''}
          <button type="button" class="btn btn-q" data-aktion="anhang">${sym('klammer', 16)} Bild anhängen</button>
          <button type="button" class="btn btn-q" disabled title="Sprechen kommt noch">${sym('mikro', 16)} Sprechen</button>
          <button type="button" class="btn btn-p" data-aktion="start-falten">${figur('arbeitend', 18)} Falten</button></div>`;
    } else if (l === 'app') {
      blatt = AppBau.renderAuftrag();
    } else if (l === 'alle') {
      blatt = `<h1 class="h" style="margin:0;font-size:30px;font-weight:800">Alle Projekte</h1><div class="projektliste" style="grid-template-columns:repeat(4,1fr)">${projekteHtml}</div>`;
    } else {
      blatt = renderFormate();
    }
    app.innerHTML = `<section class="ansicht" id="start">
      <header class="kopf"><div class="marke">${figur('ruhend', 34)}<span class="h">Kranich</span></div><span class="leise" style="font-size:13px">aus der origami-Familie</span><div class="platz"></div>
        <button type="button" class="btn btn-q" data-aktion="lasche" data-lasche="alle">${sym('ordner', 16)} Öffnen…</button>
        <button type="button" class="btn btn-q" data-aktion="einstellungen">${sym('zahnrad', 16)} Einstellungen</button>
        <span class="avatar h" aria-label="Angemeldet als Nils">NP</span></header>
      <div class="laschen" role="tablist">${[['start', 'Start'], ['neu', 'Neu'], ['app', 'Ganze App'], ['alle', 'Alle Projekte']].map(([k, t]) => `<button type="button" role="tab" aria-selected="${l === k}" data-aktion="lasche" data-lasche="${k}">${t}</button>`).join('')}</div>
      <section class="paper startblatt">${blatt}${eselsohr(54, '#f6f1e7')}</section></section>`;
    document.getElementById('startwunsch')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') aktionen['start-falten'](); });
    const suche = document.getElementById('fsuche');
    if (suche) {
      suche.value = S.formatSuche || '';
      suche.addEventListener('input', () => { S.formatSuche = suche.value; const pos = suche.selectionStart; renderStart(); const n = document.getElementById('fsuche'); n.focus(); n.setSelectionRange(pos, pos); });
    }
  }

  // ---------- Formate ----------
  function formatSymbol(f, max = 50) {
    const v = Math.min(max / f.breite, max / f.hoehe);
    return `<span class="formatsymbol" aria-hidden="true" style="width:${Math.max(6, Math.round(f.breite * v))}px;height:${Math.max(6, Math.round(f.hoehe * v))}px"></span>`;
  }
  const massText = (f) => f.mass || `${f.breite} × ${f.hoehe}`;

  function formatKarten(aktivId, aktion = 'format-waehlen') {
    const q = (S.formatSuche || '').trim().toLowerCase();
    const passt = (f) => !q || `${f.name} ${f.gruppe} ${massText(f)}`.toLowerCase().includes(q) || (q === 'a4' && f.druck);
    const gruppen = (S.gruppen || []).map((g) => {
      const liste = S.formate.filter((f) => f.gruppe === g && passt(f));
      if (!liste.length) return '';
      return `<div class="formatgruppe ${liste.length > 4 ? 'breit' : ''}"><span class="lbl">${esc(g)}</span><div class="formatreihe" ${liste.length > 4 ? 'style="grid-template-columns:repeat(5,minmax(0,1fr))"' : ''}>${liste.map((f) => `<button type="button" class="formatkarte cardw" aria-pressed="${f.id === aktivId}" data-aktion="${aktion}" data-id="${f.id}"><div class="card"><div class="fvor">${formatSymbol(f)}</div><b>${esc(f.name)}</b><span class="m">${esc(massText(f))}</span></div></button>`).join('')}</div></div>`;
    }).join('');
    return gruppen || '<div class="leerhinweis">Kein Format passt. Leg unten rechts eine eigene Größe an.</div>';
  }

  function renderFormate() {
    const f = S.formate.find((x) => x.id === S.neuFormat) || S.formate.find((x) => x.id === 'web');
    return `<div class="formatkopf"><div style="display:flex;flex-direction:column"><h1 class="h">Was gestalten wir?</h1><span class="hand" style="font-size:21px">such dir ein Blatt aus</span></div><div class="platz"></div>
        <div style="display:flex;flex-direction:column;gap:3px;width:340px"><label for="fsuche" class="lbl">Format suchen</label><input id="fsuche" class="feld" placeholder="z. B. „Story“ oder „A4“"></div></div>
      <div class="formatkoerper"><div class="formatgruppen">${formatKarten(f.id)}</div>
        <div class="paper eigenekarte cardw"><b class="h" style="font-size:17px">Eigene Größe</b><span class="leise" style="font-size:13px">Wenn nichts davon passt.</span>
          <div class="reihe"><label class="reihe" style="gap:4px">Breite <input class="feld" id="eigen-b" type="number" value="1200"></label></div>
          <div class="reihe"><label class="reihe" style="gap:4px">Höhe <input class="feld" id="eigen-h" type="number" value="800"></label></div>
          <div class="segment" role="group" aria-label="Einheit"><button type="button" aria-pressed="${S.eigenEinheit !== 'mm'}" data-aktion="einheit" data-e="px">Pixel</button><button type="button" aria-pressed="${S.eigenEinheit === 'mm'}" data-aktion="einheit" data-e="mm">Millimeter</button></div>
          <button type="button" class="btn btn-p" data-aktion="eigen-anlegen">Anlegen</button>
          <span class="hand" style="font-size:20px">ich falt jede Größe</span></div></div>
      <div class="falteingabe">${figur('ruhend', 30)}<span class="chip chip-zart">${esc(f.name)} · ${esc(massText(f))}</span><input id="startwunsch" placeholder="Was soll Kranich falten?" aria-label="Was soll Kranich falten?">
        ${S.anhang ? `<span class="anhang"><img src="${S.anhang.dataUrl}" alt=""><button type="button" class="btn btn-s btn-q" data-aktion="anhang-weg">Entfernen</button></span>` : ''}
        <button type="button" class="btn btn-q" data-aktion="anhang">${sym('klammer', 16)} Bild anhängen</button>
        <button type="button" class="btn" data-aktion="leer-anlegen">Leer anlegen</button>
        <button type="button" class="btn btn-p" data-aktion="start-falten">${figur('arbeitend', 18)} Falten</button></div>`;
  }

  // ---------- Projekt öffnen ----------
  async function oeffne(id, { modus } = {}) {
    const l = AppBau.laufFuer(id);
    if (l) {
      // Bau läuft noch: dasselbe Projekt im Speicher weiterzeigen, nicht neu laden
      S.projekt = l.p; S.modus = 'entwurf'; S.seiteId = l.p.seiten[0]?.id;
      S.auswahl = null; S.varianten = null; S.mischen.clear();
      S.kranich = { zustand: 'denkt', schritte: [], letzter: null, fehler: null, anpassen: l.jobs, titel: l.titel, meldung: l.meldung(), gesamt: 0 };
      S.ansicht = 'werkbank';
      renderWerkbank();
      AppBau.zeigeLauf();
      return;
    }
    const p = await K.projekte.laden(id);
    if (p?.fehler) { H.meldung(p.fehler.nachricht, { art: 'fehler' }); return; }
    S.projekt = p;
    if (p.app?.plan && !p.seiten?.length) {
      p.chat = p.chat || [];
      S.modus = 'entwurf'; S.seiteId = null;
      S.kranich = { zustand: 'bereit', schritte: [], letzter: null, fehler: null, meldung: '' };
      AppBau.renderPlan();
      return;
    }
    p.seiten = p.seiten?.length ? p.seiten : [{ id: `s${Date.now().toString(36)}`, name: 'Seite 1', breite: 1440, hoehe: 900, html: '', verlauf: [] }];
    p.chat = p.chat || [];
    S.seiteId = p.seiten[0].id;
    S.modus = modus || p.art || 'entwurf';
    S.auswahl = null; S.varianten = null; S.mischen.clear();
    S.kranich = { zustand: 'bereit', schritte: [], letzter: null, fehler: null, meldung: '' };
    await Bild.lade(p, (datei) => K.projekte.dateiLesen(p.id, datei));
    S.ansicht = 'werkbank';
    renderWerkbank();
  }

  async function neuesProjekt(art, { wunsch, anhang, format, app: appName } = {}) {
    const f = format || S.formate.find((x) => x.id === 'web');
    const p = await K.projekte.anlegen({ art: art === 'bild' ? 'bild' : 'entwurf', format: f });
    if (p?.fehler) { H.meldung(p.fehler.nachricht, { art: 'fehler' }); return; }
    if (f.mass && p.seiten[0]) { p.seiten[0].mass = f.mass; await K.projekte.speichern(p); }
    await oeffne(p.id);
    if (art === 'bild') {
      const b = anhang || await K.datei.bildWaehlen();
      if (b && !b.fehler) {
        S.projekt.name = b.name.replace(/\.[^.]+$/, '');
        await Bild.oeffneBild(b.dataUrl, b.name);
        renderWerkbank();
        geaendert();
      }
      return;
    }
    if (anhang) S.anhang = anhang;
    if (wunsch || anhang) await sendeEntwurf(wunsch || '', { app: appName });
    else renderWerkbank();
  }

  // ---------- Werkbank ----------
  function kopfHtml(rechts) {
    const p = S.projekt;
    const unten = S.ansicht === 'varianten' ? 'Varianten' : S.modus === 'bild' ? 'Bild 1' : seite()?.name;
    return `<header class="kopf"><button type="button" class="marke btn-q" style="border:0;background:none;padding:0;color:inherit" data-aktion="zum-start" title="Zur Startseite">${figur('ruhend', 34)}<span class="h">Kranich</span></button>
      <span class="trenner" aria-hidden="true"></span>
      <div class="titel"><b class="h" data-aktion="umbenennen" title="Zum Umbenennen klicken">${esc(p.name)}</b><span>/ ${esc(unten)}</span></div>
      <span class="chip speicherchip chip-gruen">${sym('haken', 13)}Gespeichert</span>
      <div class="platz"></div>
      <div class="modus" role="group" aria-label="Modus">
        <button type="button" aria-pressed="${S.modus === 'entwurf'}" data-aktion="modus" data-modus="entwurf">Entwurf</button>
        <button type="button" aria-pressed="${S.modus === 'bild'}" data-aktion="modus" data-modus="bild">Bild</button></div>
      <div class="platz"></div><div class="reihe">${rechts}</div></header>`;
  }

  function kopfKnoepfe() {
    const kannZurueck = S.modus === 'bild' ? Bild.z.stand > 0 : (seite()?.stand || 0) > 0;
    if (S.projekt?.app?.plan && S.modus !== 'bild') return AppBau.kopfKnoepfe(kannZurueck);
    return `<button type="button" class="btn btn-q" data-aktion="rueckgaengig" ${kannZurueck ? '' : 'disabled'}>${sym('zurueck', 16)} Rückgängig</button>
      ${S.modus === 'bild' ? '' : `<button type="button" class="btn" data-aktion="alle-groessen" ${seite()?.html ? '' : 'disabled title="Erst etwas aufs Board falten"'}>${sym('mischen', 16)} Alle Größen</button>`}
      <button type="button" class="btn" data-aktion="varianten" ${S.modus === 'bild' ? 'disabled title="Varianten gibt es im Entwurf"' : ''}>${sym('varianten', 16)} Varianten</button>
      <button type="button" class="btn btn-p" data-aktion="exportieren">${sym('export', 16)} Exportieren</button>`;
  }

  function renderWerkbank() {
    S.ansicht = 'werkbank';
    const bild = S.modus === 'bild';
    app.innerHTML = `<section class="ansicht" id="werkbank">${kopfHtml(kopfKnoepfe())}
      <div class="werkbank">
        ${bild ? '<nav class="werkzeuge" aria-label="Werkzeuge"></nav>' : '<nav class="seitenleiste" aria-label="Seiten und Ebenen"></nav>'}
        <main class="leinwand paper" aria-label="Leinwand"></main>
        ${bild ? '<div class="rechtsbild"><div class="paper reglerkarte" id="regler"></div><aside class="kranichleiste" aria-label="Kranich"></aside></div>' : '<aside class="kranichleiste" aria-label="Kranich"></aside>'}
      </div></section>`;
    const leinwand = app.querySelector('.leinwand');
    leinwand.addEventListener('dragover', (e) => e.preventDefault());
    leinwand.addEventListener('drop', beimAblegen);
    if (bild) {
      Bild.montiere(leinwand, { beiAenderung: () => { renderRegler(); renderKopfKnoepfe(); renderSchrittband(); geaendert(); }, beiWerkzeug: () => { renderWerkzeuge(); renderWerkzeugOptionen(); } });
      renderWerkzeuge(); renderRegler(); renderSchrittband(); renderWerkzeugOptionen();
      if (!Bild.hatBild()) renderBildLeer();
    } else {
      Entwurf.montiere(leinwand, {
        beiAuswahl: (a) => { S.auswahl = a; renderSeitenleiste(); renderWunschfeld(); },
        beiEbenen: (l) => { S.ebenen = l; renderSeitenleiste(); },
        beiBoard: (id) => waehleBoard(id),
        beiHtml: (id, html) => { const s = S.projekt?.seiten.find((x) => x.id === id); if (!s) return; s.html = html; if (s.verlauf?.[s.stand]) s.verlauf[s.stand].html = html; speichernSpaeter(); },
      });
      zeigeBoards();
      AppBau.zeigeLauf();
    }
    renderLeiste();
    zeigeSpeicherchip();
  }

  function renderKopfKnoepfe() {
    const r = app.querySelector('.kopf .reihe');
    if (r && S.ansicht === 'werkbank' && S.projekt) r.innerHTML = kopfKnoepfe();
  }

  function zeigeBoards() {
    Entwurf.zeigeAlle(S.projekt.seiten, seite().id);
    renderSeitenleiste();
    renderMitte();
  }

  function waehleBoard(id) {
    if (S.seiteId === id) return;
    S.seiteId = id;
    S.auswahl = null;
    Entwurf.setzeAktiv(id);
    renderSeitenleiste(); renderKopfKnoepfe(); renderWunschfeld(); renderVerlauf(); renderMitte();
    const t = app.querySelector('.titel span');
    if (t) t.textContent = `/ ${seite().name}`;
  }

  // Neues Board rechts in der Reihe des Ankers; wird die Reihe zu breit,
  // beginnt darunter eine neue Reihe.
  const REIHE_MAX = 4400;
  function platzDaneben(anker, breite = 0) {
    const alle = S.projekt.seiten;
    const reihe = alle.filter((x) => Math.abs(x.y - anker.y) < 1);
    const x = Math.max(...reihe.map((r) => r.x + r.breite)) + 120;
    const links = Math.min(...alle.map((r) => r.x));
    if (x + breite - links <= REIHE_MAX) return { x, y: anker.y };
    const unten = Math.max(...alle.map((r) => r.y + r.hoehe)) + 200;
    return { x: links, y: unten };
  }

  function neuesBoard(f, { anker = seite(), html = '', ort } = {}) {
    const p = ort || platzDaneben(S.projekt.seiten[S.projekt.seiten.length - 1].y > anker.y ? S.projekt.seiten[S.projekt.seiten.length - 1] : anker, f.breite);
    const b = { id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: f.name, format: f.id, mass: f.mass, breite: f.breite, hoehe: f.hoehe, x: p.x, y: p.y, html, verlauf: [], stand: -1 };
    S.projekt.seiten.push(b);
    return b;
  }

  function renderSeitenleiste() {
    const nav = app.querySelector('.seitenleiste');
    if (!nav || !S.projekt) return;
    const s = seite();
    const mehrere = S.projekt.seiten.length > 1;
    nav.innerHTML = `<span class="lbl" style="padding:0 0 2px 2px">Boards</span>
      <div class="seitenlaschen">${S.projekt.seiten.map((x) => `<button type="button" aria-current="${x.id === s.id}" data-aktion="seite" data-id="${x.id}" title="${esc(x.name)} – Doppelklick zum Umbenennen">${formatSymbol(x, 12)}<span>${esc(x.name)}</span>${mehrere ? `<span class="loesch" role="button" tabindex="-1" aria-label="Board löschen" data-aktion="board-weg" data-id="${x.id}">${sym('muell', 13)}</span>` : ''}</button>`).join('')}</div>
      <button type="button" class="btn btn-s btn-q" style="align-self:flex-start;color:#4a2f9a" data-aktion="board-dazu">${sym('plus', 14)} Board dazu</button>
      <button type="button" class="btn btn-s btn-q" style="align-self:flex-start;color:#4a2f9a" data-aktion="app-pruefung" ${s.html ? '' : 'disabled'}>${sym('haken', 14)} Selbstprüfung${s.pruefung?.offen?.length ? ` <span class="chip chip-gelb">${s.pruefung.offen.length}</span>` : ''}</button>
      <div class="fold" style="margin:14px 16px 10px 0"></div>
      <span class="lbl" style="padding:0 0 4px 2px">Ebenen · ${esc(s.name)}</span>
      <div class="ebenen">${S.ebenen.length ? S.ebenen.map((e) => `<button type="button" aria-current="${S.auswahl?.k === e.k}" data-aktion="ebene" data-k="${e.k}" style="padding-left:${8 + e.tiefe * 16}px">${sym(['button', 'a', 'input'].includes(e.tag) ? 'box' : /^h\d|p|label$/.test(e.tag) ? 'text' : ['ul', 'ol', 'nav', 'table'].includes(e.tag) ? 'liste' : 'box', 14)}<span>${esc(e.name)}</span></button>`).join('') : '<span class="leise" style="font-size:13px;padding:0 4px">Noch leer</span>'}</div>`;
  }

  // Overlays auf der Entwurfsleinwand: leer, denkt, fertig, Fehler
  function renderMitte() {
    const L = app.querySelector('.leinwand');
    if (!L || S.modus !== 'entwurf' || !S.projekt) return;
    L.querySelector('.mitte')?.remove();
    L.querySelector('.hinweisband')?.remove();
    const s = seite();
    const k = S.kranich;
    let html = '';
    if (k.zustand === 'denkt') {
      html = `<div class="hinweisband paper">${figur('arbeitend', 34)}<div style="display:flex;flex-direction:column;flex:1"><b class="h">${esc(k.titel || (k.anpassen ? `Ich falte ${k.anpassen.length} weitere Größen` : 'Kranich faltet …'))}</b><span class="leise bandmeldung" style="font-size:13px">${esc(k.meldung)}</span>${k.gesamt != null ? `<div class="gesamtbalken"><i style="width:${k.gesamt}%"></i></div>` : ''}</div>
        <button type="button" class="btn btn-s" data-aktion="abbrechen">${k.anpassen ? 'Anhalten' : 'Abbrechen'}</button></div>`;
    } else if (k.zustand === 'fehler') {
      html = `<div class="hinweisband paper fehler" role="alert">${figur('ruhend', 34)}<div style="display:flex;flex-direction:column"><b class="h">${esc(k.fehler?.nachricht || 'Kranich kommt gerade nicht an Claude ran')}</b>
        <span class="leise" style="font-size:13px">Dein Entwurf ist gespeichert, nichts geht verloren.${k.fehler?.details ? ` <span title="${esc(k.fehler.details)}" style="text-decoration:underline dotted">Was ist passiert?</span>` : ''}</span></div>
        <button type="button" class="btn btn-s btn-p" data-aktion="nochmal">Nochmal</button><button type="button" class="btn btn-s btn-q" data-aktion="fehler-weg" aria-label="Schließen">${sym('schliessen', 14)}</button></div>`;
    } else if (k.zustand === 'fertig' && k.variantenBereit) {
      html = `<div class="hinweisband paper">${figur('fertig', 34)}<div style="display:flex;flex-direction:column"><b class="h">3 Varianten bereit</b><span class="leise" style="font-size:13px">Ruhig, Mutig und Kompakt</span></div>
        <button type="button" class="btn btn-s btn-p" data-aktion="varianten-zeigen">Ansehen</button><button type="button" class="btn btn-s btn-q" data-aktion="fertig-weg">Später</button></div>`;
    } else if (!s.html && S.projekt.seiten.length === 1) {
      html = `<div class="mitte"><div class="paper leerkarte"><div class="leerbild vf">${figur('ruhend', 96)}</div><h2 class="h">Beschreib, was du willst</h2>
        <span class="leise">Schreib rechts an Kranich oder zieh ein Bild hier rein. Zum Beispiel:</span>
        <div class="vorschlaege">${['Login-Seite', 'Einstellungen', 'Startseite für eine App'].map((t) => `<button type="button" class="btn btn-s" data-aktion="vorschlag" data-text="${t}">${t}</button>`).join('')}<button type="button" class="btn btn-s" data-aktion="anhang">${sym('klammer', 14)} Aus einem Screenshot</button></div>
        <span class="hand" style="font-size:20px">ich warte hier ganz ruhig</span>${eselsohr(36, '#ffffff')}</div></div>`;
    }
    if (html) L.insertAdjacentHTML('beforeend', html);
  }

  // ---------- Kranich-Leiste ----------
  const KOPF = {
    bereit: ['ruhend', 'Bereit', 'chip-grau', 'na, was falten wir?'],
    denkt: ['arbeitend', 'Bei der Arbeit', 'chip-zart', 'einen Moment, ich falte'],
    fertig: ['fertig', 'Fertig', 'chip-gruen', 'tada – schau mal'],
    fehler: ['ruhend', 'Keine Verbindung', 'chip-rot', 'hm, da klemmt was'],
  };

  function renderLeiste() {
    const aside = app.querySelector('.kranichleiste');
    if (!aside || !S.projekt) return;
    const [haltung, chip, chipArt, hand] = KOPF[S.kranich.zustand] || KOPF.bereit;
    const verlaufAn = S.leisteLasche === 'verlauf';
    aside.innerHTML = `<div class="leistenlaschen" role="tablist"><button type="button" role="tab" aria-selected="${!verlaufAn}" data-aktion="leiste" data-lasche="kranich">Kranich</button><button type="button" role="tab" aria-selected="${verlaufAn}" data-aktion="leiste" data-lasche="verlauf">Verlauf</button></div>
      <div class="paper leistenblatt">
        ${S.modus === 'bild' ? '' : `<div class="figurkopf">${figur(haltung, 78)}<div class="txt"><span class="chip ${chipArt}">${chip}</span><span class="hand" style="font-size:20px">${hand}</span></div></div><div class="fold"></div>`}
        ${S.modus === 'bild' ? `<div class="figurkopf" style="gap:8px">${figur(haltung, 44)}<div class="txt" style="padding-bottom:4px"><span class="chip ${chipArt}">${chip}</span></div></div>` : ''}
        <div class="verlauf" aria-live="polite"></div>
        <div class="wunschfeld"></div>
      </div>`;
    renderVerlauf();
    renderWunschfeld();
  }

  function renderVerlauf() {
    const el = app.querySelector('.kranichleiste .verlauf');
    if (!el || !S.projekt) return;
    if (S.leisteLasche === 'verlauf') {
      if (S.modus === 'bild') {
        el.innerHTML = Bild.z.verlauf.map((v, i) => `<button type="button" class="btn btn-s ${i === Bild.z.stand ? 'btn-p' : ''}" style="justify-content:flex-start" data-aktion="bild-springe" data-i="${i}">Schritt ${i + 1} · ${esc(v.was)}</button>`).reverse().join('') || '<div class="leer-verlauf">Noch keine Schritte.</div>';
      } else {
        const s = seite();
        el.innerHTML = (s.verlauf || []).map((v, i) => `<button type="button" class="btn btn-s ${i === s.stand ? 'btn-p' : ''}" style="justify-content:flex-start;white-space:normal;text-align:left;height:auto;padding:6px 10px" data-aktion="entwurf-springe" data-i="${i}">${esc(H.wann(v.zeit))} · ${esc(v.was)}</button>`).reverse().join('') || '<div class="leer-verlauf">Noch keine Fassungen.</div>';
      }
      return;
    }
    const chat = S.projekt.chat.filter((c) => (c.modus || 'entwurf') === S.modus).slice(-30);
    if (!chat.length && S.kranich.zustand !== 'denkt') {
      el.innerHTML = `<div class="leer-verlauf"><span class="figurrund">${figur('ruhend', 56)}</span><b class="h">Noch nichts gefaltet</b><span>Dein erster Wunsch landet hier.${S.modus === 'bild' ? ' Zum Beispiel: „Hintergrund weg und auf 1080 × 1080“.' : ''}</span></div>`;
      return;
    }
    const fortschritt = S.kranich.zustand === 'denkt' && S.kranich.anpassen
      ? `<div class="blase-kr"><span class="ava">${figur('arbeitend', 30)}</span><div class="inhalt"><b>${esc(S.kranich.titel || `Ich falte „${seite().name}“ in ${S.kranich.anpassen.length} weitere Größen`)}</b><div class="fortschritt">${S.kranich.anpassen.map((j) => `<div class="zeile"><span class="txt"><b class="h">${esc(j.format.name)}</b><span>${esc(j.notiz || j.format.mass || `${j.format.breite} × ${j.format.hoehe}`)}</span></span><span class="chip ${{ wartet: 'chip-grau', laeuft: 'chip-zart', repariert: 'chip-gelb', fertig: 'chip-gruen', fehler: 'chip-rot' }[j.zustand]}" data-job="${esc(j.board?.id || '')}">${j.zustand === 'laeuft' && j.prozent != null ? `${j.prozent} %` : { wartet: 'Wartet', laeuft: 'Läuft', repariert: 'Repariert', fertig: 'Fertig', fehler: 'Fehler' }[j.zustand]}</span></div>`).join('')}</div>
        <div class="reihe"><span class="leise" style="flex:1">${esc(S.kranich.meldung)}</span><button type="button" class="btn btn-s" data-aktion="abbrechen">Anhalten</button></div></div></div>` : '';
    el.innerHTML = chat.map((c, i) => {
      if (c.wer === 'ich') return `<div class="blase-ich">${esc(c.text)}</div>`;
      const letzte = i === chat.length - 1;
      const haltung = c.fehler ? 'ruhend' : 'fertig';
      return `<div class="blase-kr ${c.fehler ? 'fehler' : ''}"><span class="ava">${figur(haltung, 30)}</span><div class="inhalt">
        ${c.fehler ? `<span class="titelz">${esc(c.titel || 'Keine Verbindung zu Claude')}</span>` : ''}<span>${esc(c.text)}</span>
        ${c.chips?.length ? `<div class="chips">${c.chips.map((t) => `<span class="chip chip-gruen">${sym('haken', 13)}${esc(t)}</span>`).join('')}</div>` : ''}
        ${letzte && c.fehler ? '<div class="reihe"><button type="button" class="btn btn-s" data-aktion="nochmal">Nochmal</button></div>' : ''}
        ${letzte && !c.fehler && c.rueckgaengig ? `<div class="reihe"><button type="button" class="btn btn-s" data-aktion="rueckgaengig">${sym('zurueck', 14)} Rückgängig</button>${c.varianten ? '<button type="button" class="btn btn-s" data-aktion="varianten-zeigen">Varianten ansehen</button>' : ''}</div>` : ''}
      </div></div>`;
    }).join('') + fortschritt + (S.kranich.zustand === 'denkt' && !S.kranich.anpassen ? `<div class="blase-kr"><span class="ava">${figur('arbeitend', 30)}</span><div class="inhalt"><div class="reihe" style="gap:10px"><span class="punkte" aria-hidden="true"><i></i><i></i><i></i></span><span class="leise">${esc(S.kranich.meldung || 'Ich falte …')}</span></div></div></div>` : '');
    el.scrollTop = el.scrollHeight;
  }

  function renderWunschfeld() {
    const el = app.querySelector('.kranichleiste .wunschfeld');
    if (!el || !S.projekt) return;
    const alt = el.querySelector('textarea')?.value || '';
    const auswahlChip = S.modus === 'entwurf' && S.auswahl
      ? `<span class="chip chip-zart" style="align-self:flex-start">Auswahl: ${esc(S.auswahl.name)}<button type="button" style="border:0;background:transparent;color:inherit;font:inherit;padding:0 0 0 4px" data-aktion="auswahl-weg">Entfernen</button></span>`
      : S.modus === 'bild' && Bild.z.auswahl ? '<span class="chip chip-zart" style="align-self:flex-start">Auswahl im Bild wird mitgeschickt</span>' : '';
    const denkt = S.kranich.zustand === 'denkt';
    el.innerHTML = `<label for="wunsch" class="lbl">Dein Wunsch an Kranich</label>${auswahlChip}
      ${S.anhang && S.modus === 'entwurf' ? `<span class="anhang"><img src="${S.anhang.dataUrl}" alt=""><span class="leise" style="font-size:12.5px">${esc(S.anhang.name)} – wird zum Entwurf</span><button type="button" class="btn btn-s btn-q" data-aktion="anhang-weg">Entfernen</button></span>` : ''}
      <textarea id="wunsch" rows="2" placeholder="${S.modus === 'bild' ? 'z. B. „Hintergrund weg und auf 1080 × 1080“' : 'z. B. „Mach den Hintergrund heller“'}"></textarea>
      <div style="display:flex;align-items:center;gap:4px">
        <button type="button" class="btn btn-s btn-q" data-aktion="${S.modus === 'bild' ? 'bild-einfuegen' : 'anhang'}">${sym('klammer', 15)} Bild</button>
        <button type="button" class="btn btn-s btn-q" disabled title="Sprechen kommt noch" aria-label="Sprechen (kommt noch)">${sym('mikro', 15)}</button>
        <div class="platz"></div>
        <button type="button" class="btn btn-s btn-p" data-aktion="senden" ${denkt ? 'disabled' : ''}>${sym('senden', 15, 2.4)} Senden</button></div>`;
    const ta = el.querySelector('textarea');
    ta.value = alt;
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aktionen.senden(); } });
  }

  function setzeKranich(zustand, extra = {}) {
    Object.assign(S.kranich, { zustand, ...extra });
    if (S.ansicht !== 'werkbank') return;
    const kopf = app.querySelector('.kranichleiste');
    if (kopf) renderLeiste();
    renderMitte();
  }

  function chat(eintrag) {
    S.projekt.chat.push({ zeit: new Date().toISOString(), modus: S.modus, ...eintrag });
    if (S.projekt.chat.length > 200) S.projekt.chat = S.projekt.chat.slice(-200);
  }

  // ---------- Entwurf: Aufträge ----------
  function neueFassung(html, was) {
    const s = seite();
    s.verlauf = (s.verlauf || []).slice(0, (s.stand ?? -1) + 1);
    s.verlauf.push({ html, was, zeit: new Date().toISOString() });
    if (s.verlauf.length > 20) s.verlauf.shift();
    s.stand = s.verlauf.length - 1;
    s.html = html;
  }

  // Selbstprüfung: Entwurf nachmessen und gefundene Fehler einmal reparieren lassen.
  async function pruefeUndRepariere(board, html, nr, { status = true, phase = () => {} } = {}) {
    const format = { id: board.format, breite: board.breite, hoehe: board.hoehe, druck: Boolean((S.formate.find((f) => f.id === board.format) || {}).druck) };
    phase('pruefen');
    if (status) Entwurf.setzeStatus(board.id, 'pruefen');
    const p = await K.app.pruefen({ html, format });
    if (nr !== auftragNr || p?.fehler) return { html, gefunden: [], offen: [], repariert: false };
    if (!p.funde?.length) { board.pruefung = { gefunden: [], offen: [], zeit: new Date().toISOString() }; return { html, gefunden: [], offen: [], repariert: false }; }
    phase('repariert');
    if (status) Entwurf.setzeStatus(board.id, 'repariert');
    const r = await K.app.reparieren({ html, probleme: p.funde, breite: board.breite, hoehe: board.hoehe });
    if (nr !== auftragNr || r?.fehler) { board.pruefung = { gefunden: p.funde, offen: p.funde, zeit: new Date().toISOString() }; return { html, gefunden: p.funde, offen: p.funde, repariert: false }; }
    const nach = await K.app.pruefen({ html: r.html, format });
    const offen = nach?.funde || [];
    board.pruefung = { gefunden: p.funde, offen, zeit: new Date().toISOString() };
    return { html: r.html, gefunden: p.funde, offen, repariert: true };
  }

  function pruefBericht(pr) {
    if (!pr.gefunden.length) return 'Selbstprüfung ohne Befund';
    const rep = pr.repariert ? pr.gefunden.length - (pr.offen?.length || 0) : 0;
    const offen = pr.repariert ? (pr.offen?.length || 0) : pr.gefunden.length;
    return `Selbstprüfung: ${[rep ? `${rep} repariert` : '', offen ? `${offen} offen` : ''].filter(Boolean).join(', ')}`;
  }

  let auftragNr = 0;
  async function sendeEntwurf(wunsch, { auswahl = S.auswahl, app: appName } = {}) {
    const s = seite();
    if (auswahl && auswahl.board && auswahl.board !== s.id) auswahl = null;
    const anhang = S.anhang;
    if (!wunsch && !anhang) return;
    const nr = ++auftragNr;
    S.kranich.letzter = { art: 'entwurf', wunsch, auswahl, anhang, app: appName };
    if (wunsch || anhang) chat({ wer: 'ich', text: wunsch || `Bild „${anhang.name}“ als Entwurf` });
    S.anhang = null;
    const schritte = [
      { t: auswahl ? `Auftrag für „${auswahl.name}“ verstanden` : 'Auftrag verstanden', z: 'fertig' },
      { t: anhang ? 'Claude liest das Bild und faltet' : 'Claude faltet den Entwurf', z: 'laeuft' },
      { t: 'Entwurf prüfen und einsetzen', z: 'offen' },
    ];
    setzeKranich('denkt', { schritte, meldung: auswahl ? `Ich falte „${auswahl.name}“ neu …` : `${s.name} · ${s.mass || `${s.breite} × ${s.hoehe}`}`, variantenBereit: false, anpassen: null });
    renderKopfKnoepfe();
    Entwurf.setzeStatus(s.id, 'laeuft');
    const r = await K.entwurf({ wunsch, html: anhang ? '' : s.html, auswahl: anhang ? null : auswahl, breite: s.breite, hoehe: s.hoehe, bild: anhang?.dataUrl, app: appName, format: s.format });
    if (nr !== auftragNr) return; // abgebrochen
    let pr = { gefunden: [], repariert: false };
    if (!r?.fehler) {
      S.kranich.meldung = 'Prüfe mich selbst …'; renderMitte();
      pr = await pruefeUndRepariere(s, r.html, nr);
      if (nr !== auftragNr) return;
      r.html = pr.html;
    }
    Entwurf.setzeStatus(s.id, r?.fehler ? null : 'fertig');
    if (r?.fehler) {
      chat({ wer: 'kranich', fehler: true, titel: r.fehler.art === 'nicht-installiert' || r.fehler.art === 'nicht-angemeldet' ? 'Claude ist nicht bereit' : 'Keine Verbindung zu Claude', text: `${r.fehler.nachricht} Dein Wunsch ist gemerkt. Ich versuch es, sobald du „Nochmal“ drückst.` });
      setzeKranich('fehler', { fehler: r.fehler });
      geaendert({ vorschau: false });
      return;
    }
    neueFassung(r.html, anhang ? `Aus Bild: ${anhang.name}` : wunsch);
    const chips = [];
    if (auswahl) chips.push(auswahl.name);
    if (r.weg === 'lokal') chips.push('mit dem Modell auf deinem PC');
    chips.push(pruefBericht(pr));
    chat({ wer: 'kranich', text: r.notiz || 'Fertig, schau mal.', chips, rueckgaengig: true });
    setzeKranich('fertig', { fehler: null });
    Entwurf.zeigeAlle(S.projekt.seiten, seite().id);
    renderSeitenleiste(); renderKopfKnoepfe();
    S.variantenWunsch = wunsch;
    geaendert();
  }

  // „Alle Größen“: neue Boards anlegen und nacheinander falten.
  async function falteGroessen(quelle, { formate, texteAnpassen, daneben }) {
    const nr = ++auftragNr;
    let ort = null;
    if (!daneben) {
      const unten = Math.max(...S.projekt.seiten.map((x) => x.y + x.hoehe)) + 200;
      ort = { x: quelle.x, y: unten };
    }
    const jobs = formate.map((f) => {
      const b = neuesBoard(f, { anker: quelle, ort: ort ? { ...ort } : null });
      if (ort) ort.x += f.breite + 120;
      return { board: b, format: f, zustand: 'wartet' };
    });
    chat({ wer: 'ich', text: `Mach daraus auch ${formate.map((f) => f.name).join(', ')}` });
    setzeKranich('denkt', { anpassen: jobs, meldung: `0 von ${jobs.length}` });
    zeigeBoards();
    for (const j of jobs) Entwurf.setzeStatus(j.board.id, 'wartet');
    Entwurf.einpassen();
    geaendert({ vorschau: false });
    let fertig = 0;
    for (const j of jobs) {
      if (nr !== auftragNr) return;
      j.zustand = 'laeuft';
      Entwurf.setzeStatus(j.board.id, 'laeuft');
      renderVerlauf();
      const von = { name: quelle.name, breite: quelle.breite, hoehe: quelle.hoehe };
      const r = await K.anpassen({ html: quelle.html, von, nach: j.format, texteAnpassen });
      if (nr !== auftragNr) return;
      if (r?.fehler) {
        j.zustand = 'fehler'; j.fehler = r.fehler.nachricht;
        Entwurf.setzeStatus(j.board.id, 'fehler');
      } else {
        const pr = await pruefeUndRepariere(j.board, r.html, nr);
        if (nr !== auftragNr) return;
        r.html = pr.html; j.pruefung = pruefBericht(pr);
        j.zustand = 'fertig'; fertig++;
        j.board.verlauf = [{ html: r.html, was: `Aus „${quelle.name}“ gefaltet`, zeit: new Date().toISOString() }];
        j.board.stand = 0; j.board.html = r.html;
        Entwurf.zeigeAlle(S.projekt.seiten, seite().id);
        Entwurf.setzeStatus(j.board.id, 'fertig');
      }
      S.kranich.meldung = `${fertig} von ${jobs.length}`;
      renderVerlauf(); renderMitte();
      geaendert({ vorschau: false });
    }
    const schief = jobs.filter((j) => j.zustand === 'fehler');
    chat({ wer: 'kranich', fehler: schief.length === jobs.length, titel: 'Das hat nicht geklappt', text: schief.length ? `${fertig} von ${jobs.length} Größen sind fertig. Nicht geklappt: ${schief.map((j) => j.format.name).join(', ')} (${schief[0].fehler})` : `Fertig: ${jobs.length} weitere Größen, alle aus „${quelle.name}“.`, chips: jobs.filter((j) => j.zustand === 'fertig').map((j) => j.format.name) });
    setzeKranich(schief.length === jobs.length ? 'fehler' : 'fertig', { anpassen: null, fehler: schief.length === jobs.length ? { nachricht: schief[0].fehler } : null });
    renderSeitenleiste(); renderKopfKnoepfe();
    geaendert();
  }

  async function holeVarianten(wunsch) {
    const s = seite();
    S.variantenLaeuft = true;
    S.varianten = null; S.mischen.clear();
    S.variantenWunsch = wunsch || S.variantenWunsch || 'Mach es schöner';
    if (S.ansicht === 'varianten') renderVarianten();
    const r = await K.varianten({ html: s.html, wunsch: S.variantenWunsch, breite: s.breite, hoehe: s.hoehe });
    S.variantenLaeuft = false;
    if (r?.fehler) {
      S.varianten = null;
      H.meldung(r.fehler.nachricht, { art: 'fehler', knopf: 'Nochmal', aktion: () => holeVarianten(S.variantenWunsch) });
    } else {
      S.varianten = r.varianten;
    }
    if (S.ansicht === 'varianten') renderVarianten();
    else if (S.varianten) setzeKranich('fertig', { variantenBereit: true });
  }

  // ---------- Varianten-Ansicht ----------
  function renderVarianten() {
    S.ansicht = 'varianten';
    const s = seite();
    const v = S.varianten;
    const karten = (v || [null, null, null]).map((x, i) => {
      const name = x?.name || ['Ruhig', 'Mutig', 'Kompakt'][i];
      if (!x) return `<div class="variante"><span class="h" style="font-weight:800;font-size:18px">${name}</span><div class="card cardw"><div class="rahmen" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px">${S.variantenLaeuft ? `<div class="faltblatt"></div><span class="leise">Kranich faltet „${name}“ …</span>` : '<span class="leise">Noch nicht gefaltet</span>'}</div></div></div>`;
      if (x.fehler) return `<div class="variante"><span class="h" style="font-weight:800;font-size:18px">${name}</span><div class="card cardw"><div class="rahmen" style="display:flex;align-items:center;justify-content:center;padding:20px;text-align:center"><span class="leise">Diese Variante hat nicht geklappt: ${esc(x.fehler.nachricht)}</span></div></div></div>`;
      const gew = S.mischen.has(i);
      return `<div class="variante ${gew ? 'gewaehlt' : ''}"><span class="h" style="font-weight:800;font-size:18px">${esc(name)}</span>
        <div class="card cardw"><div class="rahmen" data-i="${i}"><iframe sandbox="allow-same-origin" title="Variante ${esc(name)}" style="width:${s.breite}px;height:${s.hoehe}px"></iframe></div>
        <span class="leise" style="font-size:13px">${esc(x.notiz || x.hinweis)}</span>
        <div class="vfuss"><button type="button" class="btn btn-s ${gew ? '' : 'btn-q'}" aria-pressed="${gew}" data-aktion="mischen-waehlen" data-i="${i}">${gew ? sym('haken', 14) : ''} Zum Mischen wählen</button><div class="platz"></div><button type="button" class="btn btn-s btn-p" data-aktion="variante-nehmen" data-i="${i}">Nehmen</button></div></div></div>`;
    }).join('');
    app.innerHTML = `<section class="ansicht">${kopfHtml(`<button type="button" class="btn btn-q" data-aktion="zur-werkbank">${sym('zurueck', 16)} Zurück zur Werkbank</button><button type="button" class="btn btn-p" data-aktion="exportieren">${sym('export', 16)} Exportieren</button>`)}
      <section class="paper variantenblatt">
        <div class="variantenkopf">${figur(S.variantenLaeuft ? 'arbeitend' : 'fertig', 60)}<div style="display:flex;flex-direction:column"><h1 class="h">3 Varianten für „${esc(s.name)}“</h1><span class="hand" style="font-size:21px">nimm eine – oder misch dir was zusammen</span></div><div class="platz"></div><span class="chip chip-grau">Aus: „${esc(S.variantenWunsch)}“</span></div>
        <div class="variantenreihe">${karten}</div>
        <div class="variantenfuss"><button type="button" class="btn btn-p" data-aktion="mischen" ${S.mischen.size >= 2 ? '' : 'disabled'}>${sym('mischen', 16)} Mischen (${S.mischen.size} gewählt)</button>
          <span class="leise" style="flex:1;font-size:13px">Wähl zwei oder drei Karten und sag Kranich unten, was woher kommen soll, z. B. Kopfzeile aus „Mutig“ und Liste aus „Ruhig“.</span>
          <input class="feld" id="mischwunsch" placeholder="Was woher?" style="width:260px">
          <button type="button" class="btn btn-q" data-aktion="zur-werkbank">Alle verwerfen</button>
          <button type="button" class="btn" data-aktion="noch-drei" ${S.variantenLaeuft ? 'disabled' : ''}>Noch drei</button></div>
        ${eselsohr(54)}</section></section>`;
    zeigeSpeicherchip();
    app.querySelectorAll('.variante .rahmen[data-i]').forEach((r) => {
      const x = v[Number(r.dataset.i)];
      const f = r.querySelector('iframe');
      const passe = () => { const z = Math.min(r.clientWidth / s.breite, r.clientHeight / s.hoehe); f.style.transform = `scale(${z})`; f.style.left = `${(r.clientWidth - s.breite * z) / 2}px`; };
      f.srcdoc = Entwurf.vorbereiten(x.html);
      new ResizeObserver(passe).observe(r);
      passe();
    });
  }

  // ---------- Bild: Seitenteile ----------
  const WERKZEUGE = [['verschieben', 'Verschieben'], ['zuschneiden', 'Zuschneiden'], ['pinsel', 'Pinsel'], ['radierer', 'Radierer'], ['auswahl', 'Auswahl'], ['text', 'Text'], ['freistellen', 'Freistellen'], ['farbe', 'Farbe']];

  function renderWerkzeuge() {
    const nav = app.querySelector('.werkzeuge');
    if (!nav) return;
    const z = Bild.z;
    nav.innerHTML = `<span class="lbl" style="align-self:flex-start;padding:0 0 2px">Werkzeuge</span>
      ${WERKZEUGE.map(([k, t]) => `<button type="button" aria-pressed="${z.werkzeug === k}" data-aktion="werkzeug" data-w="${k}" ${!Bild.hatBild() || z.laeuft ? 'disabled' : ''}>${sym(k, 20)}${t}</button>`).join('')}
      <label style="align-self:center;margin-top:8px;display:flex;flex-direction:column;align-items:center;gap:4px" class="lbl">Farbe<input type="color" class="farbknopf" id="bildfarbe" value="${z.farbe}"></label>`;
    nav.querySelector('#bildfarbe').addEventListener('input', (e) => Bild.setzeFarbe(e.target.value));
  }

  function renderWerkzeugOptionen() {
    const L = app.querySelector('.leinwand');
    if (!L || S.modus !== 'bild') return;
    L.querySelector('.werkzeugoptionen')?.remove();
    const z = Bild.z;
    let inhalt = '';
    if (z.laeuft) inhalt = `<span class="chip chip-zart"><span class="punkte"><i></i><i></i><i></i></span> ${esc(z.laeuft)}</span>`;
    else if (z.werkzeug === 'pinsel' || z.werkzeug === 'radierer') inhalt = `<span class="lbl">Größe</span><input type="range" min="2" max="200" value="${z.pinsel}" id="pinselgroesse"><b class="h">${z.pinsel} px</b>`;
    else if (z.werkzeug === 'zuschneiden') inhalt = z.zuschnitt ? `<span>${Math.round(z.zuschnitt.b)} × ${Math.round(z.zuschnitt.h)}</span><button type="button" class="btn btn-s btn-p" data-aktion="zuschnitt-an">Zuschneiden</button><button type="button" class="btn btn-s btn-q" data-aktion="zuschnitt-weg">Abbrechen</button>` : '<span class="leise">Rahmen über das Bild ziehen</span>';
    else if (z.werkzeug === 'auswahl') inhalt = z.auswahl ? `<button type="button" class="btn btn-s" data-aktion="auswahl-ebene">In neue Ebene</button><button type="button" class="btn btn-s" data-aktion="auswahl-loeschen">Inhalt löschen</button><button type="button" class="btn btn-s btn-q" data-aktion="auswahl-aufheben">Aufheben</button>` : '<span class="leise">Bereich aufziehen – Kranich bekommt ihn mit</span>';
    else if (z.werkzeug === 'text') inhalt = `<span class="leise">Ins Bild klicken</span><span class="lbl">Größe</span><input type="range" min="12" max="300" value="${z.textGroesse}" id="textgroesse"><b class="h">${z.textGroesse} px</b>`;
    else if (z.werkzeug === 'farbe') inhalt = '<span class="leise">Ins Bild klicken, um eine Farbe aufzunehmen</span>';
    else if (z.werkzeug === 'verschieben') inhalt = '<span class="leise">Aktive Ebene ziehen</span>';
    if (!inhalt || !Bild.hatBild()) return;
    L.insertAdjacentHTML('beforeend', `<div class="werkzeugoptionen paper">${inhalt}</div>`);
    L.querySelector('#pinselgroesse')?.addEventListener('input', (e) => { Bild.setzePinsel(Number(e.target.value)); e.target.nextElementSibling.textContent = `${e.target.value} px`; });
    L.querySelector('#textgroesse')?.addEventListener('input', (e) => { Bild.setzeTextGroesse(Number(e.target.value)); e.target.nextElementSibling.textContent = `${e.target.value} px`; });
  }

  function renderRegler() {
    const el = app.querySelector('#regler');
    if (!el) return;
    const z = Bild.z;
    const a = z.anpassung;
    const r = (k, t) => `<label class="regler"><span>${t}</span><input type="range" min="-100" max="100" value="${a[k]}" data-regler="${k}" ${Bild.hatBild() ? '' : 'disabled'}><b class="h">${a[k] > 0 ? '+' : ''}${a[k]}</b></label>`;
    el.innerHTML = `<div class="reihe"><span class="lbl">Anpassen</span><div class="platz"></div><button type="button" class="btn btn-s btn-q" data-aktion="regler-zurueck" ${Bild.hatBild() ? '' : 'disabled'}>Zurücksetzen</button></div>
      ${r('hell', 'Helligkeit')}${r('kontrast', 'Kontrast')}${r('waerme', 'Wärme')}${r('saett', 'Sättigung')}
      <div class="fold" style="margin:4px 0"></div>
      <div class="reihe"><span class="lbl">Ebenen</span><div class="platz"></div><button type="button" class="btn btn-s btn-q" data-aktion="ebene-neu" ${Bild.hatBild() ? '' : 'disabled'}>${sym('plus', 14)} Neue Ebene</button></div>
      <div class="ebenenbild">${[...z.ebenen].reverse().map((e) => `<div class="zeile" aria-current="${e.id === z.aktiv}"><img src="${Bild.ebeneVorschau(e)}" alt=""><button type="button" class="n" data-aktion="bebene" data-id="${e.id}">${esc(e.name)}</button>
        <button type="button" class="btn btn-s btn-q" data-aktion="bebene-auge" data-id="${e.id}" aria-label="${e.sichtbar ? 'Verstecken' : 'Zeigen'}" style="${e.sichtbar ? '' : 'opacity:.4'}">${sym('auge', 14)}</button>
        ${z.ebenen.length > 1 ? `<button type="button" class="btn btn-s btn-q" data-aktion="bebene-weg" data-id="${e.id}" aria-label="Ebene löschen">${sym('muell', 14)}</button>` : ''}</div>`).join('') || '<span class="leise" style="font-size:13px">Noch kein Bild</span>'}</div>`;
    el.querySelectorAll('[data-regler]').forEach((inp) => {
      inp.addEventListener('input', () => { Bild.regler(inp.dataset.regler, Number(inp.value), false); inp.nextElementSibling.textContent = `${inp.value > 0 ? '+' : ''}${inp.value}`; });
      inp.addEventListener('change', () => Bild.regler(inp.dataset.regler, Number(inp.value), true));
    });
  }

  function renderSchrittband() {
    const L = app.querySelector('.leinwand');
    if (!L || S.modus !== 'bild') return;
    L.querySelector('.schrittband')?.remove();
    const z = Bild.z;
    if (!z.verlauf.length) return;
    L.insertAdjacentHTML('beforeend', `<div class="schrittband" aria-label="Verlauf">${z.verlauf.map((v, i) => `<button type="button" aria-current="${i === z.stand}" class="${i > z.stand ? 'zukunft' : ''}" data-aktion="bild-springe" data-i="${i}"><span class="lbl">Schritt ${i + 1}</span><span>${esc(v.was)}</span></button>`).join('')}</div>`);
    const band = L.querySelector('.schrittband');
    band.scrollLeft = band.scrollWidth;
  }

  function renderBildLeer() {
    const L = app.querySelector('.leinwand');
    L.insertAdjacentHTML('beforeend', `<div class="mitte"><div class="paper leerkarte"><div class="leerbild vf"><span style="width:70px;height:64px;background:#4a2f9a;border-radius:5px 5px 18px 18px;position:relative;z-index:1"></span></div><h2 class="h">Welches Bild bearbeiten wir?</h2>
      <span class="leise">Zieh ein Bild hier rein oder wähl eins aus.</span>
      <button type="button" class="btn btn-p" data-aktion="bild-einfuegen">${sym('ordner', 16)} Bild wählen</button>${eselsohr(36, '#ffffff')}</div></div>`);
  }

  async function sendeBild(wunsch) {
    if (!Bild.hatBild()) { H.meldung('Erst ein Bild öffnen.', { art: 'fehler' }); return; }
    const z = Bild.z;
    const nr = ++auftragNr;
    S.kranich.letzter = { art: 'bild', wunsch };
    chat({ wer: 'ich', text: wunsch });
    setzeKranich('denkt', { meldung: 'Ich schau mir das Bild an …' });
    const r = await K.bildPlan({ wunsch, vorschau: Bild.vorschau(1024), breite: z.breite, hoehe: z.hoehe, auswahl: Bild.auswahlProzent() });
    if (nr !== auftragNr) return;
    if (r?.fehler) {
      chat({ wer: 'kranich', fehler: true, titel: 'Das hat nicht geklappt', text: `${r.fehler.nachricht} Drück „Nochmal“, wenn du es noch mal versuchen willst.` });
      setzeKranich('fehler', { fehler: r.fehler });
      geaendert({ vorschau: false });
      return;
    }
    S.kranich.meldung = r.notiz || 'Mach ich.';
    renderVerlauf();
    const erledigt = [];
    for (let i = 0; i < r.schritte.length; i++) {
      S.kranich.meldung = `${r.beschreibung[i]} …`;
      renderVerlauf();
      await Bild.fuehreAus(r.schritte[i]);
      erledigt.push(r.beschreibung[i]);
    }
    Bild.merke(wunsch.length > 34 ? `${wunsch.slice(0, 32)}…` : wunsch);
    chat({ wer: 'kranich', text: r.notiz || 'Fertig.', chips: erledigt, rueckgaengig: true });
    setzeKranich('fertig');
    renderRegler(); renderWerkzeuge(); renderKopfKnoepfe();
    geaendert();
  }

  // ---------- Dateien ablegen ----------
  async function beimAblegen(e) {
    e.preventDefault();
    const datei = [...(e.dataTransfer?.files || [])].find((f) => f.type.startsWith('image/'));
    if (!datei) return;
    const dataUrl = await H.dateiAlsDataUrl(datei);
    if (S.modus === 'bild') {
      if (!Bild.hatBild()) S.projekt.name = datei.name.replace(/\.[^.]+$/, '');
      await Bild.oeffneBild(dataUrl, datei.name);
      renderWerkbank();
      geaendert();
    } else {
      S.anhang = { name: datei.name, dataUrl };
      renderWunschfeld();
      H.meldung('Bild angehängt. Schreib dazu, was Kranich daraus machen soll, und drück Senden.');
    }
  }

  // ---------- Aktionen ----------
  const aktionen = {
    'lasche': (el) => { S.startLasche = el.dataset.lasche; renderStart(); },
    'neu': (el) => {
      if (el.dataset.art === 'entwurf') { S.startLasche = 'neu'; renderStart(); return; }
      if (el.dataset.art === 'app') { S.startLasche = 'app'; renderStart(); return; }
      if (el.dataset.art === 'ausbild') return aktionen.anhang(null, { danach: (b) => neuesProjekt('entwurf', { anhang: b }) });
      return neuesProjekt(el.dataset.art);
    },
    'format-waehlen': (el) => { S.neuFormat = el.dataset.id; const w = document.getElementById('startwunsch')?.value; renderStart(); if (w) document.getElementById('startwunsch').value = w; },
    'einheit': (el) => { S.eigenEinheit = el.dataset.e; const b = document.getElementById('eigen-b').value, h = document.getElementById('eigen-h').value; renderStart(); document.getElementById('eigen-b').value = b; document.getElementById('eigen-h').value = h; },
    'eigen-anlegen': async () => {
      const f = await K.formate.eigen(document.getElementById('eigen-b').value, document.getElementById('eigen-h').value, S.eigenEinheit || 'px');
      if (f?.fehler) { H.meldung(f.fehler.nachricht, { art: 'fehler' }); return; }
      const wunsch = document.getElementById('startwunsch')?.value.trim();
      return neuesProjekt('entwurf', { format: f, wunsch, anhang: S.anhang });
    },
    'leer-anlegen': () => neuesProjekt('entwurf', { format: S.formate.find((x) => x.id === (S.neuFormat || 'web')) }),
    'start-falten': () => {
      const wunsch = document.getElementById('startwunsch')?.value.trim();
      const anhang = S.anhang;
      if (!wunsch && !anhang) { document.getElementById('startwunsch')?.focus(); return; }
      S.anhang = null;
      const format = S.startLasche === 'neu' ? S.formate.find((x) => x.id === (S.neuFormat || 'web')) : undefined;
      return neuesProjekt('entwurf', { wunsch, anhang, format });
    },
    'projekt-oeffnen': (el) => oeffne(el.dataset.id),
    'projekt-weg': async (el) => {
      const p = S.liste.find((x) => x.id === el.dataset.id);
      if (!p || !window.confirm(`„${p.name}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return;
      await K.projekte.loeschen(p.id);
      zeigeStart();
    },
    'zum-start': async () => { await speichernSpaeter.sofort(); S.startLasche = 'start'; zeigeStart(); },
    'einstellungen': () => Dialoge.einstellungen(),
    'anhang': async (_el, { danach } = {}) => {
      const b = await K.datei.bildWaehlen();
      if (!b || b.fehler) { if (b?.fehler) H.meldung(b.fehler.nachricht, { art: 'fehler' }); return; }
      if (danach) return danach(b);
      S.anhang = b;
      if (S.ansicht === 'start') renderStart(); else renderWunschfeld();
    },
    'anhang-weg': () => { S.anhang = null; if (S.ansicht === 'start') renderStart(); else renderWunschfeld(); },
    'umbenennen': (el) => {
      const feld = document.createElement('input');
      feld.value = S.projekt.name;
      el.replaceWith(feld);
      feld.focus(); feld.select();
      const fertig = () => { const n = feld.value.trim(); if (n) S.projekt.name = n.slice(0, 80); geaendert({ vorschau: false }); if (S.ansicht === 'varianten') renderVarianten(); else renderWerkbank(); };
      feld.addEventListener('blur', fertig, { once: true });
      feld.addEventListener('keydown', (e) => { if (e.key === 'Enter') feld.blur(); if (e.key === 'Escape') { feld.value = S.projekt.name; feld.blur(); } });
    },
    'modus': (el) => { if (S.modus === el.dataset.modus && S.ansicht === 'werkbank') return; S.modus = el.dataset.modus; S.kranich.zustand = 'bereit'; renderWerkbank(); },
    'leiste': (el) => { S.leisteLasche = el.dataset.lasche; renderLeiste(); },
    'senden': () => {
      const ta = document.getElementById('wunsch');
      const wunsch = ta?.value.trim() || '';
      if (S.kranich.zustand === 'denkt') return;
      if (S.modus === 'bild') { if (!wunsch) return ta?.focus(); ta.value = ''; return sendeBild(wunsch); }
      if (!wunsch && !S.anhang) return ta?.focus();
      if (ta) ta.value = '';
      return sendeEntwurf(wunsch);
    },
    'nochmal': () => {
      const l = S.kranich.letzter;
      if (!l) return;
      S.projekt.chat.pop(); // Fehlermeldung
      S.projekt.chat.pop(); // eigener Wunsch kommt neu dazu
      if (l.art === 'bild') return sendeBild(l.wunsch);
      S.anhang = l.anhang;
      return sendeEntwurf(l.wunsch, { auswahl: l.auswahl, app: l.app });
    },
    'abbrechen': () => {
      auftragNr++;
      for (const x of S.projekt.seiten) Entwurf.setzeStatus(x.id, null);
      chat({ wer: 'kranich', text: S.kranich.anpassen ? 'Okay, angehalten. Was schon fertig war, bleibt liegen.' : 'Okay, abgebrochen.' });
      setzeKranich('bereit', { anpassen: null }); renderKopfKnoepfe(); geaendert();
    },
    'fehler-weg': () => setzeKranich('bereit'),
    'fertig-weg': () => setzeKranich('fertig', { variantenBereit: false }),
    'vorschlag': (el) => sendeEntwurf(el.dataset.text),
    'auswahl-weg': () => { Entwurf.waehle(null); },
    'ebene': (el) => Entwurf.waehle(el.dataset.k),
    'seite': (el, e) => {
      if (e?.target?.closest('[data-aktion="board-weg"]')) return;
      waehleBoard(el.dataset.id);
      Entwurf.zeigeBoard(el.dataset.id);
    },
    'board-weg': async (el) => {
      const b = S.projekt.seiten.find((x) => x.id === el.dataset.id);
      if (!b || S.projekt.seiten.length < 2) return;
      if (b.html && !window.confirm(`Board „${b.name}“ löschen?`)) return;
      S.projekt.seiten = S.projekt.seiten.filter((x) => x.id !== b.id);
      if (S.seiteId === b.id) S.seiteId = S.projekt.seiten[0].id;
      zeigeBoards(); renderKopfKnoepfe(); geaendert();
    },
    'board-dazu': async () => {
      const f = await Dialoge.formatWaehlen(S.formate, S.gruppen, formatKarten);
      if (!f) return;
      const b = neuesBoard(f);
      S.seiteId = b.id; S.auswahl = null;
      zeigeBoards(); renderKopfKnoepfe(); renderWunschfeld();
      Entwurf.zeigeBoard(b.id);
      geaendert({ vorschau: false });
      H.meldung(`${f.name} liegt auf der Leinwand. Schreib Kranich, was drauf soll, oder nimm „Alle Größen“ vom fertigen Board.`);
    },
    'alle-groessen': async () => {
      const quelle = seite();
      if (!quelle.html) return;
      const wahl = await Dialoge.alleGroessen({ quelle, formate: S.formate, vorhanden: S.projekt.seiten.map((x) => x.format) });
      if (!wahl) return;
      return falteGroessen(quelle, wahl);
    },
    'rueckgaengig': () => {
      if (S.modus === 'bild') { Bild.springe(Bild.z.stand - 1); return; }
      const s = seite();
      if (!s.stand) return;
      s.stand -= 1; s.html = s.verlauf[s.stand].html;
      Entwurf.zeigeAlle(S.projekt.seiten, seite().id);
      renderKopfKnoepfe(); renderVerlauf(); geaendert();
    },
    'entwurf-springe': (el) => {
      const s = seite(); const i = Number(el.dataset.i);
      s.stand = i; s.html = s.verlauf[i].html;
      Entwurf.zeigeAlle(S.projekt.seiten, seite().id);
      renderKopfKnoepfe(); renderVerlauf(); geaendert();
    },
    'zoom-minus': () => Entwurf.zoom(1 / 1.2), 'zoom-plus': () => Entwurf.zoom(1.2), 'zoom-einpassen': () => Entwurf.einpassen(),
    'schnell-groesser': () => sendeEntwurf('Mach das etwas größer.'),
    'schnell-farbe': () => {
      const f = document.createElement('input'); f.type = 'color'; f.value = '#7c5cd6';
      f.addEventListener('change', () => sendeEntwurf(`Färbe das in ${f.value}.`));
      f.click();
    },
    'schnell-origami': () => sendeEntwurf('Pass das an den Look von origami an (Hausfarbe von origami, Papier-Details der Familie).'),
    'schnell-frei': () => document.getElementById('wunsch')?.focus(),
    'varianten': async () => {
      const s = seite();
      if (!s.html && !S.variantenWunsch) { H.meldung('Schreib Kranich erst, was du willst – dann faltet er drei Richtungen.'); document.getElementById('wunsch')?.focus(); return; }
      const wunsch = document.getElementById('wunsch')?.value.trim();
      renderVarianten();
      if (!S.varianten || wunsch) { if (wunsch) document.getElementById('wunsch').value = ''; await holeVarianten(wunsch); }
    },
    'varianten-zeigen': () => { S.kranich.variantenBereit = false; renderVarianten(); },
    'noch-drei': () => holeVarianten(S.variantenWunsch),
    'zur-werkbank': () => renderWerkbank(),
    'mischen-waehlen': (el) => { const i = Number(el.dataset.i); if (S.mischen.has(i)) S.mischen.delete(i); else S.mischen.add(i); renderVarianten(); },
    'variante-nehmen': (el) => {
      const v = S.varianten[Number(el.dataset.i)];
      neueFassung(v.html, `Variante „${v.name}“`);
      chat({ wer: 'kranich', text: `„${v.name}“ liegt jetzt auf der Leinwand.`, rueckgaengig: true });
      S.kranich.zustand = 'fertig';
      renderWerkbank(); geaendert();
    },
    'mischen': async () => {
      const teile = [...S.mischen].map((i) => S.varianten[i]);
      const was = document.getElementById('mischwunsch')?.value.trim() || 'Nimm von jeder Variante das Stärkste.';
      const s = seite();
      const html = teile.map((t) => `<!-- Variante ${t.name} -->\n${t.html}`).join('\n\n');
      renderWerkbank();
      const alt = s.html;
      s.html = html; // als Ausgangspunkt für den Auftrag
      await sendeEntwurf(`Mische diese Varianten (${teile.map((t) => t.name).join(', ')}) zu EINEM Entwurf: ${was}`, { auswahl: null });
      if (s.html === html) s.html = alt; // Auftrag gescheitert: alten Stand behalten
    },
    'exportieren': () => Dialoge.exportieren({ projekt: S.projekt, modus: S.modus, seite: seite() }),
    // Bild
    'werkzeug': async (el) => {
      const w = el.dataset.w;
      if (w === 'freistellen') {
        const weg = await Bild.freistellen();
        if (weg) { Bild.merke('Freigestellt'); Bild.zeichne(); renderRegler(); H.meldung(weg === 'ki' ? 'Freigestellt mit der KI.' : 'Freigestellt nach Randfarbe (die KI war nicht erreichbar). Klappt am besten bei ruhigem Hintergrund.'); }
        return;
      }
      Bild.werkzeug(w); renderWerkzeuge(); renderWerkzeugOptionen();
    },
    'bild-einfuegen': async () => {
      const b = await K.datei.bildWaehlen();
      if (!b || b.fehler) return;
      if (!Bild.hatBild()) S.projekt.name = b.name.replace(/\.[^.]+$/, '');
      await Bild.oeffneBild(b.dataUrl, b.name);
      renderWerkbank(); geaendert();
    },
    'bild-springe': (el) => { Bild.springe(Number(el.dataset.i)); renderVerlauf(); },
    'bzoom-minus': () => Bild.zoom(1 / 1.2), 'bzoom-plus': () => Bild.zoom(1.2), 'bzoom-einpassen': () => Bild.zoom('einpassen'),
    'regler-zurueck': () => Bild.reglerZuruecksetzen(),
    'zuschnitt-an': () => { Bild.zuschnittAnwenden(); renderWerkzeugOptionen(); },
    'zuschnitt-weg': () => { Bild.zuschnittAbbrechen(); renderWerkzeugOptionen(); },
    'auswahl-ebene': () => { Bild.auswahlInEbene(); },
    'auswahl-loeschen': () => { Bild.auswahlLoeschen(); },
    'auswahl-aufheben': () => { Bild.auswahlAufheben(); renderWerkzeugOptionen(); renderWunschfeld(); },
    'ebene-neu': () => Bild.ebeneNeu(),
    'bebene': (el) => { Bild.ebeneWaehlen(el.dataset.id); renderRegler(); },
    'bebene-auge': (el) => Bild.ebeneSichtbar(el.dataset.id),
    'bebene-weg': (el) => Bild.ebeneLoeschen(el.dataset.id),
  };

  app.addEventListener('click', (e) => {
    const el = e.target.closest('[data-aktion]');
    if (!el || el.disabled) return;
    const fn = aktionen[el.dataset.aktion];
    if (fn) Promise.resolve(fn(el, e)).catch((f) => H.meldung(f.message || String(f), { art: 'fehler' }));
  });
  app.addEventListener('dblclick', (e) => {
    const el = e.target.closest('[data-aktion="seite"]');
    if (!el) return;
    const s = S.projekt.seiten.find((x) => x.id === el.dataset.id);
    const span = el.querySelector('span:not(.loesch):not(.formatsymbol)');
    const feld = document.createElement('input');
    feld.value = s.name; feld.style.width = '100%';
    span.replaceWith(feld); feld.focus(); feld.select();
    feld.addEventListener('blur', () => { s.name = feld.value.trim().slice(0, 40) || s.name; zeigeBoards(); geaendert({ vorschau: false }); }, { once: true });
    feld.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') feld.blur(); });
  });

  document.addEventListener('keydown', (e) => {
    if (S.ansicht !== 'werkbank') return;
    const tippt = /input|textarea/i.test(document.activeElement?.tagName || '');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !tippt) { e.preventDefault(); aktionen.rueckgaengig(); }
    if (S.modus === 'bild' && !tippt) {
      if (e.key === 'Enter' && Bild.z.zuschnitt) { aktionen['zuschnitt-an'](); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && Bild.z.auswahl) Bild.auswahlLoeschen();
      if (e.key === 'Escape') { Bild.zuschnittAbbrechen(); Bild.auswahlAufheben(); renderWerkzeugOptionen(); }
    }
    if (S.modus === 'entwurf' && e.key === 'Escape' && !tippt) Entwurf.waehle(null);
  });

  window.addEventListener('beforeunload', () => { speichernSpaeter.sofort(); });

  window.App = {
    zeigeStart, oeffne, neuesProjekt, aktionen, S, renderWerkbank, sendeEntwurf, sendeBild,
    renderStart, kopfHtml, seite, chat, setzeKranich, renderVerlauf, renderMitte, renderSeitenleiste, renderKopfKnoepfe,
    zeigeBoards, waehleBoard, geaendert, speichernSpaeter, pruefeUndRepariere, pruefBericht, formatSymbol,
    get auftragNr() { return auftragNr; }, neuerAuftrag: () => ++auftragNr,
  };

  (async () => {
    S.einstellungen = await K.einstellungen.lesen();
    const fl = await K.formate.liste();
    S.formate = fl.formate || []; S.gruppen = fl.gruppen || [];
    zeigeStart();
  })();
})();
