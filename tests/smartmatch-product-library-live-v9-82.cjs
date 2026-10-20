'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-read-test-main-v9-82.js'),'utf8');
const KEY='tillsyno.product-library.v1',copy=value=>JSON.parse(JSON.stringify(value));
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,start);return source.slice(a,b);}
function harness(config={},stored=null){
 const values=new Map(stored?[[KEY,JSON.stringify(stored)]]:[]),events=new Map();let parses=0,saves=0,recalculations=0,writeDenied=false;
 const storage={getItem:key=>values.get(key)||null,setItem(key,value){if(writeDenied&&key===KEY)throw Error('quota');values.set(key,String(value));}};
 const context=vm.createContext({console,localStorage:storage,window:{localStorage:storage,addEventListener:(name,handler)=>events.set(name,handler)},
  JSON:{...JSON,parse(value){parses++;return JSON.parse(value)},stringify:JSON.stringify},
  smartProjectTimeConfig:copy(config),foldMaterialText:value=>String(value||'').toLowerCase(),materialIdentity:item=>'original:'+item.label+'|'+item.value,
  loadMaterialSettings:()=>({}),save(){saves++;},pdf:{},document:{getElementById:()=>null},
  refreshTimeDrivenProgress:async()=>{recalculations++;},refreshMaterialWorkspace:async()=>{saves++;},
  materialDrafts:new Map(),materialSaveMessage:'',readDurationField:(input)=>input.value===null||input.value===''?null:Number(input.value)});
 vm.runInContext(extract('const ARTICLE_TIME_CATALOG=','function parseDurationInput(')+
  extract('function projectProductName(','function renameProjectProduct(')+
  extract('function projectExtraMaterials(','function materialWorkspaceCategoryNames(')+
  extract('async function commitLibraryEditors(','async function refreshMaterialWorkspace('),context);
 const run=code=>vm.runInContext(code,context);
 return {context,run,values,events,storage,stats:()=>({parses,saves,recalculations}),deny:flag=>{writeDenied=flag},
  time:(name,extra={})=>{context.item={value:name,...extra};return run('resolveItemMinutes(item)')},
  entry:name=>{context.lookup={value:name};return run('libraryArticleTimeEntry(lookup)')},
  persist(catalog){context.catalog=copy(catalog);context.status={hidden:true,textContent:''};return run('persistMaterialLibrary(catalog,null,status)')}};
}
function editor(name,next,minutes,category='Dörrstängning'){
 return {row:{name,key:'library:'+name.toLowerCase()},input:{value:next,setCustomValidity(){},reportValidity(){}},time:{value:minutes},category:{value:category}};
}
const status=()=>({hidden:true,textContent:'',closest:()=>({})});
(async()=>{
 // Fresh app defaults come from the distributed Excel seed, not a project's old
 // article-time copy. A genuine portable productLibrary still imports below.
 const fresh=harness({articleTimeCatalog:{schema:1,unit:'minutes',entries:[{article:'SW300',minutes:999}]}});
 assert.equal(fresh.run('materialLibraryCatalog().entries.length'),66);
 assert.equal(fresh.run('materialLibraryCatalog().entries.filter(e=>e.minutes!==null).length'),65);
 assert.equal(fresh.time('SW300').minutes,180);assert.equal(fresh.time('835c-50').minutes,null);
 assert.equal(fresh.entry('step 40').minutes,20);assert.equal(fresh.entry('Step40').hours,.33);
 assert.equal(fresh.entry('310-50').minutes,6);assert.equal(fresh.entry('310-50 mikro').minutes,90);
 assert.equal(fresh.entry('1 DC700'),null);assert.equal(fresh.entry('DC700 AC extra'),null);

 // A stored partial list receives missing seed products without overwriting
 // edited names/categories/times, known times on an originally unknown article,
 // or independent custom products. Stable source identity prevents resurrection.
 const partial={schema:1,catalog:{schema:1,unit:'minutes',entries:[
  {article:'Min automatik',sourceCell:'B70',minutes:95,category:'Egna motorer'},
  {article:'835c-50',sourceCell:'B51',minutes:17,category:'Egna ellås'},
  {article:'Egen sensor',minutes:null,category:'Sensorer',custom:true}
 ]},categories:['Egna motorer','Sensorer']};
 const upgraded=harness({},partial);assert.equal(upgraded.run('materialLibraryCatalog().entries.length'),67);
 assert.equal(upgraded.entry('SW300').article,'Min automatik');assert.equal(upgraded.entry('SW 300').minutes,95);
 assert.equal(upgraded.entry('SW300').category,'Egna motorer');assert.equal(upgraded.entry('835c-50').minutes,17);
 assert.equal(upgraded.entry('Egen sensor').minutes,null);
 assert.equal(upgraded.run('materialLibraryCatalog().entries.filter(e=>e.sourceCell==="B70").length'),1);
 assert(upgraded.entry('SW300').aliases.includes('SW300'));
 const normalized=upgraded.run('resolveProjectProduct({label:"Automatik",value:"SW300"})');
 assert.equal(normalized.value,'Min automatik');assert.equal(normalized.originalMaterialKey,'original:Automatik|SW300');
 const restarted=harness({},JSON.parse(upgraded.values.get(KEY)));
 assert.equal(restarted.entry('SW300').minutes,95);assert.equal(restarted.run('materialLibraryCatalog().entries.length'),67);

 // Current master times, including unknown and zero, beat every stale project
 // copy. Unknown products and independent extra-time points retain their work.
 const live=harness({productMinutes:{sw300:999,'835c-50':88},articleTimeCatalog:{schema:1,unit:'minutes',entries:[{article:'SW300',minutes:888}]}});
 assert.equal(live.time('SW300',{minutes:777}).minutes,180);
 assert.equal(live.time('835c-50',{minutes:88}).minutes,null);
 for(const minutes of [120,null,0]){
  const catalog=copy(live.run('materialLibraryCatalog()'));catalog.entries.find(e=>e.article==='SW300').minutes=minutes;
  assert.equal(live.persist(catalog),true);assert.equal(live.time('SW300',{minutes:777}).minutes,minutes);
  assert.equal(live.time('SW300').source,'library');
 }
 assert.equal(live.time('Projektets egen produkt',{minutes:25}).minutes,25);
 assert.equal(live.time('Okänd produkt',{minutes:null}).minutes,null);
 assert.equal(live.time('SW300',{kind:'extra-time',minutes:30}).minutes,30);
 live.context.smartProjectTimeConfig={productAliases:{sw300:'Min lokala benämning'}};
 assert.equal(live.time('Min lokala benämning').minutes,0);

 // Project aliases are display mappings, not new master identities. Mapping
 // one known model onto another must use that target's current master time.
 const knownAlias=harness({productAliases:{sw300:'Dc700'},productMinutes:{dc700:999}});
 const knownCatalog=copy(knownAlias.run('materialLibraryCatalog()'));knownCatalog.entries.find(e=>e.article==='Dc700').minutes=75;
 assert.equal(knownAlias.persist(knownCatalog),true);
 assert.equal(knownAlias.time('Dc700',{minutes:888}).minutes,75);
 assert.equal(knownAlias.time('SW300',{minutes:888}).minutes,75);
 assert.equal(knownAlias.entry('Dc700').article,'Dc700');assert.equal(knownAlias.entry('SW300').article,'Dc700');
 // Actual conflicting legacy master names cannot revive a stale project time.
 const conflicting=copy(knownAlias.run('materialLibraryCatalog()'));conflicting.entries.push({article:'DC 700',minutes:55,category:'Övrigt',custom:true});
 knownAlias.context.smartProjectTimeConfig.productLibrary=conflicting;
 assert.equal(knownAlias.entry('Dc700').ambiguous,true);assert.equal(knownAlias.entry('Dc700').minutes,null);assert.equal(knownAlias.time('Dc700',{minutes:888}).minutes,null);

 // Renaming keeps existing extra quantities attached through aliases, does not
 // re-add the original seed name, and +Project adds only quantity, never a time.
 const renamed=harness({projectMaterials:[{name:'SW300',quantity:3},{name:'SW 300',quantity:2}]});
 renamed.context.editors=[editor('SW300','SW300 Reserv',120)];renamed.context.status=status();
 await renamed.run('commitLibraryEditors(editors,status,true)');
 assert.equal(renamed.entry('SW300').article,'SW300 Reserv');assert.equal(renamed.time('SW300').minutes,120);
 assert.equal(renamed.run('extraMaterialQuantity("SW300")'),6);assert.equal(renamed.run('extraMaterialQuantity("SW300 Reserv")'),6);
 assert.equal(renamed.run('projectExtraMaterials().length'),1);assert.equal(renamed.run('projectExtraMaterials()[0].name'),'SW300 Reserv');
 assert.equal(renamed.run('smartProjectTimeConfig.productMinutes'),undefined);
 assert.equal(renamed.run('materialLibraryCatalog().entries.length'),66);
 assert.equal(renamed.run('materialLibraryCatalog().entries.filter(e=>e.article==="SW300").length'),0);
 const renameReload=harness({},JSON.parse(renamed.values.get(KEY)));assert.equal(renameReload.entry('SW300').article,'SW300 Reserv');
 // A new product cannot take another entry's old name and hijack its references.
 renamed.context.editors=[editor('Dc700','SW300',30)];renamed.context.status=status();
 await renamed.run('commitLibraryEditors(editors,status)');assert.match(renamed.context.status.textContent,/finns redan/);assert.equal(renamed.entry('DC700').article,'Dc700');

 // The portable project's snapshot stays authoritative on both clean and
 // previously used devices. Changing project snapshots must invalidate caches.
 const portable=harness({productLibrary:{schema:1,unit:'minutes',entries:[{article:'SW300',sourceCell:'B70',minutes:222,category:'Dörrautomatik'},{article:'Portabel produkt',minutes:45,category:'Övrigt'}]}});
 assert.equal(portable.time('SW300').minutes,222);assert.equal(portable.time('Portabel produkt').minutes,45);
 portable.context.smartProjectTimeConfig={productLibrary:{entries:[{article:'SW300',minutes:999}]}};
 assert.equal(portable.time('SW300').minutes,999);

 // Denied persistence cannot install partial master changes into either the
 // live cache or the project payload; the old committed value remains usable.
 const before=JSON.stringify(portable.run('smartProjectTimeConfig')),attempt=copy(portable.run('materialLibraryCatalog()'));
 attempt.entries.find(e=>e.article==='SW300').minutes=111;portable.deny(true);
 assert.equal(portable.persist(attempt),false);assert.equal(portable.time('SW300').minutes,999);
 assert.equal(JSON.stringify(portable.run('smartProjectTimeConfig')),before);assert.match(portable.context.status.textContent,/inte sparade/);
 portable.deny(false);

 // Repeated per-position lookups reuse the same parsed catalog and index.
 const perf=harness();const first=perf.entry('SW300'),start=perf.stats().parses;
 perf.run('for(let i=0;i<10000;i++)resolveItemMinutes({value:"SW300"});');
 assert.equal(perf.stats().parses,start,'no JSON reparsing in the hot path');assert.equal(perf.entry('SW300'),first);

 // The ordinary storage event invalidates prepared export snapshots through
 // save(), recalculates the active project and observes the new master value.
 const changed=copy(perf.run('appMaterialLibrary()'));changed.catalog.entries.find(e=>e.article==='SW300').minutes=150;
 perf.values.set(KEY,JSON.stringify(changed));const savedBefore=perf.stats().saves;
 perf.events.get('storage')({key:'unrelated'});assert.equal(perf.stats().saves,savedBefore);
 perf.events.get('storage')({key:KEY});await Promise.resolve();
 assert.equal(perf.stats().saves,savedBefore+1);assert.equal(perf.stats().recalculations,1);assert.equal(perf.time('SW300').minutes,150);
 console.log('PASS: complete Excel seed upgrade, preserved custom values/names, live master precedence/null/zero, aliases and quantities, no +Project time snapshot, project/portable isolation, write denial, cached hot path and cross-tab invalidation.');
})().catch(error=>{console.error(error);process.exitCode=1});

