/* Portable-project regression: switch between unrelated projects in one tab,
 * finish an older in-flight export, and reopen equivalent PDF metadata forms.
 * Generated drawings only. No customer files, auth changes or network APIs. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,PDFString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),revision=process.env.READ_PROJECT_REVISION||'9-7';
const keys=['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'].map(PDFName.of);
const device={viewport:{width:1366,height:900},acceptDownloads:true};
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v${revision}.html`;
async function fixture(code,count){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([595,842]),card=document.addPage([595,842]);
 const work=['Lås '+code,'Dörrstängare '+code],codeRect={x:.08,y:.08,w:.78,h:.06},tableRect={x:.08,y:.16,w:.80,h:.25},bounds={x:.06,y:.06,w:.84,h:.38};
 const hits=[];
 for(let index=0;index<count;index++){
  const x=60+index*150,y=640-index*90,rect=[x,y,x+100,y+25];plan.drawText(code,{x,y,size:18,font});
  hits.push({page:1,code,rect,box:{x:x/595,y:(842-y-25)/842,w:100/595,h:25/842},selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000+index,label:code});
 }
 card.drawText('Beslagskod: '+code,{x:60,y:750,size:20,font});work.forEach((value,index)=>card.drawText(value,{x:60,y:670-index*30,size:15,font}));
 const id='generated-card:'+code,readTestData={schema:1,phase:'full',sourceId:'generated:'+code,rects:{code:codeRect,table:tableRect},pages:[2],cards:{[id]:{id,page:2,code,header:'Beslagskod: '+code,rawTable:work.join('\n'),work,workState:'ready',workPolicy:'all',codeRect,tableRect,bounds,choices:[code],method:'PDF-text',confidence:100}},checks:{},matching:{version:2,hits,pages:[{page:1,count,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated '+code};
 const payload={schema:6,projectId:'project:'+code,projectRevision:1,instances:{},automationItems:[],readTestData};
 keys.forEach(key=>document.catalog.set(key,PDFHexString.fromText(JSON.stringify(payload))));
 return {bytes:Buffer.from(await document.save()),code,count,payload};
}
async function contextFor(browser){
 const context=await browser.newContext(device);
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__calls={scans:0,work:0,workers:0,guides:0};
  window.Tesseract={async createWorker(){__calls.workers++;throw Error('A prepared project must never start OCR');}};
  for(const [name,count]of [['SmartMatchReadMatcher','scans'],['SmartMatchReadWork','work']]){
   let value;Object.defineProperty(window,name,{configurable:true,get:()=>value,set:next=>{value={...next,[count==='scans'?'scan':'read']:()=>{__calls[count]++;throw Error('A prepared project must never rescan');}};}});
  }
  const show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')__calls.guides++;return show.call(this);};
 });
 return context;
}
async function open(page,input,name=input.code+'.pdf'){
 await page.locator('#pwFile').setInputFiles({name,mimeType:'application/pdf',buffer:input.bytes});
 await page.waitForFunction(count=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===count&&document.getElementById('pwScanOverlay').hidden,input.count,{timeout:60000});
 assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});
 assert.deepEqual(await page.evaluate(()=>[...new Set(SmartMatchAppBridge.getPositions().map(position=>position.code))]),[input.code]);
}
async function closeProject(page){
 if(await page.locator('#smartExportDialog').evaluate(node=>node.open))await page.locator('#smartExportClose').click();
 await page.locator('#pwFinishProject').click();
 await page.waitForFunction(()=>!SmartMatchAppBridge.getPdf(),null,{timeout:30000});
}
async function dialog(page){await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');}
async function exportReady(page){await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled,null,{timeout:60000});}
async function exportPdf(page){
 await dialog(page);await exportReady(page);const downloading=page.waitForEvent('download');await page.locator('#smartExportBuild').click();
 const bytes=fs.readFileSync(await(await downloading).path());assert(bytes.length>1000);await page.locator('#smartExportClose').click();return bytes;
}
async function metadata(bytes){const document=await PDFDocument.load(bytes);return JSON.parse(document.catalog.lookup(keys[0]).decodeText());}
async function assertExport(bytes,expected){
 const data=await metadata(bytes);assert.equal(data.projectId,expected.payload.projectId,'export must belong to the currently opened project');
 assert.deepEqual(Object.values(data.readTestData.cards).map(card=>card.code),[expected.code]);assert.equal(data.readTestData.matching.hits.length,expected.count);
 return data;
}
async function transformed(input,mode){
 const document=await PDFDocument.load(input.bytes),raw=document.catalog.get(keys[0]);
 if(mode==='indirect-both'){const ref=document.context.register(raw);keys.forEach(key=>document.catalog.set(key,ref));}
 else if(mode==='indirect-36-direct-30')document.catalog.set(keys[0],document.context.register(raw));
 else if(mode==='broken-36-good-30')document.catalog.set(keys[0],PDFString.of('generated malformed payload'));
 else if(mode==='hex-literal')keys.forEach(key=>document.catalog.set(key,PDFString.of(raw.asString())));
 else if(mode==='null-36-good-30'){const data=JSON.parse(raw.decodeText());data.readTestData=null;document.catalog.set(keys[0],PDFHexString.fromText(JSON.stringify(data)));}
 else throw Error('Unknown transform: '+mode);
 return {...input,bytes:Buffer.from(await document.save())};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const a=await fixture('GS71',2),b=await fixture('GS82',3),context=await contextFor(browser),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(url());
  await open(page,a);await assertExport(await exportPdf(page),a);await closeProject(page);await open(page,b);const savedB=await exportPdf(page);await assertExport(savedB,b);
  assert.deepEqual(errors,[]);await context.close();
  const fresh=await contextFor(browser),next=await fresh.newPage();await next.goto(url());await open(next,{...b,bytes:savedB},'exported-project-B.pdf');await fresh.close();
  console.log('PASS A → close → B in one tab: B export contains B cards/links and opens in a clean browser without scanning');

  const delayedContext=await contextFor(browser),delayed=await delayedContext.newPage();await delayed.goto(url());await open(delayed,a);
  await delayed.evaluate(()=>{
   const load=PDFLib.PDFDocument.load;window.__pauseOneExport=true;window.__oldExportBuilt=false;
   PDFLib.PDFDocument.load=async function(...args){
    const paused=window.__pauseOneExport;if(paused){window.__pauseOneExport=false;await new Promise(resolve=>{window.__releaseOldExport=resolve});}
    const document=await load.apply(this,args);
    if(paused){const save=document.save;document.save=async function(...options){try{return await save.apply(this,options)}finally{window.__oldExportBuilt=true;}};}
    return document;
   };
  });
  await dialog(delayed);await delayed.waitForFunction(()=>typeof __releaseOldExport==='function');await closeProject(delayed);await open(delayed,b);await dialog(delayed);await exportReady(delayed);
  await delayed.evaluate(()=>__releaseOldExport());await delayed.waitForFunction(()=>__oldExportBuilt,null,{timeout:60000});
  await delayed.locator('#smartExportClose').click();await assertExport(await exportPdf(delayed),b);await delayedContext.close();
  console.log('PASS an older A export finishing after B opens cannot replace B export bytes or verification');

  for(const mode of ['indirect-both','indirect-36-direct-30','broken-36-good-30','hex-literal']){
   const changed=await transformed(b,mode),context=await contextFor(browser),page=await context.newPage();await page.goto(url());await open(page,changed,'prepared-'+mode+'.pdf');
   assert.deepEqual((await page.evaluate(()=>SmartMatchReadTest.payload())).matching,b.payload.readTestData.matching);
   await assertExport(await exportPdf(page),b);await context.close();console.log('PASS metadata '+mode+': prepared cards/links restore and re-export without OCR/search/guide');
  }
  {
   const authoritative=await transformed(b,'null-36-good-30'),context=await contextFor(browser),page=await context.newPage();await page.goto(url());
   await page.locator('#pwFile').setInputFiles({name:'newer-null-older-complete.pdf',mimeType:'application/pdf',buffer:authoritative.bytes});
   await page.waitForFunction(()=>/Kunde inte läsa ritningen/.test(document.getElementById('pwState').textContent));
   assert.equal(await page.evaluate(()=>!!SmartMatchAppBridge.getPdf()),false,'an explicit newer empty state cannot resurrect an older stale project');
   assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});await context.close();
   console.log('PASS valid newer null payload remains authoritative: no old state is revived and no scanning begins');
  }
  {
   const context=await contextFor(browser),page=await context.newPage();await page.goto(url());await open(page,b);
   const snapshot=await page.evaluate(()=>SmartMatchReadTest.payload());let downloads=0;page.on('download',()=>downloads++);
   await page.evaluate(()=>{window.__unexpectedPickers=0;window.showSaveFilePicker=()=>{__unexpectedPickers++;throw Error('An unavailable project must not create a save placeholder');};SmartMatchReadTest.restoreReadData(null);});
   await dialog(page);await page.locator('#smartExportRetry').waitFor({state:'visible'});
   assert(await page.locator('#smartExportBuild').isDisabled(),'missing live read data must not produce a supposedly verified project PDF');
   assert.match(await page.locator('#smartExportStatus').innerText(),/färdig granskad avläsning saknas/);
   assert.equal(await page.evaluate(()=>__unexpectedPickers),0);assert.equal(downloads,0);
   await page.evaluate(data=>{SmartMatchReadTest.restoreReadData(data);window.showSaveFilePicker=undefined;},snapshot);
   await page.locator('#smartExportRetry').click();await exportReady(page);
   const downloading=page.waitForEvent('download');await page.locator('#smartExportBuild').click();await assertExport(fs.readFileSync(await(await downloading).path()),b);
   assert.equal(downloads,1);assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});await context.close();
   console.log('PASS missing live reading blocks PDF/download/picker; restoring the checked snapshot allows a verified current-project export');
  }
  {
   const context=await contextFor(browser),page=await context.newPage();await page.goto(url().replace('v'+revision+'.html','v9-6.html'));await open(page,b,'generated-recovery-source.pdf');
   await page.evaluate(()=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions()[0]));await page.waitForSelector('#pwProtocol[open]');
   await page.locator('#pwChecklist .rtWorkRow input').first().check();await page.locator('#pwProtocolClose').click();
   const expected=await page.evaluate(()=>SmartMatchReadTest.payload());assert(Object.values(expected.checks).some(checks=>Object.values(checks).some(Boolean)));
   await page.evaluate(()=>SmartMatchSession.archiveCurrentProject({keepActive:true,name:'generated-recovery-from-9-6.pdf'}));
   await page.goto(url());const recovered=page.locator('.smRecentOpen').filter({hasText:'generated-recovery-from-9-6.pdf'});await recovered.waitFor();await recovered.click();
   await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===3&&document.getElementById('pwScanOverlay').hidden);
   const actual=await page.evaluate(()=>SmartMatchReadTest.payload());assert.deepEqual(actual.matching,expected.matching);assert.deepEqual(actual.checks,expected.checks);
   assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});
   const exported=await assertExport(await exportPdf(page),b);assert.deepEqual(exported.readTestData.checks,expected.checks);
   const oldSize=await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('smartmatch-read-test-v9-6-local-pdf-resume');request.onsuccess=()=>{const database=request.result,read=database.transaction('files').objectStore('files').getAll();read.onsuccess=()=>{resolve(read.result.find(record=>String(record.id).startsWith('project:'))?.blob?.size||0);database.close();};read.onerror=()=>reject(read.error);};request.onerror=()=>reject(request.error);}));
   assert(oldSize>1000,'recovering a new-version archive must retain the previous version backup');await context.close();
   console.log('PASS TEST 9.6 local archive/checks migrate to TEST 9.7, export current state and retain the old backup without scanning');
  }
  {
   const context=await contextFor(browser),page=await context.newPage();await page.goto(url().replace('v'+revision+'.html','v9-6.html'));await open(page,b,'generated-active-from-9-6.pdf');
   await page.evaluate(()=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions()[0]));await page.waitForSelector('#pwProtocol[open]');
   await page.locator('#pwChecklist .rtWorkRow input').first().check();await page.locator('#pwProtocolClose').click();
   const expected=await page.evaluate(()=>SmartMatchReadTest.payload());
   await page.evaluate(async()=>{await SmartMatchSession.cachePdf();SmartMatchAppBridge.snapshotForLocalArchive();await SmartMatchSession.flushDraft();});
   const oldState=async()=>page.evaluate(()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('smartmatch-read-test-v9-6-local-pdf-resume');
    request.onsuccess=()=>{const database=request.result,transaction=database.transaction(['files','drafts']),files=transaction.objectStore('files').getAll(),drafts=transaction.objectStore('drafts').getAll();
     transaction.oncomplete=async()=>{try{const values=[];for(const record of files.result){const bytes=record.blob?await record.blob.arrayBuffer():new ArrayBuffer(0),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');values.push({...record,blob:undefined,bytes:bytes.byteLength,hash});}resolve({files:values,drafts:drafts.result});}catch(error){reject(error);}finally{database.close();}};
     transaction.onerror=()=>reject(transaction.error);};request.onerror=()=>reject(request.error);
   }));
   const before=await oldState();assert(before.files.some(record=>record.id==='active'&&record.bytes>1000));assert(!before.files.some(record=>String(record.id).startsWith('project:')),'this case has no preexisting archive');assert(before.drafts.length>0);
   await page.goto(url());const recovered=page.locator('.smRecentOpen').filter({hasText:'generated-active-from-9-6.pdf'});await recovered.waitFor();await recovered.click();
   await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===3&&document.getElementById('pwScanOverlay').hidden);
   const actual=await page.evaluate(()=>SmartMatchReadTest.payload());assert.deepEqual(actual.matching,expected.matching);assert.deepEqual(actual.checks,expected.checks);
   assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});
   const exported=await assertExport(await exportPdf(page),b);assert.deepEqual(exported.readTestData.checks,expected.checks);assert.deepEqual(await oldState(),before,'active source PDF bytes and draft records remain untouched in TEST 9.6');await context.close();
   console.log('PASS TEST 9.6 active PDF plus reviewed draft recover without an archive, retain checks and leave the source database unchanged');
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
