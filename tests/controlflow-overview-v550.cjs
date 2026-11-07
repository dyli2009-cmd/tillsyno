'use strict';
// Execute both production overview renderers in a small DOM. This checks values,
// filtering, actions and area isolation; it makes no browser/layout assertions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
let scenarios = 0;

class Element {
  constructor(tag = '', text = '') {
    this.tagName = tag.toUpperCase(); this.nodeType = tag ? 1 : 3;
    this.children = []; this.parentNode = null; this.attrs = {}; this.text = text; this.value = '';
    this.dataset = new Proxy({}, {
      set: (target, key, value) => { target[key] = String(value); this.attrs['data-' + key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())] = String(value); return true; },
      deleteProperty: (target, key) => { delete target[key]; delete this.attrs['data-' + key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())]; return true; }
    });
    this.classList = {contains: name => this.className.split(/\s+/).includes(name)};
  }
  get id() { return this.attrs.id || ''; }
  set id(value) { this.attrs.id = value; }
  get className() { return this.attrs.class || ''; }
  set className(value) { this.attrs.class = value; }
  get type() { return this.attrs.type || ''; }
  set type(value) { this.attrs.type = value; }
  get textContent() { return this.nodeType === 3 ? this.text : this.children.map(n => n.textContent).join(''); }
  set textContent(value) { this.replaceChildren(new Element('', String(value))); }
  setAttribute(key, value) {
    this.attrs[key] = String(value);
    if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  getAttribute(key) { return this.attrs[key] ?? null; }
  hasAttribute(key) { return key in this.attrs; }
  removeAttribute(key) {
    delete this.attrs[key];
    if (key.startsWith('data-')) delete this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
  }
  append(...nodes) {
    for (const node of nodes) { node.parentNode = this; this.children.push(node); }
  }
  appendChild(node) { this.append(node); return node; }
  replaceChildren(...nodes) { for (const n of this.children) n.parentNode = null; this.children = []; this.append(...nodes); }
  descendants() { return this.children.flatMap(n => [n, ...n.descendants()]); }
  matches(selector) {
    if (this.nodeType !== 1) return false;
    if (selector.includes(',')) return selector.split(',').some(s => this.matches(s.trim()));
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    return this.tagName.toLowerCase() === selector;
  }
  querySelectorAll(selector) {
    const parts = selector.trim().split(/\s+/), last = parts.pop();
    return this.descendants().filter(node => {
      if (!node.matches(last)) return false;
      let ancestor = node.parentNode;
      for (let i = parts.length - 1; i >= 0; i--) {
        while (ancestor && !ancestor.matches(parts[i])) ancestor = ancestor.parentNode;
        if (!ancestor) return false;
        ancestor = ancestor.parentNode;
      }
      return true;
    });
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let n = this; n; n = n.parentNode) if (n.matches(selector)) return n; return null; }
  emit(type) {
    const event = {target: this, stopped: false, stopPropagation() {this.stopped = true;}};
    for (let n = this; n; n = n.parentNode) { n['on' + type]?.(event); if (event.stopped) break; }
  }
}

