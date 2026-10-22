'use strict';
// Library data and real IndexedDB only. No images or screenshots.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const L=require('../smartmatch-projektering-v2-8-library.js'),D=require('../smartmatch-projektering-v2-7-data.js');
const copy=value=>JSON.parse(JSON.stringify(value));
function pure(){
 const initial=L.createDefault(),project=D.createEmpty('Oförändrat projekt'),savedProject=copy(project);
 assert.equal(initial.schema,1);assert.equal(initial.groups.length,5);
 assert.equal(L.groupFor(initial,D.defaultStencil('GS65')),'GS');assert.equal(L.groupFor(initial,D.defaultStencil('DBLB-OPPS')),'DBL');
 assert.equal(L.groupFor(initial,D.defaultStencil('HWC12')),'WC-HWC');assert.equal(L.groupFor(initial,D.defaultStencil('WC')),'WC-HWC');
 assert.equal(L.groupFor(initial,D.defaultStencil('VC')),'cards-other');assert.equal(L.groupFor(initial,D.defaultStencil('DA')),'symbols-other');
 const movedFamily=L.removeGroup(initial,'GS','DBL');
 for(let number=1;number<=100;number++)assert.equal(L.groupFor(movedFamily,D.defaultStencil('GS'+number)),'DBL','deleting a family transfers every prefix-derived member');
 assert.equal(L.groupFor(movedFamily,D.defaultStencil('GS101')),'DBL','future members follow the transferred prefix');assert.deepEqual(movedFamily.groups.find(value=>value.id==='DBL').prefixes,['DBL','GS']);
 let selective=L.assignGroup(initial,'GS65','WC-HWC');selective=L.saveGroup(selective,{id:'gs9',name:'Särskilda GS9',section:'cards',prefixes:['GS9']});selective=L.removeGroup(selective,'GS','DBL');
 assert.equal(L.groupFor(selective,D.defaultStencil('GS65')),'WC-HWC','explicit membership in another group is retained');assert.equal(L.groupFor(selective,D.defaultStencil('GS99')),'gs9','existing more-specific prefix remains authoritative');assert.equal(L.groupFor(selective,D.defaultStencil('GS64')),'DBL');
 let broad=L.saveGroup(initial,{id:'all-g',name:'Andra G',section:'cards',prefixes:['G']});broad=L.removeGroup(broad,'GS','cards-other');
 assert.equal(L.groupFor(broad,D.defaultStencil('GS101')),'cards-other','fallback targets keep transferred prefixes ahead of existing broader groups');assert.equal(L.groupFor(broad,D.defaultStencil('G1')),'all-g');
 let lib=L.saveGroup(initial,{id:'custom',name:'Egna branddörrar',section:'cards',prefixes:['BR']});
 assert.equal(initial.groups.length,5);assert.equal(lib.revision,2);assert.equal(L.groupFor(lib,D.defaultStencil('BR1')),'custom');
 lib=L.assignGroup(lib,'GS65','custom');assert.equal(L.groupFor(lib,D.defaultStencil('GS65')),'custom');assert.equal(L.groupFor(initial,D.defaultStencil('GS65')),'GS');
 lib=L.assignGroup(lib,'DA','custom');assert.equal(L.groupFor(lib,D.defaultStencil('DA')),'symbols-other','symbol kind cannot be changed through a group assignment');
 lib=L.saveGroup(lib,{id:'GS',name:'Dörrtyp GS'});assert.equal(L.groupsFor(lib,'cards')[0].name,'Dörrtyp GS');
 const returned=L.groupsFor(lib,'cards');returned[0].name='Caller mutation';assert.equal(L.groupsFor(lib,'cards')[0].name,'Dörrtyp GS');
 lib=L.removeGroup(lib,'custom');assert.equal(lib.assignments.GS65,'cards-other');assert.equal(L.groupFor(lib,D.defaultStencil('GS65')),'cards-other');
 assert.throws(()=>L.removeGroup(lib,'cards-other'),/annan grupp/);
 lib=L.removeGroup(lib,'cards-other','GS');assert.equal(L.groupsFor(lib,'cards').filter(value=>value.fallback).length,1);assert.equal(L.groupFor(lib,D.defaultStencil('ZZ11')),'GS');
 assert.throws(()=>L.saveGroup(initial,{id:'dupe',name:'DBL',section:'cards'}),/dubbletter/);
 assert.throws(()=>L.saveGroup(initial,{id:'dupe',name:'Duplicate prefix',section:'cards',prefixes:['GS']}),/prefix/);
 assert.throws(()=>L.saveGroup(initial,{id:'invalid',name:'Invalid',section:'unknown'}),/Dörrkort/);
 const corrupted=copy(initial);corrupted.assignments.GS1='missing';assert.throws(()=>L.validate(corrupted),/grupp saknas/);
 assert.throws(()=>L.validate({...initial,extra:'must not be silently dropped'}),/okänt fält/);
 assert.throws(()=>L.validate({...initial,schema:2}),/okänd version/);
 assert.throws(()=>L.setLabels(initial,{cards:'Samma',other:'Samma'}),/olika namn/);
 assert.throws(()=>L.setCategoryLabel(initial,'unknown','Okänd'),/känd produktkategori/);
 let products=L.saveProduct(initial,{id:'own-sw350',name:'SW350',category:'operator',description:'Egen automatik'});
 products=L.saveProduct(products,{id:'own-sensor',name:'Sensor X',category:'operator',description:'Söks efter namn'});
 products=L.saveProduct(products,{id:'own-unrelated',name:'AUTOMATIK ANNAN',category:'operator',description:'S beskrivning ska inte ge en träff'});
 products=L.saveProduct(products,{id:'own-8888',name:'8888',category:'cylinder',description:''});
 assert.deepEqual(L.searchProducts(products,project,'operator','s').map(value=>value.name),['Sensor X','SW300','SW350']);
 assert.deepEqual(L.searchProducts(products,project,'operator','SW 300').map(value=>value.name),['SW300']);
 assert.deepEqual(L.searchProducts(products,project,'operator','300').map(value=>value.name),['SW300']);
 assert.deepEqual(L.searchProducts(products,project,'operator','3'),[],'single character substring is not a prefix');
 assert.equal(L.searchProducts(products,project,'cylinder','8')[0].name,'8882');
 assert(!L.searchProducts(products,project,'operator','s').some(value=>value.id==='own-unrelated'));
 assert(!L.searchProducts(products,project,'operator','operator').length,'IDs are not searchable product names');
 products=L.saveProduct(products,{id:'operator-sw300',name:'SW300 PRO'});assert.equal(L.searchProducts(products,project,'operator','SW300')[0].name,'SW300 PRO');
 assert.equal(D.PRODUCTS.find(value=>value.id==='operator-sw300').name,'SW300','built-in constants are not changed');
 products=L.removeProduct(products,'operator-sw300');assert(!L.listProducts(products,project,'operator').some(value=>value.id==='operator-sw300'));
 products=L.saveProduct(products,{id:'operator-sw300',name:'SW300 igen'});assert(!products.hiddenProductIds.includes('operator-sw300'));
 const withLocal=copy(project);D.addProduct(withLocal,{id:'local-sw350',name:'SW350',category:'operator',description:'Lokalt val'});
 assert.equal(L.listProducts(products,withLocal,'operator').filter(value=>value.name==='SW350').length,1);
 assert.equal(L.listProducts(products,withLocal,'operator').find(value=>value.name==='SW350').id,'own-sw350','global library choices take precedence over project-local duplicates');
 const beforeLocal=copy(withLocal);products=L.saveProduct(products,{id:'local-sw350',name:'SW350 EDITED',category:'operator',description:'Global ändring'});
 assert.equal(L.listProducts(products,withLocal,'operator').find(value=>value.id==='local-sw350').name,'SW350 EDITED');assert.deepEqual(withLocal,beforeLocal,'global product override does not mutate project records or saved rows');
 const localOnly=copy(project);D.addProduct(localOnly,{id:'project-only',name:'LOCAL1',category:'operator',description:''});const localSnapshot=copy(localOnly);
 const hiddenLocal=L.removeProduct(initial,'project-only');assert(!L.listProducts(hiddenLocal,localOnly,'operator').some(value=>value.id==='project-only'));assert.deepEqual(localOnly,localSnapshot,'hiding a project-local choice leaves its project snapshot intact');
 const removedOverride=L.removeProduct(products,'local-sw350');assert(!L.listProducts(removedOverride,withLocal,'operator').some(value=>value.id==='local-sw350'),'deleting a library override must not resurrect its old project-local fallback');assert.deepEqual(withLocal,beforeLocal);
 assert.equal(L.listProducts(products,D.createEmpty(),'operator').find(value=>value.name==='SW350').id,'own-sw350','saved catalog remains reusable in a new project');
 products=L.setCategoryLabel(products,'operator','Motorer');assert.equal(L.categories(products).find(value=>value.id==='operator').label,'Motorer');
 products=L.setLabels(products,{cards:'Dörrtyper',other:'Symboler'});assert.equal(products.labels.cards,'Dörrtyper');
 products=L.saveStencil(products,{...D.defaultStencil('VC'),id:'project-specific-id',fill:'#123456'});
 assert.equal(products.stencils[0].id,'VC');assert.equal(products.stencils[0].fill,'#123456');assert(!products.hiddenCodes.includes('VC'));
 products=L.setHidden(products,'VC',true);assert(products.hiddenCodes.includes('VC'));products=L.setHidden(products,'VC',false);assert(!products.hiddenCodes.includes('VC'));
 const visibleAlias=L.saveStencil(initial,{...D.defaultStencil('GS1'),fill:'#654321'}),visibleSnapshot=copy(visibleAlias);
 assert.throws(()=>L.saveStencil(visibleAlias,D.defaultStencil('GS-1')),/förväxlas med en synlig/);assert.deepEqual(visibleAlias,visibleSnapshot,'rejected visible alias leaves the old library intact');
 const hiddenAlias=L.setHidden(visibleAlias,'GS1',true),replacement=L.saveStencil(hiddenAlias,D.defaultStencil('GS-1'));
 assert.deepEqual(replacement.stencils.map(value=>value.code),['GS-1']);assert.equal(replacement.stencils[0].id,'GS-1');assert(replacement.hiddenCodes.includes('GS1'));assert(!replacement.hiddenCodes.includes('GS-1'));
 assert.equal(hiddenAlias.stencils[0].code,'GS1','hidden alias replacement only changes the returned library');
 assert.deepEqual(project,savedProject,'catalog mutations do not rewrite project state or saved product strings');
 const source=L.pack(products),unpacked=L.unpack(source);assert.deepEqual(unpacked,products);
 assert.throws(()=>L.unpack(new Uint8Array([255,254])),/giltig text/);assert.throws(()=>L.unpack('{bad'),/kunde inte läsas/);
 assert.throws(()=>L.unpack(JSON.stringify({format:'other',library:products})),/inte ett/);
 assert.throws(()=>L.unpack(new Uint8Array(L.LIMITS.fileBytes+1)),/5 MB/);
 let incoming=L.saveProduct(initial,{id:'incoming',name:'Importprodukt',category:'lock',description:''});
 incoming=L.saveProduct(incoming,{id:'own-sw350',name:'Do not overwrite',category:'operator',description:''});
 incoming=L.saveGroup(incoming,{id:'import-group',name:'Importgrupp',section:'cards',prefixes:['IMP']});incoming=L.assignGroup(incoming,'IMP1','import-group');
 const merged=L.merge(products,incoming);assert.equal(merged.products.find(value=>value.id==='own-sw350').name,'SW350');assert(merged.products.some(value=>value.id==='incoming'));
 assert.equal(L.groupFor(merged,D.defaultStencil('IMP1')),'import-group');assert.equal(merged.labels.cards,'Dörrtyper');assert.equal(merged.categoryLabels.operator,'Motorer');
 let colliding=L.saveGroup(initial,{id:'incoming-gs',name:'Imported GS',section:'cards',prefixes:['NEW']});
 colliding=L.saveGroup(colliding,{id:'GS',prefixes:[]});colliding=L.saveGroup(colliding,{id:'incoming-gs',prefixes:['GS']});colliding=L.assignGroup(colliding,'GS77','incoming-gs');
 const combined=L.merge(products,colliding);assert.deepEqual(combined.groups.find(value=>value.id==='incoming-gs').prefixes,[],'existing prefix rules win a merge');assert.equal(L.groupFor(combined,D.defaultStencil('GS77')),'incoming-gs','explicit imported membership survives a conflicting prefix rule');
 const oversized=copy(initial);oversized.groups=Array.from({length:L.LIMITS.groups+1},()=>initial.groups[0]);assert.throws(()=>L.validate(oversized),/högst/);
 const malformed=copy(products);malformed.products.push({...malformed.products[0]});assert.throws(()=>L.validate(malformed),/dubbletter/);
 assert.throws(()=>L.saveProduct(products,{name:'X',category:'invented'}),/känd produktkategori/);
 assert.throws(()=>L.saveStencil(products,{...D.defaultStencil('MY1'),fill:'red'}),/Fyllnadsfärg/);
 console.log('PASS library model: editable groups, safe fallback/membership, reusable categorized products, prefix search, overrides/hides, snapshots and portable merge.');
}
async function browser(){
 const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
 const root=path.resolve(__dirname,'..');
 const html='<!doctype html><meta charset="utf-8"><script src="/smartmatch-projektering-v2-7-data.js"></script><script src="/smartmatch-projektering-v2-store.js"></script><script src="/smartmatch-projektering-v2-8-library.js"></script>';
 const server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://local').pathname;if(pathname==='/'){response.setHeader('Content-Type','text/html');response.end(html);return;}
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return;}
  try{response.setHeader('Content-Type','application/javascript');response.end(fs.readFileSync(file));}catch(_){response.writeHead(404);response.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let instance;
 try{
  instance=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await instance.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>window.Proj2Library&&window.Proj2Store&&window.Proj2Data);
  const result=await page.evaluate(async()=>{
   const L=Proj2Library,D=Proj2Data,S=Proj2Store;
   const same=(a,b,label)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(label);};
   const failure=async(action,pattern,name)=>{try{await action();}catch(error){if(name&&error.name!==name)throw error;if(pattern&&!pattern.test(error.message))throw error;return;}throw Error('Expected failure');};
   const baseline=L.createDefault();if(await L.load('owner-a')!==null)throw Error('Expected empty owner');
   await S.save(D.createEmpty('Project store survives'),new Uint8Array());
   let settled=false,atRequest=null;const realPut=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(...args){const request=realPut.apply(this,args);if(this.name===L.STORE_NAME)request.addEventListener('success',()=>{atRequest=settled;});return request;};
   try{await L.save(baseline,'owner-a',{expectedRevision:null}).then(()=>{settled=true;});}finally{IDBObjectStore.prototype.put=realPut;}
   if(atRequest!==false||!settled)throw Error('save must wait for transaction completion');
   same(await L.load('owner-a'),baseline,'library roundtrip');
   if(await L.load('owner-b')!==null)throw Error('owner records leaked');
   const ownerB=L.setLabels(baseline,{other:'Owner B symbols'});await L.save(ownerB,'owner-b',{expectedRevision:null});same(await L.load('owner-a'),baseline,'owner B cannot overwrite A');
   const first=await L.load('owner-a'),second=await L.load('owner-a');
   const next=L.saveProduct(first,{id:'shared-sw900',name:'SW900',category:'operator',description:''});await L.save(next,'owner-a',{expectedRevision:first.revision});
   const stale=L.setLabels(second,{cards:'Stale change'});await failure(()=>L.save(stale,'owner-a',{expectedRevision:second.revision}),/annan flik/,'ConflictError');same(await L.load('owner-a'),next,'CAS conflict preserves first writer');
   await failure(()=>L.save(baseline,'owner-a',{expectedRevision:null}),/annan flik/,'ConflictError');
   await failure(()=>L.save(next,'owner-a',{expectedRevision:0}),/förväntade revision/);
   const changing=L.setLabels(next,{cards:'Caller snapshot'}),saved=L.save(changing,'owner-a',{expectedRevision:next.revision});changing.labels.cards='Mutated before await';await saved;
   const committed=await L.load('owner-a');if(committed.labels.cards!=='Caller snapshot')throw Error('save did not snapshot caller synchronously');
   committed.labels.cards='Returned mutation';if((await L.load('owner-a')).labels.cards!=='Caller snapshot')throw Error('load returned live record');
   const good=await L.load('owner-a'),attempt=L.setLabels(good,{cards:'Must not survive'});
   IDBObjectStore.prototype.put=function(){throw new DOMException('simulated quota','QuotaExceededError');};
   try{await failure(()=>L.save(attempt,'owner-a',{expectedRevision:good.revision}),/utrymme/,'QuotaExceededError');}finally{IDBObjectStore.prototype.put=realPut;}
   same(await L.load('owner-a'),good,'quota failure retains committed owner data');
   IDBObjectStore.prototype.put=function(...args){const request=realPut.apply(this,args);request.addEventListener('success',()=>request.transaction.abort());return request;};
   try{await failure(()=>L.save(attempt,'owner-a',{expectedRevision:good.revision}),/tidigare/,'AbortError');}finally{IDBObjectStore.prototype.put=realPut;}
   same(await L.load('owner-a'),good,'abort after request success retains committed data');
   same((await S.load()).state.project.name,'Project store survives','independent project database remains readable at version one');
   await L.close();same(await L.load('owner-a'),good,'database reopens');
   const newProject=D.createEmpty('New project');if(!L.searchProducts(good,newProject,'operator','S').some(value=>value.name==='SW900'))throw Error('catalog lost when new project created');
   const packed=L.pack(good);same(L.unpack(packed),good,'library export/import');same(await L.load('owner-a'),good,'unpack does not mutate persisted catalog');
   return{revision:good.revision,db:L.DB_NAME,ownerIsolation:true,CAS:true,transactions:'complete-before-resolve'};
  });
  await page.reload();await page.waitForFunction(()=>window.Proj2Library);assert.equal(await page.evaluate(async()=>(await Proj2Library.load('owner-a')).labels.cards),'Caller snapshot');
  assert.deepEqual(errors,[]);assert.equal(result.ownerIsolation,true);assert.equal(result.CAS,true);
  console.log('PASS library IndexedDB: atomic commit/abort, quota protection, revision CAS, owner isolation, independent project storage and reload. '+JSON.stringify(result));
 }finally{if(instance)await instance.close();await new Promise(resolve=>server.close(resolve));}
}
pure();browser().catch(error=>{console.error(error);process.exitCode=1;});
