'use strict';
// Abklopfen: fragt jeden Server und Switch per Ping, ob er antwortet.
// Specht ändert dabei nichts – Ping liest nur.
const { execFile } = require('node:child_process');

function pingBefehl(ip, plattform = process.platform) {
  if (plattform === 'win32') return ['ping', ['-n', '1', '-w', '1500', ip]];
  if (plattform === 'darwin') return ['ping', ['-c', '1', '-W', '1500', ip]];
  return ['ping', ['-c', '1', '-W', '2', ip]];
}

// true = antwortet. Unter Windows meldet ping auch bei „Ziel nicht erreichbar“
// manchmal Erfolg – darum zählt nur eine Antwort mit TTL.
function werte(code, ausgabe) {
  return code === 0 && /ttl[=:]/i.test(String(ausgabe || ''));
}

function pinge(ip, { _exec = execFile, plattform = process.platform } = {}) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(String(ip))) return Promise.resolve({ ip, an: false, ms: null, fehler: 'keine gültige IP' });
  const [befehl, args] = pingBefehl(ip, plattform);
  const start = Date.now();
  return new Promise((ok) => {
    _exec(befehl, args, { timeout: 5000, windowsHide: true }, (fehler, stdout) => {
      const an = werte(fehler ? (fehler.code ?? 1) : 0, stdout);
      const m = /(?:zeit|time)[=<]\s*(\d+)/i.exec(String(stdout || ''));
      ok({ ip, an, ms: an ? (m ? Number(m[1]) : Date.now() - start) : null });
    });
  });
}

// Alle Ziele, höchstens 8 gleichzeitig
async function klopfeAlle(ziele, opt = {}) {
  const ergebnis = {};
  const liste = [...ziele];
  const arbeiter = async () => {
    while (liste.length) {
      const z = liste.shift();
      ergebnis[z.id] = { ...(await pinge(z.ip, opt)), zeit: new Date().toISOString() };
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, ziele.length) }, arbeiter));
  return ergebnis;
}

module.exports = { pinge, klopfeAlle, werte, pingBefehl };
