'use strict';
// Ori Office – Oris Gehirn als Copilot: schaut, was in allen Apps offen ist, plant mit Claude
// und lässt die Vögel bauen (über die Drehscheibe). Läuft im Hauptprozess jeder App.
// Quelle: gemeinsam/ori-kern.js – wird mit gemeinsam/verteilen.sh verteilt. Nicht in den Apps ändern.

const LAUNCHER_ID = { schwalbe: 'schreiben', albatros: 'albatros', kranich: 'kranich', specht: 'specht' };
const TITEL = { schwalbe: 'Schwalbe', albatros: 'Albatros', kranich: 'Kranich', specht: 'Specht', startfenster: 'Startfenster' };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

const SYSTEM = `Du bist Ori, der Copilot von Ori Office – ein gefalteter Papiervogel, weiblich, trocken und ein bisschen frech (wie GLaDOS, aber nie gemein).
Ori Office hat vier Apps, jede mit eigenem Vogel:
- Schwalbe: Schreiben (Briefe, Dokumente, wie Word)
- Albatros: Tabellen (wie Excel)
- Kranich: Folien und Gestalten (wie PowerPoint) – Kranich gestaltet selbst, du gibst ihm nur einen klaren Auftrag mit dem Inhalt
- Specht: IT-Helfer (Server, Tagebuch für Störungen)
Du siehst, was in den Apps gerade offen ist, und kannst Dinge in die Apps bauen lassen – auch von einer App in die andere.
Antworte immer auf Deutsch, kurz (höchstens 3 Sätze), mit einem Hauch Humor. Erfinde keine Zahlen: nimm sie aus den offenen Dokumenten.

Antworte NUR mit JSON in genau dieser Form, ohne Text davor oder danach:
{"antwort":"…","schritte":[ … ]}
Ein Schritt ist eines davon:
{"app":"schwalbe","inhalt":{"neu":true,"name":"Titel","html":"<h1>…</h1><p>…</p>"}}            – Dokument schreiben (h1–h3, p, ul/ol/li, b, i, table)
{"app":"albatros","inhalt":{"neu":true,"name":"Titel","tabelle":[["Kopf1","Kopf2"],["Wert",12.5]]}}  – Tabelle anlegen (Zahlen als Zahlen, erste Zeile = Überschriften)
{"app":"kranich","inhalt":{"neu":true,"format":"folie","wunsch":"Klarer Auftrag an Kranich mit allen Inhalten"}} – Folien/Gestaltung (format: folie, web, insta, a4)
{"app":"specht","inhalt":{"was":"Kurzer Tagebuch-Eintrag"}}                                         – Eintrag im IT-Tagebuch
"neu":false nur, wenn der Nutzer ausdrücklich ins gerade offene Dokument will.
Will der Nutzer nur etwas wissen, ist "schritte" leer und die Antwort steht in "antwort".`;

function kuerze(d) {
  if (!d || d.fehler) return d?.fehler ? `(${d.fehler})` : '(nichts)';
  const k = { ...d };
  if (typeof k.text === 'string' && k.text.length > 12000) k.text = `${k.text.slice(0, 12000)} …[gekürzt]`;
  if (Array.isArray(k.folien)) k.folien = k.folien.slice(0, 30).map((f) => ({ ...f, text: String(f.text || '').slice(0, 1200) }));
  return JSON.stringify(k);
}

function json(text) {
  const t = String(text || '').trim();
  const roh = t.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
  try { const o = JSON.parse(roh); return { antwort: String(o.antwort || ''), schritte: Array.isArray(o.schritte) ? o.schritte.slice(0, 6) : [] }; } catch { return { antwort: t.slice(0, 600), schritte: [] }; }
}

// Was ist gerade offen? (für die Kopfzeile der Ori-Leiste)
async function kontext(scheibe) {
  const apps = (await scheibe.apps()).filter((a) => a.app !== 'startfenster');
  return Promise.all(apps.map(async (a) => {
    const d = await scheibe.frage(a.app, 'lesen', {}, 6000);
    return { app: a.app, titel: TITEL[a.app] || a.app, name: d?.offen ? d.name || '' : '', offen: Boolean(d?.offen), daten: d };
  }));
}

async function bisOffen(scheibe, app, ms = 30000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) { if ((await scheibe.apps()).some((a) => a.app === app)) return true; await warte(800); }
  return false;
}

