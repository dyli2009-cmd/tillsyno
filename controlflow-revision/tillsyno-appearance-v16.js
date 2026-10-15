/* Tillsyno appearance v2.4.320 — a UI-only layer. NO domain data, PDF, canvas, checklist or authentication mutations. */
(function(){
'use strict';
const KEY='tillsyno-ui-appearance-v1';
const PALETTES={
 ice:{name:'Isblå',sub:'Klar och luftig',page:'#edf6fb',soft:'#dceef7',accent:'#2b7192',ink:'#173f55'},
 mist:{name:'Nordisk dimblå',sub:'Mjuk blågrå · rekommenderas',page:'#ebf1f5',soft:'#dfeef3',accent:'#356e86',ink:'#233f52'},
 coast:{name:'Havsbris',sub:'Lugn turkosblå',page:'#edf7f6',soft:'#d9f0ef',accent:'#247f85',ink:'#1d4852'},
 sand:{name:'Sand & blå',sub:'Varm och ljus',page:'#f7f5f1',soft:'#e8f0ef',accent:'#356b81',ink:'#2e4b58'},
 night:{name:'Midnattsblå',sub:'Mörkblå · ljus och tydlig text',page:'#081523',card:'#152b3e',soft:'#203b50',accent:'#336a96',ink:'#e5eef5'},
 graphite:{name:'Grafit',sub:'Mörk gråblå · lugn kontrast',page:'#12151c',card:'#232a35',soft:'#2c3543',accent:'#526886',ink:'#eef0f7'},
 pine:{name:'Mörkgrön',sub:'Djup grönblå · mjukt ljus text',page:'#091c1e',card:'#163436',soft:'#204447',accent:'#32776c',ink:'#e5f4f0'}
};
const DEVICES={
 auto:{name:'Automatiskt',sub:'Anpassas efter skärmen',icon:'monitor-smartphone'},
 phone:{name:'iPhone / telefon',sub:'Kompakt och fingervänligt',icon:'smartphone'},
 tablet:{name:'iPad / surfplatta',sub:'Större knappar och mer utrymme',icon:'tablet'},
 desktop:{name:'Dator',sub:'Skrivbord, mus och tangentbord',icon:'monitor'}
};
const ICONS={
 palette:'<path d="M12 2a10 10 0 0 0 0 20h1.5c2.2 0 3.2-2.3 1.6-3.9-.6-.7-.3-1.9.8-2.2h2.8c2.1 0 3.3-1.5 3.3-3.7A10 10 0 0 0 12 2Z"/><circle cx="7.6" cy="9" r=".9"/><circle cx="12.7" cy="6.4" r=".9"/><circle cx="17" cy="10" r=".9"/><circle cx="8.7" cy="15" r=".9"/>',
 close:'<path d="M5 5l14 14M19 5 5 19"/>',
 check:'<path d="m5 12 4 4 10-10"/>',
 auto:'<rect x="3" y="4" width="17" height="13" rx="2"/><path d="M8 21h7M11.5 17v4M21 7h1v7h-1"/>',
 phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 19h2"/>',
 tablet:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 19h2"/>',
 desktop:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
 file:'<path d="M7 3h8l4 4v14H7zM15 3v5h4M10 13h6M10 17h4"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3zM3 11h18"/>',
 save:'<path d="M5 3h11l3 3v15H5zM8 3v7h8V3M8 20v-7h8v7"/>',
 upload:'<path d="M12 20V7m-4 4 4-4 4 4M4 4v-1h16v1"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
 print:'<path d="M6 9V3h12v6M6 18H4V9h16v9h-2M6 15h12v6H6z"/>',
 back:'<path d="m15 5-7 7 7 7"/>',
 home:'<path d="M3.5 10.5 12 3.5l8.5 7M5.5 9.5V20h13V9.5M9.5 20v-6h5v6"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 tool:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
 check:'<path d="m5 12 4 4 10-10"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 delete:'<path d="M4 6h16M9 6V4h6v2m3 0-1 15H7L6 6M10 10v7m4-7v7"/>',
 edit:'<path d="m15 5 4 4M4 20l5-1 11-11a2 2 0 0 0-4-4L5 15l-1 5Z"/>',
 eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
 users:'<circle cx="8" cy="8" r="3"/><path d="M2 20v-1a6 6 0 0 1 12 0v1M16 8h6M19 5v6"/>',
 note:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9M9 12h6M9 16h6"/>',
 arrow:'<path d="m9 5 7 7-7 7"/>'
};
function svg(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[name]||ICONS.file)+'</svg>';}
function valid(value,options,defaultValue){return typeof value==='string'&&Object.prototype.hasOwnProperty.call(options,value)?value:defaultValue;}
function restore(){try{const o=JSON.parse(localStorage.getItem(KEY)||'null');if(!o||typeof o!=='object')return null;return {theme:valid(o.theme,PALETTES,'mist'),device:valid(o.device,DEVICES,'auto')};}catch(_){return null}}
let saved=restore();
let current=saved||{theme:'mist',device:'auto'};
let draft={...current};
let dialog,launcher,rendered=false;
const originalColors={};
function apply(value){
 current={theme:valid(value.theme,PALETTES,'mist'),device:valid(value.device,DEVICES,'auto')};
 document.documentElement.style.setProperty('--tillsyno-route-bg',PALETTES[current.theme].page);
 document.documentElement.style.setProperty('background',PALETTES[current.theme].page,'important');
 document.documentElement.setAttribute('data-tillsyno-theme',current.theme);
 document.documentElement.setAttribute('data-tillsyno-device',current.device);
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta&& !meta.hasAttribute('data-appearance-original')){
   meta.dataset.appearanceOriginal=meta.getAttribute('content')||'';
 }
 if(meta)meta.setAttribute('content',PALETTES[current.theme].page);
}
function persist(){saved={...current};try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(_){}}
apply(current);
function choices(){
 return '<div class="ta-section"><h3>Färgtema</h3><div class="ta-palettes">'+Object.keys(PALETTES).map(key=>{
  const p=PALETTES[key];return '<button type="button" data-ta-theme="'+key+'" class="ta-choice ta-palette-choice'+(draft.theme===key?' is-selected':'')+'" aria-pressed="'+(draft.theme===key)+'"><span class="ta-swatches"><i style="background:'+p.page+'"></i><i style="background:'+(p.card||'#fff')+'"></i><i style="background:'+p.soft+'"></i><i style="background:'+p.accent+'"></i></span><span class="ta-choice-text"><strong>'+p.name+'</strong><small>'+p.sub+'</small></span><span class="ta-choice-check">'+(draft.theme===key?svg('check'):'')+'</span></button>';
 }).join('')+'</div></div>'+
 '<div class="ta-section"><h3>Vilken enhet använder du?</h3><p>Appens vyer anpassas fortfarande automatiskt till skärmens storlek. Ditt val justerar knappstorlek och text där det är lämpligt.</p><div class="ta-devices">'+Object.keys(DEVICES).map(key=>{
  const d=DEVICES[key];return '<button type="button" data-ta-device="'+key+'" class="ta-choice ta-device-choice'+(draft.device===key?' is-selected':'')+'" aria-pressed="'+(draft.device===key)+'"><span class="ta-device-icon">'+svg(key==='auto'?'auto':key)+'</span><span class="ta-choice-text"><strong>'+d.name+'</strong><small>'+d.sub+'</small></span><span class="ta-choice-check">'+(draft.device===key?svg('check'):'')+'</span></button>';
 }).join('')+'</div></div>';
}
function updateChoices(){if(!dialog)return;const form=dialog.querySelector('.ta-body');if(form)form.innerHTML=choices();}
function close(commit){
 if(!dialog)return;
 if(commit){persist();}else if(saved){apply(saved);}else{apply({theme:'mist',device:'auto'});persist();}
 if(dialog.open)dialog.close();
}
function open(){
 if(!dialog||launcher?.hidden)return;
 draft={...current};updateChoices();
 if(!dialog.open)try{dialog.showModal();}catch(_){dialog.setAttribute('open','');}
}
const ruleList=[
 ["#appHome .homeToolsLink","tool"],
 ["#ceProjectHome .ceHomeActions button","folder"],
 ["#ceWorkspace button, #slrFlowTestDialog button, #ceImportCEDialog button",""],
 ["#securityDrawing .securityTools button, #allProtocolDialog .allProtocolActions button",""],
 [".pwToolbar button, .pwHeaderActions button, #pwEmpty button",""],
 [".toolHeader .headerActions button, .toolPanel button, .toolIntro button",""],
 [".pfHeader button, .pfSummary button",""],
 [".securityApp .headerActions button, .securityApp .securityTools button",""],
 [".loginbody .logincard button, .topbar .toplinks button, .panelhead button, .filterbar button",""]
];
const selectors=ruleList.map(x=>x[0]).join(',');
function chooseIcon(el){
 const text=(el.textContent||'').trim().toLowerCase();
 const id=el.id.toLowerCase();
 if(/radera|ta bort|delete|remove/.test(text+' '+id))return 'delete';
 if(/ladda ned|hämta|exportera|skicka|spara pdf|spara projekt|spara lokalt|spara fil|create zip|skapa zip/.test(text+' '+id))return 'save';
 if(/importera|välj fil|välj pdf|öppna pdf|öppna fil|ladda upp|byt pdf|byt mall/.test(text+' '+id))return 'upload';
 if(/förhandsgranska|visa pdf|visa kundmall|visa ritning|visa filer/.test(text+' '+id))return 'eye';
 if(/sök|hitta/.test(text+' '+id))return 'search';
 if(/ändra|redigera|justera|edit/.test(text+' '+id))return 'edit';
 if(/plus|lägg till|nytt|ny |skapa/.test(text+' '+id))return 'plus';
 if(/hem|tillbaka/.test(text+' '+id))return 'back';
 if(/märkning|egenkontroll|revision|godkänn|klart/.test(text+' '+id))return 'check';
 if(/projekt|dörrkort|dokument|riskanalys|loggbok|mapp/.test(text+' '+id))return 'folder';
 if(/verktyg|rensa|optimera|beskär/.test(text+' '+id))return 'tool';
 return null;
}
function decorate(root){
 if(!root||!root.querySelectorAll)return;
 const nodes=[];
 if(root.matches&&root.matches(selectors))nodes.push(root);
 root.querySelectorAll(selectors).forEach(el=>nodes.push(el));
 nodes.slice(0,180).forEach(el=>{
  if(el.dataset.taIcon||el.querySelector('svg, img, .ceHomeActionIcon, .homeToolsIcon, .allProtocolIcon, .pwIcon')||el.closest('.ta-modal'))return;
  const name=chooseIcon(el);
  if(!name)return;
  const span=document.createElement('span');span.className='ta-inline-icon';span.innerHTML=svg(name);
  el.insertBefore(span,el.firstChild);
  el.dataset.taIcon=name;
 });
}
/* Versions belong to the bottom-right edge, never the work toolbar.
   Move original elements to avoid visual duplicates AND preserve JS IDs/updaters. */
