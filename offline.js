/* App installation and a truthful offline readiness indicator. */
(()=>{
 const VERSION='2.4.273';
 const run=async()=>{
  const host=document.querySelector('.homeShell')||document.querySelector('.headerDetails')||document.querySelector('.appHeader');if(!host)return;
  const status=document.createElement('small');status.id='tillsynoOfflineStatus';status.setAttribute('role','status');status.style.cssText='display:block;font:inherit;font-size:12px;line-height:1.5;margin-top:8px;color:inherit;opacity:.85';host.appendChild(status);
  let ready=false;
  const show=()=>{status.textContent=ready?(navigator.onLine?'Redo för offline':'Offline · arbeta och spara på enheten'):(navigator.onLine?'Förbereder offline…':'Offlinefilerna är inte färdighämtade');status.dataset.ready=String(ready)};
  const check=async()=>{try{const cache=await caches.open('tillsyno-offline-'+VERSION);const marker=await cache.match(new URL('__offline_ready__',document.baseURI));ready=!!marker&&(await marker.text())===VERSION;show()}catch(_){status.textContent='Offline kunde inte förberedas. Öppna appen med internet och försök igen.'}};
  window.addEventListener('online',show);window.addEventListener('offline',show);show();
  if(!('serviceWorker' in navigator)){status.textContent='Den här webbläsaren stöder inte offlineappen.';return}
  navigator.serviceWorker.addEventListener('controllerchange',check);
  try{
   const registration=await navigator.serviceWorker.register('./sw.js?v='+VERSION,{updateViaCache:'none'});
   const watch=worker=>worker?.addEventListener('statechange',check);
   watch(registration.installing);registration.addEventListener('updatefound',()=>watch(registration.installing));
   await navigator.serviceWorker.ready;await check();
   if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
  }catch(_){status.textContent='Offline kunde inte förberedas. Kontrollera internet och öppna appen igen.'}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
