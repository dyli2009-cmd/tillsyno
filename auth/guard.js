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
 // Keep unlicensed cards visible but not clickable.
 function lockHomeLink(el){
  if(el.hasAttribute('href')){el.dataset.originalHref=el.getAttribute('href');el.removeAttribute('href');}
  el.setAttribute('data-tillsyno-module-locked','');
  el.setAttribute('aria-disabled','true');el.setAttribute('tabindex','-1');
  const action=el.querySelector('b');
  if(action&&!action.dataset.originalAction){action.dataset.originalAction=action.textContent;action.textContent='🔒 Låst';}
 }
 function setProfile(label,details=''){
  const title=document.querySelector('#appHome [data-account-role]');
  if(title)title.textContent=label;
  const note=document.querySelector('#appHome [data-account-license]');
  if(note){note.textContent=details;note.hidden=!details;}
 }
 function restoreHomeLinks(){
  document.documentElement.removeAttribute('data-tillsyno-waiting');
  const box=document.getElementById('tillsynoWaitingNotice');
  if(box)box.remove();
  document.querySelectorAll('#appHome [data-original-href]').forEach(el=>{
   el.setAttribute('href',el.dataset.originalHref);
   delete el.dataset.originalHref;
   el.removeAttribute('data-tillsyno-module-locked');
   el.removeAttribute('aria-disabled');el.removeAttribute('tabindex');
   const action=el.querySelector('[data-original-action]');
   if(action){action.textContent=action.dataset.originalAction;delete action.dataset.originalAction;}
  });
 }
 function renderWaitingHome(auth){
  if(!isHome()){
   location.replace(new URL('index.html?v=2.4.276',auth.root));
   return;
  }
  // The existing Tillsyno start page remains visible. No PDF or work module
  // is made available until the Supabase access row has been approved.
  document.documentElement.setAttribute('data-tillsyno-waiting','');
  document.body.classList.add('homeMode');
  window.TillsynoCurrentAccess=null;
  document.getElementById('tillsynoLicenseState')?.remove();
  setProfile('Väntar på godkännande');
  document.querySelectorAll('[data-admin-only]').forEach(el=>el.hidden=true);
  document.querySelectorAll('[data-logout]').forEach(el=>{
   if(!el.dataset.boundLogout){
    el.dataset.boundLogout='1';
    el.addEventListener('click',()=>void auth.logout());
   }
  });
  document.querySelectorAll('#appHome .homeChoice, #appHome .homeToolsLink').forEach(lockHomeLink);
  let box=document.getElementById('tillsynoWaitingNotice');
  if(!box){
   box=document.createElement('section');box.id='tillsynoWaitingNotice';
   box.setAttribute('role','status');box.setAttribute('aria-live','polite');
   const heading=document.createElement('strong');heading.textContent='Kontot väntar på godkännande';
   const content=document.createElement('p');
   content.textContent='Modulerna är låsta tills administratören godkänner.';
   const check=document.createElement('button');check.id='tillsynoCheckApproval';check.type='button';
   check.textContent='Uppdatera status';
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
  const retry=document.createElement('button');retry.type='button';retry.textContent='Försök igen';retry.onclick=()=>void start();
  panel.append(h,p,retry,a);overlay.replaceChildren(panel);
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
   if(isHome()){
    // Only granted modules are interactive; other cards remain visibly locked.
    document.querySelectorAll('#appHome .homeChoice, #appHome .homeToolsLink').forEach(el=>{
     const href=el.getAttribute('href')||el.dataset.originalHref||'';
     const target=/drawing-tools/i.test(href)?'drawing':/smartmatch|project-workspace|project-flow/i.test(href)?'smartmatch':/all-in-one|security.html/i.test(href)?'control':null;
     if(target&&!auth.permitted(access,target))lockHomeLink(el);
    });
    document.getElementById('tillsynoLicenseState')?.remove();
    const days=access.expiresAt?Math.max(0,Math.ceil((Date.parse(access.expiresAt)-Date.now())/86400000)):null;
    const detail=access.role==='admin'?'':days===null?'Licens aktiv':access.offline?'Offline · licens kontrolleras vid nästa anslutning':days+' dagar kvar på licensen';
    setProfile(access.role==='admin'?'Administration · Full tillgång':'Användare',detail);
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
   // Network, permission and UI errors are not a failed password login.
   if(!['AUTH_REQUIRED','LOGIN_EXPIRED'].includes(error?.code)){showDenied(error.message||'Appen kunde inte öppnas. Försök igen.');return;}
   const login=new URL('auth/login.html',auth?.root||new URL('./',location.href));
   login.searchParams.set('next',location.pathname+location.search);
   login.searchParams.set('reason',error.code);
   location.replace(login);
  }finally{running=false;}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else void start();
 window.addEventListener('online',()=>void start());
 window.addEventListener('focus',()=>void start());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void start()});
 setInterval(()=>void start(),60*60*1000);
})();