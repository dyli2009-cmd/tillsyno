'use strict';
// Model and event/DOM harness checks. These do not simulate layout or a physical touch screen.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const rootPath = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(rootPath, 'security-stamp-selection-v549.js'), 'utf8');
const securitySource = fs.readFileSync(path.join(rootPath, 'security.js'), 'utf8');
const historySource = fs.readFileSync(path.join(rootPath, 'session-history.js'), 'utf8');
const {createModel, createPointerSession, isStamp, isLocked, intersects} = require('../security-stamp-selection-v549.js');
const plain = value => JSON.parse(JSON.stringify(value));
let scenarios = 0;
function check(name, fn) { try { fn(); scenarios++; } catch (error) { error.message = name + ': ' + error.message; throw error; } }

function productionFunction(name) {
  const start = securitySource.indexOf('function ' + name + '(');
  assert(start >= 0, 'production function is present: ' + name);
  const lineEnd = securitySource.indexOf('\n', start);
  const end = securitySource[lineEnd - 1] === '}' ? lineEnd : securitySource.indexOf('\n}', start) + 2;
  return securitySource.slice(start, end);
}
// Use the real edited-check resolver and status derivation, with small explicit system fixtures.
const domainSource = `
  const SYSTEMS=Object.fromEntries(['detector','alarm','lock','access','automation','automation_selfcheck','lock_revision','fire_detector'].map(type=>[type,{checks:[['a','Första'],['b','Andra'],['c','Tredje']]}]));
  ${['normalizeSecurityCheckEdits','securityCustomProtocolLabel','securityDefaultCheckTitle','allChecks','syncStatus'].map(productionFunction).join('\n')}
`;
const domain = vm.createContext({});
vm.runInContext(domainSource, domain);
function stamp(uid, type = 'lock', page = 1, extra = {}) {
  return {uid, type, page, x: .3, y: .4, labelX: .4, labelY: .35,
    checks: {}, checkEdits: {}, customChecks: [], status: 'untested', ...extra};
}
function modelFixture(list, active = ['detector','alarm','lock','access']) {
  const state = {document: {}, page: 1, items: list, hidden: new Set(), active: new Set(active)};
  const model = createModel({document: () => state.document, page: () => state.page, items: () => state.items,
    eligible: object => state.active.has(object.type), visible: object => !state.hidden.has(object.type),
    checks: domain.allChecks, syncStatus: domain.syncStatus});
  return {state, model};
}

check('individual selection is visible-page only, while all includes every active page and hidden layer', () => {
  const {state, model} = modelFixture([stamp('a'), stamp('b','detector'), stamp('c','alarm',2), stamp('d','access'), stamp('fire','fire_detector'), stamp('door','automation')]);
  state.hidden.add('access');
  assert.equal(model.toggle('fire'), false); assert.equal(model.toggle('c'), false);
  model.all(); assert.deepEqual(model.selected().map(o => o.uid), ['a','b','c','d']);
  model.toggle('a'); assert.deepEqual(model.selected().map(o => o.uid), ['b','c','d']);
  state.active.delete('detector'); assert.deepEqual(model.selected().map(o => o.uid), ['c','d']);
  assert.equal(isStamp(stamp('a','alarm')), true); assert.equal(isStamp(stamp('a','automation')), true);
  assert.equal(isLocked(stamp('a','fire_detector',1,{positionLocked:true})), false);
});

check('selection survives pages and hidden layers, but prunes removed/inactive objects and clears on a new file', () => {
  const {state, model} = modelFixture([stamp('a'), stamp('b','detector'), stamp('c','lock',2)]);
  model.all(); state.items = state.items.filter(o => o.uid !== 'a');
  assert.deepEqual(model.selected().map(o => o.uid), ['b','c']);
  state.page = 2; assert.deepEqual(model.selected().map(o => o.uid), ['b','c']);
  model.onlyPage(); assert.deepEqual(model.selected().map(o => o.uid), ['c']);
  state.document = {}; assert.deepEqual(model.selected(), []);
  state.page = 1; model.onlyPage(); state.hidden.add('detector'); assert.deepEqual(model.selected().map(o => o.uid), ['b']);
  state.active.delete('detector'); assert.deepEqual(model.selected(), []);
});

