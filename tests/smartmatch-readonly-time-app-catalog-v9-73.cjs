// TEST 9.73: separate product catalog and project quantities/times; PDF roundtrip.
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-73.html`;
const codeRect={x:.04,y:.04,w:.40,h:.06},tableRect={x:.02,y:.12,w:.45,h:.75};

function workItem(key,label,value,section='Daglåsning',sectionKey='daglasning'){
 const text=label+' · '+value;
 return {key,text,legacyText:text,label,value,section,sectionKey,tableIndex:0,sourceRow:2,sourceIdentity:['gs',0,2,sectionKey,label,value].join(':').toLocaleLowerCase('sv-SE'),responsibility:'GS'};
}
function hit(positionId,code,rect,order){
 return {page:1,code,rect,box:{x:rect[0]/595,y:(842-rect[3])/842,w:(rect[2]-rect[0])/595,h:(rect[3]-rect[1])/842},positionId,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order};
}
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const plan=document.addPage([595,842]);
 plan.drawText('GS10',{x:70,y:680,size:18,font:bold});plan.drawText('GS10ALT',{x:260,y:610,size:18,font:bold});plan.drawText('GS20',{x:430,y:500,size:18,font:bold});
 // Two distinct source cards deliberately share the same physical PDF page.
 const cardsPage=document.addPage([595,842]);
 cardsPage.drawText('Beslagskod: GS10',{x:25,y:780,size:14,font:bold});cardsPage.drawText('Trycke 6696 GS',{x:25,y:740,size:11,font});
 cardsPage.drawText('Beslagskod: GS20',{x:320,y:780,size:14,font:bold});cardsPage.drawText('Slutbleck ST400 GS',{x:320,y:740,size:11,font});
 const a=workItem('a-base','Trycke','6696'),b=workItem('b-base','Slutbleck','ST400');
 const cardA={id:'card-a',page:2,code:'GS10',originalCardCode:'GS10',header:'Beslagskod: GS10',codeRect,tableRect,bounds:{x:.01,y:.03,w:.48,h:.90},rawTable:'Trycke 6696 GS',work:[a.text],workItems:[a],workState:'ready',workPolicy:'gs-install-v3',choices:['GS10'],method:'PDF-text',confidence:100};
 const cardB={id:'card-b',page:2,code:'GS20',originalCardCode:'GS20',header:'Beslagskod: GS20',codeRect:{x:.54,y:.04,w:.40,h:.06},tableRect:{x:.52,y:.12,w:.45,h:.75},bounds:{x:.51,y:.03,w:.48,h:.90},rawTable:'Slutbleck ST400 GS',work:[b.text],workItems:[b],workState:'ready',workPolicy:'gs-install-v3',choices:['GS20'],method:'PDF-text',confidence:100};
 const alias={...clone(cardA),id:'card-a-alias',code:'GS10ALT',originalCardCode:'GS10',sourceCardId:'card-a',drawingLabel:'GS10ALT',manualLink:true};
 const cards={'card-a':cardA,'card-a-alias':alias,'card-b':cardB};
 const hits=[hit('door-a1','GS10',[65,675,125,702],870000),hit('door-a2','GS10ALT',[255,605,350,632],870001),hit('door-b','GS20',[425,495,485,522],870002)];
 const checks={'door-a1':{'a-base':true},'door-a2':{'a-base':true},'door-b':{'b-base':true}};
 const groupMappings={GS10ALT:{code:'GS10ALT',drawingLabel:'GS10ALT',sourceCardId:'card-a',cardPage:2,originalCardCode:'GS10',sourceDrawingCodes:['GS10ALT'],sourceScopes:{GS10ALT:null}}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:custom-points-v925',rects:{code:codeRect,table:tableRect},pages:[2],cards,checks,groupMappings,renamedGroupCodes:[],matching:{version:2,hits,pages:[{page:1,count:3,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Own points TEST 9.55'};
 const payload={schema:6,projectId:'project:custom-points-v925',projectRevision:1,timeConfig:{minutes:{handle:10,strike:10,closer:30}},instances:{
  'door-a1':{checks:{'a-base':true,'legacy-point':true},rowStages:{'a-base':'done'},progress:100,overrides:{'a-base':{minutes:17}},customItems:[{id:'legacy-point',label:'Äldre egen punkt',value:'Utan sektion',note:'Ska ligga kvar i legacygruppen',quantity:1,minutes:5}]},
  'door-a2':{checks:{'a-base':true},rowStages:{},progress:100,overrides:{},customItems:[]},
  'door-b':{checks:{'b-base':true},rowStages:{},progress:100,overrides:{},customItems:[]}
 },automationItems:[],readTestData};
 payload.instances['door-a1'].customItems.push(...[['behor-a','Behör','2356'],['behor-b','Behörn','1 2356'],['holder-a','Porthållare','PH1'],['holder-b','Portållare','PH2'],['contact','Magnetkontkt','MK1']].map(([id,label,value])=>({id,label,value,quantity:1,minutes:null,kind:'work'})));
 payload.timeConfig.projectMaterials=[{name:'SW300',quantity:2}];payload.timeConfig.productMinutes={'2356':10};payload.timeConfig.productCategories={'sw300':'Dörrautomatik','6696':'Behör'};
 payload.instances['door-a1'].customItems.push({id:'extra-90',label:'Extra arbete',value:'',minutes:90,quantity:1,kind:'extra-time'});
 const unplaced=workItem('unplaced-lock','Låshus','212-50');payload.readTestData.cards['card-c']={...clone(cardB),id:'card-c',code:'GS30',originalCardCode:'GS30',work:[unplaced.text],workItems:[unplaced],rawTable:'Låshus 212-50 GS'};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}
async function openPrepared(page,bytes){
 await page.goto(url());await page.getByLabel('Kod till Avläsning').fill('1234');await page.locator('#smReadCodeGate button').click();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-read-locked'));
 await page.locator('#pwFile').setInputFiles({name:'custom-points-v925.pdf',mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf?.()&&SmartMatchAppBridge.getPositions().length===3&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
 // Capture the exact portable project payload produced by the ordinary save()
 // path. PDF export embeds this same payload.
 await page.evaluate(()=>{
  window.__draftPayloads=[];
  SmartMatchSession.queueDraft=entry=>{window.__draftPayloads.push(structuredClone(entry.payload));return entry.payload;};
 });
}
async function openPosition(page,id){
 await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);
 await page.waitForSelector('#pwProtocol[open]');
 await page.waitForFunction(()=>!!document.getElementById('pwProtocolCanvas')?.dataset.readCardId);
 if(await page.locator('#pwProtocolShowGS').isVisible())await page.locator('#pwProtocolShowGS').click();
}
async function closePosition(page){
 await page.locator('#pwProtocolClose').click();
 await page.waitForFunction(()=>!document.getElementById('pwProtocol').open);
}
async function positions(page){
 return page.evaluate(()=>Object.fromEntries(SmartMatchAppBridge.getPositions().map(position=>[position.id,structuredClone(position)])));
}
async function lastDraft(page){
 return page.evaluate(()=>structuredClone(window.__draftPayloads.at(-1)));
}

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>{window.TillsynoAuth={client:{rpc:async()=>({data:{ok:true}})}};window.TillsynoCurrentAccess={userId:'test-user'};document.documentElement.removeAttribute('data-auth-pending');window.dispatchEvent(new CustomEvent('tillsyno-authorized',{detail:window.TillsynoCurrentAccess}));});"}));const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);await openPrepared(page,await fixture());await page.locator('#pwProjectMaterialButton').click();
 const root=page.locator('#pwProjectMaterials'),library=()=>root.getByRole('button',{name:'Produktlista',exact:true}).click(),project=()=>root.getByRole('button',{name:'Projektmaterial',exact:true}).click();const search=root.getByRole('searchbox',{name:'Sök material'});const total=()=>root.locator('.smCategoryReportTotals strong').first().innerText();
 assert.equal(await total(),'8 tim 30 min');await library();assert.equal(await root.locator('.smCategoryReport,.smCategoryTime,.pwMaterialCount').count(),0);assert.equal(await root.getByRole('button',{name:'Skriv ut',exact:true}).count(),0);assert.equal(await root.locator('.pwProjectMaterialRow[data-product-key="library:ph1"]').count(),0);
 await search.fill('SW300');let sw=root.locator('.pwProjectMaterialRow[data-product-key="library:sw300"]');await sw.locator('[data-duration-part="hours"]').fill('2');await sw.getByRole('button',{name:'Spara rad',exact:true}).click();await page.waitForFunction(()=>window.__draftPayloads.at(-1)?.timeConfig.productLibrary?.entries.find(e=>e.article==='SW300')?.minutes===120);assert.equal((await page.evaluate(()=>SmartMatchAppBridge.getTimeReport())).total,510);
 sw=root.locator('.pwProjectMaterialRow[data-product-key="library:sw300"]');await sw.locator('.smProductControl input').fill('SW300 Reserv');await sw.getByRole('button',{name:'Spara rad',exact:true}).click();await page.waitForFunction(()=>window.__draftPayloads.at(-1)?.timeConfig.productLibrary?.entries.some(e=>e.article==='SW300 Reserv'));assert.equal((await page.evaluate(()=>SmartMatchAppBridge.getTimeReport())).total,510);
 await search.fill('');await root.locator('.smMaterialCategories>summary').click();const rename=root.getByRole('textbox',{name:'Kategorinamn Låshus',exact:true});await rename.fill('Låslager');await rename.locator('..').getByRole('button',{name:'Spara namn'}).click();await page.waitForFunction(()=>window.__draftPayloads.at(-1)?.timeConfig.productLibrary?.entries.some(e=>e.category==='Låslager'));assert.equal((await page.evaluate(()=>SmartMatchAppBridge.getTimeReport())).total,510);
 await root.locator('.smMaterialAdd>summary').click();const form=root.locator('.smMaterialAddForm');assert.equal(await form.getByRole('spinbutton',{name:'Antal att lägga till'}).count(),0);assert.equal(await form.getByRole('combobox',{name:'Lägg till i',exact:true}).count(),0);await form.getByRole('combobox',{name:'Kategori för ny produkt'}).selectOption('Behör');await form.getByLabel('Ny produkt',{exact:true}).fill('Lagerprodukt X');await form.locator('[data-duration-part="hours"]').fill('1');await form.locator('[data-duration-part="minutes"]').fill('30');await form.getByRole('button',{name:'Lägg till',exact:true}).click();await page.waitForFunction(()=>window.__draftPayloads.at(-1)?.timeConfig.productLibrary?.entries.some(e=>e.article==='Lagerprodukt X'));assert.equal((await page.evaluate(()=>SmartMatchAppBridge.getTimeReport())).total,510);
 await search.fill('Lagerprodukt X');const stock=root.locator('.pwProjectMaterialRow[data-product-key="library:lagerprodukt x"]');await stock.getByRole('button',{name:'Lägg till Lagerprodukt X i projektet',exact:true}).click();await page.waitForFunction(()=>window.__draftPayloads.at(-1)?.timeConfig.projectMaterials.some(e=>e.name==='Lagerprodukt X'&&e.quantity===1));assert.equal((await page.evaluate(()=>SmartMatchAppBridge.getTimeReport())).total,600);assert.equal(await root.locator('.smCategoryReport').count(),0);
 await page.screenshot({path:'/tmp/library973-desktop.png'});await page.setViewportSize({width:390,height:844});const bounds=await stock.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=390,JSON.stringify(bounds));await page.screenshot({path:'/tmp/library973-phone.png'});
 await project();assert.equal(await total(),'10 tim');assert.equal(await root.locator('details[data-category="Låshus"]').count(),1);const used=root.locator('.pwProjectMaterialRow[data-product-key="lagerprodukt x"]');await used.locator('[data-duration-part="minutes"]').fill('');await used.getByRole('button',{name:'Spara rad',exact:true}).click();await page.waitForFunction(()=>window.__draftPayloads.at(-1)?.timeConfig.productMinutes?.['lagerprodukt x']===60);assert.equal(await total(),'9 tim 30 min');
 await root.locator('.smMaterialAdd>summary').click();const addProject=root.locator('.smMaterialAddForm');await addProject.getByLabel('Ny produkt',{exact:true}).fill('ProjectOnly');await addProject.locator('[data-duration-part="minutes"]').fill('30');await addProject.getByRole('spinbutton',{name:'Antal att lägga till'}).fill('2');await addProject.getByRole('button',{name:'Lägg till',exact:true}).click();await page.waitForFunction(()=>window.__draftPayloads.at(-1)?.timeConfig.projectMaterials.some(e=>e.name==='ProjectOnly'&&e.quantity===2));assert.equal(await total(),'10 tim 30 min');
 await library();await search.fill('Lagerprodukt X');assert.equal(await stock.locator('output').innerText(),'1 tim 30 min/st');assert.equal(await root.locator('.pwProjectMaterialRow[data-product-key="library:projectonly"]').count(),0);await root.getByRole('button',{name:'Stäng materiallistan',exact:true}).click();await page.locator('#pwTimeReport').click();await page.waitForSelector('#pwTimeDialog .smReadOnlyTimeGroup');const timeDialog=page.locator('#pwTimeDialog');assert.equal(await timeDialog.locator('input,select,textarea,[contenteditable=true]').count(),0);assert.deepEqual(await timeDialog.locator('button').allTextContents(),['×']);assert.equal(await page.locator('#pwTimeTotal').innerText(),'10 tim 30 min');assert.equal(await timeDialog.locator('.smCategoryReportTotals strong').first().innerText(),'10 tim 30 min');const automation=timeDialog.locator('details[data-category="Dörrautomatik"]');await automation.locator('summary').click();assert.equal(await automation.locator('tbody').isVisible(),true);assert.match(await automation.innerText(),/SW300/);assert.match(await automation.innerText(),/6 tim/);await page.screenshot({path:'/tmp/time973-phone.png'});assert(await timeDialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1));await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/time973-desktop.png'});await page.locator('#pwTimeClose').click();
 await page.evaluate(()=>window.showSaveFilePicker=undefined);await page.locator('#smartPdfInspect').click();await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled);const waiting=page.waitForEvent('download');await page.locator('#smartExportBuild').click();const download=await waiting,bytes=fs.readFileSync(await download.path());const saved=await PDFDocument.load(bytes),data=JSON.parse(saved.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());assert.equal(data.timeConfig.productLibrary.entries.find(e=>e.article==='Lagerprodukt X').minutes,90);assert.equal(data.timeConfig.productMinutes['lagerprodukt x'],60);assert(!data.timeConfig.productAliases?.sw300);assert.equal(data.timeConfig.articleTimeCatalog.entries.find(e=>e.article==='SW300').minutes,180);
 const other=await context.newPage();await openPrepared(other,bytes);await other.locator('#pwProjectMaterialButton').click();assert.equal(await other.locator('#pwProjectMaterials .smCategoryReportTotals strong').first().innerText(),'10 tim 30 min');await other.getByRole('button',{name:'Produktlista',exact:true}).click();await other.getByRole('searchbox',{name:'Sök material'}).fill('Lagerprodukt X');assert.equal(await other.locator('[data-product-key="library:lagerprodukt x"] output').innerText(),'1 tim 30 min/st');assert.equal(await other.locator('.smCategoryReport').count(),0);// A different project cannot overwrite the app's catalog with its own defaults.
 const fresh=await context.newPage();await openPrepared(fresh,await fixture());await fresh.locator('#pwProjectMaterialButton').click();assert.equal(await fresh.locator('#pwProjectMaterials .smCategoryReportTotals strong').first().innerText(),'8 tim 30 min');await fresh.getByRole('button',{name:'Produktlista',exact:true}).click();const freshRoot=fresh.locator('#pwProjectMaterials');await freshRoot.getByRole('searchbox',{name:'Sök material'}).fill('Lagerprodukt X');assert.equal(await freshRoot.locator('[data-product-key="library:lagerprodukt x"] output').innerText(),'1 tim 30 min/st');assert.equal(await freshRoot.locator('details[data-category="Låslager"]').count(),1);
 // Storage denial must leave committed values unchanged and show an honest error.
 await fresh.evaluate(()=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='tillsyno.product-library.v1')throw new DOMException('Quota full','QuotaExceededError');return window.__setItem.call(this,key,value);};});const freshStock=freshRoot.locator('[data-product-key="library:lagerprodukt x"]');await freshStock.locator('[data-duration-part="minutes"]').fill('45');await freshStock.getByRole('button',{name:'Spara rad',exact:true}).click();assert.match(await freshRoot.innerText(),/Ändringarna är inte sparade/);assert.equal(await fresh.evaluate(()=>JSON.parse(localStorage.getItem('tillsyno.product-library.v1')).catalog.entries.find(e=>e.article==='Lagerprodukt X').minutes),90);await fresh.evaluate(()=>Storage.prototype.setItem=window.__setItem);
 // Browser restart with saved local state, not sessionStorage, retains app products.
 const browserState=await context.storageState();const persistent=await browser.newContext({storageState:browserState});await persistent.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>{window.TillsynoAuth={client:{rpc:async()=>({data:{ok:true}})}};window.TillsynoCurrentAccess={userId:'test-user'};document.documentElement.removeAttribute('data-auth-pending');window.dispatchEvent(new CustomEvent('tillsyno-authorized',{detail:window.TillsynoCurrentAccess}));});"}));const restarted=await persistent.newPage();await openPrepared(restarted,await fixture());await restarted.locator('#pwProjectMaterialButton').click();await restarted.getByRole('button',{name:'Produktlista',exact:true}).click();assert.equal(await restarted.locator('[data-product-key="library:lagerprodukt x"]').count(),1);await persistent.close();
 // A browser without local catalog imports the PDF snapshot on first use.
 const clean=await browser.newContext();await clean.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>{window.TillsynoAuth={client:{rpc:async()=>({data:{ok:true}})}};window.TillsynoCurrentAccess={userId:'test-user'};document.documentElement.removeAttribute('data-auth-pending');window.dispatchEvent(new CustomEvent('tillsyno-authorized',{detail:window.TillsynoCurrentAccess}));});"}));const portable=await clean.newPage();await openPrepared(portable,bytes);await portable.locator('#pwProjectMaterialButton').click();assert.equal(await portable.locator('#pwProjectMaterials .smCategoryReportTotals strong').first().innerText(),'10 tim 30 min');await portable.getByRole('button',{name:'Produktlista',exact:true}).click();await portable.getByRole('searchbox',{name:'Sök material'}).fill('Lagerprodukt X');assert.equal(await portable.locator('[data-product-key="library:lagerprodukt x"] output').innerText(),'1 tim 30 min/st');await clean.close();
 assert.deepEqual(errors,[]);console.log('PASS read-only time overview and category totals, independent app catalog across projects/restart, storage denial, independent project edits, mobile layout and real PDF roundtrip into a fresh browser');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
