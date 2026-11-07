/* Scoped protocol dialogs. Load before revision-inline-v310.js so these dialogs
   can use the native modal top layer without altering the legacy inline views. */
(() => {
 'use strict';
 const nativeShowModal=window.HTMLDialogElement?.prototype.showModal;
 const nativeClose=window.HTMLDialogElement?.prototype.close;
 let active=null;
 function enabled(){
  const route=document.documentElement.dataset;
  return route.controlflowUi==='1'&&['security','revision'].includes(route.cfStampMode)&&typeof nativeShowModal==='function'&&typeof nativeClose==='function';
 }
 function viewport(){
  const view=window.visualViewport;
  return {left:view?.offsetLeft||0,top:view?.offsetTop||0,width:view?.width||window.innerWidth,height:view?.height||window.innerHeight};
 }
 function open(options,kind){
  if(!enabled())return Promise.resolve(null);
  active?.cancel();
  return new Promise(resolve=>{
   const previous=document.activeElement,dialog=document.createElement('dialog'),form=document.createElement('form');
   dialog.id='controlflowAppDialog';dialog.className='cfAppDialog';dialog.dataset.kind=kind;
   dialog.setAttribute('aria-labelledby','controlflowAppDialogTitle');
   form.className='cfAppDialogForm';form.noValidate=true;
   const head=document.createElement('header'),heading=document.createElement('h2'),close=document.createElement('button');
   head.className='cfAppDialogHead';head.tabIndex=0;head.setAttribute('aria-label','Flytta dialogfönstret med piltangenterna');
   heading.id='controlflowAppDialogTitle';heading.className='cfAppDialogTitle';heading.textContent=options.title;
   close.type='button';close.className='cfAppDialogClose';close.textContent='×';close.setAttribute('aria-label','Avbryt och stäng');
   head.append(heading,close);
   const body=document.createElement('div');body.className='cfAppDialogBody';
   if(options.description){
    const description=document.createElement('p');description.id='controlflowAppDialogDescription';description.className='cfAppDialogDescription';description.textContent=options.description;
    body.append(description);dialog.setAttribute('aria-describedby',description.id);
   }
   let input=null,error=null;
   if(kind==='edit'){
    const label=document.createElement('label');label.className='cfAppDialogLabel';label.htmlFor='controlflowAppDialogText';label.textContent=options.label||'Kontrollpunkt';
    input=document.createElement('textarea');input.id='controlflowAppDialogText';input.className='cfAppDialogInput';input.rows=4;input.value=String(options.value||'');input.required=true;
    input.setAttribute('aria-describedby','controlflowAppDialogError');
    error=document.createElement('p');error.id='controlflowAppDialogError';error.className='cfAppDialogError';error.setAttribute('role','status');error.setAttribute('aria-live','polite');
    body.append(label,input,error);
    input.addEventListener('input',()=>{if(input.value.trim()){error.textContent='';input.removeAttribute('aria-invalid');}});
    input.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();form.requestSubmit();}});
   }
   const actions=document.createElement('footer');actions.className='cfAppDialogActions';
   const cancel=document.createElement('button');cancel.type='button';cancel.className='cfAppDialogCancel';cancel.textContent='Avbryt';
   const submit=document.createElement('button');submit.type='submit';submit.className='cfAppDialogSubmit '+(kind==='remove'?'cfAppDialogDanger':'primary');submit.textContent=kind==='remove'?(options.confirmLabel||'Ta bort'):(options.submitLabel||'OK');
   if(kind==='edit'&&options.allowRemove){
    const remove=document.createElement('button');remove.type='button';remove.className='cfAppDialogDanger';remove.textContent='Ta bort';remove.addEventListener('click',()=>finish({action:'remove'}));actions.append(remove);
   }
   actions.append(cancel,submit);form.append(head,body,actions);dialog.append(form);document.body.append(dialog);
   let settled=false,drag=null;
   function finish(value){
    if(settled)return;settled=true;drag=null;
    window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('scroll',resize);
    if(dialog.open)nativeClose.call(dialog);dialog.remove();
    if(active?.dialog===dialog)active=null;
    const focus=[previous,document.getElementById('cfProtocolTools'),document.getElementById('secEditChecks')].find(node=>node?.isConnected&&node.getClientRects().length&&!node.closest('[hidden]'));
    focus?.focus({preventScroll:true});
    resolve(value);
   }
   function position(left,top,manual=true){
    const view=viewport(),rect=dialog.getBoundingClientRect(),minX=view.left+8,minY=view.top+8;
    const x=Math.max(minX,Math.min(left,Math.max(minX,view.left+view.width-rect.width-8)));
    const y=Math.max(minY,Math.min(top,Math.max(minY,view.top+view.height-rect.height-8)));
    Object.assign(dialog.style,{left:x+'px',top:y+'px',right:'auto',bottom:'auto',margin:'0',transform:'none'});if(manual)dialog.dataset.dragged='true';
   }
   function resize(){
    const view=viewport();dialog.style.setProperty('--cf-dialog-viewport-height',view.height+'px');
    if(!dialog.open)return;
    const rect=dialog.getBoundingClientRect();
    if(dialog.dataset.dragged==='true')position(rect.left,rect.top,false);
    else position(view.left+(view.width-rect.width)/2,view.top+(view.height-rect.height)/2,false);
   }
   head.addEventListener('pointerdown',event=>{
    if(drag||event.button!==0||event.target.closest('button,input,textarea,select,a'))return;
    const rect=dialog.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};
    head.setPointerCapture(event.pointerId);head.focus({preventScroll:true});event.preventDefault();
   });
   head.addEventListener('pointermove',event=>{if(drag?.id===event.pointerId){position(drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y);event.preventDefault();}});
   const endDrag=event=>{if(drag?.id!==event.pointerId)return;drag=null;if(head.hasPointerCapture(event.pointerId))head.releasePointerCapture(event.pointerId);};
   head.addEventListener('pointerup',endDrag);head.addEventListener('pointercancel',endDrag);head.addEventListener('lostpointercapture',()=>{drag=null;});
   head.addEventListener('keydown',event=>{
    if(event.target!==head||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();const rect=dialog.getBoundingClientRect(),step=event.shiftKey?1:10;
    position(rect.left+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),rect.top+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0));
   });
   form.addEventListener('submit',event=>{
    event.preventDefault();
    if(kind==='remove'){finish({action:'remove'});return;}
    const value=input.value.trim();
    if(!value){error.textContent='Skriv kontrollpunktens text.';input.setAttribute('aria-invalid','true');input.focus();return;}
    finish({action:'save',value});
   });
   close.addEventListener('click',()=>finish(null));cancel.addEventListener('click',()=>finish(null));
   dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});dialog.addEventListener('close',()=>finish(null));
   active={dialog,cancel:()=>finish(null)};
   window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize);resize();
   nativeShowModal.call(dialog);resize();(input||cancel).focus({preventScroll:true});
  });
 }
 window.ControlflowDialogs=Object.freeze({version:'2.4.552',enabled,edit:options=>open(options,'edit'),confirm:async options=>(await open(options,'remove'))?.action==='remove'});
})();
