'use strict';
// Hauptprozess von Kranich.

const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { Projekte } = require('../kern/projekte');
const { Einstellungen } = require('../kern/einstellungen');
const echtesHirn = require('../kern/hirn');
const Heimdienst = require('../kern/heimdienst');
// Für Rauchtest und Entwicklung ohne Konto: Claude vorspielen.
const hirn = process.env.KRANICH_SPIELHIRN ? { ...echtesHirn, frage: require('../werkzeug/spielhirn').frage } : echtesHirn;
const A = require('../kern/auftraege');
const { htmlFuerApp, svgAusHtml, dateiname } = require('../kern/export');
const { FORMATE, GRUPPEN, format: formatVon, eigenesFormat, formatAusWunsch } = require('../kern/formate');
const AP = require('../kern/appplan');
const PR = require('../kern/pruefung');

let fenster = null;
let projekte;
let einstellungen;

const datenOrdner = () => process.env.KRANICH_DATEN || app.getPath('userData');

function alsFehler(e) {
  return { fehler: { art: e.art || 'antwort', nachricht: e.message || String(e), details: e.details || '' } };
}

// Jeder Handler gibt entweder ein Ergebnis oder { fehler } zurück, nie eine Ausnahme.
function handle(kanal, fn) {
  ipcMain.handle(kanal, async (_e, ...args) => {
    try { return await fn(...args); } catch (e) { return alsFehler(e); }
  });
}

function dataUrlZuPuffer(url) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(String(url));
  if (!m) throw new Error('Ungültiges Bild.');
  return { typ: m[1], puffer: Buffer.from(m[2], 'base64') };
}

function tempBild(dataUrl) {
  const { typ, puffer } = dataUrlZuPuffer(dataUrl);
  const endung = typ.includes('jpeg') ? '.jpg' : typ.includes('webp') ? '.webp' : '.png';
  const datei = path.join(os.tmpdir(), `kranich-bild-${Date.now()}${endung}`);
  fs.writeFileSync(datei, puffer);
  return datei;
}

// Rendert einen Entwurf unsichtbar und liefert ein Bild davon.
// Unsichtbare Werk-Fenster: einmal anlegen und wiederverwenden. Ständiges Öffnen und
// Schließen lässt unter Windows das Hauptfenster flackern.
const werk = { mitJs: null, ohneJs: null, kette: { mitJs: Promise.resolve(), ohneJs: Promise.resolve() } };
function mitWerkfenster(art, fn) {
  const lauf = werk.kette[art].then(async () => {
    let w = werk[art];
    if (!w || w.isDestroyed()) {
      w = new BrowserWindow({ show: false, width: 800, height: 600, useContentSize: true, frame: false, skipTaskbar: true, webPreferences: { offscreen: true, sandbox: true, javascript: art === 'mitJs' } });
      werk[art] = w;
    }
    return fn(w);
  });
  werk.kette[art] = lauf.catch(() => {});
  return lauf;
}
function werkfensterZu() { for (const k of ['mitJs', 'ohneJs']) { if (werk[k] && !werk[k].isDestroyed()) werk[k].destroy(); werk[k] = null; } }

async function fotografiere(html, breite, hoehe, faktor = 1) {
  const datei = path.join(os.tmpdir(), `kranich-foto-${Date.now()}.html`);
  // Eigene Schriften mitgeben, damit das Foto auch ohne Internet stimmt.
  const schrift = `<link rel="stylesheet" href="${require('node:url').pathToFileURL(path.join(__dirname, '..', 'ui', 'schrift', 'schrift.css')).href}">`;
  const mitSchrift = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + schrift) : schrift + html;
  fs.writeFileSync(datei, mitSchrift, 'utf8');
  return mitWerkfenster('ohneJs', async (w) => {
    try {
      w.setContentSize(Math.round(breite * faktor), Math.round(hoehe * faktor));
      await w.loadFile(datei);
      w.webContents.setZoomFactor(faktor);
      await new Promise((r) => setTimeout(r, 600));
      return await w.webContents.capturePage({ x: 0, y: 0, width: Math.round(breite * faktor), height: Math.round(hoehe * faktor) });
    } finally {
      fs.rm(datei, { force: true }, () => {});
    }
  });
}

