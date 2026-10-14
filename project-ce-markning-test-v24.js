(function(){
'use strict';
function ceKeepAppZoom(event){if(event.cancelable&&(event.type.startsWith('gesture')||(event.touches?.length||0)>1))event.preventDefault();}
for(const type of ['touchstart','touchmove','gesturestart','gesturechange'])document.addEventListener(type,ceKeepAppZoom,{capture:true,passive:false});

const VERSION=24,FORMAT='Tillsyno CE-märkning TEST 24',LEGACY_FORMAT='Tillsyno CE-märkning TEST 2',DB='tillsyno-ce-markning-test-v7',LEGACY_DB='tillsyno-ce-markning-test-v6',OLDER_DB='tillsyno-ce-markning-test-v5',EARLIEST_DB='tillsyno-ce-markning-test-v4',OLDEST_DB='tillsyno-ce-markning-test-v3',FIRST_DB='tillsyno-ce-markning-test-v2',KEY='active',CATALOG='TillsynoCETestData';
const $=id=>document.getElementById(id),module=window.TillsynoCETest;
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const fresh=()=>({format:FORMAT,schema:VERSION,meta:{projectName:'',objectNo:'',siteAddress:'',sitePostalPlace:'',customer:'',address:'',customerPostalPlace:'',contact:'',phone:'',company:'',companyAddress:'',companyPostalPlace:'',companyOrgNo:'',companyContact:'',companyPhone:'',slrAuthorisation:'',order:'',technician:'',technicianCompany:'',technicianPhone:'',date:new Date().toLocaleDateString('sv-SE'),installationDate:'',documentationName:'',documentationAddress:'',documentationPostalPlace:'',egSignerName:'',egSignerTitle:'',egPlace:'',egDate:'',_edited:{}},doors:[],selected:null,slrTestData:null});
let state=fresh(),editing=null,noticeTimer=0,saveTimer=0,saveRevision=0,savedRevision=0,writeQueue=Promise.resolve(),pdfBusy=false,accountId='';
function updateProjectSignStatus(){const label=$('ceProjectSignStatus');if(label)label.textContent=module.getProjectSignature()?'Projektunderskrift sparad · används i underskriftsrutor på alla dörrar':'Ingen projektunderskrift sparad';}
function openProjectSignature(){
 const d=document.createElement('dialog');d.style.cssText='width:min(600px,94vw);border:1px solid #8eafc0;border-radius:12px;padding:16px;background:#fff;color:#17394c';
 const heading=document.createElement('h3');heading.textContent='Projektunderskrift';d.append(heading);
 const tip=document.createElement('p');tip.textContent='Skriv en gång. Underskriften förs över till dokumenten för både Med glas och Utan glas. I Egenkontroll signeras bara valda kontrollpunkter.';d.append(tip);
 const canvas=document.createElement('canvas');canvas.width=700;canvas.height=200;canvas.style.cssText='display:block;width:100%;height:160px;background:white;border:1px solid #aec8d6;touch-action:none';
 const ctx=canvas.getContext('2d');ctx.lineWidth=3;ctx.strokeStyle='#183e57';ctx.lineJoin='round';ctx.lineCap='round';
 let down=false,hasInk=false,prev;const pos=e=>{const box=canvas.getBoundingClientRect();return [(e.clientX-box.left)*canvas.width/box.width,(e.clientY-box.top)*canvas.height/box.height]};
 canvas.addEventListener('pointerdown',e=>{down=true;prev=pos(e);canvas.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...prev);ctx.lineTo(prev[0]+.1,prev[1]+.1);ctx.stroke();hasInk=true;e.preventDefault();});
 canvas.addEventListener('pointermove',e=>{if(!down)return;const next=pos(e);ctx.beginPath();ctx.moveTo(...prev);ctx.lineTo(...next);ctx.stroke();prev=next;e.preventDefault();});
 canvas.addEventListener('pointerup',()=>down=false);canvas.addEventListener('pointercancel',()=>down=false);d.append(canvas);
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;margin-top:12px;flex-wrap:wrap';
 for(const [label,fn] of [['Rensa',()=>{ctx.clearRect(0,0,canvas.width,canvas.height);hasInk=false;}],['Avbryt',()=>d.close()],['Spara underskrift',()=>{if(!hasInk)return notice('Skriv din underskrift först.',true);module.setProjectSignature(canvas.toDataURL('image/png'));updateProjectSignStatus();d.close();notice('Projektunderskrift sparad. Underskriftsrutorna använder nu denna signatur på alla dörrar; Egenkontroll följer valda punkter.');}]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;actions.append(b)}
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
function snapshot(){state.slrTestData=module.payload();for(const door of state.doors)door.type=state.slrTestData.doorProfiles?.[door.id]||door.type;return {state:structuredClone(state),assets:structuredClone(module.assets())};}
function openDb(name=accountDb(),existingOnly=false){return new Promise((resolve,reject)=>{let absent=false;const request=indexedDB.open(name,1);request.onupgradeneeded=()=>{if(existingOnly){absent=true;request.transaction.abort();}else request.result.createObjectStore('projects');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>absent?resolve(null):reject(request.error);});}
async function readLocal(name=accountDb(),existingOnly=false){const db=await openDb(name,existingOnly);if(!db)return null;try{return await new Promise((resolve,reject)=>{const tx=db.transaction('projects'),request=tx.objectStore('projects').get(KEY);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});}finally{db.close();}}
async function writeLocal(data){const db=await openDb(accountDb());try{await new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(data,KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Sparningen avbröts.'));});}finally{db.close();}}
function enqueueSave(){
 clearTimeout(saveTimer);const revision=saveRevision,data=snapshot();
 const operation=writeQueue.catch(()=>{}).then(()=>writeLocal(data));writeQueue=operation;
 operation.then(()=>{savedRevision=Math.max(savedRevision,revision);if(savedRevision===saveRevision)storageStatus('Sparat lokalt · TEST 24');}).catch(error=>{storageStatus('Kunde inte spara lokalt.');notice('Sparningen misslyckades: '+error.message,true);});
 return operation;
}
function save(){saveRevision++;storageStatus('Sparar lokalt…');clearTimeout(saveTimer);saveTimer=setTimeout(enqueueSave,250);}
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
function renderMeta(){syncSharedProjectMeta();updateProjectSignStatus();for(const input of document.querySelectorAll('[data-meta]'))input.value=state.meta[input.dataset.meta]||'';const caption=$('ceProjectCaption');if(caption){caption.textContent=[state.meta.projectName,state.meta.technician].filter(Boolean).join(' · ');caption.title=caption.textContent;}}
function setProjectField(key,value){
 const allowed=new Set(Array.from(document.querySelectorAll('[data-meta]')).map(input=>input.dataset.meta));if(!allowed.has(key))return;
 if(state.meta[key]===value&&state.meta._edited?.[key]===true)return;
 state.meta[key]=value;state.meta._edited=state.meta._edited||{};state.meta._edited[key]=true;syncSharedProjectMeta();
 for(const door of state.doors)module.invalidateDoor(door);
 renderMeta();save();renderDoors();
 if(key==='objectNo'&&!editing){$('ceDoorObject').value=value;syncDoorForm(false);}
}
function setDoorMachineField(door,field,value){if(!state.doors.some(entry=>entry===door)||!['model','manufacturer'].includes(field))return;door[field]=String(value);if(field==='model'){const detected=window.TillsynoCEModels.resolve('',value);if(detected.brand)door.manufacturer=detected.brand;}module.invalidateDoor(door);save();renderDoors();}
function renderDoors(){
 const root=$('ceDoorList');root.replaceChildren();$('ceDoorTotal').textContent=state.doors.length+' st';$('ceEmpty').hidden=!!state.doors.length;
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
function nextCount(objectNo,code){const existing=state.doors.filter(door=>door.objectNo===objectNo&&door.modelCode===code).map(door=>Number(door.serialNumber)).filter(Number.isFinite);return Math.max(0,...existing)+1;}
function doorCode(){return $('ceDoorCode').value==='custom'?$('ceDoorCustomCode').value.trim():$('ceDoorCode').value;}
function syncDoorForm(useModel=true){const code=doorCode(),objectNo=$('ceDoorObject').value.trim();$('ceDoorCustomCode').hidden=$('ceDoorCode').value!=='custom';if(!editing&&!countTouched)$('ceDoorCount').value=String(nextCount(objectNo,code));$('ceDoorNumber').value=[objectNo,code,$('ceDoorCount').value].filter(Boolean).join('-');if(useModel){const model=window.TillsynoCEModels.resolve(code);$('ceDoorModel').value=model.model;$('ceDoorBrand').value=model.brand;}}
function resetForm(){editing=null;countTouched=false;$('ceDoorForm').reset();$('ceDoorObject').value=state.meta.objectNo||'';$('ceDoorCode').value=current()?.modelCode||'24';if(!$('ceDoorCode').value)$('ceDoorCode').value='24';syncDoorForm();$('ceDoorSubmit').textContent='Lägg till';$('ceDoorForm').hidden=true;}
function editDoor(door){editing=door.id;countTouched=true;$('ceDoorObject').value=door.objectNo||'';$('ceDoorCode').value=door.modelCode||'custom';if(!$('ceDoorCode').value)$('ceDoorCode').value='custom';$('ceDoorCustomCode').value=door.modelCode||'';$('ceDoorCount').value=door.serialNumber||1;$('ceDoorLocation').value=door.location;$('ceDoorType').value=profileType(door);syncDoorForm(false);const machine=window.TillsynoCEModels.resolve(door.modelCode,door.model,door.manufacturer);$('ceDoorModel').value=machine.model;$('ceDoorBrand').value=machine.brand;$('ceDoorSubmit').textContent='Spara';$('ceDoorForm').hidden=false;}
function manualDoor(number,location,type,id=uid()){
 const match=number.match(/^(.*)-(\d+)-(\d+)$/),modelCode=match?.[2]||'';
 const machine=window.TillsynoCEModels.resolve(modelCode);return {id,sourceText:number,objectNo:match?.[1]||number,modelCode,serialNumber:match?.[3]||'',model:machine.model,manufacturer:machine.brand,location,type};
}
$('ceAddToggle').onclick=()=>{if(!$('ceDoorForm').hidden){resetForm();return;}resetForm();$('ceDoorForm').hidden=false;$('ceDoorCode').focus();};
for(const id of ['ceDoorObject','ceDoorCustomCode'])$(id).addEventListener('input',()=>syncDoorForm(false));
$('ceDoorCode').addEventListener('change',()=>syncDoorForm());$('ceDoorCount').addEventListener('input',()=>{countTouched=true;syncDoorForm(false);});
$('ceDoorModel').addEventListener('input',()=>{const machine=window.TillsynoCEModels.resolve('',$('ceDoorModel').value);if(machine.brand)$('ceDoorBrand').value=machine.brand;});
$('ceDoorCancel').onclick=resetForm;
$('ceDoorForm').onsubmit=async event=>{
 event.preventDefault();syncDoorForm(false);const number=$('ceDoorNumber').value.trim(),location=$('ceDoorLocation').value.trim(),type=$('ceDoorType').value;
 if(!$('ceDoorObject').value.trim()||!/^\d+$/.test(doorCode())||!Number.isSafeInteger(Number($('ceDoorCount').value))||Number($('ceDoorCount').value)<1||!location)return notice('Fyll i objektnummer, maskintyp, antal och placering.',true);
 if(state.doors.some(door=>door.id!==editing&&door.sourceText.toLowerCase()===number.toLowerCase()))return notice('Automatiknumret finns redan.',true);
 let door;
 const model=$('ceDoorModel').value.trim(),manufacturer=$('ceDoorBrand').value.trim();
 if(editing){door=state.doors.find(entry=>entry.id===editing);if(!door)return;const changed=door.sourceText!==number||door.location!==location||profileType(door)!==type||door.model!==model||door.manufacturer!==manufacturer;if(changed)module.invalidateDoor(door);Object.assign(door,manualDoor(number,location,type,door.id));}
 else{door=manualDoor(number,location,type);state.doors.push(door);}
 door.model=model;door.manufacturer=manufacturer;
 module.assignProfile(door,type);state.selected=door.id;resetForm();save();renderDoors();await openDoor(door);
};
for(const input of document.querySelectorAll('[data-meta]'))input.addEventListener('change',()=>setProjectField(input.dataset.meta,input.value));
$('ceSaveLocal').onclick=()=>void enqueueSave().then(()=>notice('Sparat lokalt på denna enhet.')).catch(()=>{});

async function buildProjectPdf(){
 const data=snapshot().state,assets=module.assets(),pdf=await PDFLib.PDFDocument.create(),font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
 let page=pdf.addPage([595.28,841.89]),y=795;
 page.drawText('CE-markning TEST 24',{x:40,y,size:18,font});y-=26;
 const drawLine=text=>{if(y<45){page=pdf.addPage([595.28,841.89]);y=795;}page.drawText(String(text).replace(/[^\u0020-\u00ff]/g,'?').slice(0,90),{x:40,y,size:10,font});y-=16;};
 drawLine(data.meta.projectName||'CE-projekt');drawLine(data.meta.customer||'');y-=12;
 for(const door of data.doors){drawLine(door.sourceText+' | '+door.location+' | '+(door.type==='glass'?'Med glas':'Utan glas'));drawLine(module.getProgress(door)+' %');}
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
 return {bytes,name:safeName(data.meta.projectName)+'-CE-test-7.pdf'};
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
 const sourceSchema=value?.schema;
 const legacy=value?.format===LEGACY_FORMAT&&value?.schema===2;
 const previous=Number.isInteger(value?.schema)&&value.schema>=3&&value.schema<VERSION&&value?.format==='Tillsyno CE-märkning TEST '+value.schema;
 if(!value||!(legacy||previous||value.format===FORMAT&&value.schema===VERSION)||!value.meta||typeof value.meta!=='object'||Array.isArray(value.meta)||!Array.isArray(value.doors)||value.doors.length>10000)throw Error('Välj en projekt-PDF från CE-märkning TEST 2–7.');
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
 try{
  if(file.size>200*1024*1024)throw Error('Välj en PDF mindre än 200 MB.');notice('Öppnar CE-projekt…');
  const bytes=new Uint8Array(await file.arrayBuffer()),pdf=await PDFLib.PDFDocument.load(bytes.slice(),{ignoreEncryption:true,updateMetadata:false}),entry=pdf.catalog.get(PDFLib.PDFName.of(CATALOG));
  if(!entry)throw Error('Filen är inte en CE-projekt-PDF från TEST 2–7.');
  const loaded=validateState(window.TillsynoCEStorage.read(pdf,CATALOG));
  module.initProject(pdf,loaded,bytes);await module.loadTemplates();
  const required=pdf.catalog.get(PDFLib.PDFName.of('TillsynoSLRTestManifest'))?window.TillsynoCEStorage.read(pdf,'TillsynoSLRTestManifest'):{},assets=module.assets();
  for(const cat of Object.keys(required.templates||{}))if(!assets.templates[cat])throw Error('En PDF-mall saknas i projektfilen: '+cat);
  for(const id of Object.keys(required.products||{}))if(!assets.productFiles[id])throw Error('En produktlista saknas i projektfilen.');
  state=loaded;syncSharedProjectMeta();renderMeta();renderDoors();await enqueueSave();notice('CE-projekt öppnat · '+state.doors.length+' dörrautomatiker.');
 }catch(error){state=previous.state;module.reset();module.restore(state);module.restoreAssets(previous.assets);await module.loadTemplates().catch(()=>{});renderMeta();renderDoors();notice('Kunde inte öppna filen: '+error.message,true);}
};
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
   storageStatus('Ditt lokala CE-projekt återöppnat · TEST 24');
  }else{
   storageStatus('Nytt CE-projekt · TEST 24');
  }
 }catch(error){storageStatus('Lokal återöppning misslyckades.');notice(error.message,true);}
 finally{renderMeta();renderDoors();if(accountId)startupControls.forEach(control=>control.disabled=false);}
})();
if('serviceWorker' in navigator){
 for(const scope of ['project-ce-markning-test.html','project-ce-markning-test-v7.html'])navigator.serviceWorker.register('project-ce-markning-test-v24-sw.js',{scope}).catch(error=>console.warn('CE-cache kunde inte förberedas',error));
}
})();
