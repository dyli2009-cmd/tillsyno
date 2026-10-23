/* Projektering 2.15: searchable WC/HWC text on vector door stamps. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(()=>require('./vendor/pdf-lib.min.js'),()=>require('./smartmatch-projektering-v2-15-data.js'));
 else root.Proj2PDF=factory(()=>root.PDFLib,()=>root.Proj2Data);
})(typeof window!=='undefined'?window:globalThis,function(library,dataLibrary){
 'use strict';
 const DATA_KEY='TillsynoProjekteringV2',SOURCE_KEY='TillsynoProjekteringOriginalV2';
 const MAX_ORIGINAL=50*1024*1024,MAX_FILE=80*1024*1024,MAX_DATA=12*1024*1024;
 const codeRect=Object.freeze({x:30/595,y:44/842,w:155/595,h:36/842});
 const tableRect=Object.freeze({x:30/595,y:220/842,w:535/595,h:512/842});
 const natural=(a,b)=>a.localeCompare(b,'sv',{numeric:true,sensitivity:'base'});
 const clone=value=>JSON.parse(JSON.stringify(value));
 function bytes(value){
  if(value instanceof Uint8Array)return new Uint8Array(value);
  if(value instanceof ArrayBuffer)return new Uint8Array(value.slice(0));
  throw Error('Ritningsoriginalet saknas. Öppna projektet eller importera en ritning först.');
 }
 function validPDF(value,allowEmpty=false){
  const result=bytes(value);
  if(allowEmpty&&!result.length)return result;
  if(result.length>MAX_ORIGINAL)throw Error('Ritningsoriginalet får vara högst 50 MB.');
  let head='';for(const byte of result.subarray(0,1024))head+=String.fromCharCode(byte);
  if(!head.includes('%PDF-'))throw Error('Ritningsoriginalet är inte en PDF-fil.');
  return result;
 }
 function lookup(document,value){return value?document.context.lookup(value):undefined;}
 function metadata(document){
  const lib=library();
  return document.getPages().map(page=>{
   const media=page.getMediaBox(),crop=page.getCropBox();
   let x0=Math.max(media.x,crop.x),y0=Math.max(media.y,crop.y),x1=Math.min(media.x+media.width,crop.x+crop.width),y1=Math.min(media.y+media.height,crop.y+crop.height);
   if(x1<=x0||y1<=y0){x0=media.x;y0=media.y;x1=media.x+media.width;y1=media.y+media.height;}
   const rotation=((page.getRotation().angle%360)+360)%360;
   if(![0,90,180,270].includes(rotation))throw Error('Ritningssidans grundrotation måste vara 0, 90, 180 eller 270 grader.');
   // PDF.js 3.11 uses this exact scale-1 PageViewport matrix, including CropBox.
   const transform=rotation===0?[1,0,0,-1,-x0,y1]:rotation===90?[0,1,1,0,-y0,-x0]:rotation===180?[-1,0,0,1,x1,-y0]:[0,-1,-1,0,y1,x1];
   return {width:rotation%180?y1-y0:x1-x0,height:rotation%180?x1-x0:y1-y0,rotation,view:[x0,y0,x1,y1],transform};
  });
 }
 function sameGeometry(declared,actual){
  if(declared.length!==actual.length)throw Error('Ritningsoriginalets sidantal stämmer inte med projektet. Öppna den sparade projektfilen igen.');
  declared.forEach((page,index)=>{
   const real=actual[index],near=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<.015;
   if(!near(page.width,real.width)||!near(page.height,real.height)||page.rotation!==real.rotation||!page.view.every((n,i)=>near(n,real.view[i]))||!page.transform.every((n,i)=>near(n,real.transform[i])))throw Error('Ritningssidans storlek, beskärning eller rotation stämmer inte med projektet (sida '+(index+1)+'). Importera rätt ritningsoriginal.');
  });
 }
 function inverse(t){
  const [a,b,c,d,e,f]=t,det=a*d-b*c;
  if(!Number.isFinite(det)||Math.abs(det)<1e-8)throw Error('Ritningssidans koordinater kunde inte tolkas.');
  return [d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det];
 }
 function point(t,x,y){return [t[0]*x+t[2]*y+t[4],t[1]*x+t[3]*y+t[5]];}
 function compose(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
 function numericArray(document,value,count){
  const array=lookup(document,value);if(!array||typeof array.asArray!=='function')return null;
  const numbers=array.asArray().map(v=>lookup(document,v)?.asNumber?.());return numbers.length===count&&numbers.every(Number.isFinite)?numbers:null;
 }
 function rectangle(t,rect){const p=[[rect[0],rect[1]],[rect[2],rect[1]],[rect[2],rect[3]],[rect[0],rect[3]]].map(([x,y])=>point(t,x,y));return [Math.min(...p.map(a=>a[0])),Math.min(...p.map(a=>a[1])),Math.max(...p.map(a=>a[0])),Math.max(...p.map(a=>a[1]))];}
 function flattenAnnotations(document,sourcePage,page,transform,lib,pageNumber){
  const list=lookup(document,sourcePage.node.get(lib.PDFName.of('Annots')));if(!list)return;
  if(typeof list.asArray!=='function')throw Error('Markeringarna på sida '+pageNumber+' kunde inte bevaras vid PDF-export. Exportera ritningen med tillplattade markeringar från originalprogrammet först.');
  for(const reference of list.asArray()){
   const annotation=lookup(document,reference);if(!annotation?.get)throw Error('En markering på sida '+pageNumber+' kunde inte läsas.');
   const flags=lookup(document,annotation.get(lib.PDFName.of('F')))?.asNumber?.()||0;if(flags&35)continue;
   const subtype=String(lookup(document,annotation.get(lib.PDFName.of('Subtype')))||'');
   const rect=numericArray(document,annotation.get(lib.PDFName.of('Rect')),4);
   if(subtype==='/Link'){
    // URI links are non-visual; retain their hit area without copying script actions.
    const action=lookup(document,annotation.get(lib.PDFName.of('A'))),uri=action?.get&&String(lookup(document,action.get(lib.PDFName.of('S'))))==='/URI'?lookup(document,action.get(lib.PDFName.of('URI'))):null;
    if(rect&&uri&&typeof uri.decodeText==='function')page.node.addAnnot(document.context.register(document.context.obj({Type:'Annot',Subtype:'Link',Rect:rectangle(transform,rect),Border:[0,0,0],A:{S:'URI',URI:lib.PDFHexString.fromText(uri.decodeText())}})));
    continue;
   }
   const fail=()=>{throw Error('En synlig '+(subtype.slice(1)||'PDF')+'-markering på sida '+pageNumber+' saknar ett utseende som kan bevaras vid export. Exportera ritningen med tillplattade markeringar från originalprogrammet först. Originalfilen ändras inte.');};
   if(!rect||rect[2]<=rect[0]||rect[3]<=rect[1]||(flags&16))fail();
   const ap=lookup(document,annotation.get(lib.PDFName.of('AP')));let appearance=ap?.get?lookup(document,ap.get(lib.PDFName.of('N'))):null;
   if(appearance?.get&&typeof appearance.getContents!=='function'){
    const state=lookup(document,annotation.get(lib.PDFName.of('AS'))),entries=typeof appearance.entries==='function'?appearance.entries():[];
    const chosen=state?appearance.get(state):entries.length===1?entries[0][1]:null;appearance=lookup(document,chosen);
   }
   if(!appearance?.dict||typeof appearance.getContents!=='function')fail();
   const box=numericArray(document,appearance.dict.get(lib.PDFName.of('BBox')),4),matrix=numericArray(document,appearance.dict.get(lib.PDFName.of('Matrix')),6)||[1,0,0,1,0,0];if(!box)fail();
   const bounds=rectangle(matrix,box),w=bounds[2]-bounds[0],h=bounds[3]-bounds[1];if(w<=0||h<=0)fail();
   const sx=(rect[2]-rect[0])/w,sy=(rect[3]-rect[1])/h,placement=[sx,0,0,sy,rect[0]-bounds[0]*sx,rect[1]-bounds[1]*sy],total=compose(transform,placement),ref=document.context.register(appearance),key=page.node.newXObject('OriginalAnnotation',ref);
   page.pushOperators(lib.pushGraphicsState(),lib.concatTransformationMatrix(...total));
   const alpha=lookup(document,annotation.get(lib.PDFName.of('CA')))?.asNumber?.();if(Number.isFinite(alpha)&&alpha>=0&&alpha<1){const gs=page.node.newExtGState('AnnotationOpacity',document.context.register(document.context.obj({Type:'ExtGState',ca:alpha,CA:alpha})));page.pushOperators(lib.setGraphicsState(gs));}
   page.pushOperators(lib.drawObject(key),lib.popGraphicsState());
  }
 }
 async function copyDrawing(document,source,state,lib){
  const copied=await document.copyPages(source,source.getPageIndices()),exportPages=[];
  for(let index=0;index<copied.length;index++){
   const input=copied[index],geometry=state.drawing.pages[index];
   if(geometry.rotation===0){document.addPage(input);exportPages.push(geometry);continue;}
   // Native PDF text on rotated source pages exposes incorrect glyph boxes to
   // older readers. Normalize only the visible output; its clean original is
   // still embedded unchanged and used for every later editing/export cycle.
   const page=document.addPage([geometry.width,geometry.height]),t=geometry.transform,transform=[t[0],-t[1],t[2],-t[3],t[4],geometry.height-t[5]],v=geometry.view;
   const contents=lookup(document,input.node.get(lib.PDFName.of('Contents'))),hasContents=contents&&(typeof contents.asArray!=='function'||contents.asArray().length>0);
   if(hasContents){const embedded=await document.embedPage(input,{left:v[0],bottom:v[1],right:v[2],top:v[3]},transform);await embedded.embed();const name=page.node.newXObject('OriginalDrawing',embedded.ref);page.pushOperators(lib.pushGraphicsState(),lib.drawObject(name),lib.popGraphicsState());}
   flattenAnnotations(document,input,page,transform,lib,index+1);
   exportPages.push({width:geometry.width,height:geometry.height,rotation:0,view:[0,0,geometry.width,geometry.height],transform:[1,0,0,-1,0,geometry.height]});
  }
  return exportPages;
 }
 function stampMatrix(page,placement){
  const t=inverse(page.transform),a=(placement.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=placement.x*page.width,cy=placement.y*page.height;
  // Local coordinates are PDF-style (x right, y up); user rotation is clockwise in the viewport.
  return [t[0]*c+t[2]*s,t[1]*c+t[3]*s,t[0]*s-t[2]*c,t[1]*s-t[3]*c,t[0]*cx+t[2]*cy+t[4],t[1]*cx+t[3]*cy+t[5]];
 }
 function hex(lib,value){return lib.rgb(parseInt(value.slice(1,3),16)/255,parseInt(value.slice(3,5),16)/255,parseInt(value.slice(5,7),16)/255);}
 function assertText(font,text){
  const value=String(text??'').replace(/[\r\n\t]/g,' ');
  try{font.encodeText(value);}catch(_){throw Error('PDF-exporten kan inte återge ett tecken i ”'+value.slice(0,50)+'”. Använd svenska eller latinska bokstäver i PDF-underlaget.');}
  return value;
 }
 function text(page,font,value,x,y,size=9,color){page.drawText(assertText(font,value),{x,y,size,font,...(color?{color}:{})});}
 function fitted(page,font,value,x,y,size,width,color){
  const clean=assertText(font,value),measured=font.widthOfTextAtSize(clean,size);
  if(measured>width)size*=width/measured;
  if(size<5.2)throw Error('Texten ”'+clean.slice(0,45)+'” är för lång för en läsbar dörrkortscell. Förkorta texten före PDF-export.');
  text(page,font,clean,x,y,size,color);
 }
 function wrapped(page,font,value,x,y,width,size,lineHeight,maxLines=3){
  const words=assertText(font,value).split(/\s+/),lines=[];let line='';
  if(words.some(word=>font.widthOfTextAtSize(word,size)>width))throw Error('Anteckningen innehåller ett ord som är för långt för PDF-sidan. Dela upp eller förkorta ordet före export.');
  for(const word of words){const candidate=line?line+' '+word:word;if(font.widthOfTextAtSize(candidate,size)>width&&line){lines.push(line);line=word;}else line=candidate;}
  if(line)lines.push(line);if(lines.length>maxLines)throw Error('Anteckningen är för lång för PDF-sidan. Förkorta den före export.');
  lines.forEach((value,index)=>text(page,font,value,x,y-index*lineHeight,size));
 }
 function checkPlacements(state){
  const rect=placement=>{
   const page=state.drawing.pages[placement.page-1],a=(placement.rotation||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),w=c*placement.width+s*placement.height,h=s*placement.width+c*placement.height;
   return {x:placement.x*page.width-w/2,y:placement.y*page.height-h/2,w,h};
  };
  for(const item of state.placements){const r=rect(item),page=state.drawing.pages[item.page-1];if(r.x<-.01||r.y<-.01||r.x+r.w>page.width+.01||r.y+r.h>page.height+.01)throw Error('Stämpeln '+item.code+' ligger delvis utanför sida '+item.page+'. Flytta in den före PDF-export.');}
  const byPage=new Map();for(const item of state.placements){if(!byPage.has(item.page))byPage.set(item.page,[]);byPage.get(item.page).push(item);}
  for(const items of byPage.values())for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
   const a=rect(items[i]),b=rect(items[j]),w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
   if(w>1&&h>1)throw Error('Stämplarna '+items[i].code+' och '+items[j].code+' överlappar på sida '+items[i].page+'. Flytta isär dem före PDF-export.');
  }
 }
 function drawTextAnnotations(document,state,fonts,lib){
  const A=dataLibrary().Annotations;
  for(const item of state.annotations){
   const meta=state.drawing.pages[item.page-1],page=document.getPage(item.page-1),b=A.box(item,meta),font=item.bold?fonts.bold:fonts.regular;
   for(const target of item.arrows){
    const g=A.arrow(item,target,meta);if(!g)continue;
    page.drawLine({start:{x:g.start.x,y:meta.height-g.start.y},end:{x:g.end.x,y:meta.height-g.end.y},thickness:item.arrowWidth,color:hex(lib,item.arrowColor)});
    const path='M '+g.head.map(p=>p.x+' '+p.y).join(' L ')+' Z';
    page.drawSvgPath(path,{x:0,y:meta.height,color:hex(lib,item.arrowColor)});
   }
   if(item.fill!==null||item.borderWidth>0)page.drawSvgPath(A.roundedPath(item.width,item.height,item.radius),{x:b.x,y:meta.height-b.y,...(item.fill===null?{}:{color:hex(lib,item.fill)}),...(item.borderWidth>0?{borderColor:hex(lib,item.borderColor),borderWidth:item.borderWidth}:{borderWidth:0})});
   A.lines(item).forEach((line,index)=>text(page,font,line,b.x+8,meta.height-(b.y+8+item.fontSize+index*item.fontSize*1.3),item.fontSize,hex(lib,item.textColor)));
  }
 }
 function drawPlacements(document,state,font,lib){
  for(const item of state.placements){
   const page=document.getPage(item.page-1),definition=state.stencils[item.stencilId],matrix=stampMatrix(state.drawing.pages[item.page-1],item),label=assertText(font,item.code);
   let fontSize=Math.min(definition.fontSize,item.height*.5),labelWidth=font.widthOfTextAtSize(label,fontSize);
   if(labelWidth>item.width-8)fontSize*=Math.max(.05,(item.width-8)/labelWidth);
   if(definition.kind==='card'&&fontSize<5.2)throw Error('Stämpeln '+item.code+' är för liten för sin beteckning. Öka bredden eller textstorleken före PDF-export.');
   page.pushOperators(lib.pushGraphicsState(),lib.concatTransformationMatrix(...matrix));
   const style={color:hex(lib,definition.fill),borderColor:hex(lib,definition.stroke),borderWidth:Math.max(.45,Math.min(1.1,item.height*.035))};
   if(definition.shape==='oval')page.drawEllipse({x:0,y:0,xScale:item.width/2,yScale:item.height/2,...style});
   else page.drawRectangle({x:-item.width/2,y:-item.height/2,width:item.width,height:item.height,...style});
   // Keep the complete code readable when the whole stamp is rotated.
   const readableFlip=item.rotation>90&&item.rotation<=270;
   if(readableFlip)page.pushOperators(lib.pushGraphicsState(),lib.concatTransformationMatrix(-1,0,0,-1,0,0));
   {const width=font.widthOfTextAtSize(label,fontSize);text(page,font,label,-width/2,-fontSize*.34,fontSize,hex(lib,definition.textColor));}
   if(readableFlip)page.pushOperators(lib.popGraphicsState());
   page.pushOperators(lib.popGraphicsState());
   const corners=[[-item.width/2,-item.height/2],[item.width/2,-item.height/2],[item.width/2,item.height/2],[-item.width/2,item.height/2]].map(([x,y])=>point(matrix,x,y)),xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
   const rect=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],w=rect[2]-rect[0],h=rect[3]-rect[1];
   // Clean native page text is authoritative. Metadata adds identity, never a second visible glyph.
   const appearance=document.context.register(document.context.flateStream('',{Type:'XObject',Subtype:'Form',BBox:[0,0,w,h],Resources:{}}));
   page.node.addAnnot(document.context.register(document.context.obj({Type:'Annot',Subtype:'Stamp',Rect:rect,Subj:lib.PDFHexString.fromText(item.code),Contents:lib.PDFHexString.fromText(item.code),NM:lib.PDFHexString.fromText('projection-v2-'+item.id),F:4,AP:{N:appearance}})));
  }
 }
 function drawCard(document,state,code,fonts,lib,index,total){
  const card=state.cards[code],page=document.addPage([595,842]),{regular,bold}=fonts,border=lib.rgb(.36,.42,.45),slate=lib.rgb(.13,.23,.25),pale=lib.rgb(.94,.96,.95),left=30;
  const line=(x1,y1,x2,y2,width=.65)=>page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:width,color:border});
  const cell=(x,y,w,h,fill)=>page.drawRectangle({x,y,width:w,height:h,borderColor:border,borderWidth:.65,...(fill?{color:fill}:{})});
  fitted(page,regular,state.project.name,30,819,9,420,slate);text(page,regular,'Dörrkort · '+index+'/'+total,466,819,8,slate);
  cell(left,762,155,36,pale);cell(185,762,380,36,pale);fitted(page,bold,code,38,772,18,139,slate);text(page,bold,'BESLAGSKORT',196,779,10,slate);text(page,regular,'Gemensamt dörrkort för samma beteckning',196,766,8,slate);
  const count=state.placements.filter(item=>item.code===code&&state.stencils[item.stencilId].kind==='card').length,m=card.meta;
  const metadataRows=[['Littera',m.littera||code],['Antal',String(count)],['Hängning',m.hanging||'-'],['Dörrtyp',m.doorType||'-'],['Brandkrav',m.fire||'-'],['Skyddsklass',m.security||'-'],['Utrymningskrav',m.escape||'-'],['Återinrymning',m.reentry||'-']];
  let top=762;for(const [label,value]of metadataRows){cell(left,top-17,155,17);cell(185,top-17,380,17);text(page,bold,label,38,top-12,8);fitted(page,regular,value,196,top-12,8,358);top-=17;}
  const cols=[30,185,402,441,503,565],headY=600;cell(left,headY,535,22,pale);for(const x of cols.slice(1,-1))line(x,headY,x,headY+22);
  for(const [label,x]of [['Komponent',38],['Produkt',196],['Antal',409],['Lev av',448],['Mont av',510]])text(page,bold,label,x,608,8);
  const groups=[];for(const row of card.rows){let group=groups.find(g=>g.title===row.section);if(!group){group={title:row.section,rows:[]};groups.push(group);}group.rows.push(row);}
  let y=headY;for(const group of groups){y-=18;cell(left,y,535,18,pale);text(page,bold,group.title.toLocaleUpperCase('sv'),38,y+5.5,9);for(const row of group.rows){y-=16;cell(left,y,535,16);for(const x of cols.slice(1,-1))line(x,y,x,y+16);fitted(page,regular,row.label,38,y+5,8,139);fitted(page,regular,row.product||'-',196,y+5,8,196);if(row.product){text(page,regular,String(row.quantity),409,y+5,8);fitted(page,regular,row.delivery||'-',448,y+5,8,47);fitted(page,regular,row.installer||'-',510,y+5,8,47);}}}
  if(y<100)throw Error('Dörrkortet '+code+' har för många utrustningsrader för en PDF-sida.');
  if(card.note){text(page,bold,'Anteckning',30,91,8);wrapped(page,regular,card.note,30,78,535,8,10,3);}
  text(page,regular,'Tillsyno · Projektering · Kontrollera produktval och projekteringskrav före utförande.',30,27,7,lib.rgb(.40,.46,.47));fitted(page,regular,'Revision '+state.project.revision,465,27,7,100);
 }
 async function buildCardPreview(input,value,cardDraft){
  const lib=library(),data=dataLibrary();if(!lib||!data)throw Error('PDF-verktyget kunde inte laddas. Öppna sidan igen med internet.');
  const code=data.normalizeCode(value),snapshot=data.validate(input);
  // Validate the draft inside a detached project. A preview must neither save
  // the draft nor increment the editable project's revision or alter its source.
  if(cardDraft!==undefined)snapshot.cards[code]=clone(cardDraft);
  const state=data.validate(snapshot);if(!Object.hasOwn(state.cards,code))throw Error('Välj ett dörrkort att förhandsvisa.');
  const document=await lib.PDFDocument.create(),regular=await document.embedFont(lib.StandardFonts.Helvetica),bold=await document.embedFont(lib.StandardFonts.HelveticaBold);
  drawCard(document,state,code,{regular,bold},lib,1,1);
  document.setTitle('Dörrkort '+code+' · '+state.project.name);document.setAuthor('Tillsyno');document.setCreator('Tillsyno Projektering 2.18');document.setSubject('Förhandsvisning av dörrkort');
  // This disposable one-card PDF deliberately has no editable project/source
  // payload. Opening it must not replace the project the user is editing.
  return new Uint8Array(await document.save());
 }
 async function sourceDocument(state,original){
  const lib=library(),buffer=validPDF(original,!state.drawing.pages.length);
  if(!state.drawing.pages.length){if(buffer.length)throw Error('Projektet saknar siduppgifter för ritningsoriginalet.');return {document:null,original:buffer};}
  const document=await lib.PDFDocument.load(buffer);
  if(document.catalog.get(lib.PDFName.of(DATA_KEY)))throw Error('Ritningsoriginalet är redan en exporterad projekteringsfil. Öppna den som projekt för att undvika dubbla stämplar.');
  sameGeometry(state.drawing.pages,metadata(document));return {document,original:buffer};
 }
 async function build(input,originalBytes,options={}){
  const lib=library(),data=dataLibrary();if(!lib||!data)throw Error('PDF-verktyget kunde inte laddas. Öppna sidan igen med internet.');
  const state=data.validate(input),mode=options.mode||'combined';if(!['combined','drawing','cards'].includes(mode))throw Error('Välj ritning, dörrkort eller komplett PDF.');
  const source=await sourceDocument(state,originalBytes),document=await lib.PDFDocument.create(),regular=await document.embedFont(lib.StandardFonts.Helvetica),bold=await document.embedFont(lib.StandardFonts.HelveticaBold),codes=Object.keys(state.cards).sort(natural);
  if(mode==='drawing'||mode==='combined'){
   if(!source.document&&mode==='drawing')throw Error('Importera en ritning innan du exporterar en ritnings-PDF.');
   if(source.document){const exportPages=await copyDrawing(document,source.document,state,lib);checkPlacements(state);drawPlacements(document,{...state,drawing:{...state.drawing,pages:exportPages}},bold,lib);drawTextAnnotations(document,{...state,drawing:{...state.drawing,pages:exportPages}},{regular,bold},lib);}
  }
  if(mode==='cards'||mode==='combined')codes.forEach((code,index)=>drawCard(document,state,code,{regular,bold},lib,index+1,codes.length));
  // Standalone symbols stay visible on the drawing and in the embedded project;
  // only actual door cards append printable pages.
  if(!document.getPageCount())throw Error('Lägg till en ritning eller ett dörrkort före PDF-export.');
  const payload=JSON.stringify({format:'TillsynoProjekteringV2',state,originalLength:source.original.length});if(payload.length>MAX_DATA)throw Error('Projektuppgifterna är för stora för PDF-export.');
  document.catalog.set(lib.PDFName.of(DATA_KEY),lib.PDFHexString.fromText(payload));
  document.catalog.set(lib.PDFName.of(SOURCE_KEY),document.context.register(document.context.flateStream(source.original,{Type:'EmbeddedFile',Subtype:'application/pdf'})));
  document.setTitle(state.project.name+' · Projektering');document.setAuthor('Tillsyno');document.setCreator('Tillsyno Projektering 2.18');document.setSubject('Ritning med stämplar och dörrkort');
  const result=await document.save();if(result.length>MAX_FILE)throw Error('Projekt-PDF:en är större än 80 MB.');return result;
 }
 async function inspect(input){
  const lib=library(),data=dataLibrary();if(!lib||!data)throw Error('PDF-verktyget kunde inte laddas.');const buffer=bytes(input);if(buffer.length>MAX_FILE)throw Error('Projektfilen får vara högst 80 MB.');
  const document=await lib.PDFDocument.load(buffer),saved=lookup(document,document.catalog.get(lib.PDFName.of(DATA_KEY)));
  if(!saved)return null;if(typeof saved.decodeText!=='function')throw Error('Projektuppgifterna i PDF:en kunde inte läsas.');
  const json=saved.decodeText();if(json.length>MAX_DATA)throw Error('Projektuppgifterna i PDF:en är för stora.');let payload;try{payload=JSON.parse(json);}catch(_){throw Error('Projektuppgifterna i PDF:en kunde inte läsas.');}
  if(payload?.format!=='TillsynoProjekteringV2'||!Number.isInteger(payload.originalLength)||payload.originalLength<0||payload.originalLength>MAX_ORIGINAL)throw Error('PDF:en innehåller ett ogiltigt projekteringsprojekt.');
  const state=data.validate(payload.state),stream=lookup(document,document.catalog.get(lib.PDFName.of(SOURCE_KEY)));if(!(stream instanceof lib.PDFRawStream))throw Error('Ritningsoriginalet saknas i projekt-PDF:en. Öppna en komplett sparad projektfil.');
  let original;try{original=new Uint8Array(lib.decodePDFRawStream(stream).decode());}catch(_){throw Error('Ritningsoriginalet i projekt-PDF:en kunde inte läsas.');}
  if(original.length!==payload.originalLength||original.length>MAX_ORIGINAL)throw Error('Ritningsoriginalets storlek stämmer inte med projekt-PDF:en.');
  await sourceDocument(state,original);return {state,original};
 }
 async function blank(name='Nya dörrkort'){
  const lib=library(),data=dataLibrary();if(!lib||!data)throw Error('PDF-verktyget kunde inte laddas.');
  const document=await lib.PDFDocument.create(),state=data.createEmpty(name);
  document.addPage([1190.55,841.89]); // A3 landscape, a clean white page.
  state.drawing={name:'Tom sida.pdf',pages:metadata(document)};
  document.setTitle(state.project.name);document.setCreator('Tillsyno Projektering 2.18');
  return {state:data.validate(state),original:new Uint8Array(await document.save())};
 }
 async function example(){
  const lib=library(),data=dataLibrary();if(!lib||!data)throw Error('Exempelverktyget kunde inte laddas.');
  const document=await lib.PDFDocument.create(),font=await document.embedFont(lib.StandardFonts.Helvetica),bold=await document.embedFont(lib.StandardFonts.HelveticaBold),state=data.createEmpty('Exempelhuset · Projektering');
  for(let p=0;p<2;p++){
   const page=document.addPage([1200,800]);text(page,bold,'EXEMPELHUS · PLAN '+(p+1),40,755,20,lib.rgb(.15,.28,.30));text(page,font,'Principritning för att prova projektering. Inte en bygghandling.',40,733,10,lib.rgb(.45,.50,.52));
   for(let i=0;i<25;i++){const col=i%5,row=Math.floor(i/5),x=70+col*225,y=650-row*125;page.drawRectangle({x,y:y-75,width:170,height:75,borderColor:lib.rgb(.42,.48,.50),borderWidth:1.4});page.drawRectangle({x:x+64,y:y-76,width:32,height:3,color:lib.rgb(1,1,1)});page.drawLine({start:{x:x+64,y:y-75},end:{x:x+64,y:y-45},thickness:1,color:lib.rgb(.6,.65,.67)});text(page,font,'Rum '+(101+p*25+i),x+55,y-25,11);text(page,font,'D'+String(p*25+i+1).padStart(3,'0'),x+67,y-43,8);}
  }
  state.drawing={name:'Exempelritning.pdf',pages:metadata(document)};
  for(let i=0;i<50;i++){
   const p=Math.floor(i/25),n=i%25,col=n%5,row=Math.floor(n/5),code=data.initialCardCode(i===49?'DGS100':'GS'+(i%10+1)),stencilId=code;
   data.addPlacement(state,{page:p+1,stencilId,x:(155+col*225)/1200,y:(230+row*125)/800});
  }
  for(const card of Object.values(state.cards)){
   const set=(id,product,delivery='GS',installer='GS')=>{const row=card.rows.find(r=>r.id===id);if(row)Object.assign(row,{product,delivery,installer});};
   set('day-lock','ST140-50');set('day-cylinder-fittings','256');set('day-cylinder-hinge','8882');set('day-handle','6696','DT','DT');card.meta.doorType='Exempeldörr';card.meta.hanging='Enligt ritning';
  }
  state.cards[data.initialCardCode('GS1')].note='Samma sparade GS1:1-kort används vid flera dörrar.';
  return {state:data.validate(state),original:await document.save()};
 }
 return Object.freeze({build,buildCardPreview,inspect,blank,example,metadata,stampMatrix,codeRect,tableRect,DATA_KEY,SOURCE_KEY});
});