function mitSchrift(html) {
  const schrift = `<link rel="stylesheet" href="${require('node:url').pathToFileURL(path.join(__dirname, '..', 'ui', 'schrift', 'schrift.css')).href}">`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + schrift) : schrift + html;
}

// Selbstprüfung: Entwurf unsichtbar laden (eigene Skripte entfernt) und nachmessen.
async function pruefe(html, format) {
  const opt = PR.messOptionen(format);
  const datei = path.join(os.tmpdir(), `kranich-pruef-${Date.now()}.html`);
  fs.writeFileSync(datei, mitSchrift(String(html).replace(/<script[\s\S]*?<\/script>/gi, '')), 'utf8');
  return mitWerkfenster('mitJs', async (w) => {
    try {
      w.setContentSize(opt.breite, opt.hoehe);
      w.webContents.setZoomFactor(1);
      await w.loadFile(datei);
      await new Promise((r) => setTimeout(r, 400));
      const roh = await w.webContents.executeJavaScript(`${PR.messCode}(${JSON.stringify(opt)})`);
      return PR.bewerte(roh);
    } finally {
      fs.rm(datei, { force: true }, () => {});
    }
  });
}

// Bildschirmfotos vom aktuellen Stand der Familie (ui/stand), für Wünsche, die eine App nennen
function standBilder(text) {
  const { standFuer } = require('../kern/familie');
  const appDaten = app.getPath('appData');
  return standFuer(text).map((f) => {
    const kandidaten = [path.join(appDaten, 'Kranich', 'stand', f), path.join(appDaten, 'Albatros', 'stand', f), path.join(appDaten, 'Selbst gfaltet', 'stand', f), path.join(__dirname, '..', 'ui', 'stand', f)]
      .filter((q) => fs.existsSync(q)).sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs);
    if (!kandidaten.length) return null;
    const z = path.join(os.tmpdir(), `kranich-stand-${Date.now()}-${f}`);
    fs.copyFileSync(kandidaten[0], z); return z;
  }).filter(Boolean);
}

function zielOrdner(ziel, appName, eigenerOrdner) {
  const e = einstellungen.alle();
  if (ziel === 'app') {
    const basis = e.appOrdner?.[appName];
    if (!basis) throw new Error(`Für ${appName} ist noch kein Projektordner eingestellt (Einstellungen).`);
    return path.join(basis, 'kranich');
  }
  if (ziel === 'ordner' && eigenerOrdner) return eigenerOrdner;
  return e.exportOrdner || path.join(app.getPath('documents'), 'Kranich');
}

function schreibeExport(ordner, name, endung, inhalt) {
  fs.mkdirSync(ordner, { recursive: true });
  let datei = path.join(ordner, `${dateiname(name)}.${endung}`);
  for (let i = 2; fs.existsSync(datei) && i < 100; i++) datei = path.join(ordner, `${dateiname(name)}-${i}.${endung}`);
  fs.writeFileSync(datei, inhalt);
  return datei;
}


// ---------- Stand-Fotos: die App fotografiert sich selbst (für Kranich) ----------
const standZuletzt = {};
function standFoto(name) {
  if (!/^[a-z0-9-]{3,40}$/.test(name) || !fenster || fenster.isMinimized() || !fenster.isVisible()) return false;
  if (Date.now() - (standZuletzt[name] || 0) < 30 * 60 * 1000) return false;
  standZuletzt[name] = Date.now();
  fenster.webContents.capturePage().then((bild) => {
    const b = bild.getSize().width > 1280 ? bild.resize({ width: 1280 }) : bild;
    const ordner = path.join(app.getPath('userData'), 'stand');
    fs.mkdirSync(ordner, { recursive: true });
    fs.writeFileSync(path.join(ordner, `${name}.jpg`), b.toJPEG(72));
  }).catch(() => {});
  return true;
}

