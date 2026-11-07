/* Avläsning TEST 9.25: the destructive position action stays behind a
 * body-mounted arrow menu and a second confirmation. Orders/remarks belong to
 * one physical position, retain resolved history, drive marker badges and can
 * navigate back from the project overview. The colour legend is a local image
 * note and uses the ordinary move/resize persistence path. Generated PDF only. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');

const root=path.resolve(__dirname,'..');
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-25.html`;
const codeRect={x:.05,y:.05,w:.40,h:.06},tableRect={x:.04,y:.14,w:.90,h:.70},bounds={x:.03,y:.04,w:.93,h:.83};

function workItem(){
 return {key:'closer',text:'Dörrstängare · DC700',legacyText:'Dörrstängare · DC700',label:'Dörrstängare',value:'DC700',quantity:1,section:'Övrig utrustning',sectionKey:'ovrig-utrustning',tableIndex:0,sourceRow:2,sourceIdentity:'gs:0:2:ovrig-utrustning:dörrstängare:dc700',responsibility:'GS'};
}
function hit(positionId,rect,order){
 return {page:1,code:'GS25',rect,box:{x:rect[0]/595,y:(842-rect[3])/842,w:(rect[2]-rect[0])/595,h:(rect[3]-rect[1])/842},positionId,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order};
}
function basePayload(){
 const row=workItem(),hits=[hit('door-1',[60,675,125,705],870000),hit('door-2',[390,485,455,515],870001)];
 const card={id:'card-gs25',page:2,code:'GS25',originalCardCode:'GS25',header:'Beslagskod: GS25',codeRect,tableRect,bounds,rawTable:'Dörrstängare DC700 GS',work:[row.text],workItems:[row],workState:'ready',workPolicy:'gs-install-v3',choices:['GS25'],method:'PDF-text',confidence:100};
 const readTestData={schema:1,phase:'full',sourceId:'generated:attention-v925',rects:{code:codeRect,table:tableRect},pages:[2],cards:{'card-gs25':card},checks:{'door-1':{closer:false},'door-2':{closer:false}},matching:{version:2,hits,pages:[{page:1,count:2,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Attention TEST 9.25'};
 return {schema:6,projectId:'project:attention-v925',projectRevision:1,timeConfig:{minutes:{closer:30}},instances:{
  'door-1':{checks:{closer:false},rowStages:{},progress:0,overrides:{},customItems:[],attentionItems:[]},
  'door-2':{checks:{closer:false},rowStages:{},progress:0,overrides:{},customItems:[],attentionItems:[]}
 },drawingNotes:[],automationItems:[],readTestData};
}
async function fixture(payload=basePayload()){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const plan=document.addPage([595,842]);plan.drawText('GS25',{x:65,y:680,size:18,font:bold});plan.drawText('GS25',{x:395,y:490,size:18,font:bold});plan.drawText('PLANRITNING',{x:220,y:790,size:14,font});
 const card=document.addPage([595,842]);card.drawText('Beslagskod: GS25',{x:45,y:770,size:18,font:bold});card.drawText('Dorrstangare DC700 GS',{x:45,y:700,size:12,font});
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}
async function makeContext(browser){
 const context=await browser.newContext({viewport:{width:1440,height:960},locale:'sv-SE'});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 return context;
}
async function openPrepared(page,bytes,name='attention-v925.pdf'){
 await page.goto(url());
 await page.locator('#pwFile').setInputFiles({name,mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf?.()&&SmartMatchAppBridge.getPositions().length===2&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
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
async function addAttention(page,button,text){
 await page.locator(button).click();await page.waitForSelector('#pwSmartActionDialog[open]');
 await page.locator('#pwSmartActionInput').fill(text);await page.locator('#pwSmartActionSave').click();
 await page.waitForFunction(()=>!document.getElementById('pwSmartActionDialog').open);
}
async function projectPayload(page){return page.evaluate(()=>structuredClone(SmartMatchAppBridge.save()));}
async function positionState(page,id){return page.evaluate(id=>structuredClone(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);}
async function dragNotePart(page,selector,dx,dy){
 await page.evaluate(({selector,dx,dy})=>{
  const target=document.querySelector(selector),viewer=document.getElementById('pwViewer'),box=target.getBoundingClientRect(),x=box.left+box.width/2,y=box.top+box.height/2,pointerId=417;
  target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId,pointerType:'mouse',button:0,buttons:1,clientX:x,clientY:y}));
  viewer.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,pointerId,pointerType:'mouse',button:0,buttons:1,clientX:x+dx,clientY:y+dy}));
  viewer.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId,pointerType:'mouse',button:0,buttons:0,clientX:x+dx,clientY:y+dy}));
 },{selector,dx,dy});
}
function rectSize(rect){return {w:Math.abs(Number(rect[2])-Number(rect[0])),h:Math.abs(Number(rect[3])-Number(rect[1]))};}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await makeContext(browser),page=await context.newPage(),errors=[],remote=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(request.url()))remote.push(request.url());});
  let saved;
  try{
   await openPrepared(page,await fixture());await openPosition(page,'door-1');

   const menuState=await page.evaluate(()=>{
    const fit=document.getElementById('pwProtocolFit'),button=document.getElementById('pwProtocolActionMenuButton'),menu=document.getElementById('pwProtocolActionMenu');
    return {hidden:menu.hidden,bodyMounted:menu.parentElement===document.body,besideFit:fit.nextElementSibling===button,expanded:button.getAttribute('aria-expanded')};
   });
   assert.deepEqual(menuState,{hidden:true,bodyMounted:true,besideFit:true,expanded:'false'},'the safe position menu starts hidden, lives at body level and its arrow sits beside Passa');
   await page.locator('#pwProtocolActionMenuButton').click();assert.equal(await page.locator('#pwProtocolActionMenu').isVisible(),true);assert.equal(await page.locator('#pwProtocolActionMenuButton').getAttribute('aria-expanded'),'true');
   assert.equal(await page.evaluate(()=>{const button=document.getElementById('pwRemovePosition'),r=button.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.id;}),'pwRemovePosition','the normal popover is the real hit target above the modal protocol');
   await page.keyboard.press('Escape');assert.equal(await page.locator('#pwProtocolActionMenu').isHidden(),true,'Escape closes only the action menu');assert.equal(await page.locator('#pwProtocol').evaluate(node=>node.open),true,'Escape does not close the door-card view while its action menu is open');
   assert.equal(await page.evaluate(()=>document.activeElement===document.getElementById('pwProtocolActionMenuButton')),true,'Escape restores focus to the arrow');
   await page.locator('#pwProtocolActionMenuButton').click();await page.locator('#pwProtocolCode').click();assert.equal(await page.locator('#pwProtocolActionMenu').isHidden(),true,'an outside pointer closes the action menu');

   // Safari versions without the Popover API use the same fixed menu as a
   // temporary child of the modal protocol. Exercise that path explicitly.
   await page.evaluate(()=>{const menu=document.getElementById('pwProtocolActionMenu');Object.defineProperty(menu,'showPopover',{value:undefined,configurable:true});Object.defineProperty(menu,'hidePopover',{value:undefined,configurable:true});});
   await page.locator('#pwProtocolActionMenuButton').click();
   assert.deepEqual(await page.evaluate(()=>{const menu=document.getElementById('pwProtocolActionMenu'),button=document.getElementById('pwRemovePosition'),r=button.getBoundingClientRect();return {parent:menu.parentElement?.id,position:getComputedStyle(menu).position,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.id};}),{parent:'pwProtocol',position:'fixed',hit:'pwRemovePosition'},'the no-Popover Safari fallback is a fixed, clickable child of the modal protocol');
   await page.locator('#pwRemovePosition').click();await page.waitForSelector('#pwSmartActionDialog[open]');
   assert.equal(await page.locator('#pwProtocolActionMenu').isHidden(),true);assert.match(await page.locator('#pwSmartActionTitle').innerText(),/Ta bort den här positionen/);
   assert.equal((await page.evaluate(()=>SmartMatchAppBridge.getPositions().length)),2,'opening the separate confirmation never removes the position');
   await page.locator('#pwSmartActionCancel').click();await page.waitForFunction(()=>!document.getElementById('pwSmartActionDialog').open);
   assert.equal((await page.evaluate(()=>SmartMatchAppBridge.getPositions().length)),2,'cancelling keeps the position');

   await addAttention(page,'#pwAddOrder','Beställ en dörrstängare');
   await addAttention(page,'#pwAddRemark','Kontrollera montagehöjd');
   let door1=await positionState(page,'door-1'),door2=await positionState(page,'door-2');
   assert.deepEqual(door1.attentionItems.map(item=>[item.kind,item.text,!!item.resolvedAt]),[['order','Beställ en dörrstängare',false],['remark','Kontrollera montagehöjd',false]]);
   assert.deepEqual(door2.attentionItems,[],'orders and remarks belong to the selected physical position, even when both positions use GS25');
   saved=await projectPayload(page);assert.equal(saved.instances['door-1'].attentionItems.length,2);assert.deepEqual(saved.instances['door-2'].attentionItems,[],'both the position state and portable project payload keep the physical-door boundary');

   await closePosition(page);await page.waitForSelector('#pwMarkers .pwStampHit[data-position-id="door-1"]');
   const firstMarker=page.locator('#pwMarkers .pwStampHit[data-position-id="door-1"]'),secondMarker=page.locator('#pwMarkers .pwStampHit[data-position-id="door-2"]');
   assert.equal(await firstMarker.locator('.pwAttentionBadge.order').innerText(),'B');assert.equal(await firstMarker.locator('.pwAttentionBadge.remark').innerText(),'!');
   assert.equal(await secondMarker.locator('.pwAttentionBadge').count(),0,'the sibling physical position receives no badge');

   await openPosition(page,'door-1');const order=page.locator('#pwDoorAttention article[data-kind="order"]');
   await order.locator('button.resolve').click();await page.waitForFunction(()=>document.querySelector('#pwDoorAttention article[data-kind="order"]')?.dataset.status==='resolved');
   door1=await positionState(page,'door-1');assert.equal(door1.attentionItems.find(item=>item.kind==='order').resolvedAt!==null,true,'resolved order remains in physical-door history');
   assert.equal(await page.locator('#pwDoorAttention article[data-kind="order"]').count(),1,'resolved history remains visible on the door');
   await closePosition(page);
   assert.equal(await firstMarker.locator('.pwAttentionBadge.order').count(),0,'resolved order removes the B badge');assert.equal(await firstMarker.locator('.pwAttentionBadge.remark').innerText(),'!','active remark keeps its badge');

   await page.locator('#pwTimeReport').click();await page.waitForSelector('#pwTimeDialog[open]');await page.locator('#pwAttentionTab').click();
   await page.waitForFunction(()=>document.querySelectorAll('#pwAttentionRows .pwAttentionCard').length===2);
   assert.match(await page.locator('#pwAttentionSummaryText').innerText(),/0 aktiva beställningar · 1 aktiva anmärkningar · 1 i historik/);
   assert.equal(await page.locator('#pwAttentionRows .pwAttentionCard[data-status="resolved"]').count(),1,'the project tab retains resolved history');
   const projectRemark=page.locator('#pwAttentionRows .pwAttentionCard[data-kind="remark"]');await projectRemark.getByRole('button',{name:'Visa dörr'}).click();
   await page.waitForSelector('#pwProtocol[open]');assert.match(await page.locator('#pwProtocolPosition').innerText(),/Position 1 av 2/,'project attention opens the correct physical door');await closePosition(page);

   await page.locator('#pwToolMenuButton').click();await page.locator('#pwToolLegend').click();
   assert.match(await page.locator('#pwState').innerText(),/Färgförklaringen är klar/);
   await page.evaluate(()=>{
    const canvas=document.getElementById('pwCanvas'),stage=document.getElementById('pwStage'),box=stage.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:416,pointerType:'mouse',button:0,buttons:1,clientX:box.left+box.width*.60,clientY:box.top+box.height*.42}));
   });
   await page.waitForFunction(()=>SmartMatchAppBridge.save().drawingNotes.some(note=>note.name==='SmartMatch färgförklaring'));
   let legend=(await projectPayload(page)).drawingNotes.find(note=>note.name==='SmartMatch färgförklaring');
   assert(legend&&legend.type==='image'&&legend.dataUrl.startsWith('data:image/png;base64,'),'the legend is a local PNG image note in the portable project');
   assert.equal(await page.locator('#pwDrawingNotes image.pwNoteImage').count(),1);assert.equal(await page.locator('#pwDrawingNotes .pwNoteHandle[data-note-part="resize"]').count(),1,'the selected legend exposes the ordinary image resize handle');
   const originalRect=legend.rect.slice();await dragNotePart(page,'#pwDrawingNotes image.pwNoteImage',46,28);
   legend=(await projectPayload(page)).drawingNotes.find(note=>note.name==='SmartMatch färgförklaring');assert.notDeepEqual(legend.rect,originalRect,'dragging uses the existing image-note move path and persists the new position');
   const movedRect=legend.rect.slice(),beforeSize=rectSize(movedRect);await dragNotePart(page,'#pwDrawingNotes .pwNoteHandle[data-note-part="resize"]',38,24);
   saved=await projectPayload(page);legend=saved.drawingNotes.find(note=>note.name==='SmartMatch färgförklaring');const afterSize=rectSize(legend.rect);
   assert(Math.abs(afterSize.w-beforeSize.w)>5||Math.abs(afterSize.h-beforeSize.h)>5,'the existing resize handle changes the persisted legend dimensions');
   assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'legend creation and all tested workflows stay local');
  }finally{await context.close();}

  const reopenedContext=await makeContext(browser),reopened=await reopenedContext.newPage(),reopenedErrors=[];reopened.on('pageerror',error=>reopenedErrors.push(error.message));
  try{
   await openPrepared(reopened,await fixture(saved),'attention-v925-reopened.pdf');
   const restored1=await positionState(reopened,'door-1'),restored2=await positionState(reopened,'door-2');
   assert.equal(restored1.attentionItems.length,2);assert(restored1.attentionItems.find(item=>item.kind==='order').resolvedAt);assert.deepEqual(restored2.attentionItems,[]);
   const marker=reopened.locator('#pwMarkers .pwStampHit[data-position-id="door-1"]');assert.equal(await marker.locator('.pwAttentionBadge.order').count(),0);assert.equal(await marker.locator('.pwAttentionBadge.remark').innerText(),'!');
   const restoredLegend=(await projectPayload(reopened)).drawingNotes.find(note=>note.name==='SmartMatch färgförklaring');assert(restoredLegend?.dataUrl.startsWith('data:image/png;base64,'));assert.equal(await reopened.locator('#pwDrawingNotes image.pwNoteImage').count(),1,'saved local legend restores as an editable image note');
   assert.deepEqual(reopenedErrors,[]);
   console.log('PASS TEST 9.25: safe position menu, separate delete confirmation, per-position attention/history/badges/navigation and movable local legend persistence');
  }finally{await reopenedContext.close();}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
