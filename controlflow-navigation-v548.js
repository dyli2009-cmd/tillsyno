/* v2.4.548: shared navigation presentation. Existing controls and handlers stay in use. */
(()=>{
 'use strict';
 function normalizeReadyStatus(text,isError){
  return isError?text:text.replace(/^Ritningen är klar\.(?:\s+Ritningen är klar\.)+/,'Ritningen är klar.');
 }
 function start(){
  if(!document.body.classList.contains('allInOneApp')||document.body.dataset.cfNavigation==='548')return;
  document.body.dataset.cfNavigation='548';
  function move(node,parent,before=null){
   if(!node||!parent||(node.parentNode===parent&&node.nextSibling===before))return;
   const focused=document.activeElement,restore=focused&&node.contains(focused);
   parent.insertBefore(node,before);
   if(restore&&document.activeElement!==focused)focused.focus({preventScroll:true});
  }
  function label(button,text,className){
   if(!button)return null;
   let node=[...button.children].find(child=>child.tagName==='SPAN'&&!child.classList.contains('ta-inline-icon'));
   if(!node){node=document.createElement('span');button.append(node);}
   if(node.textContent!==text)node.textContent=text;
   if(className)node.classList.add(className);
   return node;
  }
  const header=document.querySelector('.secAppHeader'),actions=header?.querySelector('.headerActions');
  if(header&&actions){
   const home=header.querySelector('.homeIconLink'),brand=header.querySelector('.brand'),details=header.querySelector('.headerDetails');
   const preview=document.getElementById('securityPreview'),exportButton=document.getElementById('securityExport');
   const homeSlot=document.createElement('div');homeSlot.className='cfHeaderHomeSlot';header.prepend(homeSlot);move(home,homeSlot);
   const context=document.createElement('div');context.className='cfHeaderContext';header.insertBefore(context,actions);move(brand,context);move(details,context);
   const primary=document.createElement('div');primary.className='cfPrimaryActions';actions.append(primary);move(preview,primary);move(exportButton,primary);
   if(home){home.setAttribute('aria-label','Hem');home.title='Hem';}
   if(exportButton){label(exportButton,'PDF');exportButton.setAttribute('aria-label','Spara PDF');exportButton.title='Spara PDF';}
   if(preview){
    label(preview,'Kundmall','cfActionFull');preview.setAttribute('aria-label','Kundmall');preview.title='Kundmall';
    const compact=document.createElement('span');compact.className='cfActionCompact';compact.textContent='Mall';compact.setAttribute('aria-hidden','true');preview.append(compact);
   }
   header.classList.add('cfNavigationHeader');
   // Workspace setup can append the existing file controls after this script.
   // Only watch that action container, and move the original pair when necessary.
   function arrange(){
    if(home&&home.parentNode!==homeSlot)move(home,homeSlot);
    if(preview&&preview.parentNode!==primary)move(preview,primary,primary.firstChild);
    if(exportButton&&(exportButton.parentNode!==primary||exportButton.nextSibling))move(exportButton,primary);
    if(primary.parentNode!==actions||primary.nextSibling)move(primary,actions);
   }
   new MutationObserver(arrange).observe(actions,{childList:true});arrange();
  }

  const dialog=document.getElementById('allProtocolDialog'),back=document.getElementById('allFolderBack'),lead=document.getElementById('allProtocolLead');
  if(back){back.textContent='‹ Alla områden';back.setAttribute('aria-label','Tillbaka till alla områden');back.title='Tillbaka till alla områden';}
  if(dialog){
   let previousStage=dialog.dataset.stage,lastSummary=null,pendingFocus=null;
   function syncStage(){
    const stage=dialog.dataset.stage;
    if(stage==='folders'&&lead&&lead.textContent!=='Välj ett område för att se checklistorna.')lead.textContent='Välj ett område för att se checklistorna.';
    if(stage!==previousStage){
     const target=pendingFocus==='back'?back:pendingFocus==='summary'?lastSummary:null;
     if(target&&dialog.open&&!dialog.hidden&&!target.hidden&&target.getClientRects().length)target.focus({preventScroll:true});
     pendingFocus=null;previousStage=stage;
    }
   }
   // Capture the native activation before the existing stage handler hides its control.
   dialog.addEventListener('click',event=>{
    const summary=event.target.closest?.('.allProtocolGroup > summary');
    if(summary&&dialog.dataset.stage==='folders'){lastSummary=summary;pendingFocus='back';}
    else if(back&&(event.target===back||back.contains(event.target)))pendingFocus='summary';
   },true);
   dialog.addEventListener('cancel',()=>{if(dialog.dataset.stage==='folder')pendingFocus='summary';},true);
   new MutationObserver(syncStage).observe(dialog,{attributes:true,attributeFilter:['data-stage']});syncStage();
  }

  const emptyHeading=document.querySelector('#secEmpty h1');
  if(emptyHeading){
   const syncEmpty=()=>{if(emptyHeading.textContent!=='Välj ritning')emptyHeading.textContent='Välj ritning';};
   // Both protocol runtimes also update this heading when selections change.
   new MutationObserver(syncEmpty).observe(emptyHeading,{childList:true,characterData:true,subtree:true});syncEmpty();
  }
  const message=document.getElementById('securityMessage');
  if(message){
   const syncStatus=()=>{
    const text=message.textContent,normalized=normalizeReadyStatus(text,message.classList.contains('error'));
    if(normalized!==text)message.textContent=normalized;
   };
   // Only collapse repeated ready prefixes; all remaining status text stays intact.
   new MutationObserver(syncStatus).observe(message,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});syncStatus();
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
