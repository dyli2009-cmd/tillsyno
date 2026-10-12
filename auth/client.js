(() => {
 'use strict';
 const root=new URL('../',document.currentScript.src),config=window.TILLSYNO_AUTH_CONFIG;
 if(!window.supabase?.createClient||!config)return;
 const client=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const key='tillsyno-offline-access-v1';
 const valid=role=>['admin','member'].includes(role);
 const clear=()=>{try{localStorage.removeItem(key)}catch(_){}};
 async function verify({allowOffline=false}={}){
  if(!navigator.onLine){
   if(allowOffline){
    // Local work remains available after the short-lived JWT expires offline.
    // This cache never authorizes a server request; the API always rechecks the user and role.
    let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch(_){}
    const age=Date.now()-Number(saved?.verifiedAt);
    if(saved?.userId&&valid(saved.role)&&Number.isFinite(age)&&age>=0&&age<=7*24*60*60*1000)return {...saved,offline:true};
    clear();
   }
   throw Error('Anslut till internet och logga in först.');
  }
  const {data,error}=await client.auth.getUser();
  if(error||!data.user){clear();throw Error('Logga in för att öppna Tillsyno.');}
  const result=await client.from('tillsyno_access').select('access_role').eq('user_id',data.user.id).maybeSingle();
  if(result.error)throw Error('Behörigheten kunde inte kontrolleras. Försök igen.');
  if(!valid(result.data?.access_role)){clear();throw Error('Kontot är inte godkänt. Kontakta administratören.');}
  const access={userId:data.user.id,email:data.user.email||'',role:result.data.access_role,verifiedAt:Date.now()};
  try{localStorage.setItem(key,JSON.stringify(access))}catch(_){}
  return {...access,offline:false};
 }
 async function logout(){clear();await client.auth.signOut({scope:'local'});location.replace(new URL('auth/login.html',root));}
 async function admin(action,data={}){
  if(!navigator.onLine)throw Error('Användarhantering kräver internet.');
  await verify();
  const {data:session}=await client.auth.getSession();
  if(!session.session)throw Error('Logga in igen.');
  const response=await fetch(config.url+'/functions/v1/tillsyno-admin',{method:'POST',cache:'no-store',
   headers:{'Content-Type':'application/json',apikey:config.publishableKey,Authorization:'Bearer '+session.session.access_token},body:JSON.stringify({action,...data})});
  const result=await response.json().catch(()=>({error:'Servern kunde inte svara.'}));
  if(!response.ok)throw Error(result.error||'Åtgärden misslyckades.');
  return result;
 }
 window.TillsynoAuth={client,root,verify,logout,admin,clear};
})();
