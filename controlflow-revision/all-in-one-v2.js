/* Allt-i-ett protocol selection 2.4.190 */
(()=>{
 'use strict';
 const KEY='doorservice-active-protocols';
 const TYPES=['automation','automation_selfcheck','lock_revision','alarm','lock','access','fire_panel','fire_detector','fire_door'];
 const dialog=document.getElementById('allProtocolDialog'),
  apply=document.getElementById('allProtocolApply'),
  file=document.getElementById('securityFile');
 if(!dialog||!apply||!file)return;

 let active=new Set();

 // Folder navigation affects only the picker presentation. Protocol IDs, checked
 // state, PDF input handling and the original checklist runtime remain unchanged.
 const groups=[...dialog.querySelectorAll('.allProtocolGroup')],
  back=document.getElementById('allFolderBack'),
  title=document.getElementById('allProtocolTitle'),
  lead=document.getElementById('allProtocolLead');
 function showFolders(){
  dialog.dataset.stage='folders';
  groups.forEach(group=>{group.open=false});
  back.hidden=true;
  title.textContent='Välj område';
  lead.textContent='Öppna en mapp för att välja checklistor.';
 }
 function showFolder(group){
  groups.forEach(g=>{g.open=g===group});
  dialog.dataset.stage='folder';
  back.hidden=false;
  title.textContent=group.querySelector('summary strong').textContent.trim();
  lead.textContent=group===groups[0]?'Välj checklistor för ritningen eller öppna CE-märkning separat.':'Kryssa i ett eller flera protokoll och fortsätt till ritningen.';
 }
 groups.forEach(group=>{
  group.querySelector('summary').addEventListener('click',event=>{
   event.preventDefault();
   if(dialog.dataset.stage==='folders')showFolder(group);
  });
 });
 back.addEventListener('click',showFolders);


 function itemTypes(){
  try{return new Set((typeof items!=='undefined'&&Array.isArray(items)?items:[]).map(o=>o?.type).filter(x=>TYPES.includes(x)))}
  catch(_){return new Set()}
 }
 function write(){try{localStorage.setItem(KEY,JSON.stringify([...active]))}catch(_){}}
 // Desktop presentation only. Protocol state, PDF data and mobile copy are untouched.
 const desktopQuery=matchMedia('(min-width:1100px) and (hover:hover) and (pointer:fine)');
 const contextTitle=document.querySelector('.secAppHeader .brand strong');
 const contextSubtitle=document.querySelector('.secAppHeader .headerSubtitle');
 const emptyTitle=document.querySelector('#secEmpty h1');
 const contextOriginals=[contextTitle,contextSubtitle,emptyTitle].map(node=>node?.textContent||'');
 function renderDesktopContext(){
  const device=document.documentElement.getAttribute('data-tillsyno-device');
  const enabled=desktopQuery.matches&&device!=='phone'&&device!=='tablet'&&active.size>0;
  document.body.toggleAttribute('data-desktop-protocol-context',enabled);
  document.body.toggleAttribute('data-protocol-context',active.size>0);
  const areas=groups.filter(group=>[...group.querySelectorAll('input[value]')].some(input=>active.has(input.value))).map(group=>group.querySelector('summary strong').textContent.trim());
  const names=TYPES.filter(type=>active.has(type)).map(type=>dialog.querySelector('input[value="'+type+'"]')?.closest('label')?.querySelector('strong')?.textContent.trim()||type);
  const texts=active.size>0?[areas.join(' · ')||'Kontrollflöde',names.join(' · '),areas.join(' · ')||'Kontrollflöde']:contextOriginals;
  [contextTitle,contextSubtitle,emptyTitle].forEach((node,index)=>{if(node&&node.textContent!==texts[index])node.textContent=texts[index]});
 }
 desktopQuery.addEventListener('change',renderDesktopContext);
 new MutationObserver(renderDesktopContext).observe(document.documentElement,{attributes:true,attributeFilter:['data-tillsyno-device']});
 function refresh(){
  itemTypes().forEach(type=>active.add(type));
  write();
  renderDesktopContext();
  document.querySelectorAll('.allInOneProtocolTools [data-add]').forEach(button=>{
   button.hidden=!active.has(button.dataset.add)
  });
  const checked=dialog.querySelectorAll('input[type=checkbox][value]:checked').length;
  apply.disabled=!checked;
 }
 function openPicker(){
  active=new Set();
  write();
  dialog.querySelectorAll('input[type=checkbox][value]').forEach(cb=>cb.checked=false);
  showFolders();
  refresh();
  if(!dialog.open)dialog.showModal()
 }
 function applyPicker(){
  const chosen=new Set([...dialog.querySelectorAll('input[type=checkbox][value]:checked')].map(x=>x.value).filter(x=>TYPES.includes(x)));
  if(!chosen.size)return
  active=chosen;
  write();
  refresh();
  dialog.close();
  // File selection is manual: the drawing view has an "Öppna PDF" button.
 }

 apply.onclick=applyPicker;
 dialog.addEventListener('change',e=>{if(e.target.matches('input[type=checkbox][value]'))refresh()});
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(dialog.dataset.stage==='folder')showFolders()});

 // Keep protocol types detected in an imported PDF active.
 refresh();
 window.AllInOneProtocols={
  get:()=>[...active],
  set:types=>{active=new Set((types||[]).filter(x=>TYPES.includes(x)));write();refresh()}
 };

 const requested=new URLSearchParams(location.search).get('protocols');
 const requestedTypes=(requested||'').split(',').filter(type=>TYPES.includes(type));
 if(requestedTypes.length){active=new Set(requestedTypes);dialog.querySelectorAll('input[type=checkbox][value]').forEach(cb=>cb.checked=active.has(cb.value));write();refresh();}
 else setTimeout(openPicker,60);
})();