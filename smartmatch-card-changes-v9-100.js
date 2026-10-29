/* Draw position-local change marks over the original PDF card. Geometry is
 * expressed in the same scale-1, rotated page viewport as the reader's words. */
(function(root){
 'use strict';
 const key=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('sv').replace(/[^\p{L}\p{N}]/gu,'');
 const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]||0;};
 function wordsFrom(input){
  const out=[];
  for(const item of input||[]){
   const text=String(item.text??item.str??'').trim(),x=Number(item.x),y=Number(item.y),w=Number(item.w??item.width),h=Number(item.h??item.height);
   if(!key(text)||![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)continue;
   const word={text,x,y,w,h,cx:x+w/2,cy:y+h/2};
   if(!out.some(old=>key(old.text)===key(text)&&Math.abs(old.cy-word.cy)<Math.min(old.h,h)*.45&&Math.abs(old.cx-word.cx)<Math.max(Math.min(old.h,h)*.45,Math.min(old.w,w)*.25)))out.push(word);
  }
  return out;
 }
 function rowsFrom(input){
  const rows=[];
  for(const word of wordsFrom(input).sort((a,b)=>a.cy-b.cy||a.x-b.x)){
   const last=rows.at(-1);
   if(last&&Math.abs(last.cy-word.cy)<=Math.max(Math.min(word.h,last.h)*.48,median([word.h,last.h])*.25)){
    last.words.push(word);last.cy=median(last.words.map(w=>w.cy));last.h=median(last.words.map(w=>w.h));
   }else rows.push({words:[word],cy:word.cy,h:word.h});
  }
  return rows.map((row,index)=>({...row,index,words:row.words.sort((a,b)=>a.x-b.x)}));
 }
 function bounds(words){
  const x=Math.min(...words.map(w=>w.x)),y=Math.min(...words.map(w=>w.y));
  return {x,y,w:Math.max(...words.map(w=>w.x+w.w))-x,h:Math.max(...words.map(w=>w.y+w.h))-y};
 }
 function spans(words,value){
  const target=key(value);if(!target)return [];
  // PDF.js may return an entire cell or visual line as one text item.
  const tokens=words.flatMap(word=>{const parts=[...word.text.matchAll(/\S+/g)];return parts.map(part=>({...word,text:part[0],x:word.x+word.w*part.index/word.text.length,w:word.w*part[0].length/word.text.length}));});
  const found=[];
  for(let i=0;i<tokens.length;i++){
   let text='';const selected=[];
   for(let j=i;j<tokens.length;j++){
    text+=key(tokens[j].text);selected.push(tokens[j]);
    if(text===target){found.push(bounds(selected));break;}
    if(text.length>=target.length||!target.startsWith(text))break;
   }
  }
  return found;
 }
 function sourceFor(card,change){
  if(change.source==='custom')return null;
  const items=card?.workItems||[];
  return items.find(item=>item.key===change.key)||items.find(item=>change.sourceIdentity&&item.sourceIdentity===change.sourceIdentity)||
   (card?.products||[]).find(item=>change.sourceIdentity&&item.sourceIdentity===change.sourceIdentity)||change;
 }
 function candidateBoxes(rows,source){
  const candidates=[];
  const add=group=>{
   const words=group.flatMap(row=>row.words),labels=spans(words,source.label),values=spans(words,source.value);
   if(source.label&&source.value){
    for(const label of labels){
     // Pair a component with its own product to the right, never a product
     // in a second table further across the same page.
     const nearby=values.filter(value=>value.x>=label.x+label.w*.6).sort((a,b)=>a.x-b.x);
     if(nearby.length){const value=nearby[0];if(labels.some(other=>other!==label&&other.x>label.x&&other.x<value.x))continue;candidates.push(bounds([label,value]));}
    }
   }else for(const box of source.value?values:labels)candidates.push(box);
  };
  rows.forEach(row=>add([row]));
  // A source row may wrap into several physical text lines. Only join the
  // exact row indices saved by the reader, and verify the product text again.
  if(!candidates.length&&Array.isArray(source.sourceRows)&&source.sourceRows.length>1){
   const selected=rows.filter(row=>source.sourceRows.includes(row.index));
   if(selected.length===source.sourceRows.length)add(selected);
  }
  return candidates;
 }
 function locate(card,changes,input,pageSize){
  const region=card?.bounds||{x:0,y:0,w:1,h:1},width=pageSize.width,height=pageSize.height;
  const words=wordsFrom(input).filter(w=>w.cx>=region.x*width&&w.cx<=(region.x+region.w)*width&&w.cy>=region.y*height&&w.cy<=(region.y+region.h)*height);
  const rows=rowsFrom(words),marks=[],unplaced=[];
  for(const change of changes){
   const source=sourceFor(card,change);
   if(!source){unplaced.push({...change,reason:'Tillagd produkt saknas i originalet'});continue;}
   let boxes=candidateBoxes(rows,source);
   if(boxes.length>1&&Number.isFinite(Number(source.sourceY))){
    const near=boxes.filter(box=>Math.abs(box.y+box.h/2-Number(source.sourceY))<=Math.max(4,box.h*1.5));
    if(near.length===1)boxes=near;
   }
   if(boxes.length!==1){unplaced.push({...change,reason:boxes.length?'Flera möjliga rader i originalet':'Raden kunde inte placeras i originalet'});continue;}
   const box=boxes[0],pad=Math.min(2,box.h*.2),left=Math.max(0,box.x-pad),top=Math.max(0,box.y-pad);
   marks.push({change,rect:{x:left/width,y:top/height,w:(Math.min(width,box.x+box.w+pad)-left)/width,h:(Math.min(height,box.y+box.h+pad)-top)/height}});
  }
  return {marks,unplaced};
 }
 const pageCache=new WeakMap();
 async function pageWords(page){
  if(!pageCache.has(page))pageCache.set(page,(async()=>{
   const viewport=page.getViewport({scale:1}),content=await page.getTextContent();
   const items=root.SmartMatchReadText?.joinNativeContent?.(content)?.items||content.items;
   return items.filter(item=>item.str?.trim()).map(item=>{
    const h=Math.max(1,item.height||Math.hypot(item.transform[2],item.transform[3])),x=item.transform[4],y=item.transform[5],w=Math.max(1,item.width||1);
    const r=viewport.convertToViewportRectangle([x,y-h*.25,x+w,y+h*.95]);
    return {text:item.str,x:Math.min(r[0],r[2]),y:Math.min(r[1],r[3]),w:Math.abs(r[2]-r[0]),h:Math.abs(r[3]-r[1])};
   });
  })());
  try{return await pageCache.get(page);}catch(error){pageCache.delete(page);throw error;}
 }
 async function resolve(page,card,changes){
  const size=page.getViewport({scale:1}),result=locate(card,changes,card?.tableWords||[],size);
  if(!result.unplaced.some(change=>change.source!=='custom'))return result;
  try{
   const fallback=locate(card,result.unplaced,await pageWords(page),size);
   return {marks:[...result.marks,...fallback.marks],unplaced:fallback.unplaced};
  }catch(_){return result;}
 }
 function crop(rect,region){
  const x=Math.max(rect.x,region.x),y=Math.max(rect.y,region.y),right=Math.min(rect.x+rect.w,region.x+region.w),bottom=Math.min(rect.y+rect.h,region.y+region.h);
  return right>x&&bottom>y?{x:(x-region.x)/region.w,y:(y-region.y)/region.h,w:(right-x)/region.w,h:(bottom-y)/region.h}:null;
 }
 function render(layer,notice,result,{region,width,height,position}){
  layer.replaceChildren();notice.replaceChildren();layer.style.width=width+'px';layer.style.height=height+'px';
  const unplaced=[...result.unplaced],colors=root.SmartMatchPositionChanges.COLORS;
  for(const mark of result.marks){
   const rect=crop(mark.rect,region),change=mark.change;
   if(!rect){unplaced.push({...change,reason:'Raden ligger utanför visningsområdet'});continue;}
   const row=document.createElement('div');row.className='pwCardChangeRow'+(change.excluded?' excluded':'');row.dataset.changeKey=change.key;
   row.style.left=100*rect.x+'%';row.style.top=100*rect.y+'%';row.style.width=100*rect.w+'%';row.style.height=100*rect.h+'%';
   row.style.setProperty('--change-color',colors[change.color]||colors.red);
   const flag=document.createElement('span');flag.className='pwCardChangeFlag';flag.textContent='⚑';flag.setAttribute('aria-hidden','true');
   const available=rect.x*width,flagSize=Math.max(9,Math.min(18,rect.h*height));
   flag.style.fontSize=flagSize+'px';flag.style.left=available>=flagSize+2?(-flagSize-2)+'px':'0';
   const label=(change.excluded?'Utgår: ':'Ändring: ')+[change.label,change.value].filter(Boolean).join(' · ')+' – '+change.note+' · bara position '+position.position;
   row.setAttribute('role','img');row.setAttribute('aria-label',label);row.title=label;row.append(flag);layer.append(row);
  }
  for(const change of unplaced){
   const line=document.createElement('div');line.className='pwCardChangeUnplaced';line.style.setProperty('--change-color',colors[change.color]||colors.red);
   line.textContent='⚑ '+(change.excluded?'Utgår: ':'Ändring: ')+[change.label,change.value].filter(Boolean).join(' · ')+' — '+change.note;
   line.title=change.reason;notice.append(line);
  }
  layer.hidden=!result.marks.length;notice.hidden=!unplaced.length;
 }
 function clear(layer,notice){if(layer){layer.replaceChildren();layer.hidden=true;}if(notice){notice.replaceChildren();notice.hidden=true;}}
 const api=Object.freeze({wordsFrom,rowsFrom,locate,resolve,crop,render,clear});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.SmartMatchCardChanges=api;
})(typeof window!=='undefined'?window:globalThis);
