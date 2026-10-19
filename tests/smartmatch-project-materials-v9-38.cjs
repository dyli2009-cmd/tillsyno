/* Avläsning TEST 9.38: own work points retain their section and can be
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-38.html`;
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
 const readTestData={schema:1,phase:'full',sourceId:'generated:custom-points-v925',rects:{code:codeRect,table:tableRect},pages:[2],cards,checks,groupMappings,renamedGroupCodes:[],matching:{version:2,hits,pages:[{page:1,count:3,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Own points TEST 9.38'};
 const payload={schema:6,projectId:'project:custom-points-v925',projectRevision:1,timeConfig:{minutes:{handle:10,strike:10,closer:30}},instances:{
  'door-a1':{checks:{'a-base':true,'legacy-point':true},rowStages:{'a-base':'done'},progress:100,overrides:{'a-base':{minutes:17}},customItems:[{id:'legacy-point',label:'Äldre egen punkt',value:'Utan sektion',note:'Ska ligga kvar i legacygruppen',quantity:1,minutes:5}]},
  'door-a2':{checks:{'a-base':true},rowStages:{},progress:100,overrides:{},customItems:[]},
  'door-b':{checks:{'b-base':true},rowStages:{},progress:100,overrides:{},customItems:[]}
 },automationItems:[],readTestData};
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
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:process.env.SMARTMATCH_DEVICE==='iphone'?{width:390,height:844}:process.env.SMARTMATCH_DEVICE==='ipad'?{width:820,height:1180}:{width:1366,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  try{
   await openPrepared(page,await fixture());
   async function add(id,value,scope='position'){
    await openPosition(page,id);await page.locator('#pwAddChecklistItem').click();
    await page.locator('#pwEditLabel').fill('Dörrstängare');await page.locator('#pwEditValue').fill(value);
    await page.locator('#pwEditQuantity').fill('2');await page.locator('#pwEditMinutes').fill('0,30');
    assert.equal(await page.locator('#pwItemScope').inputValue(),'position');
    await page.locator('#pwItemScope').selectOption(scope);await page.locator('#pwEditSave').click();
    await page.waitForFunction(()=>!document.getElementById('pwItemEditor').open);await closePosition(page);
   }
   await add('door-a1','DC700','code');await add('door-b','1 DC700');
   let state=await positions(page);
   assert(!state['door-a2'].customItems.some(i=>i.value==='DC700'),'same code excludes differently named source-card alias');
   const id=state['door-b'].customItems.find(i=>i.value==='1 DC700').id;
   await openPosition(page,'door-b');
   await page.locator('#pwChecklist .pwCheckRow').filter({hasText:'1 DC700'}).locator('input[type=checkbox]').check();
   await page.locator('#pwCardMaterials').click();
   let rows=await page.evaluate(()=>SmartMatchAppBridge.getProjectMaterials());
   assert(rows.some(r=>r.name==='1 DC700')&&rows.some(r=>r.name==='DC700'));
   const material=page.locator('.pwProjectMaterialRow').filter({has:page.locator('input[aria-label="Produkt 1 DC700"]')});
   await material.locator('input').first().fill('DC700');await material.getByRole('textbox',{name:'Tid per styck 1 DC700',exact:true}).fill('0,40');await material.locator('button').click();
   await page.waitForFunction(()=>!document.querySelector('input[aria-label="Produkt 1 DC700"]'));
   rows=await page.evaluate(()=>SmartMatchAppBridge.getProjectMaterials());
   await page.screenshot({path:'/tmp/materials937-'+(process.env.SMARTMATCH_DEVICE||'desktop')+'.png'});
   assert(await page.locator('#pwProjectMaterials').evaluate(el=>el.scrollWidth<=el.clientWidth+2),'material workspace fits screen');
   assert.equal(rows.filter(r=>r.name==='DC700').length,1);assert.equal(rows.find(r=>r.name==='DC700').quantity,4);
   state=await positions(page);assert.equal(state['door-b'].checks[id],true);assert.equal(state['door-b'].customItems.find(i=>i.id===id).minutes,30);
   assert.equal(state['door-a1'].overrides['a-base'].minutes,17);
   await page.locator('#pwProjectMaterials [data-close]').click();
   assert.equal(await page.locator('#pwChecklist .pwCheckRow').filter({hasText:'DC700'}).count(),1);
   assert.equal(await page.locator('#pwChecklist .pwCheckRow').filter({hasText:'1 DC700'}).count(),0);
   const report=await page.evaluate(()=>SmartMatchAppBridge.getTimeReport());
   const closer=report.rows.flatMap(row=>row.products).filter(p=>p.label.includes('DC700'));
   assert(closer.length&&closer.every(p=>p.unitMinutes===40),'shared time overrides individual product times on every door');
   assert.equal(closer.reduce((sum,p)=>sum+p.totalMinutes,0),160);
   await page.evaluate(()=>{SmartMatchReadTest.setCardDisplayRegion('GS10',2,{x:.1,y:.1,w:.7,h:.7});SmartMatchAppBridge.save();});
   assert.deepEqual(await page.evaluate(()=>SmartMatchReadTest.cardDisplayRegion('GS20',2)),{x:.1,y:.1,w:.7,h:.7},'crop applies across different source cards');
   let draft=await lastDraft(page);assert.equal(draft.timeConfig.productAliases['1 dc700'],'DC700');
   // Reopening the exported payload must retain aliases. Raw OCR/own text stays auditable.
   const document=await PDFDocument.load(await fixture());
   for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(draft)));
   const reopened=await context.newPage();await openPrepared(reopened,Buffer.from(await document.save()));
   rows=await reopened.evaluate(()=>SmartMatchAppBridge.getProjectMaterials());assert.equal(rows.find(r=>r.name==='DC700').quantity,4);
   assert(!rows.some(r=>r.name==='1 DC700'));
   assert.equal(rows.find(r=>r.name==='DC700').minutes,40,'shared time survives saved PDF');
   assert.deepEqual(await reopened.evaluate(()=>SmartMatchReadTest.cardDisplayRegion('GS20',2)),{x:.1,y:.1,w:.7,h:.7},'project crop survives saved PDF');
   await reopened.evaluate(()=>SmartMatchReadTest.setCardDisplayRegion('GS20',2,null));
   assert.deepEqual(await reopened.evaluate(()=>SmartMatchReadTest.cardDisplayRegion('GS10',2)),{x:0,y:0,w:1,h:1},'whole original resets every card');await reopened.close();
   const separate=await context.newPage();await openPrepared(separate,await fixture());
   assert.equal(await separate.evaluate(()=>SmartMatchAppBridge.resolveProjectProduct({label:'Dörrstängare',value:'1 DC700'}).value),'1 DC700','another project does not inherit corrections');await separate.close();
   // Default deletion only affects this physical door.
   await page.locator('#pwChecklist .pwCheckRow').filter({hasText:'DC700'}).locator('.pwRemoveItem').click();
   assert.equal(await page.locator('#pwSmartActionSelect').inputValue(),'position');await page.locator('#pwSmartActionSave').click();
   await page.waitForFunction(id=>!SmartMatchAppBridge.getPositions().find(o=>o.id==='door-b').customItems.some(i=>i.id===id),id);
   await closePosition(page);await openPosition(page,'door-a1');
   assert.equal(await page.locator('#pwChecklist .pwCheckRow').filter({hasText:'DC700'}).count(),1);
   await closePosition(page);await add('door-b','1 DC700');await openPosition(page,'door-a1');
   await page.locator('#pwChecklist .pwCheckRow').filter({hasText:'DC700'}).locator('.pwRemoveItem').click();
   await page.locator('#pwSmartActionSelect').selectOption('project');await page.locator('#pwSmartActionSave').click();
   await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().every(o=>!o.customItems.some(i=>/DC700/.test(i.value))));
   state=await positions(page);assert.equal(state['door-b'].checks['b-base'],true);assert.equal(state['door-a1'].checks['a-base'],true);
   // Correct a base row from the door editor, applying its product name everywhere.
   await page.locator('#pwChecklist .pwCheckRow').filter({hasText:'6696'}).getByRole('button',{name:'Ändra',exact:true}).click();
   await page.locator('#pwEditValue').fill('42265');await page.locator('#pwEditSave').click();
   await page.waitForFunction(()=>!document.getElementById('pwItemEditor').open);
   await closePosition(page);await openPosition(page,'door-a2');
   assert.equal(await page.locator('#pwChecklist .pwCheckRow').filter({hasText:'42265'}).count(),1);
   assert.equal((await positions(page))['door-a2'].checks['a-base'],true);
   await closePosition(page);await page.locator('#pwTimeReport').click();
   assert.equal(await page.locator('#pwTimeDoorsTab').count(),0);assert.equal(await page.locator('#pwTimeDoorsPanel').count(),0);
   assert(await page.locator('#pwTimeRows .pwProjectMaterialRow').count());
   assert(Number(await page.locator('#pwTimeTotal').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)))<=16);
   assert.notEqual(await page.locator('#pwTimeTotal').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)','total remains readable on compact light card');
   await page.screenshot({path:'/tmp/time938-'+(process.env.SMARTMATCH_DEVICE||'desktop')+'.png'});
   assert.deepEqual(errors,[]);console.log('PASS TEST 9.38 project materials: merge, counts, checks, time, export/reopen, code scope, default/global deletion, base correction');
  }finally{await context.close();}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
