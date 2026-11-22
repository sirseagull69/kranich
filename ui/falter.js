'use strict';
// Falter: kleine Laufzeit fuer die Oberflaeche von Kranich.
//
// Die Oberflaeche kommt als Vorlage aus dem Canvas (ui/index.html,
// <template id="vorlage">). Falter fuellt sie mit den Werten aus der Logik
// und haelt die Seite auf Stand, ohne Elemente neu zu bauen, die schon da
// sind. Dadurch laufen Animationen nur, wenn wirklich etwas Neues erscheint.
//
// Was die Vorlage kann:
//   {{ pfad.zum.wert }}                      Wert einsetzen
//   <sc-if value="{{ bedingung }}">…</sc-if>  nur zeigen, wenn wahr
//   <sc-for list="{{ liste }}" as="x">…       wiederholen
//   onClick="{{ funktion }}"                  Ereignis

(function () {
  const GANZ = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  const LOCH = /\{\{\s*([^}]+?)\s*\}\}/g;
  const EREIGNIS = /^on[A-Z]/;

  function hole(pfad, werte, lokal) {
    if (pfad === 'true') return true;
    if (pfad === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(pfad)) return Number(pfad);
    const teile = pfad.split('.');
    let wert = teile[0] in lokal ? lokal[teile[0]] : werte[teile[0]];
    for (let i = 1; i < teile.length && wert != null; i++) wert = wert[teile[i]];
    return wert;
  }

  function fuelle(text, werte, lokal) {
    return text.replace(LOCH, (_, pfad) => {
      const wert = hole(pfad, werte, lokal);
      return wert == null ? '' : String(wert);
    });
  }

  // Uebersetzt einen Knoten der Vorlage in eine Funktion, die daraus
  // "Plaene" macht: einfache Objekte, die sagen, wie die Seite aussehen soll.
  let laufendeNummer = 0;
  function uebersetze(knoten) {
    const nr = ++laufendeNummer;

    if (knoten.nodeType === Node.TEXT_NODE) {
      const text = knoten.nodeValue;
      if (!text.trim()) return null;
      const fest = !text.includes('{{');
      return (werte, lokal, vor) => [{ k: vor + nr, text: fest ? text : fuelle(text, werte, lokal) }];
    }
    if (knoten.nodeType !== Node.ELEMENT_NODE) return null;

    const name = knoten.localName;
    const kinder = [...knoten.childNodes].map(uebersetze).filter(Boolean);
    const baueKinder = (werte, lokal, vor) => {
      const liste = [];
      for (const kind of kinder) liste.push(...kind(werte, lokal, vor));
      return liste;
    };

    if (name === 'sc-if') {
      const pfad = (knoten.getAttribute('value') || '').match(GANZ)?.[1];
      return (werte, lokal, vor) => (pfad && hole(pfad, werte, lokal) ? baueKinder(werte, lokal, vor) : []);
    }

    if (name === 'sc-for') {
      const pfad = (knoten.getAttribute('list') || '').match(GANZ)?.[1];
      const als = knoten.getAttribute('as') || 'item';
      return (werte, lokal, vor) => {
        const liste = pfad ? hole(pfad, werte, lokal) : null;
        if (!Array.isArray(liste)) return [];
        const aus = [];
        liste.forEach((eintrag, i) => {
          // Eintraege mit eigener Kennung behalten ihr Element, auch wenn
          // sich die Reihenfolge aendert.
          const marke = eintrag && eintrag.id != null ? eintrag.id : i;
          aus.push(...baueKinder(werte, { ...lokal, [als]: eintrag, $index: i }, `${vor}${nr}[${marke}]`));
        });
        return aus;
      };
    }

    const merkmale = [];
    for (const m of knoten.attributes) {
      if (m.name.startsWith('hint-')) continue;
      const ganz = m.value.match(GANZ);
      if (EREIGNIS.test(m.name) || /^on[a-z]/.test(m.name)) {
        merkmale.push({ art: 'ereignis', name: m.name.slice(2).toLowerCase(), pfad: ganz?.[1] });
      } else if (ganz) {
        merkmale.push({ art: 'wert', name: m.name, pfad: ganz[1] });
      } else if (m.value.includes('{{')) {
        merkmale.push({ art: 'text', name: m.name, text: m.value });
      } else {
        merkmale.push({ art: 'fest', name: m.name, wert: m.value });
      }
    }
    const raum = knoten.namespaceURI;
    const eingabe = name === 'input' || name === 'textarea';

    return (werte, lokal, vor) => {
      const a = {};
      const e = {};
      for (const m of merkmale) {
        if (m.art === 'fest') a[m.name] = m.wert;
        else if (m.art === 'text') a[m.name] = fuelle(m.text, werte, lokal);
        else if (m.art === 'wert') {
          const wert = hole(m.pfad, werte, lokal);
          if (m.name.startsWith('aria-')) a[m.name] = String(wert ?? false);
          else if (wert === true) a[m.name] = '';
          else if (wert !== false && wert != null) a[m.name] = String(wert);
        } else if (m.pfad) {
          const funktion = hole(m.pfad, werte, lokal);
          // In Eingabefeldern meint "change" jede Aenderung.
          if (typeof funktion === 'function') e[eingabe && m.name === 'change' ? 'input' : m.name] = funktion;
        }
      }
      return [{ k: vor + nr, name, raum, a, e, kinder: baueKinder(werte, lokal, vor) }];
    };
  }

  function erzeuge(plan) {
    const el = plan.text !== undefined ? document.createTextNode('') : document.createElementNS(plan.raum, plan.name);
    el.__k = plan.k;
    el.__a = {};
    el.__e = {};
    return el;
  }

  function flicke(el, plan) {
    if (plan.text !== undefined) {
      if (el.nodeValue !== plan.text) el.nodeValue = plan.text;
      return;
    }
    const alt = el.__a;
    for (const name in alt) if (!(name in plan.a)) el.removeAttribute(name);
    for (const name in plan.a) if (alt[name] !== plan.a[name]) el.setAttribute(name, plan.a[name]);
    el.__a = plan.a;
    for (const name in plan.e) {
      if (!(name in el.__e)) el.addEventListener(name, (ereignis) => el.__e[name]?.(ereignis));
    }
    for (const name in el.__e) if (!(name in plan.e)) plan.e[name] = null;
    el.__e = plan.e;
    gleiche(el, plan.kinder);
  }

  // Bringt die Kinder eines Elements auf den Stand der Plaene. Was dieselbe
  // Kennung hat, bleibt dasselbe Element.
  function gleiche(eltern, plaene) {
    const vorhanden = new Map();
    for (const kind of eltern.childNodes) if (kind.__k !== undefined) vorhanden.set(kind.__k, kind);
    let stelle = eltern.firstChild;
    for (const plan of plaene) {
      let el = vorhanden.get(plan.k);
      if (el) vorhanden.delete(plan.k);
      else el = erzeuge(plan);
      flicke(el, plan);
      if (el === stelle) stelle = stelle.nextSibling;
      else eltern.insertBefore(el, stelle);
    }
    for (const rest of vorhanden.values()) rest.remove();
  }

  // Grundlage fuer die Logik. Die Logik beschreibt in werte(), was die
  // Vorlage zeigen soll, und ruft setState(), wenn sich etwas aendert.
  class Logik {
    constructor() {
      this.state = {};
      this.props = {};
      this._zeichne = null;
      this._geplant = false;
    }
    setState(teil) {
      this.state = Object.assign({}, this.state, typeof teil === 'function' ? teil(this.state) : teil);
      this.forceUpdate();
    }
    forceUpdate() {
      if (this._geplant || !this._zeichne) return;
      this._geplant = true;
      queueMicrotask(() => {
        this._geplant = false;
        this._zeichne();
      });
    }
  }

  function starte(Klasse, vorlage, ziel) {
    const kinder = [...vorlage.content.childNodes].map(uebersetze).filter(Boolean);
    const logik = new Klasse();
    logik._zeichne = () => {
      let werte;
      try {
        werte = logik.renderVals();
      } catch (fehler) {
        console.error('Kranich: Fehler in der Logik', fehler);
        return;
      }
      const plaene = [];
      for (const kind of kinder) plaene.push(...kind(werte, {}, ''));
      gleiche(ziel, plaene);
    };
    logik._zeichne();
    logik.componentDidMount?.();
    return logik;
  }

  window.Falter = { Logik, starte };
  window.DCLogic = Logik;
})();
