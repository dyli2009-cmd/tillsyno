/* Real TEST 9.85 save functions with synthetic PDFs and delayed native disk
 * operations. A saved snapshot must never become another project's file or
 * mark changes made after the snapshot as saved. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PDFDocument}=require('../vendor/pdf-lib.min.js');
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-read-test-main-v9-85.js'),'utf8');
function section(start,end){
 const begin=source.indexOf(start),finish=source.indexOf(end,begin);
 assert(begin>=0&&finish>begin,'production source boundaries exist: '+start);
 return source.slice(begin,finish);
}
const saveFunctions={
 primary:section('async function saveSmartPdfNow(', 'function previewSmartExport('),
 as:section('async function saveSmartExportAs(', 'async function saveSmartExportLocal('),
 object:section('async function saveSmartExportObject(', 'async function saveSmartExportAs(')
};
const invoke={primary:'saveSmartPdfNow',as:'saveSmartExportAs',object:'saveSmartExportObject'};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function environment(extra={}){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,textContent:'',hidden:false,open:true,dataset:{}});return nodes.get(id);};
 const context=vm.createContext({Blob,File,Uint8Array,Promise,console:{...console,error(){}},document:{getElementById:node},
  bytes:new Uint8Array([1]),workspaceId:'project-A',fileKey:'hash-A',smartExportProjectEpoch:1,smartExportRevision:7,
  smartExportBytes:null,currentFileHandle:null,smartWorkspaceDirty:true,currentFileName:'generated-A.pdf',
  chosenProjectExportName:()=> 'generated-A.pdf',currentSmartExportFile:()=>null,
  smartExportMessage:(message,level)=>{context.message=message;context.level=level;},
  setState:message=>{context.status=message;},desktopSavePickerAvailable:()=>true,prepareSmartExport:async()=>false,
  saveSmartExportLocal:async file=>{context.localSaves++;context.deliveredFile=file;},localSaves:0,
  ensureHandleWritePermission:async()=>true,window:{SmartMatchSession:{markPdfSaved:async()=>{context.draftDeletes++;}}},draftDeletes:0,
  ...extra});
 vm.runInContext(section('async function writePdfToHandle(', 'let smartExportBytes='),context);
 vm.runInContext(section('function smartExportOwner(){', 'function invalidateSmartProjectExport('),context);
 vm.runInContext(section('function fileStem(', 'async function deliverProjectFile('),context);
 vm.runInContext(section('function projectPdfCopy(', 'async function saveSmartPdfNow('),context);
 for(const script of Object.values(saveFunctions))vm.runInContext(script,context);
 return context;
}
function handle(initial=new Blob(['unchanged original']),options={}){
 let file=initial,pending=null;
 const state={opens:0,writes:0,closes:0,aborts:0};
 return {name:'generated-A.pdf',state,getFile:async()=>file,async createWritable(){
  state.opens++;pending=new Blob([]);return {
   async write(blob){state.writes++;pending=blob;options.entered?.resolve();if(options.pause)await options.pause.promise;},
   async close(){state.closes++;file=pending;},async abort(){state.aborts++;}
  };
 }};
}
function replaceProject(context){
 const replacementHandle={name:'project-B.pdf'};
 context.bytes=new Uint8Array([2]);context.workspaceId='project-B';context.fileKey='hash-B';
 context.smartExportProjectEpoch++;context.smartExportRevision++;context.currentFileHandle=replacementHandle;
 context.smartWorkspaceDirty=true;context.message='Project B is open';context.level='neutral';context.status='Project B';
 return replacementHandle;
}
function assertReplacementUntouched(context,replacementHandle){
 assert.equal(context.currentFileHandle,replacementHandle,'the previous save cannot attach its handle to project B');
 assert.equal(context.smartWorkspaceDirty,true,'project B remains unsaved');
 assert.equal(context.message,'Project B is open','the previous save cannot overwrite project B status');
 assert.equal(context.status,'Project B');assert.equal(context.level,'neutral');assert.equal(context.draftDeletes,0);
}
async function delayedStart(route,file){
 const prompt=deferred(),disk=handle();
 const context=environment({currentSmartExportFile:()=>file,currentFileHandle:route==='object'?disk:null,
  chooseDesktopSaveHandle:()=>prompt.promise,ensureHandleWritePermission:()=>prompt.promise});
 const saving=context[invoke[route]]();
 return {context,disk,saving,release:()=>prompt.resolve(route==='object'?true:disk)};
}
(async()=>{
 const pdf=await PDFDocument.create();pdf.addPage();const data=await pdf.save(),file=new File([data],'generated-A.pdf',{type:'application/pdf'});
 let context=environment(),disk=handle();
 await assert.rejects(()=>context.writePdfToHandle(disk,new Uint8Array()),/tom/);assert.equal(disk.state.opens,0);
 await context.writePdfToHandle(disk,file);assert.equal((await disk.getFile()).size,file.size);
 await PDFDocument.load(await(await disk.getFile()).arrayBuffer());
 console.log('PASS nonempty PDF writes and reopens; empty bytes cannot touch the original');

 let closes=0,aborts=0;
 await assert.rejects(()=>context.writePdfToHandle({createWritable:async()=>({write:async()=>{throw Error('disk full');},close:async()=>{closes++;},abort:async()=>{aborts++;}})},file),/disk full/);
 assert.equal(closes,0);assert.equal(aborts,1);
 await assert.rejects(()=>context.writePdfToHandle({createWritable:async()=>({write:async()=>{},close:async()=>{}}),getFile:async()=>new File([],'empty.pdf')},file),/tom|ofullständig/);
 await assert.rejects(()=>context.writePdfToHandle({createWritable:async()=>({write:async()=>{},close:async()=>{}}),getFile:async()=>new File([new Uint8Array(file.size)],file.name)},file),/läsas tillbaka/);
 const bigFile=new File([data,new Uint8Array(2*1024*1024),new Uint8Array([87])],'large.pdf');
 disk=handle();await context.writePdfToHandle(disk,bigFile);assert.equal((await disk.getFile()).size,bigFile.size);
 await assert.rejects(()=>context.writePdfToHandle({createWritable:async()=>({write:async()=>{},close:async()=>{}}),getFile:async()=>new File([bigFile.slice(0,-1),new Uint8Array([88])],bigFile.name)},bigFile),/läsas tillbaka/);
 console.log('PASS write failure aborts; empty, corrupt and final-partial-chunk disk readbacks fail');

 let picks=0,builds=0;
 context=environment({chooseDesktopSaveHandle:async()=>{picks++;return handle();},prepareSmartExport:async()=>{builds++;return false;}});
 await context.saveSmartPdfNow();assert.equal(picks,0);assert.equal(builds,1);
 console.log('PASS Windows picker stays closed until verified export bytes are ready');

 for(const route of Object.keys(invoke)){
  // Merely dismissing the export sheet releases its byte cache, not the
  // immutable File captured for a save already accepted by the user.
  let pending=await delayedStart(route,file);pending.context.smartExportBytes=null;pending.release();await pending.saving;
  assert.equal(pending.disk.state.closes,1);assert.deepEqual(new Uint8Array(await(await pending.disk.getFile()).arrayBuffer()),data);
  assert.equal(pending.context.smartWorkspaceDirty,false);assert.equal(pending.context.level,'good');
  assert.equal(pending.context.draftDeletes,0,'source-PDF local recovery must retain its separate work draft');

  pending=await delayedStart(route,file);const replacement=replaceProject(pending.context);pending.release();await pending.saving;
  assert.equal(pending.disk.state.opens,0,'switching projects during '+route+' picker/permission cannot start an old write');
  assertReplacementUntouched(pending.context,replacement);

  pending=await delayedStart(route,file);pending.context.smartExportRevision++;pending.release();await pending.saving;
  assert.equal(pending.disk.state.opens,0,'new edits while '+route+' picker/permission waits require a fresh snapshot');
  assert.equal(pending.context.smartWorkspaceDirty,true);

  const entered=deferred(),pause=deferred();disk=handle(undefined,{entered,pause});
  context=environment({currentSmartExportFile:()=>file,currentFileHandle:route==='object'?disk:null,chooseDesktopSaveHandle:async()=>disk});
  const writing=context[invoke[route]]();await entered.promise;const nextHandle=replaceProject(context);pause.resolve();await writing;
  assert.equal(disk.state.closes,1,'an accepted '+route+' write completes its captured file');
  assert.deepEqual(new Uint8Array(await(await disk.getFile()).arrayBuffer()),data);assertReplacementUntouched(context,nextHandle);

  const editedEntered=deferred(),editedPause=deferred();disk=handle(undefined,{entered:editedEntered,pause:editedPause});
  context=environment({currentSmartExportFile:()=>file,currentFileHandle:route==='object'?disk:null,chooseDesktopSaveHandle:async()=>disk});
  const olderSnapshot=context[invoke[route]]();await editedEntered.promise;context.smartExportRevision++;context.smartWorkspaceDirty=true;editedPause.resolve();await olderSnapshot;
  assert.equal(disk.state.closes,1);assert.deepEqual(new Uint8Array(await(await disk.getFile()).arrayBuffer()),data);
  assert.equal(context.smartWorkspaceDirty,true,'edits made during '+route+' write cannot be marked saved');assert.notEqual(context.level,'good');
  assert.equal(context.draftDeletes,0);
  console.log('PASS '+route+': captured PDF survives cache release; project switches and new edits cannot hijack files, saved state or local drafts');
 }

 for(const route of Object.keys(invoke)){
  const locked={name:'Original.pdf',createWritable:async()=>{throw new DOMException('locked','NoModificationAllowedError');}};
  const c=environment({DOMException,currentSmartExportFile:()=>file,currentFileHandle:route==='object'?locked:null,chooseDesktopSaveHandle:async()=>locked});
  await c[invoke[route]]();assert.equal(c.localSaves,1);assert.equal(c.deliveredFile.name,'generated-A-kopia.pdf');assert.deepEqual(new Uint8Array(await c.deliveredFile.arrayBuffer()),data);assert.equal(c.smartWorkspaceDirty,true);assert.equal(c.currentFileHandle,null);assert.match(c.message,/låst/);assert.notEqual(c.level,'good');
  for(const name of ['AbortError','QuotaExceededError']){
   const failed={createWritable:async()=>{throw new DOMException('failure',name);}};
   const c2=environment({DOMException,currentSmartExportFile:()=>file,currentFileHandle:route==='object'?failed:null,chooseDesktopSaveHandle:async()=>failed});await c2[invoke[route]]();assert.equal(c2.localSaves,0,name+' must not silently fall back');assert.equal(c2.smartWorkspaceDirty,true);
  }
  const gate=deferred(),entered=deferred(),late={createWritable:async()=>{entered.resolve();await gate.promise;throw new DOMException('locked late','NoModificationAllowedError');}};
  const stale=environment({DOMException,currentSmartExportFile:()=>file,currentFileHandle:route==='object'?late:null,chooseDesktopSaveHandle:async()=>late});
  const saving=stale[invoke[route]]();await entered.promise;stale.smartExportRevision++;gate.resolve();await saving;assert.equal(stale.localSaves,0,'stale revision cannot download an older snapshot');
 }
 console.log('PASS: locked primary/save-as/original routes deliver byte-identical named copies, retain dirty state, clear locked handles, and never fall back on cancellation, quota errors or stale revisions.');
})().catch(error=>{console.error(error);process.exitCode=1;});
