'use strict';
const assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-10-data.js');
const P=require('../smartmatch-projektering-v2-10-pdf.js');
const PDF=require('../vendor/pdf-lib.min.js');
const M=require('../smartmatch-projektering-v2-6-materials.js');
const copy=value=>JSON.parse(JSON.stringify(value));
function unchanged(state,action,pattern){const before=copy(state);assert.throws(action,pattern);assert.deepEqual(state,before,'failed fork must leave the project unchanged');}

(async()=>{
 const blank=await P.blank('Dörrkort utan ritningsfil'),state=blank.state;
 assert.equal(state.schema,2);assert.equal(state.drawing.pages.length,1);assert.equal(state.drawing.name,'Tom sida.pdf');
 assert.equal(Object.keys(state.cards).length,0);assert.equal(state.placements.length,0);
 const source=await PDF.PDFDocument.load(blank.original),page=source.getPage(0);
 assert.equal(source.getPageCount(),1);assert(Math.abs(page.getWidth()-1190.55)<.01&&Math.abs(page.getHeight()-841.89)<.01,'blank is A3 landscape');
 assert.equal(page.node.Contents(),undefined,'blank has no labels or drawing contents');
 assert.deepEqual(P.metadata(source),state.drawing.pages);assert.equal(await P.inspect(blank.original),null,'blank source is a clean PDF, not a project export');

 D.updateStencil(state,'GS4',{fill:'#c0ffee',shape:'oval',stroke:'#123456'});
 for(let n=0;n<5;n++)D.addPlacement(state,{id:'door-'+n,stencilId:'GS4',page:1,x:.15+n*.16,y:.4,width:61,height:30,rotation:27,locked:n===0,note:'Fysisk dörr '+n});
 const shared=copy(state.cards.GS4);shared.meta.fire='EI60';shared.rows.find(row=>row.id==='day-lock').product='511-50';shared.rows.find(row=>row.id==='day-lock').quantity=2;shared.rows.find(row=>row.id==='closing-elbow').product='JCK207';shared.note='Gemensamt GS4-kort';D.updateCard(state,'GS4',shared);
 assert.equal(D.suggestForkCode(state,'GS4'),'GS4-A');
 const original=copy(state),draft=copy(shared);draft.rows.find(row=>row.id==='day-lock').product='310-50';draft.rows.find(row=>row.id==='day-lock').quantity=3;draft.rows.find(row=>row.id==='day-lock').delivery='DT';draft.rows.find(row=>row.id==='day-lock').installer='GS';draft.note='Bara denna dörr';
 const draftBefore=copy(draft),fork=D.forkPlacementCard(state,'door-0','GS4-A',draft);
 assert.equal(fork.code,'GS4-A');assert.equal(fork.meta.littera,'GS4-A');assert.equal(fork.meta.fire,'EI60');assert.equal(fork.note,'Bara denna dörr');
 assert.deepEqual(state.cards.GS4,original.cards.GS4,'unsaved draft is only copied to the individual card');
 assert.deepEqual(draft,draftBefore,'draft is not consumed or rewritten');
 assert.deepEqual(state.placements.slice(1),original.placements.slice(1),'other four GS4 doors are untouched');
 const selected=state.placements[0];assert.deepEqual({...selected,code:'GS4',stencilId:'GS4'},original.placements[0],'selected geometry, lock and metadata are unchanged');
 assert.equal(selected.code,'GS4-A');assert.equal(selected.locked,true,'a card-only fork does not unlock geometry');
 const st=state.stencils[selected.stencilId];assert.deepEqual({...st,id:'GS4',code:'GS4',name:'GS4'},original.stencils.GS4,'new stencil retains source appearance');
 assert.equal(D.placementCounts(state).markings,5);assert.equal(D.placementCounts(state).cards,2);assert.equal(D.suggestForkCode(state,'GS4'),'GS4-B');
 fork.rows.find(row=>row.id==='day-lock').installer='DT';assert.equal(state.cards.GS4.rows.find(row=>row.id==='day-lock').installer,'GS','fork rows do not alias the original card');
 const report=M.build(state);assert.equal(report.rows.find(row=>row.product==='511-50').quantity,8);assert.equal(report.rows.find(row=>row.product==='310-50').quantity,3);assert.equal(report.rows.find(row=>row.product==='JCK207').quantity,10,'contacts retain ×2 on both independent card groups');

 unchanged(state,()=>D.forkPlacementCard(state,'missing','GS4-B'),/Markera en dörr/);
 unchanged(state,()=>D.forkPlacementCard(state,'door-1','GS4'),/finns redan/);
 unchanged(state,()=>D.forkPlacementCard(state,'door-1','GS4-1'),/förväxlas/);
 unchanged(state,()=>D.forkPlacementCard(state,'door-1','GS4-A'),/finns redan/);
 unchanged(state,()=>D.forkPlacementCard(state,'door-1','Dörrkort'),/Beteckningen|rubrik|bokstäver/);
 unchanged(state,()=>D.forkPlacementCard(state,'door-1','GS4-B',{...shared,code:'GS9'}),/stämmer inte/);
 const symbol=copy(state);D.addPlacement(symbol,{id:'symbol-da',stencilId:'DA',page:1,x:.4,y:.7});unchanged(symbol,()=>D.forkPlacementCard(symbol,'symbol-da','GS4-B'),/med dörrkort/);
 const badDraft=copy(shared);badDraft.rows[0].quantity=0;unchanged(state,()=>D.forkPlacementCard(state,'door-1','GS4-B',badDraft),/Antal/);
 const collision=copy(state);D.addStencil(collision,{...D.defaultStencil('GS4B'),id:'custom-alias'});assert.equal(D.suggestForkCode(collision,'GS4'),'GS4-C','suggestion respects compact matching aliases, not just exact codes');
 const idCollision=copy(state);D.addStencil(idCollision,{...D.defaultStencil('STENCIL-CUSTOM'),id:'GS4-B'});const moved=D.forkPlacementCard(idCollision,'door-1','GS4-B');assert.equal(moved.code,'GS4-B');assert.notEqual(idCollision.placements[1].stencilId,'GS4-B','arbitrary stencil ID collisions use a separate safe ID');
 const longCode='ABCDEFGHIJKLMNOPQRSTUVWX',longState=D.createEmpty();const proposed=D.suggestForkCode(longState,longCode);assert(proposed.length<=24);assert.equal(D.normalizeCode(proposed),proposed);
 const limited=copy(state);for(let n=0;Object.keys(limited.cards).length<D.LIMITS.cards;n++){const code='OWN'+n;limited.cards[code]=D.createCard(code);}unchanged(limited,()=>D.forkPlacementCard(limited,'door-1','GS4-B'),/högst 500 dörrkort/);

 const before=copy(state),combined=await P.build(state,blank.original),restored=await P.inspect(combined);
 assert.deepEqual(state,before,'PDF export never changes the editable cards');assert.deepEqual(restored.state,state,'forked cards and one-door assignment survive a project PDF');assert.deepEqual(restored.original,blank.original,'blank drawing remains the exact clean source');
 assert.equal((await PDF.PDFDocument.load(combined)).getPageCount(),3,'combined export contains blank stamped drawing plus both cards');
 for(const mode of ['drawing','cards']){const result=await P.build(state,blank.original,{mode});assert.deepEqual((await P.inspect(result)).state,state);}
 console.log('PASS Projektering 2.10 data/PDF: one-door fork with draft isolation, locked geometry, match-safe codes, atomic failures, material quantities and blank A3 project-PDF roundtrips.');
})().catch(error=>{console.error(error);process.exitCode=1;});
