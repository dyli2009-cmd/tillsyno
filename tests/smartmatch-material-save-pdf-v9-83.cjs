// TEST 9.83: Excel master products drive known project times; custom project times remain independent.
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-83.html`;
const codeRect={x:.04,y:.04,w:.40,h:.06},tableRect={x:.02,y:.12,w:.45,h:.75};


// Independent expected values transcribed from the supplied Excel, using the established whole-minute conversion Math.round(hours*60).
const EXPECTED_EXCEL=[["212-50",6.0],["222-50",6.0],["232-50 mikro",90.0],["310-50",6.0],["310-50 mikro",90.0],["311-50 mikro",90.0],["410-50",90.0],["410-50 mikro",90.0],["411-50",6.0],["622-50",12.0],["610-50",6.0],["610-50 mikro",90.0],["622-50 mikro",90.0],["636-50 mikro",90.0],["710-50 Mikro",90.0],["722-50",6.0],["732-50",6.0],["256",12.0],["Cyl ring",12.0],["2356",12.0],["2456",12.0],["4265",12.0],["18256",12.0],["5265",12.0],["9565T-2 inkl draghandtag",30.0],["3212",12.0],["Step40",20.0],["Step90",20.0],["Step92",20.0],["EL580",90.0],["SL630",90.0],["SL620",90.0],["SL621",90.0],["835c-50",null],["6696",12.0],["draghandtag",60.0],["793",30.0],["794",30.0],["8061",30.0],["EA281",20.0],["7801",6.0],["7803",6.0],["7811",6.0],["7813",6.0],["Nyckel",6.0],["blindcyl",12.0],["SW300",180.0],["AK",20.0],["Flatscan",90.0],["Batteri",60.0],["programväljare",30.0],["Dc300",30.0],["uppst dc300",30.0],["Dc640",60.0],["Dc700",30.0],["Dc700 ac",30.0],["A152",30.0],["A151",30.0],["G460",120.0],["G461",120.0],["G464",120.0],["Dörrtillslutare",60.0],["Förb nattlås",60.0],["Magnetkontakt",30.0],["Jc35",120.0],["Porthållare 270",120.0]];
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
 await visit(page);await page.locator('#pwFile').setInputFiles({name:'master-library.pdf',mimeType:'application/pdf',buffer:bytes});await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf?.()&&SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
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

(async()=>{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});let browser;
 try{
  browser=await chromium.launch({...(browserPath?{executablePath:browserPath}:{}),args:['--no-sandbox']});
  const errors=[],context=await setupContext(browser),a=await context.newPage();a.on('pageerror',e=>errors.push(e.message));
  await openPrepared(a,await fixture('save-all'));
  stage('Save all includes changes from both material views');
  let known=await findRow(a,'project','SW300','sw300');await known.getByRole('button',{name:'Ändra SW300 i produktlistan',exact:true}).click();
  let master=panel(a).locator('[data-product-key="library:sw300"]');await master.waitFor({state:'visible'});await master.locator('[data-duration-part="hours"]').fill('2');
  let own=await findRow(a,'project','ProjectOnly Z','projectonly z');await own.locator('[data-duration-part="minutes"]').fill('20');
  known=await findRow(a,'project','SW300','sw300');await known.getByLabel('Extra antal SW300',{exact:true}).fill('3');
  await panel(a).getByRole('button',{name:'Spara alla',exact:true}).click();
  await a.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).catalog.entries.find(e=>e.article==='SW300').minutes===120,storageKey);
  await assertReport(a,670,240,1,600);
  let bytes=await exportPdf(a),doc=await PDFDocument.load(bytes),saved=JSON.parse(doc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());
  assert.equal(saved.timeConfig.productLibrary.entries.find(e=>e.article==='SW300').minutes,120);
  assert.equal(saved.timeConfig.productMinutes['projectonly z'],20);assert.equal(saved.timeConfig.projectMaterials.find(e=>e.name==='SW300').quantity,3);
  stage('Reopen the actual downloaded PDF on the same device and a clean device');
  await reopenDownloaded(a,bytes);await assertReport(a,670,240,1,600);
  const clean=await setupContext(browser),b=await clean.newPage();await openPrepared(b,bytes);await assertReport(b,670,240,1,600);await clean.close();
  stage('Save all from library includes pending project edits');
  own=await findRow(a,'project','ProjectOnly Z','projectonly z');await own.locator('[data-duration-part="minutes"]').fill('21');
  master=await findRow(a,'library','SW300','library:sw300');await master.locator('[data-duration-part="hours"]').fill('3');
  await panel(a).getByRole('button',{name:'Spara alla',exact:true}).click();await assertReport(a,972,360,1,900);
  stage('Invalid hidden draft cannot produce an older PDF');
  master=await findRow(a,'library','SW300','library:sw300');await master.locator('[data-duration-part="hours"]').fill('-1');
  await materialView(a,'project');await panel(a).getByRole('button',{name:'Spara alla',exact:true}).click();
  assert.equal((await catalog(a)).catalog.entries.find(e=>e.article==='SW300').minutes,180);
  await panel(a).getByRole('button',{name:'Stäng materiallistan',exact:true}).click();await a.locator('#smartPdfInspect').click();await a.locator('#smartExportBuild').click();
  await a.waitForFunction(()=>document.getElementById('smartExportStatus').textContent.includes('Kontrollera'));
  assert.equal(await a.locator('#smartExportBuild').innerText(),'Förbered PDF');await a.evaluate(()=>document.getElementById('smartExportDialog').close());
  stage('Preparing PDF commits typed times before the portable snapshot');
  master=await findRow(a,'library','SW300','library:sw300');await master.locator('[data-duration-part="hours"]').fill('2');await master.locator('[data-duration-part="minutes"]').fill('30');
  own=await findRow(a,'project','ProjectOnly Z','projectonly z');await own.locator('[data-duration-part="minutes"]').fill('22');
  bytes=await exportPdf(a);doc=await PDFDocument.load(bytes);saved=JSON.parse(doc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());
  assert.equal(saved.timeConfig.productLibrary.entries.find(e=>e.article==='SW300').minutes,150);assert.equal(saved.timeConfig.productMinutes['projectonly z'],22);
  await reopenDownloaded(a,bytes);await assertReport(a,824,300,1,750);
  stage('Clearing an own project time remains unknown after PDF roundtrip');
  own=await findRow(a,'project','ProjectOnly Z','projectonly z');await own.locator('[data-duration-part="hours"]').fill('');await own.locator('[data-duration-part="minutes"]').fill('');await panel(a).getByRole('button',{name:'Spara alla',exact:true}).click();
  await assertReport(a,780,300,3,750);bytes=await exportPdf(a);await reopenDownloaded(a,bytes);await assertReport(a,780,300,3,750);
  stage('Saved materials survive a populated conflicting destination catalog');
  const snapshot=async page=>{await page.evaluate(()=>document.getElementById('smartExportDialog')?.close());await materialView(page,'project');return page.locator('#pwProjectMaterials .pwProjectMaterialRow').evaluateAll(rows=>rows.map(row=>({name:row.querySelector('.smProductControl input').value,category:row.querySelector('select').value,extra:row.querySelector('[type=number]').value,hours:row.querySelector('[data-duration-part=hours]').value,minutes:row.querySelector('[data-duration-part=minutes]').value,total:row.querySelector('.pwMaterialCount small').textContent})));};
  const expectedMaterials=await snapshot(a),sourceDoc=await PDFDocument.load(bytes),sourceSaved=JSON.parse(sourceDoc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());
  const stale=await setupContext(browser);await stale.addInitScript(key=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({schema:1,catalog:{schema:1,unit:'minutes',entries:[{article:'Enhetens motor',aliases:['SW300'],minutes:240,category:'Annan kategori',sourceCell:'B70'},{article:'ProjectOnly Z',minutes:999,category:'Fel grupp'}]},categories:['Annan kategori','Fel grupp']}));},storageKey);
  const other=await stale.newPage();await visit(other);await other.evaluate(()=>document.getElementById('pwProjectMaterialButton').click());await materialView(other,'library');await panel(other).getByRole('button',{name:'Stäng materiallistan',exact:true}).click();
  const originalDeviceCatalog=await other.evaluate(key=>localStorage.getItem(key),storageKey);
  await openPrepared(other,bytes);await assertReport(other,780,300,3,750);assert.deepEqual(await snapshot(other),expectedMaterials);
  assert.equal(await other.evaluate(key=>localStorage.getItem(key),storageKey),originalDeviceCatalog,'Opening the file must not overwrite the receiving device defaults');
  const secondBytes=await exportPdf(other),secondDoc=await PDFDocument.load(secondBytes),secondSaved=JSON.parse(secondDoc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());
  assert.deepEqual(secondSaved.timeConfig,sourceSaved.timeConfig,'Re-export keeps all project material settings unchanged');
  assert.equal(await other.evaluate(key=>localStorage.getItem(key),storageKey),originalDeviceCatalog);
  await other.evaluate(key=>{const data=JSON.parse(localStorage.getItem(key));data.catalog.entries.find(e=>e.sourceCell==='B70').minutes=300;localStorage.setItem(key,JSON.stringify(data));window.dispatchEvent(new StorageEvent('storage',{key}));},storageKey);
  await assertReport(other,780,300,3,750);assert.deepEqual(await snapshot(other),expectedMaterials);
  await stale.close();
  assert.deepEqual(errors,[]);await context.close();console.log('PASS '+device+': cross-view Save all, exact PDF payload, same/clean browser reopen, invalid hidden draft blocks stale export, direct PDF captures pending times, explicit blank time survives reopen.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
