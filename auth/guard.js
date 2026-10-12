(() => {
 'use strict';
 const start=async()=>{
  const auth=window.TillsynoAuth;
  if(!auth){document.documentElement.removeAttribute('data-auth-pending');document.body.replaceChildren();const p=document.createElement('p');p.textContent='Inloggningen kunde inte laddas. Ladda om appen med internet.';document.body.appendChild(p);return;}
  try{
   const access=await auth.verify({allowOffline:document.body.dataset.requireRole!=='admin'});
   if(document.body.dataset.requireRole==='admin'&&access.role!=='admin'){location.replace(new URL('index.html',auth.root));return;}
   window.TillsynoCurrentAccess=access;
   document.querySelectorAll('[data-admin-only]').forEach(el=>el.hidden=access.role!=='admin');
   document.querySelectorAll('[data-account-email]').forEach(el=>el.textContent=access.email);
   document.querySelectorAll('[data-logout]').forEach(el=>el.addEventListener('click',()=>void auth.logout()));
   document.documentElement.removeAttribute('data-auth-pending');
   window.dispatchEvent(new CustomEvent('tillsyno-authorized',{detail:access}));
  }catch(error){
   if(!navigator.onLine){document.documentElement.removeAttribute('data-auth-pending');document.body.replaceChildren();const p=document.createElement('p');p.textContent=error.message;document.body.appendChild(p);return;}
   const login=new URL('auth/login.html',auth.root);login.searchParams.set('next',location.pathname+location.search);location.replace(login);
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else void start();
 // Recheck authorization when connectivity returns. Offline projects stay local.
 window.addEventListener('online',()=>{if(window.TillsynoAuth)void start()});
})();
