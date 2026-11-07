/* v2.4.588: Dörrautomatik / Lås – Ritning, Översikt och Projekt. Laddas bara av controlflow-revision/all-in-one.html.
   - Förklaringstexter i meddelanderaden visas inte; fel (röda) och pågående arbete (…) visas.
   - Filnamn och antal objekt står i sidraden längst ner (på dator i verktygsraden). Ögat ligger i verktygsraden.
   - Översikt börjar på Objekt med anmärkning, och Alla objekt kan väljas.
   - Projekt: Starta ny service ligger sist, efter Beställare.
   Motor, delade filer, kontrollpunkter och PDF ändras inte. */
(()=>{
 'use strict';
 const root=document.documentElement,body=document.body;
 if(root.dataset.cfStampMode!=='revision'||!body||!body.classList.contains('allInOneApp')||body.dataset.revViews==='588')return;
 body.dataset.revViews='588';
 const $=id=>document.getElementById(id);

 // 1. Message row: only errors and ongoing work are shown.
 const message=$('securityMessage');
 function classify(){
  if(!message)return;
  const text=message.textContent.trim(),kind=!text?'empty':message.classList.contains('error')?'error':/(…|\.\.\.)$/.test(text)?'busy':'info';
  if(message.dataset.revKind!==kind)message.dataset.revKind=kind;
 }
 if(message){new MutationObserver(classify).observe(message,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});classify();}

 // 2. File name and object count in the page row; the eye in the tool row between Gör om and Verktyg.
 function placeBars(){
  const pagebar=document.querySelector('#securityDrawing .pagebar'),next=$('secNext');
  if(pagebar&&next){
   let info=pagebar.querySelector('.revPageInfo');
   if(!info){info=document.createElement('span');info.className='revPageInfo';}
   if(next.nextElementSibling!==info)next.after(info);
   const line=document.querySelector('.workspaceFileLine'),count=$('securityCount');
   if(line&&line.parentNode!==info)info.prepend(line);
   if(count&&count.parentNode!==info)info.append(count);
  }
  const eye=$('secToggleOverlays'),center=document.querySelector('.sessionHistoryBar .sessionHistoryCenter');
  if(eye&&center){
   const tools=center.querySelector(':scope>.serviceToolsWrap');
   if(tools){if(eye.nextElementSibling!==tools||eye.parentNode!==center)center.insertBefore(eye,tools);}
   else if(eye.parentNode!==center)center.append(eye);
  }
 }

 // 3. Översikt: Objekt med anmärkning first.
 const filter=$('secOverviewFilter');
 const problems=filter?.querySelector('option[value="problems"]');
 if(problems)problems.textContent='Objekt med anmärkning';
 let panel='';
 window.addEventListener('revision-inline-view',event=>{
  const id=event.detail?.id||'';
  if(body.dataset.revPanel!==id)body.dataset.revPanel=id;
  if(id==='securityOverview'&&panel!=='securityOverview'&&filter){
   filter.value='problems';
   try{if(typeof showOverview==='function')showOverview()}catch(error){console.error(error)}
  }
  panel=id;
 });
 const list=$('secOverviewList');
 if(list)new MutationObserver(()=>{
  const empty=list.querySelector('.overviewEmpty');
  if(empty&&empty.textContent==='Inga objekt med öppna fel.')empty.textContent='Inga objekt med anmärkning.';
 }).observe(list,{childList:true,subtree:true,characterData:true});

 // 4. Projekt: Starta ny service last, after Beställare.
 function placeNewService(){
  const sections=document.querySelector('#securityProject .projectSections'),card=document.querySelector('#securityProject .secNewServiceCard');
  if(sections&&card&&sections.lastElementChild!==card)sections.append(card);
 }

 let scheduled=false;
 function update(){scheduled=false;placeBars();placeNewService();classify();}
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(update);}
 new MutationObserver(schedule).observe(body,{attributes:true,attributeFilter:['class','data-view','data-workspace-desktop']});
 new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-tillsyno-device']});
 window.addEventListener('revision-work-loaded',schedule);
 window.addEventListener('resize',schedule);
 update();
 window.RevisionViews=Object.freeze({refresh:update});
})();
