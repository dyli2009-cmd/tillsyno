/* Presentation only: shared icons, responsive toolbar placement. */
(()=>{
'use strict';
function start(){
 if(!document.body.classList.contains('allInOneApp'))return;
 const bar=document.querySelector('.sessionHistoryBar'),pagebar=document.querySelector('#securityDrawing .pagebar');
 if(!bar||!pagebar)return;
 const anchor=document.createComment('Original quick-tools position');bar.before(anchor);
 const shapes={secPrev:['Föregående sida','<path d="m14 6-6 6 6 6"/>'],secNext:['Nästa sida','<path d="m10 6 6 6-6 6"/>'],secZoomOut:['Zooma ut','<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M7.5 10.5h6"/>'],secZoomIn:['Zooma in','<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M7.5 10.5h6M10.5 7.5v6"/>']};
 for(const [id,[label,shape]] of Object.entries(shapes)){const b=document.getElementById(id);if(!b)continue;b.innerHTML='<svg class="workspaceControlIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+shape+'</svg>';b.setAttribute('aria-label',label);b.title=label;}

 const details=document.querySelector('.secAppHeader .headerDetails');
 const change=document.getElementById('secChangeDrawing');
 const fileLine=document.createElement('div');fileLine.className='workspaceFileLine';fileLine.hidden=true;
 const fileName=document.createElement('button');fileName.type='button';fileName.className='workspaceFileName';fileName.setAttribute('aria-expanded','false');fileName.title='Visa hela filnamnet';fileName.addEventListener('click',()=>{const expanded=fileName.getAttribute('aria-expanded')!=='true';fileName.setAttribute('aria-expanded',String(expanded));fileName.classList.toggle('is-expanded',expanded);});
 if(change&&details){change.classList.add('workspaceOpenDrawing');change.setAttribute('aria-label','Öppna annan ritning');change.title='Öppna annan ritning';change.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v2"/><path d="M3 9h18l-3 11H5L3 9Z"/></svg><span>Öppna annan ritning</span>';fileLine.append(fileName,change);details.append(fileLine);}
 function updateFile(){const loaded=document.body.classList.contains('secHasPdf');fileLine.hidden=!loaded;const name=(typeof project!=='undefined'&&(project.sourceFileName||project.revisionImport?.sourceFile))||'Öppen ritning';if(fileName.textContent!==name){fileName.textContent=name;fileName.setAttribute('aria-label','Visa hela filnamnet: '+name);fileName.setAttribute('aria-expanded','false');fileName.classList.remove('is-expanded');}}

 const query=matchMedia('(min-width:1100px) and (hover:hover) and (pointer:fine)');
 function update(){
  updateFile();
  const device=document.documentElement.dataset.tillsynoDevice;
  const desktop=query.matches&&device!=='phone'&&device!=='tablet'&&document.body.classList.contains('secHasPdf');
  const enabled=desktop&&document.body.dataset.view==='drawing'&&!document.body.classList.contains('revisionInlineActive')&&!document.querySelector('#securityOverview[open]');
  if(document.body.hasAttribute('data-workspace-desktop')!==desktop)document.body.toggleAttribute('data-workspace-desktop',desktop);
  if(enabled&&bar.parentNode!==pagebar)pagebar.prepend(bar);
  else if(!enabled&&bar.previousSibling!==anchor)anchor.after(bar);
 }
 let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;update()});}
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class','data-view']});
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-tillsyno-device']});
 const overview=document.getElementById('securityOverview');if(overview)new MutationObserver(schedule).observe(overview,{attributes:true,attributeFilter:['open']});
 const objectBar=document.querySelector('.objectBar');if(objectBar)new MutationObserver(schedule).observe(objectBar,{childList:true,subtree:true});
 window.addEventListener('revision-work-loaded',schedule);
 query.addEventListener('change',schedule);update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
