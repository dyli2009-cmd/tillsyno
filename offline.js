/* v2.4.282: Offline works silently without an on-screen readiness label. */
(()=>{
 'use strict';
 const VERSION='2.4.364';
 const run=async()=>{
  document.getElementById('tillsynoOfflineStatus')?.remove();
  if(!('serviceWorker' in navigator))return;
  try{
   await navigator.serviceWorker.register('./sw.js?v='+VERSION,{updateViaCache:'none'});
   await navigator.serviceWorker.ready;
   if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
  }catch(error){console.warn('Tillsyno: offlinefiler kunde inte förberedas.',error)}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else void run();
})();
