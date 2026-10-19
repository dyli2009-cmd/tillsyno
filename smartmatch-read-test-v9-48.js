/* Isolated card reading and reviewed drawing matches, Avläsning TEST 9.48. */
(()=>{
 'use strict';
 const base=new URL('./',document.currentScript.src),templatesKey='tillsyno-read-test-templates:v9.48';
 const readerAgent=String(navigator.userAgent||'')+' '+String(navigator.platform||'');
 const readerIsIos=/iPad|iPhone|iPod/i.test(readerAgent)||(/Macintosh|MacIntel/i.test(readerAgent)&&(Number(navigator.maxTouchPoints)||0)>1);
 const readerPdfOptions=data=>readerIsIos?{data,canvasMaxAreaInBytes:12*1024*1024}:{data};
 const clone=o=>JSON.parse(JSON.stringify(o));
 const clean=s=>String(s||'').normalize('NFC').replace(/\s+/g,' ').trim();
 const norm=s=>window.SmartMatchAppBridge?.normalizeCardLabel(s)||'';
 const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
 let active=null,ui=null,workerPromise=null,libraryPromise=null,opening=false;
 let doc=null,example=1,zoom=1,rects={},mode='code',gesture=null,prepared={},preparedChecks={},confirmed=false,busy=false,resolveChoice=null,sourceId='',cancelVersion=0;
 let view='card',drawingPage=1,drawingSample=null,matchRun=null,focusedHit=null,discovery=null,annotationIndex=[],metadataWarning='';
 let pageTextCache=new WeakMap(),regionReadCache=new WeakMap();
 let productsOnly=false,productsRead=false,previousRead=null,additionsOnly=false,singleCardReread=false,singleCardTargetId='',singleCardTargetPage=0;
 let deferredResume=false,resumeCardIds=new Set(),resumeWorkIds=null,searchError='',lastValidMatch=null;
 let pageOverrides={},cardOverrides={},areaScope='common',areaCardId='',localDirty=new Set(),pendingMatchCodes=new Set();
 let readingProgress=null,readContext={},readVersion=0;
 let preparedOpen=null;
 const touchPoints=new Map();
 let pinch=null,pinchSession=false,zoomTimer=null,zoomDirty=false;
 const $=id=>document.getElementById(id);
 function parsePages(value,total){
  const result=new Set();
  for(const part of String(value).split(/[,;\s]+/).filter(Boolean)){
   const m=part.match(/^(\d+)(?:-(\d+))?$/);if(!m)throw Error('Ange sidor som 2, 4-8.');
   const a=Number(m[1]),b=Number(m[2]||m[1]);
   if(a<1||b<a||b>total)throw Error('Dörrkortssidor måste vara mellan 1 och '+total+'.');
   for(let n=a;n<=b;n++)result.add(n);
  }
  if(!result.size)throw Error('Välj minst en dörrkortssida.');
  return [...result].sort((a,b)=>a-b);
 }
 function candidates(value){return window.SmartMatchReadCodes.candidates(value);}
 function rowKey(text,index){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return 'read:'+index+':'+(h>>>0).toString(36);}
 const workIdentity=value=>clean(value).normalize('NFKD').replace(/\p{M}/gu,'').toLocaleUpperCase('sv-SE');
 function prepareWorkCard(card,previous=null){
  if(card.workState==='pending')return card;
  const old=previous||card,oldItems=(old.work||[]).map((text,index)=>({text,index,item:old.workItems?.[index]}));
  let selected=card;
  // Rebuild automatic legacy rows from their saved word positions. Manually
  // edited lists have no aligned items and keep the user's explicit choices.
  // v2 already has structured rows, so retain every saved row and add only
  // products recovered by the corrected visual-line parser.
  if(!previous&&['gs-install-v1','gs-install-v2'].includes(card.workPolicy)&&card.tableWords?.length&&oldItems.every(row=>row.item?.text===row.text)){
   const previousPolicy=card.workPolicy;
   const read=window.SmartMatchReadWork.read({words:card.tableWords,text:card.rawTable||''});
   if(read.resolved!==false){
    selected={...card,work:read.work,workItems:read.items,workWarnings:[...(card.workWarnings||[]),...read.warnings],workPolicy:'gs-install-v4'};
    if(previousPolicy==='gs-install-v2'){
     mergeWorkAdditions(selected,card);
     delete selected.rereadBaseCount;delete selected.rereadAddedCount;
    }
   }
  }
  const used=new Set();
  selected.workItems=(selected.workItems||[]).map((item,index)=>{
   if(!item||item.text!==selected.work?.[index])return item;
   const matches=oldItems.filter(row=>!used.has(row.index)&&row.item?.text===row.text&&workIdentity(row.item.label)===workIdentity(item.label)&&workIdentity(row.item.value)===workIdentity(item.value)&&(!row.item.sectionKey||!item.sectionKey||row.item.sectionKey===item.sectionKey));
   matches.sort((a,b)=>Math.abs((a.item.sourceRow??a.index)-(item.sourceRow??index))-Math.abs((b.item.sourceRow??b.index)-(item.sourceRow??index)));
   const found=matches[0];if(found)used.add(found.index);
   const key=found?(found.item.key||rowKey(found.text,found.index)):item.key||'gs2:'+rowKey(item.sourceIdentity||[item.sectionKey,item.label,item.value,index].join('|'),0);
   return {...item,key};
  });
  Object.assign(card,selected);return card;
 }
 function workItemIdentity(text,item){
  if(!item||item.text!==text)return '';
  const label=workIdentity(item.label),value=workIdentity(item.value);
  if(!label&&!value)return '';
  return [workIdentity(item.sectionKey||item.section||''),label,value].join('\u241f');
 }
 function reconcileWorkItems(work,items,referenceWork,referenceItems){
  const rows=(referenceWork||[]).map((text,index)=>({text,item:referenceItems?.[index],index})),used=new Set();
  return (work||[]).map((text,index)=>{
   const item=items?.[index],structured=workItemIdentity(text,item),exact=workIdentity(text);
   let found=structured?rows.find(row=>!used.has(row.index)&&workItemIdentity(row.text,row.item)===structured):null;
   // Legacy/manual rows may lack table metadata. Match those by the full text,
   // preserving punctuation and consuming only one occurrence at a time.
   if(!found)found=rows.find(row=>!used.has(row.index)&&workIdentity(row.text)===exact&&(!structured||!workItemIdentity(row.text,row.item)));
   if(!found)return null;
   used.add(found.index);return found.item?.text===found.text?clone(found.item):null;
  });
 }
 function mergeWorkAdditions(card,previous){
  if(!previous||previous.workState==='pending'||!Array.isArray(previous.work))return card;
  const oldWork=clone(previous.work||[]),oldItems=oldWork.map((text,index)=>{
   const item=previous.workItems?.[index];return item?.text===text?clone(item):null;
  });
  const oldRows=oldWork.map((text,index)=>({text,item:oldItems[index],index})),used=new Set(),addedWork=[],addedItems=[];
  for(let index=0;index<(card.work||[]).length;index++){
   const text=card.work[index],item=card.workItems?.[index],structured=workItemIdentity(text,item),exact=workIdentity(text);
   let found=structured?oldRows.find(row=>!used.has(row.index)&&workItemIdentity(row.text,row.item)===structured):null;
   if(!found)found=oldRows.find(row=>!used.has(row.index)&&workIdentity(row.text)===exact&&(!structured||!workItemIdentity(row.text,row.item)));
   if(found){used.add(found.index);continue;}
   addedWork.push(text);addedItems.push(item?.text===text?clone(item):null);
  }
  card.work=[...oldWork,...addedWork];card.workItems=[...oldItems,...addedItems];card.rereadBaseCount=oldWork.length;card.rereadAddedCount=addedWork.length;
  card.workWarnings=[...(card.workWarnings||[]),addedWork.length?addedWork.length+' ny'+(addedWork.length===1?'':'a')+' GS-produkt'+(addedWork.length===1?'':'er')+' hittades. Tidigare punkter, tider och avprickningar behålls.':'Inga nya GS-produkter hittades. Tidigare punkter, tider och avprickningar behålls.'];
  return card;
 }
 function prepareReadData(data){
  const cards=cardsFrom(data),sameFields=['codeRect','tableRect','header','rawTable','products','work','workItems','choices'];
  for(const alias of cards){
   if(alias.manualLink!==true||alias.sourceCardId||alias.originalCardCode)continue;
   const originals=cards.filter(source=>source.id!==alias.id&&!source.manualLink&&!source.sourceCardId&&source.page===alias.page&&sameFields.every(key=>JSON.stringify(source[key]??null)===JSON.stringify(alias[key]??null)));
   if(originals.length===1){const stored=data.cards[alias.id];stored.sourceCardId=originals[0].id;stored.originalCardCode=originals[0].originalCardCode||originals[0].code;}
  }
  for(const card of cardsFrom(data))prepareWorkCard(data.cards?.[card.id]||card);
  return data;
 }
 const isWorkHeading=t=>/^[\p{Lu}][\p{Lu}\s/–-]{1,31}$/u.test(t)&&t.split(/\s+/).length<=3;
 function workRows(text,knownLabels=[]){
  const rows=String(text||'').split('\n').map(clean).filter(t=>t&&!/^(?:[-–—|\s]+|KOMPONENT\s+PRODUKT(?:\s+.*)?|BESLAGSKOD\s*:?.*|DÖRRKORT\s*:?.*|Kontrollerad\s*:.*)$/i.test(t));
  const known=new Set(knownLabels);
  const headers=rows.map((t,i)=>i+1<rows.length&&(known.size?known.has(t)&&!known.has(rows[i+1]):isWorkHeading(t)&&!isWorkHeading(rows[i+1])));
  if(headers.filter(Boolean).length<2)return rows;
  const grouped=[];
  for(let i=0;i<rows.length;i++){
   if(!headers[i]){grouped.push(rows[i]);continue;}
   const label=rows[i],values=[];
   while(i+1<rows.length&&!headers[i+1])values.push(rows[++i]);
   grouped.push(label+' · '+values.join(' '));
  }
  return grouped;
 }
 const searchMode=()=>['text','full'].includes($('rtImageMode')?.value)?$('rtImageMode').value:'auto';
 const codeOnly=()=>!productsOnly&&$('rtReadPhase')?.value!=='full';
 const readyAreas=()=>validRect(rects.code)&&(codeOnly()||validRect(rects.table));
 const workPolicy=()=>$('rtWorkPolicy')?.value==='all'?'all':'gs';
 function selectedWork(read,knownLabels=[]){
  if(workPolicy()==='all'){const inventory=window.SmartMatchReadWork.read({words:read.words||[],text:read.text});return {...inventory,work:workRows(read.text,knownLabels),items:[],warnings:inventory.warnings,resolved:true};}
  const result=window.SmartMatchReadWork.read({words:read.words||[],text:read.text,knownLabels});

  return result;
 }
 function originalWorkCard(card){
  if(!additionsOnly||!card)return card;
  return cardsFrom(previousRead).find(source=>source.id===card.id)||card;
 }
 function finishWorkReading(card,selection,previous){
  card.products=clone(selection.products||previous?.products||[]);
  card.workReadError=selection.resolved===false;
  if(card.workReadError){
   // Keep rows recovered from complete table bands available for an explicit
   // visual review. One broken band must not throw away the good GS rows.
   card.proposedWork=clone(selection.work||[]);card.proposedWorkItems=clone(selection.items||[]);
   delete card.manualWorkReview;
   card.work=clone(previous?.work||[]);card.workItems=clone(previous?.workItems||[]);
   card.workState=previous?.workState||'pending';
   card.workPolicy=previous?.workPolicy||card.workPolicy;
   card.workWarnings=[...(card.workWarnings||[]),'Produktläsningen behöver rättas. Du kan fortsätta med klara kort; tidigare produkter och avprickningar bevaras.'];
  }else{delete card.proposedWork;delete card.proposedWorkItems;delete card.manualWorkReview;if(additionsOnly)mergeWorkAdditions(card,previous);card.workState='ready';prepareWorkCard(card,previous);}
  return card;
 }
 const scopedReviewCards=()=>Object.values(prepared).filter(card=>!productsOnly||!resumeWorkIds||resumeWorkIds.has(card.id));
 const failedWorkCount=()=>scopedReviewCards().filter(card=>!card.deferred&&(card.workReadError||card.cardReadError||card.unread)).length;
 async function nativePageWords(pg){
  if(!pageTextCache.has(pg))pageTextCache.set(pg,(async()=>{
   const vp=pg.getViewport({scale:1}),tc=window.SmartMatchReadText.joinNativeContent(await pg.getTextContent()),words=[];
   for(const item of tc.items){
    if(!item.str?.trim())continue;
    const [x,y]=[item.transform[4],item.transform[5]],h=Math.max(1,item.height||Math.hypot(item.transform[2],item.transform[3])),w=Math.max(1,item.width||1);
    const r=vp.convertToViewportRectangle([x,y-h*.25,x+w,y+h*.95]);
    words.push({text:item.str,x:Math.min(r[0],r[2]),y:Math.min(r[1],r[3]),w:Math.abs(r[2]-r[0]),h:Math.abs(r[3]-r[1]),confidence:100});
   }
   return {vp,words,content:tc};
  })());
  return await pageTextCache.get(pg);
 }
 function cardsFrom(data){
  return Object.entries(data?.cards||{}).map(([id,c])=>({...c,id:c.id||id,page:Number(c.page||(/^\d+$/.test(id)?id:0)),codeRect:c.codeRect||data.rects?.code,tableRect:c.tableRect===undefined?(data.rects?.table??null):c.tableRect}));
 }
 function deferredFrom(data){return Object.entries(data?.deferredCards||{}).map(([id,c])=>({...c,id:c.id||id,page:Number(c.page),deferred:true}));}
 function allCardPages(data){return [...new Set([...cardsFrom(data),...deferredFrom(data)].map(card=>card.page))].sort((a,b)=>a-b);}
 function getSavedCardIndex(){
  if(active?.matching?.version!==2)return null;
  const pages=new Map(allCardPages(active).map(page=>[page,[]]));
  for(const card of cardsFrom(active))pages.get(card.page).push({code:card.code,row:card.header,area:'known-layout-card-heading',profileId:'user-selected-read-test-v9',cardId:card.id});
  return [...pages].map(([page,regions])=>({page,regions}));
 }
 function cardsForPage(page){return cardsFrom(active).filter(c=>c.page===Number(page));}
 function groupMapping(data,code){return data?.groupMappings?.[norm(code)]||null;}
 function mappedCard(data,code,page){
  const mapping=groupMapping(data,code);if(!mapping)return null;
  const source=cardsFrom(data).find(card=>card.id===mapping.sourceCardId&&!card.sourceCardId);
  if(!source||page!==undefined&&source.page!==Number(page))return null;
  return {...source,code:mapping.code,originalCardCode:source.originalCardCode||source.code,sourceCardId:source.id,drawingLabel:mapping.drawingLabel,manualLink:true};
 }
 function cardFor(code,page){
  if(groupMapping(active,code))return mappedCard(active,code,page);
  const cards=cardsForPage(page).filter(c=>c.code===norm(code));return cards.length===1?cards[0]:null;
 }
 function cardDisplayRegion(code,page){
  const requested=cardFor(code,page);
  if(!requested)return null;
  if(validRect(active?.projectDisplayBounds))return clone(active.projectDisplayBounds);
  const physical=[...new Map([...cardsFrom(active),...deferredFrom(active)].filter(card=>card.page===Number(page)&&!card.sourceCardId).map(card=>[card.id,card])).values()];
  const source=requested.sourceCardId?physical.find(card=>card.id===requested.sourceCardId):requested;
  const explicit=validRect(requested.displayBounds)?requested.displayBounds:validRect(source?.displayBounds)?source.displayBounds:null;
  if(explicit)return clone(explicit);
  // A page containing one physical card is shown whole. The compact OCR area
  // remains in cardRegion and never crops what the technician sees.
  if(physical.length===1)return {x:0,y:0,w:1,h:1};
  return clone((validRect(requested.bounds)&&requested.bounds)||(validRect(source?.bounds)&&source.bounds)||null);
 }
 function setCardDisplayRegion(code,page,rect){
  if(rect!==null&&!validRect(rect))throw Error('Markera ett giltigt visningsområde.');
  const requested=cardFor(code,page);if(!requested)throw Error('Dörrkortet kunde inte hittas.');
  active.projectDisplayBounds=rect===null?{x:0,y:0,w:1,h:1}:clone(rect);
  // Explicit project setting supersedes older per-card crops, including aliases.
  for(const card of [...Object.values(active.cards||{}),...Object.values(active.deferredCards||{}),...Object.values(active.pendingWorkCards||{})])delete card.displayBounds;
  remember();
  return cardDisplayRegion(code,page);
 }
 function searchReadData(cards){const groupMappings=Object.fromEntries(Object.entries(previousRead?.groupMappings||{}).filter(([,mapping])=>cards[mapping.sourceCardId]));return {...previousRead,cards,groupMappings};}
 function drawingCodes(data){
  const renamed=new Set(data?.renamedGroupCodes||[]);
  return [...new Set([...cardsFrom(data).map(card=>card.code).filter(code=>!renamed.has(code)),...Object.keys(data?.groupMappings||{})])];
 }
 function groupSourceCodes(data,code){const mapping=groupMapping(data,code);return mapping?.sourceDrawingCodes?.length?mapping.sourceDrawingCodes:[mapping?.sourceDrawingCode||code];}
 function retainSourceAliases(cards,excluded=new Set()){
  for(const alias of cardsFrom(previousRead).filter(card=>card.sourceCardId&&cards[card.sourceCardId]&&!excluded.has(card.id))){
   if(Object.values(cards).some(card=>card.id!==alias.id&&card.code===alias.code))throw Error('En sparad ritningsbeteckning används redan av ett annat kort. Kontrollera kopplingen innan du sparar.');
   if(!cards[alias.id])cards[alias.id]=clone(alias);
  }
  return syncAliasCards(cards);
 }
 function syncAliasCards(cards){
  for(const alias of Object.values(cards)){
   if(!alias.sourceCardId)continue;
   const source=cards[alias.sourceCardId];if(!source)continue;
   for(const key of ['codeRect','tableRect','bounds','displayBounds','rawTable','tableWords','products','work','workItems','workWarnings','workPolicy','workState','workReadError','proposedWork','proposedWorkItems','manualWorkReview','method','confidence'])if(source[key]!==undefined)alias[key]=clone(source[key]);
   for(const key of ['workReadError','proposedWork','proposedWorkItems','manualWorkReview','cardReadError','readErrorKind','unread'])if(source[key]===undefined)delete alias[key];
   alias.originalCardCode=source.originalCardCode||source.code;
  }
  return cards;
 }
 function sourceCards(){
  const byId=new Map();
  for(const card of [...cardsFrom(previousRead),...deferredFrom(previousRead),...(discovery?.cards||[]),...Object.values(prepared)])if(!card.sourceCardId)byId.set(card.id,card);
  return [...byId.values()];
 }
 function localCards(){return sourceCards().filter(card=>card.page===example);}
 function localCard(){
  const cards=localCards();
  return areaCardId?cards.find(card=>card.id===areaCardId)||null:cards.length===1?cards[0]:null;
 }
 function areaOverride(card){return {...(pageOverrides[card.page]||{}),...(card.sourceCardId?cardOverrides[card.sourceCardId]||{}:{}),...(cardOverrides[card.id]||{})};}
 function cardBounds(code,table){
  if(!validRect(table))return {x:0,y:0,w:1,h:1};
  const x=Math.max(0,Math.min(code.x,table.x)-.005),y=Math.max(0,Math.min(code.y,table.y)-.005),right=Math.min(1,Math.max(code.x+code.w,table.x+table.w)+.005),bottom=Math.min(1,Math.max(code.y+code.h,table.y+table.h)+.005);
  return {x,y,w:right-x,h:bottom-y};
 }
 function neighboringCard(card,rect){
  if(!validRect(rect))return null;
  return sourceCards().find(other=>{
   if(other.page!==card.page||other.id===card.id||!validRect(other.bounds))return false;
   const b=other.bounds,width=Math.max(0,Math.min(rect.x+rect.w,b.x+b.w)-Math.max(rect.x,b.x)),height=Math.max(0,Math.min(rect.y+rect.h,b.y+b.h)-Math.max(rect.y,b.y));
   return width*height>rect.w*rect.h*.15;
  });
 }
 function effectiveRegion(card,product=false){
  const own=areaOverride(card),codeRect=own.code||card.codeRect||rects.code;
  let tableRect=own.table||card.tableRect||rects.table;
  if(product&&!own.table){
   const dx=codeRect.x-rects.code.x,dy=codeRect.y-rects.code.y;
   tableRect=rects.table?{...rects.table,x:rects.table.x+dx,y:rects.table.y+dy}:null;
  }
  if(!validRect(codeRect)||(!codeOnly()&&!validRect(tableRect)))throw Error('Kontrollera läsområdet på sida '+card.page+'.');
  if(product&&sourceCards().filter(other=>other.page===card.page).length>1&&card.bounds){
   const b=card.bounds;
   if(own.table){if(neighboringCard(card,tableRect))throw Error('Arbetslistan hamnar utanför kort '+card.code+' och över ett annat känt kort. Kontrollera markeringen.');}
   else if(tableRect.x<b.x-.002||tableRect.y<b.y-.002||tableRect.x+tableRect.w>b.x+b.w+.002||tableRect.y+tableRect.h>b.y+b.h+.002)throw Error('Arbetslistan hamnar utanför kort '+card.code+'. Justera läsområdet för just detta kort.');
  }
  return {...card,codeRect:clone(codeRect),tableRect:validRect(tableRect)?clone(tableRect):null,bounds:cardBounds(codeRect,tableRect)};
 }
 function selectedRegions(){
  if(deferredResume)return Object.values(prepared).filter(card=>resumeCardIds.has(card.id)&&!card.deferred).map(card=>effectiveRegion(card));
  const previousCards=cardsFrom(previousRead),pendingCards=previousCards.filter(card=>card.workState==='pending');
  if(productsOnly){
   const selected=resumeWorkIds?previousCards.filter(card=>resumeWorkIds.has(card.id)):pendingCards.length?pendingCards:previousCards,needed=new Map();
   for(const card of selected){const source=card.sourceCardId?previousCards.find(item=>item.id===card.sourceCardId):card;if(source)needed.set(source.id,source);}
   return [...needed.values()].map(card=>effectiveRegion(card,true));
  }
  const pages=parsePages($('rtPages').value,doc.numPages);
  if(discovery?.cards)return discovery.cards.filter(c=>c.selected!==false&&pages.includes(c.page)).map(card=>effectiveRegion(card));
  return pages.flatMap(page=>{
   const known=sourceCards().filter(card=>card.page===page);
   if(known.length>1)return known.map(card=>effectiveRegion(card));
   const source=known[0]||{id:'p'+page+':manual',page};
   return [effectiveRegion({...source,codeRect:clone(rects.code),tableRect:rects.table?clone(rects.table):null})];
  });
 }
 function displayedRects(){
  if(areaScope==='common')return rects;
  const card=localCard();
  if(card){const own=areaOverride(card);return {code:own.code||card.codeRect||rects.code,table:own.table||card.tableRect||rects.table};}
  return {...rects,...(pageOverrides[example]||{})};
 }
 function localKey(){return areaScope==='card'?'card:'+areaCardId:'page:'+example;}
 function validOverrides(value,byCard=false,cards=[],pageCount=doc?.numPages||Infinity){
  if(value===undefined)return true;
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  return Object.entries(value).every(([key,areas])=>(byCard?cards.some(card=>card.id===key):/^\d+$/.test(key)&&Number(key)>=1&&Number(key)<=pageCount)&&areas&&typeof areas==='object'&&!Array.isArray(areas)&&Object.keys(areas).length>0&&Object.entries(areas).every(([kind,rect])=>['code','table'].includes(kind)&&validRect(rect)));
 }
 function refreshAreaControls(){
  if(!ui)return;
  if(singleCardReread){areaScope='card';areaCardId=singleCardTargetId;example=singleCardTargetPage||example;}
  const cards=localCards(),selected=localCard();
  if(areaScope==='page'&&cards.length>1){areaScope='card';areaCardId='';}
  $('rtAreaScope').value=areaScope;
  const chooser=$('rtAreaCard'),prior=areaCardId;
  chooser.replaceChildren(new Option('Välj kort på sidan',''),...cards.map((card,index)=>new Option('Kort '+(index+1)+' · '+(card.originalCardCode||card.code||'Beteckning behöver läsas'),card.id)));
  if(cards.some(card=>card.id===prior))chooser.value=prior;
  chooser.parentElement.hidden=areaScope!=='card';
  $('rtAreaScopeInfo').textContent=areaScope==='common'?'Gemensam mall: markeringen används på övriga kort. Sidundantag behålls.':areaScope==='card'&&!selected?'Sidan innehåller flera kort. Välj exakt vilket kort som ska ändras.':'Endast '+(areaScope==='card'?'valt kort på ':'')+'sida '+example+' ändras. Övriga kort och sparade kopplingar behålls.';
  $('rtLocalRead').hidden=areaScope==='common';$('rtAreaCommon').hidden=areaScope==='common'||singleCardReread;
  $('rtLocalRead').disabled=busy||areaScope==='common'||areaScope==='card'&&!selected||!localDirty.has(localKey());
  $('rtAreaScope').disabled=busy||singleCardReread;$('rtAreaCard').disabled=busy||singleCardReread;$('rtAreaCommon').disabled=busy||singleCardReread;
  if(singleCardReread)for(const id of ['rtPage','rtPrev','rtNext','rtPages','rtTemplate','rtSaveTemplate'])$(id).disabled=true;
 }
 async function adjustArea(cardId,page){
  if(busy)return;
  if(singleCardReread&&(cardId!==singleCardTargetId||page!==singleCardTargetPage)){status('Omläsningen är låst till det öppna dörrkortet. Inget annat kort ändrades.');return;}
  const cards=sourceCards().filter(card=>card.page===page),card=cards.find(card=>card.id===cardId);
  example=page;view='card';areaScope=singleCardReread?'card':cards.length>1?'card':'page';areaCardId=card?.id||'';zoom=1;
  $('rtPage').value=String(page);setMode(productsOnly?'table':'code',false);refreshAreaControls();coordinates();await render();
  $('rtAreaScopeInfo').scrollIntoView({block:'center',behavior:'instant'});
  status('Markera rätt '+(productsOnly?'arbetslista':'kodfält')+' på sida '+page+'. Tryck sedan Läs bara detta kort.');
 }
 function storeArea(kind,rect){
  if(singleCardReread){
   if(kind!=='table'||example!==singleCardTargetPage){status('Omläsningen är låst till arbetslistan på det öppna dörrkortet.');return;}
   areaScope='card';areaCardId=singleCardTargetId;
  }
  if(areaScope==='common'){
   rects[kind]=rect;resetDiscovery();invalidate();return;
  }
  const card=localCard();
  if(areaScope==='card'&&!card){status('Välj vilket kort på sidan som ska ändras först.');return;}
  if(card&&neighboringCard(card,rect)){status('Markeringen överlappar ett annat känt kort på sidan. Välj rätt kort och kontrollera området.');return;}
  const target=areaScope==='card'?cardOverrides:pageOverrides,key=areaScope==='card'?areaCardId:example;
  target[key]={...(target[key]||{}),[kind]:clone(rect)};localDirty.add(localKey());
  $('rtStart').disabled=true;refreshAreaControls();status('Nytt läsområde för '+(areaScope==='card'?'detta kort på ':'')+'sida '+example+'. Tryck Läs bara detta kort för att kontrollera ändringen.');
 }
 function adjustmentButton(card,page){
  const button=document.createElement('button');button.type='button';button.textContent='Justera läsområdet';
  if(card){button.dataset.adjustCard=card.id;button.setAttribute('aria-label','Justera läsområdet kort '+card.id+' sida '+page);}else{button.dataset.adjustPage=page;button.setAttribute('aria-label','Justera läsområdet sida '+page);}
  button.onclick=()=>void adjustArea(card?.id,page);return button;
 }
 function validRect(r){return r&&[r.x,r.y,r.w,r.h].every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.w>.001&&r.h>.001&&r.x+r.w<=1.001&&r.y+r.h<=1.001;}
 function validManualWork(card){
  const review=card.manualWorkReview;
  if(review!==undefined&&(!review||review.version!==1||review.accepted!==true||typeof review.acceptedAt!=='string'||!review.acceptedAt||!Array.isArray(review.acknowledgedWarnings)||!review.acknowledgedWarnings.every(message=>typeof message==='string')||card.workReadError===true||card.workState!=='ready'))return false;
  if(card.proposedWork!==undefined&&(!Array.isArray(card.proposedWork)||!card.proposedWork.every(row=>typeof row==='string')))return false;
  if(card.proposedWorkItems!==undefined&&!Array.isArray(card.proposedWorkItems))return false;
  return true;
 }
 function validMatchBox(r){return r&&[r.x,r.y,r.w,r.h].every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=1.001&&r.y+r.h<=1.001;}
 function validPdfRect(rect){return Array.isArray(rect)&&rect.length===4&&rect.every(Number.isFinite)&&rect[2]>rect[0]&&rect[3]>rect[1];}
 function validGroupMappings(data,cards,pageCount=Infinity){
  if(data.groupMappings!==undefined&&(!data.groupMappings||typeof data.groupMappings!=='object'||Array.isArray(data.groupMappings)))return false;
  if(!Object.entries(data.groupMappings||{}).every(([code,mapping])=>mapping&&mapping.code===code&&norm(code)===code&&!!code&&typeof mapping.drawingLabel==='string'&&(mapping.sourceDrawingCode===undefined||typeof mapping.sourceDrawingCode==='string'&&!!mapping.sourceDrawingCode&&norm(mapping.sourceDrawingCode)===mapping.sourceDrawingCode)&&(mapping.sourceDrawingCodes===undefined||Array.isArray(mapping.sourceDrawingCodes)&&mapping.sourceDrawingCodes.length>0&&mapping.sourceDrawingCodes.every(source=>typeof source==='string'&&!!source&&norm(source)===source))&&(mapping.sourceScopes===undefined||mapping.sourceScopes&&typeof mapping.sourceScopes==='object'&&!Array.isArray(mapping.sourceScopes)&&Object.entries(mapping.sourceScopes).every(([source,scope])=>groupSourceCodes(data,code).includes(source)&&(scope===null||validRemovedPositions({removedReadPositions:scope},pageCount))))&&cards.some(card=>!card.sourceCardId&&card.id===mapping.sourceCardId&&card.page===mapping.cardPage&&norm(card.originalCardCode||card.code)===norm(mapping.originalCardCode))))return false;
  return data.renamedGroupCodes===undefined||Array.isArray(data.renamedGroupCodes)&&data.renamedGroupCodes.every(code=>typeof code==='string'&&!!code&&norm(code)===code);
 }
 function validRemovedPositions(data,pageCount=Infinity){return data.removedReadPositions===undefined||Array.isArray(data.removedReadPositions)&&data.removedReadPositions.every(hit=>hit&&typeof hit.id==='string'&&!!hit.id&&Number.isInteger(hit.page)&&hit.page>0&&hit.page<=pageCount&&typeof hit.code==='string'&&norm(hit.code)===hit.code&&validPdfRect(hit.rect));}
 function validDrawingSample(sample,pageCount=Infinity){
  if(sample===undefined||sample===null)return true;
  if(!Number.isInteger(sample.page)||sample.page<1||sample.page>pageCount||!validRect(sample.rect))return false;
  const a=sample.appearance;if(a===undefined)return true;
  if(a?.version!==1||typeof a.enabled!=='boolean')return false;
  if(!a.enabled)return true;
  return a.profile?.kind==='background'&&[a.profile.hue,a.profile.fill,a.profile.aspect].every(Number.isFinite)&&a.profile.aspect>0&&Array.isArray(a.profile.occupancy)&&a.profile.occupancy.length===16&&a.profile.occupancy.every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&[a.referenceSize?.width,a.referenceSize?.height,a.relativeText?.w,a.relativeText?.h].every(n=>Number.isFinite(n)&&n>0)&&[a.relativeText.x,a.relativeText.y].every(Number.isFinite)&&validRect(a.sampleRect);
 }
 function validData(data){
  const cards=cardsFrom(data),deferred=deferredFrom(data),all=[...cards,...deferred];
  const deferredValid=data?.deferredCards===undefined||data.deferredCards&&typeof data.deferredCards==='object'&&!Array.isArray(data.deferredCards)&&deferred.every(card=>typeof card.id==='string'&&!!card.id&&Number.isInteger(card.page)&&card.page>0&&typeof card.code==='string'&&(!card.code||norm(card.code)===card.code)&&validRect(card.codeRect)&&Array.isArray(card.work)&&card.work.every(row=>typeof row==='string')&&(card.tableRect==null||validRect(card.tableRect))&&(!card.bounds||validRect(card.bounds))&&(card.displayBounds==null||validRect(card.displayBounds))&&validManualWork(card)&&Array.isArray(card.deferredReasons)&&card.deferredReasons.every(reason=>typeof reason==='string'));
  const pendingValid=data?.pendingWorkCards===undefined||data.pendingWorkCards&&typeof data.pendingWorkCards==='object'&&!Array.isArray(data.pendingWorkCards)&&Object.entries(data.pendingWorkCards).every(([id,card])=>card&&card.id===id&&all.some(source=>source.id===id&&source.page===card.page&&source.code===card.code)&&validRect(card.codeRect)&&validRect(card.tableRect)&&(card.displayBounds==null||validRect(card.displayBounds))&&validManualWork(card)&&Array.isArray(card.work)&&card.work.every(row=>typeof row==='string')&&Array.isArray(card.deferredReasons)&&card.deferredReasons.every(reason=>typeof reason==='string'));
  const partial=deferred.length>0||Object.keys(data?.pendingWorkCards||{}).length>0||Object.keys(data?.deferredGroupMappings||{}).length>0;
  const groupsValid=data?.deferredGroupMappings===undefined||data.deferredGroupMappings&&typeof data.deferredGroupMappings==='object'&&!Array.isArray(data.deferredGroupMappings)&&Object.keys(data.deferredGroupMappings).every(code=>!data.groupMappings?.[code])&&validGroupMappings({...data,groupMappings:data.deferredGroupMappings},all);
  return deferredValid&&pendingValid&&groupsValid&&(!partial||data.schema===2)&&validOverrides(data?.pageOverrides,false,all)&&validOverrides(data?.cardOverrides,true,all)&&(data?.schema===1||data?.schema===2)&&validGroupMappings(data,cards)&&validRemovedPositions(data)&&validRect(data.rects?.code)&&(data.phase==='codes'||validRect(data.rects?.table))&&Array.isArray(data.pages)&&data.pages.length>0&&all.length>0&&data.pages.every(p=>Number.isInteger(p)&&p>0&&all.some(c=>c.page===p))&&all.every(c=>data.pages.includes(c.page))&&cards.every(c=>norm(c.code)===c.code&&!!c.code&&Array.isArray(c.work)&&validRect(c.codeRect)&&(c.workState==='pending'&&data.phase==='codes'&&c.work.length===0||validRect(c.tableRect))&&(!c.bounds||validRect(c.bounds))&&(c.displayBounds==null||validRect(c.displayBounds))&&validManualWork(c))&&
   (!data.matching||data.matching.version===2&&Array.isArray(data.matching.hits)&&data.matching.hits.every(h=>Number.isInteger(h.page)&&h.page>0&&!data.pages.includes(h.page)&&(cards.some(c=>c.code===h.code)||!!groupMapping(data,h.code))&&validPdfRect(h.rect)&&validMatchBox(h.box)&&(h.positionId===undefined||typeof h.positionId==='string'&&!!h.positionId)));
 }
 function validDocumentData(data,pageCount){
  try{
  if(!validData(data))return false;
  const cards=cardsFrom(data),deferred=deferredFrom(data),all=[...cards,...deferred],codes=cards.map(c=>c.code);
  const within=p=>Number.isInteger(p)&&p>=1&&p<=pageCount;
  return validOverrides(data.pageOverrides,false,all,pageCount)&&validOverrides(data.cardOverrides,true,all,pageCount)&&validGroupMappings(data,cards,pageCount)&&validRemovedPositions(data,pageCount)&&validDrawingSample(data.drawingSample,pageCount)&&validGroupMappings({...data,groupMappings:data.deferredGroupMappings||{}},all,pageCount)&&data.pages.every(within)&&new Set(data.pages).size===data.pages.length&&new Set(codes).size===codes.length&&
   new Set(all.map(c=>c.id)).size===all.length&&deferred.every(card=>within(card.page))&&cards.every(card=>!card.sourceCardId||typeof card.sourceCardId==='string'&&cards.some(source=>source.id===card.sourceCardId&&!source.sourceCardId&&source.page===card.page&&norm(source.originalCardCode||source.code)===norm(card.originalCardCode)))&&cards.every(c=>typeof c.id==='string'&&!!c.id&&within(c.page)&&c.work.every(row=>typeof row==='string'))&&
   (!data.matching||data.matching.hits.every(h=>within(h.page)&&(h.selected===undefined||typeof h.selected==='boolean'))&&new Set(data.matching.hits.map(hit=>hit.positionId).filter(Boolean)).size===data.matching.hits.filter(hit=>hit.positionId).length)&&
   (data.checks===undefined||data.checks&&typeof data.checks==='object'&&!Array.isArray(data.checks)&&Object.values(data.checks).every(rows=>rows&&typeof rows==='object'&&!Array.isArray(rows)&&Object.values(rows).every(value=>typeof value==='boolean')));
  }catch(_){return false;}
 }
 function reviewedData(data,pageCount){
  if(!validDocumentData(data,pageCount)||data.matching?.version!==2)return false;
  // TEST 3–5 only wrote matching data after the user approved the review.
  // New files carry an explicit approval; an invalid marker is never legacy.
  if(Object.prototype.hasOwnProperty.call(data.matching,'review'))return data.matching.review?.version===1&&data.matching.review.approved===true;
  return true;
 }
 async function geometryFits(pdf,data){
  if(!data?.matching)return true;
  const viewports=new Map();
  for(const hit of data.matching.hits){
   if(!viewports.has(hit.page))viewports.set(hit.page,(await pdf.getPage(hit.page)).getViewport({scale:1}));
   const vp=viewports.get(hit.page),b=hit.box,p=vp.convertToPdfPoint(b.x*vp.width,b.y*vp.height),q=vp.convertToPdfPoint((b.x+b.w)*vp.width,(b.y+b.h)*vp.height);
   const expected=[Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.max(p[0],q[0]),Math.max(p[1],q[1])];
   if(expected.some((value,index)=>Math.abs(value-hit.rect[index])>1))return false;
  }
  return true;
 }
 async function sourceHash(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function remember(){
  if(!active)return;
  try{localStorage.setItem('tillsyno-read-test-v9-29-source:'+active.sourceId,JSON.stringify(active));}
  catch(_){window.SmartMatchAppBridge?.setStatus('Lokal lagring är full. Spara projekt-PDF för att bevara läsmallen och arbetet.');}
 }
 async function sourceMetadata(bytes){
  let p;
  try{p=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});}
  catch(_){return {data:null,hasReadData:false,annotations:[],inspectionError:true,warning:''};}
  const metadata=window.SmartMatchReadProjectV97.read(p,PDFLib),payload=metadata.payload;
  const data=payload?.readTestData||null,hasReadData=!!payload&&Object.prototype.hasOwnProperty.call(payload,'readTestData');
  let annotations=[],warning='';
  // Direct working-mode opening needs saved project data only. A stamp index
  // is built later, solely when the user explicitly enters the preparation guide.
  return {data,hasReadData,annotations,warning,inspectionError:metadata.present&&!payload,pdfDocument:p,metadata};
 }
 function validRootPayload(parsed){
  return !parsed||typeof parsed==='object'&&!Array.isArray(parsed)&&
   (parsed.automationItems===undefined||Array.isArray(parsed.automationItems))&&
   (parsed.instances===undefined||parsed.instances&&typeof parsed.instances==='object'&&!Array.isArray(parsed.instances));
 }
 async function discardPreparedOpen(file){
  if(!preparedOpen||file&&preparedOpen.file!==file)return false;
  const previous=preparedOpen;preparedOpen=null;await previous.dispose();return true;
 }
 function takePreparedOpen(file){
  if(!preparedOpen||preparedOpen.file!==file)return null;
  const result=preparedOpen;preparedOpen=null;return result;
 }
 function retainPreparedOpen(file,bytes,metadata,pdf,displayBytes,displayPrepared,previousActive,adoptedActive,externalPrepared){
  let ownedPdf=pdf,committed=false,disposed=false;
  preparedOpen={file,bytes,pdfDocument:metadata.pdfDocument,metadata:metadata.metadata,displayBytes,displayPrepared,externalPrepared,
   takePdf(){if(disposed)return null;const result=ownedPdf;ownedPdf=null;return result;},
   commit(){committed=true;},
   async dispose(){
    if(disposed)return;disposed=true;
    if(!committed&&active===adoptedActive){active=previousActive;}
    const previous=ownedPdf;ownedPdf=null;if(previous)try{await previous.destroy();}catch(_){}
    this.bytes=null;this.pdfDocument=null;this.metadata=null;this.displayBytes=null;
   }};
 }
 function status(text){$('rtStatus').textContent=text;guide();}
 function showReadProgress(value){
  const box=$('rtReadProgress');if(!box)return;
  box.hidden=value.state==='idle';box.dataset.state=value.state;box.setAttribute('aria-busy',String(value.active));
  $('rtReadProgressTitle').textContent=value.active?value.title:value.state==='error'?'Avläsningen stoppades av ett fel':value.state==='cancelled'?'Avläsningen avbröts':'Det här arbetssteget är klart';
  const unit={page:'sidor',area:'bildområden',card:'kort'}[value.unit]||value.unit;
  const where=value.page?' · PDF-sida '+value.page+(value.pageCount?' ('+value.pageIndex+' av '+value.pageCount+(value.unit==='card'?' kort':' valda sidor')+')':''):'';
  const count=value.total!==null&&value.done!==null?' · '+value.done+' av '+value.total+' '+unit+' klara':'';
  $('rtReadProgressDetail').textContent=value.message||[value.label||'Förbereder avläsningen',where,count].join('');
  $('rtReadProgressLocal').textContent=value.active&&value.localPercent!==null?'Bildläsning av aktuellt område: '+Math.round(value.localPercent)+' %':'';
  const meter=$('rtReadProgressMeter');
  if(value.percent===null)meter.removeAttribute('value');else meter.value=value.percent;
  $('rtReadProgressPercent').textContent=value.percent===null?'Mängden arbete i detta steg beräknas…':Math.floor(value.percent)+' % av detta steg';
  const duration=window.SmartMatchReadProgressV91.formatDuration;
  const estimate=value.active?(value.remainingMs===null?' · återstående tid beräknas efter fler färdiga områden eller sidor':' · ungefär '+duration(value.remainingMs)+' kvar i detta steg'):'';
  $('rtReadProgressTime').textContent='Förfluten tid: '+duration(value.elapsedMs)+estimate;
  $('rtReadProgressCancel').hidden=!value.active;
 }
 function beginReadProgress(title){
  if(!readingProgress)readingProgress=window.SmartMatchReadProgressV91.create({onUpdate:showReadProgress});
  readVersion=cancelVersion;readContext={};readingProgress.start(title);
  $('rtReadProgress').scrollIntoView({block:'nearest'});
 }
 function readDetail(info){
  if(!readingProgress?.snapshot().active||readVersion!==cancelVersion)return;
  readContext={...info};readingProgress.update({...info,detail:'',localPercent:null});
 }
 function endReadProgress(state='done',message=''){
  readingProgress?.finish({state,message});
 }
 function guide(){
  if(!ui)return;
  const step=productsOnly?(productsRead?3:validRect(rects.table)?2:1):matchRun?4:confirmed||discovery?3:readyAreas()?2:1;
  $('rtGuide').classList.toggle('rtProductsGuide',productsOnly);ui.dataset.productsOnly=String(productsOnly);
  const labels=productsOnly?['Kontrollera läsområdet','Läs produkterna','Granska och spara']:['Markera kod och tabell','Hitta dörrkorten',codeOnly()?'Matcha koder':'Läs och matcha','Granska och öppna'];
  for(const item of ui.querySelectorAll('#rtGuide li')){
   const n=Number(item.dataset.step);item.hidden=productsOnly&&n>3;item.classList.toggle('rtCurrent',n===step);item.classList.toggle('rtDone',n<step);
   item.lastChild.textContent=' '+labels[n-1];
   if(n===step)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');
  }
  $('rtNextHint').textContent=productsOnly?(failedWorkCount()?'Produktläsningen behöver rättas på '+failedWorkCount()+' kort. Rätta läsområdet eller kontrollera de föreslagna raderna. Tidigare arbetslistor och kopplingar finns kvar.':productsRead?'Granska arbetsraderna. Tryck Spara produkter för att lägga till dem i det befintliga projektet.':'Markera hela produkttabellen: rubrikerna Övrigt/Produkt och Levereras av/Lev av, Monteras av/Mont av samt samtliga produktrader. Tryck sedan Läs produkterna.'):
   matchRun?'4. Kontrollera träffarna med Visa. Avmarkera fel, kryssa i granskningen och öppna projektet.':confirmed?'3. Kontrollera beteckningarna. Ändra det som blev fel och tryck Sök på ritningen igen.':discovery?'3. Granska kortlistan. Tryck sedan '+(codeOnly()?'Matcha koder mot ritningen.':'Läs korten och sök på ritningen.'):
   readyAreas()?'2. Exemplet är markerat. Tryck Hitta övriga dörrkort.':validRect(rects.code)?'1. Markera hela produkttabellen med Övrigt/Produkt, Levereras av/Lev av, Monteras av/Mont av och samtliga produktrader.':'1. Välj ett dörrkort. Tryck Markera kod och dra tätt runt hela beteckningen, till exempel Beslagskod GS23 eller DBL-DS.';
  $('rtDiscover').disabled=busy||!readyAreas();
  $('rtPreview').disabled=busy||!readyAreas();
  $('rtPreview').textContent=productsOnly?(productsRead?'Läs produkterna igen':'2. Läs produkterna'):codeOnly()?'3. Matcha koder mot ritningen':'3. Läs korten och sök på ritningen';
  $('rtStart').textContent=productsOnly?'3. Spara produkter':codeOnly()?'4. Öppna kopplat projekt':'4. Öppna arbetsprojekt';
  $('rtTable').hidden=codeOnly();$('rtWorkSettings').hidden=codeOnly();
  $('rtCode').hidden=productsOnly;$('rtStamp').hidden=productsOnly;
  $('rtDiscover').hidden=productsOnly;$('rtFind').hidden=productsOnly;
  $('rtMatchReview').hidden=productsOnly;$('rtReadPhaseLabel').hidden=productsOnly;
  $('rtSetupDetails').hidden=productsOnly;
  $('rtIntro').textContent=productsOnly?'Läs hela produkttabellen från de redan kopplade korten. Ta med Övrigt/Produkt, Levereras av/Lev av, Monteras av/Mont av och samtliga produktrader. GS i Levereras av/Lev av eller Monteras av/Mont av ger kontrollpunkter. Övriga produkter sparas i produktlistan.':codeOnly()?'Markera bara beslagskoden. Appen läser samma fält på kort med samma sidlayout och matchar hela beteckningen mot ritningens stämplar och text. Arbetslistor läser du senare med Fortsätt med produkter. Vid flera kort på samma sida använder du det tidigare fullständiga flödet.':'Markera koden och hela produkttabellen på ett exempelkort. Ta med samtliga produktrader och kolumnrubriker. Granska sedan kopplingar och arbetsrader.';
  refreshAreaControls();
  if(localDirty.size){const pages=[...new Set([...localDirty].map(key=>key.startsWith('page:')?Number(key.slice(5)):sourceCards().find(card=>card.id===key.slice(5))?.page).filter(Boolean))];$('rtNextHint').textContent='Ändrade läsområden på sida '+pages.join(', ')+' behöver kontrolleras. Visa sidan och tryck Läs bara detta kort innan du sparar.';}
  $('rtSearchHelp').textContent=codeOnly()?'Snabb sökning läser bara kodfältet på korten. På ritningen används sparade PDF-stämplar och PDF-text. Saknade beteckningar lämnas omatchade. Välj Sök även i bilder om du vill starta den långsammare bildsökningen.':productsOnly?'Hela den markerade produkttabellen läses på de befintliga korten. Ingen ny kod- eller ritningssökning görs.':'Kod och markerat produktområde läses inom markeringarna. Snabb sökning börjar med PDF-text och sparade stämplar, med bildläsning som reserv.';
 }
 function invalidateMatches(){
  if(productsOnly)return;
  pendingMatchCodes.clear();
  if(matchRun)lastValidMatch=clone(matchRun);searchError='';matchRun=null;focusedHit=null;$('rtMatchApproval').checked=false;$('rtDrawingResults').replaceChildren();$('rtGoMatches').hidden=true;$('rtStart').disabled=true;
  for(const el of document.querySelectorAll('.rtMatchHint'))el.textContent='Sök stämplar för att kontrollera kopplingen till ritningen.';guide();
 }
 function changedDrawingCode(card,code){
  const before=card.code;if(before===code)return;
  card.code=code;
  if(code){delete card.unread;if(card.readErrorKind==='code'){delete card.cardReadError;delete card.readErrorKind;}}
  if(matchRun){
   if(!Object.values(prepared).some(other=>other!==card&&other.code===before))matchRun.hits=matchRun.hits.filter(hit=>hit.code!==before);
   pendingMatchCodes.delete(before);if(code)pendingMatchCodes.add(code);
   $('rtMatchApproval').checked=false;renderMatches();
  }else invalidateMatches();
  if(drawingSample?.code===before)drawingSample.code=code;
  card.deferredReasons=getCardIssues(card);populateStampCodes();validatePrepared();
 }
 function invalidate(){
  if(productsOnly){productsRead=false;confirmed=false;$('rtResults').replaceChildren();status('Markera hela produkttabellen och tryck Läs produkterna. Kopplingarna finns kvar.');validatePrepared();return;}
  prepared={};confirmed=false;invalidateMatches();$('rtResults').replaceChildren();populateStampCodes();status(codeOnly()?'Markera kodområdet. Tryck sedan Hitta övriga dörrkort.':'Markera kodområdet och hela produkttabellen. Följ sedan nästa steg i guiden.');
 }
 function resetDiscovery(){discovery=null;$('rtDiscoveryResults').replaceChildren();}
 function lock(on){
  if(on)resetViewportInput(true);busy=on;
  for(const id of ['rtDiscover','rtPreview','rtPage','rtPrev','rtNext','rtPages','rtTemplate','rtZoomIn','rtZoomOut','rtCode','rtTable','rtMove','rtStamp','rtStampCode','rtFind','rtSampleClear','rtMatchApproval','rtNormal','rtImageMode','rtWorkPolicy','rtReadPhase'])$(id).disabled=on;
  for(const el of ui.querySelectorAll('#rtResults input,#rtResults textarea,#rtResults button,#rtDrawingResults input,#rtDrawingResults button,#rtDiscoveryResults input,#rtDiscoveryResults button'))el.disabled=on;
  $('rtStart').disabled=on||!confirmed;
  if(!on){if(productsOnly)for(const el of ui.querySelectorAll('#rtResults input:not(.rtManualWorkAck)'))el.disabled=true;for(const review of ui.querySelectorAll('.rtManualWorkReview')){const check=review.querySelector('.rtManualWorkAck'),accept=review.querySelector('.rtAcceptManualWork');if(check)check.disabled=false;if(accept)accept.disabled=!check?.checked;}$('rtFind').disabled=!confirmed;$('rtStamp').disabled=!confirmed;$('rtMatchApproval').disabled=!matchRun;validatePrepared();refreshAreaControls();if(zoomDirty)queueZoomRender();}guide();
 }
 function makeUI(){
  if(ui)return;
  ui=document.createElement('dialog');ui.id='rtDialog';ui.className='rtDialog';ui.setAttribute('aria-labelledby','rtTitle');
  ui.innerHTML=`<header class="rtHead"><div><small>SmartMatch · Avläsning TEST 9.48</small><h2 id="rtTitle">Läs dörrkort och matcha stämplar</h2></div><button id="rtCancel" type="button">Avbryt</button></header>
   <ol id="rtGuide" class="rtGuide" aria-label="Så går du vidare"><li data-step="1"><b>1</b> Visa ett exempel</li><li data-step="2"><b>2</b> Hitta dörrkorten</li><li data-step="3"><b>3</b> Läs och sök</li><li data-step="4"><b>4</b> Granska och starta</li></ol>
   <label id="rtReadPhaseLabel" class="rtPhaseChoice">Vad vill du läsa?<select id="rtReadPhase"><option value="full">Avläs koder och produkter – en genomgång</option><option value="codes">Endast koder – produkter återstår</option></select></label><p id="rtNextHint" class="rtNextHint"></p>
   <p id="rtIntro" class="rtIntro">Markera ett enda dörrkort som exempel – även om sidan innehåller flera kort. Appen läser varje korts egen beteckning och söker hela beteckningen på ritningen. Spara sedan med Spara PDF. Kopplingar och arbetsstatus följer med i projekt-PDF:en, som kan öppnas direkt nästa gång.</p>
   <section id="rtReadProgress" class="rtReadProgress" aria-labelledby="rtReadProgressTitle" hidden>
    <div class="rtReadProgressHead"><strong id="rtReadProgressTitle"></strong><button id="rtReadProgressCancel" type="button">Avbryt avläsningen</button></div>
    <p id="rtReadProgressDetail" role="status" aria-live="polite"></p>
    <progress id="rtReadProgressMeter" max="100" aria-label="Framsteg i aktuellt steg"></progress>
    <p id="rtReadProgressPercent"></p><p id="rtReadProgressLocal"></p><p id="rtReadProgressTime" aria-live="off"></p>
    <small>Procent och återstående tid gäller steget som visas. Bildläsning tar längre tid än PDF-text. Uppskattningen kan ändras.</small>
   </section>
   <details id="rtSetupDetails" class="rtSetupDetails"><summary>Sparad läsmall eller välj kortsidor själv</summary><div class="rtSetup"><label>Sparad läsmall<select id="rtTemplate"><option value="">Ny markering</option></select></label><label>Dörrkortssidor<input id="rtPages" placeholder="Exempel: 2, 4-8" inputmode="text"></label><button id="rtNormal" type="button">Använd tidigare läsning</button></div></details>
   <div class="rtLayout"><section class="rtDocument" aria-label="Markera dörrkort eller ritning"><div class="rtControls"><button id="rtPrev" type="button" aria-label="Föregående sida">‹</button><label><span id="rtPageLabel">Dörrkortssida</span><input id="rtPage" type="number" min="1" value="1"></label><span id="rtPageCount"></span><button id="rtNext" type="button" aria-label="Nästa sida">›</button><button id="rtZoomOut" type="button" aria-label="Zooma ut">−</button><output id="rtZoomLevel" aria-label="Zoomnivå" aria-live="off">100 %</output><button id="rtZoomIn" type="button" aria-label="Zooma in">+</button></div>
   <section class="rtAreaSettings" aria-label="Läsområde för en sida eller ett kort"><label>Markering gäller<select id="rtAreaScope"><option value="common">Gemensam mall</option><option value="page">Bara den här sidan</option><option value="card">Bara detta kort</option></select></label><label hidden>Kort på sidan<select id="rtAreaCard"></select></label><p id="rtAreaScopeInfo" role="status"></p><button id="rtLocalRead" type="button" hidden>Läs bara detta kort</button><button id="rtAreaCommon" type="button" hidden>Visa gemensam mall</button></section>
   <div class="rtModes"><button id="rtCode" type="button" aria-pressed="true">Markera kod</button><button id="rtTable" type="button" aria-pressed="false">Markera hela produkttabellen</button><button id="rtStamp" type="button" aria-pressed="false">Markera stämpel på ritning</button><button id="rtMove" type="button" aria-pressed="false">Flytta vyn</button></div>
   <div id="rtSampleControls" class="rtSampleControls" hidden><label>Koppla exempelstämpeln till<select id="rtStampCode"></select></label><button id="rtSampleClear" type="button">Rensa exempel</button><p>Välj ritningssida. Markera hela stämpeln, inklusive färgad bakgrund och kant. Appen jämför färg och form för att välja bort vanlig rumstext, exempelvis WC utan stämpel.</p></div>
   <p id="rtZoomHelp" class="rtZoomHelp">Zooma med mushjulet eller två fingrar. Dra med musen eller ett finger för att markera. Välj Flytta vyn för att panorera.</p><div id="rtViewport" class="rtViewport" aria-describedby="rtZoomHelp"><div id="rtCanvasBox" class="rtCanvasBox"><canvas id="rtCanvas"></canvas><div id="rtCodeRect" class="rtRect rtCodeRect" hidden><span>Kod</span></div><div id="rtTableRect" class="rtRect rtTableRect" hidden><span>produktområde</span></div><div id="rtStampRect" class="rtRect rtStampRect" hidden><span>Exempelstämpel</span></div><div id="rtHitRect" class="rtRect rtHitRect" hidden><span>Träff</span></div><div id="rtDraftRect" class="rtRect" hidden></div></div></div></section>
   <aside class="rtReview"><p id="rtStatus" class="rtStatus" role="status" aria-live="polite"></p><div class="rtSearchSettings"><label class="rtSearchMode" for="rtImageMode">Söksätt<select id="rtImageMode" aria-describedby="rtSearchHelp"><option value="auto">Snabb sökning – PDF-stämplar först</option><option value="text">Sök i text – snabbare, utan bildläsning</option><option value="full">Sök även i bilder – tar längre tid</option></select></label><p id="rtSearchHelp" class="rtSearchHelp">Kod och markerat produktområde läses inom dina markeringar. Snabb sökning börjar med PDF-text och ritningens sparade stämplar.</p><div id="rtWorkSettings"><label class="rtSearchMode" for="rtWorkPolicy">Arbetsrader<select id="rtWorkPolicy"><option value="gs">GS – leverans eller montage</option><option value="all">Alla markerade arbetsrader (tidigare läsning)</option></select></label><p class="rtSearchHelp">Markera hela produkttabellen med kategori, produkt, antal och Lev av / Mont av. GS i Levereras av/Lev av eller Monteras av/Mont av ger kontrollpunkter. Övriga produkter sparas i produktlistan.</p></div></div><button id="rtDiscover" class="rtPrimary" type="button" disabled>2. Hitta övriga dörrkort</button><div id="rtDiscoveryResults"></div><button id="rtPreview" class="rtPrimary" type="button">3. Läs korten och sök på ritningen</button><button id="rtGoMatches" type="button" hidden>4. Granska träffarna</button><details class="rtCoordinates"><summary>Justera markeringar med siffror</summary><div id="rtCoordinates"></div></details><div id="rtResults"></div><section id="rtMatchReview" class="rtMatchReview"><button id="rtFind" type="button" disabled>Sök på ritningen igen</button><div id="rtDrawingResults" aria-live="polite"></div><label class="rtApproval"><input id="rtMatchApproval" type="checkbox" disabled>Jag har granskat träffarna på ritningen</label></section></aside></div>
   <footer class="rtFooter"><label>Mallnamn<input id="rtName" placeholder="Exempel: Mina dörrkort" maxlength="70"></label><label class="rtSaveChoice"><input id="rtSaveTemplate" type="checkbox" checked>Spara markeringarna som läsmall på enheten</label><button id="rtStart" class="rtPrimary" type="button" disabled>4. Öppna arbetsprojekt</button></footer>`;
  document.body.append(ui);window.SmartMatchReadReviewV99?.mount(reviewApi);
  $('rtReadProgressCancel').onclick=()=>finish(false);$('rtCancel').onclick=()=>finish(false);ui.addEventListener('cancel',e=>{e.preventDefault();finish(false);});ui.addEventListener('close',()=>{if(resolveChoice)finish(false);});
  $('rtNormal').textContent='Använd sparad avläsning';
  $('rtNormal').onclick=()=>{
   if(!reviewedData(previousRead,doc.numPages)){status('Ingen färdig avläsning finns att återanvända. Markera kod och tabell och läs filen en gång innan du sparar projekt-PDF.');return;}
   active=clone(previousRead);remember();finish(true);
  };
  for(const kind of ['code','table','stamp','move'])$('rt'+kind[0].toUpperCase()+kind.slice(1)).onclick=()=>setMode(kind);
  $('rtPrev').onclick=()=>changePage(currentPage()-1);$('rtNext').onclick=()=>changePage(currentPage()+1);
  $('rtPage').onchange=()=>changePage(Number($('rtPage').value));
  $('rtAreaScope').onchange=()=>{if(singleCardReread){refreshAreaControls();return;}areaScope=$('rtAreaScope').value;const cards=localCards();areaCardId=cards.length===1?cards[0].id:'';refreshAreaControls();paint();coordinates();};
  $('rtAreaCard').onchange=()=>{if(singleCardReread){refreshAreaControls();return;}areaCardId=$('rtAreaCard').value;refreshAreaControls();paint();coordinates();};
  $('rtAreaCommon').onclick=()=>{if(singleCardReread){refreshAreaControls();return;}areaScope='common';areaCardId='';refreshAreaControls();paint();coordinates();};
  $('rtLocalRead').onclick=()=>void rereadLocal();
  $('rtPages').oninput=()=>{resetDiscovery();invalidate();};
  $('rtZoomIn').onclick=()=>zoomAt(zoom*1.4);$('rtZoomOut').onclick=()=>zoomAt(zoom/1.4);
  $('rtGoMatches').onclick=()=>ui.querySelector('.rtMatchReview').scrollIntoView({block:'start',behavior:'smooth'});
  $('rtDiscover').onclick=()=>void discoverCards();$('rtPreview').onclick=()=>void preview();$('rtStart').onclick=start;
  $('rtFind').onclick=()=>void searchDrawing();$('rtMatchApproval').onchange=validatePrepared;
  $('rtReadPhase').onchange=()=>{resetDiscovery();invalidate();coordinates();paint();setMode('code');};
  $('rtImageMode').onchange=()=>{if(productsOnly)invalidate();invalidateMatches();status('Söksättet är ändrat. Valet används vid nästa provläsning och ritningssökning.');};
  $('rtWorkPolicy').onchange=()=>{
   for(const card of scopedReviewCards()){if(card.workState==='pending'&&!card.workReadError)continue;const old=clone(originalWorkCard(card)),result=selectedWork({text:card.rawTable,words:card.tableWords||[]});card.work=result.work;card.workItems=result.items;card.workWarnings=result.warnings;card.workPolicy=workPolicy()==='gs'?'gs-install-v4':'all';finishWorkReading(card,result,old);}
   if(productsOnly)productsRead=!failedWorkCount();
   $('rtResults').replaceChildren();for(const card of visibleReviewCards())renderResult(card);$('rtMatchApproval').checked=false;validatePrepared();status('Arbetsurvalet är ändrat. Granska arbetsraderna innan du öppnar projektet.');
  };
  $('rtStampCode').onchange=()=>{if(drawingSample){drawingSample.code=$('rtStampCode').value;invalidateMatches();status('Sök stämplar igen efter ändrad koppling.');}};
  $('rtSampleClear').onclick=()=>{drawingSample=null;invalidateMatches();paint();coordinates();status('Exemplet är rensat. Sök stämplar för att läsa ritningen igen.');};
  $('rtTemplate').onchange=()=>{const t=templates()[$('rtTemplate').value];if(t){rects=clone(t.rects);$('rtName').value=t.name;}else rects={};resetDiscovery();invalidate();paint();coordinates();};
  const box=$('rtCanvasBox'),viewport=$('rtViewport');
  viewport.addEventListener('wheel',e=>{
   if(busy||!doc||!e.deltaY)return;
   e.preventDefault();clearGesture();
   const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1);
   zoomAt(zoom*Math.exp(-Math.max(-240,Math.min(240,pixels))*.002),e);
  },{passive:false});
  viewport.addEventListener('pointerdown',e=>{
   if(busy||!doc||(e.pointerType==='mouse'&&e.button!==0))return;
   e.preventDefault();viewport.setPointerCapture(e.pointerId);
   if(e.pointerType==='touch'){
    touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touchPoints.size>=2){beginPinch();return;}
    if(pinchSession)return;
   }
   if(mode==='move'){
    gesture={id:e.pointerId,type:'pan',x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.classList.add('rtPanning');
   }else if(box.contains(e.target)){
    const p=point(e);gesture={id:e.pointerId,type:'select',start:p,end:p,mode};drawDraft();
   }
  });
  viewport.addEventListener('pointermove',e=>{
   if(touchPoints.has(e.pointerId))touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(pinch){e.preventDefault();movePinch();return;}
   if(gesture?.id!==e.pointerId)return;e.preventDefault();
   if(gesture.type==='pan'){viewport.scrollLeft=gesture.left+gesture.x-e.clientX;viewport.scrollTop=gesture.top+gesture.y-e.clientY;}
   else{gesture.end=point(e);drawDraft();}
  });
  const endPointer=(e,cancelled=false)=>{
   const wasPinching=pinchSession;touchPoints.delete(e.pointerId);
   if(wasPinching){clearGesture();pinch=null;if(touchPoints.size>=2)beginPinch();if(!touchPoints.size)pinchSession=false;}
   else if(gesture?.id===e.pointerId){
    if(!cancelled&&gesture.type==='select'){
     e.preventDefault();gesture.end=point(e);const r=gestureRect();
     if(r.w*box.clientWidth>=8&&r.h*box.clientHeight>=6){if(gesture.mode==='stamp'){drawingSample={page:drawingPage,rect:r,code:$('rtStampCode').value};invalidateMatches();status('Hela exempelstämpeln ska vara med, inklusive färgad bakgrund och kant. Tryck Sök på ritningen igen för att jämföra text, färg och form.');}else{storeArea(gesture.mode,r);}}
     paint();coordinates();
    }
    clearGesture();
   }
   if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  };
  viewport.addEventListener('pointerup',e=>endPointer(e));
  viewport.addEventListener('pointercancel',e=>endPointer(e,true));
  viewport.addEventListener('lostpointercapture',e=>{if(touchPoints.has(e.pointerId)||gesture?.id===e.pointerId)endPointer(e,true);});
 }
 function clearGesture(){gesture=null;$('rtDraftRect').hidden=true;$('rtViewport').classList.remove('rtPanning');}
 function resetViewportInput(keepZoom=false){
  clearTimeout(zoomTimer);zoomTimer=null;clearGesture();pinch=null;pinchSession=false;touchPoints.clear();if(!keepZoom)zoomDirty=false;
 }
 function zoomAnchor(clientX,clientY){
  const viewport=$('rtViewport'),vr=viewport.getBoundingClientRect(),box=$('rtCanvasBox').getBoundingClientRect();
  clientX??=vr.left+viewport.clientLeft+viewport.clientWidth/2;clientY??=vr.top+viewport.clientTop+viewport.clientHeight/2;
  return {clientX,clientY,x:clamp((clientX-box.left)/box.width),y:clamp((clientY-box.top)/box.height)};
 }
 function sizePreview(width,height){
  $('rtCanvas').style.width=width+'px';$('rtCanvas').style.height=height+'px';$('rtCanvasBox').style.width=width+'px';
 }
 function zoomAt(next,event=null,anchor=null){
  if(busy||!doc)return;
  next=Math.max(.5,Math.min(6,next));if(!Number.isFinite(next))return;
  anchor??=zoomAnchor(event?.clientX,event?.clientY);
  const viewport=$('rtViewport'),box=$('rtCanvasBox'),before=box.getBoundingClientRect(),factor=next/zoom;
  zoom=next;sizePreview(before.width*factor,before.height*factor);
  const after=box.getBoundingClientRect();
  viewport.scrollLeft+=after.left+anchor.x*after.width-anchor.clientX;
  viewport.scrollTop+=after.top+anchor.y*after.height-anchor.clientY;
  $('rtZoomLevel').value=Math.round(zoom*100)+' %';
  // Scale the existing preview immediately. Repaint the PDF after the gesture
  // pauses, rather than replaying a large drawing for every wheel/touch event.
  zoomDirty=true;queueZoomRender();
 }
 function queueZoomRender(){
  clearTimeout(zoomTimer);zoomTimer=setTimeout(()=>{zoomTimer=null;if(doc&&ui.open&&!busy)void render().catch(error=>status('Förhandsvisningen kunde inte uppdateras: '+error.message));},140);
 }
 function beginPinch(){
  const entries=[...touchPoints.entries()].slice(0,2),[a,b]=entries.map(entry=>entry[1]);
  clearGesture();pinchSession=true;
  pinch={ids:entries.map(entry=>entry[0]),distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),zoom,anchor:zoomAnchor((a.x+b.x)/2,(a.y+b.y)/2)};
 }
 function movePinch(){
  const [a,b]=pinch.ids.map(id=>touchPoints.get(id));if(!a||!b)return;
  zoomAt(pinch.zoom*Math.hypot(b.x-a.x,b.y-a.y)/pinch.distance,null,{...pinch.anchor,clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2});
 }
 function templates(){try{return JSON.parse(localStorage.getItem(templatesKey)||'[]').filter(t=>validRect(t.rects?.code));}catch(_){return [];}}
 async function discoverCards(){
  if(busy||!doc)return;const version=cancelVersion;
  try{
   if(!readyAreas())throw Error(codeOnly()?'Markera kodområdet på ett exempelkort först.':'Markera kod och hela produkttabellen på ett exempelkort först.');
   const knownSources=sourceCards();
   lock(true);invalidate();beginReadProgress('Hittar dörrkort');
   const result=await window.SmartMatchReadCodes.discover({pdf:doc,examplePage:example,codeOnly:codeOnly(),codeRect:rects.code,tableRect:rects.table,pageOverrides:clone(pageOverrides),getTextContent:async pg=>(await nativePageWords(pg)).content,fallbackPolicy:searchMode()==='full'?'all':searchMode()==='text'?'none':'matching-tables',cancelled:()=>version!==cancelVersion,readFallback:async({page,rect,kind})=>{
    status('Bildläser '+(kind==='code'?'beteckning':'tabell')+' för att hitta liknande dörrkort…');
    const result=await readRegion(page,rect,kind,version);
    if(version!==cancelVersion)throw Error('Avläsningen avbröts.');
    return {...result,text:kind==='code'&&result.ids.length!==1?'':result.text};
   },onDetail:readDetail,onProgress:progress=>status(progress.message)});
   if(version!==cancelVersion)return;
   for(const c of result.cards){
    const previous=knownSources.filter(old=>old.page===c.page);
    if(previous.length===1&&result.cards.filter(other=>other.page===c.page).length===1){c.id=previous[0].id;if(cardOverrides[c.id]){const own=cardOverrides[c.id];if(own.code)c.codeRect=clone(own.code);if(own.table)c.tableRect=clone(own.table);c.bounds=cardBounds(c.codeRect,c.tableRect);}}
   }
   for(const item of result.pages)item.cardIds=result.cards.filter(card=>card.page===item.page).map(card=>card.id);
   discovery=result;for(const c of result.cards)c.selected=c.status==='proposed';
   const pages=new Set(result.cardPages);if(!pages.size)pages.add(example);
   $('rtPages').value=[...pages].sort((a,b)=>a-b).join(', ');
   renderDiscovery();
   status('Hittade '+result.cards.filter(c=>c.status==='proposed').length+' föreslagna dörrkort på '+result.cardPages.length+' sidor. Granska kortlistan och tryck '+(codeOnly()?'Matcha koder mot ritningen.':'Läs korten och sök på ritningen.')+(result.unresolvedPages.length?' '+result.unresolvedPages.length+' sidor behöver kontrolleras manuellt.':''));
  }catch(e){if(version===cancelVersion){status(e.message||String(e));endReadProgress('error',e.message||String(e));}}
  finally{if(version===cancelVersion){if(readingProgress?.snapshot().active)endReadProgress();await release();lock(false);if(confirmed&&visibleReviewCards().length)requestAnimationFrame(()=>$('rtReviewSection')?.scrollIntoView({block:'start',behavior:'instant'}));}}
 }
 function renderDiscovery(){
  const root=$('rtDiscoveryResults');root.replaceChildren();if(!discovery)return;
  const heading=document.createElement('h3');heading.textContent='Föreslagna dörrkort';root.append(heading);
  const help=document.createElement('p');help.textContent=codeOnly()?'Ett kodfält per sida föreslås utifrån exempelkortets sidlayout. Kontrollera beteckningarna och vilka sidor som är dörrkort. Vid flera kort på samma sida väljer du det tidigare fullständiga flödet.':'Varje område är ett eget kort, även när flera finns på samma sida. Kontrollera beteckningarna och välj vilka kort som ska läsas.';root.append(help);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Sidor som behöver kontrolleras';details.append(summary);
  for(const [i,item]of discovery.cards.entries()){
   const label=document.createElement('label');label.className='rtPageChoice';label.dataset.cardId=item.id;
   const check=document.createElement('input');check.type='checkbox';check.checked=item.selected!==false;check.setAttribute('aria-label','Ta med kort '+(i+1)+' sida '+item.page);
   label.append(check,document.createTextNode('Kort '+(i+1)+' · sida '+item.page+' · '+(item.code||'Välj beteckning vid provläsning')));
   check.onchange=()=>{item.selected=check.checked;const pages=[...new Set(discovery.cards.filter(c=>c.selected!==false).map(c=>c.page))];$('rtPages').value=pages.sort((a,b)=>a-b).join(', ');invalidate();};
   root.append(label,adjustmentButton(item,item.page));
  }
  for(const item of discovery.pages.filter(p=>!discovery.cards.some(c=>c.page===p.page&&c.selected!==false))){
   const p=document.createElement('p');p.textContent='Sida '+item.page+' · '+item.reason;details.append(p,adjustmentButton(null,item.page));
  }
  if(details.children.length>1)root.append(details);
 }
 function currentPage(){return view==='drawing'?drawingPage:example;}
 function populateStampCodes(){
  const select=$('rtStampCode'),previous=select.value||drawingSample?.code;
  const codes=[...new Set(Object.values(prepared).map(c=>norm(c.code)).filter(Boolean))];
  select.replaceChildren(...codes.map(code=>new Option(code,code)));if(codes.includes(previous))select.value=previous;
  $('rtStamp').disabled=busy||!codes.length;$('rtFind').disabled=busy||!confirmed;
 }
 function setMode(value,renderOnChange=true){
  const old=view;mode=value;if(value==='stamp'){
   view='drawing';let pages=[];try{pages=parsePages($('rtPages').value,doc.numPages);}catch(_){}
   if(pages.includes(drawingPage))drawingPage=Array.from({length:doc.numPages},(_,i)=>i+1).find(p=>!pages.includes(p))||1;
  }else if(value!=='move')view='card';
  resetViewportInput(old===view);$('rtViewport').classList.toggle('rtMoveMode',value==='move');
  for(const v of ['code','table','stamp','move'])$('rt'+v[0].toUpperCase()+v.slice(1)).setAttribute('aria-pressed',String(v===value));
  $('rtSampleControls').hidden=view!=='drawing';$('rtPageLabel').textContent=view==='drawing'?'Ritningssida':'Dörrkortssida';$('rtPage').value=String(currentPage());coordinates();paint();
  if(old!==view){zoom=1;if(renderOnChange)void render();}else if(zoomDirty)queueZoomRender();
 }
 function point(e){const r=$('rtCanvasBox').getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width),y:clamp((e.clientY-r.top)/r.height)};}
 function gestureRect(){const a=gesture.start,b=gesture.end;return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)};}
 function showRect(el,r){el.hidden=!r;if(!r)return;Object.assign(el.style,{left:r.x*100+'%',top:r.y*100+'%',width:r.w*100+'%',height:r.h*100+'%'});}
 function drawDraft(){const el=$('rtDraftRect');el.className='rtRect '+(gesture.mode==='stamp'?'rtStampRect':gesture.mode==='code'?'rtCodeRect':'rtTableRect');showRect(el,gestureRect());}
 function paint(){const areas=displayedRects();showRect($('rtCodeRect'),view==='card'?areas.code:null);showRect($('rtTableRect'),view==='card'&&!codeOnly()?areas.table:null);showRect($('rtStampRect'),view==='drawing'&&drawingSample?.page===drawingPage?drawingSample.rect:null);showRect($('rtHitRect'),view==='drawing'&&focusedHit?.page===drawingPage?focusedHit.box:null);}
 function coordinates(){
  const root=$('rtCoordinates');root.replaceChildren();
  for(const [kind,label]of (view==='drawing'?[['stamp','Stämpel']]:productsOnly?[['table','Tabell']]:codeOnly()?[['code','Kod']]:[['code','Kod'],['table','Tabell']])){
   const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=label+' · procent av sidan';field.append(legend);
   for(const [key,name]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']]){
    const r=kind==='stamp'?drawingSample?.rect:displayedRects()[kind];
    const l=document.createElement('label');l.textContent=name;const input=document.createElement('input');input.type='number';input.min='0';input.max='100';input.step='.1';input.value=String(Math.round((r?.[key]||0)*10000)/100);input.setAttribute('aria-label',label+' '+name);
    input.onchange=()=>{const next={...(kind==='stamp'?drawingSample?.rect:displayedRects()[kind]||{x:0,y:0,w:0,h:0}),[key]:clamp(Number(input.value)/100)};next.w=Math.min(next.w||0,1-(next.x||0));next.h=Math.min(next.h||0,1-(next.y||0));if(kind==='stamp'){drawingSample={page:drawingPage,rect:next,code:$('rtStampCode').value};invalidateMatches();}else{storeArea(kind,next);}paint();};l.append(input);field.append(l);
   }root.append(field);
  }
 }
 async function changePage(n){
  if(singleCardReread){example=singleCardTargetPage||example;$('rtPage').value=String(example);status('Omläsningen är låst till det öppna dörrkortets sida.');return;}
  if(!busy&&doc)resetViewportInput();
  if(view==='drawing'){if(busy||!doc)return;drawingPage=Math.max(1,Math.min(doc.numPages,Math.trunc(n)||1));$('rtPage').value=String(drawingPage);zoom=1;coordinates();await render();return;}
  if(busy||!doc)return;const old=example;example=Math.max(1,Math.min(doc.numPages,Math.trunc(n)||1));
  if(old!==example){areaCardId='';refreshAreaControls();coordinates();}
  if($('rtPages').value===String(old)){$('rtPages').value=String(example);}
  $('rtPage').value=String(example);zoom=1;await render();
 }
 let renderVersion=0,renderTask=null,renderedPreview=null;
 async function render(){
  const version=++renderVersion;if(renderTask){renderTask.cancel();try{await renderTask.promise;}catch(_){}}
  const pg=await doc.getPage(currentPage());if(version!==renderVersion)return;
  const requestedZoom=zoom,raw=pg.getViewport({scale:1}),width=Math.max(250,$('rtViewport').clientWidth-24),vp=pg.getViewport({scale:width/raw.width*zoom});
  const ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(2800000/(vp.width*vp.height)));
  if(renderedPreview?.document===doc&&renderedPreview.page===currentPage()&&renderedPreview.scale===vp.scale&&renderedPreview.ratio===ratio){zoomDirty=false;paint();return;}
  // Give PDF.js the true raster scale. Large Bluebeam pages are made from
  // image/smask strips; an external transform made PDF.js choose images from
  // the lower CSS viewport and could leave the preview white for many seconds.
  const raster=pg.getViewport({scale:vp.scale*ratio}),canvas=$('rtCanvas');renderedPreview=null;canvas.width=Math.ceil(raster.width);canvas.height=Math.ceil(raster.height);sizePreview(vp.width,vp.height);$('rtZoomLevel').value=Math.round(zoom*100)+' %';
  renderTask=pg.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:raster});
  try{await renderTask.promise;}catch(e){if(e.name!=='RenderingCancelledException')throw e;return;}
  if(version===renderVersion){if(zoom===requestedZoom)zoomDirty=false;renderTask=null;renderedPreview={document:doc,page:currentPage(),scale:vp.scale,ratio};paint();}
 }
 function groupWords(words){
  const groups=[];
  for(const w of words.filter(w=>clean(w.text)).sort((a,b)=>a.y-b.y||a.x-b.x)){
   let row=groups.find(r=>Math.abs(r.y-w.y)<Math.max(3,w.h*.55));
   if(!row){row={y:w.y,words:[]};groups.push(row);}row.words.push(w);
  }
  return groups.sort((a,b)=>a.y-b.y).map(r=>r.words.sort((a,b)=>a.x-b.x).map(w=>clean(w.text)).join('  ')).join('\n');
 }
 async function localWorker(){
  const workerVersion=cancelVersion;
  if(!workerPromise)workerPromise=(async()=>{
   if(!window.Tesseract){
    if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('vendor/tesseract/tesseract.min.js',base);s.onload=resolve;s.onerror=()=>reject(Error('Bildläsningens filer kunde inte laddas.'));document.head.append(s);}).catch(e=>{libraryPromise=null;throw e;});
    await libraryPromise;
   }
   return Tesseract.createWorker(['swe','eng'],1,{workerPath:new URL('vendor/tesseract/worker.min.js',base).href,corePath:new URL('vendor/tesseract/tesseract-core-lstm.wasm.js',base).href,langPath:new URL('vendor/tesseract/lang/',base).href,cachePath:'tillsyno-read-test-v1',workerBlobURL:false,gzip:true,logger:m=>{if(m.status==='recognizing text'&&busy&&workerVersion===cancelVersion&&readVersion===cancelVersion)readingProgress?.update({localPercent:Math.round(m.progress*100)});}});
  })().catch(e=>{workerPromise=null;throw e;});
  return workerPromise;
 }
 async function release(){const p=workerPromise;workerPromise=null;if(p)try{await(await p).terminate();}catch(_){}}
 async function recognize(worker,canvas){
  let timer;
  try{return await Promise.race([worker.recognize(canvas),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bildläsningen tog för lång tid. Prova ett mindre tabellområde eller justera markeringen.')),45000);})]);}
  finally{clearTimeout(timer);}
 }
 function removeTableRules(canvas){
  // Long straight table borders confuse OCR's text segmentation. Remove only
  // continuous runs from this temporary crop; the PDF and viewer stay intact.
  const ctx=canvas.getContext('2d'),image=ctx.getImageData(0,0,canvas.width,canvas.height),pixels=image.data,w=canvas.width,h=canvas.height,runs=[];
  const dark=(x,y)=>{const i=(y*w+x)*4;return pixels[i]+pixels[i+1]+pixels[i+2]<480;};
  for(let y=0;y<h;y++){
   let start=-1;
   for(let x=0;x<=w;x++)if(x<w&&dark(x,y)){if(start<0)start=x;}else if(start>=0){if(x-start>=Math.max(50,w*.35))runs.push({x:start,y,w:x-start,h:1});start=-1;}
  }
  for(let x=0;x<w;x++){
   let start=-1;
   for(let y=0;y<=h;y++)if(y<h&&dark(x,y)){if(start<0)start=y;}else if(start>=0){if(y-start>=Math.max(50,h*.35))runs.push({x,y:start,w:1,h:y-start});start=-1;}
  }
  for(const r of runs)for(let y=Math.max(0,r.y-1);y<Math.min(h,r.y+r.h+1);y++)for(let x=Math.max(0,r.x-1);x<Math.min(w,r.x+r.w+1);x++){
   const i=(y*w+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;
  }
  if(runs.length)ctx.putImageData(image,0,0);
 }
 async function readRegion(pg,rect,kind,version=cancelVersion){
  if(version!==cancelVersion)throw Error('Avläsningen avbröts.');
  readDetail({...readContext,page:pg.pageNumber||readContext.page,label:kind==='code'?'Läser markerad kod som PDF-text':'Läser markerad arbetslista som PDF-text'});
  if(!regionReadCache.has(pg))regionReadCache.set(pg,new Map());
  const cache=regionReadCache.get(pg),key=JSON.stringify([rect,kind,searchMode()]);
  if(!cache.has(key))cache.set(key,readRegionUncached(pg,rect,kind,version));
  try{const value=await cache.get(key);if(version!==cancelVersion)throw Error('Avläsningen avbröts.');return value;}
  catch(error){cache.delete(key);throw error;}
 }
 async function readRegionUncached(pg,rect,kind,version=cancelVersion){
  const check=()=>{if(version!==cancelVersion)throw Error('Avläsningen avbröts.');};check();
  const {vp,words:pageWords}=await nativePageWords(pg),readMode=searchMode();check();
  const words=pageWords.filter(word=>word.x+word.w/2>=rect.x*vp.width&&word.x+word.w/2<=(rect.x+rect.w)*vp.width&&word.y+word.h/2>=rect.y*vp.height&&word.y+word.h/2<=(rect.y+rect.h)*vp.height);
  const native=groupWords(words),nativeIds=kind==='code'?candidates(native):[];
  if(readMode==='text')return {text:native,native,words,ids:nativeIds,method:'Endast PDF-text i markeringen',confidence:native?100:0,needsImage:!native,warnings:native?[]:['Ingen läsbar PDF-text i markeringen. Välj Snabb sökning eller Sök även i bilder för bildtext.']};
  if(readMode==='auto'&&native&&(kind!=='code'||nativeIds.length)){
   const raster=await window.SmartMatchReadImageRegions.hasImages(pg,rect);check();
   if(!raster)return {text:native,native,words,ids:nativeIds,method:'PDF-text i markeringen',confidence:100,warnings:[]};
  }
  // Rasterize the selected area as well: scanned rows can coexist with native text.
  // The complete visible table is read, rather than just its native PDF labels.
  const scale=Math.min(kind==='code'?4:2.5,Math.sqrt(2800000/(vp.width*rect.w*vp.height*rect.h))),view=pg.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(rect.w*view.width));canvas.height=Math.max(1,Math.ceil(rect.h*view.height));
  try{
   const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   const total=kind==='table'&&canvas.height>700?Math.ceil(canvas.height/400):1;
   const imageProgress={phase:'card-image',label:kind==='code'?'Förbereder bildläsning av kodfält':'Förbereder bildläsning av arbetslista',page:pg.pageNumber||readContext.page,unit:'area',done:0,total,scope:'card-image-'+(pg.pageNumber||readContext.page)+'-'+kind};
   readDetail(imageProgress);
   await pg.render({canvasContext:ctx,viewport:view,transform:[1,0,0,1,-rect.x*view.width,-rect.y*view.height],annotationMode:0}).promise;
   const grid=kind==='table'?window.SmartMatchReadTableOCR.prepare(canvas):null;
   if(kind==='table'&&!grid)removeTableRules(canvas);
   status(kind==='code'?'Bildläser kodområdet…':'Bildläser markerat produktområde…');
   check();const worker=await localWorker();check();await worker.setParameters({tessedit_pageseg_mode:kind==='code'?7:6,preserve_interword_spaces:'1'});
   let data;
   if(grid){
    data=await window.SmartMatchReadTableOCR.read(canvas,grid,worker,{recognize,check,progress:(done,total)=>readDetail({...imageProgress,label:'Bildläser tabellcell '+done+' av '+total,done,total})});
   }else if(kind==='table'&&canvas.height>700){
    const collected=[],confidences=[];
    for(let top=0;top<canvas.height;top+=400){
     check();
     readDetail({...imageProgress,label:'Bildläser markerad arbetslista',done:Math.floor(top/400)});
     const tile=document.createElement('canvas');tile.width=canvas.width;tile.height=Math.min(480,canvas.height-top);tile.getContext('2d').drawImage(canvas,0,top,canvas.width,tile.height,0,0,canvas.width,tile.height);
     try{const result=await recognize(worker,tile);check();for(const w of result.data.words||[]){const middle=(w.bbox.y0+w.bbox.y1)/2;if(top>0&&middle<=40)continue;if(top+tile.height<canvas.height&&middle>tile.height-40)continue;collected.push({...w,bbox:{...w.bbox,y0:w.bbox.y0+top,y1:w.bbox.y1+top}});}confidences.push(result.data.confidence);readDetail({...imageProgress,label:'Bildläser markerad arbetslista',done:Math.floor(top/400)+1});}finally{tile.width=tile.height=1;}
    }
    data={words:collected,confidence:confidences.reduce((a,b)=>a+b,0)/Math.max(1,confidences.length),text:''};
   }else {readDetail({...imageProgress,label:kind==='code'?'Bildläser markerat kodfält':'Bildläser markerad arbetslista'});({data}=await recognize(worker,canvas));check();readDetail({...imageProgress,label:kind==='code'?'Kodfältet är bildläst':'Arbetslistan är bildläst',done:1});}
   check();const ocr=kind==='code'?clean(data.text):groupWords((data.words||[]).map(w=>({text:w.text,x:w.bbox.x0,y:w.bbox.y0,h:w.bbox.y1-w.bbox.y0})))||String(data.text||'').trim();
   if(kind==='code'){
    const ocrIds=data.confidence>=75?candidates(ocr):[];
    const ids=[...new Set([...nativeIds,...ocrIds])];
    return {text:native||ocr,native,ids,words,method:nativeIds.length?'PDF-text och lokal bildläsning':'Lokal bildläsning',confidence:data.confidence,warnings:[]};
   }
   // A gridded table can have complete native text while OCR sees just one
   // row. Prefer native words at their positions, and add OCR-only content so
   // scanned rows/products in mixed PDFs are retained without duplicating text.
   const rasterWords=(data.words||[]).filter(w=>Number(w.confidence??data.confidence??0)>=45).map(w=>{
    const h=(w.bbox.y1-w.bbox.y0)/scale;
    return {text:w.text,x:rect.x*vp.width+w.bbox.x0/scale,y:rect.y*vp.height+w.bbox.y0/scale,w:(w.bbox.x1-w.bbox.x0)/scale,h,confidence:Number(w.confidence??data.confidence??0)};
   }).filter(w=>!words.some(n=>{
    const overlap=Math.max(0,Math.min(w.x+w.w,n.x+n.w)-Math.max(w.x,n.x));
    return Math.abs(w.y-n.y)<Math.max(3,n.h*.65,w.h*.65)&&overlap/Math.max(1,w.w)>.55;
   }));
   const merged=groupWords([...words,...rasterWords]);
   return {text:merged||native||ocr,native,words:[...words,...rasterWords],method:'PDF-text och lokal bildläsning inom markeringen',confidence:words.length?100:data.confidence,warnings:[]};
  }finally{canvas.width=canvas.height=1;}
 }
 function updateMatchCounts(){
  const selected=matchRun?.hits.filter(h=>h.selected!==false)||[];
  const summary=$('rtMatchCount');if(summary){const cards=Object.values(prepared),linked=new Set(selected.map(h=>h.code));summary.textContent=cards.length+' avlästa kort · '+selected.length+' valda ritningspositioner · '+cards.filter(c=>!linked.has(c.code)).length+' kort utan träff';}
  for(const card of Object.values(prepared)){
   const hint=[...ui.querySelectorAll('.rtMatchHint')].find(el=>el.dataset.cardId===card.id),count=selected.filter(h=>h.code===card.code).length;
   if(hint)hint.textContent=matchRun?count+' valda stämplar med beteckningen '+card.code+'.':'Sök stämplar för att kontrollera kopplingen till ritningen.';
  }
  validatePrepared();
 }
 function renderMatches(){
  const root=$('rtDrawingResults');root.replaceChildren();$('rtGoMatches').hidden=!matchRun;if(!matchRun)return;
  $('rtGoMatches').textContent='4. Granska '+matchRun.hits.length+' träffar på ritningen';
  const heading=document.createElement('h3');heading.id='rtMatchCount';root.append(heading);
  const help=document.createElement('p');help.textContent=matchRun.hits.length?'Tryck Visa för att kontrollera placeringen. Avmarkera felaktiga träffar och exempel i teckenförklaringar.':'Inga stämplar hittades. Markera en exempelstämpel på ritningen och sök igen. Fortsätter du utan träffar skapas inga automatiska kopplingar.';root.append(help);
  for(const warning of matchRun.warnings||[]){const p=document.createElement('p');p.className='rtSearchNotice';p.textContent=warning;root.append(p);}
  const list=document.createElement('div');list.className='rtMatchList';root.append(list);
  matchRun.hits.forEach((hit,i)=>{
   const row=document.createElement('div');row.className='rtMatchRow';
   const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=hit.selected!==false;check.setAttribute('aria-label','Ta med '+hit.code+' sida '+hit.page+' träff '+(i+1));
   check.onchange=()=>{hit.selected=check.checked;$('rtMatchApproval').checked=false;updateMatchCounts();};
   label.append(check,document.createTextNode(hit.code+' · sida '+hit.page));
   const button=document.createElement('button');button.type='button';button.textContent='Visa';button.setAttribute('aria-label','Visa '+hit.code+' sida '+hit.page+' träff '+(i+1));
   button.onclick=async()=>{drawingPage=hit.page;focusedHit=hit;setMode('stamp',false);await render();const box=$('rtHitRect');if(!box.hidden)box.scrollIntoView({block:'center',inline:'center',behavior:'instant'});};row.append(label,button);list.append(row);
  });
  $('rtMatchApproval').disabled=busy;updateMatchCounts();
 }
 async function findDrawing(version){
  const cards=eligibleCards(),safe=Object.fromEntries(cards.map(card=>[card.id,card])),pages=[...new Set([...Object.values(prepared),...deferredFrom(previousRead),...(discovery?.cards||[]).filter(card=>card.selected!==false)].map(card=>card.page))],allCodes=drawingCodes(searchReadData(safe)),previousMatch=(deferredResume||pendingMatchCodes.size)&&matchRun?clone(matchRun):null,codes=previousMatch?allCodes.filter(code=>pendingMatchCodes.has(code)):allCodes;
  const physicalGroups=new Map();for(const code of codes)for(const printed of groupSourceCodes(previousRead,code)){if(!physicalGroups.has(printed))physicalGroups.set(printed,[]);physicalGroups.get(printed).push(code);}
  const searchCodes=[...physicalGroups.keys()];
  if(previousMatch&&!codes.length){renderMatches();status('Inga nya giltiga beteckningar är valda för sökning. Sparade kopplingar är kvar. Rätta ett kort eller fortsätt med de klara korten.');return;}
  if(!cards.length){matchRun=emptyMatching('Inga säkra beteckningar kunde sökas. Välj rätt kort för dubbletter eller fortsätt med korten sparade till senare.');renderMatches();status('Korten är lästa. Välj rätt kort för dubbletter eller välj Fortsätt med klara kort.');return;}
  if(new Set(codes).size!==codes.length)throw Error('Flera dörrkort har samma beteckning. Välj ett kort per beteckning, eller rätta beteckningarna innan sökning.');
  if(codes.some(c=>!norm(c)))throw Error('Välj en giltig beteckning för varje kort först.');
  if(drawingSample&&!validRect(drawingSample.rect))throw Error('Markera hela exempelstämpeln på ritningen först.');
  if(drawingSample&&!drawingSample.appearance&&window.SmartMatchReadAppearanceV98){
   status('Kontrollerar exempelstämpelns färg och form…');
   const pg=await doc.getPage(drawingSample.page),native=await nativePageWords(pg),r=drawingSample.rect;
   const words=native.words.map(word=>({...word,x:word.x/native.vp.width,y:word.y/native.vp.height,w:word.w/native.vp.width,h:word.h/native.vp.height})).filter(word=>word.x+word.w/2>=r.x&&word.x+word.w/2<=r.x+r.w&&word.y+word.h/2>=r.y&&word.y+word.h/2<=r.y+r.h);
   const textBox=window.SmartMatchReadMatcher.textHits(words,[drawingSample.code])[0]?.box;
   const profile=await window.SmartMatchReadAppearanceV98.renderProfile(pg,r,{cancelled:()=>version!==cancelVersion});
   if(version!==cancelVersion)return;
   const appearance=textBox&&window.SmartMatchReadAppearanceV98.learn(profile,r,textBox,native.vp);
   if(appearance)drawingSample.appearance=appearance;
   else drawingSample.appearance={version:1,enabled:false};
  }
  if(!previousMatch)invalidateMatches();
  const result=await window.SmartMatchReadMatcher.scan({pdf:doc,codeOnly:codeOnly(),getTextContent:async pg=>(await nativePageWords(pg)).content,cardPages:pages,codes:searchCodes,sample:!previousMatch||searchCodes.includes(drawingSample?.code)?drawingSample:null,annotationIndex,imageMode:$('rtImageMode').value,getWorker:localWorker,recognize,onDetail:readDetail,onProgress:status,cancelled:()=>version!==cancelVersion});
  if(version!==cancelVersion)return;
  for(const hit of result.hits){
   hit.drawingCode=hit.code;const groups=physicalGroups.get(hit.code)||[hit.code];
   const scoped=groups.filter(code=>groupMapping(previousRead,code)?.sourceScopes?.[hit.drawingCode]?.some(position=>sameReadPlace(position,hit)));
   const general=groups.filter(code=>!Array.isArray(groupMapping(previousRead,code)?.sourceScopes?.[hit.drawingCode]));
   if(scoped.length>1||!scoped.length&&general.length>1)throw Error('Samma tryckta beteckning har motstridiga gruppkopplingar. Kontrollera grupperna innan du söker igen.');
   hit.code=scoped[0]||general[0]||'';
  }
  result.hits=result.hits.filter(hit=>hit.code);
  if(metadataWarning)result.warnings.unshift(metadataWarning);
  if(previousMatch){result.hits=[...previousMatch.hits.filter(hit=>!codes.includes(hit.code)),...result.hits];result.warnings=[...new Set([...(previousMatch.warnings||[]),...result.warnings])];for(const item of result.pages)item.count=result.hits.filter(hit=>hit.page===item.page).length;}
  const removed=previousRead?.removedReadPositions||[];
  result.hits=result.hits.filter(hit=>!removed.some(item=>sameReadPlace(item,hit)));
  for(const hit of result.hits){
   const previous=previousRead?.matching?.hits.find(item=>item.code===hit.code&&sameReadPlace(item,hit));if(previous?.positionId)hit.positionId=previous.positionId;
   const mapping=groupMapping(previousRead,hit.code);if(mapping){hit.cardPage=mapping.cardPage;hit.originalCardCode=mapping.originalCardCode;hit.sourceCardId=mapping.sourceCardId;hit.label=mapping.drawingLabel;}
  }
  for(const item of result.pages)item.count=result.hits.filter(hit=>hit.page===item.page).length;
  if(drawingSample?.appearance?.enabled===false)result.warnings.push('Exemplets färg och form kunde inte bestämmas säkert. Markera om hela den färgade stämpeln och sök igen, eller rensa exemplet för vanlig textsökning. De aktuella träffarna har bara jämförts som text och måste granskas.');
  pendingMatchCodes.clear();searchError='';result.imageMode=$('rtImageMode').value;matchRun=result;lastValidMatch=clone(result);renderMatches();
  const direct=result.pages.filter(p=>p.scanMode==='stamp-index').reduce((sum,p)=>sum+p.count,0);
  status(direct?'Sökningen hittade '+result.hits.length+' träffar; '+direct+' lästes direkt ur PDF-stämplar. Granska träffarna och kryssa i bekräftelsen före start.':'Sökningen är klar. Granska träffarna och kryssa i bekräftelsen före start.');
 }
 async function searchDrawing(){
  if(busy||!confirmed)return;const version=cancelVersion;lock(true);beginReadProgress('Söker beteckningar på ritningen');
  try{await findDrawing(version);}catch(e){if(version===cancelVersion){searchError=e.message||String(e);if(!matchRun&&lastValidMatch)matchRun=clone(lastValidMatch);status('Ritningssökningen avbröts: '+searchError+'. Korten är kvar. Välj Fortsätt med klara kort om du vill kontrollera kopplingarna senare.');endReadProgress('error',searchError);}}
  finally{if(version===cancelVersion){if(readingProgress?.snapshot().active)endReadProgress();await release();lock(false);if(confirmed&&visibleReviewCards().length)requestAnimationFrame(()=>$('rtReviewSection')?.scrollIntoView({block:'start',behavior:'instant'}));}}
 }
 function retainedWork(card){
  const old=cardsFrom(previousRead).find(c=>c.page===card.page&&c.code===card.code);
  if(!old||old.workState==='pending')return card;
  return {...card,tableRect:areaOverride(card).table||old.tableRect,displayBounds:old.displayBounds?clone(old.displayBounds):card.displayBounds,products:clone(old.products||[]),rawTable:old.rawTable||'',tableWords:old.tableWords||[],work:clone(old.work),workItems:clone(old.workItems||[]),workWarnings:clone(old.workWarnings||[]),workPolicy:old.workPolicy,workState:'ready',manualWorkReview:old.manualWorkReview?clone(old.manualWorkReview):undefined};
 }
 async function preview(){
  if(busy)return;const version=cancelVersion;
  try{
   if(!readyAreas())throw Error(codeOnly()?'Markera kodområdet först.':'Markera hela produkttabellen med Övrigt/Produkt och Monteras av/Mont av först.');
   const regions=selectedRegions();if(!regions.length)throw Error('Välj minst ett föreslaget dörrkort.');
   lock(true);
   if(!deferredResume)prepared={};
   if(!productsOnly&&!deferredResume)invalidateMatches();
   $('rtResults').replaceChildren();confirmed=false;productsRead=false;searchError='';
   beginReadProgress(productsOnly?'Läser arbetslistor':codeOnly()?'Läser koder och matchar ritningen':'Läser koder, arbetslistor och ritning');
   const headingCounts=new Map();
   if(!codeOnly())for(const r of regions)for(const label of new Set(String(r.tableText||'').split('\n').map(clean).filter(isWorkHeading)))headingCounts.set(label,(headingCounts.get(label)||0)+1);
   const knownLabels=[...headingCounts].filter(([,count])=>count>=Math.max(2,Math.ceil(regions.length*.4))).map(([label])=>label);
   for(const [index,region]of regions.entries()){
    if(version!==cancelVersion)return;
    const p=region.page;status((productsOnly?'Läser arbetslista ':codeOnly()?'Läser kod ':'Provläser kort ')+(index+1)+' av '+regions.length+' · sida '+p+'…');
    const cardProgress={phase:'card-reading',label:productsOnly?'Läser arbetslista':codeOnly()?'Läser kodfält':'Läser dörrkort',page:p,pageIndex:index+1,pageCount:regions.length,unit:'card',done:index,total:regions.length,scope:'prepared-cards'};readDetail(cardProgress);
    const previous=cardsFrom(previousRead).find(card=>card.id===region.id);
    let readErrorKind=productsOnly?'work':'code';
    try{
     const pg=await doc.getPage(p);
     const codeRead=productsOnly?{ids:[region.code],text:region.header,warnings:[],method:region.method,confidence:region.confidence}:await readRegion(pg,region.codeRect,'code',version);
     if(version!==cancelVersion)return;
     const recognized=codeRead.ids.length===1?codeRead.ids[0]:'',code=productsOnly?region.code:previous?.originalCardCode&&previous.originalCardCode!==previous.code?previous.code:recognized;
     let card;
     if(codeOnly()){
      card=retainedWork({...region,code,originalCardCode:productsOnly?(region.originalCardCode||region.code):recognized||region.originalCardCode||code,header:codeRead.text,tableRect:null,rawTable:'',tableWords:[],work:[],workItems:[],workWarnings:codeRead.warnings||[],workState:'pending',method:codeRead.method,confidence:codeRead.confidence,choices:codeRead.ids});
     }else{
      readDetail({...cardProgress,label:'Läser markerad arbetslista som PDF-text'});
      readErrorKind='work';const tableRead=await readRegion(pg,region.tableRect,'table',version);if(version!==cancelVersion)return;
      const selected=selectedWork(tableRead,knownLabels);
      card={...region,code,originalCardCode:productsOnly?(region.originalCardCode||region.code):recognized||region.originalCardCode||code,header:codeRead.text,rawTable:tableRead.text,tableWords:tableRead.words||[],work:selected.work,workItems:selected.items,workWarnings:[...(codeRead.warnings||[]),...(tableRead.warnings||[]),...selected.warnings],workPolicy:workPolicy()==='gs'?'gs-install-v4':'all',workState:'ready',method:tableRead.method,confidence:tableRead.confidence,choices:codeRead.ids};
      finishWorkReading(card,selected,previous);
     }
     delete card.cardReadError;delete card.unread;card.deferred=false;card.deferredReasons=[];prepared[card.id]=card;
     localDirty.delete('page:'+region.page);localDirty.delete('card:'+region.id);
     if(deferredResume&&card.code)pendingMatchCodes.add(card.code);
    }catch(error){
     if(version!==cancelVersion)return;
     const old=previous||region;
     prepared[region.id]={...clone(region),code:old.code||'',header:old.header||region.codeText||'',originalCardCode:old.originalCardCode||old.code||'',work:clone(old.work||[]),workItems:clone(old.workItems||[]),workState:old.workState||'pending',choices:clone(old.choices||[]),cardReadError:'Kortet kunde inte läsas: '+(error.message||String(error)),readErrorKind,deferred:false,deferredReasons:[]};
    }
    if(!deferredResume||resumeCardIds.has(region.id))renderResult(prepared[region.id]);
    readDetail({...cardProgress,done:index+1});
   }
   confirmed=true;populateStampCodes();
   if(productsOnly){productsRead=!failedWorkCount();status(productsRead?'Arbetslistorna är lästa. Granska raderna och tryck Spara produkter. Ritningens kopplingar är oförändrade.':'Några produkter behöver rättas. Du kan fortsätta med klara kort; tidigare arbetslistor och kopplingar bevaras.');validatePrepared();}
   else {
    try{await findDrawing(version);}catch(error){if(version===cancelVersion){searchError=error.message||String(error);if(!matchRun&&lastValidMatch)matchRun=clone(lastValidMatch);status('Korten är lästa men ritningssökningen avbröts: '+searchError+'. Du kan fortsätta med klara kort och koppla resten manuellt.');endReadProgress('error',searchError);}}
   }
  }catch(e){if(version===cancelVersion){if(Object.keys(prepared).length)confirmed=true;status(e.message||String(e));endReadProgress('error',e.message||String(e));}}
  finally{if(version===cancelVersion){if(readingProgress?.snapshot().active)endReadProgress();await release();lock(false);if(confirmed&&visibleReviewCards().length)requestAnimationFrame(()=>$('rtReviewSection')?.scrollIntoView({block:'start',behavior:'instant'}));}}
 }
 async function rereadLocal(){
  if(busy||areaScope==='common')return;
  const key=localKey(),version=cancelVersion,known=localCard();
  if(singleCardReread&&(!known||known.id!==singleCardTargetId||known.page!==singleCardTargetPage)){status('Omläsningen är låst till det öppna dörrkortet. Inget annat kort ändrades.');return;}
  if(areaScope==='card'&&!known){status('Välj vilket kort på sidan som ska läsas.');return;}
  const old=known?clone(known):{id:'p'+example+':manual',page:example,code:'',codeRect:clone(rects.code),tableRect:rects.table?clone(rects.table):null,work:[],workItems:[],workState:'pending',choices:[]};
  try{
   const region=effectiveRegion(old,productsOnly);
   lock(true);beginReadProgress('Läser bara valt dörrkort');
   const progress={phase:'card-reading',label:'Läser endast valt kort',page:old.page,pageIndex:1,pageCount:1,unit:'card',done:0,total:1,scope:'local-card-'+old.id};readDetail(progress);
   const pg=await doc.getPage(old.page);if(version!==cancelVersion)return;
   const codeRead=productsOnly?{ids:[old.code],text:old.header,warnings:[],method:old.method,confidence:old.confidence}:await readRegion(pg,region.codeRect,'code',version);
   if(version!==cancelVersion)return;
   const recognized=codeRead.ids.length===1?codeRead.ids[0]:'';
   // An existing reviewed drawing connection is not renamed by a fresh OCR
   // result. Its printed source name and drawing search label are separate.
   const linked=!old.deferred&&!deferredFrom(previousRead).some(card=>card.id===old.id)&&!!matchRun?.hits.some(hit=>hit.code===old.code),explicitDrawingLabel=!!old.originalCardCode&&old.originalCardCode!==old.code,code=linked||explicitDrawingLabel?old.code:recognized;
   let card={...old,...region,id:old.id,code,originalCardCode:productsOnly?(old.originalCardCode||old.code):recognized||old.originalCardCode||old.code,header:codeRead.text,choices:codeRead.ids,method:codeRead.method,confidence:codeRead.confidence};
   if(!codeOnly()){
    const tableRead=await readRegion(pg,region.tableRect,'table',version);if(version!==cancelVersion)return;
    const selected=selectedWork(tableRead);
    card={...card,rawTable:tableRead.text,tableWords:tableRead.words||[],work:selected.work,workItems:selected.items,workWarnings:[...(codeRead.warnings||[]),...(tableRead.warnings||[]),...selected.warnings],workPolicy:workPolicy()==='gs'?'gs-install-v4':'all',workState:'ready',method:tableRead.method,confidence:tableRead.confidence};finishWorkReading(card,selected,originalWorkCard(old));
   }else if(!Array.isArray(card.work)){card.work=[];card.workItems=[];card.workState='pending';}
   if(linked&&recognized&&recognized!==old.code)card.workWarnings=[...(card.workWarnings||[]),'Kortet lästes som '+recognized+'. Den sparade ritningsbeteckningen '+old.code+' behålls. Ändra ritningsbeteckning uttryckligen om kopplingen ska ändras.'];
   delete card.cardReadError;delete card.readErrorKind;delete card.unread;card.deferred=false;card.deferredReasons=[];
   prepared[card.id]=card;
   for(const other of Object.values(prepared))if(other.sourceCardId===card.id){
    const nameFields={id:other.id,code:other.code,originalCardCode:card.originalCardCode,sourceCardId:card.id,drawingLabel:other.drawingLabel,manualLink:other.manualLink};Object.assign(other,clone(card),nameFields);for(const key of ['workReadError','proposedWork','proposedWorkItems','manualWorkReview','cardReadError','readErrorKind','unread'])if(card[key]===undefined)delete other[key];
   }
   if(discovery){
    const item=discovery.cards.find(item=>item.id===old.id);
    const corrected={...card,codeText:card.header,tableText:card.rawTable||'',status:card.code?'proposed':'unresolved',selected:!!card.code,reason:'Läsområdet på denna sida är kontrollerat.'};
    if(item)Object.assign(item,corrected);else discovery.cards.push(corrected);
    discovery.cardPages=[...new Set(discovery.cards.filter(item=>item.status==='proposed').map(item=>item.page))].sort((a,b)=>a-b);
    const selectedPages=new Set(parsePages($('rtPages').value,doc.numPages));selectedPages.add(old.page);$('rtPages').value=[...selectedPages].sort((a,b)=>a-b).join(', ');renderDiscovery();
   }
   localDirty.delete(key);confirmed=true;if(productsOnly)productsRead=!failedWorkCount();
   if(old.code!==card.code){if(matchRun){pendingMatchCodes.delete(old.code);if(card.code)pendingMatchCodes.add(card.code);$('rtMatchApproval').checked=false;}else invalidateMatches();}
   $('rtResults').replaceChildren();for(const item of visibleReviewCards())renderResult(item);
   populateStampCodes();if(matchRun)renderMatches();readDetail({...progress,done:1});validatePrepared();
   status(card.workReadError?'Produktläsningen på sida '+old.page+' behöver rättas. Kontrollera kolumnrubrikerna; tidigare produkter och kopplingar bevaras.':'Sida '+old.page+' är läst. Övriga kort och sparade kopplingar är oförändrade.'+(!productsOnly&&!matchRun?' Granska beteckningen och sök på ritningen när korten är klara.':''));
  }catch(error){if(version===cancelVersion){status(error.message||String(error));endReadProgress('error',error.message||String(error));}}
  finally{if(version===cancelVersion){if(readingProgress?.snapshot().active)endReadProgress();await release();lock(false);if(confirmed&&visibleReviewCards().length)requestAnimationFrame(()=>$('rtReviewSection')?.scrollIntoView({block:'start',behavior:'instant'}));}}
 }
 function cardIsDirty(card){return localDirty.has('page:'+card.page)||localDirty.has('card:'+card.id);}
 function getCardIssues(card){
  const issues=[];
  if(!card)return ['Kortet har inte lästs'];
  if(!norm(card.code))issues.push('Beteckning saknas');
  if(card.code&&(!deferredResume||resumeCardIds.has(card.id))&&Object.values(prepared).some(other=>other.id!==card.id&&!other.deferred&&norm(other.code)===norm(card.code)))issues.push('Samma beteckning finns på flera kort');
  if(cardIsDirty(card))issues.push('Läsområdet behöver kontrolleras');
  if(card.workReadError)issues.push('Produktläsningen behöver rättas');
  if(card.cardReadError)issues.push(card.cardReadError);
  if(card.sourceCardId&&prepared[card.sourceCardId]?.deferred)issues.push('Källkortet har lämnats till senare');
  if(card.unread)issues.push('Kortet har inte lästs');
  return issues;
 }
 function eligibleCards(){return Object.values(prepared).filter(card=>!card.deferred&&!getCardIssues(card).length);}
 function visibleReviewCards(){return Object.values(prepared).filter(card=>deferredResume?resumeCardIds.has(card.id):productsOnly&&resumeWorkIds?resumeWorkIds.has(card.id):true);}
 function rerenderResults(){
  $('rtResults').replaceChildren();for(const card of visibleReviewCards())renderResult(card);
  populateStampCodes();if(matchRun)renderMatches();validatePrepared();
 }
 function manualWorkItem(text,index,existing){
  if(existing?.text===text)return {...clone(existing),key:existing.key||'manual:'+rowKey(text,index),text};
  return {key:'manual:'+rowKey(text,index),text,label:text,value:'',quantity:1,sourceRow:index,responsibility:'GS',section:'Arbetslista',sectionKey:'arbetslista',manual:true};
 }
 function proposedRows(card){return Array.isArray(card.proposedWork)?card.proposedWork:[];}
 function setProposedRows(card,rows,referenceRows,referenceItems){
  const reconciled=reconcileWorkItems(rows,card.proposedWorkItems||[],referenceRows,referenceItems);
  card.proposedWork=clone(rows);card.proposedWorkItems=rows.map((text,index)=>manualWorkItem(text,index,reconciled[index]));
 }
 function invalidateManualAcceptance(card){
  if(!card?.manualWorkReview?.accepted)return;
  card.proposedWork=clone(card.work||[]);card.proposedWorkItems=clone(card.workItems||[]);
  delete card.manualWorkReview;card.workReadError=true;card.workState='pending';
  syncAliasCards(prepared);productsRead=false;
 }
 async function acceptManualWork(id,acknowledged){
  if(busy)return;
  const requested=prepared[id],card=requested?.sourceCardId?prepared[requested.sourceCardId]:requested;
  if(!card||!card.workReadError||card.cardReadError||card.unread)return;
  if(!acknowledged){status('Kryssa först i att du har jämfört raderna med originalkortet.');return;}
  const rows=proposedRows(card).map(clean).filter(Boolean);
  if(!rows.length&&!await window.SmartMatchCompactWorkspace.confirm('Kortet saknar GS-rader. Godkänn ändå?'))return;
  let accepted={work:rows,workItems:rows.map((text,index)=>manualWorkItem(text,index,card.proposedWorkItems?.[index])),workWarnings:clone(card.workWarnings||[])};
  if(additionsOnly)mergeWorkAdditions(accepted,originalWorkCard(card));
  card.work=accepted.work;card.workItems=accepted.workItems;card.workWarnings=accepted.workWarnings;
  card.workPolicy='gs-install-v4';card.workState='ready';card.workReadError=false;
  card.manualWorkReview={version:1,accepted:true,acceptedAt:new Date().toISOString(),acknowledgedWarnings:clone(card.workWarnings||[])};
  delete card.proposedWork;delete card.proposedWorkItems;
  prepareWorkCard(card,originalWorkCard(card));syncAliasCards(prepared);
  productsRead=!failedWorkCount();rerenderResults();
  status('De kontrollerade GS-raderna på sida '+card.page+' används. Övriga varningar finns kvar i den sparade avläsningen.');
 }
 function setDeferred(id,value=true){
  if(busy||!prepared[id])return;
  const card=prepared[id];card.deferred=!!value;
  card.deferredReasons=value?(getCardIssues(card).length?getCardIssues(card):['Lämnat till senare av användaren']):[];
  if(value)for(const alias of Object.values(prepared).filter(other=>other.sourceCardId===id)){alias.deferred=true;alias.deferredReasons=['Källkortet har lämnats till senare'];}
  if(value&&matchRun&&!eligibleCards().some(other=>other.code===card.code))matchRun.hits=matchRun.hits.filter(hit=>hit.code!==card.code);
  if(!value&&card.code)pendingMatchCodes.add(card.code);
  $('rtMatchApproval').checked=false;rerenderResults();
 }
 function chooseDuplicate(id){
  if(busy||!prepared[id]?.code)return;
  const chosen=prepared[id],saved=cardsFrom(previousRead).find(card=>card.code===chosen.code&&card.id!==chosen.id&&!card.sourceCardId);
  if(saved&&(deferredResume||previousRead?.matching?.hits.some(hit=>hit.code===chosen.code&&hit.selected!==false)||window.SmartMatchAppBridge?.getPositions?.().some(position=>norm(position.code)===chosen.code))){status('Sida '+saved.page+' används redan för '+chosen.code+'. Behåll detta kort åt sidan. Om det är ett annat kort kan du ange dess rätta, andra beteckning och ta med det igen.');return;}
  for(const card of Object.values(prepared).filter(other=>norm(other.code)===norm(chosen.code))){
   if(deferredResume)resumeCardIds.add(card.id);card.deferred=card.id!==id;card.deferredReasons=card.deferred?['Samma beteckning: användaren valde kort på sida '+chosen.page]:[];
  }
  pendingMatchCodes.add(chosen.code);$('rtMatchApproval').checked=false;rerenderResults();
  status('Sida '+chosen.page+' är vald för '+chosen.code+'. Övriga kort med samma beteckning sparas till senare. Sök på ritningen för den valda kopplingen.');
 }
 async function showReviewCard(id){
  const card=prepared[id];if(busy||!card)return;
  example=card.page;view='card';focusedHit=null;zoom=1;$('rtPage').value=String(example);setMode(productsOnly?'table':'code',false);coordinates();await render();
  $('rtViewport').scrollIntoView({block:'nearest',behavior:'instant'});
 }
 function emptyMatching(message){return {version:2,hits:[],pages:[],warnings:message?[message]:[],imageMode:searchMode(),review:{version:1,approved:false}};}
 async function continueReady(){
  if(busy||!confirmed||!Object.keys(prepared).length)return;
  const reviewCards=scopedReviewCards(),unresolved=reviewCards.filter(card=>!card.deferred&&getCardIssues(card).length);
  // Capture all ambiguous duplicates before changing flags: iteration order must
  // never pick a primary card on the user's behalf.
  for(const card of unresolved){card.deferredReasons=getCardIssues(card);}
  for(const card of unresolved)card.deferred=true;
  for(const alias of Object.values(prepared).filter(card=>card.sourceCardId&&prepared[card.sourceCardId]?.deferred)){alias.deferred=true;alias.deferredReasons=['Källkortet har lämnats till senare'];}
  const safe=eligibleCards(),codes=new Set(drawingCodes(searchReadData(Object.fromEntries(safe.map(card=>[card.id,card])))));
  if(productsOnly){productsRead=true;rerenderResults();status('Klara produkter kan sparas. '+reviewCards.filter(card=>card.deferred).length+' kort behöver rättas senare; tidigare arbetslistor och kopplingar behålls.');return;}
  if(searchError){
   const prior=matchRun||lastValidMatch;
   const count=(prior?.hits||[]).filter(hit=>codes.has(hit.code)).length;
   if(!await window.SmartMatchCompactWorkspace.confirm('Sökningen avbröts: '+searchError+'. Fortsätt med '+count+' sparade positioner? Olösta kort sparas till senare.')){rerenderResults();return;}
   matchRun=prior?clone(prior):emptyMatching();matchRun.hits=matchRun.hits.filter(hit=>codes.has(hit.code));
   matchRun.warnings=[...new Set([...(matchRun.warnings||[]),'Sökningen avbröts. Tidigare kända positioner behölls; övriga kopplingar behöver kontrolleras manuellt.'])];
   matchRun.partial=true;pendingMatchCodes.clear();searchError='';$('rtMatchApproval').checked=false;rerenderResults();
   status('Tidigare kända positioner är kvar. Granska träffarna och öppna projektet. Övriga kort finns under Kort att kontrollera senare.');return;
  }
  if(matchRun){
   matchRun.hits=matchRun.hits.filter(hit=>codes.has(hit.code));
   for(const code of [...pendingMatchCodes])if(!codes.has(code))pendingMatchCodes.delete(code);
  }
  if(!safe.length){matchRun=emptyMatching('Inga säkra beteckningar valdes. Korten sparas till senare och inga automatiska kopplingar skapas.');pendingMatchCodes.clear();rerenderResults();status('Inga automatiska kopplingar skapas. Bekräfta granskningen för att öppna projektet och koppla manuellt senare.');return;}
  if(!matchRun||pendingMatchCodes.size)await searchDrawing();
  rerenderResults();
  if(!searchError)status('Klara kort kan användas. '+Object.values(prepared).filter(card=>card.deferred).length+' kort sparas till senare. Granska ritningsträffarna och öppna projektet.');
 }
 const reviewApi={resizePreview:()=>render(),getCards:visibleReviewCards,getIssues:getCardIssues,getCardIssues,toggleDeferred:setDeferred,setDeferred,chooseDuplicate,showCard:showReviewCard,continueReady,getState:()=>({cards:visibleReviewCards(),deferred:visibleReviewCards().filter(card=>card.deferred),busy,productsOnly,confirmed,matchingReady:!!matchRun,searchError,canContinue:confirmed&&!busy&&visibleReviewCards().length>0})};
 function validatePrepared(){
  const cards=scopedReviewCards(),live=cards.filter(card=>!card.deferred);
  const incompleteDiscovery=discovery?.cards.some(card=>card.selected!==false&&!prepared[card.id]);
  $('rtStart').disabled=busy||!!incompleteDiscovery||!confirmed||!cards.length||live.some(card=>getCardIssues(card).length)||(!productsOnly&&[...pendingMatchCodes].some(code=>live.some(card=>card.code===code)))||(productsOnly?!productsRead:!matchRun||!$('rtMatchApproval').checked);
  window.SmartMatchReadReviewV99?.refresh(reviewApi);
 }
 function renderResult(card){
  const p=card.page,n=Object.keys(prepared).indexOf(card.id)+1;
  const panel=document.createElement('section');panel.className='rtResult';panel.dataset.page=p;panel.dataset.cardId=card.id;
  const h=document.createElement('h3');h.textContent='Kort '+n+' · sida '+p;panel.append(h);
  const read=document.createElement('p');read.className='rtReadText';read.textContent='Avläst: '+(card.header||'Ingen säker beteckning');panel.append(read);
  if(productsOnly){const id=document.createElement('p');id.textContent='Sparad koppling: '+card.code;panel.append(id);}
  const original=document.createElement('p');original.className='rtOriginalCardName';original.textContent='Beteckning på dörrkortet: '+(card.originalCardCode||card.code||'Ej läst');panel.append(original,adjustmentButton(card,p));
  const label=document.createElement('label');label.textContent='Beteckning på ritningen';const input=document.createElement('input');input.value=card.code;input.disabled=busy||productsOnly;input.setAttribute('aria-label','Beteckning kort '+n);label.hidden=productsOnly;label.append(input);panel.append(label);
  const hint=document.createElement('p');hint.className='rtMatchHint';hint.dataset.page=p;hint.dataset.cardId=card.id;
  hint.textContent=productsOnly?'Kopplingen till ritningen är sparad. Här granskar du alla produkter; GS-leverans eller GS-montage får kontrollpunkter.':(card.choices||[]).length>1&&!card.code?'Flera möjliga beteckningar: '+card.choices.join(', ')+'. Välj vilken som gäller.':'Sök stämplar för att kontrollera kopplingen till ritningen.';
  input.oninput=()=>changedDrawingCode(card,norm(input.value));panel.append(hint);
  for(const message of card.workWarnings||[]){const notice=document.createElement('p');notice.className='rtSearchNotice';notice.textContent=message;panel.append(notice);}
  if(codeOnly()){const note=document.createElement('p');note.className='rtReadMethod';note.textContent=(card.method||'Sparad kod')+' · '+(card.workState==='pending'?'Produkter läses senare.':'Tidigare arbetslista bevaras.');panel.append(note);$('rtResults').append(panel);window.SmartMatchReadReviewV99?.enhancePanel(panel,card,reviewApi);return;}
  appendProducts(panel,card);
  const displayedWork=card.workReadError?proposedRows(card):card.work;
  const method=document.createElement('p');method.className='rtReadMethod';method.textContent=(card.method||'Sparad läsning')+' · '+displayedWork.length+' '+(card.workReadError?'föreslagna ':'')+'arbetsrader'+(/^gs-install-v/.test(card.workPolicy||'')?' för GS':'');panel.append(method);
  const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Granska tabell och arbetsrader';pre.textContent=card.rawTable||'Ingen text kunde läsas. Lägg till arbetsrader manuellt eller justera markeringen.';details.append(summary,pre);panel.append(details);
  if(card.workReadError&&!card.cardReadError&&!card.unread){
   details.open=true;
   const source=card.sourceCardId?prepared[card.sourceCardId]||card:card;
   const initialRows=clone(proposedRows(source)),initialItems=clone(source.proposedWorkItems||[]);
   const workLabel=document.createElement('label');workLabel.textContent='Föreslagna GS-rader · en uppgift per rad';
   const area=document.createElement('textarea');area.rows=6;area.value=initialRows.join('\n');area.setAttribute('aria-label','Föreslagna GS-rader kort '+n);
   area.oninput=()=>{const rows=area.value.split('\n').map(clean).filter(Boolean);setProposedRows(source,rows,initialRows,initialItems);syncAliasCards(prepared);};
   workLabel.append(area);details.append(workLabel);
   const review=document.createElement('section');review.className='rtManualWorkReview';
   const explanation=document.createElement('p');explanation.textContent='Läsningen blev tekniskt osäker, men hittade GS-rader får användas efter att du har jämfört dem med hela originalkortet.';
   const approval=document.createElement('label');approval.className='rtManualWorkApproval';const check=document.createElement('input');check.type='checkbox';check.className='rtManualWorkAck';approval.append(check,document.createTextNode('Jag har jämfört med originalkortet'));
   const accept=document.createElement('button');accept.type='button';accept.className='rtAcceptManualWork';accept.textContent='Använd kontrollerade rader';accept.disabled=true;
   check.onchange=()=>{accept.disabled=!check.checked||busy;};accept.onclick=()=>acceptManualWork(card.id,check.checked);
   const caution=document.createElement('small');caution.textContent='Detta godkänner bara produktraderna. Saknad beteckning, dubbletter, olästa kort och ej granskade ritningsträffar måste fortfarande rättas.';
   review.append(explanation,approval,accept,caution);details.append(review);$('rtResults').append(panel);window.SmartMatchReadReviewV99?.enhancePanel(panel,card,reviewApi);return;
  }
  const editTarget=card.sourceCardId?prepared[card.sourceCardId]||card:card;
  const focusedAdditions=singleCardReread&&Number.isInteger(editTarget.rereadBaseCount),baseCount=focusedAdditions?editTarget.rereadBaseCount:0;
  const baseWork=clone(editTarget.work.slice(0,baseCount)),baseItems=clone(editTarget.workItems?.slice(0,baseCount)||[]),editableWork=clone(editTarget.work.slice(baseCount)),editableItems=clone(editTarget.workItems?.slice(baseCount)||[]);
  const hadManualAcceptance=editTarget.manualWorkReview?.accepted===true;
  const workLabel=document.createElement('label');workLabel.textContent=focusedAdditions?'Nya arbetsrader · en uppgift per rad':'Arbetsrader · en uppgift per rad';const area=document.createElement('textarea');area.rows=6;area.value=editableWork.join('\n');area.setAttribute('aria-label','Arbetsrader kort '+n);area.oninput=()=>{const next=area.value.split('\n').map(clean).filter(Boolean),nextItems=reconcileWorkItems(next,editableItems,editableWork,editableItems);editTarget.work=[...baseWork,...next];editTarget.workItems=[...baseItems,...nextItems];if(focusedAdditions)editTarget.rereadAddedCount=next.length;syncAliasCards(prepared);};area.onchange=()=>{if(!hadManualAcceptance)return;invalidateManualAcceptance(editTarget);rerenderResults();status('De manuellt godkända raderna ändrades. Jämför dem med originalkortet och godkänn igen.');};workLabel.append(area);details.append(workLabel);
  const note=document.createElement('small');note.textContent=focusedAdditions?'Tidigare punkter är skyddade. Rätta bara de nya raderna här; efter sparning kan alla punkter ändras eller tas bort i kontrollistan.':'Kontrollera arbetsraderna. Dessa får var sin Klar-ruta för varje enskild stämpel.';details.append(note);$('rtResults').append(panel);window.SmartMatchReadReviewV99?.enhancePanel(panel,card,reviewApi);
 }
 function start(){
  if(busy||!confirmed||(productsOnly?!productsRead:!matchRun||!$('rtMatchApproval').checked))return;
  try{
   const reviewCards=scopedReviewCards(),live=reviewCards.filter(card=>!card.deferred),deferred=reviewCards.filter(card=>card.deferred);
   if(!Object.keys(prepared).length||live.some(card=>getCardIssues(card).length))throw Error('Rätta korten som behöver kontrolleras, eller välj Fortsätt med klara kort.');
   const pendingWork=clone(previousRead?.pendingWorkCards||{});
   let combined,parked;
   if(productsOnly){
    combined=clone(previousRead.cards);parked=clone(previousRead.deferredCards||{});
    for(const card of live){combined[card.id]=clone(card);delete combined[card.id].deferred;delete combined[card.id].deferredReasons;delete combined[card.id].rereadBaseCount;delete combined[card.id].rereadAddedCount;delete pendingWork[card.id];}
    for(const card of deferred){pendingWork[card.id]={...clone(card),deferred:true,deferredReasons:card.deferredReasons?.length?clone(card.deferredReasons):['Produktläsningen behöver rättas']};}
   }else{
    combined={...clone(previousRead?.cards||{}),...Object.fromEntries(live.map(card=>{const stored=clone(card);delete stored.deferred;delete stored.deferredReasons;return [card.id,stored];}))};
    parked={...clone(previousRead?.deferredCards||{}),...Object.fromEntries(deferred.map(card=>[card.id,{...clone(card),deferred:true,deferredReasons:card.deferredReasons?.length?clone(card.deferredReasons):['Lämnat till senare av användaren']} ]))};
    for(const card of live)delete parked[card.id];
    for(const card of deferred)delete combined[card.id];
    for(const card of Object.values(combined))if(card.sourceCardId&&!combined[card.sourceCardId]){parked[card.id]={...card,deferred:true,deferredReasons:['Källkortet har lämnats till senare']};delete combined[card.id];}
   }
   combined=retainSourceAliases(combined,new Set(Object.keys(parked)));
   for(const [id,retry]of Object.entries(pendingWork)){const source=combined[id]||parked[id];if(source){retry.code=source.code;retry.page=source.page;}}
   const groupMappings={},deferredGroupMappings=clone(previousRead?.deferredGroupMappings||{});
   for(const [code,mapping]of Object.entries({...deferredGroupMappings,...(previousRead?.groupMappings||{})})){
    if(combined[mapping.sourceCardId]){groupMappings[code]=clone(mapping);delete deferredGroupMappings[code];}
    else deferredGroupMappings[code]=clone(mapping);
   }
   const allPages=[...new Set([...Object.values(combined),...Object.values(parked)].map(card=>card.page))].sort((a,b)=>a-b);
   const allowed=new Set([...Object.values(combined).map(card=>card.code),...Object.keys(groupMappings)]);
   const matching=productsOnly?clone(previousRead.matching):{...clone(matchRun),hits:matchRun.hits.filter(hit=>allowed.has(hit.code)&&!allPages.includes(hit.page)),review:{version:1,approved:true}};
   const savedRects=singleCardReread?clone(previousRead.rects):clone(rects),savedPageOverrides=singleCardReread?clone(previousRead.pageOverrides||{}):clone(pageOverrides),savedCardOverrides=singleCardReread?clone(previousRead.cardOverrides||{}):clone(cardOverrides);
   if(singleCardReread&&cardOverrides[singleCardTargetId])savedCardOverrides[singleCardTargetId]=clone(cardOverrides[singleCardTargetId]);
   const next={...(previousRead?clone(previousRead):{}),schema:Object.keys(parked).length||Object.keys(pendingWork).length||Object.keys(deferredGroupMappings).length?2:1,phase:Object.values(combined).some(card=>card.workState==='pending')||!validRect(savedRects.table)?'codes':'full',sourceId,rects:savedRects,pageOverrides:savedPageOverrides,cardOverrides:savedCardOverrides,pages:allPages,cards:combined,deferredCards:parked,pendingWorkCards:pendingWork,groupMappings,deferredGroupMappings,checks:clone(preparedChecks),matching,drawingSample:drawingSample?clone(drawingSample):null,name:singleCardReread?(previousRead.name||'Egen läsmall'):clean($('rtName').value)||'Egen läsmall'};
   if(!validDocumentData(next,doc.numPages))throw Error('Kontrollera korten och deras sparade gruppkopplingar innan du sparar. De tidigare kopplingarna är oförändrade.');
   active=next;
   if(!singleCardReread&&$('rtSaveTemplate').checked){
    const saved=templates(),item={name:active.name,rects:clone(rects)};const i=saved.findIndex(t=>t.name===item.name);if(i>=0)saved[i]=item;else saved.push(item);
    try{localStorage.setItem(templatesKey,JSON.stringify(saved));}catch(_){status('Mallen kunde inte sparas på enheten. Projektets val används ändå.');}
   }
   remember();finish(true);
  }catch(e){status(e.message);}
 }
 function finish(value){if(!resolveChoice)return;if(readingProgress?.snapshot().active)endReadProgress(value?'done':'cancelled');cancelVersion++;const resolve=resolveChoice;resolveChoice=null;if(ui?.open)ui.close();void release();resolve(value);}
 async function beforeAnalyze(file,options={}){
  if(opening)return false;opening=true;const previousActiveAtEntry=active;let candidate=null,borrowedDoc=false,retainedDoc=false,openingBytes=null,displayBytes=null,displayPrepared=false;productsOnly=options.productsOnly===true;productsRead=false;deferredResume=options.deferredOnly===true;
  const requestedWorkIds=Array.isArray(options.workCardIds)?options.workCardIds.filter(id=>typeof id==='string'&&id):[];
  resumeWorkIds=requestedWorkIds.length?new Set(requestedWorkIds):options.deferredWorkOnly?new Set(Object.keys(options.liveReadData?.pendingWorkCards||{})):null;
  singleCardReread=productsOnly&&options.singleCardReread===true&&resumeWorkIds?.size===1;singleCardTargetId='';singleCardTargetPage=0;additionsOnly=singleCardReread&&options.additionsOnly!==false;
  try{
   await discardPreparedOpen();
   let metadata;
   if((productsOnly||deferredResume)&&options.liveReadData&&window.SmartMatchAppBridge?.getPdf()){
    doc=window.SmartMatchAppBridge.getPdf();borrowedDoc=true;sourceId=options.liveReadData.sourceId;metadata={data:null,hasReadData:false,annotations:[],warning:''};
   }else{
    openingBytes=new Uint8Array(await file.arrayBuffer());window.SmartMatchAppBridge?.reportOpenProgress?.(2,'Läser den sparade filen');sourceId=await sourceHash(openingBytes);
    metadata=await sourceMetadata(openingBytes);
    window.SmartMatchAppBridge?.reportOpenProgress?.(5,'Kontrollerar sparad projektinformation');
    if(!validRootPayload(metadata.metadata?.payload))throw Error('Felaktigt format på sparad projektinformation. Den öppna ritningen har inte ändrats.');
    const pageCount=metadata.pdfDocument?.getPageCount();
    if(!productsOnly&&!options.forceReview&&!options.cachedResume&&options.readTestIntent!=='prepare'&&!reviewedData(metadata.data,pageCount)){
     if(metadata.inspectionError)throw Error('PDF:ens projektinformation kunde inte läsas. Ingen ny avläsning har startats. Behåll filen och det lokalt sparade projektet för felsökning.');
     throw Error(metadata.data?'PDF:ens sparade avläsning kunde inte återställas säkert. Ingen ny avläsning har startats. Behåll filen och välj Förbered ny PDF om du vill granska den.':'PDF:en saknar en färdig, sparad avläsning. Välj Förbered ny PDF, läs filen och välj sedan Spara PDF. Nästa gång använder du Öppna färdigt projekt.');
    }
    if(!options.forceReview&&reviewedData(metadata.data,pageCount)&&window.SmartMatchAppBridge?.prepareProjectDisplay){
     displayPrepared=true;
     try{displayBytes=await window.SmartMatchAppBridge.prepareProjectDisplay(metadata.pdfDocument);}
     catch(error){console.warn('[SmartMatch] Kunde inte dölja äldre PDF-statusstämplar',error);}
    }
    doc=await pdfjsLib.getDocument(readerPdfOptions((displayBytes||openingBytes).slice())).promise;
    window.SmartMatchAppBridge?.reportOpenProgress?.(8,'Öppnar ritningens sparade sidor');
   }
   annotationIndex=metadata.annotations;metadataWarning=metadata.warning;
   const usable=data=>validDocumentData(data,doc.numPages);
   let local=null;try{local=JSON.parse(localStorage.getItem('tillsyno-read-test-v9-29-source:'+sourceId)||'null');}catch(_){}
   // External files are authoritative. Local data only prefills a new file's
   // guide, or resumes an explicitly cached session. Settings use live work.
   if(options.forceReview&&usable(options.liveReadData))candidate=options.liveReadData;
   else if(options.cachedResume)candidate=usable(options.liveReadData)?options.liveReadData:usable(local)?local:usable(metadata.data)?metadata.data:null;
   else if(metadata.hasReadData)candidate=usable(metadata.data)?metadata.data:null;
   else candidate=usable(local)?local:null;
   let fits=true;
   if(candidate?.matching)try{fits=await geometryFits(doc,candidate);}catch(_){fits=false;}
   window.SmartMatchAppBridge?.reportOpenProgress?.(10,'Kontrollerar sparade positioner');
   if(candidate)prepareReadData(candidate);
   if(!productsOnly&&!options.forceReview&&fits&&reviewedData(candidate,doc.numPages)&&(options.cachedResume||candidate===metadata.data)){
    const previousActive=active;active=clone(candidate);active.sourceId=sourceId;remember();
    if(openingBytes&&metadata.pdfDocument){retainPreparedOpen(file,openingBytes,metadata,doc,displayBytes,displayPrepared,previousActive,active,!options.cachedResume&&candidate===metadata.data);retainedDoc=true;}
    return true;
   }
   if(!productsOnly&&!options.forceReview&&options.readTestIntent!=='prepare'){
    if(metadata.inspectionError)throw Error('PDF:ens projektinformation kunde inte läsas. Ingen ny avläsning har startats. Behåll filen och det lokalt sparade projektet för felsökning.');
    throw Error(metadata.data?'PDF:ens sparade avläsning kunde inte återställas säkert. Ingen ny avläsning har startats. Behåll filen och använd Förbered ny PDF om du vill granska den.':'PDF:en saknar en färdig, sparad avläsning. Välj Förbered ny PDF, läs filen och välj sedan Spara PDF. Nästa gång öppnar du den nya projekt-PDF:en direkt med Öppna färdigt projekt.');
   }
   const needsReview=metadata.hasReadData&&!reviewedData(metadata.data,doc.numPages);
   if(candidate&&!fits){candidate=clone(candidate);delete candidate.matching;}
   if(productsOnly&&(!candidate||!candidate.matching||!fits))throw Error('De sparade kopplingarna kunde inte återanvändas. Välj Ändra förberedelse och kontrollera projektet först.');
   if(metadata.pdfDocument)try{annotationIndex=window.SmartMatchReadStamps.readDocument(metadata.pdfDocument);}
   catch(_){metadataWarning='PDF-stämplarnas sparade beteckningar kunde inte läsas. Sökningen använder vanlig text och bildläsning som reserv.';}
   previousRead=candidate?clone(candidate):null;makeUI();window.SmartMatchReadReviewV99?.reset?.();readingProgress?.reset();resetDiscovery();
   $('rtReadPhase').value=candidate?.phase==='codes'?'codes':'full';
   $('rtTitle').textContent=deferredResume?'Kort att kontrollera senare':singleCardReread?'Läs om detta dörrkort':productsOnly?'Fortsätt med produkter':'Läs dörrkort och matcha stämplar';
   pageOverrides=clone(candidate?.pageOverrides||{});cardOverrides=clone(candidate?.cardOverrides||{});areaScope='common';areaCardId='';localDirty=new Set();pendingMatchCodes=new Set();
   rects=validData(candidate)?clone(candidate.rects):{};prepared=validData(candidate)?Object.fromEntries([...cardsFrom(candidate),...deferredFrom(candidate)].map(c=>[c.id,clone(c)])):{};confirmed=validData(candidate);preparedChecks=clone(candidate?.checks||{});
   if(productsOnly)for(const card of Object.values(prepared))if(card.deferred)delete prepared[card.id];
   resumeCardIds=new Set(deferredResume?deferredFrom(candidate).map(card=>card.id):[]);
   if(productsOnly&&resumeWorkIds)for(const id of resumeWorkIds)if(candidate.pendingWorkCards?.[id]){prepared[id]={...clone(candidate.pendingWorkCards[id]),deferred:false};}
   searchError='';lastValidMatch=candidate?.matching?clone(candidate.matching):null;
   view='card';drawingPage=candidate?.drawingSample?.page||1;drawingSample=validData(candidate)&&validRect(candidate?.drawingSample?.rect)?clone(candidate.drawingSample):null;matchRun=validData(candidate)&&candidate.matching?clone(candidate.matching):null;focusedHit=null;
   if(deferredResume)for(const card of visibleReviewCards())if(!card.deferred&&!getCardIssues(card).length&&card.code)pendingMatchCodes.add(card.code);
   const rereadTarget=singleCardReread?cardsFrom(candidate).find(card=>resumeWorkIds.has(card.id)&&!card.sourceCardId):null;
   if(singleCardReread&&!rereadTarget)throw Error('Det öppna dörrkortets källsida kunde inte hittas. Kopplingarna har inte ändrats.');
   if(rereadTarget){singleCardTargetId=rereadTarget.id;singleCardTargetPage=rereadTarget.page;}
   example=(rereadTarget?.page||(deferredResume?deferredFrom(candidate)[0]?.page:productsOnly?(resumeWorkIds?cardsFrom(candidate).find(card=>resumeWorkIds.has(card.id))?.page:cardsFrom(candidate).find(card=>card.workState==='pending')?.page):null))||candidate?.pages?.[0]||Math.min(2,doc.numPages);zoom=1;gesture=null;busy=false;cancelVersion++;
   if(rereadTarget){areaScope='card';areaCardId=rereadTarget.id;}
   $('rtPage').value=String(example);$('rtPage').max=String(doc.numPages);$('rtPageCount').textContent='av '+doc.numPages;$('rtPages').value=candidate?.pages?.join(', ')||String(example);$('rtName').value=candidate?.name||'';
   const select=$('rtTemplate');select.replaceChildren(new Option('Ny markering',''));templates().forEach((t,i)=>select.add(new Option(t.name,String(i))));
   $('rtImageMode').value=['text','full'].includes(candidate?.matching?.imageMode)?candidate.matching.imageMode:'auto';
   const policyCards=rereadTarget?[rereadTarget]:candidate?cardsFrom(candidate):[];
   $('rtWorkPolicy').value=policyCards.some(c=>c.workState!=='pending'&&!/^gs-install-v/.test(c.workPolicy||''))?'all':'gs';
   $('rtResults').replaceChildren();for(const card of visibleReviewCards())renderResult(card);
   populateStampCodes();renderMatches();$('rtMatchApproval').checked=false;
   coordinates();setMode(productsOnly?'table':'code');refreshAreaControls();lock(false);status(singleCardReread?'Läser bara det markerade produktområdet på '+(rereadTarget.originalCardCode||rereadTarget.code)+' · sida '+rereadTarget.page+'. Ritningskopplingar och tidigare arbete behålls.':productsOnly?'Markera hela produkttabellen med Övrigt/Produkt, Levereras av/Lev av, Monteras av/Mont av och samtliga produktrader. Läs sedan produkterna; kopplingarna finns kvar.':needsReview||!fits?'Sparade kopplingar behöver granskas. Kontrollera korten och sök på ritningen igen.':confirmed?'Sparad avläsning hittad. Granska träffarna eller justera och sök igen.':'Välj ett exempelkort och markera koden. Zooma med mushjulet eller två fingrar om texten är liten.');
   const choice=new Promise(resolve=>{resolveChoice=resolve;});window.SmartMatchAppBridge?.prepareReadGuide?.();window.SmartMatchReadWorkflow?.setMode('preparing');ui.showModal();await render();
   if(singleCardReread&&resolveChoice)void rereadLocal().catch(error=>{if(resolveChoice)status('Dörrkortet kunde inte läsas om: '+(error?.message||error));});
   const accepted=await choice;
   if(accepted&&openingBytes&&metadata.pdfDocument&&!options.forceReview){retainPreparedOpen(file,openingBytes,metadata,doc,displayBytes,displayPrepared,previousActiveAtEntry,active,false);retainedDoc=true;}
   return accepted;
  }finally{
   if(resolveChoice){
    const resolve=resolveChoice;resolveChoice=null;cancelVersion++;
    try{if(readingProgress?.snapshot().active)endReadProgress('error','Avläsningen avbröts innan granskningsvyn blev klar.');}catch(_){}
    try{if(ui?.open)ui.close();}catch(_){}
    try{await release();}catch(_){}
    resolve(false);
   }
   if(ui)resetViewportInput();
   const oldDoc=doc,oldRender=renderTask;doc=null;renderTask=null;renderedPreview=null;renderVersion++;annotationIndex=[];metadataWarning='';pageTextCache=new WeakMap();regionReadCache=new WeakMap();
   try{if(oldRender){oldRender.cancel();try{await oldRender.promise;}catch(_){}}if(oldDoc&&!borrowedDoc&&!retainedDoc)await oldDoc.destroy();}
   finally{opening=false;productsOnly=false;productsRead=false;previousRead=null;deferredResume=false;resumeWorkIds=null;additionsOnly=false;singleCardReread=false;singleCardTargetId='';singleCardTargetPage=0;if(options.forceReview)window.SmartMatchReadWorkflow?.setMode(window.SmartMatchAppBridge?.getPdf()?'working':'home',{pending:getDeferredCardCount()});}
  }
 }
 async function openSettings(){
  const app=window.SmartMatchAppBridge,bytes=app?.getOriginalPdfBytes();
  if(opening||app?.isOpeningProject?.())return false;
  if(!bytes?.length){app?.setStatus('Välj Förbered ny PDF för en ny fil, eller Öppna färdigt projekt för ett sparat projekt.');return;}
  const snapshot=active?clone(active):null,file=new File([bytes],$('pwFileName').title||'Projekt.pdf',{type:'application/pdf'});
  const connectionKey=data=>JSON.stringify({cards:cardsFrom(data).map(card=>[card.id,card.page,card.code]).sort((a,b)=>a[0].localeCompare(b[0])),matching:data?.matching});
  if(await beforeAnalyze(file,{forceReview:true,liveReadData:snapshot})){
   try{if(snapshot&&active&&connectionKey(snapshot)===connectionKey(active))await app.applyReadWorkUpdates();else await app.applyReadSettings();}
   catch(error){active=snapshot;if(active)remember();throw error;}
  }
 }
 async function continueProducts(options={}){
  const app=window.SmartMatchAppBridge,bytes=app?.getOriginalPdfBytes();
  if(opening||!active||!bytes?.length)return;
  if(!options.reread&&!cardsFrom(active).some(card=>card.workState==='pending')&&!Object.keys(active.pendingWorkCards||{}).length){
   app.setStatus('Produkterna är redan avlästa och sparade. Öppna en position för att visa kontrollpunkterna.');return;
  }
  const snapshot=clone(active),file=new File([],$('pwFileName').title||'Projekt.pdf',{type:'application/pdf'});
  try{
   if(await beforeAnalyze(file,{productsOnly:true,forceReview:true,deferredWorkOnly:options.deferredWorkOnly===true,liveReadData:snapshot})){
    try{await app.applyReadWorkUpdates();}
    catch(error){active=snapshot;remember();throw error;}
   }
  }catch(error){app?.setStatus('Produkterna kunde inte läsas: '+error.message);}
 }
 async function rereadCard({code,page}={}){
  const app=window.SmartMatchAppBridge,bytes=app?.getOriginalPdfBytes();
  if(opening||!active||!bytes?.length)return false;
  const linked=cardFor(code,Number(page)),sourceId=linked?.sourceCardId||linked?.id;
  const source=sourceId&&cardsFrom(active).find(card=>card.id===sourceId&&!card.sourceCardId);
  if(!source){app?.setStatus('Dörrkortet kunde inte hittas. Den sparade kopplingen har inte ändrats.');return false;}
  const snapshot=clone(active),file=new File([],$('pwFileName').title||'Projekt.pdf',{type:'application/pdf'});
  app?.setStatus('Läser om endast '+(source.originalCardCode||source.code)+' på sida '+source.page+'…');
  try{
   if(!await beforeAnalyze(file,{productsOnly:true,forceReview:true,liveReadData:snapshot,workCardIds:[source.id],singleCardReread:true,additionsOnly:true})){app?.setStatus('Omläsningen avbröts. Inget ändrades.');return false;}
   try{await app.applyReadWorkUpdates();return true;}
   catch(error){active=snapshot;remember();throw error;}
  }catch(error){active=snapshot;remember();app?.setStatus('Dörrkortet kunde inte läsas om: '+(error.message||String(error)));return false;}
 }
 function getDeferredCardCount(){return new Set([...deferredFrom(active).map(card=>card.id),...Object.keys(active?.pendingWorkCards||{})]).size;}
 async function openDeferredCards(){
  const app=window.SmartMatchAppBridge,bytes=app?.getOriginalPdfBytes();
  if(opening||!active||!bytes?.length)return;
  if(!deferredFrom(active).length){
   if(Object.keys(active.pendingWorkCards||{}).length)await continueProducts({reread:true,deferredWorkOnly:true});
   else app.setStatus('Inga kort väntar på kontroll.');
   return;
  }
  const snapshot=clone(active),file=new File([],$('pwFileName').title||'Projekt.pdf',{type:'application/pdf'});
  try{
   if(await beforeAnalyze(file,{forceReview:true,deferredOnly:true,liveReadData:snapshot})){
    try{await app.applyReadSettings();}catch(error){active=snapshot;remember();throw error;}
   }
  }catch(error){app.setStatus('Korten kunde inte öppnas: '+error.message);}
 }
 function getCardNames(page){return [...new Set(cardsForPage(page).filter(card=>!card.sourceCardId).map(card=>card.originalCardCode||card.code).filter(Boolean))];}
 function getOriginalCardCode(page){const names=getCardNames(page);return names.length===1?names[0]:'';}
 function sameReadPlace(a,b){
  if(a.page!==b.page||!validPdfRect(a.rect)||!validPdfRect(b.rect))return false;
  const r=a.rect,s=b.rect,overlap=Math.max(0,Math.min(r[2],s[2])-Math.max(r[0],s[0]))*Math.max(0,Math.min(r[3],s[3])-Math.max(r[1],s[1]));
  return overlap/Math.max(.000001,Math.min((r[2]-r[0])*(r[3]-r[1]),(s[2]-s[0])*(s[3]-s[1])))>.55;
 }
 function getRemovedReadPositions(){return clone(active?.removedReadPositions||[]);}
 function removeReadPositions(positions){
  if(!active||!Array.isArray(positions)||!positions.length)throw Error('Välj positionen som ska tas bort.');
  const removed=positions.map(hit=>({id:String(hit.id||hit.positionId||''),page:Number(hit.page),code:norm(hit.code),rect:clone(hit.rect||[])}));
  const pageCount=window.SmartMatchAppBridge?.getPdf()?.numPages||Infinity;
  if(!validRemovedPositions({removedReadPositions:removed},pageCount))throw Error('Positionen saknar giltig placering på ritningen.');
  const next=clone(active);next.removedReadPositions=next.removedReadPositions||[];
  for(const hit of removed)if(!next.removedReadPositions.some(old=>old.id===hit.id||sameReadPlace(old,hit)))next.removedReadPositions.push(hit);
  for(const hit of next.matching?.hits||[])if(removed.some(item=>item.id===hit.positionId||sameReadPlace(item,hit)))hit.selected=false;
  active=next;remember();return {removed:clone(removed),count:removed.length};
 }
 function relinkReadPositions(positions,{reviewed=false}={}){
  if(!reviewed)throw Error('Den borttagna positionen måste granskas och väljas innan den kan kopplas igen.');
  if(!active||!Array.isArray(positions)||!positions.length)throw Error('Välj en tidigare borttagen position att koppla igen.');
  const requested=positions.map(hit=>({id:String(hit.id||''),page:Number(hit.page),code:norm(hit.code),rect:clone(hit.rect||[])}));
  const pageCount=window.SmartMatchAppBridge?.getPdf()?.numPages||Infinity;
  if(!validRemovedPositions({removedReadPositions:requested},pageCount)||new Set(requested.map(hit=>hit.id)).size!==requested.length)throw Error('Den borttagna positionen kunde inte återställas säkert. Sök igen.');
  const next=clone(active),restored=[];next.removedReadPositions=next.removedReadPositions||[];
  for(const requestedHit of requested){
   const old=next.removedReadPositions.find(item=>item.id===requestedHit.id&&item.page===requestedHit.page&&item.code===requestedHit.code&&item.rect.length===requestedHit.rect.length&&item.rect.every((value,index)=>value===requestedHit.rect[index]));
   if(!old)throw Error('Den borttagna positionen har ändrats. Sök igen innan du kopplar den.');
   restored.push(old);
  }
  // A reviewed relink becomes a new manual position in the app. Keep both the
  // tombstone and old automatic hit suppressed permanently. The live manual
  // position takes precedence in the review UI, while a later full scan still
  // cannot resurrect the old source as a duplicate.
  for(const hit of next.matching?.hits||[])if(restored.some(old=>old.id===hit.positionId||sameReadPlace(old,hit)))hit.selected=false;
  active=next;remember();return {restored:clone(restored),count:restored.length};
 }
 function getDrawingSample(){return active?.drawingSample?clone(active.drawingSample):null;}
 function setDrawingSample(sample){
  if(!active)throw Error('Öppna ett avläst projekt först.');
  if(!validDrawingSample(sample,window.SmartMatchAppBridge?.getPdf()?.numPages||Infinity))throw Error('Markera en giltig exempelstämpel på ritningen.');
  active.drawingSample=sample?clone(sample):null;remember();return getDrawingSample();
 }
 function updateGroupMapping({oldCode,code,drawingLabel,cardPage,cardCode,positions=[]}){
  if(!active||!active.matching)throw Error('Öppna ett avläst projekt först.');
  const before=norm(oldCode),normalized=norm(code),page=Number(cardPage),requested=norm(cardCode),pageCount=window.SmartMatchAppBridge?.getPdf()?.numPages||Math.max(...active.pages,...active.matching.hits.map(hit=>hit.page));
  if(!before||!normalized||!Number.isInteger(page)||page<1||page>pageCount||!Array.isArray(positions))throw Error('Välj en giltig grupp, beteckning och dörrkortssida.');
  const knownGroup=drawingCodes(active).includes(before)||active.matching.hits.some(hit=>hit.code===before);
  if(!knownGroup&&!positions.length)throw Error('Gruppen finns inte längre i projektet. Öppna gruppen igen.');
  const originals=cardsFrom(active).filter(card=>card.page===page&&!card.sourceCardId),targets=originals.filter(card=>!requested||norm(card.originalCardCode||card.code)===requested);
  if(targets.length!==1)throw Error('Välj exakt vilket ursprungligt dörrkort gruppen ska öppna.');
  const target=targets[0],oldMapping=groupMapping(active,before),previous=oldMapping?cardsFrom(active).find(card=>card.id===oldMapping.sourceCardId):cardsFrom(active).find(card=>card.code===before),previousSourceCardId=previous?.sourceCardId||previous?.id||'';
  const collision=normalized!==before&&drawingCodes(active).includes(normalized)&&(groupMapping(active,normalized)||cardsFrom(active).find(card=>card.code===normalized));
  const collisionSource=collision&&(collision.sourceCardId||collision.id);
  if(collision&&collisionSource!==target.id)throw Error('Den nya beteckningen tillhör redan ett annat dörrkort. Välj ett annat gruppnamn.');
  const requestedPositions=positions.map(hit=>({id:String(hit.id||hit.positionId||''),page:Number(hit.page),code:before,rect:clone(hit.rect||[])}));
  if(requestedPositions.length&&(!validRemovedPositions({removedReadPositions:requestedPositions},pageCount)||new Set(requestedPositions.map(hit=>hit.id)).size!==requestedPositions.length))throw Error('Gruppens positioner saknar giltiga och unika placeringar.');
  const sourceScopes=oldMapping?.sourceScopes?clone(oldMapping.sourceScopes):Object.fromEntries(groupSourceCodes(active,before).map(printed=>[printed,null]));
  if(!knownGroup){
   const underlying=active.matching.hits.filter(hit=>requestedPositions.some(position=>position.id===hit.positionId||sameReadPlace(position,hit)));
   if(underlying.length){for(const key of Object.keys(sourceScopes))delete sourceScopes[key];for(const hit of underlying){const printed=hit.drawingCode||hit.code;sourceScopes[printed]=[...(sourceScopes[printed]||[]),...requestedPositions.filter(position=>position.id===hit.positionId||sameReadPlace(position,hit))].filter((item,index,list)=>list.findIndex(other=>other.id===item.id)===index);}}
  }
  if(collision)for(const printed of groupSourceCodes(active,normalized)){
   const existingScope=groupMapping(active,normalized)?.sourceScopes?.[printed]||null;
   if(!(printed in sourceScopes))sourceScopes[printed]=clone(existingScope);
   else if(sourceScopes[printed]===null||existingScope===null)sourceScopes[printed]=null;
   else sourceScopes[printed]=[...sourceScopes[printed],...clone(existingScope)].filter((item,index,list)=>list.findIndex(other=>other.id===item.id)===index);
  }
  const printedCodes=Object.keys(sourceScopes);
  const next=clone(active),mapping={code:normalized,drawingLabel:clean(drawingLabel)||clean(code),sourceCardId:target.id,cardPage:target.page,originalCardCode:target.originalCardCode||target.code,sourceDrawingCodes:printedCodes,sourceScopes};
  next.groupMappings=next.groupMappings||{};delete next.groupMappings[before];next.groupMappings[normalized]=mapping;
  const renamed=new Set(next.renamedGroupCodes||[]);if(normalized!==before)renamed.add(before);renamed.delete(normalized);next.renamedGroupCodes=[...renamed];
  for(const hit of next.matching.hits){
   const exact=hit.positionId&&requestedPositions.find(item=>item.id===hit.positionId),geometric=exact?[]:requestedPositions.filter(item=>sameReadPlace(item,hit));
   if(hit.code!==before&&!exact&&!geometric.length)continue;
   if(!exact&&geometric.length>1)throw Error('Flera positioner överlappar på ritningen. Kontrollera placeringarna innan hela gruppen ändras.');
   const position=exact||geometric[0];
   if(position)hit.positionId=position.id;
   hit.drawingCode=hit.drawingCode||hit.code;hit.code=normalized;hit.cardPage=target.page;hit.originalCardCode=mapping.originalCardCode;hit.sourceCardId=target.id;hit.label=mapping.drawingLabel;
  }
  next.groupMappingHistory=[...(next.groupMappingHistory||[]),{oldCode:before,code:normalized,sourceCardId:target.id,previousSourceCardId,cardPage:target.page,originalCardCode:mapping.originalCardCode,changedAt:new Date().toISOString()}];
  if(!validDocumentData(next,pageCount))throw Error('Ändringen kunde inte sparas säkert. De tidigare kopplingarna är oförändrade.');
  active=next;remember();return {oldCode:before,code:normalized,drawingLabel:mapping.drawingLabel,cardPage:target.page,originalCardCode:mapping.originalCardCode,sourceCardId:target.id,previousSourceCardId,card:mappedCard(next,normalized,target.page),mapping:clone(mapping)};
 }
 async function ensureManualCard({code,page:cardPage,cardCode,drawingLabel,originalCardCode}){
  const app=window.SmartMatchAppBridge,pdf=app?.getPdf(),normalized=norm(code),requested=norm(cardCode||originalCardCode||'');
  if(!pdf||!normalized||!Number.isInteger(cardPage)||cardPage<1||cardPage>pdf.numPages)throw Error('Välj en giltig beteckning och dörrkortssida.');
  if(!active)throw Error('Välj Ändra förberedelse och koppla de befintliga dörrkorten först. Lägg sedan till saknade kopplingar.');
  const originals=cardsForPage(cardPage).filter(card=>!card.sourceCardId),matches=originals.filter(card=>norm(card.originalCardCode||card.code)===requested);
  if(requested&&originals.length&&matches.length!==1)throw Error('Välj exakt rätt ursprunglig beteckning på dörrkortssidan.');
  if(!requested&&originals.length>1)throw Error('Sidan innehåller flera dörrkort. Välj vilken ursprunglig beteckning som ska kopplas.');
  const known=matches[0]||originals[0]||null,existing=mappedCard(active,normalized)||cardsFrom(active).find(card=>card.code===normalized);
  if(existing){
   if(existing.page!==cardPage)throw Error(normalized+' är redan kopplad till sida '+existing.page+'. Befintliga kopplingar ändras inte.');
   if(known&&(existing.sourceCardId||existing.id)!==known.id)throw Error('Ritningsbeteckningen är redan kopplad till ett annat dörrkort på sidan.');
   return clone(existing);
  }
  const anchor=known?.codeRect||active?.pageOverrides?.[cardPage]?.code||active?.rects?.code||{x:0,y:0,w:1,h:.1};
  const id='manual-card:'+crypto.randomUUID(),name=known?.originalCardCode||known?.code||requested||normalized;
  const card=known?{...clone(known),id,code:normalized,originalCardCode:name,sourceCardId:known.id,drawingLabel:clean(drawingLabel)||clean(code),manualLink:true}:{id,page:cardPage,code:normalized,originalCardCode:name,drawingLabel:clean(drawingLabel)||clean(code),header:name,codeRect:clone(anchor),tableRect:null,rawTable:'',tableWords:[],work:[],workItems:[],workWarnings:[],workState:'pending',choices:[normalized],method:'Manuellt vald dörrkortssida',manualLink:true};
  active.cards[id]=card;active.pages=[...new Set([...active.pages,cardPage])].sort((a,b)=>a-b);if(card.workState==='pending')active.phase='codes';remember();return clone(card);
 }
 function addGeneratedCard(spec={}){
  if(!active)throw Error('Öppna ett färdigavläst projekt innan du skapar ett dörrkort.');
  const pdf=window.SmartMatchAppBridge?.getPdf?.(),page=Number(spec.page),code=norm(spec.code),name=clean(spec.originalCardCode||spec.name||spec.code),description=clean(spec.description||'');
  if(!pdf||!Number.isInteger(page)||page<1||page>pdf.numPages)throw Error('Den skapade dörrkortssidan saknas i projekt-PDF:en.');
  if(!code||!name)throw Error('Ange beteckningen på ritningen och dörrkortets namn.');
  if(cardsFrom(active).some(card=>!card.sourceCardId&&card.code===code))throw Error(code+' har redan ett dörrkort i projektet.');
  const sectionNames={'daglasning':'Daglåsning','nattlasning':'Nattlåsning','ovrig-utrustning':'Övrig utrustning','larm-passer':'Larm-Passer'},sourceRows=Array.isArray(spec.rows)?spec.rows:[];
  if(!sourceRows.length||sourceRows.length>18)throw Error('Lägg till mellan 1 och 18 fullständiga rader på dörrkortet.');
  const used=new Set(),rows=sourceRows.map((source,index)=>{
   const id=clean(source?.id)||'generated-row:'+crypto.randomUUID(),sectionKey=String(source?.sectionKey||''),section=sectionNames[sectionKey],label=clean(source?.label),value=clean(source?.value),installer=clean(source?.installer||source?.responsibility).toLocaleUpperCase('sv-SE'),quantity=Math.max(1,Math.min(999,Math.round(Number(source?.quantity)||1)));
   if(used.has(id))throw Error('Två dörrkortsrader har samma identitet. Ta bort dubbletten och försök igen.');used.add(id);
   if(!section||!label||!installer||label.length>120||value.length>160||installer.length>24)throw Error('Kontrollera avsnitt, benämning, typ och vem som monterar på rad '+(index+1)+'.');
   return {id,key:id,sectionKey,section,label,value,quantity,installer,responsibility:installer,text:[label,value].filter(Boolean).join(' · ')};
  });
  const gsRows=rows.filter(row=>norm(row.installer)==='GS'),workItems=gsRows.map((row,index)=>({
   key:row.id,text:row.text,legacyText:row.text,label:row.label,value:row.value,quantity:row.quantity,section:row.section,sectionKey:row.sectionKey,
   tableIndex:index,sourceRow:index+1,sourceIdentity:'generated:'+row.id,responsibility:'GS',installer:'GS',actionable:true,administrative:false
  })),work=workItems.map(row=>row.text),createdAt=new Date().toISOString(),id=clean(spec.id)||'generated-card:'+crypto.randomUUID();
  if(cardsFrom(active).some(card=>card.id===id)||deferredFrom(active).some(card=>card.id===id))throw Error('Dörrkortet finns redan. Stäng dialogen och öppna kopplingen igen.');
  const codeRect={x:.06,y:.045,w:.88,h:.10},tableRect={x:.05,y:.20,w:.90,h:.68},bounds={x:.04,y:.035,w:.92,h:.90};
  const generatedCard={schema:1,id,generated:true,createdAt,updatedAt:createdAt,fields:{drawingCode:code,doorNumber:name,description},rows:clone(rows)};
  const card={id,page,code,originalCardCode:name,header:'Dörrkort '+name,description,codeRect,tableRect,bounds,
   rawTable:rows.map(row=>[row.section,row.label,row.value,'Antal '+row.quantity,row.installer].filter(Boolean).join(' · ')).join('\n'),tableWords:[],
   products:clone(rows),work,workItems,workWarnings:gsRows.length?[]:['Kortet har inga rader som monteras av GS.'],workPolicy:'generated-v1',workState:'ready',choices:[code],
   method:'Skapat i SmartMatch',confidence:100,generated:true,generatedRows:clone(rows),generatedCard,createdAt,updatedAt:createdAt};
  const next=clone(active);next.cards=next.cards||{};next.cards[id]=card;next.pages=[...new Set([...(next.pages||[]),page])].sort((a,b)=>a-b);
  if(!validDocumentData(next,pdf.numPages))throw Error('Det skapade dörrkortet kunde inte verifieras. Projektet har inte ändrats.');
  active=next;remember();return clone(card);
 }
 function restoreReadData(data){active=data?clone(data):null;if(active)remember();}
 function protocolDef(code,page){
  const card=cardFor(code,page);if(!card)return null;
  if(card.workState==='pending')return {code,page,lines:[],checks:[],pending:true,workState:'pending',generated:!!card.generated};
  const lines=card.work.map((text,i)=>{const item=card.workItems?.[i],aligned=item?.text===text;return {key:aligned&&item.key||rowKey(text,i),text,label:aligned?item.label:text,value:aligned?item.value||'':'',quantity:aligned?Math.max(1,Math.min(999,Math.round(Number(item.quantity)||1))):1,displayText:aligned&&item.value?item.value:text,section:aligned?item.section||'Arbetslista':'Arbetslista',sectionKey:aligned?item.sectionKey||'arbetslista':'arbetslista',actionable:true,administrative:false};});
  return {code,page,lines,checks:lines,workState:'ready',generated:!!card.generated};
 }
 function checksForPosition(o){return active?.checks?.[o.id]||{};}
 function replacePositionChecks(id,checks){
  if(!active||typeof id!=='string'||!id||!checks||typeof checks!=='object'||Array.isArray(checks)||Object.values(checks).some(value=>typeof value!=='boolean'))throw Error('Kontrollpunkterna kunde inte återställas säkert.');
  active.checks=active.checks||{};active.checks[id]=clone(checks);remember();return clone(active.checks[id]);
 }
 function syncChecks(o){
  const page=window.SmartMatchAppBridge?.getDoorCardMapping()?.[o.code],def=protocolDef(o.code,page);if(!def||!active)return;
  active.checks=active.checks||{};const checks=active.checks[o.id]=active.checks[o.id]||{};
  for(const line of def.checks)checks[line.key]=!!o.checks?.[line.key];
  remember();
 }
 function appendProducts(root,card){
  const products=card.products||[];if(!products.length)return;
  const details=document.createElement('details');details.className='rtProductInventory';
  const summary=document.createElement('summary');summary.textContent='Avlästa produkter · '+products.length;details.open=root.classList.contains('rtResult');details.append(summary);
  const note=document.createElement('p');note.textContent='GS i Lev av eller Mont av ger kontrollpunkter. Produkten tas med en gång även om båda visar GS.';details.append(note);
  const wrap=document.createElement('div');wrap.style.overflowX='auto';const table=document.createElement('table');table.style.cssText='border-collapse:collapse;width:100%;font-size:12px';table.setAttribute('aria-label','Avlästa produkter på dörrkortet');
  const head=document.createElement('tr');for(const title of ['Kategori / grupp','Produkt / modell','Antal','Lev av','Mont av']){const cell=document.createElement('th');cell.textContent=title;cell.style.cssText='text-align:left;padding:6px';head.append(cell);}table.append(head);
  for(const original of products){const product=root.id==='pwChecklist'&&original.responsibility==='GS'?(window.SmartMatchAppBridge?.resolveProjectProduct?.(original)||original):original;const row=document.createElement('tr');row.dataset.installer=product.responsibility==='GS'?'gs':product.responsibility?'other':'missing';for(const value of [[product.label,product.section].filter(Boolean).join(' · '),product.value,product.quantity||'—',product.delivery||'—',product.installer??product.responsibility??'—']){const cell=document.createElement('td');cell.textContent=value??'';cell.style.cssText='padding:6px;border-top:1px solid #cbd5df';row.append(cell);}table.append(row);}
  wrap.append(table);details.append(wrap);root.append(details);
 }
 function appendTable(root,code,page){
  const card=cardFor(code,page);if(!card||card.workState==='pending')return;
  appendProducts(root,card);
  const details=document.createElement('details');details.className='rtTableUnderlay';const summary=document.createElement('summary');summary.textContent='Hela avlästa tabellen · eget läsområde';const pre=document.createElement('pre');pre.textContent=card.rawTable||'Ingen tabelltext kunde läsas.';details.append(summary,pre);root.append(details);
 }
 function workProgress(o){
  const page=window.SmartMatchAppBridge?.getDoorCardMapping()?.[o.code],def=protocolDef(o.code,page);
  if(!def)return null;
  if(def.pending)return {done:0,total:0,percent:0,pending:true};
  const checks=active.checks?.[o.id]||{},total=def.lines.length,done=def.lines.filter(line=>checks[line.key]).length;
  const state=window.SmartMatchAppBridge?.readWorkState?.(o);
  return {done:state?.done??done,total:state?.total??total,percent:state?.percent??(total?Math.round(done/total*100):0)};
 }
 function updateBadges(){
  const app=window.SmartMatchAppBridge;if(!app)return;
  for(const button of document.querySelectorAll('#pwMarkers [data-position-id]')){
   const o=app.getPositions().find(p=>p.id===button.dataset.positionId),state=o&&workProgress(o);if(!state)continue;
   let badge=button.querySelector('.rtWorkBadge');if(!badge){badge=document.createElement('span');badge.className='rtWorkBadge';button.append(badge);}
   badge.textContent='Arbete '+state.done+'/'+state.total;
  }
  const states=app.getPositions().map(workProgress).filter(Boolean),summary=$('rtWorkSummary');
  if(summary)summary.textContent=states.length?'Arbete: '+states.filter(s=>s.total&&s.done===s.total).length+'/'+states.length+' dörrar klara':'';
 }
 function renderWork(root,o,page){
  const def=protocolDef(o.code,page),custom=!!def;
  for(const id of ['pwChecklistMarkAll','pwChecklistClearAll','pwAddChecklistItem'])if($(id))$(id).hidden=custom;
  if(!custom)return false;
  if(def.pending){
   const p=document.createElement('p');p.className='rtInternalNote';p.textContent='Produkter har inte lästs ännu. Kopplingen till dörrkortet är sparad.';
   const button=document.createElement('button');button.type='button';button.textContent='Fortsätt med produkter';button.onclick=()=>void continueProducts();root.append(p,button);
   $('pwChecklistMeta').textContent='Arbetslista ej läst';$('pwProtocolPercent').textContent='Ej läst';$('pwProtocolBar').style.width='0%';return true;
  }
  appendTable(root,o.code,page);active.checks=active.checks||{};
  const caption=document.createElement('p');caption.className='rtInternalNote';caption.textContent='Arbetslista · endast i appen. Klar-markeringarna hör till den här dörren.';root.append(caption);
  const redraw=()=>{const state=workProgress(o);$('pwChecklistMeta').textContent=state.done+' av '+state.total+' klara';$('pwProtocolPercent').textContent=state.percent+'% arbete';$('pwProtocolBar').style.width=state.percent+'%';updateBadges();};
  const groups=new Map();
  for(const line of def.lines){
   const labelText=line.displayText||line.value||line.text;
   const groupKey=line.sectionKey||'arbetslista';
   if(!groups.has(groupKey)){
    const section=document.createElement('section');section.className='rtWorkSection';section.dataset.sectionKey=groupKey;
    const heading=document.createElement('h3');heading.className='rtWorkSectionTitle';heading.textContent=line.section||'Arbetslista';section.append(heading);root.append(section);groups.set(groupKey,section);
   }
   const label=document.createElement('label');label.className='rtWorkRow';const check=document.createElement('input');check.type='checkbox';check.checked=!!active.checks[o.id]?.[line.key];check.setAttribute('aria-label','Klar: '+labelText);
   check.setAttribute('aria-label','Klar: '+[line.label,line.value].filter(Boolean).join(' · '));
   const text=document.createElement('span');text.className='rtWorkValue';text.textContent=labelText;const tag=document.createElement('strong');tag.textContent='Klar';label.append(check,text,tag);groups.get(groupKey).append(label);
   check.onchange=async()=>{check.disabled=true;try{active.checks[o.id]=active.checks[o.id]||{};active.checks[o.id][line.key]=check.checked;remember();await window.SmartMatchAppBridge.setReadWorkCheck(o,line.key,check.checked);redraw();}catch(error){window.SmartMatchAppBridge.setStatus('Arbetsstatus kunde inte sparas: '+error.message);}finally{check.disabled=false;}};
  }
  if(!def.lines.length){const p=document.createElement('p');p.textContent='Inga arbetsrader valda. Välj Ändra förberedelse för att justera provläsningen.';root.append(p);}
  redraw();return true;
 }
 window.addEventListener('pagehide',()=>void release());
 window.addEventListener('DOMContentLoaded',()=>{
  $('rtChooseFiles')?.addEventListener('click',()=>$('rtMultiFiles').click());
  $('rtMultiFiles')?.addEventListener('change',async e=>{
   const files=[...e.target.files];e.target.value='';if(!files.length)return;
   try{
    let file=files[0];
    if(files.length>1){
     window.SmartMatchAppBridge.setStatus('Öppnar PDF-filerna tillsammans…');
     const merged=await PDFLib.PDFDocument.create();
     for(const input of files){const source=await PDFLib.PDFDocument.load(await input.arrayBuffer());for(const pg of await merged.copyPages(source,source.getPageIndices()))merged.addPage(pg);}
     file=new File([await merged.save()], 'Ritning-och-dorrkort-test.pdf',{type:'application/pdf'});
    }
    await window.SmartMatchAppBridge.openReadFile(file,{readTestIntent:'prepare'});
   }catch(error){window.SmartMatchAppBridge.setStatus('PDF-filerna kunde inte öppnas: '+error.message);}
  });
  $('rtMenuProducts')?.addEventListener('click',()=>{const menu=$('pwToolMenu');if(menu)menu.hidden=true;void continueProducts({reread:true});});
  const markers=$('pwMarkers');if(markers)new MutationObserver(updateBadges).observe(markers,{childList:true});for(const id of ['rtOpenSettings','rtMenuSettings','rtEditPreparation'])$(id)?.addEventListener('click',()=>{const menu=$('pwToolMenu');if(menu)menu.hidden=true;void openSettings().catch(e=>window.SmartMatchAppBridge?.setStatus(e.message));});});
 window.SmartMatchReadTest=Object.freeze({beforeAnalyze,getSavedCardIndex,getReadStampIndex:()=>clone(annotationIndex||[]),takePreparedOpen,discardPreparedOpen,openSettings,continueProducts,rereadCard,openDeferredCards,getDeferredCardCount,getAllCardPages:()=>allCardPages(active),canOpenSavedProject:reviewedData,ensureManualCard,addGeneratedCard,updateGroupMapping,getRemovedReadPositions,removeReadPositions,relinkReadPositions,getDrawingSample,setDrawingSample,getCardNames,getOriginalCardCode,restoreReadData,hasPendingProducts:()=>cardsFrom(active).some(c=>c.workState==='pending')||!!Object.keys(active?.pendingWorkCards||{}).length,parsePages,candidates,workRows,cardFor,cardRegion:(code,page)=>cardFor(code,page)?.bounds||null,cardDisplayRegion,setCardDisplayRegion,isCardPage:p=>allCardPages(active).includes(Number(p)),identityForPage:p=>{const c=cardsForPage(p)[0];return c?{code:c.code,row:c.header,area:'known-layout-card-heading',profileId:'user-selected-read-test-v9'}:null;},identitiesForPage:p=>cardsForPage(p).map(c=>({code:c.code,row:c.header,area:'known-layout-card-heading',profileId:'user-selected-read-test-v9',cardId:c.id})),drawingSelection:()=>active?.matching?.version===2?{codes:[...new Set([...drawingCodes(active),...(active.renamedGroupCodes||[])])],positions:clone(active.matching.hits.filter(h=>h.selected!==false&&!active.removedReadPositions?.some(removed=>sameReadPlace(removed,h))))}:null,protocolDef,checksForPosition,replacePositionChecks,syncChecks,appendTable,renderWork,payload:()=>active?clone(active):null});
})();
