/* Real PDF text extraction and pixel preservation for the invisible OCR layer. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const lib=require('../vendor/pdf-lib.min.js'),writer=require('../drawing-ocr-pdf.js');
const {PDFDocument,PDFName:N,PDFString:S,PDFArray,PDFDict,StandardFonts,degrees,rgb}=lib;
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),qa=fs.mkdtempSync(path.join(os.tmpdir(),'drawing-ocr-pdf-'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const server=http.createServer((request,response)=>{
 if(request.url==='/qa'){response.setHeader('Content-Type','text/html');return response.end('<!doctype html><html><body></body></html>');}
 const name=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!name.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',path.extname(name)==='.js'?'application/javascript':'application/octet-stream');response.end(fs.readFileSync(name));}
 catch(_){response.writeHead(404);response.end();}
});
async function fixture(png){
 const doc=await PDFDocument.create(),image=await doc.embedPng(png),font=await doc.embedFont(StandardFonts.Helvetica);
 for(const rotation of [0,90,180,270]){
  const page=doc.addPage([700,800]);page.setCropBox(50,40,500,640);page.setRotation(degrees(rotation));
  page.drawImage(image,{x:50,y:40,width:500,height:640});
  page.drawText('Original native text '+rotation,{x:80,y:100,size:12,font});
  page.drawLine({start:{x:80,y:90},end:{x:480,y:90},thickness:1,color:rgb(.2,.4,.7)});
  // Original streams may leave a different CTM/text state active at EOF.
  page.pushOperators(lib.concatTransformationMatrix(1,0,0,1,13,7),lib.beginText(),
   lib.setCharacterSpacing(2),lib.setWordSpacing(3),lib.setCharacterSqueeze(80),lib.setTextRise(9),lib.endText());
  const stamp=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',Rect:[100,200,190,230],Subj:S.of('GS23'),Contents:S.of('Keep original stamp'),F:2}));
  page.node.set(N.of('Annots'),doc.context.obj([stamp]));
 }
 const field=doc.getForm().createTextField('original-card');field.setText('GS23');field.addToPage(doc.getPage(0),{x:100,y:120,width:120,height:20});
 await doc.attach(Buffer.from('Keep the source attachment'),'source.txt',{mimeType:'text/plain'});
 doc.catalog.set(N.of('TillsynoSmartMatchV36Data'),S.of('{"code":"GS23","checked":true}'));
 return doc.save({useObjectStreams:false});
}
async function metadata(bytes){
 const doc=await PDFDocument.load(bytes,{updateMetadata:false});
 return {pages:doc.getPages().map(page=>({crop:page.getCropBox(),rotation:page.getRotation().angle,
  annotations:page.node.lookup(N.of('Annots'),PDFArray).asArray().map(ref=>doc.context.lookup(ref).toString())})),
  field:doc.getForm().getTextField('original-card').getText(),attachment:doc.catalog.lookup(N.of('Names'),PDFDict).toString(),
  project:doc.catalog.get(N.of('TillsynoSmartMatchV36Data')).toString()};
}
async function inspect(browserPage,bytes,render=false){
 return browserPage.evaluate(async({bytes,render})=>{
  const pdf=await pdfjsLib.getDocument({data:Uint8Array.from(bytes),useSystemFonts:false}).promise,result=[];
  for(let number=1;number<=pdf.numPages;number++){
   const page=await pdf.getPage(number),viewport=page.getViewport({scale:1}),content=await page.getTextContent();
   let pixels=null;
   if(render){
    const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    pixels=canvas.toDataURL('image/png');canvas.width=canvas.height=0;
   }
   result.push({viewport:{width:viewport.width,height:viewport.height,transform:viewport.transform},
    text:content.items.filter(item=>item.str).map(item=>{
     const t=pdfjsLib.Util.transform(viewport.transform,item.transform),style=content.styles[item.fontName],fontHeight=Math.hypot(t[2],t[3]);
     return {text:item.str,x:t[4],y:t[5]-fontHeight*style.ascent,width:item.width*viewport.scale,
      height:fontHeight*(style.ascent-style.descent),angle:Math.atan2(t[1],t[0])};
    }),pixels});
  }
  await pdf.destroy();return result;
 },{bytes:Array.from(bytes),render});
}
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.goto(base+'/qa');
  await page.addScriptTag({url:base+'/vendor/pdf.min.js'});await page.evaluate(url=>pdfjsLib.GlobalWorkerOptions.workerSrc=url,base+'/vendor/pdf.worker.min.js');
  const png=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=500;canvas.height=640;const ctx=canvas.getContext('2d');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,500,640);ctx.fillStyle='#222';ctx.font='24px Arial';ctx.fillText('Beslagskod: GS23',30,55);
   ctx.font='16px Arial';ctx.fillText('Produkt',30,110);ctx.fillText('Lev av',240,110);ctx.fillText('Mont av',350,110);
   ctx.fillText('Cylinder',30,150);ctx.fillText('DT',240,150);ctx.fillText('GS',350,150);
   ctx.strokeStyle='#333';for(let y=80;y<=180;y+=50){ctx.beginPath();ctx.moveTo(20,y);ctx.lineTo(450,y);ctx.stroke();}
   return canvas.toDataURL('image/png').split(',')[1];
  });
  const bytes=await fixture(Buffer.from(png,'base64')),originalHash=hash(bytes),before=await inspect(page,bytes,true);
  fs.writeFileSync(path.join(qa,'source.pdf'),bytes);
  const templates=[{text:'GS23',x:80,y:60,w:70,h:18},{text:'Produkt',x:60,y:140,w:70,h:14},
   {text:'Lev av',x:240,y:140,w:45,h:14},{text:'Mont av',x:350,y:140,w:60,h:14},
   {text:'Cylinder',x:60,y:170,w:70,h:14},{text:'DT',x:240,y:170,w:20,h:14},{text:'GS',x:350,y:170,w:20,h:14},
   {text:'Övrigt ÅÄÖ åäö',x:60,y:200,w:125,h:14}];
  const pages=before.map((item,index)=>({page:index+1,viewport:item.viewport,words:templates.map(word=>({...word,confidence:95}))}));
  pages[0].words.push({...templates[0]}, {text:'GS23🔒',x:80,y:250,w:60,h:16}, {text:'Outside',x:-20,y:20,w:10,h:10},
   {text:'Zero',x:10,y:20,w:0,h:10},{text:'Unchecked',x:20,y:20,w:40,h:10,selected:false});
  const doc=await PDFDocument.load(bytes,{updateMetadata:false}),events=[];
  const report=await writer.appendToDocument(doc,{pages,onProgress:value=>events.push(value)});
  assert.equal(report.pages,4);assert.equal(report.words,32);assert.equal(report.skipped,5);assert.equal(report.unsupported.length,1);
  assert.equal(report.unsupported[0].text,'GS23🔒');assert.equal(events.length,4);assert.equal(events[3].percent,100);
  const output=await doc.save({updateFieldAppearances:false});fs.writeFileSync(path.join(qa,'searchable.pdf'),output);
  assert.equal(hash(bytes),originalHash,'original input bytes are untouched');
  assert.deepEqual(await metadata(output),await metadata(bytes),'crop, rotation, annotations, editable form, attachment and project data retained');
  const after=await inspect(page,output,true);
  for(let index=0;index<4;index++){
   assert.equal(after[index].pixels,before[index].pixels,'render is pixel-identical at rotation '+index*90);
   assert(after[index].text.some(word=>word.text.includes('Original native text')),'external text retained');
   for(const word of templates){
    const found=after[index].text.find(item=>item.text===word.text);assert(found,'native PDF.js finds '+word.text+' at rotation '+index*90);
    assert(Math.abs(found.x-word.x)<.15,'word stays in its original column');
    assert(Math.abs(found.y-word.y)<.15,'word stays in its original row');
    assert(Math.abs(found.width-word.w)<.15,'word width retained: '+JSON.stringify({index,word,found}));
    assert(Math.abs(found.height-word.h)<.15,'word height retained');
    assert(Math.abs(found.angle)<.001,'viewport word orientation retained');
   }
  }
  const reloaded=await PDFDocument.load(output,{updateMetadata:false});
  const repeat=await writer.appendToDocument(reloaded,{pages});assert.deepEqual(repeat.replacedPages,[1,2,3,4]);
  const twice=await reloaded.save({updateFieldAppearances:false}),twiceText=await inspect(page,twice);
  twiceText.forEach(item=>assert.equal(item.text.filter(word=>word.text==='GS23').length,1,'repeated application replaces only our invisible layer'));
  assert.deepEqual(await metadata(twice),await metadata(bytes));
  const another=await PDFDocument.load(twice,{updateMetadata:false});
  const more=await writer.appendToDocument(another,{pages:[{page:1,viewport:pages[0].viewport,words:[{text:'Extra region',x:60,y:260,w:100,h:14}]}]});
  assert.equal(more.retainedWords,8,'preparing another region preserves the first card and table');
  await writer.appendToDocument(another,{pages:[{page:1,viewport:pages[0].viewport,words:[]}]});
  const anotherText=await inspect(page,await another.save({updateFieldAppearances:false}));
  for(const word of ['GS23','Cylinder','Extra region'])assert(anotherText[0].text.some(item=>item.text===word),'existing OCR survives '+word);
  await writer.appendToDocument(another,{pages:[{page:1,viewport:pages[0].viewport,words:[{...templates[0],text:'GS24'}]}]});
  const editedText=await inspect(page,await another.save({updateFieldAppearances:false}));
  assert(!editedText[0].text.some(item=>item.text==='GS23'));assert(editedText[0].text.some(item=>item.text==='GS24'));
  assert(editedText[0].text.some(item=>item.text==='Extra region'));
  // Explicit normalized-coordinate callers also work. Default input remains viewport units.
  const normDoc=await PDFDocument.load(bytes,{updateMetadata:false}),vp=pages[0].viewport;
  await writer.appendToDocument(normDoc,{pages:[{page:1,viewport:vp,wordUnits:'normalized',words:[{text:'Normalized',x:80/vp.width,y:60/vp.height,w:90/vp.width,h:18/vp.height}]}]});
  const norm=await inspect(page,await normDoc.save({updateFieldAppearances:false}));assert(Math.abs(norm[0].text.find(word=>word.text==='Normalized').x-80)<.15);
  let stopped=false;await assert.rejects(writer.appendToDocument(await PDFDocument.load(bytes),{pages,cancelled:()=>stopped,onProgress:()=>{stopped=true;}}),error=>error.name==='AbortError');
  const signed=await PDFDocument.load(bytes),sig=signed.context.register(signed.context.obj({Type:'Sig',ByteRange:[0,20,30,40]}));
  signed.catalog.set(N.of('Perms'),signed.context.obj({DocMDP:sig}));
  await assert.rejects(writer.appendToDocument(signed,{pages}),/signerad/);
  await assert.rejects(writer.appendToDocument(await PDFDocument.load(bytes),{pages:[{...pages[0],page:0}]}),/sidval/);
  // Independent renderer confirms this is a mode-3 layer, not merely hidden in PDF.js.
  execFileSync('python3',['-c',"import fitz,sys; a=fitz.open(sys.argv[1]); b=fitz.open(sys.argv[2]); assert len(a)==len(b); [(lambda x,y: (_ for _ in ()).throw(AssertionError('pixels differ')) if x.samples!=y.samples else None)(a[i].get_pixmap(alpha=False),b[i].get_pixmap(alpha=False)) for i in range(len(a))]; assert 'GS23' in b[0].get_text()",path.join(qa,'source.pdf'),path.join(qa,'searchable.pdf')]);
  console.log(JSON.stringify({qa,sourceBytes:bytes.length,searchableBytes:output.length,report}));
  console.log('PASS invisible OCR: real PDF.js native words and table coordinates at 0/90/180/270 degrees, offset CropBox, identical Chromium/MuPDF pixels, metadata/forms/attachments, replacement, unsupported characters, cancellation, signed guard');
 }finally{await browser.close();server.close();}
}
run().catch(error=>{console.error(error);server.close();process.exitCode=1;});
