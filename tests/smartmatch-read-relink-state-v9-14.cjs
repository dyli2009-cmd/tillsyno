/* Focused state/bridge regression for TEST 9.14 reviewed relinking.
 * A deleted automatic hit stays suppressed by its tombstone. Only an exact,
 * explicitly reviewed request may create one new, unchecked manual link.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const clone=value=>JSON.parse(JSON.stringify(value));
const normalize=value=>String(value||'').normalize('NFC').toUpperCase().replace(/[\s/_.-]+/g,'');
const readerSource=fs.readFileSync(path.join(__dirname,'../smartmatch-read-test-v9-14.js'),'utf8');
const mainSource=fs.readFileSync(path.join(__dirname,'../smartmatch-read-test-main-v9-14.js'),'utf8');
const between=(source,start,end)=>{
 const offset=source.indexOf(start);assert.notEqual(offset,-1,'missing source start: '+start);
 const finish=source.indexOf(end,offset);assert.notEqual(finish,-1,'missing source end: '+end);
 return source.slice(offset,finish);
};
function loadReader(){
 const storage=new Map(),window={addEventListener(){},SmartMatchAppBridge:{normalizeCardLabel:normalize,getPdf:()=>({numPages:3}),getDoorCardMapping:()=>({WC:3})}};
 const context={window,document:{currentScript:{src:'http://local/smartmatch-read-test-v9-14.js'},getElementById(){return null;}},URL,crypto:crypto.webcrypto,localStorage:{setItem:(key,value)=>storage.set(key,value)},console};
 vm.runInNewContext(readerSource,context);return {reader:window.SmartMatchReadTest,window};
}
const codeRect={x:.08,y:.08,w:.8,h:.06},tableRect={x:.08,y:.16,w:.8,h:.25};
const linkedId='scan:WC@1:linked',removedId='scan:WC@1:removed',otherRemovedId='scan:WC@2:removed';
const linkedRect=[50,100,90,130],removedRect=[150,100,190,130],otherRemovedRect=[250,100,290,130];
function card(){return {id:'card:WC',page:3,code:'WC',originalCardCode:'WC',header:'Beslagskod: WC',codeRect,tableRect,bounds:{x:.06,y:.06,w:.86,h:.4},rawTable:'Låshus SL660 GS',work:['Låshus · SL660'],workItems:[{key:'lock',text:'Låshus · SL660',label:'Låshus',value:'SL660'}],workState:'ready',workPolicy:'gs-install-v2'};}
function hit(id,page,rect,selected){return {positionId:id,page,code:'WC',rect:[...rect],box:{x:.1,y:.1,w:.1,h:.05},selected,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'project-code',label:'WC'};}
function initialReadData(){return {schema:1,phase:'full',sourceId:'relink-state-v9-14',rects:{code:codeRect,table:tableRect},pages:[3],cards:{'card:WC':card()},checks:{[linkedId]:{lock:false},[removedId]:{lock:true},[otherRemovedId]:{lock:true}},matching:{version:2,hits:[hit(linkedId,1,linkedRect,true),hit(removedId,1,removedRect,false),hit(otherRemovedId,2,otherRemovedRect,false)],pages:[],warnings:[],imageMode:'text',review:{version:1,approved:true}},removedReadPositions:[{id:removedId,page:1,code:'WC',rect:[...removedRect]},{id:otherRemovedId,page:2,code:'WC',rect:[...otherRemovedRect]}]};}
function removedRequest(overrides={}){return {id:removedId,page:1,code:'WC',rect:[...removedRect],...overrides};}

function mainBridge(reader,readerWindow,{saved=null,failRecalc=false}={}){
 const base=saved||{},linked={id:linkedId,code:'WC',page:1,rect:[...linkedRect],checks:{lock:false},rowStages:{},overrides:{},customItems:[],progress:0};
 const persistedManual=clone(base.manualPositions||[]),persistedInstances=base.instances||{};
 const restoredManual=persistedManual.map(item=>({...item,checks:clone(persistedInstances[item.id]?.checks||{}),rowStages:clone(persistedInstances[item.id]?.rowStages||{}),overrides:clone(persistedInstances[item.id]?.overrides||{}),customItems:clone(persistedInstances[item.id]?.customItems||[]),progress:Number(persistedInstances[item.id]?.progress)||0}));
 const c={console,crypto:crypto.webcrypto,Set,Array,JSON,Math,Number,Error,Uint8Array,
  pdf:{numPages:3,async getPage(){return {view:[0,0,595,842]};}},bytes:new Uint8Array([1]),smartScanActive:false,
  instances:[linked,...restoredManual],manualPositions:persistedManual,positionEdits:clone(base.positionEdits||{[removedId]:{deleted:true},[otherRemovedId]:{deleted:true}}),
  labManualLinks:clone(base.labManualLinks||{}),protocolMap:{WC:3},protocolDefs:{stable:true},smartDoorCardPages:new Set([3]),smartImportedCardPages:new Set([3]),ignoredCodes:new Set(base.ignoredCodes||[]),
  scanPageLimit:()=>3,smartNormalizeCardLabel:normalize,pmCounts(){},pmRefresh(){},save(){},updateStats(){},renderGroups(){},renderMarkers(){},setState(message){c.status=message;},
  async buildProtocolMap(){c.protocolMap={WC:3,...c.labManualLinks};},async recalcAll(){if(failRecalc)throw Error('recalc failed');}
 };
 c.makeProjectPayload=()=>clone({schema:6,projectId:'state-relink',projectRevision:1,manualPositions:c.manualPositions,positionEdits:c.positionEdits,ignoredCodes:[...c.ignoredCodes],labManualLinks:c.labManualLinks,instances:Object.fromEntries(c.instances.map(item=>[item.id,{checks:item.checks||{},rowStages:item.rowStages||{},overrides:item.overrides||{},customItems:item.customItems||[],progress:item.progress||0}])),readTestData:reader.payload()});
 readerWindow.SmartMatchReadTest=reader;c.window=readerWindow;
 vm.createContext(c);
 vm.runInContext(between(mainSource,'function pmSamePhysicalPosition(','function pmReadPositionRemoved('),c);
 vm.runInContext(between(mainSource,'async function addManualReadPositions(','function pmRefresh('),c);
 return c;
}

(async()=>{
 const direct=loadReader(),reader=direct.reader,initial=initialReadData();
 assert.equal(reader.canOpenSavedProject(initial,3),true);reader.restoreReadData(initial);
 const exact=removedRequest(),before=clone(reader.payload());
 assert.throws(()=>reader.relinkReadPositions([exact]),/granskas|väljas/i,'relink requires an explicit reviewed action');
 for(const [label,request] of [
  ['id',{...exact,id:'wrong-id'}],
  ['page',{...exact,page:2}],
  ['normalized code',{...exact,code:'GS23'}],
  ['rectangle',{...exact,rect:[removedRect[0]+.01,...removedRect.slice(1)]}]
 ]){
  assert.throws(()=>reader.relinkReadPositions([request],{reviewed:true}),/ändrats|Sök igen/i,label+' mismatch is rejected');
  assert.deepEqual(clone(reader.payload()),before,'a rejected '+label+' mismatch cannot mutate reader state');
 }
 assert.throws(()=>reader.relinkReadPositions([exact,exact],{reviewed:true}),/säkert|Sök igen/i,'one tombstone cannot be restored twice in one request');
 const directResult=reader.relinkReadPositions([{...exact,code:'w c'}],{reviewed:true});
 assert.deepEqual(clone(directResult.restored),[before.removedReadPositions[0]],'normalization may vary, but identity/page/code/rect resolve to the exact tombstone');
 let state=clone(reader.payload());
 assert.deepEqual(state.removedReadPositions,before.removedReadPositions,'review does not remove either suppression tombstone');
 assert.equal(state.matching.hits.find(item=>item.positionId===removedId).selected,false,'the deleted automatic source stays suppressed');
 assert.equal(state.matching.hits.find(item=>item.positionId===otherRemovedId).selected,false,'the unrelated deleted source stays suppressed');
 assert.deepEqual(state.checks,before.checks,'the reader API neither moves nor copies completion state');
 const roundTrip=JSON.parse(JSON.stringify(state)),freshDirect=loadReader();assert.equal(freshDirect.reader.canOpenSavedProject(roundTrip,3),true);freshDirect.reader.restoreReadData(roundTrip);
 assert.deepEqual(clone(freshDirect.reader.payload()),roundTrip,'serialized reader state retains both suppressions exactly');

 // The ordinary bridge remains unable to resurrect the deleted source.
 const bridgeReader=loadReader();bridgeReader.reader.restoreReadData(initialReadData());const bridge=mainBridge(bridgeReader.reader,bridgeReader.window);
 const ordinary=await bridge.addManualReadPositions({code:'WC',drawingLabel:'WC',cardPage:3,cardCode:'WC',hits:[{page:1,code:'WC',rect:[...removedRect],selected:true}]});
 assert.equal(ordinary.added,0);assert.equal(ordinary.restored,0);assert.equal(ordinary.duplicates,1);assert.equal(bridge.manualPositions.length,0);
 assert.deepEqual(clone(bridgeReader.reader.payload()),initialReadData(),'an unreviewed rediscovery leaves all reader state untouched');

 // A reviewed result may use the scanner's nearby geometry, but authenticates
 // with the exact hidden tombstone metadata passed by the review dialog.
 const scanRect=[150.25,100,190.25,130];
 const restored=await bridge.addManualReadPositions({code:'WC',drawingLabel:'WC',cardPage:3,cardCode:'WC',reviewedRestore:true,hits:[{page:1,code:'WC',rect:scanRect,selected:true,restoreRemoved:true,removedId,removedRect:[...removedRect]}]});
 assert.equal(restored.added,1);assert.equal(restored.restored,1);assert.equal(restored.duplicates,0);
 assert.equal(bridge.manualPositions.length,1);const manual=clone(bridge.manualPositions[0]);
 assert.equal(manual.restoredFromId,removedId);assert.deepEqual(manual.rect,scanRect);assert.deepEqual(manual.checks,{});assert.deepEqual(manual.rowStages,{});assert.deepEqual(manual.overrides,{});assert.equal(manual.progress,0);
 assert.notEqual(manual.id,removedId,'restoring creates a distinct live manual ID while the old automatic ID remains suppressed');
 state=clone(bridgeReader.reader.payload());assert.deepEqual(state.removedReadPositions.map(item=>item.id),[removedId,otherRemovedId]);
 assert.equal(state.matching.hits.find(item=>item.positionId===removedId).selected,false);assert.equal(state.matching.hits.find(item=>item.positionId===otherRemovedId).selected,false);
 assert.deepEqual(state.checks[removedId],{lock:true},'old completion history remains archived on the suppressed source');assert.deepEqual(state.checks[manual.id],{},'new manual link starts without copied completion');
 const saved=JSON.parse(JSON.stringify(bridge.makeProjectPayload()));assert.equal(saved.manualPositions.length,1);assert.equal(saved.instances[manual.id].progress,0);assert.deepEqual(saved.instances[manual.id].checks,{});

 const reopenedReader=loadReader();assert.equal(reopenedReader.reader.canOpenSavedProject(saved.readTestData,3),true);reopenedReader.reader.restoreReadData(saved.readTestData);
 const reopened=mainBridge(reopenedReader.reader,reopenedReader.window,{saved});assert.equal(reopened.instances.filter(item=>item.manual&&item.restoredFromId===removedId).length,1,'portable reopen has exactly one live restored manual link');
 assert.deepEqual(clone(reopenedReader.reader.payload().removedReadPositions),saved.readTestData.removedReadPositions);assert.equal(reopenedReader.reader.payload().matching.hits.find(item=>item.positionId===removedId).selected,false);
 const repeat=await reopened.addManualReadPositions({code:'WC',drawingLabel:'WC',cardPage:3,cardCode:'WC',reviewedRestore:true,hits:[{page:1,code:'WC',rect:scanRect,selected:true,restoreRemoved:true,removedId,removedRect:[...removedRect]}]});
 assert.equal(repeat.added,0);assert.equal(repeat.restored,0);assert.equal(repeat.duplicates,1);assert.equal(reopened.manualPositions.length,1,'repeat review cannot duplicate the restored physical position');
 assert.deepEqual(clone(reopened.makeProjectPayload()),saved,'duplicate-safe reopen leaves the portable payload unchanged');

 // Failure after reader authentication, manual insertion and empty-check
 // creation must roll the whole transaction back, including reader checks.
 const rollbackReader=loadReader();rollbackReader.reader.restoreReadData(initialReadData());const rollback=mainBridge(rollbackReader.reader,rollbackReader.window,{failRecalc:true}),rollbackBefore=clone(rollback.makeProjectPayload());
 await assert.rejects(rollback.addManualReadPositions({code:'WC',drawingLabel:'WC',cardPage:3,cardCode:'WC',reviewedRestore:true,hits:[{page:1,code:'WC',rect:scanRect,selected:true,restoreRemoved:true,removedId,removedRect:[...removedRect]}]}),/recalc failed/);
 assert.deepEqual(clone(rollback.makeProjectPayload()),rollbackBefore,'a failure after relink restores tombstones, reader checks, manual positions and live instances atomically');
 console.log('PASS TEST 9.14 relink state: reviewed-only exact tombstone authentication, permanent old-source suppression, unrelated tombstone retention, unchecked manual restore, serialized duplicate-safe reopen');
})().catch(error=>{console.error(error);process.exitCode=1;});
