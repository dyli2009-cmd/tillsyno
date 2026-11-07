/* v2.4.590: Historik i checklistan, Dörrautomatik / Lås och Säkerhetsservice (laddas av båda sidorna).
   - The always-open panel Tidigare service / anmärkningar is replaced by a Historik button next to the key
     (protocol tools). The button is yellow and shown only when the object has history.
   - The button opens a movable box with the earlier services, newest first: date, status, remarks and notes.
   - History is kept by the engines (startNewSecurityService, the latest 10). A file from before v2.4.590 shows its
     last service (previous* fields). Presentation only here: nothing is saved by this file. */
(()=>{
 'use strict';
 const root=document.documentElement,body=document.body;
 if(root.dataset.controlflowUi!=='1'||!body||!body.classList.contains('allInOneApp')||body.dataset.cfHistory==='590')return;
 body.dataset.cfHistory='590';
 const $=id=>document.getElementById(id);
 const currentObject=()=>{try{return typeof cur==='function'?cur():null}catch(_){return null}};

 function entriesFor(o){
  if(!o)return [];
  if(Array.isArray(o.serviceHistory)&&o.serviceHistory.length)return o.serviceHistory;
  const issues=Array.isArray(o.previousIssues)?o.previousIssues:[];
  if(!(o.previousStatus||o.previousServiceDate||issues.length||o.previousNotes))return [];
  return [{date:o.previousServiceDate||'',status:o.previousStatus||'',issues,notes:o.previousNotes||''}];
 }

 // Button next to the key.
 let button=null;
 function ensureButton(){
  const top=$('cfProtocolTopActions'),tools=$('cfProtocolTools');
  if(!top)return null;
  if(!button){
   button=document.createElement('button');button.type='button';button.id='cfHistoryButton';button.className='cfHistoryButton';button.hidden=true;
   button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 7.5V12l3 2"/></svg>';
   button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openHistory();});
  }
  if(tools&&tools.parentNode===top){if(button.nextElementSibling!==tools)top.insertBefore(button,tools);}
  else if(button.parentNode!==top)top.prepend(button);
  return button;
 }
 function sync(){
  const b=ensureButton();if(!b)return;
  const list=entriesFor(currentObject());
  b.hidden=!list.length;
  const label=list.length?'Historik – '+list.length+(list.length===1?' tidigare service':' tidigare servicetillfällen'):'Historik';
  b.title=label;b.setAttribute('aria-label',label);b.dataset.count=String(list.length);
 }

 // Movable history box.
 let overlay=null;
 function closeHistory(){
  if(!overlay)return;const back=overlay.__back;overlay.remove();overlay=null;document.removeEventListener('keydown',onKey,true);
  if(back?.isConnected)back.focus({preventScroll:true});
 }
 function onKey(event){
  if(!overlay)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeHistory();}
 }
 function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
 function openHistory(){
  const o=currentObject(),list=entriesFor(o);if(!o||!list.length)return;
  closeHistory();
  overlay=el('div','cfHistoryOverlay');overlay.__back=document.activeElement;
  const card=el('section','cfHistoryCard');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','cfHistoryTitle');
  const head=el('header','cfHistoryHead');
  const titles=el('div','cfHistoryTitles');
  const title=el('h2','', 'Historik');title.id='cfHistoryTitle';
  const name=[o.id||o.number||'',(typeof SYSTEMS!=='undefined'&&SYSTEMS[o.type]?.label)||''].filter(Boolean).join(' · ');
  titles.append(title,el('p','cfHistorySub',name+(name?' · ':'')+list.length+(list.length===1?' tidigare service':' tidigare servicetillfällen')));
  const close=el('button','cfHistoryClose','×');close.type='button';close.setAttribute('aria-label','Stäng historik');close.addEventListener('click',closeHistory);
  head.append(titles,close);
  const content=el('div','cfHistoryBody');
  list.forEach((entry,index)=>{
   const block=el('article','cfHistoryEntry');
   const h=el('h3','',[entry.date||'Datum saknas',entry.status].filter(Boolean).join(' · '));
   if(index===0)h.append(el('span','cfHistoryLatest','Senaste'));
   block.append(h);
   const issues=Array.isArray(entry.issues)?entry.issues:[];
   if(issues.length){
    const ul=el('ul','cfHistoryIssues');
    for(const issue of issues){const li=el('li');li.append(el('strong','',[issue.n,issue.title].filter(Boolean).join(' · ')));const note=String(issue.note||'').trim();if(note)li.append(el('span','',note));ul.append(li);}
    block.append(ul);
   }else block.append(el('p','cfHistoryNone','Inga anmärkningar.'));
   const notes=String(entry.notes||'').trim();
   if(notes){const p=el('p','cfHistoryNotes');p.append(el('strong','','Allmän anmärkning: '),document.createTextNode(notes));block.append(p);}
   content.append(block);
  });
  card.append(head,content);overlay.append(card);
  overlay.addEventListener('click',event=>{if(event.target===overlay)closeHistory();});
  // Drag the box by its title.
  let drag=null;
  head.addEventListener('pointerdown',event=>{
   if(event.button!==0||event.target.closest('button'))return;
   const r=card.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top};
   head.setPointerCapture(event.pointerId);event.preventDefault();
  });
  head.addEventListener('pointermove',event=>{
   if(drag?.id!==event.pointerId)return;
   const r=card.getBoundingClientRect(),w=innerWidth,h=innerHeight;
   const left=Math.max(4,Math.min(w-r.width-4,drag.left+event.clientX-drag.x)),top=Math.max(4,Math.min(h-Math.min(r.height,120),drag.top+event.clientY-drag.y));
   Object.assign(card.style,{position:'fixed',left:left+'px',top:top+'px',margin:'0'});card.dataset.moved='true';
  });
  const end=event=>{if(drag?.id===event.pointerId)drag=null;};
  head.addEventListener('pointerup',end);head.addEventListener('pointercancel',end);
  document.addEventListener('keydown',onKey,true);
  body.append(overlay);close.focus({preventScroll:true});
 }

 if(typeof showSelected==='function'){
  const previous=showSelected;
  showSelected=function(...args){const result=previous.apply(this,args);sync();return result;};
 }
 new MutationObserver(()=>{if(!button||!button.isConnected)sync();}).observe(body,{childList:true,subtree:true});
 window.addEventListener('revision-work-loaded',sync);
 sync();
 window.ControlflowHistory=Object.freeze({entries:o=>entriesFor(o),open:openHistory,close:closeHistory,refresh:sync});
})();
