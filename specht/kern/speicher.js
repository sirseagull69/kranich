'use strict';
// Speicher und Sync von Specht.
// Alles, was Nils in Specht anlegt (Notizen, Tagebuch, Anleitungen, „gewollt aus“ …),
// liegt erst lokal und wird dann mit Supabase abgeglichen – so ist es auf jedem
// Gerät gleich. Offline geht alles weiter; Änderungen warten und werden nachgeholt.
// Wurde dasselbe auf zwei Geräten geändert, entsteht ein Konflikt („Zwei Versionen“).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ARTEN = ['notiz', 'stoerung', 'anleitung', 'gewollt_aus', 'netzpunkt', 'freigabe', 'chat', 'einstellung', 'wissen'];
const TABELLE = 'specht_eintraege';

class SyncFehler extends Error {
  constructor(art, nachricht) { super(nachricht); this.art = art; }
}

function neueId(art) { return `${art}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`; }

class Speicher {
  constructor(datei, { geraet = 'Gerät', jetzt = () => new Date().toISOString() } = {}) {
    this.datei = datei;
    this.geraet = geraet;
    this.jetzt = jetzt;
    this.d = { eintraege: {}, letzterAbruf: null, konflikte: [], angelegt: false };
    try { this.d = { ...this.d, ...JSON.parse(fs.readFileSync(datei, 'utf8')) }; } catch { /* erster Start */ }
  }

  sichern() {
    fs.mkdirSync(path.dirname(this.datei), { recursive: true });
    const tmp = `${this.datei}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.d), 'utf8');
    fs.renameSync(tmp, this.datei);
  }

  // Einmal beim allerersten Start: Grundstock anlegen (wird mit hochgeladen)
  grundstock(eintraege) {
    if (this.d.angelegt) return false;
    // Grundstock hat jedes Gerät selbst – er wird nicht hochgeladen, nur Änderungen daran
    for (const e of eintraege) if (!this.d.eintraege[e.id]) { this.setze(e.art, e.id, e.daten, { still: true }); Object.assign(this.d.eintraege[e.id], { offen: false, geraet: '', lokal: null }); }
    this.d.angelegt = true;
    this.sichern();
    return true;
  }

  alle(art) {
    return Object.values(this.d.eintraege)
      .filter((e) => !e.geloescht && (!art || e.art === art))
      .map((e) => ({ id: e.id, art: e.art, ...e.daten, _geraet: e.geraet, _zeit: e.geaendert || e.lokal, _offen: e.offen }));
  }

  hole(id) { const e = this.d.eintraege[id]; return e && !e.geloescht ? { id: e.id, art: e.art, ...e.daten, _geraet: e.geraet, _zeit: e.geaendert || e.lokal } : null; }

  setze(art, id, daten, { still = false } = {}) {
    if (!ARTEN.includes(art)) throw new Error(`Unbekannte Art: ${art}`);
    const sauber = {};
    for (const [k, v] of Object.entries(daten || {})) if (!k.startsWith('_') && k !== 'id' && k !== 'art') sauber[k] = v;
    const alt = this.d.eintraege[id || ''];
    const eid = id || neueId(art);
    this.d.eintraege[eid] = { id: eid, art, daten: sauber, geloescht: false, geraet: this.geraet, lokal: this.jetzt(), geaendert: alt?.geaendert || null, basis: alt?.basis || null, offen: true };
    if (!still) this.sichern();
    return this.hole(eid);
  }

  loesche(id) {
    const e = this.d.eintraege[id]; if (!e) return false;
    Object.assign(e, { geloescht: true, offen: true, lokal: this.jetzt(), geraet: this.geraet });
    this.sichern();
    return true;
  }

  wartend() { return Object.values(this.d.eintraege).filter((e) => e.offen).length; }
  konflikte() { return this.d.konflikte; }

  // Konflikt lösen: wahl = 'lokal' | 'fern' | 'beide'
  loese(id, wahl) {
    const k = this.d.konflikte.find((x) => x.id === id); if (!k) return false;
    this.d.konflikte = this.d.konflikte.filter((x) => x.id !== id);
    const e = this.d.eintraege[id];
    if (wahl === 'lokal') {
      Object.assign(e, { daten: k.lokal, basis: k.fernZeit, offen: true, lokal: this.jetzt(), geraet: this.geraet, geloescht: Boolean(k.lokalGeloescht) });
    } else {
      Object.assign(e, { daten: k.fern, geraet: k.fernGeraet, geaendert: k.fernZeit, basis: k.fernZeit, offen: false, geloescht: Boolean(k.fernGeloescht) });
      if (wahl === 'beide' && !k.lokalGeloescht) {
        const kopie = { ...k.lokal };
        if (kopie.was) kopie.was = `${kopie.was} (zweite Version)`;
        if (kopie.titel) kopie.titel = `${kopie.titel} (zweite Version)`;
        this.setze(e.art, null, kopie, { still: true });
      }
    }
    this.sichern();
    return true;
  }

  // Abgleich mit Supabase. konto = { url, schluessel, token } (token = Zugriffstoken des Nutzers)
  async sync(konto, _fetch = fetch) {
    if (!konto?.token) throw new SyncFehler('nicht-angemeldet', 'Nicht angemeldet.');
    const kopf = { apikey: konto.schluessel, authorization: `Bearer ${konto.token}`, 'content-type': 'application/json' };
    const basis = `${konto.url.replace(/\/+$/, '')}/rest/v1/${TABELLE}`;
    const rufe = async (url, opt = {}) => {
      let r;
      try { r = await _fetch(url, { ...opt, headers: { ...kopf, ...(opt.headers || {}) } }); } catch (e) { throw new SyncFehler('offline', 'Keine Verbindung – wird nachgeholt.'); }
      if (r.status === 401) throw new SyncFehler('nicht-angemeldet', 'Anmeldung abgelaufen.');
      if (!r.ok) throw new SyncFehler('fehler', `Sync-Fehler ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return r.status === 204 ? [] : r.json();
    };

