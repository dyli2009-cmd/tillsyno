const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const pdfStub=`
window.metrics={active:0,peak:0,cancelled:0,renders:0};
window.pdfjsLib={GlobalWorkerOptions:{},getDocument({data}){
 if(data[0]===0)return {promise:Promise.reject(new Error('Invalid PDF'))};
 return {promise:Promise.resolve({numPages:2,destroy:async()=>{},getPage:async()=>({
 getViewport({scale}){return {width:10000*scale,height:15000*scale}},
 render({canvasContext,viewport}){
  metrics.active++;metrics.peak=Math.max(metrics.peak,metrics.active);metrics.renders++;
  let done=false,rejectPromise,timer;
  const promise=new Promise((resolve,reject)=>{rejectPromise=reject;timer=setTimeout(()=>{done=true;metrics.active--;canvasContext.fillStyle='#eee';canvasContext.fillRect(0,0,viewport.width,viewport.height);resolve()},40)});
  return {promise,cancel(){if(done)return;done=true;clearTimeout(timer);metrics.active--;metrics.cancelled++;rejectPromise(Object.assign(new Error('cancelled'),{name:'RenderingCancelledException'}))}};
 }
 })})};
}};`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://cdnjs.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:route.request().url().includes('pdf.min.js')?pdfStub:'window.jspdf={};'}));
  await page.route('https://dorrservice.test/**',route=>{const pathname=new URL(route.request().url()).pathname;const file=pathname==='/'?'index.html':pathname.slice(1);const contentType=file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html';return route.fulfill({contentType,body:require('node:fs').readFileSync(require('node:path').join(__dirname,'..',file))})});
  await page.goto('https://dorrservice.test/');
  await page.locator('#file').setInputFiles({name:'ritning.pdf',mimeType:'application/pdf',buffer:Buffer.from([1])});
  await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent==='Sida 1 / 2');
  await page.locator('#mobileAdd').tap();
  await page.locator('#markers').tap({position:{x:150,y:180}});
  assert.equal(await page.locator('.marker').count(),1);
  assert.equal(await page.locator('#formTitle').textContent(),'D1 – Sida 1');
  assert(await page.locator('#protocolPanel').isVisible());
  // Send real browser touch gestures: scrollIntoView alone does not test swiping.
  const cdp=await page.context().newCDPSession(page);
  async function swipe(fromY,toY){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:350,y:fromY}]});
   for(let step=1;step<=10;step++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:350,y:fromY+(toY-fromY)*step/10}]});
    await page.waitForTimeout(16);
   }
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(150);
  }
  await swipe(650,250);
  assert(await page.locator('#protocolPanel').evaluate(el=>el.scrollTop>100),'Finger swipe should scroll the protocol');
  assert(await page.locator('#closeProtocol').isVisible());
  for(let attempt=0;attempt<12;attempt++){
   const bounds=await page.locator('#signature').boundingBox();
   if(bounds&&bounds.y>100&&bounds.y+bounds.height<800)break;
   await swipe(700,250);
  }
  const signatureBounds=await page.locator('#signature').boundingBox();
  assert(signatureBounds.y>100&&signatureBounds.y+signatureBounds.height<800,'Swiping reaches the signature field');
  await page.locator('#signature').fill('AB');
  const beforeReverse=await page.locator('#protocolPanel').evaluate(el=>el.scrollTop);
  await swipe(250,650);
  const reversed=await page.locator('#protocolPanel').evaluate(el=>el.scrollTop);
  assert(reversed<beforeReverse,'Reverse swipe should scroll toward the top');
  // A smaller viewport approximates the space available above a keyboard.
  await page.setViewportSize({width:390,height:500});
  assert(await page.locator('#protocolPanel').evaluate(el=>el.clientHeight<=window.innerHeight));
  await page.locator('#signature').fill('ABC');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#signature').blur();
  const row=page.locator('.checkrow').first();
  await row.evaluate(el=>el.scrollIntoView({block:'center'}));
  await page.waitForTimeout(400);
  await row.locator('[data-v="remark"]').tap();
  await row.locator('.faultText').fill('Sensor behöver justeras');
  await page.waitForTimeout(300);
  await page.locator('#closeProtocol').tap();
  const before=await page.locator('.marker').evaluate(el=>({x:el.style.left,y:el.style.top}));
  await page.locator('.marker').tap();
  assert(await page.locator('#protocolPanel').isVisible());
  assert.equal(await row.locator('.faultText').inputValue(),'Sensor behöver justeras');
  assert.deepEqual(await page.locator('.marker').evaluate(el=>({x:el.style.left,y:el.style.top})),before);
  // A checklist tap updates the same row, preserving its position and inputs.
  await row.evaluate(el=>el.dataset.testIdentity='original');
  await row.locator('[data-v="ok"]').tap();
  assert.equal(await row.getAttribute('data-test-identity'),'original');
  await page.locator('#closeProtocol').tap();
  await page.evaluate(async()=>{setZoom(8);await renderQueue});
  const size=await page.locator('#pdfCanvas').evaluate(el=>({w:el.width,h:el.height,css:parseFloat(el.style.width)}));
  assert(size.w*size.h<4010000);assert(size.w<=4096&&size.h<=4096);assert(size.css>size.w);
  // Start one render then request more zooms: old work must cancel and serialize.
  await page.evaluate(async()=>{setZoom(2);await new Promise(r=>setTimeout(r,5));setZoom(3);setZoom(4);await renderQueue});
  assert.equal(await page.locator('#zoomInfo').textContent(),'400%');
  const metrics=await page.evaluate(()=>window.metrics);assert.equal(metrics.peak,1);assert(metrics.cancelled>0);
  // Exercise two-touch preview and commit through the real gesture listeners.
  await page.evaluate(async()=>{
   const wrap=document.querySelector('#viewerWrap');
   function event(type,touches){const ev=new Event(type,{cancelable:true});Object.defineProperty(ev,'touches',{value:touches});wrap.dispatchEvent(ev)}
   event('touchstart',[{clientX:100,clientY:200},{clientX:200,clientY:200}]);
   event('touchmove',[{clientX:100,clientY:200},{clientX:250,clientY:200}]);
   event('touchend',[]);await renderQueue;
  });
  assert.equal(await page.locator('#zoomInfo').textContent(),'600%');
  await page.locator('#next').tap();await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent==='Sida 2 / 2');
  assert.equal(await page.locator('.marker').count(),0);
  await page.locator('#prev').tap();await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent==='Sida 1 / 2');
  assert.equal(await page.locator('.marker').count(),1);
  await page.locator('#file').setInputFiles({name:'trasig.pdf',mimeType:'application/pdf',buffer:Buffer.from([0])});
  await page.waitForFunction(()=>document.querySelector('#appMessage').classList.contains('error'));
  assert.equal(await page.locator('#pageInfo').textContent(),'Sida 1 / 2');
  assert.equal(await page.locator('#viewerWrap').getAttribute('aria-busy'),'false');
  // Storage failures should inform the user instead of breaking the editor.
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('quota')};save();persist()});
  assert((await page.locator('#appMessage').textContent()).includes('Kunde inte spara'));
  assert.deepEqual(errors,[]);
  console.log('PASS: native protocol touch scrolling to signature, smaller viewport, mobile upload, markers, checklist, bounded raster, render cancellation, pinch, pages, invalid PDF, storage errors');
  await page.screenshot({path:require('node:path').join(__dirname,'..','mobile-preview.png'),fullPage:true});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
