// v2.4.591: skarp zoom i Kontrollflödets ritningsvy (Dörrautomatik / Lås och Säkerhetsservice / Brand).
// - hela sidan visas som förut; när bilden inte räcker till ritas bara den synliga delen skarpt efter en paus;
// - detaljen stämmer med sidans bild (också roterad), har en pixelgräns och ligger under stämplarna;
// - flyttning ger en ny detalj, utzoomning och sidbyte tar bort den;
// - sparläge: sidans bild ritas inte om vid zoom, en detaljritning åt gången och minnet frigörs efteråt;
// - Säkerhetsservice och Brand känner av tunga ritningar och visar dem i sparläge, som Dörrautomatik;
// - en sida som är för tung att rita (heavyMaxMs) får inga detaljer i sparläge.
// Synthetic drawings only.
const {chromium}=require('playwright'),{PDFDocument,PDFName}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});
function rng(seed){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
// An A0 sheet with four coloured quarters and thin coloured lines; `lines` adds random line work to make it heavy.
async function sheet(size=[2384,3370],lines=0,pages=1){
 const doc=await PDFDocument.create(),r=rng(7),[w,h]=size;
 for(let n=0;n<pages;n++){const pg=doc.addPage(size),parts=['1 0.85 0.85 rg 0 '+h/2+' '+w/2+' '+h/2+' re f','0.85 0.9 1 rg '+w/2+' '+h/2+' '+w/2+' '+h/2+' re f','0.85 1 0.85 rg 0 0 '+w/2+' '+h/2+' re f','1 1 0.8 rg '+w/2+' 0 '+w/2+' '+h/2+' re f'];
  for(let y=40;y<h;y+=40)parts.push(`0.4 w ${(y/40)%3===0?'0.8 0 0':(y/40)%3===1?'0 0 0.8':'0 0.5 0'} RG 20 ${y} m ${w-20} ${y} l S`);
  for(let i=0;i<lines;i++){const x=r()*w,y=r()*h,a=r()*Math.PI*2,l=5+r()*120;parts.push(`0.25 w 0 0 0 RG ${x.toFixed(2)} ${y.toFixed(2)} m ${(x+Math.cos(a)*l).toFixed(2)} ${(y+Math.sin(a)*l).toFixed(2)} l S`);}
  pg.node.set(PDFName.of('Contents'),doc.context.register(doc.context.stream(parts.join('\n'))));}
 return Buffer.from(await doc.save());
}
const upload=(page,bytes,name)=>page.evaluate(async({b64,name})=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name,{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});},{b64:bytes.toString('base64'),name});
// Counts pdf.js page drawings and how many run at the same time.
const instrument=page=>page.evaluate(async()=>{const p=await pdf.getPage(1),proto=Object.getPrototypeOf(p);if(proto.__counted)return;const orig=proto.render;proto.render=function(...a){window.__draws=(window.__draws||0)+1;window.__active=(window.__active||0)+1;window.__maxActive=Math.max(window.__maxActive||0,window.__active);const task=orig.apply(this,a);task.promise.then(()=>{},()=>{}).finally(()=>{window.__active--});return task};proto.__counted=true;});
const settle=page=>page.evaluate(async()=>{for(let i=0;i<80;i++){await renderQueue.catch(()=>{});await new Promise(r=>setTimeout(r,60));if(!sharpZoom.busy()&&!renderTask)return true}return false});
// Compares the detail with the page image at the viewer's centre and a quarter in from each corner.
const check=page=>page.evaluate(()=>{
 const d=document.querySelector('.cfSharpDetail'),state=sharpZoom.state();if(!d||!state)return {detail:false};
 const vr=viewer.getBoundingClientRect(),sr=$('secStage').getBoundingClientRect(),points=[[.5,.5],[.3,.3],[.7,.3],[.3,.7],[.7,.7]],out=[];
 const base=canvas.getContext('2d'),detail=d.getContext('2d'),mean=(c,x,y,r)=>{const px=c.getImageData(Math.round(x-r),Math.round(y-r),Math.max(1,Math.round(2*r)),Math.max(1,Math.round(2*r))).data,m=[0,0,0];for(let i=0;i<px.length;i+=4){m[0]+=px[i];m[1]+=px[i+1];m[2]+=px[i+2]}const n=px.length/4;return m.map(v=>v/n)};
 for(const [fx,fy] of points){
  const nx=(vr.left+viewer.clientLeft+viewer.clientWidth*fx-sr.left)/pageWidth,ny=(vr.top+viewer.clientTop+viewer.clientHeight*fy-sr.top)/pageHeight;
  // Mean colour of a 24 × 24 CSS px square: the page image is blurred and the detail sharp, so single pixels differ.
  const a=state.area,b=mean(base,nx*canvas.width,ny*canvas.height,12*canvas.width/pageWidth),q=mean(detail,(nx-a.x)/a.w*d.width,(ny-a.y)/a.h*d.height,12*d.width/(a.w*pageWidth));
  out.push(Math.round(Math.max(Math.abs(b[0]-q[0]),Math.abs(b[1]-q[1]),Math.abs(b[2]-q[2]))));
 }
 const order=[...$('secStage').children].map(n=>n.id||n.className),a=state.area;
 const v={x:(vr.left+viewer.clientLeft-sr.left)/pageWidth,y:(vr.top+viewer.clientTop-sr.top)/pageHeight,w:viewer.clientWidth/pageWidth,h:viewer.clientHeight/pageHeight};
 const covers=Math.max(0,v.x)>=a.x-.002&&Math.max(0,v.y)>=a.y-.002&&Math.min(1,v.x+v.w)<=a.x+a.w+.002&&Math.min(1,v.y+v.h)<=a.y+a.h+.002;
 return {detail:true,covers,currentScale:Math.abs(state.scale-baseScale*zoom)<baseScale*zoom*.01,count:document.querySelectorAll('.cfSharpDetail').length,ratio:state.ratio,pixels:d.width*d.height,baseRatio:drawingRaster.width/pageWidth,diffs:out,order,belowStamps:order.indexOf('cfSharpDetail')===order.indexOf('secCanvas')+1&&order.indexOf('secMarkers')>order.indexOf('cfSharpDetail'),pointerEvents:getComputedStyle(d).pointerEvents};
});
// The viewer centre lands on one coloured quarter, so pixel colours of the page and the detail can be compared.
const centreOn=(page,nx,ny)=>page.evaluate(([nx,ny])=>{const st=$('secStage');viewer.scrollLeft=st.offsetLeft+nx*pageWidth-viewer.clientWidth/2;viewer.scrollTop=st.offsetTop+ny*pageHeight-viewer.clientHeight/2;},[nx,ny]);
async function open(browser,device,url,group,type,file,name){
 const context=await browser.newContext(device),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:'+server.address().port+url);await page.locator('#allProtocolDialog[open]').waitFor();
 await page.locator('.allProtocolGroup summary').nth(group).click();await page.locator('input[value="'+type+'"]').check();await page.locator('#allProtocolApply').click();
 await upload(page,file,name);await settle(page);await page.evaluate(()=>{ControlflowSharpZoom.settings.keep=400});
 return {context,page,errors};
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ipad={viewport:{width:820,height:1180},hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'},phone={viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,serviceWorkers:'block'};
 const a0=await sheet(),a0Two=await sheet([2384,3370],0,2),a3=await sheet([842,1191]),heavy=await sheet([2384,3370],90000,2);
 const pages=[['Dörrautomatik','/controlflow-revision/all-in-one.html',0,'automation'],['Säkerhetsservice','/all-in-one.html',1,'alarm'],['Brand','/all-in-one.html',2,'fire_panel']];
 for(const [label,url,group,type] of pages){
  // 1. A3 at fit: the page image is sharp enough, no detail is drawn.
  let {context,page,errors}=await open(browser,ipad,url,group,type,a3,'A3.pdf');
  assert.equal((await check(page)).detail,false,label+': no detail at fit');await context.close();

  // 2. A0 zoomed 4×: the visible part is drawn sharp and matches the page image; it lies under the stamps.
  ({context,page,errors}=await open(browser,ipad,url,group,type,a0Two,'A0.pdf'));
  assert.equal(await page.evaluate(()=>heavyDrawing),false,label+': A0 without line work is not heavy');
  assert.equal((await check(page)).detail,false,label+': no detail at fit');
  await page.evaluate(async()=>{await setZoom(4)});await centreOn(page,.25,.25);await settle(page);
  let r=await check(page);
  assert.equal(r.detail,true,label+': detail drawn at 4×');assert.equal(r.count,1);assert.equal(r.ratio,2,label+': full sharpness on iPad');
  assert(r.baseRatio<1.2,label+': the page image alone would be blurred ('+r.baseRatio.toFixed(2)+' px per CSS px)');
  assert(r.pixels<=ControlflowSharpZoomBudget(false),label+': detail within the pixel limit: '+r.pixels);
  assert(r.diffs.every(d=>d<=24),label+': detail matches the page image '+JSON.stringify(r.diffs));assert.equal(r.covers,true,label+': detail covers the visible area');assert.equal(r.currentScale,true);
  assert.equal(r.belowStamps,true,label+': detail between drawing and stamps '+JSON.stringify(r.order));assert.equal(r.pointerEvents,'none');
  // 3. Panning: a new detail for the new area after the pause; still one detail.
  const before=await page.evaluate(()=>sharpZoom.state().area.x);await centreOn(page,.75,.75);await settle(page);r=await check(page);
  assert.equal(r.count,1);assert(await page.evaluate(()=>sharpZoom.state().area.x)>before+.2,label+': detail follows the pan');assert(r.diffs.every(d=>d<=24),label+': '+JSON.stringify(r.diffs));
  // 4. Zooming out removes the detail; a page change removes it at once.
  await page.evaluate(async()=>{await setZoom(1)});await settle(page);assert.equal((await check(page)).detail,false,label+': no detail at 100 %');
  await page.evaluate(async()=>{await setZoom(4)});await centreOn(page,.25,.75);await settle(page);assert.equal((await check(page)).detail,true);
  assert.equal(await page.evaluate(()=>{changeSecurityPage(1);return document.querySelectorAll('.cfSharpDetail').length}),0,label+': page change removes the detail at once');
  await settle(page);
  // 5. Säkerhetsservice and Brand can turn the drawing: the detail follows the rotation.
  if(url==='/all-in-one.html'){
   assert.equal(await page.evaluate(async()=>{await rotateSecurityDrawing(1);return document.querySelectorAll('.cfSharpDetail').length}),0);
   await page.evaluate(async()=>{await setZoom(4)});await centreOn(page,.3,.6);await settle(page);r=await check(page);
   assert.equal(r.detail,true,label+': detail on a turned drawing');assert.equal(await page.evaluate(()=>sharpZoom.state().rotation),90);
   assert(r.diffs.every(d=>d<=24),label+': turned detail matches '+JSON.stringify(r.diffs));
  }
  assert.deepEqual(errors,[]);await context.close();

  // 6. Phone: the detail keeps to the phone limit.
  ({context,page,errors}=await open(browser,phone,url,group,type,a0,'A0.pdf'));
  await page.evaluate(async()=>{await setZoom(5)});await centreOn(page,.6,.4);await settle(page);r=await check(page);
  assert.equal(r.detail,true,label+': detail on phone');assert(r.pixels<=ControlflowSharpZoomBudget(true),label+': phone limit '+r.pixels);assert(r.diffs.every(d=>d<=24),label+': '+JSON.stringify(r.diffs));
  assert.deepEqual(errors,[]);await context.close();

  // 7. Sparläge: heavy drawing detected; zoom does not draw the page again; one detail drawing at a time; memory freed after.
  ({context,page,errors}=await open(browser,ipad,url,group,type,heavy,'Tung.pdf'));
  assert.equal(await page.evaluate(()=>heavyDrawing),true,label+': heavy drawing in sparläge');assert.match(await page.evaluate(()=>$('secPage').textContent),/· Sparläge$/);
  await instrument(page);
  const rapid=await page.evaluate(async()=>{window.__draws=0;window.__maxActive=0;const base=[canvas.width,canvas.height];
   for(let i=0;i<14;i++){await setZoom(2+(i%5)*.7);viewer.scrollLeft+=90;viewer.scrollTop+=70;await new Promise(r=>setTimeout(r,i%4===3?520:60));}
   return {base,after:[canvas.width,canvas.height]}});
  await settle(page);await page.waitForTimeout(700);
  const heavyState=await page.evaluate(async()=>({draws:window.__draws,maxActive:window.__maxActive,detail:!!sharpZoom.state(),released:sharpZoom.stats.released,intents:(await pdf.getPage(1))._intentStates.size}));
  assert.deepEqual(rapid.after,rapid.base,label+': the page image is not drawn again on zoom');
  assert.equal(heavyState.maxActive,1,label+': one drawing at a time in sparläge');
  assert(heavyState.draws>=1&&heavyState.draws<=5,label+': few detail drawings while zooming, got '+heavyState.draws);
  assert.equal(heavyState.detail,true);assert(heavyState.released>=1,label+': memory freed after the detail');assert.equal(heavyState.intents,0,label+': pdf.js page data freed');
  // The page image draws thin lines at least one image pixel wide, so a dense drawing looks darker there than in the
  // sharp detail (as in Acrobat); here the detail is checked for the current zoom and the visible area instead.
  r=await check(page);assert.equal(r.currentScale,true,label+': sparläge detail is for the current zoom');assert.equal(r.covers,true,label+': sparläge detail covers the visible area');
  // Safety limit: a page whose first drawing took longer than heavyMaxMs gets no details in sparläge.
  await page.evaluate(()=>{ControlflowSharpZoom.settings.heavyMaxMs=1});await centreOn(page,.4,.4);await settle(page);
  assert.equal(await page.evaluate(()=>!!sharpZoom.state()||document.querySelectorAll('.cfSharpDetail').length>0),false,label+': no detail on a page that is too heavy');
  await page.evaluate(()=>{ControlflowSharpZoom.settings.heavyMaxMs=8000});
  // Closing the drawing removes the detail.
  if(url==='/all-in-one.html')await page.evaluate(async()=>{await closeSecurityDrawing()});else await page.evaluate(async()=>{await closeRevisionDrawing()});
  assert.equal(await page.evaluate(()=>document.querySelectorAll('.cfSharpDetail').length),0,label+': closing removes the detail');
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS sharp zoom: Dörrautomatik, Säkerhetsservice and Brand draw the visible part sharp after a pause, matching the page image (also turned), within the pixel limit, under the stamps; pan, zoom out, page change and close behave; sparläge draws one detail at a time and frees memory; Säkerhetsservice and Brand detect heavy drawings.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
function ControlflowSharpZoomBudget(phone){return phone?2600000:6000000}
