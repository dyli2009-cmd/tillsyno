/* TEST 8 selection-view zoom regression. Generated PDF only; no OCR required.
 * Trusted wheel and CDP touch input exercise the actual browser event path.
 * SMARTMATCH_DEVICE=desktop|ipad|iphone limits viewport coverage.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const devices=[{name:'desktop',width:1366,height:900},{name:'ipad',width:1024,height:1366,touch:true},{name:'iphone',width:390,height:844,touch:true}].filter(device=>!process.env.SMARTMATCH_DEVICE||device.name===process.env.SMARTMATCH_DEVICE);
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/${process.env.SMARTMATCH_READ_ENTRY||'smartmatch-read-test-v8.html'}`;
const codeRect={x:.15,y:.08,w:.30,h:.06},tableRect={x:.12,y:.20,w:.70,h:.16};
async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),page=doc.addPage([595,842]);
 page.drawText('Beslagskod GS88',{x:90,y:750,size:20,font});
 for(const [index,text]of ['Komponent     Produkt       Monteras av','Las            ASSA EL580          GS','Trycke         HOPPE               GS'].entries())page.drawText(text,{x:70,y:650-index*30,size:13,font});
 for(let y=80;y<720;y+=80)page.drawLine({start:{x:40,y},end:{x:555,y},thickness:.5,color:rgb(.7,.7,.7)});
 return Buffer.from(await doc.save());
}
async function setRect(page,kind,rect){
 for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel(kind+' '+label,{exact:true}).evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);
}
async function geometry(page){
 return page.evaluate(()=>{
  const viewport=document.getElementById('rtViewport'),box=document.getElementById('rtCanvasBox'),canvas=document.getElementById('rtCanvas'),v=viewport.getBoundingClientRect(),b=box.getBoundingClientRect();
  const rect=kind=>{const node=document.getElementById('rt'+kind+'Rect');return node.hidden?null:Object.fromEntries([['x','left'],['y','top'],['w','width'],['h','height']].map(([key,style])=>[key,parseFloat(node.style[style])/100]));};
  return {viewport:{left:v.left,top:v.top,width:v.width,height:v.height},box:{left:b.left,top:b.top,width:b.width,height:b.height},scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop,bitmapPixels:canvas.width*canvas.height,code:rect('Code'),table:rect('Table'),draftHidden:document.getElementById('rtDraftRect').hidden};
 });
}
const selected=state=>({code:state.code,table:state.table});
const normAt=(state,point)=>({x:(point.x-state.box.left)/state.box.width,y:(point.y-state.box.top)/state.box.height});
function closePoint(actual,expected,message,tolerance=.014){
 assert(Math.abs(actual.x-expected.x)<=tolerance&&Math.abs(actual.y-expected.y)<=tolerance,message+' '+JSON.stringify({actual,expected}));
}
async function settle(page){
 // Rendering is scheduled/debounced during continuous input. Wait for stable
 // CSS dimensions rather than relying on an internal test-only application API.
 await page.evaluate(()=>new Promise(resolve=>{
  let last='',stableSince=performance.now();const deadline=stableSince+4000;
  const check=()=>{const box=document.getElementById('rtCanvasBox').getBoundingClientRect(),now=performance.now(),next=[box.left,box.top,box.width,box.height].map(n=>n.toFixed(2)).join(',');if(next!==last){last=next;stableSince=now;}if(now-stableSince>=160||now>=deadline)resolve();else requestAnimationFrame(check);};check();
 }));
}
async function showViewport(page){await page.locator('#rtViewport').scrollIntoViewIfNeeded();await settle(page);return geometry(page);}
async function expectWidth(page,compare,reference,message){
 await page.waitForFunction(({compare,reference})=>{const width=document.getElementById('rtCanvasBox').getBoundingClientRect().width;return compare==='greater'?width>reference*1.03:width<reference*.97;},{compare,reference},{timeout:6000});
 await settle(page);const state=await geometry(page);assert(compare==='greater'?state.box.width>reference:state.box.width<reference,message);return state;
}
async function wheelZoom(page){
 const before=await showViewport(page),point={x:before.viewport.left+before.viewport.width*.55,y:before.viewport.top+before.viewport.height*.38},anchor=normAt(before,point);
 await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-280);
 const after=await expectWidth(page,'greater',before.box.width,'mouse wheel zooms into the card');
 closePoint(normAt(after,point),anchor,'the drawing point under the mouse remains anchored');
 assert.deepEqual(selected(after),selected(before),'wheel zoom preserves normalized code/table areas');
 await page.mouse.wheel(0,180);const out=await expectWidth(page,'less',after.box.width,'opposite mouse wheel zooms out');
 assert.deepEqual(selected(out),selected(before));
 console.log('PASS mouse wheel zoom anchors the cursor and preserves selections');
}
async function modeSwitchRepaint(page){
 const before=await geometry(page);
 // Both actions in the same browser task guarantee that the mode switch
 // occurs before the queued PDF repaint, rather than after Playwright waits.
 await page.evaluate(()=>{document.getElementById('rtZoomIn').click();document.getElementById('rtTable').click();});
 await expectWidth(page,'greater',before.box.width,'zoom remains applied while switching selection mode');
 await page.waitForFunction(()=>{
  const canvas=document.getElementById('rtCanvas'),width=parseFloat(canvas.style.width),height=parseFloat(canvas.style.height),ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(2800000/(width*height)));
  return Math.abs(canvas.width-Math.ceil(width*ratio))<=1&&Math.abs(canvas.height-Math.ceil(height*ratio))<=1;
 },null,{timeout:6000});
 const after=await geometry(page);assert.notEqual(after.bitmapPixels,before.bitmapPixels,'the new zoom receives a sharp PDF repaint after switching mode');assert.deepEqual(selected(after),selected(before));
 await page.locator('#rtZoomOut').click();await expectWidth(page,'less',after.box.width,'zoom-out restores the starting scale');
 console.log('PASS immediate zoom/mode switch retains the queued sharp PDF repaint');
}
async function buttonsAndClamps(page,fitWidth){
 const original=selected(await geometry(page)),before=await geometry(page);
 await page.locator('#rtZoomIn').click();const bigger=await expectWidth(page,'greater',before.box.width,'the existing plus button still zooms');
 await page.locator('#rtZoomOut').click();await expectWidth(page,'less',bigger.box.width,'the existing minus button still zooms');
 await page.locator('#rtZoomIn').evaluate(button=>{for(let i=0;i<18;i++)button.click();});
 await page.waitForFunction(expected=>Math.abs(document.getElementById('rtCanvasBox').getBoundingClientRect().width-expected)<3,fitWidth*6);await settle(page);
 const max=await geometry(page);assert(Math.abs(max.box.width/fitWidth-6)<.02,'zoom clamps to six times the fitted page');
 assert(max.bitmapPixels<=2900000,'maximum zoom retains the existing bounded render memory');
 await page.locator('#rtZoomOut').evaluate(button=>{for(let i=0;i<24;i++)button.click();});
 await page.waitForFunction(expected=>Math.abs(document.getElementById('rtCanvasBox').getBoundingClientRect().width-expected)<3,fitWidth*.5);await settle(page);
 const min=await geometry(page);assert(Math.abs(min.box.width/fitWidth-.5)<.02,'zoom clamps to half the fitted page');
 assert.deepEqual(selected(min),original,'zoom buttons and both limits preserve selected areas');
 // Leave enough document overflow for subsequent panning and selection checks.
 await page.locator('#rtZoomIn').evaluate(button=>{for(let i=0;i<4;i++)button.click();});await settle(page);
 console.log('PASS zoom buttons, minimum/maximum limits and bounded bitmap');
}
async function panMouse(page){
 await page.locator('#rtMove').click();await showViewport(page);
 await page.locator('#rtViewport').evaluate(node=>{node.scrollLeft=90;node.scrollTop=180;});
 const before=await geometry(page),start={x:before.viewport.left+before.viewport.width*.55,y:before.viewport.top+before.viewport.height*.5};
 await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+65,start.y+55,{steps:5});await page.mouse.up();await settle(page);
 const after=await geometry(page);assert(after.scrollLeft<before.scrollLeft-35&&after.scrollTop<before.scrollTop-30,'move mode pans with a mouse drag');
 assert.deepEqual(selected(after),selected(before),'panning does not replace selected regions');assert(after.draftHidden);
 console.log('PASS move mode mouse panning without changing selections');
}
async function mouseSelect(page){
 await page.locator('#rtCode').click();const before=await showViewport(page),a={x:before.viewport.left+before.viewport.width*.30,y:before.viewport.top+before.viewport.height*.30},b={x:a.x+75,y:a.y+45};
 const start=normAt(before,a),end=normAt(before,b);
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();
 const after=await geometry(page);closePoint(after.code,start,'mouse selection starts at the drawing coordinates',.001);
 assert(Math.abs(after.code.w-(end.x-start.x))<.001&&Math.abs(after.code.h-(end.y-start.y))<.001,'mouse drag selects the expected normalized size after zoom/pan');
 assert.deepEqual(after.table,before.table);assert(after.draftHidden);
 console.log('PASS mouse selection remains accurate after zoom and panning');
}
async function touchEvent(session,type,points){
 await session.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((point,index)=>({x:point.x,y:point.y,id:point.id??index+1,radiusX:2,radiusY:2,force:1}))});
}
async function pinch(page,session,mode){
 await page.locator(mode==='code'?'#rtCode':'#rtTable').click();const before=await showViewport(page),center={x:before.viewport.left+before.viewport.width*.5,y:before.viewport.top+before.viewport.height*.42},anchor=normAt(before,center),distance=Math.min(110,before.viewport.width*.28);
 await touchEvent(session,'touchStart',[{x:center.x-distance/2,y:center.y,id:1},{x:center.x+distance/2,y:center.y,id:2}]);
 for(let step=1;step<=5;step++){
  const expanded=distance*(1+step*.15);
  await touchEvent(session,'touchMove',[{x:center.x-expanded/2,y:center.y,id:1},{x:center.x+expanded/2,y:center.y,id:2}]);
 }
 await touchEvent(session,'touchEnd',[]);
 const after=await expectWidth(page,'greater',before.box.width,'two fingers zoom the selection canvas');
 closePoint(normAt(after,center),anchor,'the drawing point between the fingers remains anchored',.018);
 assert.deepEqual(selected(after),selected(before),'pinching in '+mode+' mode never replaces a marked region');assert(after.draftHidden,'pinch clears its initial one-finger selection draft');
 console.log('PASS trusted two-finger pinch in '+mode+' mode anchors the center without selecting');
}
async function panTouch(page,session){
 await page.locator('#rtMove').click();await showViewport(page);await page.locator('#rtViewport').evaluate(node=>{node.scrollLeft=90;node.scrollTop=180;});
 const before=await geometry(page),a={x:before.viewport.left+before.viewport.width*.5,y:before.viewport.top+before.viewport.height*.48};
 await touchEvent(session,'touchStart',[a]);
 for(let step=1;step<=5;step++)await touchEvent(session,'touchMove',[{x:a.x+step*12,y:a.y+step*10}]);
 await touchEvent(session,'touchEnd',[]);await settle(page);
 const after=await geometry(page);assert(after.scrollLeft<before.scrollLeft-25&&after.scrollTop<before.scrollTop-20,'one finger pans in move mode');assert.deepEqual(selected(after),selected(before));
 console.log('PASS one-finger panning in move mode');
}
async function touchSelect(page,session){
 await page.locator('#rtTable').click();const before=await showViewport(page),a={x:before.viewport.left+before.viewport.width*.30,y:before.viewport.top+before.viewport.height*.3},b={x:a.x+70,y:a.y+45},start=normAt(before,a),end=normAt(before,b);
 await touchEvent(session,'touchStart',[a]);for(let step=1;step<=5;step++)await touchEvent(session,'touchMove',[{x:a.x+(b.x-a.x)*step/5,y:a.y+(b.y-a.y)*step/5}]);await touchEvent(session,'touchEnd',[]);
 const after=await geometry(page);closePoint(after.table,start,'single-touch selection starts at the drawing coordinates',.001);assert(Math.abs(after.table.w-(end.x-start.x))<.001&&Math.abs(after.table.h-(end.y-start.y))<.001,'single-touch selection remains accurate after pinch');assert.deepEqual(after.code,before.code);assert(after.draftHidden);
 console.log('PASS single-touch table selection after pinch and panning');
}
async function readMarkedText(page){
 await page.locator('#rtCode').click();await showViewport(page);await page.locator('#rtViewport').evaluate(node=>{node.scrollLeft=0;node.scrollTop=0;});
 const state=await geometry(page),a={x:state.box.left+codeRect.x*state.box.width,y:state.box.top+codeRect.y*state.box.height},b={x:a.x+codeRect.w*state.box.width,y:a.y+codeRect.h*state.box.height};
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();
 await setRect(page,'Tabell',tableRect);await page.locator('#rtImageMode').selectOption('text');await page.locator('#rtWorkPolicy').selectOption('all');
 await page.locator('#rtPreview').click();await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:15000});
 assert.equal(await page.getByLabel('Beteckning kort 1',{exact:true}).inputValue(),'GS88','a code selected on the zoomed page feeds the existing text reader');
 const work=await page.getByLabel('Arbetsrader kort 1',{exact:true}).inputValue();for(const term of ['EL580','HOPPE'])assert(work.includes(term),'normalized table coordinates still read '+term);
 assert.equal(await page.locator('script[src*="tesseract"]').count(),0,'text preview after navigation does not load OCR');
 console.log('PASS zoomed code selection and normalized table feed the text-only reading pipeline');
}
async function exercise(browser,device,bytes){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch}),page=await context.newPage(),errors=[],remote=[];
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(request.url()))remote.push(request.url());});
 try{
  await page.goto(url());await page.locator('#pwFile').setInputFiles({name:'generated-zoom-card.pdf',mimeType:'application/pdf',buffer:bytes});await page.waitForSelector('#rtDialog[open]');await page.waitForFunction(()=>document.getElementById('rtCanvas').width>100);
  console.log('READY '+device.name+' generated selection preview');
  await setRect(page,'Kod',codeRect);await setRect(page,'Tabell',tableRect);await settle(page);
  const fitWidth=(await geometry(page)).box.width;
  await modeSwitchRepaint(page);
  if(!device.touch)await wheelZoom(page);
  else{
   const session=await context.newCDPSession(page);await pinch(page,session,'code');await pinch(page,session,'table');await panTouch(page,session);await touchSelect(page,session);await session.detach();
  }
  await buttonsAndClamps(page,fitWidth);await panMouse(page);await mouseSelect(page);await readMarkedText(page);
  if(process.env.SMARTMATCH_QA_DIR){fs.mkdirSync(process.env.SMARTMATCH_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SMARTMATCH_QA_DIR,device.name+'-read-zoom-v8.png'),fullPage:true});}
  assert.equal(await page.locator('#rtDialog[open]').count(),1,'navigation gestures leave the reading guide open');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'zoom requires no external services');
  console.log('PASS '+device.name+' TEST 8 reading-view navigation and selections');
 }catch(error){console.error('Browser state:',await geometry(page).catch(()=>null),errors);throw error;}
 finally{await context.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
  const bytes=await fixture();for(const device of devices)await exercise(browser,device,bytes);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
