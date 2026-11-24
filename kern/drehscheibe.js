'use strict';
// Ori Office – Drehscheibe: verbindet alle offenen Vögel auf diesem PC, damit Ori zwischen den Apps arbeiten kann.
// Quelle: gemeinsam/drehscheibe.js – wird mit gemeinsam/verteilen.sh in jede App kopiert. Nicht in den Apps ändern.
//
// So geht's: Fester Port auf 127.0.0.1. Wer zuerst kommt, macht die Drehscheibe auf (Startfenster oder eine App).
// Alle anderen verbinden sich. Geht der Besitzer zu, übernimmt der Nächste. Nachrichten: eine JSON-Zeile pro Nachricht.
// Ein Geheimnis in %APPDATA%/Ori Office/drehscheibe.json sorgt dafür, dass nur Programme dieses Benutzers mitmachen.
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.ORI_DREHSCHEIBE_PORT) || 47471;

function zeilen(sock, beiNachricht) {
  let puffer = '';
  sock.setEncoding('utf8');
  sock.on('data', (d) => {
    puffer += d;
    if (puffer.length > 20 * 1024 * 1024) { sock.destroy(); return; } // Schutz
    let i;
    while ((i = puffer.indexOf('\n')) >= 0) {
      const z = puffer.slice(0, i); puffer = puffer.slice(i + 1);
      if (!z.trim()) continue;
      let m; try { m = JSON.parse(z); } catch { continue; }
      beiNachricht(m);
    }
  });
}
const schreibe = (sock, m) => { try { if (sock && !sock.destroyed) sock.write(`${JSON.stringify(m)}\n`); } catch { /* weg */ } };

// ---------- Die Drehscheibe selbst ----------
function oeffneScheibe(datei, beiFehler) {
  return new Promise((fertig) => {
    const token = crypto.randomBytes(24).toString('hex');
    const apps = new Map(); // name → { sock, info }
    const wege = new Map(); // anfrage-id → sock (wohin die Antwort geht)
    const server = net.createServer((sock) => {
      let name = null;
      zeilen(sock, (m) => {
        if (m.typ === 'hallo') {
          if (m.token !== token) { sock.destroy(); return; }
          name = String(m.app || '').slice(0, 40);
          apps.get(name)?.sock?.destroy();
          apps.set(name, { sock, info: { app: name, titel: m.titel || name, seit: Date.now() } });
          schreibe(sock, { typ: 'willkommen' });
          return;
        }
        if (!name) { sock.destroy(); return; }
        if (m.anfrage) {
          if (m.an === '*') { // Fragen an die Drehscheibe selbst
            if (m.typ === 'apps') schreibe(sock, { antwortAuf: m.anfrage, daten: { apps: [...apps.values()].map((a) => a.info) } });
            else schreibe(sock, { antwortAuf: m.anfrage, daten: { fehler: 'Unbekannte Frage.' } });
            return;
          }
          const ziel = apps.get(m.an);
          if (!ziel) { schreibe(sock, { antwortAuf: m.anfrage, daten: { fehler: `${m.an} ist gerade nicht offen.`, nichtOffen: true } }); return; }
          wege.set(m.anfrage, sock);
          schreibe(ziel.sock, { ...m, von: name });
          setTimeout(() => wege.delete(m.anfrage), 120000);
          return;
        }
        if (m.antwortAuf) { const z = wege.get(m.antwortAuf); wege.delete(m.antwortAuf); schreibe(z, m); }
      });
      sock.on('error', () => {});
      sock.on('close', () => { if (name && apps.get(name)?.sock === sock) apps.delete(name); });
    });
    server.on('error', (f) => { fertig(null); if (f.code !== 'EADDRINUSE') beiFehler?.(f); });
    server.listen(PORT, '127.0.0.1', () => {
      try { fs.mkdirSync(path.dirname(datei), { recursive: true }); fs.writeFileSync(datei, JSON.stringify({ port: PORT, token, pid: process.pid })); } catch (f) { beiFehler?.(f); }
      fertig({ server, apps, schliessen: () => new Promise((r) => { for (const a of apps.values()) a.sock.destroy(); server.close(() => r()); }) });
    });
  });
}

