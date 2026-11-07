'use strict';
/*
 * Integration coverage for the real core functions, without a browser or server.
 * Run with NODE_PATH pointing to the runtime's existing pdf-lib installation.
 *
 * The production createItem, drawMarkers, buildSecurityDrawingPdf, exportPdf and
 * inspectSecurityWorkPdf functions are read from each core file and run in a VM.
 * Only PDF.js's orthogonal viewport transform, DOM/file-download facilities and
 * the unrelated protocol-page renderer are fixtures. PDF composition, links,
 * compressed work state, embedded source bytes and reopening use real PDFLib.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const PDFLib = require('pdf-lib');
const Style = require('../controlflow-stamp-style-v549.js');
let checks = 0;
const plain = value => JSON.parse(JSON.stringify(value));
function equal(actual, expected, message) { assert.deepEqual(plain(actual), plain(expected), message); checks++; }
function ok(value, message) { assert.ok(value, message); checks++; }
function near(actual, expected, message) { assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} vs ${expected}`); checks++; }
function nearPoint(actual, expected, message) { near(actual.x, expected.x, message + ' x'); near(actual.y, expected.y, message + ' y'); }

// The first syntactically complete function avoids brittle line-number slicing
// and handles the default arguments and nested template strings in these files.
function functionSource(source, name) {
 const match = new RegExp('^(?:async )?function ' + name + '\\(', 'm').exec(source);
 assert.ok(match, 'Production function exists: ' + name);
 for (let end = source.indexOf('}', match.index); end >= 0; end = source.indexOf('}', end + 1)) {
  const candidate = source.slice(match.index, end + 1);
  try { new vm.Script('(' + candidate + ')'); return candidate; } catch (_) { /* Continue to the matching close brace. */ }
 }
 throw new Error('Could not read production function: ' + name);
}

class Element {
 constructor(ownerDocument, tagName = 'div') {
  this.ownerDocument = ownerDocument; this.tagName = tagName; this.children = []; this.parentNode = null;
  this.dataset = {}; this.attributes = {}; this.properties = {}; this.textContent = ''; this.classes = new Set();
  this.isConnected = true; this.clientHeight = 700; this.scrollLeft = 0; this.scrollTop = 0; this.offsetLeft = 0;
  this.style = {setProperty:(key, value) => {this.properties[key] = String(value);}};
  this.classList = {add:(...values) => values.forEach(value => this.classes.add(value)),
   remove:(...values) => values.forEach(value => this.classes.delete(value)), contains:value => this.classes.has(value),
   toggle:(value, force) => {const active = force === undefined ? !this.classes.has(value) : force; if (active) this.classes.add(value); else this.classes.delete(value); return active;}};
 }
 set className(value) { this.classes = new Set(String(value).split(/\s+/)); }
 get className() { return Array.from(this.classes).join(' '); }
 setAttribute(key, value) {
  this.attributes[key] = String(value);
  if (key === 'class') this.className = value;
  if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
 }
 getAttribute(key) { return this.attributes[key] ?? null; }
 appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
 append(...children) { children.forEach(child => this.appendChild(child)); }
 replaceChildren(...children) { this.children.forEach(child => {child.isConnected = false;}); this.children = []; this.append(...children); }
 remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.isConnected = false; }
 querySelectorAll(selector) {
  const result = [], match = node => {
   if (selector.startsWith('.')) return node.classes.has(selector.slice(1));
   const attribute = /^\[([^=]+)="([^"]+)"\]$/.exec(selector);
   return attribute ? node.getAttribute(attribute[1]) === attribute[2] : node.tagName === selector;
  };
  const visit = node => node.children.forEach(child => {if (match(child)) result.push(child); visit(child);}); visit(this); return result;
 }
 querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
 getBoundingClientRect() { return {left:0, top:0, width:this.rectWidth || 600, height:this.rectHeight || 800}; }
 setPointerCapture() {}
 click() { this.ownerDocument.downloads.push({href:this.href, name:this.download}); }
}
class Document {
 constructor() { this.downloads = []; this.elements = new Map(); this.body = new Element(this, 'body'); }
 createElement(tag) { return new Element(this, tag); }
 createElementNS(namespace, tag) { return new Element(this, tag); }
 getElementById(id) { if (!this.elements.has(id)) this.elements.set(id, new Element(this)); return this.elements.get(id); }
}

