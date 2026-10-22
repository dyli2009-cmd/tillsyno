'use strict';
// Generated integration fixtures only. Keep 2.2's complete gesture regression and
// verify 2.4 categories, individual equipment and aggregated ordering material.
// No screenshots or generated images are used.
// Authentication alone is stubbed by the shared fixture; the actual guard runs.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs');
let source=fs.readFileSync(file,'utf8');
function insert(anchor,extra){if(!source.includes(anchor))throw Error('Missing 2.2 test insertion point: '+anchor);source=source.replace(anchor,anchor+extra);}
insert("await page.goto(url());await ready(page);await overflow(page);trace('boot');",`
  assert.equal(await page.evaluate(()=>Proj2App.version),'2.4');
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
 assert.deepEqual(await page.locator('#stencilKind option').allTextContents(),['Dörrstämpel med dörrkort','Dörrstämpel utan dörrkort']);
 await page.locator('#stencilCode').fill('DBL-DS');await page.locator('#stencilName').fill('Egen stängare QA');await page.locator('#stencilKind').selectOption('symbol');
 assert.equal(await page.locator('#stencilProductType').inputValue(),'none','DS inside a custom code does not guess a product category');
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
 await view(page,'stencils');await page.locator('#stampSearch').fill('DBL-DS');assert((await page.locator('#stampList').innerText()).includes('Dörrstängare'),'library names the custom product category');
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
async function category24(page,label){
 await view(page,'stencils');await page.locator('#stampSearch').fill('');
 await page.locator('#stencilCategories').getByRole('button',{name:label,exact:true}).click();
 const shown=await page.locator('#stampList [data-stencil-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.stencilId));
 const state=(await snap(page)).state;
 if(label!=='Alla')for(const id of shown)assert.equal(await page.evaluate(id=>Proj2Data.stencilCategory(Proj2App.snapshot().state.stencils[id]),id),label,'category button filters the actual library');
 return shown;
}
async function openEquipment24(page,id,device){
 const placement=(await snap(page)).state.placements.find(p=>p.id===id);
 await view(page,'drawing');
 if((await snap(page)).page!==placement.page){await page.locator('#pageNumber').fill(String(placement.page));await page.locator('#pageNumber').dispatchEvent('change');await page.waitForFunction(n=>Proj2App.snapshot().page===n,placement.page);}
 await page.locator('#zoomFit').click();await idle(page);await select(page,id);
 const box=await stampBox23(page,id);
 if(device.touch){await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
 else await page.mouse.dblclick(box.x+box.width/2,box.y+box.height/2);
 await page.waitForSelector('#equipmentDialog[open]');
 assert.equal(await page.locator('#productDialog').evaluate(e=>e.open),false,'equipment activation opens its own form only');
}
async function saveEquipment24(page,id){
 await page.locator('#saveEquipment').click();await page.waitForSelector('#equipmentDialog[open]',{state:'hidden'});await idle(page);
 return (await snap(page)).state.placements.find(p=>p.id===id);
}
async function chooseCardProduct24(page,rowId,productId){
 await productButton(page,rowId).click();await page.locator('#productList [data-product-id="'+productId+'"]').click();
}
async function materialView24(page){await view(page,'materials');await page.waitForSelector('#materialsPane:visible');await page.locator('#materialSearch').fill('');await overflow(page);}
async function features24(page,device){
 let state=(await snap(page)).state;
 assert.equal(state.stencils.DFS.kind,'symbol');assert.equal(state.stencils.DFS.productType,'other');
 assert.equal(state.cards.DFS,undefined,'DFS is a product, not an invented card');
 const doors=await category24(page,'Dörrkort');assert(doors.includes('GS1')&&!doors.includes('DA')&&!doors.includes('DS')&&!doors.includes('DFS'));
 const operators=await category24(page,'Dörrautomatik');assert(operators.includes('DA')&&!operators.includes('GS1')&&!operators.includes('DS'));
 const closers=await category24(page,'Dörrstängare');assert(closers.includes('DS')&&!closers.includes('DA'));
 const dfs=await category24(page,'DFS');assert(dfs.includes('DFS')&&!dfs.includes('GS1'));
 await category24(page,'Alla');
 // Product details belong to a physical placement and copies receive a new object number.
 const da=state.placements.find(p=>p.code==='DA');assert(da.equipment.objectNumber);assert.equal(da.equipment.quantity,1);
 const oldCounts=await equipmentCounts23(page);
 await openEquipment24(page,da.id,device);
 await page.locator('#equipmentObjectNumber').fill('QA-DA-01');await page.locator('#equipmentModel').fill('SW300');await page.locator('#equipmentQuantity').fill('3');await page.locator('#equipmentNote').fill('Teknikern kan komplettera QA');
 let saved=await saveEquipment24(page,da.id);assert.equal(saved.equipment.objectNumber,'QA-DA-01');assert.equal(saved.equipment.model,'SW300');assert.equal(saved.equipment.quantity,3);
 await equipmentCounts23(page,{doorAutomation:oldCounts.doorAutomation+2});
 await select(page,da.id);await page.locator('#duplicateSelection').click();await waitCount(page,state.placements.length+1);
 const duplicateSnapshot=await snap(page),duplicate=duplicateSnapshot.state.placements.find(p=>p.id===duplicateSnapshot.selectedIds[0]);
 assert.notEqual(duplicate.equipment.objectNumber,'QA-DA-01');assert.equal(duplicate.equipment.model,'SW300');assert.equal(duplicate.equipment.quantity,3);
 await equipmentCounts23(page,{doorAutomation:oldCounts.doorAutomation+5});
 await page.locator('#deleteSelection').click();await waitCount(page,state.placements.length);await equipmentCounts23(page,{doorAutomation:oldCounts.doorAutomation+2});
 await page.locator('#undo').click();await waitCount(page,state.placements.length+1);await equipmentCounts23(page,{doorAutomation:oldCounts.doorAutomation+5});
 await page.locator('#redo').click();await waitCount(page,state.placements.length);
 await select(page,da.id);await page.locator('#lockSelection').click();await page.waitForFunction(id=>Proj2App.snapshot().state.placements.find(p=>p.id===id).locked,da.id);
 await openEquipment24(page,da.id,device);await page.locator('#equipmentNote').fill('Locked metadata QA');saved=await saveEquipment24(page,da.id);
 assert.equal(saved.locked,true);assert.equal(saved.equipment.note,'Locked metadata QA','a position lock protects geometry while technician information stays editable');
 await select(page,da.id);await page.locator('#lockSelection').click();await page.waitForFunction(id=>!Proj2App.snapshot().state.placements.find(p=>p.id===id).locked,da.id);
 // DFS and a custom product category are available through the same library workflow.
 await view(page,'drawing');await page.locator('#pageNumber').fill('2');await page.locator('#pageNumber').dispatchEvent('change');await page.waitForFunction(()=>Proj2App.snapshot().page===2);await idle(page);
 const dfsPlacement=await place(page,'DFS',.46,.20);await openEquipment24(page,dfsPlacement.id,device);await page.locator('#equipmentModel').fill('DFS-QA');await page.locator('#equipmentQuantity').fill('2');await saveEquipment24(page,dfsPlacement.id);
 await view(page,'drawing');await page.locator('#newStencilTool').click();await page.waitForSelector('#stencilDialog[open]');
 await page.locator('#stencilCode').fill('QA-CAT');await page.locator('#stencilName').fill('QA-CUSTOM-PRODUCT');await page.locator('#stencilKind').selectOption('symbol');await page.locator('#stencilProductType').selectOption('other');await page.locator('#stencilCategory').selectOption('__custom__');await page.locator('#stencilCustomCategory').fill('QA Passage');
 await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});
 const custom=await category24(page,'QA Passage');assert(custom.includes('QA-CAT')&&!custom.includes('DA'));
 const customPlacement=await place(page,'QA-CAT',.68,.18);await openEquipment24(page,customPlacement.id,device);await page.locator('#equipmentModel').fill('QA-CUSTOM-PRODUCT');await saveEquipment24(page,customPlacement.id);
 assert.equal((await snap(page)).state.stencils['QA-CAT'].category,'QA Passage','own category is stored with the stencil');
 // A saved card contributes its entire set once per actual door placement.
 await view(page,'drawing');await page.locator('#pageNumber').fill('1');await page.locator('#pageNumber').dispatchEvent('change');await page.waitForFunction(()=>Proj2App.snapshot().page===1);await idle(page);
 const beforeCard=await report24(page),baseLock=productTotal24(beforeCard,'511-50'),baseArm=productTotal24(beforeCard,'JCK207'),baseOperator=productTotal24(beforeCard,'SW300');
 const gs=await place(page,'GS1',.20,.20);await select(page,gs.id);await view(page,'cards');
 await chooseCardProduct24(page,'day-lock','lock-511-50');await chooseCardProduct24(page,'day-cylinder-hinge','cylinder-8882');await chooseCardProduct24(page,'day-cylinder-strike','cylinder-8882');await chooseCardProduct24(page,'day-strike','strike-std');await chooseCardProduct24(page,'closing-elbow','activation-jck207');await chooseCardProduct24(page,'access-button','activation-jck207');await chooseCardProduct24(page,'closing-operator','operator-sw300');await saveCard(page);
 let report=await report24(page);
 assert.equal(productTotal24(report,'511-50'),baseLock+1);assert.equal(productTotal24(report,'8882'),2,'both cylinder sides aggregate into two cylinders');
 assert.equal(productTotal24(report,'JCK207'),baseArm+3,'one elbow-contact set counts twice and one opening button counts once');
 assert.equal(productTotal24(report,'SW300'),baseOperator+1,'standalone automatics and saved door-card automatics share material totals');
 const jckRows=report.rows.filter(row=>row.product==='JCK207');assert.equal(jckRows.length,2,'opening button and elbow contact remain distinct components');
 const beforeDuplicate=(await snap(page)).state.placements.length;
 await view(page,'drawing');await select(page,gs.id);await page.locator('#duplicateSelection').click();await waitCount(page,beforeDuplicate+1);
 report=await report24(page);assert.equal(productTotal24(report,'511-50'),baseLock+2);assert.equal(productTotal24(report,'8882'),4);assert.equal(productTotal24(report,'JCK207'),baseArm+6);assert.equal(productTotal24(report,'SW300'),baseOperator+2);
 await page.locator('#deleteSelection').click();await waitCount(page,beforeDuplicate);report=await report24(page);assert.equal(productTotal24(report,'JCK207'),baseArm+3);
 // Standalone elbow contacts use the same explicit multiplier; no name guessing.
 await page.locator('#newStencilTool').click();await page.waitForSelector('#stencilDialog[open]');await page.locator('#stencilCode').fill('AK-QA');await page.locator('#stencilName').fill('JCK207');await page.locator('#stencilKind').selectOption('symbol');await page.locator('#stencilProductType').selectOption('elbowContact');await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});
 const ak=await place(page,'AK-QA',.48,.82);await openEquipment24(page,ak.id,device);await page.locator('#equipmentModel').fill('JCK207');await saveEquipment24(page,ak.id);
 report=await report24(page);assert.equal(productTotal24(report,'JCK207'),baseArm+5,'standalone elbow-contact set also counts as two');
 // Unplaced saved cards do not inflate the ordering list.
 await view(page,'drawing');await page.locator('#newCardTool').click();await page.waitForSelector('#textDialog[open]');await page.locator('#textValue').fill('QA-UNPLACED');await page.locator('#textAccept').click();await page.waitForFunction(()=>!!Proj2App.snapshot().state.cards['QA-UNPLACED']);
 await chooseCardProduct24(page,'day-lock','lock-511-50');await saveCard(page);report=await report24(page);
 assert.equal(productTotal24(report,'511-50'),baseLock+1,'an unplaced saved card contributes zero products');
 assert(report.unplacedCards.includes('QA-UNPLACED'),'unplaced cards are disclosed separately');
 await materialView24(page);const text=await page.locator('#materialRows').innerText();assert(text.includes('511-50')&&text.includes('JCK207')&&text.includes('SW300')&&text.includes('DFS-QA'));
 await page.locator('#materialSearch').fill('JCK207');assert((await page.locator('#materialRows').innerText()).includes('JCK207'));assert(!(await page.locator('#materialRows').innerText()).includes('511-50'),'material search filters rows without altering totals');await page.locator('#materialSearch').fill('');
 const csv=await download(page,()=>page.locator('#materialCsv').click()),expectedCsv=await page.evaluate(()=>Proj2Materials.csv(Proj2Materials.build(Proj2App.snapshot().state)));assert.equal(csv.bytes.toString('utf8'),expectedCsv);
 const pdf=await download(page,()=>page.locator('#materialPdf').click());assert.equal(pdf.bytes.subarray(0,5).toString(),'%PDF-');
 const printText=await page.evaluate(async bytes=>{const doc=await pdfjsLib.getDocument({data:Uint8Array.from(bytes)}).promise;try{let result='';for(let i=1;i<=doc.numPages;i++)result+=(await(await doc.getPage(i)).getTextContent()).items.map(item=>item.str).join(' ')+' ';return result;}finally{await doc.destroy();}},[...pdf.bytes]);
 for(const product of ['511-50','JCK207','SW300','DFS-QA','QA-CUSTOM-PRODUCT'])assert(printText.includes(product),'printable material PDF contains full '+product);
 await overflow(page);await view(page,'drawing');
 state=(await snap(page)).state;const numbers=state.placements.filter(p=>p.equipment).map(p=>p.equipment.objectNumber.toLocaleUpperCase('sv'));assert.equal(new Set(numbers).size,numbers.length,'all physical product objects have distinct numbers');
 await equipmentCounts23(page);
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
  await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.waitForFunction(()=>document.body.dataset.view==='cards');
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
const child=new Module(file,module);child.filename=file;child.paths=module.paths;
source=source.replace(/^\s*if\(process\.env\.PROJECTION2_SCREENSHOTS\).*\n/gm,'');
const libraryStart="async function library(page,code){await view(page,'stencils');";
if(!source.includes(libraryStart))throw Error('Missing category-aware library helper');
source=source.replace(libraryStart,libraryStart+"await page.locator('#stencilCategories').getByRole('button',{name:'Alla',exact:true}).click();");
child._compile(source.replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-4.html'),file);
