/* Real PDF analysis/cleanup through the UI, with independent PDF.js rendering. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {fixture,metadata}=require('./drawing-analysis.cjs');
const analysis=require('../drawing-analysis.js');
const {PDFDocument}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),qa=process.env.DRAWING_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'drawing-analysis-browser-'));
fs.mkdirSync(qa,{recursive:true});
function server(){return http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.pdf':'application/pdf'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});}
async function stats(page,bytes){return page.evaluate(async data=>{
 const pdf=await pdfjsLib.getDocument({data:Uint8Array.from(atob(data),c=>c.charCodeAt(0))}).promise,out=[];
 try{for(let n=1;n<=pdf.numPages;n++){
  const p=await pdf.getPage(n),viewport=p.getViewport({scale:1}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const ctx=canvas.getContext('2d');await p.render({canvasContext:ctx,viewport,background:'white'}).promise;
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let hash=2166136261;for(const b of pixels)hash=Math.imul(hash^b,16777619);
  out.push({width:viewport.width,height:viewport.height,hash:hash>>>0,text:(await p.getTextContent()).items.map(x=>x.str).join('|'),annotations:(await p.getAnnotations()).map(a=>({subtype:a.subtype,rect:a.rect,contents:a.contentsObj?.str,field:a.fieldValue}))});canvas.width=canvas.height=1;
 }}finally{await pdf.destroy();}return out;
},Buffer.from(bytes).toString('base64'));}
async function run(){
 const source=Buffer.from(await fixture()),s=server();await new Promise(r=>s.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  for(const d of [{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true},{name:'ipad',width:1024,height:1366,touch:true}]){
   const context=await browser.newContext({viewport:{width:d.width,height:d.height},isMobile:!!d.touch,hasTouch:!!d.touch,acceptDownloads:true});
   // Test-only auth stub on the local server; production guard remains untouched.
   await context.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
   const page=await context.newPage(),errors=[];let downloads=0;page.on('pageerror',e=>errors.push(e.message));page.on('download',()=>downloads++);
   await page.goto('http://127.0.0.1:'+s.address().port+'/drawing-tools.html');
   const ready=()=>page.waitForFunction(()=>document.body.classList.contains('hasDrawing')&&!document.getElementById('workspace').hasAttribute('aria-busy'));
   const open=async()=>{await page.locator('#toolFile').setInputFiles({name:'analysis.pdf',mimeType:'application/pdf',buffer:source});await ready();};
   const tools=async()=>{if(await page.locator('#toolPanel').isHidden())await page.locator('#toolsToggle').click();if(await page.locator('#analysisTools').getAttribute('open')===null)await page.locator('#analysisTools > summary').click();};
   const analyze=async()=>{await tools();await page.locator('#pdfAnalyze').click();await page.waitForFunction(()=>!document.getElementById('pdfAnalysisReport').hidden&&!document.getElementById('workspace').hasAttribute('aria-busy'));};
   const download=async()=>{const pending=page.waitForEvent('download');await page.locator('#savePdf').click();const file=await pending;return fs.readFileSync(await file.path());};
   await open();
   const direct=await download();assert.equal((await analysis.analyze(direct)).images.extraCopies,0,'Save PDF itself reuses identical images, even without analysis or a separate cleanup click');assert.deepEqual(await metadata(direct),await metadata(source));
   assert.match(await page.locator('#toolMessage').textContent(),/→/,'save shows actual before/after sizes');
   await analyze();
   assert.equal(await page.locator('#analysisTools').count(),1);assert.equal(await page.locator('#analysisTools #cardGroupTools').count(),1);assert.equal(await page.locator('#analysisTools #optimizeTools').count(),1);
   assert.equal(await page.locator('[data-pdf-group]').count(),1);assert.match(await page.locator('#pdfAnalysisReport').innerText(),/8 \/ 8/);
   assert(await page.locator('[data-pdf-keep="1"]').isChecked());assert(await page.locator('[data-pdf-remove="1"]').isDisabled());assert(!(await page.locator('[data-pdf-remove="2"]').isChecked()));assert(await page.locator('#pdfRemoveDuplicates').isDisabled());
   const before=await stats(page,source);assert.match(before[7].text,/Hidden searchable GS99/);
   await page.locator('#pdfClean').click();await page.waitForFunction(()=>!document.getElementById('pdfCleanResult').hidden&&!document.getElementById('workspace').hasAttribute('aria-busy'));
   assert.match(await page.locator('#pdfCleanResult').textContent(),/verifierade/);
   const cleaned=await download();assert(cleaned.length<source.length);assert.deepEqual(await stats(page,cleaned),before,'all eight pages render and extract identically');assert.deepEqual(await metadata(cleaned),await metadata(source));
   fs.writeFileSync(path.join(qa,d.name+'-cleaned.pdf'),cleaned);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page fits viewport');
   await page.locator('#pdfAnalysisReport').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(qa,d.name+'-analysis.png')});
   // Deleting a duplicate is explicit, protects the keeper, and is undoable.
   await page.locator('[data-pdf-remove="2"]').check();await page.locator('#pdfRemoveDuplicates').click();await ready();
   assert.equal((await PDFDocument.load(await download())).getPageCount(),7);assert(await page.locator('#pdfAnalysisReport').isHidden());
   await page.locator('#closeTools').click();await page.locator('#undoDrawing').click();await ready();assert.equal((await PDFDocument.load(await download())).getPageCount(),8);
   await page.locator('#redoDrawing').click();await ready();assert.equal((await PDFDocument.load(await download())).getPageCount(),7);
   // A deterministic slow parse gives the cancel button time to receive a tap.
   await open();await tools();await page.evaluate(()=>{const original=DrawingPdfAnalysis.analyze;DrawingPdfAnalysis.analyze=async(...args)=>{await new Promise(r=>setTimeout(r,300));return original(...args);};});
   await page.locator('#pdfAnalyze').click();await page.locator('#pdfAnalysisCancel').click();await page.waitForFunction(()=>!document.getElementById('pdfAnalysisDialog').open&&!document.getElementById('workspace').hasAttribute('aria-busy'));
   assert.match(await page.locator('#pdfAnalysisStatus').textContent(),/Avbrutet/);assert(await page.locator('#pdfAnalysisReport').isHidden());assert.equal((await PDFDocument.load(await download())).getPageCount(),8);
   await analyze();assert.equal(await page.locator('[data-pdf-group]').count(),1,'analysis can restart after cancellation');
   // Block text/annotation removal when using the preservation-focused cleanup.
   await page.locator('#removeAnnotations').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change'));});await analyze();await page.locator('#pdfClean').click();
   await page.waitForFunction(()=>document.getElementById('pdfAnalysisStatus').textContent.includes('Avmarkera'));assert(await page.locator('#pdfCleanResult').isHidden());
   // A failed fresh cleanup must invalidate an earlier cached output, and Save
   // must retry the verified cleanup rather than silently export another path.
   await open();await download();await analyze();
   await page.evaluate(()=>{window.__realDrawingOptimize=DrawingPdf.optimize;DrawingPdf.optimize=async()=>{throw Error('QA: arbetskopian kunde inte verifieras');};});
   await page.locator('#pdfClean').click();await page.waitForFunction(()=>document.getElementById('pdfAnalysisStatus').textContent.includes('QA:'));
   const count=downloads;await page.locator('#savePdf').click();await page.waitForFunction(()=>!document.getElementById('workspace').hasAttribute('aria-busy')&&document.getElementById('toolMessage').textContent.includes('QA:'));
   assert.equal(downloads,count,'failed cleanup cannot fall back to a cached or uncleaned download');
   await page.evaluate(()=>{DrawingPdf.optimize=window.__realDrawingOptimize;delete window.__realDrawingOptimize;});
   const retry=await download();assert.equal((await analysis.analyze(retry)).images.extraCopies,0);assert.deepEqual(await stats(page,retry),before);
   assert.deepEqual(errors,[]);await context.close();console.log('PASS '+d.name+': direct Save reuses images, failed cleanup blocks cached fallback, retry works; whole PDF, distinct card products, reviewed deletion, undo/redo, cancellation, exact pixels/text/stamps and metadata');
  }
 }finally{if(browser)await browser.close();await new Promise(r=>s.close(r));}
 console.log('QA files: '+qa);
}
run().catch(e=>{console.error(e);process.exitCode=1;});
