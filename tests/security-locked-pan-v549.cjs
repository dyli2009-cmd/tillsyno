'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the real touch handlers: in particular, a detector box has no
// ordinary marker pointerup guard when it is locked and no drag was started.
const source = fs.readFileSync(path.join(__dirname, '..', 'security.js'), 'utf8');
const first = source.indexOf("viewer.addEventListener('touchstart',e=>{");
const lastText = "viewer.addEventListener('touchcancel',endTouch,{passive:true});";
const last = source.indexOf(lastText, first);
assert(first >= 0 && last > first, 'actual viewport touch handlers must exist');
const handlers = source.slice(first, last + lastText.length);

function fixture() {
  let clock = 10000;
  const events = new Map();
  const calls = { draw: 0, suppress: 0, pages: [], pinchStart: 0, pinchCommit: 0 };
  const viewer = {
    scrollLeft: 100, scrollTop: 200,
    addEventListener(type, callback) { events.set(type, callback); },
    getBoundingClientRect() { return { left: 0, top: 0 }; }
  };
  const stage = { style: {} }, zoomLabel = { textContent: '' };
  const context = vm.createContext({
    viewer, console, Math, Date: { now: () => clock },
    drawingGestureLocked: false, drawingLockScroll: null,
    panTouch: null, pinch: null, addType: null, textMode: false,
    zoom: 1, visualZoom: 1, pageWidth: 500, pageHeight: 600,
    suppressPageSwipeUntil: 0, selected: 'locked-detector',
    lastObjectTap: { uid: 'locked-detector', time: 9990 },
    window: { SecurityStampSelection: {
      panFrom: target => target.kind === 'locked',
      suppressClick: () => calls.suppress++
    } },
    $: id => id === 'secStage' ? stage : zoomLabel,
    drawMarkers: () => calls.draw++,
    changeSecurityPage: direction => { calls.pages.push(direction); return true; },
    beginSecurityPinch: () => {
      calls.pinchStart++;
      context.panTouch = null;
      context.pinch = { zoom: 1, dist: 100, anchor: { x: .5, y: .5 }, stageLeft: 0, stageTop: 0 };
    },
    commitSecurityPinch: () => calls.pinchCommit++
  });
  vm.runInContext(handlers, context);
  const targets = Object.fromEntries(['locked', 'unlocked', 'background'].map(kind => [kind, {
    kind, closest() { return kind === 'background' ? null : this; }
  }]));
  function emit(type, kind, points, changed = points) {
    const event = {
      target: targets[kind], touches: points.map(([clientX, clientY]) => ({ clientX, clientY })),
      changedTouches: changed.map(([clientX, clientY]) => ({ clientX, clientY })),
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }
    };
    events.get(type)(event);
    return event;
  }
  return { context, viewer, calls, emit, tick(ms) { clock += ms; } };
}

let scenarios = 0;
function check(name, run) {
  try { run(); scenarios++; }
  catch (error) { error.message = name + ': ' + error.message; throw error; }
}

check('stationary locked detector keeps its original node and native protocol click', () => {
  const f = fixture();
  const down = f.emit('touchstart', 'locked', [[40, 50]]);
  assert.equal(f.context.panTouch.fromStamp, true);
  assert.equal(down.defaultPrevented, false);
  const slightMove = f.emit('touchmove', 'locked', [[43, 54]]);
  assert.equal(slightMove.defaultPrevented, false, 'five-pixel finger jitter must not cancel native click');
  f.tick(100);
  f.emit('touchend', 'locked', [], [[43, 54]]);
  assert.equal(f.context.selected, 'locked-detector');
  assert.equal(f.context.lastObjectTap.uid, 'locked-detector');
  assert.equal(f.calls.draw, 0, 'do not replace the detector button before its synthetic click');
  assert.equal(f.calls.suppress, 0);
  assert.deepEqual(f.calls.pages, []);
  assert.deepEqual([f.viewer.scrollLeft, f.viewer.scrollTop], [100, 200]);
  assert.equal(f.context.panTouch, null);
});

check('dragging from a locked stamp pans and suppresses clicks without changing pages', () => {
  const f = fixture();
  f.emit('touchstart', 'locked', [[100, 120]]);
  const move = f.emit('touchmove', 'locked', [[20, 125]]);
  assert.equal(move.defaultPrevented, true);
  assert.deepEqual([f.viewer.scrollLeft, f.viewer.scrollTop], [180, 195]);
  f.tick(100);
  f.emit('touchend', 'locked', [], [[20, 125]]);
  assert.equal(f.calls.suppress, 1);
  assert.equal(f.context.selected, 'locked-detector');
  assert.equal(f.calls.draw, 0);
  assert.deepEqual(f.calls.pages, [], 'an 80-pixel stamp pan is not a page swipe at overview zoom');
});

check('exact six-pixel movement and final-only movement suppress a locked stamp click', () => {
  for (const deliverMove of [true, false]) {
    const f = fixture();
    f.emit('touchstart', 'locked', [[10, 10]]);
    if (deliverMove) assert.equal(f.emit('touchmove', 'locked', [[16, 10]]).defaultPrevented, true);
    f.emit('touchend', 'locked', [], [[16, 10]]);
    assert.equal(f.calls.suppress, 1);
    assert.equal(f.calls.draw, 0);
  }
});

check('background tap retains its existing deselect behavior', () => {
  const f = fixture();
  f.emit('touchstart', 'background', [[40, 50]]);
  assert.equal(f.context.panTouch.fromStamp, false);
  f.tick(100);
  f.emit('touchend', 'background', [], [[40, 50]]);
  assert.equal(f.context.selected, null);
  assert.equal(f.context.lastObjectTap, null);
  assert.equal(f.calls.draw, 1);
  assert.equal(f.calls.suppress, 0);
});

check('background swipe retains page navigation and honors its suppression window', () => {
  for (const suppressed of [false, true]) {
    const f = fixture();
    f.context.suppressPageSwipeUntil = suppressed ? 20000 : 0;
    f.emit('touchstart', 'background', [[150, 100]]);
    f.emit('touchmove', 'background', [[50, 103]]);
    f.tick(100);
    f.emit('touchend', 'background', [], [[50, 103]]);
    assert.deepEqual(f.calls.pages, suppressed ? [] : [1]);
    assert.equal(f.context.selected, 'locked-detector');
    assert.equal(f.calls.suppress, 0);
  }
});

check('unlocked marker still owns its gesture and two fingers still start pinch', () => {
  const f = fixture();
  f.emit('touchstart', 'unlocked', [[10, 10]]);
  assert.equal(f.context.panTouch, null);
  assert.equal(f.context.suppressPageSwipeUntil, 11200);
  const pinch = f.emit('touchstart', 'locked', [[10, 10], [110, 10]]);
  assert.equal(pinch.defaultPrevented, true);
  assert.equal(f.calls.pinchStart, 1);
  f.emit('touchend', 'locked', [], [[110, 10]]);
  assert.equal(f.calls.pinchCommit, 1);
  assert.equal(f.calls.draw, 0);
});

console.log(`Locked stamp touch v549: ${scenarios} scenarios passed against the actual viewport handlers (stationary protocol access, jitter, pan/click suppression, background deselect/swipe and pinch handoff). Browser synthetic-click behavior remains a device check.`);
