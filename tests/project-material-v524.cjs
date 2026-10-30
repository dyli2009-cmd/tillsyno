const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../smartmatch-projektering-v519-data.js'),M=require('../smartmatch-projektering-v519-materials.js'),P=require('../smartmatch-projektering-v519-pdf.js'),PDF=require('../vendor/pdf-lib.min.js'),X=require('../smartmatch-project-material-v524.js'),T=require('../tillsyno-projection-times-v513.js');
(async()=>{
 const pdf=await PDF.PDFDocument.create();pdf.addPage([595,842]);const state=D.createEmpty(),card=D.createCard('GS4');
 Object.assign(card.rows.find(r=>r.id==='day-lock'),{product:'212-50',quantity:1});Object.assign(card.rows.find(r=>r.id==='closing-elbow'),{product:'AK'});Object.assign(card.rows.find(r=>r.id==='night-lock'),{product:'222-50',installer:'DT'});
 D.updateCard(state,'GS4',card);D.addStencil(state,D.defaultStencil('GS4'));state.drawing={name:'prov.pdf',pages:P.metadata(pdf)};for(const x of [.3,.7])D.addPlacement(state,{stencilId:'GS4',page:1,x,y:.4});
 const unplaced=D.createCard('GS9');unplaced.rows[0].product='310-50';D.updateCard(state,'GS9',unplaced);
 const bytes=await P.build(state,await pdf.save()),doc=await PDF.PDFDocument.load(bytes),snapshot=X.read(doc,PDF,M);assert.equal(snapshot.rows.length,2);assert.equal(snapshot.rows.find(r=>r.product==='212-50').quantity,2);assert.equal(snapshot.rows.find(r=>r.product==='AK').quantity,4);assert.equal(X.totals(snapshot).total,91.2);assert(!snapshot.rows.some(r=>r.product==='222-50'||r.product==='310-50'));assert.equal(X.read(pdf,PDF,M),null);
 const saved={version:1,source:'projection',rows:snapshot.rows};assert.deepEqual(X.validate(JSON.parse(JSON.stringify(saved))),snapshot);
 assert(snapshot.rows.every(r=>r.sources.length>0));console.log('PASS v524 real PDF source links and material quantities, DT/unplaced exclusions and round trip');
})().catch(e=>{console.error(e);process.exitCode=1});
