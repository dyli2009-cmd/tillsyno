// TEST 9.80: Excel master products drive known project times; custom project times remain independent.
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-80.html`;
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

(async()=>{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});let browser;
 try{
  browser=await chromium.launch({...(browserPath?{executablePath:browserPath}:{}),args:['--no-sandbox']});
  const errors=[],watch=page=>{page.setDefaultTimeout(20000);page.on('pageerror',error=>{errors.push(error.message);console.log('PAGE ERROR:',error.message);});};
  // An old partial local master is upgraded without replacing intentional user times/products.
  stage('Legacy partial catalog migration');const legacy=await setupContext(browser);await legacy.addInitScript(({key,seed})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));},{key:storageKey,seed:{schema:1,catalog:{schema:1,unit:'minutes',entries:[{article:'SW300',category:'Dörrstängning',sourceCell:'B70',minutes:150},{article:'Old local item',category:'Egna',minutes:37}]},categories:['Dörrstängning','Egna']}});
  const migrated=await legacy.newPage();watch(migrated);await openPrepared(migrated,await fixture('legacy'));await materialView(migrated,'library');assertSeeds(await catalog(migrated),{sw:150,extra:1});assert.equal((await catalog(migrated)).catalog.entries.find(entry=>entry.article==='Old local item').minutes,37);await assertReport(migrated,380,300,1,300);await legacy.close();
  stage('Fresh catalog before PDF');const context=await setupContext(browser),a=await context.newPage();watch(a);
  // Exercise existing material handler before a PDF exists; catalog itself is app data.
  await visit(a);await a.evaluate(()=>document.getElementById('pwProjectMaterialButton').click());await panel(a).waitFor({state:'visible'});await materialView(a,'library');assertSeeds(await catalog(a));await panel(a).getByRole('button',{name:'Stäng materiallistan',exact:true}).click();
  await openPrepared(a,await fixture('A'));await assertReport(a,440,360,1,360);const initialChecks=await a.evaluate(()=>structuredClone(SmartMatchAppBridge.getPositions()[0].checks));
  let known=await findRow(a,'project','SW300','sw300');assert.equal(await known.locator('.smProductControl input').isEditable(),false);for(const part of ['hours','minutes'])assert.equal(await known.locator('[data-duration-part="'+part+'"]').isEditable(),false);assert.equal(await known.locator('select').isDisabled(),true);assert.equal(await known.locator('[aria-label="Extra antal SW300"]').isEditable(),true);
  await known.getByRole('button',{name:'Ändra SW300 i produktlistan',exact:true}).click();let master=panel(a).locator('[data-product-key="library:sw300"]');await master.waitFor({state:'visible'});assert.equal(await master.locator('[data-duration-part="hours"]').isEditable(),true);
  stage('Return from linked product edit without clearing search manually');
  await panel(a).getByRole('button',{name:'Projektmaterial',exact:true}).click();
  assert.equal(await panel(a).getByRole('searchbox',{name:'Sök material'}).inputValue(),'','Library lookup must not filter project materials');
  assert.equal(await panel(a).locator('.pwProjectMaterialRow[hidden]').count(),0,'Every project product remains available');
  assert.equal(await panel(a).locator('.pwProjectMaterialRow').count(),3);
  await assertReport(a,440,360,1,360);
  for(let attempt=0;attempt<2;attempt++){
   const linked=await findRow(a,'project','SW300','sw300');
   await linked.getByRole('button',{name:'Ändra SW300 i produktlistan',exact:true}).click();
   const product=panel(a).locator('[data-product-key="library:sw300"]');
   await product.waitFor({state:'visible'});
   await product.getByRole('button',{name:'Spara rad',exact:true}).click();
   await panel(a).getByRole('button',{name:'Projektmaterial',exact:true}).click();
   await panel(a).locator('.smMaterialViewButton[aria-pressed="true"]').filter({hasText:'Projektmaterial'}).waitFor();
   assert.equal(await panel(a).getByRole('searchbox',{name:'Sök material'}).inputValue(),'');
   assert.equal(await panel(a).locator('.pwProjectMaterialRow[hidden]').count(),0);
   await assertReport(a,440,360,1,360);
  }
  assert.deepEqual(await a.evaluate(()=>SmartMatchAppBridge.getPositions()[0].checks),initialChecks);
  stage('Known rows, library edit link and cross-tab master edits');const b=await context.newPage();watch(b);await openPrepared(b,await fixture('B',1));await materialView(b,'project');await assertReport(b,260,180,1,180);
  await saveMinutes(a,'SW300','library:sw300',120);await assertReport(a,320,240,1,240);await assertReport(b,200,120,1,120);await b.waitForFunction(()=>document.querySelector('#pwProjectMaterials .smCategoryReportTotals strong')?.textContent==='3 tim 20 min');
  stage('Master null, zero and rename');
  // Master null and zero are distinct, and stale PDF/row overrides never revive either.
  await saveMinutes(a,'SW300','library:sw300',null);await assertReport(a,80,0,3,0);await assertReport(b,80,0,2,0);await saveMinutes(a,'SW300','library:sw300',0);await assertReport(a,80,0,1,0);await assertReport(b,80,0,1,0);await saveMinutes(a,'SW300','library:sw300',120);
  known=await findRow(a,'project','SW300','sw300');await known.locator('[aria-label="Extra antal SW300"]').fill('9');await known.getByRole('button',{name:'Ändra SW300 i produktlistan',exact:true}).click();
  master=await findRow(a,'library','SW300','library:sw300');await master.locator('.smProductControl input').fill('SW300 Reserv');await master.getByRole('button',{name:'Spara rad',exact:true}).click();await a.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).catalog.entries.some(entry=>entry.article==='SW300 Reserv'),storageKey);assertSeeds(await catalog(a),{sw:120,renamed:true});await assertReport(a,320,240,1,240);await assertReport(b,200,120,1,120);assert.deepEqual(await a.evaluate(()=>SmartMatchAppBridge.getPositions()[0].checks),initialChecks);
  known=await findRow(a,'project','SW300 Reserv','sw300 reserv');assert.match(await known.locator('.pwMaterialCount').innerText(),/2 st totalt/);assert.equal(await known.locator('[data-duration-part="hours"]').inputValue(),'2');assert.equal(await known.locator('[aria-label="Extra antal SW300 Reserv"]').inputValue(),'9');await assertReport(a,320,240,1,240);await known.locator('[aria-label="Extra antal SW300 Reserv"]').fill('0');
  stage('Project quantity, custom time and category edits');
  // Adding a catalog quantity does not freeze a copied unit time in project overrides.
  const dc=await findRow(a,'library','Dc300','library:dc300');await dc.getByRole('button',{name:'Lägg till Dc300 i projektet',exact:true}).click();await assertReport(a,350,240,1,240);let draft=await lastDraft(a);assert(!Object.hasOwn(draft.timeConfig.productMinutes||{},'dc300'));assert(draft.timeConfig.projectMaterials.some(entry=>entry.name==='Dc300'&&entry.quantity===1));
  // Unknown project products keep their own editable minutes; extra-time keeps its own 30 min.
  const own=await findRow(a,'project','ProjectOnly Z','projectonly z');assert.equal(await own.locator('[data-duration-part="minutes"]').isEditable(),true);await own.locator('[data-duration-part="hours"]').fill('0');await own.locator('[data-duration-part="minutes"]').fill('20');await own.getByRole('button',{name:'Spara rad',exact:true}).click();await assertReport(a,340,240,1,240);await assertReport(b,200,120,1,120);
  // Renaming a category moves catalog products and their live project rows without dropping any.
  let root=await materialView(a,'library');await root.locator('.smMaterialCategories>summary').click();const categoryName=root.getByRole('textbox',{name:'Kategorinamn Dörrstängning',exact:true});await categoryName.fill('Automatik team');await categoryName.locator('..').getByRole('button',{name:'Spara namn',exact:true}).click();await a.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).catalog.entries.find(entry=>entry.article==='SW300 Reserv').category==='Automatik team',storageKey);assertSeeds(await catalog(a),{sw:120,renamed:true});known=await findRow(a,'project','SW300 Reserv','sw300 reserv');assert.equal(await known.locator('select').inputValue(),'Automatik team');await assertReport(a,340,240,1,240);
  // An alias remains reserved; adding the old name must not create a second master record.
  root=await materialView(a,'library');await root.locator('.smMaterialAdd>summary').click();const form=root.locator('.smMaterialAddForm');await form.getByLabel('Ny produkt',{exact:true}).fill('SW300');await form.getByRole('button',{name:'Lägg till',exact:true}).click();assert.match(await root.innerText(),/Produkten finns redan/);assertSeeds(await catalog(a),{sw:120,renamed:true});
  stage('Reload, isolated project and storage failure');
  // Different/reloaded project snapshots cannot overwrite the edited app master.
  await openPrepared(b,await fixture('B',1));await assertReport(b,200,120,1,120);assertSeeds(await catalog(b),{sw:120,renamed:true});const c=await context.newPage();watch(c);await openPrepared(c,await fixture('C'));await assertReport(c,320,240,1,240);
  const stored=await c.evaluate(key=>localStorage.getItem(key),storageKey);master=await findRow(c,'library','SW300 Reserv','library:sw300 reserv');await c.evaluate(key=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('Quota full','QuotaExceededError');return window.__setItem.call(this,name,value);};},storageKey);await master.locator('[data-duration-part="hours"]').fill('3');await master.getByRole('button',{name:'Spara rad',exact:true}).click();assert.match(await panel(c).innerText(),/Ändringarna är inte sparade/);assert.equal(await c.evaluate(key=>localStorage.getItem(key),storageKey),stored);await assertReport(c,320,240,1,240);await c.evaluate(()=>Storage.prototype.setItem=window.__setItem);await c.close();
  const state=await context.storageState(),persistent=await setupContext(browser,{storageState:state}),restarted=await persistent.newPage();watch(restarted);await openPrepared(restarted,await fixture('restart'));assertSeeds(await catalog(restarted),{sw:120,renamed:true});await assertReport(restarted,320,240,1,240);await persistent.close();
  stage('Portable PDF export and fresh-browser reopen');const bytes=await exportPdf(a),pdf=await PDFDocument.load(bytes),saved=JSON.parse(pdf.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());assert.equal(pdf.getPageCount(),2);assert.equal(saved.timeConfig.productLibrary.entries.find(entry=>entry.article==='SW300 Reserv').minutes,120);assert.equal(saved.timeConfig.productLibrary.entries.find(entry=>entry.article==='SW300 Reserv').category,'Automatik team');assert(!Object.hasOwn(saved.timeConfig.productMinutes||{},'dc300'));assert.equal(saved.timeConfig.productMinutes['projectonly z'],20);assert.deepEqual(saved.instances['door-main'].checks,initialChecks);assert.equal(saved.instances['door-main'].customItems.find(item=>item.id==='extra').minutes,30);
  const clean=await setupContext(browser),portable=await clean.newPage();watch(portable);await openPrepared(portable,bytes);await assertReport(portable,340,240,1,240);assertSeeds(await catalog(portable),{sw:120,renamed:true});known=await findRow(portable,'project','SW300 Reserv','sw300 reserv');assert.equal(await known.locator('select').inputValue(),'Automatik team');assert.equal(await known.locator('[data-duration-part="hours"]').isEditable(),false);assert(await panel(portable).evaluate(element=>element.scrollWidth<=element.clientWidth+2));await clean.close();assert.deepEqual(errors,[]);
  console.log('PASS '+device+' in '+((Date.now()-started)/1000).toFixed(1)+'s: 66 Excel products, partial migration, master-first/stale overrides, null/zero, read-only known rows, live cross-tab edits, aliases/quantities/checks, category rename, custom/extra times, no +Project snapshot, storage failure/restart and 2-page PDF roundtrip into a fresh browser.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});

