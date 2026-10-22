'use strict';
// Real PDF.js rendering against a small DOM adapter and native canvas. No login,
// browser storage, user documents or network are involved in these tests.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const native = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/@napi-rs/canvas');
global.DOMMatrix = native.DOMMatrix; global.Path2D = native.Path2D;
const pdfjs = require('../vendor/pdf.min.js');
const {PDFDocument, rgb, degrees} = require('../vendor/pdf-lib.min.js');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

class Element extends EventTarget {
  constructor(tag = 'div') {
    super(); this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {};
    this.style = {setProperty(key, value) { this[key] = value; }};
    this.className = ''; this._left = 0; this._top = 0;
    this.classList = {add: name => this.className += ' ' + name};
    if (tag === 'canvas') this.surface = native.createCanvas(1, 1);
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parent = this; this.children.push(node); } }
  replaceChildren(...nodes) { for (const node of this.children) node.parent = null; this.children = []; this.append(...nodes); }
  insertBefore(node, before) { node.remove(); node.parent = this; this.children.splice(this.children.indexOf(before), 0, node); }
  replaceWith(node) { if (!this.parent) return; const p = this.parent, i = p.children.indexOf(this); node.remove(); p.children[i] = node; node.parent = p; this.parent = null; }
  remove() { if (this.parent) { const p = this.parent; p.children.splice(p.children.indexOf(this), 1); this.parent = null; } }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  querySelectorAll() { return []; }
  focus() {}
  get width() { return this.surface.width; }
  set width(value) { this.surface.width = value; }
  get height() { return this.surface.height; }
  set height(value) { this.surface.height = value; }
  getContext(type) { return this.surface.getContext(type); }
  dimension(key) { const v = this.style[key]; return v ? parseFloat(v) * (v.endsWith('%') ? (this.parent?.[key === 'width' ? 'clientWidth' : 'clientHeight'] || 0) / 100 : 1) : this.parent?.[key === 'width' ? 'clientWidth' : 'clientHeight'] || 0; }
  get clientWidth() { return this.dimension('width'); }
  get clientHeight() { return this.dimension('height'); }
  get scrollLeft() { return this._left; }
  set scrollLeft(v) { this.scroll('_left', v, 'clientWidth'); }
  get scrollTop() { return this._top; }
  set scrollTop(v) { this.scroll('_top', v, 'clientHeight'); }
  scroll(key, v, size) { const next = Math.max(0, Math.min(v, (this.children[0]?.[size] || this[size]) - this[size])); if (next !== this[key]) { this[key] = next; queueMicrotask(() => this.dispatchEvent(new Event('scroll'))); } }
  getBoundingClientRect() {
    const p = this.parent?.getBoundingClientRect() || {left:0, top:0};
    const value = (key, size) => { const s = this.style[key] || '0'; return parseFloat(s) * (s.endsWith('%') ? this.parent[size]/100 : 1); };
    const left = p.left + value('left','clientWidth') - (this.parent?.scrollLeft || 0), top = p.top + value('top','clientHeight') - (this.parent?.scrollTop || 0);
    return {left, top, width:this.clientWidth, height:this.clientHeight, right:left+this.clientWidth, bottom:top+this.clientHeight};
  }
}
const walk = node => [node, ...node.children.flatMap(walk)];
function harness(density = 2, width = 820, height = 620) {
  const document = new Element('document'); document.head = new Element('head'); document.baseURI = 'file://' + root + '/';
  document.createElement = tag => new Element(tag); document.createElementNS = (_, tag) => new Element(tag);
  document.getElementById = id => walk(document.head).find(n => n.id === id);
  const host = new Element(); host.style.width = width+'px'; host.style.height = height+'px';
  const window = new EventTarget(); window.devicePixelRatio = density; window.navigator = {}; window.getSelection = () => null;
  const errors = [], calls = [];
  window.pdfjsLib = {GlobalWorkerOptions:{}, getDocument(args) {
    pdfjs.GlobalWorkerOptions.workerSrc = path.join(root, 'vendor/pdf.worker.min.js');
    const loading = pdfjs.getDocument(args);
    return {promise:loading.promise.then(pdf => {
      const original = pdf.getPage.bind(pdf), wrapped = new WeakSet();
      pdf.getPage = async n => {
        const page = await original(n);
        if (!wrapped.has(page)) {
          wrapped.add(page); const render = page.render.bind(page);
          page.render = args => { calls.push({page:n, scale:args.viewport.scale, transform:args.transform, width:args.canvasContext.canvas.width, height:args.canvasContext.canvas.height}); return render(args); };
        }
        return page;
      };
      return pdf;
    })};
  }};
  const context = vm.createContext({window, document, HTMLElement:Element, AbortController, URL, Uint8Array, setTimeout, clearTimeout, performance, ResizeObserver:class {observe() {} disconnect() {}}, requestAnimationFrame:callback => setTimeout(callback, 0), cancelAnimationFrame:clearTimeout});
  vm.runInContext(fs.readFileSync(path.join(root,'smartmatch-projektering-v2-14-canvas.js'),'utf8'), context);
  const viewer = window.Proj2Canvas.create({host, onError:error => errors.push(error.message)});
  const get = cls => walk(host).find(node => node.className.split(' ').includes(cls));
  return {host, window, viewer, calls, errors, get, limit:window.Proj2Canvas.MAX_PIXELS};
}
async function idle(h) { await pause(0); for (let i=0;i<200;i++) { if (!h.viewer.snapshot().rendering) return; await pause(10); } throw Error('Viewer did not settle'); }
function centerOn(h, x, y) {
  const s = h.viewer.snapshot(), scroller = h.get('p2-canvas-scroller');
  scroller.scrollLeft = s.board.left + x*s.board.width - scroller.clientWidth/2;
  scroller.scrollTop = s.board.top + y*s.board.height - scroller.clientHeight/2;
}
function colorAt(h, x, y) {
  const sheet = h.get('p2-canvas-page'), canvas = h.get('p2-canvas-detail') || sheet.children[0];
  const s = sheet.getBoundingClientRect(), c = canvas === sheet.children[0] ? s : canvas.getBoundingClientRect();
  const px = Math.floor((s.left+x*s.width-c.left)*canvas.width/c.width), py = Math.floor((s.top+y*s.height-c.top)*canvas.height/c.height);
  assert(px>=0 && py>=0 && px<canvas.width && py<canvas.height, 'PDF point is inside the visible raster');
  return [...canvas.getContext('2d').getImageData(px, py, 1, 1).data].slice(0,3);
}
function assertBudget(h) { for(const call of h.calls) { assert(call.width*call.height<=h.limit, 'bounded bitmap area'); assert(call.width<=8192&&call.height<=8192, 'bounded bitmap sides'); } }