// PDF.js PageViewport for the crop-free pages in the fixture. These transforms
// include the PDF y-axis inversion and original /Rotate value, not UI zoom.
function viewport(width, height, rotation, scale = 1) {
 const angle = (rotation % 360 + 360) % 360, side = angle % 180 !== 0;
 const toView = (x, y) => {
  switch (angle) { case 90:return [y * scale, x * scale]; case 180:return [(width - x) * scale, y * scale]; case 270:return [(height - y) * scale, (width - x) * scale]; default:return [x * scale, (height - y) * scale]; }
 };
 const toPdf = (x, y) => {
  x /= scale; y /= scale;
  switch (angle) { case 90:return [y, x]; case 180:return [width - x, y]; case 270:return [width - y, height - x]; default:return [x, height - y]; }
 };
 return {width:(side ? height : width) * scale, height:(side ? width : height) * scale, rotation:angle, scale,
  convertToPdfPoint:toPdf, convertToViewportPoint:toView};
}
function pdfjsStub(sourceDocument) {
 const pages = sourceDocument.getPages();
 return {numPages:pages.length, async getPage(number) {
  const page = pages[number - 1], {width, height} = page.getSize(), rotate = page.getRotation().angle;
  return {rotate, getViewport:({scale = 1, rotation = rotate}) => viewport(width, height, rotation, scale)};
 }};
}

async function sourceFixture() {
 const document = await PDFLib.PDFDocument.create();
 const font = await document.embedFont(PDFLib.StandardFonts.Helvetica);
 for (let index = 0; index < 8; index++) {
  const page = document.addPage(index === 0 ? [842, 1191] : index % 2 ? [420, 595] : [600, 800]);
  page.setRotation(PDFLib.degrees(index % 4 * 90));
  page.drawText('Original drawing ' + (index + 1), {x:31, y:42, size:11, font});
  page.drawLine({start:{x:30, y:60}, end:{x:160, y:97}, thickness:.7, color:PDFLib.rgb(.2, .3, .4)});
 }
 document.setTitle('Original source fixture');
 return document.save();
}
async function protocolFixture() {
 const document = await PDFLib.PDFDocument.create();
 document.addPage([595.28, 841.89]).drawText('Protocol fixture', {x:40, y:780, size:12});
 return document.save();
}
function itemFixture(index, mode) {
 const types = mode === 'security' ? ['lock', 'alarm', 'access', 'detector', 'automation', 'automation_selfcheck', 'lock_revision'] : ['automation', 'automation_selfcheck', 'lock_revision', 'lock', 'alarm', 'access', 'detector'];
 return {uid:mode + '-' + (index + 1), type:types[index % types.length], page:index + 1, number:index + 1,
  id:index % 2 ? 'BYGGNAD-ÅÄÖ-1044-24-' + (index + 1) : 'D' + (index + 1), serialNumber:String(index + 1),
  x:.22 + index * .013, y:.72, labelX:.61, labelY:.25 + index * .01,
  status:'untested', checks:{'1.1':{result:'', note:'Sparat anmärkningsutkast åäö'}}, notes:'', customChecks:[],
  positionLocked:index % 2 === 0, ...(index === 2 ? {} : {customerStampScale:index === 0 ? .25 : index === 1 ? .7 : 1.25, customerArrowScale:index === 0 ? .5 : index === 1 ? 2 : 1.5})};
}

