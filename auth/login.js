(() => {
 'use strict';
 const form=document.getElementById('login'),message=document.getElementById('message'),auth=window.TillsynoAuth;
 const show=text=>{message.textContent=text;message.hidden=false;};
 if(!auth){show('Inloggningen kunde inte laddas. Öppna appen med internet och ladda om sidan.');form.hidden=true;return;}
 function destination(){
  const fallback=new URL('index.html',auth.root),next=new URLSearchParams(location.search).get('next');
  if(!next)return fallback;
  try{
   const target=new URL(next,auth.root),relative=target.pathname.slice(auth.root.pathname.length);
   if(target.protocol===auth.root.protocol&&target.host===auth.root.host&&target.pathname.startsWith(auth.root.pathname)&&(relative===''||relative==='index.html'||relative==='auth/admin.html'||(relative.endsWith('.html')&&!relative.startsWith('auth/'))))return target;
  }catch(_){}
  return fallback;
 }
 async function enter(){await auth.verify({allowOffline:true});location.replace(destination());}
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button');button.disabled=true;show('Loggar in…');
  try{
   const fields=new FormData(form),{error}=await auth.client.auth.signInWithPassword({email:String(fields.get('email')||'').trim(),password:String(fields.get('password')||'')});
   if(error)throw Error('Fel e-postadress eller lösenord.');
   await enter();
  }catch(error){auth.clear();await auth.client.auth.signOut({scope:'local'});show(error.message||'Det gick inte att logga in.');}
  finally{button.disabled=false;}
 });
 auth.client.auth.getSession().then(({data})=>{if(data.session)return enter().catch(error=>show(error.message));}).catch(()=>{});
})();