check('rectangle selection adds intersecting labels or anchors and never other pages', () => {
  const {model} = modelFixture([stamp('a'), stamp('b'), stamp('c','lock',2)]);
  model.toggle('a');
  model.rectangle({left:50,top:50,right:100,bottom:100}, object => object.uid === 'b' ?
    [{left:0,top:0,right:10,bottom:10},{left:80,top:80,right:120,bottom:120}] : [{left:60,top:60,right:70,bottom:70}]);
  assert.deepEqual(model.selected().map(o => o.uid), ['a','b']);
  assert.equal(intersects({left:0,top:0,right:10,bottom:10},{left:10,top:10,right:20,bottom:20}), true);
  assert.equal(intersects({left:0,top:0,right:10,bottom:10},{left:NaN,top:0,right:10,bottom:10}), false);
});

check('locking serializes only object state and preserves geometry/style', () => {
  const a = stamp('a','detector',1,{detectorBox:{width:.03,height:.02,textHeight:.009,angle:90},stampStyle:{width:30,height:15,fontSize:9}});
  const b = stamp('b','lock',2), before = plain(a), {state,model} = modelFixture([a,b]);
  model.onlyPage(); assert.equal(model.apply('lock').objects, 1); assert.equal(isLocked(a), true);
  assert.deepEqual(plain({...a,positionLocked:undefined}), before);
  const saved = JSON.stringify(state.items); assert.equal(saved.includes('chosen'), false);
  state.items = JSON.parse(saved); assert.equal(isLocked(state.items[0]), true); assert.equal(b.positionLocked, undefined);
  assert.equal(model.apply('lock').objects, 0);
  assert.equal(model.apply('unlock').objects, 1); assert.equal(isLocked(state.items[0]), false);
  assert.equal(model.apply('unlock').objects, 0);
});

check('approve fills only unanswered actual/custom checks and keeps existing findings', () => {
  const a = stamp('a','lock',1,{checks:{a:{result:'remark',note:'Dörren kärvar'},b:{result:'na',note:'Ej tillämplig'},c:{result:'',note:'Utkast'},custom:{result:'',note:'Eget utkast'},removed:{result:'remark',note:'Historisk text'}},customChecks:[{id:'custom',title:'Egen kontroll'}],manualFail:true,remediationDate:'2026-10-31',remediationSignature:'AB'});
  const {model} = modelFixture([a]); model.all();
  assert.deepEqual(model.apply('approve'), {objects:1,points:2,preservedRemarks:1});
  assert.equal(a.checks.a.result, 'remark'); assert.equal(a.checks.a.note, 'Dörren kärvar');
  assert.equal(a.checks.b.result, 'na'); assert.equal(a.checks.c.result, 'ok'); assert.equal(a.checks.c.note, 'Utkast');
  assert.equal(a.checks.custom.result, 'ok'); assert.equal(a.checks.custom.note, 'Eget utkast');
  assert.equal(a.checks.removed.result, 'remark'); assert.equal(a.status, 'fail');
  assert.equal(a.remediationDate, '2026-10-31'); assert.equal(a.remediationSignature, 'AB');
  assert.equal(model.apply('approve').objects, 0);
  a.manualFail = false; domain.syncStatus(a); assert.equal(a.status, 'action');
});

check('edited-out checks stay out of bulk approval and real status becomes approved', () => {
  const a = stamp('a','alarm',1,{checkEdits:{b:null,c:'Ändrad rubrik'},checks:{b:{result:'remark',note:'Borttagen punkt'},c:{result:'na',note:''}}});
  const {model} = modelFixture([a]); model.all();
  assert.deepEqual(model.apply('approve'), {objects:1,points:1,preservedRemarks:0});
  assert.equal(a.checks.b.result, 'remark'); assert.equal(a.checks.c.result, 'na'); assert.equal(a.status, 'ok');
});

