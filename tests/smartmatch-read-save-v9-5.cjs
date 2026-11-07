/* Exercise real save functions with delayed native file pickers and failing
 * writable streams. Generated PDF bytes only; no customer drawings. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {PDFDocument}=require('../vendor/pdf-lib.min.js');
const revision=process.env.SAVE_REVISION||'9-5';
const source=fs.readFileSync(require('node:path').join(__dirname,'../smartmatch-read-test-main-v'+revision+'.js'),'utf8');
const functionText=(name,next)=>source.slice(source.indexOf('async function '+name+'('),source.indexOf(next,source.indexOf('async function '+name+'(')));
function environment(extra={}){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,textContent:'',hidden:false,open:true,dataset:{}});return nodes.get(id)};
 const context=vm.createContext({Blob,File,Uint8Array,console,Promise,document:{getElementById:node},bytes:new Uint8Array([1]),smartExportBytes:null,
  chosenProjectExportName:()=> 'generated.pdf',currentSmartExportFile:()=>null,smartExportMessage:(message,level)=>{context.message=message;context.level=level},
  desktopSavePickerAvailable:()=>true,prepareSmartExport:async()=>false,window:{},currentFileName:'generated.pdf',setState:()=>{},...extra});
 vm.runInContext(functionText('writePdfToHandle','let smartExportBytes='),context);
 return context;
}
function handle(initial=new Blob(['original'])){
 let file=initial,pending=null;
 const state={opens:0,writes:0,closes:0,aborts:0};
 return {state,getFile:async()=>file,async createWritable(){state.opens++;pending=new Blob([]);return {
  async write(blob){state.writes++;pending=blob},async close(){state.closes++;file=pending},async abort(){state.aborts++}
 }}};
}
(async()=>{
 const pdf=await PDFDocument.create();pdf.addPage();const data=await pdf.save(),file=new File([data],'generated.pdf',{type:'application/pdf'});
 let c=environment(),h=handle();
 await assert.rejects(()=>c.writePdfToHandle(h,new Uint8Array()),/tom/);
 assert.equal(h.state.opens,0,'empty bytes are refused before the original file can be touched');
 await c.writePdfToHandle(h,file);assert.equal((await h.getFile()).size,file.size);await PDFDocument.load(await (await h.getFile()).arrayBuffer());
 console.log('PASS nonempty verified file writes and reopens; empty data cannot start a write');

 let close=0,abort=0;
 await assert.rejects(()=>c.writePdfToHandle({createWritable:async()=>({write:async()=>{throw Error('disk full')},close:async()=>{close++},abort:async()=>{abort++}})},file),/disk full/);
 assert.equal(close,0,'a failed write never commits the empty/truncated stream');assert.equal(abort,1);
 await assert.rejects(()=>c.writePdfToHandle({createWritable:async()=>({write:async()=>{},close:async()=>{},abort:async()=>{}}),getFile:async()=>new File([],'empty.pdf')},file),/tom|ofullständig/);
 await assert.rejects(()=>c.writePdfToHandle({createWritable:async()=>({write:async()=>{},close:async()=>{}}),getFile:async()=>new File([new Uint8Array(file.size)],file.name)},file),/läsas tillbaka/);
 console.log('PASS failed writes abort; empty, truncated and corrupted disk copies are rejected');
 const bigFile=new File([data,new Uint8Array(2*1024*1024),new Uint8Array([87])],'large.pdf');
 h=handle();await c.writePdfToHandle(h,bigFile);assert.equal((await h.getFile()).size,bigFile.size);
 await assert.rejects(()=>c.writePdfToHandle({createWritable:async()=>({write:async()=>{},close:async()=>{}}),getFile:async()=>new File([bigFile.slice(0,-1),new Uint8Array([88])],bigFile.name)},bigFile),/läsas tillbaka/);
 console.log('PASS disk comparison covers the final partial chunk of a large file');

 let picks=0,builds=0;
 c=environment({chooseDesktopSaveHandle:async()=>{picks++;return handle()},prepareSmartExport:async()=>{builds++;return false}});
 vm.runInContext(functionText('saveSmartPdfNow','function previewSmartExport'),c);
 await c.saveSmartPdfNow();assert.equal(picks,0,'a failed/not-yet-ready build must not open a picker that creates a zero-byte placeholder');assert.equal(builds,1);
 console.log('PASS Windows picker stays closed while export is unavailable');

 let releasePicker;h=handle();
 c=environment({smartExportBytes:data,currentSmartExportFile:()=>file,chooseDesktopSaveHandle:()=>new Promise(resolve=>{releasePicker=resolve}),smartWorkspaceDirty:true,workspaceId:'work',fileKey:'hash'});
 vm.runInContext(functionText('saveSmartExportAs','async function saveSmartExportLocal'),c);
 const saving=c.saveSmartExportAs();c.smartExportBytes=null;releasePicker(h);await saving;
 assert.equal((await h.getFile()).size,file.size,'closing/releasing export while picker waits cannot change the captured PDF');
 assert.deepEqual(new Uint8Array(await (await h.getFile()).arrayBuffer()),data);
 console.log('PASS a delayed Save as picker writes its captured PDF after the export cache is released');

 let releasePermission;h=handle();
 c=environment({smartExportBytes:data,currentSmartExportFile:()=>file,currentFileHandle:h,ensureHandleWritePermission:()=>new Promise(resolve=>{releasePermission=resolve}),smartWorkspaceDirty:true,workspaceId:'work',fileKey:'hash'});
 vm.runInContext(functionText('saveSmartExportObject','async function saveSmartExportAs'),c);
 const direct=c.saveSmartExportObject();c.smartExportBytes=null;releasePermission(true);await direct;
 assert.equal((await h.getFile()).size,file.size,'permission prompt cannot release the file being saved');
 assert.equal(c.level,'good');
 console.log('PASS direct Save also retains immutable PDF bytes during permission requests');
})().catch(error=>{console.error(error);process.exitCode=1});
