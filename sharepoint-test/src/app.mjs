import {PublicClientApplication,InteractionRequiredAuthError} from '@azure/msal-browser';
import {SharePointFiles,accepts} from './file-client.mjs';
const moduleName=document.body.dataset.sharepointModule||null;
let initPromise,msal,config,account,client,root,stack=[],items=[],selected=new Set(),target=null,bypass=false,busy=false,op=0;
const dialog=document.createElement('dialog');dialog.id='spFilePicker';
dialog.innerHTML=`<form method="dialog" class="spHead"><h2>Öppna fil</h2><button aria-label="Stäng filväljaren">×</button></form><p>Välj filkälla. Filen öppnas i den del av appen du använder.</p><div class="spActions"><button id="spLocal" type="button">Den här enheten</button><button id="spConnect" type="button">Anslut Microsoft</button><button id="spReload" type="button" hidden>Uppdatera</button><button id="spDisconnect" type="button" hidden>Koppla från</button></div><p id="spAccount"></p><p id="spStatus" role="status" aria-live="polite"></p><nav id="spCrumbs" aria-label="SharePoint-mappar"></nav><ul id="spFiles"></ul><button id="spImport" type="button" disabled>Öppna i appen</button><p class="spNote">SharePoint-test 0.4 · GStest och undermappar · högst 25 MB per fil, 100 MB per val. Endast filtyper som den valda knappen kan öppna visas. Spara sker med appens vanliga funktioner, inte tillbaka till SharePoint.</p>`;
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
async function initialize(){
 if(!initPromise)initPromise=(async()=>{
  const r=await fetch('sharepoint-test/auth-config.json',{cache:'no-store'});if(!r.ok)throw Error('SharePoint-inställningarna kunde inte läsas.');config=await r.json();
  if(!config.pilot.readOnly||JSON.stringify(config.graphScopes)!==JSON.stringify(['https://graph.microsoft.com/Sites.Read.All']))throw Error('Testet tillåter endast läsning.');
  if(new URL(config.msal.auth.redirectUri).origin!==location.origin)throw Error('Öppna testet på den publicerade adressen.');
  msal=new PublicClientApplication({auth:{...config.msal.auth},cache:{cacheLocation:'sessionStorage'},system:{loggerOptions:{piiLoggingEnabled:false,loggerCallback:()=>{}}}});await msal.initialize();
  account=msal.getAllAccounts().find(a=>a.tenantId?.toLowerCase()===config.tenantId.toLowerCase())||null;
  client=new SharePointFiles({getToken:async()=>{validAccount(account);const response=await msal.acquireTokenSilent({account,scopes:config.graphScopes});validAccount(response.account);return response.accessToken;}});
 })().catch(e=>{initPromise=null;throw e;});
 return initPromise;
}
function controls(){
 for(const button of dialog.querySelectorAll('button'))button.disabled=busy;
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
$('spConnect').onclick=()=>void run(async current=>{const response=await msal.loginPopup({scopes:config.graphScopes,prompt:'select_account'});if(current!==op)return;account=validAccount(response.account);msal.setActiveAccount(account);await start(current);});
$('spReload').onclick=()=>void run(start);
$('spDisconnect').onclick=()=>void run(async()=>{await msal.clearCache({account});account=null;root=null;items=[];stack=[];selected.clear();$('spFiles').replaceChildren();$('spCrumbs').replaceChildren();status('Microsoft-testkontot är frånkopplat i denna flik.');});
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
 event.preventDefault();event.stopImmediatePropagation();if(locked()||busy)return;
 target=input;op++;selected.clear();items=[];stack=[];status('Välj den här enheten eller anslut Microsoft.');controls();dialog.showModal();
 if(account)void run(start);
},true);
// Keep ordinary home/module navigation inside the explicitly separate test copies.
const routes={'index.html':'sharepoint-app-test.html','all-in-one.html':'sharepoint-control-test.html','security.html':'sharepoint-security-test.html','smartmatch-slr-test.html':'sharepoint-smartmatch-test.html','smartmatch-read-test-v9-74.html':'sharepoint-read-test.html','drawing-tools.html':'sharepoint-drawing-test.html','ce-markning.html':'sharepoint-ce-test.html'};
document.addEventListener('click',event=>{
 const a=event.target.closest?.('a[href]');if(!a||a.hasAttribute('download')||a.target==='_blank')return;
 const u=new URL(a.href,location.href);if(u.origin!==location.origin)return;
 const parts=u.pathname.split('/');const name=parts.at(-1)||'index.html';if(!routes[name])return;
 parts[parts.length-1]=routes[name];u.pathname=parts.join('/');u.searchParams.set('spv','0.4');a.href=u.href;
},true);