check('reset keeps remark drafts/history and clears answers/manualFail/remediation', () => {
  const a = stamp('a','access',1,{checks:{a:{result:'remark',note:'Byt slutbleck'},b:{result:'ok',note:''},c:{result:'na',note:'Utkast'}},manualFail:true,positionLocked:true,notes:'Allmän text',previousIssues:[{note:'Tidigare anmärkning'}],remediationDate:'2026-10-31',remediationSignature:'AB'});
  const before = plain(a), {model} = modelFixture([a]); model.all();
  assert.deepEqual(model.apply('reset'), {objects:1,points:3,preservedRemarks:1});
  for (const id of ['a','b','c']) { assert.equal(a.checks[id].result, ''); assert.equal(a.checks[id].note, before.checks[id].note); }
  assert.equal(a.manualFail, false); assert.equal(a.status, 'untested');
  assert.equal(a.remediationDate, ''); assert.equal(a.remediationSignature, '');
  for (const key of ['x','y','labelX','labelY','positionLocked','notes','previousIssues']) assert.deepEqual(a[key], before[key]);
  assert.equal(model.apply('reset').objects, 0);
});

const pointer = (id, x = 0, y = 0, extra = {}) => ({pointerId:id,button:0,clientX:x,clientY:y,pointerType:'touch',isPrimary:true,...extra});
check('pointer tap/drag threshold and final coordinates are deterministic', () => {
  const p = createPointerSession(); p.down(pointer(1,10,10), 'a');
  assert.equal(p.move(pointer(1,13,14)).moved, false);
  const tap = p.up(pointer(1,13,14)); assert.equal(tap.uid, 'a'); assert.equal(tap.moved, false);
  p.down(pointer(2,10,10)); assert.equal(p.up(pointer(2,30,30)).moved, true, 'up catches movement without a delivered move event');
  p.down(pointer(3)); assert.equal(p.move(pointer(4,100,100)), null); assert.equal(p.up(pointer(4)), null);
  assert.equal(p.current().id, 3); p.cancelPointer(3); assert.equal(p.current(), null);
  p.reset(); assert.equal(p.down(pointer(8,0,0,{pointerType:'mouse',button:2})), null);
});

check('second touch cancels selection and cannot commit through pointerup', () => {
  const p = createPointerSession(); p.down(pointer(1), 'a'); p.move(pointer(1,20,20));
  assert.equal(p.down(pointer(2,50,50,{isPrimary:false})), null); assert.equal(p.current(), null); assert.equal(p.isMulti(), true);
  assert.equal(p.up(pointer(1,100,100)), null); assert.equal(p.up(pointer(2,100,100,{isPrimary:false})), null);
  assert.equal(p.down(pointer(3)), null, 'pinch mode ends only when all touches are lifted');
  p.endTouches(0); assert(p.down(pointer(4), 'b')); assert.equal(p.up(pointer(4)).uid, 'b');
  p.down(pointer(5)); p.cancelPointer(5); assert(p.down(pointer(6)), 'a canceled pointer does not count as a remaining finger');
});

/* Minimal event-capable DOM: run the actual controller, capture handlers and history.
 * Geometry is supplied explicitly. Browser layout and Safari gesture behavior remain manual checks. */
