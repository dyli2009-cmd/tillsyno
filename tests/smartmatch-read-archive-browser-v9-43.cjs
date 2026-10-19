/* Actual IndexedDB migration: TEST 9.9 archives remain untouched while TEST
 * 9.10 copies PDF bytes and independent work drafts into its own namespace.
 * Generated PDFs only; authentication is stubbed only inside this test. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),sourceDb='smartmatch-read-test-v9-42-local-pdf-resume',targetDb='smartmatch-read-test-v9-shared-local-pdf-resume';
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
 await page.goto(origin()+'/smartmatch-read-test-v9-43.html');
 await page.waitForFunction(()=>typeof window.SmartMatchSession?.listProjects==='function');
 return page.evaluate(()=>SmartMatchSession.listProjects());
}
const noScan=async page=>assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});
  const context=await contextFor(browser),page=await context.newPage(),input=await fixture();
  await page.goto(origin()+'/__archive_blank.html');await seed(page,sourceDb,{files:[input.archive],drafts:[input.draft]});
  const before=await snapshot(page,sourceDb),projects=await enter(page);assert.equal(projects.length,1);assert.equal(projects[0].sourceVersion,'TEST 9.42');
  await page.evaluate(key=>SmartMatchSession.openProject(key),projects[0].key);
  await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden);
  const position=await page.evaluate(()=>SmartMatchAppBridge.getPositions()[0]);assert.equal(position.id,input.positionId);assert.equal(position.checks[input.itemKey],true);
  await page.evaluate(()=>SmartMatchSession.archiveCurrentProject({keepActive:true}));
  const stored=await snapshot(page,targetDb);assert(stored.files.some(record=>record.id.startsWith('project:')));assert(stored.drafts.some(record=>record.payload.timeConfig.custom[0].minutes===31));
  assert.deepEqual(await snapshot(page,sourceDb),before);await noScan(page);await context.close();
  console.log('PASS TEST 9.43: recover TEST 9.42 PDF and draft without scanning, preserve source database, save to stable shared storage');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
