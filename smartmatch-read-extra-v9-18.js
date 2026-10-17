/* Sample-first stamp links, isolated TEST 9.18. Original card names stay intact. */
(()=>{
 'use strict';
 const base=new URL('./',document.currentScript.src),$=id=>document.getElementById(id);
 const clone=value=>JSON.parse(JSON.stringify(value));
 const bridge=()=>window.SmartMatchAppBridge;
 const matcher=()=>window.SmartMatchReadMatcher;
 const key=value=>matcher()?.key(value)||String(value||'').normalize('NFC').toUpperCase().replace(/[\s/_.–—−-]+/g,'');
 const clean=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim();
 const nav=typeof navigator==='object'&&navigator?navigator:{},ua=nav.userAgent||'',platform=nav.platform||'';
 // iPadOS 13+ normally identifies itself as Macintosh. A real Mac does not
 // expose several touch points, so use both signals instead of viewport width.
 const IS_IPAD=/iPad/i.test(ua)||(/Macintosh|MacIntel/i.test(ua+' '+platform)&&(nav.maxTouchPoints||0)>1);
 const IPAD_IMAGE_LIMITS=Object.freeze({minScale:1.15,maxScale:2.2,baseScale:1.5,maxRasterPixels:12000000,tileSize:640,tileStep:560,maxTilePixels:410000,sampleMaxPixels:700000,sampleMaxScale:3.5,appearanceMaxPixels:90000,appearanceMaxSide:1200,appearanceMaxScale:4});
 let ui=null,sample=null,result=null,source=null,scanVersion=0,busy=false,renderTask=null,workerPromise=null,workerTermination=Promise.resolve(),libraryPromise=null;
 let progress=null,previewVersion=0,lastCardPage=0,previewTask=null,cancellable=false;
 const abortRejectors=new Set();
 const metadataCache=new WeakMap(),nativeCache=new WeakMap();
 const manualCardNames=new Map();
 const frame=()=>new Promise(resolve=>setTimeout(resolve,0));
 const validRect=r=>r&&[r.x,r.y,r.w,r.h].every(Number.isFinite)&&r.w>0&&r.h>0&&r.x>=0&&r.y>=0&&r.x+r.w<=1.001&&r.y+r.h<=1.001;
 function message(text,error=false){if(!$('exStatus'))return;$('exStatus').textContent=text;$('exStatus').style.color=error?'var(--ta-danger,#b91c1c)':'';}
 function pauseDrawingDetail(value){try{bridge()?.setDrawingDetailPaused?.(!!value,'extra-stamp-search');}catch(_){}}
 function releasePage(pg){if(IS_IPAD&&pg)nativeCache.delete(pg);try{pg?.cleanup?.();}catch(_){}}
 function clearCardPreview(){previewVersion++;previewTask?.cancel?.();previewTask=null;const canvas=$('exCardPreview');if(canvas){canvas.hidden=true;canvas.width=canvas.height=0;}}
 function check(version){if(version!==scanVersion||!source||bridge()?.getPdf()!==source)throw Error('Sökningen avbröts.');}
 function sourceChanged(){return !source||source!==bridge()?.getPdf();}
 function duration(ms){return window.SmartMatchReadProgressV91?.formatDuration(ms)||Math.round(ms/1000)+' s';}
 function showProgress(value){
  $('exProgress').hidden=false;$('exProgressTitle').textContent=value.active?value.title:value.state==='cancelled'?'Sökningen avbröts':value.state==='error'?'Sökningen stoppades':'Det här arbetssteget är klart';
  let where=value.page?' · PDF-sida '+value.page:'';
  if(value.pageIndex&&value.pageCount)where+=' ('+value.pageIndex+' av '+value.pageCount+' ritningssidor)';
  const count=value.done!==null&&value.total!==null?' · '+value.done+' av '+value.total+(value.unit==='area'?' områden':value.unit==='candidate'?' träffar':' sidor'):'';
  $('exProgressDetail').textContent=value.message||((value.label||'Förbereder sökningen')+where+count);
  const meter=$('exProgressMeter');if(value.percent===null)meter.removeAttribute('value');else meter.value=value.percent;
  $('exProgressPercent').textContent=value.percent===null?'Beräknar arbetet i detta steg…':Math.floor(value.percent)+' % av detta steg';
  $('exProgressTime').textContent='Förfluten tid: '+duration(value.elapsedMs)+(value.active?(value.remainingMs===null?' · Återstående tid beräknas efter fler färdiga delar.':' · Cirka '+duration(value.remainingMs)+' kvar i detta steg.'):'');
  $('exProgressOcr').textContent=value.active&&value.localPercent!==null?'Bildläsning av aktuellt område: '+Math.round(value.localPercent)+' %':'';
 }
 function detail(info){progress?.update(info);}
 function setBusy(value,canCancel=false){
  busy=value;cancellable=value&&canCancel;for(const id of ['exMarkSample','exReadSampleImage','exCode','exCardCode','exCardIdentity','exMode','exSameColor','exLinkSelected','exSearch','exCardPage','exAppendFile','exAppendCards','exApply'])$(id).disabled=value;
  $('exCancelScan').hidden=!cancellable;$('exClose').disabled=value;
  if(!value){updateDirect();updateApply();}
 }
 function resetResult(){result=null;$('exHits').replaceChildren();$('exResultSummary').textContent='';updateApply();}
 function updateDirect(){if(!$('exLinkSelected'))return;$('exLinkSelected').disabled=busy||!sample||sourceChanged()||!clean($('exCode').value)||!clean($('exCardCode').value)||!Number($('exCardPage').value);}
 function updateApply(){if(!$('exApply'))return;$('exApply').textContent=result?.directOnly?'Bekräfta kopplingen':'Lägg till valda kopplingar';$('exApply').disabled=busy||!result||!result.hits.some(hit=>hit.status!=='linked'&&hit.selected!==false)||!Number($('exCardPage').value);}
 function ensureUi(){
  if(ui)return;
  ui=document.createElement('dialog');ui.id='exDialog';ui.className='rtDialog exDialog';
  ui.setAttribute('aria-labelledby','exTitle');
  ui.innerHTML=`<form method="dialog" class="exShell">
   <div class="exHeader"><h2 id="exTitle">Koppla stämplar · TEST 9.18</h2><button type="button" id="exClose" aria-label="Stäng lägg till kopplingar">Stäng</button></div>
   <p>Komplettera ett öppet projekt. Befintliga positioner och avprickningar behålls.</p>
   <ol class="exSteps"><li>Markera en fyrkant runt hela exempelstämpeln, inklusive färgad bakgrund.</li><li>Kontrollera hela den avlästa beteckningen och välj vilket dörrkort stämplarna ska öppna.</li><li>Sök efter likadana stämplar, granska träffarna och koppla dem tillsammans.</li></ol>
   <section id="exCardSection"><h3>2. Välj dörrkort</h3><label for="exCardPage">Dörrkortssida som ska öppnas</label><select id="exCardPage"><option value="">Välj sida…</option></select>
   <label for="exCardIdentity" id="exCardIdentityLabel" hidden>Välj dörrkort på sidan</label><select id="exCardIdentity" hidden></select>
   <label for="exCardCode">Dörrkortets ursprungliga beteckning</label><input id="exCardCode" autocomplete="off" maxlength="100" placeholder="Till exempel DBL"><p id="exCardCodeInfo" class="exHint">Välj en kortsida. Beteckningen hämtas från det avlästa dörrkortet.</p>
   <canvas id="exCardPreview" aria-label="Förhandsvisning av vald dörrkortssida" hidden></canvas>
   <details><summary>Saknas dörrkortet i filen?</summary><p>Lägg till en PDF med de saknade dörrkorten. De läggs till i projektet utan att befintliga positioner läses om.</p><input type="file" id="exAppendFile" accept="application/pdf,.pdf" multiple><button type="button" id="exAppendCards">Lägg till valda PDF-filer</button></details></section>
   <section id="exSampleSection"><h3>1. Markera en exempelstämpel</h3><button type="button" id="exMarkSample">Markera hela stämpeln på ritningen</button><p id="exSampleInfo">Ingen exempelstämpel markerad.</p><button type="button" id="exReadSampleImage">Läs bara exemplet som bild</button><p class="exHint">Använd bildläsning av den lilla markeringen om stämpeln saknar sökbar text.</p>
   <label for="exCode">Beteckning på ritningen</label><input id="exCode" autocomplete="off" maxlength="100" placeholder="Till exempel DBL-1 eller GS 23"><p class="exHint">Skriv hela beteckningen som faktiskt står på ritningen. Mellanslag och bindestreck jämnas ut; DBL matchar inte DBL-DS. Dörrkortets namn ändras inte.</p>
   <div class="exChoice"><label for="exMode">Söksätt</label><select id="exMode"><option value="text">Snabb sökning – PDF-stämplar och text</option><option value="full">Sök även i bilder – tar längre tid</option></select></div>
   <label class="exCheck"><input type="checkbox" id="exSameColor" checked> Bara samma stämpelutseende som exemplet</label><p id="exColorInfo">Bakgrundsfärg och form kontrolleras när du markerar exemplet. Vanlig rumstext väljs bort.</p></section>
   <p id="exMappingPreview" role="status">Välj dörrkort och ange beteckningen på ritningen.</p>
   <aside id="exIpadInfo" class="exIpadInfo" hidden><strong>iPad-läge</strong><p>Snabb textsökning är förvald. En full bildsökning begränsas till ritningssidan där du markerade exemplet för att Safari inte ska starta om. Om du redan ser den missade stämpeln använder du knappen nedan.</p></aside>
   <button type="button" id="exLinkSelected">Koppla bara markerad stämpel</button><p class="exHint">Skapar först en granskningsrad för exakt din markering. Ingen sökning körs över resten av ritningen.</p>
   <button type="button" id="exSearch">3. Sök på ritningen</button>
   <section id="exProgress" hidden aria-live="polite"><strong id="exProgressTitle"></strong><p id="exProgressDetail"></p><progress id="exProgressMeter" max="100"></progress><p id="exProgressPercent"></p><p id="exProgressTime"></p><p id="exProgressOcr"></p><button type="button" id="exCancelScan" hidden>Avbryt sökningen</button></section>
   <p id="exStatus" role="status"></p><section><h3>4. Granska och lägg till</h3><p id="exResultSummary"></p><div id="exHits"></div><button type="button" id="exApply" disabled>Lägg till valda kopplingar</button><p class="exHint">Spara sedan projekt-PDF för att behålla de nya kopplingarna i filen.</p></section>
  </form>`;
  document.body.append(ui);$('exCardSection').before($('exSampleSection'));ui.querySelector('form').addEventListener('submit',event=>event.preventDefault());
  const style=document.createElement('style');style.textContent=`.exDialog{box-sizing:border-box;width:min(780px,96vw);max-height:94dvh;padding:0;border:1px solid #cbd5e1;border-radius:16px;color:var(--ta-ink,#172033);background:var(--ta-card,#fff)}.exDialog::backdrop{background:#12203799}.exShell{padding:18px;display:grid;gap:14px}.exHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}.exHeader h2{margin:0}.exShell section{border-top:1px solid #e2e8f0;padding-top:12px}.exShell h3{font-size:1.05rem;margin:0 0 10px}.exShell p{margin:6px 0;line-height:1.45}.exShell input:not([type=checkbox]),.exShell select{display:block;box-sizing:border-box;width:100%;min-height:40px;margin:6px 0;padding:8px}.exShell button{min-height:44px;padding:8px 12px;border:1px solid #94a3b8;border-radius:9px;background:var(--ta-soft2,#f8fafc);color:var(--ta-ink,#172033);font:inherit;cursor:pointer}.exShell button:disabled{opacity:.55;cursor:default}.exShell #exSearch,.exShell #exApply{background:#075985;color:white}.exHint{font-size:.88rem;color:#475569}.exCheck{display:flex;align-items:center;gap:9px}.exSteps{margin:0;padding-left:24px;line-height:1.65}.exChoice{margin-top:8px}#exCardPreview{display:block;max-width:100%;max-height:260px;margin:10px auto;border:1px solid #cbd5e1}#exCardPreview[hidden]{display:none}#exProgress{background:var(--ta-soft2,#f0f9ff);border:1px solid #7dd3fc;padding:12px;border-radius:10px}#exProgressMeter{width:100%}.exHit{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #e2e8f0}.exHit label{display:flex;gap:8px;flex:1;align-items:center}.exHit small{display:block;color:#475569}.exHit button{flex-shrink:0}@media(max-width:600px){.exDialog{width:98vw;max-height:96dvh}.exShell{padding:12px}.exHeader h2{font-size:1.1rem}}`;
  // The shared reader stylesheet is linked in the body and can load after this
  // tool. Scope these overrides strongly enough to retain compact row controls.
  style.textContent+=`.rtDialog.exDialog{width:min(780px,96vw);height:auto;max-height:94dvh;padding:0;background:var(--ta-card,#fff);color:var(--ta-ink,#172033)}.rtDialog.exDialog button{min-height:44px;background:var(--ta-soft2,#f8fafc);color:var(--ta-ink,#172033)}.rtDialog.exDialog input,.rtDialog.exDialog select{background:var(--ta-card,#fff);color:var(--ta-ink,#172033);min-height:44px}.rtDialog.exDialog .exCheck,.rtDialog.exDialog .exHit label{flex-direction:row;align-items:center;gap:9px}.rtDialog.exDialog input[type=checkbox]{width:22px;height:22px;min-height:22px;flex:none;margin:0;padding:0;accent-color:#075985}.rtDialog.exDialog #exSearch,.rtDialog.exDialog #exApply{background:#075985;color:white}@media(max-width:600px){.rtDialog.exDialog{width:98vw;max-height:96dvh}}`;
  style.textContent+=`.rtDialog.exDialog .exHit label{min-height:44px}.rtDialog.exDialog .exHit>label>span{min-width:0;font-size:15px;line-height:1.35;overflow-wrap:anywhere}.rtDialog.exDialog .exHit small{font-size:13px;line-height:1.35}`;
  style.textContent+=`.exShell [hidden]{display:none!important}#exMappingPreview{padding:10px;border:1px solid #7dd3fc;border-radius:8px;background:var(--ta-soft2,#f0f9ff)}.exIpadInfo{padding:10px;border:1px solid #fbbf24;border-radius:8px;background:#fffbeb;color:#713f12}.exShell #exLinkSelected{background:#166534;color:white}`;
  document.head.append(style);
  $('exClose').onclick=close;$('exCancelScan').onclick=cancel;
  ui.addEventListener('cancel',event=>{event.preventDefault();if(busy)cancel();else close();});
  $('exMarkSample').onclick=mark;$('exReadSampleImage').onclick=()=>void readSampleImage();$('exLinkSelected').onclick=()=>void linkSelected();$('exSearch').onclick=()=>void search();$('exApply').onclick=()=>void apply();
  $('exCode').oninput=()=>{resetResult();refreshMappingChoice();updateDirect();};
  $('exCardCode').oninput=()=>{if(!$('exCardCode').readOnly)manualCardNames.set(Number($('exCardPage').value),clean($('exCardCode').value));resetResult();updateMappingPreview();updateDirect();};
  $('exCardIdentity').onchange=()=>{resetResult();$('exCardCode').value=$('exCardIdentity').value;updateMappingPreview();updateDirect();};
  $('exMode').onchange=resetResult;$('exSameColor').onchange=()=>{resetResult();updateColorInfo();};
  $('exCardPage').onchange=()=>{lastCardPage=Number($('exCardPage').value)||0;resetResult();refreshCardName();updateDirect();void previewCard();};
  $('exAppendCards').onclick=()=>void appendCards();
  if(IS_IPAD){$('exIpadInfo').hidden=false;$('exMode').value='text';$('exMode').querySelector('option[value="full"]').textContent='Bildsök bara markerad ritningssida – iPad-säkert';}
 }
 function pageOptions(preferred=0){
  const pdf=bridge()?.getPdf(),select=$('exCardPage'),known=new Set(bridge()?.getDoorCardPages?.()||[]),old=preferred||Number(select.value)||0;
  select.replaceChildren(new Option('Välj sida…',''));
  if(!pdf)return;
  const limit=Math.min(pdf.numPages,Number(bridge().getDrawingLimit?.())||pdf.numPages);
  // Existing/imported card pages can be after the original drawing limit.
  const numbers=[...new Set([...Array.from({length:limit},(_,i)=>i+1),...known])].filter(n=>n>=1&&n<=pdf.numPages).sort((a,b)=>a-b);
  for(const n of numbers){const names=cardNames(n);select.add(new Option('Sida '+n+(names.length?' · '+names.join(' / '):known.has(n)?' · känt dörrkort':''),String(n)));}
  if(numbers.includes(old))select.value=String(old);else select.value='';
  refreshCardName();
 }
 function cardNames(page){
  const reader=window.SmartMatchReadTest;
  const names=reader?.getCardNames?.(Number(page));
  if(Array.isArray(names))return [...new Map(names.map(value=>{const text=clean(typeof value==='string'?value:value?.originalCardCode||value?.code);return [key(text),text];}).filter(([id,text])=>id&&text)).values()];
  const original=clean(reader?.getOriginalCardCode?.(Number(page))||'');return original?[original]:[];
 }
 function refreshCardName(){
  const page=Number($('exCardPage').value),names=cardNames(page),input=$('exCardCode'),choices=$('exCardIdentity'),previous=input.value;
  choices.replaceChildren();choices.hidden=$('exCardIdentityLabel').hidden=names.length<=1;
  if(names.length>1){choices.add(new Option('Välj kortets beteckning…',''));for(const name of names)choices.add(new Option(name,name));choices.value=names.includes(previous)?previous:'';input.value=choices.value;}
  else input.value=names[0]||manualCardNames.get(page)||'';
  input.readOnly=names.length>0;input.dataset.cardPage=String(page||'');
  $('exCardCodeInfo').textContent=!page?'Välj en kortsida. Beteckningen hämtas från det avlästa dörrkortet.':names.length>1?'Sidan innehåller flera avlästa kort. Välj rätt beteckning och kontrollera bilden.':names.length?'Namnet kommer från dörrkortet och behålls. Den valda kortsidan söks inte som ritning.':'Den här sidan saknar en avläst kortbeteckning. Kontrollera bilden och skriv dörrkortets ursprungliga namn här. Det är ett manuellt val.';
  updateMappingPreview();updateDirect();
 }
 function updateMappingPreview(){
  const drawingLabel=clean($('exCode').value),cardCode=clean($('exCardCode').value),page=Number($('exCardPage').value);
  $('exMappingPreview').textContent=drawingLabel&&cardCode&&page?'Koppling att granska: '+drawingLabel+' på ritningen → '+cardCode+' · dörrkort sida '+page+'. Dörrkortets namn behålls.':'Välj dörrkort och ange beteckningen på ritningen.';
 }
 function refreshMappingChoice(){
  const mapping=bridge()?.getDoorCardMapping?.()||{},code=key($('exCode').value),entry=Object.entries(mapping).find(([label])=>key(label)===code);
  // Once the user chooses a card, changing the drawing label must never pick
  // another card silently. The existing conflict guard handles old mappings.
  if(!Number($('exCardPage').value)&&entry&&Number(entry[1])){$('exCardPage').value=String(entry[1]);lastCardPage=Number(entry[1]);refreshCardName();void previewCard();}
  updateMappingPreview();
 }
 async function open(options={}){
  ensureUi();if(busy)return;
  const pdf=bridge()?.getPdf();if(!pdf){bridge()?.setStatus?.('Öppna ett kopplat projekt först.');return;}
  if(source!==pdf){sample=window.SmartMatchReadTest?.getDrawingSample?.()||null;result=null;source=pdf;lastCardPage=0;manualCardNames.clear();clearCardPreview();$('exCode').value=sample?.code||'';$('exSampleInfo').textContent=sample?'Sparat stämpelexempel på PDF-sida '+sample.page+'.':'Ingen exempelstämpel markerad.';$('exSameColor').checked=sample?.appearance?.enabled!==false;resetResult();updateColorInfo();}
  pageOptions(lastCardPage);refreshMappingChoice();if(IS_IPAD&&!result)$('exMode').value='text';updateDirect();if(!ui.open)ui.showModal();if(Number($('exCardPage').value))void previewCard();message(result?'Granska träffarna och lägg till de kopplingar du valt.':IS_IPAD?'iPad-läge är aktivt. Markera stämpeln och använd gärna Koppla bara markerad stämpel.':'Markera först hela exempelstämpeln. Välj sedan dörrkortet.');
  if(options.markFirst!==false)mark();
 }
 function close(){if(busy){cancel();return;}bridge()?.cancelReadSample?.();clearCardPreview();void releaseWorker();pauseDrawingDetail(false);if(ui?.open)ui.close();}
 function mark(){
  if(busy)return;
  if(typeof bridge()?.beginReadSample!=='function'){message('Markeringsverktyget är inte tillgängligt. Ladda om TEST 9.18.',true);return;}
  source=bridge().getPdf();if(ui.open)ui.close();
  try{bridge().beginReadSample(value=>{if(!value){if(!ui.open)ui.showModal();message('Markeringen avbröts.');return;}void setSample(value);});}
  catch(error){if(!ui.open)ui.showModal();message(error.message||'Visa en ritningssida i huvudvyn innan du markerar beteckningen.',true);}
 }
 async function nativeWords(pg){
  if(!nativeCache.has(pg))nativeCache.set(pg,(async()=>{
   const vp=pg.getViewport({scale:1}),content=window.SmartMatchReadText.joinNativeContent(await pg.getTextContent());
   const words=content.items.filter(item=>item.str?.trim()).map(item=>{
    const x=item.transform[4],y=item.transform[5],h=Math.max(item.height||0,Math.hypot(item.transform[2],item.transform[3]),1),r=vp.convertToViewportRectangle([x,y-h*.25,x+Math.max(item.width||1,1),y+h*.95]);
    return {text:item.str,x:Math.min(r[0],r[2])/vp.width,y:Math.min(r[1],r[3])/vp.height,w:Math.abs(r[2]-r[0])/vp.width,h:Math.abs(r[3]-r[1])/vp.height,confidence:100};
   });return {vp,words,content};
  })());return nativeCache.get(pg);
 }
 function inRect(word,r){const x=word.x+word.w/2,y=word.y+word.h/2;return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;}
 function textOf(words){
  const rows=[];for(const w of words.slice().sort((a,b)=>a.y-b.y||a.x-b.x)){let row=rows.find(r=>Math.abs(r.y-w.y)<=Math.max(.002,Math.min(r.h,w.h)*.55));if(!row){row={y:w.y,h:w.h,words:[]};rows.push(row);}row.words.push(w);}
  return rows.map(row=>row.words.sort((a,b)=>a.x-b.x).map(w=>w.text).join(' ')).join(' ');
 }
 async function crop(pg,rect,maxPixels=500000,scaleLimit=5,version=scanVersion){
  check(version);const vp1=pg.getViewport({scale:1}),scale=Math.min(scaleLimit,Math.sqrt(maxPixels/Math.max(1,rect.w*vp1.width*rect.h*vp1.height))),vp=pg.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(vp.width*rect.w));canvas.height=Math.max(1,Math.ceil(vp.height*rect.h));
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  const task=pg.render({canvasContext:ctx,viewport:vp,transform:[1,0,0,1,-rect.x*vp.width,-rect.y*vp.height]});renderTask=task;
  try{await abortable(task.promise,version);check(version);return canvas;}catch(error){canvas.width=canvas.height=0;throw error;}finally{if(renderTask===task)renderTask=null;}
 }
 const hueDistance=(a,b)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
 function pixelProfile(image){
  const bins=Array.from({length:30},()=>({count:0,r:0,g:0,b:0}));let neutral=0,colored=0;
  const data=image.data||image;
  for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,luma=.2126*r+.7152*g+.0722*b;if(luma>210||max>245&&min>210)continue;
   if(delta<35||delta/Math.max(max,1)<.22){if(max<165)neutral++;continue;}
   let h=max===r?60*((g-b)/delta%6):max===g?60*((b-r)/delta+2):60*((r-g)/delta+4);if(h<0)h+=360;
   const bin=bins[Math.floor(h/12)%30];bin.count++;bin.r+=r;bin.g+=g;bin.b+=b;colored++;
  }
  if(neutral+colored<8)return {kind:'unknown',reason:'För få tydliga textpixlar i markeringen.'};
  if(colored<8||colored/(neutral+colored)<.08)return {kind:'black',label:'svart/grå text',neutral,colored};
  let best=null;
  for(let i=0;i<30;i++){const cluster={count:0,r:0,g:0,b:0,hue:(i+.5)*12};for(let j=0;j<30;j++)if(hueDistance(cluster.hue,(j+.5)*12)<=24){const b=bins[j];cluster.count+=b.count;cluster.r+=b.r;cluster.g+=b.g;cluster.b+=b.b;}if(!best||cluster.count>best.count)best=cluster;}
  if(best.count/colored<.65)return {kind:'unknown',reason:'Markeringen innehåller flera tydliga textfärger.'};
  const rgb=[best.r,best.g,best.b].map(v=>Math.round(v/best.count));
  const max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;let hue=max===rgb[0]?60*((rgb[1]-rgb[2])/d%6):max===rgb[1]?60*((rgb[2]-rgb[0])/d+2):60*((rgb[0]-rgb[1])/d+4);if(hue<0)hue+=360;
  const label=hue<20||hue>=340?'röd text':hue<55?'orange text':hue<85?'gul text':hue<165?'grön text':hue<205?'turkos text':hue<265?'blå text':'lila text';
  return {kind:'color',hue,rgb,label,neutral,colored};
 }
 function colorSame(a,b){return a.kind==='black'?b.kind==='black':a.kind==='color'&&b.kind==='color'&&hueDistance(a.hue,b.hue)<=28;}
 function padded(rect,pad=.08){const dx=rect.w*pad,dy=rect.h*pad,x=Math.max(0,rect.x-dx),y=Math.max(0,rect.y-dy);return {x,y,w:Math.min(1,rect.x+rect.w+dx)-x,h:Math.min(1,rect.y+rect.h+dy)-y};}
 async function profileAt(pg,rect,version){const canvas=await crop(pg,padded(rect),400000,6,version);try{return pixelProfile(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height));}finally{canvas.width=canvas.height=0;}}
 function updateColorInfo(){
  const profile=sample?.appearance?.profile||sample?.background;
  $('exColorInfo').textContent=!$('exSameColor').checked?'Utseendekravet är avstängt. Även vanlig text med samma hela beteckning kan hittas.':profile?.kind==='unknown'?'Utseendet kunde inte bestämmas: '+profile.reason+' Markera runt hela den färgade stämpeln eller stäng själv av utseendekravet.':profile?'Exemplets utseende: '+profile.label+'. Vanlig text och stämplar med annan bakgrund eller form väljs bort.':'Bakgrundsfärg och form kontrolleras när du markerar exemplet.';
 }
 function boxOf(words){if(!words.length)return null;const x=Math.min(...words.map(w=>w.x)),y=Math.min(...words.map(w=>w.y));return {x,y,w:Math.max(...words.map(w=>w.x+w.w))-x,h:Math.max(...words.map(w=>w.y+w.h))-y};}
 async function metadataText(pg,rect,version){
  // Loading the source a second time through PDFLib is expensive on iPad.
  // PDF.js annotations on this one page are enough for the marked sample.
  let indexed=[];if(!IS_IPAD||typeof bridge()?.getReadStampIndex==='function')try{indexed=await annotationIndex(source,version);}catch(_){check(version);}
  const vp=pg.getViewport({scale:1}),annotations=[...indexed.filter(a=>a.page===sample.page),...await pg.getAnnotations()],values=[];
  for(const a of annotations){if(!Array.isArray(a.rect)||(Number(a.flags||a.annotationFlags||0)&35)!==0)continue;const r=vp.convertToViewportRectangle(a.rect),cx=(r[0]+r[2])/2/vp.width,cy=(r[1]+r[3])/2/vp.height;if(cx<rect.x||cx>rect.x+rect.w||cy<rect.y||cy>rect.y+rect.h)continue;for(const value of [a.subject,a.contentsObj?.str??a.contents])if(typeof value==='string'&&clean(value)&&clean(value).length<=100)values.push(clean(value));}
  const unique=[...new Map(values.map(value=>[key(value),value])).values()];return unique.length===1?unique[0]:'';
 }
 function learnAppearance(pg,words){
  const textBox=boxOf(words);sample.appearance=window.SmartMatchReadAppearanceV98?.learn(sample.background,sample.rect,textBox,pg.getViewport({scale:1}))||null;sample.textBox=textBox;
 }
 async function setSample(value){
  ensureUi();if(busy)return;
  const pdf=bridge()?.getPdf();if(!pdf||!value||!validRect(value.rect))return;
  const cards=new Set(bridge().getDoorCardPages?.()||[]),limit=Number(bridge().getDrawingLimit?.())||pdf.numPages;
  if(value.page<1||value.page>limit||cards.has(value.page)){if(!ui.open)ui.showModal();message('Markera exemplet på en ritningssida, inte på ett dörrkort.',true);return;}
  source=pdf;sample={page:Number(value.page),rect:clone(value.rect),appearance:null};resetResult();if(!ui.open)ui.showModal();pageOptions(lastCardPage);
  const version=++scanVersion;setBusy(true,true);pauseDrawingDetail(true);progress=window.SmartMatchReadProgressV91?.create({onUpdate:showProgress});progress?.start('Kontrollerar exempelstämpeln');detail({phase:'sample',label:'Läser hela beteckningen samt stämpelns bakgrund och form',page:sample.page,unit:'area',done:0,total:1});let pg=null;
  try{
   pg=await abortable(pdf.getPage(sample.page),version);const native=await abortable(nativeWords(pg),version);check(version);const words=native.words.filter(word=>inRect(word,sample.rect));
   const text=clean(textOf(words))||await metadataText(pg,sample.rect,version);if(text&&text.length<=100)$('exCode').value=text;else $('exCode').value='';
   sample.background=await window.SmartMatchReadAppearanceV98.renderProfile(pg,sample.rect,{cancelled:()=>version!==scanVersion,onRenderTask:task=>{renderTask=task;},limits:IS_IPAD?{maxPixels:90000,maxSide:1200,maxScale:4}:{},page:sample.page,onCanvasRelease:({canvas})=>{if(canvas){canvas.width=canvas.height=0;}}});check(version);learnAppearance(pg,words.length?words:text?[sample.rect]:[]);
   $('exSampleInfo').textContent='Markerat exempel på PDF-sida '+sample.page+'. '+(text?'Hela avlästa texten: '+text+'.':'Ingen sökbar text i markeringen. Välj Läs bara exemplet som bild eller skriv hela beteckningen.');
   updateColorInfo();refreshMappingChoice();updateDirect();detail({done:1,total:1});progress?.finish({message:'Exemplet är markerat. Kontrollera beteckningen och välj dörrkortet som ska öppnas.'});message(IS_IPAD?'Välj rätt dörrkort. Om det bara är den här missade stämpeln använder du Koppla bara markerad stämpel.':'Välj nu rätt dörrkort under steg 2. Sök sedan efter samma stämplar.');
  }catch(error){progress?.finish({state:version!==scanVersion?'cancelled':'error',message:error.message});message(error.message,true);}
  finally{if(IS_IPAD)releasePage(pg);pauseDrawingDetail(false);setBusy(false);}
 }
 async function readSampleImage(){
  if(busy)return;if(!sample||sourceChanged()){message('Markera först hela exempelstämpeln på ritningen.',true);return;}
  const version=++scanVersion;setBusy(true,true);pauseDrawingDetail(true);progress=window.SmartMatchReadProgressV91?.create({onUpdate:showProgress});progress?.start('Bildläser bara exempelstämpeln');detail({phase:'sample-image',page:sample.page,unit:'area',done:0,total:1,label:'Läser bara din lilla markering, inte hela ritningen'});let pg=null;
  try{pg=await source.getPage(sample.page);const canvas=await crop(pg,sample.rect,IS_IPAD?280000:500000,IS_IPAD?4:6,version);let data;try{const worker=await localWorker();await worker.setParameters({tessedit_pageseg_mode:7,preserve_interword_spaces:'1'});({data}=await recognize(worker,canvas));const words=(data.words||[]).filter(w=>w.text?.trim()).map(w=>({text:w.text,x:sample.rect.x+w.bbox.x0/canvas.width*sample.rect.w,y:sample.rect.y+w.bbox.y0/canvas.height*sample.rect.h,w:(w.bbox.x1-w.bbox.x0)/canvas.width*sample.rect.w,h:(w.bbox.y1-w.bbox.y0)/canvas.height*sample.rect.h}));const text=clean(textOf(words)||data.text);if(!text||text.length>100)throw Error('Hela beteckningen kunde inte läsas. Markera tätare eller skriv beteckningen själv.');$('exCode').value=text;learnAppearance(pg,words);sample.ocrText=text;resetResult();refreshMappingChoice();updateColorInfo();updateDirect();$('exSampleInfo').textContent='Bildläst exempel på PDF-sida '+sample.page+': '+text+'. Kontrollera alla bokstäver.';detail({done:1,total:1});progress?.finish({message:'Bara exempelstämpeln har bildlästs. Kontrollera beteckningen och välj dörrkort.'});message('Exemplet är läst. Välj Sök även i bilder endast om fler stämplar saknar PDF-text.');}finally{canvas.width=canvas.height=0;}}
  catch(error){progress?.finish({state:version!==scanVersion?'cancelled':'error',message:error.message});message(error.message,true);}finally{if(IS_IPAD)releasePage(pg);pauseDrawingDetail(false);await releaseWorker();setBusy(false);}
 }
 function abortable(promise,version,timeout=0){
  let rejectAbort,timer;const cancellation=new Promise((_,reject)=>{rejectAbort=()=>reject(Error('Sökningen avbröts.'));abortRejectors.add(rejectAbort);if(timeout)timer=setTimeout(()=>reject(Error('Bildläsningen tog för lång tid. Prova snabb textsökning eller en mindre exempelmarkering.')),timeout);});
  return Promise.race([promise,cancellation]).then(value=>{check(version);return value;}).finally(()=>{abortRejectors.delete(rejectAbort);clearTimeout(timer);});
 }
 async function localWorker(){
  const version=scanVersion;
  if(!workerPromise){const previousTermination=workerTermination,pending=(async()=>{
   // WebKit can retain a terminated WASM heap briefly. Never allocate the
   // next OCR worker until the previous worker's terminate() has completed.
   await previousTermination.catch(()=>{});check(version);
   if(!window.Tesseract){
    if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/tesseract/tesseract.min.js',base).href;script.onload=resolve;script.onerror=()=>reject(Error('De lokala bildläsningsfilerna kunde inte laddas.'));document.head.append(script);}).catch(error=>{libraryPromise=null;throw error;});
    await libraryPromise;check(version);
   }
   const worker=await window.Tesseract.createWorker(['swe','eng'],1,{workerPath:new URL('vendor/tesseract/worker.min.js',base).href,corePath:new URL('vendor/tesseract/tesseract-core-lstm.wasm.js',base).href,langPath:new URL('vendor/tesseract/lang/',base).href,workerBlobURL:false,gzip:true,logger:info=>{if(info.status==='recognizing text'&&busy&&version===scanVersion)detail({localPercent:Math.round(info.progress*100)});}});
   if(version!==scanVersion){try{await worker.terminate();}catch(_){}throw Error('Sökningen avbröts.');}return worker;
  })();workerPromise=pending;void pending.catch(()=>{if(workerPromise===pending)workerPromise=null;});}
  return abortable(workerPromise,version,90000);
 }
 async function releaseWorker(){
  const promise=workerPromise;workerPromise=null;const previous=workerTermination;
  const termination=(async()=>{await previous.catch(()=>{});if(!promise)return;let worker;try{worker=await promise;}catch(_){return;}try{await worker?.terminate?.();}catch(_){}})();
  workerTermination=termination;await termination;
 }
 async function recognize(worker,canvas){return abortable(worker.recognize(canvas),scanVersion,60000);}
 function cancel(){if(!busy||!cancellable)return;scanVersion++;for(const reject of [...abortRejectors])reject();renderTask?.cancel?.();previewTask?.cancel?.();void releaseWorker();pauseDrawingDetail(false);progress?.finish({state:'cancelled',message:'Inga nya kopplingar lades till. Du kan ändra val och söka igen.'});message('Sökningen avbröts. Befintliga kopplingar är kvar.');}
 async function annotationIndex(pdf,version){
  if(typeof bridge().getReadStampIndex==='function')return await bridge().getReadStampIndex();
  if(!window.PDFLib||!window.SmartMatchReadStamps||!bridge().getOriginalPdfBytes?.())return [];
  if(!metadataCache.has(pdf))metadataCache.set(pdf,(async()=>{
   detail({phase:'stamp-index',label:'Läser PDF-stämplarnas sparade beteckningar',done:null,total:null,unit:'page'});
   const bytes=bridge().getOriginalPdfBytes();const doc=await window.PDFLib.PDFDocument.load(bytes,{updateMetadata:false});check(version);return window.SmartMatchReadStamps.readDocument(doc);
  })().catch(error=>{metadataCache.delete(pdf);throw error;}));
  return await metadataCache.get(pdf);
 }
 function selectedChoice({appearanceRequired=false}={}){
  if(sourceChanged())throw Error('PDF:en har ändrats. Markera ett nytt exempel innan du kopplar.');
  if(!sample)throw Error('Markera först en beteckning på ritningen.');
  const drawingLabel=clean($('exCode').value),code=key(drawingLabel),cardCode=clean($('exCardCode').value),cardPage=Number($('exCardPage').value),sameColor=$('exSameColor').checked,imageMode=$('exMode').value;
  if(!code)throw Error('Ange hela beteckningen som ska matchas.');
  if(!Number.isInteger(cardPage)||cardPage<1)throw Error('Välj dörrkortssidan som ska öppnas. Kontrollera förhandsbilden.');
  if(!cardCode)throw Error('Välj eller skriv dörrkortets ursprungliga beteckning. Ritningens beteckning skrivs i det andra fältet.');
  const names=cardNames(cardPage);if(names.length&&!names.some(name=>key(name)===key(cardCode)))throw Error('Kortets ursprungliga beteckning stämmer inte med vald sida. Välj kortsidan igen.');
  if(appearanceRequired&&sameColor&&!sample.appearance)throw Error('Exemplets bakgrund och form kunde inte bestämmas. Markera hela den färgade stämpeln, läs exemplet som bild om text saknas, eller stäng själv av utseendekravet.');
  const mapping=bridge().getDoorCardMapping?.()||{},conflict=Object.entries(mapping).find(([label,page])=>key(label)===code&&Number(page)!==cardPage);
  if(conflict)throw Error(code+' är redan kopplad till sida '+conflict[1]+'. Välj samma kortsida. Befintliga kopplingar skrivs inte över.');
  return {drawingLabel,code,cardCode,cardPage,sameColor,imageMode};
 }
 function samplePdfRect(pg){
  if(!sample||!validRect(sample.rect))throw Error('Exempelmarkeringen saknar en giltig placering. Markera stämpeln igen.');
  const vp=pg.getViewport({scale:1}),r=sample.rect,a=vp.convertToPdfPoint(r.x*vp.width,r.y*vp.height),b=vp.convertToPdfPoint((r.x+r.w)*vp.width,(r.y+r.h)*vp.height),rect=[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];
  if(rect.some(value=>!Number.isFinite(value))||rect[2]<=rect[0]||rect[3]<=rect[1])throw Error('Exempelmarkeringen kunde inte översättas till PDF-sidan. Markera stämpeln igen.');
  return rect;
 }
 async function linkSelected(){
  ensureUi();if(busy)return;let choice;
  try{choice=selectedChoice();}catch(error){message(error.message,true);return;}
  resetResult();const version=++scanVersion;setBusy(true,true);pauseDrawingDetail(true);let pg=null;
  try{
   pg=await abortable(source.getPage(sample.page),version);check(version);const rect=samplePdfRect(pg),hit={code:choice.code,page:sample.page,rect,box:clone(sample.rect),confidence:100,source:'Manuellt markerad stämpel',selected:true};
   const existing=(bridge().getPositions?.()||[]).find(position=>position.page===hit.page&&Array.isArray(position.rect)&&sameRect(position.rect,hit.rect));
   const removed=existing?null:(window.SmartMatchReadTest?.getRemovedReadPositions?.()||[]).find(position=>position.page===hit.page&&sameRect(position.rect,hit.rect));
   const classified=existing?{...hit,status:'linked',selected:false,linkedId:existing.id||''}:removed?{...hit,status:'removed',selected:true,restoreRemoved:true,removedId:removed.id,removedCode:removed.code,removedRect:clone(removed.rect)}:{...hit,status:'available',selected:true};
   result={directOnly:true,code:choice.code,drawingLabel:choice.drawingLabel,cardCode:choice.cardCode,originalCardCode:choice.cardCode,cardPage:choice.cardPage,source,hits:[classified],wrongColor:0,unknownColor:0,totalCount:1,linkedCount:existing?1:0,unlinkedCount:existing?0:1,removedCount:removed?1:0,availableCount:existing||removed?0:1,duplicateCount:existing?1:0,warnings:[]};
   renderResults();$('exResultSummary').tabIndex=-1;$('exResultSummary').focus({preventScroll:true});$('exResultSummary').scrollIntoView?.({block:'nearest'});
   message(existing?'Den markerade stämpeln är redan kopplad. Ingen dubblett läggs till.':removed?'Den markerade stämpeln har tagits bort tidigare. Granska raden och välj Bekräfta kopplingen för att återkoppla den.':'Bara den markerade stämpeln är klar för granskning. Välj Bekräfta kopplingen. Ingen ritningssökning har körts.');
  }catch(error){result=null;message(error.message,true);}
  finally{if(IS_IPAD)releasePage(pg);pauseDrawingDetail(false);setBusy(false);}
 }
 async function search(){
  ensureUi();if(busy)return;
  if(sourceChanged()){message('PDF:en har ändrats. Markera ett nytt exempel innan du söker.',true);return;}
  const drawingLabel=clean($('exCode').value),code=key(drawingLabel),cardCode=clean($('exCardCode').value),cardPage=Number($('exCardPage').value),sameColor=$('exSameColor').checked,imageMode=$('exMode').value;
  if(!sample){message('Markera först en beteckning på ritningen.',true);return;}
  if(!code){message('Ange hela beteckningen som ska matchas.',true);return;}
  if(!cardPage){message('Välj dörrkortssidan som ska öppnas. Kontrollera förhandsbilden.',true);return;}
  if(!cardCode){message('Välj eller skriv dörrkortets ursprungliga beteckning. Ritningens beteckning skrivs i det andra fältet.',true);return;}
  const names=cardNames(cardPage);if(names.length&&!names.some(name=>key(name)===key(cardCode))){message('Kortets ursprungliga beteckning stämmer inte med vald sida. Välj kortsidan igen.',true);return;}
  if(sameColor&&!sample.appearance){message('Exemplets bakgrund och form kunde inte bestämmas. Markera hela den färgade stämpeln, läs exemplet som bild om text saknas, eller stäng själv av utseendekravet.',true);return;}
  const mapping=bridge().getDoorCardMapping?.()||{},conflict=Object.entries(mapping).find(([label,page])=>key(label)===code&&Number(page)!==cardPage);
  if(conflict){message(code+' är redan kopplad till sida '+conflict[1]+'. Välj samma kortsida. Befintliga kopplingar skrivs inte över.',true);return;}
  resetResult();const version=++scanVersion;setBusy(true,true);pauseDrawingDetail(true);progress=window.SmartMatchReadProgressV91?.create({onUpdate:showProgress});progress?.start(IS_IPAD&&imageMode==='full'?'Bildsöker bara markerad ritningssida':'Söker fler ritningskopplingar');
  try{
   const pdf=source,limit=Math.min(pdf.numPages,Number(bridge().getDrawingLimit?.())||pdf.numPages),excluded=new Set([...(bridge().getDoorCardPages?.()||[]),cardPage]);
   for(let n=limit+1;n<=pdf.numPages;n++)excluded.add(n);
   if(excluded.has(sample.page))throw Error('Exempelmarkeringen ligger på den valda kortsidan. Välj rätt ritningsexempel och dörrkort.');
   let indexed=[];if(!IS_IPAD||typeof bridge()?.getReadStampIndex==='function')try{indexed=await abortable(annotationIndex(pdf,version),version);}catch(error){check(version);message('Stämpelregistret kunde inte läsas. Sökningen fortsätter med PDF-text och läsbara stämplar.');}
   check(version);
   const searchSample={...sample,code,appearance:sample.appearance?{...sample.appearance,enabled:sameColor}:null};
   const ipadImageScope=IS_IPAD&&imageMode==='full'?[sample.page]:null;
   if(ipadImageScope)message('iPad-läge: bildsökningen kontrollerar bara PDF-sida '+sample.page+'. Använd Koppla bara markerad stämpel om du redan ser den missade positionen.');
   const found=await abortable(matcher().scan({pdf,codes:[code],cardPages:[...excluded],sample:searchSample,annotationIndex:indexed,imageMode,codeOnly:true,pageScope:ipadImageScope,scanPages:ipadImageScope,imageLimits:IS_IPAD?IPAD_IMAGE_LIMITS:undefined,getTextContent:async pg=>(await nativeWords(pg)).content,getWorker:localWorker,recognize,cancelled:()=>version!==scanVersion,onDetail:detail,onRenderTask:task=>{renderTask=task;},onProgress:text=>message(text),onPageRelease:({pageProxy})=>releasePage(pageProxy),onCanvasRelease:({canvas})=>{if(canvas){canvas.width=canvas.height=0;}},onWorkerRelease:()=>IS_IPAD?releaseWorker():undefined}),version);
   check(version);const hits=found.hits,wrongColor=found.appearance?.excluded||0,unknownColor=found.appearance?.unknown||0;
   const existing=bridge().getPositions?.()||[],removed=window.SmartMatchReadTest?.getRemovedReadPositions?.()||[];
   const classified=hits.map(hit=>{
    const linked=existing.find(position=>position.page===hit.page&&Array.isArray(position.rect)&&sameRect(position.rect,hit.rect));
    if(linked)return {...hit,status:'linked',selected:false,linkedId:linked.id||''};
    const tombstone=removed.find(position=>position.page===hit.page&&sameRect(position.rect,hit.rect));
    if(tombstone)return {...hit,status:'removed',selected:true,restoreRemoved:true,removedId:tombstone.id,removedCode:tombstone.code,removedRect:clone(tombstone.rect)};
    return {...hit,status:'available',selected:true};
   });
   const linkedCount=classified.filter(hit=>hit.status==='linked').length,removedCount=classified.filter(hit=>hit.status==='removed').length,availableCount=classified.filter(hit=>hit.status==='available').length;
   const warnings=[...(found.warnings||[])];if(ipadImageScope)warnings.unshift('iPad-läge: bildsökningen begränsades till den markerade PDF-sidan '+sample.page+' för att minska minnesanvändningen.');
   result={code,drawingLabel,cardCode,originalCardCode:cardCode,cardPage,source:pdf,hits:classified,wrongColor,unknownColor,totalCount:classified.length,linkedCount,unlinkedCount:removedCount+availableCount,removedCount,availableCount,duplicateCount:linkedCount,warnings};
   renderResults();progress?.finish({message:classified.length+' träffar granskade: '+linkedCount+' kopplade och '+(removedCount+availableCount)+' okopplade.'});message(classified.length?'Kontrollera alla träffar med Visa. Kopplade rader visas men kan inte väljas igen.':'Inga träffar hittades. Kontrollera beteckning, färg och söksätt.');
  }catch(error){result=null;progress?.finish({state:version!==scanVersion?'cancelled':'error',message:error.message});message(error.message,true);}
  finally{pauseDrawingDetail(false);await releaseWorker();setBusy(false);}
 }
 function sameRect(a,b){
  if(!Array.isArray(a)||!Array.isArray(b))return false;
  const overlap=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
  const minArea=Math.min(Math.max(0,a[2]-a[0])*Math.max(0,a[3]-a[1]),Math.max(0,b[2]-b[0])*Math.max(0,b[3]-b[1]));
  return minArea>0&&overlap/minArea>.55;
 }
 function renderResults(){
  $('exHits').replaceChildren();if(!result){updateApply();return;}
  $('exResultSummary').textContent=result.drawingLabel+' på ritningen → '+result.cardCode+' · dörrkort sida '+result.cardPage+'. Totalt '+result.totalCount+' · Kopplade '+result.linkedCount+' · Okopplade '+result.unlinkedCount+' · Tidigare borttagna '+result.removedCount+(result.wrongColor?' · '+result.wrongColor+' med annan bakgrund eller form bortvalda':'')+(result.unknownColor?' · '+result.unknownColor+' utan tydlig stämpelbakgrund bortvalda':'')+'.';
  for(const [index,hit] of result.hits.entries()){
   const row=document.createElement('div');row.className='exHit';row.dataset.status=hit.status;const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=hit.status!=='linked'&&hit.selected!==false;check.disabled=hit.status==='linked';check.onchange=()=>{hit.selected=check.checked;updateApply();};
   const text=document.createElement('span');text.textContent=(result.drawingLabel||hit.code)+' · PDF-sida '+hit.page;const small=document.createElement('small'),state=hit.status==='linked'?'Redan kopplad':hit.status==='removed'?'Tidigare borttagen – kan kopplas igen':'Ny okopplad träff';small.textContent=state+' · '+hit.source+(hit.appearance?' · '+hit.appearance.label:'');text.append(small);label.append(check,text);row.append(label);
   const show=document.createElement('button');show.type='button';show.dataset.exShow=String(index);show.textContent='Visa';show.setAttribute('aria-label','Visa träff '+(index+1)+' på sida '+hit.page);show.onclick=()=>{if(ui.open)ui.close();void bridge().locate(hit);const returnButton=$('exReturnReview')||document.createElement('button');returnButton.id='exReturnReview';returnButton.textContent='Tillbaka till kopplingarna';returnButton.type='button';returnButton.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:10000;padding:12px;background:#075985;color:white;border:0;border-radius:10px';returnButton.onclick=()=>{returnButton.remove();if(!ui.open)ui.showModal();};document.body.append(returnButton);};row.append(show);$('exHits').append(row);
  }
  if(result.warnings.length){const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Om sökningen';detail.append(summary);for(const text of [...new Set(result.warnings)]){const p=document.createElement('p');p.textContent=text;detail.append(p);}$('exHits').append(detail);}
  updateApply();
 }
 async function apply(){
  if(busy||!result)return;
  if(sourceChanged()||result.source!==bridge().getPdf()){resetResult();message('Projektets PDF har ändrats. Sök igen innan du lägger till kopplingar.',true);return;}
  if(clean($('exCode').value)!==result.drawingLabel||key($('exCardCode').value)!==key(result.cardCode)||Number($('exCardPage').value)!==result.cardPage){resetResult();message('Valen har ändrats. Sök igen före kopplingen.',true);return;}
  const hits=result.hits.filter(hit=>hit.status!=='linked'&&hit.selected!==false);if(!hits.length)return;
  setBusy(true);
  try{
   const outcome=await bridge().addManualReadPositions({code:result.code,drawingLabel:result.drawingLabel,cardPage:result.cardPage,cardCode:result.cardCode,originalCardCode:result.cardCode,hits:clone(hits),reviewedRestore:true});
   window.SmartMatchReadTest?.setDrawingSample?.({...clone(sample),code:result.code,appearance:sample.appearance?{...clone(sample.appearance),enabled:$('exSameColor').checked}:null});
   message((typeof outcome==='number'?outcome:outcome.added)+' kopplingar har lagts till'+(outcome?.restored?' · '+outcome.restored+' tidigare borttagna återkopplade':'')+'. Spara projekt-PDF för att behålla dem i filen.');
   resetResult();bridge().setStatus?.('De nya ritningskopplingarna är tillagda. Spara projekt-PDF när du är klar.');
  }catch(error){message(error.message,true);}finally{setBusy(false);}
 }
 async function appendCards(){
  if(busy)return;const files=Array.from($('exAppendFile').files||[]);if(!files.length){message('Välj en PDF med de saknade dörrkorten först.',true);return;}
  if(typeof bridge()?.appendReadCards!=='function'){message('Det går inte att lägga till PDF i den här versionen.',true);return;}
  const oldSample=sample?clone(sample):null;setBusy(true);message('Lägger till dörrkortssidorna. Befintliga kopplingar behålls…');
  try{
   const result=await bridge().appendReadCards(files);source=bridge().getPdf();sample=oldSample;resetResult();pageOptions(result.pages?.[0]||0);lastCardPage=Number($('exCardPage').value)||0;$('exAppendFile').value='';
   await previewCard();message((result.pages?.length||0)+' nya sidor har lagts till. Kontrollera vald kortsida och sök beteckningen på ritningen.');
  }catch(error){message(error.message,true);}finally{setBusy(false);}
 }
 async function previewCard(){
  const pdf=bridge()?.getPdf(),page=Number($('exCardPage').value),version=++previewVersion,canvas=$('exCardPreview');
  previewTask?.cancel?.();previewTask=null;canvas.hidden=true;canvas.width=canvas.height=0;if(!pdf||!page)return;let pg=null;
  try{pg=await pdf.getPage(page);if(version!==previewVersion)return;const v=pg.getViewport({scale:1}),maxWidth=IS_IPAD?300:400,maxHeight=IS_IPAD?190:260,vp=pg.getViewport({scale:Math.min(maxWidth/v.width,maxHeight/v.height)});canvas.width=Math.max(1,Math.ceil(vp.width));canvas.height=Math.max(1,Math.ceil(vp.height));const task=pg.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:vp});previewTask=task;await task.promise;if(version!==previewVersion)return;canvas.hidden=false;}catch(error){if(error.name!=='RenderingCancelledException')message('Förhandsbilden kunde inte visas: '+error.message,true);}finally{if(IS_IPAD)releasePage(pg);if(version===previewVersion)previewTask=null;}
 }
 function bind(){for(const id of ['exOpenExtra','exOpenExtraPositions']){const button=$(id);if(button&&!button.dataset.extraBound){button.dataset.extraBound='true';button.addEventListener('click',()=>void open());}}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
 window.SmartMatchReadExtraV94=Object.freeze({open,close,setSample,search,linkSelected,readSampleImage,isIPad:()=>IS_IPAD,state:()=>({busy,isIPad:IS_IPAD,sample:sample?clone(sample):null,result:result?{...clone({...result,source:null}),source:undefined}:null}),pixelProfile,colorSame,sameRect,bind});
})();
