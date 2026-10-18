/* Avläsning TEST 9.28: own work points retain their section and can be
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-28.html`;
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
 const readTestData={schema:1,phase:'full',sourceId:'generated:custom-points-v925',rects:{code:codeRect,table:tableRect},pages:[2],cards,checks,groupMappings,renamedGroupCodes:[],matching:{version:2,hits,pages:[{page:1,count:3,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Own points TEST 9.28'};
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
  const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  try{
   await openPrepared(page,await fixture());
   await openPosition(page,'door-a1');

   const legacySection=page.locator('#pwChecklist details.rtWorkSection[data-section-key="custom"]');
   assert.equal(await legacySection.count(),1,'a legacy custom item without section stays visible in its compatibility group');
   assert.match(await legacySection.locator('summary').innerText(),/Tillagda punkter och extra tid/);
   assert.match(await legacySection.innerText(),/Äldre egen punkt/);

   await page.locator('#pwAddChecklistItem').click();await page.waitForSelector('#pwItemEditor[open]');
   assert.equal(await page.locator('#pwItemSectionField').isVisible(),true,'ordinary own points expose section choice');
   assert.equal(await page.locator('#pwItemScopeField').isVisible(),true,'ordinary own points expose position/card scope');
   await page.locator('#pwItemSection').selectOption('nattlasning');
   await page.locator('#pwEditLabel').fill('Dörrstängare');
   await page.locator('#pwEditValue').fill('DC700');
   await page.locator('#pwEditQuantity').fill('2');
   await page.locator('#pwEditMinutes').fill('0,30');
   await page.locator('#pwEditNote').fill('Tillagd efter kontroll');
   await page.locator('#pwItemScope').selectOption('door-card');
   await page.locator('#pwEditSave').click();await page.waitForFunction(()=>!document.getElementById('pwItemEditor').open);

   let state=await positions(page),newA1=state['door-a1'].customItems.find(item=>item.value==='DC700'),newA2=state['door-a2'].customItems.find(item=>item.value==='DC700');
   assert(newA1&&newA2,'one save copies the point to both physical positions using source card A');
   assert.equal(newA1.id,newA2.id,'copied points retain one stable logical id');
   assert.deepEqual({section:newA1.section,sectionKey:newA1.sectionKey,kind:newA1.kind,label:newA1.label,value:newA1.value,quantity:newA1.quantity,minutes:newA1.minutes,note:newA1.note},
    {section:'Nattlåsning',sectionKey:'nattlasning',kind:'work',label:'Dörrstängare',value:'DC700',quantity:2,minutes:30,note:'Tillagd efter kontroll'});
   assert.equal(state['door-b'].customItems.some(item=>item.value==='DC700'),false,'another source card on the same PDF page is never included');
   assert.equal(state['door-a1'].checks[newA1.id],false);assert.equal(state['door-a2'].checks[newA1.id],false,'each physical door receives an independent unchecked value');
   assert.equal(state['door-a1'].checks['a-base'],true);assert.equal(state['door-a1'].checks['legacy-point'],true);
   assert.deepEqual(state['door-a1'].rowStages,{'a-base':'done'});assert.deepEqual(state['door-a1'].overrides,{'a-base':{minutes:17}},'adding to a card never overwrites saved checks, stages or time overrides');
   const nightSection=page.locator('#pwChecklist details.rtWorkSection[data-section-key="nattlasning"]');
   assert.equal(await nightSection.count(),1,'section/sectionKey from effectiveChecks creates the selected visible section');
   assert.match(await nightSection.locator('summary').innerText(),/Nattlåsning/);assert.match(await nightSection.innerText(),/Dörrstängare.*DC700/s);

   await closePosition(page);await openPosition(page,'door-a2');
   const copiedRow=page.locator('#pwChecklist .pwCheckRow').filter({hasText:'DC700'});assert.equal(await copiedRow.count(),1);assert.equal(await copiedRow.locator('input[type=checkbox]').isChecked(),false);
   await copiedRow.locator('input[type=checkbox]').check();await page.waitForFunction(id=>SmartMatchAppBridge.getPositions().find(position=>position.id==='door-a2').checks[id]===true,newA1.id);
   state=await positions(page);assert.equal(state['door-a2'].checks[newA1.id],true);assert.equal(state['door-a1'].checks[newA1.id],false,'checking the copied point never completes it on a different physical door');

   await closePosition(page);await openPosition(page,'door-a1');
   await page.locator('#pwAddExtraTime').click();await page.waitForSelector('#pwItemEditor[open]');
   assert.equal(await page.locator('#pwItemSectionField').isHidden(),true,'extra time has no work-section choice');
   assert.equal(await page.locator('#pwItemScopeField').isHidden(),true,'extra time has no mass-apply choice');
   await page.locator('#pwEditMinutes').fill('0,25');await page.locator('#pwEditNote').fill('Krångel på denna dörr');
   await page.locator('#pwEditSave').click();await page.waitForFunction(()=>!document.getElementById('pwItemEditor').open);
   state=await positions(page);
   const extra=state['door-a1'].customItems.find(item=>item.kind==='extra-time');assert(extra,'extra time is saved on the open physical door');
   assert.deepEqual({section:extra.section,sectionKey:extra.sectionKey,minutes:extra.minutes},{section:'Extra arbete',sectionKey:'extra-arbete',minutes:25});
   assert.equal(state['door-a2'].customItems.some(item=>item.kind==='extra-time'),false,'extra time is never copied to sibling positions');

   let draft=await lastDraft(page);
   assert(draft&&draft.instances,'ordinary save path emits a portable project payload');
   const persisted=draft.instances['door-a1'].customItems.find(item=>item.id===newA1.id);
   assert.deepEqual({section:persisted.section,sectionKey:persisted.sectionKey,kind:persisted.kind,quantity:persisted.quantity,minutes:persisted.minutes},
    {section:'Nattlåsning',sectionKey:'nattlasning',kind:'work',quantity:2,minutes:30},'section, kind, quantity and per-piece time survive in the persisted payload');
   assert(draft.instances['door-a1'].customItems.some(item=>item.id==='legacy-point'),'legacy custom data remains in the payload');

   await closePosition(page);
   await page.locator('#pwBulkSelect').click();await page.locator('#pwBulkPage').click();
   assert.equal(await page.locator('#pwBulkCount').innerText(),'3 valda');
   await page.locator('#pwBulkDone').click();await page.waitForFunction(()=>document.getElementById('pwBulkCount').textContent==='0 valda');
   state=await positions(page);
   assert.equal(state['door-a1'].checks[newA1.id],true);assert.equal(state['door-a1'].checks[extra.id],true);assert.equal(state['door-a1'].checks['legacy-point'],true);
   assert.equal(state['door-a2'].checks[newA1.id],true);assert.equal(state['door-b'].checks['b-base'],true,'bulk Klarmarkera includes base and custom rows');

   await page.locator('#pwBulkPage').click();await page.locator('#pwBulkClear').click();await page.waitForFunction(()=>document.getElementById('pwBulkCount').textContent==='0 valda');
   state=await positions(page);
   for(const [door,keys] of [['door-a1',['a-base','legacy-point',newA1.id,extra.id]],['door-a2',['a-base',newA1.id]],['door-b',['b-base']]])
    for(const key of keys)assert.equal(state[door].checks[key],false,'bulk Avmarkera clears '+door+' / '+key);
   const readChecks=await page.evaluate(()=>structuredClone(SmartMatchReadTest.payload().checks));
   assert.equal(readChecks['door-a1']['a-base'],false);assert.equal(readChecks['door-a2']['a-base'],false);assert.equal(readChecks['door-b']['b-base'],false,'base checks sync into read data before recalc can restore stale true values');
   draft=await lastDraft(page);
   assert.equal(draft.instances['door-a1'].checks['a-base'],false);assert.equal(draft.instances['door-a1'].checks[newA1.id],false);assert.equal(draft.instances['door-a1'].checks[extra.id],false);
   assert.equal(draft.instances['door-a2'].checks['a-base'],false);assert.equal(draft.instances['door-a2'].checks[newA1.id],false);assert.equal(draft.instances['door-b'].checks['b-base'],false,'the final portable payload contains the cleared base and custom states');
   assert.deepEqual(errors,[]);console.log('PASS TEST 9.28: own point sections, same-source-card scope, legacy persistence, per-door checks, extra-time isolation and bulk undo');
  }finally{await context.close();}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
