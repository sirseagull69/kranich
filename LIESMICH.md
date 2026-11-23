# Kranich

Die Entwurfsmaschine der origami-Familie: Oberflächen entwerfen und Bilder
bearbeiten, gesteuert per Wort. Kranich kennt den Papier-Look der Familie und
hält sich daran. origami kommt später als Copilot dazu.

Der frühere Geräte-Wächter liegt unverändert im Zweig `waechter`.

## Benutzen

Installer liegen auf GitHub unter **Releases** (`Kranich-<Version>-win-x64.exe`,
Mac: `-mac-arm64.dmg` oder `-x64.dmg`). Ohne gekauftes Zertifikat warnt das
System beim ersten Start („Weitere Informationen“ → „Trotzdem ausführen“, am Mac
Rechtsklick → „Öffnen“).

**Voraussetzung:** Claude Code ist auf dem Rechner installiert und angemeldet
(einmal im Terminal `claude` starten). Kranich ruft es im Hintergrund auf und
läuft so über dein Claude-Konto. Alternativ in den Einstellungen einen
API-Schlüssel eintragen. „Verbindung testen“ zeigt, ob alles klappt.

## Was geht

| | |
| --- | --- |
| Formate für alles: App, Web, Instagram-Post und Story, YouTube, LinkedIn, Flyer A5, Poster A3, Visitenkarte, Einladung, Folie, Logo, App-Icon, eigene Größe | ja |
| Unendliche Leinwand mit vielen Boards, Übersicht, „Board dazu“ | ja |
| Alle Größen: ein Board in weitere Formate falten lassen (neu gedacht, nicht nur skaliert) | ja |
| Entwurf aus einem Satz | ja, eine fertige HTML-Seite im Familien-Look |
| Selbstprüfung nach jedem Entwurf (ragt raus, Text läuft über, Kontrast, Schrift zu klein, Klickfläche zu klein) mit automatischer Reparatur | ja |
| Ganze App entwerfen (Plan, Bausteine, alle Boards, Abläufe, Paket) | Technik fertig, Oberfläche folgt nach dem Canvas |
| Element anklicken und ändern („Größer“, „Farbe“, „Wie in origami“, freier Wunsch) | ja |
| Drei Varianten (Ruhig, Mutig, Kompakt), nehmen oder mischen | ja |
| Aus Screenshot oder Skizze einen Entwurf | ja |
| Ebenenliste, Rückgängig, Verlauf je Board | ja |
| Bild: Zuschneiden, Pinsel, Radierer, Auswahl, Text, Pipette, Ebenen, Regler | ja |
| Bild per Wort („Hintergrund weg und auf 1080 × 1080“) | ja, Claude plant feste Schritte, Kranich führt sie aus |
| Freistellen | KI-Modell (lädt beim ersten Mal aus dem Netz), sonst nach Randfarbe |
| Export PNG, JPG, SVG, HTML; direkt in den Projektordner einer App | ja |
| Kleine Änderungen über das Modell auf dem PC (Ollama) | ja, abschaltbar |
| Sprechen | kommt noch |
| origami als Copilot | kommt nach dem 26.11. |

Claude bekommt nur den Entwurf bzw. eine verkleinerte Vorschau des Bildes und
darf nichts auf dem Rechner tun außer die angehängten Bilder zu lesen. Entwürfe
laufen ohne Skripte in einem abgeschotteten Rahmen.

## Entwickeln

```
npm install
npm start                       # mit echtem Claude
KRANICH_SPIELHIRN=1 npm start   # Claude vorgespielt
npm test                        # Kern-Tests
xvfb-run -a npx electron werkzeug/rauch.js --no-sandbox   # klickt alles durch, Bilder in rauch/
npm run freisteller             # baut ui/vendor/freisteller.js neu
```

- `kern/`: Hirn (claude, API, Ollama), Aufträge und Auslesen, Projekte, Einstellungen, Export, Look der Familie
- `main/`: Hauptprozess, Fotos von Entwürfen, Dateien
- `ui/`: Oberfläche nach dem Canvas (`canvas/`), `entwurf.js` und `bild.js` sind die beiden Leinwände
- Die Oberfläche ist von Hand nach dem Canvas gebaut (kein Übernahme-Skript mehr), weil die Leinwände echte Werkzeuge sind.

Freistellen nutzt `@imgly/background-removal` (AGPL-3.0). Für den privaten
Gebrauch kein Problem; bevor Kranich an andere geht, muss das geklärt oder
ersetzt werden.
