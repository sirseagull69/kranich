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

test('Deutsche Windows-Meldung „nicht gefunden“ zählt als nicht installiert', async () => {
  const { frageClaude } = require('../kern/hirn');
  const { EventEmitter } = require('node:events');
  const falsch = () => { const k = new EventEmitter(); k.stdout = new EventEmitter(); k.stderr = new EventEmitter(); k.stdin = { end: () => setTimeout(() => { k.stderr.emit('data', 'Der Befehl ""claude"" ist entweder falsch geschrieben oder konnte nicht gefunden werden.'); k.emit('close', 1); }, 5) }; k.kill = () => {}; return k; };
  await assert.rejects(frageClaude({ system: 's', auftrag: 'a', _spawn: falsch }), (f) => f.art === 'nicht-installiert');
});
