pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const CHECKS=[['1.1','Samtal med nyttjaren.'],['1.2','Okulärbesiktning av dörrautomatik/dörrmiljö.'],['1.3','Kontroll av eventuella ombyggnader.'],['1.4','Kontroll fastsättning, infästning och eventuella efterdragningar av skruvar.'],['1.5','Funktionskontroll manuell och automatisk öppning (kraft, dämpning & hastighet).'],['1.6','Funktionskontroll manuell och automatisk stängning (kraft, dämpning & hastighet).'],['1.7','Funktionskontroll öppnings- & stängningstider.'],['1.8','Funktionskontroll av nödöppning & utrymning.'],['1.9','Funktionskontroll/justering koordinator och armsystem.'],['1.10','Funktionskontroll impulsgivare (radar, armbågskontakter etc).'],['1.11','Sensorlister och säkerhetsanordningar.'],['1.12','Funktionskontroll låsfunktioner (dörrblad, elslutbleck, motorlås, ellås, låshus).'],['1.13','Kontroll/justering uppställningsmagnet & dörrstopp.'],['1.14','Kontroll gummiupphängningar, fjädrar, tryckslangar & tätning.'],['1.15','Kontroll motor, pump, hydraulik och drivaxel.'],['1.16','Kontroll säkringar / programväljare / styrmodul.'],['1.17','Behovsrengöring dörrautomatik och sensorlister.'],['1.18','Mindre justering.']];
const COMMON_FAULTS={
'1.1':['Nyttjaren uppger återkommande driftstörning','Nyttjaren uppger avvikande funktion','Användning eller förutsättningar har ändrats'],
'1.2':['Skada/slitage i dörrmiljön','Lösa eller skadade delar','Dörrblad/karm behöver justeras'],
'1.3':['Ombyggnad påverkar dörrmiljön','Ändrad dörrmiljö kräver ny riskbedömning','Ny eller ändrad utrustning behöver kontrolleras'],
'1.4':['Infästning lös, efterdragning krävs','Skruvar saknas/lösa','Automatikhus/arm sitter löst'],
'1.5':['För hög öppningskraft','Fel öppningshastighet','Dämpning behöver justeras','Dörr öppnar inte fullt'],
'1.6':['För hög stängningskraft','Fel stängningshastighet','Dämpning behöver justeras','Dörr stänger inte helt'],
'1.7':['Öppningstid behöver justeras','Stängningstid behöver justeras','Öppethållandetid behöver justeras'],
'1.8':['Nödöppning fungerar ej','Utrymningsfunktion behöver åtgärdas'],
'1.9':['Armsystem behöver justeras','Koordinator fungerar ej korrekt','Glapp/slitage i armsystem'],
'1.10':['Radar/impulsgivare fungerar ej','Armbågskontakt fungerar ej','Impulsgivare behöver justeras'],
'1.11':['Säkerhetssensor saknas, komplettera enligt SS-EN 16005 och aktuell riskbedömning','Klämskydd saknas, komplettera enligt SS-EN 16005 där aktuell riskbedömning visar klämrisk','Säkerhetssensor/sensorlist fungerar ej','Säkerhetssensor täcker inte riskområdet','Klämskydd saknas eller är otillräckligt','Komplettera med säkerhetssensor eller klämskydd'],
'1.12':['Elslutbleck fungerar ej korrekt','Lås släpper för sent/kort tid','Motorlås/ellås fungerar ej','Dörr/lås behöver justeras'],
'1.13':['Dörrstopp saknas, komplettera med dörrstopp för att begränsa öppningsvinkeln till 90° där detta är angiven maxvinkel för aktuell automatik/installation','Dörrstopp saknas eller är felplacerat','Dörr öppnar för långt / fel öppningsvinkel','Uppställningsmagnet fungerar ej','Arm eller drivaxel belastas i öppet ändläge','Dörrstopp/öppningsvinkel behöver justeras enligt tillverkarens anvisning'],
'1.14':['Gummiupphängning sliten','Fjäder behöver bytas/justeras','Tryckslang/tätning behöver åtgärdas'],
'1.15':['Motor missljud/slitage','Pump/hydraulik läcker','Drivaxel glapp/slitage'],
'1.16':['Programväljare fungerar ej','Styrmodul fel','Säkring/strömförsörjning behöver åtgärdas'],
'1.17':['Rengöring av automatik krävs','Rengöring av sensor/sensorlist krävs'],
'1.18':['Mindre justering utförd','Ytterligare justering krävs']
};
let pdf,page=1,addMode=false,textMode=false,selected=null,doors=[],importQueue=[],textNotes=[],drawingExtras=[],baseScale=1,zoom=1,pinch=null,dragging=null,panTouch=null,panMouse=null,project={},logoData='',visualZoom=1,suppressPageSwipeUntil=0,newlyPlacedDoorUid='',newlyPlacedDoorUntil=0,precisionMode=false;
function doorLocalToday(){const d=new Date(),local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,10)}
function cleanRemarkText(value){return String(value||'').replace(/\s+[–—-]\s+/g,', ').replace(/\s{2,}/g,' ').trim()}
const $=x=>document.getElementById(x),canvas=$('pdfCanvas'),ctx=canvas.getContext('2d'),markers=$('markers'),drawingNotes=$('drawingNotes'),wrap=$('viewerWrap');
const appHome=$('appHome'),enterDoorMode=$('enterDoorMode'),homeBtn=$('homeBtn');
function showAppHome(){document.body.classList.add('homeMode');if(appHome)appHome.hidden=false}
function enterDoorService(){document.body.classList.remove('homeMode');if(appHome)appHome.hidden=true}
if(enterDoorMode)enterDoorMode.onclick=enterDoorService;
if(homeBtn)homeBtn.onclick=showAppHome;

