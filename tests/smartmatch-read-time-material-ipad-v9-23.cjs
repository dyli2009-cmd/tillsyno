/* Avläsning TEST 9.23: the material/time views remain usable without
 * horizontal overflow in desktop and iPad-sized Safari-like viewports. */
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-23.html`;
const codeRect={x:.08,y:.08,w:.80,h:.06},tableRect={x:.04,y:.16,w:.93,h:.64},bounds={x:.035,y:.075,w:.94,h:.73};
const safariIpadUA='Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const plan=document.addPage([595,842]);
 plan.drawText('GS1',{x:80,y:680,size:18,font:bold});
 const card=document.addPage([595,842]);
 card.drawText('Beslagskod: GS1',{x:60,y:750,size:20,font:bold});
 card.drawText('Trycke 6696  GS',{x:55,y:665,size:12,font});
 card.drawText('Dorrstangare BC700  GS',{x:55,y:630,size:12,font});
 card.drawText('Lashus EL560  GS',{x:55,y:595,size:12,font});
 const workItems=[
  {key:'trycke',text:'6696',legacyText:'Trycke · 6696',label:'Trycke',value:'6696',quantity:2,section:'Daglåsning',sectionKey:'daglasning',tableIndex:0,sourceRow:2,sourceIdentity:'gs:0:2:daglasning:trycke:6696',responsibility:'GS'},
  {key:'closer',text:'BC700',legacyText:'Dörrstängare · BC700',label:'Dörrstängare',value:'BC700',section:'Övrig utrustning',sectionKey:'ovrig-utrustning',tableIndex:0,sourceRow:3,sourceIdentity:'gs:0:3:ovrig-utrustning:dorrstangare:bc700',responsibility:'GS'},
  {key:'lockcase',text:'EL560',legacyText:'Låshus · EL560',label:'Låshus',value:'EL560',section:'Övrig utrustning',sectionKey:'ovrig-utrustning',tableIndex:0,sourceRow:4,sourceIdentity:'gs:0:4:ovrig-utrustning:lashus:el560',responsibility:'GS'}
 ];
 const cards={'card-gs1':{id:'card-gs1',page:2,code:'GS1',originalCardCode:'GS1',header:'Beslagskod: GS1',codeRect,tableRect,bounds,rawTable:'Trycke 6696 GS\nDörrstängare BC700 GS\nLåshus EL560 GS',work:['6696','BC700','EL560'],workItems,workState:'ready',workPolicy:'gs-install-v2',choices:['GS1'],method:'PDF-text',confidence:100}};
 const hits=[{page:1,code:'GS1',rect:[75,675,125,700],box:{x:75/595,y:(842-700)/842,w:50/595,h:25/842},positionId:'door-gs1',selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000}];
 const checks={'door-gs1':{trycke:true,closer:false,lockcase:false,'extra-work':false}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:time-material-ipad-v923',rects:{code:codeRect,table:tableRect},pages:[2],cards,checks,matching:{version:2,hits,pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Time material iPad TEST 9.23'};
 const payload={schema:6,projectId:'project:time-material-ipad-v923',projectRevision:1,timeConfig:{minutes:{wc:10,cylinder:20,strike:10,handle:10,lockcase:20,closer:30,automation:480,elbow:30,magnet:30,escape179:null},custom:[],disabled:[]},instances:{
  'door-gs1':{checks:{trycke:true,closer:false,lockcase:false,'extra-work':false},rowStages:{trycke:'done'},progress:0,overrides:{},customItems:[{id:'extra-work',label:'Krångel / extra arbete',value:'Justering på plats',note:'Egen tid för den här dörren',quantity:1,minutes:25}]}
 },automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}

function fitsHorizontally(box){return box.scrollWidth<=box.clientWidth+1;}
async function overflowState(page,selectors){
 return page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{
  const node=document.querySelector(selector);
  return [selector,node?{clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right}:null];
 })),selectors);
}
function assertNoOverflow(state,label){
 for(const [selector,box] of Object.entries(state)){
  assert(box,label+': '+selector+' exists');
  assert(fitsHorizontally(box),label+': '+selector+' must not scroll sideways ('+box.scrollWidth+' > '+box.clientWidth+')');
  assert(box.left>=-1,label+': '+selector+' stays inside the left viewport edge');
 }
}

async function contextFor(browser,viewport){
 const context=await browser.newContext({viewport,userAgent:safariIpadUA,hasTouch:true,deviceScaleFactor:1,isMobile:false,locale:'sv-SE'});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 return context;
}
async function openPrepared(page,bytes){
 await page.goto(url());
 await page.locator('#pwFile').setInputFiles({name:'time-material-ipad-v923.pdf',mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
}
async function openDoor(page){
 await page.evaluate(async()=>{const position=SmartMatchAppBridge.getPositions()[0];await SmartMatchAppBridge.openPosition(position);});
 await page.waitForSelector('#pwProtocol[open]');
 await page.waitForFunction(()=>!document.getElementById('pwDoorTimeSummary').hidden&&document.querySelectorAll('#pwChecklist .rtWorkSection[open]').length===3,null,{timeout:30000});
}

async function verifyViewport(browser,bytes,viewport){
 const label=viewport.width+'x'+viewport.height,context=await contextFor(browser,viewport),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await openPrepared(page,bytes);
  assert.equal(await page.evaluate(()=>navigator.userAgent.includes('iPad')&&navigator.maxTouchPoints>0),true,label+': uses an iPad-like touch/Safari context');
  await openDoor(page);

  const summary=page.locator('#pwDoorTimeSummary');
  assert(await summary.isVisible(),label+': the physical-door time summary is visible');
  assert.equal((await page.locator('#pwDoorTimeTotal').innerText()).trim(),'1 h 35 min',label+': total includes all material quantities and extra work');
  assert.equal((await page.locator('#pwDoorTimeDone').innerText()).trim(),'20 min',label+': completed time is visible');
  assert.equal((await page.locator('#pwDoorTimeLeft').innerText()).trim(),'1 h 15 min',label+': remaining time is visible');
  assert.equal((await page.locator('#pwDoorTimeUnknown').innerText()).trim(),'0',label+': unknown-time count is visible');
  assert(await page.getByRole('button',{name:'＋ Extra tid'}).isVisible(),label+': direct extra-time action is visible');

  const compact=await page.locator('#pwChecklist .rtWorkSection').evaluateAll(sections=>sections.map(section=>({
   open:section.open,
   summaryHeight:section.querySelector('summary')?.getBoundingClientRect().height||0,
   rowHeights:[...section.querySelectorAll('.pwCheckRow')].map(row=>row.getBoundingClientRect().height),
   status:section.querySelector('.rtWorkSectionStatus')?.textContent||''
  })));
  assert.equal(compact.length,3,label+': work is grouped into compact sections');
  assert(compact.every(section=>section.open),label+': work sections start open');
  assert(compact.every(section=>section.summaryHeight>0&&section.summaryHeight<=44),label+': section summaries stay compact');
  assert(compact.flatMap(section=>section.rowHeights).every(height=>height>0&&height<=76),label+': open work rows stay compact');
  assert(compact.every(section=>/klara/.test(section.status)&&/(min|h)/.test(section.status)),label+': each section summarizes completion and time');

  assertNoOverflow(await overflowState(page,['html','#pwProtocol','.pwProtocolBody','.pwChecklistPane','#pwChecklist']),label+' checklist');
  const checklistViewport=await page.locator('.pwChecklistPane').evaluate(node=>({right:node.getBoundingClientRect().right,viewport:innerWidth}));
  assert(checklistViewport.right<=checklistViewport.viewport+1,label+': checklist stays inside the viewport');

  await page.locator('#pwProtocolClose').click();
  await page.waitForFunction(()=>!document.getElementById('pwProtocol').open,null,{timeout:30000});
  await page.locator('#pwTimeReport').click();
  await page.waitForSelector('#pwTimeDialog[open]');
  await page.waitForFunction(()=>document.querySelectorAll('#pwTimeRows .pwTimeRow').length>=4,null,{timeout:30000});
  assert.equal((await page.locator('#pwTimeProductsTab').innerText()).trim(),'Per produkt');
  assert.equal((await page.locator('#pwTimeDoorsTab').innerText()).trim(),'Per dörr');
  assert.equal(await page.locator('#pwTimeProductsTab').getAttribute('aria-selected'),'true');
  assert(await page.locator('#pwTimeProductsPanel').isVisible(),label+': product totals are visible');
  assert.match(await page.locator('#pwTimeSummaryText').innerText(),/4 arbetsmoment · 5 st material\/arbete/);
  assertNoOverflow(await overflowState(page,['html','#pwTimeDialog','.pwTimeBody','#pwTimeProductsPanel','#pwTimeRows']),label+' product report');

  await page.locator('#pwTimeDoorsTab').click();
  await page.waitForFunction(()=>!document.getElementById('pwTimeDoorsPanel').hidden&&document.querySelectorAll('#pwTimeDoorRows .pwTimeDoorRow').length===1,null,{timeout:30000});
  assert.equal(await page.locator('#pwTimeDoorsTab').getAttribute('aria-selected'),'true');
  const doorRow=page.locator('#pwTimeDoorRows .pwTimeDoorRow');
  assert(await doorRow.isVisible(),label+': physical-door row is visible');
  const doorText=(await doorRow.innerText()).replace(/\s+/g,' ');
  assert.match(doorText,/GS1/);assert.match(doorText,/1 h 35 min/);assert.match(doorText,/20 min/);assert.match(doorText,/1 h 15 min/);assert.match(doorText,/5 st/);
  assertNoOverflow(await overflowState(page,['html','#pwTimeDialog','.pwTimeBody','#pwTimeDoorsPanel','#pwTimeDoorRows','.pwTimeDoorRow']),label+' door report');
  const dialogBox=await page.locator('#pwTimeDialog').boundingBox(),rowBox=await doorRow.boundingBox();
  assert(dialogBox&&rowBox&&rowBox.x>=dialogBox.x-1&&rowBox.x+rowBox.width<=dialogBox.x+dialogBox.width+1,label+': door row stays within the dialog');
  assert.deepEqual(errors,[],label+': no page errors');
 }finally{await context.close();}
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const bytes=await fixture();
  await verifyViewport(browser,bytes,{width:1366,height:900});
  await verifyViewport(browser,bytes,{width:820,height:1180});
  console.log('PASS TEST 9.23: door time, compact work, extra time, product/door tabs, and iPad-sized layouts have no horizontal overflow');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
