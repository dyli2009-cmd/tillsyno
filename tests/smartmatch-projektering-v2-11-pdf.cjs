'use strict';
// In-memory vector PDFs and native text only. No user files or images.
const assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-11-data.js');
const P=require('../smartmatch-projektering-v2-11-pdf.js');
const lib=require('../vendor/pdf-lib.min.js');
const pdfjs=require('../vendor/pdf.min.js');
pdfjs.GlobalWorkerOptions.workerSrc=require.resolve('../vendor/pdf.worker.min.js');
const clone=value=>JSON.parse(JSON.stringify(value));
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
async function textPages(bytes){
 const document=await pdfjs.getDocument({data:bytes.slice(),useSystemFonts:true,disableFontFace:true}).promise;
 try{const pages=[];for(let n=1;n<=document.numPages;n++)pages.push((await(await document.getPage(n)).getTextContent()).items.map(item=>item.str).filter(Boolean));return pages;}
 finally{await document.destroy();}
}
async function fixture(){
 const original=await lib.PDFDocument.create(),font=await original.embedFont(lib.StandardFonts.Helvetica);
 original.addPage([800,600]).drawText('ORIGINAL PLAN A',{x:30,y:560,font,size:14});
 const rotated=original.addPage([700,900]);rotated.setCropBox(20,30,620,800);rotated.setRotation(lib.degrees(90));rotated.drawText('ORIGINAL PLAN B',{x:40,y:750,font,size:14});
 const state=D.createEmpty('Dörrkort och fristående symboler');state.drawing={name:'vector-test.pdf',pages:P.metadata(original)};
 D.addPlacement(state,{id:'door-shared',page:1,stencilId:'GS4',x:.2,y:.3});
 D.addPlacement(state,{id:'door-private',page:2,stencilId:'GS4',x:.2,y:.3,rotation:27,locked:true});
 const shared=clone(state.cards.GS4);shared.rows.find(row=>row.id==='day-lock').product='SAVED-310-50';D.updateCard(state,'GS4',shared);
 const own=D.forkPlacementCard(state,'door-private',D.suggestForkCode(state,'GS4'));
 assert.equal(own.code,'GS4:1');own.rows.find(row=>row.id==='day-lock').product='PRIVATE-411-50';D.updateCard(state,own.code,own);
 D.ensureCard(state,'GS8');const unused=clone(state.cards.GS8);unused.rows.find(row=>row.id==='closing-closer').product='EXCLUDE-DC700';D.updateCard(state,'GS8',unused);
 for(const [id,page,stencilId,x,quantity,model]of [
  ['symbol-da',1,'DA',.5,3,'SYMBOL-ED250'],['symbol-ds',2,'DS',.5,2,'SYMBOL-TS83'],['symbol-dfs',1,'DFS',.8,4,'SYMBOL-DFS']
 ])D.addPlacement(state,{id,page,stencilId,x,y:.65,rotation:225,equipment:{objectNumber:'OBJ-'+stencilId,quantity,model,note:'HISTORICAL SYMBOL DATA'}});
 D.addStencil(state,{...D.defaultStencil('ALARM1'),kind:'symbol',productType:'other',name:'Övrig symbol',category:'Övrigt'});
 D.addPlacement(state,{id:'symbol-custom',page:2,stencilId:'ALARM1',x:.8,y:.65,equipment:{objectNumber:'OBJ-CUSTOM',quantity:7,model:'SYMBOL-CUSTOM',note:'Sparad historik '.repeat(60)}});
 D.setMaterialTime(state,JSON.stringify(['lock',false,'saved-310-50']),37.5);
 return {state,original:new Uint8Array(await original.save())};
}

