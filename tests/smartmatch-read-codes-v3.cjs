const assert=require('node:assert/strict');
const {normalize,candidates,extract,discover}=require('../smartmatch-read-codes-v3.js');

for(const [heading,code]of [
 ['Dörrkort 140C','140C'],['Dorrkort 140 C','140C'],['Toalett 140C','140C'],
 ['Toalett 271B','271B'],['Dorrkort 482C','482C'],['Beslagskort Studio','STUDIO'],
 ['Dörrkort Kontor','KONTOR'],['Teknik','TEKNIK'],['GS 47','GS47'],['Beslagskod: GS47','GS47'],
 ['Dörrkort 140C7','140C7'],['Dörrkort 1','1'],['Littera: 12','12'],['140 C','140C'],
 ['Dörrkort Entréplan','ENTRÉPLAN'],['Dörrkort A-125-B','A125B']
 ,['Dorrkort140C','140C'],['Dörrkort140 C','140C'],['DorrkortGS47','GS47'],['Toalett271B','271B'],['ID140C','ID140C'],['DorrkortKontor','KONTOR'],['BeslagskortStudio','STUDIO']
])assert.deepEqual(candidates(heading),[code],heading);
assert.deepEqual(candidates('Dörrkort 140C / 130C'),['140C','130C'],'conflicting codes remain visible');
assert.equal(extract('Dörrkort 140C / 130C').code,'','a conflict never becomes an automatic identity');
assert.deepEqual(candidates('Dörrkort Teknik Kontor'),['TEKNIK','KONTOR']);
assert.deepEqual(candidates('Dörrkort'),[]);
assert.equal(normalize('140C7'),'140C7');
assert.equal(normalize('WC A'),''); // Multiword alphabetic guesses are not a confirmed identity.
assert.equal(normalize('140C 130C'),'');
assert.equal(normalize('Dörrkort 140C'),'');

const codeRect={x:.08,y:.06,w:.7,h:.08},tableRect={x:.08,y:.2,w:.8,h:.5};
const pages=[
 {code:'Dorrkort 482C',table:'Komponent Produkt Ansvar\nLashus ASSA GS\nCylinder TRIO GS'},
 {code:'Toalett 271B',table:'Komponent Produkt Ansvar\nTrycke Hoppe GS\nCylinder ASSA GS'},
 {code:'Beslagskort Studio',table:'Komponent Produkt Ansvar\nLashus Y4 GS'},
 {code:'482C',table:'Sovrum Hall Korridor\nPlanritning Skala 1:100'},
 {code:'Dorrkort 11 / 12',table:'Komponent Produkt Ansvar\nCylinder ASSA GS'},
 {code:'',table:''},
 {code:'Dorrkort 88',table:''}
];
const fakePdf={numPages:pages.length,getPage:async page=>({number:page,getViewport:()=>({width:595,height:842})})};
const readNative=async({pageNumber,kind})=>pages[pageNumber-1][kind];
(async()=>{
 const progress=[];
 const result=await discover({pdf:fakePdf,examplePage:1,codeRect,tableRect,readNative,onProgress:item=>progress.push(item)});
 assert.deepEqual(result.cardPages,[1,2,3],'different headings and IDs reuse the example table');
 assert.deepEqual(result.pages.slice(0,3).map(page=>page.code),['482C','271B','STUDIO']);
 assert.deepEqual(result.excludedPages,[4],'a drawing containing a code is not a card');
 assert.deepEqual(result.unresolvedPages,[5,6,7],'ambiguous IDs and unreadable image content need review');
 assert.equal(progress.length,pages.length);
 assert(result.pages.every(page=>page.status!=='verified'),'discovery only proposes, never claims user verification');
 const controller=new AbortController();controller.abort();
 await assert.rejects(discover({pdf:fakePdf,examplePage:1,codeRect,tableRect,readNative,signal:controller.signal}),{name:'AbortError'});
 const changedPages=pages.map(page=>({...page}));changedPages[0].code='Dorrkort 1 / 2';
 const unresolved=await discover({pdf:fakePdf,examplePage:1,codeRect,tableRect,readNative:async({pageNumber,kind})=>changedPages[pageNumber-1][kind]});
 assert.deepEqual(unresolved.cardPages,[],'an unresolved example cannot establish card proposals');
 await assert.rejects(discover({pdf:fakePdf,examplePage:1,codeRect:{x:-.1,y:.1,w:.1,h:.1},tableRect}),/Markera/);

 // Native PDF selection: selected text uses its visual centre, not just the
 // baseline, and out-of-region dimensions on the drawing do not become IDs.
 const nativePages=[
  [['Dorrkort 901B',70,750,150,18],['Komponent Produkt',70,640,200,14],['Lashus ASSA',70,610,140,14]],
  [['Toalett 902C',70,750,130,18],['Komponent Produkt',70,640,200,14],['Trycke Hoppe',70,610,140,14]],
  [['901B',70,750,40,12],['Sovrum Hall',70,640,120,14],['Planritning',70,610,100,14]]
 ];
 const nativePdf={numPages:3,getPage:async pageNumber=>({
  getViewport:()=>({width:595,height:842,transform:[1,0,0,-1,0,842],convertToViewportPoint:(x,y)=>[x,842-y]}),
  getTextContent:async()=>({items:nativePages[pageNumber-1].map(([str,x,y,width,height])=>({str,width,height,transform:[height,0,0,height,x,y]}))})
 })};
 const native=await discover({pdf:nativePdf,examplePage:1,codeRect:{x:.1,y:.08,w:.6,h:.04},tableRect});
 assert.deepEqual(native.cardPages,[1,2]);
 assert.equal(native.pages[1].code,'902C');
 const imagePdf={numPages:3,getPage:async()=>({getViewport:()=>({width:595,height:842}),getTextContent:async()=>({items:[]})})};
 const raster=await discover({pdf:imagePdf,examplePage:1,codeRect,tableRect,readFallback:async({pageNumber,kind})=>kind==='table'?{text:'Komponent Produkt Ansvar\nCylinder ASSA GS',confidence:92}:{text:'Dorrkort '+(700+pageNumber)+'B',ids:pageNumber===3?[]:[(700+pageNumber)+'B'],confidence:pageNumber===3?20:94}});
 assert.deepEqual(raster.cardPages,[1,2],'reliable local OCR can discover other scanned cards');
 assert.deepEqual(raster.unresolvedPages,[3],'low-confidence OCR cannot establish an identity');
 assert(raster.pages.every(page=>!page.hasNative),'OCR must not be reported as native PDF text');
 console.log('PASS TEST 3 generic identities, conflicting headers, example-guided discovery, drawing exclusion, unreadable-page review, native regions and reliable OCR fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
