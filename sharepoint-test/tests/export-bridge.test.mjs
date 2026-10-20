import test from 'node:test';
import assert from 'node:assert/strict';
import {installExportBridge,isSharePointTestPage} from '../src/export-bridge.mjs';

const deferred = () => { let resolve,reject; const promise=new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; };
const tick = () => new Promise(resolve=>setImmediate(resolve));
const pages = new Map([
 ['sharepoint-app-test.html',''], ['sharepoint-control-test.html','control'],
 ['sharepoint-security-test.html','control'], ['sharepoint-smartmatch-test.html','smartmatch'],
 ['sharepoint-read-test.html','smartmatch'], ['sharepoint-drawing-test.html','drawing'], ['sharepoint-ce-test.html','smartmatch'],
]);
function environment({page='sharepoint-read-test.html',module=pages.get(page),attribute=true,share=false,picker=false}={}) {
 const calls={fetch:[],downloads:[],shares:[],pickers:[],writes:[],closes:0}, listeners=new Set(), urls=new Map(), nodes=new Map(), timers=[];
 let urlId=0, localBytes=new Blob(), localGate=null;
 const document={
  body:{dataset:{sharepointModule:module},hasAttribute:name=>attribute&&name==='data-sharepoint-module',append(node){node.isConnected=true;}},
  addEventListener(type,fn,capture){if(type==='click'){assert.equal(capture,true);listeners.add(fn);}},
  removeEventListener(type,fn){if(type==='click')listeners.delete(fn);},
  getElementById:id=>nodes.get(id)||null,
  querySelector:()=>null,
  emitClick(target){
   const event={target,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};
   for(const fn of listeners){fn(event);if(event.stopped)break;}
   if(!event.stopped&&!event.defaultPrevented)target.onclick?.(event);
   return event;
  },
 };
 class Button {
  constructor(id=''){this.id=id;this.disabled=false;this.textContent='';this.isConnected=true;}
  closest(selector){return selector==='#smartExportSaveObject'&&this.id==='smartExportSaveObject'?this:null;}
  click(){document.emitClick(this);}
 }
 class Anchor extends Button {
  constructor(){super();this.isConnected=false;this.href='';this.attrs=new Set();this._download='';}
  set download(value){this._download=String(value);this.attrs.add('download');}
  get download(){return this._download;}
  hasAttribute(name){return this.attrs.has(name);}
  closest(selector){return selector==='a[download]'&&this.attrs.has('download')?this:null;}
  remove(){this.isConnected=false;}
  click(){
   const event=this.isConnected?document.emitClick(this):{defaultPrevented:false};
   if(!event.defaultPrevented)calls.downloads.push({name:this.download,href:this.href,blob:urls.get(this.href)});
  }
 }
 document.createElement=tag=>{assert.equal(tag,'a');return new Anchor();};
 class LocalURL extends URL {}
 LocalURL.createObjectURL=blob=>{const url='blob:https://test.example/'+(++urlId);urls.set(url,blob);return url;};
 LocalURL.revokeObjectURL=url=>urls.delete(url);
 const window={document,location:{href:'https://test.example/tillsyno/'+page,pathname:'/tillsyno/'+page,origin:'https://test.example'},
  Blob,File,ArrayBuffer,DOMException,URL:LocalURL,HTMLAnchorElement:Anchor,navigator:{},
  setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},
  fetch(url){assert.equal(this,window);calls.fetch.push(url);const blob=urls.get(url);return blob?Promise.resolve(new Response(blob)):Promise.reject(new Error('Object URL no longer exists.'));},
 };
 const originalClick=Anchor.prototype.click;
 if(share)window.navigator.share=function(data){assert.equal(this,window.navigator);calls.shares.push(data);return Promise.resolve();};
 const localHandle={name:'Vald lokalt.pdf',async createWritable(){return {
  async write(blob){calls.writes.push(blob);localBytes=new Blob([blob],{type:blob.type});},
  async close(){calls.closes++;if(localGate)await localGate.promise;},
  async abort(){},
 };},async getFile(){return new File([localBytes],localHandle.name,{type:'application/pdf'});}};
 if(picker)window.showSaveFilePicker=function(options){assert.equal(this,window);calls.pickers.push(options);return Promise.resolve(localHandle);};
 return {window,document,calls,urls,nodes,Anchor,Button,originalClick,timers,localHandle,setLocalGate(value){localGate=value;}};
}
const receipt=blob=>({destination:'sharepoint',item:{id:'confirmed-file',size:blob.size}});

