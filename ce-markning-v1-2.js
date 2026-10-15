(function(){
'use strict';
function ceKeepAppZoom(event){if(event.cancelable&&(event.type.startsWith('gesture')||(event.touches?.length||0)>1))event.preventDefault();}
for(const type of ['touchstart','touchmove','gesturestart','gesturechange'])document.addEventListener(type,ceKeepAppZoom,{capture:true,passive:false});

const VERSION=60,FORMAT='Tillsyno CE-märkning TEST 60',LEGACY_FORMAT='Tillsyno CE-märkning TEST 2',DB='tillsyno-ce-markning-test-v7',LEGACY_DB='tillsyno-ce-markning-test-v6',OLDER_DB='tillsyno-ce-markning-test-v5',EARLIEST_DB='tillsyno-ce-markning-test-v4',OLDEST_DB='tillsyno-ce-markning-test-v3',FIRST_DB='tillsyno-ce-markning-test-v2',KEY='active',CATALOG='TillsynoCETestData';
const $=id=>document.getElementById(id),module=window.TillsynoCETest;
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const fresh=()=>({format:FORMAT,schema:VERSION,meta:{projectName:'',objectNo:'',siteAddress:'',sitePostalPlace:'',customer:'',address:'',customerPostalPlace:'',contact:'',phone:'',company:'',companyAddress:'',companyPostalPlace:'',companyOrgNo:'',companyContact:'',companyPhone:'',slrAuthorisation:'',order:'',technician:'',technicianCompany:'',technicianPhone:'',date:new Date().toLocaleDateString('sv-SE'),installationDate:'',documentationName:'',documentationAddress:'',documentationPostalPlace:'',egSignerName:'',egSignerTitle:'',egPlace:'',egDate:'',_edited:{}},doors:[],selected:null,slrTestData:null});
let state=fresh(),editing=null,noticeTimer=0,saveTimer=0,saveRevision=0,savedRevision=0,writeQueue=Promise.resolve(),pdfBusy=false,accountId='',copySourceId=null;
function updateProjectSignStatus(){
 const current=module.getSignatureDisplay();
 const imageData=module.getProjectSignature(),hasSignature=!!imageData;
 const label=$('ceProjectSignStatus');
 if(label){label.textContent=hasSignature?'Sparad':'Inte sparad';label.classList.toggle('is-saved',hasSignature);}
 const image=$('ceProjectSignPreviewImage'),empty=$('ceProjectSignEmpty'),signDate=$('ceProjectSignPreviewDate');
 if(image){
  if(hasSignature&&image.src!==imageData)image.src=imageData;
  if(!hasSignature)image.removeAttribute('src');
  image.hidden=!hasSignature;
 }
 if(empty)empty.hidden=hasSignature;
 if(signDate){
  signDate.hidden=!hasSignature||!current.display;
  signDate.textContent=hasSignature?current.display:'';
  signDate.style.fontFamily=current.style==='typewriter'?'monospace':current.style==='regular'?'Arial,Helvetica,sans-serif':current.style==='handwriting'?'"Apple Chancery","Segoe Script","Brush Script MT",cursive':'Georgia,serif';
  signDate.style.fontStyle=['italic','handwriting'].includes(current.style)?'italic':'normal';
 }
 const clear=$('ceProjectSignClear');if(clear)clear.disabled=!hasSignature;
 const date=$('ceSignDate'),format=$('ceSignDateFormat'),style=$('ceSignDateStyle');
 if(date&&document.activeElement!==date)date.value=current.iso||state.meta.date||'';
 if(format)format.value=current.format||'day';
 if(style)style.value=current.style||'italic';
}
for(const [id,field] of [['ceSignDate','date'],['ceSignDateFormat','format'],['ceSignDateStyle','style']]){
 $(id).addEventListener('change',event=>{
  module.setSignatureDisplay({[field]:event.target.value});
  updateProjectSignStatus();save();
 });
}
function openProjectSignature(){
 const d=document.createElement('dialog');d.style.cssText='width:min(600px,94vw);border:1px solid #8eafc0;border-radius:12px;padding:16px;background:#fff;color:#17394c';
 const heading=document.createElement('h3');heading.textContent='Ansvarigs underskrift';heading.style.fontWeight='400';d.append(heading);
 const tip=document.createElement('p');tip.textContent='Skriv en gång. Underskriften förs över till dokumenten för både Med glas och Utan glas. I Egenkontroll signeras bara valda kontrollpunkter.';d.append(tip);
 const canvas=document.createElement('canvas');canvas.width=700;canvas.height=200;canvas.style.cssText='display:block;width:100%;height:160px;background:white;border:1px solid #aec8d6;touch-action:none';
 const ctx=canvas.getContext('2d');ctx.lineWidth=2.6;ctx.strokeStyle='#529ac6';ctx.lineJoin='round';ctx.lineCap='round';
 let down=false,hasInk=false,prev;const pos=e=>{const box=canvas.getBoundingClientRect();return [(e.clientX-box.left)*canvas.width/box.width,(e.clientY-box.top)*canvas.height/box.height]};
 canvas.addEventListener('pointerdown',e=>{down=true;prev=pos(e);canvas.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...prev);ctx.lineTo(prev[0]+.1,prev[1]+.1);ctx.stroke();hasInk=true;e.preventDefault();});
 canvas.addEventListener('pointermove',e=>{if(!down)return;const next=pos(e);ctx.beginPath();ctx.moveTo(...prev);ctx.lineTo(...next);ctx.stroke();prev=next;e.preventDefault();});
 canvas.addEventListener('pointerup',()=>down=false);canvas.addEventListener('pointercancel',()=>down=false);d.append(canvas);
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;font-weight:400';
 for(const [label,fn] of [['Rensa',()=>{ctx.clearRect(0,0,canvas.width,canvas.height);hasInk=false;}],['Avbryt',()=>d.close()],['Spara underskrift',()=>{if(!hasInk)return notice('Skriv din underskrift först.',true);module.setSignatureDisplay({date:$('ceSignDate')?.value||state.meta.date||new Date().toLocaleDateString('sv-SE')});module.setProjectSignature(canvas.toDataURL('image/png'));updateProjectSignStatus();d.close();notice('Projektunderskrift sparad. Underskriftsrutorna använder nu denna signatur på alla dörrar; Egenkontroll följer valda punkter.');}]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;actions.append(b)}
 d.append(actions);document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();
}
$('ceProjectSign').onclick=openProjectSignature;
$('ceProjectSignClear').onclick=()=>{module.setProjectSignature('');updateProjectSignStatus();notice('Projektunderskriften rensad. Eventuella separata, manuellt sparade underskrifter finns kvar.');};

const accountDb=()=>{if(!accountId)throw Error('Du måste vara inloggad för att öppna lokalt CE-projekt.');return DB+'-'+encodeURIComponent(accountId);};
const uid=()=>'ce-'+(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));
const current=()=>state.doors.find(door=>door.id===state.selected)||null;
const safeName=value=>String(value||'CE-projekt').normalize('NFC').replace(/[\\/<>:"|?*\u0000-\u001f]/g,'-').slice(0,100);
function notice(text,error=false){$('ceNotice').textContent=text;$('ceNotice').style.background=error?'#8b342c':'#173f52';$('ceNotice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('ceNotice').hidden=true,6000);}
function storageStatus(text){$('ceStorageStatus').textContent=text;}
function snapshot(){
 if(!state.projectId)state.projectId=uid();
 state.slrTestData=module.payload();
 for(const door of state.doors)door.type=state.slrTestData.doorProfiles?.[door.id]||door.type;
 return {state:structuredClone(state),assets:structuredClone(module.assets())};
}
function openDb(name=accountDb(),existingOnly=false){return new Promise((resolve,reject)=>{let absent=false;const request=indexedDB.open(name,1);request.onupgradeneeded=()=>{if(existingOnly){absent=true;request.transaction.abort();}else request.result.createObjectStore('projects');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>absent?resolve(null):reject(request.error);});}
async function readLocal(name=accountDb(),existingOnly=false){const db=await openDb(name,existingOnly);if(!db)return null;try{return await new Promise((resolve,reject)=>{const tx=db.transaction('projects'),request=tx.objectStore('projects').get(KEY);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});}finally{db.close();}}
async function writeLocal(data){const db=await openDb(accountDb());try{await new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(data,KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Sparningen avbröts.'));});}finally{db.close();}}
function enqueueSave(){
 clearTimeout(saveTimer);const revision=saveRevision,data=snapshot();
 const operation=writeQueue.catch(()=>{}).then(()=>writeLocal(data));writeQueue=operation;
 operation.then(()=>{savedRevision=Math.max(savedRevision,revision);if(savedRevision===saveRevision)storageStatus('Sparat lokalt');}).catch(error=>{storageStatus('Kunde inte spara lokalt.');notice('Sparningen misslyckades: '+error.message,true);});
 return operation;
}
function save(){
 saveRevision++;storageStatus('Sparar lokalt…');clearTimeout(saveTimer);saveTimer=setTimeout(enqueueSave,250);
 ceScheduleAutoHistory();
}

/* v1.2 – permanent local versions; the original 'active' key stays intact. */
const CE_HINDEX='ce-history-index',CE_HPREFIX='ce-history-',CE_CLOSED='ce-project-closed';
let ceClosed=false,ceTransition=false,ceHistoryTimer=0,ceAutoRevision=-1,ceAutoProjectId='';
const CE_AUTO_DELAY=15000;
const ceAutoId=projectId=>'auto-'+String(projectId||'');
function ceScheduleAutoHistory(delay=CE_AUTO_DELAY){
 clearTimeout(ceHistoryTimer);
 if(!accountId||!ceWork()||ceTransition)return;
 ceHistoryTimer=setTimeout(()=>{ceHistoryTimer=0;void ceAutoArchive().catch(err=>console.warn('CE historik',err));},delay);
}
async function ceDbGet(key){
 const db=await openDb();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('projects'),r=tx.objectStore('projects').get(key);
  r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);
 });}finally{db.close();}
}
async function ceDbPut(key,data){
 const db=await openDb();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(data,key);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Lokala lagringen avbröts.'));
 });}finally{db.close();}
}
async function ceHistoryList(){const a=await ceDbGet(CE_HINDEX);return Array.isArray(a)?a:[];}
async function ceArchive(data,kind='Spara lokalt'){
 if(!accountId)throw Error('Du måste vara inloggad.');
 const id=uid(),at=new Date().toISOString(),
 item={id,at,name:String(data.state.meta?.projectName||'Namnlöst CE-projekt').trim()||'Namnlöst CE-projekt',count:data.state.doors.length,kind};
 const db=await openDb();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects'),req=store.get(CE_HINDEX);
  req.onsuccess=()=>{
   const list=Array.isArray(req.result)?req.result:[];
   store.put({item,data},CE_HPREFIX+id);store.put([item,...list],CE_HINDEX);
  };
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Historiken kunde inte sparas.'));
 });}finally{db.close();}
 return item;
}
async function ceAutoArchive(force=false){
 if(!accountId||!ceWork())return null;
 const projectId=state.projectId||(state.projectId=uid()),revision=saveRevision;
 if(!force&&ceAutoRevision===revision&&ceAutoProjectId===projectId)return null;
 await enqueueSave();
 const data=snapshot(),id=ceAutoId(projectId),at=new Date().toISOString();
 const record={id,at,name:String(data.state.meta?.projectName||'Namnlöst CE-projekt').trim()||'Namnlöst CE-projekt',
  count:data.state.doors.length,kind:'Automatiskt sparat',auto:true};
 const db=await openDb();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('projects','readwrite'),st=tx.objectStore('projects'),req=st.get(CE_HINDEX);
  req.onsuccess=()=>{
   const list=Array.isArray(req.result)?req.result:[];
   st.put({item:record,data},CE_HPREFIX+id);
   st.put([record,...list.filter(v=>v.id!==id)],CE_HINDEX);
  };
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Historiken kunde inte sparas.'));
 });}finally{db.close();}
 ceAutoRevision=revision;ceAutoProjectId=projectId;return record;
}
async function ceArchiveCurrent(reason){
 clearTimeout(ceHistoryTimer);
 return ceAutoArchive(true);
}
function ceWork(){
 return state.doors.length>0||Object.entries(state.meta||{}).some(([k,v])=>!['date','egDate','_edited'].includes(k)&&typeof v==='string'&&v.trim())||Object.keys(module.assets().templates||{}).length>0;
}
const ceWhen=at=>{try{return new Date(at).toLocaleString('sv-SE',{dateStyle:'short',timeStyle:'short'});}catch(_){return at;}};
function ceWorkspaceOpen(){
 ceClosed=false;$('ceWorkspace').hidden=false;$('ceProjectHome').hidden=true;
 document.body.classList.remove('ceProjectPickerOpen');
 document.querySelectorAll('.ceToolbarMenu').forEach(menu=>menu.open=false);
}
async function ceClosedState(value){
 await ceDbPut(CE_CLOSED,value);ceClosed=value;
 $('ceWorkspace').hidden=value;$('ceProjectHome').hidden=!value;
 document.body.classList.toggle('ceProjectPickerOpen',!!value);
 if(value){$('ceSavedProjects').open=false;await ceRenderHistory();}
}
async function ceRenderHistory(){
 const host=$('ceHomeHistory');host.replaceChildren();
 try{
  const list=await ceHistoryList();$('ceHomeCount').textContent=list.length+' sparade projekt';
  if(!list.length){const p=document.createElement('p');p.textContent='Inga sparade projekt ännu. Ditt arbete sparas automatiskt när du börjar.';host.append(p);}
  for(const item of list){
   const row=document.createElement('div');row.className='ceHistoryRow';
   const icon=document.createElement('span');icon.className='ceHistoryFileIcon';icon.setAttribute('aria-hidden','true');
   icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z"/><path d="M3 11h18"/></svg>';
   const details=document.createElement('div');details.className='ceHistoryInfo';
   const name=document.createElement('strong');name.textContent=item.name;
   const meta=document.createElement('small');meta.textContent=ceWhen(item.at)+' · '+item.count+' dörrar · '+item.kind;
   details.append(name,meta);
   const controls=document.createElement('div');controls.className='ceHistoryButtons';
   const open=document.createElement('button');open.type='button';open.textContent='Öppna';
   open.onclick=()=>void ceHistoryOpen(item.id);
   const remove=document.createElement('button');remove.type='button';remove.textContent='Ta bort';
   remove.onclick=()=>{
    const previous=row.querySelector('.ceHistoryConfirm');
    if(previous){previous.remove();row.classList.remove('is-confirming');return;}
    const box=document.createElement('div');box.className='ceHistoryConfirm';
    const text=document.createElement('span');
    text.textContent=item.auto&&ceAutoId(state.projectId)===item.id?
     'Vill du ta bort projektet och den aktiva lokala kopian?':'Vill du ta bort det sparade projektet?';
    const yes=document.createElement('button');yes.type='button';yes.className='ceHistoryDeleteYes';yes.textContent='Ta bort';
    const no=document.createElement('button');no.type='button';no.className='ceHistoryDeleteCancel';no.textContent='Avbryt';
    yes.onclick=()=>{yes.disabled=true;no.disabled=true;void ceHistoryDelete(item.id,item.name);};
    no.onclick=()=>{box.remove();row.classList.remove('is-confirming');remove.focus();};
    box.append(text,yes,no);row.append(box);row.classList.add('is-confirming');no.focus();
   };
   controls.append(open,remove);row.append(icon,details,controls);host.append(row);
  }
 }catch(err){$('ceHomeCount').textContent='Historiken kunde inte öppnas: '+err.message;}
}
async function ceHistoryDelete(id,name){
 if(ceTransition)return;ceTransition=true;
 const active=id===ceAutoId(state.projectId);
 try{
  clearTimeout(ceHistoryTimer);clearTimeout(saveTimer);
  await writeQueue.catch(()=>{});
  const db=await openDb();
  try{await new Promise((resolve,reject)=>{
   const tx=db.transaction('projects','readwrite'),st=tx.objectStore('projects'),req=st.get(CE_HINDEX);
   req.onsuccess=()=>{
    st.delete(CE_HPREFIX+id);
    st.put((Array.isArray(req.result)?req.result:[]).filter(v=>v.id!==id),CE_HINDEX);
   };
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
  if(active){
   module.reset();state=fresh();editing=null;copySourceId=null;ceAutoRevision=-1;ceAutoProjectId='';
   saveRevision++;await enqueueSave();
   renderMeta();renderDoors();resetForm();
   await ceDbPut(CE_CLOSED,true);
   ceClosed=true;$('ceWorkspace').hidden=true;$('ceProjectHome').hidden=false;
   document.body.classList.add('ceProjectPickerOpen');
  }
  await ceRenderHistory();
  notice((active?'Projektet':'Sparat projekt')+' borttaget.');
 }catch(err){await ceRenderHistory();notice('Kunde inte ta bort projektet: '+err.message,true);}
 finally{ceTransition=false;}
}
async function ceHistoryOpen(id){
 if(ceTransition)return;ceTransition=true;
 const backup=snapshot();
 try{
  const record=await ceDbGet(CE_HPREFIX+id);
  if(!record?.data?.state||!record.data.assets)throw Error('Den sparade versionen saknas.');
  if(!ceClosed&&ceWork()){
   if(!window.confirm('Öppna sparad version? Aktuellt arbete säkerhetskopieras först.'))return;
   await ceArchiveCurrent('Före byte av sparad version');
  }
  const loaded=validateState(structuredClone(record.data.state));
  ceAutoRevision=-1;ceAutoProjectId='';clearTimeout(ceHistoryTimer);
  module.reset();state=loaded;module.restore(state);module.restoreAssets(structuredClone(record.data.assets));
  await module.loadTemplates();window.TillsynoCEOptimize?.reset?.();
  editing=null;copySourceId=null;
  clearTimeout(saveTimer);saveRevision++;await enqueueSave();
  renderMeta();renderDoors();resetForm();ceWorkspaceOpen();await ceClosedState(false);
  notice('Öppnade sparat projekt: '+record.item.name);
 }catch(err){
  module.reset();state=backup.state;module.restore(state);module.restoreAssets(backup.assets);
  await module.loadTemplates().catch(()=>{});renderMeta();renderDoors();
  notice('Kunde inte öppna historik: '+err.message,true);
 }finally{ceTransition=false;}
}
async function ceClose(){
 if(ceTransition)return;ceTransition=true;
 try{
  if(ceWork())await ceArchiveCurrent('Vid stängning');
  else await enqueueSave();
  await ceClosedState(true);
 }catch(err){notice('Kunde inte stänga projektet säkert: '+err.message,true);}
 finally{ceTransition=false;}
}

// CE v1.2 ZIP-mappstöd (1.2.2): folder paths guide matching; editable PDF fields verify it.
const CE_IMPORT_SIGS=[
 ['Riskanalys',['4.4 Risknivå','4.6.1']],
 ['Beskrivning av maskin',['Drivsystem','Aktivering 1','Dörrtyp']],
 ['Loggbok',['6.5.1 Datum','6.5.1 Tekniker']],
 ['Tillverkarens försäkran',['Dokumentation Namn','Auktorisationsnummer SLR','Medlem i SLR']],
 ['Egenkontroll',['10.5.1','10.5.2']]
];
let ceImportData=[],ceImportErrors=[],ceImportSkipped=[],ceImportBusy=false,ceImportSerial=0;
const CE_IMPORT_MAX=20*1024*1024;
const ceImportNormalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function ceImportFolderType(path){
 const parts=String(path||'').replace(/\\/g,'/').split('/').filter(Boolean);
 const classify=part=>{
  const name=ceImportNormalize(part).replace(/\.pdf$/i,'').replace(/^\d+\s*[.)_-]\s*/,'').replace(/[_–—-]+/g,' ').replace(/\s+/g,' ').trim();
  if(/^riskanalys\b/.test(name))return 'Riskanalys';
  if(/^(beskrivning av maskin|beskrivning maskin|maskinbeskrivning)\b/.test(name))return 'Beskrivning av maskin';
  if(/^loggbok\b/.test(name))return 'Loggbok';
  if(/^egenkontroll\b/.test(name))return 'Egenkontroll';
  if(/^(tillverkarens forsakran|eg forsakran|eu forsakran|forsakran om overensstammelse)\b/.test(name))return 'Tillverkarens försäkran';
  if(/^produktlista\b/.test(name))return 'Produktlista';
  if(/^ce skylt\b/.test(name))return 'CE-skylt';
  return '';
 };
 // The existing ZIP folder determines the destination. Use filename only
 // for loose PDFs or ZIPs without recognizable folder names.
 for(let i=parts.length-2;i>=0;i--){const found=classify(parts[i]);if(found)return found;}
 return classify(parts[parts.length-1]||'');
}
function ceImportState(msg,err=false){const el=$('ceImportCEStatus');el.textContent=msg;el.style.color=err?'#933f42':'#547488';}
function ceImportRow(label,file,status,type=''){
 const el=document.createElement('div');el.className='ceImportCERow'+(type?' is-'+type:'');
 const left=document.createElement('div'),title=document.createElement('strong'),description=document.createElement('small'),badge=document.createElement('span');
 title.textContent=label;description.textContent=file;badge.textContent=status;
 left.append(title,description);el.append(left,badge);return el;
}
function ceImportRender(){
 const el=$('ceImportCEPreview');el.replaceChildren();
 const prior=module.assets()?.templates||{};
 for(const [cat]of CE_IMPORT_SIGS){
  const found=ceImportData.find(i=>i.category===cat),exists=!!prior[cat]?.length;
  el.append(ceImportRow(cat,found?found.fileName:exists?'Redan sparad i projektet':'Ingen fil vald',found?(exists?'↻ Ersätter mall':'✓ Rätt mapp'):exists?'Finns redan':'Saknas',found?'':exists?'':'missing'));
 }
 for(const e of ceImportErrors)el.append(ceImportRow('Kan inte importera',e.fileName,e.message,'error'));
 for(const e of ceImportSkipped.slice(0,8))el.append(ceImportRow('Ingår inte i mallimport',e.fileName,e.message));
 if(ceImportSkipped.length>8)el.append(ceImportRow('Övriga undantagna filer',String(ceImportSkipped.length-8)+' filer','Hoppades över'));
 $('ceImportCEApply').disabled=ceImportBusy||!ceImportData.length||!!ceImportErrors.length;
 $('ceImportCEChoose').disabled=ceImportBusy;$('ceImportCECancel').disabled=ceImportBusy;$('ceImportCEClose').disabled=ceImportBusy;
 const suffix=ceImportSkipped.length?' · '+ceImportSkipped.length+' andra filer hoppades över.':'';
 if(!ceImportBusy)ceImportState(ceImportErrors.length?'Importen är pausad. Kontrollera fel och välj mallarna igen; inget är ändrat.':ceImportData.length?ceImportData.length+' av 5 redigerbara mallar hittade.'+suffix+' Granska före import.':'Inga nya mallar valda.'+suffix,!!ceImportErrors.length);
}
async function ceImportRecognize(filePath,bytes){
 if(bytes.length>CE_IMPORT_MAX||bytes.length<8)throw Error('Tom PDF eller över 20 MB.');
 let pdf;
 try{pdf=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false});}
 catch(_){throw Error('PDF-filen kunde inte läsas.');}
 const fields=new Set(pdf.getForm().getFields().map(f=>ceImportNormalize(f.getName())));
 if(!fields.size)throw Error('PDF saknar redigerbara formulärfält (kan vara en exporterad/ifylld PDF). Välj originalmallen.');
 const matches=CE_IMPORT_SIGS.filter(([,required])=>required.every(x=>fields.has(ceImportNormalize(x))));
 const folder=ceImportFolderType(filePath);
 if(matches.length>1)throw Error('Flera möjliga formulärtyper. Välj originalmallen.');
 if(matches.length===1){
  const category=matches[0][0];
  if(folder&&folder!==category)throw Error('Mappnamnet anger '+folder+' men formulärfälten anger '+category+'. Flytta rätt mall till rätt mapp.');
  return {category,fileName:String(filePath).split('/').pop(),filePath,bytes};
 }
 const known=CE_IMPORT_SIGS.find(([cat])=>cat===folder);
 if(known&&known[1].some(x=>fields.has(ceImportNormalize(x))))
  return {category:folder,fileName:String(filePath).split('/').pop(),filePath,bytes};
 throw Error(folder?'Filen ligger i mappen '+folder+' men dess formulärfält stämmer inte. Välj den redigerbara originalmallen.':'Okänd CE-mall. Filnamn räcker inte; kontrollera formulärfälten.');
}
function ceImportSamePdf(a,b){
 return a.bytes.length===b.bytes.length&&a.bytes.every((value,index)=>value===b.bytes[index]);
}
async function ceImportAnalyze(files){
 const seq=++ceImportSerial;ceImportBusy=true;ceImportData=[];ceImportErrors=[];ceImportSkipped=[];ceImportRender();
 ceImportState('Läser ZIP-mappar och PDF-formulär lokalt…');
 try{
  const chosen=Array.from(files||[]);if(chosen.length>30)throw Error('Välj högst 30 filer.');
  const extracted=[];let total=0;
  for(const file of chosen){
   if(seq!==ceImportSerial)return;
   if(/\.zip$/i.test(file.name)){
    if(file.size>35*1024*1024)throw Error('ZIP över 35 MB.');
    const zip=await JSZip.loadAsync(file);
    const members=Object.values(zip.files).filter(f=>!f.dir&&/\.pdf$/i.test(f.name)&&!/(^|\/)__MACOSX\//i.test(f.name)&&!/(^|\/)\._/.test(f.name));
    if(members.length>100)throw Error('ZIP innehåller över 100 PDF-filer. Välj ZIP med originalmallarna.');
    for(const member of members){
     const category=ceImportFolderType(member.name);
     if(category==='Produktlista'||category==='CE-skylt'){
      ceImportSkipped.push({fileName:member.name,message:'Skapas/sparas per dörr'});continue;
     }
     if((member._data?.uncompressedSize||0)>CE_IMPORT_MAX)throw Error('PDF över 20 MB i ZIP: '+member.name);
     const bytes=await member.async('uint8array');total+=bytes.length;
     if(total>100*1024*1024)throw Error('För mycket PDF-data i ZIP.');
     extracted.push({filePath:member.name,bytes});
     if(extracted.length>30)throw Error('För många CE-mallar i ZIP. Välj en mall per dokumenttyp.');
    }
   }else if(/\.pdf$/i.test(file.name)||file.type==='application/pdf'){
    if(file.size>CE_IMPORT_MAX)throw Error('PDF över 20 MB: '+file.name);
    const bytes=new Uint8Array(await file.arrayBuffer());total+=bytes.length;
    if(total>100*1024*1024)throw Error('För mycket PDF-data.');
    extracted.push({filePath:file.name,bytes});
   }else ceImportErrors.push({fileName:file.name,message:'Endast PDF/ZIP.'});
  }
  if(!extracted.length&&!ceImportErrors.length)throw Error('Inga redigerbara CE-mallar hittades i ZIP-filen.');
  for(const f of extracted){
   if(seq!==ceImportSerial)return;
   try{
    const result=await ceImportRecognize(f.filePath,f.bytes);
    const previous=ceImportData.find(item=>item.category===result.category);
    if(previous){
     if(ceImportSamePdf(previous,result)){ceImportSkipped.push({fileName:f.filePath,message:'Identisk dubblett'});continue;}
     throw Error('Flera olika PDF:er för '+result.category+'. Välj en originalmall för den mappen.');
    }
    ceImportData.push(result);
   }catch(err){ceImportErrors.push({fileName:f.filePath,message:err.message});}
  }
 }catch(err){ceImportErrors.push({fileName:'ZIP/PDF',message:err.message});}
 finally{if(seq===ceImportSerial){ceImportBusy=false;ceImportRender();}}
}
function ceImportOpen(){
 ++ceImportSerial;ceImportData=[];ceImportErrors=[];ceImportSkipped=[];ceImportBusy=false;$('ceImportCEFiles').value='';
 ceImportRender();if(!$('ceImportCEDialog').open)$('ceImportCEDialog').showModal();
}
$('ceImportCEBatch').onclick=ceImportOpen;
$('ceImportCEChoose').onclick=()=>$('ceImportCEFiles').click();
$('ceImportCEFiles').onchange=e=>{const files=Array.from(e.target.files||[]);e.target.value='';if(files.length)void ceImportAnalyze(files);};
$('ceImportCEClose').onclick=()=>$('ceImportCEDialog').close();
$('ceImportCECancel').onclick=()=>$('ceImportCEDialog').close();
$('ceImportCEApply').onclick=async()=>{
 if(ceImportBusy||!ceImportData.length||ceImportErrors.length)return;
 ceImportBusy=true;ceImportRender();ceImportState('Sparar mallarna i rätt mappar…');
 try{
  const n=await module.importCEBatch(ceImportData);save();
  ceImportBusy=false;ceImportData=[];ceImportErrors=[];ceImportSkipped=[];ceImportRender();
  ceImportState(n+' CE-mallar importerade i rätt mappar.');
  notice(n+' CE-mallar importerade. Produktlista och CE-skylt är oförändrade.');
 }catch(err){ceImportBusy=false;ceImportRender();ceImportState('Importen misslyckades: '+err.message,true);}
};

const bridge={save,redraw:renderDoors,getProjectMeta:()=>state.meta,getItems:()=>state.doors,onOpen:prepareDoorDialog,setProjectField,setDoorMachineField};
for(const [code,label] of window.TillsynoCEModels.list){const option=document.createElement('option');option.value=code;option.textContent=code+' · '+label;$('ceDoorCode').append(option);const model=document.createElement('option');model.value=window.TillsynoCEModels.resolve(code).model;$('ceAutomationModels').append(model);}
const customCode=document.createElement('option');customCode.value='custom';customCode.textContent='Egen maskintyp';$('ceDoorCode').append(customCode);
let countTouched=false;
const startupControls=Array.from(document.querySelectorAll('button,input,select'));
startupControls.forEach(control=>control.disabled=true);
function profileType(door){return module.payload().doorProfiles?.[door.id]||door.type||'glass';}
function syncSharedProjectMeta(){
 const m=state.meta||{};
 m.company=m.technicianCompany||'';
 m.companyPhone=m.technicianPhone||'';
 m.companyContact=m.technician||'';
 m.siteAddress=m.address||'';
 m.sitePostalPlace=m.customerPostalPlace||'';
}
function renderMeta(){
 syncSharedProjectMeta();updateProjectSignStatus();
 for(const input of document.querySelectorAll('[data-meta]'))input.value=state.meta[input.dataset.meta]||'';
 const caption=$('ceProjectCaption');
 if(caption){caption.textContent=[state.meta.projectName,state.meta.technician].filter(Boolean).join(' · ');caption.title=caption.textContent;}
 const title=$('ceWorkspaceProjectName');if(title)title.textContent=state.meta.projectName||'Namnlöst CE-projekt';
}
function setProjectField(key,value){
 const allowed=new Set(Array.from(document.querySelectorAll('[data-meta]')).map(input=>input.dataset.meta));if(!allowed.has(key))return;
 if(state.meta[key]===value&&state.meta._edited?.[key]===true)return;
 state.meta[key]=value;state.meta._edited=state.meta._edited||{};state.meta._edited[key]=true;syncSharedProjectMeta();
 for(const door of state.doors)module.invalidateDoor(door);
 renderMeta();save();renderDoors();
 if(key==='objectNo'&&!editing){$('ceDoorObject').value=value;syncDoorForm(false);}
}
function setDoorMachineField(door,field,value){if(!state.doors.some(entry=>entry===door)||!['model','manufacturer'].includes(field))return;door[field]=String(value);if(field==='model'){const detected=window.TillsynoCEModels.resolve('',value);if(detected.brand)door.manufacturer=detected.brand;}module.invalidateDoor(door);save();renderDoors();}
function ceDoorIcon(name){
 const paths={
  copy:'M6 2h7v9H6zM4 5H2v9h8v-2',
  edit:'M3 11l-1 3 3-1 8-8-2-2-8 8M9 5l2 2',
  trash:'M3 4h10M6 2h4M5 4l.6 10h4.8L11 4M7 6v6M9 6v6',
  folder:'M1.5 4.5V3h5L8 4.5h6.5v9h-13zM1.5 6.5h13'
 };
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 16 16');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');
 path.setAttribute('d',paths[name]||paths.copy);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');
 path.setAttribute('stroke-width','1.45');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');
 svg.append(path);return svg;
}
function renderDoors(){
 const root=$('ceDoorList');root.replaceChildren();$('ceDoorTotal').textContent=state.doors.length+' st';$('ceEmpty').hidden=!!state.doors.length;
 for(const door of state.doors){
  const row=document.createElement('div');row.className='ceDoorRow';
  const open=document.createElement('button');open.type='button';open.className='ceDoorOpen';open.dataset.door=door.id;open.setAttribute('aria-label','Öppna CE-dokument för '+door.sourceText);
  const folder=document.createElement('span');folder.className='ceDoorFolderIcon';folder.setAttribute('aria-hidden','true');folder.append(ceDoorIcon('folder'));
  const info=document.createElement('span');info.className='ceDoorInfo';const name=document.createElement('strong');name.textContent=door.sourceText;
  const sub=document.createElement('small');sub.textContent=door.location+' · '+(profileType(door)==='glass'?'Med glas':'Utan glas');const variants=module.getDoorCustomizations(door);const scope=document.createElement('small');scope.className='ceDoorScope'+(variants.length?' has-custom':'');scope.textContent=variants.length?'Anpassad · '+variants.length+' '+(variants.length===1?'mapp':'mappar'):'Gemensam standard';scope.title=variants.length?'Anpassade dokument: '+variants.join(', '):'Alla ifyllnadsval följer standarden för dörrtypen';info.append(name,sub,scope);if(door.copiedFrom){const copyMeta=document.createElement('small');copyMeta.className='ceDoorCopied';copyMeta.textContent='Kopia av '+door.copiedFrom+' · kontrollera';info.append(copyMeta);}
  const progress=module.getProgress(door),badge=document.createElement('span');badge.className='cePercent'+(progress===100?' done':progress?' partial':'');badge.textContent=progress+' % ›';open.append(folder,info,badge);open.onclick=()=>void openDoor(door);
  const copy=document.createElement('button');copy.type='button';copy.className='ceDoorCopy';copy.append(ceDoorIcon('copy'));copy.title='Kopiera '+door.sourceText;copy.setAttribute('aria-label','Kopiera dörr '+door.sourceText);copy.onclick=()=>copyDoorForm(door);
  const edit=document.createElement('button');edit.type='button';edit.className='ceDoorEdit';edit.append(ceDoorIcon('edit'));edit.setAttribute('aria-label','Ändra nummer och placering för '+door.sourceText);edit.onclick=()=>editDoor(door);
  const remove=document.createElement('button');remove.type='button';remove.className='ceDoorRemove';
  remove.append(ceDoorIcon('trash'));remove.title='Ta bort '+door.sourceText;
  remove.setAttribute('aria-label','Ta bort dörrautomatik '+door.sourceText);
  remove.onclick=()=>{
   if(row.querySelector('.ceDoorConfirm')){row.querySelector('.ceDoorConfirm').remove();return;}
   const confirm=document.createElement('div');confirm.className='ceDoorConfirm';
   const label=document.createElement('strong');label.textContent='Ta bort '+door.sourceText+' och dess CE-uppgifter?';
   const accept=document.createElement('button');accept.type='button';accept.className='ceDoorDeleteYes';accept.textContent='Ja, ta bort';
   const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Avbryt';
   accept.onclick=()=>{
    if(!state.doors.some(entry=>entry.id===door.id))return;
    // Delete only this automation. Shared PDF templates and project signature remain.
    if(!module.removeDoor(door))return notice('Dörren kunde inte tas bort.',true);
    state.doors=state.doors.filter(entry=>entry.id!==door.id);
    if(state.selected===door.id)state.selected=state.doors[0]?.id||null;
    if(editing===door.id)resetForm();
    save();renderDoors();notice(door.sourceText+' borttagen. Du kan lägga till en ny dörrautomatik.');
   };
   cancel.onclick=()=>{confirm.remove();remove.focus();};
   confirm.append(label,accept,cancel);row.append(confirm);accept.focus();
  };
  row.append(open,copy,edit,remove);root.append(row);
 }
}
function prepareDoorDialog(door){
 state.selected=door.id;
 const dialog=$('slrFlowTestDialog'),header=dialog.querySelector('header'),exit=$('slrTestExit');
 if(!$('cePreviousDoor')){
  for(const [id,label,glyph,direction] of [['cePreviousDoor','Föregående dörr','‹',-1],['ceNextDoor','Nästa dörr','›',1]]){
   const button=document.createElement('button');button.type='button';button.id=id;button.textContent=glyph;button.setAttribute('aria-label',label);button.title=label;
   button.onclick=()=>{const index=state.doors.findIndex(entry=>entry.id===state.selected),next=state.doors[index+direction];if(next)void openDoor(next);};header.insertBefore(button,exit);
  }
  exit.textContent='×';exit.setAttribute('aria-label','Stäng CE-dokument');
  const pdf=document.createElement('button');pdf.id='ceDialogSavePdf';pdf.type='button';pdf.textContent='Spara PDF';pdf.onclick=()=>void savePdf();dialog.querySelector('.slrCompleteBar').append(pdf);
 }
 const index=state.doors.indexOf(door);$('cePreviousDoor').disabled=index<=0;$('ceNextDoor').disabled=index===state.doors.length-1;
 save();
}
async function openDoor(door){try{await module.open(door,bridge);}catch(error){notice('Kunde inte öppna dörren: '+error.message,true);}}
function nextCount(objectNo,code){
 const used=new Set(state.doors.filter(door=>door.objectNo===objectNo&&door.modelCode===code)
  .map(door=>Number(door.serialNumber)).filter(n=>Number.isSafeInteger(n)&&n>0));
 let number=1;while(used.has(number))number++;return number;
}
function doorCode(){return $('ceDoorCode').value==='custom'?$('ceDoorCustomCode').value.trim():$('ceDoorCode').value;}
function syncDoorForm(useModel=true){const code=doorCode(),objectNo=$('ceDoorObject').value.trim();$('ceDoorCustomCode').hidden=$('ceDoorCode').value!=='custom';if(!editing&&!countTouched)$('ceDoorCount').value=String(nextCount(objectNo,code));$('ceDoorNumber').value=[objectNo,code,$('ceDoorCount').value].filter(Boolean).join('-');if(useModel){const model=window.TillsynoCEModels.resolve(code);$('ceDoorModel').value=model.model;$('ceDoorBrand').value=model.brand;}}
function resetForm(){editing=null;copySourceId=null;countTouched=false;$('ceDoorForm').reset();$('ceDoorObject').value=state.meta.objectNo||'';$('ceDoorCode').value=current()?.modelCode||'24';if(!$('ceDoorCode').value)$('ceDoorCode').value='24';syncDoorForm();$('ceDoorSubmit').textContent='Lägg till';$('ceDoorCopyHint').hidden=true;$('ceDoorForm').hidden=true;}
function copyDoorForm(door){
 if(!state.doors.some(entry=>entry.id===door.id))return;
 resetForm();
 copySourceId=door.id;editing=null;countTouched=false;
 $('ceDoorObject').value=door.objectNo||'';
 $('ceDoorCode').value=door.modelCode||'';
 if(!$('ceDoorCode').value)$('ceDoorCode').value='custom';
 $('ceDoorCustomCode').value=door.modelCode||'';
 $('ceDoorLocation').value=door.location||'';
 $('ceDoorType').value=profileType(door);
 syncDoorForm(false); // Automatically propose the next available door number.
 $('ceDoorModel').value=door.model||'';
 $('ceDoorBrand').value=door.manufacturer||'';
 $('ceDoorSubmit').textContent='Skapa kopia';
 $('ceDoorCopyHint').textContent='Kopierar '+door.sourceText+' · Ändra dörrnummer, maskintyp, antal och placering om det behövs. Kryss, uppgifter, underskrifter, dokument och Klart-status följer med. Kontrollera kopian innan den skickas.';
 $('ceDoorCopyHint').hidden=false;
 $('ceDoorForm').hidden=false;
 $('ceDoorForm').scrollIntoView({block:'nearest',behavior:'smooth'});
}
function editDoor(door){copySourceId=null;$('ceDoorCopyHint').hidden=true;editing=door.id;countTouched=true;$('ceDoorObject').value=door.objectNo||'';$('ceDoorCode').value=door.modelCode||'custom';if(!$('ceDoorCode').value)$('ceDoorCode').value='custom';$('ceDoorCustomCode').value=door.modelCode||'';$('ceDoorCount').value=door.serialNumber||1;$('ceDoorLocation').value=door.location;$('ceDoorType').value=profileType(door);syncDoorForm(false);const machine=window.TillsynoCEModels.resolve(door.modelCode,door.model,door.manufacturer);$('ceDoorModel').value=machine.model;$('ceDoorBrand').value=machine.brand;$('ceDoorSubmit').textContent='Spara';$('ceDoorForm').hidden=false;}
function manualDoor(number,location,type,id=uid()){
 const match=number.match(/^(.*)-(\d+)-(\d+)$/),modelCode=match?.[2]||'';
 const machine=window.TillsynoCEModels.resolve(modelCode);return {id,sourceText:number,objectNo:match?.[1]||number,modelCode,serialNumber:match?.[3]||'',model:machine.model,manufacturer:machine.brand,location,type};
}
$('ceAddToggle').onclick=()=>{if(!$('ceDoorForm').hidden){resetForm();return;}resetForm();$('ceDoorForm').hidden=false;/* Open the form only. Do not focus the Maskintyp select: iOS opens its native picker. */};
for(const id of ['ceDoorObject','ceDoorCustomCode'])$(id).addEventListener('input',()=>syncDoorForm(false));
$('ceDoorCode').addEventListener('change',()=>syncDoorForm());$('ceDoorCount').addEventListener('input',()=>{countTouched=true;syncDoorForm(false);});
$('ceDoorModel').addEventListener('input',()=>{const machine=window.TillsynoCEModels.resolve('',$('ceDoorModel').value);if(machine.brand)$('ceDoorBrand').value=machine.brand;});
$('ceDoorCancel').onclick=resetForm;
$('ceDoorForm').onsubmit=async event=>{
 event.preventDefault();syncDoorForm(false);const number=$('ceDoorNumber').value.trim(),location=$('ceDoorLocation').value.trim(),type=$('ceDoorType').value;
 if(!$('ceDoorObject').value.trim()||!/^\d+$/.test(doorCode())||!Number.isSafeInteger(Number($('ceDoorCount').value))||Number($('ceDoorCount').value)<1||!location)return notice('Fyll i objektnummer, maskintyp, antal och placering.',true);
 if(state.doors.some(door=>door.id!==editing&&door.sourceText.toLowerCase()===number.toLowerCase()))return notice('Automatiknumret finns redan.',true);
 const copiedFrom=!editing&&copySourceId?state.doors.find(entry=>entry.id===copySourceId):null;
 if(copySourceId&&!editing&&!copiedFrom)return notice('Dörren du skulle kopiera finns inte längre.',true);
 let door;
 const model=$('ceDoorModel').value.trim(),manufacturer=$('ceDoorBrand').value.trim();
 if(editing){door=state.doors.find(entry=>entry.id===editing);if(!door)return;const changed=door.sourceText!==number||door.location!==location||profileType(door)!==type||door.model!==model||door.manufacturer!==manufacturer;if(changed)module.invalidateDoor(door);Object.assign(door,manualDoor(number,location,type,door.id));}
 else{
  door=manualDoor(number,location,type);door.model=model;door.manufacturer=manufacturer;
  state.doors.push(door);
  if(copiedFrom){
   try{await module.copyDoor(copiedFrom,door);}
   catch(error){module.removeDoor(door);state.doors.pop();return notice('Kunde inte kopiera dörren: '+error.message,true);}
  }
 }
 door.model=model;door.manufacturer=manufacturer;
 module.assignProfile(door,type);state.selected=door.id;resetForm();save();renderDoors();
 if(copiedFrom)notice('Dörr '+door.sourceText+' kopierad med kryss, underskrifter och dokument. Kontrollera uppgifterna för den nya dörren innan du skickar.');
 await openDoor(door);
};
for(const input of document.querySelectorAll('[data-meta]'))input.addEventListener('change',()=>setProjectField(input.dataset.meta,input.value));
$('ceExportSelected').onclick=()=>{if(!state.doors.length)return notice('Lägg till en dörr först.',true);void module.openExport(bridge).catch(err=>notice('Kunde inte öppna ZIP-exporten: '+err.message,true));};
$('ceExportFiles').onclick=()=>window.TillsynoCEFileExport.open(bridge);
const personal=window.TillsynoCEPersonal;
function personalAccount(){
 const access=window.TillsynoCurrentAccess;
 if(!accountId||access?.userId!==accountId)throw Error('Du måste vara inloggad för att använda sparade uppgifter.');
 return accountId;
}
function savePersonalFields(group){
 try{
  const n=personal.saveGroup(personalAccount(),state.meta,group);
  notice(n+' uppgifter sparade på denna enhet. De kan hämtas i nästa CE-projekt.');
 }catch(err){notice(err.message,true);}
}
function loadPersonalFields(group){
 try{
  const groupFields=personal.getGroup(personalAccount(),group);
  if(!Object.keys(groupFields).length)throw Error('Det finns inga sparade uppgifter för denna grupp.');
  state.meta._edited=state.meta._edited||{};
  for(const [key,value] of Object.entries(groupFields)){
   state.meta[key]=value;state.meta._edited[key]=true;
  }
  syncSharedProjectMeta();
  for(const door of state.doors)module.invalidateDoor(door);
  renderMeta();renderDoors();save();
  notice('Sparade '+(group==='performer'?'utföraruppgifter':'beställaruppgifter')+' hämtade.');
 }catch(err){notice(err.message,true);}
}
$('ceRememberPerformer').onclick=()=>savePersonalFields('performer');
$('ceRecallPerformer').onclick=()=>loadPersonalFields('performer');
$('ceRememberCustomer').onclick=()=>savePersonalFields('customer');
$('ceRecallCustomer').onclick=()=>loadPersonalFields('customer');

