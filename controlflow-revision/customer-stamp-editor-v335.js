/* Customer stamp editing shares the drawing builder and saved item coordinates. */
(()=>{
'use strict';
const dialog=document.getElementById('secPreviewDialog'),wrap=document.getElementById('secPreviewWrap'),canvas=document.getElementById('secPreviewCanvas'),head=dialog?.querySelector('.secPreviewHead');
if(!head||typeof buildSecurityDrawingPdf!=='function')return;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let editing=false,busy=false,selected=null,drag=null,renderSerial=0,pinch=null,wheelTimer=null,pan=null,suppressClickUntil=0;
const toggle=document.createElement('button');toggle.type='button';toggle.id='customerStampEdit';toggle.textContent='Justera stämplar';toggle.setAttribute('aria-pressed','false');toggle.hidden=true;head.querySelector('div').append(toggle);
const tools=document.createElement('div');tools.className='customerStampTools';tools.hidden=true;tools.setAttribute('role','group');tools.setAttribute('aria-label','Justera stämplar');
const label=document.createElement('label');label.textContent='Storlek för ';const target=document.createElement('select');target.id='customerStampTarget';target.setAttribute('aria-label','Ändra storlek för');label.append(target);
const smaller=button('customerStampSmaller','Stämpel −','Mindre stämplar'),larger=button('customerStampLarger','Stämpel +','Större stämplar'),status=button('customerStampSize','','Ange stämpelstorlek i procent'),done=button('customerStampDone','Klart'),exportButton=button('customerStampExport','Spara PDF');status.setAttribute('aria-expanded','false');status.setAttribute('aria-live','polite');
const percent=document.createElement('input');percent.id='customerStampPercent';percent.type='number';percent.inputMode='numeric';percent.min='50';percent.max='300';percent.step='1';percent.required=true;percent.hidden=true;percent.setAttribute('aria-label','Stämpelstorlek i procent, 50 till 300');const applyPercent=button('customerStampApplyPercent','Använd');applyPercent.hidden=true;
const reset=button('customerStampReset','Återställ alla storlekar');
const arrowLabel=document.createElement('label');arrowLabel.textContent='Pillinje ';const arrowWidth=document.createElement('select');arrowWidth.id='customerArrowWidth';arrowWidth.setAttribute('aria-label','Pillinjens tjocklek');[['mixed','Olika tjocklekar'],['1','Normal'],['1.5','Lite tjockare'],['2','Tjock'],['3','Extra tjock']].forEach(([value,text])=>arrowWidth.append(new Option(text,value)));arrowWidth.options[0].disabled=true;arrowLabel.append(arrowWidth);
const hint=document.createElement('small');hint.textContent='Dra etiketten för att flytta den. Pilspetsen ligger kvar. Justeringarna sparas i projektet.';
tools.append(label,smaller,larger,status,percent,applyPercent,reset,arrowLabel,done,exportButton,hint);head.after(tools);
const overlay=document.createElement('div');overlay.className='customerStampOverlay';overlay.hidden=true;wrap.append(overlay);
function button(id,text,aria=text){const b=document.createElement('button');b.type='button';b.id=id;b.textContent=text;b.setAttribute('aria-label',aria);return b;}
function visibleItems(){return items.filter(o=>(!ALL_IN_ONE||allInOneProtocolActive(o.type)));}
function scale(o){return securityCustomerStampScale(o);}
function syncControls(){
 const available=dialog.open&&previewMode==='drawing';toggle.hidden=!available;tools.hidden=!available||!editing;toggle.setAttribute('aria-pressed',String(editing));
 const pageItems=visibleItems().filter(o=>o.page===previewPage);if(selected&&!pageItems.some(o=>o.uid===selected)){selected=null;closePercent();}
 const options=[['all','Alla stämplar'],...pageItems.map(o=>[o.uid,securityDrawingLabel(o)])];const key=JSON.stringify(options);
 if(target.dataset.options!==key){target.replaceChildren(...options.map(([value,text])=>new Option(text,value)));target.dataset.options=key;}
 target.value=selected||'all';const list=selected?pageItems.filter(o=>o.uid===selected):visibleItems();
 const percentages=[...new Set(list.map(o=>Math.round(scale(o)*100)))];status.textContent=percentages.length===1?percentages[0]+'%':percentages.length?'Olika storlekar':'Inga stämplar';
 smaller.disabled=busy||!list.length||list.every(o=>scale(o)<=.5);larger.disabled=busy||!list.length||list.every(o=>scale(o)>=3);const widths=[...new Set(list.map(o=>securityCustomerArrowScale(o)))];arrowWidth.value=widths.length===1?String(widths[0]):'mixed';arrowWidth.disabled=busy||!list.length;
 status.disabled=busy||!list.length;percent.disabled=busy;applyPercent.disabled=busy;reset.disabled=busy||!visibleItems().length;target.disabled=busy;exportButton.disabled=busy||!percent.hidden;done.disabled=busy;
}
function paint(){
 syncControls();wrap.style.cursor=dialog.open&&previewMode==='drawing'?(pan?.moved?'grabbing':'grab'):'';const active=editing&&dialog.open&&previewMode==='drawing';overlay.hidden=!active;
 if(!active){overlay.replaceChildren();return;}
 const c=canvas.getBoundingClientRect(),w=wrap.getBoundingClientRect();overlay.style.left=(c.left-w.left+wrap.scrollLeft)+'px';overlay.style.top=(c.top-w.top+wrap.scrollTop)+'px';overlay.style.width=c.width+'px';overlay.style.height=c.height+'px';overlay.classList.toggle('is-busy',busy);
 overlay.replaceChildren();for(const rect of previewStampRects.filter(r=>r.pageIndex===previewPage-1)){
  const o=items.find(o=>o.uid===rect.uid);if(!o)continue;const handle=document.createElement('button');handle.type='button';handle.className='customerStampHandle';handle.classList.toggle('is-selected',selected===o.uid);handle.dataset.uid=o.uid;handle.setAttribute('aria-label','Flytta stämpel '+securityDrawingLabel(o));handle.setAttribute('aria-pressed',String(selected===o.uid));handle.title='Dra för att flytta '+securityDrawingLabel(o);handle.style.left=rect.x*100+'%';handle.style.top=rect.y*100+'%';handle.style.width=Math.max(24,rect.width*c.width)+'px';handle.style.height=Math.max(24,rect.height*c.height)+'px';
  handle.addEventListener('pointerdown',event=>{
   if(busy||pinch||event.button!==0)return;event.preventDefault();event.stopPropagation();closePercent();selected=o.uid;target.value=o.uid;overlay.querySelectorAll('.customerStampHandle').forEach(h=>{h.classList.toggle('is-selected',h===handle);h.setAttribute('aria-pressed',String(h===handle));});syncControls();drag={id:event.pointerId,o,handle,rect,startX:event.clientX,startY:event.clientY,x:rect.x,y:rect.y,width:c.width,height:c.height,nextX:rect.x,nextY:rect.y};handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove',event=>{
   if(drag?.id!==event.pointerId)return;event.preventDefault();const x=drag.x+(event.clientX-drag.startX)/drag.width,y=drag.y+(event.clientY-drag.startY)/drag.height;
   drag.nextX=bounded(x,drag.rect.width/2);drag.nextY=bounded(y,drag.rect.height/2);handle.style.left=drag.nextX*100+'%';handle.style.top=drag.nextY*100+'%';handle.classList.add('is-dragging');handle.textContent=securityDrawingMarkerLabel(o);
  });
  handle.addEventListener('pointerup',event=>{if(drag?.id!==event.pointerId)return;const d=drag;drag=null;handle.releasePointerCapture(event.pointerId);const point=originalPoint(d.nextX,d.nextY,d.rect.rotation);if(point.x!==o.labelX||point.y!==o.labelY){o.labelX=point.x;o.labelY=point.y;commit();}else paint();});
  handle.addEventListener('pointercancel',()=>{drag=null;paint();});
  handle.addEventListener('keydown',event=>{const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!delta||busy)return;event.preventDefault();selected=o.uid;const step=event.shiftKey?10:1;const point=originalPoint(bounded(rect.x+delta[0]*step/c.width,rect.width/2),bounded(rect.y+delta[1]*step/c.height,rect.height/2),rect.rotation);o.labelX=point.x;o.labelY=point.y;commit();});overlay.append(handle);
 }
}
function originalPoint(x,y,rotation=0){switch(rotation){case 90:return{x:y,y:1-x};case 180:return{x:1-x,y:1-y};case 270:return{x:1-y,y:x};default:return{x,y}}}
function bounded(value,half){const h=Math.min(.49,Math.max(0,half));return clamp(value,h,1-h);}
async function refresh(){
 const serial=++renderSerial;busy=true;syncControls();overlay.classList.add('is-busy');
 try{
  const built=await buildSecurityDrawingPdf(),bytes=await built.out.save(),newDoc=await pdfjsLib.getDocument({data:bytes}).promise;
  if(serial!==renderSerial){await newDoc.destroy();return;}
  const old=previewPdf;previewPdf=newDoc;previewStampRects=built.stampRects;previewOverviewLinks=built.overviewLinks;previewPage=Math.min(previewPage,newDoc.numPages);
  if(dialog.open&&previewMode==='drawing')await renderCustomerPreview();if(old&&old!==newDoc)await old.destroy();
 }catch(error){console.error(error);status.textContent='Kunde inte uppdatera förhandsvisningen.';msg('Justeringen är sparad lokalt, men kundmallen kunde inte uppdateras.',true);}
 finally{if(serial===renderSerial){busy=false;paint();}}
}
function commit(){save();drawMarkers();refresh();}
function resize(factor){if(busy)return;closePercent();const list=selected?visibleItems().filter(o=>o.uid===selected):visibleItems();list.forEach(o=>{o.customerStampScale=Math.round(clamp(scale(o)*factor,.5,3)*10000)/10000;});commit();}
arrowWidth.onchange=()=>{if(busy)return;const value=Number(arrowWidth.value);if(![1,1.5,2,3].includes(value))return;const list=selected?visibleItems().filter(o=>o.uid===selected):visibleItems();list.forEach(o=>{o.customerArrowScale=value;});commit();};
reset.onclick=()=>{if(busy)return;closePercent();visibleItems().forEach(o=>{o.customerStampScale=1.77;});selected=null;commit();};
smaller.onclick=()=>resize(1/1.1);larger.onclick=()=>resize(1.1);target.onchange=()=>{closePercent();selected=target.value==='all'?null:target.value;paint();};
toggle.onclick=()=>{closePercent();editing=!editing;selected=null;paint();};done.onclick=()=>{if(!percent.hidden&&!applyPercentSize())return;editing=false;paint();};exportButton.onclick=()=>{if(busy)return;editing=false;dialog.close();document.getElementById('securityExport').click();};
wrap.addEventListener('pointerdown',event=>{
 if(event.pointerType!=='mouse'||event.button!==0||previewMode!=='drawing'||!dialog.open||busy||event.target.closest('.customerStampHandle'))return;
 pan={id:event.pointerId,x:event.clientX,y:event.clientY,left:wrap.scrollLeft,top:wrap.scrollTop,moved:false};wrap.style.justifyContent='safe center';wrap.setPointerCapture(event.pointerId);event.preventDefault();
});
wrap.addEventListener('pointermove',event=>{
 if(!pan||event.pointerId!==pan.id)return;const dx=event.clientX-pan.x,dy=event.clientY-pan.y;if(!pan.moved&&Math.hypot(dx,dy)<3)return;pan.moved=true;event.preventDefault();wrap.style.cursor='grabbing';wrap.scrollLeft=pan.left-dx;wrap.scrollTop=pan.top-dy;
});
function endPan(event){if(!pan||event.pointerId!==pan.id)return;if(pan.moved)suppressClickUntil=Date.now()+350;pan=null;if(wrap.hasPointerCapture(event.pointerId))wrap.releasePointerCapture(event.pointerId);paint();}
wrap.addEventListener('pointerup',endPan);wrap.addEventListener('pointercancel',endPan);
wrap.addEventListener('click',event=>{if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});

function closePercent(){percent.hidden=true;applyPercent.hidden=true;status.hidden=false;status.setAttribute('aria-expanded','false');}
function applyPercentSize(){if(busy||!percent.reportValidity())return false;const value=percent.valueAsNumber;if(!Number.isFinite(value)||value<50||value>300)return false;const list=selected?visibleItems().filter(o=>o.uid===selected):visibleItems();list.forEach(o=>{o.customerStampScale=value/100;});closePercent();commit();return true;}
status.onclick=()=>{if(busy)return;const list=selected?visibleItems().filter(o=>o.uid===selected):visibleItems(),values=[...new Set(list.map(o=>Math.round(scale(o)*100)))];percent.value=values.length===1?String(values[0]):'';percent.placeholder='Procent';percent.hidden=false;applyPercent.hidden=false;status.hidden=true;status.setAttribute('aria-expanded','true');syncControls();percent.focus();percent.select();};
applyPercent.onclick=applyPercentSize;
percent.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();applyPercentSize();}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closePercent();syncControls();status.focus();}});

