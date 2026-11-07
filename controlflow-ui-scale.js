/* Controlflow UI only. Never scale drawing coordinates, stamps or PDF output. */
(()=>{
 'use strict';
 const root=document.documentElement;
 if(root.dataset.controlflowUi!=='1')return;
 const KEY='tillsyno-controlflow-text-level-v1',FACTORS=[1,1.12,1.24,1.36,1.6,1.8,2];
 // The old workspace preference scaled document panels, not this entire UI.
 // Only an explicit choice made in the current Controlflow controls may enlarge
 // the header, chooser and tabs. Leave the legacy preference for other modules.
 function normalize(value){const number=Number(value);return Number.isFinite(number)?Math.max(0,Math.min(FACTORS.length-1,Math.round(number))):0}
 function readSaved(fallback=0){try{return normalize(localStorage.getItem(KEY))}catch(_){return fallback}}
 let level=readSaved(),unsaved=false;
 const small='[data-app-text-smaller],#secProtocolTextSmaller,#secOverviewTextSmaller';
 const large='[data-app-text-larger],#secProtocolTextLarger,#secOverviewTextLarger';
 const reset='[data-app-text-reset]';
 function ensureResetControls(){
  document.querySelectorAll('.historyTextControls').forEach(group=>{
   if(group.querySelector(reset))return;
   const button=document.createElement('button');button.type='button';button.className='historyTextButton cfTextReset';
   button.setAttribute('data-app-text-reset','');button.setAttribute('data-app-text-level','');
   group.insertBefore(button,group.querySelector(large));
  });
  const head=document.querySelector('#allProtocolDialog .allProtocolHead');
  if(head&&!head.querySelector(reset)){
   const button=document.createElement('button');button.type='button';button.className='cfChooserTextReset';
   button.setAttribute('data-app-text-reset','');head.append(button);
  }
 }
 function controls(){
  ensureResetControls();
  document.querySelectorAll('.ta-page-version').forEach(el=>{const value='v'+root.dataset.appVersion;if(root.dataset.appVersion&&el.textContent!==value)el.textContent=value});
  document.querySelectorAll(small).forEach(b=>{b.disabled=level===0;b.setAttribute('aria-label','Mindre text i Kontrollflödet')});
  document.querySelectorAll(large).forEach(b=>{b.disabled=level===FACTORS.length-1;b.setAttribute('aria-label','Större text i Kontrollflödet')});
  const percent=Math.round(FACTORS[level]*100)+'%';
  document.querySelectorAll('[data-app-text-level]').forEach(el=>{if(el.textContent!==percent)el.textContent=percent});
  document.querySelectorAll(reset).forEach(button=>{
   button.disabled=level===0;button.title='Återställ textstorlek till 100%';
   button.setAttribute('aria-label','Textstorlek '+percent+'. Återställ till 100 procent');
   if(button.classList.contains('cfChooserTextReset')){
    button.hidden=level===0;const text='Text '+percent+' · Återställ';
    if(button.textContent!==text)button.textContent=text;
   }
  });
 }
 function apply(){
  root.style.setProperty('--cf-text-scale',String(FACTORS[level]));
  root.toggleAttribute('data-cf-large-text',level>=3);
  if(document.body)document.body.dataset.appTextSize=String(level);
  controls();
 }
 function set(value){level=normalize(value);try{localStorage.setItem(KEY,String(level));unsaved=false}catch(_){unsaved=true}apply();return level}
 function restoreSaved(){if(!unsaved)level=readSaved(level);apply()}
 // A page restored from browser history must not revive an older text level.
 window.addEventListener('pageshow',restoreSaved);
 window.addEventListener('storage',event=>{
  if(event.key!==KEY&&event.key!==null)return;
  try{if(event.storageArea!==localStorage)return}catch(_){return}
  restoreSaved();
 });
 document.addEventListener('click',event=>{
  const b=event.target.closest?.('button');if(!b)return;
  if(!b.matches(small)&&!b.matches(large)&&!b.matches(reset))return;
  event.preventDefault();event.stopImmediatePropagation();
  const chooser=b.classList.contains('cfChooserTextReset')?b.closest('dialog'):null;
  set(b.matches(reset)?0:level+(b.matches(large)?1:-1));
  if(chooser)chooser.focus({preventScroll:true});
 },true);
 window.AppTextScale={get:()=>level,set,reset:()=>set(0),increase:()=>set(level+1),decrease:()=>set(level-1),apply};
 apply();
 function start(){
  apply();new MutationObserver(controls).observe(document.body,{childList:true,subtree:true});
  const tools=document.querySelector('.allInOneProtocolTools');
  if(tools){
   const menu=document.createElement('details');menu.className='cfAddMenu';
   const summary=document.createElement('summary');summary.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Lägg till objekt</span><span aria-hidden="true">⌃</span>';
   menu.append(summary);tools.before(menu);menu.append(tools);
   // The wrapper replaces the old flex item. Keep the popup inside the
   // visible drawing instead of letting it reach behind the header.
   const viewer=document.getElementById('secViewer');
   function fitMenu(){if(viewer)menu.style.setProperty('--cf-add-max-height',Math.max(44,viewer.clientHeight-8)+'px');}
   if(viewer&&typeof ResizeObserver!=='undefined')new ResizeObserver(fitMenu).observe(viewer);
   window.addEventListener('resize',fitMenu);
   menu.addEventListener('toggle',fitMenu);
   fitMenu();
   const query=matchMedia('(max-width:800px)');
   function layout(){const compact=query.matches||root.dataset.tillsynoDevice==='phone';root.toggleAttribute('data-cf-phone-ui',compact);menu.dataset.compact=String(compact);menu.open=!compact;}
   query.addEventListener('change',layout);new MutationObserver(layout).observe(root,{attributes:true,attributeFilter:['data-tillsyno-device']});layout();
   tools.addEventListener('click',e=>{if(e.target.closest('[data-add]')&&menu.dataset.compact==='true')menu.open=false});
   menu.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.dataset.compact==='true'){menu.open=false;summary.focus();}});
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

