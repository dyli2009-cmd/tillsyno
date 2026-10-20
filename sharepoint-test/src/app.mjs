import {PublicClientApplication,InteractionRequiredAuthError} from '@azure/msal-browser';
import {SharePointFiles,accepts} from './file-client.mjs';
import {SharePointWriter,validateCopyName} from './write-client.mjs';
import {installExportBridge} from './export-bridge.mjs';
import {createSourceBinding} from './source-binding.mjs';
import {filePickerMarkup,savePickerMarkup,setButtonLabel,icon} from './ui.mjs';
import {MAX_FILE_BYTES,MAX_FILE_MB,MAX_SELECTION_BYTES,MAX_SELECTION_MB} from './limits.mjs';
const moduleName=document.body.dataset.sharepointModule||null;
const sourceBinding=createSourceBinding({window});
const READ_SCOPES=['https://graph.microsoft.com/Sites.Read.All'];
const WRITE_SCOPES=['https://graph.microsoft.com/Files.ReadWrite.All'];
let initPromise,msal,config,account,client,root,stack=[],items=[],selected=new Set(),target=null,bypass=false,busy=false,op=0;
let currentUserId='',readController=null;
const rootStore=(()=>{try{return window.localStorage;}catch{return null;}})();
const getContextKey=()=>account&&currentUserId?accountKey(account)+'/'+currentUserId:'';
let pendingSave=null,saveBusy=false,saveRoot=null,saveStack=[],saveFolderReady=false,writeAccountKey='';
const dialog=document.createElement('dialog');dialog.id='spFilePicker';
dialog.setAttribute('aria-labelledby','spFileTitle');
dialog.innerHTML=filePickerMarkup();
document.body.append(dialog);
const $=id=>dialog.querySelector('#'+id);
const status=(text,state='')=>{$('spStatus').textContent=text;$('spStatus').dataset.state=state;};
function locked(){return document.documentElement.hasAttribute('data-read-locked');}
async function gate(){
 if(locked())throw Error('Lås upp Avläsning med din vanliga kod först.');
 const auth=window.TillsynoAuth;if(!auth)throw Error('Tillsyno-inloggningen saknas.');
 const access=await auth.verify({allowOffline:false});
 if(access.role!=='admin'||!auth.permitted(access,moduleName))throw Error('Endast behörig administratör får använda detta test.');
 currentUserId=access.userId;
 if(account)sourceBinding.setIdentity({accountKey:accountKey(account),userId:access.userId});
 return access.userId;
}
function validAccount(value){if(!value||value.tenantId?.toLowerCase()!==config.tenantId.toLowerCase())throw Error('Använd Microsoft-kontot i den separata testorganisationen Tillsyno.');return value;}
function accountKey(value){validAccount(value);if(!value.homeAccountId)throw Error('Microsoft-kontot kunde inte identifieras. Anslut igen.');return value.tenantId.toLowerCase()+'/'+value.homeAccountId;}
async function tokenFor(scopes){
 const expected=accountKey(account);
 const response=await msal.acquireTokenSilent({account,scopes});
 if(accountKey(response.account)!==expected||accountKey(account)!==expected)throw Error('Microsoft-kontot ändrades. Försök igen.');
 return response.accessToken;
}
async function initialize(){
 if(!initPromise)initPromise=(async()=>{
  const r=await fetch('sharepoint-test/auth-config.json',{cache:'no-store'});if(!r.ok)throw Error('SharePoint-inställningarna kunde inte läsas.');config=await r.json();
  if(!config.pilot.readOnly||JSON.stringify(config.graphScopes)!==JSON.stringify(READ_SCOPES))throw Error('Inställningen för filöppning är ogiltig.');
  if(new URL(config.msal.auth.redirectUri).origin!==location.origin)throw Error('Öppna testet på den publicerade adressen.');
  msal=new PublicClientApplication({auth:{...config.msal.auth},cache:{cacheLocation:'sessionStorage'},system:{loggerOptions:{piiLoggingEnabled:false,loggerCallback:()=>{}}}});await msal.initialize();
  const allowedAccounts=msal.getAllAccounts().filter(a=>a.tenantId?.toLowerCase()===config.tenantId.toLowerCase());
  const activeAccount=msal.getActiveAccount();
  account=activeAccount?.tenantId?.toLowerCase()===config.tenantId.toLowerCase()?activeAccount:allowedAccounts.length===1?allowedAccounts[0]:null;
  client=new SharePointFiles({getToken:()=>tokenFor(READ_SCOPES),rootStore,getContextKey});
 })().catch(e=>{initPromise=null;throw e;});
 return initPromise;
}
function controls(){
 for(const button of dialog.querySelectorAll('button'))button.disabled=busy;
 if(readController)dialog.querySelector('.spClose').disabled=false;
 $('spConnect').disabled=busy||!msal;
 setButtonLabel($('spConnect'),account?'Byt konto':'Anslut Microsoft','cloud');
 $('spImport').disabled=busy||!selected.size;
 $('spReload').hidden=!account;$('spDisconnect').hidden=!account;
 $('spAccount').textContent=account?.username||'Använd bara den separata Microsoft-testorganisationen.';
}
async function run(fn){
 if(busy)return;busy=true;controls();const current=op;
 try{const user=await gate();await initialize();if(current!==op)return;await fn(current,user);}
 catch(e){if(current===op)status(e instanceof InteractionRequiredAuthError?'Klicka på Anslut Microsoft för att förnya inloggningen.':e?.errorCode?'Microsoft-inloggning: '+String(e.errorCode).replace(/[^a-z0-9_-]/gi,''):e.message||'Filen kunde inte öppnas.','error');}
 finally{busy=false;controls();}
}
function render(){
 $('spCrumbs').replaceChildren();stack.forEach((folder,index)=>{const b=document.createElement('button');b.type='button';b.textContent=folder.name;b.onclick=()=>void run(async current=>{stack=stack.slice(0,index+1);await list(current);});$('spCrumbs').append(b);});
 $('spFiles').replaceChildren();let count=0;
 for(const item of items){
  if(!item.folder&&(!item.file||!accepts(item.name,target.accept)))continue;count++;
  const li=document.createElement('li');
  if(item.folder){const b=document.createElement('button');b.type='button';setButtonLabel(b,item.name,'folder');b.onclick=()=>void run(async current=>{stack.push({id:item.id,name:item.name});await list(current);});li.append(b);}
  else{const label=document.createElement('label'),check=document.createElement('input');check.type=target.multiple?'checkbox':'radio';check.name='spSelection';check.value=item.id;check.checked=selected.has(item.id);check.disabled=item.size>MAX_FILE_BYTES;
   check.onchange=()=>{if(!target.multiple)selected.clear();check.checked?selected.add(item.id):selected.delete(item.id);controls();};
   const fileIcon=document.createElement('span');fileIcon.innerHTML=icon('file');
   const info=document.createElement('span'),name=document.createElement('span'),meta=document.createElement('small');
   info.className='spFileInfo';name.className='spFileName';meta.className='spFileMeta';
   name.textContent=item.name;meta.textContent=(item.size/1048576).toFixed(1)+' MB'+(check.disabled?' · över '+MAX_FILE_MB+' MB':'');info.append(name,meta);
   label.append(check,fileIcon,info);li.append(label);}
  $('spFiles').append(li);
 }
 status(count?'Välj fil'+(target.multiple?'er':'')+' och tryck Öppna i appen.':'Inga passande filer i denna mapp.');controls();
}
async function list(current){
 selected.clear();items=[];$('spFiles').replaceChildren();status('Hämtar filer från SharePoint…');
 const trail=await client.folderTrail(root,stack.at(-1).id);if(current!==op)return;
 const result=await client.children(root.driveId,trail.at(-1).id);if(current!==op)return;
 stack=trail;
 items=result.sort((a,b)=>Number(!!b.folder)-Number(!!a.folder)||a.name.localeCompare(b.name,'sv'));render();
}
async function start(current){root=await client.root(config.pilot);if(current!==op)return;stack=[{id:root.id,name:root.name}];await list(current);}
async function refresh(current){
 const folderId=stack.at(-1)?.id;
 selected.clear();items=[];$('spFiles').replaceChildren();
 const nextRoot=await client.root(config.pilot);if(current!==op)return;
 root=nextRoot;stack=[{id:folderId||root.id,name:root.name}];await list(current);
}
function loginFromClick(){
 let promise;try{promise=msal.loginPopup({scopes:READ_SCOPES,prompt:'select_account'});}catch(error){promise=Promise.reject(error);}
 // A failed access recheck may stop the operation before it awaits the popup.
 promise.catch(()=>{});return promise;
}
$('spConnect').onclick=()=>{
 if(busy||!msal)return;const login=loginFromClick();
 void run(async (current,user)=>{const response=await login;if(current!==op)return;account=validAccount(response.account);writeAccountKey='';sourceBinding.setIdentity({accountKey:accountKey(account),userId:user});msal.setActiveAccount(account);await start(current);});
};
$('spReload').onclick=()=>void run(refresh);
$('spDisconnect').onclick=()=>void run(async()=>{await msal.clearCache({account});account=null;writeAccountKey='';sourceBinding.setIdentity({accountKey:null,userId:null});root=null;items=[];stack=[];selected.clear();$('spFiles').replaceChildren();$('spCrumbs').replaceChildren();status('Microsoft-testkontot är frånkopplat i denna flik.');});
$('spLocal').onclick=()=>{const input=target;dialog.close();bypass=true;try{input.click();}finally{bypass=false;}};
$('spImport').onclick=()=>void run(async(current,user)=>{
 const input=target,chosen=items.filter(i=>selected.has(i.id));
 if(!chosen.length||(!input.multiple&&chosen.length!==1))throw Error('Välj rätt antal filer.');
 if(chosen.reduce((sum,f)=>sum+(f.size||0),0)>MAX_SELECTION_BYTES)throw Error('Välj högst '+MAX_SELECTION_MB+' MB åt gången.');
 const files=[],sources=[],expectedAccount=accountKey(account),folderLabel=stack.map(folder=>folder.name).join(' / ');let bytes=0;
 const controller=new AbortController();readController=controller;controls();$('spReadProgress').hidden=false;
 try{for(let i=0;i<chosen.length;i++){
  $('spReadProgress').value=0;
  status('Hämtar '+(i+1)+'/'+chosen.length+': '+chosen[i].name);
  const opened=await client.fileWithSource(root.driveId,chosen[i].id,input.accept,{signal:controller.signal,onProgress:progress=>{
   if(current!==op||controller.signal.aborted)return;
   const percent=progress.total?Math.min(100,Math.floor(progress.loaded/progress.total*100)):0;
   $('spReadProgress').value=percent;status('Hämtar '+(i+1)+'/'+chosen.length+' · '+percent+' % · '+chosen[i].name);
  }});if(current!==op)return;
  bytes+=opened.file.size;if(bytes>MAX_SELECTION_BYTES)throw Error('Filerna överstiger '+MAX_SELECTION_MB+' MB.');
  files.push(opened.file);sources.push({...opened.source,accountKey:expectedAccount,userId:user,folderLabel});
 }}finally{if(readController===controller)readController=null;$('spReadProgress').hidden=true;}
 if(await gate()!==user||accountKey(account)!==expectedAccount)throw Error('Inloggningen ändrades. Öppna filväljaren igen.');
 if(current!==op||!input.isConnected)return;
 status('Kontrollerar projektfilen…');await sourceBinding.observeImport(input,files,sources);
 if(current!==op||!input.isConnected||accountKey(account)!==expectedAccount)return;
 const transfer=new DataTransfer();files.forEach(f=>transfer.items.add(f));input.files=transfer.files;
 dialog.close();input.dispatchEvent(new Event('change',{bubbles:true}));
});
dialog.addEventListener('close',()=>{op++;readController?.abort();selected.clear();items=[];$('spFiles').replaceChildren();$('spCrumbs').replaceChildren();$('spReadProgress').hidden=true;});
document.addEventListener('click',event=>{
 const input=event.target;
 if(!(input instanceof HTMLInputElement)||input.type!=='file'||bypass)return;
 event.preventDefault();event.stopImmediatePropagation();if(locked()||busy||pendingSave)return;
 target=input;op++;selected.clear();items=[];stack=[];$('spReadProgress').hidden=true;status('Välj den här enheten eller anslut Microsoft.');controls();dialog.showModal();
 void run(async current=>{if(account)await start(current);});
},true);

