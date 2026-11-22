#!/usr/bin/env python3
"""Baut ui/agent.html aus den Agent-Boards im Canvas.

Aufruf:  python3 werkzeug/agent-uebernehmen.py

Die Boards (canvas/Agent*.dc.html) sind feste Bilder ohne Platzhalter. Dieses
Skript nimmt ihre Bausteine und setzt die Platzhalter ein, die die Logik
(ui/agent.js) fuellt. Jede Ersetzung muss genau einmal passen. Passt sie nicht
mehr, hat sich der Canvas geaendert und das Skript bricht ab.
"""
import pathlib, re, sys

wurzel = pathlib.Path(__file__).resolve().parent.parent


def board(name):
    text = (wurzel / 'canvas' / f'{name}.dc.html').read_text(encoding='utf8')
    return text[text.index('</helmet>') + len('</helmet>'):text.index('</x-dc>')].strip()


def einmal(text, alt, neu, wo):
    n = text.count(alt)
    if n != 1:
        sys.exit(f'Der Canvas hat sich geändert ({wo}): „{alt[:60]}“ kommt {n}-mal vor, erwartet war 1.')
    return text.replace(alt, neu)


def stueck(text, anfang, ende, wo):
    """Der Abschnitt von `anfang` bis einschliesslich `ende`."""
    if text.count(anfang) != 1:
        sys.exit(f'Der Canvas hat sich geändert ({wo}): Anfang „{anfang[:60]}“ nicht eindeutig.')
    a = text.index(anfang)
    b = text.index(ende, a) + len(ende)
    return text[a:b]


ZEILE = '<div style="display: flex; align-items: center; gap: 9px; padding: 7px 0; border-bottom: 1px dashed #d9d0bc; color: '
KNOEPFE = '<div style="display: flex; gap: 8px">'
OHR = '<svg viewBox="0 0 100 100" width="54" height="54"'
OK_PFAD = 'M5 12.5l4.5 4.5L19 7.5'

# --- Statusfenster ---------------------------------------------------------
status = board('AgentStatus')
status = einmal(status, '>Zephyrus G16<', '>{{ name }}<', 'Status')
status = einmal(status, 'background: #e0f3e4; color: #17663a"><svg width="13" height="13"', 'background: {{ chip.bg }}; color: {{ chip.fg }}"><svg width="13" height="13"', 'Status')
status = einmal(status, f'<path d="{OK_PFAD}"></path></svg>Schutz läuft</span>', '<path d="{{ chip.ico }}"></path></svg>{{ chip.text }}</span>', 'Status')
status = einmal(status, 'Kranich Agent 0.4.0', 'Kranich Agent {{ version }}', 'Status')

