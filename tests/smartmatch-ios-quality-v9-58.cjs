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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-58.html`;

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
 browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']});
 for(const phone of [false,true]){
 const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1366,height:900},hasTouch:true,isMobile:true,deviceScaleFactor:2,userAgent:phone?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
 await context.addInitScript(phone=>{Object.defineProperty(Navigator.prototype,'platform',{configurable:true,get:()=>phone?'iPhone':'MacIntel'});Object.defineProperty(Navigator.prototype,'maxTouchPoints',{configurable:true,get:()=>5})},phone);
 await context.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url());await page.locator('#pwFile').setInputFiles({name:'quality.pdf',mimeType:'application/pdf',buffer:await fixture()});
 await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
 const profile=await page.evaluate(()=>SmartMatchAppBridge.getDrawingPerformanceProfile());assert.equal(profile.maxPixels,phone?850000:2000000);assert.equal(profile.detailMaxPixels,phone?850000:1000000);
 for(let i=0;i<12;i++)await page.locator('#pwZoomIn').click();
 await page.waitForFunction(()=>{const c=document.getElementById('pwDrawingDetail');return !c.hidden&&c.width>0});
 const size=await page.evaluate(()=>{const c=document.getElementById('pwDrawingDetail'),b=document.getElementById('pwCanvas');return{pixels:c.width*c.height,base:b.width*b.height,ratio:c.width/parseFloat(c.style.width),count:document.querySelectorAll('#pwDrawingDetail').length}});
 assert(size.pixels<=profile.detailMaxPixels+5000);assert(size.base<=profile.maxPixels+5000);assert(size.ratio<=1.51);assert.equal(size.count,1);
 if(!phone){assert(size.pixels>650000,'detail has more pixels than previous iPad ceiling');const policy=await page.evaluate(()=>SmartMatchAppBridge.getDrawingMemoryPolicy(43*1024*1024));assert.equal(policy.detail,false);assert.equal(policy.pdfImageBudget,12*1024*1024);}
 for(let i=0;i<4;i++){await page.locator('#pwZoomOut').click();await page.locator('#pwZoomIn').click();}
 await page.waitForFunction(()=>!document.getElementById('pwDrawingDetail').hidden);assert.deepEqual(errors,[]);console.log('PASS '+(phone?'iPhone':'iPad')+': sharper bounded canvas, repeated zoom, no browser errors');await context.close();
 }
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
