/* Scoped to the isolated SmartMatch test document. Existing dialog lifecycle
 * and forms are preserved; opted-in floating tools keep the drawing usable. */
(function(){
 'use strict';
 const show=HTMLDialogElement.prototype.show,close=HTMLDialogElement.prototype.close;
 const stack=[],floating=[],focusBefore=new WeakMap();
 function sync(){
  for(let i=stack.length-1;i>=0;i--)if(!stack[i].isConnected||!stack[i].open)stack.splice(i,1);
  for(let i=floating.length-1;i>=0;i--)if(!floating[i].isConnected||!floating[i].open)floating.splice(i,1);
  const active=stack.at(-1);document.body.classList.toggle('smHasWorkspaceView',!!active);
  for(const panel of stack){panel.classList.toggle('smInactiveView',panel!==active);panel.inert=panel!==active;}
  for(const panel of floating){panel.classList.toggle('smInactiveFloating',!!active);panel.inert=!!active;}
  for(const el of document.body.children)if(el.matches('header,main,section,aside'))el.inert=!!active;
  if(active&&!active.contains(document.activeElement)){
   const target=active.querySelector('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]');target?.focus({preventScroll:true});
  }
 }
 HTMLDialogElement.prototype.showModal=function(){
  if(this.open){sync();return;}
  if(this.dataset.smFloating==='true'){
   focusBefore.set(this,document.activeElement);this.classList.remove('smWorkspaceView','smInactiveView');this.setAttribute('aria-modal','false');
   show.call(this);floating.push(this);sync();return;
  }
  focusBefore.set(this,document.activeElement);this.classList.add('smWorkspaceView');this.setAttribute('aria-modal','false');
  show.call(this);stack.push(this);sync();
 };
 HTMLDialogElement.prototype.close=function(value){
  const wasTop=stack.at(-1)===this||(!stack.length&&floating.at(-1)===this);if(value===undefined)close.call(this);else close.call(this,value);sync();
  if(wasTop){const target=focusBefore.get(this);if(target?.isConnected&&!target.closest('[inert]'))target.focus({preventScroll:true});}
 };
 document.addEventListener('close',sync,true);
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||event.defaultPrevented)return;
  const active=stack.at(-1)||floating.at(-1);if(!active)return;
  event.preventDefault();const cancel=new Event('cancel',{cancelable:true});if(active.dispatchEvent(cancel))active.close();
 });
 async function confirm(message){
  const panel=document.createElement('dialog');panel.className='smInlineConfirmation';
  const title=document.createElement('h2');title.textContent='Bekräfta';const text=document.createElement('p');text.textContent=message;
  const buttons=document.createElement('div'),no=document.createElement('button'),yes=document.createElement('button');no.type=yes.type='button';no.textContent='Avbryt';yes.textContent='Fortsätt';buttons.append(no,yes);panel.append(title,text,buttons);document.body.append(panel);
  return new Promise(resolve=>{let accepted=false;no.onclick=()=>panel.close();yes.onclick=()=>{accepted=true;panel.close();};panel.addEventListener('close',()=>{panel.remove();resolve(accepted);},{once:true});panel.showModal();});
 }
 const labels={pwAddChecklistItem:'Punkt',pwAddExtraTime:'Tid',pwAddOrder:'Beställ',pwAddRemark:'Anmärk',pwChecklistMarkAll:'Alla',pwChecklistClearAll:'Rensa bockar',pwCardViewArea:'Visningsområde',pwProtocolFit:'Passa',pwProtocolBackToCard:'Dörrkort',pwRereadCard:'Läs om',labDiagnoseOpen:'Rapporter',pwBulkSelect:'Välj',pwTimeReport:'Tid',pwFit:'Passa',pwToolMenuButton:'Verktyg',};
 let scheduled=false;
 function compact(){
  scheduled=false;
  for(const [id,label]of Object.entries(labels)){
   const el=document.getElementById(id);if(!el)continue;
   if(!el.dataset.compactLabel){el.dataset.compactLabel='true';const original=el.textContent.trim();if(!el.title)el.title=original;if(!el.hasAttribute('aria-label'))el.setAttribute('aria-label',original);}
   // Counts and error messages are never shortened. Only these known controls.
   if(el.dataset.compactDone!==el.textContent){el.textContent=label;el.dataset.compactDone=el.textContent;}
  }
  for(const help of document.querySelectorAll('.smSaveReminder,.smToolHelp,.pwProtocolMouseHint,#pwChecklist>.rtInternalNote')){
   if(help.closest('.smCompactInfo')||!help.textContent.trim())continue;if(help.matches('#pwChecklist>.rtInternalNote')&&!help.textContent.trim().startsWith('Kontrollpunkterna gäller'))continue;
   if(help.classList.contains('smToolHelp')||help.classList.contains('pwProtocolMouseHint')){if(help.parentElement&&!help.parentElement.title)help.parentElement.title=help.textContent.trim();help.hidden=true;continue;}
   const details=document.createElement('details');details.className='smCompactInfo';const summary=document.createElement('summary');summary.textContent='Info';help.before(details);details.append(summary,help);
  }
  const icons={check:'m5 12 4 4 10-10',clear:'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7',add:'M12 5v14M5 12h14',clock:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',order:'M5 4h14v16H5zM8 8h8M8 12h8M8 16h4',edit:'m4 16 11-11 4 4-11 11H4z',shape:'M21 12a9 6 0 1 1-18 0 9 6 0 0 1 18 0',page:'M6 3h9l4 4v14H6zM14 3v5h5',link:'m9 15 6-6M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',eye:'M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0'};
  const controls=[['#pwChecklistMarkAll','check','Alla','Markera alla'],['#pwChecklistClearAll','clear','Avmarkera','Avmarkera alla kontrollpunkter'],['#pwAddChecklistItem','add','Punkt','Lägg till kontrollpunkt'],['#pwAddExtraTime','clock','Tid','Lägg till extra tid'],['#pwAddOrder','order','Beställning','Lägg till beställning'],['#pwAddRemark','edit','Notering','Lägg till anmärkning'],['#rtClearDoorWork','clear','Ta bort hela listan','Ta bort hela listan för denna dörr'],['#pwAllMarkerShapes','shape','Form','Form för alla markeringar'],['#pwCurrentPageOnly','page','Sidan','Aktuell sida'],['#exOpenExtraPositions','link','Koppla','Koppla stämplar'],['#pwHidePositions','eye','Dölj','Dölj positioner'],['.pmEditGroup','edit','Ändra','Ändra grupp'],['.pmDeleteGroup','clear','Ta bort','Ta bort alla i gruppen']];
  for(const [selector,icon,label,title] of controls)for(const el of document.querySelectorAll(selector)){
   if(el.querySelector('.smActionIcon'))continue;
   el.classList.add('smIconAction');el.title=title;if(!el.hasAttribute('aria-label'))el.setAttribute('aria-label',title);
   el.innerHTML='<svg class="smActionIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+icons[icon]+'"/></svg><span>'+label+'</span>';
   el.dataset.compactDone=el.textContent;
  }
  sync();
 }
 function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(compact);}
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['open']});
 document.addEventListener('DOMContentLoaded',schedule);window.SmartMatchCompactWorkspace={confirm,activeView:()=>stack.at(-1)?.id||null};
})();
