/* Global readable text size for the Doorservice workspace. */
(()=>{
 'use strict';
 const KEY='doorservice-ui-text-level',MIN=-1,MAX=3;
 const FACTORS={[-1]:.90,0:1,1:1.12,2:1.24,3:1.36};
 const SMALL_IDS=new Set(['protocolTextSmaller','overviewTextSmaller','secProtocolTextSmaller','secOverviewTextSmaller']);
 const LARGE_IDS=new Set(['protocolTextLarger','overviewTextLarger','secProtocolTextLarger','secOverviewTextLarger']);
 const legacyKeys=['doorservice-protocol-size','doorservice-overview-size','doorservice-security-overview-size'];
 let initial=localStorage.getItem(KEY);
 if(initial===null){
  const legacy=legacyKeys.map(k=>localStorage.getItem(k)).filter(v=>v!==null).map(Number).find(Number.isFinite);
  initial=Number.isFinite(legacy)?String(legacy):'0'
 }
 let level=Math.max(MIN,Math.min(MAX,Number(initial)||0)),timer=null,applying=false;
 // Clear old per-view levels before the older view scripts read them.
 legacyKeys.forEach(k=>localStorage.setItem(k,'0'));
 const managed=new Map();
 const WORK_AREAS='#protocolPanel,#overviewDialog,#projectPanel,#securityProtocol,#securityOverview,#securityProject';
 const excluded=el=>!!el.closest?.('header.appHeader,.sessionHistoryBar,.appHome,.objectBar,#drawingEmpty,#secEmpty,#mobileBar,.pagebar,.drawingTools,.securityTools,#stage,#secStage,#customerPreviewCanvasWrap,#secPreviewWrap,svg,canvas,script,style,noscript');
 const eligible=el=>el instanceof HTMLElement&&!!el.closest?.(WORK_AREAS)&&!excluded(el)&&!['SCRIPT','STYLE','META','LINK'].includes(el.tagName);
 function restoreOriginals(){
  for(const [el,data] of managed){
   if(!el.isConnected){managed.delete(el);continue}
   el.style.fontSize=data.inline
  }
 }
 function discover(){
  document.querySelectorAll('body *').forEach(el=>{
   if(!eligible(el)||managed.has(el))return;
   managed.set(el,{inline:el.style.fontSize||''})
  })
 }
 function updateControls(){
  const small=[...document.querySelectorAll('[data-app-text-smaller]'),...SMALL_IDS.values()].map(x=>typeof x==='string'?document.getElementById(x):x).filter(Boolean);
  const large=[...document.querySelectorAll('[data-app-text-larger]'),...LARGE_IDS.values()].map(x=>typeof x==='string'?document.getElementById(x):x).filter(Boolean);
  small.forEach(b=>{b.disabled=level<=MIN;b.setAttribute('aria-label','Mindre text i hela arbetsytan')});
  large.forEach(b=>{b.disabled=level>=MAX;b.setAttribute('aria-label','Större text i hela arbetsytan')});
  document.querySelectorAll('[data-app-text-level]').forEach(el=>el.textContent=level===0?'100%':Math.round(FACTORS[level]*100)+'%')
 }
 function apply(){
  if(applying||!document.body)return;applying=true;
  restoreOriginals();discover();
  const factor=FACTORS[level]||1;
  for(const [el] of managed){
   if(!el.isConnected||!eligible(el))continue;
   const px=parseFloat(getComputedStyle(el).fontSize),baseFactor=el.closest?.('#securityProtocol')&&document.body.classList.contains('allInOneApp')?0.82:el.closest?.('#securityProtocol')?0.90:1;
   if(Number.isFinite(px)&&px>0)el.style.fontSize=(Math.round(px*factor*baseFactor*100)/100)+'px'
  }
  document.body.dataset.appTextSize=String(level);
  localStorage.setItem(KEY,String(level));
  // Retire the old per-view text settings so they cannot double-scale the workspace.
  legacyKeys.forEach(k=>localStorage.setItem(k,'0'));
  updateControls();applying=false
 }
 function set(next){level=Math.max(MIN,Math.min(MAX,Number(next)||0));apply();return level}
 function schedule(){clearTimeout(timer);timer=setTimeout(apply,40)}
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('button');if(!button)return;
  const smaller=button.matches('[data-app-text-smaller]')||SMALL_IDS.has(button.id);
  const larger=button.matches('[data-app-text-larger]')||LARGE_IDS.has(button.id);
  if(!smaller&&!larger)return;
  event.preventDefault();event.stopImmediatePropagation();
  set(level+(larger?1:-1))
 },true);
 window.AppTextScale={get:()=>level,set,increase:()=>set(level+1),decrease:()=>set(level-1),apply};
 const start=()=>{
  apply();
  new MutationObserver(m=>{if(m.some(x=>x.addedNodes.length||x.removedNodes.length))schedule()}).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(apply,180),{passive:true})
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
})();
