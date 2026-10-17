/* Isolated card reading and reviewed drawing matches, Avläsning TEST 9.1. */
(()=>{
 'use strict';
 const base=new URL('./',document.currentScript.src),templatesKey='tillsyno-read-test-templates:v9.1';
 const clone=o=>JSON.parse(JSON.stringify(o));
 const clean=s=>String(s||'').normalize('NFC').replace(/\s+/g,' ').trim();
 const norm=s=>window.SmartMatchAppBridge?.normalizeCardLabel(s)||'';
 const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
 let active=null,ui=null,workerPromise=null,libraryPromise=null,opening=false;
 let doc=null,example=1,zoom=1,rects={},mode='code',gesture=null,prepared={},preparedChecks={},confirmed=false,busy=false,resolveChoice=null,sourceId='',cancelVersion=0;
 let view='card',drawingPage=1,drawingSample=null,matchRun=null,focusedHit=null,discovery=null,annotationIndex=[],metadataWarning='';
 let pageTextCache=new WeakMap(),regionReadCache=new WeakMap();
 let productsOnly=false,productsRead=false,previousRead=null;
 let readingProgress=null,readContext={},readVersion=0;
 const touchPoints=new Map();
 let pinch=null,pinchSession=false,zoomTimer=null,zoomDirty=false;
 const $=id=>document.getElementById(id);
 function parsePages(value,total){
  const result=new Set();
  for(const part of String(value).split(/[,;\s]+/).filter(Boolean)){
   const m=part.match(/^(\d+)(?:-(\d+))?$/);if(!m)throw Error('Ange sidor som 2, 4-8.');
   const a=Number(m[1]),b=Number(m[2]||m[1]);
   if(a<1||b<a||b>total)throw Error('Dörrkortssidor måste vara mellan 1 och '+total+'.');
   for(let n=a;n<=b;n++)result.add(n);
  }
  if(!result.size)throw Error('Välj minst en dörrkortssida.');
  return [...result].sort((a,b)=>a-b);
 }
 function candidates(value){return window.SmartMatchReadCodes.candidates(value);}
 function rowKey(text,index){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return 'read:'+index+':'+(h>>>0).toString(36);}
 const isWorkHeading=t=>/^[\p{Lu}][\p{Lu}\s/–-]{1,31}$/u.test(t)&&t.split(/\s+/).length<=3;
 function workRows(text,knownLabels=[]){
  const rows=String(text||'').split('\n').map(clean).filter(t=>t&&!/^(?:[-–—|\s]+|KOMPONENT\s+PRODUKT(?:\s+.*)?|BESLAGSKOD\s*:?.*|DÖRRKORT\s*:?.*|Kontrollerad\s*:.*)$/i.test(t));
  const known=new Set(knownLabels);
  const headers=rows.map((t,i)=>i+1<rows.length&&(known.size?known.has(t)&&!known.has(rows[i+1]):isWorkHeading(t)&&!isWorkHeading(rows[i+1])));
  if(headers.filter(Boolean).length<2)return rows;
  const grouped=[];
  for(let i=0;i<rows.length;i++){
   if(!headers[i]){grouped.push(rows[i]);continue;}
   const label=rows[i],values=[];
   while(i+1<rows.length&&!headers[i+1])values.push(rows[++i]);
   grouped.push(label+' · '+values.join(' '));
  }
  return grouped;
 }
 const searchMode=()=>['text','full'].includes($('rtImageMode')?.value)?$('rtImageMode').value:'auto';
 const codeOnly=()=>!productsOnly&&$('rtReadPhase')?.value!=='full';
 const readyAreas=()=>validRect(rects.code)&&(codeOnly()||validRect(rects.table));
 const workPolicy=()=>$('rtWorkPolicy')?.value==='all'?'all':'gs';
 function selectedWork(read,knownLabels=[]){
  if(workPolicy()==='all')return {work:workRows(read.text,knownLabels),items:[],warnings:[]};
  return window.SmartMatchReadWork.read({words:read.words||[],text:read.text,knownLabels});
 }
 async function nativePageWords(pg){
  if(!pageTextCache.has(pg))pageTextCache.set(pg,(async()=>{
   const vp=pg.getViewport({scale:1}),tc=await pg.getTextContent(),words=[];
   for(const item of tc.items){
    if(!item.str?.trim())continue;
    const [x,y]=[item.transform[4],item.transform[5]],h=Math.max(1,item.height||Math.hypot(item.transform[2],item.transform[3])),w=Math.max(1,item.width||1);
    const r=vp.convertToViewportRectangle([x,y-h*.25,x+w,y+h*.95]);
    words.push({text:item.str,x:Math.min(r[0],r[2]),y:Math.min(r[1],r[3]),w:Math.abs(r[2]-r[0]),h:Math.abs(r[3]-r[1]),confidence:100});
   }
   return {vp,words,content:tc};
  })());
  return await pageTextCache.get(pg);
 }
 function cardsFrom(data){
  return Object.entries(data?.cards||{}).map(([id,c])=>({...c,id:c.id||id,page:Number(c.page||(/^\d+$/.test(id)?id:0)),codeRect:c.codeRect||data.rects?.code,tableRect:c.tableRect||data.rects?.table}));
 }
 function cardsForPage(page){return cardsFrom(active).filter(c=>c.page===Number(page));}
 function cardFor(code,page){const cards=cardsForPage(page).filter(c=>c.code===code);return cards.length===1?cards[0]:null;}
 function selectedRegions(){
  if(productsOnly)return cardsFrom(previousRead).map(card=>{
   const dx=card.codeRect.x-rects.code.x,dy=card.codeRect.y-rects.code.y;
   const tableRect={...rects.table,x:rects.table.x+dx,y:rects.table.y+dy};
   if(!validRect(tableRect))throw Error('Arbetslistans område passar inte kort '+card.code+'. Läs detta upplägg separat via Läsområden.');
   if(card.bounds){const b=card.bounds;if(tableRect.x<b.x-.002||tableRect.y<b.y-.002||tableRect.x+tableRect.w>b.x+b.w+.002||tableRect.y+tableRect.h>b.y+b.h+.002)throw Error('Arbetslistan hamnar utanför kort '+card.code+'. Markera tabellen inom samma kort.');}
   return {...card,tableRect};
  });
  const pages=parsePages($('rtPages').value,doc.numPages);
  if(discovery?.cards)return discovery.cards.filter(c=>c.selected!==false&&pages.includes(c.page));
  return pages.map(page=>({id:'p'+page+':manual',page,codeRect:clone(rects.code),tableRect:rects.table?clone(rects.table):null}));
 }
 function validRect(r){return r&&[r.x,r.y,r.w,r.h].every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.w>.001&&r.h>.001&&r.x+r.w<=1.001&&r.y+r.h<=1.001;}
 function validMatchBox(r){return r&&[r.x,r.y,r.w,r.h].every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=1.001&&r.y+r.h<=1.001;}
 function validData(data){
  const cards=cardsFrom(data);
  return data?.schema===1&&validRect(data.rects?.code)&&(data.phase==='codes'||validRect(data.rects?.table))&&Array.isArray(data.pages)&&data.pages.length>0&&cards.length>0&&data.pages.every(p=>Number.isInteger(p)&&p>0&&cards.some(c=>c.page===p))&&cards.every(c=>data.pages.includes(c.page)&&norm(c.code)===c.code&&!!c.code&&Array.isArray(c.work)&&validRect(c.codeRect)&&(c.workState==='pending'&&data.phase==='codes'&&c.work.length===0||validRect(c.tableRect))&&(!c.bounds||validRect(c.bounds)))&&
   (!data.matching||data.matching.version===2&&Array.isArray(data.matching.hits)&&data.matching.hits.every(h=>Number.isInteger(h.page)&&h.page>0&&!data.pages.includes(h.page)&&cards.some(c=>c.code===h.code)&&Array.isArray(h.rect)&&h.rect.length===4&&h.rect.every(Number.isFinite)&&h.rect[2]>h.rect[0]&&h.rect[3]>h.rect[1]&&validMatchBox(h.box)));
 }
 function validDocumentData(data,pageCount){
  try{
  if(!validData(data))return false;
  const cards=cardsFrom(data),codes=cards.map(c=>c.code);
  const within=p=>Number.isInteger(p)&&p>=1&&p<=pageCount;
  return data.pages.every(within)&&new Set(data.pages).size===data.pages.length&&new Set(codes).size===codes.length&&
   new Set(cards.map(c=>c.id)).size===cards.length&&cards.every(c=>typeof c.id==='string'&&!!c.id&&within(c.page)&&c.work.every(row=>typeof row==='string'))&&
   (!data.matching||data.matching.hits.every(h=>within(h.page)&&(h.selected===undefined||typeof h.selected==='boolean')))&&
   (data.checks===undefined||data.checks&&typeof data.checks==='object'&&!Array.isArray(data.checks)&&Object.values(data.checks).every(rows=>rows&&typeof rows==='object'&&!Array.isArray(rows)&&Object.values(rows).every(value=>typeof value==='boolean')));
  }catch(_){return false;}
 }
 function reviewedData(data,pageCount){
  if(!validDocumentData(data,pageCount)||data.matching?.version!==2)return false;
  // TEST 3–5 only wrote matching data after the user approved the review.
  // New files carry an explicit approval; an invalid marker is never legacy.
  if(Object.prototype.hasOwnProperty.call(data.matching,'review'))return data.matching.review?.version===1&&data.matching.review.approved===true;
  return true;
 }
 async function geometryFits(pdf,data){
  if(!data?.matching)return true;
  const viewports=new Map();
  for(const hit of data.matching.hits){
   if(!viewports.has(hit.page))viewports.set(hit.page,(await pdf.getPage(hit.page)).getViewport({scale:1}));
   const vp=viewports.get(hit.page),b=hit.box,p=vp.convertToPdfPoint(b.x*vp.width,b.y*vp.height),q=vp.convertToPdfPoint((b.x+b.w)*vp.width,(b.y+b.h)*vp.height);
   const expected=[Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.max(p[0],q[0]),Math.max(p[1],q[1])];
   if(expected.some((value,index)=>Math.abs(value-hit.rect[index])>1))return false;
  }
  return true;
 }
 async function sourceHash(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function remember(){
  if(!active)return;
  try{localStorage.setItem('tillsyno-read-test-v9-1-source:'+active.sourceId,JSON.stringify(active));}
  catch(_){window.SmartMatchAppBridge?.setStatus('Lokal lagring är full. Spara projekt-PDF för att bevara läsmallen och arbetet.');}
 }
 async function sourceMetadata(bytes){
  let p;
  try{
   p=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false});
  }catch(_){return {data:null,hasReadData:false,annotations:[],warning:'PDF-stämplarnas sparade beteckningar kunde inte läsas. Sökningen använder vanlig text och bildläsning som reserv.'};}
  let data=null,hasReadData=false,annotations=[],warning='';
  try{
   const raw=p.catalog.get(PDFLib.PDFName.of('TillsynoSmartMatchV36Data'))||p.catalog.get(PDFLib.PDFName.of('TillsynoSmartMatchV30Data'));
   const payload=raw?.decodeText?JSON.parse(raw.decodeText()):null;
   hasReadData=!!payload&&Object.prototype.hasOwnProperty.call(payload,'readTestData');data=payload?.readTestData||null;
  }catch(_){hasReadData=true;}
  try{annotations=window.SmartMatchReadStamps.readDocument(p);}
  catch(_){warning='PDF-stämplarnas sparade beteckningar kunde inte läsas. Sökningen använder vanlig text och bildläsning som reserv.';}
  return {data,hasReadData,annotations,warning};
 }
 function status(text){$('rtStatus').textContent=text;guide();}
 function showReadProgress(value){
  const box=$('rtReadProgress');if(!box)return;
  box.hidden=value.state==='idle';box.dataset.state=value.state;box.setAttribute('aria-busy',String(value.active));
  $('rtReadProgressTitle').textContent=value.active?value.title:value.state==='error'?'Avläsningen stoppades av ett fel':value.state==='cancelled'?'Avläsningen avbröts':'Det här arbetssteget är klart';
  const unit={page:'sidor',area:'bildområden',card:'kort'}[value.unit]||value.unit;
  const where=value.page?' · PDF-sida '+value.page+(value.pageCount?' ('+value.pageIndex+' av '+value.pageCount+(value.unit==='card'?' kort':' valda sidor')+')':''):'';
  const count=value.total!==null&&value.done!==null?' · '+value.done+' av '+value.total+' '+unit+' klara':'';
  $('rtReadProgressDetail').textContent=value.message||[value.label||'Förbereder avläsningen',where,count].join('');
  $('rtReadProgressLocal').textContent=value.active&&value.localPercent!==null?'Bildläsning av aktuellt område: '+Math.round(value.localPercent)+' %':'';
  const meter=$('rtReadProgressMeter');
  if(value.percent===null)meter.removeAttribute('value');else meter.value=value.percent;
  $('rtReadProgressPercent').textContent=value.percent===null?'Mängden arbete i detta steg beräknas…':Math.floor(value.percent)+' % av detta steg';
  const duration=window.SmartMatchReadProgressV91.formatDuration;
  const estimate=value.active?(value.remainingMs===null?' · återstående tid beräknas efter fler färdiga områden eller sidor':' · ungefär '+duration(value.remainingMs)+' kvar i detta steg'):'';
  $('rtReadProgressTime').textContent='Förfluten tid: '+duration(value.elapsedMs)+estimate;
  $('rtReadProgressCancel').hidden=!value.active;
 }
 function beginReadProgress(title){
  if(!readingProgress)readingProgress=window.SmartMatchReadProgressV91.create({onUpdate:showReadProgress});
  readVersion=cancelVersion;readContext={};readingProgress.start(title);
  $('rtReadProgress').scrollIntoView({block:'nearest'});
 }
 function readDetail(info){
  if(!readingProgress?.snapshot().active||readVersion!==cancelVersion)return;
  readContext={...info};readingProgress.update({...info,detail:'',localPercent:null});
 }
 function endReadProgress(state='done',message=''){
  readingProgress?.finish({state,message});
 }
 function guide(){
  if(!ui)return;
  const step=productsOnly?(productsRead?3:validRect(rects.table)?2:1):matchRun?4:confirmed||discovery?3:readyAreas()?2:1;
  $('rtGuide').classList.toggle('rtProductsGuide',productsOnly);
  const labels=productsOnly?['Markera arbetslistan','Läs produkter','Granska och spara']:['Markera ett exempel','Hitta dörrkorten',codeOnly()?'Matcha koder':'Läs och sök','Granska och starta'];
  for(const item of ui.querySelectorAll('#rtGuide li')){
   const n=Number(item.dataset.step);item.hidden=productsOnly&&n>3;item.classList.toggle('rtCurrent',n===step);item.classList.toggle('rtDone',n<step);
   item.lastChild.textContent=' '+labels[n-1];
   if(n===step)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');
  }
  $('rtNextHint').textContent=productsOnly?(productsRead?'Granska arbetsraderna. Tryck Spara produkter för att lägga till dem i det befintliga projektet.':'Markera arbetslistan inklusive kolumnrubriker på ett exempelkort. Tryck sedan Läs produkterna. De sparade kopplingarna används igen.'):
   matchRun?'4. Kontrollera träffarna med Visa. Avmarkera fel, kryssa i granskningen och öppna projektet.':confirmed?'3. Kontrollera beteckningarna. Ändra det som blev fel och tryck Sök på ritningen igen.':discovery?'3. Granska kortlistan. Tryck sedan '+(codeOnly()?'Matcha koder mot ritningen.':'Läs korten och sök på ritningen.'):
   readyAreas()?'2. Exemplet är markerat. Tryck Hitta övriga dörrkort.':validRect(rects.code)?'1. Markera arbetslistan inklusive kolumnrubriker för det tidigare fullständiga flödet.':'1. Välj ett dörrkort. Tryck Markera kod och dra tätt runt hela beteckningen, till exempel Beslagskod GS23 eller DBL-DS.';
  $('rtDiscover').disabled=busy||!readyAreas();
  $('rtPreview').disabled=busy||!readyAreas();
  $('rtPreview').textContent=productsOnly?'2. Läs produkterna':codeOnly()?'3. Matcha koder mot ritningen':'3. Läs korten och sök på ritningen';
  $('rtStart').textContent=productsOnly?'3. Spara produkter':codeOnly()?'4. Öppna kopplat projekt':'4. Öppna arbetsprojekt';
  $('rtTable').hidden=codeOnly();$('rtWorkSettings').hidden=codeOnly();
  $('rtCode').hidden=productsOnly;$('rtStamp').hidden=productsOnly;
  $('rtDiscover').hidden=productsOnly;$('rtFind').hidden=productsOnly;
  $('rtMatchReview').hidden=productsOnly;$('rtReadPhaseLabel').hidden=productsOnly;
  $('rtSetupDetails').hidden=productsOnly;
  $('rtIntro').textContent=productsOnly?'Läs arbetslistorna från de redan kopplade korten. Beteckningar, ritningspositioner och avprickningar bevaras.':codeOnly()?'Markera bara beslagskoden. Appen läser samma fält på kort med samma sidlayout och matchar hela beteckningen mot ritningens stämplar och text. Arbetslistor läser du senare med Fortsätt med produkter. Vid flera kort på samma sida använder du det tidigare fullständiga flödet.':'Markera ett enda korts kod och hela arbetslista. Det tidigare flödet hittar även flera kort per sida. Granska sedan kopplingar och arbetsrader.';
  $('rtSearchHelp').textContent=codeOnly()?'Snabb sökning läser bara kodfältet på korten. På ritningen används sparade PDF-stämplar och PDF-text. Saknade beteckningar lämnas omatchade. Välj Sök även i bilder om du vill starta den långsammare bildsökningen.':productsOnly?'Bara de markerade arbetslistorna läses på de befintliga korten. Ingen ny kod- eller ritningssökning görs.':'Kod och arbetslista läses inom markeringarna. Snabb sökning börjar med PDF-text och sparade stämplar, med bildläsning som reserv. Textläget hoppar över bildläsning helt.';
 }
 function invalidateMatches(){
  if(productsOnly)return;
  matchRun=null;focusedHit=null;$('rtMatchApproval').checked=false;$('rtDrawingResults').replaceChildren();$('rtGoMatches').hidden=true;$('rtStart').disabled=true;
  for(const el of document.querySelectorAll('.rtMatchHint'))el.textContent='Sök stämplar för att kontrollera kopplingen till ritningen.';guide();
 }
 function invalidate(){
  if(productsOnly){productsRead=false;confirmed=false;$('rtResults').replaceChildren();status('Markera arbetslistan och tryck Läs produkterna. Kopplingarna finns kvar.');validatePrepared();return;}
  prepared={};confirmed=false;invalidateMatches();$('rtResults').replaceChildren();populateStampCodes();status(codeOnly()?'Markera kodområdet. Tryck sedan Hitta övriga dörrkort.':'Markera kodområdet och hela tabellen. Följ sedan nästa steg i guiden.');
 }
 function resetDiscovery(){discovery=null;$('rtDiscoveryResults').replaceChildren();}
 function lock(on){
  if(on)resetViewportInput(true);busy=on;
  for(const id of ['rtDiscover','rtPreview','rtPage','rtPrev','rtNext','rtPages','rtTemplate','rtZoomIn','rtZoomOut','rtCode','rtTable','rtMove','rtStamp','rtStampCode','rtFind','rtSampleClear','rtMatchApproval','rtNormal','rtImageMode','rtWorkPolicy','rtReadPhase'])$(id).disabled=on;
  for(const el of ui.querySelectorAll('#rtResults input,#rtResults textarea,#rtDrawingResults input,#rtDrawingResults button,#rtDiscoveryResults input'))el.disabled=on;
  $('rtStart').disabled=on||!confirmed;
  if(!on){if(productsOnly)for(const el of ui.querySelectorAll('#rtResults input'))el.disabled=true;$('rtFind').disabled=!confirmed;$('rtStamp').disabled=!confirmed;$('rtMatchApproval').disabled=!matchRun;validatePrepared();if(zoomDirty)queueZoomRender();}guide();
 }
 function makeUI(){
  if(ui)return;
  ui=document.createElement('dialog');ui.id='rtDialog';ui.className='rtDialog';ui.setAttribute('aria-labelledby','rtTitle');
  ui.innerHTML=`<header class="rtHead"><div><small>SmartMatch · Avläsning TEST 9.1</small><h2 id="rtTitle">Läs dörrkort och matcha stämplar</h2></div><button id="rtCancel" type="button">Avbryt</button></header>
   <ol id="rtGuide" class="rtGuide" aria-label="Så går du vidare"><li data-step="1"><b>1</b> Visa ett exempel</li><li data-step="2"><b>2</b> Hitta dörrkorten</li><li data-step="3"><b>3</b> Läs och sök</li><li data-step="4"><b>4</b> Granska och starta</li></ol>
   <label id="rtReadPhaseLabel" class="rtPhaseChoice">Vad vill du läsa?<select id="rtReadPhase"><option value="codes">Matcha bara koder – produkter senare</option><option value="full">Matcha koder och läs produkter – tidigare flöde</option></select></label><p id="rtNextHint" class="rtNextHint"></p>
   <p id="rtIntro" class="rtIntro">Markera ett enda dörrkort som exempel – även om sidan innehåller flera kort. Appen läser varje korts egen beteckning och söker hela beteckningen på ritningen. Spara sedan med Spara PDF. Kopplingar och arbetsstatus följer med i projekt-PDF:en, som kan öppnas direkt nästa gång.</p>
   <section id="rtReadProgress" class="rtReadProgress" aria-labelledby="rtReadProgressTitle" hidden>
    <div class="rtReadProgressHead"><strong id="rtReadProgressTitle"></strong><button id="rtReadProgressCancel" type="button">Avbryt avläsningen</button></div>
    <p id="rtReadProgressDetail" role="status" aria-live="polite"></p>
    <progress id="rtReadProgressMeter" max="100" aria-label="Framsteg i aktuellt steg"></progress>
    <p id="rtReadProgressPercent"></p><p id="rtReadProgressLocal"></p><p id="rtReadProgressTime" aria-live="off"></p>
    <small>Procent och återstående tid gäller steget som visas. Bildläsning tar längre tid än PDF-text. Uppskattningen kan ändras.</small>
   </section>
   <details id="rtSetupDetails" class="rtSetupDetails"><summary>Sparad läsmall eller välj kortsidor själv</summary><div class="rtSetup"><label>Sparad läsmall<select id="rtTemplate"><option value="">Ny markering</option></select></label><label>Dörrkortssidor<input id="rtPages" placeholder="Exempel: 2, 4-8" inputmode="text"></label><button id="rtNormal" type="button">Använd tidigare läsning</button></div></details>
   <div class="rtLayout"><section class="rtDocument" aria-label="Markera dörrkort eller ritning"><div class="rtControls"><button id="rtPrev" type="button" aria-label="Föregående sida">‹</button><label><span id="rtPageLabel">Dörrkortssida</span><input id="rtPage" type="number" min="1" value="1"></label><span id="rtPageCount"></span><button id="rtNext" type="button" aria-label="Nästa sida">›</button><button id="rtZoomOut" type="button" aria-label="Zooma ut">−</button><output id="rtZoomLevel" aria-label="Zoomnivå" aria-live="off">100 %</output><button id="rtZoomIn" type="button" aria-label="Zooma in">+</button></div>
   <div class="rtModes"><button id="rtCode" type="button" aria-pressed="true">Markera kod</button><button id="rtTable" type="button" aria-pressed="false">Markera tabell / arbetslista</button><button id="rtStamp" type="button" aria-pressed="false">Markera stämpel på ritning</button><button id="rtMove" type="button" aria-pressed="false">Flytta vyn</button></div>
   <div id="rtSampleControls" class="rtSampleControls" hidden><label>Koppla exempelstämpeln till<select id="rtStampCode"></select></label><button id="rtSampleClear" type="button">Rensa exempel</button><p>Välj ritningssida. Dra en ruta tätt runt en beteckning, exempelvis WC. Exemplet hjälper bildläsningen att hitta rätt textstorlek.</p></div>
   <p id="rtZoomHelp" class="rtZoomHelp">Zooma med mushjulet eller två fingrar. Dra med musen eller ett finger för att markera. Välj Flytta vyn för att panorera.</p><div id="rtViewport" class="rtViewport" aria-describedby="rtZoomHelp"><div id="rtCanvasBox" class="rtCanvasBox"><canvas id="rtCanvas"></canvas><div id="rtCodeRect" class="rtRect rtCodeRect" hidden><span>Kod</span></div><div id="rtTableRect" class="rtRect rtTableRect" hidden><span>Hela tabellen</span></div><div id="rtStampRect" class="rtRect rtStampRect" hidden><span>Exempelstämpel</span></div><div id="rtHitRect" class="rtRect rtHitRect" hidden><span>Träff</span></div><div id="rtDraftRect" class="rtRect" hidden></div></div></div></section>
   <aside class="rtReview"><p id="rtStatus" class="rtStatus" role="status" aria-live="polite"></p><div class="rtSearchSettings"><label class="rtSearchMode" for="rtImageMode">Söksätt<select id="rtImageMode" aria-describedby="rtSearchHelp"><option value="auto">Snabb sökning – PDF-stämplar först</option><option value="text">Sök i text – snabbare, utan bildläsning</option><option value="full">Sök även i bilder – tar längre tid</option></select></label><p id="rtSearchHelp" class="rtSearchHelp">Kod och arbetslista läses inom dina markeringar. Snabb sökning börjar med PDF-text och ritningens sparade stämplar; bildläsning används som reserv vid behov. Textläget hoppar över bildläsning helt och kan missa text som ligger som bild. Sök även i bilder kompletterar ritningen även när PDF-stämplar redan hittats.</p><div id="rtWorkSettings"><label class="rtSearchMode" for="rtWorkPolicy">Arbetsrader<select id="rtWorkPolicy"><option value="gs">GS – endast vårt montage</option><option value="all">Alla markerade arbetsrader (tidigare läsning)</option></select></label><p class="rtSearchHelp">Ta med tabellens kolumnrubriker i markeringen. Monteras av / Mont av styr GS-arbetet. Produkt och beskrivning följer med; DT:s montage räknas inte.</p></div></div><button id="rtDiscover" class="rtPrimary" type="button" disabled>2. Hitta övriga dörrkort</button><div id="rtDiscoveryResults"></div><button id="rtPreview" class="rtPrimary" type="button">3. Läs korten och sök på ritningen</button><button id="rtGoMatches" type="button" hidden>4. Granska träffarna</button><details class="rtCoordinates"><summary>Justera markeringar med siffror</summary><div id="rtCoordinates"></div></details><div id="rtResults"></div><section id="rtMatchReview" class="rtMatchReview"><button id="rtFind" type="button" disabled>Sök på ritningen igen</button><div id="rtDrawingResults" aria-live="polite"></div><label class="rtApproval"><input id="rtMatchApproval" type="checkbox" disabled>Jag har granskat träffarna på ritningen</label></section></aside></div>
   <footer class="rtFooter"><label>Mallnamn<input id="rtName" placeholder="Exempel: Mina dörrkort" maxlength="70"></label><label class="rtSaveChoice"><input id="rtSaveTemplate" type="checkbox" checked>Spara markeringarna som läsmall på enheten</label><button id="rtStart" class="rtPrimary" type="button" disabled>4. Öppna arbetsprojekt</button></footer>`;
  document.body.append(ui);
  $('rtReadProgressCancel').onclick=()=>finish(false);$('rtCancel').onclick=()=>finish(false);ui.addEventListener('cancel',e=>{e.preventDefault();finish(false);});
  $('rtNormal').onclick=()=>{active=null;try{localStorage.removeItem('tillsyno-read-test-v9-1-source:'+sourceId);}catch(_){}finish(true);};
  for(const kind of ['code','table','stamp','move'])$('rt'+kind[0].toUpperCase()+kind.slice(1)).onclick=()=>setMode(kind);
  $('rtPrev').onclick=()=>changePage(currentPage()-1);$('rtNext').onclick=()=>changePage(currentPage()+1);
  $('rtPage').onchange=()=>changePage(Number($('rtPage').value));
  $('rtPages').oninput=()=>{resetDiscovery();invalidate();};
  $('rtZoomIn').onclick=()=>zoomAt(zoom*1.4);$('rtZoomOut').onclick=()=>zoomAt(zoom/1.4);
  $('rtGoMatches').onclick=()=>ui.querySelector('.rtMatchReview').scrollIntoView({block:'start',behavior:'smooth'});
  $('rtDiscover').onclick=()=>void discoverCards();$('rtPreview').onclick=()=>void preview();$('rtStart').onclick=start;
  $('rtFind').onclick=()=>void searchDrawing();$('rtMatchApproval').onchange=validatePrepared;
  $('rtReadPhase').onchange=()=>{resetDiscovery();invalidate();coordinates();paint();setMode('code');};
  $('rtImageMode').onchange=()=>{if(productsOnly)invalidate();invalidateMatches();status('Söksättet är ändrat. Valet används vid nästa provläsning och ritningssökning.');};
  $('rtWorkPolicy').onchange=()=>{
   for(const card of Object.values(prepared)){if(card.workState==='pending')continue;const result=selectedWork({text:card.rawTable,words:card.tableWords||[]});card.work=result.work;card.workItems=result.items;card.workWarnings=result.warnings;card.workPolicy=workPolicy()==='gs'?'gs-install-v1':'all';}
   $('rtResults').replaceChildren();for(const card of Object.values(prepared))renderResult(card);$('rtMatchApproval').checked=false;validatePrepared();status('Arbetsurvalet är ändrat. Granska arbetsraderna innan du öppnar projektet.');
  };
  $('rtStampCode').onchange=()=>{if(drawingSample){drawingSample.code=$('rtStampCode').value;invalidateMatches();status('Sök stämplar igen efter ändrad koppling.');}};
  $('rtSampleClear').onclick=()=>{drawingSample=null;invalidateMatches();paint();coordinates();status('Exemplet är rensat. Sök stämplar för att läsa ritningen igen.');};
  $('rtTemplate').onchange=()=>{const t=templates()[$('rtTemplate').value];if(t){rects=clone(t.rects);$('rtName').value=t.name;}else rects={};resetDiscovery();invalidate();paint();coordinates();};
  const box=$('rtCanvasBox'),viewport=$('rtViewport');
  viewport.addEventListener('wheel',e=>{
   if(busy||!doc||!e.deltaY)return;
   e.preventDefault();clearGesture();
   const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1);
   zoomAt(zoom*Math.exp(-Math.max(-240,Math.min(240,pixels))*.002),e);
  },{passive:false});
  viewport.addEventListener('pointerdown',e=>{
   if(busy||!doc||(e.pointerType==='mouse'&&e.button!==0))return;
   e.preventDefault();viewport.setPointerCapture(e.pointerId);
   if(e.pointerType==='touch'){
    touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touchPoints.size>=2){beginPinch();return;}
    if(pinchSession)return;
   }
   if(mode==='move'){
    gesture={id:e.pointerId,type:'pan',x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.classList.add('rtPanning');
   }else if(box.contains(e.target)){
    const p=point(e);gesture={id:e.pointerId,type:'select',start:p,end:p,mode};drawDraft();
   }
  });
  viewport.addEventListener('pointermove',e=>{
   if(touchPoints.has(e.pointerId))touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(pinch){e.preventDefault();movePinch();return;}
   if(gesture?.id!==e.pointerId)return;e.preventDefault();
   if(gesture.type==='pan'){viewport.scrollLeft=gesture.left+gesture.x-e.clientX;viewport.scrollTop=gesture.top+gesture.y-e.clientY;}
   else{gesture.end=point(e);drawDraft();}
  });
  const endPointer=(e,cancelled=false)=>{
   const wasPinching=pinchSession;touchPoints.delete(e.pointerId);
   if(wasPinching){clearGesture();pinch=null;if(touchPoints.size>=2)beginPinch();if(!touchPoints.size)pinchSession=false;}
   else if(gesture?.id===e.pointerId){
    if(!cancelled&&gesture.type==='select'){
     e.preventDefault();gesture.end=point(e);const r=gestureRect();
     if(r.w*box.clientWidth>=8&&r.h*box.clientHeight>=6){if(gesture.mode==='stamp'){drawingSample={page:drawingPage,rect:r,code:$('rtStampCode').value};invalidateMatches();status('Exempelstämpel vald. Tryck Sök på ritningen igen.');}else{rects[gesture.mode]=r;resetDiscovery();invalidate();}}
     paint();coordinates();
    }
    clearGesture();
   }
   if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  };
  viewport.addEventListener('pointerup',e=>endPointer(e));
  viewport.addEventListener('pointercancel',e=>endPointer(e,true));
  viewport.addEventListener('lostpointercapture',e=>{if(touchPoints.has(e.pointerId)||gesture?.id===e.pointerId)endPointer(e,true);});
 }
 function clearGesture(){gesture=null;$('rtDraftRect').hidden=true;$('rtViewport').classList.remove('rtPanning');}
 function resetViewportInput(keepZoom=false){
  clearTimeout(zoomTimer);zoomTimer=null;clearGesture();pinch=null;pinchSession=false;touchPoints.clear();if(!keepZoom)zoomDirty=false;
 }
 function zoomAnchor(clientX,clientY){
  const viewport=$('rtViewport'),vr=viewport.getBoundingClientRect(),box=$('rtCanvasBox').getBoundingClientRect();
  clientX??=vr.left+viewport.clientLeft+viewport.clientWidth/2;clientY??=vr.top+viewport.clientTop+viewport.clientHeight/2;
  return {clientX,clientY,x:clamp((clientX-box.left)/box.width),y:clamp((clientY-box.top)/box.height)};
 }
 function sizePreview(width,height){
  $('rtCanvas').style.width=width+'px';$('rtCanvas').style.height=height+'px';$('rtCanvasBox').style.width=width+'px';
 }
 function zoomAt(next,event=null,anchor=null){
  if(busy||!doc)return;
  next=Math.max(.5,Math.min(6,next));if(!Number.isFinite(next))return;
  anchor??=zoomAnchor(event?.clientX,event?.clientY);
  const viewport=$('rtViewport'),box=$('rtCanvasBox'),before=box.getBoundingClientRect(),factor=next/zoom;
  zoom=next;sizePreview(before.width*factor,before.height*factor);
  const after=box.getBoundingClientRect();
  viewport.scrollLeft+=after.left+anchor.x*after.width-anchor.clientX;
  viewport.scrollTop+=after.top+anchor.y*after.height-anchor.clientY;
  $('rtZoomLevel').value=Math.round(zoom*100)+' %';
  // Scale the existing preview immediately. Repaint the PDF after the gesture
  // pauses, rather than replaying a large drawing for every wheel/touch event.
  zoomDirty=true;queueZoomRender();
 }
 function queueZoomRender(){
  clearTimeout(zoomTimer);zoomTimer=setTimeout(()=>{zoomTimer=null;if(doc&&ui.open&&!busy)void render().catch(error=>status('Förhandsvisningen kunde inte uppdateras: '+error.message));},140);
 }
 function beginPinch(){
  const entries=[...touchPoints.entries()].slice(0,2),[a,b]=entries.map(entry=>entry[1]);
  clearGesture();pinchSession=true;
  pinch={ids:entries.map(entry=>entry[0]),distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),zoom,anchor:zoomAnchor((a.x+b.x)/2,(a.y+b.y)/2)};
 }
 function movePinch(){
  const [a,b]=pinch.ids.map(id=>touchPoints.get(id));if(!a||!b)return;
  zoomAt(pinch.zoom*Math.hypot(b.x-a.x,b.y-a.y)/pinch.distance,null,{...pinch.anchor,clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2});
 }
 function templates(){try{return JSON.parse(localStorage.getItem(templatesKey)||'[]').filter(t=>validRect(t.rects?.code));}catch(_){return [];}}
 async function discoverCards(){
  if(busy||!doc)return;const version=cancelVersion;
  try{
   if(!readyAreas())throw Error(codeOnly()?'Markera kodområdet på ett exempelkort först.':'Markera kod och hela tabellen på ett exempelkort först.');
   lock(true);invalidate();beginReadProgress('Hittar dörrkort');
   const result=await window.SmartMatchReadCodes.discover({pdf:doc,examplePage:example,codeOnly:codeOnly(),codeRect:rects.code,tableRect:rects.table,getTextContent:async pg=>(await nativePageWords(pg)).content,fallbackPolicy:searchMode()==='full'?'all':searchMode()==='text'?'none':'matching-tables',cancelled:()=>version!==cancelVersion,readFallback:async({page,rect,kind})=>{
    status('Bildläser '+(kind==='code'?'beteckning':'tabell')+' för att hitta liknande dörrkort…');
    const result=await readRegion(page,rect,kind,version);
    if(version!==cancelVersion)throw Error('Avläsningen avbröts.');
    return {...result,text:kind==='code'&&result.ids.length!==1?'':result.text};
   },onDetail:readDetail,onProgress:progress=>status(progress.message)});
   if(version!==cancelVersion)return;
   discovery=result;for(const c of result.cards)c.selected=c.status==='proposed';
   const pages=new Set(result.cardPages);if(!pages.size)pages.add(example);
   $('rtPages').value=[...pages].sort((a,b)=>a-b).join(', ');
   renderDiscovery();
   status('Hittade '+result.cards.filter(c=>c.status==='proposed').length+' föreslagna dörrkort på '+result.cardPages.length+' sidor. Granska kortlistan och tryck '+(codeOnly()?'Matcha koder mot ritningen.':'Läs korten och sök på ritningen.')+(result.unresolvedPages.length?' '+result.unresolvedPages.length+' sidor behöver kontrolleras manuellt.':''));
  }catch(e){if(version===cancelVersion){status(e.message||String(e));endReadProgress('error',e.message||String(e));}}
  finally{if(version===cancelVersion){if(readingProgress?.snapshot().active)endReadProgress();await release();lock(false);}}
 }
 function renderDiscovery(){
  const root=$('rtDiscoveryResults');root.replaceChildren();if(!discovery)return;
  const heading=document.createElement('h3');heading.textContent='Föreslagna dörrkort';root.append(heading);
  const help=document.createElement('p');help.textContent=codeOnly()?'Ett kodfält per sida föreslås utifrån exempelkortets sidlayout. Kontrollera beteckningarna och vilka sidor som är dörrkort. Vid flera kort på samma sida väljer du det tidigare fullständiga flödet.':'Varje område är ett eget kort, även när flera finns på samma sida. Kontrollera beteckningarna och välj vilka kort som ska läsas.';root.append(help);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Sidor som behöver kontrolleras';details.append(summary);
  for(const [i,item]of discovery.cards.entries()){
   const label=document.createElement('label');label.className='rtPageChoice';label.dataset.cardId=item.id;
   const check=document.createElement('input');check.type='checkbox';check.checked=item.selected!==false;check.setAttribute('aria-label','Ta med kort '+(i+1)+' sida '+item.page);
   label.append(check,document.createTextNode('Kort '+(i+1)+' · sida '+item.page+' · '+(item.code||'Välj beteckning vid provläsning')));
   check.onchange=()=>{item.selected=check.checked;const pages=[...new Set(discovery.cards.filter(c=>c.selected!==false).map(c=>c.page))];$('rtPages').value=pages.sort((a,b)=>a-b).join(', ');invalidate();};
   root.append(label);
  }
  for(const item of discovery.pages.filter(p=>!discovery.cards.some(c=>c.page===p.page&&c.selected!==false))){
   const p=document.createElement('p');p.textContent='Sida '+item.page+' · '+item.reason;details.append(p);
  }
  if(details.children.length>1)root.append(details);
 }
 function currentPage(){return view==='drawing'?drawingPage:example;}
 function populateStampCodes(){
  const select=$('rtStampCode'),previous=select.value||drawingSample?.code;
  const codes=[...new Set(Object.values(prepared).map(c=>norm(c.code)).filter(Boolean))];
  select.replaceChildren(...codes.map(code=>new Option(code,code)));if(codes.includes(previous))select.value=previous;
  $('rtStamp').disabled=busy||!codes.length;$('rtFind').disabled=busy||!confirmed;
 }
 function setMode(value,renderOnChange=true){
  const old=view;mode=value;if(value==='stamp'){
   view='drawing';let pages=[];try{pages=parsePages($('rtPages').value,doc.numPages);}catch(_){}
   if(pages.includes(drawingPage))drawingPage=Array.from({length:doc.numPages},(_,i)=>i+1).find(p=>!pages.includes(p))||1;
  }else if(value!=='move')view='card';
  resetViewportInput(old===view);$('rtViewport').classList.toggle('rtMoveMode',value==='move');
  for(const v of ['code','table','stamp','move'])$('rt'+v[0].toUpperCase()+v.slice(1)).setAttribute('aria-pressed',String(v===value));
  $('rtSampleControls').hidden=view!=='drawing';$('rtPageLabel').textContent=view==='drawing'?'Ritningssida':'Dörrkortssida';$('rtPage').value=String(currentPage());coordinates();paint();
  if(old!==view){zoom=1;if(renderOnChange)void render();}else if(zoomDirty)queueZoomRender();
 }
 function point(e){const r=$('rtCanvasBox').getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width),y:clamp((e.clientY-r.top)/r.height)};}
 function gestureRect(){const a=gesture.start,b=gesture.end;return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)};}
 function showRect(el,r){el.hidden=!r;if(!r)return;Object.assign(el.style,{left:r.x*100+'%',top:r.y*100+'%',width:r.w*100+'%',height:r.h*100+'%'});}
 function drawDraft(){const el=$('rtDraftRect');el.className='rtRect '+(gesture.mode==='stamp'?'rtStampRect':gesture.mode==='code'?'rtCodeRect':'rtTableRect');showRect(el,gestureRect());}
 function paint(){showRect($('rtCodeRect'),view==='card'?rects.code:null);showRect($('rtTableRect'),view==='card'&&!codeOnly()?rects.table:null);showRect($('rtStampRect'),view==='drawing'&&drawingSample?.page===drawingPage?drawingSample.rect:null);showRect($('rtHitRect'),view==='drawing'&&focusedHit?.page===drawingPage?focusedHit.box:null);}
 function coordinates(){
  const root=$('rtCoordinates');root.replaceChildren();
  for(const [kind,label]of (view==='drawing'?[['stamp','Stämpel']]:productsOnly?[['table','Tabell']]:codeOnly()?[['code','Kod']]:[['code','Kod'],['table','Tabell']])){
   const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=label+' · procent av sidan';field.append(legend);
   for(const [key,name]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']]){
    const r=kind==='stamp'?drawingSample?.rect:rects[kind];
    const l=document.createElement('label');l.textContent=name;const input=document.createElement('input');input.type='number';input.min='0';input.max='100';input.step='.1';input.value=String(Math.round((r?.[key]||0)*10000)/100);input.setAttribute('aria-label',label+' '+name);
    input.onchange=()=>{const next={...(kind==='stamp'?drawingSample?.rect:rects[kind]||{x:0,y:0,w:0,h:0}),[key]:clamp(Number(input.value)/100)};next.w=Math.min(next.w||0,1-(next.x||0));next.h=Math.min(next.h||0,1-(next.y||0));if(kind==='stamp'){drawingSample={page:drawingPage,rect:next,code:$('rtStampCode').value};invalidateMatches();}else{rects[kind]=next;resetDiscovery();invalidate();}paint();};l.append(input);field.append(l);
   }root.append(field);
  }
 }
 async function changePage(n){
  if(!busy&&doc)resetViewportInput();
  if(view==='drawing'){if(busy||!doc)return;drawingPage=Math.max(1,Math.min(doc.numPages,Math.trunc(n)||1));$('rtPage').value=String(drawingPage);zoom=1;coordinates();await render();return;}
  if(busy||!doc)return;const old=example;example=Math.max(1,Math.min(doc.numPages,Math.trunc(n)||1));
  if(old!==example){resetDiscovery();invalidate();}
  if($('rtPages').value===String(old)){$('rtPages').value=String(example);}
  $('rtPage').value=String(example);zoom=1;await render();
 }
 let renderVersion=0,renderTask=null,renderedPreview=null;
 async function render(){
  const version=++renderVersion;if(renderTask){renderTask.cancel();try{await renderTask.promise;}catch(_){}}
  const pg=await doc.getPage(currentPage());if(version!==renderVersion)return;
  const requestedZoom=zoom,raw=pg.getViewport({scale:1}),width=Math.max(250,$('rtViewport').clientWidth-24),vp=pg.getViewport({scale:width/raw.width*zoom});
  const ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(2800000/(vp.width*vp.height)));
  if(renderedPreview?.document===doc&&renderedPreview.page===currentPage()&&renderedPreview.scale===vp.scale&&renderedPreview.ratio===ratio){zoomDirty=false;paint();return;}
  const canvas=$('rtCanvas');renderedPreview=null;canvas.width=Math.ceil(vp.width*ratio);canvas.height=Math.ceil(vp.height*ratio);sizePreview(vp.width,vp.height);$('rtZoomLevel').value=Math.round(zoom*100)+' %';
  renderTask=pg.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:vp,transform:[ratio,0,0,ratio,0,0]});
  try{await renderTask.promise;}catch(e){if(e.name!=='RenderingCancelledException')throw e;}
  if(version===renderVersion){if(zoom===requestedZoom)zoomDirty=false;renderTask=null;renderedPreview={document:doc,page:currentPage(),scale:vp.scale,ratio};paint();}
 }
 function groupWords(words){
  const groups=[];
  for(const w of words.filter(w=>clean(w.text)).sort((a,b)=>a.y-b.y||a.x-b.x)){
   let row=groups.find(r=>Math.abs(r.y-w.y)<Math.max(3,w.h*.55));
   if(!row){row={y:w.y,words:[]};groups.push(row);}row.words.push(w);
  }
  return groups.sort((a,b)=>a.y-b.y).map(r=>r.words.sort((a,b)=>a.x-b.x).map(w=>clean(w.text)).join('  ')).join('\n');
 }
 async function localWorker(){
  const workerVersion=cancelVersion;
  if(!workerPromise)workerPromise=(async()=>{
   if(!window.Tesseract){
    if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('vendor/tesseract/tesseract.min.js',base);s.onload=resolve;s.onerror=()=>reject(Error('Bildläsningens filer kunde inte laddas.'));document.head.append(s);}).catch(e=>{libraryPromise=null;throw e;});
    await libraryPromise;
   }
   return Tesseract.createWorker('eng',1,{workerPath:new URL('vendor/tesseract/worker.min.js',base).href,corePath:new URL('vendor/tesseract/tesseract-core-lstm.wasm.js',base).href,langPath:new URL('vendor/tesseract/lang/',base).href,cachePath:'tillsyno-read-test-v1',workerBlobURL:false,gzip:true,logger:m=>{if(m.status==='recognizing text'&&busy&&workerVersion===cancelVersion&&readVersion===cancelVersion)readingProgress?.update({localPercent:Math.round(m.progress*100)});}});
  })().catch(e=>{workerPromise=null;throw e;});
  return workerPromise;
 }
 async function release(){const p=workerPromise;workerPromise=null;if(p)try{await(await p).terminate();}catch(_){}}
 async function recognize(worker,canvas){
  let timer;
  try{return await Promise.race([worker.recognize(canvas),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bildläsningen tog för lång tid. Prova ett mindre tabellområde eller justera markeringen.')),45000);})]);}
  finally{clearTimeout(timer);}
 }
 function removeTableRules(canvas){
  // Long straight table borders confuse OCR's text segmentation. Remove only
  // continuous runs from this temporary crop; the PDF and viewer stay intact.
  const ctx=canvas.getContext('2d'),image=ctx.getImageData(0,0,canvas.width,canvas.height),pixels=image.data,w=canvas.width,h=canvas.height,runs=[];
  const dark=(x,y)=>{const i=(y*w+x)*4;return pixels[i]+pixels[i+1]+pixels[i+2]<480;};
  for(let y=0;y<h;y++){
   let start=-1;
   for(let x=0;x<=w;x++)if(x<w&&dark(x,y)){if(start<0)start=x;}else if(start>=0){if(x-start>=Math.max(50,w*.35))runs.push({x:start,y,w:x-start,h:1});start=-1;}
  }
  for(let x=0;x<w;x++){
   let start=-1;
   for(let y=0;y<=h;y++)if(y<h&&dark(x,y)){if(start<0)start=y;}else if(start>=0){if(y-start>=Math.max(50,h*.35))runs.push({x,y:start,w:1,h:y-start});start=-1;}
  }
  for(const r of runs)for(let y=Math.max(0,r.y-1);y<Math.min(h,r.y+r.h+1);y++)for(let x=Math.max(0,r.x-1);x<Math.min(w,r.x+r.w+1);x++){
   const i=(y*w+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;
  }
  if(runs.length)ctx.putImageData(image,0,0);
 }
 async function readRegion(pg,rect,kind,version=cancelVersion){
  if(version!==cancelVersion)throw Error('Avläsningen avbröts.');
  readDetail({...readContext,page:pg.pageNumber||readContext.page,label:kind==='code'?'Läser markerad kod som PDF-text':'Läser markerad arbetslista som PDF-text'});
  if(!regionReadCache.has(pg))regionReadCache.set(pg,new Map());
  const cache=regionReadCache.get(pg),key=JSON.stringify([rect,kind,searchMode()]);
  if(!cache.has(key))cache.set(key,readRegionUncached(pg,rect,kind,version));
  try{const value=await cache.get(key);if(version!==cancelVersion)throw Error('Avläsningen avbröts.');return value;}
  catch(error){cache.delete(key);throw error;}
 }
 async function readRegionUncached(pg,rect,kind,version=cancelVersion){
  const check=()=>{if(version!==cancelVersion)throw Error('Avläsningen avbröts.');};check();
  const {vp,words:pageWords}=await nativePageWords(pg),readMode=searchMode();check();
  const words=pageWords.filter(word=>word.x+word.w/2>=rect.x*vp.width&&word.x+word.w/2<=(rect.x+rect.w)*vp.width&&word.y+word.h/2>=rect.y*vp.height&&word.y+word.h/2<=(rect.y+rect.h)*vp.height);
  const native=groupWords(words),nativeIds=kind==='code'?candidates(native):[];
  if(readMode==='text')return {text:native,native,words,ids:nativeIds,method:'Endast PDF-text i markeringen',confidence:native?100:0,needsImage:!native,warnings:native?[]:['Ingen läsbar PDF-text i markeringen. Välj Snabb sökning eller Sök även i bilder för bildtext.']};
  if(readMode==='auto'&&native&&(kind!=='code'||nativeIds.length)){
   const raster=await window.SmartMatchReadImageRegions.hasImages(pg,rect);check();
   if(!raster)return {text:native,native,words,ids:nativeIds,method:'PDF-text i markeringen',confidence:100,warnings:[]};
  }
  // Rasterize the selected area as well: scanned rows can coexist with native text.
  // The complete visible table is read, rather than just its native PDF labels.
  const scale=Math.min(kind==='code'?4:2.5,Math.sqrt(2800000/(vp.width*rect.w*vp.height*rect.h))),view=pg.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(rect.w*view.width));canvas.height=Math.max(1,Math.ceil(rect.h*view.height));
  try{
   const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   const total=kind==='table'&&canvas.height>700?Math.ceil(canvas.height/400):1;
   const imageProgress={phase:'card-image',label:kind==='code'?'Förbereder bildläsning av kodfält':'Förbereder bildläsning av arbetslista',page:pg.pageNumber||readContext.page,unit:'area',done:0,total,scope:'card-image-'+(pg.pageNumber||readContext.page)+'-'+kind};
   readDetail(imageProgress);
   await pg.render({canvasContext:ctx,viewport:view,transform:[1,0,0,1,-rect.x*view.width,-rect.y*view.height],annotationMode:0}).promise;
   if(kind==='table')removeTableRules(canvas);
   status(kind==='code'?'Bildläser kodområdet…':'Bildläser hela tabellen…');
   check();const worker=await localWorker();check();await worker.setParameters({tessedit_pageseg_mode:kind==='code'?7:6,preserve_interword_spaces:'1'});
   let data;
   if(kind==='table'&&canvas.height>700){
    const collected=[],confidences=[];
    for(let top=0;top<canvas.height;top+=400){
     check();
     readDetail({...imageProgress,label:'Bildläser markerad arbetslista',done:Math.floor(top/400)});
     const tile=document.createElement('canvas');tile.width=canvas.width;tile.height=Math.min(480,canvas.height-top);tile.getContext('2d').drawImage(canvas,0,top,canvas.width,tile.height,0,0,canvas.width,tile.height);
     try{const result=await recognize(worker,tile);check();for(const w of result.data.words||[]){const middle=(w.bbox.y0+w.bbox.y1)/2;if(top>0&&middle<=40)continue;if(top+tile.height<canvas.height&&middle>tile.height-40)continue;collected.push({...w,bbox:{...w.bbox,y0:w.bbox.y0+top,y1:w.bbox.y1+top}});}confidences.push(result.data.confidence);readDetail({...imageProgress,label:'Bildläser markerad arbetslista',done:Math.floor(top/400)+1});}finally{tile.width=tile.height=1;}
    }
    data={words:collected,confidence:confidences.reduce((a,b)=>a+b,0)/Math.max(1,confidences.length),text:''};
   }else {readDetail({...imageProgress,label:kind==='code'?'Bildläser markerat kodfält':'Bildläser markerad arbetslista'});({data}=await recognize(worker,canvas));check();readDetail({...imageProgress,label:kind==='code'?'Kodfältet är bildläst':'Arbetslistan är bildläst',done:1});}
   check();const ocr=kind==='code'?clean(data.text):groupWords((data.words||[]).map(w=>({text:w.text,x:w.bbox.x0,y:w.bbox.y0,h:w.bbox.y1-w.bbox.y0})))||String(data.text||'').trim();
   if(kind==='code'){
    const ocrIds=data.confidence>=75?candidates(ocr):[];
    const ids=[...new Set([...nativeIds,...ocrIds])];
    return {text:native||ocr,native,ids,words,method:nativeIds.length?'PDF-text och lokal bildläsning':'Lokal bildläsning',confidence:data.confidence,warnings:[]};
   }
   // A gridded table can have complete native text while OCR sees just one
   // row. Prefer native words at their positions, and add OCR-only content so
   // scanned rows/products in mixed PDFs are retained without duplicating text.
   const rasterWords=(data.words||[]).filter(w=>Number(w.confidence??data.confidence??0)>=45).map(w=>{
    const h=(w.bbox.y1-w.bbox.y0)/scale;
    return {text:w.text,x:rect.x*vp.width+w.bbox.x0/scale,y:rect.y*vp.height+w.bbox.y0/scale,w:(w.bbox.x1-w.bbox.x0)/scale,h,confidence:Number(w.confidence??data.confidence??0)};
   }).filter(w=>!words.some(n=>{
    const overlap=Math.max(0,Math.min(w.x+w.w,n.x+n.w)-Math.max(w.x,n.x));
    return Math.abs(w.y-n.y)<Math.max(3,n.h*.65,w.h*.65)&&overlap/Math.max(1,w.w)>.55;
   }));
   const merged=groupWords([...words,...rasterWords]);
   return {text:merged||native||ocr,native,words:[...words,...rasterWords],method:'PDF-text och lokal bildläsning inom markeringen',confidence:words.length?100:data.confidence,warnings:[]};
  }finally{canvas.width=canvas.height=1;}
 }
 function updateMatchCounts(){
  const selected=matchRun?.hits.filter(h=>h.selected!==false)||[];
  const summary=$('rtMatchCount');if(summary){const cards=Object.values(prepared),linked=new Set(selected.map(h=>h.code));summary.textContent=cards.length+' avlästa kort · '+selected.length+' valda ritningspositioner · '+cards.filter(c=>!linked.has(c.code)).length+' kort utan träff';}
  for(const card of Object.values(prepared)){
   const hint=[...ui.querySelectorAll('.rtMatchHint')].find(el=>el.dataset.cardId===card.id),count=selected.filter(h=>h.code===card.code).length;
   if(hint)hint.textContent=matchRun?count+' valda stämplar med beteckningen '+card.code+'.':'Sök stämplar för att kontrollera kopplingen till ritningen.';
  }
  validatePrepared();
 }
 function renderMatches(){
  const root=$('rtDrawingResults');root.replaceChildren();$('rtGoMatches').hidden=!matchRun;if(!matchRun)return;
  $('rtGoMatches').textContent='4. Granska '+matchRun.hits.length+' träffar på ritningen';
  const heading=document.createElement('h3');heading.id='rtMatchCount';root.append(heading);
  const help=document.createElement('p');help.textContent=matchRun.hits.length?'Tryck Visa för att kontrollera placeringen. Avmarkera felaktiga träffar och exempel i teckenförklaringar.':'Inga stämplar hittades. Markera en exempelstämpel på ritningen och sök igen. Fortsätter du utan träffar skapas inga automatiska kopplingar.';root.append(help);
  for(const warning of matchRun.warnings||[]){const p=document.createElement('p');p.className='rtSearchNotice';p.textContent=warning;root.append(p);}
  const list=document.createElement('div');list.className='rtMatchList';root.append(list);
  matchRun.hits.forEach((hit,i)=>{
   const row=document.createElement('div');row.className='rtMatchRow';
   const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=hit.selected!==false;check.setAttribute('aria-label','Ta med '+hit.code+' sida '+hit.page+' träff '+(i+1));
   check.onchange=()=>{hit.selected=check.checked;$('rtMatchApproval').checked=false;updateMatchCounts();};
   label.append(check,document.createTextNode(hit.code+' · sida '+hit.page));
   const button=document.createElement('button');button.type='button';button.textContent='Visa';button.setAttribute('aria-label','Visa '+hit.code+' sida '+hit.page+' träff '+(i+1));
   button.onclick=async()=>{drawingPage=hit.page;focusedHit=hit;setMode('stamp',false);await render();const box=$('rtHitRect');if(!box.hidden)box.scrollIntoView({block:'center',inline:'center',behavior:'instant'});};row.append(label,button);list.append(row);
  });
  $('rtMatchApproval').disabled=busy;updateMatchCounts();
 }
 async function findDrawing(version){
  const cards=Object.values(prepared),pages=[...new Set(cards.map(c=>c.page))],codes=cards.map(c=>c.code);
  if(!cards.length)throw Error('Välj minst ett dörrkort.');
  if(new Set(codes).size!==codes.length)throw Error('Flera dörrkort har samma beteckning. Välj ett kort per beteckning, eller rätta beteckningarna innan sökning.');
  if(codes.some(c=>!norm(c)))throw Error('Välj en giltig beteckning för varje kort först.');
  if(drawingSample&&!validRect(drawingSample.rect))throw Error('Markera hela exempelstämpeln på ritningen först.');
  invalidateMatches();
  const result=await window.SmartMatchReadMatcher.scan({pdf:doc,codeOnly:codeOnly(),getTextContent:async pg=>(await nativePageWords(pg)).content,cardPages:pages,codes,sample:drawingSample,annotationIndex,imageMode:$('rtImageMode').value,getWorker:localWorker,recognize,onDetail:readDetail,onProgress:status,cancelled:()=>version!==cancelVersion});
  if(version!==cancelVersion)return;
  if(metadataWarning)result.warnings.unshift(metadataWarning);
  result.imageMode=$('rtImageMode').value;matchRun=result;renderMatches();
  const direct=result.pages.filter(p=>p.scanMode==='stamp-index').reduce((sum,p)=>sum+p.count,0);
  status(direct?'Sökningen hittade '+result.hits.length+' träffar; '+direct+' lästes direkt ur PDF-stämplar. Granska träffarna och kryssa i bekräftelsen före start.':'Sökningen är klar. Granska träffarna och kryssa i bekräftelsen före start.');
 }
 async function searchDrawing(){
  if(busy||!confirmed)return;const version=cancelVersion;lock(true);beginReadProgress('Söker beteckningar på ritningen');
  try{await findDrawing(version);}catch(e){if(version===cancelVersion){status(e.message||String(e));endReadProgress('error',e.message||String(e));}}
  finally{if(version===cancelVersion){if(readingProgress?.snapshot().active)endReadProgress();await release();lock(false);}}
 }
 function retainedWork(card){
  const old=cardsFrom(previousRead).find(c=>c.page===card.page&&c.code===card.code);
  if(!old||old.workState==='pending')return card;
  return {...card,tableRect:old.tableRect,rawTable:old.rawTable||'',tableWords:old.tableWords||[],work:clone(old.work),workItems:clone(old.workItems||[]),workWarnings:clone(old.workWarnings||[]),workPolicy:old.workPolicy,workState:'ready'};
 }
 async function preview(){
  if(busy)return;const version=cancelVersion;
  try{
   if(!readyAreas())throw Error(codeOnly()?'Markera kodområdet först.':'Markera arbetslistan inklusive kolumnrubriker först.');
   const regions=selectedRegions();if(!regions.length)throw Error('Välj minst ett föreslaget dörrkort.');
   lock(true);prepared={};invalidateMatches();$('rtResults').replaceChildren();confirmed=false;productsRead=false;
   beginReadProgress(productsOnly?'Läser arbetslistor':codeOnly()?'Läser koder och matchar ritningen':'Läser koder, arbetslistor och ritning');
   const headingCounts=new Map();
   if(!codeOnly())for(const r of regions)for(const label of new Set(String(r.tableText||'').split('\n').map(clean).filter(isWorkHeading)))headingCounts.set(label,(headingCounts.get(label)||0)+1);
   const knownLabels=[...headingCounts].filter(([,count])=>count>=Math.max(2,Math.ceil(regions.length*.4))).map(([label])=>label);
   for(const [index,region]of regions.entries()){
    const p=region.page;status((productsOnly?'Läser arbetslista ':codeOnly()?'Läser kod ':'Provläser kort ')+(index+1)+' av '+regions.length+' · sida '+p+'…');
    const cardProgress={phase:'card-reading',label:productsOnly?'Läser arbetslista':codeOnly()?'Läser kodfält':'Läser dörrkort',page:p,pageIndex:index+1,pageCount:regions.length,unit:'card',done:index,total:regions.length,scope:'prepared-cards'};readDetail(cardProgress);
    const pg=await doc.getPage(p);
    const codeRead=productsOnly?{ids:[region.code],text:region.header,warnings:[],method:region.method,confidence:region.confidence}:await readRegion(pg,region.codeRect,'code',version);
    if(version!==cancelVersion)return;
    const code=codeRead.ids.length===1?codeRead.ids[0]:'';
    let card;
    if(codeOnly()){
     card=retainedWork({...region,code,header:codeRead.text,tableRect:null,rawTable:'',tableWords:[],work:[],workItems:[],workWarnings:codeRead.warnings||[],workState:'pending',method:codeRead.method,confidence:codeRead.confidence,choices:codeRead.ids});
    }else{
     readDetail({...cardProgress,label:'Läser markerad arbetslista som PDF-text'});
     const tableRead=await readRegion(pg,region.tableRect,'table',version);if(version!==cancelVersion)return;
     const selected=selectedWork(tableRead,knownLabels);
     card={...region,code,header:codeRead.text,rawTable:tableRead.text,tableWords:tableRead.words||[],work:selected.work,workItems:selected.items,workWarnings:[...(codeRead.warnings||[]),...(tableRead.warnings||[]),...selected.warnings],workPolicy:workPolicy()==='gs'?'gs-install-v1':'all',workState:'ready',method:tableRead.method,confidence:tableRead.confidence,choices:codeRead.ids};
    }
    prepared[card.id]=card;renderResult(card);
    readDetail({...cardProgress,done:index+1});
   }
   confirmed=true;populateStampCodes();
   if(productsOnly){productsRead=true;status('Arbetslistorna är lästa. Granska raderna och tryck Spara produkter. Ritningens kopplingar är oförändrade.');validatePrepared();}
   else if(Object.values(prepared).every(c=>norm(c.code)))await findDrawing(version);
   else status('Provläsningen är klar. Välj rätt beteckning för varje kort och tryck Sök på ritningen igen.');
  }catch(e){if(version===cancelVersion){status(e.message||String(e));endReadProgress('error',e.message||String(e));}}
  finally{if(version===cancelVersion){if(readingProgress?.snapshot().active)endReadProgress();await release();lock(false);}}
 }
 function validatePrepared(){
  const cards=Object.values(prepared),codes=cards.map(c=>c.code);
  $('rtStart').disabled=busy||!confirmed||!cards.length||cards.some(c=>!norm(c.code))||new Set(codes).size!==codes.length||(productsOnly?!productsRead:!matchRun||!$('rtMatchApproval').checked);
 }
 function renderResult(card){
  const p=card.page,n=Object.keys(prepared).indexOf(card.id)+1;
  const panel=document.createElement('section');panel.className='rtResult';panel.dataset.page=p;panel.dataset.cardId=card.id;
  const h=document.createElement('h3');h.textContent='Kort '+n+' · sida '+p;panel.append(h);
  const read=document.createElement('p');read.className='rtReadText';read.textContent='Avläst: '+(card.header||'Ingen säker beteckning');panel.append(read);
  if(productsOnly){const id=document.createElement('p');id.textContent='Sparad koppling: '+card.code;panel.append(id);}
  const label=document.createElement('label');label.textContent='Beteckning att matcha';const input=document.createElement('input');input.value=card.code;input.disabled=busy||productsOnly;input.setAttribute('aria-label','Beteckning kort '+n);label.hidden=productsOnly;label.append(input);panel.append(label);
  const hint=document.createElement('p');hint.className='rtMatchHint';hint.dataset.page=p;hint.dataset.cardId=card.id;
  hint.textContent=card.choices.length>1&&!card.code?'Flera möjliga beteckningar: '+card.choices.join(', ')+'. Välj vilken som gäller.':'Sök stämplar för att kontrollera kopplingen till ritningen.';
  input.oninput=()=>{card.code=norm(input.value);invalidateMatches();populateStampCodes();validatePrepared();};panel.append(hint);
  for(const message of card.workWarnings||[]){const notice=document.createElement('p');notice.className='rtSearchNotice';notice.textContent=message;panel.append(notice);}
  if(codeOnly()){const note=document.createElement('p');note.className='rtReadMethod';note.textContent=(card.method||'Sparad kod')+' · '+(card.workState==='pending'?'Produkter läses senare.':'Tidigare arbetslista bevaras.');panel.append(note);$('rtResults').append(panel);return;}
  const method=document.createElement('p');method.className='rtReadMethod';method.textContent=(card.method||'Sparad läsning')+' · '+card.work.length+' arbetsrader'+(card.workPolicy==='gs-install-v1'?' för GS':'');panel.append(method);
  const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Granska tabell och arbetsrader';pre.textContent=card.rawTable||'Ingen text kunde läsas. Lägg till arbetsrader manuellt eller justera markeringen.';details.append(summary,pre);panel.append(details);
  const workLabel=document.createElement('label');workLabel.textContent='Arbetsrader · en uppgift per rad';const area=document.createElement('textarea');area.rows=6;area.value=card.work.join('\n');area.setAttribute('aria-label','Arbetsrader kort '+n);area.oninput=()=>{card.work=area.value.split('\n').map(clean).filter(Boolean);card.workItems=[];};workLabel.append(area);details.append(workLabel);
  const note=document.createElement('small');note.textContent='Kontrollera arbetsraderna. Dessa får var sin Klar-ruta för varje enskild stämpel.';details.append(note);$('rtResults').append(panel);
 }
 function start(){
  if(busy||!confirmed||(productsOnly?!productsRead:!matchRun||!$('rtMatchApproval').checked))return;
  try{
   const cards=Object.values(prepared),pages=[...new Set(cards.map(c=>c.page))].sort((a,b)=>a-b);
   if(!cards.length||cards.some(c=>!norm(c.code))||new Set(cards.map(c=>c.code)).size!==cards.length)throw Error('Välj en unik giltig beteckning för varje kort.');
   active={...(productsOnly?clone(previousRead):{}),schema:1,phase:codeOnly()?'codes':'full',sourceId,rects:clone(rects),pages,cards:clone(prepared),checks:clone(preparedChecks),matching:productsOnly?clone(previousRead.matching):{...clone(matchRun),review:{version:1,approved:true}},drawingSample:drawingSample?clone(drawingSample):null,name:clean($('rtName').value)||'Egen läsmall'};
   if($('rtSaveTemplate').checked){
    const saved=templates(),item={name:active.name,rects:clone(rects)};const i=saved.findIndex(t=>t.name===item.name);if(i>=0)saved[i]=item;else saved.push(item);
    try{localStorage.setItem(templatesKey,JSON.stringify(saved));}catch(_){status('Mallen kunde inte sparas på enheten. Projektets val används ändå.');}
   }
   remember();finish(true);
  }catch(e){status(e.message);}
 }
 function finish(value){if(!resolveChoice)return;if(readingProgress?.snapshot().active)endReadProgress(value?'done':'cancelled');cancelVersion++;const resolve=resolveChoice;resolveChoice=null;ui.close();void release();resolve(value);}
 async function beforeAnalyze(file,options={}){
  if(opening)return false;opening=true;let candidate=null,borrowedDoc=false;productsOnly=options.productsOnly===true;productsRead=false;
  try{
   let metadata;
   if(productsOnly&&options.liveReadData&&window.SmartMatchAppBridge?.getPdf()){
    doc=window.SmartMatchAppBridge.getPdf();borrowedDoc=true;sourceId=options.liveReadData.sourceId;metadata={data:null,hasReadData:false,annotations:[],warning:''};
   }else{
    const bytes=new Uint8Array(await file.arrayBuffer());sourceId=await sourceHash(bytes);
    metadata=await sourceMetadata(bytes);doc=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
   }
   annotationIndex=metadata.annotations;metadataWarning=metadata.warning;
   const usable=data=>validDocumentData(data,doc.numPages);
   let local=null;try{local=JSON.parse(localStorage.getItem('tillsyno-read-test-v9-1-source:'+sourceId)||'null');}catch(_){}
   // External files are authoritative. Local data only prefills a new file's
   // guide, or resumes an explicitly cached session. Settings use live work.
   if(options.forceReview&&usable(options.liveReadData))candidate=options.liveReadData;
   else if(options.cachedResume)candidate=usable(local)?local:usable(metadata.data)?metadata.data:null;
   else if(metadata.hasReadData)candidate=usable(metadata.data)?metadata.data:null;
   else candidate=usable(local)?local:null;
   let fits=true;
   if(candidate?.matching)try{fits=await geometryFits(doc,candidate);}catch(_){fits=false;}
   if(!productsOnly&&!options.forceReview&&fits&&reviewedData(candidate,doc.numPages)&&(options.cachedResume||candidate===metadata.data)){
    active=clone(candidate);active.sourceId=sourceId;remember();return true;
   }
   const needsReview=metadata.hasReadData&&!reviewedData(metadata.data,doc.numPages);
   if(candidate&&!fits){candidate=clone(candidate);delete candidate.matching;}
   if(productsOnly&&(!candidate||!candidate.matching||!fits))throw Error('De sparade kopplingarna kunde inte återanvändas. Öppna Läsområden och kontrollera projektet först.');
   previousRead=candidate?clone(candidate):null;makeUI();readingProgress?.reset();resetDiscovery();
   $('rtReadPhase').value=candidate?.phase==='codes'||!candidate?'codes':'full';
   $('rtTitle').textContent=productsOnly?'Fortsätt med produkter':'Läs dörrkort och matcha stämplar';
   rects=validData(candidate)?clone(candidate.rects):{};prepared=validData(candidate)?Object.fromEntries(cardsFrom(candidate).map(c=>[c.id,clone(c)])):{};confirmed=validData(candidate);preparedChecks=clone(candidate?.checks||{});
   view='card';drawingPage=candidate?.drawingSample?.page||1;drawingSample=validData(candidate)&&validRect(candidate?.drawingSample?.rect)?clone(candidate.drawingSample):null;matchRun=validData(candidate)&&candidate.matching?clone(candidate.matching):null;focusedHit=null;
   example=candidate?.pages?.[0]||Math.min(2,doc.numPages);zoom=1;gesture=null;busy=false;cancelVersion++;
   $('rtPage').value=String(example);$('rtPage').max=String(doc.numPages);$('rtPageCount').textContent='av '+doc.numPages;$('rtPages').value=candidate?.pages?.join(', ')||String(example);$('rtName').value=candidate?.name||'';
   const select=$('rtTemplate');select.replaceChildren(new Option('Ny markering',''));templates().forEach((t,i)=>select.add(new Option(t.name,String(i))));
   $('rtImageMode').value=['text','full'].includes(candidate?.matching?.imageMode)?candidate.matching.imageMode:'auto';
   $('rtWorkPolicy').value=candidate&&cardsFrom(candidate).some(c=>c.workState!=='pending'&&c.workPolicy!=='gs-install-v1')?'all':'gs';
   $('rtResults').replaceChildren();for(const card of Object.values(prepared))renderResult(card);
   populateStampCodes();renderMatches();$('rtMatchApproval').checked=false;
   coordinates();setMode(productsOnly?'table':'code');lock(false);status(productsOnly?'Markera arbetslistan inklusive kolumnrubriker på ett kort. Läs sedan produkterna; kopplingarna finns kvar.':needsReview||!fits?'Sparade kopplingar behöver granskas. Kontrollera korten och sök på ritningen igen.':confirmed?'Sparad avläsning hittad. Granska träffarna eller justera och sök igen.':'Välj ett exempelkort och markera koden. Zooma med mushjulet eller två fingrar om texten är liten.');
   const choice=new Promise(resolve=>{resolveChoice=resolve;});ui.showModal();await render();return await choice;
  }finally{
   if(ui)resetViewportInput();
   const oldDoc=doc,oldRender=renderTask;doc=null;renderTask=null;renderedPreview=null;renderVersion++;annotationIndex=[];metadataWarning='';pageTextCache=new WeakMap();regionReadCache=new WeakMap();
   try{if(oldRender){oldRender.cancel();try{await oldRender.promise;}catch(_){}}if(oldDoc&&!borrowedDoc)await oldDoc.destroy();}
   finally{opening=false;productsOnly=false;productsRead=false;previousRead=null;}
  }
 }
 async function openSettings(){
  const app=window.SmartMatchAppBridge,bytes=app?.getOriginalPdfBytes();
  if(!bytes?.length){app?.setStatus('Öppna en PDF med ritning och dörrkort först. Avläsningsvyn visas före skanningen.');return;}
  const file=new File([bytes],$('pwFileName').title||'Projekt.pdf',{type:'application/pdf'});
  if(await beforeAnalyze(file,{forceReview:true,liveReadData:active?clone(active):null}))await app.applyReadSettings();
 }
 async function continueProducts(){
  const app=window.SmartMatchAppBridge,bytes=app?.getOriginalPdfBytes();
  if(opening||!active||!bytes?.length)return;
  const snapshot=clone(active),file=new File([bytes],$('pwFileName').title||'Projekt.pdf',{type:'application/pdf'});
  try{
   if(await beforeAnalyze(file,{productsOnly:true,forceReview:true,liveReadData:snapshot})){
    try{await app.applyReadWorkUpdates();}
    catch(error){active=snapshot;remember();throw error;}
   }
  }catch(error){app?.setStatus('Produkterna kunde inte läsas: '+error.message);}
 }
 function protocolDef(code,page){
  const card=cardFor(code,page);if(!card)return null;
  if(card.workState==='pending')return {code,page,lines:[],checks:[],pending:true,workState:'pending'};
  const lines=card.work.map((text,i)=>{const item=card.workItems?.[i];return {key:rowKey(text,i),text,label:item?.text===text?item.label:text,value:item?.text===text?item.value||'':'',actionable:true,administrative:false};});
  return {code,page,lines,checks:lines,workState:'ready'};
 }
 function checksForPosition(o){return active?.checks?.[o.id]||{};}
 function syncChecks(o){
  const page=window.SmartMatchAppBridge?.getDoorCardMapping()?.[o.code],def=protocolDef(o.code,page);if(!def||!active)return;
  active.checks=active.checks||{};const checks=active.checks[o.id]=active.checks[o.id]||{};
  for(const line of def.checks)checks[line.key]=!!o.checks?.[line.key];
  remember();
 }
 function appendTable(root,code,page){
  const card=cardFor(code,page);if(!card||card.workState==='pending')return;
  const details=document.createElement('details');details.className='rtTableUnderlay';const summary=document.createElement('summary');summary.textContent='Hela avlästa tabellen · eget läsområde';const pre=document.createElement('pre');pre.textContent=card.rawTable||'Ingen tabelltext kunde läsas.';details.append(summary,pre);root.append(details);
 }
 function workProgress(o){
  const page=window.SmartMatchAppBridge?.getDoorCardMapping()?.[o.code],def=protocolDef(o.code,page);
  if(!def)return null;
  if(def.pending)return {done:0,total:0,percent:0,pending:true};
  const checks=active.checks?.[o.id]||{},total=def.lines.length,done=def.lines.filter(line=>checks[line.key]).length;
  const state=window.SmartMatchAppBridge?.readWorkState?.(o);
  return {done,total,percent:state?.percent??(total?Math.round(done/total*100):0)};
 }
 function updateBadges(){
  const app=window.SmartMatchAppBridge;if(!app)return;
  for(const button of document.querySelectorAll('#pwMarkers [data-position-id]')){
   const o=app.getPositions().find(p=>p.id===button.dataset.positionId),state=o&&workProgress(o);if(!state)continue;
   let badge=button.querySelector('.rtWorkBadge');if(!badge){badge=document.createElement('span');badge.className='rtWorkBadge';button.append(badge);}
   badge.textContent='Arbete '+state.done+'/'+state.total;
  }
  const states=app.getPositions().map(workProgress).filter(Boolean),summary=$('rtWorkSummary');
  if(summary)summary.textContent=states.length?'Arbete: '+states.filter(s=>s.total&&s.done===s.total).length+'/'+states.length+' dörrar klara':'';
 }
 function renderWork(root,o,page){
  const def=protocolDef(o.code,page),custom=!!def;
  for(const id of ['pwChecklistMarkAll','pwChecklistClearAll','pwAddChecklistItem'])if($(id))$(id).hidden=custom;
  if(!custom)return false;
  if(def.pending){
   const p=document.createElement('p');p.className='rtInternalNote';p.textContent='Produkter har inte lästs ännu. Kopplingen till dörrkortet är sparad.';
   const button=document.createElement('button');button.type='button';button.textContent='Fortsätt med produkter';button.onclick=()=>void continueProducts();root.append(p,button);
   $('pwChecklistMeta').textContent='Arbetslista ej läst';$('pwProtocolPercent').textContent='Ej läst';$('pwProtocolBar').style.width='0%';return true;
  }
  appendTable(root,o.code,page);active.checks=active.checks||{};
  const caption=document.createElement('p');caption.className='rtInternalNote';caption.textContent='Arbetslista · endast i appen. Klar-markeringarna hör till den här dörren.';root.append(caption);
  const redraw=()=>{const state=workProgress(o);$('pwChecklistMeta').textContent=state.done+' av '+state.total+' klara';$('pwProtocolPercent').textContent=state.percent+'% arbete';$('pwProtocolBar').style.width=state.percent+'%';updateBadges();};
  for(const line of def.lines){
   const labelText=[line.label,line.value].filter(Boolean).join(' · ');
   const label=document.createElement('label');label.className='rtWorkRow';const check=document.createElement('input');check.type='checkbox';check.checked=!!active.checks[o.id]?.[line.key];check.setAttribute('aria-label','Klar: '+labelText);
   const text=document.createElement('span');text.textContent=labelText;const tag=document.createElement('strong');tag.textContent='Klar';label.append(check,text,tag);root.append(label);
   check.onchange=async()=>{check.disabled=true;try{active.checks[o.id]=active.checks[o.id]||{};active.checks[o.id][line.key]=check.checked;remember();await window.SmartMatchAppBridge.setReadWorkCheck(o,line.key,check.checked);redraw();}catch(error){window.SmartMatchAppBridge.setStatus('Arbetsstatus kunde inte sparas: '+error.message);}finally{check.disabled=false;}};
  }
  if(!def.lines.length){const p=document.createElement('p');p.textContent='Inga arbetsrader valda. Öppna Läsområden för att justera provläsningen.';root.append(p);}
  redraw();return true;
 }
 window.addEventListener('pagehide',()=>void release());
 window.addEventListener('DOMContentLoaded',()=>{
  $('rtChooseFiles')?.addEventListener('click',()=>$('rtMultiFiles').click());
  $('rtMultiFiles')?.addEventListener('change',async e=>{
   const files=[...e.target.files];e.target.value='';if(!files.length)return;
   try{
    let file=files[0];
    if(files.length>1){
     window.SmartMatchAppBridge.setStatus('Öppnar PDF-filerna tillsammans…');
     const merged=await PDFLib.PDFDocument.create();
     for(const input of files){const source=await PDFLib.PDFDocument.load(await input.arrayBuffer());for(const pg of await merged.copyPages(source,source.getPageIndices()))merged.addPage(pg);}
     file=new File([await merged.save()], 'Ritning-och-dorrkort-test.pdf',{type:'application/pdf'});
    }
    await window.SmartMatchAppBridge.openReadFile(file,{forceReview:true});
   }catch(error){window.SmartMatchAppBridge.setStatus('PDF-filerna kunde inte öppnas: '+error.message);}
  });
  const markers=$('pwMarkers');if(markers)new MutationObserver(updateBadges).observe(markers,{childList:true});for(const id of ['rtOpenSettings','rtMenuSettings'])$(id)?.addEventListener('click',()=>{const menu=$('pwToolMenu');if(menu)menu.hidden=true;void openSettings().catch(e=>window.SmartMatchAppBridge?.setStatus(e.message));});});
 window.SmartMatchReadTest=Object.freeze({beforeAnalyze,openSettings,continueProducts,hasPendingProducts:()=>cardsFrom(active).some(c=>c.workState==='pending'),parsePages,candidates,workRows,cardFor,cardRegion:(code,page)=>cardFor(code,page)?.bounds||null,isCardPage:p=>!!active?.pages.includes(p),identityForPage:p=>{const c=cardsForPage(p)[0];return c?{code:c.code,row:c.header,area:'known-layout-card-heading',profileId:'user-selected-read-test-v9'}:null;},identitiesForPage:p=>cardsForPage(p).map(c=>({code:c.code,row:c.header,area:'known-layout-card-heading',profileId:'user-selected-read-test-v9',cardId:c.id})),drawingSelection:()=>active?.matching?.version===2?{codes:[...new Set(cardsFrom(active).map(c=>c.code))],positions:clone(active.matching.hits.filter(h=>h.selected!==false))}:null,protocolDef,checksForPosition,syncChecks,appendTable,renderWork,payload:()=>active?clone(active):null});
})();
