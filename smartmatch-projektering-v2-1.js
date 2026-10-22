/* Projektering 2. Isolated editor for original PDF + editable project placements. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const natural = (a,b) => a.localeCompare(b,'sv',{numeric:true,sensitivity:'base'});
  let D, S, state, original = new Uint8Array(), viewer, selected = [], activeCode = null, draft = null, dirty = false;
  let currentStencil = 'GS1', currentPage = 1, currentTool = 'select', busy = false, started = false, storageOk = true, damagedStore = false;
  let undoStack = [], redoStack = [], clipboard = [], productRow = null, editingStencil = null, messageTimer;
  let confirmResolve = null, textResolve = null;
  const selectedPlacements = () => state.placements.filter(p => selected.includes(p.id));
  const stencilForCode = code => Object.values(state.stencils).find(s => s.code === code);
  const definitions = () => D.SECTIONS.flatMap(section => section.rows.map(row => ({...row,section:section.title})));
  function message(text, error = false) {
    $('appMessage').textContent = text; $('appMessage').dataset.level = error ? 'error' : 'success';
    clearTimeout(messageTimer); if (!error) messageTimer = setTimeout(() => { $('appMessage').textContent = ''; }, 6500);
    for (const [dialog, output] of [['productDialog','productMessage'],['stencilDialog','stencilMessage']]) {
      if ($(dialog)?.open && $(output)) { $(output).textContent = text; $(output).dataset.level = error ? 'error' : 'success'; }
    }
  }
  function ask({title,text,accept='Fortsätt',discard=''}) {
    if (confirmResolve) return Promise.resolve('cancel');
    $('confirmTitle').textContent=title; $('confirmText').textContent=text; $('confirmAccept').textContent=accept;
    $('confirmDiscard').textContent=discard; $('confirmDiscard').hidden=!discard; $('confirmDialog').showModal();
    return new Promise(resolve => { confirmResolve=resolve; });
  }
  function resolveAsk(answer) { $('confirmDialog').close(); const resolve=confirmResolve; confirmResolve=null; resolve?.(answer); }
  function askText(title,label,value='') {
    $('textTitle').textContent=title; $('textLabel').textContent=label; $('textValue').value=value; $('textDialog').showModal(); $('textValue').focus();
    return new Promise(resolve => { textResolve=resolve; });
  }
  function resolveText(accept) { const value=accept?$('textValue').value:null; $('textDialog').close(); const resolve=textResolve; textResolve=null; resolve?.(value); }
  function status() {
    $('saveStatus').textContent=busy?'Arbetar …':dirty?'Dörrkortet har osparade ändringar':storageOk?'Sparat på enheten':'Lokal sparning är inte tillgänglig';
    $('saveStatus').dataset.state=dirty?'pending':storageOk?'saved':'error';
    $('placementCount').textContent=state.placements.length; $('cardCount').textContent=Object.keys(state.cards).length;
    $('cardStatus').textContent=!draft?'Välj eller skapa ett dörrkort':dirty?'Osparade ändringar':state.cards[activeCode]?'Sparat dörrkort':'Nytt dörrkort';
    $('saveCard').disabled=busy||!draft||(!dirty&&!!state.cards[activeCode]);
    $('undo').disabled=busy||!undoStack.length; $('redo').disabled=busy||!redoStack.length;
    for (const id of ['deleteSelection','duplicateSelection','lockSelection']) $(id).disabled=busy||!selected.length;
    $('applySelection').disabled=busy||!selectedPlacements().length;
    $('copyCard').disabled=busy||!state.cards[activeCode]; $('deleteCard').disabled=busy||!state.cards[activeCode];
    $('editStencil').disabled=busy||!state.stencils[currentStencil]; $('deleteStencil').disabled=busy||!state.stencils[currentStencil];
    $('drawingEmpty').hidden=!!state.drawing.pages.length;
    $('drawingHost').setAttribute('aria-busy', String(busy));
  }
  async function run(task) {
    if (busy) { viewer?.setSelection(selected); return false; }
    busy=true; status();
    try { return await task(); }
    catch(error) { message(error?.message||'Åtgärden kunde inte slutföras.',true); $('projectName').value=state.project.name; return false; }
    finally { busy=false; status(); viewer?.setProject(state,{selectedIds:selected}); }
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
    activeCode=code; draft=code?clone(state.cards[code]||D.createCard(code)):null; dirty=false;
    const stencil=code&&stencilForCode(code);if(stencil)currentStencil=stencil.id;
  }
  function draftChanged() { dirty=!!draft&&(JSON.stringify(draft)!==JSON.stringify(state.cards[activeCode]||D.createCard(activeCode))); status(); }
  async function saveCard() {
    if(!draft||(!dirty&&state.cards[activeCode]))return true;
    const card=clone(draft), code=activeCode;
    await commit(next=>{
      if(!Object.values(next.stencils).some(s=>s.code===code))D.addStencil(next,{...D.defaultStencil(code),id:code,code,kind:'card'});
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
    const first=state.placements.find(p=>p.id===valid[0]), code=first&&state.stencils[first.stencilId]?.kind==='card'?first.code:null;
    if(code!==activeCode){if(!await leaveDraft()){viewer.setSelection(selected);return;}setActive(code);}
    selected=valid;
    if(first)currentStencil=first.stencilId;
    viewer.setSelection(selected); renderAll();
    if(showCard&&code&&matchMedia('(max-width:1100px)').matches)showView('cards');
  }
  async function chooseStencil(id) {
    const stencil=state.stencils[id]; if(!stencil)throw Error('Stencilen finns inte.');
    const code=stencil.kind==='card'?stencil.code:null;
    if(code!==activeCode){if(!await leaveDraft())return;setActive(code);}
    currentStencil=id; viewer.setStencil(id); setTool('place'); renderAll();
    if(matchMedia('(max-width:1100px)').matches)showView('drawing');
  }
  function setTool(tool) {
    currentTool=tool; viewer.setTool(tool); viewer.setStencil(currentStencil);
    const names={select:'Välj eller dra en stämpel. Shift väljer flera.',pan:'Dra för att flytta ritningen. Mushjulet zoomar.',place:'Klicka på ritningen eller dra in en stencil från biblioteket.',erase:'Klicka på en olåst stämpel för att ta bort den.'};
    $('toolHint').textContent=names[tool];
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
  }
  async function move(updates) {
    await commit(next=>{for(const update of updates){const old=next.placements.find(p=>p.id===update.id);if(old)D.updatePlacement(next,old.id,snap(update,old.page));}},'Placeringen är sparad.');
  }
  async function removePositions(ids=selected) {
    if(!ids.length)return;
    await commit(next=>D.removePlacements(next,ids),'Stämpeln är borttagen. Du kan ångra ändringen.');selected=selected.filter(id=>!ids.includes(id));renderAll();
  }
  function makeViewer() {
    viewer?.destroy();
    viewer=Proj2Canvas.create({host:$('drawingHost'),onError:error=>message(error?.message||'Ritningen kunde inte visas.',true),onSelect:ids=>void run(()=>selectIds(ids)),onPlace:input=>void run(()=>place(input)),onMove:updates=>void run(()=>move(updates)),onErase:ids=>void run(()=>removePositions(ids)),onChangePage:page=>{currentPage=page;selected=[];renderSelection();renderPositions();status();},onView:view=>{
      currentPage=view.page||1;$('pageNumber').value=currentPage;$('pageTotal').textContent=view.total||0;$('zoomLevel').textContent=Math.round((view.zoom||1)*100)+'%';
      $('prevPage').disabled=currentPage<=1;$('nextPage').disabled=currentPage>=(view.total||0);
    }});setTool(currentTool);viewer.setProject(state,{selectedIds:selected});
  }
  function showView(view) {
    document.body.dataset.view=view;
    document.querySelectorAll('button[data-view]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.view===view));b.classList.toggle('is-active',b.dataset.view===view);});
    if(view==='drawing')requestAnimationFrame(()=>viewer?.setProject(state,{selectedIds:selected}));
  }
  function renderLibrary() {
    const query=$('stampSearch').value.trim().toUpperCase();
    const stencils=D.listStencils(state).filter(s=>(s.code+' '+s.name).toUpperCase().includes(query));
    $('stampList').innerHTML=stencils.map(s=>{
      const count=state.placements.filter(p=>p.stencilId===s.id).length;
      return `<button type="button" draggable="true" class="stencil-item${s.id===currentStencil?' is-active':''}" data-stencil-id="${esc(s.id)}" aria-pressed="${s.id===currentStencil}" title="Dra ${esc(s.code)} till ritningen"><span class="stencil-preview shape-${s.shape}" style="--stamp-fill:${esc(s.fill)};--stamp-stroke:${esc(s.stroke)};--stamp-text:${esc(s.textColor)}">${esc(s.code)}</span><small>${count?count+' st':s.kind==='symbol'?'Symbol':'Dörrkort'}</small></button>`;
    }).join('')||'<p class="empty-note">Ingen stencil hittades. Skapa en egen.</p>';
    const cardQuery=$('cardSearch').value.trim().toUpperCase();
    $('cardList').innerHTML=Object.keys(state.cards).sort(natural).filter(code=>code.includes(cardQuery)).map(code=>{
      const count=state.placements.filter(p=>p.code===code).length;
      return `<button type="button" class="card-list-item${activeCode===code?' is-active':''}" data-card-code="${esc(code)}"><strong>${esc(code)}</strong><small>${count} dörrar</small></button>`;
    }).join('')||'<p class="empty-note">Inga dörrkort. Skapa ett kort eller placera en GS-stämpel.</p>';
    $('selectedStamp').textContent=state.stencils[currentStencil]?.code||'Välj stencil';
  }
  function renderCard() {
    $('cardCode').textContent=activeCode||'Dörrkort';
    $('cardUsage').textContent=activeCode?`Används av ${state.placements.filter(p=>p.code===activeCode&&state.stencils[p.stencilId].kind==='card').length} dörrar`:'Välj en dörrstämpel eller skapa ett dörrkort.';
    $('cardNote').disabled=!draft;$('cardNote').value=draft?.note||'';
    if(!draft){$('cardMeta').innerHTML='';$('cardRows').innerHTML='<div class="card-empty"><p>Ett gemensamt dörrkort per beteckning.</p><p>DA och DS är separata symboler. Dörrkort skapas för dina dörrstämplar.</p></div>';return;}
    const metaLabels={littera:'Littera',hanging:'Hängning',doorType:'Dörrtyp',fire:'Brandkrav',security:'Skyddsklass',escape:'Utrymningskrav',reentry:'Återinrymning'};
    $('cardMeta').innerHTML=Object.entries(metaLabels).map(([key,label])=>`<label><span>${label}</span><input data-meta="${key}" value="${esc(draft.meta[key])}" maxlength="120" aria-label="${label}"></label>`).join('');
    $('cardRows').innerHTML=D.SECTIONS.map(section=>`<details class="card-section" open><summary>${esc(section.title)}</summary><div class="card-table-wrap"><table><thead><tr><th>Komponent</th><th>Produkt</th><th>Antal</th><th>Lev av</th><th>Mont av</th></tr></thead><tbody>${section.rows.map(def=>{
      const row=draft.rows.find(r=>r.id===def.id);
      const owners=field=>`<select data-row-id="${esc(row.id)}" data-field="${field}" aria-label="${esc(section.title+' '+row.label+' '+(field==='delivery'?'levereras av':'monteras av'))}">${[...new Set(['',...D.OWNER_VALUES,row[field]])].map(value=>`<option value="${esc(value)}"${row[field]===value?' selected':''}>${esc(value||'–')}</option>`).join('')}</select>`;
      return `<tr data-row-id="${esc(row.id)}"><th scope="row">${esc(row.label)}</th><td class="product-cell"><button type="button" class="product-pick${row.product?' has-product':''}" data-action="choose-product" data-field="product" data-row-id="${esc(row.id)}" aria-label="Välj produkt för ${esc(section.title+' '+row.label)}">${esc(row.product||'Välj produkt')}</button>${row.product?`<button type="button" class="clear-product" data-action="clear-product" data-row-id="${esc(row.id)}" aria-label="Ta bort ${esc(row.label)}">×</button>`:''}</td><td><input data-row-id="${esc(row.id)}" data-field="quantity" type="number" min="1" max="999" step="1" value="${row.quantity}" aria-label="${esc(section.title+' '+row.label)} antal"></td><td>${owners('delivery')}</td><td>${owners('installer')}</td></tr>`;
    }).join('')}</tbody></table></div></details>`).join('');
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
  }
  function renderPositions() {
    if(!$('placementsList'))return;
    const query=($('placementSearch')?.value||'').toUpperCase();
    $('placementsList').innerHTML=state.placements.filter(p=>!query||p.code.includes(query)||p.note.toUpperCase().includes(query)).map(p=>`<button type="button" data-focus-id="${esc(p.id)}" class="placement-list-item${selected.includes(p.id)?' is-active':''}"><strong>${esc(p.code)}</strong><small>Sida ${p.page}${p.locked?' · Låst':''}</small></button>`).join('')||'<p class="empty-note">Inga placeringar.</p>';
  }
  function renderAll() {
    $('projectName').value=state.project.name;renderLibrary();renderCard();renderSelection();renderPositions();
    viewer?.setStencil(currentStencil);viewer?.setProject(state,{selectedIds:selected});status();
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
    const valid=D.validate(next);await verifySource(valid,bytes);
    if(damagedStore){const answer=await ask({title:'Ersätt den oläsbara lokala kopian?',text:'Den tidigare kopian gick inte att öppna. Detta sparar det nya projektet i stället.',accept:'Öppna och spara'});if(answer!=='accept')return false;}
    await S.save(valid,bytes);
    state=valid;original=bytes.slice();selected=[];undoStack=[];redoStack=[];currentPage=1;storageOk=true;damagedStore=false;
    currentStencil=state.stencils.GS1?'GS1':Object.keys(state.stencils)[0]||'';setActive(state.cards.GS1?'GS1':Object.keys(state.cards).sort(natural)[0]||null);
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
  function renderProducts(){const def=productDefinition();$('productList').innerHTML=D.searchProducts(state,def.category,$('productSearch').value).map(p=>`<button type="button" class="product-choice" data-product-id="${esc(p.id)}"><strong>${esc(p.name)}</strong><span>${esc(p.description)}</span></button>`).join('')||'<p class="empty-note">Ingen produkt hittades. Lägg till en egen nedan.</p>';}
  function openProducts(rowId){productRow=rowId;const def=productDefinition();$('productTitle').textContent=def.section+' · '+def.label;$('productSearch').value='';$('customProductName').value='';$('customProductCategory').innerHTML=`<option value="${esc(def.category)}">${esc(def.label)}</option>`;$('customProductCategory').disabled=true;$('productMessage').textContent='';renderProducts();$('productDialog').showModal();$('productSearch').focus();}
  function chooseProduct(name){draft.rows.find(r=>r.id===productRow).product=name;draftChanged();renderCard();$('productDialog').close();}
  function stencilDialog(id=null){
    editingStencil=id;const st=id?state.stencils[id]:D.defaultStencil('EGEN1');
    $('stencilTitle').textContent=id?'Redigera stencil':'Skapa egen stencil';
    const fields={stencilCode:'code',stencilName:'name',stencilKind:'kind',stencilShape:'shape',stencilFill:'fill',stencilStroke:'stroke',stencilTextColor:'textColor',stencilWidth:'width',stencilHeight:'height',stencilFontSize:'fontSize'};
    for(const [element,key]of Object.entries(fields))$(element).value=id||!['code','name'].includes(key)?st[key]:'';
    $('stencilCode').disabled=!!id;$('stencilMessage').textContent='';previewStencil();$('stencilDialog').showModal();
  }
  function stencilValues(){return {id:editingStencil||D.normalizeCode($('stencilCode').value),code:D.normalizeCode($('stencilCode').value),name:$('stencilName').value.trim()||$('stencilCode').value.trim(),kind:$('stencilKind').value,shape:$('stencilShape').value,fill:$('stencilFill').value,stroke:$('stencilStroke').value,textColor:$('stencilTextColor').value,width:Number($('stencilWidth').value),height:Number($('stencilHeight').value),fontSize:Number($('stencilFontSize').value)};}
  function previewStencil(){
    const code=$('stencilCode').value||'EGEN',shape=$('stencilShape').value;
    const width=Math.max(12,Math.min(500,Number($('stencilWidth').value)||60)),height=Math.max(12,Math.min(500,Number($('stencilHeight').value)||26)),font=Math.max(5,Math.min(96,Number($('stencilFontSize').value)||11)),scale=Math.min(2,280/width,120/height);
    const color=value=>/^#[a-f0-9]{6}$/i.test(value)?value:'#f5d76b';
    $('stencilPreview').innerHTML=`<span class="stencil-preview shape-${esc(shape)}" style="--stamp-fill:${color($('stencilFill').value)};--stamp-stroke:${color($('stencilStroke').value)};--stamp-text:${color($('stencilTextColor').value)};width:${width*scale}px;height:${height*scale}px;font-size:${font*scale}px;padding:0">${esc(code)}</span>`;
  }
  function download(bytes,name,type){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  const filename=()=>state.project.name.replace(/[^a-zA-Z0-9åäöÅÄÖ_-]+/g,'-').slice(0,70)||'projektering';
  async function exportPDF(mode){if(!await leaveDraft())return;message('Skapar sökbar PDF …');const snapshot=D.validate(state),bytes=await Proj2PDF.build(snapshot,original,{mode});download(bytes,filename()+'-'+(mode==='combined'?'ritning-och-dorrkort':mode==='drawing'?'ritning':'dorrkort')+'.pdf','application/pdf');message('PDF:en är skapad. Den kan öppnas här igen för fortsatt projektering.');}
  function csvCell(value){let text=String(value??'');if(/^[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
  async function exportSchedule(){
    if(!await leaveDraft())return;
    const rows=[['Beteckning','Dörrar','Avsnitt','Komponent','Produkt','Per dörr','Totalt','Lev av','Mont av']];
    for(const code of Object.keys(state.cards).sort(natural)){const count=state.placements.filter(p=>p.code===code&&state.stencils[p.stencilId].kind==='card').length;if(!count)continue;for(const row of state.cards[code].rows)if(row.product)rows.push([code,count,row.section,row.label,row.product,row.quantity,count*row.quantity,row.delivery,row.installer]);}
    download('\ufeff'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n'),filename()+'-mangdforteckning.csv','text/csv;charset=utf-8');message('Mängdförteckningen är skapad från placerade dörrar och sparade produkter.');
  }
  async function travelHistory(backward){
    if(!await leaveDraft())return;const from=backward?undoStack:redoStack,to=backward?redoStack:undoStack;if(!from.length)return;
    const next=clone(from[from.length-1]);next.project.revision=state.project.revision+1;next.project.updatedAt=new Date().toISOString();
    await S.save(D.validate(next),original);to.push(clone(state));from.pop();state=next;selected=selected.filter(id=>state.placements.some(p=>p.id===id));
    setActive(activeCode&&state.cards[activeCode]?activeCode:Object.keys(state.cards).sort(natural)[0]||null);renderAll();message(backward?'Ändringen är ångrad.':'Ändringen är återställd.');
  }
  async function paste(){if(!clipboard.length)return;let added=[];await commit(next=>{for(const p of clipboard){if(!next.stencils[p.stencilId])throw Error('Kopians stencil har tagits bort. Välj en stencil igen.');added.push(D.addPlacement(next,{...p,id:undefined,page:currentPage,x:p.x+.015,y:p.y+.015,locked:false}));}},'Kopiorna är placerade.');selected=added.map(p=>p.id);renderAll();}
  async function duplicate(){if(!selected.length)return;let added;await commit(next=>{added=D.duplicatePlacements(next,selected);},'Valda stämplar är kopierade.');selected=added.map(p=>p.id);renderAll();}
  async function lockSelection(){const items=selectedPlacements();if(!items.length)return;const locked=!items.every(p=>p.locked);await commit(next=>{for(const p of items)D.updatePlacement(next,p.id,{locked});},locked?'Valda stämplar är låsta.':'Valda stämplar är upplåsta.');}
  async function newCard(copyFrom=null){
    if(!await leaveDraft())return;const value=await askText(copyFrom?'Kopiera dörrkort':'Nytt dörrkort','Ny beteckning',copyFrom?copyFrom+'B':'');if(value===null)return;
    const code=D.normalizeCode(value),stencil=stencilForCode(code);if(stencil?.kind==='symbol')throw Error('Den beteckningen används av en symbol. Välj en annan beteckning för dörrkortet.');
    await commit(next=>{if(copyFrom)D.copyCard(next,copyFrom,code);else D.ensureCard(next,code);if(!Object.values(next.stencils).some(s=>s.code===code))D.addStencil(next,{...D.defaultStencil(code),id:code,code,kind:'card'});},`${code} är skapat.`);
    setActive(code);currentStencil=stencilForCode(code).id;renderAll();showView('cards');
  }
  async function deleteCard(){
    if(!activeCode||!state.cards[activeCode])return;if(!await leaveDraft())return;
    const code=activeCode,used=state.placements.filter(p=>p.code===code);if(used.some(p=>p.locked))throw Error('Lås upp kortets placerade stämplar innan du tar bort dörrkortet.');
    const answer=await ask({title:`Ta bort ${code}?`,text:used.length?`Dörrkortet och dess ${used.length} placeringar tas bort. Du kan ångra ändringen.`:'Det sparade dörrkortet tas bort. Du kan ångra ändringen.',accept:'Ta bort dörrkort'});
    if(answer!=='accept')return;await commit(next=>D.removeCard(next,code,{cascade:true}),`${code} är borttaget.`);setActive(Object.keys(state.cards).sort(natural)[0]||null);renderAll();
  }
  function bind(){
    if(!$('stencilMessage')){const p=document.createElement('p');p.id='stencilMessage';p.className='dialog-message';p.setAttribute('role','status');$('stencilPreview').after(p);}
    $('stampSearch').addEventListener('input',renderLibrary);$('cardSearch').addEventListener('input',renderLibrary);
    document.querySelectorAll('.project-menu button').forEach(button=>button.addEventListener('click',()=>{button.closest('details').open=false;}));
    document.addEventListener('click',event=>document.querySelectorAll('.project-menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;}));
    document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.project-menu[open]').forEach(menu=>menu.open=false);});
    $('stampList').addEventListener('click',e=>{const b=e.target.closest('[data-stencil-id]');if(b)void run(()=>chooseStencil(b.dataset.stencilId));});
    $('stampList').addEventListener('dragstart',e=>{const b=e.target.closest('[data-stencil-id]');if(!b||busy){e.preventDefault();return;}currentStencil=b.dataset.stencilId;viewer.setStencil(currentStencil);e.dataTransfer.setData('application/x-tillsyno-stencil',currentStencil);e.dataTransfer.setData('text/plain',currentStencil);e.dataTransfer.effectAllowed='copy';});
    $('cardList').addEventListener('click',e=>{const b=e.target.closest('[data-card-code]');if(b)void run(async()=>{const code=b.dataset.cardCode;if(code!==activeCode&&!await leaveDraft())return;setActive(code);const st=stencilForCode(code);if(st)currentStencil=st.id;renderAll();showView('cards');});});
    $('newCard').addEventListener('click',()=>void run(()=>newCard()));$('copyCard').addEventListener('click',()=>void run(()=>newCard(activeCode)));$('deleteCard').addEventListener('click',()=>void run(deleteCard));
    $('newStencil').addEventListener('click',()=>{if(!busy)stencilDialog();});$('editStencil').addEventListener('click',()=>{if(!busy&&state.stencils[currentStencil])stencilDialog(currentStencil);});
    $('deleteStencil').addEventListener('click',()=>void run(async()=>{
      const id=currentStencil,st=state.stencils[id];if(!st)return;const used=state.placements.filter(p=>p.stencilId===id);if(used.some(p=>p.locked))throw Error('Lås upp stencilens placeringar före borttagning.');
      const answer=await ask({title:`Ta bort stencilen ${st.code}?`,text:`Stencilen och dess ${used.length} placeringar tas bort. Sparade dörrkort behålls. Du kan ångra.`,accept:'Ta bort stencil'});if(answer!=='accept')return;
      await commit(next=>D.removeStencil(next,id,{cascade:true}),'Stencilen är borttagen.');currentStencil=Object.keys(state.stencils)[0]||'';renderAll();
    }));
    for(const id of ['stencilCode','stencilName','stencilKind','stencilShape','stencilFill','stencilStroke','stencilTextColor','stencilWidth','stencilHeight','stencilFontSize'])$(id).addEventListener('input',previewStencil);
    $('saveStencil').addEventListener('click',()=>void run(async()=>{const values=stencilValues();await commit(next=>{if(editingStencil)D.updateStencil(next,editingStencil,values);else D.addStencil(next,values);},'Stencilen är sparad.');currentStencil=values.id;viewer.setStencil(currentStencil);$('stencilDialog').close();renderAll();}));
    $('closeStencil').addEventListener('click',()=>$('stencilDialog').close());
    for(const [id,tool]of [['toolSelect','select'],['toolPan','pan'],['toolPlace','place'],['toolErase','erase']])$(id).addEventListener('click',()=>setTool(tool));
    $('undo').addEventListener('click',()=>void run(()=>travelHistory(true)));$('redo').addEventListener('click',()=>void run(()=>travelHistory(false)));
    $('duplicateSelection').addEventListener('click',()=>void run(duplicate));$('deleteSelection').addEventListener('click',()=>void run(()=>removePositions()));$('lockSelection').addEventListener('click',()=>void run(lockSelection));
    $('applySelection').addEventListener('click',()=>void run(async()=>{
      const items=selectedPlacements();if(!items.length)return;const locked=$('selectionLocked').checked;
      await commit(next=>{for(const p of items){if(p.locked){D.updatePlacement(next,p.id,{locked});continue;}const patch={width:Number($('selectionWidth').value),height:Number($('selectionHeight').value),rotation:Number($('selectionRotation').value),locked};if(items.length===1){patch.x=Number($('selectionX').value)/100;patch.y=Number($('selectionY').value)/100;}D.updatePlacement(next,p.id,patch);}},'Stämpelns egenskaper är sparade.');
    }));
    $('prevPage').addEventListener('click',()=>void run(()=>viewer.page(currentPage-1)));$('nextPage').addEventListener('click',()=>void run(()=>viewer.page(currentPage+1)));$('pageNumber').addEventListener('change',()=>void run(()=>viewer.page(Number($('pageNumber').value))));
    $('zoomIn').addEventListener('click',()=>viewer.zoom(1.25));$('zoomOut').addEventListener('click',()=>viewer.zoom(.8));$('zoomFit').addEventListener('click',()=>viewer.fit());
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
    $('cardRows').addEventListener('input',e=>{if(!draft||busy)return;const target=e.target,row=draft.rows.find(r=>r.id===target.dataset.rowId);if(row&&['quantity','delivery','installer'].includes(target.dataset.field)){row[target.dataset.field]=target.dataset.field==='quantity'?Number(target.value):target.value;draftChanged();}});
    $('cardRows').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||busy||!draft)return;if(b.dataset.action==='choose-product')openProducts(b.dataset.rowId);else{draft.rows.find(r=>r.id===b.dataset.rowId).product='';draftChanged();renderCard();}});
    $('cardNote').addEventListener('input',e=>{if(draft&&!busy){draft.note=e.target.value;draftChanged();}});$('saveCard').addEventListener('click',()=>void run(saveCard));
    $('productSearch').addEventListener('input',renderProducts);$('productList').addEventListener('click',e=>{const b=e.target.closest('[data-product-id]');if(!b||busy)return;const p=D.searchProducts(state,productDefinition().category,'').find(p=>p.id===b.dataset.productId);if(p)chooseProduct(p.name);});
    $('closeProduct').addEventListener('click',()=>$('productDialog').close());$('addProduct').addEventListener('click',()=>void run(async()=>{let product;await commit(next=>{product=D.addProduct(next,{name:$('customProductName').value.trim(),category:productDefinition().category,description:'Egen produkt'});},'Produkten är sparad i projektets katalog.');chooseProduct(product.name);}));
    $('openDrawing').addEventListener('click',()=>$('drawingFile').click());document.querySelectorAll('[data-open-drawing]').forEach(b=>b.addEventListener('click',()=>$('drawingFile').click()));
    $('openProject').addEventListener('click',()=>$('projectFile').click());
    for(const id of ['drawingFile','projectFile'])$(id).addEventListener('change',e=>{const file=e.target.files[0];e.target.value='';void run(()=>openFile(file));});
    $('saveProject').addEventListener('click',()=>void run(async()=>{if(!await leaveDraft())return;download(await S.pack(state,original),filename()+'.tillsyno-projektering.json','application/json');message('Projektfilen är skapad med originalritning, stämplar och sparade dörrkort.');}));
    $('exportPdf').addEventListener('click',()=>void run(()=>exportPDF('combined')));$('exportDrawing').addEventListener('click',()=>void run(()=>exportPDF('drawing')));$('exportCards').addEventListener('click',()=>void run(()=>exportPDF('cards')));$('exportSchedule').addEventListener('click',()=>void run(exportSchedule));
    $('newProject').addEventListener('click',()=>void run(async()=>{if(state.drawing.pages.length||Object.keys(state.cards).length||dirty){const answer=await ask({title:'Starta ett nytt projekt?',text:'Spara en projektfil först om du vill behålla det nuvarande projektet.',accept:'Nytt projekt'});if(answer!=='accept')return;}await replaceProject(D.createEmpty(),new Uint8Array(),'Ett nytt projekt är klart. Öppna en PDF-ritning för att börja.');}));
    const example=()=>void run(async()=>{if(state.drawing.pages.length||Object.keys(state.cards).length||dirty){const answer=await ask({title:'Öppna exempelprojektet?',text:'Det ersätter det projekt som visas. Spara en projektfil först om du vill behålla ditt arbete.',accept:'Öppna exemplet'});if(answer!=='accept')return;}const sample=await Proj2PDF.example();await replaceProject(sample.state,sample.original,'Exempelprojektet är öppnat. Alla stämplar går att flytta, ändra och ta bort.');});
    $('exampleProject').addEventListener('click',example);document.querySelectorAll('[data-open-example],[data-example]').forEach(b=>b.addEventListener('click',example));
    $('projectName').addEventListener('change',()=>void run(async()=>{const value=$('projectName').value.trim();await commit(next=>{next.project.name=value;next.project.revision++;next.project.updatedAt=new Date().toISOString();},'Projektnamnet är sparat.');}));
    document.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
    $('help').addEventListener('click',()=>$('helpDialog').showModal());
    $('confirmAccept').addEventListener('click',()=>resolveAsk('accept'));$('confirmDiscard').addEventListener('click',()=>resolveAsk('discard'));$('confirmCancel').addEventListener('click',()=>resolveAsk('cancel'));$('confirmDialog').addEventListener('cancel',e=>{e.preventDefault();resolveAsk('cancel');});
    $('textAccept').addEventListener('click',()=>resolveText(true));$('textCancel').addEventListener('click',()=>resolveText(false));$('textDialog').addEventListener('cancel',e=>{e.preventDefault();resolveText(false);});$('textValue').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();resolveText(true);}});
    document.addEventListener('keydown',e=>{
      if(e.target.closest('input,textarea,select,[contenteditable=true]')||document.querySelector('dialog[open]'))return;
      const key=e.key.toLowerCase(),command=e.ctrlKey||e.metaKey;
      if(command&&['z','y','c','v','d','a'].includes(key)){e.preventDefault();if(key==='z')void run(()=>travelHistory(!e.shiftKey));else if(key==='y')void run(()=>travelHistory(false));else if(key==='c'){clipboard=clone(selectedPlacements());message(clipboard.length+' stämplar kopierade.');}else if(key==='v')void run(paste);else if(key==='d')void run(duplicate);else void run(()=>selectIds(state.placements.filter(p=>p.page===currentPage).map(p=>p.id)));return;}
      if(['Delete','Backspace'].includes(e.key)){e.preventDefault();void run(()=>removePositions());return;}
      if(e.key==='Escape'){void run(()=>selectIds([]));setTool('select');return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&selected.length){e.preventDefault();const dx=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,dy=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0,step=e.shiftKey?10:1;void run(()=>move(selectedPlacements().map(p=>({id:p.id,x:p.x+dx*step/state.drawing.pages[p.page-1].width,y:p.y+dy*step/state.drawing.pages[p.page-1].height}))));return;}
      if(!command&&{v:'select',h:'pan',s:'place',p:'place',e:'erase'}[key])setTool({v:'select',h:'pan',s:'place',p:'place',e:'erase'}[key]);
      if(e.key==='PageDown'){e.preventDefault();void run(()=>viewer.page(currentPage+1));}if(e.key==='PageUp'){e.preventDefault();void run(()=>viewer.page(currentPage-1));}
    });
    window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
  }
  async function boot(){
    if(started||!window.TillsynoCurrentAccess)return;started=true;D=window.Proj2Data;S=window.Proj2Store;
    state=D.createEmpty();
    try{
      try{const saved=await S.load();if(saved){await verifySource(saved.state,saved.original);state=saved.state;original=saved.original;}}catch(error){storageOk=false;damagedStore=true;message(error.message+' Den tidigare kopian har inte skrivits över. Öppna en projektfil eller välj ett nytt projekt.',true);}
      setActive(state.cards.GS1?'GS1':Object.keys(state.cards).sort(natural)[0]||null);bind();makeViewer();if(original.length)await viewer.open(original);renderAll();showView('drawing');
      window.Proj2App=Object.freeze({snapshot:()=>({state:clone(state),selectedIds:[...selected],page:currentPage,activeCode,draft:clone(draft),dirty,view:viewer.snapshot()}),version:'2.1'});
    }catch(error){message(error?.message||'Projektet kunde inte öppnas.',true);}
  }
  window.addEventListener('tillsyno-authorized',()=>void boot());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void boot(),{once:true});else void boot();
})();