function controllerFixture({mode='security', activeTypes=mode==='revision'?['automation','automation_selfcheck','lock_revision']:['detector','alarm','lock','access'], controlflowUi='1', allInOne=true} = {}) {
  let document;
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null; this.attrs = {}; this.dataset = {}; this.style = {}; this.listeners = new Map(); this.hidden = false; this.disabled = false; this.value = ''; this.textContent = ''; this.rect = {left:0,top:0,right:400,bottom:500,width:400,height:500}; this.captures = new Set(); this.scrollLeft = this.scrollTop = 0; }
    get id() { return this.attrs.id || ''; } set id(v) { this.attrs.id = v; }
    get className() { return this.attrs.class || ''; } set className(v) { this.attrs.class = v; }
    get classList() { return {contains:k=>this.className.split(/\s+/).includes(k),add:(...ks)=>this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...ks])].join(' '),remove:(...ks)=>this.className=this.className.split(/\s+/).filter(k=>!ks.includes(k)).join(' '),toggle:(k,on)=>{const yes=on===undefined?!this.classList.contains(k):on;yes?this.classList.add(k):this.classList.remove(k);return yes;}}; }
    setAttribute(k,v) { this.attrs[k] = String(v); if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    append(...nodes) { for(const n of nodes){n.remove();this.children.push(n);n.parentNode=this;} }
    before(node) { const parent=this.parentNode;node.remove();parent.children.splice(parent.children.indexOf(this),0,node);node.parentNode=parent; }
    remove() { if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;} }
    contains(node) { return this===node||this.children.some(n=>n.contains(node)); }
    matches(selector) { return selector.split(',').some(s=>{s=s.trim();if(s.startsWith('#'))return this.id===s.slice(1);if(s.startsWith('.'))return this.classList.contains(s.slice(1));if(s.startsWith('['))return this.getAttribute(s.slice(1,-1))!==null;return this.tagName.toLowerCase()===s;}); }
    descendants() { return this.children.flatMap(n=>[n,...n.descendants()]); }
    querySelectorAll(selector) { return this.descendants().filter(node=>selector.split(',').some(s=>{const parts=s.trim().split(/\s+/);if(!node.matches(parts.pop()))return false;let at=node.parentNode;while(parts.length){const p=parts.pop();while(at&&!at.matches(p))at=at.parentNode;if(!at)return false;at=at.parentNode;}return true;})); }
    querySelector(selector) { return this.querySelectorAll(selector)[0]||null; }
    closest(selector) { let at=this;while(at){if(at.matches(selector))return at;at=at.parentNode;}return null; }
    cloneNode(deep) { const copy=new Element(this.tagName);copy.attrs={...this.attrs};copy.dataset={...this.dataset};if(deep)copy.append(...this.children.map(n=>n.cloneNode(true)));return copy; }
    addEventListener(type,fn,options) { if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push({fn,capture:options===true||!!options?.capture}); }
    emit(type,extra={}) {
      const e={type,target:this,button:0,key:'',defaultPrevented:false,stopped:false,immediate:false,
        preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=true;this.immediate=true;},...extra};
      const route=[];for(let at=this;at;at=at.parentNode)route.push(at);
      for(const at of [...route].reverse()){for(const listener of at.listeners.get(type)||[])if(listener.capture){listener.fn(e);if(e.immediate)break;}if(e.stopped)return e;}
      for(const at of route){at['on'+type]?.(e);if(!e.immediate)for(const listener of at.listeners.get(type)||[])if(!listener.capture){listener.fn(e);if(e.immediate)break;}if(e.stopped)break;}
      return e;
    }
    click() { return this.emit('click'); }
    focus() { document.activeElement=this; }
    getBoundingClientRect() { return this.rect; }
    setPointerCapture(id) { this.captures.add(id); }
    hasPointerCapture(id) { return this.captures.has(id); }
    releasePointerCapture(id) { this.captures.delete(id); }
  }
  document=new Element('document');document.documentElement=new Element('html');document.body=new Element('body');
  document.documentElement.dataset.controlflowUi=controlflowUi;document.documentElement.dataset.cfStampMode=mode;document.body.className=allInOne?'allInOneApp':'securityApp';document.body.dataset.view='drawing';
  document.append(document.documentElement);document.documentElement.append(document.body);document.readyState='complete';
  document.createElement=tag=>new Element(tag);document.createElementNS=(_,tag)=>new Element(tag);document.getElementById=id=>document.descendants().find(n=>n.id===id)||null;
  const add=(tag,id,parent=document.body,cls='')=>{const n=new Element(tag);n.id=id;n.className=cls;parent.append(n);return n;};
  if(mode==='security')add('button','secCloseDrawing');
  add('button','secChangeDrawing');add('div','secHint');add('button','secAddText');
  const viewer=add('div','secViewer'),stage=add('div','secStage',viewer),menu=add('div','drawingMenu',document.body,'serviceToolsMenu');
  const choices=add('div','choices',menu,'serviceToolChoices'),tool=add('button','tool',document.body,'serviceToolLauncher');
  if(mode==='security'){const scan=add('button','securityDetectorScan',choices);scan.append(new Element('svg'));}
  const scanPanel=add('section','securityDetectorScanPanel');scanPanel.hidden=true;add('button','detectorClose');
  let now=1000;const clock={now:()=>now};
  const events=[];
  const context=vm.createContext({document,console,Date:clock,MutationObserver:class{observe(){}},queueMicrotask:fn=>fn(),
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},dispatchEvent:event=>{events.push(event);return true;}});context.window=context;
  vm.runInContext(historySource+'\n'+domainSource+`
    let pdf={},page=1,items=[],hiddenDrawingProtocols=new Set(),drawingOverlaysHidden=false;
    ${mode==='security'?'let drawingFileLoading=false;':''}
    let addType=null,textMode=false,selected=null,lastObjectTap=null,panTouch=null,panMouse=null;
    const counters={save:0,draw:0,protocol:0,overview:0,undo:0,redo:0};
    const securityDrawingTools={stop(){},deselect(){}};
    function allInOneProtocolActive(type){return ${JSON.stringify(activeTypes)}.includes(type)}
    function drawMarkers(){counters.draw++}
    function showSelected(){counters.protocol++} function showOverview(){counters.overview++}
    function go(view){document.body.dataset.view=view}
    function save(){counters.save++;securitySessionHistory.record();return true}
    const securitySessionHistory=ServiceSessionHistory({scope:()=>pdf,capture:()=>({data:{items:JSON.parse(JSON.stringify(items))},selected}),restore:state=>{items=state.data.items;drawMarkers()},changed:state=>{counters.undo=state.undo;counters.redo=state.redo}});
    globalThis.fixture={counters,getItems:()=>items,setItems(list){items=list;securitySessionHistory.reset()},setPage(n){page=n;drawMarkers()},setDocument(){pdf={};drawMarkers()},hide(type){hiddenDrawingProtocols.add(type);drawMarkers()},hideAll(value){drawingOverlaysHidden=value;drawMarkers()},setBusy(on){${mode==='security'?'drawingFileLoading=on':"document.getElementById('secViewer').setAttribute('aria-busy',String(on))"}},go:view=>go(view),undo:()=>securitySessionHistory.undo(),redo:()=>securitySessionHistory.redo()};
  `,context);
  const marker=(uid,box,type='secMarker')=>{const node=add('button',uid,stage,type);node.setAttribute(mode==='revision'?'data-object-uid':'data-security-stamp-uid',uid);node.rect=box;return node;};
  vm.runInContext(source,context);
  return {document,viewer,stage,choices,tool,context,marker,events,api:context.SecurityStampSelection,state:context.fixture,tick(ms=1000){now+=ms;},$:id=>document.getElementById(id)};
}

