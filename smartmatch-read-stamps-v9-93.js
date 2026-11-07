/* Local annotation metadata for isolated Avläsning TEST 5.
 * Reuses the PDF-lib document that the reader has already parsed. It never
 * renders a drawing page or executes PDF actions. Appearance text is read in
 * small, temporary PDF batches, isolated from drawing/room text underneath.
 */
(function(root){
 'use strict';
 const sources=new WeakMap();
 const key=s=>String(s||'').normalize('NFC').toUpperCase().replace(/[–—−]/g,'-').replace(/[\s/_.-]+/g,'');
 function readDocument(doc,library=root.PDFLib){
  if(!library&&typeof module==='object'&&module.exports)library=require('pdf-lib');
  const {PDFName,PDFDict,PDFArray,PDFRef,PDFNumber,PDFString,PDFHexString}=library||{};
  if(!PDFName||!doc?.context||typeof doc.getPages!=='function')return [];
  const context=doc.context,names=new Map(),records=[],forms=new Map();
  const name=key=>{if(!names.has(key))names.set(key,PDFName.of(key));return names.get(key);};
  const lookup=value=>{try{return context.lookup(value);}catch(_){return undefined;}};
  const field=(dict,key)=>{try{return lookup(dict.get(name(key)));}catch(_){return undefined;}};
  const text=(dict,key)=>{
   const value=field(dict,key);
   if(!(value instanceof PDFString)&&!(value instanceof PDFHexString))return '';
   try{return value.decodeText();}catch(_){return '';}
  };
  const number=(dict,key)=>{const value=field(dict,key);return value instanceof PDFNumber&&Number.isFinite(value.asNumber())?value.asNumber():0;};
  let pages;try{pages=doc.getPages();}catch(_){return records;}
  for(let pageIndex=0;pageIndex<pages.length;pageIndex++){
   const annotations=field(pages[pageIndex].node,'Annots');
   if(!(annotations instanceof PDFArray))continue;
   const seen=new Set();
   for(let index=0;index<annotations.size();index++){
    let raw;try{raw=annotations.get(index);}catch(_){continue;}
    const dict=lookup(raw);if(!(dict instanceof PDFDict))continue;
    const bounds=field(dict,'Rect');if(!(bounds instanceof PDFArray)||bounds.size()!==4)continue;
    const rect=[];
    for(let axis=0;axis<4;axis++){
     let coordinate;try{coordinate=lookup(bounds.get(axis));}catch(_){break;}
     if(!(coordinate instanceof PDFNumber)||!Number.isFinite(coordinate.asNumber()))break;
     rect.push(coordinate.asNumber());
    }
    if(rect.length!==4||rect[0]===rect[2]||rect[1]===rect[3])continue;
    const subtype=field(dict,'Subtype');
    if(!(subtype instanceof PDFName))continue;
    const annotationName=text(dict,'NM');
    // Match PDF.js annotation IDs so its data and the missing /Subj metadata
    // merge into one position. Direct dictionaries may have only a /NM name.
    let id=raw instanceof PDFRef?String(raw.objectNumber)+'R'+(raw.generationNumber||''):
     annotationName||'p'+(pageIndex+1)+'-annotation-'+index;
    if(seen.has(id)){
     if(raw instanceof PDFRef)continue;
     // Copied direct dictionaries sometimes keep the same /NM name. Each
     // physical rectangle must still be available to the drawing matcher.
     id='p'+(pageIndex+1)+'-annotation-'+index;
     while(seen.has(id))id+='-copy';
    }
    seen.add(id);
    let subtypeName;try{subtypeName=subtype.decodeText();}catch(_){continue;}
    if(subtypeName==='Stamp'&&!(number(dict,'F')&35)){
     const ap=field(dict,'AP');let normal=ap instanceof PDFDict?field(ap,'N'):null;
     if(normal instanceof PDFDict){const state=field(dict,'AS');normal=state instanceof PDFName?lookup(normal.get(state)):null;}
     if(normal instanceof library.PDFRawStream)forms.set(id,normal);
    }
    records.push({page:pageIndex+1,id,name:annotationName,subtype:subtypeName,
     subject:text(dict,'Subj'),contents:text(dict,'Contents'),rect,flags:number(dict,'F')});
   }
  }
  sources.set(doc,{forms,labels:new Map()});
  return records;
 }
 async function readAppearances({doc,index,codes=[],library=root.PDFLib,pdfjs=root.pdfjsLib,cancelled=()=>false,onDetail=()=>{}}){
  if(!sources.has(doc))readDocument(doc,library);
  const state=sources.get(doc);if(!state||!pdfjs?.getDocument)return index;
  const known=new Set(codes.map(key)),requested=index.filter(a=>state.forms.has(a.id)&&!state.labels.has(a.id)&&
   ![a.subject,a.contents].some(text=>known.has(key(text))));
  const check=()=>{if(cancelled())throw Error('Sökningen avbröts.');};
  const {PDFDocument,PDFObjectCopier,PDFName,PDFArray,PDFNumber}=library;
  let completed=0;
  const detail=()=>onDetail({phase:'stamp-label',label:'Läser stämplarnas egna beteckningar',unit:'stamp',done:completed,total:requested.length,scope:'stamp-appearances'});
  detail();
  for(let offset=0;offset<requested.length;offset+=32){
   check();const batch=requested.slice(offset,offset+32),temporary=await PDFDocument.create(),copy=PDFObjectCopier.for(doc.context,temporary.context),records=[];
   for(const record of batch){
    check();const form=state.forms.get(record.id);
    try{
     const array=(name,count,fallback)=>{const a=form.dict.lookupMaybe(PDFName.of(name),PDFArray);if(!a)return fallback;
      if(a.size()!==count)throw Error('Ogiltig stämpelgeometri');return a.asArray().map(v=>{const n=doc.context.lookup(v);if(!(n instanceof PDFNumber)||!Number.isFinite(n.asNumber()))throw Error('Ogiltig stämpelgeometri');return n.asNumber();});};
     const b=array('BBox',4,null),m=array('Matrix',6,[1,0,0,1,0,0]);if(!b)throw Error('Stämpeln saknar avgränsning');
     const points=[[b[0],b[1]],[b[0],b[3]],[b[2],b[1]],[b[2],b[3]]].map(([x,y])=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]);
     const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1])),w=Math.max(...points.map(p=>p[0]))-x,h=Math.max(...points.map(p=>p[1]))-y;
     if(!(w>0&&h>0&&w<=100000&&h<=100000))throw Error('Ogiltig stämpelstorlek');
     const page=temporary.addPage(),ref=temporary.context.register(copy.copy(form));page.setSize(w,h);
     page.node.set(PDFName.of('Resources'),temporary.context.obj({XObject:{Label:ref}}));
     page.node.set(PDFName.of('Contents'),temporary.context.register(temporary.context.flateStream('q 1 0 0 1 '+(-x)+' '+(-y)+' cm /Label Do Q')));
     records.push(record);
    }catch(error){state.labels.set(record.id,{appearanceStatus:'unavailable',appearanceText:''});completed++;detail();}
   }
   if(!records.length)continue;
   const bytes=await temporary.save({useObjectStreams:true,addDefaultPage:false});check();
   if(bytes.byteLength>8000000){for(const r of records)state.labels.set(r.id,{appearanceStatus:'unavailable',appearanceText:''});completed+=records.length;detail();continue;}
   let task=null,pdf=null;
   try{
    task=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true});pdf=await task.promise;check();
    for(const [position,record] of records.entries()){
     check();const page=await pdf.getPage(position+1);
     try{
      const vp=page.getViewport({scale:1}),content=await page.getTextContent(),words=[];check();
      for(const item of content.items){
       if(!item.str?.trim()||item.str.length>500)continue;
       const center=vp.convertToViewportPoint(item.transform[4]+item.width/2,item.transform[5]+Math.max(1,item.height)*.3);
       if(center[0]<0||center[0]>vp.width||center[1]<0||center[1]>vp.height)continue;
       const point=vp.convertToViewportPoint(item.transform[4],item.transform[5]);words.push({text:item.str,x:point[0],y:point[1],h:Math.max(1,item.height||Math.hypot(item.transform[2],item.transform[3]))});
      }
      const rows=[];for(const word of words.sort((a,b)=>a.y-b.y||a.x-b.x)){let row=rows.find(r=>Math.abs(r.y-word.y)<=Math.max(.8,Math.min(r.h,word.h)*.55));if(!row){row={y:word.y,h:word.h,words:[]};rows.push(row);}row.words.push(word);}
      const text=rows.sort((a,b)=>a.y-b.y).flatMap(r=>r.words.sort((a,b)=>a.x-b.x)).map(w=>w.text).join(' ').normalize('NFC').trim();
      state.labels.set(record.id,{appearanceStatus:'read',appearanceText:text.length<=300?text:''});
      completed++;detail();
     }finally{page.cleanup?.();}
     await new Promise(resolve=>setTimeout(resolve,0));
    }
   }finally{if(pdf)await pdf.destroy();else if(task)await task.destroy();}
  }
  check();return index.map(record=>state.labels.has(record.id)?{...record,...state.labels.get(record.id)}:{...record});
 }
 const api=Object.freeze({readDocument,readAppearances});
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.SmartMatchReadStamps=api;
})(typeof window!=='undefined'?window:globalThis);
