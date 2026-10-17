/* Browser integration for invisible searchable text over preserved raster cards.
 * The bundled offline Tesseract is used on desktop by default. Auth substitution
 * exists only inside this test browser; no application auth is changed.
 * DRAWING_OCR_DEVICE=desktop|ipad|iphone limits viewport coverage.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {PDFDocument,StandardFonts,PDFName,PDFString,PDFArray,PDFRawStream,decodePDFRawStream}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),qa=process.env.DRAWING_OCR_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'drawing-ocr-'));
const region={x:.04,y:.04,w:.92,h:.80};
const devices=[{name:'desktop',width:1366,height:1000},{name:'ipad',width:1024,height:1366,touch:true},{name:'iphone',width:390,height:844,touch:true}].filter(device=>!process.env.DRAWING_OCR_DEVICE||process.env.DRAWING_OCR_DEVICE===device.name);
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 fs.readFile(file,(error,data)=>{if(error){response.writeHead(404);return response.end();}response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');response.end(data);});
});
async function fixture(page,native=false){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 const plan=doc.addPage([6000,3000]);plan.drawText('OVERSIKTSRITNING GS 23',{font,size:90,x:200,y:2600});
 plan.node.set(PDFName.of('Annots'),doc.context.obj([doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',Rect:[100,100,400,180],Subj:PDFString.of('GS23'),Contents:PDFString.of('GS 23'),F:4,NM:PDFString.of('retained-stamp')}))]));
 for(const [index,heading]of ['Beslagskod: DBLB UPPST','Beslagskod: GS 23'].entries()){
  const pg=doc.addPage([600,800]);
  if(native){pg.drawText(heading,{font,size:17,x:38,y:741});pg.drawText('Komponent     Produkt     Mont av     Lev av',{font,size:13,x:38,y:655});}
  else{
   const png=await page.evaluate(heading=>{
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1600;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1200,1600);ctx.fillStyle='#111';ctx.font='bold 36px Arial';ctx.fillText(heading,76,118);ctx.font='28px Arial';ctx.fillText('DORRKORT - installationsunderlag',76,180);
    const xs=[76,380,720,920,1124],ys=[254,334,414,494,574];ctx.lineWidth=2;ctx.strokeStyle='#222';for(const x of xs){ctx.beginPath();ctx.moveTo(x,ys[0]);ctx.lineTo(x,ys.at(-1));ctx.stroke();}for(const y of ys){ctx.beginPath();ctx.moveTo(xs[0],y);ctx.lineTo(xs.at(-1),y);ctx.stroke();}
    const rows=[['Komponent','Produkt','Mont av','Lev av'],['Trycke','6696','GS','DT'],['Lashus','310-50','DT','GS'],['Cylinder','Utsida','GS','GS']];
    for(let row=0;row<rows.length;row++)for(let column=0;column<4;column++)ctx.fillText(rows[row][column],xs[column]+12,ys[row]+48);
    ctx.font='24px Arial';ctx.fillText('Originalbild och linjer skall bevaras.',76,680);return canvas.toDataURL('image/png').split(',')[1];
   },heading);
   const image=await doc.embedPng(Buffer.from(png,'base64'));pg.drawImage(image,{x:0,y:0,width:600,height:800});
  }
  pg.drawText('Native footer outside the marked card '+(index+1),{font,size:10,x:35,y:30});
 }
 const form=doc.getForm(),field=form.createTextField('retained-field');field.setText('Original field value');field.addToPage(doc.getPage(0),{x:500,y:100,width:260,height:50});
 await doc.attach(Buffer.from('Original attachment'),'retained.txt',{mimeType:'text/plain'});doc.setTitle('Searchable door-card OCR fixture');
 return Buffer.from(await doc.save({useObjectStreams:false}));
}
async function contextFor(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.__ocrQA={workers:0,recognize:[],terminated:0,never:false,slow:0,renders:{},capture:false};
  let tesseract;Object.defineProperty(window,'Tesseract',{configurable:true,get:()=>tesseract,set:value=>{
   tesseract=new Proxy(value,{get(target,key){if(key!=='createWorker')return Reflect.get(target,key);return async(...args)=>{
    window.__ocrQA.workers++;const worker=await target.createWorker(...args);return new Proxy(worker,{get(target,key){const value=target[key];if(typeof value!=='function')return value;return(...args)=>{
     if(key==='terminate')window.__ocrQA.terminated++;
     if(key==='recognize'){const qa=window.__ocrQA,canvas=args[0];qa.recognize.push({width:canvas.width,height:canvas.height});if(qa.never)return new Promise(()=>{});if(qa.slow)return new Promise(resolve=>setTimeout(resolve,qa.slow)).then(()=>value.apply(target,args));}
     return value.apply(target,args);
    };}});
   };}});
  }});
  let pdfjs;Object.defineProperty(window,'pdfjsLib',{configurable:true,get:()=>pdfjs,set:value=>{
   pdfjs=new Proxy(value,{get(target,key){if(key!=='getDocument')return Reflect.get(target,key);return(...args)=>{const task=target.getDocument(...args);let promise;return new Proxy(task,{get(target,key){if(key!=='promise'){const value=target[key];return typeof value==='function'?value.bind(target):value;}return promise||=target.promise.then(doc=>new Proxy(doc,{get(target,key){if(key!=='getPage'){const value=target[key];return typeof value==='function'?value.bind(target):value;}return async number=>new Proxy(await target.getPage(number),{get(target,key){const value=target[key];if(typeof value!=='function')return value;return(...args)=>{if(key==='render'&&window.__ocrQA.capture)window.__ocrQA.renders[number]=(window.__ocrQA.renders[number]||0)+1;return value.apply(target,args);};}});}}));}});};}});
  }});
 });
 return context;
}
async function ready(page){await page.waitForFunction(()=>document.body.classList.contains('hasDrawing')&&!document.getElementById('workspace').hasAttribute('aria-busy'));}
async function open(page,bytes){await page.locator('#toolFile').setInputFiles({name:'ocr-cards.pdf',mimeType:'application/pdf',buffer:bytes});await ready(page);await page.waitForFunction(()=>document.getElementById('previewCanvas').width>10);}
async function tools(page){if(await page.locator('#toolPanel').isHidden())await page.locator('#toolsToggle').click();const section=page.locator('#ocrTools');if(await section.getAttribute('open')===null)await section.locator(':scope > summary').click();}
async function mark(page,device){
 await tools(page);await page.locator('#ocrMarkArea').click();
 const canvas=await page.locator('#previewCanvas').boundingBox(),start={x:canvas.x+canvas.width*region.x,y:canvas.y+canvas.height*region.y},end={x:canvas.x+canvas.width*(region.x+region.w),y:canvas.y+canvas.height*(region.y+region.h)};
 if(device.touch){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();}
 await page.waitForFunction(()=>!document.getElementById('ocrAreaRect').hidden);await tools(page);
}
async function inspect(page,bytes){return page.evaluate(async base64=>{
 const doc=await pdfjsLib.getDocument({data:Uint8Array.from(atob(base64),c=>c.charCodeAt(0))}).promise,out=[];
 try{for(let number=1;number<=doc.numPages;number++){
  const pg=await doc.getPage(number),viewport=pg.getViewport({scale:number===1?.12:1}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const ctx=canvas.getContext('2d');await pg.render({canvasContext:ctx,viewport,background:'white'}).promise;
  let hash=2166136261;for(const b of ctx.getImageData(0,0,canvas.width,canvas.height).data)hash=Math.imul(hash^b,16777619);
  out.push({hash:hash>>>0,words:(await pg.getTextContent()).items.filter(x=>x.str).map(x=>({text:x.str,x:x.transform[4],y:x.transform[5],width:x.width,height:x.height})),annotations:(await pg.getAnnotations()).map(x=>({subtype:x.subtype,fieldName:x.fieldName,contents:x.contentsObj?.str}))});canvas.width=canvas.height=1;
 }}finally{await doc.destroy();}return out;
},Buffer.from(bytes).toString('base64'));}
function contentStreams(doc,index){const value=doc.getPage(index).node.Contents(),streams=value instanceof PDFArray?value.asArray():[value];return streams.filter(Boolean).map(ref=>{const stream=doc.context.lookup(ref);assert(stream instanceof PDFRawStream);return Buffer.from(decodePDFRawStream(stream).decode()).toString('base64');});}
async function assertOriginalRetained(source,output,indices=[0,1,2]){
 const before=await PDFDocument.load(source),after=await PDFDocument.load(output);assert.equal(after.getPageCount(),indices.length);assert.equal(after.getTitle(),before.getTitle());
 assert.equal(after.getForm().getTextField('retained-field').getText(),'Original field value');assert(after.catalog.lookup(PDFName.of('Names')).has(PDFName.of('EmbeddedFiles')),'original attachment remains');
 for(const [target,index]of indices.entries()){const old=contentStreams(before,index),next=contentStreams(after,target);for(const stream of old)assert(next.includes(stream),'original content stream remains on page '+(index+1));assert.deepEqual(after.getPage(target).getSize(),before.getPage(index).getSize());}
}
module.exports={fixture,inspect,assertOriginalRetained,region};
async function read(page){
 await tools(page);await page.evaluate(()=>{__ocrQA.capture=true;__ocrQA.renders={};__ocrQA.recognize=[];});await page.locator('#ocrRead').click();
 await page.waitForFunction(()=>document.getElementById('ocrProgressDialog').open||document.querySelector('#ocrResults [data-ocr-page]'),null,{timeout:15000});
 await page.waitForFunction(()=>!document.getElementById('ocrProgressDialog').open&&!document.getElementById('workspace').hasAttribute('aria-busy'),null,{timeout:180000});
 return page.evaluate(()=>{__ocrQA.capture=false;return __ocrQA;});
}
async function searchableDownload(page){
 await page.locator('#ocrReviewApproval').check();const pending=page.waitForEvent('download');await page.locator('#ocrSave').click();const file=await pending;await ready(page);return fs.readFileSync(await file.path());
}
async function smartMatchNative(context,output){
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/smartmatch-read-test-v9.html');
  await page.locator('#pwFile').setInputFiles({name:'prepared-searchable-cards.pdf',mimeType:'application/pdf',buffer:output});await page.waitForSelector('#rtDialog[open]');
  await page.locator('#rtReadPhase').selectOption('full');await page.locator('#rtImageMode').selectOption('text');
  await page.evaluate(()=>{document.getElementById('rtSetupDetails').open=true;});await page.locator('#rtPages').fill('2-3');
  for(const [kind,rect]of [['Kod',{x:.05,y:.05,w:.88,h:.035}],['Tabell',{x:.05,y:.15,w:.90,h:.23}]])for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel(kind+' '+label,{exact:true}).evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);
  await page.locator('#rtPreview').click();await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled&&document.querySelectorAll('.rtResult').length===2,null,{timeout:90000});
  const codes=await page.locator('.rtResult input[aria-label^="Beteckning kort"]').evaluateAll(nodes=>nodes.map(node=>node.value));assert.deepEqual(codes,['DBLBUPPST','GS23'],'TEST 9 reads both complete raster headings from the new native text layer');
  const work=await page.getByLabel('Arbetsrader kort 2',{exact:true}).inputValue();assert(work.includes('6696')&&work.includes('Utsida'));assert(!work.includes('310-50'),'TEST 9 text-only workflow preserves GS mounting vs DT mounting');
  assert.equal(await page.evaluate(()=>__ocrQA.workers),0,'actual TEST 9 text-only code and table read starts no OCR worker');assert.equal(await page.evaluate(()=>__ocrQA.recognize.length),0);
  await page.screenshot({path:path.join(qa,'desktop-smartmatch-native-review.png'),fullPage:true});assert.deepEqual(errors,[]);console.log('PASS actual TEST 9: prepared raster cards read as native PDF text, full identifiers and GS table products, zero OCR');
 }finally{await page.close();}
}
async function dragRect(page,rect){
 const canvas=await page.locator('#previewCanvas').boundingBox();await page.mouse.move(canvas.x+canvas.width*rect.x,canvas.y+canvas.height*rect.y);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*(rect.x+rect.w),canvas.y+canvas.height*(rect.y+rect.h),{steps:8});await page.mouse.up();
}
async function editIntegration(page,source){
 await open(page,source);await page.evaluate(()=>DrawingToolsBridge.removePages([1]));await page.evaluate(()=>DrawingToolsBridge.showPage(2));
 await page.evaluate(()=>document.getElementById('cropMode').click());await dragRect(page,{x:.03,y:.03,w:.94,h:.72});await page.waitForFunction(()=>!!DrawingToolsBridge.getOcrOptions().clipRects[2]);
 await page.evaluate(()=>document.getElementById('eraseMode').click());await dragRect(page,{x:.31,y:.218,w:.12,h:.038});await page.waitForFunction(()=>DrawingToolsBridge.getOcrOptions().excludeRects[2]?.length===1);await page.evaluate(()=>document.getElementById('previewEditMode').click());
 assert.deepEqual(await page.evaluate(()=>DrawingToolsBridge.getKeptPages()),[2,3]);
 // A normal save supplies the exact intended appearance after crop/page/mask edits.
 await page.locator('#savePdf').click();await page.locator('#pdfSaveDialog').waitFor({state:'visible'});const ordinaryPending=page.waitForEvent('download');await page.locator('#pdfSaveConfirm').click();const ordinaryFile=await ordinaryPending,ordinary=fs.readFileSync(await ordinaryFile.path());await ready(page);
 await page.evaluate(region=>DrawingOcrTool.setRegion(region,2),region);await tools(page);await page.locator('#ocrUseSimilar').click();await page.waitForFunction(()=>!document.getElementById('ocrProgressDialog').open&&document.getElementById('ocrPages').value!=='2');await read(page);const searchable=await searchableDownload(page),plainView=await inspect(page,ordinary),view=await inspect(page,searchable);
 assert.equal(view.length,2,'the removed overview page is absent from searchable output');assert.deepEqual(view.map(x=>x.hash),plainView.map(x=>x.hash),'adding the OCR layer preserves the current crop and mask appearance exactly');
 const first=view[0].words.map(x=>x.text).join(' '),second=view[1].words.map(x=>x.text).join(' ');assert(first.includes('DBLB')&&first.includes('UPPST'),'original page 2 text is attached to output page 1 before page removal');assert(!first.includes('6696'),'masked screenshot product is absent from the new searchable layer');assert.match(second,/GS\s*23/,'original page 3 text is attached to output page 2');assert(second.includes('6696'),'an unmasked product on another page remains searchable');
 assert(!view.some(x=>x.annotations.some(a=>a.subtype==='Stamp')),'the removed plan does not leave its stamp on a retained card');
 const out=await PDFDocument.load(searchable),baseline=await PDFDocument.load(ordinary);assert.deepEqual(out.getPage(0).getCropBox(),baseline.getPage(0).getCropBox(),'searchable output uses the current exact crop box');assert(out.catalog.lookup(PDFName.of('Names')).has(PDFName.of('EmbeddedFiles')),'attachment survives page removal/crop/mask OCR export');
 const geometry=await page.evaluate(async base64=>{const doc=await pdfjsLib.getDocument({data:Uint8Array.from(atob(base64),c=>c.charCodeAt(0))}).promise;try{const pg=await doc.getPage(1),vp=pg.getViewport({scale:1}),word=(await pg.getTextContent()).items.find(x=>x.str==='DBLB');return{width:vp.width,height:vp.height,point:vp.convertToViewportPoint(word.transform[4],word.transform[5])};}finally{await doc.destroy();}},searchable.toString('base64'));
 assert(Math.abs(geometry.width-564)<1&&Math.abs(geometry.height-576)<1,'PDF.js sees the cropped page dimensions');assert(geometry.point[0]>100&&geometry.point[0]<160&&geometry.point[1]>10&&geometry.point[1]<60,'searchable header remains at its visual location after cropping');
 fs.writeFileSync(path.join(qa,'desktop-edited-searchable.pdf'),searchable);console.log('PASS bridge integration: remove original page 1, crop/mask original page 2, hidden text remaps to output pages correctly, masked word excluded, edited appearance pixel-identical');
}
async function runDevice(browser,device){
 const context=await contextFor(browser,device),page=await context.newPage(),errors=[];let downloads=0;
 page.on('pageerror',error=>errors.push(error.message));page.on('download',()=>downloads++);
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/drawing-tools.html');
  await page.waitForFunction(()=>window.DrawingOcrTool&&window.DrawingToolsBridge);
  const source=await fixture(page);fs.writeFileSync(path.join(qa,'raster-cards.pdf'),source);
  await open(page,source);await page.locator('#nextPage').click();await page.waitForFunction(()=>document.getElementById('pageInfo').textContent.includes('2'));await ready(page);await mark(page,device);
  assert.equal(await page.locator('#ocrPages').inputValue(),'2','marking a card defaults to that page only');
  assert((await page.locator('#ocrAreaInfo').textContent()).trim(),'marked full-card region has a visible explanation');
  await page.locator('#ocrUseSimilar').click();await page.waitForFunction(()=>document.getElementById('ocrPages').value!=='2'&&!document.getElementById('ocrProgressDialog').open);assert.match(await page.locator('#ocrPages').inputValue(),/^2(?:\s*[-–,]\s*)3$/,'same-size card pages are offered without including the large overview plan');
  assert(await page.locator('#ocrSave').isDisabled(),'an unfinished/unreviewed reading cannot download');
  const calls=await read(page);
  assert(calls.workers>0&&calls.recognize.length>0,'mixed PDF-text and raster card still starts image OCR');
  assert.deepEqual(Object.keys(calls.renders).sort(),['2','3'],'only explicitly selected card pages are rendered');
  assert(Object.values(calls.renders).every(count=>count===1),'each selected page is rasterized once and reused across OCR tiles');
  assert(await page.locator('#ocrSave').isDisabled(),'the user must review OCR before PDF export');
  for(const details of await page.locator('#ocrResults details[data-ocr-page]').all())await details.locator(':scope > summary').click();
  assert.match(await page.locator('#ocrResults').innerText(),/DBLB|GS|UPPST/,'the review contains the full arbitrary card heading, not a restricted code list');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'OCR controls fit the viewport');
  await page.screenshot({path:path.join(qa,device.name+'-review.png')});
  const before=await inspect(page,source),output=await searchableDownload(page);fs.writeFileSync(path.join(qa,device.name+'-searchable.pdf'),output);await assertOriginalRetained(source,output);
  const jsonPending=page.waitForEvent('download');await page.locator('#ocrSaveJson').click();const jsonFile=await jsonPending,json=JSON.parse(fs.readFileSync(await jsonFile.path(),'utf8'));
  assert.equal(json.coordinateSystem,'viewport-top-left');assert.deepEqual(json.pages.map(x=>x.page),[2,3]);assert(json.pages.every(x=>x.words.some(w=>w.text&&Number.isFinite(w.x)&&Number.isFinite(w.y)&&Number.isFinite(w.w)&&Number.isFinite(w.h))),'JSON includes the extracted text and original page positions');
  const after=await inspect(page,output);assert.deepEqual(after.map(x=>x.hash),before.map(x=>x.hash),'invisible text makes no pixel change to original images, lines, form or stamp');
  assert(after[1].words.map(x=>x.text).join(' ').includes('DBLB'),'the first raster-card heading is now native searchable PDF text');
  assert.match(after[2].words.map(x=>x.text).join(' '),/GS\s*23/,'the second raster-card heading is now searchable');
  for(const card of after.slice(1)){
   const mont=card.words.find(x=>/Mont/i.test(x.text)),lev=card.words.find(x=>/Lev/i.test(x.text));assert(mont&&lev,'table responsibility headings are searchable');assert(mont.x<lev.x,'Mont av and Lev av retain their original separate column positions');
   assert(card.words.some(x=>/6696/.test(x.text)),'screenshot table products are searchable');
  }
  assert.deepEqual(after[0].annotations,before[0].annotations,'original plan stamp and form annotations are retained');
  // Use the same PDF.js coordinate conversion and existing GS table parser as TEST 9.
  await page.addScriptTag({path:path.join(root,'smartmatch-read-work-v7.js')});
  const work=await page.evaluate(async base64=>{
   const doc=await pdfjsLib.getDocument({data:Uint8Array.from(atob(base64),c=>c.charCodeAt(0))}).promise;
   try{const pg=await doc.getPage(3),vp=pg.getViewport({scale:1}),tc=await pg.getTextContent(),words=tc.items.filter(x=>x.str?.trim()).map(item=>{const x=item.transform[4],y=item.transform[5],h=Math.max(1,item.height||Math.hypot(item.transform[2],item.transform[3])),w=Math.max(1,item.width||1),r=vp.convertToViewportRectangle([x,y-h*.25,x+w,y+h*.95]);return{text:item.str,x:Math.min(r[0],r[2]),y:Math.min(r[1],r[3]),w:Math.abs(r[2]-r[0]),h:Math.abs(r[3]-r[1]),confidence:100};});return SmartMatchReadWork.read({words});}finally{await doc.destroy();}
  },output.toString('base64'));
  assert(work.work.some(x=>/6696/.test(x)),'TEST 9 GS parser can read the prepared PDF table as native text');assert(!work.work.some(x=>/310-50/.test(x)),'GS delivery and DT installation do not become GS work');
  // Reopen the prepared copy: existing invisible words must not be emitted twice.
  await open(page,output);await page.locator('#nextPage').click();await ready(page);await page.evaluate(region=>DrawingOcrTool.setRegion(region,2),region);await tools(page);await page.locator('#ocrUseSimilar').click();await page.waitForFunction(()=>!document.getElementById('ocrProgressDialog').open&&document.getElementById('ocrPages').value!=='2');
  await read(page);assert(await page.locator('#ocrSave').isDisabled(),'preparing an already-covered region cannot add the same text layer a second time');
  if(device.name==='desktop'){
   // Cancellation must unlock even if the vendor recognize promise never settles.
   await open(page,source);await page.locator('#nextPage').click();await ready(page);await page.evaluate(region=>{DrawingOcrTool.setRegion(region,2);__ocrQA.never=true;__ocrQA.recognize=[];},region);await tools(page);await page.locator('#ocrRead').click();
   await page.waitForFunction(()=>document.getElementById('ocrProgressDialog').open&&__ocrQA.recognize.length>0,null,{timeout:60000});
   const message=(await page.locator('#ocrProgressMessage').textContent())||'';assert(message.trim(),'progress explains the current page/region activity');assert((await page.locator('#ocrProgressTime').textContent()).trim(),'elapsed/remaining time is visible');
   assert.match(await page.locator('#ocrProgressPercent').textContent(),/\d+\s*%/,'progress shows an overall percentage');await page.screenshot({path:path.join(qa,'desktop-progress.png')});
   const count=downloads;await page.locator('#ocrProgressCancel').click();await page.waitForFunction(()=>!document.getElementById('ocrProgressDialog').open&&!document.getElementById('workspace').hasAttribute('aria-busy'),null,{timeout:2500});
   assert.equal(downloads,count,'cancel never downloads a partial PDF');assert(await page.locator('#ocrSave').isDisabled(),'cancel invalidates incomplete OCR output');assert(await page.evaluate(()=>__ocrQA.terminated>0),'cancel terminates OCR worker');
   // A genuinely native page does not need an OCR worker, despite text elsewhere.
   const native=await fixture(page,true);await open(page,native);await page.locator('#nextPage').click();await ready(page);await page.evaluate(region=>{DrawingOcrTool.setRegion(region,2);__ocrQA.never=false;},region);await tools(page);const nativeCalls=await read(page);assert.equal(nativeCalls.recognize.length,0,'native text alone is never sent to OCR');
   await smartMatchNative(context,output);
   await editIntegration(page,source);
  }
  await open(page,source);assert(await page.locator('#ocrSave').isDisabled(),'opening another source invalidates the previous export');assert.equal(await page.locator('#ocrResults').innerText(),'','opening another source clears old text results');
  assert.deepEqual(errors,[],'no browser runtime errors');
  console.log('PASS '+device.name+': full-card mouse/touch selection, explicit similar-page choice, real local OCR, invisible pixel-identical text PDF, preserved source metadata, GS table coordinates, repeat reuse and invalidation');
 }catch(error){await page.screenshot({path:path.join(qa,device.name+'-failure.png')}).catch(()=>{});console.error('Browser state:',await page.evaluate(()=>({status:document.getElementById('ocrStatus')?.textContent,results:document.getElementById('ocrResults')?.innerText,pages:document.getElementById('ocrPages')?.value,progress:document.getElementById('ocrProgressMessage')?.textContent,calls:window.__ocrQA})).catch(()=>null),errors);throw error;}
 finally{await context.close();}
}
async function main(){
 fs.mkdirSync(qa,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});for(const device of devices)await runDevice(browser,device);console.log('QA files: '+qa);}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
