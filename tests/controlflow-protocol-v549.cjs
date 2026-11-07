'use strict';
// No browser emulation: execute the real HTML structure, checklist renderers and
// protocol adapter in a minimal DOM to test identity, re-render and action safety.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const rootPath = path.join(__dirname, '..');
const adapter = fs.readFileSync(path.join(rootPath, 'controlflow-protocol-v549.js'), 'utf8');
const css = fs.readFileSync(path.join(rootPath, 'controlflow-protocol-v549.css'), 'utf8');
let scenarios = 0;

function fixture(html, core) {
  let document;
  class Node {
    constructor(type, tag = '', value = '') {
      this.nodeType = type; this.tagName = tag.toUpperCase(); this.childNodes = [];
      this.parentNode = null; this.attrs = {}; this.dataset = {}; this.style = {};
      this.listeners = new Map(); this.data = value; this.value = ''; this.disabled = false;
      this.readOnly = false; this.scrollHeight = 180; this._open = false;
      this.classList = {
        contains: key => this.className.split(/\s+/).includes(key),
        add: (...keys) => this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...keys])].join(' '),
        remove: (...keys) => this.className = this.className.split(/\s+/).filter(k => !keys.includes(k)).join(' '),
        toggle: (key, on) => { const yes = on === undefined ? !this.classList.contains(key) : on; yes ? this.classList.add(key) : this.classList.remove(key); return yes; }
      };
    }
    get children() { return this.childNodes.filter(n => n.nodeType === 1); }
    get id() { return this.attrs.id || ''; } set id(v) { this.attrs.id = v; }
    get className() { return this.attrs.class || ''; } set className(v) { this.attrs.class = v; }
    get hidden() { return 'hidden' in this.attrs; } set hidden(v) { v ? this.attrs.hidden = '' : delete this.attrs.hidden; }
    get open() { return this._open; } set open(v) { this._open = !!v; this.emit('toggle'); }
    get textContent() { return this.nodeType === 3 || this.nodeType === 8 ? this.data : this.childNodes.map(n => n.textContent).join(''); }
    set textContent(v) { if (this.nodeType === 3 || this.nodeType === 8) this.data = String(v); else this.replaceChildren(new Node(3, '', String(v))); }
    set innerHTML(v) { this.textContent = v; }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v); if (k === 'readonly') this.readOnly = true; }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; if (k.startsWith('data-')) delete this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())]; }
    append(...nodes) { for (let n of nodes) { if (typeof n === 'string') n = new Node(3, '', n); n.remove(); this.childNodes.push(n); n.parentNode = this; } }
    appendChild(node) { this.append(node); return node; }
    replaceChildren(...nodes) { for (const n of this.childNodes) n.parentNode = null; this.childNodes = []; this.append(...nodes); }
    remove() { if (this.parentNode) { this.parentNode.childNodes = this.parentNode.childNodes.filter(n => n !== this); this.parentNode = null; } }
    before(node) { this.insertRelative(node, 0); }
    after(node) { this.insertRelative(node, 1); }
    insertRelative(node, offset) { const parent = this.parentNode; assert(parent, 'relative insertion needs connected parent'); node.remove(); const index = parent.childNodes.indexOf(this); parent.childNodes.splice(index + offset, 0, node); node.parentNode = parent; }
    contains(node) { return node === this || this.childNodes.some(n => n.contains(node)); }
    matches(selector) {
      if (this.nodeType !== 1) return false;
      if (selector.startsWith('#')) return this.id === selector.slice(1);
      if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
      if (selector === '[id]') return !!this.id;
      return this.tagName.toLowerCase() === selector.toLowerCase();
    }
    querySelectorAll(selector) {
      const parts = selector.trim().split(/\s+/), last = parts.pop();
      return this.descendants().filter(n => {
        if (!n.matches(last)) return false;
        let at = n.parentNode;
        for (let i = parts.length - 1; i >= 0; i--) { while (at && !at.matches(parts[i])) at = at.parentNode; if (!at) return false; at = at.parentNode; }
        return true;
      });
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { let n = this; while (n) { if (n.matches(selector)) return n; n = n.parentNode; } return null; }
    descendants() { return this.childNodes.flatMap(n => [n, ...n.descendants()]); }
    cloneNode(deep) { const copy = new Node(this.nodeType, this.tagName, this.data); copy.attrs = {...this.attrs}; if (deep) copy.append(...this.childNodes.map(n => n.cloneNode(true))); return copy; }
    addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
    removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) || []).filter(f => f !== fn)); }
    emit(type, extra = {}) {
      const event = {type, target: this, key: '', stopped: false, preventDefault() {this.defaultPrevented = true;}, stopPropagation() {this.stopped = true;}, ...extra};
      const chain = []; for (let n = this; n; n = n.parentNode) chain.push(n);
      for (const n of chain) { if (n['on' + type]) n['on' + type](event); for (const fn of [...(n.listeners.get(type) || [])]) fn(event); if (event.stopped) break; }
      return event;
    }
    click() { this.emit('click'); }
    focus() { document.activeElement = this; this.emit('focusin'); }
    getBoundingClientRect() { return {top: 50, bottom: 94, left: 250, right: 294, width: 44, height: 44}; }
    scrollIntoView() {}
  }
  document = new Node(9);
  const htmlNode = new Node(1, 'html'), body = new Node(1, 'body');
  htmlNode.setAttribute('data-controlflow-ui', '1'); htmlNode.append(body); document.append(htmlNode);
  body.className = 'allInOneApp'; body.dataset.view = 'protocol';
  document.documentElement = htmlNode; document.body = body; document.readyState = 'complete';
  document.createElement = tag => new Node(1, tag);
  document.createComment = text => new Node(8, '', text);
  document.getElementById = id => document.descendants().find(n => n.nodeType === 1 && n.id === id) || null;
  const section = html.match(/<aside id="securityProtocol"[\s\S]*?<\/aside>/)[0];
  const stack = [body];
  for (const token of section.match(/<[^>]+>|[^<]+/g)) {
    if (token.startsWith('</')) { stack.pop(); continue; }
    if (token.startsWith('<')) {
      const name = token.match(/^<([\w-]+)/)?.[1]; if (!name) continue;
      const el = new Node(1, name);
      for (const attr of token.slice(name.length + 1, -1).matchAll(/([\w-]+)(?:="([^"]*)")?/g)) el.setAttribute(attr[1], attr[2] === undefined ? '' : attr[2]);
      if (el.getAttribute('open') !== null) el._open = true;
      stack[stack.length - 1].append(el);
      if (!['input', 'br', 'img', 'hr', 'meta', 'link'].includes(name)) stack.push(el);
    } else stack[stack.length - 1].append(new Node(3, '', token));
  }
  // Existing source icon, represented as a DOM node rather than an invented replacement.
  const tool = new Node(1, 'button'); tool.className = 'serviceToolLauncher'; tool.append(new Node(1, 'svg')); body.append(tool);
  const originalParents = Object.fromEntries(['secProgress', 'secApproveAll', 'secDelete', 'secAddCheck', 'secEditChecks', 'secCloseProtocol'].map(id => [id, document.getElementById(id).parentNode]));
  function productionFunction(name) {
    const start = core.indexOf('function ' + name + '('); assert(start >= 0);
    const lineEnd = core.indexOf('\n', start), end = core[lineEnd - 1] === '}' ? lineEnd : core.indexOf('\n}', start) + 2;
    return core.slice(start, end);
  }
  const context = vm.createContext({console, document, innerWidth: 390, innerHeight: 844, MutationObserver: class {observe() {}}, requestAnimationFrame: fn => fn(), addEventListener() {}, openSecurityCheckEditor() {}, cleanSecurityRemarkText: s => s, refreshTop() {}, drawMarkers() {}, showOverview() {}, save() {}, removeSecurityCheck: () => false});
  context.window = context;
  vm.runInContext(`
    const $=id=>document.getElementById(id); let selectedItem=null,securityCheckEditUid=null;
    const SYSTEMS=Object.fromEntries(['automation','automation_selfcheck','lock_revision','alarm','detector','lock','access','fire'].map(t=>[t,{faults:{}}]));
    function cur(){return selectedItem}
    function allChecks(o){return [['1.1','Första kontrollen'],['1.2','Andra kontrollen'],...o.customChecks.map(c=>[c.id,c.title])]}
    function syncStatus(o){o.status=allChecks(o).every(([id])=>o.checks[id]?.result==='ok')?'ok':'untested'}
    ${productionFunction('buildChecklist')}
    ${productionFunction('updateProgress')}
    function showSelected(){const o=cur();$('secForm').hidden=!o;if(!o)return;$('secType').value='Protokoll '+o.type;$('secType').readOnly=o.type!=='detector';$('secEditChecks').textContent=securityCheckEditUid===o.uid?'Klar':'Redigera kontrollpunkter';buildChecklist(o)}
    const calls={approve:0,add:0,remove:0,close:0};
    $('secApproveAll').onclick=()=>{calls.approve++;const o=cur();for(const[id]of allChecks(o))o.checks[id]={result:'ok',note:''};buildChecklist(o)};
    $('secEditChecks').onclick=()=>{const o=cur();securityCheckEditUid=securityCheckEditUid===o.uid?null:o.uid;$('secEditChecks').textContent=securityCheckEditUid===o.uid?'Klar':'Redigera kontrollpunkter';buildChecklist(o)};
    $('secAddCheck').onclick=()=>{calls.add++;const o=cur();o.customChecks.push({id:'extra'+calls.add,title:'Egen kontroll'});buildChecklist(o)};
    $('secDelete').onclick=()=>{calls.remove++};$('secCloseProtocol').onclick=()=>{calls.close++};
    globalThis.api={calls,select(type){selectedItem={uid:type,type,checks:{},customChecks:[],notes:'',status:'untested'};showSelected();return selectedItem},render(){buildChecklist(cur())},clear(){selectedItem=null;showSelected()}};
  `, context);
  vm.runInContext(adapter, context);
  return {document, api: context.api, originalParents};
}

