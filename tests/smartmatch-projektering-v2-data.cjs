'use strict';
// Generated projects only. Verify semantics, geometry and atomic error handling.
const assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-data.js');
const page=(rotation=0)=>rotation===90?{width:800,height:1200,rotation:90,view:[20,30,1220,830],transform:[0,1,1,0,-30,-20]}:{width:1200,height:800,rotation:0,view:[20,30,1220,830],transform:[1,0,0,-1,-20,830]};
function project(){const s=D.createEmpty('Eget projekteringsprov');s.drawing={name:'genererat.pdf',pages:[page(),page(90)]};return D.validate(s);}
function unchangedOnFailure(state,fn,pattern){const before=D.clone(state);assert.throws(fn,pattern);assert.deepEqual(state,before,'failed edits must leave every field untouched');}

const empty=D.createEmpty();
assert.equal(empty.schema,2);assert.equal(empty.placements.length,0);assert.equal(empty.drawing.pages.length,0);assert.equal(Object.keys(empty.cards).length,0);
assert.equal(D.listStencils(empty).length,109);
for(const code of ['GS1','GS65','GS100','DGS100','WC','HWC','VC','HVC','DBL'])assert.equal(empty.stencils[code].kind,'card');
for(const code of ['DA','DS','DADS']){assert.equal(empty.stencils[code].kind,'symbol');assert.equal(empty.stencils[code].shape,'square');}
assert.equal(D.normalizeCode(' gs 65 '),'GS65');assert.equal(D.matchKey('EGEN-42'),'EGEN42');
for(const code of ['','GS','DORRKORT','DORRKORT7','KOD-7','CONSTRUCTOR','__proto__','a<script>','A'.repeat(25)])assert.throws(()=>D.normalizeCode(code));
for(const code of ['ID1','KOD1','DORR1','DBL-DS','EGEN42'])assert.equal(D.normalizeCode(code),code);

const s=project(),p1=D.addPlacement(s,{page:1,stencilId:'GS65',x:.3,y:.4}),firstId=p1.id,p2=D.addPlacement(s,{page:2,stencilId:'GS65',x:.6,y:.3});
assert.equal(Object.keys(s.cards).length,1,'two physical positions use one shared card');
assert.equal(s.placements.length,2);assert.equal(s.cards.GS65.rows.length,26);
const draft=D.clone(s.cards.GS65);draft.meta.fire='EI60';draft.rows[0].product='ST140-50';draft.rows[0].quantity=2;draft.rows[0].delivery='GS';draft.rows[0].installer='DT';draft.note='Delas av båda dörrarna';
assert.equal(s.cards.GS65.rows[0].product,'','draft editing is not a saved project mutation');
D.updateCard(s,'GS65',draft);assert.equal(s.cards.GS65.meta.fire,'EI60');assert.equal(s.cards.GS65.rows[0].quantity,2);assert.equal(s.placements.filter(p=>p.code==='GS65').length,2);
draft.rows[0].product='UNSAVED';assert.equal(s.cards.GS65.rows[0].product,'ST140-50','saved card owns a deep copy');
D.copyCard(s,'GS65','NY-42');assert.equal(s.cards['NY-42'].meta.littera,'NY-42');assert.equal(s.cards['NY-42'].rows[0].product,'ST140-50');
s.cards['NY-42'].rows[0].product='EGET';assert.equal(s.cards.GS65.rows[0].product,'ST140-50');
unchangedOnFailure(s,()=>D.copyCard(s,'GS65','NY-42'),/finns redan/);
unchangedOnFailure(s,()=>D.ensureCard(s,'GS-65'),/förväxlas/);
unchangedOnFailure(s,()=>D.ensureCard(s,'DS'),/symbol/);

const own=D.addStencil(s,{id:'egen-stencil',code:'EGEN42',name:'Egen gul skylt',kind:'card',shape:'rectangle',fill:'#FAE881'});
assert.equal(own.fill,'#fae881');assert.equal(own.id,'egen-stencil');
const ownPlace=D.addPlacement(s,{page:1,stencilId:own.id,x:.65,y:.6,rotation:45});assert(s.cards.EGEN42);assert.equal(ownPlace.rotation,45);
D.updateStencil(s,own.id,{shape:'square',stroke:'#123456'});assert.equal(s.stencils[own.id].stroke,'#123456');assert.equal(s.placements.find(p=>p.id===ownPlace.id).x,.65);
unchangedOnFailure(s,()=>D.addStencil(s,{id:'alias',code:'EGEN-42'}),/förväxlas/);
unchangedOnFailure(s,()=>D.addStencil(s,{id:'duplicate',code:'GS65'}),/finns redan/);
unchangedOnFailure(s,()=>D.updateStencil(s,own.id,{code:'OTHER'}),/ny stencil/);
unchangedOnFailure(s,()=>D.updateStencil(s,own.id,{fill:'url(javascript:bad)'}),/färg/);

