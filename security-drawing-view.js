/* Stable local PDF viewport: geometry is immediate; pixels arrive independently. */
(()=>{
 'use strict';
 const stage=$('secStage'),world=document.createElement('div');world.id='secDrawingWorld';stage.before(world);world.append(stage);
 const style=document.createElement('style');style.textContent='#secViewer{overflow-anchor:none;scroll-behavior:auto;overscroll-behavior:contain}#secDrawingWorld{position:relative;min-width:100%;min-height:100%;overflow-anchor:none}#secStage{position:absolute;margin:0!important;transform:none!important;overflow-anchor:none}#secCanvas{position:absolute;inset:0;max-width:none!important;width:100%;height:100%}.secDrawingDetail{position:absolute;max-width:none!important;pointer-events:none}';document.head.append(style);
 let geometry=null,autoFit=true,layoutToken=0,paintTimer=null,paintResolve=null,detail=null,detailInfo=null,previewScale=0;
 let gesture=null,frozen=[],wheelTimer=null,lastSize=null,resizeFrame=0,clickUntil=0;
 const pointers=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const focusAt=(x,y)=>{const r=viewer.getBoundingClientRect();return{x:x-r.left,y:y-r.top};};
 function anchorAt(focus){const r=stage.getBoundingClientRect(),v=viewer.getBoundingClientRect();return{x:(v.left+focus.x-r.left)/Math.max(1,r.width),y:(v.top+focus.y-r.top)/Math.max(1,r.height)};}
 function clearDetail(){if(detail){detail.remove();detail.width=detail.height=1;}detail=null;detailInfo=null;}
 function invalidate(){clearTimeout(paintTimer);paintTimer=null;renderVersion++;if(renderTask){try{renderTask.cancel();}catch(_){}renderTask=null;}if(paintResolve){paintResolve(false);paintResolve=null;}}
 function freeze(){if(frozen.length)return;for(const node of stage.children){if(node===canvas||node===detail)continue;frozen.push({node,width:pageWidth,height:pageHeight});node.style.width=pageWidth+'px';node.style.height=pageHeight+'px';node.style.transformOrigin='0 0';}}
 function thaw(){for(const {node}of frozen){node.style.width='';node.style.height='';node.style.transform='';node.style.transformOrigin='';}frozen=[];}
 function uiScale(){const scale=Math.max(.52,Math.min(1,Math.sqrt(Math.max(.01,baseScale*zoom))));for(const [key,value]of Object.entries({'drawing-ui-scale':scale,'drawing-line-width':Math.max(.9,2*scale)+'px','drawing-box-stroke':Math.max(.8,1.5*scale)+'px','security-marker-size':30*scale+'px','security-marker-font':Math.max(6.5,10*scale)+'px','security-point-size':Math.max(7,12*scale)+'px','security-note-font':Math.max(7,10*scale)+'px','security-note-max':Math.max(100,180*scale)+'px'}))stage.style.setProperty('--'+key,value);}
 const drawBefore=drawMarkers;
 drawMarkers=function(){if(gesture)return;thaw();uiScale();return drawBefore();};
 function layout(focus,anchor){
  if(!geometry)return;const w=geometry.width*baseScale*zoom,h=geometry.height*baseScale*zoom;
  const outerW=Math.max(viewer.clientWidth,w+48),outerH=Math.max(viewer.clientHeight,h+48),left=(outerW-w)/2,top=(outerH-h)/2;
  pageWidth=w;pageHeight=h;Object.assign(world.style,{width:outerW+'px',height:outerH+'px'});Object.assign(stage.style,{left:left+'px',top:top+'px',width:w+'px',height:h+'px'});canvas.style.width=w+'px';canvas.style.height=h+'px';
  for(const f of frozen)f.node.style.transform='scale('+(w/f.width)+','+(h/f.height)+')';
  if(anchor&&focus){viewer.scrollLeft=left+anchor.x*w-focus.x;viewer.scrollTop=top+anchor.y*h-focus.y;}
  $('secZoom').textContent=Math.round(zoom*100)+'%';$('secPage').textContent='Sida '+page+' / '+pdf.numPages;visualZoom=1;updateDrawingRotationButton();
 }
 function region(margin=0){const rect=stage.getBoundingClientRect(),v=viewer.getBoundingClientRect();const x=clamp(v.left-rect.left-margin,0,pageWidth),y=clamp(v.top-rect.top-margin,0,pageHeight),right=clamp(v.left-rect.left+viewer.clientWidth+margin,0,pageWidth),bottom=clamp(v.top-rect.top+viewer.clientHeight+margin,0,pageHeight);return{x,y,width:right-x,height:bottom-y};}
 function densityScale(w,h,desired,max=4000000){return Math.min(desired,Math.sqrt((max-16384)/Math.max(1,w*h)),4096/Math.max(1,w),4096/Math.max(1,h));}
 async function paint(token){
  const g=geometry,source=pdf,expectedZoom=zoom,scale=baseScale*zoom;let pending=null;
  const current=()=>token===renderVersion&&g===geometry&&source===pdf&&expectedZoom===zoom;
  try{
   if(!g||!current())return false;const p=await source.getPage(g.page);if(!current())return false;
   const density=Math.min(devicePixelRatio||1,2),wanted=scale*density,base=densityScale(g.width,g.height,wanted);
   async function raster(vp,w,h,transform){pending=document.createElement('canvas');pending.width=Math.max(1,Math.ceil(w));pending.height=Math.max(1,Math.ceil(h));const task=p.render({canvasContext:pending.getContext('2d',{alpha:false}),viewport:vp,transform,background:'#fff'});renderTask=task;try{await task.promise;}finally{if(renderTask===task)renderTask=null;}return current();}
   if(previewScale+.00001<base){const vp=p.getViewport({scale:base,rotation:g.rotation});if(!await raster(vp,vp.width,vp.height))return false;canvas.width=pending.width;canvas.height=pending.height;ctx.drawImage(pending,0,0);pending.width=pending.height=1;pending=null;previewScale=base;drawingRaster={document:source,page:g.page,rotation:g.rotation,width:canvas.width,height:canvas.height};}
   if(previewScale+.00001>=wanted){clearDetail();return true;}
   const visible=region(),area=region(160);if(!area.width||!area.height)return true;
   const ratio=densityScale(area.width,area.height,density,2500000);
   if(detailInfo&&detailInfo.zoom===expectedZoom&&detailInfo.ratio>=ratio-.0001&&detailInfo.x<=visible.x&&detailInfo.y<=visible.y&&detailInfo.x+detailInfo.width>=visible.x+visible.width&&detailInfo.y+detailInfo.height>=visible.y+visible.height)return true;
   const left=Math.floor(area.x*ratio),top=Math.floor(area.y*ratio),right=Math.ceil((area.x+area.width)*ratio),bottom=Math.ceil((area.y+area.height)*ratio),vp=p.getViewport({scale:scale*ratio,rotation:g.rotation});
   if(!await raster(vp,right-left,bottom-top,[1,0,0,1,-left,-top]))return false;
   clearDetail();detail=pending;pending=null;detail.className='secDrawingDetail';detail.setAttribute('aria-hidden','true');detailInfo={zoom:expectedZoom,ratio,x:left/ratio,y:top/ratio,width:detail.width/ratio,height:detail.height/ratio};
   Object.assign(detail.style,{left:detailInfo.x/pageWidth*100+'%',top:detailInfo.y/pageHeight*100+'%',width:detailInfo.width/pageWidth*100+'%',height:detailInfo.height/pageHeight*100+'%'});canvas.after(detail);return true;
  }catch(e){if(e.name!=='RenderingCancelledException'&&current())msg('Kunde inte skärpa ritningen. Den senaste bilden visas fortfarande.',true);return false;}
  finally{if(pending)pending.width=pending.height=1;}
 }
 function queuePaint(delay=100){invalidate();const token=renderVersion;renderQueue=new Promise(resolve=>{paintResolve=resolve;paintTimer=setTimeout(async()=>{paintTimer=null;const done=await paint(token);if(token===renderVersion){paintResolve=null;resolve(done);}},delay);});return renderQueue;}
 function cancelPointerDrags(){
  const left=viewer.scrollLeft,top=viewer.scrollTop;
  for(const [id,node]of pointers){try{node.dispatchEvent(new PointerEvent('pointercancel',{pointerId:id,pointerType:'touch',bubbles:true}));if(node.hasPointerCapture?.(id))node.releasePointerCapture(id);}catch(_){}}
  pointers.clear();drawingGestureLocked=false;drawingLockScroll=null;viewer.scrollLeft=left;viewer.scrollTop=top;viewer.classList.remove('arrowDragging');window.ServicePrecisionPointer?.hide();
 }
 function stopGesture(){
  if(!gesture)return;cancelPointerDrags();gesture=null;pinch=null;panTouch=null;viewer.classList.remove('pinching');thaw();drawMarkers();clickUntil=Date.now()+400;suppressPageSwipeUntil=Date.now()+700;
 }
 render=function(fit=false,focus=null,anchor=null){
  if(!pdf)return Promise.resolve(false);const source=pdf,n=page,rotation=drawingRotation(),token=++layoutToken;invalidate();
  const job=(async()=>{const p=await source.getPage(n);if(token!==layoutToken||source!==pdf||n!==page)return false;const angle=(p.rotate+rotation)%360,natural=p.getViewport({scale:1,rotation:angle}),changed=!geometry||geometry.pdf!==source||geometry.page!==n||geometry.rotation!==angle;
   if(changed){stopGesture();geometry={pdf:source,page:n,rotation:angle,width:natural.width,height:natural.height};previewScale=0;canvas.width=canvas.height=1;clearDetail();}
   const f=focus||{x:viewer.clientWidth/2,y:viewer.clientHeight/2},a=anchor||(!changed&&!fit?anchorAt(f):{x:.5,y:.5});
   if(fit){autoFit=true;baseScale=Math.min(1.8,Math.max(.1,Math.min(Math.max(70,viewer.clientWidth-50)/natural.width,Math.max(70,viewer.clientHeight-50)/natural.height)));}
   layout(f,a);drawMarkers();const painted=await queuePaint(0);return painted||source===pdf&&n===page&&geometry?.rotation===angle;
  })().catch(e=>{if(token===layoutToken)msg('Kunde inte visa sidan. '+(e.message||''),true);return false;});renderQueue=job;return job;
 };
 setZoom=function(value,focus={x:viewer.clientWidth/2,y:viewer.clientHeight/2},anchor){
  if(!geometry||geometry.pdf!==pdf||geometry.page!==page)return render(false,focus,anchor);autoFit=false;const at=anchor||anchorAt(focus);zoom=clamp(value,.5,8);layout(focus,at);if(!gesture)drawMarkers();return queuePaint();
 };
 viewer.addEventListener('wheel',e=>{if(!pdf||drawingGestureLocked||e.target.closest('input,select,textarea'))return;e.preventDefault();e.stopImmediatePropagation();clearTimeout(wheelTimer);if(gesture?.kind==='touch')return;if(!gesture){freeze();gesture={kind:'wheel'};}const unit=e.deltaMode===1?16:e.deltaMode===2?viewer.clientHeight:1;setZoom(zoom*Math.exp(-e.deltaY*unit*(e.ctrlKey ? .008 : .002)),focusAt(e.clientX,e.clientY));wheelTimer=setTimeout(()=>{if(gesture?.kind==='wheel'){gesture=null;thaw();drawMarkers();}},140);},{capture:true,passive:false});
 viewer.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')pointers.set(e.pointerId,e.target);if(gesture?.kind==='touch'){e.preventDefault();e.stopImmediatePropagation();}},true);
 for(const type of ['pointermove','pointerup','pointercancel'])viewer.addEventListener(type,e=>{if(gesture?.kind==='touch'&&e.isTrusted){e.preventDefault();e.stopImmediatePropagation();}else if(type!=='pointermove')pointers.delete(e.pointerId);},true);
 viewer.addEventListener('click',e=>{if(gesture?.kind==='touch'||Date.now()<clickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 function beginPinch(touches){const [a,b]=touches,focus=focusAt((a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2);pinch={zoom,dist:Math.max(1,Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY)),anchor:anchorAt(focus)};}
 viewer.addEventListener('touchstart',e=>{
  if(e.touches.length<2||!pdf||stage.querySelector('.detectorSampleLayer'))return;e.preventDefault();e.stopImmediatePropagation();clearTimeout(wheelTimer);if(!gesture){freeze();gesture={kind:'touch'};}else gesture.kind='touch';cancelPointerDrags();drawingGestureLocked=false;drawingLockScroll=null;panMouse=panTouch=null;viewer.classList.remove('arrowDragging');viewer.classList.add('pinching');beginPinch([...e.touches]);
 },{capture:true,passive:false});
 viewer.addEventListener('touchmove',e=>{
  if(gesture?.kind!=='touch')return;e.preventDefault();e.stopImmediatePropagation();
  if(e.touches.length>=2){if(!pinch)beginPinch([...e.touches]);const [a,b]=e.touches,focus=focusAt((a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2);setZoom(pinch.zoom*Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY)/pinch.dist,focus,pinch.anchor);}
  else if(e.touches.length===1&&gesture.pan){const t=e.touches[0],p=gesture.pan;viewer.scrollLeft=p.left-(t.clientX-p.x);viewer.scrollTop=p.top-(t.clientY-p.y);}
 },{capture:true,passive:false});
 const end=e=>{if(gesture?.kind!=='touch')return;e.preventDefault();e.stopImmediatePropagation();if(e.touches.length>=2){beginPinch([...e.touches]);return;}pinch=null;if(e.touches.length){const t=e.touches[0];gesture.pan={x:t.clientX,y:t.clientY,left:viewer.scrollLeft,top:viewer.scrollTop};return;}stopGesture();queuePaint();};
 viewer.addEventListener('touchend',end,{capture:true,passive:false});viewer.addEventListener('touchcancel',end,{capture:true,passive:false});
 viewer.addEventListener('scroll',()=>{if(geometry&&pdf&&geometry.pdf===pdf&&!drawingGestureLocked&&!gesture&&!paintTimer&&!renderTask)queuePaint();},{passive:true});
 // Scrollbar appearance must not be treated as a viewport resize after zoom.
 const observer=new ResizeObserver(()=>{const bounds=viewer.getBoundingClientRect(),size={width:bounds.width,height:bounds.height};if(!size.width||!size.height)return;const previous=lastSize;lastSize=size;if(!geometry||!pdf||gesture||previous&&previous.width===size.width&&previous.height===size.height)return;cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(!pdf||!geometry)return;if(autoFit)render(true);else{const old=previous||size,focus={x:size.width/2,y:size.height/2},a={x:(viewer.scrollLeft+old.width/2-parseFloat(stage.style.left||0))/pageWidth,y:(viewer.scrollTop+old.height/2-parseFloat(stage.style.top||0))/pageHeight};layout(focus,a);drawMarkers();queuePaint();}});});observer.observe(viewer,{box:'border-box'});
 const closeBefore=closeSecurityDrawing;closeSecurityDrawing=async function(...args){invalidate();layoutToken++;stopGesture();clearDetail();geometry=null;previewScale=0;world.style.width=world.style.height='0px';return closeBefore(...args);};if($('secCloseDrawing'))$('secCloseDrawing').onclick=closeSecurityDrawing;
 window.SecurityDrawingView={snapshot:()=>({zoom,width:pageWidth,height:pageHeight,gesture:gesture?.kind||null,detail:!!detail,previewScale}),gestureActive:()=>!!gesture};
})();
