/* This worker controls only controlflow-revision-test/. Never purge other app caches. */
const CACHE='tillsyno-revision-test-v1';
const BASE=new URL('./',self.location.href);
const CORE=['all-in-one.html','style.css','security.css','security-compact.css','all-in-one.css','ui-text-scale.js','drawing-annotations.js','session-history.js','offline-work.js','security.js','legacy-door-import.js','all-in-one.js','drawing-transfer.js','offline.js','tillsyno-appearance.css','tillsyno-appearance.js','../vendor/pdf.min.js','../vendor/pdf.worker.min.js','../vendor/jspdf.umd.min.js','../vendor/pdf-lib.min.js','../vendor/supabase-2.49.10.min.js','../auth-config.js','../auth/client.js','../auth/guard.js','../manifest.webmanifest'];
const urls=new Set(CORE.map(path=>new URL(path,BASE).href));
const canonical=request=>{const url=new URL(request.url);url.search='';url.hash='';return url.href;};
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.all([...urls].map(async url=>{
  const response=await fetch(url,{cache:'reload'});
  if(!response.ok)throw Error('Offline file missing: '+url);
  await cache.put(url,response);
 }));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('tillsyno-revision-test-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const key=canonical(event.request);
 if(!urls.has(key))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(event.request,{cache:'no-store'});
   if(!response.ok)throw Error('Unavailable');
   await cache.put(key,response.clone());
   return response;
  }catch(error){
   return await cache.match(key)||new Response('Öppna testkopian med internet först.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  }
 })());
});
