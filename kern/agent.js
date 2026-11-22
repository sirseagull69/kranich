'use strict';
// Der Agent: laeuft ohne Fenster auf einem Geraet, meldet regelmaessig an
// die Zentrale und fuehrt Auftraege von einer festen Liste aus.
//
// Die Zentrale steckt hinter "transport". Der Agent weiss nicht, ob das
// Supabase, origami oder etwas anderes ist:
//
//   transport.sende(meldung)                 -> Promise
//   transport.holeAuftraege(geraetId)        -> Promise<[{ id, art }]>
//   transport.bestaetige(auftragId, ergebnis) -> Promise

const fs = require('node:fs');
const path = require('node:path');
const { vergleiche } = require('./autostart-windows');

// Nur das darf die Zentrale ausloesen. Es gibt bewusst keinen Auftrag mit
// freiem Befehl, freiem Pfad oder Dateizugriff.
const ERLAUBTE_AUFTRAEGE = ['melden', 'schnellscan', 'vollscan', 'erkennungsliste'];
const SCANS = { schnellscan: 'schnell', vollscan: 'voll' };

// Merkt sich zwischen zwei Starts, was schon gemeldet wurde.
function dateiSpeicher(datei) {
  return {
    lade() {
      try {
        return JSON.parse(fs.readFileSync(datei, 'utf8'));
      } catch {
        return null;
      }
    },
    sichere(stand) {
      fs.mkdirSync(path.dirname(datei), { recursive: true });
      const vorlaeufig = `${datei}.neu`;
      fs.writeFileSync(vorlaeufig, JSON.stringify(stand));
      fs.renameSync(vorlaeufig, datei); // nie eine halb geschriebene Datei
    },
  };
}

const fundSchluessel = (f) => f.id || `${f.threatId}|${f.zeit}`;

class Agent {
  constructor({ geraet, transport, defender = null, leseAutostart = null, speicher, version = '0', jetzt = () => new Date() }) {
    if (!geraet?.id) throw new Error('Der Agent braucht eine Geräte-ID');
    this.geraet = geraet;
    this._transport = transport;
    this._defender = defender;
    this._leseAutostart = leseAutostart;
    this._speicher = speicher;
    this._version = version;
    this._jetzt = jetzt;
    this._stand = { gemeldeteFunde: [], autostart: null, erledigt: {}, ...(speicher.lade() ?? {}) };
    this._laeuft = false;
    this._scan = null; // laufender Scan-Auftrag
    this._scanAuftrag = null;
    this._uhr = null;
  }

  start(abstandMs = 5 * 60 * 1000) {
    if (this._uhr) return;
    this.runde().catch(() => {});
    this._uhr = setInterval(() => this.runde().catch(() => {}), abstandMs);
  }

  stopp() {
    clearInterval(this._uhr);
    this._uhr = null;
  }

  // Wartet auf einen laufenden Scan-Auftrag (fuer Tests und sauberes Beenden).
  async fertig() {
    await this._scan;
  }

  // Eine Runde: Lage sammeln, melden, Auftraege abholen.
  async runde() {
    if (this._laeuft) return { uebersprungen: true };
    this._laeuft = true;
    try {
      const gemeldet = await this._melde();
      const auftraege = await this._bearbeiteAuftraege();
      return { gemeldet, auftraege };
    } finally {
      this._laeuft = false;
    }
  }

  async _melde() {
    const fehler = [];
    let lage = null;
    if (this._defender) {
      lage = await this._defender.lage().catch((e) => (fehler.push(`Defender: ${e.message}`), null));
      if (lage) fehler.push(...lage.fehler);
    }

    const bekannt = new Set(this._stand.gemeldeteFunde);
    const neueFunde = (lage?.funde ?? []).filter((f) => !bekannt.has(fundSchluessel(f)));

    let autostart = { neu: [], geaendert: [], entfernt: [] };
    let autostartJetzt = null;
    if (this._leseAutostart) {
      try {
        const gelesen = await this._leseAutostart();
        fehler.push(...gelesen.fehler.map((f) => `Autostart (${f.herkunft}): ${f.meldung}`));
        // Faellt eine Quelle aus, wird nicht verglichen: sonst saehe alles
        // aus ihr beim naechsten Mal wie neu aus.
        if (!gelesen.fehler.length) {
          autostartJetzt = gelesen.eintraege;
          if (this._stand.autostart) autostart = vergleiche(this._stand.autostart, autostartJetzt);
        }
      } catch (e) {
        fehler.push(`Autostart: ${e.message}`);
      }
    }

    const meldung = {
      geraet: this.geraet,
      zeit: this._jetzt().toISOString(),
      version: this._version,
      ampel: lage?.ampel ?? null,
      status: lage?.status ?? null,
      offeneFunde: (lage?.funde ?? []).filter((f) => f.offen).length,
      neueFunde,
      autostart: { neu: autostart.neu, geaendert: autostart.geaendert },
      scanLaeuft: Boolean(this._scan),
      fehler,
    };

    try {
      await this._transport.sende(meldung);
    } catch (e) {
      // Zentrale nicht erreichbar: nichts als gemeldet merken, damit die
      // Funde beim naechsten Mal nachgereicht werden.
      return { ok: false, fehler: e.message };
    }

    this._stand.gemeldeteFunde = [...bekannt, ...neueFunde.map(fundSchluessel)].slice(-2000);
    if (autostartJetzt) this._stand.autostart = autostartJetzt;
    this._speicher.sichere(this._stand);
    return { ok: true, neueFunde: neueFunde.length, autostartNeu: autostart.neu.length };
  }