test('export bridge activates only the seven explicit test paths with their matching copy marker',()=>{
 for(const [page,module]of pages){
  const env=environment({page,module});assert.equal(isSharePointTestPage(env.window),true);
  const api=installExportBridge({window:env.window,offerSave:async({blob})=>receipt(blob)});assert.equal(api.installed,true);api.uninstall();
  assert.equal(env.Anchor.prototype.click,env.originalClick);
 }
 for(const options of [{page:'index.html',module:''},{page:'smartmatch-read-test-v9-74.html',module:'smartmatch'},{attribute:false},{module:'control'}]){
  const env=environment(options);const api=installExportBridge({window:env.window,offerSave:()=>{throw Error('must not run');}});
  assert.equal(api.installed,false);assert.equal(env.Anchor.prototype.click,env.originalClick);
 }
});

test('detached anchor captures exact exported bytes before immediate URL revocation; no download before cloud receipt',async()=>{
 const env=environment(),ack=deferred(),entered=deferred(),received=[];
 const api=installExportBridge({window:env.window,offerSave:async file=>{received.push(file);entered.resolve();return ack.promise;}});
 const original=new Blob(['%PDF-1.7\noriginal with embedded project state'],{type:'application/pdf'});
 const url=env.window.URL.createObjectURL(original),a=env.document.createElement('a');a.href=url;a.download='Dörr GS69.pdf';
 a.click();assert.deepEqual(env.calls.fetch,[url],'fetch begins inside click, not after a queued microtask');
 env.window.URL.revokeObjectURL(url);await entered.promise;
 assert.equal(received.length,1);assert.equal(received[0].name,'Dörr GS69.pdf');assert.equal(received[0].source,'download');
 assert.equal(await received[0].blob.text(),await original.text());assert.equal(env.calls.downloads.length,0);
 let finished=false;api.whenIdle().then(()=>{finished=true;});await tick();assert.equal(finished,false);
 ack.resolve(receipt(original));await api.whenIdle();assert.equal(env.calls.downloads.length,0);api.uninstall();
});

test('connected click is captured once; local selection uses the original download without recursion',async()=>{
 const env=environment(),requests=[];
 const api=installExportBridge({window:env.window,offerSave:async request=>{requests.push(request);return {destination:'local'};}});
 const blob=new Blob(['zip bytes'],{type:'application/zip'}),a=env.document.createElement('a');a.href=env.window.URL.createObjectURL(blob);a.download='CE-underlag.zip';env.document.body.append(a);
 const event=env.document.emitClick(a);assert.equal(event.defaultPrevented,true);await api.whenIdle();
 assert.equal(requests.length,1);assert.equal(env.calls.downloads.length,1);assert.equal(env.calls.downloads[0].name,'CE-underlag.zip');
 assert.equal(await env.calls.downloads[0].blob.text(),'zip bytes');api.uninstall();
});

test('preview links, HTTP downloads and unsupported types are untouched',async()=>{
 const env=environment(),api=installExportBridge({window:env.window,offerSave:()=>{throw Error('not an export');}});
 for(const [href,name]of [['blob:https://test.example/preview',null],['https://test.example/static.pdf','manual.pdf'],['blob:https://other.example/id','other.pdf'],['blob:https://test.example/id','software.exe']]){
  const a=env.document.createElement('a');a.href=href;if(name)a.download=name;a.click();
 }
 assert.equal(env.calls.downloads.length,4);assert.equal(env.calls.fetch.length,0);await api.whenIdle();api.uninstall();
});

test('virtual file stream preserves chunked bytes and blocks saved completion until SharePoint acknowledges',async()=>{
 const env=environment({picker:true}),ack=deferred(),requests=[];
 const api=installExportBridge({window:env.window,offerSave:async request=>{requests.push(request);return ack.promise;}});
 const handle=await env.window.showSaveFilePicker({suggestedName:'Projekt.pdf',types:[{accept:{'application/pdf':['.pdf']}}]});
 assert.equal(env.calls.pickers.length,0,'no native picker is opened until Local is chosen');
 const writer=await handle.createWritable(),payload=new Uint8Array([37,80,68,70,45,49,46,55,10,255,0,5]);
 await writer.seek(0);await writer.write(payload.subarray(0,4));await writer.write(new Blob([payload.subarray(4,9)]));await writer.write(payload.subarray(9));await writer.truncate(payload.length);
 let markedSaved=false;const close=writer.close().then(()=>{markedSaved=true;});await tick();
 assert.equal(requests.length,1);assert.equal(markedSaved,false);await assert.rejects(handle.getFile(),/inte bekräftats/);
 assert.equal(requests[0].source,'save-picker');assert.deepEqual(new Uint8Array(await requests[0].blob.arrayBuffer()),payload);
 ack.resolve({...receipt(requests[0].blob),item:{id:'confirmed-file',size:payload.length,name:'Projekt - SharePoint-kopia.pdf'}});await close;assert.equal(markedSaved,true);
 const saved=await handle.getFile();assert.equal(saved.name,'Projekt - SharePoint-kopia.pdf');assert.equal(handle.name,saved.name);assert.deepEqual(new Uint8Array(await saved.arrayBuffer()),payload);
 assert.equal(env.calls.writes.length,0);assert.equal(env.calls.pickers.length,0);api.uninstall();
});

