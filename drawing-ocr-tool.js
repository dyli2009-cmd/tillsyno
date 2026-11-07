/* Drawing Tools: prepare reviewed, searchable copies without changing visible PDF content. */
(()=>{
 'use strict';
 const app=window.DrawingToolsBridge,reader=window.DrawingOcrReader,$=id=>document.getElementById(id);
 if(!app||!reader||!$('ocrTools'))return;
 const MIN_CONFIDENCE=70;
 let documentRef=app.getPdf(),rect=null,examplePage=1,result=null,resultState='',resultSource=null;
 let active=false,version=0,controller=null,workerPromise=null,libraryPromise=null,clock=null,started=0,lastProgress=null,progressMessage='';
 const decisions=new Map();
 const elapsed=ms=>{const seconds=Math.max(0,Math.floor(ms/1000));return seconds<60?seconds+' sek':Math.floor(seconds/60)+' min '+seconds%60+' sek';};
 const el=(tag,text,css)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(css)node.className=css;return node;};
 const status=text=>{$('ocrStatus').textContent=text;};
 function abortError(){const error=Error('Förberedelsen avbröts.');error.name='AbortError';return error;}
 function abortable(promise,signal){
  if(!signal)return Promise.resolve(promise);
  return new Promise((resolve,reject)=>{
   const abort=()=>reject(abortError());if(signal.aborted){abort();return;}
   signal.addEventListener('abort',abort,{once:true});
   Promise.resolve(promise).then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
  });
 }
 function parsePages(value,kept){
  const available=new Set(kept),pages=new Set(),text=String(value||'').trim();
  if(!text)throw Error('Ange vilka sidor som ska läsas, till exempel 2 eller 2, 4–8.');
  for(const part of text.split(',')){
   const match=part.trim().match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/);
   if(!match)throw Error('Skriv sidnummer med kommatecken eller intervall, till exempel 2, 4–8.');
   const from=Number(match[1]),to=Number(match[2]||match[1]);
   if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<1||to<from||to-from>available.size)throw Error('Kontrollera sidintervallet. Använd stigande sidnummer som finns kvar i filen.');
   for(let page=from;page<=to;page++){
    if(!available.has(page))throw Error('Sida '+page+' finns inte kvar i arbetskopian. Välj sidor som finns kvar.');
    pages.add(page);
   }
  }
  return [...pages].sort((a,b)=>a-b);
 }
 function pageRanges(pages){
  const ranges=[];for(let index=0;index<pages.length;index++){
   const first=pages[index];let last=first;while(pages[index+1]===last+1){last=pages[++index];}
   ranges.push(first===last?String(first):first+'–'+last);
  }return ranges.join(', ');
 }
 function validRect(value){return value&&['x','y','w','h'].every(key=>Number.isFinite(value[key]))&&value.x>=0&&value.y>=0&&value.w>0&&value.h>0&&value.x+value.w<=1.000001&&value.y+value.h<=1.000001;}
 function isStale(){return !!result&&(app.getPdf()!==documentRef||app.getSourceBytes()!==resultSource||app.getStateKey()!==resultState);}
 function clearResult(message){result=null;resultState='';resultSource=null;decisions.clear();$('ocrResults').replaceChildren();$('ocrReviewApproval').checked=false;if(message)status(message);}
 function reset(){
  version++;controller?.abort();void releaseWorker();documentRef=app.getPdf();rect=null;examplePage=app.getPage()||1;
  clearResult(documentRef?'1. Visa ett dörrkort och markera hela området som ska bli sökbart.':'Öppna en PDF och visa ett dörrkort.');
  const kept=app.getKeptPages();$('ocrPages').value=String(kept.includes(examplePage)?examplePage:kept[0]||'');
  $('ocrAreaInfo').textContent='Inget område markerat.';refresh();
 }
 function setRegion(value,page){
  if(!validRect(value)){status('Markeringen måste ligga inom PDF-sidan. Markera området igen.');return;}
  version++;rect={x:value.x,y:value.y,w:value.w,h:value.h};examplePage=page;
  clearResult('2. Välj sidor med samma kortlayout. Börja gärna med en sida och kontrollera resultatet.');
  $('ocrPages').value=String(page);$('ocrAreaInfo').textContent='Område valt på sida '+page+'. Samma markerade plats används på de valda sidorna.';
  $('ocrTools').open=true;app.showTools(true);refresh();
  $('ocrRead').scrollIntoView({block:'nearest'});
 }
 function wordDecision(pageIndex,wordIndex,word){
  const key=pageIndex+':'+wordIndex;
  if(!decisions.has(key))decisions.set(key,{include:Number(word.confidence)>=MIN_CONFIDENCE,text:String(word.text||''),reviewed:false});
  return decisions.get(key);
 }
 function counts(){
  let total=0,included=0,uncertain=0;
  (result?.pages||[]).forEach((page,pageIndex)=>(page.words||[]).forEach((word,wordIndex)=>{
   if(word.source==='native')return;total++;const decision=wordDecision(pageIndex,wordIndex,word);
   if(Number(word.confidence)<MIN_CONFIDENCE||!Number.isFinite(Number(word.confidence)))uncertain++;
   if(decision.include&&decision.text.trim())included++;
  }));return {total,included,uncertain};
 }
 function refresh(){
  if(app.getPdf()!==documentRef){reset();return;}
  if(isStale())clearResult('Arbetskopian har ändrats. Läs de valda områdena igen innan du sparar textlagret.');
  const pdf=app.getPdf(),marking=app.getEditMode?.()==='ocr-area',overlay=$('ocrAreaRect');
  $('ocrMarkArea').disabled=active||!pdf;$('ocrMarkArea').classList.toggle('active',marking);$('ocrMarkArea').setAttribute('aria-pressed',String(marking));
  $('ocrUseSimilar').disabled=active||!pdf||!rect;$('ocrPages').disabled=active||!pdf;
  $('ocrRead').disabled=active||!pdf||!rect;$('ocrReviewApproval').disabled=active||!result;
  const approved=!!result&&$('ocrReviewApproval').checked,summary=counts();
  $('ocrSave').disabled=active||!approved||!summary.included;$('ocrSaveJson').disabled=active||!approved;
  overlay.hidden=!rect||app.getPage()!==examplePage;
  if(rect)Object.assign(overlay.style,{left:rect.x*100+'%',top:rect.y*100+'%',width:rect.w*100+'%',height:rect.h*100+'%'});
 }
 function reviewChanged(){ $('ocrReviewApproval').checked=false;refresh(); }
 function renderUncertain(root,page,pageIndex){
  const uncertain=(page.words||[]).map((word,index)=>({word,index})).filter(({word})=>word.source!=='native'&&!(Number(word.confidence)>=MIN_CONFIDENCE));
  if(!uncertain.length)return;
  const details=el('details',null,'ocrUncertain'),summary=el('summary','Kontrollera '+uncertain.length+' osäkra ord – utelämnas tills du väljer dem');details.append(summary);
  let offset=0;const list=el('div',null,'ocrWordList'),more=el('button','Visa nästa 50 ord');more.type='button';
  function addBatch(){
   for(const {word,index}of uncertain.slice(offset,offset+50)){
    const decision=wordDecision(pageIndex,index,word),row=el('div',null,'ocrReviewWord'),label=el('label'),check=el('input'),input=el('input');
    check.type='checkbox';check.checked=decision.include;check.dataset.ocrInclude=page.page+':'+index;label.append(check,document.createTextNode('Ta med'));
    input.type='text';input.value=decision.text;input.setAttribute('aria-label','Kontrollera ord '+(index+1)+' på sida '+page.page);input.dataset.ocrWord=page.page+':'+index;
    const confidence=Number(word.confidence);row.append(label,input,el('small',Number.isFinite(confidence)?Math.round(confidence)+' % säkerhet':'Säkerhet saknas'));
    check.onchange=()=>{decision.include=check.checked;decision.reviewed=check.checked;reviewChanged();};
    input.oninput=()=>{decision.text=input.value;decision.include=!!input.value.trim();decision.reviewed=decision.include;check.checked=decision.include;reviewChanged();};list.append(row);
   }
   offset+=50;more.hidden=offset>=uncertain.length;
  }
  details.addEventListener('toggle',()=>{if(details.open&&!offset)addBatch();});more.onclick=addBatch;details.append(list,more);root.append(details);
 }
 function renderResult(){
  const root=$('ocrResults');root.replaceChildren();if(!result)return;
  const summary=counts();root.append(el('p',summary.included+' bildlästa ord kan läggas till som sökbar text. '+summary.uncertain+' osäkra ord behöver kontrolleras.','hint'));
  for(const [index,page]of result.pages.entries()){
   const words=(page.words||[]).filter(word=>word.source!=='native'),low=words.filter(word=>!(Number(word.confidence)>=MIN_CONFIDENCE)).length;
   const details=el('details',null,'ocrPageResult');details.dataset.ocrPage=String(page.page);
   const nativeCount=Number(page.nativeCount??page.nativeWordCount??page.nativeWords?.length??0),failed=page.status==='error'||page.status==='partial';
   details.append(el('summary','Sida '+page.page+' · '+words.length+' nya ord'+(low?' · '+low+' osäkra':'')+(nativeCount?' · befintlig PDF-text behålls':'')+(failed?' · behöver kontrolleras':'')));
   for(const warning of page.warnings||[])details.append(el('p',String(warning),'ocrReadWarning'));
   details.append(el('p','Texten nedan är avläst från bilderna. Kontrollera koder samt tabellernas rader och kolumner mot originalet.','hint'));
   const preview=el('button','Visa originalsida '+page.page);preview.type='button';preview.dataset.ocrPreview=String(page.page);preview.onclick=()=>void app.showPage(page.page);details.append(preview);
   let populated=false;details.addEventListener('toggle',()=>{
    if(!details.open||populated)return;populated=true;
    const text=words.map(word=>String(word.text||'')).join(' '),pre=el('pre',text.length>50000?text.slice(0,50000)+'\n… Textvisningen är förkortad. All avläst text finns i JSON-exporten.':text||'Ingen ny bildtext behövde läggas till.','ocrTextPreview');details.append(pre);renderUncertain(details,page,index);
   });root.append(details);
  }
  const emptyPages=result.pages.filter(page=>!(page.words||[]).length).length;
  if(!summary.total)root.append(el('p','Ingen ny bildtext hittades. Befintlig PDF-text behöver inte läggas till igen. Kontrollera markeringen om du väntade dig bildtext.','hint'));
  else if(emptyPages)root.append(el('p',emptyPages+' sidor gav ingen ny bildtext. Befintlig text behålls.','hint'));
 }
 async function localWorker(context={}){
  const signal=context.signal||controller?.signal;
  if(!workerPromise){
   const pending=(async()=>{
    if(!window.Tesseract){
     if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/tesseract/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('Bildläsningens lokala filer kunde inte laddas.'));document.head.append(script);}).catch(error=>{libraryPromise=null;throw error;});
     await abortable(libraryPromise,signal);
    }
    if(signal?.aborted)throw abortError();
    const base=new URL('./',location.href),worker=await Tesseract.createWorker(['swe','eng'],1,{
     workerPath:new URL('vendor/tesseract/worker.min.js',base).href,corePath:new URL('vendor/tesseract/tesseract-core-lstm.wasm.js',base).href,
     langPath:new URL('vendor/tesseract/lang/',base).href,workerBlobURL:false,gzip:true,
     logger:progress=>{if(progress.status==='recognizing text'&&active&&lastProgress?.phase==='ocr'){$('ocrProgressMessage').textContent=progressMessage+' · '+Math.round((progress.progress||0)*100)+' % av bildområdet';}}
    });
    if(signal?.aborted){void worker.terminate();throw abortError();}
    await worker.setParameters({tessedit_pageseg_mode:6,preserve_interword_spaces:'1'});return worker;
   })();
   const guarded=pending.catch(error=>{if(workerPromise===guarded)workerPromise=null;throw error;});workerPromise=guarded;
  }
  return abortable(workerPromise,signal);
 }
 async function releaseWorker(pending=workerPromise){if(workerPromise===pending)workerPromise=null;if(pending)try{await(await pending).terminate();}catch(_){};}
 function updateClock(){
  if(!started)return;const spent=Date.now()-started,eta=lastProgress?.etaMs;
  $('ocrProgressTime').textContent='Tid: '+elapsed(spent)+(Number.isFinite(eta)&&eta>=0?' · ungefär '+elapsed(eta)+' kvar':' · återstående tid beräknas efter de första områdena');
 }
 function progress(value={},exporting=false){
  lastProgress=value;const meter=$('ocrProgressMeter'),percent=Number(value.percent);
  meter.max=100;
  if(Number.isFinite(percent)){const shown=Math.max(0,Math.min(exporting?99:100,percent));meter.value=shown;$('ocrProgressPercent').textContent=Math.floor(shown)+' %';}
  else{meter.removeAttribute('value');$('ocrProgressPercent').textContent='Arbetar…';}
  const phase={inspect:'Kontrollerar befintlig text',render:'Förbereder markerat bildområde',ocr:'Läser bildtext','page-complete':'Sidan färdig',complete:'Avläsningen färdig'}[value.phase]||'Förbereder';
  const where=value.page?' · sida '+value.page+(value.pageCount?' ('+(value.pageIndex||1)+' av '+value.pageCount+')':''):'';
  const tile=value.tileCount?' · '+Math.min(value.tileCount,Math.max(0,value.tileIndex||0))+' av '+value.tileCount+' bildområden avlästa':'';
  progressMessage=value.message||phase+where+tile;$('ocrProgressMessage').textContent=progressMessage;updateClock();
 }
 function openProgress(title){
  started=Date.now();lastProgress=null;$('ocrProgressTitle').textContent=title;$('ocrProgressCancel').disabled=false;
  progress({message:'Förbereder…',percent:0});$('ocrProgressDialog').showModal();clearInterval(clock);clock=setInterval(updateClock,1000);
 }
 function closeProgress(){clearInterval(clock);clock=null;started=0;if($('ocrProgressDialog').open)$('ocrProgressDialog').close();}
 function cancel(){if(!active)return;$('ocrProgressCancel').disabled=true;$('ocrProgressMessage').textContent='Avbryter… Ingen ofärdig fil sparas.';controller?.abort();void releaseWorker();}
 async function useSimilar(){
  if(active||!rect||!app.getPdf())return;
  active=true;controller=new AbortController();const owned=controller,pdf=app.getPdf(),stamp=++version;refresh();
  try{
   await app.withBusy(async()=>{
    openProgress('Hittar sidor med samma sidformat');
    const source=await abortable(pdf.getPage(examplePage),owned.signal),view=source.getViewport({scale:1}),pages=app.getKeptPages(),similar=[];
    for(const [index,page]of pages.entries()){
     const pg=await abortable(pdf.getPage(page),owned.signal),v=pg.getViewport({scale:1});
     if(Math.abs(v.width-view.width)<=Math.max(2,view.width*.01)&&Math.abs(v.height-view.height)<=Math.max(2,view.height*.01))similar.push(page);
     progress({message:'Kontrollerar sidformat · sida '+page+' · '+(index+1)+' av '+pages.length,percent:(index+1)/pages.length*100});
    }
    if(stamp!==version||owned.signal.aborted)throw abortError();
    $('ocrPages').value=pageRanges(similar);clearResult(similar.length+' sidor med samma sidformat valda. Kontrollera att korten har samma layout innan du börjar läsa.');
   });
  }catch(error){status(error.name==='AbortError'?'Sidvalet avbröts. Ingen PDF har ändrats.':error.message||'Kunde inte jämföra sidformaten.');}
  finally{closeProgress();if(controller===owned)controller=null;active=false;refresh();}
 }
 async function read(){
  if(active||!rect||!app.getPdf())return;
  let pages;try{pages=parsePages($('ocrPages').value,app.getKeptPages());}catch(error){status(error.message);return;}
  active=true;const owned=new AbortController();controller=owned;const stamp=++version,pdf=app.getPdf(),source=app.getSourceBytes(),state=app.getStateKey(),area={...rect};clearResult();refresh();
  try{
   await app.withBusy(async()=>{
    openProgress('Gör markerade dörrkort sökbara');
    result=await abortable(reader.read({...app.getOcrOptions?.(),pdf,pages,rect:area,confidenceThreshold:MIN_CONFIDENCE,getWorker:localWorker,onCancelRecognition:()=>void releaseWorker(),pdfjsLib:window.pdfjsLib,signal:owned.signal,cancelled:()=>stamp!==version||owned.signal.aborted,onProgress:progress}),owned.signal);
    if(stamp!==version||owned.signal.aborted)throw abortError();
    if(pdf!==app.getPdf()||source!==app.getSourceBytes()||state!==app.getStateKey())throw Error('Arbetskopian ändrades under läsningen. Läs områdena igen.');
    resultSource=source;resultState=state;renderResult();
   });
   const incomplete=result.pages.filter(page=>page.status==='error'||page.status==='partial').length;
   status('4. Avläsningen är klar efter '+elapsed(Date.now()-started)+'. '+(incomplete?incomplete+' sidor kunde inte läsas fullständigt. ':'')+'Granska texten per sida, godkänn och välj Spara sökbar PDF. Bilderna behålls.');
   $('ocrTools').open=true;app.showTools(true);
  }catch(error){clearResult(error.name==='AbortError'?'Avläsningen avbröts. Inget ofärdigt textlager eller någon PDF har sparats.':error.message||'Texten kunde inte läsas. Prova en mindre markering.');}
  finally{closeProgress();if(controller===owned)controller=null;void releaseWorker();active=false;refresh();}
 }
 function selectedReadings(){
  return {...result,pages:result.pages.map((page,pageIndex)=>({...page,words:(page.words||[]).flatMap((word,wordIndex)=>{
   if(word.source==='native')return [];const decision=wordDecision(pageIndex,wordIndex,word);
   return decision.include&&decision.text.trim()?[{...word,text:decision.text.trim(),reviewed:decision.reviewed}]:[];
  })}))};
 }
 function jsonReadings(){
  return {schema:'tillsyno-searchable-text-v1',createdAt:new Date().toISOString(),coordinateSystem:'viewport-top-left',region:{...rect},...result,
   pages:result.pages.map((page,pageIndex)=>({...page,words:(page.words||[]).map((word,wordIndex)=>{
    const decision=wordDecision(pageIndex,wordIndex,word);return {...word,text:decision.text,include:word.source==='native'||decision.include,reviewed:decision.reviewed};
   })}))};
 }
 async function save(json=false){
  if(active||!result||!$('ocrReviewApproval').checked)return;
  if(isStale()){refresh();return;}
  if(json){
   const blob=new Blob([JSON.stringify(jsonReadings(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download=String(app.getFileName?.()||'ritning.pdf').replace(/\.pdf$/i,'')+'-sokbar-text.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status('JSON med text, positioner och granskningsval är sparad. PDF-originalet är oförändrat.');return;
  }
  if(!counts().included)return;
  active=true;const owned=new AbortController();controller=owned;const stamp=++version,data=selectedReadings();refresh();
  try{
   await app.withBusy(async()=>{
    openProgress('Sparar sökbar PDF-kopia');progress({message:'Förbereder originalets sidor och det granskade textlagret…'},true);
    const output=await abortable(app.createSearchableCopy(data,{signal:owned.signal,cancelled:()=>owned.signal.aborted||stamp!==version,onProgress:value=>progress(value,true)}),owned.signal);
    if(owned.signal.aborted||stamp!==version)throw abortError();if(isStale())throw Error('Arbetskopian ändrades. Läs texten igen innan du sparar.');
    if(!output)throw Error('Ingen sökbar PDF kunde skapas.');
    $('ocrProgressCancel').disabled=true;await app.downloadPdf(output);progress({message:'PDF-kopian är färdig.',percent:100});
    const unsupported=output.unsupported?.length||output.ocr?.unsupported?.length||output.report?.unsupported?.length||0;
    status('Sökbar PDF-kopia skapad. Öppna den hämtade kopian i SmartMatch och välj textsökning.'+(unsupported?' '+unsupported+' ord kunde inte sparas som PDF-text; de finns i JSON-exporten.':''));
   });
  }catch(error){status(error.name==='AbortError'?'Sparandet avbröts. Ingen ofärdig PDF har sparats.':error.message||'Den sökbara PDF-kopian kunde inte sparas.');}
  finally{closeProgress();if(controller===owned)controller=null;active=false;refresh();}
 }
 $('ocrMarkArea').onclick=()=>app.markOcrArea();$('ocrUseSimilar').onclick=()=>void useSimilar();$('ocrRead').onclick=()=>void read();
 $('ocrSave').onclick=()=>void save(false);$('ocrSaveJson').onclick=()=>void save(true);$('ocrReviewApproval').onchange=refresh;
 $('ocrPages').oninput=()=>{clearResult('Sidvalet är ändrat. Tryck Läs markerade områden för att förbereda de valda korten.');refresh();};
 $('ocrProgressCancel').onclick=cancel;$('ocrProgressDialog').addEventListener('cancel',event=>{event.preventDefault();cancel();});
 window.DrawingOcrTool=Object.freeze({setRegion,refresh,reset,parsePages});reset();
})();
