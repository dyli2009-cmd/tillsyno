/* Floating digital door-card window. Geometry is session-only; no project data. */
(function(root){
  'use strict';
  function create({dialog,handle,maximize,onChange}){
    let rect=null,restoreRect=null,maximized=false,gesture=null;
    const compact=()=>root.innerWidth<760;
    const limit=(v,min,max)=>Math.min(Math.max(v,min),Math.max(min,max));
    function fit(box){
      const width=limit(box.width,Math.min(620,root.innerWidth-16),root.innerWidth-16);
      const height=limit(box.height,Math.min(360,root.innerHeight-16),root.innerHeight-16);
      return {width,height,x:limit(box.x,8,root.innerWidth-width-8),y:limit(box.y,8,root.innerHeight-height-8)};
    }
    function apply(){
      if(!dialog.open)return;
      if(compact()){
        for(const key of ['left','top','width','height'])dialog.style.removeProperty(key);
        handle.setAttribute('aria-disabled','true');handle.tabIndex=-1;
      }else{
        if(!rect){const width=Math.min(1060,root.innerWidth-40),height=Math.min(820,root.innerHeight-40);rect={width,height,x:(root.innerWidth-width)/2,y:(root.innerHeight-height)/2};}
        rect=maximized?{x:8,y:8,width:root.innerWidth-16,height:root.innerHeight-16}:fit(rect);
        Object.assign(dialog.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});
        handle.removeAttribute('aria-disabled');handle.tabIndex=0;
      }
      maximize.setAttribute('aria-pressed',String(maximized));
      maximize.title=maximized?'Återställ fönsterstorleken':'Förstora dörrkortet';maximize.setAttribute('aria-label',maximize.title);
      dialog.dataset.maximized=String(maximized);
      onChange?.();
    }
    function finish(cancel=false){
      if(!gesture)return;
      const old=gesture;gesture=null;
      if(cancel)rect=old.rect;
      try{dialog.releasePointerCapture(old.pointer);}catch(_){}
      delete dialog.dataset.windowGesture;apply();
    }
    dialog.addEventListener('pointerdown',event=>{
      if(compact()||gesture||event.button!==0||!event.isPrimary)return;
      const grip=event.target.closest('[data-window-resize]'),heading=event.target.closest('.card-heading');
      if(!grip&&(!heading||event.target.closest('button,a,input,select,textarea')))return;
      if(maximized)return;
      event.preventDefault();onChange?.();
      gesture={kind:grip?.dataset.windowResize||'move',x:event.clientX,y:event.clientY,rect:{...rect},pointer:event.pointerId};
      dialog.dataset.windowGesture=gesture.kind;dialog.setPointerCapture(event.pointerId);
    });
    dialog.addEventListener('pointermove',event=>{
      if(!gesture||event.pointerId!==gesture.pointer)return;
      event.preventDefault();const {kind,rect:start}=gesture,dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      if(kind==='move')rect=fit({...start,x:start.x+dx,y:start.y+dy});
      else rect=fit({...start,width:kind==='bottom'?start.width:limit(start.width+dx,620,root.innerWidth-start.x-8),height:kind==='right'?start.height:limit(start.height+dy,360,root.innerHeight-start.y-8)});
      apply();
    });
    dialog.addEventListener('pointerup',event=>{if(event.pointerId===gesture?.pointer)finish();});
    dialog.addEventListener('pointercancel',()=>finish(true));
    dialog.addEventListener('lostpointercapture',()=>finish());
    dialog.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&gesture){event.preventDefault();event.stopPropagation();finish(true);return;}
      if(compact()||maximized||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      const grip=event.target.closest('[data-window-resize]');if(event.target!==handle&&!grip)return;
      event.preventDefault();event.stopPropagation();const step=event.shiftKey?40:10,dx=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,dy=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;
      rect=fit(grip?{...rect,width:rect.width+dx,height:rect.height+dy}:{...rect,x:rect.x+dx,y:rect.y+dy});apply();
    });
    maximize.addEventListener('click',()=>{
      if(compact())return;finish();
      if(maximized){maximized=false;rect=restoreRect;restoreRect=null;}else{restoreRect={...rect};maximized=true;}
      apply();
    });
    root.addEventListener('resize',()=>{finish();apply();});
    return Object.freeze({open:apply,close:()=>finish(),snapshot:()=>({rect:rect&&{...rect},maximized,compact:compact()})});
  }
  root.Proj2FloatingCard=Object.freeze({create});
})(typeof window==='object'?window:globalThis);
