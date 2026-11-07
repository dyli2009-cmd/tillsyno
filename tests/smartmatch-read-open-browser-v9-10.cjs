/* A generated 78-page project tests the preparation/work boundary and portable
 * restore. Counters measure document parsing, not a promised speed multiplier. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),revision='9-10',metadataKey=PDFName.of('TillsynoSmartMatchV36Data');
const devices={desktop:{viewport:{width:1440,height:1000}},ipad:{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2}};
const names=process.env.SMARTMATCH_DEVICE?[process.env.SMARTMATCH_DEVICE]:Object.keys(devices);
const clone=value=>JSON.parse(JSON.stringify(value)),codeRect={x:.08,y:.08,w:.84,h:.06},tableRect={x:.06,y:.16,w:.84,h:.26};
const server=http.createServer((request,response)=>{
 const filename=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!filename.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(filename)]||'application/octet-stream');response.end(fs.readFileSync(filename));}
 catch(_){response.writeHead(404);response.end();}
});
const url=(version=revision)=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v${version}.html`;
const labelFor=page=>page===8||page===51?'GS23':page===61?'':'K'+String(page).padStart(3,'0');
async function fixture({statusAnnotation=false}={}){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([1200,900]);
 const cards={},deferredCards={},hits=[],checks={},instances={};
 for(let page=2;page<=78;page++){
  const code=labelFor(page),id='generated-card:'+page,card=document.addPage([595,842]);
  card.drawText('Beslagskod: '+(code||'?'),{x:60,y:750,size:20,font});
  const work=['EL580','TS93'],workItems=work.map((text,row)=>({text,label:row?'Dörrstängare':'Lås',value:text,key:'row-'+page+'-'+row,section:'Övrigt',sectionKey:'ovrigt',responsibility:'GS'}));
  for(const [text,x]of [['Komponent',45],['Övrigt',220],['Mont av',470]])card.drawText(text,{x,y:690,size:12,font});
  workItems.forEach((item,row)=>{const y=655-row*35;card.drawText(item.label,{x:45,y,size:12,font});card.drawText(item.value,{x:220,y,size:12,font});card.drawText('GS',{x:470,y,size:12,font});});
  const data={id,page,code,originalCardCode:code,header:'Beslagskod: '+code,codeRect,tableRect,bounds:{x:.06,y:.08,w:.86,h:.34},rawTable:'Lås EL580 GS\nDörrstängare TS93 GS',work,workItems,workPolicy:'gs-install-v2',workState:'ready',choices:code?[code]:[],method:'PDF-text',confidence:100};
  if(page===51||page===61){deferredCards[id]={...data,deferred:true,deferredReasons:[page===51?'Dubblerad beteckning – ett annat kort valdes':'Beteckningen behöver kontrolleras']};continue;}
  cards[id]=data;if(page===78)continue; // Valid unmatched cards must stay usable.
  const index=hits.length,x=50+(index%7)*160,y=830-Math.floor(index/7)*65,rect=[x,y,x+100,y+25],positionId='saved-door:'+page,drawingCode=page===2?'DBL1':code;
  plan.drawText(page===2?'DBL-1':code,{x,y,size:15,font});
  hits.push({page:1,code:drawingCode,rect,box:{x:x/1200,y:(900-y-25)/900,w:100/1200,h:25/900},positionId,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000+index,...(page===2?{drawingCode:'K002',cardPage:2,originalCardCode:code,sourceCardId:id,label:'DBL-1'}:{})});
  const own={'row-2-0':page===2};if(page!==2){delete own['row-2-0'];own['row-'+page+'-0']=page%2===0;}checks[positionId]=own;
  instances[positionId]={checks:clone(own),rowStages:{['audit-'+page]:'ready'},progress:0,overrides:{['row-'+page+'-0']:{minutes:11+page,note:'Egen tid '+page}},customItems:[{id:'custom-'+page,label:'Egen kontroll',value:'Unik dörr '+page,minutes:3}]};
 }
 const readTestData={schema:2,phase:'full',sourceId:'generated:prepared-v99',rects:{code:codeRect,table:tableRect},pages:Array.from({length:77},(_,index)=>index+2),cards,deferredCards,checks,matching:{version:2,hits,pages:[{page:1,count:hits.length,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},groupMappings:{DBL1:{code:'DBL1',drawingLabel:'DBL-1',sourceCardId:'generated-card:2',cardPage:2,originalCardCode:'K002',sourceDrawingCodes:['K002'],sourceScopes:{K002:null}}},renamedGroupCodes:['K002'],drawingSample:null,name:'Generated prepared 77-card project'};
 const payload={schema:6,projectId:'project:prepared-v99',projectRevision:1,instances,labManualLinks:{DBL1:2},automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 if(statusAnnotation){const annotation=document.context.register(document.context.obj({Type:'Annot',Subtype:'Square',Rect:[20,20,80,50],NM:PDFHexString.fromText('SM35:progress:generated'),Contents:PDFHexString.fromText('Legacy status should not cover the working drawing')}));plan.node.set(PDFName.of('Annots'),document.context.obj([annotation]));}
 const bytes=Buffer.from(await document.save()),raw=await PDFDocument.load(bytes);for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])raw.catalog.delete(PDFName.of(key));
 assert.equal(hits.length,74);assert.equal(Object.keys(cards).length,75);assert.equal(Object.keys(deferredCards).length,2);
 return {bytes,raw:Buffer.from(await raw.save()),payload};
}
async function contextFor(browser,device){
 const context=await browser.newContext({...device,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showOpenFilePicker=undefined;window.showSaveFilePicker=undefined;window.__scanCalls={scans:0,work:0,workers:0,guides:0};
  window.Tesseract={async createWorker(){__scanCalls.workers++;throw Error('Prepared open must never create an OCR worker');}};
  for(const [name,method,count]of [['SmartMatchReadMatcher','scan','scans'],['SmartMatchReadWork','read','work']]){
   let value;Object.defineProperty(window,name,{configurable:true,get:()=>value,set:next=>{value={...next,[method]:()=>{__scanCalls[count]++;throw Error('Prepared open must not repeat '+method);}};}});
  }
  const show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')__scanCalls.guides++;return show.call(this);};
 });
 return context;
}
async function instrument(page){
 await page.evaluate(()=>{
  window.__openCalls={fileReads:0,pdfLib:0,pdfJs:0,text:0};
  const arrayBuffer=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(...args){__openCalls.fileReads++;return arrayBuffer.apply(this,args);};
  const load=PDFLib.PDFDocument.load;PDFLib.PDFDocument.load=function(...args){__openCalls.pdfLib++;return load.apply(this,args);};
  const library=pdfjsLib,getDocument=library.getDocument;window.pdfjsLib={...library,getDocument(...args){
   __openCalls.pdfJs++;const task=getDocument.apply(library,args);task.promise.then(document=>{
    const getPage=document.getPage;document.getPage=async function(...values){
     const pdfPage=await getPage.apply(this,values);if(!pdfPage.__openWrapped){pdfPage.__openWrapped=true;const getText=pdfPage.getTextContent;pdfPage.getTextContent=function(...options){__openCalls.text++;return getText.apply(this,options);};}return pdfPage;
    };
   });return task;
  }};
 });
}
async function resetCounts(page){await page.evaluate(()=>{for(const key of Object.keys(__openCalls))__openCalls[key]=0;for(const key of Object.keys(__scanCalls))__scanCalls[key]=0;});}
async function ready(page,count=74){await page.waitForFunction(expected=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===expected&&document.getElementById('pwScanOverlay').hidden,count,{timeout:90000});}
async function open(page,bytes,name='generated-prepared-project.pdf'){
 await resetCounts(page);const began=Date.now(),file={name,mimeType:'application/pdf',buffer:bytes};
 if(await page.locator('#pwOpenProjectEmpty').isVisible()){const choosing=page.waitForEvent('filechooser');await page.locator('#pwOpenProjectEmpty').click();await(await choosing).setFiles(file);}
 else await page.locator('#pwFile').setInputFiles(file);
 await ready(page);return {elapsedMs:Date.now()-began,...await page.evaluate(()=>__openCalls)};
}
async function assertNoRead(page){assert.deepEqual(await page.evaluate(()=>__scanCalls),{scans:0,work:0,workers:0,guides:0},'prepared projects restore without OCR, matching, products or the preparation guide');assert.equal(await page.evaluate(()=>__openCalls.text),0,'saved opening never extracts any PDF page text');}
async function snapshot(page){return page.evaluate(()=>({read:SmartMatchReadTest.payload(),mapping:SmartMatchAppBridge.getDoorCardMapping(),positions:SmartMatchAppBridge.getPositions().map(position=>({id:position.id,page:position.page,code:position.code,rect:position.rect,checks:position.checks,overrides:position.overrides,rowStages:position.rowStages,customItems:position.customItems,work:SmartMatchAppBridge.readWorkState(position)}))}));}
async function exportPdf(page){
 await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled,null,{timeout:90000});
 const downloading=page.waitForEvent('download');await page.locator('#smartExportBuild').click();const bytes=fs.readFileSync(await(await downloading).path());await page.locator('#smartExportClose').click();assert(bytes.length>1000);
 const document=await PDFDocument.load(bytes);return {bytes,payload:JSON.parse(document.catalog.lookup(metadataKey).decodeText()),pages:document.getPageCount()};
}
async function oldProject(browser,input){
 const context=await contextFor(browser,devices.desktop),page=await context.newPage();try{
  await page.goto(url('9-9'));await instrument(page);const measure=await open(page,input.bytes);await assertNoRead(page);const before=await snapshot(page);
  assert.equal(before.positions.length,74);assert.equal(before.mapping.DBL1,2);assert.equal(before.read.cards['generated-card:2'].originalCardCode,'K002');assert.equal(Object.keys(before.read.deferredCards).length,2);
  const first=before.positions.find(position=>position.id==='saved-door:2');assert(first.checks['row-2-0'],'fixture has an approved GS control point');assert.equal(first.overrides['row-2-0'].minutes,13);assert(first.work.doneMinutes>=13,'fixture has completed work time to preserve');assert.equal(first.customItems[0].value,'Unik dörr 2');
  const saved=await exportPdf(page);assert.equal(saved.pages,78);assert.deepEqual(saved.payload.readTestData,before.read);
  console.log('BASELINE TEST 9.9 prepared opening:',JSON.stringify(measure));return {saved,before,measure};
 }finally{await context.close();}
}
async function rawAndCancel(page,input,before){
 await resetCounts(page);await page.locator('#pwFile').setInputFiles({name:'generated-raw-project.pdf',mimeType:'application/pdf',buffer:input.raw});await page.waitForSelector('#pwSmartActionDialog[open]');
 assert.match(await page.locator('#pwSmartActionMessage').innerText(),/saknar.*avläsning|förbered/i);await page.locator('#pwSmartActionSave').click();await assertNoRead(page);
 assert.equal(await page.evaluate(()=>__openCalls.pdfJs),0,'a clearly unprepared PDF is refused before starting PDF.js');assert.deepEqual(await snapshot(page),before,'refusing a raw PDF cannot replace the open project or its work');
 await resetCounts(page);await page.locator('#rtMultiFiles').setInputFiles({name:'generated-raw-project.pdf',mimeType:'application/pdf',buffer:input.raw});await page.waitForSelector('#rtDialog[open]');
 assert.deepEqual(await page.evaluate(()=>__scanCalls),{scans:0,work:0,workers:0,guides:1},'explicit preparation opens the guide without automatically scanning any card or product');
 await page.locator('#rtCancel').click();await page.waitForFunction(()=>!document.getElementById('rtDialog').open);assert.deepEqual(await snapshot(page),before,'cancelling preparation keeps all saved links, GS products, checks and time in the working project');
}
async function closeProject(page){
 await page.locator('#pwFinishProject').click();await page.waitForFunction(()=>!SmartMatchAppBridge.getPdf()&&!document.getElementById('pwEmpty').hidden);
 assert.equal(await page.evaluate(()=>SmartMatchReadWorkflow.getMode()),'home','closing a working project restores the two entry choices');assert(await page.locator('#rtWorkflowBar').isHidden(),'working-mode status is hidden after closing');assert(await page.locator('#rtEditPreparation').isHidden(),'closed projects cannot show an edit-preparation action');assert(await page.locator('#rtPrepareEntry').isVisible());assert(await page.locator('#rtWorkEntry').isVisible());
}
async function exercise(browser,name,input,legacy){
 assert(devices[name],'Unknown SMARTMATCH_DEVICE: '+name);const context=await contextFor(browser,devices[name]),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(url());assert.equal(await page.locator('#rtChooseFiles').innerText(),'Förbered ny PDF');assert.equal(await page.locator('#pwOpenProjectEmpty').innerText(),'Öppna färdigt projekt');
  assert(await page.locator('#rtPrepareEntry').isVisible());assert(await page.locator('#rtWorkEntry').isVisible());if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v910-entry-'+name+'.png'});
  await instrument(page);
  const preparing=page.waitForEvent('filechooser');await page.locator('#rtChooseFiles').click();await(await preparing).setFiles({name:'generated-new-raw-project.pdf',mimeType:'application/pdf',buffer:input.raw});await page.waitForSelector('#rtDialog[open]');assert.equal(await page.evaluate(()=>SmartMatchReadWorkflow.getMode()),'preparing');assert.deepEqual(await page.evaluate(()=>__scanCalls),{scans:0,work:0,workers:0,guides:1},'the new-PDF entry opens preparation only when explicitly selected');await page.locator('#rtCancel').click();await page.waitForFunction(()=>!document.getElementById('rtDialog').open);assert.equal(await page.evaluate(()=>SmartMatchReadWorkflow.getMode()),'home');assert.equal(await page.evaluate(()=>SmartMatchAppBridge.getPdf()),null,'cancelling the first preparation returns to the two entry choices');
  const measure=await open(page,legacy.saved.bytes);await assertNoRead(page);
  assert.deepEqual({...measure,elapsedMs:0},{elapsedMs:0,fileReads:1,pdfLib:1,pdfJs:1,text:0},'the selected prepared PDF is read and parsed once per engine');
  const before=await snapshot(page);assert.deepEqual({...before.read,sourceId:legacy.before.read.sourceId},legacy.before.read,'a real TEST 9.9 export restores every card, alias and deferred review');assert.deepEqual(before.positions,legacy.before.positions,'door identity, checks, per-door time and work stages survive legacy import');assert.equal(before.mapping.DBL1,2);assert.equal(before.read.cards['generated-card:2'].originalCardCode,'K002');
  assert.match(await page.locator('#rtWorkflowMode').innerText(),/arbets|färdigt/i);assert(await page.locator('#rtEditPreparation').isVisible());
  if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v910-work-'+name+'.png'});
  await resetCounts(page);await page.locator('#rtEditPreparation').click();await page.waitForSelector('#rtDialog[open]');assert.equal(await page.evaluate(()=>SmartMatchReadWorkflow.getMode()),'preparing');assert.deepEqual(await page.evaluate(()=>__scanCalls),{scans:0,work:0,workers:0,guides:1},'editing preparation is explicit and does not automatically reread anything');await page.locator('#rtCancel').click();await page.waitForFunction(()=>!document.getElementById('rtDialog').open);assert.equal(await page.evaluate(()=>SmartMatchReadWorkflow.getMode()),'working');assert.deepEqual(await snapshot(page),before);
  await rawAndCancel(page,input,before);
  const saved=await exportPdf(page);assert.equal(saved.pages,78);assert.deepEqual(saved.payload.readTestData,before.read);
  const freshContext=await contextFor(browser,devices[name]),fresh=await freshContext.newPage();try{
   await fresh.goto(url());await instrument(fresh);const nextMeasure=await open(fresh,saved.bytes);await assertNoRead(fresh);assert.equal(nextMeasure.fileReads,1);assert.equal(nextMeasure.pdfLib,1);assert.equal(nextMeasure.pdfJs,1);
   const restored=await snapshot(fresh);assert.deepEqual({...restored.read,sourceId:before.read.sourceId},before.read);assert.deepEqual(restored.positions,before.positions);assert.deepEqual(restored.mapping,before.mapping);
  }finally{await freshContext.close();}
  await closeProject(page);
  assert.deepEqual(errors,[]);console.log('PASS '+name+': TEST 9.9 -> 9.10 -> fresh browser; 78 pages, 74 saved links, original names, aliases, 2 deferred cards and independent checks/time; raw refusal and preparation cancellation preserve current work; '+JSON.stringify(measure));
 }finally{await context.close();}
}
async function closeOnly(browser,name,input){
 const context=await contextFor(browser,devices[name]),page=await context.newPage();try{await page.goto(url());await instrument(page);await open(page,input.bytes);await assertNoRead(page);await closeProject(page);console.log('PASS '+name+': actual Stäng ritning returns to home with preparation/work choices and no stale working-mode controls');}finally{await context.close();}
}
async function cleanedDisplay(browser){
 const input=await fixture({statusAnnotation:true}),context=await contextFor(browser,devices.desktop),page=await context.newPage();try{
  await page.goto(url());await instrument(page);const measure=await open(page,input.bytes);await assertNoRead(page);assert.equal(measure.pdfLib,1);assert.equal(measure.pdfJs,1);
  assert.equal(await page.evaluate(async()=>(await(await SmartMatchAppBridge.getPdf().getPage(1)).getAnnotations()).length),0,'the already parsed display copy still hides legacy progress annotations');
  const original=await PDFDocument.load(Buffer.from(await page.evaluate(()=>Array.from(SmartMatchAppBridge.getOriginalPdfBytes()))));assert.equal(original.getPage(0).node.Annots().size(),1,'display cleanup never changes original source bytes');
  console.log('PASS desktop: saved opening reuses the cleaned display document while preserving original PDF bytes');
 }finally{await context.close();}
}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const input=await fixture();if(process.env.SMARTMATCH_CLOSE_ONLY){for(const name of names)await closeOnly(browser,name,input);}else{const legacy=await oldProject(browser,input);for(const name of names)await exercise(browser,name,input,legacy);if(names.includes('desktop'))await cleanedDisplay(browser);}
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
