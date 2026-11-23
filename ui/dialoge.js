'use strict';
// Dialoge: Exportieren und Einstellungen.
(function () {
  const K = window.kranich;
  const { esc } = H;

  function oeffne(inhalt, { schmal = false, einstellungen: eins = false } = {}) {
    const s = document.createElement('div');
    s.className = 'schleier';
    s.innerHTML = `<div class="dialog paper ${schmal ? 'schmal' : ''} ${eins ? 'einstelldialog' : ''}" role="dialog" aria-modal="true">${inhalt}${eselsohr(54, 'rgba(0,0,0,0)')}</div>`;
    document.body.appendChild(s);
    const zu = () => s.remove();
    s.addEventListener('click', (e) => { if (e.target === s || e.target.closest('[data-zu]')) zu(); });
    s.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(); });
    return { el: s, zu };
  }

  const APPS = [['origami', 'origami'], ['kranich', 'Kranich'], ['eule', 'Eule'], ['elster', 'Elster']];

  // ---------- Exportieren ----------
  async function exportieren({ projekt, modus, seite }) {
    const bild = modus === 'bild';
    if (bild && !Bild.hatBild()) { H.meldung('Erst ein Bild öffnen.', { art: 'fehler' }); return; }
    if (!bild && !seite.html) { H.meldung('Die Seite ist noch leer.', { art: 'fehler' }); return; }
    const e = await K.einstellungen.lesen();
    const basisB = bild ? Bild.z.breite : seite.breite;
    const basisH = bild ? Bild.z.hoehe : seite.hoehe;
    const w = { format: 'png', faktor: 1, breite: basisB, hoehe: basisH, halten: true, ziel: 'speichern', ordner: '', app: 'origami' };
    const standard = await K.export.standardOrdner();
    const formate = bild
      ? [['png', 'PNG', 'Bild mit durchsichtigem Hintergrund'], ['jpg', 'JPG', 'Kleines Bild, ohne Durchsicht'], ['svg', 'SVG', 'Bild in einer SVG-Hülle (bleibt Pixelbild)']]
      : [['png', 'PNG', 'Bild mit durchsichtigem Hintergrund'], ['jpg', 'JPG', 'Kleines Bild, ohne Durchsicht'], ['svg', 'SVG', 'Grafik, die sich verlustfrei vergrößern lässt'], ['html', 'HTML für die App', 'Fertiger Code für eine App der Familie']];

    const d = oeffne(`<div class="dialogkopf">${figur('fertig', 56)}<div style="display:flex;flex-direction:column"><h2 class="h">Exportieren</h2><span class="hand" style="font-size:20px">ich falt dir das fertig zusammen</span></div><div class="platz"></div><button type="button" class="btn btn-q" data-zu>${sym('schliessen', 16)} Schließen</button></div>
      <div class="exportkoerper"><div class="exportvorschau"><span class="lbl">Vorschau</span><div class="rahmen"></div><div class="reihe"><b class="h">${esc(bild ? projekt.name : seite.name)}</b><span class="leise masse"></span></div></div>
      <div class="exportoptionen"><div class="einstellzeile"><span class="lbl">Format</span><div class="formate">${formate.map(([k, t, x]) => `<button type="button" class="format" data-format="${k}" aria-pressed="${k === 'png'}"><b>${t}</b><span>${x}</span></button>`).join('')}</div></div>
        <div class="einstellzeile groesse"><span class="lbl">Größe</span><div class="reihe">${bild ? '' : '<div class="segment">' + [1, 2, 3].map((f) => `<button type="button" data-faktor="${f}" aria-pressed="${f === 1}">${f}×</button>`).join('') + '</div>'}
          <label class="reihe" style="gap:4px">Breite <input class="feld" id="ex-b" type="number" min="1" max="12000" style="width:90px" value="${basisB}"></label>
          <label class="reihe" style="gap:4px">Höhe <input class="feld" id="ex-h" type="number" min="1" max="12000" style="width:90px" value="${basisH}"></label></div>
          <label class="reihe" style="gap:6px;font-size:13px"><input type="checkbox" id="ex-halten" checked> Seitenverhältnis halten</label></div>
        <div class="einstellzeile"><span class="lbl">Ziel</span>
          <div class="ziel" role="radio" tabindex="0" data-ziel="speichern" aria-checked="true"><div class="zk"><b class="h">Speichern</b><div class="platz"></div><button type="button" class="btn btn-s" data-ordner>Ordner wählen</button></div><span class="leise ordnertext" style="font-size:12.5px">${esc(standard)}</span></div>
          <div class="ziel" role="radio" tabindex="0" data-ziel="app" aria-checked="false"><div class="zk"><b class="h">In App-Projekt der Familie</b><div class="platz"></div><select class="feld" id="ex-app">${APPS.map(([k, t]) => `<option value="${k}" ${k === w.app ? 'selected' : ''}>${t}${e.appOrdner?.[k] ? '' : ' (Ordner fehlt)'}</option>`).join('')}</select></div><span class="leise" style="font-size:12.5px">Schreibt direkt ins Projekt, in den Unterordner „kranich“. Ordner stellst du in den Einstellungen ein.</span></div></div>
      </div></div>
      <div class="dialogfuss"><span class="leise status" style="flex:1"></span><button type="button" class="btn btn-q" data-zu>Abbrechen</button><button type="button" class="btn btn-p" data-los>${figur('arbeitend', 18)} Falten &amp; speichern</button></div>`);
    const el = d.el;

    // Vorschau
    const rahmen = el.querySelector('.rahmen');
    if (bild) {
      rahmen.innerHTML = `<img alt="Vorschau" src="${Bild.vorschau(900)}">`;
    } else {
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-same-origin');
      f.title = 'Vorschau';
      f.style.width = `${seite.breite}px`; f.style.height = `${seite.hoehe}px`;
      f.srcdoc = Entwurf.vorbereiten(seite.html);
      rahmen.appendChild(f);
      requestAnimationFrame(() => {
        const z = Math.min(rahmen.clientWidth / seite.breite, rahmen.clientHeight / seite.hoehe);
        f.style.transform = `scale(${z})`; f.style.left = `${(rahmen.clientWidth - seite.breite * z) / 2}px`;
      });
    }

    const zeige = () => {
      el.querySelectorAll('[data-format]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.format === w.format)));
      el.querySelectorAll('[data-faktor]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.faktor) === w.faktor)));
      el.querySelectorAll('[data-ziel]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.ziel === (w.ziel === 'ordner' ? 'speichern' : w.ziel))));
      const vektor = w.format === 'html' || (w.format === 'svg' && !bild);
      el.querySelector('.groesse').style.opacity = vektor ? 0.4 : 1;
      el.querySelector('.groesse').style.pointerEvents = vektor ? 'none' : '';
      el.querySelector('#ex-b').value = w.breite; el.querySelector('#ex-h').value = w.hoehe;
      el.querySelector('.masse').textContent = vektor ? `${basisB} × ${basisH}` : `${w.breite} × ${w.hoehe} px`;
    };
    el.addEventListener('click', async (ev) => {
      const t = ev.target.closest('[data-format],[data-faktor],[data-ziel],[data-ordner],[data-los]');
      if (!t) return;
      if (t.dataset.format) w.format = t.dataset.format;
      if (t.dataset.faktor) { w.faktor = Number(t.dataset.faktor); w.breite = basisB * w.faktor; w.hoehe = basisH * w.faktor; }
      if (t.dataset.ziel && !ev.target.closest('select,button')) w.ziel = t.dataset.ziel === 'speichern' && w.ordner ? 'ordner' : t.dataset.ziel;
      if (t.hasAttribute('data-ordner')) {
        const o = await K.datei.ordnerWaehlen();
        if (o && !o.fehler) { w.ordner = o; w.ziel = 'ordner'; el.querySelector('.ordnertext').textContent = o; }
        zeige();
        return;
      }
      if (t.hasAttribute('data-los')) return los();
      zeige();
    });
    el.querySelector('#ex-app').addEventListener('change', (ev) => { w.app = ev.target.value; w.ziel = 'app'; zeige(); });
    el.querySelector('#ex-halten').addEventListener('change', (ev) => { w.halten = ev.target.checked; });
    el.querySelector('#ex-b').addEventListener('input', (ev) => { w.breite = Math.max(1, Number(ev.target.value) || 1); if (w.halten) w.hoehe = Math.round((w.breite * basisH) / basisB); w.faktor = w.breite / basisB; el.querySelector('#ex-h').value = w.hoehe; el.querySelector('.masse').textContent = `${w.breite} × ${w.hoehe} px`; });
    el.querySelector('#ex-h').addEventListener('input', (ev) => { w.hoehe = Math.max(1, Number(ev.target.value) || 1); if (w.halten) { w.breite = Math.round((w.hoehe * basisB) / basisH); w.faktor = w.breite / basisB; } el.querySelector('#ex-b').value = w.breite; el.querySelector('.masse').textContent = `${w.breite} × ${w.hoehe} px`; });

    async function los() {
      const knopf = el.querySelector('[data-los]');
      knopf.disabled = true;
      el.querySelector('.status').textContent = 'Kranich faltet …';
      const ziel = w.ziel === 'ordner' ? 'ordner' : w.ziel;
      const name = bild ? projekt.name : `${projekt.name} ${seite.name}`;
      let r;
      if (bild) {
        r = await K.export.bild({ dataUrl: Bild.zusammenfuegen({ breite: w.breite, hoehe: w.hoehe, format: w.format }), format: w.format, ziel, app: w.app, ordner: w.ordner, name, breite: w.breite, hoehe: w.hoehe });
      } else {
        r = await K.export.entwurf({ html: seite.html, breite: seite.breite, hoehe: seite.hoehe, format: w.format, faktor: w.faktor, ziel, app: w.app, ordner: w.ordner, name });
      }
      knopf.disabled = false;
      if (r?.fehler) { el.querySelector('.status').textContent = r.fehler.nachricht; return; }
      d.zu();
      H.meldung(`Gespeichert: ${r.datei}`, { knopf: 'Im Ordner zeigen', aktion: () => K.datei.zeigen(r.datei), dauer: 9000 });
    }
    zeige();
  }

  // ---------- Einstellungen ----------
  async function einstellungen() {
    const e = await K.einstellungen.lesen();
    const karte = (id, ic, titel, unter, inhalt) => `<section class="ekarte paper" id="${id}"><div class="ekopf"><span class="eicon">${sym(ic, 18)}</span><div><b class="h">${titel}</b><span class="leise">${unter}</span></div></div>${inhalt}</section>`;
    const d = oeffne(`<div class="einstellraster">
      <nav class="enav"><span class="k-abschnitt">Bereiche</span>
        ${[['e-hirn', 'zahnrad', 'Wer denkt'], ['e-pc', 'fenster', 'Modell auf dem PC'], ['e-lookk', 'farbe', 'Look der Familie'], ['e-ordner', 'ordner', 'App-Ordner']].map(([id, ic, t], i) => `<a class="navzeile" href="#${id}" aria-current="${i === 0}" data-sprung="${id}">${sym(ic, 17)}<span>${t}</span></a>`).join('')}
        <div class="platz"></div><div class="eueber">${figur('ruhend', 40)}<span class="leise">Kranich · Teil von<br>„Selbst gfaltet“</span></div></nav>
      <div class="einhalt">
        <div class="dialogkopf"><div style="display:flex;flex-direction:column"><h2 class="h">Einstellungen</h2><span class="leise">Änderungen gelten sofort für alle Entwürfe.</span></div><div class="platz"></div><span class="hand" style="font-size:22px;transform:rotate(-2deg)">gilt auch für Eule &amp; Elster ↓</span><button type="button" class="btn btn-q" data-zu>${sym('schliessen', 16)} Schließen</button></div>
        <div class="ekarten">
        ${karte('e-hirn', 'zahnrad', 'Wer denkt für Kranich?', 'Claude über dein Konto oder einen Schlüssel', `
          <div class="zweiknopf wegwahl"><label class="btn"><input type="radio" name="weg" value="claude" ${e.weg !== 'api' ? 'checked' : ''}> Dein Claude-Konto</label><label class="btn"><input type="radio" name="weg" value="api" ${e.weg === 'api' ? 'checked' : ''}> API-Schlüssel</label></div>
          <div class="einstellzeile weg-claude"><label for="e-modell" class="lbl">Modell</label><select class="feld" id="e-modell">${['opus', 'sonnet', 'haiku'].map((m) => `<option ${e.claudeModell === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
            <label for="e-prog" class="lbl">Programm</label><input class="feld" id="e-prog" value="${esc(e.claudeProgramm)}"><span class="leise klein">Nur ändern, wenn „claude“ nicht gefunden wird.</span></div>
          <div class="einstellzeile weg-api"><label for="e-key" class="lbl">API-Schlüssel</label><input class="feld" id="e-key" type="password" placeholder="${e.apiSchluesselGesetzt ? 'gespeichert – leer lassen zum Behalten' : 'sk-ant-…'}">
            <label for="e-apimodell" class="lbl">Modell</label><input class="feld" id="e-apimodell" value="${esc(e.apiModell)}"></div>
          <div class="reihe"><button type="button" class="btn" data-testen>Verbindung testen</button><span class="leise status klein" style="flex:1"></span></div>`)}
        ${karte('e-pc', 'fenster', 'Modell auf dem PC', 'Ollama für kleine Änderungen', `
          <label class="schalter"><input type="checkbox" id="e-lokal" ${e.lokalAn ? 'checked' : ''}><i></i><span>Für kleine Änderungen nutzen</span></label>
          <label class="lbl" for="e-lokalmodell">Modell</label><input class="feld" id="e-lokalmodell" value="${esc(e.lokalModell)}" aria-label="Lokales Modell">
          <label class="lbl" for="e-lokaladr">Adresse</label><input class="feld" id="e-lokaladr" value="${esc(e.lokalAdresse)}" aria-label="Adresse von Ollama">
          <span class="leise klein">Kleine Wünsche an ein ausgewähltes Element gehen zuerst an den PC. Fällt Claude aus, springt der PC ein.</span>`)}
        ${karte('e-lookk', 'farbe', 'Look der Familie', 'Eigene Regeln für jeden Entwurf', `
          <textarea class="feld" id="e-look" rows="5" placeholder="z. B. „Hauptknöpfe immer rechts unten, keine Schatten“">${esc(e.lookHinweise)}</textarea>
          <span class="leise klein">Kranich hält sich bei jedem Entwurf daran.</span>`)}
        ${karte('e-ordner', 'ordner', 'Projektordner der Apps', 'Ziel für „In App-Projekt der Familie“', `
          ${APPS.map(([k, t]) => `<div class="ordnerzeile"><b class="h">${t}</b><input class="feld" data-app="${k}" value="${esc(e.appOrdner?.[k] || '')}" placeholder="noch nicht gewählt"><button type="button" class="btn btn-s" data-appwahl="${k}">Wählen</button></div>`).join('')}`)}
        </div>
        <div class="dialogfuss"><div class="platz"></div><button type="button" class="btn btn-q" data-zu>Abbrechen</button><button type="button" class="btn btn-p" data-speichern>${sym('haken', 16, 2.4)} Speichern</button></div>
      </div></div>`, { einstellungen: true });
    const el = d.el;
    const wegZeigen = () => {
      const weg = el.querySelector('input[name="weg"]:checked').value;
      el.querySelector('.weg-claude').hidden = weg !== 'claude';
      el.querySelector('.weg-api').hidden = weg !== 'api';
    };
    el.querySelectorAll('input[name="weg"]').forEach((r) => r.addEventListener('change', wegZeigen));
    wegZeigen();
    const werte = () => ({
      weg: el.querySelector('input[name="weg"]:checked').value,
      claudeModell: el.querySelector('#e-modell').value,
      claudeProgramm: el.querySelector('#e-prog').value.trim() || 'claude',
      apiSchluessel: el.querySelector('#e-key').value.trim(),
      apiModell: el.querySelector('#e-apimodell').value.trim(),
      lokalAn: el.querySelector('#e-lokal').checked,
      lokalModell: el.querySelector('#e-lokalmodell').value.trim(),
      lokalAdresse: el.querySelector('#e-lokaladr').value.trim(),
      lookHinweise: el.querySelector('#e-look').value,
      appOrdner: Object.fromEntries([...el.querySelectorAll('[data-app]')].map((i) => [i.dataset.app, i.value.trim()])),
    });
    el.querySelectorAll('[data-sprung]').forEach((a) => a.addEventListener('click', (ev) => {
      ev.preventDefault();
      el.querySelector(`#${a.dataset.sprung}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.querySelectorAll('[data-sprung]').forEach((x) => x.setAttribute('aria-current', String(x === a)));
    }));
    el.addEventListener('click', async (ev) => {
      const t = ev.target.closest('[data-appwahl],[data-testen],[data-speichern]');
      if (!t) return;
      if (t.dataset.appwahl) {
        const o = await K.datei.ordnerWaehlen();
        if (o && !o.fehler) el.querySelector(`[data-app="${t.dataset.appwahl}"]`).value = o;
        return;
      }
      const status = el.querySelector('.status');
      await K.einstellungen.setzen(werte());
      if (t.hasAttribute('data-speichern')) { d.zu(); H.meldung('Einstellungen gespeichert.'); return; }
      status.textContent = 'Frage Claude …';
      const r = await K.hirn.testen();
      status.textContent = r?.fehler ? `Klappt nicht: ${r.fehler.nachricht}` : r.ok ? 'Claude ist da. Alles bereit.' : 'Claude antwortet, aber anders als erwartet.';
    });
  }

  // ---------- Board dazu: Format wählen ----------
  function formatWaehlen(formate, gruppen, karten) {
    return new Promise((resolve) => {
      const d = oeffne(`<div class="dialogkopf">${figur('ruhend', 50)}<div style="display:flex;flex-direction:column"><h2 class="h">Board dazu</h2><span class="hand" style="font-size:20px">welches Blatt soll daneben?</span></div><div class="platz"></div><button type="button" class="btn btn-q" data-zu>${sym('schliessen', 16)} Schließen</button></div>
        <div class="formatgruppen" style="max-height:66vh">${karten(null, 'dlg-format')}</div>`);
      const fertig = (f) => { d.zu(); resolve(f); };
      d.el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-aktion="dlg-format"]');
        if (t) fertig(formate.find((f) => f.id === t.dataset.id));
        else if (e.target === d.el || e.target.closest('[data-zu]')) resolve(null);
      });
    });
  }

  // ---------- Alle Größen ----------
  const VORSCHLAG = ['story', 'linkedin', 'a5'];

  function alleGroessen({ quelle, formate, vorhanden }) {
    return new Promise((resolve) => {
      const liste = formate.filter((f) => f.id !== quelle.format);
      const gewaehlt = new Set(liste.filter((f) => VORSCHLAG.includes(f.id) && !vorhanden.includes(f.id)).map((f) => f.id));
      const vor = (f, max = 120, maxH = 100) => {
        const v = Math.min(max / f.breite, maxH / f.hoehe);
        return { b: Math.round(f.breite * v), h: Math.round(f.hoehe * v) };
      };
      const d = oeffne(`<div class="dialogkopf">${figur('fertig', 56)}<div style="display:flex;flex-direction:column"><h2 class="h">Alle Größen</h2><span class="hand" style="font-size:20px">ein Entwurf, viele Blätter</span></div><div class="platz"></div><button type="button" class="btn btn-q" data-zu>${sym('schliessen', 16)} Schließen</button></div>
        <div class="groessenkoerper">
          <div class="groessenquelle"><span class="lbl">Ausgangs-Board</span><div class="rahmen" style="height:${Math.round(300 * Math.min(1.4, quelle.hoehe / quelle.breite))}px"></div><b class="h">${esc(quelle.name)} · ${esc(quelle.mass || `${quelle.breite} × ${quelle.hoehe}`)}</b>
            <div class="fold" style="margin:8px 0"></div>
            <label class="reihe" style="gap:8px"><input type="checkbox" id="ag-texte" checked> Texte ans Format anpassen</label>
            <label class="reihe" style="gap:8px"><input type="checkbox" id="ag-daneben" checked> Als neue Boards neben das Original legen</label></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:8px;min-width:0"><div class="reihe"><span class="lbl" style="flex:1">In diese Formate falten</span><button type="button" class="btn btn-s btn-q" data-alle>Alle wählen</button><button type="button" class="btn btn-s btn-q" data-keins>Keins</button></div>
            <div class="groessenliste">${liste.map((f) => { const m = vor(f); return `<button type="button" class="groessenkarte" data-f="${f.id}" aria-pressed="${gewaehlt.has(f.id)}"><div class="rahmen"><div class="zuschnitt" style="width:${m.b}px;height:${m.h}px"></div></div><div class="kopf2"><span class="haken">${sym('haken', 12, 3)}</span><b>${esc(f.name)}</b></div><span class="leise" style="font-size:12px">${esc(f.mass || `${f.breite} × ${f.hoehe}`)}${vorhanden.includes(f.id) ? ' · schon da' : ''}</span></button>`; }).join('')}</div></div>
        </div>
        <div class="dialogfuss"><span class="status" style="flex:1"></span><button type="button" class="btn btn-q" data-zu>Abbrechen</button><button type="button" class="btn btn-p" data-los>${figur('arbeitend', 18)} Falten</button></div>`);
      const el = d.el;
      // Ausgangs-Board und Vorschauen (zugeschnitten, als Hinweis)
      const rahmen = el.querySelector('.groessenquelle .rahmen');
      const zeigeIn = (box, b, h) => {
        const f = document.createElement('iframe');
        f.setAttribute('sandbox', 'allow-same-origin'); f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
        f.style.width = `${quelle.breite}px`; f.style.height = `${quelle.hoehe}px`;
        f.srcdoc = Entwurf.vorbereiten(quelle.html);
        const z = Math.max(b / quelle.breite, h / quelle.hoehe);
        f.style.transform = `scale(${z})`;
        f.style.left = `${(b - quelle.breite * z) / 2}px`; f.style.top = `${(h - quelle.hoehe * z) / 2}px`;
        box.appendChild(f);
      };
      requestAnimationFrame(() => {
        const z = Math.min(rahmen.clientWidth / quelle.breite, rahmen.clientHeight / quelle.hoehe);
        zeigeIn(rahmen, quelle.breite * z, quelle.hoehe * z);
        const fr = rahmen.querySelector('iframe');
        fr.style.transform = `scale(${z})`; fr.style.left = `${(rahmen.clientWidth - quelle.breite * z) / 2}px`; fr.style.top = '0px';
      });
      const zeige = () => {
        el.querySelectorAll('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(gewaehlt.has(b.dataset.f))));
        const namen = liste.filter((f) => gewaehlt.has(f.id)).map((f) => f.name);
        el.querySelector('.status').innerHTML = namen.length ? `<b class="h">${namen.length} ${namen.length === 1 ? 'Format' : 'Formate'} gewählt</b> <span class="leise">${esc(namen.join(', '))}</span>` : '<span class="leise">Noch nichts gewählt</span>';
        el.querySelector('[data-los]').disabled = !namen.length;
      };
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-f],[data-alle],[data-keins],[data-los]');
        if (!t) { if (e.target === el || e.target.closest('[data-zu]')) resolve(null); return; }
        if (t.dataset.f) { if (gewaehlt.has(t.dataset.f)) gewaehlt.delete(t.dataset.f); else gewaehlt.add(t.dataset.f); }
        if (t.hasAttribute('data-alle')) liste.forEach((f) => gewaehlt.add(f.id));
        if (t.hasAttribute('data-keins')) gewaehlt.clear();
        if (t.hasAttribute('data-los')) {
          const wahl = { formate: liste.filter((f) => gewaehlt.has(f.id)), texteAnpassen: el.querySelector('#ag-texte').checked, daneben: el.querySelector('#ag-daneben').checked };
          d.zu(); resolve(wahl); return;
        }
        zeige();
      });
      zeige();
    });
  }

  window.Dialoge = { exportieren, einstellungen, formatWaehlen, alleGroessen };
})();
