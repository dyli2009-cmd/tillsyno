/* Exercise the actual controller's later search/commit pipeline after reviewed
 * group edits. Only DOM rendering is suppressed in this VM harness. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),clone=value=>JSON.parse(JSON.stringify(value));
const normalize=value=>String(value||'').normalize('NFC').toUpperCase().replace(/[\s/_.-]+/g,'');
const elements={rtImageMode:{value:'text'},rtReadPhase:{value:'full'},rtName:{value:'Reviewed fixture'},rtSaveTemplate:{checked:false},rtMatchApproval:{checked:true}};
let scanned;
const hits=[
 {page:1,code:'GS23',rect:[10,100,20,110],box:{x:.02,y:.1,w:.02,h:.01},selected:true,positionId:'door-one'},
 {page:1,code:'GS23',rect:[30,100,40,110],box:{x:.06,y:.1,w:.02,h:.01},selected:true,positionId:'door-two'},
 {page:2,code:'WC',rect:[10,100,20,110],box:{x:.02,y:.1,w:.02,h:.01},selected:true,positionId:'door-three'}
];
const rects={code:{x:.1,y:.1,w:.5,h:.1},table:{x:.1,y:.3,w:.7,h:.5}};
const card=(id,page,code)=>({id,page,code,originalCardCode:code,codeRect:rects.code,tableRect:rects.table,work:['Product '+code],workItems:[],workState:'ready',workPolicy:'all'});
const initial={schema:1,phase:'full',sourceId:'fixture',rects,pages:[3,4],cards:{first:card('first',3,'GS23'),second:card('second',4,'WC')},checks:{'door-one':{first:true},'door-two':{second:true}},matching:{version:2,hits:clone(hits),pages:[{page:1,count:2},{page:2,count:1}],warnings:[],imageMode:'text',review:{version:1,approved:true}}};
const window={addEventListener(){},SmartMatchAppBridge:{normalizeCardLabel:normalize,getPdf:()=>({numPages:4})},SmartMatchReadMatcher:{scan:async options=>{
 scanned=options;
 return {version:2,hits:hits.filter(hit=>options.codes.includes(hit.code)).map(({positionId,...hit})=>({...clone(hit),rect:hit.rect.map((coordinate,index)=>coordinate+(index%2===0?.2:0))})),pages:[{page:1,count:2},{page:2,count:1}],warnings:[]};
}}};
const context={window,document:{currentScript:{src:'http://local/smartmatch-read-test-v9-8.js'},getElementById:id=>elements[id]||null},URL,crypto:crypto.webcrypto,localStorage:{setItem(){}},console};
const filename=path.join(root,'smartmatch-read-test-v9-8.js');
let source=fs.readFileSync(filename,'utf8');
const exportMarker=' window.SmartMatchReadTest=Object.freeze({';assert(source.includes(exportMarker));
source=source.replace(exportMarker,` window.__rereadReview={
 setup:data=>{previousRead=clone(data);prepared=clone(data.cards);doc={numPages:4};matchRun=clone(data.matching);drawingSample=null;renderMatches=()=>{};status=()=>{};invalidateMatches=()=>{matchRun=null;};},
 scan:()=>findDrawing(cancelVersion),result:()=>clone(matchRun),
 products:(data,cards)=>{previousRead=clone(data);prepared=clone(cards);preparedChecks=clone(data.checks);doc={numPages:4};sourceId=data.sourceId;rects=clone(data.rects);productsOnly=true;productsRead=true;confirmed=true;busy=false;finish=()=>{};start();productsOnly=false;}
 };
`+exportMarker);
vm.runInNewContext(source,context,{filename});
const reader=window.SmartMatchReadTest,review=window.__rereadReview;
async function scan(data){review.setup(data);await review.scan();return clone(review.result().hits);}
async function legacyGroupSave({ambiguous=false,fail=false}={}){
 const data=clone(initial);
 for(const current of Object.values(data.cards))current.workItems=[{key:'shared-row-key',text:current.work[0],label:'Lås',value:current.code}];
 if(ambiguous)data.cards.third=card('third',3,'GS24');
 data.checks['door-one']={'shared-row-key':true};reader.restoreReadData(data);
 const original={id:'door-one',code:'ENDASTEN',page:1,rect:[...hits[0].rect],checks:{'shared-row-key':true},rowStages:{'shared-row-key':'ready'},overrides:{'shared-row-key':{minutes:55}},progress:100,customItems:[]};
 const sourcePdf={},sourceBytes={},controls={pmGroupSave:{disabled:false},pmGroupCode:{value:'ENDASTEN'},pmGroupCard:{value:'4'},pmGroupCardIdentity:{value:'WC'},pmGroupStatus:{textContent:''},pmGroupDialog:{close(){this.closed=true;}}};
 const saved={readTestData:clone(data),manualPositions:[],positionEdits:{},labManualLinks:{ENDASTEN:3},ignoredCodes:[],instances:{'door-one':{checks:clone(original.checks)}}};
 const noop=()=>{};
 const mainContext={window:{SmartMatchReadTest:reader},$ :id=>controls[id],pdf:sourcePdf,bytes:sourceBytes,smartScanActive:false,instances:[clone(original)],positionEdits:{},manualPositions:[],labManualLinks:{ENDASTEN:3},ignoredCodes:new Set(),protocolMap:{ENDASTEN:3},protocolDefs:{},pmGroupEdit:{code:'ENDASTEN',pdf:sourcePdf,bytes:sourceBytes,ids:['door-one']},smartNormalizeCardLabel:normalize,makeProjectPayload:()=>clone(saved),buildProtocolMap:async()=>{if(fail)throw Error('Injected group mapping failure');},pmCounts:noop,recalcAll:async()=>{for(const position of mainContext.instances)Object.assign(position.checks,reader.checksForPosition(position));},smartRenderGSReport:noop,smartRenderFirstCardReport:noop,setState:noop,save:noop,updateStats:noop,renderGroups:noop,renderMarkers:noop,console};
 const main=fs.readFileSync(path.join(root,'smartmatch-read-test-main-v9-8.js'),'utf8'),start=main.indexOf('async function pmSaveGroup(){'),end=main.indexOf('\nfunction pmCode(',start);
 assert(start>=0&&end>start,'the group save function must remain discoverable');
 vm.runInNewContext(main.slice(start,end)+'\nwindow.__saveGroup=pmSaveGroup;',mainContext);
 await mainContext.window.__saveGroup();
 if(fail){
  assert.match(controls.pmGroupStatus.textContent,/Injected group mapping failure/);
  assert.deepEqual(clone(reader.payload()),data,'failed relinking restores the exact previous reviewed read data');
  assert.deepEqual(clone(mainContext.instances),[original],'failed relinking restores the old door and all its work');
  assert.deepEqual(clone(mainContext.positionEdits),{});
  return;
 }
 assert.equal(controls.pmGroupStatus.textContent,'');assert(controls.pmGroupDialog.closed);
 const changed=mainContext.instances[0],oldSource=ambiguous?'unresolved:ENDASTEN@3':'first';
 assert.equal(!!changed.checks['shared-row-key'],false,'a legacy group completion must never mark a different card product done even if their row keys coincide');
 assert.deepEqual(clone(changed.overrides),{},'old-card time overrides must not migrate to the new card');
 assert.deepEqual(clone(changed.rowStages),{},'old-card row state must not migrate to the new card');
 assert.equal(!!reader.checksForPosition(changed)['shared-row-key'],false,'the reader must not restore the former card completion during recalculation');
 assert.deepEqual(clone(mainContext.positionEdits['door-one'].cardWorkHistory[oldSource]),{checks:original.checks,rowStages:original.rowStages,overrides:original.overrides,progress:100},'the former work remains recoverable under its known or explicitly unresolved source');
}
(async()=>{
 reader.restoreReadData(initial);
 reader.updateGroupMapping({oldCode:'GS23',code:'Grupp å',drawingLabel:'Grupp å',cardPage:4,cardCode:'WC',positions:hits.filter(hit=>hit.code==='GS23').map(hit=>({...hit,id:hit.positionId}))});
 reader.removeReadPositions([{...hits[1],id:'door-two'}]);
 const saved=reader.payload(),actual=await scan(saved);
 assert.deepEqual(clone(scanned.codes).sort(),['GS23','WC'],'renamed app groups search the original printed codes');
 assert.deepEqual(actual.map(hit=>hit.code).sort(),['GRUPPÅ','WC']);
 assert.equal(actual.find(hit=>hit.code==='GRUPPÅ').positionId,'door-one');
 assert.equal(actual.find(hit=>hit.code==='WC').positionId,'door-three');
 assert(!actual.some(hit=>hit.positionId==='door-two'),'a removed stamp stays excluded after another drawing search');
 assert.equal(actual.find(hit=>hit.code==='GRUPPÅ').sourceCardId,'second');
 console.log('PASS later search preserves a renamed group, its chosen card, stable door IDs and excluded positions');

 const updatedCards=clone(saved.cards);updatedCards.second.work=['Updated WC product'];
 review.products(saved,updatedCards);
 const afterProducts=reader.payload();
 assert.deepEqual(afterProducts.groupMappings,saved.groupMappings);
 assert.deepEqual(afterProducts.renamedGroupCodes,saved.renamedGroupCodes);
 assert.deepEqual(afterProducts.matching,saved.matching);
 assert.deepEqual(afterProducts.checks,saved.checks);
 assert.deepEqual(afterProducts.removedReadPositions,saved.removedReadPositions);
 assert.equal(reader.protocolDef('GRUPPÅ',4).lines[0].text,'Updated WC product','the mapped group uses the newly read original source card');
 console.log('PASS product commit reuses group links, door IDs, individual checks and deletions without another drawing search');

 reader.restoreReadData(initial);
 reader.updateGroupMapping({oldCode:'GS23',code:'WC',drawingLabel:'WC',cardPage:4,cardCode:'WC',positions:hits.filter(hit=>hit.code==='GS23').map(hit=>({...hit,id:hit.positionId}))});
 const merged=await scan(reader.payload());
 assert.deepEqual(clone(scanned.codes).sort(),['GS23','WC']);
 assert.deepEqual(merged.map(hit=>hit.code),['WC','WC','WC']);
 assert.deepEqual(merged.map(hit=>hit.positionId),['door-one','door-two','door-three']);
 console.log('PASS merging groups preserves both printed source codes and all separate physical door identities');

 reader.restoreReadData(initial);
 reader.updateGroupMapping({oldCode:'ENDASTEN',code:'ENDASTEN',drawingLabel:'Endast en',cardPage:4,cardCode:'WC',positions:[{...hits[0],id:'door-one'}]});
 const subset=await scan(reader.payload());
 assert.equal(subset.find(hit=>hit.positionId==='door-one')?.code,'ENDASTEN','a legacy individually renamed position retains its selected group');
 assert.equal(subset.find(hit=>hit.positionId==='door-two')?.code,'GS23','another stamp with the same printed code keeps its original group');
 assert.equal(subset.find(hit=>hit.positionId==='door-three')?.code,'WC');
 console.log('PASS a single renamed physical stamp does not retarget other stamps with the same printed text');

 await legacyGroupSave();await legacyGroupSave({ambiguous:true});
 console.log('PASS legacy group relinking archives the previous work and clears a new card even when product keys coincide or the old source is ambiguous');
 await legacyGroupSave({fail:true});
 console.log('PASS a later group-save failure rolls back the door, prior source data and individual work');
})().catch(error=>{console.error(error);process.exitCode=1;});
