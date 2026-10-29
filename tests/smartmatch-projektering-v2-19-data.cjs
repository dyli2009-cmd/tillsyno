'use strict';
// Real model/library/store logic only. No network, screenshots, or credentials.
const assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-19-data.js'),L=require('../smartmatch-projektering-v2-19-library.js'),S=require('../smartmatch-projektering-v2-19-store.js'),C=require('../smartmatch-projektering-v2-19-catalog.js');
const fixture=require('./fixtures/projektering-v2-18-catalog19-legacy.json');
const OlderArchive=require('../smartmatch-projektering-v2-13-data.js'),OlderLibrary=require('../smartmatch-projektering-v2-13-library.js');
const clone=value=>JSON.parse(JSON.stringify(value));
function unchanged(state,action,pattern){const before=clone(state);assert.throws(action,pattern);assert.deepEqual(state,before,'failed mutations remain atomic');}

(async()=>{
 const fresh=D.createEmpty('Nytt produktregister');
 assert.equal(fresh.schema,4);assert.equal(D.SECTIONS.length,5);assert.equal(D.createCard('GS1:1').rows.length,39);
 assert.equal(D.SECTIONS[4].title,'Övriga tillbehör');assert.equal(D.SECTIONS[4].rows.length,13);
 assert.equal(L.categories(L.createDefault()).length,31);
 assert.equal(D.PRODUCTS.length,413,'new choices preserve old defaults except one exact misclassified model, with the explicit SR 390 alias deduplicated');
 assert.equal(C.products.length,362);assert.equal(C.entries.length,367);
 assert(D.PRODUCTS.every(value=>value.description===''),'built-in choices remain short model names');
 assert(Object.isFrozen(D.PRODUCTS));assert(D.PRODUCTS.every(Object.isFrozen));
 assert.equal(new Set(D.PRODUCTS.map(value=>value.category+':'+value.name.normalize('NFKC').trim().toLocaleLowerCase('sv'))).size,D.PRODUCTS.length);
 for(const previous of fixture.previousProducts){
  if(previous.id==='copiax-modell-closer-arm-adc5be10bd60a2f0'){assert(D.isRetiredProduct(previous));assert(!D.PRODUCTS.some(value=>value.id===previous.id));continue;}
  assert.deepEqual(D.PRODUCTS.find(value=>value.id===previous.id),clone(previous),'old default IDs and choices remain exact');
 }
 for(const value of C.products){
  assert(D.PRODUCTS.some(entry=>D.productIdentity(entry)===D.productIdentity(value)),'every selectable catalogue model has a bundled suggestion: '+value.name);
 }
 assert(!D.PRODUCTS.some(value=>['9605','RCO','Aptus','ARX','Axema'].includes(value.name)),'ambiguous reference-only records are not product suggestions');

 const source=clone(fixture.legacyState);source.cards['GS1:1'].rows.find(row=>row.id==='closing-arm').product='TS5000 ECline';
 const before=clone(source),migrated=D.validate(source);
 assert.equal(source.schema,3);assert.equal(migrated.schema,4);assert.deepEqual(source,before,'migration does not mutate old input');
 assert.deepEqual(migrated.project,source.project);assert.deepEqual(migrated.drawing,source.drawing);assert.deepEqual(migrated.placements,source.placements);assert.deepEqual(migrated.stencils,source.stencils);assert.deepEqual(migrated.preferences,source.preferences);assert.deepEqual(migrated.annotations,source.annotations);
 assert.deepEqual(migrated.cards['GS1:1'].rows.slice(0,26),source.cards['GS1:1'].rows);assert.equal(migrated.cards['GS1:1'].note,source.cards['GS1:1'].note);
 for(const row of migrated.cards['GS1:1'].rows.slice(26))assert.deepEqual({product:row.product,quantity:row.quantity,delivery:row.delivery,installer:row.installer},{product:'',quantity:1,delivery:'GS',installer:'GS'});
 const schema2=clone(source);schema2.schema=2;schema2.annotations=[];assert.equal(D.validate(schema2).schema,4);
 const partial=clone(source);partial.cards['GS1:1'].rows.pop();assert.throws(()=>D.validate(partial),/utrustningsrader/);
 const wrongOld=clone(source);wrongOld.cards['GS1:1'].rows[0].id='unexpected';assert.throws(()=>D.validate(wrongOld),/äldre utrustningsrader/);
 const duplicateOld=clone(source);duplicateOld.cards['GS1:1'].rows[1].id=duplicateOld.cards['GS1:1'].rows[0].id;assert.throws(()=>D.validate(duplicateOld),/dubblerad rad/);
 const missingNew=clone(migrated);missingNew.cards['GS1:1'].rows.splice(26);assert.throws(()=>D.validate(missingNew),/utrustningsrader/,'schema4 cannot silently restore deleted extra rows');
 const corruptNew=clone(migrated);corruptNew.cards['GS1:1'].rows[26].id='unexpected';assert.throws(()=>D.validate(corruptNew),/utrustningsrader/);
 assert.throws(()=>OlderArchive.validate(migrated),/version/,'older archived pages reject rather than drop new rows');
 unchanged(migrated,()=>D.updateCard(migrated,'GS1:1',{...migrated.cards['GS1:1'],rows:migrated.cards['GS1:1'].rows.slice(0,26)}),/utrustningsrader/);

 let edited=clone(migrated.cards['GS1:1']);
 for(const [id,product,quantity]of [['extra-battery','Batteribackup',1],['extra-door-stop','Täclastopp 2.0',2],['extra-preparation','Förberedelse nattlås',1]])Object.assign(edited.rows.find(row=>row.id===id),{product,quantity});
 D.updateCard(migrated,'GS1:1',edited);D.copyCard(migrated,'GS1:1','GS1:2');assert.deepEqual(migrated.cards['GS1:2'].rows,edited.rows);
 D.forkPlacementCard(migrated,'old-position','GS1:3',migrated.cards['GS1:1']);
 assert.equal(migrated.placements[0].id,'old-position');assert.equal(migrated.placements[0].locked,true);assert.equal(migrated.placements[0].x,.4);assert.equal(migrated.placements[0].code,'GS1:3');
 assert.deepEqual(migrated.cards['GS1:3'].rows,edited.rows);assert.deepEqual(migrated.annotations,source.annotations);
 D.addProduct(migrated,{id:'own-extra-battery',name:'Min batterityp',category:'battery'});assert.equal(migrated.customProducts.at(-1).category,'battery');
 const original=new TextEncoder().encode('%PDF-1.7\noriginal-only-test');
 const packed=await S.pack(migrated,original),unpacked=await S.unpack(packed);assert.deepEqual(unpacked.state,migrated);assert.deepEqual(unpacked.original,original);
 assert.equal(JSON.parse(new TextDecoder().decode(packed)).state.schema,4);

 let lib=L.createDefault();
 const previous=clone(fixture.previousProducts.find(value=>value.name==='310-50'));
 lib=L.removeProduct(lib,previous.id);
 assert(!L.listProducts(lib,fresh,'lock').some(value=>value.name==='310-50'),'hidden old built-in cannot return under a new register ID');
 const newModel=D.PRODUCTS.find(value=>value.name==='BTS80');assert(newModel);
 lib=L.removeProduct(lib,newModel.id);assert(!L.listProducts(lib,fresh,'closer').some(value=>value.name==='BTS80'));
 lib=L.saveProduct(lib,{...previous,description:'Min sparade variant'});
 assert.equal(L.listProducts(lib,fresh,'lock').find(value=>value.name==='310-50').description,'Min sparade variant');
 const spaced=fixture.previousProducts.find(value=>value.name==='SR 390');assert(spaced);
 const hiddenSpaced=L.removeProduct(L.createDefault(),spaced.id);
 assert(!L.listProducts(hiddenSpaced,fresh,'coordinator').some(value=>D.productIdentity(value)==='coordinator:sr390'),'an old hidden SR 390 cannot return as a new SR390 model');
 let importedSpelling=L.saveProduct(L.createDefault(),C.products.find(value=>value.category==='coordinator'&&value.name==='SR390'));
 assert.equal(L.listProducts(importedSpelling,fresh,'coordinator').filter(value=>D.productIdentity(value)==='coordinator:sr390').length,1,'explicit SR390 alias also deduplicates imported personal products');
 const wrong=fixture.previousProducts.find(value=>value.id==='copiax-modell-closer-arm-adc5be10bd60a2f0');
 assert(!D.searchProducts(fresh,'closer-arm','ECline').length);assert(!L.listProducts(L.createDefault(),fresh,'closer').some(value=>value.name==='TS5000 ECline'));
 const wrongState=clone(fresh);wrongState.customProducts=[clone(wrong)];assert(!D.searchProducts(wrongState,'closer-arm','ECline').length,'exact old snapshot is retired from project suggestions');
 let editedWrong=L.validate({...L.createDefault(),products:[{...wrong,description:'Min personliga ändring'}]});
 assert(editedWrong.products.some(value=>value.id===wrong.id),'user-edited variant remains stored');
 assert(!L.listProducts(editedWrong,fresh,'closer-arm').some(value=>value.id===wrong.id),'other manufacturers are hidden from future choices');
 lib=L.validate({...lib,products:lib.products.concat({id:'own-battery-model',name:'Eget batteri',category:'battery',description:''})}); // An older imported custom product remains in backups.
 lib=L.setLabels(lib,{cards:'Mina kort',other:'Mina symboler'});lib=L.setCategoryLabel(lib,'battery','Mina batterier');
 const libraryRoundtrip=L.unpack(L.pack(lib));assert.deepEqual(libraryRoundtrip,lib);assert.equal(L.categories(libraryRoundtrip).find(value=>value.id==='battery').label,'Mina batterier');
 assert.throws(()=>OlderLibrary.unpack(L.pack(lib)),/känd produktkategori|produktgrupp/,'old library versions reject unknown extra category safely');
 const oldLib=fixture.legacyLibrary;assert.deepEqual(L.validate(clone(oldLib)),clone(oldLib),'old personal library records remain readable without imported settings');
 assert(!L.searchProducts(L.createDefault(),fresh,'lock','S').some(value=>value.name==='SL620'));
 assert(!L.searchProducts(L.createDefault(),fresh,'battery','B').some(value=>value.name==='Batteribackup'));
 assert.equal(L.listProducts(L.createDefault(),fresh,'lock').filter(value=>value.name==='310-50').length,1);
 assert.throws(()=>L.saveProduct(lib,{name:'Inte dold metadata',category:'lock',standardMinutes:12}),/okänt fält/);
 console.log('PASS Projektering 2.19 data/library/store: preserved and new models, 31 categories, 39-row cards, strict schema4 migration, annotations and extras roundtrip, old hides/overrides and personal settings, search and safe older-reader rejection.');
})().catch(error=>{console.error(error);process.exitCode=1;});

