/* Isolated, example-guided identities and card-page proposals for Avläsning TEST 3.
 * This module never alters the production SmartMatch card-reading profiles.
 * Page proposals always need the user's review before drawing links are created.
 */
(function(root){
 'use strict';
 const LABEL=/^(?:D[ÖO]RR\s*KORT|BESLAGSKORT|BESLAGS?KOD|BETECKNING|LITTERA|D[ÖO]RRTYP|TOALETT|D[ÖO]RR(?:NUMMER|NR)?|NUMMER|NR|ID|KOD)\b\s*[:#=.-]?\s*/u;
 const NON_ID=new Set(['DÖRRKORT','DORRKORT','BESLAGSKORT','BESLAGSKOD','BESLAGKOD','BETECKNING','LITTERA','TOALETT','DÖRR','DORR','DÖRRTYP','DORRTYP','KOD','KORT','ANTAL','SIDA','SIDAN','PAGE','MODELL','PRODUKT','KOMPONENT','BESLAG','RUMSTYP','PROJEKT','PLAN','PLANRITNING','RITNING','DATUM','REV','REVISION','SKALA','OBJEKT','NUMMER','NR','ID','GS']);
 const clean=value=>String(value??'').normalize('NFC').replace(/[–—−]/g,'-').replace(/[\u00a0\u2007\u202f]/g,' ').trim();
 const upper=value=>clean(value).toUpperCase();
 const atomic=value=>/^[\p{L}\p{N}]+(?:[-/_.][\p{L}\p{N}]+)*$/u.test(value);

 // Normalizes an identity that the reader or user has already isolated. It does
 // not remove words from a heading or silently join two separately numbered IDs.
 function normalize(value){
  const raw=upper(value);
  if(!raw||raw.length>64)return '';
  const parts=raw.split(/\s+/u);
  if(parts.some(part=>!atomic(part)||(NON_ID.has(part)&&!(part==='GS'&&parts.length>1))))return '';
  if(parts.length>1){
   if(parts.length>3||parts.filter(part=>/\p{N}/u.test(part)).length!==1)return '';
   if(parts.some(part=>!/[\p{N}]/u.test(part)&&part.length>5))return '';
  }
  const compact=parts.join('').replace(/[-/_.]/g,'');
  return /^[\p{L}\p{N}]{1,48}$/u.test(compact)&&!NON_ID.has(compact)?compact:'';
 }

 function withoutLabels(value){
  let result=upper(value),last;
  do{
   last=result;result=result.replace(LABEL,'');
   // OCR may close the space between a long descriptive heading and its ID.
   // Only strip recognized complete labels immediately before a numeric code;
   // short prefixes such as ID remain legitimate parts of an identity.
   result=result.replace(/^(?:D[ÖO]RRKORT|BESLAGSKORT|BESLAGS?KOD|BETECKNING|TOALETT)(?=[\p{L}]{0,5}\s*\p{N})/u,'');
   result=result.replace(/^(?:D[ÖO]RRKORT|BESLAGSKORT)(?=\p{L}{2,48}$)/u,'');
  }while(result!==last);
  return result;
 }

 function candidates(value){
  const text=withoutLabels(value),tokens=[...text.matchAll(/[\p{L}\p{N}]+(?:[-/_.][\p{L}\p{N}]+)*/gu)],found=[];
  const add=value=>{const code=normalize(value);if(code&&!found.includes(code))found.push(code);};
  for(let i=0;i<tokens.length;i++){
   const token=tokens[i][0];if(!/\p{N}/u.test(token))continue;
   let code=token;
   const previous=tokens[i-1],next=tokens[i+1];
   // A short prefix separated from a number is a printed identity (GS 47,
   // WC 12). Longer room descriptions leave the numeric identity intact.
   if(previous&&/^[\p{L}]{1,3}$/u.test(previous[0])&&(!NON_ID.has(previous[0])||previous[0]==='GS')&&/^[\s_-]*$/u.test(text.slice(previous.index+previous[0].length,tokens[i].index)))code=previous[0]+code;
   // A letter suffix is often a separate PDF text item: 140 C -> 140C.
   if(next&&/^[\p{L}]{1,3}$/u.test(next[0])&&!NON_ID.has(next[0])&&/^[\s_-]*$/u.test(text.slice(tokens[i].index+token.length,next.index))){code+=next[0];i++;}
   add(code);
  }
  if(found.length)return found;
  const words=tokens.map(token=>token[0]).filter(token=>!NON_ID.has(token));
  // Alphabetic identities are supported, but separate words remain separate
  // proposals. A title containing two names is a conflict, not a new ID.
  for(const word of words)if(/^\p{L}{2,48}$/u.test(word))add(word);
  return found;
 }

 function extract(value){
  const options=candidates(value);
  return {raw:clean(value),code:options.length===1?options[0]:'',candidates:options,ambiguous:options.length>1};
 }

 function validRect(rect){return !!rect&&['x','y','w','h'].every(key=>Number.isFinite(rect[key]))&&rect.x>=0&&rect.y>=0&&rect.w>0&&rect.h>0&&rect.x+rect.w<=1.001&&rect.y+rect.h<=1.001;}
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

 async function discover(options={}){
  const {pdf,examplePage,codeRect=options.rect,tableRect,readNative,readFallback,onProgress}=options;
  if(!pdf||!Number.isInteger(pdf.numPages)||pdf.numPages<1)throw Error('Öppna en PDF innan dörrkorten läses.');
  if(!Number.isInteger(examplePage)||examplePage<1||examplePage>pdf.numPages)throw Error('Välj en giltig exempelsida.');
  if(!validRect(codeRect)||!validRect(tableRect))throw Error('Markera både beteckningen och hela arbetstabellen på ett dörrkort.');
  const readPage=async pageNumber=>{
   cancelled(options);
   const page=await pdf.getPage(pageNumber);cancelled(options);
   let codeText,tableText,hasNative=false,identity=null;const methods=[];
   if(readNative){
    const code=await readNative({page,pageNumber,rect:codeRect,kind:'code'});cancelled(options);
    const table=await readNative({page,pageNumber,rect:tableRect,kind:'table'});cancelled(options);
    codeText=clean(typeof code==='string'?code:code?.text);tableText=typeof table==='string'?table:String(table?.text||'');
    hasNative=!!(clean(codeText)||clean(tableText));
   }else{
    const content=await page.getTextContent();cancelled(options);
    const words=nativeWords(page,content);hasNative=words.length>0;
    codeText=regionText(words,codeRect);tableText=regionText(words,tableRect);
    if(readFallback){
     const nativeIdentity=extract(codeText);
     if(!nativeIdentity.code){
      const result=await readFallback({page,pageNumber,rect:codeRect,kind:'code'});cancelled(options);
      const fallbackText=clean(typeof result==='string'?result:result?.text);
      // The OCR adapter may supply its own reliable candidates. An empty list
      // means that text was seen but did not pass the adapter's checks.
      const fallbackIds=Array.isArray(result?.ids)?result.ids.map(normalize).filter(Boolean):typeof result?.confidence==='number'&&result.confidence<75?[]:candidates(fallbackText);
      const ids=[...new Set([...nativeIdentity.candidates,...fallbackIds])];
      identity={raw:fallbackText||clean(codeText),code:ids.length===1?ids[0]:'',candidates:ids,ambiguous:ids.length>1};
      codeText=fallbackText||codeText;methods.push('code-ocr');
     }
     if(!clean(tableText)){
      const result=await readFallback({page,pageNumber,rect:tableRect,kind:'table'});cancelled(options);
      if(!(typeof result?.confidence==='number'&&result.confidence<50))tableText=typeof result==='string'?result:String(result?.text||'');
      methods.push('table-ocr');
     }
    }
   }
   const viewport=page.getViewport({scale:1});
   return {page:pageNumber,codeText,tableText,hasNative,hasReadable:!!(clean(codeText)||clean(tableText)),methods,aspect:viewport.width/viewport.height,...(identity||extract(codeText))};
  };
  const sample=await readPage(examplePage);
  const exampleIdentity=options.exampleCode?normalize(options.exampleCode):sample.code;
  const signature=tableSignature(sample.tableText),records=[];
  const order=[examplePage,...Array.from({length:pdf.numPages},(_,i)=>i+1).filter(page=>page!==examplePage)];
  for(const pageNumber of order){
   cancelled(options);
   let record;
   try{
    record=pageNumber===examplePage?sample:await readPage(pageNumber);
    const table=compareTables(signature,tableSignature(record.tableText));
    record.evidence={tableWords:table.commonWords,tableOverlap:table.overlap,lineRatio:table.lineRatio,samePageShape:Math.abs(record.aspect/sample.aspect-1)<=.15};
    if(pageNumber===examplePage&&exampleIdentity){
     record.code=exampleIdentity;record.status='proposed';record.reason='Ditt valda exempel. Kontrollera beteckningen och arbetsraderna.';
    }else if(!record.hasReadable){
     record.status='unresolved';record.reason='Sidan saknar läsbar PDF-text. Bildläs eller kontrollera sidan manuellt.';
    }else if(!exampleIdentity||!signature.words.size){
     record.status='unresolved';record.reason='Exemplets beteckning eller tabell behöver läsas och godkännas först.';
    }else if(table.matches&&record.code){
     record.status='proposed';record.reason='Beteckning i samma läsområde och liknande tabell. Granska innan koppling.';
    }else if(table.matches){
     record.status='unresolved';record.reason=record.ambiguous?'Liknande tabell, men flera möjliga beteckningar. Välj rätt beteckning.':'Liknande tabell, men beteckningen kan inte läsas i valt område.';
    }else if(!clean(record.tableText)){
     record.status='unresolved';record.reason='Tabellområdet saknar läsbar text. Kontrollera om sidan är skannad eller har ett annat upplägg.';
    }else{
     record.status='excluded';record.reason='Tabellen motsvarar inte ditt exempel. Sidan föreslås inte som dörrkort.';
    }
   }catch(error){
    if(error.name==='AbortError')throw error;
    record={page:pageNumber,code:'',codeText:'',tableText:'',candidates:[],ambiguous:false,status:'unresolved',reason:'Sidan kunde inte läsas. Kontrollera den manuellt.',error:String(error.message||error)};
   }
   records.push(record);onProgress?.({done:records.length,total:pdf.numPages,page:pageNumber,message:'Söker dörrkort · sida '+pageNumber+' av '+pdf.numPages});
  }
  cancelled(options);records.sort((a,b)=>a.page-b.page);
  return {example:sample,pages:records,cardPages:records.filter(page=>page.status==='proposed').map(page=>page.page),unresolvedPages:records.filter(page=>page.status==='unresolved').map(page=>page.page),excludedPages:records.filter(page=>page.status==='excluded').map(page=>page.page)};
 }
 const api=Object.freeze({normalize,candidates,extract,discover});
 root.SmartMatchReadCodes=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
