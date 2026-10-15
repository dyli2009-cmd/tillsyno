/* Optional first-page service summary. Project state owns placement; PDF owns its visual. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),W=600,H=270,renderDrawing=window.render;
 let panel,controls,resizeGrip,tool,editing=false,drag=null,screenKey='',screenVersion=0;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=(n,f)=>Number.isFinite(n)?n:f;
 function config(value=project.serviceOverview,width=pageWidth,height=pageHeight){
  if(!value?.enabled)return null;
  const w=clamp(finite(value.width,.62),.18,.96),h=clamp(finite(value.height,w*width/Math.max(1,height)*H/W),.04,.9);
  return {enabled:true,page:1,x:clamp(finite(value.x,.04),0,1-w),y:clamp(finite(value.y,.04),0,1-h),width:w,height:h};
 }
 function stats(list=items){
  const objects=list.filter(o=>!ALL_IN_ONE||allInOneProtocolActive(o.type));
  return [
   ['TOTALT',objects.length,[65,88,101]],
   ['KLARA',objects.filter(o=>o.status==='ok'&&!hasSecurityRecordedProblem(o)).length,COLORS.ok],
   ['ÅTGÄRDADE',objects.filter(isSecurityRemediated).length,COLORS.ok],
   ['ANMÄRKNING',objects.filter(o=>statusOf(o)==='action').length,COLORS.action],
   ['EJ GODKÄNDA',objects.filter(o=>statusOf(o)==='fail').length,COLORS.fail],
   ['EJ KONTROLLERAT',objects.filter(o=>statusOf(o)==='untested').length,COLORS.untested]
  ];
 }
 function cardDoc(rows){
  const doc=new jspdf.jsPDF({orientation:'landscape',unit:'pt',format:[W,H],compress:true});
  doc.setFillColor(255,255,255);doc.setDrawColor(160,181,192);doc.setLineWidth(1);doc.roundedRect(.5,.5,W-1,H-1,10,10,'FD');
  doc.setFont('helvetica','bold');doc.setFontSize(20);doc.setTextColor(30,62,79);doc.text('Resultat av service',22,33);
  rows.forEach(([label,count,color],i)=>{
   const x=22+(i%3)*188,y=53+Math.floor(i/3)*67;
   doc.setFillColor(249,251,252);doc.setDrawColor(219,227,232);doc.setLineWidth(.65);doc.roundedRect(x,y,180,59,4,4,'FD');
   doc.setFillColor(...color);doc.roundedRect(x,y,180,2.2,1,1,'F');
   doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(57,73,82);doc.text(label,x+90,y+19,{align:'center'});
   doc.setFont('helvetica','bold');doc.setFontSize(23);doc.setTextColor(...color);doc.text(String(count),x+90,y+45,{align:'center'});
  });
  doc.setFillColor(237,245,250);doc.setDrawColor(204,222,233);doc.roundedRect(22,200,556,50,5,5,'FD');
  doc.setFont('helvetica','normal');doc.setFontSize(12);doc.setTextColor(35,79,106);
  doc.text('Klicka här för att se anmärkningar',35,220);doc.text('och vad som kräver åtgärd.',35,237);
  doc.setDrawColor(51,105,139);doc.setLineWidth(1.6);doc.setLineCap('round');doc.line(542,225,560,225);doc.line(554,219,560,225);doc.line(554,231,560,225);
  return doc;
 }
 async function drawToPdf(out,pdfPage,pageNumber,viewport,snapshot){
  const c=config(snapshot.project.serviceOverview,viewport.width,viewport.height);if(!c||pageNumber!==1)return null;
  const bytes=cardDoc(stats(snapshot.items)).output('arraybuffer'),[embedded]=await out.embedPdf(bytes,[0]);
  const x=c.x*viewport.width,y=c.y*viewport.height,w=c.width*viewport.width,h=c.height*viewport.height;
  const [px,py]=viewport.convertToPdfPoint(x,y+h);
  pdfPage.drawPage(embedded,{x:px,y:py,width:w,height:h,rotate:PDFLib.degrees(pdfPage.getRotation().angle)});
  const points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>viewport.convertToPdfPoint(a,b));
  return {pageIndex:0,normalized:c,rect:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]};
 }
 function action(id,label,fn){const b=document.createElement('button');b.id=id;b.type='button';b.textContent=label;b.onclick=fn;return b;}
 function ensure(){
  if(panel)return;
  panel=document.createElement('div');panel.id='revisionServiceOverview';panel.className='revisionOverviewPanel';panel.tabIndex=0;panel.setAttribute('aria-label','Serviceöversikt. Dra för att flytta.');
  const canvas=document.createElement('canvas');canvas.id='revisionOverviewCanvas';panel.append(canvas);
  resizeGrip=action('revisionOverviewResize','↘',()=>{});resizeGrip.setAttribute('aria-label','Ändra storlek på serviceöversikten');resizeGrip.title='Dra för att ändra storlek';panel.append(resizeGrip);$('secStage').append(panel);
  controls=document.createElement('div');controls.id='revisionOverviewControls';controls.setAttribute('role','toolbar');controls.setAttribute('aria-label','Redigera serviceöversikt');
  controls.append(action('revisionOverviewSmaller','Mindre',()=>scale(.88)),action('revisionOverviewLarger','Större',()=>scale(1.12)),action('revisionOverviewOpen','Visa anmärkningar',()=>{editing=false;render();openCustomerPreview(true)}),action('revisionOverviewRemove','Ta bort',()=>{project.serviceOverview={...config(),enabled:false};editing=false;save();render()}),action('revisionOverviewDone','Klart',()=>{editing=false;render()}));document.body.append(controls);
  panel.addEventListener('pointerdown',beginDrag);panel.addEventListener('pointermove',moveDrag);panel.addEventListener('pointerup',endDrag);panel.addEventListener('pointercancel',cancelDrag);panel.addEventListener('lostpointercapture',cancelDrag);
  panel.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
  panel.addEventListener('keydown',e=>{const c=config();if(!c)return;const delta=e.shiftKey?.02:.005;let moved=true;if(e.key==='ArrowLeft')c.x-=delta;else if(e.key==='ArrowRight')c.x+=delta;else if(e.key==='ArrowUp')c.y-=delta;else if(e.key==='ArrowDown')c.y+=delta;else moved=false;if(moved){e.preventDefault();project.serviceOverview=config(c);save();}else if(e.key==='Enter'){editing=true;render();}});
 }
 function beginDrag(e){
  if(e.button!==0||!pdf||drag||drawingGestureLocked)return;e.preventDefault();e.stopPropagation();editing=true;
  const c=config(),r=$('secStage').getBoundingClientRect();if(!c)return;
  drag={id:e.pointerId,start:c,x:e.clientX,y:e.clientY,w:r.width,h:r.height,resize:e.target===resizeGrip,moved:false,left:viewer.scrollLeft,top:viewer.scrollTop};
  drawingGestureLocked=true;drawingLockScroll={left:drag.left,top:drag.top};panTouch=null;panMouse=null;lastObjectTap=null;
  panel.setPointerCapture(e.pointerId);render();
 }
 function resized(c,factor){
  const maximum=Math.min((.98-c.x)/c.width,(.98-c.y)/c.height),minimum=Math.max(.18/c.width,.04/c.height);
  factor=clamp(factor,Math.min(minimum,maximum),maximum);return config({...c,width:c.width*factor,height:c.height*factor});
 }
 function moveDrag(e){
  if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>2)drag.moved=true;if(!drag.moved)return;
  const c=drag.start;
  if(drag.resize){const w=c.width*drag.w,h=c.height*drag.h;project.serviceOverview=resized(c,1+(dx*w+dy*h)/(w*w+h*h));}
  else project.serviceOverview=config({...c,x:c.x+dx/drag.w,y:c.y+dy/drag.h});
  viewer.scrollLeft=drag.left;viewer.scrollTop=drag.top;position();
 }
 function unlock(){drawingGestureLocked=false;drawingLockScroll=null;suppressPageSwipeUntil=Date.now()+500;}
 function endDrag(e){if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const moved=drag.moved;drag=null;unlock();if(moved)save();render();}
 function cancelDrag(){if(!drag)return;project.serviceOverview=drag.start;drag=null;unlock();render();}
 function scale(factor){const c=config();if(!c)return;project.serviceOverview=resized(c,factor);save();}
 function position(){const c=config();if(!panel||!c)return;Object.assign(panel.style,{left:c.x*100+'%',top:c.y*100+'%',width:c.width*100+'%',height:c.height*100+'%'});}
 async function renderBitmap(rows,key){
  const version=++screenVersion;let documentPdf;
  try{
   documentPdf=await pdfjsLib.getDocument({data:new Uint8Array(cardDoc(rows).output('arraybuffer'))}).promise;
   const p=await documentPdf.getPage(1),viewport=p.getViewport({scale:2}),canvas=document.createElement('canvas');canvas.width=1200;canvas.height=540;
   await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   if(version!==screenVersion)return;
   const target=$('revisionOverviewCanvas');target.width=canvas.width;target.height=canvas.height;target.getContext('2d').drawImage(canvas,0,0);screenKey=key;
  }catch(error){if(version===screenVersion)screenKey='';console.error('Serviceöversikten kunde inte ritas.',error);}finally{if(documentPdf)await documentPdf.destroy();}
 }
 function render(){
  attachTool();ensure();const c=config(),show=!!pdf&&!!c&&page===1&&document.body.dataset.view==='drawing';
  panel.hidden=!show;controls.hidden=!show||!editing;resizeGrip.hidden=!editing;panel.classList.toggle('editing',editing);if(tool)tool.textContent=c?'Ändra serviceöversikt':'Lägg till serviceöversikt';
  if(!show)return;position();const rows=stats(),key=JSON.stringify(rows);panel.setAttribute('aria-label','Serviceöversikt: '+rows.map(r=>r[0]+' '+r[1]).join(', ')+'. Dra för att flytta.');
  if(screenKey!==key){screenKey=key;void renderBitmap(rows,key);}
 }
 async function add(){
  if(!pdf){msg('Öppna en ritning först.',true);return;}
  securityDrawingTools?.stop();addType=null;textMode=false;document.body.classList.remove('secAdding','secTextAdding');$('secAddText').classList.remove('primary');$('secHint').hidden=true;
  if(drawingOverlaysHidden)applyDrawingOverlayVisibility(false);
  page=1;zoom=1;visualZoom=1;go('drawing');await renderDrawing(true);viewer.scrollLeft=0;viewer.scrollTop=0;
  if(!config())project.serviceOverview=config({enabled:true});editing=true;save();render();
 }
 function attachTool(){
  if(tool)return;const menu=document.querySelector('.serviceToolsMenu');if(!menu)return;
  tool=action('revisionOverviewTool','Lägg till serviceöversikt',()=>{menu.hidden=true;void add()});tool.className='revisionOverviewTool';menu.append(tool);
 }
 const originalDrawMarkers=drawMarkers;drawMarkers=function(...args){const result=originalDrawMarkers(...args);render();return result;};
 const originalSave=save;save=function(...args){const result=originalSave(...args);render();return result;};
 // The module's render() is deliberately distinct from the drawing runtime's global render().
 window.RevisionServiceOverview={drawToPdf,stats,config,refresh:render,add};
 window.addEventListener('revision-work-loaded',()=>{editing=false;render();});
 new MutationObserver(render).observe(document.body,{attributes:true,attributeFilter:['data-view']});
 render();
})();
