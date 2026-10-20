import {PublicClientApplication,InteractionRequiredAuthError} from '@azure/msal-browser';
import {SharePointFiles,accepts} from './file-client.mjs';
import {SharePointWriter,validateCopyName} from './write-client.mjs';
import {installExportBridge} from './export-bridge.mjs';
const moduleName=document.body.dataset.sharepointModule||null;
const READ_SCOPES=['https://graph.microsoft.com/Sites.Read.All'];
const WRITE_SCOPES=['https://graph.microsoft.com/Files.ReadWrite.All'];
let initPromise,msal,config,account,client,root,stack=[],items=[],selected=new Set(),target=null,bypass=false,busy=false,op=0;
let pendingSave=null,saveBusy=false,saveRoot=null,saveStack=[],saveFolderReady=false,writeAccountKey='';
const dialog=document.createElement('dialog');dialog.id='spFilePicker';
dialog.innerHTML=`<form method="dialog" class="spHead"><h2>Öppna fil</h2><button aria-label="Stäng filväljaren">×</button></form><p>Välj filkälla. Filen öppnas i den del av appen du använder.</p><div class="spActions"><button id="spLocal" type="button">Den här enheten</button><button id="spConnect" type="button">Anslut Microsoft</button><button id="spReload" type="button" hidden>Uppdatera</button><button id="spDisconnect" type="button" hidden>Koppla från</button></div><p id="spAccount"></p><p id="spStatus" role="status" aria-live="polite"></p><nav id="spCrumbs" aria-label="SharePoint-mappar"></nav><ul id="spFiles"></ul><button id="spImport" type="button" disabled>Öppna i appen</button><p class="spNote">SharePoint-test 0.5 · GStest och undermappar · högst 25 MB per fil, 100 MB per val. När du sparar väljer du SharePoint eller den här enheten.</p>`;
document.body.append(dialog);
const $=id=>dialog.querySelector('#'+id);
const status=text=>{$('spStatus').textContent=text;};
function locked(){return document.documentElement.hasAttribute('data-read-locked');}
async function gate(){
 if(locked())throw Error('Lås upp Avläsning med din vanliga kod först.');
 const auth=window.TillsynoAuth;if(!auth)throw Error('Tillsyno-inloggningen saknas.');
 const access=await auth.verify({allowOffline:false});
 if(access.role!=='admin'||!auth.permitted(access,moduleName))throw Error('Endast behörig administratör får använda detta test.');
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
  account=msal.getAllAccounts().find(a=>a.tenantId?.toLowerCase()===config.tenantId.toLowerCase())||null;
  client=new SharePointFiles({getToken:()=>tokenFor(READ_SCOPES)});
 })().catch(e=>{initPromise=null;throw e;});
 return initPromise;
}
function controls(){
 for(const button of dialog.querySelectorAll('button'))button.disabled=busy;
 $('spConnect').disabled=busy||!msal;
 $('spImport').disabled=busy||!selected.size;
 $('spReload').hidden=!account;$('spDisconnect').hidden=!account;
 $('spAccount').textContent=account?.username||'Använd bara den separata Microsoft-testorganisationen.';
}
async function run(fn){
 if(busy)return;busy=true;controls();const current=op;
 try{const user=await gate();await initialize();if(current!==op)return;await fn(current,user);}
 catch(e){if(current===op)status(e instanceof InteractionRequiredAuthError?'Klicka på Anslut Microsoft för att förnya inloggningen.':e?.errorCode?'Microsoft-inloggning: '+String(e.errorCode).replace(/[^a-z0-9_-]/gi,''):e.message||'Filen kunde inte öppnas.');}
 finally{busy=false;controls();}
}
function render(){
 $('spCrumbs').replaceChildren();stack.forEach((folder,index)=>{const b=document.createElement('button');b.type='button';b.textContent=folder.name;b.onclick=()=>void run(async current=>{stack=stack.slice(0,index+1);await list(current);});$('spCrumbs').append(b);});
 $('spFiles').replaceChildren();let count=0;
 for(const item of items){
  if(!item.folder&&(!item.file||!accepts(item.name,target.accept)))continue;count++;
  const li=document.createElement('li');
  if(item.folder){const b=document.createElement('button');b.type='button';b.textContent='Mapp: '+item.name;b.onclick=()=>void run(async current=>{stack.push({id:item.id,name:item.name});await list(current);});li.append(b);}
  else{const label=document.createElement('label'),check=document.createElement('input');check.type=target.multiple?'checkbox':'radio';check.name='spSelection';check.value=item.id;check.checked=selected.has(item.id);check.disabled=item.size>25*1024*1024;
   check.onchange=()=>{if(!target.multiple)selected.clear();check.checked?selected.add(item.id):selected.delete(item.id);controls();};
   label.append(check,document.createTextNode(item.name+' · '+(item.size/1048576).toFixed(1)+' MB'+(check.disabled?' · för stor för testet':'')));li.append(label);}
  $('spFiles').append(li);
 }
 status(count?'Välj fil'+(target.multiple?'er':'')+' och tryck Öppna i appen.':'Inga passande filer i denna mapp.');controls();
}
async function list(current){
 selected.clear();status('Hämtar filer från SharePoint…');
 const result=await client.children(root.driveId,stack.at(-1).id);if(current!==op)return;
 items=result.sort((a,b)=>Number(!!b.folder)-Number(!!a.folder)||a.name.localeCompare(b.name,'sv'));render();
}
async function start(current){root=await client.root(config.pilot);if(current!==op)return;stack=[{id:root.id,name:root.name}];await list(current);}
function loginFromClick(){
 let promise;try{promise=msal.loginPopup({scopes:READ_SCOPES,prompt:'select_account'});}catch(error){promise=Promise.reject(error);}
 // A failed access recheck may stop the operation before it awaits the popup.
 promise.catch(()=>{});return promise;
}
$('spConnect').onclick=()=>{
 if(busy||!msal)return;const login=loginFromClick();
 void run(async current=>{const response=await login;if(current!==op)return;account=validAccount(response.account);writeAccountKey='';msal.setActiveAccount(account);await start(current);});
};
$('spReload').onclick=()=>void run(start);
$('spDisconnect').onclick=()=>void run(async()=>{await msal.clearCache({account});account=null;writeAccountKey='';root=null;items=[];stack=[];selected.clear();$('spFiles').replaceChildren();$('spCrumbs').replaceChildren();status('Microsoft-testkontot är frånkopplat i denna flik.');});
$('spLocal').onclick=()=>{const input=target;dialog.close();bypass=true;try{input.click();}finally{bypass=false;}};
$('spImport').onclick=()=>void run(async(current,user)=>{
 const input=target,chosen=items.filter(i=>selected.has(i.id));
 if(!chosen.length||(!input.multiple&&chosen.length!==1))throw Error('Välj rätt antal filer.');
 if(chosen.reduce((sum,f)=>sum+(f.size||0),0)>100*1024*1024)throw Error('Välj högst 100 MB åt gången.');
 const files=[];let bytes=0;
 for(let i=0;i<chosen.length;i++){status('Hämtar '+(i+1)+'/'+chosen.length+': '+chosen[i].name);const file=await client.file(root.driveId,chosen[i].id,input.accept);if(current!==op)return;bytes+=file.size;if(bytes>100*1024*1024)throw Error('Filerna överstiger 100 MB.');files.push(file);}
 if(await gate()!==user)throw Error('Inloggningen ändrades. Öppna filväljaren igen.');
 if(current!==op||!input.isConnected)return;
 const transfer=new DataTransfer();files.forEach(f=>transfer.items.add(f));input.files=transfer.files;
 dialog.close();input.dispatchEvent(new Event('change',{bubbles:true}));
});
dialog.addEventListener('close',()=>{op++;selected.clear();items=[];$('spFiles').replaceChildren();$('spCrumbs').replaceChildren();});
document.addEventListener('click',event=>{
 const input=event.target;
 if(!(input instanceof HTMLInputElement)||input.type!=='file'||bypass)return;
 event.preventDefault();event.stopImmediatePropagation();if(locked()||busy||pendingSave)return;
 target=input;op++;selected.clear();items=[];stack=[];status('Välj den här enheten eller anslut Microsoft.');controls();dialog.showModal();
 void run(async current=>{if(account)await start(current);});
},true);

