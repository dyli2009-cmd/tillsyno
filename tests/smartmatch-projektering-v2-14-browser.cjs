'use strict';
// Exercise manual hours/minutes on the stable production entry, with generated
// vector PDFs and the existing local auth fixture. No screenshots or live writes.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const fixturePath=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs'),base=fs.readFileSync(fixturePath,'utf8');
const start=base.indexOf('async function run(browser,device,source){'),end=base.indexOf('async function denied(browser){',start);
if(start<0||end<0)throw Error('Shared browser fixture boundaries changed');
function scenario(){
 const D=require('../smartmatch-projektering-v2-13-data.js'),P=require('../smartmatch-projektering-v2-13-pdf.js'),M=require('../smartmatch-projektering-v2-14-materials.js');
 const row=(page,name)=>page.locator('#materialRows tr').filter({has:page.locator('td[data-label="Produkt"]').filter({hasText:new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')})});
 const part=(page,name,unit)=>row(page,name).locator('[data-material-time][data-time-part="'+unit+'"]');
 const rate=(state,component,name)=>state.preferences.materialTimes[M.materialKey(component,name)]??null;
 async function menu(page,id){const item=page.locator(id);if(!await item.isVisible())await item.locator('xpath=ancestor::details[1]').locator(':scope > summary').click();await item.click();}
 async function pdfText(page,bytes){return page.evaluate(async data=>{const pdf=await pdfjsLib.getDocument({data:new Uint8Array(data)}).promise,text=[];try{for(let n=1;n<=pdf.numPages;n++)text.push((await(await pdf.getPage(n)).getTextContent()).items.map(item=>item.str).join(' '));return text.join(' ');}finally{await pdf.destroy();}},Array.from(bytes));}
 async function sample(withLegacy=true){
  const result=await P.blank('Manual duration fixture'),state=result.state;
  for(let index=0;index<4;index++)D.addPlacement(state,{id:'physical-door-'+index,page:1,stencilId:'GS1:1',x:.15+index*.2,y:.4});
  const card=D.clone(state.cards['GS1:1']);
  card.rows.find(value=>value.id==='closing-operator').product='SV300';
  card.rows.find(value=>value.id==='closing-closer').product='DC700';
  card.rows.find(value=>value.id==='day-lock').product='LEGACY-LOCK';
  D.updateCard(state,'GS1:1',card);
  if(withLegacy)D.setMaterialTime(state,M.materialKey('lock','LEGACY-LOCK'),7.5);
  return {...result,state,bytes:await P.build(state,result.original)};
 }
 async function loadSample(page,input,name){await page.locator('#projectFile').setInputFiles(upload(input.bytes,name));await page.waitForFunction(id=>document.getElementById('confirmDialog').open||Proj2App.snapshot().state.project.id===id,input.state.project.id);if(await page.locator('#confirmDialog[open]').count())await confirm(page);await page.waitForFunction(id=>Proj2App.snapshot().state.project.id===id,input.state.project.id);await idle(page);await view(page,'materials');await page.waitForSelector('#materialRows [data-time-part="hours"]');}
 async function expectRate(page,component,name,expected){await page.waitForFunction(({key,expected})=>(Proj2App.snapshot().state.preferences.materialTimes[key]??null)===expected,{key:M.materialKey(component,name),expected});await idle(page);assert.equal(rate((await persisted(page)).state,component,name),expected,'time is committed to IndexedDB');}
 async function edit(page,name,hours,minutes){await part(page,name,'hours').fill(hours);await part(page,name,'minutes').fill(minutes);await part(page,name,'minutes').press('Tab');}
 async function bounds(page,device){
  for(const name of ['SV300','DC700','LEGACY-LOCK'])for(const unit of ['hours','minutes']){
   const input=part(page,name,unit);await input.scrollIntoViewIfNeeded();
   const box=await input.boundingBox();assert(box&&box.width>=25&&box.height>=25,'duration input has usable dimensions');
   assert(box.x>=-1&&box.x+box.width<=device.width+1,'duration input fits the viewport');
   assert((await input.getAttribute('aria-label')).includes(unit==='hours'?'Timmar per styck':'Minuter per styck'),'each input has an explicit time-unit label');
   if(device.touch)assert(await input.evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=16),'touch fields avoid focus zoom');
  }
  for(const name of ['SV300','DC700','LEGACY-LOCK']){
   const item=row(page,name),fields=await item.locator('.material-time-fields').boundingBox(),total=await item.locator('.total-time-column').boundingBox();
   assert(fields&&total);assert(fields.x+fields.width<=total.x+1||total.x+total.width<=fields.x+1||fields.y+fields.height<=total.y+1||total.y+total.height<=fields.y+1,'time fields and unit labels do not overlap the row total');
  }
  await overflow(page);
 }
 async function invalid(page,hours,minutes){
  const before=(await snap(page)).state,downloads=[];const collect=file=>downloads.push(file);page.on('download',collect);
  try{
   await edit(page,'SV300',hours,minutes);await page.waitForSelector('#materialRows [aria-invalid="true"]');await idle(page);
   const invalidState=(await snap(page)).state;
   assert.notEqual(rate(invalidState,'operator','SV300'),Number(hours)*60+Number(minutes),'the invalid combined duration is never committed');
   assert.deepEqual(invalidState.cards,before.cards);assert.deepEqual(invalidState.placements,before.placements);
   await part(page,'SV300','minutes').dispatchEvent('input');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
   assert(await row(page,'SV300').locator('[aria-invalid="true"]').count(),'an input event with unchanged text cannot clear a validation error');
   if(hours==='abc'){
    await page.locator('#materialSearch').fill('DC700');assert.equal(await row(page,'SV300').count(),0);await page.locator('#materialSearch').fill('');
    assert.equal(await part(page,'SV300','hours').inputValue(),'abc','filtering preserves the invalid draft');assert.equal(await part(page,'SV300','minutes').inputValue(),'0');assert(await row(page,'SV300').locator('[aria-invalid="true"]').count(),'filtering preserves the invalid marker');
   }
   await page.locator('#materialCsv').click();await page.waitForFunction(()=>/Rätta/.test(document.getElementById('appMessage').textContent));
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(downloads.length,0,'invalid duration blocks CSV export');assert.deepEqual((await snap(page)).state,invalidState,'invalid export cannot change the saved project');
  }finally{page.off('download',collect);}
  await edit(page,'SV300','1','15');await expectRate(page,'operator','SV300',75);assert.equal(await row(page,'SV300').locator('[aria-invalid="true"]').count(),0,'valid correction clears the error');
 }
 async function rejectPersistence(page){
  const before=(await snap(page)).state,downloads=[],collect=file=>downloads.push(file);page.on('download',collect);
  await page.evaluate(()=>{window.__qaDurationTransaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(stores,mode,...rest){if(mode==='readwrite')throw new DOMException('Generated duration save failure','QuotaExceededError');return window.__qaDurationTransaction.call(this,stores,mode,...rest);};});
  try{
   await edit(page,'SV300','4','30');await page.waitForSelector('#materialRows [aria-invalid="true"]');await idle(page);
   assert.deepEqual((await snap(page)).state,before,'rejected time save cannot replace active state');assert.deepEqual((await persisted(page)).state,before,'rejected time save cannot replace IndexedDB');
   assert.equal(await part(page,'SV300','hours').inputValue(),'4','failed save retains the manual draft for retry');assert.equal(await part(page,'SV300','minutes').inputValue(),'30');
   await page.locator('#materialCsv').click();await page.waitForFunction(()=>/Rätta/.test(document.getElementById('appMessage').textContent));assert.equal(downloads.length,0,'failed persistence cannot export the old estimate as though it saved');
  }finally{await page.evaluate(()=>{IDBDatabase.prototype.transaction=window.__qaDurationTransaction;delete window.__qaDurationTransaction;});page.off('download',collect);}
  const retry=await download(page,()=>page.locator('#materialCsv').click());await expectRate(page,'operator','SV300',270);assert(retry.bytes.toString('utf8').includes('4 tim 30 min'),'retry exports the retained manual draft only after saving');
 }
 async function run(browser,device){
  const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(url());await ready(page);assert.equal(await page.evaluate(()=>Proj2App.version),'2.14');
   const initial=await sample();await loadSample(page,initial,'manual-time-project.pdf');
   assert.equal((await snap(page)).materials.rows.length,3);assert.equal((await snap(page)).materials.rows.find(value=>value.product==='SV300').quantity,4);
   assert.equal(await part(page,'SV300','hours').inputValue(),'');assert.equal(await part(page,'SV300','minutes').inputValue(),'','no automatic product time is supplied');
   assert.equal(Number((await part(page,'LEGACY-LOCK','minutes').inputValue()).replace(',','.')),7.5,'legacy fractional minutes are preserved exactly');
   await bounds(page,device);
   await edit(page,'SV300','3','');await expectRate(page,'operator','SV300',180);assert.equal((await row(page,'SV300').locator('.total-time-column').textContent()).trim(),'12 tim');
   await edit(page,'SV300','1','30');await expectRate(page,'operator','SV300',90);assert.equal((await row(page,'SV300').locator('.total-time-column').textContent()).trim(),'6 tim');
   await edit(page,'DC700','','20');await expectRate(page,'closer','DC700',20);assert.equal((await page.locator('#materialTotalTime').textContent()).trim(),'7 tim 50 min');
   // Real focus changes queue independent edits to both fields and another row.
   await part(page,'SV300','hours').fill('2');await part(page,'SV300','minutes').fill('15');await part(page,'DC700','hours').fill('0');await part(page,'DC700','minutes').fill('25');await part(page,'DC700','minutes').press('Tab');
   await expectRate(page,'operator','SV300',135);await expectRate(page,'closer','DC700',25);
   await edit(page,'DC700','','');await expectRate(page,'closer','DC700',null);assert((await snap(page)).materials.untimedRows>0,'empty time is missing rather than zero');
   await edit(page,'DC700','0','0');await expectRate(page,'closer','DC700',0);assert.equal((await row(page,'DC700').locator('.total-time-column').textContent()).trim(),'0 min');assert.equal((await snap(page)).materials.untimedRows,0,'explicit zero is a complete estimate');
   await invalid(page,'-1','0');await invalid(page,'abc','0');await invalid(page,'1666','41');
   // Clicking export commits the focused minute field and waits for its save.
   if(device.name==='desktop')await page.evaluate(()=>{
    window.__qaDurationTransaction=IDBDatabase.prototype.transaction;window.__qaDurationDelayedWrites=0;
    const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');
    IDBDatabase.prototype.transaction=function(stores,mode,...rest){const tx=window.__qaDurationTransaction.call(this,stores,mode,...rest);if(mode==='readwrite'){window.__qaDurationDelayedWrites++;Object.defineProperty(tx,'oncomplete',{configurable:true,set(callback){descriptor.set.call(tx,event=>setTimeout(()=>callback.call(tx,event),120));}});}return tx;};
   });
   await part(page,'SV300','hours').fill('3');await part(page,'SV300','minutes').fill('30');
   const csv=await download(page,()=>page.locator('#materialCsv').click());await expectRate(page,'operator','SV300',210);
   if(device.name==='desktop'){assert(await page.evaluate(()=>window.__qaDurationDelayedWrites)>0,'export waited for delayed real IndexedDB transaction completion');await page.evaluate(()=>{IDBDatabase.prototype.transaction=window.__qaDurationTransaction;delete window.__qaDurationTransaction;delete window.__qaDurationDelayedWrites;});}
   assert(csv.bytes.toString('utf8').includes('3 tim 30 min'),'CSV has readable unit duration');assert(csv.bytes.toString('utf8').includes('14 tim 30 min'),'CSV has readable full-project total');
   const materialPdf=await download(page,()=>page.locator('#materialPdf').click()),listText=await pdfText(page,materialPdf.bytes);assert(listText.includes('3 tim 30 min'));assert(listText.includes('14 tim 30 min'));assert(!listText.includes('3,5 h'),'PDF uses hours and minutes');
   if(device.name==='desktop')await rejectPersistence(page);
   const saved=(await snap(page)).state,json=await download(page,()=>menu(page,'#saveProject')),pdf=await download(page,()=>menu(page,'#exportPdf'));
   await edit(page,'SV300','invalid','30');await page.waitForSelector('#materialRows [aria-invalid="true"]');await idle(page);
   for(const [bytes,name]of [[pdf.bytes,'manual-roundtrip.pdf'],[json.bytes,'manual-roundtrip.json']]){
    await page.locator('#projectFile').setInputFiles(upload(bytes,name));await confirm(page);await idle(page);assert.deepEqual((await snap(page)).state,saved,'portable project preserves manually entered minutes');assert.equal(await page.locator('#materialRows [aria-invalid="true"]').count(),0,'same-ID reimport discards the replaced invalid draft');
   }
   await view(page,'materials');await download(page,()=>page.locator('#materialCsv').click());assert.deepEqual((await snap(page)).state,saved,'same-ID reimport permits exports from restored saved time');
   await page.reload();await ready(page);await idle(page);await view(page,'materials');assert.deepEqual((await snap(page)).state,saved);await bounds(page,device);
   await menu(page,'#newProject');await confirm(page);await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===0);assert.deepEqual((await snap(page)).state.preferences.materialTimes,{},'new project has no fixed or inherited product times');
   const fresh=await sample(false);await loadSample(page,fresh,'fresh-same-products.pdf');assert.equal((await snap(page)).materials.untimedRows,3,'same products in a new project still require manual times');assert.equal(await part(page,'SV300','hours').inputValue(),'');assert.equal(await part(page,'SV300','minutes').inputValue(),'');
   assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.getItem('qa-other-workspace')),'preserve');
   console.log(device.name+': manual hours/minutes, exact legacy minutes, queued edits/export, invalid/empty/zero durations, readable PDF/CSV, portable reload and project-only times passed');
  }catch(error){console.error(device.name+' 2.14 diagnostic:',await page.evaluate(()=>({message:document.getElementById('appMessage')?.textContent,materials:window.Proj2App?.snapshot().materials,inputs:[...document.querySelectorAll('#materialRows [data-material-time]')].map(input=>({part:input.dataset.timePart,value:input.value,invalid:input.getAttribute('aria-invalid')})),dialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id)})).catch(()=>({})));throw error;}finally{await ctx.close();}
 }
}
const body=scenario.toString(),injected=body.slice(body.indexOf('{')+1,body.lastIndexOf('}'));
const source=(base.slice(0,start)+injected+base.slice(end)).replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering.html');
const child=new Module(fixturePath,module);child.filename=fixturePath;child.paths=module.paths;child._compile(source,fixturePath);
