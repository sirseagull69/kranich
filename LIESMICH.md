# Kranich

Geräte-Wächter aus der origami-Familie. Der Schutz des Systems (unter Windows der Defender) ist der Motor, Kranich liest seinen Zustand, stößt Scans an und legt eine zweite Meinung, Autostart-Check und Download-Wache obendrauf.

Stand: Gerüst der Windows-App.

Das Gerüst der App: Fenster, Tray, Einstellungen und die Brücke zwischen
Oberfläche und Kern. Die Oberfläche ist noch ein Platzhalter, die aus dem
Canvas kommt als Nächstes.

## Starten

```
npm install
npm start
```

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `kern/` | Der Kranich-Kern (Scan, VirusTotal, Download-Wache, Autostart, Defender, Agent) |
| `main/main.js` | Fenster, Tray, Benachrichtigungen, Start mit dem System |
| `main/dienste.js` | Alles, was die Oberfläche aufrufen darf. Ohne Electron testbar |
| `main/einstellungen.js` | Einstellungen. Der VirusTotal-Schlüssel wird nur verschlüsselt gespeichert |
| `main/preload.js` | Brücke: die Oberfläche bekommt `window.kranich`, sonst nichts |
| `ui/` | Platzhalter-Oberfläche |
| `werkzeug/rauch.js` | Startet die echte App einmal und ruft die Brücke auf |
| `werkzeug/cli.js` | Der Kern im Terminal: `scan`, `wache`, `autostart`, `defender` |

## Sicherheit

- Die Oberfläche hat keinen Zugriff auf Node oder das Dateisystem, nur auf
  die festen Funktionen in `window.kranich`.
- Der VirusTotal-Schlüssel verlässt den Hauptprozess nie. Ohne sicheren
  Speicher des Systems wird er gar nicht gespeichert.
- Kranich liest nur. Quarantäne und Löschen gibt es in diesem Stand nicht.

## Tests

```
npm test          Kern, Einstellungen, Dienste, Brücke
npm run rauchtest echte App starten (braucht einen Bildschirm)
```

## Installer bauen (auf Windows)

```
npm run bauen
```

Ergebnis in `ausgabe/`. Ohne gekauftes Zertifikat warnt Windows beim ersten
Start vor einem unbekannten Herausgeber.

## Gut zu wissen

- An VirusTotal geht nur der Fingerabdruck einer Datei, nie die Datei.
- Der kostenlose VirusTotal-Zugang ist nur für private Nutzung erlaubt.
- Defender-Anbindung und Autostart-Check sind auf echtem Windows noch nicht gelaufen.
