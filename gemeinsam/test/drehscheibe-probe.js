const D = require('../drehscheibe.js');
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const ordner = '/tmp/dt/ordner';
  const a = D.starte({ name: 'schwalbe', ordner, beiAnfrage: async (typ, m) => ({ echo: typ, inhalt: m.inhalt, von: m.von }) });
  const b = D.starte({ name: 'albatros', ordner, beiAnfrage: async (typ) => ({ tabelle: [[1, 2]], typ }) });
  await warte(1500);
  console.log('apps', (await a.apps()).map((x) => x.app).sort().join(','));
  console.log('b fragt a', JSON.stringify(await b.frage('schwalbe', 'einsetzen', { inhalt: { text: 'Hallo' } })));
  console.log('a fragt b', JSON.stringify(await a.frage('albatros', 'lesen')));
  console.log('nicht offen', JSON.stringify(await a.frage('kranich', 'lesen')));
  // Besitzer (a hat zuerst aufgemacht) geht weg → b übernimmt
  await a.stopp(); await warte(2500);
  const c = D.starte({ name: 'kranich', ordner, beiAnfrage: async () => ({ ok: 'kranich da' }) });
  await warte(2000);
  console.log('nach Wechsel', (await b.apps()).map((x) => x.app).sort().join(','), JSON.stringify(await b.frage('kranich', 'lesen')));
  await b.stopp(); await c.stopp(); process.exit(0);
})();
