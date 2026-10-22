'use strict';
// Focused WC/HWC regression using the shared generated PDF/auth/license fixture.
// No images or screenshots are created; 2.6 canvas/PDF/material code is unchanged.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs'),base=fs.readFileSync(file,'utf8');
const start=base.indexOf('async function run(browser,device,source){'),end=base.indexOf('async function denied(browser){',start);
if(start<0||end<0)throw Error('Missing shared browser fixture boundaries');
function suite27(){
async function shown27(page){return page.locator('#stampList [data-stencil-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.stencilId));}
async function group27(page,name){
 await view(page,'stencils');await page.locator('#stampSearch').fill('');
 await page.locator('#stencilCategories [data-stencil-category="cards"]').click();
 await page.locator('#stencilCardGroups [data-card-group="'+name+'"]').click();return shown27(page);
}
async function import27(page,text,name){
 await page.locator('#projectFile').setInputFiles(upload(Buffer.from(text),name));
 await confirm(page);await idle(page);
}
async function refs27(page){
 const refs=await page.evaluate(()=>[...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(node=>new URL(node.src||node.href).pathname.split('/').pop()));
 for(const name of ['smartmatch-projektering-v2-7.js','smartmatch-projektering-v2-7-data.js','smartmatch-projektering-v2-7.css','smartmatch-projektering-v2-6-canvas.js','smartmatch-projektering-v2-6-pdf.js','smartmatch-projektering-v2-6-materials.js'])assert(refs.includes(name),'current app loads '+name);
 assert(!refs.includes('smartmatch-projektering-v2-6.js')&&!refs.includes('smartmatch-projektering-v2-4-data.js'),'old main/default data cannot leak into the new page');
}
async function run(browser,device,source){
 const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const trace=text=>{if(process.env.PROJECTION2_DEBUG)console.log(device.name+': '+text);};
 try{
  await page.goto(url());await ready(page);await refs27(page);await overflow(page);
  assert.equal(await page.evaluate(()=>Proj2App.version),'2.7');
  let state=(await snap(page)).state;
  for(const code of ['WC','HWC'])assert.equal(state.stencils[code].kind,'card','fresh defaults include '+code);
  for(const code of ['VC','HVC'])assert.equal(state.stencils[code],undefined,'fresh defaults omit '+code);
  assert.equal(Object.keys(state.stencils).length,107);
  assert.deepEqual(await page.locator('#stencilCategories button').allTextContents(),['Dörrkort','Övrigt']);
  assert.equal(await page.locator('#stencilCardGroups [data-card-group="GS"]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(await page.locator('#stencilCardGroups button').evaluateAll(nodes=>nodes.map(node=>node.dataset.cardGroup)),['GS','DBL','WC-HWC','other']);
  assert.equal(await page.locator('#stencilCardGroups [data-card-group="WC-HWC"]').textContent(),'WC / HWC');
  let shown=await group27(page,'WC-HWC');assert.deepEqual(shown.sort(),['HWC','WC']);
  await page.locator('#stampSearch').fill('VC');assert.deepEqual(await shown27(page),[],'fresh library has no old V-family result');
  await page.locator('#stencilCategories [data-stencil-category="other"]').click();shown=await shown27(page);for(const code of ['DA','DS','DFS'])assert(shown.includes(code));
  await page.locator('#stampSearch').fill('WC');shown=await shown27(page);assert(shown.includes('WC')&&shown.includes('HWC'),'global W search crosses the top-level Other filter');
  assert.equal(await page.locator('#stencilCardGroups').isVisible(),false);trace('fresh WC/HWC defaults, subgroup and global search');
  await settleImport(page,'#drawingFile',source,'generated-WC-HWC-plans.pdf',2);
  const unused=await page.evaluate(async()=>{
   const current=Proj2App.snapshot().state,record=await Proj2Store.load();
   for(const code of ['VC','HVC','WC-CUSTOM','HWC-CUSTOM'])Proj2Data.addStencil(current,{...Proj2Data.defaultStencilFor(current,code),id:code,code,kind:'card',category:'Legacy category kept'});
   return new TextDecoder().decode(await Proj2Store.pack(current,record.original));
  });
  await import27(page,unused,'unused-legacy-V-defaults.json');
  state=(await snap(page)).state;
  for(const code of ['VC','HVC']){assert(state.stencils[code],'unused legacy stencil remains stored');assert.equal(state.cards[code],undefined);}
  await group27(page,'other');shown=await shown27(page);assert(!shown.includes('VC')&&!shown.includes('HVC'),'unused exact old V defaults stay out of the library');
  await page.locator('#stampSearch').fill('VC');shown=await shown27(page);assert(!shown.includes('VC')&&!shown.includes('HVC'),'global search also hides only unused exact V defaults');
  shown=await group27(page,'WC-HWC');for(const code of ['WC','HWC','WC-CUSTOM','HWC-CUSTOM'])assert(shown.includes(code),'W family includes '+code);
  const used=await page.evaluate(async()=>{
   const current=Proj2App.snapshot().state,record=await Proj2Store.load(),placements=[];
   for(const [index,code]of ['VC','HVC'].entries()){
    const placement=Proj2Data.addPlacement(current,{stencilId:code,page:index+1,x:.35+index*.2,y:.40});placements.push(placement.id);
    const card=Proj2Data.createCard(code);card.note='Original '+code+' door card';card.meta.doorType='Saved legacy '+code;card.rows.find(row=>row.id==='day-lock').product='LEGACY-'+code+'-LOCK';
    Proj2Data.updateCard(current,code,card);
   }
   return {text:new TextDecoder().decode(await Proj2Store.pack(current,record.original)),placements};
  });
  await import27(page,used.text,'used-legacy-V-door-cards.json');
  shown=await group27(page,'WC-HWC');assert(!shown.includes('VC')&&!shown.includes('HVC'),'used old V cards do not appear in the W family');
  shown=await group27(page,'other');assert(shown.includes('VC')&&shown.includes('HVC'),'used original V cards remain reachable under Other door cards');
  await page.locator('#stampSearch').fill('VC');shown=await shown27(page);assert(shown.includes('VC')&&shown.includes('HVC'),'global search finds the original used V codes');
  for(const code of ['VC','HVC']){
   await view(page,'stencils');await page.locator('#cardList [data-card-code="'+code+'"]').click();await view(page,'cards');await idle(page);
   const current=await snap(page);assert.equal(current.activeCode,code);assert.equal(current.draft.note,'Original '+code+' door card');
   assert.equal(await page.locator('#cardNote').inputValue(),'Original '+code+' door card');
  }
  state=(await snap(page)).state;
  assert.deepEqual(state.placements.map(placement=>placement.id),used.placements,'original placement identities survive opening the cards');
  for(const code of ['VC','HVC']){assert.equal(state.stencils[code].code,code);assert.equal(state.stencils[code].category,'Legacy category kept');assert.equal(state.cards[code].rows.find(row=>row.id==='day-lock').product,'LEGACY-'+code+'-LOCK');}
  trace('unused old defaults hidden; saved and placed old V cards preserved');
  const portable=await download(page,()=>page.locator('#saveProject').click());assert(portable.bytes.length>source.length);
  await import27(page,portable.bytes,'roundtrip-W-and-legacy-V.json');assert.deepEqual((await snap(page)).state,state,'portable JSON roundtrip preserves all original work');
  await page.reload();await ready(page);await idle(page);assert.deepEqual((await snap(page)).state,state,'IndexedDB reload preserves W and old V cards');
  await page.goto(url().replace('smartmatch-projektering-v2-7.html','smartmatch-projektering.html'));await ready(page);await refs27(page);await idle(page);
  assert.equal(await page.evaluate(()=>Proj2App.version),'2.7');assert.deepEqual((await snap(page)).state,state,'stable entry opens the same saved project');
  assert.equal((await persisted(page)).bytes,source.length);assert.equal(await page.evaluate(()=>localStorage.getItem('qa-other-workspace')),'preserve');
  await overflow(page);assert.deepEqual(errors,[]);
  console.log(device.name+': WC/HWC defaults, groups/search, legacy VC/HVC preservation, JSON/IndexedDB and stable entry passed');
 }catch(error){console.error(device.name+' diagnostic:',await page.evaluate(()=>({message:document.getElementById('appMessage')?.textContent,view:window.Proj2App?.snapshot().view,activeCode:window.Proj2App?.snapshot().activeCode})).catch(()=>({})));throw error;}finally{await ctx.close();}
}
}
const body=suite27.toString(),scenario=body.slice(body.indexOf('{')+1,body.lastIndexOf('}'));
const source=(base.slice(0,start)+scenario+base.slice(end)).replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-7.html');
const child=new Module(file,module);child.filename=file;child.paths=module.paths;child._compile(source,file);
