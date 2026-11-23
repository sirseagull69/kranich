'use strict';
// Rauchtest: startet das echte Programm mit vorgespieltem Claude und klickt
// es durch. Bilder landen in ./rauch/. Aufruf: xvfb-run -a npx electron werkzeug/rauch.js
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
process.env.KRANICH_RAUCH = '1';
process.env.KRANICH_SPIELHIRN = process.env.KRANICH_SPIELHIRN || '1';
process.env.KRANICH_DATEN = fs.mkdtempSync(path.join(os.tmpdir(), 'kranich-rauch-'));
const { app } = require('electron');
const { start, pruefe: pruefeEntwurf } = require('../main/main');

const AUS = path.join(__dirname, '..', 'rauch');
fs.mkdirSync(AUS, { recursive: true });
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
let fehler = 0;

app.whenReady().then(async () => {
  const w = start();
  w.setSize(1440, 900);
  w.webContents.on('console-message', (_e, level, msg, zeile, quelle) => { if (level >= 3) { console.log('KONSOLE:', msg, quelle, zeile); fehler++; } });
  const js = (code) => w.webContents.executeJavaScript(code).catch((e) => { console.log('JS-FEHLER bei:', code.slice(0, 160)); throw e; });
  const foto = async (name) => { await warte(350); const b = await w.webContents.capturePage(); fs.writeFileSync(path.join(AUS, `${name}.png`), b.toPNG()); console.log('Foto', name); };
  const pruefe = async (was, code) => { const ok = await js(code); console.log(ok ? 'OK  ' : 'FEHL', was); if (!ok) fehler++; };
  const bisDa = async (code, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await js(code)) return true; await warte(150); } return false; };

  try {
    await w.webContents.once('did-finish-load', () => {});
    // Selbstprüfung mit absichtlich kaputtem Entwurf
    const kaputt = '<!doctype html><html><head><style>body{margin:0;width:390px;height:844px;background:#fff}</style></head><body><h1 data-k="k1" style="font-size:28px;color:#e8e8e8">Kaum lesbar</h1><p data-k="k2" style="font-size:9px">winzig</p><div data-k="k3" style="width:500px;height:20px;background:#ccc">zu breit</div><button data-k="k4" style="height:24px">OK</button><div data-k="k5" style="width:100px;height:20px;overflow:hidden;white-space:nowrap">Dieser Text ist viel zu lang für den Kasten</div></body></html>';
    const funde = await pruefeEntwurf(kaputt, { id: 'app', breite: 390, hoehe: 844 });
    const arten = new Set(funde.map((f) => f.art));
    console.log(['raus', 'ueberlauf', 'klein', 'kontrast', 'ziel'].every((a) => arten.has(a)) ? 'OK  ' : 'FEHL', 'Selbstprüfung findet alle Fehlerarten', [...arten].join(','));
    const gut = await pruefeEntwurf('<!doctype html><html><head><style>body{margin:0;width:390px;height:844px;background:#fff;color:#1d2742;font-size:16px}button{min-height:48px;min-width:120px}</style></head><body><h1>Hallo</h1><p>Alles gut lesbar.</p><button>Weiter</button></body></html>', { id: 'app', breite: 390, hoehe: 844 });
    console.log(gut.length === 0 ? 'OK  ' : 'FEHL', 'Selbstprüfung lässt sauberen Entwurf in Ruhe', JSON.stringify(gut.map((f) => f.text)));
    await bisDa("!!document.querySelector('#start')");
    await foto('1-start');
    await pruefe('Start zeigt vier Karten', "document.querySelectorAll('.kl-karte').length === 4");

    // Format wählen
    await js("document.querySelector('.kl-karte[data-art=entwurf]').click()");
    await bisDa("document.querySelectorAll('.formatkarte').length >= 5");
    await pruefe('Formatauswahl zeigt Gruppen und App & Web', "document.querySelectorAll('.formatkarte').length === 5 && document.querySelectorAll('[data-aktion=\"format-gruppe\"]').length === 6");
    await js("document.querySelector('[data-aktion=\"format-gruppe\"][data-g=\"Druck\"]').click()");
    await pruefe('Gruppe Druck zeigt 4 Formate', "document.querySelectorAll('.formatkarte').length === 4");
    await js("document.getElementById('fsuche').value = 'story'; document.getElementById('fsuche').dispatchEvent(new Event('input'))");
    await pruefe('Suche filtert', "document.querySelectorAll('.formatkarte').length === 1");
    await js("document.getElementById('fsuche').value = ''; document.getElementById('fsuche').dispatchEvent(new Event('input'))");
    await js("document.querySelector('[data-aktion=\"format-gruppe\"][data-g=\"App & Web\"]').click()");
    await js("document.querySelector('[data-aktion=\"format-waehlen\"][data-id=\"web\"]').click()");
    await foto('1b-format');
    // Neuer Entwurf über das Eingabefeld
    await js("document.getElementById('startwunsch').value = 'Startseite für eine To-do-App'; App.aktionen['start-falten']()");
    await bisDa("App.S.kranich.zustand === 'denkt'", 3000);
    await foto('2-denkt');
    await bisDa("App.S.kranich.zustand === 'fertig'");
    await bisDa("document.querySelector('.leinwand iframe')?.contentDocument?.querySelector('[data-k]')");
    await warte(500);
    await pruefe('Entwurf liegt auf der Leinwand', "!!document.querySelector('.leinwand iframe').contentDocument.querySelector('h1')");
    await pruefe('Board hat Format Webseite', "App.S.projekt.seiten[0].format === 'web' && App.S.projekt.seiten[0].breite === 1440");
    await pruefe('Ebenen wurden gebaut', "document.querySelectorAll('.ebenen button').length >= 3");
    // Element anklicken
    await js("document.querySelector('.leinwand iframe').contentDocument.querySelector('button').click()");
    await warte(300);
    await pruefe('Auswahl gesetzt', "App.S.auswahl && /Neue Aufgabe/.test(App.S.auswahl.name)");
    await pruefe('Schnellmenü sichtbar', "!document.querySelector('.schnellmenue').hidden");
    await foto('3-werkbank-auswahl');
    await js("App.aktionen['schnell-groesser']()");
    await bisDa("App.S.kranich.zustand === 'fertig' && App.S.projekt.chat.length >= 4");
    await warte(600);
    await pruefe('Änderung landet als neue Fassung', "App.S.projekt.seiten[0].verlauf.length === 2");
    await foto('4-fertig');
    await js("App.aktionen.rueckgaengig()");
    await pruefe('Rückgängig springt zurück', "App.S.projekt.seiten[0].stand === 0");

    // Varianten
    await js("App.aktionen.varianten()");
    await bisDa("App.S.varianten && App.S.varianten.length === 3", 8000);
    await warte(800);
    await foto('5-varianten');
    await pruefe('Drei Varianten', "document.querySelectorAll('.variante iframe').length === 3");
    await js("document.querySelector('[data-aktion=\"variante-nehmen\"][data-i=\"1\"]').click()");
    await warte(500);
    await pruefe('Variante übernommen', "/Mutig/.test(App.S.projekt.seiten[0].verlauf.at(-1).was)");

    // Export
    await js("document.querySelector('[data-aktion=\"exportieren\"]').click()");
    await bisDa("!!document.querySelector('.dialog')");
    await warte(600);
    await foto('6-export');
    await js("document.querySelector('[data-format=\"html\"]').click(); document.querySelector('[data-los]').click()");
    await bisDa("!document.querySelector('.dialog')");
    await js("document.querySelector('[data-aktion=\"exportieren\"]').click()");
    await bisDa("!!document.querySelector('.dialog')");
    await js("document.querySelector('[data-faktor=\"2\"]').click(); document.querySelector('[data-los]').click()");
    await bisDa("!document.querySelector('.dialog')", 10000);
    const ordner = path.join(app.getPath('documents'), 'Kranich');
    const dateien = fs.existsSync(ordner) ? fs.readdirSync(ordner) : [];
    console.log(dateien.some((d) => d.endsWith('.html')) && dateien.some((d) => d.endsWith('.png')) ? 'OK   Export HTML und PNG' : `FEHL Export (${dateien})`);
    const png = dateien.filter((d) => d.endsWith('.png')).map((d) => path.join(ordner, d)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    if (png) { const { nativeImage } = require('electron'); const s = nativeImage.createFromPath(png).getSize(); console.log(s.width === 2880 ? 'OK  ' : 'FEHL', 'PNG in 2×', s); fs.copyFileSync(png, path.join(AUS, '7-export-ergebnis.png')); }

    // Bild-Modus
    // Board dazu und Alle Größen
    await js("document.querySelector('.seitenleiste [data-aktion=\"board-dazu\"]').click()");
    await bisDa("!!document.querySelector('.dialog [data-aktion=\"dlg-format\"]')");
    await js("document.querySelector('.dialog [data-aktion=\"dlg-format\"][data-id=\"post\"]').click()");
    await warte(500);
    await pruefe('Board dazu: Post neben der Webseite', "App.S.projekt.seiten.length === 2 && App.S.projekt.seiten[1].format === 'post' && App.S.projekt.seiten[1].x === 1560 && !App.S.auswahl");
    await js("document.getElementById('wunsch').value = 'Einladung zum Sommerfest'; App.aktionen.senden()");
    await bisDa("App.S.kranich.zustand === 'fertig' && !!App.S.projekt.seiten[1].html");
    await warte(600);
    await js("document.querySelector('[data-aktion=\"alle-groessen\"]').click()");
    await bisDa("!!document.querySelector('.groessenliste')");
    await warte(900);
    await foto('8a-alle-groessen');
    await pruefe('Vorschlag: Story, Banner, Flyer gewählt', "document.querySelectorAll('.groessenkarte[aria-pressed=\"true\"]').length === 3");
    await js("document.querySelector('[data-los]').click()");
    await bisDa("App.S.projekt.seiten.length === 5", 3000);
    await warte(250);
    await foto('8b-anpassen-laeuft');
    await bisDa("App.S.kranich.zustand === 'fertig'", 15000);
    await warte(800);
    await pruefe('Drei neue Boards gefaltet', "App.S.projekt.seiten.length === 5 && App.S.projekt.seiten.slice(2).every((x) => x.html && x.html.includes(x.breite + 'px'))");
    await pruefe('Story hat richtige Größe', "(() => { const s = App.S.projekt.seiten.find((x) => x.format === 'story'); return s.breite === 1080 && s.hoehe === 1920; })()");
    await js("Entwurf.einpassen()");
    await foto('8c-leinwand-voll');
    await js("document.querySelectorAll('.seitenlaschen [data-aktion=\"seite\"]')[3].click()");
    await warte(400);
    await pruefe('Board wechseln per Lasche', "App.S.seiteId === App.S.projekt.seiten[3].id");

    await js("document.querySelector('[data-modus=\"bild\"]').click()");
    await warte(300);
    await foto('8-bild-leer');
    await js(`(async () => {
      const c = document.createElement('canvas'); c.width = 1200; c.height = 900;
      const k = c.getContext('2d'); k.fillStyle = '#f4f1ea'; k.fillRect(0, 0, 1200, 900);
      k.fillStyle = '#4a2f9a'; k.beginPath(); k.roundRect(450, 300, 300, 340, [10, 10, 60, 60]); k.fill();
      k.strokeStyle = '#4a2f9a'; k.lineWidth = 30; k.beginPath(); k.arc(770, 450, 70, -1.2, 1.2); k.stroke();
      window.KRANICH_OHNE_KI = true;
      await Bild.oeffneBild(c.toDataURL(), 'tasse.png');
      App.renderWerkbank();
    })()`);
    await warte(500);
    await pruefe('Bild geöffnet', "Bild.z.breite === 1200 && document.querySelectorAll('.werkzeuge button.wz').length === 8");
    await foto('9-bild');
    await js("document.getElementById('wunsch').value = 'Hintergrund weg und auf 1080×1080'; App.aktionen.senden()");
    await bisDa("App.S.kranich.zustand === 'fertig'", 15000);
    await warte(500);
    await pruefe('Plan angewendet: 1080 × 1080', "Bild.z.breite === 1080 && Bild.z.hoehe === 1080");
    await pruefe('Hintergrund durchsichtig', "(() => { const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const k = c.getContext('2d'); for (const e of Bild.z.ebenen) k.drawImage(e.canvas, e.x, e.y); return k.getImageData(5, 5, 1, 1).data[3] === 0 && k.getImageData(540, 540, 1, 1).data[3] === 255; })()");
    await pruefe('Regler gesetzt', "Bild.z.anpassung.hell === 12 && Bild.z.anpassung.waerme === -8");
    await foto('10-bild-fertig');
    // Werkzeuge
    await js("App.aktionen.werkzeug({ dataset: { w: 'zuschneiden' } })");
    await js(`(() => { const f = document.getElementById('bildflaeche'); const r = f.getBoundingClientRect();
      const ev = (t, x, y) => f.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, pointerId: 1, bubbles: true }));
      ev('pointerdown', r.width * 0.4, r.height * 0.3); ev('pointermove', r.width * 0.6, r.height * 0.6); ev('pointerup', r.width * 0.6, r.height * 0.6); })()`);
    await warte(200);
    await foto('11-zuschneiden');
    await js("App.aktionen['zuschnitt-an']()");
    await pruefe('Zuschnitt verkleinert', "Bild.z.breite < 1080");
    await js("App.aktionen.rueckgaengig()");
    await pruefe('Rückgängig im Bild', "Bild.z.breite === 1080");
    // Speichern und neu laden
    await warte(1500);
    await js("App.aktionen['zum-start']()");
    await bisDa("!!document.querySelector('#start')");
    await warte(3500);
    await js("App.zeigeStart()");
    await warte(800);
    await foto('12-start-mit-projekt');
    await pruefe('Projekt in der Liste', "document.querySelectorAll('.sk-zeile').length >= 1");
    await js("document.querySelector('[data-lasche=\"alle\"]').click()");
    await warte(400);
    await foto('12b-oeffnen');
    await pruefe('Öffnen zeigt Auswahl', "!!document.querySelector('.auswahlkarte [data-aktion=\"projekt-oeffnen\"]')");
    await js("document.querySelector('[data-aktion=\"projekt-oeffnen\"]').click()");
    await bisDa("App.S.ansicht === 'werkbank'");
    await warte(600);
    await pruefe('Bild nach Neuladen da', "App.S.modus !== 'bild' || Bild.z.breite === 1080");
    await js("document.querySelector('[data-modus=\"bild\"]').click()");
    await warte(300);
    await pruefe('Bild-Ebenen gespeichert', "Bild.z.ebenen.length >= 1 && Bild.z.breite === 1080");
    await js("document.querySelector('[data-modus=\"entwurf\"]').click()");
    await warte(600);
    await pruefe('Entwurf nach Neuladen da', "!!document.querySelector('.leinwand iframe').contentDocument.querySelector('h1')");

    // Ganze App entwerfen
    await js("App.aktionen['zum-start']()");
    await bisDa("!!document.querySelector('#start')");
    await js("document.querySelector('[data-aktion=\"neu\"][data-art=\"app\"]').click()");
    await bisDa("!!document.getElementById('appwunsch')");
    await js("document.getElementById('appwunsch').value = 'Eule – Schreibprogramm der origami-Familie'");
    await foto('15-app-auftrag');
    await js("App.aktionen['app-plan']()");
    await bisDa("!!document.querySelector('.planblatt')", 8000);
    await warte(400);
    await foto('16-app-plan');
    await pruefe('Plan: 3 Bildschirme, Ablauf, Bausteine', "document.querySelectorAll('.plankarte:not(.neu)').length === 3 && !!document.querySelector('.diagramm svg line') && App.S.projekt.app.plan.bausteine.hausfarbe === '#c47f17'");
    await js("document.querySelector('[data-aktion=\"app-zustand\"][data-id=\"editor\"][data-z=\"fehler\"]').click()");
    await pruefe('Zustand im Plan ergänzt', "App.S.projekt.app.plan.bildschirme[1].zustaende.includes('fehler')");
    await js("document.querySelector('.planfuss [data-aktion=\"app-falten\"]').click()");
    await bisDa("App.S.projekt.seiten.length === 5", 4000);
    await warte(1300);
    await js("Entwurf.zoom(0.4)");
    await warte(300);
    await foto('17-app-baut');
    // Mitten im Bau zum Start und zurück: Bau läuft weiter
    await js("window.__pid = App.S.projekt.id; App.aktionen['zum-start']()");
    await warte(600);
    await js("App.aktionen['projekt-oeffnen']({ dataset: { id: window.__pid } })");
    await warte(500);
    await pruefe('Zurück im Projekt: Bau läuft noch sichtbar', "App.S.kranich.zustand === 'denkt' && !!document.querySelector('.hinweisband')");
    await bisDa("App.S.kranich.zustand === 'fertig'", 30000);
    await warte(800);
    await js("Entwurf.einpassen()");
    await foto('18-app-fertig');
    await pruefe('Alle 5 Boards gefaltet, mit Bausteinen und Links', "App.S.projekt.seiten.every((b) => b.html) && !!App.S.projekt.app.css && App.S.projekt.seiten[0].html.includes('data-ziel=\"editor\"') && App.S.projekt.seiten[0].html.includes('data-bausteine')");
    await pruefe('Selbstprüfung an jedem Board gemerkt', "App.S.projekt.seiten.every((b) => b.pruefung)");
    // Abspielen
    await js("App.aktionen['app-abspielen']()");
    await bisDa("!!document.querySelector('.abspielen iframe')?.contentDocument?.querySelector('[data-ziel]')");
    await warte(300);
    await foto('19-abspielen');
    await js("document.querySelector('.abspielen iframe').contentDocument.querySelector('[data-ziel=\"editor\"]').click()");
    await warte(500);
    await pruefe('Abspielen: Klick führt zum Editor', "/Editor/.test(document.querySelector('.abspielleiste').textContent)");
    await js("document.querySelector('[data-a=\"zurueck\"]').click()");
    await warte(300);
    await pruefe('Abspielen: Zurück', "/Start/.test(document.querySelector('.abspielleiste').textContent)");
    await js("document.querySelector('[data-a=\"zu\"]').click()");
    // Selbstprüfung-Ansicht
    await js("App.aktionen['app-pruefung']()");
    await bisDa("!!document.querySelector('.pruefleinwand')");
    await warte(600);
    await foto('20-selbstpruefung');
    await pruefe('Selbstprüfung-Ansicht offen', "!!document.querySelector('.pruefbuehne iframe') && /Board 1 von 5/.test(document.body.textContent)");
    await js("App.aktionen['app-zur-leinwand']()");
    // Übergabe
    await js("App.aktionen['app-uebergabe']()");
    await bisDa("!!document.querySelector('.baum')");
    await warte(300);
    await foto('21-uebergabe');
    await js("document.querySelector('[data-los]').click()");
    await bisDa("!document.querySelector('.baum')", 8000);
    const pk = path.join(app.getPath('documents'), 'Kranich', 'eule-paket');
    const ok = fs.existsSync(path.join(pk, 'plan.json')) && fs.readdirSync(path.join(pk, 'boards')).length === 5 && fs.existsSync(path.join(pk, 'bausteine.css'));
    console.log(ok ? 'OK  ' : 'FEHL', 'Paket mit 5 Boards, Bausteinen und Plan');
    if (ok) { const pl = JSON.parse(fs.readFileSync(path.join(pk, 'plan.json'), 'utf8')); console.log(pl.ablaeufe.length === 3 ? 'OK  ' : 'FEHL', 'Abläufe im Paket'); }
    await js("document.querySelector('[data-aktion=\"zum-start\"]').click()");
    await bisDa("!!document.querySelector('#start')");
    await js("document.querySelector('[data-aktion=\"projekt-oeffnen\"]').click()");
    await bisDa("App.S.ansicht === 'werkbank'");
    await warte(500);

    // Keine Verbindung
    process.env.KRANICH_SPIELHIRN = 'fehler';
    await js("document.getElementById('wunsch').value = 'Mach die Startseite schöner'; App.aktionen.senden()");
    await bisDa("App.S.kranich.zustand === 'fehler'");
    await warte(300);
    await pruefe('Fehler wird gezeigt', "!!document.querySelector('.hinweisband.fehler') && /Nochmal/.test(document.querySelector('.kranichleiste').textContent)");
    await foto('13-fehler');
    process.env.KRANICH_SPIELHIRN = '1';
    await js("App.aktionen.nochmal()");
    await bisDa("App.S.kranich.zustand === 'fertig'");
    await pruefe('Nochmal klappt danach', "App.S.kranich.zustand === 'fertig' && !document.querySelector('.hinweisband.fehler')");

    // Einstellungen
    await js("App.zeigeStart().then(() => document.querySelector('[data-aktion=\"einstellungen\"]').click())");
    await bisDa("!!document.querySelector('.dialog')");
    await warte(300);
    await foto('14-einstellungen');
  } catch (e) {
    console.log('ABBRUCH', e);
    fehler++;
  }
  console.log(fehler ? `Rauchtest: ${fehler} Fehler` : 'Rauchtest: alles gut');
  app.exit(fehler ? 1 : 0);
});
