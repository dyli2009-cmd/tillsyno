/* Local work-row selection for Avläsning TEST 7. Coordinates use top-left origin. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SmartMatchReadWork=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const clean=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim();
 const compact=value=>clean(value).toLocaleLowerCase('sv').replace(/[^a-zåäö0-9]/g,'');
 const median=values=>{const a=values.filter(Number.isFinite).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:1;};
 const rolePattern=/(^|[^\p{L}\p{N}])G[\s/_-]*S(?=$|[^\p{L}\p{N}])/iu;
 const otherRolePattern=/(^|[^\p{L}\p{N}])(?:D[\s/_-]*T|EL)(?=$|[^\p{L}\p{N}])/iu;
 const roleStrip=/(^|[^\p{L}\p{N}])(?:G[\s/_-]*S|D[\s/_-]*T|EL)(?=$|[^\p{L}\p{N}])/giu;
 const missing=/^(?:[-–—―_.\s]+|ej\s+aktuellt|ingår\s+ej|ej\s+bestämt|saknas|n\/a)$/i;
 const headerTypes={
  installation:['montav','monterasav','monteradav','montageav','montage','installationsansvar','installerasav'],
  delivery:['levav','levererasav','leveransav','leverantör'],
  connection:['anslav','anslutsav','anslutasav'],
  function:['funkansv','funktionsansvar','funktionsansvarig'],
  note:['anm','anmärkning','notering'],
  product:['övrigt','produkt','produktbeskrivning','beskrivning','utförande','typ','modell','artikel','artikelnummer'],
  label:['komponent','benämning','beslag','utrustning'],
  amount:['antal','mängd'],
  status:['monteringklar','driftsättningklar','provad','kontrollerad']
 };
 const typeFor=new Map(Object.entries(headerTypes).flatMap(([type,names])=>names.map(name=>[name,type])));
 const responsible=new Set(['installation','delivery','connection','function']);

 function normalizeWords(words){
  return (Array.isArray(words)?words:[]).map(word=>({
   ...word,text:clean(word.text??word.str),x:Number(word.x),y:Number(word.y),w:Number(word.w??word.width),h:Number(word.h??word.height)
  })).filter(word=>word.text&&[word.x,word.y,word.w,word.h].every(Number.isFinite)&&word.w>=0&&word.h>0)
   .map(word=>({...word,cx:word.x+word.w/2,cy:word.y+word.h/2}));
 }
 function rowsFrom(words){
  const rows=[];
  for(const word of [...words].sort((a,b)=>a.cy-b.cy||a.x-b.x)){
   const previous=rows[rows.length-1];
   if(previous&&Math.abs(word.cy-previous.cy)<=Math.max(Math.min(word.h,previous.h)*.48,median([word.h,previous.h])*.25)){
    previous.words.push(word);previous.cy=median(previous.words.map(w=>w.cy));previous.h=median(previous.words.map(w=>w.h));
   }else rows.push({cy:word.cy,h:word.h,words:[word]});
  }
  return rows.map((row,index)=>({...row,index,words:row.words.sort((a,b)=>a.x-b.x),text:row.words.map(word=>word.text).join(' ')}));
 }
 function boxFor(words){
  const x=Math.min(...words.map(word=>word.x)),y=Math.min(...words.map(word=>word.y));
  return {x,y,w:Math.max(...words.map(word=>word.x+word.w))-x,h:Math.max(...words.map(word=>word.y+word.h))-y};
 }
 function findHeaders(words,rows){
  const found=[];
  function add(parts){
   const label=parts.map(word=>word.text).join(' '),type=typeFor.get(compact(label));
   if(!type)return;
   const box=boxFor(parts);
   if(!found.some(header=>header.type===type&&Math.abs(header.x-box.x)<box.h*.2&&Math.abs(header.y-box.y)<box.h*.2))found.push({...box,type,label,cx:box.x+box.w/2,cy:box.y+box.h/2});
  }
  for(const row of rows)for(let start=0;start<row.words.length;start++){
   for(let count=1;count<=4&&start+count<=row.words.length;count++){
    const parts=row.words.slice(start,start+count);
    if(parts.some((word,index)=>index&&word.x-(parts[index-1].x+parts[index-1].w)>row.h*2.5))break;
    add(parts);
   }
  }
  // Narrow column headings are often stacked, for example "Monteras" / "av".
  for(const top of words){
   if(!/^(?:mont|monteras|monterad|montage|installeras|lev|levereras|ansl|ansluts|funk)$/i.test(top.text))continue;
   for(const bottom of words){
    if(bottom.y<top.y+top.h*.6||bottom.y>top.y+top.h*2.3||Math.abs(bottom.cx-top.cx)>Math.max(top.w,bottom.w)*.65)continue;
    add([top,bottom]);
   }
  }
  return found;
 }
 function installationColumn(headers,wordHeight){
  const options=headers.filter(header=>header.type==='installation').map(header=>{
   const peers=headers.filter(other=>other!==header&&other.type!=='installation'&&Math.abs(other.cy-header.cy)<=Math.max(header.h,other.h)*.8);
   const rolePeers=peers.filter(other=>responsible.has(other.type));
   return {...header,peers,score:rolePeers.length*10+peers.length};
  }).filter(header=>compact(header.label)!=='montage'||header.score>0);
  options.sort((a,b)=>b.score-a.score||a.y-b.y||b.w-a.w);
  if(!options.length)return null;
  const header=options[0],left=header.peers.filter(peer=>peer.cx<header.cx).sort((a,b)=>b.cx-a.cx)[0],right=header.peers.filter(peer=>peer.cx>header.cx).sort((a,b)=>a.cx-b.cx)[0];
  return {label:header.label,x0:left?(left.cx+header.cx)/2:header.x-wordHeight*.6,x1:right?(right.cx+header.cx)/2:header.x+header.w+wordHeight*.6,headerY:header.y+header.h,header,peers:header.peers};
 }
 function administrative(label){
  const text=clean(label).replace(/^\d+[.)]?\s*/, '');
  return /^(?:littera|antal|mängd|dörr(?:nummer|nr|kort)?|beslagskod|beslagslista|ritningsnummer|projektnummer|projektnr|anläggning|adress|telefon|datum|revision|version|sidnr|sida|kontrollerad|levereras\s+av|monteras\s+av|ansluts\s+av|funktionsansvar|(?:dörr|larm|passer|brand)funktion)(?:\b|\s*:)/i.test(text)||/dörrtillverkare|dorrtillverkare/i.test(text);
 }
 function textPair(text){
  const value=clean(text).replace(/^\d+[.)]?\s+/,'').replace(/^[\s:;,|·]+|[\s:;,|·]+$/g,'');
  if(!value)return null;
  const separator=value.match(/^(.+?)\s*(?:·|\||:)\s*(.+)$/);
  if(separator)return {label:clean(separator[1]),value:clean(separator[2])};
  const numeric=value.match(/^(.+?)\s+((?:\d|standard\b|typ\b|modell\b).*)$/i);
  if(numeric)return {label:clean(numeric[1]),value:clean(numeric[2])};
  const space=value.indexOf(' ');
  return space>0?{label:value.slice(0,space),value:value.slice(space+1)}:null;
 }
 function productPair(words,column){
  if(!words.length)return null;
  const productHeader=column?.peers.filter(header=>header.type==='product'&&header.cx<column.header.cx).sort((a,b)=>b.cx-a.cx)[0];
  if(productHeader){
   const split=productHeader.x-median(words.map(word=>word.h))*.35;
   const labels=words.filter(word=>word.cx<split),values=words.filter(word=>word.cx>=split);
   if(labels.length&&values.length)return {label:clean(labels.map(word=>word.text).join(' ')).replace(/^\d+[.)]?\s*/,''),value:clean(values.map(word=>word.text).join(' '))};
  }
  let gap=0,index=-1;
  for(let i=1;i<words.length;i++){
   const distance=words[i].x-(words[i-1].x+words[i-1].w);
   if(distance>gap){gap=distance;index=i;}
  }
  if(index>0&&gap>median(words.map(word=>word.h))*1.2)return {label:clean(words.slice(0,index).map(word=>word.text).join(' ')).replace(/^\d+[.)]?\s*/,''),value:clean(words.slice(index).map(word=>word.text).join(' '))};
  return textPair(words.map(word=>word.text).join(' '));
 }
 function useful(pair){
  return pair&&pair.label&&pair.value&&/[\p{L}]/u.test(pair.label)&&/[\p{L}\p{N}]/u.test(pair.value)&&!missing.test(pair.value)&&!administrative(pair.label+' '+pair.value)&&!typeFor.has(compact(pair.label));
 }
 function uniqueWork(items){
  const seen=new Set();
  return items.filter(item=>{const key=clean(item.text).toLocaleLowerCase('sv');if(seen.has(key))return false;seen.add(key);return true;});
 }
 function allRows(text,knownLabels){
  const rows=String(text||'').split(/\r?\n/).map(clean).filter(row=>row&&!missing.test(row)&&!administrative(row)&&!/^(?:komponent\s+produkt|levereras\s+av|monteras\s+av)(?:\s|$)/i.test(row));
  const known=new Set(knownLabels||[]),heading=row=>/^[\p{Lu}][\p{Lu}\s/–-]{1,31}$/u.test(row)&&row.split(/\s+/).length<=3;
  const starts=rows.map((row,index)=>index+1<rows.length&&(known.size?known.has(row)&&!known.has(rows[index+1]):heading(row)&&!heading(rows[index+1])));
  if(starts.filter(Boolean).length<2)return rows;
  const result=[];
  for(let i=0;i<rows.length;i++){
   if(!starts[i]){result.push(rows[i]);continue;}
   const label=rows[i],values=[];while(i+1<rows.length&&!starts[i+1])values.push(rows[++i]);
   result.push(label+' · '+values.join(' '));
  }
  return result;
 }
 function read({words:inputWords=[],text='',knownLabels=[],policy='gs'}={}){
  const words=normalizeWords(inputWords),rows=rowsFrom(words),warnings=[];
  if(policy==='all'){
   const work=allRows(text||rows.map(row=>row.text).join('\n'),knownLabels);
   return {work,items:work.map((line,index)=>({text:line,...(textPair(line)||{label:line,value:''}),sourceRow:index,responsibility:null})),warnings,responsibilityColumn:null,mode:'all'};
  }
  const headers=findHeaders(words,rows),column=installationColumn(headers,median(words.map(word=>word.h))),items=[];
  if(column){
   const roleHeaders=[column.header,...column.peers.filter(header=>responsible.has(header.type))];
   const firstRole=Math.min(...roleHeaders.map(header=>header.x));
   const productLimit=firstRole-median(words.map(word=>word.h))*.2;
   let ambiguous=false;
   for(const row of rows){
    if(row.cy<=column.headerY)continue;
    const cell=row.words.filter(word=>word.cx>=column.x0&&word.cx<column.x1);
    const owner=clean(cell.map(word=>word.text).join(' '));
    if(!rolePattern.test(owner))continue;
    const normalized=owner.toUpperCase().replace(/[\s/_:;,.()-]/g,'');
    if(otherRolePattern.test(owner)||!/^(?:GS)+$/.test(normalized)){ambiguous=true;continue;}
    const content=row.words.filter(word=>word.cx<productLimit);
    const pair=productPair(content,column);
    if(!useful(pair))continue;
    items.push({...pair,text:pair.label+' · '+pair.value,sourceRow:row.index,responsibility:'GS'});
   }
   if(ambiguous)warnings.push('En rad har otydligt monteringsansvar och har inte lagts till som GS-arbete. Kontrollera arbetslistan.');
  }else{
   const sourceRows=words.length?rows:String(text||'').split(/\r?\n/).map((line,index)=>({text:clean(line),index,words:[]}));
   for(const row of sourceRows){
    if(!rolePattern.test(row.text)||otherRolePattern.test(row.text))continue;
    const content=row.words.filter(word=>!rolePattern.test(word.text)&&!/^EL$/i.test(word.text));
    const stripped=clean(row.text.replace(roleStrip,' '));
    const pair=content.length?productPair(content,null):textPair(stripped);
    if(!useful(pair))continue;
    items.push({...pair,text:pair.label+' · '+pair.value,sourceRow:row.index,responsibility:'GS'});
   }
   warnings.push('Kolumnen Monteras av saknas i läsområdet. Endast entydiga GS-rader utan DT har tagits med. Ta med ansvarsrubrikerna för säkrare urval.');
  }
  const selected=uniqueWork(items);
  return {work:selected.map(item=>item.text),items:selected,warnings,responsibilityColumn:column?{label:column.label,x0:column.x0,x1:column.x1,headerY:column.headerY}:null,mode:column?'installation-column':'gs-line'};
 }
 return {read};
});
