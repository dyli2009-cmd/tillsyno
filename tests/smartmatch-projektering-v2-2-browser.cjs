'use strict';
// Reuse the generated full integration scenario and exercise 2.2's editing gestures.
// Authentication alone is stubbed by the shared fixture; the actual guard runs.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs');
let source=fs.readFileSync(file,'utf8');
function insert(anchor,extra){if(!source.includes(anchor))throw Error('Missing 2.2 test insertion point: '+anchor);source=source.replace(anchor,anchor+extra);}
insert("await page.goto(url());await ready(page);await overflow(page);trace('boot');",`
  assert.equal(await page.evaluate(()=>Proj2App.version),'2.2');
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
source=source.replace(beforeFiles,"  await interactions22(page,device);trace('2.2 gestures, sizing and toolbar');\n"+beforeFiles);
insert("assert.deepEqual((await snap(page)).state.cards,beforeFiles.cards);trace('PDF reopen');",`
  assert.deepEqual((await snap(page)).state.preferences,beforeFiles.preferences,'PDF attachment preserves editing preferences');
`);
insert("assert.equal((await persisted(page)).bytes,source.length);trace('IDB reload');",`
  assert.deepEqual((await snap(page)).state.preferences,beforeFiles.preferences,'local reload preserves toolbar and size scope');
`);
const helperAnchor='async function run(browser,device,source){';
if(!source.includes(helperAnchor))throw Error('Missing 2.2 helper insertion point');
source=source.replace(helperAnchor,String.raw`
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
const child=new Module(file,module);child.filename=file;child.paths=module.paths;
child._compile(source.replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-2.html'),file);