let activeDrawingKey=null,activeDrawingName='',exporting=false,sourcePdfBytes=null;
const DRAWING_PREFIX='doorservice-drawing-v1:';
function normalizeDoorCheckEdits(d){
 const valid=new Set(CHECKS.map(([n])=>n)),raw=d.checkEdits&&typeof d.checkEdits==='object'&&!Array.isArray(d.checkEdits)?d.checkEdits:{},clean={};
 Object.entries(raw).forEach(([id,value])=>{if(!valid.has(id))return;if(value===null)clean[id]=null;else if(typeof value==='string'&&value.trim())clean[id]=value.trim()});
 d.checkEdits=clean;
}
function doorChecks(d){
 normalizeDoorCheckEdits(d);
 const base=CHECKS.filter(([n])=>d.checkEdits[n]!==null).map(([n,title])=>[n,typeof d.checkEdits[n]==='string'?d.checkEdits[n]:title]);
 return [...base,...(Array.isArray(d.customChecks)?d.customChecks:[]).map(c=>[c.id,c.title])];
}
function normalizeDoorCustomChecks(d){
 const used=new Set(CHECKS.map(([n])=>n));
 d.customChecks=(Array.isArray(d.customChecks)?d.customChecks:[]).filter(c=>{
  if(!c||typeof c.id!=='string'||!/^1\.\d+$/.test(c.id)||used.has(c.id)||typeof c.title!=='string'||!c.title.trim())return false;
  used.add(c.id);c.title=c.title.trim();return true;
 });
}
function syncDoorCheckStatus(d){
 const checks=doorChecks(d),remark=checks.some(([n])=>d.checks[n]?.result==='remark'),done=checks.length>0&&checks.every(([n])=>['ok','na','remark'].includes(d.checks[n]?.result));
 if(d.status!=='fail')d.status=remark?'action':done?'ok':'untested';
}
function addDoorCustomCheck(d,title){
 if(typeof title!=='string'||!title.trim())return false;
 normalize(d);const used=new Set(doorChecks(d).map(([n])=>n));let next=CHECKS.length+1;
 while(used.has('1.'+next))next++;
 const id='1.'+next;d.customChecks.push({id,title:title.trim()});d.checks[id]={result:'',note:''};
 d.remediationDate='';d.remediationSignature='';syncDoorCheckStatus(d);return true;
}
function editDoorCheck(d,id,title){
 if(typeof title!=='string'||!title.trim())return false;
 normalize(d);const next=title.trim(),custom=d.customChecks.find(c=>c.id===id),base=CHECKS.find(([n])=>n===id);
 if(custom){if(custom.title===next)return false;custom.title=next}
 else if(base){const current=typeof d.checkEdits[id]==='string'?d.checkEdits[id]:base[1];if(current===next)return false;if(next===base[1])delete d.checkEdits[id];else d.checkEdits[id]=next}
 else return false;
 d.checks[id]={result:'',note:''};d.remediationDate='';d.remediationSignature='';syncDoorCheckStatus(d);return true;
}
function removeDoorCheck(d,id){
 normalize(d);const custom=d.customChecks.some(c=>c.id===id),base=CHECKS.some(([n])=>n===id);
 if(custom)d.customChecks=d.customChecks.filter(c=>c.id!==id);else if(base)d.checkEdits[id]=null;else return false;
 delete d.checks[id];d.remediationDate='';d.remediationSignature='';syncDoorCheckStatus(d);return true;
}
function normalize(d){d.checks=d.checks||{};Object.values(d.checks).forEach(c=>{if(c&&typeof c.note==='string')c.note=cleanRemarkText(c.note)});if(Array.isArray(d.previousIssues))d.previousIssues.forEach(issue=>{if(issue&&typeof issue.note==='string')issue.note=cleanRemarkText(issue.note)});normalizeDoorCustomChecks(d);normalizeDoorCheckEdits(d);doorChecks(d).forEach(([n])=>d.checks[n]=d.checks[n]||{result:'',note:''});['machineId','location','ao','nextDate','signature','remediationDate','remediationSignature'].forEach(k=>d[k]=d[k]||'');if(!Number.isFinite(d.labelX))d.labelX=Math.max(.035,Math.min(.965,d.x+(d.x>.78?-.075:.075)));if(!Number.isFinite(d.labelY))d.labelY=Math.max(.035,Math.min(.965,d.y-.045));return d}doors.forEach(normalize);
let saveTimer;
function notice(message,error=false){$('appMessage').textContent=message;$('appMessage').classList.toggle('error',error)}
function persist(){
 clearTimeout(saveTimer);if(!activeDrawingKey)return true;
 try{localStorage.setItem(DRAWING_PREFIX+activeDrawingKey,JSON.stringify({version:1,name:activeDrawingName,doors,importQueue,textNotes,drawingExtras,project,logoData,updatedAt:new Date().toISOString()}));return true}
 catch(e){notice('Kunde inte spara på enheten. Behåll appen öppen och exportera protokollet innan du byter ritning.',true);return false}
}
function legacyWork(){
 try{if(localStorage.getItem('doorservice-legacy-assigned'))return null;const saved=JSON.parse(localStorage.getItem('doors')||'[]');if(!Array.isArray(saved)||!saved.length)return null;return {doors:saved,project:JSON.parse(localStorage.getItem('project')||'{}'),logoData:localStorage.getItem('logoData')||''}}
 catch(e){return null}
}
function refreshDrawingUI(){
 PF.forEach(k=>{$(k).value=project[k]||'';$(k).disabled=!activeDrawingKey});$('logoFile').disabled=!activeDrawingKey;
 $('logoPreview').replaceChildren();if(logoData){const img=document.createElement('img');img.src=logoData;$('logoPreview').appendChild(img)}
 $('drawingInfo').textContent=activeDrawingKey?'Aktuell ritning: '+activeDrawingName:'Ingen ritning vald. Ladda upp en PDF för att börja.';
 $('legacyWorkPanel').hidden=!legacyWork();$('restoreLegacy').disabled=!activeDrawingKey||doors.length>0;
 $('exportBtn').disabled=!activeDrawingKey;
}
async function drawingFingerprint(bytes){const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('')}
function savedDrawing(key){
 try{const raw=localStorage.getItem(DRAWING_PREFIX+key);if(!raw)return null;const record=JSON.parse(raw);
  if(record.version!==1||!Array.isArray(record.doors)||record.doors.some(d=>!d||typeof d!=='object'||typeof d.uid!=='string'||typeof d.id!=='string'||!Number.isInteger(d.page)||d.page<1||d.checks&&typeof d.checks!=='object')||!record.project||typeof record.project!=='object')throw new Error('Invalid record');return record;
 }catch(e){const error=new Error('Kunde inte läsa det sparade arbetet för ritningen. Dina tidigare uppgifter har inte skrivits över.');error.storageError=true;throw error}
}
function save(skipOverview=false){$('doorCount').textContent=doors.length+' dörrar';$('restoreLegacy').disabled=!activeDrawingKey||doors.length>0;if(!skipOverview&&$('overviewDialog').open)renderOverview();clearTimeout(saveTimer);saveTimer=setTimeout(persist,250)}
window.addEventListener('pagehide',persist);
document.addEventListener('visibilitychange',()=>{if(document.hidden)persist()});
save();
const PF=['projectName','facilityNo','customer','agreementNo','contact','projectOrder','inspectionDate','projectNextDate','company','companyContact','companyPhone','companyAddress','companyPostalCode','companyPostalCity','phone','address','postalCode','postalCity','technician','serviceSignature'];PF.forEach(k=>{$(k).oninput=()=>{project[k]=$(k).value;save()}});
$('technician').oninput=()=>{const previous=project.technician||'',value=$('technician').value;project.technician=value;if(!project.companyContact||project.companyContact===previous){project.companyContact=value;$('companyContact').value=value}save()};
refreshDrawingUI();
$('settingsBtn').onclick=()=>{$('projectPanel').hidden=!$('projectPanel').hidden};
$('logoFile').onchange=e=>{const f=e.target.files[0],key=activeDrawingKey;if(!f||!key)return;const r=new FileReader();r.onload=()=>{if(key!==activeDrawingKey)return;logoData=r.result;refreshDrawingUI();save()};r.readAsDataURL(f)};
$('restoreLegacy').onclick=()=>{
 const legacy=legacyWork();if(!activeDrawingKey||doors.length||!legacy)return;
 if(!confirm('Koppla de '+legacy.doors.length+' äldre dörrarna och protokollen till '+activeDrawingName+'? Välj bara detta om du har öppnat rätt ritning.'))return;
 const previous={doors,project,logoData};doors=legacy.doors.map(d=>normalize(structuredClone(d)));project=legacy.project||{};logoData=legacy.logoData||'';
 if(!persist()){({doors,project,logoData}=previous);return}
 try{localStorage.setItem('doorservice-legacy-assigned',activeDrawingKey)}catch(e){}
 refreshDrawingUI();save();draw();show();notice('Det äldre arbetet är nu kopplat till '+activeDrawingName+'.');
};
let loadVersion=0,renderVersion=0,renderQueue=Promise.resolve(),renderTask=null;
if($('legacyImportOk'))$('legacyImportOk').onclick=()=>$('legacyImportDialog')?.close();
let pageWidth=1,pageHeight=1;
let drawingRaster=null;
const MAX_PIXELS=4000000,MAX_SIDE=4096;
function boundedViewport(p,scale){const natural=p.getViewport({scale:1});return p.getViewport({scale:Math.min(scale,Math.sqrt(MAX_PIXELS/(natural.width*natural.height)),MAX_SIDE/natural.width,MAX_SIDE/natural.height)})}
async function stripLegacyReportPages(bytes){
 try{
  const scan=await pdfjsLib.getDocument({data:bytes.slice()}).promise;let cut=0;
  for(let i=1;i<=scan.numPages;i++){const pg=await scan.getPage(i),tc=await pg.getTextContent(),txt=tc.items.map(x=>x.str).join(' ').toUpperCase();if(txt.includes('PROVNINGSPROTOKOLL')||txt.includes('ANMÄRKNINGSÖVERSIKT')||txt.includes('CHECKLISTA REVISION AV DÖRRAUTOMATIK')||txt.includes('ID NUMMERMASKIN')){cut=i-1;break}}
  await scan.destroy();if(!cut)return bytes;
  const src=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false}),out=await PDFLib.PDFDocument.create(),pages=await out.copyPages(src,Array.from({length:cut},(_,i)=>i));pages.forEach(p=>out.addPage(p));return new Uint8Array(await out.save());
 }catch(e){return bytes}
}
$('file').onchange=async e=>{
 const f=e.target.files[0];if(!f)return;if(exporting){notice('Vänta tills PDF-exporten är klar innan du byter ritning.');e.target.value='';return}const version=++loadVersion;let candidate;
 notice('Laddar ritning…');$('exportBtn').disabled=true;$('viewerWrap').setAttribute('aria-busy','true');
 try{
  const bytes=new Uint8Array(await f.arrayBuffer()),key=await drawingFingerprint(bytes);
  if(version!==loadVersion)return;
  const imported=await inspectWorkPdf(bytes);
  if(version!==loadVersion)return;
  const legacyImported=!imported&&window.inspectLegacyLinkedPdf?await window.inspectLegacyLinkedPdf(bytes,f.name,message=>{if(version===loadVersion)notice(message)}):null;
  if(version!==loadVersion)return;
  const drawingBytes=imported?.drawingBytes||legacyImported?.drawingBytes||await stripLegacyReportPages(bytes);
  candidate=await pdfjsLib.getDocument({data:drawingBytes.slice()}).promise;
  if(version!==loadVersion){await candidate.destroy();return}
  // Validate the first page before replacing the current drawing.
  await candidate.getPage(1);
  if(version!==loadVersion){await candidate.destroy();return}
  const previous=pdf;++renderVersion;if(renderTask)renderTask.cancel();await renderQueue;
  if(version!==loadVersion){await candidate.destroy();return}
  if(!persist()){await candidate.destroy();return}
  const stored=savedDrawing(key);
  // A raw legacy Service DA PDF must always be rebuilt from its own links/protocols.
  // Only a true Doorservice work PDF is allowed to override that import.
  const record=imported?.work||legacyImported?.work||stored;
  const nextDoors=(record?.doors||[]).map(normalize),nextTextNotes=Array.isArray(record?.textNotes)?record.textNotes.filter(n=>n&&Number.isInteger(n.page)&&n.page>0&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&typeof n.text==='string'):[];
  pdf=candidate;sourcePdfBytes=drawingBytes.slice();activeDrawingKey=key;activeDrawingName=f.name;
  doors=nextDoors;importQueue=Array.isArray(record?.importQueue)?record.importQueue.filter(d=>d&&typeof d==='object'&&typeof d.id==='string').map(d=>structuredClone(d)):[];textNotes=nextTextNotes;drawingExtras=Array.isArray(record?.drawingExtras)?record.drawingExtras:[];project=record?.project||{};if(!project.inspectionDate)project.inspectionDate=doorLocalToday();logoData=record?.logoData||'';
  page=1;zoom=1;selected=null;pinch=null;panTouch=null;
  canvas.width=canvas.height=0;canvas.style.width=canvas.style.height='0px';markers.replaceChildren();drawingNotes.replaceChildren();$('stage').style.width=$('stage').style.height='0px';pageWidth=pageHeight=1;$('pageInfo').textContent='Laddar sida…';
  $('overviewFilter').value='all';$('overviewSearch').value='';refreshDrawingUI();save();if($('overviewDialog').open)$('overviewDialog').close();$('projectPanel').hidden=true;
  $('stage').style.transform='';addMode=false;textMode=false;document.body.classList.remove('placing','placingText','protocolOpen');$('hint').style.display='none';show();goView('drawing');
  if(previous)await previous.destroy();
  const rendered=await render(true);wrap.scrollLeft=0;wrap.scrollTop=0;
  if(version===loadVersion&&rendered){
   if(imported&&doors.length&&$('doorOpenWorkDialog')){
    $('doorOpenWorkMeta').textContent=[project.projectName||project.facilityNo||f.name,doors.length+' dörrar',project.inspectionDate?'senaste service '+project.inspectionDate:''].filter(Boolean).join(' · ');
    $('doorOpenWorkDialog').showModal();notice('Arbets-PDF öppnad. Välj Ny service eller Fortsätt / ändra.');
   }else{
    const prefix=imported?'Arbets-PDF öppnad: ':legacyImported?'Äldre länkad PDF importerad: ':record?'Sparad ritning: ':'Ny ritning: ',importedCount=doors.length+importQueue.length;
    const legacyMessage=legacyImported?f.name+' – '+importedCount+' automatiker hittades. '+doors.length+' placerades automatiskt'+(importQueue.length?' och '+importQueue.length+' väntar på placering. ':' . ')+(legacyImported.summaryText||''):'';
    notice(prefix+f.name+' – '+(legacyImported?importedCount+' automatiker importerade, '+doors.length+' placerade.':doors.length+' dörrar.')+(legacyImported?.summaryText?' '+legacyImported.summaryText:' Välj ＋ Dörr för att lägga till.'));
    if(legacyImported&&$('legacyImportDialog')&&$('legacyImportMeta')){
     $('legacyImportMeta').textContent=legacyMessage;$('legacyImportDialog').showModal();
    }
   }
  }
 }catch(error){if(candidate&&candidate!==pdf)await candidate.destroy();if(version===loadVersion)notice(error.storageError||String(error.message).includes('Arbets-PDF')?error.message:'Kunde inte öppna PDF-filen. Kontrollera att den är giltig och inte lösenordsskyddad.',true)}
 finally{if(version===loadVersion){wrap.setAttribute('aria-busy','false');$('exportBtn').disabled=!activeDrawingKey;e.target.value=''}}
};
function render(fit=false,focus=null,anchor=null){
 if(!pdf)return Promise.resolve();const version=++renderVersion,documentPdf=pdf,pageNumber=page;
 if(renderTask)renderTask.cancel();
 renderQueue=renderQueue.catch(()=>{}).then(async()=>{
  if(version!==renderVersion)return;
  const p=await documentPdf.getPage(pageNumber);if(version!==renderVersion)return;
  const natural=p.getViewport({scale:1});if(fit){const availW=Math.max(120,(wrap.clientWidth||$('drawingView').parentElement.clientWidth)-24),availH=Math.max(120,(wrap.clientHeight||$('drawingView').parentElement.clientHeight)-24);baseScale=Math.min(1.6,Math.max(.1,Math.min(availW/natural.width,availH/natural.height)));}
  const oldW=pageWidth,oldH=pageHeight,oldSL=wrap.scrollLeft,oldST=wrap.scrollTop;
  const logical=p.getViewport({scale:baseScale*zoom}),raster=boundedViewport(p,baseScale*zoom*Math.min(window.devicePixelRatio||1,2));
  // Keep zoom/marker coordinates in CSS pixels; cap only the raster allocation.
  const rasterWidth=Math.ceil(raster.width),rasterHeight=Math.ceil(raster.height);
  // At the raster limit, further zoom changes only geometry, not PDF pixels.
  if(!drawingRaster||drawingRaster.document!==documentPdf||drawingRaster.page!==pageNumber||drawingRaster.width!==rasterWidth||drawingRaster.height!==rasterHeight){
   const nextCanvas=document.createElement('canvas');nextCanvas.width=rasterWidth;nextCanvas.height=rasterHeight;
   const task=p.render({canvasContext:nextCanvas.getContext('2d'),viewport:raster});renderTask=task;
   try{await task.promise}finally{if(renderTask===task)renderTask=null}
   if(version!==renderVersion)return;
   canvas.width=nextCanvas.width;canvas.height=nextCanvas.height;ctx.drawImage(nextCanvas,0,0);nextCanvas.width=nextCanvas.height=0;
   drawingRaster={document:documentPdf,page:pageNumber,width:rasterWidth,height:rasterHeight};
  }
  pageWidth=logical.width;pageHeight=logical.height;
  canvas.style.width=pageWidth+'px';canvas.style.height=pageHeight+'px';
  const stage=$('stage');stage.style.width=pageWidth+'px';stage.style.height=pageHeight+'px';
  const centerGap=Math.max(0,(wrap.clientHeight-pageHeight)/2);stage.style.marginTop=centerGap+'px';stage.style.marginBottom=centerGap+'px';
  const drawingUiScale=Math.max(.52,Math.min(1,Math.sqrt(Math.max(.01,baseScale*zoom))));
  $('stage').style.setProperty('--drawing-ui-scale',drawingUiScale.toFixed(3));
  $('stage').style.setProperty('--drawing-line-width',Math.max(.9,2*drawingUiScale).toFixed(2)+'px');
  $('stage').style.setProperty('--drawing-box-stroke',Math.max(.8,1.5*drawingUiScale).toFixed(2)+'px');
  $('stage').style.setProperty('--door-marker-size',(26*drawingUiScale).toFixed(1)+'px');
  $('stage').style.setProperty('--door-marker-font',Math.max(6.2,8*drawingUiScale).toFixed(1)+'px');
  $('stage').style.setProperty('--door-point-size',Math.max(9,15*drawingUiScale).toFixed(1)+'px');
  $('stage').style.setProperty('--drawing-note-font',Math.max(7,10*drawingUiScale).toFixed(1)+'px');
  $('stage').style.setProperty('--drawing-note-max',Math.max(100,190*drawingUiScale).toFixed(0)+'px');
  $('pageInfo').textContent='Sida '+pageNumber+' / '+documentPdf.numPages;$('zoomInfo').textContent=Math.round(zoom*100)+'%';draw();
  if(anchor&&focus){
   const left=stage.offsetLeft||0,top=stage.offsetTop||0;
   wrap.scrollLeft=left+anchor.x*pageWidth-focus.x;
   wrap.scrollTop=top+anchor.y*pageHeight-focus.y;
  }else if(focus&&oldW>0&&oldH>0){
   wrap.scrollLeft=(oldSL+focus.x)/oldW*pageWidth-focus.x;
   wrap.scrollTop=(oldST+focus.y)/oldH*pageHeight-focus.y;
  }
  return true;
 }).catch(error=>{if(error.name!=='RenderingCancelledException'&&version===renderVersion)notice('Kunde inte visa sidan. Prova Passa eller välj en annan sida.',true);return false});
 return renderQueue;
}
let wheelZoomTimer=null,wheelZoomTarget=null,wheelZoomFocus=null;
function setZoom(z,focus={x:wrap.clientWidth/2,y:wrap.clientHeight/2}){zoom=Math.max(.5,Math.min(8,z));visualZoom=1;$('stage').style.transform='';render(false,focus)}
wrap.addEventListener('wheel',e=>{
 if(!pdf)return;
 e.preventDefault();
 const r=wrap.getBoundingClientRect(),focus={x:e.clientX-r.left,y:e.clientY-r.top},base=wheelZoomTarget??zoom;
 wheelZoomTarget=Math.max(.5,Math.min(8,base*(e.deltaY<0?1.12:1/1.12)));wheelZoomFocus=focus;
 visualZoom=wheelZoomTarget/zoom;
 $('stage').style.transform='scale('+visualZoom+')';
 $('stage').style.transformOrigin=(wrap.scrollLeft+focus.x)+'px '+(wrap.scrollTop+focus.y)+'px';
 $('zoomInfo').textContent=Math.round(wheelZoomTarget*100)+'%';
 clearTimeout(wheelZoomTimer);
 wheelZoomTimer=setTimeout(()=>{
  const target=wheelZoomTarget,finalFocus=wheelZoomFocus;
  wheelZoomTarget=null;wheelZoomFocus=null;wheelZoomTimer=null;
  setZoom(target,finalFocus);
 },180);
},{passive:false});
function changeDrawingPage(delta){
 if(!pdf)return false;
 const next=Math.max(1,Math.min(pdf.numPages,page+delta));if(next===page)return false;
 clearTimeout(wheelZoomTimer);wheelZoomTarget=null;wheelZoomFocus=null;page=next;zoom=1;visualZoom=1;$('stage').style.transform='';render(true);wrap.scrollLeft=0;wrap.scrollTop=0;return true
}
$('zoomIn').onclick=()=>{clearTimeout(wheelZoomTimer);wheelZoomTarget=null;setZoom(zoom*1.25)};$('zoomOut').onclick=()=>{clearTimeout(wheelZoomTimer);wheelZoomTarget=null;setZoom(zoom/1.25)};$('fitBtn').onclick=()=>{zoom=1;render(true)};$('prev').onclick=()=>changeDrawingPage(-1);$('next').onclick=()=>changeDrawingPage(1);function importedPlacementHint(){
 const next=importQueue[0];if(!next)return 'Tryck där dörren finns. Nyp för att zooma.';
 return 'Placera importerad '+next.id+(next.location?' · '+next.location:'')+'. Tryck på rätt dörr. '+importQueue.length+' kvar.';
}
function toggleAdd(){
 if(!pdf)return alert('Ladda upp en PDF först');
 if(window.setDoorMarkersVisible)window.setDoorMarkersVisible(true);
 addMode=!addMode;textMode=false;document.body.classList.toggle('placing',addMode);document.body.classList.remove('placingText');
 $('hint').textContent=importedPlacementHint();$('hint').style.display=addMode?'block':'none'
}
function toggleText(){
 if(!pdf)return alert('Ladda upp en PDF först');
 textMode=!textMode;addMode=false;document.body.classList.toggle('placingText',textMode);document.body.classList.remove('placing');
 $('hint').textContent='Tryck där anteckningen ska peka.';$('hint').style.display=textMode?'block':'none'
}
markers.addEventListener('click',e=>{
 if(e.target!==markers)return;
 const r=markers.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
 if(textMode){
  const value=prompt('Skriv texten du vill lägga på ritningen:','');if(value===null||!value.trim())return;
  textNotes.push({uid:'text:'+Date.now()+':'+Math.random().toString(36).slice(2),page,x,y,text:value.trim()});
  textMode=false;document.body.classList.remove('placingText');$('hint').style.display='none';save();draw();return
 }
 if(!addMode)return;
 let d,imported=false;
 if(importQueue.length){
  const template=structuredClone(importQueue.shift());imported=true;
  d=normalize({...template,uid:template.uid||('legacy-place:'+Date.now()+':'+Math.random()),page,x,y,status:'untested',checks:template.checks||{},notes:template.notes||'',remediationDate:'',remediationSignature:''});
 }else{
  const ids=new Set(doors.map(d=>d.id));let n=1;while(ids.has('D'+n))n++;
  d=normalize({uid:Date.now()+''+Math.random(),id:'D'+n,page,x,y,model:'',status:'untested',notes:''});d.serialNumber=nextSerial();d.id='D'+Number(d.serialNumber);d.idMode='auto';
 }
 doors.push(d);selected=d.uid;newlyPlacedDoorUid=d.uid;newlyPlacedDoorUntil=Date.now()+900;
 addMode=imported&&importQueue.length>0;document.body.classList.toggle('placing',addMode);save();draw();
 if(imported){
  if(typeof goView==='function')goView('drawing');else{document.body.dataset.view='drawing';document.body.classList.remove('protocolOpen')}
  $('hint').textContent=importQueue.length?'Placerad '+d.id+'. '+importedPlacementHint():'Alla importerade dörrar är placerade. Dra markeringarna vid behov och öppna protokollet genom att trycka på märkningen.';
  $('hint').style.display='block';
 }else{
  show();if(typeof goView==='function')goView('drawing');else{document.body.dataset.view='drawing';document.body.classList.remove('protocolOpen')}$('hint').textContent='Dörren är tillagd. Dra pilpunkten och etiketten till rätt läge. Tryck sedan på etiketten för att öppna protokollet.';$('hint').style.display='block'
 }
});
function draw(){
 markers.replaceChildren();
 const pageDoors=doors.filter(d=>d.page===page).map(normalize),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.setAttribute('class','doorConnectorLayer');svg.setAttribute('width','100%');svg.setAttribute('height','100%');svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('preserveAspectRatio','none');
 const defs=document.createElementNS(ns,'defs');
 [['ok','#238354'],['action','#c77c13'],['fail','#bd3f46'],['untested','#77858e']].forEach(([key,color])=>{const marker=document.createElementNS(ns,'marker');marker.setAttribute('id','doorArrow-'+key);marker.setAttribute('viewBox','0 0 8 8');marker.setAttribute('refX','7');marker.setAttribute('refY','4');marker.setAttribute('markerWidth','7');marker.setAttribute('markerHeight','7');marker.setAttribute('orient','auto');const path=document.createElementNS(ns,'path');path.setAttribute('d','M0,0 L8,4 L0,8 z');path.setAttribute('fill',color);marker.appendChild(path);defs.appendChild(marker)});
 svg.appendChild(defs);
 pageDoors.forEach(d=>{const st=d.status||'untested',line=document.createElementNS(ns,'line');line.setAttribute('data-uid',d.uid);line.setAttribute('x1',String(d.labelX*1000));line.setAttribute('y1',String(d.labelY*1000));line.setAttribute('x2',String(d.x*1000));line.setAttribute('y2',String(d.y*1000));line.setAttribute('class','doorConnector '+st);line.setAttribute('marker-end','url(#doorArrow-'+st+')');svg.appendChild(line)});
 markers.appendChild(svg);
 pageDoors.forEach(d=>{
  const target=document.createElement('button');target.type='button';target.className='doorTarget '+(d.status||'untested');target.title='Dörrpunkt – dra för att flytta träffpunkten';target.setAttribute('aria-label','Dörrpunkt för '+d.id);
  const grab=document.createElement('button');grab.type='button';grab.className='precisionPointGrab'+(d.uid===selected?' selectedPrecision':'');grab.setAttribute('aria-label','Precisionsgrepp för '+d.id);grab.title='Precision – dra här med fingret så ser du träffpunkten';
  let targetDrag=null;
  const syncTargetPosition=()=>{target.style.left=d.x*100+'%';target.style.top=d.y*100+'%';grab.style.left=d.x*100+'%';grab.style.top=d.y*100+'%';grab.classList.toggle('precisionGrabUp',d.y>.72)};
  const beginTargetDrag=(ev,node)=>{if(ev.button!==0)return;ev.preventDefault();ev.stopPropagation();if(precisionMode)selected=d.uid;suppressPageSwipeUntil=Date.now()+1200;panTouch=null;const r=markers.getBoundingClientRect(),ax=r.left+d.x*r.width,ay=r.top+d.y*r.height,precision=window.ServicePrecisionPointer?.begin(ev,ax,ay)||null;targetDrag={pointer:ev.pointerId,x:ev.clientX,y:ev.clientY,originalX:d.x,originalY:d.y,moved:false,threshold:markerDragThreshold(zoom),precision};try{node.setPointerCapture(ev.pointerId)}catch(_){}};
  const moveTargetDrag=ev=>{if(!targetDrag||targetDrag.pointer!==ev.pointerId||pinch)return;if(!targetDrag.moved&&Math.hypot(ev.clientX-targetDrag.x,ev.clientY-targetDrag.y)<targetDrag.threshold)return;targetDrag.moved=true;const r=markers.getBoundingClientRect();if(targetDrag.precision){const p=window.ServicePrecisionPointer.point(ev,targetDrag.precision);d.x=Math.max(0,Math.min(1,(p.x-r.left)/r.width));d.y=Math.max(0,Math.min(1,(p.y-r.top)/r.height))}else{d.x=Math.max(0,Math.min(1,targetDrag.originalX+(ev.clientX-targetDrag.x)/r.width));d.y=Math.max(0,Math.min(1,targetDrag.originalY+(ev.clientY-targetDrag.y)/r.height))}syncTargetPosition();const line=svg.querySelector('[data-uid="'+CSS.escape(d.uid)+'"]');if(line){line.setAttribute('x2',String(d.x*1000));line.setAttribute('y2',String(d.y*1000))}};
  const endTargetDrag=ev=>{if(!targetDrag||targetDrag.pointer!==ev.pointerId)return;suppressPageSwipeUntil=Date.now()+700;window.ServicePrecisionPointer?.hide();if(targetDrag.moved)save();targetDrag=null};
  const cancelTargetDrag=()=>{suppressPageSwipeUntil=Date.now()+700;window.ServicePrecisionPointer?.hide();if(targetDrag){d.x=targetDrag.originalX;d.y=targetDrag.originalY;syncTargetPosition()}targetDrag=null;draw()};
  [target,grab].forEach(node=>{node.addEventListener('pointerdown',ev=>beginTargetDrag(ev,node));node.addEventListener('pointermove',moveTargetDrag);node.addEventListener('pointerup',endTargetDrag);node.addEventListener('pointercancel',cancelTargetDrag)});
  syncTargetPosition();markers.append(target,grab);
  const el=document.createElement('button');el.type='button';el.className='marker '+(d.status||'untested');const raw=d.serialNumber||String(d.id||'').replace(/^D/,'');el.textContent=String(raw).replace(/^0+(?=\d)/,'');el.setAttribute('aria-label','Öppna protokoll för '+d.id);el.title='Dra numret. Pilen fortsätter peka på dörren.';
  el.style.left=d.labelX*100+'%';el.style.top=d.labelY*100+'%';let drag=null,ignoreClickUntil=0;
  el.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;ev.stopPropagation();suppressPageSwipeUntil=Date.now()+1200;panTouch=null;const r=markers.getBoundingClientRect(),ax=r.left+d.labelX*r.width,ay=r.top+d.labelY*r.height,precision=window.ServicePrecisionPointer?.begin(ev,ax,ay)||null;drag={pointer:ev.pointerId,x:ev.clientX,y:ev.clientY,moved:false,originalX:d.labelX,originalY:d.labelY,threshold:markerDragThreshold(zoom),precision};el.setPointerCapture(ev.pointerId)});
  el.addEventListener('pointermove',ev=>{if(!drag||drag.pointer!==ev.pointerId||pinch)return;if(!drag.moved&&Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)<drag.threshold)return;drag.moved=true;const r=markers.getBoundingClientRect();if(drag.precision){const p=window.ServicePrecisionPointer.point(ev,drag.precision);d.labelX=Math.max(.015,Math.min(.985,(p.x-r.left)/r.width));d.labelY=Math.max(.015,Math.min(.985,(p.y-r.top)/r.height))}else{d.labelX=Math.max(.015,Math.min(.985,drag.originalX+(ev.clientX-drag.x)/r.width));d.labelY=Math.max(.015,Math.min(.985,drag.originalY+(ev.clientY-drag.y)/r.height))}el.style.left=d.labelX*100+'%';el.style.top=d.labelY*100+'%';const line=svg.querySelector('[data-uid="'+CSS.escape(d.uid)+'"]');if(line){line.setAttribute('x1',String(d.labelX*1000));line.setAttribute('y1',String(d.labelY*1000))}});
  el.addEventListener('pointerup',ev=>{if(!drag||drag.pointer!==ev.pointerId)return;suppressPageSwipeUntil=Date.now()+700;window.ServicePrecisionPointer?.hide();if(drag.moved){ignoreClickUntil=Date.now()+900;ev.preventDefault();ev.stopPropagation();save()}drag=null});
  el.addEventListener('pointercancel',()=>{suppressPageSwipeUntil=Date.now()+700;window.ServicePrecisionPointer?.hide();if(drag){d.labelX=drag.originalX;d.labelY=drag.originalY;el.style.left=d.labelX*100+'%';el.style.top=d.labelY*100+'%'}drag=null;ignoreClickUntil=Date.now()+300});
  el.addEventListener('click',ev=>{if(Date.now()<ignoreClickUntil){ev.preventDefault();ev.stopImmediatePropagation()}},true);
  el.onclick=ev=>{ev.stopPropagation();if(Date.now()<ignoreClickUntil||d.uid===newlyPlacedDoorUid&&Date.now()<newlyPlacedDoorUntil){ev.preventDefault();return}newlyPlacedDoorUid='';newlyPlacedDoorUntil=0;$('hint').style.display='none';selected=d.uid;show();if(typeof goView==='function')goView('protocol');else{document.body.dataset.view='protocol';if(innerWidth<=800)document.body.classList.add('protocolOpen')}};markers.appendChild(el)
 })
 drawingNotes.replaceChildren();
 textNotes.filter(n=>n.page===page).forEach(n=>{
  const el=document.createElement('button');el.type='button';el.className='drawingNote';el.setAttribute('aria-label','Anteckning: '+n.text);
  el.style.left=n.x*100+'%';el.style.top=n.y*100+'%';
  const dot=document.createElement('span');dot.className='drawingNoteDot';const label=document.createElement('span');label.className='drawingNoteLabel';label.textContent=n.text;el.append(dot,label);
  let drag=null,ignoreClickUntil=0;
  el.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;ev.stopPropagation();drag={pointer:ev.pointerId,x:ev.clientX,y:ev.clientY,moved:false,originalX:n.x,originalY:n.y};el.setPointerCapture(ev.pointerId)});
  el.addEventListener('pointermove',ev=>{if(!drag||drag.pointer!==ev.pointerId)return;if(!drag.moved&&Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)<6)return;drag.moved=true;const r=drawingNotes.getBoundingClientRect();n.x=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));n.y=Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));el.style.left=n.x*100+'%';el.style.top=n.y*100+'%'});
  el.addEventListener('pointerup',ev=>{if(!drag||drag.pointer!==ev.pointerId)return;if(drag.moved){ignoreClickUntil=Date.now()+700;save()}drag=null});
  el.addEventListener('pointercancel',()=>{if(drag){n.x=drag.originalX;n.y=drag.originalY;el.style.left=n.x*100+'%';el.style.top=n.y*100+'%'}drag=null});
  el.onclick=ev=>{ev.stopPropagation();if(Date.now()<ignoreClickUntil)return;const value=prompt('Ändra text. Lämna tomt för att ta bort:',n.text);if(value===null)return;if(!value.trim()){if(confirm('Ta bort textmarkeringen?')){textNotes=textNotes.filter(x=>x.uid!==n.uid);save();draw()}return}n.text=value.trim();save();draw()};
  drawingNotes.appendChild(el)
 })
}
function cur(){return doors.find(d=>d.uid===selected)}
function show(){const d=cur();$('empty').hidden=!!d;$('form').hidden=!d;if(!d)return;normalize(d);['doorId','location','status','notes','signature'].forEach(id=>$(id).value=d[id==='doorId'?'id':id]||'');buildChecklist(d)}['doorId','location','status','notes','signature'].forEach(id=>$(id).oninput=()=>{const d=cur();if(!d)return;d[id==='doorId'?'id':id]=$(id).value;save();if(id==='doorId'||id==='status')draw()});$('deleteBtn').onclick=()=>{const d=cur();if(!d)return;doors=doors.filter(x=>x.uid!==d.uid);selected=null;save();draw();show();if(typeof goView==='function')goView('drawing');else document.body.classList.remove('protocolOpen')};
wrap.addEventListener('pointerdown',e=>{
 if(!pdf||addMode||textMode||e.button!==0||e.pointerType==='touch'||e.target.closest('.marker,.doorTarget,.drawingNote,.serviceDrawingOverlay'))return;
 panMouse={pointer:e.pointerId,x:e.clientX,y:e.clientY,left:wrap.scrollLeft,top:wrap.scrollTop};
 wrap.classList.add('mousePanning');wrap.setPointerCapture(e.pointerId);e.preventDefault();
});
wrap.addEventListener('pointermove',e=>{
 if(!panMouse||panMouse.pointer!==e.pointerId)return;
 wrap.scrollLeft=panMouse.left-(e.clientX-panMouse.x);wrap.scrollTop=panMouse.top-(e.clientY-panMouse.y);e.preventDefault();
});
function endMousePan(e){
 if(!panMouse||panMouse.pointer!==e.pointerId)return;
 try{wrap.releasePointerCapture(e.pointerId)}catch(_){}
 panMouse=null;wrap.classList.remove('mousePanning');
}
wrap.addEventListener('pointerup',endMousePan);
wrap.addEventListener('pointercancel',endMousePan);
wrap.addEventListener('lostpointercapture',e=>{if(panMouse&&panMouse.pointer===e.pointerId){panMouse=null;wrap.classList.remove('mousePanning')}});

