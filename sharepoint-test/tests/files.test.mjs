import test from 'node:test';
import assert from 'node:assert/strict';
import {SharePointFiles,accepts} from '../src/file-client.mjs';
const json=x=>Response.json(x);
test('File matching follows the chosen app input, not arbitrary file names',()=>{
 assert.ok(accepts('Dörr.PDF','application/pdf,.pdf'));
 assert.ok(accepts('bild.JPG','image/*'));assert.ok(accepts('projekt.zip','.pdf,.zip'));
 assert.equal(accepts('virus.exe',''),false);assert.equal(accepts('bild.png','.pdf'),false);assert.equal(accepts('a.pdf.exe','.pdf'),false);
});
test('Folder root resolves only the configured site and library',async()=>{
 const replies=[{id:'s',webUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno'},{value:[{id:'d',webUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno/Delade%20dokument'}]},{id:'f',name:'GStest',folder:{}}];
 const calls=[];const c=new SharePointFiles({getToken:async()=> 's',fetchImpl:async u=>{calls.push(u);return json(replies.shift());}});
 assert.deepEqual(await c.root({siteUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno',libraryServerRelativePath:'/sites/Tillsyno/Delade dokument',folderPath:'GStest'}),{driveId:'d',id:'f',name:'GStest'});
 assert.match(calls[2],/root:\/GStest/);
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
 for(const item of [{name:'a.exe',size:1},{name:'a.pdf',size:26*1024*1024},{name:'a.pdf',size:1,'@microsoft.graph.downloadUrl':'https://evil.example/file'}]){
  let n=0;const c=new SharePointFiles({getToken:async()=> 's',fetchImpl:async()=>{n++;return json({...item,file:{}});}});
  await assert.rejects(()=>c.file('d','i','.pdf'));assert.equal(n,1);
 }
 const c=new SharePointFiles({getToken:async()=> 's',fetchImpl:async u=>u.includes('graph.microsoft.com')?json({name:'a.pdf',file:{},size:5,'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download'}):new Response('hello')});
 await assert.rejects(()=>c.file('d','i','.pdf'),/PDF-signatur/);
});
test('Missing download annotation retries full metadata and keeps file size checks',async()=>{
 let n=0;const c=new SharePointFiles({getToken:async()=> 's',fetchImpl:async()=>json(++n===1?{name:'a.pdf',file:{},size:8}:{name:'a.pdf',file:{},size:27*1024*1024,'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download'})});
 await assert.rejects(()=>c.file('d','i','.pdf'),/25 MB/);assert.equal(n,2);
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
