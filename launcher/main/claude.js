'use strict';
// Eingebautes Claude für alle Vögel: lädt Claude Code (offizielles npm-Paket
// von Anthropic) einmal herunter und speichert den Anmelde-Token.
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawn } = require('child_process');

function ordner() {
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Selbst gfaltet', 'claude');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Selbst gfaltet', 'claude');
  return path.join(os.homedir(), '.local', 'share', 'selbst-gfaltet', 'claude');
}
const programm = () => path.join(ordner(), process.platform === 'win32' ? 'claude.exe' : 'claude');
const zugangDatei = () => path.join(ordner(), 'zugang.json');
function zugang() { try { return JSON.parse(fs.readFileSync(zugangDatei(), 'utf8')); } catch { return {}; } }
function speichereZugang(z) {
  fs.mkdirSync(ordner(), { recursive: true });
  fs.writeFileSync(zugangDatei(), JSON.stringify(z, null, 2), { mode: 0o600 });
}
function status() { const z = zugang(); return { da: fs.existsSync(programm()), token: Boolean(z.token), version: z.version || '' }; }

function plattform() {
  if (process.platform === 'win32') return process.arch === 'arm64' ? 'win32-arm64' : 'win32-x64';
  if (process.platform === 'darwin') return process.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
  return process.arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
}

// Lädt das Paket und packt nur die Programmdatei aus (tar.gz, von Hand gelesen)
async function laden(fetch, beiFortschritt) {
  const info = await (await fetch('https://registry.npmjs.org/@anthropic-ai/claude-code/latest')).json();
  const version = info.version;
  const pkt = `@anthropic-ai/claude-code-${plattform()}`;
  const meta = await (await fetch(`https://registry.npmjs.org/${pkt}/${version}`)).json();
  const url = meta.dist?.tarball;
  if (!url) throw new Error('Paket für dieses System nicht gefunden.');
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`Download klappt nicht (${r.status}).`);
  const gesamt = Number(r.headers.get('content-length')) || 0;
  fs.mkdirSync(ordner(), { recursive: true });
  const ziel = programm();
  const temp = `${ziel}.neu`;
  const name = process.platform === 'win32' ? 'package/claude.exe' : 'package/claude';

  await new Promise((fertig, fehler) => {
    const gunzip = zlib.createGunzip();
    let puffer = Buffer.alloc(0);
    let rest = 0; let polster = 0; let aus = null; let gefunden = false;
    gunzip.on('data', (stueck) => {
      puffer = Buffer.concat([puffer, stueck]);
      for (;;) {
        if (rest > 0) {
          const n = Math.min(rest, puffer.length);
          if (aus) aus.write(puffer.subarray(0, n));
          puffer = puffer.subarray(n); rest -= n;
          if (rest > 0) return;
          if (aus) { const a = aus; aus = null; a.end(); }
          continue;
        }
        if (polster > 0) { const n = Math.min(polster, puffer.length); puffer = puffer.subarray(n); polster -= n; if (polster > 0) return; continue; }
        if (puffer.length < 512) return;
        const kopf = puffer.subarray(0, 512);
        puffer = puffer.subarray(512);
        const dateiname = kopf.subarray(0, 100).toString('utf8').replace(/\0.*$/s, '');
        if (!dateiname) continue;
        const groesse = parseInt(kopf.subarray(124, 136).toString('utf8').replace(/\0.*$/s, '').trim() || '0', 8);
        rest = groesse; polster = (512 - (groesse % 512)) % 512;
        if (dateiname === name) { gefunden = true; aus = fs.createWriteStream(temp, { mode: 0o755 }); }
        if (rest === 0) continue;
      }
    });
    gunzip.on('end', () => { if (!gefunden) return fehler(new Error('Programmdatei nicht im Paket.')); setTimeout(fertig, 300); });
    gunzip.on('error', fehler);
    (async () => {
      const leser = r.body.getReader(); let geladen = 0; let zuletzt = -1;
      for (;;) {
        const { done, value } = await leser.read();
        if (done) break;
        geladen += value.length;
        const pct = gesamt ? Math.round((geladen / gesamt) * 100) : 0;
        if (pct !== zuletzt) { zuletzt = pct; beiFortschritt(pct); }
        if (!gunzip.write(Buffer.from(value))) await new Promise((ok) => gunzip.once('drain', ok));
      }
      gunzip.end();
    })().catch(fehler);
  });
  fs.renameSync(temp, ziel);
  if (process.platform !== 'win32') fs.chmodSync(ziel, 0o755);
  speichereZugang({ ...zugang(), version });
  return version;
}

// Token prüfen: einmal kurz fragen
function teste(token) {
  return new Promise((ok) => {
    const kind = spawn(programm(), ['-p', '--output-format', 'json', '--model', 'haiku', '--tools', '', '--no-session-persistence'], { env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: token }, windowsHide: true });
    let aus = '';
    const uhr = setTimeout(() => { kind.kill(); ok({ fehler: 'Claude hat zu lange gebraucht.' }); }, 90000);
    kind.stdout.on('data', (d) => { aus += d; });
    kind.on('error', (e) => { clearTimeout(uhr); ok({ fehler: e.message }); });
    kind.on('close', () => {
      clearTimeout(uhr);
      try { const d = JSON.parse(aus.trim().split('\n').pop()); if (!d.is_error) return ok({ ok: true }); ok({ fehler: String(d.result || 'Token passt nicht.').slice(0, 200) }); } catch { ok({ fehler: 'Token passt nicht oder Claude antwortet nicht.' }); }
    });
    kind.stdin.end('Antworte nur mit OK.');
  });
}
async function setzeToken(token) {
  const t = String(token || '').trim();
  if (!/^sk-ant-[\w-]{20,}$/.test(t)) return { fehler: 'Das sieht nicht wie ein Token aus (beginnt mit sk-ant-).' };
  const r = await teste(t);
  if (r.fehler) return r;
  speichereZugang({ ...zugang(), token: t });
  return { ok: true };
}
function abmelden() { const z = zugang(); delete z.token; speichereZugang(z); return status(); }

// Öffnet ein Terminal, in dem sich Claude den Token holt (claude setup-token)
function anmeldenFenster() {
  const p = programm();
  if (!fs.existsSync(p)) return { fehler: 'Erst Claude einrichten.' };
  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/c', 'start', '"Claude anmelden"', 'cmd', '/k', `"${p}" setup-token`], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).unref();
  } else if (process.platform === 'darwin') {
    spawn('osascript', ['-e', `tell application "Terminal" to do script "'${p.replace(/'/g, "'\\''")}' setup-token"`, '-e', 'tell application "Terminal" to activate'], { detached: true, stdio: 'ignore' }).unref();
  } else return { fehler: 'Nur Windows und Mac.' };
  return { ok: true };
}

module.exports = { status, laden, setzeToken, abmelden, anmeldenFenster };
