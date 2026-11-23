'use strict';
// Heim-Dienst: Kranich auf dem Heim-PC nimmt Aufträge von anderen Geräten an
// (z. B. Arbeits-Notebook ohne Claude Code), lässt sie vom Claude Code auf
// diesem PC erledigen und schickt die Antwort zurück.
// Geschützt mit einem Kopplungscode; ohne richtigen Code passiert nichts.

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MAX_BYTES = 40 * 1024 * 1024;

function neuerCode() {
  return crypto.randomBytes(12).toString('base64url');
}

function codeStimmt(erwartet, bekommen) {
  const a = Buffer.from(String(erwartet || ''));
  const b = Buffer.from(String(bekommen || ''));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function starte({ port = 4747, code, version = '', frageClaude, einstellungen }) {
  let laeuft = 0;
  const server = http.createServer((req, res) => {
    const antworte = (status, daten) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(daten)); };
    if (!codeStimmt(code, req.headers['x-kranich-code'])) return antworte(401, { fehler: 'Falscher Kopplungscode.' });
    if (req.method === 'GET' && req.url === '/kranich/ping') return antworte(200, { ok: true, name: 'Kranich', version, laeuft });
    if (req.method !== 'POST' || req.url !== '/kranich/hirn') return antworte(404, { fehler: 'Unbekannt.' });
    if (laeuft >= 4) return antworte(429, { fehler: 'Der Heim-PC ist gerade voll beschäftigt.' });
    let groesse = 0;
    const teile = [];
    req.on('data', (d) => { groesse += d.length; if (groesse > MAX_BYTES) { req.destroy(); } else teile.push(d); });
    req.on('end', async () => {
      let ordner = null;
      laeuft += 1;
      try {
        const a = JSON.parse(Buffer.concat(teile).toString('utf8'));
        const bilder = [];
        if (Array.isArray(a.bilder) && a.bilder.length) {
          ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-heim-'));
          a.bilder.slice(0, 6).forEach((b, i) => {
            const endung = /^(png|jpg|jpeg|webp)$/.test(b.endung) ? b.endung : 'png';
            const ziel = path.join(ordner, `bild-${i + 1}.${endung}`);
            fs.writeFileSync(ziel, Buffer.from(String(b.daten || ''), 'base64'));
            bilder.push(ziel);
          });
        }
        const e = einstellungen();
        const text = await frageClaude({
          system: String(a.system || ''), auftrag: String(a.auftrag || ''), bilder,
          modell: a.schnell ? 'sonnet' : (/^(opus|sonnet|haiku)$/.test(a.modell) ? a.modell : 'opus'),
          programm: e.claudeProgramm || 'claude',
        });
        antworte(200, { text });
      } catch (f) {
        antworte(200, { fehler: { art: f.art || 'antwort', nachricht: f.message || 'Fehler auf dem Heim-PC.' } });
      } finally {
        laeuft -= 1;
        if (ordner) fs.rm(ordner, { recursive: true, force: true }, () => {});
      }
    });
  });
  server.requestTimeout = 360000;
  server.listen(port, '0.0.0.0');
  return server;
}

module.exports = { starte, neuerCode, codeStimmt };
