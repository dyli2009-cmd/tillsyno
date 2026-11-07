const testVersion=process.env.TEST_VERSION||'14';
const {chromium}=require('playwright');
const {PDFDocument,rgb}=require('pdf-lib');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const doc=await PDFDocument.create();const p=doc.addPage([500,400]);p.drawRectangle({x:50,y:50,width:20,height:20,color:rgb(1,0,0)});doc.addPage([500,400]);const bytes=Buffer.from(await doc.save());
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const context=await browser.newContext({viewport:{width:1100,height:800},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://sharp.test/**',r=>{const name=new URL(r.request().url()).pathname.slice(1);let body=fs.readFileSync(path.join(__dirname,'..',name));if(name.endsWith(`v${testVersion}.js`))body=Buffer.from(body.toString().replace(/\}\)\(\);(?=\s*$)/,'window.sharpTest={analyze,setDrawingScale,get:()=>({scale,page})};})();'));return r.fulfill({contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html',body})});
 await page.goto(`https://sharp.test/project-workspace-smartmatch-v${testVersion}.html`);
 await page.evaluate(async b=>{await sharpTest.analyze(new File([new Uint8Array(b)],'drawing.pdf',{type:'application/pdf'}))},[...bytes]);
 await page.waitForFunction(()=>!document.getElementById('pwDrawingDetail').hidden);
 const initial=await page.locator('#pwCanvas').evaluate(c=>({pixels:c.width,css:parseFloat(c.style.width)}));assert(initial.pixels>=initial.css*1.99,'Opening resolution accounts for retina display');
 await page.evaluate(()=>sharpTest.setDrawingScale(3));await page.locator('#pwViewer').evaluate(v=>{v.scrollLeft=100;v.scrollTop=1100});
 await page.waitForFunction(()=>!document.getElementById('pwDrawingDetail').hidden);
 const sample=await page.evaluate(()=>{const c=document.getElementById('pwDrawingDetail'),base=document.getElementById('pwCanvas');const ratio=c.width/parseFloat(c.style.width);const scale=sharpTest.get().scale;const x=Math.floor((60*scale-parseFloat(c.style.left))*ratio),y=Math.floor((340*scale-parseFloat(c.style.top))*c.height/parseFloat(c.style.height));return {ratio,pixel:Array.from(c.getContext('2d').getImageData(x,y,1,1).data),detailPixels:c.width*c.height,basePixels:base.width*base.height}});
 assert(sample.ratio>=1.99,'Zoomed viewport is rendered at device resolution');assert(sample.detailPixels<=3005000);assert(sample.basePixels<=4005000);assert(sample.pixel[0]>240&&sample.pixel[1]<20&&sample.pixel[2]<20,'Sharp crop stays aligned with PDF coordinates');
 const baseWidth=await page.locator('#pwCanvas').evaluate(c=>c.width);await page.evaluate(()=>sharpTest.setDrawingScale(8));await page.waitForFunction(()=>!document.getElementById('pwDrawingDetail').hidden);assert.equal(await page.locator('#pwCanvas').evaluate(c=>c.width),baseWidth,'Zoom keeps bounded whole-page preview');
 await page.locator('#pwViewer').evaluate(v=>{v.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'mouse',pointerId:77,button:0,bubbles:true,clientX:100,clientY:100}))});
 assert.equal(await page.locator('#pwDrawingDetail').evaluate(c=>getComputedStyle(c).display),'none','Detail layer is hidden during navigation');
 await page.locator('#pwViewer').evaluate(v=>v.dispatchEvent(new PointerEvent('pointerup',{pointerType:'mouse',pointerId:77,bubbles:true})));await page.waitForFunction(()=>!document.getElementById('pwDrawingDetail').hidden);
 await page.locator('#pwNext').click();await page.waitForFunction(()=>document.getElementById('pwPageInfo').textContent.includes('2 / 2')&&!document.getElementById('pwDrawingDetail').hidden);
 assert.deepEqual(errors,[]);console.log('PASS: retina opening, sharp aligned viewport at zoom, bounded memory, preview reuse, hide during motion, refresh after motion and page change');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
