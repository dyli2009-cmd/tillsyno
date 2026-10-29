'use strict';
const assert=require('node:assert/strict');
const C=require('../smartmatch-projektering-v2-19-catalog.js');
const D=require('../smartmatch-projektering-v2-19-data.js');
const L=require('../smartmatch-projektering-v2-19-library.js');
const S=require('../smartmatch-projektering-v2-19-store.js');
const M=require('../smartmatch-projektering-v2-19-materials.js');
const P=require('../smartmatch-projektering-v2-19-pdf.js');
const fixture=require('./fixtures/projektering-v2-18-catalog19-legacy.json');
const clone=value=>JSON.parse(JSON.stringify(value));
(async()=>{
 const state=D.createEmpty(),lib=L.createDefault();
 for(const [category,name]of [['lock','310-50'],['lock','EL580'],['closer','DC700'],['closer','TS93 B'],['operator','ED100LE'],['operator','SW300'],['closer-arm','G93N'],['activation','KT 3-1'],['coordinator','SR 390']]){
  assert(L.searchProducts(lib,state,category,name).some(p=>p.name===name),name+' remains available');
  assert(D.searchProducts(state,category,name).some(p=>p.name===name),name+' remains available in direct search');
 }
 const excluded=[['closer','TS5000'],['lock','SL620'],['strike','STEP 90'],['sensor','FLATSCAN 3D'],['pull','PP-604'],['magnet','MC240'],['battery','Batteribackup']];
 for(const [category,name]of excluded){
  assert.equal(L.searchProducts(lib,state,category,name).length,0,name+' is absent from choices');
  assert.equal(D.searchProducts(state,category,name).length,0,name+' is absent from direct suggestions');
  assert.equal(C.selectionList({category,query:name,includeReference:true}).length,0,name+' is absent from visible register');
 }
 assert(C.selectionList().some(p=>p.kind==='work'),'preparation work stays separate from manufacturers');
 assert(!C.isAllowedProduct({category:'lock',name:'ASSA TS5000'}),'brand text cannot disguise an unknown model');
 assert(!C.isAllowedProduct({category:'lock',name:'TS93'}),'category must match');
 assert(C.isAllowedProduct({category:'operator',name:'  ｅｄ１００ｌｅ  '}));
 const brands=new Set(['ASSA ABLOY','ABLOY','dormakaba']);
 for(const p of L.listProducts(lib,state))assert(brands.has(C.manufacturerFor(p.category,p.name))||C.find(p.category,p.name)?.kind==='work',p.name);
 // Importing an old library preserves its complete contents but cannot reintroduce excluded choices.
 const imported=L.validate({...lib,products:excluded.map(([category,name],i)=>({id:'old-'+i,name,category,description:'Sparad produkt'}))});
 const withCustom=clone(state);withCustom.customProducts=clone(imported.products);
 const before=clone(imported),beforeState=clone(withCustom);
 L.listProducts(imported,withCustom);D.searchProducts(withCustom,'all');
 assert.deepEqual(imported,before);assert.deepEqual(withCustom,beforeState);
 for(const [category,name]of excluded)assert.equal(L.searchProducts(imported,withCustom,category,name).length,0);
 assert.deepEqual(L.unpack(L.pack(imported)),imported,'backup retains older products');
 assert.throws(()=>L.saveProduct(lib,{name:'TS5000',category:'closer'}),/ASSA.*Dorma/);
 assert.throws(()=>L.saveProduct(lib,{name:'Unknown',category:'lock'}),/ASSA.*Dorma/);
 assert(L.saveProduct(lib,{name:'310-50',category:'lock',description:'Min variant'}).products.some(p=>p.name==='310-50'));
 // Older cards, custom models and explicit time overrides are never rewritten by filtering.
 const old=clone(fixture.legacyState);old.cards['GS1:1'].rows.find(r=>r.id==='closing-closer').product='TS5000';
 const migrated=D.validate(old),cardBefore=clone(migrated.cards),timesBefore=clone(migrated.preferences);
 L.listProducts(imported,migrated);C.selectionList();
 assert.deepEqual(migrated.cards,cardBefore);assert.deepEqual(migrated.preferences,timesBefore);
 const original=new TextEncoder().encode('%PDF-1.7\noriginal-only-test');
 assert.deepEqual((await S.unpack(await S.pack(migrated,original))).state,migrated);
 const report=M.build(migrated),oldCloser=report.rows.find(r=>r.product==='TS5000');
 assert(oldCloser&&oldCloser.timePerUnit===C.getTime('closer','TS5000').minutes,'previous product time remains usable');
 assert(M.csv(report).includes('TS5000'),'previous product remains in exports');
 const sample=await P.example();
 for(const card of Object.values(sample.state.cards))for(const row of card.rows){if(!row.product)continue;const def=D.SECTIONS.flatMap(s=>s.rows).find(r=>r.id===row.id);assert(C.isAllowedProduct({category:def.category,name:row.product}),'example uses allowed models: '+row.product);}
 assert((await P.build(sample.state,sample.original)).length>0,'example remains exportable');
 console.log('PASS ASSA/Dorma selection, old-model identities, all search paths, old-library imports, new-product validation, unchanged saved cards/times and project/CSV roundtrip.');
})().catch(error=>{console.error(error);process.exitCode=1;});
