'use strict';
const assert = require('node:assert/strict');
const D = require('../smartmatch-projektering-demo-v1-data.js');
const Reader = require('../smartmatch-read-codes-v9-6.js');

const demo = D.createDemo();
assert.equal(demo.doors.length, 50);
assert.deepEqual(D.validate(demo), demo);
assert.equal(D.SECTIONS.flatMap(s => s.rows).length, 26);
const codes = D.listCodes(demo);
for (let n = 1; n <= 100; n++) assert(codes.includes('GS' + n));
for (const code of ['VC', 'HVC', 'WC', 'HWC', 'DBL', 'DADS', 'DA', 'DS']) assert(codes.includes(code));
assert.equal(codes.length, 108);
assert.equal(Object.keys(demo.cards).length, 17, 'unused DA/DS library options do not change the example drawing');
for (const code of ['DA', 'DS', 'DADS']) {
  assert.equal(D.defaultShape(code), 'square');
  assert.equal(D.createCard(code).shape, 'square');
  assert.equal(D.createCard(code, 'oval').shape, 'oval', 'explicit shape remains available');
}
assert.equal(D.defaultShape('GS1'), 'oval');
assert(codes.indexOf('GS2') < codes.indexOf('GS10'));
assert.equal(D.normalizeCode(' gs 9 '), 'GS9');
assert.equal(D.normalizeCode('  Egen-2 '), 'EGEN-2');
for (const code of ['', ' ', '<GS1>', '__proto__', 'constructor', 'prototype', 'GS/1', 'A'.repeat(25), '-GS1', 'DÖRR1']) assert.throws(() => D.normalizeCode(code));
for (const code of ['DORRKORT', 'KOD', 'LITTERA', 'BETECKNING', 'BESLAGSKOD', 'KOMPONENT', 'PRODUKT', 'DORRKORT7', 'BESLAGSKORTEX', 'KOD-7']) assert.throws(() => D.normalizeCode(code), /rubrik/);
for (const code of ['ID1', 'KOD1', 'DORR1', 'DA', 'DS', 'DBL-DS', 'EGEN1']) assert.equal(D.normalizeCode(code), code);
for (const code of codes.concat(['ID1', 'KOD1', 'DORR1', 'DBL-DS', 'EGEN1'])) {
  assert.equal(Reader.normalize(code), D.matchKey(code), 'the current reader must preserve the complete identity of ' + code);
}
assert.equal(D.matchKey('DBL-DS'), 'DBLDS');

// One shared card changes, while every physical door retains its own position/ID.
const beforeDoors = D.clone(demo.doors), beforeGS2 = D.clone(demo.cards.GS2);
const gs1 = D.clone(demo.cards.GS1), oldRevision = demo.project.revision;
gs1.rows[0].product = 'Eget nytt låshus';
D.updateCard(demo, 'GS1', gs1);
assert.equal(demo.project.revision, oldRevision + 1);
assert.deepEqual(demo.doors, beforeDoors);
assert.deepEqual(demo.cards.GS2, beforeGS2);
assert(demo.doors.filter(d => d.code === 'GS1').length >= 4);
for (const door of demo.doors.filter(d => d.code === 'GS1')) assert.equal(demo.cards[door.code].rows[0].product, 'Eget nytt låshus');
gs1.rows[0].product = 'Changing the draft must not change the saved card';
assert.equal(demo.cards.GS1.rows[0].product, 'Eget nytt låshus');

const ownerCard = D.clone(demo.cards.GS1), destination = demo.doors[1];
D.assignDoor(demo, destination.id, 'gs1', 'square');
assert.equal(destination.code, 'GS1');
assert.deepEqual(demo.cards.GS1, ownerCard, 'assigning a reused code must never erase or restyle its saved card');
D.assignDoor(demo, destination.id, 'EGEN-3', 'square');
assert.equal(demo.cards['EGEN-3'].shape, 'square');
assert.equal(demo.cards['EGEN-3'].rows.length, 26);
assert(D.listCodes(demo).includes('EGEN-3'));
assert.throws(() => D.assignDoor(demo, 'missing', 'GS1'));
const cardCount = Object.keys(demo.cards).length;
assert.throws(() => D.ensureCard(demo, 'GS-1'), /förväxlas/);
assert.throws(() => D.assignDoor(demo, destination.id, 'GS-1'), /förväxlas/);
assert.equal(Object.keys(demo.cards).length, cardCount);
const dsCard = D.ensureCard(demo, 'DS');
assert.equal(dsCard.shape, 'square');
D.assignDoor(demo, destination.id, 'DA');
assert.equal(demo.cards.DA.shape, 'square');

const custom = D.addProduct(demo, { name: 'Vårt lås ABC', category: 'lock', description: 'Egen katalograd' });
assert(custom.id.startsWith('custom-'));
assert(D.searchProducts(demo, 'lock', 'vart las').some(product => product.id === custom.id));
assert(!D.searchProducts(demo, 'sensor', 'vart las').length);
assert(D.searchProducts(demo, 'sensor', 'FLAT').some(p => p.name === 'Flatscan'));
assert(D.searchProducts(demo, 'cylinder', '8882').length);
assert(!D.searchProducts(demo, 'handle', '8882').length);
assert.throws(() => D.addProduct(demo, { ...custom }));
assert.throws(() => D.addProduct(demo, { name: 'X', category: 'unknown' }));

const exported = D.serialize(demo), restored = D.validate(JSON.parse(exported));
assert.deepEqual(restored, demo);
restored.cards.GS1.rows[0].product = 'isolated restored draft';
assert.equal(demo.cards.GS1.rows[0].product, 'Eget nytt låshus');
const memory = new Map(), storage = { setItem: (key, value) => memory.set(key, value), getItem: key => memory.get(key) ?? null };
assert.equal(D.load(storage), null);
D.save(demo, storage);
assert.deepEqual(D.load(storage), demo);
assert.equal([...memory.keys()][0], 'tillsyno-projektering-demo-v1');
assert.throws(() => D.save(demo, { setItem() { throw Error('quota'); } }), /quota/);

// Malformed imports must fail before replacing the current project.
for (const alter of [
  s => { s.schema = 2; },
  s => { s.doors = []; },
  s => { s.doors[0].code = 'MISSING'; },
  s => { s.doors[0].x = Infinity; },
  s => { s.doors[0].y = -1; },
  s => { s.doors[1].id = s.doors[0].id; },
  s => { s.cards.GS1.rows[0].quantity = 0; },
  s => { s.cards.GS1.rows[0].quantity = '1'; },
  s => { s.cards.GS1.rows[0].label = 'Another field'; },
  s => { s.cards.GS1.rows.pop(); },
  s => { s.cards.GS1.code = 'GS2'; },
  s => { s.cards['GS-1'] = D.createCard('GS-1'); },
  s => { s.customProducts.push(s.customProducts[0]); },
  s => { s.project.updatedAt = 'yesterday'; }
]) {
  const invalid = D.clone(demo);
  alter(invalid);
  assert.throws(() => D.validate(invalid));
}
const stable = D.serialize(demo);
const invalidDraft = D.clone(demo.cards.GS1); invalidDraft.rows[0].quantity = 0;
assert.throws(() => D.updateCard(demo, 'GS1', invalidDraft));
assert.equal(D.serialize(demo), stable, 'invalid edits are atomic and leave saved data untouched');
console.log('Projekteringsdemo data: shared cards, 50 positions, code library, category search, portable storage and invalid-import protection passed.');
