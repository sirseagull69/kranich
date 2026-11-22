'use strict';
// Konto an der Zentrale: anmelden, angemeldet bleiben, abmelden.
// Nur der Host meldet sich an. Agenten haben kein Konto, sie weisen sich mit
// ihrem Geraete-Schluessel aus (siehe zentrale.js).

const MELDUNG = {
  invalid_credentials: 'E-Mail oder Passwort stimmen nicht',
  email_not_confirmed: 'Bestätige zuerst deine E-Mail-Adresse. Die Mail dazu liegt in deinem Postfach.',
  user_already_exists: 'Zu dieser E-Mail-Adresse gibt es schon ein Konto',
  weak_password: 'Das Passwort ist zu schwach. Nimm mindestens 8 Zeichen.',
  signup_disabled: 'Neue Konten sind abgeschaltet',
  over_email_send_rate_limit: 'Zu viele Versuche. Warte kurz und probier es dann noch einmal.',
  over_request_rate_limit: 'Zu viele Versuche. Warte kurz und probier es dann noch einmal.',
};

class Konto {
  // speicher: { lade() -> text|null, sichere(text|null) } fuer das Dauerticket,
  // haelt es verschluesselt fest (im Hauptprozess ueber den Schluesselspeicher).
  constructor({ url, apiSchluessel, speicher, fetch = globalThis.fetch, jetzt = () => Date.now() }) {
    this._basis = url.replace(/\/+$/, '') + '/auth/v1/';
    this._api = apiSchluessel;
    this._speicher = speicher;
    this._fetch = fetch;
    this._jetzt = jetzt;
    this._ticket = null; // { zugang, bis }
    this._dauer = speicher.lade();
    this.email = null;
    this._laeuft = null;
  }

  get angemeldet() {
    return Boolean(this._dauer);
  }

  async _rufe(pfad, werte, zugang) {
    let antwort;
    try {
      antwort = await this._fetch(this._basis + pfad, {
        method: 'POST',
        headers: { apikey: this._api, 'content-type': 'application/json', ...(zugang ? { authorization: `Bearer ${zugang}` } : {}) },
        body: JSON.stringify(werte ?? {}),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      return { ok: false, grund: 'Keine Verbindung zur Zentrale', netz: true };
    }
    let daten = null;
    try {
      daten = await antwort.json();
    } catch {
      // leere Antwort
    }
    if (!antwort.ok) {
      const code = daten?.error_code || daten?.code || daten?.error;
      return { ok: false, code, grund: MELDUNG[code] || daten?.msg || daten?.error_description || `Die Zentrale antwortet mit ${antwort.status}` };
    }
    return { ok: true, daten };
  }

  _merke(daten) {
    this._ticket = { zugang: daten.access_token, bis: this._jetzt() + (daten.expires_in ?? 3600) * 1000 };
    this._dauer = daten.refresh_token;
    this.email = daten.user?.email ?? this.email;
    this._speicher.sichere(this._dauer);
  }

  async anmelden(email, passwort) {
    const a = await this._rufe('token?grant_type=password', { email: String(email ?? '').trim(), password: String(passwort ?? '') });
    if (!a.ok) return a;
    this._merke(a.daten);
    return { ok: true, email: this.email };
  }

  // Legt ein Konto an. Verlangt die Zentrale eine Bestaetigung per Mail,
  // kommt { ok: true, bestaetigen: true } und man ist noch nicht angemeldet.
  async anlegen(email, passwort) {
    if (String(passwort ?? '').length < 8) return { ok: false, grund: MELDUNG.weak_password };
    const a = await this._rufe('signup', { email: String(email ?? '').trim(), password: String(passwort) });
    if (!a.ok) return a;
    if (a.daten?.access_token) {
      this._merke(a.daten);
      return { ok: true, email: this.email };
    }
    return { ok: true, bestaetigen: true };
  }

  async abmelden() {
    const zugang = this._ticket?.zugang;
    this._ticket = null;
    this._dauer = null;
    this.email = null;
    this._speicher.sichere(null);
    if (zugang) await this._rufe('logout', {}, zugang);
    return { ok: true };
  }

  // Gueltiges Ticket fuer Anfragen an die Zentrale, oder null, wenn man sich
  // neu anmelden muss. Erneuert es rechtzeitig von selbst.
  async zugang() {
    if (this._ticket && this._ticket.bis - this._jetzt() > 60000) return this._ticket.zugang;
    if (!this._dauer) return null;
    // Gleichzeitige Anfragen erneuern nur einmal: das Dauerticket gilt nur einmal.
    if (!this._laeuft) {
      this._laeuft = this._rufe('token?grant_type=refresh_token', { refresh_token: this._dauer }).then((a) => {
        this._laeuft = null;
        if (a.ok) {
          this._merke(a.daten);
          return this._ticket.zugang;
        }
        if (!a.netz) {
          // Dauerticket ungueltig: abgemeldet.
          this._dauer = null;
          this._ticket = null;
          this._speicher.sichere(null);
        }
        return null;
      });
    }
    return this._laeuft;
  }
}

module.exports = { Konto };
