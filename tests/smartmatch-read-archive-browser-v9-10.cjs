/* Actual IndexedDB migration: TEST 9.9 archives remain untouched while TEST
 * 9.10 copies PDF bytes and independent work drafts into its own namespace.
 * Generated PDFs only; authentication is stubbed only inside this test. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),sourceDb='smartmatch-read-test-v9-9-local-pdf-resume',targetDb='smartmatch-read-test-v9-10-local-pdf-resume';
const server=http.createServer((request,response)=>{
 const pathname=new URL(request.url,'http://localhost').pathname;
 if(pathname==='/__archive_blank.html'){response.setHeader('Content-Type','text/html; charset=utf-8');return response.end('<!doctype html><title>Archive test setup</title>');}
 const filename=path.resolve(root,decodeURIComponent(pathname).replace(/^\//,''));
 if(!filename.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(filename)]||'application/octet-stream');response.end(fs.readFileSync(filename));}
 catch(_){response.writeHead(404);response.end();}
});
const origin=()=>`http://127.0.0.1:${server.address().port}`;
const clone=value=>JSON.parse(JSON.stringify(value));
function hashBytes(bytes){let value=2166136261;const step=Math.max(1,Math.floor(bytes.length/50000));for(let index=0;index<bytes.length;index+=step){value^=bytes[index];value=Math.imul(value,16777619);}return (value>>>0).toString(36);}
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([595,842]),card=document.addPage([595,842]);
 plan.drawText('GS23',{x:60,y:650,size:18,font});card.drawText('Beslagskod: GS23',{x:60,y:750,size:20,font});card.drawText('Archiveproduct EL580',{x:60,y:670,size:14,font});
 const positionId='archive-position:GS23',itemKey='archive-lock',rect={x:.08,y:.08,w:.84,h:.06},table={x:.06,y:.16,w:.84,h:.26},id='archive-card:GS23';
 const readTestData={schema:1,phase:'full',sourceId:'generated:archive-v99',rects:{code:rect,table},pages:[2],cards:{[id]:{id,page:2,code:'GS23',originalCardCode:'GS23',header:'Beslagskod: GS23',codeRect:rect,tableRect:table,bounds:{x:.06,y:.08,w:.86,h:.34},rawTable:'Archiveproduct EL580',work:['Archiveproduct EL580'],workItems:[{text:'Archiveproduct EL580',key:itemKey,label:'Archiveproduct',value:'EL580',section:'Övrigt',sectionKey:'ovrigt'}],workState:'ready',workPolicy:'all',choices:['GS23'],method:'PDF-text',confidence:100}},checks:{},matching:{version:2,hits:[{page:1,code:'GS23',rect:[60,650,160,675],box:{x:60/595,y:167/842,w:100/595,h:25/842},positionId,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000}],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated archive TEST 9.9'};
 const payload={schema:6,projectId:'project:archive-v99',projectRevision:1,instances:{},automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 const bytes=Buffer.from(await document.save()),hash=hashBytes(bytes),workspaceId=hash+':new:archived';
 const draftPayload=clone(payload);draftPayload.projectRevision=2;draftPayload.readTestData.checks[positionId]={[itemKey]:true};draftPayload.instances[positionId]={checks:{[itemKey]:true},rowStages:{[itemKey]:'done'},progress:100,overrides:{},customItems:[]};
 draftPayload.timeConfig={minutes:{},disabled:[],custom:[{key:'archive-specific',label:'Archiveproduct montage',minutes:31,terms:['archiveproduct']}]};
 const archive={id:'project:'+workspaceId,hash,workspaceId,name:'Sparat arbete 9.9.pdf',blobBytes:[...bytes],view:{fileKey:hash,workspaceId,localArchive:true,page:1,scale:1.1},savedAt:1700000000000};
 const draft={id:workspaceId,baseRevision:1,payload:draftPayload,updatedAt:1700000000010};
 const activeWorkspace=hash+':new:active',active={id:'active',hash,name:'Aktivt arbete 9.9.pdf',blobBytes:[...bytes]},activeDraft={...clone(draft),id:activeWorkspace,updatedAt:1700000000020};
 return {bytes,hash,workspaceId,archive,draft,active,activeDraft,positionId,itemKey};
}
async function contextFor(browser){
 const context=await browser.newContext({viewport:{width:1366,height:900}});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.__calls={scans:0,work:0,workers:0,guides:0};
  window.Tesseract={async createWorker(){__calls.workers++;throw Error('Archive restoration must never start OCR');}};
  for(const [name,key,method]of [['SmartMatchReadMatcher','scans','scan'],['SmartMatchReadWork','work','read']]){
   let value;Object.defineProperty(window,name,{configurable:true,get:()=>value,set:next=>{value={...next,[method]:()=>{__calls[key]++;throw Error('Archive restoration must never scan');}};}});
  }
  const show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')__calls.guides++;return show.call(this);};
 });
 return context;
}
async function seed(page,name,records){
 await page.evaluate(async({name,records})=>{
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(name,2);request.onupgradeneeded=()=>{for(const store of ['files','drafts'])if(!request.result.objectStoreNames.contains(store))request.result.createObjectStore(store,{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{await new Promise((resolve,reject)=>{const tx=db.transaction(['files','drafts'],'readwrite');for(const [store,items]of Object.entries(records))for(const item of items){const record={...item};if(record.blobBytes){record.blob=new Blob([new Uint8Array(record.blobBytes)],{type:'application/pdf'});delete record.blobBytes;}tx.objectStore(store).put(record);}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
 },{name,records});
}
async function snapshot(page,name){
 return page.evaluate(async name=>{
  if(!(await indexedDB.databases()).some(database=>database.name===name))return null;
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(name);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{const result={};for(const store of ['files','drafts']){const records=await new Promise((resolve,reject)=>{const request=db.transaction(store,'readonly').objectStore(store).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});result[store]=await Promise.all(records.map(async item=>{const record={...item};if(record.blob){record.blobBytes=[...new Uint8Array(await record.blob.arrayBuffer())];record.blobType=record.blob.type;delete record.blob;}return record;}));result[store].sort((a,b)=>String(a.id).localeCompare(String(b.id)));}return result;}finally{db.close();}
 },name);
}
async function enter(page){
 await page.goto(origin()+'/smartmatch-read-test-v9-10.html');
 await page.waitForFunction(()=>typeof window.SmartMatchSession?.listProjects==='function');
 return page.evaluate(()=>SmartMatchSession.listProjects());
}
const noScan=async page=>assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});
async function copiesAndRestores(browser,input){
 const context=await contextFor(browser),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(origin()+'/__archive_blank.html');await seed(page,sourceDb,{files:[input.archive,input.active],drafts:[input.draft,input.activeDraft]});const before=await snapshot(page,sourceDb);
  const projects=await enter(page);assert.deepEqual(projects.map(project=>project.hash).sort(),[input.workspaceId,input.activeDraft.id].sort(),'named and reviewed active 9.9 projects are recoverable in the new namespace');
  const migrated=await snapshot(page,targetDb),original=before.files.find(record=>record.id===input.archive.id),copy=migrated.files.find(record=>record.id===input.archive.id);
  assert.deepEqual(copy,original,'named project keeps exact source PDF bytes, metadata and saved view');assert.deepEqual(migrated.drafts.find(draft=>draft.id===input.workspaceId),input.draft,'independent draft retains checks, row stages, source mappings and custom time');
  const rescued=migrated.files.find(record=>record.id==='project:'+input.activeDraft.id);assert(rescued,'a reviewed active 9.9 draft is rescued as a named project');assert.deepEqual(rescued.blobBytes,[...input.bytes],'active recovery keeps the source PDF byte-for-byte');assert.deepEqual(migrated.drafts.find(draft=>draft.id===input.activeDraft.id),input.activeDraft);
  assert(migrated.files.some(record=>record.id==='recovered-v9-9'),'migration records its own revision marker');assert.deepEqual(await snapshot(page,sourceDb),before,'source 9.9 database is not modified');
  assert.deepEqual(await page.evaluate(()=>SmartMatchSession.listProjects()),projects,'repeated list refreshes do not create duplicate archives');await noScan(page);
  await page.evaluate(workspaceId=>SmartMatchSession.openProject(workspaceId),input.workspaceId);await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
  const position=await page.evaluate(()=>{const value=SmartMatchAppBridge.getPositions()[0];return {id:value.id,checks:value.checks,work:SmartMatchAppBridge.readWorkState(value)};});assert.equal(position.id,input.positionId);assert.equal(position.checks[input.itemKey],true,'recovered archive opens with its independent checked task');assert.equal(position.work.done,1);assert.equal(position.work.doneMinutes,31,'custom saved montage time is restored from the old local draft');
  await noScan(page);assert.deepEqual(await snapshot(page,sourceDb),before,'opening a recovered project does not mutate the old version');assert.deepEqual(errors,[]);
  console.log('PASS desktop: TEST 9.9 archive and reviewed active draft migrate with exact PDF/check/time data; restored work opens with 0 OCR, searches, product reads or guides');
 }finally{await context.close();}
}
async function preservesTarget(browser,input){
 const context=await contextFor(browser),page=await context.newPage();
 try{
  await page.goto(origin()+'/__archive_blank.html');await seed(page,sourceDb,{files:[input.archive],drafts:[input.draft]});
  const targetRecord={...clone(input.archive),name:'Nyare arbete 9.10.pdf',savedAt:1800000000000,blobBytes:[...input.bytes,10]},targetDraft=clone(input.draft);targetDraft.updatedAt=1800000000010;targetDraft.payload.instances[input.positionId].checks[input.itemKey]=false;targetDraft.payload.timeConfig.custom[0].minutes=47;
  await seed(page,targetDb,{files:[targetRecord],drafts:[targetDraft]});const beforeSource=await snapshot(page,sourceDb),beforeTarget=await snapshot(page,targetDb);
  const projects=await enter(page);assert.deepEqual(projects,[{hash:input.workspaceId,name:targetRecord.name,savedAt:targetRecord.savedAt}]);assert.deepEqual(await snapshot(page,targetDb),beforeTarget,'an existing new-version archive and its newer draft are never replaced');assert.deepEqual(await snapshot(page,sourceDb),beforeSource);await noScan(page);
  console.log('PASS desktop: an existing TEST 9.10 archive keeps its own PDF bytes, checks and times; source TEST 9.9 is untouched');
 }finally{await context.close();}
}
async function preservesDraftOnly(browser,input){
 const context=await contextFor(browser),page=await context.newPage();
 try{
  await page.goto(origin()+'/__archive_blank.html');await seed(page,sourceDb,{files:[input.archive],drafts:[input.draft]});
  const newerDraft=clone(input.draft);newerDraft.updatedAt=1900000000000;newerDraft.payload.timeConfig.custom[0].minutes=53;await seed(page,targetDb,{files:[],drafts:[newerDraft]});const beforeSource=await snapshot(page,sourceDb);
  assert.equal((await enter(page)).length,1);const result=await snapshot(page,targetDb);assert.deepEqual(result.drafts,[newerDraft],'a newer target draft is preserved even when its PDF archive must be recovered');assert.deepEqual(result.files.find(record=>record.id===input.archive.id).blobBytes,[...input.bytes]);assert.deepEqual(await snapshot(page,sourceDb),beforeSource);await noScan(page);
  console.log('PASS desktop: PDF recovery preserves an already-existing TEST 9.10 draft instead of overwriting work');
 }finally{await context.close();}
}
async function absentSource(browser){
 const context=await contextFor(browser),page=await context.newPage();
 try{
  await page.goto(origin()+'/__archive_blank.html');assert.equal(await snapshot(page,sourceDb),null);assert.deepEqual(await enter(page),[]);assert.equal(await snapshot(page,sourceDb),null,'checking for an absent old-version database must leave it absent');const target=await snapshot(page,targetDb);assert.deepEqual(target,{files:[],drafts:[]});await noScan(page);
  console.log('PASS desktop: a fresh browser creates only the new namespace and leaves absent TEST 9.9 storage absent');
 }finally{await context.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const input=await fixture();await copiesAndRestores(browser,input);await preservesTarget(browser,input);await preservesDraftOnly(browser,input);await absentSource(browser);}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
