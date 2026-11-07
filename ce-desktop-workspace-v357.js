/* CE desktop presentation only. Original nodes and modal behavior return on phone/tablet. */
(function(){
'use strict';
const root=document.documentElement,$=id=>document.getElementById(id);
const media=matchMedia('(min-width:1100px) and (hover:hover) and (pointer:fine)');
const key='tillsyno-ce-desktop-layout-v1';
let enabled=false,selected='',columns,sidebar,detail,divider,dockHint,viewMenu,topActions;
let originals=[],labels=[],dialogSlot,stopDrag=()=>{};
let prefs={width:390,reverse:false,scale:1},floating=false;
try{const p=JSON.parse(localStorage.getItem(key)||'null');if(p){prefs.width=Math.max(310,Math.min(700,Number(p.width)||390));prefs.reverse=p.reverse===true;prefs.scale=Math.max(1,Math.min(1.25,Number(p.scale)||1));}}catch(_){}
function persist(){try{localStorage.setItem(key,JSON.stringify(prefs));}catch(_){}}
function icon(name){
 const paths={plus:'M12 5v14M5 12h14',folder:'M3 7V5h6l3 2h9v13H3zM3 11h18',files:'M8 3h8l4 4v14H8zM16 3v5h4M4 7v12',down:'m7 10 5 5 5-5',view:'M3 4h18v16H3zM10 4v16',move:'M9 3H3v6M15 3h6v6M21 15v6h-6M9 21H3v-6',resize:'m8 20 12-12m-6 12 6-6'};
 const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','1.8');s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round');s.setAttribute('aria-hidden','true');
 const p=document.createElementNS(s.namespaceURI,'path');p.setAttribute('d',paths[name]);s.append(p);return s;
}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
function move(node,parent,before=null){const marker=document.createComment('CE original position');node.before(marker);originals.push({node,marker});parent.insertBefore(node,before);}
function relabel(node,name,text,chevron=false){labels.push({node,children:[...node.childNodes]});node.replaceChildren(icon(name),el('span','',text));if(chevron)node.append(icon('down'));}
function available(){return media.matches&&!['phone','tablet'].includes(root.dataset.tillsynoDevice)&&!(/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function bounds(){return {min:310,max:Math.max(310,Math.min(700,(columns?.clientWidth||1100)-470))};}
function syncSize(){
 if(!enabled)return;
 const b=bounds(),width=Math.max(b.min,Math.min(b.max,prefs.width));
 columns.style.setProperty('--ce-list-width',width+'px');columns.classList.toggle('is-reversed',prefs.reverse);
 $('ceWorkspace').style.setProperty('--ce-text-scale',prefs.scale);
 divider.setAttribute('aria-valuemin',b.min);divider.setAttribute('aria-valuemax',b.max);divider.setAttribute('aria-valuenow',Math.round(width));
 if(floating)fitFloating();
}
function selectDoor(id){
 selected=id||selected;
 if(!enabled)return;
 if(id){$('ceProject').open=false;sidebar.scrollTop=0;}
 const open=$('slrFlowTestDialog')?.open;
 for(const n of $('ceDoorList').querySelectorAll('[data-door]')){
  const current=open&&n.dataset.door===selected;n.classList.toggle('is-selected',!!current);
  if(current)n.setAttribute('aria-current','true');else n.removeAttribute('aria-current');
 }
 const float=$('ceDesktopFloat');if(float)float.disabled=!open;
}
function closeMenus(){for(const n of document.querySelectorAll('.ceToolbarMenu'))n.open=false;}
function action(id,text,fn){const b=el('button','',text);b.id=id;b.type='button';b.onclick=()=>{fn();closeMenus();};return b;}
function drag(event,update){
 if(event.button!==0)return;event.preventDefault();stopDrag();
 const handle=event.currentTarget;handle.setPointerCapture(event.pointerId);
 const x=event.clientX,y=event.clientY;
 const move=e=>update(e.clientX-x,e.clientY-y);
 const stop=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',stop);handle.removeEventListener('pointercancel',stop);handle.removeEventListener('lostpointercapture',stop);if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);document.body.classList.remove('ceDesktopDragging');stopDrag=()=>{};persist();};
 handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('lostpointercapture',stop);document.body.classList.add('ceDesktopDragging');stopDrag=stop;
}
function fitFloating(){
 if(!floating)return;
 const r=detail.getBoundingClientRect(),w=Math.min(innerWidth-32,Math.max(480,r.width)),h=Math.min(innerHeight-32,Math.max(330,r.height));
 Object.assign(detail.style,{width:w+'px',height:h+'px',left:Math.max(16,Math.min(innerWidth-w-16,r.left))+'px',top:Math.max(16,Math.min(innerHeight-h-16,r.top))+'px'});
}
function setFloating(value){
 if(!enabled)return;
 const r=detail.getBoundingClientRect();floating=value;
 detail.classList.toggle('is-floating',floating);dockHint.hidden=!floating;
 $('ceDesktopFloat').textContent=floating?'Fäst dokument bredvid dörrlistan':'Frigör dokumentfönster';
 if(floating){Object.assign(detail.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});fitFloating();}
 else for(const p of ['left','top','width','height'])detail.style.removeProperty(p);
 const header=$('slrFlowTestDialog')?.querySelector('header');if(header)header.title=floating?'Dra rubriken för att flytta dokumentfönstret':'';
}
function attachDialog(dialog){
 if(!enabled)return false;
 if(!dialogSlot){
  dialogSlot=document.createComment('CE dialog original position');dialog.before(dialogSlot);detail.append(dialog);
  dialog.addEventListener('close',onDialogClose);
  dialog.querySelector('header').addEventListener('pointerdown',dragDialog);
 }
 if(!dialog.open)dialog.show();
 selectDoor();return true;
}
function dragDialog(event){
 if(!floating||event.target.closest('button,a,input,select,summary'))return;
 const r=detail.getBoundingClientRect();drag(event,(dx,dy)=>{detail.style.left=Math.max(16,Math.min(innerWidth-r.width-16,r.left+dx))+'px';detail.style.top=Math.max(16,Math.min(innerHeight-r.height-16,r.top+dy))+'px';});
}
function onDialogClose(){if(!enabled)return;setFloating(false);selectDoor();}
function enable(){
 if(enabled||!$('ceWorkspace'))return;enabled=true;root.setAttribute('data-ce-desktop','');
 const workspace=$('ceWorkspace'),header=workspace.querySelector('.ceWorkspaceHeader');
 columns=el('div','ceDesktopColumns');columns.id='ceDesktopColumns';sidebar=el('aside','ceDesktopSidebar');sidebar.id='ceDesktopDoors';sidebar.setAttribute('aria-label','Dörrlista och projektuppgifter');
 detail=el('section','ceDesktopDetail');detail.id='ceDesktopDetail';detail.setAttribute('aria-label','Vald dörrs CE-dokument');
 const empty=el('div','ceDesktopEmpty');empty.append(icon('files'),el('h2','','Välj en dörr'),el('p','','Klicka på en dörr i listan för att arbeta med CE-dokumenten här.'));detail.append(empty);
 dockHint=el('div','ceDesktopEmpty ceDesktopDockHint');dockHint.hidden=true;dockHint.append(el('h2','','Dokumentfönstret är fristående'),action('ceDesktopDock','Fäst bredvid dörrlistan',()=>setFloating(false)));
 divider=el('div','ceDesktopDivider');divider.id='ceDesktopDivider';divider.tabIndex=0;divider.setAttribute('role','separator');divider.setAttribute('aria-orientation','vertical');divider.setAttribute('aria-controls','ceDesktopDoors');divider.setAttribute('aria-label','Ändra dörrlistans bredd');divider.title='Dra för att ändra bredd · piltangenter finjusterar';
 divider.onpointerdown=event=>{const start=parseFloat(columns.style.getPropertyValue('--ce-list-width'));drag(event,dx=>{const b=bounds();prefs.width=Math.max(b.min,Math.min(b.max,start+dx*(prefs.reverse?-1:1)));syncSize();});};
 divider.onkeydown=event=>{const b=bounds(),delta={ArrowLeft:-20,ArrowRight:20}[event.key];if(delta===undefined&&!['Home','End'].includes(event.key))return;event.preventDefault();prefs.width=event.key==='Home'?b.min:event.key==='End'?b.max:Math.max(b.min,Math.min(b.max,Number(divider.getAttribute('aria-valuenow'))+delta*(prefs.reverse?-1:1)));syncSize();persist();};
 columns.append(sidebar,divider,detail,dockHint);workspace.append(columns);
 const listHead=workspace.querySelector('.ceListHead');
 for(const node of [listHead,$('ceProject'),$('ceFileExport'),$('ceDoorForm'),$('ceDoorList'),$('ceEmpty'),$('ceStorageStatus')].filter(Boolean))move(node,sidebar);
 move($('ceAddToggle'),listHead);relabel($('ceAddToggle'),'plus','Ny dörr');
 topActions=el('nav','ceDesktopTopActions');topActions.setAttribute('aria-label','CE-projektets menyer');header.insertBefore(topActions,$('ceCloseProject'));
 for(const [id,name,text] of [['ceProjectActions','folder','Projekt'],['ceDocumentActions','files','Dokument & export']]){move($(id),topActions);relabel($(id).querySelector('summary'),name,text,true);}
 viewMenu=el('details','ceToolbarMenu ceDesktopView');viewMenu.id='ceDesktopView';const summary=el('summary');summary.append(icon('view'),el('span','','Vy'),icon('down'));
 const panel=el('div','ceMenuPanel');
 panel.append(el('div','ceMenuHeading','Datorvy'),action('ceDesktopSwap','Byt sida på dörrlistan',()=>{prefs.reverse=!prefs.reverse;syncSize();persist();}),action('ceDesktopFloat','Frigör dokumentfönster',()=>setFloating(!floating)));
 const textTools=el('div','ceDesktopTextTools');textTools.append(el('span','','Textstorlek'),action('ceDesktopTextLess','A−',()=>{prefs.scale=Math.max(1,prefs.scale-.1);syncSize();persist();}),action('ceDesktopTextMore','A+',()=>{prefs.scale=Math.min(1.25,prefs.scale+.1);syncSize();persist();}));textTools.querySelector('#ceDesktopTextLess').setAttribute('aria-label','Mindre text');textTools.querySelector('#ceDesktopTextMore').setAttribute('aria-label','Större text');
 panel.append(textTools,action('ceDesktopReset','Återställ datorvyn',()=>{prefs={width:390,reverse:false,scale:1};setFloating(false);syncSize();persist();}));viewMenu.append(summary,panel);topActions.append(viewMenu);
 viewMenu.addEventListener('toggle',()=>{if(viewMenu.open)for(const m of [ $('ceProjectActions'),$('ceDocumentActions')])m.open=false;});
 const resize=el('button','ceDesktopResize');resize.type='button';resize.setAttribute('aria-label','Ändra dokumentfönstrets storlek');resize.title='Dra för att ändra storlek · piltangenter finjusterar';resize.append(icon('resize'));detail.append(resize);
 resize.onpointerdown=event=>{const r=detail.getBoundingClientRect();drag(event,(dx,dy)=>{detail.style.width=Math.max(480,Math.min(innerWidth-r.left-16,r.width+dx))+'px';detail.style.height=Math.max(330,Math.min(innerHeight-r.top-16,r.height+dy))+'px';});};
 resize.onkeydown=event=>{const r=detail.getBoundingClientRect(),dx={ArrowLeft:-20,ArrowRight:20}[event.key]||0,dy={ArrowUp:-20,ArrowDown:20}[event.key]||0;if(!dx&&!dy)return;event.preventDefault();detail.style.width=r.width+dx+'px';detail.style.height=r.height+dy+'px';fitFloating();};
 syncSize();const dialog=$('slrFlowTestDialog');if(dialog?.open){dialog.close();attachDialog(dialog);}selectDoor();
}
function disable(){
 if(!enabled)return;stopDrag();const dialog=$('slrFlowTestDialog'),wasOpen=!!dialog?.open;
 if(dialogSlot&&dialog){if(wasOpen)dialog.close();dialog.removeEventListener('close',onDialogClose);dialog.querySelector('header').removeEventListener('pointerdown',dragDialog);dialog.querySelector('header').removeAttribute('title');dialogSlot.replaceWith(dialog);dialogSlot=null;}
 enabled=false;floating=false;
 // Export panels may be created beside the form after desktop mode was entered.
 // Preserve those live nodes and their selections when restoring the original page.
 const formSlot=originals.find(entry=>entry.node.id==='ceDoorForm')?.marker;
 for(const node of [...sidebar.children])if(!originals.some(entry=>entry.node===node))formSlot?.before(node);
 for(const {node,marker}of originals.reverse())marker.replaceWith(node);originals=[];
 for(const {node,children}of labels)node.replaceChildren(...children);labels=[];
 columns.remove();topActions.remove();$('ceWorkspace').style.removeProperty('--ce-text-scale');root.removeAttribute('data-ce-desktop');
 for(const n of $('ceDoorList').querySelectorAll('[data-door]')){n.classList.remove('is-selected');n.removeAttribute('aria-current');}
 if(wasOpen)dialog.showModal();
}
function refresh(){if(available())enable();else disable();}
window.TillsynoCEDesktop={present:attachDialog,selectDoor,active:()=>enabled};
function start(){
 refresh();media.addEventListener('change',refresh);addEventListener('resize',syncSize);
 new MutationObserver(refresh).observe(root,{attributes:true,attributeFilter:['data-tillsyno-device']});
 new MutationObserver(()=>selectDoor()).observe($('ceDoorList'),{childList:true});
 new MutationObserver(()=>{if($('ceWorkspace').hidden){if($('slrFlowTestDialog')?.open)$('slrFlowTestDialog').close();}else syncSize();}).observe($('ceWorkspace'),{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('keydown',event=>{if(enabled&&event.key==='Escape'&&!document.querySelector('dialog:modal')){const menu=document.querySelector('.ceToolbarMenu[open]');if(menu){menu.open=false;return;}if($('slrFlowTestDialog')?.open)$('slrFlowTestDialog').close();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
