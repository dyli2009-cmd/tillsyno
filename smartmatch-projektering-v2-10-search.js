/* Projektering 2.10: search existing PDF text across pages without changing the PDF. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.Proj2Search=api;
})(typeof window==='object'?window:globalThis,function(root){
 'use strict';
 const LIMITS=Object.freeze({pages:200,bytes:50*1024*1024,query:160,results:1000,pageCharacters:200000,totalCharacters:4000000});
 const fold=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('sv').replace(/\s+/g,' ');
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const aborted=()=>{const error=Error('Sökningen avbröts.');error.name='AbortError';return error;};
 const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
 const codeCharacter=char=>!!char&&/[\p{L}\p{N}_\-/:]/u.test(char);
 const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 function queryPattern(value){
  const query=fold(value).trim();
  if(query.length>LIMITS.query)throw Error('Söktexten får vara högst '+LIMITS.query+' tecken.');
  // PDF producers often put the letters and digits of a door code in separate
  // text operators. A hard line boundary remains a boundary, unlike small gaps.
  const characters=[...query.replace(/ /g,'')];
  return{query,expression:characters.length?new RegExp(characters.map(escape).join('[ \\t]*'),'gu'):null};
 }
 function geometry(item,styles,viewport){
  if(!item||typeof item.str!=='string'||!Array.isArray(item.transform)||item.transform.length!==6)return null;
  const tx=multiply(viewport.transform,item.transform),font=styles[item.fontName]||{};
  let angle=Math.atan2(tx[1],tx[0]);if(font.vertical)angle+=Math.PI/2;
  const ux=Math.cos(angle),uy=Math.sin(angle),height=Math.hypot(tx[2],tx[3])||Math.abs(item.height)||1;
  const scale=Number.isFinite(viewport.scale)?viewport.scale:Math.hypot(viewport.transform[0],viewport.transform[1])||1;
  const width=Math.abs(font.vertical?item.height:item.width)*scale||item.str.length*height*.5;
  return{str:item.str,text:fold(item.str),x:tx[4],y:tx[5],ux,uy,height,width,ascent:Number.isFinite(font.ascent)?font.ascent:.85,descent:Number.isFinite(font.descent)?font.descent:-.15,angle,along:tx[4]*ux+tx[5]*uy,offset:-tx[4]*uy+tx[5]*ux};
 }
 function indexPage(content,viewport,page){
  const groups=[],styles=content.styles||{},seen=new Set();let characters=0;
  for(const item of content.items||[]){
   const value=geometry(item,styles,viewport);if(!value||!value.text.trim())continue;
   const identity=value.text+'|'+[value.x,value.y,value.width,value.height,value.angle].map(number=>Math.round(number*10)).join(':');if(seen.has(identity))continue;seen.add(identity);
   characters+=value.text.length;if(characters>LIMITS.pageCharacters)throw Error('Ritningssida '+page+' innehåller för mycket text för sökningen.');
   let group=groups.find(line=>Math.abs(Math.sin(line.angle-value.angle))<.035&&Math.cos(line.angle-value.angle)>.99&&Math.abs(line.offset-value.offset)<=Math.max(1.5,Math.min(line.height,value.height)*.35));
   if(!group){group={angle:value.angle,offset:value.offset,height:value.height,items:[]};groups.push(group);}
   group.items.push(value);
  }
  groups.sort((a,b)=>a.items[0].y-b.items[0].y||a.items[0].x-b.items[0].x);
  let text='';const runs=[];
  for(const group of groups){
   group.items.sort((a,b)=>a.along-b.along);let previous=null;
   if(text)text+='\n';
   for(const item of group.items){
    if(previous){const gap=item.along-previous.along-previous.width,font=Math.max(item.height,previous.height);text+=gap>Math.max(15,font*2)?'\n':gap>font*.18?' ':'';}
    const start=text.length;text+=item.text;runs.push({...item,start,end:text.length});previous=item;
   }
  }
  return{page,width:viewport.width,height:viewport.height,text,runs};
 }
 function rectangle(run,start,end,index){
  const length=Math.max(1,run.end-run.start),from=clamp((start-run.start)/length,0,1),to=clamp((end-run.start)/length,0,1);
  const left=from*run.width,right=to*run.width,nx=-run.uy,ny=run.ux;
  const corners=[[left,-run.height*run.ascent],[right,-run.height*run.ascent],[right,-run.height*run.descent],[left,-run.height*run.descent]].map(([x,y])=>({x:run.x+run.ux*x+nx*y,y:run.y+run.uy*x+ny*y}));
  const x=clamp(Math.min(...corners.map(p=>p.x))/index.width,0,1),y=clamp(Math.min(...corners.map(p=>p.y))/index.height,0,1);
  const maxX=clamp(Math.max(...corners.map(p=>p.x))/index.width,0,1),maxY=clamp(Math.max(...corners.map(p=>p.y))/index.height,0,1);
  return{x,y,width:maxX-x,height:maxY-y};
 }
 function findMatches(index,value,{maxResults=LIMITS.results,wholeWords=true}={}){
  const {expression}=queryPattern(value);if(!expression)return[];
  const results=[];let match;
  while((match=expression.exec(index.text))){
   const start=match.index,end=start+match[0].length;
   if(wholeWords&&(codeCharacter(index.text[start-1])||codeCharacter(index.text[end])))continue;
   const pieces=index.runs.filter(run=>run.end>start&&run.start<end),rects=pieces.map(run=>rectangle(run,Math.max(start,run.start),Math.min(end,run.end),index)).filter(rect=>rect.width>0&&rect.height>0);
   if(!rects.length)continue;
   results.push({id:index.page+':'+start,page:index.page,text:pieces.map(run=>run.str).join('').trim().slice(0,140),rects});
   if(results.length>=maxResults)break;
  }
  return results;
 }
 function create(options={}){
  const pdfjs=options.pdfjs||root.pdfjsLib;
  if(!pdfjs?.getDocument)throw Error('PDF-läsaren kunde inte laddas.');
  let document=null,ownsDocument=false,loading=null,generation=0,searchGeneration=0,destroyed=false,indexes=[],indexing=null,total=0,textPages=0,failedPages=[];
  const stats=()=>({total,scannedPages:indexes.filter(Boolean).length,textPages,failedPages:[...failedPages]});
  const progress=()=>{try{options.onProgress?.(stats());}catch(_){}};
  async function close(){
   generation++;searchGeneration++;const old=document,owned=ownsDocument,task=loading;document=null;ownsDocument=false;loading=null;indexes=[];indexing=null;total=0;textPages=0;failedPages=[];
   if(task)try{await task.destroy();}catch(_){}
   if(old&&owned)try{await old.destroy();}catch(_){}
  }
  async function open(bytes){
   if(destroyed)throw Error('Textsökningen har stängts.');
   const closing=close(),token=generation;await closing;if(token!==generation||destroyed)throw aborted();
   const source=bytes instanceof Uint8Array?bytes:bytes instanceof ArrayBuffer?new Uint8Array(bytes):null;
   if(!source)throw Error('Välj en PDF-ritning.');
   if(!source.byteLength)return stats();
   if(source.byteLength>LIMITS.bytes)throw Error('Ritningen får vara högst 50 MB.');
   if(pdfjs.GlobalWorkerOptions&&!pdfjs.GlobalWorkerOptions.workerSrc&&typeof window==='object')pdfjs.GlobalWorkerOptions.workerSrc=new URL('vendor/pdf.worker.min.js',document?.baseURI||root.document.baseURI).href;
   const task=pdfjs.getDocument({data:source.slice(),useSystemFonts:true,isEvalSupported:false});loading=task;
   try{
    const pdf=await task.promise;
    if(token!==generation||destroyed){await pdf.destroy();throw aborted();}
    if(pdf.numPages>LIMITS.pages){await pdf.destroy();throw Error('Textsökningen stöder högst '+LIMITS.pages+' ritningssidor.');}
    document=pdf;ownsDocument=true;total=pdf.numPages;loading=null;progress();return stats();
   }catch(error){if(token!==generation||destroyed)throw aborted();if(loading===task)loading=null;throw error;}
  }
  async function useDocument(pdf){
   if(destroyed)throw Error('Textsökningen har stängts.');
   const closing=close(),token=generation;await closing;if(token!==generation||destroyed)throw aborted();
   if(!pdf||!Number.isSafeInteger(pdf.numPages)||typeof pdf.getPage!=='function')throw Error('Ritningens PDF-text kunde inte öppnas.');
   if(pdf.numPages>LIMITS.pages)throw Error('Textsökningen stöder högst '+LIMITS.pages+' ritningssidor.');
   // The canvas already owns a PDF.js document. Reuse it to avoid a second
   // document/worker copy on a phone; close never destroys this shared handle.
   document=pdf;ownsDocument=false;total=pdf.numPages;progress();return stats();
  }
  async function ensureIndex(){
   if(indexing)return indexing;
   const token=generation,pdf=document;if(!pdf)throw Error('Öppna en PDF-ritning innan du söker.');
   indexing=(async()=>{
    let characters=0;
    for(let number=1;number<=pdf.numPages;number++){
     if(token!==generation||destroyed)throw aborted();
     try{
      const page=await pdf.getPage(number),content=await page.getTextContent({includeMarkedContent:false});
      if(token!==generation||destroyed)throw aborted();
      const index=indexPage(content,page.getViewport({scale:1}),number);characters+=index.text.length;
      if(characters>LIMITS.totalCharacters)throw Error('Ritningen innehåller för mycket text för sökningen.');
      indexes[number-1]=index;if(index.runs.length)textPages++;
     }catch(error){if(error?.name==='AbortError'||token!==generation||destroyed)throw aborted();failedPages.push(number);indexes[number-1]={page:number,width:1,height:1,text:'',runs:[]};}
     progress();if(number%4===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    return indexes;
   })();
   return indexing;
  }
  async function search(value,settings={}){
   if(destroyed)throw Error('Textsökningen har stängts.');
   const {query,expression}=queryPattern(value),token=++searchGeneration,documentToken=generation;
   if(!expression)return{query,matches:[],...stats(),truncated:false};
   const indexed=await ensureIndex();if(token!==searchGeneration||documentToken!==generation||destroyed)throw aborted();
   const maxResults=Number.isSafeInteger(settings.maxResults)?clamp(settings.maxResults,1,LIMITS.results):LIMITS.results,matches=[];
   for(const index of indexed){
    const found=findMatches(index,query,{maxResults:maxResults+1-matches.length,wholeWords:settings.wholeWords!==false});matches.push(...found);
    if(matches.length>maxResults)break;
   }
   const truncated=matches.length>maxResults;return{query,matches:matches.slice(0,maxResults),...stats(),truncated};
  }
  return Object.freeze({open,useDocument,search,close,stats,destroy:async()=>{destroyed=true;await close();}});
 }
 return Object.freeze({create,indexPage,findMatches,queryPattern,LIMITS});
});
