/* Compact, explicit review controls for the isolated reading TEST 9.12. */
(function(){
 'use strict';
 let api=null,toolbar=null,currentFilter='all',query='',selectedId='',phaseAnchor=null;
 const $=id=>document.getElementById(id);
 const panels=new Map();
 function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
 function cards(){const value=api?.getCards?.()||[];return Array.isArray(value)?value:Object.values(value);}
 function state(){return api?.getState?.()||{};}
 function issues(card){return (api?.getIssues?.(card)||[]).map(issue=>typeof issue==='string'?issue:issue.message||issue.reason||'Behöver kontrolleras').filter(Boolean);}
 function run(action){Promise.resolve().then(action).catch(error=>{const status=$('rtStatus');if(status)status.textContent=error?.message||String(error);}).finally(()=>refresh());}
 function button(text,action,className){const el=node('button',className,text);el.type='button';el.addEventListener('click',()=>run(action));return el;}
 function ensureLayout(){
  const root=$('rtResults'),dialog=$('rtDialog'),documentPane=dialog?.querySelector('.rtDocument');if(!root||!dialog||!documentPane)return false;
  dialog.classList.add('rtCompactReview');
  if(root.parentElement!==documentPane)documentPane.append(root);
  root.setAttribute('aria-label','Avlästa dörrkort');root.tabIndex=0;
  if(!toolbar){
   toolbar=node('section','rtReviewToolbar');toolbar.id='rtReviewToolbar';toolbar.setAttribute('aria-label','Hitta och granska kort');
   const top=node('div','rtReviewToolbarHead');top.append(node('h3','','Avlästa dörrkort'));
   const next=button('Nästa att kontrollera',nextIssue);next.id='rtReviewNext';top.append(next);toolbar.append(top);
   const counts=node('p','rtReviewCounts');counts.id='rtReviewCounts';counts.setAttribute('aria-live','polite');toolbar.append(counts);
   const controls=node('div','rtReviewFilters');
   const filterLabel=node('label','','Visa');const filter=node('select');filter.id='rtReviewFilter';filter.setAttribute('aria-label','Filtrera avlästa kort');
   for(const [value,label] of [['all','Alla'],['attention','Behöver åtgärdas'],['deferred','Åsidosatta'],['ready','Klara']]){const option=node('option','',label);option.value=value;filter.append(option);}
   filter.onchange=()=>{currentFilter=filter.value;refresh();};filterLabel.append(filter);controls.append(filterLabel);
   const searchLabel=node('label','','Sök kod eller sida');const search=node('input');search.type='search';search.id='rtReviewSearch';search.placeholder='Exempel: GS23 eller sida 51';search.setAttribute('aria-label','Sök kod eller sida');search.oninput=()=>{query=search.value;refresh();};searchLabel.append(search);controls.append(searchLabel);toolbar.append(controls);
   const result=node('p','rtReviewVisible');result.id='rtReviewVisible';result.setAttribute('aria-live','polite');toolbar.append(result);
   const continueRow=node('div','rtContinueRow');const continueButton=button('Fortsätt med klara kort',()=>api?.continueReady?.(),'rtContinueReady');continueButton.id='rtReviewContinue';
   const help=node('p','','Kort som behöver rättas läggs åt sidan. Inga PDF-sidor tas bort. Du kan ta med korten igen senare.');continueRow.append(continueButton,help);toolbar.append(continueRow);
   const empty=node('p','rtReviewEmpty','Inga kort i det här urvalet. Välj Alla eller ändra sökningen.');empty.id='rtReviewEmpty';root.insertAdjacentElement('afterend',empty);
  }
  root.insertAdjacentElement('beforebegin',toolbar);
  if(!$('rtReviewBlockReason')){const footer=dialog.querySelector('.rtFooter');if(footer){const reason=node('p','rtReviewBlockReason');reason.id='rtReviewBlockReason';reason.setAttribute('role','status');footer.prepend(reason);}}
  if(!dialog.querySelector('.rtReadingInstructions')){
   const intro=$('rtIntro');if(intro){const details=node('details','rtReadingInstructions');details.append(node('summary','','Läsinställningar och instruktioner'));intro.before(details);details.append(intro);const setup=$('rtSetupDetails');if(setup)details.append(setup);}
  }
  if(!phaseAnchor&&$('rtReadPhaseLabel')){phaseAnchor=document.createComment('Reading phase before reviewing cards');$('rtReadPhaseLabel').before(phaseAnchor);}
  return true;
 }
 function matchesSearch(card,index){
  const value=query.normalize('NFC').trim().toLocaleLowerCase('sv');if(!value)return true;
  const page=value.match(/^sida\s*(\d+)$/);if(page)return card.page===Number(page[1]);
  const ordinal=value.match(/^kort\s*(\d+)$/);if(ordinal)return index+1===Number(ordinal[1]);
  if(/^\d+$/.test(value)&&card.page===Number(value))return true;
  return [card.code,card.header,card.originalCardCode].filter(Boolean).some(text=>String(text).normalize('NFC').toLocaleLowerCase('sv').includes(value));
 }
 function category(card){return card.deferred?'deferred':issues(card).length?'attention':'ready';}
 function nextIssue(){
  const all=cards(),attention=all.filter(card=>category(card)==='attention');if(!attention.length)return;
  const last=attention.findIndex(card=>card.id===selectedId),card=attention[(last+1)%attention.length];selectedId=card.id;
  currentFilter='attention';query='';$('rtReviewFilter').value=currentFilter;$('rtReviewSearch').value='';refresh();
  const panel=panels.get(card.id);panel?.scrollIntoView({block:'nearest',behavior:'instant'});panel?.querySelector('.rtShowCard')?.focus({preventScroll:true});return api?.showCard?.(card.id);
 }
 function enhancePanel(panel,card,providedApi){
  if(providedApi)api=providedApi;if(!panel||!card||panel.dataset.compactReview==='true')return;
  panel.dataset.compactReview='true';panel.classList.add('rtCompactResult');panels.set(card.id,panel);
  const heading=panel.querySelector('h3'),codeLabel=[...panel.children].find(el=>el.tagName==='LABEL'&&el.querySelector('input'));
  const head=node('div','rtReviewCardHead');if(heading)head.append(heading);head.append(node('span','rtReviewBadge'));panel.prepend(head);
  if(codeLabel){codeLabel.classList.add('rtReviewCodeLabel');const text=[...codeLabel.childNodes].find(child=>child.nodeType===3);if(text)text.textContent='Ritningskod';}
  const actions=node('div','rtReviewRowActions');
  const show=button('Visa sida',()=>{selectedId=card.id;return api?.showCard?.(card.id);},'rtShowCard');show.setAttribute('aria-label','Visa kort på sida '+card.page);actions.append(show);
  const use=button('Använd detta kort',()=>api?.chooseDuplicate?.(card.id),'rtChooseDuplicate');use.setAttribute('aria-label','Använd detta kort för beteckningen '+(card.code||'')+' på sida '+card.page);actions.append(use);
  const defer=button('Lägg åt sidan',()=>api?.toggleDeferred?.(card.id,!card.deferred),'rtDeferCard');actions.append(defer);panel.append(actions);
  const reason=node('p','rtReviewReason');panel.append(reason);
  const more=node('details','rtReviewMore');more.append(node('summary','','Läsning och justera område'));
  for(const child of [...panel.children])if(child!==head&&child!==codeLabel&&child!==actions&&child!==reason)more.append(child);
  panel.append(more);refreshPanel(panel,card,cards().findIndex(item=>item.id===card.id));
 }
 function refreshPanel(panel,card,index){
  const ownIssues=issues(card),parked=card.deferred===true,kind=category(card),busy=!!state().busy;
  panel.dataset.reviewState=kind;panel.classList.toggle('rtSelectedReviewCard',card.id===selectedId);
  const heading=panel.querySelector('.rtReviewCardHead h3');if(heading)heading.textContent='Kort '+(index+1)+' · sida '+card.page+(card.code?' · '+card.code:'');
  const badge=panel.querySelector('.rtReviewBadge');if(badge)badge.textContent=parked?'Åsidosatt':ownIssues.length?'Behöver åtgärdas':'Klar';
  const reason=panel.querySelector('.rtReviewReason');if(reason){reason.textContent=parked?'Åsidosatt – '+((card.deferredReasons||ownIssues).join('. ')||'kan tas med igen senare'):ownIssues.join('. ');reason.hidden=!reason.textContent;}
  const defer=panel.querySelector('.rtDeferCard');if(defer){defer.textContent=parked?'Ta med igen':'Lägg åt sidan';defer.disabled=busy;defer.setAttribute('aria-label',(parked?'Ta med igen':'Lägg åt sidan')+' kort '+(index+1)+' sida '+card.page);}
  const choose=panel.querySelector('.rtChooseDuplicate');if(choose){choose.hidden=parked||!ownIssues.some(issue=>/samma beteckning|flera kort.*beteckning|flera.*samma|dubblett/i.test(issue));choose.disabled=busy;choose.setAttribute('aria-label','Använd detta kort för beteckningen '+(card.code||'')+' på sida '+card.page);}
  const show=panel.querySelector('.rtShowCard');if(show)show.disabled=busy;
 }
 function refresh(providedApi){
  if(providedApi)api=providedApi;if(!api||!ensureLayout())return;
  const all=cards(),counts={ready:0,attention:0,deferred:0},runState=state();let visible=0;
  if(!all.length){currentFilter='all';query='';selectedId='';$('rtReviewFilter').value='all';$('rtReviewSearch').value='';}
  for(const [index,card] of all.entries()){
   const kind=category(card);counts[kind]++;const panel=$('rtResults').querySelector('[data-card-id="'+CSS.escape(card.id)+'"]');
   if(panel){if(!panel.dataset.compactReview)enhancePanel(panel,card);panels.set(card.id,panel);refreshPanel(panel,card,index);panel.hidden=!(currentFilter==='all'||currentFilter===kind)||!matchesSearch(card,index);if(!panel.hidden)visible++;}
  }
  for(const id of panels.keys())if(!all.some(card=>card.id===id))panels.delete(id);
  toolbar.hidden=!all.length;$('rtResults').hidden=!all.length;$('rtDialog').classList.toggle('rtHasReviewCards',!!all.length);
  const phase=$('rtReadPhaseLabel'),instructions=$('rtDialog').querySelector('.rtReadingInstructions');
  if(phase&&instructions&&phaseAnchor){if(all.length&&runState.confirmed){if(phase.parentElement!==instructions)instructions.querySelector('summary').after(phase);}else if(phase.parentElement===instructions)phaseAnchor.after(phase);}
  $('rtReviewCounts').textContent=all.length+' kort · '+counts.ready+' klara · '+counts.attention+' behöver åtgärdas · '+counts.deferred+' åsidosatta';
  $('rtReviewVisible').textContent='Visar '+visible+' av '+all.length+' kort';$('rtReviewEmpty').hidden=!all.length||!!visible;
  $('rtReviewNext').disabled=runState.busy||!counts.attention;
  const continueButton=$('rtReviewContinue');continueButton.disabled=!!runState.busy||!runState.confirmed||runState.canContinue===false;
  continueButton.textContent=counts.ready?'Fortsätt med klara kort':runState.productsOnly?'Behåll tidigare arbetslistor':'Fortsätt utan nya kopplingar';continueButton.closest('.rtContinueRow').hidden=!runState.confirmed||!all.length;
  const footer=$('rtReviewBlockReason');if(footer){
   footer.hidden=!all.length;const start=$('rtStart');
   footer.dataset.state=start?.disabled?'blocked':'ready';
   footer.textContent=runState.busy?'Avläsning eller sökning pågår. Du ser aktuellt steg ovan.':counts.attention?'Nästa steg: rätta '+counts.attention+' kort eller använd fortsätt-knappen ovan. Kort som läggs åt sidan kan tas med senare.':runState.searchError?'Ritningssökningen kunde inte slutföras. Du kan försöka igen eller använda fortsätt-knappen och kontrollera kopplingarna manuellt.':!counts.ready?(runState.productsOnly?'Inga nya arbetslistor är klara. Du kan behålla tidigare arbetslistor och rätta korten senare.':'Alla kort är åsidosatta. Du kan ta med ett kort igen eller fortsätta utan nya kopplingar.'):
    !runState.matchingReady&&!runState.productsOnly?'Sök på ritningen eller välj Fortsätt med klara kort.':start?.disabled?'Granska träffarna och kryssa i Jag har granskat träffarna på ritningen för att öppna projektet.':'Klart att öppna. '+(counts.deferred?counts.deferred+' åsidosatta kort sparas för senare rättning.':'');
  }
 }
 function mount(providedApi){api=providedApi;ensureLayout();refresh();}
 function reset(){
  currentFilter='all';query='';selectedId='';panels.clear();
  const filter=$('rtReviewFilter'),search=$('rtReviewSearch');if(filter)filter.value='all';if(search)search.value='';
  refresh();
 }
 window.SmartMatchReadReviewV99=Object.freeze({mount,enhancePanel,refresh,reset});
})();
