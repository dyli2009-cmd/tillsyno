'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const f=path.join(root,new URL(req.url,'http://local').pathname);try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(f));}catch(_){res.writeHead(404);res.end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']});
 try{
  for(const mode of ['success','permission-network-failure','session-lost','storage-denied','invalid-password']){
   const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const id='11111111-1111-4111-8111-111111111111',user={id,aud:'authenticated',email:'test@example.invalid',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
   const jwt='e30.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fake';let pages=0;page.on('framenavigated',f=>{if(f===page.mainFrame())pages++;});
   if(mode==='storage-denied')await context.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='tillsyno-last-login-v1')throw new DOMException('Not permitted','SecurityError');return original.call(this,key,value);};});
   await context.route('https://*.supabase.co/**',async route=>{
    const p=new URL(route.request().url()).pathname,onHome=page.url().includes('/index.html');let status=200;
    let data=p.endsWith('/token')?{access_token:jwt,refresh_token:'fake-refresh',expires_in:3600,token_type:'bearer',user}:p.endsWith('/user')?user:p.endsWith('/tillsyno_access')?{access_role:'admin',allowed_modules:['smartmatch','control','drawing'],license_expires_at:null}:{};
    if(mode==='permission-network-failure'&&onHome&&p.endsWith('/tillsyno_access')){status=503;data={message:'Temporarily unavailable'};}
    if(mode==='session-lost'&&onHome&&p.endsWith('/user')){status=401;data={code:'session_not_found',msg:'Session not found'};}
    if(mode==='invalid-password'&&p.endsWith('/token')){status=400;data={code:'invalid_credentials',msg:'Invalid login credentials'};}
    await route.fulfill({status,headers:{'x-supabase-api-version':'2024-01-01'},contentType:'application/json',body:JSON.stringify(data)});
   });
   const base='http://127.0.0.1:'+server.address().port;
   await page.goto(base+'/auth/login.html');await page.locator('#email').fill(user.email);await page.locator('#password').fill('fake-password');await page.getByRole('button',{name:'Logga in',exact:true}).click();
   if(mode==='success'){await page.waitForURL('**/index.html');await page.waitForFunction(()=>window.TillsynoCurrentAccess?.role==='admin');assert.equal(await page.locator('html').getAttribute('data-auth-pending'),null);}
   if(mode==='permission-network-failure'){await page.waitForSelector('#tillsynoAccessDenied');assert.match(await page.locator('#tillsynoAccessDenied').innerText(),/Behörigheten kunde inte kontrolleras/);assert(page.url().endsWith('/index.html'));assert.equal(pages,2);assert(await page.getByRole('button',{name:'Försök igen',exact:true}).isVisible());}
   if(mode==='session-lost'){await page.waitForURL('**/auth/login.html?**reason=AUTH_REQUIRED');await page.waitForFunction(()=>!document.getElementById('message').hidden);assert.match(await page.locator('#message').innerText(),/Inloggningen följde inte med/);assert.equal(pages,3);assert(await page.getByRole('button',{name:'Logga in',exact:true}).isEnabled());}
   if(mode==='storage-denied'){await page.waitForFunction(()=>document.getElementById('message').textContent.includes('Webbläsaren kunde inte spara'));assert.equal(pages,1);assert(await page.getByRole('button',{name:'Logga in',exact:true}).isEnabled());}
   if(mode==='invalid-password'){await page.waitForFunction(()=>document.getElementById('message').textContent.includes('Fel e-postadress'));assert.equal(pages,1);assert(await page.getByRole('button',{name:'Logga in',exact:true}).isEnabled());}
   assert.deepEqual(errors,[]);console.log('PASS',mode);await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
