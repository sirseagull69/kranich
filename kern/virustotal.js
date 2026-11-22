'use strict';
// Fragt VirusTotal nach einem Fingerabdruck. Es wird nur der Hash
// gesendet, nie die Datei selbst.
//
// Kostenloser Zugang: 4 Abfragen pro Minute, 500 pro Tag, nur privat.

const BASIS = 'https://www.virustotal.com/api/v3';

class VirusTotal {
  constructor({
    schluessel,
    fetch = globalThis.fetch,
    proMinute = 4,
    jetzt = () => Date.now(),
    warte = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = {}) {
    this.schluessel = schluessel;
    this._fetch = fetch;
    this._abstand = Math.ceil(60000 / proMinute);
    this._jetzt = jetzt;
    this._warte = warte;
    this._naechsteFrei = 0;
    this._schlange = Promise.resolve();
    this._speicher = new Map(); // Hash -> Ergebnis
    this.limitErreicht = false;
  }

  // Ergebnis:
  //   { status: 'bekannt', boesartig, verdaechtig, gesamt, name, link }
  //   { status: 'unbekannt' }          Datei ist VirusTotal nicht bekannt
  //   { status: 'kein_schluessel' }
  //   { status: 'schluessel_falsch' }
  //   { status: 'limit' }              Minuten- oder Tageslimit erreicht
  //   { status: 'fehler', meldung }
  abfrage(sha256) {
    if (!this.schluessel) return Promise.resolve({ status: 'kein_schluessel' });
    if (this._speicher.has(sha256)) return Promise.resolve(this._speicher.get(sha256));
    if (this.limitErreicht) return Promise.resolve({ status: 'limit' });

    // Eine nach der anderen, mit Abstand, damit das Minutenlimit haelt.
    const lauf = this._schlange.then(() => this._eine(sha256));
    this._schlange = lauf.catch(() => {});
    return lauf;
  }

  async _eine(sha256) {
    if (this._speicher.has(sha256)) return this._speicher.get(sha256);
    if (this.limitErreicht) return { status: 'limit' };

    const rest = this._naechsteFrei - this._jetzt();
    if (rest > 0) await this._warte(rest);
    this._naechsteFrei = this._jetzt() + this._abstand;

    let antwort;
    try {
      antwort = await this._fetch(`${BASIS}/files/${sha256}`, {
        headers: { 'x-apikey': this.schluessel, accept: 'application/json' },
      });
    } catch (fehler) {
      return { status: 'fehler', meldung: `VirusTotal nicht erreichbar: ${fehler.message}` };
    }

    if (antwort.status === 404) return this._merke(sha256, { status: 'unbekannt' });
    if (antwort.status === 401 || antwort.status === 403) return { status: 'schluessel_falsch' };
    if (antwort.status === 429) {
      this.limitErreicht = true;
      return { status: 'limit' };
    }
    if (!antwort.ok) return { status: 'fehler', meldung: `VirusTotal antwortet mit ${antwort.status}` };

    let daten;
    try {
      daten = await antwort.json();
    } catch {
      return { status: 'fehler', meldung: 'Antwort von VirusTotal nicht lesbar' };
    }
    const a = daten?.data?.attributes ?? {};
    const s = a.last_analysis_stats ?? {};
    const boesartig = s.malicious ?? 0;
    const verdaechtig = s.suspicious ?? 0;
    // Nur Scanner zaehlen, die wirklich ein Urteil abgegeben haben.
    const gesamt = boesartig + verdaechtig + (s.undetected ?? 0) + (s.harmless ?? 0);

    return this._merke(sha256, {
      status: 'bekannt',
      boesartig,
      verdaechtig,
      gesamt,
      name: a.meaningful_name ?? null,
      link: `https://www.virustotal.com/gui/file/${sha256}`,
    });
  }

  _merke(sha256, ergebnis) {
    this._speicher.set(sha256, ergebnis);
    return ergebnis;
  }
}

module.exports = { VirusTotal };
