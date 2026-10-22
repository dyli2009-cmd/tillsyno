'use strict';
// Generated integration fixtures only. Keep 2.2's complete gesture regression and
// verify 2.3 equipment counts, custom stencil preview and combined PDF output.
// Authentication alone is stubbed by the shared fixture; the actual guard runs.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs');
let source=fs.readFileSync(file,'utf8');
function insert(anchor,extra){if(!source.includes(anchor))throw Error('Missing 2.2 test insertion point: '+anchor);source=source.replace(anchor,anchor+extra);}
insert("await page.goto(url());await ready(page);await overflow(page);trace('boot');",`
  assert.equal(await page.evaluate(()=>Proj2App.version),'2.3');
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
source=source.replace(beforeFiles,"  await interactions22(page,device);trace('2.2 gestures, sizing and toolbar');\n  await equipment23(page,device);trace('2.3 equipment, custom stencil and legacy project');\n"+beforeFiles);
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
  return {counts:Proj2Data.placementCounts(state),actual:{markings:Number(document.getElementById('placementCount').textContent),cards:Number(document.getElementById('cardCount').textContent),doorAutomation:Number(document.getElementById('automationCount').textContent),doorCloser:Number(document.getElementById('closerCount').textContent)},placements:state.placements.length,cards:Object.keys(state.cards).length};
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
 if(process.env.PROJECTION2_SCREENSHOTS){fs.mkdirSync(path.join(root,'work/projektering-v2-3/qa'),{recursive:true});await page.screenshot({path:path.join(root,'work/projektering-v2-3/qa',device.name+'-preview.png'),fullPage:true});}
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
 assert.equal(value.pages.length,beforeFiles.drawing.pages.length+Object.keys(beforeFiles.cards).length,'one PDF contains every source page followed by every saved door card');
 const plans=value.pages.slice(0,beforeFiles.drawing.pages.length).join(' '),cards=value.pages.slice(beforeFiles.drawing.pages.length).join(' ');
 for(const code of ['GS65','DA','DS','DBL-DS'])assert(plans.includes(code),'drawing text contains searchable '+code);
 for(const code of Object.keys(beforeFiles.cards))assert(cards.includes(code),'combined PDF includes saved door card '+code);
 assert(!Object.hasOwn(value.state.cards,'DA')&&!Object.hasOwn(value.state.cards,'DS'),'equipment has no invented card pages');
 assert.deepEqual(value.state.stencils,beforeFiles.stencils,'editable PDF preserves every equipment product category');
 assert.equal(value.counts.doorAutomation,beforeFiles.placements.filter(p=>beforeFiles.stencils[p.stencilId].productType==='doorAutomation').length);
 assert.equal(value.counts.doorCloser,beforeFiles.placements.filter(p=>beforeFiles.stencils[p.stencilId].productType==='doorCloser').length);
}
async function equipmentSchedule23(page,state){
 await page.locator('.project-menu>summary').click();
 const csv=await download(page,()=>page.locator('#exportSchedule').click()),text=csv.bytes.toString('utf8').replace(/^\ufeff/,'');
 const rows=text.trim().split(/\r?\n/).map(line=>line.slice(1,-1).split('";"').map(cell=>cell.replace(/""/g,'"')));
 for(const code of ['DA','DS','DBL-DS']){
  const row=rows.find(cells=>cells[0]===code&&cells[2]==='Ritningsprodukter');assert(row,'CSV includes standalone product '+code);
  const count=state.placements.filter(p=>p.code===code).length;assert.equal(Number(row[1]),count);assert.equal(Number(row[6]),count,'CSV total counts each placed '+code);
 }
 assert.equal(rows.some(cells=>cells[0]==='DADS'&&cells[2]==='Ritningsprodukter'),false,'legacy combined symbol is not invented as equipment');
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
child._compile(source.replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-3.html'),file);
