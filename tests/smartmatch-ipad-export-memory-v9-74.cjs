// TEST 9.74: separate product catalog and project quantities/times; PDF roundtrip.
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-74.html`;
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
 const attachment=new Uint8Array(16*1024*1024);let state=123456789;for(let i=0;i<attachment.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;attachment[i]=state&255;}await document.attach(attachment,'source-data.bin',{mimeType:'application/octet-stream'});
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
 try{
  browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1024,height:1366},hasTouch:true,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'});
  await context.addInitScript(()=>{Object.defineProperty(navigator,'platform',{value:'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{value:5});Object.defineProperty(navigator,'canShare',{value:({files})=>files?.length===1});window.__shared=[];Object.defineProperty(navigator,'share',{configurable:true,value:async({files})=>{window.__shared.push(files[0]);window.__shareGesture=navigator.userActivation.isActive;}});});
  await context.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>{window.TillsynoAuth={client:{rpc:async()=>({data:{ok:true}})}};window.TillsynoCurrentAccess={userId:'test-user'};document.documentElement.removeAttribute('data-auth-pending');window.dispatchEvent(new CustomEvent('tillsyno-authorized',{detail:window.TillsynoCurrentAccess}));});"}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);await openPrepared(page,await fixture());
  assert.equal((await page.evaluate(()=>SmartMatchAppBridge.getDrawingPerformanceProfile())).ipad,true);
  await page.evaluate(async()=>{
   const source=SmartMatchAppBridge.getOriginalPdfBytes();window.__sourceHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source))).join(',');window.__loads=[];window.__slrDoc=false;
   const load=PDFLib.PDFDocument.load;PDFLib.PDFDocument.load=async function(data,...rest){window.__loads.push({size:data.byteLength,sameOriginal:data===source,sameOutput:data===window.__savedOutput});const doc=await load.call(this,data,...rest);if(data===source){const save=doc.save.bind(doc);doc.save=async(...args)=>window.__savedOutput=await save(...args);}return doc;};
   const verify=SmartMatchSLRTest.verify;SmartMatchSLRTest.verify=async(data,expected,doc)=>{window.__slrDoc=doc instanceof PDFLib.PDFDocument;return verify(data,expected,doc);};
   const cleanup=SmartMatchAppBridge.getPdf().cleanup.bind(SmartMatchAppBridge.getPdf());window.__cleanup=0;SmartMatchAppBridge.getPdf().cleanup=async(...args)=>{window.__cleanup++;return cleanup(...args);};
  });
  await page.locator('#smartPdfInspect').click();await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled,null,{timeout:120000});
  const stats=await page.evaluate(async()=>({loads:window.__loads,cleanup:window.__cleanup,slr:window.__slrDoc,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',SmartMatchAppBridge.getOriginalPdfBytes()))).join(','),originalHash:window.__sourceHash,bytes:SmartMatchAppBridge.getOriginalPdfBytes().length}));
  assert(stats.bytes>16*1024*1024);assert.equal(stats.hash,stats.originalHash,'Original source bytes must never change');assert.equal(stats.loads.filter(x=>x.sameOriginal).length,1,'Build reads original without a copy');assert.equal(stats.loads.filter(x=>x.sameOutput).length,1,'Verify reads serialized output without a copy');assert.equal(stats.loads.filter(x=>x.size>16*1024*1024).length,2,'Exactly two full project parses, including SLR verification');assert(stats.cleanup>=1);assert(stats.slr);
  await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>window.__shared.length===1);await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>window.__shared.length===2);assert(await page.evaluate(()=>window.__shared[0]===window.__shared[1]));assert(await page.evaluate(()=>window.__shareGesture));assert(await page.evaluate(()=>window.__shared[0].size>16*1024*1024));assert.match(await page.locator('#smartExportStatus').innerText(),/Filer, Dropbox eller Google Drive/);
  // Save the same verified file through the download fallback, then reopen it.
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{value:undefined,configurable:true}));
  const downloading=page.waitForEvent('download');await page.locator('#smartExportBuild').click();const download=await downloading,exported=fs.readFileSync(await download.path()),doc=await PDFDocument.load(exported),payload=JSON.parse(doc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());assert.equal(Object.keys(payload.instances).length,3);assert.equal(payload.timeConfig.projectMaterials[0].name,'SW300');assert.equal(doc.getPageCount(),5);assert(doc.catalog.get(PDFName.of('Names')),'Customer attachment retained');
  await page.locator('#smartExportClose').click();const oldZoom=await page.locator('#pwZoomInfo').innerText();await page.locator('#pwZoomIn').click();await page.waitForFunction(old=>document.getElementById('pwZoomInfo').textContent!==old,oldZoom);await page.waitForFunction(()=>document.getElementById('pwCanvas').width>0);// Closing during preparation must release the render pause and allow a new export.
  await page.evaluate(()=>{const load=PDFLib.PDFDocument.load;window.__cancelLoad=false;window.__cancelDone=false;PDFLib.PDFDocument.load=async function(data,...rest){if(data===SmartMatchAppBridge.getOriginalPdfBytes()&&!window.__cancelLoad){window.__cancelLoad=true;await new Promise(resolve=>window.__continueExport=resolve);const doc=await load.call(this,data,...rest);window.__cancelDone=true;return doc;}return load.call(this,data,...rest);};});
  await page.locator('#smartPdfInspect').click();await page.waitForFunction(()=>window.__cancelLoad);await page.locator('#smartExportClose').click();await page.evaluate(()=>window.__continueExport());await page.waitForFunction(()=>window.__cancelDone);await page.waitForTimeout(100);await page.locator('#smartPdfInspect').click();await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled,null,{timeout:120000});await page.locator('#smartExportClose').click();
  const other=await context.newPage();await openPrepared(other,exported);assert.equal((await positions(other))['door-a1'].customItems.length,7);assert.deepEqual(errors,[]);console.log('PASS iPad desktop-UA, 16 MB source, no full-buffer copies, shared verification parser, cache cleanup, original SHA-256 unchanged, reused File/share gesture, download and portable PDF reopen');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
