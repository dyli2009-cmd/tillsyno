import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import {createSourceBinding,inspectProjectPdf} from '../src/source-binding.mjs';
import {MAX_FILE_BYTES} from '../src/limits.mjs';
const require=createRequire(import.meta.url), PDFLib=require('../../vendor/pdf-lib.min.js');
const projectWriter=require('../../smartmatch-read-project-writer-v9-80.js');
const identity={accountKey:'tenant/account-A',userId:'technician-A'};
const source=(overrides={})=>({driveId:'drive-A',id:'item-A',parentId:'folder-A',name:'Samma namn.pdf',eTag:'"v1"',...identity,...overrides});
const routeInfo={
 smartmatch:['sharepoint-read-test.html','smartmatch','pwFile'],
 dorrservice:['sharepoint-app-test.html','','file'],
 'security-service':['sharepoint-security-test.html','control','securityFile'],
 'doorservice-all-in-one':['sharepoint-control-test.html','control','securityFile'],
 ce:['sharepoint-ce-test.html','smartmatch','ceOpenPdf'], drawing:['sharepoint-drawing-test.html','drawing','toolFile'],
};
async function pdfBytes({kind='smartmatch',id='project-A',revision=1,drawing=null,schema=6}={}){
 const P=PDFLib,doc=await P.PDFDocument.create();doc.addPage([300,400]);
 if(kind==='smartmatch'){
  const payload={schema,projectId:id,projectRevision:revision,instances:{},automationItems:[]};
  doc.catalog.set(P.PDFName.of('TillsynoSmartMatchV36Data'),P.PDFHexString.fromText(JSON.stringify(payload)));
 }else if(kind==='ce'){
  const payload={format:'Tillsyno CE-märkning TEST 60',schema:60,projectId:id,meta:{projectName:'Synthetic'},doors:[]};
  doc.catalog.set(P.PDFName.of('TillsynoCETestData'),doc.context.register(doc.context.flateStream(new TextEncoder().encode(JSON.stringify(payload)))));
 }else if(['dorrservice','security-service','doorservice-all-in-one'].includes(kind)){
  const payload={app:kind,version:3,project:{name:'Synthetic'},[kind==='dorrservice'?'doors':'items']:[]};
  const data=doc.context.register(doc.context.flateStream(new TextEncoder().encode(JSON.stringify(payload))));
  const original=doc.context.register(doc.context.flateStream(drawing||await pdfBytes({kind:'raw'})));
  doc.catalog.set(P.PDFName.of(kind==='dorrservice'?'DorrserviceWork':'SecurityServiceWork'),doc.context.register(doc.context.obj({Version:3,Data:data,Drawing:original})));
 }
 return new Uint8Array(await doc.save());
}
async function metadataPdf(value){
 const doc=await PDFLib.PDFDocument.create();doc.addPage([300,400]);
 doc.catalog.set(PDFLib.PDFName.of('TillsynoSmartMatchV36Data'),typeof value==='function'?value(doc):value);
 return new Uint8Array(await doc.save());
}
async function largeMetadataPdf({id='projekt-Åäö-😀',revision=1,schema=6}={}){
 const payload={schema,projectId:id,projectRevision:revision,instances:{},automationItems:[],readTestData:{rawTable:'Lås Åäö 😀 '.repeat(18000)}};
 assert.ok(JSON.stringify(payload).length>160000);
 return metadataPdf(await projectWriter.create(payload,PDFLib,async()=>{}));
}
const file=(bytes,name='Samma namn.pdf')=>new File([bytes],name,{type:'application/pdf'});
function environment(kind='smartmatch',{native=false,restoreStore,setup}={}){
 const [page,module,inputId]=routeInfo[kind],listeners=new Map(),nodes=new Map();
 const document={body:{dataset:{sharepointModule:module},hasAttribute:()=>true},
  getElementById:id=>nodes.get(id)||null,
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
  removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
 };
 const window={document,location:{pathname:'/tillsyno/'+page},Blob,File,crypto:webcrypto,PDFLib};
 const input={id:inputId,files:[]};nodes.set(inputId,input);nodes.set('ceWorkspace',{hidden:false});
 let runtime=null;
 setup?.(window,{get:()=>runtime,set:value=>{runtime=value;}});
 const binding=createSourceBinding({window,restoreStore,...(native?{}:{readActive:()=>runtime})});
 const emit=(type,target)=>{for(const fn of listeners.get(type)||[])fn({target});};
 const click=id=>emit('click',{closest:()=>({id})});
 const captureProject=()=>{click({smartmatch:'smartExportBuild',dorrservice:'exportBtn','security-service':'secSaveWork','doorservice-all-in-one':'secSaveWork',ce:'ceSavePdf',drawing:'pdfSaveConfirm'}[kind]);return binding.captureExport();};
 return {window,document,nodes,input,binding,emit,click,captureProject,setRuntime:value=>{runtime=value;},runtime:()=>runtime};
}
async function openCloud(env,bytes,metadata=source()){
 const f=file(bytes), files=[f];
 await env.binding.observeImport(env.input,files,[metadata]);
 env.input.files=files;env.emit('change',env.input);
 env.setRuntime({kind:'smartmatch',key:'workspace-A',session:null,bytes});
}
async function exportInfo(env,bytes,context,name='Annan exporttitel.pdf'){
 if(!context){env.click({smartmatch:'smartExportBuild',dorrservice:'exportBtn','security-service':'secSaveWork','doorservice-all-in-one':'secSaveWork',ce:'ceSavePdf',drawing:'pdfSaveConfirm'}[env.runtime()?.kind]||'ceSavePdf');context=env.binding.captureExport();}
 return env.binding.inspectExport({blob:file(bytes,name),name,context});
}
function tabStore(){
 const entries=new Map();
 return {entries,getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,String(value)),removeItem:key=>entries.delete(key)};
}
function smartEnvironment(store,options={}){
 const control={readResult:true,cacheResult:true,...options};
 const env=environment('smartmatch',{restoreStore:store,setup(window,state){
  window.SmartMatchAppBridge={
   isOpeningProject:()=>!!control.opening,
   async openReadFile(file){
    if(control.readError)throw control.readError;
    if(control.readResult===true)state.set({kind:'smartmatch',key:'workspace-A',session:null,bytes:new Uint8Array(await file.arrayBuffer())});
    return control.readResult;
   },
   async openCachedPdf(file,view){
    if(control.restoreError)throw control.restoreError;
    if(control.restoreResult===false)return false;
    state.set({kind:'smartmatch',key:control.restoreWorkspace||view.workspaceId||view.fileKey,session:null,
     bytes:control.restoreBytes||new Uint8Array(await file.arrayBuffer())});
    // The actual SmartMatch cache opener returns undefined after success.
   },
  };
  window.SmartMatchSession={cachePdf:async()=>control.cacheResult};
 }});
 return {...env,control,restore:(bytes,view={})=>env.window.SmartMatchAppBridge.openCachedPdf(file(bytes),{workspaceId:'workspace-A',fileKey:'base-pdf',...view})};
}
const references=store=>[...store.entries.values()].flatMap(text=>{try{const value=JSON.parse(text);return value?.version===1?[value]:[];}catch{return[];}});

