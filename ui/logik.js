'use strict';
// Die Logik der Oberflaeche: holt die echten Daten ueber window.kranich und
// uebersetzt sie in die Werte, die die Vorlage aus dem Canvas erwartet.
//
// Aufbau und Namen folgen dem Prototyp im Canvas (canvas/App.dc.html), damit
// sich eine neue Canvas-Fassung leicht uebernehmen laesst. Die Beispieldaten
// des Prototyps sind durch echte Daten ersetzt.

const SYMBOL = {
  home: 'M4 11l8-7 8 7v9H4z', clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M12 8v4l3 2', box: 'M4 8h16v11H4zM3 5h18v3H3zM10 12h4',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  ok: 'M5 12.5l4.5 4.5L19 7.5', warn: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  bad: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6zM9.5 9.5l5 5M14.5 9.5l-5 5',
  off: 'M4 4l16 16M8.5 8.6A6 6 0 0 0 6 13M12 7a6 6 0 0 1 6 6M12 17v.5', unk: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 16.5v.5',
  pc: 'M3 5h18v11H3zM8 20h8M12 16v4', laptop: 'M5 6h14v9H5zM2.5 18.5h19', phone: 'M7 3h10v18H7zM11 18h2', tablet: 'M5 3h14v18H5zM11 18h2',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16', dash: 'M6 12h12',
  flask: 'M9 3h6M10 3v6l-5 10a1.5 1.5 0 0 0 1.4 2h11.2a1.5 1.5 0 0 0 1.4-2l-5-10V3M7.5 15h9',
};

const ICH = 'ich'; // Kennung dieses Geraets in der Oberflaeche

