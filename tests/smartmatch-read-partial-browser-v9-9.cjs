/* Generated 77-card documents exercise partial review and portable deferred
 * work. No customer PDFs, internet OCR or production authentication changes. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),revision='9-9',metadataKey=PDFName.of('TillsynoSmartMatchV36Data');
const devices={desktop:{viewport:{width:1440,height:1000}},ipad:{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2}};
const deviceNames=process.env.SMARTMATCH_DEVICE?[process.env.SMARTMATCH_DEVICE]:Object.keys(devices);
const codeRect={x:.08,y:.08,w:.84,h:.06},tableRect={x:.06,y:.16,w:.84,h:.26};
const server=http.createServer((request,response)=>{
 const filename=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!filename.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(filename)]||'application/octet-stream');response.end(fs.readFileSync(filename));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v${revision}.html`;
const labelFor=page=>page===8||page===51?'GS23':page===61?'':'K'+String(page).padStart(3,'0');
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([1200,900]),labels=[];
 for(let page=2;page<=78;page++){
  const card=document.addPage([595,842]),code=labelFor(page);
  if(code)card.drawText('Beslagskod: '+code,{x:60,y:750,size:20,font});
  card.drawText('Komponent',{x:45,y:680,size:12,font});card.drawText('Produkt',{x:220,y:680,size:12,font});
  card.drawText('Lås',{x:45,y:645,size:12,font});card.drawText('EL580',{x:220,y:645,size:12,font});
  card.drawText('Dörrstängare',{x:45,y:610,size:12,font});card.drawText('TS93',{x:220,y:610,size:12,font});
  if(code&&page!==51&&page!==78)labels.push(code);
 }
 labels.forEach((code,index)=>plan.drawText(code,{x:50+(index%7)*160,y:830-Math.floor(index/7)*65,size:15,font}));
 assert.equal(document.getPageCount(),78);assert.equal(labels.length,74);
 return Buffer.from(await document.save());
}
async function legacyFixture(gsColumns=false){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([595,842]);
 const hits=[{page:1,code:'GS23',rect:[60,650,160,675],box:{x:60/595,y:(842-675)/842,w:100/595,h:25/842},selected:true,source:'PDF-text',scanSource:'read-tool-v9',order:870000},{page:1,code:'GS23',rect:[240,500,340,525],box:{x:240/595,y:(842-525)/842,w:100/595,h:25/842},selected:true,source:'PDF-text',scanSource:'read-tool-v9',order:870001}];
 for(const hit of hits)plan.drawText(hit.code,{x:hit.rect[0],y:hit.rect[1],size:18,font});
 const cards={};
 for(const [index,code]of ['GS23','WC'].entries()){
  const page=index+2,card=document.addPage([595,842]),id='legacy-card:'+code,labels=['Lås','Dörrstängare'],work=gsColumns?['EL580','TS93']:['Lås EL580','Dörrstängare TS93'];card.drawText('Beslagskod: '+code,{x:60,y:750,size:20,font});
  if(gsColumns){for(const [text,x]of [['Komponent',45],['Övrigt',220],['Mont av',470]])card.drawText(text,{x,y:690,size:12,font});work.forEach((text,row)=>{const y=655-row*35;card.drawText(labels[row],{x:45,y,size:12,font});card.drawText(text,{x:220,y,size:12,font});card.drawText('GS',{x:470,y,size:12,font});});}
  else work.forEach((text,row)=>card.drawText(text,{x:60,y:670-row*35,size:14,font}));
  cards[id]={id,page,code,originalCardCode:code,header:'Beslagskod: '+code,codeRect,tableRect,bounds:{x:.06,y:.08,w:.86,h:.34},rawTable:work.join('\n'),work,workItems:work.map((text,row)=>({text,label:gsColumns?labels[row]:text,value:gsColumns?text:'',key:code+'-'+row,section:'Övrigt',sectionKey:'ovrigt',responsibility:gsColumns?'GS':undefined})),workPolicy:gsColumns?'gs-install-v2':'all',workState:'ready',choices:[code],method:'PDF-text',confidence:100};
 }
 const readTestData={schema:1,phase:'full',sourceId:'generated:legacy-v98',rects:{code:codeRect,table:tableRect},pages:[2,3],cards,checks:{},matching:{version:2,hits,pages:[{page:1,count:2,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated TEST 9.8 project'};
 const payload={schema:6,projectId:'project:legacy-v98',projectRevision:1,instances:{},automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return {bytes:Buffer.from(await document.save()),read:readTestData};
}
async function contextFor(browser,device){
 const context=await browser.newContext({...device,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__calls={scans:0,work:0,workers:0,guides:0};window.__seenWork=[];window.__scannedCodes=[];
  window.Tesseract={async createWorker(){__calls.workers++;throw Error('Native fixture must never start OCR');}};
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:value=>{matcher={...value,scan:async options=>{__calls.scans++;__scannedCodes.push(options.codes);if(window.__forbidScan)throw Error('Portable project must never rescan');if(window.__failNextDrawing){window.__failNextDrawing=false;throw Error('Generated drawing search failure');}return value.scan(options);}};}});
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:value=>{work={...value,read:options=>{__calls.work++;__seenWork.push(options.text);if(window.__forbidWork)throw Error('Processed products must never be read again');if(window.__failProductAt===__calls.work)return {resolved:false,work:[],items:[],warnings:['Generated missing installer column']};return value.read(options);}};}});
  const show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')__calls.guides++;return show.call(this);};
 });
 return context;
}
async function setRect(page,kind,rect){for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel(kind+' '+label,{exact:true}).evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);}
async function idle(page){await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:120000});}
async function start77(page,input){
 await page.goto(url());await page.locator('#rtMultiFiles').setInputFiles({name:'generated-77-cards.pdf',mimeType:'application/pdf',buffer:input});await page.waitForSelector('#rtDialog[open]');
 await page.locator('#rtReadPhase').selectOption('codes');await page.locator('#rtImageMode').selectOption('text');await page.locator('#rtPage').fill('2');await page.locator('#rtPage').press('Tab');await setRect(page,'Kod',codeRect);
 for(const selector of ['.rtReadingInstructions','#rtSetupDetails']){const details=page.locator(selector);if(await details.count()&&!await details.evaluate(node=>node.open))await details.locator(':scope > summary').click();}
 await page.locator('#rtPages').fill('2-78');await page.locator('.rtReadingInstructions > summary').click();await page.locator('#rtPreview').click();await idle(page);assert.equal(await page.locator('#rtResults .rtResult').count(),77,'all 77 selected card pages are retained for review');assert.equal(await page.evaluate(()=>__calls.work+__calls.workers),0,'code-first review reads no products and starts no OCR');
}
async function ready(page,count){await page.waitForFunction(expected=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===expected&&document.getElementById('pwScanOverlay').hidden,count,{timeout:90000});}
const read=page=>page.evaluate(()=>SmartMatchReadTest.payload());
async function exportPdf(page){
 await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled,null,{timeout:90000});
 const downloading=page.waitForEvent('download');await page.locator('#smartExportBuild').click();const bytes=fs.readFileSync(await(await downloading).path());assert(bytes.length>1000);await page.locator('#smartExportClose').click();
 const document=await PDFDocument.load(bytes),payload=JSON.parse(document.catalog.lookup(metadataKey).decodeText());return {bytes,payload,pages:document.getPageCount()};
}
async function reopen(browser,device,saved,expected,count){
 const context=await contextFor(browser,device),page=await context.newPage();await page.goto(url());await page.evaluate(()=>{window.__forbidScan=true;window.__forbidWork=true;});await page.locator('#pwFile').setInputFiles({name:'generated-partial-project.pdf',mimeType:'application/pdf',buffer:saved});await ready(page,count);
 assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0},'portable partially reviewed project opens without OCR, matching, products or a guide');
 const actual=await read(page);assert.deepEqual({...actual,sourceId:expected.sourceId},expected,'portable PDF preserves links, explicit selections and every deferred snapshot');
 return {context,page};
}
async function assertCompact(page,device){
 const layout=await page.evaluate(()=>{
  const dialog=document.getElementById('rtDialog'),list=document.getElementById('rtResults'),viewport=document.getElementById('rtViewport'),rows=[...list.querySelectorAll('.rtResult')].filter(node=>!node.hidden),box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
  const listBox=box(list);return {dialog:box(dialog),list:listBox,preview:box(viewport),rows:rows.slice(0,10).map(box),visibleRows:rows.filter(node=>{const r=node.getBoundingClientRect();return r.top>=listBox.y-1&&r.bottom<=listBox.bottom+1;}).length,innerWidth,innerHeight,scroll:dialog.scrollWidth,client:dialog.clientWidth};
 });
 assert(layout.scroll<=layout.client+2,'review dialog has no horizontal overflow');
 if(device==='desktop'){
  assert(layout.dialog.width>=layout.innerWidth*.9,'desktop review uses the available screen width');
  assert(layout.list.y>=layout.preview.bottom-1,'compact card list starts below the drawing preview');
  assert(layout.rows.length>=5);assert(layout.rows[4].bottom-layout.rows[0].y<500,'at least five compact card rows fit in a review viewport');assert(layout.visibleRows>=5,'at least five card rows are actually visible together below the preview');
 }
}
async function confirmAndOpen(page,count){
 assert(await page.locator('#rtStart').isDisabled(),'partial results still require an explicit drawing review');
 await page.locator('#rtMatchApproval').check();assert(await page.locator('#rtStart').isEnabled(),'unmatched cards do not prevent opening the reviewed known links');
 await page.locator('#rtStart').click();await ready(page,count);
}
async function noArbitraryPrimary(browser,input){
 const context=await contextFor(browser,devices.desktop),page=await context.newPage();
 try{
  await start77(page,input);assert.equal(await page.locator('.rtMatchRow').count(),73,'both ambiguous GS23 pages are excluded from automatic drawing matching');
  await page.locator('#rtReviewContinue').click();await idle(page);assert.match(await page.locator('#rtReviewCounts').innerText(),/3 åsidosatta/);
  await confirmAndOpen(page,73);const data=await read(page),parked=Object.values(data.deferredCards);
  assert.deepEqual(parked.map(card=>card.page).sort((a,b)=>a-b),[8,51,61],'continue never arbitrarily chooses the first duplicate as the primary card');
  assert(!Object.values(data.cards).some(card=>card.code==='GS23'));assert(data.pages.includes(8)&&data.pages.includes(51)&&data.pages.includes(61),'parking a card never removes its PDF page');
  console.log('PASS desktop: continuing without a duplicate choice parks both GS23 pages and the blank card; 73 safe links remain usable');
 }finally{await context.close();}
}
async function existingProject(browser){
 const input=await legacyFixture(),context=await contextFor(browser,devices.desktop),page=await context.newPage();
 try{
  // First prove this generated pre-deferred payload really opens in TEST 9.8.
  await page.goto(url().replace('v9-9.html','v9-8.html'));await page.locator('#pwFile').setInputFiles({name:'generated-test-9-8.pdf',mimeType:'application/pdf',buffer:input.bytes});await ready(page,2);assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});
  await page.goto(url());await page.locator('#pwFile').setInputFiles({name:'generated-test-9-8.pdf',mimeType:'application/pdf',buffer:input.bytes});await ready(page,2);assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});
  const data=await read(page);assert.equal(Object.keys(data.cards).length,2);assert(Object.values(data.cards).some(card=>card.code==='WC'),'existing valid unmatched cards remain accepted');assert.equal(Object.keys(data.deferredCards||{}).length,0);
  const saved=await exportPdf(page),fresh=await reopen(browser,devices.desktop,saved.bytes,data,2);await fresh.context.close();
  console.log('PASS desktop: existing TEST 9.8 project, including a valid unmatched card, opens and re-exports without any scan');
 }finally{await context.close();}
}
async function productFailure(browser){
 const input=await legacyFixture(true),context=await contextFor(browser,devices.desktop),page=await context.newPage();
 try{
  await page.goto(url());await page.locator('#pwFile').setInputFiles({name:'generated-existing-gs-products.pdf',mimeType:'application/pdf',buffer:input.bytes});await ready(page,2);
  const id=await page.evaluate(()=>SmartMatchAppBridge.getPositions()[0].id);await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);await page.waitForSelector('#pwProtocol[open]');await page.locator('#pwChecklist .rtWorkRow input').first().check();await page.locator('#pwProtocolClose').click();
  const before=await read(page),beforeWork=await page.evaluate(id=>SmartMatchAppBridge.readWorkState(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);
  await page.locator('#pwToolMenuButton').click();await page.locator('#rtMenuProducts').click();await page.waitForSelector('#rtDialog[open]');await page.evaluate(()=>{window.__failProductAt=1;});await page.locator('#rtPreview').click();await idle(page);
  assert.equal(await page.evaluate(()=>__calls.work),2);assert.match(await page.locator('#rtReviewCounts').innerText(),/1 klara.*1 behöver åtgärdas/);assert(await page.locator('#rtStart').isDisabled(),'an unresolved product column is never silently accepted');
  await page.locator('#rtReviewContinue').click();await idle(page);assert(await page.locator('#rtStart').isEnabled(),'explicit continuation can save the other completed product card');await page.locator('#rtStart').click();await ready(page,2);
  const partial=await read(page);assert.equal(await page.evaluate(()=>SmartMatchReadTest.getDeferredCardCount()),1);assert.deepEqual(Object.keys(partial.pendingWorkCards),['legacy-card:GS23']);assert.deepEqual(partial.cards['legacy-card:GS23'],before.cards['legacy-card:GS23'],'failed product rereading preserves the full previous product list');assert.deepEqual(partial.matching,before.matching,'deferred product work cannot alter reviewed drawing links');assert.deepEqual(await page.evaluate(id=>SmartMatchAppBridge.readWorkState(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id),beforeWork,'previous check and time state survive the failed read');
  const saved=await exportPdf(page),fresh=await reopen(browser,devices.desktop,saved.bytes,partial,2);try{
   const next=fresh.page;await next.locator('#pwDeferredCards').click();await next.waitForSelector('#rtDialog[open]');assert.equal(await next.locator('#rtResults .rtResult').count(),1,'later product review contains only the single failed card');assert.equal(await next.evaluate(()=>__calls.work+__calls.scans+__calls.workers),0,'entering deferred product review does not read anything automatically');
   await next.evaluate(()=>{window.__forbidWork=false;});await next.locator('#rtPreview').click();await idle(next);assert.equal(await next.evaluate(()=>__calls.work),1,'explicit retry reads only the failed product card');assert.equal(await next.evaluate(()=>__calls.scans+__calls.workers),0,'product retry never repeats drawing matching or native-text OCR');assert(await next.locator('#rtStart').isEnabled());await next.locator('#rtStart').click();await ready(next,2);
   const completed=await read(next);assert.equal(await next.evaluate(()=>SmartMatchReadTest.getDeferredCardCount()),0);assert.deepEqual(completed.cards['legacy-card:WC'],partial.cards['legacy-card:WC'],'the successful product card is not read again');assert.deepEqual(completed.matching,partial.matching);assert.deepEqual(completed.cards['legacy-card:GS23'].work,['EL580','TS93']);
   assert.deepEqual(await next.evaluate(id=>SmartMatchAppBridge.readWorkState(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id),beforeWork,'successful later retry preserves the original door check and work time');
   const completeSaved=await exportPdf(next),last=await reopen(browser,devices.desktop,completeSaved.bytes,completed,2);await last.context.close();
  }finally{await fresh.context.close();}
  console.log('PASS desktop: one failed GS product column can be deferred without losing products/checks/time; portable retry reads only that card');
 }finally{await context.close();}
}
async function allDeferred(browser){
 const input=await legacyFixture(),document=await PDFDocument.load(input.bytes);for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.delete(PDFName.of(key));
 const context=await contextFor(browser,devices.desktop),page=await context.newPage();
 try{
  await page.goto(url());await page.locator('#rtMultiFiles').setInputFiles({name:'generated-unread-small.pdf',mimeType:'application/pdf',buffer:Buffer.from(await document.save())});await page.waitForSelector('#rtDialog[open]');await page.locator('#rtReadPhase').selectOption('codes');await page.locator('#rtImageMode').selectOption('text');await setRect(page,'Kod',codeRect);
  for(const selector of ['.rtReadingInstructions','#rtSetupDetails']){const details=page.locator(selector);if(await details.count()&&!await details.evaluate(node=>node.open))await details.locator(':scope > summary').click();}await page.locator('#rtPages').fill('2-3');await page.locator('.rtReadingInstructions > summary').click();await page.locator('#rtPreview').click();await idle(page);
  await page.locator('#rtResults .rtResult[data-page="3"] input').first().fill('GS23');assert.match(await page.locator('#rtReviewCounts').innerText(),/0 klara.*2 behöver åtgärdas/);assert(await page.locator('#rtReviewContinue').isEnabled(),'zero ready cards still allow an explicit manual-link project');await page.locator('#rtReviewContinue').click();await idle(page);await confirmAndOpen(page,0);
  const data=await read(page);assert.equal(Object.keys(data.cards).length,0);assert.equal(Object.keys(data.deferredCards).length,2);assert.deepEqual(data.matching.hits,[]);const saved=await exportPdf(page),fresh=await reopen(browser,devices.desktop,saved.bytes,data,0);try{
   assert.equal(await fresh.page.evaluate(()=>SmartMatchReadTest.getDeferredCardCount()),2);await fresh.page.locator('#pwDeferredCards').click();await fresh.page.waitForSelector('#rtDialog[open]');assert.equal(await fresh.page.locator('#rtResults .rtResult').count(),2);assert.match(await fresh.page.locator('#rtReviewCounts').innerText(),/0 klara.*2 åsidosatta/);assert(await fresh.page.locator('#rtReviewContinue').isEnabled(),'an all-deferred saved project can keep its zero-link state');await fresh.page.locator('#rtReviewContinue').click();await idle(fresh.page);await confirmAndOpen(fresh.page,0);assert.equal(await fresh.page.evaluate(()=>__calls.scans+__calls.work+__calls.workers),0,'keeping all queued cards never invents links or starts automatic reading');
  }finally{await fresh.context.close();}
  console.log('PASS desktop: all-deferred zero-link project can be explicitly opened, saved and reopened without selecting an arbitrary card');
 }finally{await context.close();}
}
/* The scenarios below use the review controls, not internal reader state. */
async function exercise(browser,deviceName,input){
 const device=devices[deviceName];assert(device,'Unknown SMARTMATCH_DEVICE: '+deviceName);
 const context=await contextFor(browser,device),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await start77(page,input);
  // Selectors supplied by the review module keep the page-search and duplicate
  // actions accessible on both mouse and touch devices.
  await assertCompact(page,deviceName);
  if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v99-review-'+deviceName+'.png'});
  assert.match(await page.locator('#rtReviewCounts').innerText(),/77 kort.*74 klara.*3 behöver åtgärdas/);
  await page.locator('#rtReviewFilter').selectOption('attention');assert.equal(await page.locator('#rtResults .rtResult:visible').count(),3,'issues-only filter shows both duplicate cards and the blank header');
  await page.locator('#rtReviewSearch').fill('sida 51');assert.equal(await page.locator('#rtResults .rtResult:visible').count(),1);assert.match(await page.locator('#rtResults .rtResult:visible h3').innerText(),/sida 51/);
  if(process.env.SMARTMATCH_SCREENSHOTS){await page.locator('#rtReviewToolbar').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/smartmatch-v99-filter-'+deviceName+'.png'});}
  await page.locator('#rtReviewNext').click();assert.equal(await page.locator('#rtReviewSearch').inputValue(),'','next issue clears a narrow search so the next issue is visible');assert.equal(await page.locator('#rtPage').inputValue(),'8','next issue opens the first ambiguous card directly');
  await page.locator('#rtReviewSearch').fill('sida 8');await page.locator('#rtResults .rtResult:visible .rtChooseDuplicate').click();
  await page.locator('#rtReviewSearch').fill('');assert.equal(await page.locator('#rtResults .rtResult:visible').count(),1,'explicit duplicate selection leaves only the blank header needing correction');
  await page.locator('#rtReviewContinue').click();await idle(page);assert.match(await page.locator('#rtReviewCounts').innerText(),/2 åsidosatta/);assert.equal(await page.locator('.rtMatchRow').count(),74,'the explicitly chosen GS23 card is now matched without rereading all card pages');
  // A real search exception must not trap the user or invent new links. The
  // user explicitly accepts retaining only the last successfully read links.
  await page.locator('#rtImageMode').selectOption('full');await page.evaluate(()=>{window.__failNextDrawing=true;});await page.locator('#rtFind').click();await idle(page);assert.match(await page.locator('#rtStatus').innerText(),/Generated drawing search failure/);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#rtReviewContinue').click();await idle(page);assert.equal(await page.locator('.rtMatchRow').count(),74);assert.match(await page.locator('#rtDrawingResults').innerText(),/avbröts|behölls/);
  await confirmAndOpen(page,74);const data=await read(page);
  assert.equal(Object.keys(data.cards).length,75);assert.deepEqual(Object.values(data.deferredCards).map(card=>card.page).sort((a,b)=>a-b),[51,61]);
  assert.equal(Object.values(data.cards).find(card=>card.code==='GS23').page,8,'all GS23 positions use the explicit page choice');
  assert(Object.values(data.cards).some(card=>card.page===78),'a valid card with no drawing hit remains in the project');
  assert(!data.matching.hits.some(hit=>hit.code===labelFor(78)),'the unmatched valid card gets no fabricated drawing link');
  const saved=await exportPdf(page);assert.equal(saved.pages,78,'all source pages survive partial review and project export');assert.deepEqual(saved.payload.readTestData,data);
  const fresh=await reopen(browser,device,saved.bytes,data,74);try{
   assert.equal(await fresh.page.evaluate(()=>SmartMatchReadTest.getDeferredCardCount()),2);
   if(process.env.SMARTMATCH_SCREENSHOTS)await fresh.page.screenshot({path:'/tmp/smartmatch-v99-project-'+deviceName+'.png'});
   const beforeDeferred=await read(fresh.page);await fresh.page.locator('#pwDeferredCards').click();await fresh.page.waitForSelector('#rtDialog[open]');assert.equal(await fresh.page.locator('#rtResults .rtResult').count(),2,'explicit later review shows only the two queued cards');
   assert.deepEqual(await fresh.page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:1},'opening queued cards performs no automatic OCR, matching or product reading');assert.deepEqual(await read(fresh.page),beforeDeferred,'opening the review has no effect on saved work');
   await fresh.page.locator('#rtReviewFilter').selectOption('all');assert.match(await fresh.page.locator('#rtReviewCounts').innerText(),/2 åsidosatta/,'resuming preserves the explicit duplicate decision instead of requiring it again');
   await fresh.page.locator('#rtReviewSearch').fill('sida 61');const blank=fresh.page.locator('#rtResults .rtResult:visible');assert.equal(await blank.count(),1);await blank.locator('input').first().fill('NY61');await blank.locator('.rtDeferCard').click();
   await fresh.page.evaluate(()=>{window.__forbidScan=false;});await fresh.page.locator('#rtFind').click();await idle(fresh.page);assert.deepEqual(await fresh.page.evaluate(()=>__scannedCodes),[['NY61']],'manual correction searches just the newly included code');
   assert.equal(await fresh.page.locator('.rtMatchRow').count(),74,'existing valid drawing links stay untouched when the corrected card has no hit');
   await confirmAndOpen(fresh.page,74);const corrected=await read(fresh.page);assert.equal(await fresh.page.evaluate(()=>SmartMatchReadTest.getDeferredCardCount()),1);assert(Object.values(corrected.cards).some(card=>card.page===61&&card.code==='NY61'));
   for(const [id,card]of Object.entries(data.cards))assert.deepEqual(corrected.cards[id],card,'later correction never rereads or changes a previously processed card');
   assert.deepEqual(corrected.matching.hits,data.matching.hits);assert.equal(await fresh.page.evaluate(()=>__calls.work+__calls.workers),0);
   const correctedSaved=await exportPdf(fresh.page),last=await reopen(browser,device,correctedSaved.bytes,corrected,74);await last.context.close();
  }finally{await fresh.context.close();}
  console.log('PASS '+deviceName+': 77-card compact review, page search, next issue, explicit GS23 duplicate choice, search failure continuation, 74-link portable reopen and later single-code correction without rereading known cards');
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const input=await fixture();if(deviceNames.includes('desktop')){await existingProject(browser);await productFailure(browser);await allDeferred(browser);await noArbitraryPrimary(browser,input);}for(const name of deviceNames)await exercise(browser,name,input);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
