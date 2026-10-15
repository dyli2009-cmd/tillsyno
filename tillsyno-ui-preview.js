/* Tillsyno UI Preview v0.1. Browser-only sample content; no storage, auth, PDF or network writes. */
(function(){
'use strict';
const root=document.getElementById('app');
if(!root)return;
const paths={
 home:'<path d="M3.5 10.5 12 3.5l8.5 7M5.5 9.5V20h13V9.5M9.5 20v-6h5v6"/>',
 control:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9M8 12l2 2 3-3M8 17l2 2 3-3"/>',
 smart:'<path d="M4 8V4h4M16 4h4v4M4 16v4h4M16 20h4v-4M8 12h8M12 8v8"/><circle cx="12" cy="12" r="2"/>',
 tool:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
 account:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1.4A6.6 6.6 0 0 1 11.6 12h.8a6.6 6.6 0 0 1 6.6 6.6V20"/>',
 users:'<circle cx="8" cy="8" r="3"/><path d="M2 20v-1a6 6 0 0 1 12 0v1M16 8h6M19 5v6M17 17h5"/>',
 door:'<path d="M5 21V3h14v18M8 21V6h8v15M11 13h2M3 21h18"/>',
 shield:'<path d="M12 3 20 6v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
 fire:'<path d="M13 3c0 4-4 6-4 10-1-2-2-3-2-3-3 3-3 7-1 10 3 4 10 4 13 0 4-6-2-10-2-10 0 3-2 5-4 6 1-5 3-8 0-13Z"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
 file:'<path d="M7 3h8l4 4v14H7zM15 3v5h4M10 13h6M10 17h4"/>',
 check:'<path d="M4 12l5 5L20 6"/>',
 arrow:'<path d="m9 5 7 7-7 7"/>',
 back:'<path d="m15 5-7 7 7 7"/>',
 x:'<path d="M5 5l14 14M19 5 5 19"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3zM3 11h18"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
 upload:'<path d="M12 21V9m-4 4 4-4 4 4M4 7V3h16v4"/>',
 pencil:'<path d="m15 5 4 4M4 20l5-1 11-11a2 2 0 0 0-4-4L5 15l-1 5Z"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
 ellipsis:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 settings:'<circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>',
 eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>',
 print:'<path d="M6 9V3h12v6M6 18H4V9h16v9h-2M6 15h12v6H6z"/>',
 login:'<path d="M10 4H4v16h6M15 8l4 4-4 4M8 12h11"/>',
 clipboard:'<path d="M8 4h8M9 3h6v3H9zM6 5H4v16h16V5h-2M9 12h6M9 16h6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 palette:'<circle cx="13.5" cy="6.5" r="1"/><circle cx="7.5" cy="9" r="1"/><circle cx="7.5" cy="15" r="1"/><circle cx="16" cy="16" r="1"/><path d="M12 2a10 10 0 0 0 0 20h1.4a2.6 2.6 0 0 0 2-4.3 2 2 0 0 1 1.4-3.4h2.8A3.4 3.4 0 0 0 23 11 10 10 0 0 0 12 2Z"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
 smartphone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 19h2"/>',
 tablet:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 19h2"/>',
 desktop:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
 copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V4H4v13h4"/>',
 bin:'<path d="M4 6h16M9 6V4h6v2m3 0-1 15H7L6 6M10 10v7m4-7v7"/>'
};
function icon(k,cls){return '<svg'+(cls?' class="'+cls+'"':'')+' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[k]||paths.file)+'</svg>';}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function btn(label,action,kind,more){return '<button type="button" class="btn '+(kind||'')+'" data-action="'+action+'" '+(more||'')+'>'+label+'</button>';}
function nav(label,dest,kind){return '<button type="button" data-nav="'+dest+'" class="'+(kind||'btn soft')+'">'+label+'</button>';}
function chip(text,color){return '<span class="chip '+(color||'')+'">'+text+'</span>';}
function card(title,sub,ico,to,compact){return '<div class="card '+(compact?'compact':'')+'"><button type="button" class="card-link" data-nav="'+to+'"><span class="card-icon">'+icon(ico)+'</span><span class="card-copy"><strong>'+title+'</strong><small>'+sub+'</small></span><span class="card-arrow">'+icon('arrow')+'</span></button></div>';}
function head(title,sub,tag){return '<div class="heading"><div><h1>'+title+'</h1><p>'+sub+'</p></div>'+(tag?chip(tag):'')+'</div>';}
function crumb(parent,to,current){return '<div class="breadcrumb"><button data-nav="'+to+'">'+parent+'</button>'+icon('arrow')+'<span>'+current+'</span></div>';}
function field(label,value,type){return '<label class="field">'+label+'<input type="'+(type||'text')+'" value="'+esc(value||'')+'" aria-label="'+label+'"></label>';}
function note(){return '<div class="screen-note">'+icon('info')+' Allt du ser här är exempeldata. Knappar och vyer är en designförhandsvisning, inte riktiga projekt, PDF-exporter eller behörighetsändringar.</div>';}
function examplePlan(pins){
return '<div class="plan"><div class="plan-head"><span>DEMO-RITNING · PLAN 1</span><span>100% · 1 / 2 sidor</span></div><div class="plan-canvas">'+
'<svg class="plan-svg" viewBox="0 0 600 340" aria-label="Förenklad demoritning av tre rum"><g fill="none" stroke="#7397a8" stroke-width="4" stroke-linecap="square"><path d="M70 55h455v235H70V55Zm150 0v100m0 52v83m150-235v110m0 52v73M70 183h95m65 0h95m70 0h130"/></g><g fill="none" stroke="#68a6c3" stroke-width="2"><path d="M164 183c0-38 27-38 36-38v38m125 0c0-36 27-36 35-36v36M370 165c34 0 34 30 34 30h-34"/></g><g font-size="15" fill="#6b8b9a" font-family="sans-serif"><text x="110" y="106">Entré</text><text x="258" y="106">Korridor</text><text x="405" y="106">Kontor</text><text x="110" y="245">HWC</text><text x="261" y="245">Teknik</text><text x="415" y="245">Hall</text></g></svg>'+
(pins?'<button class="pin ok" style="left:26%;top:44%" data-action="pin" data-pin="GS1">1</button><button class="pin selected" style="left:53%;top:55%" data-action="pin" data-pin="GS2">2</button><button class="pin warn" style="left:77%;top:44%" data-action="pin" data-pin="GS3">3</button>':'')+'</div></div>';
}
const navitems=[['home','Hem','home'],['control','Kontrollflöde','control'],['smartHome','SmartMatch','smart'],['toolsHome','Ritningsverktyg','tool'],['ceHome','CE-märkning','file'],['account','Mitt konto','account'],['admin','Administration','users'],['login','Inloggning','login']];
const folderNames=['Riskanalys','Beskrivning av maskin','Loggbok','EG-försäkran','Egenkontroll','Produktlista','CE-skylt'];
const state={screen:'home',history:[],device:'auto',theme:'mist',showPalette:false,area:'automation',selected:[],modal:'',drawer:false,doorProfile:'glass',ceFolder:'Riskanalys',imported:false,pin:'GS2',smartTab:'ritning',tool:'rensa',layer:true,checked:{},ceChecks:{},accountMenu:false,ceProjectName:'Demoprojekt – Entréplan'};
let toastTimer=0;
function navTo(next,add){
 if(next==='ceNew'){action('ceNew');return;}
 if(next==='ceOpen'){action('ceOpen');return;}
 if(!screens[next])return;
 if(['area','areaSecurity','areaFire'].includes(next)&&state.screen!==next)state.selected=[];
 state.modal='';state.drawer=false;state.accountMenu=false;
 if(add!==false&&state.screen!==next)state.history.push(state.screen);
 state.screen=next;render();scrollTo(0,0);
}
function back(){const prev=state.history.pop();if(prev){state.screen=prev;state.modal='';render();scrollTo(0,0);}else navTo('home',false);}
function activeArea(){return ['area','areaSecurity','areaFire','controlDrawing','protocol'].includes(state.screen)?'control':state.screen.startsWith('ce')?'ceHome':state.screen.startsWith('smart')?'smartHome':state.screen.startsWith('tools')?'toolsHome':['admin','login'].includes(state.screen)?'account':state.screen;}
function side(){return '<aside class="sidebar"><div class="brand"><span class="brand-mark">T</span><span class="brand-text"><strong>Tillsyno</strong><small>UI Preview · fyra färgteman</small></span></div><div class="side-label">Arbetsområden</div><nav class="side-nav">'+navitems.map(function(x){return '<button type="button" class="'+(activeArea()===x[0]?'active':'')+'" data-nav="'+x[0]+'">'+icon(x[2])+x[1]+'</button>';}).join('')+'</nav><div class="side-lower"><div class="side-label">Förhandsvisning</div><div class="small">Inga riktiga projekt eller filer ändras. Testa fritt bland de olika vyerna.</div><a class="btn small" href="index.html">Till riktiga Tillsyno '+icon('arrow')+'</a></div></aside>';}
const palettes=[
 {id:'ice',name:'Isblå',subtitle:'Nuvarande ljusblå',swatches:['#edf6fb','#ffffff','#2b7192']},
 {id:'mist',name:'Nordisk dimblå',subtitle:'Min favorit · lugn blågrå',swatches:['#ebf1f5','#ffffff','#356e86']},
 {id:'coast',name:'Havsbris',subtitle:'Mild turkosblå',swatches:['#edf7f6','#ffffff','#247f85']},
 {id:'sand',name:'Sand & blå',subtitle:'Varm, ljus och elegant',swatches:['#f7f5f1','#ffffff','#356b81']}
];
function paletteMenu(){
 return '<div class="palette-wrap"><button type="button" class="icon-button palette-toggle" data-action="palette" aria-label="Välj färgtema" aria-expanded="'+state.showPalette+'" title="Byt färger">'+icon('palette')+'</button>'+
 (state.showPalette?'<div class="palette-menu" role="group" aria-label="Färgteman"><strong class="palette-heading">Prova färger</strong><p>Precis samma sidor och funktioner – bara färgerna ändras.</p>'+
 palettes.map(function(p){return '<button type="button" class="palette-option '+(state.theme===p.id?'chosen':'')+'" data-theme-option="'+p.id+'" aria-pressed="'+(state.theme===p.id)+'"><span class="palette-swatches">'+p.swatches.map(function(color){return '<span style="background:'+color+'"></span>';}).join('')+'</span><span class="palette-option-copy"><strong>'+p.name+'</strong><small>'+p.subtitle+'</small></span>'+icon(state.theme===p.id?'check':'arrow')+'</button>';}).join('')+'</div>':'')+'</div>';
}
function top(){return '<header class="topbar"><div class="top-left"><button class="icon-button mobile-menu" data-action="drawer" aria-label="Öppna menyn">'+icon('menu')+'</button><div class="top-title"><strong>Tillsyno</strong><small> / '+(titles[state.screen]||'Förhandsvisning')+'</small></div></div><div class="top-right"><div class="device-bar" aria-label="Förhandsgranska enhet">'+[['phone','Mobil','smartphone'],['tablet','iPad','tablet'],['auto','Dator','desktop']].map(function(x){return '<button type="button" class="btn '+(state.device===x[0]?'active':'')+'" data-device="'+x[0]+'" title="Visa '+x[1]+'">'+icon(x[2])+x[1]+'</button>';}).join('')+'</div><span class="preview-badge">DESIGNDEMO</span>'+paletteMenu()+'<button class="icon-button" data-nav="account" aria-label="Mitt konto">'+icon('account')+'</button></div></header>';}
function bottom(){const links=[['home','Hem','home'],['control','Kontroll','control'],['smartHome','SmartMatch','smart'],['toolsHome','Verktyg','tool'],['account','Mer','account']];return '<nav class="bottom-nav" aria-label="Snabbnavigering">'+links.map(function(x){return '<button type="button" class="'+(activeArea()===x[0]?'active':'')+'" data-nav="'+x[0]+'">'+icon(x[2])+'<span>'+x[1]+'</span></button>';}).join('')+'</nav>';}
function drawer(){return state.drawer?'<div class="mobile-drawer" data-action="closeDrawer"><div class="drawer-panel" onclick="event.stopPropagation()"><div class="row between"><strong>Tillsyno · UI Preview</strong><button data-action="closeDrawer" aria-label="Stäng meny">'+icon('x')+'</button></div><nav>'+navitems.map(function(x){return '<button class="'+(activeArea()===x[0]?'active':'')+'" data-nav="'+x[0]+'">'+icon(x[2])+x[1]+'</button>';}).join('')+'</nav><a class="btn" href="index.html">Till riktiga Tillsyno</a></div></div>':'';}
function modal(){let title='',body='',footer='';
switch(state.modal){
case 'ceImport':
 title='Importera CE-mallar';
 body='<p>Så här skulle filimporten visas på iPhone, iPad och dator. Det här är bara en visuell demonstration.</p>'+
 btn(icon('folder')+' Visa exempel på fem importerade PDF-filer','demoImport','soft')+
 '<div class="space"></div><div class="folder-list">'+['Riskanalys','Beskrivning av maskin','Loggbok','EG-försäkran','Egenkontroll'].map(function(x,i){return '<div class="folder-row"><span class="folder-icon">'+icon('file')+'</span><span class="folder-desc"><strong>'+x+'</strong><small>'+(state.imported?['riskanalys.pdf','maskinbeskrivning.pdf','loggbok.pdf','forsakran.pdf','egenkontroll.pdf'][i]:'Inga PDF-filer valda')+'</small></span>'+chip(state.imported?'Identifierad':'Väntar',state.imported?'green':'gray')+'</div>';}).join('')+'</div>';
 footer=btn('Stäng','closeModal','')+btn('Visa importresultat','demoImport','primary');
 break;
case 'newCE':
 title='Starta CE-projekt';
 body='<p>Förslag på hur ett nytt projekt startas. Exempelvärden sparas inte.</p><div class="form-grid">'+field('Projektnamn','Demoprojekt – Entréplan')+field('Objektnummer','20-01-54')+'</div>';
 footer=btn('Avbryt','closeModal','')+btn('Öppna demoprojekt','startCE','primary');
 break;
case 'save':
 title='Spara eller dela';
 body='<p>Här ska användaren normalt kunna spara en arbets-PDF, exportera ZIP eller skicka projekt. I designförhandsvisningen skapas inga filer.</p><div class="stack">'+card('Spara projekt-PDF','Fortsätt på en annan enhet','file','ceProject',true)+card('Exportera CE-underlag','Samla färdiga dokument i ZIP','folder','ceDocs',true)+'</div>';
 footer=btn('Stäng','closeModal','');
 break;
case 'demoFile':
 title='Öppna fil';
 body='<div class="empty">'+icon('upload')+'<h3>Filväljare – designförslag</h3><p>På iPhone/iPad öppnas Filer och Dropbox från den riktiga appen. För att skydda dina projekt använder den här demon bara en exempelritning.</p>'+btn('Öppna exempelritning','openSample','primary')+'</div>';
 footer=btn('Avbryt','closeModal','');
 break;
case 'license':
 title='Behörighet och licens';
 body='<p>Adminvyn använder enbart fiktiva användare och demodata.</p><label class="field">Roll<select><option>Tekniker</option><option>Administratör</option></select></label><div class="space"></div><label class="field">Licenstid<select><option>30 dagar</option><option>7 dagar</option><option>2 dagar</option></select></label>';
 footer=btn('Avbryt','closeModal','')+btn('Visa exempelbekräftelse','demoConfirm','primary');
 break;
case 'profile':
 title='Mitt konto';
 body='<div class="row">'+icon('account')+'<div><strong>Demotekniker</strong><div class="muted">Exempelkonto · aktiv licens</div></div></div><div class="divider"></div><div class="stack">'+nav('Administration','admin','btn soft')+nav('Inloggning','login','btn soft')+'</div>';
 footer=btn('Stäng','closeModal','');
 break;
default:return '';
}
return '<div class="overlay" data-action="closeModal"><div class="modal" role="dialog" aria-modal="true" aria-label="'+title+'" onclick="event.stopPropagation()"><div class="modal-top"><strong>'+title+'</strong><button class="icon-button" data-action="closeModal" aria-label="Stäng">'+icon('x')+'</button></div><div class="modal-body">'+body+'</div><div class="modal-bottom">'+footer+'</div></div></div>';}
function screenHome(){
return head('Välj arbetsområde','Vad vill du arbeta med idag?')+
'<div class="grid2">'+card('Kontrollflöde','Revision · egenkontroll · CE-märkning','control','control')+card('SmartMatch','Ritningar · dörrkort · positioner','smart','smartHome')+'</div>'+
'<div class="section-title">Verktyg</div>'+card('Ritningsverktyg','Redigera · rensa · optimera PDF','tool','toolsHome',true)+
'<div class="section-title">Snabböversikt</div><div class="grid3"><div class="mini-stat"><small>Arbetsområden</small><strong>3</strong><small>Designvyer</small></div><div class="mini-stat"><small>CE-märkning</small><strong>1.2</strong><small>Separat arbetsyta</small></div><div class="mini-stat"><small>Visningsläge</small><strong>Demo</strong><small>Inga projekt sparas</small></div></div>'+note();
}
function screenControl(){
return head('Kontrollflöde','Välj ett arbetsområde för att komma till checklistorna.')+
'<div class="stack">'+card('Dörrautomatik / Lås','Revision · egenkontroll · CE-märkning','door','area')+card('Säkerhetsservice','Inbrottslarm · dörrmiljö · passer','shield','areaSecurity')+card('Brandsäkerhet','Brandcentral · detektorer · branddörrar','fire','areaFire')+'</div>'+
'<div class="section-title">Arbetssätt</div><div class="card soft"><p class="muted">I varje område väljer du ett eller flera protokoll. <strong>CE-märkning</strong> öppnas däremot som en egen projektsida, inte som en kryssruta.</p></div>';
}
const areas={
 area:{title:'Dörrautomatik / Lås',options:[['automation','Revision dörrautomatik','Kontroll av automatik och säkerhet','control'],['self','Egenkontroll dörrautomatik','Egenkontroll enligt checklista','clipboard'],['lock','Revision lås','Lås och dörrfunktion','lock']]},
 areaSecurity:{title:'Säkerhetsservice',options:[['alarm','Inbrottslarm','Service och funktionskontroll','shield'],['door','Lås och dörrmiljö','Lås, dörrfunktion och utrymning','lock'],['access','Passersystem','Passage och behörighet','users']]},
 areaFire:{title:'Brandsäkerhet',options:[['panel','Brandcentral','Centralutrustning och larmfunktion','fire'],['detector','Branddetektorer','Detektorer och kontrollpunkter','eye'],['doorfire','Branddörrar','Dörrhållning och funktion','door']]}
};
function screenArea(key){
const a=areas[key];if(!a)return '';
return crumb('Kontrollflöde','control',a.title)+head(a.title,'Välj en eller flera checklistor för ritningen.')+
'<div class="option-list">'+a.options.map(function(o){return '<label class="option '+(state.selected.includes(o[0])?'selected':'')+'"><input type="checkbox" data-proto="'+o[0]+'" '+(state.selected.includes(o[0])?'checked':'')+'><span class="option-icon">'+icon(o[3])+'</span><span><strong>'+o[1]+'</strong><small>'+o[2]+'</small></span></label>';}).join('')+'</div>'+
(key==='area'?'<div class="section-title">CE-dokumentation · egen arbetsyta</div>'+card('CE-märkning','Version 1.2 · Projekt, riskanalys och dokument','file','ceHome',true):'')+
'<div class="space"></div><div class="actions">'+btn(icon('arrow')+' Fortsätt till ritning','continueControl','primary')+nav('Tillbaka','control')+'</div>'+note();
}
function screenControlDrawing(){
return crumb('Kontrollflöde','control','Ritning')+head('Ritning och protokoll','Exempelritning med tre markerade dörrar.', 'DEMO')+
'<div class="actions">'+btn(icon('folder')+' Öppna PDF','demoFile','soft')+btn(icon('plus')+' Lägg till dörr','addDoor','soft')+btn(icon('download')+' Spara PDF','save','')+'</div><div class="space"></div>'+
'<div class="workspace">'+examplePlan(true)+
'<div class="card"><div class="row between"><strong>Dörrar</strong>'+chip('3 positioner')+'</div><div class="divider"></div>'+
[['1','Entré, plan 1','Klar'],['2','Korridor','Pågår'],['3','HWC','Ej påbörjad']].map(function(x){return '<button class="folder-row" data-nav="protocol"><span class="folder-icon">'+icon('door')+'</span><span class="folder-desc"><strong>Dörr '+x[0]+' · '+x[1]+'</strong><small>ED100 · 20-01-54-'+x[0]+'</small></span>'+chip(x[2],x[2]==='Klar'?'green':x[2]==='Pågår'?'orange':'gray')+'</button>';}).join('')+
'<div class="space"></div>'+nav('Visa protokoll','protocol','btn primary')+'</div></div>'+
'<div class="toolbar">'+['Ritning','Dörrar','Protokoll','Projekt'].map(function(x){return '<button data-action="drawingTab" data-value="'+x+'">'+x+'</button>';}).join('')+'</div>'+note();
}
function screenProtocol(){
const checks=['Automatikens montage','Impulsgivare och manöverdon','Säkerhetssensorer','Öppnings- och stängningstid','Mekaniskt klämskydd','Dokumentation och märkning'];
const n=checks.filter(function(_,i){return state.checked['p'+i];}).length;
return crumb('Ritning','controlDrawing','Protokoll')+head('Revision dörrautomatik','Demodörr 2 · Korridor · ED100', 'DEMO')+
'<div class="grid3"><div class="mini-stat"><small>Kontrollerade</small><strong>'+n+' / 6</strong><small>Kontrollpunkter</small></div><div class="mini-stat"><small>Återstår</small><strong>'+(6-n)+'</strong><small>Ej godkända ännu</small></div><div class="mini-stat"><small>Status</small><strong>'+Math.round(n*100/6)+'%</strong><small>Egenkontroll</small></div></div>'+
'<div class="space"></div><div class="card"><div class="row between"><strong>Kontrollpunkter</strong>'+btn('Godkänn alla','approveProto','soft small')+'</div><div class="divider"></div>'+checks.map(function(x,i){return '<div class="check-row"><label><input type="checkbox" data-pcheck="p'+i+'" '+(state.checked['p'+i]?'checked':'')+'>'+x+'</label>'+chip(state.checked['p'+i]?'Godkänd':'Ej kontrollerad',state.checked['p'+i]?'green':'gray')+'</div>';}).join('')+'</div>'+
'<div class="space"></div><div class="form-grid">'+field('Kontrolldatum','2026-10-15','date')+field('Signatur','Demo AA')+'</div><div class="space"></div>'+btn(icon('print')+' Förhandsgranska kundmall','save','primary')+note();
}
function screenCeHome(){
return crumb('Hem','home','CE-märkning')+head('CE-märkning','Separat arbetsyta för CE-projekt och dokumentation.', 'VERSION 1.2')+
'<div class="stack">'+card('Fortsätt senaste projekt',esc(state.ceProjectName)+' · 3 dörrar','folder','ceProject')+card('Skapa nytt projekt','Projektuppgifter och CE-dokument','plus','ceNew')+card('Öppna projekt-PDF','Från Filer, Dropbox eller dator · demovy','upload','ceOpen')+'</div>'+
'<div class="section-title">Projekthistorik</div><div class="card"><div class="folder-row"><span class="folder-icon">'+icon('folder')+'</span><span class="folder-desc"><strong>'+esc(state.ceProjectName)+'</strong><small>Exempelprojekt · sparat lokalt i riktiga appen</small></span>'+nav('Öppna','ceProject','btn small')+'</div></div>'+note();
}
function screenCeProject(){
return crumb('CE-märkning','ceHome','Projekt')+head(esc(state.ceProjectName),'Automatiker och gemensamma CE-dokument.', 'VERSION 1.2')+
'<div class="actions">'+btn(icon('file')+' Spara projekt-PDF','save','soft')+btn(icon('upload')+' Öppna fil','demoFile','soft')+nav('Hem','home','btn')+'</div>'+
'<div class="section-title">Projektöversikt</div><div class="grid3"><div class="mini-stat"><small>Dörrar</small><strong>3</strong><small>ED100 / ED250</small></div><div class="mini-stat"><small>CE-dokument</small><strong>5</strong><small>Gemensamma mallar</small></div><div class="mini-stat"><small>Slutfört</small><strong>67%</strong><small>Demostatus</small></div></div>'+
'<div class="space"></div><div class="grid2">'+card('Projektuppgifter','Beställare · objekt · ansvarig','clipboard','ceMeta',true)+card('Dokument och mallar','Riskanalys · loggbok · egenkontroll','file','ceDocs',true)+'</div>'+
'<div class="section-title">Dörrautomatik</div><div class="folder-list">'+[['20-01-54-28-24-1','Entré, plan 1'],['20-01-54-28-24-2','Korridor'],['20-01-54-28-37-3','HWC']].map(function(x,i){return '<button class="folder-row" data-nav="ceDocs"><span class="folder-icon">'+icon('door')+'</span><span class="folder-desc"><strong>'+x[0]+'</strong><small>'+x[1]+'</small></span>'+chip(i===0?'Klar':i===1?'Pågår':'Ej startad',i===0?'green':i===1?'orange':'gray')+icon('arrow')+'</button>';}).join('')+'</div>'+note();
}
function screenCeMeta(){
return crumb('CE-projekt','ceProject','Projektuppgifter')+head('Projektuppgifter','Gemensamma uppgifter som följer projektets dörrar.')+
'<div class="card"><div class="form-grid">'+field('Projektnamn','Demoprojekt – Entréplan')+field('Objektnummer','20-01-54')+field('Beställare','Exempelkund AB')+field('Ort','Veddige')+field('Tillverkare','Demo Service AB')+field('Ansvarig','Demotekniker')+'</div><div class="space"></div>'+btn('Visa exempel på sparning','demoConfirm','primary')+'</div>'+note();
}
function screenCeDocs(){
return crumb('CE-projekt','ceProject','CE-dokument')+head('CE-dokument','Välj glasprofil och öppna rätt dokument.', 'VERSION 1.2')+
'<div class="card"><strong>Gemensam standard för dörrtyp</strong><div class="space"></div><div class="segmented">'+[['glass','Med glas'],['none','Utan glas']].map(function(x){return '<button class="'+(state.doorProfile===x[0]?'active':'')+'" data-profile="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div><div class="space"></div><div class="row between wrap"><div><strong style="font-size:12px">Importera CE-mallar</strong><div class="muted">Flera PDF eller ZIP via Filer/Dropbox</div></div>'+btn(icon('upload')+' Importera mallar','ceImport','soft')+'</div></div>'+
'<div class="section-title">Teknisk dokumentation</div><div class="folder-list">'+folderNames.map(function(x,i){return '<button class="folder-row" data-ce-folder="'+x+'"><span class="folder-icon">'+icon(i>=5?'folder':'file')+'</span><span class="folder-desc"><strong>'+(i+1)+'. '+x+'</strong><small>'+((i===0||i===4)?'Genomgång pågår':i>=5?'Skapas individuellt per dörr':'Mall inläst · ej granskad')+'</small></span>'+chip(i===0||i===4?'Pågår':i>=5?'Eget innehåll':'Ej påbörjad',i===0||i===4?'orange':'gray')+icon('arrow')+'</button>';}).join('')+'</div>'+note();
}
function screenCeDoc(){
const docs=['Riskanalys','Beskrivning av maskin','Loggbok','EG-försäkran','Egenkontroll','Produktlista','CE-skylt'];const checked=Object.keys(state.ceChecks).filter(function(x){return state.ceChecks[x];}).length;
return crumb('CE-dokument','ceDocs',esc(state.ceFolder))+head(esc(state.ceFolder),'Demodörr · 20-01-54-28-24-2', 'DOKUMENT')+
'<div class="actions">'+btn(icon('eye')+' Visa PDF','demoConfirm','soft')+btn(icon('pencil')+' Ändra endast denna dörr','demoConfirm','soft')+btn(icon('ellipsis')+' Fler alternativ','demoConfirm','')+'</div>'+
'<div class="space"></div><div class="card"><div class="row between"><strong>Dokumentfält</strong>'+chip(checked+' markerade',checked?'green':'gray')+'</div><div class="divider"></div>'+
['Uppgifter kontrollerade','Dörrens utförande dokumenterat','Tillämpliga krav genomgångna','Datum och signatur kontrollerade'].map(function(x,i){return '<div class="check-row"><label><input data-ce-check="c'+i+'" type="checkbox" '+(state.ceChecks['c'+i]?'checked':'')+'>'+x+'</label>'+chip(state.ceChecks['c'+i]?'Klart':'Ej markerat',state.ceChecks['c'+i]?'green':'gray')+'</div>';}).join('')+'</div><div class="space"></div><div class="actions">'+btn('Markera dokument klart','ceDone','primary')+nav('Till alla dokument','ceDocs','btn')+'</div>'+note();
}
function screenSmartHome(){
return head('SmartMatch','Ritningar, dörrkort och GS-positioner i en gemensam vy.', 'DESIGNDEMO')+
'<div class="card"><div class="empty">'+icon('file')+'<h3>Välj projektfil</h3><p>Så här kan SmartMatch starta: öppna en PDF eller fortsätt ett projekt.</p><div class="actions">'+btn(icon('upload')+' Välj projektfil','demoFile','soft')+nav('Öppna demoprojekt','smartWorkspace','btn primary')+'</div></div></div>'+
'<div class="section-title">Tidigare projekt</div>'+card('Demoprojekt – Entréplan','3 positioner · 2 dörrkort · plan 1','folder','smartWorkspace',true)+note();
}
function screenSmartWorkspace(){
const gs=state.pin;
return crumb('SmartMatch','smartHome','Projekt')+head('Demoprojekt – Entréplan','GS-positioner, ritning och egenkontroller.', 'SMARTMATCH')+
'<div class="actions">'+btn(icon('folder')+' Öppna PDF','demoFile','soft')+btn(icon('download')+' Spara projekt','save','soft')+btn(icon('eye')+(state.layer?' Dölj positioner':' Visa positioner'),'toggleLayer','')+'</div><div class="space"></div>'+
'<div class="segmented">'+[['ritning','Ritning'],['dorrkort','Dörrkort'],['egenkontroll','Egenkontroll']].map(function(x){return '<button data-smart-tab="'+x[0]+'" class="'+(state.smartTab===x[0]?'active':'')+'">'+x[1]+'</button>';}).join('')+'</div><div class="space"></div>'+
'<div class="workspace">'+(state.smartTab==='ritning'?examplePlan(state.layer):
 state.smartTab==='dorrkort'?'<div class="card"><div class="section-title">Dörrkort 130C</div><div class="form-grid">'+field('GS-kod','GS2')+field('Maskintyp','ED100')+field('Objektnummer','20-01-54-28-24-2')+field('Placering','Korridor')+'</div><div class="divider"></div>'+btn('Visa koppling på ritningen','showSmartDrawing','soft')+'</div>':
 '<div class="card"><strong>DA Egenkontroller</strong><div class="space"></div><div class="check-row"><span>Egenkontroll 100%</span>'+chip('Klart','green')+'</div><div class="check-row"><span>CE-dokumentation 50%</span>'+chip('Pågår','orange')+'</div><div class="space"></div>'+nav('Öppna CE-märkning','ceHome','btn soft')+'</div>')+
'<div class="card"><div class="row between"><strong>Aktuell position</strong>'+chip(gs,'green')+'</div><div class="divider"></div>'+
'<div class="mini-stat"><small>Dörrautomatik</small><strong style="font-size:14px">20-01-54-28-24-2</strong><small>ED100 · Korridor</small></div>'+
'<div class="space"></div><div class="row between"><span class="muted">Egenkontroll</span>'+chip('100%','green')+'</div><div class="space"></div><div class="progress"><span style="width:100%"></span></div>'+
'<div class="space"></div><div class="row between"><span class="muted">CE / SLR</span>'+chip('50%','orange')+'</div><div class="space"></div><div class="progress"><span style="width:50%;background:#e5a654"></span></div><div class="space"></div><div class="stack">'+btn('Visa position och koppling','selectPin','soft')+btn('Öppna CE-märkning v1.2','openCe','primary')+'</div></div></div>'+
'<div class="toolbar">'+['＋ Koppla dörr','GS-positioner','Visa dörrkort','Text','Ångra'].map(function(x){return '<button data-action="demoConfirm">'+x+'</button>';}).join('')+'</div>'+note();
}
function screenToolsHome(){
return head('Ritningsverktyg','Förbered ritningar innan kontroll eller projektarbete.')+
'<div class="grid2">'+card('Rensa PDF','Text · markeringar · kommentarer','pencil','toolsWorkspace')+card('Beskär och optimera','Storlek · sidor · kvalitet','tool','toolsWorkspace')+'</div>'+
'<div class="section-title">Välj arbetsfil</div><div class="card"><div class="empty">'+icon('folder')+'<h3>Öppna ritning</h3><p>På mobilen väljer du fil från Filer, iCloud eller Dropbox.</p>'+btn('Testa med exempelritning','openTools','primary')+'</div></div>'+note();
}
function screenToolsWorkspace(){
return crumb('Ritningsverktyg','toolsHome','Arbetsyta')+head('Ritningsverktyg','Förenklad interaktiv vy för PDF-verktygen.', 'DEMO')+
'<div class="segmented">'+[['rensa','Rensa'],['beskar','Beskär'],['optimera','Optimera'],['sidor','Sidor']].map(function(x){return '<button data-tool="'+x[0]+'" class="'+(state.tool===x[0]?'active':'')+'">'+x[1]+'</button>';}).join('')+'</div><div class="space"></div>'+
'<div class="workspace">'+examplePlan(false)+'<div class="card"><strong>'+({rensa:'Rensa ritningen',beskar:'Beskär PDF',optimera:'Optimera PDF',sidor:'Hantera sidor'}[state.tool])+'</strong><div class="divider"></div>'+
(state.tool==='rensa'?'<div class="option-list">'+[['Ta bort markeringar','mark'],['Ta bort text','text'],['Ta bort kommentarer','comment']].map(function(x){return '<label class="option"><input type="checkbox" data-tool-check="'+x[1]+'"><span>'+x[0]+'</span></label>';}).join('')+'</div>':
state.tool==='beskar'?'<p class="muted">Justera beskärningsramen och förhandsgranska resultatet.</p><label class="field">Marginal<select><option>Automatisk</option><option>5 mm</option><option>10 mm</option></select></label>':
state.tool==='optimera'?'<p class="muted">Välj optimeringsnivå innan sparning.</p><label class="field">PDF-kvalitet<select><option>Balans</option><option>Hög kvalitet</option><option>Mindre fil</option></select></label>':
'<div class="option-list"><label class="option"><input type="checkbox"> Sida 1</label><label class="option"><input type="checkbox"> Sida 2</label></div>')+
'<div class="space"></div>'+btn('Visa exempelresultat','demoConfirm','primary')+'</div></div>'+
'<div class="toolbar">'+['Öppna PDF','Ångra','Gör om','Spara PDF'].map(function(x){return '<button data-action="'+(x==='Öppna PDF'?'demoFile':x==='Spara PDF'?'save':'demoConfirm')+'">'+x+'</button>';}).join('')+'</div>'+note();
}
function screenAccount(){
return head('Mitt konto','Kontoinställningar och administrationsförslag.')+
'<div class="card"><div class="row"><div class="card-icon">'+icon('account')+'</div><div><strong>Demotekniker</strong><div class="muted">Exempelkonto · Tekniker</div></div><span style="margin-left:auto">'+chip('Aktiv','green')+'</span></div><div class="divider"></div><div class="grid2"><div class="mini-stat"><small>Licens</small><strong style="font-size:16px">Aktiv</strong><small>Demostatus</small></div><div class="mini-stat"><small>Behörighet</small><strong style="font-size:16px">Kontroll</strong><small>Illustration</small></div></div></div>'+
'<div class="section-title">Konto</div><div class="stack">'+card('Användare och behörigheter','Adminpanel med roller och tidslicenser','users','admin',true)+card('Inloggningssida','Förhandsvisa inloggning','login','login',true)+'</div>'+
'<div class="space"></div><a class="btn" href="index.html">Till riktiga Tillsyno '+icon('arrow')+'</a>'+note();
}
function screenAdmin(){
return crumb('Mitt konto','account','Admin')+head('Användare','Godkänn konton och tilldela behörighet.', 'ADMINDEMO')+
'<div class="grid3"><div class="mini-stat"><small>Godkända</small><strong>2</strong></div><div class="mini-stat"><small>Väntar</small><strong>1</strong></div><div class="mini-stat"><small>Totalt</small><strong>3</strong></div></div>'+
'<div class="section-title">Ditt team</div><div class="card"><div class="form-grid">'+field('Sök användare','')+field('Filtrera','Alla')+'</div><div class="space"></div>'+
[['Demotekniker 1','Godkänd'],['Demotekniker 2','Godkänd'],['Ny testanvändare','Väntar']].map(function(x,i){return '<div class="folder-row"><span class="folder-icon">'+icon('account')+'</span><span class="folder-desc"><strong>'+x[0]+'</strong><small>Exempelkonto · '+(i===0?'Administratör':'Tekniker')+'</small></span>'+chip(x[1],i===2?'orange':'green')+btn('Hantera','license','small')+'</div>';}).join('')+'</div>'+
'<div class="space"></div>'+btn(icon('plus')+' Bjud in användare','demoConfirm','soft')+note();
}
function screenLogin(){
return crumb('Mitt konto','account','Inloggning')+head('Välkommen tillbaka','Förhandsvisning av inloggningssidan.')+
'<div style="max-width:430px;margin:0 auto"><div class="card"><div class="row">'+icon('account')+'<strong>Logga in på Tillsyno</strong></div><div class="space"></div>'+
'<div class="stack"><label class="field">E-post<input type="email" placeholder="namn@företag.se" autocomplete="off"></label><label class="field">Lösenord<input type="password" placeholder="••••••••" autocomplete="off"></label></div><div class="space"></div>'+btn('Visa demo-inloggning','demoConfirm','primary')+
'<div class="divider"></div><button class="btn ghost" data-action="demoConfirm">Glömt lösenord?</button></div></div>'+note();
}
const screens={home:screenHome,control:screenControl,area:function(){return screenArea('area')},areaSecurity:function(){return screenArea('areaSecurity')},areaFire:function(){return screenArea('areaFire')},controlDrawing:screenControlDrawing,protocol:screenProtocol,ceHome:screenCeHome,ceProject:screenCeProject,ceMeta:screenCeMeta,ceDocs:screenCeDocs,ceDoc:screenCeDoc,smartHome:screenSmartHome,smartWorkspace:screenSmartWorkspace,toolsHome:screenToolsHome,toolsWorkspace:screenToolsWorkspace,account:screenAccount,admin:screenAdmin,login:screenLogin};
const titles={home:'Hem',control:'Kontrollflöde',area:'Dörrautomatik / Lås',areaSecurity:'Säkerhetsservice',areaFire:'Brandsäkerhet',controlDrawing:'Ritning',protocol:'Protokoll',ceHome:'CE-märkning',ceProject:'CE-projekt',ceMeta:'Projektuppgifter',ceDocs:'CE-dokument',ceDoc:'Dokument',smartHome:'SmartMatch',smartWorkspace:'SmartMatch projekt',toolsHome:'Ritningsverktyg',toolsWorkspace:'PDF-verktyg',account:'Mitt konto',admin:'Administration',login:'Inloggning'};
function render(){
 root.parentElement.dataset.device=state.device;
 root.parentElement.dataset.theme=state.theme;
 root.innerHTML=side()+'<div class="shell">'+top()+'<main class="main"><div class="notice">'+icon('info')+' Separat designförhandsvisning · exempeldata · inga riktiga ändringar</div>'+screens[state.screen]()+'</main></div>'+bottom()+drawer()+modal()+'<div id="toastSpot" aria-live="polite"></div>';
 document.title=(titles[state.screen]||'Tillsyno')+' · Tillsyno UI Preview';
}
function inform(message){
 const spot=document.getElementById('toastSpot');if(!spot)return;spot.innerHTML='<div class="toast" role="status">'+esc(message)+'</div>';
 clearTimeout(toastTimer);toastTimer=setTimeout(function(){const el=document.getElementById('toastSpot');if(el)el.innerHTML='';},2800);
}
function action(key,value){
 switch(key){
  case 'drawer':state.drawer=true;state.showPalette=false;render();break;
  case 'palette':state.showPalette=!state.showPalette;render();break;
  case 'closeDrawer':state.drawer=false;render();break;
  case 'ceImport':state.modal='ceImport';render();break;
  case 'ceNew':state.modal='newCE';render();break;
  case 'ceOpen':case 'demoFile':state.modal='demoFile';render();break;
  case 'save':state.modal='save';render();break;
  case 'license':state.modal='license';render();break;
  case 'closeModal':state.modal='';render();break;
  case 'demoImport':state.imported=true;render();inform('Exempel: alla fem PDF-mallar identifierades automatiskt.');break;
  case 'continueControl':if(!state.selected.length){inform('Välj minst en checklista först.');return;}navTo('controlDrawing');break;
  case 'approveProto':for(let i=0;i<6;i++)state.checked['p'+i]=true;render();inform('Alla sex exempelkontroller är markerade.');break;
  case 'pin':state.pin=value||'GS2';render();inform('Position '+state.pin+' vald.');break;
  case 'selectPin':inform('Demo: koppling till '+state.pin+' visas till höger.');break;
  case 'openCe':navTo('ceHome');break;
  case 'toggleLayer':state.layer=!state.layer;render();break;
  case 'showSmartDrawing':state.smartTab='ritning';render();break;
  case 'openTools':navTo('toolsWorkspace');break;
  case 'addDoor':inform('Exempelknapp: här skulle du placera en ny dörr.');break;
  case 'drawingTab':if(value==='Protokoll')navTo('protocol');else if(value==='Projekt')inform('Demo: projektuppgifter öppnas här.');else inform('Du valde fliken '+value+'.');break;
  case 'startCE':state.modal='';navTo('ceProject');break;
  case 'openSample':{
 const destination=state.screen.startsWith('smart')?'smartWorkspace':state.screen.startsWith('tools')?'toolsWorkspace':state.screen.startsWith('ce')?'ceProject':'controlDrawing';
 state.modal='';navTo(destination);break;
}
  case 'ceDone':inform(esc(state.ceFolder)+' har markerats som klart i designexemplet.');break;
  case 'demoConfirm':inform('Det här är en designförhandsvisning. Inga riktiga ändringar gjordes.');if(state.modal){state.modal='';render();}break;
  default:inform('Det här är en klickbar design-demo – ingen riktig funktion körs.');
 }
}
document.addEventListener('click',function(e){
 const target=e.target.closest('[data-theme-option],[data-device],[data-nav],[data-action],[data-profile],[data-smart-tab],[data-tool],[data-ce-folder]');
 if(!target){if(state.showPalette){state.showPalette=false;render();}return;}
 if(target.hasAttribute('data-theme-option')){const theme=target.dataset.themeOption;if(palettes.some(function(p){return p.id===theme;})){state.theme=theme;state.showPalette=false;render();}return;}
 if(target.hasAttribute('data-device')){state.device=target.dataset.device;render();scrollTo(0,0);return;}
 if(target.hasAttribute('data-nav')){navTo(target.dataset.nav);return;}
 if(target.hasAttribute('data-profile')){state.doorProfile=target.dataset.profile;render();return;}
 if(target.hasAttribute('data-smart-tab')){state.smartTab=target.dataset.smartTab;render();return;}
 if(target.hasAttribute('data-tool')){state.tool=target.dataset.tool;render();return;}
 if(target.hasAttribute('data-ce-folder')){state.ceFolder=target.dataset.ceFolder;state.ceChecks={};navTo('ceDoc');return;}
 if(target.hasAttribute('data-action')){action(target.dataset.action,target.dataset.value||target.dataset.pin);return;}
});
document.addEventListener('change',function(e){
 const target=e.target;
 if(target.matches('[data-proto]')){const key=target.dataset.proto;if(target.checked){if(!state.selected.includes(key))state.selected.push(key);}else state.selected=state.selected.filter(function(k){return k!==key;});render();}
 if(target.matches('[data-pcheck]')){state.checked[target.dataset.pcheck]=target.checked;render();}
 if(target.matches('[data-ce-check]')){state.ceChecks[target.dataset.ceCheck]=target.checked;render();}
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(state.showPalette){state.showPalette=false;render();return;}if(state.modal){state.modal='';render();}else if(state.drawer){state.drawer=false;render();}else back();}});
window.addEventListener('popstate',function(){back();});
render();
})();