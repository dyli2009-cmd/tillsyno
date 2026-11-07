/* v2.4.590: Dörrautomatik / Lås – Mall (kundmallen) som en flyttbar ruta. Bara revisionssidan.
   - A− / A+ are removed; the old preview text level is not used (always 100 %).
   - The box can be moved by its title (customer-preview-v310.js) and resized with the handle in the lower right corner.
   - Two fingers and the mouse wheel zoom only the content of the box, also on the protocol pages; the app is not zoomed.
   The customer protocol, the exported PDF and the stamp adjustments are unchanged. */
(()=>{
 'use strict';
 const root=document.documentElement,body=document.body;
 if(root.dataset.cfStampMode!=='revision'||!body||!body.classList.contains('allInOneApp')||body.dataset.revPreview==='590')return;
 body.dataset.revPreview='590';
 const $=id=>document.getElementById(id);
 const host=()=>$('revisionInlineWorkspace');
 const isOpen=()=>host()?.dataset.panel==='secPreviewDialog';
 const wrap=$('secPreviewWrap'),canvas=$('secPreviewCanvas');
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const rerender=()=>{try{if(typeof renderCustomerPreview==='function')renderCustomerPreview()}catch(error){console.error(error)}};
 function resetTextLevel(){try{if(typeof secPreviewTextLevel!=='undefined'&&secPreviewTextLevel!==0)secPreviewTextLevel=0;}catch(_){}}
 resetTextLevel();

 // Resize handle.
 const grip=document.createElement('div');grip.className='revPreviewResize';grip.setAttribute('role','separator');grip.setAttribute('aria-label','Ändra storlek på kundmallen');grip.title='Dra för att ändra storlek';
 grip.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M15 6 6 15M15 11l-4 4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
 let resize=null,renderTimer=0;
 grip.addEventListener('pointerdown',event=>{
  if(event.button!==0||!isOpen())return;const panel=host(),r=panel.getBoundingClientRect();
  resize={id:event.pointerId,x:event.clientX,y:event.clientY,width:r.width,height:r.height,left:r.left,top:r.top};
  grip.setPointerCapture(event.pointerId);event.preventDefault();event.stopPropagation();
 });
 grip.addEventListener('pointermove',event=>{
  if(resize?.id!==event.pointerId)return;event.preventDefault();
  const panel=host(),maxW=document.documentElement.clientWidth-resize.left-4,maxH=innerHeight-resize.top-4;
  panel.style.width=clamp(resize.width+event.clientX-resize.x,280,Math.max(280,maxW))+'px';
  panel.style.height=clamp(resize.height+event.clientY-resize.y,240,Math.max(240,maxH))+'px';
  panel.dataset.revResized='true';
  clearTimeout(renderTimer);renderTimer=setTimeout(rerender,150);
 });
 const endResize=event=>{if(resize?.id!==event.pointerId)return;resize=null;clearTimeout(renderTimer);rerender();};
 grip.addEventListener('pointerup',endResize);grip.addEventListener('pointercancel',endResize);

 // Zoom only inside the box. The drawing pages already zoom in customer-stamp-editor-v335.js;
 // the protocol pages are zoomed here by scaling the rendered page (it is drawn at 2.5× or more).
 let zoom=1,base=null,pinch=null;
 const reportMode=()=>typeof previewMode!=='undefined'&&previewMode!=='drawing';
 function captureBase(){base={width:canvas.getBoundingClientRect().width,height:canvas.getBoundingClientRect().height};zoom=1;}
 function applyZoom(next,focus){
  if(!base)captureBase();
  const before=canvas.getBoundingClientRect(),fx=focus?(focus.x-before.left)/before.width:.5,fy=focus?(focus.y-before.top)/before.height:.5;
  zoom=clamp(next,1,4);canvas.style.width=base.width*zoom+'px';canvas.style.height=base.height*zoom+'px';
  wrap.style.justifyContent=zoom>1?'safe center':'';
  if(focus){const after=canvas.getBoundingClientRect();wrap.scrollLeft+=after.left+fx*after.width-focus.x;wrap.scrollTop+=after.top+fy*after.height-focus.y;}
 }
 if(typeof renderCustomerPreview==='function'){
  const previous=renderCustomerPreview;
  renderCustomerPreview=async function(...args){resetTextLevel();const result=await previous.apply(this,args);base=null;zoom=1;return result;};
 }
 const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 wrap?.addEventListener('touchstart',event=>{
  if(!isOpen()||!reportMode()||event.touches.length!==2)return;event.preventDefault();
  if(!base)captureBase();pinch={distance:Math.max(1,distance(event.touches)),zoom};
 },{passive:false});
 wrap?.addEventListener('touchmove',event=>{
  if(!pinch||event.touches.length!==2)return;event.preventDefault();
  const mid={x:(event.touches[0].clientX+event.touches[1].clientX)/2,y:(event.touches[0].clientY+event.touches[1].clientY)/2};
  applyZoom(pinch.zoom*distance(event.touches)/pinch.distance,mid);
 },{passive:false});
 const endPinch=event=>{if(pinch&&event.touches.length<2)pinch=null;};
 wrap?.addEventListener('touchend',endPinch);wrap?.addEventListener('touchcancel',endPinch);
 wrap?.addEventListener('wheel',event=>{
  if(!isOpen()||!reportMode())return;event.preventDefault();
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?wrap.clientHeight:1);
  applyZoom(zoom*Math.exp(-delta*.002),{x:event.clientX,y:event.clientY});
 },{passive:false});
 // Safari's own page zoom must not start inside the box.
 for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,event=>{if(isOpen()&&host()?.contains(event.target))event.preventDefault();},{passive:false});

 window.addEventListener('revision-inline-view',event=>{
  const panel=host();if(!panel)return;
  if(event.detail?.id==='secPreviewDialog'){resetTextLevel();if(grip.parentNode!==panel)panel.append(grip);}
  else{grip.remove();panel.style.width='';panel.style.height='';delete panel.dataset.revResized;}
 });
 window.RevisionPreviewBox=Object.freeze({zoom:()=>zoom,setZoom:z=>applyZoom(z)});
})();
