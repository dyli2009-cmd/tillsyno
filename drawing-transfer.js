(()=>{
'use strict';
const DB_NAME='doorservice-drawing-transfer-v1',STORE='files',KEY='pdf';
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function tx(mode,action){const db=await openDb();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,mode),s=t.objectStore(STORE);let result;try{result=action(s)}catch(e){db.close();reject(e);return}t.oncomplete=()=>{db.close();resolve(result?.result)};t.onerror=()=>{db.close();reject(t.error)}})}
async function putPdf(blob,name){await tx('readwrite',s=>s.put({blob,name:name||'ritning.pdf',savedAt:Date.now()},KEY))}
async function takePdf(){const db=await openDb();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite'),s=t.objectStore(STORE),r=s.get(KEY);r.onsuccess=()=>{const value=r.result;if(value)s.delete(KEY);resolve(value||null)};r.onerror=()=>reject(r.error);t.oncomplete=()=>db.close();t.onerror=()=>{db.close();reject(t.error)}})}
async function receive(){
 const params=new URLSearchParams(location.search);if(params.get('drawingTool')!=='1')return;
 try{
  const record=await takePdf();if(!record)return;
  history.replaceState({},'',location.pathname);
  const security=document.body.classList.contains('securityApp'),input=document.getElementById(security?'securityFile':'file');
  if(!input)return;
  document.body.classList.remove('homeMode');const home=document.getElementById('appHome');if(home)home.hidden=true;
  const file=new File([record.blob],record.name||'ritning.pdf',{type:'application/pdf',lastModified:Date.now()});
  if(typeof input.onchange==='function')await input.onchange({target:{files:[file],value:''}});
 }catch(error){console.error('Drawing transfer failed',error)}
}
window.DoorServiceDrawingTransfer={putPdf};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(receive,0));else setTimeout(receive,0);
})();