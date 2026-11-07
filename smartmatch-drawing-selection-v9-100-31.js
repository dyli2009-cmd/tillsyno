/* One selection and one double-tap rule for mouse, pen and touch. */
(function(root,factory){const create=factory();if(typeof module==='object'&&module.exports)module.exports=create;else root.SmartMatchDrawingSelection=create(root.document)})(typeof window==='undefined'?null:window,function(){
 'use strict';
 return function create(doc){
  let current=null,lastTap=null,button=null,busy=false;
  function paint(){
   if(!button)return;button.parentElement?.classList.toggle('smHasSelection',!!current?.remove);button.hidden=!current?.remove;button.disabled=busy||!current?.remove;
   button.title=current?.label?'Ta bort '+current.label:'Ta bort markerat';
   button.setAttribute('aria-label',button.title);
  }
  function clear(prefix){
   if(prefix&&!current?.key.startsWith(prefix))return;
   const old=current;current=null;lastTap=null;
   doc?.querySelectorAll('[data-sm-selected]').forEach(node=>delete node.dataset.smSelected);
   old?.clear?.();paint();
  }
  function select(value){
   if(current?.key!==value.key)clear();
   current=value;paint();
  }
  function refresh(){if(current?.valid&&!current.valid())clear();else paint();}
  function attach(key,node){if(current?.key===key)node.dataset.smSelected='true';}
  function activate(key,event,open,time=Date.now()){
   // Keyboard and assistive activation stay immediate. Touch click detail can
   // remain 1 for both taps, so use identity + time rather than dblclick alone.
   if(event?.detail===0){lastTap=null;open();return true;}
   const previous=lastTap;lastTap={key,time,x:event?.clientX,y:event?.clientY};
   const near=!Number.isFinite(previous?.x)||!Number.isFinite(event?.clientX)||Math.hypot(previous.x-event.clientX,previous.y-event.clientY)<24;
   if(previous?.key===key&&time-previous.time>=0&&time-previous.time<=420&&near){lastTap=null;open();return true;}
   return false;
  }
  async function remove(){
   refresh();if(busy||!current?.remove)return;const chosen=current;busy=true;paint();
   try{await chosen.remove();refresh();}finally{busy=false;paint();}
  }
  function bind(node){button=node;button.onclick=()=>void remove();paint();}
  function resetTap(){lastTap=null;}
  return {select,clear,refresh,attach,activate,remove,bind,resetTap,get key(){return current?.key||''}};
 };
});
