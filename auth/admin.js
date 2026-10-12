(() => {
 'use strict';
 const $=id=>document.getElementById(id);let users=[],busy=false,pendingRemove=null;
 const labels={active:'Godkänd',invited:'Inbjuden',pending:'Väntar',removed:'Åtkomst borttagen'};
 function notice(text,type='success'){$('message').textContent=text;$('message').className='notice '+type;$('message').hidden=false;}
 const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el};
 function render(){
  $('activeCount').textContent=users.filter(u=>['active','invited'].includes(u.status)).length;
  $('pendingCount').textContent=users.filter(u=>u.status==='pending').length;$('totalCount').textContent=users.length;
  const query=$('search').value.trim().toLocaleLowerCase('sv'),filtered=users.filter(u=>(u.name+' '+u.email).toLocaleLowerCase('sv').includes(query));
  $('users').replaceChildren();
  for(const user of filtered){
   const row=node('li','userrow'),identity=node('div','identity'),name=user.name||user.email;
   const avatar=node('span','avatar',(user.name?user.name.split(/\s+/).slice(0,2).map(n=>n[0]).join(''):user.email.slice(0,2)).toUpperCase());avatar.setAttribute('aria-hidden','true');
   const info=node('div');info.append(node('strong','',name),node('small','',user.name?user.email:user.protected?'Ägare av Tillsyno':'Personligt konto'));identity.append(avatar,info);
   row.append(identity,node('div','',undefined));row.lastChild.append(node('span','badge '+user.status,user.protected?'Administratör':labels[user.status]));
   const actions=node('div','actions');
   const button=(text,action,style='secondary')=>{const b=node('button',style,text);b.type='button';b.disabled=busy;b.addEventListener('click',()=>void perform(action,user));actions.append(b)};
   if(user.protected)actions.append(node('span','ownerlabel','Skyddat ägarkonto'));
   else if(user.status==='pending'||user.status==='removed')button('Godkänn','approve');
   else{button('Ny länk','link');button('Ta bort','remove','secondary danger');}
   row.append(actions);$('users').append(row);
  }
  $('empty').hidden=filtered.length>0;$('empty').textContent=query?'Ingen användare matchar din sökning.':'Inga användare hittades.';
 }
 function showLink(result){$('linkRecipient').textContent='Dela endast med '+result.email+'. Länken används för att välja ett eget lösenord.';$('inviteLink').value=result.link;$('copyStatus').textContent='';$('linkDialog').showModal();}
 async function load(){
  if(busy)return;busy=true;$('refresh').disabled=true;
  try{users=(await window.TillsynoAuth.admin('list')).users.sort((a,b)=>Number(b.protected)-Number(a.protected)||a.email.localeCompare(b.email,'sv'));render();}
  catch(error){notice(error.message,'error');$('empty').textContent='Listan kunde inte hämtas. Tryck på uppdatera för att försöka igen.';}
  finally{busy=false;$('refresh').disabled=false;render();}
 }
 async function execute(action,user){
  if(busy)return;busy=true;render();
  try{const result=await window.TillsynoAuth.admin(action,{userId:user.id});notice(result.message);if(result.link)showLink(result);}
  catch(error){notice(error.message,'error');}
  finally{busy=false;await load();}
 }
 async function perform(action,user){
  if(action==='remove'){pendingRemove=user;$('confirmText').textContent='Ta bort åtkomsten för '+user.email+'? Personen kan godkännas igen senare.';$('confirmDialog').showModal();return;}
  await execute(action,user);
 }
 $('addUser').addEventListener('click',()=>{$('addForm').reset();$('addError').hidden=true;$('addDialog').showModal();});
 $('addForm').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;$('createUser').disabled=true;$('addError').hidden=true;
  try{const fields=new FormData($('addForm'));const result=await window.TillsynoAuth.admin('add',{email:String(fields.get('email')||''),name:String(fields.get('name')||'')});$('addDialog').close();notice(result.message);showLink(result);}
  catch(error){$('addError').textContent=error.message;$('addError').hidden=false;}
  finally{busy=false;$('createUser').disabled=false;await load();}
 });
 $('confirmRemove').addEventListener('click',()=>{const user=pendingRemove;pendingRemove=null;$('confirmDialog').close();if(user)void execute('remove',user);});
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{const dialog=$(b.dataset.close);dialog.close();if(dialog.id==='linkDialog')$('inviteLink').value='';}));
 $('linkDialog').addEventListener('close',()=>{$('inviteLink').value=''});
 $('copyLink').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('inviteLink').value);$('copyStatus').textContent='Länken är kopierad.';}catch(_){$('inviteLink').focus();$('inviteLink').select();$('copyStatus').textContent='Markera länken och välj Kopiera.';}});
 $('search').addEventListener('input',render);$('refresh').addEventListener('click',()=>void load());
 window.addEventListener('tillsyno-authorized',()=>void load());if(window.TillsynoCurrentAccess)void load();
})();
