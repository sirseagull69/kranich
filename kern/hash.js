'use strict';
// Fingerabdruck (SHA-256) einer Datei. Liest in Stuecken, damit auch
// grosse Dateien den Arbeitsspeicher nicht fuellen.

const crypto = require('node:crypto');
const fs = require('node:fs');

function sha256(pfad, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const strom = fs.createReadStream(pfad, { signal });
    strom.on('data', (stueck) => hash.update(stueck));
    strom.on('error', reject);
    strom.on('end', () => resolve(hash.digest('hex')));
  });
}

module.exports = { sha256 };
