/* Screen-sized pinch preview. Never render a PDF or promote the entire stage while pinching. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SmartMatchDrawingView=api})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function badgeScale(width,height){return Math.max(.02,Math.min(1,Number(width)/48,Number(height)/24))}
 function previewRect(stage,viewer,gesture){
  const factor=gesture.targetScale/gesture.startScale;
  return {x:gesture.center.x-viewer.left-gesture.focus.x*stage.width*factor,y:gesture.center.y-viewer.top-gesture.focus.y*stage.height*factor,width:stage.width*factor,height:stage.height*factor};
 }
 function begin({viewer,stage,source,notes,gesture}){
  if(!source.width||!source.height)return null;
  const box=viewer.getBoundingClientRect(),sheet=stage.getBoundingClientRect();
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{alpha:false});
  if(!context)return null;
  const ratio=Math.min(1,Math.sqrt(1000000/Math.max(1,box.width*box.height)));
  canvas.width=Math.max(1,Math.round(box.width*ratio));canvas.height=Math.max(1,Math.round(box.height*ratio));
  canvas.className='smDrawingPinchPreview';canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'fixed',left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px',pointerEvents:'none',zIndex:'40'});
  const background=getComputedStyle(viewer).backgroundColor;
  let active=true,notesImage=null,notesUrl='',current=gesture;
  function paint(next){
   if(!active)return;current=next;
   const r=previewRect(sheet,box,next);
   context.setTransform(ratio,0,0,ratio,0,0);context.fillStyle=background;context.fillRect(0,0,box.width,box.height);
   context.drawImage(source,r.x,r.y,r.width,r.height);
   if(notesImage)context.drawImage(notesImage,r.x,r.y,r.width,r.height);
  }
  paint(gesture);document.body.append(canvas);
  // SVG annotations are a separate bounded image, never a full-size GPU layer.
  if(notes?.childElementCount){
   const svg=notes.cloneNode(true),noteRatio=Math.min(1,Math.sqrt(800000/Math.max(1,sheet.width*sheet.height)));
   svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width',Math.max(1,Math.round(sheet.width*noteRatio)));svg.setAttribute('height',Math.max(1,Math.round(sheet.height*noteRatio)));
   svg.style.width='';svg.style.height='';
   const image=new Image();notesUrl=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
   image.onload=()=>{if(active){notesImage=image;paint(current)}URL.revokeObjectURL(notesUrl);notesUrl=''};
   image.onerror=()=>{URL.revokeObjectURL(notesUrl);notesUrl=''};image.src=notesUrl;
  }
  return {paint,dispose(){active=false;canvas.remove();canvas.width=canvas.height=0;notesImage=null;if(notesUrl)URL.revokeObjectURL(notesUrl);notesUrl=''}};
 }
 return {badgeScale,previewRect,begin};
});
