'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'supabase/functions/tillsyno-admin/index.ts'),'utf8').replace(/^import .*\n/,'').replace('export function','function').replace(/Deno\.serve\([\s\S]*$/,'');
const owner='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222',pending='33333333-3333-4333-8333-333333333333';
const jwt=id=>'header.'+Buffer.from(JSON.stringify({session_id:id})).toString('base64url')+'.signature';
const ownerToken=jwt(owner),memberToken=jwt(member),revokedToken=jwt(pending);
const roles=new Map([[owner,{access_role:'admin',allowed_modules:['smartmatch','control','drawing'],license_expires_at:null}],[member,{access_role:'member',allowed_modules:['smartmatch','control'],license_expires_at:new Date(Date.now()+20*86400000).toISOString()}]]),users=new Map([[owner,{id:owner,email:'owner@example.invalid',email_confirmed_at:'2026-01-01'}],[member,{id:member,email:'member@example.invalid',email_confirmed_at:'2026-01-01'}],[pending,{id:pending,email:'pending@example.invalid'}]]);
let requests=0,links=0;
const ok=data=>({data,error:null});
function query(){let kind='select',id,changes;
 const q={select(){return q},eq(_,value){id=value;return q},delete(){kind='delete';return q},update(data){kind='update';changes=data;return q},maybeSingle:async()=>ok(roles.get(id)||null),
 upsert:async row=>{roles.set(row.user_id,{...roles.get(row.user_id),...row});return ok(row)},
 then(resolve,reject){requests++;
  if(kind==='delete'){roles.delete(id);return Promise.resolve(ok(null)).then(resolve,reject)}
  if(kind==='update'){roles.set(id,{...roles.get(id),...changes});return Promise.resolve(ok(null)).then(resolve,reject)}
  return Promise.resolve(ok([...roles].map(([user_id,row])=>({user_id,...row})))).then(resolve,reject)
 }};return q;
}
const api={from:query,rpc:async(_,args)=>ok(args._session_id!==pending),auth:{getUser:async token=>[ownerToken,revokedToken].includes(token)?ok({user:users.get(owner)}):token===memberToken?ok({user:users.get(member)}):{data:{user:null},error:Error('invalid')},admin:{
 listUsers:async()=>ok({users:[...users.values()]}),getUserById:async id=>ok({user:users.get(id)}),
 deleteUser:async id=>{users.delete(id);roles.delete(id);return ok(null)},
 updateUserById:async(id,data)=>{if(data.ban_duration)users.get(id).banned_until=data.ban_duration==='none'?null:'2100-01-01';return ok({user:users.get(id)})},
 generateLink:async args=>{links++;const id='44444444-4444-4444-8444-444444444444';const user={id,email:args.email};if(args.type==='invite')users.set(id,user);return ok({user,properties:{action_link:'https://example.invalid/personal-link'}})}
}}};
const context={Response,Date,Map,Set,JSON,Error,atob,createClient:()=>api};vm.createContext(context);vm.runInContext(source,context);
const handler=context.makeHandler(()=>api,name=>({SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server-only'}[name]));
async function call(action,data={},token=ownerToken,origin='https://dyli2009-cmd.github.io'){
 const headers={'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;if(origin)headers.Origin=origin;
 const response=await handler(new Request('https://example.invalid/admin',{method:'POST',headers,body:JSON.stringify({action,...data})}));return {status:response.status,data:await response.json()};
}
(async()=>{
 assert.equal((await call('list',{},null)).status,401,'unauthenticated denied');
 assert.equal((await call('list',{},'invalid')).status,401,'bad JWT denied');
 assert.equal((await call('list',{},memberToken)).status,403,'member denied');
 assert.equal((await call('list',{},revokedToken)).status,401,'revoked owner session denied');
 assert.equal((await call('list',{},ownerToken,'https://evil.invalid')).status,403,'foreign origin denied');
 const listed=await call('list');assert.equal(listed.status,200);assert.equal(listed.data.users.length,3);assert.ok(listed.data.users.find(u=>u.id===owner).protected);
 assert.equal((await call('remove',{userId:owner})).status,409,'owner cannot remove self');assert.equal(roles.get(owner).access_role,'admin');
 assert.equal((await call('approve',{userId:pending,modules:['drawing'],licenseDays:2})).status,409,'email confirmation required');users.get(pending).email_confirmed_at='2026-01-01';assert.equal((await call('approve',{userId:pending,modules:['drawing'],licenseDays:2})).status,200);assert.deepEqual([...roles.get(pending).allowed_modules],['drawing'],'approval honors selected modules');assert.equal(roles.get(pending).access_role,'member','approval never grants admin');
 assert.equal((await call('remove',{userId:member})).status,409,'legacy removal is refused');roles.delete(member);users.get(member).banned_until='2100-01-01';
 assert.equal((await call('list',{},memberToken)).status,401,'removed/banned user cannot use former JWT');
 assert.equal((await call('approve',{userId:member,modules:['smartmatch','control'],licenseDays:7})).status,200);assert.equal(roles.get(member).access_role,'member');
 assert.equal((await call('list',{},memberToken)).status,403,'reactivation still cannot grant admin API');
 assert.equal((await call('add',{email:'bad'})).status,400);assert.equal(links,0);
 assert.equal((await call('add',{email:'member@example.invalid'})).status,409);assert.equal(links,0,'duplicate does not create link');
 const added=await call('add',{email:'new@example.invalid',name:'New colleague'});assert.equal(added.status,200);assert.equal(links,1);assert.ok(added.data.link);assert.equal(roles.get('44444444-4444-4444-8444-444444444444').access_role,'member');
 assert.equal((await call('link',{userId:member})).status,200);assert.equal(links,2);
 const update=await call('update',{userId:member,modules:['smartmatch'],licenseDays:2});
 assert.equal(update.status,200,'admin may edit modules and duration');
 assert.deepEqual([...roles.get(member).allowed_modules],['smartmatch']);
 assert.ok(Math.abs(Date.parse(roles.get(member).license_expires_at)-(Date.now()+2*86400000))<2000);
 const previous=Date.parse(roles.get(member).license_expires_at);
 assert.equal((await call('extend',{userId:member,licenseDays:30})).status,200,'admin may extend');
 assert.ok(Math.abs(Date.parse(roles.get(member).license_expires_at)-(previous+30*86400000))<2000,'extend uses original expiry');
 assert.equal((await call('update',{userId:member,modules:['fake']})).status,400);
 assert.equal((await call('extend',{userId:member,licenseDays:-20})).status,400);
 assert.equal((await call('update',{userId:owner,modules:['drawing']})).status,409,'admin cannot edit protected owner');
 assert.equal((await call('cancelLicense',{userId:member})).status,200);assert.equal(roles.get(member).license_expires_at,'1970-01-01T00:00:00.000Z');assert.equal((await call('list')).data.users.find(u=>u.id===member).status,'revoked');
 assert.equal((await call('update',{userId:member,licenseExpiresOn:'2026-12-31'})).status,200);assert.equal(roles.get(member).license_expires_at,'2026-12-31T23:00:00.000Z');
 assert.equal((await call('delete',{userId:owner,confirmEmail:'owner@example.invalid'})).status,409);assert.equal((await call('delete',{userId:pending,confirmEmail:'wrong@example.invalid'})).status,400);assert.ok(users.has(pending));assert.equal((await call('delete',{userId:pending,confirmEmail:'pending@example.invalid'})).status,200);assert.equal(users.has(pending),false);assert.equal(roles.has(pending),false);
 assert.equal((await call('promote',{userId:member,role:'admin'})).status,400);
 assert.equal((await call('remove',{userId:'not-a-uuid'})).status,400);
 console.log('PASS admin API: session, CORS, role, account lifecycle, license editing/extension, validation and owner protection.');
 // Client offline permission cannot authorize an admin server operation.
 const cache=new Map(),localStorage={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)};
 let currentRole='member';const client={auth:{getUser:async()=>ok({user:users.get(member)}),getSession:async()=>ok({session:{user:users.get(member),access_token:'member-token'}})},from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>ok(currentRole?{access_role:currentRole,allowed_modules:['smartmatch','control'],license_expires_at:new Date(Date.now()+3*86400000).toISOString()}:null)})};
 const frontend={window:{TILLSYNO_AUTH_CONFIG:{url:'https://example.invalid',publishableKey:'public'},supabase:{createClient:()=>client}},document:{currentScript:{src:'https://dyli2009-cmd.github.io/tillsyno/auth/client.js'}},URL,navigator:{onLine:true},localStorage,Date,JSON,Error,fetch:async()=>new Response(JSON.stringify({error:'Endast administratören'}),{status:403})};
 vm.createContext(frontend);vm.runInContext(fs.readFileSync(path.join(root,'auth/client.js'),'utf8'),frontend);const auth=frontend.window.TillsynoAuth;
 auth.markLogin(member);
 assert.equal((await auth.verify()).role,'member');frontend.navigator.onLine=false;assert.equal((await auth.verify({allowOffline:true})).offline,true);
 await assert.rejects(()=>auth.admin('list'),/internet/);frontend.navigator.onLine=true;await assert.rejects(()=>auth.admin('list'),/administratören/);
 currentRole=null;await assert.rejects(()=>auth.verify(),/väntar på administratörens godkännande/);assert.equal(cache.has('tillsyno-offline-access-v1'),false,'revoked role clears offline grant');
 frontend.navigator.onLine=false;await assert.rejects(()=>auth.verify({allowOffline:true}),/Offlineperioden/);
 console.log('PASS client: password freshness, online membership, 7-day offline permission, admin requires network, revoked membership.');
 // Login accepts only explicit same-app destinations, never an external next URL.
 for(const [next,expected]of [['https://evil.invalid','index.html'],['/tillsyno/auth/admin.html','auth/admin.html'],['/tillsyno/auth/login.html','index.html']]){
  let target;const form={addEventListener(){}},message={};
  const s={document:{getElementById:id=>id==='login'?form:message},window:{TillsynoAuth:{root:new URL('https://dyli2009-cmd.github.io/tillsyno/'),verify:async()=>({role:'admin'}),client:{auth:{getSession:async()=>ok({session:{}})}}}},setTimeout,clearTimeout,location:{search:'?next='+encodeURIComponent(next),replace:url=>{target=String(url)}},URL,URLSearchParams};
  vm.createContext(s);vm.runInContext(fs.readFileSync(path.join(root,'auth/login.js'),'utf8'),s);await new Promise(r=>setImmediate(r));assert.equal(target,'https://dyli2009-cmd.github.io/tillsyno/'+expected);
 }
 console.log('PASS login: successful account enters app; external redirect and login-loop destinations rejected.');
})().catch(error=>{console.error(error);process.exitCode=1});
