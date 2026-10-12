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
 const isHome=()=>location.pathname.endsWith('/')||location.pathname.endsWith('/index.html');
 // A pending account may view the real home page, but has no module access.
 function restoreHomeLinks(){
  document.documentElement.removeAttribute('data-tillsyno-waiting');
  const box=document.getElementById('tillsynoWaitingNotice');
  if(box)box.remove();
  document.querySelectorAll('#appHome [data-original-href]').forEach(el=>{
   el.setAttribute('href',el.dataset.originalHref);
   delete el.dataset.originalHref;
   el.removeAttribute('aria-disabled');el.removeAttribute('tabindex');
   const action=el.querySelector('[data-original-action]');
   if(action){action.textContent=action.dataset.originalAction;delete action.dataset.originalAction;}
  });
 }
 function renderWaitingHome(auth){
  if(!isHome()){
   location.replace(new URL('index.html?v=2.4.275',auth.root));
   return;
  }
  // The existing Tillsyno start page remains visible. No PDF or work module
  // is made available until the Supabase access row has been approved.
  document.documentElement.setAttribute('data-tillsyno-waiting','');
  document.body.classList.add('homeMode');
  window.TillsynoCurrentAccess=null;
  document.querySelectorAll('[data-admin-only]').forEach(el=>el.hidden=true);
  document.querySelectorAll('[data-logout]').forEach(el=>{
   if(!el.dataset.boundLogout){
    el.dataset.boundLogout='1';
    el.addEventListener('click',()=>void auth.logout());
   }
  });
  document.querySelectorAll('#appHome .homeChoice, #appHome .homeToolsLink').forEach(el=>{
   if(el.hasAttribute('href')){el.dataset.originalHref=el.getAttribute('href');el.removeAttribute('href');}
   el.setAttribute('aria-disabled','true');el.setAttribute('tabindex','-1');
   const action=el.querySelector('b');
   if(action&&!action.dataset.originalAction){action.dataset.originalAction=action.textContent;action.textContent='🔒 Låst';}
  });
  let box=document.getElementById('tillsynoWaitingNotice');
  if(!box){
   box=document.createElement('section');box.id='tillsynoWaitingNotice';
   box.setAttribute('role','status');box.setAttribute('aria-live','polite');
   box.style.cssText='background:#fff7e9;border:1px solid #efd7aa;border-radius:13px;padding:14px;margin:4px 0 17px;color:#664f21;font:14px/1.55 system-ui';
   const heading=document.createElement('strong');heading.textContent='Kontot väntar på godkännande';
   heading.style.cssText='display:block;font-size:16px;margin-bottom:4px';
   const content=document.createElement('p');
   content.textContent='Du är inloggad och kan se startsidan. Kontakta administratören för att få tillgång till SmartMatch, Kontrollflöde och Ritningsverktyg.';
   content.style.cssText='margin:0 0 12px;color:#6e5b38';
   const check=document.createElement('button');check.id='tillsynoCheckApproval';check.type='button';
   check.textContent='Kontrollera godkännande';
   check.style.cssText='background:#173c4b;color:white;border:0;border-radius:9px;padding:10px 14px;font:600 13px system-ui;cursor:pointer';
   check.addEventListener('click',()=>void start());
   box.append(heading,content,check);
   (document.querySelector('#appHome .homeChoices')||document.querySelector('#appHome .homeShell'))?.before(box);
  }
  document.documentElement.removeAttribute('data-auth-pending');
 }
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
   if(isHome())restoreHomeLinks();
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
    renderWaitingHome(auth);
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