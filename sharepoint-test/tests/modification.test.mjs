import test from 'node:test';
import assert from 'node:assert/strict';
import {SharePointFiles,serverModification} from '../src/file-client.mjs';
import {SharePointWriter} from '../src/write-client.mjs';
import {lastModifiedText} from '../src/ui.mjs';

const modified={lastModifiedBy:{user:{displayName:'Serverns kollega'}},lastModifiedDateTime:'2026-10-20T10:42:00Z'};

test('Server modification data keeps only the supplied user name and timestamp',()=>{
 const input={...modified,lastModifiedBy:{user:{id:'person-id',displayName:'  Åsa\tÖberg\u202e  '},application:{displayName:'Upload app'}},accessToken:'not-metadata'};
 assert.deepEqual(serverModification(input),{lastModifiedBy:{user:{displayName:'Åsa Öberg'}},lastModifiedDateTime:modified.lastModifiedDateTime});
 assert.equal(input.lastModifiedBy.user.displayName,'  Åsa\tÖberg\u202e  ','formatting never mutates Graph metadata');
 const long=serverModification({lastModifiedBy:{user:{displayName:'😀'.repeat(160)}}}).lastModifiedBy.user.displayName;
 assert.equal(Array.from(long).length,120);assert.ok(long.endsWith('…'));
});

test('Missing names and malformed dates stay neutral without using an application, account or current time',()=>{
 for(const input of [undefined,{},
  {lastModifiedBy:{application:{displayName:'Not a person'}},lastModifiedDateTime:'not-a-date'},
  {lastModifiedBy:{user:{displayName:{toString:()=> 'Browser account'}}},lastModifiedDateTime:Date.now()},
  {lastModifiedBy:{user:{displayName:'\u0000\u202e\n'}},lastModifiedDateTime:'2026-10-20T10:42:00'}
 ])assert.equal(lastModifiedText(input),'Senast ändrad i SharePoint: namn saknas · tid saknas');
 assert.equal(lastModifiedText({lastModifiedBy:modified.lastModifiedBy}),'Senast ändrad i SharePoint: Serverns kollega · tid saknas');
});

test('Display names remain literal text, including text resembling HTML',()=>{
 const name='<img src=x onerror=alert(1)> & Åsa';
 assert.equal(lastModifiedText({lastModifiedBy:{user:{displayName:name}}}),'Senast ändrad i SharePoint: '+name+' · tid saknas');
});

