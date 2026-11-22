#!/usr/bin/env python3
"""Baut ui/index.html aus dem Prototyp im Canvas.

Aufruf:  python3 werkzeug/canvas-uebernehmen.py

Liest canvas/App.dc.html (die Datei aus dem Canvas, unveraendert) und
schreibt ui/index.html. Dabei werden die Beispieltexte des Prototyps durch
Platzhalter ersetzt, die die echte Logik (ui/logik.js) fuellt. Jede Ersetzung
muss genau einmal passen. Passt sie nicht mehr, hat sich der Canvas geaendert
und das Skript bricht mit einer klaren Meldung ab.
"""
import pathlib, re, sys

wurzel = pathlib.Path(__file__).resolve().parent.parent
quelle = (wurzel / 'canvas' / 'App.dc.html').read_text(encoding='utf8')

a = quelle.index('<x-dc>') + len('<x-dc>')
b = quelle.index('</x-dc>')
inhalt = quelle[a:b]
h1 = inhalt.index('<helmet>')
h2 = inhalt.index('</helmet>')
helmet = inhalt[h1 + len('<helmet>'):h2]
vorlage = (inhalt[:h1] + inhalt[h2 + len('</helmet>'):]).strip()
stil = re.search(r'<style>(.*?)</style>', helmet, re.S).group(1).strip()

ERSETZE = [
    # Statuszeile der Uebersicht
    ('>1 Fund<', '>{{ heroTitel }}<'),
    ('>2 Warnungen<', '>{{ heroTitel }}<'),
    ('>Alles sicher<', '>{{ heroTitel }}<'),
    ('Der Schutz hat Rechnung.pdf.exe auf dem PC gestoppt und weggesperrt. Eine weitere Datei wartet auf deine Entscheidung.', '{{ heroText }}'),
    ('Auf dem MacBook läuft der Schutz nicht. Auf dem Zephyrus gibt es einen neuen Autostart-Eintrag.', '{{ heroText }}'),
    ('Auf 4 Geräten läuft der Schutz, es gibt keine offenen Funde. Der AYN Thor ist offline.', '{{ heroText }}'),
    ('1 offener Fund', '{{ d.openText }}'),
    # Scan-Ergebnis
    ('214 weitere Dateien ohne Befund', '{{ moreTitel }}'),
    ('31 sauber, 183 nicht geprüft', '{{ moreSub }}'),
    ('und 209 weitere', '{{ moreRest }}'),
    ('VirusTotal-Tageslimit erreicht, morgen wieder möglich. Bis dahin prüft Kranich nur mit den eigenen Regeln.', '{{ vtHinweis }}'),
    ('Der Schutz hat auf diesem Gerät nichts gefunden.', '{{ fundeLeerText }}'),
    # Engine und Labor
    ('>4.812 Regeln<', '>{{ eng.regeln }}<'),
    ('>1,2 Mio. Fingerabdrücke<', '>{{ eng.abdruecke }}<'),
    ('>4.790<', '>{{ lab.offen }}<'),
    ('>22<', '>{{ lab.eigen }}<'),
    ('>1,2 Mio.<', '>{{ lab.abdruecke }}<'),
    ('>Heute 06:00 · 312 neue Fingerabdrücke, 4 neue Regeln<', '>{{ lab.aenderung }}<'),
    ('Kranich holt die Erkennungsliste jeden Morgen um 06:00 Uhr.', '{{ autoText }}'),
    ('Kranich hat die Testdatei erkannt und sofort weggesperrt.', '{{ probeText }}'),
    # Konto und Zentrale
    ('>nils@beispiel.de<', '>{{ kontoMail }}<'),
    ('Zentrale verbunden<', '{{ zen.text }}<'),
    ('Dieses Gerät meldet sich seit 3 Std. nicht. Die Daten unten sind der letzte bekannte Stand.', '{{ cur.offText }}'),
    ('>Falsches Passwort<', '>{{ loginTitel }}<'),
    ('Schau nochmal nach und versuch es erneut.', '{{ loginText }}'),
    ('>4821 7730<', '>{{ addCodeText }}<'),
    ('Kranich auf dem neuen Gerät installieren.', 'Den Kranich Agent auf dem neuen Gerät installieren und starten.'),
    ('Beim ersten Start „Mit bestehendem Kranich koppeln“ wählen.', 'Im Agent auf „Jetzt koppeln“ klicken.'),
    ('Den Code eingeben. Das Gerät erscheint danach in der Übersicht mit vollem Schutz.', 'Den Code eingeben. Das Gerät erscheint danach hier in der Übersicht.'),
    # Autostart: Kranich kennt den Hersteller nicht, aber Programm und Ort
    ('>Hersteller<', '>Programm<'),
    ('>Seit wann<', '>Ort<'),
]
for alt, neu in ERSETZE:
    n = vorlage.count(alt)
    if n != 1:
        sys.exit(f'Der Canvas hat sich geändert: „{alt[:60]}“ kommt {n}-mal vor, erwartet war 1.')
    vorlage = vorlage.replace(alt, neu)

# Zwei Beispielzeilen unter "Letzte Änderungen" fallen ganz weg.
for zeile in ('Gestern 06:00 · 287 neue Fingerabdrücke, 1 neue Regel', '20.11. 06:00 · 401 neue Fingerabdrücke, 2 neue Regeln'):
    ende = vorlage.index(zeile) + len(zeile) + len('</li>')
    anfang = vorlage.rindex('<li', 0, ende)
    vorlage = vorlage[:anfang] + vorlage[ende:]

SCHRIFT = '\n'.join(
    f"@font-face{{font-family:'{familie}';font-style:normal;font-weight:{gewicht};font-display:swap;"
    f"src:url('schrift/{datei}-latin-{gewicht}-normal.woff2') format('woff2')}}"
    for familie, datei, gewichte in [
        ('Bricolage Grotesque', 'bricolage-grotesque', (500, 700, 800)),
        ('Caveat', 'caveat', (500, 700)),
        ('Source Serif 4', 'source-serif-4', (400, 600)),
    ]
    for gewicht in gewichte
)

seite = f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; img-src 'self' data:">
<title>Kranich Host</title>
<!-- Erzeugt von werkzeug/canvas-uebernehmen.py aus canvas/App.dc.html. Nicht von Hand ändern. -->
<style>
{SCHRIFT}
html,body{{height:100%}}
#app{{min-height:100%}}
#app>div{{min-height:100vh!important}}
{stil}
</style>
</head>
<body>
<div id="app"></div>
<template id="vorlage">{vorlage}</template>
<script src="falter.js"></script>
<script src="logik.js"></script>
<script src="start.js"></script>
</body>
</html>
'''
(wurzel / 'ui' / 'index.html').write_text(seite, encoding='utf8')
print(f'ui/index.html geschrieben ({len(seite) // 1024} KB)')
