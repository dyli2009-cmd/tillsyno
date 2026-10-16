/* Real PDF bytes and browser UI checks. No auth/server changes are made. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {createHash}=require('node:crypto');
const lib=require('../vendor/pdf-lib.min.js'),drawing=require('../drawing-pdf.js');
const {PDFDocument,StandardFonts,PDFName,PDFDict,PDFArray,PDFRawStream,decodePDFRawStream,degrees,rgb}=lib;
const root=path.resolve(__dirname,'..'),qa=process.env.DRAWING_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'drawing-v360-'));
fs.mkdirSync(qa,{recursive:true});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(name,bytes)=>{fs.writeFileSync(path.join(qa,name),bytes);return bytes;};
const load=bytes=>PDFDocument.load(bytes,{updateMetadata:false});
async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 doc.setTitle('Drawing export fixture');
 for(let n=0;n<3;n++){
  const p=doc.addPage([600,400]);p.drawText('GS'+(n+1)+' WC - ED100',{x:100,y:260,size:18,font});
  p.drawLine({start:{x:90,y:230},end:{x:490,y:230},thickness:.3,color:rgb(0,0,0)});
  p.drawRectangle({x:100,y:100,width:300,height:100,borderWidth:.2,borderColor:rgb(.2,.2,.2)});
 }
 const p=doc.getPage(0),link=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[95,250,300,285],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:lib.PDFString.of('https://example.test/GS1')}}));
 p.node.set(PDFName.of('Annots'),doc.context.obj([link]));
 return save('original.pdf',await doc.save({useObjectStreams:false}));
}
async function sourceDrawing(bytes){
 const doc=await load(bytes);
 for(const name of ['DorrserviceWork','SecurityServiceWork']){
  const data=doc.catalog.lookupMaybe(PDFName.of(name),PDFDict);if(!data)continue;
  const stream=data.lookupMaybe(PDFName.of('Drawing'),PDFRawStream);if(stream)return decodePDFRawStream(stream).decode().slice();
 }
 return bytes;
}
async function nodeTests(bytes){
 const hash=digest(bytes),optimized=await drawing.optimize(bytes),doc=await load(optimized.bytes);
 assert.equal(digest(bytes),hash,'source bytes remain unchanged');assert(optimized.bytes.length<=bytes.length);
 assert.equal(doc.getPageCount(),3);assert.equal(doc.getTitle(),'Drawing export fixture');
 assert.equal(doc.getPage(0).node.lookup(PDFName.of('Annots'),PDFArray).size(),1,'URI annotation retained');
 save('optimized.pdf',optimized.bytes);
 const edited=await drawing.optimize(bytes,{pages:[0,2],crops:{0:{x:60,y:60,width:420,height:280}},masks:{0:[{x:100,y:100,width:20,height:20}]}}),ed=await load(edited.bytes);
 assert.equal(ed.getPageCount(),2);assert.deepEqual(ed.getPage(0).getSize(),{width:420,height:280});
 assert(ed.getPage(0).node.Resources().has(PDFName.of('Font')),'text stays vector text');
 save('cropped.pdf',edited.bytes);
 const clean=await load((await drawing.optimize(bytes,{removeAnnotations:true})).bytes);
 assert.equal(clean.getPage(0).node.lookup(PDFName.of('Annots'),PDFArray).size(),0);
 const rotated=await load(bytes),rp=rotated.getPage(1);rp.setRotation(degrees(90));rp.setMediaBox(50,80,600,400);rp.setCropBox(60,90,560,360);
 const rotatedBytes=await rotated.save(),rotation=await load((await drawing.optimize(rotatedBytes,{pages:[1],crops:{1:{x:80,y:110,width:250,height:150}}})).bytes);
 assert.equal(rotation.getPage(0).getRotation().angle,90);assert.deepEqual(rotation.getPage(0).getMediaBox(),{x:80,y:110,width:250,height:150});
 const formDoc=await load(bytes),field=formDoc.getForm().createTextField('door');field.setText('GS10 WC');field.addToPage(formDoc.getPage(0),{x:100,y:30,width:120,height:25});
 await formDoc.attach(Buffer.from('important attachment'),'notes.txt',{mimeType:'text/plain'});
 const formBytes=await formDoc.save(),formOut=await load((await drawing.optimize(formBytes,{removeAnnotations:true})).bytes);
 assert.equal(formOut.getForm().getTextField('door').getText(),'GS10 WC');
 assert(formOut.getPage(0).node.lookup(PDFName.of('Annots'),PDFArray).size()>0,'form widget retained when removing comments');
 assert(formOut.catalog.lookup(PDFName.of('Names'),PDFDict).has(PDFName.of('EmbeddedFiles')),'attachments retained');
 const parts=await drawing.split(bytes,1100);let next=1;
 for(const part of parts){const d=await load(part.bytes);assert.equal(part.startPage,next);assert.equal(d.getPageCount(),part.endPage-part.startPage+1);assert(part.bytes.length<=1100||part.oversize);save('part-'+next+'.pdf',part.bytes);next=part.endPage+1;}
 assert.equal(next,4);assert(parts.length>1);
 const oversize=await drawing.split(bytes,100);assert.equal(oversize.length,3);assert(oversize.every(p=>p.oversize));
 const signed=await load(bytes),sig=signed.context.register(signed.context.obj({Type:'Sig',ByteRange:[0,10,20,30]}));
 signed.catalog.set(PDFName.of('Perms'),signed.context.obj({DocMDP:sig}));
 const signedBytes=await signed.save();assert.equal(digest((await drawing.optimize(signedBytes)).bytes),digest(signedBytes));
 await assert.rejects(()=>drawing.optimize(signedBytes,{pages:[0]}),/signerad/);
 await assert.rejects(()=>drawing.split(signedBytes,100),/signerad/);
 await assert.rejects(()=>drawing.optimize(bytes,{pages:[]}),/Sidvalet/);
 const real=[];
 for(const file of JSON.parse(process.env.DRAWING_REAL_PDFS||'[]')){
  const uploaded=fs.readFileSync(file),source=await sourceDrawing(uploaded),before=digest(uploaded),result=await drawing.optimize(source),rd=await load(result.bytes),original=await load(source);
  assert.equal(digest(uploaded),before);assert.equal(rd.getPageCount(),original.getPageCount());assert(result.bytes.length<=source.length);
  real.push({uploaded,source,result:result.bytes});
  save('real-'+real.length+'-source.pdf',source);save('real-'+real.length+'-output.pdf',result.bytes);
  console.log('PASS real PDF: '+source.length+' -> '+result.bytes.length+' bytes, '+rd.getPageCount()+' pages');
 }
 console.log('PASS PDF structure: vectors, cropping, rotation/origins, page removal, masks, annotations, form values/widgets, attachments, whole-page splitting, oversize pages and signature preservation');
 return real;
}
function serverForTests(){return http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,''),file=path.resolve(root,name||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}
});}
async function pdfStats(page,bytes){return page.evaluate(async base64=>{
 const pdf=await pdfjsLib.getDocument({data:Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),disableFontFace:true,useSystemFonts:false}).promise,out=[];
 try{
  for(let n=1;n<=pdf.numPages;n++){
   const p=await pdf.getPage(n),base=p.getViewport({scale:1}),vp=p.getViewport({scale:Math.min(1,1200/Math.max(base.width,base.height))});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
   const ctx=canvas.getContext('2d');await p.render({canvasContext:ctx,viewport:vp,background:'white'}).promise;
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let hash=2166136261;
   for(let i=0;i<pixels.length;i++)hash=Math.imul(hash^pixels[i],16777619);
   out.push({width:base.width,height:base.height,text:(await p.getTextContent()).items.map(x=>x.str).join('|'),annotations:(await p.getAnnotations()).map(a=>({type:a.subtype,url:a.url})),hash:hash>>>0});
   canvas.width=canvas.height=1;
  }
 }finally{await pdf.destroy();}
 return out;
},Buffer.from(bytes).toString('base64'));}
async function browserTests(bytes,real){
 const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
 const server=serverForTests();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  for(const device of [{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true},{name:'ipad',width:1024,height:1366,touch:true}]){
   browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:process.env.DRAWING_BROWSER_ARGS?JSON.parse(process.env.DRAWING_BROWSER_ARGS):['--no-sandbox']});
   const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
   // Only the local test server substitutes the guard; production auth is untouched.
   await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/drawing-tools.html');
   assert.equal(await page.locator('#quality').inputValue(),'lossless');assert(!(await page.locator('#removeAnnotations').isChecked()));
   const ready=()=>page.waitForFunction(()=>document.body.classList.contains('hasDrawing')&&!document.getElementById('workspace').hasAttribute('aria-busy'));
   const open=async buffer=>{await page.locator('#toolFile').setInputFiles({name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from(buffer)});await ready();};
   const tools=async title=>{if(await page.locator('#toolPanel').isHidden())await page.locator('#toolsToggle').click();const summary=page.locator('#toolPanel summary').filter({hasText:title});if(await summary.locator('..').getAttribute('open')===null)await summary.click();};
   const download=async selector=>{const pending=page.waitForEvent('download');await page.locator(selector).click();const file=await pending;return fs.readFileSync(await file.path());};
   await open(bytes);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'workspace fits viewport');
   assert.equal(await page.locator('[data-ta-version-footer]').textContent(),'v2.4.363');
   const result=await download('#savePdf');assert.deepEqual(await pdfStats(page,result),await pdfStats(page,bytes),'unchanged PDF renders and extracts identically');
   for(const r of real){await open(r.uploaded);const exported=await download('#savePdf');assert.deepEqual(await pdfStats(page,exported),await pdfStats(page,r.source),'real drawing content and pixels retained');}
   await open(bytes);await tools('Dölj eller beskär');await page.locator('#cropMode').click();
   const rect=await page.locator('#previewCanvas').boundingBox(),start={x:rect.x+rect.width*.1,y:rect.y+rect.height*.1},end={x:rect.x+rect.width*.8,y:rect.y+rect.height*.9};
   if(device.touch){
    const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
   }else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();}
   await page.waitForFunction(()=>document.getElementById('pageState').textContent.includes('beskuren'));
   await tools('Sidor');await page.locator('#nextPage').click();await page.locator('#removePage').click();
   const edited=await load(await download('#savePdf'));assert.equal(edited.getPageCount(),2);
   assert(Math.abs(edited.getPage(0).getWidth()-420)<2);assert(Math.abs(edited.getPage(0).getHeight()-320)<2);
   await page.locator('#closeTools').click();await page.locator('#undoDrawing').click();await page.locator('#redoDrawing').click();
   await tools('Rensa ritningen');await page.locator('#removeText').check();await page.locator('#analyzeSize').evaluate(el=>el.click());
   await page.waitForFunction(()=>document.getElementById('toolMessage').classList.contains('error'));assert.match(await page.locator('#toolMessage').textContent(),/bildbaserat/);
   await page.locator('#removeText').uncheck();
   const images=await page.evaluate(()=>{
    const out=[];
    for(let n=0;n<3;n++){
     const c=document.createElement('canvas');c.width=c.height=510;const ctx=c.getContext('2d'),data=ctx.createImageData(510,510);let seed=n+1;
     for(let i=0;i<data.data.length;i+=4){for(let k=0;k<3;k++){seed=(Math.imul(seed,1664525)+1013904223)|0;data.data[i+k]=seed>>>24;}data.data[i+3]=255;}
     ctx.putImageData(data,0,0);out.push(c.toDataURL('image/png').split(',')[1]);c.width=c.height=1;
    }
    return out;
   });
   await page.locator('#toolFile').setInputFiles(images.map((value,i)=>({name:'image-'+i+'.png',mimeType:'image/png',buffer:Buffer.from(value,'base64')})));await ready();
   const imagePdf=await load(await download('#savePdf'));assert.equal(imagePdf.getPageCount(),3);
   assert.deepEqual(imagePdf.getPage(0).getSize(),{width:510,height:510});
   for(const p of imagePdf.getPages()){
    const resources=p.node.Resources().lookup(PDFName.of('XObject'),PDFDict),image=imagePdf.context.lookup(resources.values()[0]);
    assert.equal(image.dict.lookup(PDFName.of('Width')).asNumber(),510);assert.equal(image.dict.lookup(PDFName.of('Height')).asNumber(),510);
   }
   await tools('Dela stor PDF');await page.locator('#splitSize').fill('1');await page.locator('#splitPdf').click();
   await page.waitForFunction(()=>!document.getElementById('splitResults').hidden&&!document.getElementById('workspace').hasAttribute('aria-busy'));
   const links=page.locator('#splitResults a');assert.equal(await links.count(),3);let pages=0;
   for(let i=0;i<await links.count();i++){const part=await download('#splitResults .splitPart:nth-of-type('+(i+1)+') a');assert(part.length<=1024*1024);pages+=(await load(part)).getPageCount();}
   assert.equal(pages,3);
   await page.screenshot({path:path.join(qa,device.name+'-split.png')});
   await page.locator('#splitSize').fill('2');await page.locator('#splitSize').dispatchEvent('change');assert(await page.locator('#splitResults').isHidden());
   const pictures=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=96;c.height=48;const ctx=c.getContext('2d');ctx.fillStyle='#245970';ctx.fillRect(0,0,96,48);ctx.fillStyle='#fefefe';ctx.fillRect(4,4,30,30);return {jpg:c.toDataURL('image/jpeg',.92).split(',')[1],webp:c.toDataURL('image/webp',.9).split(',')[1]};});
   const jpg=Buffer.from(pictures.jpg,'base64');
   await page.locator('#toolFile').setInputFiles({name:'photo.jpg',mimeType:'image/jpeg',buffer:jpg});await ready();
   const jpgPdf=await load(await download('#savePdf')),resources=jpgPdf.getPage(0).node.Resources().lookup(PDFName.of('XObject'),PDFDict),stream=jpgPdf.context.lookup(resources.values()[0]);
   assert(Buffer.from(stream.getContents()).equals(jpg),'ordinary JPEG compressed image bytes are unchanged');
   const exif=Buffer.from([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]);
   const oriented=Buffer.concat([jpg.subarray(0,2),exif,jpg.subarray(2)]);
   await page.locator('#toolFile').setInputFiles({name:'phone-photo.jpg',mimeType:'image/jpeg',buffer:oriented});await ready();
   assert.deepEqual((await load(await download('#savePdf'))).getPage(0).getSize(),{width:48,height:96},'EXIF rotation is retained at full resolution');
   await page.locator('#toolFile').setInputFiles({name:'image.webp',mimeType:'image/webp',buffer:Buffer.from(pictures.webp,'base64')});await ready();
   assert.deepEqual((await load(await download('#savePdf'))).getPage(0).getSize(),{width:96,height:48},'WebP converts without resizing');
   assert.deepEqual(errors,[]);await context.close();await browser.close();browser=null;console.log('PASS '+device.name+': real PDF pixels/text, crop '+(device.touch?'by touch':'by mouse')+', page removal, image resolution, complete downloadable parts, undo/redo and no overflow/errors');
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
(async()=>{const bytes=await fixture(),real=await nodeTests(bytes);if(process.env.DRAWING_NODE_ONLY!=='1')await browserTests(bytes,real);console.log('QA files: '+qa);})().catch(error=>{console.error(error);process.exitCode=1;});
