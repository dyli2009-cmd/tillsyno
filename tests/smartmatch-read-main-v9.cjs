/* Main-app contract checks: the reviewed identifiers need no second PDF-text
 * scan, and products deferred by TEST 9 must not become completed work. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-read-test-main-v9.js'),'utf8');
const between=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const json=value=>JSON.parse(JSON.stringify(value));

async function reviewedIndex(){
 const context=vm.createContext({
  window:{SmartMatchReadTest:{drawingSelection:()=>({codes:['GS23','DBLDS'],positions:[]}),
   isCardPage:page=>page===2||page===3,
   identitiesForPage:page=>[{code:page===2?'GS23':'DBLDS',row:'selected code',page}]},
   SmartMatchBeslagskodProfile:{release:async()=>{}}},
  pdf:{numPages:3,getPage:()=>{throw Error('reviewed pages must not be extracted again')}},
  smartDoorCardIndex:{},smartDoorCardPages:new Set(),smartDoorCardFirstRows:{},
  smartImportedCardPages:new Set(),smartImportReport:{},smartScanStats:{},
  drawingPageLevels:{},scanPageLimit:()=>3,smartLoadProgress:()=>{},setState:()=>{},
  console:{info:()=>{}},readPageText:()=>{throw Error('unexpected second text scan')}
 });
 vm.runInContext(between('async function smartIndexDoorCardsFirst(){','function scanPageLimit(){'),context);
 await vm.runInContext('smartIndexDoorCardsFirst()',context);
 assert.deepEqual(json(context.smartDoorCardIndex),{GS23:[2],DBLDS:[3]});
 assert.deepEqual([...context.smartDoorCardPages],[2,3]);
 assert.equal(context.smartScanStats.cardCodes,2);
 console.log('PASS reviewed card index reuses identities without getPage/getTextContent');
}

async function pendingWork(){
 const card={code:'DBLDS',page:2,pending:true,workState:'pending',lines:[],checks:[]};
 const context=vm.createContext({window:{SmartMatchReadTest:{protocolDef:()=>card}},protocolMap:{DBLDS:2},
  protocolDefs:{},readPageText:()=>{throw Error('pending work must not read table text')},
  resolveItemMinutes:()=>{throw Error('pending work must not resolve time')},
  resolveItemCount:0});
 vm.runInContext(between('async function protocolDef(code){','function buildInstances(){'),context);
 vm.runInContext(between('async function recalc(o){','function syncReadWorkChecks(o){'),context);
 const instance={code:'DBLDS',checks:{saved:true},overrides:{saved:{label:'Keep this'}},
  customItems:[{id:'custom',label:'Saved custom item',minutes:10}],progress:100,workItemCount:5,
  estimatedMinutes:50,doneMinutes:50,unknownTimeCount:2};
 context.instance=instance;
 const definition=await vm.runInContext('protocolDef(instance.code)',context);
 assert.equal(definition.pending,true);
 assert.deepEqual(json(vm.runInContext('effectiveChecks(instance,{pending:true})',context)),[]);
 await vm.runInContext('recalc(instance)',context);
 assert.equal(instance.workState,'pending');assert.equal(instance.progress,0);
 assert.equal(instance.workItemCount,0);assert.equal(instance.estimatedMinutes,0);
 assert.deepEqual(instance.checks,{saved:true});assert.equal(instance.customItems.length,1);
 assert.equal(instance.overrides.saved.label,'Keep this');
 const state=json(vm.runInContext('readWorkState(instance)',context));
 assert.equal(state.pending,true);assert.equal(state.percent,0);assert.equal(state.total,0);
 console.log('PASS pending products preserve saved answers and do not fabricate work or completion');
}

async function productsOnlyRefresh(){
 const selected={id:'position',checks:{done:true}},calls=[];
 const context=vm.createContext({pdf:{},protocolDefs:{old:true},
  recalcAll:async()=>calls.push('recalculate'),selectedInstance:()=>selected,
  el:{protocol:{open:true},timeDialog:{open:true}},
  syncProtocolProgress:()=>calls.push('progress'),renderChecklist:async()=>calls.push('checklist'),
  renderTimeReport:async()=>calls.push('time'),setState:()=>calls.push('status'),
  analyze:()=>{throw Error('product updates must not reopen the document')}
 });
 vm.runInContext(between('async function refreshReadWork(){','function updateReadProductsAction(){'),context);
 assert.equal(await vm.runInContext('refreshReadWork()',context),true);
 assert.deepEqual(calls,['recalculate','progress','checklist','time','status']);
 assert.deepEqual(selected.checks,{done:true});assert.deepEqual(json(context.protocolDefs),{});
 console.log('PASS product-only refresh updates checklist and progress without analyze/rematching');
}

(async()=>{await reviewedIndex();await pendingWork();await productsOnlyRefresh()})().catch(error=>{console.error(error);process.exitCode=1});
