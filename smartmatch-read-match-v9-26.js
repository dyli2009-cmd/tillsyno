/* Drawing reader for isolated Avläsning TEST 9.8. Previous tests stay intact. */
(()=>{
 'use strict';
 const clean=s=>String(s||'').normalize('NFC').toUpperCase().replace(/[–—−]/g,'-').replace(/\s+/g,' ').trim();
 const key=s=>clean(s).replace(/[\s/_.-]+/g,'');
 const escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
 const positive=(value,fallback)=>{value=Number(value);return Number.isFinite(value)&&value>0?value:fallback;};
 function scopedPages(pdf,cardPages,pageScope,scanPages){
  const excluded=new Set(cardPages),all=Array.from({length:pdf.numPages},(_,i)=>i+1).filter(page=>!excluded.has(page)),scope=scanPages??pageScope;
  if(scope==null)return all;
  if(typeof scope==='function')return all.filter(page=>scope(page));
  const source=scope instanceof Set||Array.isArray(scope)?scope:scope?.pages instanceof Set||Array.isArray(scope?.pages)?scope.pages:null;
  if(source){const selected=new Set([...source].map(Number).filter(Number.isInteger));return all.filter(page=>selected.has(page));}
  if(Number.isInteger(Number(scope?.page))){const page=Number(scope.page);return all.filter(value=>value===page);}
  const from=Number.isFinite(Number(scope?.from))?Number(scope.from):1,to=Number.isFinite(Number(scope?.to))?Number(scope.to):pdf.numPages;
  return all.filter(page=>page>=Math.min(from,to)&&page<=Math.max(from,to));
 }
 function releaseCanvas(canvas,onCanvasRelease,scope,page){
  if(!canvas)return;
  try{const ctx=canvas.getContext?.('2d');ctx?.clearRect(0,0,canvas.width,canvas.height);}catch(_){}
  // Zero dimensions force WebKit to return the backing store immediately.
  try{canvas.width=0;canvas.height=0;}catch(_){}
  try{onCanvasRelease?.({canvas,scope,page});}catch(_){}
 }
 async function releasePage(pg,page,onPageRelease){
  if(!pg)return;
  // cleanup() discards operator lists and decoded images while keeping the
  // PDF document reusable. getPage(page) can safely recreate this proxy.
  try{pg.cleanup?.();}catch(_){}
  try{await onPageRelease?.({page,pageProxy:pg});}catch(_){}
 }
 const labelChar=/[\p{L}\p{N}/_.-]/u;
 function codePattern(code){return new RegExp('(^|[^\\p{L}\\p{N}/_.-])('+[...code].map(escaped).join('[\\s/_.-]*')+')(?=$|[^\\p{L}\\p{N}/_.-])','gu');}
 function joinedNeighbour(a,b){
  if(!a||!b||!labelChar.test(clean(a.text).slice(-1))||!labelChar.test(clean(b.text).slice(0,1)))return false;
  const gap=b.x-a.x-a.w,height=Math.min(a.h,b.h);
  // PDF writers often split a single ID into glyphs. Such fragments must not
  // turn WC1 into WC, or 1-45-1 into a door labelled 1.
  return gap<=Math.max(.0002,height*.55)||
   /[/_.-]$/.test(clean(a.text))&&gap<=height*.9||/^[/_.-]/.test(clean(b.text))&&gap<=height*.9;
 }
 function same(a,b){
  if(a.page!==b.page||a.code!==b.code)return false;
  const r=a.box,s=b.box,w=Math.min(r.w,s.w),h=Math.min(r.h,s.h);
  const overlap=Math.max(0,Math.min(r.x+r.w,s.x+s.w)-Math.max(r.x,s.x))*Math.max(0,Math.min(r.y+r.h,s.y+s.h)-Math.max(r.y,s.y));
  return overlap/Math.max(.00000001,Math.min(r.w*r.h,s.w*s.h))>.35||
   Math.abs(r.x+r.w/2-s.x-s.w/2)<w*.45&&Math.abs(r.y+r.h/2-s.y-s.h/2)<h*.65;
 }
 function boxOf(words){
  const x=Math.min(...words.map(w=>w.x)),y=Math.min(...words.map(w=>w.y));
  return {x,y,w:Math.max(...words.map(w=>w.x+w.w))-x,h:Math.max(...words.map(w=>w.y+w.h))-y};
 }
 function wholeLabelContext(prefix,suffix){
  const heading=/^\s*(?:D[ÖO]RR\s*KORT|BESLAGSKOD|BESLAGKOD|BETECKNING|LITTERA|TOALETT)\s*[:#=.-]?\s*$/u;
  return !/[\p{L}\p{N}]/u.test((heading.test(prefix)?'':prefix)+suffix);
 }
 function textHits(words,codes){
  codes=[...new Set(codes.map(key).filter(Boolean))].sort((a,b)=>b.length-a.length);
  const exactCodes=new Set(codes),maxParts=Math.max(1,...codes.map(c=>c.length)),patterns=codes.map(code=>({code,pattern:codePattern(code)}));
  const rows=[];
  for(const word of words.filter(w=>clean(w.text)).sort((a,b)=>a.y-b.y||a.x-b.x)){
   let row=rows.find(r=>Math.abs(r.y-word.y)<=Math.max(.002,Math.min(r.h,word.h)*.55));
   if(!row){row={y:word.y,h:word.h,words:[]};rows.push(row);}row.words.push(word);
  }
  const hits=[];
  for(const row of rows){
   const cells=row.words.sort((a,b)=>a.x-b.x);
   for(let start=0;start<cells.length;start++)for(let end=start;end<Math.min(start+maxParts,cells.length);end++){
    if(end>start){const a=cells[end-1],b=cells[end];if(b.x-a.x-a.w>Math.max(.003,Math.min(a.h,b.h)*.9))break;}
    const segment=cells.slice(start,end+1),raw=clean(segment.map(w=>w.text).join(' '));
    const exact=key(raw);
    if(exactCodes.has(exact)){
     if(!joinedNeighbour(cells[start-1],cells[start])&&!joinedNeighbour(cells[end],cells[end+1]))hits.push({code:exact,box:boxOf(segment),confidence:Math.min(...segment.map(w=>w.confidence??100))});
     continue;
    }
    if(end!==start||raw.length>100)continue;
    for(const {code,pattern} of patterns)for(const m of raw.matchAll(pattern)){
     // Keep a longer ID such as WC1 intact when a WC card exists as well.
     const offset=m.index+m[1].length,after=offset+m[2].length,word=cells[start],fraction=offset/Math.max(1,raw.length);
     if(!wholeLabelContext(raw.slice(0,offset),raw.slice(after)))continue;
     if(/[/_.-]\s*$/.test(raw.slice(0,offset))||/^\s*[/_.-]/.test(raw.slice(after)))continue;
     if(offset===0&&joinedNeighbour(cells[start-1],word)||after===raw.length&&joinedNeighbour(word,cells[start+1]))continue;
     hits.push({code,box:{x:word.x+word.w*fraction,y:word.y,w:word.w*m[2].length/raw.length,h:word.h},confidence:word.confidence??100});
    }
   }
  }
  return hits.sort((a,b)=>b.code.length-a.code.length);
 }
 function nativeWords(content,vp){
  return content.items.filter(i=>i.str?.trim()).map(i=>{
   const x=i.transform[4],y=i.transform[5],h=Math.max(i.height||0,Math.hypot(i.transform[2],i.transform[3]),1);
   const r=vp.convertToViewportRectangle([x,y-h*.25,x+Math.max(i.width,1),y+h*.95]);
   return {text:i.str,x:Math.min(r[0],r[2])/vp.width,y:Math.min(r[1],r[3])/vp.height,w:Math.abs(r[2]-r[0])/vp.width,h:Math.abs(r[3]-r[1])/vp.height,confidence:100};
  });
 }
 function ocrWords(data,canvas,region){
  return (data.words||[]).filter(w=>w.text?.trim()).map(w=>({text:w.text,confidence:Number(w.confidence??data.confidence??0),
   x:region.x+w.bbox.x0/canvas.width*region.w,y:region.y+w.bbox.y0/canvas.height*region.h,
   w:(w.bbox.x1-w.bbox.x0)/canvas.width*region.w,h:(w.bbox.y1-w.bbox.y0)/canvas.height*region.h}));
 }
 function asPosition(hit,page,vp,source){
  const r=hit.box,x=Math.min(1,Math.max(0,r.x)),y=Math.min(1,Math.max(0,r.y)),b={x,y,w:Math.max(.000001,Math.min(1,r.x+r.w)-x),h:Math.max(.000001,Math.min(1,r.y+r.h)-y)};
  const p=vp.convertToPdfPoint(b.x*vp.width,b.y*vp.height),q=vp.convertToPdfPoint((b.x+b.w)*vp.width,(b.y+b.h)*vp.height);
  return {...hit,box:b,page,rect:[Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.max(p[0],q[0]),Math.max(p[1],q[1])],source,selected:true};
 }
 function annotationBox(rect,vp){
  if(!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isFinite))return null;
  const r=vp.convertToViewportRectangle(rect),x=Math.min(r[0],r[2])/vp.width,y=Math.min(r[1],r[3])/vp.height,w=Math.abs(r[2]-r[0])/vp.width,h=Math.abs(r[3]-r[1])/vp.height;
  if(w<=0||h<=0||x>=1||y>=1||x+w<=0||y+h<=0)return null;
  return {x,y,w,h};
 }
 function annotationHits(annotations,codes,vp,onConflict=()=>{}){
  const hits=[],patterns=codes.map(code=>({code,pattern:codePattern(code)}));
  for(const a of annotations){
   // Invisible, Hidden and NoView annotations do not describe a visible stamp.
   if((Number(a.flags||a.annotationFlags||0)&35)!==0)continue;
   const box=annotationBox(a.rect,vp);if(!box)continue;
   const values=[a.subject,a.contentsObj?.str??a.contents].filter(value=>typeof value==='string'&&value.trim());
   const found=new Set();
   for(const value of values){
    const raw=clean(value),exact=key(raw);
    if(codes.includes(exact)){found.add(exact);continue;}
    // Metadata may say "Beslagskod: GS 23". Keep complete identifier
    // boundaries here too: GS2 must never match GS23 or GS23-A.
    if(raw.length>300)continue;
    for(const {code,pattern} of patterns)if([...raw.matchAll(pattern)].some(m=>{
     const offset=m.index+m[1].length,after=offset+m[2].length;
     return wholeLabelContext(raw.slice(0,offset),raw.slice(after))&&!/[/_.-]\s*$/.test(raw.slice(0,offset))&&!/^\s*[/_.-]/.test(raw.slice(after));
    }))found.add(code);
   }
   if(found.size>1){onConflict(a,[...found]);continue;}
   for(const code of found)hits.push({code,box,confidence:100,annotationId:String(a.id??''),structured:String(a.subtype||'').toLowerCase()==='stamp'});
  }
  return hits;
 }
 function intersectsExample(box,example){
  const intersection=Math.max(0,Math.min(box.x+box.w,example.x+example.w)-Math.max(box.x,example.x))*Math.max(0,Math.min(box.y+box.h,example.y+example.h)-Math.max(box.y,example.y));
  return intersection/Math.max(.0000000001,Math.min(box.w*box.h,example.w*example.h))>=.3;
 }
 function mergeAnnotations(indexed,annotations){
  const byId=new Map(indexed.filter(a=>a.id).map(a=>[String(a.id),a])),merged=[...indexed];
  for(const annotation of annotations){
   const record=byId.get(String(annotation.id??''));
   // PDF.js exposes /Contents but omits /Subj. Preserve both raw fields so a
   // contradictory annotation cannot reappear as a seemingly valid fallback.
   if(record)merged.push({...annotation,...record});else merged.push(annotation);
  }
  return merged;
 }
 async function crop(pg,region,scale,onRenderTask=()=>{},cancelled=()=>false,onCanvasRelease=()=>{},meta={},maxPixels=Infinity){
  if(cancelled())throw Error('Avläsningen avbröts.');
  const vp1=pg.getViewport({scale:1});
  if(Number.isFinite(maxPixels)&&maxPixels>0)scale=Math.min(scale,Math.sqrt(maxPixels/Math.max(1,region.w*vp1.width*region.h*vp1.height)));
  scale=Math.max(.05,scale);
  const vp=pg.getViewport({scale}),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.ceil(region.w*vp.width));canvas.height=Math.max(1,Math.ceil(region.h*vp.height));
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  const task=pg.render({canvasContext:ctx,viewport:vp,transform:[1,0,0,1,-region.x*vp.width,-region.y*vp.height]});onRenderTask(task);
  try{await task.promise;if(cancelled())throw Error('Avläsningen avbröts.');return canvas;}
  catch(error){releaseCanvas(canvas,onCanvasRelease,meta.scope||'crop',meta.page??null);throw error;}
  finally{onRenderTask(null);}
 }
 async function hasRasterLabels(pg){
  // A native text hit says nothing about labels embedded in an image on the
  // same page. Check image operators, including image masks used for stamps.
  // If an alternative PDF adapter cannot expose operators, image-read it.
  if(typeof pg.getOperatorList!=='function'||!window.pdfjsLib?.OPS)return true;
  const ops=window.pdfjsLib.OPS,names=['paintImageXObject','paintInlineImageXObject','paintImageMaskXObject','paintImageMaskXObjectGroup','paintSolidColorImageMask','paintImageXObjectRepeat','paintImageMaskXObjectRepeat','paintInlineImageXObjectGroup'];
  const images=new Set(names.map(n=>ops[n]).filter(n=>n!==undefined));
  const list=await pg.getOperatorList();return list.fnArray.some(op=>images.has(op));
 }
 async function scanCore({pdf,cardPages,codes,sample=null,annotationIndex=[],imageMode='auto',codeOnly=false,getTextContent,getWorker,recognize,onProgress=()=>{},onDetail=()=>{},cancelled=()=>false,onRenderTask=()=>{},pageScope=null,scanPages=null,imageLimits={},onPageRelease=()=>{},onCanvasRelease=()=>{}}){
  // Missing labels are an unmatched result in the identifier-only phase.
  // Only an explicit full image search may render/OCR drawing pages.
  if(codeOnly&&imageMode!=='full')imageMode='text';
  codes=[...new Set(codes.map(key).filter(Boolean))].sort((a,b)=>b.length-a.length);
  if(!codes.length)throw Error('Provläs och välj dörrkortens beteckningar först.');
  const hits=[],warnings=[],pages=[],add=hit=>{if(!hits.some(old=>same(old,hit)))hits.push(hit);};
  const warn=message=>{if(!warnings.includes(message))warnings.push(message);};
  const conflict=(page,found)=>warn('Sida '+page+': en PDF-stämpel har motstridiga beteckningar ('+found.join(', ')+') och behöver kontrolleras med text- eller bildläsning.');
  const indexed=new Map();
  for(const annotation of Array.isArray(annotationIndex)?annotationIndex:[]){
   if(!Number.isInteger(annotation?.page)||annotation.page<1||annotation.page>pdf.numPages)continue;
   if(!indexed.has(annotation.page))indexed.set(annotation.page,[]);
   indexed.get(annotation.page).push(annotation);
  }
  const check=()=>{if(cancelled())throw Error('Avläsningen avbröts.');};
  const textContents=new Map(),readContent=(pg,page)=>{
   if(!textContents.has(page))textContents.set(page,Promise.resolve().then(()=>getTextContent?getTextContent(pg,page):pg.getTextContent()));
   return textContents.get(page);
  };
  const drawingPages=scopedPages(pdf,cardPages,pageScope,scanPages);
  const detail=(phase,label,page,pageIndex,unit,done,total,scope,state)=>onDetail({phase,label,page,pageIndex,pageCount:drawingPages.length,unit,done,total,scope,state});
  check();
  let sampleHeight=0;
  if(sample){
   if(cardPages.includes(sample.page))throw Error('Exempelstämpeln måste markeras på en ritningssida.');
   if(!codes.includes(key(sample.code)))throw Error('Välj vilket dörrkort exempelstämpeln ska kopplas till.');
   detail('sample','Kontrollerar exempelstämpeln',sample.page,drawingPages.indexOf(sample.page)+1,'area',0,1,'sample-page-'+sample.page,'start');
   let pg=null;
   try{
    pg=await pdf.getPage(sample.page);const vp=pg.getViewport({scale:1}),r=sample.rect;
    let matches=annotationHits(indexed.get(sample.page)||[],codes,vp,(_,found)=>conflict(sample.page,found)).filter(hit=>hit.code===key(sample.code)&&hit.structured&&intersectsExample(hit.box,r));
    const structuredExample=matches.length>0;
    if(!matches.length)matches=textHits(nativeWords(await readContent(pg,sample.page),vp).filter(w=>w.x+w.w/2>=r.x&&w.x+w.w/2<=r.x+r.w&&w.y+w.h/2>=r.y&&w.y+w.h/2<=r.y+r.h),[key(sample.code)]);
    // The user may explicitly OCR only this small sample before keeping the
    // drawing search in text mode. Never OCR the whole page as a side effect.
    if(!matches.length&&sample.ocrText&&key(sample.ocrText)===key(sample.code)&&sample.textBox)matches=[{code:key(sample.code),box:sample.textBox,confidence:100}];
    if(!matches.length&&imageMode==='text'){
     // An example may be an annotation whose subject was unavailable in the
     // optional local index. Read its metadata, never its painted appearance.
     matches=annotationHits(mergeAnnotations(indexed.get(sample.page)||[],await pg.getAnnotations()),codes,vp,(_,found)=>conflict(sample.page,found))
      .filter(hit=>hit.code===key(sample.code)&&intersectsExample(hit.box,r));
     if(!matches.length)throw Error('Kunde inte bekräfta '+sample.code+' som PDF-text eller sparad PDF-stämpel i markeringen. Välj ”Sök även i bilder” om exempelstämpeln är en bild.');
    }
    if(!matches.length){
     const maxPixels=positive(imageLimits.sampleMaxPixels,1800000),maxScale=positive(imageLimits.sampleMaxScale,5);
     onProgress('Bildläser exempelstämpeln…');const scale=Math.min(maxScale,Math.sqrt(maxPixels/Math.max(1,r.w*vp.width*r.h*vp.height))),canvas=await crop(pg,r,scale,onRenderTask,cancelled,onCanvasRelease,{scope:'sample',page:sample.page},maxPixels);
     try{const worker=await getWorker();await worker.setParameters({tessedit_pageseg_mode:7,preserve_interword_spaces:'1'});const {data}=await recognize(worker,canvas);matches=textHits(ocrWords(data,canvas,r),[key(sample.code)]).filter(h=>h.confidence>=55);}
     finally{releaseCanvas(canvas,onCanvasRelease,'sample',sample.page);}
    }
    check();
    if(!matches.length)throw Error('Kunde inte bekräfta '+sample.code+' i exempelstämpeln. Markera tätt runt beteckningen och försök igen.');
    // A stamp rectangle encloses the whole appearance, rather than just its
    // code's glyphs. Its height must not become an OCR text-size constraint.
    if(!structuredExample)sampleHeight=Math.max(4,matches[0].box.h*vp.height);
    for(const h of matches)add(asPosition(h,sample.page,vp,structuredExample?'PDF-stämpel':'Exempelstämpel'));
    detail('sample','Exempelstämpeln kontrollerad',sample.page,drawingPages.indexOf(sample.page)+1,'area',1,1,'sample-page-'+sample.page,'complete');
   }finally{
    // Reuse the sample page's already extracted words when that same page is
    // part of this scan, then discard them in the normal per-page finally.
    if(!drawingPages.includes(sample.page))textContents.delete(sample.page);
    await releasePage(pg,sample.page,onPageRelease);
   }
  }
  for(const [pageOffset,page] of drawingPages.entries()){
   check();const pageIndex=pageOffset+1;
   const textDetail=(state,label)=>detail('drawing-text',label,page,pageIndex,'page',state==='complete'?pageIndex:pageOffset,drawingPages.length,'drawing-pages',state);
   textDetail('start','Läser PDF-text och sparade stämplar');
   onProgress('Läser ritning · sida '+page+' av '+pdf.numPages+'…');
   let pg=null;
   try{
    pg=await pdf.getPage(page);const vp=pg.getViewport({scale:1}),before=hits.length;
    let indexedConflict=false;
    const indexedMatches=annotationHits(indexed.get(page)||[],codes,vp,(_,found)=>{indexedConflict=true;conflict(page,found);}),covered=new Set(indexedMatches.filter(h=>h.structured).map(h=>h.code));
    for(const h of indexedMatches)add(asPosition(h,page,vp,'PDF-stämpel'));
    const indexedHits=hits.filter(h=>h.page===page&&h.source==='PDF-stämpel').length;
    if(imageMode==='auto'&&!indexedConflict&&codes.every(code=>covered.has(code))){
     // The metadata records already contain positions for every requested ID.
     // Never parse/replay the huge drawing just because a small logo is an
     // image. This is a fast result, not proof that no raster labels remain.
     warn('Sida '+page+': snabb sökning använde sparade PDF-stämplar. Övrig text och bilder kontrollerades inte. Välj ”Sök även i bilder” för att leta efter fler stämplar.');
     pages.push({page,count:hits.filter(h=>h.page===page).length,scanMode:'stamp-index',imageSkipped:true,indexedHits});
     check();textDetail('complete','PDF-stämplarna på sidan är kontrollerade');await pause();continue;
    }
    const words=nativeWords(await readContent(pg,page),vp);
    for(const h of textHits(words,codes))add(asPosition(h,page,vp,'PDF-text'));
    // The local index adds /Subj, which PDF.js omits. PDF.js remains the
    // fallback for annotations from adapters or PDFs without indexed records.
    for(const h of annotationHits(mergeAnnotations(indexed.get(page)||[],await pg.getAnnotations()),codes,vp,(_,found)=>conflict(page,found)))add(asPosition(h,page,vp,'PDF-stämpel'));
    if(imageMode==='text'){
     // Text mode is a strict, explicitly bounded search. Do not inspect image
     // operators or render the page merely to discover that a logo exists.
     warn('Sida '+page+': PDF-stämplar och PDF-text kontrollerades. Text som bara finns i bilder kontrollerades inte. Välj ”Sök även i bilder” för att söka även där.');
     pages.push({page,count:hits.filter(h=>h.page===page).length,scanMode:'text',imageSkipped:true,indexedHits});
     check();textDetail('complete','PDF-text och stämplar på sidan är kontrollerade');await pause();continue;
    }
    let imageRead=imageMode==='full'||!!sample||hits.length===before;
    if(!imageRead){try{imageRead=await hasRasterLabels(pg);}catch(_){imageRead=true;warnings.push('Sida '+page+': bildinnehållet kunde inte klassificeras; sidan bildlästes.');}}
    check();
    textDetail('complete','PDF-text och stämplar på sidan är kontrollerade');
    if(imageRead){
     const minScale=positive(imageLimits.minScale,1.6),maxScale=positive(imageLimits.maxScale,4),baseScale=positive(imageLimits.baseScale,2),targetTextHeight=positive(imageLimits.targetTextHeight,26),maxRasterPixels=positive(imageLimits.maxRasterPixels,Infinity);
     let scale=Math.min(maxScale,Math.max(minScale,sampleHeight?targetTextHeight/sampleHeight:baseScale));
     if(Number.isFinite(maxRasterPixels))scale=Math.min(scale,Math.sqrt(maxRasterPixels/Math.max(1,vp.width*vp.height)));
     scale=Math.max(.05,scale);
     const width=Math.ceil(vp.width*scale),height=Math.ceil(vp.height*scale),maxTilePixels=positive(imageLimits.maxTilePixels,Infinity);
     let tile=positive(imageLimits.tileSize,900);if(Number.isFinite(maxTilePixels))tile=Math.min(tile,Math.sqrt(maxTilePixels));tile=Math.max(64,Math.floor(tile));
     const step=Math.max(32,Math.min(tile,Math.floor(positive(imageLimits.tileStep,780)))),total=Math.ceil(width/step)*Math.ceil(height/step);let done=0;
     const imageDetail=(state,label)=>detail('drawing-image',label,page,pageIndex,'area',done,total,'drawing-page-'+page,state);
     imageDetail('start','Förbereder bildläsning på ritningssidan');
     const worker=await getWorker();await worker.setParameters({tessedit_pageseg_mode:11,preserve_interword_spaces:'1'});
     for(let top=0;top<height;top+=step)for(let left=0;left<width;left+=step){
      check();const region={x:left/width,y:top/height,w:Math.min(tile,width-left)/width,h:Math.min(tile,height-top)/height};
      imageDetail('start','Bildläser ritning · område '+(done+1)+' av '+total);
      onProgress('Bildläser ritning · sida '+page+' · område '+(done+1)+'/'+total+'…');
      const canvas=await crop(pg,region,scale,onRenderTask,cancelled,onCanvasRelease,{scope:'drawing-image',page},maxTilePixels);
      try{
       const {data}=await recognize(worker,canvas);check();
       for(const h of textHits(ocrWords(data,canvas,region),codes)){
        if(h.confidence<60)continue;
        if(sampleHeight&&(h.box.h*vp.height<sampleHeight*.4||h.box.h*vp.height>sampleHeight*2.5))continue;
        add(asPosition(h,page,vp,'Bildläst'));
       }
      }finally{releaseCanvas(canvas,onCanvasRelease,'drawing-image',page);}
      check();done++;imageDetail('complete','Bildområde '+done+' av '+total+' klart');
      await pause();
     }
    }
    pages.push({page,count:hits.filter(h=>h.page===page).length,scanMode:imageRead?'text-and-image':'text',imageSkipped:false,indexedHits});
    await pause();
   }finally{textContents.delete(page);await releasePage(pg,page,onPageRelease);}
  }
  let filtered=hits,appearance=null;
  if(sample?.appearance?.enabled){
   if(!window.SmartMatchReadAppearanceV98)throw Error('Stämpelns utseendekontroll kunde inte laddas. Ladda om TEST 9.8.');
   const appearanceLimits={maxPixels:positive(imageLimits.appearanceMaxPixels,160000),maxSide:positive(imageLimits.appearanceMaxSide,2048),maxScale:positive(imageLimits.appearanceMaxScale,6)};
   appearance=await window.SmartMatchReadAppearanceV98.filterHits({pdf,hits,sample,getWords:async(pg,page)=>nativeWords(await (getTextContent?getTextContent(pg,page):pg.getTextContent()),pg.getViewport({scale:1})),onDetail,cancelled,onRenderTask,limits:appearanceLimits,onPageRelease,onCanvasRelease});
   filtered=appearance.hits;
   if(appearance.excluded||appearance.unknown)warn((appearance.excluded+appearance.unknown)+' textträffar valdes bort eftersom stämpelns bakgrund eller form inte stämde med exemplet.');
  }
  filtered.sort((a,b)=>a.page-b.page||a.box.y-b.box.y||a.box.x-b.box.x||a.code.localeCompare(b.code));
  filtered.forEach((h,i)=>{h.order=870000+i;h.scanSource='read-tool-v9';h.sourceKind=h.code.startsWith('GS')?'gs':'project-code';h.label=h.code;});
  return {version:2,hits:filtered,pages,warnings,appearance:appearance?{excluded:appearance.excluded,unknown:appearance.unknown}:null};
 }
 async function scan(options){
  const usedWorkers=new Set(),acquire=options?.getWorker;
  const getWorker=async()=>{const worker=await acquire();if(worker)usedWorkers.add(worker);return worker;};
  try{return await scanCore({...options,getWorker});}
  finally{
   // The matcher never assumes ownership of a shared OCR worker. The caller
   // decides whether to terminate, recycle or retain it once this scan ends.
   for(const worker of usedWorkers)try{await options?.onWorkerRelease?.(worker);}catch(_){}
  }
 }
 window.SmartMatchReadMatcher=Object.freeze({scan,textHits,key,same});
})();
