/* TEST 9.28 regression: passive DA/DS equipment stamps must remain visible,
 * compact and aligned on an iPad drawing at fit, overview and detail zoom.
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
const equipment=[
 {kind:'DA',rect:[260,650,420,770],room:[430,650,720,770]},
 {kind:'DS',rect:[980,610,1140,730],room:[1150,610,1450,730]}
];

const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end()}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end()}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-28.html`;

async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),plan=document.addPage([pageWidth,pageHeight]);
 plan.drawText('PLAN 2 – DA/DS iPad visibility',{x:70,y:920,size:28,font,color:rgb(.08,.16,.22)});
 for(let x=70;x<1730;x+=120)plan.drawLine({start:{x,y:80},end:{x,y:900},thickness:.5,color:rgb(.72,.76,.78)});
 for(let y=80;y<900;y+=100)plan.drawLine({start:{x:70,y},end:{x:1730,y},thickness:.5,color:rgb(.72,.76,.78)});
 // The source rectangles are deliberately large enough to keep the two-letter
 // code readable in an overview, with room names immediately beside them.
 plan.drawRectangle({x:260,y:650,width:160,height:120,color:rgb(.97,.88,.2)});
 plan.drawText('DA',{x:317,y:691,size:34,font,color:rgb(.07,.07,.07)});
 plan.drawText('KLASSRUM A101',{x:440,y:696,size:25,font,color:rgb(.08,.16,.22)});
 plan.drawRectangle({x:980,y:610,width:160,height:120,color:rgb(.97,.88,.2)});
 plan.drawText('DS',{x:1037,y:651,size:34,font,color:rgb(.07,.07,.07)});
 plan.drawText('KLASSRUM B204',{x:1160,y:656,size:25,font,color:rgb(.08,.16,.22)});

 const annotations=[
  document.context.register(document.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText('DA'),Contents:PDFHexString.fromText(''),Rect:equipment[0].rect,F:4,NM:PDFHexString.fromText('equipment-da')})),
  document.context.register(document.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText('Teknik'),Contents:PDFHexString.fromText('Dörrstängare'),Rect:equipment[1].rect,F:4,NM:PDFHexString.fromText('equipment-ds')})),
  // These are intentionally not equipment symbols.
  document.context.register(document.context.obj({Type:'Annot',Subtype:'FreeText',Subj:PDFHexString.fromText('DA'),Contents:PDFHexString.fromText('DA'),Rect:[90,180,210,240],F:4,NM:PDFHexString.fromText('free-text-da')})),
  document.context.register(document.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText('DBL-DS'),Contents:PDFHexString.fromText(''),Rect:[1440,180,1580,270],F:4,NM:PDFHexString.fromText('not-equipment')}))
 ];
 plan.node.set(PDFName.of('Annots'),document.context.obj(annotations));

 const card=document.addPage([595,842]);
 card.drawText('Beslagskod: GS1',{x:60,y:750,size:20,font});
 card.drawText('Dörrstängare DC700 GS',{x:60,y:670,size:15,font});
 // A DS stamp on a known card page proves that drawing-only filtering wins.
 card.node.set(PDFName.of('Annots'),document.context.obj([
  document.context.register(document.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText('DS'),Rect:[60,580,160,650],F:4,NM:PDFHexString.fromText('card-page-ds')}))
 ]));
 const cardId='generated-card:GS1';
 const cards={[cardId]:{id:cardId,page:2,code:'GS1',originalCardCode:'GS1',header:'Beslagskod: GS1',rawTable:'Dörrstängare DC700 GS',work:['Dörrstängare DC700'],
  workItems:[{key:'GS1-0',text:'Dörrstängare DC700',label:'Dörrstängare DC700',section:'Övrigt',sectionKey:'ovrigt'}],workState:'ready',workPolicy:'all',
  codeRect:{x:.08,y:.08,w:.8,h:.06},tableRect:{x:.08,y:.16,w:.8,h:.25},bounds:{x:.06,y:.06,w:.86,h:.4},choices:['GS1'],method:'PDF-text',confidence:100}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:equipment-symbols-browser-v927',rects:{code:{x:.08,y:.08,w:.8,h:.06},table:{x:.08,y:.16,w:.8,h:.25}},
  pages:[2],cards,checks:{},matching:{version:2,hits:[],pages:[{page:1,count:0,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated equipment symbols TEST 9.28'};
 const payload={schema:6,projectId:'project:equipment-symbols-browser-v927',projectRevision:1,instances:{},automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}

function overlaps(a,b,tolerance=.75){
 return a.right>b.left+tolerance&&a.left<b.right-tolerance&&a.bottom>b.top+tolerance&&a.top<b.bottom-tolerance;
}
function near(actual,expected,tolerance=1.25){return Math.abs(actual-expected)<=tolerance}

async function snapshot(page){
 return page.evaluate(({equipment,pageHeight})=>{
  const stage=document.getElementById('pwStage'),stageRect=stage.getBoundingClientRect(),scale=SmartMatchAppBridge.getScale();
  const symbols=[...document.querySelectorAll('#pwEquipmentSymbols .smEquipmentSymbol')].map(node=>{
   const rect=node.getBoundingClientRect(),style=getComputedStyle(node),kind=node.dataset.equipmentKind;
   return {kind,text:node.textContent||'',left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height,
    centerX:(rect.left+rect.right)/2,centerY:(rect.top+rect.bottom)/2,fontSize:parseFloat(style.fontSize||'0'),display:style.display,visibility:style.visibility,
    opacity:Number(style.opacity||1),naturalWidth:parseFloat(node.dataset.naturalWidth||'0'),naturalHeight:parseFloat(node.dataset.naturalHeight||'0'),
    background:style.backgroundColor,color:style.color,borderColor:style.borderColor,borderWidth:parseFloat(style.borderWidth||'0'),
    boxShadow:style.boxShadow,pointerEvents:style.pointerEvents,zIndex:Number(style.zIndex||0)};
  });
  const expected=equipment.map(item=>({kind:item.kind,
   centerX:stageRect.left+(item.rect[0]+item.rect[2])/2*scale,
   centerY:stageRect.top+(pageHeight-(item.rect[1]+item.rect[3])/2)*scale,
   stamp:{left:stageRect.left+item.rect[0]*scale,right:stageRect.left+item.rect[2]*scale,top:stageRect.top+(pageHeight-item.rect[3])*scale,bottom:stageRect.top+(pageHeight-item.rect[1])*scale},
   room:{left:stageRect.left+item.room[0]*scale,right:stageRect.left+item.room[2]*scale,top:stageRect.top+(pageHeight-item.room[3])*scale,bottom:stageRect.top+(pageHeight-item.room[1])*scale}}));
  const layer=document.getElementById('pwEquipmentSymbols'),layerStyle=getComputedStyle(layer);
  return {scale,symbols,expected,layer:{ariaHidden:layer.getAttribute('aria-hidden'),pointerEvents:layerStyle.pointerEvents},counts:{all:symbols.length,da:symbols.filter(item=>item.kind==='DA').length,ds:symbols.filter(item=>item.kind==='DS').length}};
 },{equipment,pageHeight});
}

function assertSymbols(state,phase){
 assert.deepEqual(state.counts,{all:2,da:1,ds:1},phase+': exactly one DA and one DS badge render');
 assert.equal(state.layer.ariaHidden,'true',phase+': passive symbol layer stays outside the accessibility tree');
 assert.equal(state.layer.pointerEvents,'none',phase+': passive symbol layer cannot block a linked GS stamp');
 for(const expected of state.expected){
  const item=state.symbols.find(symbol=>symbol.kind===expected.kind);assert(item,phase+': '+expected.kind+' remains present');
  assert.equal(item.text,expected.kind,phase+': '+expected.kind+' keeps its two-letter drawing code');
  assert.notEqual(item.display,'none',phase+': '+expected.kind+' is rendered');
  assert.equal(item.visibility,'visible',phase+': '+expected.kind+' is visible');
  assert(item.opacity>=.99,phase+': '+expected.kind+' stays opaque');
  assert(item.width>0&&item.height>0,phase+': '+expected.kind+' has a real footprint');
  assert(near(item.centerX,expected.centerX)&&near(item.centerY,expected.centerY),phase+': '+expected.kind+' stays centred on its PDF stamp');
  assert.match(item.background,/rgb\(255,\s*216,\s*61\)/,phase+': '+expected.kind+' uses the yellow stamp fill');
  assert.match(item.color,/rgb\(17,\s*17,\s*17\)/,phase+': '+expected.kind+' uses black text');
  assert.match(item.borderColor,/rgb\(17,\s*17,\s*17\)/,phase+': '+expected.kind+' uses a black border');
  assert(item.borderWidth>=1,phase+': '+expected.kind+' keeps a visible outline');
  assert.match(item.boxShadow,/rgb\(214,\s*50,\s*40\)/,phase+': '+expected.kind+' keeps the red inner marking');
  assert(item.fontSize>=10.5&&item.fontSize<=13.01,phase+': '+expected.kind+' text is readable without becoming oversized');
  assert(item.width>=23.9&&item.height>=17.9,phase+': '+expected.kind+' keeps its readable iPad floor');
  assert(item.width<=36.1&&item.height<=24.1,phase+': '+expected.kind+' never grows beyond the compact 36 x 24 px cap');
  assert(!overlaps(item,expected.room),phase+': '+expected.kind+' does not cover its neighbouring classroom name · '+JSON.stringify({badge:{left:item.left,right:item.right,top:item.top,bottom:item.bottom},room:expected.room,scale:state.scale}));
 }
}

async function instrument(page){
 await page.evaluate(()=>{
  const bridge=window.SmartMatchAppBridge,calls=window.__equipmentCalls={index:0,pageText:0,work:0,ocr:0,matcher:0};
  const index=bridge.getReadStampIndex.bind(bridge),pageText=bridge.readPageText?.bind(bridge),work=bridge.readWorkState?.bind(bridge);
  bridge.getReadStampIndex=(...args)=>{calls.index++;return index(...args)};
  if(pageText)bridge.readPageText=(...args)=>{calls.pageText++;return pageText(...args)};
  if(work)bridge.readWorkState=(...args)=>{calls.work++;return work(...args)};
  if(window.Tesseract?.createWorker){const create=window.Tesseract.createWorker.bind(window.Tesseract);window.Tesseract.createWorker=(...args)=>{calls.ocr++;return create(...args)}}
  if(window.SmartMatchReadMatcher?.scan){const matcher=window.SmartMatchReadMatcher;window.SmartMatchReadMatcher={...matcher,scan:(...args)=>{calls.matcher++;return matcher.scan(...args)}}}
 });
}

async function waitSymbols(page,count=2){
 await page.waitForFunction(count=>document.querySelectorAll('#pwEquipmentSymbols .smEquipmentSymbol').length===count,count,{timeout:15000});
}

async function runProfile(browser,profile,pdfBytes){
 const context=await browser.newContext({viewport:profile.viewport,screen:profile.viewport,hasTouch:true,isMobile:true,deviceScaleFactor:2,
  userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{Object.defineProperty(Navigator.prototype,'platform',{configurable:true,get:()=> 'MacIntel'});Object.defineProperty(Navigator.prototype,'maxTouchPoints',{configurable:true,get:()=>5})});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(url());
  await page.locator('#pwFile').setInputFiles({name:'generated-equipment-symbols-v927.pdf',mimeType:'application/pdf',buffer:pdfBytes});
  await page.waitForFunction(()=>SmartMatchAppBridge.getPdf()&&document.getElementById('pwScanOverlay').hidden,null,{timeout:30000});
  await waitSymbols(page);await instrument(page);
  await page.locator('#pwFit').click();await waitSymbols(page);
  const fitted=await snapshot(page);assertSymbols(fitted,profile.name+' fitted view');
  for(const item of fitted.symbols){assert(item.width>=30&&item.height>=23.9,profile.name+' fitted '+item.kind+' uses enough of its source stamp to be readable')}

  // Reach a real overview from both orientations without shrinking to the
  // absolute 8% limit where no two-letter stamp can remain legible.
  for(let guard=0;guard<5&&await page.evaluate(()=>SmartMatchAppBridge.getScale()>.35);guard++)await page.locator('#pwZoomOut').click();
  await page.waitForFunction(()=>SmartMatchAppBridge.getScale()<=.35&&document.querySelectorAll('#pwEquipmentSymbols .smEquipmentSymbol').length===2,null,{timeout:15000});
  const overview=await snapshot(page);assertSymbols(overview,profile.name+' overview');
  for(const before of fitted.symbols){
   const after=overview.symbols.find(item=>item.kind===before.kind);
   assert(after.naturalWidth<before.naturalWidth*.9&&after.naturalHeight<before.naturalHeight*.9,profile.name+' '+before.kind+' source footprint tracks the zoom while its badge may stay at the readable floor');
  }

  for(let index=0;index<6;index++)await page.locator('#pwZoomIn').click();
  await page.waitForFunction(start=>SmartMatchAppBridge.getScale()>=start+1.1&&document.querySelectorAll('#pwEquipmentSymbols .smEquipmentSymbol').length===2,overview.scale,{timeout:15000});
  const detail=await snapshot(page);assertSymbols(detail,profile.name+' detail zoom');
  for(const item of detail.symbols){assert(item.width>=30&&item.height>=23.9,profile.name+' detail '+item.kind+' remains readable at its capped size')}

  for(let index=0;index<3;index++)await page.locator('#pwFit').click();
  await waitSymbols(page);assert.equal(await page.locator('#pwEquipmentSymbols .smEquipmentSymbol').count(),2,profile.name+' repeated fit never duplicates DA/DS badges');
  await page.locator('#pwNext').click();
  await page.waitForFunction(()=>SmartMatchAppBridge.getPage()===2&&document.querySelectorAll('#pwEquipmentSymbols .smEquipmentSymbol').length===0,null,{timeout:15000});
  await page.locator('#pwPrev').click();await page.waitForFunction(()=>SmartMatchAppBridge.getPage()===1&&document.querySelectorAll('#pwEquipmentSymbols .smEquipmentSymbol').length===2,null,{timeout:15000});
  const restored=await snapshot(page);assertSymbols(restored,profile.name+' restored drawing page');

  const calls=await page.evaluate(()=>window.__equipmentCalls);
  assert(calls.index>0,profile.name+' reads the already prepared PDF stamp index');
  assert.deepEqual({pageText:calls.pageText,work:calls.work,ocr:calls.ocr,matcher:calls.matcher},{pageText:0,work:0,ocr:0,matcher:0},profile.name+' fit/zoom/page cycles start no page-text read, product read, OCR or matcher scan');
  assert.deepEqual(errors,[],profile.name+' has no page errors');
 }finally{await context.close()}
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const pdfBytes=await fixture();
  await runProfile(browser,{name:'iPad portrait',viewport:{width:820,height:1180}},pdfBytes);
  await runProfile(browser,{name:'iPad landscape',viewport:{width:1180,height:820}},pdfBytes);
  console.log('PASS TEST 9.28 iPad portrait/landscape keeps DA and DS readable, proportional and aligned at fit/overview/detail with no duplicate, OCR or full-text work');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
