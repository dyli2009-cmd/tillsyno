/* Only loaded by the isolated revision test. Existing dialog contracts are
   presented as ordinary app pages, without top-layer modals or backdrops. */
(() => {
 'use strict';
 const nativeShow=HTMLDialogElement.prototype.show,nativeClose=HTMLDialogElement.prototype.close;
 const stack=[],states=new WeakMap();let host,content,back,undoStamp=null,undoButton=null;
 function ensure(){
  if(host)return;
  host=document.createElement('section');host.id='revisionInlineWorkspace';host.hidden=true;host.setAttribute('aria-label','Arbetsvy');
  const bar=document.createElement('div');bar.className='revisionInlineNavigation';
  back=document.createElement('button');back.type='button';back.textContent='‹ Tillbaka';back.onclick=()=>stack.at(-1)?.close();bar.append(back);
  content=document.createElement('div');content.className='revisionInlineContent';host.append(bar,content);document.querySelector('main').before(host);
  document.querySelector('#mobileBar')?.addEventListener('click',()=>{for(const dialog of [...stack].reverse())dialog.close();},true);
 }
 function paint(){
  const current=stack.at(-1);host.hidden=!current;document.body.classList.toggle('revisionInlineActive',!!current);
  for(const dialog of stack)dialog.hidden=dialog!==current;
 }
 function open(dialog){
  ensure();if(dialog.open)return;
  states.set(dialog,{focus:document.activeElement,scroll:host.scrollTop});
  dialog.classList.add('revisionInlinePage');dialog.setAttribute('role','region');dialog.removeAttribute('aria-modal');dialog.hidden=false;
  if(!dialog.hasAttribute('aria-label')&&!dialog.hasAttribute('aria-labelledby'))dialog.setAttribute('aria-label',dialog.querySelector('h1,h2,h3')?.textContent||'Arbetsvy');
  content.append(dialog);stack.push(dialog);nativeShow.call(dialog);paint();host.scrollTop=0;
 }
 function closed(dialog){
  const index=stack.indexOf(dialog);if(index<0)return;stack.splice(index,1);dialog.hidden=true;paint();
  const state=states.get(dialog);host.scrollTop=state?.scroll||0;
  if(state?.focus?.isConnected&&state.focus.getClientRects().length)state.focus.focus({preventScroll:true});
 }
 // Shared by legacy helper screens too, without changing their data/import logic.
 HTMLDialogElement.prototype.show=function(){open(this)};
 HTMLDialogElement.prototype.showModal=function(){open(this)};
 HTMLDialogElement.prototype.close=function(value){nativeClose.call(this,value);closed(this)};
 document.addEventListener('close',event=>{if(event.target instanceof HTMLDialogElement)closed(event.target);},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&stack.length){event.preventDefault();stack.at(-1).close();}},true);
 function edit(title,value='',{allowRemove=false}={}){
  return new Promise(resolve=>{
   const dialog=document.createElement('dialog');dialog.className='revisionInlineEditor';
   const form=document.createElement('form'),heading=document.createElement('h2'),label=document.createElement('label'),input=document.createElement('textarea'),actions=document.createElement('div'),error=document.createElement('p');
   heading.textContent=title;dialog.setAttribute('aria-label',title);label.textContent=title;input.value=value;input.rows=4;input.setAttribute('aria-label',title);label.append(input);error.setAttribute('role','status');actions.className='revisionInlineActions';
   let result=null;
   const action=(text,fn)=>{const button=document.createElement('button');button.type='button';button.textContent=text;button.onclick=fn;actions.append(button);return button;};
   action('Avbryt',()=>dialog.close());if(allowRemove)action('Ta bort',()=>{result='';dialog.close();}).className='revisionInlineRemove';
   const save=action('Spara',()=>form.requestSubmit());save.className='primary';
   form.onsubmit=event=>{event.preventDefault();if(!input.value.trim()){error.textContent='Skriv en text först.';input.focus();return}result=input.value.trim();dialog.close();};
   dialog.addEventListener('close',()=>{dialog.remove();resolve(result);},{once:true});form.append(heading,label,error,actions);dialog.append(form);document.body.append(dialog);open(dialog);input.focus();
  });
 }
 function stamp(){return JSON.stringify({items,textNotes,drawingExtras,project,logoData})}
 function changed(){
  if(!undoStamp)return;
  if(!undoButton?.isConnected){undoStamp=null;return}
  if(undoStamp!==stamp()){undoButton.remove();undoStamp=null;}
 }
 function notice(text){
  const box=document.getElementById('securityMessage');box.classList.remove('error');box.replaceChildren(document.createTextNode(text+' '));
  undoStamp=stamp();const undo=document.createElement('button');undoButton=undo;undo.type='button';undo.textContent='Ångra';undo.className='revisionInlineUndo';undo.onclick=()=>{if(undoStamp!==stamp()){changed();return}undoStamp=null;if(securitySessionHistory.undo())box.textContent='Ändringen ångrades.';};box.append(undo);
 }
 window.RevisionInlineUI={edit,notice,changed,removed:label=>notice(label+' har tagits bort.')};
})();
