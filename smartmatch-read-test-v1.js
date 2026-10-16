/* Isolated card reading and reviewed drawing matches, Avläsning TEST 2. */
(()=>{
 'use strict';
 const base=new URL('./',document.currentScript.src),templatesKey='tillsyno-read-test-templates:v1';
 const clone=o=>JSON.parse(JSON.stringify(o));
 const clean=s=>String(s||'').normalize('NFC').replace(/\s+/g,' ').trim();
 const norm=s=>window.SmartMatchAppBridge?.normalizeCardLabel(s)||'';
 const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
 let active=null,ui=null,workerPromise=null,libraryPromise=null,opening=false;
 let doc=null,example=1,zoom=1,rects={},mode='code',gesture=null,prepared={},preparedChecks={},confirmed=false,busy=false,resolveChoice=null,sourceId='',cancelVersion=0;
 let view='card',drawingPage=1,drawingSample=null,matchRun=null,focusedHit=null;
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
 function candidates(value){
  const raw=String(value||'').toUpperCase().normalize('NFC').replace(/[–—]/g,'-');
  const stripped=raw.replace(/\b(?:BESLAGSKOD|BESLAGKOD|DÖRRKORT|DORRKORT|BESLAGSKORT|BETECKNING|LITTERA)\b\s*[:#=]?/g,' ').trim();
  const out=new Set(),add=s=>{const c=norm(clean(s));if(c&&!/^(?:GS|KOD|KORT|DÖRR|DORR|ANTAL|SIDA|MODELL|PRODUKT|BESLAG|RUMSTYP)$/.test(c))out.add(c);};
  for(const m of stripped.matchAll(/(?:^|[^A-ZÅÄÖ0-9])([A-ZÅÄÖ]{1,5}[ _/-]*\d{1,6}[A-ZÅÄÖ]{0,4})(?=$|[^A-ZÅÄÖ0-9])/g))add(m[1]);
  for(const word of stripped.split(/[\s:;,|]+/))if(/^[A-ZÅÄÖ]{2,6}$/.test(word))add(word);
  if(!out.size)add(stripped.replace(/^[\s:;|]+|[\s:;|]+$/g,''));
  return [...out];
 }
 function rowKey(text,index){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return 'read:'+index+':'+(h>>>0).toString(36);}
 function workRows(text){
  return String(text||'').split('\n').map(clean).filter(t=>t&&!/^(?:[-–—|\s]+|KOMPONENT\s+PRODUKT(?:\s+.*)?|BESLAGSKOD\s*:?.*|DÖRRKORT\s*:?.*)$/i.test(t));
 }
 function validRect(r){return r&&[r.x,r.y,r.w,r.h].every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.w>.001&&r.h>.001&&r.x+r.w<=1.001&&r.y+r.h<=1.001;}
 function validMatchBox(r){return r&&[r.x,r.y,r.w,r.h].every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=1.001&&r.y+r.h<=1.001;}
 function validData(data){
  return data?.schema===1&&validRect(data.rects?.code)&&validRect(data.rects?.table)&&Array.isArray(data.pages)&&data.pages.length>0&&data.pages.every(p=>Number.isInteger(p)&&p>0&&data.cards?.[p]&&norm(data.cards[p].code)===data.cards[p].code&&Array.isArray(data.cards[p].work))&&
   (!data.matching||data.matching.version===2&&Array.isArray(data.matching.hits)&&data.matching.hits.every(h=>Number.isInteger(h.page)&&h.page>0&&!data.pages.includes(h.page)&&Object.values(data.cards).some(c=>c.code===h.code)&&Array.isArray(h.rect)&&h.rect.length===4&&h.rect.every(Number.isFinite)&&h.rect[2]>h.rect[0]&&h.rect[3]>h.rect[1]&&validMatchBox(h.box)));
 }
 async function sourceHash(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function remember(){
  if(!active)return;
  try{localStorage.setItem('tillsyno-read-test-source:'+active.sourceId,JSON.stringify(active));}
  catch(_){window.SmartMatchAppBridge?.setStatus('Lokal lagring är full. Spara projekt-PDF för att bevara läsmallen och arbetet.');}
 }
 async function embedded(bytes){
  try{
   const p=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false}),raw=p.catalog.get(PDFLib.PDFName.of('TillsynoSmartMatchV30Data'));
   const data=raw?.decodeText?JSON.parse(raw.decodeText()).readTestData:null;return validData(data)?data:null;
  }catch(_){return null;}
 }
 function status(text){$('rtStatus').textContent=text;}
 function invalidateMatches(){matchRun=null;focusedHit=null;$('rtMatchApproval').checked=false;$('rtDrawingResults').replaceChildren();$('rtStart').disabled=true;for(const el of document.querySelectorAll('.rtMatchHint'))el.textContent='Sök stämplar för att kontrollera kopplingen till ritningen.';}
 function invalidate(){prepared={};confirmed=false;invalidateMatches();$('rtResults').replaceChildren();populateStampCodes();status('Markera kodområdet och hela tabellen. Provläs sedan dina val.');}
 function lock(on){busy=on;for(const id of ['rtPreview','rtPage','rtPrev','rtNext','rtPages','rtTemplate','rtZoomIn','rtZoomOut','rtCode','rtTable','rtMove','rtStamp','rtStampCode','rtFind','rtSampleClear','rtMatchApproval'])$(id).disabled=on;for(const el of ui.querySelectorAll('#rtResults input,#rtResults textarea,#rtDrawingResults input,#rtDrawingResults button'))el.disabled=on;$('rtStart').disabled=on||!confirmed;if(!on){$('rtFind').disabled=!confirmed;$('rtStamp').disabled=!confirmed;$('rtMatchApproval').disabled=!matchRun;validatePrepared();}}
 function makeUI(){
  if(ui)return;
  ui=document.createElement('dialog');ui.id='rtDialog';ui.className='rtDialog';ui.setAttribute('aria-labelledby','rtTitle');
  ui.innerHTML=`<header class="rtHead"><div><small>SmartMatch · Avläsning TEST 2</small><h2 id="rtTitle">Läs dörrkort och matcha stämplar</h2></div><button id="rtCancel" type="button">Avbryt</button></header>
   <p class="rtIntro">Markera kod och tabell på dörrkortet. Provläs. Markera sedan en exempelstämpel på ritningen vid behov och granska träffarna före start.</p>
   <div class="rtSetup"><label>Sparad läsmall<select id="rtTemplate"><option value="">Ny markering</option></select></label><label>Dörrkortssidor<input id="rtPages" placeholder="Exempel: 2, 4-8" inputmode="text"></label><button id="rtNormal" type="button">Använd vanlig SmartMatch</button></div>
   <div class="rtLayout"><section class="rtDocument" aria-label="Markera dörrkort eller ritning"><div class="rtControls"><button id="rtPrev" type="button" aria-label="Föregående sida">‹</button><label><span id="rtPageLabel">Dörrkortssida</span><input id="rtPage" type="number" min="1" value="1"></label><span id="rtPageCount"></span><button id="rtNext" type="button" aria-label="Nästa sida">›</button><button id="rtZoomOut" type="button" aria-label="Zooma ut">−</button><button id="rtZoomIn" type="button" aria-label="Zooma in">+</button></div>
   <div class="rtModes"><button id="rtCode" type="button" aria-pressed="true">1. Markera kod</button><button id="rtTable" type="button" aria-pressed="false">2. Markera tabell</button><button id="rtStamp" type="button" aria-pressed="false">Markera stämpel på ritning</button><button id="rtMove" type="button" aria-pressed="false">Flytta vyn</button></div>
   <div id="rtSampleControls" class="rtSampleControls" hidden><label>Koppla exempelstämpeln till<select id="rtStampCode"></select></label><button id="rtSampleClear" type="button">Rensa exempel</button><p>Välj ritningssida. Dra en ruta tätt runt en beteckning, exempelvis WC. Exemplet hjälper bildläsningen att hitta rätt textstorlek.</p></div>
   <div id="rtViewport" class="rtViewport"><div id="rtCanvasBox" class="rtCanvasBox"><canvas id="rtCanvas"></canvas><div id="rtCodeRect" class="rtRect rtCodeRect" hidden><span>Kod</span></div><div id="rtTableRect" class="rtRect rtTableRect" hidden><span>Hela tabellen</span></div><div id="rtStampRect" class="rtRect rtStampRect" hidden><span>Exempelstämpel</span></div><div id="rtHitRect" class="rtRect rtHitRect" hidden><span>Träff</span></div><div id="rtDraftRect" class="rtRect" hidden></div></div></div></section>
   <aside class="rtReview"><p id="rtStatus" class="rtStatus" role="status" aria-live="polite"></p><button id="rtPreview" class="rtPrimary" type="button">3. Provläs valda sidor</button><details class="rtCoordinates"><summary>Justera markeringar med siffror</summary><div id="rtCoordinates"></div></details><div id="rtResults"></div><section class="rtMatchReview"><button id="rtFind" class="rtPrimary" type="button" disabled>Sök stämplar på ritningen</button><div id="rtDrawingResults" aria-live="polite"></div><label class="rtApproval"><input id="rtMatchApproval" type="checkbox" disabled>Jag har granskat träffarna på ritningen</label></section></aside></div>
   <footer class="rtFooter"><label>Mallnamn<input id="rtName" placeholder="Exempel: Dörrkort med Beslagskod" maxlength="70"></label><label class="rtSaveChoice"><input id="rtSaveTemplate" type="checkbox" checked>Spara markeringarna som läsmall på enheten</label><button id="rtStart" class="rtPrimary" type="button" disabled>4. Starta med granskade träffar</button></footer>`;
  document.body.append(ui);
  $('rtCancel').onclick=()=>finish(false);ui.addEventListener('cancel',e=>{e.preventDefault();finish(false);});
  $('rtNormal').onclick=()=>{active=null;try{localStorage.removeItem('tillsyno-read-test-source:'+sourceId);}catch(_){}finish(true);};
  for(const kind of ['code','table','stamp','move'])$('rt'+kind[0].toUpperCase()+kind.slice(1)).onclick=()=>setMode(kind);
  $('rtPrev').onclick=()=>changePage(currentPage()-1);$('rtNext').onclick=()=>changePage(currentPage()+1);
  $('rtPage').onchange=()=>changePage(Number($('rtPage').value));
  $('rtPages').oninput=invalidate;
  $('rtZoomIn').onclick=()=>{zoom=Math.min(6,zoom*1.4);void render();};$('rtZoomOut').onclick=()=>{zoom=Math.max(.5,zoom/1.4);void render();};
  $('rtPreview').onclick=()=>void preview();$('rtStart').onclick=start;
  $('rtFind').onclick=()=>void searchDrawing();$('rtMatchApproval').onchange=validatePrepared;
  $('rtStampCode').onchange=()=>{if(drawingSample){drawingSample.code=$('rtStampCode').value;invalidateMatches();status('Sök stämplar igen efter ändrad koppling.');}};
  $('rtSampleClear').onclick=()=>{drawingSample=null;invalidateMatches();paint();coordinates();status('Exemplet är rensat. Sök stämplar för att läsa ritningen igen.');};
  $('rtTemplate').onchange=()=>{const t=templates()[$('rtTemplate').value];if(t){rects=clone(t.rects);$('rtName').value=t.name;}else rects={};invalidate();paint();coordinates();};
  const box=$('rtCanvasBox');
  box.addEventListener('pointerdown',e=>{
   if(busy||mode==='move'||(e.pointerType==='mouse'&&e.button!==0))return;
   e.preventDefault();const p=point(e);gesture={id:e.pointerId,start:p,end:p,mode};box.setPointerCapture(e.pointerId);drawDraft();
  });
  box.addEventListener('pointermove',e=>{if(gesture?.id!==e.pointerId)return;e.preventDefault();gesture.end=point(e);drawDraft();});
  box.addEventListener('pointerup',e=>{
   if(gesture?.id!==e.pointerId)return;e.preventDefault();gesture.end=point(e);const r=gestureRect();
   if(r.w*box.clientWidth>=8&&r.h*box.clientHeight>=6){if(gesture.mode==='stamp'){drawingSample={page:drawingPage,rect:r,code:$('rtStampCode').value};invalidateMatches();status('Exempelstämpel vald. Tryck Sök stämplar på ritningen.');}else{rects[gesture.mode]=r;invalidate();}}
   gesture=null;$('rtDraftRect').hidden=true;box.releasePointerCapture(e.pointerId);paint();coordinates();
  });
  box.addEventListener('pointercancel',()=>{gesture=null;$('rtDraftRect').hidden=true;});
 }
 function templates(){try{return JSON.parse(localStorage.getItem(templatesKey)||'[]').filter(t=>validRect(t.rects?.code)&&validRect(t.rects?.table));}catch(_){return [];}}
 function currentPage(){return view==='drawing'?drawingPage:example;}
 function populateStampCodes(){
  const select=$('rtStampCode'),previous=select.value||drawingSample?.code;
  const codes=[...new Set(Object.values(prepared).map(c=>norm(c.code)).filter(Boolean))];
  select.replaceChildren(...codes.map(code=>new Option(code,code)));if(codes.includes(previous))select.value=previous;
  $('rtStamp').disabled=busy||!codes.length;$('rtFind').disabled=busy||!confirmed;
 }
 function setMode(value){
  const old=view;mode=value;if(value==='stamp'){
   view='drawing';let pages=[];try{pages=parsePages($('rtPages').value,doc.numPages);}catch(_){}
   if(pages.includes(drawingPage))drawingPage=Array.from({length:doc.numPages},(_,i)=>i+1).find(p=>!pages.includes(p))||1;
  }else if(value!=='move')view='card';
  $('rtCanvasBox').style.touchAction=value==='move'?'pan-x pan-y':'none';
  for(const v of ['code','table','stamp','move'])$('rt'+v[0].toUpperCase()+v.slice(1)).setAttribute('aria-pressed',String(v===value));
  $('rtSampleControls').hidden=view!=='drawing';$('rtPageLabel').textContent=view==='drawing'?'Ritningssida':'Dörrkortssida';$('rtPage').value=String(currentPage());coordinates();paint();
  if(old!==view){zoom=1;void render();}
 }
 function point(e){const r=$('rtCanvasBox').getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width),y:clamp((e.clientY-r.top)/r.height)};}
 function gestureRect(){const a=gesture.start,b=gesture.end;return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)};}
 function showRect(el,r){el.hidden=!r;if(!r)return;Object.assign(el.style,{left:r.x*100+'%',top:r.y*100+'%',width:r.w*100+'%',height:r.h*100+'%'});}
 function drawDraft(){const el=$('rtDraftRect');el.className='rtRect '+(gesture.mode==='stamp'?'rtStampRect':gesture.mode==='code'?'rtCodeRect':'rtTableRect');showRect(el,gestureRect());}
 function paint(){showRect($('rtCodeRect'),view==='card'?rects.code:null);showRect($('rtTableRect'),view==='card'?rects.table:null);showRect($('rtStampRect'),view==='drawing'&&drawingSample?.page===drawingPage?drawingSample.rect:null);showRect($('rtHitRect'),view==='drawing'&&focusedHit?.page===drawingPage?focusedHit.box:null);}
 function coordinates(){
  const root=$('rtCoordinates');root.replaceChildren();
  for(const [kind,label]of (view==='drawing'?[['stamp','Stämpel']]:[['code','Kod'],['table','Tabell']])){
   const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=label+' · procent av sidan';field.append(legend);
   for(const [key,name]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']]){
    const r=kind==='stamp'?drawingSample?.rect:rects[kind];
    const l=document.createElement('label');l.textContent=name;const input=document.createElement('input');input.type='number';input.min='0';input.max='100';input.step='.1';input.value=String(Math.round((r?.[key]||0)*10000)/100);input.setAttribute('aria-label',label+' '+name);
    input.onchange=()=>{const next={...(kind==='stamp'?drawingSample?.rect:rects[kind]||{x:0,y:0,w:0,h:0}),[key]:clamp(Number(input.value)/100)};next.w=Math.min(next.w||0,1-(next.x||0));next.h=Math.min(next.h||0,1-(next.y||0));if(kind==='stamp'){drawingSample={page:drawingPage,rect:next,code:$('rtStampCode').value};invalidateMatches();}else{rects[kind]=next;invalidate();}paint();};l.append(input);field.append(l);
   }root.append(field);
  }
 }
 async function changePage(n){
  if(view==='drawing'){if(busy||!doc)return;drawingPage=Math.max(1,Math.min(doc.numPages,Math.trunc(n)||1));$('rtPage').value=String(drawingPage);zoom=1;coordinates();await render();return;}
  if(busy||!doc)return;const old=example;example=Math.max(1,Math.min(doc.numPages,Math.trunc(n)||1));
  if($('rtPages').value===String(old)){$('rtPages').value=String(example);invalidate();}
  $('rtPage').value=String(example);zoom=1;await render();
 }
 let renderVersion=0,renderTask=null;
 async function render(){
  const version=++renderVersion;if(renderTask){renderTask.cancel();try{await renderTask.promise;}catch(_){}}
  const pg=await doc.getPage(currentPage());if(version!==renderVersion)return;
  const raw=pg.getViewport({scale:1}),width=Math.max(250,$('rtViewport').clientWidth-24),vp=pg.getViewport({scale:width/raw.width*zoom});
  const ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(2800000/(vp.width*vp.height)));
  const canvas=$('rtCanvas');canvas.width=Math.ceil(vp.width*ratio);canvas.height=Math.ceil(vp.height*ratio);canvas.style.width=vp.width+'px';canvas.style.height=vp.height+'px';$('rtCanvasBox').style.width=vp.width+'px';
  renderTask=pg.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:vp,transform:[ratio,0,0,ratio,0,0]});
  try{await renderTask.promise;}catch(e){if(e.name!=='RenderingCancelledException')throw e;}
  if(version===renderVersion){renderTask=null;paint();}
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
  if(!workerPromise)workerPromise=(async()=>{
   if(!window.Tesseract){
    if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('vendor/tesseract/tesseract.min.js',base);s.onload=resolve;s.onerror=()=>reject(Error('Bildläsningens filer kunde inte laddas.'));document.head.append(s);}).catch(e=>{libraryPromise=null;throw e;});
    await libraryPromise;
   }
   return Tesseract.createWorker('eng',1,{workerPath:new URL('vendor/tesseract/worker.min.js',base).href,corePath:new URL('vendor/tesseract/tesseract-core-lstm.wasm.js',base).href,langPath:new URL('vendor/tesseract/lang/',base).href,cachePath:'tillsyno-read-test-v1',workerBlobURL:false,gzip:true,logger:m=>{if(m.status==='recognizing text')status('Bildläser valt område… '+Math.round(m.progress*100)+'%');}});
  })().catch(e=>{workerPromise=null;throw e;});
  return workerPromise;
 }
 async function release(){const p=workerPromise;workerPromise=null;if(p)try{await(await p).terminate();}catch(_){}}
 async function recognize(worker,canvas){
  let timer;
  try{return await Promise.race([worker.recognize(canvas),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bildläsningen tog för lång tid. Prova ett mindre tabellområde eller justera markeringen.')),45000);})]);}
  finally{clearTimeout(timer);}
 }
 async function readRegion(pg,rect,kind){
  const vp=pg.getViewport({scale:1}),tc=await pg.getTextContent(),words=[];
  for(const item of tc.items){
   if(!item.str?.trim())continue;const [x,y]=vp.convertToViewportPoint(item.transform[4],item.transform[5]);
   if(x>=rect.x*vp.width&&x<(rect.x+rect.w)*vp.width&&y>=rect.y*vp.height&&y<=(rect.y+rect.h)*vp.height)words.push({text:item.str,x,y,h:Math.max(1,item.height||Math.abs(item.transform[3]))});
  }
  const native=groupWords(words);
  // Rasterize the selected area as well: scanned rows can coexist with native text.
  // The complete visible table is read, rather than just its native PDF labels.
  const scale=Math.min(kind==='code'?4:2.5,Math.sqrt(2800000/(vp.width*rect.w*vp.height*rect.h))),view=pg.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(rect.w*view.width));canvas.height=Math.max(1,Math.ceil(rect.h*view.height));
  try{
   const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   await pg.render({canvasContext:ctx,viewport:view,transform:[1,0,0,1,-rect.x*view.width,-rect.y*view.height],annotationMode:0}).promise;
   status(kind==='code'?'Bildläser kodområdet…':'Bildläser hela tabellen…');
   const worker=await localWorker();await worker.setParameters({tessedit_pageseg_mode:kind==='code'?7:6,preserve_interword_spaces:'1'});
   let data;
   if(kind==='table'&&canvas.height>700){
    const collected=[],confidences=[];
    for(let top=0;top<canvas.height;top+=400){
     const tile=document.createElement('canvas');tile.width=canvas.width;tile.height=Math.min(480,canvas.height-top);tile.getContext('2d').drawImage(canvas,0,top,canvas.width,tile.height,0,0,canvas.width,tile.height);
     try{const result=await recognize(worker,tile);for(const w of result.data.words||[]){const middle=(w.bbox.y0+w.bbox.y1)/2;if(top>0&&middle<=40)continue;if(top+tile.height<canvas.height&&middle>tile.height-40)continue;collected.push({...w,bbox:{...w.bbox,y0:w.bbox.y0+top,y1:w.bbox.y1+top}});}confidences.push(result.data.confidence);}finally{tile.width=tile.height=1;}
    }
    data={words:collected,confidence:confidences.reduce((a,b)=>a+b,0)/Math.max(1,confidences.length),text:''};
   }else ({data}=await recognize(worker,canvas));
   const ocr=kind==='code'?clean(data.text):groupWords((data.words||[]).map(w=>({text:w.text,x:w.bbox.x0,y:w.bbox.y0,h:w.bbox.y1-w.bbox.y0})))||String(data.text||'').trim();
   if(kind==='code'){
    const nativeIds=candidates(native),ocrIds=data.confidence>=75?candidates(ocr):[];
    const ids=[...new Set([...nativeIds,...ocrIds])];
    return {text:ocr||native,native,ids,method:nativeIds.length?'PDF-text och lokal bildläsning':'Lokal bildläsning',confidence:data.confidence};
   }
   return {text:ocr||native,native,method:'Lokal bildläsning av hela tabellen',confidence:data.confidence};
  }finally{canvas.width=canvas.height=1;}
 }
 function updateMatchCounts(){
  const selected=matchRun?.hits.filter(h=>h.selected!==false)||[];
  const summary=$('rtMatchCount');if(summary)summary.textContent=selected.length+' valda träffar på ritningen';
  for(const [p,card]of Object.entries(prepared)){
   const hint=document.querySelector('.rtMatchHint[data-page="'+p+'"]'),count=selected.filter(h=>h.code===card.code).length;
   if(hint)hint.textContent=matchRun?count+' valda stämplar med beteckningen '+card.code+'.':'Sök stämplar för att kontrollera kopplingen till ritningen.';
  }
  validatePrepared();
 }
 function renderMatches(){
  const root=$('rtDrawingResults');root.replaceChildren();if(!matchRun)return;
  const heading=document.createElement('h3');heading.id='rtMatchCount';root.append(heading);
  const help=document.createElement('p');help.textContent=matchRun.hits.length?'Tryck Visa för att kontrollera placeringen. Avmarkera felaktiga träffar.':'Inga stämplar hittades. Markera en exempelstämpel på ritningen och sök igen. Fortsätter du utan träffar skapas inga automatiska kopplingar.';root.append(help);
  const list=document.createElement('div');list.className='rtMatchList';root.append(list);
  matchRun.hits.forEach((hit,i)=>{
   const row=document.createElement('div');row.className='rtMatchRow';
   const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=hit.selected!==false;check.setAttribute('aria-label','Ta med '+hit.code+' sida '+hit.page+' träff '+(i+1));
   check.onchange=()=>{hit.selected=check.checked;$('rtMatchApproval').checked=false;updateMatchCounts();};
   label.append(check,document.createTextNode(hit.code+' · sida '+hit.page));
   const button=document.createElement('button');button.type='button';button.textContent='Visa';button.setAttribute('aria-label','Visa '+hit.code+' sida '+hit.page+' träff '+(i+1));
   button.onclick=async()=>{drawingPage=hit.page;focusedHit=hit;setMode('stamp');await render();const box=$('rtHitRect');if(!box.hidden)box.scrollIntoView({block:'center',inline:'center',behavior:'instant'});};row.append(label,button);list.append(row);
  });
  $('rtMatchApproval').disabled=busy;updateMatchCounts();
 }
 async function findDrawing(version){
  const pages=parsePages($('rtPages').value,doc.numPages),codes=pages.map(p=>prepared[p]?.code);
  if(codes.some(c=>!norm(c)))throw Error('Välj en giltig beteckning för varje kort först.');
  if(drawingSample&&!validRect(drawingSample.rect))throw Error('Markera hela exempelstämpeln på ritningen först.');
  invalidateMatches();
  const result=await window.SmartMatchReadMatcher.scan({pdf:doc,cardPages:pages,codes,sample:drawingSample,getWorker:localWorker,recognize,onProgress:status,cancelled:()=>version!==cancelVersion});
  if(version!==cancelVersion)return;matchRun=result;renderMatches();status('Sökningen är klar. Granska träffarna och kryssa i bekräftelsen före start.');
 }
 async function searchDrawing(){
  if(busy||!confirmed)return;const version=cancelVersion;lock(true);
  try{await findDrawing(version);}catch(e){if(version===cancelVersion)status(e.message||String(e));}
  finally{await release();if(version===cancelVersion)lock(false);}
 }
 async function preview(){
  if(busy)return;const version=cancelVersion;
  try{
   if(!validRect(rects.code)||!validRect(rects.table))throw Error('Markera både kodområdet och hela tabellen först.');
   const pages=parsePages($('rtPages').value,doc.numPages);lock(true);prepared={};invalidateMatches();$('rtResults').replaceChildren();confirmed=false;
   for(const p of pages){
    status('Provläser dörrkort sida '+p+' av '+doc.numPages+'…');const pg=await doc.getPage(p),codeRead=await readRegion(pg,rects.code,'code');
    if(version!==cancelVersion)return;
    const tableRead=await readRegion(pg,rects.table,'table');if(version!==cancelVersion)return;
    const code=codeRead.ids.length===1?codeRead.ids[0]:'';
    const card={code,header:codeRead.text,rawTable:tableRead.text,work:workRows(tableRead.text),method:tableRead.method,confidence:tableRead.confidence,choices:codeRead.ids};prepared[p]=card;renderResult(p,card);
   }
   confirmed=true;populateStampCodes();validatePrepared();
   if(pages.every(p=>norm(prepared[p]?.code)))await findDrawing(version);
   else status('Provläsningen är klar. Välj rätt beteckning för varje kort och tryck Sök stämplar.');
  }catch(e){if(version===cancelVersion)status(e.message||String(e));}
  finally{await release();if(version===cancelVersion)lock(false);}
 }
 function validatePrepared(){
  try{const pages=parsePages($('rtPages').value,doc.numPages);$('rtStart').disabled=busy||!confirmed||!matchRun||!$('rtMatchApproval').checked||pages.some(p=>!prepared[p]||!norm(prepared[p].code));}
  catch(_){$('rtStart').disabled=true;}
 }
 function renderResult(p,card){
  const panel=document.createElement('section');panel.className='rtResult';panel.dataset.page=p;
  const h=document.createElement('h3');h.textContent='Dörrkort · sida '+p;panel.append(h);
  const read=document.createElement('p');read.className='rtReadText';read.textContent='Avläst: '+(card.header||'Ingen säker beteckning');panel.append(read);
  const label=document.createElement('label');label.textContent='Beteckning att matcha';const input=document.createElement('input');input.value=card.code;input.disabled=busy;input.setAttribute('aria-label','Beteckning sida '+p);label.append(input);panel.append(label);
  const hint=document.createElement('p');hint.className='rtMatchHint';hint.dataset.page=p;
  hint.textContent=card.choices.length>1&&!card.code?'Flera möjliga beteckningar: '+card.choices.join(', ')+'. Välj vilken som gäller.':'Sök stämplar för att kontrollera kopplingen till ritningen.';
  input.oninput=()=>{card.code=norm(input.value);invalidateMatches();populateStampCodes();validatePrepared();};panel.append(hint);
  const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Hela avlästa tabellen';pre.textContent=card.rawTable||'Ingen text kunde läsas. Lägg till arbetsrader manuellt eller justera markeringen.';details.append(summary,pre);panel.append(details);
  const workLabel=document.createElement('label');workLabel.textContent='Arbetsrader · en uppgift per rad';const area=document.createElement('textarea');area.rows=6;area.value=card.work.join('\n');area.setAttribute('aria-label','Arbetsrader sida '+p);area.oninput=()=>{card.work=area.value.split('\n').map(clean).filter(Boolean);};workLabel.append(area);panel.append(workLabel);
  const note=document.createElement('small');note.textContent='Kontrollera arbetsraderna. Dessa får var sin Klar-ruta för varje enskild stämpel.';panel.append(note);$('rtResults').append(panel);
 }
 function start(){
  if(busy||!confirmed||!matchRun||!$('rtMatchApproval').checked)return;
  try{
   const pages=parsePages($('rtPages').value,doc.numPages);
   if(pages.some(p=>!prepared[p]?.code))throw Error('Välj en giltig beteckning för varje kort.');
   active={schema:1,sourceId,rects:clone(rects),pages,cards:clone(prepared),checks:clone(preparedChecks),matching:clone(matchRun),drawingSample:drawingSample?clone(drawingSample):null,name:clean($('rtName').value)||'Egen läsmall'};
   if($('rtSaveTemplate').checked){
    const saved=templates(),item={name:active.name,rects:clone(rects)};const i=saved.findIndex(t=>t.name===item.name);if(i>=0)saved[i]=item;else saved.push(item);
    try{localStorage.setItem(templatesKey,JSON.stringify(saved));}catch(_){status('Mallen kunde inte sparas på enheten. Projektets val används ändå.');}
   }
   remember();finish(true);
  }catch(e){status(e.message);}
 }
 function finish(value){if(!resolveChoice)return;cancelVersion++;const resolve=resolveChoice;resolveChoice=null;ui.close();void release();resolve(value);}
 async function beforeAnalyze(file,options={}){
  if(opening)return false;opening=true;let candidate=null;
  try{
   const bytes=new Uint8Array(await file.arrayBuffer());sourceId=await sourceHash(bytes);
   try{candidate=JSON.parse(localStorage.getItem('tillsyno-read-test-source:'+sourceId)||'null');}catch(_){}
   if(!validData(candidate))candidate=await embedded(bytes);
   if(options.cachedResume&&validData(candidate)){active=clone(candidate);active.sourceId=sourceId;return true;}
   makeUI();doc=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
   rects=validData(candidate)?clone(candidate.rects):{};prepared=validData(candidate)?clone(candidate.cards):{};confirmed=validData(candidate);preparedChecks=clone(candidate?.checks||{});
   view='card';drawingPage=candidate?.drawingSample?.page||1;drawingSample=validData(candidate)&&validRect(candidate?.drawingSample?.rect)?clone(candidate.drawingSample):null;matchRun=validData(candidate)&&candidate.matching?clone(candidate.matching):null;focusedHit=null;
   example=candidate?.pages?.[0]||Math.min(2,doc.numPages);zoom=1;gesture=null;busy=false;cancelVersion++;
   $('rtPage').value=String(example);$('rtPage').max=String(doc.numPages);$('rtPageCount').textContent='av '+doc.numPages;$('rtPages').value=candidate?.pages?.join(', ')||String(example);$('rtName').value=candidate?.name||'';
   const select=$('rtTemplate');select.replaceChildren(new Option('Ny markering',''));templates().forEach((t,i)=>select.add(new Option(t.name,String(i))));
   $('rtResults').replaceChildren();for(const [p,card]of Object.entries(prepared))renderResult(Number(p),card);
   populateStampCodes();renderMatches();$('rtMatchApproval').checked=!!matchRun;
   coordinates();setMode('code');lock(false);status(confirmed?'Sparad avläsning hittad. Granska träffarna eller justera och sök igen.':'Välj exempelsida. Markera kodområdet och hela tabellen, och ange vilka sidor som är dörrkort.');
   const choice=new Promise(resolve=>{resolveChoice=resolve;});ui.showModal();await render();return await choice;
  }finally{
   opening=false;if(renderTask){renderTask.cancel();try{await renderTask.promise;}catch(_){}}
   if(doc){const old=doc;doc=null;await old.destroy();}
  }
 }
 async function openSettings(){
  const app=window.SmartMatchAppBridge,bytes=app?.getOriginalPdfBytes();
  if(!bytes?.length){app?.setStatus('Öppna en PDF med ritning och dörrkort först. Avläsningsvyn visas före skanningen.');return;}
  const file=new File([bytes],$('pwFileName').title||'Projekt.pdf',{type:'application/pdf'});
  if(await beforeAnalyze(file))await app.applyReadSettings();
 }
 function protocolDef(code,page){
  const card=active?.cards?.[page];if(!active?.pages.includes(Number(page))||card?.code!==code)return null;
  const lines=card.work.map((text,i)=>({key:rowKey(text,i),text,label:text,value:'',actionable:true,administrative:false}));
  return {code,page,lines,checks:lines};
 }
 function appendTable(root,code,page){
  const card=active?.cards?.[page];if(card?.code!==code)return;
  const details=document.createElement('details');details.className='rtTableUnderlay';const summary=document.createElement('summary');summary.textContent='Hela avlästa tabellen · eget läsområde';const pre=document.createElement('pre');pre.textContent=card.rawTable||'Ingen tabelltext kunde läsas.';details.append(summary,pre);root.append(details);
 }
 function workProgress(o){
  const page=window.SmartMatchAppBridge?.getDoorCardMapping()?.[o.code],def=protocolDef(o.code,page);
  if(!def)return null;
  const checks=active.checks?.[o.id]||{},total=def.lines.length,done=def.lines.filter(line=>checks[line.key]).length;
  return {done,total,percent:total?Math.round(done/total*100):0};
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
  appendTable(root,o.code,page);active.checks=active.checks||{};
  const caption=document.createElement('p');caption.className='rtInternalNote';caption.textContent='Arbetslista · endast i appen. Klar-markeringarna hör till den här dörren.';root.append(caption);
  const redraw=()=>{const state=workProgress(o);$('pwChecklistMeta').textContent=state.done+' av '+state.total+' klara';$('pwProtocolPercent').textContent=state.percent+'% arbete';$('pwProtocolBar').style.width=state.percent+'%';updateBadges();};
  for(const line of def.lines){
   const label=document.createElement('label');label.className='rtWorkRow';const check=document.createElement('input');check.type='checkbox';check.checked=!!active.checks[o.id]?.[line.key];check.setAttribute('aria-label','Klar: '+line.label);
   const text=document.createElement('span');text.textContent=line.label;const tag=document.createElement('strong');tag.textContent='Klar';label.append(check,text,tag);root.append(label);
   check.onchange=()=>{active.checks[o.id]=active.checks[o.id]||{};active.checks[o.id][line.key]=check.checked;remember();window.SmartMatchAppBridge.save();redraw();};
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
    await window.SmartMatchAppBridge.openReadFile(file);
   }catch(error){window.SmartMatchAppBridge.setStatus('PDF-filerna kunde inte öppnas: '+error.message);}
  });
  const markers=$('pwMarkers');if(markers)new MutationObserver(updateBadges).observe(markers,{childList:true});for(const id of ['rtOpenSettings','rtMenuSettings'])$(id)?.addEventListener('click',()=>{const menu=$('pwToolMenu');if(menu)menu.hidden=true;void openSettings().catch(e=>window.SmartMatchAppBridge?.setStatus(e.message));});});
 window.SmartMatchReadTest=Object.freeze({beforeAnalyze,openSettings,parsePages,candidates,isCardPage:p=>!!active?.pages.includes(p),identityForPage:p=>{const c=active?.cards?.[p];return c?{code:c.code,row:c.header,area:'known-layout-card-heading',profileId:'user-selected-read-test-v1'}:null;},drawingSelection:()=>active?.matching?.version===2?{codes:[...new Set(Object.values(active.cards).map(c=>c.code))],positions:clone(active.matching.hits.filter(h=>h.selected!==false))}:null,protocolDef,appendTable,renderWork,payload:()=>active?clone(active):null});
})();
