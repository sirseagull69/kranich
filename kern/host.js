'use strict';
// Der Blick des Hosts auf die Zentrale: Geraete, Funde, Ereignisse lesen,
// Geraete koppeln und Auftraege von der festen Liste senden.
// Jede Anfrage laeuft mit dem Ticket des angemeldeten Kontos. Die Zentrale
// zeigt einem Konto nur seine eigenen Geraete.

const AUFTRAEGE = ['melden', 'schnellscan', 'vollscan', 'erkennungsliste'];
const SYSTEME = ['windows', 'macos', 'android', 'ios'];
const KENNUNG = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class HostZentrale {
  constructor({ url, apiSchluessel, konto, fetch = globalThis.fetch }) {
    this._basis = url.replace(/\/+$/, '') + '/rest/v1/';
    this._api = apiSchluessel;
    this._konto = konto;
    this._fetch = fetch;
  }

  async _rufe(methode, pfad, werte, kopf = {}) {
    const zugang = await this._konto.zugang();
    if (!zugang) return { ok: false, grund: 'Nicht angemeldet', abgemeldet: true };
    let antwort;
    try {
      antwort = await this._fetch(this._basis + pfad, {
        method: methode,
        headers: { apikey: this._api, authorization: `Bearer ${zugang}`, 'content-type': 'application/json', ...kopf },
        body: werte === undefined ? undefined : JSON.stringify(werte),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      return { ok: false, grund: 'Keine Verbindung zur Zentrale', netz: true };
    }
    let daten = null;
    try {
      daten = await antwort.json();
    } catch {
      // leere Antwort (z. B. nach dem Loeschen)
    }
    if (!antwort.ok) return { ok: false, grund: daten?.message || `Die Zentrale antwortet mit ${antwort.status}` };
    return { ok: true, daten };
  }

  async geraete() {
    const a = await this._rufe('GET', 'geraete?select=*&order=erstellt.asc');
    return a.ok ? { ok: true, geraete: a.daten ?? [] } : a;
  }
  async funde(geraetId) {
    if (!KENNUNG.test(geraetId)) return { ok: false, grund: 'Unbekanntes Gerät' };
    const a = await this._rufe('GET', `funde?select=*&geraet_id=eq.${geraetId}&order=gemeldet.desc&limit=200`);
    return a.ok ? { ok: true, funde: a.daten ?? [] } : a;
  }
  async ereignisse(anzahl = 100) {
    const n = Math.max(1, Math.min(500, Number(anzahl) || 100));
    const a = await this._rufe('GET', `ereignisse?select=*&order=zeit.desc&limit=${n}`);
    return a.ok ? { ok: true, ereignisse: a.daten ?? [] } : a;
  }
  async auftraege(geraetId) {
    if (!KENNUNG.test(geraetId)) return { ok: false, grund: 'Unbekanntes Gerät' };
    const a = await this._rufe('GET', `auftraege?select=*&geraet_id=eq.${geraetId}&order=erstellt.desc&limit=20`);
    return a.ok ? { ok: true, auftraege: a.daten ?? [] } : a;
  }

  // Liefert den achtstelligen Code, den man am neuen Geraet eintippt.
  async kopplungErstellen(name, system) {
    if (!SYSTEME.includes(system)) return { ok: false, grund: 'Unbekanntes System' };
    const a = await this._rufe('POST', 'rpc/kopplung_erstellen', { p_name: String(name ?? '').trim(), p_system: system });
    return a.ok ? { ok: true, code: String(a.daten), gueltigMinuten: 10 } : a;
  }
  async auftragSenden(geraetId, art) {
    if (!KENNUNG.test(geraetId)) return { ok: false, grund: 'Unbekanntes Gerät' };
    if (!AUFTRAEGE.includes(art)) return { ok: false, grund: 'Diesen Auftrag gibt es nicht' };
    const a = await this._rufe('POST', 'auftraege', { geraet_id: geraetId, art }, { prefer: 'return=representation' });
    return a.ok ? { ok: true, auftrag: Array.isArray(a.daten) ? a.daten[0] : a.daten } : a;
  }
  async geraetUmbenennen(geraetId, name) {
    const n = String(name ?? '').trim();
    if (!KENNUNG.test(geraetId) || n.length < 1 || n.length > 60) return { ok: false, grund: 'Der Name muss 1 bis 60 Zeichen haben' };
    return this._rufe('PATCH', `geraete?id=eq.${geraetId}`, { name: n });
  }
  async geraetEntfernen(geraetId) {
    if (!KENNUNG.test(geraetId)) return { ok: false, grund: 'Unbekanntes Gerät' };
    return this._rufe('DELETE', `geraete?id=eq.${geraetId}`);
  }
}

module.exports = { HostZentrale, AUFTRAEGE };
