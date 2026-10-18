/* Isolated deep-scan engine. No external service; no source PDF mutation. */
(function(root){
'use strict';
function engineError(message){const e=new Error(message);e.name="AbortError";return e;}
function scanPixels(rgba,width,height,opts={}){
 const w=Math.trunc(width),h=Math.trunc(height);
 if(!rgba||w<10||h<10||rgba.length<w*h*4)return{lines:[],diagnostics:{reason:"image-too-small"}};
 const ink=new Uint8Array(w*h),threshold=Number.isFinite(opts.threshold)?opts.threshold:226;
 for(let i=0;i<ink.length;i++){
   const p=i*4,brightness=(rgba[p]*299+rgba[p+1]*587+rgba[p+2]*114)/1000;
   ink[i]=rgba[p+3]>100&&brightness<threshold?1:0;
 }
 const maxGap=Math.max(2,Math.min(4,Math.round(Math.min(w,h)*.003)));
 const candidates=[];
 for(const vertical of [false,true]){
   const across=vertical?w:h,along=vertical?h:w;
   const minLength=Math.max(20,Math.floor(along*.06));
   for(let c=0;c<across;c++){
     let start=-1,last=-1,hits=0;
     const push=()=>{if(start>=0){const span=last-start+1;
       if(span>=minLength&&hits/span>=.78)candidates.push({vertical,c,a:start,b:last,hits});}};
     for(let q=0;q<along;q++){
       const filled=vertical?ink[q*w+c]:ink[c*w+q];
       if(filled){if(start<0)start=q;last=q;hits++;}
       else if(start>=0&&q-last>maxGap){push();start=-1;last=-1;hits=0;}
     }
     push();
   }
 }
 // Group parallel pixels that represent one printed stroke. Do not combine
 // separate columns/rows or invent new positions from a predefined template.
 candidates.sort((a,b)=>Number(a.vertical)-Number(b.vertical)||a.c-b.c||a.a-b.a);
 const merged=[];
 for(const item of candidates){
   let best=null,score=0;
   for(let i=merged.length-1;i>=0;i--){
     const x=merged[i];if(x.vertical!==item.vertical)continue;
     if(item.c-x.maxC>3)break;
     const intersection=Math.max(0,Math.min(x.b,item.b)-Math.max(x.a,item.a)+1);
     const shorter=Math.min(x.b-x.a+1,item.b-item.a+1);
     if(intersection/shorter>.70&&intersection>score){best=x;score=intersection;}
   }
   if(best){
     best.cSum+=item.c;best.count++;best.maxC=Math.max(best.maxC,item.c);
     best.a=Math.min(best.a,item.a);best.b=Math.max(best.b,item.b);
   }else merged.push({vertical:item.vertical,cSum:item.c,count:1,maxC:item.c,a:item.a,b:item.b});
 }
 // Merge interrupted segments along one geometric straight line, tolerating
 // short breaks at crossings. Never stretch gaps larger than 6 pixels.
 const lines=[];
 for(const line of merged){
   const c=line.cSum/line.count,vertical=line.vertical;
   const x1=vertical?c:line.a,y1=vertical?line.a:c,x2=vertical?c:line.b,y2=vertical?line.b:c;
   if(![x1,y1,x2,y2].every(Number.isFinite))continue;
   lines.push({x1:x1/Math.max(1,w-1),y1:y1/Math.max(1,h-1),x2:x2/Math.max(1,w-1),y2:y2/Math.max(1,h-1)});
 }
 lines.sort((a,b)=>(Math.hypot(b.x2-b.x1,b.y2-b.y1)-Math.hypot(a.x2-a.x1,a.y2-a.y1)));
 return{lines:lines.slice(0,550),diagnostics:{candidateCount:candidates.length,lineCount:lines.length,width:w,height:h,threshold,limited:lines.length>550}};
}
function reconcileWords(first,second){
 const one=Array.isArray(first)?first:[],two=Array.isArray(second)?second:[];
 const kept=one.map(x=>({...x}));let recovered=0,conflicts=0;
 const norm=t=>String(t||"").normalize("NFKC").toLocaleLowerCase("sv-SE").replace(/\s+/g,"").trim();
 const intersect=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 for(const word of two){
   if(!word?.text||![word.x,word.y,word.w,word.h].every(Number.isFinite)||word.w<=0||word.h<=0)continue;
   const confidence=Number(word.confidence);
   let candidate=null,maxOverlap=0;
   for(const prior of kept){
     if(![prior.x,prior.y,prior.w,prior.h].every(Number.isFinite))continue;
     const ratio=intersect(word,prior)/Math.max(.01,Math.min(word.w*word.h,prior.w*prior.h));
     if(ratio>maxOverlap){maxOverlap=ratio;candidate=prior;}
   }
   if(candidate&&maxOverlap>=.5){
     const equal=norm(candidate.text)===norm(word.text);
     const prevConf=Number(candidate.confidence);
     if(equal){
       if(confidence>prevConf+5)Object.assign(candidate,{...word,source:"ocr"});
     }else{
       conflicts++;
       const takeSecond=confidence>=Math.max(78,prevConf+16);
       if(takeSecond)Object.assign(candidate,{...word,source:"ocr"});
       candidate.lowConfidence=true;candidate.secondPassConflict=true;
     }
   }else if(Number.isFinite(confidence)&&confidence>=68){
     kept.push({...word,source:"ocr",lowConfidence:confidence<80,secondPassRecovered:true});recovered++;
   }
 }
 return{words:kept.sort((a,b)=>a.y-b.y||a.x-b.x),recovered,conflicts};
}
async function scanRegion(pdf,pageNumber,rect,options={}){
 const signal=options.signal;
 if(signal?.aborted)throw engineError("Avbruten");
 const page=await pdf.getPage(pageNumber);
 const base=page.getViewport({scale:1});
 const r={x:Math.max(0,Number(rect.x)),y:Math.max(0,Number(rect.y)),w:Number(rect.w),h:Number(rect.h)};
 if(![r.x,r.y,r.w,r.h].every(Number.isFinite)||r.w<=0||r.h<=0)throw Error("Ogiltig markering");
 const targetScale=4.0, maxPixels=Number(options.maxPixels)||4500000;
 const nominalW=base.width*r.w,nominalH=base.height*r.h;
 const scale=Math.min(targetScale,Math.sqrt(maxPixels/(nominalW*nominalH)),3100/nominalW,3100/nominalH);
 const viewport=page.getViewport({scale});
 const canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.floor(nominalW*scale));
 canvas.height=Math.max(1,Math.floor(nominalH*scale));
 const aspect=nominalW/nominalH;
 try{
   const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw Error("Kunde inte öppna bildområdet");
   ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
   options.onProgress?.("Renderar den markerade tabellen i hög upplösning",0);
   const task=page.render({canvasContext:ctx,viewport,transform:[1,0,0,1,-r.x*viewport.width,-r.y*viewport.height],annotationMode:0,background:"#fff"});
   if(signal?.aborted){task.cancel?.();throw engineError("Avbruten");}
   const cancel=()=>task.cancel?.();
   signal?.addEventListener("abort",cancel,{once:true});
   try{await task.promise;}finally{signal?.removeEventListener("abort",cancel);}
   if(signal?.aborted)throw engineError("Avbruten");
   options.onProgress?.("Hittar rutnätets horisontella och vertikala linjer",.35);
   const data=ctx.getImageData(0,0,canvas.width,canvas.height);
   const output=scanPixels(data.data,canvas.width,canvas.height);
   options.onProgress?.("Linjer analyserade",1);
   return{lines:output.lines,aspect,diagnostics:{...output.diagnostics,scale,source:"marked-crop",effectiveDpi:Math.round(scale*72)}};
 }finally{canvas.width=1;canvas.height=1;}
}
root.DrawingCardDeepScan=Object.freeze({scanPixels,reconcileWords,scanRegion});
})(typeof window!=='undefined'?window:globalThis);
