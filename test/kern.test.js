'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const A = require('../kern/auftraege');
const { Projekte } = require('../kern/projekte');
const { Einstellungen } = require('../kern/einstellungen');
const { htmlFuerApp, svgAusHtml, dateiname } = require('../kern/export');
const hirn = require('../kern/hirn');
const { lookText } = require('../kern/familie');

const HTML = '<!doctype html><html><head><style>body{margin:0}</style></head><body><h1 data-k="k1" data-name="Titel">Hallo</h1></body></html>';

test('leseEntwurf holt Notiz und HTML aus einem Codeblock', () => {
  const r = A.leseEntwurf(`NOTIZ: Ich habe die Knöpfe größer gemacht.\n\n\`\`\`html\n${HTML}\n\`\`\``);
  assert.equal(r.notiz, 'Ich habe die Knöpfe größer gemacht.');
  assert.match(r.html, /^<!doctype html>/i);
  assert.match(r.html, /<h1 data-k="k1"/);
});

test('leseEntwurf findet HTML auch ohne Codeblock und ergänzt doctype', () => {
  const r = A.leseEntwurf('Hier: <html><body><p>x</p></body></html> fertig');
  assert.match(r.html, /^<!doctype html>\n<html>/);
});

test('leseEntwurf wirft ohne Entwurf', () => {
  assert.throws(() => A.leseEntwurf('Ich kann das leider nicht.'), /kein Entwurf/);
});

test('Aufträge enthalten Wunsch, Fläche, Auswahl und Look', () => {
  const sys = A.systemEntwurf({ lookHinweise: 'Immer Grün für Erledigt' });
  assert.match(sys, /data-name/);
  assert.match(sys, /Immer Grün für Erledigt/);
  assert.match(sys, /#7c5cd6/);
  const a = A.auftragAendern({ html: HTML, wunsch: 'größer', auswahl: { k: 'k1', name: 'Titel' }, breite: 800, hoehe: 600 });
  assert.match(a, /data-k="k1"/);
  assert.match(a, /800 × 600/);
  assert.match(A.auftragNeu({ wunsch: 'Login', app: 'origami', format: { name: 'Story', regeln: '250 px frei' } }), /Story\. 250 px frei/);
  assert.match(A.auftragVariante({ html: '', wunsch: 'x', richtung: A.RICHTUNGEN[1], breite: 1, hoehe: 1 }), /Mutig/);
  assert.equal(A.RICHTUNGEN.length, 3);
});

test('pruefePlan lässt nur erlaubte Schritte mit gültigen Werten durch', () => {
  const s = A.pruefePlan([
    { art: 'freistellen' },
    { art: 'quadrat', groesse: 1080 },
    { art: 'anpassen', hell: 250, waerme: -8 },
    { art: 'loesche_festplatte' },
    { art: 'drehen', grad: 45 },
    { art: 'zuschneiden', x: 10, y: 10, b: 0, h: 50 },
    { art: 'text', inhalt: 'Sale', x: 5, y: 5, groesse: 80, farbe: '#FFFFFF' },
    { art: 'hintergrund', farbe: 'rot' },
    { art: 'anpassen' },
  ]);
  assert.deepEqual(s, [
    { art: 'freistellen' },
    { art: 'quadrat', groesse: 1080 },
    { art: 'anpassen', hell: 100, waerme: -8 },
    { art: 'text', inhalt: 'Sale', x: 5, y: 5, groesse: 80, farbe: '#ffffff' },
  ]);
});

test('lesePlan liest JSON auch im Codeblock und wirft ohne Schritte', () => {
  const r = A.lesePlan('```json\n{"notiz":"Mach ich.","schritte":[{"art":"freistellen"},{"art":"quadrat","groesse":1080}]}\n```');
  assert.equal(r.notiz, 'Mach ich.');
  assert.equal(r.schritte.length, 2);
  assert.throws(() => A.lesePlan('{"notiz":"x","schritte":[{"art":"boese"}]}'), /keinen machbaren/);
  assert.equal(A.beschreibeSchritt({ art: 'anpassen', hell: 12, waerme: -8 }), 'Helligkeit +12, Wärme -8');
});

test('Projekte anlegen, speichern, auflisten, Dateien, löschen', () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kr-test-'));
  const p = new Projekte(ordner);
  const a = p.anlegen({ art: 'entwurf' });
  const b = p.anlegen({ art: 'bild', name: 'Tasse' });
  assert.equal(a.seiten.length, 1);
  assert.ok(b.bild);
  a.name = 'To-do-App';
  p.speichern(a);
  const liste = p.liste();
  assert.equal(liste.length, 2);
  assert.ok(liste.find((x) => x.name === 'To-do-App'));
  p.schreibeDatei(b.id, 'ebene-abc.png', Buffer.from([1, 2, 3]));
  assert.deepEqual([...p.leseDatei(b.id, 'ebene-abc.png')], [1, 2, 3]);
  assert.throws(() => p.schreibeDatei(b.id, '../boese.png', Buffer.from([])), /Ungültiger Dateiname/);
  assert.throws(() => p.laden('../../etc'), /Ungültige Projekt-Nummer/);
  p.loeschen(a.id);
  assert.equal(p.liste().length, 1);
});

