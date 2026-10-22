'use strict';
// Generated integration fixtures only. Keep 2.2's complete gesture regression and
// verify 2.6 stencil groups and simple symbols with native touchscreen recovery.
// No screenshots or generated images are used.
// Authentication alone is stubbed by the shared fixture; the actual guard runs.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs');
let source=fs.readFileSync(file,'utf8');
function insert(anchor,extra){if(!source.includes(anchor))throw Error('Missing 2.2 test insertion point: '+anchor);source=source.replace(anchor,anchor+extra);}
insert("await page.goto(url());await ready(page);await overflow(page);trace('boot');",`
  assert.equal(await page.evaluate(()=>Proj2App.version),'2.6');
  assert.deepEqual(await page.locator('#stencilCategories button').allTextContents(),['Dörrkort','Övrigt']);
  assert.equal(await page.locator('#stencilCategories [data-stencil-category="cards"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#stencilCardGroups [data-card-group="GS"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#stampList [data-stencil-id="GS1"]').count(),1);assert.equal(await page.locator('#stampList [data-stencil-id="GS100"]').count(),1);assert.equal(await page.locator('#stampList [data-stencil-id="DA"]').count(),0);
  assert.equal(await page.locator('#alignTools,[data-tool-option="alignTools"]').count(),0,'alignment tools were removed');
  assert.equal((await snap(page)).state.stencils.DADS,undefined,'new projects do not include the combined DA/DS stencil');
  await page.locator('#toolMenu>summary').click();
  await page.locator('[data-tool-option="lockSelection"]').check();
  await page.locator('#toolMenu>summary').click();
  await page.waitForFunction(()=>Proj2App.snapshot().state.preferences.toolbarTools.includes('lockSelection'));
`);
insert("const third=await place(page,'DGS100',.45,.45);assert.equal(third.page,2);trace('second rotated page placed');",`
  if(device.touch)assert.equal(await page.locator('body').getAttribute('data-view'),'cards','placing a door stamp opens its card');
  await view(page,'drawing');
`);
insert('const beforeFiles=(await snap(page)).state;',`
  assert(beforeFiles.preferences,'editor preferences are part of the saved project');
`);
const beforeFiles='  const beforeFiles=(await snap(page)).state;';
if(!source.includes(beforeFiles))throw Error('Missing interaction test insertion point');
source=source.replace(beforeFiles,"  await interactions22(page,device);trace('2.2 gestures, sizing and toolbar');\n  await equipment23(page,device);trace('2.3 equipment, custom stencil and legacy project');\n  await features24(page,device);trace('2.4 categories, equipment and material totals');\n"+beforeFiles);
insert("const portable=await download(page,()=>page.locator('#exportPdf').click());assert.equal(portable.bytes.subarray(0,5).toString(),'%PDF-');trace('downloads');",`
  await combinedPdf23(page,portable,beforeFiles);trace('combined PDF has plans, saved cards and equipment');
  await equipmentSchedule23(page,beforeFiles);trace('equipment CSV quantities');
`);
insert("assert.deepEqual((await snap(page)).state.cards,beforeFiles.cards);trace('PDF reopen');",`
  assert.deepEqual((await snap(page)).state.preferences,beforeFiles.preferences,'PDF attachment preserves editing preferences');
`);
insert("assert.equal((await persisted(page)).bytes,source.length);trace('IDB reload');",`
  assert.deepEqual((await snap(page)).state.preferences,beforeFiles.preferences,'local reload preserves toolbar and size scope');
`);
const helperAnchor='async function run(browser,device,source){';
if(!source.includes(helperAnchor))throw Error('Missing 2.2 helper insertion point');
source=source.replace(helperAnchor,String.raw`
async function stampBox23(page,id){
 // showView redraws the SVG on a frame boundary. Read the live node and its
 // rectangle in one browser task, so a detached old SVG cannot return null.
 const handle=await page.waitForFunction(id=>{const node=[...document.querySelectorAll('[data-placement-id]')].find(node=>node.dataset.placementId===id);if(!node)return false;const box=node.getBoundingClientRect();return box.width&&box.height?{x:box.x,y:box.y,width:box.width,height:box.height}:false;},id);
 try{return await handle.jsonValue();}finally{await handle.dispose();}
}
async function equipmentCounts23(page,expected={}){
 const value=await page.evaluate(()=>{
  const state=Proj2App.snapshot().state;
  return {counts:Proj2Data.placementCounts(state),actual:{markings:Number(document.getElementById('placementCount').textContent),cards:Number(document.getElementById('cardCount').textContent),doorAutomation:Number(document.getElementById('automationCount').textContent),doorCloser:Number(document.getElementById('closerCount').textContent),otherProducts:Number(document.getElementById('otherProductCount').textContent)},placements:state.placements.length,cards:Object.keys(state.cards).length};
 });
 assert.deepEqual(value.actual,value.counts,'visible counts follow current placements, not a separate accumulating counter');
 assert.equal(value.counts.markings,value.placements);assert.equal(value.counts.cards,value.cards);
 for(const [key,count]of Object.entries(expected))assert.equal(value.counts[key],count,'equipment count '+key);
 return value.counts;
}
async function equipment23(page,device){
 await idle(page);await equipmentCounts23(page);
 await view(page,'stencils');await page.locator('#stampSearch').fill('DADS');
 assert.equal(await page.locator('#stampList [data-stencil-id="DADS"]').count(),0,'combined default is absent from the library');
 const initial=await snap(page),before=await equipmentCounts23(page),cardCodes=Object.keys(initial.state.cards).sort();
 for(const [code,kind]of [['DA','doorAutomation'],['DS','doorCloser']]){
  assert.equal(initial.state.stencils[code].kind,'symbol');assert.equal(initial.state.stencils[code].productType,kind);
 }
 const da=await place(page,'DA',.76,.24);await equipmentCounts23(page,{doorAutomation:before.doorAutomation+1,cards:before.cards});
 await page.locator('#duplicateSelection').click();await waitCount(page,before.markings+2);
 await equipmentCounts23(page,{doorAutomation:before.doorAutomation+2,cards:before.cards});
 await page.locator('#deleteSelection').click();await waitCount(page,before.markings+1);
 await equipmentCounts23(page,{doorAutomation:before.doorAutomation+1});
 await page.locator('#undo').click();await waitCount(page,before.markings+2);await equipmentCounts23(page,{doorAutomation:before.doorAutomation+2});
 await page.locator('#redo').click();await waitCount(page,before.markings+1);await equipmentCounts23(page,{doorAutomation:before.doorAutomation+1});
 await select(page,da.id);await page.locator('#deleteSelection').click();await waitCount(page,before.markings);await equipmentCounts23(page,{doorAutomation:before.doorAutomation});
 await place(page,'DA',.76,.30);await equipmentCounts23(page,{doorAutomation:before.doorAutomation+1});
 await page.locator('#pageNumber').fill('2');await page.locator('#pageNumber').dispatchEvent('change');await page.waitForFunction(()=>Proj2App.snapshot().page===2);await idle(page);
 const ds=await place(page,'DS',.22,.72);await equipmentCounts23(page,{doorCloser:before.doorCloser+1});
 await page.locator('#duplicateSelection').click();await waitCount(page,before.markings+3);await equipmentCounts23(page,{doorCloser:before.doorCloser+2});
 await page.locator('#undo').click();await waitCount(page,before.markings+2);await equipmentCounts23(page,{doorCloser:before.doorCloser+1});
 await select(page,ds.id);await page.locator('#lockSelection').click();await page.waitForFunction(id=>Proj2App.snapshot().state.placements.find(p=>p.id===id).locked,ds.id);
 await equipmentCounts23(page,{doorCloser:before.doorCloser+1});
 await page.locator('#lockSelection').click();await page.waitForFunction(id=>!Proj2App.snapshot().state.placements.find(p=>p.id===id).locked,ds.id);
 assert.deepEqual(Object.keys((await snap(page)).state.cards).sort(),cardCodes,'DA and DS never create door cards');
 await page.locator('#newStencilTool').click();await page.waitForSelector('#stencilDialog[open]');
 assert.deepEqual(await page.locator('#stencilKind option').allTextContents(),['Dörrkort','Symbol · Övrigt']);
 await page.locator('#stencilCode').fill('DBL-DS');await page.locator('#stencilName').fill('Egen stängare QA');await page.locator('#stencilKind').selectOption('symbol');
 assert.equal(await page.locator('#stencilProductType').inputValue(),'other','custom symbols default to the explicit other count');
 await page.locator('#stencilShape').selectOption('square');await page.locator('#stencilWidth').fill('28');await page.locator('#stencilHeight').fill('28');await page.locator('#stencilFontSize').fill('40');
 await page.waitForSelector('#stencilPreview svg text');
 const preview=await page.locator('#stencilPreview svg').evaluate(svg=>{
  const text=svg.querySelector('text'),outer=svg.getBoundingClientRect(),label=text.getBoundingClientRect(),stage=document.getElementById('stencilPreview').getBoundingClientRect();
  return {text:text.textContent,inside:label.left>=outer.left-1&&label.right<=outer.right+1&&label.top>=outer.top-1&&label.bottom<=outer.bottom+1,stageFits:outer.left>=stage.left-1&&outer.right<=stage.right+1&&outer.top>=stage.top-1&&outer.bottom<=stage.bottom+1};
 });
 assert.equal(preview.text,'DBL-DS');assert.equal(preview.inside,true,'long preview text fits the stamp even at oversized requested font');assert.equal(preview.stageFits,true,'one preview shape fits inside its own stage');
 await page.locator('#stencilWidth').fill('64');await page.locator('#stencilFontSize').fill('11');await page.locator('#stencilProductType').selectOption('doorCloser');
 await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});
 const own=await place(page,'DBL-DS',.72,.82);await equipmentCounts23(page,{doorCloser:before.doorCloser+2,cards:before.cards});
 assert.equal((await snap(page)).state.stencils[own.stencilId].productType,'doorCloser');assert.equal((await snap(page)).state.cards['DBL-DS'],undefined);
 await view(page,'stencils');await page.locator('#stampSearch').fill('DBL-DS');assert((await page.locator('#stampList [data-stencil-id="DBL-DS"]').getAttribute('title')).includes('Dörrstängare'),'count category remains available in the stencil title');
 // A legacy combined symbol remains editable rather than silently deleting placed work.
 const legacy=await page.evaluate(async()=>{
  const current=Proj2App.snapshot().state,record=await Proj2Store.load();
  const definition={...Proj2Data.defaultStencil('DADS'),id:'DADS',code:'DADS',kind:'symbol',productType:'none'};
  Proj2Data.addStencil(current,definition);const added=Proj2Data.addPlacement(current,{stencilId:'DADS',page:2,x:.12,y:.22});
  const portable=JSON.parse(new TextDecoder().decode(await Proj2Store.pack(current,record.original)));portable.state.preferences.toolbarTools.push('alignTools');
  return {id:added.id,text:JSON.stringify(portable)};
 });
 await page.locator('#projectFile').setInputFiles(upload(Buffer.from(legacy.text),'legacy-equipment.json'));await confirm(page);await idle(page);
 await page.waitForFunction(id=>Proj2App.snapshot().state.placements.some(p=>p.id===id),legacy.id);
 assert.equal((await snap(page)).state.preferences.toolbarTools.includes('alignTools'),false,'legacy retired toolbar setting is migrated');
 await equipmentCounts23(page,{doorAutomation:before.doorAutomation+1,doorCloser:before.doorCloser+2,cards:before.cards});
 await page.locator('#pageNumber').fill('2');await page.locator('#pageNumber').dispatchEvent('change');await page.waitForFunction(()=>Proj2App.snapshot().page===2);await idle(page);
 assert.equal(await page.locator('[data-placement-id="'+legacy.id+'"]').count(),1,'legacy combined symbol stays on the drawing');
 assert.equal((await snap(page)).state.cards.DADS,undefined);await overflow(page);
}
async function combinedPdf23(page,downloaded,beforeFiles){
 assert(downloaded.name.endsWith('-ritning-och-dorrkort.pdf'),'the primary PDF action exports drawing and cards together');
 const value=await page.evaluate(async bytes=>{
  const binary=Uint8Array.from(bytes),inspection=await Proj2PDF.inspect(binary),pdf=await pdfjsLib.getDocument({data:binary.slice()}).promise;
  try{const pages=[];for(let i=1;i<=pdf.numPages;i++)pages.push((await(await pdf.getPage(i)).getTextContent()).items.map(item=>item.str).join(' '));return {pages,state:inspection.state,counts:Proj2Data.placementCounts(inspection.state)};}finally{await pdf.destroy();}
 },[...downloaded.bytes]);
 assert(value.pages.length>beforeFiles.drawing.pages.length+Object.keys(beforeFiles.cards).length,'one PDF contains every source page, saved door card and readable product-object pages');
 const plans=value.pages.slice(0,beforeFiles.drawing.pages.length).join(' '),cards=value.pages.slice(beforeFiles.drawing.pages.length).join(' ');
 for(const code of ['GS65','DA','DS','DBL-DS'])assert(plans.includes(code),'drawing text contains searchable '+code);
 for(const detail of ['QA-DA-01','SW300','DFS-QA','QA-CUSTOM-PRODUCT'])assert(!plans.includes(detail),'source drawing contains symbol codes without product detail '+detail);
 for(const code of Object.keys(beforeFiles.cards))assert(cards.includes(code),'combined PDF includes saved door card '+code);
 assert(!Object.hasOwn(value.state.cards,'DA')&&!Object.hasOwn(value.state.cards,'DS'),'equipment has no invented card pages');
 assert.deepEqual(value.state.stencils,beforeFiles.stencils,'editable PDF preserves every equipment product category');
 assert.deepEqual(value.state.placements,beforeFiles.placements,'editable PDF preserves object numbers, product models and quantities');
 assert(value.pages.join(' ').includes('QA-DA-01'),'combined PDF includes readable individual object numbers');
 assert(value.pages.join(' ').includes('SW300'),'combined PDF includes full product model');
 assert.equal(value.counts.doorAutomation,beforeFiles.placements.filter(p=>beforeFiles.stencils[p.stencilId].productType==='doorAutomation').reduce((n,p)=>n+p.equipment.quantity,0));
 assert.equal(value.counts.doorCloser,beforeFiles.placements.filter(p=>beforeFiles.stencils[p.stencilId].productType==='doorCloser').reduce((n,p)=>n+p.equipment.quantity,0));
}
async function equipmentSchedule23(page,state){
 await page.locator('.project-menu>summary').click();
 const csv=await download(page,()=>page.locator('#exportSchedule').click());
 const expected=await page.evaluate(()=>Proj2Materials.csv(Proj2Materials.build(Proj2App.snapshot().state)));
 assert.equal(csv.bytes.toString('utf8'),expected,'schedule CSV uses the same aggregate totals as the material tab');
}
async function report24(page){return page.evaluate(()=>Proj2Materials.build(Proj2App.snapshot().state));}
const productTotal24=(report,name)=>report.rows.filter(row=>row.product===name).reduce((sum,row)=>sum+row.quantity,0);
async function chooseCardProduct24(page,rowId,productId){
 await productButton(page,rowId).click();await page.locator('#productList [data-product-id="'+productId+'"]').click();
}
async function materialView24(page){await view(page,'materials');await page.waitForSelector('#materialsPane:visible');await page.locator('#materialSearch').fill('');await overflow(page);}
async function shown26(page){return page.locator('#stampList [data-stencil-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.stencilId));}
async function group26(page,group){await view(page,'stencils');await page.locator('#stampSearch').fill('');await page.locator('#stencilCategories [data-stencil-category="cards"]').click();await page.locator('#stencilCardGroups [data-card-group="'+group+'"]').click();return shown26(page);}
async function noSymbolActivation26(page,id,device){
 await focus25(page,id);const before=await snap(page),box=await stampBox23(page,id);
 if(device.touch)await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);else await page.mouse.dblclick(box.x+box.width/2,box.y+box.height/2);
 await idle(page);assert.equal(await page.locator('body').getAttribute('data-view'),'drawing');
 assert.equal(await page.locator('dialog[open]').count(),0,'symbol tap/doubleclick opens no modal');
 let after=await snap(page);assert.deepEqual(after.state.cards,before.state.cards);assert.deepEqual(after.state.placements,before.state.placements);
 await page.locator('[data-placement-id="'+id+'"]').focus();await page.keyboard.press('Enter');await idle(page);
 assert.equal(await page.locator('dialog[open]').count(),0,'symbol Enter opens no modal');assert.equal(await page.locator('body').getAttribute('data-view'),'drawing');
 assert.equal(await page.locator('#editEquipment').isVisible(),false,'inspector has no product form action');
 const text=await page.locator('[data-placement-id="'+id+'"] text').allTextContents(),p=(await snap(page)).state.placements.find(p=>p.id===id);assert.deepEqual(text,[p.code],'symbol renders only its code');
 if(!device.touch){const center=await stampCenter25(page,id);await page.mouse.click(center.x,center.y,{button:'right'});await page.waitForSelector('#stampContextMenu:not([hidden])');assert.equal(await page.locator('[data-context-action="equipment"]').isVisible(),false,'context menu has no product form action');await page.keyboard.press('Escape');}
}
async function features24(page,device){
 let state=(await snap(page)).state;
 const dfs=await place(page,'DFS',.46,.20);
 await view(page,'stencils');await page.locator('#stampSearch').fill('');await page.locator('#stencilCategories [data-stencil-category="other"]').click();
 assert.deepEqual(await page.locator('#stencilCategories button').allTextContents(),['Dörrkort','Övrigt'],'only the two requested top-level filters are shown');
 assert.equal(await page.locator('#stencilCardGroups').isVisible(),false);
 let shown=await shown26(page);for(const code of ['DA','DS','DFS','DADS','DBL-DS'])assert(shown.includes(code),'all symbol kinds are under Other, including '+code);
 for(const id of shown)assert.equal(state.stencils[id].kind,'symbol');
 await page.locator('#newStencil').click();await page.waitForSelector('#stencilDialog[open]');
 assert.equal(await page.locator('#stencilKind').inputValue(),'symbol');assert.equal(await page.locator('#stencilShape').inputValue(),'square');
 assert.equal(await page.locator('#stencilWidth').inputValue(),'28');assert.equal(await page.locator('#stencilHeight').inputValue(),'28');
 assert.equal(await page.locator('#stencilCategoryField').isVisible(),false);assert.equal(await page.locator('#stencilCustomCategoryField').isVisible(),false);
 await page.locator('#stencilCode').fill('QA-CAT');await page.locator('#stencilName').fill('QA-CUSTOM-PRODUCT');await page.locator('#stencilFill').fill('#123456');await page.locator('#stencilStroke').fill('#654321');await page.locator('#stencilTextColor').fill('#abcdef');
 await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});
 const custom=await place(page,'QA-CAT',.68,.18),extra=await place(page,'DA',.84,.72);
 await view(page,'stencils');await page.locator('#stampSearch').fill('');await page.locator('#stencilCategories [data-stencil-category="other"]').click();await page.locator('#newStencil').click();await page.waitForSelector('#stencilDialog[open]');
 await page.locator('#stencilCode').fill('AK-QA');await page.locator('#stencilName').fill('JCK207');await page.locator('#stencilProductType').selectOption('elbowContact');await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});
 const ak=await place(page,'AK-QA',.48,.82);
 // Import a real portable project to preserve existing model/object/category
 // metadata while exercising the simplified UI. There is no symbol form now.
 const legacy=await page.evaluate(async ({dfs,custom,ak})=>{
  const current=Proj2App.snapshot().state,record=await Proj2Store.load(),da=current.placements.find(p=>p.code==='DA');
  Proj2Data.updateEquipment(current,da.id,{objectNumber:'QA-DA-01',model:'SW300',quantity:3,note:'Legacy technician details'});
  Proj2Data.updateEquipment(current,dfs,{model:'DFS-QA',quantity:2});Proj2Data.updateEquipment(current,custom,{model:'QA-CUSTOM-PRODUCT'});Proj2Data.updateEquipment(current,ak,{model:'JCK207'});
  Proj2Data.updateStencil(current,'QA-CAT',{category:'QA Passage'});
  for(const code of ['DBL-QA','VC-QA','HVC-QA','OTHER-QA'])Proj2Data.addStencil(current,{...Proj2Data.defaultStencilFor(current,code),id:code,code,kind:'card',category:'Legacy odd category'});
  return new TextDecoder().decode(await Proj2Store.pack(current,record.original));
 },{dfs:dfs.id,custom:custom.id,ak:ak.id});
 await page.locator('#projectFile').setInputFiles(upload(Buffer.from(legacy),'legacy-simple-symbols.json'));await confirm(page);await idle(page);
 state=(await snap(page)).state;assert.equal(state.stencils['QA-CAT'].category,'QA Passage');assert.equal(state.stencils['QA-CAT'].fill,'#123456');assert.equal(state.stencils['QA-CAT'].stroke,'#654321');assert.equal(state.stencils['QA-CAT'].textColor,'#abcdef');
 assert.deepEqual(await page.locator('#stencilCardGroups button').evaluateAll(nodes=>nodes.map(node=>node.dataset.cardGroup)),['GS','DBL','VC-HVC','other']);
 shown=await group26(page,'GS');assert(shown.includes('GS1')&&shown.includes('GS100'));assert(!shown.includes('DA')&&!shown.includes('DBL-QA'));
 shown=await group26(page,'DBL');assert(shown.includes('DBL-QA')&&!shown.includes('DBL-DS'),'kind determines whether a DBL code is a card or symbol');
 shown=await group26(page,'VC-HVC');assert(shown.includes('VC-QA')&&shown.includes('HVC-QA')&&!shown.includes('GS1'));
 shown=await group26(page,'other');assert(shown.includes('OTHER-QA')&&shown.includes('DGS100')&&!shown.includes('DADS'),'unusual door-card codes remain discoverable');
 await page.locator('#stampSearch').fill('DA');shown=await shown26(page);assert(shown.includes('DA')&&shown.includes('DADS'),'global search crosses door-card groups and top-level types');assert.equal(await page.locator('#stencilCardGroups').isVisible(),false);
 await page.locator('#stencilCategories [data-stencil-category="other"]').click();await page.locator('#stampSearch').fill('GS65');assert((await shown26(page)).includes('GS65'),'global search finds a card while Other is selected');
 await page.locator('#stampSearch').fill('');shown=await shown26(page);assert(shown.includes('QA-CAT')&&shown.includes('DADS'),'legacy custom category does not hide a symbol from Other');
 const da=state.placements.find(p=>p.code==='DA');await noSymbolActivation26(page,da.id,device);await noSymbolActivation26(page,custom.id,device);
 // Blank models now count by symbol code. Existing saved models still count
 // with their existing quantity, while editable GS cards use the product picker.
 let report=await report24(page);assert.equal(report.unresolved.length,0);assert.equal(productTotal24(report,'DA'),2,'two blank legacy model fields count by symbol code');assert.equal(productTotal24(report,'SW300'),3);
 await view(page,'drawing');await page.locator('#pageNumber').fill('1');await page.locator('#pageNumber').dispatchEvent('change');await page.waitForFunction(()=>Proj2App.snapshot().page===1);await idle(page);await page.locator('#zoomFit').click();await idle(page);
 const baseLock=productTotal24(report,'511-50'),baseArm=productTotal24(report,'JCK207'),baseOperator=productTotal24(report,'SW300');
 const gs=await place(page,'GS1',.20,.20);await select(page,gs.id);await view(page,'cards');
 await chooseCardProduct24(page,'day-lock','lock-511-50');await chooseCardProduct24(page,'day-cylinder-hinge','cylinder-8882');await chooseCardProduct24(page,'day-cylinder-strike','cylinder-8882');await chooseCardProduct24(page,'day-strike','strike-std');await chooseCardProduct24(page,'closing-elbow','activation-jck207');await chooseCardProduct24(page,'access-button','activation-jck207');await chooseCardProduct24(page,'closing-operator','operator-sw300');await saveCard(page);
 report=await report24(page);assert.equal(productTotal24(report,'511-50'),baseLock+1);assert.equal(productTotal24(report,'8882'),2);assert.equal(productTotal24(report,'JCK207'),baseArm+3,'elbow contact counts twice and opening button once');assert.equal(productTotal24(report,'SW300'),baseOperator+1);
 assert.equal(report.rows.filter(row=>row.product==='JCK207').length,2,'elbow and opening button remain separate components');
 const beforeDuplicate=(await snap(page)).state.placements.length;await select(page,gs.id);await page.locator('#duplicateSelection').click();await waitCount(page,beforeDuplicate+1);report=await report24(page);assert.equal(productTotal24(report,'511-50'),baseLock+2);assert.equal(productTotal24(report,'JCK207'),baseArm+6);
 await page.locator('#deleteSelection').click();await waitCount(page,beforeDuplicate);report=await report24(page);assert.equal(productTotal24(report,'JCK207'),baseArm+3);
 await page.locator('#newCardTool').click();await page.waitForSelector('#textDialog[open]');await page.locator('#textValue').fill('QA-UNPLACED');await page.locator('#textAccept').click();await page.waitForFunction(()=>!!Proj2App.snapshot().state.cards['QA-UNPLACED']);await chooseCardProduct24(page,'day-lock','lock-511-50');await saveCard(page);report=await report24(page);assert.equal(productTotal24(report,'511-50'),baseLock+1);assert(report.unplacedCards.includes('QA-UNPLACED'));
 await materialView24(page);const text=await page.locator('#materialRows').innerText();assert(text.includes('511-50')&&text.includes('JCK207')&&text.includes('SW300')&&text.includes('DFS-QA')&&text.includes('DA'));
 await page.locator('#materialSearch').fill('JCK207');assert(!(await page.locator('#materialRows').innerText()).includes('511-50'));await page.locator('#materialSearch').fill('');
 const csv=await download(page,()=>page.locator('#materialCsv').click()),expectedCsv=await page.evaluate(()=>Proj2Materials.csv(Proj2Materials.build(Proj2App.snapshot().state)));assert.equal(csv.bytes.toString('utf8'),expectedCsv);
 const pdf=await download(page,()=>page.locator('#materialPdf').click());assert.equal(pdf.bytes.subarray(0,5).toString(),'%PDF-');await view(page,'drawing');await equipmentCounts23(page);await overflow(page);
}
async function stampCenter25(page,id){
 const handle=await page.waitForFunction(id=>{const node=[...document.querySelectorAll('[data-placement-id]')].find(node=>node.dataset.placementId===id);if(!node||!node.getScreenCTM())return false;const p=new DOMPoint(0,0).matrixTransform(node.getScreenCTM()),r=document.querySelector('.p2-canvas-scroller').getBoundingClientRect();return p.x>r.left+2&&p.x<r.right-2&&p.y>r.top+2&&p.y<r.bottom-2?{x:p.x,y:p.y}:false;},id);
 try{return await handle.jsonValue();}finally{await handle.dispose();}
}
async function focus25(page,id){
 await view(page,'drawing');await idle(page);
 await page.locator('[data-focus-id="'+id+'"]').dispatchEvent('click');
 await page.waitForFunction(id=>Proj2App.snapshot().selectedIds.includes(id),id);
 await idle(page);return stampCenter25(page,id);
}
async function pinch25(cdp,point,factor){
 const radius=27;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x-radius,y:point.y,id:201},{x:point.x+radius,y:point.y,id:202}]});
 for(let i=1;i<=6;i++){const r=radius*(1+(factor-1)*i/6),dx=4*i/6,dy=-3*i/6;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+dx-r,y:point.y+dy,id:201},{x:point.x+dx+r,y:point.y+dy,id:202}]});}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function nativeTap25(cdp,point){
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:203}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function nativeDrag25(cdp,point,dx,dy,cancel=false){
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:204}]});
 for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+dx*i/6,y:point.y+dy*i/6,id:204}]});
 await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
}
async function fastGesture25(page,id,drag=false){
 const center=await stampCenter25(page,id);
 // Intentionally dispatch down/move/up in one browser task. Native CDP calls
 // yield between events and would let the unsaved-dialog cancel the gesture
 // before its dependent activation/move has reached the application queue.
 await page.evaluate(({id,center,drag})=>{
  const node=[...document.querySelectorAll('[data-placement-id]')].find(node=>node.dataset.placementId===id);
  const event=(type,x,y)=>new PointerEvent(type,{bubbles:true,composed:true,pointerType:'touch',pointerId:901,isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y});
  node.dispatchEvent(event('pointerdown',center.x,center.y));
  if(drag)node.dispatchEvent(event('pointermove',center.x+18,center.y+8));
  node.dispatchEvent(event('pointerup',center.x+(drag?18:0),center.y+(drag?8:0)));
 },{id,center,drag});
}
async function queuedCancel25(page,device){
 await view(page,'drawing');await page.locator('#toolSelect').click();await page.locator('#zoomFit').click();await idle(page);
 const state=(await snap(page)).state,old=state.placements.find(p=>p.code==='GS65'&&p.page===1),other=state.placements.find(p=>p.code==='GS1'&&p.page===1);assert(old&&other);
 await select(page,old.id);await view(page,'cards');await page.locator('#cardNote').fill('QA-queued-touch-draft');
 const before=await snap(page);await view(page,'drawing');await page.locator('#zoomFit').click();await idle(page);
 await page.evaluate(()=>{
  window.__promptCount25=0;window.__promptObserver25=new MutationObserver(records=>{for(const record of records)if(record.oldValue===null)window.__promptCount25++;});
  window.__promptObserver25.observe(document.getElementById('confirmDialog'),{attributes:true,attributeFilter:['open'],attributeOldValue:true});
 });
 try{
  for(const [index,drag]of [false,true].entries()){
   await fastGesture25(page,other.id,drag);await page.waitForSelector('#confirmDialog[open]');
   assert((await page.locator('#confirmTitle').textContent()).includes(old.code));
   await page.locator('#confirmCancel').click();await idle(page);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await page.locator('#confirmDialog').evaluate(e=>e.open),false,'cancel cannot reveal another prompt from the same completed gesture');
   assert.equal(await page.evaluate(()=>window.__promptCount25),index+1,'each rejected gesture asks only once');
   const after=await snap(page);assert.equal(after.activeCode,old.code);assert.equal(after.dirty,true);
   assert.deepEqual(after.selectedIds,before.selectedIds,'cancel keeps the previous selected door');
   assert.deepEqual(after.draft,before.draft,'cancel preserves the complete unsaved door card');
   assert.deepEqual(after.state.placements,before.state.placements,'cancel rejects a dependent queued move as well as activation');
   assert.deepEqual(after.state.cards,before.state.cards,'cancel never saves the draft');
  }
  // Rejecting the old request must not suppress the next deliberate attempt.
  await fastGesture25(page,other.id);await page.waitForSelector('#confirmDialog[open]');await page.locator('#confirmDiscard').click();
  await page.waitForFunction(code=>Proj2App.snapshot().activeCode===code&&!Proj2App.snapshot().dirty,other.code);await idle(page);
  assert.equal(await page.evaluate(()=>window.__promptCount25),3,'the next deliberate tap has its own single prompt');
  assert.deepEqual((await snap(page)).selectedIds,[other.id]);
  assert.equal((await snap(page)).state.cards[old.code].note,before.state.cards[old.code].note,'discard leaves the saved old card intact');
  if(device.touch)assert.equal(await page.locator('body').getAttribute('data-view'),'cards','accepted next touch opens the intended door card');
 }finally{await page.evaluate(()=>{window.__promptObserver25?.disconnect();delete window.__promptObserver25;});}
 await view(page,'drawing');await page.locator('#zoomFit').click();await idle(page);
}
async function touch25(page,device){
 if(!device.touch)return;
 await page.locator('#toolSelect').click();await idle(page);
 const state=(await snap(page)).state,gs=state.placements.find(p=>p.code==='GS65'&&p.page===1),product=state.placements.find(p=>p.code==='DA'&&p.page===1&&!p.locked);
 assert(gs&&product,'touch regression has real door and product placements');
 const count=state.placements.length,cdp=await page.context().newCDPSession(page),pageScale=await page.evaluate(()=>visualViewport?.scale||1);
 try{
  for(let cycle=0;cycle<3;cycle++){
   const center=await focus25(page,gs.id),zoom=(await snap(page)).view.zoom,factor=cycle%2?0.82:1.2;
   await pinch25(cdp,center,factor);
   const changedZoom=(await snap(page)).view.zoom;
   assert(factor>1?changedZoom>zoom*1.08:changedZoom<zoom*.94,'native pinch changes PDF zoom in both directions');
   // Start the next deliberate tap immediately after pinch release. No idle
   // wait or toolbar action may be needed to escape a stale 350ms tap guard.
   await nativeTap25(cdp,await stampCenter25(page,gs.id));
   await page.waitForFunction(()=>document.body.dataset.view==='cards');
   assert.equal((await snap(page)).activeCode,gs.code,'one completed finger tap opens the right door card after pinch');
   assert.equal(await page.evaluate(()=>['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)),false,'touch card activation does not autofocus a field');
   const fonts=await page.locator('#cardMeta input,#cardRows input,#cardNote').evaluateAll(nodes=>nodes.map(node=>Number.parseFloat(getComputedStyle(node).fontSize)));assert(fonts.every(size=>size>=16),'touch edit fields use at least16px');
   assert.equal(await page.locator('#productDialog').evaluate(e=>e.open),false,'card activation cannot click a product behind the view change');
   assert.equal(await page.locator('#equipmentDialog').evaluate(e=>e.open),false);
   await page.locator('button[data-view="drawing"]').tap();
   let point=await focus25(page,product.id),before=(await snap(page)).state.placements.find(p=>p.id===product.id);
   await pinch25(cdp,point,1.1);
   point=await stampCenter25(page,product.id);
   await nativeDrag25(cdp,point,10,-7);
   await page.waitForFunction(({id,x,y})=>{const p=Proj2App.snapshot().state.placements.find(p=>p.id===id);return Math.abs(p.x-x)>.0005||Math.abs(p.y-y)>.0005;},{id:product.id,x:before.x,y:before.y});
   await idle(page);
   const moved=(await snap(page)).state.placements.find(p=>p.id===product.id);
   assert.deepEqual(moved.equipment,before.equipment,'finger movement preserves individual model, quantity and object number');
   assert.equal((await snap(page)).state.placements.length,count,'pinch and drag do not accidentally place another stamp');
   assert.equal(await page.locator('#equipmentDialog').evaluate(e=>e.open),false,'moving a product never opens its form');
   assert.equal(await page.locator('body').getAttribute('data-view'),'drawing','moving a product stays in Drawing');
   const disk=(await persisted(page)).state.placements.find(p=>p.id===product.id);assert.equal(disk.x,moved.x);assert.equal(disk.y,moved.y);
   await nativeTap25(cdp,await stampCenter25(page,product.id));await idle(page);
   assert.equal(await page.locator('dialog[open]').count(),0,'intentional symbol tap stays a simple selection');
   assert.equal(await page.locator('body').getAttribute('data-view'),'drawing');
   assert.deepEqual(await page.locator('[data-placement-id="'+product.id+'"] text').allTextContents(),[product.code],'native symbol tap keeps the plain code label');
   assert(Math.abs((await page.evaluate(()=>visualViewport?.scale||1))-pageScale)<.01,'PDF gesture does not turn into browser-page zoom');
  }
  // A browser/native cancellation rolls back preview and leaves the next real
  // gesture usable rather than retaining a pointer/pinch capture forever.
  let point=await focus25(page,product.id),before=(await snap(page)).state.placements.find(p=>p.id===product.id);
  await nativeDrag25(cdp,point,-13,8,true);await idle(page);
  let after=(await snap(page)).state.placements.find(p=>p.id===product.id);assert.equal(after.x,before.x);assert.equal(after.y,before.y);
  assert.equal(await page.locator('#equipmentDialog').evaluate(e=>e.open),false,'cancellation cannot activate the product');
  await nativeDrag25(cdp,await stampCenter25(page,product.id),-9,6);
  await page.waitForFunction(({id,x,y})=>{const p=Proj2App.snapshot().state.placements.find(p=>p.id===id);return Math.abs(p.x-x)>.0005||Math.abs(p.y-y)>.0005;},{id:product.id,x:before.x,y:before.y});await idle(page);
  // Leaving Drawing while a finger still owns a move must cancel its preview;
  // the later native touchend belongs to the old view and cannot save/open it.
  point=await focus25(page,product.id);before=(await snap(page)).state.placements.find(p=>p.id===product.id);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:205}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+14,y:point.y-9,id:205}]});
  await page.locator('button[data-view="materials"]').dispatchEvent('click');
  await page.waitForFunction(()=>document.body.dataset.view==='materials');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(page);
  after=(await snap(page)).state.placements.find(p=>p.id===product.id);assert.equal(after.x,before.x);assert.equal(after.y,before.y);
  assert.equal(await page.locator('#equipmentDialog').evaluate(e=>e.open),false,'touchend after leaving Drawing cannot open the old product');
  for(const tab of ['stencils','cards','drawing']){await page.locator('button[data-view="'+tab+'"]').tap();await page.waitForFunction(tab=>document.body.dataset.view===tab,tab);}
  await focus25(page,gs.id);await nativeTap25(cdp,await stampCenter25(page,gs.id));await page.waitForFunction(()=>document.body.dataset.view==='cards');
  assert.equal((await snap(page)).activeCode,gs.code,'door cards still open after cycling all workspace tabs');
  await page.locator('button[data-view="drawing"]').tap();await page.locator('#zoomFit').click();await idle(page);await overflow(page);
 }finally{await cdp.detach();}
}
async function toolOption(page,id,checked){
 if(!await page.locator('#toolMenu').evaluate(e=>e.open))await page.locator('#toolMenu>summary').click();
 await page.locator('[data-tool-option="'+id+'"]').setChecked(checked);
 await page.waitForFunction(({id,checked})=>Proj2App.snapshot().state.preferences.toolbarTools.includes(id)===checked,{id,checked});
 await page.locator('#toolMenu>summary').click();
}
async function emptyPoint(page){
 return page.evaluate(()=>{const b=document.querySelector('#drawingHost .p2-canvas-scroller').getBoundingClientRect();for(const y of [.15,.3,.7,.85])for(const x of [.15,.3,.7,.85]){const p={x:b.left+b.width*x,y:b.top+b.height*y},e=document.elementFromPoint(p.x,p.y);if(e?.closest('.p2-canvas-scroller')&&!e.closest('[data-placement-id]'))return p;}throw Error('No empty drawing point');});
}
async function interactions22(page,device){
 await view(page,'drawing');
 await toolOption(page,'undo',false);assert.equal(await page.locator('#undo').isVisible(),false);
 assert.equal(await page.locator('#toolSelect').isVisible(),true,'pointer is pinned');
 assert.equal(await page.locator('#toolPlace').isVisible(),true,'stamp is pinned');
 await toolOption(page,'undo',true);
 await page.locator('#newStencilTool').click();await page.waitForSelector('#stencilDialog[open]');
 await page.locator('#closeStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});
 await page.locator('#newCardTool').click();await page.waitForSelector('#textDialog[open]');
 await page.locator('#textCancel').click();await page.waitForSelector('#textDialog[open]',{state:'hidden'});
 await page.locator('#pageNumber').fill('1');await page.locator('#pageNumber').dispatchEvent('change');
 await page.waitForFunction(()=>Proj2App.snapshot().page===1);await idle(page);await page.locator('#zoomFit').click();await idle(page);
 const first=(await snap(page)).state.placements.find(p=>p.page===1&&p.code==='GS65');assert(first);
 await (await library(page,first.code)).click();await view(page,'drawing');
 assert.equal((await snap(page)).view.tool,'place');
 const beforeMove=(await snap(page)).state.placements.find(p=>p.id===first.id),count=(await snap(page)).state.placements.length;
 let box=await page.locator('[data-placement-id="'+first.id+'"]').boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await page.mouse.move(box.x+box.width/2+14,box.y+box.height/2+8,{steps:7});await page.mouse.up();
 await page.waitForFunction(({id,x})=>Math.abs(Proj2App.snapshot().state.placements.find(p=>p.id===id).x-x)>.003,{id:first.id,x:beforeMove.x});await idle(page);
 assert.equal((await snap(page)).state.placements.length,count,'dragging an existing stamp in place mode does not add another');
 assert.equal((await snap(page)).view.tool,'place','direct movement does not require changing to pointer');
 const ovalHit=await page.locator('[data-placement-id="'+first.id+'"] > ellipse:not([class])').evaluate(e=>e.tagName.toLowerCase());
 assert.equal(ovalHit,'ellipse','hit target follows the oval');
 const otherDoor=(await snap(page)).state.placements.find(p=>p.page===1&&p.id!==first.id);await select(page,otherDoor.id);
 const corner=await page.locator('[data-placement-id="'+first.id+'"] > ellipse:not([class])').evaluate(e=>{const b=e.getBoundingClientRect();return !!document.elementFromPoint(b.x+1,b.y+1)?.closest('[data-placement-id]');});
 assert.equal(corner,false,'empty unselected oval corners do not cover drawing');
 // Handle drag updates every door-card code, including the other source page.
 await select(page,first.id);if(!await page.locator('#sizeScope').isVisible())await page.locator('.selection-inspector>summary').click();
 await page.locator('#sizeScope').selectOption('doors');
 await page.waitForFunction(()=>Proj2App.snapshot().state.preferences.sizeScope==='doors');
 const oldSize=(await snap(page)).state.placements.find(p=>p.id===first.id),centers=(await snap(page)).state.placements.map(p=>({id:p.id,x:p.x,y:p.y}));
 let handle=await page.locator('[data-placement-id="'+first.id+'"] [data-resize-handle="e"]').boundingBox();
 const delta=Math.max(8,oldSize.width*(await snap(page)).view.zoom*.12);
 await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();
 await page.mouse.move(handle.x+handle.width/2+delta,handle.y+handle.height/2,{steps:8});await page.mouse.up();
 await page.waitForFunction(({id,w})=>Proj2App.snapshot().state.placements.find(p=>p.id===id).width>w+1,{id:first.id,w:oldSize.width});await idle(page);
 let state=(await snap(page)).state,changed=state.placements.find(p=>p.id===first.id);
 for(const p of state.placements.filter(p=>state.stencils[p.stencilId].kind==='card')){assert.equal(p.width,changed.width,'door-card widths follow shared resize across codes/pages');assert.equal(p.height,changed.height);}
 assert.deepEqual(state.placements.map(p=>({id:p.id,x:p.x,y:p.y})),centers,'resizing keeps all stamp centers');
 assert(Math.abs(changed.width/changed.height-oldSize.width/oldSize.height)<1e-8,'handle resize preserves aspect');
 assert.deepEqual((await persisted(page)).state.preferences.doorSize,{width:changed.width,height:changed.height});
 await page.locator('#undo').click();await page.waitForFunction(({id,w})=>Proj2App.snapshot().state.placements.find(p=>p.id===id).width===w,{id:first.id,w:oldSize.width});
 await page.locator('#redo').click();await page.waitForFunction(({id,w})=>Proj2App.snapshot().state.placements.find(p=>p.id===id).width===w,{id:first.id,w:changed.width});
 // Card activation is a completed double tap/click, never pointer-down while dragging.
 await view(page,'drawing');box=await page.locator('[data-placement-id="'+first.id+'"]').boundingBox();
 if(device.touch){
  await page.evaluate(()=>{window.__qaTapEvents=[];window.__qaTapAbort=new AbortController();for(const name of ['pointerdown','pointerup','click'])document.addEventListener(name,e=>window.__qaTapEvents.push({type:e.type,target:e.target.closest('[id]')?.id,tag:e.target.tagName,shape:e.target.getAttribute('class'),resize:e.target.dataset.resizeHandle,placement:e.target.closest('[data-placement-id]')?.dataset.placementId,view:document.body.dataset.view,pointer:e.pointerType,time:performance.now()}),{capture:true,signal:window.__qaTapAbort.signal});});
  await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.waitForFunction(()=>document.body.dataset.view==='cards');
  assert.equal(await page.locator('#productDialog').evaluate(e=>e.open),false,'doubletap opens only the door card: '+JSON.stringify(await page.evaluate(()=>window.__qaTapEvents)));
  await page.evaluate(()=>window.__qaTapAbort.abort());
 }
 else {await page.mouse.dblclick(box.x+box.width/2,box.y+box.height/2);await page.waitForFunction(code=>Proj2App.snapshot().activeCode===code,first.code);}
 await view(page,'drawing');
 if(!device.touch){
  const alternate=(await snap(page)).state.placements.find(p=>p.page===1&&p.id!==first.id);await select(page,alternate.id);
  box=await page.locator('[data-placement-id="'+first.id+'"]').boundingBox();
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2,{button:'right'});await page.waitForSelector('#stampContextMenu:not([hidden])');
  assert.deepEqual((await snap(page)).selectedIds,[first.id],'rightclick selects an initially unselected stamp');
  assert.equal(await page.locator('#stampContextMenu [data-context-action="openCard"]').isVisible(),true);
  const oldCount=(await snap(page)).state.placements.length;
  await page.locator('#stampContextMenu [data-context-action="duplicate"]').click();await waitCount(page,oldCount+1);
  const copied=(await snap(page)).selectedIds[0];box=await page.locator('[data-placement-id="'+copied+'"]').boundingBox();
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2,{button:'right'});await page.waitForSelector('#stampContextMenu:not([hidden])');
  await page.locator('#stampContextMenu [data-context-action="delete"]').click();await waitCount(page,oldCount);
  assert(!(await snap(page)).state.placements.some(p=>p.id===copied),'context delete removes selected duplicate');
  const blank=await emptyPoint(page);await page.mouse.click(blank.x,blank.y,{button:'right'});await page.waitForSelector('#stampContextMenu:not([hidden])');
  assert.equal(await page.locator('#stampContextMenu [data-context-action="openCard"]').isVisible(),false,'background context has no selected-card action');
  await page.locator('#stampContextMenu [data-context-action="newCard"]').click();await page.waitForSelector('#textDialog[open]');await page.locator('#textCancel').click();
 }
 // Empty drag always pans, even with place active, without generating a stamp.
 await page.locator('#toolPlace').click();for(let i=0;i<4;i++)await page.locator('#zoomIn').click();await idle(page);
 let point=await emptyPoint(page),prior=(await snap(page)).view.scroll;
 const beforePan=(await snap(page)).state.placements.length;
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x-42,point.y-35,{steps:8});await page.mouse.up();
 await page.waitForFunction(prior=>{const s=Proj2App.snapshot().view.scroll;return Math.abs(s.left-prior.left)>10||Math.abs(s.top-prior.top)>10;},prior);
 assert.equal((await snap(page)).state.placements.length,beforePan,'empty drag in place mode pans without placing');
 if(device.touch){
  const cdp=await page.context().newCDPSession(page);try{
   point=await emptyPoint(page);prior=(await snap(page)).view.scroll;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-40,y:point.y-30,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(prior=>{const s=Proj2App.snapshot().view.scroll;return Math.abs(s.left-prior.left)>10||Math.abs(s.top-prior.top)>10;},prior);
   const bounds=await page.locator('.p2-canvas-scroller').boundingBox(),cx=bounds.x+bounds.width/2,cy=bounds.y+bounds.height/2,z=(await snap(page)).view.zoom;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-35,y:cy,id:1},{x:cx+35,y:cy,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-55,y:cy,id:1},{x:cx+55,y:cy,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(z=>Proj2App.snapshot().view.zoom>z*1.1,z);await idle(page);
   assert.equal((await snap(page)).state.placements.length,beforePan,'finger pan and pinch do not place stamps');
  }finally{await cdp.detach();}
 }
 await page.locator('#zoomFit').click();await idle(page);await overflow(page);
 const symbol=await place(page,'DA',.22,.7),afterSymbol=await snap(page);
 assert.deepEqual(afterSymbol.selectedIds,[symbol.id],'new symbol remains selected for handles');
 assert.equal(afterSymbol.state.cards.DA,undefined,'equipment symbol does not create a door card');
 assert(symbol.width<changed.width,'door-card resizing keeps equipment symbols small');
 if(device.touch)assert.equal(await page.locator('body').getAttribute('data-view'),'drawing','symbol placement stays on the drawing');
}
`+helperAnchor);
source=source.replace('selected:window.Proj2App?.snapshot().selectedIds','selected:window.Proj2App?.snapshot().selectedIds,tapEvents:window.__qaTapEvents');
source=source.replaceAll("await page.locator('[data-placement-id=\"'+first.id+'\"]').boundingBox()","await stampBox23(page,first.id)");
// A deliberate completed touch opens door cards; symbols remain selections. The setup helper
// restores Drawing so the retained transform/quantity tests can continue.
const oldSelect="async function select(page,id){await view(page,'drawing');await page.locator('#toolSelect').click();const stamp=page.locator(`#drawingHost [data-placement-id=\"${id}\"]`);if(await page.evaluate(()=>navigator.maxTouchPoints>0))await stamp.tap();else await stamp.click();await page.waitForFunction(id=>Proj2App.snapshot().selectedIds.includes(id),id);await idle(page);}";
const newSelect="async function select(page,id){await view(page,'drawing');await page.locator('#toolSelect').click();const box=await stampBox23(page,id),touch=await page.evaluate(()=>navigator.maxTouchPoints>0);if(touch)await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForFunction(id=>Proj2App.snapshot().selectedIds.includes(id),id);await idle(page);if(touch){await view(page,'drawing');await idle(page);}}";
if(!source.includes(oldSelect))throw Error('Missing selection helper for single-touch adaptation');
source=source.replace(oldSelect,newSelect);
const touchCall="await features24(page,device);trace('2.4 categories, equipment and material totals');";
if(!source.includes(touchCall))throw Error('Missing touch regression call insertion');
source=source.replace(touchCall,touchCall+"await touch25(page,device);trace('2.5 rapid pinch, touch drag, card tap and cancellation recovery');");
source=source.replace(touchCall,touchCall+"await queuedCancel25(page,device);trace('2.5 queued tap/move cancellation and deliberate retry');");
const child=new Module(file,module);child.filename=file;child.paths=module.paths;
source=source.replace(/^\s*if\(process\.env\.PROJECTION2_SCREENSHOTS\).*\n/gm,'');
child._compile(source.replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-6.html'),file);