async function buildProjectPdf(){
 const data=snapshot().state,assets=module.assets(),pdf=await PDFLib.PDFDocument.create(),font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
 // This is intentionally a one-page HANDOFF COVER, not rendered per-door CE forms.
 // The editable project and the one-per-category original templates live in PDF data.
 const page=pdf.addPage([595.28,841.89]),W=page.getWidth(),navy=PDFLib.rgb(.07,.19,.28),
 accent=PDFLib.rgb(.12,.47,.65),gray=PDFLib.rgb(.32,.41,.47),pale=PDFLib.rgb(.93,.97,.99);
 const safeText=v=>String(v??'').replace(/[\r\n\t]+/g,' ').replace(/[^\u0020-\u00ff]/g,' ').trim();
 const textLine=(value,x,y,size=11,color=navy,max=510)=>{
  let content=safeText(value);
  if(!content)return;
  while(content.length&&font.widthOfTextAtSize(content,size)>max)content=content.slice(0,-1);
  if(content!==safeText(value))content=content.replace(/\s+$/,'').slice(0,-3)+'...';
  if(content)page.drawText(content,{x,y,size,font,color});
 };
 page.drawRectangle({x:0,y:647,width:W,height:195,color:navy});
 page.drawRectangle({x:0,y:831,width:W,height:11,color:accent});
 page.drawText('TILLSYNO',{x:44,y:776,size:17,font,color:PDFLib.rgb(1,1,1)});
 page.drawText('CE-MÄRKNING  /  PROJEKTFIL',{x:44,y:725,size:22,font,color:PDFLib.rgb(1,1,1)});
 textLine('För över arbetet mellan iPad, dator och kollegor.',44,681,11,PDFLib.rgb(.82,.91,.95));
 page.drawRectangle({x:43,y:483,width:509,height:132,color:pale});
 textLine('PROJEKT',61,583,10,accent);
 textLine(data.meta.projectName||'CE-projekt',61,553,20,navy,470);
 textLine('Beställare: '+(data.meta.customer||'Ej angiven'),61,523,11,gray,465);
 textLine('Dörrautomatiker: '+data.doors.length,61,501,11,gray,465);
 textLine('ÖPPNA OCH FORTSÄTT I TILLSYNO',44,435,16,navy);
 textLine('1. Öppna Tillsyno på din dator eller iPad och logga in.',44,401,11,gray);
 textLine('2. Gå till CE-märkning och välj Öppna projekt-PDF.',44,377,11,gray);
 textLine('3. Välj denna PDF-fil för att återuppta hela projektet.',44,353,11,gray);
 textLine('4. Lägg till fler dörrautomatiker, eller exportera CE-underlag som ZIP.',44,329,11,gray);
 page.drawRectangle({x:43,y:211,width:509,height:85,color:pale});
 textLine('EN GEMENSAM PROJEKTFIL',60,272,11,accent);
 textLine('Mallar, ändringar, kryss, signaturer och CE-bilder',60,247,11,gray);
 textLine('följer med. Inga separata ZIP-filer behövs för överlämning.',60,228,11,gray);
 textLine('En vanlig PDF-läsare visar detta försättsblad.',44,172,10,gray);
 textLine('Projektets arbetsinnehåll öppnas och bearbetas i Tillsyno.',44,151,10,gray);
 page.drawRectangle({x:43,y:108,width:509,height:1,color:PDFLib.rgb(.79,.85,.88)});
 textLine('Viktigt: Detta är en arbetsfil, inte ett utfärdat CE-intyg.',44,89,10,gray);
 textLine('Filen är inte krypterad. Dela endast med behöriga mottagare.',44,71,9,gray);

 await module.saveTo(pdf,{automationItems:data.doors});
 window.TillsynoCEStorage.write(pdf,CATALOG,data);
 const bytes=new Uint8Array(await pdf.save({useObjectStreams:true})),check=await PDFLib.PDFDocument.load(bytes.slice());
 const reopened=window.TillsynoCEStorage.read(check,CATALOG);
 if(JSON.stringify(reopened)!==JSON.stringify(data))throw Error('Projektuppgifterna kunde inte verifieras i PDF-filen.');
 await module.verify(bytes,{automationItems:data.doors});
 const parsed=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
 try{
  const attachments=await parsed.getAttachments()||{},manifest=check.catalog.get(PDFLib.PDFName.of('TillsynoSLRTestManifest'))?window.TillsynoCEStorage.read(check,'TillsynoSLRTestManifest'):{};
  for(const [cat,original] of Object.entries(assets.templates||{})){
   const actual=attachments[manifest.templates?.[cat]]?.content;
   if(!actual||actual.length!==original.length||!actual.every((value,index)=>value===original[index]))throw Error('PDF-mallen kunde inte verifieras: '+cat);
  }
  for(const [id,product] of Object.entries(assets.productFiles||{})){
   if(product.generated)continue;
   const actual=attachments[manifest.products?.[id]?.file]?.content;
   if(!actual||actual.length!==product.bytes.length||!actual.every((value,index)=>value===product.bytes[index]))throw Error('Produktlistan kunde inte verifieras för '+id);
  }
 }finally{await parsed.destroy();}
 if(JSON.stringify(snapshot().state)!==JSON.stringify(data))throw Error('Projektet ändrades under PDF-sparningen. Spara igen.');
 return {bytes,name:safeName(data.meta.projectName)+'-CE-projekt.pdf'};
}
function download(bytes,name,type){const url=URL.createObjectURL(new Blob([bytes],{type})),link=document.createElement('a');link.href=url;link.download=name;const host=document.querySelector('dialog[open]')||document.body;host.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),90000);}
const projectFileSize=bytes=>(bytes/1048576).toLocaleString('sv-SE',{minimumFractionDigits:1,maximumFractionDigits:1})+' MB';
function ceSetShareStatus(message,isError=false){
 const node=$('ceShareProjectStatus');
 if(node){node.textContent=message;node.style.color=isError?'#ab3035':'#34586b';}
}
async function cePrepareProjectFile(){
 if(pdfBusy)throw Error('En projekt-PDF håller redan på att skapas.');
 pdfBusy=true;
 const buttons=[$('ceSavePdf'),$('ceShareProject'),$('ceDialogSavePdf')].filter(Boolean);
 buttons.forEach(button=>button.disabled=true);
 try{
  await enqueueSave();
  return await buildProjectPdf();
 }finally{pdfBusy=false;buttons.forEach(button=>button.disabled=false);}
}
async function savePdf(){
 try{
  notice('Skapar och verifierar projekt-PDF…');
  const result=await cePrepareProjectFile();
  download(result.bytes,result.name,'application/pdf');
  notice('Projekt-PDF sparad · '+projectFileSize(result.bytes.length)+'. Öppna filen i Tillsyno för att fortsätta.');
 }catch(error){notice('Projekt-PDF kunde inte sparas: '+error.message,true);}
}
$('ceSavePdf').onclick=()=>void savePdf();
window.TillsynoCECalculateProjectSize=async()=>{
 const result=await cePrepareProjectFile();return result.bytes.byteLength;
};
$('ceOptimizeTemplates').onclick=()=>window.TillsynoCEOptimize?.open();
function ceShareDialog(){
 let d=$('ceShareProjectDialog');
 if(d)return d;
 d=document.createElement('dialog');d.id='ceShareProjectDialog';d.className='ceShareProjectDialog';
 d.innerHTML='<header><strong>Skicka CE-projekt</strong><button id="ceShareClose" type="button">Stäng ×</button></header><main><p>Projektfilen innehåller ditt arbete, en gemensam mall av varje dokumenttyp och tillhörande bilder. Mottagaren öppnar filen i Tillsyno och kan därefter fortsätta arbetet eller exportera ZIP.</p><p id="ceShareProjectStatus" role="status" aria-live="polite">Förbereder projektfil…</p><div class="ceShareProjectActions"><button id="ceSharePrepare" type="button">Skapa om PDF</button><button id="ceShareSend" type="button" disabled>Dela projekt-PDF</button><button id="ceShareDownload" type="button" disabled>Spara projekt-PDF</button></div><small>Du behöver bara skicka projekt-PDF:en. En vanlig PDF-läsare visar försättsbladet.</small></main>';
 document.body.append(d);
 const css=document.createElement('style');css.textContent='#ceShareProjectDialog{width:min(520px,94vw);max-height:90dvh;padding:0;border:1px solid #a0bbc9;border-radius:13px;background:#fff;color:#17374b}#ceShareProjectDialog::backdrop{background:#102a3a99}#ceShareProjectDialog header{background:#14384f;color:#fff;padding:13px 15px;display:flex;justify-content:space-between;align-items:center;gap:10px}#ceShareProjectDialog header button{background:#e9f4f9;color:#183a50;border:0;border-radius:7px;padding:8px 11px;min-height:39px}#ceShareProjectDialog main{padding:15px}#ceShareProjectDialog p{font-size:13px;line-height:1.6;margin:0 0 13px}#ceShareProjectDialog small{font-size:11px;color:#587084;display:block;margin-top:10px}#ceShareProjectDialog .ceShareProjectActions{display:flex;gap:7px;flex-wrap:wrap}#ceShareProjectDialog .ceShareProjectActions button{min-height:43px;padding:8px 10px;border-radius:8px;background:#e9f4fa;color:#16415b;border:1px solid #9fbccc;font-size:12px;font-weight:700}#ceShareProjectDialog .ceShareProjectActions button:disabled{opacity:.5}';
 document.head.append(css);
 $('ceShareClose').onclick=()=>d.close();
 return d;
}
async function openShareProject(){
 const dialog=ceShareDialog();if(!dialog.open)dialog.showModal();
 const prepare=$('ceSharePrepare'),send=$('ceShareSend'),save=$('ceShareDownload');
 let ready=null,sequence=0;
 const build=async()=>{
  const revision=++sequence;
  ready=null;prepare.disabled=true;send.disabled=true;save.disabled=true;
  ceSetShareStatus('Skapar och verifierar projektfil…');
  try{
   const result=await cePrepareProjectFile();
   if(revision!==sequence)return;
   ready=new File([result.bytes],result.name,{type:'application/pdf'});
   ceSetShareStatus('Projektfil klar · '+projectFileSize(ready.size)+'. Du kan dela den eller spara den.');
   send.disabled=false;save.disabled=false;
  }catch(error){if(revision===sequence)ceSetShareStatus('Kunde inte skapa projektfil: '+error.message,true);}
  finally{if(revision===sequence)prepare.disabled=false;}
 };
 prepare.onclick=()=>void build();
 save.onclick=()=>{
  if(!ready)return;
  const url=URL.createObjectURL(ready),link=document.createElement('a');
  link.href=url;link.download=ready.name;dialog.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),90000);
  ceSetShareStatus('Projekt-PDF sparad · '+projectFileSize(ready.size)+'.');
 };
 send.onclick=()=>{
  const file=ready;if(!file)return;
  // Call Web Share directly during the click. iOS/Safari may reject sharing
  // if the file was generated in the same gesture after awaiting work.
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
   try{
    Promise.resolve(navigator.share({files:[file],title:'CE-projekt · '+file.name}))
     .then(()=>ceSetShareStatus('Projekt-PDF lämnad till delningsmenyn.'))
     .catch(error=>{if(error.name==='AbortError')ceSetShareStatus('Delningen avbröts. Projektfilen finns kvar här.');else ceSetShareStatus('Kunde inte dela projektfilen: '+error.message,true);});
   }catch(error){ceSetShareStatus('Kunde inte öppna delning: '+error.message,true);}
  }else{
   const url=URL.createObjectURL(file),a=document.createElement('a');
   a.href=url;a.download=file.name;dialog.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),90000);
   ceSetShareStatus('Delningsfunktionen saknas här. Projekt-PDF sparas så att du kan bifoga den i mejl.');
  }
 };
 dialog.addEventListener('close',()=>{sequence++;ready=null;},{once:true});
 await build();
}
$('ceShareProject').onclick=()=>void openShareProject();
function validateState(value){
 const sourceSchema=value?.schema;
 const legacy=value?.format===LEGACY_FORMAT&&value?.schema===2;
 const previous=Number.isInteger(value?.schema)&&value.schema>=3&&value.schema<VERSION&&value?.format==='Tillsyno CE-märkning TEST '+value.schema;
 if(!value||!(legacy||previous||value.format===FORMAT&&value.schema===VERSION)||!value.meta||typeof value.meta!=='object'||Array.isArray(value.meta)||!Array.isArray(value.doors)||value.doors.length>10000)throw Error('Välj en projekt-PDF från Tillsyno CE-märkning.');
 const ids=new Set(),numbers=new Set();for(const door of value.doors){if(typeof door.id!=='string'||typeof door.sourceText!=='string'||typeof door.location!=='string'||!door.id||!door.sourceText||ids.has(door.id)||numbers.has(door.sourceText.toLowerCase()))throw Error('Projektets dörrlista är ogiltig.');ids.add(door.id);numbers.add(door.sourceText.toLowerCase());}
 const meta=value.meta;
 if(legacy){
  const joined=(postcode,city)=>[postcode,city].filter(Boolean).join(' ');
  const defaults={siteAddress:meta.address||'',sitePostalPlace:joined(meta.postalCode,meta.postalCity),customerPostalPlace:joined(meta.postalCode,meta.postalCity),companyPostalPlace:joined(meta.companyPostalCode,meta.companyPostalCity),technicianCompany:meta.company||'',technicianPhone:meta.companyPhone||''};
  value.meta={...fresh().meta,...defaults,...meta};value.format=FORMAT;value.schema=VERSION;
 }else value.meta={...fresh().meta,...meta};
 value.format=FORMAT;value.schema=VERSION;
 for(const door of value.doors){const machine=window.TillsynoCEModels.resolve(door.modelCode,door.model,door.manufacturer);door.model=machine.model;door.manufacturer=machine.brand;}
 if(!value.meta.objectNo&&value.doors.length&&value.doors.every(door=>door.objectNo===value.doors[0].objectNo))value.meta.objectNo=value.doors[0].objectNo;
 if(sourceSchema<6&&value.slrTestData){const data=value.slrTestData;for(const door of value.doors){const profile=data.doorProfiles?.[door.id]||door.type,fields={...data.profiles?.[profile]?.Egenkontroll,...data.answers?.[door.id]?.Egenkontroll?.fields};const unsigned=Object.entries(fields).some(([key,val])=>/^10\.5\.\d+$/.test(key)&&val!==false&&val!==''&&val!==null&&val!==undefined&&!data.answers?.[door.id]?.Egenkontroll?.signatures?.[key+' Signatur']?.image);if(unsigned){delete data.completedDoors?.[door.id];if(data.reviewedFolders?.[door.id])delete data.reviewedFolders[door.id].Egenkontroll;}}}
 if(!value.meta._edited||typeof value.meta._edited!=='object'||Array.isArray(value.meta._edited))value.meta._edited={};
 return value;
}
$('ceOpenPdf').onchange=async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 const previous=snapshot();
 if(!ceClosed&&ceWork()&&!window.confirm('Öppna en annan projekt-PDF? Det aktuella projektet läggs först i historiken.'))return;
 try{if(ceWork())await ceArchiveCurrent('Före projekt-PDF-import');}
 catch(error){return notice('Öppning avbruten: '+error.message,true);}
 try{
  if(file.size>200*1024*1024)throw Error('Välj en PDF mindre än 200 MB.');notice('Öppnar CE-projekt…');
  const bytes=new Uint8Array(await file.arrayBuffer()),pdf=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false}),entry=pdf.catalog.get(PDFLib.PDFName.of(CATALOG));
  if(!entry)throw Error('Filen är inte en CE-projekt-PDF från TEST 2–7.');
  const loaded=validateState(window.TillsynoCEStorage.read(pdf,CATALOG));
  module.initProject(pdf,loaded,bytes);await module.loadTemplates();
  const required=pdf.catalog.get(PDFLib.PDFName.of('TillsynoSLRTestManifest'))?window.TillsynoCEStorage.read(pdf,'TillsynoSLRTestManifest'):{},assets=module.assets();
  for(const cat of Object.keys(required.templates||{}))if(!assets.templates[cat])throw Error('En PDF-mall saknas i projektfilen: '+cat);
  for(const id of Object.keys(required.products||{}))if(!assets.productFiles[id])throw Error('En produktlista saknas i projektfilen.');
  state=loaded;ceAutoRevision=-1;ceAutoProjectId='';clearTimeout(ceHistoryTimer);
  window.TillsynoCEOptimize?.reset?.();syncSharedProjectMeta();renderMeta();renderDoors();await enqueueSave();ceWorkspaceOpen();await ceClosedState(false);notice('CE-projekt öppnat · '+state.doors.length+' dörrautomatiker.');
 }catch(error){state=previous.state;module.reset();module.restore(state);module.restoreAssets(previous.assets);await module.loadTemplates().catch(()=>{});renderMeta();renderDoors();notice('Kunde inte öppna filen: '+error.message,true);}
};


