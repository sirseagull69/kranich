'use strict';
// Kranichs eigene Engine. Prueft den Inhalt einer Datei direkt auf dem
// Geraet, ohne Internet:
//
//   1. Fingerabdruck gegen die Erkennungsliste (bekannte Schaedlinge)
//   2. Testdatei fuer den Probealarm (EICAR)
//   3. Tarnung: sieht aus wie ein Dokument oder Bild, ist aber ein Programm
//   4. Kranichs Regeln (regeln.yar) ueber den Inhalt, bei Office-Dateien
//      zusaetzlich ueber den ausgepackten Makro-Teil
//
// Ergebnis: { geprueft, treffer: [{ regel, grund, stufe }], hinweis }
// stufe ist 'schaedlich' oder 'verdaechtig'.

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const MAX_INHALT = 32 * 1024 * 1024; // groessere Dateien: nur Fingerabdruck und Tarnung

// Die Testdatei, die jeder Virenscanner als Schaedling melden muss. Sie ist
// harmlos. Der Text steht hier in zwei Teilen, damit diese Quelldatei nicht
// selbst als Testdatei erkannt wird.
const EICAR = ['X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD', '-ANTIVIRUS-TEST-FILE!$H+H*'];
const eicarText = () => EICAR.join('');

// Endungen, hinter denen nie ein Windows-Programm stecken darf.
const KEIN_PROGRAMM = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'mp3', 'mp4', 'avi', 'mov', 'mkv', 'wav', 'zip', 'html', 'htm']);
const OFFICE_ZIP = new Set(['docm', 'xlsm', 'pptm', 'dotm', 'xlam', 'docx', 'xlsx', 'pptx']);

let yaraFertig = null;
function ladeYara() {
  if (!yaraFertig) yaraFertig = require('libyara-wasm')();
  return yaraFertig;
}

// Holt eine Datei aus einem Zip (Office-Dateien sind Zips). Liest dafuer das
// Inhaltsverzeichnis am Ende. Gibt null zurueck, wenn es sie nicht gibt.
function ausZip(puffer, endetMit) {
  const ende = puffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (ende < 0) return null;
  const anzahl = puffer.readUInt16LE(ende + 10);
  let ort = puffer.readUInt32LE(ende + 16);
  for (let i = 0; i < anzahl && ort + 46 <= puffer.length; i++) {
    if (puffer.readUInt32LE(ort) !== 0x02014b50) return null;
    const verfahren = puffer.readUInt16LE(ort + 10);
    const gepackt = puffer.readUInt32LE(ort + 20);
    const entpackt = puffer.readUInt32LE(ort + 24);
    const nameL = puffer.readUInt16LE(ort + 28);
    const extraL = puffer.readUInt16LE(ort + 30);
    const kommentarL = puffer.readUInt16LE(ort + 32);
    const kopf = puffer.readUInt32LE(ort + 42);
    const name = puffer.toString('utf8', ort + 46, ort + 46 + nameL);
    if (name.toLowerCase().endsWith(endetMit)) {
      if (entpackt > 16 * 1024 * 1024 || kopf + 30 > puffer.length) return null;
      const start = kopf + 30 + puffer.readUInt16LE(kopf + 26) + puffer.readUInt16LE(kopf + 28);
      const roh = puffer.subarray(start, start + gepackt);
      try {
        return verfahren === 0 ? roh : zlib.inflateRawSync(roh, { maxOutputLength: 16 * 1024 * 1024 });
      } catch {
        return null;
      }
    }
    ort += 46 + nameL + extraL + kommentarL;
  }
  return null;
}

class Engine {
  // liste: Erkennungsliste (siehe liste.js) oder null
  constructor({ liste = null, regelDatei = path.join(__dirname, 'regeln.yar') } = {}) {
    this._liste = liste;
    this._regeln = fs.readFileSync(regelDatei, 'utf8');
    this.regelZahl = (this._regeln.match(/^rule\s/gm) || []).length;
  }

  async _yara(puffer, nurMakro) {
    const yara = await ladeYara();
    const ergebnis = yara.run(puffer, this._regeln);
    if (ergebnis.compileErrors.size() > 0) throw new Error(`Regeln fehlerhaft: ${ergebnis.compileErrors.get(0).message}`);
    const treffer = [];
    for (let i = 0; i < ergebnis.matchedRules.size(); i++) {
      const regel = ergebnis.matchedRules.get(i);
      const meta = {};
      for (let j = 0; j < regel.metadata.size(); j++) meta[regel.metadata.get(j).identifier] = regel.metadata.get(j).data;
      if ((meta.nur === 'makro') !== nurMakro) continue;
      treffer.push({ regel: meta.name || regel.ruleName, grund: meta.grund || regel.ruleName, stufe: meta.stufe === 'schaedlich' ? 'schaedlich' : 'verdaechtig' });
    }
    return treffer;
  }

  // sha256: Fingerabdruck der Datei, falls schon berechnet.
  async pruefe(pfad, { sha256 = null } = {}) {
    const treffer = [];
    if (sha256 && this._liste) {
      if (this._liste.istFehlalarm(sha256)) return { geprueft: true, treffer: [], hinweis: 'Von dir als Fehlalarm markiert' };
      const bekannt = this._liste.suche(sha256);
      if (bekannt) treffer.push({ regel: 'Erkennungsliste', grund: bekannt.name ? `Bekannter Schädling: ${bekannt.name}` : 'Bekannter Schädling (Fingerabdruck in der Erkennungsliste)', stufe: 'schaedlich' });
    }

    let info;
    try {
      info = await fs.promises.stat(pfad);
    } catch (fehler) {
      return { geprueft: false, treffer, hinweis: `Nicht lesbar: ${fehler.code ?? fehler.message}` };
    }
    const endung = path.extname(pfad).slice(1).toLowerCase();
    const ganz = info.size <= MAX_INHALT;
    let puffer;
    try {
      if (ganz) puffer = await fs.promises.readFile(pfad);
      else {
        const griff = await fs.promises.open(pfad, 'r');
        try {
          puffer = Buffer.alloc(4096);
          await griff.read(puffer, 0, 4096, 0);
        } finally {
          await griff.close();
        }
      }
    } catch (fehler) {
      return { geprueft: false, treffer, hinweis: `Nicht lesbar: ${fehler.code ?? fehler.message}` };
    }

    if (info.size <= 4096 && puffer.includes(eicarText())) {
      treffer.push({ regel: 'Probealarm', grund: 'Testdatei für Virenscanner (EICAR). Harmlos, aber jeder Scanner muss sie melden', stufe: 'schaedlich' });
    }
    if (puffer.length >= 2 && puffer[0] === 0x4d && puffer[1] === 0x5a && KEIN_PROGRAMM.has(endung)) {
      treffer.push({ regel: 'Tarnung', grund: `Sieht aus wie eine .${endung}-Datei, ist aber ein Programm`, stufe: 'verdaechtig' });
    }

    if (!ganz) return { geprueft: true, treffer, hinweis: 'Sehr große Datei: nur Fingerabdruck und Tarnung geprüft' };

    treffer.push(...await this._yara(puffer, false));
    if (OFFICE_ZIP.has(endung) && puffer.length > 4 && puffer.readUInt32LE(0) === 0x04034b50) {
      const makro = ausZip(puffer, 'vbaproject.bin');
      if (makro) treffer.push(...await this._yara(makro, true));
    }
    return { geprueft: true, treffer, hinweis: null };
  }
}

module.exports = { Engine, eicarText, ausZip, MAX_INHALT };