async function harness(mode, originalBytes, reportBytes) {
 const filename = mode === 'security' ? 'security.js' : 'controlflow-revision/security-v335.js';
 const source = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
 const document = new Document(), pdf = pdfjsStub(await PDFLib.PDFDocument.load(originalBytes)), records = [], messages = [];
 const blobs = new Map();
 const items = Array.from({length:8}, (_, index) => itemFixture(index, mode));
 const project = {projectName:'Rotation och storlek', sourceFileName:'original-ritning.pdf', date:'2026-11-01',
  controlflowStampDefaults:{version:1, stampScale:1.25, arrowScale:1.5}};
 const systems = Object.fromEntries(['lock', 'alarm', 'access', 'detector', 'automation', 'automation_selfcheck', 'lock_revision']
  .map(type => [type, {label:type === 'detector' ? 'Detektor' : type === 'lock_revision' ? 'Låsrevision' : 'Objekt', checks:[]} ]));
 const state = {
  PDFLib, Uint8Array, ArrayBuffer, TextEncoder, TextDecoder, Blob, structuredClone, crypto,
  console:{error:error => {messages.push({error});}, warn:() => {}},
  document, pdf, sourceBytes:originalBytes, items, project, textNotes:[], drawingExtras:[], logoData:'data:image/png;base64,fixture',
  drawingRotations:mode === 'security' ? {5:90, 6:90, 7:90, 8:90} : {},
  page:1, pageWidth:600, pageHeight:800, zoom:1, baseScale:.7, selected:null, addType:null, hiddenDrawingProtocols:new Set(),
  ALL_IN_ONE:true, APP_WORK_KEY:'DoorserviceAllInOneWork',
  APP_STATE_NAME:'doorservice-all-in-one', APP_LABEL:'Allt-i-ett',
  SYSTEMS:systems, COLORS:{ok:[35,131,84], action:[199,124,19], fail:[189,63,70], untested:[119,133,142]},
  markers:document.getElementById('secMarkers'), viewer:document.getElementById('secViewer'), canvas:document.getElementById('secCanvas'),
  $:id => document.getElementById(id),
  // These services do not participate in this callout/state regression.
  ServiceDrawingTools:{drawToPdf() {}}, normalize:item => item, allInOneProtocolActive:() => true,
  nextNumber:type => Math.max(0, ...state.items.filter(item => item.type === type).map(item => item.number)) + 1,
  nextAutomationSerial:() => String(Math.max(0, ...state.items.map(item => Number(item.serialNumber) || 0)) + 1),
  applyAutomationId() {}, save() {}, showSelected() {}, go() {}, refreshTop() {},
  msg:(text, error) => messages.push({text, error:!!error}),
  setTimeout() {}, URL:{createObjectURL:blob => {const url = 'blob:fixture-' + blobs.size; blobs.set(url, blob); return url;}, revokeObjectURL() {}},
  reportDoc:() => ({__protocolPages:Object.fromEntries(state.items.map(item => [item.uid, 1])),
   __backLinks:[{pageNo:1, drawingPage:1, rect:[12, 20, 40, 8]}],
   output:kind => {assert.equal(kind, 'arraybuffer'); return reportBytes.buffer.slice(reportBytes.byteOffset, reportBytes.byteOffset + reportBytes.byteLength);}})
 };
 state.window = {PDFLib, ControlflowStampStyle:{...Style, drawPdf:(page, item, options) => {
  const result = Style.drawPdf(page, item, options); if (result) records.push({item, options, result}); return result;
 }}};
 const context = vm.createContext(state);
 const names = ['hasSecurityRecordedProblem', 'isSecurityRemediated', 'statusOf', 'isDoorAutomationItem', 'securityDrawingLabel',
  'securityDrawingMarkerLabel', 'securityCustomerStampScale', 'securityCustomerArrowScale', 'securityPdfName',
  'createItem', 'drawMarkers', 'buildSecurityDrawingPdf', 'exportPdf', 'inspectSecurityWorkPdf'];
 if (mode === 'security') names.push('drawingRotation', 'rotateDrawingPoint', 'positionDrawingNode', 'positionDrawingLine',
  'validDrawingRotations', 'projectDrawingExtras', 'securityHasDetectorBox', 'securityUsesArrow', 'securityPdfViewPage');
 else names.push('applySecurityDrawingGeometry');
 vm.runInContext(names.map(name => functionSource(source, name)).join('\n'), context, {filename});
 return {state, context, document, records, messages, blobs, mode};
}

