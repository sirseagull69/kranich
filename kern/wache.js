'use strict';
// Download-Wache: beobachtet einen Ordner und meldet jede neue Datei,
// sobald sie fertig heruntergeladen ist.
//
//   const wache = new DownloadWache(ordner);
//   wache.on('datei', (pfad) => ...);
//   wache.start();

const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

// Zwischendateien der Browser, solange ein Download noch laeuft.
const UNFERTIG = new Set(['.crdownload', '.part', '.partial', '.download', '.tmp', '.opdownload']);

class DownloadWache extends EventEmitter {
  constructor(ordner, { ruheMs = 1500, maxVersuche = 240 } = {}) {
    super();
    this.ordner = ordner;
    this._ruheMs = ruheMs;
    this._maxVersuche = maxVersuche;
    this._beobachter = null;
    this._inArbeit = new Set();
    this._gemeldet = new Map(); // Pfad -> "groesse:aenderungszeit"
    this.pausiert = false;
  }

  start() {
    if (this._beobachter) return;
    this._beobachter = fs.watch(this.ordner, (ereignis, dateiname) => {
      if (!dateiname || this.pausiert) return;
      this._pruefe(path.join(this.ordner, dateiname.toString()));
    });
    this._beobachter.on('error', (fehler) => this.emit('fehler', fehler));
  }

  stopp() {
    this._beobachter?.close();
    this._beobachter = null;
  }

  async _pruefe(pfad) {
    if (UNFERTIG.has(path.extname(pfad).toLowerCase())) return;
    if (this._inArbeit.has(pfad)) return;
    this._inArbeit.add(pfad);
    try {
      const info = await this._warteBisFertig(pfad);
      if (!info) return;
      const marke = `${info.size}:${info.mtimeMs}`;
      if (this._gemeldet.get(pfad) === marke) return; // schon gemeldet
      this._gemeldet.set(pfad, marke);
      this.emit('datei', pfad);
    } finally {
      this._inArbeit.delete(pfad);
    }
  }

  // Fertig heisst: Groesse hat sich zwischen zwei Blicken nicht mehr geaendert.
  async _warteBisFertig(pfad) {
    let vorher = -1;
    for (let i = 0; i < this._maxVersuche; i++) {
      let info;
      try {
        info = await fs.promises.stat(pfad);
      } catch {
        return null; // wieder weg (umbenannt oder geloescht)
      }
      if (!info.isFile()) return null;
      if (info.size === vorher) return info;
      vorher = info.size;
      await new Promise((r) => setTimeout(r, this._ruheMs));
      if (!this._beobachter) return null;
    }
    return null;
  }
}

module.exports = { DownloadWache };