// "heute, 09:14", "gestern, 21:05", "18.11.2026"
function wann(iso, kurz) {
  const t = iso ? new Date(iso) : null;
  if (!t || Number.isNaN(t.getTime())) return '';
  const uhr = t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const tag = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const unterschied = Math.round((tag(new Date()) - tag(t)) / 86400000);
  if (unterschied === 0) return kurz ? uhr : `heute, ${uhr}`;
  if (unterschied === 1) return kurz ? 'gestern' : `gestern, ${uhr}`;
  return t.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const dateiname = (pfad) => String(pfad ?? '').split(/[\\/]/).pop() || '';
const ordner = (pfad) => String(pfad ?? '').replace(/[\\/][^\\/]*$/, '');

class Component extends DCLogic {
  DEF() {
    return {
      screen: 'overview', dev: ICH, tab: 'funde', scan: 'idle', prog: 0, scanFile: '', filter: 'alle',
      rowSt: {}, rowOpen: {}, fundSt: {}, fundOpen: {}, quarDying: {}, qHopN: 0, stampN: 0, peekN: 0,
      moreOpen: false, drag: false, howto: false, hType: 'alle', setTab: 'allgemein', renaming: null,
      dialog: null, toast: '', toastN: 0, n: 0, probe: '', probeText: '',
      auth: '?', loginErr: '', loginTitel: '', loginText: '', hDev: 'alle', add: null, addLabel: '', addCode: '',
    };
  }
  S() { return Object.assign(this.DEF(), this.state || {}); }

  // ------------------------------------------------------------------ Daten
  componentDidMount() {
    this.d = { info: null, lage: null, autostart: null, wache: null, einst: null, verlauf: [], quar: [], schutzScan: null, scanErg: null, geprueft: null, engine: null,
      konto: null, geraete: [], rfunde: {}, rauft: {}, ereignisse: [], nachbar: null, zenOk: null, sysSeit: null, sysDone: null };
    this.api = window.kranich;
    this.ladeAlles();
    this.api.beiEreignis((e) => this.beiEreignis(e));
    // Der Schutz wird alle zwei Minuten neu abgefragt.
    this._takt = setInterval(() => this.lade('lage'), 120000);
    // Der Host fragt die Zentrale alle 20 Sekunden.
    this.ladeKonto();
    this._hostTakt = setInterval(() => this.ladeHost(), 20000);
    // Solange ein Scan laeuft, zaehlt die Anzeige jede Sekunde weiter.
    this._sek = setInterval(() => { if (this.d.schutzScan || this.d.geraete.some((g) => g.scan_laeuft)) this.frisch(); }, 1000);
  }

  // --------------------------------------------------------- Konto und Zentrale
  async ladeKonto() {
    let k;
    try { k = await this.api.kontoStatus(); } catch { k = { angemeldet: false }; }
    this.d.konto = k;
    this.setState({ auth: k.angemeldet ? 'in' : 'out' });
    if (k.angemeldet) this.ladeHost();
  }
  async anmelden(neu) {
    const wert = (id) => { const feld = document.getElementById(id); return feld ? feld.value : ''; };
    const mail = wert('lmail').trim(); const pw = wert('lpw');
    if (!mail || !pw) return this.setState({ loginErr: 'pw', loginTitel: 'Da fehlt noch was', loginText: 'Trag E-Mail und Passwort ein.' });
    const a = neu ? await this.api.kontoAnlegen(mail, pw) : await this.api.kontoAnmelden(mail, pw);
    if (a.ok && a.bestaetigen) return this.setState({ loginErr: 'mail' });
    if (!a.ok) {
      if (a.netz) return this.setState({ loginErr: 'net' });
      if (a.code === 'email_not_confirmed') return this.setState({ loginErr: 'mail' });
      const falsch = a.code === 'invalid_credentials';
      return this.setState({ loginErr: 'pw', loginTitel: falsch ? 'Falsches Passwort' : (neu ? 'Konto anlegen hat nicht geklappt' : 'Anmelden hat nicht geklappt'), loginText: falsch ? 'Schau nochmal nach und versuch es erneut.' : (a.grund || 'Versuch es gleich nochmal.') });
    }
    this.d.konto = { angemeldet: true, email: a.email };
    this.setState({ auth: 'in', loginErr: '', screen: 'overview' });
    this.ladeHost();
  }
  async abmelden() {
    await this.api.kontoAbmelden();
    this.d.konto = { angemeldet: false }; this.d.geraete = []; this.d.rfunde = {}; this.d.rauft = {}; this.d.ereignisse = [];
    this.setState({ auth: 'out', loginErr: '', screen: 'overview', dev: ICH, add: null });
  }
  async ladeHost() {
    if (this.S().auth !== 'in' || this._hostLaedt) return;
    this._hostLaedt = true;
    try {
      const [g, e, nachbar] = await Promise.all([this.api.hostGeraete(), this.api.hostEreignisse(100), this.api.lokalerAgent()]);
      if (g.abgemeldet) { this.d.konto = { angemeldet: false }; this.setState({ auth: 'out', loginErr: '' }); return; }
      this.d.zenOk = !!g.ok;
      if (g.ok) this.d.geraete = g.geraete;
      if (e.ok) this.d.ereignisse = e.ereignisse;
      this.d.nachbar = nachbar;
    } catch (fehler) {
      this.d.zenOk = false;
    } finally {
      this._hostLaedt = false;
    }
    const s = this.S();
    if (s.screen === 'device' && s.dev !== ICH) this.ladeGeraet(s.dev); else this.frisch();
  }
  // Funde und Auftraege eines entfernten Geraets. Solange ein Auftrag
  // unterwegs ist, alle fuenf Sekunden nachfragen.
  async ladeGeraet(id) {
    clearTimeout(this._jobBald);
    const [f, a] = await Promise.all([this.api.hostFunde(id), this.api.hostAuftraege(id)]);
    if (f.ok) this.d.rfunde[id] = f.funde;
    if (a.ok) this.d.rauft[id] = a.auftraege;
    this.frisch();
    const s = this.S();
    const unterwegs = a.ok && a.auftraege.some((x) => x.zustand === 'offen' || x.zustand === 'laeuft');
    if (unterwegs && s.screen === 'device' && s.dev === id) this._jobBald = setTimeout(() => { this.ladeGeraet(id); this.ladeHost(); }, 5000);
  }
  zeigeGeraet(id) {
    this.setState({ screen: 'device', dev: id, tab: 'funde', filter: 'alle', howto: false, moreOpen: false });
    if (id !== ICH) this.ladeGeraet(id);
  }
  async auftrag(id, art, name) {
    const a = await this.api.hostAuftrag(id, art);
    if (!a.ok) return this.say({}, a.grund || 'Der Auftrag ließ sich nicht senden.');
    this.say({}, `Auftrag an ${name} gesendet.`);
    this.ladeGeraet(id);
  }
  async kopple(system, label) {
    const a = await this.api.hostKopplung(label, system);
    if (!a.ok) return this.say({}, a.grund || 'Der Code ließ sich nicht erstellen.');
    this.setState({ add: 'code', addLabel: label, addCode: a.code });
    // Bis das neue Geraet auftaucht, oefter nachsehen.
    clearInterval(this._koppelTakt);
    let runden = 0;
    this._koppelTakt = setInterval(() => { runden += 1; if (runden > 120 || this.S().add !== 'code') clearInterval(this._koppelTakt); else this.ladeHost(); }, 5000);
  }
  async scanneAlle(win, ziele) {
    let n = 0;
    if (win && !this.d.schutzScan) { this.schutzScan('schnell'); n += 1; }
    for (const z of ziele) { const a = await this.api.hostAuftrag(z.id, 'schnellscan'); if (a.ok) n += 1; }
    this.say({}, n ? (n === 1 ? 'Schnellscan auf 1 Gerät gestartet.' : `Schnellscan auf ${n} Geräten gestartet.`) : 'Gerade lässt sich auf keinem Gerät ein Scan starten.');
    this.ladeHost();
  }
  frisch() { this.setState({ n: this.S().n + 1 }); }
  // In den ersten drei Minuten nach der Erkennung ist der Schutz meist noch
  // dabei, die Datei wegzusperren.
  frischerFund(f) { const t = Date.parse(f.zeit); return Number.isFinite(t) && Date.now() - t < 180000; }
  async lade(...was) {
    const hole = {
      info: () => this.api.info(), lage: () => this.api.lage(), autostart: () => this.api.autostart(), wache: () => this.api.wacheStatus(),
      einst: () => this.api.einstellungenLesen(), verlauf: () => this.api.verlauf(), quar: () => this.api.quarantaene(),
      schutzScan: () => this.api.schutzScanStatus().then((s) => s.laeuft),
      engine: () => this.api.engineStatus(),
    };
    await Promise.all(was.map(async (name) => {
      try {
        this.d[name] = await hole[name]();
        if (name === 'lage') {
          this.d.geprueft = new Date().toISOString();
          // Solange der Schutz noch an einem Fund arbeitet, alle 10 Sekunden
          // nachfragen statt erst in zwei Minuten.
          clearTimeout(this._bald);
          if (this.d.lage.funde.some((f) => f.offen && !f.ignoriert && this.frischerFund(f))) this._bald = setTimeout(() => this.lade('lage'), 10000);
        }
      } catch (fehler) {
        console.error('Kranich: konnte nicht laden:', name, fehler);
      }
    }));
    this.frisch();
  }
  ladeAlles() { return this.lade('info', 'einst', 'lage', 'autostart', 'wache', 'verlauf', 'quar', 'schutzScan', 'engine'); }
  beiEreignis(e) {
    if (e.art === 'scan-fortschritt') {
      this.setState({ prog: Math.round((e.nummer - 1) / Math.max(1, e.gesamt) * 100), scanFile: e.datei });
    } else if (e.art === 'download') {
      this.lade('wache');
    } else if (e.art === 'verlauf') {
      this.d.verlauf = [e.eintrag, ...this.d.verlauf];
      this.frisch();
    } else if (e.art === 'verlauf-probe') {
      this.lade('lage');
    } else if (e.art === 'testpaket') {
      setTimeout(() => this.lade('lage'), 3000);
      // Das Testpaket aus dem Tray-Menue zeigt sein Ergebnis im Reiter "Scan".
      this.d.scanErg = e.ergebnis.scan;
      this.setState({ screen: 'device', dev: ICH, tab: 'scan', scan: 'done', prog: 100, rowSt: {}, rowOpen: {}, moreOpen: false });
    } else if (e.art === 'einstellungen') {
      this.d.einst = e.einstellungen;
      this.lade('wache', 'info');
    }
  }

  // ---------------------------------------------------------------- Hinweis
  say(patch, text) {
    clearTimeout(this._tt);
    this.setState(Object.assign({}, patch || {}, { toast: text, toastN: this.S().toastN + 1 }));
    this._tt = setTimeout(() => this.setState({ toast: '' }), 4300);
  }
  spaeter(ms, funktion) { setTimeout(funktion, ms); }

  // ------------------------------------------------------------------ Scans
  async dateiScan(pfad) {
    if (!pfad) return;
    if (this.S().scan === 'run') return this.say({}, 'Es läuft schon ein Scan.');
    this.setState({ scan: 'run', prog: 0, scanFile: pfad, drag: false, screen: 'device', dev: ICH, tab: 'scan', rowSt: {}, rowOpen: {}, moreOpen: false });
    let ergebnis;
    try {
      ergebnis = await this.api.scanPfad(pfad);
    } catch (fehler) {
      ergebnis = { ok: false, grund: fehler.message };
    }
    if (!ergebnis.ok) {
      this.say({ scan: 'idle', prog: 0 }, ergebnis.grund || 'Der Scan hat nicht geklappt.');
      return;
    }
    this.d.scanErg = ergebnis;
    this.setState({ scan: ergebnis.abgebrochen ? 'idle' : 'done', prog: 100, stampN: this.S().stampN + 1 });
  }
  async waehleUndScanne() {
    this.dateiScan(await this.api.waehlePfad('frage'));
  }
  async schutzScan(art) {
    if (!this.d.info?.schutzLesbar) {
      return this.say({ screen: 'device', dev: ICH, tab: 'scan' }, 'Auf diesem System kann Kranich keinen System-Scan starten. Zieh eine Datei oder einen Ordner in den Reiter „Scan“.');
    }
    if (this.d.schutzScan) return this.say({}, 'Es läuft schon ein Scan.');
    this.d.schutzScan = art;
    this.d.sysSeit = Date.now();
    this.d.sysDone = null;
    this.frisch();
    let ergebnis;
    try {
      ergebnis = await this.api.schutzScan(art);
    } catch (fehler) {
      ergebnis = { ok: false, grund: fehler.message };
    }
    this.d.schutzScan = null;
    const sek = Math.round((Date.now() - this.d.sysSeit) / 1000);
    await this.lade('lage');
    if (!ergebnis.ok) return this.say({}, ergebnis.grund || 'Der Scan hat nicht geklappt.');
    const n = ergebnis.neueFunde.length;
    // Das Ergebnis bleibt als Zeile stehen, bis der naechste Scan startet.
    this.d.sysDone = { art, sek, n };
    this.setState({ stampN: this.S().stampN + 1 });
  }

  async probealarm() {
    if (this.S().probe === 'run') return;
    this.setState({ probe: 'run' });
    let e;
    try {
      e = await this.api.probealarm();
    } catch (fehler) {
      e = { ok: false, grund: fehler.message };
    }
    if (!e.ok) return this.say({ probe: '' }, `Probealarm hat nicht geklappt: ${e.grund}`);
    const text = e.durch === 'kranich' ? 'Kranich hat die Testdatei erkannt und gleich wieder entfernt.' : 'Der Schutz des Systems war schneller und hat die Testdatei abgefangen. Auch das zeigt: Der Schutz funktioniert.';
    this.say({ probe: 'ok', probeText: text }, 'Probealarm erkannt.');
    setTimeout(() => this.lade('lage'), 3000);
  }

  // ------------------------------------------------------------ Quarantaene
  async inQuarantaene(art, id, pfad, grund, name, sha256) {
    const feld = art === 'zeile' ? 'rowSt' : 'fundSt';
    const antwort = await this.api.quarantaeneVerschieben(pfad, grund);
    if (!antwort.ok) return this.say({}, `${name} konnte nicht weggesperrt werden: ${antwort.grund}`);
    this.lade('engine');
    this.setState({ [feld]: Object.assign({}, this.S()[feld], { [id]: 'qing' }) });
    this.spaeter(art === 'zeile' ? 600 : 0, async () => {
      await this.lade('quar');
      this.say({ [feld]: Object.assign({}, this.S()[feld], { [id]: 'q' }), qHopN: this.S().qHopN + 1 }, `${name} liegt jetzt in Quarantäne.`);
    });
  }
  loescheEndgueltig(id, name) {
    this.setState({ dialog: null, quarDying: Object.assign({}, this.S().quarDying, { [id]: true }) });
    this.spaeter(550, async () => {
      const antwort = await this.api.quarantaeneLoeschen(id);
      await this.lade('quar');
      this.say({}, antwort.ok ? `${name} wurde endgültig gelöscht.` : antwort.grund);
    });
  }
  async stelleWiederHer(id, name) {
    const antwort = await this.api.quarantaeneWiederherstellen(id);
    await this.lade('quar', 'engine');
    this.say({}, antwort.ok ? `${name} wurde wiederhergestellt.` : antwort.grund);
  }

  // ------------------------------------------------------------------ Werte
  renderVals() {
    const s = this.S();
    const d = this.d || {};
    const I = SYMBOL;
    const set = (o) => () => this.setState(o);
    const bald = (text) => () => this.say({}, text);

    const K = {
      ok: { bg: '#e0f3e4', fg: '#17663a', ico: I.ok }, warn: { bg: '#fff0b8', fg: '#6e5200', ico: I.warn }, bad: { bg: '#fde2df', fg: '#a5221b', ico: I.bad },
      off: { bg: '#ecebe6', fg: '#4a4f5e', ico: I.off }, unk: { bg: '#ecebe6', fg: '#4a4f5e', ico: I.unk }, none: { bg: '#ecebe6', fg: '#4a4f5e', ico: I.dash },
      scan: { bg: '#f1edfd', fg: '#4a2f9a', ico: I.scan }, quar: { bg: '#ecebe6', fg: '#4a4f5e', ico: I.box },
    };
    const chip = (k, text) => Object.assign({ text }, K[k]);
    const VT = { ok: 'sauber', warn: 'verdächtig', bad: 'schädlich', unk: 'unbekannt', none: 'nicht geprüft' };
    const URTEIL = { sauber: 'ok', unauffaellig: 'ok', verdaechtig: 'warn', schaedlich: 'bad', unbekannt: 'unk', nicht_geprueft: 'none' };
    const WORT = { sauber: 'sauber', unauffaellig: 'unauffällig', verdaechtig: 'verdächtig', schaedlich: 'schädlich', unbekannt: 'unbekannt', nicht_geprueft: 'nicht geprüft' };
    const pill = (on) => on ? 'background: #4a2f9a; color: #ffffff; border-color: #4a2f9a' : 'background: #fffdf8; color: #1d2742; border-color: #1d2742';
    const tabDyn = (on) => on ? 'background: #1d2742; color: #ffffff; font-weight: 800' : 'background: transparent; color: #1d2742; font-weight: 500';
    const picks = (liste, cur, key) => liste.map((f) => Object.assign({}, f, { on: f.id === cur, dyn: pill(f.id === cur), pick: set({ [key]: f.id }) }));
    const schalter = (on, flip) => ({ on, flip, track: on ? '#6243c4' : '#8a8f9c', knob: on ? '20px' : '0px', label: on ? 'An' : 'Aus' });

    const info = d.info || { plattform: '', name: 'Dieses Gerät', schutzLesbar: false, autostartLesbar: false };
    const einst = d.einst || { mitSystemStarten: true, imTrayWeiterlaufen: true, wacheAn: true, benachrichtigungen: {}, vtHinterlegt: false };
    const laedt = !d.lage;
    const lage = d.lage || { verfuegbar: false, status: null, funde: [], ampel: { stufe: 'unbekannt', gruende: [] } };
    const st = lage.status;
    const win = info.schutzLesbar;
    const mac = info.plattform === 'darwin';
    const einstellen = (teil) => async () => { this.d.einst = await this.api.einstellungenSetzen(teil); this.frisch(); };

    // --- Funde des Schutzes ---------------------------------------------------
    const FST = { laeuft: chip('scan', 'Wird bearbeitet'), offen: chip('bad', 'Offen'), stop: chip('ok', 'Gestoppt'), quar: chip('ok', 'In Quarantäne'), weg: chip('none', 'Entfernt'), ign: chip('none', 'Ignoriert') };
    const ZU = { in_quarantaene: 'quar', blockiert: 'stop', bereinigt: 'stop', entfernt: 'weg', zugelassen: 'ign' };
    const FTEXT = {
      quar: 'Der Schutz hat die Datei gestoppt und weggesperrt. Du musst nichts tun.',
      stop: 'Der Schutz hat die Datei gestoppt. Du musst nichts tun.',
      weg: 'Der Schutz hat die Datei entfernt. Du musst nichts tun.',
      laeuft: 'Der Schutz hat die Datei erkannt und kümmert sich gerade darum. Einen Moment.',
      offen: 'Der Schutz hat die Datei erkannt, aber nicht weggesperrt. Schau sie dir an und entscheide.',
      ign: 'Du hast entschieden, die Datei zu behalten.',
    };
    const fundeIch = lage.funde.map((f) => {
      const hier = s.fundSt[f.kennung];
      const grund = f.ignoriert || hier === 'i' ? 'ign' : (hier === 'q' || hier === 'qing' ? 'quar' : (f.offen ? (this.frischerFund(f) ? 'laeuft' : 'offen') : (ZU[f.zustand] || 'stop')));
      const offen = !!s.fundOpen[f.kennung];
      const pfad = f.pfade[0] || '';
      const datei = dateiname(pfad) || 'Datei unbekannt';
      return {
        id: f.kennung, threat: f.name, file: datei, st: FST[grund], time: wann(f.zeit),
        text: hier === 'q' || hier === 'qing' ? 'Du hast die Datei weggesperrt. Du musst nichts weiter tun.' : FTEXT[grund],
        canAct: grund === 'offen', open: offen, path: f.pfade.join(', ') || 'unbekannt', sev: f.schwere, src: 'Schutz', spin: hier ? 'kSpinA .35s 1' : 'none',
        q: () => (pfad ? this.inQuarantaene('fund', f.kennung, pfad, f.name, datei) : this.say({}, 'Der Schutz hat keinen Dateipfad gemeldet. Öffne die Windows-Sicherheit, um die Datei zu entfernen.')),
        i: async () => { await this.api.fundIgnorieren(f.kennung); this.setState({ fundSt: Object.assign({}, this.S().fundSt, { [f.kennung]: 'i' }) }); },
        d: set({ fundOpen: Object.assign({}, s.fundOpen, { [f.kennung]: !offen }) }),
      };
    });
    const offeneFunde = fundeIch.filter((f) => f.canAct);
    const openN = offeneFunde.length;

    // --- Autostart ---------------------------------------------------------
    const auto = d.autostart || { verfuegbar: false, eintraege: [] };
    const HERKUNFT = { autostart: 'Autostart', aufgabe: 'Geplante Aufgabe', dienst: 'Dienst' };
    const programm = (befehl) => {
      const text = String(befehl).trim();
      const m = text.match(/^"([^"]+)"/) || text.match(/^(.+?\.(?:exe|com|bat|cmd|ps1|vbs|js|msi))(?=\s|$)/i) || text.match(/^(\S+)/);
      return m ? m[1] : '';
    };
    // Lange Pfade in der Mitte kuerzen, Anfang und Ende bleiben lesbar.
    const kurz = (pfad) => (pfad.length <= 38 ? pfad : pfad.slice(0, 14) + ' … ' + pfad.slice(-20));
    const autoAll = auto.eintraege.map((e) => {
      const exe = programm(e.befehl);
      return {
        id: e.schluessel, name: e.name, origin: HERKUNFT[e.herkunft] || e.herkunft, vendor: dateiname(exe) || '–', since: kurz(ordner(exe) || e.ort || '–'),
        isNew: e.neu, edit: true, ro: false, newEdit: e.neu, unk: /\\(appdata|temp|users\\public|programdata)\\/i.test(exe), dyn: 'opacity: 1', tLabel: 'Im Ordner zeigen',
        know: async () => { await this.api.autostartAlsBekannt(e.schluessel); await this.lade('autostart'); },
        toggle: exe ? () => this.api.zeigeImOrdner(exe) : bald('Zu diesem Eintrag ist kein Programm bekannt.'),
      };
    });
    const neueAuto = autoAll.filter((x) => x.isNew).length;
    const autoRows = autoAll.filter((x) => s.filter === 'neu' ? x.isNew : (s.filter === 'unk' ? x.unk : true)).sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));

    // --- Lage: 2 = Fund, 1 = Warnung, 0 = ruhig -----------------------------------
    const protOff = win && !!st && !(st.dienst && st.antivirus && st.echtzeit) && !/passive|not running/i.test(st.modus || '');
    const warnungen = [];
    if (win && lage.verfuegbar) for (const g of lage.ampel.gruende) if (!/offene[rn]? Fund/.test(g)) warnungen.push(g);
    if (win && !laedt && !st) warnungen.push('Der Schutz von Windows antwortet nicht');
    if (neueAuto) warnungen.push(neueAuto === 1 ? 'Es gibt einen neuen Autostart-Eintrag' : `Es gibt ${neueAuto} neue Autostart-Einträge`);
    const r = openN ? 2 : (warnungen.length ? 1 : 0);
    if (this._r !== r) { this._rN = (this._rN || 0) + 1; this._r = r; }
    const changed = this._rN > 1;
    const spin = changed ? (this._rN % 2 ? 'kSpinA .35s 1' : 'kSpinB .35s 1') : 'none';

    let heroTitel; let heroText;
    if (laedt) { heroTitel = 'Einen Moment'; heroText = 'Kranich schaut nach …'; }
    else if (r === 2) {
      heroTitel = openN === 1 ? '1 Fund' : `${openN} Funde`;
      heroText = `„${offeneFunde[0].file}“ wartet auf deine Entscheidung.` + (openN > 1 ? ` Dazu ${openN - 1} weitere.` : '') + (warnungen.length ? ` Außerdem: ${warnungen[0]}.` : '');
    } else if (r === 1) {
      heroTitel = warnungen.length === 1 ? '1 Warnung' : `${warnungen.length} Warnungen`;
      heroText = warnungen.join('. ') + '.';
    } else if (win) { heroTitel = 'Alles sicher'; heroText = 'Der Schutz läuft, die Erkennungsliste ist aktuell und es gibt keine offenen Funde.'; }
    else { heroTitel = 'Keine Funde'; heroText = 'Auf diesem System kann Kranich den Schutz des Systems noch nicht auslesen. Datei-Scan und Download-Wache laufen.'; }

    // --- Dieses Geraet ---------------------------------------------------------
    const IND = { ok: '#17663a', bad: '#a5221b', warn: '#6e5200', neutral: '#4a4f5e' };
    const ind = (k, ico, text) => ({ fg: IND[k], ico, text });
    const letzter = st ? [st.letzterSchnellScan, st.letzterVollScan].filter(Boolean).sort().pop() : null;
    const scanText = d.schutzScan ? 'Scan läuft …' : (letzter ? `Letzter Scan: ${wann(letzter)}` : 'Noch nie gescannt');
    const alter = st ? st.signaturAlterTage : null;
    const indikatoren = win && st ? [
      protOff ? ind('bad', I.bad, 'Schutz ist aus') : (/passive|not running/i.test(st.modus || '') ? ind('warn', I.warn, 'Anderer Virenschutz aktiv') : ind('ok', I.ok, 'Schutz läuft')),
      alter === null ? ind('neutral', I.unk, 'Erkennungsliste: unbekannt') : (alter >= 3 ? ind(alter >= 14 ? 'bad' : 'warn', I.warn, `Erkennungsliste: ${alter} Tage alt`) : ind('ok', I.ok, alter === 0 ? 'Erkennungsliste: heute' : (alter === 1 ? 'Erkennungsliste: gestern' : `Erkennungsliste: ${alter} Tage alt`))),
      ind('neutral', I.clock, scanText),
    ] : [ind('neutral', I.unk, win ? 'Schutz wird abgefragt …' : 'Schutz des Systems wird noch nicht ausgelesen')];

    const name = info.name;
    const ren = s.renaming === ICH;
    const ich = {
      id: ICH, name, os: info.plattform === 'win32' ? 'Windows' : (mac ? 'macOS' : 'Linux'), kind: mac || !win ? 'mac' : 'win',
      prot: win ? 'Voller Schutz' : 'Eigene Prüfung', ico: I.pc,
      st: laedt ? chip('unk', 'Wird geprüft') : (r === 2 ? chip('bad', heroTitel) : (protOff ? chip('warn', 'Schutz aus') : (r === 1 ? chip('warn', heroTitel) : chip('ok', win ? 'Sicher' : 'Keine Funde')))),
      scan: win ? scanText : 'Datei-Scan und Download-Wache',
      me: true, offB: false, protOff, hasOpen: openN > 0, openText: openN === 1 ? '1 offener Fund' : `${openN} offene Funde`, desk: true, android: false, ind: indikatoren,
      online: 'Online', dyn: 'opacity: 1', delay: '0ms', cutDelay: '300ms', spin,
      go: () => this.zeigeGeraet(ICH),
      ren, notRen: !ren, canRemove: false,
      type: (e) => { this._ren = e.target.value; },
      renStart: () => { this._ren = ''; this.setState({ renaming: ICH }); },
      renDone: async () => { const v = (this._ren || '').trim(); this._ren = ''; this.setState({ renaming: null }); if (v) await einstellen({ geraeteName: v })(); },
      remove: bald('Dieses Gerät kann nicht entfernt werden.'),
    };
    ich.osLine = ich.os;

    // --- Geraete aus der Zentrale -------------------------------------------------
    const vor = (iso) => {
      const t = Date.parse(iso); if (!Number.isFinite(t)) return 'noch nie';
      const min = Math.max(0, Math.round((Date.now() - t) / 60000));
      if (min < 2) return 'gerade eben';
      if (min < 60) return `vor ${min} Min.`;
      if (min < 2880) return `vor ${Math.round(min / 60)} Std.`;
      return `vor ${Math.round(min / 1440)} Tagen`;
    };
    const fmt = (n) => Math.floor(n / 60) + ':' + (n % 60 < 10 ? '0' : '') + (n % 60);
    const SYS = {
      windows: { os: 'Windows', ico: I.pc, kind: 'win', desk: true }, macos: { os: 'macOS', ico: I.laptop, kind: 'mac', desk: true },
      android: { os: 'Android', ico: I.phone, kind: 'android', desk: false }, ios: { os: 'iOS', ico: I.tablet, kind: 'ios', desk: false },
    };
    const nachbarId = d.nachbar ? d.nachbar.geraetId : null;
    const zeile = (d.geraete || []).find((g) => g.id === nachbarId);
    // Laeuft auf diesem Rechner ein gekoppelter Agent, ist es dasselbe Geraet.
    Object.assign(ich, { scanning: !!d.schutzScan, local: true, remote: false, remoteDesk: false, hasAgent: !!zeile, agent: zeile ? `Agent ${zeile.version || ''} · zuletzt gemeldet ${vor(zeile.zuletzt_gesehen)}`.replace('  ', ' ') : '', offText: '' });
    const fern = (d.geraete || []).filter((g) => g.id !== nachbarId).map((g, i) => {
      const y = SYS[g.system] || SYS.windows;
      const rs = g.status || null;
      const off = !g.zuletzt_gesehen || Date.now() - Date.parse(g.zuletzt_gesehen) > 12 * 60000;
      const aus = !!rs && !(rs.dienst && rs.antivirus && rs.echtzeit) && !/passive|not running/i.test(rs.modus || '');
      const n = g.offene_funde || 0;
      const gruende = (Array.isArray(g.ampel_gruende) ? g.ampel_gruende : []).filter((t) => !/offene[rn]? Fund/.test(t));
      const letzterR = rs ? [rs.letzterSchnellScan, rs.letzterVollScan].filter(Boolean).sort().pop() : null;
      const scanR = g.scan_laeuft ? 'Scan läuft …' : (letzterR ? `Letzter Scan: ${wann(letzterR)}` : (y.desk ? 'Noch nie gescannt' : 'Meldet nur seinen Stand'));
      const alterR = rs ? rs.signaturAlterTage : null;
      const renR = s.renaming === g.id;
      return {
        id: g.id, name: g.name, os: y.os, osLine: y.os, kind: y.kind, ico: y.ico, prot: y.desk ? 'Voller Schutz' : 'Nur Status',
        st: off ? chip('off', 'Offline') : (n ? chip('bad', n === 1 ? '1 Fund' : `${n} Funde`) : (aus ? chip('warn', 'Schutz aus') : (g.ampel === 'kritisch' || g.ampel === 'warnung' ? chip('warn', 'Warnung') : (g.ampel === 'ok' ? chip('ok', 'Sicher') : chip('unk', 'Wartet auf Meldung'))))),
        scan: scanR, me: false, offB: off, protOff: aus && !off, hasOpen: n > 0, openN: n, openText: n === 1 ? '1 offener Fund' : `${n} offene Funde`, desk: y.desk, android: y.kind === 'android',
        warn: off ? [] : gruende,
        ind: rs ? [
          aus ? ind('bad', I.bad, 'Schutz ist aus') : ind('ok', I.ok, 'Schutz läuft'),
          alterR === null || alterR === undefined ? ind('neutral', I.unk, 'Erkennungsliste: unbekannt') : (alterR >= 3 ? ind(alterR >= 14 ? 'bad' : 'warn', I.warn, `Erkennungsliste: ${alterR} Tage alt`) : ind('ok', I.ok, alterR === 0 ? 'Erkennungsliste: heute' : (alterR === 1 ? 'Erkennungsliste: gestern' : `Erkennungsliste: ${alterR} Tage alt`))),
          ind('neutral', I.clock, scanR),
        ] : [ind('neutral', I.unk, 'Noch keine Meldung von diesem Gerät')],
        online: off ? `zuletzt ${vor(g.zuletzt_gesehen)}` : 'Online', dyn: off ? 'opacity: .72' : 'opacity: 1', delay: `${(i + 1) * 80}ms`, cutDelay: `${300 + (i + 1) * 80}ms`, spin: 'none',
        scanning: !!g.scan_laeuft, local: false, remote: true, remoteDesk: y.desk, hasAgent: y.kind !== 'ios',
        agent: `Agent ${g.version || ''} · zuletzt gemeldet ${vor(g.zuletzt_gesehen)}`.replace('  ', ' '),
        offText: `Dieses Gerät meldet sich seit ${vor(g.zuletzt_gesehen).replace(/^vor /, '')} nicht. Die Daten unten sind der letzte bekannte Stand.`.replace('seit noch nie nicht', 'noch nicht').replace('seit gerade eben nicht', 'gerade nicht'),
        go: () => this.zeigeGeraet(g.id),
        ren: renR, notRen: !renR, canRemove: true,
        type: (e) => { this._ren = e.target.value; },
        renStart: () => { this._ren = ''; this.setState({ renaming: g.id }); },
        renDone: async () => { const v = (this._ren || '').trim(); this._ren = ''; this.setState({ renaming: null }); if (v) { const a = await this.api.hostUmbenennen(g.id, v); if (!a.ok) this.say({}, a.grund); await this.ladeHost(); } },
        remove: async () => { const a = await this.api.hostEntfernen(g.id); await this.ladeHost(); this.say(s.dev === g.id ? { screen: 'overview', dev: ICH } : {}, a.ok ? `${g.name} ist entfernt. Der Agent dort meldet sich ab.` : a.grund); },
      };
    });
    const devs = [ich].concat(fern);
    const cur = devs.find((x) => x.id === s.dev) || ich;
    const nameVon = (id) => (id === nachbarId ? name : ((d.geraete || []).find((g) => g.id === id) || { name: 'Entferntes Gerät' }).name);

    // Funde des gezeigten Geraets. Bei einem entfernten Geraet nur zum Lesen.
    const funde = cur.me ? fundeIch : (d.rfunde[cur.id] || []).map((f) => {
      const grund = f.offen ? 'offen' : (ZU[f.zustand] || 'stop');
      const offen = !!s.fundOpen[f.schluessel];
      const pfade = Array.isArray(f.pfade) ? f.pfade : [];
      return {
        id: f.schluessel, threat: f.name, file: dateiname(pfade[0]) || 'Datei unbekannt', st: FST[grund], time: wann(f.erkannt || f.gemeldet),
        text: grund === 'offen' ? 'Der Schutz hat die Datei erkannt, aber nicht weggesperrt. Entscheiden kannst du direkt an diesem Gerät.' : FTEXT[grund],
        canAct: false, open: offen, path: pfade.join(', ') || 'unbekannt', sev: f.schwere || 'unbekannt', src: 'Schutz', spin: 'none',
        q: () => {}, i: () => {}, d: set({ fundOpen: Object.assign({}, s.fundOpen, { [f.schluessel]: !offen }) }),
      };
    });

    // --- Lage ueber alle Geraete ------------------------------------------------
    const fernOffen = fern.reduce((n, g) => n + g.openN, 0);
    const fernWarn = [];
    for (const g of fern) { if (g.protOff) fernWarn.push(`Auf ${g.name} läuft der Schutz nicht`); else for (const t of g.warn) fernWarn.push(`${g.name}: ${t}`); }
    const offline = fern.filter((g) => g.offB);
    const alleOffen = openN + fernOffen;
    const alleWarn = warnungen.concat(fernWarn);
    const R = alleOffen ? 2 : (alleWarn.length ? 1 : 0);
    let HT = heroTitel; let HX = heroText; let heroDev = ICH; let heroTab = r === 2 ? 'funde' : (neueAuto && !protOff ? 'auto' : 'funde');
    if (!laedt && fern.length) {
      const mitFund = fern.find((g) => g.openN > 0);
      if (R === 2) {
        HT = alleOffen === 1 ? '1 Fund' : `${alleOffen} Funde`;
        if (!openN) { heroDev = mitFund.id; heroTab = 'funde'; HX = `Auf ${mitFund.name} ${mitFund.openN === 1 ? 'wartet 1 Fund' : `warten ${mitFund.openN} Funde`} auf deine Entscheidung.` + (alleWarn.length ? ` Außerdem: ${alleWarn[0]}.` : ''); }
        else if (fernOffen) HX += ` Dazu ${fernOffen === 1 ? '1 Fund' : `${fernOffen} Funde`} auf anderen Geräten.`;
      } else if (R === 1) {
        HT = alleWarn.length === 1 ? '1 Warnung' : `${alleWarn.length} Warnungen`;
        HX = alleWarn.join('. ') + '.';
        if (!warnungen.length) { const g = fern.find((x) => x.protOff || x.warn.length); heroDev = g.id; heroTab = 'funde'; }
      } else {
        const wach = devs.length - offline.length;
        HT = 'Alles sicher';
        HX = `Auf ${wach === 1 ? '1 Gerät' : `${wach} Geräten`} läuft der Schutz, es gibt keine offenen Funde.` + (offline.length ? ` ${offline.map((g) => g.name).join(', ')} ${offline.length === 1 ? 'ist' : 'sind'} offline.` : '');
      }
    }

    // --- System-Scan: Laufzeit statt Füllstand, der Schutz nennt keinen Fortschritt
    const SCAN = { schnell: 'Schnellscan', voll: 'Vollscan', schnellscan: 'Schnellscan', vollscan: 'Vollscan', erkennungsliste: 'Erkennungsliste holen', melden: 'Melden' };
    const laufSek = d.schutzScan && d.sysSeit ? Math.max(0, Math.round((Date.now() - d.sysSeit) / 1000)) : 0;
    const fertigText = (x) => `${SCAN[x.art]} fertig nach ${fmt(x.sek)} · ${x.n ? (x.n === 1 ? '1 neuer Fund' : `${x.n} neue Funde`) : 'nichts gefunden'}`;
    const hinweis = (art) => (/voll/.test(art) ? 'Kann über eine Stunde dauern. Du kannst weiterarbeiten.' : 'Dauert meist 2 bis 5 Minuten. Du kannst weiterarbeiten.');
    const auftraege = cur.me ? [] : (d.rauft[cur.id] || []);
    const laufend = auftraege.find((x) => x.zustand === 'laeuft');
    let sys = { run: false, done: false, title: '', time: '', hint: '', doneText: '', found: false, go: set({ tab: 'funde' }) };
    if (cur.me && d.schutzScan) sys = Object.assign(sys, { run: true, title: `${SCAN[d.schutzScan]} läuft`, time: `seit ${fmt(laufSek)}`, hint: hinweis(d.schutzScan) });
    else if (cur.me && d.sysDone) sys = Object.assign(sys, { done: true, doneText: fertigText(d.sysDone), found: d.sysDone.n > 0 });
    else if (!cur.me && cur.scanning) {
      const seitR = laufend ? Math.max(0, Math.round((Date.now() - Date.parse(laufend.erstellt)) / 1000)) : null;
      sys = Object.assign(sys, { run: true, title: `${laufend ? SCAN[laufend.art] : 'Scan'} läuft`, time: seitR === null ? 'am Gerät gestartet' : `seit ${fmt(seitR)}`, hint: hinweis(laufend ? laufend.art : '') });
    }
    const sysLines = [];
    if (d.schutzScan) sysLines.push({ dev: name, run: true, text: `${SCAN[d.schutzScan]} läuft · seit ${fmt(laufSek)}`, found: false, go: () => this.zeigeGeraet(ICH) });
    else if (d.sysDone) sysLines.push({ dev: name, run: false, text: fertigText(d.sysDone), found: d.sysDone.n > 0, go: () => this.zeigeGeraet(ICH) });
    for (const g of fern) if (g.scanning && !g.offB) sysLines.push({ dev: g.name, run: true, text: 'Scan läuft', found: false, go: g.go });

    // --- Auftrag an ein entferntes Geraet -----------------------------------------
    const job = auftraege.find((x) => x.art !== 'melden' && Date.now() - Date.parse(x.erstellt) < 86400000);
    let jobChip = chip('scan', 'Auftrag gesendet');
    if (job) {
      const e = job.ergebnis || {};
      if (job.zustand === 'offen') jobChip = cur.offB ? chip('off', 'Gerät ist offline, Auftrag wartet') : chip('scan', 'Auftrag gesendet');
      else if (job.zustand === 'laeuft') jobChip = chip('scan', 'Gerät arbeitet');
      else if (job.zustand === 'erledigt') jobChip = chip('ok', `Fertig ${wann(job.erledigt_am)}` + (typeof e.neueFunde === 'number' ? (e.neueFunde ? ` · ${e.neueFunde === 1 ? '1 neuer Fund' : `${e.neueFunde} neue Funde`}` : ' · nichts gefunden') : ''));
      else jobChip = chip('warn', e.grund || (job.zustand === 'abgelehnt' ? 'Vom Gerät abgelehnt' : 'Hat nicht geklappt'));
    }
    const unterwegs = !!job && (job.zustand === 'offen' || job.zustand === 'laeuft');
    const sende = (art) => () => (unterwegs ? this.say({}, 'Es ist schon ein Auftrag unterwegs.') : this.auftrag(cur.id, art, cur.name));

    const tabsBase = cur.me
      ? [{ id: 'funde', label: openN ? `Funde ${openN}` : 'Funde' }, { id: 'scan', label: 'Scan' }, { id: 'auto', label: mac ? 'Anmeldeobjekte' : 'Autostart' }, { id: 'dl', label: 'Downloads' }]
      : [{ id: 'funde', label: cur.openN ? `Funde ${cur.openN}` : 'Funde' }];
    const tab = tabsBase.some((t) => t.id === s.tab) ? s.tab : 'funde';
    const tabs = tabsBase.map((t) => Object.assign({}, t, { on: t.id === tab, dyn: tabDyn(t.id === tab), pick: set({ tab: t.id }) }));

    // --- Datei-Scan ----------------------------------------------------------
    const run = s.scan === 'run';
    const erg = d.scanErg;
    const alleZeilen = erg ? erg.ergebnisse : [];
    const kenntNicht = (e) => e.hinweise.some((h) => h.includes('VirusTotal kennt diese Datei nicht'));
    const auffaellig = (e) => e.urteil === 'schaedlich' || e.urteil === 'verdaechtig' || (e.urteil === 'unbekannt' && kenntNicht(e));
    const quelle = (e) => {
      if (e.regel) return `Kranich-Engine · Regel: ${e.regel}`;
      if (e.treffer) return `VirusTotal · ${e.treffer.boesartig} von ${e.treffer.gesamt} Scannern`;
      const tarn = e.hinweise.find((h) => /Dateiendung|Leerzeichen|Versteckte/.test(h));
      if (tarn) return `Dateiname · ${tarn.replace(/^Doppelte/, 'doppelte')}`;
      return kenntNicht(e) ? 'VirusTotal · kennt die Datei nicht' : 'Ohne zweite Meinung';
    };
    const rawRows = alleZeilen.filter(auffaellig).filter((e) => s.rowSt[e.pfad] !== 'q');
    const scanRows = rawRows.map((e, i) => {
      const hier = s.rowSt[e.pfad]; const offen = !!s.rowOpen[e.pfad];
      return {
        id: e.pfad, name: e.name, path: ordner(e.pfad), v: chip(URTEIL[e.urteil], WORT[e.urteil]), src: quelle(e),
        why: (e.gruende && e.gruende.length ? e.gruende : ['Keine weiteren Hinweise']).slice(0, 4).map((t, n) => ({ id: n, t })), hash: e.sha256 || 'nicht berechnet',
        canAct: !hier, acted: hier === 'i' || hier === 'fa', actedText: hier === 'fa' ? 'Fehlalarm' : 'Ignoriert', open: offen,
        fa: async () => {
          const antwort = e.sha256 ? await this.api.eintragMerken('fehlalarm', e.sha256, e.name) : { ok: false };
          if (!antwort.ok) return this.say({}, 'Das ließ sich nicht merken.');
          this.lade('engine');
          this.say({ rowSt: Object.assign({}, this.S().rowSt, { [e.pfad]: 'fa' }) }, `${e.name} ist als Fehlalarm gemerkt. Kranich meldet die Datei nicht mehr.`);
        },
        anim: hier === 'qing' ? 'kToQuar .6s ease-in forwards' : `kRowIn .25s ${i * 120}ms both`,
        q: () => this.inQuarantaene('zeile', e.pfad, e.pfad, quelle(e), e.name, e.sha256),
        i: set({ rowSt: Object.assign({}, s.rowSt, { [e.pfad]: 'i' }) }),
        d: set({ rowOpen: Object.assign({}, s.rowOpen, { [e.pfad]: !offen }) }),
      };
    });
    const attn = rawRows.filter((e) => !s.rowSt[e.pfad]).length;
    const scanSum = attn === 0 ? 'Nichts Auffälliges gefunden.' : (attn === 1 ? '1 Datei braucht deine Aufmerksamkeit.' : `${attn} Dateien brauchen deine Aufmerksamkeit.`);
    const ruhig = alleZeilen.filter((e) => !auffaellig(e));
    const sauber = ruhig.filter((e) => e.urteil === 'sauber' || e.urteil === 'unauffaellig').length;
    const moreRows = ruhig.slice(0, 5).map((e, i) => ({ id: i, name: e.name, v: chip(URTEIL[e.urteil] === 'ok' ? 'ok' : 'none', WORT[e.urteil] || VT.none) }));
    const moreTitel = ruhig.length === 0 ? 'Keine weiteren Dateien' : (ruhig.length === 1 ? '1 weitere Datei ohne Befund' : `${ruhig.length} weitere Dateien ohne Befund`);
    const vtHinweis = erg && erg.vtLimit ? 'VirusTotal-Tageslimit erreicht, morgen wieder möglich. Bis dahin prüft Kranich nur mit den eigenen Regeln.'
      : '';

    // --- Downloads ------------------------------------------------------------
    const wache = d.wache || { an: false, ordner: '', dateien: [] };
    const watch = schalter(wache.an, einstellen({ wacheAn: !wache.an }));
    const dlRows = wache.dateien.map((e, i) => {
      const k = URTEIL[e.urteil] || 'unk';
      const hint = k === 'bad' || k === 'warn' ? ((e.gruende && e.gruende[0]) || e.hinweise[0] || '') : '';
      return { id: e.pfad + i, name: e.name, src: e.regel ? 'Kranich-Engine' : (e.treffer ? 'VirusTotal' : '–'), v: chip(k, WORT[e.urteil] || VT[k]), time: wann(e.zeit, true), flag: !!hint, hint,
        dyn: hint ? (k === 'bad' ? 'background: #fdf0ee' : 'background: #fff8dc') : 'background: transparent' };
    });

    // --- Quarantaene ----------------------------------------------------------
    const eigene = (d.quar || []).map((q) => ({
      id: q.id, file: q.name, dev: name, path: ordner(q.ursprung), why: q.grund || 'Von dir weggesperrt', date: wann(q.zeit),
      anim: s.quarDying[q.id] ? 'kCrumple .55s ease-in forwards' : 'none',
      restore: () => this.stelleWiederHer(q.id, q.name), del: set({ dialog: q.id }),
    }));
    const vomSchutz = lage.funde.filter((f) => f.zustand === 'in_quarantaene').map((f) => ({
      id: 'schutz_' + f.kennung, file: dateiname(f.pfade[0]) || f.name, dev: name, path: ordner(f.pfade[0]) || 'unbekannt', why: `${f.name} · vom Schutz weggesperrt`, date: wann(f.zeit), anim: 'none',
      restore: async () => { await this.api.oeffneSchutz(); this.say({}, 'Diese Datei liegt in der Quarantäne von Windows. Dort unter „Schutzverlauf“ kannst du sie wiederherstellen.'); },
      del: async () => { await this.api.oeffneSchutz(); this.say({}, 'Diese Datei liegt in der Quarantäne von Windows. Dort unter „Schutzverlauf“ kannst du sie entfernen.'); },
    }));
    const quar = eigene.concat(vomSchutz);
    const dlg = eigene.find((q) => q.id === s.dialog) || { file: '', id: '' };

    // --- Verlauf --------------------------------------------------------------
    const TY = { fund: chip('bad', 'Fund'), warn: chip('warn', 'Warnung'), scan: chip('scan', 'Scan'), quar: chip('quar', 'Quarantäne') };
    const FERN = { fund: 'fund', autostart: 'warn', scan: 'scan', gekoppelt: 'scan' };
    const EV = (d.verlauf || []).map((e, i) => ({ id: e.zeit + i, t: Date.parse(e.zeit) || 0, devId: ICH, type: e.art, time: wann(e.zeit), text: e.text, chip: TY[e.art] || TY.scan, dev: name }))
      .concat((d.ereignisse || []).filter((e) => e.geraet_id !== nachbarId).map((e) => ({ id: 'z' + e.id, t: Date.parse(e.zeit) || 0, devId: e.geraet_id, type: FERN[e.art] || 'scan', time: wann(e.zeit), text: e.inhalt, chip: TY[FERN[e.art]] || TY.scan, dev: nameVon(e.geraet_id) })))
      .sort((a, b) => b.t - a.t);
    const hist = EV.filter((e) => (s.hType === 'alle' || e.type === s.hType) && (s.hDev === 'alle' || e.devId === s.hDev));

    // --- Figur und Stempel -------------------------------------------------------
    const pose = R === 2 ? 'fund' : (R === 1 ? 'warn' : 'ruhe');
    const POSE = {
      ruhe: { label: 'Kranich steht ruhig', neck: 'rotate(0deg) scale(1)', wing: 'rotate(0deg) scaleY(1)', w2: 'scaleY(0.05)', w2o: '0', dur: '.5s' },
      warn: { label: 'Kranich hebt den Kopf', neck: 'rotate(-6deg) scale(1.25)', wing: 'rotate(-6deg) scaleY(1.2)', w2: 'scaleY(0.05)', w2o: '0', dur: '.3s' },
      fund: { label: 'Kranich breitet die Flügel aus', neck: 'rotate(8deg) scale(1.08)', wing: 'rotate(-16deg) scaleY(2.2)', w2: 'scaleY(1)', w2o: '1', dur: '.35s' },
    };
    const sucht = run || !!d.schutzScan;
    const headIdle = pose === 'ruhe' ? 'kTilt 10s ease-in-out infinite' : (pose === 'warn' ? 'kScan .7s .3s 1' : 'none');
    const k = Object.assign({}, POSE[pose], {
      peek: () => { this._peekAt = this._rN; this.setState({ peekN: this.S().peekN + 1 }); },
      head: (s.peekN && this._peekAt === this._rN) ? (s.peekN % 2 ? 'kLookA .5s 1' : 'kLookB .5s 1') : headIdle,
      neckAnim: sucht ? 'kPeck .7s ease-in-out infinite' : 'none',
      body: sucht ? 'none' : (pose === 'ruhe' && changed ? 'kShake .4s .5s 1' : 'none'),
    });
    const stampP = ((this._rN || 0) + s.stampN) % 2 ? 'kStampA' : 'kStampB';
    const um = d.geprueft ? 'heute ' + wann(d.geprueft, true) : '';
    const stamp = Object.assign(
      R === 2 ? { fg: '#a5221b', ico: I.bad, a: 'Fund', b: um } : (R === 1 ? { fg: '#6e5200', ico: I.warn, a: 'Prüfen', b: um } : { fg: '#17663a', ico: I.ok, a: laedt ? 'Moment' : 'Geprüft', b: um }),
      { anim: `${stampP} .45s ${this._rN > 1 || s.stampN ? '0s' : '.5s'} both` },
    );

    // --- Rahmen ---------------------------------------------------------------
    const navAct = (on) => on ? 'width: 100%; background: #fffdf8; color: #4a2f9a; font-weight: 800; box-shadow: -2px 2px 6px rgba(30,40,70,.08); transform: translateX(-5px)' : 'width: auto; min-width: 86%; max-width: 100%; background: #e9e1cf; color: #1d2742; font-weight: 500; transform: translateX(0)';
    const nav = [{ id: 'overview', label: 'Übersicht', ico: I.home }, { id: 'history', label: 'Verlauf', ico: I.clock }, { id: 'quarantine', label: 'Quarantäne', ico: I.box }, { id: 'lab', label: 'Labor', ico: I.flask }, { id: 'settings', label: 'Einstellungen', ico: I.gear }].map((n) => {
      const on = s.screen === n.id || (n.id === 'overview' && s.screen === 'device'); const cnt = n.id === 'quarantine' ? quar.length : 0;
      return Object.assign({}, n, { dyn: navAct(on), go: set({ screen: n.id }), hasCount: cnt > 0, count: String(cnt), hop: s.qHopN ? (s.qHopN % 2 ? 'kBadgeA .4s 1' : 'kBadgeB .4s 1') : 'none' });
    });
    const setTabs = [{ id: 'allgemein', label: 'Allgemein' }, { id: 'engine', label: 'Engine' }, { id: 'vt', label: 'VirusTotal' }, { id: 'benach', label: 'Benachrichtigungen' }, { id: 'geraete', label: 'Geräte' }, { id: 'origami', label: 'origami' }]
      .map((t) => Object.assign({}, t, { on: t.id === s.setTab, dyn: tabDyn(t.id === s.setTab), pick: set({ setTab: t.id }) }));
    const B = einst.benachrichtigungen || {};
    const merke = (feld) => schalter(!!B[feld], einstellen({ benachrichtigungen: { [feld]: !B[feld] } }));
    const ohneOrigami = 'Die Verbindung zu origami kommt in einer späteren Version.';
    const aus = schalter(false, bald(ohneOrigami));

    // --- Engine und Labor --------------------------------------------------------
    const eg = d.engine || { regeln: 0, labor: 0, schaedlich: 0, fehlalarm: 0, stand: null, eigene: [] };
    const zahl = (n) => n.toLocaleString('de-DE');
    const ohneLabor = 'Das Labor liefert noch keine Liste zum Abholen. Im Moment arbeitet die Engine mit Kranichs eigenen Regeln und deinen Einträgen.';
    const eng = {
      run: false, err: false, btn: true, pct: '0%', go: bald(ohneLabor), chip: chip('ok', 'eigene Regeln'),
      stand: eg.stand ? wann(eg.stand) : 'mit dieser Version', regeln: eg.regeln === 1 ? '1 Regel' : `${zahl(eg.regeln)} Regeln`,
      abdruecke: eg.labor + eg.schaedlich === 1 ? '1 Fingerabdruck' : `${zahl(eg.labor + eg.schaedlich)} Fingerabdrücke`,
    };
    const geplant = chip('none', 'geplant');
    const labSrc = [
      { id: 'eigen', name: 'Kranichs eigene Regeln', last: 'mit dieser Version', count: eng.regeln, st: chip('ok', 'aktiv') },
      { id: 'du', name: 'Deine Einträge', last: eg.eigene[0] ? wann(eg.eigene[0].zeit) : '–', count: `${zahl(eg.schaedlich + eg.fehlalarm)} Einträge`, st: chip('ok', 'aktiv') },
      { id: 'offen', name: 'Offene Regelsammlungen', last: '–', count: 'noch nicht angebunden', st: geplant },
      { id: 'abdruck', name: 'Fingerabdrücke bekannter Schädlinge', last: '–', count: 'noch nicht angebunden', st: geplant },
    ];
    const OK2 = { schaedlich: chip('bad', 'schädlich'), fehlalarm: chip('none', 'Fehlalarm') };
    const own = eg.eigene.map((o) => ({
      id: o.sha256, file: o.name || o.sha256.slice(0, 16) + '…', kind: OK2[o.art], date: wann(o.zeit),
      remove: async () => { await this.api.eintragVergessen(o.sha256); await this.lade('engine'); this.say({}, `${o.name || 'Der Eintrag'} ist aus den eigenen Einträgen entfernt.`); },
    }));

    return {
      nav, ori: { text: 'origami nicht verbunden', fg: '#4a4f5e', ico: I.off }, goOri: set({ screen: 'settings', setTab: 'origami' }), goHome: set({ screen: 'overview' }), goHist: set({ screen: 'history' }),
      toastOn: !!s.toast, toast: s.toast, toastX: set({ toast: '' }), toastAnim: (s.toastN % 2 ? 'kToastA' : 'kToastB') + ' 4.3s ease-out both',
      scOverview: s.screen === 'overview', scDevice: s.screen === 'device', scHistory: s.screen === 'history', scQuar: s.screen === 'quarantine', scLab: s.screen === 'lab', scSettings: s.screen === 'settings',
      authIn: s.auth === 'in', authOut: s.auth === 'out', kontoMail: (d.konto && d.konto.email) || '', logout: () => this.abmelden(),
      loginPw: s.loginErr === 'pw', loginNet: s.loginErr === 'net', loginMail: s.loginErr === 'mail', loginTitel: s.loginTitel, loginText: s.loginText,
      loginGo: () => this.anmelden(false), loginNew: () => this.anmelden(true), loginResend: () => this.anmelden(true),
      zen: { text: d.zenOk === false ? 'Zentrale nicht erreichbar' : 'Zentrale verbunden' },
      hasDevs: true, noDevs: false, firstDev: set({ screen: 'settings', setTab: 'geraete', add: 'type' }),
      sysOn: sys.run || sys.done, sys, sysLines, sysQuick: () => this.schutzScan('schnell'), sysFull: () => this.schutzScan('voll'),
      jobOn: !!job, jobChip, jobKind: job ? SCAN[job.art] : '', jobQuick: sende('schnellscan'), jobFull: sende('vollscan'),
      dlEdit: true, dlRo: false,
      lageFund: R === 2, lageWarn: R === 1, lageOk: R === 0, heroTitel: HT, heroText: HX, k, stamp,
      heroBtn: R >= 1, heroGo: () => { this.zeigeGeraet(heroDev); this.setState({ tab: heroDev === ICH ? heroTab : 'funde' }); },
      devs, last5: EV.slice(0, 5), cur,
      scanAll: () => (fern.length ? this.scanneAlle(win, fern.filter((g) => g.remoteDesk && !g.offB && !g.scanning)) : (win ? this.schutzScan('schnell') : this.waehleUndScanne())), scanDev: () => this.waehleUndScanne(),
      scanStop: async () => { await this.api.scanAbbrechen(); this.setState({ scan: 'idle', prog: 0 }); }, scanReset: set({ scan: 'idle', prog: 0 }),
      scanAllRun: false, scanAllDone: false, devRun: run, devDone: s.scan === 'done', devIdle: !run,
      scanPct: s.prog + '%', scanFile: s.scanFile,
      canScanHead: cur.me ? win : cur.remoteDesk, scanHeadDyn: d.schutzScan ? 'opacity: .45; cursor: progress' : 'opacity: 1',
      scanHead: () => this.schutzScan('schnell'), scanVoll: () => this.schutzScan('voll'),
      noteScan: win, noteOff: false,
      howOpen: s.howto, howFlip: async () => { if (!s.howto && win) this.api.oeffneSchutz(); this.setState({ howto: !s.howto }); }, howWin: s.howto && !mac, howMac: s.howto && mac,
      hasTabs: true, tabs, tFunde: tab === 'funde', tScan: cur.me && tab === 'scan', tAuto: cur.me && tab === 'auto', tDl: cur.me && tab === 'dl', tApps: false, tIos: false,
      funde, fundeEmpty: funde.length === 0,
      fundeLeerText: !cur.me ? 'Von diesem Gerät sind keine Funde gemeldet.' : (win ? 'Der Schutz hat auf diesem Gerät nichts gefunden.' : 'Auf diesem System kann Kranich die Funde des Systems noch nicht auslesen.'),
      vtErr: !!vtHinweis, vtHinweis, scanRows, scanSum, scanNever: !erg && !run, scanHas: !!erg,
      moreOpen: s.moreOpen, moreFlip: set({ moreOpen: !s.moreOpen }), moreRot: s.moreOpen ? 'rotate(90deg)' : 'rotate(-90deg)', moreRows,
      moreTitel, moreSub: `${sauber} unauffällig, ${ruhig.length - sauber} nicht geprüft`, moreRest: ruhig.length > 5 ? `und ${ruhig.length - 5} weitere` : '',
      dzOver: (e) => { e.preventDefault(); if (!this.S().drag) this.setState({ drag: true }); }, dzLeave: set({ drag: false }),
      dzDrop: (e) => {
        e.preventDefault();
        const datei = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        const pfad = datei ? this.api.pfadVon(datei) : null;
        if (pfad) this.dateiScan(pfad); else this.say({ drag: false }, 'Das ließ sich nicht lesen. Nimm bitte „Auswählen“.');
      },
      dzDyn: s.drag ? 'transform: perspective(700px) rotateX(7deg) translateY(-4px); box-shadow: 0 12px 24px rgba(74,47,154,.22); border-color: #4a2f9a; background: #e6defb' : 'transform: none; box-shadow: none; border-color: #7c5cd6; background: #f1edfd',
      autoFilters: picks([{ id: 'alle', label: 'Alle' }, { id: 'neu', label: 'Neu' }, { id: 'unk', label: 'Aus Benutzerordnern' }], s.filter, 'filter'),
      autoHint: auto.verfuegbar ? 'Autostart, geplante Aufgaben und Dienste' : 'Auf diesem System kann Kranich den Autostart noch nicht auslesen.', autoRows, autoEmpty: autoRows.length === 0,
      watch, watchOff: !watch.on, dlDyn: watch.on ? 'opacity: 1' : 'opacity: .5', dlRows, folder: wache.ordner,
      folderFlip: async () => { const p = await this.api.waehlePfad('ordner'); if (p) await einstellen({ wacheOrdner: p })(); },
      quar, quarEmpty: quar.length === 0, appRows: [],
      dlgOpen: !!s.dialog, dlg, dlgNo: set({ dialog: null }), dlgYes: () => this.loescheEndgueltig(dlg.id, dlg.file),
      hDevs: picks([{ id: 'alle', label: 'Alle Geräte' }].concat(devs.map((x) => ({ id: x.id, label: x.name }))), s.hDev, 'hDev'),
      hTypes: picks([{ id: 'alle', label: 'Alle' }, { id: 'fund', label: 'Fund' }, { id: 'warn', label: 'Warnung' }, { id: 'scan', label: 'Scan' }, { id: 'quar', label: 'Quarantäne' }], s.hType, 'hType'),
      hist, histEmpty: hist.length === 0,
      eng, swAuto: schalter(false, bald(ohneLabor)), autoText: 'Kommt mit dem Labor. Im Moment gibt es noch keine Liste zum Abholen.',
      probeGo: () => this.probealarm(), probeRun: s.probe === 'run', probeOk: s.probe === 'ok', probeText: s.probeText,
      own, ownEmpty: own.length === 0, labSrc,
      lab: { offen: '0', eigen: zahl(eg.regeln), abdruecke: zahl(eg.labor + eg.schaedlich), aenderung: 'Das Labor startet mit der nächsten Version. Bis dahin wächst die Liste durch deine eigenen Einträge.' },
      setTabs, sA: s.setTab === 'allgemein', sE: s.setTab === 'engine', sV: s.setTab === 'vt', sB: s.setTab === 'benach', sG: s.setTab === 'geraete', sO: s.setTab === 'origami',
      swBoot: schalter(!!einst.mitSystemStarten, einstellen({ mitSystemStarten: !einst.mitSystemStarten })),
      swTray: schalter(!!einst.imTrayWeiterlaufen, einstellen({ imTrayWeiterlaufen: !einst.imTrayWeiterlaufen })),
      swNF: merke('fund'), swNW: merke('warnung'), swNS: merke('scanFertig'), swNQ: merke('quarantaene'), swO1: aus, swO2: aus, swO3: aus,
      vtChip: einst.vtHinterlegt ? chip('ok', 'hinterlegt') : chip('warn', 'fehlt'), vtPh: einst.vtHinterlegt ? 'Schlüssel ist hinterlegt' : 'Schlüssel hier einfügen',
      vtSave: async () => {
        const feld = document.getElementById('vtkey');
        const antwort = await this.api.vtSchluesselSetzen(feld ? feld.value : '');
        if (antwort.ok && feld) feld.value = '';
        await this.lade('einst');
        this.say({}, antwort.ok ? 'VirusTotal-Schlüssel gespeichert.' : antwort.grund);
      },
      vtDrop: async () => { await this.api.vtSchluesselEntfernen(); await this.lade('einst'); this.say({}, 'VirusTotal-Schlüssel entfernt.'); },
      plans: [{ id: 'aus', label: 'Nur manuell', on: true, dyn: pill(true), pick: bald('Ein eigener Zeitplan kommt später.') }],
      planText: win ? 'Der Schutz von Windows plant seine Scans selbst. Zusätzliche Scans startest du hier von Hand.' : 'Scans laufen, wenn du sie startest.',
      addNone: !s.add, addOpen: !!s.add, addType: s.add === 'type', addCode: s.add === 'code', addStart: set({ add: 'type' }), addBack: set({ add: 'type' }),
      addClose: () => { this.setState({ add: null }); this.ladeHost(); },
      addTypes: [
        { id: 'windows', label: 'Windows-PC oder Laptop', ico: I.pc, pick: () => this.kopple('windows', 'Windows-PC') },
        { id: 'macos', label: 'Mac', ico: I.laptop, pick: () => this.kopple('macos', 'Mac') },
        { id: 'android', label: 'Android', ico: I.phone, pick: bald('Die Android-App kommt später. Bis dahin geht Windows und Mac.') },
        { id: 'ios', label: 'iPhone oder iPad', ico: I.tablet, pick: bald('Der Kurzbefehl für iPhone und iPad kommt später.') },
      ],
      addLabel: s.addLabel, addCodeText: s.addCode ? s.addCode.slice(0, 4) + ' ' + s.addCode.slice(4) : '', addDesk: true, addAndroid: false, addIos: false,
      oriOff: true, oriPair: false, oriOn: false, oriDown: false, oriConnect: bald(ohneOrigami), oriConfirm: bald(ohneOrigami), oriCancel: bald(ohneOrigami), oriRun: 'none',
    };
  }
}

window.Component = Component;
