const assert=require('node:assert/strict'),D=require('../smartmatch-projektering-v518-data.js'),Old=require('../smartmatch-projektering-v517-data.js'),P=require('../smartmatch-projektering-v518-pdf.js'),M=require('../smartmatch-projektering-v518-materials.js'),PDF=require('../vendor/pdf-lib.min.js');
(async()=>{
 const state=D.createEmpty(),card=D.createCard('GS4');
 Object.assign(card.rows.find(r=>r.id==='extra-door-stop'),{product:'Golvstopp',quantity:2});
 Object.assign(card.rows.find(r=>r.id==='extra-door-holder'),{product:'Porthållare 270',quantity:1,delivery:'DT',installer:'GS'});
 D.updateCard(state,'GS4',card);D.addStencil(state,D.defaultStencil('GS4'));
 const pdf=await PDF.PDFDocument.create();pdf.addPage([595,842]);state.drawing={name:'prov.pdf',pages:P.metadata(pdf)};D.addPlacement(state,{stencilId:'GS4',page:1,x:.5,y:.5});
 const rows=M.build(state).rows;assert.equal(rows.find(r=>r.product==='Golvstopp').quantity,2);assert.equal(rows.find(r=>r.product==='Porthållare 270').quantity,1);
 for(const editableText of [true,false]){const reopened=await P.inspect(await P.build(state,await pdf.save(),{editableText}));const c=reopened.state.cards.GS4;assert.equal(c.rows.find(r=>r.id==='extra-door-holder').label,'Porthållare');assert.equal(c.rows.find(r=>r.id==='extra-door-stop').label,'Dörrstopp');assert.equal(c.rows.find(r=>r.id==='extra-door-holder').delivery,'DT');}
 for(const product of ['Porthållare 270','Golvstopp']){const legacy=Old.createEmpty(),c=Old.createCard('GS1');Object.assign(c.rows.find(r=>r.id==='extra-door-stop'),{product,quantity:3,note:'Bevara',delivery:'DT',installer:'GS'});Old.updateCard(legacy,'GS1',c);const before=JSON.stringify(legacy),updated=D.validate(legacy).cards.GS1;const target=updated.rows.find(r=>r.id===(product==='Golvstopp'?'extra-door-stop':'extra-door-holder'));assert.equal(target.product,product);assert.equal(target.quantity,3);assert.equal(target.note,'Bevara');assert.equal(target.delivery,'DT');assert.equal(JSON.stringify(legacy),before);assert.deepEqual(D.validate(D.validate(legacy)),D.validate(legacy));}
 console.log('PASS separate rows, independent quantities/owners, material totals, PDF modes, lossless and idempotent old-card upgrade');
})().catch(e=>{console.error(e);process.exitCode=1});
