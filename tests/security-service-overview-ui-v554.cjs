'use strict';
// Actual overview and selection controllers with deterministic DOM geometry and
// the production session history. PDF rendering is verified by the separate PDF suite.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const root = path.join(__dirname, '..');
const fixturePath = path.join(__dirname, 'security-stamp-selection-v549.cjs');
const fixtureSource = fs.readFileSync(fixturePath, 'utf8');
const setupEnd = fixtureSource.indexOf("\ncheck('individual selection");
const fixtureStart = fixtureSource.indexOf('function controllerFixture(');
const fixtureEnd = fixtureSource.indexOf("\ncheck('actual controller selects", fixtureStart);
assert(setupEnd > 0 && fixtureStart > setupEnd && fixtureEnd > fixtureStart);
function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, 'expected one fixture declaration: ' + before);
  return source.replace(before, after);
}
let fixtureBody = fixtureSource.slice(fixtureStart, fixtureEnd);
fixtureBody = replaceOnce(fixtureBody,
  'let pdf={},page=1,items=[],hiddenDrawingProtocols',
  "let pdf={},page=1,items=[],project={projectName:'Original'},textNotes=[{text:'Behåll text'}],drawingExtras=[{type:'arrow',x:.2,y:.3}],hiddenDrawingProtocols");
fixtureBody = replaceOnce(fixtureBody,
  'capture:()=>({data:{items:JSON.parse(JSON.stringify(items))},selected})',
  'capture:()=>({data:JSON.parse(JSON.stringify({items,project,textNotes,drawingExtras})),selected})');
fixtureBody = replaceOnce(fixtureBody,
  'restore:state=>{items=state.data.items;drawMarkers()}',
  'restore:state=>{({items,project,textNotes,drawingExtras}=state.data);drawMarkers()}');
const fixtureContext = vm.createContext({require:createRequire(fixturePath), __dirname, console});
vm.runInContext(fixtureSource.slice(0, setupEnd) + '\n' + fixtureBody +
  '\nglobalThis.testTools={controllerFixture,stamp};', fixtureContext, {filename:fixturePath});
