'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const main=fs.readFileSync('smartmatch-read-test-main-v9-82.js','utf8');
const session=fs.readFileSync('smartmatch-read-test-session-v9-82.js','utf8');
function source(text,start,end){return text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));}
function queueHarness(){
 const commits=[],statuses=[],timers=new Map();let id=0,gate=null,fail=false;
 const ctx=vm.createContext({console:{error(){}},Date,Promise,setTimeout(fn,ms){timers.set(++id,{fn,ms});return id},clearTimeout(id){timers.delete(id)},reportStatus:(...s)=>statuses.push(s),draftTransaction:async(mode,op)=>{if(gate)await gate;if(fail){fail=false;throw Error('quota')}return op({put:v=>commits.push(structuredClone(v))});}});
 vm.runInContext('let pendingDraft=null,draftTimer=null,draftChain=Promise.resolve(),dismissRecovery=null;'+source(session,' let draftWriter=null;',' async function offerDraftRestore(')+';globalThis.api={queueDraft,flush:writePendingDraft};',ctx);
 return {api:ctx.api,commits,statuses,timers,setGate:p=>gate=p,fail:()=>fail=true};
}
const edit=n=>({hash:'project-A',baseRevision:1,payload:{checks:{door:n}}});
(async()=>{
 let h=queueHarness();h.api.queueDraft(edit(1));h.api.queueDraft(edit(2));
 assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].ms,250);
 assert.equal(await h.api.flush(),true);assert.equal(h.commits[0].payload.checks.door,2);
 assert.equal(h.timers.size,0);assert.equal(h.statuses.at(-1)[0],'✓ Arbetsändringar sparade på enheten');
 // An edit arriving while IndexedDB is committing must also be committed.
 h=queueHarness();let release;h.setGate(new Promise(r=>release=r));h.api.queueDraft(edit(1));const pending=h.api.flush();h.api.queueDraft(edit(2));
 assert.equal(h.api.flush(),pending);assert(!h.statuses.some(s=>s[0].startsWith('✓')));release();assert.equal(await pending,true);
 assert.deepEqual(h.commits.map(v=>v.payload.checks.door),[1,2]);
 // Failed older commit cannot overwrite a more recent pending edit.
 h=queueHarness();h.setGate(new Promise(r=>release=r));h.fail();h.api.queueDraft(edit(1));const failed=h.api.flush();h.api.queueDraft(edit(3));release();
 assert.equal(await failed,false);assert.equal(h.statuses.at(-1)[1],'error');h.setGate(null);assert.equal(await h.api.flush(),true);assert.equal(h.commits.at(-1).payload.checks.door,3);
 // Failed last edit remains retryable.
 h=queueHarness();h.fail();h.api.queueDraft(edit(4));assert.equal(await h.api.flush(),false);assert.equal(await h.api.flush(),true);assert.equal(h.commits[0].payload.checks.door,4);
 // Opening the real Save dialog with a 100 MiB source must never start PDF work.
 const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{disabled:true,dataset:{},value:'',textContent:'',removeAttribute(){},closest(){return {dataset:{}}},showModal(){this.open=true}});return elements.get(id)}
 let exports=0,flushes=0;
 const ctx=vm.createContext({bytes:new Uint8Array(100*1024*1024),document:{getElementById:element},window:{SmartMatchSession:{flushDraft:async()=>{flushes++;return true}}},closeSaveMenu(){},releaseSmartExport(){},originalProjectPdfName:()=> 'large.pdf',prettyPdfSize:()=> '100 MB',smartFileSizeReviewShowSource(){},smartExportMessage(){},pauseSmartExportRendering(){throw Error('must not pause')},prepareSmartExport(){exports++},setTimeout(){throw Error('must not schedule PDF export')}});
 vm.runInContext(source(main,"function openSmartExportDialog(",'function inspectCurrentProjectPdf(')+';openSmartExportDialog();',ctx);
 assert.equal(exports,0);assert.equal(flushes,1);assert.equal(element('smartExportBuild').disabled,false);assert.equal(element('smartExportBuild').textContent,'Förbered PDF');
 // Export is still explicit and retains the existing read-back verification.
 assert(main.includes('const saved=await window.SmartMatchSession?.flushDraft?.();'));
 assert(main.indexOf('if(saved===false)throw')<main.indexOf('    await trimSmartExportMemory();'));
 assert(main.includes('await verifyPortableProjectPdf(data,snapshot,exportReport)'));
 console.log('PASS: bounded autosave, coalescing, in-flight edits, commit status, failure/retry, 100 MiB Save dialog without export, export backup guard.');
})().catch(e=>{console.error(e);process.exitCode=1});

