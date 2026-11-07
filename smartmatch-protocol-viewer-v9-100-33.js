/* Scrollable customer protocols. Rendering stays local and is limited to nearby pages. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SmartMatchProtocolViewer=api})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const clampZoom=value=>Math.max(1,Math.min(4,Number(value)||1));
 const pageSize=(width,height,available,zoom)=>{const scale=Math.max(1,available)/width*clampZoom(zoom);return {width:width*scale,height:height*scale,scale};};
 const pixelRatio=(width,height,dpr)=>Math.min(2,dpr||1,Math.sqrt(2000000/Math.max(1,width*height)));
 function create(wrap,{onError=()=>{}}={}){
  const doc=wrap.ownerDocument,win=doc.defaultView,stack=doc.createElement('div');stack.className='smProtocolPages';wrap.append(stack);
  wrap.classList.add('smProtocolViewport');wrap.tabIndex=0;wrap.setAttribute('role','region');
  wrap.setAttribute('aria-label','Kundprotokoll. Scrolla mellan sidor. Zooma med två fingrar, Ctrl och mushjulet eller tangenterna plus och minus. Noll återställer.');
  let pdf=null,pages=[],zoom=1,session=0,revision=0,queue=Promise.resolve(),timer=0,drag=null,pinch=null,lastWidth=0;
  const cancel=()=>{for(const p of pages)try{p.task?.cancel()}catch(_){}};
  const point=(x,y)=>{
   if(!pages.length)return null;
   const page=pages.find(p=>{const r=p.node.getBoundingClientRect();return y>=r.top&&y<=r.bottom})||pages.reduce((best,p)=>Math.abs(p.node.getBoundingClientRect().top-y)<Math.abs(best.node.getBoundingClientRect().top-y)?p:best);
   const r=page.node.getBoundingClientRect();return {page,x:(x-r.left)/Math.max(1,r.width),y:(y-r.top)/Math.max(1,r.height),clientX:x,clientY:y};
  };
  const center=()=>{const r=wrap.getBoundingClientRect();return point(r.left+wrap.clientWidth/2,r.top+wrap.clientHeight/2)};
  function layout(anchor){
   if(!pdf)return;const available=Math.max(1,wrap.clientWidth-16);lastWidth=wrap.clientWidth;
   let widest=0;
   for(const p of pages){p.size=pageSize(p.width,p.height,available,zoom);p.node.style.width=p.size.width+'px';p.node.style.height=p.size.height+'px';widest=Math.max(widest,p.size.width);}
   stack.style.width=widest+'px';
   if(anchor?.page.node.isConnected){const r=anchor.page.node.getBoundingClientRect();wrap.scrollLeft+=r.left+anchor.x*r.width-anchor.clientX;wrap.scrollTop+=r.top+anchor.y*r.height-anchor.clientY;}
  }
  async function follow(dest){
   const current=pdf,stamp=session;if(!current)return;
   if(typeof dest==='string')dest=await current.getDestination(dest);
   if(current!==pdf||stamp!==session)return;
   if(!Array.isArray(dest)||!dest.length)throw Error('PDF-länken saknar destination.');
   const index=typeof dest[0]==='number'?dest[0]:await current.getPageIndex(dest[0]);
   if(current!==pdf||stamp!==session)return;const target=pages[index];if(!target)throw Error('Sidan finns inte i protokollet.');
   if(dest[1]?.name==='XYZ')zoom=Math.max(zoom,1.5);
   revision++;cancel();layout();
   const host=wrap.getBoundingClientRect(),r=target.node.getBoundingClientRect();
   let x=0,y=0;
   if(dest[1]?.name==='XYZ'&&Number.isFinite(dest[2])&&Number.isFinite(dest[3]))[x,y]=target.page.getViewport({scale:target.size.scale}).convertToViewportPoint(dest[2],dest[3]);
   wrap.scrollTop+=r.top-host.top+y-8;wrap.scrollLeft+=r.left-host.left+x-8;await paint();
  }
  async function renderPage(p,stamp,token){
   if(p.rendered===token)return;
   const size=p.size,vp=p.page.getViewport({scale:size.scale}),ratio=pixelRatio(vp.width,vp.height,win.devicePixelRatio);
   p.canvas.width=Math.max(1,Math.ceil(vp.width*ratio));p.canvas.height=Math.max(1,Math.ceil(vp.height*ratio));
   const ctx=p.canvas.getContext('2d',{alpha:false});ctx.setTransform(1,0,0,1,0,0);p.node.setAttribute('aria-busy','true');
   // PDF.js paints the opaque background before applying its render transform.
   // An already-scaled context leaves black pixels when the pixel budget uses ratio < 1.
   const task=p.page.render({canvasContext:ctx,viewport:vp,transform:[ratio,0,0,ratio,0,0],background:'rgb(255,255,255)'});p.task=task;
   try{await task.promise}catch(error){if(error?.name==='RenderingCancelledException')return;throw error}finally{if(p.task===task)p.task=null;}
   if(stamp!==session||token!==revision)return;p.rendered=token;p.node.setAttribute('aria-busy','false');
   if(!p.linksLoaded){
    const annotations=await p.page.getAnnotations({intent:'display'});if(stamp!==session||token!==revision)return;
    p.links.replaceChildren();
    for(const a of annotations){
     if(!a.dest||!Array.isArray(a.rect))continue;const rect=vp.convertToViewportRectangle(a.rect),x=Math.min(rect[0],rect[2]),y=Math.min(rect[1],rect[3]),w=Math.abs(rect[2]-rect[0]),h=Math.abs(rect[3]-rect[1]);
     if(!Number.isFinite(x+y+w+h)||w<=0||h<=0)continue;
     const b=doc.createElement('button');b.type='button';b.setAttribute('aria-label','Följ länk i protokollet');
     Object.assign(b.style,{left:x/vp.width*100+'%',top:y/vp.height*100+'%',width:w/vp.width*100+'%',height:h/vp.height*100+'%'});
     b.onclick=()=>void follow(a.dest).catch(onError);p.links.append(b);
    }
    p.linksLoaded=true;
   }
  }
  function paint(){
   const stamp=session,token=revision;
   queue=queue.catch(()=>{}).then(async()=>{
    if(!pdf||stamp!==session||token!==revision)return;const r=wrap.getBoundingClientRect();
    for(const p of pages){
     if(stamp!==session||token!==revision)return;const b=p.node.getBoundingClientRect();
     if(b.bottom>=r.top-300&&b.top<=r.bottom+300)await renderPage(p,stamp,token);
     else if(p.canvas.width){p.canvas.width=p.canvas.height=0;p.rendered=-1;}
    }
   });return queue;
  }
  const schedule=()=>{clearTimeout(timer);timer=win.setTimeout(()=>void paint().catch(onError),120);};
  function setZoom(value,anchor=center()){
   const next=clampZoom(value);if(!pdf||next===zoom)return;zoom=next;revision++;cancel();layout(anchor);schedule();
  }
  function close(){
   session++;revision++;clearTimeout(timer);cancel();pdf=null;pinch=null;drag=null;zoom=1;
   for(const p of pages)p.canvas.width=p.canvas.height=0;
   pages=[];stack.replaceChildren();stack.style.width='';wrap.scrollTop=wrap.scrollLeft=0;
  }
  async function open(documentPdf){
   close();pdf=documentPdf;const stamp=session;
   for(let n=1;n<=documentPdf.numPages;n++){
    const page=await documentPdf.getPage(n);if(stamp!==session||pdf!==documentPdf)return;
    const vp=page.getViewport({scale:1}),node=doc.createElement('div'),canvas=doc.createElement('canvas'),links=doc.createElement('div');
    node.className='smProtocolPage';node.setAttribute('role','group');canvas.setAttribute('aria-hidden','true');node.setAttribute('aria-label','Protokollsida '+n+' av '+documentPdf.numPages);
    canvas.width=canvas.height=0;links.className='smProtocolPageLinks';node.append(canvas,links);stack.append(node);
    pages.push({page,node,canvas,links,width:vp.width,height:vp.height,rendered:-1,linksLoaded:false});
   }
   layout();await paint();
  }
  function resize(){if(pdf&&wrap.clientWidth&&wrap.clientWidth!==lastWidth){revision++;cancel();layout(center());schedule();}}
  wrap.addEventListener('scroll',schedule,{passive:true});
  wrap.addEventListener('wheel',e=>{
   if(!pdf||!e.ctrlKey&&!e.metaKey)return;e.preventDefault();e.stopPropagation();
   const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?wrap.clientHeight:1);
   setZoom(zoom*Math.exp(-delta*.004),point(e.clientX,e.clientY));
  },{passive:false});
  const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
  wrap.addEventListener('touchstart',e=>{
   if(!pdf||e.touches.length!==2)return;e.preventDefault();e.stopPropagation();drag=null;
   const x=(e.touches[0].clientX+e.touches[1].clientX)/2,y=(e.touches[0].clientY+e.touches[1].clientY)/2;
   pinch={distance:Math.max(1,distance(e.touches)),zoom,anchor:point(x,y)};
  },{passive:false});
  wrap.addEventListener('touchmove',e=>{
   if(!pinch||e.touches.length!==2)return;e.preventDefault();e.stopPropagation();
   const anchor={...pinch.anchor,clientX:(e.touches[0].clientX+e.touches[1].clientX)/2,clientY:(e.touches[0].clientY+e.touches[1].clientY)/2};
   setZoom(pinch.zoom*distance(e.touches)/pinch.distance,anchor);
  },{passive:false});
  for(const name of ['touchend','touchcancel'])wrap.addEventListener(name,e=>{if(pinch&&e.touches.length<2){pinch=null;schedule();}},{passive:true});
  wrap.addEventListener('pointerdown',e=>{
   if(!pdf||e.pointerType!=='mouse'||e.button!==0||zoom<=1||e.target.closest('button'))return;
   drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:wrap.scrollLeft,top:wrap.scrollTop};wrap.setPointerCapture(e.pointerId);e.preventDefault();
  });
  wrap.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;wrap.scrollLeft=drag.left+drag.x-e.clientX;wrap.scrollTop=drag.top+drag.y-e.clientY;});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])wrap.addEventListener(name,()=>{drag=null;});
  wrap.addEventListener('dblclick',e=>{if(pdf&&!e.target.closest('button')){e.preventDefault();setZoom(zoom>1?1:2,point(e.clientX,e.clientY));}});
  wrap.addEventListener('keydown',e=>{
   if(e.target!==wrap||e.ctrlKey||e.metaKey||!pdf)return;
   if(['+','=','-','0'].includes(e.key)){e.preventDefault();setZoom(e.key==='0'?1:zoom*(e.key==='-'?1/1.2:1.2));}
  });
  if(win.ResizeObserver)new win.ResizeObserver(resize).observe(wrap);
  return {open,close,resize};
 }
 return {create,clampZoom,pageSize,pixelRatio};
});