const touchDistance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
wrap.addEventListener('touchstart',event=>{
 if(previewMode!=='drawing'||!dialog.open||event.touches.length!==2||busy)return;
 event.preventDefault();drag=null;const rect=canvas.getBoundingClientRect(),bounds=wrap.getBoundingClientRect(),midX=(event.touches[0].clientX+event.touches[1].clientX)/2,midY=(event.touches[0].clientY+event.touches[1].clientY)/2;
 pinch={distance:Math.max(1,touchDistance(event.touches)),zoom:customerPreviewZoom,width:rect.width,height:rect.height,x:(midX-rect.left)/rect.width,y:(midY-rect.top)/rect.height};wrap.style.justifyContent='safe center';paint();
},{passive:false});
wrap.addEventListener('touchmove',event=>{
 if(!pinch||event.touches.length!==2)return;event.preventDefault();
 customerPreviewZoom=clamp(pinch.zoom*touchDistance(event.touches)/pinch.distance,.5,6);const ratio=customerPreviewZoom/pinch.zoom;
 canvas.style.width=pinch.width*ratio+'px';canvas.style.height=pinch.height*ratio+'px';
 const rect=canvas.getBoundingClientRect(),midX=(event.touches[0].clientX+event.touches[1].clientX)/2,midY=(event.touches[0].clientY+event.touches[1].clientY)/2;
 wrap.scrollLeft+=rect.left+pinch.x*rect.width-midX;wrap.scrollTop+=rect.top+pinch.y*rect.height-midY;paint();
},{passive:false});
function endPinch(event){if(!pinch||event.touches.length>=2)return;pinch=null;renderCustomerPreview();}
wrap.title='Zooma med två fingrar eller Ctrl + mushjul (⌘ på Mac). Dra med vänster musknapp för att flytta ritningen.';
wrap.addEventListener('wheel',event=>{
 if(previewMode!=='drawing'||!dialog.open||busy||pinch||(!event.ctrlKey&&!event.metaKey))return;
 event.preventDefault();const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height,previous=customerPreviewZoom,delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?wrap.clientHeight:1);
 customerPreviewZoom=clamp(previous*Math.exp(-delta*.002),.5,6);const ratio=customerPreviewZoom/previous;wrap.style.justifyContent='safe center';canvas.style.width=rect.width*ratio+'px';canvas.style.height=rect.height*ratio+'px';
 const next=canvas.getBoundingClientRect();wrap.scrollLeft+=next.left+x*next.width-event.clientX;wrap.scrollTop+=next.top+y*next.height-event.clientY;paint();clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>renderCustomerPreview(),120);
},{passive:false});
wrap.addEventListener('touchend',endPinch);wrap.addEventListener('touchcancel',endPinch);
const originalRender=renderCustomerPreview;renderCustomerPreview=async function(...args){await originalRender(...args);paint();};
dialog.addEventListener('close',()=>{closePercent();pinch=null;pan=null;clearTimeout(wheelTimer);customerPreviewZoom=1;wrap.style.cursor='';wrap.style.justifyContent='';editing=false;selected=null;drag=null;paint();});window.addEventListener('revision-inline-view',event=>{if(event.detail.id!=='secPreviewDialog'){editing=false;selected=null;drag=null;}paint();});window.addEventListener('resize',()=>requestAnimationFrame(paint));
})();

