/* Discovery must bound OCR to the chosen source frame and native card
 * evidence, while retaining the explicit legacy image-search policy. */
'use strict';
const assert=require('node:assert/strict');
const {discover}=require('../smartmatch-read-codes-v7.js');
const codeRect={x:.05,y:.08,w:.25,h:.045},tableRect={x:.05,y:.18,w:.3,h:.22};
function item(str,x,y,h=.014,w=.12){
 return {str,width:w*1000,height:h*1000,transform:[h*1000,0,0,h*1000,x*1000-w*500,1000-y*1000-h*500]};
}
function card(code,dx=0,dy=0,products=['Produkt ABC','Produkt DEF','Produkt GHI']){
 const at=(text,x,y)=>item(text,x+dx,y+dy);
 return [...(code?[at(code,.175,.1)]:[]),at('UTRUSTNING',.12,.21),at(products[0],.2,.235),
  at('DRIVNING',.12,.275),at(products[1],.2,.3),at('SIGNALER',.12,.34),at(products[2],.2,.365)];
}
function pdfFor(pages,{directText=true}={}){
 const textCalls=[];
 return {numPages:pages.length,textCalls,async getPage(pageNumber){return {
  pageNumber,getViewport:()=>({width:1000,height:1000,transform:[1,0,0,-1,0,1000],convertToViewportPoint:(x,y)=>[x,1000-y]}),
  async getTextContent(){assert(directText,'the configured text provider should be used instead of another page read');textCalls.push(pageNumber);return {items:pages[pageNumber-1]};}
 };}};
}
const inputFor=pdf=>({pdf,examplePage:2,codeRect,tableRect});
const drawing=[item('Skola',.8,.08),item('Ritning Plan Skala',.2,.3),item('UTRUSTNING',.8,.8),item('DRIVNING',.8,.2)];
const pages=[drawing,card('GS51'),[...card(''),...card('',.48,.03)],[]];
function fallback(calls){return async({pageNumber,kind,rect})=>{
 calls.push({pageNumber,kind,rect:{...rect}});
 if(kind==='table')return {text:pageNumber===1?'Skola Ritning\nPlan Skala':'UTRUSTNING\nProdukt ABC\nDRIVNING\nProdukt DEF\nSIGNALER\nProdukt GHI',confidence:99};
 const code=pageNumber===2?'GS51':pageNumber===3?(rect.x>.4?'GS53':'GS52'):pageNumber===4?'GS54':'SKOLA1';
 return {text:code,ids:[code],confidence:99};
};}
const proposed=result=>result.cards.filter(card=>card.status==='proposed').map(card=>card.code).sort();
function closeRect(actual,expected){
 for(const axis of ['x','y','w','h'])assert(Math.abs(actual[axis]-expected[axis])<1e-9,'fallback must use the actual selected/discovered '+axis+' coordinate');
}
(async()=>{
 const noneCalls=[],nonePdf=pdfFor(pages);
 const none=await discover({...inputFor(nonePdf),fallbackPolicy:'none',readFallback:fallback(noneCalls)});
 assert.deepEqual(noneCalls,[],'strict native text discovery never invokes the image adapter');
 assert.deepEqual(proposed(none),['GS51'],'missing raster codes remain unresolved instead of silently invoking OCR');
 assert(none.unresolvedPages.includes(3)&&none.unresolvedPages.includes(4),'unreadable card codes and wholly scanned pages remain visible for review');
 assert.deepEqual(nonePdf.textCalls.sort(),[1,2,3,4],'native content is read once per source page');

 const autoCalls=[];
 const auto=await discover({...inputFor(pdfFor(pages)),fallbackPolicy:'matching-tables',readFallback:fallback(autoCalls)});
 assert.deepEqual(proposed(auto),['GS51','GS52','GS53'],'native repeated tables locate independent cards whose code is an image');
 assert(autoCalls.length===2&&autoCalls.every(call=>call.pageNumber===3&&call.kind==='code'),
  'automatic fallback only OCRs the missing codes of real matching card tables, never the drawing or an unknown scanned page');
 closeRect(autoCalls.find(call=>call.rect.x<.4).rect,codeRect);
 closeRect(autoCalls.find(call=>call.rect.x>.4).rect,{...codeRect,x:codeRect.x+.48,y:codeRect.y+.03});
 assert(auto.unresolvedPages.includes(4),'an unsearched raster-only page is not declared read');

 const exampleCalls=[],examplePages=[drawing,[]];
 const example=await discover({...inputFor(pdfFor(examplePages)),fallbackPolicy:'matching-tables',readFallback:fallback(exampleCalls)});
 assert.deepEqual(proposed(example),['GS51'],'the selected example can be image-read when no native text exists');
 assert.deepEqual(exampleCalls.map(call=>[call.pageNumber,call.kind]),[[2,'code'],[2,'table']],
  'only the explicit example frame is image-read on an otherwise unknown PDF');
 closeRect(exampleCalls[0].rect,codeRect);closeRect(exampleCalls[1].rect,tableRect);

 const allCalls=[];
 const all=await discover({...inputFor(pdfFor(pages)),fallbackPolicy:'all',readFallback:fallback(allCalls)});
 assert.deepEqual(proposed(all),['GS51','GS52','GS53','GS54'],'the old full fallback policy still discovers a scanned same-frame card');
 assert(allCalls.some(call=>call.pageNumber===1),'explicit legacy search still attempts the drawing source frame');
 assert(allCalls.some(call=>call.pageNumber===4&&call.kind==='code')&&allCalls.some(call=>call.pageNumber===4&&call.kind==='table'),
  'full fallback reads both selected fields on an image-only card page');
 for(const call of allCalls.filter(call=>call.pageNumber===4))closeRect(call.rect,call.kind==='code'?codeRect:tableRect);
 const defaultCalls=[];
 const defaultResult=await discover({...inputFor(pdfFor(pages)),readFallback:fallback(defaultCalls)});
 assert.deepEqual(proposed(defaultResult),proposed(all),'omitting fallbackPolicy retains the legacy all policy');
 assert.deepEqual(defaultCalls,allCalls);

 const providerPages=[drawing,card('GS61')],providerCalls=[],providerPdf=pdfFor(providerPages,{directText:false});
 const providerResult=await discover({...inputFor(providerPdf),fallbackPolicy:'none',
  getTextContent:async page=>{providerCalls.push(page.pageNumber);return {items:providerPages[page.pageNumber-1]};},
  readFallback:async()=>{throw Error('strict text mode must not invoke fallback');}});
 assert.deepEqual(proposed(providerResult),['GS61']);assert.deepEqual(providerCalls.sort(),[1,2],
  'the shared native-text provider receives each page once, including the example');

 const structuralCalls=[],structuralPages=[drawing,
  card('GS61',0,0,['Koppar Silver Guld','Rostfri Mässing Aluminium','Marmor Glas Trä']),
  card('',.48,.03,['Växellåda Motor Styrning','Larm Relä Central','Kamera Sensor Knapp'])];
 const structural=await discover({...inputFor(pdfFor(structuralPages)),fallbackPolicy:'matching-tables',readFallback:async request=>{
  structuralCalls.push(request);assert.equal(request.pageNumber,3);assert.equal(request.kind,'code');assert(request.rect.x>.4);
  return {text:'GS62',ids:['GS62'],confidence:99};
 }});
 assert.deepEqual(proposed(structural),['GS61','GS62'],
  'three coherent repeated headings allow missing-code OCR even when every product description differs');
 assert.equal(structuralCalls.length,1,'only the shifted card code needs fallback');
 const structuralCard=structural.cards.find(card=>card.code==='GS62');
 assert(structuralCard.evidence.structural&&structuralCard.evidence.tableOverlap<.35,
  'structural card evidence uses the same criterion for discovery and bounded image fallback');

 console.log('PASS TEST 7 discovery: strict text never OCRs; automatic OCR only selected example or matching native cards; moved-card coordinates, explicit legacy fallback and shared text provider retained');
})().catch(error=>{console.error(error);process.exitCode=1;});