function svgPoint(line, end) { return {x:Number(line.getAttribute('x' + end)), y:Number(line.getAttribute('y' + end))}; }
function toView(view, point) { const [x, y] = view.convertToViewportPoint(point.x, point.y); return {x, y}; }
function screenRecord(h, record, view, scale) {
 const button = h.state.markers.querySelectorAll('.secMarker').find(node => (node.dataset.objectUid || node.dataset.securityStampUid) === record.item.uid);
 ok(button, h.mode + ': real drawMarkers keeps an interactive label');
 ok(typeof button.onpointerdown === 'function', h.mode + ': original label drag handler remains');
 const badge = button.querySelector('.cfStampBadge');
 ok(badge, h.mode + ': real drawMarkers invokes the physical renderer');
 near(parseFloat(badge.properties.width) / scale, record.result.metrics.boxW + record.result.metrics.border, h.mode + ': drawing/PDF box width');
 near(parseFloat(badge.properties.height) / scale, record.result.metrics.boxH + record.result.metrics.border, h.mode + ': drawing/PDF box height');
 const center = {x:parseFloat(button.style.left) / 100 * view.width, y:parseFloat(button.style.top) / 100 * view.height};
 nearPoint(center, toView(view, {x:record.result.geometry.lx, y:record.result.geometry.ly}), h.mode + ': drawing/PDF center');
 const rect = record.result.stampRect;
 near(rect.width * view.width, record.result.metrics.boxW, h.mode + ': Kundmall box width');
 near(rect.height * view.height, record.result.metrics.boxH, h.mode + ': Kundmall box height');
 nearPoint({x:rect.x * view.width, y:rect.y * view.height}, center, h.mode + ': Kundmall center');
 const group = h.state.markers.querySelector('.cfStampGeometry').querySelectorAll('g').find(node => node.getAttribute('data-object-uid') === record.item.uid);
 const lines = group.querySelectorAll('line'), geometry = record.result.geometry;
 equal(lines.length, 1, h.mode + ': one uniform arrow shaft');
 nearPoint(svgPoint(lines[0], 1), toView(view, geometry.start), h.mode + ': leader start');
 nearPoint(svgPoint(lines[0], 2), toView(view, geometry.end), h.mode + ': leader end');
 const head = group.querySelector('polygon'), vertices = head.getAttribute('points').split(' ').map(pair => {const [x,y] = pair.split(',').map(Number);return {x,y};});
 // A PDF-to-screen transform reflects the y-axis, exchanging the base corners.
 nearPoint(vertices[0], toView(view, {x:geometry.x, y:geometry.y}), h.mode + ': filled arrow anchor');
 nearPoint(vertices[1], toView(view, geometry.headB), h.mode + ': first arrow base corner');
 nearPoint(vertices[2], toView(view, geometry.headA), h.mode + ': second arrow base corner');
 near(Number(lines[0].getAttribute('stroke-width')), record.result.metrics.stroke, h.mode + ': uniform shaft matches PDF');
 equal(head.getAttribute('fill'), lines[0].getAttribute('stroke'), h.mode + ': solid head and shaft use the same status color');
 equal(group.querySelectorAll('circle').length, 0, h.mode + ': no permanent circle obscures the tip');
 const text = badge.querySelector('text');
 near(Number(text.getAttribute('font-size')), record.result.metrics.size, h.mode + ': exact PDF font size, including25%');
 near(Number(text.getAttribute('textLength')), record.result.metrics.textWidth, h.mode + ': exact PDF font width');
 nearPoint({x:center.x + Number(text.getAttribute('x')), y:center.y + Number(text.getAttribute('y'))}, toView(view, geometry.text), h.mode + ': text baseline');
}

