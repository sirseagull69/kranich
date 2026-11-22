'use strict';
// Anbindung an den Windows Defender. Der Defender ist der Motor: er
// erkennt, blockiert und sperrt weg. Kranich liest seinen Zustand und
// seine Funde und stoesst Scans an.
//
// Hier wird nichts geloescht und nichts an den Defender-Einstellungen
// geaendert.

const { powershell, jsonListe } = require('./powershell');

const ZEIT = (feld) => `$(if($s.${feld}){$s.${feld}.ToUniversalTime().ToString('o')})`;

const BEFEHLE = {
  status:
    '$s=Get-MpComputerStatus; [pscustomobject]@{' +
    'Dienst=$s.AMServiceEnabled; Antivirus=$s.AntivirusEnabled; Echtzeit=$s.RealTimeProtectionEnabled;' +
    'Manipulationsschutz=$s.IsTamperProtected; Modus="$($s.AMRunningMode)";' +
    'SignaturVersion=$s.AntivirusSignatureVersion; SignaturAlterTage=$s.AntivirusSignatureAge;' +
    `SignaturStand="${ZEIT('AntivirusSignatureLastUpdated')}";` +
    `SchnellScan="${ZEIT('QuickScanEndTime')}"; VollScan="${ZEIT('FullScanEndTime')}"` +
    '} | ConvertTo-Json -Compress',
  funde:
    '$n=@{}; Get-MpThreat | ForEach-Object { $n[[string]$_.ThreatID]=$_ }; ' +
    'Get-MpThreatDetection | ForEach-Object { $t=$n[[string]$_.ThreatID]; [pscustomobject]@{' +
    'Id="$($_.DetectionID)"; ThreatId="$($_.ThreatID)"; Name=$t.ThreatName; Schwere=$t.SeverityID;' +
    'Aktiv=$t.IsActive; Pfade=@($_.Resources); StatusId=$_.ThreatStatusID; Erfolg=$_.ActionSuccess;' +
    'Prozess=$_.ProcessName;' +
    "Zeit=\"$(if($_.InitialDetectionTime){$_.InitialDetectionTime.ToUniversalTime().ToString('o')})\"" +
    '} } | ConvertTo-Json -Compress -Depth 4',
  schnell: 'Start-MpScan -ScanType QuickScan',
  voll: 'Start-MpScan -ScanType FullScan',
  pfad: 'Start-MpScan -ScanType CustomScan -ScanPath $env:KRANICH_PFAD',
  signaturen: 'Update-MpSignature',
};

const SCHWERE = { 1: 'niedrig', 2: 'mittel', 4: 'hoch', 5: 'schwer' };

// Was der Defender mit dem Fund gemacht hat.
const ZUSTAND = {
  1: 'erkannt', 2: 'bereinigt', 3: 'in_quarantaene', 4: 'entfernt', 5: 'zugelassen', 6: 'blockiert',
  102: 'quarantaene_fehlgeschlagen', 103: 'entfernen_fehlgeschlagen', 104: 'zulassen_fehlgeschlagen',
  105: 'abgebrochen', 107: 'blockieren_fehlgeschlagen',
};
const ERLEDIGT = new Set(['bereinigt', 'in_quarantaene', 'entfernt', 'blockiert', 'zugelassen']);

const zeit = (wert) => (wert ? String(wert) : null);

function leseStatus(text) {
  const [s] = jsonListe(text);
  if (!s) return null;
  return {
    dienst: s.Dienst === true,
    antivirus: s.Antivirus === true,
    echtzeit: s.Echtzeit === true,
    manipulationsschutz: s.Manipulationsschutz === true,
    modus: s.Modus || '',
    signaturVersion: s.SignaturVersion || '',
    signaturAlterTage: Number.isFinite(Number(s.SignaturAlterTage)) ? Number(s.SignaturAlterTage) : null,
    signaturStand: zeit(s.SignaturStand),
    letzterSchnellScan: zeit(s.SchnellScan),
    letzterVollScan: zeit(s.VollScan),
  };
}

// "file:_C:\Users\x\a.exe" -> "C:\Users\x\a.exe"
const ohneVorsatz = (r) => String(r).replace(/^[a-z]+:_/i, '');

