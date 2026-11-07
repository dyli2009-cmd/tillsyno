import test from 'node:test';
import assert from 'node:assert/strict';
import {SharePointFiles,accepts} from '../src/file-client.mjs';
import {ReadOnlySharePoint} from '../src/read-only.mjs';
import {MAX_FILE_BYTES} from '../src/limits.mjs';
const json=x=>Response.json(x);
test('File matching follows the chosen app input, not arbitrary file names',()=>{
 assert.ok(accepts('Dörr.PDF','application/pdf,.pdf'));
 assert.ok(accepts('bild.JPG','image/*'));assert.ok(accepts('projekt.zip','.pdf,.zip'));
 assert.equal(accepts('virus.exe',''),false);assert.equal(accepts('bild.png','.pdf'),false);assert.equal(accepts('a.pdf.exe','.pdf'),false);
});
test('Folder root resolves only the configured site and library',async()=>{
 const replies=[{id:'s',webUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno'},{value:[{id:'d',webUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno/Delade%20dokument'}]},{id:'f',name:'Great',folder:{},parentReference:{driveId:'d',id:'library-root'}}];
 const calls=[];const c=new SharePointFiles({getToken:async()=> 's',fetchImpl:async u=>{calls.push(u);return json(replies.shift());}});
 assert.deepEqual(await c.root({siteUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno',libraryServerRelativePath:'/sites/Tillsyno/Delade dokument',folderPath:'Great'}),{driveId:'d',id:'f',name:'Great'});
 assert.match(calls[2],/root:\/Great/);
});
test('Image and ZIP downloads produce correctly typed files, without bearer tokens',async()=>{
 for(const [name,mime] of [['bild.png','image/png'],['projekt.zip','application/zip']]){
  let n=0;const c=new SharePointFiles({getToken:async()=> 'secret',fetchImpl:async(u,o)=>{
   assert.equal(o.method,'GET');if(++n===1)return json({name,size:3,file:{},'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download'});
   assert.equal(o.headers,undefined);assert.equal(o.credentials,'omit');return new Response('abc');
  }});
  const f=await c.file('d','i','.png,.zip');assert.equal(f.name,name);assert.equal(f.type,mime);
 }
});
test('Reject unsupported, oversized, malformed and non-PDF inputs before import',async()=>{
 for(const item of [{name:'a.exe',size:1},{name:'a.pdf',size:MAX_FILE_BYTES+1},{name:'a.pdf',size:1,'@microsoft.graph.downloadUrl':'https://evil.example/file'}]){
  let n=0;const c=new SharePointFiles({getToken:async()=> 's',fetchImpl:async()=>{n++;return json({...item,file:{}});}});
  await assert.rejects(()=>c.file('d','i','.pdf'));assert.equal(n,1);
 }
 const c=new SharePointFiles({getToken:async()=> 's',fetchImpl:async u=>u.includes('graph.microsoft.com')?json({name:'a.pdf',file:{},size:5,'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download'}):new Response('hello')});
 await assert.rejects(()=>c.file('d','i','.pdf'),/PDF-signatur/);
});
test('Missing download annotation retries full metadata and keeps file size checks',async()=>{
 let n=0;const c=new SharePointFiles({getToken:async()=> 's',fetchImpl:async()=>json(++n===1?{name:'a.pdf',file:{},size:8}:{name:'a.pdf',file:{},size:MAX_FILE_BYTES+1,'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download'})});
 await assert.rejects(()=>c.file('d','i','.pdf'),/200 MiB/);assert.equal(n,2);
});
test('Cloud source identity matches one stable downloaded revision without exposing its download URL',async()=>{
 const bytes='%PDF-1.7\nfixture',base={id:'item',name:'project.pdf',size:bytes.length,file:{},parentReference:{driveId:'drive',id:'folder'},eTag:'"version-1"'};
 const calls=[];
 const client=new SharePointFiles({getToken:async()=> 'secret',fetchImpl:async(url,options)=>{
  calls.push({url,options});
  if(url.includes('graph.microsoft.com'))return json({...base,'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download-secret'});
  assert.equal(options.headers,undefined);return new Response(bytes);
 }});
 const opened=await client.fileWithSource('drive','item','.pdf');
 assert.equal(await opened.file.text(),bytes);
 assert.deepEqual(opened.source,{driveId:'drive',id:'item',parentId:'folder',name:'project.pdf',size:bytes.length,eTag:'"version-1"'});
 assert.equal(calls.filter(c=>c.url.includes('graph.microsoft.com')).length,3);
});
test('Cloud import rejects revision, parent, identity and byte-size changes rather than binding the wrong file',async()=>{
 for(const change of [{eTag:'"version-2"'},{parentReference:{driveId:'drive',id:'other'}},{id:'other'},{size:30}]){
  const bytes='%PDF-1.7\nfixture',base={id:'item',name:'project.pdf',size:bytes.length,file:{},parentReference:{driveId:'drive',id:'folder'},eTag:'"version-1"'};
  let n=0;
  const client=new SharePointFiles({getToken:async()=> 'secret',fetchImpl:async url=>{
   if(!url.includes('graph.microsoft.com'))return new Response(bytes);
   n++;
   return json({...base,...(n===3?change:{}),'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download'});
  }});
  await assert.rejects(()=>client.fileWithSource('drive','item','.pdf'),/ändrades|verifieras/);
 }
});
test('Cloud import requires an exact revision and refuses shortcuts or another library before downloading',async()=>{
 for(const change of [{eTag:undefined},{eTag:'x\r\ny'},{remoteItem:{}},{deleted:{}},{parentReference:{driveId:'other',id:'folder'}}]){
  let calls=0;
  const client=new SharePointFiles({getToken:async()=> 'secret',fetchImpl:async()=>{calls++;return json({id:'item',name:'a.pdf',size:6,file:{},parentReference:{driveId:'drive',id:'folder'},eTag:'"1"',...change});}});
  await assert.rejects(()=>client.fileWithSource('drive','item','.pdf'),/verifieras/);
  assert.equal(calls,1);
 }
});
test('Cloud import verifies the identity of the download-URL metadata, including its full-metadata fallback',async()=>{
 for(const fallback of [false,true])for(const change of [{id:'other'},{eTag:'"version-2"'},{parentReference:{driveId:'other',id:'folder'}},{parentReference:{driveId:'drive',id:'other'}},{name:'other.pdf'},{size:30},{remoteItem:{}},{deleted:{}}]){
  const bytes='%PDF-1.7\nfixture',base={id:'item',name:'project.pdf',size:bytes.length,file:{},parentReference:{driveId:'drive',id:'folder'},eTag:'"version-1"'};
  let metadataCalls=0,downloads=0;
  const client=new SharePointFiles({getToken:async()=> 'secret',fetchImpl:async url=>{
   if(!url.includes('graph.microsoft.com')){downloads++;return new Response(bytes);}
   metadataCalls++;
   if(metadataCalls===1||fallback&&metadataCalls===2)return json(base);
   return json({...base,...change,'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download'});
  }});
  await assert.rejects(()=>client.fileWithSource('drive','item','.pdf'),/ändrades/);
  assert.equal(downloads,0);assert.equal(metadataCalls,fallback?3:2);
 }
});

const rootConfig={siteUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno',libraryServerRelativePath:'/sites/Tillsyno/Delade dokument',folderPath:'Great'};
function folderFixture(storageOverride){
 const data=new Map(),calls=[];
 const rootStore={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 const folder=(id,name,parent)=>({id,name,folder:{},parentReference:{driveId:'drive',id:parent}});
 const state={context:'tenant/account-a/user',siteId:'site',driveId:'drive',missingStatus:404,
  folders:new Map([
   ['great',folder('great','Great','library')],['replacement',folder('replacement','Great','library')],
   ['projects',folder('projects','Projekt','great')],['order',folder('order','Order 24','projects')],
   ['outside',folder('outside','Utanför','library')],['library',{id:'library',name:'Dokument',folder:{},root:{},parentReference:{driveId:'drive'}}]
  ]),paths:new Map([['Great','great'],['Other','outside']]),children:new Map([['great',[{id:'projects',name:'Projekt',folder:{}}]]])};
 const create=()=>new SharePointFiles({rootStore:storageOverride||rootStore,getContextKey:()=>state.context,getToken:async()=> 'read-secret',fetchImpl:async(url,request)=>{
  const path=decodeURIComponent(new URL(url).pathname);calls.push(path);
  assert.equal(request.method,'GET');assert.equal(request.cache,'no-store');
  if(path==='/v1.0/sites/tillsyno.sharepoint.com:/sites/Tillsyno')return json({id:state.siteId,webUrl:rootConfig.siteUrl});
  if(path==='/v1.0/sites/'+state.siteId+'/drives')return json({value:[{id:state.driveId,webUrl:rootConfig.siteUrl+'/Delade dokument'}]});
  const named=/\/root:\/(.+)$/u.exec(path);
  const item=/\/items\/([^/]+)(\/children)?$/u.exec(path);
  const id=named?state.paths.get(named[1]):item?.[1];
  if(item?.[2])return json({value:state.children.get(id)||[]});
  return state.folders.has(id)?json(state.folders.get(id)):new Response('',{status:state.missingStatus});
 }});
 return {state,calls,data,rootStore,create};
}

test('Great keeps its verified ID across rename, reload and a new same-name folder; refresh sees new children',async()=>{
 const {state,calls,data,create}=folderFixture(),first=create();
 assert.deepEqual(await first.root(rootConfig),{driveId:'drive',id:'great',name:'Great'});
 state.folders.get('great').name='Great – nytt namn';state.paths.set('Great','replacement');
 state.children.get('great').push({id:'service',name:'Service',folder:{}});
 state.folders.set('service',{id:'service',name:'Service',folder:{},parentReference:{driveId:'drive',id:'great'}});
 const reloaded=create(),root=await reloaded.root(rootConfig);
 assert.deepEqual(root,{driveId:'drive',id:'great',name:'Great – nytt namn'});
 assert.deepEqual((await reloaded.children(root.driveId,root.id)).map(item=>item.id),['projects','service']);
 assert.deepEqual(await reloaded.folderTrail(root,'order'),[{id:'great',name:'Great – nytt namn'},{id:'projects',name:'Projekt'},{id:'order',name:'Order 24'}]);
 assert.equal(calls.filter(path=>path.includes('/root:/')).length,1,'a renamed root is never resolved again by name');
 assert.equal(calls.filter(path=>path.endsWith('/drives')).length,2,'current library is reverified after reload');
 assert.equal(data.size,1);assert.equal([...data.values()].some(value=>value.includes('secret')),false);
 state.children.get('great').push({id:'drawing',name:'Ny ritning.pdf',file:{},size:100});
 await reloaded.root(rootConfig);
 assert.equal((await reloaded.children(root.driveId,root.id)).at(-1).id,'drawing','a repeated listing is fresh');
});

test('Root references are scoped to Microsoft/Tillsyno identity and configured folder path',async()=>{
 const {state,data,create}=folderFixture(),client=create();
 assert.equal((await client.root(rootConfig)).id,'great');
 state.context='tenant/account-b/user';state.paths.set('Great','replacement');
 assert.equal((await client.root(rootConfig)).id,'replacement');
 state.context='tenant/account-a/user';
 assert.equal((await create().root(rootConfig)).id,'great');
 assert.equal((await client.root({...rootConfig,folderPath:'Other'})).id,'outside');
 assert.equal(data.size,3);
});

test('Unavailable Storage falls back to a fixed in-memory root for the current session',async()=>{
 for(const failing of ['getItem','setItem']){
  const storage={getItem:()=>null,setItem:()=>{}};
  storage[failing]=()=>{throw new DOMException('Storage unavailable',failing==='getItem'?'SecurityError':'QuotaExceededError');};
  const {state,calls,create}=folderFixture(storage),client=create();
  assert.equal((await client.root(rootConfig)).id,'great');
  state.folders.get('great').name='Omdöpt';state.paths.set('Great','replacement');
  assert.deepEqual(await client.root(rootConfig),{driveId:'drive',id:'great',name:'Omdöpt'});
  assert.equal(calls.filter(path=>path.includes('/root:')).length,1);
  state.folders.delete('great');
  await assert.rejects(()=>client.root(rootConfig),error=>error.code==='root_missing');
 }
});

test('Deleted cached roots fail closed without selecting a replacement name or the library root',async()=>{
 for(const status of [404,410]){
  const {state,calls,create}=folderFixture();await create().root(rootConfig);
  state.folders.delete('great');state.paths.set('Great','replacement');state.missingStatus=status;
  const start=calls.length;
  await assert.rejects(()=>create().root(rootConfig),error=>error.code==='root_missing'&&/Ingen ny mapp/u.test(error.message));
  assert.equal(calls.slice(start).some(path=>path.includes('/root:')),false);
 }
});

test('Changed libraries, bad cached references and non-folder roots cannot silently rebind',async()=>{
 const changed=folderFixture();await changed.create().root(rootConfig);changed.state.driveId='new-drive';
 await assert.rejects(()=>changed.create().root(rootConfig),error=>error.code==='root_changed');
 for(const mutate of [item=>{item.remoteItem={};},item=>{item.deleted={};},item=>{item.file={};},item=>{item.root={};},item=>{item.parentReference.driveId='other-drive';},item=>{item.id='other-id';}]){
  const setup=folderFixture();await setup.create().root(rootConfig);mutate(setup.state.folders.get('great'));
  await assert.rejects(()=>setup.create().root(rootConfig),error=>error.code==='invalid_destination');
  assert.equal(setup.calls.filter(path=>path.includes('/root:')).length,1);
 }
 const corrupted=folderFixture();await corrupted.create().root(rootConfig);
 const key=[...corrupted.data.keys()][0];corrupted.data.set(key,'not valid JSON');
 const before=corrupted.calls.length;
 await assert.rejects(()=>corrupted.create().root(rootConfig),error=>error.code==='invalid_root_reference');
 assert.equal(corrupted.calls.length,before);
});

test('Folder trails reject outside, moved, shortcut, cycle and wrong-drive ancestors',async()=>{
 for(const kind of ['outside','moved','shortcut','cycle','drive']){
  const {state,create}=folderFixture(),client=create(),root=await client.root(rootConfig);
  const parent=state.folders.get('projects');
  if(kind==='moved')parent.parentReference.id='outside';
  if(kind==='shortcut')parent.remoteItem={id:'other'};
  if(kind==='cycle')parent.parentReference.id='order';
  if(kind==='drive')parent.parentReference.driveId='another-drive';
  await assert.rejects(()=>client.folderTrail(root,kind==='outside'?'outside':'order'),error=>error.code==='invalid_destination',kind);
 }
});

test('An account change during root resolution does not persist a cross-account root',async()=>{
 let context='account-a',stored=0;
 const client=new SharePointFiles({getToken:async()=> 'r',getContextKey:()=>context,rootStore:{getItem:()=>null,setItem:()=>stored++},fetchImpl:async()=>{
  context='account-b';return json({id:'site',webUrl:rootConfig.siteUrl});
 }});
 await assert.rejects(()=>client.root(rootConfig),error=>error.code==='access_changed');assert.equal(stored,0);
});

test('Whole-app reading defaults to 200 MiB while the standalone diagnostic stays at 25 MiB',()=>{
 assert.equal(new SharePointFiles({getToken:async()=> 'r'}).maxBytes,200*1024*1024);
 assert.equal(new ReadOnlySharePoint({getToken:async()=> 'r'}).maxBytes,25*1024*1024);
 assert.throws(()=>new SharePointFiles({getToken:async()=> 'r',maxBytes:MAX_FILE_BYTES+1}));
});

function downloadFixture(size){
 let streamController,downloadSignal,cancelledStream=false;
 const progress=[],waiters=new Map();
 const stream=new ReadableStream({start(controller){streamController=controller;},cancel(){cancelledStream=true;}});
 const client=new SharePointFiles({getToken:async()=> 'read',fetchImpl:async(url,options)=>{
  if(url.includes('graph.microsoft.com'))return json({id:'item',name:'project.pdf',size,file:{},parentReference:{driveId:'drive',id:'folder'},eTag:'"v1"','@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download'});
  downloadSignal=options.signal;assert.equal(options.headers,undefined);return new Response(stream);
 }});
 const onProgress=value=>{progress.push(value);waiters.get(value.loaded)?.();};
 const loaded=amount=>progress.some(value=>value.loaded===amount)?Promise.resolve():new Promise(resolve=>waiters.set(amount,resolve));
 return {client,progress,onProgress,loaded,enqueue:text=>streamController.enqueue(new TextEncoder().encode(text)),close:()=>streamController.close(),get cancelledStream(){return cancelledStream;},get downloadSignal(){return downloadSignal;}};
}

test('Download progress follows original bytes and active chunks renew the idle deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const setup=downloadFixture(13),pending=setup.client.fileWithSource('drive','item','.pdf',{onProgress:setup.onProgress});
 setup.enqueue('%PDF-');await setup.loaded(5);
 t.mock.timers.tick(119000);
 setup.enqueue('1.7');await setup.loaded(8);
 t.mock.timers.tick(119000);
 setup.enqueue('\ntest');setup.close();
 assert.equal(await (await pending).file.text(),'%PDF-1.7\ntest');
 assert.equal(setup.downloadSignal.aborted,false,'continuous progress is not a total-transfer timeout');
 assert.deepEqual(setup.progress,[{loaded:0,total:13},{loaded:5,total:13},{loaded:8,total:13},{loaded:13,total:13}]);
});

test('A stalled download times out on inactivity without waiting for real minutes',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const setup=downloadFixture(13),pending=setup.client.fileWithSource('drive','item','.pdf',{onProgress:setup.onProgress});
 setup.enqueue('%PDF-');await setup.loaded(5);
 t.mock.timers.tick(120000);
 await assert.rejects(()=>pending,error=>error.code==='download_timeout');
 assert.equal(setup.cancelledStream,true);assert.equal(setup.downloadSignal.aborted,true);
 assert.equal(setup.progress.at(-1).loaded,5);
});

test('Aborting a download stops its stream and cannot yield a partial file or later completion',async()=>{
 const controller=new AbortController(),setup=downloadFixture(13);
 const pending=setup.client.fileWithSource('drive','item','.pdf',{signal:controller.signal,onProgress:setup.onProgress});
 setup.enqueue('%PDF-');await setup.loaded(5);controller.abort();
 await assert.rejects(()=>pending,error=>error.code==='cancelled'&&error.name==='AbortError');
 assert.equal(setup.cancelledStream,true);assert.equal(setup.downloadSignal.aborted,true);
 assert.deepEqual(setup.progress,[{loaded:0,total:13},{loaded:5,total:13}]);
 let calls=0;const client=new SharePointFiles({getToken:async()=> 'r',fetchImpl:async()=>{calls++;throw Error('unexpected fetch');}});
 await assert.rejects(()=>client.fileWithSource('drive','item','.pdf',{signal:controller.signal}),error=>error.code==='cancelled');
 assert.equal(calls,0);
});
