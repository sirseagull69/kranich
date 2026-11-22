'use strict';
// Die Logik des Agent-Fensters: klein, drei Ansichten (Status, Koppeln,
// Gekoppelt). Holt die echten Daten ueber window.kranich und fuellt die
// Platzhalter der Vorlage aus dem Canvas (canvas/Agent*.dc.html).

const ZEICHEN = {
  ok: 'M5 12.5l4.5 4.5L19 7.5', warn: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  bad: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6zM9.5 9.5l5 5M14.5 9.5l-5 5',
  off: 'M4 4l16 16M8.5 8.6A6 6 0 0 0 6 13M12 7a6 6 0 0 1 6 6M12 17v.5', unk: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 16.5v.5',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M12 8v4l3 2',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16',
};
const FARBE = { ok: '#17663a', warn: '#6e5200', bad: '#a5221b', neutral: '#1d2742', grau: '#4a4f5e' };

function wann(iso) {
  const t = iso ? new Date(iso) : null;
  if (!t || Number.isNaN(t.getTime())) return '';
  const uhr = t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const tag = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const unterschied = Math.round((tag(new Date()) - tag(t)) / 86400000);
  if (unterschied === 0) return `heute, ${uhr}`;
  if (unterschied === 1) return `gestern, ${uhr}`;
  return t.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function vor(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'noch nie';
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 2) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  if (min < 2880) return `vor ${Math.round(min / 60)} Std.`;
  return `vor ${Math.round(min / 1440)} Tagen`;
}
const dauer = (n) => Math.floor(n / 60) + ':' + (n % 60 < 10 ? '0' : '') + (n % 60);
const dateiname = (pfad) => String(pfad ?? '').split(/[\\/]/).pop() || '';

class Component extends DCLogic {
  DEF() { return { ansicht: 'status', fehler: '', koppelt: false, wort: '', n: 0, name: '' }; }
  S() { return Object.assign(this.DEF(), this.state || {}); }

  componentDidMount() {
    this.d = { info: null, lage: null, agent: null, scan: null };
    this.api = window.kranich;
    this.lade('info', 'lage', 'agent', 'scan');
    this.api.beiEreignis((e) => {
      if (e.art === 'agent') { this.d.agent = e.status; this.frisch(); }
      else if (e.art === 'schutzscan-start') this.lade('scan');
      else if (e.art === 'schutzscan-fertig') { this.lade('scan', 'lage'); this.sage(e.ok === false ? 'Der Scan hat nicht geklappt.' : `Scan fertig${typeof e.sekunden === 'number' ? ` nach ${dauer(e.sekunden)}` : ''}. ${e.neueFunde ? (e.neueFunde === 1 ? '1 neuer Fund.' : `${e.neueFunde} neue Funde.`) : 'Nichts gefunden.'}`); }
      else if (e.art === 'verlauf-probe' || e.art === 'verlauf') this.lade('lage');
      else if (e.art === 'einstellungen') this.lade('info');
    });
    // Der Schutz wird alle zwei Minuten neu abgefragt. Die Anzeige tickt jede
    // halbe Minute, waehrend eines Scans jede Sekunde.
    this._takt = setInterval(() => this.lade('lage', 'agent'), 120000);
    let tick = 0;
    this._sek = setInterval(() => { tick += 1; if ((this.d.scan && this.d.scan.laeuft) || tick % 30 === 0) this.frisch(); }, 1000);
  }
  frisch() { this.setState({ n: this.S().n + 1 }); }
  async lade(...was) {
    const hole = { info: () => this.api.info(), lage: () => this.api.lage(), agent: () => this.api.agentStatus(), scan: () => this.api.schutzScanStatus() };
    await Promise.all(was.map(async (name) => {
      try { this.d[name] = await hole[name](); } catch (fehler) { console.error('Kranich Agent: konnte nicht laden:', name, fehler); }
    }));
    this.frisch();
  }
  // Kurze Rueckmeldung im Hinweisfeld, verschwindet von selbst.
  sage(text) {
    clearTimeout(this._wort);
    this.setState({ wort: text });
    this._wort = setTimeout(() => this.setState({ wort: '' }), 8000);
  }

