/* TEST 9.21 Safari crash-loop protection. The simulated old owner represents
 * an iPad WebKit process that was killed before pagehide could clear its guard. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),databaseName='smartmatch-read-test-v9-21-local-pdf-resume';
const activeKey='smartmatch-read-test-active-pdf:v9.21',viewKey='smartmatch-read-test-active-view:v9.21',guardKey='smartmatch-read-test-resume-guard:v9.21';
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end()}
 try{response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file))}
 catch(_){response.writeHead(404);response.end()}
});
const url=suffix=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-21.html${suffix||''}`;

async function contextFor(browser){
 const context=await browser.newContext({viewport:{width:1366,height:900},hasTouch:true,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  Object.defineProperty(Navigator.prototype,'platform',{configurable:true,get:()=> 'MacIntel'});
  Object.defineProperty(Navigator.prototype,'maxTouchPoints',{configurable:true,get:()=>5});
  window.__safeOpenCalls=0;let bridge;
  Object.defineProperty(window,'SmartMatchAppBridge',{configurable:true,get:()=>bridge,set:value=>{
   const open=value.openCachedPdf.bind(value);value.openCachedPdf=async(...args)=>{__safeOpenCalls++;return open(...args)};bridge=value;
  }});
 });
 return context;
}

async function seed(page){
 return page.evaluate(async({databaseName,activeKey,viewKey,guardKey})=>{
  const hash='sha256:ipad-crash-project',workspaceId=hash+':new:reviewed',savedAt=1700000000123;
  const bytes=new Uint8Array([37,80,68,70,45,49,46,55,10,37,226,227,207,211,10,49,10]);
  const blob=new Blob([bytes],{type:'application/pdf'}),payload={schema:6,projectId:'safe-session-project',projectRevision:7,marker:'reviewed checks stay here',readTestData:{schema:1,phase:'full'}};
  const database=await new Promise((resolve,reject)=>{const request=indexedDB.open(databaseName,2);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files',{keyPath:'id'});if(!request.result.objectStoreNames.contains('drafts'))request.result.createObjectStore('drafts',{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  await new Promise((resolve,reject)=>{const tx=database.transaction(['files','drafts'],'readwrite'),files=tx.objectStore('files');files.put({id:'active',hash,name:'crash-safe.pdf',blob});files.put({id:'project:'+workspaceId,hash,workspaceId,name:'crash-safe.pdf',blob,view:{fileKey:hash,workspaceId,localArchive:true},savedAt});tx.objectStore('drafts').put({id:workspaceId,baseRevision:7,payload,updatedAt:savedAt});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});database.close();
  sessionStorage.setItem(activeKey,hash);sessionStorage.setItem(viewKey,JSON.stringify({fileKey:hash,workspaceId,page:1,scale:1.1}));
  sessionStorage.setItem(guardKey,JSON.stringify({hash,phase:'active',owner:'terminated-webkit-process',updatedAt:Date.now()}));
  return {hash,workspaceId};
 },{databaseName,activeKey,viewKey,guardKey});
}

async function snapshot(page){
 return page.evaluate(async databaseName=>{
  const database=await new Promise((resolve,reject)=>{const request=indexedDB.open(databaseName);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  const read=store=>new Promise((resolve,reject)=>{const request=database.transaction(store,'readonly').objectStore(store).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  const [files,drafts]=await Promise.all([read('files'),read('drafts')]);database.close();
  const normalizedFiles=[];for(const file of files.sort((a,b)=>String(a.id).localeCompare(String(b.id))))normalizedFiles.push({id:file.id,hash:file.hash,workspaceId:file.workspaceId||'',name:file.name,savedAt:file.savedAt||0,view:file.view||null,bytes:[...new Uint8Array(await file.blob.arrayBuffer())]});
  return {files:normalizedFiles,drafts:drafts.sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(draft=>({id:draft.id,baseRevision:draft.baseRevision,payload:draft.payload,updatedAt:draft.updatedAt}))};
 },databaseName);
}

async function assertBlocked(page,reason,before,name){
 await page.waitForSelector(`#pwRestoreRecovery[data-reason="${reason}"]`);
 await page.waitForFunction(projectName=>[...document.querySelectorAll('.smRecentOpen strong')].some(node=>node.textContent===projectName),name,{timeout:30000});
 const state=await page.evaluate(()=>({pdf:!!SmartMatchAppBridge.getPdf(),openCalls:__safeOpenCalls,protection:SmartMatchSession.getResumeProtectionState(),safe:new URL(location.href).searchParams.get('safe'),recent:document.getElementById('pwRecentCount').textContent,recovery:document.getElementById('pwRestoreRecovery').dataset.reason}));
 assert.equal(state.pdf,false);assert.equal(state.openCalls,0,'blocked startup never hands the large blob to PDF.js');
 assert.equal(state.protection.blocked,true);assert.equal(state.protection.phase,'active');assert.equal(state.recovery,reason);
 assert.match(state.recent,/1 lokala projekt/);
 assert.deepEqual(await snapshot(page),before,'safe startup performs no delete, clear, migration or rewrite in IndexedDB');
 return state;
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,context;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});context=await contextFor(browser);
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(url());
  await seed(page);const before=await snapshot(page);

  // A guard owned by the terminated process survives this orderly navigation:
  // the current page instance is not allowed to clear somebody else's guard.
  await page.reload();
  const interrupted=await assertBlocked(page,'interrupted-active',before,'crash-safe.pdf');
  assert.equal(interrupted.safe,null);assert.equal(interrupted.protection.safeMode,false);

  // Explicit safe mode is also stable and stays in the URL until the user
  // chooses the retry action. Merely listing projects must not reopen the PDF.
  await page.goto(url('?safe=1'));
  const safe=await assertBlocked(page,'safe-query',before,'crash-safe.pdf');
  assert.equal(safe.safe,'1');assert.equal(safe.protection.safeMode,true);
  assert.equal(await page.locator('#pwRestoreRetry').innerText(),'Försök öppna projektet');
  assert.equal(await page.locator('#pwRestoreChoose').innerText(),'Välj en annan PDF');

  // This fixture intentionally contains non-parseable PDF bytes. A failed
  // explicit retry must keep the active pointer and re-enable the same button;
  // after the technician frees memory, another attempt is still possible.
  await page.locator('#pwRestoreRetry').click();
  await page.waitForFunction(()=>!document.getElementById('pwRestoreRetry').disabled&&SmartMatchSession.getResumeProtectionState().phase==='retry-failed');
  let retry=await page.evaluate(({activeKey,hash})=>({calls:__safeOpenCalls,active:sessionStorage.getItem(activeKey),url:location.href,protection:SmartMatchSession.getResumeProtectionState(),status:document.getElementById('pwRestoreRecoveryStatus').textContent,expected:hash}),{activeKey,hash:safe.protection.hash});
  assert.equal(retry.calls,1);assert.equal(retry.active,retry.expected);assert.equal(retry.protection.phase,'retry-failed');assert.equal(retry.protection.blocked,true);assert.equal(new URL(retry.url).searchParams.has('safe'),false);assert.match(retry.status,/kunde inte öppnas/);
  assert.deepEqual(await snapshot(page),before,'a failed retry leaves the PDF archive and reviewed draft untouched');
  await page.locator('#pwRestoreRetry').click();
  await page.waitForFunction(()=>__safeOpenCalls===2&&!document.getElementById('pwRestoreRetry').disabled&&SmartMatchSession.getResumeProtectionState().phase==='retry-failed');
  retry=await page.evaluate(activeKey=>({active:sessionStorage.getItem(activeKey),protection:SmartMatchSession.getResumeProtectionState()}),activeKey);
  assert.equal(retry.active,safe.protection.hash);assert.equal(retry.protection.phase,'retry-failed');
  assert.deepEqual(await snapshot(page),before,'a second failed retry is equally non-destructive');
  assert.deepEqual(errors,[]);
  console.log('PASS TEST 9.21 iPad crash guard and ?safe=1 preserve IndexedDB; failed retry remains available and non-destructive');
 }finally{await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
