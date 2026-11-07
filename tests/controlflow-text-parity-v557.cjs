'use strict';
// Exercise the actual shared controller with event dispatch and persistent storage.
// This fixture verifies behavior and scope; computed CSS needs browser/device QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../controlflow-ui-scale.js'), 'utf8');
const KEY = 'tillsyno-controlflow-text-level-v1', LEGACY = 'doorservice-ui-text-level';
const FACTORS = [1, 1.12, 1.24, 1.36, 1.6, 1.8, 2];
const tests = [];
const check = (name, fn) => tests.push({name, fn});

function storage(initial = {}, {denyReads = false, denyWrites = false} = {}) {
  const values = new Map(Object.entries(initial)), reads = [], writes = [];
  return {values, reads, writes,
    getItem(key) { reads.push(key); if (denyReads) throw Error('Storage unavailable'); return values.get(key) ?? null; },
    setItem(key, value) { writes.push([key, String(value)]); if (denyWrites) throw Error('Quota exceeded'); values.set(key, String(value)); },
    removeItem(key) { writes.push([key, null]); if (denyWrites) throw Error('Quota exceeded'); values.delete(key); }
  };
}

function fixture({mode = 'security', stored = storage(), groups = 1, chooser = true, controlflow = true, ready = 'complete'} = {}) {
  let document;
  const observers = [], pending = [];
  const dataKey = name => name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null;
      this.attrs = {}; this.dataset = {}; this.className = ''; this.listeners = new Map(); this._text = ''; this.disabled = false; this.hidden = false;
      const values = {}; this.style = {setProperty(k, v) { values[k] = String(v); }, getPropertyValue(k) { return values[k] || ''; }, values};
      this.classList = {contains: name => this.className.split(/\s+/).includes(name),
        add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
        remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); }};
    }
    get id() { return this.attrs.id || ''; } set id(value) { this.attrs.id = value; }
    get textContent() { return this._text + this.children.map(node => node.textContent).join(''); }
    set textContent(value) { this._text = String(value); for (const node of this.children) node.parentNode = null; this.children = []; }
    set innerHTML(value) { this.textContent = ''; this._html = value; } get innerHTML() { return this._html || ''; }
    get parentElement() { return this.parentNode; }
    get isConnected() { for (let at = this; at; at = at.parentNode) if (at === document) return true; return false; }
    get nextSibling() { return this.parentNode?.children[this.parentNode.children.indexOf(this) + 1] || null; }
    setAttribute(name, value) { this.attrs[name] = String(value); if (name === 'class') this.className = String(value); if (name.startsWith('data-')) this.dataset[dataKey(name)] = String(value); if (name === 'hidden') this.hidden = true; }
    getAttribute(name) { if (name === 'class') return this.className || null; if (name.startsWith('data-')) return this.dataset[dataKey(name)] ?? null; return this.attrs[name] ?? null; }
    hasAttribute(name) { return this.getAttribute(name) !== null; }
    removeAttribute(name) { delete this.attrs[name]; if (name.startsWith('data-')) delete this.dataset[dataKey(name)]; if (name === 'hidden') this.hidden = false; }
    toggleAttribute(name, force = !this.hasAttribute(name)) { if (force) this.setAttribute(name, ''); else this.removeAttribute(name); return force; }
    append(...nodes) { for (const node of nodes) { node.remove(); node.parentNode = this; this.children.push(node); } }
    prepend(...nodes) { for (const node of [...nodes].reverse()) { node.remove(); node.parentNode = this; this.children.unshift(node); } }
    insertBefore(node, reference) { if (!reference) return this.append(node); node.remove(); const at = this.children.indexOf(reference); assert(at >= 0); this.children.splice(at, 0, node); node.parentNode = this; }
    before(node) { this.parentNode.insertBefore(node, this); }
    after(node) { this.parentNode.insertBefore(node, this.nextSibling); }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(node => node !== this); this.parentNode = null; }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    matches(selector) {
      return selector.split(',').some(part => {
        let rest = part.trim();
        const tag = /^[a-z][\w-]*/i.exec(rest); if (tag) { if (this.tagName.toLowerCase() !== tag[0].toLowerCase()) return false; rest = rest.slice(tag[0].length); }
        for (const token of rest.matchAll(/([.#])([\w-]+)|\[([^\]=]+)(?:=["']?([^\]"']*)["']?)?\]/g)) {
          if (token[1] === '.' && !this.classList.contains(token[2])) return false;
          if (token[1] === '#' && this.id !== token[2]) return false;
          if (token[3] && (token[4] === undefined ? !this.hasAttribute(token[3]) : this.getAttribute(token[3]) !== token[4])) return false;
        }
        return !!part.trim();
      });
    }
    descendants() { return this.children.flatMap(node => [node, ...node.descendants()]); }
    querySelectorAll(selector) { return this.descendants().filter(node => selector.split(',').some(part => { const segments = part.trim().split(/\s+/); if (!node.matches(segments.pop())) return false; let at = node.parentNode; while (segments.length) { const segment = segments.pop(); while (at && !at.matches(segment)) at = at.parentNode; if (!at) return false; at = at.parentNode; } return true; })); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { for (let at = this; at; at = at.parentNode) if (at.matches(selector)) return at; return null; }
    addEventListener(type, fn, options) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push({fn, capture: options === true || !!options?.capture}); }
    emit(type, extra = {}) {
      const event = {type, target: this, defaultPrevented: false, stopped: false, immediate: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, stopImmediatePropagation() { this.stopped = this.immediate = true; }, ...extra};
      const route = []; for (let at = this; at; at = at.parentNode) route.push(at);
      for (const at of [...route].reverse()) { for (const listener of at.listeners.get(type) || []) if (listener.capture) { listener.fn(event); if (event.immediate) break; } if (event.stopped) return event; }
      for (const at of route) { at['on' + type]?.(event); if (!event.immediate) for (const listener of at.listeners.get(type) || []) if (!listener.capture) { listener.fn(event); if (event.immediate) break; } if (event.stopped) break; }
      return event;
    }
    click() { if (!this.disabled) return this.emit('click'); }
    focus() { document.activeElement = this; }
  }
  document = new Element('document'); document.documentElement = new Element('html'); document.body = new Element('body');
  document.append(document.documentElement); document.documentElement.append(document.body); document.readyState = ready;
  const root = document.documentElement; root.dataset.controlflowUi = controlflow ? '1' : '0'; root.dataset.cfStampMode = mode; root.dataset.tillsynoDevice = 'auto'; root.dataset.appVersion = '2.4.557';
  document.body.className = 'allInOneApp'; document.createElement = tag => new Element(tag);
  document.getElementById = id => document.descendants().find(node => node.id === id) || null;
  const add = (tag, parent = document.body, attrs = {}) => { const node = new Element(tag); for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value); parent.append(node); return node; };
  const makeGroup = () => { const group = add('span', document.body, {class: 'historyTextControls'}); add('button', group, {'data-app-text-smaller': ''}).textContent = 'A−'; add('button', group, {'data-app-text-larger': ''}).textContent = 'A+'; return group; };
  const initialGroups = Array.from({length: groups}, makeGroup);
  const dialog = chooser ? add('dialog', document.body, {id: 'allProtocolDialog'}) : null;
  if (dialog) { dialog.open = true; add('div', dialog, {class: 'allProtocolHead'}); }
  add('div', document.body, {class: 'allInOneProtocolTools'});
  const viewer = add('div', document.body, {id: 'secViewer'}); viewer.clientHeight = 600;
  const stage = add('div', viewer, {id: 'secStage'}); stage.style.setProperty('transform', 'scale(1.7) translate(12px, 9px)');
  const canvas = add('canvas', stage); canvas.width = 1200; canvas.height = 900;
  const domain = {items: [{uid: 'keep', x: .2, y: .7, page: 2, customerStampScale: 1.1}], project: {name: 'Keep'}, pdf: {numPages: 4}};
  const context = vm.createContext({document, console, localStorage: stored, sessionStorage: storage(), HTMLElement: Element,
    MutationObserver: class { constructor(fn) { this.fn = fn; observers.push(this); } observe(target, options) { this.target = target; this.options = options; } },
    ResizeObserver: class { observe() {} }, matchMedia: () => ({matches: true, addEventListener() {}}),
    requestAnimationFrame: fn => { pending.push(fn); return pending.length; }, queueMicrotask: fn => pending.push(fn),
    ...domain, save() { throw Error('Text controls must not save project data'); }, drawMarkers() { throw Error('Text controls must not redraw stamps'); },
    location: {href: 'capacitor://localhost/' + (mode === 'revision' ? 'controlflow-revision/' : '') + 'all-in-one.html'}
  });
  context.window = context; const windowEvents = new Map();
  context.addEventListener = (type, fn) => { if (!windowEvents.has(type)) windowEvents.set(type, []); windowEvents.get(type).push(fn); };
  vm.runInContext(source, context, {filename: 'controlflow-ui-scale.js'});
  const flush = () => { let budget = 20; while (pending.length && budget--) pending.shift()(); assert(budget >= 0, 'bounded UI refresh'); };
  flush();
  return {document, root, stored, context, api: context.AppTextScale, initialGroups, dialog, stage, canvas, domain, add, makeGroup,
    $: selector => document.querySelector(selector), all: selector => document.querySelectorAll(selector),
    observe() { for (const observer of observers) if (observer.options?.childList) observer.fn([{type: 'childList', target: document.body, addedNodes: [], removedNodes: []}]); flush(); },
    event(type, extra = {}) { for (const fn of windowEvents.get(type) || []) fn({type, ...extra}); flush(); },
    ready() { document.readyState = 'interactive'; document.emit('DOMContentLoaded'); flush(); },
    assertLevel(level) { assert.equal(context.AppTextScale.get(), level); assert.equal(root.style.getPropertyValue('--cf-text-scale'), String(FACTORS[level])); assert.equal(root.hasAttribute('data-cf-large-text'), level >= 3); assert.equal(document.body.dataset.appTextSize, String(level)); }
  };
}

