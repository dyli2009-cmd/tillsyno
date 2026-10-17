/* TEST 9.21 regression: make classroom names and plan lines a little clearer
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-21.html`;

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
  matching:{version:2,hits:[hit],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated iPad quality TEST 9.21'};
 const payload={schema:6,projectId:'project:ipad-quality-v921',projectRevision:1,instances:{[positionId]:{checks:{},rowStages:{},progress:0,overrides:{},customItems:[]}},automationItems:[],readTestData};
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
  await page.goto(url());await page.locator('#pwFile').setInputFiles({name:'generated-ipad-quality-v921.pdf',mimeType:'application/pdf',buffer:await fixture()});
  await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.querySelectorAll('#pwMarkers .pwStampHit').length===1&&document.getElementById('pwCanvas').width>0&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});

  const profile=await page.evaluate(()=>SmartMatchAppBridge.getDrawingPerformanceProfile());
  assert.deepEqual(profile,{mobile:true,ios:true,ipad:true,iphone:false,phone:false,maxPixels:1650000,detailMaxPixels:650000,maxSide:3000},
   'TEST 9.21 raises only the iPad overview budget to a modest 1.65 MP');
  const overview=await page.locator('#pwCanvas').evaluate(canvas=>({width:canvas.width,height:canvas.height,pixels:canvas.width*canvas.height}));
  assert(overview.pixels>1600000,'classroom text receives materially more source pixels than the TEST 9.18 1.50 MP overview');
  assert(overview.pixels<=profile.maxPixels+5000&&overview.width<=profile.maxSide&&overview.height<=profile.maxSide,'the clearer overview remains within the bounded full-page iPad canvas');
  const oldWidth=Math.ceil(2400*Math.sqrt(1500000/(2400*1400)));
  assert(overview.width>=oldWidth*1.045,'the modest increase supplies about five percent more linear detail for classroom names');

  const memoryPolicy=await page.evaluate(()=>SmartMatchAppBridge.getDrawingMemoryPolicy(43*1024*1024));
  assert.deepEqual(memoryPolicy,{detail:false,detailFileLimit:24*1024*1024,pdfImageBudget:12*1024*1024},'24 MB detail cutoff and 12 MB PDF image budget remain unchanged');
  const giantLimit=await page.evaluate(()=>{const scale=SmartMatchAppBridge.getDrawingScaleLimit(9535.75,4767.87);return {scale,side:scale*9535.75}});
  assert(giantLimit.side<=8193&&giantLimit.scale<1,'school-sized pages keep the 8192 CSS-pixel logical-side clamp');

  for(let index=0;index<16;index++)await page.locator('#pwZoomIn').click();
  await page.waitForFunction(()=>document.getElementById('pwZoomInfo').textContent==='300%'&&document.querySelectorAll('#pwMarkers .pwStampHit').length===1,{timeout:15000});
  await page.waitForFunction(()=>{const canvas=document.getElementById('pwDrawingDetail');return !canvas.hidden&&canvas.width*canvas.height>0&&canvas.width*canvas.height<=655000},{timeout:15000});
  const zoomed=await page.evaluate(()=>{
   const overview=document.getElementById('pwCanvas'),detail=document.getElementById('pwDrawingDetail'),styleWidth=parseFloat(detail.style.width)||0,styleHeight=parseFloat(detail.style.height)||0;
   const marker=document.querySelector('#pwMarkers .pwStampHit[data-code="GS2"]'),markerStyle=marker?getComputedStyle(marker):null,replica=marker?.querySelector(':scope > .pwStampReplica'),replicaStyle=replica?getComputedStyle(replica):null,replicaRect=replica?.getBoundingClientRect();
   return {overviewPixels:overview.width*overview.height,detailPixels:detail.width*detail.height,detailRatioX:styleWidth?detail.width/styleWidth:0,detailRatioY:styleHeight?detail.height/styleHeight:0,
    markerCount:document.querySelectorAll('#pwMarkers .pwStampHit').length,replicaCount:marker?.querySelectorAll(':scope > .pwStampReplica').length||0,
    nativeStamp:marker?.dataset.nativeStamp||'',background:markerStyle?.backgroundColor||'',replicaText:replica?.textContent||'',
    replicaWidth:replicaRect?.width||0,replicaHeight:replicaRect?.height||0,replicaFont:parseFloat(replicaStyle?.fontSize||'0'),
    replicaBackground:replicaStyle?.backgroundColor||'',replicaColor:replicaStyle?.color||'',replicaBorder:replicaStyle?.borderColor||'',replicaShadow:replicaStyle?.boxShadow||''};
  });
  assert(zoomed.overviewPixels<=1655000,'zoom never expands the complete overview beyond 1.65 MP');
  assert(zoomed.detailPixels<=655000,'visible-area detail stays at the unchanged 650k-pixel ceiling');
  assert(zoomed.detailRatioX<=1.255&&zoomed.detailRatioY<=1.255,'the iPad detail DPR remains capped at 1.25');
  assert.deepEqual({markers:zoomed.markerCount,replicas:zoomed.replicaCount,native:zoomed.nativeStamp,text:zoomed.replicaText},{markers:1,replicas:1,native:'true',text:'GS2'},
   'the clearer plan keeps one clickable GS2 target and one readable replica');
  assert.match(zoomed.background,/rgba\([^)]*,\s*0\)/,'the click target stays transparent so the original PDF stamp remains visible');
  assert(zoomed.replicaWidth<=72.1&&zoomed.replicaHeight<=36.1&&zoomed.replicaFont<=11.01,'the high-contrast replica stays within its 72 x 36 px and 11 px caps');
  assert.match(zoomed.replicaBackground,/rgb\(255,\s*216,\s*61\)/,'the replica uses the yellow stamp fill');
  assert.match(zoomed.replicaColor,/rgb\(17,\s*17,\s*17\)/,'the replica uses black text');
  assert.match(zoomed.replicaBorder,/rgb\(17,\s*17,\s*17\)/,'the replica uses a black border');
  assert.match(zoomed.replicaShadow,/rgb\(214,\s*50,\s*40\)/,'the replica keeps its red inner marking');
  assert.deepEqual(errors,[]);
  console.log('PASS TEST 9.21 iPad gains a modest 1.65 MP overview while retaining the 650k detail, 1.25 DPR, 8192-side and large-file memory limits');
 }finally{await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
