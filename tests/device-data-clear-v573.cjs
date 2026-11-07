/* Device data clearing, v2.4.573.
 * Real guard, clearing page, login page and module pages. The account service is
 * synthetic; all stored data is generated test data.
 * - Logga ut from Home asks first, then clears every Tillsyno database and work
 *   key, also data that an open Kontrollflöde tab saves while it closes, and an
 *   open SmartMatch tab follows to the clearing page.
 * - Rensa enhetens data keeps the sign-in session; Avbryt keeps everything.
 * - An access-denied page offers clearing but never removes data by itself.
 * - Self-registration is closed.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm'};
const server=http.createServer((req,res)=>{
 const relative=decodeURIComponent(new URL(req.url,'http://local').pathname.replace(/^\/tillsyno\//,''))||'index.html';
 const file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));}
 catch(_){res.writeHead(404);res.end('Missing');}
});
// Synthetic account service with the same interface as auth/client.js.
const fakeClient=scenario=>`(()=>{const root=new URL('../',document.currentScript.src);
 const access={userId:'00000000-0000-4000-8000-000000000001',email:'member@example.invalid',role:'member',modules:['smartmatch','control','drawing'],expiresAt:null,verifiedAt:Date.now(),loginAt:Date.now()};
 window.__signOuts=0;
 const client={auth:{signOut:async()=>{window.__signOuts++;return {error:null};},stopAutoRefresh(){},getSession:async()=>({data:{session:null},error:null})},
  from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}),rpc:async()=>({data:{ok:true},error:null})};
 window.TillsynoAuth={client,root,clear(){},markLogin(){},permitted:()=>true,logout:async()=>{},admin:async()=>({}),
  verify:async()=>{${scenario==='denied'?"throw Error('Din licens har gått ut. Kontakta administratören för att förlänga den.');":'return {...access,offline:false};'}}};
})();`;

async function seed(page,extra=''){
 await page.evaluate(async extra=>{
  const put=(name,store,value)=>new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore(store,{keyPath:'id'});
   r.onsuccess=()=>{const tx=r.result.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>{r.result.close();resolve();};tx.onerror=()=>reject(tx.error);};r.onerror=()=>reject(r.error);});
  await put('tillsyno-offline-work','drawings',{id:'control:test',bytes:new Uint8Array([37,80,68,70])});
  await put('smartmatch-local-pdf-resume','files',{id:'active',name:'generated-test.pdf'});
  localStorage.setItem('doorservice-drawing-v1:generated','{"customer":"Testkund AB","technician":"Test Tekniker"}');
  localStorage.setItem('tillsyno.product-library.v1','[]');
  localStorage.setItem('tillsyno-ui-appearance-v1','{"theme":"night","device":"auto"}');
  localStorage.setItem('sb-vczdugrwcivnotjltarm-auth-token','{"access_token":"synthetic"}');
  localStorage.setItem('tillsyno-last-login-v1','{"userId":"synthetic","at":1}');
  sessionStorage.setItem('tillsyno-read-test-v9-85:open','1');
  if(extra)localStorage.setItem(extra,'1');
 },extra);
}
const snapshot=page=>page.evaluate(async()=>({
 databases:(await indexedDB.databases()).map(db=>db.name).sort(),
 local:Object.keys(localStorage).sort(),session:Object.keys(sessionStorage).sort()}));

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/tillsyno/';
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const results=[];const pass=name=>{results.push(name);console.log('PASS '+name);};
 async function context(scenario='member'){
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
  await ctx.route('**/*',route=>{const url=new URL(route.request().url());
   if(url.hostname!=='127.0.0.1')return route.abort();
   if(url.pathname.endsWith('/auth/client.js'))return route.fulfill({contentType:'application/javascript',body:fakeClient(scenario)});
   return route.continue();});
  return ctx;
 }
 try{
  // 1. Logga ut: confirmation, all tabs closed, late saves removed.
  {
   const ctx=await context(),home=await ctx.newPage();const errors=[];home.on('pageerror',e=>errors.push(e.message));
   await home.goto(base+'app.html');await seed(home);
   const control=await ctx.newPage();await control.goto(base+'all-in-one.html');
   // Simulate a module that saves its open work while the page closes.
   await control.evaluate(()=>window.addEventListener('pagehide',()=>{localStorage.setItem('doorservice-drawing-v1:late','{"saved":"while closing"}');
    const r=indexedDB.open('tillsyno-offline-work',1);r.onsuccess=()=>{try{const tx=r.result.transaction('drawings','readwrite');tx.objectStore('drawings').put({id:'control:late'});}catch(_){}};}));
   const smart=await ctx.newPage();await smart.goto(base+'smartmatch-read-v9-100.html');
   await home.bringToFront();await home.waitForFunction(()=>!document.documentElement.hasAttribute('data-auth-pending'));
   await home.locator('#homeProfile summary').click();
   assert.equal(await home.locator('#homeProfile [data-clear-device]').isVisible(),true,'Home menu offers Rensa enhetens data');
   await home.locator('#homeProfile [data-logout]').click();
   await home.waitForURL(/auth\/clear-device\.html\?mode=logout$/);
   assert.equal(await home.locator('#clearTitle').textContent(),'Logga ut och rensa enheten');
   const before=await snapshot(home);
   for(const name of ['smartmatch-local-pdf-resume','tillsyno-offline-work'])assert.ok(before.databases.includes(name),'nothing removed before confirmation: '+name);
   assert.ok(before.local.includes('doorservice-drawing-v1:generated'));
   await home.locator('#clearConfirm').click();
   await home.waitForURL(/auth\/login\.html\?reason=DEVICE_CLEARED$/,{timeout:20000});
   await control.waitForURL(/auth\/login\.html\?reason=DEVICE_CLEARED$/,{timeout:20000});
   await smart.waitForURL(/auth\/login\.html\?reason=DEVICE_CLEARED$/,{timeout:20000});
   assert.match(await home.locator('#message').textContent(),/Tillsyno-data på den här enheten har rensats/);
   const after=await snapshot(home);
   assert.deepEqual(after.databases,[],'every database removed, including the late save');
   const display=new Set(['tillsyno-ui-appearance-v1','doorservice-ui-text-level','tillsyno-controlflow-text-level-v1']);
   assert.ok(after.local.includes('tillsyno-ui-appearance-v1'),'appearance kept');
   assert.deepEqual(after.local.filter(key=>!display.has(key)),[],'only appearance/text size kept; session, work and late save removed');
   assert.deepEqual(after.session,[],'session storage cleared');
   assert.deepEqual(errors,[]);
   await ctx.close();pass('Logga ut asks first, clears all tabs and data saved while closing');
  }
  // 2. Rensa enhetens data keeps the session and returns Home.
  {
   const ctx=await context(),home=await ctx.newPage();
   await home.goto(base+'app.html');await seed(home);
   await home.waitForFunction(()=>!document.documentElement.hasAttribute('data-auth-pending'));
   await home.locator('#homeProfile summary').click();await home.locator('#homeProfile [data-clear-device]').click();
   await home.waitForURL(/auth\/clear-device\.html\?mode=keep$/);
   assert.equal(await home.locator('#clearTitle').textContent(),'Rensa enhetens data');
   await home.locator('#clearConfirm').click();
   await home.waitForURL(/\/app\.html$/,{timeout:20000});
   const after=await snapshot(home);
   // Home writes its own layout sizes again when it reloads; only seeded data is checked.
   for(const name of ['smartmatch-local-pdf-resume','tillsyno-offline-work'])assert.ok(!after.databases.includes(name),'database removed: '+name);
   for(const key of ['doorservice-drawing-v1:generated','tillsyno.product-library.v1'])assert.ok(!after.local.includes(key),'work data removed: '+key);
   for(const key of ['sb-vczdugrwcivnotjltarm-auth-token','tillsyno-last-login-v1','tillsyno-ui-appearance-v1'])assert.ok(after.local.includes(key),'kept: '+key);
   assert.ok(!after.session.includes('tillsyno-read-test-v9-85:open'),'session work key removed');
   assert.equal(await home.evaluate(()=>window.__signOuts),0,'not signed out');
   await ctx.close();pass('Rensa enhetens data keeps sign-in and removes work data');
  }
  // 3. Avbryt keeps everything.
  {
   const ctx=await context(),home=await ctx.newPage();
   await home.goto(base+'app.html');await seed(home);
   await home.waitForFunction(()=>!document.documentElement.hasAttribute('data-auth-pending'));
   await home.locator('#homeProfile summary').click();await home.locator('#homeProfile [data-logout]').click();
   await home.waitForURL(/clear-device/);await home.locator('#clearCancel').click();await home.waitForURL(/\/app\.html$/);
   const after=await snapshot(home);
   assert.deepEqual(after.databases,['smartmatch-local-pdf-resume','tillsyno-offline-work']);
   assert.ok(after.local.includes('doorservice-drawing-v1:generated'));
   await ctx.close();pass('Avbryt keeps all local data');
  }
  // 4. Access denied: clearing is offered, nothing is removed automatically.
  {
   const ctx=await context('denied'),page=await ctx.newPage();
   await page.goto(base+'app.html');await seed(page);await page.reload();
   await page.waitForSelector('#tillsynoAccessDenied');
   const link=page.locator('#tillsynoAccessDenied a',{hasText:'Logga ut och rensa enheten'});
   assert.match(await link.getAttribute('href'),/auth\/clear-device\.html\?mode=logout$/);
   const after=await snapshot(page);
   assert.deepEqual(after.databases,['smartmatch-local-pdf-resume','tillsyno-offline-work'],'expired access keeps local work');
   await ctx.close();pass('Denied access offers clearing and keeps local work');
  }
  // 5. Self-registration is closed.
  {
   const ctx=await context(),page=await ctx.newPage();
   await page.goto(base+'auth/login.html');
   assert.equal(await page.locator('a[href="register.html"]').count(),0,'no sign-up link');
   await page.goto(base+'auth/register.html');
   assert.equal(await page.locator('form').count(),0,'no sign-up form');
   assert.match(await page.locator('h1').textContent(),/Registreringen är stängd/);
   await ctx.close();pass('Self-registration is closed');
  }
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const file of ['auth/clear-device.html','auth/clear-device.js'])assert.ok(sw.includes('"'+file+'"'),file+' is available offline');
  assert.ok(!sw.includes('"auth/register.js"'));
  pass('Offline list includes the clearing page');
 }finally{await browser.close();server.close();}
 console.log(results.length+' passed');
})().catch(error=>{console.error(error);process.exit(1);});
