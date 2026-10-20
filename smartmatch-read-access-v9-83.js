/* This is an entry lock for the static client, not server hosting protection.
 * PIN verification is server-side; no PIN/hash or reusable unlock flag is stored.
 * Existing authentication and module permissions are still required. */
(()=>{
 'use strict';
 let unlockedUser=null,access=null,busy=false;const disabled=new Map();
 const gate=document.getElementById('smReadCodeGate'),form=gate.querySelector('form'),input=gate.querySelector('input'),submit=gate.querySelector('button'),status=gate.querySelector('[role="status"]');
 function block(){for(const node of document.body.children){if(node===gate||['SCRIPT','STYLE','LINK'].includes(node.tagName))continue;if(!disabled.has(node))disabled.set(node,node.inert);node.inert=true;}}
 function lock(){document.documentElement.setAttribute('data-read-locked','');gate.hidden=false;block();}
 function unlock(userId){unlockedUser=userId;document.documentElement.removeAttribute('data-read-locked');gate.hidden=true;for(const [node,inert] of disabled)node.inert=inert;disabled.clear();input.value='';document.querySelector('#pwOpenPreparedPdf,#pwFile')?.focus();}
 const observer=new MutationObserver(()=>{if(!unlockedUser)block();});observer.observe(document.body,{childList:true});
 function authorized(event){access=event.detail;if(unlockedUser&&unlockedUser!==access?.userId){unlockedUser=null;lock();}if(!unlockedUser){submit.disabled=!access?.userId;status.textContent=navigator.onLine?'':'Anslut till internet för att låsa upp.';input.focus();}}
 window.addEventListener('tillsyno-authorized',authorized);if(window.TillsynoCurrentAccess)authorized({detail:window.TillsynoCurrentAccess});lock();
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!access?.userId)return;
  if(!navigator.onLine){status.textContent='Anslut till internet för att låsa upp.';return;}
  if(!/^[0-9]{4}$/.test(input.value)){status.textContent='Skriv fyra siffror.';return;}
  busy=true;submit.disabled=true;status.textContent='Kontrollerar…';const userId=access.userId;
  try{
   const {data,error}=await window.TillsynoAuth.client.rpc('tillsyno_verify_read_code',{p_pin:input.value});input.value='';
   if(error)throw Error('Koden kunde inte kontrolleras. Försök igen.');
   if(data?.ok===true&&access?.userId===userId){unlock(userId);return;}
   status.textContent=data?.reason==='locked'?'För många försök. Vänta '+Math.max(1,Math.ceil((Number(data.retryAfter)||900)/60))+' minuter.':data?.reason==='auth'?'Logga in igen för att öppna Avläsning.':data?.reason==='access'?'Ditt konto saknar tillgång till SmartMatch.':data?.reason==='unavailable'?'Kodlåset är inte tillgängligt just nu.':'Fel kod. Försök igen.';input.focus();
  }catch(error){input.value='';status.textContent=error.message||'Koden kunde inte kontrolleras.';}finally{busy=false;submit.disabled=false;}
 });
})();

