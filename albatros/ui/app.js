'use strict';
// Albatros – Oberfläche: Start, Tabelle, Helfer, Diagramm, Einstellungen.
(function () {
  const A = window.ALB;
  const Fo = window.Formeln;
  const W = window.Werkzeug;
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Kleinkram ----------
  const ICON = {
    links: 'M15 18l-6-6 6-6', zahnrad: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    zurueck: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3', vor: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3', plus: 'M12 5v14M5 12h14', muell: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
    sortieren: 'M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4', diagramm: 'M4 20V10M10 20V4M16 20v-7M22 20H2', export: 'M12 3v12M7 10l5 5 5-5M5 21h14', oeffnen: 'M3 7h6l2 2h10v10H3z',
    senden: 'M12 19V5M5 12l7-7 7 7', summe: 'M18 4H6l6 8-6 8h12', fx: 'M9 20c2 0 2-2 3-8s1-8 3-8M7 12h8', lupe: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3', farbe: 'M12 3l7 7-7 7-7-7 7-7zM19 18a2 2 0 0 0 4 0c0-1.5-2-4-2-4s-2 2.5-2 4z',
    tabelle: 'M3 4h18v16H3zM3 10h18M3 15h18M9 4v16M15 4v16', verbinden: 'M3 5h18v14H3zM7 12h10M14 9l3 3-3 3M10 9l-3 3 3 3', fixieren: 'M12 17v5M8 3h8l-1 6 3 3H6l3-3z', filter: 'M3 5h18l-7 8v6l-4-2v-4z', hervor: 'M4 20h16M7 16l5-11 5 11M9 12h6', liste: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01', pivot: 'M3 3h18v18H3zM3 9h18M9 3v18M13 13h4M13 17h4', makro: 'M7 4l13 8-13 8z', drucker: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z', zeile: 'M3 6h18M3 12h18M12 15v6M9 18h6', spalte: 'M6 3v18M12 3v18M15 12h6M18 9v6', gruppe: 'M4 6h16M4 12h10M4 18h6',
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
    v: 0, r: null, versteckt: new Set(), aufnahme: null, suche: null,
  };
  const felder = (b) => { for (const k of ['zellen', 'formate', 'farben', 'fett', 'breiten']) b[k] = b[k] || {}; return b; };
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
  const nurVerbund = () => { if (!S.t) return false; const a = auswahl(); const v = W.verbundVon(blatt(), a.sp1, a.ze1); return v && v.sp1 === a.sp1 && v.ze1 === a.ze1 && v.sp2 === a.sp2 && v.ze2 === a.ze2; };
  // Schnell Spalte/Zeile aus "AB12" lesen (ohne regulären Ausdruck – zählt bei großen Tabellen)
  function teile(ad) { let i = 0, sp = 0; while (i < ad.length) { const c = ad.charCodeAt(i); if (c < 65 || c > 90) break; sp = sp * 26 + (c - 64); i++; } return [sp - 1, Number(ad.slice(i)) - 1]; }
  const gSpeicher = new WeakMap();
  function groesse(b) {
    const m = gSpeicher.get(b); if (m && m.v === S.v) return m.g;
    let sp = 0, ze = 0;
    // ein Durchgang: Größe und Anzahl Einträge (Zeilen mit Daten ohne Formel)
    const daten = new Set(), formel = new Set();
    for (const a in b.zellen) {
      let i = 0, s2 = 0; while (i < a.length) { const c = a.charCodeAt(i); if (c < 65) break; s2 = s2 * 26 + (c - 64); i++; }
      s2--; const z2 = Number(a.slice(i)) - 1;
      if (s2 > sp) sp = s2; if (z2 > ze) ze = z2;
      if (z2 > 0) { const v = b.zellen[a]; if (typeof v === 'string' && v.charCodeAt(0) === 61) formel.add(z2); else daten.add(z2); }
    }
    let n = 0; for (const z2 of daten) if (!formel.has(z2)) n++;
    const g = { sp, ze, eintraege: n }; gSpeicher.set(b, { v: S.v, g }); return g;
  }
  // Rechnen nur bei Bedarf: Werte werden erst ausgerechnet, wenn sie gebraucht werden (schnell bei großen Tabellen)
  function rechne(neu = false) {
    if (!neu && S.r && S.rStand === S.v && S.rBlatt === blatt() && S.rBlaetter === S.t.blaetter) return;
    S.rStand = S.v; S.rBlatt = blatt(); S.rBlaetter = S.t.blaetter;
    const m = Fo.mappe(S.t.blaetter); const r = m(blatt().name) || Fo.rechner(blatt(), m);
    S.r = r;
    S.werte = new Proxy({}, { get: (_, ad) => (typeof ad === 'string' && /^[A-Z]{1,3}\d+$/.test(ad) ? r.wert(ad) : undefined) });
  }
  // Anzeige einer Zelle (Datum/Uhrzeit wird erkannt, auch ohne eigenes Format)
  function fmtVon(b, ad) {
    if (b.formate[ad]) return b.formate[ad];
    const roh = b.zellen[ad];
    if (typeof roh === 'string') return Fo.datumArt(roh);
    const u = S.r?.ueber.get(ad); return u ? b.formate[u.quelle] || null : null;
  }
  const zeigeZelle = (b, ad, w = S.werte[ad]) => (b.formate[ad] === 'text' && b.zellen[ad] !== undefined ? String(b.zellen[ad]) : Fo.zeige(w, fmtVon(b, ad)));

  // ---------- Speichern und Rückgängig ----------
  let speicherUhr = null;
  function geaendert() {
    S.v++; rechne();
    const chip = document.querySelector('.gespeichert'); if (chip) chip.textContent = 'speichert …';
    clearTimeout(speicherUhr);
    speicherUhr = setTimeout(async () => { const r = await A.tabellen.speichern(S.t); const c = document.querySelector('.gespeichert'); if (c) c.textContent = r?.fehler ? 'nicht gespeichert!' : 'gespeichert'; }, 500);
  }
  // Rückgängig: bei kleinen Änderungen nur die betroffenen Zellen merken, sonst das ganze Blatt
  const zustand = (b, ad) => [b.zellen[ad], b.formate[ad], b.farben[ad], b.fett[ad]];
  function zuruecksetzen(b, ad, [z, fo, fa, fe]) {
    if (z === undefined) delete b.zellen[ad]; else b.zellen[ad] = z;
    if (fo === undefined) delete b.formate[ad]; else b.formate[ad] = fo;
    if (fa === undefined) delete b.farben[ad]; else b.farben[ad] = fa;
    if (fe) b.fett[ad] = true; else delete b.fett[ad];
  }
  function merke(adressen) {
    let e;
    if (adressen === 'alle') e = { alle: JSON.stringify(S.t.blaetter), nr: S.blattNr };
    else if (adressen === 'meta') e = { nr: S.blattNr, meta: JSON.stringify(metaVon(blatt())) };
    else if (Array.isArray(adressen) && adressen.length <= 20000) { const z = {}; for (const ad of adressen) z[ad] = zustand(blatt(), ad); e = { nr: S.blattNr, zellen: z }; }
    else e = { nr: S.blattNr, ganz: JSON.stringify(blatt()) };
    S.zurueck.push(e);
    let gewicht = 0;
    for (let i = S.zurueck.length - 1; i >= 0; i--) { gewicht += (S.zurueck[i].ganz || S.zurueck[i].alle || '').length + 200; if (gewicht > 60e6 || S.zurueck.length - i > 80) { S.zurueck.splice(0, i + 1); break; } }
    S.vor = [];
  }
  function umkehren(e) {
    if (e.alle) { const jetzt = { alle: JSON.stringify(S.t.blaetter), nr: S.blattNr }; S.t.blaetter = JSON.parse(e.alle).map(felder); S.blattNr = Math.min(e.nr, S.t.blaetter.length - 1); return jetzt; }
    if (!S.t.blaetter[e.nr]) return e;
    if (e.meta) { const b = S.t.blaetter[e.nr]; const jetzt = { nr: e.nr, meta: JSON.stringify(metaVon(b)) }; const m = JSON.parse(e.meta); for (const k of Object.keys(metaVon(b))) { if (m[k] === undefined) delete b[k]; else b[k] = m[k]; } b.breiten = b.breiten || {}; S.blattNr = e.nr; return jetzt; }
    if (e.ganz) { const jetzt = { nr: e.nr, ganz: JSON.stringify(S.t.blaetter[e.nr]) }; S.t.blaetter[e.nr] = felder(JSON.parse(e.ganz)); S.blattNr = e.nr; return jetzt; }
    const b = S.t.blaetter[e.nr]; const jetzt = { nr: e.nr, zellen: {} };
    for (const [ad, z] of Object.entries(e.zellen)) { jetzt.zellen[ad] = zustand(b, ad); zuruecksetzen(b, ad, z); }
    S.blattNr = e.nr; return jetzt;
  }
  function nachUmkehren() { geaendert(); zeichneTabelle(); blattNamenZeigen(); }
  function rueckgaengig() { if (!S.zurueck.length) return; S.vor.push(umkehren(S.zurueck.pop())); nachUmkehren(); }
  function wiederholen() { if (!S.vor.length) return; S.zurueck.push(umkehren(S.vor.pop())); nachUmkehren(); }
  function blattNamenZeigen() { const a = app.querySelector('.blattname'); if (a) a.textContent = blatt().name; const b2 = app.querySelector('.blattname2'); if (b2) b2.textContent = blatt().name; }

  function setze(a, roh) {
    const b = blatt();
    if (roh === null || roh === undefined || roh === '') delete b.zellen[a];
    else b.zellen[a] = String(roh);
    if (!S.live) S.v++;
    if (S.aufnahme && !S.live) notiere(`tab.setze(${JSON.stringify(a)}, ${JSON.stringify(roh === null || roh === undefined ? '' : String(roh))});`);
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
          <section class="blatt tipp"><h2 class="h">Excel-Datei mitgebracht?</h2><div class="ablage">Datei hierher ziehen<br><span class="leise" style="font-weight:400;font-size:13px">.xlsx, .xlsm oder .csv</span></div><button type="button" class="btn weiss" data-aktion="oeffnen">${sym('oeffnen', 16)} Datei öffnen</button></section>
        </div>
      </main>`;
    setTimeout(() => { if (S.ansicht === 'start' && !document.querySelector('.schleier')) A.standFoto?.('albatros-start'); }, 2500);
    const f = document.getElementById('startfrage');
    f.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') aktionen.ausrechnen(); });
  }

  // ---------- Tabelle öffnen ----------
  async function oeffne(id) {
    const t = await A.tabellen.lesen(id);
    if (S.ansicht === 'start' && t && !t.fehler) S.liste = S.liste || [];
    if (!t || t.fehler) { meldung('Die Tabelle lässt sich nicht öffnen.'); return zeigeStart(); }
    S.t = t; S.blattNr = 0; S.anker = { sp: 0, ze: 0 }; S.ende = { sp: 0, ze: 0 }; S.zurueck = []; S.vor = []; S.bearbeiten = null;
    t.gespraech = t.gespraech || [];
    for (const b of t.blaetter) felder(b);
    t.makros = t.makros || [];
    zeigeTabelle();
    if (t.vba?.length && !t.vbaGezeigt) { t.vbaGezeigt = true; meldung(`Diese Datei hat ${t.vba.length} Excel-Makro${t.vba.length > 1 ? 's' : ''}. Albatros führt sie nicht aus, kann sie aber übersetzen.`, { knopf: 'Ansehen', aktion: () => makroFenster(), dauer: 12000 }); }
  }

  function zeigeTabelle() {
    S.ansicht = 'tabelle';
    rechne();
    app.innerHTML = `<header class="kopf"><button type="button" class="marke" data-aktion="start" title="Alle Tabellen">${sym('links', 18)}${vogel('ruhezustand-3', 36)}<b class="h">Albatros</b></button><span class="trenner"></span>
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
            <button type="button" class="wz" data-aktion="formatmenue" data-schwebe-auf title="Zahlenformat: Euro, Prozent, Datum, Uhrzeit …"><b style="font:700 12.5px var(--mono)">123</b> ▾</button>
            <button type="button" class="wz" data-aktion="format" data-art="eur" title="Als Euro">€</button>
            <button type="button" class="wz" data-aktion="format" data-art="prozent" title="Als Prozent">%</button>
            <span class="farbwahl"><button type="button" class="wz" data-aktion="farbmenue" title="Farbe">${sym('farbe', 15)}</button></span>
            <button type="button" class="wz" data-aktion="verbinden" title="Zellen verbinden / lösen">${sym('verbinden', 15)}</button><span class="tz"></span>
            <button type="button" class="wz" data-aktion="zeile-dazu" title="Zeile darunter einfügen">${sym('zeile', 15)} Zeile</button>
            <button type="button" class="wz" data-aktion="spalte-dazu" title="Spalte rechts einfügen">${sym('spalte', 15)} Spalte</button>
            <button type="button" class="wz" data-aktion="fixieren" title="Zeilen/Spalten beim Scrollen festhalten (oberhalb und links der markierten Zelle)">${sym('fixieren', 15)} Fixieren</button><span class="tz"></span>
            <button type="button" class="wz" data-aktion="sortieren" title="Nach der markierten Spalte sortieren">${sym('sortieren', 15)} Sortieren</button>
            <button type="button" class="wz" data-aktion="filter" title="Filter an/aus (Strg+Umschalt+L)">${sym('filter', 15)} Filter</button>
            <button type="button" class="wz" data-aktion="hervorheben" title="Automatisch färben, z. B. alles unter 0 rot">${sym('hervor', 15)} Hervorheben</button>
            <button type="button" class="wz" data-aktion="liste" title="Auswahlliste (Dropdown) für Zellen">${sym('liste', 15)} Liste</button><span class="tz"></span>
            <button type="button" class="wz" data-aktion="diagramm" title="Diagramm aus der Markierung">${sym('diagramm', 15)} Diagramm</button>
            <button type="button" class="wz" data-aktion="uebersicht" title="Übersicht (Pivot): Summen je Kategorie, Monat …">${sym('pivot', 15)} Übersicht</button>
            <button type="button" class="wz" data-aktion="summe-unten" title="Summe unter die Markierung">${sym('summe', 15)} Summe</button><span class="tz"></span>
            <button type="button" class="wz" data-aktion="suchen" title="Suchen & Ersetzen (Strg+F / Strg+H)">${sym('lupe', 15)}</button>
            <button type="button" class="wz" data-aktion="makros" title="Makros: aufnehmen, schreiben, ausführen">${sym('makro', 15)} Makros</button>
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
    const sc = app.querySelector('.rasterscroll');
    sc.focus();
    let scrollUhr = null;
    sc.addEventListener('scroll', () => {
      if (!S.fenster || S.bearbeiten) return;
      const oben = Math.floor(sc.scrollTop / 30); const unten = oben + Math.ceil(sc.clientHeight / 30);
      if ((S.fenster.von > 0 && oben < S.fenster.von + 10) || (S.fenster.bis < S.fenster.zeilen && unten > S.fenster.bis - 10)) { clearTimeout(scrollUhr); scrollUhr = setTimeout(() => zeichneTabelle(), 30); }
    });
    setTimeout(() => { if (S.ansicht === 'tabelle' && !document.querySelector('.schleier')) A.standFoto?.('albatros-tabelle'); }, 3000);
  }

  // ---------- Gitter ----------
  function zeichneTabelle() {
    if (S.ansicht !== 'tabelle') return;
    const b = blatt();
    rechne();
    const g = groesse(b);
    const fx = { ze: b.fixiert?.ze || 0, sp: b.fixiert?.sp || 0 };
    const spalten = Math.max(g.sp + 4, 10, S.ende.sp + 2, fx.sp + 2);
    const zeilen = Math.max(g.ze + 16, 40, S.ende.ze + 4, fx.ze + 2);
    const wertVon = (ad) => S.werte[ad];
    const weg = W.versteckteZeilen(b, wertVon); S.versteckt = weg;
    const liste = []; for (let ze = fx.ze; ze < zeilen; ze++) if (!weg.has(ze)) liste.push(ze);
    const boxV = app.querySelector('.rasterscroll');
    const hoeheV = Math.max(400, boxV?.clientHeight || 800);
    const von = Math.max(0, Math.floor((boxV?.scrollTop || 0) / 30) - 30);
    const bis = Math.min(liste.length, von + Math.ceil(hoeheV / 30) + 60);
    S.fenster = { von, bis, zeilen: liste.length };
    const a = auswahl();
    const breite = (sp) => b.breiten[Fo.nrZuSpalte(sp)] || 110;
    const links = []; { let x = 46; for (let sp = 0; sp < fx.sp; sp++) { links.push(x); x += breite(sp); } }
    const chips = chipSpalten(b);
    const verd = W.verdeckt(b);
    const stile = W.regelnAuswerten(b, wertVon);
    const fkopf = b.filter ? (b.filter.kopf || 0) : -1;
    const kopfZeilen = []; for (let ze = 0; ze < fx.ze; ze++) if (!weg.has(ze)) kopfZeilen.push(ze);
    const gerendert = new Set([...kopfZeilen, ...liste.slice(von, bis)]);
    const zelle = (sp, ze) => {
      const ad = Fo.adresse(sp, ze);
      const vd = verd.get(ad); let span = '';
      if (vd === 'weg') { const r = W.verbundVon(b, sp, ze); if (gerendert.has(r.ze1) && (r.ze1 < fx.ze) === (ze < fx.ze)) return ''; }
      else if (vd) { const cs = vd.sp2 - vd.sp1 + 1; let rs = 0; for (let z = vd.ze1; z <= vd.ze2; z++) if (gerendert.has(z) && (z < fx.ze) === (ze < fx.ze)) rs++; span = `${cs > 1 ? ` colspan="${cs}"` : ''}${rs > 1 ? ` rowspan="${rs}"` : ''}`; }
      const roh = b.zellen[ad]; const w = S.werte[ad];
      const kl = [];
      if (typeof w === 'number') kl.push('zahl');
      if (w instanceof Fo.Fehler) kl.push('fehler');
      if (b.fett[ad]) kl.push('fett');
      if (roh && String(roh).startsWith('=')) kl.push('formel');
      if (vd && vd !== 'weg') kl.push('verbunden');
      if (ze === 0) kl.push('kopfzeile');
      if (S.r.ueber.has(ad)) kl.push('ueber');
      if (sp >= a.sp1 && sp <= a.sp2 && ze >= a.ze1 && ze <= a.ze2 && (a.sp1 !== a.sp2 || a.ze1 !== a.ze2)) kl.push('in');
      if (sp === S.anker.sp && ze === S.anker.ze) kl.push('aktiv');
      let stil = '';
      const st = stile.get(ad);
      const farbe = st?.farbe || b.farben[ad];
      if (farbe) stil += `background-color:${esc(farbe)};`;
      if (st?.balken) stil += `background-image:linear-gradient(90deg,${esc(st.balken.farbe)} ${Math.round(st.balken.anteil * 100)}%,transparent ${Math.round(st.balken.anteil * 100)}%);background-size:100% 62%;background-position:0 50%;background-repeat:no-repeat;`;
      if (sp < fx.sp) { kl.push('fix'); stil += `left:${links[sp]}px;`; }
      const lq = listeFuer(b, ad);
      if (lq) { kl.push('mitliste'); const erlaubt = listenWerte(lq); if (roh !== undefined && roh !== '' && !String(roh).startsWith('=') && !erlaubt.some((x) => x.toLowerCase() === String(zeigeZelle(b, ad, w)).toLowerCase())) kl.push('ungueltig'); }
      const text = zeigeZelle(b, ad, w);
      let inhalt = ze > 0 && chips.has(sp) && typeof w === 'string' && text && !/^(gesamt|summe)$/i.test(text) ? `<span class="tchip" style="background:${chipFarbe(text)}">${esc(text)}</span>` : esc(text);
      if (ze === fkopf && sp <= g.sp) { kl.push('mitfilter'); inhalt += `<span class="fknopf${b.filter.spalten?.[Fo.nrZuSpalte(sp)] ? ' an' : ''}" data-filter="${sp}" title="Filtern und sortieren">▾</span>`; }
      return `<td data-a="${ad}"${span} class="${kl.join(' ')}"${stil ? ` style="${stil}"` : ''}>${inhalt}</td>`;
    };
    const zeile = (ze) => { let h = `<tr><th class="nr ${ze >= a.ze1 && ze <= a.ze2 ? 'sel' : ''}${weg.has(ze - 1) || weg.has(ze + 1) ? ' luecke' : ''}" data-zeile="${ze}">${ze + 1}</th>`; for (let sp = 0; sp < spalten; sp++) h += zelle(sp, ze); return `${h}</tr>`; };
    let gesamt = 46; for (let sp = 0; sp < spalten; sp++) gesamt += breite(sp);
    let html = `<table class="gitter${fx.ze ? ' mitfix' : ''}" style="width:${gesamt}px"><colgroup><col style="width:46px">${Array.from({ length: spalten }, (_, sp) => `<col style="width:${breite(sp)}px">`).join('')}</colgroup><thead><tr><th class="nr"></th>`;
    for (let sp = 0; sp < spalten; sp++) html += `<th data-spalte="${sp}" class="${sp >= a.sp1 && sp <= a.sp2 ? 'sel' : ''}${sp < fx.sp ? ' fix' : ''}"${sp < fx.sp ? ` style="left:${links[sp]}px"` : ''}>${Fo.nrZuSpalte(sp)}<span class="ziehen" data-ziehen="${sp}" title="Ziehen: Breite ändern · Doppelklick: passend"></span></th>`;
    html += '</tr>';
    for (const ze of kopfZeilen) html += zeile(ze);
    html += `</thead><tbody>${von > 0 ? `<tr class="platzhalter" style="height:${von * 30}px"><td colspan="${spalten + 1}"></td></tr>` : ''}`;
    for (let i = von; i < bis; i++) html += zeile(liste[i]);
    html += `${bis < liste.length ? `<tr class="platzhalter" style="height:${(liste.length - bis) * 30}px"><td colspan="${spalten + 1}"></td></tr>` : ''}</tbody></table>`;
    const box = app.querySelector('.rasterscroll');
    const scroll = [box.scrollLeft, box.scrollTop];
    box.innerHTML = html;
    [box.scrollLeft, box.scrollTop] = scroll;
    zeichneReiter();
    zeigeAuswahl();
  }

  // ---------- Auswahllisten (Dropdown in Zellen) ----------
  function listeFuer(b, ad) {
    if (!b.listen) return null;
    const z = Fo.zerlege(ad);
    for (const [ber, q] of Object.entries(b.listen)) for (const teil of ber.split(' ')) { const r = Fo.bereich(teil); if (r && z.sp >= r.sp1 && z.sp <= r.sp2 && z.ze >= r.ze1 && z.ze <= r.ze2) return q; }
    return null;
  }
  function listenWerte(q) {
    if (q.werte) return q.werte.map(String);
    if (q.bereich) {
      const [name, ber] = String(q.bereich).includes('!') ? String(q.bereich).split('!') : [null, q.bereich];
      const zb = name ? S.t.blaetter.find((x) => x.name.toLowerCase() === name.replace(/^'|'$/g, '').toLowerCase()) : blatt();
      if (!zb) return [];
      const r = Fo.mappe(S.t.blaetter)(zb.name);
      return sammle(ber.replace(/\$/g, '')).map((ad) => Fo.zeige(r.wert(ad), zb.formate[ad])).filter((t) => t !== '');
    }
    return [];
  }

  const eintraege = (bl) => groesse(bl).eintraege;
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
        ${blatt().pivot ? `<button type="button" class="sl-neu" data-aktion="pivot-neu">${sym('pivot', 13)} Übersicht neu aufbauen</button>` : ''}
        <span class="sl-titel">Makros</span>
        ${S.t.makros.filter((m) => m.knopf).length ? `<div class="sl-knoepfe makroknoepfe">${S.t.makros.filter((m) => m.knopf).map((m) => `<button type="button" data-aktion="makro-los" data-id="${esc(m.id)}" title="Makro ausführen">${sym('makro', 11)} ${esc(m.name)}</button>`).join('')}</div>` : ''}
        <button type="button" class="sl-neu" data-aktion="makros">${S.t.vba?.length ? `Excel-Makros (${S.t.vba.length}) · ` : ''}Makros verwalten</button>
        ${andere.length ? `<span class="sl-titel">Zuletzt geöffnet</span>${andere.map((t) => `<button type="button" class="sl-datei" data-aktion="tabelle" data-id="${esc(t.id)}">${esc(t.name)}</button>`).join('')}` : ''}`;
    }
    const r = app.querySelector('.blaetter'); if (!r) return;
    r.innerHTML = `<span class="mini-reiter">${S.t.blaetter.map((b, i) => `<button type="button" class="mr${i === S.blattNr ? ' an' : ''}" data-aktion="blatt" data-i="${i}">${esc(b.name)}</button>`).join('')}<button type="button" class="mr" data-aktion="blatt-dazu" title="Neues Blatt">+</button></span><span class="statuszeile"></span>`;
    zeigeStatus();
  }

  function zeigeStatus() {
    const z = app.querySelector('.statuszeile'); if (!z) return;
    const liste = sammle(auswahlText());
    const zahlen = liste.map((ad) => S.werte[ad]).filter((v) => typeof v === 'number');
    const fmt = fmtVon(blatt(), Fo.adresse(S.anker.sp, S.anker.ze));
    z.innerHTML = `<span>Gewählt: <b>${liste.length} ${liste.length === 1 ? 'Zelle' : 'Zellen'}</b></span>${zahlen.length ? `<span>Summe: <b>${esc(Fo.zeige(zahlen.reduce((x, y) => x + y, 0), fmt))}</b></span>` : ''}${zahlen.length > 1 ? `<span>Schnitt: <b>${esc(Fo.zeige(zahlen.reduce((x, y) => x + y, 0) / zahlen.length, fmt))}</b></span>` : ''}<span class="platz"></span>${S.versteckt.size ? `<span class="warn">${S.versteckt.size} ausgeblendet</span>` : ''}<span>${eintraege(blatt())} Einträge</span>`;
  }

  // Formel in Klartext (ohne Claude)
  const KLAR = { SUMME: 'zählt alle Zahlen zusammen', MITTELWERT: 'rechnet den Durchschnitt aus', MIN: 'sucht den kleinsten Wert', MAX: 'sucht den größten Wert', ANZAHL: 'zählt, wie viele Zahlen es sind', ANZAHL2: 'zählt alle gefüllten Zellen', WENN: 'prüft eine Bedingung und zeigt je nachdem etwas anderes', SUMMEWENN: 'zählt nur die passenden Zeilen zusammen', 'ZÄHLENWENN': 'zählt die passenden Einträge', MITTELWERTWENN: 'Durchschnitt nur der passenden Zeilen', RUNDEN: 'rundet die Zahl', AUFRUNDEN: 'rundet nach oben', ABRUNDEN: 'rundet nach unten', SVERWEIS: 'sucht einen Wert in einer Liste', RMZ: 'rechnet die Monatsrate eines Kredits aus', PRODUKT: 'multipliziert alles miteinander', HEUTE: 'zeigt das heutige Datum', VERKETTEN: 'hängt Texte zusammen', XVERWEIS: 'sucht einen Wert und holt den passenden aus einer anderen Spalte', WENNFEHLER: 'zeigt etwas anderes, wenn ein Fehler herauskommt', SUMMEWENNS: 'zählt zusammen, was alle Bedingungen erfüllt', 'ZÄHLENWENNS': 'zählt, was alle Bedingungen erfüllt', MITTELWERTWENNS: 'Durchschnitt von dem, was alle Bedingungen erfüllt', INDEX: 'holt den Wert an einer Stelle einer Liste', VERGLEICH: 'sagt, an welcher Stelle ein Wert steht', EINDEUTIG: 'listet jeden Eintrag nur einmal (füllt die Zellen darunter)', FILTER: 'zeigt nur die passenden Zeilen (füllt die Zellen darunter)', SORTIEREN: 'sortiert eine Liste (füllt die Zellen darunter)', TEXT: 'zeigt eine Zahl oder ein Datum im Wunschformat', MONAT: 'holt den Monat aus einem Datum', JAHR: 'holt das Jahr aus einem Datum', TAG: 'holt den Tag aus einem Datum', DATUM: 'baut ein Datum aus Jahr, Monat, Tag', WENNS: 'prüft mehrere Bedingungen nacheinander', MAXWENNS: 'größter Wert der passenden Zeilen', MINWENNS: 'kleinster Wert der passenden Zeilen', SEQUENZ: 'zählt 1, 2, 3 … nach unten', LINKS: 'nimmt die ersten Zeichen', RECHTS: 'nimmt die letzten Zeichen', WECHSELN: 'tauscht Text aus', NETTOARBEITSTAGE: 'zählt die Werktage zwischen zwei Daten', EDATUM: 'Datum ein paar Monate später', MONATSENDE: 'letzter Tag des Monats', TEXTVERKETTEN: 'hängt Texte mit Trennzeichen zusammen', SUMMENPRODUKT: 'multipliziert Zeile für Zeile und zählt zusammen' };
  function klartext(roh) {
    if (!roh || !String(roh).startsWith('=')) return '';
    const fn = /^=\s*([A-ZÄÖÜ][A-ZÄÖÜ0-9.]*)\(/i.exec(roh)?.[1];
    const n = fn ? Fo.fnName(fn) : null;
    if (n && KLAR[n]) return KLAR[n];
    if (/[+\-*/]/.test(roh.slice(1))) return 'rechnet mit anderen Zellen';
    return 'übernimmt den Wert einer anderen Zelle';
  }
  // Kategorie-Spalten bekommen Chips
  function chipSpalten(b) { const set = new Set(); for (let sp = 0; sp < 30; sp++) { const k = String(b.zellen[Fo.adresse(sp, 0)] || ''); if (/^(kategorie|art|typ|status|bezahlt|bereich|gruppe)/i.test(k.trim())) set.add(sp); } return set; }
  const CHIPFARBEN = ['#dcf0e3', '#fdebd3', '#e3ecf8', '#efe6fb', '#fbe3e3', '#e9f3d6', '#f6eedb'];
  const chipFarbe = (t) => { let h = 0; for (const c of String(t).toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0; return CHIPFARBEN[h % CHIPFARBEN.length]; };
  // Kleiner Tipp: was bleibt übrig, pro Tag
  const tSpeicher = new WeakMap();
  function tipp(b) {
    if (groesse(b).ze > 5000) return '';
    let gefunden = tSpeicher.get(b);
    if (!gefunden || gefunden.v !== S.v) {
      const liste = [];
      for (const ad in b.zellen) { const roh = b.zellen[ad]; const c = typeof roh === 'string' ? roh.trimStart().charAt(0).toLowerCase() : ''; if (!'bnüskr'.includes(c) || !c) continue; if (/^(bleibt|noch übrig|übrig|saldo|kassenstand|rest)/i.test(roh.trim())) { liste.push(ad); if (liste.length > 5) break; } }
      gefunden = { v: S.v, liste }; tSpeicher.set(b, gefunden);
    }
    for (const ad of gefunden.liste) {
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
    if (viele && !nurVerbund()) for (const ad of sammle(auswahlText())) box.querySelector(`td[data-a="${ad}"]`)?.classList.add('in');
    const td = box.querySelector(`td[data-a="${Fo.adresse(S.anker.sp, S.anker.ze)}"]`);
    td?.classList.add('aktiv');
    box.querySelectorAll('.lknopf').forEach((x) => x.remove());
    if (td && td.classList.contains('mitliste')) td.insertAdjacentHTML('beforeend', '<span class="lknopf" data-liste title="Auswählen (Alt+↓)">▾</span>');
    griffSetzen(box, a);
    for (let sp = a.sp1; sp <= a.sp2; sp++) box.querySelector(`th[data-spalte="${sp}"]`)?.classList.add('sel');
    for (let ze = a.ze1; ze <= a.ze2; ze++) box.querySelector(`th[data-zeile="${ze}"]`)?.classList.add('sel');
    const ad = Fo.adresse(S.anker.sp, S.anker.ze);
    const adr = app.querySelector('.formelzeile .adr'); if (adr) adr.textContent = viele && !nurVerbund() ? auswahlText() : ad;
    const fz = document.getElementById('formel'); if (fz && document.activeElement !== fz) fz.value = blatt().zellen[ad] ?? '';
    const er = app.querySelector('.formelzeile .erklaerung'); if (er) er.textContent = klartext(blatt().zellen[ad]);
    zeigeStatus();
    zeichneWerte();
  }

  function sichtbar() {
    const box = app.querySelector('.rasterscroll');
    let td = box?.querySelector(`td[data-a="${Fo.adresse(S.ende.sp, S.ende.ze)}"]`);
    if (!td && box) { const i = Math.max(0, (S.ende.ze - (blatt().fixiert?.ze || 0)) - [...S.versteckt].filter((z) => z < S.ende.ze).length); box.scrollTop = Math.max(0, i * 30 - box.clientHeight / 2); zeichneTabelle(); td = box.querySelector(`td[data-a="${Fo.adresse(S.ende.sp, S.ende.ze)}"]`); }
    if (!td) return;
    const r = td.getBoundingClientRect(), b = box.getBoundingClientRect();
    if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 4;
    const kopfH = box.querySelector('thead')?.offsetHeight || 30;
    if (r.top < b.top + kopfH && !td.closest('thead')) box.scrollTop -= b.top + kopfH - r.top;
    if (r.right > b.right) box.scrollLeft += r.right - b.right + 4;
    const linksFix = 46 + Array.from({ length: blatt().fixiert?.sp || 0 }, (_, i) => blatt().breiten[Fo.nrZuSpalte(i)] || 110).reduce((x, y) => x + y, 0);
    if (r.left < b.left + linksFix && !td.classList.contains('fix')) box.scrollLeft -= b.left + linksFix - r.left;
  }

  function waehle(sp, ze, erweitern = false) {
    sp = Math.max(0, sp); ze = Math.max(0, ze);
    const v = !erweitern && W.verbundVon(blatt(), sp, ze);
    if (v) { S.anker = { sp: v.sp1, ze: v.ze1 }; S.ende = { sp: v.sp2, ze: v.ze2 }; }
    else if (erweitern) S.ende = { sp, ze }; else { S.anker = { sp, ze }; S.ende = { sp, ze }; }
    const box = app.querySelector('.rasterscroll');
    const g = groesse(blatt());
    if (!box.querySelector(`td[data-a="${Fo.adresse(sp, ze)}"]`) || ze > g.ze + 14) zeichneTabelle(); else zeigeAuswahl();
    sichtbar();
  }
  function bewege(dsp, dze, erweitern = false) {
    const von = erweitern ? S.ende : S.anker;
    let sp = von.sp, ze = von.ze;
    const v = !erweitern && W.verbundVon(blatt(), sp, ze);
    if (v) { if (dsp > 0) sp = v.sp2; if (dze > 0) ze = v.ze2; }
    sp += dsp; ze += dze;
    if (dze && S.versteckt.size) { const s = Math.sign(dze); while (S.versteckt.has(ze) && ze > 0) ze += s; }
    waehle(sp, ze, erweitern);
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
    rechne(true);
    aktualisiereTexte();
  }
  function liveZurueck(still = false) {
    if (!S.live) return;
    setze(S.live.a, S.live.alt ?? null); S.live = null;
    if (!still) { rechne(true); aktualisiereTexte(); }
  }
  function aktualisiereTexte() {
    const b = blatt();
    app.querySelectorAll('.rasterscroll td[data-a]').forEach((td) => {
      const a = td.dataset.a; const w = S.werte[a];
      const t = zeigeZelle(b, a, w);
      if (td.textContent !== t && !td.querySelector('.tchip, .fknopf, .lknopf')) td.textContent = t;
      td.classList.toggle('zahl', typeof w === 'number');
      td.classList.toggle('fehler', w instanceof Fo.Fehler);
    });
    zeigeStatus(); zeichneWerte();
  }
  function uebernehme(wert, ad = Fo.adresse(S.anker.sp, S.anker.ze)) {
    if (S.live && S.live.a === ad) { setze(ad, S.live.alt ?? null); S.live = null; }
    const alt = blatt().zellen[ad] ?? '';
    if (String(wert) === String(alt)) { rechne(true); aktualisiereTexte(); zeigeAuswahl(); return; }
    merke([ad]);
    setze(ad, wert.trim() === '' ? null : wert);
    // Euro-Zeichen getippt → als Euro zeigen
    if (/€\s*$|^\s*€/.test(wert) && Fo.alsZahl(wert) !== null) { blatt().formate[ad] = 'eur'; setze(ad, String(Fo.alsZahl(wert)).replace('.', ',')); }
    if (/%\s*$/.test(wert) && Fo.alsZahl(wert) !== null) { blatt().formate[ad] = 'prozent'; setze(ad, String(Fo.alsZahl(wert)).replace('.', ',')); }
    geaendert(); zeichneTabelle();
  }

  // ---------- Werkzeuge ----------
  function fuerAuswahl(fn) { const liste = sammle(auswahlText()); merke(liste); for (const ad of liste) fn(ad); geaendert(); zeichneTabelle(); }
  function loescheAuswahl() { notiere(`tab.leeren(${bereichJs()});`); fuerAuswahl((ad) => { delete blatt().zellen[ad]; }); }
  function zeileEinfuegen(abZe, anzahl = 1) {
    const b = blatt(); const neu = {};
    const schiebe = (obj) => { const aus = {}; for (const [ad, v] of Object.entries(obj)) { const z = Fo.zerlege(ad); aus[z.ze >= abZe ? Fo.adresse(z.sp, z.ze + anzahl) : ad] = v; } return aus; };
    for (const [ad, v] of Object.entries(b.zellen)) {
      const z = Fo.zerlege(ad);
      const roh = String(v).startsWith('=') ? String(v).replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(])/g, (m, d1, sp, d2, n) => (Number(n) - 1 >= abZe ? `${d1}${sp}${d2}${Number(n) + anzahl}` : m)) : v;
      neu[z.ze >= abZe ? Fo.adresse(z.sp, z.ze + anzahl) : ad] = roh;
    }
    b.zellen = neu; b.formate = schiebe(b.formate); b.farben = schiebe(b.farben); b.fett = schiebe(b.fett);
    metaSchieben(b, abZe, anzahl, 'ze');
  }
  function metaSchieben(b, ab, n, achse) {
    const sb = (t) => String(t).split(' ').map((x) => W.schiebeBereich(x, ab, n, achse)).join(' ');
    if (b.verbunden) b.verbunden = b.verbunden.map(sb);
    if (b.regeln) b.regeln.forEach((r) => { r.bereich = sb(r.bereich); });
    if (b.listen) b.listen = Object.fromEntries(Object.entries(b.listen).map(([k, v]) => [sb(k), v]));
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
    metaSchieben(b, abSp, 1, 'sp');
    if (b.filter?.spalten) b.filter.spalten = Object.fromEntries(Object.entries(b.filter.spalten).map(([k, v]) => { const n = Fo.spalteZuNr(k); return [n >= abSp ? Fo.nrZuSpalte(n + 1) : k, v]; }));
  }
  // Sortiert die Zeilen unter der Überschrift nach der aktiven Spalte (Formeln bleiben, wo sie sind)
  function sortiere(spWahl, aufWahl) {
    const b = blatt(); const sp = spWahl ?? S.anker.sp; const g = groesse(b);
    const kopf = b.filter ? (b.filter.kopf || 0) + 1 : typeof S.werte[Fo.adresse(sp, 0)] === 'string' ? 1 : 0;
    const zeilen = [];
    for (let ze = kopf; ze <= g.ze; ze++) {
      const roh = []; let formel = false; let leer = true;
      for (let s = 0; s <= g.sp; s++) { const v = b.zellen[Fo.adresse(s, ze)]; if (v !== undefined) leer = false; if (String(v ?? '').startsWith('=')) formel = true; roh.push(v); }
      if (formel || leer) break; // Summenzeile/Leerzeile = Ende der Daten
      zeilen.push({ ze, roh, w: S.werte[Fo.adresse(sp, ze)], f: Array.from({ length: g.sp + 1 }, (_, s) => [b.formate[Fo.adresse(s, ze)], b.farben[Fo.adresse(s, ze)], b.fett[Fo.adresse(s, ze)]]) });
    }
    if (zeilen.length < 2) { meldung('Nichts zu sortieren.'); return; }
    const auf = aufWahl ?? !(S.sortiertAuf && S.sortiertSp === sp);
    S.sortiertAuf = auf; S.sortiertSp = sp;
    const sortiert = [...zeilen].sort((x, y) => { const a = x.w, c = y.w; if (typeof a === 'number' && typeof c === 'number') return auf ? a - c : c - a; if (typeof a === 'number') return -1; if (typeof c === 'number') return 1; return auf ? String(a ?? '').localeCompare(String(c ?? ''), 'de', { numeric: true }) : String(c ?? '').localeCompare(String(a ?? ''), 'de', { numeric: true }); });
    const ziele = []; zeilen.forEach((z) => { for (let s2 = 0; s2 <= g.sp; s2++) ziele.push(Fo.adresse(s2, z.ze)); });
    merke(ziele);
    notiere(`tab.sortiere(${JSON.stringify(Fo.nrZuSpalte(sp))}, ${JSON.stringify(auf ? 'auf' : 'ab')}, ${kopf});`);
    const aufnahme = S.aufnahme; S.aufnahme = null;
    sortiert.forEach((z, i) => { const ze = zeilen[i].ze; z.roh.forEach((v, s) => { const ad = Fo.adresse(s, ze); if (v === undefined) delete b.zellen[ad]; else b.zellen[ad] = v; const [fo, fa, fe] = z.f[s]; if (fo) b.formate[ad] = fo; else delete b.formate[ad]; if (fa) b.farben[ad] = fa; else delete b.farben[ad]; if (fe) b.fett[ad] = true; else delete b.fett[ad]; }); });
    S.aufnahme = aufnahme;
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
      notiere(`tab.setze(${JSON.stringify(ad)}, ${JSON.stringify(b.zellen[ad])}); tab.fett(${JSON.stringify(ad)}, true);`);
      const vorbild = b.formate[Fo.adresse(sp, ze2)]; if (vorbild && fn !== 'ANZAHL') b.formate[ad] = vorbild;
    }
    geaendert(); zeichneTabelle();
  }

  // ---------- Kopieren / Einfügen ----------
  function kopiere(ev, ausschneiden = false) {
    const a = auswahl(); const b = blatt(); const zeilen = []; const roh = [];
    for (let ze = a.ze1; ze <= a.ze2; ze++) { const z = [], r = []; for (let sp = a.sp1; sp <= a.sp2; sp++) { const ad = Fo.adresse(sp, ze); z.push(zeigeZelle(b, ad)); r.push(b.zellen[ad] ?? ''); } zeilen.push(z.join('\t')); roh.push(r); }
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
    const ziel = S.anker;
    { const zeilen = S.kopiert && S.kopiert.text === text ? S.kopiert.roh.map((r) => r.length) : text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((z) => z.split('\t').length); const liste = []; zeilen.forEach((n, i) => { for (let j = 0; j < n; j++) liste.push(Fo.adresse(ziel.sp + j, ziel.ze + i)); }); merke(liste); }
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
    const hatWas = r.zellen || r.formate || r.farben || r.fett || r.breiten || r.regeln || r.listen || r.verbinden || r.fixieren;
    if (hatWas) merke();
    jede(r.zellen, (ad, v) => setze(ad, v === null ? null : String(v)));
    jede(r.formate, (ad, v) => { if (v) b.formate[ad] = v; else delete b.formate[ad]; });
    jede(r.farben, (ad, v) => { if (v && /^#[0-9a-f]{6}$/i.test(v)) b.farben[ad] = v; else delete b.farben[ad]; });
    jede(r.fett, (ad, v) => { if (v) b.fett[ad] = true; else delete b.fett[ad]; });
    if (Array.isArray(r.regeln)) for (const rg of r.regeln) { const ber = String(rg?.bereich || '').toUpperCase(); if (Fo.bereich(ber) && W.ARTEN[rg.art]) { b.regeln = [...(b.regeln || []), { bereich: ber, art: rg.art, wert: rg.wert === undefined ? undefined : String(rg.wert), wert2: rg.wert2 === undefined ? undefined : String(rg.wert2), farbe: /^#[0-9a-f]{6}$/i.test(rg.farbe || '') ? rg.farbe : '#f8e1a8' }]; n++; } }
    if (r.listen && typeof r.listen === 'object') for (const [ber, q] of Object.entries(r.listen)) { const k = String(ber).toUpperCase(); if (!Fo.bereich(k.split(' ')[0]) || !q) continue; if (Array.isArray(q.werte)) { b.listen = { ...(b.listen || {}), [k]: { werte: q.werte.map(String) } }; n++; } else if (q.bereich) { b.listen = { ...(b.listen || {}), [k]: { bereich: String(q.bereich) } }; n++; } }
    if (Array.isArray(r.verbinden)) for (const v of r.verbinden) { const k = String(v).toUpperCase(); if (/^[A-Z]{1,3}\d+:[A-Z]{1,3}\d+$/.test(k) && !(b.verbunden || []).includes(k)) { b.verbunden = [...(b.verbunden || []), k]; n++; } }
    if (r.fixieren && typeof r.fixieren === 'object') b.fixiert = { ze: Math.max(0, Number(r.fixieren.ze) || 0), sp: Math.max(0, Number(r.fixieren.sp) || 0) };
    if (r.makro?.code) { const m = { id: neueId(), name: String(r.makro.name || 'Makro').slice(0, 60), code: String(r.makro.code), knopf: true }; S.t.makros.push(m); setTimeout(() => { zeichneReiter(); meldung(`Makro „${m.name}“ gespeichert.`, { knopf: 'Ausführen', aktion: () => makroAusfuehren(m), dauer: 9000 }); }, 60); }
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
    const r = await A.assistent({ wunsch, blatt: blatt(), blaetter: S.t.blaetter, auswahl: auswahlText(), name: S.t.name });
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
      if (!await frage({ titel: `„${t?.name || 'Tabelle'}“ löschen?`, text: 'Das lässt sich nicht rückgängig machen.', ja: 'Löschen', gefahr: true })) return;
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
    fett: () => { const an = !blatt().fett[Fo.adresse(S.anker.sp, S.anker.ze)]; notiere(`tab.fett(${bereichJs()}, ${an});`); fuerAuswahl((ad) => { if (an) blatt().fett[ad] = true; else delete blatt().fett[ad]; }); },
    format: (el) => { const art = el.dataset.art; const an = blatt().formate[Fo.adresse(S.anker.sp, S.anker.ze)] !== art; notiere(`tab.format(${bereichJs()}, ${JSON.stringify(an ? art : null)});`); fuerAuswahl((ad) => { if (an) blatt().formate[ad] = art; else delete blatt().formate[ad]; }); },
    farbmenue: (el) => {
      const da = document.querySelector('.farben'); if (da) { da.remove(); return; }
      const m = document.createElement('div'); m.className = 'farben';
      m.innerHTML = [['#f6d5c4','Orange'], ['#d4ecdc','Grün'], ['#f8e1a8','Gelb'], ['#f3c9c4','Rot'], ['#dbe7f5','Blau'], ['#ece6fd','Lila'], ['','Keine']].map(([f, n]) => `<button type="button" data-farbe="${f}" title="${n}" aria-label="${n}" style="background:${f || '#fff'}">${f ? '' : '✕'}</button>`).join('');
      const r = el.getBoundingClientRect(); m.style.left = `${Math.round(r.left)}px`; m.style.top = `${Math.round(r.bottom + 6)}px`;
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => { const b = ev.target.closest('[data-farbe]'); if (!b) return; const f = b.dataset.farbe; notiere(`tab.farbe(${bereichJs()}, ${JSON.stringify(f || null)});`); fuerAuswahl((ad) => { if (f) blatt().farben[ad] = f; else delete blatt().farben[ad]; }); m.remove(); });
    },
    'zeile-dazu': () => { merke(); notiere(`tab.zeileEinfuegen(${auswahl().ze2 + 2});`); zeileEinfuegen(auswahl().ze2 + 1); geaendert(); zeichneTabelle(); waehle(S.anker.sp, auswahl().ze2 + 1); },
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
      const r = await A.erklaeren({ blatt: blatt(), blaetter: S.t.blaetter, zelle: ad });
      S.denkt = false;
      S.t.gespraech.push(r?.fehler ? { wer: 'er', fehler: true, text: r.fehler.nachricht } : { wer: 'er', text: r.antwort, chips: [roh] });
      geaendert(); zeichneHelfer();
    },
    frage: (el) => frageAlbatros(el.dataset.text),
    senden: () => { const f = document.getElementById('frage'); const t = f.value; f.value = ''; frageAlbatros(t); },
    exportmenue: (el) => {
      const w = el.parentElement; const da = w.querySelector('.menue'); if (da) { da.remove(); return; }
      const m = document.createElement('div'); m.className = 'menue';
      m.innerHTML = `<button type="button" data-art="xlsx">${sym('tabelle', 16)}<span>Excel-Datei<small>.xlsx – mit Formeln, für Excel & Co.</small></span></button><button type="button" data-art="csv">${sym('export', 16)}<span>CSV<small>Nur Werte, dieses Blatt</small></span></button><button type="button" data-art="pdf">${sym('drucker', 16)}<span>Drucken / PDF<small>Saubere Seiten, Überschrift auf jeder Seite</small></span></button>`;
      w.appendChild(m);
      m.addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-art]'); if (!b) return; m.remove();
        if (b.dataset.art === 'pdf') { druckFenster(); return; }
        await A.tabellen.speichern(S.t);
        const r = await A.datei.exportieren(S.t, b.dataset.art, S.blattNr);
        if (r?.ok) meldung('Gespeichert.', { knopf: 'Im Ordner zeigen', aktion: () => A.datei.zeigen(r.datei), dauer: 7000 });
        else if (r?.fehler) meldung(`Klappt nicht: ${r.fehler.nachricht}`);
      });
    },
    blatt: (el, ev) => { if (ev?.target?.closest('[data-aktion="blatt-weg"]')) return; S.blattNr = Number(el.dataset.i); S.anker = { sp: 0, ze: 0 }; S.ende = { sp: 0, ze: 0 }; if (S.aufnahme) notiere(`tab.blatt(${JSON.stringify(blatt().name)});`); app.querySelector('.blattname').textContent = blatt().name; { const b2 = app.querySelector('.blattname2'); if (b2) b2.textContent = blatt().name; } zeichneTabelle(); },
    'blatt-dazu': () => { S.t.blaetter.push({ name: `Blatt ${S.t.blaetter.length + 1}`, zellen: {}, formate: {}, farben: {}, fett: {}, breiten: {} }); S.blattNr = S.t.blaetter.length - 1; app.querySelector('.blattname').textContent = blatt().name; { const b2 = app.querySelector('.blattname2'); if (b2) b2.textContent = blatt().name; } geaendert(); zeichneTabelle(); },
    'blatt-weg': async (el) => { const i = Number(el.dataset.i); if (S.t.blaetter.length < 2 || !await frage({ titel: `Blatt „${S.t.blaetter[i].name}“ löschen?`, text: 'Alles auf diesem Blatt ist dann weg.', ja: 'Löschen', gefahr: true })) return; S.t.blaetter.splice(i, 1); S.blattNr = 0; S.zurueck = []; geaendert(); zeichneTabelle(); },
  };


  // =====================================================================
  //  Albatros 0.4–0.7: Ausfüllen, Formate, Fixieren, Verbinden, Suchen,
  //  Filter, Hervorheben, Auswahllisten, Übersicht, Drucken, Makros
  // =====================================================================
  const metaVon = (b) => ({ fixiert: b.fixiert, verbunden: b.verbunden, regeln: b.regeln, listen: b.listen, filter: b.filter, breiten: b.breiten });
  const neueId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  function fensterAuf(html, { breite = 560, zu } = {}) {
    const s = document.createElement('div'); s.className = 'schleier';
    s.innerHTML = `<div class="fenster" role="dialog" aria-modal="true" style="width:min(${breite}px,94vw)">${html}</div>`;
    const schliessen = () => { s.remove(); zu?.(); app.querySelector('.rasterscroll')?.focus({ preventScroll: true }); };
    s.addEventListener('click', (ev) => { if (ev.target === s || ev.target.closest('[data-zu]')) schliessen(); });
    s.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); schliessen(); } });
    document.body.appendChild(s); s.schliessen = schliessen; return s;
  }
  const fensterKopf = (titel, unter = '') => `<div class="reihe"><h2 class="h" style="flex:1">${esc(titel)}</h2><button type="button" class="rund" data-zu aria-label="Schließen">✕</button></div>${unter ? `<p class="leise fenster-text">${esc(unter)}</p>` : ''}`;
  function schwebe(klasse, html, el) {
    document.querySelectorAll('.schwebe').forEach((x) => x.remove());
    const m = document.createElement('div'); m.className = `schwebe ${klasse}`; m.innerHTML = html;
    const r = el.getBoundingClientRect();
    document.body.appendChild(m);
    const b = m.getBoundingClientRect();
    m.style.left = `${Math.round(Math.min(r.left, window.innerWidth - b.width - 10))}px`;
    m.style.top = `${Math.round(r.bottom + b.height + 10 > window.innerHeight ? Math.max(10, r.top - b.height - 6) : r.bottom + 6)}px`;
    return m;
  }
  document.addEventListener('mousedown', (ev) => { if (!ev.target.closest('.schwebe, [data-schwebe-auf]')) document.querySelectorAll('.schwebe').forEach((x) => x.remove()); }, true);

  // ---------- Makro-Aufnahme ----------
  function notiere(zeile) { if (S.aufnahme) S.aufnahme.push(zeile); }
  const bereichJs = () => JSON.stringify(auswahlText());

  // ---------- Ausfüllen am Eck ----------
  function griffSetzen(box, a) {
    let g = box.querySelector('.griff');
    const v = W.verbundVon(blatt(), a.sp2, a.ze2);
    const td = box.querySelector(`td[data-a="${v ? Fo.adresse(v.sp1, v.ze1) : Fo.adresse(a.sp2, a.ze2)}"]`);
    if (!td || S.bearbeiten || td.closest('thead')) { g?.remove(); return; }
    if (!g) { g = document.createElement('div'); g.className = 'griff'; g.title = 'Ziehen: ausfüllen (mit Strg: als Reihe) · Doppelklick: bis zum Ende'; box.appendChild(g); }
    const r = td.getBoundingClientRect(), b = box.getBoundingClientRect();
    g.style.left = `${r.right - b.left + box.scrollLeft - 5}px`; g.style.top = `${r.bottom - b.top + box.scrollTop - 5}px`;
  }
  let fuell = null;
  function fuellZiel(td) {
    const z = Fo.zerlege(td.dataset.a); const a = fuell.a;
    const m = { unten: z.ze - a.ze2, oben: a.ze1 - z.ze, rechts: z.sp - a.sp2, links: a.sp1 - z.sp };
    const best = Object.entries(m).sort((x, y) => y[1] - x[1])[0];
    fuell.ziel = best[1] > 0 ? { r: best[0], n: best[1] } : null;
    app.querySelectorAll('td.fuellziel').forEach((x) => x.classList.remove('fuellziel'));
    if (!fuell.ziel) return;
    const { r, n } = fuell.ziel;
    const ber = r === 'unten' ? [a.sp1, a.ze2 + 1, a.sp2, a.ze2 + n] : r === 'oben' ? [a.sp1, a.ze1 - n, a.sp2, a.ze1 - 1] : r === 'rechts' ? [a.sp2 + 1, a.ze1, a.sp2 + n, a.ze2] : [a.sp1 - n, a.ze1, a.sp1 - 1, a.ze2];
    for (let ze = ber[1]; ze <= ber[3]; ze++) for (let sp = ber[0]; sp <= ber[2]; sp++) app.querySelector(`td[data-a="${Fo.adresse(sp, ze)}"]`)?.classList.add('fuellziel');
  }
  function fuelleAus(a, { r, n }, { reihe = false, kopie = false } = {}) {
    const b = blatt(); const ziele = [];
    const senkrecht = r === 'unten' || r === 'oben'; const zurueck = r === 'oben' || r === 'links';
    const aussen = senkrecht ? [a.sp1, a.sp2] : [a.ze1, a.ze2];
    for (let i = aussen[0]; i <= aussen[1]; i++) {
      const quelle = [];
      if (senkrecht) for (let ze = a.ze1; ze <= a.ze2; ze++) quelle.push(Fo.adresse(i, ze)); else for (let sp = a.sp1; sp <= a.sp2; sp++) quelle.push(Fo.adresse(sp, i));
      const roh = quelle.map((x) => b.zellen[x]);
      const werte = kopie ? Array.from({ length: n }, (_, k) => { const v = roh[k % roh.length]; return String(v ?? '').startsWith('=') ? Fo.verschiebe(v, senkrecht ? 0 : k + 1, senkrecht ? k + 1 : 0) : v ?? null; })
        : W.fuelle(roh, n, { achse: senkrecht ? 'ze' : 'sp', reihe, rueckwaerts: zurueck });
      werte.forEach((v, k) => {
        const pos = zurueck ? (senkrecht ? a.ze1 : a.sp1) - 1 - k : (senkrecht ? a.ze2 : a.sp2) + 1 + k;
        if (pos < 0) return;
        const ad = senkrecht ? Fo.adresse(i, pos) : Fo.adresse(pos, i);
        const q = quelle[zurueck ? quelle.length - 1 - (k % quelle.length) : k % quelle.length];
        ziele.push([ad, v, q]);
      });
    }
    if (!ziele.length) return;
    merke(ziele.map((z) => z[0]));
    for (const [ad, v, q] of ziele) {
      setze(ad, v);
      for (const k of ['formate', 'farben']) { if (b[k][q] !== undefined) b[k][ad] = b[k][q]; else delete b[k][ad]; }
      if (b.fett[q]) b.fett[ad] = true; else delete b.fett[ad];
    }
    if (r === 'unten') S.ende = { sp: a.sp2, ze: a.ze2 + n }; else if (r === 'rechts') S.ende = { sp: a.sp2 + n, ze: a.ze2 };
    else if (r === 'oben') { S.anker = { sp: a.sp1, ze: Math.max(0, a.ze1 - n) }; S.ende = { sp: a.sp2, ze: a.ze2 }; } else { S.anker = { sp: Math.max(0, a.sp1 - n), ze: a.ze1 }; S.ende = { sp: a.sp2, ze: a.ze2 }; }
    geaendert(); zeichneTabelle();
  }
  // Doppelklick am Eck: so weit nach unten, wie die Nachbarspalte Daten hat
  function fuellBisEnde() {
    const a = auswahl(); const b = blatt();
    const voll = (sp, ze) => sp >= 0 && b.zellen[Fo.adresse(sp, ze)] !== undefined;
    let ende = a.ze2;
    for (const sp of [a.sp1 - 1, a.sp2 + 1]) { let ze = a.ze2; while (voll(sp, ze + 1)) ze++; if (ze > ende) { ende = ze; break; } }
    if (ende > a.ze2) fuelleAus(a, { r: 'unten', n: ende - a.ze2 }); else meldung('Daneben ist nichts, woran ich mich halten kann. Zieh am Eck nach unten.');
  }

  // ---------- Zahlenformate ----------
  const FORMATE = [[null, 'Standard', '1234,5'], ['zahl', 'Zahl', '1.234,50'], ['ganz', 'Ganze Zahl', '1.235'], ['eur', 'Euro', '1.234,50 €'], ['prozent', 'Prozent', '12,5 %'], ['datum', 'Datum', '23.11.2026'], ['datumlang', 'Datum lang', '23. November 2026'], ['monat', 'Monat', 'November 2026'], ['uhrzeit', 'Uhrzeit', '14:30'], ['text', 'Text', 'bleibt, wie getippt'], ['eigen', 'Eigenes …', '0,0 "kg"']];
  function formatSetzen(art) {
    fuerAuswahl((ad) => { if (art) blatt().formate[ad] = art; else delete blatt().formate[ad]; });
    if (typeof art === 'string' || art === null) notiere(`tab.format(${bereichJs()}, ${JSON.stringify(art)});`);
  }
  function eigenesFormat() {
    const s = fensterAuf(`${fensterKopf('Eigenes Format', 'Wie bei Excel: 0 = Ziffer, # = Ziffer wenn nötig, Text in Anführungszeichen, TT.MM.JJJJ für Datum.')}
      <div class="ezeile"><div class="t"><b>Format</b><span class="vorschau leise"></span></div><input class="feld" id="e-fmt" value="${esc(blatt().formate[Fo.adresse(S.anker.sp, S.anker.ze)]?.eigen || '#.##0,00 "kg"')}"></div>
      <div class="chips-zeile">${['0,0', '#.##0 "Stück"', '0,00 "h"', 'TT.MM.', 'TTTT, TT.MM.JJJJ', 'MMM JJ', '+0,0 %;-0,0 %'].map((f) => `<button type="button" class="beispiel" data-f="${esc(f)}">${esc(f)}</button>`).join('')}</div>
      <div class="reihe knopfreihe"><button type="button" class="btn leise" data-zu>Abbrechen</button><button type="button" class="btn" data-ok>Übernehmen</button></div>`, { breite: 520 });
    const f = s.querySelector('#e-fmt'); const v = s.querySelector('.vorschau');
    const w = S.werte[Fo.adresse(S.anker.sp, S.anker.ze)];
    const zeigen = () => { v.textContent = `So sieht's aus: ${Fo.textFormat(typeof w === 'number' ? w : 1234.5, f.value.split(';')[0])}`; };
    f.addEventListener('input', zeigen); zeigen(); f.focus(); f.select();
    s.addEventListener('click', (ev) => { const x = ev.target.closest('[data-f]'); if (x) { f.value = x.dataset.f; zeigen(); } if (ev.target.closest('[data-ok]')) { if (f.value.trim()) formatSetzen({ eigen: f.value.trim().split(';')[0] }); s.schliessen(); } });
    f.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') s.querySelector('[data-ok]').click(); });
  }

  // ---------- Fixieren & Verbinden ----------
  function fixieren() {
    const b = blatt(); merke('meta');
    if (b.fixiert) { delete b.fixiert; meldung('Fixierung gelöst.'); }
    else {
      let ze = S.anker.ze, sp = S.anker.sp; if (!ze && !sp) ze = 1;
      b.fixiert = { ze, sp };
      meldung(`${ze ? (ze === 1 ? 'Die erste Zeile' : `Zeilen 1–${ze}`) : ''}${ze && sp ? ' und ' : ''}${sp ? (sp === 1 ? 'Spalte A' : `Spalten A–${Fo.nrZuSpalte(sp - 1)}`) : ''} bleib${ze + sp > 1 || (ze && sp) ? 'en' : 't'} jetzt beim Scrollen stehen.`);
    }
    geaendert(); zeichneTabelle();
  }
  async function verbinden() {
    const b = blatt(); const a = auswahl();
    const v = W.verbundVon(b, S.anker.sp, S.anker.ze);
    const text = (r) => `${Fo.adresse(r.sp1, r.ze1)}:${Fo.adresse(r.sp2, r.ze2)}`;
    if (v && (nurVerbund() || (a.sp1 === a.sp2 && a.ze1 === a.ze2))) { merke('meta'); b.verbunden = b.verbunden.filter((x) => x !== text(v)); if (!b.verbunden.length) delete b.verbunden; geaendert(); zeichneTabelle(); meldung('Verbindung gelöst.'); return; }
    if (a.sp1 === a.sp2 && a.ze1 === a.ze2) { meldung('Markier zuerst mehrere Zellen, z. B. für eine Überschrift.'); return; }
    const liste = sammle(auswahlText());
    const andere = liste.slice(1).filter((ad) => b.zellen[ad] !== undefined && b.zellen[ad] !== '');
    if (andere.length && !await frage({ titel: 'Zellen verbinden?', text: 'Nur der Inhalt oben links bleibt, der Rest wird gelöscht.', ja: 'Verbinden' })) return;
    merke();
    for (const ad of andere) delete b.zellen[ad];
    b.verbunden = (b.verbunden || []).filter((x) => { const r = Fo.bereich(x); return r.sp2 < a.sp1 || r.sp1 > a.sp2 || r.ze2 < a.ze1 || r.ze1 > a.ze2; });
    b.verbunden.push(auswahlText());
    geaendert(); zeichneTabelle();
  }
  function passendeBreite(sp) {
    const b = blatt(); const name = Fo.nrZuSpalte(sp);
    const c = document.createElement('canvas').getContext('2d');
    const normal = "14px 'Source Serif 4', serif", fett = "700 14px 'Source Serif 4', serif";
    let max = 30;
    const miss = (ad) => { if (W.verbundVon(b, sp, Fo.zerlege(ad).ze)) return; c.font = b.fett[ad] ? fett : normal; max = Math.max(max, c.measureText(zeigeZelle(b, ad)).width); };
    for (const ad of Object.keys(b.zellen)) if (Fo.zerlege(ad).sp === sp) miss(ad);
    for (const ad of S.r.ueber.keys()) if (Fo.zerlege(ad).sp === sp) miss(ad);
    merke('meta'); b.breiten[name] = Math.max(40, Math.min(600, Math.ceil(max + 24)));
    if (b.filter && Fo.zerlege(Fo.adresse(sp, b.filter.kopf || 0))) b.breiten[name] += 18;
    notiere(`tab.breite(${JSON.stringify(name)}, ${b.breiten[name]});`);
    geaendert(); zeichneTabelle();
  }

  // ---------- Suchen & Ersetzen ----------
  function suchen(mitErsetzen = false) {
    let p = app.querySelector('.suchfeld');
    if (!p) {
      p = document.createElement('div'); p.className = 'suchfeld blatt';
      p.innerHTML = `<div class="reihe"><input id="such" placeholder="Suchen …" aria-label="Suchen" spellcheck="false"><span class="treffer leise"></span>
          <button type="button" class="wz" data-s="zurueck" title="Vorheriger (Umschalt+Enter)">↑</button><button type="button" class="wz" data-s="weiter" title="Nächster (Enter)">↓</button><button type="button" class="wz" data-s="mehr" title="Ersetzen (Strg+H)">⇄</button><button type="button" class="wz" data-s="zu" title="Schließen (Esc)">✕</button></div>
        <div class="reihe ersetzen-zeile"><input id="durch" placeholder="Ersetzen durch …" aria-label="Ersetzen durch" spellcheck="false"><button type="button" class="btn klein weiss" data-s="eins">Ersetzen</button><button type="button" class="btn klein" data-s="alle">Alle ersetzen</button></div>
        <div class="reihe optionen"><label><input type="checkbox" id="s-gross"> Groß/klein beachten</label><label><input type="checkbox" id="s-ganz"> Ganze Zelle</label><label><input type="checkbox" id="s-formel"> In Formeln suchen</label></div>`;
      app.querySelector('.raster').appendChild(p);
      const f = p.querySelector('#such');
      const opt = () => ({ gross: p.querySelector('#s-gross').checked, ganz: p.querySelector('#s-ganz').checked, formeln: p.querySelector('#s-formel').checked });
      const treffer = () => W.finde(blatt(), S.werte, f.value, opt());
      const zeigen = (liste, i) => { p.querySelector('.treffer').textContent = f.value ? (liste.length ? `${i + 1} von ${liste.length}` : 'nichts gefunden') : ''; };
      const springe = (richtung = 1, abHier = false) => {
        const liste = treffer(); if (!liste.length) { zeigen(liste, -1); return; }
        const jetzt = Fo.adresse(S.anker.sp, S.anker.ze); const pos = (ad) => { const z = Fo.zerlege(ad); return z.ze * 100000 + z.sp; };
        let i;
        if (abHier && liste.includes(jetzt)) i = liste.indexOf(jetzt);
        else if (richtung > 0) { i = liste.findIndex((ad) => pos(ad) > pos(jetzt)); if (i < 0) i = 0; }
        else { i = -1; liste.forEach((ad, k) => { if (pos(ad) < pos(jetzt)) i = k; }); if (i < 0) i = liste.length - 1; }
        const z = Fo.zerlege(liste[i]);
        if (S.versteckt.has(z.ze)) { delete blatt().filter; geaendert(); }
        waehle(z.sp, z.ze); zeigen(liste, i);
      };
      f.addEventListener('input', () => springe(1, true));
      p.addEventListener('change', () => springe(1, true));
      p.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') { ev.preventDefault(); p.remove(); app.querySelector('.rasterscroll').focus(); }
        if (ev.key === 'Enter' && ev.target.id === 'such') { ev.preventDefault(); springe(ev.shiftKey ? -1 : 1); }
        if (ev.key === 'Enter' && ev.target.id === 'durch') { ev.preventDefault(); p.querySelector('[data-s="eins"]').click(); }
      });
      p.addEventListener('click', (ev) => {
        const k = ev.target.closest('[data-s]')?.dataset.s; if (!k) return;
        if (k === 'zu') { p.remove(); app.querySelector('.rasterscroll').focus(); }
        if (k === 'weiter') springe(1); if (k === 'zurueck') springe(-1);
        if (k === 'mehr') { p.classList.toggle('mit-ersetzen'); p.querySelector('#durch').focus(); }
        const darf = (ad) => { const roh = blatt().zellen[ad]; return roh !== undefined && (opt().formeln || !String(roh).startsWith('=')); };
        if (k === 'eins') {
          const ad = Fo.adresse(S.anker.sp, S.anker.ze);
          if (treffer().includes(ad) && darf(ad)) uebernehme(W.ersetzeIn(blatt().zellen[ad], f.value, p.querySelector('#durch').value, opt()), ad);
          springe(1);
        }
        if (k === 'alle') {
          const liste = treffer().filter(darf); if (!liste.length) { meldung('Nichts zu ersetzen.'); return; }
          merke(liste); const durch = p.querySelector('#durch').value;
          for (const ad of liste) setze(ad, W.ersetzeIn(blatt().zellen[ad], f.value, durch, opt()));
          geaendert(); zeichneTabelle(); meldung(`${liste.length} ${liste.length === 1 ? 'Stelle' : 'Stellen'} ersetzt.`, { knopf: 'Rückgängig', aktion: rueckgaengig });
        }
      });
    }
    if (mitErsetzen) p.classList.add('mit-ersetzen');
    const f = p.querySelector('#such'); f.focus(); f.select();
  }

  // ---------- Filter ----------
  function filterUmschalten() {
    const b = blatt(); merke('meta');
    if (b.filter) { delete b.filter; geaendert(); zeichneTabelle(); meldung('Filter aus – alle Zeilen sind wieder da.'); return; }
    let kopf = 0;
    for (let ze = 0; ze < 6; ze++) { let texte = 0; for (let sp = 0; sp < 12; sp++) if (typeof S.werte[Fo.adresse(sp, ze)] === 'string') texte++; if (texte >= 2) { kopf = ze; break; } }
    b.filter = { kopf, spalten: {} };
    geaendert(); zeichneTabelle(); meldung(`Filter an: In Zeile ${kopf + 1} hat jede Spalte jetzt ein ▾.`);
  }
  function filterMenue(sp, el) {
    const b = blatt(); const kopf = b.filter.kopf || 0; const name = Fo.nrZuSpalte(sp);
    const werte = W.werteDerSpalte(b, (ad) => S.werte[ad], sp, kopf).slice(0, 2000);
    const erlaubt = b.filter.spalten?.[name] ? new Set(b.filter.spalten[name]) : null;
    const m = schwebe('filtermenue', `<button type="button" class="mz" data-f="auf">${sym('sortieren', 14)} A → Z / klein → groß</button><button type="button" class="mz" data-f="ab">${sym('sortieren', 14)} Z → A / groß → klein</button>
      <input class="feld fsuche" placeholder="Suchen …" aria-label="Werte suchen">
      <div class="fliste">${werte.map(([t, n]) => `<label><input type="checkbox" value="${esc(t)}" ${!erlaubt || erlaubt.has(t) ? 'checked' : ''}><span>${t === '' ? '<i>(leer)</i>' : esc(t)}</span><small>${n}</small></label>`).join('')}</div>
      <div class="reihe"><button type="button" class="btn klein leise" data-f="alle">Alle</button><button type="button" class="btn klein leise" data-f="keine">Keine</button><div class="platz"></div><button type="button" class="btn klein" data-f="ok">OK</button></div>
      ${Object.keys(b.filter.spalten || {}).length ? '<button type="button" class="mz leise" data-f="loeschen">Alle Filter löschen</button>' : ''}`, el);
    const s = m.querySelector('.fsuche'); s.focus();
    s.addEventListener('input', () => m.querySelectorAll('.fliste label').forEach((l) => { l.hidden = !l.textContent.toLowerCase().includes(s.value.toLowerCase()); }));
    s.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') m.querySelector('[data-f="ok"]').click(); if (ev.key === 'Escape') m.remove(); });
    m.addEventListener('click', (ev) => {
      const f = ev.target.closest('[data-f]')?.dataset.f; if (!f) return;
      if (f === 'auf' || f === 'ab') { m.remove(); sortiere(sp, f === 'auf'); return; }
      if (f === 'alle' || f === 'keine') { m.querySelectorAll('.fliste label:not([hidden]) input').forEach((x) => { x.checked = f === 'alle'; }); return; }
      merke('meta');
      if (f === 'loeschen') b.filter.spalten = {};
      if (f === 'ok') {
        const an = [...m.querySelectorAll('.fliste input')].filter((x) => x.checked).map((x) => x.value);
        b.filter.spalten = b.filter.spalten || {};
        if (an.length === werte.length) delete b.filter.spalten[name]; else b.filter.spalten[name] = an;
      }
      m.remove(); geaendert(); zeichneTabelle();
      if (S.versteckt.size) meldung(`${S.versteckt.size} ${S.versteckt.size === 1 ? 'Zeile' : 'Zeilen'} ausgeblendet.`);
    });
  }

  // ---------- Hervorheben (bedingte Formatierung) ----------
  const REGELFARBEN = [['#f3c9c4', 'Rot'], ['#f8e1a8', 'Gelb'], ['#d4ecdc', 'Grün'], ['#f6d5c4', 'Orange'], ['#dbe7f5', 'Blau'], ['#ece6fd', 'Lila']];
  const regelText = (r) => `${r.bereich}: ${W.ARTEN[r.art] || r.art}${['groesser', 'kleiner', 'gleich', 'ungleich', 'enthaelt', 'formel'].includes(r.art) ? ` ${r.wert}` : ''}${r.art === 'zwischen' ? ` ${r.wert} und ${r.wert2}` : ''}`;
  function regelFenster() {
    const b = blatt();
    let ber = auswahlText(); { const a = auswahl(); if (a.ze1 === 0 && typeof S.werte[Fo.adresse(a.sp1, 0)] === 'string' && a.ze2 > 0) ber = `${Fo.adresse(a.sp1, 1)}:${Fo.adresse(a.sp2, a.ze2)}`; }
    const s = fensterAuf(`${fensterKopf('Hervorheben', 'Färbt Zellen automatisch – auch wenn sich Werte später ändern.')}
      <div class="chips-zeile"><span class="leise">Schnell:</span><button type="button" class="beispiel" data-schnell="neg">Negative rot</button><button type="button" class="beispiel" data-schnell="dop">Doppelte gelb</button><button type="button" class="beispiel" data-schnell="bal">Datenbalken</button><button type="button" class="beispiel" data-schnell="leer">Leere orange</button></div>
      <div class="regelform">
        <label>Bereich<input class="feld" id="r-ber" value="${esc(ber)}"></label>
        <label>Wenn der Wert<select class="feld" id="r-art">${Object.entries(W.ARTEN).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
        <label class="r-w">Wert<input class="feld" id="r-w" placeholder="z. B. 0 oder 200"></label>
        <label class="r-w2" hidden>und<input class="feld" id="r-w2"></label>
        <div class="r-farbe"><span>Farbe</span>${REGELFARBEN.map(([f, n], i) => `<label title="${n}"><input type="radio" name="rf" value="${f}" ${i === 0 ? 'checked' : ''}><i style="background:${f}"></i></label>`).join('')}</div>
        <button type="button" class="btn" data-dazu>${sym('plus', 14, 2.4)} Hinzufügen</button>
      </div>
      <h3 class="h klein-titel">Regeln auf diesem Blatt</h3><div class="regelliste"></div>`, { breite: 640 });
    const liste = () => { const l = s.querySelector('.regelliste'); l.innerHTML = (b.regeln || []).length ? b.regeln.map((r, i) => `<div class="regel"><i style="background:${r.art === 'balken' ? `linear-gradient(90deg,${r.farbe || '#9fd4b2'} 60%,#fff 60%)` : r.farbe}"></i><span>${esc(regelText(r))}</span><button type="button" class="rund klein" data-weg="${i}" title="Löschen" aria-label="Regel löschen">✕</button></div>`).join('') : '<p class="leise">Noch keine.</p>'; };
    const art = s.querySelector('#r-art');
    const sichtbar = () => { s.querySelector('.r-w').hidden = ['doppelt', 'leer', 'balken'].includes(art.value); s.querySelector('.r-w2').hidden = art.value !== 'zwischen'; s.querySelector('#r-w').placeholder = art.value === 'formel' ? 'z. B. =$F2="offen"' : art.value === 'enthaelt' ? 'z. B. offen' : 'z. B. 0 oder 200'; };
    art.addEventListener('change', sichtbar); sichtbar(); liste();
    const dazu = (r) => { if (!Fo.bereich(r.bereich.split(':').length > 2 ? '' : r.bereich)) { meldung('Bereich bitte wie „E2:E40“.'); return; } merke('meta'); b.regeln = [...(b.regeln || []), r]; geaendert(); zeichneTabelle(); liste(); };
    s.addEventListener('click', (ev) => {
      const q = ev.target.closest('[data-schnell]')?.dataset.schnell; const bereich = s.querySelector('#r-ber').value.trim().toUpperCase();
      if (q) dazu({ bereich, ...{ neg: { art: 'kleiner', wert: '0', farbe: '#f3c9c4' }, dop: { art: 'doppelt', farbe: '#f8e1a8' }, bal: { art: 'balken', farbe: '#9fd4b2' }, leer: { art: 'leer', farbe: '#f6d5c4' } }[q] });
      if (ev.target.closest('[data-dazu]')) dazu({ bereich, art: art.value, wert: s.querySelector('#r-w').value.trim(), wert2: s.querySelector('#r-w2').value.trim(), farbe: s.querySelector('input[name="rf"]:checked').value });
      const weg = ev.target.closest('[data-weg]'); if (weg) { merke('meta'); b.regeln.splice(Number(weg.dataset.weg), 1); if (!b.regeln.length) delete b.regeln; geaendert(); zeichneTabelle(); liste(); }
    });
  }

  // ---------- Auswahllisten ----------
  function listenFenster() {
    const b = blatt(); const a = auswahl(); const g = groesse(b);
    const ze1 = a.ze1 === 0 && typeof S.werte[Fo.adresse(a.sp1, 0)] === 'string' ? 1 : a.ze1;
    const ze2 = a.ze1 === a.ze2 || a.ze2 >= g.ze ? Math.max(g.ze, ze1) + 200 : a.ze2;
    const ber = `${Fo.adresse(a.sp1, ze1)}:${Fo.adresse(a.sp2, ze2)}`;
    const da = listeFuer(b, Fo.adresse(a.sp1, ze1));
    const vorschlag = da?.werte || [...new Set(sammle(`${Fo.adresse(a.sp1, ze1)}:${Fo.adresse(a.sp1, Math.min(ze2, g.ze))}`).map((ad) => zeigeZelle(b, ad)).filter((t) => t !== ''))].slice(0, 50);
    const s = fensterAuf(`${fensterKopf('Auswahlliste', 'In diesen Zellen klappt dann eine Liste auf – keine Tippfehler mehr.')}
      <div class="regelform"><label>Für die Zellen<input class="feld" id="l-ber" value="${esc(ber)}"></label></div>
      <div class="segment" style="margin:8px 0"><label><input type="radio" name="lq" value="werte" ${!da?.bereich ? 'checked' : ''}><span>Diese Einträge</span></label><label><input type="radio" name="lq" value="bereich" ${da?.bereich ? 'checked' : ''}><span>Aus anderen Zellen</span></label></div>
      <textarea class="feld l-werte" rows="7" placeholder="Ein Eintrag pro Zeile">${esc(vorschlag.join('\n'))}</textarea>
      <input class="feld l-bereich" placeholder="z. B. Listen!A1:A12" value="${esc(da?.bereich || '')}" hidden>
      <div class="reihe knopfreihe">${da ? '<button type="button" class="btn leise gefahr-text" data-weg>Liste entfernen</button>' : ''}<div class="platz"></div><button type="button" class="btn leise" data-zu>Abbrechen</button><button type="button" class="btn" data-ok>Speichern</button></div>`, { breite: 520 });
    const art = () => s.querySelector('input[name="lq"]:checked').value;
    const um = () => { s.querySelector('.l-werte').hidden = art() !== 'werte'; s.querySelector('.l-bereich').hidden = art() !== 'bereich'; };
    s.addEventListener('change', um); um();
    s.addEventListener('click', (ev) => {
      const ziel = s.querySelector('#l-ber').value.trim().toUpperCase();
      const entferne = () => { b.listen = Object.fromEntries(Object.entries(b.listen || {}).filter(([k]) => !k.split(' ').some((t) => { const r = Fo.bereich(t), z = Fo.bereich(ziel); return r && z && !(r.sp2 < z.sp1 || r.sp1 > z.sp2 || r.ze2 < z.ze1 || r.ze1 > z.ze2); }))); if (!Object.keys(b.listen).length) delete b.listen; };
      if (ev.target.closest('[data-weg]')) { merke('meta'); entferne(); geaendert(); zeichneTabelle(); s.schliessen(); return; }
      if (!ev.target.closest('[data-ok]')) return;
      if (!Fo.bereich(ziel)) { meldung('Bereich bitte wie „C2:C200“.'); return; }
      let q;
      if (art() === 'werte') { const w = s.querySelector('.l-werte').value.split('\n').map((x) => x.trim()).filter(Boolean); if (!w.length) { meldung('Mindestens ein Eintrag.'); return; } q = { werte: [...new Set(w)] }; }
      else { const t = s.querySelector('.l-bereich').value.trim(); if (!Fo.bereich(t.split('!').pop().replace(/\$/g, ''))) { meldung('Zellen bitte wie „Listen!A1:A12“.'); return; } q = { bereich: t }; }
      merke('meta'); entferne(); b.listen = { ...(b.listen || {}), [ziel]: q };
      geaendert(); zeichneTabelle(); s.schliessen(); meldung('Liste gespeichert. Klick in eine Zelle und dann auf ▾ (oder Alt+↓).');
    });
  }
  function listeOeffnen() {
    const b = blatt(); const ad = Fo.adresse(S.anker.sp, S.anker.ze);
    const q = listeFuer(b, ad); if (!q) return;
    const td = app.querySelector(`td[data-a="${ad}"]`); if (!td) return;
    const werte = listenWerte(q); const jetzt = zeigeZelle(b, ad).toLowerCase();
    const m = schwebe('auswahlmenue', `${werte.map((w, i) => `<button type="button" class="mz${w.toLowerCase() === jetzt ? ' an' : ''}" data-i="${i}">${esc(w)}</button>`).join('') || '<span class="leise" style="padding:8px">Liste ist leer.</span>'}<button type="button" class="mz leise" data-leeren>Leeren</button>`, td);
    m.style.minWidth = `${td.offsetWidth}px`;
    const knoepfe = [...m.querySelectorAll('[data-i]')]; let i = Math.max(0, knoepfe.findIndex((x) => x.classList.contains('an')));
    knoepfe[i]?.focus();
    m.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); i = (i + (ev.key === 'ArrowDown' ? 1 : -1) + knoepfe.length) % knoepfe.length; knoepfe[i].focus(); }
      if (ev.key === 'Escape') { m.remove(); app.querySelector('.rasterscroll').focus(); }
    });
    m.addEventListener('click', (ev) => {
      const k = ev.target.closest('[data-i]'); const leeren = ev.target.closest('[data-leeren]');
      if (!k && !leeren) return;
      m.remove(); uebernehme(leeren ? '' : werte[Number(k.dataset.i)], ad); app.querySelector('.rasterscroll').focus();
    });
  }

  // ---------- Übersicht (Pivot) ----------
  function pivotFenster() {
    const b = blatt(); const g = groesse(b);
    if (b.pivot) return pivotNeu();
    const kopf = b.filter?.kopf || 0;
    const spalten = []; for (let sp = 0; sp <= g.sp; sp++) { const n = zeigeZelle(b, Fo.adresse(sp, kopf)); spalten.push({ sp, name: n || `Spalte ${Fo.nrZuSpalte(sp)}`, zahl: typeof S.werte[Fo.adresse(sp, kopf + 1)] === 'number' }); }
    if (!spalten.length || g.ze < kopf + 1) { meldung('Dafür brauche ich eine Tabelle mit Überschriften und Daten darunter.'); return; }
    const chips = chipSpalten(b);
    const zDefault = spalten.find((x) => chips.has(x.sp)) || spalten.find((x) => !x.zahl) || spalten[0];
    const zahlen = (sp) => { let n = 0; for (let ze = kopf + 1; ze <= g.ze; ze++) { const ad = Fo.adresse(sp, ze); if (typeof S.werte[ad] === 'number' && !String(b.zellen[ad] ?? '').startsWith('=') && !Fo.datumArt(b.zellen[ad])) n++; } return n; };
    const wDefault = spalten.map((x) => [x, zahlen(x.sp)]).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1] || y[0].sp - x[0].sp)[0]?.[0] || spalten[spalten.length - 1];
    const opt = (sel, mitLeer = false) => `${mitLeer ? '<option value="">— nichts —</option>' : ''}${spalten.map((x) => `<option value="${x.sp}" ${sel && x.sp === sel.sp ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}`;
    const s = fensterAuf(`${fensterKopf('Übersicht bauen', 'Fasst die Tabelle zusammen (wie eine Pivot-Tabelle) – auf einem neuen Blatt, das immer mitrechnet.')}
      <div class="regelform">
        <label>Zeilen: je<select class="feld" id="p-z">${opt(zDefault)}</select></label>
        <label>Spalten: je (optional)<select class="feld" id="p-s">${opt(null, true)}</select></label>
        <label>Rechnen mit<select class="feld" id="p-w">${opt(wDefault)}</select></label>
        <label>Rechnung<select class="feld" id="p-a"><option value="SUMME">Summe</option><option value="ANZAHL">Anzahl</option><option value="MITTELWERT">Durchschnitt</option><option value="MAX">Größter</option><option value="MIN">Kleinster</option></select></label>
      </div>
      <div class="reihe knopfreihe"><div class="platz"></div><button type="button" class="btn leise" data-zu>Abbrechen</button><button type="button" class="btn" data-ok>${sym('tabelle', 15)} Übersicht bauen</button></div>`, { breite: 560 });
    s.addEventListener('click', (ev) => {
      if (!ev.target.closest('[data-ok]')) return;
      const zahl = (id) => { const v = s.querySelector(id).value; return v === '' ? null : Number(v); };
      let name = 'Übersicht'; let k = 2; while (S.t.blaetter.some((x) => x.name.toLowerCase() === name.toLowerCase())) name = `Übersicht ${k++}`;
      const neu = W.pivot(b, (ad) => S.werte[ad], { kopf, zeilen: zahl('#p-z'), spalten: zahl('#p-s'), wert: zahl('#p-w'), art: s.querySelector('#p-a').value, name });
      merke('alle'); S.t.blaetter.push(felder(neu)); S.blattNr = S.t.blaetter.length - 1; S.anker = { sp: 0, ze: 0 }; S.ende = { sp: 0, ze: 0 };
      s.schliessen(); geaendert(); zeichneTabelle(); blattNamenZeigen();
      meldung('Übersicht fertig. Sie rechnet mit, wenn du Daten änderst. Bei neuen Kategorien: „Neu aufbauen“.', { dauer: 7000 });
    });
  }
  function pivotNeu() {
    const p = blatt().pivot; const q = S.t.blaetter.find((x) => x.name === p.quelle);
    if (!q) { meldung(`Das Blatt „${p.quelle}“ gibt es nicht mehr.`); return; }
    const r = Fo.mappe(S.t.blaetter)(q.name);
    const neu = felder(W.pivot(q, (ad) => r.wert(ad), { ...p, name: blatt().name }));
    merke('alle'); S.t.blaetter[S.blattNr] = neu; geaendert(); zeichneTabelle(); meldung('Übersicht neu aufgebaut.');
  }

  // ---------- Drucken / PDF ----------
  function druckHtml({ nurMarkierung, gitter, anpassen, quer, titel }) {
    const b = blatt(); const g = groesse(b);
    const r = nurMarkierung ? auswahl() : { sp1: 0, ze1: 0, sp2: g.sp, ze2: g.ze };
    for (const ad of S.r.ueber.keys()) { const z = Fo.zerlege(ad); if (!nurMarkierung) { r.sp2 = Math.max(r.sp2, z.sp); r.ze2 = Math.max(r.ze2, z.ze); } }
    const verd = W.verdeckt(b); const stile = W.regelnAuswerten(b, (ad) => S.werte[ad]);
    const breiten = []; for (let sp = r.sp1; sp <= r.sp2; sp++) breiten.push(b.breiten[Fo.nrZuSpalte(sp)] || 110);
    const summe = breiten.reduce((x, y) => x + y, 0);
    const kopfBis = Math.min(b.fixiert?.ze || (typeof S.werte[Fo.adresse(r.sp1, r.ze1)] === 'string' ? r.ze1 + 1 : r.ze1), r.ze2 + 1);
    const zeile = (ze) => {
      let h = '<tr>';
      for (let sp = r.sp1; sp <= r.sp2; sp++) {
        const ad = Fo.adresse(sp, ze); const vd = verd.get(ad);
        if (vd === 'weg') continue;
        const span = vd ? ` colspan="${Math.min(vd.sp2, r.sp2) - sp + 1}" rowspan="${Math.min(vd.ze2, r.ze2) - ze + 1}"` : '';
        const w = S.werte[ad]; const st = stile.get(ad); const farbe = st?.farbe || b.farben[ad];
        const stil = `${typeof w === 'number' ? 'text-align:right;' : ''}${vd ? 'text-align:center;' : ''}${b.fett[ad] ? 'font-weight:700;' : ''}${farbe ? `background:${farbe};` : ''}${st?.balken ? `background:linear-gradient(90deg,${st.balken.farbe} ${Math.round(st.balken.anteil * 100)}%,transparent ${Math.round(st.balken.anteil * 100)}%);` : ''}${w instanceof Fo.Fehler ? 'color:#c0392b;' : ''}`;
        h += `<td${span}${stil ? ` style="${stil}"` : ''}>${esc(zeigeZelle(b, ad, w))}</td>`;
      }
      return `${h}</tr>`;
    };
    let kopf = ''; let koerper = '';
    for (let ze = r.ze1; ze <= r.ze2; ze++) { if (S.versteckt.has(ze)) continue; if (ze < kopfBis) kopf += zeile(ze); else koerper += zeile(ze); }
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(titel)}</title><style>
      @page{size:A4 ${quer ? 'landscape' : 'portrait'};margin:12mm 10mm 14mm}
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{font:9.5pt 'Segoe UI',Arial,sans-serif;color:#1d2742;margin:0}
      h1{font-size:13pt;margin:0 0 8px}
      table{border-collapse:collapse;table-layout:fixed;${anpassen ? 'width:calc(100% - 1px)' : `width:${summe}px`}}
      td{padding:3px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${gitter ? 'border:0.5pt solid #b9b4a8;' : 'border-bottom:0.5pt solid #e4dfd3;'}}
      thead td{font-weight:700;background:#f3faf5}
      thead{display:table-header-group} tr{page-break-inside:avoid}
    </style></head><body>${titel ? `<h1>${esc(titel)}</h1>` : ''}<table><colgroup>${breiten.map((x) => `<col style="width:${anpassen ? `${(x / summe * 100).toFixed(2)}%` : `${x}px`}">`).join('')}</colgroup><thead>${kopf}</thead><tbody>${koerper}</tbody></table></body></html>`;
  }
  function druckFenster() {
    const a = auswahl(); const viele = a.sp1 !== a.sp2 || a.ze1 !== a.ze2;
    const g = groesse(blatt());
    const s = fensterAuf(`${fensterKopf('Drucken oder PDF', 'Nur die Tabelle, ohne Knöpfe drumherum. Überschriften wiederholen sich auf jeder Seite.')}
      <div class="ezeile"><div class="t"><b>Ausrichtung</b></div><div class="segment"><label><input type="radio" name="dq" value="1" ${g.sp > 5 ? 'checked' : ''}><span>Quer</span></label><label><input type="radio" name="dq" value="" ${g.sp > 5 ? '' : 'checked'}><span>Hoch</span></label></div></div>
      <div class="ezeile"><div class="t"><b>Was</b></div><div class="segment"><label><input type="radio" name="du" value="" checked><span>Ganzes Blatt</span></label><label><input type="radio" name="du" value="1" ${viele ? '' : 'disabled'}><span>Nur Markierung</span></label></div></div>
      <div class="ezeile"><div class="t"><b>Auf Seitenbreite</b><span>Alle Spalten passen auf die Seite.</span></div><input type="checkbox" id="d-an" checked></div>
      <div class="ezeile"><div class="t"><b>Gitternetz</b></div><input type="checkbox" id="d-git" checked></div>
      <div class="ezeile"><div class="t"><b>Überschrift</b><span>Name der Tabelle oben drüber.</span></div><input type="checkbox" id="d-tit" checked></div>
      <div class="reihe knopfreihe"><div class="platz"></div><button type="button" class="btn leise" data-zu>Abbrechen</button><button type="button" class="btn weiss" data-art="drucker">Drucken</button><button type="button" class="btn" data-art="pdf">${sym('export', 15)} Als PDF speichern</button></div>`, { breite: 560 });
    s.addEventListener('click', async (ev) => {
      const art = ev.target.closest('[data-art]')?.dataset.art; if (!art) return;
      const quer = Boolean(s.querySelector('input[name="dq"]:checked').value);
      const html = druckHtml({ quer, nurMarkierung: Boolean(s.querySelector('input[name="du"]:checked').value), anpassen: s.querySelector('#d-an').checked, gitter: s.querySelector('#d-git').checked, titel: s.querySelector('#d-tit').checked ? `${S.t.name}${S.t.blaetter.length > 1 ? ` – ${blatt().name}` : ''}` : '' });
      s.schliessen();
      const r = await A.drucken({ html, art, quer, titel: S.t.name });
      if (r?.ok && r.datei) meldung('PDF gespeichert.', { knopf: 'Im Ordner zeigen', aktion: () => A.datei.zeigen(r.datei), dauer: 7000 });
      else if (r?.fehler) meldung(`Klappt nicht: ${r.fehler.nachricht}`);
    });
  }

  // ---------- Makros ----------
  const MAKRO_HILFE = `tab.wert("B3") · tab.text("B3") · tab.inhalt("B3")
tab.setze("B3", 12.5) · tab.setze("B9", "=SUMME(B2:B8)")
tab.werte("A2:C9") · tab.leeren("A2:C9")
tab.fett("A1:C1", true) · tab.farbe("A1", "#f6d5c4") · tab.format("B2:B9", "eur") · tab.breite("B", 200)
tab.zeileEinfuegen(5) · tab.zeileLoeschen(5) · tab.letzteZeile("A") · tab.zeilen()
tab.sortiere("C", "auf"|"ab") · tab.blatt("Name") · tab.neuesBlatt("Name")
tab.adresse("C", 7) → "C7" · tab.heute() · tab.auswahl() · tab.meldung("Fertig")`;
  function makroAusfuehren(m) {
    if (S.makroLaeuft) { meldung('Es läuft schon ein Makro.'); return; }
    let arbeiter;
    try { arbeiter = new Worker('makro-arbeiter.js'); } catch (f) { meldung(`Makros gehen hier nicht: ${f.message}`); return; }
    S.makroLaeuft = true; meldung(`„${m.name}“ läuft …`, { dauer: 60000 });
    const uhr = setTimeout(() => { arbeiter.terminate(); S.makroLaeuft = false; meldung(`„${m.name}“ hat zu lange gebraucht (über 20 Sekunden) und wurde gestoppt. Nichts wurde geändert.`, { dauer: 9000 }); }, 20000);
    arbeiter.onmessage = (e) => {
      clearTimeout(uhr); arbeiter.terminate(); S.makroLaeuft = false;
      const d = e.data;
      if (!d.ok) { meldung(`Makro „${m.name}“: ${d.fehler} – nichts wurde geändert.`, { dauer: 10000 }); return; }
      merke('alle');
      S.t.blaetter = d.blaetter.map(felder); S.blattNr = Math.min(d.blattNr, S.t.blaetter.length - 1);
      geaendert(); zeichneTabelle(); blattNamenZeigen();
      meldung(d.meldungen.length ? d.meldungen.join(' · ') : `„${m.name}“ ist durchgelaufen.`, { knopf: 'Rückgängig', aktion: rueckgaengig, dauer: 8000 });
    };
    arbeiter.onerror = (e) => { clearTimeout(uhr); arbeiter.terminate(); S.makroLaeuft = false; meldung(`Makro „${m.name}“: ${e.message || 'Fehler'}`, { dauer: 9000 }); };
    arbeiter.postMessage({ code: m.code, daten: { blaetter: JSON.parse(JSON.stringify(S.t.blaetter)), blattNr: S.blattNr, auswahl: auswahlText() } });
  }
  function aufnahmeStarten() {
    S.aufnahme = [];
    document.querySelectorAll('.schleier').forEach((x) => x.remove());
    const k = app.querySelector('.kopf .platz');
    k?.insertAdjacentHTML('afterend', `<button type="button" class="aufnahme" data-aktion="aufnahme-stopp" title="Aufnahme beenden">● Aufnahme läuft · Stopp</button>`);
    meldung('Aufnahme läuft: Mach jetzt die Schritte in der Tabelle. Danach oben auf „Stopp“.', { dauer: 7000 });
  }
  function aufnahmeStoppen() {
    const code = (S.aufnahme || []).join('\n'); S.aufnahme = null;
    app.querySelector('.aufnahme')?.remove();
    if (!code) { meldung('Nichts aufgenommen.'); return; }
    makroBearbeiten({ id: neueId(), name: 'Neues Makro', code, knopf: true }, true);
  }
  function makroBearbeiten(m, neu = false, notiz = '') {
    const s = fensterAuf(`${fensterKopf(neu ? 'Neues Makro' : 'Makro bearbeiten')}
      ${notiz ? `<div class="tipp-karte"><b class="h">Der Helfer sagt</b><span>${esc(notiz)}</span></div>` : ''}
      <div class="ezeile"><div class="t"><b>Name</b></div><input class="feld" id="m-name" value="${esc(m.name)}" maxlength="60"></div>
      <div class="ezeile"><div class="t"><b>Als Knopf in der Seitenleiste</b><span>Ein Klick führt es aus.</span></div><input type="checkbox" id="m-knopf" ${m.knopf ? 'checked' : ''}></div>
      <textarea class="code" id="m-code" rows="14" spellcheck="false" aria-label="Makro-Code">${esc(m.code)}</textarea>
      <details class="hilfe"><summary>Was ein Makro darf</summary><pre>${esc(MAKRO_HILFE)}</pre><p class="leise">Makros sehen nur diese Tabelle: kein Internet, keine Dateien, keine anderen Programme. Alles lässt sich rückgängig machen.</p></details>
      <div class="reihe knopfreihe">${neu ? '' : '<button type="button" class="btn leise gefahr-text" data-weg>Löschen</button>'}<div class="platz"></div><button type="button" class="btn leise" data-zu>Abbrechen</button><button type="button" class="btn weiss" data-los>${sym('makro', 14)} Ausführen</button><button type="button" class="btn" data-ok>Speichern</button></div>`, { breite: 720 });
    const lesen = () => ({ ...m, name: s.querySelector('#m-name').value.trim().slice(0, 60) || 'Makro', code: s.querySelector('#m-code').value, knopf: s.querySelector('#m-knopf').checked });
    const speichern = () => { const n = lesen(); const i = S.t.makros.findIndex((x) => x.id === n.id); if (i >= 0) S.t.makros[i] = n; else S.t.makros.push(n); geaendert(); zeichneReiter(); return n; };
    s.querySelector('#m-code').addEventListener('keydown', (ev) => { if (ev.key === 'Tab') { ev.preventDefault(); const t = ev.target; const p = t.selectionStart; t.value = `${t.value.slice(0, p)}  ${t.value.slice(t.selectionEnd)}`; t.setSelectionRange(p + 2, p + 2); } });
    s.addEventListener('click', async (ev) => {
      if (ev.target.closest('[data-ok]')) { speichern(); s.schliessen(); meldung('Makro gespeichert.'); }
      if (ev.target.closest('[data-los]')) { const n = speichern(); s.schliessen(); makroAusfuehren(n); }
      if (ev.target.closest('[data-weg]') && await frage({ titel: `Makro „${m.name}“ löschen?`, ja: 'Löschen', gefahr: true })) { S.t.makros = S.t.makros.filter((x) => x.id !== m.id); geaendert(); zeichneReiter(); s.schliessen(); }
    });
  }
  async function helferMakro({ wunsch, vba, knopf }) {
    const alt = knopf?.innerHTML; if (knopf) { knopf.disabled = true; knopf.textContent = 'Schreibt …'; }
    const r = await A.makroSchreiben({ wunsch, vba, blatt: blatt(), blaetter: S.t.blaetter, auswahl: auswahlText(), name: S.t.name });
    if (knopf) { knopf.disabled = false; knopf.innerHTML = alt; }
    if (r?.fehler) { meldung(r.fehler.nachricht || 'Das hat nicht geklappt.'); return; }
    if (!r.code) { meldung(r.antwort || 'Der Helfer hat kein Makro geschrieben.'); return; }
    document.querySelectorAll('.schleier').forEach((x) => x.remove());
    makroBearbeiten({ id: neueId(), name: String(r.name || 'Makro').slice(0, 60), code: String(r.code), knopf: true }, true, r.antwort);
  }
  function makroFenster() {
    const t = S.t;
    const s = fensterAuf(`${fensterKopf('Makros', 'Wiederkehrende Schritte auf Knopfdruck. Aufnehmen, selbst schreiben oder vom Helfer schreiben lassen.')}
      <div class="makroliste">${t.makros.length ? t.makros.map((m) => `<div class="makro"><b>${esc(m.name)}</b>${m.knopf ? '<span class="chip klein-chip">Knopf</span>' : ''}<div class="platz"></div><button type="button" class="btn klein" data-los="${m.id}">${sym('makro', 13)} Ausführen</button><button type="button" class="btn klein weiss" data-bearb="${m.id}">Bearbeiten</button></div>`).join('') : '<p class="leise">Noch keine Makros in dieser Tabelle.</p>'}</div>
      <div class="reihe" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn weiss" data-auf><span style="color:#c0392b">●</span> Aufnehmen</button><button type="button" class="btn weiss" data-leer>${sym('plus', 14, 2.4)} Selbst schreiben</button></div>
      <h3 class="h klein-titel">Vom Helfer schreiben lassen</h3>
      <div class="frage-zeile"><textarea class="feld" id="m-wunsch" rows="2" placeholder="z. B. „Jeden Monat: neue Zeilen nach Kategorie sortieren und unten die Summe neu setzen“"></textarea><button type="button" class="btn" data-helfer>Schreiben ${sym('senden', 14, 2.4)}</button></div>
      ${t.vba?.length ? `<h3 class="h klein-titel">Excel-Makros aus der Datei</h3><p class="leise fenster-text">Werden nie ausgeführt. Der Helfer übersetzt sie in sichere Albatros-Makros.</p>${t.vba.map((v, i) => `<details class="vba"><summary><b>${esc(v.name)}</b> · ${v.code.split('\n').length} Zeilen<button type="button" class="btn klein" data-vba="${i}">Übersetzen</button></summary><pre>${esc(v.code)}</pre></details>`).join('')}` : ''}`, { breite: 680 });
    s.addEventListener('click', (ev) => {
      const los = ev.target.closest('[data-los]'); if (los) { s.schliessen(); makroAusfuehren(t.makros.find((m) => m.id === los.dataset.los)); return; }
      const be = ev.target.closest('[data-bearb]'); if (be) { s.schliessen(); makroBearbeiten(t.makros.find((m) => m.id === be.dataset.bearb)); return; }
      if (ev.target.closest('[data-auf]')) { s.schliessen(); aufnahmeStarten(); return; }
      if (ev.target.closest('[data-leer]')) { s.schliessen(); makroBearbeiten({ id: neueId(), name: 'Neues Makro', code: '// Beispiel: Datum in die erste freie Zeile von Spalte A\nconst z = tab.letzteZeile("A") + 1;\ntab.setze(tab.adresse("A", z), tab.heute());\ntab.meldung("Datum in Zeile " + z + " eingetragen.");\n', knopf: true }, true); return; }
      const h = ev.target.closest('[data-helfer]'); if (h) { const w = s.querySelector('#m-wunsch').value.trim(); if (!w) { s.querySelector('#m-wunsch').focus(); return; } helferMakro({ wunsch: w, knopf: h }); return; }
      const v = ev.target.closest('[data-vba]'); if (v) { ev.preventDefault(); helferMakro({ vba: t.vba[Number(v.dataset.vba)].code, knopf: v }); }
    });
  }

  Object.assign(aktionen, {
    formatmenue: (el) => {
      if (document.querySelector('.formatmenue')) { document.querySelector('.formatmenue').remove(); return; }
      const jetzt = blatt().formate[Fo.adresse(S.anker.sp, S.anker.ze)];
      const m = schwebe('formatmenue', FORMATE.map(([k, t, bsp]) => `<button type="button" class="mz${(k === jetzt || (k === 'eigen' && jetzt?.eigen) || (!k && !jetzt)) ? ' an' : ''}" data-k="${k ?? ''}"><span>${t}</span><small>${esc(bsp)}</small></button>`).join(''), el);
      m.addEventListener('click', (ev) => { const b = ev.target.closest('[data-k]'); if (!b) return; m.remove(); const k = b.dataset.k; if (k === 'eigen') eigenesFormat(); else formatSetzen(k || null); });
    },
    fixieren: () => fixieren(),
    verbinden: () => verbinden(),
    filter: () => filterUmschalten(),
    hervorheben: () => regelFenster(),
    liste: () => listenFenster(),
    uebersicht: () => pivotFenster(),
    'pivot-neu': () => pivotNeu(),
    suchen: () => suchen(),
    makros: () => makroFenster(),
    'makro-los': (el) => { const m = S.t.makros.find((x) => x.id === el.dataset.id); if (m) makroAusfuehren(m); },
    'aufnahme-stopp': () => aufnahmeStoppen(),
    drucken: () => druckFenster(),
  });

  // ---------- Eigene Abfrage statt Windows-Box ----------
  const frage = ({ titel, text = '', ja = 'OK', nein = 'Abbrechen', gefahr = false }) => new Promise((fertig) => {
    const s = document.createElement('div'); s.className = 'schleier frage-schleier';
    s.innerHTML = `<div class="fenster abfrage" role="alertdialog" aria-modal="true" aria-label="${esc(titel)}"><h2>${esc(titel)}</h2>${text ? `<p>${esc(text)}</p>` : ''}<div class="abfrage-knoepfe"><button type="button" class="btn weiss" data-nein>${esc(nein)}</button><button type="button" class="btn${gefahr ? ' gefahr' : ''}" data-ja>${esc(ja)}</button></div></div>`;
    const zu = (w) => { document.removeEventListener('keydown', taste, true); s.remove(); fertig(w); };
    const taste = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); zu(false); } else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); zu(true); } };
    s.addEventListener('click', (e) => { if (e.target === s || e.target.closest('[data-nein]')) zu(false); else if (e.target.closest('[data-ja]')) zu(true); });
    document.addEventListener('keydown', taste, true);
    document.body.appendChild(s); s.querySelector('[data-ja]').focus();
  });

  // ---------- Ereignisse ----------
  app.addEventListener('click', (ev) => {
    if (!ev.target.closest('.menue, [data-aktion="exportmenue"]')) document.querySelector('.menue')?.remove();
    if (!ev.target.closest('.farbwahl, .farben')) document.querySelector('.farben')?.remove();
    const el = ev.target.closest('[data-aktion]');
    if (!el) return;
    const fn = aktionen[el.dataset.aktion];
    if (fn) Promise.resolve(fn(el, ev)).catch((f) => meldung(f.message || String(f)));
  });
  app.addEventListener('dblclick', (ev) => {
    const zg = ev.target.closest('[data-ziehen]'); if (zg && S.ansicht === 'tabelle') { passendeBreite(Number(zg.dataset.ziehen)); return; }
    if (ev.target.closest('.griff')) { fuellBisEnde(); return; }
    const td = ev.target.closest('td[data-a]'); if (td && S.ansicht === 'tabelle') { starteBearbeiten(); return; }
    const r = ev.target.closest('.sl-blatt[data-i], .blattname2');
    if (r) { const b = S.t.blaetter[r.dataset.i !== undefined ? Number(r.dataset.i) : S.blattNr]; const f = document.createElement('input'); f.value = b.name; f.style.width = '110px'; r.replaceWith(f); f.focus(); f.select(); const ok = () => { b.name = f.value.trim().slice(0, 31) || b.name; if (r.dataset.i === undefined) { r.textContent = b.name; f.replaceWith(r); } app.querySelector('.blattname').textContent = blatt().name; { const b2 = app.querySelector('.blattname2'); if (b2) b2.textContent = blatt().name; } geaendert(); zeichneReiter(); }; f.addEventListener('blur', ok, { once: true }); f.addEventListener('keydown', (e) => { if (e.key === 'Enter') f.blur(); }); return; }
  });
  // Markieren mit Maus (ziehen), Spalten/Zeilen per Kopf, Spaltenbreite ziehen
  let zieht = false;
  app.addEventListener('mousedown', (ev) => {
    if (S.ansicht !== 'tabelle' || ev.button !== 0) return;
    if (ev.target.closest('.griff')) { ev.preventDefault(); if (S.bearbeiten?.ort === 'zelle') beende(true); fuell = { a: auswahl(), ziel: null }; return; }
    const fk = ev.target.closest('[data-filter]'); if (fk) { ev.preventDefault(); ev.stopPropagation(); filterMenue(Number(fk.dataset.filter), fk); return; }
    if (ev.target.closest('[data-liste]')) { ev.preventDefault(); listeOeffnen(); return; }
    const zg = ev.target.closest('[data-ziehen]');
    if (zg) {
      ev.preventDefault();
      const sp = Number(zg.dataset.ziehen); const name = Fo.nrZuSpalte(sp); const start = ev.clientX; const alt = blatt().breiten[name] || 110;
      const col = app.querySelectorAll('table.gitter col')[sp + 1];
      const tab = app.querySelector('table.gitter'); const tabAlt = tab.offsetWidth;
      const bewegt = (e) => { const b = Math.max(40, Math.min(600, alt + e.clientX - start)); col.style.width = `${b}px`; tab.style.width = `${tabAlt + b - alt}px`; blatt().breiten[name] = b; };
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
    if (fuell) { const td = ev.target.closest('td[data-a]'); if (td) fuellZiel(td); return; }
    if (!zieht) return;
    const td = ev.target.closest('td[data-a]'); if (!td) return;
    const z = Fo.zerlege(td.dataset.a);
    if (z.sp !== S.ende.sp || z.ze !== S.ende.ze) { S.ende = z; zeigeAuswahl(); }
  });
  document.addEventListener('mouseup', (ev) => {
    zieht = false;
    if (fuell) { const f = fuell; fuell = null; app.querySelectorAll('td.fuellziel').forEach((x) => x.classList.remove('fuellziel')); if (f.ziel) fuelleAus(f.a, f.ziel, { reihe: ev.ctrlKey || ev.metaKey }); }
  });

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
    if (strg && ev.key.toLowerCase() === 'f') { ev.preventDefault(); suchen(); return; }
    if (strg && ev.key.toLowerCase() === 'h') { ev.preventDefault(); suchen(true); return; }
    if (strg && ev.shiftKey && ev.key.toLowerCase() === 'l') { ev.preventDefault(); filterUmschalten(); return; }
    if (strg && ev.key.toLowerCase() === 'p') { ev.preventDefault(); druckFenster(); return; }
    if (strg && (ev.key.toLowerCase() === 'd' || ev.key.toLowerCase() === 'r')) {
      ev.preventDefault(); const a = auswahl(); const unten = ev.key.toLowerCase() === 'd';
      if (unten && a.ze2 > a.ze1) fuelleAus({ ...a, ze2: a.ze1 }, { r: 'unten', n: a.ze2 - a.ze1 }, { kopie: true });
      else if (!unten && a.sp2 > a.sp1) fuelleAus({ ...a, sp2: a.sp1 }, { r: 'rechts', n: a.sp2 - a.sp1 }, { kopie: true });
      else if (unten && a.ze1 > 0) { merke([Fo.adresse(a.sp1, a.ze1)]); const q = blatt().zellen[Fo.adresse(a.sp1, a.ze1 - 1)]; setze(Fo.adresse(a.sp1, a.ze1), String(q ?? '').startsWith('=') ? Fo.verschiebe(q, 0, 1) : q ?? null); geaendert(); zeichneTabelle(); }
      return;
    }
    if (ev.altKey && ev.key === 'ArrowDown') { ev.preventDefault(); listeOeffnen(); return; }
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
  document.addEventListener('dragover', (ev) => { ev.preventDefault(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy'; document.body.classList.add('zieht'); });
  document.addEventListener('dragleave', (ev) => { if (!ev.relatedTarget) document.body.classList.remove('zieht'); });
  document.addEventListener('drop', async (ev) => {
    ev.preventDefault(); document.body.classList.remove('zieht');
    const f = ev.dataTransfer?.files?.[0]; if (!f) return;
    const pfad = A.pfadVon(f);
    if (!pfad || !/\.(xlsx|xlsm|csv)$/i.test(f.name)) { meldung('Nur Excel-Dateien (.xlsx, .xlsm) und .csv gehen.'); return; }
    const r = await A.datei.importieren(pfad);
    if (r?.fehler) { meldung(r.fehler.nachricht); return; }
    meldung(`„${r.name}“ wird geöffnet …`);
    try { await oeffne(r.id); } catch (f) { meldung(`Öffnen klappt nicht: ${f.message}`, { dauer: 8000 }); }
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

  window.App = { S, zeichneTabelle, aktionen, oeffne, zeigeStart, frageAlbatros, zeigeDiagramm, druckHtml };

  (async () => {
    S.einst = (await A.einstellungen.lesen()) || {};
    await zeigeStart();
    A.beimOeffnen(async (o) => { if (o.id) oeffne(o.id); else if (o.datei) { const r = await A.datei.importieren(o.datei); if (!r?.fehler) oeffne(r.id); } });
  })();
})();
