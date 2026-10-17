/* Read a marked door-card region once and retain word coordinates for a hidden
 * PDF text layer. This module never changes the original PDF or visible image. */
(function(root,factory){
 'use strict';
 const geometry=typeof module==='object'&&module.exports?require('./drawing-ocr-image-regions.js'):root.DrawingOcrImageRegions;
 const api=factory(root,geometry);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DrawingOcrReader=api;
})(typeof window!=='undefined'?window:globalThis,function(root,geometry){
 'use strict';
 const clean=value=>String(value==null?'':value).normalize('NFKC').replace(/[\u200b\u00ad\ufeff]/g,'').replace(/\s+/gu,' ').trim();
 const finite=value=>Number.isFinite(Number(value));
 function abortError(){const error=Error('Textförberedelsen avbröts.');error.name='AbortError';return error;}
 function quietly(callback){try{const value=callback?.();if(value&&typeof value.catch==='function')value.catch(()=>{});}catch(_){}}
 function check(options){if(options.signal?.aborted||options.cancelled?.())throw abortError();}
 function selectedRect(rect){
  if(!rect||!['x','y','w','h'].every(key=>Number.isFinite(rect[key]))||rect.w<=0||rect.h<=0)throw TypeError('Markera ett dörrkort eller ett textområde först.');
  const x=Math.max(0,rect.x),y=Math.max(0,rect.y),r=Math.min(1,rect.x+rect.w),b=Math.min(1,rect.y+rect.h);
  if(r<=x||b<=y)throw RangeError('Markeringen ligger utanför sidan.');
  return{x,y,w:r-x,h:b-y};
 }
 function pageOption(source,page){
  let value=source;
  if(typeof value==='function')value=value(page);
  else if(value instanceof Map)value=value.get(page);
  else if(value&&!Array.isArray(value))value=value[page];
  return value;
 }
 function exclusions(options,page){
  const value=pageOption(options.excludeRects,page);
  return(Array.isArray(value)?value:[]).flatMap(rect=>{try{return[selectedRect(rect)];}catch(_){return[];}});
 }
 function clippedSelection(selection,options,page){
  const clip=pageOption(options.clipRects,page);
  if(!clip)return selection;
  const bounds=selectedRect(clip),x=Math.max(selection.x,bounds.x),y=Math.max(selection.y,bounds.y),right=Math.min(selection.x+selection.w,bounds.x+bounds.w),bottom=Math.min(selection.y+selection.h,bounds.y+bounds.h);
  return right>x&&bottom>y?{x,y,w:right-x,h:bottom-y}:null;
 }
 function contains(rect,x,y){return x>=rect.x&&x<=rect.x+rect.w&&y>=rect.y&&y<=rect.y+rect.h;}
 function excluded(word,rects,viewport){return rects.some(rect=>intersection(word,{x:rect.x*viewport.width,y:rect.y*viewport.height,w:rect.w*viewport.width,h:rect.h*viewport.height})>0);}
 function point(viewport,x,y){
  const t=viewport.transform;
  if(t?.length===6)return[t[0]*x+t[2]*y+t[4],t[1]*x+t[3]*y+t[5]];
  if(typeof viewport.convertToViewportPoint==='function')return viewport.convertToViewportPoint(x,y);
  throw Error('PDF-sidans koordinater saknas.');
 }
 function nativeWords(content,viewport,rect,excludedRects=[]){
  const words=[];
  for(const item of content?.items||[]){
   if(!item||typeof item.str!=='string'||!item.str.trim()||!item.transform||item.transform.length!==6||!Array.from(item.transform).every(Number.isFinite))continue;
   const t=item.transform,width=Math.abs(Number(item.width)||0),height=Math.abs(Number(item.height)||Math.hypot(t[2],t[3])||0);
   if(!width||!height)continue;
   const sx=Math.hypot(t[0],t[1])||1,sy=Math.hypot(t[2],t[3])||sx,ux=t[0]/sx,uy=t[1]/sx,vx=t[2]/sy,vy=t[3]/sy;
   for(const match of item.str.matchAll(/\S+/gu)){
    const start=match.index/item.str.length,end=(match.index+match[0].length)/item.str.length,corners=[];
    for(const advance of[start*width,end*width])for(const rise of[-.2*height,.8*height])corners.push(point(viewport,t[4]+ux*advance+vx*rise,t[5]+uy*advance+vy*rise));
    if(corners.some(p=>!p.every(Number.isFinite)))continue;
    const x=Math.min(...corners.map(p=>p[0])),y=Math.min(...corners.map(p=>p[1]));
    const word={text:clean(match[0]),x,y,w:Math.max(...corners.map(p=>p[0]))-x,h:Math.max(...corners.map(p=>p[1]))-y,confidence:100,source:'native'};
    if(!contains(rect,(word.x+word.w/2)/viewport.width,(word.y+word.h/2)/viewport.height)||excluded(word,excludedRects,viewport))continue;
    words.push(word);
   }
  }
  return words;
 }
 function race(operation,options,onAbort,timeoutMs){
  check(options);
  return new Promise((resolve,reject)=>{
   let done=false,interval,timer;
   const finish=(fn,value)=>{if(done)return;done=true;clearInterval(interval);clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);fn(value);};
   const cancel=()=>{if(done)return;try{onAbort?.();}catch(_){}finish(reject,abortError());};
   options.signal?.addEventListener('abort',cancel,{once:true});
   if(options.cancelled)interval=setInterval(()=>{if(options.cancelled())cancel();},100);
   if(timeoutMs>0)timer=setTimeout(()=>{try{onAbort?.();}catch(_){}const error=Error('Bildläsningen tog för lång tid. Prova färre sidor eller en mindre markering.');error.name='TimeoutError';finish(reject,error);},timeoutMs);
   Promise.resolve(operation).then(value=>{try{check(options);finish(resolve,value);}catch(error){finish(reject,error);}},error=>finish(reject,error));
   if(options.signal?.aborted)cancel();
  });
 }
 function canvasFor(options,width,height){
  const canvas=options.createCanvas?options.createCanvas(width,height):root.document?.createElement('canvas');
  if(!canvas)throw Error('Bildläsning kräver en webbläsare med canvas.');
  canvas.width=width;canvas.height=height;
  return canvas;
 }
 function free(canvas){if(canvas)canvas.width=canvas.height=1;}
 function renderPlan(viewport,rect,options){
  const target=Math.min(4,Math.max(.1,Number(options.dpi)||200)/72),area=viewport.width*rect.w*viewport.height*rect.h;
  const maxPixels=Math.min(8000000,Math.max(10000,Number(options.maxPixels)||8000000)),maxSide=Math.min(8192,Math.max(256,Number(options.maxSide)||8192));
  const scale=Math.min(target,Math.sqrt(maxPixels/area),maxSide/(viewport.width*rect.w),maxSide/(viewport.height*rect.h));
  return{scale,width:Math.max(1,Math.floor(viewport.width*rect.w*scale)),height:Math.max(1,Math.floor(viewport.height*rect.h*scale)),targetScale:target,capped:scale<target*.99};
 }
 function tilesFor(width,height,options={}){
  const maxArea=Math.min(1600000,Math.max(10000,Number(options.maxTilePixels)||1200000));
  const side=Math.min(1800,Math.max(128,Number(options.tileSide)||1400));
  const tw=Math.min(width,side,Math.max(1,Math.floor(Math.sqrt(maxArea*1.5)))),th=Math.min(height,side,Math.max(1,Math.floor(maxArea/tw)));
  const overlap=Math.min(Math.max(0,Number.isFinite(options.tileOverlap)?options.tileOverlap:72),Math.floor(Math.min(tw,th)/4));
  const xs=[],ys=[];
  for(let x=0;;x+=tw-overlap){xs.push(x);if(x+tw>=width)break;}
  for(let y=0;;y+=th-overlap){ys.push(y);if(y+th>=height)break;}
  return ys.flatMap((y,yi)=>xs.map((x,xi)=>({x,y,w:Math.min(tw,width-x),h:Math.min(th,height-y),left:xi>0?overlap/2:0,top:yi>0?overlap/2:0,right:xi<xs.length-1?overlap/2:0,bottom:yi<ys.length-1?overlap/2:0})));
 }
 // Erase only long, thin straight runs on the temporary OCR tile. The source
 // PDF/canvas stays unchanged, and short strokes in characters remain intact.
 function removeGridLines(canvas){
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context?.getImageData||!context.putImageData)return 0;
  let image;try{image=context.getImageData(0,0,canvas.width,canvas.height);}catch(_){return 0;}
  const {data,width,height}=image;if(!data||!width||!height)return 0;
  const dark=index=>data[index+3]>128&&data[index]+data[index+1]+data[index+2]<420;
  const runs=[];
  function collect(horizontal){
   const outer=horizontal?height:width,inner=horizontal?width:height,minRun=Math.max(60,Math.ceil(inner*.35));
   if(inner<minRun)return;
   const bands=[];
   for(let a=0;a<outer;a++){
    const row=[];let start=-1;
    for(let b=0;b<=inner;b++){
     const index=horizontal?(a*width+b)*4:(b*width+a)*4;
     if(b<inner&&dark(index)){if(start<0)start=b;}
     else if(start>=0){if(b-start>=minRun)row.push([start,b]);start=-1;}
    }
    if(row.length)bands.push({a,row});
   }
   // A broad black band is image content, not a table grid line.
   for(let i=0;i<bands.length;){let j=i+1;while(j<bands.length&&bands[j].a===bands[j-1].a+1)j++;
    if(j-i<=5)for(let k=i;k<j;k++)for(const [start,end]of bands[k].row)runs.push({horizontal,a:bands[k].a,start,end});
    i=j;
   }
  }
  collect(true);collect(false);
  let changed=0;
  for(const run of runs)for(let b=run.start;b<run.end;b++){
   const i=run.horizontal?(run.a*width+b)*4:(b*width+run.a)*4;
   if(dark(i)){data[i]=data[i+1]=data[i+2]=255;data[i+3]=255;changed++;}
  }
  if(changed)context.putImageData(image,0,0);
  return changed;
 }
 function tesseractWords(result){
  const data=result?.data||result||{};
  if(Array.isArray(data.words)&&data.words.length)return data.words;
  const nested=[];
  for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[])nested.push(...line.words||[]);
  if(nested.length)return nested;
  if(typeof data.tsv==='string')for(const line of data.tsv.split(/\r?\n/).slice(1)){
   const values=line.split('\t');if(values.length<12||values[0]!=='5'||!clean(values.slice(11).join('\t')))continue;
   const [x,y,w,h]=values.slice(6,10).map(Number);nested.push({text:values.slice(11).join('\t'),confidence:Number(values[10]),bbox:{x0:x,y0:y,x1:x+w,y1:y+h}});
  }
  return nested;
 }
 function intersection(a,b){return Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));}
 function redundant(word,words){
  const key=clean(word.text).toLocaleUpperCase('sv-SE'),area=word.w*word.h;
  return words.some(other=>{
   const overlap=intersection(word,other);if(!overlap)return false;
   if(other.source==='native'&&overlap/area>.55)return true;
   return clean(other.text).toLocaleUpperCase('sv-SE')===key&&overlap/Math.min(area,other.w*other.h)>.3;
  });
 }
 function decodeWords(result,tile,plan,viewport,rect,excludedRects,threshold){
  const words=[];
  for(const raw of tesseractWords(result)){
   const text=clean(raw.text),box=raw.bbox;
   if(!text||!box||!['x0','y0','x1','y1'].every(key=>finite(box[key])))continue;
   const x0=Math.max(0,Number(box.x0)),y0=Math.max(0,Number(box.y0)),x1=Math.min(tile.w,Number(box.x1)),y1=Math.min(tile.h,Number(box.y1));
   if(x1<=x0||y1<=y0)continue;
   const cx=(x0+x1)/2,cy=(y0+y1)/2;
   // Overlap belongs to exactly one tile, avoiding double words/cell values.
   if(cx<tile.left||cx>=tile.w-tile.right||cy<tile.top||cy>=tile.h-tile.bottom)continue;
   const confidence=Number.isFinite(Number(raw.confidence))?Math.max(0,Math.min(100,Number(raw.confidence))):null;
   const word={text,x:rect.x*viewport.width+(tile.x+x0)/plan.scale,y:rect.y*viewport.height+(tile.y+y0)/plan.scale,w:(x1-x0)/plan.scale,h:(y1-y0)/plan.scale,confidence,source:'ocr',lowConfidence:confidence==null||confidence<threshold};
   if(!excluded(word,excludedRects,viewport))words.push(word);
  }
  return words;
 }
 async function read(options={}){
  const pdf=options.pdf;
  if(!pdf||!Number.isInteger(pdf.numPages)||pdf.numPages<1||typeof pdf.getPage!=='function')throw TypeError('Öppna en PDF först.');
  const selection=selectedRect(options.rect||{x:0,y:0,w:1,h:1});
  const input=options.pages||Array.from({length:pdf.numPages},(_,i)=>i+1);
  if(!Array.isArray(input)||input.some(page=>!Number.isInteger(page)||page<1||page>pdf.numPages))throw RangeError('Ogiltigt sidval.');
  const pages=[...new Set(input)],results=[],started=Date.now();
  const summary={pages:pages.length,ocrPages:0,skippedPages:0,words:0,nativeWords:0,lowConfidenceWords:0,errorPages:0,partialPages:0,cappedPages:0,elapsedMs:0};
  let completedChunks=0,ocrMs=0,seenChunkCount=0,seenOcrPages=0;
  async function progress(info){
   check(options);const elapsedMs=Date.now()-started;
   const fraction=info.fraction==null?0:info.fraction;
   const percent=info.phase==='complete'?100:Math.min(99.9,Math.max(0,((info.pageIndex-1+fraction)/Math.max(1,pages.length))*100));
   let etaMs=null;
   if(completedChunks&&info.phase==='ocr'){
    const futurePages=Math.max(0,pages.length-info.pageIndex),averageChunks=seenChunkCount/Math.max(1,seenOcrPages);
    etaMs=Math.max(0,Math.round((ocrMs/completedChunks)*(Math.max(0,info.tileCount-info.tileIndex)+futurePages*averageChunks)));
   }
   if(options.onProgress)await options.onProgress({...info,pageCount:pages.length,percent,elapsedMs,etaMs,etaEstimated:etaMs!=null});
   check(options);
  }
  for(let index=0;index<pages.length;index++){
   check(options);const pageNumber=pages[index],pageIndex=index+1,base={page:pageNumber,pageIndex},rect=clippedSelection(selection,options,pageNumber);
   let page,canvas,renderTask,worker,entry;
   try{
    await progress({...base,phase:'inspect',fraction:0,tileIndex:0,tileCount:0});
    if(!rect){results.push({page:pageNumber,words:[],nativeCount:0,status:'excluded',warnings:[],wordUnits:'viewport'});summary.skippedPages++;await progress({...base,phase:'page-complete',fraction:1,tileIndex:0,tileCount:0,status:'excluded',wordCount:0});continue;}
    page=await race(pdf.getPage(pageNumber),options);check(options);
    const viewport=page.getViewport({scale:1});
    if(!(viewport.width>0&&viewport.height>0)||!viewport.transform||viewport.transform.length!==6)throw Error('PDF-sidans storlek eller koordinater saknas.');
    const ignored=exclusions(options,pageNumber);
    entry={page:pageNumber,viewport:{width:viewport.width,height:viewport.height,transform:Array.from(viewport.transform)},wordUnits:'viewport',rect:{...rect},words:[],nativeCount:0,status:'pending',warnings:[]};
    let native=[];
    try{native=nativeWords(await race(page.getTextContent(),options),viewport,rect,ignored);}catch(error){check(options);entry.warnings.push('Befintlig PDF-text kunde inte läsas. Området bildläses.');}
    entry.nativeCount=native.length;summary.nativeWords+=native.length;
    let images={unknown:true,hasImages:true};
    if(geometry)images=await race(geometry.inspect(page,rect,options.pdfjsLib),options);
    if(!images.hasImages&&native.length){
     entry.status='native';summary.skippedPages++;results.push(entry);
     await progress({...base,phase:'page-complete',fraction:1,tileIndex:0,tileCount:0,source:'native',nativeCount:native.length,wordCount:0});continue;
    }
    const plan=renderPlan(viewport,rect,options),tiles=tilesFor(plan.width,plan.height,options);
    entry.renderScale=plan.scale;entry.effectiveDpi=plan.scale*72;entry.ocr=true;
    if(plan.capped){entry.warnings.push('Markeringen är stor. Bildläsningen har begränsad upplösning; kontrollera små tecken.');summary.cappedPages++;}
    if(images.unknown)entry.warnings.push('Bildinnehållets positioner kunde inte säkert fastställas; hela markeringen bildläses.');
    summary.ocrPages++;seenOcrPages++;seenChunkCount+=tiles.length;
    await progress({...base,phase:'render',fraction:.05,tileIndex:0,tileCount:tiles.length,effectiveDpi:entry.effectiveDpi,capped:plan.capped});
    canvas=canvasFor(options,plan.width,plan.height);
    const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('Canvas kunde inte öppnas.');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    const scaled=page.getViewport({scale:plan.scale});
    renderTask=page.render({canvasContext:context,viewport:scaled,transform:[1,0,0,1,-rect.x*scaled.width,-rect.y*scaled.height],annotationMode:0,background:'#fff'});
    await race(renderTask.promise||renderTask,options,()=>renderTask.cancel?.());check(options);renderTask=null;
    context.fillStyle='#fff';
    for(const mask of ignored){
     const x=(mask.x-rect.x)*viewport.width*plan.scale,y=(mask.y-rect.y)*viewport.height*plan.scale;
     context.fillRect(x,y,mask.w*viewport.width*plan.scale,mask.h*viewport.height*plan.scale);
    }
    if(!options.recognize){
     if(typeof options.getWorker!=='function')throw Error('Lokal OCR-motor saknas.');
     const pending=Promise.resolve(options.getWorker({...base,signal:options.signal}));
     pending.then(late=>{if(options.signal?.aborted||options.cancelled?.())quietly(()=>late?.terminate?.());},()=>{});
     worker=await race(pending,options);check(options);
     if(typeof worker?.recognize!=='function')throw Error('OCR-motorn kunde inte startas.');
    }
    for(let tileIndex=0;tileIndex<tiles.length;tileIndex++){
     check(options);const tile=tiles[tileIndex],chunkStarted=Date.now();let copy;
     await progress({...base,phase:'ocr',fraction:.15+.8*tileIndex/tiles.length,tileIndex,tileCount:tiles.length,wordCount:entry.words.length});
     try{
      copy=canvasFor(options,tile.w,tile.h);const tileContext=copy.getContext('2d',{willReadFrequently:true});
      if(!tileContext)throw Error('Bildområdet kunde inte öppnas.');
      tileContext.drawImage(canvas,tile.x,tile.y,tile.w,tile.h,0,0,tile.w,tile.h);
      if(options.removeGridLines!==false)removeGridLines(copy);
      const recognitionContext={...base,pageCount:pages.length,tileIndex:tileIndex+1,tileCount:tiles.length,signal:options.signal};
      const operation=options.recognize?options.recognize(copy,recognitionContext):worker.recognize(copy,{}, {blocks:true,tsv:true});
      const cancel=()=>quietly(options.onCancelRecognition?()=>options.onCancelRecognition():()=>worker?.terminate?.());
      const recognized=await race(operation,options,cancel,Math.max(1000,Number(options.ocrTimeoutMs)||120000));
      check(options);
      const words=decodeWords(recognized,tile,plan,viewport,rect,ignored,Number.isFinite(options.confidenceThreshold)?options.confidenceThreshold:75);
      for(const word of words)if(!redundant(word,native)&&!redundant(word,entry.words))entry.words.push(word);
     }finally{free(copy);}
     completedChunks++;ocrMs+=Date.now()-chunkStarted;
     await progress({...base,phase:'ocr',fraction:.15+.8*(tileIndex+1)/tiles.length,tileIndex:tileIndex+1,tileCount:tiles.length,wordCount:entry.words.length});
    }
    entry.status=entry.words.length?'read':native.length?'native':'empty';
    if(!entry.words.length&&!native.length)entry.warnings.push('Ingen text kunde läsas i markeringen. Kontrollera området och bildkvaliteten.');
    entry.words.sort((a,b)=>a.y-b.y||a.x-b.x);
   }catch(error){
    check(options);if(error?.name==='AbortError')throw error;
    entry=entry||{page:pageNumber,words:[],nativeCount:0,warnings:[],wordUnits:'viewport'};
    entry.status=entry.words.length?'partial':'error';entry.error=String(error?.message||error);
    entry.warnings.push(entry.error);summary.errorPages++;if(entry.words.length)summary.partialPages++;
   }finally{try{renderTask?.cancel?.();}catch(_){}free(canvas);}
   summary.words+=entry.words.length;summary.lowConfidenceWords+=entry.words.filter(word=>word.lowConfidence).length;
   results.push(entry);
   await progress({...base,phase:'page-complete',fraction:1,tileIndex:0,tileCount:0,status:entry.status,wordCount:entry.words.length,nativeCount:entry.nativeCount});
  }
  summary.elapsedMs=Date.now()-started;
  await progress({page:pages.at(-1)||null,pageIndex:pages.length,phase:'complete',fraction:1,tileIndex:0,tileCount:0,summary});
  return{pages:results,summary};
 }
 return Object.freeze({read,nativeWords,renderPlan,tilesFor,removeGridLines,tesseractWords});
});
