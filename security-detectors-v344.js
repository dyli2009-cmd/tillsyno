/* Detector symbols use the shared Protocol view, report and work data. */
(()=>{
 'use strict';
 if(!ALL_IN_ONE)return;
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="4"/><circle cx="12" cy="7" r="1"/><path d="M8 12h8l-1 7H9zM9 15h6M12 12v7"/></svg>';
 const labels={untested:'Ej kontrollerad',ok:'Godkänd',action:'Anmärkning',fail:'Ej godkänd'};
 let deleted=null;
 const undoNotice=document.createElement('div');undoNotice.id='detectorDeleteNotice';undoNotice.hidden=true;undoNotice.setAttribute('role','status');
 const undoText=document.createElement('span'),undoDelete=document.createElement('button');undoDelete.id='detectorUndoDelete';undoDelete.type='button';undoDelete.textContent='Ångra';undoNotice.append(undoText,undoDelete);$('securityProtocol').prepend(undoNotice);
 const workSnapshot=()=>JSON.stringify({items,textNotes,drawingExtras,project,logoData});
 function clearDeleted(){deleted=null;undoNotice.hidden=true;}
 function refreshUndo(){if(deleted&&(deleted.scope!==sourceBytes||deleted.state!==workSnapshot()))clearDeleted();}
 undoDelete.onclick=()=>{if(!deleted||deleted.scope!==sourceBytes||deleted.state!==workSnapshot()){clearDeleted();return;}clearDeleted();securitySessionHistory.undo();};
 const oldSave=save;save=function(){const result=oldSave();refreshUndo();return result};
 const oldDelete=$('secDelete').onclick;
 $('secDelete').onclick=()=>{const o=cur();if(o?.type!=='detector')return oldDelete();const name='Detektor '+o.number;securitySessionHistory.endGroup();securitySessionHistory.record();items=items.filter(x=>x.uid!==o.uid);selected=null;save();drawMarkers();showSelected();showOverview();deleted={scope:sourceBytes,state:workSnapshot()};undoText.textContent=name+' borttagen.';undoNotice.hidden=false;};
 const oldDraw=drawMarkers;drawMarkers=function(){oldDraw();const pageItems=items.filter(o=>o.type==='detector'&&o.page===page&&allInOneProtocolActive(o.type)&&(typeof hiddenDrawingProtocols==='undefined'||!hiddenDrawingProtocols.has(o.type)));const targets=[...markers.querySelectorAll('.secTarget')];const all=items.filter(o=>o.page===page&&allInOneProtocolActive(o.type)&&(typeof hiddenDrawingProtocols==='undefined'||!hiddenDrawingProtocols.has(o.type)));pageItems.forEach(o=>{const target=targets[all.findIndex(x=>x.uid===o.uid)];if(!target)return;target.classList.add('detectorIcon');target.innerHTML=icon;target.setAttribute('aria-label',securityDrawingLabel(o));let start=null,moved=false;target.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};moved=false});target.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>4)moved=true});target.addEventListener('click',e=>{e.stopPropagation();if(moved)return;selected=o.uid;showSelected();go('protocol')})})};
 const textBefore=securityStatusText;securityStatusText=function(o){return o.type==='detector'&&!isSecurityRemediated(o)?labels[statusOf(o)]:textBefore(o)};
 window.DetectorProtocol={drawPdfIcon(pg,x,y,color,angle){const {rgb,degrees}=PDFLib,rad=angle*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),point=(a,b)=>({x:x+a*cos-b*sin,y:y+a*sin+b*cos}),origin=point(-5,-8);pg.drawRectangle({...origin,width:10,height:16,color,borderColor:rgb(1,1,1),borderWidth:.8,opacity:.8,borderOpacity:.8,rotate:degrees(angle)});pg.drawCircle({...point(0,4),size:.85,color:rgb(1,1,1),opacity:.8});for(const [a,b,c,d] of [[-3,0,3,0],[-3,0,-2,-5],[3,0,2,-5],[-2,-5,2,-5],[-2.5,-2.5,2.5,-2.5],[0,0,0,-5]])pg.drawLine({start:point(a,b),end:point(c,d),thickness:.65,color:rgb(1,1,1),opacity:.8});}};
})();