test('opened working PDF binds exact driveItem; repeated saves refresh eTag and retain name independent of export name',async()=>{
 const env=environment(),original=await pdfBytes(),updated=await pdfBytes({revision:2});env.binding.setIdentity(identity);
 await openCloud(env,original);let info=await exportInfo(env,updated);
 assert.equal(info.projectExport,true);assert.equal(info.source.id,'item-A');assert.equal(info.source.eTag,'"v1"');assert.equal(info.isCurrent(),true);
 assert.equal(env.binding.confirmSave(info,source({eTag:'"v2"'})),true);
 info=await exportInfo(env,await pdfBytes({revision:3}));assert.equal(info.source.id,'item-A');assert.equal(info.source.name,'Samma namn.pdf');assert.equal(info.source.eTag,'"v2"');
 env.binding.uninstall();
});

test('large real 9.80 project metadata keeps the exact source and eTag across full-project saves',async()=>{
 const env=environment(),bytes=await largeMetadataPdf();env.binding.setIdentity(identity);await openCloud(env,bytes);
 assert.deepEqual(await inspectProjectPdf(bytes,{window:env.window,kind:'smartmatch'}),{kind:'smartmatch',projectId:'projekt-Åäö-😀'});
 for(const revision of [2,3]){
  const info=await exportInfo(env,await largeMetadataPdf({revision}));
  assert.equal(info.projectExport,true,'large read data is a full project, not a separate copy');
  assert.equal(info.isCurrent(),true);assert.equal(info.source.id,'item-A');assert.equal(info.source.name,'Samma namn.pdf');
  assert.equal(info.source.eTag,'"v'+(revision-1)+'"');
  assert.equal(env.binding.confirmSave(info,source({eTag:'"v'+revision+'"'})),true);
 }
 const wrong=await exportInfo(env,await largeMetadataPdf({id:'projekt-Åäö-😀-annat'}));
 assert.equal(wrong.projectExport,false);assert.equal(wrong.source,null);assert.equal(env.binding.confirmSave(wrong,source()),false);
 assert.equal((await exportInfo(env,bytes)).source.eTag,'"v3"','rejecting another project cannot replace the acknowledged source version');
 env.binding.uninstall();
});

test('a small source whose read metadata grows large on export remains the same project',async()=>{
 const env=environment(),id='projekt-Åäö-😀',bytes=await pdfBytes({id});env.binding.setIdentity(identity);await openCloud(env,bytes);
 const info=await exportInfo(env,await largeMetadataPdf({id,revision:2}));
 assert.equal(info.projectExport,true);assert.equal(info.source.id,'item-A');assert.equal(info.source.eTag,'"v1"');
 assert.equal(info.isCurrent(),true);env.binding.uninstall();
});

test('project strings preserve UTF-16 endianness and surrogate boundaries plus large literal/PDFDocEncoding text',async()=>{
 const env=environment(),prefix='{"schema":6,"projectId":"',id='x'.repeat(8191-prefix.length)+'😀-Åäö-'+ 'x'.repeat(150000);
 const json=prefix+id+'","instances":{},"automationItems":[]}',bigEndian=PDFLib.PDFHexString.fromText(json).asString();
 const littleEndian='FFFE'+bigEndian.slice(4).replace(/([0-9a-f]{2})([0-9a-f]{2})/gi,'$2$1');
 // The first surrogate is the final UTF-16 code unit in a decoding block.
 for(const encoded of [PDFLib.PDFHexString.of(bigEndian),PDFLib.PDFHexString.of(littleEndian),PDFLib.PDFString.of(Buffer.from(bigEndian,'hex').toString('latin1'))]){
  assert.deepEqual(await inspectProjectPdf(await metadataPdf(encoded),{window:env.window,kind:'smartmatch'}),{kind:'smartmatch',projectId:id});
 }
 const plainId='x'.repeat(8192-prefix.length)+'þÿ'+ 'x'.repeat(150000),plain=prefix+plainId+'","instances":{},"automationItems":[]}';
 // The byte pair FE FF inside PDFDocEncoding must not start a new UTF-16 string.
 for(const encoded of [PDFLib.PDFHexString.of(Buffer.from(plain,'latin1').toString('hex')),PDFLib.PDFString.of(plain)]){
  assert.deepEqual(await inspectProjectPdf(await metadataPdf(encoded),{window:env.window,kind:'smartmatch'}),{kind:'smartmatch',projectId:plainId});
 }
 env.binding.uninstall();
});

