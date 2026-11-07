/* v2.4.587: Dörrautomatik / Lås – checklistvyn (Protokoll). Laddas bara av controlflow-revision/all-in-one.html.
   - Rubriken är bara protokollets namn, i liten text. Raden med filnamn, projekt och antal objekt visas inte här.
   - Objektuppgifter ligger överst och är alltid infällda när ett objekt öppnas. Saknas något visar raden en varning.
   - Krysset (Till ritningen) visas inte; fliken Ritning leder tillbaka. Nyckeln (protokollverktygen) är oförändrad.
   Kontrollpunkter, protokollinnehåll, motor och PDF ändras inte. */
(()=>{
 'use strict';
 const root=document.documentElement,body=document.body;
 if(root.dataset.cfStampMode!=='revision'||!body||!body.classList.contains('allInOneApp')||body.dataset.revProtocol==='587')return;
 body.dataset.revProtocol='587';
 const $=id=>document.getElementById(id);
 const currentObject=()=>{try{return typeof cur==='function'?cur():null}catch(_){return null}};
 const protocolName=o=>{try{return (o&&typeof SYSTEMS!=='undefined'&&SYSTEMS[o.type]?.label)||''}catch(_){return ''}};

 // 1. Small heading with the open object's protocol name.
 let heading=null;
 function syncHeading(){
  const context=document.querySelector('.secAppHeader .cfHeaderContext');if(!context)return;
  if(!heading){heading=document.createElement('p');heading.className='revProtocolHeading';heading.setAttribute('aria-live','polite');context.append(heading);}
  const name=protocolName(currentObject());if(heading.textContent!==name)heading.textContent=name;
  heading.hidden=!name;
 }

 // 2. Objektuppgifter: closed whenever another object (or the protocol view) is opened, with a warning when something is missing.
 let lastUid=null,lastView=body.dataset.view,alert=null;
 const panel=()=>document.querySelector('#secForm details.protocolMetaPanel');
 function warnings(details){
  return [...details.querySelectorAll('.fieldError,#secAutomationIdMessage')].map(n=>n.textContent.trim()).filter(Boolean);
 }
 function syncWarning(){
  const details=panel();if(!details)return;
  const summary=details.querySelector(':scope>summary');if(!summary)return;
  if(!alert||!summary.contains(alert)){alert=document.createElement('span');alert.className='revMetaAlert';alert.hidden=true;alert.textContent='!';summary.append(alert);}
  const texts=warnings(details),show=!!texts.length&&!details.open;
  alert.hidden=!show;details.classList.toggle('revMetaHasWarning',!!texts.length);
  const label=show?'Uppgifter saknas: '+texts.join(' '):'';
  if(show){alert.title=label;alert.setAttribute('aria-label',label);alert.setAttribute('role','img');}
  else{alert.removeAttribute('title');alert.removeAttribute('aria-label');alert.removeAttribute('role');}
 }
 function collapse(){const details=panel();if(details&&details.open)details.open=false;syncWarning();}
 function afterShow(){
  const o=currentObject(),uid=o?.uid||null;
  if(uid&&uid!==lastUid)collapse();
  lastUid=uid;syncHeading();syncWarning();
 }
 if(typeof showSelected==='function'){
  const previous=showSelected;
  showSelected=function(...args){const result=previous.apply(this,args);afterShow();return result;};
 }
 document.addEventListener('toggle',event=>{if(event.target===panel())syncWarning();},true);
 const watchPanel=()=>{const details=panel();if(details&&!details.dataset.revWatched){details.dataset.revWatched='1';new MutationObserver(syncWarning).observe(details,{childList:true,characterData:true,subtree:true});}};
 new MutationObserver(()=>{
  const view=body.dataset.view;
  if(view!==lastView){if(view==='protocol')collapse();lastView=view;}
  syncHeading();
 }).observe(body,{attributes:true,attributeFilter:['data-view']});
 window.addEventListener('revision-work-loaded',()=>{lastUid=null;});
 watchPanel();syncHeading();syncWarning();
 window.RevisionProtocolView=Object.freeze({collapse,refresh:afterShow});
})();
