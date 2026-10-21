/* Compact, explicit review controls for the Avläsning 9.95. */
(function(){
 'use strict';
 let api=null,toolbar=null,currentFilter='all',query='',selectedId='',phaseAnchor=null;
 const $=id=>document.getElementById(id);
 const panels=new Map(),expanded=new Set();
 function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
 function cards(){const value=api?.getCards?.()||[];return Array.isArray(value)?value:Object.values(value);}
 function state(){return api?.getState?.()||{};}
 function issues(card){return (api?.getIssues?.(card)||[]).map(issue=>typeof issue==='string'?issue:issue.message||issue.reason||'Behöver kontrolleras').filter(Boolean);}
 function run(action){Promise.resolve().then(action).catch(error=>{const status=$('rtStatus');if(status)status.textContent=error?.message||String(error);}).finally(()=>refresh());}
 function button(text,action,className){const el=node('button',className,text);el.type='button';el.addEventListener('click',()=>run(action));return el;}
 function ensureLayout(){
  const root=$('rtResults'),dialog=$('rtDialog'),documentPane=dialog?.querySelector('.rtDocument');if(!root||!dialog||!documentPane)return false;
  dialog.classList.add('rtCompactReview');
  const reviewPane=dialog.querySelector('.rtReview');
  const destination=$('rtReviewSection')||reviewPane;if(root.parentElement!==destination)destination.append(root);
  root.setAttribute('aria-label','Avlästa dörrkort');root.tabIndex=0;
  if(!toolbar){
   toolbar=node('section','rtReviewToolbar');toolbar.id='rtReviewToolbar';toolbar.setAttribute('aria-label','Hitta och granska kort');
   const top=node('div','rtReviewToolbarHead');top.append(node('h3','','Avlästa dörrkort'));
   const next=button('Nästa olösta',nextIssue);next.id='rtReviewNext';top.append(next);toolbar.append(top);
   const counts=node('p','rtReviewCounts');counts.id='rtReviewCounts';counts.setAttribute('aria-live','polite');toolbar.append(counts);
   const controls=node('div','rtReviewFilters');
   const filterLabel=node('label','','Visa');const filter=node('select');filter.id='rtReviewFilter';filter.setAttribute('aria-label','Filtrera avlästa kort');
   for(const [value,label] of [['all','Alla'],['attention','Behöver åtgärdas'],['deferred','Åsidosatta'],['ready','Klara'],['pending','Sökning återstår']]){const option=node('option','',label);option.value=value;filter.append(option);}
   filter.onchange=()=>{currentFilter=filter.value;refresh();};filterLabel.append(filter);controls.append(filterLabel);
   const searchLabel=node('label','','Sök kod eller sida');const search=node('input');search.type='search';search.id='rtReviewSearch';search.placeholder='Exempel: GS23 eller sida 51';search.setAttribute('aria-label','Sök kod eller sida');search.oninput=()=>{query=search.value;refresh();};searchLabel.append(search);controls.append(searchLabel);toolbar.append(controls);
   const result=node('p','rtReviewVisible');result.id='rtReviewVisible';result.setAttribute('aria-live','polite');toolbar.append(result);
   const continueRow=node('div','rtContinueRow');const continueButton=button('Fortsätt med klara kort',()=>api?.continueReady?.(),'rtContinueReady');continueButton.id='rtReviewContinue';
   const help=node('p','','Olösta kort sparas till senare.');continueRow.append(continueButton,help);toolbar.append(continueRow);
   const empty=node('p','rtReviewEmpty','Inga kort i det här urvalet. Välj Alla eller ändra sökningen.');empty.id='rtReviewEmpty';root.insertAdjacentElement('afterend',empty);
  }
  root.insertAdjacentElement('beforebegin',toolbar);
  if(!$('rtReviewBlockReason')){const footer=dialog.querySelector('.rtFooter');if(footer){const reason=node('p','rtReviewBlockReason');reason.id='rtReviewBlockReason';reason.setAttribute('role','status');footer.prepend(reason);}}
  arrangeReader(dialog,documentPane,reviewPane);
  return true;
 }
 function arrangeReader(dialog,documentPane,reviewPane){
  if(dialog.classList.contains('rtGuidedLayout'))return;
  dialog.classList.add('rtGuidedLayout','rtSimpleReader');
  const scroll=node('div','rtRailScroll');reviewPane.prepend(scroll);
  const top=node('section','rtRailIntro');
  for(const id of ['rtGuide','rtNextHint'])if($(id))top.append($(id));dialog.querySelector('.rtLayout').before(top);
  function section(id,title){const el=node('section','rtRailSection');el.id=id;if(title)el.append(node('h3','',title));scroll.append(el);return el;}
  function move(parent,selector){const el=dialog.querySelector(selector);if(el)parent.append(el);}
  // Navigation and marking stay next to the PDF on every screen size.
  const tools=node('div','rtDocumentTools');documentPane.prepend(tools);
  move(tools,'.rtControls');move(tools,'.rtModes');move(tools,'#rtSampleControls');
  const read=section('rtReadSection','');
  for(const selector of ['#rtDiscover','#rtDiscoveryResults','#rtPreview','#rtGoMatches','#rtReadProgress','#rtStatus'])move(read,selector);
  const review=section('rtReviewSection','');
  for(const selector of ['#rtReviewToolbar','#rtResults','#rtReviewEmpty','#rtMatchReview'])move(review,selector);
  // All optional controls are one level deep, instead of nested Info menus.
  const mark=section('rtMarkSection','');
  const advanced=node('details','rtAdvanced rtReaderSettings');advanced.append(node('summary','','Inställningar'));mark.append(advanced);
  move(advanced,'.rtSearchSettings');move(advanced,'.rtAreaSettings');
  const setup=$('rtSetupDetails');
  if(setup){const content=setup.querySelector('.rtSetup');if(content){const fields=node('div');fields.id='rtSetupDetails';fields.append(content);setup.replaceWith(fields);advanced.append(fields);}}
  const coords=dialog.querySelector('.rtCoordinates');
  if(coords){const coordinateFields=coords.querySelector('#rtCoordinates');coords.remove();const fields=node('section','rtNumericSettings');fields.append(node('h4','','Markering i procent'));if(coordinateFields)fields.append(coordinateFields);advanced.append(fields);}
  move(advanced,'#rtIntro');
  const footer=dialog.querySelector('.rtFooter');
  if(footer){
   const template=node('section','rtSaveOptions');template.append(node('h4','','Läsmall'));
   for(const label of [...footer.children].filter(el=>el.tagName==='LABEL'))template.append(label);
   advanced.append(template);reviewPane.append(footer);
   footer.append(node('p','rtSaveHelp','Spara projekt-PDF efteråt.'));
  }
  // Keep settings and the existing approval after every result list.
  // The group fills unused rail space without creating a second fixed panel.
  const bottom=node('section','rtBottomPanel');bottom.setAttribute('aria-label','Inställningar och godkännande');
  bottom.append(mark);
  const approval=dialog.querySelector('.rtApproval');if(approval)bottom.append(approval);
  scroll.append(bottom);
  const caption=node('div','rtOriginalHeading');caption.append(node('strong','','Dörrkort / ritning'));documentPane.prepend(caption);
  const help=$('rtZoomHelp');if(help)documentPane.append(help);
  installSplitter(dialog,documentPane,reviewPane);
 }
 function installSplitter(dialog,left,right){
  const layout=left.parentElement,handle=node('div','rtSplitter');handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-label','Bredd mellan original och steg');handle.setAttribute('aria-orientation','vertical');handle.title='Dra för att ändra bredd. Dubbelklicka för att återställa.';left.after(handle);
  let value=52;try{const saved=Number(localStorage.getItem('tillsyno-read-split'));if(saved>=25&&saved<=75)value=saved;}catch(_){}
  function apply(next){const width=layout.clientWidth;if(width<650){layout.style.setProperty('--rt-left',value+'%');return;}value=Math.max(Math.max(25,280/Math.max(1,width)*100),Math.min(Math.min(75,(width-350)/Math.max(1,width)*100),next));layout.style.setProperty('--rt-left',value+'%');handle.setAttribute('aria-valuenow',String(Math.round(value)));handle.setAttribute('aria-valuemin','25');handle.setAttribute('aria-valuemax','75');}
  function finish(){try{localStorage.setItem('tillsyno-read-split',String(value));}catch(_){}run(()=>api?.resizePreview?.());}
  let pointer=null;
  handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();pointer=e.pointerId;handle.setPointerCapture(e.pointerId);};
  handle.onpointermove=e=>{if(pointer!==e.pointerId)return;const bounds=layout.getBoundingClientRect();apply((e.clientX-bounds.left)/bounds.width*100);};
  handle.onpointerup=e=>{if(pointer===e.pointerId){pointer=null;finish();}};handle.onpointercancel=()=>{pointer=null;finish();};
  handle.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();apply(e.key==='Home'?52:value+(e.key==='ArrowLeft'?-3:3));finish();};handle.ondblclick=()=>{apply(52);finish();};
  requestAnimationFrame(()=>apply(value));new ResizeObserver(()=>{if(window.innerWidth>=1100)apply(value);}).observe(layout);
 }
 function matchesSearch(card,index){
  const value=query.normalize('NFC').trim().toLocaleLowerCase('sv');if(!value)return true;
  const page=value.match(/^sida\s*(\d+)$/);if(page)return card.page===Number(page[1]);
  const ordinal=value.match(/^kort\s*(\d+)$/);if(ordinal)return index+1===Number(ordinal[1]);
  if(/^\d+$/.test(value)&&card.page===Number(value))return true;
  return [card.code,card.header,card.originalCardCode].filter(Boolean).some(text=>String(text).normalize('NFC').toLocaleLowerCase('sv').includes(value));
 }
 function matchStatus(card){return api?.getMatchStatus?.(card)||null;}
 function category(card){const match=matchStatus(card);return card.deferred?'deferred':issues(card).length||match?.state==='missing'?'attention':match?.state==='pending'?'pending':'ready';}
 function nextIssue(){
  const all=cards(),attention=all.filter(card=>category(card)==='attention');if(!attention.length)return;
  const last=attention.findIndex(card=>card.id===selectedId),card=attention[(last+1)%attention.length];selectedId=card.id;
  currentFilter='attention';query='';$('rtReviewFilter').value=currentFilter;$('rtReviewSearch').value='';refresh();
  const panel=panels.get(card.id);if(panel?.querySelector('.rtCardFold'))panel.querySelector('.rtCardFold').open=true;panel?.scrollIntoView({block:'nearest',behavior:'instant'});panel?.querySelector('.rtShowCard')?.focus({preventScroll:true});return api?.showCard?.(card.id);
 }
 function enhancePanel(panel,card,providedApi){
  if(providedApi)api=providedApi;if(!panel||!card||panel.dataset.compactReview==='true')return;
  panel.dataset.compactReview='true';panel.classList.add('rtCompactResult');panels.set(card.id,panel);
  const heading=panel.querySelector('h3'),codeLabel=[...panel.children].find(el=>el.tagName==='LABEL'&&el.querySelector('input'));
  const head=node('div','rtReviewCardHead');if(heading)head.append(heading);head.append(node('span','rtReviewBadge'));panel.prepend(head);
  if(codeLabel){codeLabel.classList.add('rtReviewCodeLabel');const text=[...codeLabel.childNodes].find(child=>child.nodeType===3);if(text)text.textContent='Ritningskod';}
  const actions=node('div','rtReviewRowActions');
  const show=button('Visa',()=>{selectedId=card.id;return api?.showCard?.(card.id);},'rtShowCard');show.setAttribute('aria-label','Visa kort på sida '+card.page);actions.append(show);
  const link=button('Sök / koppla',()=>api?.beginManualLink?.(card.id),'rtManualLinkCard');actions.append(link);
  const use=button('Använd detta kort',()=>api?.chooseDuplicate?.(card.id),'rtChooseDuplicate');use.setAttribute('aria-label','Använd detta kort för beteckningen '+(card.code||'')+' på sida '+card.page);actions.append(use);
  const defer=button('Lägg åt sidan',()=>api?.toggleDeferred?.(card.id,!card.deferred),'rtDeferCard');actions.append(defer);panel.append(actions);
  const reason=node('p','rtReviewReason');panel.append(reason);
  const more=node(state().productsOnly?'details':'div','rtReviewMore');if(state().productsOnly){more.open=card.workReadError===true;more.append(node('summary','','Rätta produkter'));}
  for(const child of [...panel.children])if(child!==head&&child!==codeLabel&&child!==actions&&child!==reason&&!child.classList.contains('rtProductInventory'))more.append(child);
  panel.append(more);
  const fold=node('details','rtCardFold');fold.open=expanded.has(card.id);const summary=node('summary','rtCardSummary');summary.append(head,node('p','rtCardMatchCount'));fold.append(summary);
  const body=node('div','rtCardBody');for(const child of [...panel.children])body.append(child);fold.append(body);panel.append(fold);
  fold.addEventListener('toggle',()=>{if(fold.open)expanded.add(card.id);else expanded.delete(card.id);});
  refreshPanel(panel,card,cards().findIndex(item=>item.id===card.id));
 }
 function refreshPanel(panel,card,index){
  const ownIssues=issues(card),parked=card.deferred===true,kind=category(card),busy=!!state().busy;
  panel.dataset.reviewState=kind;panel.classList.toggle('rtSelectedReviewCard',card.id===selectedId);
  const heading=panel.querySelector('.rtReviewCardHead h3');if(heading)heading.textContent=(card.code||'Kort '+(index+1))+' · sida '+card.page;
  const match=matchStatus(card);
  panel.dataset.matchState=parked?'deferred':match?.state||'none';
  const badge=panel.querySelector('.rtReviewBadge');if(badge)badge.textContent=parked?'Åsidosatt':ownIssues.length?'Behöver åtgärdas':match?.state==='missing'?'Ej kopplad':match?.state==='pending'?'Sökning återstår':match?.state==='linked'?'Kopplad':'Avläst';
  const count=panel.querySelector('.rtCardMatchCount');if(count){count.hidden=parked||!match;count.textContent=match?.state==='pending'?'Matcha mot ritningen.':(match?.selected||0)+' av '+(match?.found||0)+' träffar valda';}
  const reason=panel.querySelector('.rtReviewReason');if(reason){reason.textContent=parked?'Åsidosatt – '+((card.deferredReasons||ownIssues).join('. ')||'kan tas med igen senare'):ownIssues.join('. ');reason.hidden=!reason.textContent;}
  const defer=panel.querySelector('.rtDeferCard');if(defer){defer.textContent=parked?'Ta med igen':'Lägg åt sidan';defer.disabled=busy;defer.setAttribute('aria-label',(parked?'Ta med igen':'Lägg åt sidan')+' kort '+(index+1)+' sida '+card.page);}
  const choose=panel.querySelector('.rtChooseDuplicate');if(choose){choose.hidden=parked||!ownIssues.some(issue=>/samma beteckning|flera kort.*beteckning|flera.*samma|dubblett/i.test(issue));choose.disabled=busy;choose.setAttribute('aria-label','Använd detta kort för beteckningen '+(card.code||'')+' på sida '+card.page);}
  const link=panel.querySelector('.rtManualLinkCard');if(link){link.hidden=parked||!!state().productsOnly||!api?.beginManualLink;link.disabled=busy||!!ownIssues.length||!state().matchingReady;}
  const show=panel.querySelector('.rtShowCard');if(show)show.disabled=busy;
  const more=panel.querySelector('.rtReviewMore');if(more&&card.workReadError===true)more.open=true;
 }
 function refresh(providedApi){
  if(providedApi)api=providedApi;if(!api||!ensureLayout())return;
  const all=cards(),counts={ready:0,attention:0,deferred:0,pending:0},runState=state();let visible=0;
  if(!all.length){currentFilter='all';query='';selectedId='';$('rtReviewFilter').value='all';$('rtReviewSearch').value='';}
  for(const [index,card] of all.entries()){
   const kind=category(card);counts[kind]++;const panel=$('rtResults').querySelector('[data-card-id="'+CSS.escape(card.id)+'"]');
   if(panel){if(!panel.dataset.compactReview)enhancePanel(panel,card);panels.set(card.id,panel);refreshPanel(panel,card,index);panel.hidden=!(currentFilter==='all'||currentFilter===kind)||!matchesSearch(card,index);if(!panel.hidden)visible++;}
  }
  for(const id of panels.keys())if(!all.some(card=>card.id===id))panels.delete(id);
  toolbar.hidden=!all.length;$('rtResults').hidden=!all.length;$('rtDialog').classList.toggle('rtHasReviewCards',!!all.length);
  $('rtReviewCounts').textContent=all.length+' kort · '+counts.ready+' klara'+(counts.pending?' · '+counts.pending+' återstår':'')+(counts.attention?' · '+counts.attention+' att kontrollera':'')+(counts.deferred?' · '+counts.deferred+' till senare':'');
  $('rtReviewVisible').textContent='Visar '+visible+' av '+all.length+' kort';$('rtReviewEmpty').hidden=!all.length||!!visible;
  $('rtReviewNext').disabled=runState.busy||!counts.attention;
  const continueButton=$('rtReviewContinue');continueButton.disabled=!!runState.busy||!runState.confirmed||runState.canContinue===false;
  continueButton.textContent=all.some(card=>!card.deferred&&!issues(card).length)?'Fortsätt med avlästa kort':runState.productsOnly?'Behåll tidigare arbetslistor':'Fortsätt utan nya kopplingar';continueButton.closest('.rtContinueRow').hidden=!runState.confirmed||!all.length||(!counts.attention&&!counts.deferred&&!runState.searchError);
  const footer=$('rtReviewBlockReason');if(footer){
   footer.hidden=!all.length;const start=$('rtStart');
   footer.dataset.state=start?.disabled?'blocked':'ready';
   footer.textContent=runState.busy?'Läsning pågår…':counts.attention?'Kontrollera '+counts.attention+' kort eller lämna dem till senare.':runState.searchError?'Sök igen eller fortsätt med sparade kopplingar.':counts.pending?'Matcha korten mot ritningen.':!counts.ready?(runState.productsOnly?'Inga nya produkter klara.':'Inga kort valda.'):
    !runState.matchingReady&&!runState.productsOnly?'Sök på ritningen.':start?.disabled?'Bekräfta att du har granskat träffarna.':counts.deferred?counts.deferred+' kort sparas till senare.':'';
   footer.hidden=!footer.textContent||!all.length;

  }
 }
 function mount(providedApi){api=providedApi;ensureLayout();refresh();}
 function reset(){
  currentFilter='all';query='';selectedId='';panels.clear();expanded.clear();
  const filter=$('rtReviewFilter'),search=$('rtReviewSearch');if(filter)filter.value='all';if(search)search.value='';
  refresh();
 }
 window.SmartMatchReadReviewV99=Object.freeze({mount,enhancePanel,refresh,reset});
})();
