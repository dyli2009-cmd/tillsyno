'use strict';
// Reuse the existing event-capable fixture, running the real selection controller
// and session history. These checks cover state changes, not browser layout.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const fixturePath = path.join(__dirname, 'security-stamp-selection-v549.cjs');
const fixtureSource = fs.readFileSync(fixturePath, 'utf8');
const setupEnd = fixtureSource.indexOf("\ncheck('individual selection");
const fixtureStart = fixtureSource.indexOf('function controllerFixture(');
const fixtureEnd = fixtureSource.indexOf("\ncheck('actual controller selects", fixtureStart);
assert(setupEnd > 0 && fixtureStart > setupEnd && fixtureEnd > fixtureStart, 'existing selection fixture declarations are available');
const fixtureContext = vm.createContext({require: createRequire(fixturePath), __dirname, console});
vm.runInContext(fixtureSource.slice(0, setupEnd) + '\n' + fixtureSource.slice(fixtureStart, fixtureEnd) +
  '\nglobalThis.testTools={controllerFixture,stamp,createModel};', fixtureContext, {filename: fixturePath});
const {controllerFixture, stamp, createModel} = fixtureContext.testTools;
const plain = value => JSON.parse(JSON.stringify(value));
const ids = objects => plain(objects.map(object => object.uid));
const tests = [];
const check = (name, fn) => tests.push({name, fn});
const box = {left:20, top:20, right:64, bottom:64, width:44, height:44};

function withProtocol(uid, type = 'lock', page = 1, extra = {}) {
  return stamp(uid, type, page, {id:uid.toUpperCase(), notes:'Anteckning ' + uid,
    checks:{a:{result:'remark', note:'Byt slutbleck ' + uid}, b:{result:'ok', note:''}},
    customChecks:[{id:'custom', title:'Egen kontroll'}],
    previousIssues:[{note:'Tidigare service ' + uid}],
    protocolLabel:'Protokoll ' + uid, ...extra});
}

function setup(list, options) {
  const f = controllerFixture(options);
  f.state.setItems(list);
  // Unrelated drawing content and project data must survive batch deletion.
  vm.runInContext(`
    let textNotes=[{uid:'text-note',text:'Behåll denna text',page:1,x:.4,y:.6}];
    let drawingExtras=[{uid:'manual-arrow',type:'arrow',page:2,points:[.1,.2,.3,.4]}];
    let project={name:'Originalprojekt',sourceFileName:'Service.pdf'},logoData='logo-fixture';
    fixture.extraState=()=>JSON.parse(JSON.stringify({textNotes,drawingExtras,project,logoData}));
    fixture.setCurrent=uid=>{selected=uid};
    fixture.current=()=>selected;
  `, f.context);
  const requests = [];
  f.context.ControlflowDialogs = {
    enabled: () => true,
    confirm: options => new Promise(resolve => requests.push({options:plain(options), resolve}))
  };
  f.api.start();
  f.requests = requests;
  f.beginDelete = () => {
    const button = f.$('securityStampSelectionDelete');
    assert(button, 'delete action is present in the actual selection panel');
    return button.onclick();
  };
  f.selectAll = () => f.$('securityStampSelectAll').click();
  f.selectOne = uid => f.marker(uid, box).click();
  return f;
}

check('model deletes only selected active stamps and leaves their complete data available for history', () => {
  const first = withProtocol('a', 'lock', 1, {positionLocked:true});
  const second = withProtocol('b', 'detector', 2);
  const inactive = withProtocol('inactive', 'automation');
  const fire = withProtocol('fire', 'fire_detector');
  const unknown = {uid:'plain-text', type:'text', text:'Keep me'};
  let list = [first, second, inactive, fire, unknown];
  const snapshots = plain(list), calls = [];
  const model = createModel({document:()=>1, page:()=>1, items:()=>list,
    eligible:object=>['lock','detector'].includes(object.type), visible:()=>true,
    checks:()=>[], syncStatus:()=>{throw new Error('deletion must not rewrite protocol answers');},
    remove:objects=>{calls.push([...objects]); const removed = new Set(objects); list=list.filter(object=>!removed.has(object)); return objects.length;}
  });
  model.toggle('a');
  assert.equal(model.apply('delete').objects, 1);
  assert.deepEqual(ids(list), ['b','inactive','fire','plain-text']);
  assert.equal(calls[0][0], first, 'the adapter receives selected object references');
  assert.deepEqual(plain(first), snapshots[0], 'the removed record remains whole for undo');
  assert.deepEqual(ids(model.selected()), []);
  assert.equal(model.apply('delete').objects, 0);
  assert.equal(calls.length, 1, 'an empty selection does not invoke removal');
  model.all();
  assert.equal(model.apply('delete').objects, 1, 'all includes the eligible stamp on the second page');
  assert.deepEqual(plain(list), snapshots.slice(2));
});