function beginDoorPinch(e){
 const a=e.touches[0],b=e.touches[1],r=wrap.getBoundingClientRect(),stage=$('stage');
 const focus={x:(a.clientX+b.clientX)/2-r.left,y:(a.clientY+b.clientY)/2-r.top};
 const anchor={
  x:Math.max(0,Math.min(1,(wrap.scrollLeft+focus.x-(stage.offsetLeft||0))/Math.max(1,pageWidth))),
  y:Math.max(0,Math.min(1,(wrap.scrollTop+focus.y-(stage.offsetTop||0))/Math.max(1,pageHeight)))
 };
 pinch={
  dist:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)),
  zoom,focus,currentFocus:focus,anchor,targetZoom:zoom,
  stageLeft:stage.offsetLeft||0,stageTop:stage.offsetTop||0
 };
 panTouch=null;visualZoom=1;stage.style.transformOrigin='0 0';wrap.classList.add('pinching');suppressPageSwipeUntil=Date.now()+900;
}
function commitDoorPinch(p){
 const target=Math.max(.5,Math.min(8,p.targetZoom||p.zoom)),focus=p.currentFocus||p.focus;
 visualZoom=1;$('stage').style.transform='';$('stage').style.transformOrigin='0 0';wrap.classList.remove('pinching');
 zoom=target;return render(false,focus,p.anchor);
}
wrap.addEventListener('touchstart',e=>{
 if(e.touches.length===2){e.preventDefault();beginDoorPinch(e);return}
 if(e.target.closest('.marker,.doorTarget,.drawingNote,.serviceDrawingOverlay')){panTouch=null;suppressPageSwipeUntil=Date.now()+1200;return}
 if(e.touches.length===1&&!addMode&&!textMode){const t=e.touches[0];panTouch={x:t.clientX,y:t.clientY,startX:t.clientX,startY:t.clientY,left:wrap.scrollLeft,top:wrap.scrollTop,started:Date.now(),pageSwipe:zoom<=1.05&&Math.abs(visualZoom-1)<.02}}
},{passive:false});
wrap.addEventListener('touchmove',e=>{
 if(e.touches.length===2){
  e.preventDefault();if(!pinch){beginDoorPinch(e);return}
  const a=e.touches[0],b=e.touches[1],r=wrap.getBoundingClientRect(),focus={x:(a.clientX+b.clientX)/2-r.left,y:(a.clientY+b.clientY)/2-r.top};
  const target=Math.max(.5,Math.min(8,pinch.zoom*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/pinch.dist));
  visualZoom=target/pinch.zoom;pinch.targetZoom=target;pinch.currentFocus=focus;
  const stage=$('stage');stage.style.transformOrigin='0 0';stage.style.transform='scale('+visualZoom+')';
  wrap.scrollLeft=pinch.stageLeft+pinch.anchor.x*pageWidth*visualZoom-focus.x;
  wrap.scrollTop=pinch.stageTop+pinch.anchor.y*pageHeight*visualZoom-focus.y;
  $('zoomInfo').textContent=Math.round(target*100)+'%';
 }else if(e.touches.length===1&&panTouch&&!addMode&&!textMode&&!pinch){
  e.preventDefault();const t=e.touches[0];wrap.scrollLeft=panTouch.left-(t.clientX-panTouch.x);wrap.scrollTop=panTouch.top-(t.clientY-panTouch.y);
 }
},{passive:false});
function endTouch(e){
 if(pinch&&e.touches.length<2){const p=pinch;pinch=null;panTouch=null;suppressPageSwipeUntil=Date.now()+500;commitDoorPinch(p);return}
 if(e.touches.length===0&&panTouch){
  const t=e.changedTouches?.[0],p=panTouch;panTouch=null;
  if(Date.now()<suppressPageSwipeUntil)return;
  if(t&&p.pageSwipe&&Date.now()-p.started<900){
   const dx=t.clientX-p.startX,dy=t.clientY-p.startY;
   if(Math.abs(dx)>=65&&Math.abs(dx)>Math.abs(dy)*1.35){
    if(changeDrawingPage(dx<0?1:-1)){e.preventDefault?.();return}
   }
  }
 }
}
wrap.addEventListener('touchend',endTouch,{passive:true});wrap.addEventListener('touchcancel',endTouch,{passive:true});
function setPrecisionMode(on){
 precisionMode=!!on;document.body.classList.toggle('precisionMode',precisionMode);
 const b=$('precisionMode');if(b){b.classList.toggle('active',precisionMode);b.setAttribute('aria-pressed',precisionMode?'true':'false');b.title=precisionMode?'Precision på – tryck för att stänga av':'Precision';b.setAttribute('aria-label',b.title);if(!b.closest('.serviceToolsMenu'))b.textContent=precisionMode?'⌖ Precision på':'⌖ Precision'}
 if(precisionMode&&pdf){$('hint').textContent='Precision på: dra i det lilla greppet en bit från pinnen. Pilspetsen visar exakt var träffpunkten hamnar.';$('hint').style.display='block'}
 else if(!addMode&&!textMode)$('hint').style.display='none';
 if(pdf)draw();
}
$('precisionMode')&&($('precisionMode').onclick=()=>setPrecisionMode(!precisionMode));
$('addBtn')&&($('addBtn').onclick=toggleAdd);$('mobileText')&&($('mobileText').onclick=toggleText);$('mobileAdd').onclick=toggleAdd;$('mobileFit').onclick=()=>{zoom=1;render(true)};$('mobileProtocol').onclick=()=>document.body.classList.add('protocolOpen');$('closeProtocol').onclick=()=>document.body.classList.remove('protocolOpen');