  async scanne() {
    if (!this.d.info || !this.d.info.schutzLesbar) return this.sage('Auf diesem System kann Kranich keinen System-Scan starten.');
    if (this.d.scan && this.d.scan.laeuft) return this.sage('Es läuft schon ein Scan.');
    const a = this.api.schutzScan('schnell');
    setTimeout(() => this.lade('scan'), 300);
    const e = await a.catch((fehler) => ({ ok: false, grund: fehler.message }));
    if (!e.ok) { this.lade('scan'); this.sage(e.grund || 'Der Scan hat nicht geklappt.'); }
  }
  async probealarm() {
    this.sage('Probealarm läuft …');
    const e = await this.api.probealarm().catch((fehler) => ({ ok: false, grund: fehler.message }));
    this.sage(!e.ok ? `Probealarm hat nicht geklappt: ${e.grund}` : (e.durch === 'kranich' ? 'Probealarm erkannt. Kranich hat die Testdatei gleich wieder entfernt.' : 'Probealarm erkannt. Der Schutz des Systems hat die Testdatei abgefangen.'));
    setTimeout(() => this.lade('lage'), 3000);
  }
  async kopple() {
    if (this.S().koppelt) return;
    const feld = document.getElementById('code');
    const ziffern = (feld ? feld.value : '').replace(/\D/g, '');
    if (ziffern.length !== 8) return this.setState({ fehler: 'Der Code hat acht Ziffern' });
    this.setState({ koppelt: true, fehler: '' });
    const a = await this.api.agentKoppeln(ziffern).catch((fehler) => ({ ok: false, grund: fehler.message }));
    if (!a.ok) {
      const netz = /nicht erreichbar/i.test(a.grund || '');
      return this.setState({ koppelt: false, fehler: netz ? 'Keine Verbindung zur Zentrale. Prüf dein Internet.' : (a.grund || 'Code falsch oder abgelaufen') });
    }
    await this.lade('agent');
    this.setState({ koppelt: false, ansicht: 'fertig', name: a.name });
  }

