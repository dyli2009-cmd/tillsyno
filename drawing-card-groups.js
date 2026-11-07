(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DrawingCardGroups=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';

 const clean=value=>String(value==null?'':value).normalize('NFKC').replace(/[\u200b\u00ad\ufeff]/g,'').replace(/\s+/gu,' ').trim();

 function selectedRect(rect){
  if(!rect||!['x','y','w','h'].every(k=>Number.isFinite(rect[k]))||rect.w<=0||rect.h<=0)throw new TypeError('Ett giltigt markerat kodområde krävs.');
  const x=Math.max(0,rect.x),y=Math.max(0,rect.y),right=Math.min(1,rect.x+rect.w),bottom=Math.min(1,rect.y+rect.h);
  if(right<=x||bottom<=y)throw new RangeError('Kodområdet ligger utanför sidan.');
  return{x,y,w:right-x,h:bottom-y};
 }

 function point(viewport,x,y){
  if(typeof viewport.convertToViewportPoint==='function')return viewport.convertToViewportPoint(x,y);
  const t=viewport.transform;
  if(!t||t.length!==6)throw new TypeError('PDF-sidans koordinatsystem saknas.');
  return[t[0]*x+t[2]*y+t[4],t[1]*x+t[3]*y+t[5]];
 }

 // PDF.js provides a whole page text stream. Only token boxes whose centres
 // lie in the marked field are returned; text outside that field is ignored.
 function readText(content,viewport,rect){
  rect=selectedRect(rect);
  if(!viewport||!(viewport.width>0)||!(viewport.height>0))throw new TypeError('PDF-sidans storlek saknas.');
  const bounds={left:rect.x*viewport.width,top:rect.y*viewport.height,right:(rect.x+rect.w)*viewport.width,bottom:(rect.y+rect.h)*viewport.height};
  const pieces=[];
  for(const item of content&&Array.isArray(content.items)?content.items:[]){
   if(!item||typeof item.str!=='string'||!item.str.trim()||!Array.isArray(item.transform)||item.transform.length<6)continue;
   const t=item.transform;
   if(!t.every(Number.isFinite))continue;
   const horizontal=Math.hypot(t[0],t[1])||1,vertical=Math.hypot(t[2],t[3])||horizontal;
   const ux=t[0]/horizontal,uy=t[1]/horizontal,vx=t[2]/vertical,vy=t[3]/vertical;
   const width=Math.abs(Number(item.width)||0),height=Math.abs(Number(item.height)||vertical);
   if(!width||!height)continue;
   const raw=item.str;
   for(const match of raw.matchAll(/\S+/gu)){
    // PDF.js text items can contain several words. The character positions
    // provide a conservative subdivision instead of returning an entire row.
    const start=match.index/raw.length,end=(match.index+match[0].length)/raw.length;
    const corners=[];
    for(const advance of[start*width,end*width])for(const ascent of[-.2*height,.8*height])corners.push(point(viewport,t[4]+ux*advance+vx*ascent,t[5]+uy*advance+vy*ascent));
    const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    const cx=(left+right)/2,cy=(top+bottom)/2;
    if(cx<bounds.left||cx>bounds.right||cy<bounds.top||cy>bounds.bottom)continue;
    pieces.push({text:match[0],left,right,top,bottom,cx,cy,height:Math.max(.1,bottom-top),charWidth:Math.max(.1,(right-left)/match[0].length)});
   }
  }
  pieces.sort((a,b)=>a.cy-b.cy||a.left-b.left);
  const lines=[];
  for(const piece of pieces){
   let line=lines.find(candidate=>Math.abs(candidate.cy-piece.cy)<=Math.max(.75,Math.min(candidate.height,piece.height)*.45));
   if(!line){line={cy:piece.cy,height:piece.height,pieces:[]};lines.push(line);}
   line.pieces.push(piece);
  }
  return lines.sort((a,b)=>a.cy-b.cy).map(line=>{
   line.pieces.sort((a,b)=>a.left-b.left);
   let previous=null,text='';
   for(const piece of line.pieces){
    const separated=previous&&piece.left-previous.right>Math.max(.4,Math.min(previous.charWidth,piece.charWidth)*.3);
    text+=(separated?' ':'')+piece.text;
    previous=piece;
   }
   return text;
  }).join('\n').trim();
 }

 // The selected field is arbitrary text. Only whitespace and case are
 // normalized; labels, word boundaries and punctuation remain meaningful.
 function parseHeader(text){
  const normalized=clean(text);if(!normalized)return null;
  const key=normalized.toLocaleUpperCase('sv-SE');
  return{key,code:key,text:normalized,prefix:null};
 }

 function abort(){const error=new Error('Avläsningen avbröts.');error.name='AbortError';return error;}
 function checkCancelled(options){if((typeof options.cancelled==='function'&&options.cancelled())||(options.signal&&options.signal.aborted))throw abort();}

 async function scan(options){
  options=options||{};
  const pdf=options.pdf;
  if(!pdf||!Number.isInteger(pdf.numPages)||pdf.numPages<1||typeof pdf.getPage!=='function')throw new TypeError('En öppnad PDF krävs.');
  const rect=selectedRect(options.rect),mode=options.mode||'auto';
  if(mode!=='auto'&&mode!=='text')throw new TypeError('Välj auto eller text för avläsningen.');
  const input=options.pages==null?Array.from({length:pdf.numPages},(_,i)=>i+1):options.pages;
  if(!Array.isArray(input))throw new TypeError('Sidor ska anges som en lista med sidnummer.');
  const pages=[...new Set(input)];
  if(pages.some(page=>!Number.isInteger(page)||page<1||page>pdf.numPages))throw new RangeError('Ett sidnummer ligger utanför PDF-filen.');
  if(options.examplePage!=null&&(!Number.isInteger(options.examplePage)||options.examplePage<1||options.examplePage>pdf.numPages))throw new RangeError('Exempelsidan ligger utanför PDF-filen.');
  const grouped=new Map(),unresolved=[];
  let readCount=0;
  async function readField(page){
   let proxy,viewport,text='',source='text',parsed=null,nativeError=null,imageError=null,confidence,lowConfidence=false;
   try{
    proxy=await pdf.getPage(page);checkCancelled(options);
    viewport=proxy.getViewport({scale:1});
    const content=await proxy.getTextContent();checkCancelled(options);
    text=readText(content,viewport,rect);
    parsed=parseHeader(text);
   }catch(error){
    checkCancelled(options);if(error&&error.name==='AbortError')throw error;
    nativeError=error;
   }
   if(!parsed&&mode==='auto'&&typeof options.readImage==='function'&&proxy&&viewport){
    checkCancelled(options);
    try{
     const image=await options.readImage(proxy,{...rect},{page,viewport,cancelled:()=>{checkCancelled(options);return false;}});
     checkCancelled(options);
     source='image';
     const imageText=typeof image==='string'?image:image&&typeof image.text==='string'?image.text:'';
     text=clean(imageText);parsed=parseHeader(imageText);
     if(image&&typeof image==='object'&&Number.isFinite(image.confidence)){
      confidence=image.confidence;
      if(confidence<75)lowConfidence=true;
     }
    }catch(error){
     checkCancelled(options);if(error&&error.name==='AbortError')throw error;
     imageError=error;
    }
   }
   checkCancelled(options);
   return{page,text,source,parsed,nativeError,imageError,confidence,lowConfidence};
  }
  for(let index=0;index<pages.length;index++){
   checkCancelled(options);
   const page=pages[index];
   const field=await readField(page);
   const{text,source,nativeError,imageError,confidence,lowConfidence}=field;
   const parsed=field.parsed;
   if(parsed){
    const entry={page,code:parsed.code,text,source};
    if(confidence!=null)entry.confidence=confidence;
    if(lowConfidence)entry.lowConfidence=true;
    if(!grouped.has(parsed.key))grouped.set(parsed.key,{key:parsed.key,code:parsed.code,pages:[]});
    grouped.get(parsed.key).pages.push(entry);
   }else{
    const entry={page,reason:imageError?'image-error':nativeError?'text-error':text?'unrecognized':'empty',text,source};
    if(confidence!=null)entry.confidence=confidence;
    if(imageError||nativeError)entry.message=String((imageError||nativeError).message||'Sidan kunde inte läsas.');
    unresolved.push(entry);
   }
   readCount++;
   if(typeof options.onProgress==='function')await options.onProgress({page,index:index+1,total:pages.length,readCount,source,code:parsed?parsed.code:null,status:parsed?'read':'unresolved'});
   checkCancelled(options);
   // Do not call page.cleanup(): the drawing tool may share this page proxy
   // with its preview, and PDF.js owns the document-level resource lifetime.
  }
  return{groups:[...grouped.values()],unresolved,readCount,prefix:null};
 }

 return{readText,parseHeader,scan};
});
