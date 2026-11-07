/* Selected CE documents as individual files at the ZIP root. No project mutations. */
(function(){
'use strict';
const $=id=>document.getElementById(id),api=window.TillsynoCETest;
let context=null,ready=null,busy=false,sharing=false,returnFocus=null;
const designation=door=>[door.objectNo,door.modelCode,door.serialNumber].every(v=>String(v??'').trim())?[door.objectNo,door.modelCode,door.serialNumber].join('-'):String(door.sourceText||door.objectNo||door.id);
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const inputs=group=>[...$(group).querySelectorAll('input:checked')];
const message=(text,error=false)=>{const e=$('ceFilesStatus');e.textContent=text;e.classList.toggle('is-error',error);};
function invalidate(){
 ready=null;$('ceFilesDownload').disabled=true;$('ceFilesShare').disabled=true;
 const doors=inputs('ceFilesDoors').length,types=inputs('ceFilesTypes').length;
 $('ceFilesCount').textContent=doors+' dörrar × '+types+' dokument = '+doors*types+' filer';
 $('ceFilesBuild').disabled=busy||!doors||!types;
 message('Välj dörrar och dokument. Filerna läggs direkt i ZIP-filen, utan undermappar.');
}
function currentFile(){
 if(!ready)return null;
 if(ready.revision!==api.fileExportRevision(context)){invalidate();message('Projektet har ändrats. Skapa ZIP-filen igen för att få med aktuella uppgifter.',true);return null;}
 return ready.file;
}
function download(file){
 const url=URL.createObjectURL(file),link=node('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
// A positive canShare result does not guarantee that the OS accepts this ZIP.
// Keep the completed file and use the same download for preflight and share failures.
function shareZip(file,downloadFile,title='CE-dokument'){
 const cancelled=()=>({kind:'cancelled',message:'Delningen avbröts. ZIP-filen finns kvar här.'});
 const fallback=()=>{downloadFile(file);return {kind:'downloaded',message:'Direktdelningen kunde inte öppnas. ZIP-filen hämtas: '+file.name+'. Bifoga filen i mejl från Hämtade filer.'};};
 const recover=error=>error?.name==='AbortError'?cancelled():fallback();
 let supported=false;
 try{supported=typeof navigator.share==='function'&&(typeof navigator.canShare!=='function'||navigator.canShare({files:[file]}));}catch(_){supported=false;}
 if(!supported)return Promise.resolve(fallback());
 let pending;
 // Invoke sharing in the original click, before waiting for any other work.
 try{pending=navigator.share({files:[file],title});}catch(error){return Promise.resolve(recover(error));}
 return Promise.resolve(pending).then(()=>({kind:'shared',message:'ZIP-filen lämnad till delningsmenyn.'}),recover);
}
function setup(){
 if($('ceFileExport'))return;
 const panel=node('section');panel.id='ceFileExport';panel.hidden=true;panel.className='ceFileExport';panel.setAttribute('aria-labelledby','ceFilesHeading');
 panel.innerHTML='<header><h3 id="ceFilesHeading" tabindex="-1">Spara valda filer (ZIP)</h3><button id="ceFilesClose" type="button" aria-label="Stäng filexport">Stäng ×</button></header><p>Välj bara de dörrar och dokument du behöver. Exporten ändrar inte dörrarnas granskningsstatus.</p><div class="ceFilesColumns"><fieldset><legend>1. Dörrar</legend><div class="ceFilesSelect"><button id="ceFilesAll" type="button">Välj alla</button><button id="ceFilesNone" type="button">Avmarkera alla</button></div><div id="ceFilesDoors" class="ceFilesChoices"></div></fieldset><fieldset><legend>2. Dokument</legend><div id="ceFilesTypes" class="ceFilesChoices"></div><small>Valda dokument måste finnas för varje vald dörr. CE-skylt sparas i sitt befintliga filformat.</small></fieldset></div><strong id="ceFilesCount" aria-live="polite"></strong><p id="ceFilesStatus" role="status" aria-live="polite"></p><footer><button id="ceFilesBuild" type="button" class="cePrimary">Skapa ZIP</button><button id="ceFilesDownload" type="button" disabled>Spara ZIP</button><button id="ceFilesShare" type="button" disabled>Dela ZIP</button></footer>';
 $('ceDoorForm').before(panel);
 $('ceFilesClose').onclick=()=>{if(busy)return;panel.hidden=true;ready=null;returnFocus?.focus();};
 for(const [id,value] of [['ceFilesAll',true],['ceFilesNone',false]])$(id).onclick=()=>{for(const input of $('ceFilesDoors').querySelectorAll('input'))input.checked=value;invalidate();};
 $('ceFilesBuild').onclick=async()=>{
  if(busy)return;
  const ids=new Set(inputs('ceFilesDoors').map(input=>input.value));
  const selected=(context?.getItems?.()||[]).filter(door=>ids.has(door.id));
  const types=inputs('ceFilesTypes').map(input=>input.value);
  busy=true;invalidate();panel.setAttribute('aria-busy','true');
  for(const control of panel.querySelectorAll('input,button'))control.disabled=true;
  try{
   const result=await api.buildFileArchive(selected,types,context,(index,total,name)=>message(index+' / '+total+' · '+name));
   ready={file:new File([result.bytes],result.name,{type:'application/zip'}),revision:result.revision};
   message('ZIP klar · '+result.files+' filer · '+(result.bytes.byteLength/1048576).toFixed(2).replace('.',',')+' MB.');
  }catch(error){ready=null;message('Kunde inte skapa ZIP: '+error.message,true);}
  finally{
   busy=false;panel.removeAttribute('aria-busy');
   for(const control of panel.querySelectorAll('input,button'))control.disabled=false;
   $('ceFilesDownload').disabled=!ready;$('ceFilesShare').disabled=!ready;
   $('ceFilesBuild').disabled=!inputs('ceFilesDoors').length||!inputs('ceFilesTypes').length;
  }
 };
 $('ceFilesDownload').onclick=()=>{const file=currentFile();if(file){download(file);message('ZIP-filen sparas: '+file.name);}};
 $('ceFilesShare').onclick=async()=>{
  if(sharing)return;
  try{
   const file=currentFile();if(!file)return;
   sharing=true;$('ceFilesShare').disabled=true;
   const result=await shareZip(file,download);
   if(ready?.file===file)message(result.message);
  }catch(error){message('Kunde inte dela eller hämta ZIP: '+error.message+'. Använd Spara ZIP för att försöka igen.',true);}
  finally{sharing=false;$('ceFilesShare').disabled=!ready||busy;}
 };
}
function open(bridge){
 if(busy)return;
 setup();context=bridge;returnFocus=$('ceDocumentActions')?.querySelector('summary');
 const doors=bridge?.getItems?.()||[];
 $('ceFilesDoors').replaceChildren();$('ceFilesTypes').replaceChildren();
 for(const door of doors){
  const label=node('label'),input=node('input'),text=node('span',designation(door));input.type='checkbox';input.value=door.id;input.checked=true;input.onchange=invalidate;
  text.append(node('small',door.location||''));label.append(input,text);$('ceFilesDoors').append(label);
 }
 if(!doors.length)$('ceFilesDoors').append(node('p','Det finns inga dörrar i projektet ännu.'));
 for(const type of api.getFileExportTypes()){
  const label=node('label'),input=node('input');input.type='checkbox';input.value=type.category;input.checked=['Loggbok','Tillverkarens försäkran','Egenkontroll'].includes(type.category);input.onchange=invalidate;
  label.append(input,node('span',type.label));$('ceFilesTypes').append(label);
 }
 invalidate();$('ceFileExport').hidden=false;$('ceDocumentActions').open=false;
 $('ceFileExport').scrollIntoView({block:'start'});$('ceFilesHeading').focus({preventScroll:true});
}
window.TillsynoCEFileExport={open,shareZip};
})();
