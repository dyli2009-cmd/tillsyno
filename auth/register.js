(() => {
 'use strict';
 const form=document.getElementById('register'),message=document.getElementById('message');
 const auth=window.TillsynoAuth;
 const show=(text,isError=false)=>{message.textContent=text;message.hidden=false;message.className='notice '+(isError?'error':'success')};
 if(!auth){show('Registreringen kunde inte laddas. Kontrollera internet.',true);form.hidden=true;return}
 const generator=document.getElementById('generatePassword');
 generator.addEventListener('click',()=>{
  if(!window.crypto?.getRandomValues){show('Automatisk lösenordsgenerering stöds inte här. Använd iPhones lösenordsförslag.',true);return}
  const alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  const random=new Uint8Array(20);window.crypto.getRandomValues(random);
  const value=Array.from(random,b=>alphabet[b&63]).join('');
  form.elements.password.value=value;form.elements.confirmPassword.value=value;
  form.elements.password.type='text';
  form.elements.password.focus();
  show('Ett starkt lösenord har skapats och fyllts i båda fälten. Spara det säkert innan du registrerar.');
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!navigator.onLine){show('Du behöver internet för att registrera dig.',true);return}
  const fields=new FormData(form),name=String(fields.get('name')||'').trim(),email=String(fields.get('email')||'').trim().toLowerCase();
  const password=String(fields.get('password')||''),confirm=String(fields.get('confirmPassword')||'');
  if(name.length<2||name.length>100){show('Skriv ditt för- och efternamn.',true);return}
  if(password.length<12||password.length>128){show('Lösenordet ska innehålla minst 12 tecken.',true);return}
  if(password!==confirm){show('Lösenorden stämmer inte överens.',true);return}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  try{
   const {error}=await auth.client.auth.signUp({email,password,options:{data:{name},emailRedirectTo:new URL('login.html',location.href).href}});
   if(error)throw error;
   // A signup session must never become an offline or approved session.
   auth.clear();await auth.client.auth.signOut({scope:'local'}).catch(()=>{});
   form.reset();form.hidden=true;
   show('Registreringsförsöket är mottaget. Om adressen är ny och e-postbekräftelse är aktiverad ska ett mejl skickas. Kontrollera även skräpposten. Har du redan ett konto skickas normalt ingen ny bekräftelse. När adressen bekräftats väntar kontot på administratörens godkännande; ingen åtkomst ges automatiskt.');
  }catch(error){
   if(/already registered|user already exists|already been registered/i.test(error.message||'')){
    form.reset();form.hidden=true;show('Om adressen kan registreras skickas information via e-post. Ett konto måste godkännas av administratören innan det kan användas.');
   }else if(/rate limit|too many|email rate/i.test(error.message||'')){show('För många försök. Försök igen senare.',true)}
   else show(error.message||'Registreringen misslyckades. Försök igen.',true);
  }finally{button.disabled=false}
 });
})();