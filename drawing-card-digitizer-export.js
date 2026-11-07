/* Ritningsverktyg: export reviewed, structured door cards as JSON and a compact searchable PDF. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(root);
 else root.DrawingCardDigitizerExport=factory(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';

 const SCHEMA='tillsyno.digital-door-card-export';
 const SCHEMA_VERSION=1;
 const CARD_SCHEMA='tillsyno.digital-door-card';
 const PDF_WIDTH=595.28;
 const PDF_HEIGHT=841.89;
 const MARGIN=28;
 const MANIFEST_FILE='tillsyno-digitala-dorrkort.json';
 const COLUMN_LABELS={
  designation:'Benämning',description:'Benämning',name:'Benämning',product:'Produkt',
  type:'Typ / utförande',model:'Typ / utförande',value:'Värde',quantity:'Antal',amount:'Antal',
  installer:'Monteras av',mountedBy:'Monteras av',supplier:'Levereras av',suppliedBy:'Levereras av',
  connection:'Ansluts av',functionOwner:'Funktionsansvar',completion:'Montering klar',
  note:'Anmärkning',notes:'Anmärkning',remark:'Anmärkning'
 };
 const STATUS_LABELS={
  approved:'Godkänt','needs-review':'Behöver granskas','changed-after-approval':'Ändrat efter godkännande',
  'not-read':'Ej läst',pending:'Behöver granskas',draft:'Behöver granskas'
 };
 const WIN_ANSI_EXTRA=new Set(Array.from('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'));

 function own(object,key){return Object.prototype.hasOwnProperty.call(object,key);}
 function text(value){
  if(value===null||value===undefined)return '';
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value);
  if(typeof value==='object'){
   if(value.text!==undefined)return text(value.text);
   if(value.value!==undefined)return text(value.value);
   if(value.label!==undefined)return text(value.label);
  }
  return String(value);
 }
 function clean(value){return text(value).normalize('NFC').replace(/\s+/g,' ').trim();}
 function finite(value,fallback=0){const number=Number(value);return Number.isFinite(number)?number:fallback;}
 function confidenceValue(value){
  if(value===null||value===undefined||value==='')return null;
  if(typeof value==='object')value=value.average??value.minimum??value.value;
  const number=Number(value);return Number.isFinite(number)?number:null;
 }
 function cloneCanonical(value,path='$',seen=new Set()){
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'){
   if(!Number.isFinite(value))throw new TypeError('Projektdata innehåller ett ogiltigt tal vid '+path+'.');
   return value;
  }
  if(value instanceof Date)return value.toISOString();
  if(typeof value==='undefined'||typeof value==='function'||typeof value==='symbol'||typeof value==='bigint'){
   throw new TypeError('Projektdata innehåller ett värde som inte kan sparas vid '+path+'.');
  }
  if(typeof value!=='object')throw new TypeError('Projektdata kan inte sparas vid '+path+'.');
  if(seen.has(value))throw new TypeError('Projektdata innehåller en cirkulär referens vid '+path+'.');
  seen.add(value);
  let result;
  if(Array.isArray(value))result=value.map((item,index)=>cloneCanonical(item,path+'['+index+']',seen));
  else{
   result={};
   for(const key of Object.keys(value))result[key]=cloneCanonical(value[key],path+'.'+key,seen);
  }
  seen.delete(value);return result;
 }
 function sourceProject(input){
  if(Array.isArray(input))return {project:{},cards:input,templates:[]};
  if(input?.schema===CARD_SCHEMA&&!Array.isArray(input.cards))return {project:{},cards:[input],templates:[]};
  if(!input||typeof input!=='object')throw new TypeError('Välj strukturerade dörrkort innan du exporterar.');
  const cards=Array.isArray(input.cards)?input.cards:[];
  const templates=Array.isArray(input.templates)?input.templates:input.template?[input.template]:[];
  const project={};
  for(const key of Object.keys(input))if(!['cards','templates','template'].includes(key))project[key]=input[key];
  return {project,cards,templates};
 }
 function tokenId(token,index){return clean(token?.id)||'token-'+(index+1);}
 function tokenIdentity(token,index){
  const id=clean(token?.id);if(id)return 'id:'+id;
  const box=token?.box||{};return ['text',clean(token),finite(box.x),finite(box.y),finite(box.w),finite(box.h),index].join(':');
 }
 function collectAssignedIds(card){
  const result=new Set(),add=list=>{for(const id of Array.isArray(list)?list:[])if(clean(id))result.add(clean(id));};
  add(card?.header?.tokenIds);
  for(const field of card?.header?.fields||[])add(field?.tokenIds);
  for(const fixed of card?.fixedElements||[])add(fixed?.tokenIds);
  for(const section of card?.sections||[]){add(section?.tokenIds);for(const row of section?.rows||[])add(row?.tokenIds);}
  for(const row of card?.rows||[])add(row?.tokenIds);
  return result;
 }
 function collectUnassigned(card){
  const assigned=collectAssignedIds(card),ignored=new Set((card?.ignoredTokenIds||[]).map(clean).filter(Boolean));
  const result=[],seen=new Set();
  const add=(token,index,reason)=>{
   const value=typeof token==='string'?{text:token}:token||{};
   const identity=tokenIdentity(value,index);if(seen.has(identity))return;seen.add(identity);
   result.push({id:tokenId(value,index),text:clean(value),confidence:confidenceValue(value.confidence),
    source:clean(value.source||value.provenance?.[0]),reason,box:value.box?cloneCanonical(value.box):null});
  };
  for(const [index,token]of (card?.unassignedTokens||[]).entries())add(token,index,'explicit-unassigned');
  for(const [index,item]of (card?.unassignedText||[]).entries())add(item,index,'explicit-unassigned-text');
  for(const [index,token]of (card?.sourceTokens||[]).entries()){
   const id=clean(token?.id);if((id&&assigned.has(id))||(id&&ignored.has(id)))continue;
   add(token,index,'unreferenced-source-token');
  }
  return result;
 }
 function reviewStatus(card){
  if(card?.review?.approved===true)return 'approved';
  return clean(card?.review?.status||card?.reviewStatus||card?.status||'needs-review').toLowerCase()||'needs-review';
 }
 function isApproved(card){return reviewStatus(card)==='approved';}
 function isCompleteApproval(card){
  if(!isApproved(card))return false;
  // Canonical cards carry a review contract.  Requiring both flags and no
  // unassigned source text prevents an old/stale `approved` string from
  // bypassing the loss-aware review gate during PDF export.
  if(card?.schema===CARD_SCHEMA){
   if(card?.review?.canApprove!==true||card?.review?.complete!==true)return false;
   if(collectUnassigned(card).length)return false;
   if((card?.sourceTokens||[]).some(token=>token?.conflict===true))return false;
  }
  return true;
 }
 function valueFromAliases(object,aliases){for(const key of aliases)if(own(object||{},key))return object[key];return '';}
 function normalizeCells(row,templateColumns){
  const result={};
  if(row?.cells&&typeof row.cells==='object'&&!Array.isArray(row.cells)){
   for(const [key,value]of Object.entries(row.cells))result[key]=clean(value);
  }else if(Array.isArray(row?.cells)){
   row.cells.forEach((value,index)=>{result[templateColumns[index]?.key||'column'+(index+1)]=clean(value);});
  }
  const aliases={designation:['designation','description','name','product','benamning'],type:['type','model','execution','utforande'],
   quantity:['quantity','amount','antal'],installer:['installer','mountedBy','montor'],supplier:['supplier','suppliedBy','levererasAv'],
   connection:['connection','connectedBy','anslutsAv'],functionOwner:['functionOwner','functionalOwner','funktionsansvar'],completion:['completion','installationComplete','monteringKlar'],
   note:['note','notes','remark','anmarkning']};
  for(const [key,keys]of Object.entries(aliases))if(!own(result,key)){
   const value=valueFromAliases(row,keys);if(value!==''&&value!==undefined)result[key]=clean(value);
  }
  if(!Object.keys(result).length)result.designation=clean(row?.text||row?.value||row);
  return result;
 }
 function fieldLabel(key){
  return COLUMN_LABELS[key]||clean(key).replace(/([a-zåäö])([A-ZÅÄÖ])/g,'$1 $2').replace(/^./,letter=>letter.toLocaleUpperCase('sv-SE'));
 }
 function normalizeHeader(card){
  const header=card?.header&&typeof card.header==='object'?card.header:{};
  const code=clean(header.code||card?.code||card?.designation||card?.name||card?.id||'Dörrkort');
  const label=clean(header.label||card?.label||card?.title||'Digitalt dörrkort');
  const fields=[];
  for(const field of Array.isArray(header.fields)?header.fields:[]){
   const value=clean(field?.text??field?.value??field);if(!value)continue;
   fields.push({id:clean(field?.id)||'field-'+(fields.length+1),label:clean(field?.label)||fieldLabel(field?.id||'uppgift'),value,
    confidence:confidenceValue(field?.confidence)});
  }
  for(const [key,value]of Object.entries(header)){
   if(['code','normalizedCode','label','fields','tokenIds','valueTokenIds'].includes(key)||value===null||typeof value==='object')continue;
   const normalized=clean(value);if(normalized&&!fields.some(field=>field.id===key))fields.push({id:key,label:fieldLabel(key),value:normalized,confidence:null});
  }
  return {code,label,fields};
 }
 function templateColumns(template){
  return (template?.columns||[]).filter(column=>column?.capture!==false).map((column,index)=>({key:clean(column?.key)||'column'+(index+1),label:clean(column?.label)||fieldLabel(column?.key||'column'+(index+1))}));
 }
 function normalizeCard(card,index,template){
  if(!card||typeof card!=='object')throw new TypeError('Dörrkort '+(index+1)+' saknar strukturerad data.');
  const columns=templateColumns(template),rawSections=Array.isArray(card.sections)?card.sections.slice():[];
  if(!rawSections.length&&Array.isArray(card.rows))rawSections.push({key:'products',label:'Produkter',rows:card.rows});
  const sections=rawSections.map((section,sectionIndex)=>({
   key:clean(section?.key)||'section-'+(sectionIndex+1),label:clean(section?.label||section?.title||section?.name)||'Avsnitt '+(sectionIndex+1),
   rows:(section?.rows||section?.items||[]).map((row,rowIndex)=>({id:clean(row?.id)||'row-'+(rowIndex+1),cells:normalizeCells(row,columns),
    confidence:confidenceValue(row?.confidence),reviewed:row?.reviewed===true,manual:row?.manual===true}))
  }));
  const present=[],seen=new Set();
  for(const column of columns)if(!seen.has(column.key)){seen.add(column.key);present.push(column);}
  for(const key of ['designation','type','quantity','installer']){
   if(sections.some(section=>section.rows.some(row=>clean(row.cells?.[key])))&&!seen.has(key)){seen.add(key);present.push({key,label:fieldLabel(key)});}
  }
  for(const section of sections)for(const row of section.rows)for(const key of Object.keys(row.cells))if(clean(row.cells[key])&&!seen.has(key)){
   seen.add(key);present.push({key,label:fieldLabel(key)});
  }
  if(!present.length)for(const key of ['designation','type','quantity','installer'])present.push({key,label:fieldLabel(key)});
  const header=normalizeHeader(card),unassigned=collectUnassigned(card),status=reviewStatus(card);
  return {id:clean(card.id)||'card-'+(index+1),templateId:clean(card.templateId),sourcePage:Number(card?.source?.page||card?.page)||null,
   header,sections,columns:present,unassigned,status,statusLabel:STATUS_LABELS[status]||clean(status)||'Behöver granskas',
   ignoredCount:Array.isArray(card.ignoredTokenIds)?card.ignoredTokenIds.length:0,sourceTokenCount:Array.isArray(card.sourceTokens)?card.sourceTokens.length:0};
 }
 function resolveTemplate(card,templates){
  const id=clean(card?.templateId);return templates.find(template=>clean(template?.id)===id)||templates[0]||null;
 }
 function normalizedProject(input){
  const source=sourceProject(input),templates=source.templates;
  return {...source,cards:source.cards.map((card,index)=>normalizeCard(card,index,resolveTemplate(card,templates)))};
 }
 function integrityFor(normalized){
  const cards=normalized.cards.map(card=>({id:card.id,code:card.header.code,status:card.status,approved:card.status==='approved',
   sourcePage:card.sourcePage,sectionCount:card.sections.length,rowCount:card.sections.reduce((sum,section)=>sum+section.rows.length,0),
   sourceTokenCount:card.sourceTokenCount,unassignedTokenCount:card.unassigned.length,unassigned:cloneCanonical(card.unassigned),ignoredTokenCount:card.ignoredCount}));
  return {cardCount:cards.length,approvedCardCount:cards.filter(card=>card.approved).length,
   needsReviewCount:cards.filter(card=>!card.approved).length,rowCount:cards.reduce((sum,card)=>sum+card.rowCount,0),
   unassignedTokenCount:cards.reduce((sum,card)=>sum+card.unassignedTokenCount,0),
   containsUnassignedText:cards.some(card=>card.unassignedTokenCount>0),cards};
 }
 function buildManifest(input,options={}){
  const source=sourceProject(input),normalized=normalizedProject(input),exportedAt=options.exportedAt||new Date().toISOString();
  const project=cloneCanonical(source.project),cards=cloneCanonical(source.cards),templates=cloneCanonical(source.templates);
  return {schema:SCHEMA,schemaVersion:SCHEMA_VERSION,exportedAt,producer:'Tillsyno Ritningsverktyg',project,templates,cards,
   integrity:integrityFor(normalized)};
 }
 function buildJson(input,options={}){
  return JSON.stringify(buildManifest(input,options),null,options.pretty===false?0:2);
 }
 function sanitizeWinAnsi(value){
  const source=text(value).normalize('NFC').replace(/\r\n?/g,'\n').replace(/[\t\v\f]/g,' '),parts=[];
  for(const character of source){
   const point=character.codePointAt(0);
   if(character==='\n'||(point>=0x20&&point<=0x7e)||(point>=0xa0&&point<=0xff)||WIN_ANSI_EXTRA.has(character))parts.push(character);
   else if(point<0x20)parts.push(' ');
   else parts.push('[U+'+point.toString(16).toUpperCase().padStart(4,'0')+']');
  }
  return parts.join('');
 }
 function splitLongWord(word,max){
  const result=[];for(let offset=0;offset<word.length;offset+=max)result.push(word.slice(offset,offset+max));return result.length?result:[''];
 }
 function wrapText(value,maxCharacters=60){
  const maximum=Math.max(3,Math.floor(maxCharacters)),result=[];
  for(const paragraph of sanitizeWinAnsi(value).split('\n')){
   const words=paragraph.trim().split(/\s+/).filter(Boolean);let line='';
   if(!words.length){result.push('');continue;}
   for(const original of words){
    const pieces=original.length>maximum?splitLongWord(original,maximum):[original];
    for(const word of pieces){
     if(!line){line=word;continue;}
     if((line+' '+word).length<=maximum)line+=' '+word;
     else{result.push(line);line=word;}
    }
   }
   if(line)result.push(line);
  }
  return result.length?result:[''];
 }
 function columnWeights(columns){
  const weights={designation:2.35,description:2.35,name:2.35,product:2.35,type:2,model:2,quantity:.62,amount:.62,installer:.9,mountedBy:.9,supplier:1.05,connection:1.05,functionOwner:1.2,completion:1.2,note:1.55,notes:1.55};
  const raw=columns.map(column=>weights[column.key]||1.15),sum=raw.reduce((total,value)=>total+value,0);return raw.map(value=>value/sum);
 }
 function planCardLayout(cardInput,options={}){
  const card=cardInput?.header&&Array.isArray(cardInput.sections)&&Array.isArray(cardInput.columns)?cardInput:normalizeCard(cardInput,0,options.template);
  const pageWidth=finite(options.pageWidth,card.columns.length>5?PDF_HEIGHT:PDF_WIDTH),margin=finite(options.margin,MARGIN);
  const contentWidth=pageWidth-margin*2,fontSize=finite(options.fontSize,8.2),lineHeight=fontSize+2.3,padding=4;
  const weights=columnWeights(card.columns),columns=card.columns.map((column,index)=>({...column,width:contentWidth*weights[index]}));
  const blocks=[];
  blocks.push({kind:'title',height:49,code:card.header.code,label:card.header.label,status:card.statusLabel,sourcePage:card.sourcePage});
  const fieldRows=[],fieldWidth=contentWidth/2-padding*2;
  for(let index=0;index<card.header.fields.length;index+=2){
   const fields=card.header.fields.slice(index,index+2).map(field=>({...field,
    lines:wrapText(field.label+': '+field.value,Math.max(12,Math.floor(fieldWidth/(fontSize*.55))))}));
   fieldRows.push({fields,height:Math.max(1,...fields.map(field=>field.lines.length))*lineHeight+padding*2});
  }
  if(fieldRows.length)blocks.push({kind:'fields',height:fieldRows.reduce((sum,row)=>sum+row.height,0),rows:fieldRows});
  const headerLines=columns.map(column=>wrapText(column.label,Math.max(4,Math.floor(column.width/(fontSize*.58)))));
  blocks.push({kind:'columns',height:Math.max(...headerLines.map(lines=>lines.length))*lineHeight+padding*2,columns:columns.map((column,index)=>({...column,lines:headerLines[index]}))});
  for(const section of card.sections){
   blocks.push({kind:'section',height:20,label:section.label,key:section.key});
   if(!section.rows.length)blocks.push({kind:'empty',height:20,text:'Inga rader avlästa i detta avsnitt.'});
   for(const row of section.rows){
    const cells=columns.map(column=>{
     const value=own(row.cells,column.key)?row.cells[column.key]:'';
     return {key:column.key,text:value,lines:wrapText(value,Math.max(3,Math.floor(column.width/(fontSize*.55))))};
    });
    blocks.push({kind:'row',height:Math.max(1,...cells.map(cell=>cell.lines.length))*lineHeight+padding*2,cells,row});
   }
  }
  if(!card.sections.length)blocks.push({kind:'empty',height:30,text:'Inga tabellrader avlästa.'});
  blocks.push({kind:'unassigned-title',height:25,count:card.unassigned.length});
  if(card.unassigned.length){
   for(const token of card.unassigned){
    const prefix=token.confidence===null?'':'['+Math.round(token.confidence)+' %] ';
    const lines=wrapText(prefix+token.text,Math.max(20,Math.floor(contentWidth/(fontSize*.55))));
    blocks.push({kind:'unassigned',height:lines.length*lineHeight+padding*2,lines,token});
   }
  }else blocks.push({kind:'unassigned-empty',height:22,text:'Ingen oplacerad avläst text.'});
  const contentHeight=blocks.reduce((sum,block)=>sum+block.height,0),footerHeight=24,pageHeight=Math.max(PDF_HEIGHT,margin*2+contentHeight+footerHeight);
  return {card,pageWidth,pageHeight,margin,contentWidth,fontSize,lineHeight,padding,columns,blocks,footerHeight,
   unassignedCount:card.unassigned.length,rowCount:card.sections.reduce((sum,section)=>sum+section.rows.length,0)};
 }
 function checked(options){
  if(options?.signal?.aborted||options?.cancelled?.()){
   const error=new Error('PDF-exporten avbröts.');error.name='AbortError';throw error;
  }
 }
 function progress(options,value){try{options?.onProgress?.(value);}catch(_){/* UI progress cannot invalidate an export. */}}
 function pdfLibrary(options){
  const library=options?.pdfLib||root?.PDFLib;
  if(!library?.PDFDocument||!library?.StandardFonts||!library?.rgb)throw new Error('PDF-biblioteket är inte tillgängligt. Öppna verktyget igen och försök exportera på nytt.');
  return library;
 }
 function pdfText(font,value){
  let candidate=sanitizeWinAnsi(value);
  try{font.encodeText(candidate);return candidate;}catch(_){/* Check each code point below. */}
  let result='';
  for(const character of candidate){
   try{font.encodeText(character);result+=character;}
   catch(_){result+='[U+'+character.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')+']';}
  }
  return result;
 }
 function drawLines(page,font,lines,x,top,size,lineHeight,color,maxLines=Infinity){
  let offset=0;for(const line of lines.slice(0,maxLines)){page.drawText(pdfText(font,line),{x,y:top-size-offset,size,font,color});offset+=lineHeight;}
 }
 function drawCellBorders(page,x,y,width,height,color){page.drawRectangle({x,y,width,height,borderWidth:.45,borderColor:color});}
 function renderCard(document,library,layout,index,total,fonts){
  const {rgb}=library,{normal,bold}=fonts,page=document.addPage([layout.pageWidth,layout.pageHeight]),ink=rgb(.09,.13,.16),muted=rgb(.34,.4,.44),
   border=rgb(.68,.72,.74),navy=rgb(.08,.23,.34),pale=rgb(.91,.95,.97),soft=rgb(.965,.972,.976),warning=rgb(1,.94,.73),danger=rgb(.72,.14,.1);
  let top=layout.pageHeight-layout.margin;
  for(const block of layout.blocks){
   const bottom=top-block.height;
   if(block.kind==='title'){
    page.drawRectangle({x:layout.margin,y:bottom,width:layout.contentWidth,height:block.height,color:navy});
    page.drawText(pdfText(bold,block.code||'Dörrkort'),{x:layout.margin+10,y:top-20,size:15,font:bold,color:rgb(1,1,1)});
    page.drawText(pdfText(normal,block.label),{x:layout.margin+10,y:bottom+9,size:8.5,font:normal,color:rgb(.88,.94,.97)});
    const right=(block.sourcePage?'Original sida '+block.sourcePage+' · ':'')+block.status;
    const rightWidth=normal.widthOfTextAtSize(pdfText(normal,right),8);
    page.drawText(pdfText(normal,right),{x:Math.max(layout.margin+160,layout.pageWidth-layout.margin-rightWidth-10),y:top-18,size:8,font:normal,color:block.status==='Godkänt'?rgb(.7,1,.78):rgb(1,.88,.45)});
   }else if(block.kind==='fields'){
    page.drawRectangle({x:layout.margin,y:bottom,width:layout.contentWidth,height:block.height,color:soft,borderColor:border,borderWidth:.45});
    const half=layout.contentWidth/2;let rowTop=top;
    block.rows.forEach(row=>{row.fields.forEach((field,columnIndex)=>{
     const x=layout.margin+columnIndex*half+layout.padding;
     drawLines(page,normal,field.lines,x,rowTop-layout.padding,layout.fontSize,layout.lineHeight,ink);
    });rowTop-=row.height;});
   }else if(block.kind==='columns'){
    page.drawRectangle({x:layout.margin,y:bottom,width:layout.contentWidth,height:block.height,color:pale});let x=layout.margin;
    block.columns.forEach(column=>{drawCellBorders(page,x,bottom,column.width,block.height,border);drawLines(page,bold,column.lines,x+layout.padding,top-layout.padding,layout.fontSize,layout.lineHeight,ink);x+=column.width;});
   }else if(block.kind==='section'){
    page.drawRectangle({x:layout.margin,y:bottom,width:layout.contentWidth,height:block.height,color:rgb(.84,.9,.94),borderColor:border,borderWidth:.45});
    page.drawText(pdfText(bold,block.label),{x:layout.margin+layout.padding,y:bottom+6,size:8.4,font:bold,color:navy});
   }else if(block.kind==='row'){
    const uncertain=block.row.confidence!==null&&block.row.confidence<70;
    if(uncertain)page.drawRectangle({x:layout.margin,y:bottom,width:layout.contentWidth,height:block.height,color:warning});
    let x=layout.margin;block.cells.forEach((cell,columnIndex)=>{const width=layout.columns[columnIndex].width;drawCellBorders(page,x,bottom,width,block.height,border);
     drawLines(page,normal,cell.lines,x+layout.padding,top-layout.padding,layout.fontSize,layout.lineHeight,ink);x+=width;});
   }else if(block.kind==='empty'){
    drawCellBorders(page,layout.margin,bottom,layout.contentWidth,block.height,border);page.drawText(pdfText(normal,block.text),{x:layout.margin+layout.padding,y:bottom+6,size:8,font:normal,color:muted});
   }else if(block.kind==='unassigned-title'){
    const has=block.count>0;page.drawRectangle({x:layout.margin,y:bottom,width:layout.contentWidth,height:block.height,color:has?warning:pale,borderColor:has?danger:border,borderWidth:.65});
    page.drawText(pdfText(bold,'Oplacerad avläst text ('+block.count+')'),{x:layout.margin+layout.padding,y:bottom+8,size:9,font:bold,color:has?danger:ink});
   }else if(block.kind==='unassigned'){
    page.drawRectangle({x:layout.margin,y:bottom,width:layout.contentWidth,height:block.height,color:rgb(1,.985,.91),borderColor:border,borderWidth:.45});
    drawLines(page,normal,block.lines,layout.margin+layout.padding,top-layout.padding,layout.fontSize,layout.lineHeight,ink);
   }else if(block.kind==='unassigned-empty'){
    drawCellBorders(page,layout.margin,bottom,layout.contentWidth,block.height,border);page.drawText(pdfText(normal,block.text),{x:layout.margin+layout.padding,y:bottom+7,size:8,font:normal,color:muted});
   }
   top=bottom;
  }
  const footer='Digitalt dörrkort · Kort '+(index+1)+' av '+total+' · '+layout.card.id;
  page.drawLine({start:{x:layout.margin,y:layout.margin+14},end:{x:layout.pageWidth-layout.margin,y:layout.margin+14},thickness:.5,color:border});
  page.drawText(pdfText(normal,footer),{x:layout.margin,y:layout.margin+3,size:7,font:normal,color:muted});
  return page;
 }
 function safeBaseName(value){
  const name=clean(value||'digitala-dorrkort').replace(/\.pdf$/i,'').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').replace(/\s+/g,' ').trim();
  return name||'digitala-dorrkort';
 }
 function defaultPdfName(input,options={}){
  const source=sourceProject(input),sourceName=options.sourceName||source.project?.source?.fileName||source.project?.fileName;
  return safeBaseName(sourceName||'digitala-dorrkort')+(sourceName?'-digitala-dorrkort':'')+'.pdf';
 }
 function defaultJsonName(input,options={}){return defaultPdfName(input,options).replace(/\.pdf$/i,'.json');}
 async function buildPdfPackage(input,options={}){
  const library=pdfLibrary(options),source=sourceProject(input),normalized=normalizedProject(input);
  if(!normalized.cards.length)throw new Error('Det finns inga digitala dörrkort att exportera.');
  if(options.requireApproved){
   const pending=source.cards.filter(card=>!isCompleteApproval(card));
   if(pending.length)throw new Error(pending.length+' dörrkort behöver godkännas innan PDF-exporten.');
  }
  checked(options);progress(options,{phase:'prepare',completed:0,total:normalized.cards.length,percent:1,message:'Förbereder digitala dörrkort…'});
  const manifest=buildManifest(input,options),json=JSON.stringify(manifest,null,2),document=await library.PDFDocument.create();
  document.setTitle?.('Digitala dörrkort');document.setSubject?.('Granskade, strukturerade och sökbara dörrkort');
  document.setCreator?.('Tillsyno Ritningsverktyg');document.setProducer?.('Tillsyno Ritningsverktyg');
  const normal=await document.embedFont(library.StandardFonts.Helvetica),bold=await document.embedFont(library.StandardFonts.HelveticaBold);
  const reports=[];
  for(let index=0;index<normalized.cards.length;index++){
   checked(options);const layout=planCardLayout(normalized.cards[index],options);renderCard(document,library,layout,index,normalized.cards.length,{normal,bold});
   reports.push({id:layout.card.id,page:index+1,status:layout.card.status,rowCount:layout.rowCount,unassignedTokenCount:layout.unassignedCount,
    width:layout.pageWidth,height:layout.pageHeight});
   progress(options,{phase:'pages',completed:index+1,total:normalized.cards.length,percent:Math.round(5+(index+1)/normalized.cards.length*82),
    cardId:layout.card.id,message:'Skapar dörrkort '+(index+1)+' av '+normalized.cards.length+'…'});
   if(index%5===4)await new Promise(resolve=>setTimeout(resolve,0));
  }
  checked(options);let attachmentEmbedded=false;
  if(typeof document.attach==='function'){
   progress(options,{phase:'manifest',completed:normalized.cards.length,total:normalized.cards.length,percent:90,message:'Bifogar strukturerad projektdata…'});
   await document.attach(new TextEncoder().encode(json),options.manifestFileName||MANIFEST_FILE,{mimeType:'application/json',description:'Strukturerade digitala dörrkort för Tillsyno SmartMatch'});
   attachmentEmbedded=true;
  }
  if(library.PDFName&&library.PDFString&&document.catalog?.set){
   const marker='version='+SCHEMA_VERSION+';cards='+normalized.cards.length+';manifest='+(attachmentEmbedded?(options.manifestFileName||MANIFEST_FILE):'sidecar-required');
   document.catalog.set(library.PDFName.of('TillsynoDigitalDoorCards'),library.PDFString.of(marker));
  }
  checked(options);progress(options,{phase:'save',completed:normalized.cards.length,total:normalized.cards.length,percent:96,message:'Slutför sökbar PDF…'});
  const bytes=new Uint8Array(await document.save({useObjectStreams:false,updateFieldAppearances:false}));
  checked(options);const report={cardCount:reports.length,pageCount:reports.length,approvedCardCount:reports.filter(card=>card.status==='approved').length,
   needsReviewCount:reports.filter(card=>card.status!=='approved').length,unassignedTokenCount:reports.reduce((sum,card)=>sum+card.unassignedTokenCount,0),
   attachmentEmbedded,cards:reports,bytes:bytes.length};
  progress(options,{phase:'complete',completed:normalized.cards.length,total:normalized.cards.length,percent:100,message:'PDF klar.'});
  return {bytes,manifest,report};
 }
 async function buildPdf(input,options={}){return (await buildPdfPackage(input,options)).bytes;}
 function downloadBlob(blob,fileName,options={}){
  const document=options.document||root?.document,urlApi=options.URL||root?.URL;
  if(!document?.createElement||!urlApi?.createObjectURL)throw new Error('Nedladdning stöds inte i den här miljön.');
  const url=urlApi.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=fileName;anchor.style.display='none';
  (document.body||document.documentElement).appendChild(anchor);anchor.click();anchor.remove();
  (root?.setTimeout||setTimeout)(()=>urlApi.revokeObjectURL(url),1000);return {blob,fileName};
 }
 function downloadJson(input,options={}){
  const manifest=buildManifest(input,options),json=JSON.stringify(manifest,null,options.pretty===false?0:2),fileName=options.fileName||defaultJsonName(input,options);
  const blob=new Blob([json],{type:'application/json;charset=utf-8'});downloadBlob(blob,fileName,options);return {blob,fileName,json,manifest};
 }
 async function downloadPdf(input,options={}){
  const result=await buildPdfPackage(input,options),fileName=options.fileName||defaultPdfName(input,options),blob=new Blob([result.bytes],{type:'application/pdf'});
  downloadBlob(blob,fileName,options);return {...result,blob,fileName};
 }

 return {SCHEMA,SCHEMA_VERSION,MANIFEST_FILE,buildManifest,buildJson,buildPdf,buildPdfPackage,downloadPdf,downloadJson,downloadBlob,
  normalizeCard,collectUnassigned,planCardLayout,sanitizeWinAnsi,wrapText,isApproved,isCompleteApproval,defaultPdfName,defaultJsonName};
});