test('cancelled, failed or incomplete uploads never complete stream.close or trigger local fallback',async()=>{
 for(const answer of [()=>null,()=>{throw Error('403 write permission denied');},({blob})=>({destination:'sharepoint',item:{id:'x',size:blob.size-1}})]){
  const env=environment({picker:true}),errors=[];
  const api=installExportBridge({window:env.window,offerSave:answer,onError:error=>errors.push(error)});
  const handle=await env.window.showSaveFilePicker({suggestedName:'Projekt.pdf'}),writer=await handle.createWritable();await writer.write(new Blob(['%PDF-1.7']));
  let markedSaved=false;await assert.rejects(writer.close().then(()=>{markedSaved=true;}),{name:'AbortError'});
  assert.equal(markedSaved,false);await assert.rejects(handle.getFile(),{name:'InvalidStateError'});
  assert.equal(env.calls.pickers.length,0);assert.equal(env.calls.downloads.length,0);assert.equal(errors.length,answer.toString().includes('null')?0:1);api.uninstall();
 }
});

test('local save calls the actual native picker/write/close and preserves native readback',async()=>{
 const env=environment({picker:true}),disk=deferred();env.setLocalGate(disk);
 const api=installExportBridge({window:env.window,offerSave:async()=>({destination:'local'})});
 const handle=await env.window.showSaveFilePicker({suggestedName:'Projekt.pdf'}),writer=await handle.createWritable();await writer.write(new Uint8Array([1,4,9]));
 let saved=false;const close=writer.close().then(()=>{saved=true;});await tick();
 assert.equal(env.calls.pickers.length,1);assert.equal(env.calls.closes,1);assert.equal(saved,false);
 disk.resolve();await close;assert.equal(saved,true);assert.equal(handle.name,'Vald lokalt.pdf');
 assert.deepEqual(new Uint8Array(await (await handle.getFile()).arrayBuffer()),new Uint8Array([1,4,9]));api.uninstall();
});

test('a failed partial write cannot upload truncated data from a caller finally-close',async()=>{
 const env=environment({picker:true});let offered=0;
 const api=installExportBridge({window:env.window,offerSave:async({blob})=>{offered++;return receipt(blob);}});
 const handle=await env.window.showSaveFilePicker({suggestedName:'Projekt.pdf'}),writer=await handle.createWritable();
 await writer.write('%PDF-');await assert.rejects(writer.write({unexpected:'invalid chunk'}),/Ogiltiga exportdata/);
 await assert.rejects(async()=>writer.close(),{name:'InvalidStateError'});
 assert.equal(offered,0);await assert.rejects(handle.getFile(),{name:'InvalidStateError'});api.uninstall();
});

test('iOS file share awaits cloud receipt; cancel/failure does not invoke native share or download',async()=>{
 for(const response of [null,Error('Upload failed'),{destination:'sharepoint',item:{id:'saved'}}]){
  const env=environment({share:true}),ack=deferred(),errors=[];
  const api=installExportBridge({window:env.window,offerSave:()=>ack.promise,onError:error=>errors.push(error)});
  const file=new File(['%PDF-1.7'],'Delning.pdf',{type:'application/pdf'});let complete=false;
  const sharing=env.window.navigator.share({files:[file],title:'Projekt'}).then(()=>{complete=true;});sharing.catch(()=>{});await tick();assert.equal(complete,false);
  response instanceof Error?ack.reject(response):ack.resolve(response);
  if(response&&!(response instanceof Error)){await sharing;assert.equal(complete,true);}else await assert.rejects(sharing,{name:'AbortError'});
  assert.equal(env.calls.shares.length,0);assert.equal(env.calls.downloads.length,0);assert.equal(errors.length,response instanceof Error?1:0);api.uninstall();
 }
});

test('local iOS share receives the exact file/name; text-only sharing stays native',async()=>{
 const env=environment({share:true}),requests=[];
 const api=installExportBridge({window:env.window,offerSave:async request=>{requests.push(request);return {destination:'local'};}});
 const file=new File(['finished zipped bytes'],'CE-mappar.zip',{type:'application/zip'});
 await env.window.navigator.share({files:[file],title:'CE-mappar'});
 assert.equal(requests.length,1);assert.equal(env.calls.shares.length,1);assert.equal(env.calls.shares[0].files[0].name,file.name);assert.equal(await env.calls.shares[0].files[0].text(),await file.text());
 await env.window.navigator.share({text:'Ordinary text',url:'https://example.com/'});assert.equal(requests.length,1);assert.equal(env.calls.shares.length,2);api.uninstall();
});

