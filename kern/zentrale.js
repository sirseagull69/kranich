'use strict';
// Verbindung des Agenten zur Zentrale (Supabase). Der Agent ruft dort nur
// vier Funktionen auf und weist sich mit seinem Geraete-Schluessel aus.
// Passt als "transport" in den Agenten (siehe agent.js).

class Zentrale {
  // url, apiSchluessel: Adresse und oeffentlicher Schluessel des Projekts.
  // geraeteSchluessel: bekommt das Geraet einmalig beim Koppeln.
  constructor({ url, apiSchluessel, geraeteSchluessel, fetch = globalThis.fetch, zeitlimitMs = 20000 }) {
    if (!/^https:\/\//.test(url ?? '')) throw new Error('Die Zentrale braucht eine https-Adresse');
    this._basis = url.replace(/\/+$/, '') + '/rest/v1/rpc/';
    this._api = apiSchluessel;
    this._geraet = geraeteSchluessel;
    this._fetch = fetch;
    this._zeitlimit = zeitlimitMs;
  }

  async _rufe(name, werte) {
    let antwort;
    try {
      antwort = await this._fetch(this._basis + name, {
        method: 'POST',
        headers: { apikey: this._api, 'content-type': 'application/json' },
        body: JSON.stringify(werte),
        signal: AbortSignal.timeout(this._zeitlimit),
      });
    } catch (fehler) {
      throw new Error(`Zentrale nicht erreichbar: ${fehler.message}`);
    }
    let daten = null;
    try {
      daten = await antwort.json();
    } catch {
      // leere oder unlesbare Antwort
    }
    if (!antwort.ok) {
      const fehler = new Error(daten?.message || `Zentrale antwortet mit ${antwort.status}`);
      fehler.abgelehnt = antwort.status === 401 || antwort.status === 403 || daten?.code === '28000';
      throw fehler;
    }
    return daten;
  }

  async sende(meldung) {
    return this._rufe('agent_melde', { p_schluessel: this._geraet, p_meldung: meldung });
  }

  async holeAuftraege() {
    const liste = await this._rufe('agent_auftraege', { p_schluessel: this._geraet });
    return Array.isArray(liste) ? liste : [];
  }

  async bestaetige(auftragId, ergebnis) {
    return this._rufe('agent_bestaetige', { p_schluessel: this._geraet, p_auftrag: auftragId, p_ergebnis: ergebnis });
  }

  // Loest einen Kopplungscode ein. Ergebnis bei Erfolg:
  //   { ok: true, geraet_id, schluessel, name, system }
  // Der Schluessel kommt nur dieses eine Mal und gehoert in den sicheren
  // Speicher des Geraets.
  static async kopple({ url, apiSchluessel, code, fetch }) {
    const zentrale = new Zentrale({ url, apiSchluessel, geraeteSchluessel: null, fetch });
    try {
      return await zentrale._rufe('agent_kopple', { p_code: String(code ?? '') });
    } catch (fehler) {
      return { ok: false, grund: fehler.message };
    }
  }
}

module.exports = { Zentrale };
