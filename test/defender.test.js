'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Defender, leseStatus, leseFunde, bewerte, DEFENDER_BEFEHLE } = require('../kern');

const STATUS_OK = JSON.stringify({
  Dienst: true, Antivirus: true, Echtzeit: true, Manipulationsschutz: true, Modus: 'Normal',
  SignaturVersion: '1.413.102.0', SignaturAlterTage: 0,
  SignaturStand: '2026-11-22T06:00:00.0000000Z', SchnellScan: '2026-11-21T20:00:00.0000000Z', VollScan: '',
});

const fund = (extra = {}) => ({
  Id: '{A1}', ThreatId: '2147519003', Name: 'Trojan:Win32/Beispiel', Schwere: 5, Aktiv: false,
  Pfade: ['file:_C:\\Users\\nils\\Downloads\\Rechnung.pdf.exe'], StatusId: 3, Erfolg: true,
  Prozess: 'Unknown', Zeit: '2026-11-22T08:00:00.0000000Z', ...extra,
});

function status(aenderung = {}) {
  return leseStatus(JSON.stringify({ ...JSON.parse(STATUS_OK), ...aenderung }));
}

test('Status lesen', () => {
  const s = leseStatus(STATUS_OK);
  assert.equal(s.echtzeit, true);
  assert.equal(s.signaturAlterTage, 0);
  assert.equal(s.letzterSchnellScan, '2026-11-21T20:00:00.0000000Z');
  assert.equal(s.letzterVollScan, null, 'leeres Datum heisst: nie');
  assert.equal(leseStatus(''), null);
  assert.equal(leseStatus('Fehlermeldung statt JSON'), null);
});

test('Funde lesen: Pfad ohne Vorsatz, Zustand, Reihenfolge', () => {
  const text = JSON.stringify([
    fund({ Id: 'alt', Zeit: '2026-11-20T08:00:00.0000000Z' }),
    fund({ Id: 'neu', StatusId: 1, Aktiv: true, Zeit: '2026-11-22T09:00:00.0000000Z', Pfade: ['file:_C:\\a.exe', 'containerfile:_C:\\b.zip'], Prozess: 'C:\\x.exe' }),
  ]);
  const funde = leseFunde(text);
  assert.deepEqual(funde.map((f) => f.id), ['neu', 'alt'], 'neueste zuerst');
  assert.deepEqual(funde[0].pfade, ['C:\\a.exe', 'C:\\b.zip']);
  assert.equal(funde[0].zustand, 'erkannt');
  assert.equal(funde[0].offen, true);
  assert.equal(funde[0].prozess, 'C:\\x.exe');
  assert.equal(funde[1].zustand, 'in_quarantaene');
  assert.equal(funde[1].offen, false);
  assert.equal(funde[1].schwere, 'schwer');
  assert.equal(funde[1].prozess, null);
});

test('Funde lesen: ein einzelner Fund, kein Fund, unbekannte Kennzahlen', () => {
  assert.equal(leseFunde(JSON.stringify(fund())).length, 1);
  assert.deepEqual(leseFunde(''), []);
  const [f] = leseFunde(JSON.stringify(fund({ StatusId: 999, Schwere: 9, Name: null, Pfade: null })));
  assert.equal(f.zustand, 'unbekannt');
  assert.equal(f.offen, true, 'im Zweifel gilt ein Fund als offen');
  assert.equal(f.schwere, 'unbekannt');
  assert.equal(f.name, 'Unbekannte Bedrohung');
  assert.deepEqual(f.pfade, []);
  // Quarantäne fehlgeschlagen ist nicht erledigt
  assert.equal(leseFunde(JSON.stringify(fund({ StatusId: 102 })))[0].offen, true);
});

test('Ampel', () => {
  assert.deepEqual(bewerte(status()), { stufe: 'ok', gruende: [] });
  assert.equal(bewerte(null).stufe, 'kritisch');
  assert.equal(bewerte(status({ Echtzeit: false })).stufe, 'kritisch');
  assert.match(bewerte(status({ Echtzeit: false })).gruende[0], /Echtzeitschutz/);
  assert.equal(bewerte(status({ Antivirus: false })).stufe, 'kritisch');
  assert.equal(bewerte(status({ SignaturAlterTage: 2 })).stufe, 'ok');
  assert.equal(bewerte(status({ SignaturAlterTage: 3 })).stufe, 'warnung');
  assert.equal(bewerte(status({ SignaturAlterTage: 14 })).stufe, 'kritisch');
  assert.equal(bewerte(status({ Manipulationsschutz: false })).stufe, 'warnung');

  // Anderer Virenscanner aktiv: Warnung, kein Alarm
  const passiv = bewerte(status({ Modus: 'Passive Mode', Antivirus: false, Echtzeit: false }));
  assert.equal(passiv.stufe, 'warnung');

  const erledigt = leseFunde(JSON.stringify(fund()));
  assert.equal(bewerte(status(), erledigt).stufe, 'ok', 'Fund in Quarantäne ist kein Alarm mehr');
  const offen = leseFunde(JSON.stringify(fund({ StatusId: 1, Aktiv: true })));
  const a = bewerte(status(), offen);
  assert.equal(a.stufe, 'kritisch');
  assert.match(a.gruende[0], /1 offener Fund: Trojan/);
});

test('Defender: Lage, auch wenn die Funde nicht lesbar sind', async () => {
  const ausfuehren = async (befehl) => {
    if (befehl === DEFENDER_BEFEHLE.status) return STATUS_OK;
    throw new Error('Zugriff verweigert');
  };
  const lage = await new Defender({ ausfuehren }).lage();
  assert.equal(lage.status.echtzeit, true);
  assert.deepEqual(lage.funde, []);
  assert.equal(lage.ampel.stufe, 'ok');
  assert.deepEqual(lage.fehler, ['Funde: Zugriff verweigert']);
});

test('Defender: Scan uebergibt den Pfad getrennt vom Befehl und meldet nur neue Funde', async () => {
  const aufrufe = [];
  const ausfuehren = async (befehl, optionen) => {
    aufrufe.push({ befehl, optionen });
    if (befehl === DEFENDER_BEFEHLE.funde) {
      return JSON.stringify([
        fund({ Id: 'vorher', Zeit: '2020-01-01T00:00:00.0000000Z' }),
        fund({ Id: 'jetzt', Zeit: new Date(Date.now() + 500).toISOString() }),
      ]);
    }
    return '';
  };
  const defender = new Defender({ ausfuehren });
  const boese = "C:\\Users\\x\\a'; Remove-Item C:\\ -Recurse #";
  const ergebnis = await defender.scan('pfad', { pfad: boese });

  assert.equal(aufrufe[0].befehl, DEFENDER_BEFEHLE.pfad);
  assert.ok(!aufrufe[0].befehl.includes('Remove-Item'), 'der Pfad steht nicht im Befehlstext');
  assert.equal(aufrufe[0].optionen.werte.KRANICH_PFAD, boese);
  assert.deepEqual(ergebnis.neueFunde.map((f) => f.id), ['jetzt']);

  await defender.scan('schnell');
  assert.equal(aufrufe[2].befehl, 'Start-MpScan -ScanType QuickScan');
  await assert.rejects(defender.scan('pfad'), /fehlt der Pfad/);
  await assert.rejects(defender.scan('alles'), /Unbekannte Scan-Art/);
});

test('Defender: ausserhalb von Windows klare Meldung', () => {
  if (process.platform === 'win32') return;
  assert.throws(() => new Defender(), /nur unter Windows/);
});
