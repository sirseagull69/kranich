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

  function renderStart() {
    const l = S.startLasche;
    let blatt, titel = '';
    if (l === 'start') {
      blatt = `<div class="startraster">
        <section class="paper heldkarte">
          <span class="k-abschnitt">${esc(gruss())}</span>
          <h1 class="h">Was soll heute entstehen?</h1>
          <span class="leise">Sag Kranich in einem Satz, was du brauchst. Den Rest faltet er.</span>
          <span class="hand notiz">Ein Satz reicht!</span>
          <div class="heldeingabe"><input id="startwunsch" class="feld" placeholder="z. B. Ein Plakat für den Flohmarkt am Samstag, fröhlich und gut lesbar" aria-label="Was soll Kranich falten?">
            <button type="button" class="btn btn-q" data-aktion="anhang" title="Bild oder Skizze anhängen" aria-label="Bild anhängen">${sym('klammer', 18)}</button>
            <button type="button" class="btn btn-p btn-gross" data-aktion="start-falten">${figur('arbeitend', 18)} Entwerfen</button></div>
          ${S.anhang ? `<span class="anhang"><img src="${S.anhang.dataUrl}" alt=""><span class="leise">${esc(S.anhang.name || 'Bild')} – wird zum Entwurf</span><button type="button" class="btn btn-s btn-q" data-aktion="anhang-weg">Entfernen</button></span>` : ''}
          <div class="probier"><span class="k-abschnitt">Probier mal</span>${PROBIER.map((t) => `<button type="button" class="btn btn-s" data-aktion="probier" data-text="${esc(t)}">${esc(t)}</button>`).join('')}</div>
          ${eselsohr(28, '#f6f1e7')}
        </section>
        <section class="paper blattkarte">
          <button type="button" class="startkarte blattknopf" data-aktion="neu" data-art="entwurf"><div class="bildfeld vf"><span class="blattsym"><i></i></span><span class="plusrund">${sym('plus', 22, 2.6)}</span><span class="kreis"></span><span class="pille"></span></div>
          <b class="h">Leeres Blatt</b><span class="leise">App-Seite, Webseite, Post, Plakat oder Folie wählen</span></button>
          <button type="button" class="btn btn-p btn-gross btn-breit" data-aktion="neu" data-art="entwurf">${sym('plus', 16, 2.4)} Neuer Entwurf</button>
          ${eselsohr(28, '#f6f1e7')}
        </section>
        <div class="mehrreihe">
          ${karteNeu('app', 'Ganze App entwerfen', 'Alle Bildschirme mit Plan, Abläufen und Zuständen', `<div class="mini-app">${'<i></i>'.repeat(4)}<i class="v"></i><i class="f"></i></div>`)}
          ${karteNeu('bild', 'Bild bearbeiten', 'Zuschneiden, freistellen, Farben – per Wort oder Werkzeug', '<span class="mini-bild"></span>')}
          ${karteNeu('ausbild', 'Aus Bild eine Oberfläche', 'Screenshot oder Skizze rein, bearbeitbarer Entwurf raus', '<span class="mini-aus"><i></i><b></b></span>')}
        </div>
      </div>
      <div class="zuletztkopf"><div class="laschen klein" role="tablist"><button type="button" role="tab" aria-selected="true">Zuletzt bearbeitet</button></div><div class="platz"></div>
        ${S.liste.length ? `<button type="button" class="btn btn-q" data-aktion="lasche" data-lasche="alle">Alle ${S.liste.length} Entwürfe ${sym('pfeilrechts', 16)}</button>` : ''}</div>
      <div class="projektliste">${S.liste.length ? S.liste.slice(0, 4).map(projektKarte).join('') : `<div class="leerhinweis">${figur('ruhend', 40)}<span>Noch nichts gefaltet. Schreib oben einen Satz – oder nimm ein leeres Blatt.</span></div>`}</div>`;
    } else if (l === 'app') {
      titel = 'Ganze App';
      blatt = `<section class="paper startblatt">${AppBau.renderAuftrag()}${eselsohr(54, '#f6f1e7')}</section>`;
    } else if (l === 'alle') {
      titel = 'Entwurf öffnen';
      blatt = renderOeffnen();
    } else {
      titel = 'Format wählen';
      blatt = renderFormate();
    }
    app.innerHTML = `<section class="ansicht" id="start" data-lasche="${l}">
      <header class="kopf k-kopf"><button type="button" class="marke" data-aktion="lasche" data-lasche="start" title="Start">${figur('ruhend', 34)}<span class="h">Kranich</span></button><span class="chip chip-rand">Selbst gfaltet</span>
        ${l !== 'start' ? `<span class="trenner"></span><span class="brot"><span class="leise">${l === 'neu' ? 'Neues Board' : 'Kranich'}</span>${sym('rechts', 14)}<b class="h">${titel}</b></span>${l === 'neu' ? '<span class="chip chip-voll">1 · Format</span><span class="chip chip-rand">2 · Leinwand</span>' : ''}` : ''}
        <div class="platz"></div>
        ${l !== 'start' ? `<button type="button" class="btn btn-q" data-aktion="lasche" data-lasche="start">${sym('links', 16)} Zurück</button>` : `<button type="button" class="btn btn-q" data-aktion="lasche" data-lasche="alle">${sym('ordner', 16)} Öffnen</button>`}
        <button type="button" class="btn btn-q" data-aktion="einstellungen">${sym('zahnrad', 16)} Einstellungen</button>
        <span class="avatar h" aria-label="Angemeldet als Nils">NP</span></header>
      <div class="startkoerper ${l}">${blatt}</div></section>`;
    document.getElementById('startwunsch')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') aktionen['start-falten'](); });
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
        <div class="platz"></div><span class="hand notiz-unten">Ordner kommen bald ↓</span></nav>
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
        <div class="platz"></div><span class="hand notiz-unten">Flyer, Visitenkarte?<br>Einfach eigene Maße!</span></nav>
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
    const unter = S.ansicht === 'varianten' ? 'Varianten' : S.modus === 'bild' ? 'Bild bearbeiten' : n > 1 ? `${n} Boards` : (seite()?.name || '');
    return `<header class="kopf k-kopf"><button type="button" class="marke" data-aktion="zum-start" title="Zur Startseite">${figur('ruhend', 34)}<span class="h">Kranich</span></button>
      <button type="button" class="btn btn-q zurueckknopf" data-aktion="zum-start">${sym('links', 16)} Alle Entwürfe</button>
      <span class="trenner" aria-hidden="true"></span>
      <div class="titel"><b class="h" data-aktion="umbenennen" title="Zum Umbenennen klicken">${esc(p.name)}</b><span class="unter">${esc(unter)}</span></div>
      <div class="platz"></div>
      <div class="modus" role="group" aria-label="Modus">
        <button type="button" aria-pressed="${S.modus === 'entwurf'}" data-aktion="modus" data-modus="entwurf">${sym('seite', 15)} Entwurf</button>
        <button type="button" aria-pressed="${S.modus === 'bild'}" data-aktion="modus" data-modus="bild">${sym('bild', 15)} Bild</button></div>
      <div class="platz"></div>
      <span class="chip speicherchip chip-gruen">${sym('haken', 13)}Gespeichert</span>
      <div class="reihe">${rechts}</div><span class="avatar h" aria-label="Angemeldet als Nils">NP</span></header>`;
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
        ${bild ? '<nav class="werkzeuge" aria-label="Werkzeuge"></nav>' : `<nav class="werkzeugleiste" aria-label="Werkzeuge">${schiene()}</nav><nav class="seitenleiste" aria-label="Boards und Ebenen" ${S.panelZu ? 'hidden' : ''}></nav>`}
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
      if (S.hand) leinwand.classList.add('greifbereit', 'hand-an');
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

  function schiene() {
    const s = seite();
    const offen = s?.pruefung?.offen?.length || 0;
    const k = (aktion, ic, titel, extra = '') => `<button type="button" class="schienenknopf" data-aktion="${aktion}" title="${titel}" aria-label="${titel}" ${extra}>${sym(ic, 19)}</button>`;
    return `${k('werkzeug-zeiger', 'zeiger', 'Auswählen', `aria-pressed="${!S.hand}"`)}
      ${k('werkzeug-hand', 'hand', 'Verschieben (Leertaste)', `aria-pressed="${Boolean(S.hand)}"`)}
      <span class="schienenfalz"></span>
      ${k('panel', 'ebenen', 'Boards und Ebenen', `aria-pressed="${!S.panelZu}"`)}
      ${k('board-dazu', 'plus', 'Board hinzufügen')}
      ${k('app-pruefung', 'haken', 'Selbstprüfung', s?.html ? '' : 'disabled')}${offen ? `<span class="schienenzahl">${offen}</span>` : ''}
      ${k('alle-groessen', 'mischen', 'Alle Größen', s?.html && !S.projekt?.app?.plan ? '' : 'disabled')}
      <div class="platz"></div>
      ${k('modus', 'bild', 'Bild bearbeiten', 'data-modus="bild"')}`;
  }

  function boardZeile(x, aktiv, mehrere, klein) {
    const st = x.html ? (x.pruefung?.offen?.length ? ['gelb', `${x.pruefung.offen.length} offen`] : ['gruen', 'fertig']) : ['leer', 'leer'];
    return `<button type="button" class="boardzeile ${klein ? 'klein' : ''}" aria-current="${aktiv}" data-aktion="seite" data-id="${x.id}" title="${esc(x.name)} – Doppelklick zum Umbenennen">
      ${klein ? '' : `<span class="bz-bild"><i style="aspect-ratio:${x.breite}/${x.hoehe};${x.breite >= x.hoehe ? 'width:34px' : 'height:28px'}"></i></span>`}<span class="bz-txt"><span class="bz-name">${esc(klein ? (x.name.split(' · ')[1] || x.name) : x.name)}</span>${klein ? '' : `<small>${esc(x.mass || `${x.breite} × ${x.hoehe}`)}</small>`}</span>
      <i class="punkt ${st[0]}" title="${st[1]}"></i>${mehrere ? `<span class="loesch" role="button" tabindex="-1" aria-label="Board löschen" data-aktion="board-weg" data-id="${x.id}">${sym('muell', 13)}</span>` : ''}</button>`;
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
    nav.innerHTML = `<div class="panelkopf"><span class="k-abschnitt">Boards</span><span class="chip chip-grau">${fertig}/${alle.length}</span><div class="platz"></div><button type="button" class="btn btn-s btn-q" data-aktion="board-dazu" aria-label="Board dazu" title="Board dazu">${sym('plus', 16, 2.4)}</button></div>
      <div class="seitenlaschen">${liste}</div>
      <div class="fold"></div>
      <div class="panelkopf"><span class="k-abschnitt">Ebenen</span><span class="leise ebenenname">${esc(s.name)}</span></div>
      <div class="ebenen">${S.ebenen.length ? S.ebenen.map((e) => `<button type="button" aria-current="${S.auswahl?.k === e.k}" data-aktion="ebene" data-k="${e.k}" style="padding-left:${8 + e.tiefe * 14}px">${sym(['button', 'a', 'input'].includes(e.tag) ? 'box' : /^h\d|p|label$/.test(e.tag) ? 'text' : ['ul', 'ol', 'nav', 'table'].includes(e.tag) ? 'liste' : 'box', 14)}<span>${esc(e.name)}</span></button>`).join('') : '<span class="leise" style="font-size:13px;padding:2px 8px">Noch leer – sobald Kranich faltet, stehen hier die Teile.</span>'}</div>`;
    nav.querySelector('.boardzeile[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
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
    aside.innerHTML = `<div class="leistenkopf"><span class="leistenfigur">${figur(haltung, 34)}</span><div class="lk-txt"><b class="h">Kranich hilft mit</b><span class="hand">${hand}</span></div><span class="chip ${chipArt}">${chip}</span></div>
      <div class="leistenlaschen" role="tablist"><button type="button" role="tab" aria-selected="${!verlaufAn}" data-aktion="leiste" data-lasche="kranich">Kranich</button><button type="button" role="tab" aria-selected="${verlaufAn}" data-aktion="leiste" data-lasche="verlauf">Verlauf</button></div>
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
    el.innerHTML = `${auswahlChip}
      ${S.anhang && S.modus === 'entwurf' ? `<span class="anhang"><img src="${S.anhang.dataUrl}" alt=""><span class="leise" style="font-size:12.5px">${esc(S.anhang.name)} – wird zum Entwurf</span><button type="button" class="btn btn-s btn-q" data-aktion="anhang-weg">Entfernen</button></span>` : ''}
      <div class="wunschzeile"><div class="wunschbox"><textarea id="wunsch" rows="1" aria-label="Dein Wunsch an Kranich" placeholder="${S.modus === 'bild' ? 'z. B. „Hintergrund weg, 1080 × 1080“' : S.auswahl ? `Was soll mit „${esc(S.auswahl.name)}“ passieren?` : 'Was soll Kranich entwerfen?'}"></textarea>
        <button type="button" class="btn btn-s btn-q" data-aktion="${S.modus === 'bild' ? 'bild-einfuegen' : 'anhang'}" title="Bild anhängen" aria-label="Bild anhängen">${sym('klammer', 16)}</button></div>
        <button type="button" class="btn btn-p sendeknopf" data-aktion="senden" aria-label="Senden" title="Senden (Enter)" ${denkt ? 'disabled' : ''}>${sym('pfeilrechts', 18, 2.4)}</button></div>`;
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
          <span class="hand notiz-unten">nichts dabei? einfach nochmal!</span>
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
    nav.innerHTML = `<span class="k-abschnitt">Werkzeuge</span>
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
  const aktionen = {
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
    'panel': () => { S.panelZu = !S.panelZu; const n = app.querySelector('.seitenleiste'); if (n) n.hidden = S.panelZu; renderSeitenleiste(); },
    'werkzeug-hand': () => { S.hand = true; app.querySelector('.leinwand')?.classList.add('greifbereit', 'hand-an'); renderSeitenleiste(); },
    'werkzeug-zeiger': () => { S.hand = false; app.querySelector('.leinwand')?.classList.remove('greifbereit', 'hand-an'); renderSeitenleiste(); },
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
