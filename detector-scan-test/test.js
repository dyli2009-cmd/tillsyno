/* Isolated detector TEST. Uses its own storage and work-PDF metadata. */
(()=>{
 'use strict';
 const core=window.DetectorScanCore,bar=document.querySelector('.securityTools');
 const controls=document.createElement('section');controls.className='detectorScanTools';
 controls.innerHTML='<div class="detectorScanActions"><button id="detectorLearn" type="button" class="primary">1. Markera exempel</button><button id="detectorScan" type="button" class="primary">2. Skanna ritningen</button><button id="detectorSetupToggle" type="button" hidden>Sök fler</button><button id="detectorManual" type="button">Lägg till manuellt</button><button id="detectorCancel" type="button" hidden>Avbryt</button></div><form id="detectorManualForm" hidden><label>Nummer<input id="detectorManualCode" inputmode="numeric" pattern="[0-9]+" required placeholder="Exempel: 3 eller 1041" autocomplete="off"></label><button type="submit">Välj position</button></form><form id="detectorSampleForm" hidden><img id="detectorSamplePreview" alt="Markerad nummerruta"><label>Kontrollera numret<input id="detectorSampleCode" inputmode="numeric" pattern="[0-9]+" required autocomplete="off"></label><button type="submit">Använd exempel</button></form><p id="detectorSampleInfo" hidden></p><p id="detectorScanStatus" role="status" aria-live="polite">Markera först en nummerruta som exempel. Alla nummer med liknande ram söks sedan upp.</p>';
 bar.classList.remove('allInOneProtocolTools');bar.append(controls);
 const badge=document.createElement('span');badge.className='detectorTestBadge';badge.textContent='TEST 0.3';document.querySelector('.secAppHeader .headerActions').append(badge);
 let run=0,busy=false,moveUid=null,placingCode='',scanDoc=null,cached=new Map(),vision=null,draft=null,selectionLayer=null,setupOpen=false;
 const scanButton=$('detectorScan'),manualButton=$('detectorManual'),cancelButton=$('detectorCancel'),manualForm=$('detectorManualForm'),codeInput=$('detectorManualCode'),status=$('detectorScanStatus');
 const setupToggle=$('detectorSetupToggle'),learnButton=$('detectorLearn'),sampleForm=$('detectorSampleForm'),sampleCode=$('detectorSampleCode'),sampleInfo=$('detectorSampleInfo');
 const setStatus=text=>{status.textContent=text;};
 const ready=()=>DetectorTestState.isReady(project,items);
 const readyMessage=()=>ready()?'Kopplingar och kontrollstatus är återställda. Ingen ny skanning behövs.':'Ny ritning utan kopplingar. Markera ett exempel och skanna första gången.';
 function updateControls(){
  const configured=ready(),showSetup=!configured||setupOpen||busy||!!selectionLayer||!!draft;
  learnButton.hidden=scanButton.hidden=!showSetup;setupToggle.hidden=!configured||busy||!!selectionLayer||!!draft;
  setupToggle.textContent=showSetup?'Stäng skanning':'Sök fler';setupToggle.disabled=!pdf||busy;
  learnButton.disabled=!pdf||busy;manualButton.disabled=!pdf||busy;scanButton.disabled=!pdf||busy||!!selectionLayer||!!draft||!core.validProfile(project.detectorSample);
  sampleInfo.hidden=!showSetup||!core.validProfile(project.detectorSample);sampleInfo.textContent=sampleInfo.hidden?'':'Inlärt exempel: '+project.detectorSample.code+' · sida '+project.detectorSample.page+'. Sökningen gäller alla nummer med liknande ram.';
 }
 setupToggle.onclick=()=>{if(!pdf||busy)return;const open=!setupOpen;resetPlacement();manualForm.hidden=true;setupOpen=open;updateControls();setStatus(open?'Sök fler vid behov. Befintliga kopplingar och kontroller behålls.':readyMessage());};
 function stopSelection(){selectionLayer?.remove();selectionLayer=null;drawingGestureLocked=false;drawingLockScroll=null;}

 function cache(){if(scanDoc!==pdf){scanDoc=pdf;cached=new Map();}return cached;}
 function resetPlacement(){stopSelection();draft=null;sampleForm.hidden=true;moveUid=null;placingCode='';addType=null;document.body.classList.remove('secAdding');$('secHint').hidden=true;cancelButton.hidden=!busy;updateControls();}
 function cancel(){setupOpen=false;run++;vision?.close();vision=null;busy=false;resetPlacement();manualForm.hidden=true;updateControls();cancelButton.hidden=true;setStatus('Avbrutet. Tidigare detektorer finns kvar.');}
 cancelButton.onclick=cancel;
 function detectorLabel(o){return String(o.id||o.number||'').trim();}
 const labelBefore=securityDrawingLabel;securityDrawingLabel=o=>o.type==='detector'?detectorLabel(o):labelBefore(o);
 const markerLabelBefore=securityDrawingMarkerLabel;securityDrawingMarkerLabel=o=>o.type==='detector'?detectorLabel(o):markerLabelBefore(o);
 function boxFor(o){return o.detectorBox||{width:.025,height:.015,textHeight:.01,angle:0,manual:true};}
 function attachHit(o,hit){o.x=hit.x;o.y=hit.y;o.labelX=hit.x;o.labelY=hit.y;o.detectorBox={width:hit.width,height:hit.height,textHeight:hit.textHeight,angle:hit.angle,manual:!!hit.manual};}
 function newDetector(hit){const o=normalize({uid:crypto.randomUUID(),type:'detector',number:nextNumber('detector'),id:hit.code,idMode:'manual',page:hit.page,x:hit.x,y:hit.y,labelX:hit.x,labelY:hit.y,checks:{},status:'untested'});attachHit(o,hit);items.push(o);return o;}
 function applyHits(hits){let added=0,existing=0;const used=new Set();for(const hit of hits){const o=core.nearestExisting(items,hit,used);if(o){used.add(o.uid);existing++;}else{const fresh=newDetector(hit);used.add(fresh.uid);added++;}}return{added,existing};}
 const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
 async function learn(rect){
  if(!pdf||busy)return;
  stopSelection();resetPlacement();const doc=pdf,n=page,angle=(360-drawingRotation())%360,token=++run;busy=true;updateControls();cancelButton.hidden=false;setStatus('Läser exemplet…');
  const session=DetectorVision.createSession(()=>{if(token!==run||doc!==pdf)throw Error('Avbrutet');});vision=session;
  try{draft=await session.learn(await doc.getPage(n),rect,pdfjsLib,angle);if(token!==run||doc!==pdf)return;$('detectorSamplePreview').src=draft.preview;sampleCode.value=draft.code;sampleForm.hidden=false;sampleCode.focus();setStatus('Kontrollera numret i exemplet och tryck Använd exempel.');}
  catch(e){if(token===run){draft=null;setStatus(e.message||'Exemplet kunde inte läsas. Markera igen.');}}
  finally{session.close();if(vision===session)vision=null;if(token===run){busy=false;updateControls();cancelButton.hidden=!draft;}}
 }
 function startLearning(){
  if(!pdf||busy)return;setupOpen=true;resetPlacement();manualForm.hidden=true;go('drawing');securityDrawingTools?.stop();textMode=false;document.body.classList.remove('secTextAdding');selected=null;drawMarkers();
  const layer=document.createElement('div'),region=document.createElement('div');layer.className='detectorSampleLayer';layer.setAttribute('aria-label','Markera två hörn runt en nummerruta');region.className='detectorSampleRegion';region.hidden=true;layer.append(region);$('secStage').append(layer);selectionLayer=layer;
  const selectionPage=page;let first=null,down=null;
  const local=e=>{const r=markers.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
  const show=(a,b)=>{region.hidden=false;region.style.left=Math.min(a.x,b.x)*100+'%';region.style.top=Math.min(a.y,b.y)*100+'%';region.style.width=Math.abs(a.x-b.x)*100+'%';region.style.height=Math.abs(a.y-b.y)*100+'%';};
  const finish=(a,b)=>{if(page!==selectionPage){cancel();setStatus('Sidan ändrades. Markera exemplet igen på den nya sidan.');return;}const p=originalDrawingPoint(a.x,a.y),q=originalDrawingPoint(b.x,b.y),rect={x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),width:Math.abs(p.x-q.x),height:Math.abs(p.y-q.y)};if(rect.width*pageWidth<3||rect.height*pageHeight<3){first=null;region.hidden=true;setStatus('Markera två olika hörn runt hela nummerrutan.');return;}void learn(rect);};
  layer.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();down={p:local(e),x:e.clientX,y:e.clientY,id:e.pointerId};layer.setPointerCapture(e.pointerId);};
  layer.onpointermove=e=>{e.preventDefault();e.stopPropagation();if(down)show(first||down.p,local(e));};
  layer.onpointerup=e=>{e.preventDefault();e.stopPropagation();if(!down||down.id!==e.pointerId)return;const p=local(e),drag=Math.hypot(e.clientX-down.x,e.clientY-down.y)>6;if(first)finish(first,p);else if(drag)finish(down.p,p);else{first=down.p;show(first,first);setStatus('Tryck på motsatta hörnet, strax utanför den svarta ramen.');}down=null;};
  layer.onpointercancel=e=>{e.stopPropagation();down=null;first=null;region.hidden=true;};
  layer.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});layer.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
  drawingGestureLocked=true;drawingLockScroll={left:viewer.scrollLeft,top:viewer.scrollTop};pinch=null;panTouch=null;panMouse=null;cancelButton.hidden=false;updateControls();setStatus('Dra runt en nummerruta, eller tryck på två motsatta hörn. Ta med hela svarta ramen. Zooma in innan du markerar.');
 }
 learnButton.onclick=startLearning;
 sampleForm.onsubmit=e=>{e.preventDefault();const code=sampleCode.value.trim();if(!draft||!/^\d+$/.test(code))return;securitySessionHistory.endGroup();securitySessionHistory.record();project.detectorSample={...draft,code};draft=null;sampleForm.hidden=true;cache().clear();save();cancelButton.hidden=true;updateControls();setStatus('Exemplet är sparat. Tryck Skanna ritningen för att hitta alla liknande nummerrutor.');};
 async function scan(){
  if(!pdf||busy)return;
  if(!core.validProfile(project.detectorSample)){startLearning();return;}
  resetPlacement();manualForm.hidden=true;const doc=pdf,token=++run,pageCache=cache(),profile=structuredClone(project.detectorSample);busy=true;updateControls();cancelButton.hidden=false;
  const hits=[],failed=[];let unread=0,ocr=0,ocrFailed=false;
  const session=DetectorVision.createSession(()=>{if(token!==run||pdf!==doc)throw Error('Avbrutet');});vision=session;
  try{
   for(let n=1;n<=doc.numPages;n++){
    if(token!==run||pdf!==doc)return;
    setStatus('Skannar sida '+n+' av '+doc.numPages+'…');await pause();
    try{const p=await doc.getPage(n),result=await session.scanPage(p,pdfjsLib,profile,(phase,current,total)=>setStatus('Sida '+n+' av '+doc.numPages+' · läser '+phase+' '+current+'/'+total+'…'));if(token!==run||pdf!==doc)return;pageCache.set(n,result.hits);hits.push(...result.hits);unread+=result.unread;ocr+=result.ocr;ocrFailed||=result.ocrFailed;if(n!==page)p.cleanup();}
    catch(error){if(token!==run||pdf!==doc)return;console.warn('Detector test page '+n,error);failed.push(n);}
   }
   if(token!==run||pdf!==doc)return;
   securitySessionHistory.endGroup();securitySessionHistory.record();
   const result=applyHits(hits);if(hits.length&&!failed.length&&!ocrFailed)project.detectorSetup={version:1,completed:true,scannedAt:new Date().toISOString()};setupOpen=false;save();drawMarkers();showOverview();
   const notice=[hits.length+' nummerrutor hittade. '+result.added+' tillagda'+(result.existing?', '+result.existing+' redan kopplade':'')+'.'];
   if(hits.length)notice.push('Spara PDF så följer kopplingar och kontrollstatus med nästa gång.');
   if(ocr)notice.push(ocr+' nummer bildlästa. Kontrollera dem mot ritningen.');
   if(ocrFailed)notice.push('Bildläsningen kunde inte slutföras. Kontrollera anslutningen och försök igen.');
   if(unread)notice.push(unread+' ramar kunde inte nummerläsas säkert. Lägg till manuellt.');
   if(failed.length)notice.push('Kunde inte slutföra sida '+failed.join(', ')+'. Försök igen eller lägg till manuellt.');
   if(!hits.length&&!failed.length)notice.push('Prova ett tydligare exempel eller lägg till manuellt.');
   setStatus(notice.join(' '));
  }catch(error){if(token===run){console.error(error);setStatus('Skanningen kunde inte slutföras. '+(error.message||'Försök igen.'));}}
  finally{session.close();if(vision===session)vision=null;if(token===run){busy=false;updateControls();cancelButton.hidden=true;}}
 }
 scanButton.onclick=scan;
 manualButton.onclick=()=>{if(!pdf||busy)return;resetPlacement();manualForm.hidden=!manualForm.hidden;if(!manualForm.hidden){codeInput.value='';codeInput.focus();}};
 manualForm.onsubmit=e=>{e.preventDefault();const code=codeInput.value.trim();if(!/^\d+$/.test(code))return;placingCode=code;moveUid=null;addType='detector';document.body.classList.add('secAdding');manualForm.hidden=true;cancelButton.hidden=false;go('drawing');securityDrawingTools?.stop();$('secHint').textContent='Tryck mitt i nummerrutan '+code+'.';$('secHint').hidden=false;setStatus('Välj position för '+code+'.');};
 const createBefore=createItem;
 createItem=function(type,x,y){
  if(type!=='detector')return createBefore(type,x,y);
  const moving=items.find(o=>o.uid===moveUid),code=moving?detectorLabel(moving):placingCode;if(!code)return;
  const candidates=cache().get(page)||[];
  const snapped=candidates.find(h=>h.code===code&&Math.abs(h.x-x)<=h.width*.9&&Math.abs(h.y-y)<=h.height*.9);
  const natural=drawingRotation()%180?{w:pageHeight,h:pageWidth}:{w:pageWidth,h:pageHeight};
  const angle=(360-drawingRotation())%360,vertical=angle%180!==0,unit=12/Math.max(1,natural.h),width=Math.max(18,code.length*7+6)/Math.max(1,natural.w),height=16/Math.max(1,natural.h);
  const hit=snapped||{code,page,x,y,width:vertical?16/Math.max(1,natural.w):width,height:vertical?Math.max(18,code.length*7+6)/Math.max(1,natural.h):height,textHeight:unit,angle,manual:true};
  const existing=core.nearestExisting(items.filter(o=>o.uid!==moveUid),hit);
  if(existing){selected=existing.uid;resetPlacement();showSelected();go('protocol');setStatus('Den här positionen är redan kopplad till '+detectorLabel(existing)+'.');return;}
  securitySessionHistory.endGroup();securitySessionHistory.record();
  const o=moving||newDetector(hit);if(moving){o.page=page;attachHit(o,hit);}
  selected=o.uid;resetPlacement();save();drawMarkers();showSelected();go('drawing');setStatus(code+' är kopplad till sin position på sida '+page+'.');
 };
 const drawBefore=drawMarkers;
 drawMarkers=function(){
  drawBefore();if(drawingOverlaysHidden||hiddenDrawingProtocols.has('detector'))return;
  const rotation=drawingRotation(),sideways=rotation%180!==0,naturalW=sideways?pageHeight:pageWidth,naturalH=sideways?pageWidth:pageHeight;
  for(const o of items.filter(o=>o.type==='detector'&&o.page===page)){
   const box=boxFor(o),b=document.createElement('button'),span=document.createElement('span');b.type='button';b.className='detectorNumberBox status-'+statusOf(o)+(o.uid===selected?' isSelected':'');b.dataset.detectorUid=o.uid;b.setAttribute('aria-label','Detektor '+detectorLabel(o)+', sida '+o.page+', '+securityStatusText(o));b.title='Öppna detektor '+detectorLabel(o);b.style.setProperty('--detector-status-color','rgb('+COLORS[statusOf(o)].join(',')+')');span.textContent=detectorLabel(o);
   const width=box.width*naturalW,height=box.height*naturalH;b.style.width=(sideways?height:width)+'px';b.style.height=(sideways?width:height)+'px';b.style.fontSize=(box.textHeight*naturalH*.9)+'px';span.style.transform='rotate('+((box.angle+rotation)%360)+'deg)';positionDrawingNode(b,o.x,o.y);b.append(span);
   let pointer=null,moved=false;b.onpointerdown=e=>{if(e.button!==0)return;pointer={x:e.clientX,y:e.clientY};moved=false;};b.onpointermove=e=>{if(pointer&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>6)moved=true;};b.onpointercancel=()=>{pointer=null;moved=true;};
   b.onclick=e=>{e.preventDefault();e.stopPropagation();if(moved||busy||addType||selectionLayer)return;selected=o.uid;showSelected();go('protocol');};markers.append(b);
  }
 };
 const moveButton=document.createElement('button');moveButton.type='button';moveButton.id='detectorMove';moveButton.textContent='Flytta på ritning';$('secDelete').before(moveButton);
 moveButton.onclick=()=>{const o=cur();if(o?.type!=='detector')return;resetPlacement();moveUid=o.uid;placingCode=detectorLabel(o);addType='detector';cancelButton.hidden=false;go('drawing');document.body.classList.add('secAdding');$('secHint').textContent='Tryck på den nya positionen för '+placingCode+'.';$('secHint').hidden=false;setStatus('Välj ny position för '+placingCode+'.');};
 const selectedBefore=showSelected;
 showSelected=function(){selectedBefore();const o=cur();if(!o)return;moveButton.hidden=o.type!=='detector';$('secNumber').closest('label').hidden=o.type==='detector';if(o.type==='detector')$('secProtocolTitle').textContent='Detektor '+detectorLabel(o);};
 const buildBefore=buildSecurityDrawingPdf;
 buildSecurityDrawingPdf=async function(snapshot=structuredClone({items,textNotes,drawingExtras,project,logoData,drawingRotations}),bytes=sourceBytes.slice()){
  const result=await buildBefore(snapshot,bytes),{rgb,degrees,StandardFonts}=PDFLib,font=await result.out.embedFont(StandardFonts.Helvetica);
  for(const o of snapshot.items.filter(o=>o.type==='detector')){
   const p=await pdf.getPage(o.page),vp=p.getViewport({scale:1}),pg=result.out.getPage(o.page-1),box=boxFor(o),halfW=box.width*vp.width/2,halfH=box.height*vp.height/2,cx=o.x*vp.width,cy=o.y*vp.height;
   const corners=[[cx-halfW,cy-halfH],[cx+halfW,cy-halfH],[cx+halfW,cy+halfH],[cx-halfW,cy+halfH]].map(([x,y])=>vp.convertToPdfPoint(x,y));
   const xs=corners.map(c=>c[0]),ys=corners.map(c=>c[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,label=detectorLabel(o),size=box.textHeight*vp.height*.9,angle=p.rotate-box.angle,rad=angle*Math.PI/180,[px,py]=vp.convertToPdfPoint(cx,cy),tw=font.widthOfTextAtSize(label,size),s=statusOf(o),fill=rgb(...COLORS[s].map(c=>c/255));
   pg.drawRectangle({x,y,width:w,height:h,color:fill,borderColor:rgb(0,0,0),borderWidth:.6});
   const tx=-tw/2,ty=-size*.34;pg.drawText(label,{x:px+tx*Math.cos(rad)-ty*Math.sin(rad),y:py+tx*Math.sin(rad)+ty*Math.cos(rad),font,size,color:rgb(1,1,1),rotate:degrees(angle)});
   result.links.push({pageIndex:o.page-1,uid:o.uid,x:px,y:py,radius:Math.max(w,h)/2});
  }
  return result;
 };
 const onOpen=$('securityFile').onchange;
 $('securityFile').onchange=async function(e){cancel();const hadFile=!!e.target.files?.length;await onOpen(e);if(hadFile&&pdf){cache();setupOpen=false;updateControls();setStatus(readyMessage());msg('');}};
 const closeBefore=closeSecurityDrawing;closeSecurityDrawing=async function(...args){cancel();await closeBefore(...args);updateControls();};$('secCloseDrawing').onclick=closeSecurityDrawing;
 document.querySelectorAll('.securityTools [data-add]').forEach(b=>{b.hidden=true;});
 updateControls();
 const syncProjectBefore=syncProjectInputs;syncProjectInputs=function(){syncProjectBefore();updateControls();};
 window.DetectorTest={scan,learn,startLearning,applyHits,boxFor,attachHit,newDetector};
})();