check('actual controller selects without triggering legacy move/protocol handlers', () => {
  const f=controllerFixture();f.state.setItems([stamp('a'),stamp('b')]);
  const a=f.marker('a',{left:20,top:20,right:64,bottom:64,width:44,height:44});
  let starts=0,opens=0;a.onpointerdown=()=>starts++;a.onclick=()=>opens++;
  f.api.start();assert.equal(f.$('securityStampSelectionPanel').hidden,false);
  a.emit('pointerdown',pointer(1,30,30,{pointerType:'mouse'}));a.emit('pointerup',pointer(1,30,30,{pointerType:'mouse'}));a.click();
  assert.deepEqual(plain(f.api.selectedIds()),['a']);assert.equal(starts,0);assert.equal(opens,0);
  assert.equal(a.getAttribute('aria-pressed'),'true');assert(a.classList.contains('securityStampChosen'));
  a.emit('pointerdown',pointer(2,30,30,{pointerType:'mouse'}));a.emit('pointerup',pointer(2,30,30,{pointerType:'mouse'}));assert.deepEqual(plain(f.api.selectedIds()),[]);
  f.viewer.emit('pointerdown',pointer(3,300,300,{pointerType:'mouse'}));f.viewer.emit('pointerup',pointer(3,300,300,{pointerType:'mouse'}));
  assert.equal(f.state.getItems().length,2);assert.equal(f.state.counters.save,0);
  f.$('securityStampSelectionDone').click();assert.equal(f.api.isActive(),false);assert.equal(f.document.activeElement,f.tool);assert.equal(a.getAttribute('aria-pressed'),null);
  f.tick();a.click();assert.equal(opens,1,'normal protocol click is restored after leaving the tool');
});