test('malformed project string types, UTF-16, JSON and stream bytes cannot authorize an update or raw-project fallback',async()=>{
 const id='smartmatch-v35-workspace-A',valid=await pdfBytes({id});
 const invalid=[
  PDFLib.PDFHexString.of('FEFF007'),PDFLib.PDFHexString.of('FFFE7B'),
  PDFLib.PDFHexString.of('FEFF007Z'),PDFLib.PDFString.of('\xFE\xFF\x00'),
  PDFLib.PDFHexString.fromText('{"schema":6,'),
  ...['null','false','0','""','[]'].map(value=>PDFLib.PDFHexString.fromText(value)),
  doc=>doc.context.obj({schema:6,projectId:id,instances:{},automationItems:[]}),
  doc=>doc.context.register(doc.context.flateStream(new Uint8Array([123,34,120,34,58,34,255,34,125]))),
 ];
 for(const encoded of invalid){
  const bytes=await metadataPdf(encoded),env=environment();env.binding.setIdentity(identity);await openCloud(env,valid);
  const badOutput=await exportInfo(env,bytes);assert.equal(badOutput.projectExport,false);assert.equal(badOutput.source,null);
  assert.equal(env.binding.confirmSave(badOutput,source()),false);
  await openCloud(env,bytes);
  const badSource=await exportInfo(env,valid);assert.equal(badSource.projectExport,false);assert.equal(badSource.source,null);
  assert.equal(env.binding.confirmSave(badSource,source()),false);env.binding.uninstall();
 }
});

test('large future-schema metadata still fails closed for the source and the completed export',async()=>{
 const id='smartmatch-v35-workspace-A';
 for(const [sourceSchema,outputSchema]of [[7,6],[6,7],[7,7]]){
  const env=environment();env.binding.setIdentity(identity);await openCloud(env,await largeMetadataPdf({id,schema:sourceSchema}));
  const info=await exportInfo(env,await largeMetadataPdf({id,schema:outputSchema}));
  assert.equal(info.projectExport,false);assert.equal(info.source,null);assert.equal(env.binding.confirmSave(info,source()),false);
  env.binding.uninstall();
 }
});

test('first local project may connect after export; receipt binds the created copy for the next Save',async()=>{
 const env=environment(),bytes=await pdfBytes();env.setRuntime({kind:'smartmatch',key:'workspace-A',session:null,bytes});
 const context=env.captureProject(),info=await exportInfo(env,bytes,context);
 assert.equal(info.projectExport,true);assert.equal(info.source,null);
 env.binding.setIdentity(identity);assert.equal(info.isCurrent(),true);
 assert.equal(env.binding.confirmSave(info,source({id:'new-copy',name:'Valt kopienamn.pdf',eTag:'"copy-1"'})),true);
 const next=await exportInfo(env,bytes,env.captureProject(),'Gammalt lokalt namn.pdf');
 assert.equal(next.source.id,'new-copy');assert.equal(next.source.name,'Valt kopienamn.pdf');
});

test('filename equality cannot authorize another project PDF, report, diagnostic, image or archive',async()=>{
 const env=environment(),bytes=await pdfBytes();env.binding.setIdentity(identity);await openCloud(env,bytes);
 for(const [blob,name]of [[file(await pdfBytes({id:'project-B'})),'Samma namn.pdf'],[file(await pdfBytes({kind:'raw'})),'Samma namn.pdf'],[new Blob(['{}']),'Samma namn.json'],[new Blob(['png']),'Samma namn.png'],[new Blob(['zip']),'Samma namn.zip']]){
  const info=await env.binding.inspectExport({blob,name,context:env.captureProject()});
  assert.equal(info.projectExport,false);assert.equal(info.source,null);assert.equal(env.binding.confirmSave(info,source()),false);
 }
 const valid=await exportInfo(env,bytes);assert.equal(valid.source.id,'item-A','separate reports do not unbind the active project');
});

test('an original-PDF copy or attached project cannot update even with identical project catalogue and name',async()=>{
 const env=environment(),bytes=await pdfBytes();env.binding.setIdentity(identity);await openCloud(env,bytes);
 for(const action of ['pwSavePdfCopy','slrAttachmentDownload','diagnosticDownload']){
  env.click(action);
  const info=await env.binding.inspectExport({blob:file(bytes),name:'Samma namn.pdf',context:env.binding.captureExport()});
  assert.equal(info.projectExport,false);assert.equal(info.source,null);assert.equal(env.binding.confirmSave(info,source()),false);
 }
 assert.equal((await exportInfo(env,bytes)).source.id,'item-A');
});

test('local primary-file selection clears source even for identical bytes/name; unrelated attachment input preserves it',async()=>{
 const env=environment(),bytes=await pdfBytes();env.binding.setIdentity(identity);await openCloud(env,bytes);
 env.emit('change',{id:'pwProjectLogo',files:[file(bytes)]});assert.equal((await exportInfo(env,bytes)).source.id,'item-A');
 env.input.files=[file(bytes)];env.emit('change',env.input);
 assert.equal((await exportInfo(env,bytes)).source,null);
});

