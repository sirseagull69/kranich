'use strict';
// Nur fuer die Entwicklung: spielt die Zentrale im eigenen Speicher vor, damit
// sich Host und Agent ohne Netz ansehen und testen lassen.
//   KRANICH_SPIELZENTRALE=voll   zwei Geraete, eins davon offline mit Fund
//   KRANICH_SPIELZENTRALE=leer   Konto ohne Geraete
//   KRANICH_SPIELZENTRALE=aus    Zentrale nicht erreichbar
// Anmelden klappt mit jedem Passwort ausser "falsch". Kopplungscode: 12345678.

const UUID = (n) => `00000000-0000-4000-8000-00000000000${n}`;

module.exports = function spielzentrale(art = 'voll') {
  const vorMin = (m) => new Date(Date.now() - m * 60000).toISOString();
  const status = { dienst: true, antivirus: true, echtzeit: true, modus: 'Normal', signaturAlterTage: 0, letzterSchnellScan: vorMin(190), letzterVollScan: null };
  const geraete = art === 'voll' ? [
    { id: UUID(1), name: 'PC', system: 'windows', erstellt: vorMin(9000), zuletzt_gesehen: vorMin(1), version: '0.4.0', ampel: 'ok', ampel_gruende: [], status, offene_funde: 0, scan_laeuft: false },
    { id: UUID(2), name: 'MacBook', system: 'macos', erstellt: vorMin(8000), zuletzt_gesehen: vorMin(185), version: '0.4.0', ampel: 'kritisch', ampel_gruende: ['1 offener Fund'], status: null, offene_funde: 1, scan_laeuft: false },
  ] : [];
  const funde = [{ id: 1, geraet_id: UUID(2), schluessel: 'a1', name: 'Trojan:Win32/Wacatac', schwere: 'hoch', zustand: 'erkannt', offen: true, pfade: ['/Users/nils/Downloads/Rechnung.pdf.exe'], erkannt: vorMin(200), gemeldet: vorMin(199) }];
  const ereignisse = art === 'voll' ? [
    { id: 2, geraet_id: UUID(2), art: 'fund', inhalt: 'Trojan:Win32/Wacatac in Rechnung.pdf.exe', zeit: vorMin(199) },
    { id: 1, geraet_id: UUID(1), art: 'gekoppelt', inhalt: 'Gerät gekoppelt', zeit: vorMin(9000) },
  ] : [];
  const auftraege = [];
  let zaehler = 10;

  const antwort = (status_, daten) => ({ ok: status_ >= 200 && status_ < 300, status: status_, json: async () => daten });

  return async function fetch(url, { method = 'GET', body } = {}) {
    if (art === 'aus') throw new Error('kein Netz');
    const werte = body ? JSON.parse(body) : {};
    const pfad = String(url).replace(/^https?:\/\/[^/]+/, '');
    if (pfad.startsWith('/auth/v1/token')) {
      if (werte.password === 'falsch') return antwort(400, { error_code: 'invalid_credentials' });
      return antwort(200, { access_token: 'spiel', refresh_token: 'spiel-dauer', expires_in: 3600, user: { email: werte.email || 'nils@beispiel.de' } });
    }
    if (pfad.startsWith('/auth/v1/signup')) return antwort(200, { user: { email: werte.email } });
    if (pfad.startsWith('/auth/v1/')) return antwort(200, {});
    if (pfad.startsWith('/rest/v1/rpc/kopplung_erstellen')) return antwort(200, '12345678');
    if (pfad.startsWith('/rest/v1/rpc/agent_kopple')) {
      if (werte.p_code !== '12345678') return antwort(200, { ok: false, grund: 'Code falsch oder abgelaufen' });
      return antwort(200, { ok: true, geraet_id: UUID(3), schluessel: 'spiel-schluessel', name: 'Zephyrus', system: 'windows' });
    }
    if (pfad.startsWith('/rest/v1/rpc/agent_auftraege')) return antwort(200, []);
    if (pfad.startsWith('/rest/v1/rpc/agent_')) return antwort(200, { ok: true });
    if (pfad.startsWith('/rest/v1/geraete')) {
      const id = (pfad.match(/id=eq\.([0-9a-f-]+)/) || [])[1];
      const g = geraete.find((x) => x.id === id);
      if (method === 'PATCH' && g) { g.name = werte.name; return antwort(204, null); }
      if (method === 'DELETE' && g) { geraete.splice(geraete.indexOf(g), 1); return antwort(204, null); }
      return antwort(200, geraete);
    }
    const geraetId = (pfad.match(/geraet_id=eq\.([0-9a-f-]+)/) || [])[1];
    if (pfad.startsWith('/rest/v1/funde')) return antwort(200, funde.filter((f) => f.geraet_id === geraetId));
    if (pfad.startsWith('/rest/v1/ereignisse')) return antwort(200, ereignisse);
    if (pfad.startsWith('/rest/v1/auftraege')) {
      if (method === 'POST') {
        const a = { id: UUID(zaehler++ % 10), geraet_id: werte.geraet_id, art: werte.art, zustand: 'offen', ergebnis: null, erstellt: new Date().toISOString(), erledigt_am: null };
        auftraege.unshift(a);
        // Das Geraet "arbeitet" ein paar Sekunden und meldet dann fertig.
        const g = geraete.find((x) => x.id === a.geraet_id);
        setTimeout(() => { a.zustand = 'laeuft'; if (g) g.scan_laeuft = true; }, 3000);
        setTimeout(() => { a.zustand = 'erledigt'; a.ergebnis = { zustand: 'erledigt', neueFunde: 0 }; a.erledigt_am = new Date().toISOString(); if (g) g.scan_laeuft = false; }, 14000);
        return antwort(201, [a]);
      }
      return antwort(200, auftraege.filter((a) => a.geraet_id === geraetId));
    }
    return antwort(404, { message: 'Das kennt die Spiel-Zentrale nicht' });
  };
};
