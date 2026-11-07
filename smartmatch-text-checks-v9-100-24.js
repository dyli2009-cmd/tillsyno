/* Local drawing text checks: PDF coordinates and project payload, no remote document service. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SmartMatchTextChecks=api})(typeof window==='undefined'?null:window,function(root){
 'use strict';
 const DEFAULT_COLOR='#74d8d0';
 const labelColor=value=>/^#[0-9a-f]{6}$/i.test(String(value||''))?value.toLowerCase():DEFAULT_COLOR;
 function labelInk(color){const channels=[1,3,5].map(i=>parseInt(labelColor(color).slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722>.179?'#000000':'#ffffff';}
 const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
 function normalizeOne(value,maxPage=Infinity){
  if(!value||!Number.isInteger(Number(value.page))||Number(value.page)<1||Number(value.page)>maxPage)return null;
  if(!Array.isArray(value.rect)||value.rect.length!==4||!value.rect.every(Number.isFinite))return null;
  const [a,b,c,d]=value.rect,rect=[Math.min(a,c),Math.min(b,d),Math.max(a,c),Math.max(b,d)],name=clean(value.name).slice(0,200),id=String(value.id||'').slice(0,128);
  if(!id||!name||rect[2]<=rect[0]||rect[3]<=rect[1])return null;
  return {id,page:Number(value.page),rect,name,kind:value.kind==='label'?'label':'region',locked:value.locked===true,labelHeight:Math.max(6,Math.min(200,Number(value.labelHeight)||Math.abs(rect[3]-rect[1]))),color:labelColor(value.color),sourceText:clean(value.sourceText).slice(0,500),status:['done','open'].includes(value.status)?value.status:'pending',comment:String(value.comment||'').trim().slice(0,2000)};
 }
 function normalize(list,maxPage=Infinity){const ids=new Set();return (Array.isArray(list)?list:[]).map(v=>normalizeOne(v,maxPage)).filter(v=>v&&!ids.has(v.id)&&ids.add(v.id));}
 function selectionToPdf(vp,r){const a=vp.convertToPdfPoint(r.x*vp.width,r.y*vp.height),b=vp.convertToPdfPoint((r.x+r.w)*vp.width,(r.y+r.h)*vp.height);return [Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];}
 function textInRegion(items,vp,region){
  const words=items.filter(i=>i.str?.trim()).map(i=>{
   const [,,,,x,y]=i.transform,h=Math.max(i.height||0,Math.hypot(i.transform[2],i.transform[3]),1),p=vp.convertToViewportRectangle([x,y-h*.25,x+Math.max(i.width||1,1),y+h*.95]);
   return {text:i.str,x:Math.min(p[0],p[2])/vp.width,y:Math.min(p[1],p[3])/vp.height,w:Math.abs(p[2]-p[0])/vp.width,h:Math.abs(p[3]-p[1])/vp.height};
  }).filter(w=>{const x=w.x+w.w/2,y=w.y+w.h/2;return x>=region.x&&x<=region.x+region.w&&y>=region.y&&y<=region.y+region.h});
  const rows=[];for(const w of words.sort((a,b)=>a.y-b.y||a.x-b.x)){let row=rows.find(r=>Math.abs(r.y-w.y)<=Math.max(.002,Math.min(r.h,w.h)*.55));if(!row){row={y:w.y,h:w.h,words:[]};rows.push(row)}row.words.push(w);}
  return clean(rows.map(r=>r.words.sort((a,b)=>a.x-b.x).map(w=>w.text).join(' ')).join(' '));
 }
 const statusText=s=>s==='done'?'Klart':s==='open'?'Inte klart':'Ej kontrollerat';
 const statusSymbol=s=>s==='done'?'✓':s==='open'?'×':'';
 function labelMetrics(name,height,measure){const h=Math.max(6,Math.min(200,Number(height)||24)),font=h*.65;return {height:h,font,width:Math.max(h*.6,measure(clean(name),font)+h*.35)};}
 const api={labelMetrics,normalize,normalizeOne,selectionToPdf,textInRegion,statusText,statusSymbol,labelColor,labelInk,DEFAULT_COLOR};if(!root)return api;
 const $=id=>document.getElementById(id),bridge=()=>root.SmartMatchAppBridge;
 let measureLabel=null,lastDeleted=null,deleteNotice=null;
 const HEIGHT_KEY='smartmatch-text-label-height-v1';
 function defaultHeight(){try{return Math.max(6,Math.min(200,Number(root.localStorage.getItem(HEIGHT_KEY))||24))}catch(_){return 24}}
 function rememberHeight(height){try{root.localStorage.setItem(HEIGHT_KEY,String(height))}catch(_){}}
 function metrics(name,height){const measure=measureLabel||(measureLabel=document.createElement('canvas').getContext('2d'));return labelMetrics(name,height,(text,font)=>{measure.font='600 '+font+'px system-ui';return measure.measureText(text).width});}
 function fitLabel(item,vp){
  if(item.kind!=='label')return item;
  const corners=vp.convertToViewportRectangle(item.rect),m=metrics(item.name,item.labelHeight||Math.abs(corners[3]-corners[1])),w=Math.min(vp.width,m.width),h=Math.min(vp.height,m.height);
  const x=Math.max(0,Math.min(vp.width-w,Math.min(corners[0],corners[2]))),y=Math.max(0,Math.min(vp.height-h,Math.min(corners[1],corners[3])));
  return {...item,labelHeight:h,rect:selectionToPdf(vp,{x:x/vp.width,y:y/vp.height,w:w/vp.width,h:h/vp.height})};
 }
 function selectCheck(item,pdf,node){
  const selection=root.SmartMatchDrawingSelection;
  selection?.select({key:'check:'+item.id,label:item.name,remove:()=>remove(item,pdf),valid:()=>pdf===bridge()?.getPdf()&&item.page===bridge()?.getPage()&&records().some(row=>row.id===item.id)});selection?.attach('check:'+item.id,node);
 }
 function labelDrag(button,item,r,vp,pdf){
  let drag=null,suppressUntil=0;
  button.addEventListener('pointerdown',e=>{
   if(item.locked||item.kind!=='label'||!e.isPrimary||e.button!==0)return;
   e.stopPropagation();e.preventDefault();selectCheck(item,pdf,button);const stage=$('pwStage').getBoundingClientRect();
   drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false,page:bridge().getPage(),stage};button.setPointerCapture(e.pointerId);
  });
  button.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;e.stopPropagation();
   const dx=(e.clientX-drag.x)*vp.width/drag.stage.width,dy=(e.clientY-drag.y)*vp.height/drag.stage.height;
   if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4)drag.moved=true;if(!drag.moved)return;
   e.preventDefault();drag.left=Math.max(0,Math.min(vp.width-r.width,r.left+dx));drag.top=Math.max(0,Math.min(vp.height-r.height,r.top+dy));button.style.left=drag.left+'px';button.style.top=drag.top+'px';button.dataset.dragging='true';
  });
  const cancel=()=>{drag=null;delete button.dataset.dragging;button.style.left=r.left+'px';button.style.top=r.top+'px';};
  button.addEventListener('pointercancel',cancel);
  button.addEventListener('pointerup',e=>{
   if(!drag||drag.id!==e.pointerId)return;const g=drag;drag=null;delete button.dataset.dragging;e.stopPropagation();
   if(!g.moved)return;e.preventDefault();suppressUntil=Date.now()+500;root.SmartMatchDrawingSelection?.resetTap();
   if(pdf!==bridge().getPdf()||g.page!==bridge().getPage()){render();return;}
   try{bridge().setTextCheck({...item,rect:selectionToPdf(vp,{x:g.left/vp.width,y:g.top/vp.height,w:r.width/vp.width,h:r.height/vp.height})},pdf)}catch(error){render();bridge().setStatus?.(error.message||String(error))}
  });
  button.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
  button.addEventListener('touchstart',e=>{if(e.touches.length===1)e.stopPropagation();else cancel()},{passive:true});
 }

 let panel,form,hint,layer,source=null,draft=null,version=0,worker=null,task=null,groupOpen=true,groupQuery='',busy=false;
 const records=()=>bridge()?.getTextChecks?.()||[];
 function setMessage(text){$('pwTextCheckStatus').textContent=text||'';}
 function still(v,pdf){return v===version&&source===pdf&&bridge()?.getPdf()===pdf;}
 function cancelRead(){version++;task?.cancel();task=null;const active=worker;worker=null;if(active)void active.terminate().catch(()=>{});busy=false;}
 function readFields(){
  if(!draft)return;
  draft.name=clean($('pwTextCheckName').value).slice(0,200);draft.comment=$('pwTextCheckComment').value;draft.color=labelColor($('pwTextCheckColor').value);
 }
 function previewLabel(){
  const p=$('pwTextCheckLabelPreview'),color=labelColor($('pwTextCheckColor').value);
  p.textContent=clean($('pwTextCheckName').value)||'Din text';p.style.setProperty('--text-check-bg',color);p.style.setProperty('--text-check-ink',labelInk(color));p.hidden=draft?.kind!=='label';
  for(const b of panel.querySelectorAll('[data-label-color]'))b.setAttribute('aria-pressed',String(b.dataset.labelColor===color));
 }
 function setSettingsOpen(open){
  const settings=$('pwTextCheckSettings'),toggle=$('pwTextCheckSettingsToggle');
  if(!open&&settings.contains(document.activeElement))toggle.focus({preventScroll:true});
  settings.hidden=!open;toggle.setAttribute('aria-expanded',String(open));panel.dataset.settingsOpen=String(open);
 }
 function buttons(){
  $('pwTextCheckSettingsToggle').disabled=busy;
  $('pwTextCheckDelete').hidden=!draft?.id;$('pwTextCheckDelete').disabled=busy;$('pwTextCheckSave').disabled=busy;const label=draft?.kind==='label';$('pwTextCheckSizing').hidden=!label;$('pwTextCheckLock').disabled=busy||!label;$('pwTextCheckLock').textContent=draft?.locked?'Lås upp':'Lås placering';$('pwTextCheckLock').setAttribute('aria-pressed',String(!!draft?.locked));$('pwTextCheckSmaller').disabled=$('pwTextCheckLarger').disabled=busy||!!draft?.locked;$('pwTextCheckMark').disabled=busy;$('pwTextCheckPlace').disabled=busy||!!draft?.locked;
  for(const b of panel.querySelectorAll('[data-check-status]')){b.disabled=busy;b.setAttribute('aria-pressed',String(b.dataset.checkStatus===(draft?.status||'pending')));}
  $('pwTextCheckSave').textContent=draft?.id?'Spara ändringar':draft?.rect?'Spara punkt':'Spara och placera';
 }
 function reflect(){
  $('pwTextCheckTitle').textContent=draft?.id?'Kopplad text':'Koppla text';
  $('pwTextCheckName').value=draft?.name||'';$('pwTextCheckComment').value=draft?.comment||'';$('pwTextCheckColor').value=labelColor(draft?.color);
  $('pwTextCheckLocation').textContent=draft?.rect?'Ritningssida '+draft.page:'Ingen placering vald ännu.';
  $('pwTextCheckPlace').textContent=draft?.rect?'Flytta / ändra storlek':'Placera egen text';previewLabel();buttons();
 }
 function open(record=null){
  init();cancelRead();bridge()?.cancelReadSample?.();hint.hidden=true;
  source=bridge()?.getPdf();if(!source){bridge()?.setStatus?.('Öppna en ritning först.');return;}
  draft=record?{...record,rect:record.rect.slice()}:{kind:'label',locked:false,labelHeight:defaultHeight(),color:DEFAULT_COLOR,status:'pending',name:'',comment:'',page:bridge().getPage(),rect:null};
  $('pwTextCheckPreview').hidden=true;setSettingsOpen(!record?.id);reflect();setMessage(record?'':'Skriv egen text eller läs en text från ritningen.');panel.showModal();
  if(record?.id)panel.querySelector('[data-check-status="'+draft.status+'"]')?.focus({preventScroll:true});
 }
 function close(){cancelRead();if(hint)hint.hidden=true;bridge()?.cancelReadSample?.();if(panel?.open)panel.close();const preview=$('pwTextCheckPreview');if(preview)preview.width=preview.height=0;}
 async function commit(status,keepOpen=false){
  if(busy||!draft)return;
  if(source!==bridge()?.getPdf()){close();return;}
  readFields();if(status)draft.status=status;
  if(status&&!draft.rect){buttons();return;}
  if(!draft.name){setSettingsOpen(true);setMessage('Skriv en text eller ett namn på punkten.');$('pwTextCheckName').focus({preventScroll:true});return;}
  if(!draft.rect){mark('place',true);return;}
  const expected=source,current=draft,v=version;busy=true;buttons();
  try{
   const pg=await expected.getPage(current.page);if(!still(v,expected)||draft!==current)return;
   const next=fitLabel({...current,id:current.id||'text:'+(root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))},pg.getViewport({scale:1}));
   draft=bridge().setTextCheck(next,expected);if(draft.kind==='label')rememberHeight(draft.labelHeight);reflect();setMessage('Sparat på enheten. Spara projekt-PDF för att ta med punkten i filen.');if(!status&&!keepOpen)close();
  }catch(error){if(still(v,expected))setMessage(error.message||String(error));}
  finally{if(still(v,expected)){busy=false;buttons();}}

 }
 function remove(record,pdf){
  if(busy||!record?.id||!pdf||pdf!==bridge()?.getPdf())return;
  try{
   const removed=bridge().removeTextCheck(record.id,pdf);if(!removed)return;
   if(draft?.id===record.id)close();lastDeleted={item:removed,pdf};deleteNotice.querySelector('span').textContent='Textkontrollen '+removed.name+' är borttagen.';deleteNotice.hidden=false;
  }catch(error){bridge()?.setStatus?.(error.message||String(error));}
 }
 function undoDelete(){
  const previous=lastDeleted;if(!previous||bridge()?.getPdf()!==previous.pdf)return;
  try{bridge().setTextCheck(previous.item,previous.pdf);lastDeleted=null;deleteNotice.hidden=true;}
  catch(error){bridge()?.setStatus?.(error.message||String(error));}
 }
 async function imageRead(canvas,v,pdf){
  const lib=await bridge().loadLocalOcr();if(!still(v,pdf))return '';
  const base=document.baseURI;
  const active=await lib.createWorker(['swe','eng'],1,{workerPath:new URL('vendor/tesseract/worker.min.js',base).href,corePath:new URL('vendor/tesseract/tesseract-core-lstm.wasm.js',base).href,langPath:new URL('vendor/tesseract/lang/',base).href,workerBlobURL:false,gzip:true});
  if(!still(v,pdf)){await active.terminate();return '';}worker=active;
  let timer;
  try{await active.setParameters({tessedit_pageseg_mode:6,preserve_interword_spaces:'1'});const result=await Promise.race([active.recognize(canvas),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bildläsningen tog för lång tid. Skriv namnet själv.')),45000)})]);return clean(result.data?.text);}
  finally{clearTimeout(timer);if(worker===active)worker=null;await active.terminate().catch(()=>{});}
 }
 async function selected(sample,mode='scan',saveAfter=false){
  hint.hidden=true;
  if(!sample){if(source===bridge()?.getPdf()&&panel&&!panel.open){setMessage('Markeringen avbröts.');panel.showModal()}return;}
  const pdf=source,v=++version;busy=true;panel.showModal();setMessage(mode==='scan'?'Läser markerad text…':'Placerar text…');buttons();
  let crop;
  try{
   const pg=await pdf.getPage(sample.page);if(!still(v,pdf))return;
   const vp=pg.getViewport({scale:1}),region=sample.rect;
   draft={...(draft||{}),page:sample.page,rect:selectionToPdf(vp,region),status:draft?.status||'pending',color:labelColor(draft?.color)};
   if(mode==='place'){draft.labelHeight=region.h*vp.height;draft=fitLabel(draft,vp);$('pwTextCheckPreview').hidden=true;busy=false;reflect();setMessage('Placeringen är klar.');if(saveAfter)await commit();return;}
   draft.kind='region';draft.name='';draft.sourceText='';
   const native=await pg.getTextContent(),content=root.SmartMatchReadText?.joinNativeContent?.(native)||native;if(!still(v,pdf))return;
   let text=textInRegion(content.items,vp,region);
   const factor=Math.min(4,1200/(region.w*vp.width),1200/(region.h*vp.height),Math.sqrt(400000/Math.max(1,region.w*vp.width*region.h*vp.height))),renderVp=pg.getViewport({scale:factor});
   crop=document.createElement('canvas');crop.width=Math.max(1,Math.ceil(region.w*renderVp.width));crop.height=Math.max(1,Math.ceil(region.h*renderVp.height));
   const ctx=crop.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,crop.width,crop.height);
   const render=pg.render({canvasContext:ctx,viewport:renderVp,transform:[1,0,0,1,-region.x*renderVp.width,-region.y*renderVp.height]});task=render;
   try{await render.promise}finally{if(task===render)task=null}if(!still(v,pdf))return;
   const preview=$('pwTextCheckPreview');preview.width=crop.width;preview.height=crop.height;preview.getContext('2d').drawImage(crop,0,0);preview.hidden=false;
   if(!text){setMessage('Bildläser markeringen lokalt på enheten…');text=await imageRead(crop,v,pdf);}
   if(!still(v,pdf))return;
   draft.name=text.slice(0,200);draft.sourceText=text.slice(0,500);reflect();setMessage(text?'Kontrollera namnet innan du sparar.':'Ingen text kunde läsas. Skriv namnet själv och spara markeringen.');
  }catch(error){if(still(v,pdf)){reflect();setMessage('Texten kunde inte läsas: '+(error.message||error)+' Du kan skriva namnet själv.');}}
  finally{if(crop)crop.width=crop.height=0;if(still(v,pdf)){busy=false;buttons();}}
 }
 function mark(mode='scan',saveAfter=false){
  if(busy)return;readFields();
  if(mode==='place'&&!draft?.name){setMessage('Skriv texten först.');$('pwTextCheckName').focus({preventScroll:true});return;}
  cancelRead();if(source!==bridge()?.getPdf()){close();return;}
  const size=mode==='place'?(draft.kind==='label'?metrics(draft.name,draft.labelHeight||defaultHeight()):{width:draft.rect[2]-draft.rect[0],height:draft.rect[3]-draft.rect[1]}):null;
  try{panel.close();bridge().beginReadSample(value=>void selected(value,mode,saveAfter),{text:true,size});hint.querySelector('span').textContent=mode==='place'?'Tryck för att placera texten. Dra för att välja höjd – bredden följer texten.':'Dra en ruta runt texten på ritningen.';hint.hidden=false;}
  catch(error){panel.showModal();setMessage(error.message||String(error));}
 }
 function render(){
  if(!layer)return;layer.replaceChildren();const app=bridge(),pdf=app?.getPdf(),vp=app?.getDrawingViewport?.();
  if(lastDeleted&&lastDeleted.pdf!==pdf){lastDeleted=null;if(deleteNotice)deleteNotice.hidden=true;}
  if(source&&source!==pdf){cancelRead();source=null;draft=null;hint.hidden=true;if(panel.open)panel.close();}
  if(!pdf||!vp)return;
  for(const item of records().filter(i=>i.page===app.getPage())){
   const r=app.viewportRect(vp,item.rect);if(!Number.isFinite(r.left+r.top+r.width+r.height))continue;
   const b=document.createElement('button');b.type='button';b.className='smTextCheckHit';b.dataset.checkId=item.id;b.dataset.status=item.status;b.dataset.kind=item.kind||'region';b.dataset.locked=String(!!item.locked);b.title=item.name+' · '+statusText(item.status)+(item.comment?' · '+item.comment:'');b.setAttribute('aria-label',b.title);
   Object.assign(b.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
   b.style.setProperty('--text-check-bg',labelColor(item.color));b.style.setProperty('--text-check-tint',labelColor(item.color)+'88');b.style.setProperty('--text-check-ink',labelInk(item.color));
   if(item.kind==='label'){const label=document.createElement('span');label.className='smTextCheckLabel';label.textContent=item.name;const measure=measureLabel||(measureLabel=document.createElement('canvas').getContext('2d'));measure.font='600 100px system-ui';const font=Math.max(.1,Math.min(r.height*.65,Math.max(1,r.width-r.height*.35)*100/Math.max(1,measure.measureText(item.name).width)));label.style.fontSize=font+'px';b.append(label);}
   b.style.setProperty('--text-check-scale','1');labelDrag(b,item,r,vp,pdf);
   if(statusSymbol(item.status)){const badge=document.createElement('span');badge.className='smTextCheckBadge';if(item.status==='open'){badge.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8"/></svg>'}else badge.textContent=statusSymbol(item.status);badge.setAttribute('aria-hidden','true');b.append(badge);}
   if(item.comment){const note=document.createElement('span');note.className='smTextCheckCommentBadge';note.textContent='?';note.setAttribute('aria-hidden','true');b.append(note)}
   b.title+=' · Dubbeltryck för att öppna';b.setAttribute('aria-label',b.title);root.SmartMatchDrawingSelection?.attach('check:'+item.id,b);
   b.onclick=e=>{e.preventDefault();e.stopPropagation();const selection=root.SmartMatchDrawingSelection;
    selectCheck(item,pdf,b);
    selection?.activate('check:'+item.id,e,()=>open(item));
   };layer.append(b);
  }
 }
 function appendPositions(container,{currentOnly=false,page=1}={}){
  if(!container)return;container.querySelector('.smTextCheckGroup')?.remove();const items=records().filter(i=>!currentOnly||i.page===page);if(!items.length)return;
  const group=document.createElement('details');group.className='pwGroup smTextCheckGroup';group.open=groupOpen;
  group.ontoggle=()=>{if(group.isConnected)groupOpen=group.open;};const summary=document.createElement('summary');summary.className='pwGroupTitle';const title=document.createElement('strong'),count=document.createElement('span');title.textContent='Textkontroller';count.textContent=items.filter(i=>i.status==='done').length+' / '+items.length+' klara';summary.append(title,count);group.append(summary);
  const search=document.createElement('input');search.type='search';search.placeholder='Sök textkontroll';search.setAttribute('aria-label','Sök textkontroll');search.value=groupQuery;group.append(search);
  const list=document.createElement('div');list.className='pwGroupItems';group.append(list);
  for(const item of items){const button=document.createElement('button');button.type='button';button.className='pwPosition smTextCheckPosition';button.dataset.search=item.name.toLocaleLowerCase('sv');button.dataset.status=item.status;
   const left=document.createElement('span'),name=document.createElement('strong'),location=document.createElement('small'),badge=document.createElement('b');name.textContent=item.name;location.textContent='Sida '+item.page+' · '+statusText(item.status);badge.textContent=statusSymbol(item.status);left.append(name,location);button.append(left);if(statusSymbol(item.status))button.append(badge);
   button.onclick=async()=>{const pdf=bridge().getPdf();await bridge().locate(item);if(bridge().getPdf()===pdf&&records().some(i=>i.id===item.id))open(item)};
   const recordPdf=bridge().getPdf(),row=document.createElement('div');row.className='smTextCheckPositionRow';row.dataset.search=button.dataset.search;
   const removeButton=document.createElement('button');removeButton.type='button';removeButton.className='smTextCheckRemove';removeButton.setAttribute('aria-label','Ta bort textkontroll '+item.name);removeButton.title='Ta bort '+item.name;removeButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>';removeButton.onclick=e=>{e.stopPropagation();remove(item,recordPdf)};row.append(button,removeButton);list.append(row);
  }
  search.oninput=()=>{groupQuery=search.value;for(const button of list.children)button.hidden=!button.dataset.search.includes(groupQuery.trim().toLocaleLowerCase('sv'));};search.oninput();container.append(group);
 }
 function init(){
  if(panel)return;
  layer=document.createElement('div');layer.id='pwTextCheckMarkers';layer.setAttribute('aria-label','Kopplade textkontroller');$('pwStage').append(layer);
  panel=document.createElement('dialog');panel.id='pwTextCheckDialog';panel.setAttribute('aria-labelledby','pwTextCheckTitle');
  panel.innerHTML='<header><strong id="pwTextCheckTitle">Koppla text</strong><button id="pwTextCheckSettingsToggle" type="button" data-sm-window-action aria-label="Inställningar för kopplad text" title="Inställningar för kopplad text" aria-expanded="true" aria-controls="pwTextCheckSettings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 3-.6 2.4-2.1 1.2-2.4-.7-2.5 4.2 1.8 1.7v2.4l-1.8 1.7 2.5 4.2 2.4-.7 2.1 1.2.6 2.4h5l.6-2.4 2.1-1.2 2.4.7 2.5-4.2-1.8-1.7v-2.4l1.8-1.7-2.5-4.2-2.4.7-2.1-1.2L14.5 3z"/><circle cx="12" cy="13" r="3"/></svg></button><button id="pwTextCheckClose" type="button" aria-label="Stäng textkontroll">×</button></header><form id="pwTextCheckForm"><div id="pwTextCheckSettings"><button id="pwTextCheckMark" type="button">Läs text från ritningen</button><canvas id="pwTextCheckPreview" hidden aria-label="Markerad text från ritningen"></canvas><label>Namn<input id="pwTextCheckName" maxlength="200" required autocomplete="off" placeholder="Exempel: LO14 eller QA controller"></label><div id="pwTextCheckLabelPreview" aria-label="Förhandsvisning av egen text"></div><div class="smTextCheckColorRow"><strong>Bakgrund</strong><div id="pwTextCheckColors" role="group" aria-label="Bakgrundsfärg"></div><label class="smTextCheckCustomColor">Egen färg<input id="pwTextCheckColor" type="color" aria-label="Egen bakgrundsfärg"></label></div><button id="pwTextCheckPlace" type="button">Placera egen text</button><div id="pwTextCheckSizing"><button type="button" id="pwTextCheckSmaller" aria-label="Mindre textetikett">A−</button><button type="button" id="pwTextCheckLarger" aria-label="Större textetikett">A+</button><button type="button" id="pwTextCheckLock">Lås placering</button></div><small id="pwTextCheckLocation"></small><button id="pwTextCheckDelete" type="button" hidden>Ta bort</button></div><div class="smTextCheckStates" role="group" aria-label="Textkontrollens status"><button type="button" data-check-status="done">✓ Klart</button><button type="button" data-check-status="open">× Inte klart</button><button type="button" data-check-status="pending">Ej kontrollerat</button></div><small class="smTextCheckStatusHelp">Ej kontrollerat visar ingen bock eller något X på ritningen.</small><label>Kommentar<textarea id="pwTextCheckComment" rows="2" maxlength="2000" placeholder="Lägg till en kommentar"></textarea></label><p id="pwTextCheckStatus" role="status" aria-live="polite"></p><div class="smTextCheckActions"><button id="pwTextCheckCancel" type="button">Avbryt</button><button id="pwTextCheckSave" type="submit">Spara och placera</button></div></form>';
  document.body.append(panel);form=$('pwTextCheckForm');form.onsubmit=e=>{e.preventDefault();void commit()};$('pwTextCheckClose').onclick=$('pwTextCheckCancel').onclick=close;$('pwTextCheckMark').onclick=()=>mark('scan');$('pwTextCheckPlace').onclick=()=>mark('place');
  for(const [name,color] of [['Turkos',DEFAULT_COLOR],['Blå','#b7d9f2'],['Gul','#ffe59a'],['Orange','#ffb680'],['Lila','#d6c5f0'],['Grå','#dde4e8']]){const b=document.createElement('button');b.type='button';b.className='smTextCheckColor';b.dataset.labelColor=color;b.style.setProperty('--swatch',color);b.setAttribute('aria-label',name+' bakgrund');b.title=name;b.onclick=()=>{$('pwTextCheckColor').value=color;readFields();previewLabel();};$('pwTextCheckColors').append(b);}
  $('pwTextCheckSettingsToggle').onclick=()=>setSettingsOpen($('pwTextCheckSettings').hidden);
  $('pwTextCheckName').addEventListener('invalid',()=>setSettingsOpen(true));
  $('pwTextCheckDelete').onclick=()=>remove(draft,source);
  $('pwTextCheckLock').onclick=()=>{if(busy||!draft)return;readFields();draft.locked=!draft.locked;if(draft.rect)void commit(undefined,true);else buttons();};
  const resize=factor=>{if(busy||!draft||draft.locked)return;readFields();draft.labelHeight=Math.max(6,Math.min(200,(draft.labelHeight||defaultHeight())*factor));if(draft.rect)void commit(undefined,true);else reflect();};
  $('pwTextCheckSmaller').onclick=()=>resize(1/1.15);$('pwTextCheckLarger').onclick=()=>resize(1.15);
  $('pwTextCheckName').addEventListener('input',previewLabel);$('pwTextCheckColor').addEventListener('input',()=>{readFields();previewLabel();});
  panel.addEventListener('cancel',e=>{e.preventDefault();close()});for(const b of panel.querySelectorAll('[data-check-status]'))b.onclick=()=>void commit(b.dataset.checkStatus);
  hint=document.createElement('div');hint.id='pwTextPickHint';hint.hidden=true;hint.setAttribute('role','status');const text=document.createElement('span'),cancel=document.createElement('button');text.textContent='Dra en ruta runt texten på ritningen.';cancel.type='button';cancel.textContent='Avbryt';cancel.onclick=()=>bridge()?.cancelReadSample?.();hint.append(text,cancel);document.body.append(hint);
  deleteNotice=document.createElement('div');deleteNotice.id='pwTextDeleteNotice';deleteNotice.hidden=true;deleteNotice.setAttribute('role','status');const removedText=document.createElement('span'),undo=document.createElement('button');undo.type='button';undo.textContent='Ångra borttagning';undo.onclick=undoDelete;deleteNotice.append(removedText,undo);document.body.append(deleteNotice);
  $('pwTextCheckOpen')?.addEventListener('click',()=>open());root.SmartMatchWindows?.prepare(panel);render();
 }
 Object.assign(api,{open,render,appendPositions,close});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 return api;
});
