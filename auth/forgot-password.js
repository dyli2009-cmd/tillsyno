(() => {
 'use strict';
 const form=document.getElementById('forgotPassword'),message=document.getElementById('message'),button=document.getElementById('sendReset');
 const show=(text,isError=false)=>{message.textContent=text;message.hidden=false;message.className='notice '+(isError?'error':'success');};
 const config=window.TILLSYNO_AUTH_CONFIG;
 if(!window.supabase?.createClient||!config){show('Återställningen kunde inte laddas. Försök igen med internet.',true);form.hidden=true;return;}
 // No persistent login or administration privileges are needed to request a recovery email.
 const client=window.supabase.createClient(config.url,config.publishableKey,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(button.disabled)return;
  if(!navigator.onLine){show('Du behöver internet för att begära en återställningslänk.',true);return;}
  const email=form.elements.email.value.trim();
  if(!email||email.length>254)return;
  button.disabled=true;
  show('Kontrollerar din begäran…');
  try{
   const redirectTo=new URL('reset-password.html',location.href).href;
   const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
   if(error){
    if(/rate.limit|too.many|email.rate|over_email_send_rate_limit/i.test((error.code||'')+' '+(error.message||''))){
     show('För många försök. Vänta en stund innan du begär en ny länk.',true);return;
    }
    if(error.status>=500||error.status===0){show('Det gick inte att nå mejltjänsten. Försök igen senare.',true);return;}
    // Avoid revealing whether this address exists in the system.
   }
   form.hidden=true;
   show('Om e-postadressen har ett konto skickas en länk för att återställa lösenordet. Kontrollera inkorgen och skräpposten. Länken kan ta någon minut.');
  }catch(_){show('Det gick inte att skicka begäran. Kontrollera internet och försök igen.',true);}
  finally{button.disabled=false;}
 });
})();