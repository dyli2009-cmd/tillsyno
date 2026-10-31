/* Detector scanning in the shared Security Service workspace and work PDF. */
(()=>{
 'use strict';
 const core=window.DetectorScanCore,bar=document.querySelector('.securityTools');
 const controls=document.createElement('section');controls.className='detectorScanTools';controls.id='securityDetectorScanPanel';controls.hidden=true;controls.setAttribute('aria-label','Skanna detektorer');document.body.classList.add('securityDetectorScanApp');
 controls.innerHTML='<div class="detectorPanelHead"><strong>Skanna detektorer</strong><button id="detectorClose" type="button" aria-label="Stäng skanningsverktyget">×</button></div><div class="detectorScanActions"><button id="detectorLearn" type="button" class="primary">1. Markera exempel</button><button id="detectorScan" type="button" class="primary">2. Skanna ritningen</button><button id="detectorSetupToggle" type="button" hidden>Sök fler</button><button id="detectorReview" type="button" hidden>Granska osäkra</button><button id="detectorManual" type="button">Lägg till manuellt</button><button id="detectorCancel" type="button" hidden>Avbryt</button></div><label id="detectorModeLabel" class="detectorModeLabel">Läsning <select id="detectorMode"><option value="careful">Noggrann · långsammare</option><option value="normal">Normal</option></select><span>Bearbetas på din enhet</span></label><form id="detectorManualForm" hidden><label>Nummer<input id="detectorManualCode" inputmode="numeric" pattern="[0-9]+" required placeholder="Exempel: 3 eller 1041" autocomplete="off"></label><button type="submit">Välj position</button></form><form id="detectorSampleForm" hidden><img id="detectorSamplePreview" alt="Markerad nummerruta"><label>Kontrollera numret<input id="detectorSampleCode" inputmode="numeric" pattern="[0-9]+" required autocomplete="off"></label><button type="submit">Använd och koppla</button><button id="detectorReviewNext" type="button" hidden>Nästa</button><button id="detectorReviewIgnore" type="button" hidden>Inte en nummerruta</button></form><section id="detectorSizePanel" hidden aria-label="Storlek på nummerruta"><div class="detectorSizeHeading"><strong id="detectorSizeTitle">Storlek</strong><button id="detectorSizeDone" type="button">Klar</button></div><div class="detectorSizeRow"><label for="detectorWidth">Bredd <output id="detectorWidthValue" for="detectorWidth">100 %</output></label><input id="detectorWidth" type="range" min="25" max="600" step="5" value="100"></div><div class="detectorSizeRow"><label for="detectorHeight">Höjd <output id="detectorHeightValue" for="detectorHeight">100 %</output></label><input id="detectorHeight" type="range" min="25" max="600" step="5" value="100"></div><button id="detectorSizeReset" type="button">Återställ storlek</button></section><p id="detectorSampleInfo" hidden></p><p id="detectorScanStatus" role="status" aria-live="polite">Markera först en nummerruta som exempel. Alla nummer med liknande ram söks sedan upp.</p>';
 bar.after(controls);
 const toolMenu=document.querySelector('.serviceToolsMenu'),toolChoices=toolMenu?.querySelector('.serviceToolChoices'),launcher=document.createElement('button');launcher.type='button';launcher.id='securityDetectorScan';launcher.className='serviceIconButton detectorScanLauncher';launcher.title='Skanna detektorer';launcher.setAttribute('aria-label','Skanna detektorer');launcher.setAttribute('aria-controls',controls.id);launcher.setAttribute('aria-expanded','false');launcher.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><rect x="6" y="8" width="12" height="8"/><path d="M11 10h2v4"/></svg><span>Skanna detektorer</span>';(toolChoices||bar).append(launcher);
 function openTool(){if(!pdf)return msg('Öppna en PDF först.',true);cancel();controls.hidden=false;launcher.setAttribute('aria-expanded','true');if(toolMenu)toolMenu.hidden=true;securityDrawingTools?.stop();go('drawing');updateControls();setStatus(readyMessage());}
 launcher.onclick=openTool;
 $('detectorClose').onclick=()=>{cancel();controls.hidden=true;launcher.setAttribute('aria-expanded','false');};
 function enableDetectors(){const active=window.AllInOneProtocols?.get?.()||[];if(!active.includes('detector'))window.AllInOneProtocols?.set?.([...active,'detector']);hiddenDrawingProtocols.delete('detector');applyDrawingOverlayVisibility(false);}
 const isBox=o=>securityHasDetectorBox(o);
 const findExisting=(list,hit,used)=>core.nearestExisting(list.filter(o=>isBox(o)||core.samePosition(o,hit)),hit,used);
 let run=0,busy=false,moveUid=null,placingCode='',scanDoc=null,cached=new Map(),vision=null,draft=null,selectionLayer=null,setupOpen=false,resizeUid=null,reviewHit=null;
 const scanButton=$('detectorScan'),manualButton=$('detectorManual'),cancelButton=$('detectorCancel'),manualForm=$('detectorManualForm'),codeInput=$('detectorManualCode'),status=$('detectorScanStatus');
 const setupToggle=$('detectorSetupToggle'),learnButton=$('detectorLearn'),sampleForm=$('detectorSampleForm'),sampleCode=$('detectorSampleCode'),sampleInfo=$('detectorSampleInfo');
 const mode=$('detectorMode'),reviewButton=$('detectorReview'),reviewNext=$('detectorReviewNext'),reviewIgnore=$('detectorReviewIgnore');
 const profiles=()=>core.sampleProfiles(project);
 const pending=()=>Array.isArray(project.detectorPending)?project.detectorPending:[];
 const matchesHit=(a,b)=>core.samePosition({page:a.page,x:a.x,y:a.y,detectorBox:a},b);
 const setStatus=text=>{status.textContent=text;};
 const sizePanel=$('detectorSizePanel'),widthInput=$('detectorWidth'),heightInput=$('detectorHeight'),labelMeasure=document.createElement('canvas').getContext('2d');labelMeasure.font='1px Arial';
 function closeSize(){resizeUid=null;sizePanel.hidden=true;securitySessionHistory.endGroup();}
 function syncSizeControls(){
  const o=items.find(o=>o.uid===resizeUid&&o.type==='detector');if(!pdf||!o||o.page!==page){resizeUid=null;sizePanel.hidden=true;return;}
  sizePanel.hidden=false;$('detectorSizeTitle').textContent='Storlek · '+detectorLabel(o);
  for(const [axis,input,out]of [['width',widthInput,$('detectorWidthValue')],['height',heightInput,$('detectorHeightValue')]]){const percent=core.boxScale(boxFor(o),axis,drawingRotation());input.value=percent;out.value=percent+' %';input.setAttribute('aria-valuetext',percent+' procent');}
 }
 async function openSize(o){
  if(!pdf||!isBox(o)||busy)return;const doc=pdf,uid=o.uid;resetPlacement();manualForm.hidden=true;securityDrawingTools?.stop();controls.hidden=false;launcher.setAttribute('aria-expanded','true');selected=uid;resizeUid=uid;go('drawing');enableDetectors();if(page!==o.page){page=o.page;await render(true);if(pdf!==doc||resizeUid!==uid)return;}syncSizeControls();drawMarkers();setStatus('Justera bredd och höjd för '+detectorLabel(o)+'. Tryck Klar när rutan passar.');
 }
 function changeSize(axis,percent,group){
  const o=items.find(o=>o.uid===resizeUid);if(!pdf||busy||!o||o.page!==page||!Number.isFinite(percent))return;
  securitySessionHistory.record();o.detectorBox=core.resizeBox(boxFor(o),axis,percent,drawingRotation());securitySessionHistory.record(group);save();drawMarkers();
 }
 for(const [input,axis]of [[widthInput,'width'],[heightInput,'height']]){input.oninput=()=>changeSize(axis,Number(input.value),input);input.onchange=()=>securitySessionHistory.endGroup();}
 $('detectorSizeDone').onclick=()=>{closeSize();setStatus('Storleken är inställd. Spara PDF för att behålla den i filen.');};
 $('detectorSizeReset').onclick=()=>{const group={};securitySessionHistory.endGroup();changeSize('width',100,group);changeSize('height',100,group);securitySessionHistory.endGroup();};

 const ready=()=>project.detectorSetup?.completed===true||items.some(isBox);
 const readyMessage=()=>{if(!ready())return 'Markera en nummerruta som exempel och skanna ritningen.';const result=project.detectorScanSummary;return items.filter(isBox).length+' detektorer kopplade. '+(result?.unread?result.unread+' ramar behöver kontrolleras. ':'')+(result?.incomplete?'Skanningen avbröts på en eller flera sidor. ':'')+'Välj Sök fler eller lägg till manuellt.';};
 function updateControls(){
  launcher.disabled=!pdf||busy;
  const configured=ready(),showSetup=!configured||setupOpen||busy||!!selectionLayer||!!draft;
  learnButton.hidden=scanButton.hidden=!showSetup;setupToggle.hidden=!configured||busy||!!selectionLayer||!!draft;
  setupToggle.textContent=showSetup?'Stäng skanning':'Sök fler';setupToggle.disabled=!pdf||busy;
  const samples=profiles();learnButton.textContent=samples.length?'Lägg till exempel':'1. Markera exempel';
  learnButton.disabled=!pdf||busy;manualButton.disabled=!pdf||busy;scanButton.disabled=!pdf||busy||!!selectionLayer||!!draft||!samples.length;
  mode.value=project.detectorScanMode==='normal'?'normal':'careful';mode.disabled=busy||!!draft; $('detectorModeLabel').hidden=!showSetup;
  reviewButton.hidden=!pending().length;reviewButton.disabled=busy||!!selectionLayer;reviewButton.textContent='Granska osäkra ('+pending().length+')';
  reviewNext.hidden=reviewIgnore.hidden=!reviewHit;reviewNext.disabled=busy||pending().length<2;reviewIgnore.disabled=busy;reviewIgnore.textContent=reviewHit?.existingCode?'Behåll befintlig koppling':'Inte en nummerruta';
  sampleInfo.hidden=!showSetup||!samples.length;sampleInfo.textContent=sampleInfo.hidden?'':samples.length+' sparade exempel. Alla exemplens ramar används i sökningen. Lägg till en missad ruta om utseendet skiljer sig.';
 }
 mode.onchange=()=>{if(busy)return;project.detectorScanMode=mode.value==='normal'?'normal':'careful';save();};
 setupToggle.onclick=()=>{if(!pdf||busy)return;const open=!setupOpen;resetPlacement();manualForm.hidden=true;setupOpen=open;updateControls();setStatus(open?'Sök fler vid behov. Befintliga kopplingar och kontroller behålls.':readyMessage());};
 function stopSelection(){selectionLayer?.remove();selectionLayer=null;drawingGestureLocked=false;drawingLockScroll=null;}

 function cache(){if(scanDoc!==pdf){scanDoc=pdf;cached=new Map();}return cached;}
 function resetPlacement(){closeSize();stopSelection();draft=null;reviewHit=null;markers.querySelector('.detectorReviewOutline')?.remove();sampleForm.hidden=true;moveUid=null;placingCode='';addType=null;document.body.classList.remove('secAdding');$('secHint').hidden=true;cancelButton.hidden=!busy;updateControls();}
 function cancel(){setupOpen=false;run++;vision?.close();vision=null;busy=false;resetPlacement();manualForm.hidden=true;updateControls();cancelButton.hidden=true;setStatus('Avbrutet. Tidigare detektorer finns kvar.');}
 cancelButton.onclick=cancel;
 function detectorLabel(o){return String(o.id||o.number||'').trim();}
 const labelBefore=securityDrawingLabel;securityDrawingLabel=o=>isBox(o)?detectorLabel(o):labelBefore(o);
 const markerLabelBefore=securityDrawingMarkerLabel;securityDrawingMarkerLabel=o=>isBox(o)?detectorLabel(o):markerLabelBefore(o);
 function boxFor(o){return o.detectorBox||{width:.025,height:.015,textHeight:.01,angle:0,manual:true};}
 function attachHit(o,hit){o.x=hit.x;o.y=hit.y;o.labelX=hit.x;o.labelY=hit.y;o.detectorBox={width:hit.width,height:hit.height,textHeight:hit.textHeight,angle:hit.angle,manual:!!hit.manual};}
 function newDetector(hit){const o=normalize({uid:crypto.randomUUID(),type:'detector',number:nextNumber('detector'),id:hit.code,idMode:'manual',page:hit.page,x:hit.x,y:hit.y,labelX:hit.x,labelY:hit.y,checks:{},status:'untested'});attachHit(o,hit);items.push(o);return o;}
 function applyHits(hits){let added=0,existing=0;const used=new Set();for(const hit of hits){const o=findExisting(items,hit,used);if(o){used.add(o.uid);existing++;}else{const fresh=newDetector(hit);used.add(fresh.uid);added++;}}return{added,existing};}
 const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
 async function learn(rect){
  if(!pdf||busy)return;
  stopSelection();resetPlacement();const doc=pdf,n=page,angle=(360-drawingRotation())%360,token=++run;busy=true;updateControls();cancelButton.hidden=false;setStatus('Läser exemplet…');
  const session=DetectorVision.createSession(()=>{if(token!==run||doc!==pdf)throw Error('Avbrutet');});vision=session;
  try{draft=await session.learn(await doc.getPage(n),rect,pdfjsLib,angle);if(token!==run||doc!==pdf)return;$('detectorSamplePreview').src=draft.preview;sampleCode.value=draft.code;sampleForm.hidden=false;sampleCode.focus();setStatus('Kontrollera numret och tryck Använd och koppla.');}
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
 sampleForm.onsubmit=async e=>{
  e.preventDefault();const code=sampleCode.value.trim();if(!draft||!/^\d+$/.test(code))return;
  const doc=pdf,example=draft,reviewed=reviewHit,profile={...example,code,confirmed:true};
  try{
  const p=await doc.getPage(profile.page);if(pdf!==doc||draft!==example)return;
  const hit=core.confirmedSampleHit(profile,p.getViewport({scale:1}),profile.page);if(!hit)return;
  securitySessionHistory.endGroup();securitySessionHistory.record();enableDetectors();
  const samples=profiles().filter(s=>!core.samePosition({page:s.page,x:s.x,y:s.y},hit));samples.push(profile);project.detectorSamples=samples;project.detectorSample=profile;
  const existing=findExisting(items,hit);if(existing){existing.id=code;existing.idMode='manual';}const result=applyHits([hit]);
  if(reviewed)removePending(reviewed);project.detectorIgnored=(project.detectorIgnored||[]).filter(h=>!matchesHit(h,hit));
  resetPlacement();setupOpen=true;cache().clear();save();drawMarkers();showOverview();cancelButton.hidden=true;updateControls();
  setStatus('Nummerruta '+code+(result.added?' är kopplad. ':' är bekräftad. ')+'Exemplet är sparat tillsammans med tidigare exempel. Spara PDF för att behålla dem.');
  if(reviewed&&pending().length)await openReview();
  }catch(error){if(pdf===doc)setStatus('Kunde inte koppla exemplet. '+(error.message||'Markera igen.'));}
 };
 function removePending(hit){project.detectorPending=pending().filter(h=>!matchesHit(h,hit));if(project.detectorScanSummary)project.detectorScanSummary.unread=Math.max(0,project.detectorScanSummary.unread-1);}
 async function openReview(index=0){
  if(!pdf||busy||!pending().length)return;const list=pending(),hit=list[(index+list.length)%list.length];resetPlacement();manualForm.hidden=true;securityDrawingTools?.stop();
  const doc=pdf,token=++run;busy=true;reviewHit=hit;setupOpen=true;updateControls();cancelButton.hidden=false;go('drawing');setStatus('Förstorar den osäkra nummerrutan…');
  const session=DetectorVision.createSession(()=>{if(token!==run||pdf!==doc)throw Error('Avbrutet');});vision=session;
  try{
   if(page!==hit.page){page=hit.page;await render(true);}if(token!==run||pdf!==doc)return;
   const p=await doc.getPage(hit.page),vp=p.getViewport({scale:1}),preview=await session.preview(p,hit);if(token!==run||pdf!==doc)return;
   draft={version:1,width:hit.width*vp.width,height:hit.height*vp.height,textHeight:hit.textHeight*vp.height,angle:hit.angle,nativeRotation:p.rotate,reading:'image',page:hit.page,x:hit.x,y:hit.y,preview};
   $('detectorSamplePreview').src=preview;sampleCode.value='';sampleForm.hidden=false;drawMarkers();sampleCode.focus();
   setStatus('Sida '+hit.page+' · '+pending().length+' ramar kvar. '+(hit.existingCode?'Befintlig koppling: '+hit.existingCode+'. ':'')+(hit.suggestions?.length?'Läsförslag: '+hit.suggestions.join(' / ')+'. ':'')+'Skriv numret som faktiskt syns. Använd och koppla sparar det som ett extra exempel.');
  }catch(e){if(token===run){resetPlacement();setStatus('Kunde inte visa rutan. '+(e.message||''));}}
  finally{session.close();if(vision===session)vision=null;if(token===run){busy=false;updateControls();cancelButton.hidden=!draft;}}
 }
 reviewButton.onclick=()=>openReview();
 reviewNext.onclick=()=>{const index=pending().indexOf(reviewHit);void openReview(index+1);};
 reviewIgnore.onclick=async()=>{if(!reviewHit||busy)return;securitySessionHistory.record();const hit=reviewHit;project.detectorIgnored=[...(project.detectorIgnored||[]).filter(h=>!matchesHit(h,hit)),hit];removePending(hit);resetPlacement();save();drawMarkers();updateControls();if(pending().length)await openReview();else setStatus('Granskningen är klar. Spara PDF för att behålla dina val.');};
 async function scan(){
  if(!pdf||busy)return;
  enableDetectors();
  if(!profiles().length){startLearning();return;}
  resetPlacement();manualForm.hidden=true;const doc=pdf,token=++run,pageCache=cache(),profile=structuredClone(profiles()),scanMode=project.detectorScanMode==='normal'?'normal':'careful';busy=true;updateControls();cancelButton.hidden=false;
  const hits=[],failed=[],uncertain=[],incompletePages=new Set();let unread=0,ocr=0,ocrFailed=false;
  const session=DetectorVision.createSession(()=>{if(token!==run||pdf!==doc)throw Error('Avbrutet');});vision=session;
  try{
   for(let n=1;n<=doc.numPages;n++){
    if(token!==run||pdf!==doc)return;
    setStatus('Skannar sida '+n+' av '+doc.numPages+'…');await pause();
    try{const p=await doc.getPage(n),result=await session.scanPage(p,pdfjsLib,profile,(phase,current,total)=>setStatus('Sida '+n+' av '+doc.numPages+' · läser '+phase+' '+current+'/'+total+'…'),{mode:scanMode,ignored:project.detectorIgnored||[]});if(token!==run||pdf!==doc)return;pageCache.set(n,result.hits);hits.push(...result.hits);uncertain.push(...(result.pending||[]));unread+=result.unread;ocr+=result.ocr;ocrFailed||=result.ocrFailed;if(result.ocrFailed)incompletePages.add(n);if(n!==page)p.cleanup();}
    catch(error){if(token!==run||pdf!==doc)return;console.warn('Detector scan page '+n,error);failed.push(n);incompletePages.add(n);}
   }
   if(token!==run||pdf!==doc)return;
   securitySessionHistory.endGroup();securitySessionHistory.record();
   const accepted=hits.filter(hit=>{const existing=findExisting(items,hit);if(existing&&String(existing.id)!==hit.code){if(!uncertain.some(h=>matchesHit(h,hit))){uncertain.push({...hit,suggestions:[hit.code],existingCode:String(existing.id)});unread++;}return false;}return true;});
   project.detectorPending=[...uncertain,...pending().filter(h=>incompletePages.has(h.page)&&!accepted.some(q=>matchesHit(q,h)))].filter((h,i,list)=>list.findIndex(q=>matchesHit(q,h))===i);unread=Math.max(unread,project.detectorPending.length);
   const result=applyHits(accepted),scannedAt=new Date().toISOString();project.detectorScanSummary={found:hits.length,added:result.added,existing:result.existing,unread,incomplete:!!failed.length||ocrFailed,scannedAt};project.detectorSetup={version:1,completed:!!hits.length&&!failed.length&&!ocrFailed&&!unread,scannedAt};setupOpen=false;save();drawMarkers();showOverview();
   const notice=[hits.length+' nummerrutor hittade. '+result.added+' tillagda'+(result.existing?', '+result.existing+' redan kopplade':'')+'.'];
   if(hits.length)notice.push('Spara PDF så följer kopplingar och kontrollstatus med nästa gång.');
   if(ocr)notice.push(ocr+' nummer bildlästa. Kontrollera dem mot ritningen.');
   if(ocrFailed)notice.push('Bildläsningen kunde inte slutföras. Kontrollera anslutningen och försök igen.');
   if(unread)notice.push(unread+' ramar behöver kontrolleras. Välj Granska osäkra för att se utsnitten och rätta numren.');
   if(failed.length)notice.push('Kunde inte slutföra sida '+failed.join(', ')+'. Försök igen eller lägg till manuellt.');
   if(!hits.length&&!failed.length)notice.push('Prova ett tydligare exempel eller lägg till manuellt.');
   setStatus(notice.join(' '));
  }catch(error){if(token===run){console.error(error);setStatus('Skanningen kunde inte slutföras. '+(error.message||'Försök igen.'));}}
  finally{session.close();if(vision===session)vision=null;if(token===run){busy=false;updateControls();cancelButton.hidden=true;}}
 }
 scanButton.onclick=scan;
 manualButton.onclick=()=>{if(!pdf||busy)return;enableDetectors();resetPlacement();manualForm.hidden=!manualForm.hidden;if(!manualForm.hidden){codeInput.value='';codeInput.focus();}};
 manualForm.onsubmit=e=>{e.preventDefault();const code=codeInput.value.trim();if(!/^\d+$/.test(code))return;placingCode=code;moveUid=null;addType='detector';document.body.classList.add('secAdding');manualForm.hidden=true;cancelButton.hidden=false;go('drawing');securityDrawingTools?.stop();$('secHint').textContent='Tryck mitt i nummerrutan '+code+'.';$('secHint').hidden=false;setStatus('Välj position för '+code+'.');};
 const createBefore=createItem;
 createItem=function(type,x,y){
  if(type!=='detector'||(!placingCode&&!moveUid))return createBefore(type,x,y);
  const moving=items.find(o=>o.uid===moveUid),code=moving?detectorLabel(moving):placingCode;if(!code)return;
  const candidates=cache().get(page)||[];
  const snapped=candidates.find(h=>h.code===code&&Math.abs(h.x-x)<=h.width*.9&&Math.abs(h.y-y)<=h.height*.9);
  const natural=drawingRotation()%180?{w:pageHeight,h:pageWidth}:{w:pageWidth,h:pageHeight};
  const angle=(360-drawingRotation())%360,vertical=angle%180!==0,unit=12/Math.max(1,natural.h),width=Math.max(18,code.length*7+6)/Math.max(1,natural.w),height=16/Math.max(1,natural.h);
  const hit=snapped||{code,page,x,y,width:vertical?16/Math.max(1,natural.w):width,height:vertical?Math.max(18,code.length*7+6)/Math.max(1,natural.h):height,textHeight:unit,angle,manual:true};
  const existing=findExisting(items.filter(o=>o.uid!==moveUid),hit);
  if(existing){selected=existing.uid;resetPlacement();showSelected();go('protocol');setStatus('Den här positionen är redan kopplad till '+detectorLabel(existing)+'.');return;}
  securitySessionHistory.endGroup();securitySessionHistory.record();
  const o=moving||newDetector(hit);if(moving){const keptBox={...boxFor(o)};o.page=page;attachHit(o,hit);o.detectorBox=keptBox;}
  selected=o.uid;resetPlacement();save();drawMarkers();showSelected();go('drawing');if(!moving)openSize(o);else setStatus(code+' är flyttad. Storleken är behållen.');
 };
 const drawBefore=drawMarkers;
 drawMarkers=function(){
  drawBefore();syncSizeControls();if(drawingOverlaysHidden||hiddenDrawingProtocols.has('detector'))return;
  const rotation=drawingRotation(),sideways=rotation%180!==0,naturalW=sideways?pageHeight:pageWidth,naturalH=sideways?pageWidth:pageHeight;
  for(const o of items.filter(o=>isBox(o)&&o.page===page&&allInOneProtocolActive(o.type))){
   const box=boxFor(o),b=document.createElement('button'),span=document.createElement('span');b.type='button';b.className='detectorNumberBox status-'+statusOf(o)+(o.uid===selected?' isSelected':'');b.dataset.detectorUid=o.uid;b.setAttribute('aria-label','Detektor '+detectorLabel(o)+', sida '+o.page+', '+securityStatusText(o));b.title='Öppna detektor '+detectorLabel(o);b.style.setProperty('--detector-status-color','rgb('+COLORS[statusOf(o)].join(',')+')');span.textContent=detectorLabel(o);
   const width=box.width*naturalW,height=box.height*naturalH;b.style.width=(sideways?height:width)+'px';b.style.height=(sideways?width:height)+'px';b.style.fontSize=core.fitLabelSize(box,naturalW,naturalH,labelMeasure.measureText(detectorLabel(o)).width)+'px';span.style.transform='rotate('+((box.angle+rotation)%360)+'deg)';positionDrawingNode(b,o.x,o.y);b.append(span);
   let pointer=null,moved=false;b.onpointerdown=e=>{if(e.button!==0)return;pointer={x:e.clientX,y:e.clientY};moved=false;};b.onpointermove=e=>{if(pointer&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>6)moved=true;};b.onpointercancel=()=>{pointer=null;moved=true;};
   b.onclick=e=>{e.preventDefault();e.stopPropagation();if(moved||busy||addType||selectionLayer||reviewHit)return;closeSize();selected=o.uid;showSelected();go('protocol');};markers.append(b);
  }
  if(reviewHit&&reviewHit.page===page){const outline=document.createElement('div');outline.className='detectorReviewOutline';outline.style.width=(sideways?reviewHit.height*naturalH:reviewHit.width*naturalW)+'px';outline.style.height=(sideways?reviewHit.width*naturalW:reviewHit.height*naturalH)+'px';positionDrawingNode(outline,reviewHit.x,reviewHit.y);markers.append(outline);}
 };
 const moveButton=document.createElement('button');moveButton.type='button';moveButton.id='detectorMove';moveButton.textContent='Flytta på ritning';$('secDelete').before(moveButton);
 moveButton.onclick=()=>{const o=cur();if(!o||!isBox(o))return;enableDetectors();controls.hidden=false;launcher.setAttribute('aria-expanded','true');resetPlacement();moveUid=o.uid;placingCode=detectorLabel(o);addType='detector';cancelButton.hidden=false;go('drawing');document.body.classList.add('secAdding');$('secHint').textContent='Tryck på den nya positionen för '+placingCode+'.';$('secHint').hidden=false;setStatus('Välj ny position för '+placingCode+'.');};
 const sizeButton=document.createElement('button');sizeButton.type='button';sizeButton.id='detectorSize';sizeButton.textContent='Ändra storlek';moveButton.after(sizeButton);sizeButton.onclick=()=>openSize(cur());
 const selectedBefore=showSelected;
 showSelected=function(){selectedBefore();const o=cur();moveButton.hidden=sizeButton.hidden=!o||!isBox(o);if(!o)return;$('secNumber').closest('label').hidden=isBox(o);if(isBox(o))$('secProtocolTitle').textContent='Detektor '+detectorLabel(o);};
 const buildBefore=buildSecurityDrawingPdf;
 buildSecurityDrawingPdf=async function(snapshot=structuredClone({items,textNotes,drawingExtras,project,logoData,drawingRotations}),bytes=sourceBytes.slice()){
  const result=await buildBefore(snapshot,bytes),{rgb,degrees,StandardFonts}=PDFLib,font=await result.out.embedFont(StandardFonts.Helvetica);
  for(const o of snapshot.items.filter(o=>isBox(o)&&allInOneProtocolActive(o.type))){
   const p=await pdf.getPage(o.page),vp=p.getViewport({scale:1}),pg=result.out.getPage(o.page-1),box=boxFor(o),halfW=box.width*vp.width/2,halfH=box.height*vp.height/2,cx=o.x*vp.width,cy=o.y*vp.height;
   const corners=[[cx-halfW,cy-halfH],[cx+halfW,cy-halfH],[cx+halfW,cy+halfH],[cx-halfW,cy+halfH]].map(([x,y])=>vp.convertToPdfPoint(x,y));
   const xs=corners.map(c=>c[0]),ys=corners.map(c=>c[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,label=detectorLabel(o),size=core.fitLabelSize(box,vp.width,vp.height,font.widthOfTextAtSize(label,1)),angle=p.rotate-box.angle,rad=angle*Math.PI/180,[px,py]=vp.convertToPdfPoint(cx,cy),tw=font.widthOfTextAtSize(label,size),s=statusOf(o),fill=rgb(...COLORS[s].map(c=>c/255));
   pg.drawRectangle({x,y,width:w,height:h,color:fill,borderColor:rgb(0,0,0),borderWidth:.6});
   const tx=-tw/2,ty=-size*.34;pg.drawText(label,{x:px+tx*Math.cos(rad)-ty*Math.sin(rad),y:py+tx*Math.sin(rad)+ty*Math.cos(rad),font,size,color:rgb(1,1,1),rotate:degrees(angle)});
   result.links.push({pageIndex:o.page-1,uid:o.uid,x:px,y:py,width:w,height:h,radius:Math.max(w,h)/2});
  }
  return result;
 };
 const onOpen=$('securityFile').onchange;
 $('securityFile').onchange=async function(e){cancel();controls.hidden=true;launcher.setAttribute('aria-expanded','false');const hadFile=!!e.target.files?.length;await onOpen(e);if(hadFile&&pdf){if(window.AllInOneProtocols)window.AllInOneProtocols.set([...window.AllInOneProtocols.get(),...items.map(o=>o.type)]);cache();setupOpen=false;drawMarkers();showOverview();updateControls();setStatus(readyMessage());}};
 const closeBefore=closeSecurityDrawing;closeSecurityDrawing=async function(...args){cancel();controls.hidden=true;launcher.setAttribute('aria-expanded','false');await closeBefore(...args);updateControls();};if($('secCloseDrawing'))$('secCloseDrawing').onclick=closeSecurityDrawing;
 document.querySelectorAll('.securityTools [data-add]').forEach(b=>{if(b.dataset.add==='detector')b.onclick=()=>{openTool();if(pdf)manualButton.click();};else{const previous=b.onclick;b.onclick=e=>{cancel();controls.hidden=true;launcher.setAttribute('aria-expanded','false');return previous?.call(b,e);};}});
 toolChoices?.querySelectorAll('button').forEach(b=>{if(b!==launcher)b.addEventListener('click',()=>{cancel();controls.hidden=true;launcher.setAttribute('aria-expanded','false');},true);});
 updateControls();
 const syncProjectBefore=syncProjectInputs;syncProjectInputs=function(){syncProjectBefore();updateControls();};
 window.SecurityDetectorScan={open:openTool,scan,learn,startLearning,applyHits,boxFor,attachHit,newDetector,openSize,openReview};
})();
