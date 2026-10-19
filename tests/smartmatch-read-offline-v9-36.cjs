/* TEST 9.36 offline-cache regression. The current UI intentionally has no
 * readiness label; readiness is verified through the service-worker API. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\/tillsyno\//,'');
 const file=path.resolve(root,pathname||'index.html');
 if(!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return;}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.png':'image/png','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
const assets=['smartmatch-compact-workspace-v9-36.js','smartmatch-compact-workspace-v9-36.css','smartmatch-card-view-v9-35.js','smartmatch-read-table-ocr-v9-33.js','drawing-tools.html','drawing-card-digitizer.css','drawing-card-digitizer-core.js','drawing-card-digitizer-storage.js','drawing-card-digitizer-export.js','drawing-card-digitizer.js','smartmatch-read-test.html','smartmatch-read-test-v9-36.html','smartmatch-read-test-v9-36.js','smartmatch-read-test-v9-36.css','smartmatch-read-test-main-v9-36.js','smartmatch-read-test-session-v9-36.js','smartmatch-read-extra-v9-29.js','smartmatch-read-review-v9-36.js','smartmatch-read-work-v9-32.js','smartmatch-read-workflow-v9-29.js','smartmatch-read-project-v9-29.js','smartmatch-read-export-progress-v9-29.js','smartmatch-read-appearance-v9-29.js','smartmatch-read-match-v9-29.js','smartmatch-read-equipment-symbols-v9-30.js','smartmatch-slr-test-module-read-v9-29.js','vendor/tesseract/tesseract.min.js','vendor/tesseract/worker.min.js','vendor/tesseract/tesseract-core-lstm.wasm.js','vendor/tesseract/lang/eng.traineddata.gz','vendor/tesseract/lang/swe.traineddata.gz'];
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,context;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  const page=await context.newPage(),base=`http://127.0.0.1:${server.address().port}/tillsyno/`;
  await page.goto(base+'index.html');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:60000});
  const cacheState=await page.evaluate(async names=>{
   const keys=await caches.keys(),cache=await caches.open('tillsyno-offline-2.4.403-read9.36'),entries={};
   for(const name of names){const response=await cache.match(new URL(name,location.href).href);entries[name]=response?{status:response.status,size:(await response.arrayBuffer()).byteLength}:null;}
   return {keys,entries};
  },assets);
  assert(cacheState.keys.includes('tillsyno-offline-2.4.403-read9.36'));
  for(const name of assets){assert(cacheState.entries[name],name+' is cached');assert.equal(cacheState.entries[name].status,200);assert(cacheState.entries[name].size>0,name+' is nonempty');}
  await context.setOffline(true);
  const offline=await page.evaluate(async names=>Promise.all(names.map(async name=>{const response=await fetch(name,{cache:'no-store'});return {name,status:response.status,size:(await response.arrayBuffer()).byteLength};})),assets);
  for(const item of offline){assert.equal(item.status,200,item.name+' opens offline');assert(item.size>0,item.name+' stays nonempty offline');}
  assert.match(Buffer.from(await page.evaluate(async()=>[...new Uint8Array(await (await fetch('smartmatch-read-test.html')).arrayBuffer())])).toString(),/Avläsning TEST 9\.36/);
  const main=fs.readFileSync(path.join(root,'smartmatch-read-test-main-v9-36.js'),'utf8');
  assert(!/https?:\/\/[^'"\s]*tesseract/i.test(main),'OCR must not load Tesseract from an external host');
  assert.match(main,/vendor\/tesseract\/tesseract\.min\.js/);
  assert.match(main,/workerPath:new URL\('vendor\/tesseract\/worker\.min\.js'/);
  console.log('PASS TEST 9.36 offline: fixed address and all versioned scripts/styles are cached, nonempty and fetchable without network');
 }finally{await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
