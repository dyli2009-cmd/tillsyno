// TEST 9.85: Excel master products drive known project times; custom project times remain independent.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),clone=value=>JSON.parse(JSON.stringify(value));
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-85.html`;
const codeRect={x:.04,y:.04,w:.40,h:.06},tableRect={x:.02,y:.12,w:.45,h:.75};


const started=Date.now(),stage=text=>console.log('['+((Date.now()-started)/1000).toFixed(1)+'s] '+text);
const device=process.env.SMARTMATCH_TEST_DEVICE||'desktop';
assert(['desktop','iphone'].includes(device));
const storageKey='tillsyno.product-library.v1';
const browserPath=[process.env.SMARTMATCH_CHROMIUM_PATH,chromium.executablePath(),'/usr/bin/chromium','/tmp/chromium'].find(file=>file&&fs.existsSync(file));
function workItem(key,label,value,quantity=1){const text=label+' · '+value;return {key,text,legacyText:text,label,value,quantity,section:'Daglåsning',sectionKey:'daglasning',tableIndex:0,sourceRow:key==='sw'?1:2,sourceIdentity:'master-test:'+key,responsibility:'GS'};}
async function fixture(id='A',quantity=2){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),plan=doc.addPage([595,842]);plan.drawText('GS10',{x:70,y:680,size:18,font});
 const cardPage=doc.addPage([595,842]);cardPage.drawText('Beslagskod: GS10',{x:25,y:780,size:14,font});cardPage.drawText('Dorrautomatik SW300 GS',{x:25,y:740,size:11,font});
 const sw=workItem('sw','Dörrautomatik','SW300',quantity),lock=workItem('lock','Elås','835c-50');
 const card={id:'card-main',page:2,code:'GS10',originalCardCode:'GS10',header:'Beslagskod: GS10',codeRect,tableRect,bounds:{x:.01,y:.03,w:.96,h:.9},rawTable:'Dörrautomatik SW300 GS\nElås 835c-50 GS',work:[sw.text,lock.text],workItems:[sw,lock],workState:'ready',workPolicy:'gs-install-v3',choices:['GS10'],method:'PDF-text',confidence:100};
 const hit={page:1,code:'GS10',rect:[65,675,125,702],box:{x:65/595,y:140/842,w:60/595,h:27/842},positionId:'door-main',selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:1};
 const readTestData={schema:1,phase:'full',sourceId:'master-library:'+id,rects:{code:codeRect,table:tableRect},pages:[2],cards:{'card-main':card},checks:{'door-main':{sw:true,lock:false}},groupMappings:{},renamedGroupCodes:[],matching:{version:2,hits:[hit],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Master library '+id};
 const payload={schema:6,projectId:'master-library-'+id,projectRevision:1,automationItems:[],readTestData,timeConfig:{minutes:{automation:1},articleTimeCatalog:{schema:1,unit:'minutes',entries:[{article:'SW300',category:'Old category',minutes:999}]},productMinutes:{sw300:999,'835c-50':88,'projectonly z':25},productCategories:{sw300:'Old category'}},instances:{'door-main':{checks:{sw:true,lock:false},rowStages:{sw:'done'},progress:50,overrides:{sw:{quantity,minutes:777},lock:{minutes:88}},customItems:[{id:'own',label:'Egen del',value:'ProjectOnly Z',quantity:2,minutes:25,kind:'work'},{id:'extra',label:'Extra arbete',value:'SW300',quantity:1,minutes:30,kind:'extra-time'}]}}};
 const metadata=PDFHexString.fromText(JSON.stringify(payload));for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])doc.catalog.set(PDFName.of(key),metadata);return Buffer.from(await doc.save());
}
const profile=device==='iphone'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:1440,height:1000}};
async function setupContext(browser,options={}){
 const context=await browser.newContext({...profile,...options});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>{window.TillsynoAuth={client:{rpc:async()=>({data:{ok:true}})}};window.TillsynoCurrentAccess={userId:'test-user'};document.documentElement.removeAttribute('data-auth-pending');window.dispatchEvent(new CustomEvent('tillsyno-authorized',{detail:window.TillsynoCurrentAccess}));});"}));
 if(device==='iphone')await context.addInitScript(()=>{Object.defineProperty(navigator,'platform',{value:'iPhone'});Object.defineProperty(navigator,'maxTouchPoints',{value:5});});
 return context;
}
async function visit(page){await page.goto(url());await page.getByLabel('Kod till Avläsning').fill('1234');await page.locator('#smReadCodeGate button').click();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-read-locked'));}
async function openPrepared(page,bytes){
 await visit(page);await page.locator('#pwFile').setInputFiles({name:'master-library.pdf',mimeType:'application/pdf',buffer:bytes});await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf?.()&&SmartMatchAppBridge.getPositions().length===4&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
 await page.evaluate(()=>{window.__draftPayloads=[];SmartMatchSession.queueDraft=entry=>{window.__draftPayloads.push(structuredClone(entry.payload));return entry.payload;};});
}
const panel=page=>page.locator('#pwProjectMaterials');
async function materialView(page,view){const root=panel(page);if(!await root.isVisible())await page.locator('#pwProjectMaterialButton').click();const tab=root.locator('.smMaterialViewButton').filter({hasText:view==='library'?'Produktlista':'Projektmaterial'});if(await tab.getAttribute('aria-pressed')!=='true')await tab.click();await root.getByRole('searchbox',{name:'Sök material'}).fill('');return root;}
async function findRow(page,view,name,key){const root=await materialView(page,view);await root.getByRole('searchbox',{name:'Sök material'}).fill(name);const row=root.locator('[data-product-key="'+key+'"]');await row.waitFor({state:'visible'});return row;}
async function catalog(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);}
function assertSeeds(data,{sw=180,renamed=false,extra=0}={}){
 assert.equal(data.catalog.entries.length,66+extra);
 for(const [name,minutes]of EXPECTED_EXCEL){const found=data.catalog.entries.filter(entry=>entry.article.toLocaleLowerCase('sv')===name.toLocaleLowerCase('sv')||(entry.aliases||[]).some(alias=>alias.toLocaleLowerCase('sv')===name.toLocaleLowerCase('sv')));assert.equal(found.length,1,'One master record for '+name);assert.equal(found[0].minutes,name==='SW300'?sw:minutes,'Excel unit time for '+name);}
 if(renamed){assert(data.catalog.entries.some(entry=>entry.article==='SW300 Reserv'&&entry.aliases.includes('SW300')));assert(!data.catalog.entries.some(entry=>entry.article==='SW300'));}
}
async function report(page){return page.evaluate(async()=>{const value=await SmartMatchAppBridge.getTimeReport();return {total:value.total,done:value.done,unknown:value.unknown,sw:value.rows.flatMap(row=>row.products).filter(product=>!product.extra&&/^SW300/.test(product.productName)).reduce((sum,product)=>sum+product.totalMinutes,0),extra:value.rows.flatMap(row=>row.products).filter(product=>product.extra).reduce((sum,product)=>sum+product.totalMinutes,0)};});}
async function assertReport(page,total,done,unknown,sw){await page.waitForFunction(async expected=>{if(!window.SmartMatchAppBridge?.getPdf?.())return false;const value=await SmartMatchAppBridge.getTimeReport();return value.total===expected;},total);const value=await report(page);assert.deepEqual(value,{total,done,unknown,sw,extra:30});}
async function saveMinutes(page,name,key,minutes){const row=await findRow(page,'library',name,key);await row.locator('[data-duration-part="hours"]').fill(minutes===null?'':String(Math.floor(minutes/60)));await row.locator('[data-duration-part="minutes"]').fill(minutes===null?'':String(minutes%60));await row.getByRole('button',{name:'Spara rad',exact:true}).click();await page.waitForFunction(({key,name,minutes})=>JSON.parse(localStorage.getItem(key)).catalog.entries.some(entry=>entry.article===name&&entry.minutes===minutes),{key:storageKey,name,minutes});}
async function lastDraft(page){return page.evaluate(()=>window.__draftPayloads.at(-1));}
async function exportPdf(page){if(await panel(page).isVisible())await panel(page).getByRole('button',{name:'Stäng materiallistan',exact:true}).click();await page.evaluate(()=>{window.showSaveFilePicker=undefined;Object.defineProperty(navigator,'share',{configurable:true,value:undefined});});await page.locator('#smartPdfInspect').click();assert.equal(await page.locator('#smartExportBuild').innerText(),'Förbered PDF');await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled&&document.getElementById('smartExportBuild').textContent==='Spara PDF',null,{timeout:120000});const waiting=page.waitForEvent('download');await page.locator('#smartExportBuild').click();return fs.readFileSync(await(await waiting).path());}

async function reopenDownloaded(page,bytes){
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 await page.waitForFunction(()=>!SmartMatchAppBridge.isOpeningProject());
 await page.locator('#pwFile').setInputFiles({name:'saved-material-times.pdf',mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(size=>!SmartMatchAppBridge.isOpeningProject()&&SmartMatchAppBridge.getOriginalPdfBytes()?.byteLength===size&&document.getElementById('pwScanOverlay').hidden,bytes.length,{timeout:60000});
}

async function positionFixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 const p1=doc.addPage([595,842]),p2=doc.addPage([595,842]);p1.drawText('GS2    GS2',{x:70,y:680,size:18,font});p2.drawText('GS2    GS3',{x:70,y:680,size:18,font});
 const item=(key,label,value,quantity=1)=>({...workItem(key,label,value,quantity),sourceIdentity:'position-test:'+key,sourceRow:key==='plate-b'?3:2,installer:'GS'});
 const closer=item('closer','Dörrstängare','DC700'),plateA=item('plate-a','Låshus','212-50',1),plateB=item('plate-b','Låshus','212-50',2);
 const typo=item('typo','Dörrstängare','DC700X',2),ac=item('ac','Dörrstängare','DC700 AC'),unplaced=item('unplaced','Dörrautomatik','SW300',7);
 const dt={...item('dt-only','Beslag','DT-only hinge',8),installer:'DT',responsibility:'DT'};
 const delivery={...item('delivery-only','Leverans','Delivery-only part',12),installer:'',responsibility:'',delivery:'GS'};
 const cards={};
 for(const [code,page,work,products] of [['GS2',3,[closer,plateA,plateB,dt],[closer,plateA,plateB,dt]],['GS3',4,[typo,ac,delivery],[typo,ac,delivery]],['GS9',5,[unplaced],[unplaced]]]){
  const pg=doc.addPage([595,842]);pg.drawText('Beslagskod: '+code,{x:25,y:780,size:14,font});pg.drawText('Prepared reviewed GS fixture',{x:25,y:740,size:11,font});
  const id='card-'+code;cards[id]={id,page,code,originalCardCode:code,header:'Beslagskod: '+code,codeRect,tableRect,bounds:{x:.01,y:.03,w:.96,h:.9},rawTable:products.map(p=>p.label+' '+p.value+' '+p.installer).join('\n'),products:clone(products),work:work.map(p=>p.text),workItems:clone(work),workState:'ready',workPolicy:code==='GS3'?'all':'gs-install-v3',choices:[code],method:'PDF-text',confidence:100};
 }
 const specs=[['gs2-a','GS2',1,70],['gs2-b','GS2',1,250],['gs2-c','GS2',2,70],['gs3-a','GS3',2,250]];
 const hits=specs.map(([positionId,code,page,x],order)=>({page,code,positionId,rect:[x,675,x+60,702],box:{x:x/595,y:140/842,w:60/595,h:27/842},selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:order+1}));
 const checks={'gs2-a':{closer:true,'plate-a':true,'plate-b':false},'gs2-b':{closer:false,'plate-a':false,'plate-b':false},'gs2-c':{closer:false,'plate-a':false,'plate-b':false},'gs3-a':{typo:false,ac:false}};
 const readTestData={schema:1,phase:'full',sourceId:'position-materials-84',rects:{code:codeRect,table:tableRect},pages:[3,4,5],cards,checks:clone(checks),groupMappings:{},renamedGroupCodes:[],matching:{version:2,hits,pages:[{page:1,count:2,imageSkipped:true},{page:2,count:2,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Per-position GS material fixture'};
 const payload={schema:6,projectId:'position-materials-84',projectRevision:1,automationItems:[],readTestData,timeConfig:{},instances:Object.fromEntries(specs.map(([id])=>[id,{checks:checks[id],overrides:{},customItems:[],rowStages:{}}]))};
 const metadata=PDFHexString.fromText(JSON.stringify(payload));for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])doc.catalog.set(PDFName.of(key),metadata);
 return Buffer.from(await doc.save());
}
async function materialSnapshot(page){
 const root=await materialView(page,'project');return root.locator('.pwProjectMaterialRow').evaluateAll(rows=>rows.map(row=>({key:row.dataset.productKey,name:row.querySelector('.smProductControl input').value,category:row.querySelector('select').value,extra:Number(row.querySelector('input[type=number]').value),quantity:Number(row.querySelector('.pwMaterialCount small').textContent.match(/\d+/)[0]),hours:row.querySelector('[data-duration-part=hours]').value,minutes:row.querySelector('[data-duration-part=minutes]').value})).sort((a,b)=>a.key.localeCompare(b.key)));
}
async function assertTotals(page,total,unknown){
 await page.waitForFunction(async ({total,unknown})=>{const r=await SmartMatchAppBridge.getTimeReport();return r.total===total&&r.unknown===unknown;},{total,unknown});
 const actual=await page.evaluate(async()=>{const r=await SmartMatchAppBridge.getTimeReport();return {total:r.total,unknown:r.unknown,done:r.done};});assert.deepEqual(actual,{total,unknown,done:36});
}
async function checksSnapshot(page){return page.evaluate(()=>SmartMatchAppBridge.getPositions().map(o=>({id:o.id,code:o.code,page:o.page,checks:structuredClone(o.checks)})).sort((a,b)=>a.id.localeCompare(b.id)));}
(async()=>{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});let browser;
 try{
  browser=await chromium.launch({...(browserPath?{executablePath:browserPath}:{}),args:['--no-sandbox']});const context=await setupContext(browser),a=await context.newPage(),errors=[];a.on('pageerror',e=>errors.push(e.message));a.setDefaultTimeout(20000);
  await openPrepared(a,await positionFixture());const initialChecks=await checksSnapshot(a);
  stage('Three GS2 positions count three copies; distinct source rows retain quantities');
  let rows=await materialSnapshot(a);assert.deepEqual(rows.map(({key,quantity})=>[key,quantity]),[['212-50',9],['dc700',3],['dc700 ac',1],['dc700x',2]]);
  assert(!rows.some(r=>/SW300|DT-only|Delivery-only/i.test(r.name)),'Unplaced scanned card and DT-only product are excluded');
  assert.equal(rows.find(r=>r.key==='dc700x').hours,'');assert.equal(rows.find(r=>r.key==='dc700x').minutes,'','OCR typo has no fuzzy-assigned catalog time');
  for(const key of ['dc700','dc700 ac'])assert.equal(rows.find(r=>r.key===key).minutes,'30');
  await assertTotals(a,174,2);
  const reportProducts=await a.evaluate(async()=> (await SmartMatchAppBridge.getTimeReport()).rows.flatMap(r=>r.products).map(p=>p.productName));assert(!reportProducts.some(name=>/DT-only|Delivery-only/i.test(name)),'Read-only report includes only GS work, not DT or delivery responsibility');
  stage('Manual OCR correction merges quantities and gains the exact catalog time');
  let row=await findRow(a,'project','DC700X','dc700x');assert(await row.locator('.smProductControl input').isEditable());await row.locator('.smProductControl input').fill('DC-700');await row.getByRole('button',{name:'Spara rad',exact:true}).click();
  await assertTotals(a,234,0);rows=await materialSnapshot(a);assert.deepEqual(rows.map(({key,quantity})=>[key,quantity]),[['212-50',9],['dc700',5],['dc700 ac',1]]);
  stage('Known project product is editable and merges into another known article without losing extras');
  row=await findRow(a,'project','Dc700 ac','dc700 ac');await row.locator('input[type=number]').fill('1');await row.getByRole('button',{name:'Spara rad',exact:true}).click();await assertTotals(a,264,0);
  row=await findRow(a,'project','Dc700','dc700');assert(await row.locator('.smProductControl input').isEditable());assert(!await row.locator('select').isDisabled());
  // Use a real existing category, allowing verification of project-local category edits.
  await row.locator('select').selectOption('Låshus');await row.locator('input[type=number]').fill('2');await row.locator('.smProductControl input').fill('Dc700 ac');await row.getByRole('button',{name:'Spara rad',exact:true}).click();
  await assertTotals(a,324,0);rows=await materialSnapshot(a);assert.deepEqual(rows.map(({key,quantity})=>[key,quantity]),[['212-50',9],['dc700 ac',9]]);assert.equal(rows.find(r=>r.key==='dc700 ac').extra,3);assert.equal(rows.find(r=>r.key==='dc700 ac').category,'Låshus');assert.deepEqual(await checksSnapshot(a),initialChecks);
  const names=rows.map(r=>r.name);const root=await materialView(a,'project');await root.locator('.pwMaterialGroup:not([hidden])').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
  assert(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+2));
  for(const [theme,suffix] of [['mist','light'],['night','dark']]){
   await a.evaluate(theme=>document.documentElement.setAttribute('data-tillsyno-theme',theme),theme);
   const geometry=await root.locator('.pwProjectMaterialRow:not([hidden])').evaluateAll(nodes=>nodes.map(row=>{const r=row.getBoundingClientRect();return {background:getComputedStyle(row).backgroundColor,stripe:row.dataset.stripe,buttons:[...row.querySelectorAll('button:not([disabled])')].filter(b=>b.getBoundingClientRect().width>0).map(button=>{const b=button.getBoundingClientRect();return {inside:b.left>=r.left-1&&b.right<=r.right+1,height:b.height};})};}));
   assert.equal(geometry.length,2);assert.notEqual(geometry[0].background,geometry[1].background,'Alternating visible rows differ in '+theme);assert.deepEqual(geometry.map(r=>r.stripe),['even','odd']);
   for(const row of geometry)for(const button of row.buttons)assert(button.inside&&button.height>=30,JSON.stringify(button));
   await root.screenshot({path:'/workspace/work/position-materials-'+device+'-'+suffix+'-84.png'});
  }
  await a.evaluate(()=>document.documentElement.setAttribute('data-tillsyno-theme','mist'));
  stage('Time view is a read-only projection of project material');
  await root.getByRole('button',{name:'Stäng materiallistan',exact:true}).click();await a.locator('#pwTimeReport').click();const time=a.locator('#pwTimeDialog');await time.locator('.smReadOnlyTimeGroup').first().waitFor();
  assert.equal(await time.locator('#pwTimeRows input,#pwTimeRows select,#pwTimeRows textarea,#pwTimeRows button').count(),0);
  const timeRows=await time.locator('.smReadOnlyTimeGroup tbody tr').evaluateAll(rows=>rows.map(tr=>[...tr.cells].map(td=>td.textContent)));assert.deepEqual(timeRows.map(r=>r[0]).sort(),names.sort());assert.equal(timeRows.find(r=>/700/i.test(r[0]))[1],'9');
  await a.evaluate(()=>document.getElementById('pwTimeDialog').close());
  stage('Exported project material survives conflicting destination defaults');
  const bytes=await exportPdf(a),doc=await PDFDocument.load(bytes),saved=JSON.parse(doc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());
  assert.equal(doc.getPageCount(),5);assert.equal(Object.keys(saved.instances).length,4);assert.equal(saved.timeConfig.projectMaterials.reduce((n,p)=>n+p.quantity,0),3);
  const clean=await setupContext(browser);await clean.addInitScript(key=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({schema:1,catalog:{schema:1,unit:'minutes',entries:[{article:'Enhetens DC700',aliases:['Dc700 ac'],sourceCell:'B80',category:'Fel grupp',minutes:999}]},categories:['Fel grupp']}));},storageKey);const b=await clean.newPage();b.on('pageerror',e=>errors.push(e.message));
  await openPrepared(b,bytes);await assertTotals(b,324,0);assert.deepEqual(await materialSnapshot(b),rows);assert.deepEqual(await checksSnapshot(b),initialChecks);
  stage('Merging extras above 999 is rejected before committed state changes');
  await a.evaluate(()=>document.getElementById('smartExportDialog').close());
  row=await findRow(a,'project','212-50','212-50');await row.locator('input[type=number]').fill('999');await row.getByRole('button',{name:'Spara rad',exact:true}).click();await assertTotals(a,6318,0);
  const committedBefore=await a.evaluate(()=>SmartMatchAppBridge.save().timeConfig);
  row=await findRow(a,'project','Dc700 ac','dc700 ac');await row.locator('input[type=number]').fill('1');await row.locator('.smProductControl input').fill('21250');await row.getByRole('button',{name:'Spara rad',exact:true}).click();
  await panel(a).locator('[role=status]').filter({hasText:/999/}).first().waitFor({state:'visible'});
  await assertTotals(a,6318,0);assert.deepEqual(await a.evaluate(()=>SmartMatchAppBridge.save().timeConfig),committedBefore);assert.deepEqual(await checksSnapshot(a),initialChecks);
  assert.deepEqual(errors,[]);await clean.close();await context.close();console.log('PASS '+device+': per-position GS totals across drawings; repeated GS source quantities; unplaced/DT exclusion; exact catalog time; explicit OCR/name merges including existing extras; editable project category; read-only Time; preserved checks/positions and real PDF roundtrip with conflicting device defaults.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
