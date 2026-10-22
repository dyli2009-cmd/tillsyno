/* Projektering 2.8: local reusable library management, separate from project data. */
(function(root){
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv');
  const values=value=>Array.isArray(value)?value:Object.values(value||{});
  function create(options={}){
    const document=options.button?.ownerDocument||root.document,L=root.Proj2Library,D=options.data||root.Proj2Data;
    if(!document||!L?.validate||typeof options.getLibrary!=='function'||typeof options.getProject!=='function'||typeof options.save!=='function')throw Error('Bibliotekets inställningar kunde inte öppnas.');
    const dialog=document.createElement('dialog');dialog.id='libraryManagerDialog';dialog.className='p2-library-manager';dialog.setAttribute('aria-labelledby','libraryManagerTitle');
    dialog.innerHTML=`<div class="dialog-heading"><div><p class="eyebrow">Ditt bibliotek</p><h2 id="libraryManagerTitle">Bibliotek</h2></div><button type="button" class="icon-button" data-library-action="close" data-library-control aria-label="Stäng bibliotek">×</button></div>
      <p class="p2-library-intro">Återanvänd grupper, stenciler och produkter i nya projekt. Sparas på den här enheten.</p>
      <div class="p2-library-tabs" role="tablist" aria-label="Biblioteksdel"><button type="button" role="tab" data-library-tab="groups" data-library-control>Grupper</button><button type="button" role="tab" data-library-tab="products" data-library-control>Produkter</button><button type="button" role="tab" data-library-tab="backup" data-library-control>Säkerhetskopia</button></div>
      <p id="libraryManagerStatus" class="p2-library-status" role="status" aria-live="polite"></p>
      <section class="p2-library-panel" data-library-panel="groups" role="tabpanel" aria-label="Grupper">
        <form data-library-form="labels" class="p2-library-form p2-library-labels"><label for="libraryCardsLabel">Dörrkortens huvudgrupp<input id="libraryCardsLabel" data-library-control maxlength="60" required></label><label for="libraryOtherLabel">Symbolernas huvudgrupp<input id="libraryOtherLabel" data-library-control maxlength="60" required></label><button type="submit" class="button" data-library-control>Spara namn</button></form>
        <div class="p2-library-section-heading"><h3>Grupper</h3><button type="button" class="text-button" data-library-action="newGroup" data-library-control>Ny grupp</button></div>
        <form data-library-form="group" class="p2-library-form"><label for="libraryGroupName">Gruppnamn<input id="libraryGroupName" data-library-control maxlength="80" placeholder="T.ex. Entrédörrar" required></label><label for="libraryGroupSection">Huvudgrupp<select id="libraryGroupSection" data-library-control></select></label><label for="libraryGroupPrefixes" class="p2-library-wide">Beteckning börjar med<input id="libraryGroupPrefixes" data-library-control maxlength="999" placeholder="T.ex. GS, DBL"><span class="field-hint">Valfritt. Separera flera prefix med komma.</span></label><div class="p2-library-form-actions p2-library-wide"><button type="submit" class="button primary" data-library-control>Spara grupp</button><button type="button" class="text-button" data-library-action="newGroup" data-library-control>Rensa</button></div></form>
        <div id="libraryGroupsList" class="p2-library-list" aria-label="Bibliotekets grupper"></div>
        <div id="libraryDeleteGroup" class="p2-library-confirm" hidden><p id="libraryDeleteGroupText"></p><label for="libraryDeleteGroupTarget">Flytta gruppens stenciler till<select id="libraryDeleteGroupTarget" data-library-control></select></label><div class="p2-library-form-actions"><button type="button" class="button danger" data-library-action="confirmDeleteGroup" data-library-control>Flytta och ta bort</button><button type="button" class="text-button" data-library-action="cancelDeleteGroup" data-library-control>Avbryt</button></div></div>
        <div class="p2-library-section-heading"><h3>Stenciler</h3><span id="libraryStencilCount"></span></div><label class="p2-library-search" for="libraryStencilSearch">Sök stencil<input id="libraryStencilSearch" type="search" placeholder="Beteckning eller namn" autocomplete="off" data-library-control></label>
        <p class="p2-library-note">Välj grupp och synlighet i biblioteket. Redan placerade stämplar påverkas inte.</p><div id="libraryStencilsList" class="p2-library-list p2-library-stencils" aria-label="Stenciler och grupper"></div>
      </section>
      <section class="p2-library-panel" data-library-panel="products" role="tabpanel" aria-label="Produkter" hidden>
        <div class="p2-library-product-search"><label for="libraryProductSearch">Sök produkt<input id="libraryProductSearch" type="search" placeholder="Modell eller benämning" autocomplete="off" data-library-control></label><label for="libraryProductFilter">Kategori<select id="libraryProductFilter" data-library-control></select></label></div>
        <div class="p2-library-section-heading"><h3 id="libraryProductEditorTitle">Lägg till produkt</h3><button type="button" class="text-button" data-library-action="newProduct" data-library-control>Ny produkt</button></div>
        <form data-library-form="product" class="p2-library-form"><label for="libraryProductName">Produktnamn<input id="libraryProductName" data-library-control maxlength="160" placeholder="T.ex. 2002" required></label><label for="libraryProductCategory">Kategori<select id="libraryProductCategory" data-library-control></select></label><label for="libraryProductDescription" class="p2-library-wide">Beskrivning<textarea id="libraryProductDescription" data-library-control maxlength="400" rows="2" placeholder="Valfri beskrivning"></textarea></label><div class="p2-library-form-actions p2-library-wide"><button type="submit" class="button primary" data-library-control>Spara produkt</button><button type="button" class="text-button" data-library-action="newProduct" data-library-control>Rensa</button></div></form>
        <p class="p2-library-note">Produktändringar gäller framtida val. Texten på sparade dörrkort ändras inte.</p><p id="libraryProductCount" class="p2-library-note"></p><div id="libraryProductsList" class="p2-library-list" aria-label="Produkter i biblioteket"></div>
        <details class="p2-library-category-labels"><summary>Kategorinamn</summary><form data-library-form="category" class="p2-library-form"><label for="libraryCategoryKey">Kategori<select id="libraryCategoryKey" data-library-control></select></label><label for="libraryCategoryLabel">Visningsnamn<input id="libraryCategoryLabel" data-library-control maxlength="80" required></label><button type="submit" class="button" data-library-control>Spara kategorinamn</button></form></details>
      </section>
      <section class="p2-library-panel" data-library-panel="backup" role="tabpanel" aria-label="Säkerhetskopia" hidden>
        <h3>Spara biblioteket</h3><p>Hämta en separat biblioteksfil för att flytta dina grupper, stenciler och produkter till en annan enhet.</p><button type="button" class="button" data-library-action="export" data-library-control>Spara biblioteksfil</button>
        <h3>Öppna biblioteksfil</h3><p>Välj en fil och granska innehållet. Inget ändras förrän du bekräftar hur biblioteket ska sparas.</p><label class="p2-library-file" for="libraryBackupFile">Välj biblioteksfil<input id="libraryBackupFile" type="file" accept=".json,application/json" data-library-control></label>
        <div id="libraryImportReview" class="p2-library-import" hidden><p id="libraryImportSummary"></p><p>Sammanfoga lägger till nya poster och behåller motsvarande poster som redan finns. Ersätt byter hela biblioteket. Det öppna projektets sparade dörrkort ändras inte.</p><div class="p2-library-form-actions"><button type="button" class="button" data-library-action="mergeImport" data-library-control>Sammanfoga…</button><button type="button" class="button danger" data-library-action="replaceImport" data-library-control>Ersätt…</button></div></div>
        <div id="libraryImportConfirm" class="p2-library-confirm" hidden><h3 id="libraryImportConfirmTitle"></h3><p id="libraryImportConfirmText"></p><div class="p2-library-form-actions"><button type="button" class="button primary" data-library-action="confirmImport" data-library-control>Bekräfta</button><button type="button" class="text-button" data-library-action="cancelImport" data-library-control>Avbryt</button></div></div>
      </section>`;
    document.body.append(dialog);
    const $=id=>dialog.querySelector('#'+id),abort=new AbortController();
    let busy=false,destroyed=false,tab='groups',editingGroup=null,editingProduct=null,deletingGroup=null,pendingImport=null,importMode=null,importRead=0,productLimit=100,stencilLimit=150;
    let productEntries=[],stencilEntries=[],groupingSignature='',groupingCache=new Map();
    const library=()=>L.validate(options.getLibrary()),project=()=>options.getProject()||{};
    const listen=(target,name,callback)=>target.addEventListener(name,callback,{signal:abort.signal});
    function status(message='',error=false){$('libraryManagerStatus').textContent=message;$('libraryManagerStatus').dataset.level=error?'error':'success';}
    function controls(){for(const element of dialog.querySelectorAll('[data-library-control]'))element.disabled=busy||(element===$('libraryGroupSection')&&!!editingGroup);dialog.setAttribute('aria-busy',String(busy));}
    function keepFocus(render){
      const active=document.activeElement,key=dialog.contains(active)?active.getAttribute('data-library-focus'):null;render();
      if(key){const next=[...dialog.querySelectorAll('[data-library-focus]')].find(node=>node.getAttribute('data-library-focus')===key);next?.focus({preventScroll:true});}
    }
    function categories(lib){return L.categories(lib);}
    function categoryOptions(lib,selected,all=false){return(all?'<option value="all">Alla kategorier</option>':'')+categories(lib).map(entry=>`<option value="${escape(entry.id)}"${entry.id===selected?' selected':''}>${escape(entry.label)}</option>`).join('');}
    function renderGroups(lib){
      const section=$('libraryGroupSection').value||'cards';$('libraryGroupSection').innerHTML=['cards','other'].map(value=>`<option value="${value}"${value===section?' selected':''}>${escape(lib.labels[value])}</option>`).join('');
      $('libraryGroupsList').innerHTML=lib.groups.map(entry=>`<div class="p2-library-row"><div><strong>${escape(entry.name)}</strong><small>${escape(lib.labels[entry.section])}${entry.fallback?' · Standard för övriga':entry.prefixes.length?' · '+escape(entry.prefixes.join(', ')):''}</small></div><div class="p2-library-row-actions"><button type="button" class="text-button" data-library-group-edit="${escape(entry.id)}" data-library-control>Ändra</button><button type="button" class="text-button danger" data-library-group-delete="${escape(entry.id)}" data-library-control>Ta bort</button></div></div>`).join('');
    }
    function renderStencils(lib){
      const signature=JSON.stringify([lib.groups,lib.assignments]);if(signature!==groupingSignature){groupingSignature=signature;groupingCache.clear();}
      const sectionGroups={cards:L.groupsFor(lib,'cards'),other:L.groupsFor(lib,'other')};
      const all=new Map();for(const entry of values(lib.stencils))all.set(entry.code,entry);for(const entry of values(project().stencils))all.set(entry.code,entry);
      const query=fold($('libraryStencilSearch').value.trim()),hidden=new Set(lib.hiddenCodes);
      stencilEntries=[...all.values()].sort((a,b)=>a.code.localeCompare(b.code,'sv',{numeric:true,sensitivity:'base'}));
      const matches=stencilEntries.filter(entry=>!query||fold(entry.code+' '+entry.name).includes(query));
      $('libraryStencilCount').textContent=matches.length+' st';
      $('libraryStencilsList').innerHTML=matches.slice(0,stencilLimit).map(entry=>{
        const section=entry.kind==='card'?'cards':'other',groups=sectionGroups[section],key=section+':'+entry.code;
        if(!groupingCache.has(key)){const assigned=L.groupFor(lib,entry);groupingCache.set(key,typeof assigned==='string'?assigned:assigned?.id);}
        const groupId=groupingCache.get(key);
        return`<div class="p2-library-stencil-row"><div><strong>${escape(entry.code)}</strong><small>${escape(entry.name)}</small></div><label class="sr-only" for="library-stencil-group-${escape(entry.code)}">Grupp för ${escape(entry.code)}</label><select id="library-stencil-group-${escape(entry.code)}" data-library-stencil-group="${escape(entry.code)}" data-library-focus="stencil-group:${escape(entry.code)}" data-library-control aria-label="Grupp för ${escape(entry.code)}">${groups.map(group=>`<option value="${escape(group.id)}"${group.id===groupId?' selected':''}>${escape(group.name)}</option>`).join('')}</select><label class="p2-library-visible"><input type="checkbox" data-library-stencil-visible="${escape(entry.code)}" data-library-focus="stencil-visible:${escape(entry.code)}" data-library-control${hidden.has(entry.code)?'':' checked'}>Synlig</label></div>`;
      }).join('')||'<p class="p2-library-empty">Ingen stencil matchar sökningen.</p>';
      if(matches.length>stencilLimit)$('libraryStencilsList').insertAdjacentHTML('beforeend','<button type="button" class="text-button" data-library-action="moreStencils" data-library-control>Visa fler stenciler</button>');
    }
    function renderProducts(lib){
      const filter=$('libraryProductFilter').value||'all',editor=$('libraryProductCategory').value,key=$('libraryCategoryKey').value;
      $('libraryProductFilter').innerHTML=categoryOptions(lib,filter,true);$('libraryProductCategory').innerHTML=categoryOptions(lib,editor);$('libraryCategoryKey').innerHTML=categoryOptions(lib,key);
      const matches=L.searchProducts(lib,project(),$('libraryProductFilter').value,$('libraryProductSearch').value),owned=new Set([...(D.PRODUCTS||[]).map(entry=>entry.id),...lib.products.map(entry=>entry.id)]);productEntries=matches;
      $('libraryProductCount').textContent=(matches.length>productLimit?productLimit+' av ':'')+matches.length+' produkter';
      const labels=new Map(categories(lib).map(entry=>[entry.id,entry.label]));
      $('libraryProductsList').innerHTML=matches.slice(0,productLimit).map(entry=>`<div class="p2-library-row"><div><strong>${escape(entry.name)}</strong><small>${escape(labels.get(entry.category)||entry.category)}${entry.description?' · '+escape(entry.description):''}${owned.has(entry.id)?'':' · Från öppet projekt'}</small></div><div class="p2-library-row-actions"><button type="button" class="text-button" data-library-product-edit="${escape(entry.id)}" data-library-control>${owned.has(entry.id)?'Ändra':'Lägg i bibliotek'}</button><button type="button" class="text-button danger" data-library-product-delete="${escape(entry.id)}" data-library-control>Ta bort</button></div></div>`).join('')||'<p class="p2-library-empty">Ingen produkt matchar sökningen.</p>';
      if(matches.length>productLimit)$('libraryProductsList').insertAdjacentHTML('beforeend','<button type="button" class="text-button" data-library-action="moreProducts" data-library-control>Visa fler produkter</button>');
    }
    function refresh(){
      if(destroyed)return;try{const lib=library();keepFocus(()=>{renderGroups(lib);renderStencils(lib);renderProducts(lib);});controls();}catch(error){status(error?.message||'Biblioteket kunde inte visas.',true);}
    }
    async function write(transform,message,after){
      if(busy||destroyed)return false;busy=true;controls();status('Sparar biblioteket …');
      try{const next=L.validate(transform(library()));const result=await options.save(next);if(result===false)throw Error('Biblioteket kunde inte sparas. Försök igen.');after?.();refresh();status(message);return true;}
      catch(error){status(error?.message||'Biblioteket kunde inte sparas. Dina tidigare uppgifter har behållits.',true);return false;}
      finally{busy=false;controls();}
    }
    function resetGroup(){editingGroup=null;$('libraryGroupName').value='';$('libraryGroupSection').value='cards';$('libraryGroupPrefixes').value='';controls();}
    function resetProduct(preset={}){editingProduct=null;$('libraryProductEditorTitle').textContent='Lägg till produkt';$('libraryProductName').value=preset.name||'';$('libraryProductDescription').value=preset.description||'';if(preset.category&&[...$('libraryProductCategory').options].some(option=>option.value===preset.category))$('libraryProductCategory').value=preset.category;controls();}
    function setTab(next){tab=['groups','products','backup'].includes(next)?next:'groups';for(const button of dialog.querySelectorAll('[data-library-tab]')){button.setAttribute('aria-selected',String(button.dataset.libraryTab===tab));button.tabIndex=button.dataset.libraryTab===tab?0:-1;}for(const panel of dialog.querySelectorAll('[data-library-panel]'))panel.hidden=panel.dataset.libraryPanel!==tab;}
    function open(next='groups',preset){
      if(destroyed||busy)return;
      try{status();refresh();const lib=library();$('libraryCardsLabel').value=lib.labels.cards;$('libraryOtherLabel').value=lib.labels.other;resetGroup();resetProduct(preset||{});$('libraryCategoryLabel').value=categories(lib).find(entry=>entry.id===$('libraryCategoryKey').value)?.label||'';setTab(next);if(!dialog.open)dialog.showModal();}
      catch(error){if(!dialog.open)dialog.showModal();status(error?.message||'Biblioteket kunde inte öppnas.',true);}
    }
    function close(){if(busy)return;dialog.close();}
    function beginDeleteGroup(id){
      const lib=library(),entry=lib.groups.find(value=>value.id===id);if(!entry)return;deletingGroup=id;
      const targets=lib.groups.filter(value=>value.id!==id&&value.section===entry.section);
      $('libraryDeleteGroupText').textContent='Ta bort '+entry.name+'? Stencilerna och deras beteckningsregler flyttas till den grupp du väljer.'+(entry.fallback?' Den blir också standard för andra stenciler i samma huvudgrupp.':'');
      $('libraryDeleteGroupTarget').innerHTML=targets.map(value=>`<option value="${escape(value.id)}"${value.fallback?' selected':''}>${escape(value.name)}</option>`).join('')||'<option value="">Skapa en annan grupp först</option>';
      $('libraryDeleteGroup').hidden=false;$('libraryDeleteGroup').scrollIntoView({block:'nearest'});
    }
    function editGroup(id){const entry=library().groups.find(value=>value.id===id);if(!entry)return;editingGroup=entry;$('libraryGroupName').value=entry.name;$('libraryGroupSection').value=entry.section;$('libraryGroupPrefixes').value=entry.prefixes.join(', ');controls();$('libraryGroupName').scrollIntoView({block:'nearest'});}
    function editProduct(id){const entry=productEntries.find(value=>value.id===id);if(!entry)return;const lib=library(),owned=lib.products.some(value=>value.id===id)||(D.PRODUCTS||[]).some(value=>value.id===id);editingProduct=owned?entry:null;$('libraryProductEditorTitle').textContent=owned?'Ändra produkt':'Lägg till från projekt';$('libraryProductName').value=entry.name;$('libraryProductCategory').value=entry.category;$('libraryProductDescription').value=entry.description||'';$('libraryProductName').scrollIntoView({block:'nearest'});}
    async function exportLibrary(){
      try{const bytes=await L.pack(library()),url=root.URL.createObjectURL(new Blob([bytes],{type:'application/json;charset=utf-8'})),anchor=document.createElement('a');anchor.href=url;anchor.download='tillsyno-bibliotek.json';document.body.append(anchor);anchor.click();anchor.remove();root.setTimeout(()=>root.URL.revokeObjectURL(url),1000);status('Biblioteksfilen är skapad.');}catch(error){status(error?.message||'Biblioteksfilen kunde inte skapas.',true);}
    }
    function confirmImport(mode){if(!pendingImport)return;importMode=mode;$('libraryImportConfirmTitle').textContent=mode==='replace'?'Ersätt biblioteket?':'Sammanfoga biblioteken?';$('libraryImportConfirmText').textContent=mode==='replace'?'Dina nuvarande biblioteksgrupper, mallar och produkter ersätts med den granskade filens innehåll. Spara gärna en säkerhetskopia först.':'Nya poster läggs till. Motsvarande poster som redan finns behålls. Dolda stenciler och produkter från filen döljs även här.';$('libraryImportConfirm').hidden=false;$('libraryImportConfirm').scrollIntoView({block:'nearest'});}
    listen(dialog,'submit',event=>{
      event.preventDefault();if(busy)return;const form=event.target.dataset.libraryForm;
      if(form==='labels')void write(lib=>L.setLabels(lib,{cards:$('libraryCardsLabel').value,other:$('libraryOtherLabel').value}),'Huvudgruppernas namn är sparade.');
      else if(form==='group')void write(lib=>L.saveGroup(lib,{...(editingGroup?{id:editingGroup.id}:{}),name:$('libraryGroupName').value,section:editingGroup?.section||$('libraryGroupSection').value,prefixes:$('libraryGroupPrefixes').value.split(',').map(value=>value.trim()).filter(Boolean),fallback:!!editingGroup?.fallback}),'Gruppen är sparad.',resetGroup);
      else if(form==='product')void write(lib=>L.saveProduct(lib,{...(editingProduct?{id:editingProduct.id}:{}),name:$('libraryProductName').value,category:$('libraryProductCategory').value,description:$('libraryProductDescription').value}),'Produkten är sparad i biblioteket.',resetProduct);
      else if(form==='category')void write(lib=>L.setCategoryLabel(lib,$('libraryCategoryKey').value,$('libraryCategoryLabel').value),'Kategorinamnet är sparat.');
    });
    listen(dialog,'click',event=>{
      if(busy)return;const button=event.target.closest('button');if(!button||!dialog.contains(button))return;
      if(button.dataset.libraryTab){setTab(button.dataset.libraryTab);return;}
      if(button.dataset.libraryGroupEdit){editGroup(button.dataset.libraryGroupEdit);return;}
      if(button.dataset.libraryGroupDelete){beginDeleteGroup(button.dataset.libraryGroupDelete);return;}
      if(button.dataset.libraryProductEdit){editProduct(button.dataset.libraryProductEdit);return;}
      if(button.dataset.libraryProductDelete){const id=button.dataset.libraryProductDelete;void write(lib=>L.removeProduct(lib,id),'Produkten är borttagen från framtida biblioteksval.');return;}
      const action=button.dataset.libraryAction;
      if(action==='close')close();else if(action==='newGroup')resetGroup();else if(action==='newProduct')resetProduct();else if(action==='cancelDeleteGroup'){$('libraryDeleteGroup').hidden=true;deletingGroup=null;}
      else if(action==='confirmDeleteGroup'){const id=deletingGroup,target=$('libraryDeleteGroupTarget').value;if(!id||!target){status('Skapa eller välj en annan grupp innan gruppen tas bort.',true);return;}void write(lib=>L.removeGroup(lib,id,target),'Gruppen är borttagen och stencilernas gruppval är flyttade.',()=>{deletingGroup=null;$('libraryDeleteGroup').hidden=true;resetGroup();});}
      else if(action==='moreProducts'){productLimit+=100;refresh();}else if(action==='moreStencils'){stencilLimit+=150;refresh();}
      else if(action==='export')void exportLibrary();else if(action==='mergeImport')confirmImport('merge');else if(action==='replaceImport')confirmImport('replace');
      else if(action==='cancelImport'){$('libraryImportConfirm').hidden=true;importMode=null;}
      else if(action==='confirmImport'&&pendingImport&&importMode){const imported=pendingImport,mode=importMode;void write(lib=>mode==='replace'?L.validate(imported):L.merge(lib,imported),mode==='replace'?'Biblioteket är ersatt.':'Biblioteken är sammanfogade.',()=>{pendingImport=null;importMode=null;$('libraryImportReview').hidden=true;$('libraryImportConfirm').hidden=true;$('libraryBackupFile').value='';const saved=library();$('libraryCardsLabel').value=saved.labels.cards;$('libraryOtherLabel').value=saved.labels.other;resetGroup();resetProduct();});}
    });
    listen(dialog,'input',event=>{if(busy)return;if(event.target===$('libraryStencilSearch')){stencilLimit=150;refresh();}else if(event.target===$('libraryProductSearch')){productLimit=100;refresh();}else status();});
    listen(dialog,'change',event=>{
      if(busy)return;const target=event.target;
      if(target.dataset.libraryStencilGroup){const name=target.dataset.libraryStencilGroup,value=target.value;void write(lib=>L.assignGroup(lib,name,value),'Stencilens grupp är sparad.');}
      else if(target.dataset.libraryStencilVisible){const name=target.dataset.libraryStencilVisible,hidden=!target.checked;void write(lib=>L.setHidden(lib,name,hidden),'Stencilens synlighet är sparad.');}
      else if(target===$('libraryProductFilter')){productLimit=100;refresh();}
      else if(target===$('libraryCategoryKey'))$('libraryCategoryLabel').value=categories(library()).find(entry=>entry.id===target.value)?.label||'';
      else if(target===$('libraryBackupFile'))void(async()=>{const file=target.files?.[0],read=++importRead;pendingImport=null;importMode=null;$('libraryImportReview').hidden=true;$('libraryImportConfirm').hidden=true;if(!file)return;try{if(file.size>L.LIMITS.fileBytes)throw Error('Biblioteksfilen får vara högst 5 MB.');const imported=L.unpack(new Uint8Array(await file.arrayBuffer()));if(destroyed||read!==importRead)return;pendingImport=imported;$('libraryImportSummary').textContent=file.name+': '+imported.groups.length+' grupper, '+imported.stencils.length+' stencilmallar och '+imported.products.length+' sparade produkter.';$('libraryImportReview').hidden=false;status('Filen är granskad. Välj hur den ska sparas.');}catch(error){if(!destroyed&&read===importRead)status(error?.message||'Biblioteksfilen kunde inte läsas. Det nuvarande biblioteket har behållits.',true);}})();
    });
    listen(dialog,'cancel',event=>{if(busy)event.preventDefault();});
    listen(dialog,'keydown',event=>{const current=event.target.closest('[data-library-tab]');if(!current||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||busy)return;event.preventDefault();const buttons=[...dialog.querySelectorAll('[data-library-tab]')],index=buttons.indexOf(current),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;setTab(buttons[next].dataset.libraryTab);buttons[next].focus();});
    if(options.button)listen(options.button,'click',()=>open());
    return Object.freeze({open,refresh,close,destroy(){if(destroyed)return;destroyed=true;abort.abort();dialog.remove();}});
  }
  root.Proj2LibraryUI=Object.freeze({create});
})(typeof window==='object'?window:globalThis);
