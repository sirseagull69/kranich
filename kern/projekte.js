'use strict';
// Projekte auf der Festplatte. Jedes Projekt ist ein Ordner mit projekt.json,
// einem Vorschaubild und (bei Bildern) den Ebenen als PNG.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ID = /^[a-z0-9-]{6,40}$/;
const DATEI = /^[a-z0-9-]{1,40}\.(png|jpg|json)$/;

function neueId() {
  return `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
}

// Ein Board auf der Leinwand (früher „Seite“). x und y: Lage auf der Leinwand.
function neueSeite(name = 'Webseite', breite = 1440, hoehe = 900, { format = 'web', x = 0, y = 0 } = {}) {
  return { id: neueId(), name, format, breite, hoehe, x, y, html: '', verlauf: [] };
}

const ABSTAND = 120;

// Platz rechts neben allen Boards derselben Reihe (oben bündig mit dem Anker).
function platzDaneben(seiten, anker) {
  const reihe = seiten.filter((s) => anker && Math.abs((s.y || 0) - (anker.y || 0)) < 1);
  const rechts = (reihe.length ? reihe : seiten).reduce((m, s) => Math.max(m, (s.x || 0) + s.breite), 0);
  return { x: seiten.length ? rechts + ABSTAND : 0, y: anker ? anker.y || 0 : 0 };
}

// Ältere Projekte: Seiten ohne Lage nebeneinander legen.
function ordneAn(projekt) {
  let x = 0;
  for (const s of projekt.seiten || []) {
    if (typeof s.x !== 'number' || typeof s.y !== 'number') { s.x = x; s.y = 0; }
    if (!s.format) s.format = 'web';
    x = Math.max(x, s.x + s.breite + ABSTAND);
  }
  return projekt;
}

class Projekte {
  constructor(ordner) {
    this.ordner = ordner;
    fs.mkdirSync(ordner, { recursive: true });
  }

  pfad(id, datei = '') {
    if (!ID.test(id)) throw new Error('Ungültige Projekt-Nummer.');
    if (datei && !DATEI.test(datei)) throw new Error('Ungültiger Dateiname.');
    return path.join(this.ordner, id, datei);
  }

  liste() {
    const ergebnis = [];
    for (const name of fs.readdirSync(this.ordner)) {
      if (!ID.test(name)) continue;
      try {
        const p = JSON.parse(fs.readFileSync(this.pfad(name, 'projekt.json'), 'utf8'));
        ergebnis.push({
          id: p.id, name: p.name, art: p.art, geaendert: p.geaendert, app: Boolean(p.app),
          seite: p.art === 'entwurf' ? (p.seiten?.length > 1 ? `${p.seiten.length} Boards` : p.seiten?.[0]?.name || (p.app ? 'Plan' : '')) : 'Bild 1',
          vorschau: fs.existsSync(this.pfad(name, 'vorschau.png')),
        });
      } catch { /* kaputte Projekte überspringen */ }
    }
    return ergebnis.sort((a, b) => (b.geaendert || '').localeCompare(a.geaendert || ''));
  }

  // Ein Projekt hat immer beides: Entwurfsseiten und ein Bild. "art" sagt nur,
  // womit es geöffnet wird (der Umschalter Entwurf | Bild wechselt).
  anlegen({ art = 'entwurf', name, format } = {}) {
    if (!['entwurf', 'bild'].includes(art)) throw new Error('Unbekannte Projektart.');
    const id = neueId();
    const projekt = {
      id, art, name: name || (art === 'bild' ? 'Neues Bild' : 'Neues Projekt'),
      erstellt: new Date().toISOString(), geaendert: new Date().toISOString(),
      chat: [],
      seiten: [format ? neueSeite(format.name, format.breite, format.hoehe, { format: format.id }) : neueSeite()],
      bild: { breite: 0, hoehe: 0, ebenen: [], anpassung: { hell: 0, kontrast: 0, waerme: 0, saett: 0 } },
    };
    fs.mkdirSync(this.pfad(id), { recursive: true });
    this.speichern(projekt);
    return projekt;
  }

  laden(id) {
    return ordneAn(JSON.parse(fs.readFileSync(this.pfad(id, 'projekt.json'), 'utf8')));
  }

  speichern(projekt) {
    projekt.geaendert = new Date().toISOString();
    const ziel = this.pfad(projekt.id, 'projekt.json');
    const tmp = `${ziel}.neu`;
    fs.writeFileSync(tmp, JSON.stringify(projekt), 'utf8');
    fs.renameSync(tmp, ziel);
    return projekt.geaendert;
  }

  loeschen(id) {
    fs.rmSync(this.pfad(id), { recursive: true, force: true });
  }

  schreibeDatei(id, datei, puffer) {
    fs.writeFileSync(this.pfad(id, datei), puffer);
  }

  leseDatei(id, datei) {
    const p = this.pfad(id, datei);
    return fs.existsSync(p) ? fs.readFileSync(p) : null;
  }
}

module.exports = { Projekte, neueSeite, neueId, platzDaneben, ordneAn };
