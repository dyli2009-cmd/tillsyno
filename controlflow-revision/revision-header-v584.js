/* v2.4.584: Dörrautomatik / Lås – sidhuvud, verktygsmeny och fråga innan ritningen lämnas.
   Laddas bara av controlflow-revision/all-in-one.html. Delade Kontrollflödesfiler ändras inte,
   så Säkerhetsservice och Brand påverkas inte.
   - Öppna ritning och Stäng ritning ligger bredvid Mall och PDF. Filnamnet visas i sidhuvudet,
     på telefon i raden med antal objekt. Versionsraden finns inte i sidhuvudet.
   - Textstorleken (A− / A+) finns inte här, och texten visas alltid i 100 %.
   - Verktygsknappen har en verktygsikon. Menyn har inga zoomknappar; zoom görs med fingrarna eller mushjulet.
   - Hem och Stäng ritning frågar först om något har ändrats sedan PDF:en sparades senast. */
(()=>{
 'use strict';
 const root=document.documentElement,body=document.body;
 if(root.dataset.cfStampMode!=='revision'||!body||!body.classList.contains('allInOneApp'))return;
 if(body.dataset.revHeader==='584')return;
 body.dataset.revHeader='584';
 const $=id=>document.getElementById(id);
 const svg=shape=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+shape+'</svg>';
 const ICON={
  open:'<path d="M3 8V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v2"/><path d="M3 9h18l-3 11H5L3 9Z"/>',
  close:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9.5 12.5l5 5M14.5 12.5l-5 5"/>',
  tools:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>'
 };
 const hasDrawing=()=>typeof pdf!=='undefined'&&!!pdf;

 // 1. Fixed text size: the shared controller may still hold a level chosen in Säkerhetsservice.
 // The stored choice is left as it is; this page only shows 100 %.
 function pinText(){
  if(root.hasAttribute('data-cf-large-text'))root.removeAttribute('data-cf-large-text');
  if(body.dataset.appTextSize!=='0')body.dataset.appTextSize='0';
 }
 new MutationObserver(pinText).observe(root,{attributes:true,attributeFilter:['data-cf-large-text']});
 new MutationObserver(pinText).observe(body,{attributes:true,attributeFilter:['data-app-text-size']});
 pinText();

 // 2. Header: Öppna ritning, Stäng ritning, Mall, PDF in one row. File name in the header, on a phone in the object row.
 const compactQuery=matchMedia('(max-width:800px)');
 const compact=()=>compactQuery.matches||root.dataset.tillsynoDevice==='phone';
 let fileGroup=null,closeButton=null;
 function setupHeader(){
  const header=document.querySelector('.secAppHeader'),primary=header?.querySelector('.cfPrimaryActions'),change=$('secChangeDrawing');
  if(!header||!primary||!change)return false;
  header.querySelector('.headerModuleVersion')?.remove();
  fileGroup=document.createElement('div');fileGroup.className='revHeaderFiles';fileGroup.setAttribute('role','group');fileGroup.setAttribute('aria-label','Ritning');
  change.classList.add('appHeaderIconButton','revOpenDrawing');change.innerHTML=svg(ICON.open)+'<span>Öppna ritning</span>';
  change.title='Öppna ritning';change.setAttribute('aria-label','Öppna ritning');
  closeButton=document.createElement('button');closeButton.type='button';closeButton.id='revCloseDrawing';closeButton.className='appHeaderIconButton revCloseDrawing';
  closeButton.innerHTML=svg(ICON.close)+'<span>Stäng ritning</span>';closeButton.title='Stäng ritning';closeButton.setAttribute('aria-label','Stäng ritning');
  closeButton.addEventListener('click',()=>guard('close'));
  fileGroup.append(change,closeButton);primary.prepend(fileGroup);
  return true;
 }
 function placeFileName(){
  const line=document.querySelector('.workspaceFileLine'),details=document.querySelector('.secAppHeader .headerDetails'),bar=document.querySelector('.objectBar');
  if(!line||!details||!bar)return;
  const small=compact();body.toggleAttribute('data-rev-compact',small);
  if(small){if(line.parentNode!==bar)bar.prepend(line);}
  else if(line.parentNode!==details)details.append(line);
  if(closeButton){const loaded=body.classList.contains('secHasPdf');if(closeButton.hidden===loaded)closeButton.hidden=!loaded;}
 }

 // 3. Tools menu: tool icon, stamp and overview actions in their own section, no zoom buttons.
 function setupTools(){
  const launcher=document.querySelector('.serviceToolLauncher'),menu=document.querySelector('.serviceToolsMenu');
  if(!launcher||!menu)return false;
  const toolIcon=svg(ICON.tools).replace('<svg ','<svg data-rev-icon="tools" ');
  if(!launcher.querySelector('svg[data-rev-icon="tools"]')){launcher.innerHTML=toolIcon;launcher.title='Verktyg';launcher.setAttribute('aria-label','Verktyg');}
  // The protocol view copies this icon for its own Verktyg button.
  const protocolIcon=$('cfProtocolTools')?.querySelector('svg');if(protocolIcon&&!protocolIcon.hasAttribute('data-rev-icon'))protocolIcon.outerHTML=toolIcon;
  let actions=menu.querySelector('.revToolActions');
  if(!actions){actions=document.createElement('div');actions.className='revToolActions';actions.setAttribute('role','group');actions.setAttribute('aria-label','Stämplar och översikt');}
  const choices=menu.querySelector('.serviceToolChoices');
  if(choices&&actions.previousSibling!==choices)choices.after(actions);else if(!choices&&actions.parentNode!==menu)menu.append(actions);
  // Same order as before: stamps first, then the service overview.
  const wanted=['securitySelectStamps','revisionOverviewTool'].map($).filter(Boolean);
  if(wanted.some((node,i)=>actions.children[i]!==node))actions.append(...wanted);
  return true;
 }

 // 4. Ask before leaving the drawing when the work has changed since the PDF was saved.
 // The work itself is saved on the device all the time; this is about the PDF file.
 let baseline=null,pending=null,exportChosen=false,overlay=null;
 function workState(){try{return JSON.stringify({items,textNotes,drawingExtras,project,logoData})}catch(_){return null}}
 function changed(){
  if(!hasDrawing())return false;
  if(baseline===null)return !!(items.length||textNotes.length||drawingExtras.length);
  return workState()!==baseline;
 }
 window.addEventListener('revision-work-loaded',()=>{baseline=workState();setTimeout(()=>{baseline=workState()},0);});
 window.addEventListener('revision-drawing-closed',()=>{baseline=null;});
 window.addEventListener('revision-pdf-saved',event=>{
  const snapshot=event.detail?.snapshot;
  try{baseline=snapshot?JSON.stringify(snapshot):workState()}catch(_){baseline=workState()}
  const action=pending;pending=null;exportChosen=false;
  if(action)setTimeout(()=>ask(action,true),0);
 });
 const homeHref=()=>document.querySelector('.secAppHeader .homeIconLink')?.href||'../app.html';
 async function proceed(action){
  closeDialog();
  if(action==='home'){location.href=homeHref();return;}
  if(typeof window.closeRevisionDrawing==='function')await window.closeRevisionDrawing();
 }
 function guard(action){
  if(!hasDrawing()){if(action==='home')location.href=homeHref();return;}
  if(!changed()){void proceed(action);return;}
  ask(action,false);
 }
 function closeDialog(){
  if(!overlay)return;
  const previous=overlay.__previous;overlay.remove();overlay=null;document.removeEventListener('keydown',onKey,true);
  if(previous?.isConnected)previous.focus({preventScroll:true});
 }
 function onKey(event){
  if(!overlay)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}
  if(event.key!=='Tab')return;
  const buttons=[...overlay.querySelectorAll('button')];if(!buttons.length)return;
  const first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
 function ask(action,saved){
  closeDialog();
  const home=action==='home';
  overlay=document.createElement('div');overlay.className='revLeaveOverlay';overlay.__previous=document.activeElement;
  const card=document.createElement('div');card.className='revLeaveCard';card.setAttribute('role','alertdialog');card.setAttribute('aria-modal','true');
  card.setAttribute('aria-labelledby','revLeaveTitle');card.setAttribute('aria-describedby','revLeaveText');card.dataset.action=action;card.dataset.saved=String(saved);
  const title=document.createElement('h2');title.id='revLeaveTitle';
  const text=document.createElement('p');text.id='revLeaveText';
  const buttons=document.createElement('div');buttons.className='revLeaveActions';
  const make=(label,className,fn)=>{const b=document.createElement('button');b.type='button';b.className=className;b.textContent=label;b.addEventListener('click',fn);buttons.append(b);return b;};
  const leaveLabel=home?'Gå till startsidan':'Stäng ritningen';
  let focus;
  if(saved){
   title.textContent='PDF:en är sparad';
   text.textContent=home?'Vill du gå till startsidan nu?':'Vill du stänga ritningen nu?';
   focus=make(leaveLabel,'primary revLeavePrimary',()=>void proceed(action));
   make('Stanna kvar','revLeaveCancel',closeDialog);
  }else{
   title.textContent=home?'Lämna ritningen?':'Stäng ritningen?';
   text.textContent='Arbetet är sparat på den här enheten, men ingen PDF har sparats sedan den senaste ändringen.';
   focus=make('Spara PDF','primary revLeaveSave',()=>{pending=action;exportChosen=false;closeDialog();$('securityExport')?.click();});
   make(home?'Lämna utan att spara PDF':'Stäng utan att spara PDF','revLeaveDiscard',()=>void proceed(action));
   make('Avbryt','revLeaveCancel',closeDialog);
  }
  card.append(title,text,buttons);overlay.append(card);
  overlay.addEventListener('click',event=>{if(event.target===overlay)closeDialog();});
  document.addEventListener('keydown',onKey,true);
  body.append(overlay);focus.focus({preventScroll:true});
 }
 // The save dialog closed without a save choice: forget that the user was on the way out.
 document.addEventListener('click',event=>{if(event.target.closest?.('#secSaveWork,#secSaveNew'))exportChosen=true;},true);
 const saveDialog=$('secSaveDialog');
 if(saveDialog){
  const forget=()=>{setTimeout(()=>{if(!exportChosen)pending=null;},0);};
  saveDialog.addEventListener('close',forget);
  new MutationObserver(()=>{if(pending&&saveDialog.hidden&&!saveDialog.open)forget();}).observe(saveDialog,{attributes:true,attributeFilter:['hidden','open']});
 }
 // Capture on window runs before every other click handler for the Hem link.
 window.addEventListener('click',event=>{
  const link=event.target.closest?.('.secAppHeader .homeIconLink');
  if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  if(!hasDrawing())return;
  event.preventDefault();event.stopPropagation();guard('home');
 },true);

 window.RevisionLeaveGuard=Object.freeze({changed,ask:action=>guard(action)});

 // Layout follows device class, drawing state and late rebuilds of the menu.
 let headerReady=false,scheduled=false;
 function update(){
  scheduled=false;
  if(!headerReady)headerReady=setupHeader();
  setupTools();
  placeFileName();pinText();
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(update);}
 new MutationObserver(schedule).observe(body,{attributes:true,attributeFilter:['class','data-view']});
 new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-tillsyno-device']});
 compactQuery.addEventListener('change',schedule);
 window.addEventListener('revision-work-loaded',schedule);
 update();
})();
