(() => {
'use strict';
const KEY='tillsyno-smartmatch10-cardfirst-v1';
const q=id=>document.getElementById(id);
const ui={};
const ids=['cardsFiles','drawingFile','scanCards','ocrCards','manualCard','sameAsCards','scanDrawing','ocrDrawing','manualStamp','approveAll','saveProject','exportProject','restoreProject','cardSourceInfo','drawingSourceInfo','status','metricCards','metricHits','metricApproved','metricIssues','cardsMeta','cardList','details','selectedBadge','viewer','viewerTitle','pageSurface','drawingCanvas','markers','pageInfo','prevPage','nextPage','manualDialog','manualForm','manualSource','manualPage','manualCode','cancelManual'];
for(const id of ids)ui[id]=q(id);
const store={sources:new Map(),cardSourceIds:[],drawingSourceId:null,cards:[],hits:[],selectedCardId:null,visiblePage:1,ocrWorker:null,ocrCache:new Map(),textCache:new Map(),renderTask:null,renderSerial:0,previewSerial:0,busy:false,manualMode:false,pageViewportScale:1};
const text=(s)=>String(s==null?'':s);
const norm=s=>text(s).normalize('NFKC').trim().toLocaleUpperCase('sv-SE').replace(/\s+/g,'');
const clean=s=>text(s).replace(/\s+/g,' ').trim();
const uid=(prefix)=>prefix+'-'+Math.random().toString(36).slice(2,10);
const sourceId=file=>[file.name,file.size,file.lastModified].join('::');
const hasStored=()=>{try{return !!localStorage.getItem(KEY)}catch(e){return false}};
function node(tag,cls,label){const n=document.createElement(tag);if(cls)n.className=cls;if(label!==undefined)n.textContent=text(label);return n}
function status(message){ui.status.textContent=message}
function busy(on){store.busy=on;setControls()}
function getCard(id){return store.cards.find(c=>c.id===id)}
function getSource(id){return store.sources.get(id)}
function isReady(){return !!store.cardSourceIds.length}
function setControls(){
 const b=store.busy,hasCards=store.cards.length>0,hasDrawing=!!getSource(store.drawingSourceId);
 ui.cardsFiles.disabled=b;ui.drawingFile.disabled=b;
 ui.scanCards.disabled=b||!isReady();
 ui.ocrCards.disabled=b||!isReady();
 ui.manualCard.disabled=b||!isReady();
 ui.sameAsCards.disabled=b||!isReady();
 ui.scanDrawing.disabled=b||!hasCards||!hasDrawing;
 ui.ocrDrawing.disabled=b||!hasCards||!hasDrawing;
 ui.manualStamp.disabled=b||!hasCards||!hasDrawing;
 ui.approveAll.disabled=b||!store.hits.some(h=>h.status!=='confirmed'&&h.cardId&&norm(h.code)===getCard(h.cardId)?.normalized);
 ui.saveProject.disabled=b||!hasCards;
 ui.exportProject.disabled=b||!hasCards;
 ui.restoreProject.disabled=b||!hasStored()||!isReady();
 ui.prevPage.disabled=b||!hasDrawing||store.visiblePage<=1;
 ui.nextPage.disabled=b||!hasDrawing||store.visiblePage>=getSource(store.drawingSourceId).doc.numPages;
 ui.cardSourceInfo.textContent=store.cardSourceIds.length?
  store.cardSourceIds.map(id=>getSource(id)?.name).join(' · '):'Inga dörrkorts-PDF:er valda.';
 ui.drawingSourceInfo.textContent=hasDrawing?getSource(store.drawingSourceId).name:'Ingen ritning vald.';
}
function metrics(){
 ui.metricCards.textContent=store.cards.length;
 ui.metricHits.textContent=store.hits.length;
 ui.metricApproved.textContent=store.hits.filter(h=>h.status==='confirmed').length;
 ui.metricIssues.textContent=store.hits.filter(h=>h.status!=='confirmed'||!h.cardId).length;
 ui.cardsMeta.textContent=store.cards.length+' identifierade';
 setControls();
}
async function loadFile(file){
 if(!file)return null;const id=sourceId(file);
 if(store.sources.has(id))return id;
 if(!window.pdfjsLib)throw Error('PDF-läsaren kunde inte laddas.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const pdf=await pdfjsLib.getDocument({data:bytes,useSystemFonts:true}).promise;
 store.sources.set(id,{id,name:file.name,size:file.size,lastModified:file.lastModified,doc:pdf});
 return id;
}
function viewportWords(pg,items){
 const vp=pg.getViewport({scale:1});
 return items.filter(item=>clean(item.str)).map(item=>{
   const t=pdfjsLib.Util.transform(vp.transform,item.transform);
   const h=Math.max(5,Math.abs(item.height||t[3]||10));
   const w=Math.max(2,Math.abs(item.width||clean(item.str).length*5));
   return {text:clean(item.str),x:t[4],y:t[5]-h,w,h};
 }).filter(w=>Number.isFinite(w.x)&&Number.isFinite(w.y));
}
function groupLines(words){
 const sorted=words.slice().sort((a,b)=>a.y-b.y||a.x-b.x),lines=[];
 for(const w of sorted){
  let line=lines.find(l=>Math.abs(l.y-w.y)<=Math.max(3,Math.min(9,w.h*.6)));
  if(!line){line={y:w.y,words:[]};lines.push(line)}
  line.words.push(w);
 }
 for(const l of lines){
  l.words.sort((a,b)=>a.x-b.x);
  l.text=l.words.map(w=>w.text).join(' ').replace(/\s+/g,' ').trim();
  l.x=Math.min(...l.words.map(w=>w.x));
  l.y=Math.min(...l.words.map(w=>w.y));
 }
 return lines.sort((a,b)=>a.y-b.y);
}
async function textLines(src,pageNo){
 const key=src.id+'@'+pageNo;
 if(store.textCache.has(key))return store.textCache.get(key);
 const pg=await src.doc.getPage(pageNo);
 const words=viewportWords(pg,(await pg.getTextContent()).items);
 const lines=groupLines(words);
 store.textCache.set(key,lines);return lines;
}
function headerCode(label){
 const str=clean(label);
 const found=str.match(/\b(?:dörrkort|dorrkort|beslagskod)\s*[:#–-]?\s*([A-ZÅÄÖ0-9]+(?:\s*[-/]\s*[A-ZÅÄÖ0-9]+)*(?:\s+[A-Z0-9]{1,2})?)/i);
 if(!found)return '';
 const code=clean(found[1]);
 return /^(SIDA|PROJEKT|OCH|SEPARAT|ÖVERSIKT)$/i.test(code)?'':code;
}
function findCardHeaders(lines,height){
 const headers=[];
 for(const l of lines){
  const code=headerCode(l.text);
  if(!code)continue;
  if(l.y>height*.82 && headers.some(h=>norm(h.code)===norm(code)))continue;
  if(headers.some(h=>norm(h.code)===norm(code)&&Math.abs(h.y-l.y)<22))continue;
  headers.push({code,y:l.y,line:l});
 }
 return headers.sort((a,b)=>a.y-b.y);
}
function parseProductRows(lines,first,last,vpW){
 const out=[];
 for(const l of lines){
  if(l.y<=first+6||l.y>=last-4)continue;
  if(/^(bygghandling|dörrkort|dorrkort|separat|projekt:|sida \d)/i.test(l.text))continue;
  const words=l.words||[];
  let best=-1,gap=0;
  for(let i=0;i<words.length-1;i++){
   const delta=words[i+1].x-(words[i].x+words[i].w);
   if(delta>gap){gap=delta;best=i}
  }
  if(best<0||gap<Math.max(17,vpW*.045))continue;
  const label=clean(words.slice(0,best+1).map(w=>w.text).join(' '));
  const value=clean(words.slice(best+1).map(w=>w.text).join(' '));
  if(!label||!value||label.length>65||value.length>120||out.length>=50)continue;
  out.push({id:uid('prod'),label,value});
 }
 return out;
}
function makeCards(src,pageNo,lines,origin){
 const vp=(src.pageInfo&&src.pageInfo[pageNo])||null;
 const pageHeight=vp?.height||842,pageWidth=vp?.width||596;
 const heads=findCardHeaders(lines,pageHeight),out=[];
 for(let i=0;i<heads.length;i++){
  const h=heads[i],next=heads[i+1];
  const below=next?next.y:pageHeight;
  const products=parseProductRows(lines,h.y,below,pageWidth);
  const card={id:uid('card'),sourceId:src.id,page:pageNo,code:h.code,normalized:norm(h.code),origin,products,reviewed:false,top:h.y,bottom:below};
  out.push(card);
 }
 return out;
}
async function scanCards(mode){
 if(!isReady())return;
 busy(true);let added=0,pages=0;
 try{
  if(mode==='text'){store.cards=[];store.hits=[];store.selectedCardId=null}
  for(const id of store.cardSourceIds){
   const src=getSource(id);
   for(let page=1;page<=src.doc.numPages;page++){
    const old=store.cards.filter(c=>c.sourceId===id&&c.page===page);
    if(mode==='ocr'&&old.length)continue;
    status('Läser '+src.name+' · sida '+page+'/'+src.doc.numPages+(mode==='ocr'?' som bild':' som PDF-text')+' …');
    const pg=await src.doc.getPage(page);
    const vp=pg.getViewport({scale:1});src.pageInfo??={};src.pageInfo[page]={width:vp.width,height:vp.height};
    const lines=mode==='ocr'?await ocrLines(src,page):await textLines(src,page);
    const cards=makeCards(src,page,lines,mode);
    if(cards.length){
     const seen=new Set(store.cards.filter(c=>c.sourceId===id&&c.page===page).map(c=>c.normalized));
     for(const c of cards)if(!seen.has(c.normalized)){store.cards.push(c);seen.add(c.normalized);added++}
    }
    pages++;
   }
  }
  store.cards.sort((a,b)=>a.code.localeCompare(b.code,'sv')||a.page-b.page);
  if(!store.selectedCardId&&store.cards.length)store.selectedCardId=store.cards[0].id;
  renderCards();renderDetails();metrics();
  status('Dörrkortsregistret: '+store.cards.length+' kort. '+added+' nya kort i den här avläsningen. Kontrollera beteckningarna innan ritningen matchas.');
  persist();
 }catch(err){status('Kortavläsningen kunde inte slutföras: '+err.message)}
 finally{busy(false)}
}
let ocrLibPromise=null;
async function ocrWorker(){
 if(store.ocrWorker)return store.ocrWorker;
 if(!ocrLibPromise)ocrLibPromise=new Promise((resolve,reject)=>{
  if(window.Tesseract?.createWorker)return resolve(window.Tesseract);
  const tag=document.createElement('script');
  tag.src=new URL('vendor/tesseract/tesseract.min.js',document.baseURI).href;
  tag.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(Error('Bildläsningen kunde inte starta.'));
  tag.onerror=()=>reject(Error('OCR-biblioteket saknas.'));
  document.head.append(tag);
 }).catch(err=>{ocrLibPromise=null;throw err});
 const T=await ocrLibPromise;
 store.ocrWorker=await T.createWorker(['swe','eng'],1,{
  workerPath:new URL('vendor/tesseract/worker.min.js',document.baseURI).href,
  corePath:new URL('vendor/tesseract/tesseract-core-lstm.wasm.js',document.baseURI).href,
  langPath:new URL('vendor/tesseract/lang/',document.baseURI).href,
  workerBlobURL:false,gzip:true,cachePath:'tillsyno-smartmatch10-ocr'
 });
 return store.ocrWorker;
}
async function ocrLines(src,pageNo){
 const key=src.id+'@'+pageNo;
 if(store.ocrCache.has(key))return store.ocrCache.get(key);
 const page=await src.doc.getPage(pageNo),vp1=page.getViewport({scale:1});
 const scale=Math.min(2,1750/Math.max(vp1.width,vp1.height));
 const viewport=page.getViewport({scale});
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));
 await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport}).promise;
 const worker=await ocrWorker();
 const result=await worker.recognize(canvas,{}, {text:true,blocks:true,tsv:true,hocr:true});
 const words=[];
 const pushWord=(t,x,y,w,h)=>{
  if(!clean(t))return;
  const vals=[x,y,w,h].map(Number);
  if(vals.some(v=>!Number.isFinite(v)))return;
  words.push({text:clean(t),x:vals[0]/scale,y:vals[1]/scale,w:Math.max(1,vals[2]/scale),h:Math.max(1,vals[3]/scale)});
 };
 for(const b of result.data?.blocks||[])for(const para of b.paragraphs||[])for(const line of para.lines||[])for(const w of line.words||[]){
  if(!w.bbox)continue;
  pushWord(w.text,w.bbox.x0,w.bbox.y0,w.bbox.x1-w.bbox.x0,w.bbox.y1-w.bbox.y0);
 }
 // Tesseract can return HOCR/TSV instead of blocks, depending on its build.
 // Parse word coordinates so an image-only GS stamp still gets a real position.
 if(!words.length&&typeof result.data?.tsv==='string'){
  const rows=result.data.tsv.split(/\r?\n/);
  for(const row of rows.slice(1)){
   const cols=row.split('\t');
   if(cols.length<12||cols[0]!=='5')continue;
   pushWord(cols.slice(11).join('\t'),Number(cols[6]),Number(cols[7]),Number(cols[8]),Number(cols[9]));
  }
 }
 if(!words.length&&typeof result.data?.hocr==='string'&&typeof DOMParser!=='undefined'){
  const doc=new DOMParser().parseFromString(result.data.hocr,'text/html');
  for(const el of doc.querySelectorAll('.ocrx_word')){
   const box=(el.getAttribute('title')||'').match(/bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
   if(box)pushWord(el.textContent,Number(box[1]),Number(box[2]),Number(box[3])-Number(box[1]),Number(box[4])-Number(box[2]));
  }
 }
 const lines=groupLines(words);
 if(!lines.length){
  // Fallback may identify card titles but never invents marker coordinates.
  (result.data?.text||'').split(/\r?\n/).map(clean).filter(Boolean).forEach((line,i)=>lines.push({text:line,words:[],x:0,y:i*16+20}));
 }
 store.ocrCache.set(key,lines);return lines;
}
function matchingCards(code){return store.cards.filter(c=>c.normalized===norm(code))}
function createHit(src,pageNo,code,rect,origin,positionId){
 const normalized=norm(code);
 const matches=matchingCards(code);
 const hit={
  id:uid('hit'),sourceId:src.id,page:pageNo,code:clean(code),normalized,
  x:Math.max(0,rect.x),y:Math.max(0,rect.y),w:Math.max(3,rect.w),h:Math.max(5,rect.h),
  origin,positionId:positionId||'',cardId:matches.length===1?matches[0].id:null,
  status:matches.length>1?'ambiguous':'pending',check:'Ej kontrollerad',note:''
 };
 return hit;
}
function dedupHits(hits){
 const out=[];
 for(const h of hits.sort((a,b)=>a.page-b.page||a.y-b.y||a.x-b.x)){
  const near=out.find(x=>x.sourceId===h.sourceId&&x.page===h.page&&x.normalized===h.normalized&&Math.abs(x.x-h.x)<15&&Math.abs(x.y-h.y)<15);
  if(!near)out.push(h);
  else if(near.origin==='ocr'&&h.origin!=='ocr'){near.origin=h.origin;near.x=h.x;near.y=h.y;near.w=h.w;near.h=h.h}
 }
 return out;
}
function positionFrom(lines,current){
 let best='',score=Infinity;
 for(const l of lines)for(const w of l.words||[]){
  if(!/^[A-Z]?\d+(?:[-.]\d+){1,}$/i.test(w.text))continue;
  const dy=current.y-w.y,dx=Math.abs((current.x+current.w/2)-(w.x+w.w/2));
  if(dy<4||dy>47||dx>45)continue;
  const s=dy+dx/2;if(s<score){best=w.text;score=s}
 }
 return best;
}
function readHitsFromLines(src,pageNo,lines,origin,excludedPages){
 const hits=[],known=new Set(store.cards.map(c=>c.normalized));
 if(excludedPages.has(pageNo))return hits;
 for(const l of lines){
  const words=l.words||[];
  for(let i=0;i<words.length;i++){
   let current={x:words[i].x,y:words[i].y,w:words[i].w,h:words[i].h};
   for(let count=1;count<=Math.min(3,words.length-i);count++){
    if(count>1){
     const last=words[i+count-2],next=words[i+count-1];
     if(next.x-(last.x+last.w)>Math.max(15,last.h*1.2))break;
     current.w=Math.max(2,next.x+next.w-current.x);
    }
    const str=words.slice(i,i+count).map(w=>w.text).join(' ');
    if(!known.has(norm(str)))continue;
    const hit=createHit(src,pageNo,str,current,origin,positionFrom(lines,current));
    hits.push(hit);
    break;
   }
  }
 }
 return dedupHits(hits);
}
async function readAnnotationHits(src,pageNo,pg){
 const out=[];
 const vp=pg.getViewport({scale:1});
 const known=new Set(store.cards.map(c=>c.normalized));
 let annotations=[];
 try{annotations=await pg.getAnnotations({intent:'display'})}catch(e){return out}
 for(const a of annotations){
  let value=clean([a.contents,a.title,a.fieldValue].filter(Boolean).join(' '));
  if(!value)continue;
  let code='',exact=norm(value);
  if(known.has(exact))code=value;
  if(!code){
   const codeTokens=value.match(/[\p{L}\d]+(?:\s*[-/]\s*[\p{L}\d]+)*/gu)||[];
   const options=codeTokens.filter(tok=>known.has(norm(tok)));
   if(options.length===1)code=options[0];
  }
  if(!code||!Array.isArray(a.rect))continue;
  const r=vp.convertToViewportRectangle(a.rect);
  out.push(createHit(src,pageNo,code,{x:Math.min(r[0],r[2]),y:Math.min(r[1],r[3]),w:Math.abs(r[2]-r[0]),h:Math.abs(r[3]-r[1])},'annotation',''));
 }
 return out;
}
async function scanDrawing(mode){
 const src=getSource(store.drawingSourceId);if(!src||!store.cards.length)return;
 busy(true);
 try{
  const excluded=new Set(store.cards.filter(c=>c.sourceId===src.id).map(c=>c.page));
  const candidates=mode==='text'?[]:store.hits.slice();
  for(let i=1;i<=src.doc.numPages;i++){
   if(excluded.has(i))continue;
   status('Söker '+(mode==='ocr'?'bildstämplar':'PDF-text och stämplar')+' · sida '+i+'/'+src.doc.numPages+' …');
   const pg=await src.doc.getPage(i);
   const lines=mode==='ocr'?await ocrLines(src,i):await textLines(src,i);
   const next=readHitsFromLines(src,i,lines,mode,excluded);
   if(mode==='text')next.push(...await readAnnotationHits(src,i,pg));
   candidates.push(...next);
  }
  const unique=dedupHits(candidates);
  // Never remove a manually confirmed link merely because a scan method differs.
  for(const h of unique){
   const old=store.hits.find(x=>x.sourceId===h.sourceId&&x.page===h.page&&x.normalized===h.normalized&&Math.abs(x.x-h.x)<15&&Math.abs(x.y-h.y)<15);
   if(old){h.id=old.id;h.cardId=old.cardId;h.status=old.status;h.check=old.check;h.note=old.note;h.positionId=old.positionId||h.positionId}
  }
  store.hits=unique;
  const ambiguous=store.hits.filter(h=>!h.cardId).length;
  store.visiblePage=Math.min(Math.max(1,store.visiblePage),src.doc.numPages);
  metrics();renderCards();renderDetails();await renderDrawing();persist();
  status('Hittade '+store.hits.length+' kandidatpositioner. '+ambiguous+' saknar entydigt dörrkort. Granska förslagen; inga kopplingar godkänns utan ditt beslut.');
 }catch(err){status('Ritningssökningen avbröts: '+err.message)}
 finally{busy(false)}
}
function renderCards(){
 ui.cardList.replaceChildren();
 if(!store.cards.length){ui.cardList.append(node('p','muted','Inga dörrkort hittade. Prova bildläsning eller lägg till ett kort manuellt.'));return}
 for(const c of store.cards){
  const linked=store.hits.filter(h=>h.cardId===c.id),approved=linked.filter(h=>h.status==='confirmed').length;
  const btn=node('button','cardButton');btn.type='button';btn.setAttribute('aria-current',String(c.id===store.selectedCardId));
  const left=node('span');left.append(node('strong','',c.code),node('small','',getSource(c.sourceId)?.name+' · sida '+c.page));
  btn.append(left,node('span','pill'+(!c.reviewed?' warn':''),approved+'/'+linked.length+' positioner'));
  btn.addEventListener('click',()=>{store.selectedCardId=c.id;renderCards();renderDetails()});
  ui.cardList.append(btn);
 }
}
function makeButton(label,action){const b=node('button','',label);b.type='button';b.addEventListener('click',action);return b}
function updateCard(c){
 c.reviewed=true;persist();renderCards();renderDetails();
}
function renderDetails(){
 const c=getCard(store.selectedCardId);ui.details.replaceChildren();ui.selectedBadge.textContent='';
 if(!c){ui.details.append(node('p','muted','Välj ett dörrkort till vänster.'));return}
 ui.selectedBadge.append(node('span','pill'+(!c.reviewed?' warn':''),c.reviewed?'Granskat':'Behöver granskas'));
 ui.details.append(node('h3','',c.code));
 const sub=node('p','small','Original: '+getSource(c.sourceId)?.name+' · PDF-sida '+c.page+' · källa: '+(c.origin==='ocr'?'bildläsning':c.origin==='manual'?'manuell':'PDF-text'));
 ui.details.append(sub);
 const controls=node('div','row');
 controls.append(makeButton(c.reviewed?'✓ Kort granskat':'Godkänn kortets beteckning',()=>{updateCard(c);metrics()}));
 controls.append(makeButton('Ändra beteckning',()=>{
  const edited=prompt('Ny dörrkortsbeteckning. Kopplingar till det gamla namnet måste granskas igen.',c.code);
  if(edited===null)return;const next=clean(edited);if(!next)return;
  c.code=next;c.normalized=norm(next);c.reviewed=false;
  for(const h of store.hits.filter(h=>h.cardId===c.id)){if(h.normalized!==c.normalized){h.status='pending';h.cardId=null}}
  persist();renderCards();renderDetails();metrics();renderDrawing();
 }));
 controls.append(makeButton('Ta bort felaktigt kort',()=>{
  if(!confirm('Ta bort '+c.code+' från detta testregister? Original-PDF:en ändras inte.'))return;
  store.cards=store.cards.filter(card=>card.id!==c.id);
  for(const h of store.hits)if(h.cardId===c.id){h.cardId=null;h.status='pending'}
  store.selectedCardId=store.cards[0]?.id||null;
  persist();renderCards();renderDetails();metrics();renderDrawing();
 }));
 ui.details.append(controls);
 ui.details.append(node('h3','','Originaldörrkort'));
 const preview=node('div','preview');const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Originalets dörrkort på sida '+c.page);
 preview.append(canvas);ui.details.append(preview);void renderOriginal(c,canvas);
 ui.details.append(node('h3','','Produkter och arbetsuppgifter'));
 if(!c.products.length)ui.details.append(node('p','small','Inga produktrader lästa. De kan fyllas i manuellt.'));
 const table=node('table');const head=node('thead');const hrow=node('tr');hrow.append(node('th','','Avsnitt'),node('th','','Produkt/uppgift'),node('th','',''));head.append(hrow);table.append(head);
 const tbody=node('tbody');table.append(tbody);
 for(const row of c.products){
  const tr=node('tr'),a=node('td'),b=node('td'),action=node('td');
  const label=node('input');label.value=row.label;label.setAttribute('aria-label','Avsnitt');label.addEventListener('change',()=>{row.label=label.value;updateCard(c)});
  const val=node('input');val.value=row.value;val.setAttribute('aria-label','Produkt');val.addEventListener('change',()=>{row.value=val.value;updateCard(c)});
  a.append(label);b.append(val);action.append(makeButton('×',()=>{c.products=c.products.filter(p=>p.id!==row.id);updateCard(c)}));
  tr.append(a,b,action);tbody.append(tr);
 }
 ui.details.append(table);
 ui.details.append(makeButton('+ Lägg till produktrad',()=>{c.products.push({id:uid('prod'),label:'',value:''});updateCard(c)}));
 ui.details.append(node('h3','','Kopplade ritningspositioner'));
 const hits=store.hits.filter(h=>h.cardId===c.id);
 const ambiguous=store.hits.filter(h=>!h.cardId&&h.normalized===c.normalized);
 if(!hits.length&&!ambiguous.length)ui.details.append(node('p','small','Inga positioner hittade för detta dörrkort.'));
 for(const h of [...hits,...ambiguous]){
  const row=node('div','positionRow'),name=node('span','',h.positionId||h.code);
  name.append(node('small','', 'Ritningssida '+h.page+' · '+(h.status==='confirmed'?'Matchad':h.status==='ambiguous'?'Flera möjliga kort':'Föreslagen')));
  row.append(name);
  const actions=node('div','positionActions');
  actions.append(makeButton('Visa',()=>goToPosition(h)));
  if(!h.cardId){
   actions.append(makeButton('Välj detta kort',()=>{h.cardId=c.id;h.status='pending';persist();renderCards();renderDetails();metrics();renderDrawing()}));
  }else if(h.status!=='confirmed'){
   actions.append(makeButton('Godkänn',()=>{h.status='confirmed';persist();renderCards();renderDetails();metrics();renderDrawing()}));
  }else{
   const s=node('select');s.setAttribute('aria-label','Kontrollstatus för '+(h.positionId||h.code));
   for(const value of ['Ej kontrollerad','Klar','Anmärkning','Ej godkänd']){const o=node('option','',value);o.value=value;s.append(o)}
   s.value=h.check||'Ej kontrollerad';s.addEventListener('change',()=>{h.check=s.value;persist()});actions.append(s);
  }
  row.append(actions);ui.details.append(row);
 }
}
async function renderOriginal(card,canvas){
 const stamp=++store.previewSerial,src=getSource(card.sourceId);if(!src)return;
 try{
  const pg=await src.doc.getPage(card.page),one=pg.getViewport({scale:1});
  const scale=Math.min(1.25,310/one.width);
  const vp=pg.getViewport({scale});if(stamp!==store.previewSerial)return;
  canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
  await pg.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:vp}).promise;
 }catch(err){canvas.replaceWith(node('p','review','Förhandsbilden kunde inte visas: '+err.message))}
}
async function renderDrawing(){
 const src=getSource(store.drawingSourceId),seq=++store.renderSerial;
 if(!src){ui.pageSurface.hidden=true;ui.pageInfo.textContent='– / –';return}
 try{
  const p=Math.max(1,Math.min(store.visiblePage,src.doc.numPages));store.visiblePage=p;
  ui.viewerTitle.textContent='Ritning · '+src.name;
  ui.pageInfo.textContent=p+' / '+src.doc.numPages;
  ui.pageSurface.hidden=false;
  const pg=await src.doc.getPage(p),basic=pg.getViewport({scale:1});
  if(seq!==store.renderSerial)return;
  const usable=Math.max(260,Math.min(900,ui.viewer.clientWidth-44));
  const zoom=Math.min(1.8,usable/basic.width),vp=pg.getViewport({scale:zoom});store.pageViewportScale=zoom;
  const canvas=ui.drawingCanvas,dpr=Math.min(window.devicePixelRatio||1,2);
  if(store.renderTask)try{store.renderTask.cancel()}catch(e){}
  canvas.width=Math.ceil(vp.width*dpr);canvas.height=Math.ceil(vp.height*dpr);
  canvas.style.width=vp.width+'px';canvas.style.height=vp.height+'px';
  ui.pageSurface.style.width=vp.width+'px';ui.pageSurface.style.height=vp.height+'px';
  const cx=canvas.getContext('2d',{alpha:false});cx.setTransform(dpr,0,0,dpr,0,0);
  const task=pg.render({canvasContext:cx,viewport:vp});store.renderTask=task;
  try{await task.promise}catch(err){if(err.name==='RenderingCancelledException')return;throw err}
  if(seq!==store.renderSerial)return;
  ui.markers.replaceChildren();
  const hits=store.hits.filter(h=>h.sourceId===src.id&&h.page===p);
  for(const h of hits){
   const b=node('button','marker',h.positionId||h.code);
   b.type='button';b.setAttribute('data-status',h.status);
   b.style.left=Math.min(98,Math.max(2,100*(h.x+h.w/2)/basic.width))+'%';
   b.style.top=Math.min(98,Math.max(2,100*(h.y+h.h/2)/basic.height))+'%';
   b.title=(h.positionId||h.code)+' · '+h.code+' · '+(h.status==='confirmed'?'godkänd':'väntar på granskning');
   b.addEventListener('click',()=>openHit(h));ui.markers.append(b);
  }
  setControls();
 }catch(err){status('Ritningen kunde inte visas: '+err.message)}
}
function openHit(hit){
 const c=getCard(hit.cardId);
 if(c){store.selectedCardId=c.id;renderCards();renderDetails();return}
 const candidates=matchingCards(hit.code);
 if(candidates.length===1){hit.cardId=candidates[0].id;store.selectedCardId=hit.cardId;hit.status='pending';persist();renderCards();renderDetails();renderDrawing();return}
 if(candidates.length>1){
  const lines=candidates.map((c,i)=>(i+1)+': '+c.code+' · '+getSource(c.sourceId)?.name+' sida '+c.page);
  const pick=prompt('Samma beteckning finns på flera dörrkort. Välj rätt original:\n'+lines.join('\n'),'');
  const choice=candidates[Number(pick)-1];if(!choice)return;
  hit.cardId=choice.id;hit.status='pending';store.selectedCardId=choice.id;
  persist();renderCards();renderDetails();renderDrawing();
 }
}
async function goToPosition(hit){store.visiblePage=hit.page;await renderDrawing();ui.viewer.scrollIntoView({behavior:'smooth',block:'center'})}
function approveAll(){
 const ambiguous=store.hits.filter(h=>!h.cardId).length;
 const pending=store.hits.filter(h=>h.cardId&&h.status!=='confirmed'&&getCard(h.cardId)?.reviewed&&h.normalized===getCard(h.cardId).normalized);
 if(!pending.length){status('Granska dörrkortsnamnen först eller välj rätt kort för osäkra positioner.');return}
 if(!confirm('Godkänn '+pending.length+' entydiga kopplingar till granskade dörrkort? Kontrollstatus per fysisk dörr förblir separat.'))return;
 for(const h of pending)h.status='confirmed';
 persist();renderCards();renderDetails();metrics();renderDrawing();
 status('Godkände '+pending.length+' ritningskopplingar. '+ambiguous+' tvetydiga stämplar kvar att granska.');
}
function snapshot(){
 return {format:'smartmatch10-cardfirst-v1',savedAt:new Date().toISOString(),
  sources:store.cardSourceIds.map(id=>{const s=getSource(id);return {id,name:s.name,size:s.size,lastModified:s.lastModified}}),
  drawingSourceId:store.drawingSourceId,
  cards:store.cards.map(c=>({...c})),hits:store.hits.map(h=>({...h})),selectedCardId:store.selectedCardId,visiblePage:store.visiblePage};
}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(snapshot()))}catch(err){status('Lokalt sparande misslyckades. Exportera projektdata och kontrollera webbläsarens lagringsutrymme.')}
}
function restore(){
 let saved=null;
 try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
 if(saved?.format!=='smartmatch10-cardfirst-v1'||!Array.isArray(saved.cards))return status('Ingen giltig SmartMatch 10-sparning hittades.');
 const missing=(saved.sources||[]).filter(s=>!store.sources.has(s.id));
 if(missing.length)return status('Välj först samma original-PDF:er som förra gången: '+missing.map(s=>s.name).join(', '));
 if(saved.drawingSourceId&&!getSource(saved.drawingSourceId))return status('Välj först ritningsfilen från sparningen.');
 if(store.cards.length&&!confirm('Återställa tidigare dörrkort och kopplingar? Nuvarande osparade testresultat ersätts.'))return;
 store.cardSourceIds=(saved.sources||[]).map(s=>s.id);
 store.drawingSourceId=saved.drawingSourceId||null;
 store.cards=saved.cards;store.hits=saved.hits||[];
 store.selectedCardId=saved.selectedCardId||store.cards[0]?.id||null;
 store.visiblePage=saved.visiblePage||1;
 metrics();renderCards();renderDetails();renderDrawing();
 status('Återställde '+store.cards.length+' dörrkort och '+store.hits.length+' positioner utan att bildläsa filerna igen.');
}
function exportData(){
 const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=node('a');a.href=url;a.download='smartmatch10-projektdata.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
 status('Projektdata exporterad som en separat JSON-kopia. Original-PDF:erna ingår inte i exporten och har inte ändrats.');
}
function manualOpen(){
 ui.manualSource.replaceChildren();
 for(const id of store.cardSourceIds){const s=getSource(id),o=node('option','',s.name);o.value=id;ui.manualSource.append(o)}
 ui.manualPage.value='1';ui.manualCode.value='';ui.manualDialog.showModal();
}
function manualSubmit(event){
 event.preventDefault();
 const id=ui.manualSource.value,s=getSource(id),page=Number(ui.manualPage.value),code=clean(ui.manualCode.value);
 if(!s||!code||page<1||page>s.doc.numPages)return status('Ange giltig sida och beteckning.');
 const card={id:uid('card'),sourceId:id,page,code,normalized:norm(code),origin:'manual',products:[],reviewed:false,top:0,bottom:0};
 store.cards.push(card);store.selectedCardId=card.id;
 ui.manualDialog.close();renderCards();renderDetails();metrics();persist();
 status('Lade till dörrkort '+code+' på sida '+page+'. Kontrollera originalet och godkänn beteckningen.');
}
async function handleCards(event){
 const files=Array.from(event.target.files||[]);
 if(!files.length)return;
 busy(true);
 try{
  store.cardSourceIds=[];
  for(const file of files){status('Öppnar '+file.name+' …');const id=await loadFile(file);store.cardSourceIds.push(id)}
  store.cards=[];store.hits=[];store.selectedCardId=null;
  status('Öppnade '+files.length+' dörrkorts-PDF:er. Tryck Hitta alla dörrkort.');
  metrics();renderCards();renderDetails();
 }catch(err){status('Kunde inte öppna PDF: '+err.message)}
 finally{busy(false)}
}
async function handleDrawing(event){
 const file=event.target.files?.[0];if(!file)return;
 busy(true);
 try{status('Öppnar ritning '+file.name+' …');
  store.drawingSourceId=await loadFile(file);store.hits=[];store.visiblePage=1;
  status('Ritningen är vald. Tryck Hitta märkningar för att jämföra med dörrkortsregistret.');
  metrics();renderCards();renderDetails();await renderDrawing();
 }catch(err){status('Ritningsfilen kunde inte öppnas: '+err.message)}
 finally{busy(false)}
}
function init(){
 if(init.started)return;init.started=true;
 try{pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js'}catch(err){}
 ui.cardsFiles.addEventListener('change',e=>void handleCards(e));
 ui.drawingFile.addEventListener('change',e=>void handleDrawing(e));
 ui.scanCards.addEventListener('click',()=>void scanCards('text'));
 ui.ocrCards.addEventListener('click',()=>void scanCards('ocr'));
 ui.manualCard.addEventListener('click',manualOpen);
 ui.sameAsCards.addEventListener('click',()=>{store.drawingSourceId=store.cardSourceIds[0]||null;store.hits=[];store.visiblePage=1;metrics();renderDrawing();status('Samma PDF används som ritning. Kortsidor hoppas över när stämplarna söks.')});
 ui.scanDrawing.addEventListener('click',()=>void scanDrawing('text'));
 ui.ocrDrawing.addEventListener('click',()=>void scanDrawing('ocr'));
 ui.manualStamp.addEventListener('click',()=>{
  store.manualMode=!store.manualMode;
  ui.manualStamp.textContent=store.manualMode?'Avbryt stämpelmarkering':'+ Markera stämpel';
  status(store.manualMode?'Klicka mitt på den stämpel som ska kopplas. Originalritningen ändras inte.':'Manuell stämpelmarkering avbruten.');
 });
 ui.drawingCanvas.addEventListener('click',event=>{
  if(!store.manualMode||store.busy)return;
  const box=ui.drawingCanvas.getBoundingClientRect();
  if(!box.width||!box.height)return;
  const src=getSource(store.drawingSourceId);if(!src)return;
  const x=(event.clientX-box.left)/store.pageViewportScale;
  const y=(event.clientY-box.top)/store.pageViewportScale;
  const selected=getCard(store.selectedCardId);
  const code=clean(prompt('Vilken dörrkortsbeteckning står på stämpeln?',selected?.code||''));
  if(!code)return;
  const cardOptions=matchingCards(code);
  if(!cardOptions.length){status('Det finns inget dörrkort med beteckningen '+code+'. Lägg till kortet först.');return}
  const number=clean(prompt('Fysisk dörrposition/objektnummer, om det finns (valfritt):','')||'');
  const hit=createHit(src,store.visiblePage,code,{x:x-10,y:y-8,w:20,h:16},'manual',number);
  const nearby=store.hits.find(h=>h.page===hit.page&&h.sourceId===hit.sourceId&&h.normalized===hit.normalized&&Math.abs(h.x-hit.x)<14&&Math.abs(h.y-hit.y)<14);
  if(nearby){status('Det finns redan en träff på den platsen. Markera den befintliga kopplingen för granskning.');return}
  store.hits.push(hit);
  store.manualMode=false;ui.manualStamp.textContent='+ Markera stämpel';
  if(hit.cardId)store.selectedCardId=hit.cardId;
  persist();renderCards();renderDetails();metrics();renderDrawing();
  status('Manuell stämpel '+code+' tillagd på sida '+hit.page+'. Godkänn kopplingen under rätt dörrkort.');
 });
 ui.approveAll.addEventListener('click',approveAll);
 ui.saveProject.addEventListener('click',()=>{persist();status('SmartMatch 10-projektdata sparad lokalt. Behåll originalfilerna; de ändras inte och måste väljas igen efter omladdning.')});
 ui.exportProject.addEventListener('click',exportData);
 ui.restoreProject.addEventListener('click',restore);
 ui.prevPage.addEventListener('click',()=>{store.visiblePage--;renderDrawing()});
 ui.nextPage.addEventListener('click',()=>{store.visiblePage++;renderDrawing()});
 ui.manualForm.addEventListener('submit',manualSubmit);
 ui.cancelManual.addEventListener('click',()=>ui.manualDialog.close());
 let resizeTimer;
 window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>void renderDrawing(),180)});
 setControls();
 if(hasStored())status('SmartMatch 10 är öppnad. Välj original-PDF:erna så kan tidigare sparat arbete återställas utan ny bildläsning.');
}
window.addEventListener('tillsyno-authorized',init,{once:true});
if(window.TillsynoCurrentAccess)init();
})();