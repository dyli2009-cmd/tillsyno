/* Save choices against real PDF graphs, not a disabled comparison limit. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {fixture,metadata,limitMessage}=require('./drawing-save-selection.cjs');
const {fixture:cleanFixture}=require('./drawing-analysis.cjs');
const analysis=require('../drawing-analysis.js');
const {PDFDocument}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),qa=process.env.DRAWING_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'drawing-save-browser-'));
const devices=[{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true},{name:'ipad',width:1024,height:1366,touch:true}].filter(x=>!process.env.DRAWING_SAVE_DEVICE||x.name===process.env.DRAWING_SAVE_DEVICE);
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 fs.readFile(file,(error,data)=>{if(error){response.writeHead(404);return response.end();}response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');response.end(data);});
});
async function pixels(page,bytes){return page.evaluate(async base64=>{
 const doc=await pdfjsLib.getDocument({data:Uint8Array.from(atob(base64),c=>c.charCodeAt(0))}).promise,out=[];
 try{for(let no=1;no<=doc.numPages;no++){
  const pg=await doc.getPage(no),viewport=pg.getViewport({scale:1}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const ctx=canvas.getContext('2d');await pg.render({canvasContext:ctx,viewport,background:'white'}).promise;
  let hash=2166136261;for(const b of ctx.getImageData(0,0,canvas.width,canvas.height).data)hash=Math.imul(hash^b,16777619);
  out.push({width:viewport.width,height:viewport.height,hash:hash>>>0,text:(await pg.getTextContent()).items.map(x=>x.str).join('|')});canvas.width=canvas.height=1;
 }}finally{await doc.destroy();}return out;
},Buffer.from(bytes).toString('base64'));}
async function main(){
 fs.mkdirSync(qa,{recursive:true});
 const source=Buffer.from(await fixture()),before=await metadata(source),normal=Buffer.from(await cleanFixture(.03));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  for(const device of devices){
   const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
   // Test-only local auth substitution; application auth is not changed.
   await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
   const page=await context.newPage(),errors=[];let downloads=0;page.on('pageerror',error=>errors.push(error.message));page.on('download',()=>downloads++);
   await page.goto('http://127.0.0.1:'+server.address().port+'/drawing-tools.html');
   await page.evaluate(()=>{
    const snapshot=DrawingPdfAnalysis.snapshot,optimize=DrawingPdf.optimize,analyze=DrawingPdfAnalysis.analyze;
    window.__saveQA={modes:[],snapshots:0,failSnapshot:false,mismatch:false,failAnalysis:false};
    DrawingPdf.optimize=(bytes,options)=>{__saveQA.modes.push(!!options.deduplicateImages);return optimize(bytes,options);};
    DrawingPdfAnalysis.snapshot=async(...args)=>{const qa=__saveQA;qa.snapshots++;if(qa.failSnapshot)throw Error('Sidan har för många korsreferenser för en säker jämförelse.');const result=await snapshot(...args);return qa.mismatch&&qa.snapshots%2===0?{...result,catalog:'QA: changed content'}:result;};
    DrawingPdfAnalysis.analyze=(...args)=>{if(__saveQA.failAnalysis)throw Error('QA: ny analys kunde inte slutföras');return analyze(...args);};
   });
   const ready=()=>page.waitForFunction(()=>document.body.classList.contains('hasDrawing')&&!document.getElementById('workspace').hasAttribute('aria-busy'));
   const open=async bytes=>{await page.locator('#toolFile').setInputFiles({name:'selected-pages.pdf',mimeType:'application/pdf',buffer:bytes});await ready();};
   const tools=async title=>{if(await page.locator('#toolPanel').isHidden())await page.locator('#toolsToggle').click();const details=page.locator('#toolPanel details').filter({has:page.locator(':scope > summary').filter({hasText:title})}).last();if(await details.getAttribute('open')===null)await details.locator(':scope > summary').click();};
   const options=async mode=>{await page.locator('#savePdf').click();await page.locator('#pdfSaveDialog').waitFor({state:'visible'});assert(await page.locator('input[name="pdfSaveMode"][value="edits"]').isChecked(),'ordinary page/edit saving is the default each time');if(mode)await page.locator('input[name="pdfSaveMode"][value="'+mode+'"]').check();};
   const download=async mode=>{await options(mode);const pending=page.waitForEvent('download');await page.locator('#pdfSaveConfirm').click();const file=await pending;await ready();return fs.readFileSync(await file.path());};
   const failedSave=async text=>{const count=downloads;await options('clean');await page.locator('#pdfSaveConfirm').click();await page.waitForFunction(text=>!document.getElementById('workspace').hasAttribute('aria-busy')&&document.getElementById('toolMessage').textContent.includes(text),text);assert.equal(downloads,count,'rejected strict comparison never downloads cached or unverified bytes');};
   const analyze=async()=>{await tools('Analysera');await page.locator('#pdfAnalyze').click();await page.waitForFunction(()=>!document.getElementById('pdfAnalysisDialog').open&&!document.getElementById('workspace').hasAttribute('aria-busy'));};
   await open(source);
   const sourcePixels=await pixels(page,source);
   await analyze();assert.match(await page.locator('#pdfAnalysisReport').innerText(),/1 sidor kunde inte jämföras/,'the real 250k graph remains unresolved, not falsely classified as duplicate');
   await tools('Sidor');await page.locator('#nextPage').click();await page.locator('#removePage').click();await page.locator('#closeTools').click();await ready();
   assert.deepEqual(await page.evaluate(()=>DrawingToolsBridge.getKeptPages()),[1,3]);
   const state=await page.evaluate(()=>DrawingToolsBridge.getStateKey()),count=downloads;
   await options('clean');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'save dialog fits the device');await page.screenshot({path:path.join(qa,device.name+'-save-choices.png')});await page.locator('#pdfSaveCancel').click();
   assert.equal(downloads,count);assert.equal(await page.evaluate(()=>DrawingToolsBridge.getStateKey()),state,'cancel does not change selected pages or edits');
   const basic=await download();assert.deepEqual(await metadata(basic),{...before,pages:[before.pages[0],before.pages[2]]});assert.deepEqual(await pixels(page,basic),[sourcePixels[0],sourcePixels[2]],'selected pages retain exact drawing pixels and extracted text');
   assert.equal(await page.evaluate(()=>__saveQA.snapshots),0,'ordinary saving never enters strict snapshot comparison');fs.writeFileSync(path.join(qa,device.name+'-selected-pages.pdf'),basic);
   await failedSave(limitMessage);
   const again=await download();assert.deepEqual(await metadata(again),await metadata(basic),'ordinary saving still works after optional strict cleanup fails');
   // New analysis failure also cannot poison ordinary saving or restore removed pages.
   await page.evaluate(()=>__saveQA.failAnalysis=true);await analyze();assert.match(await page.locator('#pdfAnalysisStatus').textContent(),/QA: ny analys/);assert.equal((await PDFDocument.load(await download())).getPageCount(),2);await page.evaluate(()=>__saveQA.failAnalysis=false);
   await open(normal);const originalReport=await analysis.analyze(normal);assert(originalReport.images.extraCopies>0);
   const ordinary=await download();assert((await analysis.analyze(ordinary)).images.extraCopies>0,'ordinary save does not silently run optional image deduplication');
   const cleaned=await download('clean');assert.equal((await analysis.analyze(cleaned)).images.extraCopies,0);assert.deepEqual(await pixels(page,cleaned),await pixels(page,normal));
   const snapshotsAfterClean=await page.evaluate(()=>__saveQA.snapshots),ordinaryAfterClean=await download();assert.equal((await analysis.analyze(ordinaryAfterClean)).images.extraCopies,0,'a completed current cleanup remains a valid work copy');assert.equal(await page.evaluate(()=>__saveQA.snapshots),snapshotsAfterClean,'saving a prepared work copy does not repeat comparison');assert.deepEqual(await pixels(page,ordinaryAfterClean),await pixels(page,normal));
   await tools('Rensa ritningen');await page.locator('#removeAnnotations').check();const withoutAnnotations=await PDFDocument.load(await download());assert.equal(withoutAnnotations.getPage(0).node.Annots()?.size()||0,0,'ordinary save honors current cleanup edits');await page.locator('#removeAnnotations').uncheck();
   await download('clean');await analyze();
   await page.evaluate(()=>__saveQA.failSnapshot=true);await page.locator('#pdfClean').click();await page.waitForFunction(()=>!document.getElementById('workspace').hasAttribute('aria-busy')&&document.getElementById('pdfAnalysisStatus').textContent.includes('korsreferenser'));
   await failedSave(limitMessage);assert.equal((await PDFDocument.load(await download())).getPageCount(),8,'a failed fresh cleanup invalidates old cache but does not block ordinary output');
   await page.evaluate(()=>{__saveQA.failSnapshot=false;__saveQA.mismatch=true;__saveQA.snapshots=0;});
   // A page edit forces fresh cleanup and its before/after comparison.
   await tools('Sidor');await page.locator('#nextPage').click();await page.locator('#removePage').click();await page.locator('#closeTools').click();
   await failedSave('ändrat innehåll');assert.equal((await PDFDocument.load(await download())).getPageCount(),7,'comparison mismatch never downloads a stale file or reintroduces a removed page');
   await page.evaluate(()=>{__saveQA.mismatch=false;__saveQA.snapshots=0;});const retry=await download('clean');assert.equal((await PDFDocument.load(retry)).getPageCount(),7);assert.equal((await analysis.analyze(retry)).images.extraCopies,0,'verified cleanup can recover after a rejected comparison');
   assert.deepEqual(errors,[]);await context.close();console.log('PASS '+device.name+': actual 250k-crossref graph, selected-page lossless default, cancel, explicit strict cleanup, mode/edit cache, analysis/cleanup failure, mismatch rejection and successful retry');
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
 console.log('QA files: '+qa);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
