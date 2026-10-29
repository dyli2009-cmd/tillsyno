/* Example-guided identities with explicit colon variants for Projektering 2.19.6.
 * This module never alters the production SmartMatch card-reading profiles.
 * Page proposals always need the user's review before drawing links are created.
 */
(function(root){
 'use strict';
 const LABEL=/^(?:D[ÖO]RR\s*KORT|BESLAGSKORT|BESLAGS?KOD|BETECKNING|LITTERA|D[ÖO]RRTYP|TOALETT|D[ÖO]RR(?:NUMMER|NR)?|NUMMER|NR|ID|KOD)\b\s*[:#=.-]?\s*/u;
 // A known descriptive heading may itself contain PDF/OCR fragment gaps.
 // Match complete headings only; unknown words remain part of the identity.
 const fragmentedLabel=new RegExp('^(?:'+['DÖRRKORT','DORRKORT','BESLAGSKORT','BESLAGSKOD','BESLAGKOD','BETECKNING','LITTERA','DÖRRTYP','DORRTYP','TOALETT'].map(label=>[...label].join('\\s*')).join('|')+')(?=$|\\s|[:#=.\\-])\\s*[:#=.\\-]?\\s*','u');
 const NON_ID=new Set(['DÖRRKORT','DORRKORT','BESLAGSKORT','BESLAGSKOD','BESLAGKOD','BETECKNING','LITTERA','TOALETT','DÖRR','DORR','DÖRRTYP','DORRTYP','KOD','KORT','ANTAL','SIDA','SIDAN','PAGE','MODELL','PRODUKT','KOMPONENT','BESLAG','RUMSTYP','PROJEKT','PLAN','PLANRITNING','RITNING','DATUM','REV','REVISION','SKALA','OBJEKT','NUMMER','NR','ID','GS']);
 const clean=value=>String(value??'').normalize('NFC').replace(/[–—−]/g,'-').replace(/[\u00a0\u2007\u202f]/g,' ').trim();
 const upper=value=>clean(value).toUpperCase();
 const atomic=value=>/^[\p{L}\p{N}]+(?:[-/_.][\p{L}\p{N}]+)*$/u.test(value);

 // The marked field is the identity. Alphabetic compound labels are kept in
 // full, just like numbered labels; no project-specific prefix is required.
 // Two separately numbered IDs remain a conflict instead of being joined.
 function normalize(value){
  const raw=withoutLabels(value);
  if(!raw||raw.length>128)return '';
  const variant=raw.match(/^(.*?)\s*:\s*([1-9]\d*)$/u);
  if(variant){const base=normalize(variant[1]);return base&&!base.includes(':')?base+':'+variant[2]:'';}
  if(/[,;|]|\s\/\s/u.test(raw))return '';
  const parts=raw.replace(/\s*([-_.])\s*/gu,'$1').split(/\s+/u);
  if(parts.some(part=>!atomic(part)))return '';
  if(parts.filter(part=>/\p{N}/u.test(part)).length>1)return '';
  const compact=parts.join('').replace(/[-/_.]/g,'');
  return /^[\p{L}\p{N}]{1,96}$/u.test(compact)?compact:'';
 }

 function withoutLabels(value){
  let result=upper(value),last;
  do{
   last=result;result=result.replace(fragmentedLabel,'').replace(LABEL,'');
   // OCR may close the space between a long descriptive heading and its ID.
   // Only strip recognized complete labels immediately before a numeric code;
   // short prefixes such as ID remain legitimate parts of an identity.
   result=result.replace(/^(?:D[ÖO]RRKORT|BESLAGSKORT|BESLAGS?KOD|BETECKNING|TOALETT)(?=[\p{L}]{0,5}\s*\p{N})/u,'');
   result=result.replace(/^(?:D[ÖO]RRKORT|BESLAGSKORT)(?=\p{L}{2,48}$)/u,'');
  }while(result!==last);
  return result;
 }

 function candidates(value){
  const text=withoutLabels(value),tokens=[...text.matchAll(/[\p{L}\p{N}]+(?:[-/_.][\p{L}\p{N}]+)*(?:\s*:\s*[1-9]\d*)?/gu)],found=[];
  const add=value=>{const code=normalize(value);if(code&&!found.includes(code))found.push(code);};
  const complete=normalize(text);
  if(complete)return [complete];
  // Explicitly separated alternatives still require a decision. Punctuation
  // that belongs to one label (DBL-DS) was handled by normalize above.
  if(/[,;|]|\s\/\s/u.test(text)){
   for(const part of text.split(/[,;|]|\s\/\s/u))for(const code of candidates(part))if(!found.includes(code))found.push(code);
   return found;
  }
  if(text.includes(':')&&!/^(?:[\p{L}\p{N} _/.-]+\s*:\s*[1-9]\d*\s*)+$/u.test(text))return [];
  for(let i=0;i<tokens.length;i++){
   const token=tokens[i][0];if(!/\p{N}/u.test(token))continue;
   let code=token;
   const previous=tokens[i-1],next=tokens[i+1];
   // Preserve the complete selected identity, including a long word prefix:
   // KLASSRUM 1 is KLASSRUM1, never the unrelated number 1. Known descriptive
   // labels were removed above; unknown words must not be silently discarded.
   if(previous&&/^[\p{L}]{1,48}$/u.test(previous[0])&&(!NON_ID.has(previous[0])||previous[0]==='GS')&&/^[\s_-]*$/u.test(text.slice(previous.index+previous[0].length,tokens[i].index)))code=previous[0]+code;
   // A letter suffix is often a separate PDF text item: 140 C -> 140C.
   if(next&&/^[\p{L}]{1,3}$/u.test(next[0])&&!NON_ID.has(next[0])&&/^[\s_-]*$/u.test(text.slice(tokens[i].index+token.length,next.index))){code+=next[0];i++;}
   add(code);
  }
  if(found.length)return found;
  const words=tokens.map(token=>token[0]).filter(token=>!NON_ID.has(token));
  // Preserve legacy recovery of individual tokens for malformed input; a
  // well-formed multiword identifier returned above as one complete value.
  for(const word of words)if(/^\p{L}{2,48}$/u.test(word))add(word);
  return found;
 }

 function extract(value){
  const options=candidates(value);
  return {raw:clean(value),code:options.length===1?options[0]:'',candidates:options,ambiguous:options.length>1};
 }

 function validRect(rect){return !!rect&&['x','y','w','h'].every(key=>Number.isFinite(rect[key]))&&rect.x>=0&&rect.y>=0&&rect.w>0&&rect.h>0&&rect.x+rect.w<=1.001&&rect.y+rect.h<=1.001;}
 // Only this experiment accepts intentional per-page corrections. Clone the
 // normalized rectangles once so callers cannot alter a scan while it runs.
 function pageOptions(options,pdf){
  const overrides=Object.create(null);
  if(options.pageOverrides!==undefined){
   const input=options.pageOverrides;
   if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Sidornas egna läsområden måste anges per giltig PDF-sida.');
   for(const [key,value] of Object.entries(input)){
    const page=Number(key);
    if(!/^[1-9]\d*$/u.test(key)||!Number.isSafeInteger(page)||page>pdf.numPages)throw Error('Ett eget läsområde hänvisar till en ogiltig PDF-sida.');
    if(!value||typeof value!=='object'||Array.isArray(value)||!Object.keys(value).length||Object.keys(value).some(kind=>kind!=='code'&&kind!=='table'))throw Error('Ange kod- eller tabellområde för sida '+page+'.');
    const fields={};
    for(const kind of Object.keys(value)){
     const rect=value[kind];
     if(!validRect(rect)||Array.isArray(rect)||rect.x+rect.w>1.0000001||rect.y+rect.h>1.0000001)throw Error('Ogiltigt '+(kind==='code'?'kodområde':'tabellområde')+' på sida '+page+'. Markera ett område inom sidan.');
     fields[kind]=Object.fromEntries(['x','y','w','h'].map(axis=>[axis,rect[axis]]));
    }
    overrides[page]=fields;
   }
  }
  let onlyPages=null;
  if(options.onlyPages!==undefined){
   if(!Array.isArray(options.onlyPages)||options.onlyPages.some(page=>!Number.isInteger(page)||page<1||page>pdf.numPages))throw Error('Välj giltiga PDF-sidor att läsa.');
   onlyPages=[...new Set(options.onlyPages)];
  }
  return {overrides,onlyPages};
 }
 function frameFor(options,page,codeRect,tableRect){
  const own=options._pageOptions.overrides[page];
  return {codeRect:own?.code||codeRect,tableRect:own?.table||tableRect,anchorWords:0};
 }
 function cancelled(options){
  if(options.signal?.aborted||options.cancelled?.()){
   const error=new Error('Avläsningen avbröts.');error.name='AbortError';throw error;
  }
 }
 function transform(matrix,point){return [matrix[0]*point[0]+matrix[2]*point[1]+matrix[4],matrix[1]*point[0]+matrix[3]*point[1]+matrix[5]];}
 function viewportPoint(viewport,x,y){return typeof viewport.convertToViewportPoint==='function'?viewport.convertToViewportPoint(x,y):transform(viewport.transform,[x,y]);}
 function nativeWords(page,content){
  const viewport=page.getViewport({scale:1}),words=[];
  for(const item of content.items||[]){
   if(!clean(item.str)||!Array.isArray(item.transform))continue;
   const height=Math.max(1,Number(item.height)||Math.hypot(item.transform[2],item.transform[3])||1);
   const width=Math.max(1,Number(item.width)||Math.hypot(item.transform[0],item.transform[1])||1);
   // Native PDF coordinates describe the text baseline. Selection uses the
   // visible text's centre, including tightly selected headings and rotated
   // pages/text. Apply text orientation in PDF space before the page viewport.
   const along=Math.hypot(item.transform[0],item.transform[1])||1,up=Math.hypot(item.transform[2],item.transform[3])||along;
   const [centreX,centreY]=viewportPoint(viewport,item.transform[4]+item.transform[0]/along*width/2+item.transform[2]/up*height/2,item.transform[5]+item.transform[1]/along*width/2+item.transform[3]/up*height/2);
   words.push({text:clean(item.str),x:centreX/viewport.width,y:centreY/viewport.height,h:height/viewport.height});
  }
  return words;
 }
 function regionText(words,rect){
  const selected=words.filter(word=>word.x>=rect.x&&word.x<=rect.x+rect.w&&word.y>=rect.y&&word.y<=rect.y+rect.h).sort((a,b)=>a.y-b.y||a.x-b.x),lines=[];
  for(const word of selected){
   let row=lines.find(line=>Math.abs(line.y-word.y)<=Math.max(.002,word.h*.55));
   if(!row){row={y:word.y,words:[]};lines.push(row);}row.words.push(word);
  }
  return lines.sort((a,b)=>a.y-b.y).map(line=>line.words.sort((a,b)=>a.x-b.x).map(word=>word.text).join('  ')).join('\n');
 }
 function tableSignature(value){
  const lines=String(value||'').split(/\n+/).map(clean).filter(Boolean);
  const words=new Set((upper(value).match(/\p{L}{3,}/gu)||[]).filter(word=>!NON_ID.has(word)||['KOMPONENT','PRODUKT','ANTAL','BESLAG'].includes(word)));
  return {lines:lines.length,words};
 }
 function compareTables(sample,other){
  const common=[...sample.words].filter(word=>other.words.has(word));
  const overlap=common.length/Math.max(1,Math.min(sample.words.size,other.words.size));
  const lineRatio=Math.min(sample.lines,other.lines)/Math.max(1,sample.lines,other.lines);
  return {matches:common.length>=2&&overlap>=.35&&lineRatio>=.25,commonWords:common.length,overlap,lineRatio};
 }

 function inRect(word,rect){return word.x>=rect.x&&word.x<=rect.x+rect.w&&word.y>=rect.y&&word.y<=rect.y+rect.h;}
 function shiftedRect(rect,move){return {x:rect.x*move.sx+move.dx,y:rect.y*move.sy+move.dy,w:rect.w*move.sx,h:rect.h*move.sy};}
 function overlap(a,b){
  const area=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  return area/Math.max(.0000001,Math.min(a.w*a.h,b.w*b.h));
 }
 function sameFrame(a,b){return overlap(a.codeRect,b.codeRect)>.75&&overlap(a.tableRect,b.tableRect)>.8;}
 function boundsFor(codeRect,tableRect){
  // This is the user's selected card frame, not a guessed page/grid position.
  // Keep enough surrounding space to show the heading and the complete body.
  const pad=Math.min(.012,Math.max(.003,codeRect.h*.18));
  const x=Math.max(0,Math.min(codeRect.x,tableRect.x)-pad),y=Math.max(0,Math.min(codeRect.y,tableRect.y)-pad);
  const right=Math.min(1,Math.max(codeRect.x+codeRect.w,tableRect.x+tableRect.w)+pad),bottom=Math.min(1,Math.max(codeRect.y+codeRect.h,tableRect.y+tableRect.h)+pad);
  return {x,y,w:right-x,h:bottom-y};
 }
 function cardId(page,frame){
  // IDs depend on physical source geometry, not the recognized label. A user
  // correcting the label must not silently create a different source card.
  return 'p'+page+':'+['codeRect','tableRect'].flatMap(key=>['x','y','w','h'].map(axis=>Math.round(frame[key][axis]*10000))).join('-');
 }
 function median(values){const sorted=[...values].sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;}

 function repeatedFrames(sampleWords,otherWords,sampleAspect,otherAspect,codeRect,tableRect){
  // The example supplies all anchors. Repeated table headings/body text vote
  // for a translation and scale; neither card names nor a fixed sheet grid
  // are encoded here. One shared word alone is never sufficient evidence.
  const key=text=>upper(text).replace(/\s+/gu,' '),anchors=sampleWords.filter(word=>inRect(word,tableRect)&&/\p{L}{2}/u.test(word.text));
  const byText=new Map();
  for(const word of otherWords){const text=key(word.text);if(!byText.has(text))byText.set(text,[]);byText.get(text).push(word);}
  const clusters=[],centre={x:tableRect.x+tableRect.w/2,y:tableRect.y+tableRect.h/2};
  for(const anchor of anchors){
   const text=key(anchor.text);
   for(const target of byText.get(text)||[]){
    const sy=target.h/anchor.h,sx=sy*sampleAspect/otherAspect;
    if(!Number.isFinite(sx)||!Number.isFinite(sy)||sx<.2||sx>5||sy<.2||sy>5)continue;
    const point={dx:target.x-anchor.x*sx,dy:target.y-anchor.y*sy,sx,sy,text};
    point.x=centre.x*sx+point.dx;point.y=centre.y*sy+point.dy;
    const tolerance=Math.max(.003,Math.min(.012,target.h*.65));
    let group=clusters.find(group=>Math.abs(group.x-point.x)<=tolerance&&Math.abs(group.y-point.y)<=tolerance&&Math.abs(group.sy/point.sy-1)<.07);
    if(!group){group={x:point.x,y:point.y,sy:point.sy,points:[],words:new Set()};clusters.push(group);}
    group.points.push(point);group.words.add(text);
    group.x=median(group.points.map(item=>item.x));group.y=median(group.points.map(item=>item.y));group.sy=median(group.points.map(item=>item.sy));
   }
  }
  const frames=[];
  for(const group of clusters.filter(group=>group.words.size>=2).sort((a,b)=>b.words.size-a.words.size||b.points.length-a.points.length)){
   const move=Object.fromEntries(['dx','dy','sx','sy'].map(axis=>[axis,median(group.points.map(point=>point[axis]))]));
   const frame={codeRect:shiftedRect(codeRect,move),tableRect:shiftedRect(tableRect,move),anchorWords:group.words.size};
   if(!validRect(frame.codeRect)||!validRect(frame.tableRect)||frames.some(other=>sameFrame(frame,other)))continue;
   frames.push(frame);
  }
  return frames;
 }

 // A separate one-card-per-page path: no table signature, equipment words,
 // table crop, or product OCR is needed to establish identifier links.
 async function discoverCodeOnly(options){
  const {pdf,examplePage,codeRect,readNative,readFallback,onProgress}=options;
  if(!validRect(codeRect))throw Error('Markera beteckningen på ett dörrkort.');
  const explicit=Array.isArray(options.codePages)?options.codePages:Array.isArray(options.pages)?options.pages:null;
  const requested=explicit?[...new Set(explicit.filter(page=>Number.isInteger(page)&&page>=1&&page<=pdf.numPages))]:Array.from({length:pdf.numPages},(_,i)=>i+1);
  if(!requested.includes(examplePage))requested.unshift(examplePage);
  const limited=options._pageOptions.onlyPages;
  const outputPages=limited===null?requested:requested.filter(page=>limited.includes(page));
  const outputOrder=[examplePage,...outputPages.filter(page=>page!==examplePage)].filter(page=>outputPages.includes(page));
  const order=outputPages.length?[examplePage,...outputPages.filter(page=>page!==examplePage)]:[],sources=new Map(),records=[],cards=[];
  const sourceFor=async pageNumber=>{
   if(sources.has(pageNumber))return sources.get(pageNumber);
   cancelled(options);const page=await pdf.getPage(pageNumber),viewport=page.getViewport({scale:1});cancelled(options);
   const source={page,words:[],textRead:false,width:viewport.width,height:viewport.height,aspect:viewport.width/viewport.height};sources.set(pageNumber,source);return source;
  };
  const readSourceText=async(source,pageNumber)=>{
   if(source.textRead)return;
   const content=options.getTextContent?await options.getTextContent(source.page,pageNumber):typeof source.page.getTextContent==='function'?await source.page.getTextContent():{items:[]};cancelled(options);
   source.words=nativeWords(source.page,content);source.textRead=true;
  };
  const detail=(state,page)=>{if(outputPages.includes(page))options.onDetail?.({phase:'card-discovery',label:state==='start'?'Läser kodfältet på dörrkortet':'Kodfältet på sidan är kontrollerat',page,pageIndex:outputOrder.indexOf(page)+1,pageCount:outputPages.length,unit:'page',done:records.length,total:outputPages.length,scope:'card-pages',state});};
  if(!order.length){cancelled(options);return {example:null,pages:[],cards:[],codeOnly:true,cardPages:[],unresolvedPages:[],excludedPages:[]};}
  detail('start',examplePage);
  const sampleSource=await sourceFor(examplePage);
  let sample=null,exampleIdentity='';
  for(const pageNumber of order){
   cancelled(options);if(pageNumber!==examplePage)detail('start',pageNumber);
   try{
    const source=await sourceFor(pageNumber),isExample=pageNumber===examplePage,pageOverride=options._pageOptions.overrides[pageNumber],pageCodeRect=frameFor(options,pageNumber,codeRect).codeRect;
    const sameShape=Math.abs(source.aspect/sampleSource.aspect-1)<=.15;
    const sameSize=sameShape&&Math.abs(source.width/sampleSource.width-1)<=.2&&Math.abs(source.height/sampleSource.height-1)<=.2;
    const plausible=isExample||!!explicit||!!pageOverride||sameSize;
    // Geometry is cheap. Reject clearly different drawing sheets before
    // asking PDF.js (or a supplied adapter) to parse their text streams.
    if(plausible)await readSourceText(source,pageNumber);
    let codeText=regionText(source.words,pageCodeRect),identity=extract(codeText),methods=[];
    if(plausible&&readNative){
     const result=await readNative({page:source.page,pageNumber,rect:pageCodeRect,kind:'code'});cancelled(options);
     codeText=clean(typeof result==='string'?result:result?.text);identity=extract(codeText);
    }
    const knownHeader=LABEL.test(upper(codeText))||source.words.some(word=>LABEL.test(upper(word.text)));
    // Manual page choices and the marked example are direct evidence. In
    // automatic mode, avoid OCR on drawings with a different sheet size and
    // avoid treating unrelated dense native text as a scanned card header.
    const canFallback=plausible&&(options.fallbackPolicy==='all'||isExample||!!explicit||!!pageOverride||knownHeader||source.words.length<=5);
    if(!identity.code&&canFallback&&readFallback&&options.fallbackPolicy!=='none'){
     const result=await readFallback({page:source.page,pageNumber,rect:pageCodeRect,kind:'code'});cancelled(options);
     const fallbackText=clean(typeof result==='string'?result:result?.text);
     const fallbackIds=Array.isArray(result?.ids)?result.ids.map(normalize).filter(Boolean):typeof result?.confidence==='number'&&result.confidence<75?[]:candidates(fallbackText);
     const ids=[...new Set([...identity.candidates,...fallbackIds])];
     identity={raw:fallbackText||codeText,code:ids.length===1?ids[0]:'',candidates:ids,ambiguous:ids.length>1};
     codeText=fallbackText||codeText;methods.push('code-ocr');
    }
    const record={id:'p'+pageNumber+':code:'+['x','y','w','h'].map(axis=>Math.round(pageCodeRect[axis]*10000)).join('-'),page:pageNumber,
     codeRect:{...pageCodeRect},tableRect:null,bounds:{x:0,y:0,w:1,h:1},tableText:'',codeText,methods,
     hasNative:source.words.length>0,hasReadable:!!clean(codeText),aspect:source.aspect,codeOnly:true,workDeferred:true,
     evidence:{samePageShape:sameShape,samePageSize:sameSize,explicitPages:!!explicit,header:knownHeader,...(pageOverride?{pageOverride:true,overrideCode:!!pageOverride.code,overrideTable:!!pageOverride.table}:{})},...identity};
    if(isExample){
     exampleIdentity=options.exampleCode?normalize(options.exampleCode):record.code;
     if(exampleIdentity){record.code=exampleIdentity;record.candidates=[exampleIdentity];record.ambiguous=false;}
     sample=record;
    }
    if(!plausible){record.status='excluded';record.reason='Sidan har ett annat sidformat än exempelkortet. Välj kortsidor manuellt om den ska läsas.';}
    else if(!exampleIdentity){record.status='unresolved';record.reason='Exemplets beteckning behöver läsas och godkännas först.';}
    else if(record.code){record.status='proposed';record.reason=isExample?'Ditt markerade kodfält. Produkter läses senare.':'Beteckning i motsvarande kodfält. Granska kortsidan före koppling.';}
    else{record.status='unresolved';record.reason=record.ambiguous?'Kodfältet innehåller flera beteckningar. Välj rätt beteckning.':'Beteckningen kunde inte läsas i kodfältet. Bildläs fältet eller kontrollera sidan manuellt.';}
    if(outputPages.includes(pageNumber)){
     if(record.status!=='excluded')cards.push(record);
     records.push({...record,cardIds:record.status==='excluded'?[]:[record.id],cardCount:record.status==='excluded'?0:1});
    }
   }catch(error){
    if(error.name==='AbortError')throw error;
    if(outputPages.includes(pageNumber))records.push({page:pageNumber,code:'',codeText:'',tableText:'',candidates:[],ambiguous:false,status:'unresolved',codeOnly:true,workDeferred:true,cardIds:[],cardCount:0,reason:'Kodfältet kunde inte läsas. Kontrollera sidan manuellt.',error:String(error.message||error)});
   }
   cancelled(options);detail('complete',pageNumber);
   if(outputPages.includes(pageNumber))onProgress?.({done:records.length,total:outputPages.length,page:pageNumber,message:'Läser bara kodfält · sida '+pageNumber+' av '+pdf.numPages});
  }
  cancelled(options);records.sort((a,b)=>a.page-b.page);cards.sort((a,b)=>a.page-b.page);
  return {example:sample,pages:records,cards,codeOnly:true,cardPages:cards.filter(card=>card.status==='proposed').map(card=>card.page),unresolvedPages:records.filter(page=>page.status==='unresolved').map(page=>page.page),excludedPages:records.filter(page=>page.status==='excluded').map(page=>page.page)};
 }

 async function discover(options={}){
  const {pdf,examplePage,readNative,readFallback,onProgress}=options;
  const codeRect=options.codeRect||options.rects?.code||options.rect,tableRect=options.tableRect||options.rects?.table;
  if(!pdf||!Number.isInteger(pdf.numPages)||pdf.numPages<1)throw Error('Öppna en PDF innan dörrkorten läses.');
  if(!Number.isInteger(examplePage)||examplePage<1||examplePage>pdf.numPages)throw Error('Välj en giltig exempelsida.');
  options={...options,_pageOptions:pageOptions(options,pdf)};
  cancelled(options);
  if(options.codeOnly)return discoverCodeOnly({...options,codeRect});
  if(!validRect(codeRect)||!validRect(tableRect))throw Error('Markera både beteckningen och hela arbetstabellen på ett dörrkort.');
  const nativePages=new Map(),baseFrame={codeRect,tableRect,anchorWords:0},sampleFrame=frameFor(options,examplePage,codeRect,tableRect);
  const outputPages=options._pageOptions.onlyPages===null?Array.from({length:pdf.numPages},(_,i)=>i+1):options._pageOptions.onlyPages;
  const outputOrder=[examplePage,...outputPages.filter(page=>page!==examplePage)].filter(page=>outputPages.includes(page));
  if(!outputPages.length)return {example:null,pages:[],cards:[],cardPages:[],unresolvedPages:[],excludedPages:[]};
  let sampleSignature=null;
  const nativePage=async pageNumber=>{
   if(nativePages.has(pageNumber))return nativePages.get(pageNumber);
   cancelled(options);const page=await pdf.getPage(pageNumber);cancelled(options);
   const viewport=page.getViewport({scale:1}),content=options.getTextContent?await options.getTextContent(page,pageNumber):typeof page.getTextContent==='function'?await page.getTextContent():{items:[]};cancelled(options);
   const value={page,words:nativeWords(page,content),aspect:viewport.width/viewport.height};nativePages.set(pageNumber,value);return value;
  };
  const readPage=async(pageNumber,frame=baseFrame,useFallback=true)=>{
   cancelled(options);
   const source=await nativePage(pageNumber),{page,words}=source;cancelled(options);
   let codeText,tableText,hasNative=false,identity=null;const methods=[];
   if(readNative){
    const code=await readNative({page,pageNumber,rect:frame.codeRect,kind:'code'});cancelled(options);
    const table=await readNative({page,pageNumber,rect:frame.tableRect,kind:'table'});cancelled(options);
    codeText=clean(typeof code==='string'?code:code?.text);tableText=typeof table==='string'?table:String(table?.text||'');
    hasNative=!!(clean(codeText)||clean(tableText));
   }else{
    hasNative=words.length>0;
    codeText=regionText(words,frame.codeRect);tableText=regionText(words,frame.tableRect);
    const fallbackPolicy=options.fallbackPolicy||'all';
    const tableEvidence=sampleSignature&&compareTables(sampleSignature,tableSignature(tableText));
    const structural=frame.anchorWords>=3&&tableEvidence?.commonWords>=3&&tableEvidence.lineRatio>=.5;
    const canFallback=fallbackPolicy==='all'||fallbackPolicy==='matching-tables'&&(pageNumber===examplePage||!!options._pageOptions.overrides[pageNumber]||tableEvidence?.matches||structural);
    if(readFallback&&useFallback&&canFallback){
     const nativeIdentity=extract(codeText);
     if(!nativeIdentity.code){
      const result=await readFallback({page,pageNumber,rect:frame.codeRect,kind:'code'});cancelled(options);
      const fallbackText=clean(typeof result==='string'?result:result?.text);
      // The OCR adapter may supply its own reliable candidates. An empty list
      // means that text was seen but did not pass the adapter's checks.
      const fallbackIds=Array.isArray(result?.ids)?result.ids.map(normalize).filter(Boolean):typeof result?.confidence==='number'&&result.confidence<75?[]:candidates(fallbackText);
      const ids=[...new Set([...nativeIdentity.candidates,...fallbackIds])];
      identity={raw:fallbackText||clean(codeText),code:ids.length===1?ids[0]:'',candidates:ids,ambiguous:ids.length>1};
      codeText=fallbackText||codeText;methods.push('code-ocr');
     }
     if(!clean(tableText)){
      const result=await readFallback({page,pageNumber,rect:frame.tableRect,kind:'table'});cancelled(options);
      if(!(typeof result?.confidence==='number'&&result.confidence<50))tableText=typeof result==='string'?result:String(result?.text||'');
      methods.push('table-ocr');
     }
    }
   }
   return {id:cardId(pageNumber,frame),page:pageNumber,codeRect:{...frame.codeRect},tableRect:{...frame.tableRect},bounds:boundsFor(frame.codeRect,frame.tableRect),codeText,tableText,hasNative,hasReadable:!!(clean(codeText)||clean(tableText)),methods,aspect:source.aspect,...(identity||extract(codeText))};
  };
  const records=[],cards=[];
  const detail=(state,page,index)=>{if(outputPages.includes(page))options.onDetail?.({phase:'card-discovery',label:state==='start'?'Läser kodfält och arbetslista':'Dörrkorten på sidan är kontrollerade',page,pageIndex:outputOrder.indexOf(page)+1,pageCount:outputPages.length,unit:'page',done:records.length,total:outputPages.length,scope:'card-pages',state});};
  detail('start',examplePage,1);
  const sample=await readPage(examplePage,sampleFrame);
  const exampleIdentity=options.exampleCode?normalize(options.exampleCode):sample.code;
  const signature=tableSignature(sample.tableText),sampleSource=await nativePage(examplePage);
  sampleSignature=signature;
  const order=outputOrder;
  const classify=(record,isExample=false,anchorWords=0)=>{
   const table=compareTables(signature,tableSignature(record.tableText));
   // Products can be completely different between cards. Repeated source
   // headings at the same relative positions provide stronger structural
   // evidence than requiring a large percentage of product words to repeat.
   const structural=anchorWords>=3&&table.commonWords>=3&&table.lineRatio>=.5,matches=table.matches||structural;
   const pageOverride=options._pageOptions.overrides[record.page];
   record.evidence={tableWords:table.commonWords,tableOverlap:table.overlap,lineRatio:table.lineRatio,samePageShape:Math.abs(record.aspect/sample.aspect-1)<=.15,anchorWords,structural,...(pageOverride?{pageOverride:true,overrideCode:!!pageOverride.code,overrideTable:!!pageOverride.table}:{})};
   if(isExample&&exampleIdentity){
    record.code=exampleIdentity;record.status='proposed';record.reason='Ditt valda exempel. Kontrollera beteckningen och arbetsraderna.';
   }else if(!record.hasReadable){
    record.status='unresolved';record.reason='Området saknar läsbar PDF-text. Bildläs eller kontrollera det manuellt.';
   }else if(!exampleIdentity||!signature.words.size){
    record.status='unresolved';record.reason='Exemplets beteckning eller tabell behöver läsas och godkännas först.';
   }else if((matches||pageOverride)&&record.code){
    record.status='proposed';record.reason=pageOverride?'Sidans egna markerade läsområde. Kontrollera beteckningen och arbetsraderna före koppling.':'Beteckning i motsvarande läsområde och liknande tabell. Granska innan koppling.';
   }else if(matches){
    record.status='unresolved';record.reason=record.ambiguous?'Liknande tabell, men flera möjliga beteckningar. Välj rätt beteckning.':'Liknande tabell, men beteckningen kan inte läsas i valt område.';
   }else if(!clean(record.tableText)){
    record.status='unresolved';record.reason='Tabellområdet saknar läsbar text. Skannade kort på flera platser behöver kontrolleras manuellt.';
   }else{
    record.status='excluded';record.reason='Tabellen motsvarar inte ditt exempel. Området föreslås inte som dörrkort.';
   }
   return record;
  };
  for(const [pageOffset,pageNumber] of order.entries()){
   cancelled(options);if(pageOffset||pageNumber!==examplePage)detail('start',pageNumber,pageOffset+1);
   let record;
   try{
    const source=await nativePage(pageNumber),pageCards=[];
    const own=options._pageOptions.overrides[pageNumber],pageFrame=frameFor(options,pageNumber,codeRect,tableRect);
    // A correction intentionally selects one frame on this page. Global
    // anchors must not silently add a second, stale frame beside that choice.
    const repeated=own?[]:repeatedFrames(sampleSource.words,source.words,sampleSource.aspect,source.aspect,sampleFrame.codeRect,sampleFrame.tableRect);
    const frames=[{...pageFrame,anchorWords:Math.max(0,...repeated.filter(frame=>sameFrame(frame,pageFrame)).map(frame=>frame.anchorWords))},...repeated.filter(frame=>!sameFrame(frame,pageFrame))];
    for(let index=0;index<frames.length;index++){
     cancelled(options);const frame=frames[index];
     // Proposed shifts must pass the complete table check before invoking OCR.
     // This avoids turning every coincidental repeated plan word into a scan.
     if(index>0){
      const table=compareTables(signature,tableSignature(regionText(source.words,frame.tableRect)));
      if(!table.matches&&!(frame.anchorWords>=3&&table.commonWords>=3&&table.lineRatio>=.5))continue;
     }
     const item=classify(pageNumber===examplePage&&index===0?sample:await readPage(pageNumber,frame),pageNumber===examplePage&&index===0,frame.anchorWords);
     if(index===0)record=item;
     if(item.status!=='excluded'&&(index===0||item.evidence.tableWords>=2))pageCards.push(item);
    }
    // The page overview is retained for callers using the original API, while
    // each independent region is now available in cards, including conflicts.
    if(outputPages.includes(pageNumber))cards.push(...pageCards);
    const representative=pageCards.find(item=>item.status==='proposed')||pageCards[0]||record;
    record={...representative,cardIds:pageCards.map(item=>item.id),cardCount:pageCards.length};
   }catch(error){
    if(error.name==='AbortError')throw error;
    record={page:pageNumber,code:'',codeText:'',tableText:'',candidates:[],ambiguous:false,status:'unresolved',reason:'Sidan kunde inte läsas. Kontrollera den manuellt.',error:String(error.message||error)};
   }
   cancelled(options);if(outputPages.includes(pageNumber)){records.push(record);detail('complete',pageNumber,order.indexOf(pageNumber)+1);onProgress?.({done:records.length,total:outputPages.length,page:pageNumber,message:'Söker dörrkort · sida '+pageNumber+' av '+pdf.numPages});}
  }
  cancelled(options);records.sort((a,b)=>a.page-b.page);cards.sort((a,b)=>a.page-b.page||a.bounds.y-b.bounds.y||a.bounds.x-b.bounds.x);
  return {example:sample,pages:records,cards,cardPages:[...new Set(cards.filter(card=>card.status==='proposed').map(card=>card.page))].sort((a,b)=>a-b),unresolvedPages:records.filter(page=>page.status==='unresolved'||cards.some(card=>card.page===page.page&&card.status==='unresolved')).map(page=>page.page),excludedPages:records.filter(page=>page.status==='excluded').map(page=>page.page)};
 }
 const api=Object.freeze({normalize,candidates,extract,discover});
 root.SmartMatchReadCodes=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
