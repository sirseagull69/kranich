'use strict';
// Albatros – Oberfläche: Start, Tabelle, Helfer, Diagramm, Einstellungen.
(function () {
  const A = window.ALB;
  const Fo = window.Formeln;
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Kleinkram ----------
  const ICON = {
    links: 'M15 18l-6-6 6-6', zahnrad: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    zurueck: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3', vor: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3', plus: 'M12 5v14M5 12h14', muell: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
    sortieren: 'M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4', diagramm: 'M4 20V10M10 20V4M16 20v-7M22 20H2', export: 'M12 3v12M7 10l5 5 5-5M5 21h14', oeffnen: 'M3 7h6l2 2h10v10H3z',
    senden: 'M12 19V5M5 12l7-7 7 7', summe: 'M18 4H6l6 8-6 8h12', fx: 'M9 20c2 0 2-2 3-8s1-8 3-8M7 12h8', lupe: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3', farbe: 'M12 3l7 7-7 7-7-7 7-7zM19 18a2 2 0 0 0 4 0c0-1.5-2-4-2-4s-2 2.5-2 4z',
    tabelle: 'M3 4h18v16H3zM3 10h18M3 15h18M9 4v16M15 4v16', zeile: 'M3 6h18M3 12h18M12 15v6M9 18h6', spalte: 'M6 3v18M12 3v18M15 12h6M18 9v6', gruppe: 'M4 6h16M4 12h10M4 18h6',
  };
  const sym = (n, g = 16, d = 2) => `<svg width="${g}" height="${g}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${d}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="${ICON[n] || ''}"/></svg>`;
  const vogel = (anim, g) => { const v = window.VOGEL?.[anim] || window.VOGEL?.['ruhezustand-3']; return v ? v.replace(/__G__/g, g).replace(' aria-hidden="true"', ' role="img" aria-label="Albatros"') : ''; };
  function meldung(text, { knopf, aktion, dauer = 3600 } = {}) {
    document.querySelector('.meldung')?.remove();
    const m = document.createElement('div'); m.className = 'meldung'; m.setAttribute('role', 'status');
    m.innerHTML = `<span>${esc(text)}</span>${knopf ? `<button type="button">${esc(knopf)}</button>` : ''}`;
    if (knopf) m.querySelector('button').onclick = () => { aktion(); m.remove(); };
    document.body.appendChild(m); setTimeout(() => m.remove(), dauer);
  }
  function wann(iso) {
    if (!iso) return '';
    const d = new Date(iso), j = new Date();
    const zeit = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === j.toDateString()) return `Heute, ${zeit}`;
    const g = new Date(j); g.setDate(j.getDate() - 1);
    if (d.toDateString() === g.toDateString()) return `Gestern, ${zeit}`;
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  }
  const gruss = () => { const h = new Date().getHours(); return h < 11 ? 'Guten Morgen, Nils' : h < 17 ? 'Hallo, Nils' : 'Guten Abend, Nils'; };
  const kuerzel = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  // ---------- Zustand ----------
  const S = {
    ansicht: 'start', liste: [], einst: {}, t: null, blattNr: 0,
    anker: { sp: 0, ze: 0 }, ende: { sp: 0, ze: 0 }, bearbeiten: null,
    zurueck: [], vor: [], werte: {}, denkt: false, kopiert: null,
  };
  const blatt = () => S.t.blaetter[S.blattNr];

  // ---------- Vorlagen (sofort, ohne Claude) ----------
  const VORLAGEN = {
    haushalt: { name: 'Haushaltsbuch', anim: 'rechnet', text: 'Einnahmen und Ausgaben pro Monat, mit Saldo.', blatt: { zellen: { A1: 'Datum', B1: 'Beschreibung', C1: 'Kategorie', D1: 'Einnahme', E1: 'Ausgabe', A2: '01.11.2026', B2: 'Gehalt', C2: 'Arbeit', D2: '2650', A3: '02.11.2026', B3: 'Miete', C3: 'Wohnen', E3: '820', A4: '04.11.2026', B4: 'Einkauf', C4: 'Essen', E4: '86,40', A5: '09.11.2026', B5: 'Strom', C5: 'Wohnen', E5: '74', A6: '12.11.2026', B6: 'Tanken', C6: 'Auto', E6: '62,10', A8: '', B8: 'Summe', D8: '=SUMME(D2:D7)', E8: '=SUMME(E2:E7)', B9: 'Bleibt übrig', E9: '=D8-E8' }, formate: { 'D2:E9': 'eur' }, fett: { 'A1:E1': true, 'B8:E9': true }, farben: { E9: '#d4ecdc' }, breiten: { A: 110, B: 220, C: 130 } } },
    nebenkosten: { name: 'Nebenkosten', anim: 'vergleicht', text: 'Heizung, Wasser und Müll gerecht aufteilen.', blatt: { zellen: { A1: 'Posten', B1: 'Kosten im Jahr', C1: 'Mein Anteil', D1: 'Ich zahle', A2: 'Heizung', B2: '1840', C2: '0,25', D2: '=B2*C2', A3: 'Wasser', B3: '620', C3: '0,25', D3: '=B3*C3', A4: 'Müll', B4: '310', C4: '0,25', D4: '=B4*C4', A5: 'Hausstrom', B5: '180', C5: '0,25', D5: '=B5*C5', A7: 'Summe', B7: '=SUMME(B2:B6)', D7: '=SUMME(D2:D6)', A8: 'Pro Monat', D8: '=D7/12' }, formate: { 'B2:B7': 'eur', 'C2:C5': 'prozent', 'D2:D8': 'eur' }, fett: { 'A1:D1': true, 'A7:D8': true }, farben: {}, breiten: { A: 170, B: 140, C: 120, D: 120 } } },
    verein: { name: 'Vereinskasse', anim: 'sortiert', text: 'Beiträge, Spenden und Belege fürs Jahr.', blatt: { zellen: { A1: 'Datum', B1: 'Beschreibung', C1: 'Kategorie', D1: 'Einnahme', E1: 'Ausgabe', F1: 'Bezahlt', A2: '01.11.2026', B2: 'Mitgliedsbeiträge', C2: 'Beiträge', D2: '1240', F2: 'ja', A3: '03.11.2026', B3: 'Hallenmiete', C3: 'Miete', E3: '420', F3: 'ja', A4: '05.11.2026', B4: 'Trikots Jugend', C4: 'Ausstattung', E4: '318,60', F4: 'ja', A5: '08.11.2026', B5: 'Kuchenverkauf', C5: 'Feste', D5: '286,50', F5: 'ja', A6: '17.11.2026', B6: 'Schiedsrichter', C6: 'Spielbetrieb', E6: '60', F6: 'offen', A8: '', B8: 'Summe', D8: '=SUMME(D2:D7)', E8: '=SUMME(E2:E7)', B9: 'Kassenstand', E9: '=D8-E8', B10: 'Offen', E10: '=ZÄHLENWENN(F2:F7;"offen")' }, formate: { 'D2:E9': 'eur' }, fett: { 'A1:F1': true, 'B8:E10': true }, farben: { F6: '#f8e1a8' }, breiten: { A: 110, B: 200, C: 130 } } },
    fahrten: { name: 'Fahrtenbuch', anim: 'tabelle-baut', text: 'Kilometer erfassen, Pauschale rechnet sich selbst.', blatt: { zellen: { A1: 'Datum', B1: 'Ziel', C1: 'Zweck', D1: 'km', E1: 'Pauschale', A2: '03.11.2026', B2: 'Stuttgart', C2: 'Kunde', D2: '38', E2: '=D2*0,3', A3: '10.11.2026', B3: 'Böblingen', C3: 'Lieferant', D3: '14', E3: '=D3*0,3', A4: '18.11.2026', B4: 'Sindelfingen', C4: 'Messe', D4: '22', E4: '=D4*0,3', A6: 'Summe', D6: '=SUMME(D2:D5)', E6: '=SUMME(E2:E5)' }, formate: { 'E2:E6': 'eur', 'D2:D6': 'ganz' }, fett: { 'A1:E1': true, 'A6:E6': true }, farben: {}, breiten: { A: 110, B: 160, C: 160 } } },
  };
  const BEISPIELE = ['Mehrwertsteuer aus 1.190 €', 'Ratenkredit 10.000 € über 5 Jahre', 'Urlaubskasse für 4 Leute'];

  // ---------- Bereiche ----------
  function sammle(bereichText) {
    const b = Fo.bereich(bereichText); if (!b) return [];
    const aus = [];
    for (let ze = b.ze1; ze <= b.ze2; ze++) for (let sp = b.sp1; sp <= b.sp2; sp++) aus.push(Fo.adresse(sp, ze));
    return aus;
  }
  const auswahl = () => ({ sp1: Math.min(S.anker.sp, S.ende.sp), sp2: Math.max(S.anker.sp, S.ende.sp), ze1: Math.min(S.anker.ze, S.ende.ze), ze2: Math.max(S.anker.ze, S.ende.ze) });
  const auswahlText = () => { const a = auswahl(); const x = Fo.adresse(a.sp1, a.ze1), y = Fo.adresse(a.sp2, a.ze2); return x === y ? x : `${x}:${y}`; };
  function groesse(b) {
    let sp = 0, ze = 0;
    for (const a of Object.keys(b.zellen)) { const z = Fo.zerlege(a); if (z) { sp = Math.max(sp, z.sp); ze = Math.max(ze, z.ze); } }
    return { sp, ze };
  }

  // ---------- Speichern und Rückgängig ----------
  let speicherUhr = null;
  function geaendert() {
    S.werte = Fo.rechneAlles(blatt());
    const chip = document.querySelector('.gespeichert'); if (chip) chip.textContent = 'speichert …';
    clearTimeout(speicherUhr);
    speicherUhr = setTimeout(async () => { const r = await A.tabellen.speichern(S.t); const c = document.querySelector('.gespeichert'); if (c) c.textContent = r?.fehler ? 'nicht gespeichert!' : 'gespeichert'; }, 500);
  }
  function merke() {
    S.zurueck.push(JSON.stringify(blatt())); if (S.zurueck.length > 60) S.zurueck.shift();
    S.vor = [];
  }
  function rueckgaengig() { if (!S.zurueck.length) return; S.vor.push(JSON.stringify(blatt())); S.t.blaetter[S.blattNr] = JSON.parse(S.zurueck.pop()); geaendert(); zeichneTabelle(); }
  function wiederholen() { if (!S.vor.length) return; S.zurueck.push(JSON.stringify(blatt())); S.t.blaetter[S.blattNr] = JSON.parse(S.vor.pop()); geaendert(); zeichneTabelle(); }

  function setze(a, roh) {
    const b = blatt();
    if (roh === null || roh === undefined || roh === '') delete b.zellen[a];
    else b.zellen[a] = String(roh);
  }

  // ---------- Start ----------
  async function zeigeStart() {
    S.ansicht = 'start'; S.t = null;
    S.liste = (await A.tabellen.liste()) || [];
    if (S.liste.fehler) S.liste = [];
    const e = S.einst;
    const status = e.weg === 'api' ? 'API' : e.weg === 'heim' ? 'Heim-PC' : 'Claude';
    app.innerHTML = `<header class="kopf"><button type="button" class="marke" data-aktion="start">${vogel('ruhezustand-3', 34)}<b class="h">Albatros</b></button><div class="platz"></div>
        <span class="chip"><i></i>${esc(status)} · ${esc(e.claudeModell || 'opus')}</span>
        <button type="button" class="rund" data-aktion="oeffnen" title="Datei öffnen (Strg+O)" aria-label="Datei öffnen">${sym('oeffnen', 18)}</button>
        <button type="button" class="rund" data-aktion="einstellungen" title="Einstellungen" aria-label="Einstellungen">${sym('zahnrad', 18)}</button></header>
      <main class="inhalt">
        <div class="gruss"><span class="hand">${esc(gruss())} – was rechnen wir?</span><h1 class="h">Was willst du ausrechnen?</h1></div>
        <div class="blatt eingabe">
          <input id="startfrage" placeholder="In normalen Worten, z. B. „Was bleibt mir bei 2.650 € netto und 820 € Miete?“" aria-label="Was willst du ausrechnen?">
          <div class="reihe" style="flex-wrap:wrap"><span class="leise" style="font-size:13px">Zum Beispiel:</span>${BEISPIELE.map((b) => `<button type="button" class="beispiel" data-aktion="beispiel" data-text="${esc(b)}">${esc(b)}</button>`).join('')}<div class="platz"></div>
            <button type="button" class="btn" data-aktion="ausrechnen">Ausrechnen ${sym('senden', 16, 2.4)}</button></div></div>
        <div class="karten">${Object.entries(VORLAGEN).map(([k, v]) => `<button type="button" class="karte" data-aktion="vorlage" data-k="${k}"><span class="bild">${vogel(v.anim, 124)}</span><b class="h">${esc(v.name)}</b><span class="leise">${esc(v.text)}</span></button>`).join('')}</div>
        <div class="zeile2">
          <section class="blatt liste"><div class="reihe"><h2 class="h" style="flex:1">Zuletzt geöffnet</h2><button type="button" class="btn klein weiss" data-aktion="neu">${sym('plus', 14, 2.4)} Leere Tabelle</button></div>
            ${S.liste.length ? S.liste.slice(0, 8).map((t) => `<button type="button" class="datei" data-aktion="tabelle" data-id="${esc(t.id)}"><span class="kuerzel">${esc(kuerzel(t.name))}</span><span class="txt"><b>${esc(t.name)}</b><small>${t.zeilen} Zeilen${t.blaetter > 1 ? ` · ${t.blaetter} Blätter` : ''}</small></span><span class="wann">${esc(wann(t.geaendert))}</span><span class="loesch" role="button" tabindex="-1" title="Löschen" aria-label="Löschen" data-aktion="loeschen" data-id="${esc(t.id)}">${sym('muell', 15)}</span></button>`).join('') : `<div class="leer">${vogel('ruhezustand', 48)}<span>Noch keine Tabelle. Nimm oben eine Vorlage oder schreib los.</span></div>`}</section>
          <section class="blatt tipp"><h2 class="h">Excel-Datei mitgebracht?</h2><div class="ablage">Datei hierher ziehen<br><span class="leise" style="font-weight:400;font-size:13px">.xlsx oder .csv</span></div><button type="button" class="btn weiss" data-aktion="oeffnen">${sym('oeffnen', 16)} Datei öffnen</button></section>
        </div>
      </main>`;
    setTimeout(() => { if (S.ansicht === 'start' && !document.querySelector('.schleier')) A.standFoto?.('albatros-start'); }, 2500);
    const f = document.getElementById('startfrage');
    f.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') aktionen.ausrechnen(); });
  }

  // ---------- Tabelle öffnen ----------
  async function oeffne(id) {
    const t = await A.tabellen.lesen(id);
    if (!t || t.fehler) { meldung('Die Tabelle lässt sich nicht öffnen.'); return zeigeStart(); }
    S.t = t; S.blattNr = 0; S.anker = { sp: 0, ze: 0 }; S.ende = { sp: 0, ze: 0 }; S.zurueck = []; S.vor = []; S.bearbeiten = null;
    t.gespraech = t.gespraech || [];
    for (const b of t.blaetter) { b.formate = b.formate || {}; b.farben = b.farben || {}; b.fett = b.fett || {}; b.breiten = b.breiten || {}; }
    zeigeTabelle();
  }

  function zeigeTabelle() {
    S.ansicht = 'tabelle';
    S.werte = Fo.rechneAlles(blatt());
    app.innerHTML = `<header class="kopf"><button type="button" class="marke" data-aktion="start" title="Alle Tabellen">${sym('links', 18)}${vogel('ruhezustand-3', 30)}<b class="h">Albatros</b></button><span class="trenner"></span>
        <div class="dok"><b class="h" data-aktion="umbenennen" title="Zum Umbenennen klicken">${esc(S.t.name)}</b><small><span class="blattname">${esc(blatt().name)}</span> · <span class="gespeichert">gespeichert</span></small></div>
        <div class="platz"></div>
        <div style="position:relative"><button type="button" class="btn" data-aktion="exportmenue">${sym('export', 16)} Exportieren</button></div>
        <button type="button" class="rund" data-aktion="einstellungen" title="Einstellungen" aria-label="Einstellungen">${sym('zahnrad', 18)}</button></header>
      <div class="werk mitleiste">
        <aside class="blatt seite" aria-label="Blätter und Schnell rechnen"></aside>
        <div class="links">
          <div class="blattueber"><span class="hand">${esc(S.t.name)}</span><b class="h blattname2" title="Doppelklick zum Umbenennen">${esc(blatt().name)}</b></div>
          <div class="blatt leiste" role="toolbar" aria-label="Werkzeuge">
            <button type="button" class="wz" data-aktion="rueckgaengig" title="Rückgängig (Strg+Z)">${sym('zurueck', 15)}</button>
            <button type="button" class="wz" data-aktion="wiederholen" title="Wiederholen (Strg+Y)">${sym('vor', 15)}</button><span class="tz"></span>
            <button type="button" class="wz" data-aktion="fett" title="Fett (Strg+B)"><b style="font-size:15px">F</b></button>
            <button type="button" class="wz" data-aktion="format" data-art="eur" title="Als Euro">€</button>
            <button type="button" class="wz" data-aktion="format" data-art="prozent" title="Als Prozent">%</button>
            <span class="farbwahl"><button type="button" class="wz" data-aktion="farbmenue" title="Farbe">${sym('farbe', 15)}</button></span><span class="tz"></span>
            <button type="button" class="wz" data-aktion="zeile-dazu" title="Zeile darunter einfügen">${sym('zeile', 15)} Zeile</button>
            <button type="button" class="wz" data-aktion="spalte-dazu" title="Spalte rechts einfügen">${sym('spalte', 15)} Spalte</button>
            <button type="button" class="wz" data-aktion="sortieren" title="Nach der markierten Spalte sortieren">${sym('sortieren', 15)} Sortieren</button><span class="tz"></span>
            <button type="button" class="wz" data-aktion="diagramm" title="Diagramm aus der Markierung">${sym('diagramm', 15)} Diagramm</button>
            <button type="button" class="wz" data-aktion="summe-unten" title="Summe unter die Markierung">${sym('summe', 15)} Summe</button>
          </div>
          <div class="blatt formelzeile"><span class="adr">A1</span><span class="fx">fx</span><input id="formel" aria-label="Inhalt der Zelle" spellcheck="false"><span class="erklaerung leise"></span></div>
          <div class="blatt raster"><div class="rasterscroll" tabindex="0" aria-label="Tabelle"></div><div class="blaetter"></div></div>
        </div>
        <aside class="blatt helfer" aria-label="Albatros hilft"></aside>
      </div>`;
    const fz = document.getElementById('formel');
    fz.addEventListener('focus', () => { S.bearbeiten = { a: Fo.adresse(S.anker.sp, S.anker.ze), ort: 'formel' }; });
    fz.addEventListener('input', () => liveZeigen(Fo.adresse(S.anker.sp, S.anker.ze), fz.value));
    fz.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); S.bearbeiten = null; uebernehme(fz.value); fz.blur(); bewege(0, 1); }
      if (ev.key === 'Escape') { S.bearbeiten = null; liveZurueck(); fz.blur(); zeigeAuswahl(); app.querySelector('.rasterscroll').focus(); }
    });
    fz.addEventListener('blur', () => { if (S.bearbeiten?.ort === 'formel') { S.bearbeiten = null; if (S.live) uebernehme(fz.value, S.live.a); } });
    zeichneTabelle();
    zeichneHelfer();
    app.querySelector('.rasterscroll').focus();
    setTimeout(() => { if (S.ansicht === 'tabelle' && !document.querySelector('.schleier')) A.standFoto?.('albatros-tabelle'); }, 3000);
  }

  // ---------- Gitter ----------
  function zeichneTabelle() {
    if (S.ansicht !== 'tabelle') return;
    const b = blatt();
    S.werte = Fo.rechneAlles(b);
    const g = groesse(b);
    const spalten = Math.max(g.sp + 4, 10, S.ende.sp + 2);
    const zeilen = Math.max(g.ze + 16, 40, S.ende.ze + 4);
    const a = auswahl();
    const breite = (sp) => b.breiten[Fo.nrZuSpalte(sp)] || 110;
    const chips = chipSpalten(b);
    let html = `<table class="gitter"><colgroup><col style="width:46px">${Array.from({ length: spalten }, (_, sp) => `<col style="width:${breite(sp)}px">`).join('')}</colgroup><thead><tr><th class="nr"></th>`;
    for (let sp = 0; sp < spalten; sp++) html += `<th data-spalte="${sp}" class="${sp >= a.sp1 && sp <= a.sp2 ? 'sel' : ''}">${Fo.nrZuSpalte(sp)}<span class="ziehen" data-ziehen="${sp}"></span></th>`;
    html += '</tr></thead><tbody>';
    for (let ze = 0; ze < zeilen; ze++) {
      html += `<tr><th class="nr ${ze >= a.ze1 && ze <= a.ze2 ? 'sel' : ''}" data-zeile="${ze}">${ze + 1}</th>`;
      for (let sp = 0; sp < spalten; sp++) {
        const ad = Fo.adresse(sp, ze);
        const roh = b.zellen[ad]; const w = S.werte[ad];
        const kl = [];
        if (typeof w === 'number') kl.push('zahl');
        if (w instanceof Fo.Fehler) kl.push('fehler');
        if (b.fett[ad]) kl.push('fett');
        if (roh && String(roh).startsWith('=')) kl.push('formel');
        if (sp >= a.sp1 && sp <= a.sp2 && ze >= a.ze1 && ze <= a.ze2 && (a.sp1 !== a.sp2 || a.ze1 !== a.ze2)) kl.push('in');
        if (sp === S.anker.sp && ze === S.anker.ze) kl.push('aktiv');
        const farbe = b.farben[ad] ? ` style="background-color:${esc(b.farben[ad])}"` : '';
        const text = Fo.zeige(w, b.formate[ad]);
        const inhalt = ze > 0 && chips.has(sp) && typeof w === 'string' && text ? `<span class="tchip" style="background:${chipFarbe(text)}">${esc(text)}</span>` : esc(text);
        html += `<td data-a="${ad}" class="${kl.join(' ')}"${farbe}>${inhalt}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    const box = app.querySelector('.rasterscroll');
    const scroll = [box.scrollLeft, box.scrollTop];
    box.innerHTML = html;
    [box.scrollLeft, box.scrollTop] = scroll;
    zeichneReiter();
    zeigeAuswahl();
  }

  function eintraege(bl) { const g = groesse(bl); let n = 0; for (let ze = 1; ze <= g.ze; ze++) { let voll = false, formel = false; for (let sp = 0; sp <= g.sp; sp++) { const v = bl.zellen[Fo.adresse(sp, ze)]; if (v !== undefined) voll = true; if (String(v ?? '').startsWith('=')) formel = true; } if (voll && !formel) n++; } return n; }
  function zeichneReiter() {
    const seite = app.querySelector('.seite');
    if (seite) {
      const mehrere = S.t.blaetter.length > 1;
      const andere = (S.liste || []).filter((t) => t.id !== S.t.id).slice(0, 4);
      seite.innerHTML = `<span class="sl-titel">Blätter</span>
        ${S.t.blaetter.map((b, i) => `<button type="button" class="sl-blatt" aria-current="${i === S.blattNr}" data-aktion="blatt" data-i="${i}" title="Doppelklick zum Umbenennen"><i></i><span>${esc(b.name)}</span><small>${eintraege(b)}</small>${mehrere && i === S.blattNr ? `<span class="x" data-aktion="blatt-weg" data-i="${i}" title="Blatt löschen">✕</span>` : ''}</button>`).join('')}
        <button type="button" class="sl-neu" data-aktion="blatt-dazu">${sym('plus', 13, 2.4)} Neues Blatt</button>
        <span class="sl-titel">Schnell rechnen</span>
        <div class="sl-knoepfe"><button type="button" data-aktion="unten" data-fn="SUMME" title="Summe unter die Markierung">Summe</button><button type="button" data-aktion="unten" data-fn="MITTELWERT" title="Durchschnitt unter die Markierung">Mittel</button><button type="button" data-aktion="unten" data-fn="ANZAHL" title="Anzahl unter die Markierung">Zählen</button><button type="button" data-aktion="sortieren">Sortieren</button></div>
        ${andere.length ? `<span class="sl-titel">Zuletzt geöffnet</span>${andere.map((t) => `<button type="button" class="sl-datei" data-aktion="tabelle" data-id="${esc(t.id)}">${esc(t.name)}</button>`).join('')}` : ''}`;
    }
    const r = app.querySelector('.blaetter'); if (!r) return;
    r.innerHTML = '<span class="statuszeile"></span>';
    zeigeStatus();
  }

  function zeigeStatus() {
    const z = app.querySelector('.statuszeile'); if (!z) return;
    const liste = sammle(auswahlText());
    const zahlen = liste.map((ad) => S.werte[ad]).filter((v) => typeof v === 'number');
    const fmt = blatt().formate[Fo.adresse(S.anker.sp, S.anker.ze)];
    z.innerHTML = `<span>Gewählt: <b>${liste.length} ${liste.length === 1 ? 'Zelle' : 'Zellen'}</b></span>${zahlen.length ? `<span>Summe: <b>${esc(Fo.zeige(zahlen.reduce((x, y) => x + y, 0), fmt))}</b></span>` : ''}${zahlen.length > 1 ? `<span>Schnitt: <b>${esc(Fo.zeige(zahlen.reduce((x, y) => x + y, 0) / zahlen.length, fmt))}</b></span>` : ''}<span class="platz"></span><span>${eintraege(blatt())} Einträge</span>`;
  }

  // Formel in Klartext (ohne Claude)
  const KLAR = { SUMME: 'zählt alle Zahlen zusammen', MITTELWERT: 'rechnet den Durchschnitt aus', MIN: 'sucht den kleinsten Wert', MAX: 'sucht den größten Wert', ANZAHL: 'zählt, wie viele Zahlen es sind', ANZAHL2: 'zählt alle gefüllten Zellen', WENN: 'prüft eine Bedingung und zeigt je nachdem etwas anderes', SUMMEWENN: 'zählt nur die passenden Zeilen zusammen', 'ZÄHLENWENN': 'zählt die passenden Einträge', MITTELWERTWENN: 'Durchschnitt nur der passenden Zeilen', RUNDEN: 'rundet die Zahl', AUFRUNDEN: 'rundet nach oben', ABRUNDEN: 'rundet nach unten', SVERWEIS: 'sucht einen Wert in einer Liste', RMZ: 'rechnet die Monatsrate eines Kredits aus', PRODUKT: 'multipliziert alles miteinander', HEUTE: 'zeigt das heutige Datum', VERKETTEN: 'hängt Texte zusammen' };
  function klartext(roh) {
    if (!roh || !String(roh).startsWith('=')) return '';
    const fn = /^=\s*([A-ZÄÖÜ][A-ZÄÖÜ0-9.]*)\(/i.exec(roh)?.[1]?.toUpperCase();
    const en = { SUM: 'SUMME', AVERAGE: 'MITTELWERT', IF: 'WENN', SUMIF: 'SUMMEWENN', COUNTIF: 'ZÄHLENWENN', COUNT: 'ANZAHL', ROUND: 'RUNDEN', VLOOKUP: 'SVERWEIS', PMT: 'RMZ' };
    if (fn && KLAR[en[fn] || fn]) return KLAR[en[fn] || fn];
    if (/[+\-*/]/.test(roh.slice(1))) return 'rechnet mit anderen Zellen';
    return 'übernimmt den Wert einer anderen Zelle';
  }
  // Kategorie-Spalten bekommen Chips
  function chipSpalten(b) { const set = new Set(); for (let sp = 0; sp < 30; sp++) { const k = String(b.zellen[Fo.adresse(sp, 0)] || ''); if (/^(kategorie|art|typ|status|bezahlt|bereich|gruppe)/i.test(k.trim())) set.add(sp); } return set; }
  const CHIPFARBEN = ['#dcf0e3', '#fdebd3', '#e3ecf8', '#efe6fb', '#fbe3e3', '#e9f3d6', '#f6eedb'];
  const chipFarbe = (t) => { let h = 0; for (const c of String(t).toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0; return CHIPFARBEN[h % CHIPFARBEN.length]; };
  // Kleiner Tipp: was bleibt übrig, pro Tag
  function tipp(b) {
    for (const [ad, roh] of Object.entries(b.zellen)) {
      if (!/^(bleibt|noch übrig|übrig|saldo|kassenstand|rest)/i.test(String(roh).trim())) continue;
      const z = Fo.zerlege(ad);
      for (let sp = z.sp + 1; sp < z.sp + 8; sp++) {
        const w = S.werte[Fo.adresse(sp, z.ze)];
        if (typeof w === 'number') {
          const heute = new Date(); const tage = new Date(heute.getFullYear(), heute.getMonth() + 1, 0).getDate() - heute.getDate() + 1;
          return w >= 0 ? `Dir bleiben noch ${Fo.zeige(w, 'eur')}. Bis Monatsende sind das gut ${Fo.zeige(w / tage, 'eur')} pro Tag.` : `Du liegst ${Fo.zeige(-w, 'eur')} im Minus.`;
        }
      }
    }
    return '';
  }

  // Nur Markierung neu zeichnen (schnell)
  function zeigeAuswahl() {
    const box = app.querySelector('.rasterscroll'); if (!box) return;
    const a = auswahl(); const viele = a.sp1 !== a.sp2 || a.ze1 !== a.ze2;
    box.querySelectorAll('td.aktiv, td.in').forEach((td) => td.classList.remove('aktiv', 'in'));
    box.querySelectorAll('th.sel').forEach((th) => th.classList.remove('sel'));
    if (viele) for (const ad of sammle(auswahlText())) box.querySelector(`td[data-a="${ad}"]`)?.classList.add('in');
    const td = box.querySelector(`td[data-a="${Fo.adresse(S.anker.sp, S.anker.ze)}"]`);
    td?.classList.add('aktiv');
    for (let sp = a.sp1; sp <= a.sp2; sp++) box.querySelector(`th[data-spalte="${sp}"]`)?.classList.add('sel');
    for (let ze = a.ze1; ze <= a.ze2; ze++) box.querySelector(`th[data-zeile="${ze}"]`)?.classList.add('sel');
    const ad = Fo.adresse(S.anker.sp, S.anker.ze);
    const adr = app.querySelector('.formelzeile .adr'); if (adr) adr.textContent = viele ? auswahlText() : ad;
    const fz = document.getElementById('formel'); if (fz && document.activeElement !== fz) fz.value = blatt().zellen[ad] ?? '';
    const er = app.querySelector('.formelzeile .erklaerung'); if (er) er.textContent = klartext(blatt().zellen[ad]);
    zeigeStatus();
    zeichneWerte();
  }

  function sichtbar() {
    const box = app.querySelector('.rasterscroll');
    const td = box?.querySelector(`td[data-a="${Fo.adresse(S.ende.sp, S.ende.ze)}"]`); if (!td) return;
    const r = td.getBoundingClientRect(), b = box.getBoundingClientRect();
    if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 4;
    if (r.top < b.top + 30) box.scrollTop -= b.top + 30 - r.top;
    if (r.right > b.right) box.scrollLeft += r.right - b.right + 4;
    if (r.left < b.left + 46) box.scrollLeft -= b.left + 46 - r.left;
  }

  function waehle(sp, ze, erweitern = false) {
    sp = Math.max(0, sp); ze = Math.max(0, ze);
    if (erweitern) S.ende = { sp, ze }; else { S.anker = { sp, ze }; S.ende = { sp, ze }; }
    const box = app.querySelector('.rasterscroll');
    const g = groesse(blatt());
    if (!box.querySelector(`td[data-a="${Fo.adresse(sp, ze)}"]`) || ze > g.ze + 14) zeichneTabelle(); else zeigeAuswahl();
    sichtbar();
  }
  function bewege(dsp, dze, erweitern = false) {
    const von = erweitern ? S.ende : S.anker;
    waehle(von.sp + dsp, von.ze + dze, erweitern);
  }

  // ---------- Bearbeiten ----------
  function starteBearbeiten(start = null) {
    const ad = Fo.adresse(S.anker.sp, S.anker.ze);
    const td = app.querySelector(`td[data-a="${ad}"]`); if (!td) return;
    const box = app.querySelector('.rasterscroll');
    const f = document.createElement('input');
    f.className = 'eingabefeld'; f.spellcheck = false;
    f.value = start !== null ? start : (blatt().zellen[ad] ?? '');
    f.style.left = `${td.offsetLeft}px`; f.style.top = `${td.offsetTop}px`;
    f.style.minWidth = `${td.offsetWidth}px`; f.style.height = `${td.offsetHeight}px`;
    box.appendChild(f);
    S.bearbeiten = { a: ad, ort: 'zelle', feld: f };
    f.focus(); f.setSelectionRange(f.value.length, f.value.length);
    const fz = document.getElementById('formel');
    f.addEventListener('input', () => { fz.value = f.value; liveZeigen(ad, f.value); f.style.width = `${Math.max(td.offsetWidth, f.value.length * 8 + 20)}px`; });
    f.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); beende(true); bewege(0, ev.shiftKey ? -1 : 1); }
      else if (ev.key === 'Tab') { ev.preventDefault(); beende(true); bewege(ev.shiftKey ? -1 : 1, 0); }
      else if (ev.key === 'Escape') { ev.preventDefault(); beende(false); }
      else if (/^Arrow(Up|Down)$/.test(ev.key) && !f.value.startsWith('=')) { ev.preventDefault(); beende(true); bewege(0, ev.key === 'ArrowUp' ? -1 : 1); }
    });
    f.addEventListener('blur', () => { if (S.bearbeiten?.feld === f && !S.klickInFormel) beende(true); S.klickInFormel = false; });
  }
  function beende(uebernehmen) {
    const b = S.bearbeiten; if (!b || b.ort !== 'zelle') return;
    S.bearbeiten = null;
    const wert = b.feld.value;
    b.feld.remove();
    if (uebernehmen) uebernehme(wert, b.a); else { liveZurueck(); }
    app.querySelector('.rasterscroll')?.focus({ preventScroll: true });
  }
  // Live: Während du tippst, rechnet die Tabelle schon mit (ohne zu speichern)
  function liveZeigen(ad, wert) {
    if (!S.live || S.live.a !== ad) { if (S.live) liveZurueck(true); S.live = { a: ad, alt: blatt().zellen[ad] }; }
    setze(ad, wert === '' ? null : wert);
    S.werte = Fo.rechneAlles(blatt());
    aktualisiereTexte();
  }
  function liveZurueck(still = false) {
    if (!S.live) return;
    setze(S.live.a, S.live.alt ?? null); S.live = null;
    if (!still) { S.werte = Fo.rechneAlles(blatt()); aktualisiereTexte(); }
  }
  function aktualisiereTexte() {
    const b = blatt();
    app.querySelectorAll('.rasterscroll td[data-a]').forEach((td) => {
      const a = td.dataset.a; const w = S.werte[a];
      const t = Fo.zeige(w, b.formate[a]);
      if (td.textContent !== t && !td.querySelector('.tchip')) td.textContent = t;
      td.classList.toggle('zahl', typeof w === 'number');
      td.classList.toggle('fehler', w instanceof Fo.Fehler);
    });
    zeigeStatus(); zeichneWerte();
  }
  function uebernehme(wert, ad = Fo.adresse(S.anker.sp, S.anker.ze)) {
    if (S.live && S.live.a === ad) { setze(ad, S.live.alt ?? null); S.live = null; }
    const alt = blatt().zellen[ad] ?? '';
    if (String(wert) === String(alt)) { S.werte = Fo.rechneAlles(blatt()); aktualisiereTexte(); zeigeAuswahl(); return; }
    merke();
    setze(ad, wert.trim() === '' ? null : wert);
    // Euro-Zeichen getippt → als Euro zeigen
    if (/€\s*$|^\s*€/.test(wert) && Fo.alsZahl(wert) !== null) { blatt().formate[ad] = 'eur'; setze(ad, String(Fo.alsZahl(wert)).replace('.', ',')); }
    if (/%\s*$/.test(wert) && Fo.alsZahl(wert) !== null) { blatt().formate[ad] = 'prozent'; setze(ad, String(Fo.alsZahl(wert)).replace('.', ',')); }
    geaendert(); zeichneTabelle();
  }

  // ---------- Werkzeuge ----------
  function fuerAuswahl(fn) { merke(); for (const ad of sammle(auswahlText())) fn(ad); geaendert(); zeichneTabelle(); }
  function loescheAuswahl() { fuerAuswahl((ad) => { delete blatt().zellen[ad]; }); }
  function zeileEinfuegen(abZe, anzahl = 1) {
    const b = blatt(); const neu = {};
    const schiebe = (obj) => { const aus = {}; for (const [ad, v] of Object.entries(obj)) { const z = Fo.zerlege(ad); aus[z.ze >= abZe ? Fo.adresse(z.sp, z.ze + anzahl) : ad] = v; } return aus; };
    for (const [ad, v] of Object.entries(b.zellen)) {
      const z = Fo.zerlege(ad);
      const roh = String(v).startsWith('=') ? String(v).replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(])/g, (m, d1, sp, d2, n) => (Number(n) - 1 >= abZe ? `${d1}${sp}${d2}${Number(n) + anzahl}` : m)) : v;
      neu[z.ze >= abZe ? Fo.adresse(z.sp, z.ze + anzahl) : ad] = roh;
    }
    b.zellen = neu; b.formate = schiebe(b.formate); b.farben = schiebe(b.farben); b.fett = schiebe(b.fett);
  }
  function spalteEinfuegen(abSp) {
    const b = blatt(); const neu = {};
    const schiebe = (obj) => { const aus = {}; for (const [ad, v] of Object.entries(obj)) { const z = Fo.zerlege(ad); aus[z.sp >= abSp ? Fo.adresse(z.sp + 1, z.ze) : ad] = v; } return aus; };
    for (const [ad, v] of Object.entries(b.zellen)) {
      const z = Fo.zerlege(ad);
      const roh = String(v).startsWith('=') ? String(v).replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(])/g, (m, d1, sp, d2, n) => (Fo.spalteZuNr(sp) >= abSp ? `${d1}${Fo.nrZuSpalte(Fo.spalteZuNr(sp) + 1)}${d2}${n}` : m)) : v;
      neu[z.sp >= abSp ? Fo.adresse(z.sp + 1, z.ze) : ad] = roh;
    }
    b.zellen = neu; b.formate = schiebe(b.formate); b.farben = schiebe(b.farben); b.fett = schiebe(b.fett);
    const br = {}; for (const [k, v] of Object.entries(b.breiten)) { const n = Fo.spalteZuNr(k); br[n >= abSp ? Fo.nrZuSpalte(n + 1) : k] = v; } b.breiten = br;
  }
  // Sortiert die Zeilen unter der Überschrift nach der aktiven Spalte (Formeln bleiben, wo sie sind)
  function sortiere() {
    const b = blatt(); const sp = S.anker.sp; const g = groesse(b);
    const kopf = typeof S.werte[Fo.adresse(sp, 0)] === 'string' ? 1 : 0;
    const zeilen = [];
    for (let ze = kopf; ze <= g.ze; ze++) {
      const roh = []; let formel = false; let leer = true;
      for (let s = 0; s <= g.sp; s++) { const v = b.zellen[Fo.adresse(s, ze)]; if (v !== undefined) leer = false; if (String(v ?? '').startsWith('=')) formel = true; roh.push(v); }
      if (formel || leer) break; // Summenzeile/Leerzeile = Ende der Daten
      zeilen.push({ ze, roh, w: S.werte[Fo.adresse(sp, ze)], f: Array.from({ length: g.sp + 1 }, (_, s) => [b.formate[Fo.adresse(s, ze)], b.farben[Fo.adresse(s, ze)], b.fett[Fo.adresse(s, ze)]]) });
    }
    if (zeilen.length < 2) { meldung('Nichts zu sortieren.'); return; }
    const auf = !(S.sortiertAuf && S.sortiertSp === sp);
    S.sortiertAuf = auf; S.sortiertSp = sp;
    const sortiert = [...zeilen].sort((x, y) => { const a = x.w, c = y.w; if (typeof a === 'number' && typeof c === 'number') return auf ? a - c : c - a; return auf ? String(a ?? '').localeCompare(String(c ?? ''), 'de') : String(c ?? '').localeCompare(String(a ?? ''), 'de'); });
    merke();
    sortiert.forEach((z, i) => { const ze = zeilen[i].ze; z.roh.forEach((v, s) => { const ad = Fo.adresse(s, ze); if (v === undefined) delete b.zellen[ad]; else b.zellen[ad] = v; const [fo, fa, fe] = z.f[s]; if (fo) b.formate[ad] = fo; else delete b.formate[ad]; if (fa) b.farben[ad] = fa; else delete b.farben[ad]; if (fe) b.fett[ad] = true; else delete b.fett[ad]; }); });
    geaendert(); zeichneTabelle();
    meldung(`Sortiert nach Spalte ${Fo.nrZuSpalte(sp)} (${auf ? 'aufsteigend' : 'absteigend'}). Nochmal klicken dreht um.`);
  }
  function summeUnten(fn = 'SUMME') {
    const a = auswahl(); const b = blatt();
    merke();
    for (let sp = a.sp1; sp <= a.sp2; sp++) {
      let ze1 = a.ze1, ze2 = a.ze2;
      if (ze1 === ze2) { ze1 = typeof S.werte[Fo.adresse(sp, 0)] === 'string' ? 1 : 0; ze2 = ze1; while (S.werte[Fo.adresse(sp, ze2 + 1)] !== undefined && S.werte[Fo.adresse(sp, ze2 + 1)] !== null) ze2++; }
      let ziel = ze2 + 1; while (b.zellen[Fo.adresse(sp, ziel)] !== undefined) ziel++;
      const ad = Fo.adresse(sp, ziel);
      b.zellen[ad] = `=${fn}(${Fo.adresse(sp, ze1)}:${Fo.adresse(sp, ze2)})`; b.fett[ad] = true;
      const vorbild = b.formate[Fo.adresse(sp, ze2)]; if (vorbild && fn !== 'ANZAHL') b.formate[ad] = vorbild;
    }
    geaendert(); zeichneTabelle();
  }

  // ---------- Kopieren / Einfügen ----------
  function kopiere(ev, ausschneiden = false) {
    const a = auswahl(); const b = blatt(); const zeilen = []; const roh = [];
    for (let ze = a.ze1; ze <= a.ze2; ze++) { const z = [], r = []; for (let sp = a.sp1; sp <= a.sp2; sp++) { const ad = Fo.adresse(sp, ze); z.push(Fo.zeige(S.werte[ad], b.formate[ad])); r.push(b.zellen[ad] ?? ''); } zeilen.push(z.join('\t')); roh.push(r); }
    const text = zeilen.join('\n');
    ev.clipboardData.setData('text/plain', text);
    S.kopiert = { text, roh, sp: a.sp1, ze: a.ze1 };
    ev.preventDefault();
    if (ausschneiden) loescheAuswahl();
    meldung(ausschneiden ? 'Ausgeschnitten.' : 'Kopiert.', { dauer: 1500 });
  }
  function fuegeEin(ev) {
    const text = ev.clipboardData.getData('text/plain'); if (!text) return;
    ev.preventDefault();
    merke();
    const ziel = S.anker;
    if (S.kopiert && S.kopiert.text === text) {
      S.kopiert.roh.forEach((r, i) => r.forEach((v, j) => setze(Fo.adresse(ziel.sp + j, ziel.ze + i), Fo.verschiebe(v, ziel.sp - S.kopiert.sp, ziel.ze - S.kopiert.ze) || null)));
    } else {
      text.replace(/\r/g, '').replace(/\n$/, '').split('\n').forEach((z, i) => z.split('\t').forEach((v, j) => setze(Fo.adresse(ziel.sp + j, ziel.ze + i), v.trim() || null)));
    }
    geaendert(); zeichneTabelle();
  }

  // ---------- Helfer rechts ----------
  function zeichneHelfer() {
    const h = app.querySelector('.helfer'); if (!h) return;
    h.innerHTML = `<header><span class="helfervogel">${vogel(S.denkt ? 'denkt-nach' : 'ruhezustand-3', 34)}</span><b class="h">Albatros hilft</b><div class="platz"></div><span class="chip grau" style="box-shadow:none;background:var(--mint)"><i style="background:${S.denkt ? '#e8a53a' : 'var(--gruen)'}"></i>${S.denkt ? 'Rechnet …' : 'Bereit'}</span></header>
      <div class="werte" aria-live="polite"></div>
      <div class="tipp-karte" hidden><b class="h">Kleiner Tipp</b><span></span></div>
      <div class="schnell">
        <button type="button" data-aktion="diagramm">${sym('diagramm', 15)} Diagramm</button>
        <button type="button" data-aktion="erklaeren">${sym('fx', 15)} Formel erklären</button>
        <button type="button" data-aktion="frage" data-text="Rechne die Summen je Kategorie in einer kleinen Übersicht rechts neben der Tabelle aus.">${sym('gruppe', 15)} Je Kategorie</button>
        <button type="button" data-aktion="frage" data-text="Markiere doppelte oder auffällige Einträge (z. B. Tippfehler, ungewöhnlich hohe Beträge) und sag mir kurz, was du gefunden hast.">${sym('lupe', 15)} Auffälliges</button>
      </div>
      <div class="gespraech"></div>
      <div class="frage"><textarea id="frage" rows="2" placeholder="Was soll ich tun? z. B. „Alles über 200 € orange markieren“" aria-label="Wunsch an Albatros"></textarea>
        <div class="reihe"><span class="leise auswahlhinweis" style="font-size:12.5px"></span><div class="platz"></div><button type="button" class="btn klein" data-aktion="senden" ${S.denkt ? 'disabled' : ''}>Los ${sym('senden', 14, 2.4)}</button></div></div>`;
    const f = h.querySelector('#frage');
    f.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); aktionen.senden(); } });
    zeichneGespraech(); zeichneWerte();
  }
  function zeichneWerte() {
    const w = app.querySelector('.werte'); if (!w) return;
    const text = auswahlText();
    const zahlen = sammle(text).map((ad) => S.werte[ad]).filter((v) => typeof v === 'number');
    const fmt = blatt().formate[Fo.adresse(S.anker.sp, S.anker.ze)] || blatt().formate[Fo.adresse(S.anker.sp, Math.min(S.anker.ze + 1, 999))];
    if (zahlen.length > 1) {
      const s = zahlen.reduce((x, y) => x + y, 0);
      w.innerHTML = `<div><b>${esc(Fo.zeige(s, fmt))}</b><small>Summe</small></div><div><b>${esc(Fo.zeige(s / zahlen.length, fmt))}</b><small>Schnitt</small></div><div><b>${esc(Fo.zeige(Math.max(...zahlen), fmt))}</b><small>größter</small></div>`;
      w.hidden = false;
    } else {
      const ad = Fo.adresse(S.anker.sp, S.anker.ze); const roh = blatt().zellen[ad];
      w.innerHTML = roh && String(roh).startsWith('=') ? `<div style="grid-column:span 3"><b>${esc(Fo.zeige(S.werte[ad], blatt().formate[ad]))}</b><small>${esc(ad)} rechnet: ${esc(roh)}</small></div>` : `<div style="grid-column:span 3"><small>Markier mehrere Zahlen (ziehen oder Spaltenkopf anklicken) – dann siehst du hier Summe und Schnitt.</small></div>`;
      w.hidden = false;
    }
    const hinweis = app.querySelector('.auswahlhinweis'); if (hinweis) hinweis.textContent = `Markiert: ${text}`;
    const tk = app.querySelector('.tipp-karte'); if (tk) { const t = tipp(blatt()); tk.hidden = !t; tk.querySelector('span').textContent = t; }
  }
  function zeichneGespraech() {
    const g = app.querySelector('.gespraech'); if (!g) return;
    const liste = S.t.gespraech.slice(-30);
    g.innerHTML = (liste.length ? liste.map((n) => (n.wer === 'ich' ? `<div class="ich">${esc(n.text)}</div>` : `<div class="er ${n.fehler ? 'fehler' : ''}"><span>${vogel(n.fehler ? 'fehler' : 'erledigt', 26).replace(/<animate[^>]*repeatCount="indefinite"[^>]*>/g, '')}</span><div><div class="txt">${esc(n.text)}</div>${n.chips?.length ? `<div class="chips">${n.chips.map((c) => `<span class="chip" style="box-shadow:none;background:var(--mint)">${esc(c)}</span>`).join('')}</div>` : ''}</div></div>`)).join('')
      : `<div class="er"><span>${vogel('winkt', 26)}</span><div class="txt">Sag mir in normalen Worten, was du brauchst – ich trag Formeln ein, markiere, sortiere oder mach ein Diagramm. Markierst du vorher Zellen, weiß ich, worum es geht.</div></div>`)
      + (S.denkt ? `<div class="er"><span>${vogel('denkt-nach', 26)}</span><div class="txt"><span class="punkte"><i></i><i></i><i></i></span> Ich rechne …</div></div>` : '');
    g.scrollTop = g.scrollHeight;
  }

  // Antwort von Claude auf die Tabelle anwenden
  function anwenden(r) {
    const b = blatt(); let n = 0;
    const jede = (obj, fn) => { for (const [k, v] of Object.entries(obj || {})) for (const ad of (k.includes(':') ? sammle(k) : [k.toUpperCase()])) if (Fo.zerlege(ad)) { fn(ad, v); n++; } };
    const hatWas = r.zellen || r.formate || r.farben || r.fett || r.breiten;
    if (hatWas) merke();
    jede(r.zellen, (ad, v) => setze(ad, v === null ? null : String(v)));
    jede(r.formate, (ad, v) => { if (v) b.formate[ad] = v; else delete b.formate[ad]; });
    jede(r.farben, (ad, v) => { if (v && /^#[0-9a-f]{6}$/i.test(v)) b.farben[ad] = v; else delete b.farben[ad]; });
    jede(r.fett, (ad, v) => { if (v) b.fett[ad] = true; else delete b.fett[ad]; });
    for (const [sp, px] of Object.entries(r.breiten || {})) if (/^[A-Z]{1,3}$/i.test(sp)) b.breiten[sp.toUpperCase()] = Math.max(40, Math.min(600, Number(px) || 110));
    if (r.name && /^(Neue Tabelle|Ausrechnung)$/.test(S.t.name)) { S.t.name = String(r.name).slice(0, 80); const t = app.querySelector('.dok b'); if (t) t.textContent = S.t.name; }
    if (hatWas) { geaendert(); zeichneTabelle(); }
    if (r.diagramm?.werte) zeigeDiagramm(r.diagramm.werte, r.diagramm.beschriftung, r.diagramm.art, r.diagramm.titel);
    return n;
  }

  async function frageAlbatros(wunsch) {
    if (S.denkt || !wunsch.trim()) return;
    S.t.gespraech.push({ wer: 'ich', text: wunsch });
    S.denkt = true; zeichneHelfer();
    const r = await A.assistent({ wunsch, blatt: blatt(), auswahl: auswahlText(), name: S.t.name });
    S.denkt = false;
    if (r?.fehler) {
      S.t.gespraech.push({ wer: 'er', fehler: true, text: r.fehler.nachricht || 'Das hat nicht geklappt.' });
    } else {
      const n = anwenden(r);
      S.t.gespraech.push({ wer: 'er', text: r.antwort, chips: [n ? `${n} Zellen` : null, r.weg === 'heim' ? 'über den Heim-PC' : r.weg === 'eingebaut' ? 'eingebautes Claude' : null].filter(Boolean) });
    }
    if (S.t.gespraech.length > 60) S.t.gespraech = S.t.gespraech.slice(-60);
    geaendert(); zeichneHelfer();
  }

  // ---------- Diagramm ----------
  function zeigeDiagramm(werteBereich, namenBereich, art = 'balken', titel = '') {
    if (!werteBereich) {
      const a = auswahl();
      if (a.sp1 === a.sp2 && a.ze1 === a.ze2) { meldung('Markier zuerst die Zahlen, z. B. eine Spalte.'); return; }
      const kopf = typeof S.werte[Fo.adresse(a.sp2, a.ze1)] === 'string';
      const ze1 = kopf ? a.ze1 + 1 : a.ze1;
      werteBereich = `${Fo.adresse(a.sp2, ze1)}:${Fo.adresse(a.sp2, a.ze2)}`;
      // Beschriftung: Spalte links daneben mit Text, sonst erste Textspalte
      let nameSp = a.sp1 < a.sp2 ? a.sp1 : -1;
      if (nameSp < 0) for (let s = 0; s < a.sp2; s++) { if (typeof S.werte[Fo.adresse(s, ze1)] === 'string') { nameSp = s; } }
      namenBereich = nameSp >= 0 ? `${Fo.adresse(nameSp, ze1)}:${Fo.adresse(nameSp, a.ze2)}` : null;
      titel = kopf ? String(S.werte[Fo.adresse(a.sp2, a.ze1)]) : '';
    }
    const w = sammle(werteBereich); const nm = namenBereich ? sammle(namenBereich) : [];
    const daten = w.map((ad, i) => ({ name: nm[i] ? Fo.zeige(S.werte[nm[i]]) : ad, wert: S.werte[ad] })).filter((d) => typeof d.wert === 'number' && d.name !== '' && !/^summe/i.test(d.name));
    const s = document.createElement('div'); s.className = 'schleier';
    let aktuell = art;
    const bau = () => window.Diagramm.svg({ daten, art: aktuell, titel });
    s.innerHTML = `<div class="fenster" role="dialog" aria-modal="true" aria-label="Diagramm"><div class="reihe"><h2 class="h" style="flex:1">Diagramm</h2>
        <div class="segment">${[['balken', 'Balken'], ['linie', 'Linie'], ['kreis', 'Kreis']].map(([k, t]) => `<label><input type="radio" name="dart" value="${k}" ${k === art ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
        <button type="button" class="rund" data-zu aria-label="Schließen">✕</button></div>
      <div class="diagramm">${bau()}</div>
      <div class="reihe"><span class="leise" style="font-size:13px">${esc(werteBereich)}${namenBereich ? ` · Namen aus ${esc(namenBereich)}` : ''}</span><div class="platz"></div><button type="button" class="btn weiss" data-zu>Schließen</button><button type="button" class="btn" data-bild>${sym('export', 16)} Als Bild speichern</button></div></div>`;
    document.body.appendChild(s);
    s.querySelector('.diagramm svg').setAttribute('style', 'width:100%;height:auto');
    s.addEventListener('change', (ev) => { if (ev.target.name === 'dart') { aktuell = ev.target.value; s.querySelector('.diagramm').innerHTML = bau(); s.querySelector('.diagramm svg').setAttribute('style', 'width:100%;height:auto'); } });
    s.addEventListener('click', async (ev) => {
      if (ev.target === s || ev.target.closest('[data-zu]')) return s.remove();
      if (ev.target.closest('[data-bild]')) { const r = await A.datei.bild(await window.Diagramm.alsBild(bau()), titel || S.t.name); if (r?.ok) meldung('Gespeichert.', { knopf: 'Zeigen', aktion: () => A.datei.zeigen(r.datei) }); }
    });
    s.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') s.remove(); });
    s.querySelector('[data-bild]').focus();
  }

  // ---------- Einstellungen ----------
  async function einstellungen() {
    const e = await A.einstellungen.lesen();
    const s = document.createElement('div'); s.className = 'schleier';
    const eb = e.eingebaut || {};
    s.innerHTML = `<div class="fenster" role="dialog" aria-modal="true" style="width:min(640px,94vw)"><div class="reihe"><h2 class="h" style="flex:1">Einstellungen</h2><button type="button" class="rund" data-zu aria-label="Schließen">✕</button></div>
      <div class="ezeile"><div class="t"><b>Wer rechnet mit</b><span>Claude auf diesem PC, über deinen Heim-PC oder mit API-Schlüssel.</span></div>
        <div class="segment">${[['claude', 'Dieser PC'], ['heim', 'Heim-PC'], ['api', 'API']].map(([k, t]) => `<label><input type="radio" name="weg" value="${k}" ${(e.weg || 'claude') === k ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
      <div class="ezeile w-heim"><div class="t"><b>Adresse vom Heim-PC</b><span>Wie bei Kranich: dort unter Einstellungen → Heim-PC.</span></div><input class="feld" id="e-heimadr" value="${esc(e.heimAdresse)}" placeholder="http://mein-pc:4747"></div>
      <div class="ezeile w-heim"><div class="t"><b>Kopplungscode</b><span>${e.heimCodeGesetzt ? 'Gespeichert – leer lassen zum Behalten.' : 'Vom Heim-PC kopieren.'}</span></div><input class="feld" id="e-heimcode" type="password" placeholder="Code"></div>
      <div class="ezeile w-api"><div class="t"><b>API-Schlüssel</b><span>${e.apiSchluesselGesetzt ? 'Gespeichert – leer lassen zum Behalten.' : 'Beginnt mit sk-ant-'}</span></div><input class="feld" id="e-key" type="password" placeholder="sk-ant-…"></div>
      <div class="ezeile w-modell"><div class="t"><b>Modell</b><span>Opus denkt am besten, Sonnet ist schneller.</span></div><select class="feld" id="e-modell" style="width:140px">${['opus', 'sonnet', 'haiku'].map((m) => `<option ${(e.claudeModell || 'opus') === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      <div class="ezeile"><div class="t"><b>Eingebautes Claude</b><span>${eb.da && eb.token ? `Eingerichtet (${esc(eb.version)}) – springt ein, wenn hier kein Claude Code ist.` : 'Nicht eingerichtet. Geht im Startfenster „Selbst gfaltet“ → Zahnrad → „Claude einrichten“.'}</span></div></div>
      <div class="ezeile"><div class="t"><b>Verbindung</b><span class="status">Noch nicht getestet.</span></div><button type="button" class="btn weiss" data-testen>Testen</button></div>
      <div class="reihe" style="justify-content:flex-end;padding-top:12px"><span class="leise" style="font-size:12.5px;flex:1">Albatros ${esc(e.version || '')}</span><button type="button" class="btn leise" data-zu>Abbrechen</button><button type="button" class="btn" data-speichern>Speichern</button></div></div>`;
    document.body.appendChild(s);
    const zeigeWeg = () => { const w = s.querySelector('input[name="weg"]:checked').value; s.querySelectorAll('.w-heim').forEach((x) => { x.hidden = w !== 'heim'; }); s.querySelectorAll('.w-api').forEach((x) => { x.hidden = w !== 'api'; }); s.querySelectorAll('.w-modell').forEach((x) => { x.hidden = w === 'api'; }); };
    s.addEventListener('change', zeigeWeg); zeigeWeg();
    const werte = () => ({ weg: s.querySelector('input[name="weg"]:checked').value, heimAdresse: s.querySelector('#e-heimadr').value.trim(), heimCode: s.querySelector('#e-heimcode').value.trim(), apiSchluessel: s.querySelector('#e-key').value.trim(), claudeModell: s.querySelector('#e-modell').value });
    s.addEventListener('click', async (ev) => {
      if (ev.target === s || ev.target.closest('[data-zu]')) return s.remove();
      if (ev.target.closest('[data-speichern]')) { await A.einstellungen.setzen(werte()); S.einst = await A.einstellungen.lesen(); s.remove(); meldung('Gespeichert.'); if (S.ansicht === 'start') zeigeStart(); return; }
      if (ev.target.closest('[data-testen]')) {
        await A.einstellungen.setzen(werte());
        const st = s.querySelector('.status'); st.textContent = 'Frage Claude …';
        const r = await A.hirnTesten();
        st.textContent = r?.fehler ? `Klappt nicht: ${r.fehler.nachricht}` : `Claude ist da (${r.weg === 'heim' ? 'über den Heim-PC' : r.weg === 'eingebaut' ? 'eingebautes Claude' : r.weg === 'api' ? 'API' : 'dieser PC'}).`;
      }
    });
    s.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') s.remove(); });
  }

  // ---------- Aktionen ----------
  const aktionen = {
    start: () => zeigeStart(),
    einstellungen: () => einstellungen(),
    tabelle: (el, ev) => { if (ev?.target?.closest('[data-aktion="loeschen"]')) return; oeffne(el.dataset.id); },
    loeschen: async (el) => {
      const t = S.liste.find((x) => x.id === el.dataset.id);
      if (!window.confirm(`„${t?.name || 'Tabelle'}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return;
      await A.tabellen.loeschen(el.dataset.id); meldung('Gelöscht.'); zeigeStart();
    },
    neu: async () => { const t = await A.tabellen.neu('Neue Tabelle'); oeffne(t.id); },
    vorlage: async (el) => {
      const v = VORLAGEN[el.dataset.k];
      const t = await A.tabellen.neu(v.name, [{ name: 'Blatt 1', ...JSON.parse(JSON.stringify(v.blatt)) }]);
      // Bereiche in den Vorlagen auflösen
      for (const b of t.blaetter) for (const k of ['formate', 'farben', 'fett']) { const neu = {}; for (const [kk, vv] of Object.entries(b[k] || {})) for (const ad of (kk.includes(':') ? sammle(kk) : [kk])) neu[ad] = vv; b[k] = neu; }
      await A.tabellen.speichern(t);
      oeffne(t.id);
    },
    beispiel: (el) => { document.getElementById('startfrage').value = el.dataset.text; aktionen.ausrechnen(); },
    ausrechnen: async () => {
      const f = document.getElementById('startfrage'); const wunsch = f?.value.trim();
      if (!wunsch) { f?.focus(); return; }
      const t = await A.tabellen.neu('Ausrechnung');
      await oeffne(t.id);
      frageAlbatros(`Neue Tabelle: ${wunsch}`);
    },
    oeffnen: async () => { const r = await A.datei.importieren(); if (r?.abgebrochen) return; if (r?.fehler) { meldung(r.fehler.nachricht); return; } oeffne(r.id); meldung(`„${r.name}“ geöffnet.`); },
    umbenennen: (el) => {
      const f = document.createElement('input'); f.value = S.t.name; el.replaceWith(f); f.focus(); f.select();
      const fertig = () => { const n = f.value.trim(); if (n) S.t.name = n.slice(0, 80); const b = document.createElement('b'); b.className = 'h'; b.dataset.aktion = 'umbenennen'; b.title = 'Zum Umbenennen klicken'; b.textContent = S.t.name; f.replaceWith(b); geaendert(); };
      f.addEventListener('blur', fertig, { once: true });
      f.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') f.blur(); if (ev.key === 'Escape') { f.value = S.t.name; f.blur(); } });
    },
    rueckgaengig: () => rueckgaengig(),
    wiederholen: () => wiederholen(),
    fett: () => { const an = !blatt().fett[Fo.adresse(S.anker.sp, S.anker.ze)]; fuerAuswahl((ad) => { if (an) blatt().fett[ad] = true; else delete blatt().fett[ad]; }); },
    format: (el) => { const art = el.dataset.art; const an = blatt().formate[Fo.adresse(S.anker.sp, S.anker.ze)] !== art; fuerAuswahl((ad) => { if (an) blatt().formate[ad] = art; else delete blatt().formate[ad]; }); },
    farbmenue: (el) => {
      const w = el.closest('.farbwahl'); const da = w.querySelector('.farben'); if (da) { da.remove(); return; }
      const m = document.createElement('div'); m.className = 'farben';
      m.innerHTML = ['#f6d5c4', '#d4ecdc', '#f8e1a8', '#f3c9c4', '#dbe7f5', '#ece6fd', ''].map((f) => `<button type="button" data-farbe="${f}" title="${f ? 'Farbe' : 'Keine Farbe'}" style="background:${f || '#fff'}">${f ? '' : '✕'}</button>`).join('');
      w.appendChild(m);
      m.addEventListener('click', (ev) => { const b = ev.target.closest('[data-farbe]'); if (!b) return; const f = b.dataset.farbe; fuerAuswahl((ad) => { if (f) blatt().farben[ad] = f; else delete blatt().farben[ad]; }); m.remove(); });
    },
    'zeile-dazu': () => { merke(); zeileEinfuegen(auswahl().ze2 + 1); geaendert(); zeichneTabelle(); waehle(S.anker.sp, auswahl().ze2 + 1); },
    'spalte-dazu': () => { merke(); spalteEinfuegen(auswahl().sp2 + 1); geaendert(); zeichneTabelle(); waehle(auswahl().sp2 + 1, S.anker.ze); },
    sortieren: () => sortiere(),
    'summe-unten': () => summeUnten(),
    unten: (el) => summeUnten(el.dataset.fn),
    diagramm: () => zeigeDiagramm(),
    erklaeren: async () => {
      const ad = Fo.adresse(S.anker.sp, S.anker.ze); const roh = blatt().zellen[ad];
      if (!roh || !String(roh).startsWith('=')) { meldung('Klick zuerst eine Zelle mit Formel an (erkennst du an der grünen Ecke).'); return; }
      S.t.gespraech.push({ wer: 'ich', text: `Was rechnet ${ad}?` });
      S.denkt = true; zeichneHelfer();
      const r = await A.erklaeren({ blatt: blatt(), zelle: ad });
      S.denkt = false;
      S.t.gespraech.push(r?.fehler ? { wer: 'er', fehler: true, text: r.fehler.nachricht } : { wer: 'er', text: r.antwort, chips: [roh] });
      geaendert(); zeichneHelfer();
    },
    frage: (el) => frageAlbatros(el.dataset.text),
    senden: () => { const f = document.getElementById('frage'); const t = f.value; f.value = ''; frageAlbatros(t); },
    exportmenue: (el) => {
      const w = el.parentElement; const da = w.querySelector('.menue'); if (da) { da.remove(); return; }
      const m = document.createElement('div'); m.className = 'menue';
      m.innerHTML = `<button type="button" data-art="xlsx">${sym('tabelle', 16)}<span>Excel-Datei<small>.xlsx – mit Formeln, für Excel & Co.</small></span></button><button type="button" data-art="csv">${sym('export', 16)}<span>CSV<small>Nur Werte, dieses Blatt</small></span></button><button type="button" data-art="pdf">${sym('export', 16)}<span>PDF<small>Zum Drucken oder Mailen</small></span></button>`;
      w.appendChild(m);
      m.addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-art]'); if (!b) return; m.remove();
        await A.tabellen.speichern(S.t);
        const r = await A.datei.exportieren(S.t, b.dataset.art, S.blattNr);
        if (r?.ok) meldung('Gespeichert.', { knopf: 'Im Ordner zeigen', aktion: () => A.datei.zeigen(r.datei), dauer: 7000 });
        else if (r?.fehler) meldung(`Klappt nicht: ${r.fehler.nachricht}`);
      });
    },
    blatt: (el, ev) => { if (ev?.target?.closest('[data-aktion="blatt-weg"]')) return; S.blattNr = Number(el.dataset.i); S.anker = { sp: 0, ze: 0 }; S.ende = { sp: 0, ze: 0 }; S.zurueck = []; S.vor = []; app.querySelector('.blattname').textContent = blatt().name; { const b2 = app.querySelector('.blattname2'); if (b2) b2.textContent = blatt().name; } zeichneTabelle(); },
    'blatt-dazu': () => { S.t.blaetter.push({ name: `Blatt ${S.t.blaetter.length + 1}`, zellen: {}, formate: {}, farben: {}, fett: {}, breiten: {} }); S.blattNr = S.t.blaetter.length - 1; S.zurueck = []; app.querySelector('.blattname').textContent = blatt().name; { const b2 = app.querySelector('.blattname2'); if (b2) b2.textContent = blatt().name; } geaendert(); zeichneTabelle(); },
    'blatt-weg': (el) => { const i = Number(el.dataset.i); if (S.t.blaetter.length < 2 || !window.confirm(`Blatt „${S.t.blaetter[i].name}“ löschen?`)) return; S.t.blaetter.splice(i, 1); S.blattNr = 0; S.zurueck = []; geaendert(); zeichneTabelle(); },
  };

  // ---------- Ereignisse ----------
  app.addEventListener('click', (ev) => {
    if (!ev.target.closest('.menue, [data-aktion="exportmenue"]')) document.querySelector('.menue')?.remove();
    if (!ev.target.closest('.farbwahl')) document.querySelector('.farben')?.remove();
    const el = ev.target.closest('[data-aktion]');
    if (!el) return;
    const fn = aktionen[el.dataset.aktion];
    if (fn) Promise.resolve(fn(el, ev)).catch((f) => meldung(f.message || String(f)));
  });
  app.addEventListener('dblclick', (ev) => {
    const td = ev.target.closest('td[data-a]'); if (td && S.ansicht === 'tabelle') { starteBearbeiten(); return; }
    const r = ev.target.closest('.sl-blatt[data-i], .blattname2');
    if (r) { const b = S.t.blaetter[r.dataset.i !== undefined ? Number(r.dataset.i) : S.blattNr]; const f = document.createElement('input'); f.value = b.name; f.style.width = '110px'; r.replaceWith(f); f.focus(); f.select(); const ok = () => { b.name = f.value.trim().slice(0, 31) || b.name; if (r.dataset.i === undefined) { r.textContent = b.name; f.replaceWith(r); } app.querySelector('.blattname').textContent = blatt().name; { const b2 = app.querySelector('.blattname2'); if (b2) b2.textContent = blatt().name; } geaendert(); zeichneReiter(); }; f.addEventListener('blur', ok, { once: true }); f.addEventListener('keydown', (e) => { if (e.key === 'Enter') f.blur(); }); return; }
  });
  // Markieren mit Maus (ziehen), Spalten/Zeilen per Kopf, Spaltenbreite ziehen
  let zieht = false;
  app.addEventListener('mousedown', (ev) => {
    if (S.ansicht !== 'tabelle' || ev.button !== 0) return;
    const zg = ev.target.closest('[data-ziehen]');
    if (zg) {
      ev.preventDefault();
      const sp = Number(zg.dataset.ziehen); const name = Fo.nrZuSpalte(sp); const start = ev.clientX; const alt = blatt().breiten[name] || 110;
      const col = app.querySelectorAll('table.gitter col')[sp + 1];
      const bewegt = (e) => { const b = Math.max(40, Math.min(600, alt + e.clientX - start)); col.style.width = `${b}px`; blatt().breiten[name] = b; };
      const los = () => { document.removeEventListener('mousemove', bewegt); document.removeEventListener('mouseup', los); geaendert(); };
      document.addEventListener('mousemove', bewegt); document.addEventListener('mouseup', los);
      return;
    }
    const td = ev.target.closest('td[data-a]');
    const kopf = ev.target.closest('th[data-spalte]');
    const nr = ev.target.closest('th[data-zeile]');
    if (!td && !kopf && !nr) return;
    // Beim Formel-Tippen: Klick fügt die Adresse ein
    if (td && S.bearbeiten && S.bearbeiten.ort === 'zelle' && S.bearbeiten.feld.value.startsWith('=') && td.dataset.a !== S.bearbeiten.a) {
      ev.preventDefault(); S.klickInFormel = true;
      const f = S.bearbeiten.feld; const pos = f.selectionStart; f.value = f.value.slice(0, pos) + td.dataset.a + f.value.slice(f.selectionEnd); f.focus(); f.setSelectionRange(pos + td.dataset.a.length, pos + td.dataset.a.length);
      document.getElementById('formel').value = f.value;
      return;
    }
    if (S.bearbeiten?.ort === 'zelle') beende(true);
    ev.preventDefault();
    app.querySelector('.rasterscroll').focus({ preventScroll: true });
    const g = groesse(blatt());
    if (kopf) { const sp = Number(kopf.dataset.spalte); if (ev.shiftKey) { S.ende = { sp, ze: Math.max(g.ze, 0) }; } else { S.anker = { sp, ze: 0 }; S.ende = { sp, ze: Math.max(g.ze, 0) }; } zeigeAuswahl(); return; }
    if (nr) { const ze = Number(nr.dataset.zeile); S.anker = { sp: 0, ze }; S.ende = { sp: Math.max(g.sp, 0), ze }; zeigeAuswahl(); return; }
    const z = Fo.zerlege(td.dataset.a);
    waehle(z.sp, z.ze, ev.shiftKey);
    zieht = true;
  });
  app.addEventListener('mouseover', (ev) => {
    if (!zieht) return;
    const td = ev.target.closest('td[data-a]'); if (!td) return;
    const z = Fo.zerlege(td.dataset.a);
    if (z.sp !== S.ende.sp || z.ze !== S.ende.ze) { S.ende = z; zeigeAuswahl(); }
  });
  document.addEventListener('mouseup', () => { zieht = false; });

  document.addEventListener('keydown', (ev) => {
    const strg = ev.ctrlKey || ev.metaKey;
    if (strg && ev.key.toLowerCase() === 'o') { ev.preventDefault(); aktionen.oeffnen(); return; }
    if (strg && ev.key.toLowerCase() === 'n') { ev.preventDefault(); aktionen.neu(); return; }
    if (S.ansicht !== 'tabelle' || document.querySelector('.schleier')) return;
    const ziel = ev.target;
    if (ziel.closest?.('.helfer, .dok, .formelzeile') || ziel.classList?.contains('eingabefeld') || ziel.tagName === 'INPUT') return;
    if (strg && ev.key.toLowerCase() === 'z') { ev.preventDefault(); rueckgaengig(); return; }
    if (strg && (ev.key.toLowerCase() === 'y' || (ev.shiftKey && ev.key.toLowerCase() === 'z'))) { ev.preventDefault(); wiederholen(); return; }
    if (strg && ev.key.toLowerCase() === 'b') { ev.preventDefault(); aktionen.fett(); return; }
    if (strg && ev.key.toLowerCase() === 'a') { ev.preventDefault(); const g = groesse(blatt()); S.anker = { sp: 0, ze: 0 }; S.ende = { sp: g.sp, ze: g.ze }; zeigeAuswahl(); return; }
    const pfeile = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (pfeile[ev.key]) {
      ev.preventDefault();
      let [dsp, dze] = pfeile[ev.key];
      if (strg) { const g = groesse(blatt()); if (dze > 0) dze = g.ze - S.ende.ze; if (dze < 0) dze = -S.ende.ze; if (dsp > 0) dsp = g.sp - S.ende.sp; if (dsp < 0) dsp = -S.ende.sp; }
      bewege(dsp, dze, ev.shiftKey); return;
    }
    if (ev.key === 'Enter') { ev.preventDefault(); bewege(0, ev.shiftKey ? -1 : 1); return; }
    if (ev.key === 'Tab') { ev.preventDefault(); bewege(ev.shiftKey ? -1 : 1, 0); return; }
    if (ev.key === 'F2') { ev.preventDefault(); starteBearbeiten(); return; }
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); loescheAuswahl(); return; }
    if (ev.key === 'Escape') { S.ende = { ...S.anker }; zeigeAuswahl(); return; }
    if (ev.key.length === 1 && !strg && !ev.altKey) { ev.preventDefault(); starteBearbeiten(ev.key); }
  });
  document.addEventListener('copy', (ev) => { if (S.ansicht === 'tabelle' && !S.bearbeiten && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) kopiere(ev); });
  document.addEventListener('cut', (ev) => { if (S.ansicht === 'tabelle' && !S.bearbeiten && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) kopiere(ev, true); });
  document.addEventListener('paste', (ev) => { if (S.ansicht === 'tabelle' && !S.bearbeiten && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) fuegeEin(ev); });

  // Datei reinziehen
  document.addEventListener('dragover', (ev) => { ev.preventDefault(); document.body.classList.add('zieht'); });
  document.addEventListener('dragleave', (ev) => { if (!ev.relatedTarget) document.body.classList.remove('zieht'); });
  document.addEventListener('drop', async (ev) => {
    ev.preventDefault(); document.body.classList.remove('zieht');
    const f = ev.dataTransfer?.files?.[0]; if (!f) return;
    const pfad = A.pfadVon(f);
    if (!pfad || !/\.(xlsx|csv)$/i.test(f.name)) { meldung('Nur .xlsx- und .csv-Dateien gehen.'); return; }
    const r = await A.datei.importieren(pfad);
    if (r?.fehler) { meldung(r.fehler.nachricht); return; }
    oeffne(r.id); meldung(`„${r.name}“ geöffnet.`);
  });

  // Leben in den Vogel oben links
  setInterval(() => {
    if (document.hidden || S.denkt) return;
    const m = app.querySelector('.marke'); if (!m) return;
    const alt = m.querySelector('svg[role="img"]'); if (!alt) return;
    const anim = ['winkt', 'sassy', 'gemerkt', 'applaus', 'ruhezustand-2', 'ruhezustand-4'][Math.floor(Math.random() * 6)];
    const d = document.createElement('div'); d.innerHTML = vogel(anim, alt.getAttribute('width') || 30); const neu = d.firstElementChild;
    alt.replaceWith(neu); setTimeout(() => { if (neu.isConnected) neu.replaceWith(alt); }, 3600);
  }, 14000);

  window.App = { S, aktionen, oeffne, zeigeStart, frageAlbatros, zeigeDiagramm };

  (async () => {
    S.einst = (await A.einstellungen.lesen()) || {};
    await zeigeStart();
    A.beimOeffnen(async (o) => { if (o.id) oeffne(o.id); else if (o.datei) { const r = await A.datei.importieren(o.datei); if (!r?.fehler) oeffne(r.id); } });
  })();
})();
