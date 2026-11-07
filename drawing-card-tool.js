/* Drawing Tools: group PDF pages by a user-selected header, with reviewed page removal. */
(()=>{
 'use strict';
 const app=window.DrawingToolsBridge,$=id=>document.getElementById(id);
 if(!app||!window.DrawingCardGroups)return;
 let rect=null,examplePage=1,result=null,documentRef=null,lastKeep='',removals=new Set(),representatives=new Map(),scanVersion=0,scanning=false;
 let workerPromise=null,libraryPromise=null,imageRender=null,scanAbort=null;
 const readReasons={empty:'Ingen text i markeringen',unrecognized:'Texten kunde inte läsas','low-confidence':'Osäker bildläsning – kontrollera markeringen','image-error':'Bildläsningen kunde inte slutföras','text-error':'PDF-texten kunde inte läsas'};
 function abortable(promise,signal){
  if(!signal)return promise;
  return new Promise((resolve,reject)=>{
   const abort=()=>{const error=Error('Avläsningen avbröts.');error.name='AbortError';reject(error);};
   if(signal.aborted){abort();return;}
   signal.addEventListener('abort',abort,{once:true});
   Promise.resolve(promise).then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
  });
 }
 function status(text){$('cardGroupStatus').textContent=text;}
 function reset(){
  scanVersion++;documentRef=app.getPdf();rect=null;result=null;lastKeep='';removals.clear();representatives.clear();
  $('cardGroupResults').replaceChildren();$('cardHeaderInfo').textContent='Inget rubrikfält markerat.';
  status('Sidor ändras först när du väljer Ta bort valda extrasidor.');refresh();
 }
 function setRegion(value,page){
  scanVersion++;rect={...value};examplePage=page;result=null;removals.clear();representatives.clear();lastKeep='';
  $('cardGroupResults').replaceChildren();$('cardHeaderInfo').textContent='Rubrikfält valt på sida '+page+'. Tryck Hitta samma rubriker.';
  status('Avläsningen använder samma markerade plats på de sidor som är kvar.');$('cardGroupTools').open=true;if($('analysisTools'))$('analysisTools').open=true;app.showTools(true);refresh();
  $('cardMarkHeader').scrollIntoView({block:'nearest'});
 }
 function selectedExtras(){
  const kept=new Set(app.getKeptPages()),selected=[];
  for(const group of result?.groups||[]){
   const live=group.pages.filter(item=>kept.has(item.page)),keeper=representatives.get(group.key);
   if(live.length<2)continue;
   for(const item of live)if(item.page!==keeper&&removals.has(item.page))selected.push(item.page);
  }
  return selected;
 }
 function updateApply(){
  const count=selectedExtras().length;$('cardApply').disabled=scanning||!count;
  $('cardApply').textContent='3. Ta bort valda extrasidor'+(count?' ('+count+')':'');
 }
 function refresh(){
  const pdf=app.getPdf();if(pdf!==documentRef){reset();return;}
  const active=app.getEditMode()==='card-header';$('cardMarkHeader').setAttribute('aria-pressed',String(active));$('cardMarkHeader').classList.toggle('active',active);
  const overlay=$('cardHeaderRect');overlay.hidden=!rect;
  if(rect)Object.assign(overlay.style,{left:rect.x*100+'%',top:rect.y*100+'%',width:rect.w*100+'%',height:rect.h*100+'%'});
  $('cardScan').disabled=scanning||!pdf||!rect;$('cardMarkHeader').disabled=scanning||!pdf;
  const key=app.getKeptPages().join(',');
  if(result&&key!==lastKeep){lastKeep=key;renderGroups();}
  updateApply();
 }
 function pageButton(page){
  const button=document.createElement('button');button.type='button';button.dataset.cardPreview=String(page);button.textContent='Visa sida '+page;
  button.onclick=()=>void app.showPage(page);return button;
 }
 function renderGroups(){
  const root=$('cardGroupResults');root.replaceChildren();if(!result)return;
  const kept=new Set(app.getKeptPages());
  for(const [index,group]of result.groups.entries()){
   const live=group.pages.filter(item=>kept.has(item.page));
   if(live.length&&!live.some(item=>item.page===representatives.get(group.key)))representatives.set(group.key,live[0].page);
   const details=document.createElement('details');details.dataset.cardKey=group.key;details.className='cardCodeGroup';details.open=group.pages.length>1;
   const summary=document.createElement('summary');summary.textContent=group.code+' · '+group.pages.length+' sida'+(group.pages.length===1?'':'or')+(live.length!==group.pages.length?' · '+live.length+' kvar':'');details.append(summary);
   const note=document.createElement('p');note.className='hint';note.textContent=group.pages.length>1?'Välj en sida att behålla. Kryssade extrasidor tas bort när du trycker på knappen nedan.':'En enda sida med denna text. Den behålls.';details.append(note);
   if(group.pages.some(item=>item.lowConfidence)){const notice=document.createElement('p');notice.className='hint cardReadWarning';notice.textContent='Osäker bildläsning finns i gruppen. Kontrollera den avlästa texten innan du tar bort extrasidor.';details.append(notice);}
   for(const item of group.pages){
    const row=document.createElement('div');row.className='cardGroupPage';row.dataset.cardPage=String(item.page);
    const keeper=representatives.get(group.key)===item.page,available=kept.has(item.page);
    const keepLabel=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name='card-keep-'+index;radio.dataset.cardKeep=String(item.page);radio.checked=keeper;radio.disabled=!available;
    keepLabel.append(radio,document.createTextNode('Behåll sida '+item.page));
    radio.onchange=()=>{const old=representatives.get(group.key);representatives.set(group.key,item.page);removals.delete(item.page);if(old&&old!==item.page)removals.add(old);renderGroups();updateApply();};
    const removeLabel=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.dataset.cardRemove=String(item.page);check.checked=available&&!keeper&&removals.has(item.page);check.disabled=!available||keeper||live.length<2;
    removeLabel.append(check,document.createTextNode(available?'Ta bort extrasida':'Redan bortvald'));
    check.onchange=()=>{if(check.checked)removals.add(item.page);else removals.delete(item.page);updateApply();};
    const source=document.createElement('small');source.textContent=item.text+(item.source==='image'?' · bildläst':' · PDF-text');
    row.append(keepLabel,removeLabel,pageButton(item.page),source);details.append(row);
   }
   root.append(details);
  }
  if(result.unresolved.length){
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=result.unresolved.length+' sidor utan läsbar text – behålls';details.className='cardUnresolved';details.append(summary);
   for(const item of result.unresolved){const row=document.createElement('div');row.className='cardGroupPage';const text=document.createElement('small');text.textContent='Sida '+item.page+' · '+(readReasons[item.reason]||'Kontrollera rubrikfältet');row.append(text,pageButton(item.page));details.append(row);}
   root.append(details);
  }
 }
 async function localWorker(){
  if(!workerPromise){const pending=(async()=>{
   if(!window.Tesseract){
    if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/tesseract/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('Bildläsningens lokala filer kunde inte laddas.'));document.head.append(script);}).catch(error=>{libraryPromise=null;throw error;});
    await libraryPromise;
   }
   const base=new URL('./',location.href);
   const worker=await Tesseract.createWorker('eng',1,{workerPath:new URL('vendor/tesseract/worker.min.js',base).href,corePath:new URL('vendor/tesseract/tesseract-core-lstm.wasm.js',base).href,langPath:new URL('vendor/tesseract/lang/',base).href,workerBlobURL:false,gzip:true});
   await worker.setParameters({tessedit_pageseg_mode:6,preserve_interword_spaces:'1'});return worker;
  })();const guarded=pending.catch(error=>{if(workerPromise===guarded)workerPromise=null;throw error;});workerPromise=guarded;}
  return workerPromise;
 }
 async function releaseWorker(pending=workerPromise){if(workerPromise===pending)workerPromise=null;if(pending)try{await(await pending).terminate();}catch(_){};}
 async function readImage(pg,area,context){
  const base=pg.getViewport({scale:1}),scale=Math.min(5,4096/Math.max(area.w*base.width,area.h*base.height),Math.sqrt(1200000/Math.max(1,area.w*base.width*area.h*base.height))),viewport=pg.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(area.w*viewport.width));canvas.height=Math.max(1,Math.ceil(area.h*viewport.height));
  let timer,task,ownedWorker=null;const signal=scanAbort?.signal;
  const check=()=>{if(context.cancelled()){const error=Error('Avläsningen avbröts.');error.name='AbortError';throw error;}};
  try{
   check();const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   task=pg.render({canvasContext:ctx,viewport,transform:[1,0,0,1,-area.x*viewport.width,-area.y*viewport.height],annotationMode:0});imageRender=task;await task.promise;imageRender=null;check();
   const pending=localWorker();ownedWorker=workerPromise;const worker=await abortable(pending,signal);check();
   const recognized=await abortable(Promise.race([worker.recognize(canvas),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bildläsningen tog för lång tid. Prova en mindre markering eller Endast PDF-text.')),45000);})]),signal);check();
   return {text:recognized.data.text,confidence:recognized.data.confidence};
  }catch(error){const cleanup=releaseWorker(ownedWorker);if(!signal?.aborted)await cleanup;throw error;}
  finally{if(imageRender===task)imageRender=null;clearTimeout(timer);canvas.width=canvas.height=1;}
 }
 async function scan(){
  if(scanning||!rect||!app.getPdf())return;
  scanning=true;const controller=new AbortController();scanAbort=controller;const version=++scanVersion,pdf=app.getPdf(),pages=app.getKeptPages(),area={...rect};
  result=null;removals.clear();representatives.clear();$('cardGroupResults').replaceChildren();refresh();
  const cancelled=()=>version!==scanVersion;
  $('cardScanMeter').max=pages.length;$('cardScanMeter').value=0;$('cardScanProgress').textContent='Förbereder '+pages.length+' rubrikfält…';
  try{
   await app.withBusy(async()=>{
    $('cardScanDialog').showModal();$('cardScanCancel').disabled=false;
    try{
     result=await abortable(DrawingCardGroups.scan({pdf,pages,rect:area,examplePage,mode:$('cardReadMode').value,readImage,cancelled,onProgress:progress=>{
      $('cardScanMeter').value=progress.readCount;$('cardScanProgress').textContent='Läser rubrik · sida '+progress.page+' · '+progress.readCount+' av '+pages.length;
     }}),controller.signal);
     if(cancelled()){result=null;return;}
     for(const group of result.groups){representatives.set(group.key,group.pages[0].page);for(const item of group.pages.slice(1))removals.add(item.page);}
     lastKeep=pages.join(',');renderGroups();
    }finally{$('cardScanDialog').close();const cleanup=releaseWorker();if(!cancelled())await cleanup;}
   });
   if(cancelled()||!result){result=null;status('Sökningen avbröts. Inga sidor har tagits bort.');}
   else{
    const duplicates=result.groups.filter(group=>group.pages.length>1),matched=result.groups.reduce((sum,group)=>sum+group.pages.length,0);
    status(matched+' avlästa sidor · '+result.groups.length+' olika texter · '+duplicates.length+' grupper med extrasidor. Granska och välj vad som ska tas bort.');
   }
  }catch(error){result=null;$('cardGroupResults').replaceChildren();status(cancelled()?'Sökningen avbröts. Inga sidor har tagits bort.':error.message||'Rubrikerna kunde inte läsas.');}
  finally{if(scanAbort===controller)scanAbort=null;scanning=false;refresh();}
 }
 function cancelScan(){if(!scanning)return;scanVersion++;$('cardScanProgress').textContent='Avbryter sökningen…';$('cardScanCancel').disabled=true;scanAbort?.abort();imageRender?.cancel();void releaseWorker();}
 $('cardScanCancel').onclick=cancelScan;$('cardScanDialog').addEventListener('cancel',event=>{event.preventDefault();cancelScan();});
 $('cardMarkHeader').onclick=()=>app.markCardHeader();$('cardScan').onclick=()=>void scan();
 $('cardReadMode').onchange=()=>{result=null;removals.clear();representatives.clear();$('cardGroupResults').replaceChildren();status('Söksättet är ändrat. Tryck Hitta samma rubriker igen.');refresh();};
 $('cardApply').onclick=async()=>{
  try{
   const selected=selectedExtras();if(!selected.length)return;
   const count=await app.removePages(selected);refresh();status(count+' extrasidor är bortvalda. Ångra återställer dem. Välj Spara PDF för att skapa den rensade filen.');
  }catch(error){status(error.message||'Sidorna kunde inte tas bort.');}
 };
 window.DrawingCardTool=Object.freeze({setRegion,refresh,reset});reset();
})();
