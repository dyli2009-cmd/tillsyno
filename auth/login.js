(() => {
 'use strict';
 const form=document.getElementById('login'),message=document.getElementById('message'),auth=window.TillsynoAuth;
 const show=text=>{message.textContent=text;message.hidden=false;};
 if(!auth){show('Inloggningen kunde inte laddas. Öppna appen med internet och ladda om sidan.');form.hidden=true;return;}
 let busy=false;
 const reason=new URLSearchParams(location.search).get('reason');
 const reasons={AUTH_REQUIRED:'Inloggningen följde inte med till appen. Logga in igen. Om det återkommer: tillåt webbplatsdata för Tillsyno.',LOGIN_EXPIRED:'Logga in igen. Det har gått sju dagar sedan senaste inloggningen.'};
 const deadline=async task=>{let timer;try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Inloggningen svarar inte. Kontrollera anslutningen och försök igen.')),20000);})]);}finally{clearTimeout(timer);}};
 function loginError(error){
  if(error?.code==='invalid_credentials'||error?.message==='Invalid login credentials')return 'Fel e-postadress eller lösenord.';
  if(error?.code==='email_not_confirmed')return 'Bekräfta din e-postadress innan du loggar in.';
  if(error?.status===429)return 'För många försök. Vänta en stund och försök igen.';
  if(error?.status>=500||error?.name==='AuthRetryableFetchError'||error?.name==='TypeError')return 'Inloggningstjänsten kunde inte nås. Kontrollera anslutningen och försök igen.';
  return error?.message||'Det gick inte att logga in. Försök igen.';
 }
 function destination(){
  const fallback=new URL('index.html',auth.root),next=new URLSearchParams(location.search).get('next');
  if(!next)return fallback;
  try{
   const target=new URL(next,auth.root),relative=target.pathname.slice(auth.root.pathname.length);
   if(target.protocol===auth.root.protocol&&target.host===auth.root.host&&target.pathname.startsWith(auth.root.pathname)&&(relative===''||relative==='index.html'||relative==='auth/admin.html'||(relative.endsWith('.html')&&!relative.startsWith('auth/'))))return target;
  }catch(_){}
  return fallback;
 }
 async function enter(){
  try{
   await deadline(auth.verify({allowOffline:true}));
   location.replace(destination());
  }catch(error){
   // Signed in, but not yet licensed: keep the valid session and show a safe start page.
   if(error?.code==='PENDING_APPROVAL'){location.replace(new URL('index.html',auth.root));return;}
   throw error;
  }
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;const button=form.querySelector('button');button.disabled=true;show('Loggar in…');
  let authenticated=false;
  try{
   const fields=new FormData(form),{data,error}=await deadline(auth.client.auth.signInWithPassword({email:String(fields.get('email')||'').trim(),password:String(fields.get('password')||'')}));
   if(error)throw error;
   if(!data?.user)throw Error('Inloggningen kunde inte bekräftas. Försök igen.');
   authenticated=true;auth.markLogin(data.user.id);show('Inloggad · öppnar appen…');
   await enter();
  }catch(error){
   // Show the error immediately; a slow sign-out must never hide it.
   show(loginError(error));
   if(!authenticated&&['invalid_credentials','email_not_confirmed'].includes(error?.code)){auth.clear();void auth.client.auth.signOut({scope:'local'}).catch(()=>{});}
  }finally{busy=false;button.disabled=false;}
 });
 // A redirected authentication failure must remain visible instead of looping.
 if(reasons[reason])show(reasons[reason]);
 else deadline(auth.client.auth.getSession()).then(({data,error})=>{if(error)throw error;if(data.session&&!busy)return enter();}).catch(error=>show(loginError(error)));
})();