for (const [htmlFile, coreFile, type] of [['all-in-one.html', 'security.js', 'lock'], ['controlflow-revision/all-in-one.html', 'controlflow-revision/security-v335.js', 'automation']]) {
  const f = fixture(fs.readFileSync(path.join(rootPath, htmlFile), 'utf8'), fs.readFileSync(path.join(rootPath, coreFile), 'utf8'));
  const $ = id => f.document.getElementById(id);
  const refs = Object.fromEntries(Object.keys(f.originalParents).map(id => [id, $(id)]));
  const o = f.api.select(type);
  assert.equal(f.document.body.getAttribute('data-cf-protocol-compact'), '1');
  assert.equal($('secProgress').textContent, '0 / 2');
  assert.equal($('secProgress').parentNode.className, 'cfProtocolCheckActions');
  assert.equal($('secApproveAll').parentNode, $('secProgress').parentNode);
  assert.equal($('cfProtocolName').textContent, 'Protokoll ' + type);
  assert.equal($('secLocation').closest('label').childNodes[0].textContent, 'Placering');
  assert($('cfProtocolTools').querySelector('svg'));
  $('cfProtocolCheckToggle').click(); assert.equal($('cfProtocolCheckGroup').open, false);
  f.api.render(); assert.equal($('cfProtocolCheckGroup').open, false, 'closed list survives same-object rebuild');
  $('cfProtocolCheckToggle').click(); assert.equal($('cfProtocolCheckGroup').open, true);
  $('secApproveAll').click(); assert.equal(f.api.calls.approve, 1); assert.equal($('secProgress').textContent, '2 / 2');
  assert.equal($('cfProtocolCheckGroup').open, true, 'approval does not toggle details');
  $('cfProtocolTools').click(); assert.equal($('cfProtocolToolsMenu').hidden, false); assert.equal(f.document.activeElement, $('secAddCheck'));
  $('secAddCheck').emit('keydown', {key: 'ArrowDown'}); assert.equal(f.document.activeElement, $('secEditChecks'));
  $('secEditChecks').emit('keydown', {key: 'Escape'}); assert.equal($('cfProtocolToolsMenu').hidden, true); assert.equal(f.document.activeElement, $('cfProtocolTools'));
  $('cfProtocolTools').click(); $('secAddCheck').click(); assert.equal(f.api.calls.add, 1); assert.equal($('secProgress').textContent, '2 / 3');
  assert.equal($('cfProtocolToolsMenu').hidden, true);
  $('cfProtocolTools').click(); $('secEditChecks').click(); assert.equal($('secEditChecks').parentNode.className, 'cfProtocolEditDock'); assert.equal($('secEditChecks').textContent, 'Klart');
  assert.equal($('cfProtocolToolsMenu').hidden, true); assert.equal(f.document.activeElement, $('secEditChecks'));
  $('secEditChecks').click(); assert.equal($('secEditChecks').parentNode, $('cfProtocolToolsMenu')); assert.equal(f.document.activeElement, $('cfProtocolTools'));
  for (let i = 0; i < 12; i++) f.api.render();
  for (const [id, node] of Object.entries(refs)) { assert.equal($(id), node, id + ' keeps original identity'); assert.equal(f.document.querySelectorAll('#' + id).length, 1); }
  assert.equal($('secProgress').textContent, '2 / 3');
  $('cfProtocolTools').click(); $('secNotes').focus(); assert.equal($('cfProtocolToolsMenu').hidden, true, 'outside focus closes menu');
  f.api.select('fire');
  assert.equal(f.document.body.getAttribute('data-cf-protocol-compact'), null, 'Brand is excluded');
  assert.equal($('cfProtocolCheckHeader').hidden, true);
  for (const [id, parent] of Object.entries(f.originalParents)) assert.equal($(id).parentNode, parent, id + ' restored for Brand');
  assert.equal($('secProgress').textContent, '0 / 2 kontrollerade');
  assert.equal($('secLocation').closest('label').childNodes[0].textContent, 'Placering / Dörrlittra');
  assert.equal($('secAddCheck').getAttribute('role'), null);
  f.api.select('detector'); assert.equal($('secType').classList.contains('cfProtocolReadOnly'), false); assert.equal($('cfProtocolName').hidden, true, 'editable detector name preserved');
  f.api.clear(); assert.equal($('secForm').hidden, true); assert.equal($('cfProtocolToolsMenu').hidden, true);
  scenarios++;
}

assert(css.includes('@layer controlflowStandard'));
assert(css.includes('.secCheckGroup>summary{display:none!important}'), 'legacy count is removed visually and semantically');
assert(css.includes('button::before'), 'compact painted surface is separated from hit target');
assert(css.includes('min-width:44px!important;width:44px!important;min-height:44px!important;height:44px!important'));
assert(css.includes('@media(max-width:359px)'));
assert(css.includes('[data-cf-large-text]'));
assert(css.includes('[data-tillsyno-device="phone"]'));
console.log(`Compact protocol v549: ${scenarios} real renderers passed identity, repeated redraw, fold state, menu/focus, action, field and Brand-isolation checks. CSS guards checked; layout requires browser review.`);
