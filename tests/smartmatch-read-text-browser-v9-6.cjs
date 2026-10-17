/* Generated font-fallback fragments, arbitrary Swedish identities and native
 * product text. No customer documents, external OCR or auth changes. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const {PDFDocument,StandardFonts}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const file=path.resolve(__dirname,'smartmatch-read-work-browser-v9-4.cjs'),m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));
m._compile(fs.readFileSync(file,'utf8').split('(async()=>{await new Promise(resolve=>server.listen')[0].replaceAll('smartmatch-read-test-v9-4.html','smartmatch-read-test-v9-6.html')+'\nmodule.exports={server,contextFor,setRect,idle,url,payload,positions,workState,openPosition};',file);
const {server,contextFor,setRect,idle,url,payload,positions,workState,openPosition}=m.exports;
const labels=['ÖSTÅ12','Källare','DBLB UPPST','GS 23','WC','DBL-DS','Ny dörrtyp','STÄD','STAD'];
const products=[['Dörrstängare','TS93'],['Lås','EL580'],['Karmöverföring','EA281'],['Öppningsknapp','BEA'],['Glas','Säkerhetsglas']];
const expectedRows=products.map(row=>row.join(' '));
const normalize=require('../smartmatch-read-codes-v9-6.js').normalize;
async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),fallback=await doc.embedFont(StandardFonts.HelveticaBold),plan=doc.addPage([1200,900]);
 function fragments(page,text,x,y,size){
  // Split at Swedish glyphs with another font, exactly touching at each
  // fragment edge. No selected-code list or word dictionary repairs this.
  for(const part of text.split(/([åäöÅÄÖ])/u).filter(Boolean)){
   const selected=/^[åäöÅÄÖ]$/u.test(part)?fallback:font;page.drawText(part,{x,y,size,font:selected});x+=selected.widthOfTextAtSize(part,size);
  }
 }
 for(const [index,label]of labels.entries())for(const x of [80,680])fragments(plan,label,x,800-index*70,18);
 for(const [index,label]of ['WC1','DBL-DS1','ÖSTÅ123','DBLB UPPSTD'].entries())fragments(plan,label,360,800-index*70,18);
 for(const label of labels){
  const page=doc.addPage([595,842]);fragments(page,'Dörrkort '+label,60,750,20);
  for(const [index,[component,product]]of products.entries()){
   fragments(page,component,40,680-index*40,12);fragments(page,product,270,680-index*40,12);
  }
 }
 return Buffer.from(await doc.save());
}
async function ready(page){await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===18&&document.getElementById('pwScanOverlay').hidden);}
async function choose(page,button,buffer,name){
 const picked=page.waitForEvent('filechooser');await page.locator(button).click();await(await picked).setFiles({name,mimeType:'application/pdf',buffer});
}
async function exercise(browser,device,input){
 const context=await contextFor(browser,device);await context.addInitScript(()=>{window.showOpenFilePicker=undefined});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(url());await choose(page,'#pwOpenProjectEmpty',input,'unread.pdf');await page.waitForFunction(()=>document.body.innerText.includes('PDF:en saknar en färdig, sparad avläsning'));
  assert.equal(await page.evaluate(()=>__calls.guides+__calls.scans+__calls.workers),0,'Open PDF never starts a new analysis on an unread file');assert.equal(await page.evaluate(()=>SmartMatchAppBridge.getPdf()),null);
  await page.goto(url());await choose(page,'#rtChooseFiles',input,'generated-swedish.pdf');await page.waitForSelector('#rtDialog[open]');assert.equal(await page.locator('#rtReadPhase').inputValue(),'full','one full read is the default');
  await page.locator('#rtPage').fill('2');await page.locator('#rtPage').press('Tab');await page.locator('#rtImageMode').selectOption('text');
  await setRect(page,'Kod',{x:.08,y:.08,w:.84,h:.06});await setRect(page,'Tabell',{x:.04,y:.16,w:.93,h:.32});await page.locator('#rtWorkPolicy').selectOption('all');await page.locator('#rtDiscover').click();await idle(page);assert.equal(await page.locator('#rtDiscoveryResults .rtPageChoice input:checked').count(),9);
  await page.locator('#rtPreview').click();await idle(page);assert.equal(await page.locator('.rtMatchRow').count(),18,'full identities match twice each; longer codes and Swedish spelling variants stay distinct');
  const choices=await page.locator('#rtResults input').evaluateAll(nodes=>nodes.map(node=>node.value));assert.deepEqual(choices,labels.map(normalize),'no manual code corrections or hardcoded GS/name filter');
  assert(!/D ö rrkort|DÖRRKORT/.test(await page.locator('#rtResults').innerText()));await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await ready(page);
  const links=(await payload(page)).matching,ids=(await positions(page)).map(p=>p.id);
  for(const card of Object.values((await payload(page)).cards))assert.deepEqual(card.work,expectedRows,'Swedish component and product words retain spelling and column gaps');
  assert(await page.locator('#pwReadContinueProducts').isHidden(),'complete products never prompt another read');const beforeCalls=await page.evaluate(()=>structuredClone(__calls));await page.evaluate(()=>SmartMatchReadTest.continueProducts());assert.deepEqual(await page.evaluate(()=>__calls),beforeCalls,'even an old continue action cannot reread finished products');
  await openPosition(page,ids[0]);await page.locator('#pwChecklist .rtWorkRow input').first().check();const checked=await workState(page,ids[0]);assert.equal(checked.done,1);await page.locator('#pwProtocolClose').click();
  await page.evaluate(()=>SmartMatchSession.archiveCurrentProject({keepActive:true,name:'original-with-local-work.pdf'}));
  await page.evaluate(()=>{__forbidScan=true});await page.locator('#pwFinishProject').click();await page.waitForFunction(()=>!SmartMatchAppBridge.getPdf());await page.locator('.smRecentOpen').first().click();await ready(page);await page.waitForFunction(()=>document.getElementById('pwHomeStatus').textContent==='Projektet öppnat.');assert.deepEqual(await workState(page,ids[0]),checked,'opening a locally archived raw original restores its separate saved draft');
  await page.reload();await ready(page);
  assert.equal(await page.evaluate(()=>__calls.guides+__calls.scans+__calls.work+__calls.workers),0,'raw original plus its archived draft resumes without rescanning');assert.deepEqual(await workState(page,ids[0]),checked);
  await page.locator('#smartPdfInspect').click();await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled);const downloading=page.waitForEvent('download');await page.locator('#smartExportBuild').click();const saved=fs.readFileSync(await(await downloading).path());assert(saved.length>1000);await page.locator('#smartExportClose').click();
  const fresh=await contextFor(browser,device);await fresh.addInitScript(()=>{window.showOpenFilePicker=undefined});const reopened=await fresh.newPage();try{
   await reopened.goto(url());await reopened.evaluate(()=>{__forbidScan=true});await choose(reopened,'#pwOpenProjectEmpty',saved,'saved-swedish.pdf');await ready(reopened);
   assert.deepEqual((await payload(reopened)).matching,links);assert.deepEqual(await workState(reopened,ids[0]),checked);assert.deepEqual((await positions(reopened)).map(p=>p.id),ids);assert.equal(await reopened.evaluate(()=>__calls.scans+__calls.work+__calls.workers+__calls.guides),0,'saved project opens in a clean browser without scanning, product reading or OCR');
   assert(await reopened.locator('#pwReadContinueProducts').isHidden());
  }finally{await fresh.close()}
  const throughPrepare=await contextFor(browser,device),another=await throughPrepare.newPage();try{
   await another.goto(url());await another.evaluate(()=>{__forbidScan=true});await choose(another,'#rtChooseFiles',saved,'already-read-project.pdf');await ready(another);assert.equal(await another.evaluate(()=>__calls.guides+__calls.scans+__calls.work+__calls.workers),0,'even the prepare button recognizes one already-prepared project instead of forcing a guide');
  }finally{await throughPrepare.close()}
  assert.equal(await page.evaluate(()=>__calls.workers),0);assert.deepEqual(errors,[]);
  console.log('PASS '+device.name+': 9 arbitrary/native Swedish card identities, 18 exact drawing links, repaired words in 5 product rows, independent accents, PDF/check roundtrip without rereading');
 }finally{await context.close()}
}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const input=await fixture();
 for(const device of [{name:'desktop',width:1366,height:900},{name:'ipad',width:820,height:1180,touch:true},{name:'iphone',width:390,height:844,touch:true}].filter(d=>!process.env.SMARTMATCH_DEVICE||d.name===process.env.SMARTMATCH_DEVICE))await exercise(browser,device,input);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}})().catch(error=>{console.error(error);process.exitCode=1});