const ds=D.addPlacement(s,{page:2,stencilId:'DS',x:.5,y:.5});assert(!Object.hasOwn(s.cards,'DS'),'equipment symbols do not fabricate doorcards');
const revision=s.project.revision;D.updatePlacement(s,firstId,{x:.35,y:.45,rotation:450});assert.equal(s.placements.find(p=>p.id===firstId).rotation,90);assert(s.project.revision>revision);
D.updatePlacement(s,firstId,{locked:true});
unchangedOnFailure(s,()=>D.updatePlacement(s,firstId,{x:.4}),/låst/);
unchangedOnFailure(s,()=>D.removePlacements(s,[firstId,ds.id]),/Lås upp/);
unchangedOnFailure(s,()=>D.removeCard(s,'GS65',{cascade:true}),/Lås upp/);
const dup=D.duplicatePlacements(s,[firstId],{dx:.01,dy:.01});assert.equal(dup.length,1);assert.equal(dup[0].locked,false);assert.notEqual(dup[0].id,firstId);assert.equal(s.placements.find(p=>p.id===firstId).locked,true);
D.updatePlacement(s,firstId,{x:.35,locked:false});assert.equal(s.placements.find(p=>p.id===firstId).locked,false);
unchangedOnFailure(s,()=>D.updatePlacement(s,firstId,{x:.001,rotation:45}),/utanför/);
unchangedOnFailure(s,()=>D.addPlacement(s,{page:1,stencilId:'GS1',x:1,y:.5}),/utanför/);
assert(!s.cards.GS1,'invalid placement cannot leave a newly created card behind');
unchangedOnFailure(s,()=>D.addPlacement(s,{page:99,stencilId:'GS1',x:.5,y:.5}),/Sida/);
unchangedOnFailure(s,()=>D.updatePlacement(s,firstId,{width:0}),/Stämpelbredd/);
unchangedOnFailure(s,()=>D.updatePlacement(s,firstId,{height:Infinity}),/Stämpelhöjd/);
unchangedOnFailure(s,()=>D.removeCard(s,'GS65'),/används/);
unchangedOnFailure(s,()=>D.removeStencil(s,'GS65'),/används/);
D.removeCard(s,'GS65',{cascade:true});assert(!Object.hasOwn(s.cards,'GS65'));assert(!s.placements.some(p=>p.code==='GS65'));assert(s.stencils.GS65,'removing a card leaves its reusable stencil library entry');
D.removeStencil(s,own.id,{cascade:true});assert(!s.stencils[own.id]);assert(!s.placements.some(p=>p.stencilId===own.id));assert(s.cards.EGEN42,'removing a stencil keeps separately saved card content');
D.removeCard(s,'EGEN42');assert(!s.cards.EGEN42);

const product=D.addProduct(s,{name:'Eget lås 42',category:'lock'});assert(product.id.startsWith('custom-'));
assert.equal(D.searchProducts(s,'lock','eget 42')[0].name,'Eget lås 42');assert.equal(D.searchProducts(s,'sensor','ST140').length,0);
unchangedOnFailure(s,()=>D.addProduct(s,{id:product.id,name:'Dubblett',category:'lock'}),/ID används redan/);
const portable=JSON.parse(JSON.stringify(s));assert.deepEqual(D.validate(portable),s);
const invalid=D.clone(s);invalid.placements[0].stencilId='missing';assert.throws(()=>D.validate(invalid),/saknar en stencil/);
const duplicate=D.clone(s);duplicate.placements.push(D.clone(duplicate.placements[0]));assert.throws(()=>D.validate(duplicate),/dubblerade/);
const orphan=D.clone(s);orphan.cards['ORPHAN']=D.createCard('ORPHAN');assert(D.validate(orphan).cards.ORPHAN,'unplaced saved cards are valid');
const noPages=D.clone(s);noPages.drawing.pages=[];assert.throws(()=>D.validate(noPages),/Sida/);
const badMatrix=D.clone(s);badMatrix.drawing.pages[0].transform=[0,0,0,0,0,0];assert.throws(()=>D.validate(badMatrix),/koordinatmatris/);
const malicious=JSON.parse(JSON.stringify(empty));Object.defineProperty(malicious.stencils,'__proto__',{enumerable:true,value:D.defaultStencil('EGEN77')});assert.throws(()=>D.validate(malicious),/ID/);assert.equal({}.polluted,undefined);

console.log('Projektering2 data PASS: shared cards, metadata, 109 stencils, card/symbol placement, rotated/cropped geometry, atomic errors, locks, duplicate/delete cascades, custom products and portable validation.');