// ---------- Ein Teilnehmer (jede App, auch das Startfenster) ----------
// name: 'schwalbe' | 'albatros' | 'kranich' | 'specht' | 'startfenster' …
// beiAnfrage(typ, m) → Promise<daten>: was diese App auf eine Anfrage antwortet (lesen, einsetzen, zeigen …)
function starte({ name, titel, ordner, beiAnfrage, beiVerbunden }) {
  const datei = path.join(ordner, 'drehscheibe.json');
  let sock = null; let scheibe = null; let zu = false; let nr = 0; let warte = null;
  const offen = new Map();

  const nochmal = (ms) => { if (zu) return; clearTimeout(warte); warte = setTimeout(verbinde, ms + Math.random() * 400); };

  function verbinde() {
    if (zu || sock) return;
    let info = null; try { info = JSON.parse(fs.readFileSync(datei, 'utf8')); } catch { /* noch keine */ }
    const s = net.connect(PORT, '127.0.0.1');
    let geklappt = false;
    s.on('connect', () => {
      geklappt = true; sock = s;
      // Geheimnis frisch lesen (die Scheibe schreibt es nach dem Öffnen)
      try { info = JSON.parse(fs.readFileSync(datei, 'utf8')); } catch { /* egal */ }
      schreibe(s, { typ: 'hallo', app: name, titel, token: info?.token });
    });
    zeilen(s, async (m) => {
      if (m.typ === 'willkommen') { beiVerbunden?.(true); return; }
      if (m.antwortAuf) { const p = offen.get(m.antwortAuf); if (p) { offen.delete(m.antwortAuf); p(m.daten); } return; }
      if (m.anfrage) {
        let daten;
        try { daten = await beiAnfrage(m.typ, m); } catch (f) { daten = { fehler: f.message || String(f) }; }
        schreibe(s, { antwortAuf: m.anfrage, daten: daten ?? { ok: true } });
      }
    });
    s.on('error', () => {});
    s.on('close', async () => {
      if (sock === s) { sock = null; beiVerbunden?.(false); for (const p of offen.values()) p({ fehler: 'Verbindung zur Drehscheibe weg.' }); offen.clear(); }
      if (zu) return;
      if (!geklappt) {
        // Niemand da → selbst aufmachen
        if (!scheibe) scheibe = await oeffneScheibe(datei);
        nochmal(scheibe ? 50 : 1000);
      } else nochmal(300);
    });
  }

  function frage(an, typ, extra = {}, msWarten = 60000) {
    return new Promise((r) => {
      if (!sock) { r({ fehler: 'Noch nicht mit den anderen Apps verbunden.' }); return; }
      const id = `${name}-${Date.now().toString(36)}-${++nr}`;
      offen.set(id, r);
      schreibe(sock, { ...extra, anfrage: id, an, typ });
      setTimeout(() => { if (offen.has(id)) { offen.delete(id); r({ fehler: `${an} antwortet nicht.` }); } }, msWarten);
    });
  }

  verbinde();
  return {
    frage,
    apps: async () => (await frage('*', 'apps', {}, 5000)).apps || [],
    verbunden: () => Boolean(sock),
    stopp: async () => { zu = true; clearTimeout(warte); sock?.destroy(); if (scheibe) await scheibe.schliessen(); },
  };
}

// Hilfe für Electron-Apps: Anfragen an die Oberfläche (window.OriBruecke) weiterreichen.
function anOberflaeche(fensterHolen) {
  return async (typ, m) => {
    const w = fensterHolen();
    if (!w || w.isDestroyed()) return { fehler: 'Das Fenster ist zu.' };
    if (typ === 'zeigen') { if (w.isMinimized()) w.restore(); w.show(); w.focus(); return { ok: true }; }
    const arg = JSON.stringify({ typ, inhalt: m.inhalt ?? null, von: m.von || '' });
    return w.webContents.executeJavaScript(`(async () => { const b = window.OriBruecke; if (!b) return { fehler: 'Diese App kann das noch nicht.' }; const a = ${arg}; const f = b[a.typ]; if (typeof f !== 'function') return { fehler: 'Kann ich nicht: ' + a.typ }; return await f(a.inhalt, a.von); })()`, true)
      .catch((f) => ({ fehler: f.message || String(f) }));
  };
}

module.exports = { starte, anOberflaeche, PORT };
