/* Projektering 2.15. Text WC/HWC door cards in their own group. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const natural = (a,b) => a.localeCompare(b,'sv',{numeric:true,sensitivity:'base'});
  const fold = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const focusFieldsAutomatically = () => matchMedia('(hover:hover) and (pointer:fine)').matches && !navigator.maxTouchPoints;
  let D, S, L, library, libraryOwner = 'device', libraryExists = false, libraryDamaged = false, libraryUI, productSuggest, libraryQueue = Promise.resolve(), libraryPending = 0;
  let state, original = new Uint8Array(), viewer, selected = [], activeCode = null, draft = null, dirty = false;
  let currentStencil = 'GS1', currentPage = 1, currentTool = 'select', busy = false, started = false, storageOk = true, damagedStore = false;
  let undoStack = [], redoStack = [], clipboard = [], productRow = null, editingStencil = null, messageTimer;
  let confirmResolve = null, textResolve = null, contextPoint = null, contextReturnFocus = null, suppressCardClickUntil = 0;
  let selectedAnnotation=null;
  let currentCategory = 'cards', currentCardGroup = 'GS', materialReport = null;
  let materialCacheKey = '', operationSettled = Promise.resolve(), canvasQueue = Promise.resolve();
  let materialTimeQueue = Promise.resolve(), materialTimePending = 0, materialStructureKey = '';
  const pendingMaterialTimes = new Map(), materialTimeDrafts = new Map();
  let materialTimeProject = '', materialTimeEpoch = 0;
  let cardPreviewViewer = null, cardPreviewBytes = null, cardPreviewCode = '', cardPreviewRequest = 0;
  let pdfSearchEngine = null, pdfSearchOpening = null, pdfSearchDocument = 0, pdfSearchRequest = 0, pdfSearchNavigation = 0;
  let pdfSearchState = {query:'',matches:[],index:-1,busy:false,message:'',textSelection:false,selectedText:''};
  const selectedPlacements = () => state.placements.filter(p => selected.includes(p.id));
  const stencilForCode = code => Object.values(state.stencils).find(s => s.code === code);
  const definitions = () => D.SECTIONS.flatMap(section => section.rows.map(row => ({...row,section:section.title})));
  function stencilGroup(stencil){return L.groupFor(library,stencil);}
  function revealStencil(stencil){
    if(!stencil)return;currentCategory=stencil.kind==='card'?'cards':'other';
    currentCardGroup=stencilGroup(stencil);
  }
  function libraryStencils(){
    return D.listStencils(state).filter(stencil=>!L.isHidden(library,stencil.code));
  }
  function firstLibraryStencil(){const list=libraryStencils();return list.find(stencil=>stencil.id===(state.stencils.GS1?'GS1':'GS1:1'))?.id||list[0]?.id||'';}
  function libraryProject(project,{fresh=false}={}){
    const next=D.upgradeRestroomStencils(project);
    const projectCodes=new Set(Object.values(next.stencils).map(stencil=>stencil.code));
    const explicitCodes=new Set(library.stencils.map(stencil=>stencil.code));
    for(const savedTemplate of library.stencils){
      const initialCode=D.initialCardCode(savedTemplate.code);
      const mapInitial=savedTemplate.kind==='card'&&initialCode!==savedTemplate.code&&(fresh||(!projectCodes.has(savedTemplate.code)&&projectCodes.has(initialCode)));
      if(mapInitial&&explicitCodes.has(initialCode))continue;
      const template=mapInitial?{...savedTemplate,id:initialCode,code:initialCode,name:savedTemplate.name===savedTemplate.code?initialCode:savedTemplate.name}:savedTemplate;
      const existing=Object.values(next.stencils).find(stencil=>stencil.code===template.code);
      if(existing&&!fresh)continue;
      const alias=Object.values(next.stencils).find(stencil=>stencil.code!==template.code&&D.matchKey(stencil.code)===D.matchKey(template.code));
      if(alias){
        if(!fresh||next.cards[alias.code]||next.placements.some(placement=>placement.stencilId===alias.id))continue;
        delete next.stencils[alias.id];
      }
      if(!existing&&Object.keys(next.stencils).length>=D.LIMITS.stencils)continue;
      let id=existing?.id||template.code;
      if(!existing&&next.stencils[id])id='library-'+crypto.randomUUID();
      next.stencils[id]={...clone(template),id};
      projectCodes.add(template.code);
    }
    return D.validate(next);
  }
  async function persistLibrary(next){
    const requested=L.validate(next),owner=libraryOwner,baseRevision=library.revision;
    libraryPending++;
    const operation=libraryQueue.then(async()=>{
      if(owner!==libraryOwner)throw Error('Bibliotekets användare har ändrats. Öppna appen igen.');
      if(library.revision!==baseRevision){const conflict=Error('Biblioteket har uppdaterats under tiden. Försök spara igen.');conflict.name='ConflictError';throw conflict;}
      const candidate=L.validate({...requested,revision:library.revision+1,updatedAt:new Date().toISOString()});
      if(libraryDamaged){const answer=await ask({title:'Ersätt det oläsbara biblioteket?',text:'Den tidigare lokala kopian kunde inte läsas och har behållits. Detta sparar biblioteket som visas nu i stället.',accept:'Spara detta bibliotek'});if(answer!=='accept')throw Error('Biblioteket har inte ersatts.');}
      try{
        const saved=await L.save(candidate,owner,libraryDamaged?{}:{expectedRevision:libraryExists?library.revision:null});
        library=saved;libraryExists=true;libraryDamaged=false;
      }catch(error){
        if(error?.name==='ConflictError'){
          const latest=await L.load(owner);if(latest){library=latest;libraryExists=true;state=libraryProject(state);renderLibrary();viewer?.setProject(state,{selectedIds:selected});}
        }
        throw error;
      }
      state=libraryProject(state);renderLibrary();productSuggest?.close();viewer?.setProject(state,{selectedIds:selected});return library;
    });
    libraryQueue=operation.catch(()=>{});return operation.finally(()=>{libraryPending--;});
  }
  async function rememberStencil(stencil,groupId){
    let next=L.saveStencil(library,stencil);next=L.setHidden(next,stencil.code,false);
    if(groupId)next=L.assignGroup(next,stencil.code,groupId);
    try{await persistLibrary(next);}catch(error){throw Error('Stencilen är sparad i projektet, men biblioteket kunde inte sparas: '+error.message);}
  }
  function message(text, error = false) {
    $('appMessage').textContent = text; $('appMessage').dataset.level = error ? 'error' : 'success';
    clearTimeout(messageTimer); if (!error) messageTimer = setTimeout(() => { $('appMessage').textContent = ''; }, 6500);
    for (const [dialog, output] of [['productDialog','productMessage'],['stencilDialog','stencilMessage'],['equipmentDialog','equipmentMessage']]) {
      if ($(dialog)?.open && $(output)) { $(output).textContent = text; $(output).dataset.level = error ? 'error' : 'success'; }
    }
  }
  function ask({title,text,accept='Fortsätt',discard=''}) {
    if (confirmResolve) return Promise.resolve('cancel');
    viewer?.cancelGesture?.();
    $('confirmTitle').textContent=title; $('confirmText').textContent=text; $('confirmAccept').textContent=accept;
    $('confirmDiscard').textContent=discard; $('confirmDiscard').hidden=!discard; $('confirmDialog').showModal();
    return new Promise(resolve => { confirmResolve=resolve; });
  }
  function resolveAsk(answer) { $('confirmDialog').close(); const resolve=confirmResolve; confirmResolve=null; resolve?.(answer); }
  function askText(title,label,value='') {
    viewer?.cancelGesture?.();
    $('textTitle').textContent=title; $('textLabel').textContent=label; $('textValue').value=value; $('textDialog').showModal(); $('textValue').focus();
    return new Promise(resolve => { textResolve=resolve; });
  }
  function resolveText(accept) { const value=accept?$('textValue').value:null; $('textDialog').close(); const resolve=textResolve; textResolve=null; resolve?.(value); }
  function status() {
    const annotationDirty=!!annotationItem()&&$('annotationText').dataset.annotationId===selectedAnnotation&&$('annotationText').value!==annotationItem().text;
    $('saveStatus').textContent=busy?'Arbetar …':annotationDirty?'Texten sparas när du lämnar fältet':dirty?'Dörrkortet har osparade ändringar':storageOk?'Sparat på enheten':'Lokal sparning är inte tillgänglig';
    $('saveStatus').dataset.state=dirty||annotationDirty?'pending':storageOk?'saved':'error';
    const counts=D.placementCounts(state);
    $('placementCount').textContent=counts.markings;$('cardCount').textContent=counts.cards;
    $('automationCount').textContent=counts.doorAutomation;$('closerCount').textContent=counts.doorCloser;
    $('otherProductCount').textContent=counts.otherProducts;
    $('cardStatus').textContent=!draft?'Välj eller skapa ett dörrkort':dirty?'Osparade ändringar':state.cards[activeCode]?'Sparat dörrkort':'Nytt dörrkort';
    $('saveCard').disabled=busy||!draft||(!dirty&&!!state.cards[activeCode]);
    $('undo').disabled=busy||!undoStack.length; $('redo').disabled=busy||!redoStack.length;
    for (const id of ['deleteSelection','duplicateSelection','lockSelection','rotateLeft','rotateRight']) $(id).disabled=busy||(!selected.length&&!(selectedAnnotation&&['deleteSelection','duplicateSelection'].includes(id)));
    $('selectAllTool').disabled=busy||!state.placements.some(p=>p.page===currentPage);
    $('applySelection').disabled=busy||!selectedPlacements().length;
    $('editEquipment').hidden=true;$('editEquipment').disabled=true;
    $('materialPdf').disabled=(busy&&!materialTimePending)||!materialReport?.rows.length;$('materialCsv').disabled=(busy&&!materialTimePending)||!materialReport?.rows.length;
    $('copyCard').disabled=busy||!state.cards[activeCode]; $('deleteCard').disabled=busy||!state.cards[activeCode];
    $('previewCard').disabled=busy||!draft;
    const forkTarget=selectedPlacements();
    $('forkCard').disabled=busy||forkTarget.length!==1||state.stencils[forkTarget[0]?.stencilId]?.kind!=='card'||forkTarget[0]?.code!==activeCode;
    $('editStencil').disabled=busy||!state.stencils[currentStencil]; $('deleteStencil').disabled=busy||!state.stencils[currentStencil];
    $('drawingEmpty').hidden=!!state.drawing.pages.length;
    $('drawingHost').setAttribute('aria-busy', String(busy));
    refreshPDFTextTools();
  }
  async function run(task) {
    if (busy) { viewer?.setSelection(selected); return false; }
    let settle;operationSettled=new Promise(resolve=>{settle=resolve;});
    busy=true; status();
    try { return await task(); }
    catch(error) { message(error?.message||'Åtgärden kunde inte slutföras.',true); $('projectName').value=state.project.name;renderSelection();renderTools(); return false; }
    finally { busy=false;try{status();viewer?.setProject(state,{selectedIds:selected});}finally{settle();} }
  }
  function runCanvas(task){
    const projectId=state.project.id,sourceViewer=viewer;
    canvasQueue=canvasQueue.then(async()=>{
      while(busy)await operationSettled;
      if(state.project.id!==projectId||viewer!==sourceViewer)return false;
      return run(task);
    }).catch(error=>{message(error?.message||'Pekåtgärden kunde inte slutföras.',true);return false;});
    return canvasQueue;
  }
  async function commit(mutate,text,{history=true}={}) {
    const before=clone(state), next=clone(state); mutate(next);
    const valid=D.validate(next);
    if(damagedStore){const answer=await ask({title:'Ersätt den oläsbara lokala kopian?',text:'Den tidigare kopian gick inte att öppna och har behållits. Detta sparar projektet som visas nu i stället.',accept:'Spara detta projekt'});if(answer!=='accept')throw Error('Sparningen avbröts. Den tidigare lokala kopian har behållits.');}
    await S.save(valid,original); // Nothing in the active project changes before the transaction commits.
    if (history) { undoStack.push(before); if(undoStack.length>40)undoStack.shift(); redoStack=[]; }
    state=valid; storageOk=true; damagedStore=false;
    selected=selected.filter(id=>state.placements.some(p=>p.id===id));
    if(text)message(text); renderAll(); return true;
  }
  function setActive(code) {
    if(code&&selectedAnnotation){selectedAnnotation=null;viewer?.setAnnotationSelection(null);}
    // A card chosen outside the drawing must not leave another card's stamp selected.
    if(selectedPlacements().some(p=>(state.stencils[p.stencilId]?.kind==='card'?p.code:null)!==code)){selected=[];viewer?.setSelection([]);}
    activeCode=code&&state.cards[code]?code:null; draft=activeCode?clone(state.cards[activeCode]):null; dirty=false;
    const stencil=code&&stencilForCode(code);if(stencil){currentStencil=stencil.id;revealStencil(stencil);}
  }
  function draftChanged() { dirty=!!draft&&(JSON.stringify(draft)!==JSON.stringify(state.cards[activeCode]||D.createCard(activeCode))); status(); }
  function updateTypedProduct(rowId,value){
    if(!draft||busy)return;const row=draft.rows.find(row=>row.id===rowId);if(!row)return;
    row.product=String(value).slice(0,160);draftChanged();
    const button=[...$('cardRows').querySelectorAll('[data-action="clear-product"]')].find(button=>button.dataset.rowId===rowId);if(button)button.disabled=!row.product;
  }
  async function saveCard() {
    if(!draft||(!dirty&&state.cards[activeCode]))return true;
    const card=clone(draft), code=activeCode;
    await commit(next=>{
      if(!Object.values(next.stencils).some(s=>s.code===code))D.addStencil(next,{...D.defaultStencilFor(next,code),id:code,code,kind:'card'});
      D.updateCard(next,code,card);
    },`${code} är sparat. Alla dess dörrpositioner använder samma dörrkort.`);
    setActive(code); renderCard(); status(); return true;
  }
  async function leaveDraft() {
    if(!dirty)return true;
    const answer=await ask({title:`Spara ändringar i ${activeCode}?`,text:'Det sparade kortet delas av alla dörrar med samma beteckning.',accept:'Spara ändringar',discard:'Lämna utan att spara'});
    if(answer==='accept')return saveCard();
    if(answer==='discard'){draft=activeCode?clone(state.cards[activeCode]||D.createCard(activeCode)):null;dirty=false;renderCard();status();return true;}return false;
  }
  async function selectIds(ids,{showCard=false}={}) {
    const valid=ids.filter(id=>state.placements.some(p=>p.id===id));
    if(valid.length){selectedAnnotation=null;viewer?.setAnnotationSelection(null);renderAnnotationPanel();}
    const first=state.placements.find(p=>p.id===valid[0]), code=first&&state.stencils[first.stencilId]?.kind==='card'?first.code:null;
    if(code!==activeCode){if(!await leaveDraft()){viewer.setSelection(selected);return false;}setActive(code);}
    selected=valid;
    if(first){currentStencil=first.stencilId;revealStencil(state.stencils[first.stencilId]);}
    viewer.setSelection(selected); renderAll();
    if(showCard&&code)openCardView();
    return true;
  }
  async function chooseStencil(id) {
    const stencil=state.stencils[id]; if(!stencil)throw Error('Stencilen finns inte.');
    const code=stencil.kind==='card'&&state.cards[stencil.code]?stencil.code:null;
    if(code!==activeCode){if(!await leaveDraft())return;setActive(code);}
    selectedAnnotation=null;viewer.setAnnotationSelection(null);currentStencil=id;revealStencil(stencil);viewer.setStencil(id); setTool('place'); renderAll();
    if(matchMedia('(max-width:1100px)').matches)showView('drawing');
  }
  function setTool(tool,{keepGesture=false}={}) {
    if(pdfSearchState.textSelection)setPDFTextSelection(false);
    currentTool=tool; if(!keepGesture)viewer.setTool(tool); viewer.setStencil(currentStencil);
    const names={select:'Dra en stämpel för att flytta. Dra tom yta för att panorera. Tryck två gånger för dörrkort på pekskärm, klicka en gång med mus.',pan:'Dra för att flytta ritningen. Mushjul eller två fingrar zoomar.',place:'Tryck för att placera. Dra en stämpel för att flytta, eller tom yta för att panorera.',erase:'Tryck på en olåst stämpel för att ta bort. Dra tom yta för att panorera.'};
    $('toolHint').textContent=names[tool]||'';renderAnnotationPanel();
    for(const [id,value]of [['toolSelect','select'],['toolPan','pan'],['toolPlace','place'],['toolErase','erase']]){$(id).classList.toggle('is-active',tool===value);$(id).setAttribute('aria-pressed',String(tool===value));}
  }
  function snap(point,page) {
    if(!$('gridSnap').checked)return point;const meta=state.drawing.pages[page-1];
    return {x:Math.round(point.x*meta.width/5)*5/meta.width,y:Math.round(point.y*meta.height/5)*5/meta.height};
  }
  async function place(input) {
    const stencil=state.stencils[input.stencilId];if(!stencil)throw Error('Välj en stencil först.');
    const code=stencil.kind==='card'?stencil.code:null;
    if(code!==activeCode&&!await leaveDraft())return;
    let added;await commit(next=>{added=D.addPlacement(next,{...input,...snap(input,input.page)});},`${stencil.code} är placerad på sida ${input.page}.`);
    selected=[added.id];currentStencil=stencil.id;if(code!==activeCode)setActive(code);renderAll();
    if(code&&state.preferences.autoOpenCard)openCardView();
  }
  async function move(updates) {
    await commit(next=>{for(const update of updates){const old=next.placements.find(p=>p.id===update.id);if(old)D.updatePlacement(next,old.id,snap(update,old.page));}},'Placeringen är sparad.');
  }
  async function resize({id,width,height,scope}) {
    await commit(next=>D.resizeShared(next,id,width,height,{scope}), 'Stämpelstorleken är sparad.');
  }
  function openCardView({focus=false}={}) {
    if(!activeCode)return;
    if(matchMedia('(max-width:1100px)').matches&&document.body.dataset.view!=='cards'){
      // A touch pointer-up can reveal the card before its compatibility click.
      // Consume that click; a fresh pointer-down always starts a new action.
      suppressCardClickUntil=performance.now()+500;showView('cards');
    }
    if(focus&&focusFieldsAutomatically())$('cardMeta').querySelector('input')?.focus({preventScroll:true});
  }
  async function activate({id}) {
    if(!await selectIds([id])||!selected.includes(id))return;
    const stencil=state.stencils[state.placements.find(p=>p.id===id)?.stencilId];
    if(stencil?.kind==='card')openCardView({focus:true});
  }
  async function removePositions(ids=selected) {
    if(selectedAnnotation)return removeAnnotation();
    if(!ids.length)return;
    await commit(next=>D.removePlacements(next,ids),'Stämpeln är borttagen. Du kan ångra ändringen.');selected=selected.filter(id=>!ids.includes(id));renderAll();
  }
  async function forkSelectedCard(){
    const items=selectedPlacements(),target=items[0];
    if(items.length!==1||state.stencils[target?.stencilId]?.kind!=='card'||target.code!==activeCode)throw Error('Välj en enda dörrstämpel på ritningen först.');
    const placementId=target.id,sourceCode=target.code,card=clone(draft||state.cards[sourceCode]||D.createCard(sourceCode));
    const code=await askText('Eget kort för denna dörr','Egen beteckning',D.suggestForkCode(state,sourceCode));
    if(code===null)return;
    const current=state.placements.find(item=>item.id===placementId);
    if(!current||current.code!==sourceCode||activeCode!==sourceCode||selected.length!==1||selected[0]!==placementId)throw Error('Välj dörren igen innan du skapar ett eget kort.');
    let created;await commit(next=>{created=D.forkPlacementCard(next,placementId,code,card);},'Dörren har fått ett eget kort. De andra dörrarna behåller sitt kort.');
    selected=[placementId];setActive(created.code);currentStencil=state.placements.find(item=>item.id===placementId).stencilId;revealStencil(state.stencils[currentStencil]);renderAll();openCardView();
  }
  async function createBlankDrawing(){
    if(!await leaveDraft())return;
    if(state.drawing.pages.length||Object.keys(state.cards).length||state.placements.length){
      const answer=await ask({title:'Skapa dörrkort på en tom sida?',text:'Spara en projektkopia först om du vill behålla det nuvarande projektet.',accept:'Skapa tom sida'});
      if(answer!=='accept')return;
    }
    const blank=await Proj2PDF.blank();
    await replaceProject(libraryProject(blank.state,{fresh:true}),blank.original,'En tom sida är klar. Placera stämplar och fyll i dina dörrkort.');
  }
  function refreshPDFTextTools(){
    const available=!!original.length&&!!state?.drawing.pages.length&&!busy,hasText=!!pdfSearchState.selectedText;
    $('pdfTextSelectButton').disabled=!available;
    $('pdfTextSelectButton').setAttribute('aria-pressed',String(pdfSearchState.textSelection));
    $('pdfTextSelectButton').classList.toggle('is-active',pdfSearchState.textSelection);
    $('pdfSearchSelected').disabled=!available||!hasText;
    $('pdfCopyText').disabled=!available||!hasText;
    $('pdfSearchButton').disabled=!available;
    $('pdfSearchInput').disabled=!available;
    $('pdfSearchPrev').disabled=busy||pdfSearchState.busy||pdfSearchState.index<=0;
    $('pdfSearchNext').disabled=busy||pdfSearchState.busy||pdfSearchState.index<0||pdfSearchState.index>=pdfSearchState.matches.length-1;
  }
  function renderDrawingSearch(){
    if(!$('pdfSearchResults'))return;
    refreshPDFTextTools();
    const result=pdfSearchState,index=result.index;
    $('pdfSearchStatus').textContent=result.message;
    $('pdfSearchStatus').setAttribute('aria-busy',String(result.busy));
    $('pdfSearchPrev').disabled=busy||result.busy||index<=0;
    $('pdfSearchNext').disabled=busy||result.busy||index<0||index>=result.matches.length-1;
    const start=Math.max(0,Math.min(index-40,result.matches.length-100));
    $('pdfSearchResults').innerHTML=result.matches.slice(start,start+100).map((match,offset)=>'<button type="button" data-pdf-match="'+(start+offset)+'" class="pdf-search-result'+(start+offset===index?' is-active':'')+'" aria-current="'+(start+offset===index?'true':'false')+'"><strong>Sida '+match.page+'</strong><span>'+esc(String(match.text||result.query).slice(0,140))+'</span></button>').join('');
    $('pdfSearchResults').hidden=!result.matches.length;
  }
  function resetDrawingSearch(){
    pdfSearchDocument++;pdfSearchRequest++;pdfSearchNavigation++;
    const previous=pdfSearchEngine;pdfSearchEngine=null;pdfSearchOpening=null;
    if(previous)try{Promise.resolve(previous.destroy()).catch(()=>{});}catch(_){}
    pdfSearchState={query:'',matches:[],index:-1,busy:false,message:'',textSelection:false,selectedText:''};
    if($('pdfSearchInput'))$('pdfSearchInput').value='';
    renderDrawingSearch();
  }
  function setPDFTextSelection(value){
    const enabled=!!value&&!!original.length&&!!state?.drawing.pages.length;
    if(enabled&&!pdfSearchState.textSelection)setTool('select');
    pdfSearchState.textSelection=enabled;
    if(!enabled)pdfSearchState.selectedText='';
    viewer?.setTextSelection?.(enabled);refreshPDFTextTools();
  }
  function rememberPDFText(input){
    const text=String(typeof input==='string'?input:input?.text||'').trim();
    if(text&&pdfSearchState.textSelection&&text!==pdfSearchState.selectedText){pdfSearchState.selectedText=text;refreshPDFTextTools();}
  }
  async function ensurePDFSearch(){
    if(pdfSearchOpening)return pdfSearchOpening;
    const documentToken=pdfSearchDocument,sourceViewer=viewer;
    const engine=Proj2Search.create({pdfjs:pdfjsLib,onProgress:progress=>{
      if(documentToken!==pdfSearchDocument||!pdfSearchState.busy)return;
      pdfSearchState.message='Läser PDF-text: '+progress.scannedPages+' av '+progress.total+' sidor …';
      $('pdfSearchStatus').textContent=pdfSearchState.message;
    }});
    pdfSearchEngine=engine;
    pdfSearchOpening=(async()=>{
      const shared=sourceViewer?.getSearchDocument?.();
      if(shared)await engine.useDocument(shared);else await engine.open(original.slice());
      if(documentToken!==pdfSearchDocument||sourceViewer!==viewer){const error=Error('Ritningen har bytts.');error.name='AbortError';throw error;}
      return engine;
    })().catch(error=>{if(documentToken===pdfSearchDocument){pdfSearchOpening=null;pdfSearchEngine=null;try{Promise.resolve(engine.destroy()).catch(()=>{});}catch(_){}}throw error;});
    return pdfSearchOpening;
  }
  async function showPDFSearchResult(index){
    const match=pdfSearchState.matches[index];if(!match)return;
    const documentToken=pdfSearchDocument,navigation=++pdfSearchNavigation,sourceViewer=viewer;
    pdfSearchState.index=index;renderDrawingSearch();showView('drawing');
    try{
      await sourceViewer.showSearchMatch(match);
      if(documentToken!==pdfSearchDocument||navigation!==pdfSearchNavigation)return;
      const active=$('pdfSearchResults').querySelector('[data-pdf-match="'+index+'"]');active?.scrollIntoView({block:'nearest'});
    }catch(error){if(documentToken===pdfSearchDocument&&navigation===pdfSearchNavigation&&error?.name!=='AbortError')message(error.message||'Träffen kunde inte visas.',true);}
  }
  async function searchDrawingText(value=$('pdfSearchInput').value){
    const query=String(value??'').normalize('NFKC').trim();
    if(query.length>160){message('Markera en kortare text eller skriv högst 160 tecken.',true);return;}
    const request=++pdfSearchRequest,documentToken=pdfSearchDocument;
    pdfSearchNavigation++;viewer?.clearSearchMatch?.();
    pdfSearchState={...pdfSearchState,query,matches:[],index:-1,busy:!!query,message:query?'Söker i hela ritningen …':''};
    $('pdfSearchInput').value=query;renderDrawingSearch();
    if(!query)return;
    if(!original.length){pdfSearchState.busy=false;pdfSearchState.message='Öppna en PDF-ritning först.';renderDrawingSearch();return;}
    try{
      const engine=await ensurePDFSearch(),result=await engine.search(query,{maxResults:5000});
      if(request!==pdfSearchRequest||documentToken!==pdfSearchDocument)return;
      const found=result.matches||[],stats=result.stats||result,failed=Array.isArray(stats.failedPages)?stats.failedPages.length:Number(stats.failedPages)||0;
      let text=!stats.textPages?(failed?'Ingen sökbar text kunde läsas.':'PDF:en saknar sökbar text. Använd en PDF med textlager.'):found.length?(result.truncated?'Visar de första '+found.length+' träffarna. Förfina sökningen för fler.':found.length+' träffar på '+new Set(found.map(match=>match.page)).size+' sidor.'):'Inga träffar.';
      if(failed)text+=' '+failed+' sidor kunde inte läsas.';
      pdfSearchState={...pdfSearchState,matches:found,index:found.length?0:-1,busy:false,message:text};
      renderDrawingSearch();if(found.length)await showPDFSearchResult(0);
    }catch(error){
      if(request!==pdfSearchRequest||documentToken!==pdfSearchDocument)return;
      pdfSearchState.busy=false;pdfSearchState.message=error?.name==='AbortError'?'Sökningen avbröts.':error?.message||'PDF-texten kunde inte sökas.';renderDrawingSearch();
    }
  }
  async function copyPDFText(){
    const text=viewer?.getSelectedText?.()||pdfSearchState.selectedText;if(!text)return;
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{
        const selection=window.getSelection(),ranges=selection?Array.from({length:selection.rangeCount},(_,i)=>selection.getRangeAt(i).cloneRange()):[];
        const field=document.createElement('textarea');field.value=text;field.setAttribute('readonly','');field.style.cssText='position:fixed;left:-10000px;top:0';document.body.append(field);field.select();
        try{if(!document.execCommand('copy'))throw Error('Texten kunde inte kopieras. Använd Kopiera i webbläsarens textmeny.');}finally{field.remove();if(selection){selection.removeAllRanges();for(const range of ranges)if(range.startContainer.isConnected&&range.endContainer.isConnected)selection.addRange(range);}}
      }
      message('Texten är kopierad.');
    }catch(error){message(error.message||'Texten kunde inte kopieras. Använd webbläsarens Kopiera.',true);}
  }
  function makeViewer() {
    resetDrawingSearch();
    viewer?.destroy();
    let selectionRequest=null;
    function afterSelection(ids,task){
      const request=selectionRequest?.ids.some(id=>ids.includes(id))?selectionRequest:null;selectionRequest=null;
      return runCanvas(async()=>{if(request&&await request.result===false)return false;return task();});
    }
    viewer=Proj2Canvas.create({host:$('drawingHost'),touchTapOpens:false,mouseClickOpens:true,onTextSelection:rememberPDFText,onError:error=>message(error?.message||'Ritningen kunde inte visas.',true),onSelect:ids=>{
      const request={ids:[...ids],result:null};selectionRequest=request;
      request.result=runCanvas(()=>selectIds(ids));
      void request.result.finally(()=>{if(selectionRequest===request)selectionRequest=null;});
    },onAnnotationSelect:id=>void runCanvas(()=>selectAnnotation(id)),onAnnotationCreate:point=>void runCanvas(()=>createAnnotation(point)),onAnnotationChange:({id,item})=>void runCanvas(()=>changeAnnotation(id,item)),onAnnotationArrow:point=>void runCanvas(()=>addAnnotationArrow(point)),onPlace:input=>void runCanvas(()=>place(input)),onMove:updates=>void afterSelection(updates.map(item=>item.id),()=>move(updates)),onResize:input=>void afterSelection([input.id],()=>resize(input)),onActivate:input=>void afterSelection([input.id],()=>activate(input)),onContext:input=>void runCanvas(()=>openContext(input)),onErase:ids=>void runCanvas(()=>removePositions(ids)),onChangePage:page=>{closeContext();currentPage=page;selected=[];renderSelection();renderPositions();status();},onView:view=>{
      currentPage=view.page||1;$('pageNumber').value=currentPage;$('pageTotal').textContent=view.total||0;$('zoomLevel').textContent=Math.round((view.zoom||1)*100)+'%';
      $('prevPage').disabled=currentPage<=1;$('nextPage').disabled=currentPage>=(view.total||0);
    }});setTool(currentTool);viewer.setProject(state,{selectedIds:selected});
  }
  function showView(view) {
    productSuggest?.close();
    if(view!=='drawing')viewer?.cancelGesture?.();
    document.body.dataset.view=view;
    document.querySelectorAll('button[data-view]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.view===view));b.classList.toggle('is-active',b.dataset.view===view);});
    if(view==='drawing')requestAnimationFrame(()=>viewer?.setProject(state,{selectedIds:selected}));
  }
  function renderLibrary() {
    const query=fold($('stampSearch').value.trim());
    const stencilsInLibrary=libraryStencils(),config=library;
    const allGroups=L.groupsFor(config,currentCategory);
    const groups=allGroups.filter(group=>!group.fallback||stencilsInLibrary.some(stencil=>(stencil.kind==='card'?'cards':'other')===currentCategory&&stencilGroup(stencil)===group.id));
    if(!groups.some(group=>group.id===currentCardGroup))currentCardGroup=groups[0]?.id||'';
    $('stencilCategories').innerHTML=[['cards',config.labels.cards],['other',config.labels.other]].map(([value,label])=>`<button type="button" data-stencil-category="${value}" aria-pressed="${currentCategory===value}" class="${currentCategory===value?'is-active':''}">${esc(label)}</button>`).join('');
    $('stencilCardGroups').hidden=!!query||(groups.length===1&&groups[0].name===config.labels[currentCategory]);
    $('stencilCardGroups').innerHTML=groups.map(group=>`<button type="button" data-card-group="${esc(group.id)}" aria-pressed="${currentCardGroup===group.id}" class="${currentCardGroup===group.id?'is-active':''}">${esc(group.name)}</button>`).join('');
    $('stencilFilterHint').hidden=!query;$('stencilFilterHint').textContent=query?'Sökresultat i alla grupper.':'';
    const stencils=stencilsInLibrary.filter(s=>query?fold(s.code+' '+s.name+' '+D.stencilLabel(s)+' '+config.labels[s.kind==='card'?'cards':'other']+' '+(config.groups.find(group=>group.id===stencilGroup(s))?.name||'')).includes(query):(s.kind==='card'?'cards':'other')===currentCategory&&stencilGroup(s)===currentCardGroup);
    $('stampList').innerHTML=stencils.map(s=>{
      const count=state.placements.filter(p=>p.stencilId===s.id).length;
      const label=D.stencilLabel(s),kind=s.kind==='card'?'Dörrkort':'Symbol · Övrigt',description=s.kind==='card'?'Dörrkort':s.name===s.code?'Symbol':s.name;
      return `<button type="button" draggable="true" class="stencil-item${s.id===currentStencil?' is-active':''}" data-stencil-id="${esc(s.id)}" aria-pressed="${s.id===currentStencil}" title="${esc(s.code+' · '+label+' · '+kind)}. Dra till ritningen."><span class="stencil-preview shape-${s.shape}${D.restroomSymbol(s.code)?' stencil-restroom-text':''}" style="--stamp-fill:${esc(s.fill)};--stamp-stroke:${esc(s.stroke)};--stamp-text:${esc(s.textColor)}">${esc(s.code)}</span><small>${esc(description)}${count?' · '+count+' st':''}</small></button>`;
    }).join('')||'<p class="empty-note">Ingen stencil hittades. Skapa en egen.</p>';
    const cardQuery=$('cardSearch').value.trim().toUpperCase();
    $('cardList').innerHTML=Object.keys(state.cards).sort(natural).filter(code=>code.includes(cardQuery)).map(code=>{
      const count=state.placements.filter(p=>p.code===code).length;
      return `<button type="button" class="card-list-item${activeCode===code?' is-active':''}" data-card-code="${esc(code)}"><strong>${esc(code)}</strong><small>${count} dörrar</small></button>`;
    }).join('')||'<p class="empty-note">Inga dörrkort. Skapa ett kort eller placera en GS-stämpel.</p>';
    $('selectedStamp').textContent=state.stencils[currentStencil]?.code||'Välj stencil';
  }
  function renderCard() {
    productSuggest?.close();
    $('cardCode').textContent=activeCode||'Dörrkort';
    $('cardUsage').textContent=activeCode?`Används av ${state.placements.filter(p=>p.code===activeCode&&state.stencils[p.stencilId].kind==='card').length} dörrar`:'Välj en dörrstämpel eller skapa ett dörrkort.';
    $('cardNote').disabled=!draft;$('cardNote').value=draft?.note||'';
    if(!draft){$('cardMeta').innerHTML='';$('cardRows').innerHTML='<div class="card-empty"><p>Placera en stencil på ritningen för att skapa dörrkortet. Du kan också välja Nytt dörrkort.</p><p>Symbolerna under Övrigt har inget dörrkort.</p></div>';return;}
    const metaLabels={littera:'Littera',hanging:'Hängning',doorType:'Dörrtyp',fire:'Brandkrav',security:'Skyddsklass',escape:'Utrymningskrav',reentry:'Återinrymning'};
    $('cardMeta').innerHTML=Object.entries(metaLabels).map(([key,label])=>`<label><span>${label}</span><input data-meta="${key}" value="${esc(draft.meta[key])}" maxlength="120" aria-label="${label}"></label>`).join('');
    $('cardRows').innerHTML=D.SECTIONS.map(section=>`<details class="card-section" open><summary>${esc(section.title)}</summary><div class="card-table-wrap"><table><thead><tr><th>Komponent</th><th>Produkt</th><th>Antal</th><th>Lev av</th><th>Mont av</th></tr></thead><tbody>${section.rows.map(def=>{
      const row=draft.rows.find(r=>r.id===def.id);
      const owners=field=>`<select data-row-id="${esc(row.id)}" data-field="${field}" aria-label="${esc(section.title+' '+row.label+' '+(field==='delivery'?'levereras av':'monteras av'))}">${[...new Set(['',...D.OWNER_VALUES,row[field]])].map(value=>`<option value="${esc(value)}"${row[field]===value?' selected':''}>${esc(value||'–')}</option>`).join('')}</select>`;
      return `<tr data-row-id="${esc(row.id)}"><th scope="row">${esc(row.label)}</th><td class="product-cell"><div class="product-entry"><input class="product-input" data-product-input data-row-id="${esc(row.id)}" value="${esc(row.product)}" maxlength="160" autocomplete="off" aria-label="${esc(section.title+' '+row.label)} produkt" placeholder="Skriv produkt…"><button type="button" class="product-library" data-action="choose-product" data-row-id="${esc(row.id)}" aria-label="Välj från biblioteket för ${esc(row.label)}" title="Produktbibliotek"><svg aria-hidden="true"><use href="#i-search"/></svg></button><button type="button" class="clear-product" data-action="clear-product" data-row-id="${esc(row.id)}" aria-label="Ta bort ${esc(row.label)}"${row.product?'':' disabled'}>×</button></div></td><td><input data-row-id="${esc(row.id)}" data-field="quantity" type="number" min="1" max="999" step="1" value="${row.quantity}" aria-label="${esc(section.title+' '+row.label)} antal"></td><td>${owners('delivery')}</td><td>${owners('installer')}</td></tr>`;
    }).join('')}</tbody></table></div></details>`).join('');
  }
  const annotationItem = () => state?.annotations?.find(item=>item.id===selectedAnnotation);
  function renderAnnotationPanel(){
    const item=annotationItem();if(!item)selectedAnnotation=null;
    $('annotationPanel').hidden=!item;
    $('annotationTool').disabled=!state.drawing.pages.length;
    $('annotationTool').setAttribute('aria-pressed',String(currentTool==='text'));
    $('annotationTool').classList.toggle('is-active',currentTool==='text');
    $('annotationHint').hidden=!['text','arrow'].includes(currentTool);
    $('annotationHint').textContent=currentTool==='arrow'?'Tryck på dörren som pilen ska peka på.':'Tryck på ritningen för att lägga till text.';
    if(!item)return;
    const fields={annotationText:'text',annotationFontSize:'fontSize',annotationTextColor:'textColor',annotationBold:'bold',annotationFill:'fill',annotationBorderColor:'borderColor',annotationBorderWidth:'borderWidth',annotationRadius:'radius',annotationWidth:'width',annotationHeight:'height',annotationArrowColor:'arrowColor',annotationArrowWidth:'arrowWidth'};
    for(const [id,key]of Object.entries(fields)){const el=$(id);if(document.activeElement===el&&el.dataset.annotationId===item.id)continue;if(el.type==='checkbox')el.checked=item[key];else el.value=typeof item[key]==='number'?Math.round(item[key]*100)/100:item[key]??'#ffffff';el.dataset.annotationId=item.id;}
    $('annotationTransparent').checked=item.fill===null;
    $('annotationAddArrow').disabled=item.arrows.length>=20;
    $('annotationArrows').innerHTML=item.arrows.map((arrow,i)=>`<button type="button" data-remove-arrow="${esc(arrow.id)}" aria-label="Ta bort pil ${i+1}">Pil ${i+1} ×</button>`).join('');
  }
  async function selectAnnotation(id){
    if(id&& !await leaveDraft()){viewer.setAnnotationSelection(selectedAnnotation);return false;}
    selectedAnnotation=id&&state.annotations.some(item=>item.id===id)?id:null;
    if(selectedAnnotation){selected=[];setActive(null);setTool('select',{keepGesture:true});}
    if(!selectedAnnotation&&currentTool==='arrow')setTool('select');
    viewer.setAnnotationSelection(selectedAnnotation);renderAnnotationPanel();return true;
  }
  async function createAnnotation(point){
    if(!await leaveDraft())return;
    const item=D.Annotations.create(point.page,point.x,point.y,state.drawing.pages);
    await commit(next=>{next.annotations.push(item);next.project.revision++;next.project.updatedAt=new Date().toISOString();},'Texten är tillagd. Skriv i textrutan.');
    setTool('select');await selectAnnotation(item.id);
    if(focusFieldsAutomatically()){$('annotationText').focus();$('annotationText').select();}
  }
  async function changeAnnotation(id,patch){
    if(!state.annotations.some(item=>item.id===id))return;
    await commit(next=>{next.annotations=next.annotations.map(item=>item.id===id?D.Annotations.update(item,patch,next.drawing.pages):item);next.project.revision++;next.project.updatedAt=new Date().toISOString();},'Textmarkeringen är sparad.');
  }
  function queueAnnotationText(){
    const item=annotationItem(),input=$('annotationText');
    if(!item||input.dataset.annotationId!==item.id||input.value===item.text)return canvasQueue;
    const id=item.id,text=input.value;
    return runCanvas(()=>changeAnnotation(id,{text}));
  }
  async function addAnnotationArrow({id,x,y}){
    const item=state.annotations.find(value=>value.id===id);if(!item)return;
    await changeAnnotation(id,{arrows:item.arrows.concat({id:D.Annotations.uid(),x,y})});setTool('select');
  }
  async function removeAnnotation(){
    const id=selectedAnnotation;if(!id)return;
    await commit(next=>{next.annotations=next.annotations.filter(item=>item.id!==id);next.project.revision++;next.project.updatedAt=new Date().toISOString();},'Text och tillhörande pilar är borttagna. Du kan ångra ändringen.');
    selectedAnnotation=null;viewer.setAnnotationSelection(null);setTool('select');renderAnnotationPanel();
  }
  async function duplicateAnnotation(){
    const item=annotationItem();if(!item)return;
    const page=state.drawing.pages[item.page-1],copy=D.Annotations.normalize({...clone(item),id:D.Annotations.uid(),x:Math.min(1,item.x+16/page.width),y:Math.min(1,item.y+16/page.height),arrows:item.arrows.map(arrow=>({...arrow,id:D.Annotations.uid()}))},state.drawing.pages);
    await commit(next=>{next.annotations.push(copy);next.project.revision++;next.project.updatedAt=new Date().toISOString();},'Textmarkeringen är duplicerad.');await selectAnnotation(copy.id);
  }
  function bindAnnotations(){
    $('annotationTool').addEventListener('click',()=>{if(!busy&&state.drawing.pages.length){setTool('text');showView('drawing');}});
    $('annotationDone').addEventListener('click',()=>void runCanvas(async()=>{await selectAnnotation(null);setTool('select');}));
    $('annotationText').addEventListener('change',()=>void queueAnnotationText());
    $('annotationText').addEventListener('input',()=>status());
    $('annotationPanel').addEventListener('change',event=>{
      const el=event.target,key=el.dataset.annotationField,item=annotationItem();if(!key||!item)return;
      const id=item.id,value=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
      void runCanvas(()=>changeAnnotation(id,{[key]:value}));
    });
    $('annotationTransparent').addEventListener('change',()=>{const id=selectedAnnotation;if(id){const fill=$('annotationTransparent').checked?null:$('annotationFill').value;void runCanvas(()=>changeAnnotation(id,{fill}));}});
    $('annotationPanel').addEventListener('click',event=>{
      const preset=event.target.closest('[data-annotation-preset]')?.dataset.annotationPreset;
      if(preset&&selectedAnnotation){const id=selectedAnnotation,styles={white:{fill:'#ffffff',textColor:'#20352e',borderColor:'#b6c8bf',borderWidth:1},black:{fill:'#202a25',textColor:'#ffffff',borderColor:'#202a25',borderWidth:0},red:{fill:'#ffffff',textColor:'#20352e',borderColor:'#d4443d',borderWidth:2}};void runCanvas(()=>changeAnnotation(id,styles[preset]));}
      const arrowId=event.target.closest('[data-remove-arrow]')?.dataset.removeArrow;
      if(arrowId&&selectedAnnotation){const id=selectedAnnotation;void runCanvas(()=>{const item=state.annotations.find(item=>item.id===id);if(item)return changeAnnotation(id,{arrows:item.arrows.filter(arrow=>arrow.id!==arrowId)});});}
    });
    $('annotationAddArrow').addEventListener('click',()=>{if(annotationItem()){setTool('arrow');message('Tryck på ritningen där pilspetsen ska vara. Dra sedan pilspetsen för att finjustera.');}});
    $('annotationDelete').addEventListener('click',()=>void runCanvas(removeAnnotation));
    $('annotationDuplicate').addEventListener('click',()=>void runCanvas(duplicateAnnotation));
  }

  function renderSelection() {
    const items=selectedPlacements(), first=items[0];
    $('selectedInfo').textContent=!first?'Ingen stämpel vald':items.length>1?`${items.length} stämplar valda`:`${first.code} · sida ${first.page}${first.locked?' · Låst':''}`;
    for(const [id,field,multiplier]of [['selectionX','x',100],['selectionY','y',100],['selectionWidth','width',1],['selectionHeight','height',1],['selectionRotation','rotation',1]]){
      $(id).value=first?Math.round(first[field]*multiplier*1000)/1000:'';
      $(id).disabled=!first||first.locked||(items.length>1&&['x','y'].includes(field));
    }
    $('selectionLocked').checked=!!first?.locked;$('selectionLocked').disabled=!first;$('applySelection').disabled=!first||busy;
    $('lockSelection').setAttribute('aria-label',first?.locked?'Lås upp valda':'Lås valda');
    const scope=state.preferences.sizeScope;
    $('sizeScope').value=scope;
    const targets=first?D.resizeTargets(state,first.id,{scope}):[];
    $('sharedSizeHint').textContent=first?(scope==='single'?'Storlek för endast vald stämpel.':`${targets.length} ${state.stencils[first.stencilId]?.kind==='card'&&scope==='doors'?'dörrstämplar':'stämplar'} får samma storlek. Nya stämplar följer storleken.`):'Välj en stämpel och dra ett runt handtag för att ändra storlek.';
  }
  function renderTools() {
    const tools=state.preferences.toolbarTools;
    for(const id of D.TOOLBAR_TOOLS){$(id).hidden=!tools.includes(id);const option=document.querySelector(`[data-tool-option="${id}"]`);if(option)option.checked=tools.includes(id);}
    $('autoOpenCard').checked=state.preferences.autoOpenCard;
  }
  function renderPositions() {
    if(!$('placementsList'))return;
    const query=($('placementSearch')?.value||'').toUpperCase();
    $('placementsList').innerHTML=state.placements.filter(p=>!query||p.code.includes(query)||p.note.toUpperCase().includes(query)).map(p=>`<button type="button" data-focus-id="${esc(p.id)}" class="placement-list-item${selected.includes(p.id)?' is-active':''}"><strong>${esc(p.code)}</strong><small>Sida ${p.page}${p.locked?' · Låst':''}</small></button>`).join('')||'<p class="empty-note">Inga placeringar.</p>';
  }
  function renderAll() {
    $('projectName').value=state.project.name;renderAnnotationPanel();renderLibrary();renderCard();renderSelection();renderPositions();renderTools();renderMaterials();
    viewer?.setStencil(currentStencil);viewer?.setProject(state,{selectedIds:selected});viewer?.setAnnotationSelection(selectedAnnotation);status();
  }
  async function inspectOriginal(bytes) {
    if(bytes.byteLength>50*1024*1024)throw Error('Originalritningen får vara högst 50 MB.');
    pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
    const task=pdfjsLib.getDocument({data:bytes.slice()}), pdf=await task.promise;
    try{
      if(pdf.numPages>200)throw Error('Ritningen får innehålla högst 200 sidor.');
      const pages=[];
      for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),v=page.getViewport({scale:1});pages.push({width:v.width,height:v.height,rotation:page.rotate,view:[...page.view],transform:[...v.transform]});page.cleanup();}
      return {pages};
    }finally{await pdf.destroy();}
  }
  function sameMetadata(expected,actual) {
    if(expected.length!==actual.length)return false;
    return expected.every((p,i)=>['width','height','rotation'].every(k=>Math.abs(p[k]-actual[i][k])<.0001)&&['view','transform'].every(k=>p[k].length===actual[i][k].length&&p[k].every((n,j)=>Math.abs(n-actual[i][k][j])<.0001)));
  }
  async function verifySource(project,bytes) {
    if(!project.drawing.pages.length){if(bytes.length)throw Error('Projektfilen har en ritning som saknar siduppgifter.');return;}
    const actual=await inspectOriginal(bytes);
    if(!sameMetadata(project.drawing.pages,actual.pages))throw Error('Projektfilens siduppgifter stämmer inte med originalritningen. Det nuvarande projektet har behållits.');
  }
  async function replaceProject(next,bytes,text) {
    const valid=libraryProject(next);await verifySource(valid,bytes);
    if(damagedStore){const answer=await ask({title:'Ersätt den oläsbara lokala kopian?',text:'Den tidigare kopian gick inte att öppna. Detta sparar det nya projektet i stället.',accept:'Öppna och spara'});if(answer!=='accept')return false;}
    await S.save(valid,bytes);
    materialTimeEpoch++;materialTimeDrafts.clear();pendingMaterialTimes.clear();materialStructureKey='';
    state=valid;original=bytes.slice();selected=[];selectedAnnotation=null;undoStack=[];redoStack=[];currentPage=1;storageOk=true;damagedStore=false;materialCacheKey='';
    currentStencil=firstLibraryStencil();setActive(state.cards.GS1?'GS1':Object.keys(state.cards).sort(natural)[0]||null);revealStencil(state.stencils[currentStencil]);
    makeViewer();if(original.length)await viewer.open(original);viewer.setProject(state,{selectedIds:selected});renderAll();showView('drawing');message(text);
  }
  async function openFile(file) {
    if(!file)return;
    if(file.size>80*1024*1024)throw Error('Projektfilen får vara högst 80 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    const isPdf=new TextDecoder().decode(bytes.slice(0,5))==='%PDF-';
    let packed;
    if(isPdf)packed=await Proj2PDF.inspect(bytes);
    else packed=await S.unpack(bytes);
    if(packed){
      await verifySource(packed.state,packed.original);
      if(!await leaveDraft())return;
      const answer=await ask({title:'Öppna det sparade projektet?',text:`${packed.state.project.name}. Det ersätter projektet som visas. Spara en projektkopia först om du vill behålla det nuvarande.`,accept:'Öppna projekt'});
      if(answer!=='accept')return;
      await replaceProject(packed.state,packed.original,'Projektet är öppnat med sin originalritning, sina stämplar och sparade dörrkort.');return;
    }
    const metadata=await inspectOriginal(bytes);
    if(!await leaveDraft())return;
    if(state.drawing.pages.length||state.placements.length||dirty){
      const answer=await ask({title:'Byt ritningsunderlag?',text:'Nuvarande placeringar ersätts. Dina sparade dörrkort, produkter och stenciler behålls. Spara en projektfil först om du vill behålla hela det tidigare projektet.',accept:'Använd denna ritning'});
      if(answer!=='accept')return;
    }
    const next=clone(state);next.drawing={name:file.name,pages:metadata.pages};next.placements=[];next.project.revision++;next.project.updatedAt=new Date().toISOString();
    if(!state.drawing.pages.length&&state.project.name==='Nytt projekt')next.project.name=file.name.replace(/\.pdf$/i,'').slice(0,120)||'Nytt projekt';
    await replaceProject(next,bytes,'Ritningen är öppnad. Välj en stencil och klicka eller dra den till en dörr.');
  }
  function productDefinition(){return definitions().find(r=>r.id===productRow);}
  function renderProducts(){const def=productDefinition();$('productList').innerHTML=L.searchProducts(library,state,def.category,$('productSearch').value).map(p=>`<button type="button" class="product-choice" data-product-id="${esc(p.id)}"><strong>${esc(p.name)}</strong><span>${esc(p.description)}</span></button>`).join('')||'<p class="empty-note">Ingen produkt hittades. Lägg till en egen nedan.</p>';}
  function openProducts(rowId){productSuggest?.close();productRow=rowId;const def=productDefinition();$('productTitle').textContent=def.section+' · '+def.label;$('productSearch').value='';$('customProductName').value=draft?.rows.find(row=>row.id===rowId)?.product||'';$('customProductCategory').innerHTML=`<option value="${esc(def.category)}">${esc(L.categories(library).find(category=>category.id===def.category)?.label||def.label)}</option>`;$('customProductCategory').disabled=true;$('productMessage').textContent='';renderProducts();$('productDialog').showModal();if(focusFieldsAutomatically())$('productSearch').focus();}
  function chooseProduct(name){draft.rows.find(r=>r.id===productRow).product=name;draftChanged();renderCard();$('productDialog').close();}
  function stencilDialog(id=null){
    editingStencil=id;
    const st=id?state.stencils[id]:currentCategory==='other'?{...D.defaultStencil('DA'),id:'EGEN1',code:'EGEN1',name:'EGEN1',productType:'other',category:'Övrigt'}:D.defaultStencilFor(state,'EGEN1');
    $('stencilTitle').textContent=id?'Redigera stencil':'Skapa egen stencil';
    const fields={stencilCode:'code',stencilName:'name',stencilKind:'kind',stencilProductType:'productType',stencilShape:'shape',stencilFill:'fill',stencilStroke:'stroke',stencilTextColor:'textColor',stencilWidth:'width',stencilHeight:'height',stencilFontSize:'fontSize'};
    for(const [element,key]of Object.entries(fields))$(element).value=id||!['code','name'].includes(key)?st[key]:'';
    if(!id&&st.kind==='card')$('stencilCode').value=D.suggestStencilCode(state,activeCode||'GS1');
    $('stencilCategory').dataset.section='';stencilGroupOptions(st.kind,id?L.groupFor(library,st):currentCardGroup);
    $('stencilCustomCategory').value='';$('stencilCustomCategoryField').hidden=true;
    $('stencilCode').disabled=!!id;$('stencilMessage').textContent='';previewStencil();$('stencilDialog').showModal();
  }
  function stencilValues(){
    const kind=$('stencilKind').value,old=state.stencils[editingStencil];
    return {id:editingStencil||D.normalizeCode($('stencilCode').value),code:D.normalizeCode($('stencilCode').value),name:$('stencilName').value.trim()||$('stencilCode').value.trim(),kind,productType:kind==='card'?'none':$('stencilProductType').value,category:old?.kind===kind?D.stencilCategory(old):kind==='card'?'Dörrkort':'Övrigt',shape:$('stencilShape').value,fill:$('stencilFill').value,stroke:$('stencilStroke').value,textColor:$('stencilTextColor').value,width:Number($('stencilWidth').value),height:Number($('stencilHeight').value),fontSize:Number($('stencilFontSize').value)};
  }
  function stencilGroupOptions(kind,preferred){
    const section=kind==='card'?'cards':'other',select=$('stencilCategory');
    if(select.dataset.section===section&&!preferred)return;
    const groups=L.groupsFor(library,section),value=preferred||currentCardGroup;
    select.innerHTML=groups.map(group=>`<option value="${esc(group.id)}">${esc(group.name)}</option>`).join('');
    select.value=groups.some(group=>group.id===value)?value:groups[0]?.id||'';
    select.dataset.section=section;$('stencilCategoryField').hidden=false;
  }
  function previewStencil(){
    const hasCard=$('stencilKind').value==='card';
    stencilGroupOptions($('stencilKind').value);
    $('stencilProductType').disabled=hasCard;$('stencilProductType').closest('label').hidden=hasCard;if(hasCard)$('stencilProductType').value='none';
    const code=$('stencilCode').value||'EGEN',shape=$('stencilShape').value;
    const width=Math.max(6,Math.min(500,Number($('stencilWidth').value)||60)),height=Math.max(6,Math.min(500,Number($('stencilHeight').value)||26)),font=Math.max(4,Math.min(72,Number($('stencilFontSize').value)||11)),scale=Math.min(2,260/(width+8),120/(height+8));
    const color=value=>/^#[a-f0-9]{6}$/i.test(value)?value:'#f5d76b';
    const measure=document.createElement('canvas').getContext('2d');measure.font=`700 ${font}px Arial`;
    const textSize=Math.min(font,height*.5,font*Math.max(width*.5,width-8)/Math.max(1,measure.measureText(code).width));
    const fill=color($('stencilFill').value),stroke=color($('stencilStroke').value);
    const symbol=shape==='oval'?`<ellipse cx="${width/2}" cy="${height/2}" rx="${width/2}" ry="${height/2}" fill="${fill}" stroke="${stroke}"/>`:`<rect x="0" y="0" width="${width}" height="${height}" rx="${shape==='square'?1:3}" fill="${fill}" stroke="${stroke}"/>`;
    $('stencilPreview').innerHTML=`<svg viewBox="-4 -4 ${width+8} ${height+8}" width="${(width+8)*scale}" height="${(height+8)*scale}" role="img" aria-label="${esc(code)}"><g stroke-width=".8">${symbol}<text x="${width/2}" y="${height/2}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${textSize}" fill="${color($('stencilTextColor').value)}" stroke="none">${esc(code)}</text></g></svg>`;
  }
  const decimal = value => new Intl.NumberFormat('sv-SE',{maximumFractionDigits:6,useGrouping:false}).format(value);
  const workTime = minutes => minutes===null?'—':Proj2Materials.formatDuration(minutes);
  function materialTimeParts(minutes){
    if(minutes===null)return {hours:'',minutes:''};
    const hours=Math.floor(minutes/60);
    return {hours:String(hours),minutes:decimal(Number((minutes-hours*60).toFixed(6)))};
  }
  function readMaterialTime(input){
    const row=input.closest('[data-material-key]');
    return {key:row.dataset.materialKey,projectId:state.project.id,epoch:materialTimeEpoch,row,input,
      hours:row.querySelector('[data-time-part="hours"]').value.trim(),
      minutes:row.querySelector('[data-time-part="minutes"]').value.trim()};
  }
  const sameMaterialTime = (a,b) => a&&b&&a.projectId===b.projectId&&a.epoch===b.epoch&&a.hours===b.hours&&a.minutes===b.minutes;
  async function changeMaterialTime(edit){
    const fields=[...edit.row.querySelectorAll('[data-material-time]')];
    for(const field of fields)field.removeAttribute('aria-invalid');
    const hourValid=edit.hours===''||/^\d+$/.test(edit.hours);
    const minuteValid=edit.minutes===''||/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(edit.minutes);
    const hours=edit.hours===''?0:Number(edit.hours),minutes=edit.minutes===''?0:Number(edit.minutes.replace(',','.'));
    const number=edit.hours===''&&edit.minutes===''?null:Number((hours*60+minutes).toFixed(6));
    if(!hourValid||!minuteValid||!Number.isSafeInteger(hours)||!Number.isFinite(minutes)||number!==null&&(!Number.isFinite(number)||number<0||number>100000)){
      for(const field of fields)if(!hourValid&&field.dataset.timePart==='hours'||!minuteValid&&field.dataset.timePart==='minutes'||hourValid&&minuteValid)field.setAttribute('aria-invalid','true');
      edit.error=true;
      throw Error('Ange hela timmar och minuter med positiva tal eller 0, högst 100000 minuter sammanlagt per styck. Lämna båda tomma om tiden saknas.');
    }
    edit.error=false;
    if(!Proj2Materials.build(state).rows.some(row=>row.key===edit.key))throw Error('Produktraden har ändrats. Uppdatera materiallistan.');
    if((state.preferences.materialTimes[edit.key]??null)===number)return true;
    return commit(next=>D.setMaterialTime(next,edit.key,number),'Tidberäkningen är sparad.');
  }
  function queueMaterialTime(input){
    const edit=readMaterialTime(input);
    if(sameMaterialTime(pendingMaterialTimes.get(edit.key),edit))return;
    materialTimeDrafts.set(edit.key,edit);
    pendingMaterialTimes.set(edit.key,edit);materialTimePending++;
    let success=false;
    materialTimeQueue=materialTimeQueue.then(async()=>{
      while(busy)await operationSettled;
      if(state.project.id!==edit.projectId||materialTimeEpoch!==edit.epoch)return;
      success=await run(()=>changeMaterialTime(edit))!==false;
      if(!success)edit.error=true;
    }).catch(error=>{edit.error=true;message(error?.message||'Tiden kunde inte sparas.',true);}).finally(()=>{
      if(pendingMaterialTimes.get(edit.key)===edit)pendingMaterialTimes.delete(edit.key);
      if(success&&materialTimeDrafts.get(edit.key)===edit)materialTimeDrafts.delete(edit.key);
      materialTimePending--;
      if(state.project.id===edit.projectId&&materialTimeEpoch===edit.epoch)renderMaterials({force:true});
    });
  }
  function afterMaterialTimes(task){
    queueAnnotationText();
    const epoch=materialTimeEpoch;
    // Capture even a field that is still focused when an export is requested.
    for(const edit of materialTimeDrafts.values()){
      if(edit.projectId===state.project.id&&!sameMaterialTime(pendingMaterialTimes.get(edit.key),edit))queueMaterialTime(edit.input);
    }
    return Promise.all([materialTimeQueue,canvasQueue]).then(()=>run(async()=>{
      if(epoch!==materialTimeEpoch)throw Error('Projektet har bytts. Exportera det öppnade projektet igen.');
      const keys=new Set(Proj2Materials.build(state).rows.map(row=>row.key));
      if([...materialTimeDrafts.values()].some(edit=>edit.projectId===state.project.id&&keys.has(edit.key)))throw Error('Rätta eller spara den markerade tiden före export.');
      return task();
    }));
  }
  function renderMaterials({force=false}={}){
    if(materialTimeProject!==state.project.id){materialTimeProject=state.project.id;materialTimeDrafts.clear();}
    const query=fold($('materialSearch').value.trim());
    const key=state.project.id+':'+state.project.revision+':'+query;
    if(!force&&key===materialCacheKey)return;
    materialReport=Proj2Materials.build(state);materialCacheKey=key;
    const rows=materialReport.rows.filter(row=>fold(row.category+' '+row.component+' '+row.product+' '+row.sources.map(s=>s.code).join(' ')).includes(query));
    $('materialSummary').textContent=`${materialReport.rows.length} produktrader · ${materialReport.totalQuantity} st`;
    $('materialTotalTime').textContent=materialReport.hasEstimates?workTime(materialReport.totalMinutes):'—';
    $('materialUntimed').textContent=!materialReport.rows.length?'Ange timmar och minuter per styck. Tiderna gäller det här projektet.':materialReport.untimedRows?`${materialReport.untimedRows} produktrader saknar tid. Summan visar beräknade rader i hela projektet.`:'Alla produktrader är tidsberäknade. Summan gäller hela projektet.';
    const warnings=[];
    if(materialReport.excludedCards.length)warnings.push(`${materialReport.excludedCards.length} kort utanför GS-serien ingår inte i material eller tid.`);
    if(materialReport.unresolved.length)warnings.push(`${materialReport.unresolved.length} markeringar har ofullständigt underlag.`);
    if(materialReport.unplacedCards.length)warnings.push(`${materialReport.unplacedCards.length} sparade dörrkort saknar placerade dörrar och ingår inte i antalet.`);
    $('materialWarnings').textContent=warnings.join(' ');
    const structureKey=JSON.stringify([state.project.id,query,rows.map(row=>[row.key,row.quantity,row.sources])]);
    if(structureKey!==materialStructureKey){
      materialStructureKey=structureKey;
      $('materialRows').innerHTML=rows.map(row=>{
      const sources=new Map();for(const source of row.sources)sources.set(source.code,(sources.get(source.code)||0)+source.quantity);
      const underlag=[...sources].map(([code,quantity])=>code+': '+quantity).join(' · ');
      const edit=materialTimeDrafts.get(row.key),parts=edit?.projectId===state.project.id?edit:materialTimeParts(row.timePerUnit),label=esc(row.component+' '+row.product);
      const fields='<span class="material-time-fields" role="group" aria-label="Tid per styck, '+label+'"><label><input type="text" inputmode="numeric" autocomplete="off" maxlength="16" data-material-time="'+esc(row.key)+'" data-time-part="hours" value="'+esc(parts.hours)+'"'+(parts.error?' aria-invalid="true"':'')+' aria-label="Timmar per styck, '+label+'" placeholder="—"><span>tim</span></label><label><input type="text" inputmode="decimal" autocomplete="off" maxlength="16" data-material-time="'+esc(row.key)+'" data-time-part="minutes" value="'+esc(parts.minutes)+'"'+(parts.error?' aria-invalid="true"':'')+' aria-label="Minuter per styck, '+label+'" placeholder="—"><span>min</span></label></span>';
      return `<tr data-material-key="${esc(row.key)}"><td data-label="Grupp">${esc(row.category)}</td><td data-label="Komponent">${esc(row.component)}</td><td data-label="Produkt">${esc(row.product)}</td><td data-label="Antal" class="quantity-column">${row.quantity}</td><td data-label="Tid per styck" class="unit-time-column">${fields}</td><td data-label="Tid" class="total-time-column">${esc(workTime(row.timeMinutes))}</td><td data-label="Underlag">${esc(underlag)}</td></tr>`;
      }).join('');
    }else{
      const byKey=new Map(rows.map(row=>[row.key,row]));
      for(const tr of $('materialRows').children){
        const row=byKey.get(tr.dataset.materialKey);
        if(!row)continue;
        const edit=materialTimeDrafts.get(row.key),values=edit?.projectId===state.project.id?edit:materialTimeParts(row.timePerUnit);
        for(const input of tr.querySelectorAll('[data-material-time]')){
          // Keep the whole pair stable while either field is being edited.
          if(document.activeElement!==input&&(edit||!tr.contains(document.activeElement)))input.value=values[input.dataset.timePart];
          if(edit?.error)input.setAttribute('aria-invalid','true');else input.removeAttribute('aria-invalid');
        }
        tr.querySelector('.total-time-column').textContent=workTime(row.timeMinutes);
      }
    }
    $('materialEmpty').hidden=!!rows.length;
    $('materialEmpty').textContent=query?'Ingen produkt matchar sökningen.':'Fyll i produkter på ett GS-dörrkort och placera dess stämpel.';
    $('materialPdf').disabled=(busy&&!materialTimePending)||!materialReport.rows.length;$('materialCsv').disabled=(busy&&!materialTimePending)||!materialReport.rows.length;
  }
  async function exportMaterialPDF(){
    if(!await leaveDraft())return;
    const report=Proj2Materials.build(state);
    if(!report.rows.length)throw Error('Lägg till produkter och placeringar för att skapa en materiallista.');
    const bytes=await Proj2Materials.pdf(report);download(bytes,filename()+'-materiallista.pdf','application/pdf');message('Materiallistan är klar som PDF för utskrift.');
  }
  function closeCardPreview(){
    cardPreviewRequest++;cardPreviewViewer?.destroy();cardPreviewViewer=null;
    cardPreviewBytes=null;cardPreviewCode='';
    if($('cardPreviewDialog').open)$('cardPreviewDialog').close();
  }
  async function openCardPreview(){
    if(!draft)return;
    const request=++cardPreviewRequest,code=activeCode,card=clone(draft),snapshot=D.validate(state);
    viewer?.cancelGesture?.();productSuggest?.close();closeContext();
    const bytes=await Proj2PDF.buildCardPreview(snapshot,code,card);
    if(request!==cardPreviewRequest)return;
    cardPreviewBytes=bytes;cardPreviewCode=code;
    $('cardPreviewTitle').textContent='Dörrkort '+code;
    $('previewPdfDownload').disabled=true;
    for(const id of ['previewZoomIn','previewZoomOut','previewZoomFit'])$(id).disabled=true;
    $('cardPreviewDialog').showModal();
    const preview=Proj2Canvas.create({host:$('cardPreviewHost'),onError:error=>{
      if(request===cardPreviewRequest){closeCardPreview();message(error?.message||'Dörrkortet kunde inte visas.',true);}
    },onView:view=>{if(request===cardPreviewRequest)$('previewZoomLevel').textContent=Math.round((view.zoom||1)*100)+' %';}});
    cardPreviewViewer=preview;preview.setTool('pan');
    const region=$('cardPreviewHost').querySelector('.p2-canvas-scroller');
    region?.setAttribute('aria-label','PDF-förhandsvisning av dörrkortet. Panorera och zooma med mushjul eller två fingrar.');
    try{
      await preview.open(bytes);
      if(request!==cardPreviewRequest)return;
      $('previewPdfDownload').disabled=false;
      for(const id of ['previewZoomIn','previewZoomOut','previewZoomFit'])$(id).disabled=false;
    }catch(error){if(request===cardPreviewRequest){closeCardPreview();throw error;}}
  }
  function download(bytes,name,type){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  const filename=()=>state.project.name.replace(/[^a-zA-Z0-9åäöÅÄÖ_-]+/g,'-').slice(0,70)||'projektering';
  async function exportPDF(mode){if(!await leaveDraft())return;message('Skapar sökbar PDF …');const snapshot=D.validate(state),bytes=await Proj2PDF.build(snapshot,original,{mode});download(bytes,filename()+'-'+(mode==='combined'?'ritning-och-dorrkort':mode==='drawing'?'ritning':'dorrkort')+'.pdf','application/pdf');message(mode==='combined'?'Ritning och sparade dörrkort finns i samma PDF. Den kan öppnas här igen för fortsatt projektering.':'PDF:en är skapad. Den kan öppnas här igen för fortsatt projektering.');}
  function csvCell(value){let text=String(value??'');if(/^[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
  async function exportSchedule(){
    if(!await leaveDraft())return;
    const report=Proj2Materials.build(state);
    download(Proj2Materials.csv(report),filename()+'-materiallista.csv','text/csv;charset=utf-8');message('Materiallistan är skapad med produkter och tidberäkning från GS-dörrkorten.');
  }
  async function travelHistory(backward){
    if(!await leaveDraft())return;const from=backward?undoStack:redoStack,to=backward?redoStack:undoStack;if(!from.length)return;
    const next=libraryProject(from[from.length-1]);next.project.revision=state.project.revision+1;next.project.updatedAt=new Date().toISOString();
    await S.save(D.validate(next),original);to.push(clone(state));from.pop();
    materialTimeEpoch++;materialTimeDrafts.clear();pendingMaterialTimes.clear();materialStructureKey='';
    state=next;selected=selected.filter(id=>state.placements.some(p=>p.id===id));
    setActive(activeCode&&state.cards[activeCode]?activeCode:Object.keys(state.cards).sort(natural)[0]||null);renderAll();message(backward?'Ändringen är ångrad.':'Ändringen är återställd.');
  }
  async function paste(point=null){if(!clipboard.length)return;const dx=point?point.x-clipboard[0].x:.015,dy=point?point.y-clipboard[0].y:.015;let added=[];await commit(next=>{for(const p of clipboard){if(!next.stencils[p.stencilId])throw Error('Kopians stencil har tagits bort. Välj en stencil igen.');const input={...p,id:undefined,page:point?.page||currentPage,x:p.x+dx,y:p.y+dy,locked:false};if(D.isProductStencil(next.stencils[p.stencilId]))input.equipment={...D.equipmentFor(p),objectNumber:''};added.push(D.addPlacement(next,input));}},'Kopiorna är placerade.');selected=added.map(p=>p.id);renderAll();}
  async function duplicate(){if(selectedAnnotation)return duplicateAnnotation();if(!selected.length)return;let added;await commit(next=>{added=D.duplicatePlacements(next,selected);},'Valda stämplar är kopierade.');selected=added.map(p=>p.id);renderAll();}
  async function lockSelection(){const items=selectedPlacements();if(!items.length)return;const locked=!items.every(p=>p.locked);await commit(next=>{for(const p of items)D.updatePlacement(next,p.id,{locked});},locked?'Valda stämplar är låsta.':'Valda stämplar är upplåsta.');}
  async function rotateSelection(angle){
    if(!selected.length)return;
    await commit(next=>{for(const p of selectedPlacements())D.updatePlacement(next,p.id,{rotation:(p.rotation+angle+360)%360});},'Stämplarna är roterade.');
  }
  function closeContext({restoreFocus=false}={}){
    const menu=$('stampContextMenu');if(!menu||menu.hidden)return;
    menu.hidden=true;if(restoreFocus&&contextReturnFocus?.isConnected)contextReturnFocus.focus({preventScroll:true});
  }
  async function openContext(input){
    const ids=input.ids||[];
    await selectIds(ids);
    if(ids.some(id=>!selected.includes(id))||(!ids.length&&selected.length))return;
    contextPoint={page:input.page,x:input.x,y:input.y};contextReturnFocus=document.activeElement;
    const items=selectedPlacements(),first=items[0],hasCard=first&&state.stencils[first.stencilId]?.kind==='card',locked=items.some(p=>p.locked);
    const onPage=!!state.drawing.pages[input.page-1]&&input.x>=0&&input.x<=1&&input.y>=0&&input.y<=1;
    const available={equipment:false,openCard:!!hasCard,duplicate:!!first,copy:!!first,paste:!!clipboard.length&&onPage,resize:!!first&&!locked,editStencil:!!first,lock:!!first,delete:!!first&&!locked,newStencil:true,newCard:true,place:onPage&&!!state.stencils[currentStencil],fit:!!state.drawing.pages.length};
    const menu=$('stampContextMenu');
    for(const button of menu.querySelectorAll('[data-context-action]')){
      button.hidden=!available[button.dataset.contextAction];button.disabled=false;
      if(button.dataset.contextAction==='lock')(button.querySelector('span')||button).textContent=items.every(p=>p.locked)?'Lås upp':'Lås stämplar';
    }
    menu.hidden=false;menu.style.left='0px';menu.style.top='0px';
    const rect=menu.getBoundingClientRect();
    menu.style.left=Math.max(8,Math.min(input.clientX,innerWidth-rect.width-8))+'px';
    menu.style.top=Math.max(8,Math.min(input.clientY,innerHeight-rect.height-8))+'px';
    menu.querySelector('button:not([hidden]):not(:disabled)')?.focus({preventScroll:true});
  }
  async function contextAction(action,point){
    if(action==='openCard'){if(selected[0])await activate({id:selected[0]});}
    else if(action==='duplicate')await duplicate();
    else if(action==='copy'){clipboard=clone(selectedPlacements());message(clipboard.length+' stämplar kopierade.');}
    else if(action==='paste')await paste(point);
    else if(action==='resize'){showView('drawing');$('selectionWidth').closest('details').open=true;$('selectionWidth').focus();$('selectionWidth').select();message('Dra ett runt handtag på stämpeln, eller ange bredd och höjd.');}
    else if(action==='editStencil'&&state.stencils[currentStencil])stencilDialog(currentStencil);
    else if(action==='lock')await lockSelection();
    else if(action==='delete')await removePositions();
    else if(action==='newStencil')stencilDialog();
    else if(action==='newCard')await newCard();
    else if(action==='place'&&point){setTool('place');await place({...point,stencilId:currentStencil});}
    else if(action==='fit')viewer.fit();
  }
  async function newCard(copyFrom=null){
    if(!await leaveDraft())return;const value=await askText(copyFrom?'Kopiera dörrkort':'Nytt dörrkort','Ny beteckning',copyFrom?D.suggestForkCode(state,copyFrom):D.suggestCardCode(state,activeCode||'GS1'));if(value===null)return;
    const code=D.normalizeCode(value),stencil=stencilForCode(code);if(stencil?.kind==='symbol')throw Error('Den beteckningen används av en symbol. Välj en annan beteckning för dörrkortet.');
    await commit(next=>{if(copyFrom)D.copyCard(next,copyFrom,code);else D.ensureCard(next,code);if(!Object.values(next.stencils).some(s=>s.code===code))D.addStencil(next,{...D.defaultStencilFor(next,code),id:code,code,kind:'card'});},`${code} är skapat.`);
    setActive(code);currentStencil=stencilForCode(code).id;renderAll();showView('cards');
  }
  async function deleteCard(){
    if(!activeCode||!state.cards[activeCode])return;if(!await leaveDraft())return;
    const code=activeCode,used=state.placements.filter(p=>p.code===code);if(used.some(p=>p.locked))throw Error('Lås upp kortets placerade stämplar innan du tar bort dörrkortet.');
    const answer=await ask({title:`Ta bort ${code}?`,text:used.length?`Dörrkortet och dess ${used.length} placeringar tas bort. Du kan ångra ändringen.`:'Det sparade dörrkortet tas bort. Du kan ångra ändringen.',accept:'Ta bort dörrkort'});
    if(answer!=='accept')return;await commit(next=>D.removeCard(next,code,{cascade:true}),`${code} är borttaget.`);setActive(Object.keys(state.cards).sort(natural)[0]||null);renderAll();
  }
  function bind(){
    bindAnnotations();
    document.addEventListener('pointerdown',()=>{suppressCardClickUntil=0;},{capture:true});
    document.addEventListener('touchstart',()=>{suppressCardClickUntil=0;},{capture:true,passive:true});
    document.addEventListener('click',event=>{if(event.detail>0&&performance.now()<suppressCardClickUntil){suppressCardClickUntil=0;event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
    if(!$('stencilMessage')){const p=document.createElement('p');p.id='stencilMessage';p.className='dialog-message';p.setAttribute('role','status');$('stencilPreview').after(p);}
    $('stampSearch').addEventListener('input',renderLibrary);$('cardSearch').addEventListener('input',renderLibrary);
    $('manageLibrary').addEventListener('click',()=>{viewer?.cancelGesture?.();productSuggest?.close();closeContext();});
    libraryUI=Proj2LibraryUI.create({button:$('manageLibrary'),getLibrary:()=>library,getProject:()=>clone(state),save:persistLibrary,data:D});
    productSuggest=Proj2Suggest.create({host:$('cardRows'),enabled:()=>!!draft&&!busy,search:(rowId,query)=>{
      const definition=definitions().find(row=>row.id===rowId);return definition?L.searchProducts(library,state,definition.category,query):[];
    },onInput:(rowId,value)=>updateTypedProduct(rowId,value),onPick:(rowId,product)=>updateTypedProduct(rowId,product.name)});
    $('stencilCategories').addEventListener('click',event=>{const button=event.target.closest('[data-stencil-category]');if(!button||busy)return;currentCategory=button.dataset.stencilCategory;$('stampSearch').value='';renderLibrary();});
    $('stencilCardGroups').addEventListener('click',event=>{const button=event.target.closest('[data-card-group]');if(!button||busy)return;currentCardGroup=button.dataset.cardGroup;$('stampSearch').value='';renderLibrary();});
    $('materialSearch').addEventListener('input',renderMaterials);
    $('materialRows').addEventListener('input',event=>{
      const input=event.target.closest('[data-material-time]');if(!input)return;
      const edit=readMaterialTime(input);
      if(!sameMaterialTime(materialTimeDrafts.get(edit.key),edit))materialTimeDrafts.set(edit.key,edit);
    });
    $('materialRows').addEventListener('focusout',event=>{
      const row=event.target.closest('[data-material-key]');if(!row)return;
      requestAnimationFrame(()=>{if(!row.contains(document.activeElement))renderMaterials({force:true});});
    });
    $('materialRows').addEventListener('change',event=>{
      const input=event.target.closest('[data-material-time]');if(!input)return;
      queueMaterialTime(input);
    });
    $('materialPdf').addEventListener('click',()=>void afterMaterialTimes(exportMaterialPDF));$('materialCsv').addEventListener('click',()=>void afterMaterialTimes(exportSchedule));
    $('materialRefresh')?.addEventListener('click',()=>void run(async()=>{if(await leaveDraft())renderMaterials({force:true});}));
    document.querySelectorAll('.project-menu button').forEach(button=>button.addEventListener('click',()=>{button.closest('details').open=false;}));
    document.addEventListener('click',event=>document.querySelectorAll('.project-menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;}));
    document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.project-menu[open]').forEach(menu=>menu.open=false);});
    document.addEventListener('pointerdown',event=>{if(!$('stampContextMenu').contains(event.target))closeContext();if(!event.target.closest('#toolMenu'))$('toolMenu').open=false;});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape')$('toolMenu').open=false;
      const menu=$('stampContextMenu');if(menu.hidden)return;
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeContext({restoreFocus:true});return;}
      const buttons=[...menu.querySelectorAll('button:not([hidden]):not(:disabled)')];
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();const index=buttons.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();}
      else if(event.key==='Tab')closeContext();
    });
    window.addEventListener('resize',()=>closeContext());
    $('drawingHost').addEventListener('wheel',()=>closeContext(),{passive:true});
    $('stampContextMenu').addEventListener('click',event=>{const button=event.target.closest('[data-context-action]');if(!button||button.disabled)return;const point=contextPoint;closeContext();void run(()=>contextAction(button.dataset.contextAction,point));});
    for(const option of document.querySelectorAll('[data-tool-option]'))option.addEventListener('change',()=>void run(async()=>{
      const tools=[...document.querySelectorAll('[data-tool-option]:checked')].map(input=>input.dataset.toolOption);
      await commit(next=>D.setPreferences(next,{toolbarTools:tools}),'Verktygsraden är sparad.',{history:false});
    }));
    $('autoOpenCard').addEventListener('change',()=>void run(()=>commit(next=>D.setPreferences(next,{autoOpenCard:$('autoOpenCard').checked}),'Visning av dörrkort är sparad.',{history:false})));
    $('sizeScope').addEventListener('change',()=>void run(()=>commit(next=>D.setPreferences(next,{sizeScope:$('sizeScope').value}),'Valet för gemensam storlek är sparat.',{history:false})));
    $('stampList').addEventListener('click',e=>{const b=e.target.closest('[data-stencil-id]');if(b)void run(()=>chooseStencil(b.dataset.stencilId));});
    $('stampList').addEventListener('dragstart',e=>{const b=e.target.closest('[data-stencil-id]');if(!b||busy){e.preventDefault();return;}currentStencil=b.dataset.stencilId;viewer.setStencil(currentStencil);e.dataTransfer.setData('application/x-tillsyno-stencil',currentStencil);e.dataTransfer.setData('text/plain',currentStencil);e.dataTransfer.effectAllowed='copy';});
    $('cardList').addEventListener('click',e=>{const b=e.target.closest('[data-card-code]');if(b)void run(async()=>{const code=b.dataset.cardCode;if(code!==activeCode&&!await leaveDraft())return;setActive(code);const st=stencilForCode(code);if(st)currentStencil=st.id;renderAll();showView('cards');});});
    $('forkCard').addEventListener('click',()=>void run(forkSelectedCard));
    $('previewCard').addEventListener('click',()=>void run(openCardPreview));
    $('closeCardPreview').addEventListener('click',closeCardPreview);
    $('cardPreviewDialog').addEventListener('cancel',event=>{event.preventDefault();closeCardPreview();});
    $('cardPreviewDialog').addEventListener('close',()=>{if(!$('cardPreviewDialog').open&&(cardPreviewViewer||cardPreviewBytes))closeCardPreview();});
    $('previewZoomIn').addEventListener('click',()=>cardPreviewViewer?.zoom(1.25));
    $('previewZoomOut').addEventListener('click',()=>cardPreviewViewer?.zoom(1/1.25));
    $('previewZoomFit').addEventListener('click',()=>cardPreviewViewer?.fit());
    $('previewPdfDownload').addEventListener('click',()=>{if(cardPreviewBytes)download(cardPreviewBytes,filename()+'-'+cardPreviewCode+'.pdf','application/pdf');});
    $('newCard').addEventListener('click',()=>void run(()=>newCard()));$('copyCard').addEventListener('click',()=>void run(()=>newCard(activeCode)));$('deleteCard').addEventListener('click',()=>void run(deleteCard));
    $('newStencil').addEventListener('click',()=>{if(!busy)stencilDialog();});$('editStencil').addEventListener('click',()=>{if(!busy&&state.stencils[currentStencil])stencilDialog(currentStencil);});
    $('deleteStencil').addEventListener('click',()=>void run(async()=>{
      const id=currentStencil,st=state.stencils[id];if(!st)return;const used=state.placements.filter(p=>p.stencilId===id);if(used.some(p=>p.locked))throw Error('Lås upp stencilens placeringar före borttagning.');
      const answer=await ask({title:`Ta bort stencilen ${st.code}?`,text:`Stencilen och dess ${used.length} placeringar tas bort. Sparade dörrkort behålls. Du kan ångra.`,accept:'Ta bort stencil'});if(answer!=='accept')return;
      await commit(next=>D.removeStencil(next,id,{cascade:true}),'Stencilen är borttagen.');await persistLibrary(L.setHidden(library,st.code,true));currentStencil=firstLibraryStencil();revealStencil(state.stencils[currentStencil]);renderAll();
    }));
    for(const id of ['stencilCode','stencilName','stencilKind','stencilProductType','stencilShape','stencilFill','stencilStroke','stencilTextColor','stencilWidth','stencilHeight','stencilFontSize'])$(id).addEventListener('input',previewStencil);
    $('stencilKind').addEventListener('change',()=>{
      if(!editingStencil){const symbol=$('stencilKind').value==='symbol',base=symbol?D.defaultStencil('DA'):D.defaultStencilFor(state,'EGEN1');for(const [id,key]of [['stencilShape','shape'],['stencilWidth','width'],['stencilHeight','height']])$(id).value=base[key];$('stencilProductType').value=symbol?'other':'none';}
      previewStencil();
    });
    $('saveStencil').addEventListener('click',()=>void run(async()=>{const values=stencilValues(),groupId=$('stencilCategory').value;await commit(next=>{if(editingStencil){const old=next.stencils[editingStencil],resized=old.width!==values.width||old.height!==values.height;D.updateStencil(next,editingStencil,values);if(resized)D.resizeStencilShared(next,editingStencil,values.width,values.height,{scope:next.preferences.sizeScope});}else D.addStencil(next,values);},'Stencilen är sparad i projektet.');currentStencil=values.id;editingStencil=values.id;$('stencilCode').disabled=true;await rememberStencil(state.stencils[currentStencil],groupId);revealStencil(state.stencils[currentStencil]);viewer.setStencil(currentStencil);$('stencilDialog').close();renderAll();message('Stencilen är sparad i projektet och biblioteket.');}));
    $('closeStencil').addEventListener('click',()=>$('stencilDialog').close());
    for(const [id,tool]of [['toolSelect','select'],['toolPan','pan'],['toolPlace','place'],['toolErase','erase']])$(id).addEventListener('click',()=>setTool(tool));
    $('undo').addEventListener('click',()=>void runCanvas(()=>travelHistory(true)));$('redo').addEventListener('click',()=>void runCanvas(()=>travelHistory(false)));
    $('duplicateSelection').addEventListener('click',()=>void run(duplicate));$('deleteSelection').addEventListener('click',()=>void run(()=>removePositions()));$('lockSelection').addEventListener('click',()=>void run(lockSelection));
    $('newStencilTool').addEventListener('click',()=>{if(!busy)stencilDialog();});$('newCardTool').addEventListener('click',()=>void run(()=>newCard()));
    $('rotateLeft').addEventListener('click',()=>void run(()=>rotateSelection(-15)));$('rotateRight').addEventListener('click',()=>void run(()=>rotateSelection(15)));
    $('selectAllTool').addEventListener('click',()=>void run(()=>selectIds(state.placements.filter(p=>p.page===currentPage).map(p=>p.id))));
    $('applySelection').addEventListener('click',()=>void run(async()=>{
      const items=selectedPlacements();if(!items.length)return;const locked=$('selectionLocked').checked;
      const width=Number($('selectionWidth').value),height=Number($('selectionHeight').value),resized=Math.abs(items[0].width-width)>.001||Math.abs(items[0].height-height)>.001;
      await commit(next=>{
        // Geometry and shared sizes are validated together before anything is saved.
        for(const p of items){if(p.locked){D.updatePlacement(next,p.id,{locked});continue;}const patch={rotation:Number($('selectionRotation').value),locked:false};if(items.length===1){patch.x=Number($('selectionX').value)/100;patch.y=Number($('selectionY').value)/100;}D.updatePlacement(next,p.id,patch);}
        if(resized&&!items[0].locked){if(next.preferences.sizeScope==='single'){for(const p of items)D.resizeShared(next,p.id,width,height,{scope:'single'});}else D.resizeShared(next,items[0].id,width,height,{scope:next.preferences.sizeScope});}
        for(const p of items)if(!p.locked)D.updatePlacement(next,p.id,{locked});
      },'Stämpelns egenskaper är sparade.');
    }));
    $('prevPage').addEventListener('click',()=>void run(()=>viewer.page(currentPage-1)));$('nextPage').addEventListener('click',()=>void run(()=>viewer.page(currentPage+1)));$('pageNumber').addEventListener('change',()=>void run(()=>viewer.page(Number($('pageNumber').value))));
    $('zoomIn').addEventListener('click',()=>viewer.zoom(1.25));$('zoomOut').addEventListener('click',()=>viewer.zoom(.8));$('zoomFit').addEventListener('click',()=>viewer.fit());
    $('pdfTextSelectButton').addEventListener('click',()=>{if(!busy)setPDFTextSelection(!pdfSearchState.textSelection);});
    $('pdfSearchButton').addEventListener('click',()=>{if(!busy)void searchDrawingText();});
    $('pdfSearchInput').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();if(!busy)void searchDrawingText();}});
    $('pdfSearchInput').addEventListener('input',()=>{
      pdfSearchRequest++;pdfSearchNavigation++;viewer?.clearSearchMatch?.();
      pdfSearchState={...pdfSearchState,query:$('pdfSearchInput').value,matches:[],index:-1,busy:false,message:''};renderDrawingSearch();
    });
    $('pdfSearchSelected').addEventListener('click',()=>{if(!busy){const text=viewer?.getSelectedText?.()||pdfSearchState.selectedText;if(text){$('pdfSearchPanel').open=true;void searchDrawingText(text);}}});
    $('pdfCopyText').addEventListener('click',()=>{if(!busy)void copyPDFText();});
    $('pdfSearchPrev').addEventListener('click',()=>{if(!busy)void showPDFSearchResult(pdfSearchState.index-1);});
    $('pdfSearchNext').addEventListener('click',()=>{if(!busy)void showPDFSearchResult(pdfSearchState.index+1);});
    $('pdfSearchResults').addEventListener('click',event=>{const button=event.target.closest('[data-pdf-match]');if(button&&!busy)void showPDFSearchResult(Number(button.dataset.pdfMatch));});
    $('fullscreen')?.addEventListener('click',()=>{
      const pane=$('drawingPane'),active=document.fullscreenElement||document.webkitFullscreenElement;
      const action=active?(document.exitFullscreen||document.webkitExitFullscreen):(pane.requestFullscreen||pane.webkitRequestFullscreen);
      if(typeof action!=='function'){message('Helskärm stöds inte i den här webbläsaren. Ritningen kan fortfarande zoomas och flyttas.');return;}
      try{Promise.resolve(action.call(active?document:pane)).catch(()=>message('Helskärm kunde inte öppnas. Ritningen kan fortfarande zoomas och flyttas.'));}
      catch(_){message('Helskärm kunde inte öppnas. Ritningen kan fortfarande zoomas och flyttas.');}
    });
    $('showStamps')?.addEventListener('change',()=>{if(typeof viewer.setVisible==='function')viewer.setVisible($('showStamps').checked);});
    $('placementSearch')?.addEventListener('input',renderPositions);
    $('placementsList')?.addEventListener('click',e=>{const b=e.target.closest('[data-focus-id]');if(b)void run(async()=>{await viewer.focusPlacement(b.dataset.focusId);await selectIds([b.dataset.focusId]);showView('drawing');});});
    $('cardMeta').addEventListener('input',e=>{if(draft&&!busy&&e.target.dataset.meta){draft.meta[e.target.dataset.meta]=e.target.value;draftChanged();}});
    $('cardRows').addEventListener('input',e=>{if(!draft||busy)return;const target=e.target,row=draft.rows.find(r=>r.id===target.dataset.rowId);if(row&&['quantity','delivery','installer'].includes(target.dataset.field)){row[target.dataset.field]=target.dataset.field==='quantity'?Number(target.value):target.value;if(target.dataset.field==='delivery'){row.installer=target.value;const installer=$('cardRows').querySelector('select[data-row-id="'+row.id+'"][data-field="installer"]');if(installer){if(![...installer.options].some(option=>option.value===target.value))installer.add(new Option(target.value,target.value));installer.value=target.value;}}draftChanged();}});
    $('cardRows').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||busy||!draft)return;if(b.dataset.action==='choose-product')openProducts(b.dataset.rowId);else{updateTypedProduct(b.dataset.rowId,'');const input=[...$('cardRows').querySelectorAll('[data-product-input]')].find(input=>input.dataset.rowId===b.dataset.rowId);if(input)input.value='';productSuggest?.close();}});
    $('cardNote').addEventListener('input',e=>{if(draft&&!busy){draft.note=e.target.value;draftChanged();}});$('saveCard').addEventListener('click',()=>void run(saveCard));
    $('productSearch').addEventListener('input',renderProducts);$('productList').addEventListener('click',e=>{const b=e.target.closest('[data-product-id]');if(!b||busy)return;const p=L.listProducts(library,state,productDefinition().category).find(p=>p.id===b.dataset.productId);if(p)chooseProduct(p.name);});
    $('closeProduct').addEventListener('click',()=>$('productDialog').close());$('addProduct').addEventListener('click',()=>void run(async()=>{const name=$('customProductName').value.trim();await persistLibrary(L.saveProduct(library,{name,category:productDefinition().category,description:'Egen produkt'}));chooseProduct(name);message('Produkten är sparad i biblioteket och vald på dörrkortet. Spara kortet när du är klar.');}));
    $('createBlankDrawing').addEventListener('click',()=>void run(createBlankDrawing));
    $('openDrawing').addEventListener('click',()=>$('drawingFile').click());document.querySelectorAll('[data-open-drawing]').forEach(b=>b.addEventListener('click',()=>$('drawingFile').click()));
    $('openProject').addEventListener('click',()=>$('projectFile').click());
    for(const id of ['drawingFile','projectFile'])$(id).addEventListener('change',e=>{const file=e.target.files[0];e.target.value='';void run(()=>openFile(file));});
    $('saveProject').addEventListener('click',()=>void afterMaterialTimes(async()=>{if(!await leaveDraft())return;download(await S.pack(state,original),filename()+'.tillsyno-projektering.json','application/json');message('Projektfilen är skapad med originalritning, stämplar och sparade dörrkort.');}));
    $('exportPdf').addEventListener('click',()=>void afterMaterialTimes(()=>exportPDF('combined')));$('exportDrawing').addEventListener('click',()=>void afterMaterialTimes(()=>exportPDF('drawing')));$('exportCards').addEventListener('click',()=>void afterMaterialTimes(()=>exportPDF('cards')));$('exportSchedule').addEventListener('click',()=>void afterMaterialTimes(exportSchedule));
    $('newProject').addEventListener('click',()=>void run(async()=>{if(state.drawing.pages.length||Object.keys(state.cards).length||dirty){const answer=await ask({title:'Starta ett nytt projekt?',text:'Spara en projektfil först om du vill behålla det nuvarande projektet.',accept:'Nytt projekt'});if(answer!=='accept')return;}await replaceProject(libraryProject(D.createEmpty(),{fresh:true}),new Uint8Array(),'Ett nytt projekt är klart. Ditt bibliotek finns kvar. Öppna en PDF-ritning för att börja.');}));
    const example=()=>void run(async()=>{if(state.drawing.pages.length||Object.keys(state.cards).length||dirty){const answer=await ask({title:'Öppna exempelprojektet?',text:'Det ersätter det projekt som visas. Spara en projektfil först om du vill behålla ditt arbete.',accept:'Öppna exemplet'});if(answer!=='accept')return;}const sample=await Proj2PDF.example();await replaceProject(sample.state,sample.original,'Exempelprojektet är öppnat. Alla stämplar går att flytta, ändra och ta bort.');});
    $('exampleProject').addEventListener('click',example);document.querySelectorAll('[data-open-example],[data-example]').forEach(b=>b.addEventListener('click',example));
    $('projectName').addEventListener('change',()=>void run(async()=>{const value=$('projectName').value.trim();await commit(next=>{next.project.name=value;next.project.revision++;next.project.updatedAt=new Date().toISOString();},'Projektnamnet är sparat.');}));
    document.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.view==='materials')void run(async()=>{if(!await leaveDraft())return;renderMaterials();showView('materials');});else showView(b.dataset.view);}));
    $('help').addEventListener('click',()=>$('helpDialog').showModal());
    $('confirmAccept').addEventListener('click',()=>resolveAsk('accept'));$('confirmDiscard').addEventListener('click',()=>resolveAsk('discard'));$('confirmCancel').addEventListener('click',()=>resolveAsk('cancel'));$('confirmDialog').addEventListener('cancel',e=>{e.preventDefault();resolveAsk('cancel');});
    $('textAccept').addEventListener('click',()=>resolveText(true));$('textCancel').addEventListener('click',()=>resolveText(false));$('textDialog').addEventListener('cancel',e=>{e.preventDefault();resolveText(false);});$('textValue').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();resolveText(true);}});
    document.addEventListener('keydown',e=>{
      if(e.target.closest('input,textarea,select,[contenteditable=true]')||document.querySelector('dialog[open]'))return;
      const key=e.key.toLowerCase(),command=e.ctrlKey||e.metaKey;
      if(command&&key==='f'){e.preventDefault();$('pdfSearchPanel').open=true;$('pdfSearchInput').focus();return;}
      if(pdfSearchState.textSelection){if(e.key==='Escape'){e.preventDefault();setPDFTextSelection(false);}return;}
      if(document.body.dataset.view==='materials'&&!(command&&['z','y'].includes(key)))return;
      if(command&&['z','y','c','v','d','a'].includes(key)){e.preventDefault();if(key==='z')void run(()=>travelHistory(!e.shiftKey));else if(key==='y')void run(()=>travelHistory(false));else if(key==='c'){clipboard=clone(selectedPlacements());message(clipboard.length+' stämplar kopierade.');}else if(key==='v')void run(paste);else if(key==='d')void run(duplicate);else void run(()=>selectIds(state.placements.filter(p=>p.page===currentPage).map(p=>p.id)));return;}
      if(['Delete','Backspace'].includes(e.key)){e.preventDefault();void run(()=>removePositions());return;}
      if(e.key==='Escape'){selectedAnnotation=null;viewer.setAnnotationSelection(null);renderAnnotationPanel();void run(()=>selectIds([]));setTool('select');return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&selectedAnnotation){e.preventDefault();const item=annotationItem(),page=state.drawing.pages[item.page-1],step=e.shiftKey?10:1,dx=(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0)/page.width,dy=(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)/page.height;void runCanvas(()=>changeAnnotation(item.id,{x:Math.max(0,Math.min(1,item.x+dx)),y:Math.max(0,Math.min(1,item.y+dy))}));return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&selected.length){e.preventDefault();const dx=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,dy=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0,step=e.shiftKey?10:1;void run(()=>move(selectedPlacements().map(p=>({id:p.id,x:p.x+dx*step/state.drawing.pages[p.page-1].width,y:p.y+dy*step/state.drawing.pages[p.page-1].height}))));return;}
      if(!command&&{v:'select',h:'pan',s:'place',p:'place',e:'erase',t:'text'}[key])setTool({v:'select',h:'pan',s:'place',p:'place',e:'erase',t:'text'}[key]);
      if(e.key==='PageDown'){e.preventDefault();void run(()=>viewer.page(currentPage+1));}if(e.key==='PageUp'){e.preventDefault();void run(()=>viewer.page(currentPage-1));}
    });
    window.addEventListener('beforeunload',e=>{if(($('annotationText')?.value!==annotationItem()?.text&&annotationItem())||dirty||busy||libraryPending||materialTimePending||materialTimeDrafts.size){e.preventDefault();e.returnValue='';}});
  }
  async function boot(){
    if(started||!window.TillsynoCurrentAccess)return;started=true;D=window.Proj2Data;S=window.Proj2Store;L=window.Proj2Library;
    const userId=String(window.TillsynoCurrentAccess.userId||'');libraryOwner=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)?'account:'+userId:'device';
    state=D.createEmpty();library=L.createDefault();let restoredProject=false;
    try{
      try{const saved=await S.load();if(saved){await verifySource(saved.state,saved.original);state=saved.state;original=saved.original;restoredProject=true;}}catch(error){storageOk=false;damagedStore=true;message(error.message+' Den tidigare kopian har inte skrivits över. Öppna en projektfil eller välj ett nytt projekt.',true);}
      try{const saved=await L.load(libraryOwner);if(saved){library=saved;libraryExists=true;}}catch(error){libraryDamaged=true;message(error.message+' Den tidigare bibliotekskopian har behållits.',true);}
      if(!libraryExists&&!libraryDamaged){
        const defaults=D.createEmpty().stencils;
        const templates=Object.values(state.stencils).filter(stencil=>JSON.stringify(stencil)!==JSON.stringify(defaults[stencil.id])&&!(D.initialCardCode(stencil.code)!==stencil.code&&JSON.stringify(stencil)===JSON.stringify(D.defaultStencil(stencil.code)))).map(stencil=>({...clone(stencil),id:stencil.code}));
        const hiddenCodes=library.hiddenCodes.filter(code=>!state.cards[code]&&!state.placements.some(placement=>placement.code===code));
        const seed=L.validate({...library,products:clone(state.customProducts),stencils:templates,hiddenCodes});
        try{await persistLibrary(seed);}catch(error){message('Biblioteket kunde inte sparas på enheten: '+error.message,true);}
      }
      state=libraryProject(state,{fresh:!restoredProject});
      setActive(state.cards.GS1?'GS1':Object.keys(state.cards).sort(natural)[0]||null);if(!libraryStencils().some(stencil=>stencil.id===currentStencil))currentStencil=firstLibraryStencil();revealStencil(state.stencils[currentStencil]);bind();makeViewer();if(original.length)await viewer.open(original);renderAll();showView('drawing');
      window.Proj2App=Object.freeze({snapshot:()=>({state:clone(state),selectedIds:[...selected],page:currentPage,activeCode,draft:clone(draft),dirty,view:viewer.snapshot(),materials:clone(materialReport),search:clone(pdfSearchState),library:clone(library),librarySaved:libraryExists&&!libraryDamaged}),librarySnapshot:()=>clone(library),searchSnapshot:()=>clone(pdfSearchState),previewSnapshot:()=>({open:$('cardPreviewDialog').open,code:cardPreviewCode,view:cardPreviewViewer?.snapshot()||null}),version:'2.18'});
    }catch(error){message(error?.message||'Projektet kunde inte öppnas.',true);}
  }
  window.addEventListener('tillsyno-authorized',()=>void boot());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void boot(),{once:true});else void boot();
})();