/* v1.2: project selection is non-destructive, new projects archive first. */
async function ceNewProject(){
 if(ceTransition)return;ceTransition=true;
 const backup=snapshot();
 try{
  clearTimeout(saveTimer);await writeQueue.catch(()=>{});
  if(ceWork())await ceArchiveCurrent('Före nytt projekt');
  clearTimeout(ceHistoryTimer);ceAutoRevision=-1;ceAutoProjectId='';
  module.reset();state=fresh();editing=null;copySourceId=null;
  window.TillsynoCEOptimize?.reset?.();
  saveRevision++;await enqueueSave();
  renderMeta();renderDoors();resetForm();$('ceProject').open=true;
  $('ceFileExport')?.setAttribute('hidden','');
  ceWorkspaceOpen();await ceClosedState(false);
  storageStatus('Nytt CE-projekt');
  notice('Nytt projekt. Föregående projekt finns i historiken.');
 }catch(err){
  module.reset();state=backup.state;module.restore(state);module.restoreAssets(backup.assets);
  await module.loadTemplates().catch(()=>{});renderMeta();renderDoors();
  notice('Kunde inte skapa nytt projekt: '+err.message,true);
 }finally{ceTransition=false;}
}
$('ceCloseProject').onclick=()=>void ceClose();
$('ceOpenSaved').onclick=()=>void ceClose();
$('ceHomeNew').onclick=()=>void ceNewProject();
$('ceHomeOpenPdf').onclick=()=>$('ceHomePdfPicker').click();
$('ceHomePdfPicker').onchange=event=>$('ceOpenPdf').onchange(event);
const ceActionMenus=[...document.querySelectorAll('.ceToolbarMenu')];
for(const menu of ceActionMenus){
 menu.addEventListener('toggle',()=>{if(menu.open)ceActionMenus.forEach(other=>{if(other!==menu)other.open=false;});});
 menu.addEventListener('click',e=>{if(e.target.closest('button,.ceButton'))menu.open=false;});
}
document.addEventListener('pointerdown',event=>{
 if(event.target.closest('.ceToolbarMenu'))return;
 ceActionMenus.forEach(menu=>menu.open=false);
});

