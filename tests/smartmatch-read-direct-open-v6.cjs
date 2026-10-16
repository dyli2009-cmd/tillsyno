/* TEST 6: review once, export the project PDF, then open it directly.
 * Generated documents only. Customer PDFs and downloaded projects stay out of git.
 * SMARTMATCH_DEVICE=desktop|iphone limits the viewport coverage.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createHash}=require('node:crypto');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),metadataKeys=['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'].map(PDFName.of);
const devices=[{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true}].filter(device=>!process.env.SMARTMATCH_DEVICE||device.name===process.env.SMARTMATCH_DEVICE);
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v6.html`;
const upload=(bytes,name='project.pdf')=>({name,mimeType:'application/pdf',buffer:bytes});
const checkedCount=data=>Object.values(data.checks||{}).flatMap(Object.values).filter(Boolean).length;
function cardData(data){return Object.entries(data.cards).map(([id,card])=>({id,page:card.page,code:card.code,codeRect:card.codeRect,tableRect:card.tableRect,bounds:card.bounds,work:card.work}));}

async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),plan=doc.addPage([595,842]),card=doc.addPage([595,842]);
 plan.drawText('Generated door plan',{x:50,y:780,size:19,font});
 const annotations=[];
 for(const [index,[x,y]]of [[60,640],[300,500],[60,350]].entries()){
  plan.drawRectangle({x:x-4,y:y-4,width:84,height:30,borderWidth:1,borderColor:rgb(.1,.3,.6)});
  plan.drawText('GS88',{x,y,size:20,font});
  annotations.push(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText('GS88'),Contents:PDFHexString.fromText(''),Rect:[x-4,y-4,x+80,y+26],F:4,NM:PDFHexString.fromText('generated-'+index)})));
 }
 plan.node.set(PDFName.of('Annots'),doc.context.obj(annotations));
 card.drawText('Beslagskod GS88',{x:60,y:730,size:20,font});
 const work=['Las ASSA EL580','Dorrautomatik ED100','Handtag HOPPE'];
 for(const [index,text]of work.entries())card.drawText(text,{x:60,y:650-index*30,size:17,font});
 return {bytes:Buffer.from(await doc.save()),work,codeRect:{x:.09,y:.10,w:.62,h:.06},tableRect:{x:.09,y:.20,w:.70,h:.15}};
}
async function contextFor(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{window.showSaveFilePicker=undefined;});
 return context;
}
async function observe(page,forbidScan=false){
 await page.evaluate(forbid=>{
  window.__directChecks={guideOpen:0,scans:0};
  const show=HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')window.__directChecks.guideOpen++;return show.call(this);};
  const matcher=SmartMatchReadMatcher;
  window.SmartMatchReadMatcher={...matcher,scan:options=>{window.__directChecks.scans++;if(forbid)throw Error('Opening a project must not scan');return matcher.scan(options);}};
 },forbidScan);
}
async function ready(page){await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===2&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});}
async function setRect(page,kind,rect){
 for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel(kind+' '+label,{exact:true}).evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);
}
async function projectData(bytes){const doc=await PDFDocument.load(bytes),raw=metadataKeys.map(key=>doc.catalog.get(key)).find(Boolean);assert(raw?.decodeText,'project PDF contains embedded state');return JSON.parse(raw.decodeText());}
async function modifiedProject(bytes,change){const doc=await PDFDocument.load(bytes);for(const key of metadataKeys){const raw=doc.catalog.get(key);if(!raw)continue;const data=JSON.parse(raw.decodeText());change(data.readTestData);doc.catalog.set(key,PDFHexString.fromText(JSON.stringify(data)));}return Buffer.from(await doc.save());}

async function exercise(browser,device,input){
 const context=await contextFor(browser,device),page=await context.newPage(),errors=[],remote=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(request.url()))remote.push(request.url());});
 try{
  await page.goto(url());await observe(page);
  await page.locator('#pwFile').setInputFiles(upload(input.bytes,'raw-drawing.pdf'));await page.waitForSelector('#rtDialog[open]');
  await setRect(page,'Kod',input.codeRect);await setRect(page,'Tabell',input.tableRect);
  await page.locator('#rtDiscover').click();await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:60000});
  assert.equal(await page.locator('#rtDiscoveryResults .rtPageChoice input:checked').count(),1,'one example finds the source card');
  await page.locator('#rtPreview').click();await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:60000});
  assert.equal(await page.getByLabel('Beteckning kort 1',{exact:true}).inputValue(),'GS88');
  assert.equal(await page.locator('.rtMatchRow').count(),3,'the initial guide finds all three candidates');
  await page.locator('.rtMatchRow input').last().uncheck();
  await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await ready(page);
  const reviewed=await page.evaluate(()=>SmartMatchReadTest.payload());
  assert.deepEqual(reviewed.matching.review,{version:1,approved:true},'approving the first review writes its explicit saved approval');
  assert.equal(reviewed.matching.hits.filter(hit=>hit.selected!==false).length,2,'the user excludes one candidate');
  assert(Object.values(reviewed.cards)[0].bounds,'discovery saves the card crop');
  const positions=await page.evaluate(()=>SmartMatchAppBridge.getPositions());
  await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),positions[0].id);
  await page.waitForSelector('#pwProtocol[open]');await page.locator('.rtWorkRow input').first().check();
  await page.locator('#pwProtocolClose').click();
  await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');
  const downloading=page.waitForEvent('download',{timeout:90000});await page.locator('#smartExportBuild').click();const download=await downloading,exported=fs.readFileSync(await download.path());
  const saved=await projectData(exported),expected=saved.readTestData;
  assert.equal(checkedCount(expected),1,'the exported PDF contains the per-door check');
  assert.deepEqual(cardData(expected),cardData(reviewed),'the exported PDF contains the source crop and work rows');
  assert.deepEqual(expected.matching,reviewed.matching,'the exported PDF retains the reviewed exclusion');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);

  // Fresh browsers prove that the reviewed links travel inside the PDF.
  for(const stale of [false,true]){
   const fresh=await contextFor(browser,device),reopened=await fresh.newPage(),reopenErrors=[];
   reopened.on('pageerror',error=>reopenErrors.push(error.message));
   try{
    await reopened.goto(url());await observe(reopened,true);
    if(stale){
     const sourceId=createHash('sha256').update(exported).digest('hex');
     await reopened.evaluate(({sourceId,data})=>localStorage.setItem('tillsyno-read-test-v6-source:'+sourceId,JSON.stringify({...data,sourceId,checks:{}})),{sourceId,data:expected});
    }
    await reopened.locator('#pwFile').setInputFiles(upload(exported));await ready(reopened);
    assert.deepEqual(await reopened.evaluate(()=>window.__directChecks),{guideOpen:0,scans:0},'normal Open PDF never opens the guide or scans');
    const restored=await reopened.evaluate(()=>SmartMatchReadTest.payload());
    assert.equal(checkedCount(restored),1,stale?'the PDF wins over stale browser data':'the PDF restores work in a fresh browser');
    assert.deepEqual(cardData(restored),cardData(expected),'card crops and work are restored exactly');
    assert.deepEqual(restored.matching,expected.matching,'only the reviewed candidates are restored');
    const restoredPositions=await reopened.evaluate(()=>SmartMatchAppBridge.getPositions());
    assert.deepEqual(restoredPositions.map(position=>position.id),positions.map(position=>position.id),'position identities remain stable');
    await reopened.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),positions[0].id);
    await reopened.waitForSelector('#pwProtocol[open]');
    await reopened.waitForFunction(()=>!!document.getElementById('pwProtocolCanvas')?.dataset.readCardId,null,{timeout:30000});
    assert.equal(await reopened.locator('#pwProtocolCanvas').getAttribute('data-read-card-id'),Object.values(expected.cards)[0].id,'the saved link opens its specific source crop');
    const canvasRatio=await reopened.locator('#pwProtocolCanvas').evaluate(canvas=>canvas.width/canvas.height),region=Object.values(expected.cards)[0].bounds;
    assert(Math.abs(canvasRatio-(595*region.w)/(842*region.h))<.04,'the card canvas uses the saved crop dimensions');
    assert(await reopened.locator('.rtWorkRow input').first().isChecked(),'the saved check is visible');assert.match(await reopened.locator('#pwProtocolPercent').textContent(),/33%/);
    if(!stale)await reopened.locator('.rtWorkRow input').nth(1).check();
    await reopened.locator('#pwProtocolClose').click();
    if(stale){
     await reopened.addInitScript(()=>{
      window.__reloadGuideOpen=0;window.__reloadScans=0;const show=HTMLDialogElement.prototype.showModal;let matcher;
      HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')window.__reloadGuideOpen++;return show.call(this);};
      Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:value=>{matcher={...value,scan:()=>{window.__reloadScans++;throw Error('Refresh must not scan');}};}});
     });
     await reopened.reload();await ready(reopened);
     assert.equal(await reopened.evaluate(()=>window.__reloadGuideOpen),0,'refresh of the imported project also skips the guide');
     assert.equal(await reopened.evaluate(()=>window.__reloadScans),0,'refresh of the imported project does not scan');
     assert.equal(await reopened.evaluate(()=>Object.values(SmartMatchReadTest.payload().checks).flatMap(Object.values).filter(Boolean).length),1,'refresh retains the imported PDF checks instead of reviving stale local data');
     assert.deepEqual(cardData(await reopened.evaluate(()=>SmartMatchReadTest.payload())),cardData(expected),'refresh retains the imported card crop');
    }
    if(!stale){
     await reopened.locator('#rtOpenSettings').click();await reopened.waitForSelector('#rtDialog[open]');
     assert.equal(await reopened.locator('.rtMatchRow input:checked').count(),2,'explicit settings opens the saved review');
     assert.equal(await reopened.locator('#rtMatchApproval').isChecked(),false,'explicit settings asks for a fresh approval');
     assert.equal(await reopened.evaluate(()=>window.__directChecks.scans),0,'opening settings does not run a search');
     await reopened.locator('#rtCancel').click();
     assert.equal(await reopened.evaluate(()=>Object.values(SmartMatchReadTest.payload().checks).flatMap(Object.values).filter(Boolean).length),2,'cancelling settings retains work edited after the PDF was exported');
     await reopened.locator('#rtOpenSettings').click();await reopened.waitForSelector('#rtDialog[open]');
     await reopened.locator('#rtMatchApproval').check();await reopened.locator('#rtStart').click();await ready(reopened);
     assert.equal(await reopened.evaluate(()=>Object.values(SmartMatchReadTest.payload().checks).flatMap(Object.values).filter(Boolean).length),2,'approving settings also retains the newer live work');
     assert.equal(await reopened.evaluate(()=>window.__directChecks.scans),0,'approving an unchanged review does not scan');
     await reopened.locator('#rtMultiFiles').setInputFiles(upload(exported));await reopened.waitForSelector('#rtDialog[open]');
     assert.equal(await reopened.evaluate(()=>window.__directChecks.guideOpen),3,'the separate multi-PDF action explicitly opens review even for one project PDF');
     assert.equal(await reopened.evaluate(()=>window.__directChecks.scans),0,'explicit review waits for a user search');
     await reopened.locator('#rtCancel').click();
     assert.equal(await reopened.evaluate(()=>Object.values(SmartMatchReadTest.payload().checks).flatMap(Object.values).filter(Boolean).length),2,'cancelling a separate review retains the current project work');
    }
    assert.deepEqual(reopenErrors,[]);
   }finally{await fresh.close();}
  }
  if(device.name==='desktop'){
   const legacyBytes=await modifiedProject(exported,data=>{delete data.matching.review;}),legacyContext=await contextFor(browser,device),legacy=await legacyContext.newPage();
   try{
    await legacy.goto(url());await observe(legacy,true);
    await legacy.locator('#pwFile').setInputFiles(upload(legacyBytes,'legacy-reviewed-project.pdf'));await ready(legacy);
    assert.deepEqual(await legacy.evaluate(()=>window.__directChecks),{guideOpen:0,scans:0},'legacy reviewed TEST 3–5 project PDFs also open directly');
    assert.equal(await legacy.evaluate(()=>Object.values(SmartMatchReadTest.payload().checks).flatMap(Object.values).filter(Boolean).length),1,'legacy embedded checks remain available');
   }finally{await legacyContext.close();}
   for(const [label,change]of [
    ['unapproved review',data=>{data.matching.review={version:1,approved:false};}],
    ['unsupported review version',data=>{data.matching.review={version:99,approved:true};}],
    ['invalid drawing page',data=>{data.matching.hits[0].page=99;}]
   ]){
    const modified=await modifiedProject(exported,change),fresh=await contextFor(browser,device),invalid=await fresh.newPage();
    try{
     await invalid.goto(url());await observe(invalid,true);
     await invalid.locator('#pwFile').setInputFiles(upload(modified,label+'.pdf'));await invalid.waitForSelector('#rtDialog[open]');
     assert.equal(await invalid.evaluate(()=>window.__directChecks.guideOpen),1,label+' requires the guide');
     assert.equal(await invalid.evaluate(()=>window.__directChecks.scans),0,label+' cannot trigger an automatic scan');
     assert.match(await invalid.locator('#rtStatus').textContent(),/Sparade kopplingar behöver granskas/,'invalid saved data displays a review warning');
     assert.equal(await invalid.locator('#rtMatchApproval').isChecked(),false,'invalid saved data is never preapproved');
    }catch(error){
     console.error(label+':',await invalid.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,state:document.getElementById('pwState')?.textContent,checks:window.__directChecks,dialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id)})));throw error;
    }finally{await fresh.close();}
   }
  }

  if(device.name==='desktop'){
   const rawHash=createHash('sha256').update(input.bytes).digest('hex'),fresh=await contextFor(browser,device),raw=await fresh.newPage();
   try{
    await raw.goto(url());await observe(raw,true);
    await raw.evaluate(({sourceId,data})=>localStorage.setItem('tillsyno-read-test-v6-source:'+sourceId,JSON.stringify({...data,sourceId})),{sourceId:rawHash,data:expected});
    await raw.locator('#pwFile').setInputFiles(upload(input.bytes,'raw-with-browser-cache.pdf'));await raw.waitForSelector('#rtDialog[open]');
    assert.equal(await raw.evaluate(()=>window.__directChecks.guideOpen),1,'a raw PDF still requires review even when approved data exists only in local storage');
    assert.equal(await raw.evaluate(()=>window.__directChecks.scans),0,'raw opening waits for the guide');
   }finally{await fresh.close();}
  }
  console.log('PASS '+device.name+': review once → exported PDF → direct fresh open; no guide/search, preserved crop, excluded hit and work; explicit settings/multifile review'+(device.name==='desktop'?'; raw PDF cache cannot bypass review':''));
  return {exported,expected};
 }catch(error){
  console.error('Browser state:',await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,state:document.getElementById('pwState')?.textContent,cards:[...document.querySelectorAll('.rtResult')].map(node=>({code:node.querySelector('input')?.value,work:node.querySelector('textarea')?.value})),positions:window.SmartMatchAppBridge?.getPositions()?.length,dialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id),checks:window.__directChecks})).catch(()=>null));throw error;
 }finally{await context.close();}
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
  const input=await fixture();for(const device of devices)await exercise(browser,device,input);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
