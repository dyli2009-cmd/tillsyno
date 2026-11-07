/* TEST 9.14: a deliberately removed stamp remains visible in the manual
 * search review and can be linked again without rescanning the project or
 * changing the already linked position's card source, checks or time data.
 * Generated PDF fixture only; native PDF text must never initialize OCR.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const sample={page:1,rect:{x:70/900,y:110/600,w:100/900,h:80/600}};
const linkedId='scan:WC@1:linked',removedId='scan:WC@1:removed';
const server=http.createServer((request,response)=>{
 const filename=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!filename.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(filename)]||'application/octet-stream');response.end(fs.readFileSync(filename));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-14.html`;
const clone=value=>JSON.parse(JSON.stringify(value));
const pdfBox=rect=>({x:rect[0]/900,y:(600-rect[3])/600,w:(rect[2]-rect[0])/900,h:(rect[3]-rect[1])/600});
function readHit(id,rect,selected){return {positionId:id,page:1,code:'WC',rect,box:pdfBox(rect),selected,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'project-code',order:id===linkedId?1:2,label:'WC'};}
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),yellow=rgb(1,.9,.02),plan=document.addPage([900,600]);
 function stamp(x){plan.drawEllipse({x,y:450,xScale:45,yScale:34,color:yellow});plan.drawText('WC',{x:x-font.widthOfTextAtSize('WC',18)/2,y:444,size:18,font});}
 stamp(120);stamp(300);
 const card=document.addPage([595,842]);card.drawText('Dörrkort WC',{x:60,y:790,size:16,font});card.drawText('Beslagskod: WC',{x:60,y:750,size:20,font});card.drawText('Låshus SL660 GS',{x:60,y:670,size:15,font});card.drawText('Dörrstängare BC700 GS',{x:60,y:630,size:15,font});
 const codeRect={x:.08,y:.08,w:.80,h:.06},tableRect={x:.08,y:.16,w:.80,h:.25},bounds={x:.06,y:.06,w:.86,h:.40};
 const work=['Låshus · SL660','Dörrstängare · BC700'],workItems=[
  {key:'wc-lock',text:work[0],label:'Låshus',value:'SL660',section:'Daglåsning',sectionKey:'daglasning'},
  {key:'wc-close',text:work[1],label:'Dörrstängare',value:'BC700',section:'Övrigt',sectionKey:'ovrigt'}
 ];
 const cardData={id:'card:WC',page:2,code:'WC',originalCardCode:'WC',header:'Beslagskod: WC',rawTable:'Låshus SL660 GS\nDörrstängare BC700 GS',work,workItems,workState:'ready',workPolicy:'gs-install-v2',codeRect,tableRect,bounds,choices:['WC'],method:'PDF-text',confidence:100};
 // Broad stored rectangles intentionally cover the exact native-text hits.
 // That mirrors an old saved scan whose hit rectangle can differ slightly
 // from the current renderer while still naming the same physical stamp.
 const linkedRect=[70,410,170,500],removedRect=[250,410,350,500],linked=readHit(linkedId,linkedRect,true),removed=readHit(removedId,removedRect,false);
 const checks={'wc-lock':true,'wc-close':false};
 const readTestData={schema:1,phase:'full',sourceId:'generated:relink-v9-14',rects:{code:codeRect,table:tableRect},pages:[2],cards:{[cardData.id]:cardData},checks:{[linkedId]:checks},matching:{version:2,hits:[linked,removed],pages:[{page:1,count:2,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},removedReadPositions:[{id:removedId,page:1,code:'WC',rect:removedRect}],drawingSample:null,name:'Generated removed WC relink'};
 const payload={schema:6,projectId:'project:generated-relink-v9-14',projectRevision:1,sourceName:'generated-relink.pdf',manualPositions:[],positionEdits:{[removedId]:{deleted:true}},ignoredCodes:[],labManualLinks:{},instances:{[linkedId]:{checks:clone(checks),rowStages:{'wc-lock':'done'},progress:50,overrides:{'wc-lock':{minutes:17}},customItems:[]}},automationItems:[],readTestData};
 document.catalog.set(PDFName.of('TillsynoSmartMatchV36Data'),PDFHexString.fromText(JSON.stringify(payload)));
 document.catalog.set(PDFName.of('TillsynoSmartMatchV30Data'),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}
async function contextFor(browser){
 const context=await browser.newContext({viewport:{width:1366,height:900},acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__relinkCalls={scans:0,workers:0,work:0};
  window.Tesseract={async createWorker(){__relinkCalls.workers++;throw Error('Native WC relink must never initialize OCR');}};
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:value=>{matcher={...value,scan:async(...args)=>{__relinkCalls.scans++;return value.scan(...args);}};}});
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:value=>{work={...value,read:async(...args)=>{__relinkCalls.work++;throw Error('Relinking a stamp must not reread door-card products');}};}});
 });
 return context;
}
async function openProject(page,bytes,count){
 await page.locator('#pwFile').setInputFiles({name:'generated-removed-wc.pdf',mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(expected=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===expected&&document.getElementById('pwScanOverlay').hidden,count,{timeout:60000});
}
async function openReview(page){
 await page.evaluate(()=>SmartMatchReadExtraV94.open({markFirst:false}));
 await page.waitForSelector('#exDialog[open]');
 await page.evaluate(mark=>SmartMatchReadExtraV94.setSample(mark),sample);
 await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy);
 await page.locator('#exCardPage').selectOption('2');
 assert.equal(await page.locator('#exCardCode').inputValue(),'WC');
}
async function search(page){
 await page.locator('#exSearch').click();
 await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy,null,{timeout:60000});
 return page.locator('#exResultSummary').innerText();
}
function assertCounts(text,{total,linked,unlinked,removed}){
 assert.match(text,new RegExp('Totalt\\s+'+total,'i'));
 assert.match(text,new RegExp('Kopplade\\s+'+linked,'i'));
 assert.match(text,new RegExp('Okopplade\\s+'+unlinked,'i'));
 if(removed!==undefined)assert.match(text,new RegExp('Tidigare borttagna\\s+'+removed,'i'));
}
async function stableSource(page){return page.evaluate(id=>{
 const source=SmartMatchReadTest.payload().cards['card:WC'],position=SmartMatchAppBridge.getPositions().find(item=>item.id===id);
 return {source,checks:structuredClone(position?.checks||{}),rowStages:structuredClone(position?.rowStages||{}),overrides:structuredClone(position?.overrides||{}),readChecks:structuredClone(SmartMatchReadTest.payload().checks[id]||{})};
},linkedId);}
async function exportProject(page){
 await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');
 await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled,null,{timeout:60000});
 const downloading=page.waitForEvent('download',{timeout:60000});await page.locator('#smartExportBuild').click();const download=await downloading,bytes=fs.readFileSync(await download.path());assert(bytes.length>1000);
 return bytes;
}
async function embeddedPayload(bytes){
 const document=await PDFDocument.load(bytes),value=document.catalog.lookup(PDFName.of('TillsynoSmartMatchV36Data'));
 assert(value?.decodeText,'exported PDF embeds SmartMatch project data');return JSON.parse(value.decodeText());
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const input=await fixture(),context=await contextFor(browser),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url());await openProject(page,input,1);
  const before=await stableSource(page);assert.deepEqual(before.checks,{'wc-lock':true,'wc-close':false});assert.equal(before.overrides['wc-lock'].minutes,17);
  assert.equal(await page.evaluate(()=>SmartMatchReadTest.getRemovedReadPositions().length),1,'fixture starts with one deliberate tombstone');
  await openReview(page);let summary=await search(page);assertCounts(summary,{total:2,linked:1,unlinked:1,removed:1});
  assert.equal(await page.locator('#exHits .exHit').count(),2,'linked and removed physical stamps both stay visible in review');
  const linkedRow=page.locator('#exHits .exHit').filter({hasText:/Redan kopplad/i}),removedRow=page.locator('#exHits .exHit').filter({hasText:/Tidigare borttagen/i});
  assert.equal(await linkedRow.count(),1);assert.equal(await removedRow.count(),1);
  assert(await linkedRow.locator('input[type="checkbox"]').isDisabled(),'already linked stamp cannot be selected twice');
  assert(await removedRow.locator('input[type="checkbox"]').isEnabled(),'removed stamp can explicitly be linked again');
  assert(await removedRow.locator('input[type="checkbox"]').isChecked(),'removed stamp is selected for the reviewed restore');
  await page.locator('#exApply').click();
  try{await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().length===2&&SmartMatchReadTest.getRemovedReadPositions().length===1&&!SmartMatchReadExtraV94.state().busy,null,{timeout:60000});}
  catch(error){error.message+='\nRelink state: '+JSON.stringify(await page.evaluate(()=>({status:document.getElementById('exStatus')?.textContent,positions:SmartMatchAppBridge.getPositions().map(item=>({id:item.id,code:item.code,page:item.page,rect:item.rect})),removed:SmartMatchReadTest.getRemovedReadPositions(),review:SmartMatchReadExtraV94.state()})));throw error;}
  assert.deepEqual(await stableSource(page),before,'restoring one stamp leaves the original card source, checks, row stage and time override byte-for-byte intact');
  assert.equal((await page.evaluate(()=>SmartMatchAppBridge.getPositions().filter(item=>item.code==='WC').length)),2,'exactly one physical WC link is restored');
  const restored=await page.evaluate(()=>{
   const position=SmartMatchAppBridge.getPositions().find(item=>item.manual&&item.restoredFromId),payload=SmartMatchReadTest.payload(),sourceHit=payload.matching.hits.find(hit=>hit.positionId===position?.restoredFromId);
   return {position:position?structuredClone(position):null,tombstones:structuredClone(payload.removedReadPositions||[]),sourceHit:sourceHit?structuredClone(sourceHit):null,storedChecks:structuredClone(payload.checks[position?.id]||{})};
  });
  assert(restored.position,'reviewed restore creates one explicit manual live position');assert.equal(restored.position.restoredFromId,removedId);
  assert(Object.values(restored.position.checks||{}).every(value=>value!==true),'restored manual position starts with every product unchecked');assert(Object.values(restored.storedChecks).every(value=>value!==true));
  assert.deepEqual(restored.tombstones.map(item=>item.id),[removedId],'old tombstone remains as a permanent suppression for a future full scan');assert.equal(restored.sourceHit.selected,false,'old automatic hit stays suppressed');
  summary=await search(page);assertCounts(summary,{total:2,linked:2,unlinked:0,removed:0});
  assert.equal(await page.locator('#exHits .exHit').count(),2);assert.equal(await page.locator('#exHits .exHit input[type="checkbox"]:disabled').count(),2,'a repeated search shows both physical stamps as linked');assert(await page.locator('#exApply').isDisabled(),'no duplicate batch can be applied');
  await page.locator('#exClose').click();const exported=await exportProject(page),saved=await embeddedPayload(exported);
  assert.equal(saved.manualPositions.filter(item=>item.code==='WC').length,1,'the restored stamp is portable as one manual position');
  assert.deepEqual(saved.readTestData.removedReadPositions?.map(item=>item.id),[removedId],'portable project retains the old auto-hit suppression tombstone');
  assert.equal(saved.readTestData.matching.hits.find(hit=>hit.positionId===removedId)?.selected,false,'portable project keeps the old automatic hit deselected');
  const savedManual=saved.manualPositions.find(item=>item.restoredFromId===removedId);assert(savedManual);assert(Object.values(saved.instances[savedManual.id]?.checks||{}).every(value=>value!==true),'portable restored manual link stays unchecked');
  assert.deepEqual(saved.readTestData.cards['card:WC'],before.source);assert.deepEqual(saved.instances[linkedId].checks,before.checks);assert.deepEqual(saved.instances[linkedId].overrides,before.overrides);assert.deepEqual(errors,[]);
  await context.close();

  const fresh=await contextFor(browser),reopened=await fresh.newPage(),reopenErrors=[];reopened.on('pageerror',error=>reopenErrors.push(error.message));
  try{
   await reopened.goto(url());await openProject(reopened,exported,2);
   assert.deepEqual(await stableSource(reopened),before,'portable reopen retains original source and checked work');
   const reopenedState=await reopened.evaluate(()=>({positions:SmartMatchAppBridge.getPositions().map(item=>structuredClone(item)),read:SmartMatchReadTest.payload()}));
   assert.equal(reopenedState.positions.length,2,'portable reopen contains exactly the original live link and one restored manual link');assert.equal(reopenedState.positions.filter(item=>item.manual&&item.restoredFromId===removedId).length,1,'portable reopen cannot duplicate the restored geometry');
   assert.deepEqual(reopenedState.read.removedReadPositions.map(item=>item.id),[removedId]);assert.equal(reopenedState.read.matching.hits.find(hit=>hit.positionId===removedId)?.selected,false);
   assert(Object.values(reopenedState.positions.find(item=>item.restoredFromId===removedId).checks||{}).every(value=>value!==true),'restored link remains unchecked after reopen');
   assert.deepEqual(await reopened.evaluate(()=>window.__relinkCalls),{scans:0,workers:0,work:0},'opening the saved relinked PDF performs no stamp scan, OCR or product reread');
   assert.deepEqual(reopenErrors,[]);
  }finally{await fresh.close();}
  console.log('PASS TEST 9.14: total/linked/unlinked/removed review, explicit one-stamp relink, duplicate-safe repeat search, portable clean reopen with source/checks/time intact and no scan');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
