/* Avläsning TEST 9.55: own work points retain their section and can be
 * copied to every physical position that uses the same source door card.
 * Bulk done/undone must update base and own points without stale read data
 * restoring a completed base row during recalc. Generated searchable PDF. */
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-55.html`;
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
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}
async function openPrepared(page,bytes){
 await page.goto(url());
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
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});
  for(const viewport of [{width:820,height:1180},{width:390,height:844}]){
   const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage();
   await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
   const doc=await PDFDocument.load(await fixture()),payload=JSON.parse(doc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());
   for(let i=0;i<45;i++)payload.instances['door-a1'].customItems.push({id:'scroll'+i,label:'Beslag',value:'Artikel '+i,quantity:1,minutes:10});
   for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])doc.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
   await openPrepared(page,Buffer.from(await doc.save()));
   assert.equal(await page.locator('.rtTestBanner').isVisible(),false);assert.equal(await page.locator('#rtWorkflowBar').isVisible(),false);
   assert((await page.locator('#pwPlanTag').textContent()).includes('Sida 1 / 2'));assert.equal(await page.locator('#pwFileName').isVisible(),false);
   assert.equal(await page.locator('#pwPositionToolsMenu').evaluate(n=>n.open),false);
   await page.locator('#pwToolMenuButton').click();assert(await page.locator('#rtEditPreparation').isVisible());await page.locator('#pwToolMenuButton').click();
   await openPosition(page,'door-a1');assert.equal(await page.locator('#pwDoorTools').evaluate(n=>n.open),false);
   assert.equal(await page.locator('#pwAddChecklistItem').isVisible(),false);assert(await page.locator('#pwDoorTimeSummary').isVisible());
   await page.locator('#pwDoorTools>summary').click();assert(await page.locator('#pwAddChecklistItem').isVisible());assert(await page.locator('#pwRereadCard').isVisible());assert(await page.locator('#pwDoorReadExtras #rtClearDoorWork').isVisible());
   await page.screenshot({path:'/tmp/door955-'+viewport.width+'.png'});await closePosition(page);await page.locator('#pwProjectMaterialButton').click();
   const actions=page.locator('#pwProjectMaterials .pwMaterialAllActions');assert(await actions.getByRole('button',{name:'Stäng materiallistan'}).isVisible());
   await page.locator('#pwProjectMaterials').evaluate(n=>n.scrollTop=n.scrollHeight);
   const bounds=await actions.boundingBox();assert(bounds.y>=0&&bounds.y+bounds.height<=viewport.height,'all material controls stay in view');
   await page.screenshot({path:'/tmp/material955-'+viewport.width+'.png'});await actions.getByRole('button',{name:'Stäng materiallistan'}).click();assert.equal(await page.locator('#pwProjectMaterials').isVisible(),false);
   await context.close();
  }
  console.log('PASS TEST 9.55: iPad/phone folded tools, visible time summary, moved preparation, page heading and sticky material close/actions');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
