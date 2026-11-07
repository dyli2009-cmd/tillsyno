/* Whole-document PDF analysis. No rendering/OCR and no changes during analysis. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/pdf-lib.min.js'));
 else root.DrawingPdfAnalysis=factory(root.PDFLib);
})(typeof globalThis!=='undefined'?globalThis:this,function(lib){
 'use strict';
 const {PDFDocument,PDFRef,PDFDict,PDFArray,PDFStream,PDFName}=lib;
 const name=s=>PDFName.of(s),pause=()=>new Promise(r=>setTimeout(r,0));
 function cancelled(options){if(options?.cancelled?.()){const e=Error('PDF-analysen avbröts.');e.name='AbortError';throw e;}}
 const size=obj=>{try{return obj.sizeInBytes();}catch(_){return 0;}};
 const contents=obj=>obj.getContents?.()||new Uint8Array();
 const type=(dict,key)=>dict?.get(name(key))?.toString();
 function livePages(doc){
  // pdf-lib's cached getPages() can still include pages removed in this pass.
  const out=[];doc.catalog.Pages().traverse((node,ref)=>{if(node instanceof lib.PDFPageLeaf)out.push(lib.PDFPage.of(node,ref,doc));});return out;
 }
 function reachability(doc){
  const refs=new Set(),seen=new Set(),stack=[...Object.values(doc.context.trailerInfo),doc.catalog];
  while(stack.length){
   const obj=stack.pop();if(!obj)continue;
   if(obj instanceof PDFRef){const id=obj.toString();if(refs.has(id))continue;refs.add(id);stack.push(doc.context.lookup(obj));continue;}
   if(seen.has(obj))continue;seen.add(obj);
   if(obj instanceof PDFStream)stack.push(obj.dict);
   else if(obj instanceof PDFArray)stack.push(...obj.asArray());
   else if(obj instanceof PDFDict)for(const [,v]of obj.entries())stack.push(v);
  }
  return refs;
 }
 async function digest(value){
  const bytes=typeof value==='string'?new TextEncoder().encode(value):value;
  const crypto=globalThis.crypto;
  if(!crypto?.subtle)throw Error('PDF-analys kräver en säker webbläsaranslutning.');
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return Array.from(hash,n=>n.toString(16).padStart(2,'0')).join('');
 }
 function reader(doc,options={}){
  const rawHashes=new WeakMap(),pageNumbers=new Map(livePages(doc).map((p,i)=>[p.node,i+1]));
  let ticks=0;
  async function tick(){cancelled(options);if(++ticks%250===0)await pause();}
  async function rawHash(stream){
   if(!rawHashes.has(stream))rawHashes.set(stream,digest(contents(stream)));
   return rawHashes.get(stream);
  }
  async function value(obj,state){
   await tick();if(++state.nodes>250000)throw Error('Sidan har för många korsreferenser för en säker jämförelse.');
   if(obj instanceof PDFRef){const found=doc.context.lookup(obj);return found?value(found,state):'unresolved:'+obj.toString();}
   if(!obj)return 'null';
   const pageNo=pageNumbers.get(obj);if(pageNo)return 'page:'+(obj===state.page?'self':pageNo);
   if(state.active.has(obj))return 'cycle:'+state.active.get(obj);
   if(obj instanceof PDFStream||obj instanceof PDFArray||obj instanceof PDFDict){
    state.active.set(obj,state.active.size);
    let out;
    if(obj instanceof PDFStream)out='stream:'+await value(obj.dict,state)+':'+await rawHash(obj);
    else if(obj instanceof PDFArray){const a=[];for(const v of obj.asArray())a.push(await value(v,state));out='['+a.join(',')+']';}
    else{
     const a=[];for(const [k,v]of obj.entries().sort((a,b)=>a[0].toString().localeCompare(b[0].toString(),'en')))a.push(k.toString()+':'+await value(v,state));
     out='{'+a.join(',')+'}';
    }
    state.active.delete(obj);return out;
   }
   return obj.toString();
  }
  const state=page=>({active:new Map(),nodes:0,page});
  async function pageHash(page){
   const entries=new Map(page.node.entries().filter(([k])=>k.toString()!=='/Parent').map(([k,v])=>[k.toString(),v]));
   // Inherited values are part of the page's actual meaning, not its parent tree.
   for(const [key,get]of [['/Resources','Resources'],['/MediaBox','MediaBox'],['/CropBox','CropBox'],['/Rotate','Rotate']]){
    const v=page.node[get]?.();if(v)entries.set(key,v);
   }
   const st=state(page.node),parts=[];
   for(const [k,v]of [...entries].sort((a,b)=>a[0].localeCompare(b[0],'en')))parts.push(k+':'+await value(v,st));
   return digest(parts.join('|'));
  }
  async function catalogHash(){
   const st=state(null),a=[];
   for(const [k,v]of doc.catalog.entries().sort((a,b)=>a[0].toString().localeCompare(b[0].toString(),'en'))){
    if(k.toString()==='/Pages')continue;a.push(k.toString()+':'+await value(v,st));
   }
   a.push('Info:'+await value(doc.context.trailerInfo.Info,st));
   return digest(a.join('|'));
  }
  return {pageHash,catalogHash,objectHash:async obj=>digest(await value(obj,state(null)))};
 }
 async function snapshot(doc,options={}){
  const r=reader(doc,options),pages=[];
  for(const p of livePages(doc)){cancelled(options);pages.push(await r.pageHash(p));}
  return {pages,catalog:await r.catalogHash()};
 }
 function annotationInfo(doc,page){
  const array=page.node.lookupMaybe(name('Annots'),PDFArray);let hidden=0,widgets=0;
  for(const item of array?.asArray()||[]){
   const d=doc.context.lookup(item);if(!(d instanceof PDFDict))continue;
   if(type(d,'Subtype')==='/Widget')widgets++;
   const f=d.lookupMaybe(name('F'),lib.PDFNumber)?.asNumber()||0;if(f&(1|2|32))hidden++;
  }
  return {hidden,widgets};
 }
 function layersInfo(doc){
  const oc=doc.catalog.lookupMaybe(name('OCProperties'),PDFDict);
  if(!oc)return {total:0,off:0};
  const all=oc.lookupMaybe(name('OCGs'),PDFArray),d=oc.lookupMaybe(name('D'),PDFDict),off=d?.lookupMaybe(name('OFF'),PDFArray);
  return {total:all?.size()||0,off:off?.size()||0};
 }
 function selectedPages(doc,pages){
  const total=doc.getPageCount(),p=pages||Array.from({length:total},(_,i)=>i);
  if(!p.length||p.some((n,i)=>!Number.isInteger(n)||n<0||n>=total||(i&&n<=p[i-1])))throw Error('Sidvalet är ogiltigt.');
  return p;
 }
 async function imageGroups(doc,reachable,options={}){
  const r=reader(doc,options),byHash=new Map(),images=[];
  for(const [ref,obj]of doc.context.enumerateIndirectObjects()){
   cancelled(options);if(!reachable.has(ref.toString())||!(obj instanceof PDFStream)||type(obj.dict,'Subtype')!=='/Image')continue;
   const entry={ref:ref.toString(),object:obj,reference:ref,bytes:contents(obj).length,width:obj.dict.lookupMaybe(name('Width'),lib.PDFNumber)?.asNumber()||0,height:obj.dict.lookupMaybe(name('Height'),lib.PDFNumber)?.asNumber()||0};
   images.push(entry);const h=await r.objectHash(obj);if(!byHash.has(h))byHash.set(h,[]);byHash.get(h).push(entry);
  }
  return {images,groups:[...byHash.values()].filter(g=>g.length>1)};
 }
 async function analyze(input,options={}){
  cancelled(options);options.onProgress?.({phase:'load',message:'Läser PDF-strukturen…'});await pause();
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input),doc=await PDFDocument.load(bytes,{updateMetadata:false});cancelled(options);
  const selected=selectedPages(doc,options.pages),all=livePages(doc),total=all.length;
  // Local parsed document only. Removing a page here never edits the user's working state.
  const wanted=new Set(selected);for(let i=total-1;i>=0;i--)if(!wanted.has(i))doc.removePage(i);
  const reachable=reachability(doc),objects=doc.context.enumerateIndirectObjects();
  const stats={objects:objects.length,unusedObjects:0,unusedBytes:0,streamBytes:0,imageBytes:0,fontBytes:0,attachmentBytes:0,metadataBytes:0};
  const fonts=new Set();
  for(const [ref,obj]of objects){
   cancelled(options);if(!reachable.has(ref.toString())){stats.unusedObjects++;stats.unusedBytes+=size(obj);continue;}
   const dict=obj instanceof PDFStream?obj.dict:obj;
   if(dict instanceof PDFDict)for(const k of ['FontFile','FontFile2','FontFile3']){const v=dict.get(name(k));if(v instanceof PDFRef)fonts.add(v.toString());}
   if(obj instanceof PDFStream){const n=contents(obj).length;stats.streamBytes+=n;if(type(obj.dict,'Subtype')==='/Image')stats.imageBytes+=n;if(type(obj.dict,'Type')==='/EmbeddedFile')stats.attachmentBytes+=n;if(type(obj.dict,'Type')==='/Metadata')stats.metadataBytes+=n;}
  }
  for(const [ref,obj]of objects)if(fonts.has(ref.toString())&&obj instanceof PDFStream)stats.fontBytes+=contents(obj).length;
  options.onProgress?.({phase:'images',message:'Jämför inbäddade bilder…'});await pause();
  const imageData=await imageGroups(doc,reachable,options),r=reader(doc,options),groups=new Map(),unresolved=[];let hiddenAnnotations=0,widgets=0;
  for(let i=0;i<selected.length;i++){
   cancelled(options);options.onProgress?.({phase:'pages',current:i+1,total:selected.length,message:'Jämför sidinnehåll '+(i+1)+' / '+selected.length+'…'});
   const p=all[selected[i]],a=annotationInfo(doc,p);hiddenAnnotations+=a.hidden;widgets+=a.widgets;
   try{const h=await r.pageHash(p);if(!groups.has(h))groups.set(h,[]);groups.get(h).push(selected[i]+1);}
   catch(e){if(e.name==='AbortError')throw e;unresolved.push({page:selected[i]+1,message:e.message});}
   await pause();
  }
  const signature=objects.some(([ref,obj])=>reachable.has(ref.toString())&&obj instanceof PDFDict&&(obj.has(name('ByteRange'))||type(obj,'Type')==='/Sig'));
  cancelled(options);
  return {inputBytes:bytes.length,totalPages:total,selectedPages:selected.length,stats,
   duplicatePages:[...groups.values()].filter(g=>g.length>1),unresolved,
   images:{count:imageData.images.length,duplicateGroups:imageData.groups.length,extraCopies:imageData.groups.reduce((n,g)=>n+g.length-1,0),potentialBytes:imageData.groups.reduce((n,g)=>n+g.slice(1).reduce((sum,x)=>sum+x.bytes,0),0),largest:imageData.images.sort((a,b)=>b.bytes-a.bytes).slice(0,8).map(({ref,bytes,width,height})=>({ref,bytes,width,height}))},
   layers:layersInfo(doc),hiddenAnnotations,widgets,signed:signature};
 }
 async function compactImages(doc,options={}){
  const {groups}=await imageGroups(doc,reachability(doc),options),replace=new Map();let bytes=0;
  for(const group of groups){const keep=group[0];for(const item of group.slice(1)){replace.set(item.ref,keep.reference);bytes+=item.bytes;}}
  const seen=new Set();let processed=0;
  function rewrite(obj){
   if(!obj||seen.has(obj))return;seen.add(obj);
   if(obj instanceof PDFStream)rewrite(obj.dict);
   else if(obj instanceof PDFDict){for(const [k,v]of obj.entries()){if(v instanceof PDFRef&&replace.has(v.toString()))obj.set(k,replace.get(v.toString()));else if(!(v instanceof PDFRef))rewrite(v);}}
   else if(obj instanceof PDFArray)for(let i=0;i<obj.size();i++){const v=obj.get(i);if(v instanceof PDFRef&&replace.has(v.toString()))obj.set(i,replace.get(v.toString()));else if(!(v instanceof PDFRef))rewrite(v);}
  }
  for(const [,obj]of doc.context.enumerateIndirectObjects()){cancelled(options);rewrite(obj);if(++processed%250===0)await pause();}
  for(const k of Object.keys(doc.context.trailerInfo)){const v=doc.context.trailerInfo[k];if(v instanceof PDFRef&&replace.has(v.toString()))doc.context.trailerInfo[k]=replace.get(v.toString());}
  return {imagesMerged:replace.size,imageBytes:bytes};
 }
 return {analyze,snapshot,compactImages,reachability};
});
