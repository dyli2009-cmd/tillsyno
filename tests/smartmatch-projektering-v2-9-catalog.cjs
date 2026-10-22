'use strict';
// Built-in availability and compatibility with personal/project catalogue snapshots.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../smartmatch-projektering-v2-9-data.js'),L=require('../smartmatch-projektering-v2-9-library.js');
const OldD=require('../smartmatch-projektering-v2-7-data.js');
const copy=value=>JSON.parse(JSON.stringify(value));
const read=name=>L.unpack(fs.readFileSync(path.join(__dirname,'../produktbibliotek',name)));
const short=read('copiax-startbibliotek-v2.json'),verbose=read('copiax-startbibliotek-v1.json');
const initial=L.createDefault(),project=D.createEmpty('Tillgängligt utan import');

assert.equal(D.PRODUCTS.length,86);
for(const item of short.products)assert.deepEqual(D.PRODUCTS.find(value=>value.id===item.id),item,'short import IDs are the built-in IDs');
for(const name of ['ST140-50','17963','8882','DC107'])assert(D.PRODUCTS.some(value=>value.name===name),'existing real model retained: '+name);
assert(D.PRODUCTS.every(value=>value.description===''&&!/DEMO|ASSA|ABLOY|höger|vänster|rostfri/i.test(value.name)));
assert.equal(new Set(D.PRODUCTS.map(value=>value.id)).size,D.PRODUCTS.length);
assert.equal(new Set(D.PRODUCTS.map(value=>value.category+':'+value.name)).size,D.PRODUCTS.length);
assert(Object.isFrozen(D.PRODUCTS)&&D.PRODUCTS.every(Object.isFrozen));
for(const {id}of L.categories(initial))assert(L.listProducts(initial,project,id).length,'every category is available without import: '+id);
assert.equal(L.categories(initial).length,18);
assert.equal(L.listProducts(initial,project).length,86);
assert.equal(L.searchProducts(initial,project,'lock','411-50 MA')[0].name,'411-50 MA');
assert(L.searchProducts(initial,project,'operator','S').some(value=>value.name==='SW300'));
assert(L.searchProducts(initial,project,'closer','D').some(value=>value.name==='DC700'));

// Existing imports remain readable. Their exact old choices are retired only
// in the view; saved project and personal records are never rewritten.
const oldLib=L.merge(initial,verbose),oldState=copy(project);
oldState.customProducts=copy(D.LEGACY_PRODUCTS.concat(D.RETIRED_PRODUCTS));
D.ensureCard(oldState,'GS1');oldState.cards.GS1.rows.find(row=>row.id==='day-lock').product=verbose.products.find(value=>value.name.startsWith('EL580')).name;
const libSnapshot=copy(oldLib),stateSnapshot=copy(oldState);
assert.equal(L.listProducts(oldLib,oldState).length,86);
assert.equal(D.searchProducts(oldState,'all').length,86);
assert.deepEqual(oldLib,libSnapshot);assert.deepEqual(oldState,stateSnapshot);
assert.deepEqual(D.validate(oldState),oldState);
assert.equal(L.listProducts(L.merge(initial,short),project).length,86,'v2 hides old source IDs without hiding their replacements');
assert.deepEqual(L.unpack(L.pack(oldLib)),oldLib,'retired snapshots remain valid backup data');

