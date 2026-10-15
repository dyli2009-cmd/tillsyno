(() => {
 'use strict';
 async function start(){
  if(!('serviceWorker' in navigator))return;
  try{await navigator.serviceWorker.register('./sw.js?v=5',{scope:'./',updateViaCache:'none'});if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});}
  catch(error){console.warn('Testkopians offlinefiler kunde inte förberedas.',error);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else void start();
})();
