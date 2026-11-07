/* Avläsning TEST 9.25: a prepared TEST 9.23 project repairs products which
 * were present in saved table words but omitted by the v2 GS row parser. */
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
const word=(text,x,y,w=text.length*5,h=10)=>({text,x,y,w,h,confidence:100});

async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const drawing=document.addPage([595,842]),cardPage=document.addPage([595,842]);
 drawing.drawText('GS87',{x:80,y:680,size:18,font:bold});
 cardPage.drawText('Beslagskod: GS87',{x:55,y:760,size:18,font:bold});
 cardPage.drawText('Trycke 6696 GS',{x:55,y:660,size:13,font});
 cardPage.drawText('Dorrstangare DC700 GS',{x:55,y:620,size:13,font});
 cardPage.drawText('Magnetkontakt MK240 GS',{x:55,y:580,size:13,font});

 const tableWords=[
  word('Komponent',5,10,60),word('Övrigt',170,10,40),word('Lev av',400,10,35),word('Mont av',450,10,45),word('Ansl av',510,10,35),
  word('Daglåsning',5,30,80),word('4 Trycke',5,50,55),word('6696',170,50,28),word('GS',453,50,15),
  word('Övrig utrustning',5,70,100),word('31 Dörrstängare',5,90,105),word('DC700',170,90,35),word('GS',453,87,15,5),
  word('Larm/Passer',5,110,80),word('35 Magnetkontakt',5,130,105),word('MK240',170,130,35),word('GS',453,127,15,5)
 ];
 const rawTable=[
  'Övrigt  Lev av  Mont av  Ansl av','Daglåsning','4 Trycke  6696  GS  GS',
  'Övrig utrustning','31 Dörrstängare  DC700  GS  GS','Larm/Passer','35 Magnetkontakt  MK240  GS  GS'
 ].join('\n');
 const positionId='door-gs87',cardId='card-gs87',oldKey='existing-6696';
 const oldItem={key:oldKey,text:'6696',legacyText:'Trycke · 6696',label:'Trycke',value:'6696',section:'Daglåsning',sectionKey:'daglasning',tableIndex:0,sourceRow:2,sourceIdentity:'gs:0:2:daglasning:trycke:6696',responsibility:'GS'};
 const codeRect={x:.07,y:.07,w:.82,h:.07},tableRect={x:.05,y:.16,w:.84,h:.35},rect=[75,675,135,703];
 const hit={page:1,code:'GS87',rect,box:{x:rect[0]/595,y:(842-rect[3])/842,w:(rect[2]-rect[0])/595,h:(rect[3]-rect[1])/842},positionId,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000,label:'GS87',sourceCardId:cardId,cardPage:2,originalCardCode:'GS87'};
 const readTestData={schema:2,phase:'full',sourceId:'saved-test-9.23-owner-baseline',rects:{code:codeRect,table:tableRect},pages:[2],cards:{
  [cardId]:{id:cardId,page:2,code:'GS87',originalCardCode:'GS87',header:'Beslagskod: GS87',codeRect,tableRect,bounds:{x:.04,y:.06,w:.88,h:.50},rawTable,tableWords,
   work:['6696'],workItems:[oldItem],workWarnings:['TEST 9.23 sparade inte två GS-rader.'],workPolicy:'gs-install-v2',workState:'ready',choices:['GS87'],method:'PDF-text',confidence:100}
 },checks:{[positionId]:{[oldKey]:true}},matching:{version:2,hits:[hit],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Sparat TEST 9.23 med parser v2'};
 const payload={schema:6,projectId:'project:saved-v923-owner-baseline',projectRevision:4,instances:{
  [positionId]:{checks:{[oldKey]:true},rowStages:{[oldKey]:'done'},progress:100,overrides:{[oldKey]:{minutes:17}},customItems:[{id:'saved-note',label:'Befintlig punkt',value:'Behåll mig',minutes:5}]}
 },automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return {bytes:Buffer.from(await document.save()),positionId,cardId,oldKey,rect};
}

async function contextFor(browser){
 const context=await browser.newContext({viewport:{width:1366,height:900}});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.__migrationCalls={work:[],matcher:0,workers:0,guides:0};
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:next=>{work={...next,read:options=>{__migrationCalls.work.push({text:String(options?.text||''),words:options?.words?.length||0});return next.read(options);}};}});
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:next=>{matcher={...next,scan:()=>{__migrationCalls.matcher++;throw Error('Saved v9.23 migration must not scan the drawing');}};}});
  let tesseract;Object.defineProperty(window,'Tesseract',{configurable:true,get:()=>tesseract,set:next=>{tesseract={...next,createWorker:async()=>{__migrationCalls.workers++;throw Error('Saved v9.23 migration must not start OCR');}};}});
  const show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')__migrationCalls.guides++;return show.call(this);};
 });
 return context;
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await contextFor(browser),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   const input=await fixture();await page.goto(url());
   await page.locator('#pwFile').setInputFiles({name:'saved-test-9.23-owner-baseline.pdf',mimeType:'application/pdf',buffer:input.bytes});
   await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});

   const calls=await page.evaluate(()=>structuredClone(__migrationCalls));
   assert.equal(calls.work.length,1,'the saved table words are reparsed once during migration');
   assert.match(calls.work[0].text,/DC700/);assert.match(calls.work[0].text,/MK240/);assert.equal(calls.work[0].words,17);
   assert.deepEqual({matcher:calls.matcher,workers:calls.workers,guides:calls.guides},{matcher:0,workers:0,guides:0},'opening performs no drawing scan, OCR or preparation flow');

   const migrated=await page.evaluate(({positionId})=>{
    const read=SmartMatchReadTest.payload(),position=SmartMatchAppBridge.getPositions().find(item=>item.id===positionId);
    return {read,position:{id:position.id,code:position.code,page:position.page,rect:position.rect,checks:position.checks,rowStages:position.rowStages,overrides:position.overrides,customItems:position.customItems},mapping:SmartMatchAppBridge.getDoorCardMapping()};
   },{positionId:input.positionId});
   const card=migrated.read.cards[input.cardId];
   assert.equal(card.workPolicy,'gs-install-v3','the upgraded payload records the parser revision');
   assert.deepEqual(card.work,['6696','DC700','MK240']);
   assert.deepEqual(card.workItems.map(item=>item.label),['Trycke','Dörrstängare','Magnetkontakt']);
   assert.deepEqual(card.workItems.map(item=>item.section),['Daglåsning','Övrig utrustning','Larm/Passer']);
   assert.equal(card.workItems[0].key,input.oldKey,'the existing row keeps its stable key');
   assert.equal(new Set(card.workItems.map(item=>item.key)).size,3,'newly recovered rows receive separate stable keys');
   assert.equal(migrated.mapping.GS87,2,'the reviewed door-to-card link is unchanged');
   assert.deepEqual({id:migrated.position.id,code:migrated.position.code,page:migrated.position.page,rect:migrated.position.rect},{id:input.positionId,code:'GS87',page:1,rect:input.rect});
   assert.equal(migrated.position.checks[input.oldKey],true,'the existing completion remains checked');
   assert.equal(migrated.position.rowStages[input.oldKey],'done');
   assert.equal(migrated.position.overrides[input.oldKey].minutes,17,'the existing own time is preserved');
   assert.deepEqual(migrated.position.customItems,[{id:'saved-note',label:'Befintlig punkt',value:'Behåll mig',minutes:5}]);

   await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),input.positionId);
   await page.waitForSelector('#pwProtocol[open]');
   const automatic=page.locator('#pwChecklist .pwCheckRow').filter({has:page.locator('.pwCheckContent small')});
   assert.equal(await automatic.count(),4,'three migrated products and the saved custom point are visible');
   const existing=page.locator('#pwChecklist .pwCheckRow').filter({hasText:'6696'});assert.equal(await existing.count(),1);assert.equal(await existing.locator('input[type=checkbox]').isChecked(),true);assert.match(await existing.locator('.pwCheckTime').innerText(),/17 min.*egen/);
   for(const product of ['DC700','MK240']){
    const row=page.locator('#pwChecklist .pwCheckRow').filter({hasText:product});assert.equal(await row.count(),1,product+' is restored to the checklist');assert.equal(await row.locator('input[type=checkbox]').isChecked(),false,product+' starts unchecked');
   }
   assert.deepEqual(await page.evaluate(()=>__migrationCalls),calls,'opening the checklist does not start any later scan');
   assert.deepEqual(errors,[]);console.log('PASS TEST 9.25: saved v9.23 parser-v2 table words restore DC700/MK240 without OCR or matching while preserving link, check, time and custom work');
  }finally{await context.close();}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
