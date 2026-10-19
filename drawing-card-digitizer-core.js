/* Canonical, lossless door-card data model for Ritningsverktyget.
 *
 * The module deliberately contains no DOM, PDF.js or OCR dependencies.  It
 * accepts native/OCR word observations, keeps every observation reviewable,
 * derives one reusable layout group, and produces editable digital cards.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DrawingCardDigitizerCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';

 const SCHEMA_VERSION=1;
 const TEMPLATE_SCHEMA='tillsyno.door-card-template';
 const CARD_SCHEMA='tillsyno.digital-door-card';
 const PROJECT_SCHEMA='tillsyno.digital-door-card-project';
 const REVIEW_STATUSES=Object.freeze(['unread','needs-review','approved','changed-after-approval']);
 const CELL_KEYS=Object.freeze(['designation','type','quantity','installer']);
 const OPTIONAL_CELL_DEFINITIONS=Object.freeze([
  Object.freeze({key:'supplier',label:'Levereras av',aliases:['lev','lev av','lev. av','levereras av','levererasav']}),
  Object.freeze({key:'connection',label:'Ansluts av',aliases:['ansl av','ansl. av','ansluts av','anslutsav']}),
  Object.freeze({key:'functionOwner',label:'Funktionsansvar',aliases:['funk ansv','funk. ansv','funktionsansvar','funktions ansv']}),
  Object.freeze({key:'note',label:'Anmärkning',aliases:['anm','anm.','anmärkning','anmarkning']}),
  Object.freeze({key:'completion',label:'Montering klar',aliases:['montering klar','monteringklart','mont klar','mont. klar']})
 ]);
 const OPTIONAL_CELL_KEYS=Object.freeze(OPTIONAL_CELL_DEFINITIONS.map(definition=>definition.key));
 const ALL_CELL_KEYS=Object.freeze([...CELL_KEYS,...OPTIONAL_CELL_KEYS]);
 const SECTION_DEFINITIONS=Object.freeze([
  Object.freeze({key:'day-locking',label:'Daglåsning',aliases:['daglåsning','daglasning','dag låsning']}),
  Object.freeze({key:'night-locking',label:'Nattlåsning',aliases:['nattlåsning','nattlasning','natt låsning']}),
  Object.freeze({key:'other-equipment',label:'Övrig utrustning',aliases:['övrig utrustning','ovrig utrustning','övrigt','ovrigt']}),
  Object.freeze({key:'alarm-access',label:'Larm-Passer',aliases:['larm-passer','larm/passer','larm passer','larmpasser','larm och passer','larm passage']})
 ]);
 const COLUMN_DEFINITIONS=Object.freeze([
  Object.freeze({key:'designation',label:'Benämning',center:.20,aliases:['benämning','benamning','produkt','beskrivning','artikel']}),
  Object.freeze({key:'type',label:'Typ / utförande',center:.57,aliases:['typ','utförande','utforande','typ utförande','typ utforande','typ/utförande','typ/utforande','modell']}),
  Object.freeze({key:'quantity',label:'Antal',center:.76,aliases:['antal','mängd','mangd','st','st.']}),
  Object.freeze({key:'installer',label:'Monteras av',center:.91,aliases:['monteras av','monterasav','mont av','mont. av','montör','montor','installatör','installator']})
 ]);
 const RESPONSIBILITY_COLUMN_DEFINITIONS=Object.freeze([
  Object.freeze({key:'type',label:'Övrigt',aliases:['övrigt','ovrigt']}),
  OPTIONAL_CELL_DEFINITIONS[0],
  Object.freeze({key:'installer',label:'Monteras av',aliases:['mont av','mont. av','monteras av','monterasav']}),
  OPTIONAL_CELL_DEFINITIONS[1],OPTIONAL_CELL_DEFINITIONS[2],OPTIONAL_CELL_DEFINITIONS[3],OPTIONAL_CELL_DEFINITIONS[4]
 ]);
 let sequence=0;

 function cleanText(value){
  return String(value==null?'':value).normalize('NFC').replace(/[\u00ad\u200b\u200c\u200d\u2060\ufeff]/gu,'').replace(/[\u00a0\u2007\u202f]/gu,' ').replace(/\s+/gu,' ').trim();
 }
 function searchKey(value){
  return cleanText(value).normalize('NFD').replace(/\p{M}+/gu,'').toLocaleLowerCase('sv-SE').replace(/[–—−]/gu,'-').replace(/[^\p{L}\p{N}]+/gu,'');
 }
 function normalizedCode(value){return cleanText(value).toLocaleUpperCase('sv-SE').replace(/[^\p{L}\p{N}]+/gu,'');}
 function number(value,fallback=0){const result=Number(value);return Number.isFinite(result)?result:fallback;}
 function clamp(value,min=0,max=1){return Math.min(max,Math.max(min,value));}
 function round(value){return Math.round(number(value)*1000000)/1000000;}
 function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
 function now(){return new Date().toISOString();}
 function hash(value){
  let result=2166136261;
  for(const character of String(value)){result^=character.codePointAt(0);result=Math.imul(result,16777619);}
  return(result>>>0).toString(36);
 }
 function uid(prefix,seed){return prefix+'-'+hash(seed==null?Date.now()+':'+(++sequence):seed);}
 function normalizedRect(value){
  if(!value||!['x','y','w','h'].every(key=>Number.isFinite(Number(value[key]))))throw new TypeError('Markera ett helt dörrkort först.');
  const x=clamp(Number(value.x)),y=clamp(Number(value.y)),right=clamp(Number(value.x)+Number(value.w)),bottom=clamp(Number(value.y)+Number(value.h));
  if(right<=x||bottom<=y)throw new RangeError('Dörrkortsmarkeringen ligger utanför sidan.');
  return{x:round(x),y:round(y),w:round(right-x),h:round(bottom-y)};
 }
 function median(values){
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return 0;
  const middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
 }
 function area(box){return Math.max(0,box.w)*Math.max(0,box.h);}
 function overlap(a,b){
  const width=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
  const height=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  return width*height;
 }
 function overlapRatio(a,b){return overlap(a,b)/Math.max(.000000001,Math.min(area(a),area(b)));}
 function boxUnion(boxes){
  if(!boxes.length)return{x:0,y:0,w:0,h:0};
  const x=Math.min(...boxes.map(box=>box.x)),y=Math.min(...boxes.map(box=>box.y));
  const right=Math.max(...boxes.map(box=>box.x+box.w)),bottom=Math.max(...boxes.map(box=>box.y+box.h));
  return{x:round(x),y:round(y),w:round(right-x),h:round(bottom-y)};
 }
 function sourcePriority(observation){return observation.source==='native'?300:observation.source==='manual'?200:100+number(observation.confidence,-1);}
 function rawBox(raw){
  if(raw&&raw.box&&['x','y','w','h'].every(key=>Number.isFinite(Number(raw.box[key]))))return{x:Number(raw.box.x),y:Number(raw.box.y),w:Number(raw.box.w),h:Number(raw.box.h)};
  if(raw&&raw.bbox&&['x0','y0','x1','y1'].every(key=>Number.isFinite(Number(raw.bbox[key]))))return{x:Number(raw.bbox.x0),y:Number(raw.bbox.y0),w:Number(raw.bbox.x1)-Number(raw.bbox.x0),h:Number(raw.bbox.y1)-Number(raw.bbox.y0)};
  if(raw&&['x','y','w','h'].every(key=>Number.isFinite(Number(raw[key]))))return{x:Number(raw.x),y:Number(raw.y),w:Number(raw.w),h:Number(raw.h)};
  return null;
 }
 function coordinateBox(raw,rect,viewport,wordUnits){
  const original=rawBox(raw);if(!original||original.w<=0||original.h<=0)return null;
  const hinted=raw.coordinateSpace||raw.wordUnits||wordUnits;
  let pageBox;
  if(hinted==='card'||hinted==='normalized-card'||hinted==='relative'){
   pageBox={x:rect.x+original.x*rect.w,y:rect.y+original.y*rect.h,w:original.w*rect.w,h:original.h*rect.h};
  }else if(hinted==='normalized'||hinted==='normalized-page'||(!viewport&&Math.max(Math.abs(original.x),Math.abs(original.y),Math.abs(original.w),Math.abs(original.h))<=1.01)){
   pageBox={...original};
  }else{
   const width=number(viewport?.width),height=number(viewport?.height);
   if(width<=0||height<=0)throw new TypeError('Sidans bredd och höjd behövs för ord i PDF-koordinater.');
   pageBox={x:original.x/width,y:original.y/height,w:original.w/width,h:original.h/height};
  }
  const centreX=pageBox.x+pageBox.w/2,centreY=pageBox.y+pageBox.h/2;
  if(centreX<rect.x||centreX>rect.x+rect.w||centreY<rect.y||centreY>rect.y+rect.h)return null;
  return{
   pageBox:Object.fromEntries(Object.entries(pageBox).map(([key,value])=>[key,round(value)])),
   box:{x:round((pageBox.x-rect.x)/rect.w),y:round((pageBox.y-rect.y)/rect.h),w:round(pageBox.w/rect.w),h:round(pageBox.h/rect.h)}
  };
 }
 function observation(raw,source,index,options){
  const text=cleanText(raw?.text??raw?.str);if(!text)return null;
  const boxes=coordinateBox(raw,options.rect,options.viewport,options.wordUnits);if(!boxes)return null;
  const confidence=Number.isFinite(Number(raw.confidence))?clamp(Number(raw.confidence),0,100):source==='native'?100:null;
  const threshold=Number.isFinite(Number(options.confidenceThreshold))?Number(options.confidenceThreshold):75;
  return{
   observationId:String(raw.observationId||raw.id||source+'-'+index),text,source:raw.source||source,confidence,
   lowConfidence:raw.lowConfidence===true||(confidence!=null&&confidence<threshold),box:boxes.box,pageBox:boxes.pageBox
  };
 }
 function sameObservation(a,b){
  const ratio=overlapRatio(a.box,b.box);
  if(ratio<.24)return false;
  if(searchKey(a.text)===searchKey(b.text))return true;
  // A native word and its OCR attempt may disagree.  Keep the alternate
  // spelling on one token when both observations occupy effectively the same
  // glyph box; no observation text is discarded.
  return ratio>=.72&&a.source!==b.source&&(a.source==='native'||b.source==='native');
 }
 function combineWords(input={},options={}){
  if(Array.isArray(input))input={words:input};
  const rect=normalizedRect(options.rect||input.rect||{x:0,y:0,w:1,h:1});
  const settings={rect,viewport:options.viewport||input.viewport,wordUnits:options.wordUnits||input.wordUnits,confidenceThreshold:options.confidenceThreshold??input.confidenceThreshold};
  const sources=[];
  for(const raw of input.nativeWords||[])sources.push([raw,'native']);
  for(const raw of input.ocrWords||[])sources.push([raw,'ocr']);
  for(const raw of input.words||[])sources.push([raw,raw?.source||'ocr']);
  const observations=[];
  for(let index=0;index<sources.length;index++){
   const value=observation(sources[index][0],sources[index][1],index,settings);if(value)observations.push(value);
  }
  observations.sort((a,b)=>a.box.y-b.box.y||a.box.x-b.box.x||sourcePriority(b)-sourcePriority(a));
  const tokens=[];
  for(const item of observations){
   let token=tokens.find(candidate=>sameObservation(candidate,item));
   if(!token){
    token={id:'',text:item.text,box:{...item.box},pageBox:{...item.pageBox},confidence:item.confidence,lowConfidence:item.lowConfidence,source:item.source,
     provenance:[],alternatives:[],reviewed:!item.lowConfidence};
    tokens.push(token);
   }else{
    token.box=boxUnion([token.box,item.box]);token.pageBox=boxUnion([token.pageBox,item.pageBox]);
    const current={text:token.text,source:token.source,confidence:token.confidence};
    if(sourcePriority(item)>sourcePriority(current)){
     token.text=item.text;token.source=item.source;token.confidence=item.confidence;
    }
   }
   if(!token.provenance.some(entry=>entry.source===item.source&&entry.text===item.text&&entry.confidence===item.confidence&&entry.lowConfidence===item.lowConfidence))token.provenance.push({observationId:item.observationId,source:item.source,text:item.text,confidence:item.confidence,lowConfidence:item.lowConfidence});
   if(!token.alternatives.some(entry=>entry.text===item.text&&entry.source===item.source))token.alternatives.push({text:item.text,source:item.source,confidence:item.confidence});
  }
  tokens.sort((a,b)=>a.box.y-b.box.y||a.box.x-b.box.x);
  for(let index=0;index<tokens.length;index++){
   const token=tokens[index],best=token.provenance.slice().sort((a,b)=>sourcePriority(b)-sourcePriority(a))[0];
   token.text=cleanText(best?.text||token.text);token.source=best?.source||token.source;token.confidence=best?.confidence??token.confidence;
   token.conflict=new Set(token.alternatives.map(entry=>searchKey(entry.text)).filter(Boolean)).size>1;
   token.lowConfidence=token.conflict||(token.confidence!=null&&token.confidence<(Number.isFinite(Number(settings.confidenceThreshold))?Number(settings.confidenceThreshold):75));
   token.reviewed=token.conflict?false:token.lowConfidence?token.provenance.some(entry=>!entry.lowConfidence):true;
   token.id=uid('tok',index+':'+token.text+':'+Object.values(token.pageBox).join(':'));
  }
  return tokens;
 }

 function joinWords(tokens){
  return cleanText(tokens.map(token=>token.text).join(' ')).replace(/\s+([,.;:!?%)])/gu,'$1').replace(/([(])\s+/gu,'$1');
 }
 function groupVisualRows(words,options={}){
  const tokens=(words||[]).map(token=>token).filter(token=>token&&token.box&&cleanText(token.text)).sort((a,b)=>(a.box.y+a.box.h/2)-(b.box.y+b.box.h/2)||a.box.x-b.box.x);
  const typicalHeight=median(tokens.map(token=>token.box.h).filter(value=>value>0))||.015;
  const rows=[];
  for(const token of tokens){
   // A failed OCR component can cover several real table rows. Keep that
   // observation for review, but never let its oversized box merge otherwise
   // independent product rows into one.
   const layoutArtifact=token.lowConfidence&&(token.box.h>Math.max(.075,typicalHeight*3.6)||area(token.box)>.22);
   const centre=token.box.y+token.box.h/2;
   let best=null,bestDistance=Infinity;
   for(const row of rows){
    if(layoutArtifact||row.layoutArtifact)continue;
    const distance=Math.abs(centre-row.centreY),vertical=overlap({x:0,y:token.box.y,w:1,h:token.box.h},{x:0,y:row.box.y,w:1,h:row.box.h});
    const tolerance=Math.min(.025,Math.max(.003,typicalHeight*.62,Math.min(token.box.h,row.box.h)*.55));
    if((vertical>Math.min(token.box.h,row.box.h)*.18||distance<=tolerance)&&distance<bestDistance){best=row;bestDistance=distance;}
   }
   if(!best){best={id:'',tokens:[],box:{...token.box},centreY:centre,layoutArtifact};rows.push(best);}
   best.tokens.push(token);best.box=boxUnion(best.tokens.map(item=>item.box));best.centreY=median(best.tokens.map(item=>item.box.y+item.box.h/2));
  }
  rows.sort((a,b)=>a.centreY-b.centreY);
  for(let index=0;index<rows.length;index++){
   const row=rows[index];row.tokens.sort((a,b)=>a.box.x-b.box.x);
   row.id=uid('line',index+':'+row.tokens.map(token=>token.id).join(':'));row.text=joinWords(row.tokens);row.normalized=searchKey(row.text);
   const confidences=row.tokens.map(token=>token.confidence).filter(value=>Number.isFinite(value));
   row.confidence=confidences.length?Math.round(confidences.reduce((sum,value)=>sum+value,0)/confidences.length):null;
   row.minConfidence=confidences.length?Math.min(...confidences):null;row.lowConfidence=row.tokens.some(token=>token.lowConfidence&&!token.reviewed);
   row.provenance=[...new Set(row.tokens.flatMap(token=>token.provenance.map(entry=>entry.source)))];
  }
  return rows;
 }

 function phraseMatch(tokens,aliases){
  let best=null;
  for(let start=0;start<tokens.length;start++)for(let length=1;length<=Math.min(4,tokens.length-start);length++){
   const slice=tokens.slice(start,start+length),key=searchKey(joinWords(slice));
   for(const alias of aliases){
    const aliasKey=searchKey(alias);if(key!==aliasKey)continue;
    const match={start,length,tokens:slice,key,alias,box:boxUnion(slice.map(token=>token.box))};
    if(!best||length>best.length)best=match;
   }
  }
  return best;
 }
 function detectSection(value){
  const key=searchKey(typeof value==='string'?value:value?.text||joinWords(value?.tokens||[]));
  if(!key)return null;
  for(const section of SECTION_DEFINITIONS){
   const match=section.aliases.map(searchKey).sort((a,b)=>b.length-a.length).find(alias=>key===alias||key.startsWith(alias));
   if(match)return{key:section.key,label:section.label,match};
  }
  return null;
 }
 function sectionMatch(row){
  let best=null;
  for(const section of SECTION_DEFINITIONS){
   const match=phraseMatch(row.tokens,section.aliases);
   if(match&&(!best||match.length>best.match.length))best={section,match};
  }
  return best;
 }
 function columnMatches(row){
  const matches={};
  for(const column of COLUMN_DEFINITIONS){const match=phraseMatch(row.tokens,column.aliases);if(match)matches[column.key]=match;}
  return matches;
 }
 function responsibilityColumnMatches(row){
  const matches={};
  for(const column of RESPONSIBILITY_COLUMN_DEFINITIONS){const match=phraseMatch(row.tokens,column.aliases);if(match)matches[column.key]=match;}
  return matches;
 }
 function responsibilityHeader(row){
  const matches=responsibilityColumnMatches(row),keys=Object.keys(matches),responsibilityKeys=['supplier','installer','connection','functionOwner'];
  const responsibilityCount=responsibilityKeys.filter(key=>matches[key]).length;
  // "Övrigt" on its own is a section title. It is a column only when the
  // same visual row also contains the responsibility headings used by these
  // Swedish lock schedules.
  return keys.length>=3&&responsibilityCount>=2&&matches.installer?matches:null;
 }
 function columnHeaderScore(row){return Object.keys(columnMatches(row)).length;}
 function boundsForOrderedColumns(columns){
  const ordered=columns.slice().sort((a,b)=>a.center-b.center);
  for(let index=0;index<ordered.length;index++){
   ordered[index].x0=round(index===0?0:(ordered[index-1].center+ordered[index].center)/2);
   ordered[index].x1=round(index===ordered.length-1?1:(ordered[index].center+ordered[index+1].center)/2);
  }
  return ordered;
 }
 function responsibilityColumns(row,matches){
  const observed=RESPONSIBILITY_COLUMN_DEFINITIONS.filter(definition=>matches[definition.key]).map(definition=>({
   key:definition.key,label:definition.label,center:round(matches[definition.key].box.x+matches[definition.key].box.w/2),detected:true
  })).sort((a,b)=>a.center-b.center);
  if(!observed.length)return null;
  // OCR occasionally misses the leftmost "Övrigt" heading even though the
  // responsibility headings to its right are clear. Keep the canonical Typ
  // field in that case and derive its position from the first responsibility
  // column. Otherwise validateTemplate rejects an otherwise usable layout
  // after OCR has already finished.
  if(!observed.some(column=>column.key==='type')){
   const firstResponsibilityCenter=observed[0].center;
   observed.push({key:'type',label:'Övrigt',center:round(Math.max(.08,Math.min(firstResponsibilityCenter-.055,firstResponsibilityCenter*.5))),detected:false,derived:true});
   observed.sort((a,b)=>a.center-b.center);
  }
  const firstCenter=observed[0].center,designationCenter=round(Math.max(.035,Math.min(firstCenter-.04,firstCenter*.48)));
  const active=boundsForOrderedColumns([{key:'designation',label:'Benämning',center:designationCenter,detected:false,derived:true},...observed]);
  // Quantity does not exist in this layout. Keep the canonical field in the
  // data model, but never capture responsibility text into it.
  const quantity={key:'quantity',label:'Antal',center:.76,x0:0,x1:1,detected:false,capture:false};
  return{columns:[...active.slice(0,2),quantity,...active.slice(2)],headerRowId:row.id,detected:['designation',...observed.filter(column=>column.detected).map(column=>column.key)],layoutProfile:'responsibility-matrix',validStructure:true,structureDescription:'Ansvarsmatris med Övrigt och Mont av'};
 }
 function simpleListStructure(rows,code){
  // This fallback exists for the older compact cards that explicitly say
  // "Dörrkort 140C" and then list products in two columns. A generic
  // Beslagskod plus ordinary project metadata is not enough evidence.
  if(!code?.rowId||!cleanText(code.value)||code.label!=='Dörrkort')return null;
  const candidates=[];
  for(const row of rows||[]){
   if(row.id===code.rowId||row.centreY<=number(code.y)+.006||row.layoutArtifact||sectionMatch(row)||columnHeaderScore(row)>=2||row.tokens.length<2)continue;
   const keys=row.tokens.map(token=>searchKey(token.text));
   if(keys.some(key=>CODE_STOP_WORDS.has(key)||/^(?:projekt|plan|sida|datum|revision|ritning|dorrkort)\d/u.test(key)))continue;
   const tokens=row.tokens.slice().sort((a,b)=>a.box.x-b.box.x);let best=null;
   for(let index=0;index<tokens.length-1;index++){
    const left=tokens[index].box.x+tokens[index].box.w,right=tokens[index+1].box.x,gap=right-left;
    if(gap>=.045&&(!best||gap>best.gap))best={gap,boundary:(left+right)/2};
   }
   if(best&&best.boundary>.12&&best.boundary<.88)candidates.push({row,boundary:best.boundary});
  }
  if(candidates.length<3)return null;
  const split=round(median(candidates.map(candidate=>candidate.boundary))),columns=[
   {key:'designation',label:'Benämning',center:round(split/2),x0:0,x1:split,detected:true},
   {key:'type',label:'Typ / utförande',center:round((split+1)/2),x0:split,x1:1,detected:true},
   {key:'quantity',label:'Antal',center:.76,x0:0,x1:1,detected:false,capture:false},
   {key:'installer',label:'Monteras av',center:.91,x0:0,x1:1,detected:false,capture:false}
  ];
  return{columns,headerRowId:null,detected:['designation','type'],layoutProfile:'simple-list',validStructure:true,structureDescription:'Enkel tvåkolumnslista',simpleListStartY:round(Math.min(...candidates.map(candidate=>candidate.row.centreY)))};
 }
 function deriveColumns(rows,options={}){
  const responsibility=(rows||[]).map(row=>({row,matches:responsibilityHeader(row)})).filter(candidate=>candidate.matches).sort((a,b)=>Object.keys(b.matches).length-Object.keys(a.matches).length||a.row.centreY-b.row.centreY)[0];
  if(responsibility)return responsibilityColumns(responsibility.row,responsibility.matches);
  const candidates=(rows||[]).map(row=>({row,matches:columnMatches(row)})).sort((a,b)=>Object.keys(b.matches).length-Object.keys(a.matches).length||a.row.centreY-b.row.centreY);
  const best=candidates[0],centres={};
  if(best&&Object.keys(best.matches).length>=2)for(const [key,match] of Object.entries(best.matches))centres[key]=match.box.x+match.box.w/2;
  const detected=Object.keys(centres);
  const ordered=COLUMN_DEFINITIONS.map(definition=>({key:definition.key,label:definition.label,center:round(centres[definition.key]??definition.center),detected:centres[definition.key]!=null}));
  // OCR can occasionally place a heading slightly out of order.  A layout
  // template must remain usable, so only accept an observed centre inside the
  // neighbouring defaults and maintain a small, monotonic gap.
  for(let index=0;index<ordered.length;index++){
   const lower=index?ordered[index-1].center+.025:0,upper=index<ordered.length-1?COLUMN_DEFINITIONS[index+1].center-.025:1;
   if(ordered[index].center<=lower||ordered[index].center>=upper){ordered[index].center=COLUMN_DEFINITIONS[index].center;ordered[index].detected=false;}
  }
  for(let index=0;index<ordered.length;index++){
   ordered[index].x0=round(index===0?0:(ordered[index-1].center+ordered[index].center)/2);
   ordered[index].x1=round(index===ordered.length-1?1:(ordered[index].center+ordered[index+1].center)/2);
  }
  if(detected.length>=2)return{columns:ordered,headerRowId:best.row.id,detected,layoutProfile:'standard-table',validStructure:true,structureDescription:'Standardtabell'};
  const simple=simpleListStructure(rows,options.code);if(simple)return simple;
  return{columns:ordered,headerRowId:null,detected,layoutProfile:'unknown',validStructure:false,structureDescription:'Ingen säker tabellstruktur'};
 }
 function codeFromRow(row){
  const tokens=row?.tokens||[],specifications=[
   {key:'beslagskod',label:'Beslagskod',aliases:['beslagskod','beslags kod','beslag kod'],prefix:/^beslags\s*kod/iu,skipOrdinal:true},
   {key:'dorrkort',label:'Dörrkort',aliases:['dörrkort','dorrkort','dörr kort','dorr kort'],prefix:/^d[öo]rr\s*kort/iu,skipOrdinal:false}
  ];
  let labelMatch=null,specification=null;
  for(const candidate of specifications){
   const match=phraseMatch(tokens,candidate.aliases);
   if(match){labelMatch=match;specification=candidate;break;}
   const index=tokens.findIndex(token=>searchKey(token.text).startsWith(candidate.key));
   if(index>=0){labelMatch={start:index,length:1,tokens:[tokens[index]]};specification=candidate;break;}
  }
  if(!labelMatch||!specification)return null;
  const labelIndex=labelMatch.start,labelTokens=[...labelMatch.tokens],valueTokens=[];
  for(let index=labelIndex+labelMatch.length;index<tokens.length;index++){
   const token=tokens[index],text=cleanText(token.text);
   if(!valueTokens.length&&(/^[.:]+$/u.test(text)||(specification.skipOrdinal&&/^\d+(?:[.,]\d+)*\s*[:.]?$/u.test(text)))){labelTokens.push(token);continue;}
   if(/^[|¦│┃]+$/u.test(text))break;
   if(valueTokens.length){
    const previous=valueTokens[valueTokens.length-1],gap=token.box.x-(previous.box.x+previous.box.w);
    if(gap>Math.max(.055,previous.box.h*3.5))break;
   }
   valueTokens.push(token);
  }
  // Some PDFs expose "Beslagskod:WC" as one text item. Strip the fixed
  // label deterministically instead of using an optional-colon regex: on the
  // separate token "Beslagskod:" that regex could backtrack and call ':' the
  // value even though the real value is the following GS23 token.
  let inline=cleanText(joinWords(labelMatch.tokens).replace(specification.prefix,''));
  if(specification.skipOrdinal)inline=cleanText(inline.replace(/^\d+(?:[.,]\d+)*\s*[:.]?\s*/u,''));
  inline=cleanText(inline.replace(/^[:.]\s*/u,''));
  const value=cleanText(inline||joinWords(valueTokens));
  const tokenIds=[...new Set([...labelTokens,...valueTokens].map(token=>token.id))];
  return{label:specification.label,value,normalizedCode:normalizedCode(value),tokenIds,valueTokenIds:valueTokens.length?valueTokens.map(token=>token.id):inline?[tokens[labelIndex].id]:[],valueX:valueTokens.length?Math.min(...valueTokens.map(token=>token.box.x)):null,y:row.centreY,explicit:true};
 }
 const CODE_STOP_WORDS=new Set(['projekt','projektnr','projektnummer','plan','sida','sidnr','datum','revision','rev','ritning','dorrkort','benamning','produkt','beskrivning','typ','utforande','antal','mangd','monteras','av','daglasning','nattlasning','ovrigt','ovrig','utrustning','larm','passer']);
 function inferredCodeFromRows(rows){
  const firstStructure=(rows||[]).filter(row=>sectionMatch(row)||columnHeaderScore(row)>=2).reduce((minimum,row)=>Math.min(minimum,row.centreY),Infinity),upperLimit=Math.min(.28,Number.isFinite(firstStructure)?firstStructure-.008:.28),candidates=[];
  for(const row of rows){
   if(row.centreY>upperLimit||sectionMatch(row)||columnHeaderScore(row)>0||row.tokens.length>3)continue;
   const keys=row.tokens.map(token=>searchKey(token.text));if(keys.some(key=>CODE_STOP_WORDS.has(key)||/^(?:projekt|plan|sida|datum|revision|ritning|dorrkort)\d/u.test(key)))continue;
   const value=joinWords(row.tokens),compact=normalizedCode(value);if(!compact||compact.length>24)continue;
   const letters=/\p{L}/u.test(compact),digits=/\p{N}/u.test(compact),clear=/^(?:WC|DBL(?:[\p{L}\p{N}]{0,16})?)$/u.test(compact);
   const firstPart=normalizedCode(row.tokens[0]?.text),looksLikeSplitCode=row.tokens.length===2&&firstPart.length<=4&&/\p{N}/u.test(normalizedCode(row.tokens[1]?.text));
   const looksLikeSingleCode=row.tokens.length===1&&letters&&digits;
   if(!clear&&!looksLikeSingleCode&&!looksLikeSplitCode)continue;
   const score=(clear?100:70)+(letters&&digits?15:0)-row.tokens.length-row.centreY*10;
   candidates.push({row,value,compact,score});
  }
  const candidate=candidates.sort((a,b)=>b.score-a.score||a.row.centreY-b.row.centreY)[0];if(!candidate)return null;
  const tokenIds=candidate.row.tokens.map(token=>token.id),valueX=Math.min(...candidate.row.tokens.map(token=>token.box.x));
  return{label:'Beteckning',value:candidate.value,normalizedCode:candidate.compact,tokenIds,valueTokenIds:[...tokenIds],valueX,y:candidate.row.centreY,rowId:candidate.row.id,inferred:true};
 }
 function findCode(rows,template){
  let emptyExplicit=null;
  for(const row of rows){
   const code=codeFromRow(row);if(!code)continue;
   if(cleanText(code.value))return{...code,rowId:row.id};
   if(!emptyExplicit)emptyExplicit={...code,rowId:row.id};
  }
  const withExplicitLabel=result=>emptyExplicit?{...result,label:emptyExplicit.label,explicit:true}:result;
  const anchor=template?.header?.codeAnchor;
  if(anchor&&Number.isFinite(anchor.y)){
   const row=[...rows].sort((a,b)=>Math.abs(a.centreY-anchor.y)-Math.abs(b.centreY-anchor.y))[0];
   if(row&&Math.abs(row.centreY-anchor.y)<=Math.max(.025,number(anchor.height,.015)*1.5)){
    const valueTokens=row.tokens.filter(token=>token.box.x+token.box.w/2>=number(anchor.valueX,0));
    const value=joinWords(valueTokens);if(value)return withExplicitLabel({label:cleanText(anchor.label)||'Beteckning',value,normalizedCode:normalizedCode(value),tokenIds:valueTokens.map(token=>token.id),valueTokenIds:valueTokens.map(token=>token.id),valueX:anchor.valueX,y:row.centreY,rowId:row.id,inferred:true});
   }
  }
  const inferred=inferredCodeFromRows(rows);if(inferred)return withExplicitLabel(inferred);
  return{label:emptyExplicit?.label||'Beslagskod',value:'',normalizedCode:'',tokenIds:[],valueTokenIds:[],valueX:null,y:null,rowId:null};
 }
 function wordsForOptions(options){
  return combineWords({nativeWords:options.nativeWords,ocrWords:options.ocrWords,words:options.words,rect:options.rect,viewport:options.viewport,wordUnits:options.wordUnits,confidenceThreshold:options.confidenceThreshold});
 }
 function createTemplateGroup(options={}){
  const rect=normalizedRect(options.rect||{x:0,y:0,w:1,h:1}),tokens=wordsForOptions({...options,rect}),rows=groupVisualRows(tokens),code=findCode(rows),derived=deriveColumns(rows,{code}),sections=[];
  for(const row of rows){
   if(row.layoutArtifact||row.id===derived.headerRowId)continue;
   const match=sectionMatch(row);if(match&&!sections.some(section=>section.key===match.section.key))sections.push({key:match.section.key,label:match.section.label,anchorY:round(row.centreY),tokenIds:match.match.tokens.map(token=>token.id)});
  }
  if(!sections.some(section=>section.anchorY!=null)&&derived.validStructure){
   let anchorY=derived.simpleListStartY;
   if(anchorY==null&&['responsibility-matrix','standard-table'].includes(derived.layoutProfile)){
    const heading=rows.find(row=>row.id===derived.headerRowId),firstData=rows.find(row=>!row.layoutArtifact&&row.id!==code.rowId&&row.id!==derived.headerRowId&&row.centreY>number(heading?.centreY)+.006);
    anchorY=firstData?.centreY;
   }
   if(Number.isFinite(Number(anchorY)))sections.push({key:'other-equipment',label:'Övrig utrustning',anchorY:round(anchorY),tokenIds:[],synthetic:true});
  }
  for(const definition of SECTION_DEFINITIONS)if(!sections.some(section=>section.key===definition.key))sections.push({key:definition.key,label:definition.label,anchorY:null,tokenIds:[]});
  sections.sort((a,b)=>SECTION_DEFINITIONS.findIndex(item=>item.key===a.key)-SECTION_DEFINITIONS.findIndex(item=>item.key===b.key));
  const validStructure=derived.validStructure===true&&sections.some(section=>section.anchorY!=null&&Number.isFinite(Number(section.anchorY)));
  const seed=[options.page||1,Object.values(rect).join(','),tokens.map(token=>token.text).join('|')].join(':');
  const createdAt=options.createdAt||now();
  return{
   schema:TEMPLATE_SCHEMA,schemaVersion:SCHEMA_VERSION,id:String(options.id||uid('template',seed)),groupId:String(options.groupId||'layout-1'),name:cleanText(options.name)||'Dörrkortsmall 1',
   rect,sourcePage:Number.isInteger(options.page)?options.page:1,layoutProfile:derived.layoutProfile,columns:derived.columns,sections,
   header:{columnHeaderRowId:derived.headerRowId,codeAnchor:code.rowId?{y:round(code.y),valueX:code.valueX==null?null:round(code.valueX),height:rows.find(row=>row.id===code.rowId)?.box.h||null,label:code.label}:null},
   reference:{wordCount:tokens.length,lineCount:rows.length,detectedColumns:derived.detected,validStructure,structureDescription:derived.structureDescription,sampleHash:hash(tokens.map(token=>token.text+':'+Object.values(token.box).join(',')).join('|'))},
   createdAt,updatedAt:createdAt
  };
 }

 function confidenceFor(tokens){
  const values=tokens.map(token=>token.confidence).filter(Number.isFinite);
  return{average:values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length):null,minimum:values.length?Math.min(...values):null,low:tokens.some(token=>(token.lowConfidence||token.conflict)&&!token.reviewed)};
 }
 function rowFromTokens(tokens,columns,sectionKey,index){
  const cells=Object.fromEntries(CELL_KEYS.map(key=>[key,''])),cellMeta={};
  for(const column of columns){
   if(column.capture===false){
    if(!Object.prototype.hasOwnProperty.call(cells,column.key))cells[column.key]='';
    cellMeta[column.key]={tokenIds:[],confidence:confidenceFor([])};continue;
   }
   const selected=tokens.filter(token=>{const centre=token.box.x+token.box.w/2;return centre>=column.x0&&(centre<column.x1||column.x1===1&&centre<=1.001);});
   cells[column.key]=joinWords(selected);cellMeta[column.key]={tokenIds:selected.map(token=>token.id),confidence:confidenceFor(selected)};
  }
  for(const key of CELL_KEYS){if(!cellMeta[key])cellMeta[key]={tokenIds:[],confidence:confidenceFor([])};}
  const confidence=confidenceFor(tokens),tokenIds=tokens.map(token=>token.id);
  return{id:uid('row',sectionKey+':'+index+':'+tokenIds.join(':')),sectionKey,cells,tokenIds,cellMeta,confidence,provenance:[...new Set(tokens.flatMap(token=>token.provenance.map(item=>item.source)))],reviewed:!confidence.low,manual:false};
 }
 function sectionShell(template){
  return SECTION_DEFINITIONS.map(definition=>({key:definition.key,label:template.sections?.find(section=>section.key===definition.key)?.label||definition.label,rows:[]}));
 }
 function templateSectionAt(template,y){
  const anchors=(template?.sections||[]).filter(section=>section.anchorY!=null&&Number.isFinite(Number(section.anchorY))).sort((a,b)=>Number(a.anchorY)-Number(b.anchorY));let current=null;
  for(const section of anchors){if(y+0.004<Number(section.anchorY))break;current=section;}return current;
 }
 function auditEntry(action,details={}){return{at:now(),action,...details};}
 function headingMatchesForTemplate(row,template){
  if(template?.layoutProfile==='responsibility-matrix')return responsibilityHeader(row)||{};
  if(template?.layoutProfile==='simple-list')return{};
  return columnMatches(row);
 }
 function createCard(options={}){
  const template=options.template;if(!template)throw new TypeError('Godkänn en dörrkortsmall först.');
  const templateCheck=validateTemplate(template);if(!templateCheck.valid)throw new TypeError('Dörrkortsmallen är ogiltig: '+templateCheck.errors.join(' '));
  const rect=normalizedRect(options.rect||template.rect),tokens=wordsForOptions({...options,rect}),visualRows=groupVisualRows(tokens),code=findCode(visualRows,template),sections=sectionShell(template),fixedElements=[],fields=[],assigned=new Set(code.tokenIds),headerRowId=template.header?.columnHeaderRowId,recognizedSections=new Set();
  let currentSection=null,tableStarted=false;
  for(const visualRow of visualRows){
   if(visualRow.layoutArtifact)continue;
   if(visualRow.id===code.rowId)continue;
   const headings=headingMatchesForTemplate(visualRow,template),headingCount=Object.keys(headings).length;
   if(headingCount>=2){
    tableStarted=true;const tokenIds=[...new Set(Object.values(headings).flatMap(match=>match.tokens.map(token=>token.id)))];
    // Treat the whole visual heading row as fixed.  Slash punctuation and
    // split labels such as "Typ / Utförande" must stay accounted for.
    for(const token of visualRow.tokens)assigned.add(token.id);
    fixedElements.push({id:uid('fixed','columns:'+visualRow.id),kind:'column-header',text:visualRow.text,tokenIds:visualRow.tokens.map(token=>token.id),confidence:confidenceFor(visualRow.tokens)});continue;
   }
   const matchedSection=sectionMatch(visualRow);
   if(matchedSection){
    tableStarted=true;currentSection=matchedSection.section.key;recognizedSections.add(currentSection);
    const headingIds=new Set(matchedSection.match.tokens.map(token=>token.id));for(const id of headingIds)assigned.add(id);
    fixedElements.push({id:uid('fixed','section:'+visualRow.id),kind:'section-heading',sectionKey:currentSection,text:joinWords(matchedSection.match.tokens),tokenIds:[...headingIds],confidence:confidenceFor(matchedSection.match.tokens)});
    const remaining=visualRow.tokens.filter(token=>!headingIds.has(token.id));
    if(remaining.length){const target=sections.find(section=>section.key===currentSection),row=rowFromTokens(remaining,template.columns,currentSection,target.rows.length);row.sectionAssignment={method:'recognized-heading',anchorY:round(visualRow.centreY)};target.rows.push(row);for(const id of row.tokenIds)assigned.add(id);}
    continue;
   }
   // The approved template is also evidence when OCR misses both the column
   // header and the first section heading. Before the first anchor this still
   // returns null, so genuine card-header fields stay header fields.
   const anchored=templateSectionAt(template,visualRow.centreY),targetKey=anchored?.key||currentSection,learnedUnsectioned=!!anchored?.synthetic&&['simple-list','responsibility-matrix'].includes(template.layoutProfile),inferred=!!anchored&&!recognizedSections.has(anchored.key)&&!learnedUnsectioned;
   if(targetKey){
    tableStarted=true;currentSection=targetKey;const target=sections.find(section=>section.key===targetKey),row=rowFromTokens(visualRow.tokens,template.columns,targetKey,target.rows.length);
    row.sectionAssignment={method:inferred?'template-position':learnedUnsectioned?'template-list':'recognized-heading',anchorY:anchored?.anchorY??null};row.requiresReview=inferred;if(inferred)row.reviewed=false;
    target.rows.push(row);for(const id of row.tokenIds)assigned.add(id);continue;
   }
   if(!tableStarted){
    const confidence=confidenceFor(visualRow.tokens),field={id:uid('field',visualRow.id),text:visualRow.text,tokenIds:visualRow.tokens.map(token=>token.id),confidence,provenance:[...new Set(visualRow.tokens.flatMap(token=>token.provenance.map(item=>item.source)))],reviewed:!confidence.low};
    fields.push(field);for(const id of field.tokenIds)assigned.add(id);
   }
  }
  const source={page:Number.isInteger(options.page)?options.page:template.sourcePage,rect,fileName:cleanText(options.fileName),fingerprint:cleanText(options.fingerprint)};
  const seed=[template.id,source.page,Object.values(rect).join(','),tokens.map(token=>token.text).join('|')].join(':');
  const createdAt=options.createdAt||now();
  let card={schema:CARD_SCHEMA,schemaVersion:SCHEMA_VERSION,id:String(options.id||uid('card',seed)),templateId:template.id,source,
   header:{code:code.value,normalizedCode:code.normalizedCode,label:code.label,tokenIds:code.tokenIds,valueTokenIds:code.valueTokenIds,fields},
   sections,fixedElements,sourceTokens:tokens,unassignedTokens:tokens.filter(token=>!assigned.has(token.id)),ignoredTokenIds:[],
   review:{status:'needs-review',canApprove:false,complete:false,totalTokens:tokens.length,accountedTokens:0,unassignedCount:0,pendingLowConfidenceCount:0,missingCode:!code.value,issues:[],approvedAt:null},
   audit:[auditEntry('card-created',{sourcePage:source.page})],createdAt,updatedAt:createdAt};
  card=recomputeReviewCompleteness(card);return card;
 }

 function tokenReferences(card){
  const references=new Map();
  const add=(id,kind)=>{if(!id)return;if(!references.has(id))references.set(id,[]);references.get(id).push(kind);};
  for(const id of card.header?.tokenIds||[])add(id,'header-code');
  for(const field of card.header?.fields||[])for(const id of field.tokenIds||[])add(id,'header-field');
  for(const fixed of card.fixedElements||[])for(const id of fixed.tokenIds||[])add(id,'fixed');
  for(const section of card.sections||[])for(const row of section.rows||[])for(const id of row.tokenIds||[])add(id,'row');
  for(const token of card.unassignedTokens||[])add(token.id,'unassigned');
  for(const id of card.ignoredTokenIds||[])add(id,'ignored');
  return references;
 }
 function baseWithoutDerived(card){
  const copy=clone(card);copy.unassignedTokens=[];copy.review=copy.review||{};return copy;
 }
 function refreshEntityMetadata(entity,sourceById){
  const tokens=(entity.tokenIds||[]).map(id=>sourceById.get(id)).filter(Boolean);if(!tokens.length)return;
  entity.confidence=confidenceFor(tokens);entity.provenance=[...new Set(tokens.flatMap(token=>token.provenance.map(item=>item.source)))];entity.reviewed=entity.requiresReview?entity.reviewed===true:!entity.confidence.low;
 }
 function recomputeReviewCompleteness(card,options={}){
  const result=baseWithoutDerived(card),sourceById=new Map((result.sourceTokens||[]).map(token=>[token.id,token])),ignored=new Set((result.ignoredTokenIds||[]).filter(id=>sourceById.has(id)));
  result.ignoredTokenIds=[...ignored];
  for(const field of result.header?.fields||[])refreshEntityMetadata(field,sourceById);
  for(const fixed of result.fixedElements||[])refreshEntityMetadata(fixed,sourceById);
  for(const section of result.sections||[])for(const row of section.rows||[]){
   refreshEntityMetadata(row,sourceById);
   for(const key of Object.keys(row.cellMeta||{})){const meta=row.cellMeta?.[key];if(meta)meta.confidence=confidenceFor((meta.tokenIds||[]).map(id=>sourceById.get(id)).filter(Boolean));}
  }
  const structurallyAssigned=new Set();
  const collect=ids=>(ids||[]).forEach(id=>{if(sourceById.has(id))structurallyAssigned.add(id);});
  collect(result.header?.tokenIds);for(const field of result.header?.fields||[])collect(field.tokenIds);for(const fixed of result.fixedElements||[])collect(fixed.tokenIds);for(const section of result.sections||[])for(const row of section.rows||[])collect(row.tokenIds);
  result.unassignedTokens=[...sourceById.values()].filter(token=>!structurallyAssigned.has(token.id)&&!ignored.has(token.id));
  // A native/OCR disagreement must be resolved by choosing/correcting the
  // value itself. A generic "reviewed" flag is not enough: otherwise a row
  // level review could silently accept whichever observation happened to win
  // the source-priority sort.
  const pendingConflicts=[...sourceById.values()].filter(token=>token.conflict);
  const pendingLowConfidence=[...sourceById.values()].filter(token=>token.lowConfidence&&!token.conflict&&!token.reviewed&&!ignored.has(token.id));
  const pendingInferredRows=(result.sections||[]).flatMap(section=>section.rows||[]).filter(row=>row.requiresReview&&!row.reviewed);
  const duplicateAssignments=[];
  // Recalculate references after rebuilding unassigned tokens.
  const finalReferences=tokenReferences(result);
  for(const [id,kinds] of finalReferences)if(kinds.filter(kind=>kind!=='ignored').length>1)duplicateAssignments.push(id);
  const missingCode=!cleanText(result.header?.code),unknownReferences=[];
  for(const id of finalReferences.keys())if(!sourceById.has(id))unknownReferences.push(id);
  // Legacy cards may not have a read status. Once a reader has written one,
  // only a completed native-text or OCR read may be approved. This prevents a
  // partial/error result from becoming "approved" merely because the words
  // that happened to be returned were otherwise accounted for.
  const sourceReadStatus=cleanText(result.source?.readStatus).toLocaleLowerCase('sv-SE');
  const sourceReadIncomplete=!!sourceReadStatus&&!['read','native'].includes(sourceReadStatus);
  const issues=[];
  if(missingCode)issues.push('Beteckning saknas.');
  if(result.unassignedTokens.length)issues.push(result.unassignedTokens.length+' textdelar har inte förts över.');
  if(pendingLowConfidence.length)issues.push(pendingLowConfidence.length+' osäkra textdelar behöver granskas.');
  if(pendingConflicts.length)issues.push(pendingConflicts.length+' textdelar har olika PDF- och bildavläsning och behöver granskas.');
  if(pendingInferredRows.length)issues.push(pendingInferredRows.length+' rader placerades efter mallens position och behöver granskas.');
  if(duplicateAssignments.length)issues.push(duplicateAssignments.length+' textdelar är placerade mer än en gång.');
  if(unknownReferences.length)issues.push(unknownReferences.length+' hänvisningar saknar källtext.');
  if(sourceReadIncomplete)issues.push('Dörrkortets avläsning är inte färdig (status: '+sourceReadStatus+'). Läs om kortet innan det godkänns.');
  const canApprove=!missingCode&&!result.unassignedTokens.length&&!pendingLowConfidence.length&&!pendingConflicts.length&&!pendingInferredRows.length&&!duplicateAssignments.length&&!unknownReferences.length&&!sourceReadIncomplete;
  const previous=result.review?.status;
  let status=previous;
  if(options.edited)status=previous==='approved'||previous==='changed-after-approval'?'changed-after-approval':'needs-review';
  else if(!REVIEW_STATUSES.includes(status)||status==='unread')status='needs-review';
  if(status==='approved'&&!canApprove)status='changed-after-approval';
  result.review={...result.review,status,canApprove,complete:canApprove&&status==='approved',totalTokens:sourceById.size,accountedTokens:sourceById.size-result.unassignedTokens.length,
   unassignedCount:result.unassignedTokens.length,pendingLowConfidenceCount:pendingLowConfidence.length,pendingConflictCount:pendingConflicts.length,inferredSectionCount:pendingInferredRows.length,missingCode,duplicateAssignmentCount:duplicateAssignments.length,unknownReferenceCount:unknownReferences.length,sourceReadStatus:sourceReadStatus||null,sourceReadIncomplete,issues};
  result.updatedAt=options.preserveTime?result.updatedAt:now();return result;
 }
 function findRow(card,rowId){
  for(let sectionIndex=0;sectionIndex<(card.sections||[]).length;sectionIndex++){
   const rowIndex=card.sections[sectionIndex].rows.findIndex(row=>row.id===rowId);if(rowIndex>=0)return{sectionIndex,rowIndex,row:card.sections[sectionIndex].rows[rowIndex]};
  }
  return null;
 }
 function edit(card,action,mutate){
  const result=clone(card),before=result.review?.status;mutate(result);result.audit=result.audit||[];result.audit.push(auditEntry(action));
  result.review=result.review||{};result.review.status=before;return recomputeReviewCompleteness(result,{edited:true});
 }
 function addRow(card,sectionKey,values={},index){
  return edit(card,'row-added',result=>{
   const section=result.sections.find(item=>item.key===sectionKey);if(!section)throw new RangeError('Okänd dörrkortssektion: '+sectionKey);
   const cells=Object.fromEntries(CELL_KEYS.map(key=>[key,cleanText(values.cells?.[key]??values[key])]));
   const row={id:String(values.id||uid('row','manual:'+Date.now()+':'+(++sequence))),sectionKey,cells,tokenIds:[],cellMeta:Object.fromEntries(CELL_KEYS.map(key=>[key,{tokenIds:[],confidence:{average:null,minimum:null,low:false}}])),confidence:{average:null,minimum:null,low:false},provenance:['manual'],reviewed:true,manual:true};
   const target=Number.isInteger(index)?clamp(index,0,section.rows.length):section.rows.length;section.rows.splice(target,0,row);
  });
 }
 function updateRow(card,rowId,patch={}){
  return edit(card,'row-updated',result=>{
   const match=findRow(result,rowId);if(!match)throw new RangeError('Raden finns inte.');
   const values=patch.cells&&typeof patch.cells==='object'?patch.cells:patch;
   const reviewedIds=new Set(),manuallyResolvedIds=new Set();
   const editableKeys=new Set([...ALL_CELL_KEYS,...Object.keys(match.row.cells||{})]);
   for(const key of editableKeys)if(Object.prototype.hasOwnProperty.call(values,key)){
    match.row.cells[key]=cleanText(values[key]);for(const id of match.row.cellMeta?.[key]?.tokenIds||[]){reviewedIds.add(id);manuallyResolvedIds.add(id);}
   }
   if(patch.reviewed===true){for(const id of match.row.tokenIds||[])reviewedIds.add(id);match.row.reviewed=true;}
   else if(patch.reviewed===false)match.row.reviewed=false;
   for(const token of result.sourceTokens||[])if(reviewedIds.has(token.id)){
    token.reviewed=true;
    if(manuallyResolvedIds.has(token.id)&&token.conflict){token.conflict=false;token.conflictResolution='manual-cell-edit';}
   }
  });
 }
 function removeRow(card,rowId){
  return edit(card,'row-removed',result=>{const match=findRow(result,rowId);if(!match)throw new RangeError('Raden finns inte.');result.sections[match.sectionIndex].rows.splice(match.rowIndex,1);});
 }
 function moveRow(card,rowId,target={}){
  return edit(card,'row-moved',result=>{
   const match=findRow(result,rowId);if(!match)throw new RangeError('Raden finns inte.');
   const [row]=result.sections[match.sectionIndex].rows.splice(match.rowIndex,1),sectionKey=target.sectionKey||row.sectionKey,targetSection=result.sections.find(section=>section.key===sectionKey);
   if(!targetSection)throw new RangeError('Okänd dörrkortssektion: '+sectionKey);row.sectionKey=sectionKey;row.sectionAssignment={method:'manual',anchorY:null};row.requiresReview=false;
   const index=Number.isInteger(target.index)?clamp(target.index,0,targetSection.rows.length):targetSection.rows.length;targetSection.rows.splice(index,0,row);
  });
 }
 function updateHeader(card,patch={}){
  return edit(card,'header-updated',result=>{
   if(Object.prototype.hasOwnProperty.call(patch,'code')){result.header.code=cleanText(patch.code);result.header.normalizedCode=normalizedCode(result.header.code);for(const token of result.sourceTokens||[])if((result.header.valueTokenIds||[]).includes(token.id)){token.reviewed=true;if(token.conflict){token.conflict=false;token.conflictResolution='manual-header-edit';}}}
   if(Object.prototype.hasOwnProperty.call(patch,'label'))result.header.label=cleanText(patch.label)||'Beslagskod';
  });
 }
 function updateHeaderField(card,fieldId,patch){
  return edit(card,'header-field-updated',result=>{
   const field=(result.header?.fields||[]).find(item=>item.id===fieldId);if(!field)throw new RangeError('Rubrikfältet finns inte.');
   const values=typeof patch==='string'?{text:patch}:patch&&typeof patch==='object'?patch:{};
   if(Object.prototype.hasOwnProperty.call(values,'text'))field.text=cleanText(values.text);
   if(Object.prototype.hasOwnProperty.call(values,'label'))field.label=cleanText(values.label);
   field.reviewed=true;for(const token of result.sourceTokens||[])if((field.tokenIds||[]).includes(token.id)){token.reviewed=true;if(token.conflict){token.conflict=false;token.conflictResolution='manual-header-field-edit';}}
  });
 }
 function markTokenReviewed(card,tokenId,reviewed=true){
  return edit(card,'token-reviewed',result=>{const token=result.sourceTokens.find(item=>item.id===tokenId);if(!token)throw new RangeError('Textdelen finns inte.');token.reviewed=!!reviewed;});
 }
 function ignoreToken(card,tokenId,ignored=true){
  return edit(card,ignored?'token-ignored':'token-restored',result=>{
   if(!result.sourceTokens.some(token=>token.id===tokenId))throw new RangeError('Textdelen finns inte.');
   const values=new Set(result.ignoredTokenIds||[]);if(ignored)values.add(tokenId);else values.delete(tokenId);result.ignoredTokenIds=[...values];
  });
 }
 function assignToken(card,tokenId,target={}){
  return edit(card,'token-assigned',result=>{
   const token=result.sourceTokens.find(item=>item.id===tokenId);if(!token)throw new RangeError('Textdelen finns inte.');
   const column=target.column||target.cell||'designation';if(!ALL_CELL_KEYS.includes(column))throw new RangeError('Okänd dörrkortskolumn: '+column);
   const refs=tokenReferences(result).get(tokenId)||[];
   if(refs.some(kind=>!['unassigned','ignored'].includes(kind)))throw new Error('Textdelen är redan placerad på dörrkortet.');
   result.ignoredTokenIds=(result.ignoredTokenIds||[]).filter(id=>id!==tokenId);
   let match=target.rowId?findRow(result,target.rowId):null;
   if(!match){
    const sectionKey=target.sectionKey||'other-equipment',section=result.sections.find(item=>item.key===sectionKey);if(!section)throw new RangeError('Okänd dörrkortssektion: '+sectionKey);
    const cells=Object.fromEntries(CELL_KEYS.map(key=>[key,'']));
    const row={id:String(target.rowId||uid('row','assigned:'+tokenId+':'+Date.now())),sectionKey,cells,tokenIds:[],cellMeta:Object.fromEntries(CELL_KEYS.map(key=>[key,{tokenIds:[],confidence:{average:null,minimum:null,low:false}}])),confidence:{average:null,minimum:null,low:false},provenance:[],reviewed:true,manual:true};
    const index=Number.isInteger(target.index)?clamp(target.index,0,section.rows.length):section.rows.length;section.rows.splice(index,0,row);match={sectionIndex:result.sections.indexOf(section),rowIndex:index,row};
   }
   const row=match.row;if(!row.tokenIds.includes(tokenId))row.tokenIds.push(tokenId);
   row.cellMeta=row.cellMeta||{};row.cellMeta[column]=row.cellMeta[column]||{tokenIds:[],confidence:{average:null,minimum:null,low:false}};
   if(!row.cellMeta[column].tokenIds.includes(tokenId))row.cellMeta[column].tokenIds.push(tokenId);
   row.cells[column]=Object.prototype.hasOwnProperty.call(target,'text')?cleanText(target.text):cleanText([row.cells[column],token.text].filter(Boolean).join(' '));
   row.provenance=[...new Set([...(row.provenance||[]),...token.provenance.map(item=>item.source)])];token.reviewed=true;row.reviewed=true;
  });
 }
 function approveCard(card){
  const result=recomputeReviewCompleteness(card);if(!result.review.canApprove)throw new Error('Dörrkortet kan inte godkännas ännu: '+result.review.issues.join(' '));
  result.review.status='approved';result.review.complete=true;result.review.approvedAt=now();result.updatedAt=now();result.audit=result.audit||[];result.audit.push(auditEntry('card-approved'));return result;
 }

 function validateTemplate(template){
  const errors=[];
  if(!template||typeof template!=='object')return{valid:false,errors:['Mallen saknas.']};
  if(template.schema!==TEMPLATE_SCHEMA)errors.push('Fel mallschema.');if(template.schemaVersion!==SCHEMA_VERSION)errors.push('Mallversionen stöds inte.');if(!cleanText(template.id))errors.push('Mall-id saknas.');
  try{normalizedRect(template.rect);}catch(error){errors.push(error.message);}
  if(!Array.isArray(template.columns)||CELL_KEYS.some(key=>!template.columns.some(column=>column.key===key)))errors.push('Alla standardkolumner saknas.');
  else for(const column of template.columns)if(!ALL_CELL_KEYS.includes(column.key)||![column.x0,column.x1,column.center].every(value=>Number.isFinite(Number(value)))||column.x0<0||column.x1>1||column.x1<=column.x0)errors.push('En kolumn har ogiltiga gränser.');
  if(!Array.isArray(template.sections)||SECTION_DEFINITIONS.some(definition=>!template.sections.some(section=>section.key===definition.key)))errors.push('Alla standardsektioner saknas.');
  return{valid:errors.length===0,errors};
 }
 function validateCard(card){
  const errors=[];
  if(!card||typeof card!=='object')return{valid:false,errors:['Dörrkortet saknas.']};
  if(card.schema!==CARD_SCHEMA)errors.push('Fel dörrkortsschema.');if(card.schemaVersion!==SCHEMA_VERSION)errors.push('Dörrkortsversionen stöds inte.');if(!cleanText(card.id)||!cleanText(card.templateId))errors.push('Dörrkortets id eller mall-id saknas.');
  try{normalizedRect(card.source?.rect);}catch(error){errors.push(error.message);}
  if(!card.header||typeof card.header.code!=='string')errors.push('Beteckningsfältet saknas.');
  if(!Array.isArray(card.sections)||SECTION_DEFINITIONS.some(definition=>!card.sections.some(section=>section.key===definition.key)))errors.push('Alla standardsektioner saknas.');
  const rowIds=new Set();for(const section of card.sections||[])for(const row of section.rows||[]){if(rowIds.has(row.id))errors.push('Två rader har samma id.');rowIds.add(row.id);if(row.sectionKey!==section.key)errors.push('En rad ligger i fel sektion.');for(const key of CELL_KEYS)if(typeof row.cells?.[key]!=='string')errors.push('En rad saknar fältet '+key+'.');for(const [key,value] of Object.entries(row.cells||{}))if(typeof value!=='string')errors.push('Fältet '+key+' innehåller inte text.');}
  if(!Array.isArray(card.sourceTokens))errors.push('Källtexten saknas.');
  const tokenIds=new Set();for(const token of card.sourceTokens||[]){if(!cleanText(token.id)||tokenIds.has(token.id))errors.push('Källtext har ett ogiltigt eller dubbelt id.');tokenIds.add(token.id);if(!cleanText(token.text))errors.push('En textdel är tom.');if(!token.box||!['x','y','w','h'].every(key=>Number.isFinite(Number(token.box[key]))))errors.push('En textdel saknar position.');if(!Array.isArray(token.provenance)||!token.provenance.length)errors.push('En textdel saknar ursprung.');}
  const refs=tokenReferences(card);for(const id of refs.keys())if(!tokenIds.has(id))errors.push('En hänvisning pekar på okänd källtext.');
  for(const [id,kinds] of refs)if(kinds.filter(kind=>kind!=='ignored').length>1)errors.push('Textdelen '+id+' används mer än en gång.');
  for(const id of tokenIds)if(!refs.has(id))errors.push('Textdelen '+id+' har inte förts över eller markerats för granskning.');
  if(!REVIEW_STATUSES.includes(card.review?.status))errors.push('Granskningsstatusen är ogiltig.');
  return{valid:errors.length===0,errors:[...new Set(errors)]};
 }
 function createProject(options={}){
  const template=clone(options.template),cards=(options.cards||[]).map(clone),createdAt=options.createdAt||now();
  const value={schema:PROJECT_SCHEMA,schemaVersion:SCHEMA_VERSION,id:String(options.id||uid('doorcards',template?.id+':'+cards.map(card=>card.id).join(':'))),name:cleanText(options.name)||'Digitala dörrkort',source:clone(options.source||{}),template,cards,createdAt,updatedAt:createdAt};
  const checked=validateProject(value);if(!checked.valid)throw new TypeError('Projektet är ogiltigt: '+checked.errors.join(' '));return value;
 }
 function validateProject(project){
  const errors=[];if(!project||typeof project!=='object')return{valid:false,errors:['Projektet saknas.']};
  if(project.schema!==PROJECT_SCHEMA)errors.push('Fel projektschema.');if(project.schemaVersion!==SCHEMA_VERSION)errors.push('Projektversionen stöds inte.');
  const template=validateTemplate(project.template);errors.push(...template.errors);if(!Array.isArray(project.cards))errors.push('Projektets dörrkort saknas.');
  else for(const card of project.cards){const checked=validateCard(card);errors.push(...checked.errors.map(error=>'Kort '+(card?.id||'?')+': '+error));if(card?.templateId!==project.template?.id)errors.push('Ett dörrkort använder en annan mall.');}
  return{valid:errors.length===0,errors};
 }
 function validationFor(value){
  if(value?.schema===TEMPLATE_SCHEMA)return validateTemplate(value);if(value?.schema===CARD_SCHEMA)return validateCard(value);if(value?.schema===PROJECT_SCHEMA)return validateProject(value);
  return{valid:false,errors:['Okänt digitalt dörrkortsschema.']};
 }
 function serialize(value,space=2){const checked=validationFor(value);if(!checked.valid)throw new TypeError(checked.errors.join(' '));return JSON.stringify(value,null,space);}
 function parse(value,expectedSchema){
  let parsed;try{parsed=typeof value==='string'?JSON.parse(value):clone(value);}catch(_){throw new SyntaxError('Dörrkortsfilen innehåller inte giltig JSON.');}
  if(expectedSchema&&parsed?.schema!==expectedSchema)throw new TypeError('Filen innehåller fel slags dörrkortsdata.');
  const checked=validationFor(parsed);if(!checked.valid)throw new TypeError('Dörrkortsfilen är ogiltig: '+checked.errors.join(' '));return parsed;
 }

 return Object.freeze({
  SCHEMA_VERSION,TEMPLATE_SCHEMA,CARD_SCHEMA,PROJECT_SCHEMA,REVIEW_STATUSES,CELL_KEYS,OPTIONAL_CELL_KEYS,ALL_CELL_KEYS,OPTIONAL_CELL_DEFINITIONS,SECTION_DEFINITIONS,COLUMN_DEFINITIONS,
  cleanText,searchKey,normalizedCode,normalizeRect:normalizedRect,combineWords,groupVisualRows,detectSection,deriveColumns,
  createTemplateGroup,createTemplate:createTemplateGroup,createCard,digitizeCard:createCard,recomputeReviewCompleteness,
  addRow,updateRow,removeRow,moveRow,updateHeader,updateHeaderField,markTokenReviewed,ignoreToken,assignToken,approveCard,
  createProject,validateTemplate,validateCard,validateProject,serialize,parse
 });
});
