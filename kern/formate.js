'use strict';
// Alle Formate, die Kranich kennt. Druckformate werden in Millimetern
// angegeben und für die Leinwand mit 96 dpi in Pixel umgerechnet (beim
// Export als PNG mit 3× ergibt das gut 280 dpi).

const MM = 96 / 25.4;
const px = (mm) => Math.round(mm * MM);

const FORMATE = [
  { id: 'app', name: 'App-Bildschirm', gruppe: 'App & Web', breite: 390, hoehe: 844, regeln: 'Handy hochkant, Daumen-Bereich unten, Klickflächen ab 44 px.' },
  { id: 'tablet', name: 'Tablet', gruppe: 'App & Web', breite: 1024, hoehe: 768 },
  { id: 'web', name: 'Webseite', gruppe: 'App & Web', breite: 1440, hoehe: 900 },
  { id: 'fenster', name: 'Fenster', gruppe: 'App & Web', breite: 1200, hoehe: 800 },
  { id: 'webkopf', name: 'Webseiten-Kopf', gruppe: 'App & Web', breite: 1440, hoehe: 480, regeln: 'Breiter Streifen, Titel groß und links, wenig Text.' },
  { id: 'post', name: 'Instagram-Post', gruppe: 'Social', breite: 1080, hoehe: 1080, regeln: 'Quadratisch, auf dem Handy klein zu sehen: wenig Text, sehr große Schrift.' },
  { id: 'story', name: 'Story', gruppe: 'Social', breite: 1080, hoehe: 1920, regeln: 'Hochkant. Oben und unten je 250 px frei lassen (dort liegen die Bedienelemente).' },
  { id: 'youtube', name: 'YouTube-Bild', gruppe: 'Social', breite: 1280, hoehe: 720, regeln: 'Muss auch winzig lesbar sein: höchstens 5 Wörter, starker Kontrast.' },
  { id: 'linkedin', name: 'LinkedIn-Banner', gruppe: 'Social', breite: 1584, hoehe: 396, regeln: 'Sehr breit; links unten wird das Profilbild darübergelegt, dort nichts Wichtiges.' },
  { id: 'a5', name: 'Flyer A5', gruppe: 'Druck', breite: px(148), hoehe: px(210), mass: '148 × 210 mm', druck: true, regeln: 'Druck: 3 mm Rand für Wichtiges freihalten, Fließtext mindestens 9 pt.' },
  { id: 'a3', name: 'Poster A3', gruppe: 'Druck', breite: px(297), hoehe: px(420), mass: '297 × 420 mm', druck: true, regeln: 'Aus zwei Metern lesbar: eine große Botschaft.' },
  { id: 'visitenkarte', name: 'Visitenkarte', gruppe: 'Druck', breite: px(85), hoehe: px(55), mass: '85 × 55 mm', druck: true, regeln: 'Nur Name, Rolle, Kontakt. Schrift nicht unter 7 pt.' },
  { id: 'einladung', name: 'Einladung', gruppe: 'Druck', breite: px(148), hoehe: px(105), mass: 'A6 · 148 × 105 mm', druck: true },
  { id: 'folie', name: 'Folie 16:9', gruppe: 'Präsentation', breite: 1920, hoehe: 1080, regeln: 'Eine Aussage pro Folie, große Schrift, viel Luft.' },
  { id: 'logo', name: 'Logo', gruppe: 'Marke', breite: 1000, hoehe: 1000, mass: 'freie Größe', regeln: 'Nur das Zeichen und ggf. der Name, auf durchsichtigem oder ruhigem Grund.' },
  { id: 'icon', name: 'App-Icon', gruppe: 'Marke', breite: 1024, hoehe: 1024, regeln: 'Ein einfaches Symbol, kein Text, wirkt auch mit 48 px.' },
];

const GRUPPEN = ['App & Web', 'Social', 'Druck', 'Präsentation', 'Marke'];

function format(id) {
  return FORMATE.find((f) => f.id === id) || null;
}

function massText(f) {
  return f.mass || `${f.breite} × ${f.hoehe}`;
}

// Eigenes Format aus Breite, Höhe und Einheit ('px' oder 'mm').
function eigenesFormat(breite, hoehe, einheit = 'px') {
  const b = Number(breite), h = Number(hoehe);
  if (!(b > 0 && h > 0)) throw new Error('Breite und Höhe müssen größer als 0 sein.');
  const mm = einheit === 'mm';
  const fb = mm ? px(b) : Math.round(b), fh = mm ? px(h) : Math.round(h);
  if (fb < 40 || fh < 40 || fb > 8000 || fh > 8000) throw new Error('Das Format muss zwischen 40 und 8000 Pixel liegen.');
  return { id: 'eigen', name: 'Eigene Größe', gruppe: 'Eigen', breite: fb, hoehe: fh, mass: mm ? `${b} × ${h} mm` : undefined, druck: mm };
}

module.exports = { FORMATE, GRUPPEN, format, massText, eigenesFormat };
