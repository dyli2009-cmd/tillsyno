'use strict';
/*
 * Executes the production return-button, export and preview-navigation functions.
 * PDFLib and PDF.js are real; only DOM/downloads and unrelated report contents
 * are fixtures. Native rotation and offset CropBox are read by PDF.js itself.
 * Optional --fixtures DIR writes two neutral, reopenable three-drawing-page PDFs.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const PDFLib = require('pdf-lib');
const plain = value => JSON.parse(JSON.stringify(value));
let checks = 0, pdfjs;
function equal(actual, expected, message) { assert.deepEqual(plain(actual), plain(expected), message); checks++; }
function ok(value, message) { assert.ok(value, message); checks++; }
function near(actual, expected, message) { assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} vs ${expected}`); checks++; }
function functionSource(source, name) {
 const match = new RegExp('^[ \\t]*(?:async )?function ' + name + '\\(', 'm').exec(source);
 assert.ok(match, 'Production function exists: ' + name);
 for (let end = source.indexOf('}', match.index); end >= 0; end = source.indexOf('}', end + 1)) {
  const candidate = source.slice(match.index, end + 1);
  try { new vm.Script('(' + candidate + ')'); return candidate; } catch (_) {}
 }
 throw new Error('Cannot extract production function ' + name);
}
function sourceFor(mode) {
 return fs.readFileSync(path.join(__dirname, '..', mode === 'security' ? 'security.js' : 'controlflow-revision/security-v335.js'), 'utf8');
}
const types = ['lock', 'alarm', 'access', 'detector', 'automation', 'automation_selfcheck', 'lock_revision'];
function item(index, mode, page = index + 1) {
 const modeTypes = mode === 'security' ? types.slice(0, 4) : types.slice(4);
 return {uid:`qa-${mode}-${index + 1}`, type:modeTypes[index % modeTypes.length], number:index + 1,
  id:'D' + (index + 1), idMode:'manual', serialNumber:String(index + 1), modelCode:'', model:'',
  page, x:index % 2 ? .77 : .23, y:index % 2 ? .74 : .28,
  labelX:index % 2 ? .64 : .34, labelY:index % 2 ? .66 : .21,
  location:`Neutralt plan ${page}, zon ${index % 2 ? 'B' : 'A'}`, checks:{}, customChecks:[], checkEdits:{},
  notes:'', status:'untested', previousIssues:[], positionLocked:false,
  customerStampScale:1, customerArrowScale:1};
}
async function sourceFixture(count, cropped = true) {
 const doc = await PDFLib.PDFDocument.create(), font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
 for (let i = 0; i < count; i++) {
  const page = doc.addPage([700, 900]);
  if (cropped) { page.setCropBox(35, 45, 600, 790); page.setRotation(PDFLib.degrees(i % 4 * 90)); }
  const box = page.getCropBox();
  page.drawText(`NEUTRAL QA-RITNING - PLAN ${i + 1}`, {x:box.x + 28, y:box.y + box.height - 42, size:18, font});
  page.drawText('Syntetisk testfil. Inga kunduppgifter.', {x:box.x + 28, y:box.y + box.height - 62, size:11, font});
  page.drawRectangle({x:box.x + 55, y:box.y + 105, width:box.width - 110, height:box.height - 230,
   borderWidth:2, borderColor:PDFLib.rgb(.25, .35, .4)});
  page.drawLine({start:{x:box.x + box.width / 2, y:box.y + 105}, end:{x:box.x + box.width / 2, y:box.y + box.height - 125},
   thickness:1, color:PDFLib.rgb(.45, .55, .6)});
  page.drawLine({start:{x:box.x + 55, y:box.y + box.height / 2}, end:{x:box.x + box.width - 55, y:box.y + box.height / 2},
   thickness:1, color:PDFLib.rgb(.45, .55, .6)});
  page.drawText('ZON A', {x:box.x + 100, y:box.y + box.height - 180, size:15, font});
  page.drawText('ZON B', {x:box.x + box.width - 170, y:box.y + 175, size:15, font});
  page.drawText(`Originalritning ${i + 1} / ${count}`, {x:box.x + 28, y:box.y + 28, size:10, font});
 }
 return doc.save({addDefaultPage:false});
}
function buttonFixture(mode) {
 const source = sourceFor(mode), calls = [], doc = {__backLinks:[], getNumberOfPages:() => 2};
 for (const method of ['setFillColor', 'setDrawColor', 'setLineWidth', 'roundedRect', 'setLineCap', 'setLineJoin', 'line', 'rect'])
  doc[method] = (...args) => calls.push([method, ...args]);
 const state = {ALL_IN_ONE:true, document:{documentElement:{dataset:{controlflowUi:'1', cfStampMode:mode}}}, doc,
  txt:(...args) => calls.push(['txt', ...args])};
 vm.createContext(state);
 vm.runInContext(functionSource(source, 'securityProtocolReturnEnabled') + '\n' + functionSource(source, 'backButton'), state);
 return {state, calls};
}
function checkButtons(mode) {
 const h = buttonFixture(mode), {state, calls} = h;
 for (const type of types) {
  state.doc.__backLinks = []; calls.length = 0;
  state.backButton({type, page:3, uid:type + '-3'});
  equal(state.doc.__backLinks, [{pageNo:2, drawingPage:3, rect:[151,29,47,8], type, uid:type + '-3'}], mode + ': exact visible button is also exact return hit area for ' + type);
  ok(calls.some(c => c[0] === 'txt' && c[1] === 'Tillbaka till ritningen'), mode + ': readable return label for ' + type);
 }
 for (const route of ['brand', '']) {
  state.document.documentElement.dataset.cfStampMode = route;
  state.doc.__backLinks = []; calls.length = 0;
  state.backButton({type:'lock', page:1, uid:'outside'});
  equal(state.doc.__backLinks, [{pageNo:2, drawingPage:1, rect:[188,19.1,8,5.8]}], mode + ': unrelated route retains its legacy button');
 }
 state.document.documentElement.dataset.cfStampMode = mode; state.ALL_IN_ONE = false;
 state.doc.__backLinks = []; state.backButton({type:'lock', page:1, uid:'standalone'});
 equal(state.doc.__backLinks, [{pageNo:2, drawingPage:1, rect:[188,19.1,8,5.8]}], mode + ': standalone button unchanged');
 if (mode === 'revision') {
  state.doc.__backLinks = []; state.backButton({type:'automation', page:1, uid:'standalone'});
  equal(state.doc.__backLinks, [{pageNo:2, drawingPage:1, rect:[151,29,47,8], type:'automation'}], 'Existing revision automation appearance stays intact outside scope');
 }
}
async function reportFixture(backs, label) {
 const doc = await PDFLib.PDFDocument.create(), font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
 const count = Math.max(1, ...backs.filter(b => Number.isInteger(b.pageNo) && b.pageNo <= 20).map(b => b.pageNo));
 const s = 72 / 25.4;
 for (let n = 1; n <= count; n++) {
  const p = doc.addPage([210*s, 297*s]);
  p.drawText(label + ' - NEUTRALT TESTPROTOKOLL ' + n, {x:12*s, y:275*s, size:13, font});
  p.drawText('Testunderlag. Appen skapar sitt ordinarie protokoll efter ateroppning.', {x:12*s, y:245*s, size:10, font});
  const b = backs.find(link => link.pageNo === n && link.uid);
  if (b) {
   p.drawText(`Objekt ${b.uid} - ritningssida ${b.drawingPage}`, {x:12*s, y:233*s, size:11, font});
   p.drawRectangle({x:151*s,y:(297-37)*s,width:47*s,height:8*s,color:PDFLib.rgb(.949,.969,.976),borderColor:PDFLib.rgb(.639,.729,.776),borderWidth:.7});
   p.drawText('<  Tillbaka till ritningen', {x:154*s,y:(297-34)*s,size:8,font,color:PDFLib.rgb(.137,.286,.369)});
  }
 }
 return doc.save();
}
async function harness(mode, sourceBytes, items, backs, options = {}) {
 const source = sourceFor(mode), pdf = options.empty ? {numPages:0, async destroy(){}} : await pdfjs.getDocument({data:sourceBytes.slice(), useSystemFonts:true}).promise;
 const reportBytes = await reportFixture(backs, mode), downloads = [], blobs = new Map(), messages = [], elements = new Map();
 const classes = new Set();
 const document = {documentElement:{dataset:{controlflowUi:'1', cfStampMode:mode}}, body:{dataset:{}, classList:{contains:n=>classes.has(n),add:n=>classes.add(n),remove:n=>classes.delete(n)}},
  createElement:() => ({click(){downloads.push({href:this.href, name:this.download});}})};
 const element = id => {if (!elements.has(id)) elements.set(id,{style:{}, close(){state.closes++;}, addEventListener(type, fn){this[type] = fn;}, scrollLeft:50,scrollTop:80,clientWidth:800,clientHeight:600});return elements.get(id);};
 const state = {PDFLib, Uint8Array, ArrayBuffer, TextEncoder, TextDecoder, Blob, structuredClone, document, pdf, sourceBytes, items,
  textNotes:[], drawingExtras:[], project:{projectName:'Neutral returtest 551', date:'2026-11-02', sourceFileName:'neutral-tre-plan.pdf',controlflowStampDefaults:{version:1,stampScale:1,arrowScale:1}},logoData:'',
  drawingRotations:mode === 'security' ? Object.fromEntries(items.filter(o=>o.page > 4).map(o=>[o.page,90])) : {},
  ALL_IN_ONE:true, APP_STATE_NAME:'doorservice-all-in-one', APP_WORK_KEY:'DoorserviceAllInOneWork', APP_LABEL:'Kontrollflöde',
  SYSTEMS:Object.fromEntries([...types,'fire_panel'].map(type => [type,{label:type}])), window:{PDFLib},
  msg:(text,error)=>messages.push({text,error}),console:{error:e=>messages.push({text:e.message,error:true})},refreshTop(){},
  URL:{createObjectURL:blob=>{const id='blob:'+blobs.size;blobs.set(id,blob);return id;},revokeObjectURL(){}},setTimeout(){},clearTimeout(){},
  $:element, viewer:element('secViewer'), closes:0, renders:[], page:1,selected:null,
  wheelZoomTimer:null,wheelZoomTarget:4,wheelZoomFocus:{x:10,y:10},visualZoom:2,zoom:1,
  closeSecurityOverview(){state.overviewClosed=true;},showSelected(){state.shown=state.selected;},go(view){state.view=view;},
  async render(...args){state.renders.push({page:state.page,zoom:state.zoom,args});},
  reportDoc:()=>({__backLinks:backs,__protocolPages:Object.fromEntries(backs.filter(b=>b.uid).map(b=>[b.uid,b.pageNo])),
   output:()=>reportBytes.buffer.slice(reportBytes.byteOffset,reportBytes.byteOffset+reportBytes.byteLength)}),
  async buildSecurityDrawingPdf(snapshot){
   const src=await PDFLib.PDFDocument.load(sourceBytes),out=await PDFLib.PDFDocument.create();
   const copied=await out.copyPages(src,src.getPageIndices());copied.forEach((p,i)=>{p.setRotation(PDFLib.degrees((p.getRotation().angle+(snapshot.drawingRotations?.[i+1]||0))%360));out.addPage(p);});
   const links=[];
   if(options.markers){
    const font=await out.embedFont(PDFLib.StandardFonts.Helvetica);
    for(const o of snapshot.items){const vp=(await pdf.getPage(o.page)).getViewport({scale:1}),[x,y]=vp.convertToPdfPoint(o.x*vp.width,o.y*vp.height),[lx,ly]=vp.convertToPdfPoint(o.labelX*vp.width,o.labelY*vp.height),p=out.getPage(o.page-1);
     p.drawLine({start:{x:lx,y:ly},end:{x,y},thickness:1,color:PDFLib.rgb(.2,.4,.55)});
     p.drawCircle({x,y,size:3,color:PDFLib.rgb(.2,.4,.55)});
     p.drawRectangle({x:lx-18,y:ly-10,width:36,height:20,color:PDFLib.rgb(.2,.4,.55)});
     p.drawText(o.id,{x:lx-10,y:ly-4,size:11,font,color:PDFLib.rgb(1,1,1)});
     links.push({uid:o.uid,pageIndex:o.page-1,x:lx,y:ly,width:36,height:20});
    }
   }
   return {out,src,links,overviewLinks:[],originalBytes:sourceBytes.slice()};
  }
 };
 vm.createContext(state);
 const names=['securityProtocolReturnEnabled','securityProtocolReturnView','securityProtocolReturnPdfRect','exportPdf','returnFromCustomerProtocol','inspectSecurityWorkPdf'];
 if(mode==='security')names.push('drawingRotation','rotateDrawingPoint','validDrawingRotations');
 vm.runInContext(names.map(name=>functionSource(source,name)).join('\n'),state);
 return {state,pdf,source,downloads,blobs,messages,elements,reportBytes};
}
async function exportAndRead(h, name='test.pdf') {
 await h.state.exportPdf('work',name);
 equal(h.messages.filter(m=>m.error),[],'Production export completes');
 equal(h.downloads.length,1,'Exactly one download');
 const bytes=new Uint8Array(await h.blobs.get(h.downloads[0].href).arrayBuffer());
 return {bytes,doc:await PDFLib.PDFDocument.load(bytes)};
}
function annotations(doc, page) {
 const refs=page.node.lookupMaybe(PDFLib.PDFName.of('Annots'),PDFLib.PDFArray);
 return refs?refs.asArray().map(ref=>doc.context.lookup(ref)):[];
}
function destValues(annotation) {return annotation.lookup(PDFLib.PDFName.of('Dest'),PDFLib.PDFArray).asArray();}
async function checkExport(mode) {
 const original=await sourceFixture(8),items=Array.from({length:8},(_,i)=>item(i,mode));
 const backs=items.map((o,i)=>({pageNo:i+1,drawingPage:o.page,rect:[151,29,47,8],uid:o.uid,type:o.type}));
 backs.push({pageNo:1,drawingPage:3,rect:[12,60,30,8]}, // Overview/text-note fallback.
  {pageNo:1,drawingPage:2,rect:[12,70,30,8],uid:'not-present'},
  {pageNo:1,drawingPage:9,rect:[12,80,30,8],uid:items[0].uid}, // Must never target appended report.
  {pageNo:1,drawingPage:0,rect:[12,90,30,8]},
  {pageNo:1,drawingPage:1.5,rect:[12,100,30,8]},
  {pageNo:999,drawingPage:1,rect:[12,110,30,8]},
  {pageNo:0,drawingPage:1,rect:[12,120,30,8]},
  {pageNo:1,drawingPage:1,rect:[12,130,0,8]},
  {pageNo:1,drawingPage:1,rect:[12,140,30,NaN]});
 const h=await harness(mode,original,items,backs), before=plain({items:h.state.items,project:h.state.project,drawingRotations:h.state.drawingRotations});
 const {bytes,doc}=await exportAndRead(h), source=await PDFLib.PDFDocument.load(original);
 equal(doc.getPageCount(),16,mode+': all original drawing pages precede eight protocol pages');
 for(let i=0;i<8;i++){
  const o=items[i],p=doc.getPage(8+i),ann=annotations(doc,p),dest=destValues(ann[0]);
  equal(ann.length,i===0?3:1,mode+': valid return annotations only');
  equal(String(dest[0]),String(doc.getPage(o.page-1).ref),mode+': return uses original drawing reference');
  equal(String(dest[1]),'/FitR',mode+': object return has contextual rectangle');
  const rect=dest.slice(2).map(n=>n.asNumber()),vp=(await h.pdf.getPage(o.page)).getViewport({scale:1}),crop=source.getPage(i).getCropBox();
  ok(rect.every(Number.isFinite)&&rect[0]<rect[2]&&rect[1]<rect[3],mode+': valid destination rectangle');
  ok(rect[0]>=crop.x-1e-6&&rect[1]>=crop.y-1e-6&&rect[2]<=crop.x+crop.width+1e-6&&rect[3]<=crop.y+crop.height+1e-6,mode+': focus remains inside original offset CropBox');
  for(const point of [[o.x,o.y],[o.labelX,o.labelY]]){
   const [x,y]=vp.convertToPdfPoint(point[0]*vp.width,point[1]*vp.height);
   ok(x>=rect[0]&&x<=rect[2]&&y>=rect[1]&&y<=rect[3],mode+': native rotation keeps target and label inside destination');
  }
  const area=h.state.securityProtocolReturnView(o),corners=[[rect[0],rect[1]],[rect[2],rect[3]]].map(p=>vp.convertToViewportPoint(...p));
  near(Math.min(...corners.map(p=>p[0]))/vp.width,area.x,mode+': focus x matches original display coordinates');
  near(Math.min(...corners.map(p=>p[1]))/vp.height,area.y,mode+': focus y matches original display coordinates');
  equal(doc.getPage(i).getCropBox(),crop,mode+': source CropBox preserved');
  equal(doc.getPage(i).getRotation().angle,(i%4*90+(h.state.drawingRotations[i+1]||0))%360,mode+': native and UI rotations preserved');
 }
 const fallback=annotations(doc,doc.getPage(8)).slice(1);
 equal(fallback.map(a=>String(destValues(a)[1])),['/Fit','/Fit'],mode+': no UID and missing object retain page fit');
 equal(fallback.map(a=>String(destValues(a)[0])),[String(doc.getPage(2).ref),String(doc.getPage(1).ref)],mode+': fallback still uses correct original pages');
 const reopened=await h.state.inspectSecurityWorkPdf(bytes);
 ok(Buffer.from(reopened.drawingBytes).equals(Buffer.from(original)),mode+': embedded original is byte-for-byte unchanged');
 equal(reopened.work.items,before.items,mode+': return navigation does not rewrite work objects');
 equal(reopened.work.project,before.project,mode+': project metadata remains unchanged');
 equal({items:h.state.items,project:h.state.project,drawingRotations:h.state.drawingRotations},before,mode+': export is state-preserving');
 // The same metadata cannot produce a return to a report when no drawings exist.
 const empty=await sourceFixture(0),emptyHarness=await harness(mode,empty,[],[{pageNo:1,drawingPage:1,rect:[151,29,47,8],uid:'missing'}],{empty:true});
 const emptyOut=await exportAndRead(emptyHarness);
 equal(annotations(emptyOut.doc,emptyOut.doc.getPage(0)).length,0,mode+': report-only output gets no invalid drawing destination');
 await emptyHarness.pdf.destroy();
 await checkPreview(mode,h,items[2]);
 await h.pdf.destroy();
}
async function checkPreview(mode,h,o){
 const s=h.state,before=plain(s.items),link={pageNo:3,drawingPage:o.page,rect:[151,29,47,8],uid:o.uid,type:o.type};
 for(const angle of (mode==='security'?[0,90,180,270]:[0])){
  s.drawingRotations[o.page]=angle;s.renders=[];
  ok(await s.returnFromCustomerProtocol(link),mode+': valid preview return handled');
  equal([s.page,s.selected,s.shown,s.view],[o.page,o.uid,o.uid,'drawing'],mode+': preview returns to correct page and object');
  equal(s.renders.length,1,mode+': exactly one render');
  const {args,zoom}=s.renders[0],area=s.securityProtocolReturnView(o),cx=area.x+area.width/2,cy=area.y+area.height/2;
  const expected=angle===90?{x:1-cy,y:cx}:angle===180?{x:1-cx,y:1-cy}:angle===270?{x:cy,y:1-cx}:{x:cx,y:cy};
  equal(args,[true,{x:400,y:300},expected],mode+': preview centers contextual focus at '+angle+' degrees');
  ok(zoom>1&&zoom<=2.5,mode+': context zoom avoids extreme close-up');
  equal([s.visualZoom,s.wheelZoomTarget,s.wheelZoomFocus,s.$('secStage').style.transform],[1,null,null,''],mode+': pending visual zoom cleared');
 }
 const renders=s.renders.length,closes=s.closes;
 equal(await s.returnFromCustomerProtocol({...link,drawingPage:9}),false,mode+': invalid preview page rejected');
 equal([s.renders.length,s.closes],[renders,closes],mode+': invalid return does not change UI');
 await s.returnFromCustomerProtocol({drawingPage:1});
 equal(s.renders.at(-1).args,[true,null,null],mode+': missing object falls back to full-page preview');
 equal([s.zoom,s.viewer.scrollLeft,s.viewer.scrollTop],[1,0,0],mode+': full-page fallback resets zoom and scroll');
 equal(s.items,before,mode+': preview leaves stored coordinates and values unchanged');
 // Run the real report-canvas handler: hit area and protocol page both matter.
 const start=h.source.indexOf("$('secPreviewCanvas').addEventListener('click',async event=>{");
 const end=h.source.indexOf("$('secPreviewClose')",start);
 ok(start>=0&&end>start,mode+': production report click handler found');
 s.previewMode='report';s.previewPage=3;s.previewBackLinks=[link];s.previewOverviewLinks=[];
 vm.runInContext(h.source.slice(start,end),s);
 const click=s.$('secPreviewCanvas').click,target={getBoundingClientRect:()=>({left:10,top:20,width:420,height:594})};
 const count=s.renders.length;
 await click({currentTarget:target,clientX:10+170*2,clientY:20+33*2});
 equal(s.renders.length,count+1,mode+': click on actual return button navigates');
 await click({currentTarget:target,clientX:10+100*2,clientY:20+33*2});
 s.previewPage=2;await click({currentTarget:target,clientX:10+170*2,clientY:20+33*2});
 equal(s.renders.length,count+1,mode+': outside and wrong report page do not navigate');
}
async function fixtures(directory){
 fs.mkdirSync(directory,{recursive:true});
 const source=await sourceFixture(3,false);
 for(const mode of ['security','revision']){
  const items=Array.from({length:4},(_,i)=>item(i,mode,i<2?1:3));
  // Alternating positions on both floors make wrong-page/focus returns obvious.
  const backs=items.map((o,i)=>({pageNo:i+1,drawingPage:o.page,rect:[151,29,47,8],uid:o.uid,type:o.type}));
  const h=await harness(mode,source,items,backs,{markers:true}),name=`return-${mode}-work.pdf`;
  const {bytes,doc}=await exportAndRead(h,name),reopened=await h.state.inspectSecurityWorkPdf(bytes);
  equal(reopened.work.items,items,mode+': QA fixture reopens with every object');
  equal((await PDFLib.PDFDocument.load(reopened.drawingBytes)).getPageCount(),3,mode+': QA fixture has three original drawing pages');
  equal(doc.getPageCount(),7,mode+': QA fixture includes four navigable test protocols');
  fs.writeFileSync(path.join(directory,name),bytes);
  await h.pdf.destroy();
 }
}
(async()=>{
 pdfjs=await import(require.resolve('pdfjs-dist/legacy/build/pdf.mjs'));
 for(const mode of ['security','revision']){checkButtons(mode);await checkExport(mode);}
 const fixtureIndex=process.argv.indexOf('--fixtures');
 if(fixtureIndex>=0){assert.ok(process.argv[fixtureIndex+1],'Provide fixture directory');await fixtures(path.resolve(process.argv[fixtureIndex+1]));}
 console.log(`controlflow-return-links-v551: ${checks} assertions passed (real core, PDFLib and PDF.js; offset CropBox, 0/90/180/270 degrees, preview and work roundtrip).`);
})().catch(error=>{console.error(error);process.exitCode=1;});
