'use strict';
// Die Leinwand im Modus "Bild": Ebenen, Werkzeuge, Regler, Verlauf und die
// Schritte, die Kranich plant.
(function () {
  const STANDARD_ANPASSUNG = { hell: 0, kontrast: 0, waerme: 0, saett: 0 };

  const z = {
    leinwand: null, flaeche: null, ctx: null, cb: {},
    breite: 0, hoehe: 0, ebenen: [], aktiv: null, anpassung: { ...STANDARD_ANPASSUNG },
    verlauf: [], stand: -1,
    werkzeug: 'auswahl', farbe: '#7c5cd6', pinsel: 24, textGroesse: 64,
    ansicht: { zoom: 1, ox: 0, oy: 0, auto: true },
    auswahl: null, zuschnitt: null, ziehen: null, laeuft: '',
  };

  let zaehler = 0;
  const neueId = () => `ebene-${Date.now().toString(36)}${(zaehler++).toString(36)}`;

  function leinwandAus(b, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(b)); c.height = Math.max(1, Math.round(h));
    return c;
  }
  function kopie(c) {
    const n = leinwandAus(c.width, c.height);
    n.getContext('2d').drawImage(c, 0, 0);
    return n;
  }

  // ---------- Regler (Pixelarbeit) ----------
  function wendeAn(daten, a) {
    if (!a.hell && !a.kontrast && !a.waerme && !a.saett) return;
    const d = daten.data;
    const hell = a.hell * 1.6;
    const k = (259 * (a.kontrast * 1.28 + 255)) / (255 * (259 - a.kontrast * 1.28));
    const w = a.waerme * 0.5;
    const s = 1 + a.saett / 100;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i] + hell + w, g = d[i + 1] + hell, b = d[i + 2] + hell - w;
      r = k * (r - 128) + 128; g = k * (g - 128) + 128; b = k * (b - 128) + 128;
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      d[i] = l + (r - l) * s; d[i + 1] = l + (g - l) * s; d[i + 2] = l + (b - l) * s;
    }
  }

  // ---------- Zustand und Verlauf ----------
  function schnappschuss() {
    return {
      breite: z.breite, hoehe: z.hoehe, anpassung: { ...z.anpassung }, aktiv: z.aktiv,
      ebenen: z.ebenen.map((e) => ({ id: e.id, name: e.name, sichtbar: e.sichtbar, x: e.x, y: e.y, canvas: kopie(e.canvas) })),
    };
  }
  function stelleHer(s) {
    z.breite = s.breite; z.hoehe = s.hoehe; z.anpassung = { ...s.anpassung }; z.aktiv = s.aktiv;
    z.ebenen = s.ebenen.map((e) => ({ ...e, canvas: kopie(e.canvas), geaendert: true }));
  }
  function merke(was) {
    z.verlauf = z.verlauf.slice(0, z.stand + 1);
    z.verlauf.push({ was, zustand: schnappschuss() });
    if (z.verlauf.length > 15) z.verlauf.shift();
    z.stand = z.verlauf.length - 1;
    z.cb.beiAenderung?.();
  }
  function springe(i) {
    if (i < 0 || i >= z.verlauf.length) return;
    z.stand = i;
    stelleHer(z.verlauf[i].zustand);
    z.auswahl = null; z.zuschnitt = null;
    z.cb.beiAenderung?.();
    zeichne();
  }

  function aktiveEbene() {
    return z.ebenen.find((e) => e.id === z.aktiv) || z.ebenen[z.ebenen.length - 1];
  }

  // Ebene auf Bildgröße bringen (Versatz einbacken).
  function backe(e) {
    if (e.x === 0 && e.y === 0 && e.canvas.width === z.breite && e.canvas.height === z.hoehe) return;
    const c = leinwandAus(z.breite, z.hoehe);
    c.getContext('2d').drawImage(e.canvas, e.x, e.y);
    e.canvas = c; e.x = 0; e.y = 0; e.geaendert = true;
  }

  // ---------- Darstellung ----------
  function ansichtBerechnen() {
    const L = z.leinwand;
    const bw = L.clientWidth, bh = L.clientHeight;
    if (z.ansicht.auto && z.breite) {
      z.ansicht.zoom = Math.min(1, (bw - 80) / z.breite, (bh - 190) / z.hoehe);
      z.ansicht.ox = (bw - z.breite * z.ansicht.zoom) / 2;
      z.ansicht.oy = Math.max(50, (bh - 120 - z.hoehe * z.ansicht.zoom) / 2 + 20);
    }
  }

  function zeichne() {
    const L = z.leinwand;
    if (!L || !z.flaeche) return;
    const dpr = window.devicePixelRatio || 1;
    const bw = L.clientWidth, bh = L.clientHeight;
    if (z.flaeche.width !== Math.round(bw * dpr) || z.flaeche.height !== Math.round(bh * dpr)) {
      z.flaeche.width = Math.round(bw * dpr); z.flaeche.height = Math.round(bh * dpr);
    }
    const c = z.ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, bw, bh);
    if (!z.breite) { L.querySelector('.zoomwert').textContent = '–'; return; }
    ansichtBerechnen();
    const { zoom, ox, oy } = z.ansicht;
    c.imageSmoothingQuality = 'high';
    for (const e of z.ebenen) if (e.sichtbar) c.drawImage(e.canvas, ox + e.x * zoom, oy + e.y * zoom, e.canvas.width * zoom, e.canvas.height * zoom);
    // Regler auf den sichtbaren Bildausschnitt anwenden
    const a = z.anpassung;
    if (a.hell || a.kontrast || a.waerme || a.saett) {
      const x = Math.max(0, Math.floor(ox * dpr)), y = Math.max(0, Math.floor(oy * dpr));
      const w = Math.min(z.flaeche.width - x, Math.ceil(z.breite * zoom * dpr)), h = Math.min(z.flaeche.height - y, Math.ceil(z.hoehe * zoom * dpr));
      if (w > 0 && h > 0) {
        c.setTransform(1, 0, 0, 1, 0, 0);
        const daten = c.getImageData(x, y, w, h);
        wendeAn(daten, a);
        c.putImageData(daten, x, y);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    // Bildrand
    c.strokeStyle = 'rgba(29,39,66,.25)'; c.lineWidth = 1; c.setLineDash([]);
    c.strokeRect(ox - 0.5, oy - 0.5, z.breite * zoom + 1, z.hoehe * zoom + 1);
    const rechteck = (r, farbe) => {
      c.save();
      c.strokeStyle = farbe; c.lineWidth = 1.5; c.setLineDash([6, 5]);
      c.lineDashOffset = -(Date.now() / 60) % 22;
      c.strokeRect(ox + r.x * zoom, oy + r.y * zoom, r.b * zoom, r.h * zoom);
      c.restore();
    };
    if (z.zuschnitt) {
      const r = z.zuschnitt;
      c.fillStyle = 'rgba(29,39,66,.45)';
      c.fillRect(ox, oy, z.breite * zoom, r.y * zoom);
      c.fillRect(ox, oy + (r.y + r.h) * zoom, z.breite * zoom, (z.hoehe - r.y - r.h) * zoom);
      c.fillRect(ox, oy + r.y * zoom, r.x * zoom, r.h * zoom);
      c.fillRect(ox + (r.x + r.b) * zoom, oy + r.y * zoom, (z.breite - r.x - r.b) * zoom, r.h * zoom);
      rechteck(r, '#fff');
    }
    if (z.auswahl) rechteck(z.auswahl, '#7c5cd6');
    L.querySelector('.zoomwert').textContent = `${Math.round(zoom * 100)} %`;
    const info = L.querySelector('.bildinfo');
    if (info) {
      info.innerHTML = z.auswahl
        ? `<span class="chip chip-zart">Auswahl · ${Math.round(z.auswahl.b)} × ${Math.round(z.auswahl.h)}</span>`
        : `<span class="chip chip-grau">${H.esc(z.name || 'Bild')} · ${z.breite} × ${z.hoehe}</span>`;
    }
  }

  let ameisenUhr = null;
  function ameisen() {
    clearInterval(ameisenUhr);
    if (z.auswahl || z.zuschnitt) ameisenUhr = setInterval(zeichne, 120);
  }

  // ---------- Eingabe ----------
  function bildpunkt(e) {
    const r = z.flaeche.getBoundingClientRect();
    return { x: (e.clientX - r.left - z.ansicht.ox) / z.ansicht.zoom, y: (e.clientY - r.top - z.ansicht.oy) / z.ansicht.zoom };
  }
  const klemme = (v, min, max) => Math.min(max, Math.max(min, v));
  const rechteckAus = (a, b) => {
    const x1 = klemme(Math.min(a.x, b.x), 0, z.breite), y1 = klemme(Math.min(a.y, b.y), 0, z.hoehe);
    const x2 = klemme(Math.max(a.x, b.x), 0, z.breite), y2 = klemme(Math.max(a.y, b.y), 0, z.hoehe);
    return { x: x1, y: y1, b: x2 - x1, h: y2 - y1 };
  };

  function runter(e) {
    if (!z.breite || z.laeuft) return;
    z.flaeche.setPointerCapture(e.pointerId);
    const p = bildpunkt(e);
    const eb = aktiveEbene();
    switch (z.werkzeug) {
      case 'verschieben': if (eb) z.ziehen = { art: 'schieben', start: p, x: eb.x, y: eb.y }; break;
      case 'zuschneiden': z.ziehen = { art: 'rahmen', start: p }; z.zuschnitt = { x: p.x, y: p.y, b: 0, h: 0 }; break;
      case 'auswahl': z.ziehen = { art: 'auswahl', start: p }; z.auswahl = null; break;
      case 'pinsel': case 'radierer':
        if (!eb) return;
        backe(eb);
        z.ziehen = { art: 'malen', letzter: p };
        male(eb, p, p);
        break;
      case 'text': textEingabe(e, p); break;
      case 'farbe': pipette(p); break;
      default: break;
    }
    zeichne();
  }
  function bewegt(e) {
    if (!z.ziehen) return;
    const p = bildpunkt(e);
    const eb = aktiveEbene();
    if (z.ziehen.art === 'schieben') { eb.x = Math.round(z.ziehen.x + p.x - z.ziehen.start.x); eb.y = Math.round(z.ziehen.y + p.y - z.ziehen.start.y); }
    if (z.ziehen.art === 'rahmen') z.zuschnitt = rechteckAus(z.ziehen.start, p);
    if (z.ziehen.art === 'auswahl') z.auswahl = rechteckAus(z.ziehen.start, p);
    if (z.ziehen.art === 'malen') { male(eb, z.ziehen.letzter, p); z.ziehen.letzter = p; }
    zeichne();
  }
  function hoch() {
    const art = z.ziehen?.art;
    z.ziehen = null;
    if (art === 'schieben') { aktiveEbene().geaendert = true; merke('Verschoben'); }
    if (art === 'malen') { aktiveEbene().geaendert = true; merke(z.werkzeug === 'pinsel' ? 'Gemalt' : 'Radiert'); }
    if (art === 'auswahl' && z.auswahl && (z.auswahl.b < 3 || z.auswahl.h < 3)) z.auswahl = null;
    if (art === 'rahmen' && z.zuschnitt && (z.zuschnitt.b < 3 || z.zuschnitt.h < 3)) z.zuschnitt = null;
    ameisen();
    z.cb.beiWerkzeug?.();
    zeichne();
  }

  function male(eb, a, b) {
    const c = eb.canvas.getContext('2d');
    c.save();
    c.globalCompositeOperation = z.werkzeug === 'radierer' ? 'destination-out' : 'source-over';
    c.strokeStyle = z.farbe; c.lineWidth = z.pinsel; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x + 0.01, b.y); c.stroke();
    c.restore();
  }

  function pipette(p) {
    const c = leinwandAus(1, 1).getContext('2d');
    for (const e of z.ebenen) if (e.sichtbar) c.drawImage(e.canvas, e.x - p.x, e.y - p.y);
    const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
    if (a) { z.farbe = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`; z.cb.beiWerkzeug?.(); }
  }

  function textEingabe(e, p) {
    z.leinwand.querySelector('.texteingabe')?.remove();
    const r = z.leinwand.getBoundingClientRect();
    const box = document.createElement('div');
    box.className = 'texteingabe paper';
    box.style.left = `${e.clientX - r.left}px`; box.style.top = `${e.clientY - r.top}px`;
    box.innerHTML = '<input class="feld" placeholder="Text eingeben" style="width:220px"><button type="button" class="btn btn-s btn-p">Setzen</button>';
    z.leinwand.appendChild(box);
    const feld = box.querySelector('input');
    const setzen = () => {
      const t = feld.value.trim();
      box.remove();
      if (t) { setzeText({ inhalt: t, x: p.x, y: p.y, groesse: z.textGroesse, farbe: z.farbe }); merke(`Text „${t.slice(0, 20)}“`); zeichne(); }
    };
    box.querySelector('button').onclick = setzen;
    feld.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') setzen(); if (ev.key === 'Escape') box.remove(); });
    setTimeout(() => feld.focus(), 0);
  }

  function setzeText({ inhalt, x, y, groesse, farbe }) {
    const c = leinwandAus(z.breite, z.hoehe);
    const k = c.getContext('2d');
    k.fillStyle = farbe; k.font = `800 ${groesse}px 'Bricolage Grotesque', sans-serif`; k.textBaseline = 'top';
    k.fillText(inhalt, x, y);
    const e = { id: neueId(), name: `Text „${inhalt.slice(0, 16)}“`, sichtbar: true, x: 0, y: 0, canvas: c, geaendert: true };
    z.ebenen.push(e); z.aktiv = e.id;
  }

  // ---------- Bearbeitungen ----------
  function zuschneiden(r) {
    const rx = Math.round(r.x), ry = Math.round(r.y), rb = Math.max(1, Math.round(r.b)), rh = Math.max(1, Math.round(r.h));
    for (const e of z.ebenen) {
      const c = leinwandAus(rb, rh);
      c.getContext('2d').drawImage(e.canvas, e.x - rx, e.y - ry);
      e.canvas = c; e.x = 0; e.y = 0; e.geaendert = true;
    }
    z.breite = rb; z.hoehe = rh; z.auswahl = null; z.zuschnitt = null; z.ansicht.auto = true;
  }

  function skaliere(b, h) {
    b = Math.round(b); h = Math.round(h);
    for (const e of z.ebenen) {
      backe(e);
      const c = leinwandAus(b, h);
      const k = c.getContext('2d'); k.imageSmoothingQuality = 'high';
      k.drawImage(e.canvas, 0, 0, b, h);
      e.canvas = c; e.geaendert = true;
    }
    z.breite = b; z.hoehe = h; z.auswahl = null; z.ansicht.auto = true;
  }

  function drehe(grad) {
    const quer = grad === 90 || grad === 270;
    const nb = quer ? z.hoehe : z.breite, nh = quer ? z.breite : z.hoehe;
    for (const e of z.ebenen) {
      backe(e);
      const c = leinwandAus(nb, nh);
      const k = c.getContext('2d');
      k.translate(nb / 2, nh / 2); k.rotate((grad * Math.PI) / 180);
      k.drawImage(e.canvas, -z.breite / 2, -z.hoehe / 2);
      e.canvas = c; e.geaendert = true;
    }
    z.breite = nb; z.hoehe = nh; z.auswahl = null; z.ansicht.auto = true;
  }

  function spiegle(richtung) {
    for (const e of z.ebenen) {
      backe(e);
      const c = leinwandAus(z.breite, z.hoehe);
      const k = c.getContext('2d');
      if (richtung === 'waagrecht') { k.translate(z.breite, 0); k.scale(-1, 1); } else { k.translate(0, z.hoehe); k.scale(1, -1); }
      k.drawImage(e.canvas, 0, 0);
      e.canvas = c; e.geaendert = true;
    }
  }

  function fuelleHintergrund(farbe) {
    const c = leinwandAus(z.breite, z.hoehe);
    const k = c.getContext('2d'); k.fillStyle = farbe; k.fillRect(0, 0, z.breite, z.hoehe);
    z.ebenen.unshift({ id: neueId(), name: 'Hintergrundfarbe', sichtbar: true, x: 0, y: 0, canvas: c, geaendert: true });
  }

  // Freistellen ohne KI: füllt vom Rand her alles weg, was der Randfarbe ähnelt.
  // Klappt gut bei ruhigem Hintergrund (Produktfotos, Screenshots).
  function zauberstab(canvas, toleranz = 42) {
    const b = canvas.width, h = canvas.height;
    const k = canvas.getContext('2d');
    const daten = k.getImageData(0, 0, b, h);
    const d = daten.data;
    const weg = new Uint8Array(b * h);
    const stapel = [];
    const rand = [];
    for (let x = 0; x < b; x++) rand.push(x, (h - 1) * b + x);
    for (let y = 0; y < h; y++) rand.push(y * b, y * b + b - 1);
    // Randfarbe: Mittel der Randpunkte
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (const i of rand) { if (d[i * 4 + 3] < 10) continue; sr += d[i * 4]; sg += d[i * 4 + 1]; sb += d[i * 4 + 2]; n++; }
    if (!n) return 0;
    const mr = sr / n, mg = sg / n, mb = sb / n;
    const nah = (i) => {
      const o = i * 4;
      if (d[o + 3] < 10) return true;
      const dr = d[o] - mr, dg = d[o + 1] - mg, db = d[o + 2] - mb;
      return Math.sqrt(dr * dr + dg * dg + db * db) < toleranz;
    };
    for (const i of rand) if (!weg[i] && nah(i)) { weg[i] = 1; stapel.push(i); }
    while (stapel.length) {
      const i = stapel.pop();
      const x = i % b, y = (i - x) / b;
      const nachbarn = [x > 0 ? i - 1 : -1, x < b - 1 ? i + 1 : -1, y > 0 ? i - b : -1, y < h - 1 ? i + b : -1];
      for (const j of nachbarn) if (j >= 0 && !weg[j] && nah(j)) { weg[j] = 1; stapel.push(j); }
    }
    let gezaehlt = 0;
    for (let i = 0; i < b * h; i++) {
      if (weg[i]) { d[i * 4 + 3] = 0; gezaehlt++; continue; }
      // weiche Kante: Punkte am Rand der Fläche halb durchsichtig
      const x = i % b;
      const amRand = (x > 0 && weg[i - 1]) || (x < b - 1 && weg[i + 1]) || (i >= b && weg[i - b]) || (i < b * (h - 1) && weg[i + b]);
      if (amRand) d[i * 4 + 3] = Math.round(d[i * 4 + 3] * 0.55);
    }
    k.putImageData(daten, 0, 0);
    return gezaehlt / (b * h);
  }

  function ladeFreisteller() {
    if (window.Freisteller) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/freisteller.js';
      s.onload = () => resolve(); s.onerror = () => reject(new Error('Freisteller fehlt'));
      document.head.appendChild(s);
    });
  }

  async function freistellenKi(canvas) {
    await ladeFreisteller();
    if (!window.Freisteller || window.KRANICH_OHNE_KI) throw new Error('KI-Freisteller nicht da');
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    const ergebnis = await window.Freisteller.entferne(blob);
    const img = await H.ladeBild(URL.createObjectURL(ergebnis));
    const c = leinwandAus(canvas.width, canvas.height);
    c.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return c;
  }

  async function freistellen() {
    const eb = aktiveEbene();
    if (!eb) return null;
    backe(eb);
    z.laeuft = 'Freistellen läuft'; z.cb.beiWerkzeug?.();
    let weg = 'ki';
    try {
      eb.canvas = await freistellenKi(eb.canvas);
    } catch {
      weg = 'zauberstab';
      zauberstab(eb.canvas);
    } finally {
      z.laeuft = ''; z.cb.beiWerkzeug?.();
    }
    eb.geaendert = true;
    return weg;
  }

  // Wendet einen von Kranich geplanten Schritt an.
  async function fuehreAus(s) {
    switch (s.art) {
      case 'zuschneiden': zuschneiden({ x: (s.x / 100) * z.breite, y: (s.y / 100) * z.hoehe, b: (s.b / 100) * z.breite, h: (s.h / 100) * z.hoehe }); break;
      case 'groesse': skaliere(s.breite, s.hoehe); break;
      case 'quadrat': {
        const m = Math.min(z.breite, z.hoehe);
        zuschneiden({ x: (z.breite - m) / 2, y: (z.hoehe - m) / 2, b: m, h: m });
        skaliere(s.groesse, s.groesse);
        break;
      }
      case 'anpassen': for (const k of Object.keys(STANDARD_ANPASSUNG)) if (s[k] != null) z.anpassung[k] = s[k]; break;
      case 'freistellen': await freistellen(); break;
      case 'hintergrund': fuelleHintergrund(s.farbe); break;
      case 'drehen': drehe(s.grad); break;
      case 'spiegeln': spiegle(s.richtung); break;
      case 'text': setzeText({ inhalt: s.inhalt, x: (s.x / 100) * z.breite, y: (s.y / 100) * z.hoehe, groesse: s.groesse, farbe: s.farbe }); break;
      default: return;
    }
    zeichne();
  }

  // Fertiges Bild in voller Größe (mit Reglern), optional auf neue Größe.
  function zusammenfuegen({ breite, hoehe, format = 'png', hintergrund } = {}) {
    const c = leinwandAus(z.breite, z.hoehe);
    const k = c.getContext('2d');
    if (hintergrund) { k.fillStyle = hintergrund; k.fillRect(0, 0, z.breite, z.hoehe); }
    for (const e of z.ebenen) if (e.sichtbar) k.drawImage(e.canvas, e.x, e.y);
    const daten = k.getImageData(0, 0, z.breite, z.hoehe);
    wendeAn(daten, z.anpassung);
    k.putImageData(daten, 0, 0);
    let ziel = c;
    if (breite && hoehe && (breite !== z.breite || hoehe !== z.hoehe)) {
      ziel = leinwandAus(breite, hoehe);
      const zk = ziel.getContext('2d'); zk.imageSmoothingQuality = 'high';
      if (format === 'jpg') { zk.fillStyle = '#ffffff'; zk.fillRect(0, 0, breite, hoehe); }
      zk.drawImage(c, 0, 0, breite, hoehe);
    } else if (format === 'jpg' && !hintergrund) {
      return zusammenfuegen({ breite, hoehe, format, hintergrund: '#ffffff' });
    }
    return ziel.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.92);
  }

  // Kleine Vorschau für Kranich (damit Claude das Bild sieht) und fürs Projekt.
  function vorschau(max = 1024) {
    if (!z.breite) return null;
    const f = Math.min(1, max / Math.max(z.breite, z.hoehe));
    return zusammenfuegen({ breite: Math.round(z.breite * f), hoehe: Math.round(z.hoehe * f) });
  }

  // ---------- Laden, Speichern, Montieren ----------
  async function oeffneBild(dataUrl, name) {
    const img = await H.ladeBild(dataUrl);
    const c = leinwandAus(img.naturalWidth, img.naturalHeight);
    c.getContext('2d').drawImage(img, 0, 0);
    if (!z.breite) {
      z.breite = c.width; z.hoehe = c.height; z.name = name;
      z.ebenen = [{ id: neueId(), name: 'Original', sichtbar: true, x: 0, y: 0, canvas: c, geaendert: true }];
      z.aktiv = z.ebenen[0].id; z.anpassung = { ...STANDARD_ANPASSUNG };
      z.verlauf = []; z.stand = -1; z.ansicht.auto = true;
      merke('Geöffnet');
    } else {
      const e = { id: neueId(), name: name || 'Bild', sichtbar: true, x: Math.round((z.breite - c.width) / 2), y: Math.round((z.hoehe - c.height) / 2), canvas: c, geaendert: true };
      z.ebenen.push(e); z.aktiv = e.id;
      merke('Bild eingefügt');
    }
    zeichne();
  }

  async function lade(projekt, leseDatei) {
    const b = projekt.bild || {};
    z.breite = b.breite || 0; z.hoehe = b.hoehe || 0; z.name = projekt.name;
    z.anpassung = { ...STANDARD_ANPASSUNG, ...(b.anpassung || {}) };
    z.ebenen = [];
    for (const e of b.ebenen || []) {
      const url = await leseDatei(e.datei);
      if (!url) continue;
      const img = await H.ladeBild(url);
      const c = leinwandAus(img.naturalWidth, img.naturalHeight);
      c.getContext('2d').drawImage(img, 0, 0);
      z.ebenen.push({ id: e.id, name: e.name, sichtbar: e.sichtbar !== false, x: e.x || 0, y: e.y || 0, canvas: c, geaendert: false });
    }
    if (!z.ebenen.length) { z.breite = 0; z.hoehe = 0; }
    z.aktiv = z.ebenen[z.ebenen.length - 1]?.id || null;
    z.verlauf = []; z.stand = -1; z.auswahl = null; z.zuschnitt = null; z.ansicht.auto = true;
    if (z.breite) { z.verlauf.push({ was: 'Geöffnet', zustand: schnappschuss() }); z.stand = 0; }
  }

  // Gibt die Projektdaten zurück und schreibt geänderte Ebenen.
  async function speichere(schreibeDatei) {
    for (const e of z.ebenen) {
      if (!e.geaendert) continue;
      await schreibeDatei(`${e.id}.png`, e.canvas.toDataURL('image/png'));
      e.geaendert = false;
    }
    return {
      breite: z.breite, hoehe: z.hoehe, anpassung: { ...z.anpassung },
      ebenen: z.ebenen.map((e) => ({ id: e.id, name: e.name, sichtbar: e.sichtbar, x: e.x, y: e.y, datei: `${e.id}.png` })),
    };
  }

  function montiere(leinwand, cb) {
    z.leinwand = leinwand;
    z.cb = cb || {};
    leinwand.classList.add('schach');
    leinwand.innerHTML = `<canvas id="bildflaeche" aria-label="Bild"></canvas><div class="bildinfo"></div>
      <div class="ansichtleiste"><span class="lbl" style="padding:0 6px">Ansicht</span>
        <button type="button" class="btn btn-s btn-q" aria-label="Verkleinern" data-aktion="bzoom-minus">−</button><b class="h zoomwert">100 %</b>
        <button type="button" class="btn btn-s btn-q" aria-label="Vergrößern" data-aktion="bzoom-plus">+</button>
        <button type="button" class="btn btn-s btn-q" data-aktion="bzoom-einpassen">Anpassen</button></div>
      ${eselsohr(54)}`;
    z.flaeche = leinwand.querySelector('#bildflaeche');
    z.ctx = z.flaeche.getContext('2d', { willReadFrequently: true });
    z.flaeche.addEventListener('pointerdown', runter);
    z.flaeche.addEventListener('pointermove', bewegt);
    z.flaeche.addEventListener('pointerup', hoch);
    z.flaeche.addEventListener('pointercancel', hoch);
    leinwand.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey) { zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); return; }
      z.ansicht.auto = false; z.ansicht.ox -= e.deltaX; z.ansicht.oy -= e.deltaY; zeichne();
    }, { passive: false });
    new ResizeObserver(() => zeichne()).observe(leinwand);
    zeichne();
    ameisen();
  }

  function zoom(f) {
    if (f === 'einpassen') { z.ansicht.auto = true; zeichne(); return; }
    const L = z.leinwand;
    const alt = z.ansicht.zoom;
    const neu = Math.min(8, Math.max(0.03, alt * f));
    const mx = L.clientWidth / 2, my = L.clientHeight / 2;
    z.ansicht.ox = mx - ((mx - z.ansicht.ox) * neu) / alt;
    z.ansicht.oy = my - ((my - z.ansicht.oy) * neu) / alt;
    z.ansicht.zoom = neu; z.ansicht.auto = false;
    zeichne();
  }

  window.Bild = {
    montiere, lade, speichere, oeffneBild, zeichne, zoom, springe, merke, fuehreAus, freistellen,
    zusammenfuegen, vorschau, zauberstab, wendeAn,
    get z() { return z; },
    hatBild: () => Boolean(z.breite),
    werkzeug(w) { z.werkzeug = w; if (w !== 'zuschneiden') z.zuschnitt = null; ameisen(); zeichne(); },
    setzeFarbe(f) { z.farbe = f; },
    setzePinsel(p) { z.pinsel = p; },
    setzeTextGroesse(p) { z.textGroesse = p; },
    regler(name, wert, fertig) {
      z.anpassung[name] = wert; zeichne();
      if (fertig) merke(`${{ hell: 'Helligkeit', kontrast: 'Kontrast', waerme: 'Wärme', saett: 'Sättigung' }[name]} ${wert > 0 ? '+' : ''}${wert}`);
    },
    reglerZuruecksetzen() { z.anpassung = { ...STANDARD_ANPASSUNG }; merke('Regler zurückgesetzt'); zeichne(); },
    zuschnittAnwenden() { if (!z.zuschnitt) return false; zuschneiden(z.zuschnitt); merke('Zugeschnitten'); zeichne(); ameisen(); return true; },
    zuschnittAbbrechen() { z.zuschnitt = null; ameisen(); zeichne(); },
    auswahlLoeschen() {
      const eb = aktiveEbene();
      if (!z.auswahl || !eb) return;
      backe(eb);
      eb.canvas.getContext('2d').clearRect(z.auswahl.x, z.auswahl.y, z.auswahl.b, z.auswahl.h);
      eb.geaendert = true; merke('Auswahl gelöscht'); zeichne();
    },
    auswahlInEbene() {
      const eb = aktiveEbene();
      if (!z.auswahl || !eb) return;
      backe(eb);
      const c = leinwandAus(z.breite, z.hoehe);
      const a = z.auswahl;
      c.getContext('2d').drawImage(eb.canvas, a.x, a.y, a.b, a.h, a.x, a.y, a.b, a.h);
      const neu = { id: neueId(), name: `${eb.name} (Auswahl)`, sichtbar: true, x: 0, y: 0, canvas: c, geaendert: true };
      z.ebenen.splice(z.ebenen.indexOf(eb) + 1, 0, neu); z.aktiv = neu.id;
      merke('Auswahl als Ebene'); zeichne();
    },
    auswahlAufheben() { z.auswahl = null; ameisen(); zeichne(); },
    auswahlProzent() {
      if (!z.auswahl) return null;
      const r = (v) => Math.round(v * 10) / 10;
      return { x: r((z.auswahl.x / z.breite) * 100), y: r((z.auswahl.y / z.hoehe) * 100), b: r((z.auswahl.b / z.breite) * 100), h: r((z.auswahl.h / z.hoehe) * 100) };
    },
    ebeneWaehlen(id) { z.aktiv = id; },
    ebeneSichtbar(id) { const e = z.ebenen.find((x) => x.id === id); if (e) { e.sichtbar = !e.sichtbar; merke(e.sichtbar ? 'Ebene gezeigt' : 'Ebene versteckt'); zeichne(); } },
    ebeneNeu() {
      if (!z.breite) return;
      const e = { id: neueId(), name: `Ebene ${z.ebenen.length + 1}`, sichtbar: true, x: 0, y: 0, canvas: leinwandAus(z.breite, z.hoehe), geaendert: true };
      z.ebenen.push(e); z.aktiv = e.id; merke('Neue Ebene'); zeichne();
    },
    ebeneLoeschen(id) {
      if (z.ebenen.length < 2) return;
      z.ebenen = z.ebenen.filter((e) => e.id !== id);
      if (z.aktiv === id) z.aktiv = z.ebenen[z.ebenen.length - 1].id;
      merke('Ebene gelöscht'); zeichne();
    },
    ebeneVorschau(e) {
      const c = leinwandAus(64, 48);
      const k = c.getContext('2d');
      const f = Math.min(64 / z.breite, 48 / z.hoehe);
      k.drawImage(e.canvas, (64 - z.breite * f) / 2 + e.x * f, (48 - z.hoehe * f) / 2 + e.y * f, e.canvas.width * f, e.canvas.height * f);
      return c.toDataURL();
    },
  };
})();
