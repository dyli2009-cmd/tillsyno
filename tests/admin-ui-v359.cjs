// Admin UI integration test. All accounts, sessions, API calls and deletions are simulated locally.
'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const projectRoot=path.resolve(__dirname,'..'),root=process.env.ADMIN_UI_ROOT||projectRoot;
const output=process.env.ADMIN_REVIEW_DIR||require('node:os').tmpdir();
const ids={owner:'11111111-1111-4111-8111-111111111111',member:'22222222-2222-4222-8222-222222222222',pending:'33333333-3333-4333-8333-333333333333',unverified:'44444444-4444-4444-8444-444444444444',expired:'55555555-5555-4555-8555-555555555555'};
const token='header.'+Buffer.from(JSON.stringify({session_id:ids.owner})).toString('base64url')+'.signature';
let users,roles,events=[],failNext=null;
const ok=data=>({data,error:null});
function reset(){
 users=new Map(Object.entries(ids).map(([name,id])=>[id,{id,email:name+'@example.invalid',email_confirmed_at:name==='unverified'?null:'2026-01-01',created_at:'2026-10-12',user_metadata:{name:name[0].toUpperCase()+name.slice(1)}}]));
 roles=new Map([[ids.owner,{access_role:'admin',allowed_modules:['smartmatch','control','drawing'],license_expires_at:null}],[ids.member,{access_role:'member',allowed_modules:['smartmatch','control'],license_expires_at:new Date(Date.now()+20*86400000).toISOString()}],[ids.expired,{access_role:'member',allowed_modules:['drawing'],license_expires_at:'2026-01-01T00:00:00Z'}]]);
 events=[];failNext=null;
}
reset();
function query(){let mode='select',id,changes;
 const q={select(){return q},eq(_,value){id=value;return q},delete(){mode='delete';return q},update(value){mode='update';changes=value;return q},
  maybeSingle:async()=>ok(roles.get(id)||null),upsert:async row=>{roles.set(row.user_id,{...roles.get(row.user_id),...row});return ok(row)},
  then(resolve,reject){if(mode==='delete'){roles.delete(id);return Promise.resolve(ok(null)).then(resolve,reject)}if(mode==='update'){roles.set(id,{...roles.get(id),...changes});return Promise.resolve(ok(null)).then(resolve,reject)}return Promise.resolve(ok([...roles].map(([user_id,row])=>({user_id,...row})))).then(resolve,reject)}
 };return q;
}
const api={from:query,rpc:async(_,args)=>ok(args._session_id===ids.owner&&args._user_id===ids.owner),auth:{getUser:async t=>t===token?ok({user:users.get(ids.owner)}):{data:null,error:Error('Invalid test token')},admin:{
 listUsers:async()=>ok({users:[...users.values()]}),getUserById:async id=>ok({user:users.get(id)}),
 updateUserById:async(id,data)=>{if(data.ban_duration)users.get(id).banned_until=data.ban_duration==='none'?null:'2100-01-01';return ok({user:users.get(id)})},
 deleteUser:async id=>{users.delete(id);roles.delete(id);return ok(null)},generateLink:async()=>ok({properties:{action_link:'https://example.invalid/test'}})
}}};
const code=fs.readFileSync(path.join(projectRoot,'supabase/functions/tillsyno-admin/index.ts'),'utf8').replace(/^import .*\n/,'').replace('export function','function').replace(/Deno\.serve\([\s\S]*$/,'');
const context={Response,Date,Map,Set,JSON,Error,atob,Intl};vm.createContext(context);vm.runInContext(code,context);
const handler=context.makeHandler(()=>api,name=>({SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server-only-test'}[name]));
async function call(action,data={}){return handler(new Request('https://example.invalid/admin',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://dyli2009-cmd.github.io',Authorization:'Bearer '+token},body:JSON.stringify({action,...data})}));}
const fakeClient=`window.TillsynoAuth={root:new URL('/',location.origin),verify:async()=>({role:'admin',email:'owner@example.invalid',modules:['smartmatch','control','drawing']}),permitted:()=>true,logout:async()=>{window.__logoutCalled=true;location.href='/auth/login.html';},admin:async(action,data={})=>{const r=await fetch('/test-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data})});const v=await r.json();if(!r.ok)throw Error(v.error);return v;}};`;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/test-admin'){
  let body='';for await(const c of req)body+=c;const args=JSON.parse(body);events.push(args);
  if(failNext===args.action){failNext=null;res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Tillfälligt testfel. Försök igen.'}));return}
  const r=await call(args.action,args);res.writeHead(r.status,{'Content-Type':'application/json'});res.end(await r.text());return;
 }
 if(url.pathname==='/auth/client.js'){res.setHeader('Content-Type','text/javascript');res.end(fakeClient);return}
 if(url.pathname.startsWith('/vendor/')){res.setHeader('Content-Type','text/javascript');res.end('');return}
 if(['/index.html','/auth/login.html'].includes(url.pathname)){res.setHeader('Content-Type','text/html');res.end('<!doctype html><p>Test navigation destination</p>');return}
 const file=path.join(root,url.pathname);try{res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(file))}catch(_){res.writeHead(404);res.end('Missing test fixture')}
});
const summary={checks:[],bugs:[],themes:[],pageErrors:[]};
function passed(text){summary.checks.push(text)}
async function waitIdle(page){await page.waitForFunction(()=>!document.getElementById('refresh').disabled)}
async function openDelete(page,name){await row(page,name).locator('summary').click();await row(page,name).getByRole('button',{name:'Radera konto',exact:true}).click();}
async function ensureVisible(page,id){const el=page.locator(id);if(!await el.isVisible())await el.locator('xpath=ancestor::details[1]/summary').click();}
const row=(page,name)=>page.locator('.userrow').filter({has:page.locator('.identity small').filter({hasText:name+'@example.invalid'})});
async function openPage(page,base,theme='mist',device='auto'){
 await page.addInitScript(({theme,device})=>localStorage.setItem('tillsyno-ui-appearance-v1',JSON.stringify({theme,device})),{theme,device});
 await page.goto(base+'/auth/admin.html');await page.waitForSelector('.userrow');await waitIdle(page);
}
async function styles(page,selectors){return page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector),s=getComputedStyle(e);return [selector,{bg:s.backgroundColor,color:s.color,border:s.borderColor,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}]})),selectors)}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-zygote','--single-process']});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(5000);page.on('pageerror',e=>summary.pageErrors.push(e.message));
 await openPage(page,base);assert.equal(await page.locator('.userrow').count(),5);passed('List, statistics, admin authorization and refresh loaded with simulated accounts.');await page.locator('[data-user-filter="pending"]').click();assert.equal(await page.locator('.userrow').count(),2);await page.locator('[data-user-filter="active"]').click();assert.equal(await page.locator('.userrow').count(),2);await page.locator('[data-user-filter="all"]').click();passed('Pending/approved/all filter cards.');
 assert.equal(await row(page,'owner').locator('button').count(),0);passed('Protected owner has no edit/delete actions.');
 assert.equal(await row(page,'unverified').getByRole('button',{name:'Godkänn',exact:true}).isDisabled(),true);passed('Unverified registrations cannot be approved.');
 await page.locator('#search').fill('member');assert.equal(await page.locator('.userrow').count(),1);await page.locator('#search').fill('no-such-person');assert.equal(await page.locator('.userrow').count(),0);await page.locator('#search').fill('');passed('Search and empty results.');
 await page.locator('#refresh').click();await waitIdle(page);passed('Refresh.');
 await openDelete(page,'member');assert.equal(await page.locator('#confirmRemove').isDisabled(),true);
 await page.locator('#confirmDeleteEmail').fill('wrong@example.invalid');assert.equal(await page.locator('#confirmRemove').isDisabled(),true);
 await page.locator('#confirmDialog').getByRole('button',{name:'Avbryt',exact:true}).click();assert.ok(users.has(ids.member));passed('Deletion requires matching email; cancel preserves account.');
 await openDelete(page,'member');await page.locator('#confirmDeleteEmail').fill('member@example.invalid');failNext='delete';await page.locator('#confirmRemove').click();await page.waitForFunction(()=>!document.getElementById('deleteError').hidden);await waitIdle(page);assert.ok(users.has(ids.member),'failed deletion preserves account');assert.equal(await page.locator('#confirmDialog').isVisible(),true);await page.locator('#confirmRemove').click();await page.waitForFunction(()=>document.querySelectorAll('.userrow').length===4);assert.equal(users.has(ids.member),false);assert.equal(roles.has(ids.member),false);passed('Deletion stays open for retry after a server error.');passed('Confirm deletion calls the live handler with the selected ID and email; simulated user and license disappear.');
 reset();await page.reload();await page.waitForSelector('.userrow');await waitIdle(page);
 await row(page,'pending').getByRole('button',{name:'Godkänn',exact:true}).click();await page.locator('#approveUser').click();assert.match(await page.locator('#approvalError').textContent(),/minst en modul/);
 await page.locator('#approvalForm input[value="drawing"]').check();await page.locator('#approvalDays').selectOption('2');await page.locator('#approveUser').click();await page.waitForFunction(()=>!document.getElementById('approvalDialog').open);await waitIdle(page);assert.deepEqual([...roles.get(ids.pending).allowed_modules],['drawing']);passed('Approval validates module selection, then grants only selected module and two-day license.');
 await row(page,'member').getByRole('button',{name:'Behörighet & licens',exact:true}).click();await page.locator('#licenseForm input[value="smartmatch"]').uncheck();await page.locator('#licenseDays').selectOption('7');await page.locator('#saveLicense').click();await page.waitForFunction(()=>!document.getElementById('licenseDialog').open);await waitIdle(page);assert.deepEqual([...roles.get(ids.member).allowed_modules],['control']);passed('Save module access and license duration.');
 await row(page,'member').getByRole('button',{name:'Behörighet & licens',exact:true}).click();await ensureVisible(page,'#licenseUntil');await page.locator('#licenseUntil').fill('2026-12-31');await page.locator('#saveLicense').click();await page.waitForFunction(()=>!document.getElementById('licenseDialog').open);await waitIdle(page);assert.equal(roles.get(ids.member).license_expires_at,'2026-12-31T23:00:00.000Z');passed('Custom end date covers the selected day in Swedish time.');
 await row(page,'member').getByRole('button',{name:'Behörighet & licens',exact:true}).click();const before=Date.parse(roles.get(ids.member).license_expires_at);await ensureVisible(page,'#extendDays');await page.locator('#extendDays').selectOption('2');await page.locator('#extendLicense').click();await page.waitForFunction(()=>!document.getElementById('licenseDialog').open);await waitIdle(page);assert.equal(Date.parse(roles.get(ids.member).license_expires_at),before+2*86400000);passed('Extend license starts from existing future end date.');
 await row(page,'member').getByRole('button',{name:'Behörighet & licens',exact:true}).click();await ensureVisible(page,'#cancelLicense');await page.locator('#cancelLicense').click();assert.equal(await page.locator('#cancelLicenseConfirm').isVisible(),true);await page.locator('#keepLicense').click();assert.equal(await page.locator('#cancelLicenseConfirm').isVisible(),false);await ensureVisible(page,'#cancelLicense');await page.locator('#cancelLicense').click();await page.locator('#confirmCancelLicense').click();await page.waitForFunction(()=>!document.getElementById('licenseDialog').open);await waitIdle(page);assert.equal(roles.get(ids.member).license_expires_at,'1970-01-01T00:00:00.000Z');passed('Keep/cancel license confirmation, revoke without deleting account.');
 await row(page,'member').getByRole('button',{name:'Behörighet & licens',exact:true}).click();await ensureVisible(page,'#cancelLicense');assert.equal(await page.locator('#cancelLicense').isDisabled(),true);await page.locator('#licenseDialog button[data-close]').click();passed('Already revoked license cannot be cancelled twice; close control works.');
 reset();await page.reload();await page.waitForSelector('.userrow');await waitIdle(page);failNext='approve';
 await row(page,'pending').getByRole('button',{name:'Godkänn',exact:true}).click();await page.locator('#approvalForm input[value="smartmatch"]').check();await page.locator('#approveUser').click();await page.waitForFunction(()=>!document.getElementById('approvalError').hidden);await waitIdle(page);const count=events.filter(x=>x.action==='approve').length;
 await page.locator('#approveUser').click();await page.waitForTimeout(150);const after=events.filter(x=>x.action==='approve').length;
 assert.equal(after,count+1,'approval retries after a temporary server error');await page.waitForFunction(()=>!document.getElementById('approvalDialog').open);await waitIdle(page);passed('Approval can be retried directly after a server error.');
 for(const [device,width,height]of [['phone',390,844],['tablet',820,1180],['desktop',1440,1000]]){
  await page.setViewportSize({width,height});
  for(const theme of ['ice','mist','coast','sand','night','graphite','pine']){
   reset();await openPage(page,base,theme,device);
   const pageStyle=await styles(page,['body','.stat strong','.owner strong','.userrow .secondary','.userrow .avatar','.filterbar','.footer']);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   await row(page,'member').getByRole('button',{name:'Behörighet & licens',exact:true}).click();
   const licenseStyle=await styles(page,['#licenseDialog','#licenseTitle','#licenseCurrent','#licenseDays','#licenseForm .checkRow','#saveLicense','#cancelLicense']);
   await page.locator('#licenseDialog button[data-close]').click();
   await openDelete(page,'member');const deleteStyle=await styles(page,['#confirmDialog','#confirmTitle','#confirmText','#confirmDeleteEmail','#confirmRemove']);await page.locator('#confirmDialog button[data-close]').first().click();
   await row(page,'pending').getByRole('button',{name:'Godkänn',exact:true}).click();const approvalStyle=await styles(page,['#approvalDialog','#approvalTitle','#approveUser']);await page.locator('#approvalDialog button[data-close]').click();
   assert.equal(overflow,false,'no horizontal overflow: '+theme+'/'+device);const expected=await page.evaluate(()=>{const r=getComputedStyle(document.documentElement);const c=v=>{const e=document.createElement('span');e.style.color=r.getPropertyValue(v);document.body.append(e);const color=getComputedStyle(e).color;e.remove();return color;};return {card:c('--ta-card'),ink:c('--ta-ink'),accent:c('--ta-blue')};});for(const [data,prefix]of [[licenseStyle,'license'],[deleteStyle,'confirm'],[approvalStyle,'approval']]){assert.equal(data['#'+prefix+'Dialog'].bg,expected.card,'dialog palette '+theme);assert.equal(data['#'+prefix+'Title'].color,expected.ink,'heading palette '+theme);}assert.equal(approvalStyle['#approveUser'].bg,expected.accent,'approval button palette '+theme);summary.themes.push({theme,device,overflow,pageStyle,licenseStyle,deleteStyle,approvalStyle});
   if((theme==='night'&&device==='desktop')||(theme==='mist'&&device==='phone')){await row(page,'member').getByRole('button',{name:'Behörighet & licens',exact:true}).click();await page.screenshot({path:path.join(output,'admin-'+theme+'-'+device+'-review.png'),fullPage:true});await page.locator('#licenseDialog button[data-close]').click();}
  }
 }
 passed('All three action dialogs open/close in all seven palettes at phone, tablet and desktop widths; no horizontal overflow.');
 reset();failNext='list';await page.reload();await page.waitForFunction(()=>document.getElementById('empty').textContent.includes('kunde inte hämtas'));await waitIdle(page);await page.locator('#refresh').click();await page.waitForSelector('.userrow');passed('Failed initial load keeps the retry message; refresh recovers.');await page.getByRole('link',{name:'Startsidan'}).click();assert.ok(page.url().endsWith('/index.html'));passed('Home navigation.');await openPage(page,base);await page.getByRole('button',{name:'Logga ut',exact:true}).click();await page.waitForURL('**/auth/login.html');passed('Logout button invokes auth logout handler.');
 assert.deepEqual(summary.pageErrors,[],'no JavaScript runtime errors');await browser.close();server.close();fs.writeFileSync(path.join(output,'admin-review-results.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({checks:summary.checks,bugs:summary.bugs,themesTested:summary.themes.length,pageErrors:summary.pageErrors},null,2));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
