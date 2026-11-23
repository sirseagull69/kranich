'use strict';
// Albatros – Makros laufen hier, abgeschottet in einem eigenen Arbeiter:
// kein Zugriff auf Dateien, Netz oder das Fenster – nur auf eine Kopie der Tabelle.
importScripts('formeln.js');
const Fo = self.Formeln;

// Alles abklemmen, was nach draußen führt
for (const n of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'Worker', 'SharedWorker', 'indexedDB', 'caches', 'BroadcastChannel', 'WebTransport', 'navigator']) {
  for (let o = Object.getPrototypeOf(self); o; o = Object.getPrototypeOf(o)) { try { delete o[n]; } catch { /* egal */ } }
  try { Object.defineProperty(self, n, { value: undefined, writable: false, configurable: false }); } catch { try { self[n] = undefined; } catch { /* egal */ } }
}
// Zusätzlich sperrt das Hauptprogramm jede Netzverbindung aus dem Fenster.

class MakroFehler extends Error {}

function api(daten) {
  const blaetter = daten.blaetter;
  let nr = daten.blattNr || 0;
  let r = null; // Rechner, wird nach Änderungen neu gebaut
  const meldungen = [];
  let schritte = 0;
  const b = () => blaetter[nr];
  const neu = () => { r = null; if (++schritte > 2000000) throw new MakroFehler('Zu viele Schritte – Makro abgebrochen.'); };
  const rech = () => { if (!r) r = Fo.mappe(blaetter)(b().name) || Fo.rechner(b(), Fo.mappe(blaetter)); return r; };
  const adr = (a) => { const z = Fo.zerlege(String(a)); if (!z) throw new MakroFehler(`„${a}“ ist keine Zelle (z. B. "B3").`); return Fo.adresse(z.sp, z.ze); };
  const zellen = (bereich) => { const t = String(bereich).toUpperCase(); const x = Fo.bereich(t); if (!x) throw new MakroFehler(`„${bereich}“ ist kein Bereich (z. B. "A1:C5").`); const aus = []; for (let ze = x.ze1; ze <= x.ze2; ze++) for (let sp = x.sp1; sp <= x.sp2; sp++) aus.push(Fo.adresse(sp, ze)); if (aus.length > 500000) throw new MakroFehler('Bereich zu groß.'); return aus; };
  const spalte = (s) => (typeof s === 'number' ? s - 1 : Fo.spalteZuNr(String(s).replace(/\d+/g, '')));
  const groesse = () => { let sp = -1, ze = -1; for (const a of Object.keys(b().zellen)) { const z = Fo.zerlege(a); if (z) { if (z.sp > sp) sp = z.sp; if (z.ze > ze) ze = z.ze; } } return { sp, ze }; };
  const roh = (w) => (w === null || w === undefined ? null : typeof w === 'number' ? String(w).replace('.', ',') : typeof w === 'boolean' ? (w ? 'WAHR' : 'FALSCH') : String(w));
  const schiebe = (ab, n) => {
    const x = b(); const verschiebe = (obj) => { const aus = {}; for (const [a, v] of Object.entries(obj || {})) { const z = Fo.zerlege(a); if (n < 0 && z.ze >= ab && z.ze < ab - n) continue; aus[z.ze >= ab ? Fo.adresse(z.sp, z.ze + n) : a] = v; } return aus; };
    const neuZ = {};
    for (const [a, v] of Object.entries(x.zellen)) {
      const z = Fo.zerlege(a); if (n < 0 && z.ze >= ab && z.ze < ab - n) continue;
      const f = String(v).startsWith('=') ? String(v).replace(/("[^"]*")|(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(])/g, (m, s, d1, sp, d2, ze) => (s ? s : Number(ze) - 1 >= ab ? `${d1}${sp}${d2}${Number(ze) + n}` : m)) : v;
      neuZ[z.ze >= ab ? Fo.adresse(z.sp, z.ze + n) : a] = f;
    }
    x.zellen = neuZ; x.formate = verschiebe(x.formate); x.farben = verschiebe(x.farben); x.fett = verschiebe(x.fett);
  };
  const tab = {
    wert: (a) => { const w = rech().wert(adr(a)); return w instanceof Fo.Fehler ? w.code : w; },
    text: (a) => { const ad = adr(a); return Fo.zeige(rech().wert(ad), b().formate?.[ad]); },
    inhalt: (a) => b().zellen[adr(a)] ?? '',
    setze: (a, w) => { const ad = adr(a); const v = roh(w); if (v === null || v === '') delete b().zellen[ad]; else b().zellen[ad] = v; neu(); },
    werte: (bereich) => { const x = Fo.bereich(String(bereich).toUpperCase()); const aus = []; for (let ze = x.ze1; ze <= x.ze2; ze++) { const z = []; for (let sp = x.sp1; sp <= x.sp2; sp++) { const w = rech().wert(Fo.adresse(sp, ze)); z.push(w instanceof Fo.Fehler ? w.code : w); } aus.push(z); } return aus; },
    leeren: (bereich) => { for (const a of zellen(bereich)) delete b().zellen[a]; neu(); },
    fett: (bereich, an = true) => { for (const a of zellen(bereich)) { if (an) b().fett[a] = true; else delete b().fett[a]; } },
    farbe: (bereich, f) => { if (f && !/^#[0-9a-f]{6}$/i.test(f)) throw new MakroFehler('Farbe bitte als "#rrggbb".'); for (const a of zellen(bereich)) { if (f) b().farben[a] = f; else delete b().farben[a]; } },
    format: (bereich, art) => { for (const a of zellen(bereich)) { if (art) b().formate[a] = art; else delete b().formate[a]; } neu(); },
    breite: (sp, px) => { b().breiten[Fo.nrZuSpalte(spalte(sp))] = Math.max(40, Math.min(600, Number(px) || 110)); },
    zeileEinfuegen: (z, anzahl = 1) => { schiebe(Number(z) - 1, Number(anzahl)); neu(); },
    zeileLoeschen: (z, anzahl = 1) => { schiebe(Number(z) - 1 + Number(anzahl), -Number(anzahl)); neu(); },
    letzteZeile: (sp) => { const s = spalte(sp); let m = 0; for (const a of Object.keys(b().zellen)) { const z = Fo.zerlege(a); if (z.sp === s && z.ze + 1 > m) m = z.ze + 1; } return m; },
    zeilen: () => groesse().ze + 1,
    spalten: () => groesse().sp + 1,
    sortiere: (sp, richtung = 'auf', kopf = 1) => {
      const s = spalte(sp); const g = groesse(); const x = b(); const zeilen = [];
      for (let ze = Number(kopf); ze <= g.ze; ze++) {
        const z = []; let formel = false, leer = true;
        for (let c = 0; c <= g.sp; c++) { const a = Fo.adresse(c, ze); const v = x.zellen[a]; if (v !== undefined) leer = false; if (String(v ?? '').startsWith('=')) formel = true; z.push([v, x.formate[a], x.farben[a], x.fett[a]]); }
        if (formel || leer) break;
        zeilen.push({ z, w: rech().wert(Fo.adresse(s, ze)) });
      }
      const auf = richtung !== 'ab';
      zeilen.sort((p, q) => { const a = p.w, c = q.w; const d = typeof a === 'number' && typeof c === 'number' ? a - c : String(a ?? '').localeCompare(String(c ?? ''), 'de', { numeric: true }); return auf ? d : -d; });
      zeilen.forEach((zeile, i) => zeile.z.forEach(([v, fo, fa, fe], c) => { const a = Fo.adresse(c, Number(kopf) + i); if (v === undefined) delete x.zellen[a]; else x.zellen[a] = v; if (fo) x.formate[a] = fo; else delete x.formate[a]; if (fa) x.farben[a] = fa; else delete x.farben[a]; if (fe) x.fett[a] = true; else delete x.fett[a]; }));
      neu();
    },
    blatt: (name) => { const i = blaetter.findIndex((x) => String(x.name).toLowerCase() === String(name).toLowerCase()); if (i < 0) throw new MakroFehler(`Blatt „${name}“ gibt es nicht.`); nr = i; r = null; },
    neuesBlatt: (name) => { let n = String(name || `Blatt ${blaetter.length + 1}`).slice(0, 31); let k = 2; while (blaetter.some((x) => x.name.toLowerCase() === n.toLowerCase())) n = `${String(name).slice(0, 28)} ${k++}`; blaetter.push({ name: n, zellen: {}, formate: {}, farben: {}, fett: {}, breiten: {} }); nr = blaetter.length - 1; r = null; return n; },
    blaetter: () => blaetter.map((x) => x.name),
    blattName: () => b().name,
    auswahl: () => daten.auswahl || 'A1',
    meldung: (t) => { meldungen.push(String(t).slice(0, 500)); },
    adresse: (sp, ze) => Fo.adresse(spalte(sp), Number(ze) - 1),
    heute: () => Fo.zeige(Fo.FN.HEUTE([]), 'datum'),
  };
  return { tab, ende: () => ({ blaetter, blattNr: nr, meldungen }) };
}

onmessage = (e) => {
  const { code, daten } = e.data;
  try {
    const { tab, ende } = api(daten);
    // eslint-disable-next-line no-new-func
    const lauf = new Function('tab', '"use strict";\n' + String(code));
    lauf(tab);
    postMessage({ ok: true, ...ende() });
  } catch (f) {
    postMessage({ ok: false, fehler: f instanceof MakroFehler ? f.message : `${f && f.name ? `${f.name}: ` : ''}${f && f.message ? f.message : String(f)}` });
  }
};
