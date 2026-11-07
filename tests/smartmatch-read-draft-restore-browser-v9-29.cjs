/* Avläsning TEST 9.29: a newer local draft must replace the older state
 * embedded in the opened project PDF. In particular, recalc must not restore
 * an old checked base row, and project-specific material settings must follow
 * the recovered draft. The same scenario also covers the legend/bulk guard
 * and punctuation-only custom time search terms. Generated local PDF only. */
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
 ?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');

const root=path.resolve(__dirname,'..'),clone=value=>JSON.parse(JSON.stringify(value));
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end()}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-29.html`;

function projectPayload(checked,label,minutes,revision){
 const codeRect={x:.08,y:.07,w:.80,h:.07},tableRect={x:.06,y:.17,w:.88,h:.35};
 const work={key:'base-dc700',text:'Dörrstängare · DC700',legacyText:'Dörrstängare · DC700',label:'Dörrstängare',value:'DC700',quantity:1,section:'Övrig utrustning',sectionKey:'ovrig-utrustning',tableIndex:0,sourceRow:2,sourceIdentity:'gs:0:2:ovrig-utrustning:dörrstängare:dc700',responsibility:'GS'};
 const card={id:'card-gs69',page:2,code:'GS69',originalCardCode:'GS69',header:'Beslagskod: GS69',codeRect,tableRect,bounds:{x:.05,y:.06,w:.90,h:.48},rawTable:'Dörrstängare DC700 GS',work:[work.text],workItems:[work],workState:'ready',workPolicy:'gs-install-v3',choices:['GS69'],method:'PDF-text',confidence:100};
 const hit={page:1,code:'GS69',rect:[70,675,135,704],box:{x:70/595,y:(842-704)/842,w:65/595,h:29/842},positionId:'door-69',selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000};
 const checks={'door-69':{'base-dc700':checked}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:draft-restore-v925',rects:{code:codeRect,table:tableRect},pages:[2],cards:{'card-gs69':card},checks,groupMappings:{},renamedGroupCodes:[],matching:{version:2,hits:[hit],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Draft restore TEST 9.29'};
 return {schema:6,projectId:'project:draft-restore-v925',projectRevision:revision,timeConfig:{minutes:{closer:30},materials:{'dorrstangare|dc700':{label,minutes}},custom:[],disabled:[]},instances:{'door-69':{checks:checks['door-69'],rowStages:{},progress:checked?100:0,overrides:{},customItems:[],attentionItems:[]}},automationItems:[],readTestData};
}

async function fixture(payload){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const drawing=document.addPage([595,842]);drawing.drawText('GS69',{x:74,y:680,size:18,font:bold});
 const card=document.addPage([595,842]);card.drawText('Beslagskod: GS69',{x:55,y:760,size:18,font:bold});card.drawText('Dörrstängare',{x:55,y:670,size:13,font});card.drawText('DC700',{x:235,y:670,size:13,font});card.drawText('GS',{x:485,y:670,size:13,font:bold});
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}

function material(report,key){
 for(const row of report.rows||[])for(const product of row.products||[])if(product.key===key)return {row,product};
 return null;
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  try{
   const embedded=projectPayload(true,'PDF: gammal DC700',30,4),draft=projectPayload(false,'Draft: återställd DC700',12,5);
   await page.goto(url());
   await page.evaluate(payload=>{
    window.__draftOfferCalls=0;window.__draftOfferStarted=false;window.__draftPayload=payload;
    window.__draftGate=new Promise(resolve=>{window.__releaseDraft=()=>resolve(structuredClone(window.__draftPayload))});
    SmartMatchSession.queueDraft=()=>{};
    SmartMatchSession.offerDraftRestore=async()=>{window.__draftOfferCalls++;window.__draftOfferStarted=true;return window.__draftGate};
   },draft);
   await page.locator('#pwFile').setInputFiles({name:'draft-restore-v925.pdf',mimeType:'application/pdf',buffer:await fixture(embedded)});
   await page.waitForFunction(()=>window.__draftOfferStarted&&SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});

   let state=await page.evaluate(async()=>({
    calls:window.__draftOfferCalls,
    position:structuredClone(SmartMatchAppBridge.getPositions()[0]),
    read:structuredClone(SmartMatchReadTest.payload()),
    report:await SmartMatchAppBridge.getTimeReport()
   }));
   assert.equal(state.calls,1,'the real deferred draft-recovery hook is offered once');
   assert.equal(state.position.checks['base-dc700'],true,'before releasing the draft, the older PDF instance is visibly checked');
   assert.equal(state.read.checks['door-69']['base-dc700'],true,'before recovery, the reader still contains the older PDF check');
   let product=material(state.report,'dorrstangare|dc700');
   assert.deepEqual({label:product.product.label,minutes:product.product.unitMinutes,total:product.product.totalMinutes},{label:'PDF: gammal DC700',minutes:30,total:30},'before recovery, the embedded PDF material configuration is active');

   await page.evaluate(()=>window.__releaseDraft());
   await page.waitForFunction(async()=>{
    const position=SmartMatchAppBridge.getPositions()[0],read=SmartMatchReadTest.payload(),report=await SmartMatchAppBridge.getTimeReport();
    const product=(report.rows||[]).flatMap(row=>row.products||[]).find(item=>item.key==='dorrstangare|dc700');
    return position?.checks?.['base-dc700']===false&&read?.checks?.['door-69']?.['base-dc700']===false&&product?.label==='Draft: återställd DC700'&&product?.unitMinutes===12;
   },null,{timeout:30000});

   state=await page.evaluate(async()=>({position:structuredClone(SmartMatchAppBridge.getPositions()[0]),read:structuredClone(SmartMatchReadTest.payload()),report:await SmartMatchAppBridge.getTimeReport(),payload:SmartMatchAppBridge.save()}));
   assert.equal(state.position.checks['base-dc700'],false,'recalc does not resurrect the embedded PDF check after draft recovery');
   assert.equal(state.read.checks['door-69']['base-dc700'],false,'the recovered unchecked value is authoritative in readTestData');
   product=material(state.report,'dorrstangare|dc700');
   assert.deepEqual({label:product.product.label,minutes:product.product.unitMinutes,total:product.product.totalMinutes},{label:'Draft: återställd DC700',minutes:12,total:12},'the recovered project material name and per-piece time drive the report');
   assert.deepEqual(state.payload.timeConfig.materials['dorrstangare|dc700'],{label:'Draft: återställd DC700',minutes:12},'the next portable payload retains the recovered material configuration');
   assert.equal(state.payload.instances['door-69'].checks['base-dc700'],false,'the next portable payload retains the recovered unchecked base row');

   await page.evaluate(()=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions()[0]));
   await page.waitForSelector('#pwProtocol[open]');
   assert.equal(await page.locator('#pwChecklist .pwCheckRow input[type="checkbox"]').isChecked(),false,'the rebuilt protocol map opens the recovered card with its base point unchecked');
   await page.locator('#pwProtocolClose').click();await page.waitForFunction(()=>!document.getElementById('pwProtocol').open);

   // The legend is a drawing tool. Selecting it while bulk selection is active
   // must leave bulk mode before the stage receives the placement gesture.
   await page.locator('#pwBulkSelect').click();await page.locator('#pwBulkPage').click();
   assert.equal(await page.locator('#pwBulkSelect').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#pwBulkCount').innerText(),'1 valda');
   await page.locator('#pwToolMenuButton').click();await page.locator('#pwToolLegend').click();
   assert.equal(await page.locator('#pwBulkSelect').getAttribute('aria-pressed'),'false','choosing the legend exits bulk selection');
   await page.locator('#pwStage').click({position:{x:180,y:150}});
   await page.waitForFunction(()=>SmartMatchAppBridge.save().drawingNotes.some(note=>note.name==='SmartMatch färgförklaring'));
   assert.equal((await page.evaluate(()=>SmartMatchAppBridge.save().drawingNotes.filter(note=>note.name==='SmartMatch färgförklaring').length)),1,'one stage tap places one movable legend');

   // A search term containing only ignored punctuation normalizes to an empty
   // needle. It must not classify every material into the custom time type.
   await page.locator('#pwTimeReport').click();await page.waitForSelector('#pwTimeDialog[open]');
   await page.locator('#pwTimeAddType').click();await page.waitForSelector('#pwTimeTypeEditor[open]');
   await page.locator('#pwTimeTypeName').fill('Skiljetecken');await page.locator('#pwTimeTypeMinutes').fill('0,05');await page.locator('#pwTimeTypeTerms').fill('-');await page.locator('#pwTimeTypeSave').click();
   await page.waitForFunction(()=>!document.getElementById('pwTimeTypeEditor').open);
   const afterEmptyTerm=await page.evaluate(()=>SmartMatchAppBridge.getTimeReport());
   assert.equal(afterEmptyTerm.rows.some(row=>row.def?.custom),false,'a punctuation-only custom keyword does not match the DC700 work item');
   product=material(afterEmptyTerm,'dorrstangare|dc700');
   assert(product&&product.row.def.key==='closer','the item remains in its real Dörrstängare category');
   assert.equal(product.product.unitMinutes,12,'the recovered material time remains authoritative after adding the empty-normalized keyword');

   assert.deepEqual(errors,[]);
   console.log('PASS TEST 9.29: draft recovery keeps unchecked read state and material settings; legend exits bulk mode; empty-normalized time terms do not match');
  }finally{await context.close()}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
