/* Security Service presentation: shared vector icons and two-way drawing rotation. */
(()=>{
 'use strict';
 function start(){
  if(!document.body.classList.contains('allInOneApp'))return;
  const right=document.getElementById('secRotate'),bar=document.querySelector('.sessionHistoryBar'),menu=document.querySelector('.serviceToolsMenu'),launcher=document.querySelector('.serviceToolLauncher');
  if(!right||!bar||!menu||!launcher)return;
  const paths={
   tools:'<path d="m14 4 6 6M12 6l6 6M4 20l5-1L20 8a2.1 2.1 0 0 0-3-3L6 16l-2 4Z"/><path d="m4 4 5 1-4 4-1-5ZM15 17l4 4 2-2-4-4M16 18l2-2"/>',
   undo:'<path d="m8 4-5 5 5 5M3 9h11a7 7 0 0 1 0 14" transform="translate(0 -2)"/>',
   redo:'<path d="m16 4 5 5-5 5M21 9H10a7 7 0 0 0 0 14" transform="translate(0 -2)"/>',
   left:'<path d="M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6"/>',
   right:'<path d="M21 10a9 9 0 1 0-2.6 8.4M21 4v6h-6"/>',
   eye:'<path class="eyeShape" d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle class="eyePupil" cx="12" cy="12" r="3"/><path class="eyeSlash" d="m3 3 18 18"/>',
   scan:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M2 12h20"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
   single:'<path d="M4 20h3V4H4M7 4a16 16 0 0 1 16 16H7"/>',
   double:'<path d="M2 20V9M22 20V9M2 9a10 10 0 0 1 10 10 10 10 0 0 1 10-10M2 20h20"/>',
   line:'<path d="m5 19 14-14"/><circle cx="4" cy="20" r="1.5"/><circle cx="20" cy="4" r="1.5"/>',
   arrow:'<path d="m4 20 16-16M10 4h10v10"/>',
   text:'<path d="M4 7V4h16v3M12 4v16M8 20h8"/>',
   callout:'<path d="M3 4h13v9H9l-4 4v-4H3V4ZM16 17h5m-3-3 3 3-3 3M6 7h7M6 10h4"/>',
   target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
   flip:'<path d="M12 3v18M3 7l6 5-6 5V7ZM21 7l-6 5 6 5V7Z"/>',
   smaller:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12h8"/>',
   larger:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12h8M12 8v8"/>',
   edit:'<path d="m4 16 12-12a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4ZM14 6l3 3M12 21h9"/>',
   trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
   previous:'<path d="m14 5-7 7 7 7"/>',next:'<path d="m10 5 7 7-7 7"/>',
   home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',
   preview:'<path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 12h8M8 16h6"/>',
   save:'<path d="M4 3h13l3 3v15H4V3ZM8 3v6h8V3M8 21v-8h8v8"/>',
   open:'<path d="M3 9V5h7l3 3h8v3M3 11h19l-4 10H4L3 11Z"/>',
   close:'<path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M9 12l6 6M15 12l-6 6"/>'
  };
  const glyph=key=>{const node=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const[name,value]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',class:'securityToolGlyph'}))node.setAttribute(name,value);node.innerHTML=paths[key];return node;};
  const rotation=document.createElement('div');rotation.className='securityRotationControls';rotation.setAttribute('role','group');rotation.setAttribute('aria-label','Rotera ritning');
  const left=document.createElement('button');left.id='secRotateLeft';left.type='button';left.className='drawingRotateButton';left.append(glyph('left'));left.onclick=()=>rotateSecurityDrawing(-1);
  const angle=document.createElement('output');angle.id='secRotationValue';angle.setAttribute('aria-label','Ritningens rotation');
  right.before(rotation);rotation.append(left,angle,right);
  const icons=new Map();
  function register(button,key){if(!button)return;const original=button.querySelector('svg');if(original)icons.set(button,{original,replacement:glyph(key)});}
  const byId={secRotate:'right',secToggleOverlays:'eye',secPrev:'previous',secNext:'next',securityDetectorScan:'scan',securityPreview:'preview',securityExport:'save',secChangeDrawing:'open',secCloseDrawing:'close'};
  for(const[id,key]of Object.entries(byId))register(document.getElementById(id),key);
  register(launcher,'tools');register(document.querySelector('.homeIconLink'),'home');
  const names={'Ångra':'undo','Gör om':'redo','Enkeldörr':'single','Dubbeldörr':'double','Linje / vägg':'line','Pil':'arrow','Text':'text','Text med pil':'callout','Precision':'target','Rotera 90°':'right','Spegelvänd':'flip','Mindre':'smaller','Större':'larger','Ändra text':'edit','Ta bort':'trash'};
  for(const button of bar.querySelectorAll('button')){const key=names[button.getAttribute('aria-label')];if(key)register(button,key);}
  for(const button of menu.querySelectorAll('.serviceToolChoices button,.toolSelected button')){if(button.querySelector('span'))continue;const label=document.createElement('span');label.className='securityToolName';label.textContent=button.getAttribute('aria-label')||button.title;button.append(label);}
  launcher.setAttribute('aria-controls','securityDrawingToolMenu');menu.id='securityDrawingToolMenu';
  let active=false,scheduled=false;
  function positionMenu(){if(!active||menu.hidden)return;const r=launcher.getBoundingClientRect(),width=Math.min(336,innerWidth-16);menu.style.setProperty('--security-tools-left',Math.max(8,Math.min(r.left,innerWidth-width-8))+'px');menu.style.setProperty('--security-tools-top',Math.max(8,Math.min(r.bottom+8,innerHeight-160))+'px');}
  function sync(){scheduled=false;const enabled=document.body.hasAttribute('data-security-project-layout');if(enabled!==active){active=enabled;for(const[button,entry]of icons){const current=button.querySelector('svg'),next=active?entry.replacement:entry.original;if(current&&current!==next)current.replaceWith(next);}}launcher.setAttribute('aria-expanded',String(!menu.hidden));updateDrawingRotationButton();positionMenu();}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(sync);}
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-security-project-layout']});
  new MutationObserver(schedule).observe(menu,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
