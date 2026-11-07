import test from 'node:test';
import assert from 'node:assert/strict';
import {ReadOnlySharePoint,graphUrl,safeDownloadUrl,canonicalUrl} from '../src/read-only.mjs';
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
test('Graph URL preserves v1.0 and blocks token exfiltration origins',()=>{
 assert.equal(graphUrl('/v1.0/sites/a'),'https://graph.microsoft.com/v1.0/sites/a');
 for(const url of ['https://evil.example/v1.0/','//evil.example/v1.0/','https://graph.microsoft.com.evil.example/v1.0/','/v1.0/../beta/sites','https://user@graph.microsoft.com/v1.0/'])assert.throws(()=>graphUrl(url));
});
test('Download allowlist rejects insecure or unrelated hosts',()=>{
 assert.equal(safeDownloadUrl('https://tillsyno.sharepoint.com/file?q=1'),'https://tillsyno.sharepoint.com/file?q=1');
 for(const u of ['http://tillsyno.sharepoint.com/file','https://sharepoint.com.evil.example/file','https://evil.example/file','javascript:alert(1)'])assert.throws(()=>safeDownloadUrl(u));
});
test('Library path decodes spaces, not arbitrary display names',()=>assert.equal(canonicalUrl('https://tillsyno.sharepoint.com/sites/Tillsyno/Delade%20dokument/'),'https://tillsyno.sharepoint.com/sites/Tillsyno/Delade dokument'));
test('Bad Graph URL is rejected before retrieving token',async()=>{
 let called=false;const c=new ReadOnlySharePoint({getToken:async()=>{called=true;return 'secret';}});
 await assert.rejects(()=>c.json('https://evil.example/v1.0/'));assert.equal(called,false);
});
test('Only GET is used with no cache and no credential redirects',async()=>{
 const c=new ReadOnlySharePoint({getToken:async()=> 'secret',fetchImpl:async(u,o)=>{assert.equal(o.method,'GET');assert.equal(o.redirect,'error');assert.equal(o.cache,'no-store');assert.equal(o.credentials,'omit');assert.equal(o.headers.Authorization,'Bearer secret');return json({ok:true});}});
 assert.deepEqual(await c.json('/v1.0/sites/a'),{ok:true});assert.equal(c.saveNewPdf,undefined);
});
test('401 and 403 have actionable failures',async()=>{
 for(const code of [401,403]){const c=new ReadOnlySharePoint({getToken:async()=> 'secret',fetchImpl:async()=>new Response('',{status:code})});await assert.rejects(()=>c.json('/v1.0/sites/a'),e=>e.status===code);}
});
test('Pagination works and repeated links fail closed',async()=>{
 let n=0;const c=new ReadOnlySharePoint({getToken:async()=> 's',fetchImpl:async()=>json(++n===1?{value:[1],'@odata.nextLink':'https://graph.microsoft.com/v1.0/next'}:{value:[2]})});
 assert.deepEqual(await c.all('/v1.0/start'),[1,2]);
 c.fetch=async()=>json({value:[],'@odata.nextLink':'https://graph.microsoft.com/v1.0/start'});await assert.rejects(()=>c.all('/v1.0/start'));
});
test('Malicious pagination cannot receive a credential',async()=>{
 let n=0;const c=new ReadOnlySharePoint({getToken:async()=> 's',fetchImpl:async()=>{n++;return json({value:[],'@odata.nextLink':'https://evil.example/v1.0/'});}});
 await assert.rejects(()=>c.all('/v1.0/start'));assert.equal(n,1);
});
test('Configured folder resolution finds correct library and PDF only',async()=>{
 const replies=[{id:'site',webUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno'},{value:[{id:'drive',webUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno/Delade%20dokument'}]},{value:[{id:'pdf',name:'test.pdf',file:{}},{id:'x',name:'x.txt',file:{}},{id:'folder',name:'dir.pdf',folder:{}}]}];
 const c=new ReadOnlySharePoint({getToken:async()=> 's',fetchImpl:async(u)=>{assert.ok(u.startsWith('https://graph.microsoft.com/v1.0/'));return json(replies.shift());}});
 const v=await c.folder({siteUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno',libraryServerRelativePath:'/sites/Tillsyno/Delade dokument',folderPath:'GStest'});assert.equal(v.driveId,'drive');assert.equal(v.files.length,1);
});
test('PDF download never forwards bearer header or download URL in returned result',async()=>{
 const calls=[];const c=new ReadOnlySharePoint({getToken:async()=> 's',fetchImpl:async(u,o)=>{calls.push([u,o]);return calls.length===1?json({id:'p',name:'test.pdf',file:{},size:9,'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download?temporary=secret'}):new Response('%PDF-1.7');}});
 const v=await c.pdf('drive','p');assert.equal(v.name,'test.pdf');assert.equal(calls[1][1].headers,undefined);assert.equal(calls[1][1].referrerPolicy,'no-referrer');assert.equal(v.url,undefined);assert.equal(await v.blob.text(),'%PDF-1.7');
});
test('Oversize metadata prevents download',async()=>{
 let n=0;const c=new ReadOnlySharePoint({getToken:async()=> 's',maxBytes:4,fetchImpl:async()=>{n++;return json({name:'a.pdf',file:{},size:5});}});await assert.rejects(()=>c.pdf('d','i'));assert.equal(n,1);
});
test('Actual byte limit rejects undersized metadata and non-PDF data',async()=>{
 for(const body of ['%PDF-more-than-five','hello']){let n=0;const c=new ReadOnlySharePoint({getToken:async()=> 's',maxBytes:5,fetchImpl:async()=>++n===1?json({name:'a.pdf',file:{},size:1,'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download'}):new Response(body)});await assert.rejects(()=>c.pdf('d','i'));}
});

test('Missing projected download URL retries full metadata before downloading',async()=>{
 const calls=[];const metadata={name:'a.pdf',file:{},size:8};
 const c=new ReadOnlySharePoint({getToken:async()=> 's',fetchImpl:async(u,o)=>{
  calls.push([u,o]);
  if(calls.length===1)return json(metadata);
  if(calls.length===2)return json({...metadata,'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/download'});
  return new Response('%PDF-1.7');
 }});
 assert.equal(await (await c.pdf('d','i')).blob.text(),'%PDF-1.7');
 assert.equal(calls[1][0],'https://graph.microsoft.com/v1.0/drives/d/items/i');
 assert.equal(calls[2][1].headers,undefined);
});
test('Missing URL after retry fails clearly without downloading',async()=>{
 let calls=0; const c=new ReadOnlySharePoint({getToken:async()=> 's',fetchImpl:async()=>{calls++;return json({name:'a.pdf',file:{},size:8});}});
 await assert.rejects(()=>c.pdf('d','i'),/ingen nedladdningsadress/);assert.equal(calls,2);
});
test('Malformed download URLs fail without leaking their contents',()=>{
 for(const value of [undefined,null,'',{},'not-a-url-secret']){
  assert.throws(()=>safeDownloadUrl(value),e=>!e.message.includes('secret') && /nedladdningsadress/.test(e.message));
 }
});
