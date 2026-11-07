/* TEST 9.29 regression: make classroom names and plan lines a little clearer
 * on iPad while retaining the Safari memory limits introduced in TEST 9.16.
 * Chromium emulates iPad signals; a physical iPad remains the final WebKit
 * memory check. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end()}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end()}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-59.html`;

async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([2400,1400]);
 for(let x=45;x<2355;x+=24)plan.drawLine({start:{x,y:45},end:{x,y:1355},thickness:.45,color:rgb(.58,.62,.64)});
 for(let y=45;y<1355;y+=24)plan.drawLine({start:{x:45,y},end:{x:2355,y},thickness:.45,color:rgb(.58,.62,.64)});
 for(let row=0;row<8;row++)plan.drawText('KLASSRUM '+String.fromCharCode(65+row)+' '+(101+row),{x:120+row*265,y:1180-row*125,size:19,font,color:rgb(.08,.16,.22)});
 plan.drawEllipse({x:520,y:990,xScale:55,yScale:38,color:rgb(1,.88,.02)});plan.drawText('GS2',{x:497,y:982,size:20,font});
 const card=document.addPage([595,842]);card.drawText('Beslagskod: GS2',{x:60,y:750,size:20,font});card.drawText('Dörrstängare GS2',{x:60,y:670,size:15,font});
 const rect=[465,952,575,1028],positionId='scan:GS2@1:'+rect.join(','),cardId='generated-card:GS2';
 const hit={page:1,code:'GS2',positionId,rect,box:{x:465/2400,y:(1400-1028)/1400,w:110/2400,h:76/1400},selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'project-code',subtype:'Circle',order:870000,label:'GS2'};
 const work=['Dörrstängare GS2'],checks={[positionId]:{}},cards={[cardId]:{id:cardId,page:2,code:'GS2',originalCardCode:'GS2',header:'Beslagskod: GS2',rawTable:work[0],work,
  workItems:[{key:'GS2-0',text:work[0],label:work[0],section:'Övrigt',sectionKey:'ovrigt'}],workState:'ready',workPolicy:'all',codeRect:{x:.08,y:.08,w:.8,h:.06},tableRect:{x:.08,y:.16,w:.8,h:.25},bounds:{x:.06,y:.06,w:.86,h:.4},choices:['GS2'],method:'PDF-text',confidence:100}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:ipad-quality-v921',rects:{code:{x:.08,y:.08,w:.8,h:.06},table:{x:.08,y:.16,w:.8,h:.25}},pages:[2],cards,checks,
  matching:{version:2,hits:[hit],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated iPad quality TEST 9.29'};
 const payload={schema:6,projectId:'project:ipad-quality-v921',projectRevision:1,instances:{[positionId]:{checks:{},rowStages:{},progress:0,overrides:{},customItems:[]}},automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1400,height:1000},deviceScaleFactor:3});
 await context.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url());await page.locator('#pwFile').setInputFiles({name:'quality.pdf',mimeType:'application/pdf',buffer:await fixture()});
 await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&document.getElementById('pwScanOverlay').hidden&&!document.getElementById('pwDrawingDetail').hidden,null,{timeout:60000});
 await page.evaluate(async()=>{const pg=await SmartMatchAppBridge.getPdf().getPage(1),render=pg.render.bind(pg);window.__renders=[];pg.render=options=>{const task=render(options),c=options.canvasContext.canvas,entry={pixels:c.width*c.height,done:false,detail:!!options.transform};window.__renders.push(entry);task.promise.then(()=>entry.done=true,()=>entry.cancelled=true);return task;};});
 for(let i=0;i<5;i++)await page.locator('#pwZoomIn').click();
 await page.waitForFunction(()=>window.__renders.filter(r=>r.detail&&r.done).length>=2&&document.getElementById('pwDrawingDetail').width*document.getElementById('pwDrawingDetail').height>2005000);
 const renders=await page.evaluate(()=>__renders.filter(r=>r.detail&&r.done));assert(renders.some(r=>r.pixels<=2005000));assert(renders.some(r=>r.pixels>2005000));
 const before=await page.evaluate(()=>__renders.length);await page.locator('#pwViewer').click({position:{x:80,y:100}});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>__renders.length),before,'ordinary click reuses completed sharp image');
 await page.locator('#pwZoomOut').click();await page.waitForFunction(n=>__renders.length>n&&__renders.at(-1).done,before);assert.deepEqual(errors,[]);console.log('PASS: desktop preview followed by full detail; click reuses image; zoom out completes');await context.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
