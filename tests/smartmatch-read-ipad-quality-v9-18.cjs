/* TEST 9.18 regression: improve the iPad floor-plan overview a little without
 * reopening the Safari memory problem fixed in TEST 9.16. Chromium emulates
 * the iPad signals; a physical iPad remains the final WebKit memory check. */
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-18.html`;

async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([1200,700]);
 // Thin plan lines make the fixture representative of the detail that benefits
 // from the modest overview increase. The linked code must remain DOM text.
 for(let x=35;x<1165;x+=18)plan.drawLine({start:{x,y:45},end:{x,y:655},thickness:.45,color:rgb(.55,.6,.63)});
 for(let y=45;y<655;y+=18)plan.drawLine({start:{x:35,y},end:{x:1165,y},thickness:.45,color:rgb(.55,.6,.63)});
 plan.drawEllipse({x:270,y:485,xScale:50,yScale:35,color:rgb(1,.9,.02)});
 plan.drawText('GS2',{x:250,y:478,size:18,font});
 const card=document.addPage([595,842]);card.drawText('Beslagskod: GS2',{x:60,y:750,size:20,font});card.drawText('Dorrstangare GS2',{x:60,y:670,size:15,font});
 const rect=[220,450,320,520],positionId='scan:GS2@1:'+rect.join(','),cardId='generated-card:GS2';
 const hit={page:1,code:'GS2',positionId,rect,box:{x:220/1200,y:(700-520)/700,w:100/1200,h:70/700},selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'project-code',order:870000,label:'GS2'};
 const work=['Dorrstangare GS2'],checks={[positionId]:{}},cards={[cardId]:{id:cardId,page:2,code:'GS2',originalCardCode:'GS2',header:'Beslagskod: GS2',rawTable:work[0],work,
  workItems:[{key:'GS2-0',text:work[0],label:work[0],section:'Ovrigt',sectionKey:'ovrigt'}],workState:'ready',workPolicy:'all',codeRect:{x:.08,y:.08,w:.8,h:.06},tableRect:{x:.08,y:.16,w:.8,h:.25},bounds:{x:.06,y:.06,w:.86,h:.4},choices:['GS2'],method:'PDF-text',confidence:100}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:ipad-quality-v918',rects:{code:{x:.08,y:.08,w:.8,h:.06},table:{x:.08,y:.16,w:.8,h:.25}},pages:[2],cards,checks,
  matching:{version:2,hits:[hit],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated iPad quality TEST 9.18'};
 const payload={schema:6,projectId:'project:ipad-quality-v918',projectRevision:1,instances:{[positionId]:{checks:{},rowStages:{},progress:0,overrides:{},customItems:[]}},automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,context;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  context=await browser.newContext({viewport:{width:1366,height:900},screen:{width:1366,height:1024},hasTouch:true,isMobile:true,deviceScaleFactor:2,
   userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
  await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  await context.addInitScript(()=>{Object.defineProperty(Navigator.prototype,'platform',{configurable:true,get:()=> 'MacIntel'});Object.defineProperty(Navigator.prototype,'maxTouchPoints',{configurable:true,get:()=>5})});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url());await page.locator('#pwFile').setInputFiles({name:'generated-ipad-quality-v918.pdf',mimeType:'application/pdf',buffer:await fixture()});
  await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.querySelectorAll('#pwMarkers .pwStampHit').length===1&&document.getElementById('pwCanvas').width>0&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});

  const profile=await page.evaluate(()=>SmartMatchAppBridge.getDrawingPerformanceProfile());
  assert.deepEqual(profile,{mobile:true,ios:true,ipad:true,iphone:false,phone:false,maxPixels:1500000,detailMaxPixels:650000,maxSide:3000},'TEST 9.18 raises only the iPad overview budget to 1.50 MP');
  const overview=await page.locator('#pwCanvas').evaluate(canvas=>({width:canvas.width,height:canvas.height,pixels:canvas.width*canvas.height}));
  assert(overview.pixels>1350000+100000,'the real overview contains materially more pixels than TEST 9.17');
  assert(overview.pixels<=profile.maxPixels+5000&&overview.width<=profile.maxSide&&overview.height<=profile.maxSide,'the improved overview remains inside the hard iPad canvas ceiling');
  const oldWidth=Math.ceil(1200*Math.sqrt(1350000/(1200*700)));
  assert(overview.width>=oldWidth*1.05,'the 1.50 MP budget gives at least five percent more linear plan detail on this page');

  const memoryPolicy=await page.evaluate(()=>SmartMatchAppBridge.getDrawingMemoryPolicy(43*1024*1024));
  assert.deepEqual(memoryPolicy,{detail:false,detailFileLimit:24*1024*1024,pdfImageBudget:12*1024*1024},'large screenshot-heavy PDFs retain the 24 MB detail cutoff and 12 MB PDF image budget');
  const giantLimit=await page.evaluate(()=>{const scale=SmartMatchAppBridge.getDrawingScaleLimit(9535.75,4767.87);return {scale,side:scale*9535.75}});
  assert(giantLimit.side<=8193&&giantLimit.scale<1,'school-sized pages retain the 8192 CSS-pixel logical-side clamp');

  for(let index=0;index<16;index++)await page.locator('#pwZoomIn').click();
  await page.waitForFunction(()=>document.getElementById('pwZoomInfo').textContent==='300%'&&document.querySelectorAll('#pwMarkers .pwStampHit').length===1,{timeout:15000});
  await page.waitForFunction(()=>{const canvas=document.getElementById('pwDrawingDetail');return !canvas.hidden&&canvas.width*canvas.height>0&&canvas.width*canvas.height<=655000},{timeout:15000});
  const zoomed=await page.evaluate(()=>{
   const canvas=document.getElementById('pwCanvas'),detail=document.getElementById('pwDrawingDetail'),label=document.querySelector('#pwMarkers .pwStampHit[data-code="GS2"] > .pwStampCodeLabel');
   const style=label&&getComputedStyle(label),rect=label?.getBoundingClientRect();
   return {overviewPixels:canvas.width*canvas.height,detailPixels:detail.width*detail.height,labelCount:document.querySelectorAll('#pwMarkers .pwStampHit[data-code="GS2"] > .pwStampCodeLabel').length,
    labelVisible:!!label&&style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0,labelText:label?.textContent||''};
  });
  assert(zoomed.overviewPixels<=1505000,'zoom never expands the complete overview beyond 1.50 MP');
  assert(zoomed.detailPixels<=655000,'the optional visible-area detail canvas stays at the unchanged 650k ceiling');
  assert.deepEqual({count:zoomed.labelCount,visible:zoomed.labelVisible,text:zoomed.labelText},{count:1,visible:true,text:'GS2'},'the linked stamp keeps one sharp GS2 label after repeated zoom');
  assert.deepEqual(errors,[]);
  console.log('PASS TEST 9.18 iPad gains a modest 1.50 MP overview while retaining all memory ceilings and the sharp linked-stamp label');
 }finally{await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
