/* Drawing bytes in IndexedDB; work data keeps its existing per-drawing storage. */
(()=>{
 let dbPromise;
 function database(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const request=indexedDB.open('tillsyno-offline-work',1);request.onupgradeneeded=()=>request.result.createObjectStore('drawings',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)}))}
 async function remember(scope,key,name,bytes){
  const db=await database(),record={id:scope+':'+key,scope,key,name,bytes:bytes.slice(),types:window.AllInOneProtocols?.get?.()||[],updatedAt:Date.now()};
  await new Promise((resolve,reject)=>{const tx=db.transaction('drawings','readwrite');tx.objectStore('drawings').put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  window.dispatchEvent(new Event('tillsyno-drawing-saved'));
 }
 async function recent(scope){const db=await database();return new Promise((resolve,reject)=>{const req=db.transaction('drawings').objectStore('drawings').getAll();req.onsuccess=()=>resolve(req.result.filter(r=>r.scope===scope).sort((a,b)=>b.updatedAt-a.updatedAt)[0]||null);req.onerror=()=>reject(req.error)})}
 window.TillsynoOfflineWork={remember,recent};
})();
