/* Isolated progress reporting for SmartMatch Avläsning TEST 9.1.
 * Counts and estimates describe the current phase, never an invented share
 * of the whole operation. OCR's internal percentage is kept separate.
 */
(function(root){
 'use strict';

 const owns=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
 const text=value=>value==null?'':String(value).trim();
 const count=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?Math.floor(value):null;
 const pageNumber=value=>count(value)>0?count(value):null;
 const localProgress=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:null;
 const phaseFields=()=>({phase:'',label:'',page:null,pageIndex:null,pageCount:null,unit:'',done:null,total:null,detail:'',localPercent:null,scope:''});

 function formatDuration(milliseconds){
  if(typeof milliseconds!=='number'||!Number.isFinite(milliseconds)||milliseconds<0)return '—';
  const seconds=Math.round(milliseconds/1000);
  if(seconds<60)return `${seconds} s`;
  const minutes=Math.floor(seconds/60),rest=seconds%60;
  if(minutes<60)return `${minutes} min${rest?` ${rest} s`:''}`;
  const hours=Math.floor(minutes/60),remainingMinutes=minutes%60;
  return `${hours} tim${remainingMinutes?` ${remainingMinutes} min`:''}`;
 }

 function create(options={}){
  const clock=typeof options.now==='function'?options.now:()=>root.performance?.now?.()??Date.now();
  const every=typeof options.setInterval==='function'?options.setInterval:(callback,delay)=>root.setInterval(callback,delay);
  const stop=typeof options.clearInterval==='function'?options.clearInterval:handle=>root.clearInterval(handle);
  const onUpdate=typeof options.onUpdate==='function'?options.onUpdate:()=>{};
  let data={state:'idle',active:false,title:'',message:'',...phaseFields()};
  let startedAt=null,finishedAt=null,lastTime=0,timer=null,timerActive=false,generation=0;
  let estimateKey='',baselineAt=null,baselineDone=null;

  function now(){
   const value=clock();
   // performance.now() is monotonic. Keep the same property with injected
   // clocks, so a clock correction cannot make elapsed time run backwards.
   if(typeof value==='number'&&Number.isFinite(value))lastTime=Math.max(lastTime,value);
   return lastTime;
  }
  function clearTimer(){
   if(timerActive)stop(timer);
   timer=null;timerActive=false;
  }
  function resetEstimate(at){
   estimateKey=JSON.stringify([data.phase,data.unit,data.total,data.scope]);
   baselineAt=at;baselineDone=data.done;
  }
  function snapshot(){
   const at=data.active?now():finishedAt??startedAt??0;
   const elapsedMs=startedAt===null?0:Math.max(0,at-startedAt);
   const known=data.total!==null&&data.total>0&&data.done!==null&&data.done<=data.total;
   const percent=known?data.done/data.total*100:null;
   let remainingMs=null;
   if(data.active&&known){
    const completed=baselineDone===null?0:data.done-baselineDone;
    if(data.done===data.total)remainingMs=0;
    else if(completed>=2&&at>baselineAt){
     remainingMs=(at-baselineAt)/completed*(data.total-data.done);
    }
   }
   return Object.freeze({...data,percent,elapsedMs,remainingMs});
  }
  function emit(){const value=snapshot();onUpdate(value);return value;}

  function start(title='Avläsning pågår'){
   clearTimer();generation++;
   // A new run may use a newly reset injected clock.
   lastTime=0;startedAt=now();finishedAt=null;
   data={state:'running',active:true,title:text(title)||'Avläsning pågår',message:'',...phaseFields()};
   resetEstimate(startedAt);
   const currentGeneration=generation;
   timer=every(()=>{if(data.active&&generation===currentGeneration)emit();},1000);timerActive=true;
   return emit();
  }

  function update(info={}){
   if(!data.active)return snapshot();
   const at=now(),previousPage=data.page,previousDone=data.done;
   if(owns(info,'phase')&&text(info.phase)!==data.phase){
    data={...data,...phaseFields(),phase:text(info.phase)};
    data.label=data.phase;
   }
   for(const key of ['label','unit','detail','scope'])if(owns(info,key))data[key]=text(info[key]);
   if(owns(info,'page'))data.page=pageNumber(info.page);
   if(owns(info,'pageIndex'))data.pageIndex=count(info.pageIndex);
   if(owns(info,'pageCount'))data.pageCount=count(info.pageCount);
   if(owns(info,'done'))data.done=count(info.done);
   if(owns(info,'total'))data.total=count(info.total);
   const key=JSON.stringify([data.phase,data.unit,data.total,data.scope]);
   const newScope=key!==estimateKey;
   const regressed=baselineDone!==null&&data.done!==null&&previousDone!==null&&data.done<previousDone;
   if(newScope||regressed||baselineDone===null&&data.done!==null)resetEstimate(at);
   if(owns(info,'localPercent'))data.localPercent=localProgress(info.localPercent);
   else if(newScope||data.page!==previousPage||data.done!==previousDone)data.localPercent=null;
   return emit();
  }

  function finish({state='done',message}={}){
   if(!['done','error','cancelled'].includes(state))throw new RangeError('Okänt slutläge för avläsningen.');
   if(!data.active)return snapshot();
   finishedAt=now();clearTimer();generation++;
   data={...data,state,active:false,localPercent:null,message:text(message)};
   return emit();
  }

  function reset(){
   clearTimer();generation++;
   data={state:'idle',active:false,title:'',message:'',...phaseFields()};
   startedAt=null;finishedAt=null;lastTime=0;estimateKey='';baselineAt=null;baselineDone=null;
   return emit();
  }

  return Object.freeze({start,update,finish,reset,snapshot});
 }

 const api=Object.freeze({create,formatDuration});
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.SmartMatchReadProgressV91=api;
})(typeof window!=='undefined'?window:globalThis);
