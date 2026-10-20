'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const main=fs.readFileSync('smartmatch-read-test-main-v9-83.js','utf8');
function source(start,end){const a=main.indexOf(start),b=main.indexOf(end,a);assert(a>=0&&b>a);return main.slice(a,b)}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness({beforeBuildReport=false,beforeVerifyReport=false}={}){
 const elements=new Map(),calls=[],messages=[],failures=[];let active=0,maximum=0,progressGate=null;
 function element(id){
  if(!elements.has(id))elements.set(id,{open:false,disabled:false,hidden:true,dataset:{},textContent:'',value:'',
   removeAttribute(){},closest(){return {dataset:{}}},showModal(){this.open=true}});
  return elements.get(id);
 }
 function heavy(phase,details){
  let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});
  const call={phase,...details,done:false,resolve(value){this.done=true;resolve(value)},reject(error){this.done=true;reject(error)}};
  calls.push(call);active++;maximum=Math.max(maximum,active);
  return promise.finally(()=>{active--});
 }
 const env={
  console:{error(){}},Promise,DOMException,Uint8Array,URL:{revokeObjectURL(){}},
  bytes:new Uint8Array([1]),workspaceId:'project-A',smartExportRevision:0,smartExportProjectEpoch:0,
  smartExportCached:null,smartExportTask:null,smartExportBytesVersion:-1,DRAWING_IS_IOS:true,
  document:{getElementById:element},
  window:{SmartMatchSession:{flushDraft:async()=>true},SmartMatchReadExportProgress:{reset(){},start(options){
   const report=async(...args)=>{
    if(options.valid())messages.push({progress:args});
    const gate=progressGate;progressGate=null;if(gate)await gate;
   };
   report.fail=message=>failures.push(message);return report;
  }}},
  closeSaveMenu(){},originalProjectPdfName:()=> 'project.pdf',prettyPdfSize:n=>String(n),smartFileSizeReviewShowSource(){},smartFileSizeReviewSetSaving(){},
  resumeSmartExportRendering(){},trimSmartExportMemory:async()=>{},
  makeProjectPayload:()=>({workspace:env.workspaceId,revision:env.smartExportRevision}),
  buildPortableProjectPdf:async(payload,report)=>{
   if(beforeBuildReport)await report(3,'Läser original-PDF');
   await heavy('build',{payload,report});return new Uint8Array([payload.revision+1]);
  },
  verifyPortableProjectPdf:async(data,payload,report)=>{
   if(beforeVerifyReport)await report(82,'Öppnar den skapade PDF:en för kontroll');
   await heavy('verify',{data,payload,report});return {automations:0,gsLinks:0,checks:0};
  },
  smartExportMessage:(message,level)=>messages.push({message,level})
 };
 const ctx=vm.createContext(env);
 vm.runInContext(source('let smartExportBytes=null,','function pauseSmartExportRendering(')+
  source('function releaseSmartExport(){','function prettyPdfSize(')+
  source("function openSmartExportDialog(",'function inspectCurrentProjectPdf(')+
  source('async function prepareSmartExport(','async function saveSmartPdfNow(')+
  `;globalThis.api={prepare:prepareSmartExport,open:openSmartExportDialog,
    close(){document.getElementById('smartExportDialog').open=false;releaseSmartExport()},
    edit(){smartExportRevision++;smartExportCached=null},
    replace(){bytes=new Uint8Array([2]);workspaceId='project-B';invalidateSmartProjectExport()},
    state(){return {cached:smartExportCached,bytes:smartExportBytes,task:smartExportTask,busy:smartExportMemoryBusy}}};`,ctx);
 env.api.open();
 async function finish(){
  for(let i=0;i<12;i++){
   await tick();const pending=calls.filter(call=>!call.done);
   if(!pending.length){await tick();if(!calls.some(call=>!call.done))return}
   for(const call of pending)call.resolve();
  }
  throw Error('Export did not settle');
 }
 return {api:env.api,element,calls,messages,failures,finish,maximum:()=>maximum,active:()=>active,
  holdProgress(){let release;progressGate=new Promise(resolve=>{release=resolve});return release}};
}
(async()=>{
 // Multiple requests for one snapshot share a single build and verification.
 let h=harness();let first=h.api.prepare(),second=h.api.prepare();await tick();
 assert.equal(h.calls.length,1);await h.finish();assert.equal(await first,true);assert.equal(await second,true);
 assert.deepEqual(h.calls.map(c=>c.phase),['build','verify']);assert.equal(h.maximum(),1);

 // Edits invalidate an uninterruptible parse. Repeated requests for the newer
 // snapshot wait for it and share one current build/verification.
 h=harness();first=h.api.prepare();await tick();
 h.api.edit();
 second=h.api.prepare();const duplicate=h.api.prepare();await tick();
 assert.equal(h.calls.length,1);assert.equal(h.active(),1);assert.equal(h.api.state().cached,null);
 h.calls[0].resolve();await tick();assert.equal(h.calls.length,2);
 assert.equal(h.calls[1].payload.revision,1);
 await h.finish();assert.equal(await first,true);assert.equal(await second,true);assert.equal(await duplicate,true);assert.equal(h.maximum(),1);
 assert.equal(h.calls.filter(c=>c.phase==='verify').length,1);assert.equal(h.api.state().cached.version,1);

 // Repeated queued edits skip intermediate obsolete snapshots, without changing
 // the open dialog's run ID. Every waiter follows the latest valid revision.
 h=harness();first=h.api.prepare();await tick();h.api.edit();second=h.api.prepare();
 h.api.edit();const latest=h.api.prepare();await tick();assert.equal(h.calls.length,1);
 h.calls[0].resolve();await h.finish();assert.equal(await first,true);assert.equal(await second,true);
 assert.equal(await latest,true);assert.equal(h.calls.filter(c=>c.phase==='build').length,2);
 assert.equal(h.api.state().cached.version,2);assert.equal(h.maximum(),1);

 // Closing/reopening at the same revision must not adopt the old run's result.
 h=harness();first=h.api.prepare();await tick();h.api.close();h.api.open();second=h.api.prepare();await tick();
 assert.equal(h.calls.length,1);h.calls[0].resolve();await tick();assert.equal(await first,false);
 assert.equal(h.calls.length,2);assert.equal(h.api.state().cached,null);
 await h.finish();assert.equal(await second,true);assert.equal(h.maximum(),1);

 // The progress reporter yields to UI. Cancellation during that yield must stop
 // before the parser starts, rather than only after the whole parse finishes.
 h=harness({beforeBuildReport:true});let releaseProgress=h.holdProgress(),settled=false;
 first=h.api.prepare();first.then(()=>{settled=true});await tick();assert.equal(h.calls.length,0);
 h.api.close();h.api.open();second=h.api.prepare();releaseProgress();await tick();
 assert.equal(settled,true,'cancelled build must stop at the progress yield');
 assert.equal(await first,false);assert.equal(h.calls.length,1,'only the new run reaches the parser');
 await h.finish();assert.equal(await second,true);assert.equal(h.maximum(),1);

 // The same boundary protects the full read-back parser, retaining verification
 // for the new run while preventing an obsolete verifier from being allocated.
 h=harness({beforeVerifyReport:true});first=h.api.prepare();settled=false;first.then(()=>{settled=true});await tick();
 releaseProgress=h.holdProgress();h.calls[0].resolve();await tick();assert.equal(h.calls.length,1);
 h.api.close();h.api.open();second=h.api.prepare();releaseProgress();await tick();
 assert.equal(settled,true,'cancelled verification must stop at the progress yield');assert.equal(await first,false);
 assert.deepEqual(h.calls.map(c=>c.phase),['build','build']);
 await h.finish();assert.equal(await second,true);assert.equal(h.maximum(),1);
 assert.equal(h.calls.filter(c=>c.phase==='verify').length,1);

 // Switching projects during verification keeps the old verifier inside the lock.
 h=harness();first=h.api.prepare();await tick();h.calls[0].resolve();await tick();
 assert.equal(h.calls[1].phase,'verify');h.api.replace();second=h.api.prepare();await tick();
 assert.equal(h.calls.length,2);h.calls[1].resolve();await tick();assert.equal(await first,false);
 assert.equal(h.calls[2].payload.workspace,'project-B');assert.equal(h.api.state().cached,null);
 await h.finish();assert.equal(await second,true);assert.equal(h.maximum(),1);
 assert.equal(h.api.state().cached.owner.workspace,'project-B');

 // An edit during verification retains the old verifier inside the lock, then
 // rebuilds current work rather than adopting the obsolete verified bytes.
 h=harness();first=h.api.prepare();await tick();h.calls[0].resolve();await tick();
 assert.equal(h.calls[1].phase,'verify');h.api.edit();second=h.api.prepare();await tick();
 assert.equal(h.calls.length,2);h.calls[1].resolve();await tick();
 assert.equal(h.calls[2].phase,'build');assert.equal(h.calls[2].payload.revision,1);
 assert.equal(h.api.state().cached,null);await h.finish();
 assert.equal(await first,true);assert.equal(await second,true);assert.equal(h.maximum(),1);
 assert.equal(h.api.state().cached.version,1);

 // Stale failures neither poison the queue nor overwrite a newer dialog status.
 h=harness();first=h.api.prepare();await tick();h.api.close();h.api.open();second=h.api.prepare();await tick();
 h.calls[0].reject(Error('old parser failed'));await tick();assert.equal(await first,false);
 assert.equal(h.failures.length,0);assert.equal(h.calls.length,2);
 await h.finish();assert.equal(await second,true);assert.equal(h.maximum(),1);

 // Failure of an older revision in the same dialog also follows current work;
 // it must neither expose Retry nor overwrite the current status with an error.
 h=harness();first=h.api.prepare();await tick();h.api.edit();second=h.api.prepare();await tick();
 h.calls[0].reject(Error('obsolete revision failed'));await tick();assert.equal(h.failures.length,0);
 assert.equal(h.calls.length,2);await h.finish();
 assert.equal(await first,true);assert.equal(await second,true);assert.equal(h.maximum(),1);
 assert.equal(h.api.state().cached.version,1);

 // A current failure shows Retry; a subsequent attempt still builds and verifies.
 h=harness();first=h.api.prepare();await tick();h.calls[0].reject(Error('parser failed'));
 assert.equal(await first,false);assert.equal(h.element('smartExportRetry').hidden,false);
 assert.equal(h.failures.length,1);assert.equal(h.api.state().busy,0);
 second=h.api.prepare();await tick();assert.equal(h.calls.length,2);
 await h.finish();assert.equal(await second,true);assert.equal(h.maximum(),1);assert.equal(h.api.state().busy,0);
 console.log('PASS: one heavy export across repeated clicks, edits/revisions, skipped queued snapshots, close/reopen, project changes, stale/current failures and retry; cancellation at progress boundaries; stale buffers never become current.');
})().catch(error=>{console.error(error);process.exitCode=1});

