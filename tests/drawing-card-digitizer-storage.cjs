'use strict';
const assert=require('node:assert/strict');
const Storage=require('../drawing-card-digitizer-storage.js');

(async()=>{
 assert.equal(Storage.DB_NAME,'tillsyno-digital-doorcards-v1');
 assert.equal(Storage.STORE_NAME,'projects');

 const source={name:'Tånga – dörrkort ÅÄÖ.pdf',size:251000000,lastModified:1792291200000,type:'application/pdf',pageCount:70};
 const first=await Storage.fingerprintSource(source);
 const second=await Storage.fingerprintSource({...source});
 assert.equal(first,second,'same source metadata has a deterministic fingerprint');
 assert.notEqual(first,await Storage.fingerprintSource({...source,size:source.size+1}),'source size participates in the fingerprint');
 assert.equal(await Storage.fingerprintSource(source,new Uint8Array([1,2,3])),await Storage.fingerprintSource(source,new Uint8Array([1,2,3])));
 assert.notEqual(await Storage.fingerprintSource(source,new Uint8Array([1,2,3])),await Storage.fingerprintSource(source,new Uint8Array([1,2,4])),'optional byte sample participates in the fingerprint');

 const clock=[Date.parse('2026-10-18T00:00:00.000Z'),Date.parse('2026-10-18T00:00:01.000Z'),Date.parse('2026-10-18T00:00:02.000Z')];
 const database=Storage.createMemoryStorage({now:()=>clock.shift()});
 assert.equal(database.getBackend(),'memory');
 assert.equal(await database.loadProject(first),null);
 const bytes=new Uint8Array([37,80,68,70]);
 const saved=await database.saveProject({
  fingerprint:first,
  source:{...source,fingerprint:first,sourceFile:{name:'must-not-store'},sourcePdfBytes:bytes},
  template:{name:'Dörrkortsmall ÅÄÖ',rect:{x:.1,y:.2,w:.7,h:.6},pdfBytes:bytes,pdfBase64:'JVBERi0='},
  cards:[{id:'G69',title:'Övrig utrustning',rows:[{name:'Dörrstängare',model:'DC700',installer:'GS'}],rawPdf:bytes}],
  progress:{currentPage:6,status:'Behöver granskas',binary:bytes},
  sourcePdfBytes:bytes,
  ignoredTopLevel:'sparas inte'
 });
 assert.equal(saved.source.fileName,source.name);
 assert.equal(saved.cards[0].rows[0].name,'Dörrstängare');
 assert.equal(saved.template.name,'Dörrkortsmall ÅÄÖ');
 assert.equal(saved.source.sourceFile,undefined,'source metadata is whitelisted');
 assert.equal(saved.template.pdfBytes,undefined,'nested PDF bytes are removed');
 assert.equal(saved.template.pdfBase64,undefined,'encoded source PDFs are not persisted either');
 assert.equal(saved.cards[0].rawPdf,undefined,'nested raw PDF payloads are removed');
 assert.equal(saved.progress.binary,undefined,'typed arrays are never persisted');
 assert.equal(saved.ignoredTopLevel,undefined,'only template/cards/progress/source metadata is persisted');

 saved.cards[0].rows[0].model='MUTATED';
 const reopened=await database.loadProject(first);
 assert.equal(reopened.cards[0].rows[0].model,'DC700','returned data is detached from the stored record');
 assert.equal(reopened.source.fileName,'Tånga – dörrkort ÅÄÖ.pdf','Swedish source names survive reopening');
 assert.equal(reopened.progress.status,'Behöver granskas');

 await database.saveProject({...reopened,cards:[...reopened.cards,{id:'GC72',reviewStatus:'Godkänt'}]});
 const updated=await database.loadProject(first);
 assert.equal(updated.cards.length,2);
 assert.equal(updated.createdAt,'2026-10-18T00:00:00.000Z','updates retain creation time');
 assert.equal(updated.updatedAt,'2026-10-18T00:00:01.000Z');
 const listed=await database.listProjects();
 assert.equal(listed.length,1);
 assert.equal(listed[0].cardCount,2);
 assert.equal(listed[0].approvedCount,1);
 assert.equal(listed[0].cards,undefined,'project listing stays lightweight');
 assert.equal(listed[0].source.fileName,source.name);

 await database.saveProject({...updated,cards:[...updated.cards,{id:'GS23',review:{status:'approved',complete:true}}]});
 assert.equal((await database.listProjects())[0].approvedCount,2,'canonical nested review status is counted');

 assert.equal(await database.deleteProject(first),true);
 assert.equal(await database.deleteProject(first),false);
 assert.equal(await database.loadProject(first),null);

 const legacyFingerprint='legacy-doorcards-1';
 const legacy=Storage.createMemoryStorage({initialRecords:[{
  id:legacyFingerprint,
  version:0,
  name:'Äldre dörrkort.pdf',size:123,lastModified:45,
  template:{name:'Äldre mall'},cards:[{id:'WC',status:'godkänt'},null,'invalid'],progress:{page:4},savedAt:'2026-10-17T12:00:00.000Z'
 }]});
 const migrated=await legacy.loadProject(legacyFingerprint);
 assert.equal(migrated.schemaVersion,Storage.SCHEMA_VERSION);
 assert.equal(migrated.source.fileName,'Äldre dörrkort.pdf');
 assert.deepEqual(migrated.cards.map(card=>card.id),['WC'],'invalid legacy card entries are skipped');
 assert.equal(migrated.createdAt,'2026-10-17T12:00:00.000Z');

 const invalid=Storage.createMemoryStorage({initialRecords:[
  {fingerprint:'future',schemaVersion:99,cards:[]},
  {schemaVersion:1,cards:[]},
  'broken'
 ]});
 assert.equal(await invalid.loadProject('future'),null,'future schemas fail closed without crashing');
 assert.deepEqual(await invalid.listProjects(),[],'invalid records are ignored in project lists');
 await assert.rejects(invalid.saveProject({cards:[]}),/fingeravtryck/);

 const cyclic={fingerprint:'cyclic-project',source:{name:'Cykel.pdf'},template:{name:'Mall'},cards:[],progress:{}};
 cyclic.progress.loop=cyclic.progress;
 const cyclicSaved=await invalid.saveProject(cyclic);
 assert.equal(cyclicSaved.progress.loop,null,'cyclic UI state is made structured-clone safe');

 const fallback=Storage.createStorage({indexedDB:{open(){throw new Error('blocked');}}});
 await fallback.saveProject({fingerprint:'fallback-project',source:{name:'Fallback.pdf'},template:{},cards:[],progress:{}});
 assert.equal(fallback.getBackend(),'memory','an unavailable IndexedDB gracefully falls back to memory');
 assert.equal((await fallback.loadProject('fallback-project')).source.fileName,'Fallback.pdf');

 console.log('PASS drawing card digitizer storage: fingerprint, safe local reopen, Swedish text, migration and invalid-data fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
