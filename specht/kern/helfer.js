'use strict';
// Was Claude als „Specht“ weiß und wie es antwortet.

const SYSTEM = `Du bist Specht, der IT-Helfer von Nils. Sprich Deutsch, duze, kurz und einfach. Fachbegriffe kurz erklären – Nils kennt nicht jeden Begriff.
Was du über die Firma und ihre IT weißt, steht unten unter FIRMA, SERVER, NETZ, TAGEBUCH und ANLEITUNGEN.

WICHTIGE REGELN
- Du änderst nie etwas an Systemen und behauptest das auch nie. Befehle schlägst du nur vor; Nils führt sie selbst aus.
- Niemals Passwörter nennen, erfragen oder erfinden. Wenn eins gebraucht wird: „liegt in Passbolt“.
- Wenn du etwas nicht sicher weißt, sag das und sag, wo Nils nachsehen kann. Nichts erfinden (keine IPs, Versionen, Namen).
- Bei Störungen: erst ähnliche Fälle aus dem Tagebuch nennen, dann eine kurze Reihenfolge zum Prüfen (höchstens 5 Schritte).
- Rot heißt „ansehen“, nicht Panik – ruhig formulieren.

Antworte NUR mit JSON, ohne Markdown drumherum:
{
  "antwort": "1–6 kurze Sätze oder eine nummerierte Liste als Text (\\n für Zeilen)",
  "befehle": [ { "zweck": "wofür", "befehl": "der Befehl" } ],
  "aehnlich": [ "id-aus-dem-tagebuch" ],
  "anleitung": "id einer passenden Anleitung oder leer"
}
"befehle", "aehnlich", "anleitung" sind optional.`;

function wissensText({ grund = { SERVER: [], NETZ: [], BACKUP: { ziele: [] } }, notizen = [], stoerungen = [], anleitungen = [], gewolltAus = [], zustand = {}, netzOffen = [] }) {
  const W = grund;
  const z = (id) => (zustand[id] ? (zustand[id].an ? 'antwortet' : 'antwortet NICHT') : 'unbekannt');
  const teile = [];
  if (W.KONTEXT) teile.push(`FIRMA:\n${W.KONTEXT}\n`);
  if (!W.SERVER.length) teile.push('(Noch keine Wissens-Datei geladen – du kennst die Server noch nicht. Sag Nils, er soll sie in den Einstellungen laden.)');
  teile.push(`SERVER${W.STAND ? ` (${W.STAND})` : ''}:`);
  for (const s of W.SERVER) {
    const n = notizen.filter((x) => x.ziel === s.id).map((x) => x.text).join(' | ');
    teile.push(`- ${s.name} ${s.ip} · ${s.rolle} · ${z(s.id)}${gewolltAus.includes(s.id) ? ' (gewollt aus)' : ''} · läuft: ${(s.laeuft || []).join(', ') || '–'}${s.haengt ? ` · hängt an: ${s.haengt.join(', ')}` : ''}${s.hinweis ? ` · Hinweis: ${s.hinweis}` : ''}${n ? ` · Notizen: ${n}` : ''}`);
  }
  teile.push('\nNETZ:');
  for (const n of W.NETZ) teile.push(`- ${n.name} ${n.ip} (${n.gruppe}) · ${z(n.id)}`);
  if (netzOffen.length) teile.push(`Offene Punkte im Netzplan: ${netzOffen.join(' | ')}`);
  if (W.BACKUP?.ziele?.length) teile.push(`\nBACKUP (${W.BACKUP.stand}): ${W.BACKUP.ziele.map((b) => `${b.name} ${b.frei} frei von ${b.gesamt}`).join('; ')}`);
  teile.push('\nSTÖRUNGS-TAGEBUCH (neueste zuerst):');
  for (const s of [...stoerungen].sort((a, b) => String(b.datum).localeCompare(String(a.datum))).slice(0, 40)) {
    teile.push(`- [${s.id}] ${s.datum} · ${s.was} · ${s.status} · Ursache: ${s.ursache || '–'} · Lösung: ${s.loesung || '–'}`);
  }
  teile.push('\nANLEITUNGEN:');
  for (const a of anleitungen) teile.push(`- [${a.id}] ${a.titel}: ${(a.schritte || []).join(' / ').slice(0, 600)}`);
  return teile.join('\n');
}

function auftrag({ frage, verlauf = [], ...wissen }) {
  const v = verlauf.slice(-8).map((m) => `${m.wer === 'ich' ? 'Nils' : 'Specht'}: ${m.text}`).join('\n');
  return `${wissensText(wissen)}\n\n${v ? `BISHERIGES GESPRÄCH:\n${v}\n\n` : ''}FRAGE VON NILS:\n${String(frage).slice(0, 4000)}`;
}

function leseAntwort(text) {
  const roh = String(text || '').trim();
  const m = roh.match(/\{[\s\S]*\}/);
  try {
    const d = JSON.parse(m ? m[0] : roh);
    return {
      antwort: String(d.antwort || '').slice(0, 4000),
      befehle: Array.isArray(d.befehle) ? d.befehle.filter((b) => b && b.befehl).slice(0, 6).map((b) => ({ zweck: String(b.zweck || '').slice(0, 200), befehl: String(b.befehl).slice(0, 600) })) : [],
      aehnlich: Array.isArray(d.aehnlich) ? d.aehnlich.map(String).slice(0, 5) : [],
      anleitung: d.anleitung ? String(d.anleitung) : '',
    };
  } catch {
    return { antwort: roh.slice(0, 4000), befehle: [], aehnlich: [], anleitung: '' };
  }
}

module.exports = { SYSTEM, auftrag, leseAntwort, wissensText };
