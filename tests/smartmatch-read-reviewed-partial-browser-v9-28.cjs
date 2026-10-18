/* Avläsning TEST 9.28: a technically uncertain product result can be
 * accepted only after an explicit comparison with the original card. The
 * audit record and OCR evidence persist, while code/card/dirty-area and
 * drawing-review gates remain independent. Generated PDFs only. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');

const root=path.resolve(__dirname,'..');
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-28.html`;
const codeRect={x:.08,y:.08,w:.65,h:.06},tableRect={x:.06,y:.16,w:.88,h:.18},bounds={x:.05,y:.05,w:.90,h:.36};
const rawTable='Övrig utrustning  Dörrstängare DC700  Lev av DT  Mont av GS';
const tableWords=[
 {text:'Övrig utrustning',x:38,y:130,w:112,h:14,confidence:97},
 {text:'Dörrstängare',x:42,y:164,w:96,h:14,confidence:92},
 {text:'DC700',x:176,y:164,w:55,h:14,confidence:96},
 {text:'DT',x:410,y:164,w:22,h:14,confidence:94},
 {text:'GS',x:505,y:164,w:22,h:14,confidence:95}
];
const warning='Kolumnrubriken Monteras av kunde inte bekräftas automatiskt.';
const responsibilityWords=[
 {text:'Komponent',x:5,y:10,w:60,h:10},{text:'Övrigt',x:170,y:10,w:40,h:10},{text:'Lev av',x:400,y:10,w:35,h:10},{text:'Mont av',x:450,y:10,w:45,h:10},{text:'Ansl av',x:510,y:10,w:35,h:10},
 {text:'Övrig utrustning',x:5,y:30,w:100,h:10},
 {text:'31 Dörrstängare',x:5,y:50,w:105,h:10},{text:'DC700',x:170,y:50,w:35,h:10},{text:'DT',x:403,y:50,w:15,h:10},{text:'GS',x:453,y:50,w:15,h:10},
 {text:'32 Trycke',x:5,y:70,w:70,h:10},{text:'6696',x:170,y:70,w:30,h:10},{text:'GS',x:403,y:70,w:15,h:10},{text:'DT',x:453,y:70,w:15,h:10}
];
const responsibilityText='Övrigt  Lev av  Mont av  Ansl av\nÖvrig utrustning\n31 Dörrstängare  DC700  DT  GS\n32 Trycke  6696  GS  DT';

function workItem(code='GS1'){
 return {key:'manual-dc700',text:'Dörrstängare · DC700',legacyText:'Dörrstängare · DC700',label:'Dörrstängare',value:'DC700',quantity:1,section:'Övrig utrustning',sectionKey:'ovrig-utrustning',tableIndex:0,sourceRow:2,sourceIdentity:`gs:0:2:ovrig-utrustning:dörrstängare:dc700:${code}`.toLocaleLowerCase('sv-SE'),responsibility:'GS'};
}
function partialCard({empty=false,cardError=false,accepted=false}={}){
 const row=workItem(),rows=empty?[]:[row.text],items=empty?[]:[row];
 const card={id:'card-gs1',page:2,code:'GS1',originalCardCode:'GS1',header:'Beslagskod: GS1',codeRect,tableRect,bounds,rawTable,tableWords:structuredClone(tableWords),work:accepted?rows:[],workItems:accepted?items:[],workWarnings:[warning],workState:accepted?'ready':'pending',workPolicy:'gs-install-v3',choices:['GS1'],method:'PDF-text och lokal bildläsning inom markeringen',confidence:84};
 if(accepted)card.manualWorkReview={version:1,accepted:true,acceptedAt:'2026-10-18T09:00:00.000Z',acknowledgedWarnings:[warning]};
 else Object.assign(card,{workReadError:true,proposedWork:rows,proposedWorkItems:items});
 if(cardError)Object.assign(card,{cardReadError:'Kortet kunde inte läsas: avläsningen avbröts',readErrorKind:'work',unread:true});
 return card;
}
function hit(code,id,x,cardPage){
 const rect=[x,680,x+55,706];return {page:1,code,rect,box:{x:rect[0]/600,y:(800-rect[3])/800,w:(rect[2]-rect[0])/600,h:(rect[3]-rect[1])/800},positionId:id,cardPage,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000+x};
}
function basePayload(options={}){
 const primary=partialCard(options),hits=[hit('GS1','door-gs1',55,2)],cards={'card-gs1':primary};
 if(options.extraFailure){
  const failed={...partialCard({cardError:true}),id:'card-gs2',page:3,code:'GS2',originalCardCode:'GS2',header:'Beslagskod: GS2',choices:['GS2'],proposedWork:[workItem('GS2').text],proposedWorkItems:[workItem('GS2')]};
  cards[failed.id]=failed;hits.push(hit('GS2','door-gs2',360,3));
 }
 const checks=Object.fromEntries(hits.map(entry=>[entry.positionId,{}]));
 return {schema:6,projectId:'project:reviewed-partial-v928',projectRevision:1,instances:Object.fromEntries(hits.map(entry=>[entry.positionId,{checks:{},rowStages:{},progress:0,overrides:{},customItems:[]} ])),automationItems:[],readTestData:{schema:1,phase:'full',sourceId:'generated:reviewed-partial-v928',rects:{code:codeRect,table:tableRect},pages:Object.values(cards).map(card=>card.page),cards,checks,matching:{version:2,hits,pages:[{page:1,count:hits.length,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Manuellt granskad delavläsning TEST 9.28'}};
}
async function fixture(payload=basePayload()){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const drawing=document.addPage([600,800]);drawing.drawText('GS1',{x:55,y:680,size:18,font:bold});if(payload.readTestData.cards['card-gs2'])drawing.drawText('GS2',{x:360,y:680,size:18,font:bold});
 const one=document.addPage([600,800]);one.drawText('Beslagskod: GS1',{x:45,y:735,size:18,font:bold});one.drawText('Ovrig utrustning',{x:45,y:670,size:13,font:bold});one.drawText('Dorrstangare DC700   DT   GS',{x:45,y:625,size:13,font});
 if(payload.readTestData.cards['card-gs2']){const two=document.addPage([600,800]);two.drawText('Beslagskod: GS2',{x:45,y:735,size:18,font:bold});two.drawText('AVBRUTEN AVLASNING',{x:45,y:625,size:13,font});}
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}
async function contextFor(browser){
 const context=await browser.newContext({viewport:{width:1400,height:950},locale:'sv-SE'});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));return context;
}
async function openPrepared(page,bytes,name='reviewed-partial-v928.pdf'){
 await page.goto(url());await page.locator('#pwFile').setInputFiles({name,mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf?.()&&SmartMatchAppBridge.getPositions().length>=1&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
}
async function openSettings(page){
 await page.evaluate(()=>{void SmartMatchReadTest.openSettings();});await page.waitForSelector('#rtDialog[open]');await page.waitForFunction(()=>document.querySelectorAll('#rtResults .rtResult').length>0);
}
async function closeSettings(page){await page.locator('#rtCancel').click();await page.waitForFunction(()=>!document.getElementById('rtDialog').open);}
async function acceptManual(page){
 const review=page.locator('.rtManualWorkReview').first();await review.evaluate(node=>{for(let parent=node.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;});await review.locator('.rtManualWorkAck').check();assert.equal(await review.locator('.rtAcceptManualWork').isEnabled(),true);await review.locator('.rtAcceptManualWork').click();await page.waitForFunction(()=>!document.querySelector('.rtManualWorkReview'));
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});

  // Explicit acceptance: neither the drawing-review gate nor the product
  // review gate may implicitly satisfy the other one.
  const context=await contextFor(browser),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));let saved;
  try{
   await openPrepared(page,await fixture());
   const responsibility=await page.evaluate(({words,text})=>SmartMatchReadWork.read({words,text}),{words:responsibilityWords,text:responsibilityText});
   assert.equal(responsibility.resolved,true);assert.deepEqual(responsibility.work,['DC700'],'Mont av GS is included while Lev av DT does not exclude the item');assert.deepEqual(responsibility.items.map(item=>item.responsibility),['GS']);assert(!responsibility.work.includes('6696'),'Mont av DT stays outside the GS checklist even when Lev av is GS');
   await openSettings(page);
   assert.equal(await page.locator('.rtManualWorkReview').count(),1);assert.equal(await page.locator('.rtReviewBadge').innerText(),'Behöver åtgärdas');
   await page.locator('#rtMatchApproval').check();assert.equal(await page.locator('#rtStart').isDisabled(),true,'drawing approval alone never accepts an uncertain product read');
   await page.locator('#rtMatchApproval').uncheck();await acceptManual(page);
   assert.equal(await page.locator('#rtStart').isDisabled(),true,'manual product acceptance never bypasses drawing review');
   assert.equal(await page.locator('.rtReviewBadge').innerText(),'Klar');
   await page.locator('#rtMatchApproval').check();await page.waitForFunction(()=>!document.getElementById('rtStart').disabled);await page.locator('#rtStart').click();await page.waitForFunction(()=>!document.getElementById('rtDialog').open);
   saved=await page.evaluate(()=>structuredClone(SmartMatchAppBridge.save()));const stored=saved.readTestData.cards['card-gs1'];
   assert.equal(stored.workState,'ready');assert.equal(stored.workReadError,false);assert.deepEqual(stored.work,['Dörrstängare · DC700']);
   assert.equal(stored.manualWorkReview.version,1);assert.equal(stored.manualWorkReview.accepted,true);assert.match(stored.manualWorkReview.acceptedAt,/^\d{4}-\d\d-\d\dT/);assert.deepEqual(stored.manualWorkReview.acknowledgedWarnings,[warning]);
   assert.equal(stored.rawTable,rawTable,'raw OCR text remains available for audit');assert.deepEqual(stored.tableWords,tableWords,'OCR word positions remain available for audit');assert.deepEqual(stored.workWarnings,[warning],'parser warnings remain visible after acceptance');
   assert.deepEqual(errors,[]);
  }finally{await context.close();}

  const reopenedContext=await contextFor(browser),reopened=await reopenedContext.newPage(),reopenedErrors=[];reopened.on('pageerror',error=>reopenedErrors.push(error.message));
  try{
   await openPrepared(reopened,await fixture(saved),'reviewed-partial-restored-v928.pdf');const restored=await reopened.evaluate(()=>structuredClone(SmartMatchReadTest.payload().cards['card-gs1']));
   assert.deepEqual(restored.manualWorkReview,saved.readTestData.cards['card-gs1'].manualWorkReview,'the explicit review audit survives a new browser open');assert.equal(restored.rawTable,rawTable);assert.deepEqual(restored.tableWords,tableWords);assert.deepEqual(restored.workWarnings,[warning]);assert.deepEqual(reopenedErrors,[]);
  }finally{await reopenedContext.close();}

  // A real card-reading failure offers no product-only escape hatch. A blank
  // designation and a newly moved scan region remain blockers too.
  const blockedContext=await contextFor(browser),blocked=await blockedContext.newPage(),blockedErrors=[];blocked.on('pageerror',error=>blockedErrors.push(error.message));
  try{
   await openPrepared(blocked,await fixture(basePayload({extraFailure:true})), 'reviewed-partial-blockers-v928.pdf');await openSettings(blocked);
   assert.equal(await blocked.locator('.rtManualWorkReview').count(),1,'only the technically completed partial read can be accepted');
   assert.equal(await blocked.locator('[data-card-id="card-gs2"] .rtManualWorkReview').count(),0,'an interrupted/card read failure has no acceptance control');
   await acceptManual(blocked);await blocked.locator('#rtMatchApproval').check();assert.equal(await blocked.locator('#rtStart').isDisabled(),true,'the other card read failure remains blocking');assert.match(await blocked.locator('[data-card-id="card-gs2"] .rtReviewReason').innerText(),/kunde inte läsas|Kortet har inte lästs/i);
   const code=blocked.getByLabel('Beteckning kort 1');await code.fill('');await code.dispatchEvent('input');assert.equal(await blocked.locator('#rtStart').isDisabled(),true);assert.match(await blocked.locator('[data-card-id="card-gs1"] .rtReviewReason').innerText(),/Beteckning saknas/);
   await blocked.locator('[data-card-id="card-gs1"] button[data-adjust-card="card-gs1"]').evaluate(button=>button.click());await blocked.waitForFunction(()=>document.getElementById('rtCanvasBox').getBoundingClientRect().width>100);
   const box=await blocked.locator('#rtCanvasBox').boundingBox();assert(box);await blocked.mouse.move(box.x+box.width*.14,box.y+box.height*.10);await blocked.mouse.down();await blocked.mouse.move(box.x+box.width*.58,box.y+box.height*.18);await blocked.mouse.up();
   assert.equal(await blocked.locator('#rtStart').isDisabled(),true,'a moved region remains blocked until that card is reread');assert.equal(await blocked.locator('#rtLocalRead').isEnabled(),true);assert.match(await blocked.locator('#rtStatus').innerText(),/Nytt läsområde|Tryck Läs bara detta kort/);
   assert.deepEqual(blockedErrors,[]);await closeSettings(blocked);
  }finally{await blockedContext.close();}

  // An empty accepted list has a separate, explicit confirmation.
  const emptyContext=await contextFor(browser),empty=await emptyContext.newPage(),emptyErrors=[];empty.on('pageerror',error=>emptyErrors.push(error.message));
  try{
   await openPrepared(empty,await fixture(basePayload({empty:true})),'reviewed-partial-empty-v928.pdf');await openSettings(empty);
   const review=empty.locator('.rtManualWorkReview');await review.evaluate(node=>{for(let parent=node.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;});await review.locator('.rtManualWorkAck').check();
   let prompt='';empty.once('dialog',async dialog=>{prompt=dialog.message();await dialog.dismiss();});await review.locator('.rtAcceptManualWork').click();await empty.waitForTimeout(50);
   assert.match(prompt,/Inga GS-rader/i);assert.equal(await empty.locator('.rtManualWorkReview').count(),1,'dismissing the empty-list confirmation keeps the card unresolved');
   empty.once('dialog',dialog=>dialog.accept());await review.locator('.rtAcceptManualWork').click();await empty.waitForFunction(()=>!document.querySelector('.rtManualWorkReview'));
   const reviewed=await empty.locator('.rtResult').evaluate(node=>({badge:node.querySelector('.rtReviewBadge')?.textContent,work:node.querySelector('textarea')?.value||''}));assert.equal(reviewed.badge,'Klar');assert.equal(reviewed.work,'');
   assert.deepEqual(emptyErrors,[]);await closeSettings(empty);
  }finally{await emptyContext.close();}

  console.log('PASS TEST 9.28: reviewed partial GS rows persist with OCR evidence, empty results need confirmation, and code/card/dirty-area/drawing gates remain independent');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
