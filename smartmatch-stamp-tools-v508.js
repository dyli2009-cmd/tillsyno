/* Original PDF Stamp selection. No OCR, masking, products or door links are changed. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else {root.SmartMatchStampTools=api;document.addEventListener('DOMContentLoaded',()=>api.init(root),{once:true});}
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const CATALOG='TillsynoStampEdits';
 function normalize(edits){
  if(!Array.isArray(edits))return [];
  const seen=new Set();return edits.filter(e=>e&&typeof e.key==='string'&&e.key.length<10000&&['hide','remove'].includes(e.action)&&!seen.has(e.key)&&seen.add(e.key)).map(e=>({key:e.key,page:Number(e.page),label:String(e.label||'Stämpel').slice(0,160),action:e.action}));
 }
 function read(doc,L){
  const raw=doc.catalog.get(L.PDFName.of(CATALOG));if(!raw)return [];
  return normalize(JSON.parse(doc.context.lookup(raw).decodeText()));
 }
 function write(doc,edits,L){doc.catalog.set(L.PDFName.of(CATALOG),L.PDFHexString.fromText(JSON.stringify(normalize(edits))));}
 function entries(doc,L){
  const result=[],name=L.PDFName.of,text=(a,key)=>{try{return a.lookup(name(key))?.decodeText?.()||''}catch(_){return ''}};
  doc.getPages().forEach((pg,i)=>{
   const annots=pg.node.Annots?.();if(!(annots instanceof L.PDFArray))return;
   annots.asArray().forEach((ref,index)=>{
    const a=doc.context.lookup(ref);if(!(a instanceof L.PDFDict))return;
    const subtype=String(a.get(name('Subtype'))),nm=text(a,'NM'),code=text(a,'TillsynoCode');
    const groupedText=subtype==='/FreeText'&&nm.startsWith('projection-v2-')&&!!code;
    if(subtype!=='/Stamp'&&!groupedText)return;
    if(/^SM\d+:/.test(nm))return;
    const r=a.lookup(name('Rect'));if(!(r instanceof L.PDFArray)||r.size()!==4)return;
    const rect=r.asArray().map(x=>doc.context.lookup(x)?.asNumber?.());if(!rect.every(Number.isFinite)||rect[0]>=rect[2]||rect[1]>=rect[3])return;
    const subject=text(a,'Subj'),contents=text(a,'Contents'),flags=a.lookup(name('F'))?.asNumber?.()||0;
    const key=JSON.stringify([i+1,nm,rect,subject,contents]);
    const groupIndices=[];
    if(groupedText)annots.asArray().forEach((childRef,childIndex)=>{
     const child=doc.context.lookup(childRef);if(!(child instanceof L.PDFDict))return;
     if(String(child.get(name('IRT')))===String(ref)&&String(child.get(name('RT')))==='/Group'&&text(child,'NM')==='projection-v2-frame-'+nm.slice('projection-v2-'.length))groupIndices.push(childIndex);
    });
    result.push({key,page:i+1,rect,label:(code||subject||contents||'Stämpel').slice(0,160),flags,index,groupIndices});
   });
  });
  const counts=new Map();for(const x of result)counts.set(x.key,(counts.get(x.key)||0)+1);
  return result.map(x=>({...x,ambiguous:counts.get(x.key)>1}));
 }
 function apply(doc,edits,L,display=false){
  const actions=new Map(normalize(edits).filter(e=>display||e.action==='remove').map(e=>[e.key,e]));
  const remove=new Map();for(const item of entries(doc,L))if(actions.has(item.key)){
   if(item.key.length>=10000)throw Error('Den här stämpeln har för mycket metadata för att ändras säkert.');if(item.ambiguous)throw Error('Två identiska stämplar kunde inte skiljas åt. Ingen fil har ändrats.');
   if(!remove.has(item.page))remove.set(item.page,new Set());remove.get(item.page).add(item.index);for(const index of item.groupIndices)remove.get(item.page).add(index);
  }
  let count=0;for(const [page,indices]of remove){const pg=doc.getPage(page-1),a=pg.node.Annots();pg.node.set(L.PDFName.of('Annots'),doc.context.obj(a.asArray().filter((_,i)=>!indices.has(i))));count+=indices.size;}
  return count;
 }
 function hits(items,page,rect){
  return items.filter(x=>x.page===page&&!(x.flags&35)&&x.rect[0]<=rect[2]&&x.rect[2]>=rect[0]&&x.rect[1]<=rect[3]&&x.rect[3]>=rect[1]);
 }
 function verify(doc,edits,L){
  const deleted=new Set(normalize(edits).filter(x=>x.action==='remove').map(x=>x.key));
  if(entries(doc,L).some(x=>deleted.has(x.key)))throw Error('En borttagen stämpel finns fortfarande i exporterad PDF.');
  if(JSON.stringify(read(doc,L))!==JSON.stringify(normalize(edits)))throw Error('Stämpeländringarna kunde inte läsas tillbaka.');
 }
 function init(win){
  const menu=document.getElementById('pwToolMenu'),stage=document.getElementById('pwStage');if(!menu||!stage)return;
  const launch=document.createElement('button');launch.type='button';launch.id='smSelectPdfStamp';launch.textContent='Välj stämpel · dölj / ta bort';menu.append(launch);
  const panel=document.createElement('section');panel.id='smStampPanel';panel.hidden=true;panel.setAttribute('aria-label','Stämplar på ritningen');
  const heading=document.createElement('strong');heading.textContent='Stämplar på ritningen';
  const status=document.createElement('p');status.setAttribute('role','status');
  const actions=document.createElement('div'),results=document.createElement('div');results.className='smStampResults';
  const btn=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b};
  const close=btn('Stäng',()=>stop()),pick=btn('Välj på ritningen',()=>run(begin)),history=btn('Dolda / borttagna',()=>run(showHistory));
  actions.append(pick,history,close);panel.append(heading,actions,status,results);document.body.append(panel);
  let source=null,items=[],overlay=null,selectionPage=0,start=null,busy=false;
  const bridge=()=>win.SmartMatchAppBridge;
  function clearOverlay(){overlay?.remove();overlay=null;start=null;}
  function stop(){if(busy)return;clearOverlay();panel.hidden=true;launch.focus();}
  async function run(fn){if(busy)return;busy=true;panel.setAttribute('aria-busy','true');try{await fn()}catch(e){status.textContent=e.message||String(e)}finally{busy=false;panel.removeAttribute('aria-busy');}}
  async function load(){
   const b=bridge(),bytes=b?.getOriginalPdfBytes?.();if(!bytes||!b.getPdf())throw Error('Öppna en projekt-PDF först.');
   if(source!==bytes){clearOverlay();items=[];status.textContent='Läser PDF-stämplar…';const doc=await win.PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});if(bytes!==b.getOriginalPdfBytes())throw Error('Projektet har bytts. Öppna verktyget igen.');items=entries(doc,win.PDFLib);source=bytes;}
   return b;
  }
  async function begin(){
   const b=await load();clearOverlay();results.replaceChildren();
   if(b.getDoorCardPages?.().includes(b.getPage()))throw Error('Gå till ritningen för att välja en stämpel.');
   b.prepareStampSelection();selectionPage=b.getPage();
   status.textContent='Tryck på en stämpel eller dra en ruta runt den. Endast separata PDF-stämplar kan väljas.';
   overlay=document.createElement('div');overlay.className='smStampSelector';overlay.setAttribute('aria-label','Markera stämpel på ritningen');stage.append(overlay);
   for(const type of ['touchstart','touchmove','touchend','touchcancel'])overlay.addEventListener(type,e=>e.stopPropagation(),{passive:true});
   const box=document.createElement('div');box.className='smStampSelectionBox';box.hidden=true;overlay.append(box);
   const point=e=>{const r=overlay.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top,w:r.width,h:r.height}};
   overlay.onpointerdown=e=>{if(e.button!==0||!e.isPrimary)return;e.preventDefault();e.stopPropagation();start=point(e);overlay.setPointerCapture(e.pointerId);};
   overlay.onpointermove=e=>{if(!start)return;const p=point(e);box.hidden=false;Object.assign(box.style,{left:Math.min(p.x,start.x)+'px',top:Math.min(p.y,start.y)+'px',width:Math.abs(p.x-start.x)+'px',height:Math.abs(p.y-start.y)+'px'});};
   overlay.onpointercancel=()=>{start=null;box.hidden=true;};
   overlay.onpointerup=e=>{if(!start)return;e.preventDefault();e.stopPropagation();const a=start,p=point(e);start=null;run(async()=>{
    if(b.getOriginalPdfBytes()!==source||b.getPage()!==selectionPage)throw Error('Ritningssidan har bytts. Välj igen.');
    const pg=await b.getPdf().getPage(selectionPage),vp=pg.getViewport({scale:1});
    const tap=Math.hypot(p.x-a.x,p.y-a.y)<8,pad=tap?7:0;
    const c=vp.convertToPdfPoint((Math.min(a.x,p.x)-pad)/p.w*vp.width,(Math.min(a.y,p.y)-pad)/p.h*vp.height),d=vp.convertToPdfPoint((Math.max(a.x,p.x)+pad)/p.w*vp.width,(Math.max(a.y,p.y)+pad)/p.h*vp.height);
    const rect=[Math.min(c[0],d[0]),Math.min(c[1],d[1]),Math.max(c[0],d[0]),Math.max(c[1],d[1])];
    const changed=new Set(b.getStampEdits().map(x=>x.key));const found=hits(items,selectionPage,rect).filter(x=>!changed.has(x.key));
    clearOverlay();results.replaceChildren();status.textContent=found.length?found.length+' stämpel/stämplar hittade. Välj den du vill ändra.':'Ingen separat PDF-stämpel hittades. Symbolen kan vara inbakad i ritningen och kan då inte tas bort med detta verktyg.';
    for(const item of found)results.append(btn(item.label,()=>run(()=>select(item))));
   });};
  }
  async function select(item){
   const b=await load();if(item.key.length>=10000)throw Error('Den här stämpeln har för mycket metadata för att ändras säkert.');if(item.ambiguous)throw Error('Stämplarna ligger identiskt. Verktyget kan inte säkert välja bara en av dem.');
   await b.locate(item);clearOverlay();
   const pg=await b.getPdf().getPage(item.page),vp=pg.getViewport({scale:1}),r=vp.convertToViewportRectangle(item.rect);
   const mark=document.createElement('div');mark.className='smStampHighlight';Object.assign(mark.style,{left:Math.min(r[0],r[2])/vp.width*100+'%',top:Math.min(r[1],r[3])/vp.height*100+'%',width:Math.abs(r[2]-r[0])/vp.width*100+'%',height:Math.abs(r[3]-r[1])/vp.height*100+'%'});stage.append(mark);overlay=mark;
   results.replaceChildren();status.textContent=item.label+' · sida '+item.page+'. Dölj gäller appens vy. Ta bort gäller PDF:en när du sparar. Dörrkort och produkter påverkas inte.';
   for(const [action,label]of [['hide','Dölj'],['remove','Ta bort']])results.append(btn(label,()=>run(async()=>{
    if(b.getOriginalPdfBytes()!==source)throw Error('Projektet har bytts. Välj stämpeln igen.');
    const edits=b.getStampEdits().filter(x=>x.key!==item.key);edits.push({key:item.key,page:item.page,label:item.label,action});
    await b.setStampEdits(edits);clearOverlay();await showHistory();status.textContent=action==='hide'?'Stämpeln är dold i appen. Spara projekt-PDF för att behålla valet.':'Stämpeln tas bort ur PDF:en när du sparar. Du kan återställa valet här innan dess.';
   })));
  }
  async function showHistory(){
   const b=await load();clearOverlay();results.replaceChildren();const edits=b.getStampEdits();status.textContent=edits.length?'Dolda stämplar kan visas igen. En raderad stämpel kan återställas så länge den finns i den öppnade originalfilen.':'Inga dolda eller borttagna stämplar.';
   for(const e of edits){const row=document.createElement('div'),label=document.createElement('span');label.textContent=e.label+' · sida '+e.page+' · '+(e.action==='hide'?'Dold':'Borttagen');row.append(label);if(items.some(x=>x.key===e.key))row.append(btn('Återställ',()=>run(async()=>{if(b.getOriginalPdfBytes()!==source)throw Error('Projektet har bytts.');await b.setStampEdits(b.getStampEdits().filter(x=>x.key!==e.key));await showHistory();})));results.append(row);}
  }
  launch.onclick=()=>{menu.hidden=true;document.getElementById('pwToolMenuButton')?.setAttribute('aria-expanded','false');panel.hidden=false;run(begin);};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();stop();}});
  new MutationObserver(()=>{if(overlay&&bridge()?.getPage()!==selectionPage)clearOverlay();}).observe(document.getElementById('pwPageInfo'),{childList:true,subtree:true,characterData:true});
 }
 return {normalize,read,write,entries,apply,hits,verify,init};
});
