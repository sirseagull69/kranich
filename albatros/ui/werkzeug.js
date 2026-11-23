'use strict';
// Albatros – Werkzeuge ohne Oberfläche: Ausfüllen, Suchen, Verbinden, Regeln, Filter, Pivot.
// Läuft im Fenster und in Node (Tests).
(function (wurzel) {
  const Fo = typeof module !== 'undefined' && module.exports ? require('./formeln') : wurzel.Formeln;

  // ---------- Ausfüllen (Ziehen am Eck) ----------
  const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const LISTEN = [MONATE, MONATE.map((m) => m.slice(0, 3)), TAGE, TAGE.map((t) => t.slice(0, 2)), ['Q1', 'Q2', 'Q3', 'Q4']];
  const zahlText = (n) => String(Math.round(n * 1e10) / 1e10).replace('.', ',');
  const datumText = (n) => Fo.zeige(n, 'datum');
  function listeVon(t) {
    for (const l of LISTEN) { const i = l.findIndex((x) => x.toLowerCase() === String(t).trim().toLowerCase()); if (i >= 0) return { l, i, gross: String(t).trim()[0] === String(t).trim()[0]?.toUpperCase() }; }
    return null;
  }
  // quelle: Rohinhalte in Zugrichtung (z. B. ['1', '2'] oder ['=A1*2']), n: wie viele neue
  // schritt: Zellabstand pro Wiederholung (für Formeln), achse: 'ze' | 'sp'
  function fuelle(quelle, n, { achse = 'ze', reihe = false, rueckwaerts = false } = {}) {
    const q = rueckwaerts ? [...quelle].reverse() : quelle;
    const len = q.length; const aus = [];
    const leer = q.every((v) => v === undefined || v === null || v === '');
    if (leer) return Array(n).fill(null);
    const formel = q.some((v) => String(v ?? '').startsWith('='));
    const zahlen = q.map((v) => (v === undefined || v === null || v === '' || String(v).startsWith('=') ? null : Fo.alsZahl(v)));
    const daten = q.map((v) => (typeof v === 'string' && !v.startsWith('=') ? Fo.datumZahl(v) : null));
    const alleZahlen = !formel && zahlen.every((z) => z !== null);
    const alleDaten = !formel && !alleZahlen && daten.every((d) => d !== null);
    const vz = rueckwaerts ? -1 : 1;
    if (alleZahlen && (len > 1 || reihe)) {
      const schritt = len > 1 ? (zahlen[len - 1] - zahlen[0]) / (len - 1) : 1;
      for (let k = 1; k <= n; k++) aus.push(zahlText(zahlen[len - 1] + schritt * k));
      return rueckwaerts ? aus : aus;
    }
    if (alleDaten) {
      const art = Fo.datumArt(q[len - 1]);
      if (art === 'uhrzeit') { const s = len > 1 ? (daten[len - 1] - daten[0]) / (len - 1) : 1 / 24; for (let k = 1; k <= n; k++) aus.push(Fo.zeige((daten[len - 1] + s * k) % 1, 'uhrzeit')); return aus; }
      if (len > 1) {
        const a = Fo.alsDatum(daten[0]), b = Fo.alsDatum(daten[1]);
        const monate = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
        if (a.getUTCDate() === b.getUTCDate() && monate !== 0) {
          const l = Fo.alsDatum(daten[len - 1]);
          for (let k = 1; k <= n; k++) { const m = l.getUTCMonth() + monate * k; const letzter = new Date(Date.UTC(l.getUTCFullYear(), m + 1, 0)).getUTCDate(); aus.push(datumText(Fo.ausDatum(l.getUTCFullYear(), m, Math.min(Fo.alsDatum(daten[0]).getUTCDate(), letzter)))); }
          return aus;
        }
      }
      const s = len > 1 ? (daten[len - 1] - daten[0]) / (len - 1) : 1;
      for (let k = 1; k <= n; k++) aus.push(datumText(daten[len - 1] + s * k));
      return aus;
    }
    // Text mit Nummer am Ende („Woche 1“) oder bekannte Listen (Januar, Montag …)
    if (!formel && len === 1 || (!formel && q.every((v) => listeVon(v) || /\d+\s*$/.test(String(v ?? ''))) && !alleZahlen)) {
      const letzte = String(q[len - 1] ?? '');
      const li = listeVon(letzte);
      if (li && q.every((v) => listeVon(v)?.l === li.l)) {
        const s = len > 1 ? ((listeVon(q[1]).i - listeVon(q[0]).i + li.l.length) % li.l.length) || 1 : vz;
        for (let k = 1; k <= n; k++) aus.push(li.l[(((li.i + s * k) % li.l.length) + li.l.length) % li.l.length]);
        return aus;
      }
      const m = /^(.*?)(\d+)(\s*)$/.exec(letzte);
      if (m && !/^\d+$/.test(letzte)) {
        const ersteM = /^(.*?)(\d+)(\s*)$/.exec(String(q[0] ?? ''));
        const s = len > 1 && ersteM && ersteM[1] === m[1] ? (Number(m[2]) - Number(ersteM[2])) / (len - 1) : vz;
        for (let k = 1; k <= n; k++) { const z = Number(m[2]) + s * k; aus.push(`${m[1]}${z >= 0 ? String(z).padStart(m[2].length, '0') : z}${m[3]}`); }
        return aus;
      }
    }
    // Muster wiederholen, Formeln wandern mit
    for (let k = 0; k < n; k++) {
      const i = k % len; const runde = Math.floor(k / len) + 1;
      const v = q[i];
      if (v === undefined || v === null || v === '') { aus.push(null); continue; }
      if (String(v).startsWith('=')) { const d = runde * len * vz; aus.push(Fo.verschiebe(v, achse === 'sp' ? d : 0, achse === 'ze' ? d : 0)); }
      else aus.push(v);
    }
    return aus;
  }

  // ---------- Suchen ----------
  function finde(b, werte, text, { formeln = false, ganz = false, gross = false } = {}) {
    if (!text) return [];
    const t = gross ? text : text.toLowerCase();
    const treffer = [];
    for (const [ad, roh] of Object.entries(b.zellen)) {
      const anzeige = formeln ? String(roh) : Fo.zeige(werte[ad], b.formate?.[ad]) || String(roh);
      const s = gross ? anzeige : anzeige.toLowerCase();
      if (ganz ? s === t : s.includes(t)) treffer.push(ad);
    }
    // auch übergelaufene Ergebnisse (nur Werte)
    return treffer.map((ad) => [ad, Fo.zerlege(ad)]).sort((x, y) => x[1].ze - y[1].ze || x[1].sp - y[1].sp).map((x) => x[0]);
  }
  function ersetzeIn(roh, such, durch, { ganz = false, gross = false } = {}) {
    const s = String(roh);
    if (ganz) return (gross ? s === such : s.toLowerCase() === such.toLowerCase()) ? durch : s;
    const re = new RegExp(such.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), gross ? 'g' : 'gi');
    return s.replace(re, () => durch);
  }

  // ---------- Verbundene Zellen ----------
  function verbundVon(b, sp, ze) {
    for (const v of b.verbunden || []) { const r = Fo.bereich(v); if (r && sp >= r.sp1 && sp <= r.sp2 && ze >= r.ze1 && ze <= r.ze2) return r; }
    return null;
  }
  function verdeckt(b) {
    const m = new Map(); // Adresse → 'anker' | 'weg'
    for (const v of b.verbunden || []) { const r = Fo.bereich(v); if (!r) continue; for (let ze = r.ze1; ze <= r.ze2; ze++) for (let sp = r.sp1; sp <= r.sp2; sp++) m.set(Fo.adresse(sp, ze), ze === r.ze1 && sp === r.sp1 ? r : 'weg'); }
    return m;
  }

  // ---------- Bereiche beim Einfügen von Zeilen/Spalten mitschieben ----------
  function schiebeBereich(text, ab, n, achse) {
    const r = Fo.bereich(text); if (!r) return text;
    const k = achse === 'ze' ? ['ze1', 'ze2'] : ['sp1', 'sp2'];
    if (r[k[0]] >= ab) r[k[0]] += n;
    if (r[k[1]] >= ab) r[k[1]] += n;
    const a = Fo.adresse(r.sp1, r.ze1), b = Fo.adresse(r.sp2, r.ze2);
    return a === b ? a : `${a}:${b}`;
  }

  // ---------- Bedingte Formatierung ----------
  // regel = { bereich: 'E2:E40', art: 'kleiner'|'groesser'|'gleich'|'zwischen'|'enthaelt'|'doppelt'|'leer'|'balken'|'formel', wert, wert2, farbe }
  const ARTEN = { groesser: 'größer als', kleiner: 'kleiner als', gleich: 'gleich', ungleich: 'ungleich', zwischen: 'zwischen', enthaelt: 'enthält', doppelt: 'doppelt', leer: 'leer', balken: 'Balken', formel: 'Formel' };
  function regelnAuswerten(b, wertVon) {
    const aus = new Map();
    for (const rg of b.regeln || []) {
      const r = Fo.bereich(rg.bereich); if (!r) continue;
      const adr = [];
      for (let ze = r.ze1; ze <= r.ze2; ze++) for (let sp = r.sp1; sp <= r.sp2; sp++) adr.push(Fo.adresse(sp, ze));
      const z = (x) => (x === undefined || x === null || x === '' ? null : Fo.alsZahl(x) ?? Fo.datumZahl(String(x)));
      const g1 = z(rg.wert), g2 = z(rg.wert2);
      let test;
      if (rg.art === 'doppelt') {
        const zaehl = new Map(); for (const a of adr) { const w = wertVon(a); if (w === null || w === '' || w === undefined) continue; const k = String(w).toLowerCase(); zaehl.set(k, (zaehl.get(k) || 0) + 1); }
        test = (w) => w !== null && w !== undefined && w !== '' && zaehl.get(String(w).toLowerCase()) > 1;
      } else if (rg.art === 'balken') {
        const zs = adr.map(wertVon).filter((w) => typeof w === 'number');
        const max = Math.max(0, ...zs), min = Math.min(0, ...zs); const spanne = max - min || 1;
        for (const a of adr) { const w = wertVon(a); if (typeof w === 'number') { const st = aus.get(a) || {}; st.balken = { anteil: (w - min) / spanne, farbe: rg.farbe || '#9fd4b2' }; aus.set(a, st); } }
        continue;
      } else if (rg.art === 'formel') {
        // Formel relativ zur ersten Zelle des Bereichs, z. B. =$F2="offen"
        for (const a of adr) {
          const p = Fo.zerlege(a);
          const f = Fo.verschiebe(String(rg.wert || '').startsWith('=') ? rg.wert : `=${rg.wert}`, p.sp - r.sp1, p.ze - r.ze1);
          const w = formelTest(b, f, wertVon);
          if (w) { const st = aus.get(a) || {}; if (!st.farbe) st.farbe = rg.farbe; aus.set(a, st); }
        }
        continue;
      } else {
        test = (w) => {
          const n = typeof w === 'number' ? w : z(w);
          switch (rg.art) {
            case 'groesser': return n !== null && g1 !== null && n > g1;
            case 'kleiner': return n !== null && g1 !== null && n < g1;
            case 'gleich': return g1 !== null && n !== null ? n === g1 : String(w ?? '').toLowerCase() === String(rg.wert ?? '').toLowerCase();
            case 'ungleich': return g1 !== null && n !== null ? n !== g1 : String(w ?? '').toLowerCase() !== String(rg.wert ?? '').toLowerCase();
            case 'zwischen': return n !== null && g1 !== null && g2 !== null && n >= Math.min(g1, g2) && n <= Math.max(g1, g2);
            case 'enthaelt': return String(w ?? '').toLowerCase().includes(String(rg.wert ?? '').toLowerCase()) && rg.wert !== '';
            case 'leer': return w === null || w === undefined || w === '';
            default: return false;
          }
        };
      }
      for (const a of adr) { if (test(wertVon(a))) { const st = aus.get(a) || {}; if (!st.farbe) st.farbe = rg.farbe; if (rg.schrift) st.schrift = rg.schrift; aus.set(a, st); } }
    }
    return aus;
  }
  // Eine Prüf-Formel mit den Werten des Blatts ausrechnen
  function formelTest(b, formel, wertVon) {
    const zellen = { ...b.zellen, ZZZ99999: formel };
    try { const r = Fo.rechner({ ...b, zellen }).wert('ZZZ99999'); void wertVon; return r instanceof Fo.Fehler ? false : Boolean(r); } catch { return false; }
  }

  // ---------- Filter ----------
  // b.filter = { kopf: 0, spalten: { C: ['Essen', 'Miete'] } } – erlaubte Texte je Spalte
  function datenEnde(b, kopf = 0) {
    let ende = kopf;
    for (const ad in b.zellen) { let i = 0; while (i < ad.length && ad.charCodeAt(i) >= 65) i++; const ze = Number(ad.slice(i)) - 1; if (ze > ende) ende = ze; }
    return ende;
  }
  function versteckteZeilen(b, wertVon) {
    const f = b.filter; const weg = new Set();
    if (!f || !f.spalten || !Object.keys(f.spalten).length) return weg;
    const ende = datenEnde(b, f.kopf || 0);
    const regeln = Object.entries(f.spalten).map(([sp, erlaubt]) => [Fo.spalteZuNr(sp), new Set(erlaubt)]);
    for (let ze = (f.kopf || 0) + 1; ze <= ende; ze++) {
      for (const [sp, erlaubt] of regeln) {
        const ad = Fo.adresse(sp, ze); const t = Fo.zeige(wertVon(ad), b.formate?.[ad]);
        if (!erlaubt.has(t)) { weg.add(ze); break; }
      }
    }
    return weg;
  }
  function werteDerSpalte(b, wertVon, sp, kopf = 0) {
    const ende = datenEnde(b, kopf); const zaehl = new Map();
    for (let ze = kopf + 1; ze <= ende; ze++) { const ad = Fo.adresse(sp, ze); const t = Fo.zeige(wertVon(ad), b.formate?.[ad]); zaehl.set(t, (zaehl.get(t) || 0) + 1); }
    return [...zaehl.entries()].sort((x, y) => (x[0] === '' ? 1 : y[0] === '' ? -1 : x[0].localeCompare(y[0], 'de', { numeric: true })));
  }

  // ---------- Pivot (Übersicht) ----------
  // Baut ein neues Blatt mit Formeln, die auf die Daten zeigen – rechnet also mit, wenn sich Daten ändern.
  const quote = (n) => (/^[A-Za-z_][\w.]*$/.test(n) ? n : `'${String(n).replace(/'/g, "''")}'`);
  function pivot(b, wertVon, { kopf = 0, zeilen, spalten = null, wert = null, art = 'SUMME', name = 'Übersicht' }) {
    const ende = datenEnde(b, kopf);
    const zeilenNr = []; for (let ze = kopf + 1; ze <= ende; ze++) zeilenNr.push(ze);
    const SUMMENZEILE = /^(summe|gesamt|total|zwischensumme|bleibt|saldo|kassenstand|rest|ergebnis)\b/i;
    const eindeutig = (sp) => { const s = new Map(); for (const ze of zeilenNr) { const w = wertVon(Fo.adresse(sp, ze)); if (w === null || w === '' || w === undefined || w instanceof Fo.Fehler) continue; const t = Fo.zeige(w, b.formate?.[Fo.adresse(sp, ze)]); if (SUMMENZEILE.test(t)) continue; if (!s.has(t.toLowerCase())) s.set(t.toLowerCase(), { text: t, roh: w }); } return [...s.values()].sort((x, y) => (typeof x.roh === 'number' && typeof y.roh === 'number' ? x.roh - y.roh : x.text.localeCompare(y.text, 'de', { numeric: true }))); };
    const bl = quote(b.name);
    const ber = (sp) => `${bl}!$${Fo.nrZuSpalte(sp)}$${kopf + 2}:$${Fo.nrZuSpalte(sp)}$${Math.max(ende + 1, kopf + 2) + 200}`;
    const krit = (x) => (typeof x.roh === 'number' ? String(x.roh).replace('.', ',') : `"${String(x.text).replace(/"/g, '""')}"`);
    const ueber = (sp) => String(wertVon(Fo.adresse(sp, kopf)) ?? Fo.nrZuSpalte(sp));
    const fn = { SUMME: 'SUMMEWENNS', ANZAHL: 'ZÄHLENWENNS', MITTELWERT: 'MITTELWERTWENNS', MAX: 'MAXWENNS', MIN: 'MINWENNS' }[art] || 'SUMMEWENNS';
    const formel = (bed) => { const teile = bed.map(([sp, x]) => `${ber(sp)};${krit(x)}`).join(';'); return fn === 'ZÄHLENWENNS' ? `=${fn}(${teile})` : `=${fn}(${ber(wert)};${teile})`; };
    const z = eindeutig(zeilen); const s = spalten !== null && spalten !== undefined ? eindeutig(spalten) : null;
    const neu = { name, zellen: {}, formate: {}, farben: {}, fett: {}, breiten: { A: 200 }, pivot: { quelle: b.name, kopf, zeilen, spalten, wert, art } };
    const wortArt = { SUMME: 'Summe', ANZAHL: 'Anzahl', MITTELWERT: 'Schnitt', MAX: 'Größter', MIN: 'Kleinster' }[art] || 'Summe';
    const fmt = wert !== null && wert !== undefined && art !== 'ANZAHL' ? b.formate?.[Fo.adresse(wert, kopf + 1)] : null;
    neu.zellen.A1 = ueber(zeilen); neu.fett.A1 = true;
    if (!s) {
      neu.zellen.B1 = art === 'ANZAHL' ? 'Anzahl' : `${wortArt} ${ueber(wert)}`; neu.fett.B1 = true; neu.breiten.B = 160;
      z.forEach((x, i) => { neu.zellen[`A${i + 2}`] = x.text; neu.zellen[`B${i + 2}`] = formel([[zeilen, x]]); if (fmt) neu.formate[`B${i + 2}`] = fmt; });
      const g = z.length + 2; neu.zellen[`A${g}`] = 'Gesamt'; neu.zellen[`B${g}`] = art === 'MITTELWERT' ? `=MITTELWERT(B2:B${g - 1})` : art === 'MAX' ? `=MAX(B2:B${g - 1})` : art === 'MIN' ? `=MIN(B2:B${g - 1})` : `=SUMME(B2:B${g - 1})`; neu.fett[`A${g}`] = true; neu.fett[`B${g}`] = true; if (fmt) neu.formate[`B${g}`] = fmt;
    } else {
      s.forEach((y, j) => { const c = Fo.nrZuSpalte(j + 1); neu.zellen[`${c}1`] = y.text; neu.fett[`${c}1`] = true; neu.breiten[c] = 130; });
      const gsp = Fo.nrZuSpalte(s.length + 1); neu.zellen[`${gsp}1`] = 'Gesamt'; neu.fett[`${gsp}1`] = true; neu.breiten[gsp] = 130;
      z.forEach((x, i) => {
        const ze = i + 2; neu.zellen[`A${ze}`] = x.text;
        s.forEach((y, j) => { const ad = `${Fo.nrZuSpalte(j + 1)}${ze}`; neu.zellen[ad] = formel([[zeilen, x], [spalten, y]]); if (fmt) neu.formate[ad] = fmt; });
        neu.zellen[`${gsp}${ze}`] = art === 'MITTELWERT' ? formel([[zeilen, x]]) : `=SUMME(B${ze}:${Fo.nrZuSpalte(s.length)}${ze})`; neu.fett[`${gsp}${ze}`] = true; if (fmt) neu.formate[`${gsp}${ze}`] = fmt;
      });
      const g = z.length + 2; neu.zellen[`A${g}`] = 'Gesamt'; neu.fett[`A${g}`] = true;
      for (let j = 1; j <= s.length + 1; j++) { const c = Fo.nrZuSpalte(j); neu.zellen[`${c}${g}`] = art === 'MITTELWERT' ? `=MITTELWERT(${c}2:${c}${g - 1})` : `=SUMME(${c}2:${c}${g - 1})`; neu.fett[`${c}${g}`] = true; if (fmt) neu.formate[`${c}${g}`] = fmt; }
    }
    return neu;
  }

  const W = { fuelle, finde, ersetzeIn, verbundVon, verdeckt, schiebeBereich, regelnAuswerten, ARTEN, versteckteZeilen, werteDerSpalte, datenEnde, pivot, LISTEN };
  if (typeof module !== 'undefined' && module.exports) module.exports = W;
  else wurzel.Werkzeug = W;
})(typeof window !== 'undefined' ? window : globalThis);