test('active workspace changes and queued pre-save exports cannot update the source',async()=>{
 const env=environment(),bytes=await pdfBytes();env.binding.setIdentity(identity);await openCloud(env,bytes);
 const stale=env.captureProject(),first=await exportInfo(env,bytes);
 assert.equal(env.binding.confirmSave(first,source({eTag:'"v2"'})),true);
 const queued=await exportInfo(env,bytes,stale);assert.equal(queued.source,null);assert.equal(queued.isCurrent(),false);
 const context=env.captureProject();env.setRuntime({kind:'smartmatch',key:'workspace-B',session:null,bytes:await pdfBytes({id:'project-B'})});
 const old=await exportInfo(env,bytes,context);assert.equal(old.source,null);assert.equal(old.isCurrent(),false);
 assert.equal(env.binding.confirmSave(old,source()),false);
});

test('account/user change or disconnect invalidates old tickets and source',async()=>{
 for(const next of [{accountKey:'tenant/account-B',userId:'technician-A'},{accountKey:'tenant/account-A',userId:'technician-B'},{accountKey:null,userId:null}]){
  const env=environment(),bytes=await pdfBytes();env.binding.setIdentity(identity);await openCloud(env,bytes);const info=await exportInfo(env,bytes);
  env.binding.setIdentity(next);assert.equal(info.isCurrent(),false);assert.equal(env.binding.confirmSave(info,source()),false);
  assert.equal((await exportInfo(env,bytes)).source,null);
 }
});

test('import intent must match active source bytes; rejected/newer content and incomplete metadata never bind',async()=>{
 for(const item of [source({eTag:''}),source({accountKey:'tenant/other'}),source()]){
  const env=environment(),bytes=await pdfBytes();env.binding.setIdentity(identity);await openCloud(env,bytes,item);
  if(item.eTag&&item.accountKey===identity.accountKey)env.setRuntime({...env.runtime(),bytes:await pdfBytes({revision:99})});
  assert.equal((await exportInfo(env,bytes)).source,null);
 }
});

test('raw local SmartMatch project can create a cloud project; expected module project ID is required',async()=>{
 const env=environment(),bytes=await pdfBytes({kind:'raw'});env.setRuntime({kind:'smartmatch',key:'raw-key',session:null,bytes});
 const wrong=await exportInfo(env,await pdfBytes({id:'something-else'}));assert.equal(wrong.projectExport,false);
 const valid=await exportInfo(env,await pdfBytes({id:'smartmatch-v35-raw-key'}));assert.equal(valid.projectExport,true);assert.equal(valid.source,null);
});

test('Prepare drawing preserves only the delivered single cloud File through one bridge handoff',async()=>{
 const store=tabStore(),env=smartEnvironment(store),bytes=await pdfBytes({kind:'raw'}),input={id:'rtMultiFiles',files:[file(bytes)]};
 env.binding.setIdentity(identity);
 assert.equal(await env.binding.observeImport(input,input.files,[source()]),true);env.emit('change',input);
 assert.equal(await env.window.SmartMatchAppBridge.openReadFile(input.files[0],{readTestIntent:'prepare'}),true);
 assert.equal(references(store)[0].source.eTag,'"v1"','a successful preparation keeps the imported version before the first export');
 const output=await pdfBytes({id:'smartmatch-v35-workspace-A'}),info=await exportInfo(env,output);
 assert.equal(info.projectExport,true);assert.equal(info.source.id,'item-A');
 await env.window.SmartMatchAppBridge.openReadFile(input.files[0],{readTestIntent:'prepare'});
 assert.equal((await exportInfo(env,output)).source,null,'reusing the same File later is not a second cloud handoff');
 const reloaded=smartEnvironment(store);reloaded.binding.setIdentity(identity);await reloaded.restore(bytes);
 assert.equal((await exportInfo(reloaded,output)).source,null,'a later unverified open also revokes its persisted association');
});

test('different File, merged selection, undelivered input and rejected preparation cannot inherit a cloud source',async()=>{
 const bytes=await pdfBytes({kind:'raw'}),output=await pdfBytes({id:'smartmatch-v35-workspace-A'});
 for(const mode of ['different-file','multiple','not-delivered','cancelled','failed']){
  const store=tabStore(),env=smartEnvironment(store),selected=file(bytes),input={id:'rtMultiFiles',files:[selected]};env.binding.setIdentity(identity);
  if(mode==='multiple')input.files.push(file(bytes,'Other.pdf'));
  await env.binding.observeImport(input,input.files,input.files.map((_,index)=>source({id:'item-'+index})));
  if(mode!=='not-delivered')env.emit('change',input);
  if(mode==='cancelled')env.control.readResult=false;
  if(mode==='failed')env.control.readError=Error('Synthetic opener failure');
  const opening=env.window.SmartMatchAppBridge.openReadFile(mode==='different-file'?file(bytes):selected,{readTestIntent:'prepare'});
  if(mode==='failed')await assert.rejects(opening,/Synthetic opener failure/);else await opening;
  assert.equal((await exportInfo(env,output)).source,null,mode);
  assert.equal(references(store).length,0,mode);
 }
});

test('cache completion persists a cloud import before the first export and a proven reload restores its original eTag',async()=>{
 const store=tabStore(),env=smartEnvironment(store),bytes=await pdfBytes();env.binding.setIdentity(identity);await openCloud(env,bytes);
 env.control.opening=true;setTimeout(()=>{env.control.opening=false;},35);
 assert.equal(await env.window.SmartMatchSession.cachePdf(),true);
 const record=references(store)[0];assert.equal(record.projectKey,'project-A');assert.match(record.originalHash,/^[a-f0-9]{64}$/);
 assert.equal(record.source.id,'item-A');assert.equal(record.source.eTag,'"v1"');assert.ok(JSON.stringify(record).length<2048);
 env.binding.uninstall();
 const reloaded=smartEnvironment(store);await reloaded.restore(bytes,{localPayload:{projectId:'project-A'}});
 const context=reloaded.captureProject();
 assert.equal((await exportInfo(reloaded,bytes,context)).source,null,'no account has been connected yet');
 reloaded.binding.setIdentity(identity);
 const info=await exportInfo(reloaded,bytes,context);
 assert.equal(info.source.id,'item-A');assert.equal(info.source.eTag,'"v1"');assert.equal(info.isCurrent(),true);
});

