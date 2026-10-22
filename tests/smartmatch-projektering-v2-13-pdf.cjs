'use strict';
// In-memory vector PDFs and native text only. No user files or images.
const assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-13-data.js');
const P=require('../smartmatch-projektering-v2-13-pdf.js');
const D11=require('../smartmatch-projektering-v2-11-data.js');
const P11=require('../smartmatch-projektering-v2-11-pdf.js');
const D12=require('../smartmatch-projektering-v2-12-data.js');
const P12=require('../smartmatch-projektering-v2-12-pdf.js');
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
 D.addPlacement(state,{id:'door-shared',page:1,stencilId:'GS4:1',x:.2,y:.3});
 D.addPlacement(state,{id:'door-private',page:2,stencilId:'GS4:1',x:.2,y:.3,rotation:27,locked:true});
 const shared=clone(state.cards['GS4:1']);shared.rows.find(row=>row.id==='day-lock').product='SAVED-310-50';D.updateCard(state,'GS4:1',shared);
 const own=D.forkPlacementCard(state,'door-private',D.suggestForkCode(state,'GS4:1'));
 assert.equal(own.code,'GS4:2');own.rows.find(row=>row.id==='day-lock').product='PRIVATE-411-50';D.updateCard(state,own.code,own);
 D.ensureCard(state,'GS8:1');const unused=clone(state.cards['GS8:1']);unused.rows.find(row=>row.id==='closing-closer').product='EXCLUDE-DC700';D.updateCard(state,'GS8:1',unused);
 for(const [id,page,stencilId,x,quantity,model]of [
  ['symbol-da',1,'DA',.5,3,'SYMBOL-ED250'],['symbol-ds',2,'DS',.5,2,'SYMBOL-TS83'],['symbol-dfs',1,'DFS',.8,4,'SYMBOL-DFS']
 ])D.addPlacement(state,{id,page,stencilId,x,y:.65,rotation:225,equipment:{objectNumber:'OBJ-'+stencilId,quantity,model,note:'HISTORICAL SYMBOL DATA'}});
 D.addStencil(state,{...D.defaultStencil('ALARM1'),kind:'symbol',productType:'other',name:'Övrig symbol',category:'Övrigt'});
 D.addPlacement(state,{id:'symbol-custom',page:2,stencilId:'ALARM1',x:.8,y:.65,equipment:{objectNumber:'OBJ-CUSTOM',quantity:7,model:'SYMBOL-CUSTOM',note:'Sparad historik '.repeat(60)}});
 D.setMaterialTime(state,JSON.stringify(['lock',false,'saved-310-50']),37.5);
 return {state,original:new Uint8Array(await original.save())};
}

