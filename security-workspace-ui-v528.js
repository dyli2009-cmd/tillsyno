/* Presentation only: shared icons, responsive toolbar placement, compact Security Service navigation. */
(()=>{
'use strict';
function start(){
 if(!document.body.classList.contains('allInOneApp'))return;
 const bar=document.querySelector('.sessionHistoryBar'),pagebar=document.querySelector('#securityDrawing .pagebar');
 if(!bar||!pagebar)return;
 const close=document.getElementById('secCloseDrawing'),modern=!!close;
 const svg=shape=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+shape+'</svg>';
 const anchor=document.createComment('Original quick-tools position');bar.before(anchor);
 const shapes={secPrev:['Föregående sida','<path d="m14 6-6 6 6 6"/>'],secNext:['Nästa sida','<path d="m10 6 6 6-6 6"/>'],secZoomOut:['Zooma ut','<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M7.5 10.5h6"/>'],secZoomIn:['Zooma in','<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M7.5 10.5h6M10.5 7.5v6"/>']};
 for(const [id,[label,shape]] of Object.entries(shapes)){const b=document.getElementById(id);if(!b)continue;b.innerHTML='<svg class="workspaceControlIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+shape+'</svg>';b.setAttribute('aria-label',label);b.title=label;}

 const details=document.querySelector('.secAppHeader .headerDetails');
 const change=document.getElementById('secChangeDrawing');
 const fileLine=document.createElement('div');fileLine.className='workspaceFileLine';fileLine.hidden=true;
 const fileName=document.createElement('button');fileName.type='button';fileName.className='workspaceFileName';fileName.setAttribute('aria-expanded','false');fileName.title='Visa hela filnamnet';fileName.addEventListener('click',()=>{const expanded=fileName.getAttribute('aria-expanded')!=='true';fileName.setAttribute('aria-expanded',String(expanded));fileName.classList.toggle('is-expanded',expanded);});
 if(change&&details){change.classList.add('workspaceOpenDrawing');change.setAttribute('aria-label','Öppna annan ritning');change.title='Öppna annan ritning';change.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v2"/><path d="M3 9h18l-3 11H5L3 9Z"/></svg><span>Öppna annan ritning</span>';fileLine.append(fileName);if(modern){const actions=document.createElement('div');actions.className='workspaceFileActions';actions.setAttribute('role','group');actions.setAttribute('aria-label','Hantera ritning');close.setAttribute('aria-label','Stäng ritning');close.title='Stäng ritning';close.innerHTML=svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 12l6 6M15 12l-6 6"/>')+'<span>Stäng ritning</span>';actions.append(change,close);actions.classList.add('workspaceHeaderFiles');document.querySelector('.secAppHeader .headerActions').append(actions);}else fileLine.append(change);details.append(fileLine);}
 function updateFile(){const loaded=document.body.classList.contains('secHasPdf');fileLine.hidden=!loaded;const name=(typeof project!=='undefined'&&(project.sourceFileName||project.revisionImport?.sourceFile))||'Öppen ritning';if(fileName.textContent!==name){fileName.textContent=name;fileName.setAttribute('aria-label','Visa hela filnamnet: '+name);fileName.setAttribute('aria-expanded','false');fileName.classList.remove('is-expanded');}}

 const center=bar.querySelector('.sessionHistoryCenter'),textControls=bar.querySelector('.historyTextControls'),toolWrap=bar.querySelector('.serviceToolsWrap'),toolMenu=bar.querySelector('.serviceToolsMenu');
 let pageControls=null,zoomControls=null;
 if(modern){
  document.body.classList.add('securityWorkspace');bar.classList.add('workspaceToolbar');pagebar.setAttribute('role','toolbar');pagebar.setAttribute('aria-label','Sida och zoom');
  function group(name,nodes){const g=document.createElement('div');g.className='workspaceToolGroup';g.setAttribute('role','group');g.setAttribute('aria-label',name);nodes.filter(Boolean).forEach(n=>g.append(n));return g;}
  const history=group('Ångra och gör om',[...center.querySelectorAll('.historyIconButton')]),view=group('Visa ritning',[document.getElementById('secRotate'),document.getElementById('secToggleOverlays')]);
  center.prepend(history);if(toolWrap)center.append(toolWrap);center.append(view);if(textControls)center.append(textControls);
  pageControls=group('Byt sida',['secPrev','secPage','secNext'].map(id=>document.getElementById(id)));pageControls.classList.add('workspacePageControls');
  zoomControls=group('Zoom',['secZoomOut','secZoom','secZoomIn'].map(id=>document.getElementById(id)));zoomControls.classList.add('workspaceZoomControls');
  pagebar.append(pageControls,zoomControls);
  const launcher=toolWrap?.querySelector('.serviceToolLauncher');if(launcher)launcher.innerHTML=svg('<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5M4 15l5 5"/>');
  for(const [id,label]of [['securityPreview','Kundmall'],['securityExport','Spara PDF']]){const b=document.getElementById(id);if(b){b.title=label;b.setAttribute('aria-label',label)}}
  const version=document.querySelector('body>.ta-page-version'),count=document.getElementById('securityCount');if(version&&count){const meta=document.createElement('span');meta.className='workspaceMeta';count.before(meta);meta.append(count,version);}
  for(const type of ['detector','alarm','lock','access']){const b=document.querySelector('[data-add="'+type+'"]');if(b){const name=typeof SYSTEMS!=='undefined'?SYSTEMS[type].label:b.textContent.replace('＋','').trim();b.innerHTML=svg('<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/>')+'<span></span>';b.querySelector('span').textContent=name;b.title='Lägg till '+name.toLocaleLowerCase('sv');b.setAttribute('aria-label',b.title);}}
 }
 const compactQuery=matchMedia('(max-width:800px)'),query=matchMedia('(min-width:1100px) and (hover:hover) and (pointer:fine)');
 function update(){
  updateFile();
  const device=document.documentElement.dataset.tillsynoDevice;
  const security=modern&&document.body.hasAttribute('data-security-project-layout');
  document.body.toggleAttribute('data-security-toolbar-pages',security);
  if(modern){const compact=compactQuery.matches||device==='phone';document.body.toggleAttribute('data-workspace-compact',compact);if(textControls&&toolMenu){const parent=(security||compact)?toolMenu:center;if(textControls.parentNode!==parent)parent.append(textControls);}if(pageControls){if(security&&pageControls.parentNode!==center)center.append(pageControls);else if(!security&&pageControls.parentNode!==pagebar)pagebar.insertBefore(pageControls,zoomControls);}pagebar.setAttribute('aria-label',security?'Sida':'Sida och zoom');const count=document.querySelectorAll('.allInOneProtocolTools [data-add]:not([hidden])').length;document.querySelector('.allInOneProtocolTools')?.style.setProperty('--protocol-columns',String(Math.max(1,Math.min(4,count))));}
  const desktop=query.matches&&device!=='phone'&&device!=='tablet'&&document.body.classList.contains('secHasPdf');
  const enabled=desktop&&!security&&document.body.dataset.view==='drawing'&&!document.body.classList.contains('revisionInlineActive')&&!document.querySelector('#securityOverview[open]');
  if(document.body.hasAttribute('data-workspace-desktop')!==desktop)document.body.toggleAttribute('data-workspace-desktop',desktop);
  if(enabled&&bar.parentNode!==pagebar)pagebar.prepend(bar);
  else if(!enabled&&bar.previousSibling!==anchor)anchor.after(bar);
 }
 let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;update()});}
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class','data-view','data-security-project-layout']});
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-tillsyno-device']});
 const overview=document.getElementById('securityOverview');if(overview)new MutationObserver(schedule).observe(overview,{attributes:true,attributeFilter:['open']});
 const objectBar=document.querySelector('.objectBar');if(objectBar)new MutationObserver(schedule).observe(objectBar,{childList:true,subtree:true});
 const message=document.getElementById('securityMessage');
 if(message){const markReady=()=>message.toggleAttribute('data-drawing-ready',!message.classList.contains('error')&&message.textContent.includes('Börja markera valda protokoll.'));new MutationObserver(markReady).observe(message,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});markReady();}
 window.addEventListener('revision-work-loaded',schedule);
 compactQuery.addEventListener('change',schedule);query.addEventListener('change',schedule);update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

