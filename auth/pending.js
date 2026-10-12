(() => {
 'use strict';
 const auth=window.TillsynoAuth;
 const $=id=>document.getElementById(id);
 const refresh=$('refreshApproval'),message=$('pendingMessage');
 let working=false;
 const reveal=()=>document.documentElement.removeAttribute('data-auth-pending');
 const show=(text)=>{message.textContent=text;reveal()};
 const goLogin=()=>location.replace(new URL('auth/login.html',auth?.root||new URL('../',location.href)));
 if(!auth){show('Inloggningen kunde inte laddas. Anslut till internet och ladda om sidan.');refresh.disabled=true;return}
 $('logoutPending').addEventListener('click',()=>void auth.logout());
 const check=async()=>{
  if(working)return;working=true;refresh.disabled=true;
  try{
   // No local pending access token or cached license can unlock a module.
   await auth.verify({allowOffline:false});
   location.replace(new URL('index.html',auth.root));
  }catch(error){
   if(error?.code==='PENDING_APPROVAL'){
    const {data}=await auth.client.auth.getUser();
    if(!data?.user){goLogin();return}
    $('accountEmail').textContent=data.user.email||'';
    show('Kontot väntar på administratörens godkännande. Alla moduler är låsta tills dess.');
   }else if(error?.code==='AUTH_REQUIRED'||error?.code==='LOGIN_EXPIRED'){
    goLogin();return;
   }else{
    // A failed network/server check must never be mistaken for approval.
    show(error.message||'Det gick inte att kontrollera behörigheten. Försök igen när du har internet.');
   }
  }finally{working=false;refresh.disabled=false;reveal()}
 };
 refresh.addEventListener('click',()=>void check());
 window.addEventListener('online',()=>void check());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine)void check()});
 setInterval(()=>{if(!document.hidden&&navigator.onLine)void check()},60000);
 void check();
})();