for (const mode of ['security', 'revision']) {
  check(mode + ': legacy-only settings never enlarge the current workspace, even when writes fail', () => {
    for (const legacy of [-1, 0, 1, 2, 3]) for (const denyWrites of [false, true]) {
      const stored = storage({[LEGACY]: String(legacy)}, {denyWrites}), f = fixture({mode, stored}); f.assertLevel(0);
      assert.equal(stored.values.get(LEGACY), String(legacy)); assert(!stored.reads.includes(LEGACY), 'legacy setting is not read');
      assert(stored.writes.every(([key]) => key === KEY), 'only the modern UI key may be written');
    }
  });
  check(mode + ': all explicit current levels and the 136% layout threshold are preserved', () => {
    for (let level = 0; level <= 6; level++) {
      const f = fixture({mode, stored: storage({[KEY]: String(level), [LEGACY]: '3'})}); f.assertLevel(level);
      const reset = f.$('.historyTextControls [data-app-text-reset]'); assert(reset, 'history has a reset action');
      assert(reset.hasAttribute('data-app-text-level')); assert.equal(reset.textContent, Math.round(FACTORS[level] * 100) + '%');
      assert.equal(f.$('[data-app-text-smaller]').disabled, level === 0); assert.equal(f.$('[data-app-text-larger]').disabled, level === 6);
      const chooserReset = f.$('#allProtocolDialog .cfChooserTextReset'); assert(chooserReset, 'chooser has a reset action');
      assert.equal(chooserReset.hidden, level === 0); if (level > 0) assert.equal(chooserReset.textContent, 'Text ' + Math.round(FACTORS[level] * 100) + '% · Återställ');
    }
  });
  check(mode + ': captured A− crosses out of large layout and captured reset persists 100%', () => {
    const stored = storage({[KEY]: '3', [LEGACY]: '3'}), f = fixture({mode, stored});
    let staleHandler = 0; const smaller = f.$('[data-app-text-smaller]'); smaller.onclick = () => staleHandler++;
    const event = smaller.click(); assert.equal(event.defaultPrevented, true); assert.equal(staleHandler, 0); f.assertLevel(2); assert.equal(stored.values.get(KEY), '2');
    f.$('[data-app-text-larger]').click(); f.assertLevel(3);
    const reset = f.$('.historyTextControls [data-app-text-reset]'); reset.onclick = () => staleHandler++;
    const child = f.add('span', reset); child.click(); f.assertLevel(0); assert.equal(staleHandler, 0); assert.equal(stored.values.get(KEY), '0'); assert.equal(stored.values.get(LEGACY), '3');
    assert.equal(f.api.reset(), 0); f.assertLevel(0);
  });
  check(mode + ': chooser reset returns focus to its dialog and hides after reset', () => {
    const f = fixture({mode, stored: storage({[KEY]: '3'})}), reset = f.$('.cfChooserTextReset'); reset.focus(); reset.click();
    f.assertLevel(0); assert.equal(f.document.activeElement, f.dialog); assert.equal(reset.hidden, true); assert.equal(f.stored.values.get(KEY), '0');
  });
}

