/* Actual TEST 9.5 UI, native save streams, export failure/retry, direct PDF
 * reopening and recovery of a 9.4 local archive. Synthetic fixtures only. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const {PDFDocument}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const file=path.resolve(__dirname,'smartmatch-read-work-browser-v9-4.cjs');
const source=fs.readFileSync(file,'utf8').split('(async()=>{await new Promise(resolve=>server.listen')[0].replaceAll('smartmatch-read-test-v9-4.html','smartmatch-read-test-v9-5.html');
const fixtureModule=new Module(file,module);fixtureModule.filename=file;fixtureModule.paths=Module._nodeModulePaths(path.dirname(file));
fixtureModule._compile(source+'\nmodule.exports={server,fixture,exercise,contextFor,ready,payload,positions,workState,openPosition,url};',file);
const {server,fixture,exercise,contextFor,ready,payload,positions,workState,openPosition,url}=fixtureModule.exports;
const device={name:'desktop',width:1366,height:900};
async function saveDialog(page){await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');}
async function saveReady(page){await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled);}
async function installDisk(page){
 await page.evaluate(()=>{
  window.__disk={picks:0,opens:0,writes:0,closes:0,aborts:0,bytes:[],failWrite:false,emptyReadback:false,delayPicker:false};
  const handle={name:'native-save.pdf',getFile:async()=>new File([__disk.emptyReadback?new Uint8Array():new Uint8Array(__disk.bytes)],'native-save.pdf',{type:'application/pdf'}),async createWritable(){
   __disk.opens++;let pending=null;return {async write(blob){__disk.writes++;if(__disk.failWrite)throw Error('Generated disk full');pending=blob},async close(){__disk.closes++;__disk.bytes=Array.from(new Uint8Array(await pending.arrayBuffer()))},async abort(){__disk.aborts++}};
  }};
  window.showSaveFilePicker=()=>{__disk.picks++;if(__disk.delayPicker)return new Promise(resolve=>{window.__releasePicker=()=>resolve(handle)});return Promise.resolve(handle)};
  const load=PDFLib.PDFDocument.load;
  PDFLib.PDFDocument.load=async function(...args){
   if(window.__pauseExport)await new Promise(resolve=>{window.__releaseExport=resolve});
   if(window.__failExport)throw Error('Generated export failure');
   return load.apply(this,args);
  };
 });
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const generated=await exercise(browser,device,await fixture());
  const context=await contextFor(browser,device),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url());await page.locator('#pwFile').setInputFiles({name:'complete-project.pdf',mimeType:'application/pdf',buffer:generated.portable});await ready(page);
  const before=await payload(page),state=await workState(page,generated.chosenId),links=await positions(page);
  await installDisk(page);await page.evaluate(()=>{__pauseExport=true;__failExport=true});await saveDialog(page);
  await page.waitForFunction(()=>typeof __releaseExport==='function');assert(await page.locator('#smartExportBuild').isDisabled());assert.equal(await page.evaluate(()=>__disk.picks),0);
  await page.evaluate(()=>{__pauseExport=false;__releaseExport()});await page.locator('#smartExportRetry').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>__disk.picks),0,'failed export leaves no Windows zero-byte placeholder');assert.match(await page.locator('#smartExportStatus').innerText(),/Ingen sparruta/);
  await page.evaluate(()=>{__failExport=false});await page.locator('#smartExportRetry').click();await saveReady(page);assert.match(await page.locator('#smartExportFinalSize').innerText(),/MB/);
  await page.evaluate(()=>{__disk.delayPicker=true});await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>__disk.picks===1);
  await page.locator('#smartExportClose').click();await page.evaluate(()=>__releasePicker());await page.waitForFunction(()=>__disk.closes===1&&__disk.bytes.length>0);
  const saved=Buffer.from(await page.evaluate(()=>__disk.bytes));await PDFDocument.load(saved);assert(saved.length>1000);
  const reopenContext=await contextFor(browser,device),reopened=await reopenContext.newPage();
  await reopened.goto(url());await reopened.evaluate(()=>{__forbidScan=true});await reopened.locator('#pwFile').setInputFiles({name:'native-save.pdf',mimeType:'application/pdf',buffer:saved});await ready(reopened);
  assert.deepEqual((await payload(reopened)).matching,before.matching);assert.deepEqual(await workState(reopened,generated.chosenId),state);assert.equal(await reopened.evaluate(()=>__calls.scans),0);
  await openPosition(reopened,generated.chosenId);assert.equal(await reopened.locator('#pwChecklist .rtWorkRow').count(),8);await reopened.locator('#pwProtocolClose').click();
  console.log('PASS actual UI: export failure/retry, delayed Windows picker, closing save dialog, nonempty PDF reopens with all links/products/checks/time and no scan');

  await page.evaluate(()=>{__disk.delayPicker=false;__disk.failWrite=true});await saveDialog(page);await saveReady(page);await page.locator('#smartExportBuild').click();
  await page.waitForFunction(()=>document.getElementById('smartExportStatus').dataset.level==='warning');assert.match(await page.locator('#smartExportStatus').innerText(),/Generated disk full/);
  assert.equal(await page.evaluate(()=>__disk.closes),1);assert.equal(await page.evaluate(()=>__disk.aborts),1);assert.deepEqual(Buffer.from(await page.evaluate(()=>__disk.bytes)),saved,'failed replacement leaves original disk bytes unchanged');
  await page.evaluate(()=>{__disk.failWrite=false;__disk.emptyReadback=true});await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>/tom eller ofullständig/.test(document.getElementById('smartExportStatus').textContent));
  assert.equal(await page.locator('#smartExportStatus').getAttribute('data-level'),'warning');assert.deepEqual(await payload(page),before);
  await page.locator('#smartExportClose').click();await page.locator('#pwFile').setInputFiles({name:'zero-bytes.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(0)});
  await page.waitForFunction(()=>document.body.innerText.includes('PDF-filen är tom (0 byte)'));assert.deepEqual(await positions(page),links);assert.deepEqual(await workState(page,generated.chosenId),state);assert(await page.evaluate(()=>!!SmartMatchAppBridge.getPdf()));
  console.log('PASS write failure aborts, bad disk readback is reported, and opening an empty file retains the existing project');
  assert.deepEqual(errors,[]);await context.close();await reopenContext.close();

  const oldContext=await contextFor(browser,device),old=await oldContext.newPage();
  await old.goto(url().replace('v9-5.html','v9-4.html'));await old.locator('#pwFile').setInputFiles({name:'local-recovery.pdf',mimeType:'application/pdf',buffer:generated.portable});await ready(old);
  await old.evaluate(()=>SmartMatchSession.archiveCurrentProject({keepActive:true,name:'local-recovery.pdf'}));
  // Force the real startup ordering that once hid the recovered project list:
  // main's zero-delay timer fires before the session module is downloaded.
  await old.route('**/smartmatch-read-test-session-v9-5.js*',async route=>{await new Promise(resolve=>setTimeout(resolve,300));await route.continue()});
  await old.goto(url());await old.locator('.smRecentOpen').filter({hasText:'local-recovery.pdf'}).waitFor();await old.locator('.smRecentOpen').filter({hasText:'local-recovery.pdf'}).click();await ready(old);
  assert.deepEqual(await workState(old,generated.chosenId),state);assert.deepEqual((await payload(old)).matching,before.matching);
  const local=await old.evaluate(()=>SmartMatchSession.listProjects());assert.equal(local.length,1);
  // Recovery must never erase the source archive in the earlier test version.
  const oldSize=await old.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('smartmatch-read-test-v9-4-local-pdf-resume');request.onsuccess=()=>{const db=request.result,r=db.transaction('files').objectStore('files').getAll();r.onsuccess=()=>{resolve(r.result.find(item=>item.id.startsWith('project:'))?.blob.size);db.close()};r.onerror=()=>reject(r.error)}}));
  assert(oldSize>1000);
  await old.goto(url());await old.waitForFunction(()=>!SmartMatchAppBridge.getPdf());await old.evaluate(()=>SmartMatchSession.deleteAllProjects());await old.reload();await old.waitForTimeout(500);assert.equal(await old.locator('.smRecentOpen').count(),0,'deleted recovered archives never reappear');
  console.log('PASS previous TEST 9.4 local archive and checks recover into separate 9.5 storage; source remains intact and deletion stays deleted');
  await oldContext.close();
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
