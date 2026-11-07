/* v2.4.581: progress card while a drawing opens in Kontrollflöde Dörrautomatik.
   The steps are real (read file, check work file and older protocols, open, draw). The drawing step has no
   exact progress in pdf.js, so it moves toward the end of its range by an estimate from the file size and only
   reaches 100 % when the page is actually shown. */
(()=>{
 'use strict';
 let root=null,fill=null,percent=null,track=null,stepText=null,nameText=null,timer=0,hideTimer=0,state=null;
 const reduced=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}};
 function ensure(){
  if(root)return;
  root=document.createElement('div');root.className='cfLoad';root.hidden=true;
  const card=document.createElement('div');card.className='cfLoadCard';card.setAttribute('role','status');card.setAttribute('aria-live','polite');
  const head=document.createElement('div');head.className='cfLoadHead';
  const title=document.createElement('span');title.className='cfLoadTitle';title.textContent='Laddar ritning';
  percent=document.createElement('span');percent.className='cfLoadPercent';head.append(title,percent);
  nameText=document.createElement('span');nameText.className='cfLoadName';
  track=document.createElement('div');track.className='cfLoadTrack';track.setAttribute('role','progressbar');track.setAttribute('aria-label','Laddar ritning');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
  fill=document.createElement('div');fill.className='cfLoadFill';track.append(fill);
  stepText=document.createElement('span');stepText.className='cfLoadStep';
  card.append(head,nameText,track,stepText);root.append(card);document.body.append(root);
 }
 function paint(){if(!state)return;const value=Math.floor(state.value);fill.style.width=value+'%';percent.textContent=value+' %';track.setAttribute('aria-valuenow',String(value));}
 function tick(){
  if(!state||state.done)return;
  const elapsed=performance.now()-state.stepStart,span=state.to-state.from;
  // Approach the end of the step without reaching it; the next step or done() moves on.
  const estimated=state.estimate>0?state.from+span*.95*(1-Math.exp(-elapsed/(state.estimate/2))):state.from;
  state.value=Math.max(state.value,Math.min(state.to-.5,estimated));paint();
 }
 function step(text,from,to,estimate=0){
  if(!state)return;state.value=Math.max(state.value,from);state.from=Math.max(from,state.value);state.to=Math.max(to,state.from);state.estimate=estimate;state.stepStart=performance.now();
  stepText.textContent=text;paint();
 }
 // A detail inside the current step, e.g. "Analyserar äldre PDF… sida 3 / 20", without moving the bar.
 function note(text){if(state&&!state.done&&text)stepText.textContent=text;}
 function start(name){
  ensure();clearTimeout(hideTimer);state={value:0,from:0,to:0,estimate:0,stepStart:performance.now(),done:false};
  nameText.textContent=name||'';root.dataset.state='loading';root.hidden=false;step('Läser filen',0,5,300);
  if(!timer)timer=setInterval(tick,100);
 }
 function stop(){clearInterval(timer);timer=0;}
 function hide(){if(root)root.hidden=true;state=null;}
 function done(){
  if(!state)return;stop();state.done=true;state.value=100;paint();stepText.textContent='Klart';root.dataset.state='done';
  hideTimer=setTimeout(hide,reduced()?0:450);
 }
 // Closing after done() lets the finished card fade out; otherwise (an error) it closes at once.
 function close(){if(state?.done)return;stop();clearTimeout(hideTimer);hide();}
 window.DrawingLoadProgress=Object.freeze({start,step,note,done,close,get value(){return state?Math.floor(state.value):null}});
})();