test('multiple files queue separately and stop on cancellation',async()=>{
 const env=environment({share:true}),names=[];
 const api=installExportBridge({window:env.window,offerSave:async({name,blob})=>{names.push(name);return names.length===1?receipt(blob):null;}});
 const files=['one.pdf','two.pdf','three.pdf'].map(name=>new File(['pdf'],name,{type:'application/pdf'}));
 await assert.rejects(env.window.navigator.share({files}),{name:'AbortError'});assert.deepEqual(names,['one.pdf','two.pdf']);assert.equal(env.calls.shares.length,0);api.uninstall();
});

test('existing original-file save button is labelled and routed to the known Save As handler',()=>{
 const env=environment(),copy=new env.Button('smartExportSaveObject'),saveAs=new env.Button('smartExportSaveAs');
 copy.textContent='Spara i öppnad PDF';let original=0,copies=0;copy.onclick=()=>{original++;};saveAs.onclick=()=>{copies++;};env.nodes.set(copy.id,copy);env.nodes.set(saveAs.id,saveAs);
 const api=installExportBridge({window:env.window,offerSave:async({blob})=>receipt(blob)});
 assert.equal(copy.textContent,'Spara');copy.click();assert.equal(original,0);assert.equal(copies,1);
 api.uninstall();assert.equal(copy.textContent,'Spara i öppnad PDF');copy.click();assert.equal(original,1);
});

test('uninstall during destination choice cannot release a saved completion',async()=>{
 const env=environment({picker:true}),ack=deferred();
 const api=installExportBridge({window:env.window,offerSave:()=>ack.promise});
 const handle=await env.window.showSaveFilePicker({suggestedName:'Projekt.pdf'}),writer=await handle.createWritable();await writer.write('pdf');
 const close=writer.close();close.catch(()=>{});await tick();api.uninstall();ack.resolve({destination:'sharepoint',item:{id:'written'}});
 await assert.rejects(close,{name:'AbortError'});await assert.rejects(handle.getFile(),{name:'InvalidStateError'});
});

test('queued anchor exports retain provenance captured before waiting for the previous destination',async()=>{
 const env=environment(),ack=deferred(),requests=[];let project='A';
 const api=installExportBridge({window:env.window,captureContext:()=>Object.freeze({project}),offerSave:async request=>{requests.push(request);return requests.length===1?ack.promise:receipt(request.blob);}});
 const blob=new Blob(['pdf'],{type:'application/pdf'});
 function download(name){const a=env.document.createElement('a');a.href=env.window.URL.createObjectURL(blob);a.download=name;a.click();}
 download('one.pdf');await tick();download('two.pdf');project='B';
 ack.resolve(receipt(blob));await api.whenIdle();
 assert.equal(requests.length,2);assert.equal(requests[0].context.project,'A');assert.equal(requests[1].context.project,'A','a new project must not be attached to an older queued file');api.uninstall();
});

test('native save and iOS share capture project context before their asynchronous transport work',async()=>{
 const env=environment({picker:true,share:true}),requests=[];let project='A';
 const api=installExportBridge({window:env.window,captureContext:()=>({project}),offerSave:async request=>{requests.push(request);return receipt(request.blob);}});
 const handle=await env.window.showSaveFilePicker({suggestedName:'project.pdf'});project='B';
 const stream=await handle.createWritable();await stream.write('pdf');await stream.close();assert.equal(requests[0].context.project,'A');
 const share=env.window.navigator.share({files:[new File(['pdf'],'shared.pdf',{type:'application/pdf'})]});project='C';await share;
 assert.equal(requests[1].context.project,'B');api.uninstall();
});

test('only the two SmartMatch test routes use the modules own input-based desktop open path',()=>{
 for(const page of ['sharepoint-read-test.html','sharepoint-smartmatch-test.html','sharepoint-ce-test.html','sharepoint-drawing-test.html']){
  const env=environment({page}),nativeOpen=async()=>[];env.window.showOpenFilePicker=nativeOpen;
  const api=installExportBridge({window:env.window,offerSave:async({blob})=>receipt(blob)});
  assert.equal(typeof env.window.showOpenFilePicker,page==='sharepoint-read-test.html'||page==='sharepoint-smartmatch-test.html'?'undefined':'function');
  api.uninstall();assert.equal(env.window.showOpenFilePicker,nativeOpen);
 }
});
