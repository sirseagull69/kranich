'use strict';
// Der Verbund: alles, was mit der Zentrale zu tun hat.
//
//   Agent-Seite: dieses Geraet koppeln und im Hintergrund melden.
//   Host-Seite:  anmelden und alle eigenen Geraete sehen und beauftragen.
//
// Ohne Electron, damit es sich ohne Fenster testen laesst.

const fs = require('node:fs');
const path = require('node:path');

const SYSTEM = { win32: 'windows', darwin: 'macos' };

function erstelleVerbund({ kern, einstellungen, zugang, plattform, datenOrdner, defender = null, leseAutostart = null, version = '0', fetch, melde = () => {} }) {
  const agentDatei = path.join(datenOrdner, 'agent.json');
  const lies = () => {
    try {
      return JSON.parse(fs.readFileSync(agentDatei, 'utf8'));
    } catch {
      return null;
    }
  };

  // --- Agent --------------------------------------------------------------
  let agent = null;
  let letzte = { zeit: null, ok: null, fehler: null };

  function starteAgent() {
    const gekoppelt = lies();
    const schluessel = einstellungen.geheim('geraeteSchluessel');
    if (agent || !gekoppelt || !schluessel) return false;
    const transport = new kern.Zentrale({ url: zugang.url, apiSchluessel: zugang.apiSchluessel, geraeteSchluessel: schluessel, fetch });
    // Jede Meldung wird mitgeschrieben, damit das Statusfenster sie zeigen kann.
    const mitschrift = {
      sende: async (m) => {
        try {
          const a = await transport.sende(m);
          letzte = { zeit: new Date().toISOString(), ok: true, fehler: null };
          return a;
        } catch (fehler) {
          letzte = { zeit: letzte.zeit, ok: false, fehler: fehler.message };
          // Die Zentrale kennt den Schluessel nicht mehr: das Geraet wurde im Host entfernt.
          if (fehler.abgelehnt) setTimeout(() => verbund.agentEntkoppeln('Das Gerät wurde im Host entfernt'), 0);
          throw fehler;
        } finally {
          melde({ art: 'agent', status: verbund.agentStatus() });
        }
      },
      holeAuftraege: () => transport.holeAuftraege(),
      bestaetige: (id, e) => transport.bestaetige(id, e),
    };
    agent = new kern.Agent({
      geraet: { id: gekoppelt.geraetId, name: gekoppelt.name, system: gekoppelt.system },
      transport: mitschrift, defender, leseAutostart,
      speicher: kern.dateiSpeicher(path.join(datenOrdner, 'agent-stand.json')), version,
    });
    agent.start();
    return true;
  }

  // --- Host -----------------------------------------------------------------
  const konto = new kern.Konto({
    url: zugang.url, apiSchluessel: zugang.apiSchluessel, fetch,
    speicher: { lade: () => einstellungen.geheim('dauerticket'), sichere: (wert) => einstellungen.setzeGeheim('dauerticket', wert) },
  });
  const host = new kern.HostZentrale({ url: zugang.url, apiSchluessel: zugang.apiSchluessel, konto, fetch });

  const verbund = {
    // Agent
    agentStatus() {
      const g = lies();
      return { gekoppelt: Boolean(g && einstellungen.geheim('geraeteSchluessel')), name: g?.name ?? null, geraetId: g?.geraetId ?? null, laeuft: Boolean(agent), letzteMeldung: letzte.zeit, verbunden: letzte.ok, fehler: letzte.fehler };
    },
    async agentKoppeln(code) {
      if (lies()) return { ok: false, grund: 'Dieses Gerät ist schon gekoppelt' };
      const ziffern = String(code ?? '').replace(/\D/g, '');
      if (ziffern.length !== 8) return { ok: false, grund: 'Der Code hat acht Ziffern' };
      const a = await kern.Zentrale.kopple({ url: zugang.url, apiSchluessel: zugang.apiSchluessel, code: ziffern, fetch });
      if (!a.ok) return { ok: false, grund: a.grund || 'Koppeln hat nicht geklappt' };
      if (!einstellungen.setzeGeheim('geraeteSchluessel', a.schluessel)) {
        return { ok: false, grund: 'Der sichere Speicher des Systems ist nicht verfügbar. Das Gerät wurde nicht gekoppelt.' };
      }
      fs.mkdirSync(datenOrdner, { recursive: true });
      fs.writeFileSync(agentDatei, JSON.stringify({ geraetId: a.geraet_id, name: a.name, system: a.system, seit: new Date().toISOString() }));
      starteAgent();
      return { ok: true, name: a.name };
    },
    agentEntkoppeln(grund = null) {
      agent?.stopp();
      agent = null;
      einstellungen.setzeGeheim('geraeteSchluessel', null);
      fs.rmSync(agentDatei, { force: true });
      fs.rmSync(path.join(datenOrdner, 'agent-stand.json'), { force: true });
      letzte = { zeit: null, ok: null, fehler: grund };
      melde({ art: 'agent', status: verbund.agentStatus() });
      return { ok: true };
    },
    // Sofort melden, z. B. nach einem Fund.
    async agentJetzt() {
      if (!agent) return { ok: false, grund: 'Dieses Gerät ist nicht gekoppelt' };
      const runde = await agent.runde();
      return { ok: runde.gemeldet?.ok ?? true };
    },

    // Host
    kontoStatus: () => ({ angemeldet: konto.angemeldet, email: konto.email }),
    kontoAnmelden: (email, passwort) => konto.anmelden(email, passwort),
    kontoAnlegen: (email, passwort) => konto.anlegen(email, passwort),
    kontoAbmelden: () => konto.abmelden(),
    hostGeraete: () => host.geraete(),
    hostFunde: (id) => host.funde(id),
    hostEreignisse: (n) => host.ereignisse(n),
    hostAuftraege: (id) => host.auftraege(id),
    hostKopplung: (name, system) => host.kopplungErstellen(name, system),
    hostAuftrag: (id, art) => host.auftragSenden(id, art),
    hostUmbenennen: (id, name) => host.geraetUmbenennen(id, name),
    hostEntfernen: (id) => host.geraetEntfernen(id),
    // System dieses Geraets, wie die Zentrale es nennt.
    eigenesSystem: () => SYSTEM[plattform] ?? 'windows',

    starte: () => starteAgent(),
    beende: () => { agent?.stopp(); agent = null; },
  };
  return verbund;
}

const VERBUND_FUER_OBERFLAECHE = [
  'agentStatus', 'agentKoppeln', 'agentEntkoppeln', 'agentJetzt',
  'kontoStatus', 'kontoAnmelden', 'kontoAnlegen', 'kontoAbmelden',
  'hostGeraete', 'hostFunde', 'hostEreignisse', 'hostAuftraege', 'hostKopplung', 'hostAuftrag', 'hostUmbenennen', 'hostEntfernen',
  'eigenesSystem',
];

module.exports = { erstelleVerbund, VERBUND_FUER_OBERFLAECHE };
