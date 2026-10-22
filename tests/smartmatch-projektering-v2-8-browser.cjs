'use strict';
// Real library/project IndexedDB with generated PDF and shared auth/license fixture.
// No screenshots, generated images, or cloud writes are used.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs'),base=fs.readFileSync(file,'utf8');
const start=base.indexOf('async function run(browser,device,source){'),end=base.indexOf('async function denied(browser){',start);
if(start<0||end<0)throw Error('Missing shared browser fixture boundaries');
function suite28(){
const catalog28=page=>page.evaluate(()=>Proj2App.librarySnapshot());
const product28=(page,id)=>page.locator('#cardRows input[data-product-input][data-row-id="'+id+'"]');
const row28=(page,id)=>page.locator('#cardRows tr[data-row-id="'+id+'"]');
async function type28(page,input,text){
 // A user types after bringing a field into view. Let the fixture's automatic
 // focus scrolling finish before sending input, so that scroll is not mistaken
 // for a later deliberate dismissal of an already-open suggestions list.
 await input.scrollIntoViewIfNeeded();await input.focus();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await input.fill(text);
}
async function manager28(page,tab='groups'){
 if(!await page.locator('#libraryManagerDialog').evaluate(node=>node.open)){await view(page,'stencils');await page.locator('#manageLibrary').click();}
 await page.locator('[data-library-tab="'+tab+'"]').click();
 await page.waitForFunction(()=>document.getElementById('libraryManagerDialog').getAttribute('aria-busy')!=='true');
 const box=await page.locator('#libraryManagerDialog').evaluate(node=>({left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,width:innerWidth,content:node.scrollWidth,client:node.clientWidth}));
 assert(box.left>=0&&box.right<=box.width+1&&box.content<=box.client+1,'library manager fits the viewport without horizontal clipping: '+JSON.stringify(box));
}
async function closeManager28(page){await page.locator('[data-library-action="close"]').click();await page.waitForSelector('#libraryManagerDialog[open]',{state:'hidden'});}
async function write28(page,action){
 const before=(await catalog28(page)).revision;await action();
 await page.waitForFunction(revision=>Proj2App.librarySnapshot().revision>revision,before);
 await page.waitForFunction(()=>document.getElementById('libraryManagerDialog').getAttribute('aria-busy')!=='true');
 assert.notEqual(await page.locator('#libraryManagerStatus').getAttribute('data-level'),'error',await page.locator('#libraryManagerStatus').textContent());
}
async function form28(page,name){await write28(page,()=>page.locator('[data-library-form="'+name+'"] button[type="submit"]').click());}
async function addProduct28(page,name,category,description=''){
 await page.locator('[data-library-action="newProduct"]').first().click();
 await page.locator('#libraryProductName').fill(name);await page.locator('#libraryProductCategory').selectOption(category);await page.locator('#libraryProductDescription').fill(description);await form28(page,'product');
 return (await catalog28(page)).products.find(product=>product.name===name).id;
}
async function newProject28(page){
 if(!await page.locator('.project-menu').evaluate(node=>node.open))await page.locator('.project-menu>summary').click();
 await page.locator('#newProject').click();
 await page.waitForFunction(()=>document.getElementById('confirmDialog').open||document.getElementById('drawingHost').getAttribute('aria-busy')!=='true');
 if(await page.locator('#confirmDialog').evaluate(node=>node.open))await confirm(page);
 await page.waitForFunction(()=>!Proj2App.snapshot().state.drawing.pages.length&&!Object.keys(Proj2App.snapshot().state.cards).length);await idle(page);
}
async function groups28(page){
 await manager28(page);await page.locator('#libraryCardsLabel').fill('Dörrtyper');await page.locator('#libraryOtherLabel').fill('Symboler');await form28(page,'labels');
 await page.locator('#libraryGroupName').fill('Branddörrar');await page.locator('#libraryGroupPrefixes').fill('BR');await form28(page,'group');
 let lib=await catalog28(page),brand=lib.groups.find(group=>group.name==='Branddörrar').id;
 await page.locator('#libraryStencilSearch').fill('GS1');
 await write28(page,()=>page.locator('[data-library-stencil-group="GS1"]').selectOption(brand));
 await page.locator('[data-library-group-edit="'+brand+'"]').click();await page.locator('#libraryGroupName').fill('Brand och entré');await form28(page,'group');
 await page.locator('[data-library-action="newGroup"]').first().click();await page.locator('#libraryGroupName').fill('Tillfällig');await page.locator('#libraryGroupPrefixes').fill('TMP');await form28(page,'group');
 lib=await catalog28(page);const temporary=lib.groups.find(group=>group.name==='Tillfällig').id;
 await page.locator('#libraryStencilSearch').fill('GS2');await write28(page,()=>page.locator('[data-library-stencil-group="GS2"]').selectOption(temporary));
 await page.locator('[data-library-group-delete="'+temporary+'"]').click();await page.locator('#libraryDeleteGroupTarget').selectOption(brand);await write28(page,()=>page.locator('[data-library-action="confirmDeleteGroup"]').click());
 lib=await catalog28(page);assert.equal(lib.assignments.GS1,brand);assert.equal(lib.assignments.GS2,brand);assert(!lib.groups.some(group=>group.id===temporary));
 await write28(page,()=>page.locator('[data-library-stencil-visible="GS2"]').uncheck());assert((await catalog28(page)).hiddenCodes.includes('GS2'));
 await closeManager28(page);await view(page,'stencils');await page.locator('#stampSearch').fill('GS2');assert.equal(await page.locator('#stampList [data-stencil-id="GS2"]').count(),0);
 await manager28(page);await page.locator('#libraryStencilSearch').fill('GS2');await write28(page,()=>page.locator('[data-library-stencil-visible="GS2"]').check());await closeManager28(page);
 await view(page,'stencils');await page.locator('#stampSearch').fill('');
 assert.deepEqual(await page.locator('#stencilCategories button').allTextContents(),['Dörrtyper','Symboler']);
 await page.locator('#stencilCategories [data-stencil-category="cards"]').click();await page.locator('#stencilCardGroups [data-card-group="'+brand+'"]').click();
 assert.equal(await page.locator('#stampList [data-stencil-id="GS1"]').count(),1);assert.equal(await page.locator('#stampList [data-stencil-id="GS2"]').count(),1);
 await page.locator('#newStencil').click();await page.waitForSelector('#stencilDialog[open]');await page.locator('#stencilCode').fill('BR1');await page.locator('#stencilName').fill('Branddörr egen');await page.locator('#stencilFill').fill('#123456');await page.locator('#stencilStroke').fill('#654321');await page.locator('#stencilCategory').selectOption(brand);await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});await idle(page);
 lib=await catalog28(page);assert.equal(lib.stencils.find(stencil=>stencil.code==='BR1').fill,'#123456');assert.equal((await snap(page)).state.stencils.BR1.fill,'#123456');assert.equal(lib.assignments.BR1,brand);
 await manager28(page,'products');const sw=await addProduct28(page,'SW350','operator'),sensor=await addProduct28(page,'Sensor X','operator');await addProduct28(page,'AUTOMATIK ANNAN','operator','S in description must not match');await addProduct28(page,'8888','cylinder');
 await page.locator('.p2-library-category-labels>summary').click();await page.locator('#libraryCategoryKey').selectOption('operator');await page.locator('#libraryCategoryLabel').fill('Motorer');await form28(page,'category');await closeManager28(page);
 lib=await catalog28(page);await page.reload();await ready(page);assert.deepEqual(await catalog28(page),lib);
 await newProject28(page);assert.equal((await snap(page)).state.stencils.BR1.fill,'#123456');assert.deepEqual(await catalog28(page),lib,'new project retains the reusable library');
 return {brand,sw,sensor};
}
async function stencilRetry28(page){
 await view(page,'stencils');await page.locator('#newStencil').click();await page.waitForSelector('#stencilDialog[open]');await page.locator('#stencilCode').fill('RETRY1');await page.locator('#stencilName').fill('Retry preserves this name');await page.locator('#stencilFill').fill('#225588');
 await page.evaluate(()=>{window.__stencilTransaction28=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args){if(this.name===Proj2Library.DB_NAME&&args[1]==='readwrite')throw new DOMException('QA stencil library quota','QuotaExceededError');return window.__stencilTransaction28.apply(this,args);};});
 try{
  await page.locator('#saveStencil').click();await page.waitForFunction(()=>document.getElementById('appMessage').dataset.level==='error'&&document.getElementById('drawingHost').getAttribute('aria-busy')!=='true');
  assert.equal(await page.locator('#stencilDialog').evaluate(node=>node.open),true);assert.equal(await page.locator('#stencilCode').inputValue(),'RETRY1');assert.equal(await page.locator('#stencilName').inputValue(),'Retry preserves this name');assert.equal(await page.locator('#stencilFill').inputValue(),'#225588');
  assert.equal((await snap(page)).state.stencils.RETRY1.fill,'#225588');assert(!(await catalog28(page)).stencils.some(stencil=>stencil.code==='RETRY1'));
  assert((await page.locator('#appMessage').textContent()).includes('biblioteket kunde inte sparas'));
 }finally{await page.evaluate(()=>{IDBDatabase.prototype.transaction=window.__stencilTransaction28;delete window.__stencilTransaction28;});}
 await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});await idle(page);assert.equal(Object.values((await snap(page)).state.stencils).filter(stencil=>stencil.code==='RETRY1').length,1);assert.equal((await catalog28(page)).stencils.find(stencil=>stencil.code==='RETRY1').fill,'#225588','retry saves the existing project stencil to the catalog');
}
async function cards28(page,device,source){
 await settleImport(page,'#drawingFile',source,'library-integration-plans.pdf',2);
 const beforeLibrary=await catalog28(page),legacy=await page.evaluate(async()=>{
  const current=Proj2App.snapshot().state,record=await Proj2Store.load();
  for(const code of ['VC','HVC'])Proj2Data.addStencil(current,{...Proj2Data.defaultStencilFor(current,code),id:code,code,kind:'card'});
  return new TextDecoder().decode(await Proj2Store.pack(current,record.original));
 });
 await page.locator('#projectFile').setInputFiles(upload(Buffer.from(legacy),'legacy-stencils.json'));await confirm(page);await idle(page);assert.deepEqual(await catalog28(page),beforeLibrary,'project import does not replace the reusable catalog');
 await manager28(page);await page.locator('#libraryStencilSearch').fill('VC');
 for(const code of ['VC','HVC']){
  assert.equal(await page.locator('[data-library-stencil-visible="'+code+'"]').isChecked(),false);
  await write28(page,()=>page.locator('[data-library-stencil-visible="'+code+'"]').check());
 }
 await closeManager28(page);await view(page,'stencils');await page.locator('#stampSearch').fill('VC');for(const code of ['VC','HVC'])assert.equal(await page.locator('#stampList [data-stencil-id="'+code+'"]').count(),1,'old V stencil can be restored explicitly');
 await view(page,'drawing');await page.locator('#zoomFit').click();await idle(page);
 const first=await place(page,'GS1',.38,.38);await view(page,'cards');
 const operator=product28(page,'closing-operator'),operatorRow=row28(page,'closing-operator');
 if(device.touch)assert(await operator.evaluate(node=>Number.parseFloat(getComputedStyle(node).fontSize)>=16),'touch product fields avoid Safari focus zoom');
 await operatorRow.locator('[data-field="quantity"]').fill('2');await operatorRow.locator('[data-field="delivery"]').selectOption('GS');await operatorRow.locator('[data-field="installer"]').selectOption('DT');
 await type28(page,operator,'S');await page.waitForSelector('.p2-suggest:not([hidden])');
 let names=await page.locator('.p2-suggest:not([hidden]) .p2-suggest-name').allTextContents();
 assert(names.includes('SW300')&&names.includes('SW350')&&names.includes('Sensor X'));assert(names.every(name=>name.toLocaleLowerCase('sv').startsWith('s')));assert(!names.includes('AUTOMATIK ANNAN'),'description-only S matches are excluded');
 await operator.fill('sw 3');names=await page.locator('.p2-suggest:not([hidden]) .p2-suggest-name').allTextContents();assert(names.includes('SW300')&&names.includes('SW350'));
 await operator.press('ArrowDown');await operator.press('Enter');assert.equal(await operator.inputValue(),'SW300');assert.equal(await operator.evaluate(node=>document.activeElement===node),true,'keyboard selection retains the same product input focus');
 assert.equal(await operatorRow.locator('[data-field="quantity"]').inputValue(),'2');assert.equal(await operatorRow.locator('[data-field="delivery"]').inputValue(),'GS');assert.equal(await operatorRow.locator('[data-field="installer"]').inputValue(),'DT');
 assert.equal((await snap(page)).state.cards.GS1.rows.find(row=>row.id==='closing-operator').product,'','suggestions remain an unsaved draft');
 const cylinder=product28(page,'day-cylinder-hinge');await type28(page,cylinder,'8');await page.waitForSelector('.p2-suggest:not([hidden])');
 names=await page.locator('.p2-suggest:not([hidden]) .p2-suggest-name').allTextContents();assert(names.includes('8882')&&names.includes('8888'));assert(names.every(name=>name.startsWith('8')));
 const option=page.locator('.p2-suggest:not([hidden]) [role="option"]').filter({has:page.getByText('8882',{exact:true})}).first();
 if(device.touch)await option.tap();else await option.click();
 assert.equal(await cylinder.inputValue(),'8882');assert.equal(await cylinder.evaluate(node=>document.activeElement===node),true,'touch/mouse suggestion selection keeps product focus');
 await product28(page,'day-lock').fill('MITT FRIA LÅS');await row28(page,'day-lock').locator('[data-field="quantity"]').fill('2');
 await product28(page,'closing-elbow').fill('JCK207');await product28(page,'closing-elbow').press('ArrowDown');await product28(page,'closing-elbow').press('Enter');
 await saveCard(page);assert.equal((await snap(page)).state.cards.GS1.rows.find(row=>row.id==='day-lock').product,'MITT FRIA LÅS');assert(!(await catalog28(page)).products.some(product=>product.name==='MITT FRIA LÅS'),'free text is a card value, not an unsolicited global product');
 await productButton(page,'night-lock').click();await page.locator('#customProductName').fill('QA-QUICK-LOCK');const revision=(await catalog28(page)).revision;
 await page.locator('#addProduct').click();await page.waitForSelector('#productDialog[open]',{state:'hidden'});await page.waitForFunction(revision=>Proj2App.librarySnapshot().revision>revision,revision);
 assert((await catalog28(page)).products.some(product=>product.name==='QA-QUICK-LOCK'&&product.category==='lock'));await saveCard(page);
 await view(page,'drawing');await page.locator('#zoomFit').click();await idle(page);await place(page,'GS1',.70,.55);await waitCount(page,2);
 const report=await page.evaluate(()=>Proj2App.snapshot().materials),total=name=>report.rows.filter(row=>row.product===name).reduce((sum,row)=>sum+row.quantity,0);
 assert.equal(total('MITT FRIA LÅS'),4);assert.equal(total('SW300'),4);assert.equal(total('JCK207'),4,'one elbow contact set counts twice per placed door');assert.equal(total('QA-QUICK-LOCK'),2);
 const saved=(await snap(page)).state.cards.GS1;assert.equal(saved.rows.find(row=>row.id==='closing-operator').delivery,'GS');assert.equal(saved.rows.find(row=>row.id==='closing-operator').installer,'DT');
 await page.reload();await ready(page);await idle(page);assert.deepEqual((await snap(page)).state.cards.GS1,saved);return {first:first.id,saved};
}
async function productChanges28(page,ids,saved){
 await manager28(page,'products');await page.locator('#libraryProductSearch').fill('SW350');await page.locator('[data-library-product-edit="'+ids.sw+'"]').click();await page.locator('#libraryProductName').fill('SW350 PRO');await form28(page,'product');
 await page.locator('#libraryProductSearch').fill('SW300');await page.locator('[data-library-product-edit="operator-sw300"]').click();await page.locator('#libraryProductName').fill('SW300 PRO');await form28(page,'product');
 assert.deepEqual((await snap(page)).state.cards.GS1,saved,'built-in override cannot rewrite saved door-card strings');
 await page.locator('#libraryProductSearch').fill('SW300');await write28(page,()=>page.locator('[data-library-product-delete="operator-sw300"]').click());
 assert((await catalog28(page)).hiddenProductIds.includes('operator-sw300'));assert.deepEqual((await snap(page)).state.cards.GS1,saved,'removing a catalog choice cannot rewrite saved rows');
 await page.locator('#libraryProductSearch').fill('Sensor X');await write28(page,()=>page.locator('[data-library-product-delete="'+ids.sensor+'"]').click());assert(!(await catalog28(page)).products.some(product=>product.id===ids.sensor));
 await page.locator('#libraryProductFilter').selectOption('operator');await page.locator('#libraryProductSearch').fill('S');assert((await page.locator('#libraryProductsList').innerText()).includes('SW350 PRO'));assert(!(await page.locator('#libraryProductsList').innerText()).includes('8888'),'product category filter excludes cylinders');
 await closeManager28(page);
}
async function failures28(page){
 await manager28(page);const before=await catalog28(page),project=(await snap(page)).state;
 await page.evaluate(()=>{window.__transaction28=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args){if(this.name===Proj2Library.DB_NAME&&args[1]==='readwrite')throw new DOMException('QA library quota','QuotaExceededError');return window.__transaction28.apply(this,args);};});
 try{
  await page.locator('#libraryCardsLabel').fill('Must not be saved');await page.locator('[data-library-form="labels"] button[type="submit"]').click();
  await page.waitForFunction(()=>document.getElementById('libraryManagerStatus').dataset.level==='error'&&document.getElementById('libraryManagerDialog').getAttribute('aria-busy')!=='true');
  assert.deepEqual(await catalog28(page),before);assert.deepEqual(await page.evaluate(()=>Proj2Library.load('device')),before,'quota failure leaves committed library unchanged');assert.deepEqual((await snap(page)).state,project);
 }finally{await page.evaluate(()=>{IDBDatabase.prototype.transaction=window.__transaction28;delete window.__transaction28;});}
 await closeManager28(page);await manager28(page);
 const winner=await page.evaluate(async()=>{const current=await Proj2Library.load('device'),next=Proj2Library.setLabels(current,{other:'External symbols'});await Proj2Library.save(next,'device',{expectedRevision:current.revision});return next;});
 await page.locator('#libraryCardsLabel').fill('Rejected stale label');await page.locator('[data-library-form="labels"] button[type="submit"]').click();
 await page.waitForFunction(()=>document.getElementById('libraryManagerStatus').dataset.level==='error'&&document.getElementById('libraryManagerDialog').getAttribute('aria-busy')!=='true');
 assert((await page.locator('#libraryManagerStatus').textContent()).includes('annan flik'));assert.deepEqual(await catalog28(page),winner,'conflict reloads the winning catalog without claiming success');assert.deepEqual((await snap(page)).state.cards,project.cards);
 await closeManager28(page);await manager28(page);await page.locator('#libraryOtherLabel').fill('Symboler');await form28(page,'labels');assert.equal((await catalog28(page)).labels.other,'Symboler','queue recovers after quota/CAS errors');await closeManager28(page);
}
async function suggestionScroll28(page,device){
 if(!device.touch)return;
 await view(page,'cards');const input=product28(page,'closing-operator'),original=await input.inputValue();await type28(page,input,'Scroll');
 await page.waitForSelector('.p2-suggest:not([hidden])');const list=page.locator('.p2-suggest:not([hidden]) .p2-suggest-list'),box=await list.boundingBox(),cdp=await page.context().newCDPSession(page);
 try{
  const x=box.x+box.width/2,y=box.y+Math.min(box.height-12,110);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:801,x,y}]});
  for(let step=1;step<=8;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:801,x,y:y-step*10}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>document.querySelector('.p2-suggest-list').scrollTop>0);
  assert.equal(await input.inputValue(),'Scroll','scrolling suggestion choices never selects the touched first product');
  await input.fill(original);await input.press('Escape');assert.equal((await snap(page)).dirty,false,'restoring the original card value clears the test draft');
 }finally{await cdp.detach();}
}
async function backups28(page,device){
 await manager28(page,'backup');const before=await catalog28(page),cards=(await snap(page)).state.cards;
 const backup=await download(page,()=>page.locator('[data-library-action="export"]').click());assert.equal(JSON.parse(backup.bytes).format,'TillsynoProjekteringLibraryV1');assert.deepEqual(JSON.parse(backup.bytes).library,before);
 await page.locator('#libraryBackupFile').setInputFiles(upload(Buffer.from('{bad'),'invalid-library.json'));
 await page.waitForFunction(()=>document.getElementById('libraryManagerStatus').dataset.level==='error');assert.deepEqual(await catalog28(page),before);assert.deepEqual((await snap(page)).state.cards,cards);
 const incoming=await page.evaluate(()=>{
  let value=Proj2Library.createDefault();value=Proj2Library.saveProduct(value,{id:'imported-lock',name:'IMPORTED LOCK',category:'lock',description:''});
  for(let index=0;index<24;index++)value=Proj2Library.saveProduct(value,{id:'scroll-'+index,name:'Scroll S '+String(index).padStart(2,'0'),category:'operator',description:'Touch list scroll fixture'});
  value=Proj2Library.saveGroup(value,{id:'imported-group',name:'Importgrupp',section:'cards',prefixes:['IMP']});return new TextDecoder().decode(Proj2Library.pack(value));
 });
 await page.locator('#libraryBackupFile').setInputFiles(upload(Buffer.from(incoming),'incoming-library.json'));await page.waitForSelector('#libraryImportReview:not([hidden])');await page.locator('[data-library-action="mergeImport"]').click();await write28(page,()=>page.locator('[data-library-action="confirmImport"]').click());
 let lib=await catalog28(page);assert.equal(lib.labels.cards,before.labels.cards);assert(lib.products.some(product=>product.id==='imported-lock'));for(const product of before.products)assert(lib.products.some(item=>item.id===product.id&&item.name===product.name));assert.deepEqual((await snap(page)).state.cards,cards);
 await closeManager28(page);await suggestionScroll28(page,device);await manager28(page,'backup');
 await page.locator('#libraryBackupFile').setInputFiles(upload(backup.bytes,'restore-library.json'));await page.waitForSelector('#libraryImportReview:not([hidden])');
 await page.locator('[data-library-action="replaceImport"]').click();await page.locator('[data-library-action="cancelImport"]').click();assert.deepEqual(await catalog28(page),lib,'cancelled replace leaves the complete catalog intact');
 await page.locator('[data-library-action="replaceImport"]').click();await write28(page,()=>page.locator('[data-library-action="confirmImport"]').click());
 lib=await catalog28(page);for(const key of ['labels','groups','assignments','hiddenCodes','stencils','products','hiddenProductIds','categoryLabels'])assert.deepEqual(lib[key],before[key],'confirmed backup restore preserves '+key);
 assert.deepEqual((await snap(page)).state.cards,cards,'library replacement never rewrites saved project cards');await closeManager28(page);
}
async function roundtrip28(page,source){
 const state=(await snap(page)).state,library=await catalog28(page);
 const json=await download(page,()=>page.locator('#saveProject').click()),pdf=await download(page,()=>page.locator('#exportPdf').click());assert.equal(pdf.bytes.subarray(0,5).toString(),'%PDF-');
 for(const [bytes,name]of [[pdf.bytes,'project-roundtrip.pdf'],[json.bytes,'project-roundtrip.json']]){
  await page.locator('#projectFile').setInputFiles(upload(bytes,name));await confirm(page);await idle(page);
  assert.deepEqual((await snap(page)).state.cards,state.cards,'project export/import preserves literal saved product text');assert.deepEqual((await snap(page)).state.placements,state.placements);assert.deepEqual(await catalog28(page),library,'project import cannot replace the reusable catalog');
 }
 await page.reload();await ready(page);await idle(page);assert.deepEqual((await snap(page)).state.cards,state.cards);assert.deepEqual(await catalog28(page),library);assert.equal((await persisted(page)).bytes,source.length);
}
async function center28(page,id){
 return page.evaluate(id=>{const node=document.querySelector('[data-placement-id="'+id+'"]'),point=new DOMPoint(0,0).matrixTransform(node.getScreenCTM());return{x:point.x,y:point.y};},id);
}
async function native28(page,device,first){
 await view(page,'drawing');await page.locator('#pageNumber').fill('1');await page.locator('#pageNumber').dispatchEvent('change');await idle(page);await page.locator('#zoomFit').click();await page.locator('#toolSelect').click();await idle(page);
 let center=await center28(page,first);const before=(await snap(page)).state.placements.length;
 if(device.touch){
  const cdp=await page.context().newCDPSession(page);try{
   const zoom=(await snap(page)).view.zoom;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:901,x:center.x-24,y:center.y},{id:902,x:center.x+24,y:center.y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:901,x:center.x-33,y:center.y},{id:902,x:center.x+33,y:center.y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert((await snap(page)).view.zoom>zoom*1.1);
   center=await center28(page,first);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:903,x:center.x,y:center.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(()=>document.body.dataset.view==='cards');
   assert.equal(await page.locator('dialog[open]').count(),0);assert.equal((await snap(page)).dirty,false,'touch card activation cannot click through into a product field');
   assert.equal(await page.evaluate(()=>['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)),false);
  }finally{await cdp.detach();}
 }else{await page.mouse.dblclick(center.x,center.y);await page.waitForFunction(()=>Proj2App.snapshot().activeCode==='GS1');}
 await view(page,'drawing');await page.locator('#zoomFit').click();await idle(page);const symbol=await place(page,'DA',.78,.68);await page.locator('#toolSelect').click();await idle(page);center=await center28(page,symbol.id);
 if(device.touch)await page.touchscreen.tap(center.x,center.y);else await page.mouse.dblclick(center.x,center.y);
 await idle(page);assert.equal(await page.locator('body').getAttribute('data-view'),'drawing');assert.equal(await page.locator('dialog[open]').count(),0);
 assert.deepEqual(await page.locator('[data-placement-id="'+symbol.id+'"] text').allTextContents(),['DA']);
 assert.equal((await snap(page)).state.placements.length,before+1);await overflow(page);
}
async function aliases28(page){
 const state=(await snap(page)).state,project=await download(page,()=>page.locator('#saveProject').click());
 const text=await page.evaluate(()=>{
  let value=Proj2Library.saveStencil(Proj2App.librarySnapshot(),{...Proj2Data.defaultStencil('GS-1'),fill:'#224466'});value=Proj2Library.setHidden(value,'GS1',true);return new TextDecoder().decode(Proj2Library.pack(value));
 });
 await manager28(page,'backup');await page.locator('#libraryBackupFile').setInputFiles(upload(Buffer.from(text),'GS-alias-template.json'));await page.waitForSelector('#libraryImportReview:not([hidden])');await page.locator('[data-library-action="mergeImport"]').click();await write28(page,()=>page.locator('[data-library-action="confirmImport"]').click());await closeManager28(page);
 assert.deepEqual((await snap(page)).state.cards,state.cards,'a reusable GS-1 alias cannot replace an existing GS1 door card');assert.equal((await snap(page)).state.stencils['GS-1'],undefined,'used existing GS1 wins the matching alias');
 await newProject28(page);let current=(await snap(page)).state;assert.equal(current.stencils.GS1,undefined);assert.equal(current.stencils['GS-1'].fill,'#224466','fresh unused GS1 default is replaced by the saved alias template');
 const lib=await catalog28(page);await page.locator('#projectFile').setInputFiles(upload(project.bytes,'restore-original-GS1-project.json'));await confirm(page);await idle(page);current=(await snap(page)).state;
 assert.deepEqual(current.cards,state.cards);assert.deepEqual(current.placements,state.placements);assert.equal(current.stencils['GS-1'],undefined);assert.deepEqual(await catalog28(page),lib,'restoring old GS1 work does not overwrite the saved alias catalog');
}
async function history28(page,source){
 await settleImport(page,'#drawingFile',source,'history-library-plans.pdf',2);await view(page,'stencils');await page.locator('#newStencil').click();await page.waitForSelector('#stencilDialog[open]');
 await page.locator('#stencilCode').fill('HIST1');await page.locator('#stencilName').fill('Reusable history stencil');await page.locator('#stencilFill').fill('#224466');await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});await idle(page);
 const lib=await catalog28(page);
 for(const action of ['undo','redo']){
  await view(page,'drawing');await page.locator('#'+action).click();await idle(page);
  assert.equal((await snap(page)).state.stencils.HIST1.fill,'#224466','saved reusable template remains available after '+action);assert.deepEqual(await catalog28(page),lib);
  await view(page,'stencils');await page.locator('#stampSearch').fill('HIST1');assert.equal(await page.locator('#stampList [data-stencil-id="HIST1"]').count(),1,'palette retains the saved template after '+action);
 }
 await view(page,'drawing');await page.locator('#zoomFit').click();await idle(page);await place(page,'HIST1',.35,.35);await view(page,'cards');await type28(page,product28(page,'day-lock'),'HISTORY FREE LOCK');await saveCard(page);
 const cards=(await snap(page)).state.cards;
 await view(page,'stencils');await page.locator('#editStencil').click();await page.waitForSelector('#stencilDialog[open]');await page.locator('#stencilFill').fill('#6688aa');await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});await idle(page);
 const newer=await catalog28(page);assert.equal(newer.stencils.find(stencil=>stencil.code==='HIST1').fill,'#6688aa');
 for(const [action,color]of [['undo','#224466'],['redo','#6688aa'],['undo','#224466']]){
  await view(page,'drawing');await page.locator('#'+action).click();await idle(page);assert.equal((await snap(page)).state.stencils.HIST1.fill,color,'history preserves an existing project style instead of applying a newer global color');assert.deepEqual((await snap(page)).state.cards,cards);assert.deepEqual(await catalog28(page),newer);
 }
 const project=await download(page,()=>page.locator('#saveProject').click());await page.locator('#projectFile').setInputFiles(upload(project.bytes,'history-roundtrip.json'));await confirm(page);await idle(page);assert.equal((await snap(page)).state.stencils.HIST1.fill,'#224466');assert.deepEqual((await snap(page)).state.cards,cards);assert.deepEqual(await catalog28(page),newer);
 await page.reload();await ready(page);await idle(page);assert.equal((await snap(page)).state.stencils.HIST1.fill,'#224466');assert.deepEqual((await snap(page)).state.cards,cards);assert.deepEqual(await catalog28(page),newer);await overflow(page);
}
async function run(browser,device,source){
 const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const trace=text=>{if(process.env.PROJECTION2_DEBUG)console.log(device.name+': '+text);};
 try{
  await page.goto(url());await ready(page);assert.equal(await page.evaluate(()=>Proj2App.version),'2.8');await overflow(page);trace('boot');
  if(process.env.PROJECTION2_HISTORY_ONLY){await history28(page,source);assert.deepEqual(errors,[]);console.log(device.name+': reusable stencil Undo/Redo, project-style snapshots, card text and JSON/reload passed');return;}
  const ids=await groups28(page);trace('editable groups, labels, memberships, visibility, colored templates and categorized products');
  await stencilRetry28(page);trace('project-only stencil save failure preserves form and retries once');
  const cards=await cards28(page,device,source);trace('legacy visibility, inline free text, prefix suggestions, keyboard/touch pick, actual save and material counts');
  await productChanges28(page,ids,cards.saved);trace('product edits/deletions preserve saved card rows');
  await failures28(page);trace('library quota/CAS failures preserve data and report errors');
  await backups28(page,device);trace('separate library backup, invalid input, merge/replace and native suggestion scrolling');
  await roundtrip28(page,source);trace('project PDF/JSON and IndexedDB retain card text without changing catalog');
  await native28(page,device,cards.first);trace('native pinch/card activation and simple symbol smoke');
  await aliases28(page);trace('hidden GS1 and reusable GS-1 alias preserve existing work and fresh defaults');
  const finalLibrary=await catalog28(page),finalCards=(await snap(page)).state.cards;
  await page.goto(url().replace('smartmatch-projektering-v2-8.html','smartmatch-projektering.html'));await ready(page);await idle(page);
  assert.equal(await page.evaluate(()=>Proj2App.version),'2.8');assert.deepEqual(await catalog28(page),finalLibrary);assert.deepEqual((await snap(page)).state.cards,finalCards,'stable entry reopens saved cards and the same separate library');
  const refs=await page.evaluate(()=>[...document.querySelectorAll('script[src]')].map(node=>new URL(node.src).pathname.split('/').pop()));for(const name of ['smartmatch-projektering-v2-8.js','smartmatch-projektering-v2-8-library.js','smartmatch-projektering-v2-8-library-ui.js','smartmatch-projektering-v2-8-suggest.js'])assert(refs.includes(name));
  assert.deepEqual(errors,[]);await overflow(page);
  console.log(device.name+': reusable library, inline product entry, backups/failures, project exchange, native touch and stable entry passed');
 }catch(error){console.error(device.name+' diagnostic:',await page.evaluate(()=>({message:document.getElementById('appMessage')?.textContent,libraryStatus:document.getElementById('libraryManagerStatus')?.textContent,view:window.Proj2App?.snapshot().view,activeCode:window.Proj2App?.snapshot().activeCode})).catch(()=>({})));throw error;}finally{await ctx.close();}
}
}
const body=suite28.toString(),scenario=body.slice(body.indexOf('{')+1,body.lastIndexOf('}'));
const source=(base.slice(0,start)+scenario+base.slice(end)).replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-8.html');
const child=new Module(file,module);child.filename=file;child.paths=module.paths;child._compile(source,file);
