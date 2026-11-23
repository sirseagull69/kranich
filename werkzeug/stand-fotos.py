# Aktueller Stand der Familie als Bilder für Kranich (ui/stand/).
# Vorher die Rauchtests laufen lassen (Kranich, Albatros) und das Startfenster fotografieren.
# Aufruf: python3 werkzeug/stand-fotos.py
from PIL import Image
import os
Q = {
  'kranich-start.jpg': 'rauch/1-start.png',
  'kranich-arbeitsflaeche.jpg': 'rauch/4b-direkt.png',
  'kranich-vorschau.jpg': 'rauch/19-abspielen.png',
  'albatros-start.jpg': 'albatros/rauch/1-start.png',
  'albatros-tabelle.jpg': 'albatros/rauch/4-helfer.png',
  'startfenster.jpg': '/tmp/l5.png',
}
for ziel, quelle in Q.items():
    if not os.path.exists(quelle): print('fehlt', quelle); continue
    im = Image.open(quelle).convert('RGB'); im.thumbnail((1280, 1280)); im.save(os.path.join('ui/stand', ziel), quality=72)
    print('ok', ziel)
