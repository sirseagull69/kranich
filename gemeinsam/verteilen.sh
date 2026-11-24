#!/bin/sh
# Kopiert das gemeinsame Bauteil in jede App (Electron packt nur den App-Ordner ein).
cd "$(dirname "$0")/.."
for z in ui albatros/ui specht/ui schwalbe/ui; do cp gemeinsam/oo-rahmen.js gemeinsam/oo-rahmen.css "$z/"; done
echo verteilt
