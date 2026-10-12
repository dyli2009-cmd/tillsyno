(() => {
 'use strict';
 const moduleForPage=()=>{
  const name=location.pathname.split('/').pop()||'index.html';
  if(name==='index.html'||name.startsWith('licensed-entry'))return null;
  if(name==='drawing-tools.html')return 'drawing';
  if(name==='all-in-one.html'||name==='security.html'||name.startsWith('licensed-control'))return 'control';
  if(name.startsWith('project')||name.startsWith('smartmatch')||name.startsWith('licensed-project')||name.startsWith('licensed-door')||name==='search-lab.html')return 'smartmatch';
  return null;
 };
 let running=false;
 const showDenied=(msg)=>{
  // Never destroy an open project or in-memory PDF when the offline grace period ends.
  let overlay=document.getElementById('tillsynoAccessDenied');
  if(!overlay){
   overlay=document.createElement('div');overlay.id='tillsynoAccessDenied';
   overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#102d3a;overflow:auto;padding:16px;display:grid;place-items:center';
   document.body.append(overlay);
  }
  const panel=document.createElement('main');
  panel.style.cssText='font:16px system-ui;width:min(460px,100%);padding:28px;background:#f4f8fa;border-radius:15px;color:#183847';
  const h=document.createElement('h2');h.textContent='Åtkomst saknas';
  const p=document.createElement('p');p.textContent=msg;
  const a=document.createElement('a');a.href=new URL('auth/login.html',window.TillsynoAuth?.root||new URL('./',location.href));a.textContent='Logga in';
  panel.append(h,p,a);overlay.replaceChildren(panel);
  document.documentElement.removeAttribute('data-auth-pending');
 };
 const start=async()=>{
  if(running)return;running=true;
  try{
   const auth=window.TillsynoAuth;
   if(!auth){showDenied('Inloggningen kunde inte laddas. Öppna med internet.');return;}
   const access=await auth.verify({allowOffline:document.body.dataset.requireRole!=='admin'});
   if(document.body.dataset.requireRole==='admin'&&access.role!=='admin'){showDenied('Endast administratören får öppna sidan.');return;}
   const module=moduleForPage();
   if(!auth.permitted(access,module)){showDenied('Den här modulen ingår inte i din tilldelade behörighet.');return;}
   document.getElementById('tillsynoAccessDenied')?.remove();
   window.TillsynoCurrentAccess=access;
   document.querySelectorAll('[data-admin-only]').forEach(el=>el.hidden=access.role!=='admin');
   document.querySelectorAll('[data-account-email]').forEach(el=>el.textContent=access.email);
   document.querySelectorAll('[data-logout]').forEach(el=>{if(!el.dataset.boundLogout){el.dataset.boundLogout='1';el.addEventListener('click',()=>void auth.logout())}});
   if(location.pathname.endsWith('/')||location.pathname.endsWith('index.html')){
    document.querySelectorAll('a[href]').forEach(el=>{
     const href=el.getAttribute('href')||'';
     const target=/drawing-tools/i.test(href)?'drawing':/smartmatch|project-workspace|project-flow/i.test(href)?'smartmatch':/all-in-one|security.html/i.test(href)?'control':null;
     if(target&&!auth.permitted(access,target))el.hidden=true;
    });
    if(!document.getElementById('tillsynoLicenseState')){
     const tag=document.createElement('p');tag.id='tillsynoLicenseState';
     tag.style.cssText='text-align:center;font:12px system-ui;color:#aecbd6;margin:10px auto 5px;padding:0 15px';
     const days=access.expiresAt?Math.max(0,Math.ceil((Date.parse(access.expiresAt)-Date.now())/86400000)):null;
     tag.textContent=access.role==='admin'?'Administratör · full tillgång':(days===null?'Licens aktiv':access.offline?'Offline · licensens giltighet kontrolleras vid nästa anslutning':days+' dagar kvar på licensen')+' · Ny inloggning senast inom 7 dagar';
     (document.querySelector('.homeAccount')||document.querySelector('.homeShell')||document.body).append(tag);
    }
   }
   document.documentElement.removeAttribute('data-auth-pending');
   window.dispatchEvent(new CustomEvent('tillsyno-authorized',{detail:access}));
  }catch(error){
   if(!navigator.onLine){showDenied(error.message);return;}
   const auth=window.TillsynoAuth;
   if(error?.code==='PENDING_APPROVAL'){
    // Do not render any work area while the account is awaiting approval.
    location.replace(new URL('auth/pending.html',auth?.root||new URL('./',location.href)));
    return;
   }
   const login=new URL('auth/login.html',auth?.root||new URL('./',location.href));
   login.searchParams.set('next',location.pathname+location.search);
   location.replace(login);
  }finally{running=false;}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else void start();
 window.addEventListener('online',()=>void start());
 window.addEventListener('focus',()=>void start());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void start()});
 setInterval(()=>void start(),60*60*1000);
})();