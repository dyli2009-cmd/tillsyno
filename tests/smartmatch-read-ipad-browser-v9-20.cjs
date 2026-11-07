/* Physical-iPad shaped regression for TEST 9.20. Chromium only emulates the
 * browser here, but the important iPadOS signals are the modern Macintosh UA,
 * MacIntel platform and five touch points at a 1366 px landscape viewport. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const sampleRect={x:72/900,y:108/600,w:100/900,h:82/600};
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end()}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end()}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-20.html`;
const clone=value=>JSON.parse(JSON.stringify(value));

async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([900,600]);
 plan.drawEllipse({x:120,y:450,xScale:45,yScale:34,color:rgb(1,.9,.02)});
 plan.drawText('WC',{x:108,y:444,size:18,font});
 // Keep this annotation deliberately /Subj-only. The reader must own and
 // expose it after the initial PDF open so an iPad full search can reuse the
 // index without asking PDFLib to parse the (potentially very large) PDF again.
 const wcStamp=document.context.register(document.context.obj({
  Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText('WC'),
  Rect:[75,415,165,485],F:4,NM:PDFHexString.fromText('ipad-subj-only-wc')
 }));
 plan.node.set(PDFName.of('Annots'),document.context.obj([wcStamp]));
 plan.drawEllipse({x:710,y:450,xScale:48,yScale:35,color:rgb(1,.9,.02)});
 plan.drawText('DBL',{x:692,y:444,size:18,font});
 const codeRect={x:.08,y:.08,w:.80,h:.06},tableRect={x:.08,y:.16,w:.80,h:.25},bounds={x:.06,y:.06,w:.86,h:.40},cards={};
 for(const [index,code] of ['DBL','WC'].entries()){
  const page=index+2,card=document.addPage([595,842]),work=['Lås '+code,'Dörrstängare '+code],id='generated-card:'+code;
  card.drawText('Beslagskod: '+code,{x:60,y:750,size:20,font});
  work.forEach((text,row)=>card.drawText(text,{x:60,y:670-row*30,size:15,font}));
  cards[id]={id,page,code,originalCardCode:code,header:'Beslagskod: '+code,rawTable:work.join('\n'),work,
   workItems:work.map((text,row)=>({key:code+'-'+row,text,label:text,section:'Övrigt',sectionKey:'ovrigt'})),
   workState:'ready',workPolicy:'all',codeRect,tableRect,bounds,choices:[code],method:'PDF-text',confidence:100};
 }
 const existingId='scan:DBL@1:680,425,744,474';
 const existing={page:1,code:'DBL',positionId:existingId,rect:[680,425,744,474],box:{x:680/900,y:(600-474)/600,w:64/900,h:49/600},selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'project-code',order:870000,label:'DBL'};
 const checks={[existingId]:{'DBL-0':true,'DBL-1':false}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:ipad-v917',rects:{code:codeRect,table:tableRect},pages:[2,3],cards,checks,
  matching:{version:2,hits:[existing],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated iPad TEST 9.20'};
 const payload={schema:6,projectId:'project:ipad-v917',projectRevision:1,instances:{[existingId]:{checks:clone(checks[existingId]),rowStages:{},progress:50,overrides:{'DBL-0':{minutes:17}},customItems:[]}},automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return {bytes:Buffer.from(await document.save()),existingId};
}

async function contextFor(browser){
 const context=await browser.newContext({
  viewport:{width:1366,height:900},screen:{width:1366,height:1024},hasTouch:true,isMobile:true,deviceScaleFactor:2,
  userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
 });
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  Object.defineProperty(Navigator.prototype,'platform',{configurable:true,get:()=> 'MacIntel'});
  Object.defineProperty(Navigator.prototype,'maxTouchPoints',{configurable:true,get:()=>5});
  window.__ipadCalls={matcher:0,workers:0,work:0,manual:[],scanOptions:null,hookCleanup:0};
  window.__fakeIpadFullScan=false;
  window.Tesseract={async createWorker(){__ipadCalls.workers++;throw Error('Direct marked-stamp linking must not start OCR')}};
  let matcher;
  Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:next=>{
   matcher={...next,scan:async options=>{
    __ipadCalls.matcher++;
    const forwardedIndex=(options.annotationIndex||[]).map(item=>({page:item.page,subject:item.subject,contents:item.contents,subtype:item.subtype,rect:item.rect}));
    __ipadCalls.scanOptions={pageScope:[...(options.pageScope||[])],scanPages:[...(options.scanPages||[])],imageLimits:{...(options.imageLimits||{})},annotationCount:forwardedIndex.length,annotationIndex:forwardedIndex,
     callbacks:{page:typeof options.onPageRelease==='function',canvas:typeof options.onCanvasRelease==='function',worker:typeof options.onWorkerRelease==='function'}};
    if(__fakeIpadFullScan){
     const proxy={cleanup(){__ipadCalls.hookCleanup++}},canvas={width:200,height:100};
     await options.onPageRelease({page:1,pageProxy:proxy});options.onCanvasRelease({page:1,scope:'drawing-image',canvas});
     __ipadCalls.scanOptions.releasedCanvas={width:canvas.width,height:canvas.height};
     return {version:2,hits:[],pages:[{page:1,count:0,scanMode:'text-and-image'}],warnings:[],appearance:null};
    }
    return next.scan(options);
   }};
  }});
  let work;
  Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:next=>{work={...next,read:async(...args)=>{__ipadCalls.work++;return next.read(...args)}}}});
 });
 return context;
}

async function openPrepared(page,input){
 await page.goto(url());
 await page.locator('#pwFile').setInputFiles({name:'generated-ipad-v917.pdf',mimeType:'application/pdf',buffer:input.bytes});
 await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden,{timeout:60000});
 await page.waitForFunction(()=>document.getElementById('pwCanvas').width>0);
 const annotationIndex=await page.evaluate(()=>SmartMatchAppBridge.getReadStampIndex());
 assert(annotationIndex.length>0,'reader exposes the annotation index after opening the prepared PDF');
 const subjectOnly=annotationIndex.find(item=>item.page===1&&item.subject==='WC');
 assert(subjectOnly,'the real /Stamp annotation keeps its WC /Subj value on drawing page 1');
 assert.equal(subjectOnly.contents,'','the fixture proves /Subj-only stamps do not require /Contents');
}

async function assertBoundedZoom(page,context){
 const profile=await page.evaluate(()=>SmartMatchAppBridge.getDrawingPerformanceProfile());
 assert.deepEqual(profile,{mobile:true,ios:true,ipad:true,iphone:false,phone:false,maxPixels:1650000,detailMaxPixels:650000,maxSide:3000},'a landscape 1366 px iPad using the Macintosh UA stays on the iPad path');
 const overview=await page.locator('#pwCanvas').evaluate(canvas=>({width:canvas.width,height:canvas.height,pixels:canvas.width*canvas.height}));
 assert(overview.pixels<=profile.maxPixels+5000&&overview.width<=profile.maxSide&&overview.height<=profile.maxSide,'overview bitmap is bounded');

 // Exercise the actual two-finger path that caused WebKit to promote the whole
 // drawing stage to a large GPU surface. Start with a real sharp crop: pinch
 // must release that crop and update only logical zoom/scroll state until the
 // bounded canvases are repainted after touchend.
 await page.waitForFunction(limit=>{const canvas=document.getElementById('pwDrawingDetail');return !canvas.hidden&&canvas.width*canvas.height>0&&canvas.width*canvas.height<=limit+5000},profile.detailMaxPixels,{timeout:15000});
 const detailBefore=await page.locator('#pwDrawingDetail').evaluate(canvas=>({width:canvas.width,height:canvas.height,pixels:canvas.width*canvas.height}));
 assert(detailBefore.pixels>0,'the gesture starts with a real sharp detail crop to release');
 await page.evaluate(()=>{
  const stage=document.getElementById('pwStage');window.__ipadPinchStageStyles=[];
  window.__ipadPinchStageObserver=new MutationObserver(()=>window.__ipadPinchStageStyles.push({transform:stage.style.transform,zoom:stage.style.zoom,willChange:stage.style.willChange}));
  window.__ipadPinchStageObserver.observe(stage,{attributes:true,attributeFilter:['style']});
 });
 const viewer=await page.locator('#pwViewer').boundingBox(),session=await context.newCDPSession(page),center={x:viewer.x+viewer.width*.5,y:viewer.y+viewer.height*.46};
 const touch=(id,x,y)=>({id,x,y,radiusX:2,radiusY:2,force:1});
 const pinchStartZoom=await page.locator('#pwZoomInfo').innerText();
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(1,center.x-45,center.y),touch(2,center.x+45,center.y)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(1,center.x-95,center.y),touch(2,center.x+95,center.y)]});
 await page.waitForFunction(start=>document.getElementById('pwZoomInfo').textContent!==start,pinchStartZoom);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const preview=await page.evaluate(()=>{
  const stage=document.getElementById('pwStage'),detail=document.getElementById('pwDrawingDetail'),computed=getComputedStyle(stage);
  window.__ipadPinchStageObserver.disconnect();
  return {zoom:stage.style.zoom,transform:stage.style.transform,computedTransform:computed.transform,willChange:computed.willChange,
   canvasPixels:document.getElementById('pwCanvas').width*document.getElementById('pwCanvas').height,
   detail:{hidden:detail.hidden,width:detail.width,height:detail.height},styles:window.__ipadPinchStageStyles};
 });
 assert.equal(preview.zoom,'');assert.equal(preview.transform,'');assert.equal(preview.computedTransform,'none');assert(!/transform/i.test(preview.willChange));
 assert(preview.styles.every(style=>!style.transform&&!style.zoom&&!/transform/i.test(style.willChange||'')),'no active-pinch style mutation promotes the complete stage to a transformed GPU layer');
 assert.deepEqual(preview.detail,{hidden:true,width:0,height:0},'pinch hides and releases the sharp detail canvas for the whole active gesture');
 assert.equal(preview.canvasPixels,overview.pixels,'pinch does not allocate a larger overview bitmap');
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
 await page.waitForFunction(start=>document.getElementById('pwStage').style.transform===''&&document.getElementById('pwZoomInfo').textContent!==start,pinchStartZoom,{timeout:15000});
 for(let index=0;index<16;index++)await page.locator('#pwZoomIn').click();
 await page.waitForFunction(()=>document.getElementById('pwZoomInfo').textContent==='300%'&&document.getElementById('pwStage').style.transform==='',{timeout:15000});
 const zoomed=await page.evaluate(()=>{
  const overview=document.getElementById('pwCanvas'),stage=document.getElementById('pwStage'),detail=document.getElementById('pwDrawingDetail');
  return {zoom:document.getElementById('pwZoomInfo').textContent,overviewPixels:overview.width*overview.height,stageWidth:parseFloat(stage.style.width),stageHeight:parseFloat(stage.style.height),detailPixels:detail.width*detail.height,detailHidden:detail.hidden};
 });
 assert.equal(zoomed.zoom,'300%');
 assert(zoomed.stageWidth<=900*3+1&&zoomed.stageHeight<=600*3+1,'logical stage obeys the iPad zoom clamp');
 assert(zoomed.overviewPixels<=profile.maxPixels+5000,'zoom never expands the whole-page bitmap');
 assert.equal(await page.locator('#pwMarkers .pwStampHit').count(),1,'rapid same-page zoom commits cannot duplicate the marker layer');
 await page.waitForFunction(limit=>{const canvas=document.getElementById('pwDrawingDetail');return !canvas.hidden&&canvas.width*canvas.height>0&&canvas.width*canvas.height<=limit+5000},profile.detailMaxPixels,{timeout:10000});
 const detail=await page.locator('#pwDrawingDetail').evaluate(canvas=>({pixels:canvas.width*canvas.height,styleWidth:parseFloat(canvas.style.width),styleHeight:parseFloat(canvas.style.height)}));
 assert(detail.pixels<=profile.detailMaxPixels+5000&&detail.styleWidth>0&&detail.styleHeight>0,'only the visible area receives a bounded sharp repaint');
 const giantLimit=await page.evaluate(()=>{const scale=SmartMatchAppBridge.getDrawingScaleLimit(9535.75,4767.87);return {scale,side:scale*9535.75}});
 assert(giantLimit.side<=8193&&giantLimit.scale<1,'a school-sized PDF page cannot create a logical iPad stage larger than 8192 CSS pixels');
 const memoryPolicy=await page.evaluate(()=>SmartMatchAppBridge.getDrawingMemoryPolicy(43*1024*1024));
 assert.deepEqual(memoryPolicy,{detail:false,detailFileLimit:24*1024*1024,pdfImageBudget:12*1024*1024},'a 43 MB screenshot-heavy project disables automatic detail rescans and constrains PDF image work');

 // The door-card pane used to retain a retina-size canvas at maximum zoom.
 // Verify the real 300% render is also constrained before returning to the plan.
 await page.evaluate(()=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions()[0]));
 await page.waitForSelector('#pwProtocol[open]');
 await page.locator('#pwProtocolMax').click();
 await page.waitForFunction(()=>document.getElementById('pwProtocolZoomInfo').textContent==='300%'&&document.getElementById('pwProtocolCanvas').width>0);
 const protocol=await page.locator('#pwProtocolCanvas').evaluate(canvas=>({width:canvas.width,height:canvas.height,pixels:canvas.width*canvas.height}));
 assert(protocol.pixels<=1805000&&protocol.width<=3001&&protocol.height<=3001,'maximum door-card zoom stays inside the iPad raster budget');
 await page.locator('#pwProtocolClose').click();
 await page.waitForFunction(()=>!document.getElementById('pwProtocol').open);
 console.log('PASS TEST 9.20 landscape iPad uses bounded canvases, a transform-free WebKit pinch and post-gesture sharp repaint');
}

async function directLink(page,input){
 const before=await page.evaluate(id=>{
  const payload=SmartMatchReadTest.payload(),position=SmartMatchAppBridge.getPositions().find(item=>item.id===id);
  const original=SmartMatchAppBridge.addManualReadPositions.bind(SmartMatchAppBridge);
  SmartMatchAppBridge.addManualReadPositions=async options=>{__ipadCalls.manual.push(JSON.parse(JSON.stringify(options)));return original(options)};
  return {check:position.checks['DBL-0'],work:payload.cards['generated-card:DBL'].work.slice(),checkState:JSON.parse(JSON.stringify(payload.checks[id]))};
 },input.existingId);
 await page.evaluate(rect=>SmartMatchReadExtraV94.setSample({page:1,rect}),sampleRect);
 await page.waitForFunction(()=>document.getElementById('exDialog')?.open&&!SmartMatchReadExtraV94.state().busy&&document.getElementById('exCode').value==='WC');
 assert.equal(await page.evaluate(()=>SmartMatchReadExtraV94.isIPad()),true);
 assert.equal(await page.locator('#exIpadInfo').isVisible(),true);
 assert.equal(await page.locator('#exMode').inputValue(),'text');
 await page.locator('#exCardPage').selectOption('3');
 await page.waitForFunction(()=>document.getElementById('exCardCode').value==='WC'&&!document.getElementById('exLinkSelected').disabled);
 await page.locator('#exLinkSelected').click();
 await page.waitForFunction(()=>SmartMatchReadExtraV94.state().result?.directOnly&&!SmartMatchReadExtraV94.state().busy);
 const review=await page.evaluate(()=>SmartMatchReadExtraV94.state().result);
 assert.equal(review.hits.length,1);assert.equal(review.hits[0].status,'available');assert.equal(review.hits[0].page,1);
 assert.equal(await page.locator('#exApply').innerText(),'Bekräfta kopplingen');
 assert.equal(await page.locator('.exHit').count(),1,'the exact marked rectangle becomes one visible review row');
 assert.deepEqual(await page.evaluate(()=>({matcher:__ipadCalls.matcher,workers:__ipadCalls.workers,work:__ipadCalls.work})),{matcher:0,workers:0,work:0},'review starts no matching scan, OCR or product read');
 await page.locator('#exApply').click();
 await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().length===2&&!SmartMatchReadExtraV94.state().busy);
 const after=await page.evaluate(id=>{
  const payload=SmartMatchReadTest.payload(),existing=SmartMatchAppBridge.getPositions().find(item=>item.id===id),added=SmartMatchAppBridge.getPositions().filter(item=>item.manual&&item.code==='WC');
  return {existingCheck:existing.checks['DBL-0'],existingWork:payload.cards['generated-card:DBL'].work,checkState:payload.checks[id],added,calls:JSON.parse(JSON.stringify(__ipadCalls))};
 },input.existingId);
 assert.equal(after.added.length,1);assert.equal(after.added[0].cardPage,3);assert.equal(after.added[0].drawingLabel,'WC');
 assert.equal(after.calls.manual.length,1);assert.equal(after.calls.manual[0].reviewedRestore,true);assert.equal(after.calls.manual[0].hits.length,1);
 assert.equal(after.existingCheck,before.check);assert.deepEqual(after.existingWork,before.work);assert.deepEqual(after.checkState,before.checkState,'existing work and checks survive the one-position transaction');
 assert.deepEqual({matcher:after.calls.matcher,workers:after.calls.workers,work:after.calls.work},{matcher:0,workers:0,work:0});

 // Repeating the direct review must classify the same physical rectangle as
 // linked and leave the confirmation action disabled.
 await page.locator('#exLinkSelected').click();
 await page.waitForFunction(()=>SmartMatchReadExtraV94.state().result?.hits?.[0]?.status==='linked'&&!SmartMatchReadExtraV94.state().busy);
 assert.equal(await page.locator('#exApply').isDisabled(),true);
 assert.equal(await page.evaluate(()=>SmartMatchAppBridge.getPositions().filter(item=>item.manual&&item.code==='WC').length),1);
 assert.equal(await page.evaluate(()=>__ipadCalls.manual.length),1);
 console.log('PASS TEST 9.20 direct marked-stamp review adds exactly one link without matcher/OCR/product reads and preserves existing work');
}

async function assertIpadFullSearchHandoff(page){
 await page.evaluate(()=>{
  window.__fakeIpadFullScan=true;__ipadCalls.indexGetter=0;__ipadCalls.indexReturned=0;__ipadCalls.indexSnapshot=[];__ipadCalls.pdfLibLoads=0;
  const getIndex=SmartMatchAppBridge.getReadStampIndex.bind(SmartMatchAppBridge);
  SmartMatchAppBridge.getReadStampIndex=async()=>{__ipadCalls.indexGetter++;const found=await getIndex();__ipadCalls.indexReturned=found.length;__ipadCalls.indexSnapshot=found.map(item=>({page:item.page,subject:item.subject,contents:item.contents,subtype:item.subtype,rect:item.rect}));return found};
  const load=PDFLib.PDFDocument.load;
  PDFLib.PDFDocument.load=async(...args)=>{__ipadCalls.pdfLibLoads++;return load.apply(PDFLib.PDFDocument,args)};
 });
 await page.locator('#exMode').selectOption('full');
 await page.locator('#exSearch').click();
 await page.waitForFunction(()=>__ipadCalls.matcher===1&&!SmartMatchReadExtraV94.state().busy);
 const calls=await page.evaluate(()=>JSON.parse(JSON.stringify(__ipadCalls)));
 assert.deepEqual(calls.scanOptions.pageScope,[1]);assert.deepEqual(calls.scanOptions.scanPages,[1]);
 assert.equal(calls.indexGetter,1,'iPad reuses the reader-owned annotation index');
 assert(calls.indexReturned>0,'the reused reader index contains the fixture stamp');
 assert(calls.indexSnapshot.some(item=>item.page===1&&item.subject==='WC'&&item.contents===''),'the bridge returns the page-1 /Subj-only WC stamp');
 assert.equal(calls.scanOptions.annotationCount,calls.indexReturned,'the complete existing index is forwarded to the matcher');
 assert(calls.scanOptions.annotationIndex.some(item=>item.page===1&&item.subject==='WC'&&item.contents===''),'full search forwards the existing WC stamp, including its page and subject');
 assert.equal(calls.pdfLibLoads,0,'iPad does not parse the large source again through PDFLib');
 assert.deepEqual(calls.scanOptions.callbacks,{page:true,canvas:true,worker:true});
 assert(calls.scanOptions.imageLimits.maxRasterPixels<=12000000&&calls.scanOptions.imageLimits.maxTilePixels<=410000&&calls.scanOptions.imageLimits.sampleMaxPixels<=700000,'the bounded iPad image profile reaches the matcher');
 assert.deepEqual(calls.scanOptions.releasedCanvas,{width:0,height:0});assert.equal(calls.hookCleanup,1,'extra-tool cleanup callback releases the supplied page proxy');
 assert.equal(calls.workers,0,'the mocked handoff itself does not create OCR work');
 console.log('PASS TEST 9.20 full-image action is page-scoped on iPad and forwards bounded limits plus cleanup callbacks');
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,context;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  context=await contextFor(browser);const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const input=await fixture();await openPrepared(page,input);await assertBoundedZoom(page,context);await directLink(page,input);await assertIpadFullSearchHandoff(page);
  assert.deepEqual(errors,[]);
 }finally{await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
