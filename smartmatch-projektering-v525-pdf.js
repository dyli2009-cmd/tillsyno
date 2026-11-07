/* Projektering 2.19: catalogue-backed products with editable project PDFs. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(()=>require('./vendor/pdf-lib.min.js'),()=>require('./smartmatch-projektering-v519-data.js'),()=>require('./tillsyno-project-info-v513.js'));
 else root.Proj2PDF=factory(()=>root.PDFLib,()=>root.Proj2Data,()=>root.TillsynoProjectInfo);
})(typeof window!=='undefined'?window:globalThis,function(library,dataLibrary,projectInfoLibrary){
 'use strict';
 const DATA_KEY='TillsynoProjekteringV2',SOURCE_KEY='TillsynoProjekteringOriginalV2';
 const MAX_ORIGINAL=50*1024*1024,MAX_FILE=80*1024*1024,MAX_DATA=12*1024*1024;
 const codeRect=Object.freeze({x:30/595,y:44/842,w:155/595,h:36/842});
 const tableRect=Object.freeze({x:30/595,y:152/842,w:535/595,h:642/842});
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
 function decodedText(value){
  // pdf-lib's decodeText uses a spread for UTF-16 and overflows on large projects.
  const data=value?.asBytes?.();if(data?.[0]===254&&data?.[1]===255)return new TextDecoder('utf-16be',{fatal:true}).decode(data.subarray(2));
  return value?.decodeText?.();
 }
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
  if(state.conversion)return; // Existing projected symbols may legitimately overlap.
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
 function drawPlacements(document,state,font,lib,editableText=false){
  if(state.schema>=5||editableText)return drawEditablePlacements(document,state,font,lib,editableText);
  for(const item of state.placements){
   const page=document.getPage(item.page-1),definition=state.stencils[item.stencilId],matrix=stampMatrix(state.drawing.pages[item.page-1],item),label=assertText(font,item.code);
   let fontSize=Math.min(definition.fontSize,item.height*.5),labelWidth=font.widthOfTextAtSize(label,fontSize);
   if(labelWidth>item.width-8)fontSize*=Math.max(.05,(item.width-8)/labelWidth);
   if(definition.kind==='card'&&fontSize<5.2)throw Error('Stämpeln '+item.code+' är för liten för sin beteckning. Öka bredden eller textstorleken före PDF-export.');
   page.pushOperators(lib.pushGraphicsState(),lib.concatTransformationMatrix(...matrix));
   const style={color:hex(lib,definition.fill),borderColor:hex(lib,definition.stroke),borderWidth:Math.max(.45,Math.min(1.1,item.height*.035))};
   if(definition.shape==='oval')page.drawEllipse({x:0,y:0,xScale:item.width/2,yScale:item.height/2,...style});
   else if(definition.shape==='rectangle')page.drawSvgPath(dataLibrary().Annotations.roundedPath(item.width,item.height,3),{x:-item.width/2,y:item.height/2,...style});
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
 function drawEditablePlacements(document,state,font,lib,editableText=false){
  for(const item of state.placements){
   if(editableText&&item.rotation%90!==0)throw Error('Redigerbar PDF-text kräver 0, 90, 180 eller 270 graders rotation. Ändra rotationen för '+item.code+' i Tillsyno eller avmarkera Redigerbar text i Bluebeam.');
   const output=document.getPage(item.page-1),definition=state.stencils[item.stencilId],m=stampMatrix(state.drawing.pages[item.page-1],item);
   const corners=[[-item.width/2,-item.height/2],[item.width/2,-item.height/2],[item.width/2,item.height/2],[-item.width/2,item.height/2]].map(([x,y])=>point(m,x,y));
   const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),rect=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],w=rect[2]-rect[0],h=rect[3]-rect[1];
   let page=lib.PDFPage.create(document);const matrix=[...m.slice(0,4),m[4]-rect[0],m[5]-rect[1]],label=assertText(font,item.code);
   let fontSize=Math.min(definition.fontSize,item.height*.5);const labelWidth=font.widthOfTextAtSize(label,fontSize);if(labelWidth>item.width-4)fontSize*=Math.max(.05,(item.width-4)/labelWidth);
   page.pushOperators(lib.pushGraphicsState(),lib.concatTransformationMatrix(...matrix));
   const style={color:hex(lib,definition.fill),borderColor:hex(lib,definition.stroke),borderWidth:Math.max(.45,Math.min(1.1,item.height*.035))};
   // The annotation clips its appearance to Rect/BBox. Keep the entire stroke
   // inside that box, including at the four tips of an oval.
   const inset=style.borderWidth/2;
   if(definition.shape==='oval')page.drawEllipse({x:0,y:0,xScale:item.width/2-inset,yScale:item.height/2-inset,...style});else if(definition.shape==='rectangle')page.drawSvgPath(dataLibrary().Annotations.roundedPath(item.width-2*inset,item.height-2*inset,3),{x:-item.width/2+inset,y:item.height/2-inset,...style});else page.drawRectangle({x:-item.width/2+inset,y:-item.height/2+inset,width:item.width-2*inset,height:item.height-2*inset,...style});
   let frameAppearance;
   if(editableText){
    page.pushOperators(lib.popGraphicsState());
    frameAppearance=document.context.register(document.context.flateStream(page.getContentStream().getUnencodedContents(),{Type:'XObject',Subtype:'Form',BBox:[0,0,w,h],Resources:page.node.Resources()}));
    // The visible text must be its own FreeText annotation. Changing /Subj on
    // a Stamp can never change text baked into its appearance stream.
    page=lib.PDFPage.create(document);
    page.pushOperators(lib.pushGraphicsState(),lib.concatTransformationMatrix(...matrix));
   }
   const flip=item.rotation>90&&item.rotation<=270;if(flip)page.pushOperators(lib.pushGraphicsState(),lib.concatTransformationMatrix(-1,0,0,-1,0,0));
   text(page,font,label,-font.widthOfTextAtSize(label,fontSize)/2,-fontSize*.34,fontSize,hex(lib,definition.textColor));
   if(flip)page.pushOperators(lib.popGraphicsState());page.pushOperators(lib.popGraphicsState());
   const appearance=document.context.register(document.context.flateStream(page.getContentStream().getUnencodedContents(),{Type:'XObject',Subtype:'Form',BBox:[0,0,w,h],Resources:page.node.Resources()}));
   const common={Type:'Annot',Rect:rect,Contents:lib.PDFHexString.fromText(item.code),NM:lib.PDFHexString.fromText('projection-v2-'+item.id),F:4,AP:{N:appearance},TillsynoRect:rect,TillsynoCode:lib.PDFHexString.fromText(item.code)};
   if(!editableText){output.node.addAnnot(document.context.register(document.context.obj({...common,Subtype:'Stamp',Subj:lib.PDFHexString.fromText(item.code)})));continue;}
   const rgb=value=>[1,3,5].map(n=>parseInt(value.slice(n,n+2),16)/255),color=rgb(definition.textColor),rotation=((Math.round(Math.atan2(m[1],m[0])*180/Math.PI)+(flip?180:0))%360+360)%360;
   const verticalInset=Math.max(0,(item.height-fontSize)/2),padding=rotation%180?[verticalInset,2,verticalInset,2]:[2,verticalInset,2,verticalInset];
   const labelRef=document.context.register(document.context.obj({...common,Subtype:'FreeText',Subj:lib.PDFHexString.fromText('Beteckning'),DA:lib.PDFString.of('/Helvetica-Bold '+fontSize+' Tf '+color.join(' ')+' rg'),DS:lib.PDFString.of('font: bold '+fontSize+'pt Helvetica; text-align:center; color:'+definition.textColor),DR:{Font:{'Helvetica-Bold':font.ref}},Q:1,Rotate:rotation,RD:padding,BS:{W:0},Border:[0,0,0],C:[],IT:'FreeText',TillsynoTextRotation:rotation}));
   // Standard PDF annotation grouping; the text is primary and the frame is
   // subordinate. Editors can edit the text without rebuilding the frame.
   const frameRef=document.context.register(document.context.obj({Type:'Annot',Subtype:definition.shape==='oval'?'Circle':'Square',Rect:rect,NM:lib.PDFHexString.fromText('projection-v2-frame-'+item.id),Subj:lib.PDFHexString.fromText('Ram'),F:4,AP:{N:frameAppearance},C:rgb(definition.stroke),IC:rgb(definition.fill),BS:{W:style.borderWidth,S:'S'},Border:[0,0,style.borderWidth],IRT:labelRef,RT:'Group'}));
   output.node.addAnnot(frameRef);output.node.addAnnot(labelRef);
  }
 }
 function cardLines(font,value,width,size){
  const result=[];
  for(const paragraph of String(value||'').split('\n')){
   let line='';for(const word of assertText(font,paragraph).split(/\s+/).filter(Boolean)){
    const candidate=line?line+' '+word:word;
    if(font.widthOfTextAtSize(candidate,size)<=width){line=candidate;continue;}
    if(line){result.push(line);line='';}
    for(const character of word){if(line&&font.widthOfTextAtSize(line+character,size)>width){result.push(line);line='';}line+=character;}
   }result.push(line);
  }
  return result.length?result:[''];
 }
 function cardPageLayout(card,fonts){
  const cols=[30,155,268,294,331,368,405,447,565],functions=dataLibrary().cardFunctions(card);
  // Filter the printed view only. The editable card keeps every choice and
  // all saved data, regardless of installer or delivery responsibility.
  const rows=card.rows.filter(row=>row.product.trim()&&!/^(?:[-–—]\s*)+$/.test(row.product.trim()));
  for(const size of [7.8,7.4,7]){
   const lineHeight=size*1.18,groupHeight=size+5,groups=[];
   for(const row of rows){
    let group=groups.find(g=>g.title===row.section);if(!group){group={title:row.section,rows:[]};groups.push(group);}
    const values=[row.label,row.product,String(row.quantity),row.delivery||'-',row.installer||'-',row.connection||'',row.functionOwner||'',row.note||''];
    const lines=values.map((value,i)=>cardLines(fonts.regular,value,cols[i+1]-cols[i]-8,size));
    group.rows.push({lines,height:Math.max(...lines.map(lines=>lines.length))*lineHeight+2});
   }
   const notes=[['Dörrfunktion',functions.door||'-'],['Larmfunktion',functions.alarm||'-'],['Brandfunktion',functions.fire||'-'],...(card.note?[['Anteckning',card.note]]:[])].map(([label,value])=>({label,lines:cardLines(fonts.regular,value,519,size)}));
   const tableHeight=groups.reduce((sum,g)=>sum+groupHeight+g.rows.reduce((n,row)=>n+row.height,0),0),notesHeight=notes.reduce((sum,n)=>sum+groupHeight+n.lines.length*lineHeight+6,0);
   if(tableHeight+notesHeight+8<=620)return {cols,groups,notes,size,lineHeight,groupHeight,tableHeight};
  }
  throw Error('Dörrkortet '+card.code+' innehåller för mycket text för en läsbar A4-sida. Korta anmärkningarna eller dela upp dörrtypen innan du sparar. Ingen text har utelämnats.');
 }
 async function projectLogo(document,state){
  const logo=state.project.details?.logo;
  if(!logo)return null;
  try{return await document.embedPng(logo.dataUrl);}
  catch(_){throw Error('Projektets logga kunde inte läsas. Välj loggan igen under Projektuppgifter.');}
 }
 function projectHeading(page,fonts,state,color){
  const details=state.project.details||{};
  const heading=(value,y,font)=>{
   for(const size of [8.5,8,7.5,7]){
    let lines=cardLines(font,value,435,size);
    if(lines.length>2&&size===7){lines=[''];for(const character of assertText(font,value).replace(/\s+/g,' ').trim()){if(font.widthOfTextAtSize(lines[lines.length-1]+character,size)>435)lines.push('');lines[lines.length-1]+=character;}}
    if(lines.length<=2){lines.forEach((line,index)=>text(page,font,line,30,y-index*8,size,color));return;}
   }
   throw Error('Projektuppgifterna är för långa för dörrkortets sidhuvud. Korta projektnamn eller projektörens namn.');
  };
  heading(state.project.name,826,fonts.bold);
  heading('Projekterat av: '+(details.designer||'-'),810,fonts.regular);
  if(fonts.logo){const scale=Math.min(90/fonts.logo.width,22/fonts.logo.height),width=fonts.logo.width*scale,height=fonts.logo.height*scale;page.drawImage(fonts.logo,{x:475+(90-width)/2,y:812+(22-height)/2,width,height});}
  fitted(page,fonts.regular,'Datum: '+(details.date||'-'),475,803,7.5,90,color);
 }
 function drawCard(document,state,code,fonts,lib,index,total){
  const card=state.cards[code],layout=cardPageLayout(card,fonts),page=document.addPage([595,842]),{regular,bold}=fonts,border=lib.rgb(.36,.42,.45),slate=lib.rgb(.13,.23,.25),pale=lib.rgb(.94,.96,.95),left=30;
  const line=(x1,y1,x2,y2,width=.55)=>page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:width,color:border});
  const cell=(x,y,w,h,fill)=>page.drawRectangle({x,y,width:w,height:h,borderColor:border,borderWidth:.55,...(fill?{color:fill}:{})});
  projectHeading(page,fonts,state,slate);
  cell(left,762,155,36,pale);cell(185,762,380,36,pale);fitted(page,bold,code,38,772,18,139,slate);text(page,bold,'BESLAGSKORT',196,779,10,slate);text(page,regular,'Gemensamt dörrkort för samma beteckning',196,766,8,slate);
  const count=state.placements.filter(item=>item.code===code&&state.stencils[item.stencilId].kind==='card').length,m=card.meta;
  const metadataRows=[['Littera',m.littera||code],['Antal',String(count)],['Hängning',m.hanging||'-'],['Dörrtyp',m.doorType||'-'],['Brandkrav',m.fire||'-'],['Skyddsklass',m.security||'-'],['Utrymningskrav',m.escape||'-'],['Återinrymning',m.reentry||'-']];
  metadataRows.forEach(([label,value],i)=>{const x=left+(i%2)*267.5,top=762-Math.floor(i/2)*17;cell(x,top-17,110,17);cell(x+110,top-17,157.5,17);text(page,bold,label,x+8,top-12,8);fitted(page,regular,value,x+118,top-12,8,141.5);});
  const {cols,size,lineHeight,groupHeight}=layout,headY=668;cell(left,headY,535,22,pale);for(const x of cols.slice(1,-1))line(x,headY,x,headY+22);
  ['Komponent','Produkt','Antal','Lev av','Mont av','Ansl av','Funk ansv','Anmärkning'].forEach((label,i)=>text(page,bold,label,cols[i]+4,headY+8,6.8,slate));
  let y=headY;
  for(const group of layout.groups){
   y-=groupHeight;cell(left,y,535,groupHeight,pale);text(page,bold,group.title,38,y+5,size);
   for(const row of group.rows){const top=y;y-=row.height;cell(left,y,535,row.height);for(const x of cols.slice(1,-1))line(x,y,x,top);row.lines.forEach((lines,i)=>lines.forEach((value,n)=>text(page,regular,value,cols[i]+4,top-1-size-n*lineHeight,size)));}
  }
  y-=8;
  for(const note of layout.notes){y-=groupHeight;cell(left,y,535,groupHeight,pale);text(page,bold,note.label,38,y+5,size);const height=note.lines.length*lineHeight+6,top=y;y-=height;cell(left,y,535,height);note.lines.forEach((value,n)=>text(page,regular,value,38,top-3-size-n*lineHeight,size));}
  text(page,regular,'Tillsyno · Projektering',30,27,7,slate);text(page,regular,'Dörrkort · '+index+'/'+total,250,27,7,slate);fitted(page,regular,'Revision '+state.project.revision,465,27,7,100);
 }
 function exportCardCodes(state,mode='combined'){
  const used=mode==='combined'&&state.drawing.pages.length?new Set(state.placements.filter(p=>state.stencils[p.stencilId]?.kind==='card').map(p=>p.code)):null;
  return Object.keys(state.cards).filter(code=>!used||used.has(code)).sort(natural);
 }
 async function buildCardPreview(input,value,cardDraft){
  const lib=library(),data=dataLibrary();if(!lib||!data)throw Error('PDF-verktyget kunde inte laddas. Öppna sidan igen med internet.');
  const code=data.normalizeCode(value),snapshot=data.validate(input);
  // Validate the draft inside a detached project. A preview must neither save
  // the draft nor increment the editable project's revision or alter its source.
  if(cardDraft!==undefined)snapshot.cards[code]=clone(cardDraft);
  const state=data.validate(snapshot);if(!Object.hasOwn(state.cards,code))throw Error('Välj ett dörrkort att förhandsvisa.');
  const document=await lib.PDFDocument.create(),regular=await document.embedFont(lib.StandardFonts.Helvetica),bold=await document.embedFont(lib.StandardFonts.HelveticaBold);
  const logo=await projectLogo(document,state);
  drawCard(document,state,code,{regular,bold,logo},lib,1,1);
  document.setTitle('Dörrkort '+code+' · '+state.project.name);document.setAuthor(state.project.details?.designer||'Tillsyno');document.setCreator('Tillsyno Projektering 2.19');document.setSubject('Förhandsvisning av dörrkort');
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
 function drawObjectList(document,state,fonts){
  const rows=dataLibrary().objectRows(state).filter(row=>row.quantity>0);
  for(let offset=0;offset<rows.length;offset+=9){
   const page=document.addPage([595,842]);
   text(page,fonts.bold,'Objektlista',30,800,20);
   fitted(page,fonts.regular,state.project.name,30,775,11,535);
   text(page,fonts.bold,'Objektnummer',30,738,10);text(page,fonts.bold,'Maskintyp / modell',195,738,10);text(page,fonts.bold,'Antal',520,738,10);
   rows.slice(offset,offset+9).forEach((row,index)=>{
    const y=710-index*70;
    fitted(page,fonts.regular,row.objectNumber,30,y,10,150);
    wrapped(page,fonts.regular,row.model,195,y,305,10,12,5);
    text(page,fonts.bold,String(row.quantity),520,y,11);
   });
   text(page,fonts.regular,'Antal räknas från objektstencilernas placeringar på ritningen.',30,35,9);
  }
 }
 async function build(input,originalBytes,options={}){
  const lib=library(),data=dataLibrary();if(!lib||!data)throw Error('PDF-verktyget kunde inte laddas. Öppna sidan igen med internet.');
  const state=data.validate(input),mode=options.mode||'combined';if(!['combined','drawing','cards'].includes(mode))throw Error('Välj ritning, dörrkort eller komplett PDF.');
  const editableText=options.editableText===true&&mode!=='cards';if(editableText&&state.schema<5)state.schema=5;
  const source=await sourceDocument(state,originalBytes),document=await lib.PDFDocument.create(),regular=await document.embedFont(lib.StandardFonts.Helvetica),bold=await document.embedFont(lib.StandardFonts.HelveticaBold),codes=exportCardCodes(state,mode);
  if(mode==='drawing'||mode==='combined'){
   if(!source.document&&mode==='drawing')throw Error('Importera en ritning innan du exporterar en ritnings-PDF.');
   if(source.document){const exportPages=await copyDrawing(document,source.document,state,lib);checkPlacements(state);drawPlacements(document,{...state,drawing:{...state.drawing,pages:exportPages}},bold,lib,editableText);drawTextAnnotations(document,{...state,drawing:{...state.drawing,pages:exportPages}},{regular,bold},lib);}
  }
  if(mode==='cards'||mode==='combined'){const logo=await projectLogo(document,state);codes.forEach((code,index)=>drawCard(document,state,code,{regular,bold,logo},lib,index+1,codes.length));}
  if(mode==='combined')drawObjectList(document,state,{regular,bold});
  // Standalone symbols stay visible on the drawing and in the embedded project;
  // only actual door cards append printable pages.
  if(!document.getPageCount())throw Error('Lägg till en ritning eller ett dörrkort före PDF-export.');
  const payload=JSON.stringify({format:'TillsynoProjekteringV2',state,originalLength:source.original.length,...(state.schema>=5?{editableStamps:true,editableText,drawingPages:mode==='cards'?0:state.drawing.pages.length}:{})});if(payload.length>MAX_DATA)throw Error('Projektuppgifterna är för stora för PDF-export.');
  document.catalog.set(lib.PDFName.of(DATA_KEY),lib.PDFHexString.fromText(payload));
  const transfer=typeof module==='object'&&module.exports?require('./tillsyno-projection-times-v513.js'):globalThis.TillsynoProjectionTimes;
  const times=typeof module==='object'&&module.exports?require('./smartmatch-product-times-v513.js'):globalThis.Proj2ProductTimes;
  const materials=typeof module==='object'&&module.exports?require('./smartmatch-projektering-v525-materials.js'):globalThis.Proj2Materials;
  projectInfoLibrary().write(document,state.project,lib,transfer.fromState(state,data,times,materials));
  document.catalog.set(lib.PDFName.of(SOURCE_KEY),document.context.register(document.context.flateStream(source.original,{Type:'EmbeddedFile',Subtype:'application/pdf'})));
  document.setTitle(state.project.name+' · Projektering');document.setAuthor(state.project.details?.designer||'Tillsyno');document.setCreator('Tillsyno Projektering 2.19');document.setSubject('Ritning med stämplar och dörrkort');
  const result=await document.save();if(result.length>MAX_FILE)throw Error('Projekt-PDF:en är större än 80 MB.');return result;
 }
 async function inspect(input){
  const lib=library(),data=dataLibrary();if(!lib||!data)throw Error('PDF-verktyget kunde inte laddas.');const buffer=bytes(input);if(buffer.length>MAX_FILE)throw Error('Projektfilen får vara högst 80 MB.');
  const document=await lib.PDFDocument.load(buffer),saved=lookup(document,document.catalog.get(lib.PDFName.of(DATA_KEY)));
  if(!saved)return null;if(typeof saved.decodeText!=='function')throw Error('Projektuppgifterna i PDF:en kunde inte läsas.');
  const json=decodedText(saved);if(json.length>MAX_DATA)throw Error('Projektuppgifterna i PDF:en är för stora.');let payload;try{payload=JSON.parse(json);}catch(_){throw Error('Projektuppgifterna i PDF:en kunde inte läsas.');}
  if(payload?.format!=='TillsynoProjekteringV2'||!Number.isInteger(payload.originalLength)||payload.originalLength<0||payload.originalLength>MAX_ORIGINAL)throw Error('PDF:en innehåller ett ogiltigt projekteringsprojekt.');
  const state=data.validate(payload.state),stream=lookup(document,document.catalog.get(lib.PDFName.of(SOURCE_KEY)));if(!(stream instanceof lib.PDFRawStream))throw Error('Ritningsoriginalet saknas i projekt-PDF:en. Öppna en komplett sparad projektfil.');
  let original;try{original=new Uint8Array(lib.decodePDFRawStream(stream).decode());}catch(_){throw Error('Ritningsoriginalet i projekt-PDF:en kunde inte läsas.');}
  if(original.length!==payload.originalLength||original.length>MAX_ORIGINAL)throw Error('Ritningsoriginalets storlek stämmer inte med projekt-PDF:en.');
  await sourceDocument(state,original);return {state:payload.editableStamps?readStampEdits(document,state,payload.drawingPages,payload.editableText===true):state,original};
 }
 function readStampEdits(document,state,drawingPages,editableText=false){
  const lib=library(),D=dataLibrary();
  if(!Number.isInteger(drawingPages)||drawingPages<0||drawingPages>document.getPageCount()||(drawingPages&&drawingPages!==state.drawing.pages.length))throw Error('Projektets ritningssidor har ändrats utanför Tillsyno. Importera ritningen på nytt.');
  if(!drawingPages||!state.placements.length)return state;
  const found=new Map(),byId=new Map(state.placements.map(p=>['projection-v2-'+p.id,p])),pages=metadata(document);
  for(let i=0;i<drawingPages;i++){
   const annotations=lookup(document,document.getPage(i).node.get(lib.PDFName.of('Annots')));if(!annotations?.asArray)continue;
   const frames=new Map();
   if(editableText)for(const ref of annotations.asArray()){
    const frame=lookup(document,ref);if(!frame?.get)continue;
    const name=decodedText(lookup(document,frame.get(lib.PDFName.of('NM'))))||'';if(!name.startsWith('projection-v2-frame-'))continue;
    const id='projection-v2-'+name.slice('projection-v2-frame-'.length);if(frames.has(id))throw Error('En ram har dubblerats med samma ID i PDF:en.');frames.set(id,frame);
   }
   for(const ref of annotations.asArray()){
    const a=lookup(document,ref);if(!a?.get||String(lookup(document,a.get(lib.PDFName.of('Subtype'))))!==(editableText?'/FreeText':'/Stamp'))continue;
    const id=decodedText(lookup(document,a.get(lib.PDFName.of('NM'))));if(!byId.has(id))continue;
    if(found.has(id))throw Error('En stämpel har dubblerats med samma ID i PDF:en. Ge kopian ett eget ID före återöppning.');
    const old=byId.get(id),base=numericArray(document,a.get(lib.PDFName.of('TillsynoRect')),4);let rect=numericArray(document,a.get(lib.PDFName.of('Rect')),4);
    if(!rect||!base||rect[2]<=rect[0]||rect[3]<=rect[1])throw Error('En ändrad stämpel saknar giltiga koordinater.');
    const subject=decodedText(lookup(document,a.get(lib.PDFName.of('Subj'))))||old.code,contents=decodedText(lookup(document,a.get(lib.PDFName.of('Contents'))))||old.code;
    // FreeText /Contents is the visible label. /Subj is only a description.
    const code=(state.stencils[old.stencilId]?.modelCode?D.automationCode:D.normalizeCode)(editableText?decodedText(lookup(document,a.get(lib.PDFName.of('Contents')))):subject!==old.code?subject:contents),t=pages[i].transform;
    if(editableText){
     const frame=frames.get(id),frameRect=frame&&numericArray(document,frame.get(lib.PDFName.of('Rect')),4);
     // Some editors trim FreeText Rect to its inner RD box on the first edit.
     // The frame remains authoritative for placement size; centered text may
     // be smaller, but moving it away from the frame must not be lost silently.
     if(!frameRect||frameRect[2]<=frameRect[0]||frameRect[3]<=frameRect[1]||[0,1].some(k=>Math.abs((frameRect[k]+frameRect[k+2]-rect[k]-rect[k+2])/2)>.1)||rect[0]<frameRect[0]-.1||rect[1]<frameRect[1]-.1||rect[2]>frameRect[2]+.1||rect[3]>frameRect[3]+.1)throw Error('Texten och ramen för '+old.code+' har skilts åt. Gruppera och flytta eller ändra storlek på dem tillsammans i PDF:en.');
     rect=frameRect;
     const rotation=lookup(document,a.get(lib.PDFName.of('Rotate')))?.asNumber?.()||0,baseRotation=lookup(document,a.get(lib.PDFName.of('TillsynoTextRotation')))?.asNumber?.()||0;
     if(rotation!==baseRotation)throw Error('Rotationen för '+old.code+' har ändrats i PDF:en. Återställ den och rotera markeringen i Tillsyno före nästa export.');
     frames.delete(id);
    }
    const [cx,cy]=point(t,(rect[0]+rect[2])/2,(rect[1]+rect[3])/2),sx=(rect[2]-rect[0])/(base[2]-base[0]),sy=(rect[3]-rect[1])/(base[3]-base[1]);
    if(old.rotation%90!==0&&Math.abs(sx-sy)>.001)throw Error('En roterad stämpel har ändrats i olika skalor. Återställ proportionerna före återöppning.');
    const turned=old.rotation%180===90;
    found.set(id,{...old,page:i+1,code,x:cx/pages[i].width,y:cy/pages[i].height,width:old.width*(turned?sy:sx),height:old.height*(turned?sx:sy)});
   }
   if(editableText&&[...frames.keys()].some(id=>byId.has(id)))throw Error('En beteckning saknas men dess ram finns kvar. Ta bort både text och ram om markeringen ska tas bort.');
  }
  if(!found.size)throw Error('Projektets redigerbara stämplar saknas. PDF:en kan ha tillplattats. Öppna en projektkopia med bevarade markeringar.');
  const next=clone(state);let changed=found.size!==state.placements.length;
  next.placements=state.placements.flatMap(old=>{
   const item=found.get('projection-v2-'+old.id);if(!item)return [];
   if(item.code!==old.code){
    const source=state.stencils[old.stencilId];let stencil=Object.values(next.stencils).find(s=>s.code===item.code);
    if((stencil&&(stencil.kind!==source.kind||D.isReferenceStencil(stencil)!==D.isReferenceStencil(source)||(source.kind==='symbol'&&stencil.productType!==source.productType)))||(D.isReferenceStencil(source)&&['DA','DS','KL','DFS','AK'].includes(item.code)))throw Error('Den nya beteckningen används av en annan typ av stämpel.');
    if(!stencil){let id=item.code;while(next.stencils[id])id='pdf-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);stencil={...clone(source),id,code:item.code,name:item.code};next.stencils[id]=stencil;}
    if(source.kind==='card'&&!next.cards[item.code])next.cards[item.code]={...clone(state.cards[old.code]),code:item.code,meta:{...state.cards[old.code].meta,littera:item.code}};
    item.stencilId=stencil.id;changed=true;
   }
   for(const key of ['x','y','width','height'])if(Math.abs(item[key]-old[key])<1e-8)item[key]=old[key];
   if(JSON.stringify(item)!==JSON.stringify(old))changed=true;return [item];
  });
  if(!changed)return state;next.project.revision++;next.project.updatedAt=new Date().toISOString();return D.validate(next);
 }
 async function blank(name='Nya dörrkort'){
  const lib=library(),data=dataLibrary();if(!lib||!data)throw Error('PDF-verktyget kunde inte laddas.');
  const document=await lib.PDFDocument.create(),state=data.createEmpty(name);
  document.addPage([1190.55,841.89]); // A3 landscape, a clean white page.
  state.drawing={name:'Tom sida.pdf',pages:metadata(document)};
  document.setTitle(state.project.name);document.setCreator('Tillsyno Projektering 2.19');
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
   const p=Math.floor(i/25),n=i%25,col=n%5,row=Math.floor(n/5),code=data.initialCardCode(i===49?'DBL':'GS'+(i%10+1)),stencilId=code;
   data.addPlacement(state,{page:p+1,stencilId,x:(155+col*225)/1200,y:(230+row*125)/800});
  }
  for(const card of Object.values(state.cards)){
   const set=(id,product,delivery='GS',installer='GS')=>{const row=card.rows.find(r=>r.id===id);if(row)Object.assign(row,{product,delivery,installer});};
   set('day-lock','ST140-50');set('day-cylinder-fittings','256');set('day-cylinder-hinge','8882');set('day-handle','6696','DT','DT');card.meta.doorType='Exempeldörr';card.meta.hanging='Enligt ritning';
  }
  state.cards[data.initialCardCode('GS1')].note='Samma sparade GS1:1-kort används vid flera dörrar.';
  return {state:data.validate(state),original:await document.save()};
 }
 return Object.freeze({build,buildCardPreview,exportCardCodes,inspect,blank,example,metadata,stampMatrix,codeRect,tableRect,DATA_KEY,SOURCE_KEY});
});

