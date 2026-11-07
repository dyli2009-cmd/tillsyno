/* Avläsning TEST 9.29: a small OCR area is independent of the original-card
 * display. One physical card on a PDF page shows the complete page, while two
 * physical cards on one page keep their reviewed per-card bounds. The saved
 * protocol definition still contains only work from the selected scan area.
 * Generated PDF only. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');

const root=path.resolve(__dirname,'..');
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-29.html`;
const pageSize={width:600,height:800};
const singleScan={x:.08,y:.17,w:.84,h:.10},singleBounds={x:.075,y:.12,w:.85,h:.20};
const upperBounds={x:.05,y:.04,w:.90,h:.42},lowerBounds={x:.05,y:.54,w:.90,h:.42};

function item(code,label,value,row){
 return {key:code+'-'+row,text:label+' · '+value,legacyText:label+' · '+value,label,value,quantity:1,section:'Övrig utrustning',sectionKey:'ovrig-utrustning',tableIndex:0,sourceRow:row,sourceIdentity:`gs:0:${row}:ovrig-utrustning:${label}:${value}`.toLocaleLowerCase('sv-SE'),responsibility:'GS'};
}
function card(id,page,code,codeRect,tableRect,bounds,workItem){
 return {id,page,code,originalCardCode:code,header:'Beslagskod: '+code,codeRect,tableRect,bounds,rawTable:workItem.label+' '+workItem.value+' GS',tableWords:[{text:workItem.label,x:50,y:120,w:100,h:14,confidence:100},{text:workItem.value,x:180,y:120,w:70,h:14,confidence:100},{text:'GS',x:500,y:120,w:25,h:14,confidence:100}],work:[workItem.text],workItems:[workItem],workWarnings:['Kontrollerad varning behålls'],workState:'ready',workPolicy:'gs-install-v3',choices:[code],method:'PDF-text i markeringen',confidence:100};
}
function hit(code,id,x,y,cardPage){
 const rect=[x,y,x+55,y+26];
 return {page:1,code,rect,box:{x:rect[0]/pageSize.width,y:(pageSize.height-rect[3])/pageSize.height,w:(rect[2]-rect[0])/pageSize.width,h:(rect[3]-rect[1])/pageSize.height},positionId:id,cardPage,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000+x};
}
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const drawing=document.addPage([pageSize.width,pageSize.height]);
 drawing.drawText('GS1',{x:55,y:690,size:18,font:bold});drawing.drawText('GS2',{x:265,y:690,size:18,font:bold});drawing.drawText('GS3',{x:470,y:690,size:18,font:bold});
 const one=document.addPage([pageSize.width,pageSize.height]);
 one.drawText('HELA DORRKORTSSIDAN SKA SYNAS',{x:55,y:755,size:16,font:bold});
 one.drawText('Beslagskod: GS1',{x:55,y:690,size:16,font:bold});
 one.drawText('Dorrstangare DC700 GS',{x:55,y:640,size:13,font});
 one.drawText('UTANFOR MARKERINGEN FAR INTE BLI KONTROLLPUNKT',{x:55,y:180,size:12,font});
 const two=document.addPage([pageSize.width,pageSize.height]);
 two.drawText('Beslagskod: GS2',{x:45,y:750,size:16,font:bold});two.drawText('Trycke 6696 GS',{x:45,y:700,size:13,font});
 two.drawText('Beslagskod: GS3',{x:45,y:350,size:16,font:bold});two.drawText('Slutbleck ST400 GS',{x:45,y:300,size:13,font});
 const dc=item('GS1','Dörrstängare','DC700',2),handle=item('GS2','Trycke','6696',2),strike=item('GS3','Slutbleck','ST400',2);
 const codeSingle={x:.08,y:.11,w:.42,h:.05},codeUpper={x:.07,y:.045,w:.42,h:.05},tableUpper={x:.07,y:.10,w:.84,h:.08},codeLower={x:.07,y:.545,w:.42,h:.05},tableLower={x:.07,y:.60,w:.84,h:.08};
 const cards={
  single:card('single',2,'GS1',codeSingle,singleScan,singleBounds,dc),
  upper:card('upper',3,'GS2',codeUpper,tableUpper,upperBounds,handle),
  lower:card('lower',3,'GS3',codeLower,tableLower,lowerBounds,strike)
 };
 const hits=[hit('GS1','door-gs1',50,680,2),hit('GS2','door-gs2',260,680,3),hit('GS3','door-gs3',465,680,3)];
 const checks=Object.fromEntries(hits.map(entry=>[entry.positionId,{[cards[entry.code==='GS1'?'single':entry.code==='GS2'?'upper':'lower'].workItems[0].key]:false}]));
 const readTestData={schema:1,phase:'full',sourceId:'generated:scan-display-v929',rects:{code:codeSingle,table:singleScan},pages:[2,3],cards,checks,matching:{version:2,hits,pages:[{page:1,count:3,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Scan och visning TEST 9.29'};
 const payload={schema:6,projectId:'project:scan-display-v929',projectRevision:1,instances:Object.fromEntries(hits.map(entry=>[entry.positionId,{checks:checks[entry.positionId],rowStages:{},progress:0,overrides:{},customItems:[]} ])),automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}
async function contextFor(browser,{ipad=false}={}){
 const options=ipad?{viewport:{width:1180,height:820},screen:{width:1180,height:820},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:1400,height:920}};
 const context=await browser.newContext({...options,locale:'sv-SE'});
 await context.addInitScript(()=>{if(/Macintosh/.test(navigator.userAgent))Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5});});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 return context;
}
async function openPrepared(page,bytes){
 await page.goto(url());await page.locator('#pwFile').setInputFiles({name:'scan-display-v929.pdf',mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf?.()&&SmartMatchAppBridge.getPositions().length===3&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
}
async function openPosition(page,id){
 await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);
 await page.waitForSelector('#pwProtocol[open]');await page.waitForFunction(()=>!!document.getElementById('pwProtocolCanvas')?.dataset.readCardId&&document.getElementById('pwProtocolCanvas').width>0);
}
async function closePosition(page){await page.locator('#pwProtocolClose').click();await page.waitForFunction(()=>!document.getElementById('pwProtocol').open);}
function near(actual,expected,tolerance=.035){assert(Math.abs(actual-expected)<=tolerance,`${actual} should be within ${tolerance} of ${expected}`);}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const bytes=await fixture();
  const context=await contextFor(browser),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await openPrepared(page,bytes);
   const regions=await page.evaluate(()=>({
    singleScan:SmartMatchReadTest.cardRegion('GS1',2),singleDisplay:SmartMatchReadTest.cardDisplayRegion('GS1',2),
    upperScan:SmartMatchReadTest.cardRegion('GS2',3),upperDisplay:SmartMatchReadTest.cardDisplayRegion('GS2',3),
    lowerDisplay:SmartMatchReadTest.cardDisplayRegion('GS3',3),def:SmartMatchReadTest.protocolDef('GS1',2)
   }));
   assert.deepEqual(regions.singleScan,singleBounds,'the scan/protocol source region stays the reviewed small physical bounds');
   assert.deepEqual(regions.singleDisplay,{x:0,y:0,w:1,h:1},'one physical source card on a page displays the complete original page');
   assert.deepEqual(regions.upperScan,upperBounds);assert.deepEqual(regions.upperDisplay,upperBounds,'a shared page retains the upper card boundary');assert.deepEqual(regions.lowerDisplay,lowerBounds,'a shared page retains the lower card boundary');
   assert.deepEqual(regions.def.lines.map(line=>line.value),['DC700'],'the protocol definition uses the reviewed scan result only');
   assert(!JSON.stringify(regions.def).includes('UTANFOR'),'text outside the small scan region never becomes a checklist item');

   await openPosition(page,'door-gs1');
   const single=await page.locator('#pwProtocolCanvas').evaluate(canvas=>({ratio:canvas.width/canvas.height,cssRatio:parseFloat(canvas.style.width)/parseFloat(canvas.style.height),id:canvas.dataset.readCardId}));
   assert.equal(single.id,'single');near(single.ratio,pageSize.width/pageSize.height);near(single.cssRatio,pageSize.width/pageSize.height);
   assert.equal(await page.locator('#pwChecklist .pwCheckRow').count(),1);assert.match(await page.locator('#pwChecklist').innerText(),/DC700/);assert.doesNotMatch(await page.locator('#pwChecklist').innerText(),/UTANFOR/i);
   await closePosition(page);await openPosition(page,'door-gs2');
   const upper=await page.locator('#pwProtocolCanvas').evaluate(canvas=>({ratio:canvas.width/canvas.height,id:canvas.dataset.readCardId}));assert.equal(upper.id,'upper');near(upper.ratio,(pageSize.width*upperBounds.w)/(pageSize.height*upperBounds.h));
   await closePosition(page);await openPosition(page,'door-gs3');
   const lower=await page.locator('#pwProtocolCanvas').evaluate(canvas=>({ratio:canvas.width/canvas.height,id:canvas.dataset.readCardId}));assert.equal(lower.id,'lower');near(lower.ratio,(pageSize.width*lowerBounds.w)/(pageSize.height*lowerBounds.h));
   await closePosition(page);assert.deepEqual(errors,[]);
  }finally{await context.close();}

  const ipadContext=await contextFor(browser,{ipad:true}),ipad=await ipadContext.newPage(),ipadErrors=[];ipad.on('pageerror',error=>ipadErrors.push(error.message));
  try{
   await openPrepared(ipad,bytes);const profile=await ipad.evaluate(()=>SmartMatchAppBridge.getDrawingPerformanceProfile());assert.equal(profile.ipad,true);
   await openPosition(ipad,'door-gs1');await ipad.locator('#pwProtocolMax').click();await ipad.waitForFunction(()=>document.getElementById('pwProtocolZoomInfo').textContent==='300%'&&document.getElementById('pwProtocolCanvas').width>0);
   const canvas=await ipad.locator('#pwProtocolCanvas').evaluate(node=>({width:node.width,height:node.height,pixels:node.width*node.height}));
   assert(canvas.pixels<=1805000&&canvas.width<=3001&&canvas.height<=3001,'the full-page door-card display stays inside the existing iPad raster budget');
   assert.deepEqual(ipadErrors,[]);
  }finally{await ipadContext.close();}
  console.log('PASS TEST 9.29: small scan bounds drive protocol rows, one-card pages display in full, shared pages keep physical card bounds, and the iPad canvas remains bounded');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
