(() => {
 'use strict';
 const root=new URL('../',document.currentScript.src),config=window.TILLSYNO_AUTH_CONFIG;
 if(!window.supabase?.createClient||!config)return;
 const client=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const key='tillsyno-offline-access-v1',loginKey='tillsyno-last-login-v1',WEEK=7*86400000;
 const valid=role=>['admin','member'].includes(role),kind=['smartmatch','control','drawing'];
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}};
 const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
 const clear=()=>{try{localStorage.removeItem(key)}catch(_){}};
 const markLogin=userId=>{if(userId)write(loginKey,{userId,at:Date.now()});};
 const within=stamp=>Number.isFinite(Number(stamp))&&Number(stamp)>0&&Date.now()>=Number(stamp)&&Date.now()-Number(stamp)<WEEK;
 const loginFresh=id=>{const v=read(loginKey);return v?.userId===id&&within(v.at)};
 function permitted(access,module){return access.role==='admin'||!module||Array.isArray(access.modules)&&access.modules.includes(module)}
 async function verify({allowOffline=false}={}){
  if(!navigator.onLine){
   if(allowOffline){
    const saved=read(key);
    if(saved?.userId&&valid(saved.role)&&within(saved.verifiedAt)&&loginFresh(saved.userId))return {...saved,offline:true};
   }
   clear();throw Error('Offlineperioden är slut eller ingen inloggning finns. Anslut till internet och logga in.');
  }
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user){clear();throw Error('Logga in för att öppna Tillsyno.');}
  if(!loginFresh(data.user.id)){clear();throw Error('Det har gått sju dagar sedan inloggningen. Logga in med ditt lösenord igen.');}
  const result=await client.from('tillsyno_access').select('access_role,allowed_modules,license_expires_at').eq('user_id',data.user.id).maybeSingle();
  if(result.error)throw Error('Behörigheten kunde inte kontrolleras. Försök igen.');
  if(!valid(result.data?.access_role)){clear();throw Error('Kontot är inte godkänt. Kontakta administratören.');}
  const row=result.data;
  if(row.access_role!=='admin'&&row.license_expires_at&&Date.parse(row.license_expires_at)<=Date.now()){
   clear();throw Error('Din licens har gått ut. Kontakta administratören för att förlänga den.');
  }
  const access={userId:data.user.id,email:data.user.email||'',role:row.access_role,
   modules:row.access_role==='admin'?kind:Array.isArray(row.allowed_modules)?row.allowed_modules:[],
   expiresAt:row.license_expires_at||null,verifiedAt:Date.now(),loginAt:read(loginKey)?.at||0};
  write(key,access);
  return {...access,offline:false};
 }
 async function logout(){clear();try{localStorage.removeItem(loginKey)}catch(_){};await client.auth.signOut({scope:'local'});location.replace(new URL('auth/login.html',root));}
 async function admin(action,data={}){
  if(!navigator.onLine)throw Error('Användarhantering kräver internet.');
  const access=await verify();
  if(access.role!=='admin')throw Error('Endast administratören får göra detta.');
  const {data:session}=await client.auth.getSession();
  if(!session.session)throw Error('Logga in igen.');
  const response=await fetch(config.url+'/functions/v1/tillsyno-admin',{method:'POST',cache:'no-store',
   headers:{'Content-Type':'application/json',apikey:config.publishableKey,Authorization:'Bearer '+session.session.access_token},
   body:JSON.stringify({action,...data})});
  const result=await response.json().catch(()=>({error:'Servern kunde inte svara.'}));
  if(!response.ok)throw Error(result.error||'Åtgärden misslyckades.');
  return result;
 }
 window.TillsynoAuth={client,root,verify,logout,admin,clear,markLogin,permitted};
})();