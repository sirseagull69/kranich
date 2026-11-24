'use strict';
// Ori Office – Ori als Copilot: Knopf oben rechts + Seitenleiste, gleich in allen Apps.
// Quelle: gemeinsam/ori-leiste.js – wird mit gemeinsam/verteilen.sh verteilt. Nicht in den Apps ändern.
// Einbinden: OriLeiste.knopf(ort, api) setzt den Knopf in den Kopf; api = window.<APP>.ori (frage, apps, kontext, zeigen, auftrag, beiStand)
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ori = (art, g) => { const a = window.ORI || {}; const v = a[art] || a['ruhezustand-2'] || ''; return v.replace(/__G__/g, g); };
  const FARBE = { schwalbe: ['#2c5aa0', '#dbe6f7'], albatros: ['#2f8a55', '#dcf0e3'], kranich: ['#7c5cd6', '#ece6fd'], specht: ['#b23a28', '#f8e2dc'], startfenster: ['#1d2742', '#eee'] };
  const HALLO = ['Na, was bauen wir?', 'Ich hab alle Apps im Blick. Leider.', 'Sag einfach, was du brauchst. Ich verteil das.', 'Vier Vögel, ein Copilot. Rate mal, wer die Arbeit macht.', 'Bereit. Mehr oder weniger freiwillig.', 'Du denkst, ich falte.'];
  const S = { offen: false, verlauf: [], denkt: false, stand: '', api: null };
  let el = null; let knopfEl = null;

  function knopf(ort, api) {
    S.api = api;
    if (!ort || !api) return;
    ort.querySelector('.ori-knopf')?.remove();
    knopfEl = document.createElement('button');
    knopfEl.type = 'button'; knopfEl.className = 'ori-knopf'; knopfEl.title = 'Ori – dein Copilot (Strg+Leertaste)';
    knopfEl.innerHTML = `<span class="ori-knopf-vogel">${ori('ruhezustand-2', 26)}</span><span>Ori</span>`;
    knopfEl.addEventListener('click', umschalten);
    knopfEl.addEventListener('mouseenter', () => { const v = knopfEl.querySelector('.ori-knopf-vogel'); if (v && !S.offen) v.innerHTML = ori('sassy', 26); });
    knopfEl.addEventListener('mouseleave', () => { const v = knopfEl.querySelector('.ori-knopf-vogel'); if (v) v.innerHTML = ori('ruhezustand-2', 26); });
    ort.appendChild(knopfEl);
    knopfEl.classList.toggle('an', S.offen);
  }

  function umschalten() { if (S.offen) zu(); else auf(); }

  async function auf() {
    if (!S.api) return;
    S.offen = true; knopfEl?.classList.add('an');
    if (!el) {
      el = document.createElement('aside'); el.className = 'ori-leiste'; el.setAttribute('aria-label', 'Ori');
      document.body.appendChild(el);
      el.addEventListener('click', klick);
      el.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && !ev.shiftKey && ev.target.matches('.ori-eingabe textarea')) { ev.preventDefault(); senden(); }
        if (ev.key === 'Escape') zu();
      });
      S.api.beiStand?.((st) => { S.stand = st?.text || ''; const s = el?.querySelector('.ori-stand'); if (s) s.textContent = S.stand; const v = el?.querySelector('.ori-denkvogel'); if (v && st?.phase) v.innerHTML = ori(st.phase === 'baut' || st.phase === 'startet' ? 'agent-arbeitet' : st.phase === 'plant' ? 'plant' : 'denkt-nach', 34); });
    }
    zeichne(true);
    requestAnimationFrame(() => el.classList.add('offen'));
    setTimeout(() => el?.querySelector('.ori-eingabe textarea')?.focus(), 380);
    // nach der Landung in Ruhe weiteratmen
    setTimeout(() => { const v = el?.querySelector('.ori-gross'); if (v && S.offen) v.innerHTML = ori('ruhezustand-2', 104); }, 2100);
    kontextLaden();
  }

  function zu() { S.offen = false; knopfEl?.classList.remove('an'); el?.classList.remove('offen'); }

  async function kontextLaden() {
    const k = await S.api.kontext?.().catch(() => []) || [];
    const box = el?.querySelector('.ori-offen'); if (!box) return;
    box.innerHTML = k.length
      ? `<span class="ori-klein">Ich sehe</span>${k.map((x) => `<button type="button" class="ori-chip" data-zeigen="${esc(x.app)}" style="--f:${(FARBE[x.app] || FARBE.startfenster)[0]};--h:${(FARBE[x.app] || FARBE.startfenster)[1]}"><i></i>${esc(x.titel)}${x.name ? `<small>${esc(x.name)}</small>` : ''}</button>`).join('')}`
      : '<span class="ori-klein">Gerade ist sonst nichts offen.</span>';
    const vor = el?.querySelector('.ori-vorschlaege');
    if (vor && !S.verlauf.length) {
      const hat = (a) => k.some((x) => x.app === a && x.offen);
      const v = [];
      if (hat('albatros')) v.push('Schreib aus der offenen Tabelle einen kurzen Brief mit den wichtigsten Zahlen');
      if (hat('schwalbe')) v.push('Mach aus dem offenen Dokument drei Folien');
      if (hat('specht')) v.push('Was steht im IT-Tagebuch noch offen?');
      v.push('Leg mir eine Tabelle für meine Abos an', 'Schreib eine Einladung zur Weihnachtsfeier');
      vor.innerHTML = v.slice(0, 4).map((t) => `<button type="button" data-vorschlag="${esc(t)}">${esc(t)}</button>`).join('');
    }
  }

  function nachricht(n) {
    if (n.wer === 'ich') return `<div class="ori-ich">${esc(n.text)}</div>`;
    return `<div class="ori-sie${n.fehler ? ' fehler' : ''}"><span class="ori-ava">${ori(n.fehler ? 'ratlos' : n.ergebnisse?.length ? 'erledigt' : 'ruhezustand-3', 30)}</span><div>
      <p>${esc(n.text)}</p>
      ${(n.ergebnisse || []).map((e) => { const [f, h] = FARBE[e.app] || FARBE.startfenster; return `<div class="ori-karte" style="--f:${f};--h:${h}"><span class="ori-karte-app">${esc(e.titel)}</span><b>${esc(e.fehler ? 'Hat nicht geklappt' : e.name || (e.laeuft ? 'Faltet gerade …' : 'Fertig'))}</b>${e.fehler ? `<small>${esc(e.fehler)}</small>` : `<button type="button" data-zeigen="${esc(e.app)}">Öffnen →</button>`}</div>`; }).join('')}
    </div></div>`;
  }

  function zeichne(neu = false) {
    if (!el) return;
    const leer = !S.verlauf.length;
    el.innerHTML = `<header class="ori-kopf"><span class="ori-titel"><b>Ori</b><small>dein Copilot · alle Apps</small></span><button type="button" class="ori-zu" data-zu aria-label="Ori schließen">✕</button></header>
      <div class="ori-verlauf">
        ${leer ? `<div class="ori-hallo"><span class="ori-gross">${ori(neu ? 'start-landung' : 'ruhezustand-2', 104)}</span><span class="ori-hand">${esc(HALLO[Math.floor(Math.random() * HALLO.length)])}</span></div>` : ''}
        <div class="ori-offen"></div>
        ${leer ? '<div class="ori-vorschlaege"></div>' : S.verlauf.map(nachricht).join('')}
        ${S.denkt ? `<div class="ori-sie denkt"><span class="ori-ava ori-denkvogel">${ori('denkt-nach', 34)}</span><div><p class="ori-stand">${esc(S.stand || 'Ori denkt …')}</p></div></div>` : ''}
      </div>
      <div class="ori-eingabe"><textarea rows="2" placeholder="Was soll ich für dich bauen?" ${S.denkt ? 'disabled' : ''}></textarea><button type="button" data-senden ${S.denkt ? 'disabled' : ''} aria-label="Senden">↑</button></div>`;
    const v = el.querySelector('.ori-verlauf'); v.scrollTop = v.scrollHeight;
    if (!neu) kontextLaden();
  }

  async function senden(text) {
    const t = el?.querySelector('.ori-eingabe textarea');
    const wunsch = (text || t?.value || '').trim(); if (!wunsch || S.denkt) return;
    S.verlauf.push({ wer: 'ich', text: wunsch }); S.denkt = true; S.stand = 'Ori schaut, was offen ist …'; zeichne();
    const r = await S.api.auftrag(wunsch, S.verlauf.slice(0, -1).map((x) => ({ wer: x.wer, text: x.text }))).catch((f) => ({ fehler: f.message }));
    S.denkt = false;
    S.verlauf.push(r?.fehler ? { wer: 'ori', text: `Da klemmt was: ${r.fehler}`, fehler: true } : { wer: 'ori', text: r.antwort, ergebnisse: r.ergebnisse });
    zeichne();
    setTimeout(() => el?.querySelector('.ori-eingabe textarea')?.focus(), 50);
  }

  function klick(ev) {
    if (ev.target.closest('[data-zu]')) return zu();
    if (ev.target.closest('[data-senden]')) return senden();
    const v = ev.target.closest('[data-vorschlag]'); if (v) return senden(v.dataset.vorschlag);
    const z = ev.target.closest('[data-zeigen]'); if (z) S.api.zeigen?.(z.dataset.zeigen);
  }

  // Knopf automatisch in jeden Platz [data-ori-ort] setzen (auch wenn die App ihren Kopf neu zeichnet)
  function start(api) {
    S.api = api; if (!api) return;
    const setze = () => document.querySelectorAll('[data-ori-ort]').forEach((o) => { if (!o.querySelector('.ori-knopf')) knopf(o, api); });
    setze();
    new MutationObserver(setze).observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('keydown', (ev) => { if (ev.ctrlKey && ev.code === 'Space' && S.api) { ev.preventDefault(); umschalten(); } });
  window.OriLeiste = { start, knopf, auf, zu };
  // Von selbst starten: die App bringt ihre Verbindung als window.<APP>.ori mit
  const los = () => start(window.SCH?.ori || window.ALB?.ori || window.SP?.ori || window.kranich?.ori || null);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
})();
