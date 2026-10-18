/* Controller for Ritningsverktygets digitala dörrkort.
 *
 * Original-PDF:en ändras aldrig. Ett kort läses i taget, omvandlas till den
 * kanoniska modellen i DrawingCardDigitizerCore och autosparas utan PDF-data.
 */
(function(root){
 'use strict';

 const document=root.document;
 const app=root.DrawingToolsBridge;
 const reader=root.DrawingOcrReader;
 const core=root.DrawingCardDigitizerCore;
 const storage=root.DrawingCardDigitizerStorage;
 const exporter=root.DrawingCardDigitizerExport;
 const $=id=>document?.getElementById(id);
 if(!document||!$('digitizerTools'))return;
 if(!app||!reader||!core){
  console.warn('Digitalisera dörrkort kunde inte starta: en lokal modul saknas.');
  return;
 }

 const CONFIDENCE_LIMIT=70;
 const CELL_LABELS={designation:'Benämning',type:'Typ / utförande',quantity:'Antal',installer:'Monteras av'};
 const STATUS_LABELS={unread:'Ej läst','needs-review':'Behöver granskas',approved:'Godkänt','changed-after-approval':'Ändrat efter godkännande'};
 const PHASE_LABELS={inspect:'Kontrollerar befintlig PDF-text',render:'Förbereder bildområdet',ocr:'Läser text i bilden','page-complete':'Sidan är läst',complete:'Sidan är färdig',prepare:'Förbereder',pages:'Skapar PDF-sidor',manifest:'Bifogar strukturerad data',save:'Sparar PDF'};
 const sectionDefinitions=Array.from(core.SECTION_DEFINITIONS||[
  {key:'day-locking',label:'Daglåsning'},
  {key:'night-locking',label:'Nattlåsning'},
  {key:'other-equipment',label:'Övrig utrustning'},
  {key:'alarm-access',label:'Larm-Passer'}
 ]);
 const cellKeys=Array.from(core.CELL_KEYS||Object.keys(CELL_LABELS));

 let fingerprint='',project=null,rect=null,examplePage=1;
 let active=false,controller=null,workerPromise=null,libraryPromise=null,clock=null,startedAt=0,lastProgress=null;
 let currentCardIndex=0,selectedSection='other-equipment',originalZoom=1,originalRenderToken=0,originalPreviewController=null,restoreToken=0,revision=0;
 let saveTimer=null,pendingSnapshot=null,savePromise=Promise.resolve(),progressHideTimer=null;

 function el(tag,text,className){
  const node=document.createElement(tag);if(text!==undefined&&text!==null)node.textContent=String(text);if(className)node.className=className;return node;
 }
 function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
 function validRect(value){return !!value&&['x','y','w','h'].every(key=>Number.isFinite(Number(value[key])))&&value.w>0&&value.h>0&&value.x>=0&&value.y>=0&&value.x+value.w<=1.000001&&value.y+value.h<=1.000001;}
 function cleanName(value){return String(value||'digitala-dorrkort').replace(/\.pdf$/iu,'').replace(/[\\/:*?"<>|]+/gu,'-').replace(/\s+/gu,' ').trim()||'digitala-dorrkort';}
 function elapsed(ms){const seconds=Math.max(0,Math.floor(Number(ms||0)/1000));return seconds<60?seconds+' sek':Math.floor(seconds/60)+' min '+seconds%60+' sek';}
 function abortError(message='Avläsningen avbröts.'){const error=Error(message);error.name='AbortError';return error;}
 function checkAbort(signal){if(signal?.aborted)throw abortError();}
 function abortable(value,signal){
  if(!signal)return Promise.resolve(value);
  return new Promise((resolve,reject)=>{
   const cancel=()=>reject(abortError());if(signal.aborted){cancel();return;}
   signal.addEventListener('abort',cancel,{once:true});
   Promise.resolve(value).then(result=>{signal.removeEventListener('abort',cancel);resolve(result);},error=>{signal.removeEventListener('abort',cancel);reject(error);});
  });
 }
 function cardStatus(card){return card?.review?.status||'needs-review';}
 function statusLabel(card){return STATUS_LABELS[cardStatus(card)]||'Behöver granskas';}
 function pagesText(pages){
  const sorted=[...new Set((pages||[]).map(Number).filter(Number.isInteger))].sort((a,b)=>a-b),ranges=[];
  for(let index=0;index<sorted.length;index++){
   const first=sorted[index];let last=first;while(sorted[index+1]===last+1){last=sorted[++index];}
   ranges.push(first===last?String(first):first+'–'+last);
  }
  return ranges.join(', ');
 }
 function parsePages(value,available){
  const allowed=new Set(available),pages=new Set(),text=String(value||'').trim();
  if(!text)throw Error('Ange sidor, till exempel 6 eller 6–75.');
  for(const raw of text.split(',')){
   const match=raw.trim().match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/u);
   if(!match)throw Error('Skriv sidnummer med kommatecken eller intervall, till exempel 6, 8–14.');
   const first=Number(match[1]),last=Number(match[2]||match[1]);
   if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||first<1||last<first||last-first>Math.max(10000,allowed.size+1))throw Error('Kontrollera sidintervallet.');
   for(let page=first;page<=last;page++){if(!allowed.has(page))throw Error('Sida '+page+' finns inte kvar i arbetskopian.');pages.add(page);}
  }
  return [...pages].sort((a,b)=>a-b);
 }
 function sourceMeta(){
  const bytes=app.getSourceBytes?.();return{
   fileName:app.getFileName?.()||'dorrkort.pdf',size:Number(bytes?.byteLength||bytes?.length||0),lastModified:0,
   pageCount:Number(app.getPdf?.()?.numPages||0),mimeType:'application/pdf',fingerprint
  };
 }
 function emptyProject(){return{schema:'tillsyno.digital-door-card-project',schemaVersion:1,id:'digitizer-'+Date.now().toString(36),name:'Digitala dörrkort',fingerprint,source:sourceMeta(),template:null,cards:[],progress:{rect:null,examplePage:app.getPage?.()||1,pages:'',currentCardIndex:0}};}
 function ensureProject(){if(!project)project=emptyProject();return project;}
 function snapshot(){
  const value=ensureProject();return{...value,fingerprint,source:sourceMeta(),template:value.template||null,cards:value.cards||[],progress:{...(value.progress||{}),rect:rect?{...rect}:null,examplePage,currentCardIndex,pages:$('digitizerPages')?.value||''}};
 }
 function setText(id,value){const node=$(id);if(node)node.textContent=String(value==null?'':value);}
 function setHint(id,value,error=false){const node=$(id);if(!node)return;node.textContent=String(value||'');node.classList.toggle('error',!!error);}
 function persistentStorage(){return storage?.getBackend?.()==='indexeddb';}
 function refreshStorageStatus(){
  const node=$('digitizerStorageStatus');if(!node)return;
  const persistent=persistentStorage();node.dataset.backend=persistent?'indexeddb':'memory';
  node.textContent=persistent?'Autosparning är aktiv på den här enheten. Exportera ändå JSON när du vill flytta eller säkerhetskopiera projektet.':'Varning: lokal autosparning är inte tillgänglig. Arbetet finns bara tillfälligt och försvinner om sidan laddas om eller stängs. Spara hela projektet som JSON innan du lämnar sidan.';
 }
 function savedWorkText(){return persistentStorage()?'Redan färdiga kort är autosparade lokalt.':'Redan färdiga kort finns bara tillfälligt. Spara projektet som JSON innan sidan stängs.';}

 function scheduleSave(immediate=false){
  clearTimeout(saveTimer);if(!fingerprint||!storage?.saveProject)return;pendingSnapshot=clone(snapshot());
  if(immediate){const value=pendingSnapshot;pendingSnapshot=null;saveTimer=null;void persistFrozen(value);return;}
  saveTimer=setTimeout(()=>{const value=pendingSnapshot;pendingSnapshot=null;saveTimer=null;void persistFrozen(value);},350);
 }
 function persistFrozen(value){
  if(!value?.fingerprint||!storage?.saveProject)return savePromise;
  savePromise=savePromise.catch(()=>{}).then(()=>storage.saveProject(value)).then(result=>{refreshStorageStatus();return result;}).catch(error=>{
   refreshStorageStatus();console.error(error);setHint('digitizerExportStatus','Det lokala projektet kunde inte autosparas. Exportera JSON innan du lämnar sidan.',true);
  });return savePromise;
 }
 function persist(){
  clearTimeout(saveTimer);saveTimer=null;pendingSnapshot=null;if(!fingerprint||!storage?.saveProject)return savePromise;
  return persistFrozen(clone(snapshot()));
 }

 function overlay(){
  const node=$('digitizerAreaRect');if(!node)return;
  node.hidden=!rect||app.getPage?.()!==examplePage;
  if(rect)Object.assign(node.style,{left:rect.x*100+'%',top:rect.y*100+'%',width:rect.w*100+'%',height:rect.h*100+'%'});
 }
 function templateApproved(){return !!project?.template?.approved;}
 function unresolvedConflicts(card){return(card?.sourceTokens||[]).filter(token=>token.conflict===true);}
 function checkedCard(card){try{return core.recomputeReviewCompleteness(card,{preserveTime:true});}catch(_){return null;}}
 function approvedCards(){return(project?.cards||[]).filter(card=>{const checked=checkedCard(card),valid=checked&&core.validateCard?.(checked);return valid?.valid!==false&&!unresolvedConflicts(checked).length&&checked?.review?.status==='approved'&&checked.review.complete===true&&checked.review.canApprove===true;});}
 function pageForCard(card){return Number(card?.source?.page)||0;}
 function sortedCards(){return(project?.cards||[]).slice().sort((a,b)=>pageForCard(a)-pageForCard(b));}
 function indexOfCard(card){return(project?.cards||[]).findIndex(item=>item.id===card?.id);}
 function currentCard(){return project?.cards?.[currentCardIndex]||null;}

 function renderTemplatePreview(){
  const node=$('digitizerTemplatePreview'),template=project?.template;if(!node)return;node.replaceChildren();node.hidden=!template;if(!template)return;
  const title=el('strong',template.name||'Mallgrupp 1'),summary=el('p',(template.reference?.wordCount||0)+' textdelar och '+(template.reference?.lineCount||0)+' textrader hittades på sida '+template.sourcePage+'.');
  const columns=el('p','Kolumner: '+(template.columns||[]).map(item=>item.label||CELL_LABELS[item.key]||item.key).join(' · '));
  const sections=el('p','Avsnitt: '+(template.sections||[]).map(item=>item.label||item.key).join(' · '));
  const review=el('button','Granska exempelkort sida vid sida');review.type='button';review.disabled=active;review.onclick=()=>openReview(0);
  node.append(title,summary,columns,sections,review);
 }
 function renderPageList(){
  const node=$('digitizerPageList');if(!node)return;node.replaceChildren();
  const cards=sortedCards();if(!cards.length&&!(project?.progress?.failures||[]).length)node.append(el('p','Inga digitala kort har lästs ännu.','hint'));
  for(const card of cards){
   const failure=(project?.progress?.failures||[]).find(item=>Number(item.page)===pageForCard(card));
   const button=el('button',null,'digitizerPageItem');button.type='button';button.disabled=active;button.dataset.state=failure?'error':cardStatus(card)==='approved'?'approved':cardStatus(card)==='changed-after-approval'?'changed':'review';
   const page=el('strong','Sida '+pageForCard(card)),code=el('span',card.header?.code||'Beteckning saknas'),state=el('small',statusLabel(card));
   if(card.review?.unassignedCount)state.textContent+=' · '+card.review.unassignedCount+' oplacerade';
   if(card.source?.readStatus==='partial')state.textContent+=' · delvis avläst';
   if(failure)state.textContent+=' · '+(failure.message||'senaste omläsningen misslyckades');
   button.append(page,code,state);button.onclick=()=>openReview(indexOfCard(card));node.append(button);
  }
  for(const failure of project?.progress?.failures||[]){
   if(cards.some(card=>pageForCard(card)===Number(failure.page)))continue;
   const row=el('div',null,'digitizerPageItem');row.dataset.state='error';row.append(el('strong','Sida '+failure.page),el('span','Kunde inte läsas'),el('small',failure.message||'Försök läsa sidan igen'));node.append(row);
  }
 }
 function refreshSummary(){
  const cards=project?.cards||[],approved=approvedCards().length,pending=cards.length-approved,unassigned=cards.reduce((sum,card)=>sum+Number(card.review?.unassignedCount||0),0);
  setText('digitizerReviewSummary',cards.length?cards.length+' kort lästa · '+approved+' godkända · '+pending+' behöver granskas'+(unassigned?' · '+unassigned+' textdelar inte placerade':''):'Inga dörrkort att granska ännu.');
  $('digitizerOpenReview').disabled=active||!cards.length||!!project?.integrityError;
  $('digitizerExportJson').disabled=active||!cards.length||!fingerprint;
  $('digitizerExportPdf').disabled=active||!approved||!!project?.integrityError;
 }
 function refresh(){
  const pdf=app.getPdf?.(),marking=app.getEditMode?.()==='digitizer-area';
  $('digitizerMarkArea').disabled=active||!pdf;$('digitizerMarkArea').classList.toggle('active',marking);$('digitizerMarkArea').setAttribute('aria-pressed',String(marking));
  $('digitizerCreateTemplate').disabled=active||!pdf||!rect;$('digitizerApproveTemplate').disabled=active||!project?.template||templateApproved();
  $('digitizerUseSimilar').disabled=active||!pdf||!rect;$('digitizerPages').disabled=active||!pdf;
  $('digitizerReadCards').disabled=active||!pdf||!rect||!templateApproved()||!!project?.integrityError;
  if(rect)setHint('digitizerAreaStatus','Område markerat på sida '+examplePage+'. Samma position används på kort i den här mallgruppen.');
  else setHint('digitizerAreaStatus',pdf?'Inget dörrkort markerat.':'Öppna först en PDF med dörrkort.');
  renderTemplatePreview();renderPageList();refreshSummary();overlay();
 }

 function beginProgress(title){
  clearTimeout(progressHideTimer);const box=$('digitizerProgress');if(box)box.hidden=false;startedAt=Date.now();lastProgress=null;
  setText('digitizerProgressMessage',title);setText('digitizerProgressPercent','0 %');setText('digitizerProgressPage','Sida –');setText('digitizerProgressTime','Beräknar återstående tid…');
  const meter=$('digitizerProgressMeter');meter.max=100;meter.value=0;$('digitizerCancelRead').disabled=false;
  clearInterval(clock);clock=setInterval(updateClock,1000);
 }
 function updateClock(){
  if(!startedAt)return;const eta=lastProgress?.etaMs;
  setText('digitizerProgressTime','Tid: '+elapsed(Date.now()-startedAt)+(Number.isFinite(eta)?' · ungefär '+elapsed(eta)+' kvar':' · återstående tid beräknas'));
 }
 function showProgress(value={}){
  lastProgress={...lastProgress,...value};const meter=$('digitizerProgressMeter'),number=Number(value.percent),percent=Number.isFinite(number)?Math.max(0,Math.min(100,number)):null;
  if(percent===null){meter.removeAttribute('value');setText('digitizerProgressPercent','Arbetar…');}else{meter.value=percent;setText('digitizerProgressPercent',Math.floor(percent)+' %');}
  const phase=value.message||PHASE_LABELS[value.phase]||'Arbetar';setText('digitizerProgressMessage',phase);
  if(value.page)setText('digitizerProgressPage','Sida '+value.page+(value.pageIndex&&value.pageCount?' · '+value.pageIndex+' av '+value.pageCount:''));
  updateClock();
 }
 function finishProgress(message,keep=false){
  clearInterval(clock);clock=null;$('digitizerCancelRead').disabled=true;if(message)showProgress({message,percent:100,etaMs:0});startedAt=0;
  if(!keep)progressHideTimer=setTimeout(()=>{if(!active)$('digitizerProgress').hidden=true;},1800);
 }
 function cancelActive(){
  if(!active)return;$('digitizerCancelRead').disabled=true;setText('digitizerProgressMessage','Avbryter efter aktuellt delområde…');controller?.abort();void releaseWorker();
 }

 async function localWorker(context={}){
  const signal=context.signal||controller?.signal;
  if(!workerPromise){
   const pending=(async()=>{
    if(!root.Tesseract){
     if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/tesseract/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('De lokala OCR-filerna kunde inte laddas.'));document.head.append(script);}).catch(error=>{libraryPromise=null;throw error;});
     await abortable(libraryPromise,signal);
    }
    checkAbort(signal);const base=new URL('./',root.location.href);
    const worker=await root.Tesseract.createWorker(['swe','eng'],1,{workerPath:new URL('vendor/tesseract/worker.min.js',base).href,corePath:new URL('vendor/tesseract/tesseract-core-lstm.wasm.js',base).href,langPath:new URL('vendor/tesseract/lang/',base).href,workerBlobURL:false,gzip:true});
    if(signal?.aborted){void worker.terminate();throw abortError();}
    await worker.setParameters({tessedit_pageseg_mode:6,preserve_interword_spaces:'1'});return worker;
   })();
   const guarded=pending.catch(error=>{if(workerPromise===guarded)workerPromise=null;throw error;});workerPromise=guarded;
  }
  return abortable(workerPromise,signal);
 }
 async function releaseWorker(pending=workerPromise){if(workerPromise===pending)workerPromise=null;if(pending)try{await(await pending).terminate();}catch(_){};}
 function readingParts(entry){
  const all=Array.isArray(entry?.allWords)?entry.allWords:Array.isArray(entry?.words)?entry.words:[];
  const native=Array.isArray(entry?.nativeWords)?entry.nativeWords:all.filter(word=>word?.source==='native');
  const ocr=Array.isArray(entry?.ocrWords)?entry.ocrWords:all.filter(word=>word?.source!=='native');
  return{all,native,ocr};
 }
 function coreInput(entry,page){
  const parts=readingParts(entry),input={page,rect:entry?.rect||rect,viewport:entry?.viewport,wordUnits:entry?.wordUnits||'viewport',confidenceThreshold:CONFIDENCE_LIMIT,fileName:app.getFileName?.()||'',fingerprint};
  // Core deduplicerar observationer, men skicka ändå varje ord via exakt en
  // kanal så att ursprung och säkerhet inte råkar räknas dubbelt.
  if(parts.native.length||parts.ocr.length){input.nativeWords=parts.native;input.ocrWords=parts.ocr;}else input.words=parts.all;
  return input;
 }
 async function readPage(page,signal,position,total,onDetail){
  const result=await reader.read({...app.getOcrOptions?.(),pdf:app.getPdf(),pages:[page],rect,includeNativeWords:true,includeAllWords:true,confidenceThreshold:CONFIDENCE_LIMIT,getWorker:localWorker,onCancelRecognition:()=>void releaseWorker(),pdfjsLib:root.pdfjsLib,signal,cancelled:()=>signal.aborted,onProgress:value=>{
   const local=Number.isFinite(Number(value.percent))?Number(value.percent):0,overall=((position-1)+local/100)/Math.max(1,total)*100;
   const elapsedMs=Date.now()-startedAt,done=Math.max(.02,overall/100),etaMs=overall>1?Math.max(0,elapsedMs/done-elapsedMs):value.etaMs;
   showProgress({...value,page,pageIndex:position,pageCount:total,percent:overall,etaMs,message:(PHASE_LABELS[value.phase]||'Läser kort')+' · sida '+page+(value.tileCount?' · område '+Math.min(value.tileCount,value.tileIndex||0)+' av '+value.tileCount:'')});
   onDetail?.(value);
  }});
  checkAbort(signal);const entry=result?.pages?.[0];if(!entry)throw Error('Sida '+page+' gav inget avläsningsresultat.');
  if(entry.status==='error'||entry.status==='excluded')throw Error('Sida '+page+' kunde inte läsas'+(entry.error?': '+entry.error:'. Kontrollera markeringen och försök igen.'));
  return entry;
 }
 // Test: omvandla långa horisontella och vertikala pixelstreck till skarpa PDF-linjer.
 // Kräver ingen viss text eller dörrkortsstruktur. Fel här stoppar inte textavläsningen.
 async function scanTableLines(pageNumber,selection,signal){
  const pdf=app.getPdf?.(),page=await pdf.getPage(pageNumber),base=page.getViewport({scale:1});
  const aspect=base.width*selection.w/(base.height*selection.h);
  const scale=Math.min(1.8,1700/Math.max(base.width,base.height),Math.sqrt(2800000/(base.width*base.height)));
  const viewport=page.getViewport({scale}),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(viewport.width));canvas.height=Math.max(1,Math.round(viewport.height));
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)return{lines:[],aspect};
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
  const job=page.render({canvasContext:context,viewport});await job.promise;
  if(signal?.aborted)throw Object.assign(new Error('Avbruten'),{name:'AbortError'});
  const x0=Math.max(0,Math.floor(selection.x*canvas.width)),xEnd=Math.min(canvas.width,Math.ceil((selection.x+selection.w)*canvas.width));
  const y0=Math.max(0,Math.floor(selection.y*canvas.height)),yEnd=Math.min(canvas.height,Math.ceil((selection.y+selection.h)*canvas.height));
  const w=xEnd-x0,h=yEnd-y0;
  if(w<3||h<3)return{lines:[],aspect};
  const pixels=context.getImageData(x0,y0,w,h).data;
  const dark=(x,y)=>{const p=(y*w+x)*4;return pixels[p]<165&&pixels[p+1]<165&&pixels[p+2]<165&&pixels[p+3]>100;};
  const segments=[],hMin=Math.max(22,Math.floor(w*.08)),vMin=Math.max(22,Math.floor(h*.08));
  for(let y=0;y<h;y++){let x=0;while(x<w){if(!dark(x,y)){x++;continue;}let a=x;while(x<w&&dark(x,y))x++;if(x-a>=hMin)segments.push({vertical:false,c:y,a,b:x-1});}}
  for(let x=0;x<w;x++){let y=0;while(y<h){if(!dark(x,y)){y++;continue;}let a=y;while(y<h&&dark(x,y))y++;if(y-a>=vMin)segments.push({vertical:true,c:x,a,b:y-1});}}
  // Sammanför intilliggande streck som hör till samma tryckta linje.
  segments.sort((a,b)=>(Number(a.vertical)-Number(b.vertical))||(a.c-b.c)||(a.a-b.a));
  const merged=[];
  for(const seg of segments){
   const previous=merged[merged.length-1];
   if(previous&&previous.vertical===seg.vertical&&Math.abs(previous.c-seg.c)<=2&&seg.a<=previous.b+4&&seg.b>=previous.a-4){
    previous.a=Math.min(previous.a,seg.a);previous.b=Math.max(previous.b,seg.b);previous.c=(previous.c+seg.c)/2;
   }else merged.push({...seg});
  }
  merged.sort((a,b)=>(b.b-b.a)-(a.b-a.a));
  const lines=merged.slice(0,400).map(seg=>seg.vertical?
   {x1:seg.c/w,y1:seg.a/h,x2:seg.c/w,y2:seg.b/h}:
   {x1:seg.a/w,y1:seg.c/h,x2:seg.b/w,y2:seg.c/h});
  canvas.width=0;canvas.height=0;
  return{lines,aspect};
 }
 async function runOperation(name,title,callback){
  if(active)return;active=true;const owned=new AbortController();controller=owned;revision++;refresh();
  try{
   const pdfAtStart=app.getPdf?.(),bytesAtStart=app.getSourceBytes?.(),stateAtStart=app.getStateKey?.();
   const execute=async()=>{
    // Bridge låser övriga ritningsverktyg men lämnar just denna knapp aktiv.
    beginProgress(title);await callback(owned.signal);
    if(pdfAtStart!==app.getPdf?.()||bytesAtStart!==app.getSourceBytes?.()||stateAtStart!==app.getStateKey?.())throw Error('PDF-arbetskopian ändrades under avläsningen. '+savedWorkText()+' Läs den ändrade sidan igen.');
   };
   if(typeof app.withBusy==='function')await app.withBusy(execute,{allow:['digitizerCancelRead']});else await execute();
   checkAbort(owned.signal);finishProgress(name==='export'?'Exporten är klar.':'Klart.');
  }catch(error){
   if(error.name!=='AbortError')console.error(error);finishProgress(error.name==='AbortError'?'Avbrutet. Inget ofärdigt resultat sparades.':('Arbetet stoppades: '+(error?.message||'Okänt fel.')),true);
   const message=error.name==='AbortError'?'Arbetet avbröts. '+savedWorkText():error.message||'Arbetet kunde inte slutföras.';
   if(name==='export')setHint('digitizerExportStatus',message,true);else if(name==='template')setHint('digitizerTemplateStatus',message,true);else setHint('digitizerReadStatus',message,true);
  }finally{
   if(controller===owned)controller=null;await releaseWorker();active=false;refresh();
  }
 }

 async function createTemplate(){
  if(!rect||!app.getPdf?.())return;
  if((project?.cards?.length||project?.template)&&typeof root.confirm==='function'&&!root.confirm('Skapa en ny mallgrupp? Nuvarande digitala kort och manuella granskningar ersätts först när den nya mallen har kunnat läsas korrekt. Exportera JSON först om du vill behålla en separat kopia.'))return;
  const name=String($('digitizerTemplateName').value||'Mallgrupp 1').trim()||'Mallgrupp 1',sourceRevision=revision;
  await runOperation('template','Läser exempelkortet och skapar mall',async signal=>{
   const entry=await readPage(examplePage,signal,1,1),input=coreInput(entry,examplePage);
   if(!['read','native'].includes(String(entry.status||'').toLowerCase()))throw Error('Exempelkortets avläsning blev inte färdig. Försök läsa markeringen igen innan mallgruppen skapas.');
   checkAbort(signal);const template=core.createTemplateGroup({...input,name,groupId:'layout-1'});let card=core.createCard({...input,template});
   // En markerad tabell kan vara en namnlista, checklista eller ett dörrkort.
   // Kräv inte beslagskod, fördefinierade rubriker eller dörrkortssektioner.
   // Behåll avläst källtext för manuell granskning även när mallen är okänd.
   const wordCount=Number(template.reference?.wordCount||0);
   if(wordCount<1)throw Error('Ingen text kunde läsas i markeringen. Kontrollera området och försök igen.');
   const genericLayout=true; // Alltid originaltrogen utmatning i det isolerade testet.
   if(sourceRevision!==revision-1&&sourceRevision!==revision)checkAbort(signal);
   template.approved=false;template.approvedAt=null;template.genericLayout=genericLayout;card.genericLayout=genericLayout;
   try{const detected=await scanTableLines(examplePage,rect,signal);card.layoutLines=detected.lines;card.sourceAspect=detected.aspect;}catch(lineError){if(lineError.name==='AbortError')throw lineError;card.layoutLines=[];card.sourceAspect=null;card.lineWarning=String(lineError.message||'Linjeanalysen misslyckades.');}
   template.sourceReadStatus=entry.status;template.sourceWarnings=(entry.warnings||[]).slice();card.source.readStatus=entry.status;card.source.warnings=(entry.warnings||[]).slice();card=core.recomputeReviewCompleteness(card);
   const value=ensureProject();delete value.integrityError;value.template=template;value.cards=[card];value.name=name;value.progress={...(value.progress||{}),rect:{...rect},examplePage,pages:String(examplePage),currentCardIndex:0};
   currentCardIndex=0;$('digitizerPages').value=String(examplePage);await persist();
   setHint('digitizerTemplateStatus','Text avläst och '+(card.layoutLines||[]).length+' raka linjer identifierade. Granska original mot resultatet. Linjedetektering är en testfunktion och kan missa tunna eller brutna streck.'+(card.lineWarning?' Linjeanalys: '+card.lineWarning:''));
  });
 }
 function approveTemplate(){
  if(!project?.template||active)return;const name=String($('digitizerTemplateName').value||project.template.name||'Mallgrupp 1').trim()||'Mallgrupp 1';
  project.template={...project.template,name,approved:true,approvedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};project.name=name;revision++;scheduleSave(true);refresh();
  setHint('digitizerReadStatus','Mallgruppen är godkänd. Välj nu alla sidor som använder samma layout.');
 }
 async function suggestSimilar(){
  if(!rect||!app.getPdf?.())return;
  await runOperation('similar','Jämför sidformat',async signal=>{
   const pdf=app.getPdf(),kept=app.getKeptPages(),example=await abortable(pdf.getPage(examplePage),signal),base=example.getViewport({scale:1}),similar=[];
   for(const [index,page] of kept.entries()){
    checkAbort(signal);const item=await abortable(pdf.getPage(page),signal),viewport=item.getViewport({scale:1});
    if(Math.abs(viewport.width-base.width)<=Math.max(2,base.width*.01)&&Math.abs(viewport.height-base.height)<=Math.max(2,base.height*.01))similar.push(page);
    showProgress({message:'Jämför sidformat · sida '+page,percent:(index+1)/kept.length*100,page,pageIndex:index+1,pageCount:kept.length,etaMs:index>=1?(Date.now()-startedAt)/(index+1)*(kept.length-index-1):null});
   }
   $('digitizerPages').value=pagesText(similar);ensureProject().progress.pages=$('digitizerPages').value;scheduleSave();
   setHint('digitizerReadStatus',similar.length+' sidor med samma storlek valda. Kontrollera att de verkligen använder samma kortlayout.');
  });
 }
 function replacePageCard(card){
  const cards=ensureProject().cards||[],index=cards.findIndex(item=>pageForCard(item)===pageForCard(card));
  if(index>=0)cards[index]=card;else cards.push(card);cards.sort((a,b)=>pageForCard(a)-pageForCard(b));project.cards=cards;currentCardIndex=Math.max(0,cards.findIndex(item=>item.id===card.id));
 }
 async function scanPages(pages,{force=false,openAfter=false}={}){
  const existing=new Set((project?.cards||[]).map(pageForCard)),queue=force?pages:pages.filter(page=>!existing.has(page)),skipped=pages.length-queue.length;
  if(!queue.length){setHint('digitizerReadStatus','Alla valda sidor är redan lästa och behålls oförändrade. Använd Läs aktuellt kort igen i granskningen om ett särskilt kort ska ersättas.');return;}
  let openWhenDone=false;
  await runOperation('scan','Läser digitala dörrkort',async signal=>{
   const attempted=new Set(queue),failures=(project?.progress?.failures||[]).filter(item=>!attempted.has(Number(item.page)));let failedThisRun=0,incompleteThisRun=0;
   for(const [index,page] of queue.entries()){
    try{
     const previous=(project?.cards||[]).find(item=>pageForCard(item)===page),entry=await readPage(page,signal,index+1,queue.length);
     const completeRead=['read','native'].includes(String(entry.status||'').toLowerCase());
     if(force&&previous&&!completeRead)throw Error('Den nya avläsningen blev inte färdig. Det tidigare granskade kortet behölls; försök läsa sidan igen.');
     let card=core.createCard({...coreInput(entry,page),template:project.template});
     card.genericLayout=true;
     try{const detected=await scanTableLines(page,rect,signal);card.layoutLines=detected.lines;card.sourceAspect=detected.aspect;}catch(lineError){if(lineError.name==='AbortError')throw lineError;card.layoutLines=[];card.lineWarning=String(lineError.message||'Linjeanalysen misslyckades.');}
     card.source.readStatus=entry.status;card.source.warnings=(entry.warnings||[]).slice();card=core.recomputeReviewCompleteness(card);replacePageCard(card);
     if(!completeRead)incompleteThisRun++;
    }catch(error){if(error.name==='AbortError')throw error;failedThisRun++;failures.push({page,message:error.message||'Sidan kunde inte läsas.'});}
    ensureProject().progress={...(project.progress||{}),pages:$('digitizerPages').value,lastCompletedPage:page,completed:index+1,total:queue.length,failures};
    await persist();renderPageList();refreshSummary();
   }
   const readCount=queue.length-failedThisRun,saveMessage=persistentStorage()?' kort lästa och autosparade.':' kort lästa. Arbetet finns bara tillfälligt; spara hela projektet som JSON.',failureDetail=failedThisRun?' '+failures.filter(item=>attempted.has(Number(item.page))).slice(0,2).map(item=>'Sida '+item.page+': '+item.message).join(' '):'';setHint('digitizerReadStatus',readCount+saveMessage+(skipped?' '+skipped+' redan lästa kort behölls oförändrade.':'')+(incompleteThisRun?' '+incompleteThisRun+' kort blev inte färdiglästa och måste läsas om före godkännande.':'')+(failedThisRun?' '+failedThisRun+' sidor kunde inte läsas och visas i listan.':'')+failureDetail+' Öppna granskningen och jämför dem sida vid sida.');
   if(openAfter&&(project?.cards||[]).some(card=>queue.includes(pageForCard(card))))openWhenDone=true;
  });
  if(openWhenDone&&!active&&project?.cards?.length)openReview(currentCardIndex);
 }
 async function readSelected(){
  let pages;try{pages=parsePages($('digitizerPages').value,app.getKeptPages());}catch(error){setHint('digitizerReadStatus',error.message,true);return;}
  await scanPages(pages);
 }

 function findRow(card,rowId){for(const section of card.sections||[]){const index=(section.rows||[]).findIndex(row=>row.id===rowId);if(index>=0)return{section,index,row:section.rows[index]};}return null;}
 function replaceCurrent(next,{rerender=true}={}){
  if(!next||!project?.cards?.[currentCardIndex])return;project.cards[currentCardIndex]=next;revision++;scheduleSave();renderPageList();refreshSummary();if(rerender)renderReview();else{renderTokens();updateReviewState();}
 }
 function editTitle(value){
  const card=clone(currentCard());if(!card)return;card.header=card.header||{};card.header.title=String(value||'').trim();replaceCurrent(core.recomputeReviewCompleteness(card,{edited:true}),{rerender:false});
 }
 function editHeaderField(fieldId,value){
  const card=currentCard();if(!card)return;replaceCurrent(core.updateHeaderField(card,fieldId,{text:value}),{rerender:false});
 }
 function moveHeaderField(fieldId,sectionKey){
  let card=clone(currentCard());if(!card)return;const index=(card.header?.fields||[]).findIndex(item=>item.id===fieldId);if(index<0)return;const [field]=card.header.fields.splice(index,1);
  card=core.recomputeReviewCompleteness(card,{edited:true});const before=new Set(card.sections.flatMap(section=>section.rows.map(row=>row.id)));
  card=core.addRow(card,sectionKey,{designation:(field.label&&field.label!=='Uppgift'?field.label+' · ':'')+(field.text||'')});
  const added=card.sections.flatMap(section=>section.rows).find(row=>!before.has(row.id));
  for(const tokenId of field.tokenIds||[])card=core.assignToken(card,tokenId,{rowId:added?.id,sectionKey,column:'designation',text:(field.label&&field.label!=='Uppgift'?field.label+' · ':'')+(field.text||'')});
  replaceCurrent(card);
 }
 function updateReviewState(){
  const card=currentCard();if(!card)return;const state=cardStatus(card),issues=card.review?.issues||[],conflicts=unresolvedConflicts(card),visualState=conflicts.length?'needs-review':state;
  $('digitizerReviewState').dataset.state=visualState==='changed-after-approval'?'changed':visualState==='needs-review'?'review':visualState;setText('digitizerReviewState',visualState==='needs-review'?'Behöver granskas':statusLabel(card));
  const warnings=(card.source?.warnings||[]).filter(Boolean),conflictMessage=conflicts.length?conflicts.length+' textdelar har olika PDF- och bildtext. Välj rätt alternativ nedan. ':'';
  setText('digitizerCardStatus',(warnings.length?'Avläsningen varnade: '+warnings.join(' ')+' ':'')+conflictMessage+(issues.length?issues.join(' '):visualState==='approved'?'Kortet är kontrollerat och godkänt.':'Kortet är komplett när alla markerade uppgifter har kontrollerats.'));
  $('digitizerApproveCard').disabled=active||!!conflicts.length||!card.review?.canApprove||state==='approved';
 }
 function rowIsLow(row){
  if(row?.requiresReview&&!row.reviewed)return true;
  if(row?.confidence?.low)return true;
  if(Number.isFinite(Number(row?.confidence))&&Number(row.confidence)<CONFIDENCE_LIMIT)return true;
  return Object.values(row?.cellMeta||{}).some(meta=>meta?.confidence?.low||Number.isFinite(Number(meta?.confidence?.minimum))&&Number(meta.confidence.minimum)<CONFIDENCE_LIMIT);
 }
 function renderRows(){
  const rootNode=$('digitizerDigitalSections'),card=currentCard();rootNode.replaceChildren();if(!card)return;
  if(card.header?.fields?.length){
   const box=el('section',null,'digitizerSection'),head=el('div',null,'digitizerSectionHead');head.append(el('strong','Övriga uppgifter högst upp på originalkortet'),el('span',card.header.fields.length+' fält'));box.append(head);
   for(const field of card.header.fields){
    const row=el('div',null,'digitizerRow'),label=el('label'),caption=el('span',field.label||'Textfält'),input=el('input');input.type='text';input.value=String(field.text||'');
    const low=field.confidence?.low||Number.isFinite(Number(field.confidence?.minimum))&&Number(field.confidence.minimum)<CONFIDENCE_LIMIT;
    if(low&&!field.reviewed)row.classList.add('digitizerLowConfidence');
    input.oninput=()=>editHeaderField(field.id,input.value);label.append(caption,input);row.append(label);
    const moveActions=el('div',null,'digitizerRowActions'),sectionSelect=el('select');sectionSelect.setAttribute('aria-label','Avsnitt för '+(field.label||field.text));
    for(const definition of sectionDefinitions){const option=el('option',definition.label);option.value=definition.key;option.selected=definition.key===selectedSection;sectionSelect.append(option);}
    const move=el('button','Flytta till tabellrad');move.type='button';move.onclick=()=>{selectedSection=sectionSelect.value;try{moveHeaderField(field.id,sectionSelect.value);}catch(error){setText('digitizerCardStatus',error.message);}};moveActions.append(sectionSelect,move);row.append(moveActions);
    if(low&&!field.reviewed){const reviewed=el('button','Kontrollerad');reviewed.type='button';reviewed.onclick=()=>{let next=currentCard();for(const id of field.tokenIds||[])next=core.markTokenReviewed(next,id,true);replaceCurrent(next);};row.append(reviewed);}
    box.append(row);
   }
   rootNode.append(box);
  }
  for(const section of card.sections||[]){
   const box=el('section',null,'digitizerSection'),head=el('div',null,'digitizerSectionHead'),title=el('strong',section.label||section.key),count=el('span',(section.rows||[]).length+' rader');head.append(title,count);box.append(head);
   if(!(section.rows||[]).length)box.append(el('p','Inga rader avlästa i det här avsnittet.','hint'));
   for(const row of section.rows||[]){
    const rowNode=el('article',null,'digitizerRow');if(rowIsLow(row)&&!row.reviewed)rowNode.classList.add('digitizerLowConfidence');rowNode.dataset.rowId=row.id;
    const fields=el('div',null,'digitizerRowFields');
    for(const key of cellKeys){
     const label=el('label'),caption=el('span',CELL_LABELS[key]||key),input=el('input');input.type='text';input.value=String(row.cells?.[key]||'');input.dataset.field=key;
     input.addEventListener('focus',()=>{selectedSection=section.key;});
     input.addEventListener('input',()=>{try{replaceCurrent(core.updateRow(currentCard(),row.id,{cells:{[key]:input.value}}),{rerender:false});}catch(error){setText('digitizerCardStatus',error.message);}});
     label.append(caption,input);fields.append(label);
    }
    const actions=el('div',null,'digitizerRowActions'),sectionSelect=el('select');sectionSelect.setAttribute('aria-label','Flytta rad till avsnitt');
    for(const definition of sectionDefinitions){const option=el('option',definition.label);option.value=definition.key;option.selected=definition.key===section.key;sectionSelect.append(option);}
    sectionSelect.onchange=()=>{selectedSection=sectionSelect.value;try{replaceCurrent(core.moveRow(currentCard(),row.id,{sectionKey:sectionSelect.value}));}catch(error){setText('digitizerCardStatus',error.message);}};
    const up=el('button','↑');up.type='button';up.title='Flytta raden upp';up.setAttribute('aria-label','Flytta raden upp');up.disabled=(section.rows||[]).indexOf(row)===0;up.onclick=()=>{const found=findRow(currentCard(),row.id);if(found)replaceCurrent(core.moveRow(currentCard(),row.id,{sectionKey:found.section.key,index:Math.max(0,found.index-1)}));};
    const down=el('button','↓');down.type='button';down.title='Flytta raden ned';down.setAttribute('aria-label','Flytta raden ned');down.disabled=(section.rows||[]).indexOf(row)===(section.rows||[]).length-1;down.onclick=()=>{const found=findRow(currentCard(),row.id);if(found)replaceCurrent(core.moveRow(currentCard(),row.id,{sectionKey:found.section.key,index:found.index+1}));};
    if(rowIsLow(row)&&!row.reviewed){const reviewed=el('button','Kontrollerad');reviewed.type='button';reviewed.onclick=()=>{let next=currentCard();for(const id of row.tokenIds||[])next=core.markTokenReviewed(next,id,true);next=core.updateRow(next,row.id,{reviewed:true});replaceCurrent(next);};actions.append(reviewed);}
    const remove=el('button','Ta bort');remove.type='button';remove.className='digitizerDanger';remove.onclick=()=>{try{replaceCurrent(core.removeRow(currentCard(),row.id));}catch(error){setText('digitizerCardStatus',error.message);}};
    actions.append(sectionSelect,up,down,remove);rowNode.append(fields,actions);box.append(rowNode);
   }
   rootNode.append(box);
  }
 }
 function actionableTokens(card){
  const unassigned=new Set((card.unassignedTokens||[]).map(token=>token.id)),ignored=new Set(card.ignoredTokenIds||[]),result=[];
  for(const token of card.sourceTokens||[]){const conflict=token.conflict===true,low=conflict||!!token.lowConfidence&&!token.reviewed&&!ignored.has(token.id);if(conflict||unassigned.has(token.id)||low)result.push({token,unassigned:unassigned.has(token.id),low,conflict});}
  return result;
 }
 function joinedTokenText(card,ids){
  const wanted=new Set(ids||[]);return(card.sourceTokens||[]).filter(token=>wanted.has(token.id)).sort((a,b)=>(a.box?.y||0)-(b.box?.y||0)||(a.box?.x||0)-(b.box?.x||0)).map(token=>token.text).join(' ').replace(/\s+([,.;:!?%)])/gu,'$1').trim();
 }
 function chooseAlternative(tokenId,alternative){
  let card=clone(currentCard());if(!card)return;const token=(card.sourceTokens||[]).find(item=>item.id===tokenId);if(!token)return;
  token.text=String(alternative?.text||token.text);token.source=alternative?.source||token.source;token.confidence=Number.isFinite(Number(alternative?.confidence))?Number(alternative.confidence):token.confidence;token.reviewed=true;token.conflict=false;token.lowConfidence=Number.isFinite(Number(token.confidence))&&Number(token.confidence)<CONFIDENCE_LIMIT;token.selectedAlternative={text:token.text,source:token.source,confidence:token.confidence};
  if((card.header?.valueTokenIds||[]).includes(tokenId)){card.header.code=joinedTokenText(card,card.header.valueTokenIds);card.header.normalizedCode=core.normalizedCode(card.header.code);}
  for(const field of card.header?.fields||[])if((field.tokenIds||[]).includes(tokenId)){field.text=joinedTokenText(card,field.tokenIds);field.reviewed=true;}
  for(const fixed of card.fixedElements||[])if((fixed.tokenIds||[]).includes(tokenId))fixed.text=joinedTokenText(card,fixed.tokenIds);
  for(const section of card.sections||[])for(const row of section.rows||[])for(const key of cellKeys)if((row.cellMeta?.[key]?.tokenIds||[]).includes(tokenId)){row.cells[key]=joinedTokenText(card,row.cellMeta[key].tokenIds);row.reviewed=true;}
  card.audit=card.audit||[];card.audit.push({at:new Date().toISOString(),action:'ocr-alternative-selected',tokenId,text:token.text,source:token.source});
  replaceCurrent(core.recomputeReviewCompleteness(card,{edited:true}));
 }
 function renderTokens(){
  const card=currentCard(),node=$('digitizerUnassignedList');node.replaceChildren();if(!card)return;const items=actionableTokens(card);setText('digitizerUnassignedCount',items.length);
  $('digitizerUnassignedPanel').dataset.complete=String(!items.length);
  if(!items.length)node.append(el('p','All källtext är placerad eller uttryckligen kontrollerad.','hint'));
  for(const {token,unassigned,low,conflict} of items){
   const row=el('div',null,'digitizerUnassignedItem');if(low)row.classList.add('digitizerLowConfidence');
   const textBox=el('div'),text=el('strong',token.text||'Tom textdel'),meta=el('small',(unassigned?'Inte placerad':'Redan placerad')+(Number.isFinite(Number(token.confidence))?' · '+Math.round(Number(token.confidence))+' % säkerhet':' · säkerhet saknas'));
   textBox.append(text,meta);row.append(textBox);
   const actions=el('div',null,'digitizerTokenActions');
   if(conflict){
    const alternatives=el('div',null,'digitizerTokenAlternatives'),label=el('small','PDF- och bildtext skiljer sig. Välj rätt text:');alternatives.append(label);
    const candidates=(token.alternatives||[]).length?token.alternatives:[{text:token.text,source:token.source,confidence:token.confidence}],seen=new Set();for(const alternative of candidates){const key=core.searchKey(alternative.text);if(!key||seen.has(key))continue;seen.add(key);const button=el('button','Använd ”'+alternative.text+'” ('+(alternative.source==='native'?'PDF-text':'bild')+')');button.type='button';button.onclick=()=>chooseAlternative(token.id,alternative);alternatives.append(button);}
    row.append(alternatives);
   }else if(unassigned){
    const sectionSelect=el('select');sectionSelect.setAttribute('aria-label','Avsnitt för '+token.text);
    for(const section of card.sections||[]){const option=el('option',section.label||section.key);option.value=section.key;option.selected=section.key===selectedSection;sectionSelect.append(option);}
    const columnSelect=el('select');columnSelect.setAttribute('aria-label','Fält för '+token.text);
    for(const key of cellKeys){const option=el('option',CELL_LABELS[key]||key);option.value=key;columnSelect.append(option);}
    const assign=el('button','Placera');assign.type='button';assign.onclick=()=>{try{selectedSection=sectionSelect.value;replaceCurrent(core.assignToken(currentCard(),token.id,{sectionKey:sectionSelect.value,column:columnSelect.value}));}catch(error){setText('digitizerCardStatus',error.message);}};
    const ignore=el('button','Inte en uppgift');ignore.type='button';ignore.onclick=()=>{try{replaceCurrent(core.ignoreToken(currentCard(),token.id,true));}catch(error){setText('digitizerCardStatus',error.message);}};
    actions.append(sectionSelect,columnSelect,assign,ignore);
   }else{
    const reviewed=el('button','Texten är kontrollerad');reviewed.type='button';reviewed.onclick=()=>{try{replaceCurrent(core.markTokenReviewed(currentCard(),token.id,true));}catch(error){setText('digitizerCardStatus',error.message);}};actions.append(reviewed);
   }
   row.append(actions);node.append(row);
  }
  const ignoredIds=new Set(card.ignoredTokenIds||[]),ignored=(card.sourceTokens||[]).filter(token=>ignoredIds.has(token.id));
  if(ignored.length){
   const details=el('details',null,'digitizerIgnoredTokens'),summary=el('summary',ignored.length+' textdelar markerade som inte en uppgift');details.append(summary);
   for(const token of ignored){const row=el('div',null,'digitizerUnassignedItem'),text=el('span',token.text),restore=el('button','Återställ');restore.type='button';restore.onclick=()=>{try{replaceCurrent(core.ignoreToken(currentCard(),token.id,false));}catch(error){setText('digitizerCardStatus',error.message);}};row.append(text,restore);details.append(row);}node.append(details);
  }
 }
 function renderReview(){
  const card=currentCard();if(!card)return;
  setText('digitizerReviewPosition','Kort '+(currentCardIndex+1)+' av '+project.cards.length);setText('digitizerOriginalPage','Sida '+pageForCard(card));
  $('digitizerCardCode').value=card.header?.code||'';$('digitizerCardTitle').value=card.header?.title||'';
  // Automatisk headertext redigeras rad för rad nedan. Det separata
  // rubrikfältet visas bara när kortet faktiskt har en manuell rubrik eller
  // saknar andra headerfält, så samma text inte exporteras två gånger.
  const titleLabel=$('digitizerCardTitle').closest('label');if(titleLabel)titleLabel.hidden=!!card.header?.fields?.length&&!card.header?.title;
  renderRows();renderTokens();updateReviewState();
  $('digitizerPreviousCard').disabled=currentCardIndex<=0;$('digitizerNextCard').disabled=currentCardIndex>=project.cards.length-1;
  void renderOriginal();
 }
 async function renderOriginal(){
  const card=currentCard(),canvas=$('digitizerOriginalCanvas');if(!card||!canvas)return;const token=++originalRenderToken;
  originalPreviewController?.abort();const previewController=new AbortController();originalPreviewController=previewController;
  setText('digitizerOriginalZoomLevel',Math.round(originalZoom*100)+' %');setText('digitizerOriginalPage','Sida '+pageForCard(card)+' · laddar original…');
  try{
   if(typeof app.renderRegionPreview==='function')await app.renderRegionPreview({page:pageForCard(card),rect:card.source?.rect||rect,canvas,zoom:originalZoom,maxPixels:3000000,maxSide:3000,signal:previewController.signal});
   else{await app.showPage?.(pageForCard(card));throw Error('Originalkortet visas i huvudförhandsvisningen.');}
   if(token===originalRenderToken)setText('digitizerOriginalPage','Sida '+pageForCard(card));
  }catch(error){if(token!==originalRenderToken||error.name==='AbortError')return;setText('digitizerOriginalPage','Sida '+pageForCard(card)+' · '+(error.message||'kunde inte visas här'));
  }finally{if(originalPreviewController===previewController)originalPreviewController=null;}
 }
 function openReview(index=0){
  if(active||!project?.cards?.length)return;if(project.integrityError){setHint('digitizerReadStatus','Den sparade kortdatan kunde inte verifieras. Spara JSON som säkerhetskopia eller skapa en ny mallgrupp innan du granskar.',true);return;}currentCardIndex=Math.max(0,Math.min(project.cards.length-1,Number(index)||0));originalZoom=1;ensureProject().progress.currentCardIndex=currentCardIndex;scheduleSave();renderReview();
  const dialog=$('digitizerReviewDialog');if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal();}else dialog.setAttribute('open','');
 }
 function closeReview(){
  originalPreviewController?.abort();originalPreviewController=null;originalRenderToken++;
  const canvas=$('digitizerOriginalCanvas');if(canvas){canvas.width=1;canvas.height=1;}
  const dialog=$('digitizerReviewDialog');if(typeof dialog.close==='function'&&dialog.open)dialog.close();else dialog.removeAttribute('open');
 }
 function navigate(delta){const target=currentCardIndex+delta;if(target<0||target>=(project?.cards?.length||0))return;currentCardIndex=target;originalZoom=1;ensureProject().progress.currentCardIndex=target;scheduleSave();renderReview();}
 function nextIssue(){
  const cards=project?.cards||[];if(!cards.length)return;for(let offset=1;offset<=cards.length;offset++){const index=(currentCardIndex+offset)%cards.length;if(cardStatus(cards[index])!=='approved'){currentCardIndex=index;originalZoom=1;renderReview();return;}}
  setText('digitizerCardStatus','Alla kort är godkända.');
 }
 async function rereadCurrent(){
  const page=pageForCard(currentCard());if(!page)return;
  if(typeof root.confirm==='function'&&!root.confirm('Läs sida '+page+' igen? Den nya avläsningen ersätter det digitala kortets manuella ändringar. Det nuvarande kortet ligger kvar tills den nya avläsningen lyckas.'))return;
  closeReview();await scanPages([page],{force:true,openAfter:true});
 }
 function addRow(){const card=currentCard();if(!card)return;try{replaceCurrent(core.addRow(card,selectedSection,{}));}catch(error){setText('digitizerCardStatus',error.message);}}
 function approveCurrent(){
  const card=currentCard();if(!card)return;
  const conflicts=unresolvedConflicts(card);if(conflicts.length){setText('digitizerCardStatus',conflicts.length+' textdelar har olika PDF- och bildtext. Välj rätt alternativ innan kortet godkänns.');renderTokens();updateReviewState();return;}
  try{replaceCurrent(core.approveCard(card));setHint('digitizerExportStatus',approvedCards().length+' godkända kort kan sparas som sökbar PDF. JSON sparar hela projektet.');const next=(project.cards||[]).findIndex((item,index)=>index>currentCardIndex&&cardStatus(item)!=='approved');if(next>=0){currentCardIndex=next;renderReview();}}catch(error){setText('digitizerCardStatus',error.message||'Kortet kan inte godkännas ännu.');renderTokens();updateReviewState();}
 }

 function projectForExport(cards){const value=snapshot();return{...value,templates:value.template?[value.template]:[],cards:cards||value.cards};}
 async function exportJson(){
  if(!project?.cards?.length||!exporter?.downloadJson)return;
  try{await persist();const result=exporter.downloadJson(projectForExport(),{fileName:cleanName(app.getFileName?.())+'-digitala-dorrkort.json'});setHint('digitizerExportStatus','Hela projektet sparades som '+result.fileName+'.');}
  catch(error){console.error(error);setHint('digitizerExportStatus',error.message||'JSON kunde inte sparas.',true);}
 }
 async function exportPdf(){
  if(project?.integrityError){setHint('digitizerExportStatus','PDF-export är spärrad eftersom den sparade projektinformationen inte kunde verifieras. Spara JSON som säkerhetskopia eller skapa en ny mallgrupp.',true);return;}
  const cards=approvedCards();if(!cards.length||!exporter?.downloadPdf)return;
  await runOperation('export','Skapar sökbar PDF med godkända kort',async signal=>{
   await persist();const result=await exporter.downloadPdf(projectForExport(cards),{fileName:cleanName(app.getFileName?.())+'-digitala-dorrkort.pdf',requireApproved:true,signal,onProgress:value=>showProgress({...value,etaMs:null})});
   setHint('digitizerExportStatus',cards.length+' godkända kort sparades som '+result.fileName+'. Original-PDF:en är oförändrad.');
  });
 }

 async function restore(){
  const token=++restoreToken,startRevision=revision,pdf=app.getPdf?.(),bytes=app.getSourceBytes?.();
  if(!pdf||!bytes){project=null;fingerprint='';rect=null;examplePage=1;setHint('digitizerTemplateStatus','Öppna en PDF och markera ett representativt dörrkort.');setHint('digitizerReadStatus','Godkänn en mallgrupp för att börja.');setHint('digitizerExportStatus','Godkänn de digitala korten före export.');refreshStorageStatus();refresh();return;}
  const metadata={fileName:app.getFileName?.()||'',size:Number(bytes.byteLength||bytes.length||0),pageCount:pdf.numPages,mimeType:'application/pdf'};
  try{
   fingerprint=storage?.fingerprintSource?await storage.fingerprintSource(metadata,bytes):'session-'+metadata.fileName+'-'+metadata.size+'-'+metadata.pageCount;
   if(token!==restoreToken||pdf!==app.getPdf?.()||bytes!==app.getSourceBytes?.()||revision!==startRevision)return;
   // En reset kan precis ha köat sista frysta ögonblicksbilden. Vänta in den
   // före loadProject, särskilt om samma PDF öppnas igen direkt.
   await savePromise.catch(()=>{});if(token!==restoreToken||revision!==startRevision)return;
   const saved=storage?.loadProject?await storage.loadProject(fingerprint):null;refreshStorageStatus();if(token!==restoreToken||revision!==startRevision)return;
   if(saved){
    const integrity=[];if(core.validateTemplate&&saved.template){const checked=core.validateTemplate(saved.template);if(!checked.valid)integrity.push(...checked.errors.map(message=>'Mall: '+message));}
    const cards=[];for(const raw of saved.cards||[]){const checked=core.validateCard?.(raw);if(checked&&checked.valid===false){integrity.push(...checked.errors.map(message=>'Sida '+pageForCard(raw)+': '+message));cards.push(raw);continue;}try{const recomputed=core.recomputeReviewCompleteness(raw,{preserveTime:true}),after=core.validateCard?.(recomputed);if(after&&after.valid===false)integrity.push(...after.errors.map(message=>'Sida '+pageForCard(raw)+': '+message));cards.push(recomputed);}catch(error){integrity.push('Sida '+pageForCard(raw)+': '+error.message);cards.push(raw);}}
    project={...saved,cards,schema:saved.schema||'tillsyno.digital-door-card-project',id:saved.id||'digitizer-'+fingerprint,name:saved.template?.name||'Digitala dörrkort',integrityError:integrity.length?integrity:null};
    rect=validRect(saved.progress?.rect)?{...saved.progress.rect}:validRect(saved.template?.rect)?{...saved.template.rect}:null;examplePage=Number(saved.progress?.examplePage||saved.template?.sourcePage||app.getPage?.()||1);currentCardIndex=Math.max(0,Math.min((saved.cards?.length||1)-1,Number(saved.progress?.currentCardIndex)||0));$('digitizerPages').value=saved.progress?.pages||pagesText((saved.cards||[]).map(pageForCard));if(saved.template?.name)$('digitizerTemplateName').value=saved.template.name;
    const templateStorage=persistentStorage()?'Den autosparade mallgruppen':'Den tillfälligt sparade mallgruppen';setHint('digitizerTemplateStatus',integrity.length?'Den sparade projektinformationen behöver repareras. Skapa en ny mallgrupp eller spara rådata som JSON.':saved.template?.approved?templateStorage+' är godkänd.':templateStorage+' behöver godkännas.',!!integrity.length);
    setHint('digitizerReadStatus',integrity.length?'Sparad data kunde inte verifieras: '+integrity.slice(0,3).join(' '):(saved.cards?.length||0)+(persistentStorage()?' autosparade digitala kort återställdes för den här PDF-filen.':' tillfälligt sparade digitala kort återställdes i den här sessionen. Spara JSON innan sidan stängs.'),!!integrity.length);
    setHint('digitizerExportStatus',integrity.length?'PDF-export är spärrad tills projektet har lästs om. JSON kan användas som säkerhetskopia.':approvedCards().length?approvedCards().length+' godkända kort kan sparas som PDF. JSON sparar hela projektet.':'Godkänn minst ett kort före PDF-export.',!!integrity.length);
   }
   else{project=emptyProject();examplePage=app.getPage?.()||1;$('digitizerPages').value=String(examplePage);setHint('digitizerTemplateStatus','Markera ett representativt dörrkort och skapa mallgruppen.');setHint('digitizerReadStatus','Godkänn en mallgrupp för att börja.');setHint('digitizerExportStatus','Godkänn de digitala korten före export.');}
  }catch(error){console.error(error);project=emptyProject();refreshStorageStatus();setHint('digitizerExportStatus','Lokal autosparning kunde inte öppnas. Du kan fortfarande exportera projektet som JSON.',true);}
  refreshStorageStatus();refresh();
 }
 function reset(){
  // loadFile byter PDF-källan innan reset anropas. Spara därför den frysta
  // ögonblicksbild som scheduleSave tog medan den gamla källan var aktiv.
  const frozen=pendingSnapshot;clearTimeout(saveTimer);saveTimer=null;pendingSnapshot=null;if(frozen?.fingerprint&&storage?.saveProject)void persistFrozen(frozen);
  // Nollställ fingerprint före dialogen stängs, så ett focusout-event inte
  // kan köa den gamla kortdatan med metadata från den nyöppnade PDF-filen.
  fingerprint='';closeReview();restoreToken++;revision++;controller?.abort();originalPreviewController?.abort();originalPreviewController=null;void releaseWorker();clearInterval(clock);clock=null;active=false;project=null;rect=null;examplePage=app.getPage?.()||1;currentCardIndex=0;originalZoom=1;
  $('digitizerPages').value=app.getPdf?.()?String(examplePage):'';$('digitizerPageList').replaceChildren();$('digitizerTemplatePreview').replaceChildren();$('digitizerProgress').hidden=true;setHint('digitizerTemplateStatus','Öppna en PDF och markera ett representativt dörrkort.');setHint('digitizerReadStatus','Godkänn en mallgrupp för att börja.');setHint('digitizerExportStatus','Godkänn de digitala korten före export.');refresh();void restore();
 }
 function setRegion(value,page){
  if(!validRect(value)){setHint('digitizerAreaStatus','Markeringen måste ligga helt inom PDF-sidan.',true);return;}
  revision++;rect={x:Number(value.x),y:Number(value.y),w:Number(value.w),h:Number(value.h)};examplePage=Number(page)||app.getPage?.()||1;ensureProject().progress={...(project.progress||{}),rect:{...rect},examplePage};$('digitizerPages').value=String(examplePage);
  setHint('digitizerTemplateStatus',project?.template?'Ny markering vald. Välj Skapa mall om den ska ersätta nuvarande mallgrupp.':'Skapa nu en mall från det markerade exempelkortet.');
  $('digitizerTools').open=true;app.showTools?.(true);scheduleSave();refresh();$('digitizerCreateTemplate').scrollIntoView({block:'nearest'});
 }

 $('digitizerMarkArea').onclick=()=>app.markDigitizerArea?.();
 $('digitizerCreateTemplate').onclick=()=>void createTemplate();$('digitizerApproveTemplate').onclick=approveTemplate;
 $('digitizerUseSimilar').onclick=()=>void suggestSimilar();$('digitizerReadCards').onclick=()=>void readSelected();$('digitizerCancelRead').onclick=cancelActive;
 $('digitizerPages').oninput=()=>{ensureProject().progress.pages=$('digitizerPages').value;scheduleSave();};
 $('digitizerTemplateName').oninput=()=>{if(project?.template&&!templateApproved()){project.template.name=$('digitizerTemplateName').value;scheduleSave();renderTemplatePreview();}};
 $('digitizerOpenReview').onclick=()=>openReview(currentCardIndex);$('digitizerCloseReview').onclick=closeReview;
 $('digitizerReviewDialog').addEventListener('cancel',event=>{event.preventDefault();closeReview();});
 $('digitizerCardForm')?.addEventListener('submit',event=>event.preventDefault());
 $('digitizerCardForm')?.addEventListener('focusout',()=>scheduleSave(true));
 $('digitizerCardCode').oninput=()=>{try{replaceCurrent(core.updateHeader(currentCard(),{code:$('digitizerCardCode').value}),{rerender:false});}catch(error){setText('digitizerCardStatus',error.message);}};
 $('digitizerCardTitle').oninput=()=>editTitle($('digitizerCardTitle').value);
 $('digitizerPreviousCard').onclick=()=>navigate(-1);$('digitizerNextCard').onclick=()=>navigate(1);$('digitizerNextUncertain').onclick=nextIssue;
 $('digitizerReadCurrent').onclick=()=>void rereadCurrent();$('digitizerAddRow').onclick=addRow;$('digitizerApproveCard').onclick=approveCurrent;
 $('digitizerOriginalZoomOut').onclick=()=>{originalZoom=Math.max(.5,Math.round((originalZoom-.25)*100)/100);void renderOriginal();};
 $('digitizerOriginalZoomIn').onclick=()=>{originalZoom=Math.min(2.5,Math.round((originalZoom+.25)*100)/100);void renderOriginal();};
 $('digitizerOriginalFit').onclick=()=>{originalZoom=1;void renderOriginal();};
 $('digitizerExportJson').onclick=()=>void exportJson();$('digitizerExportPdf').onclick=()=>void exportPdf();
 root.addEventListener?.('pagehide',()=>{if(fingerprint&&project)void persist();});

 root.DrawingCardDigitizer=Object.freeze({setRegion,reset,refresh,getProject:()=>snapshot(),openReview,cancel:cancelActive,parsePages});
 refreshStorageStatus();
 reset();
})(typeof window!=='undefined'?window:globalThis);
