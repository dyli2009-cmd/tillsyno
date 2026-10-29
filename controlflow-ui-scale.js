/* Controlflow UI only. Never scale drawing coordinates, stamps or PDF output. */
(()=>{
 'use strict';
 const root=document.documentElement;
 if(root.dataset.controlflowUi!=='1')return;
 const KEY='tillsyno-controlflow-text-level-v1',FACTORS=[1,1.12,1.24,1.36,1.6,1.8,2];
 let saved=0;try{saved=Number(localStorage.getItem(KEY)??localStorage.getItem('doorservice-ui-text-level'))||0}catch(_){}
 let level=Math.max(0,Math.min(FACTORS.length-1,Math.round(saved)));
 const small='[data-app-text-smaller],#secProtocolTextSmaller,#secOverviewTextSmaller';
 const large='[data-app-text-larger],#secProtocolTextLarger,#secOverviewTextLarger';
 function controls(){
  document.querySelectorAll('.ta-page-version').forEach(el=>{const value='v'+root.dataset.appVersion;if(root.dataset.appVersion&&el.textContent!==value)el.textContent=value});
  document.querySelectorAll(small).forEach(b=>{b.disabled=level===0;b.setAttribute('aria-label','Mindre text i Kontrollflödet')});
  document.querySelectorAll(large).forEach(b=>{b.disabled=level===FACTORS.length-1;b.setAttribute('aria-label','Större text i Kontrollflödet')});
  document.querySelectorAll('[data-app-text-level]').forEach(el=>{const value=Math.round(FACTORS[level]*100)+'%';if(el.textContent!==value)el.textContent=value});
 }
 function apply(){
  root.style.setProperty('--cf-text-scale',String(FACTORS[level]));
  root.toggleAttribute('data-cf-large-text',level>=3);
  if(document.body)document.body.dataset.appTextSize=String(level);
  controls();
 }
 function set(value){level=Math.max(0,Math.min(FACTORS.length-1,Math.round(Number(value)||0)));try{localStorage.setItem(KEY,String(level))}catch(_){}apply();return level}
 document.addEventListener('click',event=>{
  const b=event.target.closest?.('button');if(!b)return;
  if(!b.matches(small)&&!b.matches(large))return;
  event.preventDefault();event.stopImmediatePropagation();set(level+(b.matches(large)?1:-1));
 },true);
 window.AppTextScale={get:()=>level,set,increase:()=>set(level+1),decrease:()=>set(level-1),apply};
 apply();
 function start(){
  apply();new MutationObserver(controls).observe(document.body,{childList:true,subtree:true});
  const tools=document.querySelector('.allInOneProtocolTools');
  if(tools){
   const menu=document.createElement('details');menu.className='cfAddMenu';
   const summary=document.createElement('summary');summary.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Lägg till objekt</span><span aria-hidden="true">⌃</span>';
   menu.append(summary);tools.before(menu);menu.append(tools);
   const query=matchMedia('(max-width:800px)');
   function layout(){const compact=query.matches||root.dataset.tillsynoDevice==='phone';menu.dataset.compact=String(compact);menu.open=!compact;}
   query.addEventListener('change',layout);new MutationObserver(layout).observe(root,{attributes:true,attributeFilter:['data-tillsyno-device']});layout();
   tools.addEventListener('click',e=>{if(e.target.closest('[data-add]')&&menu.dataset.compact==='true')menu.open=false});
   menu.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.dataset.compact==='true'){menu.open=false;summary.focus();}});
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
