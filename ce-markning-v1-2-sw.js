/* CE-märkning: versioned static app files; account and work data are never cached here. */
const VERSION='2.4.589';
const CACHE='tillsyno-ce-markning-'+VERSION;
const BASE=new URL('./',self.location.href);
const CORE=[
 'ce-markning.html','ce-desktop-workspace-v357.css','ce-desktop-workspace-v357.js','ce-signature-theme-v357.css','ce-desktop-home-v355.css','tillsyno-appearance.css','tillsyno-appearance.js','tillsyno-versions.js','versions.json','tillsyno-theme-fix-v578.css','ce-markning-v1-2.js','ce-markning-v1-2-module.js','ce-markning-v1-2-optimize.js','ce-file-export-v312.js','ce-file-export-v312.css',
 'project-ce-markning-test-v6.css','project-ce-markning-test-v7.css',
 'project-ce-markning-test-v6-storage.js','project-ce-markning-test-v6-models.js','project-ce-markning-test-v7-personal.js',
 'vendor/pdf-lib.min.js','vendor/pdf.min.js','vendor/pdf.worker.min.js','vendor/jszip-3.10.1.min.js',
 'vendor/supabase-2.49.10.min.js','auth-config.js','auth/client.js','auth/module-code-gate.js','auth/guard.js'
];
const readyURL=new URL('__ce_offline_ready__',BASE).href;
const canonical=request=>{const url=new URL(request.url);url.search='';url.hash='';return url.href};
const CORE_URLS=new Set(CORE.map(path=>new URL(path,BASE).href));
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE),urls=[...CORE_URLS];
 let next=0,failure=null;
 async function preload(){
  while(!failure&&next<urls.length){
   const url=urls[next++];
   try{
    const response=await fetch(url,{cache:'reload',priority:'low'});
    if(!response.ok)throw Error('Offline file missing: '+url);
    await cache.put(url,response);
   }catch(error){failure=error;}
  }
 }
 // Leave connections available for the module the user is opening.
 await Promise.all(Array.from({length:Math.min(4,urls.length)},preload));
 if(failure)throw failure;
 await cache.put(readyURL,new Response(VERSION));await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('tillsyno-ce-markning-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 const key=canonical(event.request);
 if(!CORE_URLS.has(key))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const probe=event.request.cache==='no-store'||event.request.cache==='reload';
  // Keep HTML and scripts from the same complete release during normal use.
  if(!probe){const saved=await cache.match(key);if(saved)return saved;}
  try{
   const response=await fetch(event.request,{cache:probe?event.request.cache:'no-store'});
   if(!response.ok)throw Error('Unavailable');
   // A version probe must not replace one file inside the active release.
   if(!probe)await cache.put(key,response.clone());
   return response;
  }catch(error){
   const saved=await cache.match(key);if(saved)return saved;
   return new Response('Öppna Tillsyno med internet först för att hämta offlinefilerna.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  }
 })());
});