(async()=>{
 const fresh=await P.blank('Nya kort med numrerad första variant'),freshBefore=clone(fresh.state),cardTemplates=Object.values(fresh.state.stencils).filter(stencil=>stencil.kind==='card');
 assert.equal(cardTemplates.length,104);assert(cardTemplates.every(stencil=>stencil.code.endsWith(':1')&&stencil.id===stencil.code),'every initial built-in door-card template uses :1');
 for(const code of ['GS1:1','GS2:1','GS100:1','DGS100:1','WC:1','HWC:1','DBL:1'])assert(fresh.state.stencils[code],'blank project has initial template '+code);
 assert(!fresh.state.stencils.GS1&&!fresh.state.stencils.DGS100,'new blank projects do not duplicate unnumbered templates');
 for(const code of ['DA','DS','DFS'])assert.equal(fresh.state.stencils[code].code,code,'symbol codes remain unchanged');
 assert.equal(Object.keys(fresh.state.cards).length,0);assert.equal(await P.inspect(fresh.original),null,'blank source remains a clean PDF');
 for(let n=1;n<=3;n++)D.addPlacement(fresh.state,{id:'series-'+n,page:1,stencilId:'GS1:1',x:.15+n*.2,y:.4});
 const second=D.forkPlacementCard(fresh.state,'series-2',D.suggestForkCode(fresh.state,'GS1:1'));
 const third=D.forkPlacementCard(fresh.state,'series-3',D.suggestForkCode(fresh.state,'GS1:1'));
 assert.equal(second.code,'GS1:2');assert.equal(third.code,'GS1:3');
 const seriesPdf=await P.build(fresh.state,fresh.original),seriesText=await textPages(seriesPdf);
 assert.equal(seriesText.length,4,'one blank drawing and one page per initial/private card');
 for(const code of ['GS1:1','GS1:2','GS1:3'])assert(seriesText[0].includes(code)&&seriesText.slice(1).some(page=>page.includes(code)),'drawing and actual card PDFs use '+code);
 assert.deepEqual((await P.inspect(seriesPdf)).state,fresh.state);assert.deepEqual((await P.inspect(seriesPdf)).original,fresh.original);
 assert.equal(Object.keys(freshBefore.cards).length,0,'blank snapshot is independent');

 // Reproduce a hole saved by 2.12: deleting the card/door leaves its custom
 // stencil behind. Reopening must make :2 reusable without ever renaming :3.
 const hole={state:D12.validate(clone(fresh.state)),original:fresh.original.slice()},kept=clone(hole.state.cards['GS1:3']);
 Object.assign(kept.rows.find(row=>row.id==='day-lock'),{product:'KEEP-EL580',delivery:'DT',installer:'DT'});kept.meta.fire='EI60';kept.note='TREDJE KORTET SKA BEVARAS';D12.updateCard(hole.state,'GS1:3',kept);
 D12.updatePlacement(hole.state,'series-3',{rotation:17,locked:true,note:'BEVARA DÖRRENS IDENTITET'});
 D12.updateStencil(hole.state,'GS1:2',{fill:'#c0ffee',stroke:'#123456',shape:'square',width:70,height:30,fontSize:9});
 const retainedStencil=clone(hole.state.stencils['GS1:2']),keptCard=clone(hole.state.cards['GS1:3']),keptDoor=clone(hole.state.placements.find(item=>item.id==='series-3'));
 D12.removeCard(hole.state,'GS1:2',{cascade:true});
 assert(!hole.state.cards['GS1:2']);assert(hole.state.stencils['GS1:2']);assert.equal(D12.suggestForkCode(hole.state,'GS1:1'),'GS1:4','fixture retains the old orphan-stencil gap');
 const holeBefore=clone(hole.state),oldHolePdf=await P12.build(hole.state,hole.original),reopenedHole=await P.inspect(oldHolePdf),holeText=await textPages(oldHolePdf);
 assert.equal(holeText.length,3);assert(!holeText.flat().includes('GS1:2'),'a deleted card and its removed door do not print');assert.deepEqual(reopenedHole.state,holeBefore,'an old unused stencil is retained exactly through import');assert.deepEqual(reopenedHole.original,hole.original);
 assert.equal(D.suggestCardCode(reopenedHole.state,'GS1:1'),'GS1:2','new-card suggestion fills the lowest retained-stencil gap after PDF reopen');assert.equal(D.suggestForkCode(reopenedHole.state,'GS1:1'),'GS1:2','private-card suggestion also fills the gap');
 const reusedDraft=clone(reopenedHole.state.cards['GS1:1']);reusedDraft.rows.find(row=>row.id==='day-lock').product='REUSED-411-50';
 D.forkPlacementCard(reopenedHole.state,'series-1',D.suggestForkCode(reopenedHole.state,'GS1:1'),reusedDraft);
 assert.equal(reopenedHole.state.placements.find(item=>item.id==='series-1').code,'GS1:2');assert.equal(reopenedHole.state.placements.find(item=>item.id==='series-1').stencilId,retainedStencil.id);
 assert.deepEqual(reopenedHole.state.stencils[retainedStencil.id],retainedStencil,'reused retained stencil keeps its original ID, shape and colors');assert.deepEqual(reopenedHole.state.cards['GS1:3'],keptCard,'existing :3 products and card identity never shift');assert.deepEqual(reopenedHole.state.placements.find(item=>item.id==='series-3'),keptDoor,'existing :3 position, size, rotation, lock and ID never shift');
 const reusedBefore=clone(reopenedHole.state),reusedPdf=await P.build(reopenedHole.state,reopenedHole.original),reusedText=await textPages(reusedPdf),reusedProject=await P.inspect(reusedPdf);
 assert.equal(reusedText.length,4,'all three saved cards remain printable after :2 is reused');for(const value of ['GS1:2','GS1:3','REUSED-411-50','KEEP-EL580'])assert(reusedText.flat().includes(value),'actual PDF keeps distinct reused and existing cards: '+value);
 assert.deepEqual(reusedProject.state,reusedBefore);assert.deepEqual(reusedProject.original,hole.original);assert.deepEqual(reusedProject.state.cards['GS1:3'],keptCard);assert.deepEqual(reusedProject.state.placements.find(item=>item.id==='series-3'),keptDoor);assert.deepEqual(hole.state,holeBefore,'import/reuse does not alter the older project input');

 const sample=await P.example(),sampleBefore=clone(sample.state),sampleCodes=Object.keys(sample.state.cards),samplePdf=await P.build(sample.state,sample.original),sampleText=await textPages(samplePdf);
 assert.equal(sample.state.placements.length,50);assert.equal(sample.state.drawing.pages.length,2);assert.equal(sampleCodes.length,11);assert.equal(sampleText.length,13);
 assert(sampleCodes.every(code=>/:1$/.test(code)));assert(sampleCodes.includes('GS1:1')&&sampleCodes.includes('GS10:1')&&sampleCodes.includes('DGS100:1'));
 for(const code of sampleCodes){assert(sampleText.slice(0,2).flat().includes(code),'example drawing text uses '+code);assert(sampleText.slice(2).some(page=>page.includes(code)),'example card header uses '+code);}
 assert.equal(sample.state.cards['GS1:1'].note,'Samma sparade GS1:1-kort används vid flera dörrar.');assert.deepEqual(sample.state,sampleBefore,'example export does not rename cards');assert.deepEqual((await P.inspect(samplePdf)).state,sample.state);

 const legacy=await P11.blank('Äldre projekt behåller sina beteckningar');
 D11.addPlacement(legacy.state,{id:'legacy-base',page:1,stencilId:'GS1',x:.3,y:.4});D11.addPlacement(legacy.state,{id:'legacy-private',page:1,stencilId:'GS1',x:.7,y:.4});
 D11.forkPlacementCard(legacy.state,'legacy-private','GS1:1');D11.ensureCard(legacy.state,'GS8-A');
 const legacyBefore=clone(legacy.state),legacyPdf=await P11.build(legacy.state,legacy.original),imported=await P.inspect(legacyPdf);
 assert.deepEqual(imported.state,legacyBefore,'opening a 2.11 project preserves base, numeric and legacy alphabetic card names');assert.deepEqual(imported.original,legacy.original);
 assert(imported.state.stencils.GS1&&!imported.state.stencils['GS2:1'],'old libraries are not silently filled with the new numbered templates');assert.deepEqual(Object.keys(imported.state.cards).sort(),['GS1','GS1:1','GS8-A']);
 const legacyReexport=await P.build(imported.state,imported.original),legacyText=(await textPages(legacyReexport)).flat();for(const code of ['GS1','GS1:1','GS8-A'])assert(legacyText.includes(code),'re-export preserves saved code '+code);
 assert.deepEqual((await P.inspect(legacyReexport)).state,legacyBefore);assert.equal(D.suggestForkCode(imported.state,'GS1'),'GS1:2');assert.deepEqual(legacy.state,legacyBefore);

 const input=await fixture(),before=clone(input.state),sourceBefore=input.original.slice(),counts=D.placementCounts(input.state),outputs={};
 assert.deepEqual(counts,{markings:6,cards:3,doorAutomation:3,doorCloser:2,otherProducts:11});
 for(const mode of ['combined','drawing','cards']){
  outputs[mode]=await P.build(freeze(clone(input.state)),input.original,{mode});
  const pdf=await lib.PDFDocument.load(outputs[mode]),restored=await P.inspect(outputs[mode]);
  assert.equal(pdf.getPageCount(),mode==='combined'?5:mode==='drawing'?2:3,'only drawing pages and saved door-card pages are exported: '+mode);
  assert.deepEqual(restored.state,input.state,'card codes, times and all symbol metadata roundtrip: '+mode);
  assert.deepEqual(restored.original,input.original,'source geometry and bytes remain exact: '+mode);
  assert.deepEqual(D.placementCounts(restored.state),counts,'standalone counters survive reopening: '+mode);
  assert.equal(restored.state.cards['GS4:2'].code,'GS4:2');
  assert.equal(restored.state.preferences.materialTimes[JSON.stringify(['lock',false,'saved-310-50'])],37.5);
  assert.deepEqual(restored.state.placements.find(item=>item.id==='symbol-custom').equipment,input.state.placements.find(item=>item.id==='symbol-custom').equipment);
 }
 assert.deepEqual(input.state,before,'all exports leave the editable state untouched');assert.deepEqual(input.original,sourceBefore,'all exports leave the source bytes untouched');
 const pages=await textPages(outputs.combined),drawing=pages.slice(0,2).flat(),cards=pages.slice(2).flat();
 for(const code of ['GS4:1','GS4:2','DA','DS','DFS','ALARM1'])assert(drawing.includes(code),'drawing retains searchable stamp '+code);
 for(const model of ['SAVED-310-50','PRIVATE-411-50','EXCLUDE-DC700'])assert(cards.includes(model),'all saved door cards remain printable, including unplaced '+model);
 const all=pages.flat().join(' ');for(const excluded of ['PRODUKTOBJEKT','SYMBOL-ED250','SYMBOL-TS83','SYMBOL-DFS','SYMBOL-CUSTOM','HISTORICAL SYMBOL DATA'])assert(!all.includes(excluded),'standalone symbols have no product-object appendix: '+excluded);
 const outputGeometry=P.metadata(await lib.PDFDocument.load(outputs.drawing));
 assert.equal(outputGeometry[1].rotation,0,'rotated source is normalized only in visible export');assert.equal(outputGeometry[1].width,input.state.drawing.pages[1].width);assert.equal(outputGeometry[1].height,input.state.drawing.pages[1].height);
 const reopened=await P.inspect(outputs.combined),rebuilt=await P.build(reopened.state,reopened.original);assert.equal((await lib.PDFDocument.load(rebuilt)).getPageCount(),5,'repeat exports never duplicate symbols or appendices');assert.deepEqual((await P.inspect(rebuilt)).original,sourceBefore);

 const draft=clone(input.state.cards['GS4:1']);draft.rows.find(row=>row.id==='day-lock').product='DRAFT-EL580';draft.note='OSPARAD FÖRHANDSVISNING';
 const draftBefore=clone(draft),revision=input.state.project.revision;
 const preview=await P.buildCardPreview(freeze(clone(input.state)),'GS4:1',freeze(clone(draft))),previewPdf=await lib.PDFDocument.load(preview),previewText=(await textPages(preview)).flat();
 assert.equal(previewPdf.getPageCount(),1);assert.equal(previewPdf.getTitle(),'Dörrkort GS4:1 · '+input.state.project.name);
 for(const value of ['GS4:1','BESLAGSKORT','DRAFT-EL580','OSPARAD FÖRHANDSVISNING','Revision '+revision])assert(previewText.includes(value),'current unsaved draft is rendered: '+value);
 for(const value of ['PRIVATE-411-50','SAVED-310-50','EXCLUDE-DC700','DA','DS','DFS'])assert(!previewText.includes(value),'preview contains only current card: '+value);
 assert.equal(previewPdf.catalog.get(lib.PDFName.of(P.DATA_KEY)),undefined,'preview is not an editable project export');assert.equal(previewPdf.catalog.get(lib.PDFName.of(P.SOURCE_KEY)),undefined,'preview embeds no drawing source');assert.equal(await P.inspect(preview),null);
 assert.deepEqual(input.state,before,'preview never changes shared cards, preferences, placements or revision');assert.deepEqual(draft,draftBefore,'preview never consumes the draft');assert.deepEqual(input.original,sourceBefore);
 const savedPreview=(await textPages(await P.buildCardPreview(input.state,'GS4:1'))).flat();assert(savedPreview.includes('SAVED-310-50'));assert(!savedPreview.includes('DRAFT-EL580'),'omitting draft previews the saved card');
 const privatePreview=(await textPages(await P.buildCardPreview(input.state,'GS4:2'))).flat();assert(privatePreview.includes('GS4:2'));assert(privatePreview.includes('PRIVATE-411-50'));
 const newDraft=D.createCard('NEW1');newDraft.rows[0].product='NEW-UNSAVED';const newPreview=(await textPages(await P.buildCardPreview(input.state,'NEW1',newDraft))).flat();assert(newPreview.includes('NEW1'));assert(newPreview.includes('NEW-UNSAVED'));assert(!input.state.cards.NEW1,'preview can render a new draft without saving it');
 const empty=D.createEmpty('Kort utan ritning');D.ensureCard(empty,'GS1:1');assert.equal((await lib.PDFDocument.load(await P.buildCardPreview(empty,'GS1:1'))).getPageCount(),1,'preview needs no drawing source');
 await assert.rejects(P.buildCardPreview(input.state,'MISSING'),/Välj ett dörrkort/);
 await assert.rejects(P.buildCardPreview(input.state,'GS4:1',{...draft,code:'GS8:1'}),/stämmer inte/);
 const invalid=clone(draft);invalid.rows[0].quantity=0;await assert.rejects(P.buildCardPreview(input.state,'GS4:1',invalid),/Antal/);
 const unreadable=clone(draft);unreadable.rows[0].product='😀';await assert.rejects(P.buildCardPreview(input.state,'GS4:1',unreadable),/tecken|latinska/);
 assert.deepEqual(input.state,before,'failed previews are also non-mutating');

 const symbolsOnly=D.createEmpty('Enbart symboler');symbolsOnly.drawing=clone(input.state.drawing);D.addPlacement(symbolsOnly,{id:'only-da',page:1,stencilId:'DA',x:.5,y:.5,equipment:{quantity:2,model:'NO-CARD-PAGE'}});
 const symbolPdf=await P.build(symbolsOnly,input.original);assert.equal((await lib.PDFDocument.load(symbolPdf)).getPageCount(),2,'a drawing with symbols and no cards has no additional pages');assert.equal(D.placementCounts((await P.inspect(symbolPdf)).state).doorAutomation,2);
 await assert.rejects(P.build(symbolsOnly,input.original,{mode:'cards'}),/Lägg till en ritning eller ett dörrkort/);
 console.log('PASS Projektering 2.13 PDF: imported orphan-stencil number reuse without renaming later cards, numbered examples, cards-only appendices, source/state/count/time roundtrips and isolated unsaved-card previews.');
})().catch(error=>{console.error(error);process.exitCode=1;});
