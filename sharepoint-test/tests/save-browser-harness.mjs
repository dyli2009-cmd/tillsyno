// Synthetic local browser harness. Every non-local network request is intercepted.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createServer as createSecureServer} from 'node:https';
import {createReadStream} from 'node:fs';
import {appendFile,readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';

const project = fileURLToPath(new URL('../', import.meta.url));
export const TENANT = '23d1ec30-32c7-404c-92f4-22415c2bf2dd';
export const SITE = 'https://tillsyno.sharepoint.com/sites/Tillsyno';

export const fixtureScript = String.raw`
window.__saveBrowser = {
  tenantId: '${TENANT}',
  access: {role:'admin', userId:'browser-test-user',email:'browser-test@example.invalid'}, permitted:true,
  msal:{calls:[],cached:false,requireWritePopup:true},
  exports:[], nativePickerCalls:[], nativeShares:[], directWrites:0, errors:[]
};
window.TillsynoAuth = {
  verify:async()=>({...window.__saveBrowser.access}),
  permitted:()=>window.__saveBrowser.permitted,
  logout:async()=>{},
  client:{rpc:async(name,parameters)=>{
    if(name!=='tillsyno_verify_read_code'||parameters?.p_pin!=='1234')throw Error('Only the synthetic fixture PIN is accepted.');
    return {data:{ok:true},error:null};
  }}
};
window.addEventListener('unhandledrejection',event=>{
  window.__saveBrowser.errors.push(String(event.reason?.message||event.reason));
});
window.showSaveFilePicker = async options => {
  window.__saveBrowser.nativePickerCalls.push({suggestedName:options?.suggestedName});
  const directory=await navigator.storage.getDirectory();
  return directory.getFileHandle(options?.suggestedName||'local-copy.pdf',{create:true});
};
Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
  const files=[];
  for(const file of data.files||[])files.push({name:file.name,type:file.type,bytes:Array.from(new Uint8Array(await file.arrayBuffer()))});
  window.__saveBrowser.nativeShares.push({title:data.title,files});
}});
window.__startExport = async function(kind='picker',name='Synthetic protocol.pdf',options={}){
  const state={kind,name,state:'preparing'};
  window.__saveBrowser.exports.push(state);
  const response=await fetch('/fixture.pdf');
  const original=await response.blob();
  let blob=original;
  if(options.size){
    // Reuse immutable Blob parts; never allocate a 200 MiB JavaScript array just
    // to prove the size gate rejects an over-limit export.
    let padding=new Blob([new Uint8Array(1024)]);
    while(padding.size<options.size)padding=new Blob([padding,padding]);
    blob=padding.slice(0,options.size,'application/pdf');
  }
  state.bytes=blob.size;
  try{
    if(kind==='anchor'){
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=name;
      state.state='awaiting-destination';
      a.click();
      URL.revokeObjectURL(url); // Match the actual exporters' short-lived Blob URL.
      return;
    }
    if(kind==='share'){
      state.state='awaiting-destination';
      await navigator.share({title:'Synthetic browser protocol',files:[new File([blob],name,{type:blob.type})]});
    }else{
      const handle=await showSaveFilePicker({suggestedName:name,types:[{description:'PDF',accept:{'application/pdf':['.pdf']}}]});
      const writable=await handle.createWritable();
      await writable.write(blob);
      state.state='awaiting-destination';
      await writable.close();
      state.handleName=handle.name;
      if(handle.getFile){const file=await handle.getFile();state.returnedBytes=Array.from(new Uint8Array(await file.arrayBuffer()));}
    }
    state.state='saved';
  }catch(error){state.state=error?.name==='AbortError'?'cancelled':'error';state.error=error?.message||String(error);}
};
document.querySelector('#smartExportSaveObject').onclick=()=>{window.__saveBrowser.directWrites++;};
document.querySelector('#smartExportSaveAs').onclick=()=>void window.__startExport('picker','Fresh copy.pdf');
`;

export async function createHarnessServer(pdfBytes,options={}) {
  const {build}=await import('esbuild');
  const result = await build({
    absWorkingDir: project,
    entryPoints: ['src/app.mjs'], bundle: true, write: false,
    format: 'iife', platform: 'browser', target: ['es2020'],
    plugins: [{name: 'fixture-msal', setup(plugin) {
      plugin.onResolve({filter: /^@azure\/msal-browser$/}, () => ({path: fileURLToPath(new URL('./save-browser.msal-stub.mjs', import.meta.url))}));
    }}],
  });
  const app = result.outputFiles[0].contents;
  const config = JSON.parse(await readFile(project + 'auth-config.json', 'utf8'));
  const server = createServer(async(request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/app.bundle.js'||options.realPage&&path==='/sharepoint-test/app.js') {
      response.writeHead(200, {'Content-Type':'text/javascript'}); response.end(app);
    } else if (path === '/fixture.pdf') {
      response.writeHead(200, {'Content-Type':'application/pdf'});
      if(typeof pdfBytes==='string')createReadStream(pdfBytes).pipe(response);else response.end(pdfBytes);
    } else if (path === '/sharepoint-test/auth-config.json') {
      const adjusted = structuredClone(config);
      adjusted.msal.auth.redirectUri = 'http://127.0.0.1:' + server.address().port + '/sharepoint-test/auth-callback.html';
      response.writeHead(200, {'Content-Type':'application/json'}); response.end(JSON.stringify(adjusted));
    } else if (path === '/sharepoint-test/app.css') {
      readFile(project+'app.css').then(css=>{response.writeHead(200,{'Content-Type':'text/css'});response.end(css);}).catch(()=>response.end());
    } else if(options.realPage&&path==='/auth/client.js'){
      const script=fixtureScript.slice(0,fixtureScript.indexOf("document.querySelector('#smartExportSaveObject').onclick"));
      response.writeHead(200,{'Content-Type':'text/javascript'});response.end(script);
    } else if(options.realPage){
      const repo=resolve(project,'..'),filename=resolve(repo,decodeURIComponent(path).replace(/^\//,''));
      if(!filename.startsWith(repo+sep)){response.writeHead(403);response.end();return;}
      try{
        const bytes=await readFile(filename);
        response.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[extname(filename)]||'application/octet-stream'});
        response.end(bytes);
      }catch{response.writeHead(404);response.end();}
    } else {
      response.writeHead(200, {'Content-Type':'text/html'});
      response.end(`<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/sharepoint-test/app.css"></head><body data-sharepoint-module="smartmatch"><main><h1>Synthetic export integration fixture</h1><input id="localSource" type="file" accept=".pdf"><button id="smartExportSaveObject" type="button">Spara objekt</button><button id="smartExportSaveAs" type="button">Spara som</button></main><script>${fixtureScript}</script><script src="/app.bundle.js"></script></body></html>`);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    base: 'http://127.0.0.1:' + server.address().port,
    close: () => new Promise((resolve,reject)=>{server.closeAllConnections();server.close(error=>error?reject(error):resolve());}),
  };
}

function latch() {
  let release;
  const promise = new Promise(resolve => { release=resolve; });
  return {promise, release};
}

export class GraphFixture {
  constructor(options={}) {
    this.options=options; this.requests=[]; this.chunks=[]; this.sessionCount=0;this.copyCount=0;this.sessions=[];
    this.files=new Map();this.contents=new Map();
    this.folders=new Map([
      ['library-root',{id:'library-root',name:'Documents',folder:{},root:{},parentReference:{driveId:'drive-test'}}],
      ['root-folder',{id:'root-folder',name:'Great',folder:{},parentReference:{driveId:'drive-test',id:'library-root'}}],
      ['child-folder',{id:'child-folder',name:'Projekt',folder:{},parentReference:{driveId:'drive-test',id:'root-folder'}}],
      ['service-folder',{id:'service-folder',name:'Service',folder:{},parentReference:{driveId:'drive-test',id:'root-folder'}}],
      ['orders-folder',{id:'orders-folder',name:'Ordrar',folder:{},parentReference:{driveId:'drive-test',id:'root-folder'}}],
      ['nested-folder',{id:'nested-folder',name:'Etapp 1 – Västra huset',folder:{},parentReference:{driveId:'drive-test',id:'child-folder'}}],
      ['outside-folder',{id:'outside-folder',name:'Outside',folder:{},parentReference:{driveId:'drive-test',id:'library-root'}}],
    ]);
    this.rootLookups=0;
    if(options.sourceBytes||options.sourcePath){
      this.addFile({id:'source-item',name:options.sourceName||'Existing project.pdf',size:options.sourceSize||options.sourceBytes?.length,source:options.sourcePath||options.sourceBytes,parentId:options.sourceParentId||'root-folder',eTag:'"source-v1"'});
    }else{
      this.addFile({id:'existing-file',name:'Existing.pdf',size:10,parentId:'root-folder'});
    }
    this.uploadReceived=latch();this.uploadRelease=latch();
    this.readbackReceived=latch();this.readbackRelease=latch();
    this.name='';this.parent='root-folder';this.size=0;
  }
  get writes(){return this.requests.filter(request=>request.method!=='GET');}
  get bytes(){assert.ok(!this.options.diskRoot,'Large fixture bytes stay on disk; do not concatenate all chunks.');return Buffer.concat(this.chunks.map(chunk=>chunk.bytes));}
  item() { return this.active?.receipt||{id:this.active?.id||'saved-item',name:this.name,size:this.size,eTag:'"saved-'+this.sessionCount+'"',file:{mimeType:'application/pdf'},parentReference:{driveId:'drive-test',id:this.parent},webUrl:SITE+'/Delade%20dokument/Great/'+encodeURIComponent(this.name),...this.options.putMetadata}; }
  addFile({id,name,size,source,parentId='root-folder',eTag='"fixture-v1"'}){
    const item={id,name,size:size??source?.length??0,eTag,file:{mimeType:'application/pdf'},parentReference:{driveId:'drive-test',id:parentId},webUrl:SITE+'/Delade%20dokument/Great/'+encodeURIComponent(name)};
    this.files.set(id,item);if(source)this.contents.set(id,source);return item;
  }
  folder(id) {return this.folders.get(id);}
  children(id){return [...this.folders.values(),...this.files.values()].filter(item=>item.parentReference?.id===id);}
  async startStreamServer(){
    if(!this.options.diskRoot||this.streamServer)return;
    // Playwright route.fulfill serializes a response as one base64 message.
    // A local HTTPS stream avoids that extra giant protocol message for the
    // large regression while keeping every real Microsoft request intercepted.
    const keyPath=resolve(this.options.diskRoot,'fixture-key.pem'),certPath=resolve(this.options.diskRoot,'fixture-cert.pem');
    await promisify(execFile)('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyPath,'-out',certPath,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost']);
    const server=createSecureServer({key:await readFile(keyPath),cert:await readFile(certPath)},async(request,response)=>{
      const url=new URL(request.url,'https://localhost');
      if(!url.pathname.startsWith('/_api/test-download/')){response.writeHead(404);response.end();return;}
      const id=decodeURIComponent(url.pathname.split('/').at(-1)),content=this.contents.get(id);
      if(typeof content!=='string'){response.writeHead(404);response.end();return;}
      const {size}=await stat(content);
      response.writeHead(200,{'Content-Type':'application/pdf','Content-Length':size,'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});
      const stream=createReadStream(content,{highWaterMark:1024*1024});
      response.on('close',()=>stream.destroy());stream.on('error',()=>response.destroy());stream.pipe(response);
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    this.streamServer=server;this.streamBase='https://127.0.0.1:'+server.address().port;
  }
  async install(context,base) {
    await this.startStreamServer();
    await context.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin===base||url.origin===this.streamBase)return route.continue();
      if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, PUT','Access-Control-Allow-Headers':'authorization,content-type,content-range,if-match'}});
      const requestBody=request.postDataBuffer();
      // Disk-backed tests retain ranges and a rolling hash, not another whole
      // PDF in request history or one concatenated copy per upload chunk.
      const record={url:url.href,path:decodeURIComponent(url.pathname),method:request.method(),headers:await request.allHeaders(),body:this.options.diskRoot&&request.method()==='PUT'?undefined:requestBody,bodySize:requestBody?.length||0};
      this.requests.push(record);
      const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
      if(url.origin==='https://graph.microsoft.com'){
        if(record.method==='POST'&&record.path.endsWith('/createUploadSession')){
          this.sessionCount++;
          assert.equal(record.headers.authorization,'Bearer stub-write-token');
          const body=JSON.parse(record.body.toString());
          const update=record.path.match(/\/items\/([^/:]+)\/createUploadSession$/);
          this.chunks=[];
          if(update){
            const existing=this.files.get(update[1]);assert.ok(existing,'An update targets an existing item ID.');
            assert.ok(record.headers['if-match'],'An update must carry its original or last confirmed eTag.');
            assert.deepEqual(body,{});
            this.name=existing.name;this.parent=existing.parentReference.id;
            this.active={id:existing.id,mode:'update',ifMatch:record.headers['if-match'],chunks:this.chunks,receivedBytes:0};
          }else{
            assert.equal(body.item['@microsoft.graph.conflictBehavior'],'fail');
            assert.equal(record.headers['if-match'],undefined);
            this.name=body.item.name;this.parent=record.path.match(/\/items\/([^:]+):\//)?.[1]||'root-folder';
            this.copyCount++;this.active={id:this.copyCount===1?'saved-item':'saved-item-'+this.copyCount,mode:'copy',chunks:this.chunks,receivedBytes:0};
          }
          if(this.options.diskRoot){this.active.path=resolve(this.options.diskRoot,'upload-'+this.sessionCount+'.pdf');this.active.hash=createHash('sha256');await writeFile(this.active.path,new Uint8Array(0));}
          this.sessions.push(this.active);
          if(update&&(this.options.updateConflict||record.headers['if-match']!==this.files.get(update[1]).eTag))return json({error:{code:'preconditionFailed',message:'Fixture version conflict'}},412);
          const collision=[...this.files.values()].some(item=>item.parentReference.id===this.parent&&item.name.toLowerCase()===this.name.toLowerCase());
          if(!update&&(this.options.conflict||collision))return json({error:{code:'nameAlreadyExists',message:'Fixture name conflict'}},409);
          return json({uploadUrl:'https://tillsyno.sharepoint.com/_api/test-upload/session-'+this.sessionCount,expirationDateTime:'2099-01-01T00:00:00Z',nextExpectedRanges:['0-']});
        }
        assert.equal(record.method,'GET','Only the chosen upload-session operation may mutate Graph.');
        assert.equal(record.headers.authorization,'Bearer stub-read-token');
        if(record.path==='/v1.0/sites/tillsyno.sharepoint.com:/sites/Tillsyno')return json({id:'site-test',webUrl:SITE});
        if(record.path==='/v1.0/sites/site-test/drives')return json({value:[{id:'drive-test',webUrl:SITE+'/Delade%20dokument'}]});
        const rootPath=record.path.match(/^\/v1\.0\/drives\/drive-test\/root:\/(.+)$/);
        if(rootPath){this.rootLookups++;return rootPath[1]===this.folder('root-folder').name?json(this.folder('root-folder')):json({error:{code:'itemNotFound'}},404);}
        const children=record.path.match(/^\/v1\.0\/drives\/drive-test\/items\/([^/]+)\/children$/);
        if(children)return json({value:this.children(children[1])});
        const named=record.path.match(/^\/v1\.0\/drives\/drive-test\/items\/([^/:]+):\/(.+)$/);
        if(named){
          assert.equal(url.search,'','Ordinary Save resolves the exact name in the selected parent folder.');
          const item=[...this.files.values(),...this.folders.values()].find(item=>item.parentReference?.id===named[1]&&item.name.toLowerCase()===named[2].toLowerCase());
          return item?json(item):json({error:{code:'itemNotFound'}},404);
        }
        const match=record.path.match(/^\/v1\.0\/drives\/drive-test\/items\/([^/]+)$/);
        if(match){
          if(this.files.has(match[1])){
            const item=this.files.get(match[1]);
            if(this.active?.completed&&this.active.id===match[1]){
              this.readbackReceived.release();if(this.options.holdReadback)await this.readbackRelease.promise;
              if(this.options.badReadback)return json({...item,size:item.size+1});
            }
            return json({...item,'@microsoft.graph.downloadUrl':'https://tillsyno.sharepoint.com/_api/test-download/'+encodeURIComponent(item.id)});
          }
          const folder=this.folder(match[1]);return folder?json(folder):json({error:{code:'itemNotFound'}},404);
        }
      }else if(url.origin==='https://tillsyno.sharepoint.com'&&url.pathname.startsWith('/_api/test-download/')){
        assert.equal(record.method,'GET');assert.equal(record.headers.authorization,undefined);
        const content=this.contents.get(decodeURIComponent(url.pathname.split('/').at(-1)));assert.ok(content);
        if(this.streamBase&&typeof content==='string')return route.continue({url:this.streamBase+url.pathname});
        return route.fulfill({status:200,contentType:'application/pdf',headers:{'Access-Control-Allow-Origin':'*'},...(typeof content==='string'?{path:content}:{body:content})});
      }else if(url.origin==='https://tillsyno.sharepoint.com'&&url.pathname.startsWith('/_api/test-upload/session-')){
        assert.equal(record.method,'PUT');
        assert.equal(record.headers.authorization,undefined,'Preauthenticated upload URLs must never receive a Bearer token.');
        const range=record.headers['content-range'].match(/^bytes (\d+)-(\d+)\/(\d+)$/);
        assert.ok(range,'Each upload chunk has an explicit Content-Range.');
        const [,start,end,total]=range.map(Number);
        assert.equal(requestBody.length,end-start+1);
        assert.equal(start,this.active.receivedBytes,'No chunk is silently retried or skipped.');
        this.active.receivedBytes+=requestBody.length;
        if(this.options.diskRoot){await appendFile(this.active.path,requestBody);this.active.hash.update(requestBody);this.chunks.push({start,end,total,size:requestBody.length});}
        else this.chunks.push({bytes:requestBody,start,end,total});
        this.size=total;
        this.uploadReceived.release();
        if(this.options.failUpload)return route.abort('failed');
        if(this.options.holdUpload)await this.uploadRelease.promise;
        if(end+1<total)return json({nextExpectedRanges:[String(end+1)+'-'],expirationDateTime:'2099-01-01T00:00:00Z'},202);
        const item=this.item();this.active.receipt=item;this.active.completed=true;
        if(this.active.hash){this.active.sha256=this.active.hash.digest('hex');delete this.active.hash;}
        this.files.set(item.id,{...item,...this.options.readbackMetadata});this.contents.set(item.id,this.active.path||this.bytes);
        return json(item,201);
      }
      await route.abort('blockedbyclient');
      throw new Error('Unexpected non-local request blocked: '+record.method+' '+url.href);
    });
  }
  release(){this.uploadRelease.release();this.readbackRelease.release();}
  async close(){this.release();if(this.streamServer){const server=this.streamServer;this.streamServer=null;await new Promise(resolve=>{server.closeAllConnections();server.close(resolve);});}}
}

export async function waitFor(page,predicate,arg,timeout=12000) {
  await page.waitForFunction(predicate,arg,{timeout});
}

export async function bounded(promise,label) {
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Timed out waiting for '+label)),12000);})]);}
  finally{clearTimeout(timer);}
}

export async function startExport(page,kind='picker',name='Synthetic protocol.pdf',options={}) {
  await page.evaluate(({kind,name,options})=>{void window.__startExport(kind,name,options);},{kind,name,options});
  await page.locator('#spSavePicker').waitFor({state:'visible'});
}

export async function connect(page) {
  await page.locator('#spSaveConnect').click();
  await waitFor(page,()=>document.querySelector('#spSaveFolders')?.textContent.includes('Projekt')||!!document.querySelector('#spSaveSubmit')&&!document.querySelector('#spSaveSubmit').disabled);
}
