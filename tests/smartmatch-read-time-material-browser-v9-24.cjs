/* Avläsning TEST 9.24: material quantities and time are calculated once per
 * physical door, then aggregated by product and for the whole project.
 * Generated searchable PDF only; auth is stubbed inside this browser test. */
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-24.html`;
const codeRect={x:.08,y:.08,w:.80,h:.06},tableRect={x:.04,y:.16,w:.93,h:.64},bounds={x:.035,y:.075,w:.94,h:.73};

function item(key,label,value,section,sectionKey,quantity=1,index=0){
 const text=label+' · '+value;
 return {key,text,legacyText:text,label,value,quantity,section,sectionKey,tableIndex:0,sourceRow:index+2,sourceIdentity:['gs',0,index+2,sectionKey,label,value].join(':').toLocaleLowerCase('sv-SE'),responsibility:'GS'};
}
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const plan=document.addPage([595,842]);
 plan.drawText('GS23',{x:80,y:680,size:18,font});plan.drawText('GS23',{x:315,y:610,size:18,font});plan.drawText('GS24',{x:360,y:430,size:18,font});
 const gs23=[
  item('gs23-lock','Låshus','EL560','Daglåsning','daglasning',1,0),
  item('gs23-cylinder','Cylinder','C10','Daglåsning','daglasning',1,1),
  item('gs23-handle-a','Trycke A','6696 A','Daglåsning','daglasning',2,2),
  item('gs23-handle-b','Trycke B','6696 B','Daglåsning','daglasning',1,3),
  item('gs23-closer','Dörrstängare','BC700','Övrig utrustning','ovrig-utrustning',1,4)
 ];
 const gs24=[
  item('gs24-automation','Dörrautomatik','ED100','Dörrautomatik','dorrautomatik',1,0),
  item('gs24-closer','Dörrstängare','TS83','Dörrautomatik','dorrautomatik',1,1)
 ];
 function doorCard(code,rows){
  const card=document.addPage([595,842]);card.drawText('Beslagskod: '+code,{x:60,y:750,size:20,font:bold});
  card.drawText('Komponent',{x:40,y:690,size:11,font:bold});card.drawText('Produkt',{x:190,y:690,size:11,font:bold});card.drawText('Mont av',{x:470,y:690,size:11,font:bold});
  rows.forEach((row,index)=>{const y=660-index*30;card.drawText(row.label,{x:40,y,size:11,font});card.drawText(row.value,{x:190,y,size:11,font});card.drawText('GS',{x:470,y,size:11,font});});
 }
 doorCard('GS23',gs23);doorCard('GS24',gs24);
 const cards={
  'card-gs23':{id:'card-gs23',page:2,code:'GS23',originalCardCode:'GS23',header:'Beslagskod: GS23',codeRect,tableRect,bounds,rawTable:gs23.map(row=>row.text+' GS').join('\n'),work:gs23.map(row=>row.text),workItems:gs23,workState:'ready',workPolicy:'gs-install-v2',choices:['GS23'],method:'PDF-text',confidence:100},
  'card-gs24':{id:'card-gs24',page:3,code:'GS24',originalCardCode:'GS24',header:'Beslagskod: GS24',codeRect,tableRect,bounds,rawTable:gs24.map(row=>row.text+' GS').join('\n'),work:gs24.map(row=>row.text),workItems:gs24,workState:'ready',workPolicy:'gs-install-v2',choices:['GS24'],method:'PDF-text',confidence:100}
 };
 const hit=(positionId,code,rect,order)=>({page:1,code,rect,box:{x:rect[0]/595,y:(842-rect[3])/842,w:(rect[2]-rect[0])/595,h:(rect[3]-rect[1])/842},positionId,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order});
 const hits=[hit('D1','GS23',[75,675,130,700],870000),hit('D2','GS23',[310,605,365,630],870001),hit('D3','GS24',[355,425,410,450],870002)];
 const checks={
  D1:{'gs23-lock':false,'gs23-cylinder':false,'gs23-handle-a':true,'gs23-handle-b':false,'gs23-closer':true},
  D2:{'gs23-lock':true,'gs23-cylinder':false,'gs23-handle-a':false,'gs23-handle-b':false,'gs23-closer':false},
  D3:{'gs24-automation':false,'gs24-closer':false}
 };
 const readTestData={schema:1,phase:'full',sourceId:'generated:time-material-v924',rects:{code:codeRect,table:tableRect},pages:[2,3],cards,checks,matching:{version:2,hits,pages:[{page:1,count:3,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Tid och material TEST 9.24'};
 const payload={schema:6,projectId:'project:time-material-v924',projectRevision:1,timeConfig:{minutes:{lockcase:20,closer:30,cylinder:20,handle:10,automation:480}},instances:{
  D1:{checks:checks.D1,rowStages:{},progress:43,overrides:{'gs23-closer':{minutes:45}},customItems:[{id:'trouble',label:'Krångel',value:'Extra arbete',note:'Passning på plats',quantity:1,minutes:35}]},
  D2:{checks:checks.D2,rowStages:{},progress:20,overrides:{},customItems:[]},
  D3:{checks:checks.D3,rowStages:{},progress:0,overrides:{},customItems:[]}
 },automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}
async function edgeFixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const plan=document.addPage([595,842]);plan.drawText('GS99',{x:80,y:680,size:18,font:bold});plan.drawText('ORPHAN',{x:315,y:610,size:18,font:bold});
 const card=document.addPage([595,842]);card.drawText('Beslagskod: GS99',{x:60,y:750,size:20,font:bold});card.drawText('Specialbeslag XQ-7 GS',{x:55,y:665,size:12,font});
 const unknown=item('unknown-only','Specialbeslag','XQ-7','Övrig utrustning','ovrig-utrustning',3,0);
 const cards={'card-gs99':{id:'card-gs99',page:2,code:'GS99',originalCardCode:'GS99',header:'Beslagskod: GS99',codeRect,tableRect,bounds,rawTable:'Specialbeslag XQ-7 GS',work:[unknown.text],workItems:[unknown],workState:'ready',workPolicy:'gs-install-v2',choices:['GS99'],method:'PDF-text',confidence:100}};
 const hit=(positionId,code,rect,order)=>({page:1,code,rect,box:{x:rect[0]/595,y:(842-rect[3])/842,w:(rect[2]-rect[0])/595,h:(rect[3]-rect[1])/842},positionId,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order});
 const hits=[hit('EDGE','GS99',[75,675,130,700],870000)],checks={EDGE:{'unknown-only':true},STALE:{'stale-extra':true}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:time-edge-v924',rects:{code:codeRect,table:tableRect},pages:[2],cards,checks,matching:{version:2,hits,pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Okänd tid och frikopplad position TEST 9.24'};
 const payload={schema:6,projectId:'project:time-edge-v924',projectRevision:1,timeConfig:{minutes:{}},manualPositions:[{id:'STALE',manual:true,code:'ORPHAN',page:1,rect:[310,605,390,630],order:0,sourceKind:'project-code'}],instances:{
  EDGE:{checks:checks.EDGE,rowStages:{},progress:100,overrides:{},customItems:[]},
  STALE:{checks:checks.STALE,rowStages:{},progress:100,overrides:{},customItems:[{id:'stale-extra',label:'Gammal frikopplad tid',value:'Ska inte räknas',quantity:1,minutes:600}]}
 },automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}
async function openPrepared(page,bytes,positionCount=3){
 await page.goto(url());
 await page.locator('#pwFile').setInputFiles({name:'time-material-v924.pdf',mimeType:'application/pdf',buffer:bytes});
 try{await page.waitForFunction(count=>window.SmartMatchAppBridge?.getPdf()&&(count===null||SmartMatchAppBridge.getPositions().length===count)&&document.getElementById('pwScanOverlay').hidden,positionCount,{timeout:60000});}
 catch(error){console.error('Open state',await page.evaluate(()=>({pdf:!!window.SmartMatchAppBridge?.getPdf?.(),positions:window.SmartMatchAppBridge?.getPositions?.().map(o=>({id:o.id,code:o.code}))||[],overlayHidden:document.getElementById('pwScanOverlay')?.hidden,state:document.getElementById('pwState')?.textContent,dialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id)})).catch(()=>null));throw error}
}
async function openPosition(page,id){
 await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);
 await page.waitForSelector('#pwProtocol[open]');
 await page.waitForFunction(()=>!!document.getElementById('pwProtocolCanvas')?.dataset.readCardId);
}
async function bridgeState(page){
 return page.evaluate(async()=>({
  doors:Object.fromEntries(await Promise.all(SmartMatchAppBridge.getPositions().map(async position=>[position.id,await SmartMatchAppBridge.getPositionTimeSummary(position.id)]))),
  report:await SmartMatchAppBridge.getTimeReport()
 }));
}
function doorNumbers(door){return {items:door.itemCount,units:door.materialCount,total:door.totalMinutes,done:door.doneMinutes,left:door.remainingMinutes,unknown:door.unknownTimeCount}}
function reportNumbers(report){return {items:report.itemCount,units:report.unitCount,total:report.total,done:report.done,unknown:report.unknown}}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  try{
   await openPrepared(page,await fixture());
   let state=await bridgeState(page);
   assert.deepEqual(reportNumbers(state.report),{items:13,units:15,total:760,done:85,unknown:0},'three physical doors contribute every row and quantity exactly once');
   assert.deepEqual(doorNumbers(state.doors.D1),{items:6,units:7,total:150,done:65,left:85,unknown:0});
   assert.deepEqual(doorNumbers(state.doors.D2),{items:5,units:6,total:100,done:20,left:80,unknown:0});
   assert.deepEqual(doorNumbers(state.doors.D3),{items:2,units:2,total:510,done:0,left:510,unknown:0});

   await openPosition(page,'D1');
   assert.equal(await page.locator('#pwDoorTimeSummary').isVisible(),true,'the opened physical door exposes its own time summary');
   assert.deepEqual(await page.locator('#pwDoorTimeSummary strong').allTextContents(),['2 h 30 min','1 h 5 min','1 h 25 min','0']);
   const sections=page.locator('#pwChecklist details.rtWorkSection');
   assert.equal(await sections.count(),3,'read products and manually added time use compact section details');
   assert.match((await sections.nth(0).locator('summary').innerText()).replace(/\s+/g,' '),/Daglåsning.*1\/4 klara.*5 st.*1 h 10 min/);
   assert.match((await sections.nth(1).locator('summary').innerText()).replace(/\s+/g,' '),/Övrig utrustning.*1\/1 klara.*45 min/);
   assert.match((await sections.nth(2).locator('summary').innerText()).replace(/\s+/g,' '),/Tillagda punkter och extra tid.*0\/1 klara.*35 min/);
   await sections.nth(0).locator('summary').click();assert.equal(await sections.nth(0).evaluate(node=>node.open),false,'a section can be folded to keep the card compact');
   const extra=page.locator('#pwAddExtraTime');assert.equal((await extra.innerText()).trim(),'＋ Extra tid');assert.equal(await extra.isVisible(),true);
   await extra.click();await page.waitForSelector('#pwItemEditor[open]');
   assert.equal(await page.locator('#pwItemEditorTitle').innerText(),'Lägg till extra tid');assert.equal(await page.locator('#pwEditLabel').inputValue(),'Krångel / extraarbete');
   await page.locator('#pwEditCancel').click();await page.locator('#pwProtocolClose').click();

   await page.locator('#pwTimeReport').click();await page.waitForSelector('#pwTimeDialog[open]');
   assert.deepEqual(await page.locator('.pwTimeSummary strong').allTextContents(),['12 h 40 min','1 h 25 min','11 h 15 min','11%','0']);
   assert.match(await page.locator('#pwTimeSummaryText').innerText(),/13 arbetsmoment.*15 st material\/arbete.*3 moment klara/);
   const timeRow=key=>page.locator(`#pwTimeRows [data-time-key="${key}"]`);
   assert.match((await timeRow('lockcase').innerText()).replace(/\s+/g,' '),/Låshus.*2 st.*40 min totalt.*Klart.*1\/2/);
   assert.match((await timeRow('closer').innerText()).replace(/\s+/g,' '),/Dörrstängare.*3 st.*1 h 45 min totalt.*1 med egen tid/);
   assert.match((await timeRow('handle').innerText()).replace(/\s+/g,' '),/Trycke \/ handtag.*6 st.*1 h totalt/);
   assert.match((await timeRow('automation').innerText()).replace(/\s+/g,' '),/Dörrautomatik.*1 st.*8 h totalt/);
   assert.match((await timeRow('manual').innerText()).replace(/\s+/g,' '),/Egna tider.*1 st.*35 min totalt/);
   await timeRow('handle').locator('summary').click();
   const handleModels=(await timeRow('handle').locator('li').allTextContents()).map(text=>text.replace(/\s+/g,' ').trim());
   assert.deepEqual(handleModels,['Trycke A · 6696 A4 st · 40 min','Trycke B · 6696 B2 st · 20 min'],'the product report retains both model rows and their physical quantities');
   await timeRow('closer').locator('summary').click();
   const closerModels=(await timeRow('closer').locator('li').allTextContents()).map(text=>text.replace(/\s+/g,' ').trim());
   assert.deepEqual(closerModels,['Dörrstängare · BC7002 st · 1 h 15 min','Dörrstängare · TS831 st · 30 min']);

   await page.locator('#pwTimeDoorsTab').click();await page.waitForFunction(()=>!document.getElementById('pwTimeDoorsPanel').hidden);
   assert.match(await page.locator('#pwTimeDoorSummaryText').innerText(),/3 fysiska dörrar.*15 st material\/arbete/);
   const doorRows=page.locator('#pwTimeDoorRows .pwTimeDoorRow');assert.equal(await doorRows.count(),3);
   assert.deepEqual(await doorRows.evaluateAll(rows=>rows.map(row=>row.dataset.positionId)),['D1','D2','D3'],'per-door rows keep stable physical position ids');
   for(const [id,total,done]of [['D1','2 h 30 min','1 h 5 min'],['D2','1 h 40 min','20 min'],['D3','8 h 30 min','0 min']]){
    const row=page.locator(`#pwTimeDoorRows [data-position-id="${id}"]`),text=(await row.innerText()).replace(/\s+/g,' ');assert.match(text,new RegExp(total.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.match(text,new RegExp(done.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
   }
   await page.locator('#pwTimeDoorRows [data-position-id="D3"]').click();await page.waitForSelector('#pwProtocol[open]');
   assert.equal(await page.locator('#pwProtocolCode').innerText(),'GS24','clicking a time row opens that exact physical door');
   assert.equal(await page.locator('#pwDoorTimeTotal').innerText(),'8 h 30 min');await page.locator('#pwProtocolClose').click();

   await page.locator('#pwTimeReport').click();await page.waitForSelector('#pwTimeDialog[open]');
   const cylinder=timeRow('cylinder').locator('input');assert.equal(await cylinder.inputValue(),'0,20');
   await cylinder.fill('0,25');await cylinder.dispatchEvent('change');await page.waitForFunction(()=>document.getElementById('pwTimeTotal').textContent==='12 h 50 min');
   state=await bridgeState(page);
   assert.deepEqual(reportNumbers(state.report),{items:13,units:15,total:770,done:85,unknown:0},'changing one standard time updates every door that uses that material and leaves unrelated completed time alone');
   assert.deepEqual([state.doors.D1.totalMinutes,state.doors.D2.totalMinutes,state.doors.D3.totalMinutes],[155,105,510]);
   await page.locator('#pwTimeClose').click();await openPosition(page,'D1');
   assert.equal(await page.locator('#pwDoorTimeTotal').innerText(),'2 h 35 min','the visible per-door summary receives changed project defaults');
   const trouble=page.locator('#pwChecklist .pwCheckRow').filter({hasText:'Krångel'});assert.equal(await trouble.count(),1);await trouble.locator('input[type=checkbox]').check();
   await page.waitForFunction(()=>document.getElementById('pwDoorTimeDone').textContent==='1 h 40 min');
   state=await bridgeState(page);assert.equal(state.doors.D1.doneMinutes,100);assert.equal(state.report.done,120,'completed extra work contributes to both the door and project totals');
   await page.locator('#pwProtocolClose').click();await page.locator('#pwTimeReport').click();await page.waitForSelector('#pwTimeDialog[open]');assert.equal(await page.locator('#pwTimeDone').innerText(),'2 h');
   assert.deepEqual(errors,[]);console.log('PASS TEST 9.24: per-door material quantities, compact work sections, extra time, grouped product totals, editable standards and project totals stay synchronized');
  }finally{await context.close();}

  const edgeContext=await browser.newContext({viewport:{width:1366,height:900}}),edgePage=await edgeContext.newPage(),edgeErrors=[];
  edgePage.on('pageerror',error=>edgeErrors.push(error.message));
  await edgeContext.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  try{
   await openPrepared(edgePage,await edgeFixture(),null);
   assert.deepEqual((await edgePage.evaluate(()=>SmartMatchAppBridge.getPositions().map(position=>position.id))).sort(),['EDGE','STALE'],'the prepared edge fixture restores both linked and stale physical positions');
   const state=await bridgeState(edgePage),report=state.report;
   assert.deepEqual(reportNumbers(report),{items:1,units:3,total:0,done:0,unknown:3},'a stale unlinked position contributes neither its own time nor its material to the project');
   assert.equal(report.progress,100,'completed unknown-only work reaches 100% without an invented time estimate');
   assert.deepEqual(report.doors.map(door=>door.id),['EDGE'],'only the linked physical door appears in per-door time totals');
   assert.deepEqual(doorNumbers(state.doors.EDGE),{items:1,units:3,total:0,done:0,left:0,unknown:3});
   await edgePage.locator('#pwTimeReport').click();await edgePage.waitForSelector('#pwTimeDialog[open]');
   assert.deepEqual(await edgePage.locator('.pwTimeSummary strong').allTextContents(),['0 min','0 min','0 min','100%','3']);
   assert.match(await edgePage.locator('#pwTimeRows [data-time-key="unknown"]').innerText(),/3 st.*3 utan tidsestimat/s);
   await edgePage.locator('#pwTimeDoorsTab').click();await edgePage.waitForFunction(()=>!document.getElementById('pwTimeDoorsPanel').hidden);
   assert.equal(await edgePage.locator('#pwTimeDoorRows .pwTimeDoorRow').count(),1,'the stale unlinked position is absent from the visible door report');
   assert.equal(await edgePage.locator('#pwTimeDoorRows .pwTimeDoorRow').getAttribute('data-position-id'),'EDGE');
   assert.deepEqual(edgeErrors,[]);
   console.log('PASS TEST 9.24 edge: unknown-only completed work reaches 100%; stale unlinked material/time is excluded from all report totals');
  }finally{await edgeContext.close();}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
