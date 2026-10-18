/* Avläsning TEST 9.25: project material names and per-unit times use a
 * formatting-safe material identity, preserve per-door precedence and survive
 * the project payload round-trip. Generated local PDF only; auth is stubbed. */
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
const codeRect={x:.08,y:.08,w:.80,h:.06},tableRect={x:.04,y:.16,w:.93,h:.64},bounds={x:.035,y:.075,w:.94,h:.73};

function item(key,label,value,quantity,index){
 const text=label+' · '+value;
 return {key,text,legacyText:text,label,value,quantity,section:'Övrig utrustning',sectionKey:'ovrig-utrustning',tableIndex:0,sourceRow:index+2,sourceIdentity:['gs',0,index+2,'ovrig-utrustning',label,value].join(':').toLocaleLowerCase('sv-SE'),responsibility:'GS'};
}
function baseProject(){
 const rows=[
  item('fitting-dash','Behör -','2,4',2,0),
  item('fitting-underscore','Behör_','2,4',3,1),
  item('fitting-space','Behör','2, 4',1,2),
  item('fitting-24','Behör','24',4,3),
  item('closer-bc','Dörrstängare','BC700',1,4),
  item('closer-dc','Dörrstängare','DC700',2,5),
  item('closer-ts','Dörrstängare','TS83',1,6)
 ];
 const cards={'card-gs25':{id:'card-gs25',page:2,code:'GS25',originalCardCode:'GS25',header:'Beslagskod: GS25',codeRect,tableRect,bounds,rawTable:rows.map(row=>row.text+' GS').join('\n'),work:rows.map(row=>row.text),workItems:rows,workState:'ready',workPolicy:'gs-install-v3',choices:['GS25'],method:'PDF-text',confidence:100}};
 const hit={page:1,code:'GS25',rect:[75,675,130,700],box:{x:75/595,y:(842-700)/842,w:55/595,h:25/842},positionId:'D1',selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000};
 const checks={D1:Object.fromEntries(rows.map(row=>[row.key,false]))};
 const readTestData={schema:1,phase:'full',sourceId:'generated:time-material-v925',rects:{code:codeRect,table:tableRect},pages:[2],cards,checks,matching:{version:2,hits:[hit],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Materialidentitet TEST 9.25'};
 return {schema:6,projectId:'project:time-material-v925',projectRevision:1,timeConfig:{
  minutes:{closer:30},
  materials:{
   'behor|2,4':{label:'Behör 2,4 projekt',minutes:15},
   'behor|24':{minutes:8},
   'dorrstangare|bc700':{label:'Dörrstängare BC700 projekt',minutes:35},
   'dorrstangare|dc700':{minutes:20}
  },custom:[],disabled:[]
 },instances:{D1:{checks:checks.D1,rowStages:{},progress:0,overrides:{'closer-bc':{minutes:50}},customItems:[]}},automationItems:[],readTestData};
}
async function fixture(payload=baseProject()){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const plan=document.addPage([595,842]);plan.drawText('GS25',{x:80,y:680,size:18,font:bold});
 const card=document.addPage([595,842]);card.drawText('Beslagskod: GS25',{x:60,y:750,size:20,font:bold});
 card.drawText('Komponent',{x:40,y:690,size:11,font:bold});card.drawText('Produkt',{x:190,y:690,size:11,font:bold});card.drawText('Mont av',{x:470,y:690,size:11,font:bold});
 Object.values(payload.readTestData.cards)[0].workItems.forEach((row,index)=>{const y=660-index*30;card.drawText(row.label,{x:40,y,size:11,font});card.drawText(row.value,{x:190,y,size:11,font});card.drawText('GS',{x:470,y,size:11,font});});
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}
async function makeContext(browser,viewport={width:1440,height:960}){
 const context=await browser.newContext({viewport,locale:'sv-SE'});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 return context;
}
async function openPrepared(page,bytes,name='time-material-v925.pdf'){
 await page.goto(url());
 await page.locator('#pwFile').setInputFiles({name,mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
}
function findProduct(report,key){
 for(const row of report.rows||[]){const product=(row.products||[]).find(entry=>entry.key===key);if(product)return {row,product};}
 return null;
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await makeContext(browser),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  let savedPayload;
  try{
   await openPrepared(page,await fixture());
   let report=await page.evaluate(()=>SmartMatchAppBridge.getTimeReport());

   const combined=findProduct(report,'behor|2,4'),plain24=findProduct(report,'behor|24');
   assert(combined,'dash/underscore/whitespace variants receive one stable material key');
   assert.deepEqual({label:combined.product.label,count:combined.product.count,minutes:combined.product.unitMinutes,total:combined.product.totalMinutes},{label:'Behör 2,4 projekt',count:6,minutes:15,total:90});
   assert(plain24,'the punctuation-bearing 2,4 identity does not swallow plain 24');
   assert.deepEqual({count:plain24.product.count,minutes:plain24.product.unitMinutes,total:plain24.product.totalMinutes},{count:4,minutes:8,total:32});
   assert.notEqual(combined.product.key,plain24.product.key,'2,4 and 24 stay separate identities');

   const bc=findProduct(report,'dorrstangare|bc700'),dc=findProduct(report,'dorrstangare|dc700'),ts=findProduct(report,'dorrstangare|ts83');
   assert(bc&&dc&&ts,'BC700, DC700 and the category fallback remain separate exact products');
   assert.notEqual(bc.product.key,dc.product.key,'BC700 and DC700 never merge');
   assert.deepEqual({minutes:bc.product.unitMinutes,total:bc.product.totalMinutes,individual:bc.product.individualCount},{minutes:50,total:50,individual:1},'the physical-door item time wins over project material and category time');
   assert.deepEqual({minutes:dc.product.unitMinutes,total:dc.product.totalMinutes},{minutes:20,total:40},'project material time wins over the 30-minute category time');
   assert.deepEqual({minutes:ts.product.unitMinutes,total:ts.product.totalMinutes},{minutes:30,total:30},'the category remains the fallback when no material or door override exists');
   assert.deepEqual({items:report.itemCount,units:report.unitCount,total:report.total,unknown:report.unknown},{items:7,units:14,total:242,unknown:0},'quantity multiplies each exact per-unit time once');
   const door=await page.evaluate(()=>SmartMatchAppBridge.getPositionTimeSummary('D1'));
   assert.deepEqual({units:door.materialCount,total:door.totalMinutes,left:door.remainingMinutes},{units:14,total:242,left:242},'the same material totals reach the physical-door summary');

   await page.locator('#pwTimeReport').click();await page.waitForSelector('#pwTimeDialog[open]');
   const desktop=await page.evaluate(()=>({dialog:document.getElementById('pwTimeDialog').getBoundingClientRect().width,viewport:innerWidth,grid:getComputedStyle(document.querySelector('.pwMaterialTableRow')).gridTemplateColumns}));
   assert(desktop.dialog>900&&desktop.dialog<desktop.viewport,'the desktop project overview is wide without leaving the viewport');
   assert.equal(desktop.grid.trim().split(/\s+/).length,5,'desktop material rows expose five aligned columns');
   assert.deepEqual(await page.locator('.pwMaterialTableHeader').first().locator('span').allTextContents(),['Material','Antal','Tid/st','Total',''],'material table header is rendered');

   const combinedLine=page.locator('.pwMaterialTableRow[data-material-key="behor|2,4"]');
   assert.equal(await combinedLine.count(),1,'normalized variants render as one editable row');
   assert.equal((await combinedLine.locator('.pwMaterialCellQuantity').innerText()).replace(/\s+/g,' ').trim(),'Antal 6 st');
   assert.equal(await combinedLine.locator('.pwMaterialCellUnitTime input').inputValue(),'0,15');
   assert.match((await combinedLine.locator('.pwMaterialCellTotal').innerText()).replace(/\s+/g,' '),/1 h 30 min/);
   const labelInput=combinedLine.locator('.pwMaterialCellName input');await labelInput.fill('Behör 2,4 samlad');await labelInput.dispatchEvent('change');
   await page.waitForFunction(()=>[...document.querySelectorAll('.pwMaterialCellName input')].some(input=>input.value==='Behör 2,4 samlad'));
   const editedLine=page.locator('.pwMaterialTableRow[data-material-key="behor|2,4"]');
   const unitInput=editedLine.locator('.pwMaterialCellUnitTime input');await unitInput.fill('0,12');await unitInput.dispatchEvent('change');
   await page.waitForFunction(()=>document.getElementById('pwTimeTotal').textContent==='3 h 44 min');

   report=await page.evaluate(()=>SmartMatchAppBridge.getTimeReport());
   const edited=findProduct(report,'behor|2,4');
   assert.deepEqual({label:edited.product.label,count:edited.product.count,minutes:edited.product.unitMinutes,total:edited.product.totalMinutes},{label:'Behör 2,4 samlad',count:6,minutes:12,total:72},'editing one normalized row updates all six units and its total');
   assert.equal(report.total,224,'project total is recalculated after per-material time changes');

   savedPayload=await page.evaluate(()=>SmartMatchAppBridge.save());
   assert.deepEqual(savedPayload.timeConfig.materials['behor|2,4'],{label:'Behör 2,4 samlad',minutes:12},'material label and minutes are present in the portable project payload');
   assert.equal(savedPayload.instances.D1.overrides['closer-bc'].minutes,50,'the payload keeps the higher-precedence physical-door time');
   assert.deepEqual(errors,[],'material editing produces no page errors');
  }finally{await context.close();}

  const reopenedContext=await makeContext(browser),reopened=await reopenedContext.newPage(),reopenedErrors=[];reopened.on('pageerror',error=>reopenedErrors.push(error.message));
  try{
   await openPrepared(reopened,await fixture(savedPayload),'time-material-v925-reopened.pdf');
   const report=await reopened.evaluate(()=>SmartMatchAppBridge.getTimeReport()),combined=findProduct(report,'behor|2,4'),bc=findProduct(report,'dorrstangare|bc700');
   assert.deepEqual({label:combined.product.label,count:combined.product.count,minutes:combined.product.unitMinutes,total:combined.product.totalMinutes},{label:'Behör 2,4 samlad',count:6,minutes:12,total:72},'the embedded project payload restores the edited material row');
   assert.equal(bc.product.unitMinutes,50,'the restored per-door override still wins over restored material settings');
   assert.equal(report.total,224,'the restored project produces the same total without re-entering times');
   assert.deepEqual(reopenedErrors,[]);
   console.log('PASS TEST 9.25: material identity, safe punctuation, per-door/material/category precedence, quantities, editable columns and payload persistence');
  }finally{await reopenedContext.close();}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
