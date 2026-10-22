'use strict';
// Model, JSON and browser-store bytes only; no images or screenshots.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const D=require('../smartmatch-projektering-v2-11-data.js'),L=require('../smartmatch-projektering-v2-11-library.js');
const Old=require('../smartmatch-projektering-v2-10-data.js');
const copy=value=>JSON.parse(JSON.stringify(value));
const page={width:1200,height:800,rotation:0,view:[0,0,1200,800],transform:[1,0,0,-1,0,800]};
function unchanged(state,action,pattern){const before=copy(state);assert.throws(action,pattern);assert.deepEqual(state,before,'failed mutation leaves the project untouched');}

(async()=>{
const legacy=Old.createEmpty('Äldre projekt');Old.ensureCard(legacy,'GS4-A');
const state=D.validate(legacy);state.drawing={name:'ritning.pdf',pages:[page]};
assert.equal(state.schema,2);assert.deepEqual(state.preferences.materialTimes,{});assert.deepEqual(state.cards['GS4-A'],legacy.cards['GS4-A'],'older letter suffixes are retained');
assert.equal(D.normalizeCode(' gs 4 : 2 '),'GS4:2');assert.equal(D.matchKey('GS-4:1'),'GS4:1');assert.notEqual(D.matchKey('GS4:1'),D.matchKey('GS41'));assert.equal(D.matchKey('GS-41'),D.matchKey('GS41'),'older hyphen aliases stay equivalent');
for(const code of [':1','GS4:','GS4::1','GS4:0','GS4:01','GS4:A','GS4:1:2','GS4-:1','DORRKORT:1','GS:1','CONSTRUCTOR:1'])assert.throws(()=>D.normalizeCode(code),/Beteckningen|rubrik/);
for(let index=0;index<5;index++)D.addPlacement(state,{id:'door-'+index,stencilId:'GS4',page:1,x:.1+index*.18,y:.4,width:61,height:30,rotation:27,locked:index===0,note:'Dörr '+index});
const shared=copy(state.cards.GS4);shared.rows[0].product='511-50';shared.note='Gemensamt';D.updateCard(state,'GS4',shared);
assert.equal(D.suggestForkCode(state,'GS4'),'GS4:1');
const before=copy(state),draft=copy(shared);draft.rows[0].product='310-50';draft.note='Bara denna';
D.forkPlacementCard(state,'door-0','GS4:1',draft);
assert.deepEqual(state.cards.GS4,before.cards.GS4);assert.deepEqual(state.placements.slice(1),before.placements.slice(1));
assert.deepEqual({...state.placements[0],code:'GS4',stencilId:'GS4'},before.placements[0],'selected locked geometry and metadata are preserved');
assert.equal(state.cards['GS4:1'].rows[0].product,'310-50');assert.equal(state.cards['GS4:1'].meta.littera,'GS4:1');
assert.equal(state.stencils['GS4:1'].code,'GS4:1');assert.equal(D.suggestForkCode(state,'GS4'),'GS4:2');assert.equal(D.suggestForkCode(state,'GS4:1'),'GS4:2');
D.forkPlacementCard(state,'door-1',D.suggestForkCode(state,'GS4'));
assert.equal(state.placements[1].code,'GS4:2');assert.equal(D.suggestForkCode(state,'GS4'),'GS4:3');assert.equal(state.stencils.GS41.code,'GS41');
unchanged(state,()=>D.forkPlacementCard(state,'door-2','GS4-1'),/förväxlas/);
unchanged(state,()=>D.forkPlacementCard(state,'door-2','GS4:1'),/finns redan/);
unchanged(state,()=>D.forkPlacementCard(state,'missing','GS4:3'),/Markera en dörr/);
unchanged(state,()=>D.forkPlacementCard(state,'door-2','GS4:3',{...shared,code:'GS5'}),/stämmer inte/);
D.updateStencil(state,'GS4:1',{fill:'#c0ffee'});assert.equal(state.stencils['GS4:1'].fill,'#c0ffee');
unchanged(state,()=>D.resizeStencilShared(state,'GS4:1',65,31),/låst/);
const long=D.suggestForkCode(D.createEmpty(),'ABCDEFGHIJKLMNOPQRSTUVWX');assert(long.length<=24);assert.equal(D.normalizeCode(long),long);
const movable=copy(state);D.updatePlacement(movable,'door-0',{locked:false});D.updatePlacement(movable,'door-0',{x:.2});D.removeStencil(movable,'GS4:1',{cascade:true});assert(!movable.placements.some(item=>item.code==='GS4:1'));

const key=JSON.stringify(['lock',false,'310-50']),zeroKey=JSON.stringify(['elbow',false,'jck207']);
D.setMaterialTime(state,key,12.5);D.setMaterialTime(state,zeroKey,0);
assert.equal(state.preferences.materialTimes[key],12.5);assert(Object.hasOwn(state.preferences.materialTimes,zeroKey));assert.equal(state.preferences.materialTimes[zeroKey],0);
const changedRevision=state.project.revision;D.setPreferences(state,{autoOpenCard:false});assert.equal(state.preferences.materialTimes[key],12.5);assert(state.project.revision>changedRevision);
const saved=copy(state);assert.deepEqual(D.validate(saved),state,'JSON reload keeps explicit zero, unit times and private cards');
const preferences={materialTimes:{[key]:20}};D.setPreferences(state,preferences);preferences.materialTimes[key]=99;assert.equal(state.preferences.materialTimes[key],20,'caller maps do not alias saved project preferences');
D.setMaterialTime(state,key,100000);assert.equal(state.preferences.materialTimes[key],100000);D.setMaterialTime(state,key,null);assert(!Object.hasOwn(state.preferences.materialTimes,key));D.setMaterialTime(state,key,10);
for(const value of [-1,100001,Infinity,-Infinity,NaN,'10',undefined,null]){
 if(value===null)continue;
 unchanged(state,()=>D.setMaterialTime(state,key,value),/Tid per styck/);
}
for(const key of ['','  bad','bad  ','__proto__','constructor','prototype','x'.repeat(401),'x\u0001'])unchanged(state,()=>D.setMaterialTime(state,key,10),/nyckel/);
for(const input of [null,[],{[key]:null},{[key]:'10'},JSON.parse('{"__proto__":10}')])unchanged(state,()=>D.setPreferences(state,{materialTimes:input}),/montagetider|Tid per styck|nyckel/);
const oversized=Object.fromEntries(Array.from({length:D.LIMITS.materialTimes+1},(_,index)=>['r'+index,1]));unchanged(state,()=>D.setPreferences(state,{materialTimes:oversized}),/montagetider/);
const badPosition=copy(state);badPosition.placements[0].id='door:1';assert.throws(()=>D.validate(badPosition),/Positions-ID/);
const badProject=copy(state);badProject.project.id='project:1';assert.throws(()=>D.validate(badProject),/Projekt-ID/);
const badProduct=copy(state);badProduct.customProducts.push({id:'product:1',name:'Eget lås',category:'lock',description:''});assert.throws(()=>D.validate(badProduct),/Produkt-ID/);

let lib=L.saveStencil(L.createDefault(),state.stencils['GS4:1']);lib=L.saveStencil(lib,D.defaultStencil('GS41'));
assert.deepEqual(lib.stencils.map(item=>item.code),['GS4:1','GS41']);assert.equal(lib.stencils[0].id,'GS4:1');assert.equal(L.groupFor(lib,state.stencils['GS4:1']),'GS');
lib=L.saveGroup(lib,{id:'private',name:'Enskilda dörrar',section:'cards',prefixes:['GS4:1']});lib=L.assignGroup(lib,'GS4:1','private');
assert.equal(L.groupFor(lib,state.stencils['GS4:1']),'private');lib=L.setHidden(lib,'GS4:1',true);assert.deepEqual(L.unpack(L.pack(lib)),lib,'colon stencil IDs, hidden entries and assignments survive library export');

// The reused browser store resolves the current global model, including the new preferences.
const context={Proj2Data:D,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,Buffer};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../smartmatch-projektering-v2-store.js'),'utf8'),context);
const source=new TextEncoder().encode('%PDF-1.7\n');const packed=await context.Proj2Store.pack(state,source),restored=await context.Proj2Store.unpack(packed);
assert.deepEqual(copy(restored.state),state);assert.deepEqual(Array.from(restored.original),Array.from(source));
assert.deepEqual(Old.createEmpty('Historisk').preferences.materialTimes,undefined,'archived model is unchanged');
console.log('PASS Projektering 2.11 data/library/store: numeric private cards, GS41 separation, older card preservation, atomic changes, safe IDs, saved per-unit times including zero, and JSON/library/project-file roundtrips.');
})().catch(error=>{console.error(error);process.exitCode=1;});