function fixture(mode, allInOne = true) {
  const revision = mode === 'revision';
  const html = fs.readFileSync(path.join(root, revision ? 'controlflow-revision/all-in-one.html' : 'all-in-one.html'), 'utf8');
  const source = fs.readFileSync(path.join(root, revision ? 'controlflow-revision/security-v335.js' : 'security.js'), 'utf8');
  const document = new Element('document'), htmlNode = new Element('html'), body = new Element('body');
  htmlNode.setAttribute('data-controlflow-ui', '1'); htmlNode.setAttribute('data-cf-stamp-mode', mode);
  body.className = 'securityApp allInOneApp securityWorkspace'; htmlNode.append(body); document.append(htmlNode);
  document.documentElement = htmlNode; document.body = body;
  document.createElement = tag => new Element(tag);
  document.getElementById = id => document.descendants().find(n => n.id === id) || null;
  const stack = [body], markup = html.match(/<dialog id="securityOverview"[\s\S]*?<\/dialog>/)[0];
  for (const token of markup.match(/<[^>]+>|[^<]+/g)) {
    if (token.startsWith('</')) { stack.pop(); continue; }
    if (!token.startsWith('<')) { stack.at(-1).append(new Element('', token)); continue; }
    const tag = token.match(/^<([\w-]+)/)[1], node = new Element(tag);
    for (const attr of token.slice(tag.length + 1, -1).matchAll(/([\w-]+)(?:="([^"]*)")?/g)) node.setAttribute(attr[1], attr[2] ?? '');
    stack.at(-1).append(node);
    if (!['input', 'br', 'img', 'hr'].includes(tag)) stack.push(node);
  }
  function productionFunction(name) {
    const start = source.indexOf('function ' + name + '('); assert(start >= 0, name);
    const lineEnd = source.indexOf('\n', start);
    const end = source[lineEnd - 1] === '}' ? lineEnd : source.indexOf('\n}', start) + 2;
    return source.slice(start, end);
  }
  const context = vm.createContext({document, console}); context.window = context;
  vm.runInContext(`
    const $=id=>document.getElementById(id),ALL_IN_ONE=${allInOne};
    const SYSTEMS={automation:{label:'Dörrautomatik'},detector:{label:'Detektor'},fire_panel:{label:'Brandcentral'}};
    let items=[],selected=null,activeTypes=[];
    const calls={save:0,draw:0,selected:0,closed:0,route:''};
    window.AllInOneProtocols={get:()=>activeTypes};
    function visibleItems(){return items.filter(o=>!activeTypes.length||activeTypes.includes(o.type))}
    function isSecurityRemediated(o){return !!(o.recorded&&o.remediationDate&&o.remediationSignature)}
    function statusOf(o){return isSecurityRemediated(o)?'ok':o.status}
    function hasSecurityRecordedProblem(o){return !!o.recorded}
    function hasSecurityProblem(o){return !!o.recorded&&!isSecurityRemediated(o)}
    function securityStatusText(o){return isSecurityRemediated(o)?'Åtgärdad':({ok:'Godkänd',action:'Åtgärd krävs',fail:'Ej godkänd',untested:'Ej klar'})[o.status]}
    function securityDrawingLabel(o){return o.id||'Objekt '+o.number}
    function securityProtocolLabel(o){return o.customType||SYSTEMS[o.type].label}
    function securityObjectIdentity(o){return o.id+' – '+securityProtocolLabel(o)}
    function allChecks(o){return Object.entries(o.checks||{}).map(([id,c])=>[id,c.title])}
    function save(){calls.save++} function drawMarkers(){calls.draw++}
    function showSelected(){calls.selected++} function closeSecurityOverview(){calls.closed++}
    function go(view){calls.route=view}
    ${['issues','securityPriority','controlflowOverviewCompact','setSecurityOverviewSummary','syncSecurityOverviewCard','showOverview'].map(productionFunction).join('\n')}
    ${source.match(/^\$\('secOverviewFilter'\).onchange=showOverview;.*$/m)[0]}
    globalThis.api={calls,render:showOverview,
      load(records,types){items=records;activeTypes=types;selected=null;$('secOverviewFilter').value='all';$('secOverviewSearch').value='';
        if(types.some(type=>['alarm','detector','lock','access'].includes(type)))document.body.setAttribute('data-security-project-layout','');
        else document.body.removeAttribute('data-security-project-layout');showOverview();},
      values:()=>JSON.parse(JSON.stringify(items)),selected:()=>selected};
  `, context);
  return {document, api: context.api, $: id => document.getElementById(id)};
}

function records(type) {
  const base = {type, number: 1, location: '', notes: '', checks: {}, recorded: false, remediationDate: '', remediationSignature: '', remediationDescription: ''};
  return [
    {...base, uid:'ready', id:'D1-Långt-ID-<text>', location:'Entré Väster', status:'ok', customType:'Siren & signal'},
    {...base, uid:'done', id:'D2', status:'action', recorded:true, remediationDate:'2026-11-01', remediationSignature:'AB', remediationDescription:'Bytt del'},
    {...base, uid:'action', id:'D3', status:'action', recorded:true, checks:{a:{title:'Funktion',result:'remark',note:'Kabelfel'}}, remediationDescription:'Sparat utkast'},
    {...base, uid:'failed', id:'D4', status:'fail', recorded:true, notes:'Manuell kontroll'},
    {...base, uid:'untested', id:'D5', status:'untested'},
    {...base, uid:'brand', id:'B1', type:'fire_panel', status:'untested'}
  ];
}

for (const mode of ['security','revision']) {
  const type = mode === 'security' ? 'detector' : 'automation', f = fixture(mode), {$,api,document} = f;
  const originalFilter = $('secOverviewFilter'), originalSearch = $('secOverviewSearch');
  const originalTitle = $('securityOverview').querySelector('h2').textContent;
  const data = records(type); api.load(data, [type,'fire_panel']);
  const cards = () => $('secOverviewList').querySelectorAll('article');
  const card = uid => cards().find(n => n.dataset.uid === uid);
  const counts = () => $('secOverviewSummary').querySelectorAll('strong').map(n => Number(n.textContent));
  assert.equal($('securityOverview').getAttribute('data-cf-overview-compact'), '1');
  assert.deepEqual(counts(), [6,1,1,1,1,2]);
  assert.equal($('secOverviewSummary').querySelectorAll('em').length, 0, 'no duplicated explanatory line');
  assert.deepEqual($('secOverviewSummary').querySelectorAll('small').map(n=>n.textContent), ['Totalt','Godkända','Åtgärdade','Anmärkning','Ej godkända','Ej kontrollerade']);
  assert.deepEqual($('secOverviewSummary').querySelectorAll('.overviewStat').map(n=>n.className), ['overviewStat total','overviewStat ready','overviewStat done','overviewStat open','overviewStat fail','overviewStat untested']);
  assert.equal($('secOverviewSummary').querySelectorAll('.overviewMeaning').length, 6, 'existing status-colour hooks retained');
  assert.equal(card('ready').querySelector('h3').textContent, data[0].id);
  assert.equal(card('ready').querySelector('.cfOverviewType').textContent, mode === 'security' ? 'Siren & signal' : 'Dörrautomatik');
  assert.equal(card('ready').querySelector('.secSummaryMeta').textContent, 'Placering: Entré Väster');
  assert.equal(card('brand').querySelector('.cfOverviewIdentity'), null, 'mixed Brand card retains original markup');
  if (mode === 'revision') assert.equal($('securityOverview').querySelector('h2').textContent, 'Översikt');

  for (const [query, expected] of [['d1-långt',['ready']], ['väster',['ready']], ['kabelfel',['action']], ['sparat utkast',['action']], ['ingen träff',[]]]) {
    originalSearch.value = query; originalSearch.emit('input');
    assert.deepEqual(cards().map(n=>n.dataset.uid), expected, 'search: ' + query);
    assert.deepEqual(counts(), [6,1,1,1,1,2], 'search does not change the six totals');
  }
  originalSearch.value = ''; originalSearch.emit('input');
  for (const [filter, expected] of [['problems',['action','failed']], ['ok',['done','ready']], ['untested',['brand','untested']]]) {
    originalFilter.value = filter; originalFilter.emit('change');
    assert.deepEqual(cards().map(n=>n.dataset.uid).sort(), expected.sort(), 'filter: ' + filter);
  }
  originalFilter.value = 'all'; originalFilter.emit('change');
  let actionCard = card('action'), text = actionCard.querySelector('textarea');
  assert.equal(text.value, 'Sparat utkast');
  text.emit('click'); assert.equal(api.selected(), null, 'editing does not open a protocol');
  text.value = 'Nytt åtgärdsutkast'; text.emit('input');
  assert.equal(api.values().find(o=>o.uid==='action').remediationDescription, text.value);
  text.emit('change'); actionCard = card('action');
  assert.equal(actionCard.querySelector('textarea').value, 'Nytt åtgärdsutkast', 'draft survives rerender');
  const date = actionCard.querySelectorAll('input').find(n=>n.type==='date');
  const signature = actionCard.querySelectorAll('input').find(n=>n.type==='text');
  date.value = '2026-11-02'; date.emit('input');
  signature.value = 'CD'; signature.emit('input');
  assert.deepEqual(counts(), [6,1,2,0,1,2], 'existing repair handlers update summary');
  assert.equal(actionCard.querySelector('.secStatusBadge').textContent, 'Åtgärdad');
  signature.emit('change');
  assert.equal(card('action').querySelectorAll('input').find(n=>n.type==='text').value, 'CD');
  assert(api.calls.save > 0 && api.calls.draw > 0);
  card('ready').querySelector('h3').emit('click');
  assert.equal(api.selected(), 'ready'); assert.equal(api.calls.route, 'protocol'); assert.equal(api.calls.closed, 1);
  for (let i=0;i<8;i++) api.render();
  assert.equal($('secOverviewFilter'), originalFilter); assert.equal($('secOverviewSearch'), originalSearch);
  assert.equal($('secOverviewList').querySelectorAll('.cfOverviewIdentity').length, 5);

  const typeLabel = mode === 'security' ? 'Lås & Dörrmiljö' : 'Dörrautomatik';
  const identityCases = [typeLabel, typeLabel + ' 1', typeLabel + '-1', typeLabel + 'Extra', 'D1', '1041'];
  api.load(identityCases.map((id, index) => ({...records(type)[0], id, uid:'identity-' + index, customType:typeLabel})), [type]);
  identityCases.forEach((id, index) => {
    const rendered = card('identity-' + index);
    assert.equal(rendered.querySelector('h3').textContent, id, 'display ID is unchanged');
    assert.equal(api.values()[index].id, id, 'stored ID is unchanged');
    if (index < 3) assert.equal(rendered.querySelector('.cfOverviewType'), null, 'type already present at a word boundary');
    else assert.equal(rendered.querySelector('.cfOverviewType').textContent, typeLabel, 'type retained for an independent ID or different word');
  });

  api.load([records(type).at(-1)], ['fire_panel']);
  assert.equal($('securityOverview').getAttribute('data-cf-overview-compact'), '0', 'Brand-only area is excluded');
  assert.equal($('secOverviewSummary').querySelectorAll('em').length, 6);
  assert.equal(card('brand').querySelector('.cfOverviewIdentity'), null);
  if (mode === 'revision') assert.equal($('securityOverview').querySelector('h2').textContent, originalTitle);
  document.documentElement.dataset.controlflowUi = '0'; api.load(records(type), [type]);
  assert.equal($('securityOverview').getAttribute('data-cf-overview-compact'), '0', 'non-Controlflow route is excluded');
  assert.equal($('secOverviewSummary').querySelectorAll('em').length, 6);
  const standalone = fixture(mode, false); standalone.api.load(records(type), [type]);
  assert.equal(standalone.$('securityOverview').getAttribute('data-cf-overview-compact'), '0', 'standalone app is excluded');
  scenarios++;
}
console.log(`Overview v550: ${scenarios} real renderers passed six-count/status, ID/type, search/filter, edit/persist/rerender, navigation and Brand/standalone isolation checks. Layout requires browser review.`);