function placeVersionAtBottom(){
 const page=(window.location.pathname.split('/').pop()||'index.html').toLowerCase();
 const cePages=['ce-markning.html','project-ce-markning-test.html','project-ce-markning-test-v60.html'];
 let node=null;
 if(page==='smartmatch-slr-test.html'||page==='project-workspace-smartmatch-test.html'){
  node=document.querySelector('.pwTitle .pwReleaseLine');
  if(node)node.setAttribute('aria-label','SmartMatch version');
 }else if(page==='project-workspace.html'){
  node=document.querySelector('.pwTitleVersion');
  if(node)node.textContent=node.textContent.replace(/^\s*·\s*/,'').trim();
 }else if(page==='drawing-tools.html'){
  node=document.querySelector('.toolHeader .version');
 }else if(cePages.includes(page)){
  node=document.querySelector('#ceProjectHome .ceHomeVersion');
  const topVersion=document.querySelector('.ceTopIdentity>small');
  if(topVersion)topVersion.hidden=true;
 }else if(['all-in-one.html','project-flow.html','security.html'].includes(page)){
  node=document.createElement('small');
  node.textContent='v2.4.320';
 }
 if(!node)return;
 if(!['smartmatch-slr-test.html','project-workspace-smartmatch-test.html'].includes(page))node.textContent='v2.4.320';
 node.classList.add('ta-page-version');
 node.setAttribute('data-ta-version-footer','true');
 document.body.appendChild(node);
}
function attach(){
 if(rendered||!document.body)return;rendered=true;
 placeVersionAtBottom();
 const btn=document.createElement('button');btn.type='button';btn.className='ta-launcher';btn.id='tillsynoAppearanceButton';
 btn.title='Färger och enhet';btn.setAttribute('aria-label','Välj färger, iPhone, iPad eller dator');btn.innerHTML=svg('palette');launcher=btn;
 btn.addEventListener('click',open);
 const homeHeader=document.querySelector('#appHome .homeBrand');
 const home=document.getElementById('appHome');
 const isStartPage=()=>/(?:\/|\/index\.html)$/.test(location.pathname)&&!!homeHeader&&document.body.classList.contains('homeMode')&&!home?.hidden;
 if(homeHeader)homeHeader.insertBefore(btn,homeHeader.querySelector('#homeProfile')||null);else document.body.appendChild(btn);
 function refreshLauncher(){
  const visible=isStartPage();btn.hidden=!visible;btn.style.setProperty('display',visible?'inline-flex':'none','important');
  if(!visible&&dialog?.open)close(false);
 }
 refreshLauncher();
 const visibilityObserver=new MutationObserver(refreshLauncher);
 visibilityObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
 if(home)visibilityObserver.observe(home,{attributes:true,attributeFilter:['hidden']});
 const d=document.createElement('dialog');d.className='ta-modal';d.id='tillsynoAppearanceDialog';
 d.setAttribute('aria-label','Tillsynos utseende och enhet');
 d.innerHTML='<div class="ta-head"><div><strong>Tillsynos utseende</strong><small>Välj färger och enhetsläge</small></div><button type="button" class="ta-close" aria-label="Stäng">'+svg('close')+'</button></div>'+
 '<div class="ta-body"></div>'+
 '<div class="ta-foot"><button type="button" class="ta-reset">Automatiskt läge</button><button type="button" class="ta-apply">Spara val</button></div>';
 dialog=d;document.body.appendChild(d);
 d.querySelector('.ta-close').addEventListener('click',()=>close(false));
 d.querySelector('.ta-apply').addEventListener('click',()=>{apply(draft);close(true)});
 d.querySelector('.ta-reset').addEventListener('click',()=>{draft={theme:'mist',device:'auto'};apply(draft);updateChoices()});
 d.addEventListener('cancel',e=>{e.preventDefault();close(false);});
 d.addEventListener('click',e=>{
   const theme=e.target.closest('[data-ta-theme]'),device=e.target.closest('[data-ta-device]');
   if(theme){draft.theme=valid(theme.dataset.taTheme,PALETTES,'mist');apply(draft);updateChoices();return;}
   if(device){draft.device=valid(device.dataset.taDevice,DEVICES,'auto');apply(draft);updateChoices();}
 });
 d.addEventListener('pointerdown',e=>{if(e.target===d)close(false)});
 updateChoices();
 decorate(document.body);
 // Only added elements, not repeated scans of entire PDF/canvas workspaces.
 let waiting=false,added=[];
 const observer=new MutationObserver(records=>{
  if(dialog.open||waiting)return;
  for(const record of records){
   if(record.type!=='childList')continue;
   for(const node of record.addedNodes){if(node.nodeType===1&&node!==btn&&node!==d&&!node.closest('.ta-modal')){added.push(node);if(added.length>=40)break;}}
   if(added.length>=40)break;
  }
  if(added.length){
   waiting=true;setTimeout(()=>{
    const targets=added.splice(0,40);waiting=false;
    targets.forEach(node=>{if(node.isConnected)decorate(node)});
   },150);
  }
 });
 observer.observe(document.body,{childList:true,subtree:true});
 // Palette dialog opens only by explicit button click.
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
window.TillsynoAppearance={open,get:()=>({...current})};
})();