test('Einstellungen geben den Schlüssel nie heraus und behalten ihn bei leerer Eingabe', () => {
  const datei = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kr-e-')), 'e.json');
  const e = new Einstellungen(datei);
  e.setze({ apiSchluessel: 'sk-geheim', weg: 'api', unbekannt: 1, appOrdner: { eule: 'C:/x' } });
  const o = e.setze({ apiSchluessel: '' });
  assert.equal(o.apiSchluessel, undefined);
  assert.equal(o.apiSchluesselGesetzt, true);
  assert.equal(new Einstellungen(datei).alle().apiSchluessel, 'sk-geheim');
  assert.equal(o.appOrdner.eule, 'C:/x');
  assert.equal(o.appOrdner.origami, '');
  assert.equal(o.unbekannt, undefined);
});

test('Export entfernt interne Marken, baut SVG und sichere Dateinamen', () => {
  assert.doesNotMatch(htmlFuerApp(HTML), /data-k|data-name/);
  assert.match(htmlFuerApp(HTML, { namenBehalten: true }), /data-name/);
  const svg = svgAusHtml(HTML, 800, 600);
  assert.match(svg, /<foreignObject/);
  assert.match(svg, /width="800"/);
  assert.doesNotMatch(svg, /data-k/);
  assert.equal(dateiname('To-do-App Startseite / Größe'), 'to-do-app-startseite-grosse');
  assert.equal(dateiname(''), 'kranich');
});

test('Look der Familie nennt alle Apps', () => {
  const t = lookText();
  for (const n of ['Kranich', 'origami', 'Eule', 'Elster']) assert.match(t, new RegExp(n));
});

function falschesKind({ ausgabe = '', fehler = '', code = 0, enoent = false }) {
  return (prog, args) => {
    const k = new EventEmitter();
    k.stdout = new EventEmitter(); k.stderr = new EventEmitter();
    // Unter Windows kommt alles als eine Befehlszeile (mit Shell), sonst als Liste.
    k.befehl = Array.isArray(args) ? [prog, ...args].map((a) => (a === '' ? '""' : `"${a}"`)).join(' ') : prog;
    k.stdin = { end: (text) => { k.eingabe = text; setImmediate(() => {
      if (enoent) { const e = new Error('nope'); e.code = 'ENOENT'; k.emit('error', e); return; }
      if (ausgabe) k.stdout.emit('data', ausgabe);
      if (fehler) k.stderr.emit('data', fehler);
      k.emit('close', code);
    }); } };
    k.kill = () => {};
    falschesKind.letztes = k;
    return k;
  };
}

test('frageClaude gibt das Ergebnis zurück und schickt den Auftrag über stdin', async () => {
  const text = await hirn.frageClaude({ system: 'S', auftrag: 'Mach was', _spawn: falschesKind({ ausgabe: JSON.stringify({ type: 'result', is_error: false, result: 'Antwort' }) }) });
  assert.equal(text, 'Antwort');
  const k = falschesKind.letztes;
  assert.equal(k.eingabe, 'Mach was');
  assert.match(k.befehl, /"--system-prompt-file"/);
  assert.match(k.befehl, /"--no-session-persistence"/);
  assert.match(k.befehl, /"--tools" ""/);
});

