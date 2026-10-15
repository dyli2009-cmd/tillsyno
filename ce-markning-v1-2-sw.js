/* CE-märkning v1.2: only the standalone CE page, never Kontrollflöde. */
const CACHE='tillsyno-ce-markning-2.4.313-assets';
const FILES=[
 'ce-markning.html','tillsyno-appearance.css','tillsyno-appearance.js','ce-markning-v1-2.js','ce-markning-v1-2-module.js','ce-markning-v1-2-optimize.js','ce-file-export-v312.js','ce-file-export-v312.css',
 'project-ce-markning-test-v6.css','project-ce-markning-test-v7.css',
 'project-ce-markning-test-v6-storage.js','project-ce-markning-test-v6-models.js','project-ce-markning-test-v7-personal.js',
 'vendor/pdf-lib.min.js','vendor/pdf.min.js','vendor/pdf.worker.min.js','vendor/jszip-3.10.1.min.js',
 'vendor/supabase-2.49.10.min.js','auth-config.js','auth/client.js','auth/guard.js'
];
const allowed=new Set(FILES.map(file=>new URL(file,self.location.href).pathname));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!allowed.has(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}
  catch(error){const saved=await cache.match(request,{ignoreSearch:true});if(saved)return saved;throw error;}
 })());
});
