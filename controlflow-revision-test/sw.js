/* This worker controls only controlflow-revision-test/. Never purge other app caches. */
const CACHE='tillsyno-revision-test-v15';
const BASE=new URL('./',self.location.href);
const CORE=['all-in-one.html','style.css','security.css','security-compact.css','all-in-one.css','ui-text-scale.js','drawing-annotations.js','session-history.js','offline-work.js','security.js','legacy-door-import.js','all-in-one.js','drawing-transfer.js','offline.js','tillsyno-appearance.css','tillsyno-appearance.js','../vendor/pdf.min.js','../vendor/pdf.worker.min.js','../vendor/jspdf.umd.min.js','../vendor/pdf-lib.min.js','../vendor/supabase-2.49.10.min.js','../auth-config.js','../auth/client.js','../auth/guard.js','../manifest.webmanifest','v1/all-in-one.html','security-v2.js','all-in-one-v2.js','offline-work-v2.js','drawing-transfer-v2.js','ui-text-scale-v2.js','tillsyno-appearance-v2.js','revision-callout-profile-v2.js','revision-import-v2.css','offline-v2.js','security-v3.js','tillsyno-appearance-v3.js','offline-v3.js','v2/all-in-one.html','v3/all-in-one.html','security-v4.js','offline-v4.js','tillsyno-appearance-v4.js','revision-callout-profile-v4.js','revision-signature-v4.js','revision-signature-v4.css','v4/all-in-one.html','revision-project-v5.css','tillsyno-appearance-v5.js','offline-v5.js','v5/all-in-one.html','security-v6.js','revision-signature-v6.js','tillsyno-appearance-v6.js','offline-v6.js','v6/all-in-one.html','security-v7.js','tillsyno-appearance-v7.js','offline-v7.js','v7/all-in-one.html','security-v8.js','tillsyno-appearance-v8.js','offline-v8.js','revision-gestures-v8.css','v8/all-in-one.html','security-v9.js','tillsyno-appearance-v9.js','offline-v9.js','v9/all-in-one.html','security-v10.js','tillsyno-appearance-v10.js','offline-v10.js','service-overview-v10.js','service-overview-v10.css','v10/all-in-one.html','security-v11.js','tillsyno-appearance-v11.js','offline-v11.js','revision-visibility-v11.css','v11/all-in-one.html','security-v12.js','tillsyno-appearance-v12.js','offline-v12.js','service-overview-v12.js','service-overview-v12.css','revision-checklist-v12.css','v12/all-in-one.html','security-v13.js','tillsyno-appearance-v13.js','offline-v13.js','revision-inline-v13.js','revision-inline-v13.css','v13/all-in-one.html','security-v14.js','tillsyno-appearance-v14.js','offline-v14.js','revision-checklist-v14.css','v14/all-in-one.html','security-v15.js','tillsyno-appearance-v15.js','offline-v15.js','revision-inline-v15.js','revision-compact-v15.css'];
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
