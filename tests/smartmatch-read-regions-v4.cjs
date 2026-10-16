'use strict';
const assert=require('node:assert/strict');
const {normalize,candidates,discover}=require('../smartmatch-read-codes-v4.js');

for(const [text,expected]of [
 ['KLASSRUM 1','KLASSRUM1'],['Klassrum 27','KLASSRUM27'],['Verkstad 83B','VERKSTAD83B'],
 ['Dörr D01','D01'],['Dörrkort 140 C','140C'],['Toalett 140C','140C'],['GS 47','GS47'],['HWC','HWC']
])assert.deepEqual(candidates(text),[expected],text+' preserves the selected full identity');
assert.equal(normalize('KLASSRUM 1'),'KLASSRUM1');
assert.equal(normalize('WC A'),'');
assert.deepEqual(candidates('GS1 Dörr D03'),['GS1','D03'],'a whole header with two IDs still needs review');

const codeRect={x:.05,y:.08,w:.25,h:.045},tableRect={x:.05,y:.18,w:.3,h:.22};
function item(str,x,y,h=.014,w=.12){
 return {str,width:w*1000,height:h*1000,transform:[h*1000,0,0,h*1000,x*1000-w*500,1000-y*1000-h*500]};
}
function card(code,dx=0,dy=0,scale=1,value='Produkt'){
 const at=(text,x,y)=>item(text,x*scale+dx,y*scale+dy,.014*scale,.12*scale);
 return [at(code,.175,.1),at('UTRUSTNING',.12,.21),at(value+' ABC',.2,.235),at('DRIVNING',.12,.275),at(value+' DEF',.2,.3),at('SIGNALER',.12,.34),at(value+' GHI',.2,.365)];
}
function pdfFor(pages){
 return {numPages:pages.length,getPage:async n=>({
  getViewport:()=>({width:1000,height:1000,transform:[1,0,0,-1,0,1000],convertToViewportPoint:(x,y)=>[x,1000-y]}),
  getTextContent:async()=>({items:pages[n-1]})
 })};
}
(async()=>{
 const pages=[
  [item('KLASSRUM 1',.2,.1),item('UTRUSTNING',.8,.2),item('DRIVNING',.1,.8)],
  [...card('KLASSRUM 1'),...card('GS91',.48,.03,1,'Annat'),...card('HWC',.1,.5,1,'Tredje')],
  [...card('Dörr D68',.4,.45,1,'Fjärde')],
  [...card('Verkstad 83B',.15,.15,.7,'Femte')]
 ];
 const pdf=pdfFor(pages),input={pdf,examplePage:2,codeRect,tableRect};
 const found=await discover(input),proposed=found.cards.filter(card=>card.status==='proposed');
 assert.deepEqual(proposed.map(card=>card.code),['KLASSRUM1','GS91','HWC','D68','VERKSTAD83B'],'all moved/scaled card regions are read, not one per page');
 assert.deepEqual(found.cardPages,[2,3,4],'card page numbers remain a unique legacy-compatible list');
 assert.equal(found.pages.length,4,'page overview keeps one entry per PDF page');
 assert.equal(found.pages[1].cardCount,3);
 assert.equal(proposed.filter(card=>card.page===1).length,0,'a drawing with disconnected shared words is not a card');
 assert.equal(new Set(proposed.map(card=>card.id)).size,5,'independent card regions never overwrite one another');
 for(const card of proposed){
  assert(card.codeRect&&card.tableRect&&card.bounds);
  assert(card.bounds.x<=card.codeRect.x&&card.bounds.y<=card.codeRect.y);
  assert(card.bounds.x+card.bounds.w>=card.tableRect.x+card.tableRect.w-.00001);
  assert(card.bounds.y+card.bounds.h>=card.tableRect.y+card.tableRect.h-.00001);
  if(card.code!=='KLASSRUM1')assert(card.evidence.anchorWords>=2,'other regions need two distinct example anchors');
 }
 const repeated=await discover(input);
 assert.deepEqual(repeated.cards.map(card=>card.id),found.cards.map(card=>card.id),'region IDs are stable between runs');
 const differentProducts=(code,dx,products)=>card(code,dx).map((word,index)=>[2,4,6].includes(index)?{...word,str:products[[2,4,6].indexOf(index)]}:word);
 const structural=await discover({pdf:pdfFor([[
  ...differentProducts('A91',0,['Koppar Silver Guld','Rostfri Mässing Aluminium','Marmor Glas Trä']),
  ...differentProducts('B82',.5,['Växellåda Motor Styrning','Larm Relä Central','Kamera Sensor Knapp'])
 ]]),examplePage:1,codeRect,tableRect});
 const changedProductCard=structural.cards.find(card=>card.code==='B82');
 assert.equal(changedProductCard?.status,'proposed','coherent example headings locate cards even when every product differs');
 assert(changedProductCard.evidence.tableOverlap<.35&&changedProductCard.evidence.structural,'structural evidence does not require repeating product descriptions');
 const ambiguous=await discover({pdf:pdfFor([[...card('GS91 Dörr D68')]]),examplePage:1,codeRect,tableRect});
 assert.deepEqual(ambiguous.cardPages,[],'conflicting example IDs cannot establish verified card proposals');
 assert(ambiguous.cards.some(card=>card.status==='unresolved'&&card.ambiguous));

 // Existing callback-backed single-card readers and image-only same-frame
 // OCR stay usable. New region discovery does not invent unseen scan layouts.
 const single=[{code:'Dörrkort 482C',table:'Komponent Produkt\nLåshus ASSA\nCylinder Trio'},
  {code:'Toalett 271B',table:'Komponent Produkt\nTrycke ASSA\nCylinder Trio'},
  {code:'482C',table:'Sovrum Hall\nPlanritning Skala'}];
 const callback=await discover({pdf:pdfFor([[],[],[]]),examplePage:1,codeRect,tableRect,readNative:async({pageNumber,kind})=>single[pageNumber-1][kind]});
 assert.deepEqual(callback.cardPages,[1,2]);assert.equal(callback.cards.filter(card=>card.status==='proposed').length,2);
 assert.deepEqual(callback.excludedPages,[3]);
 const scanned=await discover({pdf:pdfFor([[],[],[]]),examplePage:1,codeRect,tableRect,
  readFallback:async({pageNumber,kind})=>kind==='table'?{text:'Komponent Produkt\nCylinder ASSA GS',confidence:95}:
   {text:'Dörrkort '+(700+pageNumber)+'B',ids:pageNumber===3?[]:[(700+pageNumber)+'B'],confidence:pageNumber===3?20:95}});
 assert.deepEqual(scanned.cardPages,[1,2]);assert.deepEqual(scanned.unresolvedPages,[3]);
 assert(scanned.cards.every(card=>!card.hasNative),'OCR evidence is never mislabeled as native text');
 const abort=new AbortController();abort.abort();
 await assert.rejects(discover({...input,signal:abort.signal}),{name:'AbortError'});
 console.log('PASS TEST 4 repeated card regions, moved/scaled examples, full identities, conflicts, drawing exclusion, stable region IDs and single-card OCR compatibility');
})().catch(error=>{console.error(error);process.exitCode=1;});
