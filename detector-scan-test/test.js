/* Isolated detector TEST. Uses its own storage and work-PDF metadata. */
(()=>{
 'use strict';
 const core=window.DetectorScanCore,bar=document.querySelector('.securityTools');
 const controls=document.createElement('section');controls.className='detectorScanTools';
 controls.innerHTML='<div class="detectorScanActions"><button id="detectorScan" type="button" class="primary">Skanna detektorer</button><button id="detectorManual" type="button">Lägg till manuellt</button><button id="detectorCancel" type="button" hidden>Avbryt</button></div><form id="detectorManualForm" hidden><label>Nummer<input id="detectorManualCode" inputmode="numeric" pattern="[0-9]+" required placeholder="Exempel: 3 eller 1041" autocomplete="off"></label><button type="submit">Välj position</button></form><p id="detectorScanStatus" role="status" aria-live="polite">Varje nummerruta får en egen position och kontroll.</p>';
 bar.classList.remove('allInOneProtocolTools');bar.append(controls);
 const badge=document.createElement('span');badge.className='detectorTestBadge';badge.textContent='TEST 0.1';document.querySelector('.secAppHeader .headerActions').append(badge);
 let run=0,busy=false,moveUid=null,placingCode='',scanDoc=null,cached=new Map();
 const scanButton=$('detectorScan'),manualButton=$('detectorManual'),cancelButton=$('detectorCancel'),manualForm=$('detectorManualForm'),codeInput=$('detectorManualCode'),status=$('detectorScanStatus');
 const setStatus=text=>{status.textContent=text;};
 function cache(){if(scanDoc!==pdf){scanDoc=pdf;cached=new Map();}return cached;}
 function resetPlacement(){moveUid=null;placingCode='';addType=null;document.body.classList.remove('secAdding');$('secHint').hidden=true;cancelButton.hidden=!busy;}
 function cancel(){run++;busy=false;resetPlacement();manualForm.hidden=true;scanButton.disabled=!pdf;manualButton.disabled=!pdf;cancelButton.hidden=true;setStatus('Avbrutet. Tidigare detektorer finns kvar.');}
 cancelButton.onclick=cancel;
 function detectorLabel(o){return String(o.id||o.number||'').trim();}
 const labelBefore=securityDrawingLabel;securityDrawingLabel=o=>o.type==='detector'?detectorLabel(o):labelBefore(o);
 const markerLabelBefore=securityDrawingMarkerLabel;securityDrawingMarkerLabel=o=>o.type==='detector'?detectorLabel(o):markerLabelBefore(o);
 function boxFor(o){return o.detectorBox||{width:.025,height:.015,textHeight:.01,angle:0,manual:true};}
 function attachHit(o,hit){o.x=hit.x;o.y=hit.y;o.labelX=hit.x;o.labelY=hit.y;o.detectorBox={width:hit.width,height:hit.height,textHeight:hit.textHeight,angle:hit.angle,manual:!!hit.manual};}
 function newDetector(hit){const o=normalize({uid:crypto.randomUUID(),type:'detector',number:nextNumber('detector'),id:hit.code,idMode:'manual',page:hit.page,x:hit.x,y:hit.y,labelX:hit.x,labelY:hit.y,checks:{},status:'untested'});attachHit(o,hit);items.push(o);return o;}
 function applyHits(hits){let added=0,existing=0;const used=new Set();for(const hit of hits){const o=core.nearestExisting(items,hit,used);if(o){used.add(o.uid);existing++;}else{const fresh=newDetector(hit);used.add(fresh.uid);added++;}}return{added,existing};}
 const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
 async function scan(){
  if(!pdf||busy)return;
  resetPlacement();manualForm.hidden=true;const doc=pdf,token=++run,pageCache=cache();busy=true;scanButton.disabled=true;manualButton.disabled=true;cancelButton.hidden=false;
  const hits=[],noText=[],failed=[];
  try{
   for(let n=1;n<=doc.numPages;n++){
    if(token!==run||pdf!==doc)return;
    setStatus('Skannar sida '+n+' av '+doc.numPages+'…');await pause();
    try{const p=await doc.getPage(n),result=await core.scanPage(p,pdfjsLib);if(token!==run||pdf!==doc)return;pageCache.set(n,result.hits);hits.push(...result.hits);if(!result.hasText)noText.push(n);if(n!==page)p.cleanup();}
    catch(error){console.warn('Detector test page '+n,error);failed.push(n);}
   }
   if(token!==run||pdf!==doc)return;
   securitySessionHistory.endGroup();securitySessionHistory.record();
   const result=applyHits(hits);save();drawMarkers();showOverview();
   const notice=[hits.length+' nummerrutor hittade. '+result.added+' tillagda'+(result.existing?', '+result.existing+' redan kopplade':'')+'.'];
   if(noText.length)notice.push('Sida '+noText.join(', ')+' saknar läsbar text. Lägg till manuellt.');
   if(failed.length)notice.push('Kunde inte läsa sida '+failed.join(', ')+'. Försök igen eller lägg till manuellt.');
   if(!hits.length&&!noText.length&&!failed.length)notice.push('Inga tydliga svarta nummerramar hittades. Lägg till manuellt.');
   setStatus(notice.join(' '));
  }catch(error){console.error(error);setStatus('Skanningen kunde inte slutföras. '+(error.message||'Försök igen.'));}
  finally{if(token===run){busy=false;scanButton.disabled=!pdf;manualButton.disabled=!pdf;cancelButton.hidden=true;}}
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
   const box=boxFor(o),b=document.createElement('button'),span=document.createElement('span');b.type='button';b.className='detectorNumberBox status-'+statusOf(o)+(o.uid===selected?' isSelected':'');b.dataset.detectorUid=o.uid;b.setAttribute('aria-label','Detektor '+detectorLabel(o)+', sida '+o.page+', '+securityStatusText(o));b.title='Öppna detektor '+detectorLabel(o);span.textContent=detectorLabel(o);
   const width=box.width*naturalW,height=box.height*naturalH;b.style.width=(sideways?height:width)+'px';b.style.height=(sideways?width:height)+'px';b.style.fontSize=(box.textHeight*naturalH*.9)+'px';span.style.transform='rotate('+((box.angle+rotation)%360)+'deg)';positionDrawingNode(b,o.x,o.y);b.append(span);
   let pointer=null,moved=false;b.onpointerdown=e=>{if(e.button!==0)return;pointer={x:e.clientX,y:e.clientY};moved=false;};b.onpointermove=e=>{if(pointer&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>6)moved=true;};b.onpointercancel=()=>{pointer=null;moved=true;};
   b.onclick=e=>{e.preventDefault();e.stopPropagation();if(moved||busy||addType)return;selected=o.uid;showSelected();go('protocol');};markers.append(b);
  }
 };
 const moveButton=document.createElement('button');moveButton.type='button';moveButton.id='detectorMove';moveButton.textContent='Flytta på ritning';$('secDelete').before(moveButton);
 moveButton.onclick=()=>{const o=cur();if(o?.type!=='detector')return;moveUid=o.uid;placingCode=detectorLabel(o);addType='detector';cancelButton.hidden=false;go('drawing');document.body.classList.add('secAdding');$('secHint').textContent='Tryck på den nya positionen för '+placingCode+'.';$('secHint').hidden=false;setStatus('Välj ny position för '+placingCode+'.');};
 const selectedBefore=showSelected;
 showSelected=function(){selectedBefore();const o=cur();if(!o)return;moveButton.hidden=o.type!=='detector';$('secNumber').closest('label').hidden=o.type==='detector';if(o.type==='detector')$('secProtocolTitle').textContent='Detektor '+detectorLabel(o);};
 const buildBefore=buildSecurityDrawingPdf;
 buildSecurityDrawingPdf=async function(snapshot=structuredClone({items,textNotes,drawingExtras,project,logoData,drawingRotations}),bytes=sourceBytes.slice()){
  const result=await buildBefore(snapshot,bytes),{rgb,degrees,StandardFonts}=PDFLib,font=await result.out.embedFont(StandardFonts.Helvetica);
  for(const o of snapshot.items.filter(o=>o.type==='detector')){
   const p=await pdf.getPage(o.page),vp=p.getViewport({scale:1}),pg=result.out.getPage(o.page-1),box=boxFor(o),halfW=box.width*vp.width/2,halfH=box.height*vp.height/2,cx=o.x*vp.width,cy=o.y*vp.height;
   const corners=[[cx-halfW,cy-halfH],[cx+halfW,cy-halfH],[cx+halfW,cy+halfH],[cx-halfW,cy+halfH]].map(([x,y])=>vp.convertToPdfPoint(x,y));
   const xs=corners.map(c=>c[0]),ys=corners.map(c=>c[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,label=detectorLabel(o),size=box.textHeight*vp.height*.9,angle=p.rotate-box.angle,rad=angle*Math.PI/180,[px,py]=vp.convertToPdfPoint(cx,cy),tw=font.widthOfTextAtSize(label,size),s=statusOf(o),fill=s==='ok'?rgb(.9,.98,.93):s==='action'?rgb(1,.95,.81):s==='fail'?rgb(1,.88,.89):rgb(1,1,1);
   pg.drawRectangle({x,y,width:w,height:h,color:fill,borderColor:rgb(0,0,0),borderWidth:.6});
   const tx=-tw/2,ty=-size*.34;pg.drawText(label,{x:px+tx*Math.cos(rad)-ty*Math.sin(rad),y:py+tx*Math.sin(rad)+ty*Math.cos(rad),font,size,color:rgb(0,0,0),rotate:degrees(angle)});
   result.links.push({pageIndex:o.page-1,uid:o.uid,x:px,y:py,radius:Math.max(w,h)/2});
  }
  return result;
 };
 const onOpen=$('securityFile').onchange;
 $('securityFile').onchange=async function(e){cancel();const hadFile=!!e.target.files?.length;await onOpen(e);if(hadFile&&pdf){cache();scanButton.disabled=false;manualButton.disabled=false;setStatus(items.length?items.length+' testdetektorer återställda.':'Skanna nummerrutorna eller lägg till manuellt.');msg('');}};
 const closeBefore=closeSecurityDrawing;closeSecurityDrawing=async function(...args){cancel();await closeBefore(...args);scanButton.disabled=!pdf;manualButton.disabled=!pdf;};$('secCloseDrawing').onclick=closeSecurityDrawing;
 document.querySelectorAll('.securityTools [data-add]').forEach(b=>{b.hidden=true;});
 scanButton.disabled=!pdf;manualButton.disabled=!pdf;
 window.DetectorTest={scan,applyHits,boxFor,attachHit,newDetector};
})();
