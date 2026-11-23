'use strict';
// Das Hirn von Kranich: schickt einen Auftrag an ein Sprachmodell und gibt
// den Text der Antwort zurück.
//
// Drei Wege:
//   claude  – das Programm "claude" (Claude Code) auf diesem Rechner, angemeldet
//             mit Nils' Claude-Konto. Standard, wie bei origami.
//   api     – Anthropic-API mit eigenem Schlüssel (falls kein claude installiert ist).
//   lokal   – Ollama auf dem PC (z. B. gemma4:26b), für kleine Änderungen und
//             als Rückfallebene, wenn Claude nicht erreichbar ist.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Eingebaut = require('./eingebaut');

class HirnFehler extends Error {
  constructor(art, nachricht, details) {
    super(nachricht);
    this.art = art; // 'keine-verbindung' | 'nicht-angemeldet' | 'nicht-installiert' | 'antwort'
    this.details = details || '';
  }
}

function zitiereWin(wert) {
  return `"${String(wert).replace(/"/g, '\\"')}"`;
}

// Ruft "claude -p" auf. Auftrag und Systemtext gehen über stdin bzw. eine
// Datei, damit lange Entwürfe nicht an der Länge der Befehlszeile scheitern.
function frageClaude({ system, auftrag, bilder = [], modell = 'opus', programm = 'claude', env = null, zeitlimitMs = 240000, _spawn = spawn }) {
  return new Promise((resolve, reject) => {
    const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-'));
    const systemDatei = path.join(ordner, 'system.txt');
    fs.writeFileSync(systemDatei, system || '', 'utf8');

    let text = auftrag;
    const args = ['-p', '--output-format', 'json', '--system-prompt-file', systemDatei,
      '--no-session-persistence', '--strict-mcp-config', '--model', modell];
    if (bilder.length) {
      // Claude darf nur die angehängten Bilder lesen, sonst nichts.
      const bildOrdner = path.join(ordner, 'bilder');
      fs.mkdirSync(bildOrdner);
      const namen = bilder.map((b, i) => {
        const ziel = path.join(bildOrdner, `bild-${i + 1}${path.extname(b) || '.png'}`);
        fs.copyFileSync(b, ziel);
        return ziel;
      });
      args.push('--tools', 'Read', '--allowedTools', 'Read', '--add-dir', bildOrdner);
      text += `\n\nANGEHÄNGTE BILDER (mit dem Werkzeug Read ansehen):\n${namen.join('\n')}`;
    } else {
      args.push('--tools', '');
    }

    const win = process.platform === 'win32';
    const kind = win
      ? _spawn([programm, ...args].map((a) => (a === '' ? '""' : zitiereWin(a))).join(' '), { shell: true, windowsHide: true, env: env || process.env })
      : _spawn(programm, args, { env: env || process.env });

    let aus = '';
    let fehler = '';
    const uhr = setTimeout(() => {
      kind.kill();
      reject(new HirnFehler('keine-verbindung', 'Claude hat zu lange gebraucht.'));
    }, zeitlimitMs);

    const aufraeumen = () => {
      clearTimeout(uhr);
      fs.rm(ordner, { recursive: true, force: true }, () => {});
    };

    kind.stdout.on('data', (d) => { aus += d; });
    kind.stderr.on('data', (d) => { fehler += d; });
    kind.on('error', (e) => {
      aufraeumen();
      if (e.code === 'ENOENT') reject(new HirnFehler('nicht-installiert', 'Claude Code ist auf diesem Rechner nicht installiert.'));
      else reject(new HirnFehler('keine-verbindung', 'Claude ließ sich nicht starten.', e.message));
    });
    kind.on('close', (code) => {
      aufraeumen();
      let daten = null;
      try { daten = JSON.parse(aus.trim().split('\n').pop()); } catch { /* unten behandelt */ }
      if (daten && !daten.is_error && typeof daten.result === 'string') return resolve(daten.result);
      const roh = `${daten?.result || ''} ${fehler} ${aus}`.toLowerCase();
      if (code === 127 || /not recognized|nicht als interner|command not found/.test(roh)) {
        return reject(new HirnFehler('nicht-installiert', 'Claude Code ist auf diesem Rechner nicht installiert.'));
      }
      if (/log ?in|authenticat|anmeld|unauthorized|401/.test(roh)) {
        return reject(new HirnFehler('nicht-angemeldet', 'Claude Code ist nicht angemeldet. Einmal im Terminal "claude" starten und anmelden.'));
      }
      if (/network|econn|enotfound|timed? ?out|overloaded|529|503/.test(roh)) {
        return reject(new HirnFehler('keine-verbindung', 'Kranich kommt gerade nicht an Claude ran.', roh.slice(0, 400)));
      }
      reject(new HirnFehler('antwort', 'Claude hat keine brauchbare Antwort geschickt.', (daten?.result || fehler || aus).slice(0, 400)));
    });

    kind.stdin.end(text, 'utf8');
  });
}

