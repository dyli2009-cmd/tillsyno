/* Projektering 2.10: local, desktop-only pane widths; project data is unchanged. */
(function(root){
 'use strict';
 const STORAGE_KEY='tillsyno-projektering-layout-v1';
 const DEFAULTS=Object.freeze({library:230,card:420});
 const MIN=Object.freeze({library:180,card:320}),MAX=Object.freeze({library:460,card:680});
 const clamp=(value,min,max)=>Math.min(Math.max(value,min),Math.max(min,max));
 function create(options={}){
  const document=root.document,workspace=options.workspace||document?.getElementById('projectWorkspace')||document?.querySelector('.workspace');
  if(!workspace)return null;
  if(workspace.__proj2Layout)return workspace.__proj2Layout;
  const body=document.body,left=document.getElementById('resizeLibraryPane'),right=document.getElementById('resizeCardPane');
  if(!body||!left||!right)return null;
  const media=root.matchMedia('(min-width:1100px) and (hover:hover) and (pointer:fine)');
  let desired={...DEFAULTS},actual={...DEFAULTS},enabled=false,destroyed=false,frame=0,gesture=null,lastHeight=0;
  const listeners=[];
  function listen(target,event,handler,settings){target.addEventListener(event,handler,settings);listeners.push(()=>target.removeEventListener(event,handler,settings));}
  try{
   const raw=JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'null');
   if(raw&&typeof raw==='object')for(const key of ['library','card'])if(Number.isFinite(raw[key]))desired[key]=clamp(raw[key],MIN[key],MAX[key]);
  }catch(_){}
  function manualCompact(){
   return [document.documentElement,body].some(node=>{
    for(const key of ['data-device','data-device-mode','data-ui-device','data-device-override'])if(/^(phone|tablet)$/i.test(node.getAttribute(key)||''))return true;
    return /(?:^|\s)(?:device-|device-mode-|ui-device-)(?:phone|tablet)(?:\s|$)/i.test(node.className||'');
   });
  }
  function capacity(){const style=root.getComputedStyle(workspace);return Math.max(0,workspace.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)-24-300);}
  function updateAccessibility(){
   for(const [node,key]of [[left,'library'],[right,'card']]){
    node.tabIndex=enabled&&body.dataset.view!=='materials'?0:-1;
    const other=key==='library'?'card':'library';
    node.setAttribute('aria-valuemin',String(MIN[key]));
    node.setAttribute('aria-valuemax',String(Math.round(enabled?Math.max(MIN[key],Math.min(MAX[key],capacity()-actual[other])):MAX[key])));
    node.setAttribute('aria-valuenow',String(Math.round(actual[key])));
    node.setAttribute('aria-valuetext',Math.round(actual[key])+' pixlar');
   }
  }
  function apply(){
   if(destroyed)return;
   const nextEnabled=media.matches&&!manualCompact();
   if(!nextEnabled&&gesture)finish(false);
   enabled=nextEnabled;
   if(enabled){
    body.dataset.paneLayout='desktop';
    const total=capacity();
    actual.library=clamp(desired.library,MIN.library,Math.min(MAX.library,total-MIN.card));
    actual.card=clamp(desired.card,MIN.card,Math.min(MAX.card,total-actual.library));
    workspace.style.setProperty('--p2-library-width',actual.library+'px');
    workspace.style.setProperty('--p2-card-width',actual.card+'px');
    const top=workspace.getBoundingClientRect().top+root.scrollY;
    const height=Math.max(420,Math.round(root.innerHeight-top-16));
    if(height!==lastHeight){lastHeight=height;workspace.style.setProperty('--p2-workspace-height',height+'px');}
   }else{
    delete body.dataset.paneLayout;
    workspace.style.removeProperty('--p2-library-width');workspace.style.removeProperty('--p2-card-width');workspace.style.removeProperty('--p2-workspace-height');lastHeight=0;
   }
   updateAccessibility();
   options.onResize?.({...actual,enabled});
  }
  function schedule(){if(!destroyed&&!frame)frame=root.requestAnimationFrame(()=>{frame=0;apply();});}
  function save(){try{root.localStorage.setItem(STORAGE_KEY,JSON.stringify(desired));}catch(_){};}
  function finish(commit){
   if(!gesture)return;
   const current=gesture;gesture=null;
   if(!commit)desired={...current.desired};
   try{if(current.node.hasPointerCapture(current.pointerId))current.node.releasePointerCapture(current.pointerId);}catch(_){}
   delete body.dataset.paneResizing;
   if(frame){root.cancelAnimationFrame(frame);frame=0;}apply();if(commit)save();
  }
  function start(event,key,node){
   if(!enabled||body.dataset.view==='materials'||event.button!==0||gesture)return;
   event.preventDefault();
   gesture={key,node,pointerId:event.pointerId,start:event.clientX,actual:{...actual},desired:{...desired}};
   body.dataset.paneResizing='true';
   try{node.setPointerCapture(event.pointerId);}catch(_){}
  }
  function move(event){
   if(!gesture||event.pointerId!==gesture.pointerId)return;
   event.preventDefault();const g=gesture,delta=event.clientX-g.start,other=g.key==='library'?'card':'library';
   desired[g.key]=clamp(g.actual[g.key]+delta*(g.key==='library'?1:-1),MIN[g.key],Math.min(MAX[g.key],capacity()-g.actual[other]));schedule();
  }
  function keyboard(event,key){
   if(enabled&&body.dataset.view!=='materials'&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopPropagation();return;}
   if(!enabled||body.dataset.view==='materials'||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();event.stopPropagation();const other=key==='library'?'card':'library',max=Math.min(MAX[key],capacity()-actual[other]);
   const delta=(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?40:16)*(key==='library'?1:-1);
   desired[key]=event.key==='Home'?MIN[key]:event.key==='End'?max:clamp(actual[key]+delta,MIN[key],max);
   apply();save();
  }
  for(const [node,key]of [[left,'library'],[right,'card']]){
   listen(node,'pointerdown',event=>start(event,key,node));
   listen(node,'pointermove',move);
   listen(node,'pointerup',event=>{if(gesture?.pointerId===event.pointerId)finish(true);});
   listen(node,'pointercancel',event=>{if(gesture?.pointerId===event.pointerId)finish(false);});
   listen(node,'lostpointercapture',()=>{if(gesture?.node===node)finish(false);});
   listen(node,'keydown',event=>keyboard(event,key));
   listen(node,'dblclick',()=>api.reset());
  }
  listen(root,'resize',schedule);listen(root,'blur',()=>finish(false));
  listen(root,'keydown',event=>{if(event.key==='Escape'&&gesture){event.preventDefault();event.stopPropagation();finish(false);}},true);
  if(media.addEventListener)listen(media,'change',schedule);else if(media.addListener){media.addListener(schedule);listeners.push(()=>media.removeListener(schedule));}
  const observer=typeof root.ResizeObserver==='function'?new root.ResizeObserver(schedule):null;
  for(const node of [workspace,document.querySelector('.app-header'),document.querySelector('.project-bar'),document.querySelector('.workspace-tabs')])if(node)observer?.observe(node);
  const mutation=typeof root.MutationObserver==='function'?new root.MutationObserver(schedule):null;
  const attributes=['class','data-device','data-device-mode','data-ui-device','data-device-override','data-view'];
  mutation?.observe(body,{attributes:true,attributeFilter:attributes});mutation?.observe(document.documentElement,{attributes:true,attributeFilter:attributes});
  const api=Object.freeze({
   snapshot:()=>({enabled,desired:{...desired},widths:{...actual},resizing:!!gesture,storageKey:STORAGE_KEY}),
   reset:()=>{desired={...DEFAULTS};apply();save();},
   destroy:()=>{if(destroyed)return;finish(false);destroyed=true;if(frame)root.cancelAnimationFrame(frame);observer?.disconnect();mutation?.disconnect();listeners.splice(0).forEach(remove=>remove());delete body.dataset.paneLayout;delete body.dataset.paneResizing;for(const property of ['--p2-library-width','--p2-card-width','--p2-workspace-height'])workspace.style.removeProperty(property);left.tabIndex=-1;right.tabIndex=-1;delete workspace.__proj2Layout;}
  });
  workspace.__proj2Layout=api;apply();return api;
 }
 const api={create,STORAGE_KEY,instance:null};root.Proj2Layout=api;
 const boot=()=>{api.instance=create();};
 if(root.document?.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof window==='object'?window:globalThis);