function leseFunde(text) {
  return jsonListe(text)
    .map((f) => {
      const zustand = ZUSTAND[f.StatusId] ?? 'unbekannt';
      return {
        id: String(f.Id || ''),
        threatId: String(f.ThreatId || ''),
        name: f.Name || 'Unbekannte Bedrohung',
        schwere: SCHWERE[f.Schwere] ?? 'unbekannt',
        pfade: (Array.isArray(f.Pfade) ? f.Pfade : f.Pfade ? [f.Pfade] : []).map(ohneVorsatz),
        zustand,
        offen: f.Aktiv === true || !ERLEDIGT.has(zustand),
        prozess: f.Prozess && f.Prozess !== 'Unknown' ? String(f.Prozess) : null,
        zeit: zeit(f.Zeit),
      };
    })
    .sort((a, b) => (Date.parse(b.zeit) || 0) - (Date.parse(a.zeit) || 0));
}

// Uebersetzt den Zustand in eine Ampel fuer die Oberflaeche.
//   stufe: 'ok' | 'warnung' | 'kritisch'
function bewerte(status, funde = []) {
  if (!status) return { stufe: 'kritisch', gruende: ['Der Defender antwortet nicht'] };
  const kritisch = [];
  const warnung = [];

  if (/passive|not running/i.test(status.modus)) {
    warnung.push('Der Defender ist nicht der aktive Virenschutz, vermutlich läuft ein anderes Programm');
  } else {
    if (!status.dienst || !status.antivirus) kritisch.push('Der Defender ist ausgeschaltet');
    else if (!status.echtzeit) kritisch.push('Der Echtzeitschutz ist ausgeschaltet');
  }

  const alter = status.signaturAlterTage;
  if (alter !== null && alter >= 14) kritisch.push(`Die Erkennungsliste ist ${alter} Tage alt`);
  else if (alter !== null && alter >= 3) warnung.push(`Die Erkennungsliste ist ${alter} Tage alt`);

  if (!status.manipulationsschutz) warnung.push('Der Manipulationsschutz ist ausgeschaltet');

  const offen = funde.filter((f) => f.offen);
  if (offen.length) kritisch.push(offen.length === 1 ? `1 offener Fund: ${offen[0].name}` : `${offen.length} offene Funde`);

  if (kritisch.length) return { stufe: 'kritisch', gruende: [...kritisch, ...warnung] };
  if (warnung.length) return { stufe: 'warnung', gruende: warnung };
  return { stufe: 'ok', gruende: [] };
}

class Defender {
  constructor({ ausfuehren = powershell } = {}) {
    if (ausfuehren === powershell && process.platform !== 'win32') {
      throw new Error('Die Defender-Anbindung läuft nur unter Windows');
    }
    this._ps = ausfuehren;
  }

  async status() {
    return leseStatus(await this._ps(BEFEHLE.status));
  }

  async funde() {
    return leseFunde(await this._ps(BEFEHLE.funde));
  }

  // Zustand, Funde und Ampel in einem. Faellt ein Teil aus, steht der
  // Grund in "fehler" und der Rest kommt trotzdem.
  async lage() {
    const fehler = [];
    const status = await this.status().catch((e) => (fehler.push(`Status: ${e.message}`), null));
    const funde = await this.funde().catch((e) => (fehler.push(`Funde: ${e.message}`), []));
    return { status, funde, ampel: bewerte(status, funde), fehler };
  }

  // art: 'schnell' | 'voll' | 'pfad'. Kommt zurueck, wenn der Scan fertig ist.
  async scan(art, { pfad, signal } = {}) {
    if (!['schnell', 'voll', 'pfad'].includes(art)) throw new Error(`Unbekannte Scan-Art: ${art}`);
    if (art === 'pfad' && !pfad) throw new Error('Für diesen Scan fehlt der Pfad');
    const start = Date.now();
    const beginn = new Date(start).toISOString();
    await this._ps(BEFEHLE[art], { werte: art === 'pfad' ? { KRANICH_PFAD: pfad } : {}, signal });
    const funde = (await this.funde()).filter((f) => Date.parse(f.zeit) >= start - 1000);
    return { art, beginn, ende: new Date().toISOString(), neueFunde: funde };
  }

  async aktualisiereSignaturen() {
    await this._ps(BEFEHLE.signaturen);
    return this.status();
  }
}

module.exports = { Defender, leseStatus, leseFunde, bewerte, DEFENDER_BEFEHLE: BEFEHLE };
