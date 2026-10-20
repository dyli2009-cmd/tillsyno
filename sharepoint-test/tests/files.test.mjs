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