window.addEventListener('pagehide',()=>{if(saveRevision>savedRevision)void enqueueSave().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&saveRevision>savedRevision)void enqueueSave().catch(()=>{});});
(async()=>{
 try{
  const access=window.TillsynoCurrentAccess?.userId?window.TillsynoCurrentAccess:await new Promise(resolve=>window.addEventListener('tillsyno-authorized',event=>resolve(event.detail),{once:true}));
  if(!access?.userId)throw Error('Kontot saknar användar-ID.');
  accountId=access.userId;
  const local=await readLocal();
  if(local){
   state=validateState(local.state);module.restore(state);module.restoreAssets(local.assets);await module.loadTemplates();
   storageStatus('Ditt lokala CE-projekt återöppnat');
   if(ceWork())ceScheduleAutoHistory(4000);
  }else{
   storageStatus('Nytt CE-projekt');
  }
 }catch(error){storageStatus('Lokal återöppning misslyckades.');notice(error.message,true);}
 finally{
  renderMeta();renderDoors();
  if(accountId){
   startupControls.forEach(control=>control.disabled=false);
   try{
    const closed=await ceDbGet(CE_CLOSED);
    if(closed===true||!ceWork())await ceClosedState(true);
    else ceWorkspaceOpen();
   }catch(err){ceWorkspaceOpen();notice('Kunde inte öppna projektväljaren: '+err.message,true);}
  }
 }
})();
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('ce-markning-v1-2-sw.js',{scope:'ce-markning.html'}).catch(error=>console.warn('CE-cache kunde inte förberedas',error));
}
})();