const {controllerFixture, stamp} = fixtureContext.testTools;
const overviewSource = fs.readFileSync(path.join(root, 'security-service-overview-v554.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const tests = [];
const check = (name, fn) => tests.push({name, fn});
const pointer = (id, x, y, extra = {}) => ({pointerId:id,clientX:x,clientY:y,button:0,pointerType:'mouse',isPrimary:true,...extra});
const settle = async () => { for (let i=0;i<8;i++) await Promise.resolve(); };

function setup(objects = [stamp('door','lock',1,{notes:'Original note',checks:{a:{result:'remark',note:'Byt lås'}}})]) {
  const f = controllerFixture();
  f.state.setItems(objects);
  f.context.structuredClone=structuredClone;
  const errors = [], events = new Map();
  f.context.console = {log(){},warn(){},error(...args){errors.push(args.map(String).join(' '));}};
  f.context.addEventListener = (name, callback) => {if (!events.has(name)) events.set(name,[]);events.get(name).push(callback);};
  const dispatch = f.context.dispatchEvent;
  f.context.dispatchEvent = event => {dispatch(event);for(const callback of events.get(event.type)||[])callback(event);return true;};
  const createElement = f.document.createElement;
  f.document.createElement = tag => {
    const node=createElement(tag);
    if(tag==='canvas')node.getContext=()=>({drawImage(){}});
    return node;
  };
  // Render only the card's bitmap plumbing here; the card and all controller
  // state transitions run unmodified. Real PDF bytes are covered separately.
  f.context.jspdf = {jsPDF:class {
    setFillColor(){} setDrawColor(){} setLineWidth(){} roundedRect(){}
    setFont(){} setFontSize(){} setTextColor(){} text(){} setLineCap(){} line(){}
    output(){return new ArrayBuffer(4);}
  }};
  f.context.pdfjsLib = {getDocument:()=>({promise:Promise.resolve({
    getPage:async()=>({getViewport:()=>({width:900,height:180}),render:()=>({promise:Promise.resolve()})}),
    destroy:async()=>{}
  })})};
  vm.runInContext(`
    const ALL_IN_ONE=true,COLORS={ok:[35,131,84],action:[199,124,19],fail:[189,63,70],untested:[119,133,142]};
    let pageWidth=800,pageHeight=1000,zoom=1,visualZoom=1,drawingGestureLocked=false,drawingLockScroll=null,suppressPageSwipeUntil=0,drawingRotationPending=false;
    const viewer=document.getElementById('secViewer');
    const overviewCounters={drawing:0,preview:0,forceReport:false,toolStop:0,messages:[]};
    function hasSecurityRecordedProblem(o){return !!o.manualFail||Object.values(o.checks||{}).some(c=>c.result==='remark');}
    function isSecurityRemediated(o){return hasSecurityRecordedProblem(o)&&!!o.remediationDate&&!!o.remediationSignature;}
    function statusOf(o){return isSecurityRemediated(o)?'ok':o.manualFail?'fail':hasSecurityRecordedProblem(o)?'action':o.status||'untested';}
    function applyDrawingOverlayVisibility(value){drawingOverlaysHidden=value;document.body.classList.toggle('drawingOverlaysHidden',value);}
    function openCustomerPreview(force){overviewCounters.preview++;overviewCounters.forceReport=force;return Promise.resolve();}
    function msg(text){overviewCounters.messages.push(text);}
    function render(){overviewCounters.drawing++;drawMarkers();return Promise.resolve(true);}
    securityDrawingTools.stop=()=>{overviewCounters.toolStop++;};
    fixture.read=()=>JSON.parse(JSON.stringify({items,project,textNotes,drawingExtras,page,zoom,visualZoom,drawingGestureLocked}));
    fixture.overviewCounters=overviewCounters;
    fixture.setCard=value=>{project.serviceOverview=value;save();securitySessionHistory.reset();};
    fixture.setDimensions=(width,height)=>{pageWidth=width;pageHeight=height;};
    fixture.replaceProject=next=>{pdf={};project=JSON.parse(JSON.stringify(next));page=1;securitySessionHistory.reset();drawMarkers();};
    fixture.setProject=next=>{project=JSON.parse(JSON.stringify(next));securitySessionHistory.reset();drawMarkers();};
    fixture.close=()=>{pdf=null;project={};drawMarkers();};
    fixture.save=()=>save();
  `, f.context);
  f.stage.rect={left:0,top:0,width:800,height:1000,right:800,bottom:1000};
  vm.runInContext(overviewSource, f.context, {filename:'security-service-overview-v554.js'});
  f.overview=f.context.SecurityServiceOverview;
  assert(f.overview, 'security overview controller installed');
  f.errors=errors;
  f.read=()=>plain(f.state.read());
  f.card=()=>f.read().project.serviceOverview;
  f.panel=()=>f.$('securityServiceOverview');
  f.controls=()=>f.$('securityServiceOverviewControls');
  f.assertClean=async()=>{await settle();assert.deepEqual(errors,[]);};
  return f;
}

check('the tool starts optional and adding uses the latest drawing renderer on page one', async () => {
  const f=setup(),before=f.read();
  assert.equal(f.panel().hidden,true);
  assert.equal(f.$('securityServiceOverviewTool').textContent,'Lägg till serviceöversikt');
  f.state.setPage(3);
  let latestRenders=0;
  f.context.render=async()=>{latestRenders++;return true;};
  await f.overview.add();
  assert.equal(latestRenders,1,'the current viewer is used instead of a captured obsolete renderer');
  assert.equal(f.read().page,1);
  assert.equal(f.card().enabled,true);
  assert.equal(f.card().layout,'wide');
  assert.equal(f.panel().hidden,false);
  assert.equal(f.controls().hidden,false);
  assert.deepEqual(f.read().items,before.items);
  assert.deepEqual(f.read().textNotes,before.textNotes);
  assert.deepEqual(f.read().drawingExtras,before.drawingExtras);
  await f.assertClean();
});

check('opening the overview exits real stamp selection so card drag receives pointer events', async () => {
  const f=setup();f.api.start();f.$('securityStampSelectAll').click();
  assert.equal(f.api.isActive(),true);
  await f.overview.add();
  assert.equal(f.api.isActive(),false);
  assert.deepEqual(plain(f.api.selectedIds()),[]);
  const before=f.card();
  f.panel().emit('pointerdown',pointer(1,100,100));
  assert.equal(f.read().drawingGestureLocked,true);
  f.panel().emit('pointermove',pointer(1,125,135));
  f.panel().emit('pointerup',pointer(1,125,135));
  assert(f.card().x>before.x&&f.card().y>before.y);
  assert.equal(f.read().drawingGestureLocked,false);
  await f.assertClean();
});

check('drag and resize each save one reversible change and preserve unrelated objects', async () => {
  const f=setup();await f.overview.add();
  f.state.setCard({enabled:true,page:1,layout:'wide',x:.1,y:.1,width:.4,height:.064});
  const original=f.card(),unrelated=f.read().items,baseSaves=f.state.counters.save;
  f.viewer.scrollLeft=22;f.viewer.scrollTop=34;
  f.panel().emit('pointerdown',pointer(1,100,100));
  f.panel().emit('pointermove',pointer(1,140,150));
  f.panel().emit('pointerup',pointer(1,140,150));
  const moved=f.card();
  assert(moved.x>original.x&&moved.y>original.y);
  assert.deepEqual([f.viewer.scrollLeft,f.viewer.scrollTop],[22,34]);
  assert.equal(f.state.counters.save,baseSaves+1);
  assert.equal(f.state.counters.undo,1);
  f.state.undo();assert.deepEqual(f.card(),original);
  f.state.redo();assert.deepEqual(f.card(),moved);
  f.$('securityServiceOverviewResize').emit('pointerdown',pointer(2,400,300));
  f.panel().emit('pointermove',pointer(2,440,320));
  f.panel().emit('pointerup',pointer(2,440,320));
  const resized=f.card();assert(resized.width>moved.width);
  assert(Math.abs(resized.width/resized.height-moved.width/moved.height)<1e-9);
  assert.equal(f.state.counters.save,baseSaves+2);
  assert.equal(f.state.counters.undo,2);
  f.state.undo();assert.deepEqual(f.card(),moved);
  f.state.redo();assert.deepEqual(f.card(),resized);
  assert.deepEqual(f.read().items,unrelated);
  await f.assertClean();
});

check('pointer cancellation restores placement without saving a partial drag', async () => {
  const f=setup();await f.overview.add();const before=f.card(),saves=f.state.counters.save;
  f.panel().emit('pointerdown',pointer(3,100,100));
  f.panel().emit('pointermove',pointer(3,120,130));
  assert.notDeepEqual(f.card(),before);
  f.panel().emit('pointercancel',pointer(3,120,130));
  assert.deepEqual(f.card(),before);assert.equal(f.state.counters.save,saves);
  assert.equal(f.read().drawingGestureLocked,false);
  await f.assertClean();
});

check('page visibility, compact layout and size buttons share the saved project card', async () => {
  const f=setup();await f.overview.add();const wide=f.overview.config();
  const format=f.$('securityServiceOverviewLayout');format.value='compact';format.onchange();
  const compact=f.overview.config();assert.equal(compact.layout,'compact');assert(compact.height>wide.height);
  const before=f.card().width;f.$('securityServiceOverviewSmaller').click();assert(f.card().width<before);
  f.$('securityServiceOverviewLarger').click();assert(f.card().width>before*.88);
  f.state.setPage(2);assert.equal(f.panel().hidden,true);assert.equal(f.controls().hidden,true);
  f.state.setPage(1);assert.equal(f.panel().hidden,false);
  f.state.go('protocol');f.overview.refresh();assert.equal(f.panel().hidden,true);
  f.state.go('drawing');f.overview.refresh();assert.equal(f.panel().hidden,false);
  f.$('securityServiceOverviewDone').click();assert.equal(f.controls().hidden,true);
  await f.assertClean();
});

check('config keeps the physical card aspect ratio on portrait and landscape drawings', async () => {
  const f=setup();
  for(const layout of ['wide','compact'])for(const [width,height]of [[800,1000],[1000,800],[600,1800],[1800,600]]){
    const c=f.overview.config({enabled:true,layout,x:.99,y:.99,width:.9,height:.9},width,height);
    const expected=layout==='wide'?5:600/270;
    assert(Math.abs(c.width*width/(c.height*height)-expected)<1e-9,'natural shape preserved for '+layout+' '+width+'x'+height);
    assert(c.x>=0&&c.y>=0&&c.x+c.width<=1+1e-9&&c.y+c.height<=1+1e-9);
  }
  await f.assertClean();
});

check('show remarks opens the existing customer report and removal affects only the card', async () => {
  const f=setup();await f.overview.add();const before=f.read();
  f.$('securityServiceOverviewOpen').click();
  assert.equal(f.state.overviewCounters.preview,1);assert.equal(f.state.overviewCounters.forceReport,true);
  await f.overview.add();f.$('securityServiceOverviewRemove').click();
  assert.equal(f.card().enabled,false);assert.equal(f.panel().hidden,true);
  assert.deepEqual(f.read().items,before.items);
  assert.deepEqual(f.read().textNotes,before.textNotes);
  assert.deepEqual(f.read().drawingExtras,before.drawingExtras);
  assert.equal(f.read().project.projectName,'Original');
  f.state.undo();assert.equal(f.card().enabled,true);assert.equal(f.panel().hidden,false);
  await f.assertClean();
});

for(const state of ['loading','exporting'])check('add and removal are blocked while '+state,async()=>{
  const f=setup();
  const block=value=>state==='loading'?f.state.setBusy(value):f.document.body.classList.toggle('exporting',value);
  block(true);f.overview.refresh();await f.overview.add();
  assert.equal(f.card(),undefined);assert.equal(f.state.counters.save,0);
  block(false);f.overview.refresh();await f.overview.add();const before=f.card(),saves=f.state.counters.save;
  block(true);f.overview.refresh();f.$('securityServiceOverviewRemove').click();
  assert.deepEqual(f.card(),before);assert.equal(f.state.counters.save,saves);
  block(false);f.overview.refresh();await f.assertClean();
});

for(const change of ['document','project'])check('an awaited add cannot write into a replaced '+change,async()=>{
  const f=setup();let finish;f.context.render=()=>new Promise(resolve=>{finish=resolve;});
  const pending=f.overview.add();assert.equal(typeof finish,'function');
  const replacement={projectName:'Nytt projekt',serviceOverview:{enabled:false}};
  if(change==='document')f.state.replaceProject(replacement);else f.state.setProject(replacement);
  finish(true);await pending;
  assert.deepEqual(f.read().project,replacement);assert.equal(f.state.counters.save,0);
  assert.equal(f.controls().hidden,true);
  await f.assertClean();
});

check('a failed drawing render does not add or save the card',async()=>{
  const f=setup();f.context.render=async()=>false;await f.overview.add();
  assert.equal(f.card(),undefined);assert.equal(f.state.counters.save,0);await f.assertClean();
});

check('loading another project during a drag cannot restore the old placement into it',async()=>{
  const f=setup();await f.overview.add();
  f.panel().emit('pointerdown',pointer(5,100,100));f.panel().emit('pointermove',pointer(5,120,125));
  const replacement={projectName:'Ny ritning',serviceOverview:{enabled:true,page:1,layout:'compact',x:.23,y:.31,width:.4,height:.144}};
  f.state.replaceProject(replacement);const saves=f.state.counters.save;
  f.panel().emit('pointercancel',pointer(5,120,125));
  assert.deepEqual(f.read().project,replacement);assert.equal(f.state.counters.save,saves);
  assert.equal(f.read().drawingGestureLocked,false);assert.equal(f.controls().hidden,true);
  await f.assertClean();
});

check('a loaded card uses its saved placement without reopening edit controls or duplicating the panel',async()=>{
  const f=setup();await f.overview.add();
  const replacement={projectName:'Sparat projekt',serviceOverview:{enabled:true,page:1,layout:'wide',x:.2,y:.3,width:.5,height:.08}};
  f.state.replaceProject(replacement);
  assert.equal(f.panel().hidden,false);assert.equal(f.controls().hidden,true);
  assert.deepEqual(f.card(),replacement.serviceOverview);
  assert.equal(f.document.querySelectorAll('#securityServiceOverview').length,1);
  f.state.close();assert.equal(f.panel().hidden,true);assert.equal(f.controls().hidden,true);
  await f.assertClean();
});

(async()=>{
  for(const {name,fn}of tests){try{await fn();}catch(error){error.message=name+': '+error.message;throw error;}}
  console.log('Security service overview UI v554: '+tests.length+' scenarios passed (real overview/selection controllers and session history).');
})().catch(error=>{console.error(error);process.exitCode=1;});