check('no selection disables deletion and cannot open a confirmation or save', async () => {
  const f = setup([withProtocol('a')]);
  assert.equal(f.$('securityStampSelectionDelete').disabled, true);
  await f.beginDelete();
  assert.equal(f.requests.length, 0);
  assert.equal(f.state.counters.save, 0);
  assert.deepEqual(ids(f.state.getItems()), ['a']);
});

check('cancel preserves selection, protocols and history; a retry deletes one chosen object', async () => {
  const f = setup([withProtocol('a'), withProtocol('keep')]);
  f.selectOne('a');
  const before = plain(f.state.getItems());
  const first = f.beginDelete();
  assert.equal(f.requests.length, 1);
  assert.equal(f.api.isBusy(), true);
  assert.equal(f.$('securityStampSelectionDelete').disabled, true);
  assert.equal(f.$('securityStampSelectAll').disabled, true);
  assert.equal(f.state.counters.save, 0, 'confirmation precedes all data changes');
  f.requests[0].resolve(false);
  await first;
  assert.deepEqual(plain(f.state.getItems()), before);
  assert.deepEqual(plain(f.api.selectedIds()), ['a']);
  assert.equal(f.state.counters.undo, 0);
  assert.equal(f.api.isBusy(), false);
  const retry = f.beginDelete();
  f.requests[1].resolve(true);
  await retry;
  assert.deepEqual(plain(f.state.getItems()), before.slice(1));
  assert.equal(f.state.counters.save, 1);
  assert.equal(f.state.counters.undo, 1);
});

for (const mode of ['security', 'revision']) {
  check(mode + ': all-page deletion includes locked stamps, preserves other data and has one complete undo/redo', async () => {
    const types = mode === 'security' ? ['lock','detector','alarm'] : ['automation','automation_selfcheck','lock_revision'];
    const original = [withProtocol('a',types[0],1,{positionLocked:true}), withProtocol('b',types[1],3),
      withProtocol('keep',types[2],1), withProtocol('fire','fire_detector',1)];
    const f = setup(original, {mode});
    f.selectAll();
    f.selectOne('keep');
    assert.deepEqual(plain(f.api.selectedIds()), ['a','b']);
    f.state.setCurrent('a');
    const before = plain(f.state.getItems()), extra = f.state.extraState();
    const pending = f.beginDelete();
    const copy = f.requests[0].options;
    assert.match(copy.title, /2/, 'confirmation names how many selected objects will be removed');
    assert.match(copy.description, /2[^\n.]*sidor/i, 'confirmation explains its cross-page scope');
    assert.match(copy.description, /protokoll|kontrollpunkter/i, 'confirmation explains associated data removal');
    assert.deepEqual(plain(f.state.getItems()), before);
    f.requests[0].resolve(true);
    await pending;
    assert.deepEqual(plain(f.state.getItems()), before.slice(2));
    assert.deepEqual(plain(f.state.extraState()), plain(extra));
    assert.equal(f.state.current(), null);
    assert.deepEqual(plain(f.api.selectedIds()), []);
    assert.equal(f.$('securityStampSelectionDelete').disabled, true);
    assert.equal(f.state.counters.save, 1);
    assert.equal(f.state.counters.undo, 1, 'all deletions form one history entry');
    assert.equal(f.state.counters.protocol, 1);
    assert.equal(f.state.counters.overview, 1);
    assert.equal(f.state.undo(), true);
    assert.deepEqual(plain(f.state.getItems()), before, 'undo restores complete checks, notes, custom data and position locks');
    assert.deepEqual(plain(f.state.extraState()), plain(extra));
    assert.equal(f.state.redo(), true);
    assert.deepEqual(plain(f.state.getItems()), before.slice(2));
    assert.deepEqual(plain(f.state.extraState()), plain(extra));
  });
}

