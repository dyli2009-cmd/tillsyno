/* Local annotation metadata for isolated Avläsning TEST 5.
 * Reuses the PDF-lib document that the reader has already parsed. It never
 * renders a page, executes PDF actions or reads annotation appearance streams.
 */
(function(root){
 'use strict';
 function readDocument(doc,library=root.PDFLib){
  if(!library&&typeof module==='object'&&module.exports)library=require('pdf-lib');
  const {PDFName,PDFDict,PDFArray,PDFRef,PDFNumber,PDFString,PDFHexString}=library||{};
  if(!PDFName||!doc?.context||typeof doc.getPages!=='function')return [];
  const context=doc.context,names=new Map(),records=[];
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
    records.push({page:pageIndex+1,id,name:annotationName,subtype:subtypeName,
     subject:text(dict,'Subj'),contents:text(dict,'Contents'),rect,flags:number(dict,'F')});
   }
  }
  return records;
 }
 const api=Object.freeze({readDocument});
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.SmartMatchReadStamps=api;
})(typeof window!=='undefined'?window:globalThis);