(async () => {
  const doc = await PDFDocument.create(), W = 3370, H = 2384;
  const first = doc.addPage([W,H]);
  // 0.25pt bars are below one overview pixel but become distinct at 1600%.
  for(let i=0;i<8;i++) first.drawRectangle({x:W/2+i*.5, y:H/2-10, width:.25, height:20, color:rgb(0,0,0)});
  first.drawRectangle({x:W*.7-10,y:H*.3-10,width:20,height:20,color:rgb(1,0,0)});
  const second = doc.addPage([W,H]); second.setCropBox(100,200,3000,1800); second.setRotation(degrees(90));
  second.drawRectangle({x:1590,y:1090,width:20,height:20,color:rgb(0,0,1)});
  const bytes = new Uint8Array(await doc.save()), original = Buffer.from(bytes);
  const h = harness();
  try {
    const metadata = await h.viewer.open(bytes); await idle(h);
    assert.deepEqual(Buffer.from(bytes), original, 'original PDF bytes preserved');
    h.viewer.zoomTo(16); await idle(h); centerOn(h,.5,.5); await idle(h);
    const detail = h.get('p2-canvas-detail'); assert(detail, 'high zoom has a fresh PDF crop');
    const rect = detail.getBoundingClientRect(); assert(Math.abs(detail.width/rect.width-2)<.001, 'retina density at 1600%');
    for(let i=0;i<8;i++) {
      assert.deepEqual(colorAt(h,(W/2+i*.5+.125)/W,.5),[0,0,0], 'thin vector line stays black');
      assert.deepEqual(colorAt(h,(W/2+i*.5+.375)/W,.5),[255,255,255], 'gap between lines stays white');
    }
    const base = h.get('p2-canvas-page').children[0], fullRenders = h.calls.filter(c=>!c.transform).length;
    centerOn(h,.7,.7); await idle(h);
    assert.deepEqual(colorAt(h,.7,.7),[255,0,0], 'pan follows the original PDF coordinates');
    assert.equal(h.get('p2-canvas-page').children[0],base,'pan reuses overview');
    assert.equal(h.calls.filter(c=>!c.transform).length,fullRenders,'pan only rerenders the crop');
    assert.equal(detail.width,1,'replaced detail releases its pixels');
    const placed = {preferences:{},stencils:{GS1:{kind:'card',shape:'oval'}},placements:[{id:'A',page:1,code:'GS1',stencilId:'GS1',x:.7,y:.7,width:64,height:28,rotation:0}]};
    const saved = JSON.stringify(placed); h.viewer.setProject(placed);
    assert(h.get('p2-canvas-overlay').innerHTML.includes('translate(2359 1668.8)'), 'SVG stays in PDF coordinates');
    assert.equal(JSON.stringify(placed),saved,'rendering does not mutate stamp data');

    // A queued render from page one cannot land on the rotated second page.
    const pdf = h.viewer.getSearchDocument(), getPage = pdf.getPage; let release;
    pdf.getPage = n => n===1 ? new Promise(resolve => {release=()=>getPage(n).then(resolve);}) : getPage(n);
    h.viewer.zoomTo(8); while(!release) await pause(10);
    await h.viewer.page(2); release(); pdf.getPage=getPage; await idle(h); await pause(30);
    centerOn(h,.5,.5); await idle(h);
    assert.deepEqual([metadata.pages[1].width,metadata.pages[1].height],[1800,3000]);
    assert.deepEqual(colorAt(h,.5,.5),[0,0,255], 'rotated/cropped page renders at its correct center');
    h.viewer.zoomTo(16); h.viewer.zoomTo(3); h.viewer.zoomTo(12); await idle(h);
    assert.equal(h.calls.at(-1).scale,24,'only the latest queued zoom is rendered');
    h.window.devicePixelRatio=3; h.window.dispatchEvent(new Event('resize')); await idle(h);
    const retina = h.get('p2-canvas-detail'); assert(Math.abs(retina.width/retina.getBoundingClientRect().width-3)<.001,'DPR change refreshes detail');
    assertBudget(h);
    h.viewer.fit(); await idle(h); assert.equal(h.get('p2-canvas-detail'),undefined,'fit returns to the sharp overview');
    assert.equal(retina.width,1,'fit releases the detail pixels');
    await h.viewer.open(new Uint8Array()); assert.equal(base.width,1,'closing releases the overview');
    assert.equal(h.get('p2-canvas-detail'),undefined);
    assert.deepEqual(h.errors,[]);
  } finally { h.viewer.destroy(); }

  const phone = harness(3,390,600);
  try { await phone.viewer.open(bytes); phone.viewer.zoomTo(16); await idle(phone); assertBudget(phone); const detail=phone.get('p2-canvas-detail'); assert(detail.width/detail.getBoundingClientRect().width>2.99,'phone keeps 3x screen density'); phone.viewer.zoomTo(8); phone.viewer.destroy(); await pause(150); assert.equal(phone.host.children.length,0,'destroy cancels queued work'); assert.equal(detail.width,1); } finally { phone.viewer.destroy(); }
  for(const name of ['smartmatch-projektering.html','smartmatch-projektering-v2-14.html','smartmatch-projektering-v2-15.html']) assert(fs.readFileSync(path.join(root,name),'utf8').includes('smartmatch-projektering-v2-14-canvas.js?v=2.14.1'),name+' uses the fixed renderer');
  console.log('PASS: real PDF raster pixels at 1600%, Retina/phone density, pan, rotated CropBox, stale page/zoom races, memory bounds, cleanup, original bytes and stamp coordinates.');
})().catch(error => { console.error(error); process.exitCode=1; });