    // 1. Holen, was andere Geräte geändert haben
    const seit = this.d.letzterAbruf ? `&geaendert=gt.${encodeURIComponent(this.d.letzterAbruf)}` : '';
    const neu = await rufe(`${basis}?select=id,art,daten,geloescht,geraet,geaendert${seit}&order=geaendert.asc&limit=5000`);
    let geholt = 0;
    for (const f of neu) {
      const e = this.d.eintraege[f.id];
      if (e && e.offen && e.geaendert !== f.geaendert) {
        // hier auch geändert → Konflikt (außer beide gleich)
        if (JSON.stringify(e.daten) === JSON.stringify(f.daten) && e.geloescht === f.geloescht) {
          Object.assign(e, { geaendert: f.geaendert, basis: f.geaendert, offen: false });
        } else if (!this.d.konflikte.some((k) => k.id === f.id)) {
          this.d.konflikte.push({ id: f.id, art: f.art, lokal: e.daten, lokalGeloescht: e.geloescht, lokalGeraet: e.geraet, lokalZeit: e.lokal, fern: f.daten, fernGeloescht: f.geloescht, fernGeraet: f.geraet, fernZeit: f.geaendert });
        }
      } else if (!e || !e.offen) {
        this.d.eintraege[f.id] = { id: f.id, art: f.art, daten: f.daten, geloescht: f.geloescht, geraet: f.geraet, geaendert: f.geaendert, basis: f.geaendert, lokal: f.geaendert, offen: false };
        geholt++;
      }
      if (!this.d.letzterAbruf || f.geaendert > this.d.letzterAbruf) this.d.letzterAbruf = f.geaendert;
    }

    // 2. Eigene Änderungen hochladen (nicht die mit Konflikt)
    const konfliktIds = new Set(this.d.konflikte.map((k) => k.id));
    const hoch = Object.values(this.d.eintraege).filter((e) => e.offen && !konfliktIds.has(e.id));
    let gesendet = 0;
    for (let i = 0; i < hoch.length; i += 200) {
      const teil = hoch.slice(i, i + 200);
      const antwort = await rufe(`${basis}?on_conflict=besitzer,id`, {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(teil.map((e) => ({ id: e.id, art: e.art, daten: e.daten, geloescht: e.geloescht, geraet: e.geraet }))),
      });
      for (const a of antwort) {
        const e = this.d.eintraege[a.id]; if (!e) continue;
        Object.assign(e, { geaendert: a.geaendert, basis: a.geaendert, offen: false });
        gesendet++;
      }
    }
    this.sichern();
    return { geholt, gesendet, wartend: this.wartend(), konflikte: this.d.konflikte.length };
  }
}

// ---------- Anmeldung bei Supabase (E-Mail + Kennwort) ----------
async function auth(konto, pfad, body, _fetch = fetch) {
  let r;
  try {
    r = await _fetch(`${konto.url.replace(/\/+$/, '')}/auth/v1/${pfad}`, { method: 'POST', headers: { apikey: konto.schluessel, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch { throw new SyncFehler('offline', 'Keine Verbindung zum Sync-Dienst.'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const t = d.msg || d.error_description || d.message || '';
    if (/invalid login|invalid_grant|credentials/i.test(t)) throw new SyncFehler('falsch', 'E-Mail oder Kennwort stimmt nicht.');
    if (/not confirmed/i.test(t)) throw new SyncFehler('unbestaetigt', 'Bitte erst den Link in der Bestätigungs-Mail anklicken.');
    if (/already registered/i.test(t)) throw new SyncFehler('vergeben', 'Für diese E-Mail gibt es schon ein Konto – bitte anmelden.');
    if (/password/i.test(t)) throw new SyncFehler('kennwort', 'Das Kennwort ist zu kurz oder zu einfach (mind. 8 Zeichen).');
    throw new SyncFehler('fehler', t || `Fehler ${r.status}`);
  }
  return d;
}
const anmelden = (konto, email, kennwort, f) => auth(konto, 'token?grant_type=password', { email, password: kennwort }, f);
const registrieren = (konto, email, kennwort, f) => auth(konto, 'signup', { email, password: kennwort }, f);
const erneuern = (konto, refresh, f) => auth(konto, 'token?grant_type=refresh_token', { refresh_token: refresh }, f);

module.exports = { Speicher, SyncFehler, ARTEN, anmelden, registrieren, erneuern, neueId };
