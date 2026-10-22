'use strict';
// Existing PDF/auth fixture, new independent fresh-device and upgrade scenarios.
// No screenshots, image generation, or external writes.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const fixturePath=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs'),base=fs.readFileSync(fixturePath,'utf8');
const start=base.indexOf('async function run(browser,device,source){'),end=base.indexOf('async function denied(browser){',start);
if(start<0||end<0)throw Error('Shared browser fixture boundaries changed');
const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'../produktbibliotek/copiax-startbibliotek-v2.json'),'utf8')).library.products;
const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'../produktbibliotek/copiax-startbibliotek-v1.json'),'utf8')).library.products;
function scenario(){
 const expected=JSON.parse(process.env.PROJECTION29_EXPECTED),prior=JSON.parse(process.env.PROJECTION29_PRIOR);
 const catalog=page=>page.evaluate(()=>Proj2App.librarySnapshot());
 const visible=page=>page.evaluate(()=>Proj2Library.listProducts(Proj2App.librarySnapshot(),Proj2App.snapshot().state));
 async function manager(page,tab){
  if(!await page.locator('#libraryManagerDialog').evaluate(n=>n.open)){await view(page,'stencils');await page.locator('#manageLibrary').click();}
  await page.locator('[data-library-tab="'+tab+'"]').click();await page.waitForFunction(()=>document.getElementById('libraryManagerDialog').getAttribute('aria-busy')!=='true');
 }
 async function closeManager(page){await page.locator('[data-library-action="close"]').click();await page.waitForSelector('#libraryManagerDialog[open]',{state:'hidden'});}
 async function importLibrary(page,file,count){
  await manager(page,'backup');await page.locator('#libraryBackupFile').setInputFiles(file);await page.waitForSelector('#libraryImportReview:not([hidden])');
  assert((await page.locator('#libraryImportSummary').textContent()).includes(count+' sparade produkter'));
  await page.locator('[data-library-action="mergeImport"]').click();const before=(await catalog(page)).revision;await page.locator('[data-library-action="confirmImport"]').click();
  await page.waitForFunction(revision=>Proj2App.librarySnapshot().revision>revision,before);await page.waitForFunction(()=>document.getElementById('libraryManagerDialog').getAttribute('aria-busy')!=='true');await closeManager(page);
 }
 function builtins(choices,{hidden=[]}={}){
  for(const product of expected){if(hidden.includes(product.id)){assert(!choices.some(p=>p.id===product.id));continue;}assert.deepEqual(choices.find(p=>p.id===product.id),product,'built-in short model available: '+product.name);}
  assert.equal(new Set(expected.map(p=>p.category)).size,18);assert(!choices.some(p=>/\bDEMO\b/.test(p.name)),'untouched demo choices are absent');
 }
 async function choose(page,rowId,name){
  await productButton(page,rowId).click();await page.locator('#productSearch').fill(name);
  const item=page.locator('#productList [data-product-id]').filter({has:page.getByText(name,{exact:true})});assert.equal(await item.count(),1,'one category choice for '+name);await item.click();
 }
 async function inline(page,rowId,prefix,name){
  const input=page.locator('#cardRows input[data-product-input][data-row-id="'+rowId+'"]');await input.scrollIntoViewIfNeeded();await input.focus();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await input.pressSequentially(prefix);
  const option=page.locator('.p2-suggest:not([hidden]) [role="option"]').filter({has:page.getByText(name,{exact:true})});await option.waitFor({state:'visible'});
  assert.equal((await option.innerText()).trim(),name,'suggestion contains only the model');assert.equal(await option.locator('.p2-suggest-description').count(),0);
  if(await page.evaluate(()=>navigator.maxTouchPoints>0))await option.tap();else await option.click();assert.equal(await input.inputValue(),name);
 }
 async function fresh(browser,device,source){
  const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  try{
   await page.goto(url());await ready(page);assert.equal(await page.evaluate(()=>Proj2App.version),'2.9');builtins(await visible(page));
   assert.equal((await catalog(page)).products.length,0,'fresh device needs no library-file import or local product seed');
   const example=await page.evaluate(async()=>{const value=await Proj2PDF.example();return value.state;});assert(!Object.values(example.cards).some(card=>card.rows.some(row=>/DEMO/.test(row.product))));assert.equal(example.cards.GS1.rows.find(row=>row.id==='day-handle').product,'6696');
   await manager(page,'products');for(const category of new Set(expected.map(p=>p.category))){const p=expected.find(p=>p.category===category);await page.locator('#libraryProductFilter').selectOption(category);await page.locator('#libraryProductSearch').fill(p.name);assert.equal(await page.locator('[data-library-product-edit="'+p.id+'"]').count(),1,'built-in model selectable in '+category);}await closeManager(page);
   await settleImport(page,'#drawingFile',source,'built-in-models.pdf',2);await place(page,'GS1',.3,.3);await view(page,'cards');
   await choose(page,'day-lock','310-50');await inline(page,'night-lock','411','411-50 MA');await inline(page,'closing-closer','DC7','DC700');await inline(page,'closing-operator','SW3','SW300');await choose(page,'closing-elbow','JCK207');await saveCard(page);await place(page,'GS1',.6,.6);
   await view(page,'materials');await page.waitForFunction(()=>Proj2App.snapshot().materials?.rows.some(r=>r.product==='310-50'));const report=(await snap(page)).materials;for(const [name,count] of [['310-50',2],['411-50 MA',2],['DC700',2],['SW300',2],['JCK207',4]])assert.equal(report.rows.find(r=>r.product===name)?.quantity,count,'material count '+name);
   const csv=await download(page,()=>page.locator('#materialCsv').click());assert(csv.bytes.toString().includes('411-50 MA'));const materialPDF=await download(page,()=>page.locator('#materialPdf').click());assert.equal(materialPDF.bytes.subarray(0,5).toString(),'%PDF-');
   const state=(await snap(page)).state,portable=await download(page,()=>page.locator('#exportPdf').click());assert.equal(portable.bytes.subarray(0,5).toString(),'%PDF-');
   const parsed=await PDFDocument.load(portable.bytes);assert(parsed.getPageCount()>=3,'project PDF includes drawing and card pages');
   await page.locator('#projectFile').setInputFiles(upload(portable.bytes,'built-in-roundtrip.pdf'));await confirm(page);await idle(page);assert.deepEqual((await snap(page)).state.cards,state.cards);assert.deepEqual((await snap(page)).state.placements,state.placements);
   await page.reload();await ready(page);await idle(page);builtins(await visible(page));assert.deepEqual((await snap(page)).state.cards,state.cards);
   await page.locator('.project-menu>summary').click();await page.locator('#newProject').click();await confirm(page);await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===0);builtins(await visible(page));await overflow(page);assert.deepEqual(errors,[]);
   console.log(device.name+': fresh device: all82 models/18categories without import, no demos, short inline choices, saved material counts incl elbow×2, material/projectPDF and reload/newproject passed');
  }finally{await ctx.close();}
 }
 async function legacy(browser,device,source){
  const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  try{
   await page.goto(url().replace('v2-9.html','v2-8.html'));await ready(page);assert.equal(await page.evaluate(()=>Proj2App.version),'2.8');
   await importLibrary(page,process.env.PROJECTION29_PRIOR_FILE,prior.length);
   await settleImport(page,'#drawingFile',source,'legacy-library-plan.pdf',2);await place(page,'GS1',.35,.35);await view(page,'cards');
   const oldLock=prior.find(p=>p.category==='lock'&&p.name.startsWith('EL580'));
   await page.locator('#cardRows input[data-product-input][data-row-id="day-lock"]').fill(oldLock.name);await page.locator('#cardRows input[data-product-input][data-row-id="day-handle"]').fill('Trycke DEMO 01');await saveCard(page);
   const seeded=await page.evaluate(async untouched=>{
    const saved=await Proj2Store.load();Proj2Data.addProduct(saved.state,untouched);Proj2Data.addProduct(saved.state,{id:'my-project-model',name:'EGEN-PROJEKTMODELL',category:'lock',description:'Eget sparat val'});await Proj2Store.save(saved.state,saved.original);
    let lib=await Proj2Library.load('device');const revision=lib.revision;lib=Proj2Library.saveProduct(lib,Proj2Data.PRODUCTS.find(p=>p.id==='closer-demo'));lib=Proj2Library.saveProduct(lib,{id:'lock-demo-el',name:'MITT-EGET-LÅS',category:'lock',description:'Medvetet ändrat eget val'});lib=Proj2Library.saveProduct(lib,{id:'operator-sw300',name:'EGEN-AUTOMATIK',category:'operator',description:'Ändrat gammalt automatikval'});lib=Proj2Library.saveGroup(lib,{id:'personal-group',name:'Mina entréer',section:'cards',prefixes:['ENT'],fallback:false});lib=Proj2Library.setLabels(lib,{cards:'Mina dörrtyper'});await Proj2Library.save(lib,'device',{expectedRevision:revision});return{state:saved.state,lib};
   },oldLock);
   await page.goto(url());await ready(page);await idle(page);assert.equal(await page.evaluate(()=>Proj2App.version),'2.9');let choices=await visible(page);builtins(choices);
   for(const item of prior)assert(!choices.some(p=>p.id===item.id),'old verbose source option retired');
   assert(choices.some(p=>p.id==='lock-demo-el'&&p.name==='MITT-EGET-LÅS'),'user-edited former demo ID is retained');assert(choices.some(p=>p.id==='my-project-model'),'personal project product retained');
   assert.deepEqual((await snap(page)).state.cards,seeded.state.cards,'upgrade preserves saved card text including legacy demo text');assert.deepEqual((await snap(page)).state.customProducts,seeded.state.customProducts,'upgrade does not delete saved project custom records');assert.deepEqual((await snap(page)).state.placements,seeded.state.placements);assert.equal((await catalog(page)).labels.cards,'Mina dörrtyper');assert((await catalog(page)).groups.some(g=>g.id==='personal-group'));
   const hidden=expected.find(p=>p.name==='EL580');await page.evaluate(async id=>{let lib=await Proj2Library.load('device');const revision=lib.revision;lib=Proj2Library.removeProduct(lib,id);await Proj2Library.save(lib,'device',{expectedRevision:revision});},hidden.id);await page.reload();await ready(page);await idle(page);builtins(await visible(page),{hidden:[hidden.id]});
   await importLibrary(page,process.env.PROJECTION29_SHORT_FILE,expected.length);choices=await visible(page);builtins(choices,{hidden:[hidden.id]});assert((await catalog(page)).hiddenProductIds.includes(hidden.id),'short file import preserves personal hide');assert.deepEqual((await snap(page)).state.cards,seeded.state.cards);
   const ids=choices.map(p=>p.id);assert.equal(new Set(ids).size,ids.length);for(const p of expected.filter(p=>p.id!==hidden.id))assert.equal(choices.filter(q=>q.category===p.category&&q.name===p.name).length,1,'short import and builtin dedupe '+p.name);
   await page.reload();await ready(page);await idle(page);builtins(await visible(page),{hidden:[hidden.id]});assert.deepEqual((await snap(page)).state.cards,seeded.state.cards);
   await manager(page,'products');await page.locator('#libraryProductFilter').selectOption('operator');await page.locator('#libraryProductSearch').fill('EGEN-AUTOMATIK');const beforeDelete=(await catalog(page)).revision;await page.locator('[data-library-product-delete="operator-sw300"]').click();await page.waitForFunction(revision=>Proj2App.librarySnapshot().revision>revision,beforeDelete);await closeManager(page);const afterDelete=await visible(page);assert(!afterDelete.some(p=>p.id==='operator-sw300'),'deleted personal alias hidden');assert(afterDelete.some(p=>p.name==='SW300'&&p.id!=='operator-sw300'),'deleting edited old alias retains built-in SW300');await page.reload();await ready(page);await idle(page);assert((await visible(page)).some(p=>p.name==='SW300'&&p.id!=='operator-sw300'),'alias deletion stays separate from SW300 after reload');assert.deepEqual((await snap(page)).state.cards,seeded.state.cards);await overflow(page);assert.deepEqual(errors,[]);
   await page.evaluate(async()=>{const saved=await Proj2Store.load();Proj2Data.addProduct(saved.state,{id:'activation-jck207',name:'MIN KONTAKT',category:'activation',description:'Egen kontakt från öppet projekt'});await Proj2Store.save(saved.state,saved.original);});await page.reload();await ready(page);await idle(page);assert(!(await catalog(page)).products.some(p=>p.id==='activation-jck207'),'edited alias exists only in project before deletion');assert((await visible(page)).some(p=>p.id==='activation-jck207'&&p.name==='MIN KONTAKT'));
   await manager(page,'products');await page.locator('#libraryProductFilter').selectOption('activation');await page.locator('#libraryProductSearch').fill('MIN KONTAKT');const beforeProjectDelete=(await catalog(page)).revision;await page.locator('[data-library-product-delete="activation-jck207"]').click();await page.waitForFunction(revision=>Proj2App.librarySnapshot().revision>revision,beforeProjectDelete);await closeManager(page);assert(!(await visible(page)).some(p=>p.id==='activation-jck207'),'project-only renamed alias removed from choices');assert((await visible(page)).some(p=>p.name==='JCK207'&&p.id!=='activation-jck207'));
   await page.locator('.project-menu>summary').click();await page.locator('#newProject').click();await confirm(page);await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===0);assert((await visible(page)).some(p=>p.name==='JCK207'&&p.id!=='activation-jck207'),'deleting project-only alias does not hide canonical JCK207 in new project');await page.reload();await ready(page);await idle(page);assert((await visible(page)).some(p=>p.name==='JCK207'&&p.id!=='activation-jck207'),'project-only alias deletion remains separate from canonical after reload');assert.deepEqual(errors,[]);
   console.log(device.name+': upgrade2.8→2.9: verbose83/untoucheddemos absent, edited formerdemo and own products/groups retained, saved cards preserved, v2import dedupes, personal hides and delete-editedalias keeps SW300, project-onlyalias delete keeps JCK207 after newproject/reload passed');
  }finally{await ctx.close();}
 }
 async function run(browser,device,source){await fresh(browser,device,source);await legacy(browser,device,source);}
}
process.env.PROJECTION29_EXPECTED=JSON.stringify(expected);process.env.PROJECTION29_PRIOR=JSON.stringify(prior);
process.env.PROJECTION29_PRIOR_FILE=path.join(__dirname,'../produktbibliotek/copiax-startbibliotek-v1.json');process.env.PROJECTION29_SHORT_FILE=path.join(__dirname,'../produktbibliotek/copiax-startbibliotek-v2.json');
const body=scenario.toString(),injected=body.slice(body.indexOf('{')+1,body.lastIndexOf('}'));
const source=(base.slice(0,start)+injected+base.slice(end)).replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-9.html');
const child=new Module(fixturePath,module);child.filename=fixturePath;child.paths=module.paths;child._compile(source,fixturePath);
