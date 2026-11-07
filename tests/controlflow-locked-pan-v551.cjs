'use strict';
// Run the established touch scenarios against both real viewport implementations,
// then exercise the real pointer handlers. This is logic QA, not device emulation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const touchHarness = fs.readFileSync(path.join(__dirname, 'security-locked-pan-v549.cjs'), 'utf8');
let scenarios = 0;
for (const file of ['security.js', 'controlflow-revision/security-v335.js']) {
  const harness = touchHarness.replace("path.join(__dirname, '..', 'security.js')", 'path.join(__dirname, "..", ' + JSON.stringify(file) + ')');
  vm.runInNewContext(harness, {require, __dirname, console}, {filename: file + ':touch-scenarios'});
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const start = source.indexOf("viewer.addEventListener('pointerdown',e=>{\n if(!pdf||drawingGestureLocked");
  const end = source.indexOf('\nfunction beginSecurityPinch(e){', start);
  assert(start >= 0 && end > start);
  function fixture() {
    const events = {}, calls = {captures:0, releases:0, suppress:0};
    const viewer = {scrollLeft:100, scrollTop:200, classList:{add(){}, remove(){}},
      addEventListener(type, listener){events[type]=listener;},
      setPointerCapture(){calls.captures++;}, releasePointerCapture(){calls.releases++;}};
    const context = vm.createContext({viewer, Math, pdf:{}, drawingGestureLocked:false,
      drawingLockScroll:null, addType:null, textMode:false, panMouse:null,
      window:{SecurityStampSelection:{panFrom:target=>target.kind==='locked', suppressClick:()=>calls.suppress++}}});
    vm.runInContext(source.slice(start,end), context);
    const event = (kind, x, y, pointerType='mouse') => ({pointerId:1, button:0, pointerType,
      clientX:x, clientY:y, target:{kind, closest(){return kind==='background'?null:this;}},
      defaultPrevented:false, preventDefault(){this.defaultPrevented=true;}});
    return {context, viewer, events, calls, event};
  }
  {
    const f=fixture(), down=f.event('locked',10,20);
    f.events.pointerdown(down); f.events.pointermove(f.event('locked',12,22));
    assert.equal(down.defaultPrevented,false);
    assert.equal(f.calls.captures,0,'a stationary locked stamp keeps its native click');
    assert.deepEqual([f.viewer.scrollLeft,f.viewer.scrollTop],[100,200]);
    f.events.pointerup(f.event('locked',12,22));
    assert.equal(f.calls.suppress,0); scenarios++;
  }
  {
    const f=fixture(); f.events.pointerdown(f.event('locked',10,20));
    f.events.pointermove(f.event('locked',60,80));
    assert.deepEqual([f.viewer.scrollLeft,f.viewer.scrollTop],[50,140]);
    assert.equal(f.calls.captures,1);
    f.events.pointerup(f.event('locked',60,80));
    assert.equal(f.calls.suppress,1,'panning cannot accidentally open a protocol');
    assert.equal(f.context.panMouse,null); scenarios++;
  }
  {
    const f=fixture(); f.events.pointerdown(f.event('unlocked',10,20));
    assert.equal(f.context.panMouse,null,'unlocked markers keep their object-drag handler');
    f.events.pointerdown(f.event('background',10,20,'touch'));
    assert.equal(f.context.panMouse,null,'touch remains owned by the touch handlers'); scenarios++;
  }
  {
    const f=fixture(); f.events.pointerdown(f.event('background',10,20));
    f.events.pointermove(f.event('background',30,50));
    assert.deepEqual([f.viewer.scrollLeft,f.viewer.scrollTop],[80,170]);
    f.events.pointercancel(f.event('background',30,50));
    assert.equal(f.context.panMouse,null); assert.equal(f.calls.suppress,0); scenarios++;
  }
}
console.log(`Controlflow locked-pan v551: both sets of touch scenarios and ${scenarios} mouse scenarios passed.`);
