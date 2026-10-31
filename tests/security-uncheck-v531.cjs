const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(process.argv[2] || path.join(__dirname, '../security.js'), 'utf8');

// Execute the production checklist handlers with a minimal DOM and real save/load functions.
class Element {
  constructor(tag) {
    this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {};
    const classes = new Set();
    this.classList = {toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }, add(name) {classes.add(name);}, remove(name) {classes.delete(name);}, contains(name) {return classes.has(name);}};
  }
  append(...nodes) {this.children.push(...nodes);}
  appendChild(node) {this.append(node); return node;}
  replaceChildren(...nodes) {this.children = nodes;}
  setAttribute(name, value) {this.attributes[name] = value;}
  focus() {}
}
const nodes = new Map(), storage = new Map();
const context = vm.createContext({
  console, document: {createElement: tag => new Element(tag), getElementById: id => {if (!nodes.has(id)) nodes.set(id, new Element('div')); return nodes.get(id);}},
  localStorage: {setItem: (key, value) => storage.set(key, value), getItem: key => storage.get(key)},
  refreshTop() {}, drawMarkers() {}, showOverview() {}, requestAnimationFrame: fn => fn()
});
function productionFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, name);
  const lineEnd = source.indexOf('\n', start);
  const end = source[lineEnd - 1] === '}' ? lineEnd : source.indexOf('\n}', start) + 2;
  return source.slice(start, end);
}
vm.runInContext(`const ALL_IN_ONE=true; const $=id=>document.getElementById(id);
  let securityCheckEditUid=null,items=[],textNotes=[],drawingExtras=[],project={},logoData='',activeKey='test';
  const APP_STORAGE_PREFIX='security-service:';
  ${source.slice(source.indexOf('const SYSTEMS='), source.indexOf('const DOOR_AUTOMATION_MODELS='))}
  ${['normalizeSecurityCheckEdits','securityCustomProtocolLabel','securityDefaultCheckTitle','allChecks','syncStatus','hasSecurityRecordedProblem','isSecurityRemediated','statusOf','save','loadSaved','buildChecklist','updateProgress','issues'].map(productionFunction).join('\n')}
  globalThis.api={SYSTEMS,allChecks,syncStatus,statusOf,buildChecklist,loadSaved,issues,setItem(o){items=[o]}};`, context);
const api = context.api;
function descendants(node) {return [node, ...node.children.flatMap(descendants)];}
function row(id) {return descendants(nodes.get('secChecklist')).find(n => n.className?.split(' ').includes('secCheck') && descendants(n).some(c => c.className === 'checkNumber' && c.textContent === id));}
function button(id, value) {return descendants(row(id)).find(n => n.dataset.v === value);}
function click(id, value) {button(id, value).onclick();}
function item(type) {
  const o={uid:type,type,checks:{},customChecks:[],notes:'',status:'untested'};
  for(const [id] of api.allChecks(o)) o.checks[id]={result:'',note:''};
  api.setItem(o); api.buildChecklist(o); return o;
}
let scenarios=0;
for(const type of ['alarm','detector','lock','access']) {
  for(const value of ['ok','na','remark']) {
    const o=item(type), id='1.1', total=api.allChecks(o).length;
    click(id,value); assert.equal(o.checks[id].result,value);
    if(value==='remark') o.checks[id].note='Behöver justeras';
    click(id,value);
    assert.equal(o.checks[id].result,''); assert.equal(o.status,'untested');
    assert.equal(nodes.get('secProgress').textContent,`0 / ${total} kontrollerade`);
    for(const v of ['ok','na','remark']) assert.equal(button(id,v).attributes['aria-pressed'],'false');
    assert.equal(api.issues(o).length,0);
    const saved=api.loadSaved('test').items[0];
    assert.equal(saved.checks[id].result,''); api.buildChecklist(saved); api.setItem(saved);
    click(id,value); assert.equal(saved.checks[id].result,value);
    if(value==='remark') assert.equal(saved.checks[id].note,'Behöver justeras');
    scenarios++;
  }
  const o=item(type);
  for(const check of Object.values(o.checks)) check.result='ok';
  api.syncStatus(o); api.buildChecklist(o); assert.equal(o.status,'ok');
  click('1.1','ok'); assert.equal(api.statusOf(o),'untested');
  assert.equal(nodes.get('secStatus').value,'untested');
  click('1.1','remark'); o.checks['1.1'].note='Sparad anmärkning';
  click('1.1','ok'); assert.equal(o.checks['1.1'].note,''); assert.equal(o.status,'ok');
  o.customChecks.push({id:'extra',title:'Egen punkt'}); o.checks.extra={result:'remark',note:'Egen text'};
  o.remediationDate='2026-10-30'; o.remediationSignature='AA'; api.syncStatus(o); api.buildChecklist(o);
  assert.equal(api.statusOf(o),'ok'); click('1.1','ok');
  assert.equal(o.remediationDate,''); assert.equal(o.remediationSignature,''); assert.equal(api.statusOf(o),'action');
  click('extra','remark'); assert.equal(o.checks.extra.result,''); assert.equal(o.checks.extra.note,'Egen text');
  assert.equal(o.status,'untested'); scenarios++;
}
for(const type of Object.keys(api.SYSTEMS).filter(type=>!['alarm','detector','lock','access'].includes(type))) {
  const o=item(type); const id=api.allChecks(o)[0][0];
  for(const value of ['ok','na','remark']) {click(id,value); click(id,value); assert.equal(o.checks[id].result,value);}
  scenarios++;
}
console.log(`Security uncheck: ${scenarios} scenarios passed, including saved/reopened state and unaffected protocols.`);
