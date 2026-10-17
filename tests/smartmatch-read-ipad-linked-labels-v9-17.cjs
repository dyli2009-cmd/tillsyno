/* TEST 9.17 regression: linked stamp codes must stay readable on iPad even
 * while the bounded PDF detail canvas is unavailable. Chromium only emulates
 * the iPad signals here; a physical iPad remains the WebKit memory test. */
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
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-17.html`;
const clone=value=>JSON.parse(JSON.stringify(value));

async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([1200,700]);
 const hits=[],checks={},cards={};
 const definitions=[
  {code:'GS1',rect:[130,500,205,560],cardPage:2,linked:true},
  {code:'GS2',rect:[535,300,610,360],cardPage:3,linked:true},
  {code:'DBL',rect:[925,495,1035,555],cardPage:0,linked:false}
 ];
 for(const [index,item] of definitions.entries()){
  const [x0,y0,x1,y1]=item.rect;
  plan.drawEllipse({x:(x0+x1)/2,y:(y0+y1)/2,xScale:(x1-x0)/2,yScale:(y1-y0)/2,color:rgb(1,.9,.02)});
  plan.drawText(item.code,{x:x0+7,y:y0+21,size:item.code.length>4?11:18,font});
  if(item.linked){
   const positionId='scan:'+item.code+'@1:'+item.rect.join(',');
   hits.push({page:1,code:item.code,positionId,rect:item.rect,box:{x:x0/1200,y:(700-y1)/700,w:(x1-x0)/1200,h:(y1-y0)/700},selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'project-code',order:870000+index,label:item.code});
   checks[positionId]={};
   const card=document.addPage([595,842]),id='generated-card:'+item.code,work=['Lås '+item.code,'Dörrstängare '+item.code];
   card.drawText('Beslagskod: '+item.code,{x:60,y:750,size:20,font});
   work.forEach((text,row)=>card.drawText(text,{x:60,y:670-row*30,size:15,font}));
   cards[id]={id,page:item.cardPage,code:item.code,originalCardCode:item.code,header:'Beslagskod: '+item.code,rawTable:work.join('\n'),work,
    workItems:work.map((text,row)=>({key:item.code+'-'+row,text,label:text,section:'Övrigt',sectionKey:'ovrigt'})),workState:'ready',workPolicy:'all',
    codeRect:{x:.08,y:.08,w:.80,h:.06},tableRect:{x:.08,y:.16,w:.80,h:.25},bounds:{x:.06,y:.06,w:.86,h:.40},choices:[item.code],method:'PDF-text',confidence:100};
  }
 }
 const readTestData={schema:1,phase:'full',sourceId:'generated:ipad-labels-v917',rects:{code:{x:.08,y:.08,w:.80,h:.06},table:{x:.08,y:.16,w:.80,h:.25}},pages:[2,3],cards,checks,
  matching:{version:2,hits,pages:[{page:1,count:hits.length,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated iPad labels TEST 9.17'};
 const instances={};for(const hit of hits)instances[hit.positionId]={checks:clone(checks[hit.positionId]),rowStages:{},progress:0,overrides:{},customItems:[]};
 const payload={schema:6,projectId:'project:ipad-labels-v917',projectRevision:1,instances,automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}

async function markerSnapshot(page){
 return page.locator('#pwMarkers .pwStampHit').evaluateAll(markers=>markers.map(marker=>{
  const labels=[...marker.querySelectorAll(':scope > .pwStampCodeLabel')],label=labels[0],style=label?getComputedStyle(label):null,rect=label?.getBoundingClientRect();
  return {code:marker.dataset.code||'',linked:marker.dataset.linked||'',labelCount:labels.length,text:label?.textContent||'',ariaHidden:label?.getAttribute('aria-hidden')||'',
   markerPointer:getComputedStyle(marker).pointerEvents,labelPointer:style?.pointerEvents||'',fontSize:parseFloat(style?.fontSize||'0'),background:style?.backgroundColor||'',
   visible:!!label&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>0&&rect.width>0&&rect.height>0};
 }));
}

function assertLabels(markers,phase){
 assert.equal(markers.length,3,phase+': all drawing positions remain present');
 const byCode=Object.fromEntries(markers.map(marker=>[marker.code,marker]));
 for(const code of ['GS1','GS2']){
  const marker=byCode[code];assert(marker,phase+': '+code+' marker exists');assert.equal(marker.linked,'true',phase+': '+code+' stays linked');
  assert.equal(marker.labelCount,1,phase+': '+code+' has exactly one code label');assert.equal(marker.text,code,phase+': label uses the saved drawing code');
  assert.equal(marker.ariaHidden,'true');assert.equal(marker.labelPointer,'auto',phase+': the complete overflow label remains tappable');assert.equal(marker.markerPointer,'auto');
  assert(marker.fontSize>=12,phase+': '+code+' remains readable at 12 CSS px or larger');assert(marker.visible,phase+': '+code+' label is visibly laid out');
  assert(!/^(?:transparent|rgba\(0, 0, 0, 0\))$/.test(marker.background),phase+': '+code+' has a contrasting label background');
 }
 const unlinked=markers.filter(marker=>marker.linked==='false');assert.equal(unlinked.length,1,phase+': unlinked marker remains present');assert.equal(unlinked[0].labelCount,0,phase+': unlinked drawing text is not presented as a confirmed link');
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
  await page.goto(url());await page.locator('#pwFile').setInputFiles({name:'generated-ipad-labels-v917.pdf',mimeType:'application/pdf',buffer:await fixture()});
  await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===2&&document.querySelectorAll('#pwMarkers .pwStampHit').length===2&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
  // Add one ordinary manual position with no card. Reader project data only
  // stores approved matches, while the work view also supports such unlinked
  // positions. It must keep its hit area without receiving a confirmed label.
  await page.evaluate(()=>{const input=document.getElementById('pmCode');input.value='DBL';input.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('pmAdd').click()});
  const stage=await page.locator('#pwStage').boundingBox();
  await page.mouse.click(stage.x+stage.width*.82,stage.y+stage.height*.24);
  await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().length===3&&document.querySelectorAll('#pwMarkers .pwStampHit').length===3);
  assertLabels(await markerSnapshot(page),'fit view');

  // The real crash-safe policy turns off PDF detail work for the user's large
  // projects. DOM labels must not depend on that second PDF render.
  assert.deepEqual(await page.evaluate(()=>SmartMatchAppBridge.getDrawingMemoryPolicy(43*1024*1024)),{detail:false,detailFileLimit:24*1024*1024,pdfImageBudget:12*1024*1024});

  // During an iPad pinch TEST 9.16 deliberately releases the detail canvas.
  // The saved linked codes must remain visible throughout that interval.
  await page.waitForFunction(()=>{const canvas=document.getElementById('pwDrawingDetail');return !canvas.hidden&&canvas.width*canvas.height>0},{timeout:15000});
  await page.evaluate(()=>{
   const viewer=document.getElementById('pwViewer'),rect=viewer.getBoundingClientRect(),x=rect.left+rect.width*.5,y=rect.top+rect.height*.48;
   const make=(id,clientX)=>new Touch({identifier:id,target:viewer,clientX,clientY:y,pageX:clientX,pageY:y,screenX:clientX,screenY:y,radiusX:2,radiusY:2,force:1});
   const start=[make(1,x-42),make(2,x+42)],move=[make(1,x-88),make(2,x+88)];
   viewer.dispatchEvent(new TouchEvent('touchstart',{touches:start,targetTouches:start,changedTouches:start,bubbles:true,cancelable:true}));
   viewer.dispatchEvent(new TouchEvent('touchmove',{touches:move,targetTouches:move,changedTouches:move,bubbles:true,cancelable:true}));
   window.__finishLabelPinch=()=>viewer.dispatchEvent(new TouchEvent('touchend',{touches:[],targetTouches:[],changedTouches:move,bubbles:true,cancelable:true}));
  });
  await page.waitForFunction(()=>{const canvas=document.getElementById('pwDrawingDetail');return canvas.hidden&&canvas.width===0&&canvas.height===0});
  const activeDetail=await page.locator('#pwDrawingDetail').evaluate(canvas=>({hidden:canvas.hidden,width:canvas.width,height:canvas.height}));
  assert.deepEqual(activeDetail,{hidden:true,width:0,height:0},'active iPad pinch releases the PDF detail surface');
  assertLabels(await markerSnapshot(page),'active pinch without detail canvas');
  await page.evaluate(()=>window.__finishLabelPinch());
  await page.waitForFunction(()=>document.querySelectorAll('#pwMarkers .pwStampHit').length===3);

  // Repeated async marker rerenders used to race. Each linked stamp must still
  // have one label after rapid zoom commits, never duplicated children.
  for(let index=0;index<12;index++)await page.locator(index%3===0?'#pwZoomOut':'#pwZoomIn').click();
  await page.waitForFunction(()=>document.querySelectorAll('#pwMarkers .pwStampHit').length===3);
  assertLabels(await markerSnapshot(page),'rapid zoom rerenders');

  // The label is presentation-only; the original marker button still opens
  // the correct linked door card.
  await page.locator('#pwMarkers .pwStampHit[data-code="GS1"] > .pwStampCodeLabel').click();
  await page.waitForSelector('#pwProtocol[open]');
  assert.equal(await page.locator('#pwProtocolCode').innerText(),'GS1');
  await page.locator('#pwProtocolClose').click();await page.waitForFunction(()=>!document.getElementById('pwProtocol').open);
  assert.deepEqual(errors,[]);
  console.log('PASS TEST 9.17 iPad keeps linked GS1/GS2 labels readable without a detail canvas, through pinch/rerenders, and markers remain clickable');
 }finally{await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
