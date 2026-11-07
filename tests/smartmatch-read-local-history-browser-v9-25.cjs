/* Local-history regression for TEST 9.25.
 * Generated PDFs only: older IndexedDB namespaces are read without mutation,
 * remain visible beside current-version work, and reopen without rescanning. */
'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
 ?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');

const root=path.resolve(__dirname,'..');
const currentDb='smartmatch-read-test-v9-25-local-pdf-resume';
const metadataKeys=['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'].map(PDFName.of);
const server=http.createServer((request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,'');
 const file=path.resolve(root,pathname);
 if(!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return}
 try{
  response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end()}
});
const url=version=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v${version}.html`;
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));

async function fixture(code){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica);
 const drawing=document.addPage([595,842]),cardPage=document.addPage([595,842]);
 const x=70,y=690,rect=[x,y,x+105,y+28],positionId='saved-position:'+code,cardId='generated-card:'+code;
 drawing.drawText(code,{x,y,size:18,font});
 cardPage.drawText('Beslagskod: '+code,{x:55,y:760,size:18,font});
 cardPage.drawText('Las '+code,{x:55,y:665,size:14,font});
 cardPage.drawText('Dorrstangare '+code,{x:55,y:625,size:14,font});
 const codeRect={x:.07,y:.07,w:.82,h:.07},tableRect={x:.07,y:.16,w:.84,h:.30};
 const workItems=[
  {text:'Las '+code,label:'Las',value:code,key:'row-lock-'+code,section:'Ovrigt',sectionKey:'ovrigt',responsibility:'GS'},
  {text:'Dorrstangare '+code,label:'Dorrstangare',value:code,key:'row-closer-'+code,section:'Ovrigt',sectionKey:'ovrigt',responsibility:'GS'}
 ];
 const hit={page:1,code,rect,box:{x:x/595,y:(842-y-28)/842,w:105/595,h:28/842},positionId,selected:true,
  source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870001,label:code,sourceCardId:cardId,cardPage:2,originalCardCode:code};
 const readTestData={schema:2,phase:'full',sourceId:'generated-history:'+code,rects:{code:codeRect,table:tableRect},pages:[2],
  cards:{[cardId]:{id:cardId,page:2,code,originalCardCode:code,header:'Beslagskod: '+code,
   rawTable:workItems.map(item=>item.text+' GS').join('\n'),work:workItems.map(item=>item.text),workItems,
   workPolicy:'gs-install-v2',workState:'ready',codeRect,tableRect,bounds:{x:.06,y:.06,w:.86,h:.40},choices:[code],method:'PDF-text',confidence:100}},
  deferredCards:{},checks:{[positionId]:{}},matching:{version:2,hits:[hit],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},
  groupMappings:{},renamedGroupCodes:[],drawingSample:null,name:'Generated history '+code};
 const payload={schema:6,projectId:'project:'+code,projectRevision:1,
  instances:{[positionId]:{checks:{},rowStages:{},progress:0,overrides:{},customItems:[]}},automationItems:[],readTestData};
 for(const key of metadataKeys)document.catalog.set(key,PDFHexString.fromText(JSON.stringify(payload)));
 const bytes=Buffer.from(await document.save());
 return {bytes,payload,code,positionId};
}

async function newContext(browser){
 const context=await browser.newContext({viewport:{width:1366,height:900}});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showOpenFilePicker=undefined;window.showSaveFilePicker=undefined;
  window.__historyScanCalls={matcher:0,work:0,workers:0,guides:0};
  window.Tesseract={async createWorker(){__historyScanCalls.workers++;throw Error('A locally saved project must not start OCR');}};
  for(const [name,method,count] of [['SmartMatchReadMatcher','scan','matcher'],['SmartMatchReadWork','read','work']]){
   let value;
   Object.defineProperty(window,name,{configurable:true,get:()=>value,set:next=>{
    value={...next,[method]:(...args)=>{__historyScanCalls[count]++;throw Error('A locally saved project must not rescan: '+name+'.'+method);}};
   }});
  }
  const show=HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')__historyScanCalls.guides++;return show.call(this)};
 });
 return context;
}

async function openPrepared(page,input,name){
 await page.locator('#pwFile').setInputFiles({name,mimeType:'application/pdf',buffer:input.bytes});
 await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
 assert.deepEqual(await page.evaluate(()=>__historyScanCalls),{matcher:0,work:0,workers:0,guides:0});
}

async function checkFirstWorkRow(page){
 await page.evaluate(()=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions()[0]));
 await page.waitForSelector('#pwProtocol[open]');
 const row=page.locator('#pwChecklist :is(.rtWorkRow,.pwCheckRow) input[type="checkbox"]').first();
 await row.check();
 await page.locator('#pwProtocolClose').click();
 await page.waitForFunction(()=>!document.getElementById('pwProtocol').open);
}

async function saveThroughUi(page,name){
 await page.locator('#smartPdfInspect').click();
 await page.waitForSelector('#smartExportDialog[open]');
 await page.locator('#smartExportFileName').fill(name);
 await page.locator('#smartWorkspaceSaveLocal').click();
 await page.waitForFunction(()=>/Sparat lokalt/.test(document.getElementById('smartExportStatus').textContent),null,{timeout:30000});
 await page.locator('#smartExportClose').click();
 await page.locator('#pwFinishProject').click();
 await page.waitForFunction(()=>!SmartMatchAppBridge.getPdf()&&!document.getElementById('pwEmpty').hidden,null,{timeout:30000});
}

async function browserPdfDigest(page){
 return page.evaluate(async()=>{
  const bytes=SmartMatchAppBridge.getOriginalPdfBytes(),hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return {size:bytes.length,sha256:[...hash].map(value=>value.toString(16).padStart(2,'0')).join('')};
 });
}

async function databaseSnapshot(page,name){
 return page.evaluate(async databaseName=>{
  const database=await new Promise((resolve,reject)=>{
   const request=indexedDB.open(databaseName);
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  const read=store=>new Promise((resolve,reject)=>{
   if(!database.objectStoreNames.contains(store)){resolve([]);return}
   const request=database.transaction(store,'readonly').objectStore(store).getAll();
   request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>reject(request.error);
  });
  try{
   const [files,drafts]=await Promise.all([read('files'),read('drafts')]),safeFiles=[];
   for(const record of files){
    const copy={...record};delete copy.blob;
    let blobSize=0,blobSha256='';
    if(record.blob){
     const bytes=await record.blob.arrayBuffer(),hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
     blobSize=bytes.byteLength;blobSha256=[...hash].map(value=>value.toString(16).padStart(2,'0')).join('');
    }
    safeFiles.push({...copy,blobSize,blobSha256});
   }
   safeFiles.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
   drafts.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
   return JSON.parse(JSON.stringify({files:safeFiles,drafts}));
  }finally{database.close()}
 },name);
}

async function seedCurrentProject(page,input){
 await page.evaluate(async({databaseName,bytes,payload})=>{
  const database=await new Promise((resolve,reject)=>{
   const request=indexedDB.open(databaseName,2);
   request.onupgradeneeded=()=>{
    if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files',{keyPath:'id'});
    if(!request.result.objectStoreNames.contains('drafts'))request.result.createObjectStore('drafts',{keyPath:'id'});
   };
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  const blob=new Blob([Uint8Array.from(bytes)],{type:'application/pdf'}),hash='generated-current-v925-hash',workspaceId='generated-current-v925-workspace',savedAt=Date.now()+10000;
  await new Promise((resolve,reject)=>{
   const transaction=database.transaction(['files','drafts'],'readwrite'),files=transaction.objectStore('files');
   const view={fileKey:hash,workspaceId,localArchive:true};
   files.put({id:'active',hash,name:'current-v925.pdf',blob});
   files.put({id:'project:'+workspaceId,hash,workspaceId,name:'current-v925.pdf',blob,view,savedAt});
   transaction.objectStore('drafts').put({id:workspaceId,baseRevision:1,payload,updatedAt:savedAt});
   transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);
  });
  database.close();
 },{databaseName:currentDb,bytes:[...input.bytes],payload:clone(input.payload)});
}

async function openLegacyFromHome(page,name,expected,input,sourceDb,sourceBefore,expectedProjectCount){
 await page.goto(url('9-25'));
 await page.waitForFunction(()=>document.getElementById('pwBuildVersion')?.textContent.includes('9.25'));
 await page.waitForFunction(expectedName=>[...document.querySelectorAll('.smRecentOpen strong')].some(node=>node.textContent===expectedName),name,{timeout:30000});
 assert.equal(await page.locator('#pwRecentProjects').isVisible(),true,'older local projects are visible on the first page');
 assert.equal(await page.locator('.smRecentOpen').count(),expectedProjectCount);
 assert.equal(await page.locator('#pwRecentCount').innerText(),expectedProjectCount+' lokala projekt');
 const oldRow=page.locator('.smRecentOpen').filter({has:page.locator('strong',{hasText:name})});
 assert.equal(await oldRow.count(),1,'the exact older project is listed once');
 assert.match(await oldRow.locator('small').innerText(),/Återfunnet från TEST 9\.(12|24)/);
 await oldRow.click();
 await page.waitForFunction(code=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&SmartMatchAppBridge.getPositions()[0].code===code&&document.getElementById('pwScanOverlay').hidden,input.code,{timeout:60000});
 const actual=await page.evaluate(()=>SmartMatchReadTest.payload());
 assert.deepEqual(actual,expected,'the exact locally saved draft, including its checked row, reopens');
 assert(Object.values(actual.checks).some(checks=>Object.values(checks).some(Boolean)),'fixture proves the draft differs from the embedded PDF state');
 assert.deepEqual(await browserPdfDigest(page),{size:input.bytes.length,sha256:sha256(input.bytes)},'the archived original PDF bytes reopen exactly');
 assert.deepEqual(await page.evaluate(()=>__historyScanCalls),{matcher:0,work:0,workers:0,guides:0},'opening from local history starts no OCR, matching, product reading or preparation guide');
 assert.deepEqual(await databaseSnapshot(page,sourceDb),sourceBefore,'the older source database stays byte-for-byte and JSON identical');
}

async function scenarioPreviousVersionWithCurrentTarget(browser){
 const context=await newContext(browser),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  const old=await fixture('GS924'),current=await fixture('GS925');
  await page.goto(url('9-24'));await openPrepared(page,old,'older-v924.pdf');await checkFirstWorkRow(page);
  const expected=await page.evaluate(()=>SmartMatchReadTest.payload());
  await saveThroughUi(page,'older-v924.pdf');
  const sourceDb='smartmatch-read-test-v9-24-local-pdf-resume',sourceBefore=await databaseSnapshot(page,sourceDb);
  await seedCurrentProject(page,current);
  await openLegacyFromHome(page,'older-v924.pdf',expected,old,sourceDb,sourceBefore,2);
  assert.deepEqual(errors,[]);
  console.log('PASS TEST 9.24 archive remains visible beside an existing TEST 9.25 active/current project, opens exact PDF/draft without scanning, and leaves its source DB unchanged');
 }finally{await context.close()}
}

async function scenarioSkippedVersion(browser){
 const context=await newContext(browser),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  const old=await fixture('GS912');
  await page.goto(url('9-12'));await openPrepared(page,old,'older-v912-direct.pdf');await checkFirstWorkRow(page);
  const expected=await page.evaluate(()=>SmartMatchReadTest.payload());
  await saveThroughUi(page,'older-v912-direct.pdf');
  const sourceDb='smartmatch-read-test-v9-12-local-pdf-resume',sourceBefore=await databaseSnapshot(page,sourceDb);
  // No intermediate TEST page is loaded in this context: TEST 9.25 must find the
  // original v9.12 namespace directly rather than depending on chained copies.
  await openLegacyFromHome(page,'older-v912-direct.pdf',expected,old,sourceDb,sourceBefore,1);
  assert.deepEqual(errors,[]);
  console.log('PASS direct TEST 9.12 -> TEST 9.25 jump shows and opens the local project without an intermediate migration or scan, leaving v9.12 unchanged');
 }finally{await context.close()}
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  await scenarioPreviousVersionWithCurrentTarget(browser);
  await scenarioSkippedVersion(browser);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
