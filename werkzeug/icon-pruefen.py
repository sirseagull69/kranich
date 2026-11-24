#!/usr/bin/env python3
# Prüft, dass kein Vogel in die Falte (Eselsohr) ragt, und rückt ihn sonst zurecht.
# Schreibt werkzeug/icon-lagen.json und baut danach die Icons neu: python3 werkzeug/icon-pruefen.py
import json, subprocess, os
from PIL import Image
HIER = os.path.dirname(os.path.abspath(__file__)); WURZEL = os.path.dirname(HIER)
ZIEL = 56           # Mindestabstand zum umgeklappten Eselsohr (Fläche x 758–928, y 96–266), in px bei 1024
START = {'.': [150, 150, 720], 'albatros': [132, 150, 760], 'schwalbe': [150, 150, 740], 'specht': [150, 150, 720], 'origami': [150, 150, 720], 'startfenster': [0, 0, 1]}
def name(o): return 'kranich' if o == '.' else o
def messen(o):
    im = Image.open(f'/tmp/vogel-{name(o)}.png').convert('RGBA'); a = im.split()[3]
    px = a.load(); w, h = a.size; m = 9999
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if px[x, y] > 40:
                dx = max(758 - x, 0); dy = max(y - 266, 0)
                m = min(m, (dx * dx + dy * dy) ** 0.5)
    return m, a.getbbox()
def bauen(lagen, nur_vogel=True):
    json.dump(lagen, open(os.path.join(HIER, 'icon-lagen.json'), 'w'), indent=1)
    env = dict(os.environ, NUR_VOGEL='1' if nur_vogel else '0')
    subprocess.run(['node', os.path.join(HIER, 'app-icons.js')], env=env, check=True, stdout=subprocess.DEVNULL)
lagen = {k: list(v) for k, v in START.items()}
for runde in range(30):
    bauen(lagen); fertig = True
    for o in START:
        m, bb = messen(o)
        if m >= ZIEL: continue
        fertig = False
        if o == 'startfenster':
            x, y, s = lagen[o]; s2 = s * 0.96; lagen[o] = [x + 512 * (s - s2) - 6, y + 512 * (s - s2) + 6, s2]
        else:
            x, y, g = lagen[o]; g2 = g * 0.96
            # kleiner um die Mitte, etwas nach links unten
            lagen[o] = [round(x + (g - g2) / 2 - 8), round(y + (g - g2) / 2 + 8), round(g2)]
    if fertig: break
for o in START:
    m, bb = messen(o); print(o, 'Abstand', round(m), 'Box', bb, 'Lage', lagen[o])
bauen(lagen, nur_vogel=False)
