'use strict';
// Albatros – Rechenmaschine für Tabellen.
// Formeln wie in deutschem Excel: =SUMME(E2:E13); Dezimalkomma; Trenner ";".
// Läuft im Fenster und in Node (Tests, Datei-Umwandlung).
(function (wurzel) {
  // ---------- Adressen ----------
  const spalteZuNr = (s) => s.toUpperCase().split('').reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;
  const nrZuSpalte = (n) => { let s = ''; n += 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const adresse = (sp, ze) => `${nrZuSpalte(sp)}${ze + 1}`;
  function zerlege(a) {
    const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(String(a).trim());
    return m ? { sp: spalteZuNr(m[1]), ze: Number(m[2]) - 1 } : null;
  }
  function bereich(text) {
    const [a, b] = String(text).split(':');
    const x = zerlege(a), y = zerlege(b || a);
    if (!x || !y) return null;
    return { sp1: Math.min(x.sp, y.sp), ze1: Math.min(x.ze, y.ze), sp2: Math.max(x.sp, y.sp), ze2: Math.max(x.ze, y.ze) };
  }

  // ---------- Zahlen lesen und zeigen ----------
  function alsZahl(text) {
    if (typeof text === 'number') return text;
    let t = String(text ?? '').trim().replace(/\s|€|EUR/gi, '');
    if (!t) return null;
    let prozent = false;
    if (t.endsWith('%')) { prozent = true; t = t.slice(0, -1); }
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d+,\d+$/.test(t)) t = t.replace(',', '.');
    else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '');
    if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(t)) return null;
    const n = Number(t);
    return prozent ? n / 100 : n;
  }
  function zeige(wert, art) {
    if (wert === null || wert === undefined || wert === '') return '';
    if (wert instanceof Fehler) return wert.code;
    if (typeof wert === 'boolean') return wert ? 'WAHR' : 'FALSCH';
    if (typeof wert === 'number') {
      if (!Number.isFinite(wert)) return '#ZAHL!';
      if (art === 'eur') return `${wert.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
      if (art === 'prozent') return `${(wert * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
      if (art === 'ganz') return Math.round(wert).toLocaleString('de-DE');
      if (art === 'datum') return datumText(wert);
      return wert.toLocaleString('de-DE', { maximumFractionDigits: Math.abs(wert) < 1 ? 4 : 2 });
    }
    return String(wert);
  }
  // Excel-Datum (Tage seit 30.12.1899)
  const datumText = (n) => { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000); return d.toLocaleDateString('de-DE', { timeZone: 'UTC' }); };

  class Fehler { constructor(code) { this.code = code; } toString() { return this.code; } }
  const F = { wert: new Fehler('#WERT!'), div: new Fehler('#DIV/0!'), name: new Fehler('#NAME?'), bezug: new Fehler('#BEZUG!'), kreis: new Fehler('#KREIS!'), na: new Fehler('#NV') };

  // ---------- Zerlegen der Formel ----------
  function tokens(text) {
    const t = []; let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '"') { let j = i + 1, s = ''; while (j < text.length) { if (text[j] === '"' && text[j + 1] === '"') { s += '"'; j += 2; continue; } if (text[j] === '"') break; s += text[j++]; } t.push({ a: 'text', w: s }); i = j + 1; continue; }
      let m = /^(\d+(?:[.,]\d+)?(?:e-?\d+)?)(?![\w(])/i.exec(text.slice(i));
      if (m && !/^[A-Za-z]/.test(c)) { t.push({ a: 'zahl', w: Number(m[1].replace(',', '.')) }); i += m[1].length; continue; }
      m = /^(\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?)(?![\w(])/.exec(text.slice(i));
      if (m) { t.push({ a: 'bezug', w: m[1].replace(/\$/g, '').toUpperCase() }); i += m[1].length; continue; }
      m = /^([A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.]*)\s*\(/.exec(text.slice(i));
      if (m) { t.push({ a: 'fn', w: m[1].toUpperCase() }); i += m[0].length; continue; }
      m = /^(WAHR|FALSCH|TRUE|FALSE)(?![\w(])/i.exec(text.slice(i));
      if (m) { t.push({ a: 'bool', w: /^(WAHR|TRUE)$/i.test(m[1]) }); i += m[1].length; continue; }
      m = /^(<>|<=|>=|[-+*/^&=<>%(),;])/.exec(text.slice(i));
      if (m) { t.push({ a: 'op', w: m[1] === ',' ? ';' : m[1] }); i += m[1].length; continue; }
      throw F.name;
    }
    return t;
  }

  // Ausdruck → Baum (Rangfolge: Vergleich < & < +- < */ < ^ < Vorzeichen < %)
  function baum(text) {
    const t = tokens(text); let p = 0;
    const sieh = () => t[p]; const nimm = () => t[p++];
    const ist = (w) => t[p] && t[p].a === 'op' && t[p].w === w;
    function vergleich() { let l = verkettung(); while (t[p] && t[p].a === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(t[p].w)) { const o = nimm().w; l = { o, l, r: verkettung() }; } return l; }
    function verkettung() { let l = summe(); while (ist('&')) { nimm(); l = { o: '&', l, r: summe() }; } return l; }
    function summe() { let l = produkt(); while (ist('+') || ist('-')) { const o = nimm().w; l = { o, l, r: produkt() }; } return l; }
    function produkt() { let l = potenz(); while (ist('*') || ist('/')) { const o = nimm().w; l = { o, l, r: potenz() }; } return l; }
    function potenz() { let l = vorzeichen(); while (ist('^')) { nimm(); l = { o: '^', l, r: vorzeichen() }; } return l; }
    function vorzeichen() { if (ist('-')) { nimm(); return { o: 'neg', l: vorzeichen() }; } if (ist('+')) { nimm(); return vorzeichen(); } return prozent(); }
    function prozent() { let l = einzeln(); while (ist('%')) { nimm(); l = { o: '%', l }; } return l; }
    function einzeln() {
      const x = nimm();
      if (!x) throw F.wert;
      if (x.a === 'zahl' || x.a === 'text' || x.a === 'bool') return { w: x.w };
      if (x.a === 'bezug') return { ref: x.w };
      if (x.a === 'op' && x.w === '(') { const e = vergleich(); if (!ist(')')) throw F.wert; nimm(); return e; }
      if (x.a === 'fn') {
        const args = [];
        if (ist(')')) { nimm(); return { fn: x.w, args }; }
        for (;;) {
          if (ist(';')) { args.push({ w: null }); nimm(); continue; }
          args.push(vergleich());
          if (ist(';')) { nimm(); if (ist(')')) { args.push({ w: null }); } continue; }
          if (ist(')')) { nimm(); break; }
          throw F.wert;
        }
        return { fn: x.w, args };
      }
      throw F.wert;
    }
    const e = vergleich();
    if (p < t.length) throw F.wert;
    return e;
  }

  // ---------- Funktionen ----------
  const flach = (werte) => werte.flat(Infinity);
  const zahlen = (werte) => flach(werte).filter((v) => typeof v === 'number');
  function kriterium(k) {
    if (typeof k === 'number') return (v) => v === k;
    const m = /^(<>|<=|>=|=|<|>)?(.*)$/.exec(String(k));
    const op = m[1] || '='; const z = alsZahl(m[2]); const s = m[2].toLowerCase();
    return (v) => {
      const vz = typeof v === 'number' ? v : alsZahl(v);
      if (z !== null && vz !== null) return { '=': vz === z, '<>': vz !== z, '<': vz < z, '>': vz > z, '<=': vz <= z, '>=': vz >= z }[op];
      const vs = String(v ?? '').toLowerCase();
      if (op === '=') return s.includes('*') ? new RegExp(`^${s.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(vs) : vs === s;
      if (op === '<>') return vs !== s;
      return false;
    };
  }
  const FN = {
    SUMME: (a) => zahlen(a).reduce((x, y) => x + y, 0),
    MITTELWERT: (a) => { const z = zahlen(a); return z.length ? z.reduce((x, y) => x + y, 0) / z.length : F.div; },
    MIN: (a) => { const z = zahlen(a); return z.length ? Math.min(...z) : 0; },
    MAX: (a) => { const z = zahlen(a); return z.length ? Math.max(...z) : 0; },
    ANZAHL: (a) => zahlen(a).length,
    ANZAHL2: (a) => flach(a).filter((v) => v !== null && v !== '').length,
    PRODUKT: (a) => zahlen(a).reduce((x, y) => x * y, 1),
    RUNDEN: ([x, n]) => { const k = 10 ** (Number(n) || 0); return Math.round(Number(x) * k) / k; },
    AUFRUNDEN: ([x, n]) => { const k = 10 ** (Number(n) || 0); return Math.ceil(Number(x) * k) / k; },
    ABRUNDEN: ([x, n]) => { const k = 10 ** (Number(n) || 0); return Math.floor(Number(x) * k) / k; },
    ABS: ([x]) => Math.abs(Number(x)),
    WURZEL: ([x]) => (x < 0 ? F.wert : Math.sqrt(x)),
    POTENZ: ([x, y]) => Number(x) ** Number(y),
    WENN: null, // eigene Auswertung (nur der passende Zweig)
    UND: (a) => flach(a).every(Boolean),
    ODER: (a) => flach(a).some(Boolean),
    NICHT: ([x]) => !x,
    VERKETTEN: (a) => flach(a).map((v) => zeige(v)).join(''),
    LÄNGE: ([x]) => String(x ?? '').length,
    HEUTE: () => Math.floor((Date.now() - Date.UTC(1899, 11, 30)) / 86400000),
    SUMMEWENN: ([b, k, s]) => { const f = kriterium(Array.isArray(k) ? k[0] : k); const bb = flach([b]); const ss = s ? flach([s]) : bb; return bb.reduce((sum, v, i) => (f(v) && typeof ss[i] === 'number' ? sum + ss[i] : sum), 0); },
    ZÄHLENWENN: ([b, k]) => { const f = kriterium(k); return flach([b]).filter(f).length; },
    MITTELWERTWENN: ([b, k, s]) => { const f = kriterium(k); const bb = flach([b]); const ss = s ? flach([s]) : bb; const z = bb.map((v, i) => (f(v) && typeof ss[i] === 'number' ? ss[i] : null)).filter((v) => v !== null); return z.length ? z.reduce((x, y) => x + y, 0) / z.length : F.div; },
    // Ratenkredit: RMZ(Zins; Zeiträume; Barwert)
    RMZ: ([zins, n, bw, zw = 0]) => { zins = Number(zins); n = Number(n); bw = Number(bw); if (!zins) return -(bw + zw) / n; const q = (1 + zins) ** n; return -(zins * (bw * q + zw)) / (q - 1); },
    WVERWEIS: null,
    SVERWEIS: null,
  };
  // Englische Namen (für .xlsx) und deutsche Namen
  const EN = { SUM: 'SUMME', AVERAGE: 'MITTELWERT', COUNT: 'ANZAHL', COUNTA: 'ANZAHL2', PRODUCT: 'PRODUKT', ROUND: 'RUNDEN', ROUNDUP: 'AUFRUNDEN', ROUNDDOWN: 'ABRUNDEN', SQRT: 'WURZEL', POWER: 'POTENZ', IF: 'WENN', AND: 'UND', OR: 'ODER', NOT: 'NICHT', CONCATENATE: 'VERKETTEN', CONCAT: 'VERKETTEN', LEN: 'LÄNGE', TODAY: 'HEUTE', SUMIF: 'SUMMEWENN', COUNTIF: 'ZÄHLENWENN', AVERAGEIF: 'MITTELWERTWENN', PMT: 'RMZ', VLOOKUP: 'SVERWEIS', HLOOKUP: 'WVERWEIS', MIN: 'MIN', MAX: 'MAX', ABS: 'ABS' };
  const DE = Object.fromEntries(Object.entries(EN).map(([e, d]) => [d, e]));
  const fnName = (n) => (FN[n] !== undefined ? n : EN[n] || (n === 'ZAEHLENWENN' ? 'ZÄHLENWENN' : n === 'LAENGE' ? 'LÄNGE' : n));

  // ---------- Blatt rechnen ----------
  // blatt = { zellen: { A1: 'Text' | '12,5' | '=SUMME(A1:A3)' } }
  function rechner(blatt) {
    const cache = new Map(); const laeuft = new Set();
    function wert(a) {
      if (cache.has(a)) return cache.get(a);
      if (laeuft.has(a)) return F.kreis;
      const roh = blatt.zellen[a];
      let w;
      if (roh === undefined || roh === null || roh === '') w = null;
      else if (typeof roh === 'string' && roh.startsWith('=')) {
        laeuft.add(a);
        try { w = auswerten(baum(roh.slice(1))); } catch (f) { w = f instanceof Fehler ? f : F.wert; }
        laeuft.delete(a);
        if (Array.isArray(w)) w = w.flat(Infinity)[0] ?? null;
      } else {
        const z = alsZahl(roh);
        w = z !== null ? z : String(roh);
      }
      cache.set(a, w);
      return w;
    }
    function feld(text) {
      const b = bereich(text); if (!b) throw F.bezug;
      const zeilen = [];
      for (let ze = b.ze1; ze <= b.ze2; ze++) { const z = []; for (let sp = b.sp1; sp <= b.sp2; sp++) z.push(wert(adresse(sp, ze))); zeilen.push(z); }
      return zeilen;
    }
    const zahl = (v) => { if (v instanceof Fehler) throw v; if (v === null || v === '') return 0; if (typeof v === 'boolean') return v ? 1 : 0; if (typeof v === 'number') return v; const z = alsZahl(v); if (z === null) throw F.wert; return z; };
    function auswerten(k) {
      if ('w' in k) return k.w;
      if (k.ref) { if (k.ref.includes(':')) return feld(k.ref); const v = wert(k.ref); if (v instanceof Fehler) throw v; return v; }
      if (k.fn) {
        const n = fnName(k.fn);
        if (n === 'WENN') { const b = auswerten(k.args[0]); const ja = Array.isArray(b) ? b.flat()[0] : b; const ziel = ja && ja !== 0 ? k.args[1] : k.args[2]; return ziel ? (auswerten(ziel) ?? 0) : (ja ? true : false); }
        if (n === 'SVERWEIS' || n === 'WVERWEIS') {
          const such = auswerten(k.args[0]); const tab = auswerten(k.args[1]); const idx = zahl(auswerten(k.args[2])) - 1;
          const genau = k.args[3] ? !auswerten(k.args[3]) : false;
          const zeilen = n === 'SVERWEIS' ? tab : tab[0].map((_, i) => tab.map((r) => r[i]));
          const treffer = zeilen.find((r) => (genau ? String(r[0]).toLowerCase() === String(such).toLowerCase() : String(r[0]).toLowerCase() === String(such).toLowerCase() || r[0] === such));
          if (!treffer) throw F.na; return treffer[idx] ?? null;
        }
        const f = FN[n]; if (!f) throw F.name;
        const args = k.args.map((x) => auswerten(x));
        for (const a of flach(args)) if (a instanceof Fehler) throw a;
        const nurZahlen = ['RUNDEN', 'AUFRUNDEN', 'ABRUNDEN', 'ABS', 'WURZEL', 'POTENZ', 'RMZ'];
        const r = f(nurZahlen.includes(n) ? args.map((a) => zahl(Array.isArray(a) ? a.flat()[0] : a)) : args);
        if (r instanceof Fehler) throw r;
        return r;
      }
      if (k.o === 'neg') return -zahl(einz(auswerten(k.l)));
      if (k.o === '%') return zahl(einz(auswerten(k.l))) / 100;
      const l = einz(auswerten(k.l)); const r = einz(auswerten(k.r));
      switch (k.o) {
        case '+': return zahl(l) + zahl(r);
        case '-': return zahl(l) - zahl(r);
        case '*': return zahl(l) * zahl(r);
        case '/': { const d = zahl(r); if (d === 0) throw F.div; return zahl(l) / d; }
        case '^': return zahl(l) ** zahl(r);
        case '&': return zeige(l) + zeige(r);
        default: {
          const a = typeof l === 'string' ? l.toLowerCase() : l; const b = typeof r === 'string' ? r.toLowerCase() : r;
          return { '=': a === b, '<>': a !== b, '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b }[k.o];
        }
      }
    }
    const einz = (v) => (Array.isArray(v) ? v.flat(Infinity)[0] ?? null : v);
    return { wert, feld };
  }

  // Alle Werte eines Blatts
  function rechneAlles(blatt) {
    const r = rechner(blatt); const aus = {};
    for (const a of Object.keys(blatt.zellen)) aus[a] = r.wert(a);
    return aus;
  }

  // ---------- Umwandeln für Excel-Dateien ----------
  // deutsch → englisch: SUMME(A1;B2) → SUM(A1,B2), 0,19 → 0.19
  function nachExcel(formel) {
    if (!formel.startsWith('=')) return formel;
    let aus = ''; let i = 1; const t = formel;
    while (i < t.length) {
      if (t[i] === '"') { const j = t.indexOf('"', i + 1); aus += t.slice(i, j + 1); i = j + 1; if (j < 0) break; continue; }
      const m = /^([A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.]*)\(/.exec(t.slice(i));
      if (m) { const n = fnName(m[1].toUpperCase()); aus += `${DE[n] || n}(`; i += m[0].length; continue; }
      const z = /^\d+,\d+/.exec(t.slice(i));
      if (z && !/[A-Za-z]$/.test(aus)) { aus += z[0].replace(',', '.'); i += z[0].length; continue; }
      aus += t[i] === ';' ? ',' : t[i]; i++;
    }
    return `=${aus}`;
  }
  // englisch → deutsch (aus .xlsx)
  function vonExcel(formel) {
    let aus = ''; let i = 0; const t = formel.replace(/^=/, '');
    while (i < t.length) {
      if (t[i] === '"') { const j = t.indexOf('"', i + 1); aus += t.slice(i, j + 1); i = j + 1; if (j < 0) break; continue; }
      const m = /^([A-Za-z_][\w.]*)\(/.exec(t.slice(i));
      if (m) { const n = m[1].toUpperCase().replace(/^_XLFN\./, ''); aus += `${EN[n] || n}(`; i += m[0].length; continue; }
      const z = /^\d+\.\d+/.exec(t.slice(i));
      if (z && !/[A-Za-z]$/.test(aus)) { aus += z[0].replace('.', ','); i += z[0].length; continue; }
      aus += t[i] === ',' ? ';' : t[i]; i++;
    }
    return `=${aus}`;
  }

  // Formel verschieben (beim Kopieren/Einfügen): A1 → B2 usw.
  function verschiebe(formel, dsp, dze) {
    if (!String(formel).startsWith('=')) return formel;
    return formel.replace(/("[^"]*")|(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(])/g, (m, s, d1, sp, d2, ze) => {
      if (s) return s;
      const nsp = d1 ? spalteZuNr(sp) : spalteZuNr(sp) + dsp;
      const nze = d2 ? Number(ze) - 1 : Number(ze) - 1 + dze;
      if (nsp < 0 || nze < 0) return '#BEZUG!';
      return `${d1}${nrZuSpalte(nsp)}${d2}${nze + 1}`;
    });
  }

  const A = { spalteZuNr, nrZuSpalte, adresse, zerlege, bereich, alsZahl, zeige, rechner, rechneAlles, nachExcel, vonExcel, verschiebe, Fehler, datumText };
  if (typeof module !== 'undefined' && module.exports) module.exports = A;
  else wurzel.Formeln = A;
})(typeof window !== 'undefined' ? window : globalThis);
