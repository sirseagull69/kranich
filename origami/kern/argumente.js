'use strict';
// Kleine Helfer ohne Electron: Adresse aufräumen, Startargumente lesen, Ziel-URL bauen.

function normAdresse(roh) {
  let a = String(roh || '').trim().slice(0, 300);
  if (!a) return '';
  if (!/^https?:\/\//i.test(a)) a = `http://${a}`;
  try {
    const u = new URL(a);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.toString().replace(/\/$/, '');
  } catch { return ''; }
}

// --adresse=… und --frage=… aus der Kommandozeile (vom Startfenster)
function leseArgumente(argv) {
  const wert = (name) => {
    const a = (argv || []).find((x) => typeof x === 'string' && x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : '';
  };
  return { adresse: normAdresse(wert('adresse')), frage: wert('frage').trim().slice(0, 4000) };
}

function zielUrl(adresse, frage) {
  const a = normAdresse(adresse);
  if (!a) return '';
  if (!frage) return a;
  const u = new URL(a);
  u.searchParams.set('frage', frage);
  return u.toString();
}

// Gehört eine URL zu origami (gleicher Server)? Sonst im Browser öffnen.
function gleicherServer(url, adresse) {
  try { return new URL(url).origin === new URL(normAdresse(adresse)).origin; } catch { return false; }
}

module.exports = { normAdresse, leseArgumente, zielUrl, gleicherServer };
