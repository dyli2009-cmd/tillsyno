const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch{playwright=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const {chromium}=playwright;
const root=process.cwd(),deps=path.join(root,'scratch/browser92');
const aliases={'/vendor/pdf.min.js':'pdf-runtime.cjs','/vendor/pdf.worker.min.js':'pdf.worker.cjs','/vendor/pdf-lib.min.js':'pdf-lib-runtime.cjs'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),p=decodeURIComponent(url.pathname);
 let file=path.join(root,aliases[p]||p);if(!fs.existsSync(file))file=path.join(deps,p);
 if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',/\.(?:js|cjs)$/.test(file)?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.SMARTMATCH_CHROMIUM||fs.existsSync('/usr/bin/chromium')?{executablePath:process.env.SMARTMATCH_CHROMIUM||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:1000}});page.setDefaultTimeout(30000);
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,200))});
  await page.goto(origin+'/project-workspace-smartmatch-test.html');
  assert.match(await page.locator('#pwBuildVersion').innerText(),/^TEST v36\.92/);
  await page.locator('#pwFile').setInputFiles(process.argv[2]);
  await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPositions?.().length>0&&document.querySelector('#pwLoadDialog')?.open!==true,null,{timeout:120000});
  await page.waitForFunction(()=>document.querySelector('#pwState')?.textContent?.includes('redo')||document.querySelector('#pwState')?.textContent?.includes('Klart')||window.SmartMatchAppBridge?.getItems?.()!=null);
  const initial=await page.evaluate(()=>({positions:window.SmartMatchAppBridge.getPositions().length,limit:window.SmartMatchAppBridge.getDrawingLimit(),cards:window.SmartMatchAppBridge.getDoorCardPages(),items:window.SmartMatchAppBridge.getItems().map(o=>({full:o.sourceText,id:o.id,page:o.page,checks:JSON.stringify(o.checks),notes:o.notes,slr:JSON.stringify(o.slrDocuments)})),index:window.SmartMatchAppBridge.getDoorCardIndex(),state:document.querySelector('#pwState').textContent}));console.log('ACTUAL APP LOADED',initial.positions,'positions,',initial.cards.length,'card pages,',initial.items.length,'saved DA.');
  assert.deepEqual(initial.cards,Array.from({length:15},(_,i)=>i+11),'drawing pages 1–10 must not be classified as cards');
  await page.screenshot({path:'/tmp/sm92-loaded.png'});
  // Locate the first original annotation, then draw through the actual placement UI.
  const first=await page.evaluate(async()=>{
   const api=window.SmartMatchAppBridge,lib=await PDFLib.PDFDocument.load(api.getOriginalPdfBytes().slice()),N=PDFLib.PDFName;
   for(let i=0;i<lib.getPages().length;i++)for(const ref of lib.getPages()[i].node.Annots()?.asArray()||[]){const a=lib.context.lookup(ref),text=a.get(N.of('Contents'))?.decodeText?.()||'';if(text==='200154-28-24-1')return {page:i+1,rect:a.get(N.of('Rect')).asArray().map(x=>x.asNumber())}}
  });assert.ok(first);
  await page.evaluate(async first=>{await window.SmartMatchAppBridge.locate(first)},first);
  await page.locator('#pwToolMenuButton').click();await page.locator('#pwDALinkTool').click();
  await page.locator('#pwDAExample').fill('999-28-37-10');await page.locator('#pwDAManual').click();
  const box=await page.evaluate(async first=>{
   const api=window.SmartMatchAppBridge,pg=await api.getPdf().getPage(api.getPage()),vp=pg.getViewport({scale:api.getScale()}),r=api.viewportRect(vp,first.rect),stage=document.querySelector('#pwStage');
   const viewer=document.querySelector('#pwViewer');viewer.scrollLeft=Math.max(0,r.left-200);viewer.scrollTop=Math.max(0,r.top-200);
   const offset=stage.getBoundingClientRect();return {x:offset.left+r.left-2,y:offset.top+r.top-2,w:r.width+4,h:r.height+4};
  },first);
  await page.mouse.move(box.x,box.y);await page.mouse.down();await page.mouse.move(box.x+box.w,box.y+box.h,{steps:10});await page.mouse.up();
  await page.locator('#pwDAPlacementGuide button[title="Spara positionen"]').click();
  await page.waitForFunction(()=>window.SmartMatchDALink.getBulkStatus().includes('Hittade')&&!window.SmartMatchDALink.isBulkScanning(),null,{timeout:120000});
  const result=await page.evaluate(()=>{const api=window.SmartMatchAppBridge;return {items:api.getItems().map(o=>({id:o.id,full:o.sourceText,object:o.objectNo,type:o.modelCode,serial:o.serialNumber,gs:window.SmartMatchDALink.getLinkedPosition(o)?.id})),state:window.SmartMatchDALink.getBulkStatus(),script:[...document.scripts].find(s=>s.src.includes('smartmatch-da-'))?.src}});
  console.log('ACTUAL RESULT',result.state);
  assert.equal(new Set(result.items.map(o=>o.full)).size,17);assert.ok(result.items.filter(o=>o.gs).length>=17);assert.ok(result.items.every(o=>o.object==='200154-28'));assert.ok(result.script.includes('smartmatch-da-v36-92-module.js'));
  const preserved=await page.evaluate(()=>window.SmartMatchAppBridge.getItems().map(o=>({id:o.id,checks:JSON.stringify(o.checks),notes:o.notes,slr:JSON.stringify(o.slrDocuments)})));
  for(const item of initial.items){const now=preserved.find(o=>o.id===item.id);assert.ok(now,'existing item retained');for(const key of ['checks','notes','slr'])assert.equal(now[key],item[key],'operator work retained')}
  await page.locator('#pwDADoorClose').click();await page.waitForTimeout(300);
  assert.ok(await page.locator('.pwAutomationMarker').count()>0);
  assert.ok(await page.locator('#pwDAArrows path[marker-end]').count()>0);
  const target=result.items.find(o=>o.serial==='2');
  const targetMarker=page.locator('.pwAutomationMarker[data-automation-id='+JSON.stringify(target.id)+']');
  await targetMarker.click();await page.locator('#pwDARevision').click();await page.waitForFunction(()=>document.querySelector('#pwAutomationDialog')?.open);
  await page.locator('#pwAutomationClose').click();
  await targetMarker.click();await page.locator('#pwDASLR').click();assert.ok(await page.locator('#pwSLRDialog').evaluate(e=>e.open));await page.locator('#pwSLRClose').click();
  console.log('ACTUAL HTML/UI placement → drawing identity → all-page scan → 17 buttons/GS links → Egenkontroll + SLR passed:',result.state);
  console.log('PAGEERRORS',JSON.stringify(errors));assert.equal(errors.length,0);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
