/* Fristående projekteringsdemo. Befintlig Avläsning och SmartMatch ändras inte. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const copy = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let data, project, selectedDoor, activeCode, chosenCode, draft, dirty = false, zoom = 1, started = false, busy = false;
  let productRow = null, confirmResolve = null, damagedStorage = false, storageAvailable = true, messageTimer;
  const rowDefinitions = () => data.SECTIONS.flatMap(section => section.rows.map(row => ({...row, section:section.title})));
  const door = () => project.doors.find(item => item.id === selectedDoor);
  const setMessage = (text, error = false) => {
    $('appMessage').textContent = text;
    $('appMessage').dataset.level = error ? 'error' : 'success';
    clearTimeout(messageTimer);
    if (!error) messageTimer = setTimeout(() => { $('appMessage').textContent = ''; }, 6000);
    if ($('productMessage') && $('productDialog').open) {
      $('productMessage').textContent = text;
      $('productMessage').style.color = error ? 'var(--error)' : 'var(--muted)';
    }
  };
  function status() {
    $('saveStatus').textContent = dirty ? 'Dörrkortet har osparade ändringar' : damagedStorage ? 'Den tidigare lokala kopian är oläsbar' : storageAvailable ? 'Sparat på den här enheten' : 'Lokal lagring är inte tillgänglig';
    $('saveStatus').dataset.state = dirty ? 'pending' : 'saved';
    $('cardStatus').textContent = dirty ? 'Osparade ändringar' : project.cards[activeCode] ? 'Sparat dörrkort' : 'Nytt dörrkort';
    $('saveCard').disabled = busy || (!dirty && !!project.cards[activeCode]);
  }
  function ask({title, text, accept = 'Fortsätt', discard = ''}) {
    if (confirmResolve) return Promise.resolve('cancel');
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    $('confirmAccept').textContent = accept;
    $('confirmDiscard').textContent = discard;
    $('confirmDiscard').hidden = !discard;
    $('confirmDialog').showModal();
    return new Promise(resolve => { confirmResolve = resolve; });
  }
  function resolveConfirm(value) {
    $('confirmDialog').close();
    const resolve = confirmResolve; confirmResolve = null; resolve?.(value);
  }
  async function commit(mutate, message) {
    if (damagedStorage) {
      const answer = await ask({title:'Ersätt den oläsbara lokala kopian?', text:'Den tidigare lokala kopian gick inte att öppna. Detta sparar det projekt som visas nu i stället.', accept:'Spara detta projekt'});
      if (answer !== 'accept') return false;
    }
    const next = copy(project);
    mutate(next);
    const valid = data.validate(next);
    data.save(valid); // A failed save never replaces the active committed state.
    project = valid;
    damagedStorage = false; storageAvailable = true;
    if (message) setMessage(message);
    return true;
  }
  function changed() {
    const saved = project.cards[activeCode] || data.createCard(activeCode, draft.shape);
    dirty = JSON.stringify(draft) !== JSON.stringify(saved) || !project.cards[activeCode];
    status();
  }
  async function saveCard() {
    if (!dirty && project.cards[activeCode]) return true;
    const code = activeCode, current = copy(draft);
    if (!await commit(next => {
      data.ensureCard(next, code, current.shape);
      data.updateCard(next, code, current);
    }, `${code} är sparat. Alla dörrar med samma beteckning använder detta dörrkort.`)) return false;
    draft = copy(project.cards[code]); dirty = false; renderAll();
    return true;
  }
  async function leaveDraft() {
    if (!dirty) return true;
    const answer = await ask({title:`Spara ändringar i ${activeCode}?`, text:'Det sparade dörrkortet används av alla dörrar med samma beteckning.', accept:'Spara ändringar', discard:'Lämna utan att spara'});
    if (answer === 'accept') return saveCard();
    if (answer === 'discard') { dirty = false; return true; }
    return false;
  }
  function setCard(code) {
    activeCode = code; chosenCode = code;
    draft = copy(project.cards[code] || data.createCard(code));
    dirty = false;
  }
  async function selectDoor(id) {
    if (!await leaveDraft()) return;
    const target = project.doors.find(item => item.id === id);
    if (!target) throw Error('Dörren finns inte i projektet.');
    selectedDoor = id; setCard(target.code); renderAll();
    if (matchMedia('(max-width: 1050px)').matches) showView('card');
  }
  async function chooseCode(code) {
    if (!await leaveDraft()) return;
    setCard(data.normalizeCode(code)); renderAll();
    if (matchMedia('(max-width: 1050px)').matches) { showView('drawing'); setMessage(`${chosenCode} är vald. Tryck Placera för att använda den på ${selectedDoor}.`); }
  }
  function renderLibrary() {
    const query = $('stampSearch').value.trim().toUpperCase().replace(/\s/g, '');
    const codes = data.listCodes(project);
    $('stampCodes').innerHTML = codes.map(code => `<option value="${esc(code)}"></option>`).join('');
    const found = codes.filter(code => !query || code.includes(query));
    $('stampList').innerHTML = found.length ? found.map(code => {
      const card = project.cards[code], count = project.doors.filter(item => item.code === code).length;
      const shape = card?.shape || (['DA','DS','DADS'].includes(code) ? 'square' : 'oval');
      return `<button type="button" class="stamp-choice${chosenCode === code ? ' is-active' : ''}" data-code="${esc(code)}" aria-pressed="${chosenCode === code}"><span class="stamp-preview ${shape === 'square' ? 'stamp-square' : 'stamp-oval'}">${esc(code)}</span><small>${count ? `${count} dörrar` : card ? 'Sparat kort' : 'Skapa kort'}</small></button>`;
    }).join('') : '<p class="empty-note">Ingen stämpel hittades. Skapa en egen nedan.</p>';
    $('selectedStamp').textContent = chosenCode;
  }
  function renderDrawing() {
    const host = $('drawingHost'), left = host.scrollLeft, top = host.scrollTop;
    host.innerHTML = ProjPDF.renderPlanSVG(project, selectedDoor);
    const svg = host.querySelector('svg');
    if (svg) { svg.classList.add('plan-svg'); svg.style.width = `${zoom * 100}%`; svg.style.minWidth = '0'; }
    host.scrollLeft = left; host.scrollTop = top;
    $('drawingTitle').textContent = `${project.project.name} · ${project.doors.length} dörrar`;
    $('doorSelect').innerHTML = project.doors.map(item => `<option value="${esc(item.id)}"${item.id === selectedDoor ? ' selected' : ''}>${esc(item.id)} · ${esc(item.code)} · ${esc(item.room)}</option>`).join('');
    $('doorCode').value = chosenCode;
    $('selectedDoorName').textContent = `${door().id} · ${door().room}`;
    if ($('removeStamp')) $('removeStamp').hidden = true;
  }
  function renderCard() {
    $('cardCode').textContent = activeCode;
    const count = project.doors.filter(item => item.code === activeCode).length;
    $('cardUsage').textContent = count === 1 ? 'Används av 1 dörr' : `Används av ${count} dörrar`;
    $('cardShape').value = draft.shape;
    $('cardNote').value = draft.note || '';
    $('cardRows').innerHTML = data.SECTIONS.map(section => {
      const rows = section.rows.map(def => {
        const row = draft.rows.find(item => item.id === def.id);
        const owner = field => `<select data-row-id="${esc(row.id)}" data-field="${field}" aria-label="${esc(section.title)} ${esc(row.label)} ${field === 'delivery' ? 'levereras av' : 'monteras av'}">${[...new Set(['', ...data.OWNER_VALUES, row[field]])].map(value => `<option${row[field] === value ? ' selected' : ''} value="${esc(value)}">${esc(value || '–')}</option>`).join('')}</select>`;
        return `<tr data-row-id="${esc(row.id)}"><th scope="row">${esc(row.label)}</th><td class="product-cell"><button type="button" class="product-pick${row.product ? ' has-product' : ''}" data-action="choose-product" data-row-id="${esc(row.id)}" data-field="product" aria-label="Välj produkt för ${esc(section.title)} ${esc(row.label)}">${esc(row.product || 'Välj produkt')}<span aria-hidden="true">⌕</span></button>${row.product ? `<button type="button" class="clear-product" data-action="clear-product" data-row-id="${esc(row.id)}" aria-label="Ta bort produkt från ${esc(section.title)} ${esc(row.label)}">×</button>` : ''}</td><td><input type="number" min="1" max="999" step="1" value="${row.quantity}" data-row-id="${esc(row.id)}" data-field="quantity" aria-label="${esc(section.title)} ${esc(row.label)} antal"></td><td>${owner('delivery')}</td><td>${owner('installer')}</td></tr>`;
      }).join('');
      return `<details class="card-section" open><summary>${esc(section.title)}</summary><div class="card-table-wrap"><table><thead><tr><th scope="col">Komponent</th><th scope="col">Produkt</th><th scope="col">Antal</th><th scope="col">Lev av</th><th scope="col">Mont av</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
    }).join('');
    status();
  }
  function renderAll() {
    $('projectName').value = project.project.name;
    $('doorCount').textContent = project.doors.length;
    $('cardCount').textContent = new Set(project.doors.map(item => item.code)).size;
    renderLibrary(); renderDrawing(); renderCard();
  }
  function showView(view) {
    document.body.dataset.view = view;
    document.querySelectorAll('button[data-view]').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active));
    });
  }
  function currentDefinition() { return rowDefinitions().find(row => row.id === productRow); }
  function renderProducts() {
    const definition = currentDefinition();
    const products = data.searchProducts(project, definition.category, $('productSearch').value);
    $('productList').innerHTML = products.length ? products.map(item => `<button class="product-choice" type="button" data-product-id="${esc(item.id)}"><strong>${esc(item.name)}</strong><span>${esc(item.description || 'Egen produkt')}</span></button>`).join('') : '<p class="empty-note">Ingen produkt hittades. Du kan lägga till en egen nedan.</p>';
  }
  function openProducts(rowId) {
    productRow = rowId;
    const def = currentDefinition();
    $('productTitle').textContent = `${def.section} · ${def.label}`;
    $('productSearch').value = ''; $('customProductName').value = '';
    $('productMessage').textContent = '';
    $('customProductCategory').innerHTML = `<option value="${esc(def.category)}">${esc(def.label)}</option>`;
    $('customProductCategory').disabled = true;
    renderProducts(); $('productDialog').showModal(); $('productSearch').focus();
  }
  function setProduct(name) {
    const row = draft.rows.find(item => item.id === productRow);
    row.product = name;
    changed(); renderCard(); $('productDialog').close();
    $('cardRows').querySelector(`[data-action="choose-product"][data-row-id="${CSS.escape(productRow)}"]`)?.focus();
  }
  function download(bytes, name, type) {
    const url = URL.createObjectURL(new Blob([bytes], {type}));
    const link = document.createElement('a'); link.href = url; link.download = name;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  const filename = () => project.project.name.replace(/[^a-zA-Z0-9åäöÅÄÖ_-]+/g, '-').slice(0, 65) || 'projektering';
  async function exportPDF(mode) {
    if (!await leaveDraft()) return;
    const snapshot = data.validate(project);
    setMessage('Skapar sökbar PDF …');
    const bytes = await ProjPDF.build(snapshot, {mode});
    download(bytes, `${filename()}-${mode === 'combined' ? 'ritning-och-dorrkort' : mode === 'drawing' ? 'ritning' : 'dorrkort'}.pdf`, 'application/pdf');
    setMessage('PDF skapad med sökbara beteckningar och sparade dörrkort. Öppna den i Avläsning för att granska matchningen.');
  }
  async function importFile(file) {
    if (!file) return;
    if (file.size > 32 * 1024 * 1024) throw Error('Projektfilen får vara högst 32 MB. Öppna en projektfil eller PDF som sparats från denna demo.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const raw = /\.pdf$/i.test(file.name) || new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-' ? await ProjPDF.read(bytes) : JSON.parse(new TextDecoder().decode(bytes));
    const valid = data.validate(raw);
    const answer = await ask({title:'Öppna projektet?', text:`${valid.project.name} innehåller ${valid.doors.length} dörrar. Det ersätter projektet som visas på den här enheten. Spara en projektkopia först om du vill behålla det nuvarande.`, accept:'Öppna projekt'});
    if (answer !== 'accept') return;
    data.save(valid); project = valid; damagedStorage = false; storageAvailable = true;
    selectedDoor = project.doors[0].id; setCard(door().code); renderAll(); showView('drawing');
    setMessage('Projektet är öppnat. Sparade dörrkort, stämplar och egna produkter har följt med.');
  }
  async function action(task) {
    if (busy) return;
    busy = true;
    try { await task(); }
    catch (error) { setMessage(error?.message || 'Åtgärden kunde inte slutföras.', true); $('projectName').value = project.project.name; }
    finally { busy = false; status(); }
  }
  function bind() {
    const productMessage = document.createElement('p'); productMessage.id = 'productMessage';
    productMessage.className = 'dialog-footnote'; productMessage.setAttribute('role', 'status');
    $('productList').before(productMessage);
    $('stampSearch').addEventListener('input', renderLibrary);
    $('stampList').addEventListener('click', event => { const button = event.target.closest('[data-code]'); if (button) void action(() => chooseCode(button.dataset.code)); });
    $('drawingHost').addEventListener('click', event => { const target = event.target.closest('[data-door-id]'); if (target) void action(() => selectDoor(target.dataset.doorId)); });
    $('drawingHost').addEventListener('keydown', event => { const target = event.target.closest('[data-door-id]'); if (target && ['Enter',' '].includes(event.key)) { event.preventDefault(); void action(() => selectDoor(target.dataset.doorId)); } });
    $('doorSelect').addEventListener('change', event => { const id = event.target.value; void action(async () => { await selectDoor(id); $('doorSelect').value = selectedDoor; }); });
    $('createStamp').addEventListener('click', () => void action(async () => {
      const code = data.normalizeCode($('customCode').value), shape = $('stampShape').value;
      if (!await leaveDraft()) return;
      if (!await commit(next => data.ensureCard(next, code, shape), `${code} finns nu i stämpelbiblioteket.`)) return;
      setCard(code); $('customCode').value = ''; $('stampSearch').value = ''; renderAll();
    }));
    $('applyStamp').addEventListener('click', () => void action(async () => {
      const code = data.normalizeCode($('doorCode').value || chosenCode), shape = project.cards[code]?.shape || (['DA','DS','DADS'].includes(code) ? 'square' : 'oval');
      if (!await leaveDraft()) return;
      if (!await commit(next => data.assignDoor(next, selectedDoor, code, shape), `${selectedDoor} använder nu ${code}. Dörrkortet delas med alla andra ${code}-dörrar.`)) return;
      setCard(code); renderAll();
    }));
    $('cardRows').addEventListener('click', event => {
      const button = event.target.closest('[data-action]'); if (!button || busy) return;
      if (button.dataset.action === 'choose-product') openProducts(button.dataset.rowId);
      else if (button.dataset.action === 'clear-product') { draft.rows.find(row => row.id === button.dataset.rowId).product = ''; changed(); renderCard(); }
    });
    $('cardRows').addEventListener('input', event => {
      if (busy) return;
      const target = event.target, row = draft.rows.find(item => item.id === target.dataset.rowId);
      if (!row || !['quantity','delivery','installer'].includes(target.dataset.field)) return;
      row[target.dataset.field] = target.dataset.field === 'quantity' ? Number(target.value) : target.value;
      changed();
    });
    $('cardNote').addEventListener('input', event => { if (!busy) { draft.note = event.target.value; changed(); } });
    $('cardShape').addEventListener('change', event => { if (!busy) { draft.shape = event.target.value; changed(); } });
    $('saveCard').addEventListener('click', () => void action(saveCard));
    $('productSearch').addEventListener('input', renderProducts);
    $('productList').addEventListener('click', event => {
      const button = event.target.closest('[data-product-id]'); if (!button || busy) return;
      const item = data.searchProducts(project, currentDefinition().category, '').find(product => product.id === button.dataset.productId);
      if (item) setProduct(item.name);
    });
    $('addProduct').addEventListener('click', () => void action(async () => {
      const name = $('customProductName').value.trim();
      if (!name) throw Error('Skriv produktens namn eller modell först.');
      const category = currentDefinition().category;
      let added;
      if (!await commit(next => { added = data.addProduct(next, {name, category, description:'Egen produkt'}); }, 'Produkten är sparad i projektets katalog. Spara dörrkortet för att använda den där.')) return;
      setProduct(added.name);
    }));
    $('closeProduct').addEventListener('click', () => $('productDialog').close());
    $('saveProject').addEventListener('click', () => void action(async () => {
      if (!await leaveDraft()) return;
      download(data.serialize(project), `${filename()}.tillsyno-projekt.json`, 'application/json');
      setMessage('Projektfilen är skapad. Öppna den här för att fortsätta med samma dörrkort och stämplar.');
    }));
    $('openProject').addEventListener('click', () => $('projectFile').click());
    $('projectFile').addEventListener('change', event => { const file = event.target.files[0]; event.target.value = ''; void action(() => importFile(file)); });
    $('exportPdf').addEventListener('click', () => void action(() => exportPDF('combined')));
    $('exportDrawing').addEventListener('click', () => void action(() => exportPDF('drawing')));
    $('exportCards').addEventListener('click', () => void action(() => exportPDF('cards')));
    $('newProject').addEventListener('click', () => void action(async () => {
      const answer = await ask({title:'Starta om med exempelprojektet?', text:'Spara en projektfil först om du vill behålla dina ändringar. Detta ersätter den lokala kopian med 50 exempeldörrar.', accept:'Starta om exemplet'});
      if (answer !== 'accept') return;
      const next = data.createDemo(); data.save(next); project = next; damagedStorage = false; storageAvailable = true;
      selectedDoor = project.doors[0].id; setCard(door().code); $('stampSearch').value = ''; renderAll(); showView('drawing');
      setMessage('Ett nytt exempelprojekt med 50 dörrar är klart.');
    }));
    $('projectName').addEventListener('change', () => void action(async () => {
      const name = $('projectName').value.trim();
      if (!await commit(next => { next.project.name = name; next.project.revision++; next.project.updatedAt = new Date().toISOString(); }, 'Projektnamnet är sparat.')) $('projectName').value = project.project.name;
    }));
    for (const [id, delta] of [['zoomIn', .25], ['zoomOut', -.25]]) $(id).addEventListener('click', () => { zoom = Math.max(.5, Math.min(4, zoom + delta)); renderDrawing(); });
    $('zoomFit').addEventListener('click', () => { zoom = 1; renderDrawing(); });
    document.querySelectorAll('button[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
    $('help').addEventListener('click', () => $('helpDialog').showModal());
    $('helpDialog').querySelectorAll('[data-close], .dialog-close').forEach(button => button.addEventListener('click', () => $('helpDialog').close()));
    $('confirmAccept').addEventListener('click', () => resolveConfirm('accept'));
    $('confirmDiscard').addEventListener('click', () => resolveConfirm('discard'));
    $('confirmCancel').addEventListener('click', () => resolveConfirm('cancel'));
    $('confirmDialog').addEventListener('cancel', event => { event.preventDefault(); resolveConfirm('cancel'); });
    window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  }
  function boot() {
    if (started || !window.TillsynoCurrentAccess) return;
    started = true;
    try {
      data = window.ProjData;
      try { project = data.load(); } catch (error) { damagedStorage = true; setMessage('Den tidigare lokala kopian kunde inte öppnas. Den har inte skrivits över. Öppna en sparad projektfil eller välj Nytt exempel.', true); }
      if (!project) { project = data.createDemo(); if (!damagedStorage) { try { data.save(project); } catch (_) { storageAvailable = false; setMessage('Lokal lagring är inte tillgänglig. Tillåt lagring för att kunna spara ändringar.', true); } } }
      selectedDoor = project.doors[0].id; setCard(door().code); bind(); renderAll(); showView('drawing');
      window.ProjApp = Object.freeze({snapshot:() => ({project:copy(project), selectedDoor, activeCode, chosenCode, draft:copy(draft), dirty}), version:'1.0'});
    } catch (error) { setMessage(error?.message || 'Projektet kunde inte öppnas.', true); }
  }
  window.addEventListener('tillsyno-authorized', boot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
