/* End-to-end sample selection on the actual SmartMatch page: pointer input,
 * real PDF renderer/matcher, actual project bridge, portable save and reopen.
 * Generated PDF fixtures only; OCR is forbidden for these native-text stamps. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),sampleRect={x:70/900,y:110/600,w:100/900,h:80/600};
const devices={desktop:{viewport:{width:1366,height:900}},ipad:{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2}};
const deviceNames=process.env.SMARTMATCH_DEVICE?[process.env.SMARTMATCH_DEVICE]:Object.keys(devices);
const server=http.createServer((request,response)=>{
 const filename=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!filename.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(filename)]||'application/octet-stream');response.end(fs.readFileSync(filename));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-8.html`;
const clone=value=>JSON.parse(JSON.stringify(value));
async function fixture(guideOnly=false){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([900,600]),yellow=rgb(1,.9,.02),blue=rgb(.1,.4,.95),green=rgb(.1,.75,.2);
 function stamp(text,x,y,color,shape='ellipse'){
  if(shape==='rectangle')plan.drawRectangle({x:x-45,y:y-34,width:90,height:68,color});else plan.drawEllipse({x,y,xScale:45,yScale:34,color});
  plan.drawText(text,{x:x-font.widthOfTextAtSize(text,18)/2,y:y-6,size:18,font});
 }
 stamp('WC',120,450,yellow);stamp('WC',300,450,yellow);plan.drawText('WC',{x:480,y:444,size:18,font});
 stamp('WC',120,240,blue);stamp('WC',300,240,yellow,'rectangle');stamp('WC',500,240,green);
 stamp('DBL',710,450,yellow);stamp('DBL-OI',710,240,yellow);stamp('DBL B-OPPS',710,90,yellow);
 const codeRect={x:.08,y:.08,w:.80,h:.06},tableRect={x:.08,y:.16,w:.80,h:.25},bounds={x:.06,y:.06,w:.86,h:.40},cards={};
 for(const [index,code]of ['DBL','WC'].entries()){
  const page=index+2,card=document.addPage([595,842]),work=['Lås '+code,'Dörrstängare '+code],id='generated-card:'+code;
  card.drawText('Beslagskod: '+code,{x:60,y:750,size:20,font});work.forEach((text,row)=>card.drawText(text,{x:60,y:670-row*30,size:15,font}));
  if(!guideOnly||code==='WC')cards[id]={id,page,code,originalCardCode:code,header:'Beslagskod: '+code,rawTable:work.join('\n'),work,workItems:work.map((text,row)=>({key:code+'-'+row,text,label:text,section:'Övrigt',sectionKey:'ovrigt'})),workState:'ready',workPolicy:'all',codeRect,tableRect,bounds,choices:[code],method:'PDF-text',confidence:100};
 }
 const hit={page:1,code:'DBL',rect:[680,440,740,465],box:{x:680/900,y:135/600,w:60/900,h:25/600},selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000,label:'DBL'};
 const id='scan:DBL@1:680,440,740,465',checks=guideOnly?{}:{[id]:{'DBL-0':true,'DBL-1':false}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:stamp-flow',rects:{code:codeRect,table:tableRect},pages:guideOnly?[3]:[2,3],cards,checks,matching:{version:2,hits:guideOnly?[]:[hit],pages:[{page:1,count:guideOnly?0:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated stamp flow'};
 const payload={schema:6,projectId:'project:generated-stamp-flow',projectRevision:1,instances:guideOnly?{}:{[id]:{checks:clone(checks[id]),rowStages:{},progress:0,overrides:{'DBL-0':{minutes:17}},customItems:[]}},automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return {bytes:Buffer.from(await document.save()),payload};
}
async function contextFor(browser,device){
 const context=await browser.newContext({...device,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__calls={scans:0,work:0,workers:0,guides:0};
  window.Tesseract={async createWorker(){__calls.workers++;throw Error('Native stamp matching must never start OCR');}};
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:next=>{matcher={...next,scan:async(...args)=>{__calls.scans++;return next.scan(...args);}};}});
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:next=>{work={...next,read:async(...args)=>{__calls.work++;throw Error('Prepared work must never be reread');}};}});
  const show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')__calls.guides++;return show.call(this);};
 });return context;
}
async function open(page,bytes,count){
 await page.locator('#pwFile').setInputFiles({name:'generated-prepared-stamp-project.pdf',mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(expected=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===expected&&document.getElementById('pwScanOverlay').hidden,count,{timeout:60000});
 assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});
}
async function rectangle(page,context,selector,rect,touch){
 await page.locator(selector).scrollIntoViewIfNeeded();
 const points=await page.locator(selector).evaluate((element,selection)=>{const bounds=element.getBoundingClientRect();return {x1:bounds.left+selection.x*bounds.width,y1:bounds.top+selection.y*bounds.height,x2:bounds.left+(selection.x+selection.w)*bounds.width,y2:bounds.top+(selection.y+selection.h)*bounds.height};},rect);
 for(const point of [{x:points.x1,y:points.y1},{x:points.x2,y:points.y2}])assert(await page.evaluate(({x,y})=>x>=0&&y>=0&&x<innerWidth&&y<innerHeight,point),'sample drag endpoints must be visible to the user');
 if(touch){
  const client=await context.newCDPSession(page),point=(x,y)=>[{x,y,id:1,radiusX:1,radiusY:1,force:1}];
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:point(points.x1,points.y1)});
  for(let step=1;step<=8;step++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:point(points.x1+(points.x2-points.x1)*step/8,points.y1+(points.y2-points.y1)*step/8)});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();
 }else{await page.mouse.move(points.x1,points.y1);await page.mouse.down();await page.mouse.move(points.x2,points.y2,{steps:8});await page.mouse.up();}
}
async function exportPdf(page){
 await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled,null,{timeout:60000});
 const downloading=page.waitForEvent('download');await page.locator('#smartExportBuild').click();const bytes=fs.readFileSync(await(await downloading).path());assert(bytes.length>1000);await page.locator('#smartExportClose').click();
 const document=await PDFDocument.load(bytes),payload=JSON.parse(document.catalog.lookup(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());return {bytes,payload};
}
async function assertCleanReopen(browser,device,saved,count,expected){
 const context=await contextFor(browser,device),page=await context.newPage();await page.goto(url());await open(page,saved.bytes,count);
 const restored=await page.evaluate(()=>({positions:SmartMatchAppBridge.getPositions(),sample:SmartMatchReadTest.getDrawingSample(),mapping:SmartMatchAppBridge.getDoorCardMapping()}));
 assert.deepEqual(restored.sample,expected.sample);assert.deepEqual(restored.positions.map(position=>({id:position.id,code:position.code,page:position.page,rect:position.rect})),expected.positions.map(position=>({id:position.id,code:position.code,page:position.page,rect:position.rect})));
 assert.equal(restored.mapping.WC,3);assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});await context.close();
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const input=await fixture();
  for(const name of deviceNames){
   assert(devices[name],'Unknown SMARTMATCH_DEVICE: '+name);const context=await contextFor(browser,devices[name]),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(url());await open(page,input.bytes,1);
   const original=await page.evaluate(()=>SmartMatchAppBridge.getPositions()[0]);
   if(await page.locator('#pwShowPositions').isVisible())await page.locator('#pwShowPositions').click();
   await page.locator('#exOpenExtraPositions').click();await page.waitForFunction(()=>document.getElementById('pwStage').classList.contains('pmPlacing'));
   assert.equal(await page.locator('#exDialog').evaluate(node=>node.open),false,'the entry starts actual main-view rectangle marking before asking for a card');
   // Closing the positions panel gives the drawing back its width on tablets.
   if(await page.locator('#pwHidePositions').isVisible())await page.locator('#pwHidePositions').click();
   await rectangle(page,context,'#pwStage',sampleRect,name==='ipad');await page.waitForSelector('#exDialog[open]');await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy);
   assert.equal(await page.locator('#exCode').inputValue(),'WC');assert.match(await page.locator('#exColorInfo').innerText(),/gul bakgrund/);
   if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v98-stamp-'+name+'.png'});
   await page.locator('#exCardPage').selectOption('3');assert.equal(await page.locator('#exCardCode').inputValue(),'WC');assert(await page.locator('#exCardCode').getAttribute('readonly')!==null);
   await page.locator('#exSearch').click();await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy);
   const result=await page.evaluate(()=>SmartMatchReadExtraV94.state());assert(result.result,await page.locator('#exStatus').innerText());assert.equal(result.result.hits.length,2,'only the two yellow oval WC stamps match');assert.equal(result.result.wrongColor,3);assert.equal(result.result.unknownColor,1);assert.equal(await page.locator('#exHits .exHit').count(),2);
   assert.deepEqual(await page.evaluate(()=>__calls),{scans:1,work:0,workers:0,guides:0});await page.locator('#exApply').click();await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().length===3&&!SmartMatchReadExtraV94.state().busy);await page.locator('#exClose').click();
   const expected=await page.evaluate(()=>({positions:SmartMatchAppBridge.getPositions(),sample:SmartMatchReadTest.getDrawingSample()}));assert(expected.sample.appearance.enabled);assert.match(expected.sample.appearance.profile.label,/gul/);assert.equal(expected.positions.filter(position=>position.code==='WC').length,2);
   const existing=expected.positions.find(position=>position.id===original.id);assert(existing);assert.deepEqual(existing.checks,original.checks);assert.deepEqual(existing.overrides,original.overrides);assert.equal(existing.doneMinutes,original.doneMinutes);
   const added=expected.positions.find(position=>position.code==='WC');await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),added.id);await page.waitForSelector('#pwProtocol[open]');assert.match(await page.locator('#pwProtocolPosition').innerText(),/protokollsida 3/);assert.equal(await page.locator('#pwProtocolCode').innerText(),'WC');await page.locator('#pwProtocolClose').click();
   const saved=await exportPdf(page);assert.deepEqual(saved.payload.readTestData.drawingSample,expected.sample);assert.equal(saved.payload.manualPositions.filter(position=>position.code==='WC').length,2);assert.deepEqual(errors,[]);await context.close();
   await assertCleanReopen(browser,devices[name],saved,3,expected);
   console.log('PASS '+name+': actual '+(name==='ipad'?'touch':'mouse')+' sample rectangle → real stamp search excludes plain/blue/rectangular WC → actual links → portable PDF clean reopen without OCR');
  }
  {
   const guideInput=await fixture(true),context=await contextFor(browser,devices.desktop),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(url());await open(page,guideInput.bytes,0);
   await page.locator('#rtOpenSettings').click();await page.waitForSelector('#rtDialog[open]');await page.locator('#rtStamp').click();await page.waitForFunction(()=>document.getElementById('rtCanvas').width>document.getElementById('rtCanvas').height);
   await page.locator('#rtStampCode').selectOption('WC');await rectangle(page,context,'#rtCanvasBox',sampleRect,false);await page.waitForSelector('#rtStampRect:not([hidden])');
   await page.locator('#rtImageMode').selectOption('text');await page.locator('#rtFind').click();await page.waitForFunction(()=>!document.getElementById('rtFind').disabled&&document.querySelectorAll('.rtMatchRow').length>0);
   assert.equal(await page.locator('.rtMatchRow').count(),2,'the existing reading guide also uses the selected stamp background and shape');
   await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await page.waitForSelector('#rtDialog[open]',{state:'detached'});await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().length===2&&document.getElementById('pwScanOverlay').hidden);
   const expected=await page.evaluate(()=>({positions:SmartMatchAppBridge.getPositions(),sample:SmartMatchReadTest.getDrawingSample()}));assert(expected.sample.appearance.enabled);assert.match(expected.sample.appearance.profile.label,/gul/);assert.deepEqual(await page.evaluate(()=>__calls),{scans:1,work:0,workers:0,guides:1});
   const saved=await exportPdf(page);assert.deepEqual(errors,[]);await context.close();await assertCleanReopen(browser,devices.desktop,saved,2,expected);
   console.log('PASS existing reading guide: actual stamp rectangle learns the yellow oval profile, links only two WC stamps, and saves that profile for clean reopen');
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
