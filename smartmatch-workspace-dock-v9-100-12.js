/* SmartMatch: shared drawing controls, touch targets and floating tools. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 let more,moreButton,readActions;
 function closeMore(focus=false){if(!more)return;more.hidden=true;moreButton.setAttribute('aria-expanded','false');if(focus)moreButton.focus();}
 function positionMore(){
  if(!more||more.hidden)return;
  const r=moreButton.getBoundingClientRect(),v=window.visualViewport,w=v?.width||innerWidth,h=v?.height||innerHeight;
  const width=Math.min(300,w-16),left=Math.max(8,Math.min(r.right-width,w-width-8));
  Object.assign(more.style,{left:left+'px',width:width+'px',bottom:Math.max(8,h-r.top+8)+'px',maxHeight:Math.max(120,r.top-16)+'px'});
 }
 function syncReadActions(){
  if(!more)return;
  const review=$('pwDeferredCards');if(review&&review.parentNode!==more)more.insertBefore(review,$('labDiagnoseOpen'));
  for(const id of ['rtOpenSettings','pwProjectMaterialButton']){
   const e=$(id);if(e&&e.parentNode!==readActions)readActions.append(e);
  }
  for(const id of ['pwReadContinueProducts','rtMenuProducts']){
   const e=$(id);if(e&&e.parentNode!==more)more.insertBefore(e,$('labDiagnoseOpen'));
  }
 }
 function makeFloating(panel,selector){
  if(window.SmartMatchWindows){window.SmartMatchWindows.prepare(panel);return;}
  const handle=panel.querySelector(selector);if(!handle||handle.dataset.dockDrag)return;
  handle.dataset.dockDrag='true';handle.classList.add('smDockDragHandle');handle.tabIndex=0;handle.setAttribute('aria-label','Flytta fönstret. Dra eller använd piltangenter.');
  let drag=null;
  const phone=()=>matchMedia('(max-width:620px)').matches;
  function place(x,y){
   if(phone()){panel.style.removeProperty('--sm-popup-left');panel.style.removeProperty('--sm-popup-top');return;}
   const v=window.visualViewport,w=v?.width||innerWidth,h=v?.height||innerHeight,r=panel.getBoundingClientRect();
   panel.style.setProperty('--sm-popup-left',Math.max(8,Math.min(x,w-r.width-8))+'px');panel.style.setProperty('--sm-popup-top',Math.max(8,Math.min(y,h-r.height-8))+'px');
  }
  handle.addEventListener('pointerdown',e=>{if(phone()||e.target.closest('button,input,select,a')||e.button>0)return;const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};handle.setPointerCapture(e.pointerId);e.preventDefault();});
  handle.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)place(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,e=>{if(drag?.id===e.pointerId)drag=null;});
  handle.addEventListener('keydown',e=>{if(e.target!==handle||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||phone())return;e.preventDefault();const r=panel.getBoundingClientRect(),step=e.shiftKey?40:10;place(r.left+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),r.top+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));});
  const keepVisible=()=>{if(panel.open){const r=panel.getBoundingClientRect();place(r.left,r.top);}};
  addEventListener('resize',keepVisible);window.visualViewport?.addEventListener('resize',keepVisible);
 }
 function init(){
  const toolbar=document.querySelector('.pwToolbar'),work=document.querySelector('.pwToolbarWork'),nav=document.querySelector('.pwBottomNav');
  if(!toolbar||!work||!nav)return;
  document.body.classList.add('smDockWorkspace');
  readActions=document.createElement('div');readActions.id='smReadOnlyActions';readActions.hidden=true;document.body.append(readActions);
  more=document.createElement('div');more.id='smMoreMenu';more.hidden=true;more.setAttribute('role','dialog');more.setAttribute('aria-label','Övrigt');
  moreButton=document.createElement('button');moreButton.id='smMoreButton';moreButton.type='button';moreButton.setAttribute('aria-haspopup','dialog');moreButton.setAttribute('aria-controls',more.id);moreButton.setAttribute('aria-expanded','false');
  // More-horizontal glyph in the application's existing outline icon language.
  moreButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg><span class="smToolbarLabel">Övrigt</span>';
  const moreWrap=document.createElement('div');moreWrap.className='smMoreWrap';moreWrap.append(moreButton);document.body.append(more);
  const link=$('exOpenExtra');link.querySelector('span').textContent='Koppla stämplar';
  for(const id of ['exOpenExtra','labDiagnoseOpen','pwToolLegend','rtEditPreparation']){const e=$(id);if(e)more.append(e);}
  for(const id of ['pwTextCheckOpen','pwDALinkTool']){const tool=$(id);if(!tool)continue;tool.querySelector('svg')?.classList.add('smToolSvg');tool.querySelector('span')?.classList.add('smToolLabel');$('pwToolMenu').append(tool);tool.addEventListener('click',()=>{$('pwToolMenu').hidden=true;$('pwToolMenuButton').setAttribute('aria-expanded','false');});}
  more.addEventListener('click',e=>{if(e.target.closest('button')&&!e.target.closest('button').disabled)closeMore();},true);
  moreButton.onclick=()=>{const opening=more.hidden;$('pwToolMenu').hidden=true;$('pwToolMenuButton').setAttribute('aria-expanded','false');more.hidden=!opening;moreButton.setAttribute('aria-expanded',String(opening));if(opening)positionMore();};
  $('pwToolMenuButton').addEventListener('click',()=>closeMore());
  document.addEventListener('pointerdown',e=>{if(!more.hidden&&!more.contains(e.target)&&!moreButton.contains(e.target))closeMore();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!more.hidden){e.preventDefault();e.stopPropagation();closeMore(true);}},true);
  more.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;const buttons=[...more.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled),index=buttons.indexOf(document.activeElement);if(!buttons.length)return;e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();});
  const history=document.querySelector('.pwToolHistory'),left=document.createElement('div'),right=document.createElement('div');left.className='smDockLeft';right.className='smDockRight';
  const remove=$('pwToolDelete').cloneNode(true);remove.id='pwContextDelete';remove.hidden=true;remove.querySelector('small')?.remove();window.SmartMatchDrawingSelection?.bind(remove);
  left.append(history,$('pwFit'),remove);readActions.append($('pwToolDelete'));right.append(document.querySelector('.pwBottomPages'),document.querySelector('.pwBottomZoom'));
  const wrap=$('pwToolMenuButton').closest('.pwToolWrap');
  syncReadActions();work.replaceChildren($('pwBulkSelect'),wrap,$('pwTimeReport'),moreWrap);nav.replaceChildren(left,toolbar,right);
  for(const id of ['pwProtocol','pwTimeDialog']){const p=$(id);if(p)p.dataset.smFloating='true';}
  addEventListener('resize',positionMore);window.visualViewport?.addEventListener('resize',positionMore);
 }
 window.SmartMatchWorkspaceDock={syncReadActions,makeFloating};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
