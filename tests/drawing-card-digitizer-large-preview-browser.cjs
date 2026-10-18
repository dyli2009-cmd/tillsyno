/* Real-file, memory-bounded preview smoke test.
 *
 * Opens the supplied 43 MB-class Tånga PDF in an iPad-sized Chromium
 * renderer, exercises the exact DrawingToolsBridge region preview used by
 * the digital door-card review and proves every raster stays within the
 * production 3 MP / 3000 px ceiling.
 */
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
 ?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'
 :'playwright');

const root=path.resolve(__dirname,'..');
const input=process.env.DRAWING_DIGITIZER_LARGE_PDF||'/workspace/attachments/22314bfa-ee94-45a5-b3e0-e2787990958e/Tånga 43 MB.pdf';
const qa=process.env.DRAWING_DIGITIZER_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'drawing-card-digitizer-large-'));
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.json':'application/json; charset=utf-8'};
let origin='';

const server=http.createServer((request,response)=>{
 const name=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\/+/,''),file=path.resolve(root,name);
 if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return;}
 try{response.setHeader('Content-Type',MIME[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});

async function run(){
 assert(fs.existsSync(input),'large Tånga fixture must exist: '+input);fs.mkdirSync(qa,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
 let browser,context;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--js-flags=--max-old-space-size=512']});
  context=await browser.newContext({viewport:{width:1024,height:1366},isMobile:true,hasTouch:true});
  const external=[],errors=[],crashes=[];
  context.on('request',request=>{const url=request.url();if(/^https?:/u.test(url)&&!url.startsWith(origin+'/'))external.push(url);});
  await context.route(/^https:\/\//u,route=>route.abort());
  await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  const page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>crashes.push('renderer crashed'));
  await page.goto(origin+'/drawing-tools.html');await page.waitForFunction(()=>window.DrawingToolsBridge&&window.DrawingCardDigitizer);
  await page.locator('#toolFile').setInputFiles(input);
  await page.waitForFunction(()=>document.body.classList.contains('hasDrawing')&&!document.getElementById('workspace').hasAttribute('aria-busy'));
  await page.waitForFunction(()=>DrawingToolsBridge.getPdf()?.numPages===52&&document.getElementById('previewCanvas').width>10);

  const report=await page.evaluate(async()=>{
   const pdf=DrawingToolsBridge.getPdf(),sizes=[];
   for(let number=1;number<=pdf.numPages;number++){
    const source=await pdf.getPage(number),viewport=source.getViewport({scale:1});sizes.push({page:number,width:viewport.width,height:viewport.height,area:viewport.width*viewport.height});
   }
   sizes.sort((a,b)=>b.area-a.area);const target=sizes[0],canvas=document.getElementById('digitizerOriginalCanvas'),samples=[];
   for(const zoom of [.5,1,1.5,2,2.5]){
    const result=await DrawingToolsBridge.renderRegionPreview({page:target.page,rect:{x:0,y:0,w:1,h:1},canvas,zoom,maxPixels:3000000,maxSide:3000});
    samples.push({zoom,width:canvas.width,height:canvas.height,pixels:canvas.width*canvas.height,scale:result.scale});
   }
   // Repeat the largest request to expose retained-canvas or progressive
   // allocation mistakes that only occur after several zoom operations.
   for(let index=0;index<4;index++){
    const result=await DrawingToolsBridge.renderRegionPreview({page:target.page,rect:{x:.02,y:.02,w:.96,h:.96},canvas,zoom:2.5,maxPixels:3000000,maxSide:3000});
    samples.push({zoom:2.5,width:canvas.width,height:canvas.height,pixels:canvas.width*canvas.height,scale:result.scale,repeat:index+1});
   }
   return{pageCount:pdf.numPages,target,samples,final:{width:canvas.width,height:canvas.height,pixels:canvas.width*canvas.height},resources:performance.getEntriesByType('resource').map(entry=>entry.name)};
  });
  assert.equal(report.pageCount,52);assert(report.target.area>0);
  assert(report.samples.every(sample=>sample.pixels<=3000000),'all review previews stay at or below 3 MP');
  assert(report.samples.every(sample=>Math.max(sample.width,sample.height)<=3000),'all review previews stay at or below 3000 px on either side');
  assert(report.samples.every(sample=>sample.width>0&&sample.height>0));
  assert.equal(crashes.length,0,'the iPad-sized renderer remains alive through repeated maximum zoom renders');
  assert.deepEqual(external,[],'large local PDF preview performs no external request');
  assert.equal(report.resources.some(url=>url.includes('/vendor/tesseract/')),false,'preview does not load OCR workers or language models');
  assert.deepEqual(errors,[],'large preview raises no page error');
  await page.locator('#digitizerReviewDialog').evaluate(node=>node.setAttribute('open',''));
  await page.screenshot({path:path.join(qa,'tanga-large-preview-ipad.png')});
  const compact={file:path.basename(input),bytes:fs.statSync(input).size,pageCount:report.pageCount,largestSourcePage:report.target,maximumCanvasPixels:Math.max(...report.samples.map(sample=>sample.pixels)),maximumCanvasSide:Math.max(...report.samples.flatMap(sample=>[sample.width,sample.height])),samples:report.samples};
  fs.writeFileSync(path.join(qa,'tanga-large-preview-report.json'),JSON.stringify(compact,null,2));
  console.log('PASS large Tånga preview: '+compact.pageCount+' pages, source '+Math.round(compact.bytes/1024/1024)+' MiB, page '+compact.largestSourcePage.page+' rendered repeatedly at <= '+compact.maximumCanvasPixels+' pixels and <= '+compact.maximumCanvasSide+' px, no crash/external/OCR request');
  console.log('QA files: '+qa);
 }finally{
  if(context)await context.close();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
 }
}

if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});