// User work is distinct from shipped examples, even when it reuses an old ID
// or includes the word DEMO. Exact old records must not mask a project edit.
const editedState=copy(project),oldDemo=D.LEGACY_PRODUCTS.find(value=>value.id==='lock-demo-el');
editedState.customProducts=[{...oldDemo,name:'MITT EGET LÅS',description:'Egen uppgift'},{id:'own-demo',name:'KUND DEMO',category:'lock',description:'Kundens val'}];
const uneditedLibrary=L.saveProduct(initial,oldDemo),editedBefore=copy(editedState);
let list=L.listProducts(uneditedLibrary,editedState,'lock');
assert(list.some(value=>value.name==='MITT EGET LÅS'),'an exact old library example does not mask a project edit');
assert(list.some(value=>value.name==='KUND DEMO'),'an unrelated custom product is not removed by a name pattern');
const editedLib=L.saveProduct(uneditedLibrary,{id:oldDemo.id,name:'BIBLIOTEKETS LÅS'});
list=L.listProducts(editedLib,editedState,'lock');assert(list.some(value=>value.name==='BIBLIOTEKETS LÅS'));assert(!list.some(value=>value.name==='MITT EGET LÅS'));
assert.deepEqual(editedState,editedBefore);
const editedRetired={...verbose.products[0],name:'EGEN MODELL',description:'Behåll anteckningen'};
const retained=L.saveProduct(oldLib,editedRetired);assert(L.listProducts(retained,project).some(value=>value.name==='EGEN MODELL'));

// Personal hidden choices continue to work across the changed default IDs.
const canonical=D.PRODUCT_ALIASES['operator-sw300'];assert(canonical);
const hideLegacy=L.removeProduct(initial,'operator-sw300');assert(!L.listProducts(hideLegacy,project).some(value=>value.id===canonical));
const hideModern=L.removeProduct(initial,canonical);assert(!L.listProducts(hideModern,project).some(value=>value.id===canonical));
const customizedAlias=L.saveProduct(initial,{id:'operator-sw300',name:'EGEN AUTOMATIK'});
const hideEdited=L.removeProduct(customizedAlias,'operator-sw300');
assert(!L.listProducts(hideEdited,project).some(value=>value.name==='EGEN AUTOMATIK'));
assert(L.listProducts(hideEdited,project).some(value=>value.id===canonical),'deleting an edited legacy alias does not hide the standard model');
assert(L.listProducts(L.unpack(L.pack(hideEdited)),project).some(value=>value.id===canonical),'the deleted custom alias remains distinguishable after a backup round-trip');
const editedAliasState=copy(project);editedAliasState.customProducts=[{id:'operator-sw300',name:'EGEN AUTOMATIK',category:'operator',description:'Eget'}];
assert(L.listProducts(hideEdited,editedAliasState).some(value=>value.id===canonical),'hiding a custom edited alias does not hide the standard model');
const projectOnlyAlias=editedAliasState.customProducts[0];
const hideProjectOnly=L.removeProduct(initial,projectOnlyAlias.id,projectOnlyAlias);
const afterProjectChange=L.listProducts(L.unpack(L.pack(hideProjectOnly)),D.createEmpty());
assert(afterProjectChange.some(value=>value.id===canonical),'deleting a project-only alias keeps the built-in model after starting a new project');
assert(!afterProjectChange.some(value=>value.id===projectOnlyAlias.id),'the deleted project-only variant stays hidden');
assert.throws(()=>L.removeProduct(initial,projectOnlyAlias.id,{...projectOnlyAlias,id:'another-id'}),/annat ID/);
assert(!Object.keys(D.PRODUCT_ALIASES).some(id=>verbose.products.some(value=>value.id===id)),'v1 source IDs never act as hidden aliases');

// A previously valid schema-2 project may already use one of the newly built-in
// IDs. It remains an override and must not become impossible to open.
const legacyProject=OldD.createEmpty('Tidigare giltigt ID'),builtin=short.products[0];
OldD.addProduct(legacyProject,{...builtin,name:'Projektets variant',description:'Eget sparat val'});
const upgraded=D.validate(legacyProject);assert.deepEqual(upgraded.customProducts,legacyProject.customProducts);
assert.equal(L.listProducts(initial,upgraded,builtin.category).find(value=>value.id===builtin.id).name,'Projektets variant');
assert.throws(()=>D.validate({...upgraded,customProducts:[...upgraded.customProducts,copy(upgraded.customProducts[0])]}),/ID används redan/);
const fresh=D.createEmpty();assert.deepEqual(D.validate(fresh),fresh);
console.log('PASS Projektering 2.9 catalogue: 86 built-in short models across 18 categories; safe legacy retirement, user overrides/hides and schema-2 project compatibility.');
