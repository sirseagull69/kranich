'use strict';
// „Ganze App entwerfen“: Auftrag, Plan, Bauen, Selbstprüfung, Abspielen, Übergabe.
(function () {
  const K = window.kranich;
  const { esc } = H;
  const app = document.getElementById('app');
  const S = App.S;

  const ZUSTAND = { leer: 'leer', laedt: 'lädt', fehler: 'Fehler', fertig: 'fertig' };
  const GERAET = [['desktop', 'Desktop'], ['handy', 'Handy'], ['beides', 'Beides']];
  const BEISPIELE = ['Haushaltsbuch fürs Handy', 'Ticketsystem für kleine IT-Teams', 'Rezeptbuch mit Einkaufsliste'];
  const FORMAT_NAME = { fenster: 'Desktop', web: 'Web', app: 'Handy', tablet: 'Tablet' };

  S.appAuftrag = S.appAuftrag || { text: '', geraet: 'desktop', look: 'familie', zustaende: true, bild: null };

  // ---------- 1. Auftrag ----------
  function renderAuftrag() {
    const a = S.appAuftrag;
    return `<div class="appauftrag"><div class="appauftrag-links">
        <div style="display:flex;flex-direction:column"><h1 class="h" style="margin:0;font-size:34px;font-weight:800;letter-spacing:-.02em">Ganze App entwerfen</h1><span class="hand" style="font-size:21px">erzähl mir von deiner App, ich mach den Plan</span></div>
        <label for="appwunsch" class="lbl">Was für eine App?</label>
        <textarea id="appwunsch" class="feld" rows="5" style="font-size:17px;min-height:140px" placeholder="z. B. „Albatros – Tabellenprogramm der Familie, einfacher als Excel, origami hilft rechts“">${esc(a.text)}</textarea>
        <div class="reihe">${a.bild ? `<span class="anhang"><img src="${a.bild.dataUrl}" alt=""><button type="button" class="btn btn-s btn-q" data-aktion="app-bild-weg">Entfernen</button></span>` : `<button type="button" class="btn btn-s btn-q" data-aktion="app-bild">${sym('klammer', 15)} Skizze oder Bild anhängen</button>`}
          <button type="button" class="btn btn-s btn-q" disabled title="Sprechen kommt noch">${sym('mikro', 15)} Sprechen</button><div class="platz"></div><span class="hand" style="font-size:18px">je genauer, desto besser der Plan</span></div>
        <div class="appoptionen">
          <div class="einstellzeile"><span class="lbl">Gerät</span><div class="segment">${GERAET.map(([k, t]) => `<button type="button" aria-pressed="${a.geraet === k}" data-aktion="app-opt" data-feld="geraet" data-wert="${k}">${t}</button>`).join('')}</div></div>
          <div class="einstellzeile"><span class="lbl">Look</span><div class="segment"><button type="button" aria-pressed="${a.look === 'familie'}" data-aktion="app-opt" data-feld="look" data-wert="familie">Familie</button><button type="button" aria-pressed="${a.look === 'eigen'}" data-aktion="app-opt" data-feld="look" data-wert="eigen">Eigener</button></div></div>
          <div class="einstellzeile"><span class="lbl">Zustände mitentwerfen</span><label class="reihe" style="gap:8px"><input type="checkbox" id="appzustaende" ${a.zustaende ? 'checked' : ''}> An <span class="leise" style="font-size:13px">leer, lädt und Fehler je Bildschirm</span></label></div>
        </div>
        <span class="leise">Du kannst den Plan danach noch ändern, bevor etwas gefaltet wird.</span>
        <div class="reihe" style="justify-content:flex-end"><button type="button" class="btn btn-q" data-aktion="lasche" data-lasche="start">Abbrechen</button><button type="button" class="btn btn-p" data-aktion="app-plan">${figur('arbeitend', 18)} Plan machen</button></div>
      </div>
      <div class="appauftrag-rechts"><div class="paper cardw" style="padding:20px;display:flex;flex-direction:column;gap:12px">
        <b class="h" style="font-size:18px">So geht's</b>
        ${[['Plan', 'Kranich schlägt Bildschirme, Abläufe und Bausteine vor.'], ['Falten', 'Alle Boards entstehen auf einer Leinwand, mit Selbstprüfung.'], ['Übergeben', 'Ein Paket mit allem geht direkt ins App-Projekt.']].map(([t, x], i) => `<div class="reihe" style="align-items:flex-start;gap:12px"><span class="schrittnr h">${i + 1}</span><div style="display:flex;flex-direction:column"><b class="h">${t}</b><span class="leise" style="font-size:13.5px">${x}</span></div></div>`).join('')}
        <div class="fold"></div>
        <span class="lbl">Weitere Beispiele</span>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${BEISPIELE.map((b) => `<button type="button" class="btn btn-s" data-aktion="app-beispiel" data-text="${esc(b)}">${esc(b)}</button>`).join('')}</div>
        <span class="hand" style="font-size:20px;align-self:flex-end">eine ganze App? her damit</span>
      </div></div></div>`;
  }

  function merkeAuftrag() {
    const t = document.getElementById('appwunsch');
    if (t) S.appAuftrag.text = t.value;
    const z = document.getElementById('appzustaende');
    if (z) S.appAuftrag.zustaende = z.checked;
  }

  // ---------- 2. Plan ----------
  async function machePlan() {
    merkeAuftrag();
    const a = S.appAuftrag;
    if (!a.text.trim()) { document.getElementById('appwunsch')?.focus(); return; }
    const p = await K.projekte.anlegen({ art: 'entwurf', name: 'Neue App' });
    if (p?.fehler) { H.meldung(p.fehler.nachricht, { art: 'fehler' }); return; }
    p.seiten = [];
    p.app = { beschreibung: a.text.trim(), geraet: a.geraet, look: a.look, zustaende: a.zustaende };
    await K.projekte.speichern(p);
    S.projekt = p; S.modus = 'entwurf'; S.seiteId = null;
    S.kranich = { zustand: 'bereit', schritte: [], letzter: null, fehler: null, meldung: '' };
    await planeNeu(a.bild);
  }

  async function planeNeu(bild) {
    const p = S.projekt;
    S.ansicht = 'plan';
    S.planLaeuft = true; S.planFehler = null;
    renderPlan();
    const r = await K.app.plan({ beschreibung: p.app.beschreibung, geraet: p.app.geraet, zustaende: p.app.zustaende, look: p.app.look, bild: bild?.dataUrl });
    S.planLaeuft = false;
    if (S.projekt !== p) return;
    if (r?.fehler) { S.planFehler = r.fehler; renderPlan(); return; }
    p.app.plan = r.plan;
    p.name = r.plan.name;
    p.chat.push({ wer: 'kranich', modus: 'entwurf', zeit: new Date().toISOString(), text: r.plan.notiz || `Plan steht: ${r.plan.bildschirme.length} Bildschirme.` });
    await K.projekte.speichern(p);
    renderPlan();
  }

  function zaehle(plan) {
    const z = plan.bildschirme.reduce((n, b) => n + b.zustaende.length, 0);
    return { bildschirme: plan.bildschirme.length, boards: plan.bildschirme.length + z };
  }

  function ablaufDiagramm(plan) {
    const n = plan.bildschirme.length;
    const spalten = n <= 4 ? 2 : 3;
    const bw = 150, bh = 54, gx = 150, gy = 90;
    const pos = new Map(plan.bildschirme.map((b, i) => [b.id, { x: 20 + (i % spalten) * (bw + gx), y: 20 + Math.floor(i / spalten) * (bh + gy) }]));
    const breite = 40 + spalten * bw + (spalten - 1) * gx;
    const hoehe = 40 + Math.ceil(n / spalten) * bh + (Math.ceil(n / spalten) - 1) * gy;
    const schilder = [];
    const pfeile = plan.ablaeufe.map((a, i) => {
      const v = pos.get(a.von), z = pos.get(a.nach);
      if (!v || !z) return '';
      const gegen = plan.ablaeufe.some((b) => b.von === a.nach && b.nach === a.von);
      const lx = z.x - v.x, ly = z.y - v.y, ll = Math.hypot(lx, ly) || 1;
      const ver = gegen ? 7 : 0;
      const nx = (-ly / ll) * ver, ny = (lx / ll) * ver;
      const x1 = v.x + bw / 2 + nx, y1 = v.y + bh / 2 + ny, x2 = z.x + bw / 2 + nx, y2 = z.y + bh / 2 + ny;
      // an den Kastenrand kürzen
      const dx = x2 - x1, dy = y2 - y1;
      const t = (w, h) => Math.min(Math.abs(w / 2 / (dx || 1e-6)), Math.abs(h / 2 / (dy || 1e-6)));
      const s = t(bw + 8, bh + 8);
      const ax = x1 + dx * s, ay = y1 + dy * s, bx = x2 - dx * s, by = y2 - dy * s;
      // Schild auf 40 % der Strecke (bei Gegenpfeilen nicht in der Mitte übereinander)
      const t2 = gegen ? 0.38 : 0.5;
      const mx = ax + (bx - ax) * t2, my = ay + (by - ay) * t2;
      const text = a.knopf.length > 16 ? `${a.knopf.slice(0, 15)}…` : a.knopf;
      const sb = text.length * 6.2 + 12;
      schilder.push(`<g><rect x="${mx - sb / 2}" y="${my - 9}" width="${sb}" height="18" rx="9" fill="#fffdf8" stroke="#d6caf9"></rect><text x="${mx}" y="${my + 4}" text-anchor="middle" font-size="10.5" fill="#4a2f9a" font-family="Bricolage Grotesque, sans-serif" font-weight="700"><title>${esc(a.knopf)}</title>${esc(text)}</text></g>`);
      return `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#4a2f9a" stroke-width="1.6" marker-end="url(#pfeil)"></line>`;
    }).join('') + '';
    const kaesten = plan.bildschirme.map((b) => { const p = pos.get(b.id); return `<g><rect x="${p.x}" y="${p.y}" width="${bw}" height="${bh}" fill="#fff" stroke="#d9d0bc"></rect><text x="${p.x + 12}" y="${p.y + 23}" font-size="14" font-weight="800" fill="#1d2742" font-family="Bricolage Grotesque, sans-serif">${esc(b.name.length > 17 ? `${b.name.slice(0, 16)}…` : b.name)}</text><text x="${p.x + 12}" y="${p.y + 41}" font-size="11" fill="#5b6170" font-family="Source Serif 4, serif">${esc(FORMAT_NAME[b.format] || b.format)}${b.zustaende.length ? ` · ${b.zustaende.length} ${b.zustaende.length === 1 ? 'Zustand' : 'Zustände'}` : ''}</text></g>`; }).join('');
    return `<svg viewBox="0 0 ${breite} ${hoehe}" width="100%" style="max-height:100%" role="img" aria-label="Ablauf der App"><defs><marker id="pfeil" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#4a2f9a"></path></marker></defs>${pfeile}${kaesten}${schilder.join('')}</svg>`;
  }

  function renderPlan() {
    S.ansicht = 'plan';
    const p = S.projekt;
    const plan = p.app?.plan;
    let koerper;
    if (S.planLaeuft) {
      koerper = `<div class="mitte"><div class="paper zustandskarte"><div style="display:flex;align-items:center;gap:16px"><div class="faltblatt"></div><div><h2 class="h">Kranich macht den Plan …</h2><span class="leise">Bildschirme, Abläufe und Bausteine für „${esc(p.app.beschreibung.slice(0, 60))}“</span></div></div>${eselsohr(36, '#ffffff')}</div></div>`;
    } else if (S.planFehler || !plan) {
      koerper = `<div class="mitte"><div class="paper zustandskarte">${figur('ruhend', 60)}<h2 class="h">Der Plan hat nicht geklappt</h2><span class="leise">${esc(S.planFehler?.nachricht || 'Noch kein Plan.')}</span><div class="reihe"><button type="button" class="btn btn-p" data-aktion="app-plan-nochmal">Nochmal</button><button type="button" class="btn btn-q" data-aktion="app-auftrag-aendern">Auftrag ändern</button></div>${eselsohr(36, '#ffffff')}</div></div>`;
    } else {
      const z = zaehle(plan);
      const bs = plan.bausteine;
      const minuten = Math.max(2, Math.ceil(z.boards * 0.5));
      koerper = `<div class="planblatt einfach">
        <div class="plankopf2"><div><span class="hand">Plan steht – schau kurz drüber</span><h1 class="h">${z.bildschirme} Bildschirme für <mark>${esc(plan.name)}</mark></h1>
          <p class="leise">Kranich faltet jeden Bildschirm einzeln – und zusätzlich, wie er aussieht, wenn er leer ist, lädt oder ein Fehler kommt. Das sind die kleinen Schalter auf jeder Karte.</p></div>
          <div class="planknopf"><button type="button" class="btn btn-p btn-gross" data-aktion="app-falten">${figur('arbeitend', 20)} Alles falten</button><small class="leise">${z.boards} Boards · etwa ${minuten} Minuten</small></div></div>
        <div class="planliste raster">${plan.bildschirme.map((b, i) => `<div class="plankarte"><div class="pk-kopf"><span class="pk-nr">${i + 1}</span><b class="h">${esc(b.name)}</b><button type="button" class="btn btn-s btn-q rundknopf" data-aktion="app-bs-weg" data-id="${b.id}" title="Bildschirm entfernen" aria-label="Entfernen">${sym('schliessen', 14)}</button></div>
            <p>${esc(b.zweck)}</p>
            <div class="zustandschips">${Object.entries(ZUSTAND).map(([k, t]) => `<button type="button" class="chip ${b.zustaende.includes(k) ? 'chip-zart' : 'chip-aus'}" aria-pressed="${b.zustaende.includes(k)}" data-aktion="app-zustand" data-id="${b.id}" data-z="${k}" title="${b.zustaende.includes(k) ? 'Wird gefaltet – klicken zum Weglassen' : 'Klicken, damit Kranich das auch faltet'}">${b.zustaende.includes(k) ? sym('haken', 11, 3) : ''}${t}</button>`).join('')}</div></div>`).join('')}
          ${S.planNeu ? `<div class="plankarte"><input class="feld" id="bs-name" placeholder="Name, z. B. „Suche“"><select class="feld" id="bs-format">${Object.entries(FORMAT_NAME).map(([k, t]) => `<option value="${k}" ${k === (p.app.geraet === 'handy' ? 'app' : 'fenster') ? 'selected' : ''}>${t}</option>`).join('')}</select><input class="feld" id="bs-zweck" placeholder="Was tut man hier?"><div class="reihe"><button type="button" class="btn btn-s btn-p" data-aktion="app-bs-anlegen">Dazu</button><button type="button" class="btn btn-s btn-q" data-aktion="app-bs-abbrechen">Abbrechen</button></div></div>` : `<button type="button" class="plankarte neu" data-aktion="app-bs-neu">${sym('plus', 18)}<span>Bildschirm dazu</span></button>`}
        </div>
        <div class="planfarben"><span class="k-abschnitt">Farben</span>${[['Hausfarbe', bs.hausfarbe, 'hausfarbe'], ['Falten', bs.facette, 'facette'], ['Hell', bs.hell, 'hell']].map(([t, f, k]) => `<label class="farbpunkt" title="${t} ändern"><span style="background:${f}"></span>${t}<input type="color" value="${f}" data-farbe="${k}" aria-label="${t}"></label>`).join('')}
          <div class="platz"></div><details class="planmehr"><summary>Wie hängen die Bildschirme zusammen?</summary><div class="diagramm">${ablaufDiagramm(plan)}</div></details></div>
        <div class="planfuss"><b class="h">${z.boards} Boards</b><span class="leise">etwa ${minuten} Minuten, 4 gleichzeitig</span><div class="platz"></div><button type="button" class="btn btn-p" data-aktion="app-falten">${figur('arbeitend', 18)} Alles falten</button></div>
      </div>`;
    }
    app.innerHTML = `<section class="ansicht" id="plan">${App.kopfHtml(`<button type="button" class="btn btn-q" data-aktion="app-auftrag-aendern">${sym('zurueck', 16)} Auftrag ändern</button>`)}
      <div style="flex:1;min-height:0;position:relative;display:flex;padding:0 16px 16px">${koerper}</div></section>`;
    const t = app.querySelector('.titel span');
    if (t) t.textContent = '/ Plan';
    app.querySelectorAll('[data-farbe]').forEach((inp) => inp.addEventListener('change', () => { plan.bausteine[inp.dataset.farbe] = inp.value; App.speichernSpaeter(); renderPlan(); }));
  }

  function formatMass(id) {
    const f = S.formate.find((x) => x.id === id);
    return f ? `${f.breite} × ${f.hoehe}` : '';
  }

  // ---------- 3. Bauen ----------
  async function alleFalten() {
    const p = S.projekt;
    const plan = p.app.plan;
    if (!p.seiten.length) {
      const r = await K.app.boards(plan);
      if (r?.fehler) { H.meldung(r.fehler.nachricht, { art: 'fehler' }); return; }
      p.seiten = r.boards.map((b) => ({ id: b.id, name: b.name, format: b.format, breite: b.breite, hoehe: b.hoehe, x: b.x, y: b.y, bildschirm: b.bildschirm, zustand: b.zustand, html: '', verlauf: [], stand: -1 }));
      S.seiteId = p.seiten[0].id;
      await K.projekte.speichern(p);
    }
    S.ansicht = 'werkbank';
    App.renderWerkbank();
    return baue();
  }

  // Läuft gerade ein Bau? Bleibt am Leben, auch wenn man zum Start geht.
  let lauf = null;

  async function baue() {
    const p = S.projekt;
    const plan = p.app.plan;
    const nr = App.neuerAuftrag();
    const offen = p.seiten.filter((b) => !b.html);
    const jobs = [];
    if (!p.app.css) jobs.push({ board: { id: '__bausteine' }, format: { name: 'Bausteine', mass: 'Farben, Schrift, Knöpfe' }, zustand: 'wartet' });
    for (const b of offen) jobs.push({ board: b, format: { name: b.name, breite: b.breite, hoehe: b.hoehe }, zustand: 'wartet' });
    if (!jobs.length) { H.meldung('Alle Boards sind schon gefaltet.'); return; }

    // nur anfassen, was gerade zu sehen ist
    const hier = () => S.projekt === p && S.ansicht === 'werkbank';
    const status = (id, st) => { if (hier()) Entwurf.setzeStatus(id, st); };
    const sag = (e) => { if (S.projekt === p) App.chat(e); else p.chat.push({ zeit: new Date().toISOString(), modus: 'entwurf', ...e }); };
    const sichern = () => { if (S.projekt === p) App.geaendert({ vorschau: false }); else K.projekte.speichern(p); };
    const kranich = (zustand, extra) => {
      if (S.projekt === p) { App.setzeKranich(zustand, extra); if (hier()) { App.renderKopfKnoepfe(); App.renderSeitenleiste(); } }
    };
    let fertig = 0, repariert = 0, offenGesamt = 0;
    const boardJobs = jobs.filter((j) => j.board.id !== '__bausteine');
    let schnitt = 70000; const dauern = [];
    const meldung = () => {
      if (!p.app.css) return 'Erst die Bausteine (Farben, Schrift, Knöpfe), dann gehts los mit den Boards';
      const g = S.projekt === p && S.kranich.gesamt != null ? `${S.kranich.gesamt} % · ` : '';
      const rest = boardJobs.length - fertig;
      const min = Math.max(1, Math.round((rest * schnitt * 1.25) / 4 / 60000));
      return `${g}${fertig} von ${boardJobs.length} fertig · noch ca. ${min} Min.`;
    };
    const titel = `Ich baue „${plan.name}“: ${offen.length} Boards`;
    lauf = { p, nr, jobs, titel, meldung, laeuft: () => nr === App.auftragNr };

    sag({ wer: 'ich', text: `Falte alle Bildschirme von „${plan.name}“` });
    kranich('denkt', { anpassen: jobs, titel, meldung: meldung(), gesamt: 0 });
    for (const b of offen) status(b.id, 'wartet');
    if (hier()) Entwurf.einpassen();

    // Prozent schätzen: Schreiben nach Zeit (Schnitt der fertigen Boards), dann Prüfen/Reparieren
    const prozent = (j) => {
      if (j.zustand === 'fertig' || j.zustand === 'repariert') return 100;
      if (j.zustand !== 'laeuft' || !j.start) return 0;
      if (j.phase === 'repariert') return 94;
      if (j.phase === 'pruefen') return 88;
      const t = Date.now() - j.start;
      return Math.round(t < schnitt ? 3 + (t / schnitt) * 77 : Math.min(86, 80 + ((t - schnitt) / schnitt) * 6));
    };
    const tick = () => {
      if (nr !== App.auftragNr) return;
      let summe = 0;
      for (const j of boardJobs) {
        const pct = prozent(j); summe += pct;
        if (j.zustand === 'laeuft') {
          j.prozent = pct;
          if (hier()) {
            Entwurf.setzeProzent(j.board.id, pct);
            const c = document.querySelector(`.fortschritt [data-job="${CSS.escape(j.board.id)}"]`);
            if (c) c.textContent = `${pct} %`;
          }
        }
      }
      const gesamt = Math.round(summe / boardJobs.length);
      if (S.projekt === p) {
        S.kranich.gesamt = gesamt;
        S.kranich.meldung = meldung();
        const m = document.querySelector('.hinweisband .bandmeldung'); if (m) m.textContent = S.kranich.meldung;
        const g = document.querySelector('.hinweisband .gesamtbalken i'); if (g) g.style.width = `${gesamt}%`;
        const pz = document.querySelector('.hinweisband .bandprozent'); if (pz) pz.textContent = `${Math.round(gesamt)} %`;
      }
    };
    const uhr = setInterval(tick, 1000);
    const ende = () => { clearInterval(uhr); if (lauf?.nr === nr) lauf = null; if (S.projekt === p) S.kranich.gesamt = null; };

    // Bausteine zuerst
    if (!p.app.css) {
      const j = jobs[0];
      j.zustand = 'laeuft'; if (hier()) App.renderVerlauf();
      const r = await K.app.bausteine({ plan });
      if (nr !== App.auftragNr) return ende();
      if (r?.fehler) {
        j.zustand = 'fehler';
        for (const b of offen) status(b.id, null);
        ende();
        sag({ wer: 'kranich', fehler: true, titel: 'Die Bausteine haben nicht geklappt', text: `${r.fehler.nachricht} Drück „Weiter falten“, wenn du es nochmal versuchen willst.` });
        kranich('fehler', { anpassen: null, titel: null, fehler: r.fehler });
        return;
      }
      p.app.css = r.css; p.app.bausteineHtml = r.html;
      j.zustand = 'fertig'; j.notiz = r.notiz || 'steht';
      sichern();
      if (S.projekt === p) S.kranich.meldung = meldung();
      if (hier()) { App.renderVerlauf(); App.renderMitte(); }
    }

    // Boards, vier gleichzeitig (bei Problemen zwei)
    let bremse = false;
    const eins = async (j) => {
      const b = j.board;
      j.zustand = 'laeuft'; j.start = Date.now(); j.phase = 'schreiben'; j.prozent = 3; status(b.id, 'laeuft'); if (hier()) App.renderVerlauf();
      // Bei Fehlern selbst nochmal probieren – mit Pause, bei „zu viel auf einmal“ länger
      let r = null;
      for (let versuch = 0; versuch < 3; versuch++) {
        if (versuch) {
          const limit = /limit|429|overload|zu viele|rate|ausgelastet|zeit/i.test(r?.fehler?.nachricht || '');
          j.notiz = `Versuch ${versuch + 1} von 3 …`; j.phase = 'wartet'; if (hier()) App.renderVerlauf();
          await new Promise((ok) => setTimeout(ok, (limit ? 45000 : 12000) * versuch));
          if (nr !== App.auftragNr) return;
        }
        r = await K.app.board({ plan, board: { id: b.id, bildschirm: b.bildschirm, zustand: b.zustand, name: b.name, breite: b.breite, hoehe: b.hoehe }, css: p.app.css });
        if (nr !== App.auftragNr) return;
        if (!r?.fehler) break;
        bremse = true;
      }
      if (r?.fehler) { j.zustand = 'fehler'; j.notiz = r.fehler.nachricht; status(b.id, 'fehler'); if (hier()) App.renderVerlauf(); return; }
      dauern.push(Date.now() - j.start); schnitt = dauern.reduce((a, x) => a + x, 0) / dauern.length;
      const pr = await App.pruefeUndRepariere(b, r.html, nr, { status: hier(), phase: (ph) => { j.phase = ph; } });
      if (nr !== App.auftragNr) return;
      b.html = pr.html;
      b.verlauf = [{ html: pr.html, was: 'Aus dem Plan gefaltet', zeit: new Date().toISOString() }];
      b.stand = 0;
      if (pr.repariert) repariert += pr.gefunden.length - pr.offen.length;
      offenGesamt += pr.repariert ? pr.offen.length : pr.gefunden.length;
      j.zustand = pr.gefunden.length && pr.repariert ? 'repariert' : 'fertig';
      j.notiz = App.pruefBericht(pr);
      fertig++;
      if (S.projekt === p) S.kranich.meldung = meldung();
      if (hier()) {
        Entwurf.zeigeAlle(p.seiten, App.seite().id);
        for (const x of boardJobs) if (x.zustand === 'wartet' || x.zustand === 'laeuft') Entwurf.setzeStatus(x.board.id, x.zustand);
        Entwurf.setzeStatus(b.id, 'fertig');
        App.renderVerlauf(); App.renderSeitenleiste(); App.renderMitte();
      }
      sichern();
    };
    const warteschlange = [...boardJobs];
    // Sobald etwas schiefgeht, arbeiten nur noch zwei gleichzeitig (Claude nicht überlasten)
    const arbeiter = async (k) => { while (warteschlange.length && nr === App.auftragNr) { if (bremse && k >= 2) { await new Promise((ok) => setTimeout(ok, 3000)); if (bremse) return; } await eins(warteschlange.shift()); } };
    await Promise.all([arbeiter(0), arbeiter(1), arbeiter(2), arbeiter(3)]);
    ende();
    if (nr !== App.auftragNr) return;
    const schief = boardJobs.filter((j) => j.zustand === 'fehler');
    sag({
      wer: 'kranich', fehler: schief.length === boardJobs.length, titel: 'Das Falten hat nicht geklappt',
      text: schief.length
        ? `${fertig} von ${boardJobs.length} Boards sind fertig. Nicht geklappt: ${schief.map((j) => j.board.name).join(', ')}. „Weiter falten“ versucht die übrigen nochmal.`
        : `Fertig: „${plan.name}“ hat ${fertig} Boards. Klick auf „Abspielen“, um dich durchzuklicken.`,
      chips: [repariert || offenGesamt ? `Selbstprüfung: ${[repariert ? `${repariert} repariert` : '', offenGesamt ? `${offenGesamt} offen` : ''].filter(Boolean).join(', ')}` : 'Selbstprüfung ohne Befund'],
    });
    kranich(schief.length === boardJobs.length ? 'fehler' : 'fertig', { anpassen: null, titel: null, fehler: schief.length === boardJobs.length ? { nachricht: schief[0].notiz } : null });
    if (S.projekt === p) App.geaendert(); else sichern();
    if (S.projekt !== p) H.meldung(`„${plan.name}“ ist fertig gefaltet.`);
  }

  // Beim Öffnen: läuft für dieses Projekt noch ein Bau? Dann denselben Stand weiterzeigen.
  function laufFuer(id) {
    if (!lauf || lauf.p.id !== id || !lauf.laeuft()) return null;
    return lauf;
  }
  function zeigeLauf() {
    if (!lauf || S.projekt !== lauf.p) return;
    for (const j of lauf.jobs) if (j.board.id !== '__bausteine' && (j.zustand === 'wartet' || j.zustand === 'laeuft')) Entwurf.setzeStatus(j.board.id, j.zustand);
  }

  function kopfKnoepfe(kannZurueck) {
    const p = S.projekt;
    const fehlt = p.seiten.filter((b) => !b.html).length;
    const fertigBoards = p.seiten.filter((b) => b.html).length;
    return `<button type="button" class="btn btn-q rundknopf" data-aktion="rueckgaengig" ${kannZurueck ? '' : 'disabled'} title="Rückgängig (Strg+Z)" aria-label="Rückgängig">${sym('zurueck', 17)}</button>
      ${App.mehrMenue([['app-plan-zeigen', 'liste', 'Plan ansehen']])}
      ${fehlt && S.kranich.zustand !== 'denkt' ? `<button type="button" class="btn" data-aktion="app-weiter">${figur('arbeitend', 16)} Weiter falten (${fehlt})</button>` : ''}
      <button type="button" class="btn" data-aktion="app-abspielen" ${fertigBoards ? '' : 'disabled'}>${sym('senden', 16)} Abspielen</button>
      <button type="button" class="btn btn-p" data-aktion="app-uebergabe" ${fertigBoards ? '' : 'disabled'}>${sym('export', 16)} Übergeben</button>`;
  }

  // ---------- 4. Selbstprüfung ----------
  function boardFormat(b) {
    return { id: b.format, breite: b.breite, hoehe: b.hoehe, druck: Boolean((S.formate.find((f) => f.id === b.format) || {}).druck) };
  }

  async function zeigePruefung(id) {
    const p = S.projekt;
    const b = p.seiten.find((x) => x.id === id) || App.seite();
    if (!b?.html) return;
    S.ansicht = 'pruefung'; S.pruefBoard = b.id;
    if (!b.pruefung) {
      renderPruefung(true);
      const r = await K.app.pruefen({ html: b.html, format: boardFormat(b) });
      b.pruefung = { gefunden: r?.funde || [], offen: r?.funde || [], zeit: new Date().toISOString() };
      App.speichernSpaeter();
    }
    renderPruefung();
  }

  const gleich = (a, b) => a.art === b.art && (a.k ? a.k === b.k : a.name === b.name);

  function renderPruefung(laeuft = false) {
    const p = S.projekt;
    const fertige = p.seiten.filter((x) => x.html);
    const b = p.seiten.find((x) => x.id === S.pruefBoard);
    const i = fertige.indexOf(b);
    const pr = b.pruefung || { gefunden: [], offen: [] };
    const liste = [...pr.gefunden, ...pr.offen.filter((o) => !pr.gefunden.some((g) => gleich(g, o)))];
    const offenAnz = pr.offen.length;
    const rechtsInhalt = laeuft
      ? `<div class="reihe" style="gap:10px"><span class="punkte"><i></i><i></i><i></i></span><span class="leise">Kranich misst nach …</span></div>`
      : liste.length
        ? `<div class="pruefliste">${liste.map((f, n) => { const off = pr.offen.some((o) => gleich(o, f)); return `<div class="pruefpunkt ${off ? 'offen' : 'ok'}"><span class="nr">${n + 1}</span><div style="flex:1;display:flex;flex-direction:column;gap:4px"><div class="reihe"><b class="h" style="flex:1">${esc(f.text.split(':')[0])}</b><span class="chip ${off ? 'chip-gelb' : 'chip-gruen'}">${off ? 'Offen' : 'Repariert'}</span></div><span class="leise" style="font-size:13px">${esc(f.name)}</span>${off ? `<div class="reihe"><button type="button" class="btn btn-s" data-aktion="app-reparieren" data-n="${n}">Reparieren</button></div>` : ''}</div></div>`; }).join('')}</div>`
        : `<div class="leer-verlauf"><span class="figurrund">${figur('fertig', 56)}</span><b class="h">Alles sauber</b><span>Kranich hat nichts gefunden.</span></div>`;
    app.innerHTML = `<section class="ansicht">${App.kopfHtml(`<button type="button" class="btn btn-q" data-aktion="app-zur-leinwand">${sym('zurueck', 16)} Zur Leinwand</button>${p.app?.plan ? '<button type="button" class="btn" data-aktion="app-abspielen">Abspielen</button><button type="button" class="btn btn-p" data-aktion="app-uebergabe">Übergeben</button>' : ''}`)}
      <div class="werkbank">
        <main class="leinwand paper pruefleinwand" aria-label="Board mit Markierungen"><div class="pruefbuehne"><iframe sandbox="allow-same-origin" title="${esc(b.name)}" style="width:${b.breite}px;height:${b.hoehe}px"></iframe><div class="pruefmarken"></div></div>
          <div class="ansichtleiste"><span class="lbl" style="padding:0 6px">${esc(b.name)} · ${b.breite} × ${b.hoehe}</span><button type="button" class="btn btn-s btn-q" data-aktion="app-pruef-vor" data-r="-1" ${i <= 0 ? 'disabled' : ''}>Vorheriges Board</button><button type="button" class="btn btn-s btn-q" data-aktion="app-pruef-vor" data-r="1" ${i >= fertige.length - 1 ? 'disabled' : ''}>Nächstes Board</button><span class="leise" style="padding:0 8px;font-size:13px">Board ${i + 1} von ${fertige.length}</span></div>${eselsohr(54)}</main>
        <aside class="kranichleiste" aria-label="Selbstprüfung"><div class="leistenlaschen"><button type="button" role="tab" aria-selected="true">Selbstprüfung</button></div>
          <div class="paper leistenblatt"><div class="figurkopf">${figur(laeuft ? 'arbeitend' : offenAnz ? 'ruhend' : 'fertig', 64)}<div class="txt"><b class="h" style="font-size:17px">${laeuft ? 'Prüfe …' : `${liste.length} ${liste.length === 1 ? 'Stelle' : 'Stellen'} gefunden`}</b><span class="leise" style="font-size:13px">${laeuft ? '' : `${liste.length - offenAnz} repariert, ${offenAnz} offen`}</span><span class="hand" style="font-size:18px">hab nochmal genau hingeschaut</span></div></div><div class="fold"></div>
            <div class="verlauf">${rechtsInhalt}</div>
            <div class="paper" style="padding:10px 12px;background:#fff;font-size:13px;display:flex;flex-direction:column;gap:3px"><span class="lbl" style="font-size:10.5px">Was Kranich prüft</span>${['Nichts ragt aus dem Bild', 'Text passt in sein Feld', 'Gut lesbar (Kontrast ab 4,5 : 1)', 'Schrift nicht zu klein', 'Knöpfe mindestens 44 px (Handy)'].map((t) => `<span class="reihe" style="gap:6px">${sym('haken', 12)}${t}</span>`).join('')}</div>
            <div class="reihe"><button type="button" class="btn" data-aktion="app-nochmal-pruefen" ${laeuft ? 'disabled' : ''}>Nochmal prüfen</button><div class="platz"></div><button type="button" class="btn btn-p" data-aktion="app-alle-reparieren" ${offenAnz && !laeuft ? '' : 'disabled'}>Alle reparieren</button></div></div></aside>
      </div></section>`;
    const buehne = app.querySelector('.pruefbuehne');
    const L = app.querySelector('.pruefleinwand');
    const f = buehne.querySelector('iframe');
    f.srcdoc = Entwurf.vorbereiten(b.html);
    const lege = () => {
      const z = Math.min(1, (L.clientWidth - 60) / b.breite, (L.clientHeight - 110) / b.hoehe);
      buehne.style.transform = `translate(${(L.clientWidth - b.breite * z) / 2}px, 30px) scale(${z})`;
      buehne.style.setProperty('--gegen', String(1 / z));
    };
    new ResizeObserver(lege).observe(L);
    lege();
    buehne.querySelector('.pruefmarken').innerHTML = liste.map((m, n) => {
      if (!m.ort || !pr.offen.some((o) => gleich(o, m))) return '';
      return `<span class="pruefmarke" style="left:${m.ort.x}px;top:${m.ort.y}px;width:${Math.max(8, m.ort.b)}px;height:${Math.max(8, m.ort.h)}px"><i>${n + 1}</i></span>`;
    }).join('');
  }

  async function repariere(probleme) {
    const p = S.projekt;
    const b = p.seiten.find((x) => x.id === S.pruefBoard);
    renderPruefung(true);
    const r = await K.app.reparieren({ html: b.html, probleme, breite: b.breite, hoehe: b.hoehe });
    if (r?.fehler) { H.meldung(r.fehler.nachricht, { art: 'fehler' }); renderPruefung(); return; }
    b.verlauf = (b.verlauf || []).slice(0, (b.stand ?? -1) + 1);
    b.verlauf.push({ html: r.html, was: 'Selbstprüfung repariert', zeit: new Date().toISOString() });
    b.stand = b.verlauf.length - 1;
    b.html = r.html;
    const nach = await K.app.pruefen({ html: b.html, format: boardFormat(b) });
    b.pruefung = { gefunden: b.pruefung?.gefunden || probleme, offen: nach?.funde || [], zeit: new Date().toISOString() };
    App.geaendert();
    renderPruefung();
  }

  // ---------- 5. Vorschau (durchklicken) ----------
  const ART_TEXT = { raus: 'ragt über den Rand', ueberlauf: 'Text passt nicht rein', klein: 'Schrift zu klein', kontrast: 'schwer lesbar', ziel: 'zu klein zum Antippen' };
  function abspielen(startId) {
    const p = S.projekt;
    const boards = p.seiten.filter((b) => b.html);
    if (!boards.length) { H.meldung('Noch kein Board mit Inhalt.'); return; }
    const bildschirme = boards.filter((b) => !b.zustand);
    const liste = bildschirme.length ? bildschirme : boards;
    let aktuell = boards.find((b) => b.id === startId) || liste[0];
    const start = aktuell;
    const zurueck = [];
    let flaechen = true;
    let passend = true;
    const el = document.createElement('div');
    el.className = 'abspielen neu';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Vorschau');
    document.body.appendChild(el);
    const zielVon = (z) => boards.find((b) => b.id === z) || boards.find((b) => b.bildschirm === z && !b.zustand) || boards.find((b) => b.name === z);
    const gehe = (b, merken = true) => { if (!b || b === aktuell) return; if (merken) zurueck.push(aktuell); aktuell = b; zeige(); };
    const zeige = () => {
      const nr = liste.indexOf(aktuell);
      const plan = (p.app?.plan?.bildschirme || []).find((x) => x.id === (aktuell.bildschirm || aktuell.id));
      const doc = new DOMParser().parseFromString(aktuell.html, 'text/html');
      const ziele = [...doc.querySelectorAll('[data-ziel]')].map((x) => ({ text: (x.textContent || x.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) || x.localName, ziel: x.dataset.ziel }));
      const offen = aktuell.pruefung?.offen || [];
      el.innerHTML = `<div class="abspielleiste"><b class="h">${esc(p.name)}</b><span class="leise">/</span><b class="h">${esc(aktuell.name)}</b><span class="chip chip-gruen">Vorschau</span><div class="platz"></div>
          <button type="button" class="btn btn-s" data-a="zurueck" ${zurueck.length ? '' : 'disabled'}>${sym('zurueck', 14)} Zurück</button><button type="button" class="btn btn-s" data-a="neu">Von vorn</button><button type="button" class="btn btn-s" data-a="gestalten">Weiter gestalten</button><button type="button" class="btn btn-s btn-p" data-a="weitergeben">${sym('export', 14)} Weitergeben</button><button type="button" class="btn btn-s btn-q" data-a="zu" aria-label="Schließen">${sym('schliessen', 14)}</button></div>
        <aside class="vs-links"><span class="vs-titel">Bildschirme</span>
          ${liste.map((b, i) => `<button type="button" class="vs-bs" data-geh="${b.id}" aria-current="${b === aktuell || aktuell.bildschirm === b.id}"><i>${i + 1}</i><span>${esc(b.name)}</span></button>`).join('')}
          ${boards.filter((b) => b.zustand && (b.bildschirm === (aktuell.bildschirm || aktuell.id))).length ? `<span class="vs-titel">Zustände</span>${boards.filter((b) => b.zustand && b.bildschirm === (aktuell.bildschirm || aktuell.id)).map((b) => `<button type="button" class="vs-bs" data-geh="${b.id}" aria-current="${b === aktuell}"><i>·</i><span>${esc(b.name.split(' · ')[1] || b.zustand)}</span></button>`).join('')}` : ''}
          ${zurueck.length ? `<span class="vs-titel">Dein Weg</span><span class="leise" style="font-size:13px">${[...zurueck, aktuell].map((b) => esc(b.name)).join(' → ')}</span>` : ''}</aside>
        <div class="vs-mitte"><div class="vs-werkzeug"><button type="button" data-a="flaechen" aria-pressed="${flaechen}" title="K">Klickflächen zeigen</button><button type="button" data-a="passend" aria-pressed="${passend}">${passend ? 'Eingepasst' : '100 %'}</button>
            <button type="button" data-a="vorher" ${nr > 0 ? '' : 'disabled'} title="←">‹</button><b class="h" style="font-size:13px">${nr >= 0 ? `${nr + 1} von ${liste.length}` : 'Zustand'}</b><button type="button" data-a="nachher" ${nr >= 0 && nr < liste.length - 1 ? '' : 'disabled'} title="→">›</button></div>
          <div class="abspielbuehne"><iframe sandbox="allow-same-origin" title="${esc(aktuell.name)}" style="width:${aktuell.breite}px;height:${aktuell.hoehe}px;transform-origin:0 0;border:0;display:block"></iframe></div>
          <span class="leise" style="font-size:12.5px">Gestrichelt = klickbar · ← → blättern · K Klickflächen · Esc schließt</span></div>
        <aside class="vs-rechts"><b class="h" style="font-size:19px">${esc(aktuell.name)}</b>${plan?.zweck ? `<span class="leise" style="font-size:13.5px">${esc(plan.zweck)}</span>` : ''}
          <div class="reihe" style="flex-wrap:wrap;gap:6px;margin:4px 0"><span class="chip ${offen.length ? 'chip-gelb' : 'chip-gruen'}">${offen.length ? `${offen.length} offen` : 'Geprüft'}</span><span class="chip chip-rand">${ziele.length} Klickflächen</span></div>
          <span class="vs-titel">Wohin führt was?</span>
          ${ziele.length ? ziele.map((z, i) => { const zb = zielVon(z.ziel); return `<button type="button" class="vs-ziel" ${zb ? `data-geh="${zb.id}"` : 'disabled'}><b>${i + 1}</b><span>${esc(z.text)}</span><em>→ ${esc(zb?.name || 'fehlt noch')}</em></button>`; }).join('') : '<span class="leise" style="font-size:13px">Auf diesem Bildschirm führt nichts weiter.</span>'}
          ${offen.length ? `<span class="vs-titel">Kranich fällt auf</span>${offen.slice(0, 3).map((f) => `<div class="vs-hinweis"><b>${esc(f.name || 'Element')}</b>${esc(ART_TEXT[f.art] || f.art)}${f.wert ? ` (${esc(f.wert)})` : ''}</div>`).join('')}` : ''}</aside>`;
      const buehne = el.querySelector('.abspielbuehne');
      const f = buehne.querySelector('iframe');
      const platzB = el.querySelector('.vs-mitte').clientWidth - 20; const platzH = window.innerHeight - 170;
      const z = passend ? Math.min(1, platzB / aktuell.breite, platzH / aktuell.hoehe) : 1;
      f.style.transform = `scale(${z})`;
      buehne.style.width = `${aktuell.breite * z}px`; buehne.style.height = `${aktuell.hoehe * z}px`;
      if (!passend) buehne.style.overflow = 'auto';
      const umriss = flaechen ? '[data-ziel]{outline:2px dashed rgba(124,92,214,.8)!important;outline-offset:3px;cursor:pointer!important}' : '[data-ziel]{cursor:pointer!important}';
      f.srcdoc = Entwurf.vorbereiten(aktuell.html).replace(/<head[^>]*>/i, (m) => `${m}<style data-kranich-intern>${umriss}</style>`);
      f.addEventListener('load', () => {
        f.contentDocument.addEventListener('click', (e) => {
          e.preventDefault();
          const t = e.target.closest?.('[data-ziel]'); if (!t) return;
          const ziel = zielVon(t.dataset.ziel);
          if (!ziel) { H.meldung(`„${t.dataset.ziel}“ ist noch nicht gefaltet.`, { art: 'fehler' }); return; }
          gehe(ziel);
        }, true);
      });
    };
    const zu = () => { el.remove(); document.removeEventListener('keydown', taste); };
    el.addEventListener('click', (e) => {
      const g = e.target.closest('[data-geh]'); if (g) { gehe(boards.find((b) => b.id === g.dataset.geh)); return; }
      const a = e.target.closest('[data-a]')?.dataset.a;
      const nr = liste.indexOf(aktuell);
      if (a === 'zu') zu();
      if (a === 'neu') { zurueck.length = 0; aktuell = start; zeige(); }
      if (a === 'zurueck' && zurueck.length) { aktuell = zurueck.pop(); zeige(); }
      if (a === 'flaechen') { flaechen = !flaechen; zeige(); }
      if (a === 'passend') { passend = !passend; zeige(); }
      if (a === 'vorher' && nr > 0) gehe(liste[nr - 1]);
      if (a === 'nachher' && nr < liste.length - 1) gehe(liste[nr + 1]);
      if (a === 'gestalten') { zu(); App.waehleBoard(aktuell.id); Entwurf.zeigeBoard?.(aktuell.id); }
      if (a === 'weitergeben') { zu(); uebergabe(); }
    });
    const taste = (e) => {
      if (e.key === 'Escape') zu();
      if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
      const nr = liste.indexOf(aktuell);
      if (e.key === 'ArrowLeft' && nr > 0) gehe(liste[nr - 1]);
      if (e.key === 'ArrowRight' && nr >= 0 && nr < liste.length - 1) gehe(liste[nr + 1]);
      if (e.key.toLowerCase() === 'k') { flaechen = !flaechen; zeige(); }
    };
    document.addEventListener('keydown', taste);
    zeige();
    return el;
  }

  // ---------- 6. Weitergeben ----------
  async function uebergabe() {
    const p = S.projekt;
    const alle = p.seiten.filter((b) => b.html);
    if (!alle.length) { H.meldung('Noch kein Board mit Inhalt.'); return; }
    const e = await K.einstellungen.lesen();
    const standard = await K.export.standardOrdner();
    const name = p.app?.plan?.name || p.name;
    const w = { art: p.app?.plan ? 'paket' : 'bilder', faktor: 2, ziel: 'speichern', ordner: '', app: 'albatros', gewaehlt: new Set(alle.map((b) => b.id)) };
    const ARTEN = [
      ['paket', 'Paket für die App', 'Boards, Bausteine, Plan – für Claude Code', 'M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10'],
      ['bilder', 'Bilder', 'PNG, ein Bild pro Board', 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4'],
      ['mappe', 'Mappe', 'PDF, alles in einer Datei', 'M6 3h9l4 4v14H6zM15 3v4h4M9 13h6M9 17h6'],
      ['pptx', 'PowerPoint', '.pptx mit Notizen', 'M4 5h16v11H4zM12 16v4M8 20h8'],
      ['code', 'Code', 'HTML pro Board zum Weiterbauen', 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14'],
    ];
    const s = document.createElement('div');
    s.className = 'schleier';
    const zeichne = () => {
      const n = w.gewaehlt.size;
      s.innerHTML = `<div class="dialog paper weitergeben" role="dialog" aria-modal="true" aria-label="Weitergeben">
        <div class="wg-kopf">${figur('fertig', 48)}<div><h2 class="h">Weitergeben</h2><span class="hand" style="font-size:20px">„${esc(name)}“ – ${alle.length} Boards</span></div><div class="platz"></div><button type="button" class="btn btn-q" data-zu>${sym('schliessen', 16)} Schließen</button></div>
        <div class="wg-raster">
          <section class="wg-karte"><h3 class="h"><span class="wg-nr">1</span> Was soll mit?</h3>
            <div class="reihe"><span class="leise" style="font-size:13px;flex:1">${n} von ${alle.length} gewählt</span><button type="button" class="btn btn-s btn-q" data-alle>${n === alle.length ? 'Keine' : 'Alle wählen'}</button></div>
            <div class="wg-liste">${alle.map((b) => `<label class="wg-board"><input type="checkbox" data-board="${b.id}" ${w.gewaehlt.has(b.id) ? 'checked' : ''}><span>${esc(b.name)}</span><small>${b.zustand ? esc(b.zustand) : `${b.breite}×${b.hoehe}`}</small></label>`).join('')}</div></section>
          <section class="wg-karte"><h3 class="h"><span class="wg-nr">2</span> Als was?</h3>
            <div class="wg-arten">${ARTEN.map(([k, t, x, d]) => `<button type="button" class="wg-art" aria-pressed="${w.art === k}" data-art="${k}" ${k === 'paket' && !p.app?.plan && false ? 'disabled' : ''}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg><b class="h">${t}</b><span>${x}</span></button>`).join('')}</div>
            ${w.art === 'bilder' ? `<div class="wg-zeile"><div><b class="h">Größe</b><span class="leise">2× ist scharf auf neuen Handys</span></div><div class="segment">${[1, 2, 3].map((f) => `<button type="button" class="${w.faktor === f ? 'an' : ''}" data-faktor="${f}">${f}×</button>`).join('')}</div></div>` : ''}
          </section>
          <section class="wg-karte"><h3 class="h"><span class="wg-nr">3</span> Wohin?</h3>
            <button type="button" class="wg-ziel" aria-pressed="${w.ziel !== 'app'}" data-ziel="speichern"><b class="h">Ordner</b><span class="leise ordnertext">${esc(w.ordner || standard)}</span><span class="btn btn-s" data-ordner>Anderer Ordner</span></button>
            <button type="button" class="wg-ziel" aria-pressed="${w.ziel === 'app'}" data-ziel="app"><b class="h">In ein App-Projekt</b><select class="feld" id="wg-app">${[['origami', 'origami'], ['kranich', 'Kranich'], ['albatros', 'Albatros'], ['schreiben', 'Schreibprogramm']].map(([k, t]) => `<option value="${k}" ${k === w.app ? 'selected' : ''}>${t}${e.appOrdner?.[k] ? '' : ' (Ordner fehlt)'}</option>`).join('')}</select></button>
            <div class="platz"></div>
            <span class="leise status" style="font-size:13px"></span>
            <button type="button" class="btn btn-p btn-gross" data-los ${n ? '' : 'disabled'}>${sym('export', 16)} ${n} ${n === 1 ? 'Board' : 'Boards'} ${{ paket: 'als Paket', bilder: 'als Bilder', mappe: 'als PDF', pptx: 'als PowerPoint', code: 'als Code' }[w.art]} speichern</button>
          </section>
        </div></div>`;
    };
    zeichne();
    document.body.appendChild(s);
    s.addEventListener('change', (ev) => {
      if (ev.target.dataset.board) { if (ev.target.checked) w.gewaehlt.add(ev.target.dataset.board); else w.gewaehlt.delete(ev.target.dataset.board); zeichne(); }
      if (ev.target.id === 'wg-app') { w.app = ev.target.value; w.ziel = 'app'; zeichne(); }
    });
    s.addEventListener('click', async (ev) => {
      const t = ev.target;
      if (t === s || t.closest('[data-zu]')) { s.remove(); return; }
      if (t.closest('[data-alle]')) { if (w.gewaehlt.size === alle.length) w.gewaehlt.clear(); else alle.forEach((b) => w.gewaehlt.add(b.id)); zeichne(); return; }
      if (t.closest('[data-art]')) { w.art = t.closest('[data-art]').dataset.art; zeichne(); return; }
      if (t.closest('[data-faktor]')) { w.faktor = Number(t.closest('[data-faktor]').dataset.faktor); zeichne(); return; }
      if (t.closest('[data-ordner]')) { const o = await K.datei.ordnerWaehlen(); if (o && !o.fehler) { w.ordner = o; w.ziel = 'ordner'; } zeichne(); return; }
      if (t.closest('select')) return;
      const z = t.closest('[data-ziel]'); if (z) { w.ziel = z.dataset.ziel === 'app' ? 'app' : (w.ordner ? 'ordner' : 'speichern'); zeichne(); return; }
      if (t.closest('[data-los]')) {
        const boards = alle.filter((b) => w.gewaehlt.has(b.id)).map((b) => ({ id: b.id, name: b.name, html: b.html, breite: b.breite, hoehe: b.hoehe, zustand: b.zustand, notiz: b.notiz || '' }));
        const st = s.querySelector('.status'); st.textContent = 'Kranich faltet zusammen …';
        s.querySelector('[data-los]').disabled = true;
        const r = w.art === 'pptx' ? await K.export.pptx({ name, boards: await PptxExport.folien(boards.map((b, i) => ({ ...b, html: Praesentation.mitMaster(b.html, b, i + 1, boards.length, p.master) }))), ziel: w.ziel, app: w.app, ordner: w.ordner }) : w.art === 'paket'
          ? await K.export.paket({ name, boards, css: p.app?.css || '', plan: p.app?.plan || null, ziel: w.ziel, app: w.app, ordner: w.ordner })
          : await K.export.sammlung({ name, boards, art: w.art, faktor: w.faktor, ziel: w.ziel, app: w.app, ordner: w.ordner });
        if (r?.fehler) { st.textContent = r.fehler.nachricht; s.querySelector('[data-los]').disabled = false; return; }
        s.remove();
        H.meldung(`Gespeichert: ${r.datei}`, { knopf: 'Im Ordner zeigen', aktion: () => K.datei.zeigen(r.datei), dauer: 9000 });
      }
    });
    s.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') s.remove(); });
  }

  // ---------- Aktionen ----------
  Object.assign(App.aktionen, {
    'app-opt': (el) => { merkeAuftrag(); S.appAuftrag[el.dataset.feld] = el.dataset.wert; App.renderStart(); },
    'app-beispiel': (el) => { merkeAuftrag(); S.appAuftrag.text = el.dataset.text; App.renderStart(); },
    'app-bild': async () => { merkeAuftrag(); const b = await K.datei.bildWaehlen(); if (b && !b.fehler) { S.appAuftrag.bild = b; App.renderStart(); } },
    'app-bild-weg': () => { merkeAuftrag(); S.appAuftrag.bild = null; App.renderStart(); },
    'app-plan': () => machePlan(),
    'app-plan-nochmal': () => planeNeu(S.appAuftrag.bild),
    'app-auftrag-aendern': () => {
      const a = S.projekt?.app;
      if (a) Object.assign(S.appAuftrag, { text: a.beschreibung, geraet: a.geraet, look: a.look, zustaende: a.zustaende });
      S.startLasche = 'app';
      App.zeigeStart();
    },
    'app-bs-weg': (el) => {
      const plan = S.projekt.app.plan;
      if (plan.bildschirme.length < 2) return;
      plan.bildschirme = plan.bildschirme.filter((b) => b.id !== el.dataset.id);
      plan.ablaeufe = plan.ablaeufe.filter((a) => a.von !== el.dataset.id && a.nach !== el.dataset.id);
      App.speichernSpaeter(); renderPlan();
    },
    'app-zustand': (el) => {
      const b = S.projekt.app.plan.bildschirme.find((x) => x.id === el.dataset.id);
      const z = el.dataset.z;
      b.zustaende = b.zustaende.includes(z) ? b.zustaende.filter((x) => x !== z) : [...b.zustaende, z];
      App.speichernSpaeter(); renderPlan();
    },
    'app-bs-neu': () => { S.planNeu = true; renderPlan(); document.getElementById('bs-name')?.focus(); },
    'app-bs-abbrechen': () => { S.planNeu = false; renderPlan(); },
    'app-bs-anlegen': () => {
      const plan = S.projekt.app.plan;
      const name = document.getElementById('bs-name').value.trim();
      if (!name) { document.getElementById('bs-name').focus(); return; }
      let id = name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bildschirm';
      while (plan.bildschirme.some((b) => b.id === id)) id += '-2';
      plan.bildschirme.push({ id, name: name.slice(0, 40), format: document.getElementById('bs-format').value, zweck: document.getElementById('bs-zweck').value.trim().slice(0, 200), zustaende: [] });
      S.planNeu = false; App.speichernSpaeter(); renderPlan();
    },
    'app-bausteine-aendern': () => { S.bausteineAendern = !S.bausteineAendern; renderPlan(); },
    'app-falten': async () => {
      const p = S.projekt;
      if (p.seiten.length && p.seiten.some((b) => b.html)) {
        // Plan wurde nach dem Falten geändert: neue Bildschirme dazulegen, entfernte bleiben stehen
        const r = await K.app.boards(p.app.plan);
        const neu = r.boards.filter((b) => !p.seiten.some((x) => x.id === b.id));
        const unten = Math.max(...p.seiten.map((x) => x.y + x.hoehe)) + 220;
        let x = 0;
        for (const b of neu) { p.seiten.push({ id: b.id, name: b.name, format: b.format, breite: b.breite, hoehe: b.hoehe, x, y: unten, bildschirm: b.bildschirm, zustand: b.zustand, html: '', verlauf: [], stand: -1 }); x += b.breite + 120; }
        S.ansicht = 'werkbank'; App.renderWerkbank();
        return baue();
      }
      return alleFalten();
    },
    'app-weiter': () => baue(),
    'app-plan-zeigen': () => renderPlan(),
    'app-pruefung': () => zeigePruefung(App.seite()?.id),
    'app-zur-leinwand': () => { S.ansicht = 'werkbank'; App.renderWerkbank(); },
    'app-pruef-vor': (el) => {
      const fertige = S.projekt.seiten.filter((x) => x.html);
      const i = fertige.findIndex((x) => x.id === S.pruefBoard) + Number(el.dataset.r);
      if (fertige[i]) zeigePruefung(fertige[i].id);
    },
    'app-reparieren': (el) => {
      const b = S.projekt.seiten.find((x) => x.id === S.pruefBoard);
      const pr = b.pruefung;
      const liste = [...pr.gefunden, ...pr.offen.filter((o) => !pr.gefunden.some((g) => gleich(g, o)))];
      return repariere([liste[Number(el.dataset.n)]]);
    },
    'app-alle-reparieren': () => repariere(S.projekt.seiten.find((x) => x.id === S.pruefBoard).pruefung.offen),
    'app-nochmal-pruefen': async () => {
      const b = S.projekt.seiten.find((x) => x.id === S.pruefBoard);
      renderPruefung(true);
      const r = await K.app.pruefen({ html: b.html, format: boardFormat(b) });
      const offen = r?.funde || [];
      b.pruefung = { gefunden: [...(b.pruefung?.gefunden || []), ...offen.filter((o) => !(b.pruefung?.gefunden || []).some((g) => gleich(g, o)))], offen, zeit: new Date().toISOString() };
      App.speichernSpaeter(); renderPruefung();
    },
    'app-abspielen': () => abspielen(App.seite()?.zustand ? null : App.seite()?.id),
    'app-uebergabe': () => uebergabe(),
  });

  window.AppBau = { laufFuer, zeigeLauf, renderAuftrag, renderPlan, kopfKnoepfe, abspielen, zeigePruefung, uebergabe, baue };
})();