check('root and revision navigation use one persistent modern preference in both directions', () => {
  const stored = storage({[LEGACY]: '3'}); let root = fixture({stored}); root.assertLevel(0);
  root.$('[data-app-text-larger]').click(); const revision = fixture({mode: 'revision', stored}); revision.assertLevel(1);
  revision.api.set(3); root = fixture({stored}); root.assertLevel(3);
  root.$('.historyTextControls [data-app-text-reset]').click(); fixture({mode: 'revision', stored}).assertLevel(0); fixture({stored}).assertLevel(0);
  assert.equal(stored.values.get(LEGACY), '3'); assert.equal(stored.values.get(KEY), '0');
});
check('pageshow refreshes an existing page after back/forward navigation without rewriting storage', () => {
  const stored = storage({[KEY]: '3'}), f = fixture({stored}); const writes = stored.writes.length;
  stored.values.set(KEY, '0'); f.event('pageshow', {persisted: true}); f.assertLevel(0);
  assert.equal(f.$('.historyTextControls [data-app-text-reset]').textContent, '100%'); assert.equal(f.$('.cfChooserTextReset').hidden, true);
  stored.values.set(KEY, '5'); f.event('pageshow', {persisted: false}); f.assertLevel(5);
  assert.equal(stored.writes.length, writes, 'restoring a page only reads the setting');
});
check('storage event accepts only local modern-key changes or clear and ignores unrelated storage', () => {
  const stored = storage({[KEY]: '3'}), f = fixture({stored}); stored.values.set(KEY, '0');
  for (const event of [{key: LEGACY, storageArea: stored}, {key: 'project', storageArea: stored}, {key: KEY, storageArea: f.context.sessionStorage}, {key: null, storageArea: f.context.sessionStorage}, {key: KEY, storageArea: null}]) {
    const reads = stored.reads.length; f.event('storage', event); f.assertLevel(3); assert.equal(stored.reads.length, reads);
  }
  f.event('storage', {key: KEY, storageArea: stored, newValue: '6'}); f.assertLevel(0);
  stored.values.set(KEY, '2'); f.event('storage', {key: KEY, storageArea: stored}); f.assertLevel(2);
  stored.values.delete(KEY); stored.values.set(LEGACY, '3'); f.event('storage', {key: null, storageArea: stored}); f.assertLevel(0);
  assert(stored.writes.every(([key]) => key === KEY)); assert(!stored.reads.includes(LEGACY));
});
check('reset works immediately when persistence is unavailable and reload cannot reimport legacy size', () => {
  const stored = storage({[LEGACY]: '3'}, {denyWrites: true}), f = fixture({stored}); f.assertLevel(0);
  f.api.set(3); f.assertLevel(3); assert.equal(f.api.reset(), 0); f.assertLevel(0);
  fixture({mode: 'revision', stored}).assertLevel(0); assert.equal(stored.values.get(LEGACY), '3');
  fixture({stored: storage({}, {denyReads: true, denyWrites: true})}).assertLevel(0);
});
check('a failed reset write is not undone by pageshow or storage, and successful writes restore synchronization', () => {
  const stored = storage({[KEY]: '3'}), f = fixture({stored}), save = stored.setItem;
  stored.setItem = () => { throw Error('Quota exceeded'); };
  f.$('.historyTextControls [data-app-text-reset]').click(); f.assertLevel(0); assert.equal(stored.values.get(KEY), '3');
  f.event('pageshow', {persisted: true}); f.assertLevel(0);
  f.event('storage', {key: KEY, storageArea: stored}); f.assertLevel(0);
  stored.setItem = save; f.api.set(2); assert.equal(stored.values.get(KEY), '2');
  stored.values.set(KEY, '1'); f.event('pageshow'); f.assertLevel(1);
});
check('a later storage read failure preserves the current visible scale', () => {
  const stored = storage({[KEY]: '3'}), f = fixture({stored}); f.api.set(4); f.assertLevel(4);
  stored.getItem = () => { throw Error('Storage unavailable'); };
  f.event('pageshow', {persisted: true}); f.assertLevel(4);
  f.event('storage', {key: null, storageArea: stored}); f.assertLevel(4);
});
check('observer refreshes existing and late history controls without duplicate reset actions', () => {
  const f = fixture({groups: 2, stored: storage({[KEY]: '3'})}); const original = [...f.all('.historyTextControls [data-app-text-reset]')];
  assert.equal(original.length, 2); for (let i = 0; i < 5; i++) f.observe(); assert.deepEqual(f.all('.historyTextControls [data-app-text-reset]'), original);
  assert.equal(f.all('.cfChooserTextReset').length, 1);
  const late = f.makeGroup(); f.observe(); assert.equal(late.querySelectorAll('[data-app-text-reset]').length, 1); assert.equal(late.querySelector('[data-app-text-reset]').textContent, '136%');
  f.api.reset(); for (let i = 0; i < 5; i++) f.observe(); assert.equal(f.all('.historyTextControls [data-app-text-reset]').length, 3);
  assert(f.all('.historyTextControls [data-app-text-reset]').every(button => button.textContent === '100%')); assert.equal(f.all('.cfChooserTextReset').length, 1);
});
check('DOMContentLoaded setup and later observer refresh preserve a single chooser reset', () => {
  const f = fixture({ready: 'loading', stored: storage({[KEY]: '3'})}); f.ready(); f.observe();
  assert.equal(f.all('.cfChooserTextReset').length, 1); assert.equal(f.all('.historyTextControls [data-app-text-reset]').length, 1); f.assertLevel(3);
});
check('text updates leave drawing geometry, canvas dimensions and work data unchanged', () => {
  const f = fixture(), before = JSON.stringify(f.domain), transform = f.stage.style.getPropertyValue('transform');
  for (let level = 0; level <= 6; level++) f.api.set(level); f.api.reset(); f.event('pageshow'); f.observe();
  assert.equal(JSON.stringify(f.domain), before); assert.equal(f.stage.style.getPropertyValue('transform'), transform); assert.equal(f.canvas.width, 1200); assert.equal(f.canvas.height, 900);
  assert(f.stored.writes.every(([key]) => key === KEY), 'no project or legacy storage writes');
});
check('standalone pages do not install the controlflow scale controller', () => {
  const f = fixture({controlflow: false}); assert.equal(f.api, undefined); assert.equal(f.all('[data-app-text-reset]').length, 0); assert.equal(f.stored.reads.length, 0);
});
check('both actual entry pages load the same shared controller and omit the old panel scaler', () => {
  const references = ['all-in-one.html', 'controlflow-revision/all-in-one.html'].map(page => {
    const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]);
    const shared = scripts.filter(src => path.posix.basename(src.split('?')[0]) === 'controlflow-ui-scale.js');
    assert.equal(shared.length, 1, page); assert(!scripts.some(src => path.posix.basename(src.split('?')[0]) === 'ui-text-scale.js'), page + ' must not double-scale');
    assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(page), shared[0].split('?')[0])), 'controlflow-ui-scale.js'); return shared[0].split('?')[1];
  });
  assert.equal(references[0], references[1], 'root/revision cache version stays aligned');
});

let passed = 0;
for (const test of tests) { try { test.fn(); passed++; console.log('ok ' + passed + ' - ' + test.name); } catch (error) { console.error('FAIL: ' + test.name); throw error; } }
console.log('Controlflow text parity v557: ' + passed + ' scenarios passed. CSS rendering requires browser/device verification.');
