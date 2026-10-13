/* SmartMatch TEST v36.104 – one verified GS per physical automation; placement-led object scan and nearest physical GS in the drawing view.
   Only activated when the operator opens Verktyg > Koppla dörrautomatik.
   The original GS/door-card scanner remains the source of truth for door positions. */
window.SmartMatchDALink=(()=>{
 'use strict';
 let context=null,exampleFamily='',manualPending='',selectedId='',busy=false,controlsReady=false,pendingGSItemId='',editMarkerId='',editingArrowId='',moveGesture=null,manualGesture=null,manualCross=null,manualReview=null,manualReviewOverlay=null,manualReviewPage=0,manualGuide=null,movePreview=null,lastBulkMessage='',bulkScannedObjects=new Set();
 const ctx=()=>window.SmartMatchAppBridge||context;
 const loaded=()=>{try{return !!ctx()?.getPdf?.()}catch(err){console.warn('DA PDF readiness',err);return false}};
 const $=id=>document.getElementById(id);
 const normalize=s=>String(s||'').toUpperCase().replace(/[–—−]/g,'-').replace(/[\s\u200B]+/g,'').trim();
 const family=s=>{const t=normalize(s),i=t.lastIndexOf('-');return i>0?t.slice(0,i):''};
 const valid=s=>/^\d+(?:-\d+){2,}$/.test(normalize(s));
 const getSelected=()=>ctx()?.getItems()?.find(o=>o.id===selectedId)||null;
 const gsOnPage=p=>ctx().getPositions().filter(o=>o.page===p&&/^GS\s*\d+/i.test(o.code||'')&&Array.isArray(o.rect)&&o.rect.length===4&&o.rect.every(Number.isFinite));
 const linkCardCache=new Map();
 const daTextSymbolCache=new Map(); // Per-page drawn DA tokens, never copied into saved project data.
 const point=r=>[(r[0]+r[2])/2,(r[1]+r[3])/2];
 const status=s=>{const feedback=$('pwDAFeedback');if(!feedback)return;feedback.textContent=s||'';feedback.hidden=!s};
 function openTool(){
  // The entry point is wired as soon as this script loads, independently
  // of the possibly long GS scanner and the app's remaining setup.
  const menu=$('pwToolMenu'),menuBtn=$('pwToolMenuButton');
  if(menu)menu.hidden=true;
  if(menuBtn)menuBtn.setAttribute('aria-expanded','false');
  const dialog=$('pwDALinkDialog');
  if(!dialog){void window.SmartMatchAppBridge?.requestAction?.({title:'Information',confirm:true,action:'OK',message:'Dörrautomatikverktyget saknas i denna programversion. Uppdatera sidan.'});return}
  if(!dialog.open)dialog.showModal();
  if(!loaded()){
   status('Öppna en PDF först.');
   return;
  }
  if(manualPending)stopManual();
  status('');
  $('pwDAExample')?.focus();
 }
 function closeTool(){if($('pwDALinkDialog').open)$('pwDALinkDialog').close()}

 function manual(){
  if(!loaded()){status('Öppna en PDF först.');return}
  if(busy){status('Sökningen pågår. Vänta tills den är klar.');return}
  const text=normalize($('pwDAExample').value);
  if(!valid(text)){status('Ange hela märkningen, t.ex. 1-28-24-1.');$('pwDAExample').focus();return}
  stopMove();stopManual();
  exampleFamily=family(text);manualPending=text;manualReviewPage=ctx().getPage();
  closeTool();
  const stage=$('pwStage');
  stage.classList.add('pwDAManualPlacing');
  $('pwViewer').classList.add('pwDAManualViewer');
  document.body.classList.add('pwDAManualBody');
  manualCross=document.createElement('div');manualCross.className='pwDAManualCross';
  manualCross.textContent='+';manualCross.setAttribute('aria-hidden','true');
  stage.appendChild(manualCross);
  updateManualCross({x:Math.max(18,stage.clientWidth/2),y:Math.max(18,stage.clientHeight/2)});
  manualGuide=document.createElement('div');manualGuide.id='pwDAPlacementGuide';
  manualGuide.className='pwDAPlacementGuide';
  document.body.appendChild(manualGuide);
  updateManualGuide();
  ctx().setStatus('På iPhone/iPad: dra med fingret. Krysset ligger ovanför fingret, och du kan justera rutan före sparning.');
 }
 function updateManualCross(p){
  if(!manualCross)return;
  manualCross.style.left=Math.round(p.x)+'px';manualCross.style.top=Math.round(p.y)+'px';
 }
 function stopManual(message=''){
  manualPending='';manualGesture=null;manualReview=null;manualReviewPage=0;
  $('pwStage').classList.remove('pwDAManualPlacing');
  $('pwViewer').classList.remove('pwDAManualViewer');
  document.body.classList.remove('pwDAManualBody');
  manualCross?.remove();manualCross=null;
  manualReviewOverlay?.remove();manualReviewOverlay=null;
  manualGuide?.remove();manualGuide=null;
  if(!editMarkerId)hideMovePreview();
  if(message)ctx()?.setStatus?.(message);
 }
 const manualClamp=(x,a,b)=>Math.min(Math.max(x,a),Math.max(a,b));
 function manualStagePoint(e,offset=0){
  const p=stageXY(e),stage=$('pwStage');
  return {x:manualClamp(p.x,0,stage.clientWidth),y:manualClamp(p.y-offset,0,stage.clientHeight)};
 }
 function clampManualReview(r){
  const stage=$('pwStage'),width=Math.max(12,Math.min(stage.clientWidth,Number(r.w)||12)),
   height=Math.max(9,Math.min(stage.clientHeight,Number(r.h)||9));
  return {x:manualClamp(Number(r.x)||0,0,stage.clientWidth-width),
   y:manualClamp(Number(r.y)||0,0,stage.clientHeight-height),w:width,h:height};
 }
 function updateManualGuide(){
  if(!manualGuide||!manualPending)return;
  manualGuide.replaceChildren();
  const info=document.createElement('span');
  info.className='pwDAManualHint';
  const group=document.createElement('div');group.className='pwDAManualControls';
  const control=(label,title,action)=>{
   const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;
   b.setAttribute('aria-label',title);b.onclick=action;group.appendChild(b);return b;
  };
  if(!manualReview){
   info.textContent='Placera '+manualPending+' · dra runt numret och släpp';
   control('Avbryt','Avbryt placeringen',()=>stopManual('Placeringen avbröts.'));
  }else{
   info.textContent='Finjustera '+manualPending+' · dra i mitten eller hörnen';
   const nudges=[
    ['←','Flytta vänster',-2,0],['↑','Flytta upp',0,-2],
    ['↓','Flytta ned',0,2],['→','Flytta höger',2,0]
   ];
   for(const [label,title,dx,dy] of nudges)control(label,title,()=>{
    manualReview=clampManualReview({...manualReview,x:manualReview.x+dx,y:manualReview.y+dy});
    renderManualReview();
   });
   control('−','Minska rutans storlek',()=>{
    manualReview=clampManualReview({...manualReview,x:manualReview.x+2,y:manualReview.y+1,w:manualReview.w-4,h:manualReview.h-2});renderManualReview();
   });
   control('+','Öka rutans storlek',()=>{
    manualReview=clampManualReview({...manualReview,x:manualReview.x-2,y:manualReview.y-1,w:manualReview.w+4,h:manualReview.h+2});renderManualReview();
   });
   control('Rita om','Rita om placeringen',()=>{
    manualReview=null;manualReviewOverlay?.remove();manualReviewOverlay=null;manualCross.hidden=false;updateManualGuide();
   });
   control('✓ Spara','Spara positionen',()=>void confirmManualReview());
   control('Avbryt','Avbryt placeringen',()=>stopManual('Placeringen avbröts.'));
  }
  manualGuide.append(info,group);
 }
 function renderManualReview(){
  if(!manualReview||!manualPending)return;
  if(!manualReviewOverlay){
   manualReviewOverlay=document.createElement('div');
   manualReviewOverlay.className='pwDAManualReview';
   manualReviewOverlay.setAttribute('aria-label','Justera markeringsrektangeln');
   const grip=document.createElement('div');grip.className='pwDAManualGrip';
   grip.dataset.daAction='move';grip.textContent='✥';grip.title='Dra för att flytta';
   manualReviewOverlay.appendChild(grip);
   for(const corner of ['nw','ne','sw','se']){
    const handle=document.createElement('div');
    handle.className='pwDAManualHandle pwDAManualHandle-'+corner;
    handle.dataset.daAction=corner;
    handle.setAttribute('aria-label','Dra för att ändra storlek');
    manualReviewOverlay.appendChild(handle);
   }
   $('pwStage').appendChild(manualReviewOverlay);
  }
  const r=manualReview;
  Object.assign(manualReviewOverlay.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px'});
 }
 function manualReviewFromPoints(start,end){
  const x=Math.min(start.x,end.x),y=Math.min(start.y,end.y),
   w=Math.abs(start.x-end.x),h=Math.abs(start.y-end.y);
  if(w<12||h<9)return false;
  manualReview=clampManualReview({x,y,w,h});
  manualCross.hidden=true;hideMovePreview();renderManualReview();updateManualGuide();
  return true;
 }
 function moveManualReview(gesture,point){
  if(!manualReview)return;
  const before=gesture.before,dx=point.x-gesture.start.x,dy=point.y-gesture.start.y;
  let x=before.x,y=before.y,w=before.w,h=before.h;
  if(gesture.action==='move'){x+=dx;y+=dy}
  else{
   if(gesture.action.includes('w')){x+=dx;w-=dx}
   if(gesture.action.includes('e'))w+=dx;
   if(gesture.action.includes('n')){y+=dy;h-=dy}
   if(gesture.action.includes('s'))h+=dy;
   if(w<12){if(gesture.action.includes('w'))x-=12-w;w=12}
   if(h<9){if(gesture.action.includes('n'))y-=9-h;h=9}
  }
  manualReview=clampManualReview({x,y,w,h});
  renderManualReview();
 }
 async function confirmManualReview(){
  if(!manualReview||!manualPending||!loaded())return;
  if(manualReviewPage!==ctx().getPage()){
   ctx().setStatus('Ritningssidan har ändrats. Rita om märkningen.');return;
  }
  const box={...manualReview};
  const text=manualPending,page=ctx().getPage();
  const saveButton=manualGuide?.querySelector?.('[title="Spara positionen"]');
  if(saveButton)saveButton.disabled=true;
  try{
   const pg=await ctx().getPdf().getPage(page),vp=pg.getViewport({scale:ctx().getScale()});
   const a=vp.convertToPdfPoint(box.x,box.y);
   const b=vp.convertToPdfPoint(box.x+box.w,box.y+box.h);
   const rect=[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];
   if(!rect.every(Number.isFinite))throw new Error('Markeringens position är ogiltig.');
   const identity=await readPlacedIdentity(page,rect,text);
   const {fullId,objectNo,modelCode,model,serialNumber}=identity;
   const id='manual-da@'+page+':'+fullId+':'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2,6);
   const item=matchingExisting({...identity,page,rect},ctx().getItems())||
    {id,page,rect,objectNo,modelCode,model,serialNumber,sourceText:fullId,
     sourceKind:'manual-da',linkedGsId:'',slrDocuments:{},checks:{},notes:'',progress:0};
   if(!ctx().getItems().includes(item))ctx().addItem(item);
   stopManual();
   openDoor(item);
   await scanObjectAutomations(item);
   if(identity.source==='manual')setBulkStatus(lastBulkMessage+' · Första märkningen kunde inte läsas i rutan; din inmatning användes.');
  }catch(err){
   console.error('[SmartMatch DA touch placement]',err);
   ctx().setStatus('Kunde inte spara placeringen: '+(err.message||err));
   if(saveButton)saveButton.disabled=false;
  }
 }
 // Keep text fragments in their own baseline/direction and local label run.
 // This supports vertical/rotated labels and digits split into PDF.js items.
 function automationRows(items){
  const rows=[];
  for(const it of items){
   if(!it.text)continue;
   const t=it.transform,angle=t?Math.atan2(t[1],t[0]):0;
   const dx=Math.cos(angle),dy=Math.sin(angle),along=it.x*dx+it.y*dy,across=-it.x*dy+it.y*dx;
   let row=rows.find(r=>Math.abs(Math.sin(r.angle-angle))<.02&&Math.cos(r.angle-angle)>.99&&Math.abs(r.across-across)<=Math.max(2,Math.min(r.h,it.h)*.45));
   if(!row){row={angle,across,h:it.h,items:[]};rows.push(row)}
   row.items.push({...it,along,dx,dy});
  }
  const runs=[];
  for(const row of rows){
   const sorted=row.items.sort((a,b)=>a.along-b.along);let run=[];
   for(const it of sorted){
    const prev=run.at(-1);
    if(prev&&it.along-(prev.along+prev.w)>Math.max(prev.h,it.h)*2){runs.push({items:run});run=[]}
    run.push(it);
   }
   if(run.length)runs.push({items:run});
  }
  return runs;
 }
 function labelMatches(text,objectNo=''){
  const separator='[\\s\\u200B]*[-–—−][\\s\\u200B]*';
  const objectPattern=objectNo?normalize(objectNo).split('-').map(s=>s.split('').join('[\\s\\u200B]*')).join(separator):'\\d{1,10}(?:'+separator+'\\d{1,10})*';
  const pattern=new RegExp('(?<![\\d–—−-])'+objectPattern+separator+'\\d{1,4}'+separator+'\\d{1,6}(?![\\d–—−-])','g');
  return [...String(text||'').matchAll(pattern)];
 }
 function locateRowMatches(row,page,fam,mode='family'){
  const spans=[];let combined='',previous=null;
  for(const it of row.items){
   // No artificial blank inside contiguous PDF fragments (e.g. 2001 + 54).
   const gap=previous?it.along-(previous.along+previous.w):0;
   if(previous&&gap>Math.max(1,Math.min(previous.h,it.h)*.2))combined+=' ';
   const from=combined.length;combined+=it.text;spans.push({from,to:combined.length,it});previous=it;
  }
  const hits=[];
  for(const match of labelMatches(combined,mode==='object'?fam:'')){
   const text=normalize(match[0]);
   if(mode==='family'&&family(text)!==fam)continue;
   const start=match.index,end=start+match[0].length,parts=spans.filter(s=>s.to>start&&s.from<end);
   const corners=[];
   for(const span of parts){
    const it=span.it,length=Math.max(1,span.to-span.from),a=Math.max(0,start-span.from)/length,b=Math.min(length,end-span.from)/length;
    const dx=it.dx??1,dy=it.dy??0;
    for(const offset of [it.w*a,it.w*b])for(const height of [-it.h*.35,it.h*.95])
     corners.push([it.x+dx*offset-dy*height,it.y+dy*offset+dx*height]);
   }
   if(!corners.length)continue;
   const rect=[Math.min(...corners.map(p=>p[0]))-3,Math.min(...corners.map(p=>p[1]))-3,Math.max(...corners.map(p=>p[0]))+3,Math.max(...corners.map(p=>p[1]))+3];
   if(rect.every(Number.isFinite))hits.push({text,page,rect});
  }
  return hits;
 }
 async function readPlacedIdentity(page,rect,input){
  const api=ctx(),data=await api.readPageText(page),models=api.getModels();
  const hits=[];
  for(const row of automationRows(data.items))for(const hit of locateRowMatches(row,page,'','all')){
   const parsed=parseCandidateId(hit.text,'',models);if(parsed)hits.push({...parsed,...hit});
  }
  hits.push(...await annotationCandidates('',new Set(),models,page));
  const inside=hits.filter(hit=>{const p=point(hit.rect);return p[0]>=rect[0]-3&&p[0]<=rect[2]+3&&p[1]>=rect[1]-3&&p[1]<=rect[3]+3});
  const ids=[...new Map(inside.map(hit=>[hit.fullId,hit])).values()];
  if(ids.length>1)throw new Error('Rutan innehåller flera märkningar. Rita en ruta kring en enda märkning.');
  const parsed=ids[0]||parseCandidateId(input,'',models);
  if(!parsed)throw new Error('Ange hela märkningen: objektnummer-maskintyp-antal.');
  return {...parsed,source:ids.length?'drawing':'manual'};
 }
 function renderResults(items){
  const box=$('pwDAResults');
  if(!box)return;
  box.replaceChildren();
  const unique=[...new Map(items.map(o=>[o.id,o])).values()];
  if(!unique.length)return;
  const summary=document.createElement('strong');summary.textContent='Hittade märkningar ('+unique.length+')';
  box.appendChild(summary);
  unique.sort((a,b)=>a.page-b.page||a.sourceText.localeCompare(b.sourceText,'sv',{numeric:true}));
  for(const o of unique){
   const line=document.createElement('div');line.className='pwDAResult';
   const button=document.createElement('button');button.type='button';button.className='pwDAResultOpen';
   button.textContent=o.sourceText+' · sida '+o.page;
   const caption=document.createElement('small');caption.textContent=resolveGs(o)?'GS-koppling kontrollerad':'Välj rätt GS-position';
   const look=document.createElement('button');look.type='button';look.textContent='Visa';
   look.onclick=()=>{closeTool();void ctx()?.locate?.(o)};
   button.onclick=()=>{closeTool();openDoor(o)};
   line.append(button,caption,look);box.appendChild(line);
  }
 }
 async function analyze(){
  if(busy)return;
  if(!loaded()){status('Ingen PDF är inläst ännu. Öppna ritningen och försök igen.');return}
  const example=normalize($('pwDAExample').value);
  if(!valid(example)){status('Skriv hela märkningen, exempelvis 70154-78-24-11.');return}
  exampleFamily=family(example);busy=true;$('pwDAAnalyze').disabled=true;
  status('Söker efter märkningar i samma familj: '+exampleFamily+'…');
  let found=0,created=0,suggested=0,unlinked=0,results=[];
  try{
   const api=ctx(),pdf=api.getPdf(),upper=Math.min(pdf.numPages,api.getDrawingLimit());
   const seen=new Set();
   for(let p=1;p<=upper;p++){
    const data=await api.readPageText(p);
    if(api.looksLikeProtocol(data.raw))continue;
    for(const row of api.groupRows(data.items)){
     for(const {text,rect} of locateRowMatches(row,p,exampleFamily)){
      const near=api.getItems().find(o=>o.page===p&&normalize(o.sourceText||[o.objectNo,o.modelCode,o.serialNumber].filter(Boolean).join('-'))===text&&Math.hypot(o.rect[0]-rect[0],o.rect[1]-rect[1])<15);
      const id='family-da@'+p+':'+text+':'+Math.round(rect[0])+':'+Math.round(rect[1]);
      if(seen.has(id))continue;
      seen.add(id);found++;
      let item=near||api.getItems().find(o=>o.id===id);
      if(!item){
       const pieces=text.split('-'),serialNumber=pieces.pop(),modelCode=pieces.pop(),objectNo=pieces.join('-');
       const model=api.getModels().find(x=>x[0]===modelCode)?.[1]||modelCode;
       item={id,page:p,rect,objectNo,modelCode,model,serialNumber,
         sourceText:text,sourceKind:'family-da',linkedGsId:'',
         slrDocuments:{},checks:{},notes:'',progress:0};
       api.addItem(item,false);created++;
       if(item.linkedGsId)suggested++;
      }
      if(!item.linkedGsId)unlinked++;
      results.push(item);
     }
    }
    if(p%5===0)status('Analyserar ritningens PDF-text: '+p+' av '+upper+' sidor…');
   }
   api.save();api.redraw();renderResults(results);
   status(found?'Hittade '+found+' märkningar av '+exampleFamily+'. '+created+' nya knappar. '+suggested+' tydliga GS-förslag med pil. '+unlinked+' behöver kopplas manuellt. Tryck på en träff för att granska eller välja GS.':
    'Inga läsbara märkningar i denna familj. Prova Placera manuellt; om texten är en inskannad bild behövs OCR.');
  }catch(err){console.error('[SmartMatch DA analyze]',err);status('Analysfel: '+(err.message||err))}
  finally{busy=false;$('pwDAAnalyze').disabled=false}
 }


 // Scan from the first correctly placed automation, not from a manually
 // re-entered sample or a hardcoded machine family. Never overwrite existing work.
 function objectFromItem(o){return normalize(String(o?.objectNo||''))}
 function itemFullId(o){return normalize([o?.objectNo,o?.modelCode,o?.serialNumber].filter(v=>v!==''&&v!=null).join('-'))}
 function parseCandidateId(value,objectNo,models){
  const full=normalize(value),parts=full.split('-');
  const actualObject=parts.slice(0,-2).join('-');
  if(parts.length<3||!/^\d+(?:-\d+)*$/.test(actualObject)||(objectNo&&actualObject!==normalize(objectNo)))return null;
  objectNo=actualObject;
  const modelCode=String(Number(parts.at(-2))),serialNumber=String(Number(parts.at(-1)));
  if(!/^\d{1,4}$/.test(parts.at(-2))||!/^\d{1,6}$/.test(parts.at(-1))||!Number(serialNumber))return null;
  const known=models.find(m=>m[0]===modelCode);
  return {fullId:full,objectNo,modelCode,model:known?.[1]||'Okänd maskintyp '+modelCode,serialNumber,unknownModel:!known};
 }
 function nearPhysicalRect(a,b){
  if(!Array.isArray(a)||!Array.isArray(b))return false;
  const p=point(a),q=point(b);
  const width=Math.max(Math.abs(a[2]-a[0]),Math.abs(b[2]-b[0]));
  return Math.hypot(p[0]-q[0],p[1]-q[1])<Math.max(30,Math.min(85,width*.55));
 }
 function matchingExisting(c,items){
  return items.find(o=>o.page===c.page&&nearPhysicalRect(o.rect,c.rect)&&
   (itemFullId(o)===c.fullId||normalize(o.sourceText||'')===c.fullId));
 }

 function canonicalMachineCode(value,models){
  const raw=String(value??'').trim();
  if(!/^\d{1,4}$/.test(raw))return '';
  const code=String(Number(raw));
  return (models||[]).some(row=>String(Number(row[0]))===code)?code:'';
 }
 function cardModelCode(value,models){
  const text=String(value||'').trim(),known=Array.isArray(models)?models:[];
  if(!text)return '';
  // A label may contain "Maskintyp 24", but 24V is not a machine type.
  const explicit=text.match(/\b(?:MASKINTYP|MASKINKOD|TYP\s+AV\s+MASKIN)\s*(?:NR\.?|KOD|:|#|-)?\s*(\d{1,4})\b/i);
  const type=explicit?canonicalMachineCode(explicit[1],known):'';
  if(type)return type;
  const numeric=canonicalMachineCode(text,known);
  if(numeric)return numeric;
  const compact=text.toUpperCase().replace(/[^A-Z0-9ÅÄÖ]/g,'');
  const matches=known.map(([code,name])=>({code:String(Number(code)),word:String(name).toUpperCase().replace(/[^A-Z0-9ÅÄÖ]/g,'')}))
   .filter(row=>row.word.length>=5&&compact.includes(row.word)).sort((a,b)=>b.word.length-a.word.length);
  if(matches.length)return matches[0].code;
  // Name aliases are translated to the numeric codes from the master list.
  const aliases=[
   ['24',/\b(?:DORMA(?:KABA)?\s*)?(?:ED|ID)[\s-]*100\b/i],
   ['37',/\b(?:DORMA(?:KABA)?\s*)?(?:ED|ID)[\s-]*250\b/i],
   ['45',/\bSW[\s-]*300\b/i],['16',/\bSW[\s-]*100\b/i],
   ['48',/\bSL[\s-]*500\b/i],['17',/\b(?:DORMA(?:KABA)?\s*)?(?:ED|ID)[\s-]*200\b/i],
   ['32',/\bED[\s-]*180\b/i],['33',/\bEC[\s-]*TURN\b/i],
   ['38',/\bPOWER[\s-]*DRIVE\b/i],['39',/\bEC[\s-]*DRIVE\b/i],
   ['15',/\bPOWER[\s-]*SWING\b/i]
  ];
  const codes=[...new Set(aliases.filter(([code,regex])=>regex.test(text)&&known.some(x=>String(Number(x[0]))===code)).map(x=>x[0]))];
  return codes.length===1?codes[0]:'';
 }
 function itemMachineCode(item,models){
  const direct=canonicalMachineCode(item?.modelCode,models);
  if(direct)return direct;
  const text=normalize(item?.sourceText||item?.fullId||''),parts=text.split('-');
  if(parts.length>=3&&parts.slice(0,-2).join('-')===objectFromItem(item)){
   const code=canonicalMachineCode(parts.at(-2),models);
   if(code)return code;
  }
  return cardModelCode(item?.model||'',models);
 }
 function machineTypeLabel(code,models){
  if(!code)return 'okänd';
  const name=(models||[]).find(x=>String(Number(x[0]))===String(code))?.[1];
  return String(code)+(name?' ('+name+')':'');
 }
 async function doorCardAutomation(gsCode,cache){
  const api=ctx(),index=api.getDoorCardIndex?.()||{},pageMap=api.getDoorCardMapping?.()||{};
  // Inspect the card actually assigned to this GS, not another card nearby.
  const assigned=Number(pageMap[gsCode]);
  const pages=Number.isInteger(assigned)&&assigned>0?[assigned]:(index[gsCode]||[]).slice();
  const pageKey=pages.join(':');if(cache.get(gsCode)?.pageKey===pageKey)return cache.get(gsCode);
  let state='unknown',cardModel='',fullIds=[];
  for(const p of pages){
   try{
    const data=await api.readPageText(p);
    const rows=api.groupRows(data.items);
    for(const row of rows)if(/D[ÖO]RRAUTOMATIK|ID[- ]?M[ÄA]RKNING|AUTOMATIK.*(?:ID|M[ÄA]RK)|(?:ID|M[ÄA]RK).*AUTOMATIK/i.test(String(row.text||'')))for(const value of String(row.text||'').match(/\b\d+(?:\s*[-–—]\s*\d+){2,}\b/g)||[])fullIds.push(normalize(value));
    for(let n=0;n<rows.length;n++){
     const text=String(rows[n].text||'');
     const match=text.match(/\bD[ÖO]RRAUTOMATIK\b/i);
     if(!match)continue;
     const rest=text.slice(match.index+match[0].length).trim();
     if(/^[-–—](?:\s|$)/.test(rest)||rest==='-'){if(state!=='yes')state='no';continue}
     // In some PDFs the label and its value occupy adjacent rows.
     const next=String(rows[n+1]?.text||'').trim();
     const candidate=rest||(!/^(?:DÖRR|LÅS|CYLINDER|SLUTBLECK|TRYCKE|BESLAG|SIDA)\b/i.test(next)?next:'');
     const code=cardModelCode(candidate,api.getModels());
     if(code){state='yes';cardModel=code;break}
     if(candidate&&/^(?:JA|ED[\s-]*\d+|ID[\s-]*(?:100|200|250)|SW[\s-]*\d+|BESAM|DORMA|DORMAKABA|GEZE|FAAC|ENTRAMATIC|RECORD|TORMAX|GILGEN)\b/i.test(candidate)){
      state='yes';break;
     }
    }
    if(state==='yes')break;
   }catch(err){console.warn('DA doorcard classification',gsCode,p,err)}
  }
  const result={state,cardModel,fullIds:[...new Set(fullIds)],hasCard:pages.length>0,pageKey};cache.set(gsCode,result);return result;
 }
 function sameGsPosition(a,b){
  return !!a&&!!b&&(a.id===b.id||(a.page===b.page&&a.code===b.code&&nearPhysicalRect(a.rect,b.rect)));
 }
 function samePhysicalAutomation(a,b){
  if(!a||!b||a.page!==b.page||itemFullId(a)!==itemFullId(b))return false;
  const ra=a.rect,rb=b.rect;
  if(!Array.isArray(ra)||!Array.isArray(rb)||ra.length!==4||rb.length!==4)return false;
  const ox=Math.max(0,Math.min(ra[2],rb[2])-Math.max(ra[0],rb[0]));
  const oy=Math.max(0,Math.min(ra[3],rb[3])-Math.max(ra[1],rb[1]));
  const area=Math.min(Math.abs((ra[2]-ra[0])*(ra[3]-ra[1])),Math.abs((rb[2]-rb[0])*(rb[3]-rb[1])));
  return area>0&&ox*oy/area>=.45;
 }
 function conflictingPhysicalGS(o,g=resolveGsRaw(o)){
  if(!g)return false;
  return (ctx()?.getItems?.()||[]).some(peer=>{
   if(peer===o||!samePhysicalAutomation(o,peer)||peer.gsLinkDismissed)return false;
   const other=resolveGsRaw(peer);
   return !!other&&!sameGsPosition(other,g);
  });
 }
 function occupiedGs(g,item){
  return ctx().getItems().find(o=>{
   if(o===item||o.id===item?.id||o.gsLinkDismissed)return false;
   const saved=resolveGsRaw(o);
   return sameGsPosition(saved,g)||(!saved&&o.page===g.page&&o.linkedGsCode===g.code&&
    (!Array.isArray(o.linkedGsRect)?gsOnPage(g.page).filter(p=>p.code===g.code).length===1:nearPhysicalRect(o.linkedGsRect,g.rect)));
  });
 }

 // The Dorma ED family is compatible for the drawing-to-GS arrow ONLY.
 // This does not rename model 17/24/37 in the original marker or inspections.
 function compatibleGsMachineTypes(a,b){
  return !!a&&!!b&&String(a)!==String(b)&&
   ['17','24','37'].includes(String(a))&&['17','24','37'].includes(String(b));
 }
 function compatibleGsFullId(o,cardId,models){
  const mark=normalize(itemFullId(o)||o?.fullId||o?.sourceText||'').split('-');
  const card=normalize(cardId).split('-');
  if(mark.length<3||mark.length!==card.length)return false;
  if(mark.slice(0,-2).join('-')!==card.slice(0,-2).join('-'))return false;
  if(mark.at(-1)!==card.at(-1))return false;
  return compatibleGsMachineTypes(canonicalMachineCode(mark.at(-2),models),
   canonicalMachineCode(card.at(-2),models));
 }
 function gsFamilyNote(o,card,models=ctx()?.getModels?.()||[]){
  const a=itemMachineCode(o,models),b=canonicalMachineCode(card?.cardModel,models);
  return compatibleGsMachineTypes(a,b)?
    'Kompatibel ED100/ED200/ED250-familj för GS-pil: märkning typ '+a+
    ' och dörrkort typ '+b+'. Ursprungliga maskintyper behålls.':'';
 }

 function cardIssue(item,card){
  if(!card?.hasCard)return 'GS-positionen saknar kopplat dörrkort';
  if(card.state==='no')return 'Dörrkortet saknar dörrautomatik';
  const models=ctx()?.getModels?.()||[],markCode=itemMachineCode(item,models),cardCode=canonicalMachineCode(card.cardModel,models);
  if(cardCode&&markCode&&cardCode!==markCode&&!compatibleGsMachineTypes(markCode,cardCode))
   return 'Maskintyp skiljer sig: märkningen har typkod '+machineTypeLabel(markCode,models)+
    ', men dörrkortet anger '+machineTypeLabel(cardCode,models)+'. Kontrollera uppgifterna.';
  const full=itemFullId(item)||normalize(item.fullId||item.sourceText||'');
  const sameObject=(card.fullIds||[]).filter(id=>id.split('-').slice(0,-2).join('-')===objectFromItem(item));
  if(sameObject.length&&full&&!sameObject.includes(full)&&!sameObject.some(id=>compatibleGsFullId(item,id,models)))
   return 'Märkningen stämmer inte med dörrkortet (objektnummer, typkod eller antal).';
  return '';
 }
 
 // In real drawings a long vertical automation ID may sit between two doors.
 // The physical DA sign beside that ID identifies the right door more safely
 // than the midpoint of its long text rectangle. PDF text points/marker rects
 // are in the same original PDF coordinate system, also on rotated sheets.
 async function readDASymbols(page){
  if(daTextSymbolCache.has(page))return daTextSymbolCache.get(page);
  const text=await ctx().readPageText(page);
  const symbols=[];
  for(const it of text.items||[]){
   if(normalize(it.text)!=='DA'||!Number.isFinite(it.x)||!Number.isFinite(it.y))continue;
   const t=it.transform||[1,0,0,1],length=Math.hypot(t[0],t[1])||1;
   const dx=t[0]/length,dy=t[1]/length,width=Math.max(0,Number(it.w)||0);
   symbols.push({p:[it.x+dx*width*.5,it.y+dy*width*.5]});
  }
  daTextSymbolCache.set(page,symbols);
  return symbols;
 }
 function automationAnchor(item){
  const original=point(item.rect),symbols=daTextSymbolCache.get(item.page)||[];
  if(!symbols.length)return {p:original,source:'text'};
  // Match the drawing's physical DA signs to distinct nearby automation IDs.
  // A single label can straddle two doors; the immediately closer sign may
  // belong to the adjacent automation. Greedy one-to-one pairing prevents
  // both ID labels from using that same sign. Unassigned IDs keep the prior
  // text-center fallback.
  const physical=[],sameSource=(a,b)=>{
   if(a.page!==b.page||itemFullId(a)!==itemFullId(b))return false;
   const ra=a.rect,rb=b.rect;
   const overlapX=Math.max(0,Math.min(ra[2],rb[2])-Math.max(ra[0],rb[0]));
   const overlapY=Math.max(0,Math.min(ra[3],rb[3])-Math.max(ra[1],rb[1]));
   const minArea=Math.min(Math.abs((ra[2]-ra[0])*(ra[3]-ra[1])),
    Math.abs((rb[2]-rb[0])*(rb[3]-rb[1])));
   return minArea>0&&overlapX*overlapY/minArea>.45;
  };
  for(const o of ctx().getItems?.()||[]){
   if(o.page!==item.page||!Array.isArray(o.rect)||o.rect.length!==4)continue;
   if(!physical.some(x=>sameSource(x,o)))physical.push(o);
  }
  if(!physical.some(x=>sameSource(x,item)))physical.push(item);
  const pairs=[];
  for(let i=0;i<physical.length;i++){
   const o=physical[i],p=point(o.rect),w=Math.abs(o.rect[2]-o.rect[0]),h=Math.abs(o.rect[3]-o.rect[1]);
   const cutoff=Math.max(40,Math.max(w,h)*1.65);
   for(let j=0;j<symbols.length;j++){
    const q=symbols[j].p,d=Math.hypot(p[0]-q[0],p[1]-q[1]);
    if(d<=cutoff)pairs.push({i,j,d});
   }
  }
  pairs.sort((a,b)=>a.d-b.d||a.i-b.i||a.j-b.j);
  const usedIds=new Set(),usedSigns=new Set(),owners=new Map();
  for(const pair of pairs){
   if(usedIds.has(pair.i)||usedSigns.has(pair.j))continue;
   usedIds.add(pair.i);usedSigns.add(pair.j);owners.set(pair.i,pair.j);
  }
  const index=physical.findIndex(o=>sameSource(o,item));
  const sign=owners.get(index);
  if(sign===undefined)return {p:original,source:'text'};
  return {p:symbols[sign].p,source:'da-symbol'};
 }
 // The user wants the physically NEAREST GS whose own door card contains
 // compatible door automation. Full ID/type is validation, never a reason to
 // bypass a nearer compatible GS and draw a long arrow.
 function eligibleGS(o,cardCache){
  const full=itemFullId(o)||normalize(o.fullId||o.sourceText||'');
  const a=automationAnchor(o).p;
  return gsOnPage(o.page).map(g=>{
   // Multiple distinct automations on the same door may share a GS.
   const proof=cardCache.get(String(g.code||'').toUpperCase().replace(/\s+/g,''));
   if(!proof||proof.state!=='yes'||cardIssue(o,proof))return null;
   const models=ctx().getModels(),ids=proof.fullIds||[];
   const exact=!!full&&ids.includes(full);
   const sameFamilyId=!exact&&ids.some(id=>compatibleGsFullId(o,id,models));
   if(ids.length&&full&&!exact&&!sameFamilyId)return null;
   const type=itemMachineCode(o,models),cardType=canonicalMachineCode(proof.cardModel,models);
   const exactType=!!type&&type===cardType,familyType=compatibleGsMachineTypes(type,cardType);
   const b=point(g.rect);
   return {g,tier:exact?0:sameFamilyId?1:exactType?2:familyType?3:4,
    distance:Math.hypot(a[0]-b[0],a[1]-b[1])};
  }).filter(Boolean).sort((a,b)=>a.distance-b.distance||a.tier-b.tier||String(a.g.id).localeCompare(String(b.g.id)));
 }
 // A GS that is far across the floor plan is NOT a confident physical match,
 // even if no other card contains automation. Keep the DA button and offer a
 // manual GS correction rather than a long, misleading arrow.
 function localGsSafety(item,best){
  const all=gsOnPage(item.page);
  if(!all.length)return {ok:false,reason:'Ingen GS-position på ritningssidan'};
  const origin=automationAnchor(item).p;
  const nearest=Math.min(...all.map(g=>{const p=point(g.rect);return Math.hypot(origin[0]-p[0],origin[1]-p[1])}));
  const dimensions=[item.rect,best.g.rect].flatMap(r=>[Math.abs(r[2]-r[0]),Math.abs(r[3]-r[1])]);
  const footprint=Math.max(1,...dimensions);
  // Geometric bound scales to the annotation footprint instead of a fixed
  // whole-PDF size, and is also relative to the closest physical GS stamp.
  const bound=Math.min(Math.max(35,footprint*7),Math.max(15,footprint*2.5)+nearest*2.25);
  if(best.distance>bound)return {ok:false,reason:'Närmaste verifierade GS ligger för långt bort – koppla manuellt'};
  return {ok:true,reason:''};
 }
 function chooseNearestGS(item,cardCache){
  const options=eligibleGS(item,cardCache);
  if(!options.length)return {id:'',reason:'Inget GS i närheten med rätt dörrautomatik i dörrkortet'};
  const best=options[0],second=options[1];
  const safety=localGsSafety(item,best);
  if(!safety.ok)return {id:'',reason:safety.reason};
  // Only a true coordinate tie without differing evidence needs manual input;
  // the previous 4-point near-tie rule caused otherwise valid arrows to vanish.
  if(second&&Math.abs(second.distance-best.distance)<.01&&second.tier===best.tier)
   return {id:'',reason:'Två GS-positioner ligger lika nära – koppla manuellt'};
  return {id:best.g.id,g:best.g,tier:best.tier,distance:best.distance,
   reason:'Närmaste GS med bekräftad dörrautomatik · '+best.g.code+
    (best.tier===1||best.tier===3?' · kompatibel ED-familj':'')};
 }
 async function proposeGS(item,cardCache){
  await readDASymbols(item.page);
  for(const g of gsOnPage(item.page))
   await doorCardAutomation(String(g.code||'').toUpperCase().replace(/\s+/g,''),cardCache);
  return chooseNearestGS(item,cardCache);
 }
 async function annotationCandidates(objectNo,knownPages,models,pageOnly=0){
  const raw=ctx()?.getOriginalPdfBytes?.();
  if(!raw?.length||!window.PDFLib?.PDFDocument)return [];
  const out=[];
  try{
   const pdfDoc=await PDFLib.PDFDocument.load(raw.slice(),{ignoreEncryption:true,updateMetadata:false});
   const {PDFName}=PDFLib, pages=pdfDoc.getPages(),upper=Math.min(pages.length,ctx().getDrawingLimit());
   for(let i=0;i<upper;i++){
    const pageNo=i+1;if(knownPages.has(pageNo)||(pageOnly&&pageNo!==pageOnly))continue;
    const annotList=pages[i].node.Annots?.();if(!annotList)continue;
    for(const ref of annotList.asArray()){
     try{
      const annot=pdfDoc.context.lookup(ref);
      const subtype=annot.get(PDFName.of('Subtype'))?.toString?.()||'';
      if(!/(FreeText|Stamp|Square|Highlight|Text|Circle)/i.test(subtype))continue;
      const texts=['Contents','Subj','T'].map(field=>annot.get(PDFName.of(field))?.decodeText?.()||'');
      const ids=[...new Set(texts.flatMap(content=>labelMatches(content,objectNo).map(match=>match[0])))];
      const rectObj=annot.get(PDFName.of('Rect'));
      const rectangle=rectObj?.asArray?.()?.map(x=>x?.asNumber?.());
      if(rectangle?.length!==4||!rectangle.every(Number.isFinite))continue;
      for(const value of ids){
       const parsed=parseCandidateId(value,objectNo,models);if(!parsed)continue;
       out.push({...parsed,page:pageNo,rect:rectangle.slice(),source:'annotation'});
      }
     }catch(_){}
    }
   }
  }catch(err){console.warn('DA annotation lookup unavailable',err)}
  return out;
 }
 function renderBulkSummary(entries){
  const box=$('pwDABulkResults');if(!box)return;
  box.replaceChildren();
  for(const entry of entries.slice(0,90)){
   const row=document.createElement('button');row.type='button';
   const name=document.createElement('b');name.textContent=itemFullId(entry.item)||entry.item.sourceText||'Dörrautomatik';
   const gs=resolveGs(entry.item),note=document.createElement('small');
   const suggested=!gs?chooseNearestGS(entry.item,linkCardCache):null;
   note.textContent=gs?' · Pil till '+formatGSPosition(gs):suggested?.g?' · Förslag '+formatGSPosition(suggested.g):' · Saknar säker pil – Koppla manuellt';
   row.append(name,note);
   row.onclick=()=>{const target=entry.item;closeDoor();if(gs)void ctx()?.locate?.(target);else openLink(target)};
   box.appendChild(row);
  }
  box.hidden=!entries.length;
 }
 async function scanObjectAutomations(reference=null){
  if(busy)return;
  const anchor=reference||getSelected(),api=ctx();
  if(!anchor||!loaded())return;
  const objectNo=objectFromItem(anchor);
  if(!/^\d+(?:-\d+)*$/.test(objectNo)){setBulkStatus('Första märkningen saknar ett giltigt objektnummer. Kontrollera ID-märkningen i checklistan.');return}
  const button=$('pwDABulkScan');busy=true;if(button)button.disabled=true;
  const groupButton=$('pwDABulkGroupRun');if(groupButton)groupButton.disabled=true;
  const models=api.getModels(),doorPages=new Set(api.getDoorCardPages?.()||[]);
  const cardCache=linkCardCache; // Read fresh card evidence on explicit scan; arrows reuse it afterwards.
  cardCache.clear();daTextSymbolCache.clear();
  let found=0,created=0,linked=0,unlinked=0,unknownModels=0;
  const hits=[],seen=[],allItems=api.getItems(),results=[];
  $('pwDABulkResults').hidden=true;$('pwDABulkResults').replaceChildren();
  setBulkStatus('Söker objektnummer '+objectNo+' – maskintyp läses från varje märkning…');
  try{
   const upper=Math.min(api.getDrawingLimit(),api.getPdf().numPages);
   for(let p=1;p<=upper;p++){
    if(doorPages.has(p)&&!gsOnPage(p).length)continue;
    const data=await api.readPageText(p);
    for(const row of automationRows(data.items)){
     for(const match of locateRowMatches(row,p,objectNo,'object')){
      const parsed=parseCandidateId(match.text,objectNo,models);
      if(parsed)hits.push({...parsed,page:p,rect:match.rect,source:'pdf-text'});
     }
    }
    if(p%4===0){setBulkStatus('Söker automatiker…');await new Promise(r=>setTimeout(r,0))}
   }
   setBulkStatus('Söker automatiker…');
   const excludedCards=new Set([...doorPages].filter(p=>!gsOnPage(p).length));
   hits.push(...await annotationCandidates(objectNo,excludedCards,models));
   // One physical marking might be present as both text and a colored PDF annotation.
   hits.sort((a,b)=>a.page-b.page||a.fullId.localeCompare(b.fullId,'sv',{numeric:true})||
    (a.source==='pdf-text'?-1:1));
   for(const hit of hits){
    if(seen.some(c=>c.page===hit.page&&c.fullId===hit.fullId&&nearPhysicalRect(c.rect,hit.rect)))continue;
    seen.push(hit);
   }
   for(let i=0;i<seen.length;i++){
    const hit=seen[i];
    let item=matchingExisting(hit,allItems);
    if(!item){
     const id='object-da@'+hit.page+':'+hit.fullId+':'+Math.round(hit.rect[0])+':'+Math.round(hit.rect[1]);
     item=allItems.find(o=>o.id===id);
     if(!item){
      item={id,page:hit.page,rect:hit.rect,objectNo:hit.objectNo,modelCode:hit.modelCode,
       model:hit.model,serialNumber:hit.serialNumber,sourceText:hit.fullId,sourceKind:'object-da',
       linkedGsId:'',slrDocuments:{},checks:{},notes:'',progress:0};
      api.addItem(item,false);created++;
      if(hit.unknownModel)unknownModels++;
     }
    }
    found++;
    results.push({item,existing:!!item.linkedGsId,linked:false});
    if(i%8===0)await new Promise(r=>setTimeout(r,0));
   }
   // Never overwrite existing operator-selected links or explicit disconnections.
   const pending=results.filter(x=>!x.item.gsLinkConfirmed&&!x.item.gsLinkDismissed);
   const proposals=[];
   for(const entry of pending)proposals.push({entry,choice:await proposeGS(entry.item,cardCache)});
   // Each drawing label gets its own button and nearest physical GS.
   proposals.sort((a,b)=>(a.choice.tier??9)-(b.choice.tier??9)||
    (a.choice.distance??Infinity)-(b.choice.distance??Infinity));
   for(const row of proposals){
    const choice=await proposeGS(row.entry.item,cardCache);
    if(choice.g)setGsLink(row.entry.item,choice.g,false);
    else {
     row.entry.reason=choice.reason;
     Object.assign(row.entry.item,{linkedGsId:'',linkedGsCode:'',linkedGsRect:null,gsReferenceId:''});
    }
   }
   for(const result of results){
    result.linked=!!resolveGs(result.item);
    if(result.linked)linked++;else unlinked++;
   }
   
 if(found)bulkScannedObjects.add(objectNo);
   api.save();api.redraw();renderBulkSummary(results);
   const message=found?'Hittade '+found+' automatiker · '+linked+' med GS-pil · '+unlinked+' att koppla manuellt':'Hittade inga automatiker för objektnummer '+objectNo+'. Kontrollera att ritningens märkningar börjar med '+objectNo+'-';
   setBulkStatus(message);api.setStatus(message);
   if(found)refreshFirstScanVisibility(anchor);
  }catch(err){console.error('[SmartMatch DA object scan]',err);setBulkStatus('Sökningen avbröts: '+(err?.message||err)+'. '+created+' nya märkningar har hittats. Försök igen.');api.save();api.redraw()}
  finally{busy=false;if(button)button.disabled=false;const currentGroupButton=$('pwDABulkGroupRun');if(currentGroupButton)currentGroupButton.disabled=false}
 }
 function setBulkStatus(message){
  lastBulkMessage=message||'';
  for(const id of ['pwDABulkStatus','pwDABulkGroupStatus']){
   const node=$(id);if(node){node.hidden=!message;node.textContent=message||''}
  }
 }
 function shouldShowFirstScan(o){
  if(!o)return false;
  const key=objectFromItem(o);
  if(!key||bulkScannedObjects.has(key))return false;
  // Migration: a drawing with many already detected DA positions is beyond
  // the one-example setup stage; the rescan action lives in group settings.
  return (ctx()?.getItems?.()||[]).filter(x=>objectFromItem(x)===key).length<=1;
 }
 function refreshFirstScanVisibility(o){
  const show=shouldShowFirstScan(o);
  const button=$('pwDABulkScan');if(button)button.hidden=!show;
  const divider=$('pwDADoorDivider');if(divider)divider.hidden=!show;
 }
 async function scanFromSidebar(objectNo){
  const items=ctx()?.getItems?.()||[];
  const matching=items.filter(o=>objectFromItem(o)===normalize(objectNo||''));
  // A GS-linked marker is the strongest reference when more than one DA is present.
  const anchor=matching.find(o=>o.linkedGsId)||matching[0];
  if(!anchor){setBulkStatus('Välj en automatik att söka från.');return}
  return scanObjectAutomations(anchor);
 }

 // Automations get the same transparent rectangle style for every family
 // member, but retain their own independent PDF coordinates and GS link.
 function selectedItem(id){return ctx()?.getItems?.().find(o=>o.id===id)||null}
 function markerLabel(o){return o?.sourceText||[o?.objectNo,o?.modelCode,o?.serialNumber].filter(Boolean).join('-')}
 function hideMovePreview(){if(movePreview){movePreview.remove();movePreview=null}}
 function stopMove(){editMarkerId='';moveGesture=null;hideMovePreview();$('pwStage').classList.remove('pwDAMoving')}
 async function beginMove(o){
  if(!loaded()||!o)return;
  stopManual();
  editMarkerId=o.id;editingArrowId='';
  await ctx().locate(o);
  $('pwStage').classList.add('pwDAMoving');
  ctx().setStatus('Flytta / storlek: tryck för att flytta '+markerLabel(o)+', eller dra ut en rektangel kring märkningen. Samma storlek används för märkningar i samma familj.');
 }
 async function rename(o){
  if(!o)return;
  const raw=await ctx().requestAction({title:'Ändra dörrautomatik',value:markerLabel(o),label:'Märkning',validate:v=>valid(normalize(v))?'':'Skriv hela objektnumret, till exempel 70154-78-24-11.'});
  if(raw===null||!ctx().getItems().includes(o))return;
  const name=normalize(raw),parts=name.split('-'),serialNumber=parts.pop(),modelCode=parts.pop(),objectNo=parts.join('-');
  o.objectNo=objectNo;o.modelCode=modelCode;o.serialNumber=serialNumber;o.sourceText=name;
  o.model=ctx().getModels().find(x=>x[0]===modelCode)?.[1]||o.model||modelCode;
  ctx().save();ctx().redraw();ctx().setStatus('Märkningen ändrad till '+name+' för denna egenkontroll.');
 }
 async function remove(o){
  if(!o)return;
  const result=await ctx().requestAction({title:'Ta bort dörrautomatik',message:'Ta bort '+markerLabel(o)+' och dess koppling? Ändringen gäller detta projekt.',confirm:true,action:'Ta bort',danger:true});
  if(result===null)return;
  const items=ctx().getItems(),idx=items.findIndex(x=>x.id===o.id);
  if(idx<0)return;items.splice(idx,1);
  if(editMarkerId===o.id)stopMove();if(editingArrowId===o.id)editingArrowId='';
  ctx().save();ctx().redraw();ctx().setStatus('Egenkontrollen är borttagen från projektet.');
 }
 function setGsLink(o,g,confirmed=true){
  // One GS for one physical automation. Duplicate records retain individual SLR and checks.
  // Only a manual decision may override another explicitly confirmed record.
  const peers=[o,...(ctx()?.getItems?.()||[]).filter(p=>p!==o&&samePhysicalAutomation(o,p))];
  for(const peer of peers){
   if(peer!==o&&!confirmed&&(peer.gsLinkConfirmed||peer.gsLinkDismissed))continue;
   peer.linkedGsId=g?.id||'';peer.linkedGsCode=g?.code||'';peer.linkedGsRect=g?.rect?.slice()||null;
   peer.gsLinkDismissed=!g;peer.gsLinkConfirmed=!!g&&confirmed;
   peer.gsReferenceId='';
   peer.arrowTip=null;peer.daArrowTip=null;
  }
 }
 function resolveGsRaw(o){
  if(!o||o.gsLinkDismissed)return null;
  const legacy=String(o.linkedGsId||'').match(/^(?:scan:|ocr:)?(GS\d+[A-ZÅÄÖ]*)@(\d+):(.+)$/i);
  if(!o.linkedGsCode&&legacy&&Number(legacy[2])===o.page){
   o.linkedGsCode=legacy[1];const rect=legacy[3].split(',').map(Number);
   if(rect.length===4&&rect.every(Number.isFinite))o.linkedGsRect=rect;
  }
  const positions=gsOnPage(o.page);
  let g=positions.find(p=>p.id===o.linkedGsId&&(!o.linkedGsCode||p.code===o.linkedGsCode));
  if(!g&&o.linkedGsCode){
   const candidates=positions.filter(p=>p.code===o.linkedGsCode);
   if(Array.isArray(o.linkedGsRect))g=candidates.find(p=>p.rect?.every((v,i)=>Math.abs(v-o.linkedGsRect[i])<1));
   if(!g&&candidates.length===1)g=candidates[0];
  }
  if(g){o.linkedGsId=g.id;o.linkedGsCode=g.code;o.linkedGsRect=g.rect.slice()}
  return g||null;
 }
 function linkIssue(o,g=resolveGsRaw(o)){
  if(!g)return 'Välj rätt GS-position';
  if(g.page!==o.page)return 'GS-positionen måste ligga på samma ritningssida';
  if(o.gsLinkConfirmed)return '';
  const card=linkCardCache.get(String(g.code||'').toUpperCase().replace(/\s+/g,''));
  if(!card)return 'Dörrkortet behöver läsas innan automatisk GS-koppling';
  if(card.state!=='yes')return 'Dörrkortet bekräftar inte dörrautomatik för denna GS';
  const issue=cardIssue(o,card);if(issue)return issue;
  const chosen=chooseNearestGS(o,linkCardCache);
  if(!chosen.g||!sameGsPosition(chosen.g,g))return 'Automatisk GS-koppling behöver räknas om eller väljas manuellt';
  return '';
 }
 function resolveGs(o){const g=resolveGsRaw(o);return g&&!linkIssue(o,g)?g:null}
 async function prepareLinkCards(){
  if(!loaded())return;
  const api=ctx(),pages=new Set((api.getItems?.()||[]).map(o=>o.page));
  const codes=[...new Set((api.getPositions?.()||[]).filter(g=>pages.has(g.page)&&/^GS\s*\d+/i.test(g.code||'')).map(g=>String(g.code).toUpperCase().replace(/\s+/g,'')))];
  for(const code of codes)await doorCardAutomation(code,linkCardCache);
  for(const page of pages)await readDASymbols(page);
 }
 // Correct stale automatic arrows from an earlier test version after loading
 // the door cards. NEVER override confirmed manual links/disconnections or
 // alter checks, notes or SLR documents. A missing local GS stays unlinked.
 function refreshExistingAutomaticGs(){
  const api=ctx();if(!api||!loaded())return;
  let changed=0;
  for(const item of api.getItems?.()||[]){
   if(item.gsLinkConfirmed||item.gsLinkDismissed)continue;
   const choice=chooseNearestGS(item,linkCardCache);
   if(!choice.g){
    // Do not retain an unsafe historic automatic GS as SLR source.
    if(item.linkedGsId||item.linkedGsCode){
     Object.assign(item,{linkedGsId:'',linkedGsCode:'',linkedGsRect:null,gsReferenceId:'',arrowTip:null,daArrowTip:null});
     changed++;
    }
    continue;
   }
   const saved=resolveGsRaw(item);
   if(saved&&sameGsPosition(saved,choice.g))continue;
   setGsLink(item,choice.g,false);
   changed++;
  }
  if(changed){api.save?.();api.setStatus?.('Uppdaterade '+changed+' automatiska GS-pilar till närmaste rätta dörrar.')}
 }
 function beginArrowAdjust(o){
  if(!o)return;
  if(!resolveGs(o)){openLink(o);ctx().setStatus('Koppla först rätt GS-position, sedan kan du justera pilen.');return}
  editingArrowId=o.id;stopMove();
  ctx().setFocusedAutomation?.(o.id);
  void ctx().locate(o).then(()=>ctx().redraw());
  ctx().setStatus('Justera pil: dra den blå runda punkten på ritningen till önskad kant på GS-stämpeln. Zooma gärna in för precision.');
 }
 function cancelArrowAdjust(){if(!editingArrowId)return;editingArrowId='';ctx()?.redraw?.()}
 function previewForMove(start,end){
  if(!movePreview){movePreview=document.createElement('div');movePreview.className='pmDragPreview';movePreview.setAttribute('aria-hidden','true');$('pwStage').appendChild(movePreview)}
  const left=Math.min(start.x,end.x),top=Math.min(start.y,end.y);
  Object.assign(movePreview.style,{left:left+'px',top:top+'px',
    width:Math.max(20,Math.abs(end.x-start.x))+'px',
    height:Math.max(18,Math.abs(end.y-start.y))+'px'});
  movePreview.textContent='';
 }
 function stageXY(e){const r=$('pwStage').getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
 async function commitMove(start,end,dragged){
  const item=selectedItem(editMarkerId);if(!item||!loaded())return;
  try{
   const pg=await ctx().getPdf().getPage(ctx().getPage()),vp=pg.getViewport({scale:ctx().getScale()});
   const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),old=ctx().viewportRect(vp,item.rect);
   let x,y,w,h;
   if(dragged){
    x=clamp(Math.min(start.x,end.x),0,vp.width);y=clamp(Math.min(start.y,end.y),0,vp.height);
    w=Math.min(Math.max(28,Math.abs(end.x-start.x)),vp.width-x);
    h=Math.min(Math.max(20,Math.abs(end.y-start.y)),vp.height-y);
   }else{
    w=Math.max(42,old.width);h=Math.max(23,old.height);
    x=clamp(end.x-w/2,0,vp.width-w);y=clamp(end.y-h/2,0,vp.height-h);
   }
   const corner=vp.convertToPdfPoint(x,y),other=vp.convertToPdfPoint(x+w,y+h);
   const next=[Math.min(corner[0],other[0]),Math.min(corner[1],other[1]),Math.max(corner[0],other[0]),Math.max(corner[1],other[1])];
   const prior=item.rect;
   item.rect=next;item.page=ctx().getPage();
   if(dragged){
    // Reuse the exact chosen rectangle size for other already-detected
    // members of this family, centered on their own original coordinates.
    // Their locations are never copied from this door.
    const dw=next[2]-next[0],dh=next[3]-next[1];
    for(const peer of ctx().getItems()){
     if(peer.id===item.id||family(markerLabel(peer))!==family(markerLabel(item)))continue;
     const [cx,cy]=point(peer.rect);
     peer.rect=[cx-dw/2,cy-dh/2,cx+dw/2,cy+dh/2];
    }
   }
   ctx().save();ctx().redraw();
   ctx().setStatus('Position och storlek sparad för '+markerLabel(item)+'. '+(dragged?'Samma markeringsstorlek används för övriga märkningar i familjen.':'Placeringen ändrades utan att rutan krympte.'));
  }catch(err){console.error(err);ctx().setStatus('Kunde inte ändra storleken: '+(err.message||err))}
  finally{stopMove()}
 }

 function bindMoveGestures(){
  const stage=$('pwStage');
  function eligible(e){return e.pointerType!=='mouse'||e.button===0}
  stage.addEventListener('pointerdown',e=>{
   if(!editMarkerId&&!manualPending)return;
   if(!eligible(e))return;
   e.preventDefault();e.stopImmediatePropagation();
   if(manualPending){
    if(manualReview){
     const target=e.target?.closest?.('[data-da-action]');
     const action=target?.dataset?.daAction;
     if(!action)return; // A stray tap must not move the reviewed rectangle.
     manualGesture={id:e.pointerId,type:'adjust',action,start:manualStagePoint(e),before:{...manualReview},offset:0};
    }else{
     const offset=e.pointerType==='touch'?58:0;
     manualGesture={id:e.pointerId,type:'draw',offset,start:manualStagePoint(e,offset)};
     updateManualCross(manualGesture.start);
     previewForMove(manualGesture.start,manualGesture.start);
    }
   }else moveGesture={id:e.pointerId,start:stageXY(e)};
   try{stage.setPointerCapture(e.pointerId)}catch(_){}
  },true);
  stage.addEventListener('pointermove',e=>{
   if(!editMarkerId&&!manualPending)return;
   if(manualPending){
    const gesture=manualGesture;
    if(!gesture){
     if(!manualReview&&e.pointerType==='mouse')updateManualCross(stageXY(e));
     return;
    }
    if(e.pointerId!==gesture.id)return;
    e.preventDefault();e.stopImmediatePropagation();
    const pos=manualStagePoint(e,gesture.offset||0);
    if(gesture.type==='adjust')moveManualReview(gesture,pos);
    else{
     updateManualCross(pos);previewForMove(gesture.start,pos);
     if(movePreview)movePreview.textContent=manualPending;
    }
    return;
   }
   if(!moveGesture||e.pointerId!==moveGesture.id)return;
   e.preventDefault();e.stopImmediatePropagation();
   const pt=stageXY(e);
   if(Math.hypot(pt.x-moveGesture.start.x,pt.y-moveGesture.start.y)>6)previewForMove(moveGesture.start,pt);
  },true);
  stage.addEventListener('pointerup',e=>{
   const gesture=manualPending?manualGesture:moveGesture;
   if(!gesture||e.pointerId!==gesture.id)return;
   e.preventDefault();e.stopImmediatePropagation();
   try{stage.releasePointerCapture(e.pointerId)}catch(_){}
   manualGesture=null;moveGesture=null;
   if(manualPending){
    if(gesture.type==='draw'){
     const end=manualStagePoint(e,gesture.offset||0);
     if(!manualReviewFromPoints(gesture.start,end)){
      hideMovePreview();ctx().setStatus('Dra en ruta runt märkningen, inte bara ett tryck.');
     }
    }else renderManualReview();
   }else{
    const end=stageXY(e),start=gesture.start;hideMovePreview();
    void commitMove(start,end,Math.hypot(end.x-start.x,end.y-start.y)>=12);
   }
  },true);
  stage.addEventListener('pointercancel',()=>{
   if(manualPending){manualGesture=null;hideMovePreview();if(manualReview)renderManualReview()}
   if(editMarkerId)stopMove();
  },true);
  // iOS Safari also fires touchstart/touchmove. The drawing's own touch-pan
  // handlers run on the viewer; intercept them only while placing DA labels.
  for(const eventName of ['touchstart','touchmove','touchend']){
   $('pwViewer').addEventListener(eventName,e=>{
    if(!manualPending||!stage.contains(e.target))return;
    e.preventDefault();e.stopImmediatePropagation();
   },{capture:true,passive:false});
  }
  document.addEventListener('keydown',e=>{
   if(e.key!=='Escape')return;
   if(manualPending)stopManual('Placeringen avbröts.');
   else if(editMarkerId)stopMove();
  });
 }


 function typedGsCode(value){
  const compact=String(value||'').toUpperCase().replace(/[–—−]/g,'-').replace(/[\s_/-]+/g,'');
  return /^GS\d{1,6}[A-ZÅÄÖ]{0,3}$/.test(compact)?compact:'';
 }
 function gsCandidates(o,code='',targetPage=o.page){
  return gsOnPage(targetPage).filter(g=>!code||g.code===code).map(g=>{
   const card=linkCardCache.get(String(g.code||'').toUpperCase());
   const occupied=false;
   const problem=card?cardIssue(o,card):'Dörrkortet behöver läsas';
   const familyNote=!problem?gsFamilyNote(o,card):'';
   const p=point(o.rect),q=point(g.rect);
   return {g,occupied,problem,familyNote,verified:!problem&&card?.state==='yes',
    distance:Math.hypot(p[0]-q[0],p[1]-q[1])};
  }).sort((a,b)=>Number(b.verified)-Number(a.verified)||Number(a.occupied)-Number(b.occupied)||a.distance-b.distance);
 }
 function formatGSPosition(g){
  return g?String(g.code||'GS')+' · position '+(g.position||'–')+' · sida '+g.page:'Ingen GS-position vald';
 }
 function formatDAIdentification(o){
  const models=ctx()?.getModels?.()||[];
  return 'Objektnummer '+(o.objectNo||'–')+' · Maskintyp '+machineTypeLabel(itemMachineCode(o,models),models)+' · Antal '+(o.serialNumber||'–');
 }
 function updateLinkSummary(o,g,saved=false){
  const box=$('pwDALinkSummary'),title=$('pwDALinkSummaryTitle'),details=$('pwDALinkSummaryInfo');
  if(!box||!title||!details)return;
  title.textContent=(saved?'Kopplad: ':'Vald GS: ')+formatGSPosition(g);
  details.textContent='Dörrautomatik '+itemFullId(o)+' · '+formatDAIdentification(o);
  box.dataset.linked=saved?'yes':'no';
 }
 function populateGsSelect(o,id=''){
  const select=$('pwDAGsSelect');select.replaceChildren();
  const blank=document.createElement('option');blank.value='';blank.textContent='Välj fysisk GS-position';select.appendChild(blank);
  for(const row of gsCandidates(o)){
   const option=document.createElement('option');option.value=row.g.id;
   option.textContent=formatGSPosition(row.g)+(row.problem?' · '+row.problem:row.familyNote?' · Kompatibel ED-familj':' · GS-position på ritningen');
   option.disabled=row.occupied;select.appendChild(option);
  }
  select.value=[...select.options].some(opt=>opt.value===id&&!opt.disabled)?id:'';
 }
 function renderTypedCandidates(o){
  const field=$('pwDAGsManualCode'),pageField=$('pwDAGsManualPage'),feedback=$('pwDAGsManualFeedback');
  const list=$('pwDAGsManualMatches'),select=$('pwDAGsSelect');
  list.replaceChildren();
  const typed=String(field.value||'').trim(),code=typedGsCode(typed),target=Number(pageField.value);
  if(!Number.isInteger(target)||target<1||target>ctx().getDrawingLimit()){feedback.textContent='Ange en giltig ritningssida.';return}
  if(typed&&!code){feedback.textContent='Skriv GS-nummer, exempelvis GS1 eller GS11.';return}
  if(target!==o.page){feedback.textContent='Pilen kan bara koppla GS på samma ritningssida som automatiken (sida '+o.page+').';return}
  const rows=gsCandidates(o,code,target);
  if(!rows.length){feedback.textContent=(code||'GS')+' hittades inte på sida '+target+'. Peka ut den på ritningen eller kontrollera numret.';return}
  feedback.textContent=rows.length+' fysisk(a) GS-position(er) hittade. Välj rätt.';
  for(const row of rows.slice(0,24)){
   const button=document.createElement('button');button.type='button';button.className='pwDAGsManualChoice';
   const title=document.createElement('strong');title.textContent=formatGSPosition(row.g);
   const note=document.createElement('small');note.textContent=row.problem||row.familyNote||'GS-position på ritningen';
   button.append(title,note);
   if(row.occupied){button.disabled=true;button.title='Redan kopplad'}
   else button.onclick=()=>{
    select.value=row.g.id;
    updateLinkSummary(o,row.g,resolveGs(o)?.id===row.g.id);
    feedback.textContent='Vald: '+formatGSPosition(row.g)+'. '+(row.problem||row.familyNote||'Verifierad')+'. Spara när detta stämmer.';
    list.querySelectorAll('button').forEach(el=>el.classList.remove('selected'));
    button.classList.add('selected');
   };
   if(select.value===row.g.id)button.classList.add('selected');
   list.appendChild(button);
  }
 }
 function gsLinkStatus(o){
  const saved=resolveGsRaw(o),linked=resolveGs(o),guess=chooseNearestGS(o,linkCardCache);
  if(saved&&conflictingPhysicalGS(o,saved))
   return 'GS-konflikt: samma fysiska automatik har flera sparade GS. Kontrollera GS manuellt.';
  if(saved&&guess.g&&!sameGsPosition(saved,guess.g))
   return 'Avvikelse: sparad '+formatGSPosition(saved)+' · föreslagen '+formatGSPosition(guess.g)+'. Kontrollera via ⋯ → Koppla / ändra GS.';
  if(linked)return 'GS-koppling: '+formatGSPosition(linked)+' · matchar automatisk dörrkortskontroll.';
  if(saved)return 'Sparad '+formatGSPosition(saved)+' behöver kontrolleras: '+linkIssue(o,saved);
  if(guess.g)return 'Ingen sparad GS · föreslagen '+formatGSPosition(guess.g);
  return 'Ingen verifierad GS · '+(guess.reason||'Koppla manuellt.');
 }
 function refreshGsSuggestion(o){
  const label=$('pwDAGsSuggestion'),saved=resolveGsRaw(o),guess=chooseNearestGS(o,linkCardCache);
  label.textContent=gsLinkStatus(o);
  const pick=$('pwDAGsUseSuggestion');
  if(pick){
   const differs=!!guess.g&&(!saved||!sameGsPosition(saved,guess.g));
   pick.hidden=!differs;
   pick.dataset.gsId=differs?guess.g.id:'';
  }
 }
 async function loadGsEvidence(o){
  const selectedId=o.id;
  try{
   const codes=[...new Set(gsOnPage(o.page).map(g=>String(g.code||'').toUpperCase()))];
   await readDASymbols(o.page);
   for(const code of codes)await doorCardAutomation(code,linkCardCache);
   if(getSelected()?.id!==selectedId||!$('pwDADoorDialog').open)return;
   const current=$('pwDAGsSelect').value;
   populateGsSelect(o,current);
   refreshGsSuggestion(o);renderTypedCandidates(o);
   const live=$('pwDAGsLiveStatus');if(live)live.textContent=gsLinkStatus(o);
   if(!$('pwDAGsEdit').hidden)$('pwDADoorSub').textContent=gsLinkStatus(o);
   ctx().redraw();
  }catch(err){$('pwDAGsManualFeedback').textContent='Dörrkort kunde inte läsas: '+String(err?.message||err)}
 }

  function openDoor(o,mode='choices'){
  if(!o)return;selectedId=o.id;
  const linking=mode==='link',edit=$('pwDAGsEdit'),choices=$('pwDADoorChoices');
  if(edit)edit.hidden=!linking;
  if(choices)choices.hidden=linking;
  $('pwDADoorTitle').textContent=itemFullId(o)||[o.objectNo,o.modelCode,o.serialNumber].filter(Boolean).join('-');
  $('pwDADoorSub').textContent=linking?'Koppla automatik till rätt GS-position':'Objekt '+(o.objectNo||'–')+' · Maskin '+(o.model||o.modelCode||'–')+' · antal '+(o.serialNumber||'–');
  setBulkStatus('');$('pwDABulkResults').replaceChildren();$('pwDABulkResults').hidden=true;
  refreshFirstScanVisibility(o);
  const linked=resolveGs(o);
  populateGsSelect(o,linked?.id||'');
  if(linked)$('pwDADoorSub').textContent='Kopplad till '+formatGSPosition(linked);
  else if(o.linkedGsCode)$('pwDADoorSub').textContent='Tidigare GS-koppling behöver kontrolleras: '+linkIssue(o);
  $('pwDAGsManualCode').value='';
  $('pwDAGsManualPage').value=String(o.page);
  $('pwDAGsManualPage').max=String(ctx().getDrawingLimit());
  $('pwDAGsManualFeedback').textContent='';
  updateLinkSummary(o,linked,!!linked);refreshGsSuggestion(o);
  renderTypedCandidates(o);
  $('pwDAGsSelect').onchange=()=>{
   const g=gsOnPage(o.page).find(p=>p.id===$('pwDAGsSelect').value)||null;
   updateLinkSummary(o,g,!!linked&&g?.id===linked.id);
   $('pwDAGsManualFeedback').textContent=g?('Vald '+formatGSPosition(g)+'; verifieras vid sparning.'):'Välj rätt GS-position.';
   renderTypedCandidates(o);
  };
  const live=$('pwDAGsLiveStatus');if(live)live.textContent='Kontrollerar GS och dörrkort…';
  if(!$('pwDADoorDialog').open)$('pwDADoorDialog').showModal();
  void loadGsEvidence(o);
 }
  function openLink(o){openDoor(o,'link')}
 function closeDoor(){if($('pwDADoorDialog').open)$('pwDADoorDialog').close()}
 function chooseOnDrawing(){
  const item=getSelected();if(!item)return;
  if(!loaded()){ctx()?.setStatus?.('Ingen ritning är öppen.');return}
  pendingGSItemId=item.id;closeDoor();
  ctx().setStatus('Välj rätt GS-position på ritningen för '+(item.sourceText||item.id)+'. Bekräfta kopplingen när du tryckt på GS.');
  void ctx()?.locate?.(item);
 }
 async function saveLink(){
  const o=getSelected();if(!o)return;
  const g=gsOnPage(o.page).find(p=>p.id===$('pwDAGsSelect').value)||null;
  const typed=String($('pwDAGsManualCode').value||'').trim(),code=typedGsCode(typed);
  const target=Number($('pwDAGsManualPage').value);
  const feedback=$('pwDAGsManualFeedback');
  if(typed&&!code){feedback.textContent='Skriv ett GS-nummer, exempelvis GS1.';return}
  if(target!==o.page){feedback.textContent='GS-pilen måste ligga på samma ritningssida som automatiken: sida '+o.page+'.';return}
  if(!g){feedback.textContent='Välj fysisk GS-position innan du sparar.';return}
  if(code&&code!==g.code){feedback.textContent='Du skrev '+code+' men valde '+g.code+'. Välj rätt position.';return}
  if(!await confirmValidLink(o,g))return;
  setGsLink(o,g);ctx().save();closeDoor();ctx().redraw();
  ctx().setStatus(itemFullId(o)+' är kopplad till '+formatGSPosition(g)+'.');
 }
  async function confirmValidLink(o,g){
  if(!g||g.page!==o.page||!gsOnPage(o.page).some(p=>p.id===g.id))return false;
  const card=await doorCardAutomation(String(g.code||'').toUpperCase().replace(/\s+/g,''),linkCardCache);
  const warning=card.state!=='yes'?'Dörrkortet bekräftar inte dörrautomatik på '+g.code+'.':cardIssue(o,card);
  if(warning){
   const response=await ctx().requestAction({title:'Bekräfta manuell GS-koppling',
    message:warning+' Du kan ändå välja denna fysiska dörr om du har kontrollerat den på plats. Koppla '+itemFullId(o)+' till '+g.code+'?',
    confirm:true,action:'Koppla ändå'});
   if(response===null)return false;
  }
  return true;
 }
 const SLR_SECTION_TITLES=['Riskanalys','Beskrivning av maskin','Loggbok','Tillverkarens försäkran','Produktlista','Egenkontroll','CE-skylt'];
 function slrEntryState(entry){
  if(typeof entry==='string')return ['done','doing'].includes(entry)?entry:'';
  if(!entry||typeof entry!=='object')return '';
  if(entry.status==='done'||entry.state==='done'||entry.completed===true)return 'done';
  if(entry.status==='doing'||entry.state==='doing')return 'doing';
  return '';
 }
 function slrProgress(item){
  if(window.SmartMatchSLRTest?.getProgress)return window.SmartMatchSLRTest.getProgress(item);
  let total=0;const docs=item?.slrDocuments||{};
  for(const name of SLR_SECTION_TITLES){
   const status=slrEntryState(docs[name]);
   total+=status==='done'?1:status==='doing'?.5:0;
  }
  return Math.round(total/SLR_SECTION_TITLES.length*100);
 }

 // Future SLR data must come from a verified GS and its own door card.
 function verifiedSLRSource(o){
  const gs=resolveGs(o);
  if(!gs)return {gs:null,reason:'Ingen säker GS-koppling. Koppla rätt GS innan dörrkortets uppgifter används i SLR.'};
  // A previously confirmed GS can predate the corrected physical matching.
  // Show the disagreement and do NOT offer it as a trusted SLR source.
  const suggested=chooseNearestGS(o,linkCardCache);
  if(suggested.g&&!sameGsPosition(gs,suggested.g))
   return {gs:null,reason:'Sparad '+gs.code+' avviker från verifierat förslag '+suggested.g.code+'. Kontrollera GS-kopplingen innan uppgifter används i SLR.'};
  if(conflictingPhysicalGS(o,gs))
   return {gs:null,reason:'Samma fysiska automatik har motstridiga sparade GS. Välj rätt GS manuellt.'};
  const card=linkCardCache.get(String(gs.code||'').toUpperCase().replace(/\s+/g,''));
  if(!card?.hasCard||card.state!=='yes')
   return {gs:null,reason:'GS-kopplingen saknar verifierat dörrkort med dörrautomatik.'};
  const issue=cardIssue(o,card);
  if(issue)return {gs:null,reason:issue};
  const cardPage=Number(String(card.pageKey||'').split(':')[0])||null;
  return {gs,cardPage,cardPages:String(card.pageKey||'').split(':').map(Number).filter(n=>Number.isInteger(n)&&n>0),reason:'',confirmed:!!o.gsLinkConfirmed};
 }
 async function openSLR(o){
  if(!o)return;
  if(window.SmartMatchSLRTest?.open){
   try{await prepareLinkCards()}catch(err){console.warn('[SLR test] Dörrkortsläsning',err)}
   return window.SmartMatchSLRTest.open(o,ctx(),verifiedSLRSource(o));
  }
  const sourceDisplay=$('pwSLRSource');
  if(sourceDisplay)sourceDisplay.textContent='Kontrollerar GS-koppling och dörrkort…';
  if(!$('pwSLRDialog').open)$('pwSLRDialog').showModal();
  try{await prepareLinkCards()}catch(err){console.warn('[SmartMatch SLR source]',err)}
  if(!$('pwSLRDialog').open)return;
  $('pwSLRTitle').textContent='SLR · '+[o.objectNo,o.modelCode,o.serialNumber].join('-');
  const list=$('pwSLRList'),hint=$('pwSLRHint');list.replaceChildren();
  if(!o.slrDocuments||typeof o.slrDocuments!=='object')o.slrDocuments={};
  const source=verifiedSLRSource(o);
  const sourceLabel=source.gs?
   'Verifierad GS-källa: '+formatGSPosition(source.gs)+(source.cardPage?' · dörrkort sida '+source.cardPage:'')+'.':
   'Ingen verifierad GS-källa: '+source.reason;
  if(sourceDisplay)sourceDisplay.textContent=sourceLabel;
  const updateHint=()=>{hint.textContent=sourceLabel+' SLR '+slrProgress(o)+'% · manuell arbetsuppföljning. Mallarna skapas senare; även 100% är inte automatiskt godkänd CE-dokumentation.'};
  for(const name of SLR_SECTION_TITLES){
   const wrap=document.createElement('div');wrap.className='pwSLRRow';
   const b=document.createElement('button'),strong=document.createElement('strong'),small=document.createElement('small');
   b.type='button';b.className='pwSLRSection';strong.textContent=name;small.textContent='Dokumentmall skapas senare';
   b.append(strong,small);
   b.onclick=()=>{
    list.querySelectorAll('.pwSLRSection').forEach(node=>node.classList.remove('active'));
    b.classList.add('active');
    hint.textContent=sourceLabel+' '+name+': välj arbetsstatus. SLR totalt '+slrProgress(o)+'%. Dokumentmallar skapas senare.';
   };
   const label=document.createElement('label');label.className='pwSLRStateLabel';label.textContent='Dokumentstatus';
   const select=document.createElement('select');select.className='pwSLRStateSelect';
   select.setAttribute('aria-label','Dokumentstatus för '+name);
   for(const [value,text]of [['','Ej påbörjad'],['doing','Pågår'],['done','Kontrollerad / klar']]){
    const option=document.createElement('option');option.value=value;option.textContent=text;select.appendChild(option);
   }
   select.value=slrEntryState(o.slrDocuments[name]);
   select.onchange=()=>{
    const prior=o.slrDocuments[name],prev=prior&&typeof prior==='object'&&!Array.isArray(prior)?prior:{};
    o.slrDocuments[name]={...prev,status:select.value};
    ctx().save();ctx().redraw();updateHint();
    ctx().setStatus('SLR '+slrProgress(o)+'% · '+name+' · status sparad.');
   };
   label.appendChild(select);wrap.append(b,label);list.appendChild(wrap);
  }
  updateHint();
  if(!$('pwSLRDialog').open)$('pwSLRDialog').showModal();
 }
 function drawArrows(viewport,items,renderPage){
  const svg=$('pwDAArrows');if(!svg)return;
  svg.classList.toggle('pwDAArrowEdit',!!editingArrowId);
  svg.replaceChildren();svg.setAttribute('width',viewport.width);svg.setAttribute('height',viewport.height);
  svg.setAttribute('viewBox','0 0 '+viewport.width+' '+viewport.height);
  if(renderPage!==ctx().getPage())return;
  const ns='http://www.w3.org/2000/svg',make=(tag)=>document.createElementNS(ns,tag);
  const defs=make('defs'),marker=make('marker');
  marker.id='pwDALinkArrowhead';
  [['markerWidth','7'],['markerHeight','7'],['refX','6'],['refY','3'],['orient','auto']].forEach(([k,v])=>marker.setAttribute(k,v));
  const tri=make('path');tri.setAttribute('d','M0 0 L6 3 L0 6 Z');tri.setAttribute('fill','#176f9b');
  marker.appendChild(tri);defs.appendChild(marker);svg.appendChild(defs);
  const middle=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
  function edge(r,toward){
   const center=middle(r),dx=toward.x-center.x,dy=toward.y-center.y;
   if(!dx&&!dy)return center;
   const halfW=Math.max(1,r.width/2),halfH=Math.max(1,r.height/2);
   const ratio=Math.min(dx?halfW/Math.abs(dx):Infinity,dy?halfH/Math.abs(dy):Infinity);
   return {x:center.x+dx*ratio,y:center.y+dy*ratio};
  }
  function tipFromRect(rect,from,stored){
   if(!stored||!Number.isFinite(stored.u)||!Number.isFinite(stored.v))return edge(rect,from);
   const u=Math.max(0,Math.min(1,stored.u)),v=Math.max(0,Math.min(1,stored.v));
   return {x:rect.left+rect.width*u,y:rect.top+rect.height*v};
  }
  function snapTip(rect,x,y){
   let u=Math.max(0,Math.min(1,(x-rect.left)/Math.max(1,rect.width)));
   let v=Math.max(0,Math.min(1,(y-rect.top)/Math.max(1,rect.height)));
   const nearest=Math.min(u,1-u,v,1-v);
   if(nearest===u)u=0;else if(nearest===1-u)u=1;else if(nearest===v)v=0;else v=1;
   return {u,v};
  }
  // Duplicate historic records retain their independent checks, but only one physical arrow is drawn.
  const distinct=[];
  const samePhysicalSource=(a,b)=>{
   if(a.page!==b.page||itemFullId(a)!==itemFullId(b))return false;
   const [ax0,ay0,ax1,ay1]=a.rect,[bx0,by0,bx1,by1]=b.rect;
   const overlapX=Math.max(0,Math.min(ax1,bx1)-Math.max(ax0,bx0));
   const overlapY=Math.max(0,Math.min(ay1,by1)-Math.max(ay0,by0));
   const smallArea=Math.min(Math.abs((ax1-ax0)*(ay1-ay0)),Math.abs((bx1-bx0)*(by1-by0)));
   return smallArea>0&&overlapX*overlapY/smallArea>=.45;
  };
  for(const item of items){
   const index=distinct.findIndex(x=>samePhysicalSource(x,item));
   if(index<0){distinct.push(item);continue}
   const weight=o=>(resolveGs(o)?100:0)+(o.gsLinkConfirmed?20:0)+Object.values(o.checks||{}).filter(Boolean).length+Object.keys(o.slrDocuments||{}).length;
   if(weight(item)>weight(distinct[index]))distinct[index]=item;
  }
  for(const item of distinct){
   const gs=resolveGs(item);
   if(!gs||item.page!==renderPage||conflictingPhysicalGS(item,gs))continue;
   const a=ctx().viewportRect(viewport,item.rect),b=ctx().viewportRect(viewport,gs.rect);
   let tip=tipFromRect(b,middle(a),item.arrowTip),start=edge(a,tip);
   const line=make('path');
   const setLine=()=>{
    start=edge(a,tip);
    line.setAttribute('d','M'+start.x+','+start.y+' L'+tip.x+','+tip.y);
   };
   setLine();
   line.setAttribute('stroke','#176f9b');line.setAttribute('stroke-width','1.7');
   line.setAttribute('fill','none');line.setAttribute('marker-end','url(#pwDALinkArrowhead)');
   line.setAttribute('stroke-linecap','round');
   svg.appendChild(line);
   if(item.id!==editingArrowId)continue;
   // The only visible edit affordance is at the arrow tip. It can be
   // repositioned on touch screens without covering the GS text.
   const handle=make('circle');
   handle.setAttribute('cx',tip.x);handle.setAttribute('cy',tip.y);
   handle.setAttribute('r','9');handle.setAttribute('fill','#fff7d8');
   handle.setAttribute('stroke','#176f9b');handle.setAttribute('stroke-width','2');
   handle.setAttribute('class','pwDAArrowHandle');
   handle.setAttribute('aria-label','Dra pilspets på kanten av '+gs.code);
   handle.style.pointerEvents='auto';handle.style.touchAction='none';
   const locatePointer=e=>{
    const bounds=svg.getBoundingClientRect();
    return {x:(e.clientX-bounds.left)*viewport.width/Math.max(1,bounds.width),
      y:(e.clientY-bounds.top)*viewport.height/Math.max(1,bounds.height)};
   };
   let dragging=false;
   handle.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();e.stopPropagation();dragging=true;
    try{handle.setPointerCapture(e.pointerId)}catch(_){}
   });
   handle.addEventListener('pointermove',e=>{
    if(!dragging)return;
    e.preventDefault();e.stopPropagation();
    const p=locatePointer(e),uv=snapTip(b,p.x,p.y);
    tip=tipFromRect(b,middle(a),uv);setLine();
    handle.setAttribute('cx',tip.x);handle.setAttribute('cy',tip.y);
   });
   handle.addEventListener('pointerup',e=>{
    if(!dragging)return;dragging=false;
    e.preventDefault();e.stopPropagation();
    const p=locatePointer(e),uv=snapTip(b,p.x,p.y);
    item.arrowTip=uv;editingArrowId='';
    ctx().save();ctx().redraw();
    ctx().setStatus('Pilens spets sparad på kanten av '+gs.code+'. Du kan justera igen via ⋯.');
   });
   handle.addEventListener('pointercancel',()=>{dragging=false;editingArrowId='';ctx().redraw()});
   svg.appendChild(handle);
  }
 }
 // Always wire the entry button during script evaluation. This fixes the
 // v36.5 dead-button issue when the scan never reached the late init call.
 const entry=$('pwDALinkTool');
 if(entry)entry.addEventListener('click',openTool);

 function onGSClick(g){
  if(!pendingGSItemId)return false;
  const item=ctx()?.getItems().find(x=>x.id===pendingGSItemId);
  pendingGSItemId='';
  if(!item)return true;
  if(g.page!==item.page){
   ctx()?.setStatus('GS-positionen måste ligga på samma ritningssida som märkningen.');
   return true;
  }
  void (async()=>{
   const result=await ctx().requestAction({title:'Bekräfta koppling',message:'Koppla '+item.sourceText+' till '+g.code+' · position '+(g.position||'?')+'?',confirm:true,action:'Koppla'});
   if(result===null||!ctx().getItems().includes(item)||!ctx().getPositions().some(p=>p.id===g.id)||!await confirmValidLink(item,g))return;
   setGsLink(item,g);ctx().save();ctx().redraw();
   ctx().setStatus(item.sourceText+' är kopplad till '+g.code+'. Pilen pekar från dörrautomatiken mot rätt GS-position.');
  })();
  return true;
 }

 function init(c){
  if(c)context=c;
  if(controlsReady)return;
  controlsReady=true;
  // Saving the first placed label starts the all-page object scan.
  $('pwDAManual').onclick=manual;
  $('pwDAExample').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();manual()}});
  $('pwDALinkClose').onclick=closeTool;
  $('pwDADoorClose').onclick=closeDoor;
  $('pwDASaveLink').onclick=saveLink;
  const suggested=$('pwDAGsUseSuggestion');
  if(suggested)suggested.onclick=()=>{
   const o=getSelected(),id=suggested.dataset.gsId;
   if(!o||!id)return;
   const g=gsOnPage(o.page).find(p=>p.id===id);
   if(!g)return;
   $('pwDAGsSelect').value=g.id;
   updateLinkSummary(o,g,false);
   $('pwDAGsManualFeedback').textContent='Förslaget '+formatGSPosition(g)+' är valt. Tryck Spara GS-koppling för att bekräfta ändringen.';
   renderTypedCandidates(o);
  };
  $('pwDAChooseOnDrawing').onclick=chooseOnDrawing;
  for(const name of ['pwDAGsManualCode','pwDAGsManualPage'])
   $(name).addEventListener('input',()=>{const item=getSelected();if(item)renderTypedCandidates(item)});
  $('pwDAGsManualCode').addEventListener('keydown',e=>{
   if(e.key==='Enter'){e.preventDefault();const item=getSelected();if(item)renderTypedCandidates(item)}
  });
  $('pwDAGsReveal').onclick=()=>{
   const item=getSelected();if(!item)return;
   const gs=gsOnPage(item.page).find(p=>p.id===$('pwDAGsSelect').value);
   if(!gs){$('pwDAGsManualFeedback').textContent='Välj GS-positionen du vill visa.';return}
   closeDoor();void ctx().locate(gs);
   ctx().setStatus('Visar '+formatGSPosition(gs)+'. Inget har kopplats om.');
  };
  $('pwDARevision').onclick=()=>{const o=getSelected();closeDoor();if(o)ctx().openRevision(o)};
  $('pwDASLR').onclick=()=>{const o=getSelected();closeDoor();if(o)void openSLR(o)};
  $('pwDABulkScan').onclick=()=>{
   const anchor=getSelected();
   if(!anchor){setBulkStatus('Välj den placerade automatiken att söka från.');return}
   void scanObjectAutomations(anchor);
  };
  $('pwSLRClose').onclick=()=>{if($('pwSLRDialog').open)$('pwSLRDialog').close()};
  $('pwDARevisionSave').onclick=async()=>{
   const button=$('pwDARevisionSave');
   if(button.disabled)return;
   button.disabled=true;
   try{
    ctx().save();
    const flushed=await window.SmartMatchSession?.flushDraft?.();
    if(flushed===false){
     ctx().setStatus('Revisionsändringarna kunde inte sparas lokalt. Försök igen eller spara projekt-PDF.');
     void window.SmartMatchAppBridge?.requestAction?.({title:'Information',confirm:true,action:'OK',message:'Den lokala sparningen misslyckades. Revisionen är kvar öppen. Försök igen eller spara projekt-PDF.'});
     return;
    }
    await ctx().closeRevision();
    if($('pwAutomationDialog').open)return;
    ctx().setStatus('Revisionen är sparad lokalt. Spara projekt-PDF separat när du vill dela filen.');
   }catch(err){
    console.error('[SmartMatch] Revision klar kunde inte sparas',err);
    ctx().setStatus('Kunde inte spara revisionen lokalt: '+(err?.message||err));
    void window.SmartMatchAppBridge?.requestAction?.({title:'Information',confirm:true,action:'OK',message:'Revisionen kunde inte sparas lokalt. Kontrollera lagringsutrymmet och försök igen.'});
   }finally{button.disabled=false}
  };
  $('pwDAExportRevision').onclick=()=>{const o=ctx().selectedRevision();if(o)ctx().exportRevision(o)};
  $('pwDALinkDialog').addEventListener('cancel',e=>{e.preventDefault();closeTool()});
  $('pwDADoorDialog').addEventListener('cancel',e=>{e.preventDefault();closeDoor()});
  bindMoveGestures();
 }
 init(null);
 return {init,getSLRProgress:slrProgress,getLinkedPosition:resolveGs,getSLRSource:verifiedSLRSource,openDoor,openLink,drawArrows,onGSClick,beginMove,rename,remove,beginArrowAdjust,
  scanFromSidebar,cancelArrowAdjust,getBulkStatus:()=>lastBulkMessage,isBulkScanning:()=>busy,
  async onProjectOpened(){linkCardCache.clear();daTextSymbolCache.clear();stopManual();stopMove();editingArrowId='';selectedId='';pendingGSItemId='';exampleFamily='';lastBulkMessage='';bulkScannedObjects.clear();ctx()?.getItems?.().forEach(resolveGsRaw);if(loaded()){ctx()?.redraw?.();void prepareLinkCards().then(()=>{refreshExistingAutomaticGs();ctx()?.redraw?.()}).catch(err=>console.warn('DA card verification',err))}}};
})();

