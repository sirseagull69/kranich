'use strict';
// Erfundene Beispielfirma – nur für Tests. Das echte Firmenwissen liegt NICHT im Repo.
const ip = (n) => `10.20.0.${n}`;
const S = (name, n, rolle, laeuft, extra = {}) => ({ name, ip: ip(n), rolle, laeuft, ...extra });
const SERVER = [
  S('DC01', 11, 'Domäne', ['Domänencontroller', 'DNS'], { wichtig: true }),
  S('DC02', 12, 'Domäne (zweiter)', ['Domänencontroller']),
  S('FILE01', 13, 'Datei & Druck', ['Dateifreigaben', 'Druckserver'], { wichtig: true }),
  S('BACKUP01', 14, 'Backup-Ziel', ['Speicher für Veeam']),
  S('VEEAM01', 15, 'Veeam', ['Veeam Backup & Replication'], { wichtig: true }),
  S('TEL01', 16, 'Telefonie', ['Telefonanlage (UCServer)'], { haengt: ['Domäne über ein Dienstkonto (Kennwort liegt in Passbolt)'], hinweis: 'Wird das Kennwort des Dienstkontos geändert, muss es im UCServer nachgetragen werden.' }),
  S('MAIL01', 17, 'Mail-Brücke', ['Hybrid-Mailserver']),
  S('ERP01', 18, 'ERP', ['Warenwirtschaft']),
  S('NAS01', 19, 'Speicher I', ['NAS']),
  S('NAS02', 20, 'Speicher II', ['NAS']),
  S('NAS03', 21, 'Speicher III', ['NAS']),
  S('ALT01', 22, 'frei', []),
].map((s) => ({ ...s, id: s.name.toLowerCase() }));
const NETZ = [
  { id: 'fw', name: 'Firewall', ip: ip(250), gruppe: 'Rand' },
  { id: 'core', name: 'Core-Switch', ip: ip(240), gruppe: 'Kern' },
  { id: 'esx1', name: 'Host 1', ip: ip(1), gruppe: 'Hosts' },
  { id: 'esx2', name: 'Host 2', ip: ip(2), gruppe: 'Hosts' },
  { id: 'eg', name: 'Switch EG', ip: ip(241), gruppe: 'Etagen' },
  { id: 'og', name: 'Switch OG', ip: ip(242), gruppe: 'Etagen' },
  { id: 'halle', name: 'Switch Halle', ip: ip(243), gruppe: 'Nebengebäude' },
];
module.exports = {
  art: 'specht-wissen', version: 1, STAND: 'Beispielfirma (erfunden)',
  KONTEXT: 'Beispiel GmbH, erfundene Firma für Tests.',
  VORSCHLAEGE: ['Wo läuft die Telefonie?', 'Was steht offen?'],
  SERVER, NETZ,
  NETZ_OFFEN: ['Zweiten Uplink zum Switch OG legen', 'Ports beschriften'],
  BACKUP: { stand: 'von Hand, Beispiel', ziele: [{ name: 'BACKUP01 (Z:)', frei: '0 Bytes', gesamt: '20 TB', voll: 100 }, { name: 'Repository (X:)', frei: '9 TB', gesamt: '50 TB', voll: 82 }] },
  STOERUNGEN: [
    { id: 'st-1', datum: '2026-08-07', was: 'Telefonie: alle melden „Kennwort falsch“', ursache: 'Altes Kennwort im UCServer.', loesung: 'Neues Kennwort eingetragen.', status: 'erledigt', server: ['tel01'] },
    { id: 'st-2', datum: '2026-11-17', was: 'Ein Rechner ohne Laufwerke', ursache: 'Noch offen.', loesung: 'Dienstleister informiert.', status: 'offen', server: ['file01'] },
  ],
  ANLEITUNGEN: [
    { id: 'an-betankung', titel: 'Neuen Rechner einrichten', untertitel: 'Beispiel-Anleitung', schritte: ['BIOS einstellen.', 'Image einspielen.', 'Treiber und Software installieren.'] },
  ],
  GEWOLLT_AUS_START: ['alt01'],
};
if (require.main === module) process.stdout.write(JSON.stringify(module.exports, null, 2));
