'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const L=require('../vendor/pdf-lib.min.js'),J=require('../vendor/pdf.min.js'),D=require('../smartmatch-projektering-v512-data.js'),P=require('../smartmatch-projektering-v513-pdf.js'),S=require('../smartmatch-projektering-v512-store.js');
J.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
// Synthetic EXEMPEL logo, generated for this test. No customer artwork.
const logo={name:'exempel.png',dataUrl:'data:image/png;base64,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'};
const normalize=text=>text.replace(/\s+/g,' ').trim();
async function pagesOf(bytes){const doc=await J.getDocument({data:bytes.slice(),verbosity:0}).promise;try{const result=[];for(let i=1;i<=doc.numPages;i++)result.push((await(await doc.getPage(i)).getTextContent()).items);return result;}finally{await doc.destroy();}}
function imageRefs(document,page){const resources=page.node.Resources(),objects=resources?.lookup(L.PDFName.of('XObject'));return objects?objects.entries().filter(([,ref])=>document.context.lookup(ref).dict.get(L.PDFName.of('Subtype'))?.toString()==='/Image').map(([,ref])=>ref.toString()):[];}
// Exercise the actual migration/storage module with an event-driven memory
// adapter. The browser transaction integration remains in the store test.
async function storageChecks(state){
 const legacy=D.createEmpty('Tidigare projekt');legacy.schema=6;
 const oldRecord={version:2,state:legacy,original:new ArrayBuffer(0)},records=new Map([['current-v6',oldRecord]]);
 const db={close(){},objectStoreNames:{contains:()=>true},transaction(){
  const tx={objectStore(){return {get(key){const request={};queueMicrotask(()=>{request.result=structuredClone(records.get(key));request.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return request;},put(value,key){const request={};queueMicrotask(()=>{records.set(key,structuredClone(value));request.result=key;request.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return request;}};},abort(){tx.onabort?.();}};return tx;
 }};
 globalThis.indexedDB={open(){const request={};queueMicrotask(()=>{request.result=db;request.onsuccess?.();});return request;}};
 assert.deepEqual((await S.load()).state,D.validate(legacy),'v6 migrates on read');assert(!records.has('current-v7'),'reading preserves previous storage');
 const empty=D.clone(state);empty.drawing={name:'',pages:[]};empty.placements=[];
 await S.save(empty,new Uint8Array());assert.deepEqual((await S.load()).state,D.validate(empty));assert.deepEqual(records.get('current-v6'),oldRecord,'previous version remains intact');
 records.set('current-v6',{...oldRecord,state:{...legacy,project:{...legacy.project,name:'Older open tab'}}});assert.equal((await S.load()).state.project.name,empty.project.name,'older tab cannot replace v7 settings');
 const good=records.get('current-v7');records.set('current-v7',{...good,state:{bad:true}});await assert.rejects(()=>S.load(),/version/);assert.deepEqual(records.get('current-v7').state,{bad:true},'corruption does not fall back silently');
 records.set('current-v7',good);await S.clear();assert.equal(await S.load(),null,'cleared v7 does not resurrect v6 backup');assert(records.has('current-v6'));
 for(const key of ['current-v5','current-v4','current']){records.clear();records.set(key,oldRecord);assert.deepEqual((await S.load()).state,D.validate(legacy),key+' stays readable');}
 records.clear();records.set('current-v6',{version:4,cleared:true});records.set('current',oldRecord);assert.equal(await S.load(),null,'previous tombstone prevents older fallback');
 delete globalThis.indexedDB;
}
function uiChecks(state){
 const source=fs.readFileSync(path.resolve(__dirname,'../smartmatch-projektering-v513.js'),'utf8');
 const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',hidden:false,open:false,dataset:{},handlers:{},querySelectorAll(){return [];},addEventListener(type,fn){this.handlers[type]=fn;},removeAttribute(name){delete this[name];},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);};
 const draft=D.clone(state.cards.GS1);draft.note='Unsaved door-card draft';
 let storageFailure=false,saved;
 const context=vm.createContext({D,$:el,state:D.clone(state),draft,activeCode:'GS1',cardDisclosureCode:null,productSuggest:null,viewer:{cancelGesture(){}},busy:false,clone:D.clone,esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),draftChanged(){context.dirty=true;},dirty:true,projectLogoDraft:null,Date,Uint8Array,original:new Uint8Array(),undoStack:[],redoStack:[],selected:[],damagedStore:false,storageOk:true,message(){},renderAll(){},S:{async save(value){if(storageFailure)throw Error('Simulated disk failure');saved=D.clone(value);}}});
 Object.assign(context,{L:require('../smartmatch-projektering-v512-library.js'),library:require('../smartmatch-projektering-v512-library.js').createDefault(),Proj2Catalog:require('../smartmatch-projektering-v2-19-catalog.js'),Proj2ProductTimes:require('../smartmatch-product-times-v513.js'),workTime:require('../smartmatch-projektering-v513-materials.js').formatDuration});
 vm.runInContext(source.slice(source.indexOf('  function renderProjectLogo()'),source.indexOf('  function ask({')),context);
 vm.runInContext(source.slice(source.indexOf('  async function commit('),source.indexOf('  function setActive(')),context);
 vm.runInContext(source.slice(source.indexOf('  function renderCardSummary()'),source.indexOf('  const annotationItem =')),context);
 vm.runInContext(source.split('\n').find(line=>line.includes("$('cardRows').addEventListener('input'")),context);
 vm.runInContext('renderCard();openProjectDetails();',context);
 assert.equal(el('projectDetailsDialog').open,true);
 assert.equal(el('projectDesigner').value,'Anna Andersson');assert.equal(el('projectDate').value,'2026-10-29');assert.equal(el('projectLogoImage').src,logo.dataUrl);
 for(const row of draft.rows)for(const field of ['quantity','delivery','installer','connection','functionOwner','note'])assert(el('cardRows').innerHTML.includes(`data-row-id="${row.id}" data-field="${field}"`),row.id+' exposes '+field);
 const row=draft.rows.find(row=>row.id==='day-lock');row.installer='DT';
 for(const [field,value]of [['delivery','GS'],['connection','EL'],['functionOwner','BH'],['note','Samordnas med dörrleverantören.']])el('cardRows').handlers.input({target:{dataset:{rowId:row.id,field},value}});
 assert.equal(row.installer,'DT','editing delivery must not change installer');assert.equal(row.functionOwner,'BH');assert.equal(row.note,'Samordnas med dörrleverantören.');
 return (async()=>{
  const before=D.clone(context.state),draftBefore=D.clone(draft);
  el('projectDetailsName').value='Nytt projektnamn';el('projectDesigner').value='Bo Svensson';el('projectDate').value='2026-11-03';
  el('projectInfo_company').value='Utföraren AB';el('projectInfo_customer').value='Kunden AB';el('projectInfo_order').value='AO-88';
  storageFailure=true;await assert.rejects(()=>vm.runInContext('saveProjectDetails()',context),/disk failure/);assert.deepEqual(context.state,before);assert(el('projectDetailsDialog').open,'failed save leaves dialog open');
  storageFailure=false;await vm.runInContext('saveProjectDetails()',context);assert.equal(context.state.project.name,'Nytt projektnamn');assert.equal(saved.project.details.designer,'Bo Svensson');assert.equal(saved.project.details.company,'Utföraren AB');assert.equal(saved.project.details.customer,'Kunden AB');assert.equal(saved.project.details.order,'AO-88');assert.equal(saved.project.details.date,'2026-11-03');assert.equal(saved.project.details.logo.dataUrl,logo.dataUrl);assert.equal(el('projectDetailsDialog').open,false);assert.deepEqual(draft,draftBefore,'shared project settings preserve unsaved card draft');assert.equal(context.dirty,true);
  vm.runInContext('openProjectDetails();projectLogoDraft=null;',context);await vm.runInContext('saveProjectDetails()',context);assert.equal(context.state.project.details.logo,null,'logo removal persists');
  const old=D.createEmpty();context.state=old;vm.runInContext('openProjectDetails()',context);assert.match(el('projectDate').value,/^\d{4}-\d{2}-\d{2}$/,'first setup offers a date');assert.equal(old.project.details,undefined,'cancel/open is read-only');
  context.state.project.details={designer:'',date:'',logo:null};vm.runInContext('openProjectDetails()',context);assert.equal(el('projectDate').value,'','deliberately blank date stays blank');
 })();
}
(async()=>{
 assert.equal(D.projectDetails().designer,'');assert.equal(D.projectDetails().company,'');
 for(const date of ['2026-02-29','2026-13-01','2026-01-40','1/2/2026'])assert.throws(()=>D.projectDetails({date}),/datum/);
 assert.equal(D.projectDetails({date:'2024-02-29'}).date,'2024-02-29');
 assert.throws(()=>D.projectDetails({logo:{dataUrl:'https://example.com/logo.png'}}),/PNG/);
 assert.throws(()=>D.projectDetails({logo:{dataUrl:'data:image/png;base64,AAAA'}}),/PNG/);
 const oversized=Buffer.from(logo.dataUrl.split(',')[1],'base64');oversized.writeUInt32BE(100000,16);assert.throws(()=>D.projectDetails({logo:{dataUrl:'data:image/png;base64,'+oversized.toString('base64')}}),/stor/);
 const doc=await L.PDFDocument.create();doc.addPage([595,842]);const original=new Uint8Array(await doc.save()),raw=D.createEmpty('Exempelprojekt · Etapp 2');raw.drawing={name:'Example.pdf',pages:P.metadata(doc)};
 raw.project.details={designer:'Anna Andersson',date:'2026-10-29',logo};
 for(const [index,code] of ['GS1','GS1:1','GS2'].entries()){if(!raw.stencils[code])D.addStencil(raw,D.defaultStencil(code));D.ensureCard(raw,code);D.addPlacement(raw,{id:code.replace(':','-'),stencilId:code,page:1,x:.2+index*.25,y:.2});}
 D.addPlacement(raw,{id:'another-GS1',stencilId:'GS1',page:1,x:.5,y:.5});
 const row=raw.cards.GS1.rows.find(row=>row.id==='day-lock');Object.assign(row,{product:'LÅS-123',quantity:2,delivery:'GS',installer:'DT',connection:'EL',functionOwner:'BH',note:'Samordnas med dörrleverantören.'});
 Object.assign(raw.cards.GS1.rows.find(row=>row.id==='extra-door-stop'),{product:'STOPP-90',delivery:'DT',installer:'GS',connection:'EL',functionOwner:'BH',note:'Monteras på vägg.'});
 raw.cards.GS1.functions={door:'Öppnas med nyckel.',alarm:'Larm enligt EL.',fire:'Stänger vid brandlarm.'};
 const originalState=D.clone(raw),state=D.validate(raw);assert.deepEqual(raw,originalState);assert.equal(state.schema,7);assert.deepEqual(D.validate(state),state);assert.deepEqual((await S.unpack(await S.pack(state,original))).state,state);
 assert.equal(S.RECORD_KEY,'current-v7');
 const bytes=await P.build(state,original,{editableText:true}),pages=await pagesOf(bytes),loaded=await L.PDFDocument.load(bytes);assert.equal(pages.length,4,'one drawing + one page per unique code');
 assert.equal(imageRefs(loaded,loaded.getPage(0)).length,0);const logoRefs=[];
 for(let index=1;index<4;index++){
  const text=normalize(pages[index].map(t=>t.str).join(' '));for(const value of ['Exempelprojekt · Etapp 2','Projekterat av: Anna Andersson','Datum: 2026-10-29','Dörrfunktion','Larmfunktion','Brandfunktion'])assert(text.includes(value),value+' on card '+index);
  const refs=imageRefs(loaded,loaded.getPage(index));assert.equal(refs.length,1);logoRefs.push(refs[0]);
  for(const item of pages[index].filter(item=>/Exempelprojekt|Projekterat av:|Datum:/.test(item.str)))assert(item.transform[5]>=802&&item.transform[5]<842,'project header stays above the code block');
 }
 assert.equal(new Set(logoRefs).size,1,'embed logo once, reuse it on every card');
 const firstText=normalize(pages[1].map(t=>t.str).join(' '));for(const value of ['LÅS-123','Samordnas med dörrleverantören.','STOPP-90','Monteras på vägg.','Öppnas med nyckel.'])assert(firstText.includes(value));
 assert.deepEqual((await P.inspect(bytes)).state,state,'editable PDF roundtrip preserves all shared header and row fields');
 const preview=await P.buildCardPreview(state,'GS1'),previewPages=await pagesOf(preview);assert.equal(previewPages.length,1);assert.equal(normalize(previewPages[0].map(t=>t.str).join(' ')),firstText.replace('Dörrkort · 1/3','Dörrkort · 1/1'));
 const renamed=D.clone(state);renamed.project.name='Ändrat projekt';renamed.project.details.designer='Ny projektör';renamed.project.details.date='2026-11-01';renamed.project.details.logo=null;
 const updated=await P.build(renamed,original),updatedPages=await pagesOf(updated),updatedDoc=await L.PDFDocument.load(updated);
 for(let index=1;index<4;index++){assert.equal(imageRefs(updatedDoc,updatedDoc.getPage(index)).length,0);const text=updatedPages[index].map(t=>t.str).join(' ');assert(text.includes('Ändrat projekt'));assert(text.includes('Ny projektör'));assert(!text.includes('Anna Andersson'));}
 const long=D.clone(state);long.project.name='W'.repeat(120);long.project.details.designer='W'.repeat(120);const longPages=await pagesOf(await P.buildCardPreview(long,'GS1'));assert.equal(longPages.length,1);for(const item of longPages[0].filter(item=>item.str.includes('WWW')))assert(item.transform[5]>=802&&item.transform[4]+item.width<=466,'long names wrap within header');
 await uiChecks(state);
 await storageChecks(state);
 if(process.env.PROJECT_DETAILS_PREVIEW_DIR){fs.mkdirSync(process.env.PROJECT_DETAILS_PREVIEW_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.PROJECT_DETAILS_PREVIEW_DIR,'door-card.pdf'),preview);fs.writeFileSync(path.join(process.env.PROJECT_DETAILS_PREVIEW_DIR,'combined.pdf'),bytes);fs.writeFileSync(path.join(process.env.PROJECT_DETAILS_PREVIEW_DIR,'long-header.pdf'),await P.buildCardPreview(long,'GS1'));}
 console.log('PASS shared project metadata/logo on every one-page card; PDF and project roundtrips; long headings; logo replacement/removal; all row fields; independent GS/DT; atomic settings save and preserved card draft');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
