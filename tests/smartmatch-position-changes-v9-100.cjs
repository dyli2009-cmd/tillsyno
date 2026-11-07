'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../smartmatch-position-changes-v9-100.js');
const PDF=require('../vendor/pdf-lib.min.js'),writer=require('../smartmatch-read-project-writer-v9-85.js'),reader=require('../smartmatch-read-project-v9-29.js');
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-read-main-v9-94.js'),'utf8');
const section=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert(start>=0&&end>start,a);return source.slice(start,end);};
const clone=value=>JSON.parse(JSON.stringify(value));
const automation={key:'gs2:da',sourceIdentity:'gs:0:7:dorrstangning:automatik:ed100',label:'Dörrautomatik',value:'ED100',section:'Dörrstängning',responsibility:'GS'};
const lock={key:'gs2:lock',label:'Låshus',value:'SM36',responsibility:'GS'};
const def={checks:[automation,lock],lines:[automation,lock],readTestSelected:true,workState:'ready'};
const door=id=>({id,position:id==='a'?1:2,code:'GS4',page:1,rect:[10,10,30,20],checks:{'gs2:da':true},rowStages:{'gs2:da':{installed:true}},overrides:{},customItems:[],attentionItems:[]});
const a=door('a'),b=door('b');
const savedChecks={a:{...a.checks},b:{...b.checks}};
const context=vm.createContext({window:{SmartMatchPositionChanges:C,SmartMatchReadTest:{protocolDef:()=>def,checksForPosition:o=>savedChecks[o.id]||{},syncChecks:o=>{savedChecks[o.id]=clone(o.checks);},payload:()=>({cards:{GS4:clone(def)}})}},
 instances:[a,b],protocolDef:async()=>def,protocolMap:{GS4:2},resolveProjectProduct:item=>item,
 resolveItemMinutes:item=>({minutes:item.minutes??(item.value==='ED100'?180:10)}),workQuantity:item=>item.quantity||1,
 projectProductName:item=>item.value||item.label,projectProductKey:name=>name.toLowerCase(),projectExtraMaterials:()=>[],
 save(){},updateStats(){},renderGroups(){},renderMarkers(){},setState(){},syncProtocolProgress(){},renderChecklist(){},renderTimeReport(){},selectedId:'a',el:{protocol:{open:false},timeDialog:{open:false}},console});
for(const [from,to] of [
 ['function effectiveChecks(', 'function buildInstances('],
 ['async function recalc(', 'function matchedProjectInstances('],
 ['function isProjectMaterialItem(', 'function materialCategoryColor('],
 ['async function calculateDoorTime(', 'async function calculateTimeReport('],
 ['async function refreshPositionChange(', 'function appendEditableCheck(']
])vm.runInContext(section(from,to),context);

