'use strict';
const assert=require('node:assert/strict');
const {normalize,candidates,extract,discover}=require('../smartmatch-read-codes-v9.js');

for(const [raw,expected]of [
 ['GS 23','GS23'],['GS23','GS23'],['DBLB OPPSD','DBLBOPPSD'],['DBLb-OPPS','DBLBOPPS'],
 ['DBL-DS','DBLDS'],['DBL - DS','DBLDS'],['Beslagskod: DBLB upp SD','DBLBUPPSD'],
 ['Dörrkort 140 C','140C'],['Dörrkort Teknik Kontor','TEKNIKKONTOR'],['WC A','WCA'],
 ['Beslagskod DBL-DS','DBLDS'],['Beslagskod GS 23','GS23'],['Dorrkort140C','140C']
]){
 assert.equal(normalize(raw),expected,raw);
 assert.deepEqual(candidates(raw),[expected],raw);
}
assert.notEqual(normalize('DBLB OPPSD'),normalize('DBLb-OPPS'),'real letter differences remain different');
assert.deepEqual(candidates('Dörrkort 140C / 130C'),['140C','130C']);
assert.deepEqual(candidates('GS23; DBL-DS'),['GS23','DBLDS']);
assert.equal(extract('140C 130C').code,'','two separately numbered identities require a decision');
assert.equal(normalize('Dörrkort'),'');

const codeRect={x:.08,y:.06,w:.7,h:.08},tableRect={x:.08,y:.2,w:.8,h:.5};
const pageData=[
 {size:[595,842],code:'Beslagskod: DBLB OPPSD'},
 {size:[595,842],code:'Beslagskod: GS 23'},
 {size:[9500,4700],code:'GS23'}, // A huge drawing must never become a card OCR job.
 {size:[595,842],code:''},
 {size:[595,842],code:'DBL-DS'},
 {size:[595,842],code:''}
];
const textCalls=[],nativeCalls=[];
const pdf={numPages:pageData.length,async getPage(pageNumber){return {number:pageNumber,
 getViewport(){const [width,height]=pageData[pageNumber-1].size;return {width,height};},
 async getTextContent(){textCalls.push(pageNumber);return {items:[]};}};}};
const fallbacks=[];
const readNative=async({pageNumber,kind})=>{assert.equal(kind,'code','identifier-only must never ask for table text');nativeCalls.push(pageNumber);return pageData[pageNumber-1].code;};
const readFallback=async({pageNumber,kind,rect})=>{
 assert.equal(kind,'code');assert.deepEqual(rect,codeRect);fallbacks.push(pageNumber);
 return pageNumber===4?{text:'Beslagskod: NY BETECKNING',confidence:96}:{text:'Otydlig etikett',confidence:20};
};
(async()=>{
 const result=await discover({pdf,examplePage:1,rects:{code:codeRect},codeOnly:true,readNative,readFallback});
 assert.equal(result.codeOnly,true);
 assert.deepEqual(result.cardPages,[1,2,4,5]);
 assert.deepEqual(result.excludedPages,[3]);
 assert.deepEqual(result.unresolvedPages,[6]);
 assert(!textCalls.includes(3),'the differently sized drawing is excluded before native text extraction');
 assert(!nativeCalls.includes(3),'the code-field adapter is also skipped for a differently sized drawing');
 assert.deepEqual(fallbacks,[4,6],'only matching-size code fields use crop OCR');
 assert.equal(result.cards.find(card=>card.page===4).code,'NYBETECKNING');
 assert(result.cards.every(card=>card.workDeferred&&card.codeOnly&&card.tableRect===null&&card.tableText===''));
 assert.deepEqual(result.example.bounds,{x:0,y:0,w:1,h:1},'one-card-per-page fast path keeps the whole card available');

 fallbacks.length=0;
 const textOnly=await discover({pdf,examplePage:1,codeRect,codeOnly:true,readNative,readFallback,fallbackPolicy:'none'});
 assert.deepEqual(textOnly.cardPages,[1,2,5]);assert.deepEqual(fallbacks,[]);

 textCalls.length=0;nativeCalls.length=0;
 const chosen=await discover({pdf,examplePage:1,codeRect,codeOnly:true,codePages:[1,3],readNative,readFallback});
 assert.deepEqual(chosen.pages.map(page=>page.page),[1,3]);
 assert.deepEqual(chosen.cardPages,[1,3],'explicit card-page choices allow another sheet size');
 assert.deepEqual(textCalls,[1,3]);assert.deepEqual(nativeCalls,[1,3],'manually selected pages still read their code fields');

 const controller=new AbortController();controller.abort();
 await assert.rejects(discover({pdf,examplePage:1,codeRect,codeOnly:true,signal:controller.signal}),{name:'AbortError'});
 await assert.rejects(discover({pdf,examplePage:1,codeOnly:true}),/Markera/);

 // The previous full/table discovery remains an independent available path.
 const fullData=[
  {code:'DBL-DS',table:'Komponent Produkt Ansvar\nLashus ASSA GS\nCylinder TRIO GS'},
  {code:'DBLB OPPSD',table:'Komponent Produkt Ansvar\nTrycke Hoppe GS\nCylinder ASSA GS'},
  {code:'GS23',table:'Sovrum Hall Korridor\nPlanritning Skala 1:100'}
 ];
 const full=await discover({pdf:{numPages:3,getPage:page=>pdf.getPage(page)},examplePage:1,codeRect,tableRect,
  readNative:async({pageNumber,kind})=>fullData[pageNumber-1][kind]});
 assert.deepEqual(full.cardPages,[1,2]);assert.deepEqual(full.excludedPages,[3]);
 console.log('PASS TEST 9 identifiers: compound labels, actual-letter differences, code-only crops, text-only, manual page selection, no table reads, preserved full path');
})().catch(error=>{console.error(error);process.exitCode=1;});
