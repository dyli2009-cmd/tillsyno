(() => {
 'use strict';
 // Removes Tillsyno work data from this browser: drawings, protocols, projects,
 // templates and settings in IndexedDB, localStorage and sessionStorage.
 // Kept: appearance and text size, the offline app files, and (only when
 // "Rensa enhetens data" keeps the user signed in) the sign-in session.
 // This page loads no module code, so no open project can save itself back
 // while the data is removed. Other open Tillsyno tabs are sent here first.
 const params=new URLSearchParams(location.search);
 const mode=params.get('mode')==='keep'?'keep':'logout';
 const automatic=params.get('run')==='1';
 const root=new URL('../',location.href);
 const SIGNAL='tillsyno-device-clear-signal';
 const KEEP_ALWAYS=new Set(['tillsyno-ui-appearance-v1','doorservice-ui-text-level','tillsyno-controlflow-text-level-v1']);
 const SESSION_KEYS=new Set(['tillsyno-offline-access-v1','tillsyno-last-login-v1','tillsyno-auth-storage-mode-v1']);
 // Used when the browser cannot list its databases (indexedDB.databases()).
 const KNOWN_DATABASES=['tillsyno-offline-work','smartmatch-local-pdf-resume','smartmatch-read-test-v9-shared-local-pdf-resume',
  'tillsyno-digital-doorcards-v1','tillsyno-projektering-v2','tillsyno-projektering-bibliotek-v1','doorservice-drawing-transfer-v1',
  'tillsyno-ce-markning-test-v2','tillsyno-ce-markning-test-v3','tillsyno-ce-markning-test-v4','tillsyno-ce-markning-test-v5',
  'tillsyno-ce-markning-test-v6','tillsyno-ce-markning-test-v7','keyval-store'];
 const $=id=>document.getElementById(id);
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const kept=(key,keepSession)=>KEEP_ALWAYS.has(key)||(keepSession&&(SESSION_KEYS.has(key)||/^sb-.+-auth-token/.test(key)));

 function clearStorage(storage,keepSession){
  const left=[];
  try{
   const keys=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key!==null)keys.push(key);}
   for(const key of keys)if(!kept(key,keepSession))storage.removeItem(key);
   for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key!==null&&!kept(key,keepSession))left.push(key);}
  }catch(_){left.push('(lagringen kunde inte läsas)');}
  return left;
 }
 async function listDatabases(){
  try{return indexedDB.databases?(await indexedDB.databases()).map(db=>db?.name).filter(Boolean):null;}catch(_){return null;}
 }
 function deleteDatabase(name){
  return new Promise(resolve=>{
   let done=false;const finish=ok=>{if(!done){done=true;resolve(ok);}};
   try{
    const request=indexedDB.deleteDatabase(name);
    request.onsuccess=()=>finish(true);request.onerror=()=>finish(false);
    // "blocked" means another tab still has it open; wait for it to close.
    setTimeout(()=>finish(false),5000);
   }catch(_){finish(false);}
  });
 }
 async function clearAll(keepSession){
  const listed=await listDatabases();
  const names=[...new Set([...(listed||[]),...KNOWN_DATABASES])];
  await Promise.all(names.map(deleteDatabase));
  const storageLeft=[...clearStorage(localStorage,keepSession),...clearStorage(sessionStorage,keepSession)];
  const remaining=await listDatabases();
  return {databasesLeft:remaining||[],storageLeft,listed:listed!==null};
 }

 const status=(text,isError=false)=>{const node=$('clearStatus');node.textContent=text;node.hidden=false;node.className='notice '+(isError?'error':'success');};
 let running=false;
 async function run(){
  if(running)return;running=true;
  $('clearConfirm').disabled=true;$('clearCancel').disabled=true;
  status('Rensar enhetens data …');
  if(!automatic){
   // Send every other open Tillsyno tab here, so its open work is closed first.
   try{localStorage.setItem(SIGNAL,JSON.stringify({mode,at:Date.now()}));}catch(_){}
  }
  const auth=window.TillsynoAuth;
  if(mode==='logout'&&auth?.client){
   try{auth.client.auth.stopAutoRefresh?.();}catch(_){}
   // Ends the session on the server when online; the local copy is removed below either way.
   try{await Promise.race([auth.client.auth.signOut({scope:'local'}),wait(4000)]);}catch(_){}
  }
  await wait(500);
  await clearAll(mode==='keep');
  // A second pass catches anything another tab saved while it was closing.
  await wait(1500);
  const result=await clearAll(mode==='keep');
  if(result.databasesLeft.length||result.storageLeft.length){
   running=false;$('clearConfirm').disabled=false;$('clearCancel').disabled=false;
   status('Allt kunde inte rensas ('+[...result.databasesLeft,...result.storageLeft].length+' kvar). Stäng alla andra Tillsyno-flikar och försök igen.',true);
   return;
  }
  status(mode==='logout'?'Klart. Enhetens Tillsyno-data är rensad. Du loggas ut …':'Klart. Enhetens Tillsyno-data är rensad.');
  await wait(700);
  location.replace(mode==='logout'?new URL('auth/login.html?reason=DEVICE_CLEARED',root):new URL('app.html',root));
 }

 const logout=mode==='logout';
 $('clearTitle').textContent=logout?'Logga ut och rensa enheten':'Rensa enhetens data';
 $('clearLead').textContent=(logout
  ?'När du loggar ut raderas all Tillsyno-data som sparats i den här webbläsaren.'
  :'All Tillsyno-data som sparats i den här webbläsaren raderas. Du är fortfarande inloggad efteråt.');
 $('clearConfirm').textContent=logout?'Logga ut och rensa':'Rensa enhetens data';
 $('clearConfirm').addEventListener('click',()=>void run());
 $('clearCancel').addEventListener('click',()=>{if(history.length>1)history.back();else location.replace(new URL('app.html',root));});
 if(automatic){$('clearChoice').hidden=true;void run();}
})();
