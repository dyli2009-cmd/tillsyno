/* Projektering 2.8: free product entry with an accessible, shared suggestion list. */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.Proj2Suggest=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  let sequence=0;
  const INPUT='input[data-product-input][data-row-id]',STYLE='p2-product-suggest-style';
  const ARIA=['role','aria-autocomplete','aria-controls','aria-expanded','aria-activedescendant','autocomplete','maxlength'];
  function styles(document){
    if(document.getElementById(STYLE))return;
    const style=document.createElement('style');style.id=STYLE;
    style.textContent='.p2-suggest{position:fixed;z-index:25000;box-sizing:border-box;min-width:0;overflow:hidden;border:1px solid #a9bfb2;border-radius:8px;background:var(--paper,#fff);color:var(--ink,#263b35);box-shadow:0 5px 22px #183c3426;font:13px/1.4 system-ui,sans-serif}.p2-suggest[hidden]{display:none!important}.p2-suggest-list{overflow:auto;max-height:inherit;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:thin}.p2-suggest-option{display:flex;flex-direction:column;gap:2px;box-sizing:border-box;min-height:36px;padding:8px 10px;cursor:pointer;overflow-wrap:anywhere}.p2-suggest-option:hover,.p2-suggest-option.is-active{background:#e8f3e8;color:#214837}.p2-suggest-name{font-weight:600}.p2-suggest-description{font-size:11px;color:#62736a}.p2-suggest-note{margin:0;padding:6px 10px;border-top:1px solid #d8e3d9;font-size:11px;color:#62736a}.p2-suggest-live{position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;pointer-events:none}@media(pointer:coarse),(any-pointer:coarse){input[data-product-input]{font-size:16px!important}.p2-suggest-option{min-height:40px;font-size:14px}}';
    document.head.append(style);
  }
  function create(options={}){
    const host=options.host,document=host?.ownerDocument,window=document?.defaultView;
    if(!document||!window||host.nodeType!==1||typeof host.addEventListener!=='function')throw Error('Produktfältens arbetsyta saknas.');
    if(typeof options.search!=='function')throw Error('Produktbibliotekets sökning saknas.');
    styles(document);
    const id='p2-product-suggestions-'+(++sequence),portal=document.createElement('div'),list=document.createElement('div'),note=document.createElement('p'),live=document.createElement('div');
    portal.className='p2-suggest';portal.hidden=true;
    list.className='p2-suggest-list';list.id=id;list.setAttribute('role','listbox');list.setAttribute('aria-label','Produktförslag');
    note.className='p2-suggest-note';live.className='p2-suggest-live';live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');
    portal.append(list,note);document.body.append(portal,live);
    const listeners=[],attributes=new Map();
    let active=null,products=[],index=-1,destroyed=false,composing=false,pendingTouch=null,picking=false,suppressTouchClickUntil=0;
    const nativeTouchEnabled=typeof window.TouchEvent==='function'&&('ontouchstart'in window||(window.navigator?.maxTouchPoints||0)>0);
    const listen=(target,name,callback,settings)=>{target.addEventListener(name,callback,settings);listeners.push(()=>target.removeEventListener(name,callback,settings));};
    const enabled=()=>!destroyed&&(typeof options.enabled!=='function'||options.enabled());
    const usable=input=>!!input&&input.isConnected&&host.contains(input)&&!input.matches(':disabled')&&!input.readOnly&&enabled()&&input.getClientRects().length>0;
    function field(target){const input=target?.closest?.(INPUT);return input&&host.contains(input)?input:null;}
    function prepare(input){
      if(!attributes.has(input))attributes.set(input,Object.fromEntries(ARIA.map(name=>[name,input.getAttribute(name)])));
      input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',id);input.setAttribute('aria-expanded','false');input.setAttribute('autocomplete','off');input.setAttribute('maxlength','160');
    }
    function close(){
      if(active){active.setAttribute('aria-expanded','false');active.removeAttribute('aria-activedescendant');}
      // Keep the touched option connected until its compatibility click has
      // finished. A later search replaces the hidden choices in one update.
      active=null;products=[];index=-1;composing=false;pendingTouch=null;portal.hidden=true;note.textContent='';live.textContent='';
    }
    function position(){
      if(!usable(active)){close();return;}
      const rectangle=active.getBoundingClientRect(),viewport=window.visualViewport;
      const leftEdge=viewport?.offsetLeft||0,topEdge=viewport?.offsetTop||0,viewWidth=viewport?.width||window.innerWidth,viewHeight=viewport?.height||window.innerHeight;
      const width=Math.max(0,Math.min(Math.max(rectangle.width,240),viewWidth-16)),left=Math.max(leftEdge+8,Math.min(rectangle.left,leftEdge+viewWidth-width-8));
      const below=topEdge+viewHeight-rectangle.bottom-8,above=rectangle.top-topEdge-8,under=below>=Math.min(150,above),available=Math.max(0,under?below:above),height=Math.min(300,available);
      if(height<50){close();return;}
      portal.style.width=width+'px';portal.style.left=left+'px';portal.style.maxHeight=height+'px';list.style.maxHeight=Math.max(20,height-note.getBoundingClientRect().height-2)+'px';
      portal.style.top=(under?rectangle.bottom+4:Math.max(topEdge+8,rectangle.top-portal.getBoundingClientRect().height-4))+'px';
    }
    function highlight(next){
      index=next;
      [...list.children].forEach((option,i)=>{const selected=i===index;option.classList.toggle('is-active',selected);option.setAttribute('aria-selected',String(selected));});
      if(index<0){active?.removeAttribute('aria-activedescendant');return;}
      const option=list.children[index];active?.setAttribute('aria-activedescendant',option.id);
      if(option){const top=option.offsetTop,bottom=top+option.offsetHeight;if(top<list.scrollTop)list.scrollTop=top;else if(bottom>list.scrollTop+list.clientHeight)list.scrollTop=bottom-list.clientHeight;}
    }
    function refresh(input){
      if(!usable(input)){close();return;}
      pendingTouch=null;
      if(active!==input)close();active=input;prepare(input);
      let found;
      try{found=options.search(input.dataset.rowId,input.value);}catch(_){close();return;}
      if(!Array.isArray(found)){close();return;}
      const matches=found.filter(product=>product&&typeof product.name==='string'&&product.name.trim()&&product.name.length<=160),limit=input.value.trim()?50:20;
      products=matches.slice(0,limit);index=-1;
      if(!products.length){close();live.textContent='Inga produktförslag. Egen text kan användas.';return;}
      const fragment=document.createDocumentFragment();
      products.forEach((product,i)=>{
        const option=document.createElement('div'),name=document.createElement('span');option.className='p2-suggest-option';option.id=id+'-'+i;option.dataset.suggestionIndex=String(i);option.setAttribute('role','option');option.setAttribute('aria-selected','false');
        name.className='p2-suggest-name';name.textContent=product.name;option.append(name);
        if(product.description){const description=document.createElement('span');description.className='p2-suggest-description';description.textContent=String(product.description).slice(0,400);option.append(description);}
        fragment.append(option);
      });
      list.replaceChildren(fragment);list.scrollTop=0;note.textContent=matches.length>products.length?`${products.length} av ${matches.length} förslag. Skriv mer för att begränsa.`:`${products.length} förslag`;
      live.textContent=note.textContent;portal.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');position();
    }
    function pick(next,{focus=false}={}){
      const input=active,product=products[next];if(!usable(input)||!product||portal.hidden){close();return;}
      input.value=product.name;
      const rowId=input.dataset.rowId;close();picking=true;
      try{if(focus&&document.activeElement!==input)input.focus({preventScroll:true});options.onPick?.(rowId,product);}finally{picking=false;}
    }
    function input(event){
      const target=field(event.target);if(!target)return;
      if(!usable(target)){close();return;}
      if(target.value.length>160)target.value=target.value.slice(0,160);
      options.onInput?.(target.dataset.rowId,target.value);
      if(!composing&&!event.isComposing)refresh(target);
    }
    function pointer(event){
      if(portal.hidden||('button'in event&&event.button!==0))return;
      const option=event.target.closest?.('[data-suggestion-index]');if(!option||!list.contains(option))return;
      if(event.type==='pointerdown'&&event.pointerType==='touch'){
        if(pendingTouch){pendingTouch.moved=true;return;}
        pendingTouch={id:event.pointerId,index:Number(option.dataset.suggestionIndex),x:event.clientX,y:event.clientY,scrollTop:list.scrollTop,moved:false,awaitingNative:nativeTouchEnabled&&event.isTrusted};
        return; // The browser owns vertical scrolling until a tap completes.
      }
      const compatibility=event.type==='mousedown'||event.type==='click'&&(event.detail!==0||event.sourceCapabilities?.firesTouchEvents);
      if(event.type!=='pointerdown'&&(pendingTouch||compatibility&&window.performance.now()<suppressTouchClickUntil)){event.preventDefault();return;}
      if(event.type==='pointerdown')suppressTouchClickUntil=0;
      event.preventDefault();pick(Number(option.dataset.suggestionIndex));
    }
    function touchMove(event){
      if(pendingTouch?.id===event.pointerId&&Math.hypot(event.clientX-pendingTouch.x,event.clientY-pendingTouch.y)>6)pendingTouch.moved=true;
    }
    function touchEnd(event,canceled=false){
      const touch=pendingTouch;if(!touch||touch.id!==event.pointerId)return;
      pendingTouch=null;suppressTouchClickUntil=window.performance.now()+700;
      const hit=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-suggestion-index]');
      if(canceled||touch.moved||Math.abs(list.scrollTop-touch.scrollTop)>1||!hit||!list.contains(hit)||Number(hit.dataset.suggestionIndex)!==touch.index)return;
      if(event.cancelable)event.preventDefault();pick(touch.index,{focus:true});
    }
    listen(host,'focusin',event=>{const target=field(event.target);if(target&&!picking)refresh(target);});
    listen(host,'input',input);
    listen(host,'compositionstart',event=>{if(field(event.target))composing=true;});
    listen(host,'compositionend',event=>{if(field(event.target)){composing=false;input(event);}});
    listen(host,'focusout',event=>{if(field(event.target)&&!pendingTouch&&!portal.contains(event.relatedTarget))close();});
    listen(host,'keydown',event=>{
      const target=field(event.target);if(!target||!usable(target)||composing||event.isComposing)return;
      if(event.key==='Tab'){close();return;}
      if(event.key==='Escape'){if(!portal.hidden){event.preventDefault();event.stopPropagation();close();}return;}
      if(event.key==='Enter'){if(!portal.hidden&&index>=0){event.preventDefault();event.stopPropagation();pick(index);}else close();return;}
      if(!['ArrowDown','ArrowUp'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();if(portal.hidden||active!==target)refresh(target);if(portal.hidden)return;
      const next=index<0?(event.key==='ArrowDown'?0:products.length-1):(index+(event.key==='ArrowDown'?1:-1)+products.length)%products.length;highlight(next);
    });
    listen(portal,'pointerdown',pointer);listen(portal,'mousedown',pointer);listen(portal,'click',pointer);
    listen(portal,'pointermove',touchMove);listen(portal,'pointerup',event=>touchEnd(event));listen(portal,'pointercancel',event=>touchEnd(event,true));
    if(nativeTouchEnabled){
      const nativePointer=(touch,event)=>({pointerId:'touch-'+touch.identifier,pointerType:'touch',clientX:touch.clientX,clientY:touch.clientY,target:event.target,cancelable:event.cancelable,preventDefault:()=>event.preventDefault()});
      listen(portal,'touchstart',event=>{
        if(portal.hidden||!usable(active))return;
        if(event.touches.length===1&&pendingTouch?.awaitingNative){pendingTouch.id='touch-'+event.changedTouches[0].identifier;pendingTouch.awaitingNative=false;return;}
        if(event.touches.length!==1||pendingTouch){if(pendingTouch)pendingTouch.moved=true;return;}
        const touch=event.changedTouches[0],option=event.target.closest?.('[data-suggestion-index]');
        if(option&&list.contains(option))pendingTouch={id:'touch-'+touch.identifier,index:Number(option.dataset.suggestionIndex),x:touch.clientX,y:touch.clientY,scrollTop:list.scrollTop,moved:false};
      },{passive:true});
      listen(portal,'touchmove',event=>{for(const touch of event.changedTouches)touchMove(nativePointer(touch,event));},{passive:true});
      listen(portal,'touchend',event=>{for(const touch of event.changedTouches)touchEnd(nativePointer(touch,event));},{passive:false});
      listen(portal,'touchcancel',event=>{for(const touch of event.changedTouches)touchEnd(nativePointer(touch,event),true);},{passive:true});
    }
    listen(document,'pointerdown',event=>{if(active&&!portal.contains(event.target)&&event.target!==active)close();},true);
    listen(document,'focusin',event=>{if(active&&!pendingTouch&&event.target!==active&&!portal.contains(event.target))close();});
    listen(document,'scroll',event=>{if(!portal.contains(event.target))close();else if(pendingTouch&&Math.abs(list.scrollTop-pendingTouch.scrollTop)>1)pendingTouch.moved=true;},true);
    const viewportChanged=()=>{if(pendingTouch)position();else close();};
    listen(window,'resize',viewportChanged);listen(window,'blur',close);listen(document,'visibilitychange',()=>{if(document.hidden)close();});
    if(window.visualViewport){listen(window.visualViewport,'resize',viewportChanged);listen(window.visualViewport,'scroll',viewportChanged);}
    const observer=new window.MutationObserver(()=>{if(active&&!usable(active))close();});
    observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','aria-hidden','disabled','readonly']});
    observer.observe(document.body,{attributes:true,attributeFilter:['data-view','hidden','aria-hidden']});
    return Object.freeze({close,destroy(){
      if(destroyed)return;close();destroyed=true;observer.disconnect();listeners.splice(0).forEach(remove=>remove());portal.remove();live.remove();
      for(const [element,saved]of attributes)for(const [name,value]of Object.entries(saved)){if(value===null)element.removeAttribute(name);else element.setAttribute(name,value);}attributes.clear();
    }});
  }
  return Object.freeze({create});
});