test('confirmed copy receipt persists the selected ID, folder and eTag without source bytes or unrelated fields',async()=>{
 const store=tabStore(),env=smartEnvironment(store),bytes=await pdfBytes();env.binding.setIdentity(identity);await openCloud(env,bytes);
 const info=await exportInfo(env,bytes);
 assert.equal(env.binding.confirmSave(info,source({id:'copy-ID',parentId:'copy-folder',name:'Gemensam kopia.pdf',eTag:'"copy-v3"',accessToken:'DO_NOT_STORE',pdfBytes:'DO_NOT_STORE'})),true);
 const record=references(store)[0];assert.equal(record.source.id,'copy-ID');assert.equal(record.source.eTag,'"copy-v3"');
 assert.equal(record.source.accessToken,undefined);assert.equal(record.source.pdfBytes,undefined);assert.equal(record.runtime,undefined);
 const reloaded=smartEnvironment(store);reloaded.binding.setIdentity(identity);await reloaded.restore(bytes);
 const next=await exportInfo(reloaded,bytes);assert.equal(next.source.id,'copy-ID');assert.equal(next.source.name,'Gemensam kopia.pdf');
 assert.equal(next.source.parentId,'copy-folder');assert.equal(next.source.eTag,'"copy-v3"');
});

test('separate tab stores preserve independent known eTags when another tab saves the same project',async()=>{
 const bytes=await pdfBytes(),tabs=[tabStore(),tabStore()],envs=[];
 for(const store of tabs){const env=smartEnvironment(store);env.binding.setIdentity(identity);await openCloud(env,bytes);await env.window.SmartMatchSession.cachePdf();envs.push(env);}
 assert.equal(envs[0].binding.confirmSave(await exportInfo(envs[0],bytes),source({eTag:'"v2-from-tab-A"'})),true);
 for(let i=0;i<tabs.length;i++){
  const reload=smartEnvironment(tabs[i]);reload.binding.setIdentity(identity);await reload.restore(bytes);
  assert.equal((await exportInfo(reload,bytes)).source.eTag,i===0?'"v2-from-tab-A"':'"v1"');
 }
});

test('a local primary import revokes persisted associations even for identical name, bytes and workspace after reload',async()=>{
 const store=tabStore(),bytes=await pdfBytes(),env=smartEnvironment(store);env.binding.setIdentity(identity);await openCloud(env,bytes);await env.window.SmartMatchSession.cachePdf();
 env.input.files=[file(bytes)];env.emit('change',env.input);env.setRuntime({kind:'smartmatch',key:'workspace-A',session:null,bytes:bytes.slice()});
 assert.equal((await exportInfo(env,bytes)).source,null);await env.window.SmartMatchSession.cachePdf();
 const reload=smartEnvironment(store);reload.binding.setIdentity(identity);await reload.restore(bytes);
 assert.equal((await exportInfo(reload,bytes)).source,null);
});

test('quota failure while revoking a local import removes the old epoch so reload cannot revive a cloud source',async()=>{
 const store=tabStore(),write=store.setItem;let quotaOnce=false;
 store.setItem=(key,value)=>{
  if(quotaOnce && key.includes(':epoch:')){quotaOnce=false;throw new DOMException('Synthetic full storage','QuotaExceededError');}
  write(key,value);
 };
 const bytes=await pdfBytes(),env=smartEnvironment(store);env.binding.setIdentity(identity);await openCloud(env,bytes);await env.window.SmartMatchSession.cachePdf();
 const old=references(store)[0];assert.ok(old.epoch);
 quotaOnce=true;env.input.files=[file(bytes)];env.emit('change',env.input);
 assert.equal([...store.entries.keys()].some(key=>key.includes(':epoch:')),false,'removeItem must revoke the disk epoch despite failed setItem');
 assert.equal(references(store)[0].source.id,'item-A','the regression must leave the old reference present');
 const reload=smartEnvironment(store);reload.binding.setIdentity(identity);await reload.restore(bytes);
 assert.equal((await exportInfo(reload,bytes)).source,null);
});

test('restore requires its observed cache opener, exact original bytes, workspace, project and account',async()=>{
 const bytes=await pdfBytes(),changed=await pdfBytes({revision:99});
 for(const mode of ['no-hook','other-workspace','wrong-runtime','other-bytes','wrong-cache-file','other-project','other-account','failed-open']){
  const store=tabStore(),seed=smartEnvironment(store);seed.binding.setIdentity(identity);await openCloud(seed,bytes);await seed.window.SmartMatchSession.cachePdf();
  const env=smartEnvironment(store);env.binding.setIdentity(mode==='other-account'?{...identity,accountKey:'tenant/account-B'}:identity);
  if(mode==='no-hook')env.setRuntime({kind:'smartmatch',key:'workspace-A',session:null,bytes});
  else{
   if(mode==='wrong-runtime')env.control.restoreWorkspace='wrong-workspace';
   if(mode==='wrong-cache-file')env.control.restoreBytes=changed;
   if(mode==='failed-open')env.control.restoreError=Error('Synthetic restore failure');
   const restoring=env.restore(mode==='other-bytes'?changed:bytes,mode==='other-workspace'?{workspaceId:'workspace-B'}:mode==='other-project'?{localPayload:{projectId:'project-B'}}:{});
   if(mode==='failed-open')await assert.rejects(restoring,/Synthetic restore failure/);else await restoring;
  }
  assert.equal((await exportInfo(env,bytes)).source,null,mode);
 }
});

