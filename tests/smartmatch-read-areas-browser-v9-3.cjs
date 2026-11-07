/* Avläsning TEST 9.3: common reading rectangles with exceptions on one card.
 * Native generated PDFs exercise the real reader, project export and reopening.
 * SMARTMATCH_DEVICE=desktop|ipad|iphone restricts the responsive matrix. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),artifacts=fs.mkdtempSync(path.join(os.tmpdir(),'smartmatch-areas-v9-3-'));
const devices=[{name:'desktop',width:1366,height:900},{name:'ipad',width:820,height:1180,touch:true},{name:'iphone',width:390,height:844,touch:true}].filter(device=>!process.env.SMARTMATCH_DEVICE||device.name===process.env.SMARTMATCH_DEVICE);
const codeRect={x:.08,y:.08,w:.78,h:.06},movedCodeRect={x:.08,y:.24,w:.78,h:.06};
const tableRect={x:.04,y:.19,w:.91,h:.23},movedTableRect={x:.04,y:.54,w:.91,h:.23};
const metadataKeys=['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'].map(PDFName.of);
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-3.html`;
const upload=(bytes,name='generated-areas.pdf')=>({name,mimeType:'application/pdf',buffer:bytes});
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold),plan=document.addPage([1600,800]),annotations=[];
 for(const [index,[label,x,y]]of [['GS 23',150,600],['GS24',700,420],['DBL-1',1150,220]].entries()){
  plan.drawText(label,{x,y,size:24,font});annotations.push(document.context.register(document.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText(label),Rect:[x-2,y-3,x+170,y+32],F:4,NM:PDFHexString.fromText('areas-'+index)})));
 }
 plan.drawText('GS230 DBL-10',{x:200,y:100,size:24,font});plan.node.set(PDFName.of('Annots'),document.context.obj(annotations));
 for(const [index,code]of ['GS23','GS24','DBL-1'].entries()){
  const card=document.addPage([595,842]),shifted=index===1;
  card.drawText('Beslagskod: '+code,{x:60,y:shifted?620:750,size:20,font});
  const top=shifted?370:650,columns=[40,185,355,470];
  for(const [column,label]of ['Komponent','Övrigt','Lev av','Mont av'].entries())card.drawText(label,{x:columns[column],y:top,size:10,font:bold});
  card.drawText('DAGLÅSNING',{x:40,y:top-24,size:11,font:bold});
  for(const [row,values]of [['Trycke','6696','DT','GS'],['Låshus',index===1?'SL660':'EL580','GS','GS'],['Slutbleck','DT999','GS','DT']].entries())for(const [column,value]of values.entries())card.drawText(value,{x:columns[column],y:top-48-row*28,size:11,font});
  // A second native label makes this an ordinary mixed-layout document, not a
  // special single-word OCR fixture. It is outside both user reading regions.
  card.drawText('Projekt skola · dörrkort '+(index+1),{x:40,y:50,size:11,font});
 }
 return Buffer.from(await document.save());
}
async function contextFor(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__calls={capture:false,pages:{},workers:0,work:0,scans:[],guides:0};
  const record=(page,key)=>{if(!window.__calls.capture)return;const target=window.__calls.pages[page]||={getTextContent:0,getOperatorList:0,getAnnotations:0,render:0};target[key]++;};
  let pdfjs;Object.defineProperty(window,'pdfjsLib',{configurable:true,get:()=>pdfjs,set:value=>{
   pdfjs=new Proxy(value,{get(target,key){if(key!=='getDocument')return Reflect.get(target,key);return(...args)=>{
    const task=target.getDocument(...args);let wrapped;return new Proxy(task,{get(task,key){if(key!=='promise'){const value=task[key];return typeof value==='function'?value.bind(task):value;}
     return wrapped||=task.promise.then(pdf=>{const pages=new Map();return new Proxy(pdf,{get(pdf,key){if(key!=='getPage'){const value=pdf[key];return typeof value==='function'?value.bind(pdf):value;}return async number=>{
      if(window.__holdGetPage===number){window.__holdGetPage=null;await new Promise(resolve=>{window.__releaseHeldPage=resolve;window.__holdingPage=number;});window.__holdingPage=null;}
      if(!pages.has(number)){const pg=await pdf.getPage(number);pages.set(number,new Proxy(pg,{get(pg,key){const value=pg[key];if(typeof value!=='function')return value;return(...args)=>{if(['getTextContent','getOperatorList','getAnnotations','render'].includes(key))record(number,key);return value.apply(pg,args);};}}));}return pages.get(number);
     };}});});
    }});
   };}});
  }});
  window.Tesseract={async createWorker(){window.__calls.workers++;throw Error('Native text fixture must not start OCR');}};
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:value=>{matcher={...value,scan:options=>{window.__calls.scans.push({codes:options.codes,imageMode:options.imageMode});if(window.__forbidScan)throw Error('Targeted card read or saved project must not rescan drawing');return value.scan(options);}};}});
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:value=>{work={...value,read:options=>{window.__calls.work++;return value.read(options);}};}});
  const show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')window.__calls.guides++;return show.call(this);};
 });
 return context;
}
async function press(locator,device){if(device.touch)await locator.tap();else await locator.click();}
async function setRect(page,kind,rect){for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel(kind+' '+label,{exact:true}).evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);}
async function idle(page){await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:90000});}
async function ready(page){await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===3&&document.getElementById('pwScanOverlay').hidden,null,{timeout:90000});}
const payload=page=>page.evaluate(()=>SmartMatchReadTest.payload());
const positions=page=>page.evaluate(()=>structuredClone(SmartMatchAppBridge.getPositions()));
async function exportProject(page,device){
 await press(page.locator('#smartPdfInspect'),device);await page.waitForSelector('#smartExportDialog[open]');const downloading=page.waitForEvent('download',{timeout:90000});await press(page.locator('#smartExportBuild'),device);const download=await downloading,bytes=fs.readFileSync(await download.path());await press(page.locator('#smartExportClose'),device);return bytes;
}
async function projectData(bytes){const document=await PDFDocument.load(bytes),raw=metadataKeys.map(key=>document.catalog.get(key)).find(Boolean);assert(raw?.decodeText,'project state is embedded');return JSON.parse(raw.decodeText());}
async function resetCalls(page){await page.evaluate(()=>{window.__calls.pages={};window.__calls.scans=[];window.__calls.work=0;window.__calls.capture=true;});}
async function stopCalls(page){return page.evaluate(()=>{window.__calls.capture=false;return structuredClone(window.__calls);});}
function assertOnlyPage(calls,number){for(const [page,counts]of Object.entries(calls.pages))if(Number(page)!==number)assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),0,'targeted read must not touch PDF page '+page);assert.equal(calls.scans.length,0,'a local card correction does not repeat drawing matching');assert.equal(calls.workers,0,'searchable cards need no OCR worker');}

// The controller owns these user actions; subsequent scenarios are intentionally
// expressed through the same controls available on desktop and touch screens.
const resultFor=(page,number)=>page.locator('.rtResult[data-page="'+number+'"]');
async function resultState(page,number){return resultFor(page,number).evaluate(node=>({id:node.dataset.cardId,header:node.querySelector('.rtReadText')?.textContent,code:node.querySelector('input[aria-label^="Beteckning kort"]')?.value,work:node.querySelector('textarea')?.value}));}
async function adjustCard(page,number,device){
 await press(resultFor(page,number).locator('[data-adjust-card]'),device);
 assert.equal(await page.locator('#rtPage').inputValue(),String(number),'adjust opens the actual source page');
 assert.equal(await page.locator('#rtAreaScope').inputValue(),'page','a single card on a page gets a page-local rectangle');
 assert.match(await page.locator('#rtAreaScopeInfo').textContent(),new RegExp('sida '+number,'i'));
}
async function drawRect(page,kind,rect,device){
 await press(page.locator(kind==='Kod'?'#rtCode':'#rtTable'),device);
 await page.locator('#rtViewport').scrollIntoViewIfNeeded();
 await page.locator('#rtViewport').evaluate(node=>{node.scrollTop=0;node.scrollLeft=0;});
 const box=await page.locator('#rtCanvasBox').boundingBox();assert(box&&box.width>0&&box.height>0);
 // Browser mouse coordinates exercise the real pointer marking path on desktop.
 // Touch viewports use the precise, labelled coordinate controls for a card
 // that may be taller than the screen.
 if(device.touch)return setRect(page,kind,rect);
 await page.mouse.move(box.x+rect.x*box.width,box.y+rect.y*box.height);
 await page.mouse.down();await page.mouse.move(box.x+(rect.x+rect.w)*box.width,box.y+(rect.y+rect.h)*box.height,{steps:8});await page.mouse.up();
}
async function captureLocalEditor(page,device,kind){
 await page.locator('.rtAreaSettings').scrollIntoViewIfNeeded();
 const dimensions=await page.locator('.rtDialog,.rtAreaSettings,.rtReview').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).map(node=>({name:node.id||node.className,client:node.clientWidth,scroll:node.scrollWidth})));
 for(const dimension of dimensions)assert(dimension.scroll<=dimension.client+2,'local editing has no horizontal overflow in '+dimension.name+' on '+device.name);
 await page.screenshot({path:path.join(artifacts,device.name+'-'+kind+'-local-edit.png'),fullPage:true});
 const selected=kind==='code'?movedCodeRect:movedTableRect;
 await page.locator('#rtViewport').evaluate((node,rect)=>{const canvas=node.querySelector('#rtCanvasBox');node.scrollTop=Math.max(0,canvas.clientHeight*rect.y-30);},selected);
 await page.locator('#rtViewport').screenshot({path:path.join(artifacts,device.name+'-'+kind+'-local-selection.png')});
}
function closeRect(actual,expected,message){for(const axis of ['x','y','w','h'])assert(Math.abs(actual[axis]-expected[axis])<.008,message+' ('+axis+')');}
async function openPosition(page,id){await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);await page.waitForSelector('#pwProtocol[open]');await page.waitForFunction(()=>!!document.getElementById('pwProtocolCanvas')?.dataset.readCardId);}
async function workState(page,id){return page.evaluate(id=>SmartMatchAppBridge.readWorkState(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);}
async function exercise(browser,device,input){
 const context=await contextFor(browser,device),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(url());await page.locator('#pwFile').setInputFiles(upload(input));await page.waitForSelector('#rtDialog[open]');
  await setRect(page,'Kod',codeRect);await page.locator('#rtImageMode').selectOption('text');await press(page.locator('#rtDiscover'),device);await idle(page);
  assert(await page.locator('#rtDiscoveryResults [data-adjust-page="3"],#rtDiscoveryResults [data-adjust-card][aria-label$="sida 3"]').count(),'discovery exposes an action to inspect the shifted page 3 region');
  // Explicit page selection is retained for projects whose card layouts differ.
  await press(page.locator('#rtSetupDetails > summary'),device);await page.locator('#rtPages').fill('2-4');await page.locator('#rtPages').dispatchEvent('input');await press(page.locator('#rtPreview'),device);await idle(page);
  assert.equal(await page.locator('.rtResult').count(),3);
  const normal2=await resultState(page,2),normal4=await resultState(page,4),unread3=await resultState(page,3);
  assert.equal(normal2.code,'GS23');assert.equal(normal4.code,'DBL1');assert.equal(unread3.code,'','the common region truthfully leaves a shifted header unresolved');
  assert.equal(await page.locator('#rtStart').isEnabled(),false);
  await adjustCard(page,3,device);await drawRect(page,'Kod',movedCodeRect,device);await captureLocalEditor(page,device,'code');await resetCalls(page);await press(page.locator('#rtLocalRead'),device);await idle(page);
  const localCodeCalls=await stopCalls(page);assertOnlyPage(localCodeCalls,3);
  assert.deepEqual(await resultState(page,2),normal2,'correcting page 3 keeps page 2 reading and card identity');assert.deepEqual(await resultState(page,4),normal4,'correcting page 3 keeps page 4 reading and card identity');
  assert.equal((await resultState(page,3)).id,unread3.id,'the adjusted card keeps its own identity');assert.equal((await resultState(page,3)).code,'GS24');
  await press(page.locator('#rtFind'),device);await idle(page);assert.equal(await page.locator('.rtMatchRow').count(),3,'all three exact drawing identifiers can now be reviewed');
  await page.locator('#rtMatchApproval').check();const approvedHits=await page.locator('.rtMatchRow').allTextContents();
  await adjustCard(page,3,device);await setRect(page,'Kod',movedCodeRect);await resetCalls(page);await press(page.locator('#rtLocalRead'),device);await idle(page);assertOnlyPage(await stopCalls(page),3);
  assert.deepEqual(await page.locator('.rtMatchRow').allTextContents(),approvedHits,'same-code local retry keeps the reviewed drawing hits');assert.equal(await page.locator('#rtMatchApproval').isChecked(),true,'same-code local retry keeps explicit review approval');
  await press(page.locator('#rtStart'),device);await ready(page);
  const pending=await payload(page),links=structuredClone(pending.matching),sourceIds=Object.keys(pending.cards),positionIds=(await positions(page)).map(position=>position.id);
  closeRect(pending.pageOverrides['3'].code,movedCodeRect,'page-local code rectangle is saved');closeRect(pending.rects.code,codeRect,'the common code rectangle is unchanged');
  const p2=Object.values(pending.cards).find(card=>card.page===2),p3=Object.values(pending.cards).find(card=>card.page===3),p4=Object.values(pending.cards).find(card=>card.page===4);
  closeRect(p2.codeRect,codeRect,'normal page 2 code area stays common');closeRect(p3.codeRect,movedCodeRect,'page 3 records its actual local area');closeRect(p4.codeRect,codeRect,'normal page 4 code area stays common');
  const pendingBytes=await exportProject(page,device),savedPending=await projectData(pendingBytes);assert.deepEqual(savedPending.readTestData.pageOverrides,pending.pageOverrides);

  // Independent review regression: saved incorrect, unmatched source code.
  {
   const badDoc=await PDFDocument.load(pendingBytes),state=await projectData(pendingBytes),bad=Object.values(state.readTestData.cards).find(card=>card.page===3);
   bad.code='WRONG';bad.originalCardCode='WRONG';bad.header='Beslagskod: WRONG';state.readTestData.matching.hits=state.readTestData.matching.hits.filter(hit=>hit.code!=='GS24');
   for(const metadataKey of metadataKeys)badDoc.catalog.set(metadataKey,PDFHexString.fromText(JSON.stringify(state)));
   const wrongBytes=Buffer.from(await badDoc.save()),review=await contextFor(browser,device),tab=await review.newPage();
   try{
    await tab.goto(url());await tab.locator('#pwFile').setInputFiles(upload(wrongBytes,'wrong-code-review.pdf'));
    await tab.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===2&&document.getElementById('pwScanOverlay').hidden,null,{timeout:90000});
    const before=await payload(tab),beforePositions=await positions(tab),keepHits=structuredClone(before.matching.hits),beforeId=Object.values(before.cards).find(card=>card.page===3).id;
    await press(tab.locator('#rtOpenSettings'),device);await tab.waitForSelector('#rtDialog[open]');await adjustCard(tab,3,device);await setRect(tab,'Kod',{...movedCodeRect,x:.081});
    await resetCalls(tab);await press(tab.locator('#rtLocalRead'),device);await idle(tab);const localCalls=await stopCalls(tab);assertOnlyPage(localCalls,3);
    assert.equal((await resultState(tab,3)).code,'GS24');assert.equal((await resultState(tab,3)).id,beforeId);assert.equal(await tab.locator('#rtStart').isEnabled(),false,'edited unmatched code needs explicit search');
    await resetCalls(tab);await press(tab.locator('#rtFind'),device);await idle(tab);const foundCalls=await stopCalls(tab);assert.deepEqual(foundCalls.scans.map(scan=>scan.codes),[['GS24']],'incremental drawing search is for corrected code only');
    assert.equal(await tab.locator('.rtMatchRow').count(),3);await tab.locator('#rtMatchApproval').check();await press(tab.locator('#rtStart'),device);await ready(tab);
    const corrected=await payload(tab),afterPositions=await positions(tab);for(const oldHit of keepHits)assert(corrected.matching.hits.some(hit=>JSON.stringify(hit)===JSON.stringify(oldHit)),'unrelated reviewed hit is byte-identical');for(const oldPosition of beforePositions)assert(afterPositions.some(position=>position.id===oldPosition.id),'unrelated door position ID is unchanged');
    assert.equal(Object.values(corrected.cards).find(card=>card.page===3).id,beforeId);console.log('PASS independent review: saved wrong code, local native retry, incremental GS24-only matching, previous reviewed hits and position IDs preserved');
    const originalIds=Object.keys(corrected.cards).sort();await press(tab.locator('#rtOpenSettings'),device);await tab.waitForSelector('#rtDialog[open]');await press(tab.locator('#rtDiscover'),device);await idle(tab);await press(tab.locator('#rtPreview'),device);await idle(tab);
    assert.deepEqual(await tab.locator('.rtResult').evaluateAll(nodes=>nodes.map(node=>node.dataset.cardId).sort()),originalIds,'rediscovery keeps stable source IDs after page override');
    assert.equal(await tab.locator('.rtResult').count(),3,'rediscovery adds no duplicate physical cards');console.log('PASS independent review: rediscovery with saved page override keeps source IDs and three physical cards');
   }finally{await review.close();}
  }

  const fresh=await contextFor(browser,device),next=await fresh.newPage(),nextErrors=[];next.on('pageerror',error=>nextErrors.push(error.message));
  try{
   await next.goto(url());await next.evaluate(()=>{window.__forbidScan=true;});await next.locator('#pwFile').setInputFiles(upload(pendingBytes,'pending-with-local-code.pdf'));await ready(next);
   assert.equal(await next.evaluate(()=>window.__calls.guides),0,'project with local regions opens directly');assert.deepEqual((await payload(next)).pageOverrides,pending.pageOverrides);assert.deepEqual((await payload(next)).matching,links);
   await press(next.locator('#pwReadContinueProducts'),device);await next.waitForSelector('#rtDialog[open]');await setRect(next,'Tabell',tableRect);await press(next.locator('#rtPreview'),device);await idle(next);
   const products2=await resultState(next,2),products4=await resultState(next,4);
   assert.deepEqual(products2.work.split('\n'),['6696','EL580']);assert.deepEqual(products4.work.split('\n'),['6696','EL580']);
   assert(!(await resultState(next,3)).work.includes('SL660'),'a shifted table is not silently guessed from unrelated text');
   await adjustCard(next,3,device);await setRect(next,'Tabell',movedTableRect);await captureLocalEditor(next,device,'table');await resetCalls(next);await press(next.locator('#rtLocalRead'),device);await idle(next);
   const localWorkCalls=await stopCalls(next);assertOnlyPage(localWorkCalls,3);assert.equal(localWorkCalls.work,1,'one local table retry invokes one responsibility parse');
   assert.deepEqual(await resultState(next,2),products2,'local table retry preserves other product readings');assert.deepEqual(await resultState(next,4),products4);assert.deepEqual((await resultState(next,3)).work.split('\n'),['6696','SL660']);
   await press(next.locator('#rtStart'),device);await ready(next);
   const completed=await payload(next);assert.deepEqual(Object.keys(completed.cards),sourceIds);assert.deepEqual(completed.matching,links,'deferred local product corrections preserve reviewed drawing links');assert.deepEqual((await positions(next)).map(position=>position.id),positionIds);
   closeRect(completed.pageOverrides['3'].table,movedTableRect,'local table position is saved separately');closeRect(completed.rects.table,tableRect,'the common table position is unchanged');
   const selected=(await positions(next)).find(position=>position.code==='GS23');assert(selected);await openPosition(next,selected.id);await press(next.locator('#pwChecklist .rtWorkRow input').first(),device);await next.waitForFunction(()=>document.getElementById('pwChecklistMeta').textContent==='1 av 2 klara');await press(next.locator('#pwProtocolClose'),device);const checkedState=await workState(next,selected.id);

   // A cancelled local retry is transactional: no source, matching or checkbox
   // state is applied even if a PDF page promise completes after cancellation.
   const beforeCancel=await payload(next);await press(next.locator('#pwReadContinueProducts'),device);await next.waitForSelector('#rtDialog[open]');await adjustCard(next,3,device);await setRect(next,'Tabell',{...movedTableRect,x:.045});await next.evaluate(()=>{window.__holdGetPage=3;});await press(next.locator('#rtLocalRead'),device);
   await next.waitForFunction(()=>window.__holdingPage===3);await press(next.locator('#rtReadProgressCancel'),device);await next.evaluate(()=>window.__releaseHeldPage?.());await ready(next);assert.deepEqual(await payload(next),beforeCancel,'cancelling local re-reading restores the complete reviewed project');assert.deepEqual(await workState(next,selected.id),checkedState,'cancellation preserves existing work checks and time');
   const finished=await exportProject(next,device),saved=await projectData(finished);assert.deepEqual(saved.readTestData.pageOverrides,completed.pageOverrides);assert.equal(Object.values(saved.readTestData.checks||{}).flatMap(Object.values).filter(Boolean).length,1);
   const reopenContext=await contextFor(browser,device),reopened=await reopenContext.newPage();try{
    await reopened.goto(url());await reopened.evaluate(()=>{window.__forbidScan=true;});await reopened.locator('#pwFile').setInputFiles(upload(finished,'completed-local-regions.pdf'));await ready(reopened);assert.equal(await reopened.evaluate(()=>window.__calls.guides),0);assert.deepEqual((await payload(reopened)).pageOverrides,completed.pageOverrides);assert.deepEqual((await payload(reopened)).matching,links);assert.deepEqual(await workState(reopened,selected.id),checkedState);assert.equal(await reopened.evaluate(()=>window.__calls.scans.length),0);
    await openPosition(reopened,selected.id);await reopened.screenshot({path:path.join(artifacts,device.name+'-local-regions.png'),fullPage:true});await press(reopened.locator('#pwProtocolClose'),device);
   }finally{await reopenContext.close();}
   assert.deepEqual(nextErrors,[]);assert.equal(await next.evaluate(()=>window.__calls.workers),0);
  }finally{await fresh.close();}
  assert.deepEqual(errors,[]);console.log('PASS '+device.name+': local code/table correction, targeted read, unchanged other cards/links, cancelled retry, PDF export/direct reopening and checkbox preservation');
 }catch(error){console.error('Local-area QA state:',await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,state:document.getElementById('pwState')?.textContent,scope:document.getElementById('rtAreaScope')?.value,dialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id),cards:[...document.querySelectorAll('.rtResult')].map(node=>node.innerText),calls:window.__calls})).catch(()=>null));throw error;}
 finally{await context.close();}
}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const input=await fixture();for(const device of devices)await exercise(browser,device,input);console.log('QA screenshots: '+artifacts);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});