// Only the seven explicit test copies load this adapter. The module still
// creates and verifies its own exported bytes before choosing a destination.
const saveDialog=document.createElement('dialog');saveDialog.id='spSavePicker';
saveDialog.setAttribute('aria-labelledby','spSaveTitle');
saveDialog.innerHTML=savePickerMarkup();
document.body.append(saveDialog);
const saveResult=document.createElement('aside');saveResult.id='spSaveResult';saveResult.hidden=true;saveResult.setAttribute('role','status');saveResult.setAttribute('aria-live','polite');document.body.append(saveResult);
const s=id=>saveDialog.querySelector('#'+id);
const saveStatus=(text,state='')=>{s('spSaveStatus').textContent=text;s('spSaveStatus').dataset.state=state;};
function showSaveResult(text,item){
 saveResult.replaceChildren(document.createTextNode(text));saveResult.hidden=false;
 if(item?.webUrl){
  try{const url=new URL(item.webUrl),site=new URL(config.pilot.siteUrl);if(url.origin===site.origin&&!url.username&&!url.password){const a=document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Visa i SharePoint';saveResult.append(document.createTextNode(' '),a);}}catch{}
 }
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Stäng sparmeddelandet');close.onclick=()=>{saveResult.hidden=true;};saveResult.append(close);
}
function saveError(error){
 if(error?.code==='cancelled')return 'Överföringen stoppades. Filen finns kvar här; välj Den här enheten eller stäng rutan.'+(error.mayHaveSaved?' Filen kan ha sparats. Kontrollera målmappen innan du försöker igen.':'');
 if(error instanceof InteractionRequiredAuthError)return 'Microsoft behöver ett nytt godkännande. Klicka på Anslut Microsoft och försök igen.';
 if(error?.errorCode)return 'Microsoft-inloggning: '+String(error.errorCode).replace(/[^a-z0-9_-]/gi,'')+'. Filen finns kvar här; försök igen eller välj Den här enheten.';
 return error?.message||'Filen kunde inte sparas i SharePoint. Försök igen eller välj Den här enheten.';
}
function saveControls(){
 const value=pendingSave,updating=value?.mode==='update';
 for(const button of saveDialog.querySelectorAll('button'))button.disabled=saveBusy;
 const stopping=saveBusy&&value?.controller;
 s('spSaveCancel').disabled=saveBusy&&!value?.controller;
 setButtonLabel(s('spSaveCancel'),stopping?'Stoppa':'',stopping?'stop':'close');
 s('spSaveCancel').setAttribute('aria-label',stopping?'Stoppa överföringen och behåll filen':'Avbryt sparandet');
 s('spSaveName').disabled=saveBusy||updating;
 s('spSaveModes').hidden=!value?.info.projectExport;
 setButtonLabel(s('spSaveUpdate'),value?.info.source?'Samma fil':'Samma namn','save');
 s('spSaveUpdate').setAttribute('aria-pressed',String(!!value&&value.mode!=='copy'));
 s('spSaveCopy').setAttribute('aria-pressed',String(value?.mode==='copy'));
 s('spSaveExisting').hidden=!updating;
 s('spSaveCopyFields').hidden=updating;
 s('spSaveSubmit').disabled=saveBusy||!value||!account||!saveFolderReady||value.blob.size>MAX_FILE_BYTES;
 setButtonLabel(s('spSaveSubmit'),updating?'Spara':value?.mode==='copy'?'Spara kopia':'Spara i SharePoint','save');
 s('spSaveReload').hidden=!account||updating;
 setButtonLabel(s('spSaveConnect'),account?'Byt konto':'Anslut Microsoft','cloud');
 s('spSaveConnect').disabled=saveBusy||!msal;
 s('spSaveAccount').textContent=account?.username||'Separat Microsoft-testkonto';
}
function currentSave(value){return pendingSave===value&&saveDialog.open;}
async function checkSaveOwner(value){
 const userId=await gate();
 if(!currentSave(value))throw new DOMException('Sparandet avbröts.','AbortError');
 if(!value.info.isCurrent())throw Error('Projektet har bytts. Avbryt och spara det aktuella projektet igen.');
 if(value.userId&&value.userId!==userId)throw Error('Tillsyno-kontot ändrades. Avbryt och skapa exporten igen.');
 value.userId=userId;return userId;
}
function checkSourceAccount(value){
 const source=value.info.source;
 if(!source||source.accountKey!==accountKey(account)||source.userId!==value.userId){
  throw Error('Öppna filen med samma Microsoft- och Tillsyno-konto innan du uppdaterar den.');
 }
 return source;
}
async function syncSaveIdentity(value){
 if(!account)return;
 const key=accountKey(account)+'\n'+value.userId;
 sourceBinding.setIdentity({accountKey:accountKey(account),userId:value.userId});
 if(!value.info.isCurrent())throw Error('Projektet eller kontot har ändrats. Exportera det aktuella projektet igen.');
 if(value.info.source||value.inspectedIdentity===key)return;
 const info=await sourceBinding.inspectExport({blob:value.blob,name:value.name,context:value.context});
 if(!currentSave(value))return;
 if(!info.isCurrent())throw Error('Projektet eller kontot har ändrats. Exportera det aktuella projektet igen.');
 value.info=info;value.inspectedIdentity=key;
 if(info.source){
  if(value.mode!=='copy')value.mode='update';
  s('spSaveExistingName').textContent=info.source.name;
  s('spSaveExistingFolder').textContent=info.source.folderLabel||'Great';
  s('spSaveSummary').textContent=info.source.name+' · '+(value.blob.size/1048576).toFixed(1)+' MB';
 }
}
async function saveRun(fn){
 if(saveBusy||!pendingSave)return;
 const value=pendingSave;saveBusy=true;saveControls();
 try{await checkSaveOwner(value);await initialize();if(!currentSave(value))return;await syncSaveIdentity(value);if(!currentSave(value))return;await fn(value);}
 catch(error){if(currentSave(value)){saveStatus(saveError(error),'error');showSaveResult('Inte sparad i SharePoint. '+saveError(error));}}
 finally{saveBusy=false;saveControls();}
}
async function saveList(value){
 saveFolderReady=false;saveStatus('Hämtar mappar…');s('spSaveFolders').replaceChildren();
 const trail=await client.folderTrail(saveRoot,saveStack.at(-1).id);if(!currentSave(value))return;
 const folders=await client.children(saveRoot.driveId,trail.at(-1).id);
 if(!currentSave(value))return;
 saveStack=trail;
 s('spSaveCrumbs').replaceChildren();
 saveStack.forEach((folder,index)=>{const b=document.createElement('button');b.type='button';setButtonLabel(b,folder.name,index===0?'folder':null);b.onclick=()=>void saveRun(async v=>{saveStack=saveStack.slice(0,index+1);await saveList(v);});s('spSaveCrumbs').append(b);});
 for(const folder of folders.filter(i=>i.folder).sort((a,b)=>a.name.localeCompare(b.name,'sv'))){const li=document.createElement('li'),b=document.createElement('button');b.type='button';setButtonLabel(b,folder.name,'folder');b.onclick=()=>void saveRun(async v=>{saveStack.push({id:folder.id,name:folder.name});await saveList(v);});li.append(b);s('spSaveFolders').append(li);}
 saveFolderReady=true;
 saveStatus(value.blob.size>MAX_FILE_BYTES?'Över '+MAX_FILE_MB+' MB. Välj Den här enheten.':value.mode==='copy'?'En separat kopia skapas.':value.info.projectExport?'Finns filnamnet i mappen uppdateras den filen.':'Exporten sparas som en separat fil.');
}
async function saveStart(value,preferredFolderId=null){
 saveFolderReady=false;
 if(value.mode==='update')checkSourceAccount(value);
 saveRoot=await client.root(config.pilot);if(!currentSave(value))return;
 saveStack=[{id:saveRoot.id,name:saveRoot.name}];
 const source=value.info.source;
 if(value.mode==='update'){
  if(source.driveId!==saveRoot.driveId)throw Error('Filen hör till ett annat dokumentbibliotek. Öppna rätt fil igen.');
  saveStack=await client.folderTrail(saveRoot,source.parentId);if(!currentSave(value))return;
  s('spSaveExistingFolder').textContent=saveStack.map(f=>f.name).join(' / ');
  saveFolderReady=true;
  saveStatus(value.blob.size>MAX_FILE_BYTES?'Över '+MAX_FILE_MB+' MB. Välj Den här enheten.':'Dina ändringar sparas i samma fil.');
  return;
 }
 if(preferredFolderId&&preferredFolderId!==saveRoot.id){
  saveStack.push({id:preferredFolderId,name:'Vald mapp'});
 }else if(source?.driveId===saveRoot.driveId&&source.parentId!==saveRoot.id){
  saveStack.push({id:source.parentId,name:source.folderLabel?.split(' / ').at(-1)||'Projektmapp'});
 }
 await saveList(value);
}
async function refreshSave(value){
 const folderId=saveStack.at(-1)?.id;saveFolderReady=false;
 const nextRoot=await client.root(config.pilot);if(!currentSave(value))return;
 saveRoot=nextRoot;saveStack=[{id:folderId||saveRoot.id,name:saveRoot.name}];await saveList(value);
}
function finishSave(result,error){
 const value=pendingSave;if(!value)return;
 pendingSave=null;saveRoot=null;saveStack=[];saveFolderReady=false;
 if(saveDialog.open)saveDialog.close();
 if(error)value.reject(error);else value.resolve(result);
}
function cancelSave(){
 if(saveBusy){if(pendingSave?.controller){pendingSave.controller.abort();saveStatus('Avbryter överföringen…');}return;}
 showSaveResult('Sparandet avbröts. Ingen ny sparning har bekräftats.');
 finishSave(null,new DOMException('Sparandet avbröts.','AbortError'));
}
function copyFilename(original){
 const dot=original.lastIndexOf('.'),stamp=new Date().toISOString().replace(/[-:]/g,'').replace('T','-').slice(0,15);
 return dot>0?original.slice(0,dot)+' - kopia '+stamp+original.slice(dot):original+' - kopia '+stamp;
}
async function offerSave({blob,name,context}){
 if(locked())throw Error('Lås upp Avläsning med din vanliga kod först.');
 if(pendingSave||busy)throw Error('Slutför den öppna filrutan först.');
 if(!(blob instanceof Blob)||!blob.size)throw Error('Exportfilen är tom.');
 // A restored project can recover its saved cloud reference only after the
 // current account is known. Local export stays available if online setup fails.
 let userId=window.TillsynoCurrentAccess?.userId||null,inspectedIdentity='';
 try{
  userId=await gate();await initialize();
  if(account){sourceBinding.setIdentity({accountKey:accountKey(account),userId});inspectedIdentity=accountKey(account)+'\n'+userId;}
 }catch{/* saveRun reports the cloud error; the local choice remains available. */}
 const info=await sourceBinding.inspectExport({blob,name,context});
 if(!info.isCurrent())throw new DOMException('Projektet byttes under exporten. Spara det aktuella projektet igen.','AbortError');
 if(pendingSave||busy)throw Error('Slutför den öppna filrutan först.');
 const original=String(name||'Tillsyno.pdf');
 const promise=new Promise((resolve,reject)=>{pendingSave={blob,name:original,context,info,inspectedIdentity,mode:info.source?'update':'create',regularName:original,copyName:copyFilename(info.source?.name||original),resolve,reject,userId};});
 saveRoot=null;saveStack=[];saveFolderReady=false;saveResult.hidden=true;
 s('spSaveName').value=info.source?pendingSave.copyName:original;
 s('spSaveSummary').textContent=(info.source?.name||original)+' · '+(blob.size/1048576).toFixed(1)+' MB';
 s('spSaveExistingName').textContent=info.source?.name||'';
 s('spSaveExistingFolder').textContent=info.source?.folderLabel||'Great';
 s('spSaveCrumbs').replaceChildren();s('spSaveFolders').replaceChildren();s('spSaveProgress').hidden=true;s('spSaveProgress').value=0;
 saveStatus('Förbereder sparandet…');saveDialog.showModal();saveControls();
 void saveRun(async value=>{if(account)await saveStart(value);else saveStatus('Anslut Microsoft eller välj Den här enheten.');});
 return promise;
}
function changeSaveMode(mode){
 if(saveBusy||!pendingSave||!pendingSave.info.projectExport)return;
 const preferredFolderId=!pendingSave.info.source?saveStack.at(-1)?.id:null;
 if(pendingSave.mode==='copy')pendingSave.copyName=s('spSaveName').value;
 else if(pendingSave.mode==='create')pendingSave.regularName=s('spSaveName').value;
 pendingSave.mode=mode==='copy'?'copy':pendingSave.info.source?'update':'create';
 s('spSaveName').value=pendingSave.mode==='create'?pendingSave.regularName:pendingSave.copyName;
 saveFolderReady=false;saveControls();
 void saveRun(async value=>{if(account)await saveStart(value,preferredFolderId);});
}
s('spSaveUpdate').onclick=()=>changeSaveMode('update');
s('spSaveCopy').onclick=()=>changeSaveMode('copy');
s('spSaveConnect').onclick=()=>{
 if(saveBusy||!msal)return;const login=loginFromClick();
 void saveRun(async value=>{
  const response=await login;
  if(!currentSave(value))return;account=validAccount(response.account);writeAccountKey='';
  msal.setActiveAccount(account);
  await syncSaveIdentity(value);if(!currentSave(value))return;
  await saveStart(value);
 });
};
s('spSaveReload').onclick=()=>void saveRun(refreshSave);
s('spSaveLocal').onclick=()=>{if(!saveBusy&&pendingSave){showSaveResult('Filen lämnas till enhetens sparfunktion.');finishSave({destination:'local'});}};
s('spSaveCancel').onclick=cancelSave;
saveDialog.addEventListener('cancel',event=>{event.preventDefault();cancelSave();});
saveDialog.addEventListener('close',()=>{if(pendingSave&&!saveBusy)cancelSave();});
s('spSaveSubmit').onclick=()=>{
 if(saveBusy||!pendingSave||!account||!saveFolderReady)return;
 if(config.save?.enabled!==true||config.save.mode!=='update-source'||JSON.stringify(config.save.writeScopes)!==JSON.stringify(WRITE_SCOPES)){
  saveStatus('Sparande till SharePoint är inte aktiverat i denna testversion.');return;
 }
 const value=pendingSave,expectedAccount=accountKey(account),updating=value.mode==='update',named=value.mode==='create'&&value.info.projectExport;
 const destination={driveId:saveRoot.driveId,id:saveStack.at(-1).id};
 let name,source;
 try{source=updating?checkSourceAccount(value):null;name=validateCopyName(updating?source.name:s('spSaveName').value.trim());}
 catch(error){saveStatus(saveError(error),'error');if(!updating)s('spSaveName').focus();return;}
 value.controller=new AbortController();
 saveBusy=true;saveControls();s('spSaveProgress').hidden=false;s('spSaveProgress').value=0;saveStatus('Kontrollerar skrivåtkomst…');
 // Consent starts in the click so Safari retains user activation.
 let consent;
 try{consent=writeAccountKey===expectedAccount?msal.acquireTokenSilent({account,scopes:WRITE_SCOPES}):msal.acquireTokenPopup({account,scopes:WRITE_SCOPES});}
 catch(error){consent=Promise.reject(error);}
 void (async()=>{
  try{
   const [user,response]=await Promise.all([checkSaveOwner(value),consent]);
   if(accountKey(response.account)!==expectedAccount||accountKey(account)!==expectedAccount)throw Error('Microsoft-kontot ändrades. Försök igen med samma testkonto.');
   writeAccountKey=expectedAccount;
   const writer=new SharePointWriter({getToken:()=>tokenFor(READ_SCOPES),getWriteToken:()=>tokenFor(WRITE_SCOPES),rootStore,getContextKey,guard:async()=>{
    const latest=await checkSaveOwner(value);if(latest!==user||accountKey(account)!==expectedAccount)throw Error('Inloggningen ändrades. Sparandet stoppades.');return latest+'|'+expectedAccount;
   }});
   // Reuse the same verified root identity, also when persistent storage is blocked.
   writer.root=options=>client.root(options);
   const options={config:config.pilot,blob:value.blob,signal:value.controller.signal,onProgress:progress=>{
    if(!currentSave(value))return;
    const fraction=progress.total?Math.floor(progress.loaded/progress.total*100):0;
    s('spSaveProgress').value=progress.phase==='complete'?100:Math.min(99,fraction);
    saveStatus(progress.phase==='verifying'?'Bekräftar sparandet…':progress.phase==='validating'?(updating?'Kontrollerar filens version…':'Kontrollerar mappen…'):'Sparar… '+Math.min(99,fraction)+' %');
   }};
   const item=updating?await writer.saveExisting({...options,source}):named?await writer.saveNamed({...options,destination,name}):await writer.saveCopy({...options,destination,name});
   if(!currentSave(value))return;
   const folderLabel=saveStack.map(f=>f.name).join(' / ');
   sourceBinding.confirmSave(value.info,{...item,accountKey:expectedAccount,userId:user,folderLabel});
   showSaveResult((updating?'Sparad i samma fil: ':value.mode==='copy'?'Kopia sparad: ':'Sparad i SharePoint: ')+item.name,item);
   finishSave({destination:'sharepoint',item});
  }catch(error){
   if(error instanceof InteractionRequiredAuthError)writeAccountKey='';
   if(currentSave(value)){saveStatus(saveError(error),'error');showSaveResult('Sparandet kunde inte bekräftas. '+saveError(error));}
  }finally{value.controller=null;saveBusy=false;saveControls();}
 })();
};
window.addEventListener('beforeunload',event=>{if(pendingSave){event.preventDefault();event.returnValue='';}});
installExportBridge({window,offerSave,captureContext:()=>sourceBinding.captureExport(),onError:error=>{if(error?.name!=='AbortError')showSaveResult('Exporten kunde inte lämnas till sparfunktionen. '+saveError(error));}});
// Keep ordinary home/module navigation inside the explicitly separate test copies.
const routes={'index.html':'sharepoint-app-test.html','all-in-one.html':'sharepoint-control-test.html','security.html':'sharepoint-security-test.html','smartmatch-slr-test.html':'sharepoint-smartmatch-test.html','smartmatch-read-test-v9-74.html':'sharepoint-read-test.html','smartmatch-read-test-v9-78.html':'sharepoint-read-test.html','smartmatch-read-test-v9-79.html':'sharepoint-read-test.html','smartmatch-read-test-v9-80.html':'sharepoint-read-test.html','drawing-tools.html':'sharepoint-drawing-test.html','ce-markning.html':'sharepoint-ce-test.html'};
document.addEventListener('click',event=>{
 const a=event.target.closest?.('a[href]');if(!a||a.hasAttribute('download')||a.target==='_blank')return;
 const u=new URL(a.href,location.href);if(u.origin!==location.origin)return;
 const parts=u.pathname.split('/');const name=parts.at(-1)||'index.html';if(!routes[name])return;
 parts[parts.length-1]=routes[name];u.pathname=parts.join('/');u.searchParams.set('spv','0.8');a.href=u.href;
},true);
