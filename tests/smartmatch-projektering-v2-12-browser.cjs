'use strict';
// Focused real-page regression: one numeric colon series across creation/copy/fork.
// No screenshots, generated images, remote writes, or production source mocks.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const fixturePath=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs'),base=fs.readFileSync(fixturePath,'utf8');
const start=base.indexOf('async function run(browser,device,source){'),end=base.indexOf('async function denied(browser){',start);
if(start<0||end<0)throw Error('Shared fixture boundaries changed');
function scenario(){
 async function cardDialog(page,button,expected){
  await view(page,'cards');await page.locator(button).click();await page.waitForSelector('#textDialog[open]');
  assert.equal(await page.locator('#textValue').inputValue(),expected,'suggestion for '+button+' uses next single-colon number');
 }
 async function acceptCard(page,code){
  await page.locator('#textAccept').click();await page.waitForFunction(code=>!!Proj2App.snapshot().state.cards[code],code);await idle(page);
  assert.equal((await snap(page)).activeCode,code);assert.equal((await snap(page)).state.cards[code].meta.littera,code);
 }
 async function product(page,value){
  const input=page.locator('#cardRows input[data-product-input][data-row-id="day-lock"]');
  await input.scrollIntoViewIfNeeded();await input.fill(value);await input.press('Escape');
 }
 const lock=card=>card.rows.find(row=>row.id==='day-lock').product;
 async function menu(page,id){
  const item=page.locator(id);if(!await item.isVisible())await item.locator('xpath=ancestor::details[1]').locator(':scope > summary').click();await item.click();
 }
 async function initialStamps(page){
  const initial=(await snap(page)).state;
  for(let n=1;n<=100;n++){
   assert.equal(initial.stencils['GS'+n+':1']?.code,'GS'+n+':1','first default stamp has :1 for GS'+n);
   assert(!initial.stencils['GS'+n],'fresh defaults contain no unsuffixed GS'+n);
  }
  assert.equal(await page.locator('#stampList [data-stencil-id]').first().getAttribute('data-stencil-id'),'GS1:1','first visible library stamp starts at GS1:1');
  const first=await place(page,'GS1:1',.28,.32),second=await place(page,'GS1:1',.63,.32);
  assert.deepEqual(Object.keys((await snap(page)).state.cards),['GS1:1'],'two first-stamp placements share one :1 card');
  await select(page,first.id);await view(page,'cards');await product(page,'310-50');await saveCard(page);
  const source=(await snap(page)).state.cards['GS1:1'];await product(page,'411-50 MA');
  await cardDialog(page,'#forkCard','GS1:2');await acceptCard(page,'GS1:2');
  let state=(await snap(page)).state;assert.deepEqual(state.cards['GS1:1'],source);assert.equal(lock(state.cards['GS1:2']),'411-50 MA');
  assert.equal(state.placements.find(p=>p.id===second.id).code,'GS1:1','sibling still uses shared first card');
  await product(page,'511-50');await cardDialog(page,'#forkCard','GS1:3');await acceptCard(page,'GS1:3');
  state=(await snap(page)).state;assert.equal(state.placements.find(p=>p.id===first.id).code,'GS1:3');assert.equal(lock(state.cards['GS1:2']),'411-50 MA','another private change preserves prior card');
  assert.deepEqual(Object.keys(state.cards).sort(),['GS1:1','GS1:2','GS1:3'],'actual first stamp and later private cards use one colon');
  await menu(page,'#newProject');await confirm(page);await idle(page);assert.equal(Object.keys((await snap(page)).state.cards).length,0);
  await view(page,'drawing');await page.locator('#createBlankDrawing').click();await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===1);await idle(page);
 }
 async function legacyProject(page){
  const oldD=require('../smartmatch-projektering-v2-11-data.js'),oldPDF=require('../smartmatch-projektering-v2-11-pdf.js'),legacy=await oldPDF.blank('Legacy unsuffixed GS1');
  oldD.ensureCard(legacy.state,'GS1');const card=oldD.clone(legacy.state.cards.GS1);card.rows.find(row=>row.id==='day-lock').product='310-50';card.note='Keep legacy code unchanged';oldD.updateCard(legacy.state,'GS1',card);
  oldD.addPlacement(legacy.state,{id:'legacy-door',page:1,stencilId:'GS1',x:.4,y:.4});
  const bytes=await oldPDF.build(legacy.state,legacy.original,{mode:'combined'});
  await page.locator('#projectFile').setInputFiles(upload(bytes,'legacy-2-11-GS1.pdf'));await confirm(page);await idle(page);
  let actual=(await snap(page)).state;assert.deepEqual(actual.cards,legacy.state.cards,'old project card GS1 is not renamed');assert.deepEqual(actual.placements,legacy.state.placements,'old physical door keeps code and stencil');assert.deepEqual(actual.stencils.GS1,legacy.state.stencils.GS1,'old stencil identity and appearance retained');
  await page.reload();await ready(page);await idle(page);actual=(await snap(page)).state;assert.deepEqual(actual.cards,legacy.state.cards);assert.deepEqual(actual.placements,legacy.state.placements);
  await select(page,'legacy-door');await view(page,'cards');assert.equal((await snap(page)).activeCode,'GS1');assert.equal(await page.locator('#cardCode').textContent(),'GS1');
 }
 async function run(browser,device){
  const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(url());await ready(page);assert.equal(await page.evaluate(()=>Proj2App.version),'2.12');
   await page.locator('#createBlankDrawing').click();await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===1);await idle(page);
   await initialStamps(page);
   const empty=(await snap(page)).state;
   await cardDialog(page,'#newCard','GS1:1');await page.locator('#textCancel').click();await idle(page);
   assert.deepEqual((await snap(page)).state,empty,'cancel first new card preserves empty project');
   await cardDialog(page,'#newCard','GS1:1');await acceptCard(page,'GS1:1');
   await product(page,'310-50');await page.locator('#cardNote').fill('Shared original numeric card');await saveCard(page);
   const original=(await snap(page)).state.cards['GS1:1'];
   await cardDialog(page,'#copyCard','GS1:2');await page.locator('#textCancel').click();await idle(page);
   assert.deepEqual((await snap(page)).state.cards,{'GS1:1':original},'cancel copy does not consume a number or alter its source');
   await cardDialog(page,'#copyCard','GS1:2');await acceptCard(page,'GS1:2');
   let current=await snap(page);assert.equal(lock(current.state.cards['GS1:2']),'310-50');assert.equal(current.state.cards['GS1:2'].note,original.note,'numeric copy preserves card contents');
   await product(page,'411-50 MA');await saveCard(page);assert.deepEqual((await snap(page)).state.cards['GS1:1'],original,'copy editing never changes original');
   const beforeDuplicate=(await snap(page)).state;
   await cardDialog(page,'#copyCard','GS1:3');await page.locator('#textValue').fill('GS1:1');await page.locator('#textAccept').click();
   await page.waitForFunction(()=>document.getElementById('appMessage').dataset.level==='error');await idle(page);
   assert.deepEqual((await snap(page)).state,beforeDuplicate,'duplicate code is rejected without changing cards or stencils');
   await cardDialog(page,'#newCard','GS1:3');await acceptCard(page,'GS1:3');
   assert.equal(lock((await snap(page)).state.cards['GS1:3']),'','new card in same series starts with empty products');
   await cardDialog(page,'#copyCard','GS1:4');await acceptCard(page,'GS1:4');
   const first=await place(page,'GS1:1',.28,.32),second=await place(page,'GS1:1',.63,.32);
   await select(page,first.id);await view(page,'cards');await product(page,'511-50');
   const sharedState=(await snap(page)).state;
   await cardDialog(page,'#forkCard','GS1:5');await page.locator('#textCancel').click();await idle(page);
   assert.deepEqual((await snap(page)).state,sharedState,'cancel private card leaves source and positions unchanged');assert((await snap(page)).dirty,'cancel preserves private draft');
   await cardDialog(page,'#forkCard','GS1:5');await acceptCard(page,'GS1:5');
   current=await snap(page);assert.deepEqual(current.state.cards['GS1:1'],original);assert.equal(lock(current.state.cards['GS1:5']),'511-50');
   assert.equal(current.state.placements.find(p=>p.id===first.id).code,'GS1:5');assert.equal(current.state.placements.find(p=>p.id===second.id).code,'GS1:1');
   await cardDialog(page,'#forkCard','GS1:6');await acceptCard(page,'GS1:6');
   current=await snap(page);assert.equal(current.state.placements.find(p=>p.id===first.id).code,'GS1:6');
   assert.deepEqual(Object.keys(current.state.cards).sort(),['GS1:1','GS1:2','GS1:3','GS1:4','GS1:5','GS1:6'],'creation, copy and private changes share one numbered family');
   for(const code of Object.keys(current.state.cards))assert.match(code,/^GS1:[1-9][0-9]*$/,'no letter suffix or repeated colon');
   const beforeFiles=current.state,json=await download(page,()=>menu(page,'#saveProject')),pdf=await download(page,()=>menu(page,'#exportPdf'));
   assert.equal((await PDFDocument.load(pdf.bytes)).getPageCount(),7,'one plan and all six numeric card pages export');
   const labels=await page.evaluate(async bytes=>{
    const doc=await pdfjsLib.getDocument({data:new Uint8Array(bytes)}).promise,result=[];
    try{for(let n=2;n<=doc.numPages;n++)result.push((await(await doc.getPage(n)).getTextContent()).items.map(item=>item.str).join(' '));return result;}finally{await doc.destroy();}
   },Array.from(pdf.bytes));
   for(let index=1;index<=6;index++)assert(labels.some(text=>text.includes('GS1:'+index)),'export retains full numeric card label GS1:'+index);
   await page.locator('#projectFile').setInputFiles(upload(pdf.bytes,'numeric-series.pdf'));await confirm(page);await idle(page);assert.deepEqual((await snap(page)).state,beforeFiles,'PDF reopening retains colon identities and original products');
   await page.locator('#projectFile').setInputFiles(upload(json.bytes,'numeric-series.json'));await confirm(page);await idle(page);assert.deepEqual((await snap(page)).state,beforeFiles,'project-file reopening retains complete series');
   await page.reload();await ready(page);await idle(page);assert.deepEqual((await snap(page)).state,beforeFiles,'local reload retains complete series');
   await cardDialog(page,'#copyCard','GS1:7');await page.locator('#textCancel').click();await idle(page);assert.deepEqual((await snap(page)).state,beforeFiles,'next number after reload skips all occupied names');
   await view(page,'stencils');await page.locator('[data-stencil-category="other"]').click();await page.locator('#newStencil').click();await page.waitForSelector('#stencilDialog[open]');
   assert.equal(await page.locator('#stencilKind').inputValue(),'symbol');assert.equal(await page.locator('#stencilCode').inputValue(),'','new symbol remains an explicitly named icon');await page.locator('#closeStencil').click();
   await page.locator('[data-stencil-category="cards"]').click();await page.locator('#newStencil').click();await page.waitForSelector('#stencilDialog[open]');
   assert.equal(await page.locator('#stencilKind').inputValue(),'card');assert.equal(await page.locator('#stencilCode').inputValue(),'GS1:7','new card stencil follows active numeric family');
   await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});await idle(page);
   assert.equal((await snap(page)).state.stencils['GS1:7'].code,'GS1:7');assert(!(await snap(page)).state.cards['GS1:7'],'stencil template is not yet a saved card');
   await cardDialog(page,'#newCard','GS1:8');await page.locator('#textCancel').click();await idle(page);
   await legacyProject(page);
   await overflow(page);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.getItem('qa-other-workspace')),'preserve');
   console.log(device.name+': default :1 library, shared first stamp and numeric private series, new/copy/cancel/duplicate behavior, PDF/JSON/reload and unchanged old GS1 project passed');
  }catch(error){console.error(device.name+' 2.12 diagnostic:',await page.evaluate(()=>({message:document.getElementById('appMessage')?.textContent,code:window.Proj2App?.snapshot().activeCode,cards:Object.keys(window.Proj2App?.snapshot().state.cards||{}),dialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id)})).catch(()=>({})));throw error;}
  finally{await ctx.close();}
 }
}
const body=scenario.toString(),injected=body.slice(body.indexOf('{')+1,body.lastIndexOf('}'));
const source=(base.slice(0,start)+injected+base.slice(end)).replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-12.html');
const child=new Module(fixturePath,module);child.filename=fixturePath;child.paths=module.paths;child._compile(source,fixturePath);