(async()=>{
 const input=await fixture(),before=clone(input.state),sourceBefore=input.original.slice(),counts=D.placementCounts(input.state),outputs={};
 assert.deepEqual(counts,{markings:6,cards:3,doorAutomation:3,doorCloser:2,otherProducts:11});
 for(const mode of ['combined','drawing','cards']){
  outputs[mode]=await P.build(freeze(clone(input.state)),input.original,{mode});
  const pdf=await lib.PDFDocument.load(outputs[mode]),restored=await P.inspect(outputs[mode]);
  assert.equal(pdf.getPageCount(),mode==='combined'?5:mode==='drawing'?2:3,'only drawing pages and saved door-card pages are exported: '+mode);
  assert.deepEqual(restored.state,input.state,'card codes, times and all symbol metadata roundtrip: '+mode);
  assert.deepEqual(restored.original,input.original,'source geometry and bytes remain exact: '+mode);
  assert.deepEqual(D.placementCounts(restored.state),counts,'standalone counters survive reopening: '+mode);
  assert.equal(restored.state.cards['GS4:1'].code,'GS4:1');
  assert.equal(restored.state.preferences.materialTimes[JSON.stringify(['lock',false,'saved-310-50'])],37.5);
  assert.deepEqual(restored.state.placements.find(item=>item.id==='symbol-custom').equipment,input.state.placements.find(item=>item.id==='symbol-custom').equipment);
 }
 assert.deepEqual(input.state,before,'all exports leave the editable state untouched');assert.deepEqual(input.original,sourceBefore,'all exports leave the source bytes untouched');
 const pages=await textPages(outputs.combined),drawing=pages.slice(0,2).flat(),cards=pages.slice(2).flat();
 for(const code of ['GS4','GS4:1','DA','DS','DFS','ALARM1'])assert(drawing.includes(code),'drawing retains searchable stamp '+code);
 for(const model of ['SAVED-310-50','PRIVATE-411-50','EXCLUDE-DC700'])assert(cards.includes(model),'all saved door cards remain printable, including unplaced '+model);
 const all=pages.flat().join(' ');for(const excluded of ['PRODUKTOBJEKT','SYMBOL-ED250','SYMBOL-TS83','SYMBOL-DFS','SYMBOL-CUSTOM','HISTORICAL SYMBOL DATA'])assert(!all.includes(excluded),'standalone symbols have no product-object appendix: '+excluded);
 const outputGeometry=P.metadata(await lib.PDFDocument.load(outputs.drawing));
 assert.equal(outputGeometry[1].rotation,0,'rotated source is normalized only in visible export');assert.equal(outputGeometry[1].width,input.state.drawing.pages[1].width);assert.equal(outputGeometry[1].height,input.state.drawing.pages[1].height);
 const reopened=await P.inspect(outputs.combined),rebuilt=await P.build(reopened.state,reopened.original);assert.equal((await lib.PDFDocument.load(rebuilt)).getPageCount(),5,'repeat exports never duplicate symbols or appendices');assert.deepEqual((await P.inspect(rebuilt)).original,sourceBefore);

 const draft=clone(input.state.cards.GS4);draft.rows.find(row=>row.id==='day-lock').product='DRAFT-EL580';draft.note='OSPARAD FÖRHANDSVISNING';
 const draftBefore=clone(draft),revision=input.state.project.revision;
 const preview=await P.buildCardPreview(freeze(clone(input.state)),'GS4',freeze(clone(draft))),previewPdf=await lib.PDFDocument.load(preview),previewText=(await textPages(preview)).flat();
 assert.equal(previewPdf.getPageCount(),1);assert.equal(previewPdf.getTitle(),'Dörrkort GS4 · '+input.state.project.name);
 for(const value of ['GS4','BESLAGSKORT','DRAFT-EL580','OSPARAD FÖRHANDSVISNING','Revision '+revision])assert(previewText.includes(value),'current unsaved draft is rendered: '+value);
 for(const value of ['PRIVATE-411-50','SAVED-310-50','EXCLUDE-DC700','DA','DS','DFS'])assert(!previewText.includes(value),'preview contains only current card: '+value);
 assert.equal(previewPdf.catalog.get(lib.PDFName.of(P.DATA_KEY)),undefined,'preview is not an editable project export');assert.equal(previewPdf.catalog.get(lib.PDFName.of(P.SOURCE_KEY)),undefined,'preview embeds no drawing source');assert.equal(await P.inspect(preview),null);
 assert.deepEqual(input.state,before,'preview never changes shared cards, preferences, placements or revision');assert.deepEqual(draft,draftBefore,'preview never consumes the draft');assert.deepEqual(input.original,sourceBefore);
 const savedPreview=(await textPages(await P.buildCardPreview(input.state,'GS4'))).flat();assert(savedPreview.includes('SAVED-310-50'));assert(!savedPreview.includes('DRAFT-EL580'),'omitting draft previews the saved card');
 const privatePreview=(await textPages(await P.buildCardPreview(input.state,'GS4:1'))).flat();assert(privatePreview.includes('GS4:1'));assert(privatePreview.includes('PRIVATE-411-50'));
 const newDraft=D.createCard('NEW1');newDraft.rows[0].product='NEW-UNSAVED';const newPreview=(await textPages(await P.buildCardPreview(input.state,'NEW1',newDraft))).flat();assert(newPreview.includes('NEW1'));assert(newPreview.includes('NEW-UNSAVED'));assert(!input.state.cards.NEW1,'preview can render a new draft without saving it');
 const empty=D.createEmpty('Kort utan ritning');D.ensureCard(empty,'GS1');assert.equal((await lib.PDFDocument.load(await P.buildCardPreview(empty,'GS1'))).getPageCount(),1,'preview needs no drawing source');
 await assert.rejects(P.buildCardPreview(input.state,'MISSING'),/Välj ett dörrkort/);
 await assert.rejects(P.buildCardPreview(input.state,'GS4',{...draft,code:'GS8'}),/stämmer inte/);
 const invalid=clone(draft);invalid.rows[0].quantity=0;await assert.rejects(P.buildCardPreview(input.state,'GS4',invalid),/Antal/);
 const unreadable=clone(draft);unreadable.rows[0].product='😀';await assert.rejects(P.buildCardPreview(input.state,'GS4',unreadable),/tecken|latinska/);
 assert.deepEqual(input.state,before,'failed previews are also non-mutating');

 const symbolsOnly=D.createEmpty('Enbart symboler');symbolsOnly.drawing=clone(input.state.drawing);D.addPlacement(symbolsOnly,{id:'only-da',page:1,stencilId:'DA',x:.5,y:.5,equipment:{quantity:2,model:'NO-CARD-PAGE'}});
 const symbolPdf=await P.build(symbolsOnly,input.original);assert.equal((await lib.PDFDocument.load(symbolPdf)).getPageCount(),2,'a drawing with symbols and no cards has no additional pages');assert.equal(D.placementCounts((await P.inspect(symbolPdf)).state).doorAutomation,2);
 await assert.rejects(P.build(symbolsOnly,input.original,{mode:'cards'}),/Lägg till en ritning eller ett dörrkort/);
 console.log('PASS Projektering 2.11 PDF: cards-only appendices, searchable standalone drawing symbols, source/state/count/time/colon roundtrips and isolated one-page unsaved-card previews.');
})().catch(error=>{console.error(error);process.exitCode=1;});
