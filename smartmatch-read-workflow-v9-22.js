/* TEST 9.22: preparation and saved work are separate, explicit UI states.
   This helper never reads PDF text, runs OCR, or changes project data. */
(()=>{
 'use strict';
 const defaults={
  home:{title:'',message:''},
  preparing:{title:'Förberedelse',message:'Läs och granska kopplingarna. Spara sedan en projekt-PDF för nästa gång.'},
  opening:{title:'Öppnar färdigt projekt',message:'Läser sparad avläsning och visar ritningen.'},
  working:{title:'Arbetsläge · sparad avläsning',message:'Sparade kopplingar, produkter och kontroller används direkt.'}
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
   ?'Separat test · Arbeta med sparad avläsning. Ändra förberedelsen bara när du behöver komplettera.'
   :next==='preparing'?'Separat test · Förberedelse: läs, koppla, granska och spara PDF.'
   :'Separat test · Förbered nya filer en gång. Öppna sedan den sparade projekt-PDF:en för att arbeta.';
  return mode;
 }
 window.SmartMatchReadWorkflow=Object.freeze({setMode,getMode:()=>mode});
 setMode('home');
})();
