/* Ritningsverktyg: retain the original page and append searchable, invisible OCR text. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/pdf-lib.min.js'));
 else root.DrawingOcrPdf=factory(root.PDFLib);
})(typeof globalThis!=='undefined'?globalThis:this,function(lib){
 'use strict';
 const {PDFName,PDFRef,PDFDict,PDFArray,PDFStream,PDFRawStream,PDFContentStream,StandardFonts,decodePDFRawStream,
  pushGraphicsState,popGraphicsState,beginText,endText,setTextRenderingMode,
  setFontAndSize,setTextMatrix,showText,setCharacterSpacing,setWordSpacing,
  setCharacterSqueeze,setTextRise}=lib;
 const key=PDFName.of,owner=key('TillsynoDrawingOcrV1'),pageKey=key('TillsynoOcrText');
 function cancelled(options){
  if(options.signal?.aborted||options.cancelled?.()){
   const error=Error('Textlagret avbröts.');error.name='AbortError';throw error;
  }
 }
 function hasSignature(doc){
  const seen=new Set();
  function visit(object){
   if(!object||seen.has(object))return false;seen.add(object);
   if(object instanceof PDFRef)return visit(doc.context.lookup(object));
   if(object instanceof PDFStream)return visit(object.dict);
   if(object instanceof PDFArray)return object.asArray().some(visit);
   if(object instanceof PDFDict){
    if(object.has(key('ByteRange'))||object.get(key('Type'))===key('Sig'))return true;
    return object.entries().some(([,value])=>visit(value));
   }
   return false;
  }
  return visit(doc.catalog);
 }
 function inverse(viewport){
  const t=viewport?.transform;
  if(!Number.isFinite(viewport?.width)||!Number.isFinite(viewport?.height)||viewport.width<=0||viewport.height<=0||
   !Array.isArray(t)||t.length!==6||!t.every(Number.isFinite))throw Error('Textlagret saknar giltiga sidkoordinater.');
  const [a,b,c,d,e,f]=t,det=a*d-b*c;
  if(Math.abs(det)<1e-12)throw Error('Textlagrets sidkoordinater kan inte omvandlas.');
  return [d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det];
 }
 function point(t,x,y){return {x:t[0]*x+t[2]*y+t[4],y:t[1]*x+t[3]*y+t[5]};}
 function owned(doc,object){
  const stream=doc.context.lookup(object);
  return stream instanceof PDFStream&&stream.dict.get(key('TillsynoOcrLayer'))===owner;
 }
 function contents(doc,page){
  const raw=page.node.get(key('Contents')),resolved=raw&&doc.context.lookup(raw);
  if(resolved instanceof PDFArray)return resolved.asArray().slice();
  if(resolved instanceof PDFStream)return [raw instanceof PDFRef?raw:doc.context.register(resolved)];
  return [];
 }
 function previousLayer(doc,objects){
  const entries=[],replaceable=new Set();
  for(const object of objects){
   if(!owned(doc,object))continue;
   const stream=doc.context.lookup(object),data=doc.context.lookup(stream.dict.get(key('TillsynoOcrData')));
   if(!(data instanceof PDFRawStream))continue;
   try{
    const record=JSON.parse(new TextDecoder().decode(decodePDFRawStream(data).decode()));
    if(record.version!==1||!Array.isArray(record.entries))continue;
    if(!record.entries.every(entry=>typeof entry.text==='string'&&Number.isFinite(entry.size)&&entry.size>0&&
     Array.isArray(entry.tm)&&entry.tm.length===6&&entry.tm.every(Number.isFinite)&&
     Array.isArray(entry.box)&&entry.box.length===4&&entry.box.every(Number.isFinite)))continue;
    entries.push(...record.entries);replaceable.add(object);
   }catch(_){/* An unknown layer is retained rather than deleting search data. */}
  }
  return {entries,replaceable};
 }
 function canonical(word,transform,font){
  const baseline=point(transform,word.x,word.y+font.heightAtSize(word.size,{descender:false}));
  const corners=[point(transform,word.x,word.y),point(transform,word.x+word.w,word.y),
   point(transform,word.x,word.y+word.h),point(transform,word.x+word.w,word.y+word.h)];
  return {text:word.text,size:word.size,tm:[transform[0]*word.scale,transform[1]*word.scale,-transform[2],-transform[3],baseline.x,baseline.y],
   box:[Math.min(...corners.map(p=>p.x)),Math.min(...corners.map(p=>p.y)),Math.max(...corners.map(p=>p.x)),Math.max(...corners.map(p=>p.y))]};
 }
 function samePosition(a,b){
  const x=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0])),y=Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
  const overlap=x*y,areaA=(a[2]-a[0])*(a[3]-a[1]),areaB=(b[2]-b[0])*(b[3]-b[1]);
  return overlap>0&&overlap/(areaA+areaB-overlap)>.65;
 }
 function validWords(input,viewport,font,report,page){
  const words=[],units=input.wordUnits||'viewport',sx=units==='normalized'?viewport.width:1,sy=units==='normalized'?viewport.height:1;
  if(!['viewport','normalized'].includes(units))throw Error('Textlagrets koordinatenhet är okänd.');
  const seen=new Set(),epsilon=1e-5;
  for(const word of input.words||[]){
   if(word?.selected===false||word?.included===false){report.skipped++;continue;}
   const text=typeof word?.text==='string'?word.text.trim():'';
   const x=Number(word?.x)*sx,y=Number(word?.y)*sy,w=Number(word?.w)*sx,h=Number(word?.h)*sy;
   if(!text||![x,y,w,h].every(Number.isFinite)||w<=0||h<=0||x<-epsilon||y<-epsilon||x+w>viewport.width+epsilon||y+h>viewport.height+epsilon){report.skipped++;continue;}
   let encoded;
   try{encoded=font.encodeText(text);}
   catch(error){report.skipped++;report.unsupported.push({page,text,reason:'Tecken stöds inte av PDF-textlagrets typsnitt.'});continue;}
   // Identical overlapping tile observations must not add the same word twice.
   const id=JSON.stringify([text,...[x,y,w,h].map(value=>Math.round(value*1000)/1000)]);
   if(seen.has(id)){report.skipped++;continue;}seen.add(id);
   const size=h/font.heightAtSize(1);
   // Tj writes glyph advances without kerning. Measuring the whole string with
   // pdf-lib would include kerning and move some cell text into its neighbor.
   const width=Array.from(text).reduce((sum,character)=>sum+font.widthOfTextAtSize(character,size),0);
   if(!Number.isFinite(size)||!Number.isFinite(width)||size<=0||width<=0){report.skipped++;continue;}
   words.push({text,encoded,x,y,w,h,size,scale:w/width});
  }
  return words;
 }
 async function appendToDocument(doc,options={}){
  if(!doc?.getPages||!doc.context)throw Error('Öppna en giltig PDF innan textlagret skapas.');
  cancelled(options);
  if(hasSignature(doc))throw Error('PDF-filen är digitalt signerad. Ett textlager skulle påverka signaturen.');
  const inputs=options.pages||[],count=doc.getPageCount(),seenPages=new Set();
  if(!Array.isArray(inputs))throw Error('Textlagrets sidval är ogiltigt.');
  const prepared=inputs.map(input=>{
   const number=input?.page;
   if(!Number.isInteger(number)||number<1||number>count||seenPages.has(number))throw Error('Textlagrets sidval är ogiltigt.');
   seenPages.add(number);return {input,page:doc.getPage(number-1),transform:inverse(input.viewport)};
  });
  const report={pages:0,words:0,retainedWords:0,skipped:0,unsupported:[],unchangedPages:[],replacedPages:[]};
  if(!prepared.length)return report;
  const font=await doc.embedFont(StandardFonts.Helvetica);
  for(const [index,item]of prepared.entries()){
   cancelled(options);
   const {input,page,transform}=item,words=validWords(input,input.viewport,font,report,input.page);
   if(!words.length){report.unchangedPages.push(input.page);}
   else{
    // pdf-lib normalizes a loaded page when registering a font, including q/Q
    // wrappers that isolate the original content's transformation matrix.
    const fontName=page.node.newFontDictionary('TillsynoOCR',font.ref);
    const oldContents=contents(doc,page),previous=previousLayer(doc,oldContents);
    const added=words.map(word=>canonical(word,transform,font));
    // Reading a second card/region on the same page must keep words prepared
    // earlier. Incoming words at the same position replace our old words only.
    const retained=previous.entries.filter(entry=>!added.some(word=>samePosition(entry.box,word.box)));
    const merged=[...retained,...added],kept=oldContents.filter(object=>!previous.replaceable.has(object));
    // Rendering mode 3 is genuinely invisible; opacity-zero glyphs and white
    // rectangles can change appearances, print behavior or text extraction.
    const operators=[pushGraphicsState(),beginText(),setTextRenderingMode(3),
     setCharacterSpacing(0),setWordSpacing(0),setCharacterSqueeze(100),setTextRise(0)];
    for(const entry of merged){
     operators.push(setFontAndSize(fontName,entry.size),setTextMatrix(...entry.tm),showText(font.encodeText(entry.text)));
    }
    operators.push(endText(),popGraphicsState());
    const data=doc.context.register(doc.context.flateStream(new TextEncoder().encode(JSON.stringify({version:1,entries:merged}))));
    const stream=PDFContentStream.of(doc.context.obj({TillsynoOcrLayer:owner,TillsynoOcrData:data}),operators),ref=doc.context.register(stream);
    page.node.set(key('Contents'),doc.context.obj([...kept,ref]));
    page.node.set(pageKey,doc.context.obj({Version:1,Stream:ref,Words:merged.length}));
    if(kept.length!==oldContents.length)report.replacedPages.push(input.page);
    report.pages++;report.words+=words.length;report.retainedWords+=retained.length;
   }
   options.onProgress?.({phase:'text-layer',page:input.page,completed:index+1,total:prepared.length,
    percent:Math.round((index+1)/prepared.length*100),words:words.length,message:'Lägger sökbar text på sida '+input.page+'…'});
   // Yield between pages for progress painting and a responsive cancel button.
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  cancelled(options);return report;
 }
 return {appendToDocument};
});