test('account change after a cached restore cannot reuse its proof without another successful restore',async()=>{
 const store=tabStore(),bytes=await pdfBytes(),env=smartEnvironment(store);env.binding.setIdentity(identity);await openCloud(env,bytes);await env.window.SmartMatchSession.cachePdf();
 await env.restore(bytes);assert.equal((await exportInfo(env,bytes)).source.id,'item-A');
 env.binding.setIdentity({...identity,userId:'other-user'});env.binding.setIdentity(identity);
 assert.equal((await exportInfo(env,bytes)).source,null);
 await env.restore(bytes);assert.equal((await exportInfo(env,bytes)).source.id,'item-A');
});

test('blocked or disabled storage falls back to memory while corrupt records cannot create a restore source',async()=>{
 const bytes=await pdfBytes();
 for(const store of [null,{getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');}},{getItem(){return null;},setItem(){throw Error('Quota');}}]){
  const env=smartEnvironment(store);env.binding.setIdentity(identity);await openCloud(env,bytes);await env.window.SmartMatchSession.cachePdf();
  await env.restore(bytes);assert.equal((await exportInfo(env,bytes)).source.id,'item-A');
  const next=smartEnvironment(store);next.binding.setIdentity(identity);await next.restore(bytes);assert.equal((await exportInfo(next,bytes)).source,null);
 }
 const store=tabStore(),seed=smartEnvironment(store);seed.binding.setIdentity(identity);await openCloud(seed,bytes);await seed.window.SmartMatchSession.cachePdf();
 for(const key of store.entries.keys())store.entries.set(key,'{broken json');
 const broken=smartEnvironment(store);broken.binding.setIdentity(identity);await broken.restore(bytes);assert.equal((await exportInfo(broken,bytes)).source,null);
});

test('default persistence uses sessionStorage and never touches localStorage, CE or service restore stores',async()=>{
 const store=tabStore(),bytes=await pdfBytes();let localReads=0;
 const env=environment('smartmatch',{setup(window){window.sessionStorage=store;Object.defineProperty(window,'localStorage',{get(){localReads++;throw Error('Shared storage must not be used');}});}});
 env.binding.setIdentity(identity);await openCloud(env,bytes);assert.equal(env.binding.confirmSave(await exportInfo(env,bytes),source()),true);
 assert.equal(references(store).length,1);assert.equal(localReads,0);
 for(const kind of ['ce','dorrservice','security-service','doorservice-all-in-one']){
  let touched=0;environment(kind,{restoreStore:{getItem(){touched++;},setItem(){touched++;}}});assert.equal(touched,0,kind);
 }
});

test('unknown newer source or output schema cannot be mistaken for a raw drawing or an updateable project',async()=>{
 for(const [inputSchema,outputSchema]of [[7,6],[6,7],[7,7]]){
  const env=environment(),id='smartmatch-v35-workspace-A',bytes=await pdfBytes({id,schema:inputSchema});env.binding.setIdentity(identity);await openCloud(env,bytes);
  const info=await exportInfo(env,await pdfBytes({id,schema:outputSchema}));
  assert.equal(info.projectExport,false);assert.equal(info.source,null);assert.equal(env.binding.confirmSave(info,source()),false);
 }
});

test('a project switch during asynchronous output inspection invalidates the result',async()=>{
 const env=environment(),bytes=await pdfBytes();env.binding.setIdentity(identity);await openCloud(env,bytes);
 let release;const held=new Promise(resolve=>{release=resolve;});
 const infoPromise=env.binding.inspectExport({name:'Same.pdf',context:env.captureProject(),blob:{size:bytes.length,arrayBuffer:()=>held}});
 env.binding.clear();release(bytes.buffer);const info=await infoPromise;
 assert.equal(info.source,null);assert.equal(info.projectExport,false);assert.equal(info.isCurrent(),false);
});

test('Dörrservice, Kontrollflöde and Säkerhetsservice require full catalogue plus the active embedded drawing hash',async()=>{
 for(const kind of ['dorrservice','doorservice-all-in-one','security-service']){
  const env=environment(kind),drawing=await pdfBytes({kind:'raw'}),work=await pdfBytes({kind,drawing});env.binding.setIdentity(identity);
  const files=[file(work)];await env.binding.observeImport(env.input,files,[source()]);env.input.files=files;env.emit('change',env.input);
  env.setRuntime({kind,key:'active-drawing',session:{},bytes:drawing});
  const full=await exportInfo(env,work);assert.equal(full.projectExport,true,kind);assert.equal(full.source.id,'item-A',kind);
  const report=await exportInfo(env,drawing);assert.equal(report.projectExport,false);assert.equal(report.source,null);
  const otherDrawing=await pdfBytes({kind:'smartmatch',id:'other'}),wrong=await exportInfo(env,await pdfBytes({kind,drawing:otherDrawing}));assert.equal(wrong.projectExport,false);
  env.click(kind==='dorrservice'?'newServiceBtn':'secNewServiceBtn');assert.equal(full.isCurrent(),false);assert.equal((await exportInfo(env,work)).source,null);
 }
});

test('CE cloud import binds its stable project ID; history restore and reset clear previous provenance',async()=>{
 const env=environment('ce',{native:true}),bytes=await pdfBytes({kind:'ce'});
 // Install after the real module capability exists, as on the CE test page.
 env.binding.uninstall();
 env.window.TillsynoCETest={reset(){},restore(){},initProject(){}};
 const binding=createSourceBinding({window:env.window});env.binding=binding;binding.setIdentity(identity);
 const files=[file(bytes)];await binding.observeImport(env.input,files,[source()]);env.input.files=files;env.emit('change',env.input);
 env.window.TillsynoCETest.initProject(null,{projectId:'project-A'},bytes);
 const info=await exportInfo(env,bytes);assert.equal(info.projectExport,true);assert.equal(info.source.id,'item-A');
 env.window.TillsynoCETest.restore({projectId:'project-A'});assert.equal(info.isCurrent(),false);assert.equal((await exportInfo(env,bytes)).source,null);
 env.window.TillsynoCETest.reset();assert.equal((await exportInfo(env,bytes)).projectExport,false);
});

test('new CE full-project save can establish stable identity, while an old build after reset cannot',async()=>{
 const env=environment('ce',{native:true});env.binding.uninstall();
 env.window.TillsynoCETest={reset(){},restore(){},initProject(){}};env.window.TillsynoCEStorage={write(){}};
 env.binding=createSourceBinding({window:env.window});env.binding.setIdentity(identity);
 env.click('ceSavePdf');env.window.TillsynoCEStorage.write(null,'TillsynoCETestData',{projectId:'project-A'});
 const bytes=await pdfBytes({kind:'ce'}),info=await exportInfo(env,bytes);assert.equal(info.projectExport,true);assert.equal(env.binding.confirmSave(info,source()),true);
 assert.equal((await exportInfo(env,bytes)).source.id,'item-A');
 env.click('ceShareProject');env.window.TillsynoCETest.reset();env.window.TillsynoCEStorage.write(null,'TillsynoCETestData',{projectId:'project-A'});
 assert.equal((await exportInfo(env,bytes)).projectExport,false);
});

test('unmarked drawing-tool PDFs and split/OCR outputs remain independent copies',async()=>{
 const env=environment('drawing'),bytes=await pdfBytes({kind:'raw'});env.binding.setIdentity(identity);
 const files=[file(bytes)];await env.binding.observeImport(env.input,files,[source()]);env.input.files=files;env.emit('change',env.input);
 env.setRuntime({kind:'drawing',key:'source-1',session:{},bytes});
 const info=await exportInfo(env,bytes);assert.equal(info.projectExport,false);assert.equal(info.source,null);assert.equal(env.binding.confirmSave(info,source()),false);
});

test('multiple source PDFs cannot silently choose one overwrite target; missing captured context also cannot update',async()=>{
 const env=environment(),bytes=await pdfBytes();env.binding.setIdentity(identity);await openCloud(env,bytes);
 const files=[file(bytes),file(bytes,'Other.pdf')];await env.binding.observeImport(env.input,files,[source(),source({id:'other'})]);env.input.files=files;env.emit('change',env.input);
 assert.equal((await exportInfo(env,bytes)).source,null);
 const info=await env.binding.inspectExport({blob:file(bytes),name:'Samma namn.pdf'});assert.equal(info.projectExport,false);assert.equal(info.source,null);
});

test('recognized project parsing is bounded and does not accept a PDF-looking filename as metadata',async()=>{
 const env=environment();assert.equal(await inspectProjectPdf(new Blob(['not a pdf']),{window:env.window,kind:'smartmatch'}),null);
 let read=false;assert.equal(await inspectProjectPdf({size:MAX_FILE_BYTES+1,arrayBuffer(){read=true;}},{window:env.window,kind:'smartmatch'}),null);assert.equal(read,false);
});

test('project metadata accepts the existing Uint8Array view without copying its buffer',async()=>{
 const env=environment(),bytes=await pdfBytes(),backing=new Uint8Array(bytes.length+16);backing.set(bytes,8);
 const view=backing.subarray(8,bytes.length+8);let loads=0;
 env.window.PDFLib={...PDFLib,PDFDocument:{load:async(input,options)=>{loads++;assert.equal(input,view);return PDFLib.PDFDocument.load(input,options);}}};
 assert.deepEqual(await inspectProjectPdf(view,{window:env.window,kind:'smartmatch'}),{kind:'smartmatch',projectId:'project-A'});
 assert.equal(loads,1);
});

// Real, uncompressed PDF stream plus a real project catalogue. Build one byte
// array directly rather than asking a serializer to allocate another 100 MiB
// filler buffer. Updated exports reuse immutable Blob slices; nothing is saved
// in the repository and no test fixture contains customer data.
function opaqueProjectPdf(opaqueBytes){
 const encoder=new TextEncoder();
 const prefix=revision=>{
  const payload={schema:6,projectId:'large-project-A',projectRevision:revision,instances:{},automationItems:[]};
  const objects=[
   '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /TillsynoSmartMatchV36Data '+PDFLib.PDFHexString.fromText(JSON.stringify(payload)).toString()+' /SyntheticOpaque 4 0 R >>\nendobj\n',
   '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n',
   '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << >> >>\nendobj\n',
   '4 0 obj\n<< /Length '+opaqueBytes+' >>\nstream\n',
  ];
  let text='%PDF-1.7\n',offsets=[];for(const entry of objects){offsets.push(text.length);text+=entry;}
  return {bytes:encoder.encode(text),offsets};
 };
 const head=prefix(1),ending='\nendstream\nendobj\n',xrefOffset=head.bytes.length+opaqueBytes+ending.length;
 const suffix=encoder.encode(ending+'xref\n0 5\n0000000000 65535 f \n'+head.offsets.map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n'+xrefOffset+'\n%%EOF\n');
 const bytes=new Uint8Array(head.bytes.length+opaqueBytes+suffix.length);bytes.set(head.bytes);bytes.set(suffix,head.bytes.length+opaqueBytes);
 return {bytes,headBytes:head.bytes.length,updated:(original,revision)=>{
  const next=prefix(revision).bytes;assert.equal(next.length,head.bytes.length);
  return new File([next,original.slice(head.bytes.length)],'Stor projektfil.pdf',{type:'application/pdf'});
 }};
}

test('100 MiB project imports, saves and saves again to the same ID with bounded hashing and sequential cached source parsing',async t=>{
 const env=environment(),fixture=opaqueProjectPdf(100*1024*1024);
 const observed={importFullReads:0,maxImportSlice:0,importSlices:0,maxDigestBytes:0,digestActive:0,maxDigestActive:0,pdfActive:0,maxPdfActive:0,originalParses:0,outputParses:0};
 class ImportFile extends File {
  async arrayBuffer(){observed.importFullReads++;return super.arrayBuffer();}
  slice(start,end,type){if(Number.isFinite(end)){observed.importSlices++;observed.maxImportSlice=Math.max(observed.maxImportSlice,end-start);}return super.slice(start,end,type);}
 }
 const imported=new ImportFile([fixture.bytes],'Stor projektfil.pdf',{type:'application/pdf'});
 assert.ok(imported.size>100*1024*1024&&imported.size<=MAX_FILE_BYTES);
 env.window.Blob=class extends Blob {constructor(){throw Error('The adapter must not create a full-file Blob copy.');}};
 env.window.crypto={subtle:{digest:async(algorithm,input)=>{
  observed.maxDigestBytes=Math.max(observed.maxDigestBytes,input.byteLength);
  observed.maxDigestActive=Math.max(observed.maxDigestActive,++observed.digestActive);
  try{return await webcrypto.subtle.digest(algorithm,input);}finally{observed.digestActive--;}
 }}};
 env.window.PDFLib={...PDFLib,PDFDocument:{load:async(input,options)=>{
  if(input===fixture.bytes)observed.originalParses++;else observed.outputParses++;
  observed.maxPdfActive=Math.max(observed.maxPdfActive,++observed.pdfActive);
  try{return await PDFLib.PDFDocument.load(input,options);}finally{observed.pdfActive--;}
 }}};
 env.binding.setIdentity(identity);
 assert.equal(await env.binding.observeImport(env.input,[imported],[source({size:imported.size})]),true);
 assert.equal(observed.importFullReads,0,'cloud import must not read a second whole-file arrayBuffer just to verify identity');
 assert.equal(observed.originalParses+observed.outputParses,0,'SmartMatch import needs only a byte fingerprint');
 assert.ok(observed.importSlices>1);assert.ok(observed.maxImportSlice<=2*1024*1024);
 env.input.files=[imported];env.emit('change',env.input);
 env.setRuntime({kind:'smartmatch',key:'large-workspace',session:null,bytes:fixture.bytes});
 for(const revision of [2,3]){
  const output=fixture.updated(imported,revision);
  const info=await env.binding.inspectExport({blob:output,name:output.name,context:env.captureProject()});
  assert.equal(info.projectExport,true);assert.equal(info.isCurrent(),true);
  assert.equal(info.source?.id,'item-A','a large file must update the opened file, not silently fall back to creating a duplicate');
  assert.equal(info.source.eTag,'"v'+(revision-1)+'"');
  assert.equal(env.binding.confirmSave(info,source({size:output.size,eTag:'"v'+revision+'"'})),true);
 }
 assert.equal(observed.originalParses,1,'the existing active original byte object is parsed once across repeated saves');
 assert.equal(observed.outputParses,2,'each newly completed export is inspected');
 assert.equal(observed.maxPdfActive,1,'source and output PDF parses must not run in parallel');
 assert.equal(observed.maxDigestActive,1);assert.ok(observed.maxDigestBytes<=2*1024*1024,'crypto may copy only a bounded chunk, never the whole 100 MiB file');
 t.diagnostic('Generated '+imported.size+' PDF bytes in memory; max hash input '+observed.maxDigestBytes+' bytes, one active PDF parse, one cached original parse. This is Node allocation-path evidence, not a physical iPad/Safari memory guarantee.');
 env.binding.uninstall();
});

test('large opaque content beyond the first hash chunk must also match before a source can bind',async()=>{
 const env=environment(),fixture=opaqueProjectPdf(2*1024*1024+128),imported=file(fixture.bytes);
 env.binding.setIdentity(identity);await env.binding.observeImport(env.input,[imported],[source()]);env.input.files=[imported];env.emit('change',env.input);
 const changed=fixture.bytes.slice();changed[fixture.headBytes+2*1024*1024+64]=91;
 env.setRuntime({kind:'smartmatch',key:'large-workspace',session:null,bytes:changed});
 const info=await exportInfo(env,changed);
 assert.equal(info.projectExport,true,'the PDF catalogue remains valid and names the active project');
 assert.equal(info.source,null,'different opaque drawing bytes cannot inherit the opened file identity');
});

test('imports above the shared 200 MiB limit are rejected before reading or hashing',async()=>{
 const env=environment();env.binding.setIdentity(identity);let read=false;
 const tooLarge={name:'För stor.pdf',size:MAX_FILE_BYTES+1,arrayBuffer(){read=true;},slice(){read=true;}};
 assert.equal(await env.binding.observeImport(env.input,[tooLarge],[source()]),false);assert.equal(read,false);
 assert.equal(MAX_FILE_BYTES,200*1024*1024);
});
