/* Detector symbols use the shared Protocol view, report and work data. */
(()=>{
 'use strict';
 if(!ALL_IN_ONE)return;

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
 $('secDelete').onclick=()=>{const o=cur();if(o?.type!=='detector')return oldDelete();const name='Detektor '+(o.detectorBox?o.id:o.number);securitySessionHistory.endGroup();securitySessionHistory.record();items=items.filter(x=>x.uid!==o.uid);selected=null;save();drawMarkers();showSelected();showOverview();deleted={scope:sourceBytes,state:workSnapshot()};undoText.textContent=name+' borttagen.';undoNotice.hidden=false;};
 const oldDraw=drawMarkers;drawMarkers=function(){oldDraw();const pageItems=items.filter(o=>o.type==='detector'&&!(typeof securityHasDetectorBox==='function'&&securityHasDetectorBox(o))&&o.page===page&&allInOneProtocolActive(o.type)&&(typeof hiddenDrawingProtocols==='undefined'||!hiddenDrawingProtocols.has(o.type)));const targets=[...markers.querySelectorAll('.secTarget')];const all=items.filter(o=>!(typeof securityHasDetectorBox==='function'&&securityHasDetectorBox(o))&&o.page===page&&allInOneProtocolActive(o.type)&&(typeof hiddenDrawingProtocols==='undefined'||!hiddenDrawingProtocols.has(o.type)));pageItems.forEach(o=>{const target=targets[all.findIndex(x=>x.uid===o.uid)];if(!target)return;target.classList.add('detectorArrow');target.setAttribute('aria-label',securityDrawingLabel(o));let start=null,moved=false;target.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};moved=false});target.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>4)moved=true});target.addEventListener('click',e=>{e.stopPropagation();if(moved)return;selected=o.uid;showSelected();go('protocol')})})};
 const textBefore=securityStatusText;securityStatusText=function(o){return o.type==='detector'&&!isSecurityRemediated(o)?labels[statusOf(o)]:textBefore(o)};
 // The shared PDF builder already draws the leader and arrowhead. Keep its hook
 // for older consumers without adding the former detector pictogram over the tip.
 window.DetectorProtocol={drawPdfIcon(){}};
})();

