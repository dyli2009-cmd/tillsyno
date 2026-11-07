/* Every root visit opens the guarded app; no public presentation page remains.
 * Account service responses are synthetic. Guard/login scripts are the actual files.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.start_url,'./app.html?source=pwa','New installations start at the guarded app');
assert.equal(manifest.id,'./','Installed-app identity is retained');
assert.equal(manifest.scope,'./','Installed-app scope is retained');

const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://local');
 const relative=decodeURIComponent(url.pathname.replace(/^\/tillsyno\//,''))||'index.html';
 const file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');
  res.end(fs.readFileSync(file));
 }catch(_){res.writeHead(404);res.end('Missing synthetic test resource');}
});
function deferred(){let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};}
async function withTimeout(promise,label){
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),5000);})]);}
 finally{clearTimeout(timer);}
}
function accountService(scenario){
 return `(() => {
  const scenario=${JSON.stringify(scenario)};
  const userId='11111111-1111-4111-8111-111111111111';
  const access={userId,email:'startup@example.invalid',role:'member',modules:['drawing'],offline:scenario==='offline',expiresAt:null};
  window.__sessionLookups=0;window.__verifyOptions=[];
  window.TillsynoAuth={root:new URL(location.pathname.includes('/auth/')?'../':'./',location.href),
   verify:async options=>{
    window.__verifyOptions.push(options);
    const code=scenario==='guest'?'AUTH_REQUIRED':scenario==='expired'?'LOGIN_EXPIRED':scenario==='pending'?'PENDING_APPROVAL':null;
    if(code){const error=Error('Synthetic account status');error.code=code;throw error;}
    return access;
   },
   permitted:(value,module)=>value.role==='admin'||!module||value.modules.includes(module),
   logout:async()=>{},clear(){},markLogin(){},
   client:{auth:{getSession:async()=>{window.__sessionLookups++;return{data:{session:scenario==='guest'?null:{user:{id:userId}}}};},signInWithPassword:async()=>({data:{user:{id:userId}},error:null}),signOut:async()=>{}}}
  };
 })();`;
}
function appFixture(scenario){
 return `<!doctype html><html lang="sv" data-auth-pending><head><title>Synthetic guarded app</title><style>html[data-auth-pending] body{visibility:hidden}</style></head><body>
  <main id="appHome"><div class="homeShell"><div class="homeChoices">
   <a class="homeChoice" href="smartmatch-read.html"><b>SmartMatch</b></a>
   <a class="homeChoice" href="all-in-one.html"><b>Kontroll</b></a>
   <a class="homeChoice" href="drawing-tools.html"><b>Ritningsverktyg</b></a>
  </div><span data-account-role></span><span data-account-license></span><span data-admin-only>Admin</span><button data-logout>Logga ut</button></div></main>
  <script>${accountService(scenario)}</script><script src="auth/guard.js"></script></body></html>`;
}
function loginFixture(scenario){
 return `<!doctype html><html lang="sv"><head><title>Synthetic login shell</title></head><body><form id="login"><input name="email" type="email"><input name="password" type="password"><button>Logga in</button></form><p id="message" hidden></p>
  <script>${accountService(scenario)}</script><script src="login.js"></script></body></html>`;
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/tillsyno/';
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const launches=[
   {name:'ordinary guest root',url:''},
   {name:'explicit index guest',url:'index.html'},
   {name:'legacy iPhone source=pwa URL',url:'?source=pwa'},
   {name:'existing iOS standalone icon',url:'',standalone:true},
   {name:'display-mode standalone',url:'index.html?view=home#saved-position',cssStandalone:true},
   {name:'former stay link opens app',url:'?source=pwa&stay=1',standalone:true},
   {name:'plain stay link opens app',url:'?stay=1'},
   {name:'recovery query and fragment',url:'?type=recovery&token_hash=synthetic-only#test-fragment'},
   {name:'recovery fragment',url:'index.html#type=recovery&access_token=synthetic-only'},
   {name:'untrusted next stays on fixed app target',url:'?next=https%3A%2F%2Fevil.invalid%2F#saved-position'},
   {name:'blocked storage without installed mode',url:'',blockStorage:true},
   {name:'installed mode with blocked storage',url:'?source=pwa',standalone:true,blockStorage:true},
   {name:'preexisting session does not issue second navigation',url:'?view=latest#saved-position',fastSession:true}
  ];
  for(const example of launches){
   const context=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block'});
   const appRequested=deferred(),releaseApp=deferred();
   let observedRequest='',appRequestCount=0,sdkRequests=0;
   const observations=[];
   await context.exposeBinding('__recordStartup',(_source,snapshot)=>observations.push(snapshot));
   await context.addInitScript(({standalone,cssStandalone,fastSession,blockStorage})=>{
    if(blockStorage)for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{configurable:true,get(){throw new DOMException('Synthetic blocked storage','SecurityError');}});
    Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>!!standalone});
    const original=window.matchMedia.bind(window);
    window.matchMedia=query=>query==='(display-mode: standalone)'?{matches:!!cssStandalone,media:query,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;}}:original(query);
    window.__startupSessionLookups=0;
    if(fastSession)window.TillsynoAuth={client:{auth:{getSession:async()=>{window.__startupSessionLookups++;return{data:{session:{user:{id:'synthetic-startup-account'}}}};}}}};
    function report(kind){
     const hero=document.querySelector('.hero');
     void window.__recordStartup({kind,url:location.href,hasHero:!!hero,hasPresentation:document.body?.textContent.includes('Från kontrollpunkt till färdigt kundunderlag')||false,sessionLookups:window.__startupSessionLookups}).catch(()=>{});
    }
    new MutationObserver(()=>report('mutation')).observe(document,{subtree:true,childList:true});
    function sample(){report('frame');requestAnimationFrame(sample);}
    requestAnimationFrame(sample);
   },example);
   // A root redirect must not depend on SDK loading or any browser storage.
   await context.route('**/vendor/supabase-*.js',async route=>{sdkRequests++;await releaseApp.promise;await route.abort().catch(()=>{});});
   await context.route('**/auth/client.js*',async route=>{sdkRequests++;await releaseApp.promise;await route.abort().catch(()=>{});});
   await context.route('**/app.html*',async route=>{
    appRequestCount++;observedRequest=route.request().url();appRequested.resolve();
    await releaseApp.promise;
    await route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="sv"><title>Synthetic startup target</title><body><main id="syntheticApp">Synthetic navigation target</main></body></html>'}).catch(()=>{});
   });
   const page=await context.newPage(),start=new URL(example.url,base).href;
   const navigation=page.goto(start,{waitUntil:'commit'}).catch(error=>{if(!/ERR_ABORTED|interrupted by another navigation/.test(error.message))throw error;});
   try{
    await withTimeout(appRequested.promise,'Root failed to open the app directly: '+example.name);
    await new Promise(resolve=>setTimeout(resolve,140));
    assert(observations.length>0,example.name+': root document is observed while target was delayed');
    assert(observations.every(frame=>!frame.hasHero&&!frame.hasPresentation),example.name+': presentation content is absent, not merely hidden');
    assert(observations.every(frame=>frame.sessionLookups===0),example.name+': no root session lookup is needed');
    assert.equal(sdkRequests,0,example.name+': no root SDK dependency');
    assert.equal(appRequestCount,1,example.name+': exactly one app navigation');
    const expected=new URL('app.html',base),original=new URL(start);expected.search=original.search;expected.hash=original.hash;
    assert.equal(observedRequest,expected.href.split('#')[0],example.name+': fixed same-origin app target and query');
    releaseApp.resolve();await navigation;await page.waitForURL(expected.href);await page.locator('#syntheticApp').waitFor();
    assert.equal(page.url(),expected.href,example.name+': fragment is retained');
    console.log('PASS entry:',example.name);
   }finally{releaseApp.resolve();await context.close();}
  }

  for(const scenario of ['guest','authorized','expired','offline','pending']){
   const context=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block'});
   await context.addInitScript(online=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>online}),scenario!=='offline');
   let appRequests=0,loginRequests=0;
   const external=[];
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==new URL(base).origin){external.push(url.origin);return route.abort();}
    if(url.pathname==='/tillsyno/app.html'){appRequests++;return route.fulfill({contentType:'text/html',body:appFixture(scenario)});}
    if(url.pathname==='/tillsyno/auth/login.html'){loginRequests++;return route.fulfill({contentType:'text/html',body:loginFixture(scenario)});}
    return route.continue();
   });
   const page=await context.newPage(),suffix=scenario==='guest'?'?next=https%3A%2F%2Fevil.invalid%2F':'';
   try{
    await page.goto(base+suffix,{waitUntil:'domcontentloaded'}).catch(error=>{if(!/ERR_ABORTED|interrupted by another navigation/.test(error.message))throw error;});
    if(scenario==='guest'||scenario==='expired'){
     await page.waitForURL(url=>url.pathname==='/tillsyno/auth/login.html');
     await page.locator('#login').waitFor({state:'visible'});
     const final=new URL(page.url());
     assert.equal(final.searchParams.get('reason'),scenario==='guest'?'AUTH_REQUIRED':'LOGIN_EXPIRED');
     const next=new URL(final.searchParams.get('next'),base);
     assert.equal(next.origin,new URL(base).origin);assert.equal(next.pathname,'/tillsyno/app.html');
     await page.locator('#message').waitFor({state:'visible'});
     assert.match(await page.locator('#message').textContent(),scenario==='guest'?/Logga in igen/:/sju dagar/);
     await new Promise(resolve=>setTimeout(resolve,120));
     assert.equal(await page.evaluate(()=>window.__sessionLookups),0,'Real login reason handling prevents an automatic session redirect loop');
     assert.equal(loginRequests,1);assert.equal(appRequests,1);
    }else if(scenario==='pending'){
     await page.locator('#tillsynoWaitingNotice').waitFor({state:'visible'});
     assert.equal(new URL(page.url()).pathname,'/tillsyno/app.html');
     assert.equal(await page.locator('#appHome .homeChoice[data-tillsyno-module-locked]').count(),3);
     assert.equal(await page.locator('#appHome .homeChoice[href]').count(),0);
     assert.equal(await page.evaluate(()=>window.TillsynoCurrentAccess),null);
     assert.equal(loginRequests,0);
    }else{
     await page.waitForFunction(()=>window.TillsynoCurrentAccess?.userId==='11111111-1111-4111-8111-111111111111');
     assert.equal(new URL(page.url()).pathname,'/tillsyno/app.html');
     assert.equal(await page.locator('html').getAttribute('data-auth-pending'),null);
     assert.equal(await page.locator('#appHome .homeChoice[href="drawing-tools.html"]').count(),1);
     assert.equal(await page.locator('#appHome .homeChoice[data-tillsyno-module-locked]').count(),2);
     assert.equal(await page.evaluate(()=>window.TillsynoCurrentAccess.offline),scenario==='offline');
     assert.equal(await page.evaluate(()=>window.__verifyOptions[0].allowOffline),true);
     assert.equal(loginRequests,0);
    }
    assert.deepEqual(external,[],'Synthetic entry integration makes no external account requests');
    console.log('PASS real guard/login:',scenario);
   }finally{await context.close();}
  }
  console.log('PASS manifest: guarded start URL, existing app identity and scope retained');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
