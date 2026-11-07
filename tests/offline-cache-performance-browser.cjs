/* Real service-worker algorithm, tiny synthetic release, no accounts/customer data.
 * Default: assert bounded installation and coherent cache-first navigation.
 * Baseline timing only: SW_PERF_SOURCE=/tmp/old-sw.js SW_PERF_BASELINE=1 node ...
 * CE worker: SW_PERF_SOURCE=/path/to/ce-sw.js SW_PERF_CE=1 node ...
 * Timings use a controlled localhost delay; they are not device benchmarks.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const sourcePath=process.env.SW_PERF_SOURCE?path.resolve(process.env.SW_PERF_SOURCE):path.join(root,'sw.js');
const source=fs.readFileSync(sourcePath,'utf8');
const baseline=process.env.SW_PERF_BASELINE==='1';
const ce=process.env.SW_PERF_CE==='1';
const core=['index.html','app.html','module.html','app.js','module.js','style.css',
 ...Array.from({length:9},(_,i)=>'part-'+i+'.js'),'late.js','module.js'];
const unique=[...new Set(core)];
const version=release=>'perf-release-'+release.toLowerCase();
const cacheName=release=>(ce?'tillsyno-ce-markning-':'tillsyno-offline-')+version(release);
const readyMarker=ce?'__ce_offline_ready__':'__offline_ready__';
assert(/const\s+CORE\s*=\s*\[.*?\];/s.test(source),'Worker has a replaceable static CORE fixture');
assert(/const\s+VERSION\s*=\s*(['"])[^'"\r\n]+\1\s*;/.test(source),'Worker has a replaceable release version');
const state={release:'A',workerRelease:'A',gate:'none',delay:0,fail:null,active:0,maxActive:0,
 requests:[],pending:[],api:0,auth:0,unlisted:0,cross:0};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,label,timeout=7000){
 const end=Date.now()+timeout;
 while(!check()){if(Date.now()>=end)throw Error(label);await pause(15);}
}
function releaseHeld(mode='none'){
 state.gate=mode;
 for(const pending of [...state.pending])if(mode==='none'||(mode==='last'&&pending.name!=='late.js'))pending.resolve();
}
async function gate(name){
 if(state.gate!=='all'&&!(state.gate==='last'&&name==='late.js'))return;
 let resolve;const promise=new Promise(done=>resolve=done),record={name,resolve:()=>resolve()};
 state.pending.push(record);
 try{await promise;}finally{state.pending.splice(state.pending.indexOf(record),1);}
}
function worker(){
 return source.replace(/const\s+VERSION\s*=\s*(['"])[^'"\r\n]+\1\s*;/,
  "const VERSION='"+version(state.workerRelease)+"';")
  .replace(/const\s+CORE\s*=\s*\[.*?\];/s,'const CORE='+JSON.stringify(core)+';');
}
function asset(name,release){
 if(name.endsWith('.html'))return '<!doctype html><html lang="en"><head><title>Synthetic '+name+'</title><link rel="stylesheet" href="style.css"></head>'+
  '<body data-release="'+release+'"><main id="view">'+name+' release '+release+'</main><script src="'+(name==='module.html'?'module.js':'app.js')+'"></script>'+
  '<script>window.privateReady=fetch("private-api",{cache:"no-store"}).then(r=>r.json()).then(v=>window.privateValue=v);</script></body></html>';
 if(name==='app.js'||name==='module.js')return 'window.assetRelease='+JSON.stringify(release)+';';
 if(name.endsWith('.css'))return 'body{font-family:system-ui}/* synthetic release '+release+' */';
 return '/* synthetic asset '+name+' release '+release+' */';
}
function json(res,value){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 res.setHeader('Cache-Control','no-store');
 if(!url.pathname.startsWith('/tillsyno/')){res.writeHead(404);res.end();return;}
 const name=url.pathname.slice('/tillsyno/'.length)||'index.html';
 if(name==='sw.js'){
  res.setHeader('Content-Type','application/javascript');
  res.setHeader('Service-Worker-Allowed','/tillsyno/');res.end(worker());return;
 }
 if(name==='boot.html'){
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Synthetic worker bootstrap</title>');return;
 }
 if(name==='private-api'){state.api++;json(res,{counter:state.api,release:state.release});return;}
 if(name==='auth/session'){state.auth++;json(res,{counter:state.auth,release:state.release});return;}
 if(name==='unlisted.js'){state.unlisted++;res.setHeader('Content-Type','application/javascript');res.end('synthetic-unlisted-'+state.unlisted);return;}
 if(!unique.includes(name)){res.writeHead(404);res.end('Not a fixture asset');return;}
 state.requests.push({name,release:state.release});state.active++;state.maxActive=Math.max(state.maxActive,state.active);
 try{
  await gate(name);
  if(state.delay)await pause(state.delay);
  if(res.destroyed)return;
  if(state.fail===name){res.writeHead(503);res.end('Synthetic failed install asset');return;}
  res.setHeader('Content-Type',name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'application/javascript');
  res.end(asset(name,state.release));
 }catch(error){if(!res.destroyed){res.writeHead(500);res.end(String(error.message));}}
 finally{state.active--;}
});
const outside=http.createServer((_req,res)=>{state.cross++;res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');json(res,{counter:state.cross,release:state.release});});
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return server.address().port;}

(async()=>{
 const port=await listen(server),otherPort=await listen(outside);
 const base='http://127.0.0.1:'+port+'/tillsyno/',other='http://127.0.0.1:'+otherPort;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage();
 try{
  await page.goto(base+'boot.html');
  if(!baseline)state.gate='all';
  await page.evaluate(async()=>{window.fixtureRegistration=await navigator.serviceWorker.register('sw.js',{updateViaCache:'none'});});
  if(!baseline){
   await until(()=>state.pending.length>0,'Installer did not start its worker pool').catch(async error=>{
    error.message+=' '+JSON.stringify({requests:state.requests,pending:state.pending.map(p=>p.name),registration:await page.evaluate(()=>({active:window.fixtureRegistration.active?.state,installing:window.fixtureRegistration.installing?.state,waiting:window.fixtureRegistration.waiting?.state}))});throw error;
   });
   await pause(100);
   // Chromium may schedule fewer low-priority requests than the worker's limit.
   assert(state.pending.length<=4,'Installer starts at most four simultaneous asset requests');
   assert(state.requests.length<=4,'A fifth asset waits for an installation slot');
   assert.equal(await page.evaluate(async([name,marker])=>!!await(await caches.open(name)).match(new URL(marker,location.href)),[cacheName('A'),readyMarker]),false,'Ready marker is absent during initial work');
   assert.equal(await page.evaluate(()=>!!window.fixtureRegistration.active),false,'Worker cannot activate before required assets exist');
   releaseHeld('last');
   await until(()=>state.pending.some(p=>p.name==='late.js')&&state.requests.length>=unique.length,'Installer did not reach the last gated asset');
   await until(()=>state.active===1,'Other install assets did not settle');
   assert.equal(await page.evaluate(async([name,marker])=>!!await(await caches.open(name)).match(new URL(marker,location.href)),[cacheName('A'),readyMarker]),false,'Last required asset still prevents readiness');
   assert.equal(await page.evaluate(()=>!!window.fixtureRegistration.active),false,'Last required asset still prevents activation');
   assert(state.maxActive<=4,'Installation concurrency never exceeds four');
   assert.equal(state.requests.filter(r=>r.name==='module.js').length,1,'Duplicate CORE URLs download only once');
   releaseHeld();
  }
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.evaluate(()=>{window.oldReadyWorker=window.fixtureRegistration.active;});
  assert.equal(await page.evaluate(async([name,marker])=>!!await(await caches.open(name)).match(new URL(marker,location.href)),[cacheName('A'),readyMarker]),true,'Complete release has a ready marker');
  if(!baseline)assert.equal(await page.evaluate(async name=>(await(await caches.open(name)).keys()).length,cacheName('A')),unique.length+1,'One copy of every required asset plus readiness');

  // Identical fixture/delay produces a controlled comparison for the original worker.
  state.delay=300;
  const beforeRequests=state.requests.length,beforeAPI=state.api,start=performance.now();
  await page.goto(base+'module.html?controlled-latency=1',{waitUntil:'load'});
  await page.evaluate(()=>window.privateReady);
  const elapsed=performance.now()-start,networkAssets=state.requests.length-beforeRequests;
  console.log('CONTROLLED_TIMING '+JSON.stringify({worker:ce?'CE':'root',mode:baseline?'original-network-first':'release-cache-first',serverAssetDelayMs:300,navigationMs:Math.round(elapsed),staticNetworkRequests:networkAssets,privateAPICalls:state.api-beforeAPI}));
  assert.equal(await page.evaluate(()=>document.body.dataset.release),'A');
  assert.equal(await page.evaluate(()=>window.assetRelease),'A');
  assert.equal(state.api-beforeAPI,1,'Private data still goes to the network');
  if(baseline){assert(networkAssets>=2,'Baseline really waits for network static assets');return;}
  assert.equal(networkAssets,0,'Warm navigation reuses its completed static release');

  // A real stall, rather than only a fast localhost response, must not block a hit.
  state.delay=0;state.gate='all';
  const prior=state.requests.length,apiPrior=state.api;
  try{
   await page.goto(base+'app.html?while-static-stalled=1',{waitUntil:'load',timeout:1800});
   await page.evaluate(()=>window.privateReady);
   assert.equal(state.requests.length,prior,'Cached HTML/JS/CSS make no stalled static request');
   assert.equal(state.api-apiPrior,1,'Private API remains live during warm navigation');
  }finally{releaseHeld();}

  // Explicit freshness probes must see the server without replacing pinned A files.
  state.release='B';
  const probe=await page.evaluate(async()=>({
   html:await(await fetch('module.html',{cache:'no-store'})).text(),
   script:await(await fetch('module.js',{cache:'reload'})).text()
  }));
  assert(probe.html.includes('data-release="B"'),'No-store version probe reaches future HTML');
  assert(probe.script.includes('"B"'),'Reload probe reaches future JavaScript');
  await page.goto(base+'module.html?after-freshness-probe=1',{waitUntil:'load'});
  await page.evaluate(()=>window.privateReady);
  assert.equal(await page.evaluate(()=>document.body.dataset.release),'A','Normal HTML remains pinned to ready release A');
  assert.equal(await page.evaluate(()=>window.assetRelease),'A','Normal JavaScript remains the same ready release A');
  assert.equal(await page.evaluate(()=>window.privateValue.release),'B','Live API state is never pinned with app code');

  const apiBefore={auth:state.auth,unlisted:state.unlisted,cross:state.cross};
  for(let i=0;i<2;i++){
   const data=await page.evaluate(async other=>({auth:await(await fetch('auth/session')).json(),unlisted:await(await fetch('unlisted.js')).text(),cross:await(await fetch(other+'/session')).json()}),other);
   assert.equal(data.auth.release,'B');assert.equal(data.cross.release,'B');
   assert.equal(data.unlisted,'synthetic-unlisted-'+(apiBefore.unlisted+i+1));
  }
  assert.equal(state.auth-apiBefore.auth,2,'Auth requests are never absorbed by app-code caching');
  assert.equal(state.unlisted-apiBefore.unlisted,2,'Unlisted same-origin files remain outside the release');
  assert.equal(state.cross-apiBefore.cross,2,'Cross-origin requests remain outside the release');
  const cachedPaths=await page.evaluate(async name=>(await(await caches.open(name)).keys()).map(r=>new URL(r.url).pathname),cacheName('A'));
  assert(!cachedPaths.some(p=>/private-api|auth\/session|unlisted/.test(p)),'No auth/private/unlisted response enters the static release');

  // New worker B fails one required asset; ready A must remain installed and usable.
  state.workerRelease='B';state.fail='late.js';
  await page.evaluate(async()=>{
   window.fixtureRegistration=await navigator.serviceWorker.getRegistration();
   window.oldReadyWorker=window.fixtureRegistration.active;
   window.updateFound=false;window.updateStates=[];
   window.fixtureRegistration.addEventListener('updatefound',()=>{
    window.updateFound=true;const worker=window.fixtureRegistration.installing;
    window.updateStates.push(worker.state);worker.addEventListener('statechange',()=>window.updateStates.push(worker.state));
   });
   await window.fixtureRegistration.update();
  });
  await page.waitForFunction(()=>window.updateFound&&window.updateStates.includes('redundant'),null,{timeout:10000});
  assert.equal(await page.evaluate(()=>window.fixtureRegistration.active===window.oldReadyWorker),true,'Failed worker cannot replace the ready worker');
  assert.equal(await page.evaluate(async([name,marker])=>!!await(await caches.open(name)).match(new URL(marker,location.href)),[cacheName('A'),readyMarker]),true,'Previous complete release remains ready');
  assert.equal(await page.evaluate(async([name,marker])=>!!await(await caches.open(name)).match(new URL(marker,location.href)),[cacheName('B'),readyMarker]),false,'Partial failed release never becomes ready');
  await page.goto(base+'app.html?after-failed-update=1',{waitUntil:'load'});await page.evaluate(()=>window.privateReady);
  assert.equal(await page.evaluate(()=>document.body.dataset.release),'A');
  assert.equal(await page.evaluate(()=>window.assetRelease),'A');
  assert(state.maxActive<=4,'Failed updates also use the bounded installation pool');
  console.log('PASS real '+(ce?'CE':'root')+' worker: bounded complete install, stalled-network warm navigation, live private/auth traffic, coherent probes and failed-update recovery');
 }finally{
  releaseHeld();await context.close();await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
 releaseHeld();server.closeAllConnections?.();outside.closeAllConnections?.();
 await Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>outside.close(resolve))]);
});
