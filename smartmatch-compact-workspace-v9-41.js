/* Scoped to the isolated SmartMatch test document. Existing dialog lifecycle
 * and forms are preserved; views occupy the workspace, never the modal layer. */
(function(){
 'use strict';
 const show=HTMLDialogElement.prototype.show,close=HTMLDialogElement.prototype.close;
 const stack=[],focusBefore=new WeakMap();
 function sync(){
  for(let i=stack.length-1;i>=0;i--)if(!stack[i].isConnected||!stack[i].open)stack.splice(i,1);
  const active=stack.at(-1);document.body.classList.toggle('smHasWorkspaceView',!!active);
  for(const panel of stack){panel.classList.toggle('smInactiveView',panel!==active);panel.inert=panel!==active;}
  for(const el of document.body.children)if(el.matches('header,main,section,aside'))el.inert=!!active;
  if(active&&!active.contains(document.activeElement)){
   const target=active.querySelector('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]');target?.focus({preventScroll:true});
  }
 }
 HTMLDialogElement.prototype.showModal=function(){
  if(this.open){sync();return;}
  focusBefore.set(this,document.activeElement);this.classList.add('smWorkspaceView');this.setAttribute('aria-modal','false');
  show.call(this);stack.push(this);sync();
 };
 HTMLDialogElement.prototype.close=function(value){
  const wasTop=stack.at(-1)===this;if(value===undefined)close.call(this);else close.call(this,value);sync();
  if(wasTop){const target=focusBefore.get(this);if(target?.isConnected&&!target.closest('[inert]'))target.focus({preventScroll:true});}
 };
 document.addEventListener('close',sync,true);
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||event.defaultPrevented||!stack.length)return;
  event.preventDefault();const active=stack.at(-1),cancel=new Event('cancel',{cancelable:true});if(active.dispatchEvent(cancel))active.close();
 });
 async function confirm(message){
  const panel=document.createElement('dialog');panel.className='smInlineConfirmation';
  const title=document.createElement('h2');title.textContent='Bekräfta';const text=document.createElement('p');text.textContent=message;
  const buttons=document.createElement('div'),no=document.createElement('button'),yes=document.createElement('button');no.type=yes.type='button';no.textContent='Avbryt';yes.textContent='Fortsätt';buttons.append(no,yes);panel.append(title,text,buttons);document.body.append(panel);
  return new Promise(resolve=>{let accepted=false;no.onclick=()=>panel.close();yes.onclick=()=>{accepted=true;panel.close();};panel.addEventListener('close',()=>{panel.remove();resolve(accepted);},{once:true});panel.showModal();});
 }
 const labels={rtTitle:'Avläsning',rtZoomHelp:'Zooma med hjul eller två fingrar. Dra för att flytta.',pwAddChecklistItem:'Punkt',pwAddExtraTime:'Tid',pwAddOrder:'Beställ',pwAddRemark:'Anmärk',pwChecklistMarkAll:'Alla',pwChecklistClearAll:'Rensa bockar',pwCardViewArea:'Visningsområde',pwProtocolFit:'Passa',pwProtocolBackToCard:'Dörrkort',pwRereadCard:'Läs om',labDiagnoseOpen:'Rapporter',pwBulkSelect:'Välj',pwTimeReport:'Tid',pwFit:'Passa',pwToolMenuButton:'Verktyg',rtReviewNext:'Nästa fel',rtReviewContinue:'Fortsätt',rtCancel:'Tillbaka',rtReadProgressCancel:'Avbryt',rtDiscover:'Hitta kort',rtGoMatches:'Visa träffar'};
 let scheduled=false;
 function compact(){
  scheduled=false;
  for(const [id,label]of Object.entries(labels)){
   const el=document.getElementById(id);if(!el)continue;
   if(!el.dataset.compactLabel){el.dataset.compactLabel='true';const original=el.textContent.trim();if(!el.title)el.title=original;if(!el.hasAttribute('aria-label'))el.setAttribute('aria-label',original);}
   // Counts and error messages are never shortened. Only these known controls.
   if(el.dataset.compactDone!==el.textContent){el.textContent=label;el.dataset.compactDone=el.textContent;}
  }
  for(const help of document.querySelectorAll('.rtRailHelp,.rtSearchHelp,.rtSaveHelp,.smSaveReminder,.smToolHelp,.pwProtocolMouseHint,#pwChecklist>.rtInternalNote')){
   if(help.closest('.smCompactInfo')||!help.textContent.trim())continue;if(help.matches('#pwChecklist>.rtInternalNote')&&!help.textContent.trim().startsWith('Kontrollpunkterna gäller'))continue;
   if(help.classList.contains('smToolHelp')||help.classList.contains('pwProtocolMouseHint')){if(help.parentElement&&!help.parentElement.title)help.parentElement.title=help.textContent.trim();help.hidden=true;continue;}
   const details=document.createElement('details');details.className='smCompactInfo';const summary=document.createElement('summary');summary.textContent='Info';help.before(details);details.append(summary,help);
  }
  sync();
 }
 function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(compact);}
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['open']});
 document.addEventListener('DOMContentLoaded',schedule);window.SmartMatchCompactWorkspace={confirm,activeView:()=>stack.at(-1)?.id||null};
})();
