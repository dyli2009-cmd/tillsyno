'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,PDFName,PDFHexString,StandardFonts,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..'),rect={x:60/900,y:90/600,w:120/900,h:100/600};
const server=http.createServer((req,res)=>{const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}});
async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 function stamp(page,x,y,color){
  const helper=doc.addPage([90,64]);helper.drawEllipse({x:45,y:32,xScale:44,yScale:31,color});helper.drawText('DVEL',{x:45-font.widthOfTextAtSize('DVEL',17)/2,y:26,font,size:17});
  const form=doc.context.register(doc.context.flateStream(helper.getContentStream().getUnencodedContents(),{Type:'XObject',Subtype:'Form',BBox:[0,0,90,64],Resources:helper.node.Resources()}));doc.removePage(doc.getPageCount()-1);
  page.node.addAnnot(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText('Descriptive reader name'),Rect:[x-45,y-32,x+45,y+32],F:4,AP:{N:form}})));
  page.drawText('ROOM 14',{x:x-25,y:y-5,font,size:10});
 }
 const one=doc.addPage([900,600]);stamp(one,120,460,rgb(1,.9,0));stamp(one,400,460,rgb(.1,.5,.9));one.drawText('DVEL1',{x:600,y:460,font,size:17});
 const two=doc.addPage([900,600]);stamp(two,120,460,rgb(1,.9,0));two.drawText('DVEL',{x:400,y:460,font,size:17});
 doc.addPage([595,842]).drawText('Beslagskod: DVEL',{x:60,y:750,font,size:20});
 const codeRect={x:.08,y:.08,w:.8,h:.08},card={id:'dvel',page:3,code:'DVEL',originalCardCode:'DVEL',header:'Beslagskod: DVEL',codeRect,tableRect:null,work:[],workState:'pending',choices:['DVEL'],method:'PDF-text',confidence:100};
 const data={schema:1,phase:'codes',sourceId:'generated:manual-example',rects:{code:codeRect,table:null},pages:[3],cards:{dvel:card},matching:{version:2,hits:[],pages:[{page:1,count:0},{page:2,count:0}],warnings:[],imageMode:'text',review:{version:1,approved:true}},name:'Example search'};
 const payload={schema:6,projectId:'manual-example-browser',projectRevision:1,instances:{},automationItems:[],readTestData:data};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])doc.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await doc.save());
}
async function mark(page,context,touch){
 await page.locator('#rtCanvasBox').scrollIntoViewIfNeeded();
 const p=await page.locator('#rtCanvasBox').evaluate((el,r)=>{const b=el.getBoundingClientRect();return {x:b.x+r.x*b.width,y:b.y+r.y*b.height,dx:r.w*b.width,dy:r.h*b.height};},rect);
 if(touch){const c=await context.newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});for(let i=1;i<=8;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+p.dx*i/8,y:p.y+p.dy*i/8,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();}
 else{await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+p.dx,p.y+p.dy,{steps:8});await page.mouse.up();}
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const bytes=await fixture();
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:820,height:1180}:{width:1366,height:1000},hasTouch:mobile,isMobile:mobile,userAgent:mobile?'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1':undefined});
   await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
   // This generated-fixture test starts after authentication/PIN verification.
   await context.route('**/smartmatch-read-access-v9-85.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.documentElement.removeAttribute('data-read-locked');document.getElementById('smReadCodeGate').hidden=true;"}));
   await context.addInitScript(()=>{window.__ocrCalls=0;window.Tesseract={async createWorker(){__ocrCalls++;throw Error('Text sample search must not OCR');}};});
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/smartmatch-read-test.html');
   await page.locator('#pwFile').setInputFiles({name:'example-project.pdf',mimeType:'application/pdf',buffer:bytes});
   await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf()&&!SmartMatchAppBridge.isOpeningProject()&&document.getElementById('pwScanOverlay').hidden);
   if(process.env.SMARTMATCH_DEBUG)console.log(await page.evaluate(()=>({body:document.body.innerText.slice(-3000),payload:SmartMatchReadTest.payload(),opening:SmartMatchAppBridge.isOpeningProject()})));
   if(process.env.SMARTMATCH_DEBUG)await page.screenshot({path:path.join(root,'work/example-open-debug.png')});await page.locator('#pwToolMenuButton').click();await page.locator('#rtEditPreparation').click();await page.waitForSelector('#rtDialog[open]');
   await page.locator('.rtCardSummary').click();await page.locator('.rtManualLinkCard').click();await page.waitForFunction(()=>document.getElementById('rtCanvas').width>document.getElementById('rtCanvas').height);
   await page.locator('#rtManualMark').click();await mark(page,context,mobile);await page.waitForFunction(()=>!document.getElementById('rtManualConfirm').disabled);
   assert.match(await page.locator('#rtManualSampleInfo').innerText(),/Exempel på sida 1/);
   await page.locator('#rtManualConfirm').click();await page.waitForFunction(()=>document.getElementById('rtManualConfirm').disabled);assert.match(await page.locator('#rtManualSampleInfo').innerText(),/Exempel på sida 1/,'single link retains search example');
   await page.locator('#rtManualSearch').click();await page.waitForFunction(()=>!document.getElementById('rtManualSearch').disabled);
   assert.match(await page.locator('#rtStatus').innerText(),/2 träffar för DVEL/);
   assert.equal(await page.locator('#rtManualSearchResults input[type=checkbox]:checked').count(),1,'already linked example excluded; second page remains selectable');
   await page.locator('#rtManualSearchLink').click();await page.waitForFunction(()=>document.getElementById('rtManualSearchLink').disabled);
   await page.locator('#rtManualDone').click();await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await page.waitForSelector('#rtDialog[open]',{state:'detached'});
   await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().length===2&&document.getElementById('pwScanOverlay').hidden);
   const positions=await page.evaluate(()=>SmartMatchAppBridge.getPositions());assert.deepEqual(positions.map(p=>p.page).sort(),[1,2]);assert(positions.every(p=>p.code==='DVEL'&&p.cardPage===3));
   assert.equal(await page.evaluate(()=>__ocrCalls),0);assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(root,'work/appearance-search-'+(mobile?'ipad':'desktop')+'.png')});
   await context.close();console.log('PASS '+(mobile?'iPad touch':'desktop mouse')+': actual Avläsning mark → single link → sample search on both drawing pages → bulk link → correct card from descriptive annotation appearance, background room text excluded, blue/plain/suffix rejected, no OCR');
  }
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