async function run(){
 const original=clone(def),other=clone(b),item={...automation,source:'base'};
 await context.recalc(a);assert.equal(a.estimatedMinutes,190);assert.equal(a.doneMinutes,180);
 await context.setPositionChange(a,item,{excluded:true,note:'Beställaren tar bort automatiken',color:'red'});
 assert.equal(a.estimatedMinutes,10);assert.equal(a.doneMinutes,0);assert.equal(a.materialCount,1);assert.equal(a.workItemCount,1);
 assert.equal(a.checks[automation.key],undefined);assert.equal(a.rowStages[automation.key],undefined);
 assert.equal(C.isExcluded(a,item),true);assert.equal(C.isExcluded(b,item),false);assert.deepEqual(def,original);assert.deepEqual(b,other);
 assert.equal(context.effectiveChecks(b,def).length,2);assert.equal(context.effectiveChecks(a,def).length,1);
 await context.setReadWorkCheck(a,automation.key,true);assert.equal(a.checks[automation.key],undefined,'an excluded point cannot be checked through the app bridge');
 const rows=await context.projectMaterialRows();assert.equal(rows.find(row=>row.name==='ED100').quantity,1);assert.equal(rows.find(row=>row.name==='SM36').quantity,2);
 const time=await context.calculateDoorTime(a);assert.equal(time.totalMinutes,10);assert.equal(time.materialCount,1);
 assert.equal(context.readWorkState(a).total,1);assert.equal(C.active(a).length,1);
 assert.equal(C.inventoryChange(a,automation).excluded,true);
 assert.equal(C.inventoryChange(a,{...automation,sourceIdentity:'another-row'}),null,'identical model on a different row is not struck out');
 assert.equal(C.inventoryChange(a,{...automation,sourceIdentity:''},[automation,automation]),null);
 // The real payload builder carries changes through the actual PDF encoder,
 // PDF bytes and decoder; the real instance builder restores each position.
 Object.assign(context,{materialDrafts:undefined,materialDraftDocument:null,pdf:{},embeddedState:null,manualPositions:[],positionEdits:{},ignoredCodes:new Set(),labManualLinks:{},smartCheckReadMode:'GS',smartCheckReadTerm:'',smartProjectTimeConfig:{},
 projectArticleTimeCatalog:()=>({}),materialLibraryCatalog:()=>[],appMaterialLibrary:()=>({categories:[]}),projectId:'changes-test',fileKey:'changes',currentFileName:'test.pdf',drawingNotes:[],projectMeta:{},normalizeProjectMeta:x=>x||{},projectLogoData:'',smartConfirmedOcr:[],automationItems:[]});
 vm.runInContext(section('function makeProjectPayload(){','function loadSaved(){'),context);
 const payload=context.makeProjectPayload();
 const doc=await PDF.PDFDocument.create();doc.addPage();doc.addPage();
 doc.catalog.set(PDF.PDFName.of('TillsynoSmartMatchV36Data'),await writer.create(payload,PDF,async()=>{}));
 const bytes=await doc.save(),opened=await PDF.PDFDocument.load(bytes),roundtrip=reader.read(opened,PDF).payload;
 assert.deepEqual(roundtrip,clone(payload));
 Object.assign(context,{loadSaved:()=>roundtrip,stamps:[{code:'GS4',page:1,positionId:'a',rect:[10,10,30,20]},{code:'GS4',page:1,positionId:'b',rect:[40,10,60,20]}],projectStamps:[],isolateAutomationItems:x=>x,pmCounts(){}});
 vm.runInContext(section('function buildInstances(){','async function recalc('),context);context.buildInstances();
 const reopenedA=context.instances.find(o=>o.id==='a'),reopenedB=context.instances.find(o=>o.id==='b');
 await context.recalc(reopenedA);await context.recalc(reopenedB);
 assert.equal(reopenedA.estimatedMinutes,10);assert.equal(reopenedB.estimatedMinutes,190);assert.equal(C.active(reopenedA)[0].note,'Beställaren tar bort automatiken');assert.equal(C.active(reopenedB).length,0);
 await context.restorePositionChange(reopenedA,item);assert.equal(reopenedA.estimatedMinutes,190);assert(!reopenedA.checks[automation.key],'restoring a product never restores an old completion');
 assert.equal(C.active(reopenedA).length,0);assert(C.entries(reopenedA)[0].restoredAt);
 await context.setPositionChange(reopenedA,item,{excluded:false,note:'Kontrollera ny placering',color:'blue'});assert.equal(reopenedA.estimatedMinutes,190);assert.equal(C.active(reopenedA)[0].color,'blue');
 const own={id:'custom:test',label:'Egen produkt',value:'X1',minutes:25};reopenedA.customItems.push(own);
 await context.setPositionChange(reopenedA,{...own,key:own.id,source:'custom'},{excluded:true,note:'Utgår',color:'bad-color'});
 assert.equal(C.active(reopenedA).find(row=>row.key===own.id).color,'amber');assert(!context.effectiveChecks(reopenedA,def).some(row=>row.key===own.id));
 assert.throws(()=>C.set(reopenedA,item,{excluded:true,note:'  '}),/Skriv/);
 await assert.rejects(()=>context.setPositionChange(door('missing'),item,{excluded:true,note:'Utgår'}),/finns inte kvar/);
 const unknown={...item,key:'unknown'};await assert.rejects(()=>context.setPositionChange(reopenedA,unknown,{excluded:true,note:'Utgår'}),/Produktraden/);
 // A zero-work position and a deferred reread must not restore removed points.
 await context.setPositionChange(reopenedA,item,{excluded:true,note:'Utgår',color:'amber'});
 await context.setPositionChange(reopenedA,{...lock,source:'base'},{excluded:true,note:'Utgår',color:'amber'});
 assert.equal(reopenedA.workItemCount,0);assert.equal(reopenedA.estimatedMinutes,0);assert.equal(reopenedA.progress,0);
 assert.equal(context.effectiveChecks(reopenedA,{pending:true}).length,0);
 console.log('PASS position isolation, excluded controls and quantities/time, bridge guard, original GS/DT data, real PDF metadata roundtrip, restore unchecked, flags, custom rows, validation and zero work');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
