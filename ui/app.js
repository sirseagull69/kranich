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
    el.className = `speicherchip ${S.speichert ? 'speichert' : ''}`;
    el.textContent = S.speichert ? 'speichert …' : 'gespeichert';
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
    return `<button type="button" class="startkarte mehrkarte" data-aktion="neu" data-art="${art}"><div class="card">
      <div class="bildfeld vf">${bild}</div>
      <div class="mtxt"><span class="ktitel h">${titel}</span><span class="ktext">${text}</span></div>${sym('rechts', 18)}</div></button>`;
  }

  const ART = (p) => (p.art === 'bild' ? ['Bild', 'chip-gelb'] : p.app ? ['App', 'chip-gruen'] : ['Entwurf', 'chip-zart']);
  function projektKarte(p) {
    const url = S.vorschauen[p.id + p.geaendert];
    const [art, artChip] = ART(p);
    const info = p.art === 'bild' ? 'Bild' : p.boards > 1 ? `${p.boards} Boards` : [p.formatName, p.mass].filter(Boolean).join(' · ');
    return `<div class="projektkarte cardw"><button type="button" class="btn btn-s weg" data-aktion="projekt-weg" data-id="${p.id}" aria-label="Projekt löschen">${sym('muell', 14)}</button>
      <button type="button" class="pk-knopf" data-aktion="projekt-oeffnen" data-id="${p.id}"><div class="card">
      <div class="vorschau ${url ? 'mitbild' : 'vf'}" ${url ? `style="background-image:url('${url}')"` : ''}>${url ? '' : figur('ruhend', 44)}</div>
      <span class="pname h">${esc(p.name)}</span><span class="pinfo">${esc(info)}</span>
      <span class="pfuss"><span class="chip ${artChip}">${art}</span><span class="leise">${esc(H.wann(p.geaendert))}</span></span></div></button></div>`;
  }

  function gruss() {
    const h = new Date().getHours();
    const name = (S.einstellungen?.name || 'Nils').split(' ')[0];
    return `${h < 11 ? 'Guten Morgen' : h < 17 ? 'Hallo' : 'Guten Abend'}, ${name}`;
  }

  const PROBIER = ['Login-Seite für eine App', 'Post für die Bäckerei', 'Einladung zum 40.'];

  // Seitenkarte links (wie in origami): Marke, Neu, Suche, Listen, Status unten
  function seitenkarte(mitte) {
    const e = S.einstellungen || {};
    const hirn = e.weg === 'api' ? 'API-Schlüssel' : `Claude · ${e.claudeModell || 'opus'}`;
    return `<aside class="seitenkarte"><span class="klebe"></span>
      <button type="button" class="sk-marke" data-aktion="lasche" data-lasche="start">${figur(S.erstesMal === false ? 'ruhend' : 'landet', 38)}<span class="h">Kranich</span></button>
      <button type="button" class="sk-neu" data-aktion="neu" data-art="entwurf">${sym('plus', 16, 2.4)}<span>Neuer Entwurf</span><kbd>Strg N</kbd></button>
      <button type="button" class="sk-neu sk-pptx" data-aktion="pptx-neu">${sym('ordner', 16)}<span>PowerPoint öffnen</span></button>
      <label class="sk-suche">${sym('suche', 15)}<input id="psuche" placeholder="Entwürfe durchsuchen" aria-label="Entwürfe durchsuchen"></label>
      <div class="sk-mitte">${mitte}</div>
      <div class="sk-fuss"><span class="sk-status"><i></i><b>Bereit</b><small>${esc(hirn)}</small></span>
        <div class="reihe"><span class="avatar klein h">NP</span><span class="h" style="font-weight:700">Nils</span><div class="platz"></div>
        <button type="button" class="btn btn-q rundknopf" data-aktion="lasche" data-lasche="alle" title="Alle Entwürfe" aria-label="Alle Entwürfe">${sym('ordner', 17)}</button>
        <button type="button" class="btn btn-q rundknopf" data-aktion="einstellungen" title="Einstellungen" aria-label="Einstellungen">${sym('zahnrad', 17)}</button></div></div></aside>`;
  }

  function projektListe() {
    const q = (S.projektSuche || '').trim().toLowerCase();
    const liste = S.liste.filter((p) => !q || p.name.toLowerCase().includes(q));
    const heute = new Date().toDateString();
    const gruppen = [
      ['Heute', liste.filter((p) => new Date(p.geaendert).toDateString() === heute)],
      ['Früher', liste.filter((p) => new Date(p.geaendert).toDateString() !== heute)],
    ].filter(([, l]) => l.length);
    if (!gruppen.length) return `<span class="leise" style="padding:4px 8px;font-size:13.5px">${q ? 'Nichts gefunden.' : 'Noch keine Entwürfe.'}</span>`;
    return gruppen.map(([t, l]) => `<span class="sk-titel hand">${t}</span>${l.slice(0, 12).map((p) => `<button type="button" class="sk-zeile" data-aktion="projekt-oeffnen" data-id="${p.id}" title="${esc(p.name)}"><i class="punkt ${p.art === 'bild' ? 'gelb' : p.app ? 'gruen' : 'lila'}"></i><span>${esc(p.name)}</span><span class="loesch" role="button" tabindex="-1" title="Löschen" aria-label="Projekt löschen" data-aktion="projekt-weg-liste" data-id="${p.id}">${sym('muell', 13)}</span></button>`).join('')}`).join('');
  }

  function renderStart() {
    const l = S.startLasche;
    if (l === 'start') {
      const e = S.einstellungen || {};
      const hirn = e.weg === 'api' ? 'API' : e.weg === 'heim' ? `Heim-PC · ${e.claudeModell || 'opus'}` : `Claude · ${e.claudeModell || 'opus'}`;
      const KARTEN = [
        ['app', 'plant', 'Ganze App', 'Mit Plan, alle Bildschirme', '#ece6fd'],
        ['bild', 'bild', 'Bild bearbeiten', 'Freistellen, zuschneiden & Co.', '#f3eefe'],
        ['ausbild', 'webseite', 'Aus Bild', 'Screenshot rein, Entwurf raus', '#e9e3fb'],
        ['entwurf', 'folien', 'Leeres Blatt', 'Format wählen und loslegen', '#f5f1fd'],
        ['pptx', 'applaus', 'PowerPoint öffnen', 'Folien rein, bearbeiten, vortragen', '#efe9fd'],
      ];
      const IDEEN = [['Login-Seite für eine App', 'App-Bildschirm'], ['Post für die Bäckerei', 'Instagram-Post'], ['Einladung zum 40.', 'Karte A6'], ['Startseite für eine Fahrrad-App', 'Webseite']];
      const zuletzt = S.liste.slice(0, 6);
      app.innerHTML = `<section class="ansicht klar" id="start" data-lasche="start">
        <header class="kl-kopf"><button type="button" class="kl-marke" data-aktion="lasche" data-lasche="start">${figur(S.erstesMal === false ? 'ruhend' : 'landet', 34)}<b class="h">Kranich</b></button><div class="platz"></div>
          <span class="kl-status"><i></i>${esc(hirn)}</span>
          <button type="button" class="kl-rund" data-aktion="lasche" data-lasche="alle" title="Alle Entwürfe" aria-label="Alle Entwürfe">${sym('ordner', 18)}</button>
          <button type="button" class="kl-rund" data-aktion="einstellungen" title="Einstellungen" aria-label="Einstellungen">${sym('zahnrad', 18)}</button></header>
        <main class="kl-inhalt">
          <div class="kl-gruss"><span class="hand">${esc(gruss())} – na, was falten wir?</span><h1 class="h">Was soll heute entstehen?</h1></div>
          <div class="kl-eingabe">
            ${S.anhang ? `<span class="anhang"><img src="${S.anhang.dataUrl}" alt=""><span class="leise">${esc(S.anhang.name || 'Bild')} – wird zum Entwurf</span><button type="button" class="btn btn-s btn-q" data-aktion="anhang-weg">Entfernen</button></span>` : ''}
            <input id="startwunsch" placeholder="Ein Satz reicht, z. B. „Plakat für den Flohmarkt am Samstag“" aria-label="Was soll Kranich falten?">
            <div class="reihe"><span class="leise" style="font-size:13px">Kranich sucht das passende Format selbst aus.</span><div class="platz"></div>
              <button type="button" class="kl-los" data-aktion="start-falten">Falten ${sym('senden', 16, 2.4)}</button></div></div>
          <div class="kl-karten">${KARTEN.map(([art, anim, t, x, hell]) => `<button type="button" class="kl-karte" style="--hell:${hell}" data-aktion="${art === 'pptx' ? 'pptx-neu' : 'neu'}" data-art="${art}" data-anim="${anim}"><span class="kl-bild">${figur(anim, 104)}</span><b class="h">${t}</b><span class="leise">${x}</span></button>`).join('')}</div>
          <div class="kl-zeile2">
            <section class="kl-blatt"><h2 class="h">Zum Ausprobieren</h2>${IDEEN.map(([t, x]) => `<button type="button" class="kl-idee" data-aktion="probier" data-text="${esc(t)}"><span><b class="h">${esc(t)}</b><small>${esc(x)}</small></span>${sym('rechts', 16)}</button>`).join('')}</section>
            <section class="kl-blatt"><div class="reihe"><h2 class="h" style="flex:1">Zuletzt bearbeitet</h2>${S.liste.length > 6 ? '<button type="button" class="kl-leise" data-aktion="lasche" data-lasche="alle">Alle anzeigen</button>' : ''}</div>
              ${zuletzt.length ? zuletzt.map((p) => { const url = S.vorschauen[p.id + p.geaendert]; const info = p.art === 'bild' ? 'Bild' : p.app ? 'Ganze App' : p.boards > 1 ? `${p.boards} Boards` : [p.formatName, p.mass].filter(Boolean).join(' · '); return `<button type="button" class="kl-datei sk-zeile" data-aktion="projekt-oeffnen" data-id="${p.id}" title="${esc(p.name)}"><span class="kl-vor" ${url ? `style="background-image:url('${url}')"` : ''}></span><span class="kl-txt"><b class="h">${esc(p.name)}</b><small>${esc(info || 'Entwurf')}</small></span><span class="kl-wann">${esc(H.wann(p.geaendert))}</span><span class="loesch" role="button" tabindex="-1" title="Löschen" aria-label="Projekt löschen" data-aktion="projekt-weg-liste" data-id="${p.id}">${sym('muell', 15)}</span></button>`; }).join('') : `<div class="kl-leer">${figur('ruhend', 48)}<span class="leise">Noch nichts gefaltet. Schreib oben einfach los.</span></div>`}</section>
            <section class="kl-blatt kl-mitgebracht"><h2 class="h">PowerPoint mitgebracht?</h2>
              <button type="button" class="kl-ablage" data-aktion="pptx-neu"><b class="h">Datei hierher ziehen</b><small>.pptx oder ein Bild</small></button>
              <button type="button" class="kl-oeffnen" data-aktion="pptx-neu">${sym('ordner', 16)} Datei öffnen</button></section>
          </div>
        </main></section>`;
      S.erstesMal = false;
      setTimeout(() => { if (S.ansicht === 'start' && !document.querySelector('.schleier')) K.standFoto?.('kranich-start'); }, 2500);
      document.getElementById('startwunsch')?.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') aktionen['start-falten'](); });
      return;
    }
    let blatt, titel = '';
    if (l === 'app') {
      titel = 'Ganze App';
      blatt = `<section class="paper startblatt">${AppBau.renderAuftrag()}</section>`;
    } else if (l === 'alle') {
      titel = 'Entwurf öffnen';
      blatt = renderOeffnen();
    } else {
      titel = 'Format wählen';
      blatt = renderFormate();
    }
    app.innerHTML = `<section class="ansicht" id="start" data-lasche="${l}">
      <header class="kopf k-kopf"><button type="button" class="marke" data-aktion="lasche" data-lasche="start" title="Start">${figur('ruhend', 34)}<span class="h">Kranich</span></button>
        <span class="trenner"></span><span class="brot"><b class="h">${titel}</b></span>
        <div class="platz"></div>
        <button type="button" class="btn btn-q" data-aktion="lasche" data-lasche="start">${sym('links', 16)} Zurück</button>
        <button type="button" class="btn btn-q rundknopf" data-aktion="einstellungen" title="Einstellungen" aria-label="Einstellungen">${sym('zahnrad', 17)}</button>
        <span class="avatar h" aria-label="Angemeldet als Nils">NP</span></header>
      <div class="startkoerper ${l}">${blatt}</div></section>`;
    const suche = document.getElementById('fsuche');
    if (suche) {
      suche.value = S.formatSuche || '';
      suche.addEventListener('input', () => { S.formatSuche = suche.value; const pos = suche.selectionStart; renderStart(); const n = document.getElementById('fsuche'); n.focus(); n.setSelectionRange(pos, pos); });
    }
    const psuche = document.getElementById('psuche');
    if (psuche) {
      psuche.value = S.projektSuche || '';
      psuche.addEventListener('input', () => { S.projektSuche = psuche.value; const pos = psuche.selectionStart; renderStart(); const n = document.getElementById('psuche'); n.focus(); n.setSelectionRange(pos, pos); });
    }
  }

  // ---------- Öffnen ----------
  const ORDNER = [['zuletzt', 'Zuletzt geöffnet', 'uhr'], ['alle', 'Alle Entwürfe', 'liste'], ['entwurf', 'Oberflächen', 'seite'], ['app', 'Ganze Apps', 'varianten'], ['bild', 'Bilder', 'bild']];
  function renderOeffnen() {
    const filter = { zuletzt: (p, i) => i < 6, alle: () => true, entwurf: (p) => p.art === 'entwurf' && !p.app, app: (p) => p.app, bild: (p) => p.art === 'bild' };
    const o = S.oeffnenOrdner || 'alle';
    const q = (S.projektSuche || '').trim().toLowerCase();
    const liste = S.liste.filter(filter[o]).filter((p) => !q || `${p.name} ${p.formatName}`.toLowerCase().includes(q));
    const gew = S.liste.find((p) => p.id === S.oeffnenGewaehlt) || liste[0];
    const url = gew && S.vorschauen[gew.id + gew.geaendert];
    const info = gew ? [['Art', ART(gew)[0]], ['Format', gew.art === 'bild' ? 'Bild' : [gew.formatName, gew.mass].filter(Boolean).join(' · ')], ['Boards', gew.art === 'bild' ? '–' : String(gew.boards || 1)], ['Geändert', H.wann(gew.geaendert)]] : [];
    return `<div class="dreispalt">
      <nav class="spalte links" aria-label="Ordner"><span class="k-abschnitt">Schnellzugriff</span>
        ${ORDNER.map(([k, t, ic]) => `<button type="button" class="navzeile" aria-current="${o === k}" data-aktion="oeffnen-ordner" data-o="${k}">${sym(ic, 17)}<span>${t}</span><b>${S.liste.filter(filter[k]).length}</b></button>`).join('')}
        </nav>
      <main class="spalte spmitte"><div class="spaltenkopf"><div><h1 class="h">Entwurf öffnen</h1><span class="leise">${liste.length} ${liste.length === 1 ? 'Entwurf' : 'Entwürfe'}</span></div><div class="platz"></div>
        <label class="suchfeld">${sym('suche', 16)}<input id="psuche" placeholder="Entwurf suchen …" aria-label="Entwurf suchen"></label></div>
        <div class="projektliste vier">${liste.map((p) => projektKarte(p).replace('class="projektkarte cardw"', `class="projektkarte cardw ${gew?.id === p.id ? 'gewaehlt' : ''}"`).replace('data-aktion="projekt-oeffnen"', 'data-aktion="projekt-waehlen"')).join('') || `<div class="leerhinweis">${figur('ruhend', 40)}<span>${q ? 'Nichts gefunden.' : 'Hier ist noch nichts.'}</span></div>`}</div></main>
      <aside class="spalte rechts"><span class="k-abschnitt">Ausgewählt</span>
        ${gew ? `<div class="paper auswahlkarte"><div class="vorschau ${url ? 'mitbild' : 'vf'}" ${url ? `style="background-image:url('${url}')"` : ''}>${url ? '' : figur('ruhend', 56)}</div>
          <b class="h">${esc(gew.name)}</b><span><span class="chip ${ART(gew)[1]}">${ART(gew)[0]}</span></span>
          <dl class="infoliste">${info.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
          <div class="platz"></div>
          <div class="reihe"><button type="button" class="btn btn-q" data-aktion="projekt-weg" data-id="${gew.id}">${sym('muell', 15)} Löschen</button><div class="platz"></div><button type="button" class="btn btn-p btn-gross" data-aktion="projekt-oeffnen" data-id="${gew.id}">${sym('ordner', 16)} Öffnen</button></div>
          ${eselsohr(24, '#f6f1e7')}</div>` : '<span class="leise">Noch nichts ausgewählt.</span>'}
      </aside></div>`;
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

  const GRUPPEN_SYM = { 'App & Web': 'handy', Social: 'bild', Druck: 'plakat', 'Präsentation': 'web', Marke: 'stern' };
  function formatBild(f, max = 96) {
    const v = Math.min(max / f.breite, (max * 0.82) / f.hoehe);
    const b = Math.max(14, Math.round(f.breite * v)), h = Math.max(14, Math.round(f.hoehe * v));
    return `<span class="fbild" style="width:${b}px;height:${h}px"><i></i><b></b></span>`;
  }
  const mmWerte = (f) => { const m = /(\d+)\s*×\s*(\d+)\s*mm/.exec(f.mass || ''); return m ? [Number(m[1]), Number(m[2])] : null; };

  function renderFormate() {
    const f = S.formate.find((x) => x.id === S.neuFormat) || S.formate.find((x) => x.id === 'web');
    const gruppe = S.formatGruppe || f.gruppe;
    const q = (S.formatSuche || '').trim().toLowerCase();
    const passt = (x) => `${x.name} ${x.gruppe} ${massText(x)}`.toLowerCase().includes(q) || (q === 'a4' && x.druck);
    const liste = gruppe === 'Eigen' ? [] : S.formate.filter((x) => (q ? passt(x) : x.gruppe === gruppe));
    const mm = mmWerte(f);
    const quer = S.neuQuer ?? (f.breite > f.hoehe);
    const [wb, wh] = mm || [f.breite, f.hoehe];
    const dreh = quer !== (f.breite > f.hoehe) && f.breite !== f.hoehe;
    const zeigeB = dreh ? wh : wb, zeigeH = dreh ? wb : wh;
    const eigen = gruppe === 'Eigen';
    return `<div class="dreispalt">
      <nav class="spalte links" aria-label="Gruppen"><span class="k-abschnitt">Gruppen</span>
        ${(S.gruppen || []).map((g) => `<button type="button" class="navzeile" aria-current="${!q && gruppe === g}" data-aktion="format-gruppe" data-g="${esc(g)}">${sym(GRUPPEN_SYM[g] || 'box', 17)}<span>${esc(g)}</span><b>${S.formate.filter((x) => x.gruppe === g).length}</b></button>`).join('')}
        <button type="button" class="navzeile" aria-current="${!q && eigen}" data-aktion="format-gruppe" data-g="Eigen">${sym('lineal', 17)}<span>Eigene Maße</span></button>
        </nav>
      <main class="spalte spmitte"><div class="spaltenkopf"><div><h1 class="h">${q ? 'Suche' : eigen ? 'Eigene Maße' : esc(gruppe)}</h1><span class="leise">${eigen ? 'Gib rechts Breite und Höhe ein – Kranich faltet jede Größe.' : `${liste.length} ${liste.length === 1 ? 'Format' : 'Formate'}${liste.some((x) => x.druck) ? ' · Druck in Millimetern' : ''}`}</span></div><div class="platz"></div>
          <label class="suchfeld">${sym('suche', 16)}<input id="fsuche" placeholder="Format suchen …" aria-label="Format suchen"></label></div>
        ${eigen ? `<div class="eigenhinweis vf">${figur('arbeitend', 80)}<span class="hand" style="font-size:26px">ich falt jede Größe</span></div>` : `<div class="formatgruppe"><div class="formatreihe">${liste.map((x) => `<button type="button" class="formatkarte cardw" aria-pressed="${x.id === f.id}" data-aktion="format-waehlen" data-id="${x.id}"><div class="card"><div class="fvor vf">${formatBild(x)}</div><span class="fname"><b class="h">${esc(x.name)}</b>${x.id === f.id ? '<span class="chip chip-voll">Gewählt</span>' : ''}</span><span class="m">${esc(massText(x))}</span></div></button>`).join('') || '<div class="leerhinweis">Kein Format passt. Nimm links „Eigene Maße“.</div>'}</div></div>`}
        ${S.liste.length ? `<div class="fold" style="margin:22px 0 14px"></div><div class="zuletztformate"><span class="k-abschnitt">Zuletzt bei dir</span>${[...new Map(S.liste.filter((p) => p.mass && p.art !== 'bild').map((p) => [p.formatName + p.mass, p])).values()].slice(0, 3).map((p) => `<span class="chip chip-rand gross"><b class="h">${esc(p.formatName)}</b>${esc(p.mass)}</span>`).join('')}</div>` : ''}
      </main>
      <aside class="spalte rechts"><span class="k-abschnitt">Deine Auswahl</span>
        <div class="paper auswahlkarte">
          <div class="vorschau vf grossbild">${eigen ? figur('ruhend', 60) : formatBild(dreh ? { breite: f.hoehe, hoehe: f.breite } : f, 150)}</div>
          <div class="reihe"><b class="h" style="font-size:19px">${eigen ? 'Eigene Größe' : esc(f.name)}</b>${!eigen && f.druck ? '<span class="chip chip-gruen">Druck</span>' : ''}</div>
          <div class="massfelder"><label><span class="lbl">Breite</span><input class="feld" id="eigen-b" type="number" min="1" value="${eigen ? 1200 : zeigeB}"></label><span class="mal">×</span><label><span class="lbl">Höhe</span><input class="feld" id="eigen-h" type="number" min="1" value="${eigen ? 800 : zeigeH}"></label></div>
          ${eigen ? `<div class="segment" role="group" aria-label="Einheit"><button type="button" aria-pressed="${S.eigenEinheit !== 'mm'}" data-aktion="einheit" data-e="px">Pixel</button><button type="button" aria-pressed="${S.eigenEinheit === 'mm'}" data-aktion="einheit" data-e="mm">Millimeter</button></div>`
            : f.breite !== f.hoehe ? `<div class="zweiknopf"><button type="button" class="btn" aria-pressed="${!quer}" data-aktion="format-lage" data-quer="0">${sym('handy', 15)} Hochformat</button><button type="button" class="btn" aria-pressed="${quer}" data-aktion="format-lage" data-quer="1">${sym('web', 15)} Querformat</button></div>` : ''}
          <label class="feldblock"><span class="lbl">Was soll drauf? <span class="leise" style="text-transform:none;letter-spacing:0;font-weight:500">(darf leer bleiben)</span></span><textarea class="feld" id="startwunsch" rows="3" placeholder="z. B. Startseite für eine Fahrrad-App"></textarea></label>
          ${S.anhang ? `<span class="anhang"><img src="${S.anhang.dataUrl}" alt=""><button type="button" class="btn btn-s btn-q" data-aktion="anhang-weg">Entfernen</button></span>` : `<button type="button" class="btn btn-s btn-q" style="align-self:flex-start" data-aktion="anhang">${sym('klammer', 14)} Bild als Vorlage</button>`}
          <div class="platz"></div><div class="fold"></div>
          <button type="button" class="btn btn-p btn-gross btn-breit" data-aktion="format-anlegen">${sym('plus', 16, 2.4)} Leinwand anlegen</button>
          ${eselsohr(24, '#f6f1e7')}</div>
      </aside></div>`;
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
    if (p.seiten?.some((x) => /data-quelle="albatros:/.test(x.html || ''))) liveAktualisieren();
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
    const n = p.seiten?.length || 0;
    const unter = S.ansicht === 'varianten' ? 'Varianten' : S.modus === 'bild' ? 'Bild' : n > 1 ? `${n} Boards` : (seite()?.name || '');
    return `<header class="kopf k-kopf schlicht"><button type="button" class="heimknopf" data-aktion="zum-start" title="Alle Entwürfe" aria-label="Zurück zu allen Entwürfen">${sym('links', 18)}${figur('ruhend', 30)}</button>
      <div class="titel"><b class="h" data-aktion="umbenennen" title="Zum Umbenennen klicken">${esc(p.name)}</b><span class="unter">${esc(unter)} · <span class="speicherchip">gespeichert</span></span></div>
      <div class="platz"></div>
      <div class="reihe">${rechts}</div><span class="avatar h" aria-label="Angemeldet als Nils">NP</span></header>`;
  }

  // „Mehr“: selten gebrauchte Knöpfe in einem kleinen Menü
  // Beschriftetes Aufklappmenü (wie Schwalbe/Albatros: Wichtiges direkt, der Rest klappt auf)
  function klappMenue(titel, ic, eintraege, links = false) {
    return `<div class="mehr klappwrap"><button type="button" class="klappknopf" data-aktion="mehr" ${links ? 'data-links' : ''} aria-expanded="false">${ic ? sym(ic, 16) : ''}${titel}<span class="pfeil">▾</span></button>
      <div class="mehrmenue paper" hidden>${eintraege.map(([a, i, t, aus]) => (a === '-' ? '<span class="mm-strich"></span>' : `<button type="button" data-aktion="${a}" ${aus ? 'disabled' : ''}>${sym(i, 16)} ${t}</button>`)).join('')}</div></div>`;
  }
  function mehrMenue(eintraege) {
    return `<div class="mehr"><button type="button" class="btn btn-q rundknopf" data-aktion="mehr" title="Mehr" aria-label="Mehr" aria-expanded="false"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></button>
      <div class="mehrmenue paper" hidden>${eintraege.map(([a, ic, t, aus]) => `<button type="button" data-aktion="${a}" ${aus ? 'disabled' : ''}>${sym(ic, 16)} ${t}</button>`).join('')}</div></div>`;
  }

  async function praesentieren(ab) {
    await liveAktualisieren();
    const alle = S.projekt.seiten.filter((x) => x.html);
    if (!alle.length) { H.meldung('Noch keine Folie mit Inhalt.'); return; }
    const start = ab === 'aktuell' ? Math.max(0, alle.indexOf(seite())) : 0;
    Praesentation.starten(alle, start, { titel: S.projekt.name, master: S.projekt.master });
  }

  async function pptxEinlesen(neuAnlegen = false, pfad) {
    const r = await K.datei.pptxOeffnen(pfad);
    if (!r) return;
    if (r.fehler) { H.meldung(r.fehler.nachricht, { art: 'fehler' }); return; }
    if (!r.folien?.length) { H.meldung('In der Datei sind keine Folien.'); return; }
    if (neuAnlegen || !S.projekt) {
      const f = S.formate.find((x) => x.id === 'folie') || { id: 'folie', name: 'Folie 16:9', breite: 1920, hoehe: 1080 };
      const p = await K.projekte.anlegen({ art: 'entwurf', format: f, name: r.name });
      if (p?.fehler) { H.meldung(p.fehler.nachricht, { art: 'fehler' }); return; }
      p.name = r.name;
      await K.projekte.speichern(p);
      await oeffne(p.id);
    }
    const leer = S.projekt.seiten.length === 1 && !S.projekt.seiten[0].html;
    let erstes = null;
    for (const [i, fo] of r.folien.entries()) {
      const name = `Folie ${i + 1}${fo.titel ? ` · ${fo.titel.slice(0, 40)}` : ''}`;
      let b;
      if (i === 0 && leer) { b = S.projekt.seiten[0]; Object.assign(b, { name, breite: fo.breite, hoehe: fo.hoehe, format: 'folie', mass: undefined, html: fo.html, x: b.x || 0, y: b.y || 0 }); }
      else b = neuesBoard({ id: 'folie', name, breite: fo.breite, hoehe: fo.hoehe }, { html: fo.html });
      b.notiz = fo.notiz || '';
      b.verlauf = [{ html: fo.html, wunsch: 'Aus PowerPoint' }]; b.stand = 0;
      erstes ||= b;
    }
    S.seiteId = erstes.id;
    geaendert();
    zeigeBoards(); renderKopfKnoepfe();
    H.meldung(`${r.folien.length} Folien aus „${r.name}“ übernommen.`);
  }

  // ---------- Live-Tabellen aus Albatros ----------
  function albatrosTabelle(r, breite) {
    const gr = Math.max(12, Math.round(breite / 70));
    const kopf = r.zeilen[0]?.every((c) => !c.text || c.fett) && r.zeilen.length > 1;
    const zelle = (c, i) => `<td style="padding:${Math.round(gr * 0.45)}px ${Math.round(gr * 0.8)}px;border-bottom:1px solid #e3dccd;${c.rechts ? 'text-align:right;font-variant-numeric:tabular-nums;' : ''}${c.fett || (kopf && i === 0) ? 'font-weight:700;' : ''}${kopf && i === 0 ? 'background:#dcf0e3;color:#1d5e3a;' : c.farbe ? `background:${c.farbe};` : ''}">${esc(c.text)}</td>`;
    return `<table style="border-collapse:collapse;width:100%;font:${gr}px/1.35 'Segoe UI',Arial,sans-serif;color:#1d2742;background:#fff">${r.zeilen.map((z, i) => `<tr>${z.map((c) => zelle(c, i)).join('')}</tr>`).join('')}</table>`;
  }
  async function liveAktualisieren() {
    let n = 0;
    for (const sx of S.projekt?.seiten || []) {
      if (!/data-quelle="albatros:/.test(sx.html || '')) continue;
      const doc = new DOMParser().parseFromString(sx.html, 'text/html');
      let geaendertJa = false;
      for (const el of doc.querySelectorAll('[data-quelle^="albatros:"]')) {
        const [, id, nr] = el.dataset.quelle.split(':');
        const r = await K.albatros.tabelle({ id, blatt: Number(nr) }); if (r?.fehler) continue;
        const neu = albatrosTabelle(r, sx.breite);
        if (el.innerHTML !== neu) { el.innerHTML = neu; geaendertJa = true; }
      }
      if (geaendertJa) { sx.html = `<!doctype html>\n${doc.documentElement.outerHTML}`; n++; }
    }
    if (n) { geaendert(); if (S.modus === 'entwurf') zeigeBoards(); }
    return n;
  }
  async function albatrosEinfuegen() {
    const liste = await K.albatros.liste();
    if (liste?.fehler || !liste?.length) { H.meldung('Keine Albatros-Tabellen gefunden.'); return; }
    const w = document.createElement('div'); w.className = 'schleier';
    w.innerHTML = `<div class="dialog paper" role="dialog" aria-modal="true" style="width:min(520px,94vw);padding:20px;display:flex;flex-direction:column;gap:10px"><h2 class="h">Tabelle aus Albatros</h2><span class="leise" style="font-size:13.5px">Bleibt verbunden: neue Zahlen in Albatros stehen beim nächsten Öffnen und beim Präsentieren auch hier.</span>
      ${liste.map((t, i) => `<label class="wg-board"><input type="radio" name="alb" value="${esc(t.id)}" ${i ? '' : 'checked'}><span>${esc(t.name)}</span>${t.blaetter.length > 1 ? `<select class="feld" data-blatt="${esc(t.id)}" style="width:auto">${t.blaetter.map((b, k) => `<option value="${k}">${esc(b)}</option>`).join('')}</select>` : ''}</label>`).join('')}
      <div class="reihe" style="justify-content:flex-end;gap:8px"><button type="button" class="btn btn-q" data-zu>Abbrechen</button><button type="button" class="btn btn-p" data-ja>Einfügen</button></div></div>`;
    document.body.appendChild(w);
    w.addEventListener('click', async (ev) => {
      if (ev.target === w || ev.target.closest('[data-zu]')) { w.remove(); return; }
      if (!ev.target.closest('[data-ja]')) return;
      const id = w.querySelector('input[name=alb]:checked')?.value; if (!id) return;
      const nr = Number(w.querySelector(`select[data-blatt="${CSS.escape(id)}"]`)?.value || 0);
      const r = await K.albatros.tabelle({ id, blatt: nr }); if (r?.fehler) { H.meldung(r.fehler.nachricht, { art: 'fehler' }); return; }
      w.remove();
      const sx = seite(); const breite = Math.round(sx.breite * 0.6);
      const block = `<div data-name="Albatros: ${esc(r.name)}" data-quelle="albatros:${id}:${nr}" style="position:absolute;left:${Math.round((sx.breite - breite) / 2)}px;top:${Math.round(sx.hoehe * 0.3)}px;width:${breite}px;border-radius:12px;overflow:hidden;box-shadow:0 2px 14px rgba(29,39,66,.14)">${albatrosTabelle(r, sx.breite)}</div>`;
      const doc = new DOMParser().parseFromString(sx.html || '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>', 'text/html');
      if (getComputedStyle && doc.body && !/position\s*:\s*relative/.test(doc.body.getAttribute('style') || '')) doc.body.style.position = doc.body.style.position || 'relative';
      doc.body.insertAdjacentHTML('beforeend', block);
      sx.html = `<!doctype html>\n${doc.documentElement.outerHTML}`;
      sx.verlauf = [...(sx.verlauf || []), { html: sx.html, wunsch: 'Tabelle aus Albatros' }]; sx.stand = sx.verlauf.length - 1;
      geaendert(); zeigeBoards(); renderKopfKnoepfe();
      H.meldung('Live-Tabelle eingefügt – mit der Maus verschieben wie jedes Element.');
    });
  }

  function kopfKnoepfe() {
    const kannZurueck = S.modus === 'bild' ? Bild.z.stand > 0 : (seite()?.stand || 0) > 0;
    if (S.projekt?.app?.plan && S.modus !== 'bild') return AppBau.kopfKnoepfe(kannZurueck);
    const leer = !seite()?.html;
    return `<button type="button" class="btn btn-q rundknopf" data-aktion="rueckgaengig" ${kannZurueck ? '' : 'disabled'} title="Rückgängig (Strg+Z)" aria-label="Rückgängig">${sym('zurueck', 17)}</button>
            ${S.modus === 'bild' ? '' : `<button type="button" class="btn" data-aktion="praesentieren" ${S.projekt?.seiten?.some((x) => x.html) ? '' : 'disabled'} title="Präsentieren ab Folie 1 (F5) · ab dieser Folie: Umschalt+F5">${sym('senden', 16)} Präsentieren</button>`}
      <button type="button" class="btn btn-p" data-aktion="exportieren">${sym('export', 16)} Exportieren</button>`;
  }

  function renderWerkbank() {
    S.ansicht = 'werkbank';
    const bild = S.modus === 'bild';
    const p = S.projekt;
    app.innerHTML = bild ? `<section class="ansicht" id="werkbank">${kopfHtml(kopfKnoepfe())}
      <div class="werkbank">
        <nav class="werkzeuge" aria-label="Werkzeuge"></nav>
        <main class="leinwand paper" aria-label="Leinwand"></main>
        <div class="rechtsbild"><div class="paper reglerkarte" id="regler"></div><aside class="kranichleiste" aria-label="Kranich"></aside></div>
      </div></section>` : `<section class="ansicht klar wb" id="werkbank">
      <header class="kl-kopf wb-kopf">
        <button type="button" class="kl-marke" data-aktion="zum-start" title="Alle Entwürfe">${sym('links', 18)}${figur('ruhend', 30)}<b class="h">Kranich</b></button>
        <span class="wb-trenner"></span>
        <div class="sk-projekt wb-projekt"><b class="h" data-aktion="umbenennen" title="Zum Umbenennen klicken">${esc(p.name)}</b><small><span class="boardtitel">${esc(seite()?.name || '')}</span> · <span class="boardmass">${esc(seite()?.mass || `${seite()?.breite} × ${seite()?.hoehe}`)}</span> · <span class="speicherchip">gespeichert</span></small></div>
        <button type="button" class="klappknopf kr-datei" data-aktion="datei-ansicht">Datei</button>
        <div class="platz"></div><div class="reihe knopfreihe">${kopfKnoepfe()}</div>
        <button type="button" class="oo-hilfe" data-aktion="rundgang" title="Kurzer Rundgang" aria-label="Kurzer Rundgang">?</button>
        <button type="button" class="kl-rund" data-aktion="einstellungen" title="Einstellungen" aria-label="Einstellungen">${sym('zahnrad', 18)}</button>
      </header>
      <div class="wb-raster">
        <div class="oo-sitzvogel" aria-hidden="true">${figur('ruhend', 84)}</div>
        <aside class="kl-blatt wb-links">
          <button type="button" class="wb-neu" data-aktion="board-dazu">${sym('plus', 16, 2.4)}<span>${S.projekt.app?.plan ? "Bildschirm hinzufügen" : "Neue Folie"}</span></button>
          <nav class="seitenleiste sk-mitte" aria-label="Boards und Ebenen"></nav>
        </aside>
        <main class="wb-mitte leinwandspalte"><div class="leinwandrahmen"><nav class="werkzeugleiste schwebend" aria-label="Werkzeuge">${schiene()}</nav><main class="leinwand" aria-label="Leinwand"></main><aside class="eigenschaften paper" aria-label="Eigenschaften" hidden></aside><div class="notizleiste paper" hidden><span class="nl-titel">Notizen <small class="nl-folie"></small></span><textarea id="vt-notiz" rows="1" placeholder="Was willst du dazu sagen? Nur du siehst das – in der Referentenansicht."></textarea></div></div></main>
        <aside class="kl-blatt kranichleiste chatspalte" aria-label="Kranich"></aside>
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
        beiAuswahl: (a) => { S.auswahl = a; renderSeitenleiste(); renderWunschfeld(); Direkt.zeichne(); Entwurf.zeigeAuswahl(); },
        beimSetzen: (b, el) => (['text', 'rechteck', 'bild'].includes(S.werkzeug) ? (Direkt.setze(b, el), true) : false),
        beimDoppelklick: (b, el) => Direkt.tippen(b, el),
        beimLeinwandKlick: (e) => (S.werkzeug === 'notiz' && e.button === 0 ? (Direkt.notizDazu(e), true) : false),
        beiDirekt: (id, html, was) => direktGeaendert(id, html, was),
        beiEbenen: (l) => { S.ebenen = l; renderSeitenleiste(); },
        beiBoard: (id) => waehleBoard(id),
        beiHtml: (id, html) => { const s = S.projekt?.seiten.find((x) => x.id === id); if (!s) return; s.html = html; if (s.verlauf?.[s.stand]) s.verlauf[s.stand].html = html; speichernSpaeter(); },
      });
      if (S.hand) leinwand.classList.add('greifbereit', 'hand-an');
      zeigeBoards();
      Direkt.montiert(app, leinwand);
      AppBau.zeigeLauf();
    }
    renderLeiste();
    zeigeSpeicherchip();
    if (!bild) setTimeout(() => { if (S.ansicht === 'werkbank' && S.modus === 'entwurf' && !document.querySelector('.schleier') && seite()?.html) K.standFoto?.('kranich-arbeitsflaeche'); }, 4000);
    if (!bild) setTimeout(() => { if (S.ansicht === 'werkbank' && !document.querySelector('.schleier')) window.Rundgang?.start(RUNDGANG()); }, 900);
  }
  const RUNDGANG = () => ({ app: 'kranich', farbe: '#6a4fc7', vogel: figur('winkt', 52), schritte: [
    { ziel: '.leinwandrahmen', titel: 'Der Leuchttisch', text: 'Hier entsteht dein Entwurf – Folie, Plakat, App-Bildschirm. Zoomen mit Strg+Mausrad, verschieben mit der Hand.' },
    { ziel: '.werkzeugleiste', titel: 'Werkzeuge', text: 'Auswählen, Hand, Text, Form, Bild, Notiz. Doppelklick auf einen Text und du schreibst direkt rein.' },
    { ziel: '.chatspalte', titel: 'Hier bin ich', text: 'Beschreib, was du willst – ich falte es dir hin. „Mach den Knopf größer“, „mehr Lila“, „drei Varianten“. Lila geht immer.' },
    { ziel: '.wb-links', titel: 'Boards & Bausteine', text: 'Mehrere Boards für mehrere Folien oder Größen. Bausteine ziehst du einfach auf die Leinwand.' },
    { ziel: '[data-aktion="exportieren"]', titel: 'Fertig?', text: 'Exportieren als PNG, PDF oder für Insta. Das ? daneben startet diesen Rundgang nochmal.' },
  ] });

  function renderKopfKnoepfe() {
    const r = app.querySelector('.knopfreihe') || app.querySelector('.kopf .reihe');
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
    const t = app.querySelector('.boardtitel');
    if (t) t.textContent = seite().name;
    const m = app.querySelector('.boardmass');
    if (m) m.textContent = seite().mass || `${seite().breite} × ${seite().hoehe}`;
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

  function schiene() {
    const s = seite();
    const offen = s?.pruefung?.offen?.length || 0;
    const k = (aktion, ic, titel, extra = '') => `<button type="button" class="schienenknopf" data-aktion="${aktion}" title="${titel}" aria-label="${titel}" ${extra}>${sym(ic, 16)}</button>`;
    const w = S.werkzeug || 'zeiger';
    const kw = (id, d, titel) => `<button type="button" class="schienenknopf" data-aktion="werkzeug" data-w="${id}" title="${titel}" aria-label="${titel}" aria-pressed="${w === id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg></button>`;
    return `${k('werkzeug-zeiger', 'zeiger', 'Wählen (V): Element anklicken – Eigenschaften erscheinen rechts', `aria-pressed="${!S.hand && w === 'zeiger'}"`)}
      ${k('werkzeug-hand', 'hand', 'Hand (H): Leinwand verschieben (auch mit Leertaste)', `aria-pressed="${Boolean(S.hand)}"`)}
      <span class="schienenstrich"></span>
      ${kw('text', 'M5 6V4h14v2M12 4v16M9 20h6', 'Text (T): ins Board klicken')}
      ${kw('rechteck', 'M4 6h16v12H4z', 'Rechteck (R): ins Board klicken')}
      ${kw('bild', 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01', 'Bild (B): ins Board klicken, dann Bild wählen')}
      ${kw('notiz', 'M5 4h14v11l-5 5H5zM14 20v-5h5', 'Notiz (N): auf die Leinwand klicken')}
      <span class="schienenstrich"></span>
      ${k('app-pruefung', 'haken', 'Prüfen: Kranich misst das Board nach', s?.html ? '' : 'disabled')}${offen ? `<span class="schienenzahl">${offen}</span>` : ''}
      <span class="schienenstrich"></span>
      ${klappMenue('Einfügen', 'plus', [['board-dazu', 'plus', 'Neue Folie'], ['baustein-text', 'text', 'Textfeld'], ['baustein-bild', 'bild', 'Bild'], ['albatros-tabelle', 'mischen', 'Tabelle aus Albatros (live)'], ['pptx-oeffnen', 'ordner', 'Folien aus PowerPoint …']], true)}
      ${klappMenue('Gestalten', 'varianten', [['varianten', 'varianten', 'Drei Varianten falten', !s?.html], ['alle-groessen', 'mischen', 'In alle Größen falten', !s?.html], ['app-abspielen', 'senden', 'Vorschau (durchklicken)', !s?.html], ['-'], ['modus-bild', 'bild', 'Bild bearbeiten']], true)}
      ${S.projekt?.app?.plan ? '' : `<button type="button" class="klappknopf" data-aktion="vortrag-menue" aria-expanded="false">${sym('senden', 16)}Vortrag<span class="pfeil">▾</span></button>`}`;
  }

  function boardZeile(x, aktiv, mehrere, klein) {
    const st = x.html ? (x.pruefung?.offen?.length ? ['gelb', `${x.pruefung.offen.length} offen`] : ['gruen', 'fertig']) : ['leer', 'leer'];
    const name = klein ? (x.name.split(' · ')[1] || x.name) : x.name;
    return `<button type="button" class="boardzeile ${klein ? 'klein' : ''}" draggable="true" aria-current="${aktiv}" data-aktion="seite" data-id="${x.id}" title="${esc(x.name)} · ${st[1]} – Doppelklick zum Umbenennen">
      <i class="punkt ${st[0]}"></i><span class="bz-name">${esc(name)}</span>${klein ? '' : `<small>${esc(x.mass || `${x.breite}×${x.hoehe}`)}</small>`}${!klein ? `<span class="loesch" role="button" tabindex="-1" aria-label="Board löschen" data-aktion="board-weg" data-id="${x.id}">${sym('muell', 13)}</span>` : ''}</button>`;
  }

  function renderSeitenleiste() {
    const nav = app.querySelector('.seitenleiste');
    const rail = app.querySelector('.werkzeugleiste');
    if (rail && S.projekt) rail.innerHTML = schiene();
    if (!nav || !S.projekt) return;
    const s = seite();
    const alle = S.projekt.seiten;
    const mehrere = alle.length > 1;
    let liste;
    if (S.projekt.app?.plan && alle.some((x) => x.bildschirm)) {
      const gruppen = new Map();
      for (const x of alle) { const g = x.bildschirm || x.id; if (!gruppen.has(g)) gruppen.set(g, []); gruppen.get(g).push(x); }
      liste = [...gruppen.values()].map((g) => {
        const haupt = g.find((x) => !x.zustand) || g[0];
        const rest = g.filter((x) => x !== haupt);
        const offen = g.some((x) => x.id === s.id);
        return `<div class="boardgruppe ${offen ? 'offen' : ''}">${boardZeile(haupt, haupt.id === s.id, mehrere)}${rest.length ? `<div class="zustandsreihe">${rest.map((x) => boardZeile(x, x.id === s.id, false, true)).join('')}</div>` : ''}</div>`;
      }).join('');
    } else {
      liste = alle.map((x) => boardZeile(x, x.id === s.id, mehrere)).join('');
    }
    const fertig = alle.filter((x) => x.html).length;
    nav.innerHTML = `<span class="sk-titel hand">${S.projekt.app?.plan ? 'Bildschirme' : 'Folien'} <small>${fertig}/${alle.length}</small></span>
      <div class="seitenlaschen">${liste}</div>
      <details class="wb-klapp" data-klapp="ebenen"${S.ebenenAuf ? ' open' : ''}><summary>Ebenen <small>${esc(s.name)}</small></summary>
      <div class="ebenen">${S.ebenen.length ? S.ebenen.map((e) => `<button type="button" aria-current="${S.auswahl?.k === e.k}" data-aktion="ebene" data-k="${e.k}" style="padding-left:${8 + e.tiefe * 14}px"><span>${esc(e.name)}</span><span class="loesch" role="button" tabindex="-1" title="Löschen (Entf)" aria-label="Ebene löschen" data-aktion="ebene-weg" data-k="${e.k}">${sym('muell', 13)}</span></button>`).join('') : '<span class="leise" style="font-size:13.5px;padding:2px 8px">Noch leer.</span>'}</div>
      </details>
      ${S.modus === 'entwurf' ? `<details class="wb-klapp" data-klapp="bausteine"${S.bausteineAuf ? ' open' : ''}><summary>Bausteine <small>zum Reinziehen</small></summary>${Direkt.bausteinLeiste()}</details>` : ''}
      <button type="button" class="versteckt" data-aktion="board-dazu" tabindex="-1" aria-hidden="true"></button>`;
    nav.querySelector('.boardzeile[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
    const nl = app.querySelector('.notizleiste');
    if (nl) { const t = nl.querySelector('#vt-notiz'); nl.hidden = S.modus !== 'entwurf' || Boolean(S.projekt.app?.plan); if (t && document.activeElement !== t) t.value = s.notiz || ''; nl.querySelector('.nl-folie').textContent = `Folie ${alle.indexOf(s) + 1}`; }
    const vs = app.querySelector('.vortrag-schwebe'); if (vs && !vs.contains(document.activeElement)) vs.innerHTML = vortragInhalt();
  }
  function vortragInhalt() {
    const s = seite(); const alle = S.projekt.seiten;
    return `<div class="vs-kopf"><b class="h">Vortrag</b><small>Folie ${alle.indexOf(s) + 1}</small></div>
      <div class="vortragsfeld"><label for="vt-uebergang">Übergang zu dieser Folie</label><select id="vt-uebergang">${Praesentation.UEBERGAENGE.map(([k, t]) => `<option value="${k}" ${(s.uebergang || 'keiner') === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
        ${(() => { const el = S.auswahl?.k ? Entwurf.element(S.auswahl.k) : null; if (!el || el.localName === 'body') return '<span class="vt-tipp">Element anklicken, um ihm eine Animation zu geben.</span>'; const n = [...(el.ownerDocument.querySelectorAll('[data-anim]'))].length; return `<label for="vt-anim">Animation für „${esc(Entwurf.nameVon(el))}“</label><select id="vt-anim">${Praesentation.ANIMATIONEN.map(([k, t]) => `<option value="${k}" ${(el.dataset.anim || '') === k ? 'selected' : ''}>${t}</option>`).join('')}</select>${n ? `<span class="vt-tipp">${n} Animation${n === 1 ? '' : 'en'} auf dieser Folie – erscheinen der Reihe nach beim Weiterklicken.</span>` : ''}`; })()}
        <details class="vt-master"${S.masterAuf ? ' open' : ''}><summary>Für alle Folien</summary>
          <label for="vt-fuss">Fußzeile</label><input id="vt-fuss" value="${esc(S.projekt.master?.fuss || '')}" placeholder="z. B. Firma · Thema">
          <label class="vt-haken"><input type="checkbox" id="vt-nummer" ${S.projekt.master?.nummer ? 'checked' : ''}> Foliennummer</label>
          <div class="vt-logo">${S.projekt.master?.logo ? `<img src="${S.projekt.master.logo}" alt="Logo"><button type="button" class="btn btn-s btn-q" data-aktion="master-logo-weg">Logo entfernen</button>` : '<button type="button" class="btn btn-s" data-aktion="master-logo">Logo wählen</button>'}</div>
          <span class="vt-tipp">Erscheint beim Präsentieren und in der PowerPoint.</span></details></div>`;
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
      const titel = k.titel || (k.anpassen ? `Ich falte ${k.anpassen.length} weitere Größen` : 'Kranich faltet …');
      html = S.bandZu
        ? `<div class="hinweisband paper zu" title="${esc(titel)}">${figur('arbeitend', 26)}<b class="h">${k.gesamt != null ? `<span class="bandprozent">${Math.round(k.gesamt)} %</span>` : 'Faltet …'}</b>${k.gesamt != null ? `<div class="gesamtbalken"><i style="width:${k.gesamt}%"></i></div>` : ''}<button type="button" class="btn btn-s btn-q rundknopf" data-aktion="band-klappen" title="Aufklappen" aria-label="Aufklappen" aria-expanded="false">${sym('hoch', 14)}</button></div>`
        : `<div class="hinweisband paper">${figur('arbeitend', 34)}<div style="display:flex;flex-direction:column;flex:1"><b class="h">${esc(titel)}</b><span class="leise bandmeldung" style="font-size:13px">${esc(k.meldung)}</span>${k.gesamt != null ? `<div class="gesamtbalken"><i style="width:${k.gesamt}%"></i></div>` : ''}</div>
        <button type="button" class="btn btn-s" data-aktion="abbrechen">${k.anpassen ? 'Anhalten' : 'Abbrechen'}</button><button type="button" class="btn btn-s btn-q rundknopf" data-aktion="band-klappen" title="Einklappen" aria-label="Einklappen" aria-expanded="true">${sym('runter', 14)}</button></div>`;
    } else if (k.zustand === 'fehler') {
      html = `<div class="hinweisband paper fehler" role="alert">${figur('ruhend', 34)}<div style="display:flex;flex-direction:column"><b class="h">${esc(k.fehler?.nachricht || 'Kranich kommt gerade nicht an Claude ran')}</b>
        <span class="leise" style="font-size:13px">Dein Entwurf ist gespeichert, nichts geht verloren.${k.fehler?.details ? ` <button type="button" class="linkknopf" data-aktion="fehler-details">Was ist passiert?</button>` : ''}</span></div>
        <button type="button" class="btn btn-s btn-p" data-aktion="nochmal">Nochmal</button><button type="button" class="btn btn-s btn-q" data-aktion="fehler-weg" aria-label="Schließen">${sym('schliessen', 14)}</button></div>`;
    } else if (k.zustand === 'fertig' && k.variantenBereit) {
      html = `<div class="hinweisband paper">${figur('fertig', 34)}<div style="display:flex;flex-direction:column"><b class="h">3 Varianten bereit</b><span class="leise" style="font-size:13px">Ruhig, Mutig und Kompakt</span></div>
        <button type="button" class="btn btn-s btn-p" data-aktion="varianten-zeigen">Ansehen</button><button type="button" class="btn btn-s btn-q" data-aktion="fertig-weg">Später</button></div>`;
    } else if (!s.html && S.projekt.seiten.length === 1) {
      html = `<div class="mitte"><div class="paper leerkarte"><div class="leerbild vf">${figur('ruhend', 96)}</div><h2 class="h">Beschreib, was du willst</h2>
        <span class="leise">Schreib links an Kranich oder zieh ein Bild hier rein. Zum Beispiel:</span>
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
    fehler: ['schlaeft', 'Keine Verbindung', 'chip-rot', 'hm, da klemmt was'],
  };

  function renderLeiste() {
    const aside = app.querySelector('.kranichleiste');
    if (!aside || !S.projekt) return;
    const [haltung, chip, chipArt, hand] = KOPF[S.kranich.zustand] || KOPF.bereit;
    const verlaufAn = S.leisteLasche === 'verlauf';
    const tun = S.kranich.zustand === 'denkt' ? (S.modus === 'bild' ? 'malt' : S.kranich.anpassen ? (S.projekt.app ? 'baut' : 'groessen') : 'faltet') : S.kranich.zustand === 'fertig' ? 'fertig' : haltung;
    aside.innerHTML = `<header class="blattkopf"><span class="chatfigur">${figur(tun, 30)}</span><span class="oo-wer"><b class="h">${verlaufAn ? 'Verlauf' : 'Kranich'}</b><small class="${chipArt === 'chip-rot' ? 'rot' : ''}">${verlaufAn ? 'Frühere Fassungen' : S.kranich.zustand === 'bereit' ? 'Gestalter, faltet schnell' : esc(chip)}</small></span>
        <button type="button" class="btn btn-q rundknopf" data-aktion="leiste" data-lasche="${verlaufAn ? 'kranich' : 'verlauf'}" aria-pressed="${verlaufAn}" title="${verlaufAn ? 'Zurück zum Gespräch' : 'Frühere Fassungen'}" aria-label="Verlauf">${sym(verlaufAn ? 'schliessen' : 'uhr', 17)}</button></header>
      <div class="leistenblatt">
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
      el.innerHTML = S.modus === 'bild'
        ? `<div class="schnell">${[['Hintergrund weg', 'Entferne den Hintergrund.'], ['1080 × 1080', 'Bring das Bild auf 1080 × 1080.'], ['Heller', 'Mach das Bild etwas heller und freundlicher.'], ['Schärfer', 'Mach das Bild schärfer.']].map(([t, w]) => `<button type="button" data-aktion="kr-frage" data-text="${esc(w)}">${sym('stern', 15)} ${t}</button>`).join('')}</div><div class="kr-hallo">${figur('ruhend', 34)}<span>Sag mir, was mit dem Bild passieren soll – ich mal es dir zurecht.</span></div>`
        : `<div class="schnell">${[['Aufräumen', 'Räum die Folie auf: gleiche Abstände, klare Hierarchie, nichts zu eng.'], ['Mehr Wirkung', 'Gib der Folie mehr Wirkung: größerer Titel, mehr Luft, eine Akzentfarbe.'], ['Bild dazu', 'Schlag ein passendes Bild oder eine Grafik für diese Folie vor und setz sie ein.'], ['Kürzer', 'Kürz die Texte auf der Folie auf das Wichtigste.']].map(([t, w]) => `<button type="button" data-aktion="kr-frage" data-text="${esc(w)}">${sym('stern', 15)} ${t}</button>`).join('')}</div><div class="kr-hallo">${figur('ruhend', 34)}<span>Sag mir in normalen Worten, was du brauchst – ich falte Folien, ordne, kürze und gestalte. Klickst du vorher ein Element an, kümmere ich mich nur darum.</span></div>`;
      return;
    }
    const fortschritt = S.kranich.zustand === 'denkt' && S.kranich.anpassen
      ? `<div class="blase-kr"><span class="ava">${figur('arbeitend', 30)}</span><div class="inhalt"><b>${esc(S.kranich.titel || `Ich falte „${seite().name}“ in ${S.kranich.anpassen.length} weitere Größen`)}</b><div class="fortschritt">${S.kranich.anpassen.map((j) => `<div class="zeile"><span class="txt"><b class="h">${esc(j.format.name)}</b><span>${esc(j.notiz || j.format.mass || `${j.format.breite} × ${j.format.hoehe}`)}</span></span><span class="chip ${{ wartet: 'chip-grau', laeuft: 'chip-zart', repariert: 'chip-gelb', fertig: 'chip-gruen', fehler: 'chip-rot' }[j.zustand]}" data-job="${esc(j.board?.id || '')}">${j.zustand === 'laeuft' && j.prozent != null ? `${j.prozent} %` : { wartet: 'Wartet', laeuft: 'Läuft', repariert: 'Repariert', fertig: 'Fertig', fehler: 'Fehler' }[j.zustand]}</span></div>`).join('')}</div>
        <div class="reihe"><span class="leise" style="flex:1">${esc(S.kranich.meldung)}</span><button type="button" class="btn btn-s" data-aktion="abbrechen">Anhalten</button></div></div></div>` : '';
    el.innerHTML = chat.map((c, i) => {
      if (c.wer === 'ich') return `<div class="blase-ich">${esc(c.text)}</div>`;
      const letzte = i === chat.length - 1;
      const haltung = c.fehler ? 'still' : letzte && S.kranich.zustand === 'fertig' ? 'fertig' : 'still';
      return `<div class="blase-kr ${c.fehler ? 'fehler' : ''}"><span class="ava">${figur(haltung, 30)}</span><div class="inhalt">
        ${c.fehler ? `<span class="titelz">${esc(c.titel || 'Keine Verbindung zu Claude')}</span>` : ''}<span>${esc(c.text)}</span>
        ${c.chips?.length ? `<div class="chips">${c.chips.map((t) => `<span class="chip chip-gruen">${sym('haken', 13)}${esc(t)}</span>`).join('')}</div>` : ''}
        ${letzte && c.fehler ? '<div class="reihe"><button type="button" class="btn btn-s" data-aktion="nochmal">Nochmal</button></div>' : ''}
        ${letzte && !c.fehler && c.rueckgaengig ? `<div class="reihe"><button type="button" class="btn btn-s" data-aktion="rueckgaengig">${sym('zurueck', 14)} Rückgängig</button>${c.varianten ? '<button type="button" class="btn btn-s" data-aktion="varianten-zeigen">Varianten ansehen</button>' : ''}</div>` : ''}
      </div></div>`;
    }).join('') + fortschritt + (S.kranich.zustand === 'denkt' && !S.kranich.anpassen ? `<div class="blase-kr"><span class="ava">${figur('arbeitend', 30)}</span><div class="inhalt"><div class="reihe" style="gap:10px"><span class="punkte" aria-hidden="true"><i></i><i></i><i></i></span><span class="leise">${esc(S.kranich.meldung || 'Ich falte …')}</span></div></div></div>` : '');
    el.scrollTop = el.scrollHeight;
  }

  const ORI_KR = ['Hübsch. Fast so hübsch wie ich.', 'Er faltet schnell. Ich falte schöner.', 'Weniger Text. Glaub mir.', 'Bunt ist kein Konzept, sag ich nur.', 'Ich hätte es ja anders gefaltet.'];
  function renderWunschfeld() {
    const el = app.querySelector('.kranichleiste .wunschfeld');
    if (!el || !S.projekt) return;
    const alt = el.querySelector('textarea')?.value || '';
    const auswahlChip = S.modus === 'entwurf' && S.auswahl
      ? `<span class="chip chip-zart" style="align-self:flex-start">Auswahl: ${esc(S.auswahl.name)}<button type="button" style="border:0;background:transparent;color:inherit;font:inherit;padding:0 0 0 4px" data-aktion="auswahl-weg">Abwählen</button><button type="button" style="border:0;background:transparent;color:#c0392b;font:inherit;padding:0 0 0 8px" data-aktion="ebene-weg" data-k="${esc(S.auswahl.k)}">Löschen</button></span>`
      : S.modus === 'bild' && Bild.z.auswahl ? '<span class="chip chip-zart" style="align-self:flex-start">Auswahl im Bild wird mitgeschickt</span>' : '';
    const denkt = S.kranich.zustand === 'denkt';
    el.innerHTML = `${auswahlChip}
      ${S.anhang && S.modus === 'entwurf' ? `<span class="anhang"><img src="${S.anhang.dataUrl}" alt=""><span class="leise" style="font-size:12.5px">${esc(S.anhang.name)} – wird zum Entwurf</span><button type="button" class="btn btn-s btn-q" data-aktion="anhang-weg">Entfernen</button></span>` : ''}
      <div class="oo-ori-karte">${(window.ORI?.['ruhezustand-2'] || '').replace(/__G__/g, 46).replace(/<ellipse[\s\S]*?<\/ellipse>/, '').replace(' aria-hidden="true"', ' aria-hidden="true" class="ori-bild"')}<b>${esc(ORI_KR[Math.floor(Math.random() * ORI_KR.length)])}</b></div>
      <div class="eingabekarte klein"><textarea id="wunsch" rows="1" aria-label="Dein Wunsch an Kranich" placeholder="${S.modus === 'bild' ? 'z. B. „Hintergrund weg, 1080 × 1080“' : S.auswahl ? `Was soll mit „${esc(S.auswahl.name)}“ passieren?` : 'Nachricht an Kranich …'}"></textarea>
        <div class="ek-leiste"><button type="button" class="btn btn-q btn-s" data-aktion="${S.modus === 'bild' ? 'bild-einfuegen' : 'anhang'}" title="Bild anhängen">${sym('klammer', 15)} Bild</button><div class="platz"></div>
        <button type="button" class="btn btn-dunkel sendeknopf" data-aktion="senden" title="Senden (Enter)" ${denkt ? 'disabled' : ''}>Senden ${sym('senden', 15, 2.4)}</button></div></div>`;
    const ta = el.querySelector('textarea');
    ta.value = alt;
    const hoehe = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(120, ta.scrollHeight)}px`; };
    ta.addEventListener('input', hoehe); hoehe();
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
  function setzeWerkzeug(w) {
    S.werkzeug = w || 'zeiger';
    if (S.werkzeug !== 'zeiger') { S.hand = false; app.querySelector('.leinwand')?.classList.remove('greifbereit', 'hand-an'); }
    app.querySelector('.leinwand')?.classList.toggle('setzt', S.werkzeug !== 'zeiger');
    const rail = app.querySelector('.werkzeugleiste'); if (rail) rail.innerHTML = schiene();
    if (S.werkzeug === 'notiz') H.meldung('Klick auf eine freie Stelle der Leinwand für die Notiz.');
    else if (S.werkzeug !== 'zeiger') H.meldung('Klick ins Board, wo es hin soll.');
  }
  // Direkte Änderung (Eigenschaften, Bausteine, Text) → neue Fassung, Rückgängig geht
  function direktGeaendert(id, html, was) {
    const s = S.projekt.seiten.find((x) => x.id === id); if (!s) return;
    S.seiteId = id;
    if (!s.verlauf?.length && s.html) neueFassung(s.html, 'Ausgangsstand');
    const letzte = s.verlauf?.[s.stand];
    if (letzte && letzte.was === was && Date.now() - new Date(letzte.zeit).getTime() < 2500) { letzte.html = html; letzte.zeit = new Date().toISOString(); s.html = html; }
    else neueFassung(html, was);
    geaendert(); renderKopfKnoepfe(); renderVerlauf();
  }

  // Ein Element (Ebene) aus dem Board entfernen – Strg+Z holt es zurück
  function loescheEbene(k) {
    const s = seite();
    if (!s?.html || !k) return;
    const doc = new DOMParser().parseFromString(s.html, 'text/html');
    const el = doc.querySelector(`[data-k="${CSS.escape(k)}"]`);
    if (!el || el === doc.body) return;
    const name = S.auswahl?.k === k ? S.auswahl.name : (S.ebenen.find((x) => x.k === k)?.name || 'Element');
    el.remove();
    neueFassung(`<!doctype html>\n${doc.documentElement.outerHTML}`, `Gelöscht: ${name}`);
    S.auswahl = null;
    Entwurf.waehle(null);
    Entwurf.zeigeAlle(S.projekt.seiten, s.id);
    renderSeitenleiste(); renderKopfKnoepfe(); renderWunschfeld(); renderVerlauf(); geaendert();
    H.meldung(`„${name}“ gelöscht. Strg+Z holt es zurück.`);
  }

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
    const NAMEN = ['Ruhig', 'Mutig', 'Kompakt'];
    const BU = ['A', 'B', 'C'];
    const karten = (v || [null, null, null]).map((x, i) => {
      const name = x?.name || NAMEN[i];
      const kopf = `<div class="vkopf"><b class="h">${BU[i]} · ${esc(name)}</b>${x && !x.fehler ? '<span class="leise">gerade eben</span>' : ''}</div>`;
      if (!x) return `<div class="variante cardw"><div class="card"><div class="rahmen vf leerrahmen">${S.variantenLaeuft ? `<div class="faltblatt"></div><span class="leise">Kranich faltet „${name}“ …</span>` : '<span class="leise">Noch nicht gefaltet</span>'}</div>${kopf}</div></div>`;
      if (x.fehler) return `<div class="variante cardw"><div class="card"><div class="rahmen vf leerrahmen"><span class="leise" style="padding:20px;text-align:center">Hat nicht geklappt: ${esc(x.fehler.nachricht)}</span></div>${kopf}</div></div>`;
      const gew = S.mischen.has(i);
      return `<div class="variante cardw ${gew ? 'gewaehlt' : ''}"><div class="card">
        <div class="rahmen vf" data-i="${i}"><iframe sandbox="allow-same-origin" title="Variante ${esc(name)}" style="width:${s.breite}px;height:${s.hoehe}px"></iframe></div>
        ${kopf}<p class="vnotiz">${esc(x.notiz || x.hinweis || '')}</p>
        <div class="vfuss"><button type="button" class="btn ${i === 1 ? 'btn-p' : ''} btn-breit" data-aktion="variante-nehmen" data-i="${i}">Diese übernehmen</button>
          <button type="button" class="btn merkknopf" aria-pressed="${gew}" data-aktion="mischen-waehlen" data-i="${i}" title="Zum Mischen merken" aria-label="Zum Mischen merken"><svg width="15" height="15" viewBox="0 0 24 24" fill="${gew ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg></button></div></div></div>`;
    }).join('');
    const p = S.projekt;
    app.innerHTML = `<section class="ansicht" id="varianten">
      <header class="kopf k-kopf"><button type="button" class="marke" data-aktion="zum-start" title="Zur Startseite">${figur('ruhend', 34)}<span class="h">Kranich</span></button><span class="trenner"></span>
        <div class="titel"><b class="h">${esc(p.name)}</b><span class="unter">${esc(s.name)} · ${esc(s.mass || `${s.breite} × ${s.hoehe}`)}</span></div>
        <span class="chip chip-rand">3 Fassungen</span><span class="chip speicherchip chip-gruen">${sym('haken', 13)}Gespeichert</span><div class="platz"></div>
        <button type="button" class="btn" data-aktion="zur-werkbank">${sym('links', 16)} Zurück zur Leinwand</button></header>
      <div class="variantenraster">
        <aside class="spalte links vlinks"><span class="k-abschnitt">Dein Wunsch</span>
          <blockquote class="wunschzitat">„${esc(S.variantenWunsch)}“</blockquote>
          <span class="k-abschnitt">Fassungen</span>
          ${(v || [null, null, null]).map((x, i) => `<div class="navzeile ${S.mischen.has(i) ? 'gemerkt' : ''}"><span class="bu">${BU[i]}</span><span>${esc(x?.name || NAMEN[i])}</span>${S.mischen.has(i) ? '<b>gemerkt</b>' : ''}</div>`).join('')}
          <div class="fold" style="margin:14px 0"></div>
          <span class="k-abschnitt">Mischen</span>
          <span class="leise" style="font-size:13px">Merk dir zwei oder drei Fassungen (Lesezeichen) und sag, was woher kommen soll.</span>
          <input class="feld" id="mischwunsch" placeholder="z. B. Kopf aus B, Liste aus A">
          <button type="button" class="btn" data-aktion="mischen" ${S.mischen.size >= 2 ? '' : 'disabled'}>${sym('mischen', 16)} Mischen (${S.mischen.size})</button>
          <div class="platz"></div>
          <button type="button" class="btn" data-aktion="noch-drei" ${S.variantenLaeuft ? 'disabled' : ''}>${sym('zurueck', 15)} Drei neue Fassungen</button>
        </aside>
        <main class="vmitte">
          <div class="spaltenkopf"><div><h1 class="h">Fassungen vergleichen</h1><span class="leise">Kranich hat „${esc(s.name)}“ dreimal neu gefaltet. Such dir eine aus – die anderen landen nicht auf der Leinwand.</span></div></div>
          <div class="variantenreihe">${karten}</div>
          <div class="vunten"><span class="leise">Übernehmen legt die Fassung als neuen Stand aufs Board – mit Rückgängig kommst du zurück.</span><div class="platz"></div><button type="button" class="btn btn-q" data-aktion="zur-werkbank">Alle verwerfen</button></div>
        </main>
      </div></section>`;
    zeigeSpeicherchip();
    app.querySelectorAll('.variante .rahmen[data-i]').forEach((r) => {
      const x = v[Number(r.dataset.i)];
      const f = r.querySelector('iframe');
      const passe = () => { const pad = 18; const z = Math.min((r.clientWidth - pad * 2) / s.breite, (r.clientHeight - pad * 2) / s.hoehe); f.style.transform = `scale(${z})`; f.style.left = `${(r.clientWidth - s.breite * z) / 2}px`; f.style.top = `${(r.clientHeight - s.hoehe * z) / 2}px`; };
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
    nav.innerHTML = `<button type="button" class="btn btn-q zumentwurf" data-aktion="modus" data-modus="entwurf">${sym('links', 16)} Zurück zum Entwurf</button>
      <span class="k-abschnitt">Werkzeuge</span>
      ${WERKZEUGE.map(([k, t]) => `<button type="button" class="wz" aria-pressed="${z.werkzeug === k}" data-aktion="werkzeug" data-w="${k}" ${!Bild.hatBild() || z.laeuft ? 'disabled' : ''}>${sym(k, 18)}${t}</button>`).join('')}
      <label class="farbzeile"><input type="color" class="farbknopf" id="bildfarbe" value="${z.farbe}"> Malfarbe</label>
      <div class="fold" style="margin:12px 0 10px"></div>
      <span class="k-abschnitt">Bisherige Schritte</span>
      <div class="schritte">${z.verlauf.length ? z.verlauf.map((v, i) => `<button type="button" aria-current="${i === z.stand}" class="${i > z.stand ? 'zukunft' : ''}" data-aktion="bild-springe" data-i="${i}"><span>${esc(v.was)}</span><small>${i + 1}</small></button>`).reverse().join('') : '<span class="leise" style="font-size:13px;padding:0 10px">Noch keine.</span>'}</div>`;
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
    renderWerkzeuge();
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
  // ---------- Datei-Ansicht (gemeinsam mit allen Vögeln) ----------
  const NEU_IN_VERSION = ['Werkzeugzeile mit Einfügen und Gestalten', 'Datei-Ansicht mit Neu, Öffnen, Info, PowerPoint und Optionen', 'PowerPoint öffnen und als bearbeitbare PowerPoint speichern', 'Präsentieren mit Referentenansicht, Übergängen und Animationen'];
  const KA = { einstellungen: K.einstellungen, hirnTesten: () => K.hirn.testen() };
  function dateiAnsicht(start = 'info') {
    const offen = S.ansicht === 'werkbank' && S.projekt;
    const nav = offen
      ? [['neu', 'plus', 'Neu'], ['oeffnen', 'oeffnen', 'Öffnen'], ['info', 'info', 'Info'], '-', ['pptx', 'speichern', 'Als PowerPoint'], ['export', 'export', 'Exportieren'], '-', ['optionen', 'optionen', 'Optionen'], ['zu', 'schliessen', 'Schließen']]
      : [['neu', 'plus', 'Neu'], ['oeffnen', 'oeffnen', 'Öffnen'], '-', ['optionen', 'optionen', 'Optionen']];
    const T = OO.teile;
    const zumStart = async () => { if (S.ansicht !== 'start') await aktionen['zum-start'](); };
    OO.backstage({
      nav, start: offen ? start : (start === 'info' ? 'neu' : start), vogel: figur('ruhend', 54),
      klick: async (k, api) => {
        if (k === 'pptx') { api.zu(); aktionen['pptx-speichern'](); return true; }
        if (k === 'export') { api.zu(); aktionen.exportieren(); return true; }
        if (k === 'zu') { api.zu(); aktionen['zum-start'](); return true; }
        return false;
      },
      zeige: async (k, inhalt, api) => {
        if (k === 'neu') {
          const karten = [['entwurf', 'plus', 'Neuer Entwurf', 'Folie, Plakat, Post – Kranich faltet ihn dir'], ['pptx', 'folie', 'PowerPoint öffnen', 'Eine .pptx weiterbearbeiten'], ['app', 'tabelle', 'Ganze App', 'Mehrere Bildschirme mit Abläufen'], ['bild', 'datei', 'Bild bearbeiten', 'Freistellen, zuschneiden, Größe']];
          inhalt.innerHTML = `${T.titel('Neu')}<div class="oo-bs-kacheln">${karten.map(([a, ic, t, x]) => `<button type="button" class="oo-bs-kachel" data-neu="${a}"><span class="oo-bild">${OO.sym(ic, 34)}</span><b>${t}</b><small>${x}</small></button>`).join('')}</div>`;
          inhalt.onclick = async (ev) => { const b = ev.target.closest('[data-neu]'); if (!b) return; api.zu(); if (b.dataset.neu === 'pptx') return aktionen['pptx-neu'](); await zumStart(); aktionen.neu({ dataset: { art: b.dataset.neu } }); };
        } else if (k === 'oeffnen') {
          const liste = await K.projekte.liste(); const l = Array.isArray(liste) ? liste : [];
          inhalt.innerHTML = `${T.titel('Öffnen')}${T.gross('data-pptx', 'folie', 'PowerPoint öffnen …', '.pptx vom PC wählen – wird zu Folien in Kranich')}<h2>Zuletzt bearbeitet</h2>${l.slice(0, 14).map((p) => T.zeile(`data-proj="${esc(p.id)}"`, p.art === 'bild' ? 'datei' : 'folie', p.name, p.art === 'bild' ? 'Bild' : p.app ? 'Ganze App' : p.boards > 1 ? `${p.boards} Boards` : [p.formatName, p.mass].filter(Boolean).join(' · ') || 'Entwurf', H.wann(p.geaendert))).join('') || '<p class="oo-leise">Noch nichts gefaltet.</p>'}`;
          inhalt.onclick = (ev) => { if (ev.target.closest('[data-pptx]')) { api.zu(); aktionen['pptx-neu'](); return; } const pr = ev.target.closest('[data-proj]'); if (pr) { api.zu(); oeffne(pr.dataset.proj); } };
        } else if (k === 'info') {
          const p = S.projekt; const boards = p.seiten || []; const sx = seite();
          inhalt.innerHTML = `${T.titel('Info')}${T.kopf('folie', p.name, 'Liegt in Kranich – speichert sich nebenbei von selbst.')}
            <div class="oo-bs-knoepfe"><button type="button" class="oo-btn" data-x="pptx">${OO.sym('speichern', 16)} Als PowerPoint speichern</button><button type="button" class="oo-btn weiss" data-x="praes">${OO.sym('folie', 16)} Präsentieren</button><button type="button" class="oo-btn weiss" data-x="umbenennen">Umbenennen</button></div>
            <div class="oo-bs-spalten"><div><h2>Eigenschaften</h2>${T.info('Folien / Boards', boards.length)}${T.info('Mit Inhalt', boards.filter((x) => x.html).length)}${T.info('Format', esc(sx?.mass || `${sx?.breite} × ${sx?.hoehe}`))}${T.info('Mit Notizen', boards.filter((x) => x.notizen).length)}${T.info('Zuletzt geändert', esc(H.wann(p.geaendert)))}</div>
            <div><h2>Schutz</h2><p class="oo-leise">Alles speichert sich nebenbei in Kranich. Eine PowerPoint-Datei entsteht mit „Als PowerPoint speichern“ – Texte bleiben darin bearbeitbar.</p></div></div>`;
          inhalt.onclick = (ev) => { const x = ev.target.closest('[data-x]')?.dataset.x; if (!x) return; api.zu(); if (x === 'pptx') aktionen['pptx-speichern'](); if (x === 'praes') aktionen.praesentieren(); if (x === 'umbenennen') { const el = app.querySelector('[data-aktion="umbenennen"]'); if (el) aktionen.umbenennen(el); } };
        } else if (k === 'optionen') {
          const e = await K.einstellungen.lesen();
          const zeile = (t, x, inp) => `<div class="oo-op-zeile"><span><b>${t}</b><small>${x}</small></span>${inp}</div>`;
          const haken = (op, t, x, an) => `<label class="oo-op-zeile haken"><input type="checkbox" data-op="${op}" ${an ? 'checked' : ''}><span><b>${t}</b><small>${x}</small></span></label>`;
          const APPS = [['origami', 'origami'], ['kranich', 'Kranich'], ['albatros', 'Albatros'], ['schreiben', 'Schwalbe']];
          OO.optionen(inhalt, { A: KA, app: 'Kranich', vogelName: 'Kranich', vogel: figur('ruhend', 64), neu: NEU_IN_VERSION,
            extra: [
              ['look', 'Look', () => `${haken('standMitgeben', 'Aktuellen Stand mitschicken', 'Nennst du Kranich, Albatros oder das Startfenster, bekommt Claude Fotos vom aktuellen Stand dazu.', e.standMitgeben !== false)}
                <div class="oo-op-zeile"><span><b>Eigene Look-Regeln</b><small>Kranich hält sich bei jedem Entwurf daran.</small></span></div><textarea class="oo-feld oo-text" data-op="lookHinweise" rows="5" placeholder="z. B. Hauptknöpfe immer rechts unten">${esc(e.lookHinweise || '')}</textarea>`],
              ['heim', 'Heim-PC', () => `<p class="oo-leise">Andere Geräte (z. B. dein Arbeits-Notebook) schicken ihre Aufträge an diesen PC. Kranich muss dafür hier offen sein.</p>
                ${haken('heimFreigabe', 'Diesen PC freigeben', 'Nur mit dem Kopplungscode kommt jemand rein.', e.heimFreigabe)}
                ${zeile('Port', 'Unter diesem Port ist Kranich erreichbar.', `<input class="oo-feld kurz" data-op="heimPort" data-zahl value="${esc(e.heimPort || 4747)}">`)}
                ${zeile('Kopplungscode', 'Auf dem anderen Gerät eintragen.', `<span class="oo-reihe" style="margin:0"><input class="oo-feld" id="kr-eigencode" readonly value="${esc(e.heimEigenerCode || 'erscheint nach dem Speichern')}"><button type="button" class="oo-btn weiss" data-kr-kopie>Kopieren</button><button type="button" class="oo-btn weiss" data-kr-neu>Neu</button></span>`)}`],
              ['pc', 'Modell auf dem PC', () => `${haken('lokalAn', 'Kleine Änderungen lokal', 'Wünsche an ein einzelnes Element gehen zuerst an Ollama. Fällt Claude aus, springt der PC ein.', e.lokalAn)}
                ${zeile('Modell', 'Name in Ollama', `<input class="oo-feld" data-op="lokalModell" value="${esc(e.lokalModell || '')}">`)}${zeile('Adresse', 'Wo Ollama läuft', `<input class="oo-feld" data-op="lokalAdresse" value="${esc(e.lokalAdresse || '')}">`)}
                ${zeile('Programm', 'Nur ändern, wenn „claude“ nicht gefunden wird.', `<input class="oo-feld" data-op="claudeProgramm" value="${esc(e.claudeProgramm || 'claude')}">`)}`],
              ['ordner', 'App-Ordner', () => `<p class="oo-leise">Ziel für „In App-Projekt der Familie“ beim Exportieren.</p>${APPS.map(([key, t]) => zeile(t, '', `<span class="oo-reihe" style="margin:0"><input class="oo-feld" data-app="${key}" value="${esc(e.appOrdner?.[key] || '')}" placeholder="nicht gewählt"><button type="button" class="oo-btn weiss" data-kr-wahl="${key}">Wählen</button></span>`)).join('')}`],
            ],
            zurueck: () => api.zeige(offen ? 'info' : 'neu'),
            fertig: (wie) => { api.zu(); if (wie === 'rundgang') aktionen.rundgang(); else H.meldung('Optionen gespeichert.'); },
            nachSpeichern: async () => { await K.einstellungen.setzen({ appOrdner: Object.fromEntries([...inhalt.querySelectorAll('[data-app]')].map((i) => [i.dataset.app, i.value.trim()])) }); S.einstellungen = await K.einstellungen.lesen(); } });
          // Kranich-eigene Knöpfe in den Optionen
          inhalt.addEventListener('click', async (ev) => {
            if (ev.target.closest('[data-kr-kopie]')) { await navigator.clipboard.writeText(inhalt.querySelector('#kr-eigencode').value); H.meldung('Code kopiert.'); }
            if (ev.target.closest('[data-kr-neu]')) { const n = await K.einstellungen.neuerHeimCode(); inhalt.querySelector('#kr-eigencode').value = n.heimEigenerCode; H.meldung('Neuer Code – andere Geräte brauchen ihn jetzt.'); }
            const w = ev.target.closest('[data-kr-wahl]'); if (w) { const o = await K.datei.ordnerWaehlen(); if (o && !o.fehler) inhalt.querySelector(`[data-app="${w.dataset.krWahl}"]`).value = o; }
          });
          inhalt.querySelector('[data-op="heimFreigabe"]')?.addEventListener('change', async (ev2) => { await K.einstellungen.setzen({ heimFreigabe: ev2.target.checked, heimPort: Number(inhalt.querySelector('[data-op="heimPort"]').value) || 4747 }); const n = await K.einstellungen.lesen(); inhalt.querySelector('#kr-eigencode').value = n.heimEigenerCode || ''; H.meldung(n.heimFreigabe ? 'Dieser PC nimmt jetzt Aufträge an.' : 'Freigabe aus.'); });
        }
      },
    });
  }

  OO.auswahllisten();
  app.addEventListener('toggle', (ev) => { const k = ev.target.dataset?.klapp; if (k === 'ebenen') S.ebenenAuf = ev.target.open; if (k === 'bausteine') S.bausteineAuf = ev.target.open; }, true);
  const aktionen = {
    'datei-ansicht': () => dateiAnsicht(),
    'modus-bild': () => aktionen.modus({ dataset: { modus: 'bild' } }),
    'baustein-text': () => setzeWerkzeug('text'),
    'baustein-bild': () => setzeWerkzeug('bild'),
    'vortrag-menue': (el) => {
      const offen = app.querySelector('.vortrag-schwebe'); if (offen) { offen.remove(); el.setAttribute('aria-expanded', 'false'); return; }
      const r = el.getBoundingClientRect(); const v = document.createElement('div'); v.className = 'vortrag-schwebe paper';
      v.innerHTML = vortragInhalt(); v.style.cssText = `position:fixed;top:${Math.round(r.bottom + 8)}px;left:${Math.round(r.left)}px;z-index:9000`;
      app.appendChild(v); el.setAttribute('aria-expanded', 'true');
      setTimeout(() => document.addEventListener('mousedown', function weg(ev) { if (!v.contains(ev.target) && !el.contains(ev.target) && !ev.target.closest('.oo-auswahl')) { v.remove(); el.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', weg); } }), 0);
    },
    'lasche': (el) => { S.startLasche = el.dataset.lasche; if (S.ansicht !== 'start') return zeigeStart(); renderStart(); },
    'neu': (el) => {
      if (el.dataset.art === 'entwurf') { S.startLasche = 'neu'; renderStart(); return; }
      if (el.dataset.art === 'app') { S.startLasche = 'app'; renderStart(); return; }
      if (el.dataset.art === 'ausbild') return aktionen.anhang(null, { danach: (b) => neuesProjekt('entwurf', { anhang: b }) });
      return neuesProjekt(el.dataset.art);
    },
    'format-waehlen': (el) => { S.neuFormat = el.dataset.id; S.neuQuer = null; const w = document.getElementById('startwunsch')?.value; renderStart(); if (w) document.getElementById('startwunsch').value = w; },
    'format-gruppe': (el) => { S.formatGruppe = el.dataset.g; S.formatSuche = ''; const w = document.getElementById('startwunsch')?.value; renderStart(); if (w) document.getElementById('startwunsch').value = w; },
    'format-lage': (el) => { S.neuQuer = el.dataset.quer === '1'; const w = document.getElementById('startwunsch')?.value; renderStart(); if (w) document.getElementById('startwunsch').value = w; },
    'format-anlegen': async () => {
      const f = S.formate.find((x) => x.id === (S.neuFormat || 'web'));
      const b = Number(document.getElementById('eigen-b').value), h = Number(document.getElementById('eigen-h').value);
      const wunsch = document.getElementById('startwunsch')?.value.trim();
      const anhang = S.anhang; S.anhang = null;
      let format;
      if (S.formatGruppe === 'Eigen') {
        format = await K.formate.eigen(b, h, S.eigenEinheit || 'px');
      } else {
        const mm = mmWerte(f);
        const [ob, oh] = mm || [f.breite, f.hoehe];
        if (b === ob && h === oh) format = f;
        else if (b === oh && h === ob) format = { ...f, breite: f.hoehe, hoehe: f.breite, mass: mm ? `${oh} × ${ob} mm` : undefined };
        else format = await K.formate.eigen(b, h, mm ? 'mm' : 'px');
      }
      if (format?.fehler) { H.meldung(format.fehler.nachricht, { art: 'fehler' }); return; }
      return neuesProjekt('entwurf', { format, wunsch, anhang });
    },
    'probier': (el) => { const i = document.getElementById('startwunsch'); i.value = el.dataset.text; i.focus(); },
    'oeffnen-ordner': (el) => { S.oeffnenOrdner = el.dataset.o; S.oeffnenGewaehlt = null; renderStart(); },
    'projekt-waehlen': (el) => { if (S.oeffnenGewaehlt === el.dataset.id) return oeffne(el.dataset.id); S.oeffnenGewaehlt = el.dataset.id; renderStart(); },
    'einheit': (el) => { S.eigenEinheit = el.dataset.e; const b = document.getElementById('eigen-b').value, h = document.getElementById('eigen-h').value; renderStart(); document.getElementById('eigen-b').value = b; document.getElementById('eigen-h').value = h; },
    'eigen-anlegen': async () => {
      const f = await K.formate.eigen(document.getElementById('eigen-b').value, document.getElementById('eigen-h').value, S.eigenEinheit || 'px');
      if (f?.fehler) { H.meldung(f.fehler.nachricht, { art: 'fehler' }); return; }
      const wunsch = document.getElementById('startwunsch')?.value.trim();
      return neuesProjekt('entwurf', { format: f, wunsch, anhang: S.anhang });
    },
    'leer-anlegen': () => neuesProjekt('entwurf', { format: S.formate.find((x) => x.id === (S.neuFormat || 'web')) }),
    'start-falten': async () => {
      const wunsch = document.getElementById('startwunsch')?.value.trim();
      const anhang = S.anhang;
      if (!wunsch && !anhang) { document.getElementById('startwunsch')?.focus(); return; }
      S.anhang = null;
      let format = S.startLasche === 'neu' ? S.formate.find((x) => x.id === (S.neuFormat || 'web')) : undefined;
      // „Kranich sucht das passende Format selbst aus“: aus dem Satz raten (Insta-Post → quadratisch)
      if (!format && wunsch) { const g = await K.formate.raten(wunsch); if (g && !g.fehler && g.id) format = S.formate.find((x) => x.id === g.id) || g; }
      return neuesProjekt('entwurf', { wunsch, anhang, format });
    },
    'projekt-oeffnen': (el, e) => { if (e?.target?.closest('[data-aktion="projekt-weg-liste"]')) return; oeffne(el.dataset.id); },
    'projekt-weg': async (el) => {
      const p = S.liste.find((x) => x.id === el.dataset.id);
      if (!p || !window.confirm(`„${p.name}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return;
      await K.projekte.loeschen(p.id);
      zeigeStart();
    },
    rundgang: () => window.Rundgang?.start(RUNDGANG(), true),
    'zum-start': async () => { await speichernSpaeter.sofort(); S.startLasche = 'start'; zeigeStart(); },
    'einstellungen': () => dateiAnsicht('optionen'),
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
    'panel': () => { S.panelAuf = !S.panelAuf; const n = app.querySelector('.seitenleiste'); if (n) n.hidden = !S.panelAuf; renderSeitenleiste(); },
    // ⋯-Menü schwebt fest über allem (sonst verdeckt es die Leinwand)
    'kr-frage': (el) => { const t = app.querySelector('#wunsch'); if (!t) return; t.value = el.dataset.text; aktionen.senden(); },
    'mehr': (el) => {
      const offen = app.querySelector('.mehr-schwebe'); if (offen) { offen.remove(); el.setAttribute('aria-expanded', 'false'); return; }
      const m = el.nextElementSibling; const r = el.getBoundingClientRect();
      const s2 = document.createElement('div'); s2.className = 'mehrmenue mehr-schwebe paper'; s2.innerHTML = m.innerHTML;
      s2.style.cssText = `position:fixed;top:${Math.round(r.bottom + 6)}px;${el.hasAttribute('data-links') ? `left:${Math.round(r.left)}px` : `right:${Math.round(innerWidth - r.right)}px`};z-index:9000`;
      app.appendChild(s2); el.setAttribute('aria-expanded', 'true');
      setTimeout(() => document.addEventListener('click', () => { s2.remove(); el.setAttribute('aria-expanded', 'false'); }, { once: true }), 0);
    },
    'werkzeug': (el) => setzeWerkzeug(el.dataset.w),
    'werkzeug-hand': () => { S.werkzeug = 'zeiger'; S.hand = true; app.querySelector('.leinwand')?.classList.add('greifbereit', 'hand-an'); renderSeitenleiste(); },
    'werkzeug-zeiger': () => { S.werkzeug = 'zeiger'; app.querySelector('.leinwand')?.classList.remove('setzt'); S.hand = false; app.querySelector('.leinwand')?.classList.remove('greifbereit', 'hand-an'); renderSeitenleiste(); },
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
    'band-klappen': () => { S.bandZu = !S.bandZu; renderMitte(); },
    'fehler-details': () => {
      const f = S.kranich.fehler || {};
      const d = document.createElement('div'); d.className = 'schleier';
      d.innerHTML = `<div class="dialog paper schmal" role="dialog" aria-modal="true" style="width:min(640px,92vw);padding:20px 22px"><div class="reihe"><h2 class="h" style="flex:1;margin:0">Was ist passiert?</h2><button type="button" class="btn btn-q" data-zu>${sym('schliessen', 16)}</button></div>
        <p class="leise" style="margin:8px 0">${esc(f.nachricht || '')}</p><pre style="white-space:pre-wrap;word-break:break-word;max-height:50vh;overflow:auto;background:#f6f2ea;border-radius:8px;padding:12px;font:12.5px ui-monospace,Consolas,monospace">${esc(f.details || 'Keine Einzelheiten.')}</pre>
        <div class="reihe" style="justify-content:flex-end;gap:8px;margin-top:10px"><button type="button" class="btn" data-kopie>Kopieren</button><button type="button" class="btn btn-p" data-zu>Schließen</button></div></div>`;
      document.body.appendChild(d);
      d.addEventListener('click', async (e) => { if (e.target === d || e.target.closest('[data-zu]')) d.remove(); if (e.target.closest('[data-kopie]')) { await navigator.clipboard.writeText(`${f.nachricht}\n\n${f.details}`); H.meldung('Kopiert – schick es Claude.'); } });
    },
    'fertig-weg': () => setzeKranich('fertig', { variantenBereit: false }),
    'vorschlag': (el) => sendeEntwurf(el.dataset.text),
    'auswahl-weg': () => { Entwurf.waehle(null); },
    'ebene': (el, e) => { if (e?.target?.closest('[data-aktion="ebene-weg"]')) return; Entwurf.waehle(el.dataset.k); },
    'ebene-weg': (el) => loescheEbene(el.dataset.k),
    'projekt-loeschen': async () => {
      const p = S.projekt;
      if (!p || !window.confirm(`„${p.name}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return;
      await K.projekte.loeschen(p.id);
      S.projekt = null;
      zeigeStart();
      H.meldung('Projekt gelöscht.');
    },
    'projekt-weg-liste': async (el) => {
      const name = el.closest('.sk-zeile')?.title || 'Projekt';
      if (!window.confirm(`„${name}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return;
      await K.projekte.loeschen(el.dataset.id);
      await zeigeStart();
      H.meldung('Projekt gelöscht.');
    },
    'seite': (el, e) => {
      if (e?.target?.closest('[data-aktion="board-weg"]')) return;
      waehleBoard(el.dataset.id);
      Entwurf.zeigeBoard(el.dataset.id);
    },
    'board-weg': async (el) => {
      const b = S.projekt.seiten.find((x) => x.id === el.dataset.id);
      if (!b) return;
      if (S.projekt.seiten.length < 2) {
        if (!b.html || !window.confirm(`Board „${b.name}“ leeren? Strg+Z holt den Inhalt zurück.`)) return;
        S.seiteId = b.id; neueFassung('', 'Board geleert');
        Entwurf.zeigeAlle(S.projekt.seiten, b.id); zeigeBoards(); renderKopfKnoepfe(); renderVerlauf(); geaendert();
        return;
      }
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
    'schnell-loeschen': () => { if (S.auswahl?.k) loescheEbene(S.auswahl.k); },
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
    'praesentieren': () => praesentieren(0),
    'pptx-speichern': async () => {
      const boards = S.projekt.seiten.filter((b) => b.html).map((b) => ({ name: b.name, html: b.html, breite: b.breite, hoehe: b.hoehe, notiz: b.notiz || '' }));
      if (!boards.length) return;
      H.meldung('Kranich faltet die PowerPoint …', { dauer: 2500 });
      const folien = await PptxExport.folien(boards.map((b, i) => ({ ...b, html: Praesentation.mitMaster(b.html, b, i + 1, boards.length, S.projekt.master) })));
      const r = await K.export.pptx({ name: S.projekt.name, boards: folien, ziel: 'speichern' });
      if (r?.fehler) { H.meldung(r.fehler.nachricht, { art: 'fehler' }); return; }
      H.meldung(`Gespeichert: ${r.datei}`, { knopf: 'Im Ordner zeigen', aktion: () => K.datei.zeigen(r.datei), dauer: 9000 });
    },
    'pptx-oeffnen': () => pptxEinlesen(),
    'master-logo': async () => { const b = await K.datei.bildWaehlen(); if (!b || b.fehler) return; (S.projekt.master ||= {}).logo = b.dataUrl; S.masterAuf = true; geaendert({ vorschau: false }); renderSeitenleiste(); },
    'master-logo-weg': () => { if (S.projekt.master) delete S.projekt.master.logo; S.masterAuf = true; geaendert({ vorschau: false }); renderSeitenleiste(); },
    'pptx-neu': () => pptxEinlesen(true),
    'albatros-tabelle': () => albatrosEinfuegen(),
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
  // Dateien aufs Fenster ziehen: deutliche Rückmeldung, PowerPoint überall, Bilder auf der Startseite
  let ziehUhr = null;
  const ziehAnzeige = (an) => {
    document.body.classList.toggle('zieht-datei', an);
    let z = document.querySelector('.zieh-hinweis');
    if (an && !z) { z = document.createElement('div'); z.className = 'zieh-hinweis'; z.innerHTML = `<div>${figur('fertig', 70)}<b>Loslassen zum Öffnen</b><small>${S.ansicht === 'werkbank' ? 'Bild kommt in den Entwurf · PowerPoint wird angehängt' : 'PowerPoint (.pptx) oder Bild'}</small></div>`; document.body.appendChild(z); }
    if (!an) z?.remove();
  };
  document.addEventListener('dragover', (e) => {
    if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
    e.preventDefault(); try { e.dataTransfer.dropEffect = 'copy'; } catch { /* egal */ }
    ziehAnzeige(true); clearTimeout(ziehUhr); ziehUhr = setTimeout(() => ziehAnzeige(false), 180);
  });
  document.addEventListener('drop', async (e) => {
    clearTimeout(ziehUhr); ziehAnzeige(false);
    const f = e.dataTransfer?.files?.[0]; if (!f) return;
    if (/\.pptx$/i.test(f.name)) { e.preventDefault(); const lade = document.createElement('div'); lade.className = 'zieh-hinweis lade'; lade.innerHTML = `<div>${figur('arbeitend', 70)}<b>Öffne „${esc(f.name)}“ …</b></div>`; document.body.appendChild(lade); try { await pptxEinlesen(S.ansicht !== 'werkbank', K.pfadVon(f)); } finally { lade.remove(); } return; }
    if (e.defaultPrevented) return; // Bild auf der Leinwand: macht die Leinwand selbst
    e.preventDefault();
    if (f.type.startsWith('image/') && S.ansicht !== 'werkbank') { const dataUrl = await H.dateiAlsDataUrl(f); neuesProjekt('bild', { anhang: { name: f.name, dataUrl } }); return; }
    H.meldung('Das kann ich nicht öffnen – nur PowerPoint (.pptx) und Bilder.');
  });

  // Vortrag: Notizen und Übergang je Folie
  app.addEventListener('input', (e) => {
    if (e.target.id === 'vt-notiz' && seite()) { seite().notiz = e.target.value; geaendert({ vorschau: false }); }
    if (e.target.id === 'vt-fuss') { (S.projekt.master ||= {}).fuss = e.target.value.slice(0, 120); geaendert({ vorschau: false }); }
  });
  app.addEventListener('change', (e) => {
    if (e.target.id === 'vt-anim') {
      const a = Entwurf.aktiv(); const el = S.auswahl?.k ? Entwurf.element(S.auswahl.k) : null; if (!a || !el) return;
      if (e.target.value) { if (!el.dataset.anim) el.dataset.animNr = String(Math.max(0, ...[...a.doc.querySelectorAll('[data-anim]')].map((x) => Number(x.dataset.animNr) || 0)) + 1); el.dataset.anim = e.target.value; }
      else { delete el.dataset.anim; delete el.dataset.animNr; }
      Entwurf.speichereDirekt(a.b, 'animation'); renderSeitenleiste(); return;
    }
    if (e.target.id === 'vt-nummer') { (S.projekt.master ||= {}).nummer = e.target.checked; geaendert({ vorschau: false }); return; }
    if (e.target.id === 'vt-uebergang' && seite()) { seite().uebergang = e.target.value === 'keiner' ? undefined : e.target.value; geaendert({ vorschau: false }); }
  });
  // Folien-Reihenfolge per Ziehen in der Board-Liste
  let gezogen = null;
  app.addEventListener('dragstart', (e) => {
    const z = e.target.closest?.('.boardzeile'); if (!z) return;
    gezogen = z.dataset.id; z.classList.add('zieht'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', gezogen);
  });
  app.addEventListener('dragover', (e) => {
    const z = e.target.closest?.('.boardzeile'); if (!z || !gezogen) return;
    e.preventDefault();
    app.querySelectorAll('.ziel-oben,.ziel-unten').forEach((x) => x.classList.remove('ziel-oben', 'ziel-unten'));
    const r = z.getBoundingClientRect(); z.classList.add(e.clientY < r.top + r.height / 2 ? 'ziel-oben' : 'ziel-unten');
  });
  app.addEventListener('dragend', () => { gezogen = null; app.querySelectorAll('.zieht,.ziel-oben,.ziel-unten').forEach((x) => x.classList.remove('zieht', 'ziel-oben', 'ziel-unten')); });
  app.addEventListener('drop', (e) => {
    const z = e.target.closest?.('.boardzeile'); if (!z || !gezogen || !S.projekt) return;
    e.preventDefault();
    const liste = S.projekt.seiten; const von = liste.findIndex((x) => x.id === gezogen);
    if (von < 0 || z.dataset.id === gezogen) return;
    const [b] = liste.splice(von, 1);
    let nach = liste.findIndex((x) => x.id === z.dataset.id);
    if (z.classList.contains('ziel-unten')) nach++;
    liste.splice(nach, 0, b);
    gezogen = null; renderSeitenleiste(); geaendert({ vorschau: false });
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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); S.startLasche = 'neu'; if (S.ansicht === 'start') renderStart(); else aktionen['zum-start']().then(() => { S.startLasche = 'neu'; renderStart(); }); return; }
    if (S.ansicht !== 'werkbank') return;
    if (document.querySelector('.schleier, .abspielen, .vortrag')) return;
    if (e.key === 'F5' && S.modus === 'entwurf') { e.preventDefault(); praesentieren(e.shiftKey ? 'aktuell' : 0); return; }
    const tippt = /input|textarea/i.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !tippt) { e.preventDefault(); aktionen.rueckgaengig(); }
    if (S.modus === 'bild' && !tippt) {
      if (e.key === 'Enter' && Bild.z.zuschnitt) { aktionen['zuschnitt-an'](); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && Bild.z.auswahl) Bild.auswahlLoeschen();
      if (e.key === 'Escape') { Bild.zuschnittAbbrechen(); Bild.auswahlAufheben(); renderWerkzeugOptionen(); }
    }
    if (S.modus === 'entwurf' && e.key === 'Escape' && !tippt) { Entwurf.waehle(null); setzeWerkzeug('zeiger'); }
    if (S.modus === 'entwurf' && !tippt && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const t = { v: 'zeiger', t: 'text', r: 'rechteck', b: 'bild', n: 'notiz' }[e.key.toLowerCase()];
      if (t) { e.preventDefault(); if (t === 'zeiger') aktionen['werkzeug-zeiger'](); else setzeWerkzeug(t); }
      if (e.key.toLowerCase() === 'h') { e.preventDefault(); aktionen['werkzeug-hand'](); }
    }
    if (S.modus === 'entwurf' && (e.key === 'Delete' || e.key === 'Backspace') && !tippt && S.auswahl?.k) { e.preventDefault(); loescheEbene(S.auswahl.k); }
  });

  window.addEventListener('beforeunload', () => { speichernSpaeter.sofort(); });

  window.App = {
    zeigeStart, oeffne, neuesProjekt, aktionen, S, renderWerkbank, sendeEntwurf, sendeBild,
    renderStart, kopfHtml, seite, chat, setzeKranich, renderVerlauf, renderMitte, renderSeitenleiste, renderKopfKnoepfe,
    zeigeBoards, waehleBoard, geaendert, mehrMenue, speichernSpaeter, pruefeUndRepariere, pruefBericht, formatSymbol,
    get auftragNr() { return auftragNr; }, neuerAuftrag: () => ++auftragNr,
  };

  Direkt.init({ S, sende: (t) => sendeEntwurf(t), loesche: (k) => loescheEbene(k), speichern: () => geaendert({ vorschau: false }), werkzeug: (w) => (w === 'zeiger' ? aktionen['werkzeug-zeiger']() : setzeWerkzeug(w)), waehleBoard: (id) => waehleBoard(id) });
  Direkt.verbindeApp(app);

  (async () => {
    S.einstellungen = await K.einstellungen.lesen();
    const fl = await K.formate.liste();
    S.formate = fl.formate || []; S.gruppen = fl.gruppen || [];
    zeigeStart();
    K.beimOeffnen?.((id) => oeffne(id));
  })();
})();
