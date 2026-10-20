import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import {createSourceBinding,inspectProjectPdf} from '../src/source-binding.mjs';
const require=createRequire(import.meta.url), PDFLib=require('../../vendor/pdf-lib.min.js');
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
const file=(bytes,name='Samma namn.pdf')=>new File([bytes],name,{type:'application/pdf'});
function environment(kind='smartmatch',{native=false}={}){
 const [page,module,inputId]=routeInfo[kind],listeners=new Map(),nodes=new Map();
 const document={body:{dataset:{sharepointModule:module},hasAttribute:()=>true},
  getElementById:id=>nodes.get(id)||null,
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
  removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
 };
 const window={document,location:{pathname:'/tillsyno/'+page},Blob,File,crypto:webcrypto,PDFLib};
 const input={id:inputId,files:[]};nodes.set(inputId,input);nodes.set('ceWorkspace',{hidden:false});
 let runtime=null;
 const binding=createSourceBinding({window,...(native?{}:{readActive:()=>runtime})});
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

test('opened working PDF binds exact driveItem; repeated saves refresh eTag and retain name independent of export name',async()=>{
 const env=environment(),original=await pdfBytes(),updated=await pdfBytes({revision:2});env.binding.setIdentity(identity);
 await openCloud(env,original);let info=await exportInfo(env,updated);
 assert.equal(info.projectExport,true);assert.equal(info.source.id,'item-A');assert.equal(info.source.eTag,'"v1"');assert.equal(info.isCurrent(),true);
 assert.equal(env.binding.confirmSave(info,source({eTag:'"v2"'})),true);
 info=await exportInfo(env,await pdfBytes({revision:3}));assert.equal(info.source.id,'item-A');assert.equal(info.source.name,'Samma namn.pdf');assert.equal(info.source.eTag,'"v2"');
 env.binding.uninstall();
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
 let read=false;assert.equal(await inspectProjectPdf({size:26*1024*1024,arrayBuffer(){read=true;}},{window:env.window,kind:'smartmatch'}),null);assert.equal(read,false);
});
