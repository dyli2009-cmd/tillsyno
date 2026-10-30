/* Local example-based reading. No drawing leaves the browser. */
(()=>{
 'use strict';
 const core=DetectorScanCore;
 let library;
 const next=()=>new Promise(resolve=>setTimeout(resolve,0));
 function createSession(check=()=>{}){
  let aborted=false,task=null,worker=null,workerPromise=null;
  function guard(){if(aborted)throw new Error('Avbrutet');check();}
  function close(){aborted=true;task?.cancel();if(worker){void worker.terminate();worker=null;}}
  async function localWorker(){
   guard();if(worker)return worker;
   if(!window.Tesseract){
    if(!library)library=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('vendor/tesseract/tesseract.min.js',document.baseURI).href;s.onload=resolve;s.onerror=()=>reject(Error('Bildläsningen kunde inte laddas. Kontrollera anslutningen och försök igen.'));document.head.append(s);}).catch(e=>{library=null;throw e;});
    await library;guard();
   }
   if(!workerPromise)workerPromise=Tesseract.createWorker('eng',1,{workerPath:new URL('vendor/tesseract/worker.min.js',document.baseURI).href,corePath:new URL('vendor/tesseract/tesseract-core-lstm.wasm.js',document.baseURI).href,langPath:new URL('vendor/tesseract/lang/',document.baseURI).href,workerBlobURL:false,gzip:true}).then(async w=>{if(aborted){await w.terminate();throw Error('Avbrutet');}worker=w;await w.setParameters({tessedit_pageseg_mode:'7'});return w;});
   const w=await workerPromise;guard();return w;
  }
  async function renderCrop(p,rect,scale){
   guard();const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(rect.width*scale));c.height=Math.max(1,Math.ceil(rect.height*scale));
   task=p.render({canvasContext:c.getContext('2d',{willReadFrequently:true}),viewport:p.getViewport({scale}),transform:[1,0,0,1,-rect.left*scale,-rect.top*scale],background:'rgb(255,255,255)'});
   try{await task.promise;guard();return c;}catch(e){c.width=c.height=0;throw e;}finally{task=null;}
  }
  function upright(source,angle,inset=0){
   const c=document.createElement('canvas'),a=((angle%360)+360)%360,vertical=a===90||a===270,w=source.width-inset*2,h=source.height-inset*2,pad=inset?10:0;
   c.width=Math.max(1,(vertical?h:w)+pad*2);c.height=Math.max(1,(vertical?w:h)+pad*2);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.translate(c.width/2,c.height/2);ctx.rotate(-a*Math.PI/180);ctx.drawImage(source,inset,inset,w,h,-w/2,-h/2,w,h);return c;
  }
  async function readFrame(p,box,angle){
   const width=box.right-box.left,height=box.bottom-box.top,scale=Math.min(12,Math.max(3,64/Math.min(width,height))),c=await renderCrop(p,{left:box.left,top:box.top,width,height},scale);
   const input=upright(c,angle,Math.max(2,Math.round(Math.min(c.width,c.height)*.1)));c.width=c.height=0;
   try{const w=await localWorker();guard();const {data}=await w.recognize(input);guard();const code=(data.text||'').trim().replace(/\s+/g,'');return /^\d+$/.test(code)&&data.confidence>=65?{code,confidence:data.confidence}:null;}finally{input.width=input.height=0;}
  }
  async function learn(p,rect,pdfjs,angle){
   const viewport=p.getViewport({scale:1}),rough={left:rect.x*viewport.width,top:rect.y*viewport.height,width:rect.width*viewport.width,height:rect.height*viewport.height},profile={version:1,width:rough.width,height:rough.height,textHeight:Math.min(rough.width,rough.height)*.6,angle};
   if(Math.min(rough.width,rough.height)<2||Math.max(rect.width,rect.height)>.3)throw Error('Markera tätt runt en enda nummerruta, inklusive den svarta ramen.');
   const pad=Math.min(3,Math.min(rough.width,rough.height)*.2),area={left:Math.max(0,rough.left-pad),top:Math.max(0,rough.top-pad),width:rough.width+pad*2,height:rough.height+pad*2},scale=Math.min(10,Math.max(2,70/Math.min(rough.width,rough.height)));
   const [ops,text]=await Promise.all([p.getOperatorList(),p.getTextContent()]);guard();const c=await renderCrop(p,area,scale);
   const raster=core.framesFromPixels(c.getContext('2d').getImageData(0,0,c.width,c.height),profile,scale).map(b=>({left:b.left/scale+area.left,right:b.right/scale+area.left,top:b.top/scale+area.top,bottom:b.bottom/scale+area.top}));c.width=c.height=0;
   const cx=rough.left+rough.width/2,cy=rough.top+rough.height/2;
   const frames=[...core.framesFromOperators(ops,pdfjs.OPS,viewport),...raster].filter(b=>b.left<=cx&&b.right>=cx&&b.top<=cy&&b.bottom>=cy&&core.similarFrame(b,profile)&&Math.abs((b.left+b.right)/2-cx)<rough.width*.3&&Math.abs((b.top+b.bottom)/2-cy)<rough.height*.3);
   frames.sort((a,b)=>Math.abs(Math.log((a.right-a.left)*(a.bottom-a.top)/(rough.width*rough.height)))-Math.abs(Math.log((b.right-b.left)*(b.bottom-b.top)/(rough.width*rough.height))));
   const box=frames[0];if(!box)throw Error('Ingen sluten svart ram hittades i exemplet. Zooma in och markera hela nummerrutan tätt.');
   const hit=core.matchNumbers([box],text,viewport,p.pageNumber)[0];
   profile.width=box.right-box.left;profile.height=box.bottom-box.top;if(hit){profile.textHeight=hit.textHeight*viewport.height;profile.angle=hit.angle;}profile.reading=hit?'text':'image';profile.nativeRotation=p.rotate;
   let code=hit?.code||'';if(!code){try{code=(await readFrame(p,box,profile.angle))?.code||'';}catch(e){guard();/* Manual confirmation is always possible. */}}
   const image=await renderCrop(p,{left:box.left-1,top:box.top-1,width:profile.width+2,height:profile.height+2},Math.min(8,100/Math.min(profile.width,profile.height))),preview=upright(image,profile.angle),previewUrl=preview.toDataURL();image.width=image.height=preview.width=preview.height=0;
   return{...profile,code,preview:previewUrl,page:p.pageNumber,x:(box.left+box.right)/2/viewport.width,y:(box.top+box.bottom)/2/viewport.height};
  }
  async function scanPage(p,pdfjs,profile,progress=()=>{}){
   guard();const viewport=p.getViewport({scale:1}),[ops,text]=await Promise.all([p.getOperatorList(),p.getTextContent()]);guard();
   const vector=core.framesFromOperators(ops,pdfjs.OPS,viewport).filter(b=>core.similarFrame(b,profile)),frames=[...vector];
   const short=Math.min(profile.width,profile.height),desired=Math.min(6,Math.max(2,32/short)),capped=Math.min(desired,Math.sqrt(6000000/(viewport.width*viewport.height))),tiled=short*capped<18,scale=tiled?desired:capped,size=tiled?1400/scale:Math.max(viewport.width,viewport.height)+1,overlap=tiled?Math.min(size*.4,Math.max(profile.width,profile.height)*2+8):0,step=size-overlap;
   const duplicate=(a,b)=>Math.abs(a.left-b.left)<Math.min(a.right-a.left,b.right-b.left)*.18&&Math.abs(a.top-b.top)<Math.min(a.bottom-a.top,b.bottom-b.top)*.18;
   const total=Math.ceil(viewport.width/step)*Math.ceil(viewport.height/step);let tile=0;
   for(let top=0;top<viewport.height;top+=step)for(let left=0;left<viewport.width;left+=step){
    guard();progress('ramar',++tile,total);await next();const area={left,top,width:Math.min(size,viewport.width-left),height:Math.min(size,viewport.height-top)},c=await renderCrop(p,area,scale);
    const found=core.framesFromPixels(c.getContext('2d').getImageData(0,0,c.width,c.height),profile,scale);c.width=c.height=0;
    for(const b of found){const frame={left:b.left/scale+left,top:b.top/scale+top,right:b.right/scale+left,bottom:b.bottom/scale+top};if(!frames.some(f=>duplicate(f,frame)))frames.push(frame);}
   }
   let hits=core.filterByProfile(core.matchNumbers(frames,text,viewport,p.pageNumber),profile,viewport),unread=0,ocr=0,ocrFailed=false;
   const texts=text.items.filter(t=>t.str?.trim()).map(t=>core.textGeometry(t,text.styles||{},viewport)).filter(Boolean);
   // Never convert readable nonnumeric text to digits through OCR.
   const missing=profile.reading==='image'?frames.filter(b=>!texts.some(t=>t.cx>b.left&&t.cx<b.right&&t.cy>b.top&&t.cy<b.bottom)):[];
   for(let i=0;i<missing.length;i++){
    guard();progress('nummer',i+1,missing.length);await next();const box=missing[i],angle=profile.angle+p.rotate-(profile.nativeRotation||0);let read;try{read=await readFrame(p,box,angle);}catch(e){guard();unread+=missing.length-i;ocrFailed=true;break;}guard();
    if(!read){unread++;continue;}
    const hit={code:read.code,page:p.pageNumber,x:(box.left+box.right)/2/viewport.width,y:(box.top+box.bottom)/2/viewport.height,width:(box.right-box.left)/viewport.width,height:(box.bottom-box.top)/viewport.height,textHeight:profile.textHeight/viewport.height,angle,ocr:true};
    if(!hits.some(h=>core.samePosition({page:h.page,x:h.x,y:h.y,detectorBox:h},hit))){hits.push(hit);ocr++;}
   }
   return{hits,unread,ocr,ocrFailed,hasText:!!texts.length,frameCount:frames.length};
  }
  return{learn,scanPage,close};
 }
 window.DetectorVision={createSession};
})();
