// TEST 9.71: category totals, material/time parity, portable PDF and entry gate.
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-71.html`;
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
 try{browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>{window.TillsynoAuth={client:{rpc:async(name,args)=>({data:{ok:args.p_pin==='1234',reason:'code'}})}};window.TillsynoCurrentAccess={userId:'test-user'};document.documentElement.removeAttribute('data-auth-pending');window.dispatchEvent(new CustomEvent('tillsyno-authorized',{detail:window.TillsynoCurrentAccess}));});"}));const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 // Verify direct entry remains locked and a wrong code leaves the app inert.
 await page.goto(url());await page.getByLabel('Kod till Avläsning').fill('0000');await page.locator('#smReadCodeGate button').click();await page.getByText('Fel kod. Försök igen.',{exact:true}).waitFor();assert(await page.locator('html').getAttribute('data-read-locked')!==null);await page.screenshot({path:'/tmp/gate971.png'});
 await openPrepared(page,await fixture());await page.locator('#pwProjectMaterialButton').click();
 const report=page.locator('#pwProjectMaterials .smCategoryReport');const totals=await report.locator('.smCategoryReportTotals strong').allTextContents();const groups=await report.locator('li').evaluateAll(ns=>ns.map(n=>({name:n.dataset.category,minutes:Number(n.dataset.minutes)})));
 assert.equal(totals[0],'8 tim 30 min');assert.equal(totals[1],'44 min');assert.equal(groups[0].name,'Dörrautomatik');assert.equal(groups[0].minutes,360);assert.equal(groups.find(g=>g.name==='Behör').minutes,39);assert.equal(groups.find(g=>g.name==='Låshus').minutes,6);assert.equal(groups.find(g=>g.name==='Egna tider').minutes,90);assert((await report.innerText()).includes('4 st saknar tid'));
 assert.equal(await page.locator('#pwProjectMaterials details[data-category="Dörrautomatik"] .smCategoryTime').innerText(),'6 tim');
 await report.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/report971-desktop.png'});await page.getByRole('button',{name:'Produktlista',exact:true}).click();assert.equal(await report.locator('.smCategoryReportTotals strong').first().innerText(),'8 tim 30 min');await page.getByPlaceholder('Sök produkt eller kategori').fill('212-50');assert.equal(await report.locator('.smCategoryReportTotals strong').first().innerText(),'8 tim 30 min');await page.getByPlaceholder('Sök produkt eller kategori').fill('');
 await page.getByRole('button',{name:'Projektmaterial',exact:true}).click();await page.locator('#pwProjectMaterials details[data-category="Dörrautomatik"]>summary').click();const row=page.locator('#pwProjectMaterials .pwProjectMaterialRow[data-product-key="sw300"]');await row.locator('[data-duration-part="hours"]').fill('2');await row.locator('[data-duration-part="minutes"]').fill('');await row.getByRole('button',{name:'Spara rad',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#pwProjectMaterials .smCategoryReportTotals strong')?.textContent==='6 tim 30 min');
 await page.locator('#pwProjectMaterials button[aria-label="Stäng materiallistan"]').click();await page.locator('#pwTimeReport').click();await page.waitForSelector('#pwTimeDialog .smCategoryReport');assert.equal(await page.locator('#pwTimeTotal').innerText(),'6 tim 30 min');assert.equal(await page.locator('#pwTimeDialog .smCategoryReportTotals strong').first().innerText(),'6 tim 30 min');const bridgeReport=await page.evaluate(()=>SmartMatchAppBridge.getTimeReport());assert.equal(bridgeReport.total,390);assert.equal(bridgeReport.unknown,4);assert.equal(bridgeReport.done,44);
 await page.setViewportSize({width:390,height:844});await page.locator('#pwTimeDialog .smCategoryReport').scrollIntoViewIfNeeded();const bounds=await page.locator('#pwTimeDialog .smCategoryReport').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=390,JSON.stringify(bounds));await page.screenshot({path:'/tmp/report971-phone.png'});assert.deepEqual(errors,[]);
 await page.locator('#pwTimeClose').click();await page.evaluate(()=>window.showSaveFilePicker=undefined);await page.locator('#smartPdfInspect').click();await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled);const waiting=page.waitForEvent('download');await page.locator('#smartExportBuild').click();const download=await waiting,exported=fs.readFileSync(await download.path());const saved=await PDFDocument.load(exported),data=JSON.parse(saved.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());assert.equal(data.timeConfig.productMinutes.sw300,120);assert.equal(data.timeConfig.projectMaterials[0].quantity,2);const reopened=await context.newPage();await openPrepared(reopened,exported);await reopened.locator('#pwProjectMaterialButton').click();assert.equal(await reopened.locator('#pwProjectMaterials .smCategoryReportTotals strong').first().innerText(),'6 tim 30 min');await reopened.close();
 await page.goto(new URL('index.html',url()).href);const homeEntry=page.getByRole('link',{name:'Avläsning Dörrkort · material · tid'});assert((await homeEntry.getAttribute('href')).includes('v9-71'));await homeEntry.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/home971-phone.png'});
 await page.goto(url());assert(await page.locator('html').getAttribute('data-read-locked')!==null);console.log('PASS calculations including mixed times, unplaced card, extra project quantities and extra time; save refresh, Material/Tid parity, search/catalog exclusion, direct/reloaded gate and mobile bounds');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
