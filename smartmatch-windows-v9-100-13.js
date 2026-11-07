/* Shared workspace windows: one live title/close control and content-sized forms. */
(()=>{
 'use strict';
 const states=new WeakMap();let z=12020;
 const managed=p=>p&&(p.matches('#pwSide,#pwInlineNoteEditor')||p.tagName==='DIALOG'&&(/^(pw|rt|ex|lab|pm|smart|slr|smSLR)/i.test(p.id)||p.matches('.smInlineConfirmation,.rtCardViewDialog')));
 const blocking=p=>p.matches('.smInlineConfirmation,#pwFinishDialog,#pwRefreshDialog')||p.id==='pwSmartActionDialog'&&p.dataset.smBlocking==='true';
 const isOpen=p=>p.tagName==='DIALOG'?p.open:!p.hidden;
 const viewport=()=>({w:window.visualViewport?.width||innerWidth,h:window.visualViewport?.height||innerHeight});
 function bounds(r){const v=viewport(),w=Math.min(v.w-16,Math.max(Math.min(280,v.w-16),r.w)),h=Math.min(v.h-16,Math.max(100,r.h));return {x:Math.max(8,Math.min(r.x,v.w-w-8)),y:Math.max(8,Math.min(r.y,v.h-h-8)),w,h};}
 function apply(p,r){
  const s=states.get(p);s.rect=bounds(r);const b=s.rect;p.classList.toggle('smWindowNarrow',b.w<650);
  for(const [k,v]of Object.entries({position:'fixed',inset:'auto',left:b.x+'px',top:b.y+'px',right:'auto',bottom:'auto',width:b.w+'px',height:s.minimized?'44px':b.h+'px',minWidth:'0',minHeight:'0',maxWidth:'none',maxHeight:'none',margin:'0',padding:'0',transform:'none',overflow:'hidden'}))p.style.setProperty(k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),v,'important');
 }
 function raise(p){p.style.setProperty('z-index',String(++z),'important');}
 function compact(p){return p.matches('#pwTextCheckDialog,#pwSmartActionDialog,#pwDADoorDialog,#pwDALinkDialog,#pwItemEditor,#pwTimeTypeEditor,#pwInlineNoteEditor,#pwVirtualCardEditor,.pmGroupDialog,.smInlineConfirmation');}
 function initial(p){const v=viewport();if(p.matches('#pwAutomationDialog,#pwAutomationPreviewDialog')){const phone=v.w<=620,w=Math.min(v.w-16,p.id==='pwAutomationPreviewDialog'?1000:760),h=Math.min(v.h-(phone?16:64),phone?v.h:960);return {x:Math.max(8,(v.w-w)/2),y:phone?8:32,w,h};}const w=Math.min(v.w-24,p.id==='pwSide'?360:p.matches('#pwItemEditor,#pwTextCheckDialog')?370:compact(p)?430:p.matches('#pwCardViewDialog,.rtCardViewDialog')?620:p.id==='exDialog'?560:p.id==='pwProtocol'?940:760),h=Math.min(v.h-150,compact(p)?280:580);return {x:Math.max(8,v.w-w-18),y:64,w,h};}
 function modeButtons(p){const s=states.get(p);s.maxButton.setAttribute('aria-label',s.maximized?'Återställ fönsterstorlek':'Maximera fönster');s.maxButton.textContent=s.maximized?'❐':'□';s.minButton.setAttribute('aria-label',s.minimized?'Återställ minimerat fönster':'Minimera fönster');}
 function toggleMax(p){const s=states.get(p);s.minimized=false;p.classList.remove('smWindowMinimized');if(s.maximized){s.maximized=false;apply(p,s.restore||initial(p));}else{s.restore={...s.rect};s.maximized=true;const v=viewport();apply(p,{x:8,y:8,w:v.w-16,h:v.h-16});}modeButtons(p);p.dispatchEvent(new CustomEvent('smwindowresize'));}
 const headerSelector='header,.pwDAHead,.pwAutomationHead,.pwItemEditorHead,.pwSideHead,.labDiagnosticHead,.pwTimeHead,.rtHead,.exHeader,.smFinishHead,.smRefreshHead,.smartExportHeader';
 function syncChrome(p){
  const s=states.get(p),body=s.body;
  const labelled=document.getElementById(p.getAttribute('aria-labelledby'));
  const source=labelled&&body.contains(labelled)?labelled:body.querySelector('#pwSmartActionTitle,#pwItemEditorTitle,#pwTimeTypeTitle,#pwProtocolCode')||body.querySelector(headerSelector)?.querySelector('h1,h2,strong,.pwTimeTitle')||body.querySelector('h1,h2,.pwTimeTitle');
  let title=source?.textContent?.trim()||p.getAttribute('aria-label')||(p.id==='pwInlineNoteEditor'?'Text och markering':'SmartMatch');
  if(p.id==='pwProtocol')title='Dörrkort'+(title&&title!=='—'?' · '+title:'');
  if(p.id==='pwDADoorDialog'&&title!=='Dörrautomatik')title='Dörrautomatik · '+title;
  if(s.title.textContent!==title)s.title.textContent=title;
  s.title.title=title;p.setAttribute('aria-label',title);
  if(source){source.classList.add('smWindowOriginalTitle');source.style.setProperty('display','none','important');}
  const header=source?.closest(headerSelector)||body.querySelector(headerSelector);
  const buttons=[...(header?.querySelectorAll('button')||[]),...body.querySelectorAll(':scope>button,:scope>form>button')];
  for(const button of buttons){
   const text=button.textContent.trim(),label=button.getAttribute('aria-label')||'';
   if(button.id==='pwHidePositions'||/Close$/.test(button.id)||/^(?:×|✕|✖|Stäng(?:\s*[×✕✖])?)$/.test(text)||/^Stäng(?:\s|$)/.test(label)){
    button.classList.add('smWindowOriginalClose');button.style.setProperty('display','none','important');if(!s.closeControl)s.closeControl=button;
   }
  }
  body.querySelector('#pwBack')?.classList.add('smWindowOriginalClose');
  if(header){
   header.classList.remove('smWindowHeaderEmpty','pwFloatingDragHandle');header.removeAttribute('title');
   for(const caption of header.querySelectorAll('span,small'))if(/^(PROJEKT|PROJEKTPROTOKOLL|ARBETSPROTOKOLL|TID|TIDSMALL|SMARTMATCH · KONTROLL|Dra här för att flytta)$/.test(caption.textContent.trim())){caption.classList.add('smWindowOriginalCaption');caption.style.setProperty('display','none','important');}
   const visibleText=node=>{
    if(node.nodeType===3)return !!node.textContent.trim();
    if(node.nodeType!==1||node.hidden||getComputedStyle(node).display==='none')return false;
    if(node.matches('button,input,select,summary,a'))return true;
    return [...node.childNodes].some(visibleText);
   };
   if(![...header.childNodes].some(visibleText))header.classList.add('smWindowHeaderEmpty');
  }
 }
 function captureScroll(root){
  if(!root)return [];
  return [root,...root.querySelectorAll('.smWindowBody,.pwChecklistPane,#pwChecklist,.pwProtocolCanvasWrap,#pwGroups')].map(node=>({node,left:node.scrollLeft,top:node.scrollTop}));
 }
 function restoreScroll(snapshot){for(const {node,left,top} of snapshot||[])if(node.isConnected){node.scrollLeft=left;node.scrollTop=top;}}
 function fitContent(p){
  if(p.matches?.('#pwAutomationDialog,#pwAutomationPreviewDialog'))return;
  const s=states.get(p);if(!isOpen(p)||s.userSized||s.maximized||s.minimized)return;
  const scroll=captureScroll(p),b=s.body,prior=b.getAttribute('style');
  b.style.setProperty('flex','0 0 auto','important');b.style.setProperty('height','auto','important');b.style.setProperty('overflow','visible','important');
  const natural=p.id==='pwProtocol'?Math.max(460,Math.ceil(b.scrollHeight)+46):Math.ceil(b.scrollHeight)+46;
  if(prior===null)b.removeAttribute('style');else b.setAttribute('style',prior);
  const v=viewport(),cap=Math.max(160,Math.min(v.h-150,Math.round(v.h*.74)));
  apply(p,{...s.rect,h:Math.min(cap,Math.max(100,natural))});
  restoreScroll(scroll);
 }
 function refresh(p){const s=states.get(p);if(!s||s.scheduled)return;s.scheduled=true;requestAnimationFrame(()=>{s.scheduled=false;syncChrome(p);fitContent(p);});}
 function closeWindow(p){
  const s=states.get(p);
  if(p.id==='pwInlineNoteEditor'){document.getElementById('pwInlineNoteCancel').click();return;}
  if(s.closeControl){s.closeControl.click();return;}
  const e=new Event('cancel',{cancelable:true});if(p.dispatchEvent(e)&&p.tagName==='DIALOG')p.close();
 }
 function protocolPane(p,pane){
  p.dataset.smProtocolPane=pane;
  for(const b of p.querySelectorAll('.smProtocolNav button'))b.setAttribute('aria-pressed',String(b.dataset.pane===pane));
 }
 function protocolNavigation(p){
  if(p.id!=='pwProtocol'||p.querySelector('.smProtocolNav'))return;
  const content=p.querySelector('.pwProtocolBody');if(!content)return;
  const nav=document.createElement('nav');nav.className='smProtocolNav';nav.setAttribute('aria-label','Dörrkort och avbockning');
  for(const [pane,label,legacy]of [['both','Båda','pwProtocolShowCard'],['card','Dörrkort','pwProtocolShowCard'],['checks','Kontrollpunkter','pwProtocolShowGS']]){
   const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.pane=pane;b.setAttribute('aria-controls',pane==='both'?'pwProtocolCanvasWrap pwChecklist':pane==='checks'?'pwChecklist':'pwProtocolCanvasWrap');
   b.onclick=()=>{document.getElementById(legacy)?.click();protocolPane(p,pane);if(pane!=='checks')requestAnimationFrame(()=>document.getElementById('pwProtocolFit')?.click());};nav.append(b);
  }
  content.before(nav);protocolPane(p,'both');
 }
 function prepare(p){
  if(!managed(p))return;
  if(p.id==='pwInlineNoteEditor'&&p.parentElement!==document.body)document.body.append(p);
  p.dataset.smFloating=blocking(p)?'false':'true';
  if(states.has(p)){syncChrome(p);const s=states.get(p),v=viewport();apply(p,s.maximized?{x:8,y:8,w:v.w-16,h:v.h-16}:s.rect);return;}
  p.dataset.smWindow='true';p.classList.remove('smWorkspaceView','smInactiveView');
  const s={rect:initial(p),minimized:false,maximized:false,restore:null,userSized:false,scheduled:false};states.set(p,s);
  const body=document.createElement('div');body.className='smWindowBody';while(p.firstChild)body.append(p.firstChild);p.append(body);s.body=body;
  protocolNavigation(p);
  const bar=document.createElement('div');bar.className='smWindowBar';bar.tabIndex=0;bar.setAttribute('aria-label','Flytta fönster med piltangenterna eller dra rubriken');
  const title=document.createElement('strong');s.title=title;bar.append(title);
  const actions=document.createElement('span');actions.className='smWindowActions';bar.append(actions);
  for(const action of body.querySelectorAll('[data-sm-window-action]'))actions.append(action);
  const button=(label,text,action)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.textContent=text;b.onclick=action;actions.append(b);return b;};
  s.minButton=button('Minimera fönster','−',()=>{s.minimized=!s.minimized;p.classList.toggle('smWindowMinimized',s.minimized);apply(p,s.rect);modeButtons(p);});
  s.maxButton=button('Maximera fönster','□',()=>toggleMax(p));
  button('Stäng fönster','×',()=>closeWindow(p));p.prepend(bar);
  if(p.id==='pwProtocol'){const progress=body.querySelector('.pwProtocolProgress');if(progress)bar.insertBefore(progress,actions);p.addEventListener('smwindowresize',()=>{if(p.dataset.smProtocolPane!=='checks')document.getElementById('pwProtocolFit')?.click();});}
  for(const node of [bar,body]){node.style.setProperty('width','100%','important');node.style.setProperty('max-width','none','important');node.style.setProperty('margin','0','important');node.style.setProperty('align-self','stretch','important');}
  function bind(handle,edge){let drag=null;
   handle.addEventListener('pointerdown',e=>{if(e.button>0||e.target.closest('button'))return;raise(p);drag={id:e.pointerId,x:e.clientX,y:e.clientY,r:{...s.rect}};handle.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();});
   handle.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y,r={...drag.r};if(!edge){r.x+=dx;r.y+=dy;}else{if(edge.includes('e'))r.w+=dx;if(edge.includes('s'))r.h+=dy;if(edge.includes('w')){r.x+=dx;r.w-=dx;}if(edge.includes('n')){r.y+=dy;r.h-=dy;}s.userSized=true;}s.maximized=false;apply(p,r);modeButtons(p);});
   for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,e=>{if(drag?.id!==e.pointerId)return;drag=null;p.dispatchEvent(new CustomEvent('smwindowresize'));});
  }
  bind(bar,'');bar.addEventListener('dblclick',e=>{if(!e.target.closest('button'))toggleMax(p);});
  bar.addEventListener('keydown',e=>{if(e.target!==bar||!e.key.startsWith('Arrow'))return;e.preventDefault();const r={...s.rect},step=e.shiftKey?40:10;r.x+=e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0;r.y+=e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0;apply(p,r);});
  for(const edge of ['n','e','s','w','ne','se','sw','nw']){const grip=document.createElement('span');grip.className='smWindowResize';grip.dataset.edge=edge;
   if(edge==='se'){grip.tabIndex=0;grip.setAttribute('role','button');grip.setAttribute('aria-label','Ändra fönsterstorlek med piltangenterna');grip.addEventListener('keydown',e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();const r={...s.rect},step=e.shiftKey?40:10;r.w+=e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0;r.h+=e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0;s.userSized=true;s.maximized=false;apply(p,r);modeButtons(p);});}
   p.append(grip);bind(grip,edge);
  }
  p.addEventListener('pointerdown',()=>raise(p),true);
  new MutationObserver(()=>refresh(p)).observe(body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','open']});
  new MutationObserver(()=>{if(isOpen(p))opened(p);}).observe(p,{attributes:true,attributeFilter:['open','hidden']});
  syncChrome(p);apply(p,s.rect);raise(p);if(p.id==='rtDialog')toggleMax(p);
 }
 function opened(p){prepare(p);if(!states.has(p))return;const s=states.get(p);if(p.id==='pwProtocol')protocolPane(p,'both');if(p.matches('#pwAutomationDialog,#pwAutomationPreviewDialog')&&!s.userSized&&!s.maximized)apply(p,initial(p));if(s.minimized){s.minimized=false;p.classList.remove('smWindowMinimized');apply(p,s.rect);modeButtons(p);}raise(p);refresh(p);}
 function init(){document.querySelectorAll('dialog,#pwInlineNoteEditor,#pwSide').forEach(prepare);new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1){if(managed(n))prepare(n);n.querySelectorAll?.('dialog').forEach(prepare);}}).observe(document.body,{childList:true,subtree:true});}
 window.SmartMatchWindows={prepare,opened,bounds,captureScroll,restoreScroll};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 const resize=()=>document.querySelectorAll('[data-sm-window]').forEach(p=>{if(!isOpen(p))return;const s=states.get(p),v=viewport();apply(p,s.maximized?{x:8,y:8,w:v.w-16,h:v.h-16}:p.matches('#pwAutomationDialog,#pwAutomationPreviewDialog')&&!s.userSized&&!s.minimized?initial(p):s.rect);refresh(p);});addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
})();
