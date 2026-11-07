/* Drawing bytes in IndexedDB; work data keeps its existing per-drawing storage. */
(()=>{
 let dbPromise;
 function database(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const request=indexedDB.open('tillsyno-offline-work',1);request.onupgradeneeded=()=>request.result.createObjectStore('drawings',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)}))}
 async function remember(scope,key,name,bytes){
  // IndexedDB stores its own copy, so the bytes are not copied first. Only the latest drawing per scope is read,
  // so older drawings of the same scope are removed in the same step instead of filling the device.
  const db=await database(),id=scope+':'+key,record={id,scope,key,name,bytes,types:window.AllInOneProtocols?.get?.()||[],updatedAt:Date.now()};
  await new Promise((resolve,reject)=>{const tx=db.transaction('drawings','readwrite'),store=tx.objectStore('drawings');store.put(record);const keys=store.openKeyCursor();keys.onsuccess=()=>{const cursor=keys.result;if(!cursor)return;if(String(cursor.key).startsWith(scope+':')&&cursor.key!==id)store.delete(cursor.key);cursor.continue()};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  window.dispatchEvent(new Event('tillsyno-drawing-saved'));
 }
 async function recent(scope){const db=await database();return new Promise((resolve,reject)=>{const req=db.transaction('drawings').objectStore('drawings').getAll();req.onsuccess=()=>resolve(req.result.filter(r=>r.scope===scope).sort((a,b)=>b.updatedAt-a.updatedAt)[0]||null);req.onerror=()=>reject(req.error)})}
 window.TillsynoOfflineWork={remember,recent};
})();
