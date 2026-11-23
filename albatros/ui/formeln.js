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
    if (typeof text === 'string' && /^-?\d+(?:,\d+)?$/.test(text)) return Number(text.replace(',', '.'));
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
      if (art === 'zahl') return wert.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (art === 'datumlang') return textFormat(wert, 'T. MMMM JJJJ');
      if (art === 'monat') return textFormat(wert, 'MMMM JJJJ');
      if (art === 'uhrzeit') return textFormat(wert, 'hh:mm');
      if (art === 'datumzeit') return textFormat(wert, 'TT.MM.JJJJ hh:mm');
      if (art && typeof art === 'object' && art.eigen) return textFormat(wert, art.eigen);
      return wert.toLocaleString('de-DE', { maximumFractionDigits: Math.abs(wert) < 1 ? 4 : 2 });
    }
    return String(wert);
  }
  // Excel-Datum (Tage seit 30.12.1899)
  const datumText = (n) => { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n + 1e-9) * 86400000); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`; };

  class Fehler { constructor(code) { this.code = code; } toString() { return this.code; } }
  const F = { wert: new Fehler('#WERT!'), div: new Fehler('#DIV/0!'), name: new Fehler('#NAME?'), bezug: new Fehler('#BEZUG!'), kreis: new Fehler('#KREIS!'), na: new Fehler('#NV'), zahl: new Fehler('#ZAHL!'), kalk: new Fehler('#KALK!'), ueberlauf: new Fehler('#ÜBERLAUF!') };

  // ---------- Zerlegen der Formel ----------
  function tokens(text) {
    const t = []; let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '"') { let j = i + 1, s = ''; while (j < text.length) { if (text[j] === '"' && text[j + 1] === '"') { s += '"'; j += 2; continue; } if (text[j] === '"') break; s += text[j++]; } t.push({ a: 'text', w: s }); i = j + 1; continue; }
      let m = /^('(?:[^']|'')+'|[A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.]*)!(\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?|\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3})(?![\w(])/.exec(text.slice(i));
      if (m) { const name = m[1].startsWith("'") ? m[1].slice(1, -1).replace(/''/g, "'") : m[1]; t.push({ a: 'bezug', w: m[2].replace(/\$/g, '').toUpperCase(), blatt: name }); i += m[0].length; continue; }
      m = /^(\d+(?:[.,]\d+)?(?:e-?\d+)?)(?![\w(])/i.exec(text.slice(i));
      if (m && !/^[A-Za-z]/.test(c)) { t.push({ a: 'zahl', w: Number(m[1].replace(',', '.')) }); i += m[1].length; continue; }
      m = /^(\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?|\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3})(?![\w(])/.exec(text.slice(i));
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
      if (x.a === 'bezug') return { ref: x.w, blatt: x.blatt };
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

  // ---------- Datum und Uhrzeit ----------
  const EPOCHE = Date.UTC(1899, 11, 30);
  const TAG_MS = 86400000;
  // "01.11.2026", "1.11.26", "2026-11-01", "14:30", "01.11.2026 14:30" → Excel-Zahl
  function datumZahl(text) {
    if (typeof text !== 'string') return null;
    const t = text.trim();
    let m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);
    let j, mo, d, zeit = 0;
    if (m) {
      d = +m[1]; mo = +m[2]; j = +m[3]; if (m[3].length === 2) j += j < 50 ? 2000 : 1900;
      if (m[4] !== undefined) { if (+m[4] > 23 || +m[5] > 59) return null; zeit = (+m[4] * 3600 + +m[5] * 60 + +(m[6] || 0)) / 86400; }
    } else if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(t))) {
      j = +m[1]; mo = +m[2]; d = +m[3]; if (m[4] !== undefined) zeit = (+m[4] * 60 + +m[5]) / 1440;
    } else if ((m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t))) {
      if (+m[1] > 23 || +m[2] > 59) return null;
      return (+m[1] * 3600 + +m[2] * 60 + +(m[3] || 0)) / 86400;
    } else return null;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const ms = Date.UTC(j, mo - 1, d);
    if (new Date(ms).getUTCDate() !== d) return null;
    return (ms - EPOCHE) / TAG_MS + zeit;
  }
  // Welche Art Datum steht im Text? (für die Anzeige ohne eigenes Format)
  function datumArt(text) {
    if (typeof text !== 'string' || datumZahl(text) === null) return null;
    if (/^\d{1,2}:\d{2}/.test(text.trim())) return 'uhrzeit';
    if (/\d:\d{2}/.test(text)) return 'datumzeit';
    return 'datum';
  }
  const alsDatum = (n) => new Date(EPOCHE + Math.round(n * TAG_MS));
  const ausDatum = (y, m, d) => (Date.UTC(y, m, d) - EPOCHE) / TAG_MS;
  const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const zwei = (n) => String(n).padStart(2, '0');

  // TEXT(1234,5; "#.##0,00 €") und TEXT(A1; "TT.MM.JJJJ")
  function textFormat(n, fmt) {
    fmt = String(fmt ?? '');
    if (fmt === '' || /^(standard|general)$/i.test(fmt)) return zeige(n);
    if (fmt === '@') return textVon(n);
    if (typeof n !== 'number') return textVon(n);
    const ohne = fmt.replace(/"[^"]*"/g, '');
    if (!/[#0]/.test(ohne) && /[TtJjDdYyhHsMm]/.test(ohne)) {
      const d = alsDatum(n); let vorher = '';
      return fmt.replace(/"([^"]*)"|TTTT|dddd|TTT|ddd|TT|dd|T|d|MMMM|mmmm|MMM|mmm|MM|M|JJJJ|yyyy|JJ|yy|hh|h|mm|m|ss|s/g, (t, lit) => {
        if (lit !== undefined) return lit;
        const alt = vorher; vorher = t;
        switch (t) {
          case 'TTTT': case 'dddd': return TAGE[d.getUTCDay()];
          case 'TTT': case 'ddd': return TAGE[d.getUTCDay()].slice(0, 2);
          case 'TT': case 'dd': return zwei(d.getUTCDate());
          case 'T': case 'd': return String(d.getUTCDate());
          case 'MMMM': case 'mmmm': return MONATE[d.getUTCMonth()];
          case 'MMM': case 'mmm': return MONATE[d.getUTCMonth()].slice(0, 3);
          case 'JJJJ': case 'yyyy': return String(d.getUTCFullYear());
          case 'JJ': case 'yy': return zwei(d.getUTCFullYear() % 100);
          case 'hh': return zwei(d.getUTCHours());
          case 'h': return String(d.getUTCHours());
          case 'ss': return zwei(d.getUTCSeconds());
          case 's': return String(d.getUTCSeconds());
          case 'mm': case 'm': if (/^h/.test(alt)) return t === 'mm' ? zwei(d.getUTCMinutes()) : String(d.getUTCMinutes()); return t === 'mm' ? zwei(d.getUTCMonth() + 1) : String(d.getUTCMonth() + 1);
          case 'MM': return zwei(d.getUTCMonth() + 1);
          case 'M': return String(d.getUTCMonth() + 1);
          default: return t;
        }
      });
    }
    // Zahlenformat
    const kern = /[#0][#0.,]*/.exec(fmt);
    if (!kern) return fmt.replace(/"/g, '');
    const k = kern[0]; let dez = 0; let tausend = false;
    const lp = k.lastIndexOf('.'), lk = k.lastIndexOf(',');
    let dezZeichen = null;
    if (lp >= 0 && lk >= 0) dezZeichen = lp > lk ? '.' : ',';
    else if (lk >= 0) dezZeichen = /,[#0]{3}$/.test(k) && !/^0,/.test(k) && k.length > 4 ? null : ',';
    else if (lp >= 0) dezZeichen = /\.[#0]{3}$/.test(k) && k.length > 4 ? null : '.';
    if (dezZeichen) { dez = k.length - k.lastIndexOf(dezZeichen) - 1; tausend = /[.,]/.test(k.slice(0, k.lastIndexOf(dezZeichen))); } else tausend = /[.,]/.test(k);
    let wert = n; if (/%/.test(fmt)) wert *= 100;
    const zahlText = Math.abs(wert).toLocaleString('de-DE', { minimumFractionDigits: dez, maximumFractionDigits: dez, useGrouping: tausend });
    const vor = fmt.slice(0, kern.index).replace(/"/g, ''); const nach = fmt.slice(kern.index + k.length).replace(/"/g, '');
    return `${wert < 0 && Math.round(Math.abs(wert) * 10 ** dez) ? '-' : ''}${vor}${zahlText}${nach}`;
  }

  // ---------- Werte umwandeln ----------
  const istFeld = Array.isArray;
  const einz = (v) => (istFeld(v) ? v.flat(Infinity)[0] ?? null : v);
  function zuZahl(v) {
    v = einz(v);
    if (v instanceof Fehler) throw v;
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') return v;
    const z = alsZahl(v); if (z !== null) return z;
    const d = datumZahl(v); if (d !== null) return d;
    throw F.wert;
  }
  function textVon(v) {
    v = einz(v);
    if (v === null || v === undefined) return '';
    if (v instanceof Fehler) throw v;
    if (typeof v === 'boolean') return v ? 'WAHR' : 'FALSCH';
    if (typeof v === 'number') return String(Math.round(v * 1e10) / 1e10).replace('.', ',');
    return String(v);
  }
  const mat = (v) => (istFeld(v) ? v : [[v]]);
  const vektor = (v) => mat(v).flat();
  // Rechnet Felder Stück für Stück (A1:A3*2, B2:B9="Miete" …)
  function breit(werte, fn) {
    if (!werte.some(istFeld)) return fn(...werte);
    const M = werte.map(mat);
    const h = Math.max(...M.map((m) => m.length)); const b = Math.max(...M.map((m) => m[0]?.length || 0));
    const el = (m, i, j) => { const r = m.length === 1 ? m[0] : m[i]; if (!r) return undefined; return r.length === 1 ? r[0] : r[j]; };
    return Array.from({ length: h }, (_, i) => Array.from({ length: b }, (__, j) => {
      const xs = M.map((m) => el(m, i, j)); if (xs.some((x) => x === undefined)) return F.na;
      try { return fn(...xs); } catch (f) { return f instanceof Fehler ? f : F.wert; }
    }));
  }
  const gleich = (a, b) => (typeof a === 'string' || typeof b === 'string' ? String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase() : a === b);
  const platzhalter = (s) => new RegExp(`^${String(s).toLowerCase().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/~\*/g, '\u0001').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\u0001/g, '\\*')}$`);
  const vergleiche = (a, b) => { if (typeof a === 'number' && typeof b === 'number') return a - b; if (typeof a === 'number') return -1; if (typeof b === 'number') return 1; return String(a ?? '').localeCompare(String(b ?? ''), 'de', { sensitivity: 'base' }); };

  // ---------- Funktionen ----------
  const flach = (werte) => werte.flat(Infinity);
  const zahlen = (werte) => flach(werte).filter((v) => typeof v === 'number');
  function kriterium(k) {
    k = einz(k);
    if (typeof k === 'number') return (v) => (typeof v === 'number' ? v : alsZahl(v) ?? datumZahl(v)) === k;
    if (typeof k === 'boolean') return (v) => v === k;
    const m = /^(<>|<=|>=|=|<|>)?(.*)$/s.exec(String(k ?? ''));
    const op = m[1] || '='; const z = alsZahl(m[2]) ?? datumZahl(m[2]); const s = m[2].toLowerCase();
    const muster = /[*?]/.test(s) ? platzhalter(s) : null;
    return (v) => {
      const vz = typeof v === 'number' ? v : (v === null || v === '' ? null : alsZahl(v) ?? datumZahl(v));
      if (z !== null && vz !== null) return { '=': vz === z, '<>': vz !== z, '<': vz < z, '>': vz > z, '<=': vz <= z, '>=': vz >= z }[op];
      const vs = String(v ?? '').toLowerCase();
      if (op === '=') return muster ? muster.test(vs) : vs === s;
      if (op === '<>') return muster ? !muster.test(vs) : vs !== s;
      if (z === null && vz === null && v !== null && v !== '') return { '<': vs < s, '>': vs > s, '<=': vs <= s, '>=': vs >= s }[op];
      return false;
    };
  }
  // Mehrere Bedingungen (…WENNS): Maske über alle Zeilen
  function maske(paare) {
    let n = null; const tests = [];
    for (let i = 0; i < paare.length; i += 2) { const b = vektor(paare[i]); if (n !== null && b.length !== n) throw F.wert; n = b.length; tests.push([b, kriterium(paare[i + 1])]); }
    return Array.from({ length: n || 0 }, (_, i) => tests.every(([b, f]) => f(b[i])));
  }
  const summe = (z) => z.reduce((x, y) => x + y, 0);
  const datumTeile = (v) => alsDatum(zuZahl(v));
  function isoWoche(n) {
    const d = alsDatum(Math.floor(n)); const tag = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - tag + 3);
    const erster = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((d - erster) / TAG_MS - 3 + ((erster.getUTCDay() + 6) % 7)) / 7);
  }
  const heuteZahl = () => { const d = new Date(); return ausDatum(d.getFullYear(), d.getMonth(), d.getDate()); };

  const FN = {
    SUMME: (a) => summe(zahlen(a)),
    MITTELWERT: (a) => { const z = zahlen(a); return z.length ? summe(z) / z.length : F.div; },
    MIN: (a) => { const z = zahlen(a); return z.length ? Math.min(...z) : 0; },
    MAX: (a) => { const z = zahlen(a); return z.length ? Math.max(...z) : 0; },
    MEDIAN: (a) => { const z = zahlen(a).sort((x, y) => x - y); if (!z.length) return F.zahl; const h = z.length >> 1; return z.length % 2 ? z[h] : (z[h - 1] + z[h]) / 2; },
    ANZAHL: (a) => zahlen(a).length,
    ANZAHL2: (a) => flach(a).filter((v) => v !== null && v !== '').length,
    ANZAHLLEEREZELLEN: (a) => flach(a).filter((v) => v === null || v === '').length,
    PRODUKT: (a) => zahlen(a).reduce((x, y) => x * y, 1),
    SUMMENPRODUKT: (a) => { const M = a.map(vektor); const n = M[0]?.length || 0; if (M.some((m) => m.length !== n)) return F.wert; let s = 0; for (let i = 0; i < n; i++) s += M.reduce((p, m) => p * (typeof m[i] === 'number' ? m[i] : typeof m[i] === 'boolean' ? +m[i] : 0), 1); return s; },
    RUNDEN: ([x, n]) => { const k = 10 ** (zuZahl(n) || 0); return Math.round(zuZahl(x) * k + Math.sign(zuZahl(x)) * 1e-9) / k; },
    AUFRUNDEN: ([x, n]) => { const k = 10 ** (zuZahl(n) || 0); const v = zuZahl(x); return Math.sign(v) * Math.ceil(Math.abs(v) * k - 1e-9) / k; },
    ABRUNDEN: ([x, n]) => { const k = 10 ** (zuZahl(n) || 0); const v = zuZahl(x); return Math.sign(v) * Math.floor(Math.abs(v) * k + 1e-9) / k; },
    GANZZAHL: ([x]) => Math.floor(zuZahl(x)),
    REST: ([x, y]) => { const a = zuZahl(x), b = zuZahl(y); if (b === 0) return F.div; return a - b * Math.floor(a / b); },
    ABS: ([x]) => Math.abs(zuZahl(x)),
    WURZEL: ([x]) => { const v = zuZahl(x); return v < 0 ? F.zahl : Math.sqrt(v); },
    POTENZ: ([x, y]) => zuZahl(x) ** zuZahl(y),
    KGRÖSSTE: ([b, k]) => { const z = zahlen([b]).sort((x, y) => y - x); const i = zuZahl(k) - 1; return i >= 0 && i < z.length ? z[i] : F.zahl; },
    KKLEINSTE: ([b, k]) => { const z = zahlen([b]).sort((x, y) => x - y); const i = zuZahl(k) - 1; return i >= 0 && i < z.length ? z[i] : F.zahl; },
    'RANG.GLEICH': ([x, b, o]) => { const v = zuZahl(x); const z = zahlen([b]); if (!z.includes(v)) return F.na; return 1 + z.filter((y) => (zuZahl(o) ? y < v : y > v)).length; },
    RANG: (a) => FN['RANG.GLEICH'](a),
    WENN: null, WENNFEHLER: null, WENNNV: null, WENNS: null, ISTFEHLER: null, ISTFEHL: null, ISTNV: null,
    UND: (a) => flach(a).filter((v) => v !== null && v !== '').every((v) => Boolean(typeof v === 'string' ? zuZahl(v) : v)),
    ODER: (a) => flach(a).filter((v) => v !== null && v !== '').some((v) => Boolean(typeof v === 'string' ? zuZahl(v) : v)),
    NICHT: ([x]) => !einz(x),
    ISTLEER: ([x]) => { x = einz(x); return x === null || x === undefined; },
    ISTZAHL: ([x]) => typeof einz(x) === 'number',
    ISTTEXT: ([x]) => typeof einz(x) === 'string',
    // Text
    VERKETTEN: (a) => flach(a).map((v) => zeige(v)).join(''),
    TEXTVERKETTEN: ([t, leer, ...rest]) => flach(rest).filter((v) => !(einz(leer) && (v === null || v === ''))).map(textVon).join(textVon(t)),
    LÄNGE: ([x]) => textVon(x).length,
    LINKS: ([t, n]) => textVon(t).slice(0, n === undefined || n === null ? 1 : Math.max(0, zuZahl(n))),
    RECHTS: ([t, n]) => { const s = textVon(t); const k = n === undefined || n === null ? 1 : Math.max(0, zuZahl(n)); return k ? s.slice(-k) : ''; },
    TEIL: ([t, a, n]) => { const s = zuZahl(a); if (s < 1) return F.wert; return textVon(t).substr(s - 1, Math.max(0, zuZahl(n))); },
    GROSS: ([t]) => textVon(t).toUpperCase(),
    KLEIN: ([t]) => textVon(t).toLowerCase(),
    GROSS2: ([t]) => textVon(t).toLowerCase().replace(/(^|[^a-zäöüß])([a-zäöüß])/g, (m, a, b) => a + b.toUpperCase()),
    GLÄTTEN: ([t]) => textVon(t).trim().replace(/ {2,}/g, ' '),
    WECHSELN: ([t, alt, neu, n]) => { const s = textVon(t), a = textVon(alt), b = textVon(neu); if (!a) return s; if (n === undefined || n === null) return s.split(a).join(b); let k = zuZahl(n), i = -1; while (k-- > 0) { i = s.indexOf(a, i + 1); if (i < 0) return s; } return s.slice(0, i) + b + s.slice(i + a.length); },
    FINDEN: ([such, t, start]) => { const i = textVon(t).indexOf(textVon(such), (start ? zuZahl(start) : 1) - 1); return i < 0 ? F.wert : i + 1; },
    SUCHEN: ([such, t, start]) => { const i = textVon(t).toLowerCase().indexOf(textVon(such).toLowerCase(), (start ? zuZahl(start) : 1) - 1); return i < 0 ? F.wert : i + 1; },
    TEXT: ([w, f]) => { w = einz(w); if (typeof w === 'string') { const z = alsZahl(w) ?? datumZahl(w); if (z === null) return w; w = z; } return textFormat(w ?? 0, textVon(f)); },
    WERT: ([t]) => { t = einz(t); if (typeof t === 'number') return t; const z = alsZahl(t) ?? datumZahl(t); return z === null ? F.wert : z; },
    // Datum
    HEUTE: () => heuteZahl(),
    JETZT: () => { const d = new Date(); return heuteZahl() + (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400; },
    DATUM: ([j, m, t]) => ausDatum(zuZahl(j), zuZahl(m) - 1, zuZahl(t)),
    ZEIT: ([h, m, s]) => ((zuZahl(h) * 3600 + zuZahl(m) * 60 + zuZahl(s)) / 86400) % 1,
    TAG: ([d]) => datumTeile(d).getUTCDate(),
    MONAT: ([d]) => datumTeile(d).getUTCMonth() + 1,
    JAHR: ([d]) => datumTeile(d).getUTCFullYear(),
    STUNDE: ([d]) => datumTeile(d).getUTCHours(),
    MINUTE: ([d]) => datumTeile(d).getUTCMinutes(),
    WOCHENTAG: ([d, typ]) => { const w = datumTeile(d).getUTCDay(); const t = typ === undefined || typ === null ? 1 : zuZahl(typ); return t === 2 ? ((w + 6) % 7) + 1 : t === 3 ? (w + 6) % 7 : w + 1; },
    ISOKALENDERWOCHE: ([d]) => isoWoche(zuZahl(d)),
    KALENDERWOCHE: ([d, typ]) => { const n = zuZahl(d); const t = typ === undefined || typ === null ? 1 : zuZahl(typ); if (t === 21) return isoWoche(n); const x = alsDatum(n); const jan1 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); const start = t === 2 ? (jan1.getUTCDay() + 6) % 7 : jan1.getUTCDay(); return Math.floor(((x - jan1) / TAG_MS + start) / 7) + 1; },
    EDATUM: ([d, m]) => { const x = datumTeile(d); const ziel = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + zuZahl(m), 1)); const letzter = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0)).getUTCDate(); return ausDatum(ziel.getUTCFullYear(), ziel.getUTCMonth(), Math.min(x.getUTCDate(), letzter)); },
    MONATSENDE: ([d, m]) => { const x = datumTeile(d); return ausDatum(x.getUTCFullYear(), x.getUTCMonth() + zuZahl(m) + 1, 0); },
    TAGE: ([e, s]) => Math.floor(zuZahl(e)) - Math.floor(zuZahl(s)),
    NETTOARBEITSTAGE: ([s, e, frei]) => { let a = Math.floor(zuZahl(s)), b = Math.floor(zuZahl(e)); const vz = a > b ? -1 : 1; if (a > b) [a, b] = [b, a]; const f = new Set(frei ? vektor(frei).filter((v) => v !== null).map((v) => Math.floor(zuZahl(v))) : []); let n = 0; for (let x = a; x <= b; x++) { const w = alsDatum(x).getUTCDay(); if (w !== 0 && w !== 6 && !f.has(x)) n++; } return n * vz; },
    // Bedingt rechnen
    SUMMEWENN: ([b, k, s]) => { const f = kriterium(k); const bb = vektor(b); const ss = s ? vektor(s) : bb; return bb.reduce((sum, v, i) => (f(v) && typeof ss[i] === 'number' ? sum + ss[i] : sum), 0); },
    ZÄHLENWENN: ([b, k]) => { const f = kriterium(k); return vektor(b).filter(f).length; },
    MITTELWERTWENN: ([b, k, s]) => { const f = kriterium(k); const bb = vektor(b); const ss = s ? vektor(s) : bb; const z = bb.map((v, i) => (f(v) && typeof ss[i] === 'number' ? ss[i] : null)).filter((v) => v !== null); return z.length ? summe(z) / z.length : F.div; },
    SUMMEWENNS: ([s, ...p]) => { const m = maske(p); const ss = vektor(s); if (ss.length !== m.length) return F.wert; return ss.reduce((x, v, i) => (m[i] && typeof v === 'number' ? x + v : x), 0); },
    ZÄHLENWENNS: (p) => maske(p).filter(Boolean).length,
    MITTELWERTWENNS: ([s, ...p]) => { const m = maske(p); const z = vektor(s).filter((v, i) => m[i] && typeof v === 'number'); return z.length ? summe(z) / z.length : F.div; },
    MAXWENNS: ([s, ...p]) => { const m = maske(p); const z = vektor(s).filter((v, i) => m[i] && typeof v === 'number'); return z.length ? Math.max(...z) : 0; },
    MINWENNS: ([s, ...p]) => { const m = maske(p); const z = vektor(s).filter((v, i) => m[i] && typeof v === 'number'); return z.length ? Math.min(...z) : 0; },
    // Geld
    RMZ: ([zins, n, bw, zw = 0]) => { zins = zuZahl(zins); n = zuZahl(n); bw = zuZahl(bw); zw = zuZahl(zw); if (!zins) return -(bw + zw) / n; const q = (1 + zins) ** n; return -(zins * (bw * q + zw)) / (q - 1); },
    // Nachschlagen
    WVERWEIS: null,
    SVERWEIS: null,
    XVERWEIS: ([such, suchM, rueck, nicht, modus]) => {
      such = einz(such); const S2 = mat(suchM); const R = mat(rueck);
      const senkrecht = S2[0].length === 1; const liste = senkrecht ? S2.map((r) => r[0]) : S2[0];
      const art = modus === undefined || modus === null ? 0 : zuZahl(modus);
      let i = -1;
      if (art === 2) { const re = platzhalter(textVon(such)); i = liste.findIndex((v) => re.test(String(v ?? '').toLowerCase())); }
      else {
        i = liste.findIndex((v) => gleich(v, such));
        if (i < 0 && (art === -1 || art === 1)) { let best = -1; liste.forEach((v, j) => { const c = vergleiche(v, such); if (v === null) return; if (art === -1 && c < 0 && (best < 0 || vergleiche(v, liste[best]) > 0)) best = j; if (art === 1 && c > 0 && (best < 0 || vergleiche(v, liste[best]) < 0)) best = j; }); i = best; }
      }
      if (i < 0) { if (nicht !== undefined && nicht !== null) return nicht; return F.na; }
      if (senkrecht) { if (!R[i]) return F.wert; return R[0].length === 1 ? R[i][0] : [R[i]]; }
      if (R[0][i] === undefined) return F.wert; return R.length === 1 ? R[0][i] : R.map((r) => [r[i]]);
    },
    INDEX: ([m, z, s]) => {
      const M = mat(m); const zz = z === undefined || z === null ? 0 : zuZahl(z);
      if (s === undefined || s === null) { if (M.length === 1) return M[0][zz - 1] === undefined ? F.bezug : M[0][zz - 1]; if (M[0].length === 1) return M[zz - 1] ? M[zz - 1][0] : F.bezug; if (!M[zz - 1]) return F.bezug; return [M[zz - 1]]; }
      const ss = zuZahl(s);
      if (zz === 0) return M[0][ss - 1] === undefined ? F.bezug : M.map((r) => [r[ss - 1]]);
      if (ss === 0) return M[zz - 1] ? [M[zz - 1]] : F.bezug;
      const v = M[zz - 1]?.[ss - 1]; return v === undefined ? F.bezug : v;
    },
    VERGLEICH: ([such, m, typ]) => {
      such = einz(such); const liste = vektor(m); const t = typ === undefined || typ === null ? 1 : zuZahl(typ);
      if (t === 0) { const re = typeof such === 'string' && /[*?]/.test(such) ? platzhalter(such) : null; const i = liste.findIndex((v) => (re ? re.test(String(v ?? '').toLowerCase()) : gleich(v, such))); return i < 0 ? F.na : i + 1; }
      let best = -1;
      liste.forEach((v, i) => { if (v === null) return; const c = vergleiche(v, such); if (t > 0 ? c <= 0 : c >= 0) best = i; });
      return best < 0 ? F.na : best + 1;
    },
    // Ergebnisse, die sich über mehrere Zellen ergießen
    EINDEUTIG: ([m]) => { const M = mat(m); const sicht = new Set(); const aus = M.filter((r) => { const k = JSON.stringify(r.map((v) => (typeof v === 'string' ? v.toLowerCase() : v))); if (sicht.has(k) || r.every((v) => v === null)) return false; sicht.add(k); return true; }); return aus.length ? aus : F.kalk; },
    FILTER: ([m, bed, leer]) => {
      const M = mat(m); const B = vektor(bed);
      const zeilenweise = B.length === M.length;
      if (!zeilenweise && B.length !== M[0].length) return F.wert;
      const ok = (i) => { const v = B[i]; if (v instanceof Fehler) throw v; return Boolean(typeof v === 'number' ? v !== 0 : v); };
      const aus = zeilenweise ? M.filter((_, i) => ok(i)) : M.map((r) => r.filter((_, j) => ok(j)));
      if (!aus.length || !aus[0].length) return leer !== undefined ? leer : F.kalk;
      return aus;
    },
    SORTIEREN: ([m, idx, ord, spaltenweise]) => {
      let M = mat(m).map((r) => [...r]); const quer = einz(spaltenweise) === true;
      if (quer) M = M[0].map((_, j) => M.map((r) => r[j]));
      const i = (idx === undefined || idx === null ? 1 : zuZahl(idx)) - 1; const r = ord === undefined || ord === null ? 1 : zuZahl(ord);
      M.sort((a, b) => vergleiche(a[i], b[i]) * (r < 0 ? -1 : 1));
      return quer ? M[0].map((_, j) => M.map((x) => x[j])) : M;
    },
    SEQUENZ: ([z, s, start, schritt]) => { const h = zuZahl(z), b = s === undefined || s === null ? 1 : zuZahl(s); const a = start === undefined || start === null ? 1 : zuZahl(start); const d = schritt === undefined || schritt === null ? 1 : zuZahl(schritt); if (h < 1 || b < 1 || h * b > 100000) return F.wert; return Array.from({ length: h }, (_, i) => Array.from({ length: b }, (__, j) => a + (i * b + j) * d)); },
    MTRANS: ([m]) => { const M = mat(m); return M[0].map((_, j) => M.map((r) => r[j])); },
  };
  // Was die Formel erklären soll (für die Formelzeile)
  const NUR_ROHE_ARGS = new Set(['SUMMENPRODUKT', 'SUMMEWENNS', 'ZÄHLENWENNS', 'MITTELWERTWENNS', 'MAXWENNS', 'MINWENNS', 'XVERWEIS', 'INDEX', 'VERGLEICH', 'EINDEUTIG', 'FILTER', 'SORTIEREN', 'MTRANS', 'TEXTVERKETTEN', 'NETTOARBEITSTAGE']);
  // Englische Namen (für .xlsx) und deutsche Namen
  const EN = { SUM: 'SUMME', AVERAGE: 'MITTELWERT', COUNT: 'ANZAHL', COUNTA: 'ANZAHL2', COUNTBLANK: 'ANZAHLLEEREZELLEN', PRODUCT: 'PRODUKT', SUMPRODUCT: 'SUMMENPRODUKT', ROUND: 'RUNDEN', ROUNDUP: 'AUFRUNDEN', ROUNDDOWN: 'ABRUNDEN', INT: 'GANZZAHL', MOD: 'REST', SQRT: 'WURZEL', POWER: 'POTENZ', LARGE: 'KGRÖSSTE', SMALL: 'KKLEINSTE', 'RANK.EQ': 'RANG.GLEICH', RANK: 'RANG', IF: 'WENN', IFERROR: 'WENNFEHLER', IFNA: 'WENNNV', IFS: 'WENNS', ISERROR: 'ISTFEHLER', ISERR: 'ISTFEHL', ISNA: 'ISTNV', ISBLANK: 'ISTLEER', ISNUMBER: 'ISTZAHL', ISTEXT: 'ISTTEXT', AND: 'UND', OR: 'ODER', NOT: 'NICHT', CONCATENATE: 'VERKETTEN', CONCAT: 'VERKETTEN', TEXTJOIN: 'TEXTVERKETTEN', LEN: 'LÄNGE', LEFT: 'LINKS', RIGHT: 'RECHTS', MID: 'TEIL', UPPER: 'GROSS', LOWER: 'KLEIN', PROPER: 'GROSS2', TRIM: 'GLÄTTEN', SUBSTITUTE: 'WECHSELN', FIND: 'FINDEN', SEARCH: 'SUCHEN', VALUE: 'WERT', TODAY: 'HEUTE', NOW: 'JETZT', DATE: 'DATUM', TIME: 'ZEIT', DAY: 'TAG', MONTH: 'MONAT', YEAR: 'JAHR', HOUR: 'STUNDE', WEEKDAY: 'WOCHENTAG', WEEKNUM: 'KALENDERWOCHE', ISOWEEKNUM: 'ISOKALENDERWOCHE', EDATE: 'EDATUM', EOMONTH: 'MONATSENDE', DAYS: 'TAGE', NETWORKDAYS: 'NETTOARBEITSTAGE', SUMIF: 'SUMMEWENN', COUNTIF: 'ZÄHLENWENN', AVERAGEIF: 'MITTELWERTWENN', SUMIFS: 'SUMMEWENNS', COUNTIFS: 'ZÄHLENWENNS', AVERAGEIFS: 'MITTELWERTWENNS', MAXIFS: 'MAXWENNS', MINIFS: 'MINWENNS', PMT: 'RMZ', VLOOKUP: 'SVERWEIS', HLOOKUP: 'WVERWEIS', XLOOKUP: 'XVERWEIS', MATCH: 'VERGLEICH', UNIQUE: 'EINDEUTIG', SORT: 'SORTIEREN', SEQUENCE: 'SEQUENZ', TRANSPOSE: 'MTRANS', MIN: 'MIN', MAX: 'MAX', ABS: 'ABS', MEDIAN: 'MEDIAN', TEXT: 'TEXT', INDEX: 'INDEX', FILTER: 'FILTER', MINUTE: 'MINUTE' };
  const DE = Object.fromEntries(Object.entries(EN).filter(([e]) => !['CONCAT', 'RANK'].includes(e)).map(([e, d]) => [d, e]));
  DE.RANG = 'RANK';
  // Neue Excel-Funktionen brauchen in der Datei einen Vorsatz
  const XLFN = { XLOOKUP: '_xlfn.XLOOKUP', IFS: '_xlfn.IFS', MAXIFS: '_xlfn.MAXIFS', MINIFS: '_xlfn.MINIFS', TEXTJOIN: '_xlfn.TEXTJOIN', IFNA: '_xlfn.IFNA', DAYS: '_xlfn.DAYS', ISOWEEKNUM: '_xlfn.ISOWEEKNUM', UNIQUE: '_xlfn.UNIQUE', SEQUENCE: '_xlfn.SEQUENCE', FILTER: '_xlfn._xlws.FILTER', SORT: '_xlfn._xlws.SORT', 'RANK.EQ': '_xlfn.RANK.EQ' };
  const norm = (n) => String(n).toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS');
  const NORM = {}; for (const k of Object.keys(FN)) NORM[norm(k)] = k;
  const fnName = (n) => { n = String(n).toUpperCase().replace(/^_XLFN\.(_XLWS\.)?/, ''); if (FN[n] !== undefined) return n; if (EN[n]) return EN[n]; return NORM[norm(n)] || n; };
  const FUNKTIONEN = Object.keys(FN);

  // ---------- Blatt rechnen ----------
  // Bäume merken: dieselbe Formel wird nur einmal zerlegt (schnell bei großen Tabellen)
  const baumSpeicher = new Map();
  function baumVon(text) {
    let b = baumSpeicher.get(text);
    if (!b) { try { b = { b: baum(text) }; } catch (f) { b = { f: f instanceof Fehler ? f : F.wert }; } if (baumSpeicher.size > 50000) baumSpeicher.clear(); baumSpeicher.set(text, b); }
    if (b.f) throw b.f;
    return b.b;
  }
  // Formeln, die mehr als eine Zelle füllen können
  const KANN_FELD = /(EINDEUTIG|UNIQUE|FILTER|SORTIEREN|SORT|SEQUENZ|SEQUENCE|MTRANS|TRANSPOSE|XVERWEIS|XLOOKUP|INDEX)\s*\(|\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+\s*\)?\s*[-+*/^&=<>]|[-+*/^&=<>]\s*\(?\s*\$?[A-Z]{1,3}\$?\d+:|^=\s*\(?\s*\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+\s*\)?\s*$/i;

  // blatt = { zellen: { A1: 'Text' | '12,5' | '=SUMME(A1:A3)' } }
  function rechner(blatt, mappe = null) {
    const cache = new Map(); const laeuft = new Set();
    const ueber = new Map(); // Zelle → { quelle, wert } bei Ergebnissen über mehrere Zellen
    let ueberBereit = false; let maxZe = null;
    function ueberlaufVorbereiten() {
      if (ueberBereit) return; ueberBereit = true;
      const z = blatt.zellen;
      for (const a in z) { const roh = z[a]; if (typeof roh === 'string' && roh.charCodeAt(0) === 61 && roh.length > 6 && (roh.includes(':') || roh.includes('(')) && KANN_FELD.test(roh)) wert(a); }
    }
    function wert(a) {
      if (cache.has(a)) return cache.get(a);
      const roh = blatt.zellen[a];
      if (roh === undefined || roh === null || roh === '') { ueberlaufVorbereiten(); const u = ueber.get(a); return u ? u.wert : null; }
      if (laeuft.has(a)) return F.kreis;
      let w;
      if (typeof roh === 'string' && roh.startsWith('=')) {
        laeuft.add(a);
        try { w = auswerten(baumVon(roh.slice(1))); } catch (f) { w = f instanceof Fehler ? f : F.wert; }
        laeuft.delete(a);
        if (istFeld(w)) w = verteile(a, w);
      } else if (blatt.formate?.[a] === 'text') w = String(roh);
      else {
        const z = alsZahl(roh);
        if (z !== null) w = z;
        else { const d = datumZahl(roh); w = d !== null ? d : String(roh); }
      }
      cache.set(a, w);
      return w;
    }
    function verteile(a, M) {
      const h = M.length, b = M[0]?.length || 0;
      if (h * b <= 1) return M[0]?.[0] ?? null;
      if (h * b > 200000) return F.wert;
      const z = zerlege(a); const ziele = [];
      for (let i = 0; i < h; i++) for (let j = 0; j < b; j++) {
        if (!i && !j) continue;
        const t = adresse(z.sp + j, z.ze + i); const r = blatt.zellen[t];
        if ((r !== undefined && r !== null && r !== '') || (ueber.has(t) && ueber.get(t).quelle !== a)) return F.ueberlauf;
        ziele.push([t, M[i][j]]);
      }
      for (const [t, v] of ziele) ueber.set(t, { quelle: a, wert: v === undefined ? null : v });
      return M[0][0] ?? null;
    }
    function hoehe() { if (maxZe === null) { maxZe = 0; for (const k of Object.keys(blatt.zellen)) { const z = zerlege(k); if (z && z.ze > maxZe) maxZe = z.ze; } } return maxZe; }
    function feld(text) {
      let b = bereich(text);
      if (!b) { const m = /^([A-Z]{1,3}):([A-Z]{1,3})$/.exec(text); if (m) { const x = spalteZuNr(m[1]), y = spalteZuNr(m[2]); b = { sp1: Math.min(x, y), sp2: Math.max(x, y), ze1: 0, ze2: hoehe() }; } }
      if (!b) throw F.bezug;
      const zeilen = [];
      for (let ze = b.ze1; ze <= b.ze2; ze++) { const z = []; for (let sp = b.sp1; sp <= b.sp2; sp++) z.push(wert(adresse(sp, ze))); zeilen.push(z); }
      return zeilen;
    }
    const versuch = (x) => { try { return auswerten(x); } catch (f) { if (f instanceof Fehler) return f; throw f; } };
    const hatFehler = (v) => (istFeld(v) ? flach(v).some((x) => x instanceof Fehler) : v instanceof Fehler);
    function auswerten(k) {
      if ('w' in k) return k.w;
      if (k.ref) {
        let r = { wert, feld };
        if (k.blatt && k.blatt.toLowerCase() !== String(blatt.name || '').toLowerCase()) { r = mappe ? mappe(k.blatt) : null; if (!r) throw F.bezug; }
        if (k.ref.includes(':')) return r.feld(k.ref); const v = r.wert(k.ref); if (v instanceof Fehler) throw v; return v;
      }
      if (k.fn) {
        const n = fnName(k.fn);
        if (n === 'WENN') {
          const b = auswerten(k.args[0]);
          if (istFeld(b) && flach(b).length > 1) { const ja = k.args[1] ? versuch(k.args[1]) : true; const nein = k.args[2] ? versuch(k.args[2]) : false; return breit([b, ja, nein], (x, j, n2) => { if (x instanceof Fehler) throw x; return (typeof x === 'string' ? zuZahl(x) : x) ? (j ?? 0) : (n2 ?? 0); }); }
          const ja = einz(b); if (ja instanceof Fehler) throw ja;
          const wahr = typeof ja === 'string' ? zuZahl(ja) : ja;
          const ziel = wahr && wahr !== 0 ? k.args[1] : k.args[2];
          return ziel ? (auswerten(ziel) ?? 0) : (wahr ? true : false);
        }
        if (n === 'WENNFEHLER' || n === 'WENNNV') {
          const v = versuch(k.args[0]); const trifft = (x) => x instanceof Fehler && (n === 'WENNFEHLER' || x === F.na);
          if (!hatFehler(v)) return v;
          const alt = k.args[1] ? (auswerten(k.args[1]) ?? '') : '';
          if (istFeld(v)) return v.map((r) => r.map((x) => (trifft(x) ? einz(alt) : x)));
          if (trifft(v)) return alt; throw v;
        }
        if (n === 'ISTFEHLER' || n === 'ISTFEHL' || n === 'ISTNV') {
          const v = versuch(k.args[0]); const t = (x) => x instanceof Fehler && (n === 'ISTFEHLER' || (n === 'ISTFEHL' ? x !== F.na : x === F.na));
          return istFeld(v) ? v.map((r) => r.map(t)) : t(v);
        }
        if (n === 'WENNS') {
          for (let i = 0; i + 1 < k.args.length; i += 2) { const b = einz(auswerten(k.args[i])); if (b instanceof Fehler) throw b; if (typeof b === 'string' ? zuZahl(b) : b) return auswerten(k.args[i + 1]) ?? 0; }
          throw F.na;
        }
        if (n === 'SVERWEIS' || n === 'WVERWEIS') {
          const such = einz(auswerten(k.args[0])); const tab = mat(auswerten(k.args[1])); const idx = zuZahl(auswerten(k.args[2])) - 1;
          const genau = k.args[3] ? !einz(auswerten(k.args[3])) : false;
          const zeilen = n === 'SVERWEIS' ? tab : tab[0].map((_, i) => tab.map((r) => r[i]));
          if (idx < 0) throw F.wert; if (zeilen[0] && idx >= zeilen[0].length) throw F.bezug;
          let treffer = zeilen.find((r) => gleich(r[0], such));
          if (!treffer && typeof such === 'string' && /[*?]/.test(such)) { const re = platzhalter(such); treffer = zeilen.find((r) => re.test(String(r[0] ?? '').toLowerCase())); }
          if (!treffer && !genau) { let best = null; for (const r of zeilen) { if (r[0] === null) continue; if (vergleiche(r[0], such) <= 0) best = r; else break; } treffer = best; }
          if (!treffer) throw F.na; return treffer[idx] ?? null;
        }
        const f = FN[n]; if (!f) throw F.name;
        const args = k.args.map((x) => (x && 'w' in x && x.w === null ? null : auswerten(x)));
        if (!NUR_ROHE_ARGS.has(n) && n !== 'ISTLEER') for (const a of flach(args)) if (a instanceof Fehler) throw a;
        const r = f(args);
        if (r instanceof Fehler) throw r;
        return r;
      }
      if (k.o === 'neg') return breit([auswerten(k.l)], (x) => -zuZahl(x));
      if (k.o === '%') return breit([auswerten(k.l)], (x) => zuZahl(x) / 100);
      const l = auswerten(k.l); const r = auswerten(k.r);
      return breit([l, r], (a, b) => op(k.o, a, b));
    }
    return { wert, feld, ueber };
  }
  function op(o, l, r) {
    switch (o) {
      case '+': return zuZahl(l) + zuZahl(r);
      case '-': return zuZahl(l) - zuZahl(r);
      case '*': return zuZahl(l) * zuZahl(r);
      case '/': { const d = zuZahl(r); if (d === 0) throw F.div; return zuZahl(l) / d; }
      case '^': return zuZahl(l) ** zuZahl(r);
      case '&': return zeige(l) + zeige(r);
      default: {
        if (l instanceof Fehler) throw l; if (r instanceof Fehler) throw r;
        const leer = (x) => x === null || x === undefined;
        let a = leer(l) ? (typeof r === 'string' ? '' : 0) : l; let b = leer(r) ? (typeof l === 'string' ? '' : 0) : r;
        if (typeof a === 'string' && typeof b === 'number') { const z = datumZahl(a); if (z !== null) a = z; }
        if (typeof b === 'string' && typeof a === 'number') { const z = datumZahl(b); if (z !== null) b = z; }
        if (typeof a === 'string') a = a.toLowerCase(); if (typeof b === 'string') b = b.toLowerCase();
        return { '=': a === b, '<>': a !== b, '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b }[o];
      }
    }
  }

  // Mehrere Blätter: Bezüge wie 'Datenbank'!B11 gehen über die Mappe
  function mappe(blaetter) {
    const cache = new Map();
    const hol = (name) => {
      const b = (blaetter || []).find((x) => String(x.name).toLowerCase() === String(name).toLowerCase());
      if (!b) return null;
      if (!cache.has(b)) cache.set(b, rechner(b, hol));
      return cache.get(b);
    };
    return hol;
  }
  // Alle Werte eines Blatts
  function rechneAlles(blatt, m = null) {
    const r = (m && m(blatt.name)) || rechner(blatt, m); const aus = {};
    for (const a of Object.keys(blatt.zellen)) aus[a] = r.wert(a);
    for (const [a, u] of r.ueber) if (!(a in aus)) aus[a] = u.wert;
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
      if (m) { const n = fnName(m[1].toUpperCase()); const e = DE[n] || n; aus += `${XLFN[e] || e}(`; i += m[0].length; continue; }
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
      if (m) { const n = m[1].toUpperCase().replace(/^_XLFN\.(_XLWS\.)?/, ''); aus += `${EN[n] || n}(`; i += m[0].length; continue; }
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

  const A = { FN, FUNKTIONEN, fnName, datumZahl, datumArt, textFormat, textVon, zuZahl, ausDatum, alsDatum, mappe, spalteZuNr, nrZuSpalte, adresse, zerlege, bereich, alsZahl, zeige, rechner, rechneAlles, nachExcel, vonExcel, verschiebe, Fehler, datumText };
  if (typeof module !== 'undefined' && module.exports) module.exports = A;
  else wurzel.Formeln = A;
})(typeof window !== 'undefined' ? window : globalThis);
