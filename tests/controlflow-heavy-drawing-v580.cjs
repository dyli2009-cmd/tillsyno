// v2.4.580: Kontrollflöde Dörrautomatik detects heavy drawings and shows them in sparläge.
// Synthetic drawings only: a normal page, an A0 page with a large uncompressed vector stream,
// an A3 page with a 20 MP photo, a render failure, and the offline drawing store.
const {chromium}=require('playwright'),{PDFDocument,PDFName}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});
const upload=(page,bytes,name)=>page.evaluate(async({b64,name})=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name,{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});},{b64:Buffer.from(bytes).toString('base64'),name});
const choose=async page=>{await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').first().click();await page.locator('input[value="automation"]').check();await page.locator('#allProtocolApply').click();};
const state=page=>page.evaluate(()=>({heavy:heavyDrawing,label:$('secPage').textContent,labelClass:$('secPage').classList.contains('secPageHeavy'),message:$('securityMessage').textContent,error:$('securityMessage').classList.contains('error'),pixels:canvas.width*canvas.height}));
function rng(seed){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
async function normalDrawing(){const doc=await PDFDocument.create();doc.addPage([900,1200]).drawText('FLOOR PLAN',{x:40,y:1120,size:16});doc.addPage([900,1200]);return doc.save();}
async function heavyVectorDrawing(){
 // A0 with about 2.4 MB of uncompressed line work on one page (CAD-like: every line its own path).
 const doc=await PDFDocument.create(),page=doc.addPage([2384,3370]),r=rng(7),parts=['0.25 w 0 0 0 RG'];
 for(let i=0;i<90000;i++){const x=r()*2384,y=r()*3370,a=r()*Math.PI*2,l=5+r()*120;parts.push(`${x.toFixed(2)} ${y.toFixed(2)} m ${(x+Math.cos(a)*l).toFixed(2)} ${(y+Math.sin(a)*l).toFixed(2)} l S`);}
 page.node.set(PDFName.of('Contents'),doc.context.register(doc.context.stream(parts.join('\n'))));
 return doc.save();
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true,serviceWorkers:'allow'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
 await page.goto('http://127.0.0.1:'+server.address().port+'/controlflow-revision/all-in-one.html');await choose(page);

 // The image scan reads sizes from image dictionaries without decoding, and ignores ProcSet names and references.
 const scan=await page.evaluate(()=>{const b=s=>new TextEncoder().encode(s);return{
  photo:largestPdfImagePixels(b('1 0 obj <</Type /XObject /Subtype /Image /Width 9000 /Height 6000 /BitsPerComponent 8>> stream')),
  procset:largestPdfImagePixels(b('/ProcSet [/PDF /ImageB /ImageC /ImageI] /Width 9000 /Height 6000')),
  reference:largestPdfImagePixels(b('<</Subtype /Image /Width 12 0 R /Height 13 0 R>>')),
  none:largestPdfImagePixels(b('<</Type /Page /MediaBox [0 0 595 842]>>'))}});
 assert.deepEqual(scan,{photo:54000000,procset:0,reference:0,none:0});

 // 1. A normal drawing is shown as before.
 await upload(page,await normalDrawing(),'Normal.pdf');let s=await state(page);
 assert.equal(s.heavy,false);assert.equal(s.label,'Sida 1 / 2');assert.equal(s.labelClass,false);assert.match(s.message,/^Ritningen är klar\./);

 // 2. A heavy vector page: sparläge, drawn once at the capped size, zoom does not draw again.
 await upload(page,await heavyVectorDrawing(),'Tung ritning.pdf');s=await state(page);
 assert.equal(s.heavy,true);assert.equal(s.label,'Sida 1 / 1 · Sparläge');assert.equal(s.labelClass,true);assert.match(s.message,/^Stor ritning – visas i sparläge\. Ritningen är klar\./);
 assert(s.pixels<=3000000*1.005&&s.pixels>2500000,'sparläge canvas '+s.pixels);// rounding up to whole pixels
 const redraw=await page.evaluate(async()=>{const before=drawingRaster;await setZoom(2);await setZoom(4);await setZoom(1);return drawingRaster===before});
 assert.equal(redraw,true,'zoom in sparläge must not draw the page again');
 const intents=await page.evaluate(async()=>{await renderQueue;await new Promise(r=>setTimeout(r,50));return (await pdf.getPage(1))._intentStates.size});
 assert.equal(intents,0,'sparläge frees the page content after drawing');

 // 3. Kundmall in sparläge: smaller preview, and its document is closed with the dialog.
 await page.evaluate(()=>{items=[normalize({uid:'heavy-1',type:'automation',id:'12341-14-24-1',idMode:'manual',number:1,page:1,x:.3,y:.3,checks:{}})];save();drawMarkers();go('drawing')});
 await page.evaluate(()=>openCustomerPreview(false));await page.waitForFunction(()=>$('secPreviewDialog').open&&$('secPreviewCanvas').width>0);
 const preview=await page.evaluate(()=>({mode:previewMode,pixels:$('secPreviewCanvas').width*$('secPreviewCanvas').height}));
 assert.equal(preview.mode,'drawing');assert(preview.pixels<=4000000,'sparläge Kundmall '+preview.pixels);
 await page.locator('#secPreviewClose').click();await page.waitForFunction(()=>!$('secPreviewDialog').open&&previewPdf===null);

 // 4. A drawing with a 20 MP photo is detected before anything is decoded.
 const photo=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=5000;c.height=4000;const g=c.getContext('2d');g.fillStyle='#ddd';g.fillRect(0,0,5000,4000);g.fillStyle='#246';g.fillRect(400,400,1200,800);
  const jpg=new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/jpeg',.6))).arrayBuffer());c.width=c.height=0;
  const doc=await PDFLib.PDFDocument.create(),p=doc.addPage([1191,842]),image=await doc.embedJpg(jpg);p.drawImage(image,{x:0,y:0,width:1191,height:842});
  const bytes=await doc.save();return {pixels:largestPdfImagePixels(bytes),b64:btoa(Array.from(bytes,x=>String.fromCharCode(x)).join(''))}});
 assert.equal(photo.pixels,20000000);
 await upload(page,Buffer.from(photo.b64,'base64'),'Foto.pdf');s=await state(page);
 assert.equal(s.heavy,true);assert.match(s.label,/Sparläge$/);

 // 5. A normal drawing after a heavy one leaves sparläge again.
 await upload(page,await normalDrawing(),'Normal igen.pdf');s=await state(page);assert.equal(s.heavy,false);assert.equal(s.label,'Sida 1 / 2');

 // 6. A page that cannot be drawn gets one more try in sparläge, and an error is no longer hidden by "Ritningen är klar".
 await page.evaluate(async()=>{const p=await pdf.getPage(1),proto=Object.getPrototypeOf(p),orig=proto.render;window.__renderFailures=0;proto.render=function(...a){if(window.__renderFailures>0){window.__renderFailures--;throw new Error('test render failure')}return orig.apply(this,a)}});
 await page.evaluate(()=>{window.__renderFailures=1});await upload(page,await normalDrawing(),'Retry.pdf');s=await state(page);
 assert.equal(s.heavy,true,'retried in sparläge');assert.match(s.message,/^Stor ritning – visas i sparläge\./);assert.equal(s.error,false);
 await page.evaluate(()=>{window.__renderFailures=2});await upload(page,await normalDrawing(),'Trasig.pdf');s=await state(page);
 assert.equal(s.error,true);assert.match(s.message,/kunde inte visas, inte heller i sparläge/);assert.doesNotMatch(s.message,/Ritningen är klar/);
 await page.evaluate(()=>{window.__renderFailures=0});

 // 7. The offline store keeps only the latest drawing per protocol scope.
 const stored=await page.evaluate(async()=>{await new Promise(r=>setTimeout(r,200));const db=await new Promise((ok,no)=>{const q=indexedDB.open('tillsyno-offline-work',1);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});
  const keys=await new Promise((ok,no)=>{const q=db.transaction('drawings').objectStore('drawings').getAllKeys();q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});db.close();return keys.map(String)});
 const scopes=stored.map(k=>k.split(':')[0]);assert.equal(new Set(scopes).size,scopes.length,'one drawing per scope: '+stored.join(', '));

 assert.deepEqual(errors,[]);
 console.log('PASS heavy drawings: image scan, normal drawing unchanged, sparläge for heavy vector page and 20 MP photo, zoom without redraw, memory freed, smaller Kundmall closed with its dialog, retry and visible error, one stored drawing per scope.');
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
