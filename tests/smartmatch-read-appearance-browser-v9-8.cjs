/* Coloured stamp backgrounds, complete IDs and sample-first linking. Local
 * generated PDFs only. Text search must never create an OCR worker. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const html='<!doctype html><meta charset="utf-8"><button id="exOpenExtra">Koppla stämplar</button><script src="vendor/pdf.min.js"></script><script src="smartmatch-read-text-v9-6.js"></script><script src="smartmatch-read-appearance-v9-8.js"></script><script src="smartmatch-read-match-v9-8.js"></script><script src="smartmatch-read-extra-v9-8.js"></script>';
const server=http.createServer((req,res)=>{if(req.url==='/appearance-test.html'){res.setHeader('Content-Type','text/html;charset=utf-8');return res.end(html);}const file=path.resolve(root,new URL(req.url,'http://localhost').pathname.slice(1));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}});
async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),pg=doc.addPage([900,600]),yellow=rgb(1,.9,.02),blue=rgb(.1,.4,.95),green=rgb(.1,.75,.2);
 function stamp(text,x,y,color,shape='circle'){if(shape==='rectangle')pg.drawRectangle({x:x-45,y:y-34,width:90,height:68,color});else pg.drawEllipse({x,y,xScale:45,yScale:34,color});const size=18;pg.drawText(text,{x:x-font.widthOfTextAtSize(text,size)/2,y:y-6,size,font});}
 stamp('WC',120,450,yellow);stamp('WC',300,450,yellow);pg.drawText('WC',{x:480,y:444,size:18,font});stamp('WC',120,240,blue);stamp('WC',300,240,yellow,'rectangle');stamp('WC',500,240,green);stamp('DBL',710,450,yellow);stamp('DBL-OI',710,240,yellow);stamp('DBL B-OPPS',710,90,yellow);
 doc.addPage([595,842]).drawText('Dorrkort DBL',{x:50,y:750,size:18,font});return Buffer.from(await doc.save());
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(r.url()))remote.push(r.url());});await page.goto('http://127.0.0.1:'+server.address().port+'/appearance-test.html');
  await page.evaluate(async bytes=>{
   pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';window.__pdf=await pdfjsLib.getDocument({data:Uint8Array.from(bytes)}).promise;window.__markCalls=0;window.__workerCalls=0;window.__added=[];window.__savedSample=null;window.__positions=[];window.__removed=[];
   window.SmartMatchReadTest={getCardNames:()=>['DBL'],getDrawingSample:()=>window.__savedSample,getRemovedReadPositions:()=>window.__removed,setDrawingSample:s=>{window.__savedSample=s;}};
   window.SmartMatchAppBridge={getPdf:()=>window.__pdf,getDoorCardPages:()=>[2],getDrawingLimit:()=>2,getDoorCardMapping:()=>({}),getPositions:()=>window.__positions,beginReadSample:callback=>{window.__markCalls++;window.__sampleCallback=callback;},cancelReadSample:()=>{},getReadStampIndex:async()=>[],addManualReadPositions:async value=>{window.__added.push(value);return value.hits.length;}};
   window.Tesseract={createWorker:()=>{window.__workerCalls++;throw Error('Native text search must not OCR.');}};
  },Array.from(await fixture()));
  await page.click('#exOpenExtra');assert.equal(await page.evaluate(()=>window.__markCalls),1,'entry starts rectangle marking before requiring a card');assert.equal(await page.locator('#exDialog').evaluate(n=>n.open),false);
  const sample={page:1,rect:{x:70/900,y:110/600,w:100/900,h:80/600}};await page.evaluate(value=>window.__sampleCallback(value),sample);await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy);assert.equal(await page.inputValue('#exCode'),'WC');assert.equal(await page.inputValue('#exCardPage'),'','sample is read before choosing target card');assert.match(await page.textContent('#exColorInfo'),/gul bakgrund/);
  await page.selectOption('#exCardPage','2');await page.click('#exSearch');await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy);let state=await page.evaluate(()=>SmartMatchReadExtraV94.state());if(process.env.DEBUG_STAMPS)console.log(JSON.stringify(state,null,2));assert(state.result,await page.textContent('#exStatus'));assert.equal(state.result.hits.length,2,'two yellow round stamps; plain room WC, blue WC and rectangular yellow WC are excluded');assert.equal(state.result.wrongColor,3);assert.equal(state.result.unknownColor,1);assert.equal(await page.evaluate(()=>window.__workerCalls),0);
  await page.click('#exApply');assert.equal(await page.evaluate(()=>window.__added[0].hits.length),2);assert.equal(await page.evaluate(()=>window.__savedSample.appearance.enabled),true,'learned profile is saved with project payload');
  // Existing geometry stays a duplicate after a group has been renamed.
  await page.evaluate(()=>{const hit=window.__added[0].hits[0];window.__positions=[{...hit,code:'RENAMED'}];window.__removed=[window.__added[0].hits[1]];});await page.click('#exSearch');await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy);state=await page.evaluate(()=>SmartMatchReadExtraV94.state());assert.equal(state.result.hits.length,0,'renamed existing positions and explicitly removed positions are not rediscovered');assert.equal(state.result.duplicateCount,1);
  await page.evaluate(()=>{window.__positions=[];window.__removed=[];});await page.uncheck('#exSameColor');await page.click('#exSearch');await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy);state=await page.evaluate(()=>SmartMatchReadExtraV94.state());assert.equal(state.result.hits.length,6,'explicitly disabling appearance allows ordinary exact text matches');
  // A different project's green example learns green instead of a global
  // yellow rule. It still excludes the plain room label.
  await page.evaluate(()=>SmartMatchReadExtraV94.setSample({page:1,rect:{x:450/900,y:320/600,w:100/900,h:80/600}}));await page.check('#exSameColor');await page.click('#exSearch');await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy);state=await page.evaluate(()=>SmartMatchReadExtraV94.state());assert.equal(state.result.hits.length,1);assert.match(state.sample.appearance.profile.label,/grön/);
  // DBL must never match the DBL-OI or DBL B-OPPS text, even with the same
  // colour and a compound text item. These are different complete labels.
  await page.evaluate(()=>SmartMatchReadExtraV94.setSample({page:1,rect:{x:660/900,y:110/600,w:100/900,h:80/600}}));await page.click('#exSearch');await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy);state=await page.evaluate(()=>SmartMatchReadExtraV94.state());assert.equal(state.result.hits.length,1);assert.equal(state.result.hits[0].code,'DBL');
  const boundaries=await page.evaluate(()=>{const w=text=>({text,x:.1,y:.1,w:.2,h:.03});return ['DBL-OI','DBL B-OPPS','DBL B- OPPS D'].map(text=>SmartMatchReadMatcher.textHits([w(text)],['DBL']).length);});assert.deepEqual(boundaries,[0,0,0]);
  assert.equal(await page.evaluate(()=>window.__workerCalls),0);
  // Deliberately stub recognition, not the PDF renderer, to prove that this
  // separate explicit action sends only the selected sample to OCR.
  await page.evaluate(()=>{window.__sampleOcr=[];Tesseract.createWorker=async()=>{window.__workerCalls++;return {setParameters:async()=>{},recognize:async canvas=>{window.__sampleOcr.push([canvas.width,canvas.height]);return {data:{text:'DBL',words:[{text:'DBL',confidence:98,bbox:{x0:canvas.width*.3,y0:canvas.height*.35,x1:canvas.width*.7,y1:canvas.height*.62}}]}};},terminate:async()=>{}};};});
  await page.click('#exReadSampleImage');await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy);assert.equal(await page.evaluate(()=>window.__workerCalls),1);const sizes=await page.evaluate(()=>window.__sampleOcr);assert.equal(sizes.length,1);assert(sizes[0][0]*sizes[0][1]<505000,'only a bounded sample crop is OCRed');assert.equal(await page.inputValue('#exMode'),'text','reading the sample does not enable full-page image search');assert.equal((await page.evaluate(()=>SmartMatchReadExtraV94.state())).sample.ocrText,'DBL');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);console.log('PASS sample-first UI, learned background/shape, plain WC rejection, whole compound IDs, explicit bypass, duplicate/removal filtering, bounded explicit sample OCR and no network');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
