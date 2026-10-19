/* Avläsning TEST 9.33: a linked door can reread only its own source card.
 * Generated searchable PDF only; auth is stubbed inside this browser test. */
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-33.html`;
const codeRect={x:.08,y:.08,w:.80,h:.06},tableRect={x:.04,y:.16,w:.93,h:.64},bounds={x:.035,y:.075,w:.94,h:.73};

async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const plan=document.addPage([595,842]);
 plan.drawText('GS1',{x:80,y:680,size:18,font});plan.drawText('GS2',{x:360,y:430,size:18,font});
 function doorCard(code,rows){
  const card=document.addPage([595,842]);
  card.drawText('Beslagskod: '+code,{x:60,y:750,size:20,font:bold});
  const text=(value,x,y,isBold=false)=>card.drawText(value,{x,y,size:11,font:isBold?bold:font});
  text('Komponent',40,690,true);text('Övrigt',185,690,true);text('Lev av',355,690,true);text('Mont av',470,690,true);
  text('DAGLASNING',40,664,true);
  for(const [index,[label,product]]of rows.entries()){
   const y=634-index*30;text(label,40,y);text(product,185,y);text('DT',355,y);text('GS',470,y);
  }
 }
 doorCard('GS1',[['Trycke','6696'],['Trycke Reserv','6696'],['Las A','EL560-1'],['Las B','EL5601'],['Dorrstangare','BC700']]);
 doorCard('GS2',[['Slutbleck','ST400']]);
 const cards={
  'card-gs1':{id:'card-gs1',page:2,code:'GS1',originalCardCode:'GS1',header:'Beslagskod: GS1',codeRect,tableRect,bounds,rawTable:'Trycke 6696\nLas A EL560-1',work:['6696','EL560-1'],workItems:[{key:'gs1-old',text:'6696',legacyText:'Trycke · 6696',label:'Trycke',value:'6696',section:'Daglåsning',sectionKey:'daglasning',tableIndex:0,sourceRow:2,sourceIdentity:'gs:0:2:daglasning:trycke:6696',responsibility:'GS'},{key:'gs1-lock',text:'EL560-1',legacyText:'Las A · EL560-1',label:'Las A',value:'EL560-1',section:'Daglåsning',sectionKey:'daglasning',tableIndex:0,sourceRow:3,sourceIdentity:'gs:0:3:daglasning:las-a:el560-1',responsibility:'GS'}],workState:'ready',workPolicy:'gs-install-v2',choices:['GS1'],method:'PDF-text',confidence:100},
  'card-gs2':{id:'card-gs2',page:3,code:'GS2',originalCardCode:'GS2',header:'Beslagskod: GS2',codeRect,tableRect,bounds,rawTable:'Slutbleck ST400',work:['ST400'],workItems:[{key:'gs2-old',text:'ST400',legacyText:'Slutbleck · ST400',label:'Slutbleck',value:'ST400',section:'Daglåsning',sectionKey:'daglasning',tableIndex:0,sourceRow:2,sourceIdentity:'gs:0:2:daglasning:slutbleck:st400',responsibility:'GS'}],workState:'ready',workPolicy:'gs-install-v2',choices:['GS2'],method:'PDF-text',confidence:100}
 };
 cards['card-gs1-alias']={...clone(cards['card-gs1']),id:'card-gs1-alias',code:'GS1ALT',originalCardCode:'GS1',sourceCardId:'card-gs1',drawingLabel:'GS1ALT',workReadError:true,cardReadError:'Gammalt läsfel',readErrorKind:'work',unread:true};
 const hits=[
  {page:1,code:'GS1',rect:[75,675,125,700],box:{x:75/595,y:(842-700)/842,w:50/595,h:25/842},positionId:'door-gs1',selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000},
  {page:1,code:'GS2',rect:[355,425,405,450],box:{x:355/595,y:(842-450)/842,w:50/595,h:25/842},positionId:'door-gs2',selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870001}
 ];
 const checks={'door-gs1':{'gs1-old':true,'gs1-lock':false},'door-gs2':{'gs2-old':false}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:single-card-v925',rects:{code:codeRect,table:tableRect},pages:[2,3],cards,checks,matching:{version:2,hits,pages:[{page:1,count:2,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Single card reread TEST 9.33'};
 const payload={schema:6,projectId:'project:single-card-v925',projectRevision:1,instances:{
  'door-gs1':{checks:{'gs1-old':true,'gs1-lock':false},rowStages:{'gs1-old':'done'},progress:33,overrides:{'gs1-old':{minutes:17}},customItems:[{id:'own-point',label:'Egen kontroll',value:'Kommentar',note:'Behåll mig',minutes:5}]},
  'door-gs2':{checks:{'gs2-old':false},rowStages:{},progress:0,overrides:{},customItems:[]}
 },automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}

async function contextFor(browser){
 const context=await browser.newContext({viewport:{width:1366,height:900}});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.__rereadCalls={workTexts:[],matcher:0,workers:0};
  window.Tesseract={async createWorker(){__rereadCalls.workers++;throw Error('Searchable single-card reread must not start OCR');}};
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:next=>{matcher={...next,scan:async options=>{__rereadCalls.matcher++;return next.scan(options);}};}});
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:next=>{work={...next,read:options=>{__rereadCalls.workTexts.push(String(options?.text||''));return next.read(options);}};}});
 });
 return context;
}
async function openPrepared(page,bytes){
 await page.goto(url());
 await page.locator('#pwFile').setInputFiles({name:'single-card-reread-v925.pdf',mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===2&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
}
async function openPosition(page,id){
 await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);
 await page.waitForSelector('#pwProtocol[open]');
 await page.waitForFunction(()=>!!document.getElementById('pwProtocolCanvas')?.dataset.readCardId);
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await contextFor(browser),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await openPrepared(page,await fixture());await openPosition(page,'door-gs1');
   const reread=page.locator('#pwRereadCard');assert(await reread.isVisible(),'a ready linked door exposes its direct single-card reread action');
   assert.equal((await reread.textContent()).trim(),'↻ Läs om detta kort');
   assert(await page.locator('#pwAddChecklistItem').isVisible(),'ordinary + Punkt action stays available for a read-test card');
   assert.equal((await page.locator('#pwAddChecklistItem').textContent()).trim(),'＋ Punkt');
   const original=page.locator('#pwChecklist .pwCheckRow').filter({hasText:'6696'});assert.equal(await original.count(),1);
   assert(await original.getByRole('button',{name:'Ändra'}).isVisible());assert(await original.getByRole('button',{name:'Ta bort'}).isVisible());
   assert(await original.locator('.pwCheckTime').isVisible(),'the ordinary per-item time control is visible on a read-test card');
   assert.match(await original.locator('.pwCheckTime').innerText(),/17 min.*egen/,'the ordinary per-item time control shows the saved own time');
   assert.equal(await original.locator('input[type=checkbox]').isChecked(),true,'the previously completed product starts checked');
   const own=page.locator('#pwChecklist .pwCheckRow').filter({hasText:'Egen kontroll'});assert.equal(await own.count(),1,'custom points from ordinary SmartMatch remain visible');
   assert.match(await own.locator('.pwCheckTime').innerText(),/5 min.*egen/);
   const before=await page.evaluate(()=>({read:structuredClone(SmartMatchReadTest.payload()),positions:structuredClone(SmartMatchAppBridge.getPositions()),calls:structuredClone(__rereadCalls)}));
   await page.evaluate(()=>{__rereadCalls.workTexts=[];__rereadCalls.matcher=0;__rereadCalls.workers=0;});

   await reread.click();await page.waitForSelector('#rtDialog[open]');
   await page.waitForFunction(()=>!document.getElementById('rtStart').disabled,null,{timeout:30000});
   assert.match(await page.locator('#rtTitle').innerText(),/Läs om detta dörrkort/);
   const layout=await page.evaluate(()=>{const doc=document.querySelector('.rtDocument').getBoundingClientRect(),rail=document.querySelector('.rtReview').getBoundingClientRect(),view=document.getElementById('rtViewport').getBoundingClientRect();return {right:doc.right,left:rail.left,viewHeight:view.height,height:innerHeight,controls:['rtGuide','rtTable','rtPreview','rtResults','rtStart','rtPage'].every(id=>document.querySelector('.rtReview').contains(document.getElementById(id))),originalChildren:document.querySelector('.rtDocument').contains(document.getElementById('rtResults'))};});
   assert(layout.right<=layout.left,'original is left of the action rail');assert(layout.controls,'all workflow controls are on the right');assert(!layout.originalChildren,'results never shrink the document pane');assert(layout.viewHeight>layout.height*.65,'original retains a tall viewport after reading');
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.screenshot({path:'/tmp/smartmatch-9-33-reread-desktop.png',fullPage:true});

   assert.equal(await page.locator('#rtResults .rtResult').count(),1,'focused reread reviews one source card only');
   assert.equal(await page.locator('#rtResults .rtResult').getAttribute('data-card-id'),'card-gs1');
   for(const id of ['rtPage','rtPrev','rtNext','rtPages','rtTemplate','rtAreaScope','rtAreaCard','rtAreaCommon','rtSaveTemplate'])assert.equal(await page.locator('#'+id).isDisabled(),true,id+' stays locked to the opened card');
   await page.evaluate(()=>{const input=document.getElementById('rtPage');input.disabled=false;input.value='3';input.dispatchEvent(new Event('change'));});
   await page.waitForTimeout(50);assert.equal(await page.locator('#rtPage').inputValue(),'2','programmatic page navigation is guarded as well');
   await page.locator('.rtAdvanced').first().evaluate(el=>el.open=true);
   await page.locator('#rtWorkPolicy').selectOption('all');assert.equal(await page.locator('#rtResults .rtResult').count(),1,'policy changes remain scoped to one source card');
   await page.locator('#rtWorkPolicy').selectOption('gs');assert.equal(await page.locator('#rtResults .rtResult').count(),1);
   const rereadRows=page.getByLabel('Arbetsrader kort 1',{exact:true}),rereadValue=await rereadRows.inputValue();
   assert.match(rereadValue,/BC700/,'the missed product is found before the user accepts it');
   assert.equal(rereadValue.split('\n').filter(text=>text==='6696').length,1,'a second occurrence is presented as a genuinely new row while the old occurrence stays protected');
   await rereadRows.evaluate((area,value)=>{area.value=value;area.dispatchEvent(new Event('input',{bubbles:true}));},'BC700\nBC700\nEL5601');
   const calls=await page.evaluate(()=>structuredClone(__rereadCalls));
   assert.equal(calls.workTexts.length,3,'automatic read and both explicit policy refreshes retain the focused full inventory');
   assert(calls.workTexts.every(text=>/BC700/.test(text)));assert(!calls.workTexts.some(text=>text.includes('ST400')),'the other source card is never reread');
   assert.deepEqual({matcher:calls.matcher,workers:calls.workers},{matcher:0,workers:0},'single-card native-text reread performs no drawing search or OCR');

   await page.locator('#rtStart').click();await page.waitForFunction(()=>!document.getElementById('rtDialog').open,null,{timeout:30000});
   await page.waitForFunction(()=>document.querySelectorAll('#pwChecklist .pwCheckRow').length===6,null,{timeout:30000});
   const after=await page.evaluate(()=>({read:structuredClone(SmartMatchReadTest.payload()),positions:structuredClone(SmartMatchAppBridge.getPositions())}));
   assert.deepEqual(after.read.matching,before.read.matching,'rereading products never changes reviewed drawing links');
   assert.deepEqual(after.read.cards['card-gs2'],before.read.cards['card-gs2'],'the other door-card source remains byte-for-byte unchanged');
   assert.deepEqual(after.read.cards['card-gs1-alias'].work,after.read.cards['card-gs1'].work,'an alias receives the corrected source work');assert.equal(after.read.cards['card-gs1-alias'].workReadError,false,'the successful source reread clears a stale alias work error');for(const key of ['cardReadError','readErrorKind','unread'])assert.equal(after.read.cards['card-gs1-alias'][key],undefined,'stale alias '+key+' is cleared');
   assert.equal(after.read.cards['card-gs1'].work.length,5);assert.equal(after.read.cards['card-gs1'].work.filter(text=>text==='BC700').length,2,'two deliberately repeated edited rows remain separate');assert(after.read.cards['card-gs1'].work.includes('6696'),'the old row remains protected');assert(after.read.cards['card-gs1'].work.includes('EL560-1'));assert(after.read.cards['card-gs1'].work.includes('EL5601'),'punctuation-distinct product codes are not collapsed');
   const rereadKeys=await page.evaluate(()=>SmartMatchReadTest.protocolDef('GS1',2).lines.map(line=>line.key));assert.equal(new Set(rereadKeys).size,rereadKeys.length,'duplicate textarea rows receive separate checklist keys');
   assert.equal(after.read.checks['door-gs1']['gs1-old'],true,'the old completion is preserved in read data');
   const saved=after.positions.find(position=>position.id==='door-gs1');
   assert.equal(saved.checks['gs1-old'],true,'the open position keeps its old checked product');
   assert.equal(saved.overrides['gs1-old'].minutes,17,'its edited time survives the focused reread');
   assert.deepEqual(saved.customItems,before.positions.find(position=>position.id==='door-gs1').customItems,'custom points survive the focused reread');
   assert.equal(await original.first().locator('input[type=checkbox]').isChecked(),true);
   const added=page.locator('#pwChecklist .pwCheckRow').filter({hasText:'BC700'});assert.equal(await added.count(),2);assert.equal(await added.first().locator('input[type=checkbox]').isChecked(),false,'a newly found product starts unchecked');
   assert(await added.first().getByRole('button',{name:'Ändra'}).isVisible());assert(await added.first().getByRole('button',{name:'Ta bort'}).isVisible());assert(await added.first().locator('.pwCheckTime').isVisible());
   const beforeCancel=await page.evaluate(()=>structuredClone(SmartMatchReadTest.payload()));
   await reread.click();await page.waitForSelector('#rtDialog[open]');await page.evaluate(()=>document.getElementById('rtDialog').close());
   await page.waitForFunction(()=>!document.getElementById('rtDialog').open&&!document.getElementById('pwRereadCard').disabled,null,{timeout:30000});
   await reread.click();await page.waitForSelector('#rtDialog[open]');await page.locator('#rtCancel').click();
   await page.waitForFunction(()=>!document.getElementById('rtDialog').open&&!document.getElementById('pwRereadCard').disabled,null,{timeout:30000});
   assert.deepEqual(await page.evaluate(()=>SmartMatchReadTest.payload()),beforeCancel,'native close and explicit cancel both leave the saved card unchanged and allow a retry');
   assert.deepEqual(errors,[]);console.log('PASS TEST 9.33: linked-card reread scans one source only, adds a missed product, preserves links/checks/time/custom work, and exposes ordinary edit controls');
  }finally{await context.close();}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