// Nur zum Testen ohne Claude
const SPIEL = { frage: async ({ auftrag: a }) => ({ weg: 'spiel', text: JSON.stringify({ antwort: 'Brief steht. Die Zahlen hab ich aus deinem Haushaltsbuch. Gern geschehen.', schritte: [{ app: 'schwalbe', inhalt: { neu: true, name: 'Brief an die Bank', html: `<h1>Brief an die Bank</h1><p>Mir bleiben im November ${/1\.607,50/.test(a) ? '1.607,50 €' : 'ein paar Euro'}.</p>` } }] }) }) };

async function auftrag({ wunsch, verlauf = [], scheibe, hirn: echtesHirn, einstellungen, beiStand = () => {} }) {
  const hirn = process.env.ORI_SPIELHIRN ? SPIEL : echtesHirn;
  beiStand({ phase: 'schaut', text: 'Ori schaut, was offen ist …' });
  const ctx = await kontext(scheibe);
  const offenText = ctx.length ? ctx.map((c) => `### ${c.titel}\n${kuerze(c.daten)}`).join('\n\n') : 'Gerade ist keine App offen (außer dir).';
  const gespraech = verlauf.slice(-8).map((v) => `${v.wer === 'ich' ? 'Nutzer' : 'Ori'}: ${v.text}`).join('\n');
  const text = `Offene Apps und Inhalte:\n${offenText}\n\n${gespraech ? `Bisheriges Gespräch:\n${gespraech}\n\n` : ''}Wunsch des Nutzers: ${wunsch}`;
  beiStand({ phase: 'plant', text: 'Ori plant …' });
  const r = await hirn.frage({ system: SYSTEM, auftrag: text }, einstellungen, { zeitlimitMs: 300000 });
  const plan = json(r.text);
  const ergebnisse = [];
  for (const s of plan.schritte) {
    const app = String(s.app || '').toLowerCase();
    if (!LAUNCHER_ID[app]) continue;
    beiStand({ phase: 'baut', app, text: `${TITEL[app]} baut …` });
    if (!(await scheibe.apps()).some((a) => a.app === app)) {
      beiStand({ phase: 'startet', app, text: `Ori weckt ${TITEL[app]} …` });
      const st = await scheibe.frage('startfenster', 'starten', { inhalt: { app: LAUNCHER_ID[app] } }, 10000);
      if (st?.fehler || !(await bisOffen(scheibe, app))) { ergebnisse.push({ app, titel: TITEL[app], fehler: st?.nichtOffen ? `${TITEL[app]} ist zu und das Startfenster auch – öffne eins davon, dann baue ich.` : `${TITEL[app]} ließ sich nicht starten.` }); continue; }
      await warte(1500);
    }
    const inhalt = { neu: s.inhalt?.neu !== false, ...(s.inhalt || {}) };
    const e = await scheibe.frage(app, 'einsetzen', { inhalt }, 60000);
    ergebnisse.push({ app, titel: TITEL[app], ...(e?.fehler ? { fehler: e.fehler } : { ok: true, name: e?.name || inhalt.name || '', laeuft: Boolean(e?.laeuft) }) });
  }
  return { antwort: plan.antwort || (ergebnisse.length ? 'Erledigt.' : '…'), ergebnisse, weg: r.weg };
}

// In einer App einschalten: ipc-Handler für die Ori-Leiste
function einschalten({ ipcMain, scheibe, hirn, einstellungen, fenster }) {
  ipcMain.handle('ori:kontext', async () => (await kontext(scheibe)).map(({ daten, ...k }) => k));
  ipcMain.handle('ori:zeigen', (_e, app) => scheibe.frage(String(app), 'zeigen', {}, 5000));
  ipcMain.handle('ori:auftrag', async (_e, wunsch, verlauf) => {
    try {
      return await auftrag({ wunsch: String(wunsch || '').slice(0, 8000), verlauf: Array.isArray(verlauf) ? verlauf : [], scheibe, hirn, einstellungen: einstellungen(),
        beiStand: (st) => { const w = fenster(); if (w && !w.isDestroyed()) w.webContents.send('ori:stand', st); } });
    } catch (f) { return { fehler: f.message || String(f) }; }
  });
}

module.exports = { auftrag, kontext, einschalten, SYSTEM, json };
