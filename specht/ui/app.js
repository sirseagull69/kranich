'use strict';
// Specht – Oberfläche. Ein Fenster, links die Bereiche, rechts „Specht fragen“.
(() => {
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = {
    d: null, ansicht: 'uebersicht', server: null, anleitung: null, stoerung: null,
    filter: 'alle', suche: '', tagebuchFilter: 'alle', tagebuchSuche: '', anleitungSuche: '',
    helfer: true, denkt: false, klopft: false, lizenzen: null, erklaert: {}, erklaertLaeuft: null,
    gewechselt: new Set(), neu: true,
  };
  const SP = window.SP;

  // ---------- Hilfen ----------
  const ICON = {
    schloss: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    zahnrad: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    warn: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
    haken: '<path d="M5 12l5 5 9-10"/>',
    zurueck: '<path d="M15 18l-6-6 6-6"/>',
    chat: '<path d="M4 5h16v11H8l-4 4z"/>',
    zu: '<path d="M6 6l12 12M18 6L6 18"/>',
    kopie: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    wolke: '<path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 9.5 4.25 4.25 0 0 0 7 18z"/>',
  };
  const sym = (n, g = 16, f = 'currentColor') => `<svg width="${g}" height="${g}" viewBox="0 0 24 24" fill="none" stroke="${f}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;
  const specht = (g = 44, klasse = '') => `<svg class="specht ${klasse}" width="${g}" height="${g}" viewBox="0 0 64 64" role="img" aria-label="Specht">
    <circle cx="32" cy="32" r="31" fill="#f8e2dc"/>
    <rect x="47" y="8" width="5" height="50" rx="1.5" fill="#e3ddcf"/>
    <polygon points="20,50 28,26 38,22 44,40 34,52" fill="#1d2742"/><polygon points="28,26 38,22 34,34" fill="#2c3a5e"/><polygon points="34,34 38,22 44,40" fill="#3a4a72"/>
    <polygon points="36,36 44,40 40,46" fill="#fffdf9"/><polygon points="20,50 14,58 24,54" fill="#1d2742"/>
    <g class="kopf-teil"><polygon points="30,18 40,14 42,24 34,26" fill="#fffdf9"/><polygon points="30,18 36,11 42,15 40,14" fill="#b23a28"/><polygon points="36,11 44,12 42,17" fill="#8f2a1c"/><polygon points="42,19 50,21 42,23" fill="#e8b04a"/><circle cx="38" cy="19" r="1.6" fill="#1d2742"/></g>
  </svg>`;
  const wann = (iso) => {
    if (!iso) return '';
    const t = new Date(iso); const d = (Date.now() - t.getTime()) / 1000;
    if (d < 60) return 'gerade eben'; if (d < 3600) return `vor ${Math.round(d / 60)} Min.`; if (d < 86400) return `vor ${Math.round(d / 3600)} Std.`;
    return t.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: d > 300 * 86400 ? 'numeric' : undefined });
  };
  const datum = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? `${m[3]}.${m[2]}.` : esc(s); };
  const eintraege = (art) => (S.d?.eintraege || []).filter((e) => e.art === art);
  const LEER = { STAND: '', SERVER: [], NETZ: [], BACKUP: { stand: '', ziele: [] } };
  const wissenAus = (liste) => { const g = (liste || []).find((e) => e.id === 'wissen-grund'); return g && Array.isArray(g.SERVER) ? { ...LEER, ...g, BACKUP: g.BACKUP || LEER.BACKUP } : LEER; };
  const keinWissen = () => !S.d.wissen.SERVER.length;
  const wissenLeer = (was) => `<section class="karte leerstand">${specht(64)}<b>Noch kein Wissen geladen</b><p>${esc(was)} Lade einmal deine Wissens-Datei – danach liegt sie nur in deinem Konto und kommt per Sync auf jedes Gerät.</p><button type="button" class="btn haupt" data-a="wissen-laden">Wissens-Datei laden</button></section>`;
  const gewolltAus = () => new Set(eintraege('gewollt_aus').map((g) => g.ziel));
  const alleZiele = () => [...S.d.wissen.SERVER, ...S.d.wissen.NETZ];
  const zielVon = (id) => alleZiele().find((z) => z.id === id);
  const zustandVon = (id) => {
    const z = S.d.zustand?.[id];
    if (gewolltAus().has(id)) return 'gewollt';
    if (!z) return 'unbekannt';
    return z.an ? 'an' : 'aus';
  };
  const punkt = (id) => `<span class="punkt ${zustandVon(id) === 'unbekannt' ? '' : zustandVon(id)} ${S.gewechselt.has(id) ? 'wechsel' : ''}" aria-hidden="true"></span>`;
  const wer = (e) => (e._geraet ? `${esc(e._geraet.replace(/ \(.*\)$/, ''))} · ${esc(wann(e._zeit))}` : 'Startwissen');

  function meldung(text, { fehler = false, knopf, aktion, dauer = 3600 } = {}) {
    document.querySelector('.toast')?.remove();
    const m = document.createElement('div'); m.className = `toast${fehler ? ' fehler' : ''}`; m.setAttribute('role', 'status');
    m.innerHTML = `<span>${esc(text)}</span>${knopf ? `<button type="button">${esc(knopf)}</button>` : ''}`;
    if (knopf) m.querySelector('button').onclick = () => { aktion(); m.remove(); };
    document.body.appendChild(m); setTimeout(() => m.remove(), dauer);
  }
  async function kopiere(text) {
    try { await navigator.clipboard.writeText(text); meldung('Kopiert.'); } catch { meldung('Kopieren ging nicht.', { fehler: true }); }
  }
  function frageFenster({ titel, text = '', ja = 'OK', nein = 'Abbrechen', gefahr = false }) {
    return new Promise((fertig) => {
      const s = document.createElement('div'); s.className = 'schleier';
      s.innerHTML = `<div class="fenster karte" role="alertdialog" aria-modal="true" aria-label="${esc(titel)}" style="width:min(440px,94vw)"><h2>${esc(titel)}</h2>${text ? `<p class="unter">${esc(text)}</p>` : ''}<div class="knoepfe"><button type="button" class="btn" data-nein>${esc(nein)}</button><button type="button" class="btn haupt" data-ja ${gefahr ? 'style="background:#b23a28"' : ''}>${esc(ja)}</button></div></div>`;
      const zu = (w) => { document.removeEventListener('keydown', taste, true); s.remove(); fertig(w); };
      const taste = (e) => { if (e.key === 'Escape') { e.preventDefault(); zu(false); } };
      s.addEventListener('click', (e) => { if (e.target === s || e.target.closest('[data-nein]')) zu(false); else if (e.target.closest('[data-ja]')) zu(true); });
      document.addEventListener('keydown', taste, true);
      document.body.appendChild(s); s.querySelector('[data-ja]').focus();
    });
  }
  function vogelMacht(art) {
    const v = app.querySelector('.kopf .specht'); if (!v) return;
    v.classList.remove('klopft', 'nickt', 'schief', 'schuettelt'); void v.getBoundingClientRect(); v.classList.add(art);
  }

  // ---------- Kopf, Leiste, Helfer ----------
  function kopf() {
    const s = S.d.sync;
    const punktArt = { synchron: 'an', laeuft: 'dreht', offline: 'gewollt', problem: 'aus', konflikt: 'aus', aus: '' }[s.art] || '';
    return `<header class="kopf">${specht(44, S.klopft ? 'klopft' : '')}
      <div class="name"><b>Specht</b><span>IT-Helfer · ${S.klopft ? 'klopft gerade ab …' : S.d.letzterKlopf ? `zuletzt abgeklopft ${esc(wann(S.d.letzterKlopf))}` : 'noch nicht abgeklopft'}</span></div>
      <div class="platz"></div>
      <button type="button" class="pille" data-a="sync-klick" title="${esc(s.detail || '')}"><span class="punkt ${punktArt}"></span>${esc(s.text)}</button>
      <span class="pille leise">${sym('schloss', 14)} Nur lesen – Specht ändert nichts</span>
      <button type="button" class="rundknopf" data-a="helfer" aria-label="Specht fragen ein- oder ausblenden" aria-pressed="${S.helfer}">${sym('chat', 18)}</button>
      <button type="button" class="rundknopf" data-a="ansicht" data-z="einstellungen" aria-label="Einstellungen">${sym('zahnrad', 18)}</button>
    </header>`;
  }
  const BEREICHE = [['uebersicht', 'Übersicht'], ['server', 'Server'], ['netz', 'Netz & Switches'], ['backup', 'Backup'], ['lizenzen', 'Lizenzen'], ['freigaben', 'Freigaben'], ['anleitungen', 'Anleitungen'], ['stoerungen', 'Störungen']];
  function nav() {
    const rot = S.d.wissen.SERVER.filter((s) => zustandVon(s.id) === 'aus').length;
    const offen = eintraege('stoerung').filter((s) => s.status === 'offen').length;
    const zahl = { server: rot, stoerungen: offen };
    const aktiv = { anleitung: 'anleitungen' }[S.ansicht] || S.ansicht;
    return `<nav class="nav karte" aria-label="Bereiche"><span class="titel">Specht weiß</span>
      ${BEREICHE.map(([k, t]) => `<button type="button" data-a="ansicht" data-z="${k}" ${aktiv === k ? 'aria-current="page"' : ''}><span class="punkt"></span>${esc(t)}${zahl[k] ? `<span class="zahl">${zahl[k]}</span>` : ''}</button>`).join('')}
      <div class="fuss">Dieses Gerät<br><b>${esc(S.d.geraet.replace(/ \(.*\)$/, ''))}</b></div></nav>`;
  }
  function helfer() {
    const verlauf = chatVerlauf();
    const leer = !verlauf.length;
    return `<aside class="helfer karte" aria-label="Specht fragen">
      <div class="kopfzeile"><b>Specht fragen</b>${verlauf.length ? '<button type="button" class="btn klein" data-a="chat-neu">Neu</button>' : ''}</div>
      <div class="gespraech" aria-live="polite">
        ${leer ? `<div class="er">Frag mich etwas über eure IT – zum Beispiel, wo etwas läuft, woran es hängt oder was bei einer Störung zu tun ist. Ich ändere nichts, ich zeige dir nur, was du tun kannst.</div>
          <div class="vorschlaege">${(S.d.wissen.VORSCHLAEGE?.length ? S.d.wissen.VORSCHLAEGE : ['Welche Server sind gerade still?', 'Was steht offen im Tagebuch?', 'Ein Drucker druckt nicht – was prüfe ich?']).map((t) => `<button type="button" data-a="vorschlag" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
        ${verlauf.map(nachricht).join('')}
        ${S.denkt ? '<div class="er"><span class="denkt" aria-label="Specht denkt nach"><i></i><i></i><i></i></span></div>' : ''}
      </div>
      <div class="frage"><label for="frage" class="leise" style="font:600 12px var(--g)">Deine Frage</label>
        <textarea id="frage" rows="2" placeholder="Was ist los? z. B. „Der Fileserver antwortet nicht“"></textarea>
        <div style="display:flex;justify-content:flex-end"><button type="button" class="btn haupt" data-a="fragen" ${S.denkt ? 'disabled' : ''}>Fragen</button></div></div>
    </aside>`;
  }
  function nachricht(m) {
    if (m.wer === 'ich') return `<div class="ich">${esc(m.text)}</div>`;
    const st = (m.aehnlich || []).map((id) => eintraege('stoerung').find((s) => s.id === id)).filter(Boolean);
    const an = m.anleitung ? eintraege('anleitung').find((a) => a.id === m.anleitung) : null;
    return `<div class="er ${m.fehler ? 'fehler' : ''}">${esc(m.text)}</div>
      ${(m.befehle || []).map(befehlBox).join('')}
      ${st.length || an ? `<div class="vorschlaege">${st.map((s) => `<button type="button" data-a="stoerung-oeffnen" data-id="${esc(s.id)}">${datum(s.datum)} · ${esc(s.was.slice(0, 40))}</button>`).join('')}${an ? `<button type="button" data-a="anleitung-oeffnen" data-id="${esc(an.id)}">Anleitung: ${esc(an.titel)}</button>` : ''}</div>` : ''}`;
  }
  const befehlBox = (b) => `<div class="befehl"><div class="oben"><span>${esc(b.zweck || 'Befehl')} – du führst ihn aus</span><button type="button" data-a="kopieren" data-t="${esc(b.befehl)}">Kopieren</button></div><code>${esc(b.befehl)}</code></div>`;
  const CHAT_ID = 'chat-verlauf';
  const chatVerlauf = () => (S.d.eintraege.find((e) => e.id === CHAT_ID)?.verlauf || []);

  // ---------- Bereiche ----------
  function uebersicht() {
    const server = S.d.wissen.SERVER;
    if (keinWissen()) return `<section class="titelkarte karte"><div class="symbolkachel still">${specht(40)}</div><div class="platz"><h1>Hallo! Ich weiß noch nichts über eure IT.</h1><p>Sobald das Wissen geladen ist, klopfe ich alle Server ab.</p></div></section>${wissenLeer('Specht kommt ohne Firmendaten – die App liegt öffentlich zum Download.')}`;
    if (!S.d.letzterKlopf) {
      return `<section class="titelkarte karte"><div class="symbolkachel still">${specht(40, 'klopft')}</div><div class="platz"><h1>Specht klopft gerade ab …</h1><p>Ich frage alle Server und Switches einmal, ob sie antworten.</p></div></section>
        <section class="feldkarte karte"><div class="serverraster">${server.map(() => '<div class="kachel platzhalter-block" style="height:52px"></div>').join('')}</div></section>`;
    }
    const aus = server.filter((s) => zustandVon(s.id) === 'aus');
    const netzAus = S.d.wissen.NETZ.filter((n) => zustandVon(n.id) === 'aus');
    const voll = S.d.wissen.BACKUP.ziele.filter((b) => b.voll >= 95);
    const ansehen = aus.length + netzAus.length + voll.length;
    const alleWeg = server.every((s) => zustandVon(s.id) !== 'an');
    const satz = alleWeg ? 'Ich erreiche gerade keinen Server' : !ansehen ? 'Alles läuft' : `Fast alles läuft – ${ansehen === 1 ? 'eine Sache solltest' : `${ansehen} Sachen solltest`} du dir ansehen`;
    const unter = alleWeg ? 'Bist du im Firmennetz oder per VPN verbunden? Von außen kann ich nicht abklopfen.' : `${server.filter((s) => zustandVon(s.id) === 'an').length} Server antworten${aus.length ? `, ${aus.length} nicht` : ''}.${voll.length ? ` ${voll.length === 1 ? 'Ein Backup-Ziel ist' : `${voll.length} Backup-Ziele sind`} voll.` : ''}`;
    const karten = [];
    if (aus.length) karten.push(`<article class="ansehen-karte karte"><span class="ober">Ansehen</span><b>${aus.length === 1 ? `${esc(aus[0].name)} antwortet nicht` : `${aus.length} Server antworten nicht`}</b><p>${aus.map((s) => `${esc(s.name)} (${esc(s.rolle)})`).join(', ')}. Vielleicht gewollt aus – kurz prüfen.</p><div class="vorschlaege">${aus.slice(0, 4).map((s) => `<button type="button" data-a="server-oeffnen" data-id="${s.id}">${esc(s.name)} ansehen</button>`).join('')}${aus.length === 1 ? `<button type="button" data-a="gewollt" data-id="${aus[0].id}">Als „gewollt aus“ markieren</button>` : ''}</div></article>`);
    if (netzAus.length) karten.push(`<article class="ansehen-karte karte"><span class="ober">Ansehen</span><b>${netzAus.length} im Netz antworten nicht</b><p>${netzAus.map((n) => esc(n.name)).join(', ')}.</p><div><button type="button" class="btn klein" data-a="ansicht" data-z="netz">Netz ansehen</button></div></article>`);
    for (const b of voll) karten.push(`<article class="ansehen-karte karte"><span class="ober">Ansehen</span><b>${esc(b.name)} ist voll</b><p>${esc(b.frei)} frei von ${esc(b.gesamt)} – Veeam kann dorthin nichts mehr sichern. (${esc(S.d.wissen.BACKUP.stand)})</p><div class="balken"><i class="rot" style="width:100%"></i></div><div><button type="button" class="btn klein" data-a="ansicht" data-z="backup">Was kann ich tun?</button></div></article>`);
    const offen = eintraege('stoerung').filter((s) => s.status === 'offen');
    return `<section class="titelkarte karte"><div class="symbolkachel ${alleWeg || ansehen ? 'ansehen' : 'gut'}">${sym(alleWeg || ansehen ? 'warn' : 'haken', 28)}</div><div class="platz"><h1>${esc(satz)}</h1><p>${esc(unter)}</p></div><button type="button" class="btn haupt" data-a="klopfen" ${S.klopft ? 'disabled' : ''}>${S.klopft ? 'Klopft …' : 'Jetzt abklopfen'}</button></section>
      ${karten.length ? `<div class="raster2">${karten.join('')}</div>` : ''}
      <section class="feldkarte karte"><h2 class="k2">Server <small>grün = antwortet · grau = gewollt aus</small></h2>
        <div class="serverraster">${server.map((s) => { const z = zustandVon(s.id); return `<button type="button" class="kachel ${z === 'aus' ? 'rot' : z === 'gewollt' ? 'grau' : ''}" data-a="server-oeffnen" data-id="${s.id}"><b>${punkt(s.id)}${esc(s.name)}</b><span>${esc(z === 'aus' ? `${s.rolle} · still` : s.rolle)}</span></button>`; }).join('')}</div></section>
      ${offen.length ? `<section class="feldkarte karte"><h2 class="k2">Offene Störungen</h2>${offen.map((s) => `<div class="zeile"><span class="chip">offen</span><b class="h" style="font-size:14.5px">${datum(s.datum)} · ${esc(s.was)}</b><div class="platz"></div><button type="button" class="btn klein" data-a="stoerung-oeffnen" data-id="${esc(s.id)}">Öffnen</button></div>`).join('')}</section>` : ''}`;
  }

  function serverAnsicht() {
    if (keinWissen()) return wissenLeer('Hier stehen dann alle Server mit Rolle, IP und was darauf läuft.');
    const ga = gewolltAus();
    const q = S.suche.toLowerCase();
    const liste = S.d.wissen.SERVER.filter((s) => (S.filter === 'alle' || (S.filter === 'ansehen' && zustandVon(s.id) === 'aus') || (S.filter === 'gewollt' && ga.has(s.id)))
      && (!q || `${s.name} ${s.rolle} ${s.ip} ${s.laeuft.join(' ')}`.toLowerCase().includes(q)));
    const s = S.d.wissen.SERVER.find((x) => x.id === S.server) || liste[0] || S.d.wissen.SERVER[0];
    S.server = s.id;
    const z = S.d.zustand?.[s.id];
    const notizen = eintraege('notiz').filter((n) => n.ziel === s.id).sort((a, b) => String(b._zeit).localeCompare(String(a._zeit)));
    const st = eintraege('stoerung').filter((x) => (x.server || []).includes(s.id)).sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
    const zs = zustandVon(s.id);
    return `<div class="liste-detail">
      <section class="serverliste karte" aria-label="Server-Liste">
        <label for="suche-server" class="versteckt">Server suchen</label>
        <input id="suche-server" class="suchfeld" type="search" placeholder="Suchen: Name, Rolle, IP …" value="${esc(S.suche)}" data-feld="suche">
        <div class="filter">${[['alle', 'Alle'], ['ansehen', 'Ansehen'], ['gewollt', 'Gewollt aus']].map(([k, t]) => `<button type="button" class="chip grau" data-a="filter" data-z="${k}" aria-pressed="${S.filter === k}">${t}</button>`).join('')}</div>
        ${liste.length ? liste.map((x) => `<button type="button" class="eintrag" data-a="server-oeffnen" data-id="${x.id}" aria-current="${x.id === s.id}">${punkt(x.id)}<span style="min-width:0"><b>${esc(x.name)}</b><span>${esc(x.rolle)} · ${esc(x.ip)}</span></span></button>`).join('') : '<p class="leise" style="padding:10px">Nichts gefunden.</p>'}
      </section>
      <div style="display:flex;flex-direction:column;gap:16px;min-height:0;overflow:auto">
        <section class="titelkarte karte"><div class="platz"><h1 style="white-space:nowrap">${esc(s.name)} <span class="leise" style="font-weight:700">· ${esc(s.rolle)}</span></h1><p>${esc(s.ip)} · ${zs === 'an' ? `antwortet${z?.ms != null ? ` (${z.ms} ms)` : ''}` : zs === 'aus' ? 'antwortet gerade nicht' : zs === 'gewollt' ? 'gewollt aus' : 'noch nicht abgeklopft'}</p></div>
          <button type="button" class="btn" data-a="rdp" data-ip="${esc(s.ip)}">RDP öffnen</button><button type="button" class="btn" data-a="kopieren" data-t="${esc(s.name)}">Name kopieren</button><button type="button" class="btn" data-a="gewollt" data-id="${s.id}">${ga.has(s.id) ? 'Nicht mehr „gewollt aus“' : 'Gewollt aus'}</button></section>
        <div class="raster-12">
          <section class="feldkarte karte"><h2 class="k2">Was läuft drauf</h2>${s.laeuft.length ? s.laeuft.map((l) => `<div class="zeile"><span class="punkt an"></span><span>${esc(l)}</span></div>`).join('') : '<p class="leise">Nichts eingetragen.</p>'}
            ${s.haengt ? `<h2 class="k2" style="margin-top:14px">Woran hängt es</h2>${s.haengt.map((h) => `<div class="zeile"><span class="punkt hinweis"></span><span>${esc(h)}</span></div>`).join('')}` : ''}
            ${s.hinweis ? `<div class="hinweisbox" style="margin-top:12px">${esc(s.hinweis)}</div>` : ''}</section>
          <section class="feldkarte karte"><h2 class="k2">Notizen <small>alle Geräte sehen das</small></h2>
            <div style="display:flex;flex-direction:column;gap:10px">${notizen.map((n) => `<div class="notiz"><p>${esc(n.text)}</p><span class="wer">${wer(n)}</span> <button type="button" class="btn text klein" data-a="notiz-weg" data-id="${esc(n.id)}">Löschen</button></div>`).join('')}
              <label for="neue-notiz" class="versteckt">Neue Notiz</label><textarea id="neue-notiz" class="suchfeld" style="min-height:70px;padding:10px 12px" placeholder="Notiz zu ${esc(s.name)} … (keine Passwörter)"></textarea>
              <div><button type="button" class="btn" data-a="notiz-dazu" data-id="${s.id}">${sym('plus', 14)} Notiz speichern</button></div></div></section>
        </div>
        <section class="feldkarte karte"><h2 class="k2">Frühere Störungen</h2>${st.length ? st.map((x) => `<div class="zeile"><span class="chip ${x.status === 'erledigt' ? 'gut' : ''}">${esc(x.status)}</span><b class="h" style="font-size:14.5px">${datum(x.datum)} · ${esc(x.was)}</b><div class="platz"></div><button type="button" class="btn klein" data-a="stoerung-oeffnen" data-id="${esc(x.id)}">Öffnen</button></div>`).join('') : '<p class="leise" style="margin:0">Keine bekannt.</p>'}</section>
      </div></div>`;
  }

  function netzAnsicht() {
    if (keinWissen()) return wissenLeer('Hier steht dann der Netzplan mit allen Switches.');
    const gruppen = ['Rand', 'Kern', 'Hosts', 'Etagen', 'Nebengebäude'];
    const punkte = eintraege('netzpunkt').sort((a, b) => Number(a.erledigt) - Number(b.erledigt));
    return `<section class="titelkarte karte"><div class="platz"><h1>Netz & Switches</h1><p>Vereinfacht nach dem Netzplan (Stand 06/2026). Punkt = antwortet auf Ping.</p></div><button type="button" class="btn haupt" data-a="klopfen" ${S.klopft ? 'disabled' : ''}>Jetzt abklopfen</button></section>
      <section class="feldkarte karte"><div class="netzkarte">${gruppen.map((g) => `<div class="netzgruppe"><h3>${esc(g)}</h3>${S.d.wissen.NETZ.filter((n) => n.gruppe === g).map((n) => `<div class="netzknoten">${punkt(n.id)}${esc(n.name)}<small>${esc(n.ip)}</small></div>`).join('')}</div>`).join('')}</div></section>
      <section class="feldkarte karte"><h2 class="k2">Offene Punkte aus dem Netzplan <small>abhaken – synchronisiert</small></h2>
        ${punkte.map((p) => `<label class="abhaken ${p.erledigt ? 'erledigt' : ''}"><input type="checkbox" data-a="netzpunkt" data-id="${esc(p.id)}" ${p.erledigt ? 'checked' : ''}><span>${esc(p.text)}<br><span class="wer">${p.erledigt ? `erledigt · ${wer(p)}` : ''}</span></span></label>`).join('')}
        <div style="display:flex;gap:8px;margin-top:12px"><label for="neuer-punkt" class="versteckt">Neuer Punkt</label><input id="neuer-punkt" class="suchfeld" placeholder="Neuer Punkt …"><button type="button" class="btn" data-a="netzpunkt-dazu">Dazu</button></div></section>`;
  }

  function backupAnsicht() {
    const B = S.d.wissen.BACKUP;
    if (!B.ziele.length) return keinWissen() ? wissenLeer('Hier stehen dann die Backup-Ziele mit Füllstand.') : `<section class="karte leerstand"><b>Keine Backup-Ziele bekannt</b><p>Sobald Veeam oder PRTG verbunden ist, stehen sie hier.</p></section>`;
    const voll = B.ziele.filter((b) => b.voll >= 95);
    return `<section class="titelkarte karte"><div class="symbolkachel ${voll.length ? 'ansehen' : 'gut'}">${sym(voll.length ? 'warn' : 'haken', 28)}</div><div class="platz"><h1>${voll.length ? 'Backup – ein Ziel ist voll' : 'Backup sieht gut aus'}</h1><p>${esc(B.stand)}</p></div></section>
      <div class="raster-12">
        <section class="feldkarte karte"><h2 class="k2">Speicherziele <small>Füllstand</small></h2>
          ${B.ziele.map((b) => `<div style="display:flex;flex-direction:column;gap:8px;padding:12px 0;border-bottom:1px solid var(--rand)"><div style="display:flex;align-items:baseline;gap:10px"><b class="h">${esc(b.name)}</b><div class="platz"></div><b class="h" style="font-size:14px;${b.voll >= 95 ? 'color:var(--dunkel)' : ''}">${esc(b.frei)} frei</b><span class="leise" style="font-size:13.5px">von ${esc(b.gesamt)}</span></div><div class="balken" role="img" aria-label="${b.voll} Prozent belegt"><i class="${b.voll >= 95 ? 'rot' : b.voll > 80 ? 'gelb' : ''}" style="width:${b.voll}%"></i></div></div>`).join('')}</section>
        <div style="display:flex;flex-direction:column;gap:16px">
          ${voll.length ? `<section class="ansehen-karte karte"><span class="ober">Was tun?</span><p style="color:var(--tinte);font-size:15px">Auf ${voll.map((b) => esc(b.name)).join(', ')} passt nichts mehr – Jobs, die dorthin sichern, schlagen fehl. Alte Wiederherstellungspunkte prüfen oder den Job auf ein anderes Ziel legen.</p><div><button type="button" class="btn klein" data-a="vorschlag" data-t="${esc(voll[0].name)} ist voll – wie gehe ich vor?">Specht fragen</button></div></section>` : ''}
          <section class="feldkarte karte"><h2 class="k2">Echte Werte</h2><p class="leise" style="margin:0 0 10px">Die Zahlen hier sind von Hand eingetragen. Live-Werte kommen, sobald Veeam oder PRTG verbunden ist.</p><button type="button" class="btn" data-a="ansicht" data-z="einstellungen">Verbinden …</button></section>
        </div></div>`;
  }

  function lizenzenAnsicht() {
    const L = S.lizenzen;
    if (!L) { ladeLizenzen(); return `<section class="titelkarte karte"><div class="platz"><h1>Lizenzen</h1><p>Lade …</p></div></section><section class="feldkarte karte">${'<div class="platzhalter-block" style="height:44px;margin-bottom:8px"></div>'.repeat(6)}</section>`; }
    if (L.fehler) return `<section class="titelkarte karte"><div class="platz"><h1>Lizenzen</h1><p>Das Lizenz-Tool antwortet gerade nicht.</p></div></section><section class="karte leerstand"><b>Konnte nicht laden</b><p>${esc(L.fehler.nachricht)}</p><button type="button" class="btn" data-a="lizenzen-neu">Nochmal</button></section>`;
    if (!L.verbunden) return `<section class="titelkarte karte"><div class="platz"><h1>Lizenzen</h1><p>Nur ansehen – aus deinem Lizenz-Tool.</p></div></section><section class="karte leerstand">${specht(64)}<b>Lizenz-Tool noch nicht verbunden</b><p>Trag in den Einstellungen die Adresse und den Schlüssel deines Lizenz-Tools (LIZENZEN.html) ein. Specht liest dann nur – Lizenzschlüssel zeigt er nie an.</p><button type="button" class="btn haupt" data-a="ansicht" data-z="einstellungen">Zu den Einstellungen</button></section>`;
    const q = (S.lizenzSuche || '').toLowerCase();
    const feld = (l, ...k) => { for (const x of k) if (l[x] != null && l[x] !== '') return l[x]; return ''; };
    const liste = L.liste.filter((l) => !q || JSON.stringify(l).toLowerCase().includes(q));
    return `<section class="titelkarte karte"><div class="platz"><h1>Lizenzen</h1><p>${L.liste.length} Einträge · nur ansehen</p></div><label for="liz-suche" class="versteckt">Suchen</label><input id="liz-suche" class="suchfeld" style="width:280px" type="search" placeholder="Suchen …" value="${esc(S.lizenzSuche || '')}" data-feld="lizenzSuche"></section>
      <section class="feldkarte karte">${liste.map((l) => {
        const name = feld(l, 'name', 'produkt', 'software', 'titel'); const gekauft = Number(feld(l, 'anzahl', 'lizenzen_anzahl', 'gekauft')) || 0; const genutzt = Number(feld(l, 'lizenzen_genutzt', 'genutzt')) || 0;
        const ueber = gekauft && genutzt > gekauft; const bis = feld(l, 'kuendbar_bis', 'ablauf', 'laufzeit_bis', 'ende');
        return `<div class="zeile"><span class="punkt ${ueber ? 'aus' : 'an'}"></span><b class="h" style="font-size:14.5px">${esc(name || 'Ohne Namen')}</b><span class="leise" style="font-size:13.5px">${esc(feld(l, 'hersteller', 'anbieter'))}</span><div class="platz"></div>${gekauft ? `<span class="chip ${ueber ? '' : 'grau'}">${genutzt} / ${gekauft} genutzt</span>` : ''}${bis ? `<span class="chip hinweis">kündbar bis ${esc(bis)}</span>` : ''}</div>`;
      }).join('') || '<p class="leise">Nichts gefunden.</p>'}</section>`;
  }
  async function ladeLizenzen() {
    if (S.lizenzenLaedt) return; S.lizenzenLaedt = true;
    const r = await SP.lizenzen(); S.lizenzenLaedt = false;
    S.lizenzen = r?.fehler ? { fehler: r.fehler } : r;
    if (S.ansicht === 'lizenzen') zeichne(false);
  }

  function freigabenAnsicht() {
    const liste = eintraege('freigabe').sort((a, b) => String(a.pfad).localeCompare(String(b.pfad)));
    const offen = (f) => /jeder|everyone|authentifizierte|domänen-benutzer|domain users/i.test(f.rechte || '');
    const form = `<section class="feldkarte karte"><h2 class="k2">Freigabe eintragen <small>synchronisiert</small></h2>
      <div style="display:grid;grid-template-columns:1.2fr 1fr 1.4fr auto;gap:8px;align-items:end">
        <div class="feld" style="margin:0"><label for="fg-pfad">Pfad</label><input id="fg-pfad" placeholder="\\\\Server\\Freigabe"></div>
        <div class="feld" style="margin:0"><label for="fg-wer">Wer darf</label><input id="fg-wer" placeholder="z. B. Jeder, GG-Vertrieb"></div>
        <div class="feld" style="margin:0"><label for="fg-recht">Rechte</label><input id="fg-recht" placeholder="z. B. Jeder: Vollzugriff"></div>
        <button type="button" class="btn haupt" data-a="freigabe-dazu">Eintragen</button></div></section>`;
    if (!liste.length) return `<section class="titelkarte karte"><div class="platz"><h1>Freigaben</h1><p>Netzwerk-Freigaben mit ihren Rechten. Zu offene werden rot markiert.</p></div></section><section class="karte leerstand">${specht(64)}<b>Noch keine Freigaben eingetragen</b><p>Trag die Freigaben ein, Specht markiert dann zu offene Rechte wie „Jeder“ und sagt warum.</p></section>${form}`;
    return `<section class="titelkarte karte"><div class="platz"><h1>Freigaben</h1><p>${liste.length} eingetragen · ${liste.filter(offen).length} zu offen</p></div></section>
      <section class="feldkarte karte">${liste.map((f) => `<div class="zeile" style="align-items:flex-start;padding:10px 0"><span class="punkt ${offen(f) ? 'aus' : 'an'}" style="margin-top:7px"></span><div style="min-width:0"><b class="h" style="font-size:14.5px;font-family:var(--mono)">${esc(f.pfad)}</b><div class="leise" style="font-size:13.5px">${esc(f.wer)} · ${esc(f.rechte)}</div>${offen(f) ? '<div style="font-size:13.5px;color:var(--dunkel)">Zu offen: Hier kommt jeder im Netz ran – auch ein verseuchter Rechner. Besser nur die Gruppe, die es braucht.</div>' : ''}<span class="wer">${wer(f)}</span></div><div class="platz"></div><button type="button" class="btn text klein" data-a="eintrag-weg" data-id="${esc(f.id)}">Löschen</button></div>`).join('')}</section>${form}`;
  }

  function anleitungenAnsicht() {
    const q = S.anleitungSuche.toLowerCase();
    const liste = eintraege('anleitung').filter((a) => !q || `${a.titel} ${a.untertitel} ${(a.schritte || []).join(' ')}`.toLowerCase().includes(q));
    return `<section class="titelkarte karte"><div class="platz"><h1>Anleitungen</h1><p>Specht erklärt jeden Schritt, wenn du willst.</p></div><label for="an-suche" class="versteckt">Suchen</label><input id="an-suche" class="suchfeld" style="width:280px" type="search" placeholder="Über alles suchen …" value="${esc(S.anleitungSuche)}" data-feld="anleitungSuche"><button type="button" class="btn haupt" data-a="anleitung-neu">${sym('plus', 15)} Neue Anleitung</button></section>
      ${liste.length ? `<div class="kacheln">${liste.map((a) => `<button type="button" class="anleitungskachel karte" data-a="anleitung-oeffnen" data-id="${esc(a.id)}"><b>${esc(a.titel)}</b><span>${esc(a.untertitel || '')}</span><div class="platz"></div><span class="wer">${(a.schritte || []).length} Schritte · ${wer(a)}</span></button>`).join('')}</div>` : `<section class="karte leerstand"><b>Nichts gefunden</b><p>Andere Wörter probieren oder eine neue Anleitung anlegen.</p></section>`}`;
  }

  function anleitungAnsicht() {
    const a = eintraege('anleitung').find((x) => x.id === S.anleitung);
    if (!a) { S.ansicht = 'anleitungen'; return anleitungenAnsicht(); }
    if (S.bearbeite === a.id) {
      return `<section class="titelkarte karte"><button type="button" class="rundknopf" data-a="anleitung-abbrechen" aria-label="Abbrechen">${sym('zurueck', 18)}</button><div class="platz"><h1>Anleitung bearbeiten</h1><p>Ein Schritt pro Zeile. Keine Passwörter.</p></div></section>
        <section class="feldkarte karte"><div class="feld"><label for="an-titel">Titel</label><input id="an-titel" value="${esc(a.titel)}"></div><div class="feld"><label for="an-unter">Worum geht's</label><input id="an-unter" value="${esc(a.untertitel || '')}"></div><div class="feld"><label for="an-schritte">Schritte</label><textarea id="an-schritte" style="min-height:240px">${esc((a.schritte || []).join('\n'))}</textarea></div>
        <div class="knoepfe" style="justify-content:space-between"><button type="button" class="btn text" data-a="anleitung-weg" data-id="${esc(a.id)}">Anleitung löschen</button><span><button type="button" class="btn" data-a="anleitung-abbrechen">Abbrechen</button> <button type="button" class="btn haupt" data-a="anleitung-speichern" data-id="${esc(a.id)}">Speichern</button></span></div></section>`;
    }
    return `<section class="titelkarte karte"><button type="button" class="rundknopf" data-a="ansicht" data-z="anleitungen" aria-label="Zurück zu Anleitungen">${sym('zurueck', 18)}</button><div class="platz"><h1>${esc(a.titel)}</h1><p>${esc(a.untertitel || '')} · ${wer(a)}</p></div><button type="button" class="btn" data-a="anleitung-bearbeiten" data-id="${esc(a.id)}">Bearbeiten</button></section>
      <section class="feldkarte karte">${(a.schritte || []).map((t, i) => { const k = `${a.id}:${i}`; return `<div class="schritt"><span class="nr">${i + 1}</span><p>${esc(t)}</p><button type="button" class="btn klein" data-a="schritt-erklaeren" data-id="${esc(a.id)}" data-i="${i}" ${S.erklaertLaeuft === k ? 'disabled' : ''}>${S.erklaertLaeuft === k ? 'Specht denkt …' : 'Erklär mir das'}</button>${S.erklaert[k] ? `<div class="erklaerung">${esc(S.erklaert[k])}</div>` : ''}</div>`; }).join('')}</section>`;
  }

  function stoerungenAnsicht() {
    const q = S.tagebuchSuche.toLowerCase();
    const alle = eintraege('stoerung').sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
    const liste = alle.filter((s) => (S.tagebuchFilter === 'alle' || s.status === S.tagebuchFilter) && (!q || `${s.was} ${s.ursache} ${s.loesung}`.toLowerCase().includes(q)));
    const offen = S.stoerung ? alle.find((s) => s.id === S.stoerung) : null;
    return `<section class="titelkarte karte"><div class="platz"><h1>Störungen</h1><p>Beschreib rechts bei „Specht fragen“, was los ist – ich suche ähnliche Fälle und sage dir, was du prüfen kannst.</p></div><button type="button" class="btn haupt" data-a="stoerung-neu">${sym('plus', 15)} Störung eintragen</button></section>
      ${offen ? stoerungDetail(offen) : ''}
      <section class="feldkarte karte"><h2 class="k2">Störungs-Tagebuch <small>jeder Fall mit Ursache und Lösung</small></h2>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap"><div class="filter">${[['alle', 'Alle'], ['offen', 'Offen'], ['erledigt', 'Erledigt']].map(([k, t]) => `<button type="button" class="chip grau" data-a="tagebuch-filter" data-z="${k}" aria-pressed="${S.tagebuchFilter === k}">${t}</button>`).join('')}</div><div class="platz"></div><label for="tb-suche" class="versteckt">Suchen</label><input id="tb-suche" class="suchfeld" style="width:300px" type="search" placeholder="Suchen, z. B. Drucker, GPO, ProCall" value="${esc(S.tagebuchSuche)}" data-feld="tagebuchSuche"></div>
        ${liste.map((s) => `<button type="button" class="tagebuch-eintrag" data-a="stoerung-oeffnen" data-id="${esc(s.id)}"><span class="datum">${datum(s.datum)}</span><span style="min-width:0"><b>${esc(s.was)}</b><span class="leise" style="font-size:14px">${esc(s.ursache || '')}</span><br><span class="wer">${wer(s)}</span></span><span class="chip ${s.status === 'erledigt' ? 'gut' : ''}">${esc(s.status)}</span></button>`).join('') || '<p class="leise">Nichts gefunden.</p>'}</section>`;
  }
  function stoerungDetail(s) {
    return `<section class="feldkarte karte" style="box-shadow:var(--schatten),inset 0 0 0 1.5px var(--hell)">
      <div class="feld"><label for="st-was">Was ist passiert?</label><input id="st-was" value="${esc(s.was)}"></div>
      <div class="raster2"><div class="feld"><label for="st-datum">Datum</label><input id="st-datum" type="date" value="${esc(s.datum)}"></div><div class="feld"><label for="st-status">Stand</label><select id="st-status"><option value="offen" ${s.status === 'offen' ? 'selected' : ''}>offen</option><option value="erledigt" ${s.status === 'erledigt' ? 'selected' : ''}>erledigt</option></select></div></div>
      <div class="feld"><label for="st-ursache">Ursache</label><textarea id="st-ursache">${esc(s.ursache || '')}</textarea></div>
      <div class="feld"><label for="st-loesung">Lösung / was gemacht wurde</label><textarea id="st-loesung">${esc(s.loesung || '')}</textarea></div>
      <div class="knoepfe" style="justify-content:space-between;margin-top:4px"><span class="wer">${wer(s)}</span><span><button type="button" class="btn text" data-a="stoerung-weg" data-id="${esc(s.id)}">Löschen</button> <button type="button" class="btn" data-a="stoerung-zu">Schließen</button> <button type="button" class="btn haupt" data-a="stoerung-speichern" data-id="${esc(s.id)}">Speichern</button></span></div></section>`;
  }

  function einstellungenAnsicht() {
    const e = S.d.einstellungen;
    const k = S.d.konto;
    const s = S.d.sync;
    const eb = e.eingebaut || {};
    const gewollt = eintraege('gewollt_aus');
    return `<section class="titelkarte karte"><div class="platz"><h1>Einstellungen</h1><p>Was Specht abklopft und wie er synchronisiert · Version ${esc(S.d.version)}</p></div></section>
      <div class="raster2">
        <section class="feldkarte karte"><h2 class="k2">Sync <small>überall derselbe Stand</small></h2>
          ${k ? `<div class="zeile"><span>Angemeldet als <b>${esc(k.email)}</b></span><div class="platz"></div><span class="chip ${s.art === 'synchron' ? 'gut' : s.art === 'offline' ? 'grau' : ''}">${esc(s.text)}</span></div>
            <div class="zeile"><span class="punkt an"></span><span>${esc(S.d.geraet)} <span class="leise">· dieses Gerät</span></span></div>
            <div class="knoepfe" style="justify-content:flex-start"><button type="button" class="btn" data-a="sync-jetzt">Jetzt synchronisieren</button><button type="button" class="btn text" data-a="abmelden">Abmelden</button></div>`
          : `<p class="leise" style="margin:0 0 10px">Nicht angemeldet – alles bleibt nur auf diesem Gerät.</p><button type="button" class="btn haupt" data-a="erster-start">Anmelden</button>`}
          <p class="leise" style="margin:12px 0 0;font-size:13.5px">Gespeichert werden Notizen, Tagebuch, Anleitungen, Freigaben, „gewollt aus“ und der Chat. Keine Passwörter – die bleiben in Passbolt.</p></section>
        <section class="feldkarte karte"><h2 class="k2">Was Specht abklopft</h2>
          <div class="zeile"><span><b class="h">Ping</b> auf alle Server und Switches</span><div class="platz"></div><button type="button" class="schalter" role="switch" aria-checked="${e.pingAn}" aria-label="Ping an oder aus" data-a="schalter" data-k="pingAn"></button></div>
          <div class="zeile"><label for="intervall">Wie oft</label><div class="platz"></div><select id="intervall" class="suchfeld" style="width:170px" data-a="intervall">${[1, 2, 5, 10, 15, 30].map((m) => `<option value="${m}" ${Number(e.intervallMin) === m ? 'selected' : ''}>alle ${m} Minuten</option>`).join('')}</select></div>
          <div class="zeile"><span>Taskleiste melden, wenn etwas neu rot wird</span><div class="platz"></div><button type="button" class="schalter" role="switch" aria-checked="${e.meldungenAn}" aria-label="Meldungen an oder aus" data-a="schalter" data-k="meldungenAn"></button></div>
          <div class="zeile"><span><b class="h">PRTG</b> <span class="leise">· kommt, sobald es einen Lese-Zugang gibt</span></span><div class="platz"></div><span class="chip grau">nicht verbunden</span></div>
          <div class="zeile"><span><b class="h">Veeam / G DATA</b> <span class="leise">· später</span></span><div class="platz"></div><span class="chip grau">nicht verbunden</span></div></section>
        <section class="feldkarte karte"><h2 class="k2">Lizenz-Tool <small>nur lesen</small></h2>
          <div class="feld"><label for="liz-url">Adresse (Supabase-URL)</label><input id="liz-url" value="${esc(e.lizenzUrl || '')}" placeholder="https://….supabase.co"></div>
          <div class="feld"><label for="liz-key">Schlüssel ${e.lizenzSchluesselGesetzt ? '(gespeichert – leer lassen zum Behalten)' : ''}</label><input id="liz-key" type="password" autocomplete="off" placeholder="${e.lizenzSchluesselGesetzt ? '••••••••' : 'anon-Schlüssel aus LIZENZEN.html'}"></div>
          <button type="button" class="btn" data-a="lizenz-speichern">Speichern</button></section>
        <section class="feldkarte karte"><h2 class="k2">Claude</h2>
          <div class="zeile"><span class="punkt ${eb.token ? 'an' : ''}"></span><span>Eingebautes Claude (vom Startfenster)</span><div class="platz"></div><span class="chip ${eb.token ? 'gut' : 'grau'}">${eb.token ? 'eingerichtet' : 'nicht eingerichtet'}</span></div>
          <div class="feld" style="margin-top:12px"><label for="weg">Weg</label><select id="weg" data-a="weg"><option value="claude" ${e.weg === 'claude' ? 'selected' : ''}>Claude hier (oder eingebaut)</option><option value="heim" ${e.weg === 'heim' ? 'selected' : ''}>Über den Heim-PC (Kranich)</option><option value="api" ${e.weg === 'api' ? 'selected' : ''}>API-Schlüssel</option></select></div>
          ${e.weg === 'heim' ? `<div class="feld"><label for="heim-adr">Heim-PC-Adresse</label><input id="heim-adr" value="${esc(e.heimAdresse || '')}" placeholder="http://mein-pc:4747"></div><div class="feld"><label for="heim-code">Kopplungscode ${e.heimCodeGesetzt ? '(gespeichert)' : ''}</label><input id="heim-code" type="password" autocomplete="off"></div>` : ''}
          ${e.weg === 'api' ? `<div class="feld"><label for="api-key">API-Schlüssel ${e.apiSchluesselGesetzt ? '(gespeichert)' : ''}</label><input id="api-key" type="password" autocomplete="off"></div>` : ''}
          <div class="knoepfe" style="justify-content:flex-start"><button type="button" class="btn" data-a="claude-speichern">Speichern</button><button type="button" class="btn" data-a="claude-testen">Verbindung testen</button></div></section>
        <section class="feldkarte karte"><h2 class="k2">Wissen <small>liegt nur in deinem Konto</small></h2>
          ${keinWissen() ? '<p class="leise" style="margin:0 0 10px">Noch keine Wissens-Datei geladen.</p>' : `<div class="zeile"><span>${S.d.wissen.SERVER.length} Server · ${S.d.wissen.NETZ.length} Netzgeräte</span><div class="platz"></div><span class="wer">${esc(S.d.wissen.STAND || '')}</span></div>`}
          <div class="knoepfe" style="justify-content:flex-start"><button type="button" class="btn" data-a="wissen-laden">${keinWissen() ? 'Wissens-Datei laden' : 'Neue Datei laden'}</button></div>
          <p class="leise" style="margin:10px 0 0;font-size:13.5px">Neue Datei ersetzt Server, Netz und Backup. Tagebuch und Anleitungen werden nur ergänzt.</p></section>
        <section class="feldkarte karte"><h2 class="k2">Gewollt aus <small>werden nicht als Problem gezeigt</small></h2>
          ${gewollt.length ? gewollt.map((g) => `<div class="zeile"><span class="punkt gewollt"></span><span>${esc(zielVon(g.ziel)?.name || g.ziel)} · ${esc(zielVon(g.ziel)?.rolle || '')}</span><div class="platz"></div><button type="button" class="btn text klein" data-a="eintrag-weg" data-id="${esc(g.id)}">Entfernen</button></div>`).join('') : '<p class="leise" style="margin:0">Keine.</p>'}</section>
      </div>`;
  }

  // ---------- Erster Start ----------
  function ersterStart(schritt = 1, fehler = '', laedt = false) {
    document.querySelector('.schleier.start')?.remove();
    const s = document.createElement('div'); s.className = 'schleier start';
    const balken = `<div class="schritte-start" aria-hidden="true">${[1, 2, 3].map((i) => `<span class="${i <= schritt ? 'an' : ''}"></span>`).join('')}</div>`;
    let inhalt = '';
    if (schritt === 1) {
      inhalt = `<div style="display:flex;align-items:center;gap:14px">${specht(56)}<div><h2>Hallo, ich bin Specht.</h2><p class="unter" style="margin:2px 0 0">Dein IT-Helfer. Ich klopfe alles ab und merke mir, was du einträgst – auf allen Geräten gleich.</p></div></div>${balken}
        <b class="h">Anmelden für den Sync</b><p class="leise" style="margin:4px 0 12px;font-size:14px">Ein Konto für alle Vögel. Neu hier? Dann „Konto anlegen“ – du bekommst eine Bestätigungs-Mail.</p>
        <div class="feld"><label for="st-mail">E-Mail</label><input id="st-mail" type="email" autocomplete="username" value="${esc(S.startMail || '')}"></div>
        <div class="feld"><label for="st-pw">Kennwort (mind. 8 Zeichen)</label><input id="st-pw" type="password" autocomplete="current-password"></div>
        ${fehler ? `<div class="hinweisbox" role="alert">${esc(fehler)}</div>` : ''}
        <div class="knoepfe" style="justify-content:space-between"><button type="button" class="btn text" data-s="ohne">Erstmal ohne Sync</button><span><button type="button" class="btn" data-s="neu" ${laedt ? 'disabled' : ''}>Konto anlegen</button> <button type="button" class="btn haupt" data-s="an" ${laedt ? 'disabled' : ''}>${laedt ? 'Melde an …' : 'Anmelden'}</button></span></div>`;
    } else if (schritt === 2) {
      const da = !keinWissen();
      const wieder = da && S.d.eintraege.some((e) => e._geraet && e._geraet !== S.d.geraet);
      inhalt = da
        ? `<h2>${wieder ? 'Willkommen zurück – dein Stand ist schon da' : 'Wissen ist drin'}</h2>${balken}
          <p style="margin:0 0 10px">Ich kenne ${S.d.wissen.SERVER.length} Server, ${S.d.wissen.NETZ.length} Netzgeräte und ${eintraege('stoerung').length} Störungen aus dem Tagebuch.</p>
          <div class="hinweisbox">Neue Serverliste oder andere Dateien? Schick sie Claude – du bekommst eine neue Wissens-Datei. Deine Notizen und Einträge bleiben.</div>
          <div class="knoepfe"><button type="button" class="btn haupt" data-s="weiter3">Weiter</button></div>`
        : `<h2>Wissen laden</h2>${balken}
          <p style="margin:0 0 10px">Specht kommt ohne Firmendaten, weil die App öffentlich zum Download liegt. Lade einmal deine Wissens-Datei (specht-wissen.json) – danach liegt sie nur in deinem Konto.</p>
          ${fehler ? `<div class="hinweisbox" role="alert">${esc(fehler)}</div>` : ''}
          <div class="knoepfe" style="justify-content:space-between"><button type="button" class="btn text" data-s="weiter3">Später</button><button type="button" class="btn haupt" data-s="wissen" ${laedt ? 'disabled' : ''}>${laedt ? 'Lade …' : 'Wissens-Datei laden'}</button></div>`;
    } else {
      const eb = S.d.einstellungen.eingebaut || {};
      inhalt = `<h2>Claude verbinden</h2>${balken}
        <p style="margin:0 0 12px">Damit „Specht fragen“ geht. ${eb.token ? 'Das eingebaute Claude vom Startfenster ist schon eingerichtet.' : 'Am einfachsten im Startfenster unter Einstellungen → „Claude einrichten“.'}</p>
        ${fehler ? `<div class="hinweisbox" role="alert">${esc(fehler)}</div>` : ''}
        <div class="knoepfe" style="justify-content:space-between"><button type="button" class="btn text" data-s="fertig">Überspringen</button><span><button type="button" class="btn" data-s="testen" ${laedt ? 'disabled' : ''}>${laedt ? 'Teste …' : 'Verbindung testen'}</button> <button type="button" class="btn haupt" data-s="fertig">Los geht's</button></span></div>`;
    }
    s.innerHTML = `<div class="fenster karte" role="dialog" aria-modal="true" aria-label="Erster Start" style="width:min(560px,96vw)">${inhalt}</div>`;
    document.body.appendChild(s);
    (s.querySelector('#st-mail') || s.querySelector('.btn.haupt'))?.focus();
    s.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-s]'); if (!b) return;
      const was = b.dataset.s;
      if (was === 'ohne') { await SP.einstellungen({ erstStartFertig: true }); s.remove(); return; }
      if (was === 'an' || was === 'neu') {
        const mail = s.querySelector('#st-mail').value.trim(); const pw = s.querySelector('#st-pw').value;
        S.startMail = mail;
        if (!/^\S+@\S+\.\S+$/.test(mail)) return ersterStart(1, 'Bitte eine gültige E-Mail eintragen.');
        if (pw.length < 8) return ersterStart(1, 'Das Kennwort braucht mindestens 8 Zeichen.');
        ersterStart(1, '', true);
        const r = was === 'an' ? await SP.konto.anmelden(mail, pw) : await SP.konto.registrieren(mail, pw);
        if (r?.fehler) return ersterStart(1, r.fehler.nachricht);
        if (r.bestaetigen) return ersterStart(1, 'Fast fertig: Klick den Link in der Bestätigungs-Mail, dann hier „Anmelden“.');
        S.d.konto = { email: r.email };
        await SP.einstellungen({ erstStartFertig: true });
        return ersterStart(2);
      }
      if (was === 'weiter3') return ersterStart(3);
      if (was === 'wissen') {
        ersterStart(2, '', true);
        const r = await SP.wissenLaden();
        if (r?.abgebrochen) return ersterStart(2);
        if (r?.fehler) return ersterStart(2, r.fehler.nachricht);
        S.d.wissen = r.wissen; S.d.eintraege = r.eintraege;
        return ersterStart(2);
      }
      if (was === 'testen') {
        ersterStart(3, '', true);
        const r = await SP.hirnTesten();
        return ersterStart(3, r?.fehler ? r.fehler.nachricht : r.ok ? 'Claude antwortet – passt.' : 'Claude hat komisch geantwortet.');
      }
      if (was === 'fertig') { s.remove(); zeichne(); }
    });
  }

  // ---------- Zwei Versionen ----------
  function konfliktZeigen() {
    const k = S.d.konflikte?.[0]; if (!k) return;
    document.querySelector('.schleier.konflikt')?.remove();
    const text = (d, weg) => (weg ? '<i>gelöscht</i>' : esc(d.was || d.titel || d.text || d.pfad || JSON.stringify(d).slice(0, 160)));
    const mehr = (d) => esc([d.status && `Stand: ${d.status}`, d.loesung, d.ursache].filter(Boolean).join(' · ').slice(0, 220));
    const s = document.createElement('div'); s.className = 'schleier konflikt';
    let wahl = 'lokal';
    s.innerHTML = `<div class="fenster karte" role="dialog" aria-modal="true" aria-label="Zwei Versionen"><h2>Zwei Versionen</h2><p class="unter">Das wurde auf zwei Geräten geändert, während eins offline war. Welche soll bleiben?</p>
      <div class="versionen"><button type="button" class="version" data-w="lokal" aria-pressed="true"><span class="wer">${esc((k.lokalGeraet || 'Dieses Gerät').replace(/ \(.*\)$/, ''))} · ${esc(wann(k.lokalZeit))}</span><b class="h">${text(k.lokal, k.lokalGeloescht)}</b><span style="font-size:14px">${mehr(k.lokal)}</span></button>
      <button type="button" class="version" data-w="fern" aria-pressed="false"><span class="wer">${esc((k.fernGeraet || 'Anderes Gerät').replace(/ \(.*\)$/, ''))} · ${esc(wann(k.fernZeit))}</span><b class="h">${text(k.fern, k.fernGeloescht)}</b><span style="font-size:14px">${mehr(k.fern)}</span></button></div>
      <div class="knoepfe"><button type="button" class="btn" data-k="beide">Beide behalten</button><button type="button" class="btn haupt" data-k="diese">Diese behalten</button></div>${S.d.konflikte.length > 1 ? `<p class="leise" style="margin:10px 0 0;font-size:13px">Danach noch ${S.d.konflikte.length - 1} weitere.</p>` : ''}</div>`;
    document.body.appendChild(s);
    s.addEventListener('click', async (ev) => {
      const v = ev.target.closest('[data-w]');
      if (v) { wahl = v.dataset.w; s.querySelectorAll('[data-w]').forEach((x) => x.setAttribute('aria-pressed', String(x === v))); return; }
      const kn = ev.target.closest('[data-k]'); if (!kn) return;
      const r = await SP.loese(k.id, kn.dataset.k === 'beide' ? 'beide' : wahl);
      S.d.eintraege = r.eintraege; S.d.konflikte = r.konflikte;
      s.remove(); zeichne(false);
      if (S.d.konflikte.length) konfliktZeigen(); else meldung('Erledigt – wird synchronisiert.');
    });
  }

  // ---------- Zeichnen ----------
  const ANSICHTEN = { uebersicht, server: serverAnsicht, netz: netzAnsicht, backup: backupAnsicht, lizenzen: lizenzenAnsicht, freigaben: freigabenAnsicht, anleitungen: anleitungenAnsicht, anleitung: anleitungAnsicht, stoerungen: stoerungenAnsicht, einstellungen: einstellungenAnsicht };
  function zeichne(neu = true) {
    if (!S.d) return;
    const fokus = document.activeElement?.id; const sel = fokus ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    const frage = document.getElementById('frage')?.value || '';
    const scroll = app.querySelector('main.haupt')?.scrollTop || 0;
    const gesp = app.querySelector('.gespraech');
    app.innerHTML = `${kopf()}<div class="koerper ${S.helfer ? 'helfer-zwang' : 'ohne-helfer'}">${nav()}<main class="haupt ${neu ? 'ansicht-neu' : ''}" aria-label="${esc((BEREICHE.find(([k]) => k === S.ansicht) || [0, 'Bereich'])[1])}">${(ANSICHTEN[S.ansicht] || uebersicht)()}</main>${S.helfer ? helfer() : ''}</div>`;
    const f = document.getElementById('frage'); if (f) f.value = frage;
    if (!neu) { const h = app.querySelector('main.haupt'); if (h) h.scrollTop = scroll; }
    const g = app.querySelector('.gespraech'); if (g) g.scrollTop = g.scrollHeight;
    if (fokus) { const el = document.getElementById(fokus); if (el) { el.focus({ preventScroll: true }); try { if (sel && el.setSelectionRange) el.setSelectionRange(sel[0], sel[1]); } catch { /* egal */ } } }
    S.gewechselt.clear();
    void gesp;
  }

  // ---------- Aktionen ----------
  async function setze(art, id, daten) {
    const r = await SP.setze(art, id, daten);
    if (r?.fehler) { meldung(r.fehler.nachricht, { fehler: true }); return null; }
    const i = S.d.eintraege.findIndex((e) => e.id === r.id);
    if (i >= 0) S.d.eintraege[i] = r; else S.d.eintraege.push(r);
    return r;
  }
  async function loesche(id) {
    await SP.loesche(id);
    S.d.eintraege = S.d.eintraege.filter((e) => e.id !== id);
  }
  async function fragen(text) {
    text = String(text || '').trim(); if (!text || S.denkt) return;
    const verlauf = [...chatVerlauf(), { wer: 'ich', text }];
    await setze('chat', CHAT_ID, { verlauf: verlauf.slice(-40) });
    S.denkt = true; S.helfer = true; zeichne(false);
    const r = await SP.frage(text, verlauf);
    S.denkt = false;
    const antwort = r?.fehler
      ? { wer: 'er', fehler: true, text: `${r.fehler.nachricht}${r.fehler.art === 'nicht-installiert' ? '' : '\nProbier es gleich nochmal oder sieh in den Einstellungen unter „Claude“ nach.'}` }
      : { wer: 'er', text: r.antwort || 'Dazu weiß ich gerade nichts.', befehle: r.befehle, aehnlich: r.aehnlich, anleitung: r.anleitung };
    await setze('chat', CHAT_ID, { verlauf: [...verlauf, antwort].slice(-40) });
    zeichne(false);
    vogelMacht(r?.fehler ? 'schief' : 'nickt');
  }
  async function erklaereSchritt(a, i) {
    const k = `${a.id}:${i}`; S.erklaertLaeuft = k; zeichne(false);
    const r = await SP.frage(`Erklär mir in 2–4 einfachen Sätzen Schritt ${i + 1} der Anleitung „${a.titel}“: ${a.schritte[i]}`, []);
    S.erklaertLaeuft = null;
    S.erklaert[k] = r?.fehler ? r.fehler.nachricht : r.antwort;
    if (S.ansicht === 'anleitung') zeichne(false);
  }
  async function klopfen() {
    if (S.klopft) return;
    S.klopft = true; zeichne(false);
    const r = await SP.klopfen();
    if (r?.fehler) { S.klopft = false; zeichne(false); meldung(r.fehler.nachricht, { fehler: true }); }
  }
  function neuerZustand(zustand, zeit) {
    const alt = S.d.zustand || {};
    for (const [id, z] of Object.entries(zustand)) if (alt[id] && alt[id].an !== z.an) S.gewechselt.add(id);
    const vorher = Object.values(alt).filter((z) => !z.an).length;
    S.d.zustand = zustand; S.d.letzterKlopf = zeit; S.klopft = false;
    zeichne(false);
    const ga = gewolltAus();
    const rot = S.d.wissen.SERVER.filter((s) => !zustand[s.id]?.an && !ga.has(s.id)).length;
    vogelMacht(rot ? 'schief' : 'nickt');
    if (S.gewechselt.size === 0 && vorher === Object.values(zustand).filter((z) => !z.an).length && Object.keys(alt).length) meldung('Abgeklopft – alles wie vorher.');
  }

  const AKTIONEN = {
    'wissen-laden': async () => {
      const r = await SP.wissenLaden();
      if (r?.abgebrochen) return;
      if (r?.fehler) { meldung(r.fehler.nachricht, { fehler: true, dauer: 7000 }); return; }
      S.d.wissen = r.wissen; S.d.eintraege = r.eintraege; S.klopft = true;
      zeichne(); meldung(`Wissen geladen: ${r.server} Server${r.neu ? `, ${r.neu} Einträge dazu` : ''}.`);
    },
    ansicht: (el) => { S.ansicht = el.dataset.z; S.stoerung = null; S.bearbeite = null; if (S.ansicht === 'lizenzen') S.lizenzen = null; zeichne(); },
    helfer: () => { S.helfer = !S.helfer; zeichne(false); },
    klopfen: () => klopfen(),
    'sync-klick': () => { if (S.d.konflikte?.length) konfliktZeigen(); else if (!S.d.konto) ersterStart(1); else { SP.sync(); } },
    'sync-jetzt': () => SP.sync(),
    abmelden: async () => { if (!await frageFenster({ titel: 'Abmelden?', text: 'Deine Einträge bleiben auf diesem Gerät, werden aber nicht mehr abgeglichen.', ja: 'Abmelden' })) return; await SP.konto.abmelden(); S.d.konto = null; zeichne(false); },
    'erster-start': () => ersterStart(1),
    'server-oeffnen': (el) => { S.ansicht = 'server'; S.server = el.dataset.id; zeichne(); },
    filter: (el) => { S.filter = el.dataset.z; zeichne(false); },
    gewollt: async (el) => {
      const g = eintraege('gewollt_aus').find((x) => x.ziel === el.dataset.id);
      if (g) { await loesche(g.id); meldung('Wird wieder normal angezeigt.'); } else { await setze('gewollt_aus', `ga-${el.dataset.id}`, { ziel: el.dataset.id }); meldung('Als „gewollt aus“ markiert.'); }
      zeichne(false);
    },
    rdp: async (el) => { const r = await SP.rdp(el.dataset.ip); if (r?.fehler) meldung(r.fehler.nachricht, { fehler: true }); },
    kopieren: (el) => kopiere(el.dataset.t),
    'notiz-dazu': async (el) => { const t = document.getElementById('neue-notiz'); const text = t.value.trim(); if (!text) return t.focus(); if (/passwort|kennwort\s*[:=]/i.test(text) && !await frageFenster({ titel: 'Steht da ein Passwort drin?', text: 'Passwörter gehören in Passbolt, nicht in Specht. Trotzdem speichern?', ja: 'Trotzdem speichern' })) return; await setze('notiz', null, { ziel: el.dataset.id, text }); zeichne(false); meldung('Notiz gespeichert.'); },
    'notiz-weg': async (el) => { if (!await frageFenster({ titel: 'Notiz löschen?', ja: 'Löschen', gefahr: true })) return; await loesche(el.dataset.id); zeichne(false); },
    'eintrag-weg': async (el) => { await loesche(el.dataset.id); zeichne(false); },
    'netzpunkt-dazu': async () => { const t = document.getElementById('neuer-punkt'); if (!t.value.trim()) return t.focus(); await setze('netzpunkt', null, { text: t.value.trim(), erledigt: false }); zeichne(false); },
    'freigabe-dazu': async () => {
      const p = document.getElementById('fg-pfad').value.trim(); if (!p) return document.getElementById('fg-pfad').focus();
      await setze('freigabe', null, { pfad: p, wer: document.getElementById('fg-wer').value.trim(), rechte: document.getElementById('fg-recht').value.trim() }); zeichne(false); meldung('Freigabe eingetragen.');
    },
    'lizenzen-neu': () => { S.lizenzen = null; zeichne(false); },
    'anleitung-oeffnen': (el) => { S.ansicht = 'anleitung'; S.anleitung = el.dataset.id; S.bearbeite = null; zeichne(); },
    'anleitung-neu': async () => { const r = await setze('anleitung', null, { titel: 'Neue Anleitung', untertitel: '', schritte: ['Erster Schritt'] }); S.ansicht = 'anleitung'; S.anleitung = r.id; S.bearbeite = r.id; zeichne(); },
    'anleitung-bearbeiten': (el) => { S.bearbeite = el.dataset.id; zeichne(false); },
    'anleitung-abbrechen': () => { S.bearbeite = null; zeichne(false); },
    'anleitung-speichern': async (el) => {
      const schritte = document.getElementById('an-schritte').value.split('\n').map((x) => x.trim()).filter(Boolean);
      await setze('anleitung', el.dataset.id, { titel: document.getElementById('an-titel').value.trim() || 'Ohne Titel', untertitel: document.getElementById('an-unter').value.trim(), schritte });
      S.bearbeite = null; zeichne(false); meldung('Gespeichert.');
    },
    'anleitung-weg': async (el) => { if (!await frageFenster({ titel: 'Anleitung löschen?', text: 'Sie verschwindet auf allen Geräten.', ja: 'Löschen', gefahr: true })) return; await loesche(el.dataset.id); S.bearbeite = null; S.ansicht = 'anleitungen'; zeichne(); },
    'schritt-erklaeren': (el) => { const a = eintraege('anleitung').find((x) => x.id === el.dataset.id); if (a) erklaereSchritt(a, Number(el.dataset.i)); },
    'stoerung-oeffnen': (el) => { S.ansicht = 'stoerungen'; S.stoerung = el.dataset.id; zeichne(); },
    'stoerung-neu': async () => { const r = await setze('stoerung', null, { datum: new Date().toISOString().slice(0, 10), was: '', ursache: '', loesung: '', status: 'offen', server: [] }); S.stoerung = r.id; zeichne(false); document.getElementById('st-was')?.focus(); },
    'stoerung-zu': () => { S.stoerung = null; zeichne(false); },
    'stoerung-speichern': async (el) => {
      const alt = eintraege('stoerung').find((s) => s.id === el.dataset.id) || {};
      const was = document.getElementById('st-was').value.trim() || 'Ohne Titel';
      const server = S.d.wissen.SERVER.filter((s) => new RegExp(`\\b${s.name}\\b`, 'i').test(`${was} ${document.getElementById('st-ursache').value} ${document.getElementById('st-loesung').value}`)).map((s) => s.id);
      await setze('stoerung', el.dataset.id, { ...alt, was, datum: document.getElementById('st-datum').value, status: document.getElementById('st-status').value, ursache: document.getElementById('st-ursache').value.trim(), loesung: document.getElementById('st-loesung').value.trim(), server: [...new Set([...(alt.server || []), ...server])] });
      S.stoerung = null; zeichne(false); meldung('Gespeichert.');
    },
    'stoerung-weg': async (el) => { if (!await frageFenster({ titel: 'Störung löschen?', text: 'Sie verschwindet auf allen Geräten.', ja: 'Löschen', gefahr: true })) return; await loesche(el.dataset.id); S.stoerung = null; zeichne(false); },
    'tagebuch-filter': (el) => { S.tagebuchFilter = el.dataset.z; zeichne(false); },
    fragen: () => { const f = document.getElementById('frage'); const t = f.value; f.value = ''; fragen(t); },
    vorschlag: (el) => fragen(el.dataset.t),
    'chat-neu': async () => { await setze('chat', CHAT_ID, { verlauf: [] }); zeichne(false); },
    schalter: async (el) => { const k = el.dataset.k; const r = await SP.einstellungen({ [k]: el.getAttribute('aria-checked') !== 'true' }); if (!r?.fehler) { S.d.einstellungen = r; zeichne(false); } },
    'lizenz-speichern': async () => { const r = await SP.einstellungen({ lizenzUrl: document.getElementById('liz-url').value.trim(), lizenzSchluessel: document.getElementById('liz-key').value.trim() }); if (!r?.fehler) { S.d.einstellungen = r; S.lizenzen = null; meldung('Gespeichert.'); zeichne(false); } },
    'claude-speichern': async () => {
      const neu = { weg: document.getElementById('weg').value };
      const h = document.getElementById('heim-adr'); if (h) neu.heimAdresse = h.value.trim();
      const c = document.getElementById('heim-code'); if (c) neu.heimCode = c.value.trim();
      const a = document.getElementById('api-key'); if (a) neu.apiSchluessel = a.value.trim();
      const r = await SP.einstellungen(neu); if (!r?.fehler) { S.d.einstellungen = r; meldung('Gespeichert.'); zeichne(false); }
    },
    'claude-testen': async (el) => { el.disabled = true; el.textContent = 'Teste …'; const r = await SP.hirnTesten(); meldung(r?.fehler ? r.fehler.nachricht : r.ok ? `Claude antwortet (${r.weg}).` : 'Claude hat komisch geantwortet.', { fehler: Boolean(r?.fehler) || !r.ok, dauer: 6000 }); zeichne(false); },
  };

  app.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type === 'checkbox')) return;
    AKTIONEN[el.dataset.a]?.(el, ev);
  });
  app.addEventListener('change', async (ev) => {
    const el = ev.target;
    if (el.dataset.a === 'netzpunkt') { const p = eintraege('netzpunkt').find((x) => x.id === el.dataset.id); await setze('netzpunkt', el.dataset.id, { ...p, erledigt: el.checked }); zeichne(false); }
    if (el.dataset.a === 'intervall') { const r = await SP.einstellungen({ intervallMin: Number(el.value) }); if (!r?.fehler) { S.d.einstellungen = r; meldung('Gespeichert.'); } }
    if (el.dataset.a === 'weg') { const r = await SP.einstellungen({ weg: el.value }); if (!r?.fehler) { S.d.einstellungen = r; zeichne(false); } }
  });
  let tippUhr = null;
  app.addEventListener('input', (ev) => {
    const k = ev.target.dataset.feld; if (!k) return;
    S[k] = ev.target.value; clearTimeout(tippUhr); tippUhr = setTimeout(() => zeichne(false), 180);
  });
  app.addEventListener('keydown', (ev) => {
    if (ev.target.id === 'frage' && ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); AKTIONEN.fragen(); }
    if (ev.target.id === 'neue-notiz' && ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); app.querySelector('[data-a="notiz-dazu"]')?.click(); }
    if (ev.target.id === 'neuer-punkt' && ev.key === 'Enter') { ev.preventDefault(); AKTIONEN['netzpunkt-dazu'](); }
  });

  // ---------- Ereignisse vom Hauptprozess ----------
  SP.beiSync((s) => {
    const vorher = S.d?.sync?.art;
    if (!S.d) return; S.d.sync = s;
    const pille = app.querySelector('[data-a="sync-klick"]');
    if (pille) pille.outerHTML = kopf().match(/<button type="button" class="pille" data-a="sync-klick"[\s\S]*?<\/button>/)[0];
    if (s.art === 'konflikt') { SP.start().then((d) => { S.d.konflikte = d.konflikte; S.d.eintraege = d.eintraege; konfliktZeigen(); }); }
    if (vorher === 'laeuft' && s.art === 'synchron') vogelMacht('schuettelt');
  });
  SP.beiKlopfStart(() => { if (!S.d || S.klopft) return; S.klopft = true; const v = app.querySelector('.kopf .specht'); v?.classList.add('klopft'); const u = app.querySelector('.kopf .name span'); if (u) u.textContent = 'IT-Helfer · klopft gerade ab …'; });
  SP.beiKlopfen(({ zustand, zeit }) => { if (S.d) neuerZustand(zustand, zeit); });
  SP.beiDaten(({ eintraege: e }) => { if (!S.d) return; S.d.eintraege = e; S.d.wissen = wissenAus(e); if (!document.querySelector('.schleier') && !['anleitung'].includes(S.ansicht) && !S.stoerung) zeichne(false); });

  // ---------- Start ----------
  (async () => {
    S.d = await SP.start();
    if (S.d && !S.d.fehler) S.d.wissen = wissenAus(S.d.eintraege);
    if (S.d.fehler) { app.innerHTML = `<div class="karte leerstand" style="margin:auto">${specht(64)}<b>Specht konnte nicht starten</b><p>${esc(S.d.fehler.nachricht)}</p></div>`; return; }
    zeichne();
    if (S.d.erstStart) ersterStart(1);
    else if (S.d.konflikte?.length) konfliktZeigen();
    setInterval(() => { if (!document.querySelector('.schleier') && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { const u = app.querySelector('.kopf .name span'); if (u && !S.klopft && S.d.letzterKlopf) u.textContent = `IT-Helfer · zuletzt abgeklopft ${wann(S.d.letzterKlopf)}`; } }, 30000);
    setTimeout(() => { if (!document.querySelector('.schleier')) SP.standFoto?.('specht-uebersicht'); }, 4000);
    window.App = { S, zeichne, AKTIONEN };
  })();
})();