async function frageApi({ system, auftrag, bilder = [], modell = 'claude-opus-5-5', schluessel, _fetch = fetch }) {
  if (!schluessel) throw new HirnFehler('nicht-angemeldet', 'Kein API-Schlüssel hinterlegt.');
  const inhalt = [];
  for (const b of bilder) {
    const endung = path.extname(b).slice(1).toLowerCase();
    const typ = endung === 'jpg' || endung === 'jpeg' ? 'image/jpeg' : endung === 'webp' ? 'image/webp' : 'image/png';
    inhalt.push({ type: 'image', source: { type: 'base64', media_type: typ, data: fs.readFileSync(b).toString('base64') } });
  }
  inhalt.push({ type: 'text', text: auftrag });
  let antwort;
  try {
    antwort = await _fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': schluessel, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: modell, max_tokens: 16000, system, messages: [{ role: 'user', content: inhalt }] }),
    });
  } catch (e) {
    throw new HirnFehler('keine-verbindung', 'Kranich kommt gerade nicht an Claude ran.', e.message);
  }
  if (antwort.status === 401) throw new HirnFehler('nicht-angemeldet', 'Der API-Schlüssel stimmt nicht.');
  if (!antwort.ok) throw new HirnFehler('keine-verbindung', `Claude antwortet mit Fehler ${antwort.status}.`);
  const daten = await antwort.json();
  return (daten.content || []).filter((t) => t.type === 'text').map((t) => t.text).join('');
}