check('actual action saves one undo group for all selected objects', () => {
  const f=controllerFixture();f.state.setItems([stamp('a'),stamp('b','alarm'),stamp('c','lock',2)]);f.api.start();
  f.$('securityStampSelectAll').click();
  assert.equal(f.$('securityStampSelectionLock').disabled,false);f.$('securityStampSelectionLock').click();
  assert.equal(f.state.counters.save,1);assert.equal(f.state.counters.undo,1);
  assert.deepEqual(f.state.getItems().map(isLocked),[true,true,true]);
  f.$('securityStampSelectionLock').click();assert.equal(f.state.counters.save,1);assert.equal(f.state.counters.undo,1,'repeated lock is a no-op');
  assert.equal(f.state.undo(),true);assert.deepEqual(plain(f.state.getItems().map(isLocked)),[false,false,false]);
  assert.equal(f.state.redo(),true);assert.deepEqual(plain(f.state.getItems().map(isLocked)),[true,true,true]);
  f.$('securityStampSelectionAction').value='approve';f.$('securityStampSelectionApply').click();assert.equal(f.state.counters.undo,2);assert.equal(f.state.counters.save,2);
  assert.equal(f.state.getItems()[0].status,'ok');assert.equal(f.state.getItems()[1].status,'ok');assert.equal(f.state.getItems()[2].status,'ok');
  f.state.undo();assert.equal(f.state.getItems()[0].status,'untested');assert.equal(isLocked(f.state.getItems()[0]),true);
});

check('actual rectangle excludes other pages and is canceled before pinch events', () => {
  const f=controllerFixture();f.state.setItems([stamp('a'),stamp('b'),stamp('c','lock',2)]);
  f.marker('a',{left:20,top:20,right:64,bottom:64,width:44,height:44});f.marker('b',{left:180,top:180,right:224,bottom:224,width:44,height:44});f.marker('c',{left:30,top:30,right:74,bottom:74,width:44,height:44});
  f.api.start();f.viewer.emit('pointerdown',pointer(1,0,0,{pointerType:'mouse'}));f.viewer.emit('pointermove',pointer(1,80,80,{pointerType:'mouse'}));f.viewer.emit('pointerup',pointer(1,80,80,{pointerType:'mouse'}));
  assert.deepEqual(plain(f.api.selectedIds()),['a']);
  f.viewer.emit('pointerdown',pointer(2,150,150));f.viewer.emit('touchstart',{touches:[{}]});f.viewer.emit('pointermove',pointer(2,240,240));
  let pinchStarts=0;f.viewer.addEventListener('touchstart',e=>{if(e.touches.length===2)pinchStarts++;},{capture:true});
  const second=f.viewer.emit('pointerdown',pointer(3,260,260,{isPrimary:false}));assert.equal(second.defaultPrevented,false);
  f.viewer.emit('touchstart',{touches:[{},{}]});assert.equal(pinchStarts,1,'existing pinch handler receives the two-touch event');
  f.viewer.emit('pointerup',pointer(2,240,240));f.viewer.emit('pointerup',pointer(3,260,260,{isPrimary:false}));f.viewer.emit('touchend',{touches:[]});
  assert.deepEqual(plain(f.api.selectedIds()),['a'],'unfinished rectangle never adds b');
  f.state.setPage(2);assert.deepEqual(plain(f.api.selectedIds()),['a']);assert.equal(f.api.isActive(),true);
  f.state.setDocument();assert.equal(f.api.isActive(),false);assert.equal(f.$('securityStampSelectionPanel').hidden,true);
});

check('locked protocol clicks survive while movement and accidental pan clicks do not', () => {
  const f=controllerFixture(),o=stamp('a','lock',1,{positionLocked:true});f.state.setItems([o]);
  const a=f.marker('a',{left:20,top:20,right:64,bottom:64,width:44,height:44});let opens=0;a.onclick=()=>opens++;
  assert.equal(f.api.canMove(o),false);assert.equal(f.api.panFrom(a),true);
  const down=a.emit('pointerdown',pointer(1,30,30,{pointerType:'mouse'}));assert.equal(down.defaultPrevented,false);
  a.emit('pointerup',pointer(1,30,30,{pointerType:'mouse'}));a.click();assert.equal(opens,1);
  a.emit('pointerdown',pointer(2,30,30));a.emit('pointermove',pointer(2,70,70));a.emit('pointerup',pointer(2,70,70));a.click();assert.equal(opens,1);
  f.tick();a.click();assert.equal(opens,2);f.api.suppressClick();a.click();assert.equal(opens,2);
  f.tick();f.api.start();assert.equal(f.api.panFrom(a),false);assert.equal(f.api.canMove(stamp('unlocked')),false);assert.equal(f.api.canMove(stamp('door','automation')),false);assert.equal(f.api.canMove(stamp('fire','fire_detector')),true);
});

