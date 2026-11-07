import { createClient } from 'npm:@supabase/supabase-js@2.49.10';

// All authorization is performed here against the current access row, never user_metadata.
export function makeHandler(clientFactory, getEnv) {
 const origins=new Set(['https://dyli2009-cmd.github.io','capacitor://localhost','http://localhost','https://localhost']);
 const redirectTo='https://dyli2009-cmd.github.io/tillsyno/auth/reset-password.html';
 return async request=>{
  const origin=request.headers.get('Origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
   'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if(origin&&origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!origins.has(origin))return reply({error:'Otillåten webbplats.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'Använd POST.'},405);
  const token=request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return reply({error:'Logga in först.'},401);
  try{
   const secret=JSON.parse(getEnv('SUPABASE_SECRET_KEYS')||'{}').default||getEnv('SUPABASE_SERVICE_ROLE_KEY');
   const publicKey=JSON.parse(getEnv('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||getEnv('SUPABASE_ANON_KEY');
   const options={auth:{persistSession:false,autoRefreshToken:false}};
   const userClient=clientFactory(getEnv('SUPABASE_URL'),publicKey,options);
   const {data:identity,error:authError}=await userClient.auth.getUser(token);
   if(authError||!identity?.user||Date.parse(identity.user.banned_until||'')>Date.now())return reply({error:'Logga in igen.'},401);
   const admin=clientFactory(getEnv('SUPABASE_URL'),secret,options);
   // Decode claims only AFTER Auth has verified the token, and bind the session to getUser's ID.
   let sessionId;
   try{sessionId=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id}catch(_){}
   if(typeof sessionId!=='string'||!sessionId.match(/^[0-9a-f-]{36}$/i))return reply({error:'Logga in igen.'},401);
   const {data:sessionActive,error:sessionError}=await admin.rpc('tillsyno_session_active',{_session_id:sessionId,_user_id:identity.user.id});
   if(sessionError)throw sessionError;
   if(!sessionActive)return reply({error:'Sessionen är avslutad. Logga in igen.'},401);
   const {data:access,error:accessError}=await admin.from('tillsyno_access').select('access_role').eq('user_id',identity.user.id).maybeSingle();
   if(accessError)throw accessError;
   if(access?.access_role!=='admin')return reply({error:'Endast administratören kan hantera användare.'},403);
   const body=await request.json().catch(()=>null);
   if(!body||typeof body.action!=='string')return reply({error:'Ogiltig åtgärd.'},400);
   const checked=result=>{if(result.error)throw result.error;return result.data};
   const kinds=['smartmatch','control','drawing'];
   const goodModules=v=>Array.isArray(v)&&v.length>0&&v.length<=3&&new Set(v).size===v.length&&v.every(x=>kinds.includes(x));
   const goodDays=v=>Number.isInteger(v)&&v>=1&&v<=3650;
   const expiration=(days,base=Date.now())=>new Date(base+days*86400000).toISOString();
   const CANCELLED='1970-01-01T00:00:00.000Z';
   const expirationOn=raw=>{
    if(typeof raw!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(raw))return null;
    const [year,month,day]=raw.split('-').map(Number);
    const checked=new Date(Date.UTC(year,month-1,day));
    if(checked.getUTCFullYear()!==year||checked.getUTCMonth()!==month-1||checked.getUTCDate()!==day)return null;
    const dayParts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=type=>dayParts.find(x=>x.type===type)?.value||'';
    const current=get('year')+'-'+get('month')+'-'+get('day');
    if(raw<current||Date.UTC(year,month-1,day)-Date.now()>3650*86400000)return null;
    // Swedish end of selected calendar day: midnight at the start of the following day.
    const nextUTC=Date.UTC(year,month-1,day+1);
    const stockholmHourAtUTC=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',hour:'2-digit',hourCycle:'h23'}).format(new Date(nextUTC)));
    if(!Number.isFinite(stockholmHourAtUTC))return null;
    return new Date(nextUTC-stockholmHourAtUTC*3600000).toISOString();
   };
   const allUsers=async()=>{
    const users=[];
    for(let page=1;page<=100;page++){
     const data=checked(await admin.auth.admin.listUsers({page,perPage:100}));users.push(...data.users);
     if(data.users.length<100)return users;
    }
    throw Error('Användarlistan är för stor.');
   };
   if(body.action==='list'){
    const users=await allUsers(),rows=checked(await admin.from('tillsyno_access').select('user_id,access_role,allowed_modules,license_expires_at'))||[];
    const roles=new Map(rows.map(row=>[row.user_id,row]));
    return reply({users:users.map(u=>({id:u.id,email:u.email||'',name:String(u.user_metadata?.name||'').slice(0,100),
     role:roles.get(u.id)?.access_role||null,modules:roles.get(u.id)?.allowed_modules||[],expiresAt:roles.get(u.id)?.license_expires_at||null,
     status:Date.parse(u.banned_until||'')>Date.now()?'removed':roles.has(u.id)?(Date.parse(roles.get(u.id)?.license_expires_at||'')===Date.parse(CANCELLED)?'revoked':roles.get(u.id)?.license_expires_at&&Date.parse(roles.get(u.id).license_expires_at)<=Date.now()?'expired':u.email_confirmed_at?'active':'invited'):'pending',
     emailVerified:!!u.email_confirmed_at,createdAt:u.created_at,lastSignIn:u.last_sign_in_at||null,protected:roles.get(u.id)?.access_role==='admin'||u.id===identity.user.id}))});
   }
   if(body.action==='add'){
    const modules=body.modules===undefined?kinds:body.modules,days=body.licenseDays===undefined?30:body.licenseDays;
    if(!goodModules(modules)||!goodDays(days))return reply({error:'Välj moduler och en giltig licenstid.'},400);
    const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim().slice(0,100);
    if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return reply({error:'Skriv en giltig e-postadress.'},400);
    if((await allUsers()).some(u=>u.email?.toLowerCase()===email))return reply({error:'Kontot finns redan. Använd knapparna i användarlistan.'},409);
    const data=checked(await admin.auth.admin.generateLink({type:'invite',email,options:{redirectTo,data:{name}}}));
    if(!data?.user?.id||!data.properties?.action_link)throw Error('Länken kunde inte skapas.');
    checked(await admin.from('tillsyno_access').upsert({user_id:data.user.id,access_role:'member',allowed_modules:modules,license_expires_at:expiration(days)}));
    return reply({ok:true,email,link:data.properties.action_link,message:'Användaren är tillagd. Dela den personliga länken så att användaren kan välja lösenord.'});
   }
   if(!['approve','remove','delete','link','update','extend','cancelLicense'].includes(body.action))return reply({error:'Okänd åtgärd.'},400);
   if(typeof body.userId!=='string'||!body.userId.match(/^[0-9a-f-]{36}$/i))return reply({error:'Välj en användare.'},400);
   const target=checked(await admin.auth.admin.getUserById(body.userId))?.user;
   if(!target)return reply({error:'Användaren finns inte.'},404);
   const targetAccess=checked(await admin.from('tillsyno_access').select('access_role,license_expires_at').eq('user_id',target.id).maybeSingle());
   if(target.id===identity.user.id||targetAccess?.access_role==='admin')return reply({error:'Ägarkontot kan inte ändras här.'},409);
   if(body.action==='delete') {
    // Irreversible hard deletion: this account and its cascading access row disappear.
    // The owner/admin account is protected by the guard above.
    if(String(body.confirmEmail||'').trim().toLowerCase()!==(target.email||'').toLowerCase())
     return reply({error:'Bekräfta användarens e-postadress innan du raderar kontot.'},400);
    const deletion=await admin.auth.admin.deleteUser(target.id);
    if(deletion.error)throw deletion.error;
    return reply({ok:true,message:'Kontot har raderats från Tillsyno och Supabase. E-postadressen kan registreras på nytt.'});
   }
   if(body.action==='remove') {
    // Old cached UI used this action to ban accounts. Prevent misleading partial deletion.
    return reply({error:'Uppdatera administrationssidan och använd Radera konto för att ta bort kontot helt.'},409);
   }
   if(body.action==='approve'){
    // Require verified email and explicit administrator-selected modules and license.
    if(!target.email_confirmed_at)return reply({error:'Användaren måste bekräfta sin e-postadress innan godkännande.'},409);
    if(!goodModules(body.modules)||!goodDays(body.licenseDays))return reply({error:'Välj moduler och giltig licenstid innan godkännande.'},400);
    checked(await admin.from('tillsyno_access').upsert({user_id:target.id,access_role:'member',allowed_modules:body.modules,license_expires_at:expiration(body.licenseDays)}));
    checked(await admin.auth.admin.updateUserById(target.id,{ban_duration:'none'}));
    return reply({ok:true,message:'Användaren är godkänd och har fått tilldelad licens.'});
   }

   if(body.action==='cancelLicense'){
    if(targetAccess?.access_role!=='member'||Date.parse(target.banned_until||'')>Date.now())
     return reply({error:'Godkänn användaren innan du avslutar licensen.'},409);
    checked(await admin.from('tillsyno_access').update({license_expires_at:CANCELLED}).eq('user_id',target.id));
    return reply({ok:true,message:'Licensen har avslutats. Åtkomst nekas vid nästa onlinekontroll. Kontot är kvar och kan få ny licens.'});
   }
   if(body.action==='update'||body.action==='extend'){
    if(targetAccess?.access_role!=='member'||Date.parse(target.banned_until||'')>Date.now())
     return reply({error:'Godkänn användaren innan du ändrar licensen.'},409);
    const changes={};
    if(body.action==='update'){
     if(body.modules!==undefined){
      if(!goodModules(body.modules))return reply({error:'Välj minst en giltig modul.'},400);
      changes.allowed_modules=body.modules;
     }
     if(body.licenseDays!==undefined&&body.licenseExpiresOn!==undefined)
      return reply({error:'Välj antingen snabbval eller ett eget slutdatum.'},400);
     if(body.licenseExpiresOn!==undefined){
      const until=expirationOn(body.licenseExpiresOn);
      if(!until)return reply({error:'Välj ett giltigt slutdatum från idag och högst tio år framåt.'},400);
      changes.license_expires_at=until;
     }else if(body.licenseDays!==undefined){
      if(!goodDays(body.licenseDays))return reply({error:'Ange mellan 1 och 3650 dagar.'},400);
      changes.license_expires_at=expiration(body.licenseDays);
     }
    }else{
     if(!goodDays(body.licenseDays))return reply({error:'Ange mellan 1 och 3650 dagar.'},400);
     const current=Date.parse(targetAccess.license_expires_at||'');
     changes.license_expires_at=expiration(body.licenseDays,Number.isFinite(current)?Math.max(Date.now(),current):Date.now());
    }
    if(!Object.keys(changes).length)return reply({error:'Inga ändringar angivna.'},400);
    checked(await admin.from('tillsyno_access').update(changes).eq('user_id',target.id));
    return reply({ok:true,message:body.action==='extend'?'Licensen har förlängts.':'Behörigheten har sparats.'});
   }
   if(targetAccess?.access_role!=='member'||Date.parse(target.banned_until||'')>Date.now())return reply({error:'Godkänn användaren innan du skapar en länk.'},409);
   const data=checked(await admin.auth.admin.generateLink({type:target.email_confirmed_at?'recovery':'invite',email:target.email,options:{redirectTo}}));
   return reply({ok:true,email:target.email,link:data.properties.action_link,message:'Dela den personliga länken med användaren.'});
  }catch(error){
   // Never log session tokens or generated invitation links.
   return reply({error:'Åtgärden kunde inte slutföras. Ladda om listan och försök igen.'},500);
  }
 };
}

Deno.serve(makeHandler(createClient,name=>Deno.env.get(name)));