  async _bearbeiteAuftraege() {
    let auftraege;
    try {
      auftraege = await this._transport.holeAuftraege(this.geraet.id);
    } catch {
      return [];
    }
    const ergebnisse = [];
    for (const auftrag of auftraege ?? []) {
      // Kommt ein Auftrag noch einmal, weil die Bestaetigung nicht ankam,
      // wird er nicht doppelt ausgefuehrt.
      if (auftrag?.id === this._scanAuftrag) {
        ergebnisse.push({ id: auftrag.id, art: auftrag.art, zustand: 'laeuft' });
        continue;
      }
      const schon = this._stand.erledigt[auftrag?.id];
      if (schon) {
        ergebnisse.push({ id: auftrag.id, art: auftrag.art, ...schon });
        await this._bestaetige(auftrag.id, schon);
        continue;
      }
      const ergebnis = await this._fuehreAus(auftrag);
      ergebnisse.push({ id: auftrag.id, art: auftrag.art, ...ergebnis });
      // Scans bestaetigen sich selbst, wenn sie fertig sind.
      if (ergebnis.zustand !== 'laeuft') await this._bestaetige(auftrag.id, ergebnis);
    }
    return ergebnisse;
  }

  async _fuehreAus(auftrag) {
    const art = auftrag?.art;
    if (!ERLAUBTE_AUFTRAEGE.includes(art)) return { zustand: 'abgelehnt', grund: 'Diesen Auftrag führt der Agent nicht aus' };
    if (art === 'melden') return { zustand: 'erledigt' }; // die Meldung kommt mit der naechsten Runde

    if (!this._defender) return { zustand: 'abgelehnt', grund: 'Auf diesem Gerät gibt es keinen Defender' };

    if (art === 'erkennungsliste') {
      try {
        await this._defender.aktualisiereSignaturen();
        return { zustand: 'erledigt' };
      } catch (e) {
        return { zustand: 'fehlgeschlagen', grund: e.message };
      }
    }

    if (this._scan) return { zustand: 'abgelehnt', grund: 'Es läuft schon ein Scan' };
    // Ein Vollscan dauert lange. Er laeuft im Hintergrund, damit der Agent
    // sich waehrenddessen weiter meldet.
    this._scanAuftrag = auftrag.id;
    this._scan = this._defender
      .scan(SCANS[art])
      .then((e) => this._bestaetige(auftrag.id, { zustand: 'erledigt', neueFunde: e.neueFunde.length }))
      .catch((e) => this._bestaetige(auftrag.id, { zustand: 'fehlgeschlagen', grund: e.message }))
      .finally(() => {
        this._scan = null;
        this._scanAuftrag = null;
      });
    return { zustand: 'laeuft' };
  }

  async _bestaetige(id, ergebnis) {
    // Ergebnis merken, bevor es gesendet wird (die letzten 200).
    const erledigt = { ...this._stand.erledigt, [id]: ergebnis };
    const ids = Object.keys(erledigt);
    for (const alt of ids.slice(0, Math.max(0, ids.length - 200))) delete erledigt[alt];
    this._stand.erledigt = erledigt;
    this._speicher.sichere(this._stand);
    try {
      await this._transport.bestaetige(id, ergebnis);
    } catch {
      // Zentrale gerade nicht erreichbar. Der Auftrag bleibt dort offen.
    }
  }
}

module.exports = { Agent, dateiSpeicher, ERLAUBTE_AUFTRAEGE };
