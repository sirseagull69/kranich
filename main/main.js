'use strict';
// Hauptprozess von Kranich.

const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { Projekte } = require('../kern/projekte');
const { Einstellungen } = require('../kern/einstellungen');
const echtesHirn = require('../kern/hirn');
// Für Rauchtest und Entwicklung ohne Konto: Claude vorspielen.
const hirn = process.env.KRANICH_SPIELHIRN ? { ...echtesHirn, frage: require('../werkzeug/spielhirn').frage } : echtesHirn;
const A = require('../kern/auftraege');
const { htmlFuerApp, svgAusHtml, dateiname } = require('../kern/export');
const { FORMATE, GRUPPEN, format: formatVon, eigenesFormat } = require('../kern/formate');
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
async function fotografiere(html, breite, hoehe, faktor = 1) {
  const datei = path.join(os.tmpdir(), `kranich-foto-${Date.now()}.html`);
  // Eigene Schriften mitgeben, damit das Foto auch ohne Internet stimmt.
  const schrift = `<link rel="stylesheet" href="${require('node:url').pathToFileURL(path.join(__dirname, '..', 'ui', 'schrift', 'schrift.css')).href}">`;
  const mitSchrift = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + schrift) : schrift + html;
  fs.writeFileSync(datei, mitSchrift, 'utf8');
  const w = new BrowserWindow({
    show: false, width: Math.round(breite * faktor), height: Math.round(hoehe * faktor),
    useContentSize: true, frame: false,
    webPreferences: { offscreen: true, javascript: false, sandbox: true },
  });
  try {
    await w.loadFile(datei);
    w.webContents.setZoomFactor(faktor);
    await new Promise((r) => setTimeout(r, 600));
    const bild = await w.webContents.capturePage({ x: 0, y: 0, width: Math.round(breite * faktor), height: Math.round(hoehe * faktor) });
    return bild;
  } finally {
    w.destroy();
    fs.rm(datei, { force: true }, () => {});
  }
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
  const w = new BrowserWindow({ show: false, width: opt.breite, height: opt.hoehe, useContentSize: true, frame: false, webPreferences: { offscreen: true, sandbox: true } });
  try {
    await w.loadFile(datei);
    await new Promise((r) => setTimeout(r, 400));
    const roh = await w.webContents.executeJavaScript(`${PR.messCode}(${JSON.stringify(opt)})`);
    return PR.bewerte(roh);
  } finally {
    w.destroy();
    fs.rm(datei, { force: true }, () => {});
  }
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
  handle('einstellungen:lesen', () => einstellungen.fuerOberflaeche());
  handle('einstellungen:setzen', (neu) => einstellungen.setze(neu));
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
    try {
      const klein = Boolean(html && auswahl && wunsch.length < 80);
      const { text, weg } = await hirn.frage({ system, auftrag, bilder }, e, { klein });
      return { ...A.leseEntwurf(text), weg };
    } finally {
      for (const b of bilder) fs.rm(b, { force: true }, () => {});
    }
  });

  handle('formate:liste', () => ({ formate: FORMATE, gruppen: GRUPPEN }));
  handle('formate:eigen', (b, h, einheit) => eigenesFormat(b, h, einheit));

  handle('kranich:anpassen', async ({ html, von, nach, texteAnpassen }) => {
    const e = einstellungen.alle();
    const { text, weg } = await hirn.frage({ system: A.systemEntwurf(e), auftrag: A.auftragAnpassen({ html, von, nach, texteAnpassen }) }, e);
    return { ...A.leseEntwurf(text), weg };
  });

  // Ganze App entwerfen
  handle('kranich:appPlan', async ({ beschreibung, geraet, zustaende }) => {
    const e = einstellungen.alle();
    const { text, weg } = await hirn.frage({ system: AP.systemPlan(e), auftrag: AP.auftragPlan({ beschreibung, geraet, zustaende }) }, e);
    const plan = AP.lesePlanApp(text, { geraet });
    return { plan, boards: AP.legeBoards(AP.boardsAusPlan(plan)), weg };
  });
  handle('kranich:bausteine', async ({ plan }) => {
    const e = einstellungen.alle();
    const { text } = await hirn.frage({ system: AP.systemBausteine(e), auftrag: AP.auftragBausteine(plan) }, e);
    return AP.leseBausteine(text);
  });
  handle('kranich:appBoard', async ({ plan, board, css }) => {
    const e = einstellungen.alle();
    const { text } = await hirn.frage({ system: A.systemEntwurf(e), auftrag: AP.auftragAppBoard({ plan, board, css }) }, e);
    return A.leseEntwurf(text);
  });
  handle('kranich:pruefen', async ({ html, format: f }) => ({ funde: await pruefe(html, typeof f === 'string' ? formatVon(f) : f) }));
  handle('kranich:reparieren', async ({ html, probleme, breite, hoehe }) => {
    const e = einstellungen.alle();
    const { text } = await hirn.frage({ system: A.systemEntwurf(e), auftrag: PR.auftragReparieren({ html, probleme, breite, hoehe }) }, e);
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
    title: 'Kranich', backgroundColor: '#f6f1e7',
    icon: path.join(__dirname, '..', 'bau', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  fenster.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
  // Links aus Entwürfen nie im Programm öffnen.
  fenster.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  fenster.webContents.on('will-navigate', (e) => e.preventDefault());
  return fenster;
}

function start() {
  projekte = new Projekte(path.join(datenOrdner(), 'projekte'));
  einstellungen = new Einstellungen(path.join(datenOrdner(), 'einstellungen.json'));
  registriere();
  return oeffneFenster();
}

module.exports = { start, fotografiere, pruefe };

if (!process.env.KRANICH_RAUCH) {
  app.whenReady().then(start);
  app.on('window-all-closed', () => app.quit());
}