const STATUS_LABELS={untested:'Ej provad',ok:'Godkänd',action:'Åtgärd krävs',fail:'Ej godkänd'};
function doorProblems(d){return doorChecks(d).filter(([n])=>d.checks?.[n]?.result==='remark')}
function hasRecordedDoorProblem(d){return d.status==='action'||d.status==='fail'||doorProblems(d).length>0}
function isDoorRemediated(d){return hasRecordedDoorProblem(d)&&!!String(d.remediationDate||'').trim()&&!!String(d.remediationSignature||'').trim()}
function hasDoorProblem(d){return hasRecordedDoorProblem(d)&&!isDoorRemediated(d)}
function renderOverview(){
 const filter=$('overviewFilter').value,query=$('overviewSearch').value.trim().toLocaleLowerCase('sv');
 const problemCount=doors.filter(d=>!isDoorRemediated(d)&&d.status!=='fail'&&hasDoorProblem(d)).length,failedCount=doors.filter(d=>!isDoorRemediated(d)&&d.status==='fail').length,remediatedCount=doors.filter(isDoorRemediated).length,readyCount=doors.filter(d=>d.status==='ok'&&!hasRecordedDoorProblem(d)).length,recordedCount=doors.filter(hasRecordedDoorProblem).length;
 $('overviewSummary').textContent=problemCount+' öppna fel · '+failedCount+' ej godkända · '+remediatedCount+' åtgärdade · '+readyCount+' klara · '+doors.length+' dörrar totalt';
 $('overviewPdf').disabled=recordedCount===0;
 const projectInfo=$('overviewProject');projectInfo.replaceChildren();
 [['Objekt',project.projectName],['Datum',project.inspectionDate],['Order nr',project.projectOrder]].forEach(([label,value])=>{const item=document.createElement('p');item.textContent=label+': '+(value||'–');projectInfo.appendChild(item)});
 const list=$('overviewList');list.replaceChildren();
 const visible=doors.filter(d=>{
  if(filter==='problems'&&!hasDoorProblem(d))return false;
  if(filter==='untested'&&d.status!=='untested')return false;
  if(filter==='ok'&&(d.status!=='ok'||hasDoorProblem(d)))return false;
  return !query||[d.id,d.machineId,d.location,d.model,d.notes,...doorProblems(d).map(([n,t])=>n+' '+t+' '+(d.checks[n].note||''))].join(' ').toLocaleLowerCase('sv').includes(query);
 }).sort((a,b)=>a.page-b.page||a.id.localeCompare(b.id,'sv',{numeric:true}));
 if(!visible.length){const empty=document.createElement('p');empty.className='overviewEmpty';empty.textContent=!doors.length?'Inga dörrar ännu. Ladda upp en ritning och lägg till dörrar.':query?'Inga dörrar matchar sökningen.':filter==='problems'?'Inga dörrar med registrerade problem.':'Inga dörrar i det här urvalet.';list.appendChild(empty);return}
 const scroller=document.createElement('div');scroller.className='overviewTableWrap';
 const table=document.createElement('table');table.className='overviewTable';
 const caption=document.createElement('caption');caption.textContent='Anmärkningslista för dörrservice';table.appendChild(caption);
 const head=document.createElement('thead'),headRow=document.createElement('tr');
 ['Dörr nr','Anmärkning','Åtgärdat datum + signatur'].forEach(text=>{const th=document.createElement('th');th.scope='col';th.textContent=text;headRow.appendChild(th)});head.appendChild(headRow);table.appendChild(head);
 const body=document.createElement('tbody');
 visible.forEach(d=>{
  const row=document.createElement('tr');row.className='overviewRow';row.dataset.uid=d.uid;
  const doorCell=document.createElement('td'),doorButton=document.createElement('button');doorButton.type='button';doorButton.textContent=d.id;doorButton.setAttribute('aria-label','Öppna protokoll för '+d.id);doorButton.onclick=()=>openOverviewDoor(d.uid);doorCell.appendChild(doorButton);row.appendChild(doorCell);
  const remarksCell=document.createElement('td');
  const meta=document.createElement('p');meta.className='doorMeta';meta.textContent=(d.location?d.location+' · ':'')+'Sida '+d.page+(d.machineId?' · Maskin-ID '+d.machineId:'');remarksCell.appendChild(meta);
  const badge=document.createElement('span');badge.className='doorStatus '+(isDoorRemediated(d)?'ok':d.status==='fail'?'fail':hasDoorProblem(d)?'action':d.status==='ok'?'ok':'untested');badge.textContent=isDoorRemediated(d)?'Åtgärdad':STATUS_LABELS[d.status]||'Ej provad';remarksCell.appendChild(badge);
  const issues=document.createElement('ul');doorProblems(d).forEach(([n,title])=>{const li=document.createElement('li');li.textContent=n+' '+title+': '+(d.checks[n].note?.trim()||'Fel markerat, beskrivning saknas.');issues.appendChild(li)});if(issues.childElementCount)remarksCell.appendChild(issues);
  if(d.notes?.trim()){const note=document.createElement('p');note.textContent='Allmän anmärkning: '+d.notes;remarksCell.appendChild(note)}row.appendChild(remarksCell);
  const actionCell=document.createElement('td');
  [['remediationDate','Åtgärdat datum','date'],['remediationSignature','Signatur','text']].forEach(([key,title,type])=>{const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.type=type;input.value=d[key]||'';input.dataset.field=key;input.setAttribute('aria-label',title+' för '+d.id);input.oninput=()=>{d[key]=input.value;save(true);badge.className='doorStatus '+(isDoorRemediated(d)?'ok':d.status==='fail'?'fail':hasDoorProblem(d)?'action':d.status==='ok'?'ok':'untested');badge.textContent=isDoorRemediated(d)?'Åtgärdad':STATUS_LABELS[d.status]||'Ej provad';draw();$('overviewSummary').textContent=doors.filter(d=>!isDoorRemediated(d)&&d.status!=='fail'&&hasDoorProblem(d)).length+' öppna fel · '+doors.filter(d=>!isDoorRemediated(d)&&d.status==='fail').length+' ej godkända · '+doors.filter(isDoorRemediated).length+' åtgärdade · '+doors.filter(d=>d.status==='ok'&&!hasRecordedDoorProblem(d)).length+' klara · '+doors.length+' dörrar totalt'};label.appendChild(input);actionCell.appendChild(label)});row.appendChild(actionCell);body.appendChild(row);
 });table.appendChild(body);scroller.appendChild(table);list.appendChild(scroller);
}

