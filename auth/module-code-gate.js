(()=>{
'use strict';
const root=document.documentElement;
const moduleKey=root.dataset.codeModule;
if(!moduleKey){root.removeAttribute('data-module-code-pending');return;}
const labels={read:'Avläsning + SmartMatch',control:'Kontrollflöde',project:'Tillsyno Projekt',drawing:'Ritningsverktyg'};
let access=null,busy=false,gate=null,statusNode=null,input=null,submit=null;
const statusKey='tillsyno-module-code-status:'+moduleKey;
const unlockKey=userId=>'tillsyno-module-code-unlocked:'+moduleKey+':'+userId;
const readJson=(storage,key)=>{try{return JSON.parse(storage.getItem(key)||'null')}catch(_){return null}};
const writeJson=(storage,key,value)=>{try{storage.setItem(key,JSON.stringify(value))}catch(_){}};

function reveal(){root.removeAttribute('data-module-code-pending')}
const accessObserver=new MutationObserver(()=>{if(document.getElementById('tillsynoAccessDenied'))reveal();});
if(document.body)accessObserver.observe(document.body,{childList:true,subtree:true});
else document.addEventListener('DOMContentLoaded',()=>accessObserver.observe(document.body,{childList:true,subtree:true}),{once:true});
function buildGate(){
 if(gate)return gate;
 gate=document.createElement('section');
 gate.id='tillsynoModuleCodeGate';
 gate.setAttribute('role','dialog');
 gate.setAttribute('aria-modal','true');
 gate.setAttribute('aria-labelledby','tillsynoModuleCodeTitle');
 gate.style.cssText='position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;box-sizing:border-box;background:var(--ta-page,#edf4f6);font:14px system-ui;color:var(--ta-ink,#193746)';
 const form=document.createElement('form');
 form.style.cssText='box-sizing:border-box;width:min(340px,100%);display:grid;gap:12px;padding:24px;background:var(--ta-card,#fff);border:1px solid var(--ta-border,#b9cbd2);border-radius:14px;box-shadow:0 18px 50px #0a243040';
 const title=document.createElement('h1');title.id='tillsynoModuleCodeTitle';title.textContent=labels[moduleKey]||'Tillsyno';title.style.cssText='font-size:21px;margin:0';
 const text=document.createElement('p');text.textContent='Den här modulen är låst med kod av administratören.';text.style.cssText='margin:0;color:#55707d;line-height:1.45';
 const label=document.createElement('label');label.textContent='Kod';label.style.cssText='display:grid;gap:6px;font-weight:650';
 input=document.createElement('input');input.type='password';input.inputMode='numeric';input.pattern='[0-9]{4}';input.minLength=4;input.maxLength=4;input.autocomplete='off';input.required=true;input.setAttribute('aria-label','Kod till '+(labels[moduleKey]||'modulen'));input.style.cssText='width:100%;box-sizing:border-box;padding:11px;border:1px solid var(--ta-border,#b9cbd2);border-radius:8px;font:22px system-ui;letter-spacing:8px;background:var(--ta-page,#f3f7f9);color:inherit';
 label.appendChild(input);
 submit=document.createElement('button');submit.type='submit';submit.textContent='Öppna';submit.style.cssText='min-height:44px;border:0;border-radius:8px;background:#173f52;color:#fff;font:700 14px system-ui;cursor:pointer';
 statusNode=document.createElement('p');statusNode.setAttribute('role','status');statusNode.setAttribute('aria-live','polite');statusNode.style.cssText='margin:0;min-height:18px;font-size:12px;color:#6b2737';
 const home=document.createElement('a');home.href=new URL('app.html',window.TillsynoAuth?.root||new URL('./',location.href));home.textContent='Till startsidan';home.style.cssText='font-size:12px;color:#175e78';
 form.append(title,text,label,submit,statusNode,home);gate.appendChild(form);document.body.appendChild(gate);
 form.addEventListener('submit',verifyCode);
 return gate;
}
function showMessage(message){buildGate();statusNode.textContent=message||'';reveal();setTimeout(()=>input?.focus(),0)}
async function verifyCode(event){
 event.preventDefault();
 if(busy||!access?.userId)return;
 const pin=input.value.trim();
 if(!/^[0-9]{4}$/.test(pin)){statusNode.textContent='Skriv fyra siffror.';input.focus();return;}
 if(!navigator.onLine){statusNode.textContent='Anslut till internet för att kontrollera koden.';return;}
 busy=true;submit.disabled=true;statusNode.textContent='Kontrollerar…';
 try{
  const {data,error}=await window.TillsynoAuth.client.rpc('tillsyno_verify_module_code',{p_module:moduleKey,p_pin:pin});
  input.value='';
  if(error)throw error;
  if(data?.ok===true){
   const cached=readJson(localStorage,statusKey);
   writeJson(sessionStorage,unlockKey(access.userId),{updatedAt:cached?.updatedAt||null});
   gate?.remove();gate=null;reveal();return;
  }
  statusNode.textContent=data?.reason==='locked'
   ?'För många försök. Vänta '+Math.max(1,Math.ceil((Number(data.retryAfter)||900)/60))+' minuter.'
   :data?.reason==='auth'?'Logga in igen.'
   :data?.reason==='access'?'Ditt konto saknar åtkomst till modulen.'
   :data?.reason==='unavailable'?'Kodlåset saknar kod. Kontakta administratören.'
   :'Fel kod. Försök igen.';
  input.focus();
 }catch(error){
  statusNode.textContent='Koden kunde inte kontrolleras. Försök igen.';
 }finally{busy=false;if(submit)submit.disabled=false;}
}
async function start(detail){
 access=detail||window.TillsynoCurrentAccess;
 if(!access?.userId)return;
 if(!navigator.onLine){
  const cached=readJson(localStorage,statusKey);
  const unlocked=readJson(sessionStorage,unlockKey(access.userId));
  if(cached?.enabled===false){reveal();return;}
  if(cached?.enabled===true&&unlocked?.updatedAt===cached.updatedAt){reveal();return;}
  showMessage('Anslut till internet för att kontrollera modulens kodlås.');return;
 }
 try{
  const {data,error}=await window.TillsynoAuth.client
   .from('tillsyno_module_codes')
   .select('module_key,enabled,updated_at')
   .eq('module_key',moduleKey)
   .maybeSingle();
  if(error)throw error;
  const state={enabled:!!data?.enabled,updatedAt:data?.updated_at||null};
  writeJson(localStorage,statusKey,state);
  if(!state.enabled){try{sessionStorage.removeItem(unlockKey(access.userId))}catch(_){};reveal();return;}
  const unlocked=readJson(sessionStorage,unlockKey(access.userId));
  if(unlocked?.updatedAt===state.updatedAt){reveal();return;}
  showMessage('');
 }catch(error){
  showMessage('Kodinställningen kunde inte hämtas. Försök igen.');
 }
}
window.addEventListener('tillsyno-authorized',event=>void start(event.detail));
if(window.TillsynoCurrentAccess)void start(window.TillsynoCurrentAccess);
})();