async function checkMode(mode, originalBytes, reportBytes) {
 const h = await harness(mode, originalBytes, reportBytes), {state} = h;
 await Style.prepare(PDFLib);
 const before = plain({items:state.items, project:state.project, drawingRotations:state.drawingRotations});
 const built = await state.buildSecurityDrawingPdf();
 equal(built.out.getPageCount(), 8, mode + ': real drawing builder retains all source pages');
 equal(h.records.length, state.items.length, mode + ': every eligible callout uses the shared model');
 const records = h.records.slice(), geometryBefore = plain(records.map(record => record.result));
 for (const record of records) {
  const p = await state.pdf.getPage(record.item.page), viewRotation = state.drawingRotations[record.item.page] || 0;
  const view = p.getViewport({scale:1, rotation:(p.rotate + viewRotation) % 360});
  equal(built.out.getPage(record.item.page - 1).getRotation().angle, view.rotation, mode + ': output page rotation');
  state.page = record.item.page;
  for (const zoom of [.5, 1, 2.4, 8]) {
   state.zoom = zoom; const scale = state.baseScale * zoom;
   state.pageWidth = view.width * scale; state.pageHeight = view.height * scale;
   if (zoom === .5 || mode === 'security') state.drawMarkers();
   else state.applySecurityDrawingGeometry(state.pageWidth, state.pageHeight);
   screenRecord(h, record, view, scale);
  }
 }
 equal({items:state.items, project:state.project, drawingRotations:state.drawingRotations}, before, mode + ': all zooms leave persisted state unchanged');
 h.records.length = 0; await state.buildSecurityDrawingPdf();
 equal(h.records.map(record => record.result), geometryBefore, mode + ': real PDF geometry does not depend on workspace zoom');

 const drawingBytes = await built.out.save();
 const drawingOnly = await PDFLib.PDFDocument.load(drawingBytes);
 equal(drawingOnly.getPages().map(page => page.getRotation().angle), built.out.getPages().map(page => page.getRotation().angle), mode + ': rotations survive actual PDF serialization');
 equal(await state.inspectSecurityWorkPdf(drawingBytes), null, mode + ': a drawing-only PDF is not mistaken for an editable work file');

 await state.exportPdf('work', 'roundtrip-' + mode + '.pdf');
 const errors = h.messages.filter(message => message.error);
 equal(errors.map(entry => entry.error instanceof Error ? entry.error.message : entry.text), [], mode + ': export completes without swallowed errors');
 equal(h.document.downloads.length, 1, mode + ': real export invokes one PDF download');
 const download = h.document.downloads[0];
 equal(download.name, 'roundtrip-' + mode + '.pdf', mode + ': requested PDF filename');
 const exportedBytes = new Uint8Array(await h.blobs.get(download.href).arrayBuffer());
 const exported = await PDFLib.PDFDocument.load(exportedBytes), reopened = await state.inspectSecurityWorkPdf(exportedBytes);
 ok(reopened, mode + ': real inspector recognizes its exported PDF');
 equal(exported.getPageCount(), 9, mode + ': drawing and real PDF protocol fixture are combined');
 ok(Buffer.from(reopened.drawingBytes).equals(Buffer.from(originalBytes)), mode + ': original drawing bytes are preserved exactly');
 equal(reopened.work.items, before.items, mode + ': coordinates, per-item styles, locks and remark drafts survive PDF roundtrip');
 equal(reopened.work.project, before.project, mode + ': project size default survives PDF roundtrip');
 equal(reopened.work.logoData, state.logoData, mode + ': existing work metadata stays intact');
 if (mode === 'security') equal(reopened.work.drawingRotations, before.drawingRotations, 'Security: extra view rotation survives PDF roundtrip');
 for (const item of reopened.work.items) {
  equal(item.checks['1.1'], {result:'', note:'Sparat anmärkningsutkast åäö'}, mode + ': unselected remark keeps its draft');
  equal(state.statusOf(item), 'untested', mode + ': a saved draft does not mark an object as failed');
 }
 const reopenedOriginal = await PDFLib.PDFDocument.load(reopened.drawingBytes);
 equal(reopenedOriginal.getPages().map(page => page.getRotation().angle), [0,90,180,270,0,90,180,270], mode + ': embedded source retains original rotations');
 equal(exported.getPages().slice(0,8).map(page => page.getRotation().angle), built.out.getPages().map(page => page.getRotation().angle), mode + ': export retains rendered rotations');
 for (const page of exported.getPages()) {
  const annotations = page.node.lookup(PDFLib.PDFName.of('Annots'), PDFLib.PDFArray);
  ok(annotations && annotations.size() > 0, mode + ': real export writes drawing/protocol navigation links');
 }

 // Reopen into the core state and use the real creation entry point. This checks
 // the integration hook, rather than just calling inherit() in the unit suite.
 state.items = reopened.work.items; state.project = reopened.work.project;
 state.drawingRotations = reopened.work.drawingRotations || {}; state.page = 1;
 const oldItems = plain(state.items), count = state.items.length;
 state.createItem(mode === 'security' ? 'lock' : 'automation', .43, .57);
 equal(state.items.length, count + 1, mode + ': core creation adds one object after reopening');
 const newItem = state.items[state.items.length - 1];
 equal([newItem.customerStampScale, newItem.customerArrowScale], [1.25, 1.5], mode + ': core creation inherits the reopened chosen style');
 equal(state.items.slice(0,-1), oldItems, mode + ': creating another object leaves legacy and individual styles untouched');
 // Use the real A3 source page and real createItem hook with no project override.
 state.project = {}; Style.rememberPageSize(state.pdf,1,await state.pdf.getPage(1));
 const beforeAutomatic = plain(state.items);state.createItem(mode === 'security' ? 'lock' : 'automation',.35,.65);
 const automatic = state.items.at(-1);
 equal([automatic.customerStampScale,automatic.customerArrowScale],[.5,1],mode + ': real createItem uses50%/Normal on physical A3');
 equal(state.items.slice(0,-1),beforeAutomatic,mode + ': automatic default never changes pre-existing objects');
 h.records.length=0;await state.buildSecurityDrawingPdf();
 const automaticPdf=h.records.find(record=>record.item.uid===automatic.uid);
 equal([automaticPdf.result.metrics.stampScale,automaticPdf.result.metrics.arrowScale],[.5,1],mode + ': new A3 style reaches the real PDF builder');
 return checks;
}

(async () => {
 const [original, report] = await Promise.all([sourceFixture(), protocolFixture()]);
 // Known corners test the viewport fixture independently of renderer geometry.
 for (const angle of [0,90,180,270]) {
  const view = viewport(600,800,angle);
  for (const point of [[0,0],[600,800],[110,370]]) equal(view.convertToPdfPoint(...view.convertToViewportPoint(...point)), point, 'viewport fixture invertible at ' + angle);
 }
 equal(viewport(600,800,90).convertToViewportPoint(110,370), [370,110], '90-degree PDF viewport orientation');
 equal(viewport(600,800,270).convertToViewportPoint(110,370), [430,490], '270-degree PDF viewport orientation');
 await checkMode('security', original, report);
 await checkMode('revision', original, report);
 console.log('controlflow-pdf-roundtrip-v549: ' + checks + ' assertions passed (real core / PDFLib, eight rotated pages per mode).');
})().catch(error => {console.error(error); process.exitCode = 1;});
