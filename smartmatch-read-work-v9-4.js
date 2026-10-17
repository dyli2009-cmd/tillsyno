/* GS installation rows, independently bounded table headers and section groups.
 * Avläsning TEST 9.4 only. All coordinates use a top-left origin, in any units. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SmartMatchReadWork=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const clean=value=>String(value??'').normalize('NFC').replace(/\s+/g,' ').trim();
 const fold=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv');
 const compact=value=>fold(value).replace(/[^a-z0-9]/g,'');
 const median=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:1;};
 const missing=/^(?:[-–—―_.|\s]+|ej\s+aktuellt|ingår\s+ej|ej\s+bestämt|saknas|n\/a)$/i;
 const types={
  installation:['montav','monterasav','monteradav','montageav','montage','installationsansvar','installerasav'],
  delivery:['levav','levererasav','leveransav','leverantor'],
  connection:['anslav','anslutsav','anslutasav'],
  function:['funkansv','funktionsansvar','funktionsansvarig'],
  note:['anm','anmarkning','notering'],
  product:['ovrigt','produkt','produktbeskrivning','beskrivning','utforande','typ','modell','artikel','artikelnummer'],
  label:['komponent','benamning','beslag','utrustning'],
  amount:['antal','mangd'],
  status:['monteringklar','driftsattningklar','provad','kontrollerad']
 };
 const typeFor=new Map(Object.entries(types).flatMap(([type,names])=>names.map(name=>[name,type])));
 const roles=new Set(['installation','delivery','connection','function']);
 const sectionNames=new Map([
  ['daglasning',['Daglåsning','daglasning']],['daglas',['Daglåsning','daglasning']],
  ['nattlasning',['Nattlåsning','nattlasning']],['nattlas',['Nattlåsning','nattlasning']],
  ['ovrigutrustning',['Övrig utrustning','ovrig-utrustning']],
  ['larmpasser',['Larm/Passer','larm-passer']],['larmochpasser',['Larm/Passer','larm-passer']],
  ['larmpassage',['Larm/Passer','larm-passer']]
 ]);
 function normalizeWords(input){
  const result=[];
  for(const item of Array.isArray(input)?input:[]){
   const word={...item,text:clean(item.text??item.str).replace(/^\|+|\|+$/g,''),x:Number(item.x),y:Number(item.y),w:Number(item.w??item.width),h:Number(item.h??item.height)};
   if(!word.text||!/[\p{L}\p{N}\-–—]/u.test(word.text)||![word.x,word.y,word.w,word.h].every(Number.isFinite)||word.w<0||word.h<=0)continue;
   word.cx=word.x+word.w/2;word.cy=word.y+word.h/2;
   const duplicate=result.find(old=>compact(old.text)===compact(word.text)&&Math.abs(old.cy-word.cy)<=Math.min(old.h,word.h)*.45&&Math.abs(old.cx-word.cx)<=Math.max(Math.min(old.h,word.h)*.45,Math.min(old.w,word.w)*.25));
   if(duplicate){if(Number(word.confidence)>Number(duplicate.confidence))Object.assign(duplicate,word);continue;}
   result.push(word);
  }
  return result;
 }
 function rowsFrom(words){
  const rows=[];
  for(const word of [...words].sort((a,b)=>a.cy-b.cy||a.x-b.x)){
   const last=rows.at(-1);
   if(last&&Math.abs(word.cy-last.cy)<=Math.max(Math.min(word.h,last.h)*.48,median([word.h,last.h])*.25)){
    last.words.push(word);last.cy=median(last.words.map(w=>w.cy));last.h=median(last.words.map(w=>w.h));
   }else rows.push({words:[word],cy:word.cy,h:word.h});
  }
  return rows.map((row,index)=>({...row,index,words:row.words.sort((a,b)=>a.x-b.x),text:row.words.map(w=>w.text).join(' ')}));
 }
 function bounds(words){
  const x=Math.min(...words.map(w=>w.x)),y=Math.min(...words.map(w=>w.y));
  return {x,y,w:Math.max(...words.map(w=>w.x+w.w))-x,h:Math.max(...words.map(w=>w.y+w.h))-y};
 }
 function headerType(parts){
  const label=parts.map(word=>word.text).join(' '),exact=typeFor.get(compact(label));
  if(exact)return {type:exact,label};
  // OCR tiles can both observe the same letter at their shared edge, e.g.
  // "Monta" + "av". Repair only overlapping observations which reconstruct
  // a complete known column heading. Never repair product values or GS/DT.
  let stitched=compact(parts[0].text),changed=false;
  for(let index=1;index<parts.length;index++){
   const left=parts[index-1],right=parts[index],a=compact(left.text),b=compact(right.text);
   const overlap=Math.min(left.x+left.w,right.x+right.w)-Math.max(left.x,right.x);
   const sameLine=Math.abs(left.cy-right.cy)<=Math.min(left.h,right.h)*.65;
   let shared=0;
   if(sameLine&&overlap>Math.min(left.h,right.h)*.1&&right.x>left.x&&overlap<Math.min(left.w,right.w)*.95){
    for(let length=1;length<Math.min(a.length,b.length)+1;length++){
     if(!a.endsWith(b.slice(0,length)))continue;
     const letterWidth=Math.min(left.w/Math.max(1,a.length),right.w/Math.max(1,b.length));
     if(overlap>=letterWidth*length*.35&&overlap<=letterWidth*length*2.5)shared=length;
    }
   }
   stitched+=b.slice(shared);changed=changed||shared>0;
  }
  const type=changed&&typeFor.get(stitched);
  return type?{type,label:parts.map(word=>word.text).join(' '),repaired:true}:null;
 }
 function findHeaders(words,rows){
  const headers=[];
  function add(parts){
   const identified=headerType(parts);if(!identified)return;
   const {label,type}=identified;
   const b=bounds(parts);
   if(!headers.some(h=>h.type===type&&Math.abs(h.x-b.x)<Math.min(h.h,b.h)*.25&&Math.abs(h.y-b.y)<Math.min(h.h,b.h)*.25))headers.push({...b,type,label,cx:b.x+b.w/2,cy:b.y+b.h/2,parts});
  }
  for(const row of rows)for(let start=0;start<row.words.length;start++)for(let count=1;count<=4&&start+count<=row.words.length;count++){
   const parts=row.words.slice(start,start+count);
   if(parts.some((w,i)=>i&&w.x-parts[i-1].x-parts[i-1].w>row.h*2.5))break;
   add(parts);
  }
  for(const top of words){
   if(!/^(?:mont|monteras|monterad|montage|installeras|lev|levereras|ansl|ansluts|funk)$/i.test(top.text))continue;
   for(const bottom of words){
    if(bottom.y<top.y+top.h*.6||bottom.y>top.y+top.h*2.3||Math.abs(bottom.cx-top.cx)>Math.max(top.w,bottom.w)*.65)continue;
    add([top,bottom]);
   }
  }
  // Prefer a complete two-line heading over an overlapping short alias.
  return headers.filter(h=>!headers.some(other=>other!==h&&other.type===h.type&&other.parts.length>h.parts.length&&h.parts.every(w=>other.parts.includes(w))));
 }
 function administrative(text){
  const s=fold(text).replace(/^\d+[.)]?\s*/,'');
  return /^(?:littera|antal|mangd|dorr(?:nummer|nr|kort)?|beslagskod|beslagslista|ritningsnummer|projektnummer|projektnr|anlaggning|adress|telefon|datum|revision|version|sidnr|sida|kontrollerad|levereras\s+av|monteras\s+av|ansluts\s+av|funktionsansvar|(?:dorr|larm|passer|brand)funktion)(?:\b|\s*:)/.test(s)||/dorrtillverkare/.test(s);
 }
 function sectionFor(row,range){
  const words=row.words.filter(w=>w.cx>=range.left&&w.cx<range.productStart);
  const text=clean(words.map(w=>w.text).join(' ')).replace(/^\d+[.)]?\s+/,''),known=sectionNames.get(compact(text));
  if(known)return {name:known[0],key:known[1],row:row.index,cy:row.cy};
  const remainder=row.words.filter(w=>w.cx>=range.productStart&&w.cx<range.right);
  if(!text||remainder.length||administrative(text)||/^\d/.test(words[0]?.text||'')||typeFor.has(compact(text)))return null;
  const uppercase=/[\p{L}]/u.test(text)&&text===text.toLocaleUpperCase('sv');
  const bold=words.some(w=>w.bold||/bold/i.test(w.fontName||w.fontFamily||''));
  if((uppercase||bold)&&text.length<100)return {name:text,key:compact(text)||'ovrigt',row:row.index,cy:row.cy};
  return null;
 }
 function tableBands(headers,words){
  const height=median(words.map(w=>w.h)),installs=headers.filter(h=>h.type==='installation').sort((a,b)=>a.y-b.y||a.x-b.x),bands=[];
  const geometry=installs.map(header=>{
   const aligned=installs.filter(h=>h!==header&&Math.abs(h.cy-header.cy)<=Math.max(h.h,header.h)*.9);
   const prev=aligned.filter(h=>h.cx<header.cx).sort((a,b)=>b.cx-a.cx)[0];
   const sameRow=headers.filter(h=>h!==header&&h.type!=='installation'&&Math.abs(h.cy-header.cy)<=Math.max(h.h,header.h)*.9);
   const product=sameRow.filter(h=>h.type==='product'&&h.cx<header.cx&&(!prev||h.cx>prev.cx)).sort((a,b)=>b.cx-a.cx)[0];
   const label=product&&sameRow.filter(h=>h.type==='label'&&h.cx<product.cx&&(!prev||h.cx>prev.cx)).sort((a,b)=>b.cx-a.cx)[0];
   const left=prev?(label?label.x-height*2:product?product.x-(header.x-product.x)*.9:(prev.cx+header.cx)/2):-Infinity;
   return {header,product,sameRow,left};
  });
  for(const geometryItem of geometry){
   const {header,product,sameRow,left}=geometryItem;
   const next=geometry.filter(g=>g.header.cx>header.cx&&Math.abs(g.header.cy-header.cy)<=Math.max(g.header.h,header.h)*.9).sort((a,b)=>a.header.cx-b.header.cx)[0];
   const right=next?next.left:Infinity;
   const peers=sameRow.filter(h=>h.cx>=left&&h.cx<right);
   if(compact(header.label)==='montage'&&!peers.some(h=>roles.has(h.type)))continue;
   const lhs=peers.filter(h=>h.cx<header.cx).sort((a,b)=>b.cx-a.cx)[0],rhs=peers.filter(h=>h.cx>header.cx).sort((a,b)=>a.cx-b.cx)[0];
   const firstRole=Math.min(header.x,...peers.filter(h=>roles.has(h.type)&&(!product||h.cx>product.cx)).map(h=>h.x));
   // Product headings and values are left-aligned in the supported card tables.
   // A midpoint between short header labels would cut Cylinder in/utsida in two.
   const productStart=product?product.x-height*.45:NaN;
   bands.push({header,peers,product,productStart,productEnd:firstRole-height*.2,left,right,x0:lhs?(lhs.cx+header.cx)/2:header.x-height*.6,x1:rhs?(rhs.cx+header.cx)/2:header.x+header.w+height*.6,top:Math.max(header.y+header.h,...peers.filter(h=>roles.has(h.type)).map(h=>h.y+h.h)),bottom:Infinity});
  }
  for(const band of bands){
   const next=bands.filter(b=>b!==band&&b.header.y>band.header.y+height&&b.header.cx>=band.left&&b.header.cx<band.right).sort((a,b)=>a.header.y-b.header.y)[0];
   if(next)band.bottom=next.header.y-height*.1;
  }
  return bands;
 }
 const ownerWords=(row,band)=>row.words.filter(w=>w.cx>=band.x0&&w.cx<band.x1);
 const ownerText=(row,band)=>ownerWords(row,band).map(w=>w.text).join(' ');
 const hasOwner=(row,band)=>/[\p{L}\p{N}]/u.test(ownerText(row,band));
 const gsOwner=(row,band)=>/^(?:GS)+$/.test(compact(ownerText(row,band)).toUpperCase());
 function pairFor(rows,band){
  const words=[...rows].sort((a,b)=>a.cy-b.cy).flatMap(row=>[...row.words].sort((a,b)=>a.x-b.x));
  const labelWords=words.filter(w=>w.cx>=band.left&&w.cx<band.productStart),productWords=words.filter(w=>w.cx>=band.productStart&&w.cx<band.productEnd);
  return {label:clean(labelWords.map(w=>w.text).join(' ')).replace(/^\d+[.)]?\s*/,''),value:clean(productWords.map(w=>w.text).join(' '))};
 }
 function isBodyStart(row,band){
  const left=row.words.filter(w=>w.cx>=band.left&&w.cx<band.productStart),product=row.words.filter(w=>w.cx>=band.productStart&&w.cx<band.productEnd);
  return left.length&&product.length;
 }
 function identity(item){
  // Keep sections and repeated tables distinct; display-only wording is not an ID.
  return 'gs:'+item.tableIndex+':'+item.sourceRow+':'+item.sectionKey+':'+compact(item.label)+':'+compact(item.value);
 }
 function allRows(text){return String(text||'').split(/\r?\n/).map(clean).filter(s=>s&&!missing.test(s)&&!administrative(s));}
 function read({words:input=[],text='',policy='gs'}={}){
  const words=normalizeWords(input),rows=rowsFrom(words),warnings=[];
  if(policy==='all'){
   const work=allRows(text||rows.map(r=>r.text).join('\n'));
   return {work,items:work.map((value,sourceRow)=>({text:value,label:value,value:'',sourceRow,responsibility:null,section:'',sectionKey:''})),warnings,mode:'all',responsibilityColumn:null};
  }
  const headers=findHeaders(words,rows),bands=tableBands(headers,words),items=[];
  if(!bands.length){
   warnings.push('Kolumnen Monteras av saknas eller kunde inte läsas. Inga GS-kontrollpunkter har gissats. Markera hela tabellen inklusive Övrigt och Monteras av.');
   return {work:[],items:[],warnings,mode:'unresolved-columns',responsibilityColumn:null,tableCount:0,resolved:false};
  }
  let ambiguous=false,missingProducts=false,unresolvedTables=0;
  for(const [tableIndex,band] of bands.entries()){
   if(!band.product){unresolvedTables++;warnings.push('Tabell '+(tableIndex+1)+': produktkolumnen Övrigt / Produkt saknas eller kunde inte läsas. Kontrollera markeringen; inga produkter har gissats.');continue;}
   const sections=rows.map(row=>sectionFor(row,band)).filter(Boolean),sectionRows=new Set(sections.map(s=>s.row));
   const body=rows.filter(row=>row.cy>band.top&&row.cy<band.bottom&&!sectionRows.has(row.index));
   const anchors=body.filter(row=>hasOwner(row,band));
   for(const anchor of anchors){
    const owner=ownerText(anchor,band);
    if(!gsOwner(anchor,band)){if(/gs/i.test(compact(owner)))ambiguous=true;continue;}
    const joined=[anchor],anchorLeft=anchor.words.some(w=>w.cx>=band.left&&w.cx<band.productStart);
    for(const candidate of body){
     if(candidate===anchor||hasOwner(candidate,band))continue;
     const distance=Math.abs(candidate.cy-anchor.cy),height=median([anchor.h,candidate.h]);
     if(distance>height*1.65)continue;
     if(anchors.some(other=>other!==anchor&&Math.abs(other.cy-candidate.cy)<distance))continue;
     // A separate labelled product row with no installation owner stays unassigned.
     // A label/product line immediately above an owner-only line is a wrapped cell.
     if(isBodyStart(candidate,band)&&(anchorLeft||candidate.cy>anchor.cy))continue;
     if(sections.some(s=>s.cy>Math.min(anchor.cy,candidate.cy)&&s.cy<Math.max(anchor.cy,candidate.cy)))continue;
     joined.push(candidate);
    }
    const pair=pairFor(joined,band);
    if(!pair.value||missing.test(pair.value)){missingProducts=true;continue;}
    if(administrative(pair.label)||typeFor.has(compact(pair.label)))continue;
    const section=sections.filter(s=>s.cy<anchor.cy&&s.cy<band.bottom).at(-1);
    const item={...pair,text:pair.value,legacyText:pair.label?pair.label+' · '+pair.value:pair.value,section:section?.name||'',sectionKey:section?.key||'',tableIndex,sourceRow:anchor.index,sourceRows:joined.map(row=>row.index).sort((a,b)=>a-b),sourceY:anchor.cy,responsibility:'GS'};
    item.sourceIdentity=identity(item);items.push(item);
   }
  }
  if(ambiguous)warnings.push('En rad har otydligt monteringsansvar (till exempel GS/DT). Den har inte tagits med som GS-arbete.');
  if(missingProducts)warnings.push('GS-rader utan produkt eller med enbart streck har inte lagts till som kontrollpunkter.');
  items.sort((a,b)=>a.sourceY-b.sourceY||a.tableIndex-b.tableIndex||a.sourceRow-b.sourceRow);
  const selected=items.filter((item,index)=>!items.slice(0,index).some(old=>old.tableIndex===item.tableIndex&&old.sourceRow===item.sourceRow&&old.value===item.value));
  return {work:selected.map(item=>item.text),items:selected,warnings,mode:'installation-columns',tableCount:bands.length,resolved:unresolvedTables===0,responsibilityColumn:bands.length===1?{label:bands[0].header.label,x0:bands[0].x0,x1:bands[0].x1,headerY:bands[0].top}:null};
 }
 return {read};
});
