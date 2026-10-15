const VERSION='2.4.323';
const CACHE='tillsyno-offline-'+VERSION;
const BASE=new URL('./',self.location.href);
const CORE=['./','index.html','style.css','home-bg-data.js','app.js','reports.js','v2.js','session-history.js','ui-text-scale.js','customer-preview-pager.js','customer-preview-pager.css','security-compact.css','manifest.webmanifest','tillsyno-appearance.css','tillsyno-appearance.js','icon-180.png','icon-192.png','icon-512.png','security.html','security.css','security.js','legacy-door-import.js','all-in-one.html','all-in-one.css','all-in-one.js','project-workspace.html','project-workspace.css','project-workspace.js','project-flow.html','project-flow.css','project-flow.js','drawing-tools.html','drawing-tools.css','drawing-tools.js','drawing-annotations.js','drawing-transfer.js','drawing-door-symbols.js','licensed-entry-v6.html','licensed-door-v1.html','licensed-control-v1.html','licensed-project-v1.html','offline.js','offline-work.js','vendor/jspdf.umd.min.js','vendor/pdf-lib.min.js','vendor/pdf.min.js','vendor/pdf.worker.min.js','project-workspace-smartmatch-test.html','project-workspace-smartmatch-v36-106.css','project-workspace-smartmatch-v36-106.js','smartmatch-protocol-templates.js','smartmatch-pdf-v36-71.js','smartmatch-da-v36-104-module.js','smartmatch-stamp-shapes-v36-78.js','smartmatch-table-layouts-v36-94.js','smartmatch-protocol-export-v36-96.js','smartmatch-session-v36-77.js','vendor/supabase-2.49.10.min.js','auth-config.js','auth/client.js','auth/guard.js','auth/login.html','auth/login.js','auth/pending.html','auth/pending.js','auth/register.html','auth/register.js','auth/admin.css','auth/admin.html','auth/admin.js','auth/reset-password.html','auth/forgot-password.html','auth/forgot-password.js','controlflow-revision/all-in-one-v2.js','controlflow-revision/all-in-one.css','controlflow-revision/all-in-one.html','controlflow-revision/drawing-annotations.js','controlflow-revision/drawing-transfer-v2.js','controlflow-revision/legacy-door-import.js','controlflow-revision/offline.js','controlflow-revision/offline-work-v2.js','controlflow-revision/revision-callout-profile-v4.js','controlflow-revision/revision-checklist-v14.css','controlflow-revision/revision-compact-v15.css','controlflow-revision/revision-controls-v16.css','controlflow-revision/revision-gestures-v8.css','controlflow-revision/revision-import-v2.css','controlflow-revision/revision-inline-v13.css','controlflow-revision/revision-inline-v15.js','controlflow-revision/revision-inline-v310.js','controlflow-revision/customer-preview-v310.js','controlflow-revision/customer-preview-v310.css','controlflow-revision/revision-project-v5.css','controlflow-revision/revision-signature-v4.css','controlflow-revision/revision-signature-v6.js','controlflow-revision/revision-visibility-v11.css','controlflow-revision/security-compact.css','controlflow-revision/security-v15.js','controlflow-revision/security.css','controlflow-revision/service-overview-v12.css','controlflow-revision/service-overview-v12.js','controlflow-revision/session-history.js','controlflow-revision/style.css','controlflow-revision/tillsyno-appearance-v16.js','controlflow-revision/tillsyno-appearance.css','controlflow-revision/ui-text-scale-v2.js'];
const readyURL=new URL('__offline_ready__',BASE).href;
const canonical=request=>{const url=new URL(request.url);url.search='';url.hash='';return url.href};
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 // Report readiness only after every required app file has been fetched.
 await Promise.all(CORE.map(async path=>{const url=new URL(path,BASE).href;const response=await fetch(url,{cache:'reload'});if(!response.ok)throw Error('Offline file missing: '+path);await cache.put(url,response)}));
 await cache.put(readyURL,new Response(VERSION));await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if((key.startsWith('dorrservice-')||key.startsWith('tillsyno-offline-'))&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 const key=canonical(event.request);
 if(!CORE.some(path=>new URL(path,BASE).href===key))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(event.request,{cache:'no-store'});if(!response.ok)throw Error('Unavailable');await cache.put(key,response.clone());return response}
  catch(error){const saved=await cache.match(key);if(saved)return saved;return new Response('Öppna Tillsyno med internet först för att hämta offlinefilerna.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})}
 })());
});