check('repeated delete clicks during confirmation cannot start or commit a second deletion', async () => {
  const f = setup([withProtocol('a'), withProtocol('b')]);
  f.selectAll();
  const first = f.beginDelete();
  const duplicate = f.beginDelete();
  assert.equal(f.requests.length, 1);
  await duplicate;
  assert.equal(f.state.counters.save, 0);
  f.requests[0].resolve(true);
  await first;
  assert.deepEqual(ids(f.state.getItems()), []);
  assert.equal(f.state.counters.save, 1);
  assert.equal(f.state.counters.undo, 1);
});

for (const scenario of ['different document', 'selection stopped', 'selected UID removed', 'same UIDs replaced']) {
  check('pending deletion is discarded after ' + scenario, async () => {
    const f = setup([withProtocol('a'), withProtocol('b')]);
    f.selectAll();
    const pending = f.beginDelete();
    if (scenario === 'different document') f.state.setDocument();
    else if (scenario === 'selection stopped') f.api.stop();
    else if (scenario === 'selected UID removed') { f.state.setItems(f.state.getItems().slice(1)); f.api.refresh(); }
    else { f.state.setItems(plain(f.state.getItems())); f.api.refresh(); }
    const changedState = plain(f.state.getItems());
    f.requests[0].resolve(true);
    await pending;
    assert.deepEqual(plain(f.state.getItems()), changedState);
    assert.equal(f.state.counters.save, 0);
    assert.equal(f.state.counters.undo, 0);
    assert.equal(f.api.isBusy(), false);
  });
}

for (const condition of ['loading', 'exporting']) {
  check('pending deletion is discarded when the drawing becomes ' + condition, async () => {
    const f = setup([withProtocol('a')]);
    f.selectAll();
    const pending = f.beginDelete();
    if (condition === 'loading') f.state.setBusy(true); else f.document.body.classList.add('exporting');
    f.requests[0].resolve(true);
    await pending;
    assert.deepEqual(ids(f.state.getItems()), ['a']);
    assert.equal(f.state.counters.save, 0);
    assert.equal(f.state.counters.undo, 0);
    if (condition === 'loading') f.state.setBusy(false); else f.document.body.classList.remove('exporting');
    f.api.refresh();
    assert.equal(f.api.isBusy(), false);
  });
}

check('Escape reaches the pending confirmation instead of exiting the selection tool', async () => {
  const f = setup([withProtocol('a')]);
  f.selectAll();
  const pending = f.beginDelete();
  const dialog = f.document.createElement('dialog');
  dialog.id = 'controlflowAppDialog';
  f.document.body.append(dialog);
  const event = dialog.emit('keydown', {key:'Escape'});
  assert.equal(event.defaultPrevented, false, 'the native modal must be able to cancel');
  assert.equal(event.stopped, false);
  assert.equal(f.api.isActive(), true);
  assert.deepEqual(plain(f.api.selectedIds()), ['a']);
  f.requests[0].resolve(false);
  await pending;
  assert.deepEqual(ids(f.state.getItems()), ['a']);
  assert.equal(f.state.counters.save, 0);
});

check('an unavailable confirmation API cannot silently delete selected objects', async () => {
  const f = setup([withProtocol('a')]);
  f.selectAll();
  delete f.context.ControlflowDialogs;
  await f.beginDelete();
  assert.deepEqual(ids(f.state.getItems()), ['a']);
  assert.equal(f.state.counters.save, 0);
  assert.equal(f.state.counters.undo, 0);
  assert.equal(f.api.isBusy(), false);
});

(async () => {
  for (const {name,fn} of tests) {
    try { await fn(); }
    catch (error) { error.message = name + ': ' + error.message; throw error; }
  }
  console.log('Controlflow selection delete v553: ' + tests.length + ' scenarios passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