function openOverview(){document.body.classList.remove('protocolOpen');renderOverview();$('overviewDialog').showModal();$('overviewDialog').scrollTop=0}
async function openOverviewDoor(uid){
 const d=doors.find(item=>item.uid===uid);if(!d)return;
 selected=uid;$('overviewDialog').close();addMode=false;document.body.classList.remove('placing');$('hint').style.display='none';show();
 if(innerWidth<=800)document.body.classList.add('protocolOpen');$('protocolPanel').scrollTop=0;
 if(pdf&&d.page>=1&&d.page<=pdf.numPages){page=d.page;zoom=1;await render(true);wrap.scrollLeft=Math.max(0,d.x*pageWidth-wrap.clientWidth/2);wrap.scrollTop=Math.max(0,d.y*pageHeight-wrap.clientHeight/2)}
 else if(!pdf)notice('Protokollet är öppet. Ladda upp ritningen igen för att se dörren på PDF-sidan.');
}
$('overviewBtn').onclick=openOverview;$('mobileOverview').onclick=openOverview;
$('closeOverview').onclick=()=>$('overviewDialog').close();
$('overviewFilter').onchange=renderOverview;$('overviewSearch').oninput=renderOverview;



/* Movement measured in screen pixels: deliberate at overview, precise when zoomed. */
function markerDragThreshold(z){return z<=1.1?22:z<1.8?12:5}
