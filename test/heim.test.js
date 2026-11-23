'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Heim = require('../kern/heimdienst');
const { frageHeim, frage } = require('../kern/hirn');

test('Heim-Dienst: richtiger Code geht, falscher nicht, Rückfall wenn aus', async () => {
  const code = Heim.neuerCode();
  const server = Heim.starte({ port: 47471, code, frageClaude: async (a) => `ECHO:${a.auftrag}:${a.modell}`, einstellungen: () => ({}) });
  await new Promise((ok) => server.once('listening', ok));
  try {
    const t = await frageHeim({ system: 's', auftrag: 'hallo', adresse: 'http://127.0.0.1:47471', code });
    assert.strictEqual(t, 'ECHO:hallo:opus');
    await assert.rejects(frageHeim({ system: 's', auftrag: 'x', adresse: 'http://127.0.0.1:47471', code: 'falsch' }), /Kopplungscode/);
  } finally { server.close(); }
  // Heim-PC aus, Claude Code nicht da → Heim-Fehler kommt durch
  await assert.rejects(frage({ system: 's', auftrag: 'x' }, { weg: 'heim', heimAdresse: 'http://127.0.0.1:47479', heimCode: code, claudeProgramm: 'gibtsnicht-xyz' }), /Heim-PC ist nicht erreichbar/);
});