// Only the seven explicit test copies load this adapter. The module still
// creates and verifies its own exported bytes before choosing a destination.
const saveDialog=document.createElement('dialog');saveDialog.id='spSavePicker';
saveDialog.setAttribute('aria-labelledby','spSaveTitle');
saveDialog.innerHTML=`<div class="spHead"><h2 id="spSaveTitle">Spara fil</h2><button id="spSaveCancel" type="button" aria-label="Avbryt sparandet">×</button></div>
<p id="spSaveSummary"></p><label class="spSaveNameLabel" for="spSaveName">Filnamn i SharePoint</label><input id="spSaveName" type="text" maxlength="220" autocomplete="off" spellcheck="false">
<div class="spActions"><button id="spSaveConnect" type="button">Anslut Microsoft</button><button id="spSaveReload" type="button">Uppdatera mappar</button></div><p id="spSaveAccount"></p>
<p class="spFolderLabel">Spara ny kopia i</p><nav id="spSaveCrumbs" aria-label="Sparmapp i SharePoint"></nav><ul id="spSaveFolders" aria-label="Undermappar"></ul>
<progress id="spSaveProgress" max="100" value="0" hidden aria-label="Uppladdning till SharePoint"></progress><p id="spSaveStatus" role="status" aria-live="polite"></p>
<div class="spSaveButtons"><button id="spSaveSubmit" type="button" disabled>Spara i SharePoint</button><button id="spSaveLocal" type="button">Den här enheten</button></div>
<p class="spNote">Befintliga filer behålls. Microsoft kan första gången be om skrivåtkomst till filer som testkontot har tillgång till. Använd det separata testkontot.</p>`;
document.body.append(saveDialog);
const saveResult=document.createElement('aside');saveResult.id='spSaveResult';saveResult.hidden=true;saveResult.setAttribute('role','status');saveResult.setAttribute('aria-live','polite');document.body.append(saveResult);
const s=id=>saveDialog.querySelector('#'+id);
const saveStatus=text=>{s('spSaveStatus').textContent=text;};
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
 for(const button of saveDialog.querySelectorAll('button'))button.disabled=saveBusy;
 s('spSaveCancel').disabled=saveBusy&&!pendingSave?.controller;
 s('spSaveCancel').textContent=saveBusy&&pendingSave?.controller?'Stoppa':'×';
 s('spSaveCancel').setAttribute('aria-label',saveBusy&&pendingSave?.controller?'Stoppa överföringen och behåll filen':'Avbryt sparandet');
 s('spSaveName').disabled=saveBusy;
 s('spSaveSubmit').disabled=saveBusy||!pendingSave||!account||!saveFolderReady||pendingSave.blob.size>25*1024*1024;
 s('spSaveReload').hidden=!account;
 s('spSaveConnect').textContent=account?'Anslut Microsoft igen':'Anslut Microsoft';
 s('spSaveConnect').disabled=saveBusy||!msal;
 s('spSaveAccount').textContent=account?.username||'Separat Microsoft-testkonto';
}
function currentSave(value){return pendingSave===value&&saveDialog.open;}
async function checkSaveOwner(value){
 const userId=await gate();
 if(!currentSave(value))throw new DOMException('Sparandet avbröts.','AbortError');
 if(value.userId&&value.userId!==userId)throw Error('Tillsyno-kontot ändrades. Avbryt och skapa exporten igen.');
 value.userId=userId;return userId;
}
async function saveRun(fn){
 if(saveBusy||!pendingSave)return;
 const value=pendingSave;saveBusy=true;saveControls();
 try{await checkSaveOwner(value);await initialize();if(!currentSave(value))return;await fn(value);}
 catch(error){if(currentSave(value)){saveStatus(saveError(error));showSaveResult('Inte sparad i SharePoint. '+saveError(error));}}
 finally{saveBusy=false;saveControls();}
}
async function saveList(value){
 saveFolderReady=false;saveStatus('Hämtar mappar…');s('spSaveFolders').replaceChildren();
 const folders=await client.children(saveRoot.driveId,saveStack.at(-1).id);
 if(!currentSave(value))return;
 s('spSaveCrumbs').replaceChildren();
 saveStack.forEach((folder,index)=>{const b=document.createElement('button');b.type='button';b.textContent=folder.name;b.onclick=()=>void saveRun(async v=>{saveStack=saveStack.slice(0,index+1);await saveList(v);});s('spSaveCrumbs').append(b);});
 for(const folder of folders.filter(i=>i.folder).sort((a,b)=>a.name.localeCompare(b.name,'sv'))){const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.textContent=folder.name;b.onclick=()=>void saveRun(async v=>{saveStack.push({id:folder.id,name:folder.name});await saveList(v);});li.append(b);s('spSaveFolders').append(li);}
 saveFolderReady=true;
 saveStatus(value.blob.size>25*1024*1024?'Filen är större än testets gräns på 25 MB. Välj Den här enheten.':'Klar att spara en ny kopia i '+saveStack.map(f=>f.name).join(' / ')+'.');
}
async function saveStart(value){
 saveRoot=await client.root(config.pilot);if(!currentSave(value))return;
 saveStack=[{id:saveRoot.id,name:saveRoot.name}];await saveList(value);
}
function finishSave(result,error){
 const value=pendingSave;if(!value)return;
 pendingSave=null;saveRoot=null;saveStack=[];saveFolderReady=false;
 if(saveDialog.open)saveDialog.close();
 if(error)value.reject(error);else value.resolve(result);
}
function cancelSave(){
 if(saveBusy){if(pendingSave?.controller){pendingSave.controller.abort();saveStatus('Avbryter överföringen…');}return;}
 showSaveResult('Sparandet avbröts. Ingen SharePoint-kopia har bekräftats.');
 finishSave(null,new DOMException('Sparandet avbröts.','AbortError'));
}
function offerSave({blob,name}){
 if(locked())return Promise.reject(Error('Lås upp Avläsning med din vanliga kod först.'));
 if(pendingSave||busy)return Promise.reject(Error('Slutför den öppna filrutan först.'));
 if(!(blob instanceof Blob)||!blob.size)return Promise.reject(Error('Exportfilen är tom.'));
 const original=String(name||'Tillsyno.pdf'),dot=original.lastIndexOf('.'),stamp=new Date().toISOString().replace(/[-:]/g,'').replace('T','-').slice(0,15);
 const copyName=(dot>0?original.slice(0,dot)+' - '+stamp+original.slice(dot):original+' - '+stamp);
 const promise=new Promise((resolve,reject)=>{pendingSave={blob,name:original,resolve,reject,userId:window.TillsynoCurrentAccess?.userId||null};});
 saveRoot=null;saveStack=[];saveFolderReady=false;saveResult.hidden=true;
 s('spSaveName').value=copyName;s('spSaveSummary').textContent=original+' · '+(blob.size/1048576).toFixed(1)+' MB';
 s('spSaveCrumbs').replaceChildren();s('spSaveFolders').replaceChildren();s('spSaveProgress').hidden=true;s('spSaveProgress').value=0;
 saveStatus('Välj SharePoint eller den här enheten.');saveDialog.showModal();saveControls();
 void saveRun(async value=>{if(account)await saveStart(value);else saveStatus('Anslut Microsoft för att välja sparmapp.');});
 return promise;
}
s('spSaveConnect').onclick=()=>{
 if(saveBusy||!msal)return;const login=loginFromClick();
 void saveRun(async value=>{
  const response=await login;
  if(!currentSave(value))return;account=validAccount(response.account);writeAccountKey='';msal.setActiveAccount(account);await saveStart(value);
 });
};
s('spSaveReload').onclick=()=>void saveRun(saveStart);
s('spSaveLocal').onclick=()=>{if(!saveBusy&&pendingSave){showSaveResult('Filen lämnas till enhetens sparfunktion.');finishSave({destination:'local'});}};
s('spSaveCancel').onclick=cancelSave;
saveDialog.addEventListener('cancel',event=>{event.preventDefault();cancelSave();});
saveDialog.addEventListener('close',()=>{if(pendingSave&&!saveBusy)cancelSave();});
s('spSaveSubmit').onclick=()=>{
 if(saveBusy||!pendingSave||!account||!saveFolderReady)return;
 if(config.save?.enabled!==true||config.save.mode!=='new-copy'||JSON.stringify(config.save.writeScopes)!==JSON.stringify(WRITE_SCOPES)){
  saveStatus('Sparande till SharePoint är inte aktiverat i denna testversion.');return;
 }
 const value=pendingSave,expectedAccount=accountKey(account),destination={driveId:saveRoot.driveId,id:saveStack.at(-1).id};
 let name;try{name=validateCopyName(s('spSaveName').value.trim());}catch(error){saveStatus(saveError(error));s('spSaveName').focus();return;}
 value.controller=new AbortController();
 saveBusy=true;saveControls();s('spSaveProgress').hidden=false;s('spSaveProgress').value=0;saveStatus('Kontrollerar skrivåtkomst…');
 // A first write consent popup starts directly in this click, before waiting
 // for network calls, so Safari does not lose the user's activation.
 let consent;
 try{consent=writeAccountKey===expectedAccount?msal.acquireTokenSilent({account,scopes:WRITE_SCOPES}):msal.acquireTokenPopup({account,scopes:WRITE_SCOPES});}
 catch(error){consent=Promise.reject(error);}
 void (async()=>{
  try{
   const [user,response]=await Promise.all([checkSaveOwner(value),consent]);
   if(accountKey(response.account)!==expectedAccount||accountKey(account)!==expectedAccount)throw Error('Microsoft-kontot ändrades. Försök igen med samma testkonto.');
   writeAccountKey=expectedAccount;
   const writer=new SharePointWriter({getToken:()=>tokenFor(READ_SCOPES),getWriteToken:()=>tokenFor(WRITE_SCOPES),guard:async()=>{
    const latest=await checkSaveOwner(value);if(latest!==user||accountKey(account)!==expectedAccount)throw Error('Inloggningen ändrades. Sparandet stoppades.');return latest+'|'+expectedAccount;
   }});
   const item=await writer.saveCopy({config:config.pilot,destination,blob:value.blob,name,signal:value.controller.signal,onProgress:progress=>{
    if(!currentSave(value))return;
    const fraction=progress.total?Math.floor(progress.loaded/progress.total*100):0;
    s('spSaveProgress').value=progress.phase==='complete'?100:Math.min(99,fraction);
    saveStatus(progress.phase==='verifying'?'Kontrollerar den sparade filen…':progress.phase==='validating'?'Kontrollerar sparmappen…':'Sparar i SharePoint… '+Math.min(99,fraction)+' %');
   }});
   if(!currentSave(value))return;
   showSaveResult('Sparad i SharePoint: '+saveStack.map(f=>f.name).join(' / ')+' / '+item.name+'.',item);
   finishSave({destination:'sharepoint',item});
  }catch(error){
   if(error instanceof InteractionRequiredAuthError)writeAccountKey='';
   if(currentSave(value)){saveStatus(saveError(error));showSaveResult('Ingen SharePoint-sparning har kunnat bekräftas. '+saveError(error));}
  }finally{value.controller=null;saveBusy=false;saveControls();}
 })();
};
window.addEventListener('beforeunload',event=>{if(pendingSave){event.preventDefault();event.returnValue='';}});
installExportBridge({window,offerSave,onError:error=>{if(error?.name!=='AbortError')showSaveResult('Exporten kunde inte lämnas till sparfunktionen. '+saveError(error));}});
// Keep ordinary home/module navigation inside the explicitly separate test copies.
const routes={'index.html':'sharepoint-app-test.html','all-in-one.html':'sharepoint-control-test.html','security.html':'sharepoint-security-test.html','smartmatch-slr-test.html':'sharepoint-smartmatch-test.html','smartmatch-read-test-v9-74.html':'sharepoint-read-test.html','drawing-tools.html':'sharepoint-drawing-test.html','ce-markning.html':'sharepoint-ce-test.html'};
document.addEventListener('click',event=>{
 const a=event.target.closest?.('a[href]');if(!a||a.hasAttribute('download')||a.target==='_blank')return;
 const u=new URL(a.href,location.href);if(u.origin!==location.origin)return;
 const parts=u.pathname.split('/');const name=parts.at(-1)||'index.html';if(!routes[name])return;
 parts[parts.length-1]=routes[name];u.pathname=parts.join('/');u.searchParams.set('spv','0.5');a.href=u.href;
},true);
