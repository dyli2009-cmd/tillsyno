/* TEST 9.94: concise preparation and saved-work status.
   This helper never reads PDF text, runs OCR, or changes project data. */
(()=>{
 'use strict';
 const defaults={
  home:{title:'',message:''},
  preparing:{title:'Avläsning',message:'Läs dörrkort och granska ritningsträffarna.'},
  opening:{title:'Öppnar projekt',message:'Läser sparad avläsning.'},
  working:{title:'SmartMatch',message:'Dörrkort och kopplingar är inlästa.'}
 };
 let mode='home';
 function setMode(next,options={}){
  if(!Object.prototype.hasOwnProperty.call(defaults,next))return mode;
  mode=next;
  const text=defaults[next],bar=document.getElementById('rtWorkflowBar');
  document.body.dataset.rtWorkflow=next;
  if(bar)bar.hidden=next==='home';
  const title=document.getElementById('rtWorkflowMode');if(title)title.textContent=text.title;
  let message=typeof options.message==='string'&&options.message.trim()?options.message.trim():text.message;
  const pending=Number(options.pending);
  if(next==='working'&&Number.isSafeInteger(pending)&&pending>0)message+=' '+pending+' kort kan kontrolleras senare.';
  const status=document.getElementById('rtWorkflowStatus');if(status)status.textContent=message;
  const edit=document.getElementById('rtEditPreparation');
  if(edit){edit.hidden=next!=='working';edit.disabled=next!=='working';}
  const banner=document.getElementById('rtTestBannerText');
  if(banner)banner.textContent=next==='working'
   ?'SmartMatch · sparat projekt'
   :next==='preparing'?'Läs dörrkort → matcha ritningen'
   :'Läs dörrkort eller öppna ett sparat projekt.';
  return mode;
 }
 window.SmartMatchReadWorkflow=Object.freeze({setMode,getMode:()=>mode});
 setMode('home');
})();
