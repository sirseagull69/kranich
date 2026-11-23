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
        <textarea id="appwunsch" class="feld" rows="5" style="font-size:17px;min-height:140px" placeholder="z. B. „Eule – Schreibprogramm der origami-Familie, Briefe und Berichte, origami als Copilot rechts“">${esc(a.text)}</textarea>
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
    const pfeile = plan.ablaeufe.map((a, i) => {
      const v = pos.get(a.von), z = pos.get(a.nach);
      if (!v || !z) return '';
      const x1 = v.x + bw / 2, y1 = v.y + bh / 2, x2 = z.x + bw / 2, y2 = z.y + bh / 2;
      // an den Kastenrand kürzen
      const dx = x2 - x1, dy = y2 - y1;
      const t = (w, h) => Math.min(Math.abs(w / 2 / (dx || 1e-6)), Math.abs(h / 2 / (dy || 1e-6)));
      const s = t(bw + 8, bh + 8);
      const ax = x1 + dx * s, ay = y1 + dy * s, bx = x2 - dx * s, by = y2 - dy * s;
      const mx = (ax + bx) / 2 + (Math.abs(dy) > Math.abs(dx) ? 8 : 0), my = (ay + by) / 2 - 7;
      return `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#4a2f9a" stroke-width="1.6" marker-end="url(#pfeil)"></line><text x="${mx}" y="${my}" text-anchor="${Math.abs(dy) > Math.abs(dx) ? 'start' : 'middle'}" font-size="11" fill="#4a2f9a" font-family="Bricolage Grotesque, sans-serif" font-weight="700" paint-order="stroke" stroke="#fffdf8" stroke-width="4">${esc(a.knopf)}</text>`;
    }).join('');
    const kaesten = plan.bildschirme.map((b) => { const p = pos.get(b.id); return `<g><rect x="${p.x}" y="${p.y}" width="${bw}" height="${bh}" fill="#fff" stroke="#d9d0bc"></rect><text x="${p.x + 12}" y="${p.y + 23}" font-size="14" font-weight="800" fill="#1d2742" font-family="Bricolage Grotesque, sans-serif">${esc(b.name.length > 17 ? `${b.name.slice(0, 16)}…` : b.name)}</text><text x="${p.x + 12}" y="${p.y + 41}" font-size="11" fill="#5b6170" font-family="Source Serif 4, serif">${esc(FORMAT_NAME[b.format] || b.format)}${b.zustaende.length ? ` · ${b.zustaende.length} ${b.zustaende.length === 1 ? 'Zustand' : 'Zustände'}` : ''}</text></g>`; }).join('');
    return `<svg viewBox="0 0 ${breite} ${hoehe}" width="100%" style="max-height:100%" role="img" aria-label="Ablauf der App"><defs><marker id="pfeil" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#4a2f9a"></path></marker></defs>${pfeile}${kaesten}</svg>`;
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
      koerper = `<div class="planblatt paper">
        <div class="plankopf">${figur('fertig', 56)}<div style="display:flex;flex-direction:column"><h1 class="h">Plan für „${esc(plan.name)}“</h1><span class="hand" style="font-size:21px">schau drüber, bevor ich falte</span></div><div class="platz"></div>
          <span class="chip chip-grau">${esc({ desktop: 'Desktop', handy: 'Handy', beides: 'Desktop und Handy' }[p.app.geraet] || '')}</span><span class="chip chip-zart">${p.app.look === 'eigen' ? 'Eigener Look' : 'Look der Familie'}</span></div>
        <div class="plankoerper">
          <section class="planspalte" aria-label="Bildschirme"><div class="reihe"><span class="lbl" style="flex:1">Bildschirme</span><span class="leise" style="font-size:13px">${z.bildschirme} geplant</span></div>
            <div class="planliste">${plan.bildschirme.map((b) => `<div class="plankarte cardw"><div class="card"><div class="reihe" style="align-items:flex-start"><div style="flex:1;min-width:0;display:flex;flex-direction:column"><b class="h" style="font-size:16px">${esc(b.name)}</b><span class="leise" style="font-size:12.5px">${esc(FORMAT_NAME[b.format] || b.format)} · ${esc(formatMass(b.format))}</span></div><button type="button" class="btn btn-s btn-q" data-aktion="app-bs-weg" data-id="${b.id}">Entfernen</button></div>
              <span style="font-size:13.5px">${esc(b.zweck)}</span>
              <div class="zustandschips">${Object.entries(ZUSTAND).map(([k, t]) => `<button type="button" class="chip ${b.zustaende.includes(k) ? (k === 'fehler' ? 'chip-rot' : 'chip-zart') : 'chip-aus'}" aria-pressed="${b.zustaende.includes(k)}" data-aktion="app-zustand" data-id="${b.id}" data-z="${k}">${t}</button>`).join('')}</div></div></div>`).join('')}
              ${S.planNeu ? `<div class="plankarte"><div class="card" style="gap:8px"><input class="feld" id="bs-name" placeholder="Name, z. B. „Suche“"><select class="feld" id="bs-format">${Object.entries(FORMAT_NAME).map(([k, t]) => `<option value="${k}" ${k === (p.app.geraet === 'handy' ? 'app' : 'fenster') ? 'selected' : ''}>${t}</option>`).join('')}</select><input class="feld" id="bs-zweck" placeholder="Was tut man hier?"><div class="reihe"><button type="button" class="btn btn-s btn-p" data-aktion="app-bs-anlegen">Dazu</button><button type="button" class="btn btn-s btn-q" data-aktion="app-bs-abbrechen">Abbrechen</button></div></div></div>` : `<button type="button" class="btn btn-s btn-q" style="align-self:flex-start;color:#4a2f9a" data-aktion="app-bs-neu">${sym('plus', 14)} Bildschirm dazu</button>`}
            </div></section>
          <section class="planspalte planmitte" aria-label="Ablauf"><div class="reihe"><span class="lbl" style="flex:1">Ablauf</span><span class="leise" style="font-size:13px">Pfeile = welcher Knopf wohin führt</span></div><div class="diagramm">${ablaufDiagramm(plan)}</div></section>
          <section class="planspalte" aria-label="Bausteine" style="width:300px;flex:none"><div class="reihe"><span class="lbl" style="flex:1">Bausteine</span><button type="button" class="btn btn-s btn-q" data-aktion="app-bausteine-aendern">${S.bausteineAendern ? 'Fertig' : 'Ändern'}</button></div>
            <div class="bausteinvorschau" style="--k-haus:${bs.hausfarbe};--k-facette:${bs.facette};--k-hell:${bs.hell}">
              <span class="lbl" style="font-size:10.5px">Farben</span>
              <div class="farbreihe">${[['Papier', '#f6f1e7'], ['Tinte', '#1d2742'], ['Hausfarbe', bs.hausfarbe], ['Facette', bs.facette], ['Hell', bs.hell]].map(([t, f], i) => `<label class="farbfeld"><span style="background:${f}"></span><b>${t}</b><small>${f}</small>${S.bausteineAendern && i > 1 ? `<input type="color" value="${f}" data-farbe="${['', '', 'hausfarbe', 'facette', 'hell'][i]}" aria-label="${t}">` : ''}</label>`).join('')}</div>
              <span class="lbl" style="font-size:10.5px">Schrift</span>
              <div><b class="h" style="font-size:22px">Überschrift</b><div style="font-size:14px">Fließtext für Briefe und Berichte</div><small class="leise">Bricolage Grotesque · Source Serif 4</small></div>
              <span class="lbl" style="font-size:10.5px">Knopf</span>
              <div class="reihe"><span class="bv-knopf">Hauptknopf</span><span class="bv-knopf2">Abbrechen</span></div>
              <span class="lbl" style="font-size:10.5px">Karte und Kopfzeile</span>
              <div class="bv-kopf"><b class="h">${esc(plan.name)}</b><span class="chip chip-gruen">Gespeichert</span></div>
              <div class="bv-karte"><b class="h">Bericht KW 47</b><small class="leise">Geändert heute, 08:30</small></div>
              ${bs.hinweis ? `<span class="hand" style="font-size:18px">${esc(bs.hinweis)}</span>` : ''}
            </div></section>
        </div>
        <div class="planfuss"><b class="h" style="font-size:16px">${z.bildschirme} Bildschirme, ${z.boards} Boards${z.boards > z.bildschirme ? ' mit Zuständen' : ''}</b><span class="leise">dauert etwa ${Math.max(1, Math.ceil(z.boards * 0.5))} Minuten</span><div class="platz"></div><button type="button" class="btn btn-p" data-aktion="app-falten">${figur('arbeitend', 18)} Alles falten</button></div>
        ${eselsohr(54)}</div>`;
    }
    app.innerHTML = `<section class="ansicht" id="plan">${App.kopfHtml(`<button type="button" class="btn btn-q" data-aktion="app-auftrag-aendern">${sym('zurueck', 16)} Auftrag ändern</button>${plan && !S.planLaeuft ? `<button type="button" class="btn btn-p" data-aktion="app-falten">${sym('varianten', 16)} Alles falten</button>` : ''}`)}
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

  async function baue() {
    const p = S.projekt;
    const plan = p.app.plan;
    const nr = App.neuerAuftrag();
    const offen = p.seiten.filter((b) => !b.html);
    const jobs = [];
    if (!p.app.css) jobs.push({ board: { id: '__bausteine' }, format: { name: 'Bausteine', mass: 'Farben, Schrift, Knöpfe' }, zustand: 'wartet' });
    for (const b of offen) jobs.push({ board: b, format: { name: b.name, breite: b.breite, hoehe: b.hoehe }, zustand: 'wartet' });
    if (!jobs.length) { H.meldung('Alle Boards sind schon gefaltet.'); return; }
    App.chat({ wer: 'ich', text: `Falte alle Bildschirme von „${plan.name}“` });
    App.setzeKranich('denkt', { anpassen: jobs, titel: `Ich baue „${plan.name}“: ${offen.length} Boards`, meldung: `0 von ${offen.length}` });
    for (const b of offen) Entwurf.setzeStatus(b.id, 'wartet');
    Entwurf.einpassen();

    // Bausteine zuerst
    if (!p.app.css) {
      const j = jobs[0];
      j.zustand = 'laeuft'; App.renderVerlauf();
      const r = await K.app.bausteine({ plan });
      if (nr !== App.auftragNr) return;
      if (r?.fehler) {
        j.zustand = 'fehler';
        for (const b of offen) Entwurf.setzeStatus(b.id, null);
        App.chat({ wer: 'kranich', fehler: true, titel: 'Die Bausteine haben nicht geklappt', text: `${r.fehler.nachricht} Drück „Weiter falten“, wenn du es nochmal versuchen willst.` });
        App.setzeKranich('fehler', { anpassen: null, titel: null, fehler: r.fehler });
        App.renderKopfKnoepfe();
        return;
      }
      p.app.css = r.css; p.app.bausteineHtml = r.html;
      j.zustand = 'fertig'; j.notiz = r.notiz || 'steht';
      App.geaendert({ vorschau: false });
    }

    // Boards, zwei gleichzeitig
    const boardJobs = jobs.filter((j) => j.board.id !== '__bausteine');
    let fertig = 0, repariert = 0, offenGesamt = 0;
    const eins = async (j) => {
      j.zustand = 'laeuft'; Entwurf.setzeStatus(j.board.id, 'laeuft'); App.renderVerlauf();
      const b = j.board;
      const r = await K.app.board({ plan, board: { id: b.id, bildschirm: b.bildschirm, zustand: b.zustand, name: b.name, breite: b.breite, hoehe: b.hoehe }, css: p.app.css });
      if (nr !== App.auftragNr) return;
      if (r?.fehler) { j.zustand = 'fehler'; j.notiz = r.fehler.nachricht; Entwurf.setzeStatus(b.id, 'fehler'); App.renderVerlauf(); return; }
      const pr = await App.pruefeUndRepariere(b, r.html, nr);
      if (nr !== App.auftragNr) return;
      b.html = pr.html;
      b.verlauf = [{ html: pr.html, was: 'Aus dem Plan gefaltet', zeit: new Date().toISOString() }];
      b.stand = 0;
      if (pr.repariert) repariert += pr.gefunden.length - pr.offen.length;
      offenGesamt += pr.repariert ? pr.offen.length : pr.gefunden.length;
      j.zustand = pr.gefunden.length && pr.repariert ? 'repariert' : 'fertig';
      j.notiz = App.pruefBericht(pr);
      fertig++;
      Entwurf.zeigeAlle(p.seiten, App.seite().id);
      Entwurf.setzeStatus(b.id, 'fertig');
      S.kranich.meldung = `${fertig} von ${boardJobs.length}`;
      App.renderVerlauf(); App.renderSeitenleiste();
      App.geaendert({ vorschau: false });
    };
    const warteschlange = [...boardJobs];
    const arbeiter = async () => { while (warteschlange.length && nr === App.auftragNr) await eins(warteschlange.shift()); };
    await Promise.all([arbeiter(), arbeiter()]);
    if (nr !== App.auftragNr) return;
    const schief = boardJobs.filter((j) => j.zustand === 'fehler');
    App.chat({
      wer: 'kranich', fehler: schief.length === boardJobs.length, titel: 'Das Falten hat nicht geklappt',
      text: schief.length
        ? `${fertig} von ${boardJobs.length} Boards sind fertig. Nicht geklappt: ${schief.map((j) => j.board.name).join(', ')}. „Weiter falten“ versucht die übrigen nochmal.`
        : `Fertig: „${plan.name}“ hat ${fertig} Boards. Klick auf „Abspielen“, um dich durchzuklicken.`,
      chips: [repariert || offenGesamt ? `Selbstprüfung: ${[repariert ? `${repariert} repariert` : '', offenGesamt ? `${offenGesamt} offen` : ''].filter(Boolean).join(', ')}` : 'Selbstprüfung ohne Befund'],
    });
    App.setzeKranich(schief.length === boardJobs.length ? 'fehler' : 'fertig', { anpassen: null, titel: null, fehler: schief.length === boardJobs.length ? { nachricht: schief[0].notiz } : null });
    App.renderKopfKnoepfe(); App.renderSeitenleiste();
    App.geaendert();
  }

  function kopfKnoepfe(kannZurueck) {
    const p = S.projekt;
    const fehlt = p.seiten.filter((b) => !b.html).length;
    const fertigBoards = p.seiten.filter((b) => b.html).length;
    return `<button type="button" class="btn btn-q" data-aktion="rueckgaengig" ${kannZurueck ? '' : 'disabled'}>${sym('zurueck', 16)} Rückgängig</button>
      <button type="button" class="btn" data-aktion="app-plan-zeigen">${sym('liste', 16)} Plan</button>
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

  // ---------- 5. Abspielen ----------
  function abspielen(startId) {
    const p = S.projekt;
    const boards = p.seiten.filter((b) => b.html);
    if (!boards.length) return;
    const bildschirme = boards.filter((b) => !b.zustand);
    let aktuell = boards.find((b) => b.id === startId) || bildschirme[0] || boards[0];
    const start = aktuell;
    const zurueck = [];
    const el = document.createElement('div');
    el.className = 'abspielen';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    document.body.appendChild(el);
    const zeige = () => {
      const nrB = bildschirme.indexOf(aktuell);
      el.innerHTML = `<div class="abspielleiste"><b class="h">${esc(p.name)}</b><span class="leise">/</span><b class="h">${esc(aktuell.name)}</b><span class="chip chip-gruen">Läuft</span>
        <span class="leise" style="font-size:13px">${nrB >= 0 ? `Bildschirm ${nrB + 1} von ${bildschirme.length}` : 'Zustand'}</span><div class="platz"></div>
        <button type="button" class="btn btn-s" data-a="zurueck" ${zurueck.length ? '' : 'disabled'}>${sym('zurueck', 14)} Zurück</button><button type="button" class="btn btn-s" data-a="neu">Neu starten</button><button type="button" class="btn btn-s btn-p" data-a="zu">${sym('schliessen', 14)} Schließen</button></div>
        <div class="abspielbuehne"><iframe sandbox="allow-same-origin" title="${esc(aktuell.name)}" style="width:${aktuell.breite}px;height:${aktuell.hoehe}px"></iframe></div>
        <div class="abspielhinweis leise">Gestrichelt umrandet = klickbar. Esc schließt.</div>`;
      const buehne = el.querySelector('.abspielbuehne');
      const f = buehne.querySelector('iframe');
      const z = Math.min(1, (window.innerWidth - 80) / aktuell.breite, (window.innerHeight - 140) / aktuell.hoehe);
      f.style.transform = `scale(${z})`;
      buehne.style.width = `${aktuell.breite * z}px`; buehne.style.height = `${aktuell.hoehe * z}px`;
      f.srcdoc = Entwurf.vorbereiten(aktuell.html).replace(/<head[^>]*>/i, (m) => `${m}<style data-kranich-intern>[data-ziel]{outline:2px dashed rgba(124,92,214,.75)!important;outline-offset:3px;cursor:pointer!important}</style>`);
      f.addEventListener('load', () => {
        const doc = f.contentDocument;
        doc.addEventListener('click', (e) => {
          e.preventDefault();
          const t = e.target.closest?.('[data-ziel]');
          if (!t) return;
          const ziel = boards.find((b) => b.id === t.dataset.ziel) || boards.find((b) => b.bildschirm === t.dataset.ziel && !b.zustand);
          if (!ziel) { H.meldung(`„${t.dataset.ziel}“ ist noch nicht gefaltet.`, { art: 'fehler' }); return; }
          zurueck.push(aktuell); aktuell = ziel; zeige();
        }, true);
      });
    };
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'zu') el.remove();
      if (a === 'neu') { zurueck.length = 0; aktuell = start; zeige(); }
      if (a === 'zurueck' && zurueck.length) { aktuell = zurueck.pop(); zeige(); }
    });
    const taste = (e) => { if (e.key === 'Escape') { el.remove(); document.removeEventListener('keydown', taste); } };
    document.addEventListener('keydown', taste);
    zeige();
    return el;
  }

  // ---------- 6. Übergabe ----------
  async function uebergabe() {
    const p = S.projekt;
    const boards = p.seiten.filter((b) => b.html);
    if (!boards.length) return;
    const e = await K.einstellungen.lesen();
    const standard = await K.export.standardOrdner();
    const zust = boards.filter((b) => b.zustand).length;
    const w = { ziel: 'speichern', ordner: '', app: 'eule' };
    const name = p.app?.plan?.name || p.name;
    const sl = name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kranich';
    const s = document.createElement('div');
    s.className = 'schleier';
    s.innerHTML = `<div class="dialog paper schmal" role="dialog" aria-modal="true" style="width:min(820px,94vw)">
      <div class="dialogkopf">${figur('fertig', 56)}<div style="display:flex;flex-direction:column"><h2 class="h">Paket für die App</h2><span class="hand" style="font-size:20px">alles zusammengefaltet für „${esc(name)}“</span></div><div class="platz"></div><button type="button" class="btn btn-q" data-zu>${sym('schliessen', 16)} Schließen</button></div>
      <div class="exportkoerper"><div style="flex:1;display:flex;flex-direction:column;gap:8px"><span class="lbl">Was drin ist</span>
        ${[[`${boards.length} Boards`, `${boards.length - zust} Bildschirme${zust ? ` und ${zust} Zustände` : ''}`], ['Bausteine', p.app?.css ? 'Farben, Schriften, Knöpfe, Karten, Kopfzeile' : 'keine (kein App-Plan)'], ['Plan', p.app?.plan ? 'Ein Satz Zweck pro Bildschirm' : 'nur die Boards'], ['Abläufe', `${p.app?.plan?.ablaeufe?.length || 0} Klickwege mit Knopfnamen`]].map(([t, x]) => `<div class="reihe" style="gap:10px;padding:8px 10px;background:#fff;border:1px solid #ece4d2"><span style="color:#17663a">${sym('haken', 16)}</span><div style="display:flex;flex-direction:column"><b class="h">${t}</b><span class="leise" style="font-size:13px">${x}</span></div></div>`).join('')}</div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px"><span class="lbl">So sieht das Paket aus</span>
          <pre class="baum">${esc(`${sl}-paket/\n├─ boards/        ${boards.length} Dateien\n├─ bausteine.css\n├─ plan.json\n└─ LIESMICH.md`)}</pre>
          <span class="lbl">Ziel-Ordner</span>
          <div class="ziel" role="radio" tabindex="0" data-ziel="speichern" aria-checked="true"><div class="zk"><b class="h">Speichern</b><div class="platz"></div><button type="button" class="btn btn-s" data-ordner>Ordner wählen</button></div><span class="leise ordnertext" style="font-size:12.5px">${esc(standard)}</span></div>
          <div class="ziel" role="radio" tabindex="0" data-ziel="app" aria-checked="false"><div class="zk"><b class="h">In ein App-Projekt</b><div class="platz"></div><select class="feld" id="pk-app">${[['origami', 'origami'], ['kranich', 'Kranich'], ['eule', 'Eule'], ['elster', 'Elster']].map(([k, t]) => `<option value="${k}" ${k === w.app ? 'selected' : ''}>${t}${e.appOrdner?.[k] ? '' : ' (Ordner fehlt)'}</option>`).join('')}</select></div></div>
          <label class="reihe leise" style="gap:8px;font-size:13px"><input type="checkbox" disabled> origami Bescheid geben (kommt, sobald origami angebunden ist)</label></div></div>
      <div class="dialogfuss"><span class="leise status" style="flex:1">${boards.length + 3} Dateien</span><button type="button" class="btn btn-q" data-zu>Abbrechen</button><button type="button" class="btn btn-p" data-los>${figur('arbeitend', 18)} Paket falten</button></div>
      ${eselsohr(54, 'rgba(0,0,0,0)')}</div>`;
    document.body.appendChild(s);
    const zeige = () => s.querySelectorAll('[data-ziel]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.ziel === (w.ziel === 'ordner' ? 'speichern' : w.ziel))));
    s.querySelector('#pk-app').addEventListener('change', (ev) => { w.app = ev.target.value; w.ziel = 'app'; zeige(); });
    s.addEventListener('click', async (ev) => {
      if (ev.target === s || ev.target.closest('[data-zu]')) { s.remove(); return; }
      if (ev.target.closest('[data-ordner]')) {
        const o = await K.datei.ordnerWaehlen();
        if (o && !o.fehler) { w.ordner = o; w.ziel = 'ordner'; s.querySelector('.ordnertext').textContent = o; }
        zeige(); return;
      }
      const z = ev.target.closest('[data-ziel]');
      if (z && !ev.target.closest('select,button')) { w.ziel = z.dataset.ziel === 'speichern' && w.ordner ? 'ordner' : z.dataset.ziel; zeige(); return; }
      if (ev.target.closest('[data-los]')) {
        s.querySelector('.status').textContent = 'Kranich faltet das Paket …';
        const r = await K.export.paket({ name, boards: boards.map((b) => ({ id: b.id, name: b.name, html: b.html, breite: b.breite, hoehe: b.hoehe, zustand: b.zustand })), css: p.app?.css || '', plan: p.app?.plan || null, ziel: w.ziel, app: w.app, ordner: w.ordner });
        if (r?.fehler) { s.querySelector('.status').textContent = r.fehler.nachricht; return; }
        s.remove();
        H.meldung(`Paket gefaltet: ${r.datei}`, { knopf: 'Im Ordner zeigen', aktion: () => K.datei.zeigen(r.datei), dauer: 9000 });
      }
    });
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

  window.AppBau = { renderAuftrag, renderPlan, kopfKnoepfe, abspielen, zeigePruefung, uebergabe, baue };
})();
