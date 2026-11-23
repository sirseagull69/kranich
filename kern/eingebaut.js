'use strict';
// Eingebautes Claude: Claude Code, vom Startfenster „Selbst gfaltet“ einmal für
// alle Vögel heruntergeladen, angemeldet mit einem Token (claude setup-token).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function ordner() {
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Selbst gfaltet', 'claude');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Selbst gfaltet', 'claude');
  return path.join(os.homedir(), '.local', 'share', 'selbst-gfaltet', 'claude');
}
const programm = () => path.join(ordner(), process.platform === 'win32' ? 'claude.exe' : 'claude');
function zugang() {
  try { return JSON.parse(fs.readFileSync(path.join(ordner(), 'zugang.json'), 'utf8')); } catch { return {}; }
}
function status() {
  const z = zugang();
  return { da: fs.existsSync(programm()), token: Boolean(z.token), version: z.version || '' };
}
// Für frageClaude: Programm und Umgebung, oder null wenn nicht eingerichtet
function aufruf() {
  const z = zugang();
  if (!z.token || !fs.existsSync(programm())) return null;
  return { programm: programm(), env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: z.token } };
}
module.exports = { ordner, programm, zugang, status, aufruf };
