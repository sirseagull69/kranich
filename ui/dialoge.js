'use strict';
// Dialoge: Exportieren und Einstellungen.
(function () {
  const K = window.kranich;
  const { esc } = H;

  function oeffne(inhalt, { schmal = false } = {}) {
    const s = document.createElement('div');
    s.className = 'schleier';
    s.innerHTML = `<div class="dialog paper ${schmal ? 'schmal' : ''}" role="dialog" aria-modal="true">${inhalt}${eselsohr(54, 'rgba(0,0,0,0)')}</div>`;
    document.body.appendChild(s);
    const zu = () => s.remove();
    s.addEventListener('click', (e) => { if (e.target === s || e.target.closest('[data-zu]')) zu(); });
    s.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(); });
    return { el: s, zu };
  }

  const APPS = [['erledigt', 'Erledigt'], ['origami', 'origami'], ['kranich', 'Kranich']];

  // ---------- Exportieren ----------
  async function exportieren({ projekt, modus, seite }) {
    const bild = modus === 'bild';
    if (bild && !Bild.hatBild()) { H.meldung('Erst ein Bild öffnen.', { art: 'fehler' }); return; }
    if (!bild && !seite.html) { H.meldung('Die Seite ist noch leer.', { art: 'fehler' }); return; }
    const e = await K.einstellungen.lesen();
    const basisB = bild ? Bild.z.breite : seite.breite;
    const basisH = bild ? Bild.z.hoehe : seite.hoehe;
    const w = { format: 'png', faktor: 1, breite: basisB, hoehe: basisH, halten: true, ziel: 'speichern', ordner: '', app: 'erledigt' };
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
          <div class="ziel" role="radio" tabindex="0" data-ziel="app" aria-checked="false"><div class="zk"><b class="h">In App-Projekt der Familie</b><div class="platz"></div><select class="feld" id="ex-app">${APPS.map(([k, t]) => `<option value="${k}">${t}${e.appOrdner?.[k] ? '' : ' (Ordner fehlt)'}</option>`).join('')}</select></div><span class="leise" style="font-size:12.5px">Schreibt direkt ins Projekt, in den Unterordner „kranich“. Ordner stellst du in den Einstellungen ein.</span></div></div>
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
    const d = oeffne(`<div class="dialogkopf">${figur('ruhend', 50)}<h2 class="h">Einstellungen</h2><div class="platz"></div><button type="button" class="btn btn-q" data-zu>${sym('schliessen', 16)} Schließen</button></div>
      <div class="einstellzeile"><span class="lbl">Wer denkt für Kranich?</span>
        <label class="reihe"><input type="radio" name="weg" value="claude" ${e.weg !== 'api' ? 'checked' : ''}> Claude über dein Konto (Claude Code auf diesem Rechner, angemeldet)</label>
        <label class="reihe"><input type="radio" name="weg" value="api" ${e.weg === 'api' ? 'checked' : ''}> Claude über einen API-Schlüssel</label></div>
      <div class="einstellzeile weg-claude"><label for="e-modell">Modell</label><select class="feld" id="e-modell">${['opus', 'sonnet', 'haiku'].map((m) => `<option ${e.claudeModell === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <label for="e-prog">Programm (nur ändern, wenn „claude“ nicht gefunden wird)</label><input class="feld" id="e-prog" value="${esc(e.claudeProgramm)}"></div>
      <div class="einstellzeile weg-api"><label for="e-key">API-Schlüssel</label><input class="feld" id="e-key" type="password" placeholder="${e.apiSchluesselGesetzt ? 'gespeichert – leer lassen zum Behalten' : 'sk-ant-…'}">
        <label for="e-apimodell">Modell</label><input class="feld" id="e-apimodell" value="${esc(e.apiModell)}"></div>
      <div class="fold"></div>
      <div class="einstellzeile"><label class="reihe"><input type="checkbox" id="e-lokal" ${e.lokalAn ? 'checked' : ''}> Modell auf dem PC für kleine Änderungen nutzen (Ollama)</label>
        <div class="reihe"><input class="feld" id="e-lokalmodell" value="${esc(e.lokalModell)}" style="width:180px" aria-label="Lokales Modell"><input class="feld" id="e-lokaladr" value="${esc(e.lokalAdresse)}" style="flex:1" aria-label="Adresse von Ollama"></div>
        <span class="leise" style="font-size:12.5px">Kleine Wünsche an ein ausgewähltes Element gehen dann zuerst an den PC. Fällt Claude aus, springt der PC dafür ein.</span></div>
      <div class="fold"></div>
      <div class="einstellzeile"><label for="e-look">Eigene Hinweise zum Look der Familie</label><textarea class="feld" id="e-look" placeholder="z. B. „Erledigt nutzt Grün #2f8f5b, Knöpfe immer rechts unten“">${esc(e.lookHinweise)}</textarea>
        <span class="leise" style="font-size:12.5px">Kranich hält sich bei jedem Entwurf daran.</span></div>
      <div class="einstellzeile"><span class="lbl">Projektordner der Apps (für „In App-Projekt der Familie“)</span>
        ${APPS.map(([k, t]) => `<div class="reihe"><b class="h" style="width:80px">${t}</b><input class="feld" data-app="${k}" value="${esc(e.appOrdner?.[k] || '')}" style="flex:1" placeholder="noch nicht gewählt"><button type="button" class="btn btn-s" data-appwahl="${k}">Wählen</button></div>`).join('')}</div>
      <div class="dialogfuss"><span class="leise status" style="flex:1"></span><button type="button" class="btn" data-testen>Verbindung testen</button><button type="button" class="btn btn-p" data-speichern>Speichern</button></div>`, { schmal: true });
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

  window.Dialoge = { exportieren, einstellungen };
})();
