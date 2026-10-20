'use strict';
// Real catalog commits and draft migration: retain pending project quantities
// when the authoritative product is renamed locally or from another tab.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-read-test-main-v9-83.js'),'utf8');
const KEY='tillsyno.product-library.v1';
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,start);return source.slice(a,b);}
function harness(){
 const values=new Map(),drafts=new Map();let denied=false;
 const storage={getItem:key=>values.get(key)||null,setItem(key,value){if(denied)throw Error('quota');values.set(key,String(value));}};
 const context=vm.createContext({console,JSON,localStorage:storage,window:{localStorage:storage,addEventListener(){}},pdf:{},
  smartProjectTimeConfig:{projectMaterials:[{name:'SW300',quantity:3}]},materialDrafts:drafts,materialSaveMessage:'',
  foldMaterialText:value=>String(value||'').toLowerCase(),materialIdentity:item=>item.value,
  loadMaterialSettings:()=>({}),save(){},refreshMaterialWorkspace:async()=>{},
  readDurationField:input=>input.value===null||input.value===''?null:Number(input.value)});
 vm.runInContext(extract('const ARTICLE_TIME_CATALOG=','function parseDurationInput(')+
  extract('function projectProductName(','function renameProjectProduct(')+
  extract('function projectExtraMaterials(','function materialWorkspaceCategoryNames(')+
  extract('async function commitLibraryEditors(','async function refreshMaterialWorkspace(')+
  extract('function materialDraftForRow(','async function renderProjectMaterials('),context);
 const run=code=>vm.runInContext(code,context);
 function row(name,minutes='120',category='Egna motorer',library=false){context.row={key:(library?'library:':'')+name.toLowerCase(),name,library};context.initial={name,time:minutes,category,extra:'3'};return run('materialDraftForRow(row,initial)');}
 async function rename(next='SW300 Reserv'){
  context.editors=[{row:{name:'SW300',key:'library:sw300'},input:{value:next,setCustomValidity(){},reportValidity(){}},time:{value:120},category:{value:'Egna motorer'}}];
  context.status={hidden:true,textContent:'',closest:()=>({})};await run('commitLibraryEditors(editors,status)');
 }
 return {run,row,rename,context,drafts,values,deny:()=>{denied=true;},storage};
}
const pending=()=>({name:'SW300',time:'999',category:'Gammal kategori',extra:'9'});
(async()=>{
 let h=harness();h.run('materialLibraryCatalog()');h.drafts.set('sw300',pending());
 await h.rename();let migrated=h.row('SW300 Reserv');
 assert.equal(migrated.extra,'9');assert.equal(migrated.name,'SW300 Reserv');assert.equal(migrated.time,'120');assert.equal(migrated.category,'Egna motorer');
 assert.equal(h.drafts.has('sw300'),false);assert.equal(h.drafts.get('sw300 reserv'),migrated);
 assert.equal(h.row('SW300 Reserv'),migrated,'re-render reuses the pending quantity');
 assert.equal(h.run('extraMaterialQuantity("SW300 Reserv")'),3,'reading a draft never commits its pending quantity');

 // A storage update in another tab follows the same migration path, while the
 // current project still contains its older portable product-list snapshot.
 for(const minutes of [0,null]){
  h=harness();const data=JSON.parse(JSON.stringify(h.run('appMaterialLibrary()')));h.drafts.set('sw300',pending());
  const entry=data.catalog.entries.find(row=>row.article==='SW300');entry.article='Extern motor';entry.aliases=['SW300'];entry.minutes=minutes;entry.category='Extern kategori';
  const shown=minutes===null?'':String(minutes);h.storage.setItem(KEY,JSON.stringify(data));migrated=h.row('Extern motor',shown,'Extern kategori');
  assert.equal(migrated.extra,'9');assert.equal(migrated.time,shown);assert.equal(migrated.category,'Extern kategori');assert.equal(h.drafts.has('sw300'),false);
  assert.equal(h.run('extraMaterialQuantity("Extern motor")'),3);
 }

 // Master-editor drafts are separate from project quantities. Unknown project
 // products retain their explicit time/category edits rather than being reset.
 h=harness();h.run('materialLibraryCatalog()');await h.rename();h.drafts.set('library:sw300',pending());
 const clean=h.row('SW300 Reserv');assert.equal(clean.extra,'3');assert.equal(h.drafts.has('library:sw300'),true);
 h.drafts.set('sw300',pending());const library=h.row('SW300 Reserv','120','Egna motorer',true);assert.equal(library.extra,'3');assert.equal(h.drafts.has('sw300'),true);
 const own={name:'Egen del',time:'25',category:'Egna delar',extra:'7'};h.drafts.set('egen del',own);assert.equal(h.row('Egen del'),own);
 const count=h.drafts.size;h.row('Annan produkt');assert.equal(h.drafts.size,count,'unrelated rows do not consume pending drafts');

 // Existing project-only aliases can rename an unknown product too. Its own
 // unsaved estimate/category must survive; there is no master value to replace it.
 h=harness();h.run('materialLibraryCatalog()');h.context.smartProjectTimeConfig={...h.context.smartProjectTimeConfig,productAliases:{'egen del':'Egen del ny'}};
 h.drafts.set('egen del',{name:'Egen del',time:'25',category:'Egna delar',extra:'7'});
 const movedOwn=h.row('Egen del ny','10','Övrigt');
 assert.equal(movedOwn.name,'Egen del ny');assert.equal(movedOwn.time,'25');assert.equal(movedOwn.category,'Egna delar');assert.equal(movedOwn.extra,'7');
 assert.equal(h.drafts.has('egen del'),false);assert.equal(h.drafts.get('egen del ny'),movedOwn);

 // A failed master write cannot rename the catalog or consume the old draft.
 h=harness();h.run('materialLibraryCatalog()');const unchanged=pending();h.drafts.set('sw300',unchanged);h.deny();await h.rename();
 assert.match(h.context.status.textContent,/inte sparade/);assert.equal(h.run('canonicalLibraryProductName("SW300")'),'SW300');
 assert.equal(h.row('SW300'),unchanged);assert.equal(h.drafts.has('sw300 reserv'),false);assert.equal(h.run('extraMaterialQuantity("SW300")'),3);
 console.log('PASS: pending project quantities survive local/cross-tab master rename, current master fields replace stale draft fields, committed quantities remain unchanged, library/custom drafts stay isolated and denied writes leave drafts intact.');
})().catch(error=>{console.error(error);process.exitCode=1});

