import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { ReadOnlySharePoint } from './read-only.mjs';
const $ = id => document.getElementById(id);
let msal, config, client, account, busy=false, objectUrl='';
function status(message) { $('status').textContent=message; }
function clearPdf() { if(objectUrl) URL.revokeObjectURL(objectUrl); objectUrl=''; $('preview').hidden=true; $('preview').removeAttribute('href'); }
function controls() { $('connect').disabled=busy||!msal; $('refresh').disabled=busy||!account; $('disconnect').disabled=busy||!account; }
function failure(e) {
  if(e instanceof InteractionRequiredAuthError) return 'Klicka på Anslut Microsoft för att förnya inloggningen.';
  if(e?.errorCode === 'user_cancelled') return 'Inloggningen avbröts. Inga filer ändrades.';
  if(e?.errorCode === 'popup_window_error') return 'Tillåt popupfönster för testappen och försök igen.';
  // Never log tokens, authorization responses, URL fragments or raw server replies.
  if(e?.errorCode) return 'Microsoft-inloggningen misslyckades: '+String(e.errorCode).replace(/[^a-z0-9_-]/gi,'').slice(0,80)+'.';
  return e?.message || 'Testet misslyckades. Försök igen.';
}
async function gate() {
  const auth=window.TillsynoAuth;
  if(!auth) throw new Error('Tillsynos inloggning kunde inte laddas.');
  const access=await auth.verify({allowOffline:false});
  if(access.role!=='admin') throw new Error('Endast Tillsynos administratör får köra denna pilot.');
}
async function action(fn) {
  if(busy) return; busy=true;controls();
  try {await gate(); await fn();} catch(e) {status(failure(e));}
  finally {busy=false;controls();}
}
function validAccount(a) { if(!a || a.tenantId?.toLowerCase()!==config.tenantId.toLowerCase()) throw new Error('Använd det nya Microsoft-kontot i organisationen Tillsyno.'); return a; }
async function list() {
  clearPdf();$('files').replaceChildren(); status('Hämtar PDF-listan från SharePoint…');
  const result=await client.folder(config.pilot);
  for(const item of result.files) {
    const row=document.createElement('li'), name=document.createElement('span'), button=document.createElement('button');
    name.textContent=item.name+' · '+(item.size/1048576).toFixed(1)+' MB';
    button.textContent='Hämta PDF';button.type='button';
    button.addEventListener('click',()=>void action(async()=>{
      clearPdf();status('Hämtar '+item.name+'…');
      const pdf=await client.pdf(result.driveId,item.id);
      objectUrl=URL.createObjectURL(pdf.blob);$('preview').href=objectUrl;$('preview').hidden=false;
      $('preview').textContent='Öppna '+pdf.name;
      status('PDF hämtad till denna fliks minne. Originalet i SharePoint är oförändrat.');
    }));
    row.append(name,button);$('files').append(row);
  }
  status(result.files.length ? result.files.length+' PDF-filer hittades. Välj Hämta PDF.' : 'Inga PDF-filer finns direkt i den valda testmappen.');
}
async function boot() {
  try {
    await gate();
    const r=await fetch('./auth-config.json',{cache:'no-store'});if(!r.ok)throw new Error('Testkonfigurationen kunde inte läsas.');
    config=await r.json();
    if(config.pilot.readOnly!==true || JSON.stringify(config.graphScopes)!==JSON.stringify(['https://graph.microsoft.com/Sites.Read.All'])) throw new Error('Piloten tillåter endast Sites.Read.All.');
    if(new URL(config.msal.auth.redirectUri).origin!==location.origin) throw new Error('Öppna den publicerade testadressen. Den registrerade returadressen gäller inte denna server.');
    msal=new PublicClientApplication({auth:{...config.msal.auth},cache:{cacheLocation:'sessionStorage'},system:{loggerOptions:{piiLoggingEnabled:false,loggerCallback:()=>{}}}});
    await msal.initialize();
    account=msal.getAllAccounts().find(a=>a.tenantId?.toLowerCase()===config.tenantId.toLowerCase())||null;
    if(account)msal.setActiveAccount(account);
    client=new ReadOnlySharePoint({getToken:async()=>{
      validAccount(account);
      const result=await msal.acquireTokenSilent({account,scopes:config.graphScopes});
      validAccount(result.account);return result.accessToken;
    }});
    $('connect').addEventListener('click',()=>void action(async()=>{
      const result=await msal.loginPopup({scopes:config.graphScopes,prompt:'select_account'});
      account=validAccount(result.account);msal.setActiveAccount(account);$('account').textContent=account.username;
      await list();
    }));
    $('refresh').addEventListener('click',()=>void action(list));
    $('disconnect').addEventListener('click',()=>void action(async()=>{
      clearPdf();$('files').replaceChildren();await msal.clearCache({account});account=null;$('account').textContent='Inte ansluten';status('Testkopplingen är frånkopplad i denna webbläsare. Microsofts vanliga inloggning kan fortfarande vara aktiv.');
    }));
    $('account').textContent=account?.username||'Inte ansluten';
    status('Klicka på Anslut Microsoft. Testet läser endast; ingen fil kan ändras eller raderas.');controls();
  } catch(e) {status(failure(e));}
}
window.addEventListener('pagehide',clearPdf);
if(window.TillsynoCurrentAccess)void boot();else window.addEventListener('tillsyno-authorized',()=>void boot(),{once:true});
