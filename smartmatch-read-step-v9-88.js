/* Bounded, cancellable waits shared by the reader and matcher. */
(()=>{
 'use strict';
 function wait(promise,{label='Avläsningen',cancelled=()=>false,onStop=()=>{},timeoutMs=60000}={}){
  return new Promise((resolve,reject)=>{
   let done=false,timer,poll;
   const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);clearInterval(poll);fn(value);};
   const stop=(message,code)=>{if(done)return;const error=Object.assign(new Error(message),{code});finish(reject,error);try{onStop();}catch(_){};};
   timer=setTimeout(()=>stop(label+' svarade inte inom tidsgränsen. Försök igen. Redan lästa kort är kvar.','READ_STEP_TIMEOUT'),timeoutMs);
   poll=setInterval(()=>{if(cancelled())stop('Avläsningen avbröts.','READ_CANCELLED');},200);
   Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));
   if(cancelled())stop('Avläsningen avbröts.','READ_CANCELLED');
  });
 }
 window.SmartMatchReadStep=Object.freeze({wait});
})();
