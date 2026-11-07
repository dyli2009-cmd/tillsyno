// v2.4.581: fast zooming on a phone must not pile up memory in Kontrollflöde Dörrautomatik.
// - zooming while the page is being drawn does not cancel and restart the drawing;
// - temporary canvases are freed at once, also when a drawing is cancelled;
// - Safari's own pinch gesture is stopped on the drawing;
// - a slow page switches to sparläge and is drawn once more while its content is still in memory;
// - sparläge starts earlier on a phone than on an iPad.
// Synthetic drawings only.
const {chromium}=require('playwright'),{PDFDocument,PDFName}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});
const upload=(page,bytes,name)=>page.evaluate(async({b64,name})=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name,{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});},{b64:Buffer.from(bytes).toString('base64'),name});
const choose=async page=>{await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').first().click();await page.locator('input[value="automation"]').check();await page.locator('#allProtocolApply').click();};
function rng(seed){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
async function vectorDrawing(size,lines,pages=1){
 const doc=await PDFDocument.create(),r=rng(11);
 for(let n=0;n<pages;n++){const page=doc.addPage(size),parts=['0.25 w 0 0 0 RG'];
  for(let i=0;i<lines;i++){const x=r()*size[0],y=r()*size[1],a=r()*Math.PI*2,l=5+r()*120;parts.push(`${x.toFixed(2)} ${y.toFixed(2)} m ${(x+Math.cos(a)*l).toFixed(2)} ${(y+Math.sin(a)*l).toFixed(2)} l S`);}
  page.node.set(PDFName.of('Contents'),doc.context.register(doc.context.stream(parts.join('\n'))));}
 return doc.save();
}
async function normalDrawing(){const doc=await PDFDocument.create();doc.addPage([900,1200]).drawText('FLOOR PLAN',{x:40,y:1120,size:16});doc.addPage([900,1200]);return doc.save();}
// Counts pdf.js page drawings and the temporary canvases the page creates.
const instrument=page=>page.evaluate(async()=>{const p=await pdf.getPage(1),proto=Object.getPrototypeOf(p);if(!proto.__counted){const orig=proto.render;proto.render=function(...a){window.__draws=(window.__draws||0)+1;return orig.apply(this,a)};proto.__counted=true;}
 if(!window.__canvasTracked){const create=document.createElement.bind(document);window.__canvases=[];document.createElement=function(name,...rest){const node=create(name,...rest);if(String(name).toLowerCase()==='canvas')window.__canvases.push(node);return node};window.__canvasTracked=true;}});
async function open(browser,options,file,name){
 const context=await browser.newContext(options),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
 await page.goto('http://127.0.0.1:'+server.address().port+'/controlflow-revision/all-in-one.html');await choose(page);await upload(page,file,name);
 return {context,page,errors};
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ipad={viewport:{width:820,height:1180},hasTouch:true,serviceWorkers:'allow'},phone={viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,serviceWorkers:'allow'};
 const heavy=await vectorDrawing([2384,3370],90000,2),a2=await vectorDrawing([1191,1684],45000);

 // 1. Heavy page on iPad: zooming many times while the page is drawn does not restart the drawing.
 let {context,page,errors}=await open(browser,ipad,heavy,'Tung.pdf');
 assert.equal(await page.evaluate(()=>heavyDrawing),true);await instrument(page);
 const zoomWhileDrawing=await page.evaluate(async()=>{window.__draws=0;drawingRaster=null;const first=render(false);
  for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,25));if(i%3===0)cancelSecurityRaster();setZoom(1+(i%5)*.6);}
  await first;await renderQueue;await new Promise(r=>setTimeout(r,50));return {draws:window.__draws,painted:!!drawingRaster&&drawingRaster.page===1,pixels:canvas.width*canvas.height}});
 assert.equal(zoomWhileDrawing.draws,1,'one drawing while zooming in sparläge, got '+zoomWhileDrawing.draws);
 assert.equal(zoomWhileDrawing.painted,true);assert(zoomWhileDrawing.pixels>2500000);

 // 2. A drawing that is cancelled by a page change frees its temporary canvas at once.
 const freed=await page.evaluate(async()=>{window.__canvases.length=0;drawingRaster=null;render(false);await new Promise(r=>setTimeout(r,10));changeSecurityPage(1);await renderQueue;await new Promise(r=>setTimeout(r,50));
  return {created:window.__canvases.length,kept:window.__canvases.filter(c=>c.width>0||c.height>0).length,page}});
 assert(freed.created>=1,'temporary canvases were created');assert.equal(freed.kept,0,'temporary canvases are freed');assert.equal(freed.page,2);

 // 3. Safari's own pinch gesture is stopped on the drawing.
 assert.equal(await page.evaluate(()=>['gesturestart','gesturechange'].every(type=>{const e=new Event(type,{cancelable:true});viewer.dispatchEvent(e);return e.defaultPrevented})),true);
 assert.deepEqual(errors,[]);await context.close();

 // 4. A slow page switches to sparläge and is drawn once more at the sparläge size, then its memory is freed.
 ({context,page,errors}=await open(browser,ipad,await normalDrawing(),'Normal.pdf'));
 assert.equal(await page.evaluate(()=>heavyDrawing),false);
 await page.evaluate(()=>{const real=performance.now.bind(performance);let extra=0;performance.now=()=>real()+(window.__slow?(extra+=2000):0);window.__slow=true});
 await upload(page,await normalDrawing(),'Langsam.pdf');
 const slow=await page.evaluate(async()=>{await renderQueue;await new Promise(r=>setTimeout(r,50));await renderQueue;window.__slow=false;await new Promise(r=>setTimeout(r,50));
  return {heavy:heavyDrawing,label:$('secPage').textContent,message:$('securityMessage').textContent,pixels:canvas.width*canvas.height,intents:(await pdf.getPage(1))._intentStates.size}});
 assert.equal(slow.heavy,true);assert.match(slow.label,/· Sparläge$/);assert.match(slow.message,/^Stor ritning – visas i sparläge\./);
 assert(slow.pixels>2500000&&slow.pixels<=3000000*1.005,'drawn again at the sparläge size: '+slow.pixels);assert.equal(slow.intents,0,'memory freed after the second drawing');
 assert.deepEqual(errors,[]);await context.close();

 // 5. Sparläge starts earlier on a phone: an A2 page with 1.2 MB of line work is heavy there, not on an iPad.
 ({context,page,errors}=await open(browser,ipad,a2,'A2.pdf'));
 assert.deepEqual(await page.evaluate(()=>({phone:PHONE_DEVICE,heavy:heavyDrawing})),{phone:false,heavy:false});await context.close();
 ({context,page,errors}=await open(browser,phone,a2,'A2.pdf'));
 const onPhone=await page.evaluate(()=>({phone:PHONE_DEVICE,heavy:heavyDrawing,label:$('secPage').textContent,overflow:document.documentElement.scrollWidth>innerWidth}));
 assert.deepEqual(onPhone,{phone:true,heavy:true,label:'Sida 1 / 1 · Sparläge',overflow:false});
 assert.deepEqual(errors,[]);await context.close();

 console.log('PASS fast zoom: one drawing while zooming in sparläge, temporary canvases freed on cancel, Safari pinch stopped, slow page redrawn once in sparläge and freed, earlier sparläge on phone.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
