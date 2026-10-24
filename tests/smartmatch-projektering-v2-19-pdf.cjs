'use strict';
// Real vector PDF export/import and text extraction. No images or user files.
const assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-19-data.js');
const P=require('../smartmatch-projektering-v2-19-pdf.js');
const OldD=require('../smartmatch-projektering-v2-13-data.js');
const OldP=require('../smartmatch-projektering-v2-13-pdf.js');
const lib=require('../vendor/pdf-lib.min.js'),pdfjs=require('../vendor/pdf.min.js');
pdfjs.GlobalWorkerOptions.workerSrc=require.resolve('../vendor/pdf.worker.min.js');
const clone=value=>JSON.parse(JSON.stringify(value));
async function pagesText(bytes){
 const pdf=await pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true,disableFontFace:true}).promise;
 try{const pages=[];for(let n=1;n<=pdf.numPages;n++)pages.push((await(await pdf.getPage(n)).getTextContent()).items.map(item=>item.str).filter(Boolean));return pages;}
 finally{await pdf.destroy();}
}
async function sourceFixture(){
 const doc=await lib.PDFDocument.create(),font=await doc.embedFont(lib.StandardFonts.Helvetica);
 doc.addPage([800,600]).drawText('UNCHANGED SOURCE ONE',{x:30,y:550,size:14,font});
 const rotated=doc.addPage([700,900]);rotated.setCropBox(20,30,620,800);rotated.setRotation(lib.degrees(90));rotated.drawText('UNCHANGED SOURCE TWO',{x:40,y:700,size:14,font});
 return{pages:P.metadata(doc),bytes:new Uint8Array(await doc.save())};
}
function textAnnotation(state){
 const A=D.Annotations,item=A.create(2,.5,.5,state.drawing.pages);
 return A.update(item,{text:'BEVARA TEXT OCH PILAR',bold:true,fill:null,borderWidth:1.2,arrows:[{id:'arrow-one',x:.2,y:.2},{id:'arrow-two',x:.8,y:.7}]},state.drawing.pages);
}
(async()=>{
 const source=await sourceFixture(),legacy=OldD.createEmpty('Äldre kort och textmarkeringar');
 legacy.drawing={name:'source.pdf',pages:source.pages};
 OldD.addPlacement(legacy,{id:'legacy-door',page:2,stencilId:'GS1:1',x:.2,y:.3,rotation:27,locked:true,note:'LOCKED DOOR'});
 const card=clone(legacy.cards['GS1:1']);card.rows.find(row=>row.id==='day-lock').product='310-50';card.note='GAMLA KORTETS ANTECKNING';OldD.updateCard(legacy,'GS1:1',card);
 OldD.addPlacement(legacy,{id:'legacy-da',page:1,stencilId:'DA',x:.7,y:.7,equipment:{quantity:3,model:'DA-OLD-MODEL'}});
 OldD.setMaterialTime(legacy,JSON.stringify(['lock',false,'310-50']),0);
 const originalLegacy=clone(legacy),legacyPdf=await OldP.build(legacy,source.bytes),migrated=await P.inspect(legacyPdf);
 assert.equal(migrated.state.schema,4);assert.deepEqual(migrated.original,source.bytes);
 assert.deepEqual(migrated.state.placements,legacy.placements);assert.deepEqual(migrated.state.preferences,legacy.preferences);
 assert.deepEqual(migrated.state.cards['GS1:1'].rows.filter(row=>!row.id.startsWith('extra-')),legacy.cards['GS1:1'].rows);
 assert(migrated.state.cards['GS1:1'].rows.filter(row=>row.id.startsWith('extra-')).every(row=>row.product===''));
 assert.deepEqual(legacy,originalLegacy,'legacy import never alters its input');

 // A schema-3 payload uses the same unchanged source stream and 26-row cards.
 // This models a 2.18 project with text and multiple arrows before migration.
 const oldDoc=await lib.PDFDocument.load(legacyPdf),oldPayload=JSON.parse(oldDoc.catalog.get(lib.PDFName.of(P.DATA_KEY)).decodeText());
 oldPayload.state={...clone(legacy),schema:3,annotations:[textAnnotation(migrated.state)]};
 oldDoc.catalog.set(lib.PDFName.of(P.DATA_KEY),lib.PDFHexString.fromText(JSON.stringify(oldPayload)));
 const migratedText=await P.inspect(new Uint8Array(await oldDoc.save()));
 assert.equal(migratedText.state.schema,4);assert.deepEqual(migratedText.state.annotations,oldPayload.state.annotations);
 assert.deepEqual(migratedText.state.placements,legacy.placements);assert.equal(migratedText.state.preferences.materialTimes[JSON.stringify(['lock',false,'310-50'])],0);

 const base=clone(migratedText.state),before=clone(base),exported=await P.build(base,source.bytes),exportedText=await pagesText(exported);
 assert.equal(exportedText.length,3,'empty added rows do not append an extra page to an old one-page card');
 assert.deepEqual(exportedText[2],(await pagesText(legacyPdf))[2],'standard card text and table order stay exactly as in the previous 26-row export');
 assert(exportedText[1].join(' ').includes('BEVARA TEXT OCH PILAR'),'schema-3 annotation text remains searchable after export');
 assert(exportedText[2].includes('GAMLA KORTETS ANTECKNING'));assert(exportedText[2].includes('310-50'));
 assert(!exportedText.flat().includes('DA-OLD-MODEL'),'standalone symbols retain no product appendix');
 assert.deepEqual((await P.inspect(exported)).state,base);assert.deepEqual((await P.inspect(exported)).original,source.bytes);
 assert.deepEqual(base,before,'export does not save or mutate the active card');

 const extras=clone(base),extended=clone(extras.cards['GS1:1']);
 const extraRows=extended.rows.filter(row=>row.id.startsWith('extra-'));assert.equal(extraRows.length,13);
 for(const [index,row]of extraRows.entries())Object.assign(row,{product:'EXTRA-'+String(index+1).padStart(2,'0'),quantity:index+1,delivery:'DT',installer:'GS'});
 extended.note='BASKORTETS ANTECKNING';D.updateCard(extras,'GS1:1',extended);
 const extrasBefore=clone(extras),full=await P.build(extras,source.bytes),fullText=await pagesText(full);
 assert.equal(fullText.length,4,'only a filled additional section appends a continuation page');
 assert(fullText[2].includes('BASKORTETS ANTECKNING'));assert(!fullText[2].some(s=>s.startsWith('EXTRA-')),'standard card layout stays on its original page');
 assert(fullText[3].includes('BESLAGSKORT · FORTSÄTTNING'));assert(fullText[3].includes('GS1:1'));
 assert(fullText[3].includes('ÖVRIGA TILLBEHÖR'));
 for(let n=1;n<=13;n++)assert(fullText[3].includes('EXTRA-'+String(n).padStart(2,'0')),'every added product remains searchable');
 assert(fullText[3].includes('Arbetsmoment: förberedelse nattlås'),'labor row is explicitly labeled as work');
 assert(fullText[3].includes('DT')&&fullText[3].includes('GS'),'delivery and installer fields are retained on continuation');
 const reopened=await P.inspect(full);assert.deepEqual(reopened.state,extras);assert.deepEqual(reopened.original,source.bytes);
 assert.deepEqual(extras,extrasBefore);assert.equal((await lib.PDFDocument.load(await P.build(reopened.state,reopened.original))).getPageCount(),4,'repeat export does not duplicate continuations');

 for(const mode of ['drawing','cards']){
  const bytes=await P.build(extras,source.bytes,{mode}),text=await pagesText(bytes);
  assert.equal(text.length,2);assert.deepEqual((await P.inspect(bytes)).state,extras);
  if(mode==='cards'){assert(text[0].includes('310-50'));assert(text[1].includes('EXTRA-13'));}else assert(!text.flat().some(s=>s.startsWith('EXTRA-')));
 }
 const draft=clone(base.cards['GS1:1']);draft.rows.find(row=>row.id==='extra-door-stop').product='PREVIEW-DOORSTOP';
 const draftBefore=clone(draft),preview=await P.buildCardPreview(base,'GS1:1',draft),previewText=await pagesText(preview);
 assert.equal(previewText.length,2,'one extended card can have a multi-page disposable preview');assert(previewText[1].includes('PREVIEW-DOORSTOP'));
 assert.equal(await P.inspect(preview),null);assert.deepEqual(base,before);assert.deepEqual(draft,draftBefore);
 const savedPreview=await pagesText(await P.buildCardPreview(base,'GS1:1'));assert.equal(savedPreview.length,1);
 const dashes=clone(base.cards['GS1:1']);for(const row of dashes.rows.filter(row=>row.id.startsWith('extra-')))row.product='-';
 assert.equal((await pagesText(await P.buildCardPreview(base,'GS1:1',dashes))).length,1,'placeholder dashes do not create blank continuation pages');
 const invalid=clone(draft);invalid.rows.find(row=>row.id==='extra-door-stop').product='😀';await assert.rejects(P.buildCardPreview(base,'GS1:1',invalid),/tecken|latinska/);
 assert.deepEqual(base,before,'failed preview does not consume draft or change state');
 const missing=clone(extras);missing.cards['GS1:1'].rows.pop();await assert.rejects(P.build(missing,source.bytes),/rad|rader|version/i);
 const blank=await P.blank();assert.equal(blank.state.schema,4);assert.equal((await lib.PDFDocument.load(blank.original)).getPageCount(),1);
 const example=await P.example(),exampleText=await pagesText(await P.build(example.state,example.original));assert.equal(exampleText.length,13,'the existing 50-door example stays at its original page count');
 console.log('PASS Projektering 2.19 PDF: unchanged standard cards, optional searchable continuation pages, schema2/3→4 migration, text/arrows/source/times retained, isolated multi-page draft previews.');
})().catch(error=>{console.error(error);process.exitCode=1;});
