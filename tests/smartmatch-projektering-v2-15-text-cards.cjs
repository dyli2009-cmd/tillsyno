'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const D = require('../smartmatch-projektering-v2-15-data.js');
const L = require('../smartmatch-projektering-v2-15-library.js');
const oldLibrary = require('../smartmatch-projektering-v2-13-library.js');
const PDF = require('../smartmatch-projektering-v2-15-pdf.js');
const pdfjs = require('../vendor/pdf.min.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../vendor/pdf.worker.min.js');
const clone = value => JSON.parse(JSON.stringify(value));

(async () => {
  const lib = L.createDefault(), initial = D.createEmpty();
  const groups = L.groupsFor(lib, 'cards');
  assert.deepEqual(groups.filter(g => !g.fallback).map(g => g.name), ['DBL / WC', 'GS1–GS100']);
  assert.equal(Object.values(initial.stencils).filter(s => L.groupFor(lib, s) === 'GS').length, 100);
  for (const code of ['WC:1', 'HWC:1']) {
    const s = initial.stencils[code];
    assert.equal(s.kind, 'card'); assert.equal(L.groupFor(lib, s), 'DBL-WC');
    assert(s.width / s.height < 1.6, 'default yellow restroom stamp is rounder');
  }
  assert.equal(L.groupFor(lib, initial.stencils['DBL:1']), 'DBL-WC');
  assert.equal(L.groupFor(lib, initial.stencils.DA), 'symbols-other');
  assert.equal(L.groupFor(lib, D.defaultStencil('GS101')), 'cards-other');
  assert(!Object.values(initial.stencils).some(s => s.code.startsWith('DGS')));
  for (const code of ['DGS', 'DGS100', 'DGS100:1']) assert(L.isHidden(lib, code));

  const legacy = clone(lib);
  legacy.groups = legacy.groups.filter(g => g.id !== 'DBL-WC');
  legacy.groups.push({id:'DBL',name:'DBL',section:'cards',prefixes:['DBL'],fallback:false}, {id:'WC',name:'WC',section:'cards',prefixes:['WC'],fallback:false}, {id:'HWC',name:'HWC',section:'cards',prefixes:['HWC'],fallback:false});
  legacy.assignments = {'WC:1':'WC', 'HWC:2':'HWC', 'DBL:1':'DBL'};
  const upgradedLibrary = L.validate(legacy);
  assert.deepEqual(upgradedLibrary.assignments, {'WC:1':'DBL-WC','HWC:2':'DBL-WC','DBL:1':'DBL-WC'});
  assert.equal(upgradedLibrary.groups.filter(g => g.id === 'DBL-WC').length, 1);
  assert.deepEqual(L.validate(upgradedLibrary), upgradedLibrary, 'group upgrade is idempotent');
  assert.equal(L.groupFor(L.validate(oldLibrary.createDefault()), D.defaultStencil('HWC:2')), 'DBL-WC');

  const {state, original} = await PDF.blank('WC och HWC');
  for (const code of ['WC:1', 'HWC:1']) {
    state.stencils[code].width = 68;
    D.addPlacement(state, {stencilId:code,page:1,x:code === 'WC:1' ? .4 : .6,y:.5,rotation:code === 'WC:1' ? 0 : 180});
    state.cards[code].note = 'Sparat innehåll för ' + code;
    state.cards[code].rows[0].product = 'Sparad produkt';
  }
  // A personal size and an already used legacy code must survive the upgrade.
  D.addPlacement(state, {stencilId:'WC:1',page:1,x:.4,y:.7,width:80,height:40});
  D.addStencil(state, D.defaultStencil('DGS100:1'));
  D.addPlacement(state, {stencilId:'DGS100:1',page:1,x:.7,y:.7});
  const before = clone(state), updated = D.validate(D.upgradeRestroomStencils(state));
  assert.deepEqual(state, before, 'upgrade does not mutate the source');
  assert.deepEqual(updated.cards, before.cards, 'all saved card fields survive');
  assert.deepEqual(updated.preferences, before.preferences);
  assert.deepEqual(updated.placements[2], before.placements[2], 'personal size survives');
  assert.deepEqual(updated.placements[3], before.placements[3], 'used DGS placement survives');
  for (let i = 0; i < 2; i++) assert.deepEqual(updated.placements[i], {...before.placements[i],width:52});
  assert.deepEqual(D.upgradeRestroomStencils(updated), updated, 'stamp upgrade is idempotent');
  const personal = clone(before); personal.stencils['WC:1'].fill = '#123456';
  assert.deepEqual(D.upgradeRestroomStencils(personal).stencils['WC:1'], personal.stencils['WC:1']);
  const savedTemplate = {...before.stencils['HWC:1']};
  assert.equal(L.saveStencil(lib, savedTemplate).stencils[0].width, 52);

  const output = await PDF.build(updated, original, {mode:'drawing'});
  const document = await pdfjs.getDocument({data:output.slice(),disableFontFace:true,useSystemFonts:true}).promise;
  const page = await document.getPage(1), text = (await page.getTextContent()).items.map(i => i.str).filter(Boolean);
  assert.equal(text.filter(t => t === 'WC:1').length, 2);
  assert.equal(text.filter(t => t === 'HWC:1').length, 1, 'rotated HWC is native searchable text');
  assert(text.includes('DGS100:1'), 'used historical card still exports');
  const reopened = await PDF.inspect(output);
  assert.deepEqual(reopened.state, updated, 'export reopens with complete editable card data');
  assert.deepEqual(reopened.original, original, 'original drawing remains intact');
  await document.destroy();
  for (const file of ['smartmatch-projektering.html','smartmatch-projektering-v2-14.html','smartmatch-projektering-v2-15.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    for (const module of ['data.js','pdf.js']) assert(html.includes('v2-15-' + module + '?v=2.15.1'));
    assert(html.includes('v2-15-library.js?v=2.15.2'));
    assert(html.includes('v2-15.js?v=2.15.1'));
  }
  console.log('PASS: groups, 100 GS defaults, no default DGS, DA under Other, safe saved-data migrations, rounder stamps, native WC/HWC PDF text, editable PDF round trip and current entry points.');
})().catch(error => {console.error(error);process.exitCode = 1;});
