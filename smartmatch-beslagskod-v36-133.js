/* Additive card profile. Existing first-cell/title readers keep priority. */
(()=>{
 'use strict';
 const base=new URL('./',document.currentScript.src),cache=new WeakMap();
 const profileId='beslagskod-first-cell-v1';
 const clean=value=>String(value||'').normalize('NFC').replace(/[\u00a0\u2007\u202f]/g,' ').replace(/\s+/g,' ').trim();
 const fold=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 // The first cell of this specific A2 door-card layout. Responsibility columns,
 // the right-hand Rumstyp/Littera table, and the footer are never ID sources.
 const roi=Object.freeze({left:.057,top:.0595,right:.150,bottom:.0725});
 let libraryPromise=null,workerPromise=null;
 function matchesTemplate(text,viewport){
  if(!viewport||viewport.width/viewport.height<1.2||viewport.width/viewport.height>1.7)return false;
  if(/\bPLAN\s*RITNING\b/i.test(text?.raw||''))return false;
  const patterns=[/^RUMSTYP$/,/(?:^|\s)LITTERA$/,/(?:^|\s)ANTAL\s*\/\s*HANGNING$/,/(?:^|\s)STOMOPPNINGSMATT$/];
  return patterns.every(pattern=>(text?.items||[]).some(item=>{
   if(!pattern.test(fold(item.text)))return false;
   const [x,y]=viewport.convertToViewportPoint(item.x,item.y);
   return x/viewport.width>.55&&x/viewport.width<.76&&y/viewport.height>.15&&y/viewport.height<.32;
  }));
 }
 function parseHeader(value,normalizeCardLabel){
  const line=clean(value).replace(/^[|\s]+|[|\s]+$/g,'');
  const match=line.match(/^BESLAGSKOD(?:\s*[:;.]\s*|\s+)([A-ZÅÄÖ0-9][A-ZÅÄÖ0-9 _/-]{0,22})$/i);
  if(!match||typeof normalizeCardLabel!=='function')return '';
  const printed=clean(match[1]);
  if(!/^(?:[A-ZÅÄÖ]{2,6}|[A-ZÅÄÖ]{0,5}[ _/-]*\d{1,6}[ _/-]*[A-ZÅÄÖ]{0,4})$/i.test(printed))return '';
  return normalizeCardLabel(printed);
 }
 function nativeHeader(text,viewport){
  const items=(text?.items||[]).map(item=>({item,point:viewport.convertToViewportPoint(item.x,item.y)})).filter(({point:[x,y]})=>x>=roi.left*viewport.width&&x<roi.right*viewport.width&&y>=roi.top*viewport.height&&y<=roi.bottom*viewport.height);
  return items.sort((a,b)=>a.point[0]-b.point[0]).map(({item})=>item.text).join(' ');
 }
 async function library(){
  if(window.Tesseract?.createWorker)return window.Tesseract;
  if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=new URL('vendor/tesseract/tesseract.min.js',base).href;
   script.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(Error('Bildläsningen kunde inte starta.'));
   script.onerror=()=>{script.remove();reject(Error('Bildläsningens lokala filer kunde inte laddas.'));};document.head.append(script);
  }).catch(error=>{libraryPromise=null;throw error;});
  return libraryPromise;
 }
 async function worker(){
  if(!workerPromise)workerPromise=(async()=>{
   const tesseract=await library();
   const w=await tesseract.createWorker('eng',1,{
    workerPath:new URL('vendor/tesseract/worker.min.js',base).href,
    corePath:new URL('vendor/tesseract/tesseract-core-lstm.wasm.js',base).href,
    langPath:new URL('vendor/tesseract/lang/',base).href,
    cachePath:'tillsyno-beslagskod-v1',workerBlobURL:false,gzip:true
   });
   await w.setParameters({tessedit_pageseg_mode:7,preserve_interword_spaces:'1'});return w;
  })().catch(error=>{workerPromise=null;throw error;});
  return workerPromise;
 }
 async function release(){
  const pending=workerPromise;workerPromise=null;if(pending)try{await (await pending).terminate();}catch(_){}
 }
 async function identifyPage(page,text,{normalizeCardLabel,onProgress=()=>{}}={}){
  const viewport=page.getViewport({scale:1});if(!matchesTemplate(text,viewport))return null;
  if(cache.has(page))return cache.get(page);
  const result=(async()=>{
   const native=nativeHeader(text,viewport),direct=parseHeader(native,normalizeCardLabel);
   if(direct)return {code:direct,row:clean(native),area:'known-layout-card-heading',profileId,method:'native-header'};
   const scale=4,vp=page.getViewport({scale}),x=roi.left*vp.width,y=roi.top*vp.height;
   const canvas=document.createElement('canvas');canvas.width=Math.ceil((roi.right-roi.left)*vp.width);canvas.height=Math.ceil((roi.bottom-roi.top)*vp.height);
   try{
    onProgress('Läser dörrkortets Beslagskod…');
    const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    await page.render({canvasContext:ctx,viewport:vp,transform:[1,0,0,1,-x,-y],annotationMode:0}).promise;
    const reader=await worker(),{data}=await reader.recognize(canvas);
    const code=parseHeader(data.text,normalizeCardLabel);
    if(!code||!Number.isFinite(data.confidence)||data.confidence<75)return null;
    return {code,row:clean(data.text),area:'known-layout-card-heading',profileId,method:'local-header-ocr',confidence:data.confidence};
   }catch(error){console.warn('[SmartMatch] Beslagskod kunde inte läsas',error?.message||error);return null;}
   finally{canvas.width=canvas.height=1;}
  })();
  cache.set(page,result);const identity=await result;if(!identity)cache.delete(page);return identity;
 }
 window.addEventListener('pagehide',()=>void release());
 window.SmartMatchBeslagskodProfile=Object.freeze({profileId,matchesTemplate,parseHeader,identifyPage,release});
})();
