'use strict';
/* Real vector-card and work-PDF integration. PDF.js reads native rotations and
 * CropBox coordinates; jsPDF and PDFLib generate the actual production card.
 * DOM/downloads and the unrelated detailed report contents remain fixtures.
 * Optional --fixtures DIR writes neutral, reopenable example work PDFs.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const PDFLib = require('pdf-lib');
const jspdf = require('../vendor/jspdf.umd.min.js');
// The production VM's array literals belong to another realm. PDFLib uses an
// instanceof check for embedPdf indices; normalize that boundary only.
const embedPdf = PDFLib.PDFDocument.prototype.embedPdf;
PDFLib.PDFDocument.prototype.embedPdf = function (bytes, indices) {
  return embedPdf.call(this, bytes, indices == null ? indices : Array.from(indices));
};
const root = path.join(__dirname, '..');
const helperPath = path.join(__dirname, 'controlflow-pdf-roundtrip-v549.cjs');
const helperSource = fs.readFileSync(helperPath, 'utf8');
const helperEnd = helperSource.indexOf('\nfunction svgPoint(');
assert(helperEnd > 0, 'existing production export/inspection harness is available');
const helperContext = vm.createContext({require:createRequire(helperPath), __dirname, console,
  Uint8Array, ArrayBuffer, TextEncoder, TextDecoder, Blob, structuredClone, Buffer});
vm.runInContext(helperSource.slice(0, helperEnd) + '\nglobalThis.overviewHelpers={harness,Style};', helperContext);
const {harness:coreHarness, Style} = helperContext.overviewHelpers;
let pdfjs, checks = 0;
const plain = value => JSON.parse(JSON.stringify(value));
function equal(actual, expected, message) { assert.deepEqual(plain(actual), plain(expected), message); checks++; }
function ok(value, message) { assert.ok(value, message); checks++; }
function near(actual, expected, message) { assert.ok(Math.abs(actual - expected) < 1e-5, `${message}: ${actual} vs ${expected}`); checks++; }

function functionSource(source, name) {
  const match = new RegExp('^[ \\t]*(?:async )?function ' + name + '\\(', 'm').exec(source);
  assert(match, 'Production function exists: ' + name);
  for (let end=source.indexOf('}',match.index);end>=0;end=source.indexOf('}',end+1)) {
    const candidate=source.slice(match.index,end+1);
    try { new vm.Script('(' + candidate + ')'); return candidate; } catch (_) {}
  }
  throw new Error('Cannot extract production function ' + name);
}
function attachOverview(h) {
  const source=fs.readFileSync(path.join(root,'security-service-overview-v554.js'),'utf8');
  const clamp=source.match(/^\s*const clamp=.*$/m), dimensions=source.match(/^\s*const dimensions=.*$/m);
  assert(clamp && dimensions, 'production normalization and layout declarations exist');
  h.state.jspdf=jspdf;
  vm.runInContext([clamp[0],dimensions[0],...['config','stats','cardDoc','drawToPdf'].map(name=>functionSource(source,name)),
    'window.SecurityServiceOverview={config,stats,cardDoc,drawToPdf};'].join('\n'),h.context,{filename:'security-service-overview-v554.js'});
}
function objects(count=3) {
  const base=(uid,type,status,page,checks={})=>({uid,id:uid.toUpperCase(),type,status,page,number:Number(uid.slice(1)),
    x:.2,y:.65,labelX:.36,labelY:.57,checks,customChecks:[],checkEdits:{},notes:'Syntetiskt testunderlag',previousIssues:[],
    customerStampScale:1,customerArrowScale:1});
  return [base('s1','lock','ok',1),
    {...base('s2','access','action',count,{'1.1':{result:'remark',note:'Åtgärdat testfel'}}),remediationDate:'2026-11-02',remediationSignature:'QA'},
    base('s3','alarm','untested',1,{'1.1':{result:'remark',note:'Kontrollera testfunktion'}}),
    base('s4','detector','fail',count),
    base('s5','lock','untested',count,{'1.1':{result:'',note:'Ett utkast är inte ett fel'}}),
    base('inactive','automation','fail',1)];
}
async function sourceFixture(count, angle=0, cropped=true) {
  const doc=await PDFLib.PDFDocument.create(),font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  for(let index=0;index<count;index++) {
    const p=doc.addPage([700,900]);
    if(cropped)p.setCropBox(35,45,600,790);
    p.setRotation(PDFLib.degrees(index===0?angle:(index*90)%360));
    const box=p.getCropBox();
    p.drawText('NEUTRAL RITNING - PLAN '+(index+1),{x:box.x+25,y:box.y+box.height-30,size:13,font});
    p.drawText('Syntetiskt testunderlag',{x:box.x+25,y:box.y+24,size:10,font});
    p.drawRectangle({x:box.x+50,y:box.y+90,width:box.width-100,height:box.height-280,
      borderWidth:1,borderColor:PDFLib.rgb(.45,.55,.6)});
    p.drawLine({start:{x:box.x+box.width/2,y:box.y+90},end:{x:box.x+box.width/2,y:box.y+box.height-190},
      thickness:1,color:PDFLib.rgb(.45,.55,.6)});
  }
  return doc.save();
}
function reportFixture(list) {
  const doc=new jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
  doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('ANMÄRKNINGSÖVERSIKT',14,22);
  doc.setFont('helvetica','normal');doc.setFontSize(11);
  doc.text('Neutral servicekontroll. Syntetiskt testunderlag.',14,33);
  const active=list.filter(o=>o.type!=='automation');
  active.forEach((o,i)=>{doc.text(o.id+' · '+o.type+' · '+o.status,14,52+i*17);doc.text(o.notes,14,58+i*17);});
  doc.__protocolPages={};doc.__backLinks=[];
  active.forEach((o,index)=>{doc.addPage();doc.__protocolPages[o.uid]=index+2;doc.setFontSize(16);doc.text('TESTPROTOKOLL '+o.id,14,24);doc.setFontSize(11);doc.text('Ritningssida '+o.page,14,35);});
  return doc;
}
async function harness(sourceBytes,{layout='wide',enabled=true,uiRotation=0,list,project}={}) {
  const realPdf=await pdfjs.getDocument({data:sourceBytes.slice(),useSystemFonts:true}).promise;
  list=list||objects(realPdf.numPages);
  const report=reportFixture(list),reportBytes=new Uint8Array(report.output('arraybuffer'));
  const h=await coreHarness('security',sourceBytes,reportBytes);
  h.state.pdf=realPdf;h.pdf=realPdf;h.state.items=list;
  h.state.drawingRotations=uiRotation?{1:uiRotation}:{};
  h.active=new Set(['lock','alarm','access','detector']);
  h.state.allInOneProtocolActive=type=>h.active.has(type);
  h.state.reportDoc=()=>report;
  h.state.project=project||{projectName:'Neutral servicekontroll',sourceFileName:'neutral-service.pdf',date:'2026-11-02',
    serviceOverview:{enabled,page:1,layout,x:.12,y:.1,width:layout==='wide'?.72:.58}};
  h.state.logoData='';
  attachOverview(h);
  const view=(await realPdf.getPage(1)).getViewport({scale:1,rotation:((await realPdf.getPage(1)).rotate+uiRotation)%360});
  if(enabled&&h.state.project.serviceOverview)h.state.project.serviceOverview=h.state.config(h.state.project.serviceOverview,view.width,view.height);
  return h;
}
async function readText(bytes,pageNumber=1) {
  const pdf=await pdfjs.getDocument({data:bytes.slice(),useSystemFonts:true}).promise;
  const page=await pdf.getPage(pageNumber),items=(await page.getTextContent()).items;
  const result={items,viewport:page.getViewport({scale:1})};
  await pdf.destroy();return result;
}
function annotations(doc,page) {
  const array=page.node.lookupMaybe(PDFLib.PDFName.of('Annots'),PDFLib.PDFArray);
  return array?array.asArray().map(ref=>doc.context.lookup(ref)):[];
}
function rectangle(annotation) { return annotation.lookup(PDFLib.PDFName.of('Rect'),PDFLib.PDFArray).asArray().map(n=>n.asNumber()); }
function destination(annotation) { return annotation.lookup(PDFLib.PDFName.of('Dest'),PDFLib.PDFArray).asArray(); }
function inRect(point,rect) { return point[0]>=rect[0]-1e-5&&point[0]<=rect[2]+1e-5&&point[1]>=rect[1]-1e-5&&point[1]<=rect[3]+1e-5; }

async function checkCountsAndCard() {
  const h=await harness(await sourceFixture(3));
  const before=plain(h.state.items);
  equal(h.state.stats().map(row=>row.slice(0,2)),[['TOTALT',5],['KLARA',1],['ÅTGÄRDADE',1],['ANMÄRKNING',1],['EJ GODKÄNDA',1],['EJ KONTROLLERAT',1]],'live summary distinguishes statuses, remediation and remark drafts');
  h.active.delete('lock');
  equal(h.state.stats().map(row=>row[1]),[3,0,1,1,1,0],'inactive protocols disappear from every count');
  h.active.add('lock');h.state.items[2].remediationDate='2026-11-02';h.state.items[2].remediationSignature='QA';
  equal(h.state.stats().map(row=>row[1]),[5,1,2,0,1,1],'the card updates after remediation');
  h.state.items=before;
  for(const layout of ['wide','compact']) {
    const bytes=new Uint8Array(h.state.cardDoc(h.state.stats(),layout).output('arraybuffer'));
    const doc=await PDFLib.PDFDocument.load(bytes),size=doc.getPage(0).getSize();
    equal(size,layout==='wide'?{width:900,height:180}:{width:600,height:270},layout+': real card has its intended aspect ratio');
    const text=(await readText(bytes)).items.map(item=>item.str);
    equal(text.filter(s=>s==='Resultat av service').length,1,layout+': one vector title');
    for(const label of h.state.stats().map(row=>row[0]))ok(text.includes(label),layout+': card includes '+label);
    equal(text.filter(s=>s==='5').length,1,layout+': total is rendered from real state');
  }
  equal(h.state.config({enabled:false}),null,'disabled config is absent');
  const c=h.state.config({enabled:true,x:99,y:-5,width:99,height:-3,page:99});
  equal(c.page,1,'the overview is bound to the first page');
  ok(c.x>=0&&c.y>=0&&c.x+c.width<=1&&c.y+c.height<=1,'placement normalization keeps the complete card in the drawing');
  await h.pdf.destroy();
}

async function checkGeometry() {
  for(const layout of ['wide','compact'])for(const native of [0,90,180,270])for(const ui of [0,90,180,270]) {
    const h=await harness(await sourceFixture(3,native),{layout,uiRotation:ui});
    // Exercise stored free-resize values as well as rotated, offset source pages.
    h.state.project.serviceOverview={enabled:true,page:1,layout,x:.13,y:.09,width:.67,height:.19};
    const snapshot=structuredClone({items:h.state.items,project:h.state.project});
    const src=await PDFLib.PDFDocument.load(h.state.sourceBytes),out=await PDFLib.PDFDocument.create();
    const pages=await out.copyPages(src,src.getPageIndices());pages.forEach(p=>out.addPage(p));
    const page=await h.pdf.getPage(1),view=page.getViewport({scale:1,rotation:(native+ui)%360});
    pages[0].setRotation(PDFLib.degrees(view.rotation));
    const link=await h.state.drawToPdf(out,pages[0],1,view,snapshot),c=link.normalized;
    equal(link.pageIndex,0,'overview link is always attached to the first source page');
    const expectedCorners=[[c.x,c.y],[c.x+c.width,c.y],[c.x,c.y+c.height],[c.x+c.width,c.y+c.height]]
      .map(([x,y])=>view.convertToPdfPoint(x*view.width,y*view.height));
    for(const point of expectedCorners)ok(inRect(point,link.rect),layout+': clickable rectangle covers the card at rotations '+native+'/'+ui);
    const crop=pages[0].getCropBox();
    ok(link.rect[0]>=crop.x-1e-5&&link.rect[1]>=crop.y-1e-5&&link.rect[2]<=crop.x+crop.width+1e-5&&link.rect[3]<=crop.y+crop.height+1e-5,'link respects an offset CropBox');
    equal(await h.state.drawToPdf(out,pages[1],2,(await h.pdf.getPage(2)).getViewport({scale:1}),snapshot),null,'no duplicate card on later pages');
    const data=await out.save(),content=await readText(data),title=content.items.find(item=>item.str==='Resultat av service');
    ok(title,'actual vector title survives PDFLib embedding');
    const baseline=content.viewport.convertToViewportPoint(title.transform[4],title.transform[5]);
    const width=layout==='wide'?900:600,height=layout==='wide'?180:270;
    near(baseline[0],c.x*view.width+22/width*c.width*view.width,'visible title x matches the selected card placement');
    near(baseline[1],c.y*view.height+33/height*c.height*view.height,'visible title y matches the selected card placement');
    equal((await readText(data,2)).items.filter(item=>item.str==='Resultat av service').length,0,'later source page remains free of the card');
    equal({items:h.state.items,project:h.state.project},snapshot,'PDF drawing leaves data unchanged');
    await h.pdf.destroy();
  }
}

async function exported(h,name='overview-work.pdf') {
  await h.state.exportPdf('work',name);
  equal(h.messages.filter(message=>message.error),[],'real production export succeeds');
  equal(h.document.downloads.length,1,'one work-PDF download');
  const entry=h.document.downloads[0],bytes=new Uint8Array(await h.blobs.get(entry.href).arrayBuffer());
  return {bytes,doc:await PDFLib.PDFDocument.load(bytes)};
}
async function assertCardCount(bytes,drawingPages,enabled) {
  const pdf=await pdfjs.getDocument({data:bytes.slice(),useSystemFonts:true}).promise;
  for(let number=1;number<=drawingPages;number++) {
    const content=await (await pdf.getPage(number)).getTextContent();
    equal(content.items.filter(item=>item.str==='Resultat av service').length,enabled&&number===1?1:0,'exactly one card on source page 1, none on other pages');
  }
  await pdf.destroy();
}
async function checkExports(fixtureDirectory) {
  for(const count of [1,3])for(const layout of ['wide','compact']) {
    const original=await sourceFixture(count,count===1?90:270);
    const uiRotation=count===3&&layout==='compact'?180:90;
    const h=await harness(original,{layout,uiRotation});
    const before=plain({items:h.state.items,project:h.state.project,drawingRotations:h.state.drawingRotations});
    const built=await h.state.buildSecurityDrawingPdf();
    equal(built.overviewLinks.length,1,'production drawing builder invokes the new overview module once');
    const {bytes,doc}=await exported(h);
    const overview=built.overviewLinks[0];
    const hit=annotations(doc,doc.getPage(0)).filter(a=>rectangle(a).every((n,i)=>Math.abs(n-overview.rect[i])<1e-5));
    equal(hit.length,1,'export preserves one exact clickable card rectangle');
    equal(String(destination(hit[0])[0]),String(doc.getPage(count).ref),'card link targets the first report page after '+count+' drawing pages');
    equal(String(destination(hit[0])[1]),'/Fit','report opens at page fit');
    const reportText=(await readText(bytes,count+1)).items.map(item=>item.str);
    ok(reportText.includes('ANMÄRKNINGSÖVERSIKT'),'link destination is the full remarks overview');
    await assertCardCount(bytes,count,true);
    const reopened=await h.state.inspectSecurityWorkPdf(bytes);
    ok(Buffer.from(reopened.drawingBytes).equals(Buffer.from(original)),'editable work PDF preserves undecorated original drawing bytes');
    equal(reopened.work.project,before.project,'layout, position and size survive work-PDF roundtrip');
    equal(reopened.work.items,before.items,'overview export preserves all protocol data');
    equal(reopened.work.drawingRotations,before.drawingRotations,'UI rotations survive work-PDF roundtrip');
    equal({items:h.state.items,project:h.state.project,drawingRotations:h.state.drawingRotations},before,'export preserves live project state');
    const next=await harness(reopened.drawingBytes,{list:reopened.work.items,project:reopened.work.project,layout,uiRotation});
    const second=await exported(next,'second-export.pdf');
    await assertCardCount(second.bytes,count,true);
    const secondWork=await next.state.inspectSecurityWorkPdf(second.bytes);
    ok(Buffer.from(secondWork.drawingBytes).equals(Buffer.from(original)),'second export embeds the same clean original and does not accumulate cards');
    if(fixtureDirectory&&count===3)fs.writeFileSync(path.join(fixtureDirectory,'security-service-overview-'+layout+'-work.pdf'),bytes);
    await next.pdf.destroy();await h.pdf.destroy();
  }
  for(const missing of [false,true]) {
    const h=await harness(await sourceFixture(3),{enabled:false});
    if(missing)delete h.state.project.serviceOverview;
    const built=await h.state.buildSecurityDrawingPdf();
    equal(built.overviewLinks,[],missing?'absent config generates no link':'disabled card generates no link');
    const result=await exported(h);await assertCardCount(result.bytes,3,false);
    await h.pdf.destroy();
  }
}

async function checkPreviewNavigation() {
  const h=await harness(await sourceFixture(3,90),{uiRotation:90}),s=h.state;
  const source=fs.readFileSync(path.join(root,'security.js'),'utf8');
  const clickStart=source.indexOf("$('secPreviewCanvas').addEventListener('click',async event=>{");
  const clickEnd=source.indexOf("$('secPreviewClose')",clickStart);
  ok(clickStart>=0&&clickEnd>clickStart,'production preview click handler exists');
  const canvas=s.$('secPreviewCanvas');canvas.addEventListener=(kind,fn)=>{canvas[kind]=fn;};
  s.pdfjsLib={getDocument:options=>pdfjs.getDocument({...options,useSystemFonts:true})};s.cur=()=>null;s.document.body.dataset.view='drawing';
  s.previewMode='drawing';s.previewPage=1;s.previewBackLinks=[];s.previewStampRects=[];s.previewRenders=0;
  s.renderCustomerPreview=async()=>{s.previewRenders++;};s.$('secPreviewDialog').showModal=()=>{};s.$('secPreviewDialog').close=()=>{};
  const built=await s.buildSecurityDrawingPdf();s.previewOverviewLinks=built.overviewLinks;
  s.previewPdf=await pdfjs.getDocument({data:await built.out.save(),useSystemFonts:true}).promise;
  vm.runInContext(functionSource(source,'openCustomerPreview')+'\n'+source.slice(clickStart,clickEnd),h.context);
  const c=built.overviewLinks[0].normalized,target={getBoundingClientRect:()=>({left:10,top:20,width:800,height:600})};
  const event=(x,y)=>({currentTarget:target,clientX:10+x*800,clientY:20+y*600});
  await canvas.click(event(.98,.98));equal(s.previewRenders,0,'clicks outside the card do not open reports');
  s.previewPage=2;await canvas.click(event(c.x+c.width/2,c.y+c.height/2));equal(s.previewRenders,0,'card hit area does not leak to another page');
  s.previewPage=1;await canvas.click(event(c.x+c.width/2,c.y+c.height/2));
  equal([s.previewMode,s.previewPage,s.previewRenders],['report',1,1],'actual card click opens the complete report from its first page');
  const report=await (await s.previewPdf.getPage(1)).getTextContent();
  ok(report.items.some(item=>item.str==='ANMÄRKNINGSÖVERSIKT'),'preview destination is the remarks overview');
  equal(h.messages.filter(message=>message.error),[],'preview has no swallowed errors');
  await s.previewPdf.destroy();await h.pdf.destroy();
}

(async()=>{
  pdfjs=await import(require.resolve('pdfjs-dist/legacy/build/pdf.mjs'));
  await Style.prepare(PDFLib);
  const index=process.argv.indexOf('--fixtures');
  const directory=index>=0?path.resolve(process.argv[index+1]||''):null;
  if(index>=0){assert(process.argv[index+1],'Provide a fixture directory');fs.mkdirSync(directory,{recursive:true});}
  await checkCountsAndCard();await checkGeometry();await checkExports(directory);await checkPreviewNavigation();
  console.log('security-service-overview-v554: '+checks+' assertions passed (real jsPDF/PDFLib/PDF.js, source/UI rotations, CropBox, links, preview and work-PDF roundtrip).');
})().catch(error=>{console.error(error);process.exitCode=1;});
