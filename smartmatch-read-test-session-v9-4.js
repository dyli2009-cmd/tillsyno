/* SmartMatch Avläsning TEST 9.4 – local PDF resume and explicit archive deletion.
   PDF bytes stay in IndexedDB on the user's device; never sent to a server. */
(()=>{
 'use strict';
 const app=window.SmartMatchAppBridge;
 if(!app)return;
 const sessionFile='smartmatch-read-test-active-pdf:v9.4',sessionView='smartmatch-read-test-active-view:v9.4';
 const dbName='smartmatch-read-test-v9-4-local-pdf-resume';
 const refreshApprovalKey='smartmatch-read-test-explicit-refresh:v9.4';
 let refreshInProgress=false;
 let nextRelease=null,deferredUpdate=false;
 function dbOpen(){
  return new Promise((resolve,reject)=>{
   if(!window.indexedDB){reject(new Error('IndexedDB är inte tillgängligt'));return}
   const r=indexedDB.open(dbName,2);
   r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('files'))r.result.createObjectStore('files',{keyPath:'id'});if(!r.result.objectStoreNames.contains('drafts'))r.result.createObjectStore('drafts',{keyPath:'id'})};
   r.onsuccess=()=>resolve(r.result);
   r.onerror=()=>reject(r.error||new Error('Lokal fillagring kunde inte öppnas'));
   r.onblocked=()=>reject(new Error('Lokal fillagring är blockerad'));
  });
 }
 async function writeFile(){
  const bytes=app.getOriginalPdfBytes?.(),view=app.getLocalView?.();
  if(!bytes?.length||!view?.fileKey)return false;
  const db=await dbOpen();
  try{
   await new Promise((ok,fail)=>{
    const tx=db.transaction('files','readwrite');
    tx.objectStore('files').put({id:'active',hash:view.fileKey,
     name:document.getElementById('pwFileName')?.title||'Projekt.pdf',
     blob:new Blob([bytes],{type:'application/pdf'})});
    tx.oncomplete=ok;tx.onerror=()=>fail(tx.error||new Error('PDF kunde inte sparas'));
    tx.onabort=()=>fail(tx.error||new Error('PDF-lagring avbruten'));
   });
  }finally{db.close()}
  try{sessionStorage.setItem(sessionFile,view.fileKey)}catch(_){return false}
  return true;
 }
 async function readFile(){
  const db=await dbOpen();
  try{return await new Promise((ok,fail)=>{
   const tx=db.transaction('files','readonly'),r=tx.objectStore('files').get('active');
   r.onsuccess=()=>ok(r.result||null);
   r.onerror=()=>fail(r.error||new Error('PDF kan inte läsas'));
   tx.onabort=()=>fail(tx.error||new Error('PDF läsning avbruten'));
  })}finally{db.close()}
 }

 async function sameOriginalBlob(blob,bytes){
  if(!blob||blob.size!==bytes.length)return false;
  const other=new Uint8Array(await blob.arrayBuffer());
  if(other.length!==bytes.length)return false;
  for(let i=0;i<bytes.length;i++)if(other[i]!==bytes[i])return false;
  return true;
 }
 function freshWorkspaceId(hash){
  return hash+':new:'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
 }
 async function localVersionsOfOriginal(hash,bytes){
  const db=await dbOpen();let entries=[];
  try{entries=await new Promise((resolve,reject)=>{
   const request=db.transaction('files','readonly').objectStore('files').getAll();
   request.onsuccess=()=>resolve(request.result||[]);
   request.onerror=()=>reject(request.error||new Error('Historiken kunde inte läsas'));
  })}finally{db.close()}
  const versions=[];
  for(const entry of entries){
   if(!String(entry?.id||'').startsWith('project:')||entry.hash!==hash||!entry.blob)continue;
   if(await sameOriginalBlob(entry.blob,bytes))versions.push(entry);
  }
  return versions.sort((x,y)=>(y.savedAt||0)-(x.savedAt||0));
 }
 async function chooseForOriginal(hash,bytes,name){
  if(!hash||!bytes?.length)return {workspaceId:hash,useArchive:false};
  const versions=await localVersionsOfOriginal(hash,bytes);
  if(!versions.length)return {workspaceId:hash,useArchive:false};
  dismissRecovery?.();
  return new Promise(resolve=>{
   const dlg=document.createElement('dialog');dlg.className='smLocalVersionsDialog';
   const heading=document.createElement('h3');heading.textContent='Sparade arbetsversioner';
   const info=document.createElement('p');info.textContent='PDF: '+name+'. Välj ditt sparade arbete eller börja om från originalet.';
   const list=document.createElement('div');list.className='smLocalVersionsList';
   let complete=false;
   const finish=result=>{if(complete)return;complete=true;dlg.close();dlg.remove();resolve(result)};
   for(const item of versions){
    const button=document.createElement('button');button.type='button';button.className='smLocalVersion';
    const strong=document.createElement('strong');strong.textContent='Fortsätt: '+(item.name||name);
    const date=document.createElement('small');date.textContent='Sparat '+new Date(item.savedAt||Date.now()).toLocaleString('sv-SE');
    button.append(strong,date);button.title='Öppna sparad arbetsversion: '+(item.name||name);button.setAttribute('aria-label','Fortsätt sparat arbete '+(item.name||name));button.onclick=()=>finish({workspaceId:item.workspaceId||String(item.id).slice(8),useArchive:true});
    list.appendChild(button);
   }
   const actions=document.createElement('div');actions.className='smLocalVersionsActions';
   const fresh=document.createElement('button');fresh.type='button';fresh.textContent='Börja om från originalet';
   const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Avbryt öppning';
   fresh.onclick=()=>finish({workspaceId:freshWorkspaceId(hash),useArchive:false});
   cancel.onclick=()=>finish(null);
   dlg.addEventListener('cancel',e=>{e.preventDefault();finish(null)});
   actions.append(fresh,cancel);dlg.append(heading,info,list,actions);document.body.appendChild(dlg);dlg.showModal();
  });
 }

 // PDF is authoritative. This independent draft is recovered only with user confirmation.
 let pendingDraft=null,draftTimer=null,draftChain=Promise.resolve(),dismissRecovery=null;
 function reportStatus(message,state='local'){
  const element=document.getElementById('pwDraftStatus');if(!element)return;
  element.hidden=!message;element.textContent=message||'';element.dataset.state=state;
 }
 async function draftTransaction(mode,operation){
  const db=await dbOpen();
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts',mode),request=operation(tx.objectStore('drafts'));
    let value=null;
    if(request){request.onsuccess=()=>{value=request.result};request.onerror=()=>reject(request.error||new Error('Lokalt utkast kunde inte läsas'))}
    tx.oncomplete=()=>resolve(value);
    tx.onerror=()=>reject(tx.error||new Error('Lokal sparning misslyckades'));
    tx.onabort=()=>reject(tx.error||new Error('Lokal sparning avbröts'));
   });
  }finally{db.close()}
 }
 async function writePendingDraft(){
  if(draftTimer){clearTimeout(draftTimer);draftTimer=null}
  if(!pendingDraft)return draftChain;
  const current=pendingDraft;pendingDraft=null;
  const task=draftChain.then(()=>draftTransaction('readwrite',store=>store.put(current)));
  draftChain=task.catch(()=>{});
  try{
   await task;
   if(!pendingDraft)reportStatus('✓ Sparat på enheten','local');
  }catch(err){
   console.error('[SmartMatch] Autosparning misslyckades',err);
   reportStatus('Autosparning misslyckades – spara projekt-PDF nu.','error');
   // Explicit project switching must NOT claim success after a failed draft.
   pendingDraft=current;
   return false;
  }
  if(pendingDraft)return writePendingDraft();
  return true;
 }
 function queueDraft({hash,baseRevision,payload}){
  dismissRecovery?.();
  if(!hash||!payload)return;
  pendingDraft={id:hash,baseRevision:Number(baseRevision)||0,payload,updatedAt:Date.now()};
  reportStatus('Sparar…','local');
  if(draftTimer)clearTimeout(draftTimer);
  draftTimer=setTimeout(()=>{void writePendingDraft()},700);
 }
 async function offerDraftRestore(hash,baseRevision,fromLocalArchive=false){
  if(!hash)return null;
  await writePendingDraft();
  let candidate;
  try{candidate=await draftTransaction('readonly',store=>store.get(hash))}
  catch(err){console.warn('[SmartMatch] Lokalt arbetsutkast kan inte läsas',err);return null}
  if(!candidate?.payload||candidate.id!==hash||Number(candidate.baseRevision)!==(Number(baseRevision)||0))return null;
  // The user explicitly accepted saving and reloading this PDF; don't ask
  // another browser-native confirmation after the scheduled app update.
  let approved=false;
  try{
   approved=sessionStorage.getItem(refreshApprovalKey)===hash;
   sessionStorage.removeItem(refreshApprovalKey);
  }catch(_){}
  if(fromLocalArchive||approved)return candidate.payload;
  dismissRecovery?.();
  // Opening an external PDF is immediate and authoritative. Recovery is an
  // optional inline action, never a browser alert or a silent overwrite.
  return new Promise(resolve=>{
   const panel=document.createElement('div');panel.id='pwDraftRecovery';
   panel.setAttribute('role','region');panel.setAttribute('aria-label','Sparat arbete');
   const label=document.createElement('span');label.textContent='Tidigare arbete för denna PDF finns lokalt på enheten.';
   const recover=document.createElement('button');recover.type='button';recover.textContent='Fortsätt sparat arbete';
   const keep=document.createElement('button');keep.type='button';keep.textContent='Öppna original-PDF';
   const finish=payload=>{panel.remove();dismissRecovery=null;resolve(payload)};
   dismissRecovery=()=>finish(null);
   recover.onclick=()=>finish(candidate.payload);keep.onclick=()=>finish(null);
   panel.append(label,recover,keep);
   (document.getElementById('pwDraftStatus')?.parentElement||document.body).append(panel);
  });
 }
 async function markPdfSaved(hash){
  dismissRecovery?.();
  if(!hash)return;
  if(pendingDraft?.id===hash)pendingDraft=null;
  if(draftTimer){clearTimeout(draftTimer);draftTimer=null}
  await draftChain;
  try{await draftTransaction('readwrite',store=>store.delete(hash))}
  catch(err){console.warn('[SmartMatch] Kunde inte rensa lokal arbetskopia',err)}
  reportStatus('✓ Sparat i projekt-PDF','local');
 }


 // Store named local projects independently of the single active-tab PDF.
 // Local archives preserve the original PDF and its unsaved draft separately.
 async function archiveCurrentProject(options={}){
  const view=app.getLocalView?.(),bytes=app.getOriginalPdfBytes?.();
  if(!view?.fileKey||!bytes?.length)throw new Error('Ingen öppen PDF att spara.');
  // Snapshot ALL current checks/data, not just queued changes: a prior PDF
  // export can clear its autosave draft although the in-memory session is newer.
  if(app.snapshotForLocalArchive?.()!==true)throw new Error('Projektinformationen kunde inte läsas.');
  const ok=await writePendingDraft();
  if(ok===false)throw new Error('Ändringarna kunde inte sparas lokalt.');
  const name=options.name||document.getElementById('pwFileName')?.title||'Projekt.pdf';
  const workspaceId=view.workspaceId||view.fileKey;
  const record={id:'project:'+workspaceId,hash:view.fileKey,workspaceId,name,
   blob:null,view:{...view,workspaceId,localArchive:true},savedAt:Date.now()};
  const db=await dbOpen();
  try{
   await new Promise((resolve,reject)=>{
    const tx=db.transaction('files','readwrite'),store=tx.objectStore('files');
    const existing=store.get(record.id);
    const finish=blob=>{
     // Avoid copying large PDF bytes again on every local save.
     record.blob=blob||new Blob([bytes],{type:'application/pdf'});
     store.put(record);
     if(!options.keepActive)store.delete('active');
    };
    existing.onsuccess=()=>{
     const old=existing.result;
     if(old?.hash===view.fileKey&&old.blob){finish(old.blob);return}
     const active=store.get('active');
     active.onsuccess=()=>{
      const found=active.result;
      finish(found?.hash===view.fileKey?found.blob:null);
     };
    };
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error||new Error('Arbetskopian kunde inte sparas'));
    tx.onabort=()=>reject(tx.error||new Error('Lokal arkivering avbruten'));
   });
  }finally{db.close()}
  if(!options.keepActive){try{sessionStorage.removeItem(sessionFile);sessionStorage.removeItem(sessionView)}catch(_){}}
  reportStatus('✓ Projektet sparat lokalt.','local');
  return record;
 }
 async function listProjects(){
  const db=await dbOpen();
  try{
   const records=await new Promise((resolve,reject)=>{
    const tx=db.transaction('files','readonly'),req=tx.objectStore('files').getAll();
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error||new Error('Projektlistan kunde inte läsas'));
   });
   return records.filter(item=>String(item.id||'').startsWith('project:')&&item.blob&&item.hash)
    .sort((a,b)=>(b.savedAt||0)-(a.savedAt||0))
    .map(({id,name,savedAt})=>({hash:String(id).slice(8),name,savedAt}));
  }finally{db.close()}
 }
 // Local archive management affects only the app's own IndexedDB records.
 // NEVER touch the source PDF in Filer, Dropbox or any other external storage.
 async function deleteProjects(hashes=null){
  if(app.getPdf?.())throw new Error('Stäng ritningen innan du raderar lokal historik.');
  // Wait for any previously queued autosave before deleting its draft, so
  // no delayed write can recreate a record the technician just removed.
  const flushed=await writePendingDraft();
  if(flushed===false)throw new Error('Lokal autosparning pågår fortfarande. Försök igen.');
  const wanted=hashes===null?null:new Set(hashes.map(h=>String(h||'')).filter(Boolean));
  if(wanted&&wanted.size===0)return 0;
  const db=await dbOpen();
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction(['files','drafts'],'readwrite');
    const files=tx.objectStore('files'),drafts=tx.objectStore('drafts');
    const request=files.getAllKeys();
    let removed=0;
    request.onsuccess=()=>{
     const keys=request.result||[];
     for(const key of keys){
      if(typeof key!=='string'||!key.startsWith('project:'))continue;
      const hash=key.slice('project:'.length);
      if(!hash||(wanted&&!wanted.has(hash)))continue;
      files.delete(key);drafts.delete(hash);removed++;
     }
    };
    request.onerror=()=>{try{tx.abort()}catch(_){}};
    tx.oncomplete=()=>resolve(removed);
    tx.onerror=()=>reject(tx.error||new Error('Lokal historik kunde inte raderas.'));
    tx.onabort=()=>reject(tx.error||request.error||new Error('Raderingen avbröts.'));
   });
  }finally{db.close()}
 }
 async function deleteProject(hash){
  if(typeof hash!=='string'||!hash)throw new Error('Projektet saknar giltig identitet.');
  return (await deleteProjects([hash]))>0;
 }
 async function deleteAllProjects(){return deleteProjects(null)}
 async function openProject(hash){
  if(!hash||app.getPdf?.())throw new Error('Avsluta aktuellt projekt innan du öppnar ett annat.');
  const db=await dbOpen();
  let record;
  try{
   record=await new Promise((resolve,reject)=>{
    const tx=db.transaction('files','readonly'),req=tx.objectStore('files').get('project:'+hash);
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error||new Error('Projektfilen kunde inte läsas'));
   });
  }finally{db.close()}
  if(!record?.blob||String(record.id)!=='project:'+hash)throw new Error('Den lokala projektfilen hittades inte.');
  await app.openCachedPdf(new File([record.blob],record.name||'Projekt.pdf',{type:'application/pdf'}),{...(record.view||{}),workspaceId:record.workspaceId||hash,localArchive:true});
  // Register as the currently active PDF so a browser refresh resumes this one.
  try{await writeFile();rememberView()}catch(err){console.warn('[SmartMatch] Kunde inte lagra aktivt projekt',err)}
  return true;
 }

 function rememberView(){
  const view=app.getLocalView?.();
  if(!view?.fileKey)return;
  try{sessionStorage.setItem(sessionView,JSON.stringify(view))}catch(_){}
 }
 async function restore(){
  let hash='';
  try{hash=sessionStorage.getItem(sessionFile)||''}catch(_){}
  if(!hash)return;
  try{
   const item=await readFile();
   if(!item?.blob||item.hash!==hash)throw new Error('Ingen PDF för den här sessionen');
   let view=null;try{view=JSON.parse(sessionStorage.getItem(sessionView)||'null')}catch(_){}
   await app.openCachedPdf(new File([item.blob],item.name||'Projekt.pdf',{type:'application/pdf'}),view);
  }catch(err){
   console.warn('[SmartMatch] Återställning av aktiv PDF misslyckades',err);
   try{sessionStorage.removeItem(sessionFile)}catch(_){}
   const msg=document.getElementById('pwState');if(msg)msg.textContent='Öppna ritningen igen. Dina tidigare sparade egenkontroller läses in från projektets lokala sparning.';
  }
 }

 function refreshElements(){
  return {
   dialog:document.getElementById('pwRefreshDialog'),
   status:document.getElementById('pwRefreshStatus'),
   close:document.getElementById('pwRefreshDialogClose'),
   cancel:document.getElementById('pwRefreshCancel'),
   save:document.getElementById('pwRefreshSavePdf'),
   confirm:document.getElementById('pwRefreshConfirm'),
   update:document.getElementById('pwRefreshBuild')
  };
 }
 function showRefreshStatus(message='',kind='error'){
  const {status}=refreshElements();
  status.hidden=!message;
  status.textContent=message;
  status.dataset.kind=kind;
 }
 function openRefreshDialog(){
  if(refreshInProgress||!app.getPdf?.())return;
  const ui=refreshElements();
  document.getElementById('pwRefreshFileName').textContent=document.getElementById('pwFileName')?.title||'Projekt.pdf';
  showRefreshStatus();
  if(!ui.dialog.open)ui.dialog.showModal();
 }
 function closeRefreshDialog(){
  if(refreshInProgress)return;
  const dialog=refreshElements().dialog;
  if(dialog.open)dialog.close();
 }
 // Code loaded by a static web page cannot safely hot-swap all its modules.
 // Keep the current PDF open; only apply a new release after the drawing closes.
 const installedVersion=()=>document.getElementById('pwBuildVersion')?.dataset.build||'0';
 function newerVersion(a,b){
  const v=x=>String(x).split('.').map(n=>Number(n)||0),left=v(a),right=v(b);
  for(let i=0;i<Math.max(left.length,right.length);i++){
   if((left[i]||0)!==(right[i]||0))return (left[i]||0)>(right[i]||0);
  }
  return false;
 }
 function renderUpdateStatus(label,available=false){
  const status=document.getElementById('pwUpdateStatus');
  const button=document.getElementById('pwRefreshBuild');
  if(status)status.textContent=label;
  if(button){button.hidden=!available;button.textContent=available?'↻ Uppdatera':''}
 }
 async function checkForUpdates(){
  if(!navigator.onLine){renderUpdateStatus('Offline');return}
  try{
   const url=new URL('smartmatch-read-test.html',window.location.href);
   url.searchParams.set('buildcheck',String(Date.now()));
   const response=await fetch(url.toString(),{cache:'no-store'});
   if(!response.ok)throw new Error('Versionen kunde inte hämtas');
   const html=await response.text();
   const match=html.match(/id="pwBuildVersion"[^>]*data-build="([^"]+)"/);
   if(!match)throw new Error('Ingen versionsmarkör');
   nextRelease=newerVersion(match[1],installedVersion())?match[1]:null;
   if(nextRelease)renderUpdateStatus(deferredUpdate?'Uppdateras efter stängning':'Ny v'+nextRelease,true);
   else{deferredUpdate=false;renderUpdateStatus('Senaste versionen',false)}
  }catch(err){
   console.warn('[SmartMatch] Versionskontroll',err);
   renderUpdateStatus('Versionskontroll saknas',false);
  }
 }
 async function refresh(){
  if(!nextRelease)return;
  if(app.getPdf?.()){
   deferredUpdate=true;
   renderUpdateStatus('Uppdateras efter stängning',true);
   reportStatus('Ny programversion aktiveras när du stänger ritningen. Du kan fortsätta arbeta.','local');
   return;
  }
  window.location.reload();
 }
 function applyPendingUpdate(){
  if(deferredUpdate&&nextRelease&&!app.getPdf?.()){
   deferredUpdate=false;
   window.location.reload();
  }
 }
 const button=document.getElementById('pwRefreshBuild');
 if(button)button.addEventListener('click',()=>void refresh());
 const modal=refreshElements();
 modal.confirm?.addEventListener('click',()=>void refresh());
 modal.cancel?.addEventListener('click',closeRefreshDialog);
 modal.close?.addEventListener('click',closeRefreshDialog);
 modal.save?.addEventListener('click',()=>{
  closeRefreshDialog();
  document.getElementById('smartPdfInspect')?.click();
 });
 modal.dialog?.addEventListener('cancel',event=>{
  if(refreshInProgress)event.preventDefault();
 });
 window.addEventListener('pagehide',()=>{rememberView();void writePendingDraft()});
 window.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')void writePendingDraft()});
 window.SmartMatchSession={cachePdf:()=>writeFile().catch(err=>{console.warn('[SmartMatch] Tillfällig PDF-cache ej tillgänglig',err);return false}),chooseForOriginal,queueDraft,dismissRecovery:()=>dismissRecovery?.(),flushDraft:writePendingDraft,offerDraftRestore,markPdfSaved,reportStatus,archiveCurrentProject,listProjects,openProject,deleteProject,deleteAllProjects,checkForUpdates,applyPendingUpdate};
 void checkForUpdates();
 window.addEventListener('online',()=>void checkForUpdates());
 window.addEventListener('offline',()=>renderUpdateStatus('Offline',false));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void checkForUpdates()});
 setInterval(()=>{if(navigator.onLine)void checkForUpdates()},5*60*1000);
 void restore();
})();
