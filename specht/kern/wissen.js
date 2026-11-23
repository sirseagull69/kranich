'use strict';
// Wissen von Specht: kommt NICHT mit der App (die liegt öffentlich zum Download),
// sondern aus einer Wissens-Datei, die Nils einmal lädt. Danach liegt es als
// Eintrag in seinem Konto (nur er kann es lesen) und kommt per Sync auf jedes Gerät.
const LEER = { STAND: '', SERVER: [], NETZ: [], BACKUP: { stand: '', ziele: [] } };
const IP = /^\d{1,3}(\.\d{1,3}){3}$/;
const txt = (v, n = 300) => String(v ?? '').slice(0, n);
const liste = (v, n = 20) => (Array.isArray(v) ? v.slice(0, n).map((x) => txt(x, 400)) : []);

// Prüft und säubert eine Wissens-Datei. Wirft bei Unsinn einen verständlichen Fehler.
function pruefe(roh) {
  let d = roh;
  if (typeof roh === 'string') { try { d = JSON.parse(roh); } catch { throw new Error('Die Datei ist keine gültige Wissens-Datei (kein JSON).'); } }
  if (!d || d.art !== 'specht-wissen' || !Array.isArray(d.SERVER)) throw new Error('Das ist keine Specht-Wissens-Datei.');
  const server = d.SERVER.slice(0, 300).filter((s) => s && s.name && IP.test(s.ip)).map((s) => ({
    id: txt(s.id || s.name, 60).toLowerCase(), art: 'server', name: txt(s.name, 60), ip: s.ip, rolle: txt(s.rolle, 80),
    laeuft: liste(s.laeuft), ...(s.haengt ? { haengt: liste(s.haengt) } : {}), ...(s.hinweis ? { hinweis: txt(s.hinweis, 400) } : {}), ...(s.wichtig ? { wichtig: true } : {}),
  }));
  const netz = (Array.isArray(d.NETZ) ? d.NETZ : []).slice(0, 200).filter((n) => n && n.name && IP.test(n.ip)).map((n) => ({ id: txt(n.id || n.name, 60).toLowerCase(), name: txt(n.name, 80), ip: n.ip, gruppe: txt(n.gruppe || 'Netz', 40) }));
  const b = d.BACKUP || {};
  const backup = { stand: txt(b.stand, 80), ziele: (Array.isArray(b.ziele) ? b.ziele : []).slice(0, 30).map((z) => ({ name: txt(z.name, 80), frei: txt(z.frei, 30), gesamt: txt(z.gesamt, 30), voll: Math.max(0, Math.min(100, Number(z.voll) || 0)) })) };
  if (/passwort\s*[:=]|kennwort\s*[:=]|password\s*[:=]/i.test(JSON.stringify(d))) throw new Error('In der Datei steht etwas, das wie ein Passwort aussieht. Passwörter gehören in Passbolt – bitte rausnehmen.');
  return {
    grund: { STAND: txt(d.STAND, 120), KONTEXT: txt(d.KONTEXT, 3000), VORSCHLAEGE: liste(d.VORSCHLAEGE, 4).map((v) => v.slice(0, 80)), SERVER: server, NETZ: netz, BACKUP: backup },
    stoerungen: (Array.isArray(d.STOERUNGEN) ? d.STOERUNGEN : []).slice(0, 500),
    anleitungen: (Array.isArray(d.ANLEITUNGEN) ? d.ANLEITUNGEN : []).slice(0, 200),
    netzOffen: liste(d.NETZ_OFFEN, 100),
    gewolltAus: liste(d.GEWOLLT_AUS_START, 100),
  };
}

module.exports = { LEER, pruefe };