test('Swedish dates use the local timezone rather than a fixed Swedish or UTC timezone',()=>{
 const previous=process.env.TZ;
 try{
  process.env.TZ='Europe/Stockholm';
  assert.match(lastModifiedText(modified).replace(/\s+/gu,' '),/^Senast ändrad i SharePoint: Serverns kollega · 20 okt\.? 2026 12:42$/u);
  process.env.TZ='America/Los_Angeles';
  assert.match(lastModifiedText(modified).replace(/\s+/gu,' '),/^Senast ändrad i SharePoint: Serverns kollega · 20 okt\.? 2026 03:42$/u);
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

test('The existing children request asks Graph for modification metadata and preserves it for display',async()=>{
 const calls=[],item={id:'project',name:'Projekt.pdf',size:8,file:{},...modified};
 const client=new SharePointFiles({getToken:async()=> 'read-token',fetchImpl:async(url,request)=>{
  const parsed=new URL(url);calls.push(parsed);
  assert.equal(request.method,'GET');assert.equal(parsed.pathname,'/v1.0/drives/drive/items/great/children');
  assert.ok(parsed.searchParams.get('$select').split(',').includes('lastModifiedBy'));
  assert.ok(parsed.searchParams.get('$select').split(',').includes('lastModifiedDateTime'));
  return Response.json({value:[item]});
 }});
 assert.deepEqual(await client.children('drive','great'),[item]);assert.equal(calls.length,1);
});

function saveFixture(readbackMetadata){
 const config={siteUrl:'https://tillsyno.sharepoint.com/sites/Tillsyno',libraryServerRelativePath:'/sites/Tillsyno/Delade dokument',folderPath:'Great'};
 const blob=new Blob(['%PDF-test'],{type:'application/pdf'});
 const source={driveId:'drive',id:'project',parentId:'great',name:'Projekt.pdf',eTag:'"before"'};
 const folder={id:'great',name:'Great',folder:{},parentReference:{driveId:'drive',id:'library-root'}};
 const uploadUrl='https://tillsyno.sharepoint.com/upload/modification-test';
 const state={saved:false,id:null,name:null,methods:[],verifiedReads:0};
 const item=(metadata={})=>({id:state.id||source.id,name:state.name||source.name,size:blob.size,eTag:state.saved?'"after"':source.eTag,file:{},parentReference:{driveId:'drive',id:'great'},...metadata});
 const client=new SharePointWriter({getToken:async()=> 'read-token',getWriteToken:async()=> 'write-token',guard:async()=> 'browser-account',fetchImpl:async(url,request)=>{
  const parsed=new URL(url);state.methods.push(request.method);
  if(url===uploadUrl){
   assert.equal(request.method,'PUT');state.saved=true;
   return Response.json(item({lastModifiedBy:{user:{displayName:'Unverified PUT author'}},lastModifiedDateTime:'2026-10-19T01:02:00Z'}),{status:200});
  }
  assert.equal(parsed.origin,'https://graph.microsoft.com');
  if(request.method==='POST'){
   const body=JSON.parse(request.body),existing=parsed.pathname==='/v1.0/drives/drive/items/project/createUploadSession';
   state.id=existing?'project':'copy';state.name=existing?source.name:body.item.name;
   if(existing)assert.equal(request.headers['If-Match'],source.eTag);
   else assert.equal(body.item['@microsoft.graph.conflictBehavior'],'fail');
   return Response.json({uploadUrl,expirationDateTime:new Date(Date.now()+600000).toISOString()});
  }
  assert.equal(request.method,'GET');
  if(parsed.pathname==='/v1.0/sites/tillsyno.sharepoint.com:/sites/Tillsyno')return Response.json({id:'site',webUrl:config.siteUrl});
  if(parsed.pathname==='/v1.0/sites/site/drives')return Response.json({value:[{id:'drive',webUrl:config.siteUrl+'/Delade%20dokument'}]});
  if(['/v1.0/drives/drive/root:/Great','/v1.0/drives/drive/items/great'].includes(parsed.pathname))return Response.json(folder);
  if(decodeURIComponent(parsed.pathname)==='/v1.0/drives/drive/items/great:/Projekt.pdf')return Response.json(item());
  assert.ok(['/v1.0/drives/drive/items/project','/v1.0/drives/drive/items/copy'].includes(parsed.pathname),parsed.pathname);
  if(state.saved){
   const fields=parsed.searchParams.get('$select')?.split(',')||[];
   assert.ok(fields.includes('lastModifiedBy'));assert.ok(fields.includes('lastModifiedDateTime'));
   state.verifiedReads++;return Response.json(item(readbackMetadata));
  }
  return Response.json(item());
 }});
 return {client,state,options:{config,blob,source,destination:{driveId:'drive',id:'great'},name:source.name}};
}

test('Copy, existing-ID and named-save receipts use only the final verified Graph GET author and time',async()=>{
 for(const method of ['saveCopy','saveExisting','saveNamed']){
  const {client,state,options}=saveFixture(modified);
  if(method!=='saveExisting')delete options.source;
  if(method==='saveCopy')options.name='Kopia.pdf';
  const receipt=await client[method](options);
  assert.deepEqual(serverModification(receipt),modified,method);
  assert.equal(receipt.eTag,'"after"');assert.equal(state.verifiedReads,1);
  assert.equal(JSON.stringify(receipt).includes('Unverified PUT author'),false);
  assert.equal(state.methods.some(verb=>!['GET','POST','PUT'].includes(verb)),false);
 }
});

test('Missing final GET metadata never falls back to the upload response or logged-in identity',async()=>{
 const {client,options}=saveFixture({});delete options.source;
 const receipt=await client.saveCopy(options);
 assert.equal(receipt.lastModifiedBy,undefined);assert.equal(receipt.lastModifiedDateTime,undefined);
 assert.equal(lastModifiedText(receipt),'Senast ändrad i SharePoint: namn saknas · tid saknas');
});
