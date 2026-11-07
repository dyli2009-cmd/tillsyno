/* Tillsyno v2.4.591 – stämplar i Kontrollflödets ritningsvy utan överbelastning (delas av båda motorerna).
   Samma metod som Acrobat: medan ritningen rör sig visas stämplarna som en enda bild, och de riktiga
   stämplarna byggs inte om. När rörelsen har stannat visas de riktiga stämplarna igen, men bara de som syns.
   - Rörelse: nyp med två fingrar, mushjul, flyttning (scroll) och zoom. Inte när en stämpel eller ritobjekt dras.
   - Under rörelsen: #secMarkers är dolt (som med ögat), och stämplarna i och runt det synliga området ritas i en
     enda bild (canvas) med samma mått som stämplarna och PDF:en (ControlflowStampStyle.metrics/geometry).
     Motorn ritar inte om stämplarna och ändrar inte deras storlek; det görs en gång när rörelsen stannar.
   - Stilla: stämplar utanför det synliga området, med halv marginal, döljs (cfStampOff). Den markerade stämpeln
     döljs aldrig. Stämplarnas data, placering, låsning, export och Kundmall påverkas inte. */
(function(){
 'use strict';
 const PHONE=(()=>{try{return matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<=600}catch(_){return false}})();
 const SETTINGS={
  idle:220,// ms utan rörelse innan de riktiga stämplarna visas igen
  margin:.5,// marginal runt det synliga området, andel av dess bredd och höjd
  budget:PHONE?1500000:3000000// största stämpelbild i pixlar
 };
 // drawWorkspace and resizeWorkspace are wrapped so that the latest stamp data is known and the stamp sizes are not
 // recalculated on every step of a gesture. The shared style object is frozen, so a wrapped copy replaces it.
 let lastWorkspace=null;const views=new Set();
 const Style=window.ControlflowStampStyle;
 if(Style&&!Style.__stampView){
  window.ControlflowStampStyle=Object.freeze({...Style,__stampView:true,
   drawWorkspace(options){lastWorkspace=options||null;return Style.drawWorkspace(options)},
   resizeWorkspace(container,...rest){for(const v of views)if(v.markers===container&&v.moving()){v.resizeSkipped=true;return false}return Style.resizeWorkspace(container,...rest)}
  });
 }
 const percent=value=>{const s=String(value||'');return s.endsWith('%')?parseFloat(s)/100:NaN};
 function create(o){
  const viewer=o.viewer,stage=o.stage,markers=o.markers;
  let moving=false,dirty=false,idleTimer=0,touches=0,image=null;
  const stats={gestures:0,deferred:0,redraws:0,images:0,culled:0,shown:0};
  const view={markers,moving:()=>moving};views.add(view);
  // The visible part of the page with margin, as 0–1 of the page (stage) size.
  function visibleArea(margin){
   const vr=viewer.getBoundingClientRect(),sr=stage.getBoundingClientRect();if(!sr.width||!sr.height||!viewer.clientWidth)return null;
   const left=vr.left+viewer.clientLeft,top=vr.top+viewer.clientTop,w=viewer.clientWidth,h=viewer.clientHeight;
   const x0=(left-w*margin-sr.left)/sr.width,y0=(top-h*margin-sr.top)/sr.height,x1=(left+w*(1+margin)-sr.left)/sr.width,y1=(top+h*(1+margin)-sr.top)/sr.height;
   return {x0:Math.max(0,x0),y0:Math.max(0,y0),x1:Math.min(1,x1),y1:Math.min(1,y1)};
  }
  const inside=(a,x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=a.x0&&x<=a.x1&&y>=a.y0&&y<=a.y1;
  // Still: stamps outside the visible area are left out of the page (display:none), the selected one always stays.
  function cull(){
   if(moving)return;const a=visibleArea(SETTINGS.margin);if(!a)return;
   const keep=new Set(),seen=new Map();
   for(const node of markers.querySelectorAll('.secMarker,.secTarget')){
    const uid=node.dataset.objectUid||node.dataset.securityStampUid||node.dataset.uid;if(!uid)continue;
    if(!seen.has(uid))seen.set(uid,[]);seen.get(uid).push(node);
    if(inside(a,percent(node.style.left),percent(node.style.top))||node.classList.contains('selected')||node.classList.contains('active'))keep.add(uid);
   }
   const selected=o.selected?.();if(selected)keep.add(selected);
   let off=0;
   for(const [uid,nodes] of seen){const hide=!keep.has(uid);if(hide)off++;for(const n of nodes)n.classList.toggle('cfStampOff',hide);}
   for(const node of markers.querySelectorAll('.cfStampGeometry g[data-object-uid],.secConnector[data-uid]')){const uid=node.getAttribute('data-object-uid')||node.getAttribute('data-uid');if(seen.has(uid))node.classList.toggle('cfStampOff',!keep.has(uid));}
   stats.culled=off;stats.shown=seen.size-off;
  }
  // Moving: one picture of the stamps in and around the visible area, drawn from the stamp data.
  function drawImage(){
   const w=lastWorkspace,Shared=window.ControlflowStampStyle;if(!w||!Shared?.metrics||!Shared?.geometry||w.container!==markers)return;
   const items=(w.items||[]).filter(item=>Shared.applies(item,w.mode));if(!items.length)return;
   const a=visibleArea(SETTINGS.margin),width=stage.offsetWidth,height=stage.offsetHeight;if(!a||!width||!height)return;
   const rect={x:a.x0*width,y:a.y0*height,w:(a.x1-a.x0)*width,h:(a.y1-a.y0)*height};if(rect.w<4||rect.h<4)return;
   const ratio=Math.min(Math.min(window.devicePixelRatio||1,2),Math.sqrt(SETTINGS.budget/(rect.w*rect.h)));
   const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(rect.w*ratio));c.height=Math.max(1,Math.ceil(rect.h*ratio));
   const g=c.getContext('2d'),naturalW=w.width/w.scale,naturalH=w.height/w.scale,s=width/naturalW,pointFor=w.pointFor||((x,y)=>({x,y}));
   g.setTransform(ratio*s,0,0,ratio*s,-rect.x*ratio,-rect.y*ratio);
   for(const item of items){
    try{
     const m=Shared.metrics(item,w.labelFor(item),w.mode),rgb=(w.colorFor||(()=>[119,133,142]))(item),color='rgb('+rgb.join(',')+')';
     const anchor=pointFor(item.x,item.y),label=pointFor(item.labelX,item.labelY);
     if(!inside(a,anchor.x,anchor.y)&&!inside(a,label.x,label.y))continue;
     const p=Shared.geometry({x:anchor.x*naturalW,y:anchor.y*naturalH,labelX:label.x*naturalW,labelY:label.y*naturalH},m);
     if(p.visible){g.strokeStyle=color;g.fillStyle=color;g.lineWidth=m.stroke;g.beginPath();g.moveTo(p.start.x,p.start.y);g.lineTo(p.end.x,p.end.y);g.stroke();g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.headA.x,p.headA.y);g.lineTo(p.headB.x,p.headB.y);g.closePath();g.fill();}
     const lx=label.x*naturalW,ly=label.y*naturalH;
     g.fillStyle=color;g.fillRect(lx-m.boxW/2,ly-m.boxH/2,m.boxW,m.boxH);g.strokeStyle='#fff';g.lineWidth=m.border;g.strokeRect(lx-m.boxW/2,ly-m.boxH/2,m.boxW,m.boxH);
     g.fillStyle='#fff';g.font='700 '+m.size+'px Helvetica,Arial,sans-serif';g.textBaseline='alphabetic';g.fillText(m.label,lx-m.textWidth/2,ly+m.size/3,m.textWidth);
    }catch(_){}
   }
   Object.assign(c.style,{position:'absolute',left:a.x0*100+'%',top:a.y0*100+'%',width:(a.x1-a.x0)*100+'%',height:(a.y1-a.y0)*100+'%',pointerEvents:'none',zIndex:'2'});
   c.className='cfStampImage';c.setAttribute('aria-hidden','true');
   removeImage();markers.before(c);image=c;stats.images++;
  }
  function removeImage(){if(image){image.width=image.height=0;image.remove();image=null}}
  function start(){
   if(moving||o.blocked?.())return;
   moving=true;stats.gestures++;
   if(!document.body.classList.contains('drawingOverlaysHidden')&&markers.querySelector('.secMarker'))drawImage();
   document.body.classList.add('cfStampsMoving');
  }
  function stop(){
   idleTimer=0;if(!moving)return;
   if(touches>0){idleTimer=setTimeout(stop,SETTINGS.idle);return}// fingers still on the drawing
   moving=false;document.body.classList.remove('cfStampsMoving');
   if(dirty){dirty=false;view.resizeSkipped=false;stats.redraws++;window.drawMarkers?.()}else{if(view.resizeSkipped){view.resizeSkipped=false;try{o.resize?.()}catch(_){}}cull()}
   removeImage();
  }
  function bump(){if(!moving)start();if(!moving)return;clearTimeout(idleTimer);idleTimer=setTimeout(stop,SETTINGS.idle)}
  viewer.addEventListener('wheel',bump,{capture:true,passive:true});
  viewer.addEventListener('scroll',()=>{if(moving||!o.blocked?.())bump()},{passive:true});
  viewer.addEventListener('touchstart',e=>{touches=e.touches.length;if(e.touches.length>=2)bump()},{capture:true,passive:true});
  viewer.addEventListener('touchmove',e=>{touches=e.touches.length;if(e.touches.length>=2||moving)bump()},{capture:true,passive:true});
  for(const type of ['touchend','touchcancel'])viewer.addEventListener(type,e=>{touches=e.touches.length;if(moving){clearTimeout(idleTimer);idleTimer=setTimeout(stop,SETTINGS.idle)}},{capture:true,passive:true});
  if(window.ResizeObserver)new ResizeObserver(()=>{if(moving)bump()}).observe(stage);
  // The engine's drawMarkers (a global function, also when later files replace it) is not run during a gesture:
  // it is run once when the gesture stops. Afterwards the stamps outside the visible area are left out.
  window.addEventListener('load',()=>{
   const full=window.drawMarkers;if(typeof full!=='function'||full.__stampView)return;
   const wrapped=function(...args){if(moving){dirty=true;stats.deferred++;return}const result=full.apply(this,args);try{cull()}catch(_){}return result};
   wrapped.__stampView=true;window.drawMarkers=wrapped;
  });
  return {
   moving:()=>moving,
   cull,stats,settings:SETTINGS,
   // The engine changes page or file: no picture, no gesture state.
   reset(){clearTimeout(idleTimer);idleTimer=0;moving=false;dirty=false;document.body.classList.remove('cfStampsMoving');removeImage()}
  };
 }
 window.ControlflowStampView={create,settings:SETTINGS};
})();
