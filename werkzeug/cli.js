#!/usr/bin/env node
'use strict';
// Kranich zum Ausprobieren im Terminal, bis die Oberflaeche steht.
//
//   node werkzeug/cli.js scan <Datei oder Ordner> [--alle]
//   node werkzeug/cli.js wache <Ordner>
//   node werkzeug/cli.js autostart [--merken]
//   node werkzeug/cli.js defender [schnell|voll|<Pfad>]
//
// VirusTotal-Schluessel als Umgebungsvariable KRANICH_VT_SCHLUESSEL.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { VirusTotal, scanne, pruefeDatei, DownloadWache, leseAutostart, vergleiche, Defender } = require('../kern');

const ZEICHEN = { sauber: '[ok]', verdaechtig: '[!] ', schaedlich: '[!!]', unbekannt: '[?] ', nicht_geprueft: '[-] ' };
const TEXT = {
  sauber: 'sauber', verdaechtig: 'verdächtig', schaedlich: 'schädlich',
  unbekannt: 'unbekannt', nicht_geprueft: 'nicht geprüft',
};

function zeile(e) {
  const treffer = e.treffer ? `  ${e.treffer.boesartig} von ${e.treffer.gesamt} Scannern` : '';
  const hinweise = e.hinweise.length ? `  (${e.hinweise.join('; ')})` : '';
  return `${ZEICHEN[e.urteil]} ${TEXT[e.urteil].padEnd(13)} ${e.pfad}${treffer}${hinweise}`;
}

function neuerVt() {
  const schluessel = process.env.KRANICH_VT_SCHLUESSEL;
  if (!schluessel) console.log('Hinweis: kein VirusTotal-Schlüssel gesetzt, es wird nur der Dateiname geprüft.\n');
  return new VirusTotal({ schluessel });
}

async function befehlScan(ziel, schalter) {
  if (!ziel) throw new Error('Bitte Datei oder Ordner angeben');
  const vt = neuerVt();
  const { ergebnisse, zusammenfassung } = await scanne(ziel, {
    vt,
    alleAbfragen: schalter.has('--alle'),
    beiFortschritt: ({ nummer, gesamt }) => process.stderr.write(`\rPrüfe ${nummer} von ${gesamt} ...`),
  });
  process.stderr.write('\r' + ' '.repeat(40) + '\r');
  for (const e of ergebnisse) console.log(zeile(e));
  const z = zusammenfassung;
  console.log(
    `\n${ergebnisse.length} Dateien: ${z.schaedlich} schädlich, ${z.verdaechtig} verdächtig, ` +
    `${z.sauber} sauber, ${z.unbekannt} unbekannt, ${z.nicht_geprueft} nicht geprüft`,
  );
  process.exitCode = z.schaedlich || z.verdaechtig ? 1 : 0;
}

async function befehlWache(ordner) {
  if (!ordner) ordner = path.join(os.homedir(), 'Downloads');
  const vt = neuerVt();
  const wache = new DownloadWache(ordner);
  wache.on('datei', async (pfad) => console.log(zeile(await pruefeDatei(pfad, { vt }))));
  wache.on('fehler', (f) => console.error('Wache:', f.message));
  wache.start();
  console.log(`Download-Wache läuft für ${ordner}. Beenden mit Strg+C.`);
}

async function befehlAutostart(schalter) {
  const datei = path.join(os.homedir(), '.kranich-autostart.json');
  const { eintraege, fehler } = await leseAutostart();
  for (const f of fehler) console.error(`Konnte ${f.herkunft} nicht lesen: ${f.meldung}`);

  if (!fs.existsSync(datei) || schalter.has('--merken')) {
    fs.writeFileSync(datei, JSON.stringify(eintraege, null, 2));
    console.log(`${eintraege.length} Einträge als bekannt gemerkt (${datei}).`);
    return;
  }
  const bekannt = JSON.parse(fs.readFileSync(datei, 'utf8'));
  const { neu, geaendert, entfernt } = vergleiche(bekannt, eintraege);
  if (!neu.length && !geaendert.length) console.log(`Nichts Neues. ${eintraege.length} Einträge, alle bekannt.`);
  for (const e of neu) console.log(`[neu]      ${e.herkunft}: ${e.name}\n           ${e.befehl}`);
  for (const e of geaendert) console.log(`[geändert] ${e.herkunft}: ${e.name}\n           vorher: ${e.befehlVorher}\n           jetzt:  ${e.befehl}`);
  if (entfernt.length) console.log(`${entfernt.length} Einträge sind verschwunden.`);
  console.log('\nMit "node werkzeug/cli.js autostart --merken" den aktuellen Stand als bekannt speichern.');
}

async function befehlDefender(ziel) {
  const defender = new Defender();
  if (ziel) {
    const art = ziel === 'schnell' || ziel === 'voll' ? ziel : 'pfad';
    console.log(`Defender-Scan (${art}) läuft ...`);
    const { neueFunde } = await defender.scan(art, { pfad: ziel });
    console.log(neueFunde.length ? `${neueFunde.length} neue Funde.` : 'Keine neuen Funde.');
  }
  const { status, funde, ampel, fehler } = await defender.lage();
  for (const f of fehler) console.error(f);
  const AMPEL = { ok: '[ok] Schutz läuft', warnung: '[!]  Warnung', kritisch: '[!!] Kritisch' };
  console.log(AMPEL[ampel.stufe]);
  for (const g of ampel.gruende) console.log(`     ${g}`);
  if (status) {
    console.log(`Echtzeitschutz: ${status.echtzeit ? 'an' : 'aus'}, Erkennungsliste: ${status.signaturVersion} (${status.signaturAlterTage} Tage alt)`);
    console.log(`Letzter Schnellscan: ${status.letzterSchnellScan ?? 'nie'}, letzter Vollscan: ${status.letzterVollScan ?? 'nie'}`);
  }
  console.log(`\n${funde.length} Funde im Verlauf des Defenders:`);
  for (const f of funde.slice(0, 20)) console.log(`${f.offen ? '[offen]' : '[erledigt]'} ${f.zeit}  ${f.name} (${f.schwere}, ${f.zustand})\n           ${f.pfade.join('\n           ')}`);
  process.exitCode = ampel.stufe === 'ok' ? 0 : 1;
}

async function main() {
  const [befehl, ...rest] = process.argv.slice(2);
  const schalter = new Set(rest.filter((a) => a.startsWith('--')));
  const ziel = rest.find((a) => !a.startsWith('--'));
  if (befehl === 'scan') return befehlScan(ziel, schalter);
  if (befehl === 'wache') return befehlWache(ziel);
  if (befehl === 'autostart') return befehlAutostart(schalter);
  if (befehl === 'defender') return befehlDefender(ziel);
  console.log('Aufruf:\n  node werkzeug/cli.js scan <Datei oder Ordner> [--alle]\n  node werkzeug/cli.js wache [Ordner]\n  node werkzeug/cli.js autostart [--merken]\n  node werkzeug/cli.js defender [schnell|voll|<Pfad>]');
}

main().catch((fehler) => {
  console.error('Fehler:', fehler.message);
  process.exitCode = 2;
});