check('busy action guards avoid changing or saving selected data', () => {
  const f=controllerFixture();f.state.setItems([stamp('a')]);f.api.start();f.$('securityStampSelectAll').click();
  f.state.setBusy(true);f.$('securityStampSelectionLock').click();
  assert.equal(f.state.getItems()[0].positionLocked,undefined);assert.equal(f.state.counters.save,0);
  f.state.setBusy(false);f.$('securityStampSelectionLock').click();assert.equal(f.state.getItems()[0].positionLocked,true);
});

check('revision uses one visible lock action and the existing saved positionLocked flag', () => {
  const f=controllerFixture({mode:'revision'});
  assert.equal(f.$('secCloseDrawing'),null,'revision has no close-drawing button');
  assert(f.$('secChangeDrawing'));
  const objects=[stamp('door','automation',1,{customerStampScale:1.77,customerArrowScale:3}),stamp('self','automation_selfcheck'),stamp('revision','lock_revision'),stamp('otherPage','automation',2),stamp('fire','fire_detector')];
  const before=plain(objects);f.state.setItems(objects);f.api.start();f.$('securityStampSelectAll').click();
  assert(f.$('securitySelectStamps').querySelector('svg'),'revision launcher has an icon without the scanner');
  assert.equal(f.$('securitySelectStamps').hidden,false);
  assert.deepEqual(plain(f.api.selectedIds()),['door','self','revision','otherPage']);
  assert.deepEqual(f.$('securityStampSelectionAction').children.map(option=>option.value),['','approve','reset'],'lock actions are not duplicated in the dropdown');
  assert.equal(f.$('securityStampSelectionLock').disabled,false);assert.equal(f.$('securityStampSelectionUnlock').disabled,true);
  f.$('securityStampSelectionLock').click();
  assert.deepEqual(objects.map(isLocked),[true,true,true,true,false]);
  assert.equal(f.$('securityStampSelectionLock').disabled,true);assert.equal(f.$('securityStampSelectionUnlock').disabled,false);
  objects.forEach((object,index)=>assert.deepEqual(plain({...object,positionLocked:undefined}),before[index]));
  assert.equal(f.state.counters.undo,1);
  f.state.undo();assert.deepEqual(plain(f.state.getItems().map(isLocked)),[false,false,false,false,false]);
  f.state.redo();assert.deepEqual(plain(f.state.getItems().map(isLocked)),[true,true,true,true,false]);
  f.$('securityStampSelectionUnlock').click();assert.deepEqual(plain(f.state.getItems().map(isLocked)),[false,false,false,false,false]);
});

check('revision lock API shares selected objects, busy state and change notifications with size controls', () => {
  const f=controllerFixture({mode:'revision'}),o=stamp('door','automation');f.state.setItems([o]);
  const marker=f.marker('door',{left:20,top:20,right:64,bottom:64,width:44,height:44});
  f.api.start();marker.click();
  assert.equal(f.api.selectedObjects()[0],o);
  assert.equal(f.api.isBusy(),false);assert.equal(f.api.isActive(),true);
  assert.equal(f.events.at(-1).type,'controlflow-stamp-selection-change');
  assert.deepEqual(plain(f.events.at(-1).detail),{active:true,selectedIds:['door'],locked:0,busy:false});
  f.state.setBusy(true);f.api.refresh();assert.equal(f.api.isBusy(),true);assert.equal(f.$('securityStampSelectionLock').disabled,true);
  f.$('securityStampSelectionLock').click();assert.equal(o.positionLocked,undefined);
  f.state.setBusy(false);f.api.refresh();f.$('securityStampSelectionLock').click();f.api.stop(false);
  assert.equal(f.api.canMove(o),false);assert.equal(f.api.panFrom(marker),true);
  assert.deepEqual(plain(f.events.at(-1).detail),{active:false,selectedIds:[],locked:0,busy:false});
});

