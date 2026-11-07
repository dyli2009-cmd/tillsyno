'use strict';
/* Actual root/revision scope helpers, selected-object form, new-service reset and
 * file-open handlers. PDF readers return neutral imported records here; real PDF
 * composition/work-state roundtrips remain covered by the existing PDF suites. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const root=path.join(__dirname,'..');
const fixturePath=path.join(__dirname,'controlflow-dialogs-v552.cjs');
const fixtureSource=fs.readFileSync(fixturePath,'utf8');
const fixtureEnd=fixtureSource.indexOf('\nconst settle=');
assert(fixtureEnd>0,'shared DOM/core fixture declarations exist');
const shared=vm.createContext({require:createRequire(fixturePath),__dirname,console,queueMicrotask});
vm.runInContext(fixtureSource.slice(0,fixtureEnd)+'\nglobalThis.scopeCoreFixture=coreFixture;globalThis.productionFunction=fn;',shared);
const plain=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
let checks=0;
function equal(actual,expected,message){assert.deepEqual(plain(actual),plain(expected),message);checks++;}
function ok(value,message){assert.ok(value,message);checks++;}

function fixture(mode){
 const s=shared.scopeCoreFixture(mode),file=mode==='security'?'security.js':'controlflow-revision/security-v335.js',source=fs.readFileSync(path.join(root,file),'utf8');
 s.$=id=>{let node=s.document.getElementById(id);if(!node){node=s.document.createElement(id.endsWith('Dialog')?'dialog':'div');node.id=id;s.document.body.append(node);}return node;};
 const names=['allInOneProtocolActive','visibleItems','cur','emptyProject','shiftedNextDate','hasSecurityRecordedProblem','isSecurityRemediated','statusOf','securityStatusText','startNewSecurityService','showSelected'];
 vm.runInContext(names.map(name=>shared.productionFunction(source,name)).join('\n'),s);
 Object.assign(s,{
  activeTypes:['lock'],pdf:{numPages:1,async destroy(){}},sourceBytes:new Uint8Array([1,2,3]),activeKey:'source',drawingRotations:{},items:[],selected:null,
  localToday:()=> '2026-11-02',securityProtocolTitle:()=> 'Testprotokoll',syncProjectInputs(){},refreshTop(){},renderSecurityPrevious(){},
  renders:0,async render(){s.renders++;return true;},saveCalls:[],messages:[],
  save(){s.saveCalls.push(plain({items:s.items,textNotes:s.textNotes,drawingExtras:s.drawingExtras,project:s.project}));return true;},
  msg(text,error=false){s.message=text;s.messages.push({text,error});},confirm:()=>true,
  fingerprint:async()=> 'source-fingerprint',loadSaved:()=>null,loadDrawingRotations(value){s.drawingRotations=value;},
  renumberLegacySecurityItems:list=>list,syncAutomationIds(){},applyDrawingOverlayVisibility(){},
  APP_LABEL:'Kontrollflöde',APP_STATE_NAME:'doorservice-all-in-one',APP_STORAGE_PREFIX:'doorservice-all-in-one:',
  localStorage:{removeItem(){},setItem(){}},viewer:{scrollLeft:0,scrollTop:0},Event:class{constructor(type){this.type=type;}},
  pdfjsLib:{getDocument:()=>({promise:Promise.resolve({numPages:1,async destroy(){}})})},
  importResults:{},importCalls:{own:0,door:0,legacyDoor:0,legacySecurity:0},
  inspectSecurityWorkPdf:async()=>{s.importCalls.own++;return s.importResults.own||null;},
  inspectDoorAutomationWorkPdfForAllInOne:async()=>{s.importCalls.door++;return s.importResults.door||null;},
  inspectLegacySecurityLinkedPdf:async()=>{s.importCalls.legacySecurity++;return s.importResults.legacySecurity||null;},
  heavyDrawing:false,PHONE_DEVICE:false,assessHeavyDrawing:async()=>false,// v2.4.580-581 sparläge check; these fixtures are small drawings
  renderTarget:null,sharpZoom:null// v2.4.591 skarp zoom (controlflow-sharp-zoom-v591.js is not loaded here)
 });
 s.project={...s.emptyProject(),projectName:'Projekt för valt protokoll',date:'2025-11-02',nextDate:'2026-11-02',order:'Tidigare order',signature:'Signatur'};
 s.AllInOneProtocols={get:()=>s.activeTypes.slice()};
 const legacyDoor=async()=>{s.importCalls.legacyDoor++;return s.importResults.legacyDoor||null;};
 s.inspectLegacyLinkedPdf=legacyDoor;s.RevisionImportProfiles={inspect:legacyDoor};
 const start=source.indexOf("$('securityFile').onchange=async e=>"),end=source.indexOf("\n$('secOpenWorkDialog').addEventListener",start);
 assert(start>=0&&end>start,'actual file-open handler found: '+mode);
 vm.runInContext(source.slice(start,end),s);
 const legacySource=shared.productionFunction(source,'inspectLegacySecurityLinkedPdf'),predicate=legacySource.match(/const allInOneTypeAllowed=type=>[^\n]+;/)?.[0]||legacySource.match(/const allInOneTypeAllowed=type=>[\s\S]*?\n  };/)?.[0];
 assert(predicate,'legacy parser scope predicate found');
 vm.runInContext('(()=>{'+predicate+'globalThis.legacyTypeAllowed=allInOneTypeAllowed;})();',s);
 s.open=async()=>{const target={files:[{name:'scope-fixture.pdf',async arrayBuffer(){return new Uint8Array([9,8,7]).buffer;}}],value:'selected.pdf'};await s.$('securityFile').onchange({target});equal(target.value,'',mode+': file input resets after import');};
 return s;
}

function object(s,type,uid=type){
 return s.normalize({uid,type,number:1,id:'Sparat '+uid,idMode:'manual',page:1,x:.23,y:.62,labelX:.35,labelY:.55,
  checks:{'1.1':{result:'remark',note:'Sparad anmärkning '+uid}},customChecks:[{id:'1.99',title:'Egen kontroll '+uid}],checkEdits:{},notes:'Objektnotering '+uid,
  previousIssues:[{n:'1.2',title:'Föregående kontroll',note:'Föregående anmärkning'}],previousNotes:'Historisk notering',previousStatus:'Ej klar',previousServiceDate:'2024-11-02',
  status:'action',manualFail:false,remediationDate:'2026-10-20',remediationSignature:'QA',positionLocked:true,customerStampScale:.7,customerArrowScale:1.5});
}
function record(s,list){return{drawingBytes:new Uint8Array([1,2,3]),work:{items:plain(list),textNotes:[{uid:'note',text:'Fristående ritningsnotering'}],drawingExtras:[{uid:'line',kind:'line'}],project:plain(s.project),logoData:''}};}
const types=['automation','automation_selfcheck','lock_revision','detector','alarm','lock','access'];

function selectionScope(mode){
 const s=fixture(mode);s.items=types.map(type=>object(s,type));
 equal(s.visibleItems().map(o=>o.type),['lock'],mode+': only explicitly chosen protocol is visible');
 s.selected='automation';equal(s.cur(),undefined,mode+': stale selection cannot return an inactive object');
 s.$('secForm').hidden=false;s.showSelected();equal(s.$('secForm').hidden,true,mode+': inactive selected checklist form is hidden');
 equal(s.$('secNoSelection').hidden,false,mode+': inactive selection displays the empty form state');
 s.selected='lock';assert.equal(s.cur(),s.items.find(o=>o.type==='lock'));checks++;
 s.activeTypes=[];
 equal(s.visibleItems(),[],mode+': an explicit empty selection means no protocols');
 equal(s.cur(),undefined,mode+': clearing protocol selection invalidates the current form');
 for(const type of types)equal(s.legacyTypeAllowed(type),false,mode+': legacy recognition honors explicit empty selection for '+type);
 s.activeTypes=['alarm','lock'];equal(types.filter(s.legacyTypeAllowed),['alarm','lock'],mode+': legacy reader shares the exact selected protocols');
 delete s.AllInOneProtocols;
 equal(s.visibleItems().length,types.length,mode+': missing controller retains initialization compatibility');
 s.AllInOneProtocols={get:()=>[]};s.ALL_IN_ONE=false;
 equal(s.visibleItems().length,types.length,mode+': standalone service remains independent of all-in-one choices');
 equal(s.cur()?.type,'lock',mode+': standalone selected object still opens');
}

function newServiceScope(mode){
 const s=fixture(mode);s.activeTypes=['lock','alarm'];s.items=types.map(type=>object(s,type));
 const before=plain(s.items),hidden=before.filter(o=>!s.activeTypes.includes(o.type));s.selected='lock';
 ok(s.startNewSecurityService(false),mode+': new service starts for the selected protocols');
 equal(s.items.length,types.length,mode+': new service retains every source object');
 equal(s.items.filter(o=>!s.activeTypes.includes(o.type)),hidden,mode+': all hidden assessments, identity, history and layout stay byte-for-byte equivalent');
 for(const type of s.activeTypes){
  const current=s.items.find(o=>o.type===type),previous=before.find(o=>o.type===type);
  equal(current.previousNotes,previous.notes,mode+': selected '+type+' carries notes into history');
  equal(current.previousServiceDate,'2025-11-02',mode+': selected '+type+' remembers the service date');
  equal(current.previousIssues.map(issue=>issue.note),['Sparad anmärkning '+type],mode+': selected '+type+' preserves its previous recorded issue');
  equal([current.notes,current.remediationDate,current.remediationSignature,current.status],['','','','untested'],mode+': selected '+type+' starts with fresh assessments');
  ok(Object.values(current.checks).every(check=>check.result===''&&check.note===''),mode+': selected '+type+' checks reset');
  equal([current.uid,current.x,current.y,current.labelX,current.labelY,current.positionLocked],[previous.uid,previous.x,previous.y,previous.labelX,previous.labelY,previous.positionLocked],mode+': selected '+type+' placement and lock are retained');
 }
 equal(s.saveCalls.length,1,mode+': one reset commit');
 equal(s.saveCalls[0].items.filter(o=>!s.activeTypes.includes(o.type)),hidden,mode+': persistence retains the unselected source protocols');
 equal(s.selected,null,mode+': new service clears object selection');

 const empty=fixture(mode);empty.items=[object(empty,'automation')];const unchanged=plain({items:empty.items,project:empty.project});
 equal(empty.startNewSecurityService(false),false,mode+': hidden source objects alone cannot start a service for another protocol');
 equal({items:empty.items,project:empty.project},unchanged,mode+': rejected empty scope leaves both objects and project untouched');
 equal(empty.saveCalls.length,0,mode+': rejected empty scope does not save');
 empty.activeTypes=[];equal(empty.startNewSecurityService(false),false,mode+': empty controller selection cannot reset hidden objects');
 empty.ALL_IN_ONE=false;ok(empty.startNewSecurityService(false),mode+': standalone new service keeps its original all-object behavior');
 equal(empty.items[0].status,'untested',mode+': standalone item is reset');
 if(mode==='security'){
  const cancelled=fixture(mode);cancelled.items=[object(cancelled,'lock')];cancelled.confirm=()=>false;const original=plain(cancelled.items);
  equal(cancelled.startNewSecurityService(true),false,'security: cancel still prevents new service');
  equal(cancelled.items,original,'security: cancellation preserves assessments');
 }
}

async function importScope(mode){
 const mixed=fixture(mode),list=[object(mixed,'lock','lock-1'),object(mixed,'automation'),object(mixed,'access'),object(mixed,'lock','lock-2')];
 mixed.importResults.own=record(mixed,list);mixed.selected='automation';await mixed.open();
 equal(mixed.items,list,mode+': structured import keeps all source objects');
 equal(mixed.visibleItems().map(o=>o.uid),['lock-1','lock-2'],mode+': structured PDF cannot expand the active scope');
 equal(mixed.activeTypes,['lock'],mode+': import does not replace the explicit choice');
 equal(mixed.cur(),undefined,mode+': previously selected imported automation cannot open its checklist');
 ok(mixed.$('secOpenWorkDialog').open,mode+': matching objects open the resume/new-service choice');
 ok(mixed.$('secOpenWorkMeta').textContent.includes('2 objekt'),mode+': resume dialog counts selected objects');
 ok(!mixed.$('secOpenWorkMeta').textContent.includes('4 objekt'),mode+': resume dialog does not count hidden objects');
 equal(mixed.saveCalls.at(-1).items,list,mode+': imported source objects are retained for work-file persistence');
 equal(mixed.textNotes,[{uid:'note',text:'Fristående ritningsnotering'}],mode+': unrelated drawing notes survive import');

 const door=fixture(mode);door.importResults.door=record(door,[object(door,'automation')]);await door.open();
 equal(door.items.length,1,mode+': structured DoorWork is still extracted and retained');
 equal(door.visibleItems(),[],mode+': unselected imported door stays outside the workspace');
 ok(!door.$('secOpenWorkDialog').open,mode+': hidden door does not prompt a service for the selected protocol');
 ok(!/Dörrautomatik|1 objekt/.test(door.message),mode+': import feedback does not claim hidden automation was restored');
 ok(door.message.includes('Börja markera valda protokoll'),mode+': empty selected scope invites marking its chosen protocols');
 equal(door.importCalls.legacyDoor,0,mode+': structured source extraction needs no legacy classifier');

 const cleared=fixture(mode);cleared.activeTypes=[];cleared.importResults.own=record(cleared,[object(cleared,'lock'),object(cleared,'automation')]);await cleared.open();
 equal(cleared.items.length,2,mode+': no chosen protocols still retains structured source data');
 equal(cleared.visibleItems(),[],mode+': no chosen protocols remains empty after PDF open');
 ok(!cleared.$('secOpenWorkDialog').open,mode+': no selected objects means no misleading resume dialog');

 const securityLegacy=fixture(mode);securityLegacy.importResults.legacyDoor={drawingBytes:new Uint8Array([1]),work:{doors:[object(securityLegacy,'automation')]}};
 securityLegacy.importResults.legacySecurity={...record(securityLegacy,[object(securityLegacy,'lock'),object(securityLegacy,'automation')]),summaryText:'2 objekt, Dörrautomatik'};
 await securityLegacy.open();
 equal(securityLegacy.importCalls.legacyDoor,0,mode+': security-only selection skips the legacy automation parser');
 equal(securityLegacy.importCalls.legacySecurity,1,mode+': selected security protocols reach their own legacy parser');
 equal(securityLegacy.message,'Äldre PDF öppnad. 1 objekt återställda för valda protokoll.',mode+': legacy feedback counts only the selected protocol');
 equal(securityLegacy.items.length,2,mode+': legacy feedback filtering does not delete source items');

 const automationLegacy=fixture(mode);automationLegacy.activeTypes=['automation'];automationLegacy.importResults.legacyDoor={drawingBytes:new Uint8Array([1]),work:{doors:[object(automationLegacy,'automation')]}};await automationLegacy.open();
 equal(automationLegacy.importCalls.legacyDoor,1,mode+': explicitly selected automation still uses its legacy parser');
 equal(automationLegacy.importCalls.legacySecurity,0,mode+': successful automation import retains parser priority');
 equal(automationLegacy.visibleItems().map(o=>o.type),['automation'],mode+': selected legacy automation remains usable');

 const standalone=fixture(mode);standalone.ALL_IN_ONE=false;standalone.importResults.legacySecurity={...record(standalone,[object(standalone,'lock')]),summaryText:'Befintlig utförlig importinformation'};await standalone.open();
 equal(standalone.message,'Befintlig utförlig importinformation',mode+': standalone legacy feedback remains unchanged');
}

(async()=>{
 for(const mode of ['security','revision']){selectionScope(mode);newServiceScope(mode);await importScope(mode);}
 console.log('security-protocol-scope-v556: '+checks+' assertions passed (actual root/revision scope, stale selection, new service, file-open handlers and retained source objects).');
})().catch(error=>{console.error(error);process.exitCode=1;});
