/* Security detector protocol: same work data, overview and PDF lifecycle. */
(()=>{
 'use strict';
 if(!ALL_IN_ONE)return;
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="4"/><circle cx="12" cy="7" r="1"/><path d="M8 12h8l-1 7H9zM9 15h6M12 12v7"/></svg>';
 const labels={untested:'Ej kontrollerad',ok:'Godkänd',action:'Anmärkning',fail:'Ej godkänd'};
 const nav=document.createElement('button');nav.id='secNavDetectors';nav.innerHTML='<span class="navLabel">Detektorer</span>';
 $('secNavProtocol').after(nav);
 const panel=document.createElement('section');panel.id='securityDetectors';panel.className='view';
 panel.innerHTML='<div class="detectorHead"><div><h2>Detektorer</h2><p>Placera en ikon per detektor på ritningen.</p></div><button id="detectorAdd" type="button">＋ Detektor</button></div><div class="detectorLegend"><span class="untested">Ej kontrollerad</span><span class="ok">Godkänd</span><span class="action">Anmärkning</span><span class="fail">Ej godkänd</span></div><p id="detectorCount"></p><div id="detectorList"></div><div id="detectorEditor" hidden><h3 id="detectorTitle"></h3><div class="detectorFields"><label>Namn / kod<input id="detectorCode" maxlength="100" placeholder="Exempel: IR-101"></label><label>Placering<input id="detectorLocation" maxlength="200"></label><label>Bedömning<select id="detectorStatus"><option value="untested">Ej kontrollerad</option><option value="ok">Godkänd</option><option value="action">Anmärkning</option><option value="fail">Ej godkänd</option></select></label><label class="detectorNote">Anmärkning<textarea id="detectorNote" rows="3" placeholder="Beskriv avvikelsen…"></textarea></label></div><div class="detectorActions"><button id="detectorDrawing" type="button">Visa på ritningen</button><button id="detectorDelete" type="button" class="danger">Ta bort detektor</button></div></div>';
 document.querySelector('main').append(panel);
 $('detectorAdd').innerHTML=icon+'<span>Lägg till detektor</span>';

 let deleted=null;
 const undoNotice=document.createElement('div');undoNotice.id='detectorDeleteNotice';undoNotice.hidden=true;undoNotice.setAttribute('role','status');const undoText=document.createElement('span'),undoDelete=document.createElement('button');undoDelete.id='detectorUndoDelete';undoDelete.type='button';undoDelete.textContent='Ångra';undoNotice.append(undoText,undoDelete);$('detectorList').before(undoNotice);
 const workSnapshot=()=>JSON.stringify({items,textNotes,drawingExtras,project,logoData});
 function clearDeleted(){deleted=null;undoNotice.hidden=true;}
 undoDelete.onclick=()=>{if(!deleted||deleted.scope!==sourceBytes||deleted.state!==workSnapshot()){clearDeleted();return;}clearDeleted();securitySessionHistory.undo();refresh();};

 const detector=()=>cur()?.type==='detector'?cur():null;
 function refresh(){
  if(deleted&&(deleted.scope!==sourceBytes||deleted.state!==workSnapshot()))clearDeleted();
  const enabled=allInOneProtocolActive('detector');nav.hidden=!enabled;
  nav.classList.toggle('active',document.body.dataset.view==='detectors');
  const list=$('detectorList');list.replaceChildren();
  const entries=items.filter(o=>o.type==='detector').sort((a,b)=>a.number-b.number);
  $('detectorCount').textContent=entries.length?entries.length+' detektorer':'Inga detektorer tillagda. Tryck på ＋ Detektor och placera på ritningen.';
  entries.forEach(o=>{const row=document.createElement('button');row.type='button';row.className='detectorRow '+statusOf(o);row.classList.toggle('selected',selected===o.uid);row.innerHTML=icon;const name=document.createElement('strong');name.textContent=securityDrawingLabel(o);const status=document.createElement('span');status.textContent=labels[statusOf(o)];row.append(name,status);row.onclick=()=>{selected=o.uid;showSelected();go('detectors')};list.append(row)});
  $('detectorEditor').hidden=!detector();
 }
 function fillEditor(){const o=detector();if(!o)return;normalize(o);$('detectorTitle').textContent='Detektor '+o.number;const base='Detektor '+o.number;$('detectorCode').value=o.id===base?'':o.id;$('detectorLocation').value=o.location||'';$('detectorStatus').value=statusOf(o);$('detectorNote').value=o.checks['1.1']?.note||o.notes||'';}
 const oldSelected=showSelected;showSelected=function(){if(detector()){fillEditor();refresh();return}oldSelected();refresh()};
 const oldGo=go;go=function(view){if(view==='protocol'&&detector())view='detectors';oldGo(view);nav.classList.toggle('active',view==='detectors');if(view==='detectors'){$('securityOverview')?.close();fillEditor();refresh()}};
 const oldSave=save;save=function(){const result=oldSave();refresh();return result};
 const oldDraw=drawMarkers;drawMarkers=function(){oldDraw();const pageItems=items.filter(o=>o.type==='detector'&&o.page===page&&allInOneProtocolActive(o.type)&&(typeof hiddenDrawingProtocols==='undefined'||!hiddenDrawingProtocols.has(o.type)));const targets=[...markers.querySelectorAll('.secTarget')];const all=items.filter(o=>o.page===page&&allInOneProtocolActive(o.type)&&(typeof hiddenDrawingProtocols==='undefined'||!hiddenDrawingProtocols.has(o.type)));pageItems.forEach(o=>{const target=targets[all.findIndex(x=>x.uid===o.uid)];if(!target)return;target.classList.add('detectorIcon');target.innerHTML=icon;target.setAttribute('aria-label',securityDrawingLabel(o));let start=null,moved=false;target.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};moved=false});target.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>4)moved=true});target.addEventListener('click',e=>{e.stopPropagation();if(moved)return;selected=o.uid;showSelected();go('detectors')})})};
 nav.onclick=()=>{go('detectors')};
 $('detectorAdd').onclick=()=>document.querySelector('[data-add="detector"]').click();
 function changed(){const o=detector();if(!o)return;syncStatus(o);save();drawMarkers();showOverview()}
 $('detectorCode').oninput=()=>{const o=detector();if(!o)return;o.id=$('detectorCode').value.trim()||'Detektor '+o.number;changed()};
 $('detectorLocation').oninput=()=>{const o=detector();if(!o)return;o.location=$('detectorLocation').value;changed()};
 $('detectorNote').oninput=()=>{const o=detector();if(!o)return;o.checks['1.1'].note=$('detectorNote').value;o.notes='';changed()};
 $('detectorStatus').onchange=()=>{const o=detector();if(!o)return;const value=$('detectorStatus').value;o.manualFail=value==='fail';o.checks['1.1'].result=value==='ok'?'ok':['action','fail'].includes(value)?'remark':'';o.remediationDate='';o.remediationSignature='';changed()};
 $('detectorDelete').onclick=()=>{const o=detector();if(!o)return;const name='Detektor '+o.number;securitySessionHistory.endGroup();securitySessionHistory.record();items=items.filter(x=>x.uid!==o.uid);selected=null;save();drawMarkers();showSelected();showOverview();deleted={scope:sourceBytes,state:workSnapshot()};undoText.textContent=name+' borttagen.';undoNotice.hidden=false;};
 $('detectorDrawing').onclick=async()=>{const o=detector();if(!o)return;page=o.page;go('drawing');await render();drawMarkers()};
 // Picker/import updates the active protocols independently of work-data saves.
 new MutationObserver(refresh).observe($('allProtocolDialog'),{attributes:true,attributeFilter:['open']});
 const textBefore=securityStatusText;securityStatusText=function(o){return o.type==='detector'&&!isSecurityRemediated(o)?labels[statusOf(o)]:textBefore(o)};
 window.DetectorProtocol={drawPdfIcon(pg,x,y,color,angle){const {rgb,degrees}=PDFLib,rad=angle*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),point=(a,b)=>({x:x+a*cos-b*sin,y:y+a*sin+b*cos}),origin=point(-5,-8);pg.drawRectangle({...origin,width:10,height:16,color,borderColor:rgb(1,1,1),borderWidth:.8,opacity:.8,borderOpacity:.8,rotate:degrees(angle)});pg.drawCircle({...point(0,4),size:.85,color:rgb(1,1,1),opacity:.8});for(const [a,b,c,d] of [[-3,0,3,0],[-3,0,-2,-5],[3,0,2,-5],[-2,-5,2,-5],[-2.5,-2.5,2.5,-2.5],[0,0,0,-5]])pg.drawLine({start:point(a,b),end:point(c,d),thickness:.65,color:rgb(1,1,1),opacity:.8});}};
 refresh();
})();
