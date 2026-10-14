(function(){
'use strict';
const VERSION=3,FORMAT='Tillsyno CE-märkning TEST 3',LEGACY_FORMAT='Tillsyno CE-märkning TEST 2',DB='tillsyno-ce-markning-test-v3',LEGACY_DB='tillsyno-ce-markning-test-v2',KEY='active',CATALOG='TillsynoCETestData';
const $=id=>document.getElementById(id),module=window.TillsynoCETest;
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const fresh=()=>({format:FORMAT,schema:VERSION,meta:{projectName:'',siteAddress:'',sitePostalPlace:'',customer:'',address:'',customerPostalPlace:'',contact:'',phone:'',company:'',companyAddress:'',companyPostalPlace:'',companyOrgNo:'',companyContact:'',companyPhone:'',slrAuthorisation:'',order:'',technician:'',technicianCompany:'',technicianPhone:'',date:new Date().toLocaleDateString('sv-SE'),installationDate:'',documentationName:'',documentationAddress:'',documentationPostalPlace:'',egSignerName:'',egSignerTitle:'',egPlace:'',egDate:'',_edited:{}},doors:[],selected:null,slrTestData:null});
let state=fresh(),editing=null,noticeTimer=0,saveTimer=0,saveRevision=0,savedRevision=0,writeQueue=Promise.resolve(),pdfBusy=false;
const uid=()=>'ce-'+(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));
const current=()=>state.doors.find(door=>door.id===state.selected)||null;
const safeName=value=>String(value||'CE-projekt').normalize('NFC').replace(/[\\/<>:"|?*\u0000-\u001f]/g,'-').slice(0,100);
function notice(text,error=false){$('ceNotice').textContent=text;$('ceNotice').style.background=error?'#8b342c':'#173f52';$('ceNotice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('ceNotice').hidden=true,6000);}
function storageStatus(text){$('ceStorageStatus').textContent=text;}
function snapshot(){state.slrTestData=module.payload();for(const door of state.doors)door.type=state.slrTestData.doorProfiles?.[door.id]||door.type;return {state:structuredClone(state),assets:structuredClone(module.assets())};}
function openDb(name=DB,existingOnly=false){return new Promise((resolve,reject)=>{let absent=false;const request=indexedDB.open(name,1);request.onupgradeneeded=()=>{if(existingOnly){absent=true;request.transaction.abort();}else request.result.createObjectStore('projects');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>absent?resolve(null):reject(request.error);});}
async function readLocal(name=DB,existingOnly=false){const db=await openDb(name,existingOnly);if(!db)return null;try{return await new Promise((resolve,reject)=>{const tx=db.transaction('projects'),request=tx.objectStore('projects').get(KEY);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});}finally{db.close();}}
async function writeLocal(data){const db=await openDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(data,KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Sparningen avbröts.'));});}finally{db.close();}}
function enqueueSave(){
 clearTimeout(saveTimer);const revision=saveRevision,data=snapshot();
 const operation=writeQueue.catch(()=>{}).then(()=>writeLocal(data));writeQueue=operation;
 operation.then(()=>{savedRevision=Math.max(savedRevision,revision);if(savedRevision===saveRevision)storageStatus('Sparat lokalt · TEST 3');}).catch(error=>{storageStatus('Kunde inte spara lokalt.');notice('Sparningen misslyckades: '+error.message,true);});
 return operation;
}
function save(){saveRevision++;storageStatus('Sparar lokalt…');clearTimeout(saveTimer);saveTimer=setTimeout(enqueueSave,250);}
const bridge={save,redraw:renderDoors,getProjectMeta:()=>state.meta,getItems:()=>state.doors,onOpen:prepareDoorDialog,setProjectField};
const startupControls=Array.from(document.querySelectorAll('button,input,select'));
startupControls.forEach(control=>control.disabled=true);
function profileType(door){return module.payload().doorProfiles?.[door.id]||door.type||'glass';}
function renderMeta(){for(const input of document.querySelectorAll('[data-meta]'))input.value=state.meta[input.dataset.meta]||'';const caption=$('ceProjectCaption');if(caption){caption.textContent=[state.meta.projectName,state.meta.technician].filter(Boolean).join(' · ');caption.title=caption.textContent;}}
function setProjectField(key,value){
 const allowed=new Set(Array.from(document.querySelectorAll('[data-meta]')).map(input=>input.dataset.meta));if(!allowed.has(key))return;
 if(state.meta[key]===value&&state.meta._edited?.[key]===true)return;
 state.meta[key]=value;state.meta._edited=state.meta._edited||{};state.meta._edited[key]=true;
 for(const door of state.doors)module.invalidateDoor(door);
 renderMeta();save();renderDoors();
}
function renderDoors(){
 const root=$('ceDoorList');root.replaceChildren();$('ceDoorCount').textContent=state.doors.length+' st';$('ceEmpty').hidden=!!state.doors.length;
 for(const door of state.doors){
  const row=document.createElement('div');row.className='ceDoorRow';
  const open=document.createElement('button');open.type='button';open.className='ceDoorOpen';open.dataset.door=door.id;open.setAttribute('aria-label','Öppna CE-dokument för '+door.sourceText);
  const info=document.createElement('span');info.className='ceDoorInfo';const name=document.createElement('strong');name.textContent=door.sourceText;
  const sub=document.createElement('small');sub.textContent=door.location+' · '+(profileType(door)==='glass'?'Med glas':'Utan glas');info.append(name,sub);
  const progress=module.getProgress(door),badge=document.createElement('span');badge.className='cePercent'+(progress===100?' done':progress?' partial':'');badge.textContent=progress+' % ›';open.append(info,badge);open.onclick=()=>void openDoor(door);
  const edit=document.createElement('button');edit.type='button';edit.className='ceDoorEdit';edit.textContent='✎';edit.setAttribute('aria-label','Ändra nummer och placering för '+door.sourceText);edit.onclick=()=>editDoor(door);
  row.append(open,edit);root.append(row);
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
function resetForm(){editing=null;$('ceDoorForm').reset();$('ceDoorSubmit').textContent='Lägg till';$('ceDoorForm').hidden=true;}
function editDoor(door){editing=door.id;$('ceDoorNumber').value=door.sourceText;$('ceDoorLocation').value=door.location;$('ceDoorType').value=profileType(door);$('ceDoorSubmit').textContent='Spara';$('ceDoorForm').hidden=false;$('ceDoorNumber').focus();}
function manualDoor(number,location,type,id=uid()){
 const match=number.match(/^(.*)-(\d+)-(\d+)$/),modelCode=match?.[2]||'';
 return {id,sourceText:number,objectNo:match?.[1]||number,modelCode,serialNumber:match?.[3]||'',model:modelCode==='24'?'ED100':modelCode==='37'?'ED250':'',location,type};
}
$('ceAddToggle').onclick=()=>{if(editing)resetForm();$('ceDoorForm').hidden=!$('ceDoorForm').hidden;if(!$('ceDoorForm').hidden)$('ceDoorNumber').focus();};
$('ceDoorCancel').onclick=resetForm;
$('ceDoorForm').onsubmit=async event=>{
 event.preventDefault();const number=$('ceDoorNumber').value.trim(),location=$('ceDoorLocation').value.trim(),type=$('ceDoorType').value;
 if(!number||!location)return notice('Fyll i nummer och placering.',true);
 if(state.doors.some(door=>door.id!==editing&&door.sourceText.toLowerCase()===number.toLowerCase()))return notice('Automatiknumret finns redan.',true);
 let door;
 if(editing){door=state.doors.find(entry=>entry.id===editing);if(!door)return;const changed=door.sourceText!==number||door.location!==location||profileType(door)!==type;if(changed)module.invalidateDoor(door);Object.assign(door,manualDoor(number,location,type,door.id));}
 else{door=manualDoor(number,location,type);state.doors.push(door);}
 module.assignProfile(door,type);state.selected=door.id;resetForm();save();renderDoors();await openDoor(door);
};
for(const input of document.querySelectorAll('[data-meta]'))input.addEventListener('change',()=>setProjectField(input.dataset.meta,input.value));
$('ceSaveLocal').onclick=()=>void enqueueSave().then(()=>notice('Sparat lokalt på denna enhet.')).catch(()=>{});

async function buildProjectPdf(){
 const data=snapshot().state,assets=module.assets(),pdf=await PDFLib.PDFDocument.create(),font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
 let page=pdf.addPage([595.28,841.89]),y=795;
 page.drawText('CE-markning TEST 3',{x:40,y,size:18,font});y-=26;
 const drawLine=text=>{if(y<45){page=pdf.addPage([595.28,841.89]);y=795;}page.drawText(String(text).replace(/[^\u0020-\u00ff]/g,'?').slice(0,90),{x:40,y,size:10,font});y-=16;};
 drawLine(data.meta.projectName||'CE-projekt');drawLine(data.meta.customer||'');y-=12;
 for(const door of data.doors){drawLine(door.sourceText+' | '+door.location+' | '+(door.type==='glass'?'Med glas':'Utan glas'));drawLine(module.getProgress(door)+' %');}
 await module.saveTo(pdf,{automationItems:data.doors});
 pdf.catalog.set(PDFLib.PDFName.of(CATALOG),PDFLib.PDFHexString.fromText(JSON.stringify(data)));
 const bytes=new Uint8Array(await pdf.save({useObjectStreams:true})),check=await PDFLib.PDFDocument.load(bytes.slice());
 const reopened=JSON.parse(check.catalog.get(PDFLib.PDFName.of(CATALOG)).decodeText());
 if(JSON.stringify(reopened)!==JSON.stringify(data))throw Error('Projektuppgifterna kunde inte verifieras i PDF-filen.');
 await module.verify(bytes,{automationItems:data.doors});
 const parsed=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
 try{
  const attachments=await parsed.getAttachments()||{},manifest=JSON.parse(check.catalog.get(PDFLib.PDFName.of('TillsynoSLRTestManifest'))?.decodeText()||'{}');
  for(const [cat,original] of Object.entries(assets.templates||{})){
   const actual=attachments[manifest.templates?.[cat]]?.content;
   if(!actual||actual.length!==original.length||!actual.every((value,index)=>value===original[index]))throw Error('PDF-mallen kunde inte verifieras: '+cat);
  }
  for(const [id,product] of Object.entries(assets.productFiles||{})){
   const actual=attachments[manifest.products?.[id]?.file]?.content;
   if(!actual||actual.length!==product.bytes.length||!actual.every((value,index)=>value===product.bytes[index]))throw Error('Produktlistan kunde inte verifieras för '+id);
  }
 }finally{await parsed.destroy();}
 if(JSON.stringify(snapshot().state)!==JSON.stringify(data))throw Error('Projektet ändrades under PDF-sparningen. Spara igen.');
 return {bytes,name:safeName(data.meta.projectName)+'-CE-test-3.pdf'};
}
function download(bytes,name,type){const url=URL.createObjectURL(new Blob([bytes],{type})),link=document.createElement('a');link.href=url;link.download=name;const host=document.querySelector('dialog[open]')||document.body;host.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),90000);}
async function savePdf(){
 if(pdfBusy)return;pdfBusy=true;const buttons=[$('ceSavePdf'),$('ceDialogSavePdf')].filter(Boolean);buttons.forEach(button=>button.disabled=true);
 try{await enqueueSave();notice('Skapar och verifierar projekt-PDF…');const result=await buildProjectPdf();download(result.bytes,result.name,'application/pdf');notice('Verifierad CE-projekt-PDF skapad.');}
 catch(error){notice('PDF kunde inte sparas: '+error.message,true);}
 finally{pdfBusy=false;buttons.forEach(button=>button.disabled=false);}
}
$('ceSavePdf').onclick=()=>void savePdf();
function validateState(value){
 const legacy=value?.format===LEGACY_FORMAT&&value?.schema===2;
 if(!value||!(legacy||value.format===FORMAT&&value.schema===VERSION)||!value.meta||typeof value.meta!=='object'||Array.isArray(value.meta)||!Array.isArray(value.doors)||value.doors.length>10000)throw Error('Välj en projekt-PDF från CE-märkning TEST 2 eller TEST 3.');
 const ids=new Set(),numbers=new Set();for(const door of value.doors){if(typeof door.id!=='string'||typeof door.sourceText!=='string'||typeof door.location!=='string'||!door.id||!door.sourceText||ids.has(door.id)||numbers.has(door.sourceText.toLowerCase()))throw Error('Projektets dörrlista är ogiltig.');ids.add(door.id);numbers.add(door.sourceText.toLowerCase());}
 const meta=value.meta;
 if(legacy){
  const joined=(postcode,city)=>[postcode,city].filter(Boolean).join(' ');
  const defaults={siteAddress:meta.address||'',sitePostalPlace:joined(meta.postalCode,meta.postalCity),customerPostalPlace:joined(meta.postalCode,meta.postalCity),companyPostalPlace:joined(meta.companyPostalCode,meta.companyPostalCity),technicianCompany:meta.company||'',technicianPhone:meta.companyPhone||''};
  value.meta={...fresh().meta,...defaults,...meta};value.format=FORMAT;value.schema=VERSION;
 }else value.meta={...fresh().meta,...meta};
 if(!value.meta._edited||typeof value.meta._edited!=='object'||Array.isArray(value.meta._edited))value.meta._edited={};
 return value;
}
$('ceOpenPdf').onchange=async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 const previous=snapshot();
 try{
  if(file.size>200*1024*1024)throw Error('Välj en PDF mindre än 200 MB.');notice('Öppnar CE-projekt…');
  const bytes=new Uint8Array(await file.arrayBuffer()),pdf=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false}),entry=pdf.catalog.get(PDFLib.PDFName.of(CATALOG));
  if(!entry)throw Error('Filen är inte en CE-projekt-PDF från TEST 3.');
  const loaded=validateState(JSON.parse(entry.decodeText()));
  module.initProject(pdf,loaded,bytes);await module.loadTemplates();
  const required=JSON.parse(pdf.catalog.get(PDFLib.PDFName.of('TillsynoSLRTestManifest'))?.decodeText()||'{}'),assets=module.assets();
  for(const cat of Object.keys(required.templates||{}))if(!assets.templates[cat])throw Error('En PDF-mall saknas i projektfilen: '+cat);
  for(const id of Object.keys(required.products||{}))if(!assets.productFiles[id])throw Error('En produktlista saknas i projektfilen.');
  state=loaded;renderMeta();renderDoors();await enqueueSave();notice('CE-projekt öppnat · '+state.doors.length+' dörrautomatiker.');
 }catch(error){state=previous.state;module.reset();module.restore(state);module.restoreAssets(previous.assets);await module.loadTemplates().catch(()=>{});renderMeta();renderDoors();notice('Kunde inte öppna filen: '+error.message,true);}
};
window.addEventListener('pagehide',()=>{if(saveRevision>savedRevision)void enqueueSave().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&saveRevision>savedRevision)void enqueueSave().catch(()=>{});});
(async()=>{try{let local=await readLocal(),migrated=false;if(!local){local=await readLocal(LEGACY_DB,true);migrated=!!local;}if(local){state=validateState(local.state);module.restore(state);module.restoreAssets(local.assets);await module.loadTemplates();if(migrated){await enqueueSave();storageStatus('TEST 2-projekt öppnat i TEST 3');}else storageStatus('Lokalt projekt återöppnat · TEST 3');}else storageStatus('TEST 3 · nytt CE-projekt');}catch(error){storageStatus('Lokal återöppning misslyckades.');notice(error.message,true);}finally{renderMeta();renderDoors();startupControls.forEach(control=>control.disabled=false);}})();
if('serviceWorker' in navigator){
 for(const scope of ['project-ce-markning-test.html','project-ce-markning-test-v3.html'])navigator.serviceWorker.register('project-ce-markning-test-v3-sw.js',{scope}).catch(error=>console.warn('CE-cache kunde inte förberedas',error));
}
})();
