(() => {
 'use strict';
 const $=id=>document.getElementById(id);let users=[],busy=false,pendingRemove=null,editingUser=null,editingApproval=null;
 const labels={active:'Godkänd',invited:'Inbjuden',pending:'Väntar',removed:'Åtkomst borttagen',expired:'Licens utgången'};
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
   const info=node('div');const expires=user.expiresAt?Date.parse(user.expiresAt):null;
   const remaining=expires===null?'Ingen tidsgräns':expires<=Date.now()?'Licensen har gått ut':Math.ceil((expires-Date.now())/86400000)+' dagar kvar';
   info.append(node('strong','',name),node('small','',user.email+' · '+(user.status==='pending'&&!user.emailVerified?'E-post ej bekräftad':user.protected?'Administratör':remaining)));identity.append(avatar,info);
   row.append(identity,node('div','',undefined));row.lastChild.append(node('span','badge '+user.status,user.protected?'Administratör':labels[user.status]));
   const actions=node('div','actions');
   const button=(text,action,style='secondary')=>{const b=node('button',style,text);b.type='button';b.disabled=busy;b.addEventListener('click',()=>void perform(action,user));actions.append(b)};
   if(user.protected)actions.append(node('span','ownerlabel','Skyddat ägarkonto'));
   else if(user.status==='pending'||user.status==='removed'){
    const b=button(user.status==='pending'?'Godkänn':'Återaktivera','approve');
    if(user.status==='pending'&&!user.emailVerified){b.disabled=true;b.title='E-postadressen måste bekräftas först.';}
   }
   else{button('Redigera licens','license');button('Ny länk','link');}
   if(!user.protected)button('Radera konto','delete','secondary danger');
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
  try{const result=await window.TillsynoAuth.admin(action,action==='delete'?{userId:user.id,confirmEmail:user.email}:{userId:user.id});notice(result.message);if(result.link)showLink(result);}
  catch(error){notice(error.message,'error');}
  finally{busy=false;await load();}
 }
 async function perform(action,user){
  if(action==='approve'){
   editingApproval=user;
   $('approvalForm').reset();$('approvalError').hidden=true;
   $('approvalPerson').textContent=(user.name||user.email)+' · '+user.email;
   $('approvalDialog').showModal();return;
  }
  if(action==='license'){editingUser=user;
    $('licensePerson').textContent=user.name?user.name+' · '+user.email:user.email;
    $('licenseCurrent').textContent=user.expiresAt?'Gäller till: '+new Date(user.expiresAt).toLocaleDateString('sv-SE'): 'Ingen tidsgräns ännu';
    $('licenseDays').value='';
    $('licenseError').hidden=true;
    document.querySelectorAll('#licenseForm input[name="modules"]').forEach(c=>c.checked=(user.modules||[]).includes(c.value));
    $('licenseDialog').showModal();return;
   }
   if(action==='delete'){pendingRemove=user;$('confirmDeleteEmail').value='';$('confirmRemove').disabled=true;$('confirmText').textContent='Radera '+user.email+' permanent från Tillsyno och Supabase? Konto och licens tas bort, men lokalt sparade PDF-filer påverkas inte. Personen kan registrera samma e-postadress på nytt och måste godkännas igen.';$('confirmDialog').showModal();return;}
  await execute(action,user);
 }
 $('addUser').addEventListener('click',()=>{$('addForm').reset();$('addError').hidden=true;$('addDialog').showModal();});
 $('addForm').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;$('createUser').disabled=true;$('addError').hidden=true;
  try{const fields=new FormData($('addForm'));const modules=[...$('addForm').querySelectorAll('input[name="modules"]:checked')].map(x=>x.value);
   if(!modules.length)throw Error('Välj minst en modul.');
   const result=await window.TillsynoAuth.admin('add',{email:String(fields.get('email')||''),name:String(fields.get('name')||''),modules,licenseDays:Number(fields.get('licenseDays'))});$('addDialog').close();notice(result.message);showLink(result);}
  catch(error){$('addError').textContent=error.message;$('addError').hidden=false;}
  finally{busy=false;$('createUser').disabled=false;await load();}
 });

 $('approvalForm').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!editingApproval)return;
  const modules=[...$('approvalForm').querySelectorAll('input[name="modules"]:checked')].map(x=>x.value);
  if(!modules.length){$('approvalError').textContent='Välj minst en modul.';$('approvalError').hidden=false;return;}
  busy=true;$('approveUser').disabled=true;$('approvalError').hidden=true;
  try{
   const result=await window.TillsynoAuth.admin('approve',{userId:editingApproval.id,modules,licenseDays:Number($('approvalDays').value)});
   $('approvalDialog').close();notice(result.message);
  }catch(error){$('approvalError').textContent=error.message;$('approvalError').hidden=false;}
  finally{busy=false;$('approveUser').disabled=false;editingApproval=null;await load();}
 });
 $('licenseForm').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!editingUser)return;
  const modules=[...$('licenseForm').querySelectorAll('input[name="modules"]:checked')].map(x=>x.value);
  if(!modules.length){$('licenseError').textContent='Välj minst en modul.';$('licenseError').hidden=false;return;}
  const days=$('licenseDays').value;busy=true;$('saveLicense').disabled=true;
  try{
   const data={userId:editingUser.id,modules};
   if(days)data.licenseDays=Number(days);
   const result=await window.TillsynoAuth.admin('update',data);
   notice(result.message);$('licenseDialog').close();
  }catch(error){$('licenseError').textContent=error.message;$('licenseError').hidden=false;}
  finally{busy=false;$('saveLicense').disabled=false;await load();}
 });
 $('extendLicense').addEventListener('click',async()=>{
  if(busy||!editingUser)return;
  busy=true;$('extendLicense').disabled=true;$('licenseError').hidden=true;
  try{
   const result=await window.TillsynoAuth.admin('extend',{userId:editingUser.id,licenseDays:Number($('extendDays').value)});
   notice(result.message);$('licenseDialog').close();
  }catch(error){$('licenseError').textContent=error.message;$('licenseError').hidden=false;}
  finally{busy=false;$('extendLicense').disabled=false;await load();}
 });
 $('confirmDeleteEmail').addEventListener('input',()=>{$('confirmRemove').disabled=!pendingRemove||$('confirmDeleteEmail').value.trim().toLowerCase()!==pendingRemove.email.toLowerCase();});
 $('confirmRemove').addEventListener('click',()=>{const user=pendingRemove;if(!user||$('confirmDeleteEmail').value.trim().toLowerCase()!==user.email.toLowerCase())return;pendingRemove=null;$('confirmDialog').close();$('confirmDeleteEmail').value='';void execute('delete',user);});
 $('confirmDialog').addEventListener('close',()=>{pendingRemove=null;$('confirmDeleteEmail').value='';$('confirmRemove').disabled=true;});
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{const dialog=$(b.dataset.close);dialog.close();if(dialog.id==='linkDialog')$('inviteLink').value='';}));
 $('linkDialog').addEventListener('close',()=>{$('inviteLink').value=''});
 $('copyLink').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('inviteLink').value);$('copyStatus').textContent='Länken är kopierad.';}catch(_){$('inviteLink').focus();$('inviteLink').select();$('copyStatus').textContent='Markera länken och välj Kopiera.';}});
 $('search').addEventListener('input',render);$('refresh').addEventListener('click',()=>void load());
 window.addEventListener('tillsyno-authorized',()=>void load());if(window.TillsynoCurrentAccess)void load();
})();
