/* In-memory history only. Persisted work data remains in each app's existing storage. */
window.ServiceSessionHistory=function({scope,capture,restore,changed,limit=30}){
 let scopeValue=scope(),current=capture(),past=[],future=[],lastGroup=null,replaying=false;
 const signature=s=>JSON.stringify(s.data);
 function notify(){changed({undo:past.length,redo:future.length})}
 function reset(){scopeValue=scope();current=capture();past=[];future=[];lastGroup=null;notify()}
 function record(group=null){
  if(replaying)return;
  if(scope()!==scopeValue){reset();return}
  const next=capture();if(signature(next)===signature(current)){current.selected=next.selected;return}
  if(!group||group!==lastGroup||future.length){past.push(current);if(past.length>limit)past.shift()}
  current=next;future=[];lastGroup=group;notify();
 }
 function move(from,to){
  if(scope()!==scopeValue){reset();return false}
  record();
  if(!from.length)return false;
  const next=from.pop();to.push(current);const previous=current;current=next;lastGroup=null;replaying=true;
  try{restore(JSON.parse(JSON.stringify(next)))}catch(error){current=previous;from.push(next);to.pop();throw error}
  finally{replaying=false;notify()}
  return true;
 }
 notify();
 return {record,reset,endGroup(){lastGroup=null},undo:()=>move(past,future),redo:()=>move(future,past)};
};
window.installServiceHistory=function({scope,capture,restore,wrapSave,blocked}){
 const bar=document.createElement('div');bar.className='sessionHistoryBar';bar.setAttribute('role','group');bar.setAttribute('aria-label','Snabbverktyg');
 const center=document.createElement('div');center.className='sessionHistoryCenter';
 const undo=document.createElement('button'),redo=document.createElement('button');
 undo.type=redo.type='button';undo.className=redo.className='historyIconButton';
 undo.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4 12l5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/></svg>';
 redo.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 7 5 5-5 5"/><path d="M19 12h-8a6 6 0 0 0-6 6"/></svg>';
 undo.title='Ångra';redo.title='Gör om';undo.setAttribute('aria-label','Ångra');redo.setAttribute('aria-label','Gör om');
 center.append(undo,redo);
 const textControls=document.createElement('span');textControls.className='historyTextControls';textControls.setAttribute('role','group');textControls.setAttribute('aria-label','Textstorlek i arbetsytan');
 const textSmaller=document.createElement('button'),textLarger=document.createElement('button');
 textSmaller.type=textLarger.type='button';textSmaller.className=textLarger.className='historyTextButton';
 textSmaller.textContent='A−';textLarger.textContent='A+';
 textSmaller.setAttribute('data-app-text-smaller','');textLarger.setAttribute('data-app-text-larger','');
 textSmaller.title='Mindre text i arbetsytan';textLarger.title='Större text i arbetsytan';
 textControls.append(textSmaller,textLarger);center.appendChild(textControls);
 const addButton=document.getElementById('mobileAdd');
 if(addButton){
  addButton.classList.add('historyAddButton');
  addButton.textContent='＋ Lägg dörr';
  addButton.title='Lägg dörr och checklista';
  addButton.setAttribute('aria-label','Lägg dörr och checklista');
  center.appendChild(addButton);
 }
 const status=document.createElement('span');status.setAttribute('role','status');status.className='historyStatus';
 const drawingButton=document.getElementById('changeDrawingBtn')||document.getElementById('secChangeDrawing');
 if(drawingButton){
  drawingButton.classList.add('historyChangeDrawing');
  drawingButton.title='Byt ritning';
  drawingButton.setAttribute('aria-label','Byt ritning');
  drawingButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4"/><path d="M9 14h6"/><path d="m13 11 3 3-3 3"/></svg><span>Byt ritning</span>';
 }
 bar.appendChild(center);if(drawingButton)bar.appendChild(drawingButton);bar.appendChild(status);
 document.querySelector('header.appHeader').insertAdjacentElement('afterend',bar);
 let inputGroup=null;
 const history=ServiceSessionHistory({scope,capture,restore,changed:counts=>{undo.disabled=!counts.undo;redo.disabled=!counts.redo;undo.title=counts.undo?counts.undo+' ändringar att ångra':'Inget att ångra';redo.title=counts.redo?counts.redo+' ändringar att göra om':'Inget att göra om'}});
 document.addEventListener('input',event=>{
  const el=event.target;
  inputGroup=event.isTrusted&&(el.tagName==='TEXTAREA'||el.tagName==='INPUT'&&['text','search','number','tel','email',''].includes(el.type))?el:null;
  queueMicrotask(()=>{inputGroup=null});
 },true);
 document.addEventListener('focusout',()=>history.endGroup(),true);
 wrapSave(()=>history.record(inputGroup));
 function step(direction){
  if(blocked?.()){status.textContent='Vänta tills pågående laddning eller export är klar.';return}
  const done=history[direction]();status.textContent=done?(direction==='undo'?'Ändringen ångrades.':'Ändringen gjordes om.'):'Inga fler ändringar.';
 }
 undo.onclick=()=>step('undo');redo.onclick=()=>step('redo');
 return history;
};
