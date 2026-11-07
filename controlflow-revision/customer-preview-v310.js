/* Pointer dragging is restricted to the preview title; PDF/navigation stays usable. */
(()=>{
 const head=document.querySelector('#secPreviewDialog .secPreviewHead');let drag=null;
 const host=()=>document.getElementById('revisionInlineWorkspace');
 const bounds=()=>({width:document.documentElement.clientWidth,height:window.innerHeight});
 const clamp=(n,min,max)=>Math.max(min,Math.min(Math.max(min,max),n));
 function fit(center=false){
  const panel=host();if(panel?.dataset.panel!=='secPreviewDialog')return;
  const r=panel.getBoundingClientRect(),v=bounds();
  const x=center?(v.width-r.width)/2:r.left,y=center?(v.height-r.height)/2:r.top;
  panel.style.left=clamp(x,0,v.width-r.width)+'px';panel.style.top=clamp(y,0,v.height-r.height)+'px';
 }
 window.addEventListener('revision-inline-view',e=>{if(e.detail.id==='secPreviewDialog')fit(true);else{const p=host();if(p){p.style.left='';p.style.top='';}}});
 head.addEventListener('pointerdown',e=>{
  if(e.button!==0||drag||e.target.closest('button,input,select,a'))return;
  const panel=host();if(panel?.dataset.panel!=='secPreviewDialog')return;
  const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};head.setPointerCapture(e.pointerId);e.preventDefault();
 });
 head.addEventListener('pointermove',e=>{
  if(drag?.id!==e.pointerId)return;e.preventDefault();const panel=host(),r=panel.getBoundingClientRect(),v=bounds();
  panel.style.left=clamp(drag.left+e.clientX-drag.x,0,v.width-r.width)+'px';panel.style.top=clamp(drag.top+e.clientY-drag.y,0,v.height-r.height)+'px';
 });
 const end=e=>{if(drag?.id===e.pointerId)drag=null;};
 head.addEventListener('pointerup',end);head.addEventListener('pointercancel',end);head.addEventListener('lostpointercapture',end);
 window.addEventListener('resize',()=>fit());
})();