# Die drei festen Zeilen werden zu einer Liste.
zeilen = stueck(status, '<div style="display: flex; flex-direction: column">' + ZEILE, '</div></div>' + KNOEPFE, 'Status')
eine = stueck(zeilen, ZEILE + '#1d2742">', '</span></div>', 'Status')
eine = einmal(eine, 'color: #1d2742">', 'color: {{ z.fg }}">', 'Zeile')
eine = einmal(eine, 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M12 8v4l3 2', '{{ z.ico }}', 'Zeile')
eine = einmal(eine, 'Zuletzt gemeldet: gerade eben', '{{ z.text }}', 'Zeile')

# Hinweis (aus "offline") und Fund-Karte (aus "Fund").
hinweis = stueck(board('AgentStatusOffline'), '<div style="display: flex; align-items: flex-start; gap: 8px; padding: 9px 12px; background: #ecebe6', 'nachgereicht.</span></div>', 'Offline')
hinweis = einmal(hinweis, 'Zentrale nicht erreichbar. Der Schutz läuft weiter, Meldungen werden nachgereicht.', '{{ hinweis }}', 'Offline')
fund = stueck(board('AgentStatusFund'), '<div style="filter: drop-shadow(0 1px 1px rgba(30,40,70,.22)); min-width: 0">', 'Du musst nichts tun.</span></div></div>', 'Fund')
fund = einmal(fund, 'Trojan:Win32/Wacatac', '{{ fund.name }}', 'Fund')
fund = einmal(fund, 'Rechnung.pdf.exe · heute, 09:14', '{{ fund.zeile }}', 'Fund')
fund = einmal(fund, 'Der Schutz hat die Datei gestoppt und weggesperrt. Du musst nichts tun.', '{{ fund.text }}', 'Fund')

# Knoepfe: gekoppelt (Scannen, Probealarm) und nicht gekoppelt (Koppeln, Scannen).
def knoepfe(text, wo, befehle):
    teil = stueck(text, KNOEPFE, '</button></div>', wo)
    for wort, befehl in befehle:
        stelle = teil.index(wort + '</button>')
        kopf = teil.rindex('<button type="button"', 0, stelle)
        teil = teil[:kopf] + f'<button type="button" onClick="{{{{ {befehl} }}}}"' + teil[kopf + len('<button type="button"'):]
    return teil

mit = knoepfe(status, 'Status', [('Jetzt scannen', 'scan'), ('Probealarm', 'probe')])
ohne = knoepfe(board('AgentStatusUngekoppelt'), 'Ungekoppelt', [('Jetzt koppeln', 'koppeln'), ('Jetzt scannen', 'scan')])
status = einmal(status, zeilen,
    f'<sc-if value="{{{{ fundAn }}}}">{fund}</sc-if><sc-if value="{{{{ hinweisAn }}}}">{hinweis}</sc-if>'
    f'<div style="display: flex; flex-direction: column"><sc-for list="{{{{ zeilen }}}}" as="z">{eine}</sc-for></div>' + KNOEPFE, 'Status')
status = einmal(status, stueck(status, KNOEPFE, '</button></div>', 'Status'),
    f'<sc-if value="{{{{ gekoppelt }}}}">{mit}</sc-if><sc-if value="{{{{ ungekoppelt }}}}">{ohne}</sc-if>', 'Status')

# --- Koppeln ---------------------------------------------------------------
koppeln = board('AgentKoppelnFehler')
koppeln = einmal(koppeln, ' defaultValue="4821 7731"', '', 'Koppeln')
koppeln = einmal(koppeln, 'text-align: center; border-color: #a5221b"', 'text-align: center; border-color: {{ codeRand }}"', 'Koppeln')
alarm = stueck(koppeln, '<span role="alert"', 'Code falsch oder abgelaufen</span>', 'Koppeln')
koppeln = koppeln.replace(alarm, '<sc-if value="{{ fehlerAn }}">' + alarm.replace('Code falsch oder abgelaufen', '{{ fehler }}') + '</sc-if>')
koppeln = einmal(koppeln, '<button type="button" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px', '<button type="button" onClick="{{ koppleJetzt }}" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px', 'Koppeln')
koppeln = einmal(koppeln, '>Koppeln</button>', '>{{ koppelText }}</button><button type="button" onClick="{{ zurueck }}" style="align-self: center; border: 0; background: none; padding: 6px 10px; color: #4a2f9a; font-family: \'Source Serif 4\', Georgia, serif; font-size: 13px; text-decoration: underline; cursor: pointer">Später</button>', 'Koppeln')
koppeln = einmal(koppeln, 'Kranich Agent 0.4.0', 'Kranich Agent {{ version }}', 'Koppeln')

fertig = board('AgentKoppelnOk')
fertig = einmal(fertig, 'Gekoppelt als „Zephyrus“', 'Gekoppelt als „{{ name }}“', 'Gekoppelt')
fertig = einmal(fertig, '<button type="button" style="display: inline-flex', '<button type="button" onClick="{{ zurueck }}" style="display: inline-flex', 'Gekoppelt')
fertig = einmal(fertig, 'Kranich Agent 0.4.0', 'Kranich Agent {{ version }}', 'Gekoppelt')

vorlage = (f'<div><sc-if value="{{{{ sStatus }}}}">{status}</sc-if>'
           f'<sc-if value="{{{{ sKoppeln }}}}">{koppeln}</sc-if>'
           f'<sc-if value="{{{{ sFertig }}}}">{fertig}</sc-if></div>')
# Das Fenster ist genau so gross wie das Board.
vorlage = vorlage.replace('width: 360px; height: 480px;', 'width: 100vw; height: 100vh;')

SCHRIFT = '\n'.join(
    f"@font-face{{font-family:'{familie}';font-style:normal;font-weight:{gewicht};font-display:swap;"
    f"src:url('schrift/{datei}-latin-{gewicht}-normal.woff2') format('woff2')}}"
    for familie, datei, gewichte in [
        ('Bricolage Grotesque', 'bricolage-grotesque', (500, 700, 800)),
        ('Source Serif 4', 'source-serif-4', (400, 600)),
    ]
    for gewicht in gewichte
)

seite = f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; img-src 'self' data:">
<title>Kranich Agent</title>
<!-- Erzeugt von werkzeug/agent-uebernehmen.py aus canvas/Agent*.dc.html. Nicht von Hand ändern. -->
<style>
{SCHRIFT}
html,body{{height:100%;margin:0;overflow:hidden;background:#fffdf8}}
button{{cursor:pointer}}
button:focus-visible,input:focus-visible{{outline:3px solid #4a2f9a;outline-offset:2px}}
@keyframes kEar{{from{{transform:scale(0)}}to{{transform:scale(1)}}}}
@media (prefers-reduced-motion: reduce){{*,*::before,*::after{{animation:none!important}}}}
</style>
</head>
<body>
<div id="app"></div>
<template id="vorlage">{vorlage}</template>
<script src="falter.js"></script>
<script src="agent.js"></script>
<script src="start.js"></script>
</body>
</html>
'''
(wurzel / 'ui' / 'agent.html').write_text(seite, encoding='utf8')
print(f'ui/agent.html geschrieben ({len(seite) // 1024} KB)')
