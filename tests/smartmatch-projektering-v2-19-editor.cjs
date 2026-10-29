'use strict';
// Real app + IndexedDB, with the shared local authentication fixture only.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const fixturePath=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs');
const base=fs.readFileSync(fixturePath,'utf8');
function suite(){
 async function run(browser,device,source){
  const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];
  page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  const shot=async name=>{if(process.env.PROJECTION2_SCREENSHOTS){fs.mkdirSync(process.env.PROJECTION2_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.PROJECTION2_SCREENSHOTS,device.name+'-'+name+'.png')});}};
  const section=title=>page.locator('#cardRows details').filter({has:page.locator('summary > span').getByText(title,{exact:true})});
  const field=(id,key)=>page.locator('#cardRows [data-row-id="'+id+'"][data-field="'+key+'"]');
  const product=id=>page.locator('#cardRows [data-product-input][data-row-id="'+id+'"]');
  async function open(code){await view(page,'stencils');await page.locator('#cardList [data-card-code="'+code+'"]').click();await page.waitForSelector('#cardEditorDialog[open]');await idle(page);}
  async function collapsed(){assert.equal(await page.locator('#cardPane .card-section[open]').count(),0);for(const id of ['cardDoorFunction','cardAlarmFunction','cardFireFunction'])assert(await page.locator('#'+id).isVisible());}
  async function bounds(){await overflow(page);const bad=await page.locator('#cardEditorDialog input, #cardEditorDialog select, #cardEditorDialog textarea, #cardEditorDialog button').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect(),d=n.closest('dialog').getBoundingClientRect();return r.left<d.left-1||r.right>d.right+1;}).map(n=>n.id||n.getAttribute('aria-label')));assert.deepEqual(bad,[],'all editor controls fit');}
  try{
   await page.goto(url());await ready(page);
   await page.evaluate(async()=>{
    const s=Proj2Data.createEmpty('Editor test');
    for(const code of ['GS2','GS4','GS12']){Proj2Data.ensureCard(s,code);if(!s.stencils[code])Proj2Data.addStencil(s,{...Proj2Data.defaultStencil(code),id:code,code});}
    const c=s.cards.GS2;c.functions={door:'Öppnas med trycke.',alarm:'Larm vid uppställd dörr.',fire:'Stänger vid brand.'};
    c.rows.find(r=>r.id==='day-strike').connection='Specialentreprenör';
    c.rows.find(r=>r.id==='day-strike').note='Befintlig anmärkning';
    await Proj2Store.save(s,new Uint8Array());
   });
   await page.reload();await ready(page);
   if(device.name==='desktop'){await section('Daglåsning').locator('summary').click();await product('day-lock').fill('SIDOPANEL');await product('day-lock').blur();}
   await open('GS2');await collapsed();if(device.name==='desktop')assert.equal((await snap(page)).draft.rows.find(r=>r.id==='day-lock').product,'SIDOPANEL','opening same card preserves its unsaved draft');await bounds();await shot('overview');
   await section('Daglåsning').locator('summary').click();
   assert.equal(await field('day-strike','connection').inputValue(),'Specialentreprenör','unknown imported owner preserved');
   assert.equal(await page.locator('[data-note-row]:not([hidden])').count(),0,'notes start collapsed');
   await product('day-lock').fill('310');
   await page.waitForSelector('#cardEditorDialog .p2-suggest:not([hidden])');
   await page.locator('#cardEditorDialog .p2-suggest-option').first().click();
   assert((await product('day-lock').inputValue()).includes('310'),'suggestion is clickable inside top-layer dialog');
   for(const [key,value]of [['delivery','DT'],['installer','GS'],['connection','EL'],['functionOwner','BH']])await field('day-lock',key).selectOption(value);
   await page.locator('[data-action="toggle-note"][data-row-id="day-lock"]').click();
   await field('day-lock','note').fill('Rätt bleck krävs <kontrollera>.');
   await page.locator('[data-action="toggle-note"][data-row-id="day-lock"]').click();
   assert.equal(await field('day-lock','note').isVisible(),false);
   assert.equal(await field('day-lock','note').inputValue(),'Rätt bleck krävs <kontrollera>.');
   await productButton(page,'day-lock').click();await page.waitForSelector('#productDialog[open]');
   await page.locator('#closeProduct').click();assert(await page.locator('#cardEditorDialog').isVisible());
   await bounds();await shot('day');
   if(device.name==='desktop'){
    await page.locator('#previewCard').click();await page.waitForFunction(()=>Proj2App.previewSnapshot().open&&!document.getElementById('previewPdfDownload').disabled);await page.locator('#closeCardPreview').click();assert(await page.locator('#cardEditorDialog').isVisible());
    await page.setViewportSize({width:1280,height:720});await bounds();await shot('laptop');await page.setViewportSize({width:device.width,height:device.height});
   }
   if(device.name==='iphone'){await page.setViewportSize({width:320,height:740});await bounds();await shot('narrow');await page.setViewportSize({width:device.width,height:device.height});}
   await page.locator('#nextCard').click();await page.waitForFunction(()=>Proj2App.snapshot().activeCode==='GS4');await idle(page);await collapsed();
   let saved=(await persisted(page)).state.cards.GS2.rows.find(r=>r.id==='day-lock');
   assert.equal(saved.delivery,'DT');assert.equal(saved.installer,'GS');assert.equal(saved.connection,'EL');assert.equal(saved.functionOwner,'BH');assert.equal(saved.note,'Rätt bleck krävs <kontrollera>.');
   // A failed transaction cannot switch cards or close the editor.
   await section('Nattlåsning').locator('summary').click();await product('night-lock').fill('LÅS-TEST');await product('night-lock').blur();
   await page.evaluate(()=>{window.__transaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args){if(args[1]==='readwrite')throw new DOMException('Testad sparningsmiss','QuotaExceededError');return window.__transaction.apply(this,args);};});
   await page.locator('#nextCard').click();await idle(page);
   assert.equal((await snap(page)).activeCode,'GS4');assert.equal((await snap(page)).dirty,true);assert((await page.locator('#cardEditorMessage').textContent()).length>0);
   await page.evaluate(()=>{IDBDatabase.prototype.transaction=window.__transaction;});
   await page.locator('#nextCard').click();await page.waitForFunction(()=>Proj2App.snapshot().activeCode==='GS12');await idle(page);await collapsed();
   assert.equal(await page.locator('#nextCard').isDisabled(),true,'last card boundary');
   await page.locator('#previousCard').click();await page.waitForFunction(()=>Proj2App.snapshot().activeCode==='GS4');await idle(page);await collapsed();
   await section('Nattlåsning').locator('summary').click();assert.equal(await product('night-lock').inputValue(),'LÅS-TEST');
   await page.locator('#finishCard').click();await page.waitForSelector('#cardEditorDialog[open]',{state:'hidden'});await idle(page);
   assert.equal(await page.locator('#projectWorkspace > #cardPane').count(),1,'same editor returned home');
   await open('GS2');await collapsed();
   await section('Daglåsning').locator('summary').click();
   assert.equal(await field('day-strike','note').inputValue(),'Befintlig anmärkning');
   await product('day-lock').fill('OSPARAD');await product('day-lock').blur();
   await page.locator('#closeCardEditor').click();await page.waitForSelector('#confirmDialog[open]');
   await page.locator('#confirmCancel').click();assert(await page.locator('#cardEditorDialog').isVisible());assert.equal((await snap(page)).dirty,true);
   await page.locator('#closeCardEditor').click();await page.waitForSelector('#confirmDialog[open]');await page.locator('#confirmDiscard').click();await page.waitForSelector('#cardEditorDialog[open]',{state:'hidden'});await idle(page);
   await open('GS2');await page.locator('#newCard').click();await page.waitForSelector('#textDialog[open]');await page.locator('#textValue').fill('GS15');await page.locator('#textAccept').click();await page.waitForFunction(()=>Proj2App.snapshot().activeCode==='GS15');await idle(page);await collapsed();
   await page.locator('#finishCard').click();await page.waitForSelector('#cardEditorDialog[open]',{state:'hidden'});await idle(page);
   // Placing a card stamp opens the digital editor automatically, for desktop and touch.
   await settleImport(page,'#drawingFile',source,'editor-plan.pdf',2);if(await page.locator('#projectDetailsDialog[open]').count())await page.locator('#closeProjectDetails').click();
   await place(page,'GS4',.4,.4);await page.waitForSelector('#cardEditorDialog[open]');await collapsed();await bounds();
   await page.locator('#finishCard').click();await page.waitForSelector('#cardEditorDialog[open]',{state:'hidden'});
   await page.reload();await ready(page);await open('GS4');await collapsed();await section('Nattlåsning').locator('summary').click();assert.equal(await product('night-lock').inputValue(),'LÅS-TEST','saved after reload');
   assert.deepEqual(errors,[]);console.log(device.name+': folded overview, owner selectors, notes, modal product picking, save/next/back, failed saves, close/cancel, new card and placement passed');
  }catch(error){await shot('failure');console.error(device.name,await page.evaluate(()=>({code:window.Proj2App?.snapshot().activeCode,message:document.getElementById('appMessage').textContent,dialogs:[...document.querySelectorAll('dialog[open]')].map(n=>n.id)})));throw error;}finally{await ctx.close();}
 }
 (async()=>{const source=await fixture();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.PROJECTION2_CHROMIUM||chromium.executablePath(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{for(const device of devices)await run(browser,device,source);}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
}
const body=suite.toString(),source=(base.slice(0,base.indexOf('async function run(browser,device,source){'))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))).replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-19.html');
const child=new Module(fixturePath,module);child.filename=fixturePath;child.paths=module.paths;child._compile(source,fixturePath);
