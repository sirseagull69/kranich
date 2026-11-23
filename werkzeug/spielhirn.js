'use strict';
// Spielt Claude vor (für Rauchtest und Entwicklung ohne Konto):
// KRANICH_SPIELHIRN=1 npm start
// KRANICH_SPIELHIRN=fehler simuliert eine fehlende Verbindung.

const { HirnFehler } = require('../kern/hirn');

const FARBEN = { Ruhig: ['#fffdf8', '#1d2742', '#7c5cd6'], Mutig: ['#7c5cd6', '#ffffff', '#1d2742'], Kompakt: ['#f6f1e7', '#1d2742', '#4a2f9a'] };

function seite(titel, [grund, tinte, akzent], extra = '', b = 1440, h = 900) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
html,body{margin:0;width:${b}px;height:${h}px;overflow:hidden;background:#f6f1e7;font-family:'Source Serif 4',serif;color:#1d2742}
header{height:96px;display:flex;align-items:center;gap:16px;padding:0 48px;background:${grund};color:${tinte}}
header h1{font:800 34px 'Bricolage Grotesque',sans-serif;margin:0;letter-spacing:-.02em}
main{padding:40px 48px;display:flex;flex-direction:column;gap:14px}
.zeile{display:flex;align-items:center;gap:14px;padding:16px 18px;background:#fff;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%);font-size:18px}
.kasten{width:20px;height:20px;border:2px solid ${akzent};border-radius:3px}
button{margin-left:auto;min-height:48px;padding:0 22px;border:0;background:${akzent};color:#fff;font:700 16px 'Bricolage Grotesque',sans-serif;clip-path:polygon(0 0,calc(100% - 11px) 0,100% 11px,100% 100%,0 100%)}
${extra}</style></head><body>
<header data-name="Kopfzeile"><h1 data-name="Überschrift „${titel}“">${titel}</h1><button data-name="Knopf „Neue Aufgabe“">Neue Aufgabe</button></header>
<main data-name="Aufgabenliste">
<div class="zeile" data-name="Aufgabe 1"><span class="kasten"></span>Rechnung an Kunde A schicken</div>
<div class="zeile" data-name="Aufgabe 2"><span class="kasten"></span>Einkaufsliste schreiben</div>
<div class="zeile" data-name="Aufgabe 3"><span class="kasten"></span>Zahnarzt anrufen</div>
</main></body></html>`;
}

async function frage(auftrag) {
  if (process.env.KRANICH_SPIELHIRN === 'fehler') throw new HirnFehler('keine-verbindung', 'Kranich kommt gerade nicht an Claude ran.', 'Spielhirn: keine Verbindung');
  await new Promise((r) => setTimeout(r, 400));
  const a = auftrag.auftrag;
  if (/Bildbearbeiter/.test(auftrag.system)) {
    return { weg: 'claude', text: JSON.stringify({ notiz: 'Mach ich: Tasse freistellen, Rest durchsichtig, dann auf 1080 × 1080.', schritte: [{ art: 'freistellen' }, { art: 'quadrat', groesse: 1080 }, { art: 'anpassen', hell: 12, waerme: -8 }] }) };
  }
  if (/Die Selbstprüfung hat/.test(a)) {
    const html = (a.match(/```html\n([\s\S]*?)```/) || [])[1];
    return { weg: 'claude', text: `NOTIZ: Repariert.\n\`\`\`html\n${html}\n\`\`\`` };
  }
  const ziel = a.match(/Ziel: (\d+) × (\d+) px/);
  if (ziel) {
    const [b, h] = [Number(ziel[1]), Number(ziel[2])];
    const name = (a.match(/Nach: ([^.]+)\./) || [])[1] || 'Format';
    return { weg: 'claude', text: `NOTIZ: ${name} ist fertig.\n\`\`\`html\n${seite('Sommerfest', FARBEN.Mutig, `header h1{font-size:${Math.round(Math.min(b, h) / 12)}px}`, b, h)}\n\`\`\`` };
  }
  const flaeche = a.match(/Fläche: (\d+) × (\d+) px/);
  const richtung = (a.match(/Richtung "(\w+)"/) || [])[1];
  if (richtung) return { weg: 'claude', text: `NOTIZ: Variante ${richtung}.\n\`\`\`html\n${seite('Meine Aufgaben', FARBEN[richtung])}\n\`\`\`` };
  if (/data-k="/.test(a) && /Ändere nur/.test(a)) {
    const k = (a.match(/data-k="([^"]+)"/) || [])[1];
    const html = (a.match(/```html\n([\s\S]*?)```/) || [])[1].replace(/<\/style>/, `[data-k="${k}"]{transform:scale(1.15);transform-origin:right center}</style>`);
    return { weg: 'claude', text: `NOTIZ: Fertig: das Element ist jetzt größer, damit man es leichter trifft.\n\`\`\`html\n${html}\n\`\`\`` };
  }
  const [fb, fh] = flaeche ? [Number(flaeche[1]), Number(flaeche[2])] : [1440, 900];
  return { weg: 'claude', text: `NOTIZ: Ich hab dir den Entwurf im Look der Familie gefaltet.\n\`\`\`html\n${seite('Meine Aufgaben', FARBEN.Ruhig, '', fb, fh)}\n\`\`\`` };
}

module.exports = { frage };
