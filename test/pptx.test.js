'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { pptxSchreiben, pptxLesen } = require('../kern/pptx');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('PowerPoint: Folien mit Notizen raus und wieder rein', async () => {
  const buf = await pptxSchreiben([
    { breite: 1920, hoehe: 1080, png: PNG, notiz: 'Erst begrüßen.\nDann Zahlen.' },
    { breite: 1920, hoehe: 1080, png: PNG, notiz: '' },
  ], { titel: 'Test' });
  assert.ok(buf.length > 1000);
  const r = await pptxLesen(buf);
  assert.strictEqual(r.folien.length, 2);
  assert.strictEqual(r.hoehe, 1080);
  assert.match(r.folien[0].notiz, /Erst begrüßen\.\nDann Zahlen\./);
  assert.match(r.folien[0].html, /<img data-name="Bild" src="data:image\/png;base64,/);
  assert.strictEqual(r.folien[1].notiz, '');
});

test('PowerPoint: Kaputte Datei gibt verständlichen Fehler', async () => {
  await assert.rejects(() => pptxLesen(Buffer.from('kein zip')));
});