check('Brand-only and standalone surfaces do not get an active stamp tool', () => {
  const brand=controllerFixture({mode:'revision',activeTypes:['fire_detector']});brand.state.setItems([stamp('fire','fire_detector')]);
  assert.equal(brand.$('securitySelectStamps').hidden,true);brand.api.start();assert.equal(brand.api.isActive(),false);
  for(const options of [{allInOne:false},{controlflowUi:'0'},{mode:'other'}]){
    const f=controllerFixture(options);assert.equal(f.api,undefined);assert.equal(f.$('securitySelectStamps'),null);
  }
});

check('file-wide and page-only buttons share one persistent selection across floors', () => {
  const f=controllerFixture(),objects=[stamp('a'),stamp('b','alarm',2),stamp('hidden','access',3),stamp('fire','fire_detector',2)];
  f.state.setItems(objects);f.state.hide('access');f.api.start();
  assert.equal(f.$('securityStampSelectAll').textContent,'Alla i ritningen');
  assert.equal(f.$('securityStampSelectPage').textContent,'Endast denna sida');
  f.$('securityStampSelectAll').click();assert.deepEqual(plain(f.api.selectedIds()),['a','b','hidden']);
  assert.equal(f.$('securityStampSelectAll').getAttribute('aria-pressed'),'true');
  assert.equal(f.$('securityStampSelectionCount').textContent,'3 valda · 3 sidor');
  f.state.setPage(2);assert.deepEqual(plain(f.api.selectedIds()),['a','b','hidden']);
  assert.equal(f.api.eligibleObjects().length,3);
  f.$('securityStampSelectPage').click();assert.deepEqual(plain(f.api.selectedIds()),['b']);
  assert.equal(f.$('securityStampSelectPage').getAttribute('aria-pressed'),'true');
  assert.equal(f.$('securityStampSelectAll').getAttribute('aria-pressed'),'false');
  f.state.setPage(1);assert.deepEqual(plain(f.api.selectedIds()),['b']);
  const a=f.marker('a',{left:20,top:20,right:64,bottom:64,width:44,height:44});a.click();
  assert.deepEqual(plain(f.api.selectedIds()),['a','b'],'manual picks can accumulate across pages');
  f.$('securityStampSelectAll').click();f.$('securityStampSelectionLock').click();
  assert.deepEqual(objects.map(isLocked),[true,true,true,false],'hidden active objects on other floors are included');
  f.$('securityStampSelectAll').click();assert.deepEqual(plain(f.api.selectedIds()),[],'all button can clear the complete file selection');
});

check('all-file actions remain available with globally hidden stamps, while hidden DOM cannot be picked', () => {
  const f=controllerFixture(),objects=[stamp('a'),stamp('b','alarm',2)];f.state.setItems(objects);
  const a=f.marker('a',{left:20,top:20,right:64,bottom:64,width:44,height:44});f.state.hideAll(true);
  assert.equal(f.$('securitySelectStamps').disabled,false);f.api.start();assert.equal(f.api.isActive(),true);
  a.click();assert.deepEqual(plain(f.api.selectedIds()),[],'even a delivered click cannot select a globally hidden marker');
  f.viewer.emit('pointerdown',pointer(1,0,0,{pointerType:'mouse'}));f.viewer.emit('pointermove',pointer(1,100,100,{pointerType:'mouse'}));f.viewer.emit('pointerup',pointer(1,100,100,{pointerType:'mouse'}));
  assert.deepEqual(plain(f.api.selectedIds()),[],'a frame cannot select hidden DOM nodes with stale bounds');
  f.$('securityStampSelectAll').click();assert.deepEqual(plain(f.api.selectedIds()),['a','b']);
  assert.equal(f.$('securityStampSelectionCount').textContent,'2 valda · 2 sidor');
  f.$('securityStampSelectionLock').click();assert.deepEqual(objects.map(isLocked),[true,true]);
  f.state.setPage(2);assert.deepEqual(plain(f.api.selectedIds()),['a','b']);assert.equal(f.api.isActive(),true);
  f.state.hideAll(false);assert.deepEqual(plain(f.api.selectedIds()),['a','b'],'showing the drawing again preserves the file selection');
});

console.log(`Shared stamp selection v552: ${scenarios} scenarios passed (file-wide/page-only scope, hidden active layers, persistent selection, locks, remark preservation, gestures and batch undo). Layout and physical gestures require browser/device verification.`);
