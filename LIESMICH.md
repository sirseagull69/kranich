# Kranich

Geräte-Wächter aus der origami-Familie. Der Schutz des Systems (unter Windows
der Defender) ist der Motor. Kranich liest seinen Zustand, stößt Scans an und
legt eine zweite Meinung, Autostart-Check, Download-Wache und eine eigene
Quarantäne obendrauf.

## Benutzen

Die fertigen Installer liegen auf GitHub unter **Releases**:

- Windows: `Kranich-<Version>-win-x64.exe` herunterladen und starten.
- Mac: `Kranich-<Version>-mac-arm64.dmg` (Apple-Chip) oder `-x64.dmg` (Intel).

Ohne gekauftes Zertifikat warnt das System beim ersten Start. Unter Windows
„Weitere Informationen“ und „Trotzdem ausführen“ wählen. Auf dem Mac die App
mit Rechtsklick und „Öffnen“ starten.

## Was geht

| | Windows | Mac |
| --- | --- | --- |
| Schutz des Systems lesen, Funde zeigen | ja | noch nicht |
| Schnellscan und Vollscan starten | ja | noch nicht |
| Datei oder Ordner prüfen (Dateiname, VirusTotal) | ja | ja |
| Download-Wache | ja | ja |
| Autostart-Check | ja | noch nicht |
| Quarantäne (wegsperren, wiederherstellen, löschen) | ja | ja |

Noch nicht drin: mehrere Geräte in einer Übersicht, Android, iPhone/iPad,
Verbindung zu origami, automatische Updates.

## Entwickeln

```
npm install
npm start                          die App starten
KRANICH_SPIELDATEN=fund npm start  mit vorgespieltem Windows-Schutz (fund, warnung, ruhig)
npm test                           alle Tests
npm run rauchtest                  echte App starten und durchklicken
npm run oberflaeche                ui/index.html neu aus dem Canvas bauen
npm run bauen                      Installer für das eigene System bauen
```

Einen neuen Installer für alle baut GitHub, sobald eine Version markiert wird:

```
git tag v0.2.1
git push --tags
```

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `kern/` | Scan, VirusTotal, Download-Wache, Autostart, Defender, Agent, Zentrale |
| `main/` | Electron: Fenster, Tray, Benachrichtigungen (`main.js`), alles, was die Oberfläche aufrufen darf (`dienste.js`), Einstellungen, Brücke (`preload.js`) |
| `ui/` | Oberfläche. `index.html` wird aus dem Canvas erzeugt, `logik.js` füllt sie mit echten Daten, `falter.js` ist die kleine Laufzeit dafür |
| `canvas/` | Der Prototyp aus dem Canvas, unverändert |
| `zentrale/` | Datenbank der Zentrale (Supabase) |
| `werkzeug/` | Canvas übernehmen, Rauchtest, Terminal-Befehle, Spieldaten |

## Sicherheit

- Die Oberfläche hat keinen Zugriff auf Node oder das Dateisystem, nur auf
  die festen Funktionen in `window.kranich`.
- An VirusTotal geht nur der Fingerabdruck einer Datei, nie die Datei.
- Der VirusTotal-Schlüssel wird nur verschlüsselt gespeichert. Ohne sicheren
  Speicher des Systems wird er gar nicht gespeichert.
- Kranich verschiebt eine Datei nur in Quarantäne, wenn du es anklickst.
  Gelöscht wird nur aus der Quarantäne und nur nach Rückfrage.
- Kranich ändert keine Einstellungen des Defenders.
- Der kostenlose VirusTotal-Zugang ist nur für private Nutzung erlaubt.

## Stand

Auf echtem Windows und auf dem Mac ist die App noch nicht gelaufen. Geprüft
ist sie auf Linux, mit vorgespieltem Windows-Schutz.
