/* First-import test: PDF Stamp annotations and structured door schedules only.
   No OCR/text search on drawing pages is used to invent placements. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./smartmatch-projektering-v2-19-data.js'),require('./vendor/pdf-lib.min.js'),require('./vendor/pdf.min.js'),require('./smartmatch-projektering-v2-19-pdf.js'));
 else root.Proj2Import=factory(root.Proj2Data,root.PDFLib,root.pdfjsLib,root.Proj2PDF);
})(typeof window==='object'?window:globalThis,function(D,L,J,P){
 'use strict';
 const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const clean=s=>String(s||'').trim().replace(/\s+/g,' ');
 const present=s=>!!clean(s)&&!/^[-–—]+$/.test(clean(s));
 const labelKey=s=>fold(s).replace('dorrstangningsarm','dorrstangararm').replace('oppningsknapp','oppnaknapp');
 const SECTION_NAMES=['Daglåsning','Nattlåsning','Dörrstängning','Larm/Passer','Övriga tillbehör'];
 const FUN_NAMES=['Dörrfunktion','Larmfunktion','Brandfunktion'];
 const META={littera:'littera',hangning:'hanging',dorrtyp:'doorType',brandkrav:'fire',skyddsklass:'security',utrymningskrav:'escape',aterinrymning:'reentry'};
 const HEADERS={levav:'delivery',levererasav:'delivery',montav:'installer',monterasav:'installer',anslav:'connection',anslutsav:'connection',funkansvar:'functionOwner',funktionsansvar:'functionOwner',anm:'note'};
 const lookup=(doc,value)=>value?doc.context.lookup(value):undefined;
 const get=(doc,dict,key)=>lookup(doc,dict.get(L.PDFName.of(key)));
 const str=(doc,dict,key)=>get(doc,dict,key)?.decodeText?.()||'';
 const nums=(doc,value)=>{const a=lookup(doc,value);return a?.asArray?.().map(v=>lookup(doc,v)?.asNumber?.());};
 const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
 function codeOf(text){try{return D.normalizeCode(text);}catch(_){return null;}}
 function linesOf(items,viewport){
  const entries=items.filter(t=>clean(t.str)).map(t=>{const [x,y]=point(viewport.transform,t.transform[4],t.transform[5]);return {text:clean(t.str),x,y,w:t.width,h:Math.hypot(t.transform[0],t.transform[1])};}).sort((a,b)=>a.y-b.y||a.x-b.x);
  const lines=[];for(const item of entries){let line=lines.at(-1);if(!line||Math.abs(line.y-item.y)>Math.max(1.5,Math.min(3,item.h*.25))){line={y:item.y,items:[]};lines.push(line);}line.items.push(item);}return lines.map(line=>({...line,items:line.items.sort((a,b)=>a.x-b.x)}));
 }
 function readCard(items,viewport,pageNumber){
  const lines=linesOf(items,viewport),sectionLines=lines.filter(line=>line.items.some(item=>SECTION_NAMES.some(name=>fold(name)===fold(item.text))));
  if(sectionLines.length<2)return null;
  const firstSection=sectionLines[0].y;
  const header=lines.find(line=>line.y<firstSection&&line.items.some(item=>HEADERS[fold(item.text)]==='delivery')&&line.items.some(item=>HEADERS[fold(item.text)]==='installer'));
  if(!header)throw Error('Sida '+pageNumber+' liknar ett dörrkort men kolumnerna Lev av/Mont av kunde inte läsas. Ingen konvertering har sparats.');
  const columns=header.items.filter(item=>HEADERS[fold(item.text)]).map(item=>({...item,key:HEADERS[fold(item.text)],center:item.x+item.w/2})).sort((a,b)=>a.center-b.center);
  const lev=columns.find(c=>c.key==='delivery'),mont=columns.find(c=>c.key==='installer'),spacing=mont.center-lev.center;
  if(spacing<=0)throw Error('Ansvarskolumnerna på sida '+pageNumber+' kunde inte avgränsas.');
  const productRight=lev.center-spacing/2;
  const candidates=lines.filter(line=>line.y<header.y&&line.y>firstSection-viewport.height*.35).flatMap(line=>line.items).filter(item=>item.x<productRight&&/^(?:[A-Z]{1,8}[- ]?\d+[A-Z0-9-]*(?::[1-9]\d*)?|WC|HWC|DBL|DDL|VCDS)$/i.test(item.text)).map(item=>codeOf(item.text)).filter(code=>code&&(/[0-9]/.test(code)||/^(?:WC|HWC|DBL|DDL|VCDS)$/.test(code)));
  const codes=[...new Set(candidates)];if(codes.length!==1)throw Error('Dörrkortets beteckning på sida '+pageNumber+' är otydlig. Ingen konvertering har sparats.');
  const card=D.createCard(codes[0]);for(const row of card.rows){row.delivery='';row.installer='';}
  const functionStart=lines.find(line=>line.y>firstSection&&line.items.some(item=>FUN_NAMES.some(name=>fold(name)===fold(item.text))))?.y||Infinity;
  const rowLines=lines.filter(line=>line.y>firstSection&&line.y<functionStart&&!sectionLines.includes(line));
  const known=D.SECTIONS.flatMap(s=>s.rows).map(r=>labelKey(r.label));
  // A reliable label/model boundary is learned from actual known component rows.
  const starts=rowLines.flatMap(line=>{const i=line.items.findIndex(item=>known.includes(labelKey(item.text)));return i<0?[]:line.items.slice(i+1).filter(item=>item.x<productRight).slice(0,1).map(item=>item.x);});
  if(starts.length<3)throw Error('Materialraderna på sida '+pageNumber+' kunde inte avgränsas.');
  const productLeft=Math.min(...starts)-1;
  for(const line of lines.filter(line=>line.y<header.y)){
   const label=line.items.find(item=>META[fold(item.text)]);if(!label)continue;const value=line.items.filter(item=>item.x>=productLeft&&item.x<productRight).map(item=>item.text).join(' ');if(present(value))card.meta[META[fold(label.text)]]=value;
  }
  const assigned=new Set();let section='';
  for(const line of lines.filter(line=>line.y>=firstSection&&line.y<functionStart)){
   const heading=line.items.find(item=>SECTION_NAMES.some(name=>fold(name)===fold(item.text)));
   if(heading){section=SECTION_NAMES.find(name=>fold(name)===fold(heading.text));continue;}
   const label=clean(line.items.filter(item=>item.x<productLeft).map(item=>item.text).join(' '));if(!label)continue;
   const values=line.items.filter(item=>item.x>=productLeft&&item.x<productRight);
   if(!values.length)continue;
   const first=values[0],productParts=[first.text],description=[];let end=first.x+first.w;
   for(const item of values.slice(1)){if(item.x-end<3&&!description.length){productParts.push(item.text);end=item.x+item.w;}else description.push(item.text);}
   const product=clean(productParts.join(' '));
   const def=D.SECTIONS.find(s=>s.title===section)?.rows.find(row=>labelKey(row.label)===labelKey(label));
   let row=def&&card.rows.find(row=>row.id===def.id);
   if(row&&assigned.has(row.id))throw Error(card.code+': dubbla rader för '+label+'. Kontrollera originalkortet.');
   if(!row){if(!present(product))continue;row={id:'import-'+(card.rows.length-38),section,label,category:labelKey(label)==='kabeloverforing'?'cable':labelKey(label)==='dorrstopp'?'door-stop':'other',product:'',quantity:1,delivery:'',installer:''};card.rows.push(row);}
   assigned.add(row.id);row.product=present(product)?product:'';row.imported=true;row.connection='';row.functionOwner='';row.note=description.filter(present).join(' ');
   for(let c=0;c<columns.length;c++){
    const column=columns[c],left=column.key==='note'?columns[c-1].center+spacing/2:c?(columns[c-1].center+column.center)/2:productRight;
    const right=c+1<columns.length?(columns[c+1].key==='note'?column.center+spacing/2:(column.center+columns[c+1].center)/2):column.center+Math.max(spacing/2,column.w);
    // Notes can be long and start at the left cell border, unlike centered owners.
    const value=clean(line.items.filter(item=>item.x>=left-1&&item.x<right-1).map(item=>item.text).join(' '));
    if(column.key==='note'){if(present(value))row.note=clean([row.note,value].filter(Boolean).join(' · '));}
    else row[column.key]=present(value)?value:'';
   }
  }
  const notes=[];let functionName='';
  for(const line of lines.filter(line=>line.y>=functionStart)){
   const label=line.items.find(item=>FUN_NAMES.some(name=>fold(name)===fold(item.text)));
   if(label){functionName=label.text;continue;}
   if(line.items.some(item=>['datum','version','objekt'].includes(fold(item.text)))){functionName='';continue;}
   if(functionName){const value=line.items.filter(item=>item.x>=productLeft).map(item=>item.text).join(' ');if(present(value))notes.push(functionName+': '+value);}
  }
  card.note=notes.join('\n');return card;
 }
 function stampCode(subject,contents){
  const aliases={dorrautomatik:'DA',dorrstangare:'DS',armbagskontakt:'AK',kortlasare:'KL',lasaremedknappsats:'KL'};
  for(const value of [subject,contents]){const f=fold(value);if(aliases[f])return aliases[f];if(f.startsWith('lasaremedknappsats')||f==='kortlasaremedknappsats'||f==='kortlasaremknappsats')return 'KL';}
  const direct=codeOf(subject);return direct||codeOf(contents);
 }
 async function scan(input,name,onProgress=()=>{}){
  const bytes=new Uint8Array(input);if(bytes.length>50*1024*1024)throw Error('Ritningen får vara högst 50 MB i importtestet.');
  const source=await L.PDFDocument.load(bytes);
  if(source.catalog.get(L.PDFName.of(P.DATA_KEY)))throw Error('Detta är redan ett Tillsyno-projekt. Öppna det som projekt.');
  const reader=await J.getDocument({data:bytes.slice(),isEvalSupported:false,disableFontFace:true,verbosity:0}).promise;
  const state=D.createEmpty(name.replace(/\.pdf$/i,'')),cardPages=new Set(),issues=[],stats={stamps:0,matched:0,unmatched:0,ignored:0,cards:0,rows:0};
  state.stencils={};state.cards={};state.schema=5;
  const pages=P.metadata(source),remove=new Map(),pending=[];
  try{
   if(reader.numPages>200)throw Error('Importtestet stöder högst 200 sidor.');
   for(let n=1;n<=reader.numPages;n++){
    onProgress('Läser dörrkort · '+n+'/'+reader.numPages);
    const page=await reader.getPage(n),text=await page.getTextContent(),card=readCard(text.items,page.getViewport({scale:1}),n);
    if(card){if(state.cards[card.code])throw Error('Flera dörrkort heter '+card.code+'. Kontrollera korten innan de konverteras.');state.cards[card.code]=card;cardPages.add(n);stats.rows+=card.rows.filter(r=>present(r.product)).length;}
    page.cleanup();await new Promise(resolve=>setTimeout(resolve,0));
   }
   if(!cardPages.size)throw Error('Inga läsbara dörrkort med ansvarskolumner hittades. Importtestet stöder textbaserade kort med Daglåsning/Nattlåsning. PDF:en kan fortfarande öppnas som vanligt ritningsunderlag.');
   for(let n=1;n<=pages.length;n++){
    if(cardPages.has(n))continue;const page=source.getPage(n-1),arr=get(source,page.node,'Annots');if(!arr?.asArray)continue;
    for(const ref of arr.asArray()){
     const a=lookup(source,ref);if(!a?.get||String(get(source,a,'Subtype'))!=='/Stamp')continue;
     const flags=get(source,a,'F')?.asNumber?.()||0;if(flags&35)continue;
     stats.stamps++;const subject=str(source,a,'Subj'),contents=str(source,a,'Contents'),code=stampCode(subject,contents),rect=nums(source,a.get(L.PDFName.of('Rect')));
     if(!code||!rect||rect.length!==4||!rect.every(Number.isFinite)){stats.ignored++;issues.push('Sida '+n+': stämpeln ”'+clean(subject||contents).slice(0,100)+'” ligger kvar i PDF-bakgrunden; beteckning eller läge behöver kontrolleras.');continue;}
     const sheet=pages[n-1],corners=[[rect[0],rect[1]],[rect[2],rect[3]]].map(p=>point(sheet.transform,...p)),x0=Math.min(...corners.map(p=>p[0])),y0=Math.min(...corners.map(p=>p[1])),width=Math.abs(corners[1][0]-corners[0][0]),height=Math.abs(corners[1][1]-corners[0][1]);
     if(width<6||height<6||width>500||height>500||x0<0||y0<0||x0+width>sheet.width||y0+height>sheet.height){stats.ignored++;issues.push('Sida '+n+': '+code+' har en storlek eller position som behöver kontrolleras. Originalstämpeln behålls.');continue;}
     const hasCard=!!state.cards[code];
     if(!state.stencils[code]){const stencil=D.defaultStencil(code);state.stencils[code]={...stencil,kind:hasCard?'card':'symbol',productType:hasCard?'none':stencil.productType,category:hasCard?'Dörrkort':stencil.category,width,height,fontSize:Math.max(4,Math.min(11,height*.4))};}
     const id='import-'+n+'-'+(pending.length+1),p={id,page:n,code,stencilId:code,x:(x0+width/2)/sheet.width,y:(y0+height/2)/sheet.height,width,height,rotation:0,locked:false,note:hasCard?'':'Importerad stämpel: '+clean(subject||contents).slice(0,120)};
     pending.push(p);if(!remove.has(n))remove.set(n,new Set());remove.get(n).add(ref);if(hasCard)stats.matched++;else if(!['DA','DS','AK','KL'].includes(code))stats.unmatched++;
    }
   }
   const unmatched=[...new Set(pending.filter(p=>!state.cards[p.code]&&!['DA','DS','AK','KL'].includes(p.code)).map(p=>p.code))];
   for(const code of unmatched)issues.push(code+': '+pending.filter(p=>p.code===code).length+' stämplar saknar ett matchande dörrkort. De är flyttbara symboler; inget material har gissats.');
   for(const code of Object.keys(state.cards)){if(!state.stencils[code])state.stencils[code]=D.defaultStencil(code);if(!pending.some(p=>p.code===code))issues.push(code+': dörrkortet är inläst men ingen stämpel med samma beteckning hittades.');}
   if(!pending.length)throw Error('Inga redigerbara stämplar kunde läsas. Tillplattade symboler ingår inte i detta importtest.');
   const retained=source.getPageIndices().filter(index=>!cardPages.has(index+1));if(!retained.length)throw Error('Filen saknar ritningssidor.');
   for(const [n,refs]of remove){const page=source.getPage(n-1),arr=get(source,page.node,'Annots');page.node.set(L.PDFName.of('Annots'),source.context.obj(arr.asArray().filter(ref=>!refs.has(ref))));}
   const background=await L.PDFDocument.create();for(const page of await background.copyPages(source,retained))background.addPage(page);
   const mapping=new Map(retained.map((old,index)=>[old+1,index+1]));state.placements=pending.map(p=>({...p,page:mapping.get(p.page)}));
   state.drawing={name,pages:P.metadata(background)};state.conversion={version:1,sourceName:name,issues:[...new Set(issues)].slice(0,1000)};
   stats.cards=Object.keys(state.cards).length;const valid=D.validate(state),original=new Uint8Array(await background.save());
   if(original.length>50*1024*1024)throw Error('Den konverterade ritningen är större än 50 MB.');
   onProgress('Importen är läst.');return {state:valid,original,stats,cardPages:[...cardPages],issues:valid.conversion.issues};
  }finally{await reader.destroy();}
 }
 return Object.freeze({scan,readCard,stampCode,linesOf});
});