test('frageClaude mit Bild erlaubt nur Read im Bildordner', async () => {
  const bild = path.join(os.tmpdir(), 'kr-test.png');
  fs.writeFileSync(bild, Buffer.from([137, 80, 78, 71]));
  await hirn.frageClaude({ system: 'S', auftrag: 'Sieh hin', bilder: [bild], _spawn: falschesKind({ ausgabe: JSON.stringify({ result: 'ok', is_error: false }) }) });
  const k = falschesKind.letztes;
  assert.match(k.befehl, /"--tools" "Read"/);
  assert.match(k.eingabe, /ANGEHÄNGTE BILDER/);
});

test('frageClaude erkennt fehlendes Programm und fehlende Anmeldung', async () => {
  await assert.rejects(hirn.frageClaude({ system: '', auftrag: 'x', _spawn: falschesKind({ enoent: true }) }), (e) => e.art === 'nicht-installiert');
  await assert.rejects(hirn.frageClaude({ system: '', auftrag: 'x', _spawn: falschesKind({ ausgabe: JSON.stringify({ is_error: true, result: 'Invalid API key · Please run /login' }), code: 1 }) }), (e) => e.art === 'nicht-angemeldet');
  await assert.rejects(hirn.frageClaude({ system: '', auftrag: 'x', _spawn: falschesKind({ fehler: 'getaddrinfo ENOTFOUND api.anthropic.com', code: 1 }) }), (e) => e.art === 'keine-verbindung');
});

test('frageApi und frageLokal sprechen die richtigen Adressen an', async () => {
  let aufruf;
  const t = await hirn.frageApi({ system: 'S', auftrag: 'A', schluessel: 'k', _fetch: async (url, o) => { aufruf = { url, o }; return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'hi' }] }) }; } });
  assert.equal(t, 'hi');
  assert.match(aufruf.url, /api\.anthropic\.com\/v1\/messages/);
  assert.equal(aufruf.o.headers['x-api-key'], 'k');
  await assert.rejects(hirn.frageApi({ system: '', auftrag: '' }), (e) => e.art === 'nicht-angemeldet');
  const l = await hirn.frageLokal({ system: 'S', auftrag: 'A', _fetch: async (url) => { aufruf = url; return { ok: true, json: async () => ({ message: { content: 'lokal' } }) }; } });
  assert.equal(l, 'lokal');
  assert.match(aufruf, /11434\/api\/chat/);
});

const F = require('../kern/formate');
const { platzDaneben, ordneAn } = require('../kern/projekte');

test('Formate: alle Gruppen, Druck in mm umgerechnet, eigenes Format geprüft', () => {
  for (const g of F.GRUPPEN) assert.ok(F.FORMATE.some((f) => f.gruppe === g), g);
  const a5 = F.format('a5');
  assert.equal(a5.breite, 559); assert.equal(a5.hoehe, 794);
  assert.equal(F.massText(a5), '148 × 210 mm');
  assert.equal(F.massText(F.format('post')), '1080 × 1080');
  assert.equal(F.eigenesFormat(100, 50, 'mm').breite, 378);
  assert.throws(() => F.eigenesFormat(10, 10), /zwischen 40/);
  assert.throws(() => F.eigenesFormat(0, 10), /größer als 0/);
});

test('Boards: Platz daneben und alte Projekte anordnen', () => {
  const s = [{ x: 0, y: 0, breite: 1080 }, { x: 1200, y: 0, breite: 1080 }];
  assert.deepEqual(platzDaneben(s, s[0]), { x: 2400, y: 0 });
  assert.deepEqual(platzDaneben([], null), { x: 0, y: 0 });
  const p = ordneAn({ seiten: [{ breite: 1440 }, { breite: 390 }] });
  assert.equal(p.seiten[0].x, 0); assert.equal(p.seiten[1].x, 1560); assert.equal(p.seiten[1].format, 'web');
});

test('Auftrag Anpassen nennt Ziel, Regeln und Textwunsch', () => {
  const a = A.auftragAnpassen({ html: HTML, von: { name: 'Post', breite: 1080, hoehe: 1080 }, nach: F.format('story'), texteAnpassen: false });
  assert.match(a, /Ziel: 1080 × 1920 px/);
  assert.match(a, /250 px frei/);
  assert.match(a, /wörtlich gleich/);
  assert.match(a, /data-k="k1"/);
});
