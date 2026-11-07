/* Allt-i-ett protocol selection 2.4.190 */
(()=>{
 'use strict';
 const KEY='doorservice-all-in-one-active-protocols';
 const TYPES=['automation','automation_selfcheck','alarm','lock','access','fire_panel','fire_detector','fire_door'];
 const dialog=document.getElementById('allProtocolDialog'),
  apply=document.getElementById('allProtocolApply'),
  file=document.getElementById('securityFile');
 if(!dialog||!apply||!file)return;

 let active=new Set(),awaitingFile=false;

 function itemTypes(){
  try{return new Set((typeof items!=='undefined'&&Array.isArray(items)?items:[]).map(o=>o?.type).filter(x=>TYPES.includes(x)))}
  catch(_){return new Set()}
 }
 function write(){try{localStorage.setItem(KEY,JSON.stringify([...active]))}catch(_){}}
 function refresh(){
  itemTypes().forEach(type=>active.add(type));
  write();
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
  dialog.querySelectorAll('.allProtocolGroup').forEach(group=>group.open=false);
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
  awaitingFile=true;
  setTimeout(()=>file.click(),40)
 }

 apply.onclick=applyPicker;
 dialog.addEventListener('change',e=>{if(e.target.matches('input[type=checkbox][value]'))refresh()});
 dialog.addEventListener('cancel',e=>e.preventDefault());

 const returnFromCancelledFilePicker=()=>{
  if(!awaitingFile)return;
  awaitingFile=false;
  openPicker();
 };
 file.addEventListener('change',()=>{awaitingFile=false},{capture:true});
 file.addEventListener('cancel',returnFromCancelledFilePicker);

 // Keep protocol types detected in an imported PDF active.
 refresh();
 window.AllInOneProtocols={
  get:()=>[...active],
  set:types=>{active=new Set((types||[]).filter(x=>TYPES.includes(x)));write();refresh()}
 };

 setTimeout(openPicker,60);
})();