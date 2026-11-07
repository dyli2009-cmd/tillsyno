/* TEST 9.26 regression: a linked iPad position gets one compact, readable
 * yellow/black/red stamp replica. It follows a small source stamp down in an
 * overview, while its progress stays readable below the code at every zoom.
 * Chromium emulates the iPad signals; a physical iPad remains the final
 * WebKit/visual check. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const pageWidth=1800,pageHeight=1000;
const definitions=[
 {code:'GS1',stamp:'GS1',progress:55,rect:[270,650,390,730],subtype:'Circle',shape:'ellipse',room:[396,640,650,745],fill:'yellow'},
 // Saved card identifiers are normalized, while drawingLabel preserves the
 // punctuation printed inside the original project stamp.
 {code:'DBLOPPS',stamp:'DBL-OPPS',progress:100,rect:[760,600,840,680],subtype:'Square',shape:'rectangle',room:[846,590,1120,690],fill:'green'},
 {code:'WC',stamp:'WC',progress:0,rect:[1240,650,1340,720],subtype:'Circle',shape:'ellipse',room:[1348,640,1605,735],fill:'yellow'}
];
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end()}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end()}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-26.html`;

async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([pageWidth,pageHeight]);
 // Deliberately place classroom names immediately beside each stamp. A label
 // that keeps a fixed 12 px chip while the plan shrinks will cover these names.
 plan.drawEllipse({x:330,y:690,xScale:60,yScale:40,color:rgb(1,.88,.02)});
 plan.drawText('GS1',{x:310,y:680,size:23,font,color:rgb(.08,.08,.08)});
 plan.drawText('KLASSRUM A101',{x:400,y:676,size:24,font,color:rgb(.08,.16,.22)});
 plan.drawRectangle({x:760,y:600,width:80,height:80,color:rgb(.37,.78,.34)});
 plan.drawText('DBL-OPPS',{x:763,y:632,size:10,font,color:rgb(.04,.08,.04)});
 plan.drawText('KLASSRUM B204',{x:850,y:628,size:24,font,color:rgb(.08,.16,.22)});
 plan.drawEllipse({x:1290,y:685,xScale:50,yScale:35,color:rgb(1,.88,.02)});
 plan.drawText('WC',{x:1274,y:676,size:22,font,color:rgb(.08,.08,.08)});
 plan.drawText('KLASSRUM C305',{x:1350,y:674,size:24,font,color:rgb(.08,.16,.22)});
 // Thin surrounding plan text/lines are useful for spotting accidental masks.
 for(let x=80;x<1720;x+=150)plan.drawLine({start:{x,y:100},end:{x,y:900},thickness:.5,color:rgb(.72,.76,.78)});
 const hits=[],checks={},cards={},instances={};
 for(const [index,item] of definitions.entries()){
  const [x0,y0,x1,y1]=item.rect,positionId='scan:'+item.code+'@1:'+item.rect.join(','),cardId='generated-card:'+item.code;
  hits.push({page:1,code:item.code,positionId,rect:item.rect,box:{x:x0/pageWidth,y:(pageHeight-y1)/pageHeight,w:(x1-x0)/pageWidth,h:(y1-y0)/pageHeight},selected:true,
   source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'project-code',subtype:item.subtype,order:870000+index,label:item.stamp,drawingLabel:item.stamp});
  checks[positionId]={};instances[positionId]={checks:{},rowStages:{},progress:item.progress,overrides:{},customItems:[]};
  const card=document.addPage([595,842]),work=['Dörrstängare '+item.code];
  card.drawText('Beslagskod: '+item.code,{x:60,y:750,size:20,font});card.drawText(work[0],{x:60,y:670,size:15,font});
  cards[cardId]={id:cardId,page:index+2,code:item.code,originalCardCode:item.code,header:'Beslagskod: '+item.code,rawTable:work[0],work,
   workItems:[{key:item.code+'-0',text:work[0],label:work[0],section:'Övrigt',sectionKey:'ovrigt'}],workState:'ready',workPolicy:'all',
   codeRect:{x:.08,y:.08,w:.8,h:.06},tableRect:{x:.08,y:.16,w:.8,h:.25},bounds:{x:.06,y:.06,w:.86,h:.4},choices:[item.code],method:'PDF-text',confidence:100};
 }
 const readTestData={schema:1,phase:'full',sourceId:'generated:ipad-stamp-footprint-v921',rects:{code:{x:.08,y:.08,w:.8,h:.06},table:{x:.08,y:.16,w:.8,h:.25}},
  pages:definitions.map((_,index)=>index+2),cards,checks,matching:{version:2,hits,pages:[{page:1,count:hits.length,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},
  drawingSample:null,name:'Generated iPad stamp footprint TEST 9.26'};
 const payload={schema:6,projectId:'project:ipad-stamp-footprint-v921',projectRevision:1,instances,automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}

function overlaps(a,b,tolerance=.75){
 return a.right>b.left+tolerance&&a.left<b.right-tolerance&&a.bottom>b.top+tolerance&&a.top<b.bottom-tolerance;
}
async function snapshot(page){
 return page.evaluate(({definitions,pageWidth,pageHeight})=>{
  const canvas=document.getElementById('pwCanvas'),canvasRect=canvas.getBoundingClientRect();
  return definitions.map(item=>{
   const positionId='scan:'+item.code+'@1:'+item.rect.join(','),marker=document.querySelector('#pwMarkers .pwStampHit[data-position-id="'+CSS.escape(positionId)+'"]'),replica=marker?.querySelector(':scope > .pwStampReplica'),badge=marker?.querySelector(':scope > .pwProgressBadge');
   const markerStyle=marker?getComputedStyle(marker):null,replicaStyle=replica?getComputedStyle(replica):null,badgeStyle=badge?getComputedStyle(badge):null;
   const markerRect=marker?.getBoundingClientRect(),replicaRect=replica?.getBoundingClientRect(),badgeRect=badge?.getBoundingClientRect();
   const [rx0,ry0,rx1,ry1]=item.room,room={left:canvasRect.left+rx0/pageWidth*canvasRect.width,right:canvasRect.left+rx1/pageWidth*canvasRect.width,
    top:canvasRect.top+(pageHeight-ry1)/pageHeight*canvasRect.height,bottom:canvasRect.top+(pageHeight-ry0)/pageHeight*canvasRect.height};
   return {code:item.code,stamp:item.stamp,progress:item.progress,positionId,shape:marker?.dataset.hitShape||'',totalBadges:document.querySelectorAll('#pwMarkers .pwStampHit > .pwProgressBadge').length,
    marker:{left:markerRect?.left||0,top:markerRect?.top||0,right:markerRect?.right||0,bottom:markerRect?.bottom||0,
      width:markerRect?.width||0,height:markerRect?.height||0,background:markerStyle?.backgroundColor||'',borderRadius:markerStyle?.borderRadius||'',pointer:markerStyle?.pointerEvents||'',native:marker?.dataset.nativeStamp||'',
      positionId:marker?.dataset.positionId||'',progress:marker?.dataset.progress||'',compact:marker?.dataset.progressCompact||'',ariaLabel:marker?.getAttribute('aria-label')||''},
    replicaCount:marker?.querySelectorAll(':scope > .pwStampReplica').length||0,
    replica:replica?{text:replica.textContent||'',lines:replica.querySelectorAll(':scope > span').length,left:replicaRect?.left||0,top:replicaRect?.top||0,right:replicaRect?.right||0,bottom:replicaRect?.bottom||0,
      width:replicaRect?.width||0,height:replicaRect?.height||0,background:replicaStyle?.backgroundColor||'',color:replicaStyle?.color||'',borderColor:replicaStyle?.borderColor||'',
      borderRadius:replicaStyle?.borderRadius||'',boxShadow:replicaStyle?.boxShadow||'',fontSize:parseFloat(replicaStyle?.fontSize||'0'),hidden:replica?.classList.contains('pwStampReplicaTextHidden')||false,
      zIndex:Number(replicaStyle?.zIndex||0)}:null,
    badgeCount:marker?.querySelectorAll(':scope > .pwProgressBadge').length||0,
    badge:badge?{text:badge.textContent||'',left:badgeRect?.left||0,top:badgeRect?.top||0,right:badgeRect?.right||0,bottom:badgeRect?.bottom||0,
      width:badgeRect?.width||0,height:badgeRect?.height||0,zIndex:Number(badgeStyle?.zIndex||0),fontSize:parseFloat(badgeStyle?.fontSize||'0'),
      background:badgeStyle?.backgroundColor||'',color:badgeStyle?.color||'',display:badgeStyle?.display||'',opacity:Number(badgeStyle?.opacity||1)}:null,room};
  });
 },{definitions,pageWidth,pageHeight});
}
function assertReplica(items,phase){
 assert.equal(items.length,definitions.length,phase+': all linked stamps remain present');
 for(const item of items){
  assert.equal(item.replicaCount,1,phase+': '+item.code+' gets exactly one compact replica');
  assert.equal(item.replica?.text,item.stamp,phase+': '+item.code+' displays its drawing code');
  assert.equal(item.marker.native,'true',phase+': '+item.code+' retains the native-stamp marker contract');
  assert.equal(item.marker.pointer,'auto',phase+': '+item.code+' marker remains clickable');
  assert.equal(item.shape,definitions.find(definition=>definition.code===item.code).shape,phase+': '+item.code+' retains the saved PDF stamp shape');
  assert.match(item.replica.background,/rgb\(255,\s*216,\s*61\)/,phase+': '+item.code+' replica has the high-contrast yellow fill');
  if(item.replica.hidden){
   assert(item.replica.width<34||item.replica.height<20,phase+': '+item.code+' hides text only when its overview footprint is too small to read safely');
  }else{
   assert.match(item.replica.color,/rgb\(17,\s*17,\s*17\)/,phase+': '+item.code+' replica has black text');
  }
  assert.match(item.replica.borderColor,/rgb\(17,\s*17,\s*17\)/,phase+': '+item.code+' replica has a black border');
  assert.match(item.replica.boxShadow,/rgb\(214,\s*50,\s*40\)/,phase+': '+item.code+' replica keeps the red inner marking');
  assert(item.replica.width<=72.1&&item.replica.height<=36.1,phase+': '+item.code+' replica never grows past 72 x 36 px');
  assert(item.replica.fontSize<=11.01,phase+': '+item.code+' code text never grows past 11 px');
  assert(!overlaps(item.replica,item.room),phase+': '+item.code+' compact replica does not cover the neighbouring classroom name');
  if(item.badge){
   assert(item.badge.zIndex>item.replica.zIndex,phase+': '+item.code+' progress remains a separate status layer');
   assert(!overlaps(item.badge,item.replica),phase+': '+item.code+' progress does not cover the stamp code');
  }
 }
}
function near(actual,expected,tolerance=.15){return Math.abs(actual-expected)<=tolerance}
function assertProgress(items,phase,compact){
 const withProgress=definitions.filter(item=>item.progress>0);
 assert.equal(items[0]?.totalBadges,withProgress.length,phase+': marker layer has exactly one badge for each nonzero position');
 for(const item of items){
  assert.equal(item.marker.positionId,item.positionId,phase+': '+item.code+' badge data stays on its own saved position');
  assert.equal(item.marker.progress,String(item.progress),phase+': '+item.code+' marker keeps the position progress');
  assert.match(item.marker.ariaLabel,new RegExp('(?:^| · )'+item.progress+'%'),phase+': '+item.code+' accessible label keeps the same progress');
  if(item.progress===0){
   assert.equal(item.badgeCount,0,phase+': '+item.code+' at zero percent has no badge');
   assert.equal(item.badge,null,phase+': '+item.code+' at zero percent leaves no hidden duplicate badge');
   continue;
  }
  assert.equal(item.badgeCount,1,phase+': '+item.code+' has exactly one progress badge');
  assert.equal(item.badge?.text,item.progress+'%',phase+': '+item.code+' displays the correct percentage');
  assert.equal(item.marker.compact,compact?'true':'false',phase+': '+item.code+' uses the expected progress size mode');
  assert(near(item.badge.width,compact?28:30)&&near(item.badge.height,compact?18:20),phase+': '+item.code+' badge is '+(compact?'28 x 18':'30 x 20')+' px');
  assert(near(item.badge.fontSize,compact?8:9,.05),phase+': '+item.code+' badge text is '+(compact?8:9)+' px');
  assert.equal(item.badge.display,'grid',phase+': '+item.code+' percentage remains visibly rendered');
  assert(item.badge.opacity>=.99,phase+': '+item.code+' percentage remains opaque');
  assert.match(item.badge.color,/rgb\(255,\s*255,\s*255\)/,phase+': '+item.code+' percentage uses white text');
  if(item.progress===100)assert.match(item.badge.background,/rgb\(35,\s*131,\s*84\)/,phase+': completed '+item.code+' uses the green badge');
  else assert.match(item.badge.background,/rgb\(23,\s*55,\s*70\)/,phase+': partial '+item.code+' uses the dark badge');
  assert(item.badge.zIndex>item.replica.zIndex,phase+': '+item.code+' progress remains a separate status layer');
  assert(item.badge.top-item.replica.bottom>=2.8,phase+': '+item.code+' progress stays at least 3 px below the replica');
  assert(Math.abs((item.badge.left+item.badge.right)/2-(item.replica.left+item.replica.right)/2)<=.2,phase+': '+item.code+' progress stays centred on its own position');
  assert(!overlaps(item.badge,item.replica),phase+': '+item.code+' progress never covers the stamp code');
 }
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
  await page.goto(url());await page.locator('#pwFile').setInputFiles({name:'generated-ipad-stamp-footprint-v921.pdf',mimeType:'application/pdf',buffer:await fixture()});
  try{await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&document.getElementById('pwScanOverlay').hidden,null,{timeout:30000})}
  catch(error){const state=await page.evaluate(()=>({hasPdf:!!SmartMatchAppBridge.getPdf(),positions:SmartMatchAppBridge.getPositions().length,overlayHidden:document.getElementById('pwScanOverlay').hidden,status:document.getElementById('pwScanStatus')?.textContent||''}));throw new Error(error.message+' · '+JSON.stringify({state,errors}))}
  await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().length===3&&document.querySelectorAll('#pwMarkers .pwStampHit').length===3,null,{timeout:15000});
  // Isolate badge presentation from checklist/time settings: inject three
  // distinct saved-looking states and ask the regular fit action to re-render.
  await page.evaluate(definitions=>{
   const positions=SmartMatchAppBridge.getPositions();
   for(const item of definitions){
    const positionId='scan:'+item.code+'@1:'+item.rect.join(','),position=positions.find(candidate=>candidate.id===positionId);
    if(position)position.progress=item.progress;
   }
  },definitions);
  await page.locator('#pwFit').click();
  await page.waitForFunction(()=>document.querySelectorAll('#pwMarkers .pwProgressBadge').length===2&&document.querySelectorAll('#pwMarkers .pwStampHit').length===3);

  const initialScale=await page.evaluate(()=>SmartMatchAppBridge.getScale()),initial=await snapshot(page);assertReplica(initial,'initial view');
  assertProgress(initial,'initial view',false);
  assert(/50%/.test(initial.find(item=>item.code==='GS1').replica.borderRadius),'the circular source stamp gets a circular replica');
  assert(parseFloat(initial.find(item=>item.code==='DBLOPPS').replica.borderRadius)<=2.1,'the square source stamp gets a square replica');
  assert(initial.every(item=>!item.replica.hidden&&item.replica.fontSize>=4),'all stamp codes are readable at the fitted opening view');
  assert.equal(initial.find(item=>item.code==='DBLOPPS').replica.lines,2,'the long square DBL code uses two readable rows at its own dash');

  // In a far overview, the stamp shrinks but its progress keeps a readable
  // compact 28 x 18 px presentation instead of disappearing.
  for(let index=0;index<2;index++)await page.locator('#pwZoomOut').click();
  await page.waitForFunction(start=>SmartMatchAppBridge.getScale()<=Math.max(.08,start-.39)&&document.querySelectorAll('#pwMarkers .pwStampHit').length===3,initialScale,{timeout:15000});
  const zoomedOutScale=await page.evaluate(()=>SmartMatchAppBridge.getScale()),zoomedOut=await snapshot(page);assertReplica(zoomedOut,'far overview');
  assertProgress(zoomedOut,'far overview',true);
  for(const before of initial){
   const after=zoomedOut.find(item=>item.code===before.code);
   assert(after.replica.width<before.replica.width*.55&&after.replica.height<before.replica.height*.75,before.code+' replica follows the source stamp down with the drawing');
  }
  // Zooming in reveals the same code inside the original coloured/formed icon.
  for(let index=0;index<6;index++)await page.locator('#pwZoomIn').click();
  await page.waitForFunction(start=>SmartMatchAppBridge.getScale()>=start+1.19&&document.querySelectorAll('#pwMarkers .pwStampHit').length===3,zoomedOutScale,{timeout:15000});
  const zoomedIn=await snapshot(page);assertReplica(zoomedIn,'zoomed-in detail');
  assertProgress(zoomedIn,'zoomed-in detail',false);
  for(const initialItem of initial){
   const detail=zoomedIn.find(item=>item.code===initialItem.code);
   assert(Math.abs(detail.replica.width-initialItem.replica.width)<=.2&&Math.abs(detail.replica.height-initialItem.replica.height)<=.2,
    initialItem.code+' replica stops growing once its compact detail cap is reached');
  }
  // Complete rerenders must replace the marker layer, never append another
  // percentage for an already rendered position.
  for(let index=0;index<4;index++)await page.locator('#pwFit').click();
  await page.waitForFunction(()=>document.querySelectorAll('#pwMarkers .pwStampHit').length===3&&document.querySelectorAll('#pwMarkers .pwProgressBadge').length===2);
  const rerendered=await snapshot(page);assertReplica(rerendered,'repeated fit rerender');assertProgress(rerendered,'repeated fit rerender',false);
  await page.locator('#pwMarkers .pwStampHit[data-code="DBL-OPPS"]').click();
  await page.waitForSelector('#pwProtocol[open]');
  assert.equal(await page.locator('#pwProtocolCode').innerText(),'DBL-OPPS','the protocol keeps the original drawing label');
  assert.match(await page.locator('#pwProtocolCode').getAttribute('title'),/dörrkort: DBLOPPS/,'the fitted stamp still opens its linked normalized door card');
  assert.deepEqual(errors,[]);
  console.log('PASS TEST 9.26 iPad keeps partial and complete progress readable below the right stamp at overview/detail sizes, omits zero percent and creates no duplicates');
 }finally{await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
