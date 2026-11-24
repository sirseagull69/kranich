#!/bin/sh
# Kopiert die gemeinsamen Bauteile in jede App (Electron packt nur den App-Ordner ein).
cd "$(dirname "$0")/.."
for z in ui albatros/ui specht/ui schwalbe/ui; do cp gemeinsam/oo-rahmen.js gemeinsam/oo-rahmen.css "$z/"; done
for z in kern albatros/kern specht/kern schwalbe/kern launcher/main; do cp gemeinsam/drehscheibe.js "$z/"; done
echo verteilt
