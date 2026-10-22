'use strict';
// Model, JSON and browser-store bytes only; no images or screenshots.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const D=require('../smartmatch-projektering-v2-13-data.js'),L=require('../smartmatch-projektering-v2-13-library.js');
const Old=require('../smartmatch-projektering-v2-10-data.js');
const copy=value=>JSON.parse(JSON.stringify(value));
const page={width:1200,height:800,rotation:0,view:[0,0,1200,800],transform:[1,0,0,-1,0,800]};
function unchanged(state,action,pattern){const before=copy(state);assert.throws(action,pattern);assert.deepEqual(state,before,'failed mutation leaves the project untouched');}

(async()=>{
const fresh=D.createEmpty('Nya beteckningar'),beforeFresh=copy(fresh);
assert.equal(Object.keys(fresh.stencils).length,107);assert.equal(Object.keys(fresh.cards).length,0);
for(let index=1;index<=100;index++){
 const base='GS'+index,code=base+':1';
 assert.equal(D.initialCardCode(base),code);assert.equal(fresh.stencils[code].id,code);assert.equal(fresh.stencils[code].code,code);assert.equal(fresh.stencils[code].name,code);
 assert.equal(fresh.stencils[code].kind,'card');assert.equal(fresh.stencils[base],undefined);assert.equal(D.suggestCardCode(fresh,base),code);
 assert.equal(D.suggestForkCode(fresh,code),code,'unused exact templates are available for an actual card');
 assert.equal(D.suggestStencilCode(fresh,code),base+':2','new stencil creation still skips existing templates');
}
for(const base of ['DGS100','WC','HWC','DBL']){const code=base+':1';assert.equal(D.initialCardCode(base),code);assert.equal(fresh.stencils[code].kind,'card');assert.equal(fresh.stencils[base],undefined);assert.equal(D.suggestCardCode(fresh,base),code);}
for(const code of ['DA','DS','DFS']){assert.equal(D.initialCardCode(code),code);assert.equal(fresh.stencils[code].kind,'symbol');assert.equal(fresh.stencils[code+':1'],undefined);}
for(const code of ['GS4:1','GS4:2','GS4-A','GS101','EGEN1','DADS'])assert.equal(D.initialCardCode(code),code,'custom, legacy and already numbered names stay exact');
assert.equal(D.initialCardCode(' gs 65 '),'GS65:1');assert.deepEqual(fresh,beforeFresh,'suggestion and mapping helpers do not mutate the project');
D.ensureCard(fresh,D.suggestCardCode(fresh,'GS1'));assert.equal(fresh.cards['GS1:1'].meta.littera,'GS1:1');assert.equal(D.suggestCardCode(fresh,'GS1'),'GS1:2');
fresh.drawing={name:'ny.pdf',pages:[page]};
D.addPlacement(fresh,{id:'first-door',stencilId:'GS1:1',page:1,x:.25,y:.4});D.addPlacement(fresh,{id:'same-card-door',stencilId:'GS1:1',page:1,x:.5,y:.4});
const firstSaved=copy(fresh.cards['GS1:1']);D.forkPlacementCard(fresh,'first-door',D.suggestForkCode(fresh,'GS1:1'));
assert.equal(fresh.placements[0].code,'GS1:2');assert.equal(fresh.placements[1].code,'GS1:1');assert.deepEqual(fresh.cards['GS1:1'],firstSaved);assert.equal(D.suggestCardCode(fresh,'GS1'),'GS1:3');
assert.equal(D.defaultStencil('GS1').code,'GS1','explicit requested templates retain their exact identity');
const custom=D.createEmpty();D.addStencil(custom,{...D.defaultStencil('EGEN1'),id:'custom-stencil'});assert.equal(D.suggestCardCode(custom,'EGEN1'),'EGEN1','unused custom card templates can create their first actual card');
D.ensureCard(custom,'EGEN1');assert.equal(D.suggestCardCode(custom,'EGEN1'),'EGEN1:1');
const alias=D.createEmpty();D.removeStencil(alias,'GS1:1');D.addStencil(alias,D.defaultStencil('GS-1:1'));assert.equal(D.suggestCardCode(alias,'GS1'),'GS1:2','aliases reserve their compact identity');
const symbolReserved=D.createEmpty();D.removeStencil(symbolReserved,'GS2:1');D.addStencil(symbolReserved,{...D.defaultStencil('GS2:1'),kind:'symbol'});assert.equal(D.suggestCardCode(symbolReserved,'GS2'),'GS2:2','a symbol template cannot be reused as an actual card');

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

// A project already saved in 2.12 after deleting :2 must fill that hole,
// even though its old card stencil remains in the drawing project/library.
const V12=require('../smartmatch-projektering-v2-12-data.js');
const deleted=V12.createEmpty('Lucka från äldre version');deleted.drawing={name:'gammal.pdf',pages:[page]};
const one=V12.createCard('GS1:1');one.rows[0].product='310-50';V12.updateCard(deleted,'GS1:1',one);
for(const number of [2,3])V12.copyCard(deleted,'GS1:1','GS1:'+number);
V12.addStencil(deleted,{...V12.defaultStencil('GS1:2'),id:'retained-style',name:'Egen äldre mall',fill:'#abcdef',width:79,height:38});
V12.addStencil(deleted,V12.defaultStencil('GS1:3'));
V12.addPlacement(deleted,{id:'unchanged-door-three',stencilId:'GS1:3',page:1,x:.72,y:.66,rotation:35,width:58,height:22,note:'Behåll trean'});
V12.addPlacement(deleted,{id:'own-source-door',stencilId:'GS1:1',page:1,x:.2,y:.3,rotation:72,width:82,height:40,locked:true,note:'Behåll geometri'});
V12.removeCard(deleted,'GS1:2');const oldDeleted=copy(deleted),gap=D.validate(deleted);
assert.deepEqual(gap,oldDeleted,'opening old deleted-card data does not rewrite identities or add metadata');
assert.equal(D.suggestCardCode(gap,'GS1:3'),'GS1:2');assert.equal(D.suggestForkCode(gap,'GS1:3'),'GS1:2');
assert.equal(D.suggestStencilCode(gap,'GS1:3'),'GS1:4','a new stencil cannot reuse the retained stencil ID');
const oldTwoStencil=copy(gap.stencils['retained-style']),oldThree=copy(gap.cards['GS1:3']),oldThreeDoor=copy(gap.placements[0]);
D.copyCard(gap,'GS1:3',D.suggestForkCode(gap,'GS1:3'));
assert.deepEqual(gap.stencils['retained-style'],oldTwoStencil,'copying into the hole retains exact stencil ID and appearance');
assert.equal(gap.cards['GS1:2'].rows[0].product,'310-50');assert.equal(D.suggestForkCode(gap,'GS1:2'),'GS1:4','after filling two, the still-used three is skipped');
gap.cards['GS1:2'].rows[0].product='411-50';assert.equal(gap.cards['GS1:3'].rows[0].product,'310-50','copied card rows remain independent');
D.removeCard(gap,'GS1:2');assert.equal(D.suggestCardCode(gap,'GS1:3'),'GS1:2');
const retainedSource=copy(gap.cards['GS1:1']),sourceDoor=copy(gap.placements.find(place=>place.id==='own-source-door')),privateDraft=copy(retainedSource);privateDraft.rows[0].product='511-50';
D.forkPlacementCard(gap,'own-source-door',D.suggestForkCode(gap,'GS1:1'),privateDraft);
const reusedDoor=gap.placements.find(place=>place.id==='own-source-door');
assert.equal(reusedDoor.code,'GS1:2');assert.equal(reusedDoor.stencilId,'retained-style');assert.deepEqual(gap.stencils['retained-style'],oldTwoStencil);
assert.deepEqual({...reusedDoor,code:sourceDoor.code,stencilId:sourceDoor.stencilId},sourceDoor,'reuse keeps selected locked physical geometry');
assert.deepEqual(gap.cards['GS1:1'],retainedSource);assert.equal(gap.cards['GS1:2'].rows[0].product,'511-50');
assert.deepEqual(gap.cards['GS1:3'],oldThree);assert.deepEqual(gap.placements.find(place=>place.id==='unchanged-door-three'),oldThreeDoor,'three is never renumbered or moved');
unchanged(gap,()=>D.removeCard(gap,'GS1:2',{cascade:true}),/Lås upp/);
D.removeCard(gap,'GS1:1');assert.equal(D.suggestCardCode(gap,'GS1:3'),'GS1:1','the initial template can fill a deleted first-card hole too');
D.ensureCard(gap,D.suggestCardCode(gap,'GS1:3'));assert.equal(D.suggestForkCode(gap,'GS1:3'),'GS1:4');

const reserved=D.createEmpty();for(let number=1;number<=6;number++)D.ensureCard(reserved,'GS1:'+number);
D.addStencil(reserved,{...D.defaultStencil('GS1:7'),id:'unused-seven',fill:'#c0ffee'});
assert.equal(D.suggestCardCode(reserved,'GS1:6'),'GS1:7');assert.equal(D.suggestForkCode(reserved,'GS1:6'),'GS1:7');assert.equal(D.suggestStencilCode(reserved,'GS1:6'),'GS1:8');
D.copyCard(reserved,'GS1:6','GS1:7');assert.equal(reserved.stencils['unused-seven'].fill,'#c0ffee');assert.equal(D.suggestForkCode(reserved,'GS1:7'),'GS1:8');
const aliasHole=D.validate(oldDeleted);D.removeStencil(aliasHole,'retained-style');D.addStencil(aliasHole,D.defaultStencil('GS-1:2'));
assert.equal(D.suggestForkCode(aliasHole,'GS1:3'),'GS1:4','non-exact aliases keep their identity reservation');
unchanged(aliasHole,()=>D.forkPlacementCard(aliasHole,'own-source-door','GS1:2'),/förväxlas/);
const symbolHole=D.validate(oldDeleted);D.removeStencil(symbolHole,'retained-style');D.addStencil(symbolHole,{...D.defaultStencil('GS1:2'),kind:'symbol'});
assert.equal(D.suggestForkCode(symbolHole,'GS1:3'),'GS1:4','symbol codes are never available as card holes');
unchanged(symbolHole,()=>D.forkPlacementCard(symbolHole,'own-source-door','GS1:2'),/finns redan/);

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
const oldLibProvider=require('../smartmatch-projektering-v2-11-library.js');
let oldLib=oldLibProvider.assignGroup(oldLibProvider.createDefault(),'GS1','DBL');oldLib=oldLibProvider.assignGroup(oldLib,'GS1:1','WC-HWC');oldLib=oldLibProvider.setHidden(oldLib,'GS1',true);oldLib=oldLibProvider.saveStencil(oldLib,{...Old.defaultStencil('GS2'),fill:'#abcdef'});
const savedOldLib=copy(oldLib),newLib=L.validate(oldLib);assert.deepEqual(newLib,savedOldLib,'loading an older library never rewrites templates, hidden codes or assignments');
assert.equal(L.isHidden(newLib,'GS1'),true);assert.equal(L.isHidden(newLib,'GS1:1'),false);assert.equal(L.isHidden(newLib,'GS1:2'),false);
assert.equal(L.groupFor(newLib,D.defaultStencil('GS1')),'DBL');assert.equal(L.groupFor(newLib,D.defaultStencil('GS1:1')),'WC-HWC');assert.equal(L.groupFor(newLib,D.defaultStencil('GS1:2')),'GS');
assert.deepEqual(newLib,savedOldLib,'exact-code lookups do not mutate an older saved library');
let edited=L.setHidden(newLib,'GS1:1',true);assert(L.isHidden(edited,'GS1'));assert(L.isHidden(edited,'GS1:1'));edited=L.setHidden(edited,'GS1',false);assert(!L.isHidden(edited,'GS1'));assert(L.isHidden(edited,'GS1:1'),'old base and private :1 are independently hidden');
edited=L.assignGroup(edited,'GS1','cards-other');assert.equal(edited.assignments['GS1:1'],'WC-HWC');edited=L.assignGroup(edited,'GS1:1','DBL');assert.equal(edited.assignments.GS1,'cards-other');assert.equal(edited.assignments['GS1:1'],'DBL','editing a private card group never erases the older base group');
edited=L.saveStencil(edited,D.defaultStencil('GS1'));assert(L.isHidden(edited,'GS1:1'),'saving an old base template never unhides a distinct private card');
const hiddenBase=L.setHidden(newLib,'GS1',true),savedPrivate=L.saveStencil(hiddenBase,D.defaultStencil('GS1:1'));assert(L.isHidden(savedPrivate,'GS1'),'saving a private template never unhides its old base code');
assert.equal(L.groupFor(L.assignGroup(L.createDefault(),'GS100','DBL'),D.defaultStencil('GS100:1')),'GS','new numbered templates follow the existing family prefix until explicitly grouped');
assert.deepEqual(oldLib,savedOldLib,'edits return new records and leave the imported older library untouched');assert.deepEqual(L.unpack(L.pack(edited)),edited);

// The reused browser store resolves the current global model, including the new preferences.
const context={Proj2Data:D,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,Buffer};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../smartmatch-projektering-v2-store.js'),'utf8'),context);
const source=new TextEncoder().encode('%PDF-1.7\n');const packed=await context.Proj2Store.pack(state,source),restored=await context.Proj2Store.unpack(packed);
assert.deepEqual(copy(restored.state),state);assert.deepEqual(Array.from(restored.original),Array.from(source));
const gapPacked=await context.Proj2Store.pack(D.validate(oldDeleted),source),gapRestored=await context.Proj2Store.unpack(gapPacked);
assert.deepEqual(copy(gapRestored.state),oldDeleted);assert.equal(D.suggestForkCode(gapRestored.state,'GS1:3'),'GS1:2','a persisted older orphan stencil stays available after a project-file roundtrip');
assert.deepEqual(Old.createEmpty('Historisk').preferences.materialTimes,undefined,'archived model is unchanged');
console.log('PASS Projektering 2.13 data/library/store: lowest free card numbers including old deleted-card gaps, exact retained stencil/style reuse, independent sources/geometry, reserved new-stencil numbering, symbol/alias protection, legacy identities, saved times and project-file roundtrips.');
})().catch(error=>{console.error(error);process.exitCode=1;});