async function frageLokal({ system, auftrag, bilder = [], modell = 'gemma4:26b', adresse = 'http://127.0.0.1:11434', _fetch = fetch }) {
  let antwort;
  try {
    antwort = await _fetch(`${adresse}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: modell,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: auftrag, images: bilder.map((b) => fs.readFileSync(b).toString('base64')) },
        ],
      }),
    });
  } catch (e) {
    throw new HirnFehler('keine-verbindung', 'Das Modell auf dem PC ist nicht erreichbar (läuft Ollama?).', e.message);
  }
  if (!antwort.ok) throw new HirnFehler('keine-verbindung', `Ollama antwortet mit Fehler ${antwort.status}.`);
  const daten = await antwort.json();
  return daten.message?.content || '';
}

// Claude Code auf diesem Rechner; fehlt es, das eingebaute Claude vom Startfenster.
async function frageClaudeHier(auftrag, e, schnell) {
  const modell = schnell ? 'sonnet' : (e.claudeModell || 'opus');
  try {
    return { text: await frageClaude({ ...auftrag, modell, programm: e.claudeProgramm || 'claude' }), weg: 'claude' };
  } catch (f) {
    if (f.art !== 'nicht-installiert') throw f;
    const eb = Eingebaut.aufruf();
    if (!eb) throw new HirnFehler('nicht-installiert', 'Hier ist kein Claude da. Im Startfenster „Selbst gfaltet“ unter Einstellungen → „Claude einrichten“ geht es ohne Installation.');
    return { text: await frageClaude({ ...auftrag, modell, programm: eb.programm, env: eb.env }), weg: 'eingebaut' };
  }
}

// Fragt Kranich auf dem Heim-PC (Heim-Dienst), der dort Claude Code benutzt.
async function frageHeim({ system, auftrag, bilder = [], modell = 'opus', schnell = false, adresse, code, zeitlimitMs = 330000, _fetch = fetch }) {
  if (!adresse) throw new HirnFehler('keine-verbindung', 'Keine Adresse vom Heim-PC eingetragen.');
  const ziel = `${String(adresse).replace(/\/+$/, '')}/kranich/hirn`;
  const daten = {
    system, auftrag, modell, schnell,
    bilder: bilder.map((b) => ({ endung: path.extname(b).slice(1).toLowerCase(), daten: fs.readFileSync(b).toString('base64') })),
  };
  const ab = new AbortController();
  const uhr = setTimeout(() => ab.abort(), zeitlimitMs);
  let antwort;
  try {
    antwort = await _fetch(ziel, { method: 'POST', headers: { 'content-type': 'application/json', 'x-kranich-code': code || '' }, body: JSON.stringify(daten), signal: ab.signal });
  } catch (e) {
    throw new HirnFehler('keine-verbindung', 'Der Heim-PC ist nicht erreichbar (aus, oder Kranich dort zu?).', e.message);
  } finally { clearTimeout(uhr); }
  if (antwort.status === 401) throw new HirnFehler('nicht-angemeldet', 'Der Kopplungscode passt nicht zum Heim-PC.');
  if (!antwort.ok) throw new HirnFehler('keine-verbindung', `Der Heim-PC antwortet mit Fehler ${antwort.status}.`);
  const r = await antwort.json();
  if (r.fehler) throw new HirnFehler(r.fehler.art || 'antwort', `Heim-PC: ${r.fehler.nachricht}`);
  return r.text || '';
}

// Wählt den Weg nach den Einstellungen. Bei "klein" (kleine Änderung) und
// eingeschaltetem lokalem Modell wird zuerst lokal gefragt; scheitert Claude
// an der Verbindung, springt das lokale Modell ein, wenn erlaubt.
// "schnell": Sonnet statt Opus – für Zustands-Boards und Reparaturen.
async function frage(auftrag, einstellungen = {}, { klein = false, schnell = false } = {}) {
  const e = einstellungen;
  const lokalErlaubt = Boolean(e.lokalAn);
  const lokal = () => frageLokal({ ...auftrag, modell: e.lokalModell || 'gemma4:26b', adresse: e.lokalAdresse || 'http://127.0.0.1:11434' });
  const gross = () => (e.weg === 'api'
    ? frageApi({ ...auftrag, modell: schnell ? 'claude-sonnet-5-5' : (e.apiModell || 'claude-opus-5-5'), schluessel: e.apiSchluessel })
    : frageClaude({ ...auftrag, modell: schnell ? 'sonnet' : (e.claudeModell || 'opus'), programm: e.claudeProgramm || 'claude' }));

  if (klein && lokalErlaubt && !auftrag.bilder?.length) {
    try { return { text: await lokal(), weg: 'lokal' }; } catch { /* dann Claude */ }
  }
  if (e.weg === 'heim') {
    try {
      return { text: await frageHeim({ ...auftrag, modell: e.claudeModell || 'opus', schnell, adresse: e.heimAdresse, code: e.heimCode }), weg: 'heim' };
    } catch (heimFehler) {
      if (heimFehler.art !== 'keine-verbindung' && heimFehler.art !== 'nicht-angemeldet') throw heimFehler;
      // Heim-PC nicht da: Claude Code hier oder das eingebaute Claude
      try {
        return await frageClaudeHier(auftrag, e, schnell);
      } catch (f) {
        if (f.art === 'nicht-installiert') throw heimFehler;
        throw f;
      }
    }
  }
  try {
    if (e.weg !== 'api') return await frageClaudeHier(auftrag, e, schnell);
    return { text: await gross(), weg: 'api' };
  } catch (fehler) {
    if (lokalErlaubt && fehler.art === 'keine-verbindung' && klein) {
      return { text: await lokal(), weg: 'lokal' };
    }
    throw fehler;
  }
}

module.exports = { frage, frageClaude, frageApi, frageLokal, frageHeim, HirnFehler };
