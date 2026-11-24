#!/bin/sh
# Kopiert die gemeinsamen Bauteile in jede App (Electron packt nur den App-Ordner ein).
cd "$(dirname "$0")/.."
for z in ui albatros/ui specht/ui schwalbe/ui; do cp gemeinsam/oo-rahmen.js gemeinsam/oo-rahmen.css gemeinsam/ori-leiste.js gemeinsam/ori-leiste.css "$z/"; done
for z in kern albatros/kern specht/kern schwalbe/kern; do cp gemeinsam/drehscheibe.js gemeinsam/ori-kern.js "$z/"; done
cp gemeinsam/drehscheibe.js launcher/main/
echo verteilt
