/* Drawing Tools v2.4.360. Keep original PDF content; never rasterize implicitly. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/pdf-lib.min.js'),require('./drawing-analysis.js'));
 else root.DrawingPdf=factory(root.PDFLib,root.DrawingPdfAnalysis);
})(typeof globalThis!=='undefined'?globalThis:this,function(lib,analysis){
 'use strict';
 const {PDFDocument,PDFRef,PDFDict,PDFArray,PDFStream,PDFName,rgb}=lib;
 const key=name=>PDFName.of(name);
 function hasSignature(doc){
  const seen=new Set();
  function visit(obj){
   if(!obj||seen.has(obj))return false;seen.add(obj);
   if(obj instanceof PDFRef)return visit(doc.context.lookup(obj));
   if(obj instanceof PDFStream)return visit(obj.dict);
   if(obj instanceof PDFArray)return obj.asArray().some(visit);
   if(obj instanceof PDFDict){
    if(obj.has(key('ByteRange'))||obj.get(key('Type'))===key('Sig'))return true;
    return obj.entries().some(([,value])=>visit(value));
   }
   return false;
  }
  return visit(doc.catalog);
 }
 // pdf-lib otherwise writes unused page/image objects too. Only discard objects
 // unreachable from the PDF trailer, retaining catalog metadata, forms and files.
 function discardUnusedObjects(doc){
  const refs=new Set(),seen=new Set(),context=doc.context;
  function visit(obj){
   if(!obj)return;
   if(obj instanceof PDFRef){
    const id=obj.toString();if(refs.has(id))return;refs.add(id);visit(context.lookup(obj));return;
   }
   if(seen.has(obj))return;seen.add(obj);
   if(obj instanceof PDFStream)visit(obj.dict);
   else if(obj instanceof PDFArray)obj.asArray().forEach(visit);
   else if(obj instanceof PDFDict)obj.entries().forEach(([,value])=>visit(value));
  }
  Object.values(context.trailerInfo).forEach(visit);visit(doc.catalog);
  let objects=0,bytes=0;
  for(const [ref,obj] of context.enumerateIndirectObjects())if(!refs.has(ref.toString())){
   objects++;try{bytes+=obj.sizeInBytes();}catch(_){}context.delete(ref);
  }
  return {objects,bytes};
 }
 function clearAnnotations(page){
  const annotations=page.node.lookupMaybe(key('Annots'),PDFArray);if(!annotations)return;
  // Form widgets are data, not drawing comments. Preserve their field tree and appearances.
  for(let i=annotations.size()-1;i>=0;i--){
   const annotation=page.doc.context.lookup(annotations.get(i));
   if(!(annotation instanceof PDFDict)||annotation.get(key('Subtype'))!==key('Widget'))annotations.remove(i);
  }
 }
 function cropPage(page,rect){
  if(!rect||![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite)||rect.width<=0||rect.height<=0)throw Error('Ogiltigt beskärningsområde.');
  page.setMediaBox(rect.x,rect.y,rect.width,rect.height);
  page.setCropBox(rect.x,rect.y,rect.width,rect.height);
  for(const type of ['BleedBox','TrimBox','ArtBox']){
   if(!page.node.has(key(type)))continue;
   const box=page['get'+type](),x=Math.max(box.x,rect.x),y=Math.max(box.y,rect.y);
   const right=Math.min(box.x+box.width,rect.x+rect.width),top=Math.min(box.y+box.height,rect.y+rect.height);
   page['set'+type](right>x?x:rect.x,top>y?y:rect.y,right>x?right-x:rect.width,top>y?top-y:rect.height);
  }
 }
 async function optimize(input,options={}){
  const original=input instanceof Uint8Array?input:new Uint8Array(input),pages=options.pages,crops=options.crops||{},masks=options.masks||{};
  const edited=!!options.removeAnnotations||Object.keys(crops).length>0||Object.values(masks).some(v=>v.length)||typeof options.addTextLayer==='function';
  let doc;
  try{doc=await PDFDocument.load(original,{updateMetadata:false});}
  catch(error){if(!edited&&!pages)return {bytes:original,original:true,pageCount:null};throw error;}
  const count=doc.getPageCount(),selected=pages||Array.from({length:count},(_,i)=>i);
  if(!selected.length||selected.some((n,i)=>!Number.isInteger(n)||n<0||n>=count||(i>0&&n<=selected[i-1])))throw Error('Sidvalet är ogiltigt.');
  const removed=selected.length!==count,changed=edited||removed;
  if(hasSignature(doc)){
   if(changed)throw Error('PDF-filen är digitalt signerad. Spara originalet utan sidändringar för att behålla signaturen.');
   return {bytes:original,original:true,pageCount:count};
  }
  const wanted=new Set(selected);
  doc.getPages().forEach((page,index)=>{
   if(!wanted.has(index))return;
   if(options.removeAnnotations)clearAnnotations(page);
   for(const rect of masks[index]||[])page.drawRectangle({...rect,color:rgb(1,1,1),borderWidth:0});
   if(crops[index])cropPage(page,crops[index]);
  });
  const checkCancelled=()=>{if(options.cancelled?.()){const error=Error('PDF-rensningen avbröts.');error.name='AbortError';throw error;}};
  checkCancelled();
  // OCR coordinates refer to the original pages, including their crop/rotation.
  // Append before removing pages so original page numbers remain meaningful.
  if(typeof options.addTextLayer==='function')await options.addTextLayer(doc);
  checkCancelled();
  for(let i=count-1;i>=0;i--)if(!wanted.has(i))doc.removePage(i);
  let before=null,merged={imagesMerged:0,imageBytes:0};
  if(options.deduplicateImages){
   if(!analysis)throw Error('PDF-analysens lokala filer saknas.');
   options.onProgress?.({message:'Kontrollerar sidinnehåll, text och stämpeluppgifter…'});
   before=await analysis.snapshot(doc,options);
   options.onProgress?.({message:'Återanvänder identiska inbäddade bilder…'});
   merged=await analysis.compactImages(doc,options);
  }
  const unused=discardUnusedObjects(doc);
  checkCancelled();options.onProgress?.({message:'Sparar den förlustfria arbetskopian…'});
  let packed;
  try{packed=await doc.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:50,updateFieldAppearances:false});}
  catch(error){if(changed||options.deduplicateImages)throw error;return {bytes:original,original:true,pageCount:count};}
  // A requested edit must be kept even if serialization adds a few bytes.
  const useOriginal=!changed&&packed.length>=original.length;
  let verified=false;
  if(before&&!useOriginal){
   // Release the old object graph before parsing the output for verification.
   doc=null;await new Promise(resolve=>setTimeout(resolve,0));checkCancelled();
   options.onProgress?.({message:'Verifierar arbetskopians sidinnehåll och dokumentdata…'});
   const verifiedDoc=await PDFDocument.load(packed,{updateMetadata:false});
   const after=await analysis.snapshot(verifiedDoc,options);
   if(JSON.stringify(before)!==JSON.stringify(after))throw Error('PDF-kontrollen hittade ändrat innehåll. Ingen rensad fil har godkänts.');
   verified=true;
  }else if(before)verified=true;
  checkCancelled();
  return {bytes:useOriginal?original:packed,original:useOriginal,pageCount:selected.length,
   cleanup:options.deduplicateImages?{...merged,unusedObjects:unused.objects,unusedBytes:unused.bytes}:undefined,verified};
 }
 async function split(input,maxBytes,onProgress=()=>{}){
  if(!Number.isFinite(maxBytes)||maxBytes<=0)throw Error('Ange en giltig storlek per del.');
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  let doc=await PDFDocument.load(bytes,{updateMetadata:false});const count=doc.getPageCount();
  if(!count)throw Error('PDF-filen saknar sidor.');
  if(bytes.length<=maxBytes)return [{bytes,startPage:1,endPage:count,oversize:false}];
  if(hasSignature(doc))throw Error('En digitalt signerad PDF kan inte delas utan att signaturen påverkas. Spara originalfilen i ett stycke.');
  doc=null;
  const parts=[];
  for(let start=0;start<count;){
   let lo=start+1,hi=count,best=null;
   while(lo<=hi){
    const end=Math.floor((lo+hi)/2),pages=Array.from({length:end-start},(_,i)=>start+i);
    onProgress(start+1,count);
    const result=await optimize(bytes,{pages}),candidate={bytes:result.bytes,startPage:start+1,endPage:end,oversize:result.bytes.length>maxBytes};
    if(!candidate.oversize){best=candidate;lo=end+1;}else{if(end===start+1)best=candidate;hi=end-1;}
   }
   if(!best)throw Error('Kunde inte skapa en komplett PDF-del.');
   parts.push(best);start=best.endPage;
  }
  return parts;
 }
 return {optimize,split};
});
