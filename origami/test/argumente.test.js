'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { normAdresse, leseArgumente, zielUrl, gleicherServer } = require('../kern/argumente');

test('Adresse wird aufgeräumt', () => {
  assert.strictEqual(normAdresse('192.168.0.20:8080'), 'http://192.168.0.20:8080');
  assert.strictEqual(normAdresse(' https://ori.example.de/ '), 'https://ori.example.de');
  assert.strictEqual(normAdresse(''), '');
  assert.strictEqual(normAdresse('javascript:alert(1)'), '');
});

test('Argumente vom Startfenster', () => {
  const a = leseArgumente(['origami.exe', '--adresse=10.0.0.5:3000', '--frage=Was steht an?']);
  assert.deepStrictEqual(a, { adresse: 'http://10.0.0.5:3000', frage: 'Was steht an?' });
  assert.deepStrictEqual(leseArgumente(['origami.exe']), { adresse: '', frage: '' });
});

test('Ziel-URL mit Frage', () => {
  assert.strictEqual(zielUrl('http://10.0.0.5:3000', ''), 'http://10.0.0.5:3000');
  assert.strictEqual(zielUrl('http://10.0.0.5:3000', 'Hallo Ori & co'), 'http://10.0.0.5:3000/?frage=Hallo+Ori+%26+co');
  assert.strictEqual(zielUrl('http://h/?x=1', 'a'), 'http://h/?x=1&frage=a');
});

test('Gleicher Server', () => {
  assert.ok(gleicherServer('http://10.0.0.5:3000/chat', 'http://10.0.0.5:3000'));
  assert.ok(!gleicherServer('https://github.com', 'http://10.0.0.5:3000'));
});