  renderVals() {
    const s = this.S();
    const d = this.d || {};
    const I = ZEICHEN;
    const info = d.info || { name: 'Dieses Gerät', version: '', schutzLesbar: false };
    const agent = d.agent || { gekoppelt: false, name: null, verbunden: null, letzteMeldung: null, fehler: null };
    const lage = d.lage || { status: null, funde: [] };
    const st = lage.status;
    const win = info.schutzLesbar;
    const laeuft = d.scan && d.scan.laeuft;

    const offene = lage.funde.filter((f) => f.offen && !f.ignoriert);
    const aus = win && !!st && !(st.dienst && st.antivirus && st.echtzeit) && !/passive|not running/i.test(st.modus || '');
    const K = { ok: { bg: '#e0f3e4', fg: '#17663a', ico: I.ok }, warn: { bg: '#fff0b8', fg: '#6e5200', ico: I.warn }, bad: { bg: '#fde2df', fg: '#a5221b', ico: I.bad }, unk: { bg: '#ecebe6', fg: '#4a4f5e', ico: I.unk }, scan: { bg: '#f1edfd', fg: '#4a2f9a', ico: I.scan } };
    const chip = (k, text) => Object.assign({ text }, K[k]);
    let marke;
    if (!d.lage) marke = chip('unk', 'Wird geprüft');
    else if (offene.length) marke = chip('bad', offene.length === 1 ? '1 Fund' : `${offene.length} Funde`);
    else if (aus) marke = chip('warn', 'Schutz ist aus');
    else if (laeuft) marke = chip('scan', 'Scan läuft');
    else marke = chip('ok', win ? 'Schutz läuft' : 'Kranich wacht');

    // Der juengste Fund: offene immer, erledigte einen Tag lang.
    const neu = lage.funde.filter((f) => !f.ignoriert).slice().sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)))[0];
    const zeigen = neu && (neu.offen || Date.now() - Date.parse(neu.zeit) < 86400000);
    const frisch = neu && Date.now() - Date.parse(neu.zeit) < 180000;
    const FTEXT = { in_quarantaene: 'Der Schutz hat die Datei gestoppt und weggesperrt. Du musst nichts tun.', entfernt: 'Der Schutz hat die Datei entfernt. Du musst nichts tun.' };
    const fund = zeigen ? {
      name: neu.name, zeile: `${dateiname(neu.pfade[0]) || 'Datei unbekannt'} · ${wann(neu.zeit)}`,
      text: neu.offen ? (frisch ? 'Der Schutz kümmert sich gerade darum. Einen Moment.' : 'Der Schutz hat die Datei nicht weggesperrt. Öffne die Windows-Sicherheit und entscheide dort.') : (FTEXT[neu.zustand] || 'Der Schutz hat die Datei gestoppt. Du musst nichts tun.'),
    } : { name: '', zeile: '', text: '' };

    const getrennt = agent.gekoppelt && agent.verbunden === false;
    let hinweis = s.wort;
    if (!hinweis && !agent.gekoppelt) hinweis = agent.fehler ? `${agent.fehler}. Der Schutz läuft weiter, aber dein Host sieht dieses Gerät nicht mehr.` : 'Nicht gekoppelt. Der Schutz läuft, aber dein Host sieht dieses Gerät noch nicht.';
    if (!hinweis && getrennt) hinweis = 'Zentrale nicht erreichbar. Der Schutz läuft weiter, Meldungen werden nachgereicht.';

    const zeile = (id, k, ico, text) => ({ id, fg: FARBE[k], ico, text });
    const zeilen = [];
    if (!agent.gekoppelt) zeilen.push(zeile('host', 'grau', I.off, 'Nicht mit Host verbunden'));
    else if (getrennt) zeilen.push(zeile('host', 'grau', I.off, 'Keine Verbindung zum Host'));
    else zeilen.push(zeile('host', agent.verbunden ? 'ok' : 'neutral', I.link, agent.verbunden ? 'Mit Host verbunden' : 'Verbindet mit dem Host …'));
    if (agent.gekoppelt) zeilen.push(zeile('zeit', 'neutral', I.clock, `Zuletzt gemeldet: ${vor(agent.letzteMeldung)}`));
    if (laeuft) {
      const sek = d.scan.seit ? Math.max(0, Math.round((Date.now() - Date.parse(d.scan.seit)) / 1000)) : 0;
      zeilen.push(zeile('scan', 'neutral', I.scan, `${laeuft === 'voll' ? 'Vollscan' : 'Schnellscan'} läuft · seit ${dauer(sek)}`));
    } else if (!zeigen && win && st) {
      const alter = st.signaturAlterTage;
      if (alter === null || alter === undefined) zeilen.push(zeile('liste', 'grau', I.unk, 'Erkennungsliste: unbekannt'));
      else zeilen.push(zeile('liste', alter >= 14 ? 'bad' : (alter >= 3 ? 'warn' : 'ok'), alter >= 3 ? I.warn : I.ok, alter === 0 ? 'Erkennungsliste: heute' : (alter === 1 ? 'Erkennungsliste: gestern' : `Erkennungsliste: ${alter} Tage alt`)));
    } else if (!zeigen && !win) {
      zeilen.push(zeile('liste', 'grau', I.unk, 'Download-Wache und eigene Engine laufen'));
    }

    return {
      sStatus: s.ansicht === 'status', sKoppeln: s.ansicht === 'koppeln', sFertig: s.ansicht === 'fertig',
      name: s.ansicht === 'fertig' ? (s.name || agent.name || info.name) : (agent.name || info.name), version: info.version,
      chip: marke, fundAn: !!zeigen, fund, hinweisAn: !!hinweis, hinweis, zeilen,
      gekoppelt: agent.gekoppelt, ungekoppelt: !agent.gekoppelt,
      scan: () => this.scanne(), probe: () => this.probealarm(),
      koppeln: () => this.setState({ ansicht: 'koppeln', fehler: '' }), zurueck: () => this.setState({ ansicht: 'status', fehler: '' }),
      koppleJetzt: () => this.kopple(), koppelText: s.koppelt ? 'Koppelt …' : 'Koppeln',
      fehlerAn: !!s.fehler, fehler: s.fehler, codeRand: s.fehler ? '#a5221b' : '#1d2742',
    };
  }
}

window.Component = Component;