function registriere() {
  // Projekte
  handle('projekte:liste', () => projekte.liste());
  handle('projekte:anlegen', (opt) => projekte.anlegen(opt));
  handle('projekte:laden', (id) => projekte.laden(id));
  handle('projekte:speichern', (p) => ({ geaendert: projekte.speichern(p) }));
  handle('projekte:loeschen', (id) => { projekte.loeschen(id); return true; });
  handle('projekte:dateiSchreiben', (id, datei, dataUrl) => { projekte.schreibeDatei(id, datei, dataUrlZuPuffer(dataUrl).puffer); return true; });
  handle('projekte:dateiLesen', (id, datei) => {
    const p = projekte.leseDatei(id, datei);
    return p ? `data:image/png;base64,${p.toString('base64')}` : null;
  });
  handle('projekte:vorschauAusHtml', async (id, html, breite, hoehe) => {
    const bild = await fotografiere(html, breite, hoehe, 1);
    const klein = bild.resize({ width: 480 });
    projekte.schreibeDatei(id, 'vorschau.png', klein.toPNG());
    return true;
  });

  // Einstellungen
  handle('stand:foto', (name) => standFoto(String(name)));
  handle('einstellungen:lesen', () => einstellungen.fuerOberflaeche());
  handle('einstellungen:setzen', (neu) => { const r = einstellungen.setze(neu); heimdienstAnpassen(); return einstellungen.fuerOberflaeche(); });
  handle('heim:neuerCode', () => { einstellungen.setze({ heimEigenerCode: Heimdienst.neuerCode() }); heimdienstAnpassen(true); return einstellungen.fuerOberflaeche(); });
  handle('hirn:testen', async () => {
    const { text, weg } = await hirn.frage({ system: 'Antworte nur mit dem Wort OK.', auftrag: 'Bist du da?' }, einstellungen.alle());
    return { ok: /ok/i.test(text), weg };
  });

  // Kranich – Entwürfe
  handle('kranich:entwurf', async ({ wunsch, html, auswahl, breite, hoehe, bild, app: appName, format: formatId }) => {
    const e = einstellungen.alle();
    const system = A.systemEntwurf(e);
    let auftrag;
    const bilder = [];
    if (bild) {
      bilder.push(tempBild(bild));
      auftrag = A.auftragAusBild({ wunsch, breite, hoehe });
    } else if (html) {
      auftrag = A.auftragAendern({ html, wunsch, auswahl, breite, hoehe });
    } else {
      auftrag = A.auftragNeu({ wunsch, breite, hoehe, app: appName, format: formatVon(formatId) });
    }
    if (!bild && e.standMitgeben !== false) { const st = standBilder(wunsch); if (st.length) { bilder.push(...st); auftrag += `\n\n${require('../kern/familie').STAND_HINWEIS}`; } }
    try {
      const klein = Boolean(html && auswahl && wunsch.length < 80);
      const { text, weg } = await hirn.frage({ system, auftrag, bilder }, e, { klein, zeitlimitMs: 480000 });
      return { ...A.leseEntwurf(text), weg };
    } finally {
      for (const b of bilder) fs.rm(b, { force: true }, () => {});
    }
  });

  handle('formate:liste', () => ({ formate: FORMATE, gruppen: GRUPPEN }));
  handle('formate:eigen', (b, h, einheit) => eigenesFormat(b, h, einheit));
  handle('formate:raten', (wunsch) => formatAusWunsch(String(wunsch || '').slice(0, 2000)));

  handle('kranich:anpassen', async ({ html, von, nach, texteAnpassen }) => {
    const e = einstellungen.alle();
    const { text, weg } = await hirn.frage({ system: A.systemEntwurf(e), auftrag: A.auftragAnpassen({ html, von, nach, texteAnpassen }) }, e);
    return { ...A.leseEntwurf(text), weg };
  });

  // Ganze App entwerfen
  handle('kranich:appPlan', async ({ beschreibung, geraet, zustaende, look, bild }) => {
    const e = einstellungen.alle();
    const bilder = bild ? [tempBild(bild)] : [];
    try {
      let auftrag = AP.auftragPlan({ beschreibung, geraet, zustaende });
      if (look === 'eigen') auftrag += '\nLook: eigener Look für diese App (nicht die Farben der Familie), aber gleich gute Qualität.';
      if (bilder.length) auftrag += '\nEine Skizze oder ein Bild von Nils ist angehängt; richte den Plan daran aus.';
      if (!bild && e.standMitgeben !== false) { const st = standBilder(beschreibung); if (st.length) { bilder.push(...st); auftrag += `\n${require('../kern/familie').STAND_HINWEIS}`; } }
      const { text, weg } = await hirn.frage({ system: AP.systemPlan(e), auftrag, bilder }, e, { zeitlimitMs: 600000 });
      const plan = AP.lesePlanApp(text, { geraet });
      return { plan, weg };
    } finally {
      for (const b of bilder) fs.rm(b, { force: true }, () => {});
    }
  });
  handle('kranich:appBoards', (plan) => ({ boards: AP.legeBoards(AP.boardsAusPlan(plan)) }));
  handle('kranich:bausteine', async ({ plan }) => {
    const e = einstellungen.alle();
    const { text } = await hirn.frage({ system: AP.systemBausteine(e), auftrag: AP.auftragBausteine(plan) }, e, { zeitlimitMs: 600000 });
    return AP.leseBausteine(text);
  });
  handle('kranich:appBoard', async ({ plan, board, css }) => {
    const e = einstellungen.alle();
    // Hauptbildschirme mit Opus, Zustände (leer, lädt, fehler …) mit dem schnelleren Sonnet
    const schnell = Boolean(board.zustand) && board.zustand !== 'fertig';
    const { text } = await hirn.frage({ system: A.systemEntwurf(e), auftrag: AP.auftragAppBoard({ plan, board, css }) }, e, { schnell, zeitlimitMs: 480000 });
    return A.leseEntwurf(text);
  });
  handle('kranich:pruefen', async ({ html, format: f }) => ({ funde: await pruefe(html, typeof f === 'string' ? formatVon(f) : f) }));
  handle('kranich:reparieren', async ({ html, probleme, breite, hoehe }) => {
    const e = einstellungen.alle();
    const { text } = await hirn.frage({ system: A.systemEntwurf(e), auftrag: PR.auftragReparieren({ html, probleme, breite, hoehe }) }, e, { schnell: true });
    return A.leseEntwurf(text);
  });

  handle('kranich:varianten', async ({ html, wunsch, breite, hoehe }) => {
    const e = einstellungen.alle();
    const system = A.systemEntwurf(e);
    const ergebnisse = await Promise.all(A.RICHTUNGEN.map(async (richtung) => {
      try {
        const { text } = await hirn.frage({ system, auftrag: A.auftragVariante({ html, wunsch, richtung, breite, hoehe }) }, e);
        return { ...richtung, ...A.leseEntwurf(text) };
      } catch (fehler) {
        return { ...richtung, ...alsFehler(fehler) };
      }
    }));
    if (ergebnisse.every((v) => v.fehler)) return { fehler: ergebnisse[0].fehler };
    return { varianten: ergebnisse };
  });

  // Kranich – Bilder
  handle('kranich:bild', async ({ wunsch, vorschau, breite, hoehe, auswahl }) => {
    const datei = tempBild(vorschau);
    try {
      const { text, weg } = await hirn.frage({ system: A.systemBild(), auftrag: A.auftragBild({ wunsch, breite, hoehe, auswahl }), bilder: [datei] }, einstellungen.alle());
      const plan = A.lesePlan(text);
      return { ...plan, beschreibung: plan.schritte.map(A.beschreibeSchritt), weg };
    } finally {
      fs.rm(datei, { force: true }, () => {});
    }
  });

  // Dateien und Export
  handle('datei:bildWaehlen', async () => {
    const r = await dialog.showOpenDialog(fenster, {
      title: 'Bild wählen', properties: ['openFile'],
      filters: [{ name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    const datei = r.filePaths[0];
    const bild = nativeImage.createFromPath(datei);
    if (bild.isEmpty()) throw new Error('Das Bild ließ sich nicht öffnen.');
    return { name: path.basename(datei), dataUrl: bild.toDataURL() };
  });
  handle('datei:ordnerWaehlen', async () => {
    const r = await dialog.showOpenDialog(fenster, { title: 'Ordner wählen', properties: ['openDirectory', 'createDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });
  handle('datei:zeigen', (datei) => { shell.showItemInFolder(datei); return true; });
  handle('export:standardOrdner', () => zielOrdner('speichern'));

  handle('export:entwurf', async ({ html, breite, hoehe, format, faktor = 1, ziel, app: appName, ordner, name }) => {
    const zielPfad = zielOrdner(ziel, appName, ordner);
    if (format === 'html') return { datei: schreibeExport(zielPfad, name, 'html', htmlFuerApp(html)) };
    if (format === 'svg') return { datei: schreibeExport(zielPfad, name, 'svg', svgAusHtml(html, breite, hoehe)) };
    const bild = await fotografiere(htmlFuerApp(html, { namenBehalten: true }), breite, hoehe, faktor);
    const inhalt = format === 'jpg' ? bild.toJPEG(90) : bild.toPNG();
    return { datei: schreibeExport(zielPfad, name, format === 'jpg' ? 'jpg' : 'png', inhalt) };
  });

  // Paket für die Übergabe: alle Boards, Bausteine, Plan und Abläufe in einem Ordner.
  handle('export:paket', async ({ name, boards, css, plan, ziel, app: appName, ordner }) => {
    const basis = zielOrdner(ziel, appName, ordner);
    let paket = path.join(basis, `${dateiname(name)}-paket`);
    for (let i = 2; fs.existsSync(paket) && i < 100; i++) paket = path.join(basis, `${dateiname(name)}-paket-${i}`);
    fs.mkdirSync(path.join(paket, 'boards'), { recursive: true });
    const liste = [];
    for (const b of boards) {
      const datei = `${dateiname(b.id || b.name)}.html`;
      fs.writeFileSync(path.join(paket, 'boards', datei), htmlFuerApp(b.html, { namenBehalten: true }), 'utf8');
      liste.push({ id: b.id, name: b.name, datei: `boards/${datei}`, breite: b.breite, hoehe: b.hoehe, zustand: b.zustand || null });
    }
    if (css) fs.writeFileSync(path.join(paket, 'bausteine.css'), css, 'utf8');
    const inhalt = { name, erstellt: new Date().toISOString(), boards: liste, ablaeufe: plan?.ablaeufe || [], bildschirme: plan?.bildschirme || [] };
    fs.writeFileSync(path.join(paket, 'plan.json'), JSON.stringify(inhalt, null, 2), 'utf8');
    fs.writeFileSync(path.join(paket, 'LIESMICH.md'), `# ${name}\n\nGefaltet mit Kranich.\n\n- boards/: ein HTML pro Board (data-name = Baustein, data-ziel = Ziel-Board beim Klick)\n- bausteine.css: gemeinsame Stile aller Boards\n- plan.json: Bildschirme, Zustände, Abläufe\n\n## Boards\n${liste.map((b) => `- ${b.name} (${b.breite} × ${b.hoehe})${b.zustand ? ` – Zustand ${b.zustand}` : ''}: ${b.datei}`).join('\n')}\n\n## Abläufe\n${(plan?.ablaeufe || []).map((a) => `- ${a.von} → „${a.knopf}“ → ${a.nach}`).join('\n') || '- keine'}\n`, 'utf8');
    return { datei: paket };
  });

  // Weitergeben: alle gewählten Boards als Bilder, als PDF-Mappe oder als Code
  handle('export:sammlung', async ({ name, boards, art, faktor = 2, ziel, app: appName, ordner }) => {
    const basis = zielOrdner(ziel, appName, ordner);
    if (!Array.isArray(boards) || !boards.length) throw new Error('Keine Boards gewählt.');
    if (art === 'mappe') {
      const seiten = [];
      for (const b of boards.slice(0, 80)) {
        const bild = await fotografiere(htmlFuerApp(b.html, { namenBehalten: true }), b.breite, b.hoehe, 1.5);
        seiten.push({ name: b.name, src: `data:image/png;base64,${bild.toPNG().toString('base64')}` });
      }
      const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{margin:0;font:12px sans-serif;color:#1d2742}.s{page-break-after:always;height:180mm;display:flex;flex-direction:column;gap:6mm}.s:last-child{page-break-after:auto}.s b{font-size:15px}.s img{flex:1;min-height:0;width:100%;object-fit:contain;border:1px solid #e6dfd0}</style></head><body>${seiten.map((x) => `<div class="s"><b>${esc(x.name)}</b><img src="${x.src}"></div>`).join('')}</body></html>`;
      const tmp = path.join(os.tmpdir(), `kranich-mappe-${Date.now()}.html`);
      fs.writeFileSync(tmp, html, 'utf8');
      const w = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true } });
      try {
        await w.loadFile(tmp);
        const pdf = await w.webContents.printToPDF({ landscape: true, printBackground: true, pageSize: 'A4' });
        return { datei: schreibeExport(basis, `${name}-mappe`, 'pdf', pdf) };
      } finally { w.destroy(); fs.rmSync(tmp, { force: true }); }
    }
    let ziel2 = path.join(basis, `${dateiname(name)}-${art === 'code' ? 'code' : 'bilder'}`);
    for (let i = 2; fs.existsSync(ziel2) && i < 100; i++) ziel2 = path.join(basis, `${dateiname(name)}-${art === 'code' ? 'code' : 'bilder'}-${i}`);
    fs.mkdirSync(ziel2, { recursive: true });
    for (const [i, b] of boards.slice(0, 120).entries()) {
      const nr = String(i + 1).padStart(2, '0');
      if (art === 'code') fs.writeFileSync(path.join(ziel2, `${nr}-${dateiname(b.name)}.html`), htmlFuerApp(b.html), 'utf8');
      else fs.writeFileSync(path.join(ziel2, `${nr}-${dateiname(b.name)}.png`), (await fotografiere(htmlFuerApp(b.html, { namenBehalten: true }), b.breite, b.hoehe, Math.max(1, Math.min(3, Number(faktor) || 2)))).toPNG());
    }
    return { datei: ziel2 };
  });

  // PowerPoint: Boards als .pptx (Bild je Folie + Sprechernotizen)
  handle('export:pptx', async ({ name, boards, ziel, app: appName, ordner }) => {
    if (!Array.isArray(boards) || !boards.length) throw new Error('Keine Folien gewählt.');
    const basis = zielOrdner(ziel, appName, ordner);
    const folien = [];
    for (const b of boards.slice(0, 200)) {
      const bild = await fotografiere(htmlFuerApp(b.html, { namenBehalten: true }), b.breite, b.hoehe, Math.min(2, 2400 / b.breite));
      folien.push({ breite: b.breite, hoehe: b.hoehe, png: bild.toPNG(), notiz: b.notiz || '' });
    }
    const puffer = await require('../kern/pptx').pptxSchreiben(folien, { titel: name });
    return { datei: schreibeExport(basis, name, 'pptx', puffer) };
  });
  handle('datei:pptxOeffnen', async () => {
    const r = await dialog.showOpenDialog(fenster, { title: 'PowerPoint öffnen', properties: ['openFile'], filters: [{ name: 'PowerPoint', extensions: ['pptx'] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    const erg = await require('../kern/pptx').pptxLesen(fs.readFileSync(r.filePaths[0]));
    return { name: path.basename(r.filePaths[0]).replace(/\.pptx$/i, ''), ...erg };
  });
  handle('fenster:vollbild', (an) => { fenster?.setFullScreen(Boolean(an)); return true; });

  handle('export:bild', async ({ dataUrl, format, ziel, app: appName, ordner, name, breite, hoehe }) => {
    const zielPfad = zielOrdner(ziel, appName, ordner);
    const { puffer } = dataUrlZuPuffer(dataUrl);
    if (format === 'svg') {
      const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${breite}" height="${hoehe}" viewBox="0 0 ${breite} ${hoehe}"><image width="${breite}" height="${hoehe}" href="data:image/png;base64,${puffer.toString('base64')}"/></svg>`;
      return { datei: schreibeExport(zielPfad, name, 'svg', svg) };
    }
    return { datei: schreibeExport(zielPfad, name, format === 'jpg' ? 'jpg' : 'png', puffer) };
  });
}

function oeffneFenster() {
  fenster = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    title: 'Kranich', backgroundColor: '#6a4fc7',
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#6a4fc7', symbolColor: '#ffffff', height: 46 },
    icon: path.join(__dirname, '..', 'bau', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  fenster.on('closed', () => { werkfensterZu(); if (process.platform !== 'darwin') app.quit(); });
  fenster.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
  // Vom Launcher „Selbst gfaltet“: --oeffne=<projekt-id>
  fenster.webContents.once('did-finish-load', () => { const id = oeffneArg(process.argv); if (id) fenster.webContents.send('start:oeffne', id); });
  // Links aus Entwürfen nie im Programm öffnen.
  fenster.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  fenster.webContents.on('will-navigate', (e) => e.preventDefault());
  return fenster;
}

// Heim-Dienst an/aus je nach Einstellung
let heimServer = null;
let heimStand = '';
function heimdienstAnpassen(neu = false) {
  const e = einstellungen.alle();
  if (e.heimFreigabe && !e.heimEigenerCode) { einstellungen.setze({ heimEigenerCode: Heimdienst.neuerCode() }); return heimdienstAnpassen(true); }
  const stand = e.heimFreigabe ? `${e.heimPort}|${e.heimEigenerCode}` : '';
  if (stand === heimStand && !neu) return;
  if (heimServer) { heimServer.close(); heimServer = null; }
  heimStand = stand;
  if (!stand) return;
  try {
    heimServer = Heimdienst.starte({ port: e.heimPort, code: e.heimEigenerCode, version: app.getVersion(), frageClaude: echtesHirn.frageClaude, einstellungen: () => einstellungen.alle() });
    heimServer.on('error', () => { heimServer = null; heimStand = ''; });
  } catch { heimServer = null; heimStand = ''; }
}

function start() {
  // Für das Startfenster: welche Version ist installiert?
  try { fs.mkdirSync(datenOrdner(), { recursive: true }); fs.writeFileSync(path.join(datenOrdner(), 'version.json'), JSON.stringify({ version: app.getVersion(), pfad: process.execPath })); } catch { /* egal */ }
  projekte = new Projekte(path.join(datenOrdner(), 'projekte'));
  einstellungen = new Einstellungen(path.join(datenOrdner(), 'einstellungen.json'));
  registriere();
  heimdienstAnpassen();
  return oeffneFenster();
}

function oeffneArg(argv) {
  const a = (argv || []).find((x) => String(x).startsWith('--oeffne='));
  const id = a ? a.slice(9) : '';
  return /^[a-z0-9-]{6,40}$/.test(id) ? id : '';
}

module.exports = { start, fotografiere, pruefe };

if (!process.env.KRANICH_RAUCH) {
  // Nur ein Kranich gleichzeitig; ein zweiter Start (z. B. aus dem Launcher) holt das Fenster nach vorn
  if (!app.requestSingleInstanceLock()) app.quit();
  else {
    app.on('second-instance', (_e, argv) => {
      if (!fenster) return;
      if (fenster.isMinimized()) fenster.restore();
      fenster.focus();
      const id = oeffneArg(argv);
      if (id) fenster.webContents.send('start:oeffne', id);
    });
    app.whenReady().then(start);
    app.on('window-all-closed', () => app.quit());
    app.on('before-quit', werkfensterZu);
  }
}
