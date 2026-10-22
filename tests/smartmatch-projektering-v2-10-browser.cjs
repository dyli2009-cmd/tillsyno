'use strict';
// Real PDF/auth/IndexedDB fixture with numerical layout and native input checks.
// No screenshots, generated images, or remote writes.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const fixturePath=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs'),base=fs.readFileSync(fixturePath,'utf8');
const start=base.indexOf('async function run(browser,device,source){'),end=base.indexOf('async function denied(browser){',start);
if(start<0||end<0)throw Error('Shared fixture boundaries changed');
function scenario(){
 async function sourcePDF(){
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),size=16;
  const a=doc.addPage([800,600]);a.drawText('GS4',{x:100,y:430,font,size});a.drawText('GS40',{x:300,y:430,font,size});a.drawText('LITTERA-A17',{x:100,y:370,font,size});
  const b=doc.addPage([600,800]);b.setCropBox(20,30,560,740);b.setRotation(degrees(90));b.drawText('GS4',{x:100,y:550,font,size});b.drawText('PLAN B',{x:100,y:500,font,size});
  const c=doc.addPage([800,600]);c.drawText('GS',{x:100,y:430,font,size});c.drawText('4',{x:100+font.widthOfTextAtSize('GS',size),y:430,font,size});c.drawText('GS4',{x:350,y:430,font,size});
  return Buffer.from(await doc.save());
 }
 async function clickMenuItem(page,id){
  const target=page.locator(id);
  if(!await target.isVisible()){
   const menu=target.locator('xpath=ancestor::details[1]');await menu.locator(':scope > summary').click();
  }
  await target.click();
 }
 async function fillProduct(page,rowId,value){
  const input=page.locator('#cardRows input[data-product-input][data-row-id="'+rowId+'"]');await input.scrollIntoViewIfNeeded();await input.fill(value);await input.press('Escape');
 }
 const owner=(page,row,field)=>page.locator('#cardRows select[data-row-id="'+row+'"][data-field="'+field+'"]');
 async function noVibration(page,label){
  await idle(page);
  const frames=await page.evaluate(async()=>{
   const result=[];for(let n=0;n<35;n++){await new Promise(r=>requestAnimationFrame(r));const p=document.querySelector('#drawingHost .p2-canvas-page'),v=Proj2App.snapshot().view,b=p.getBoundingClientRect();result.push([b.x,b.y,b.width,b.height,v.zoom]);}return result;
  });
  for(let column=0;column<5;column++){const values=frames.map(frame=>frame[column]);assert(Math.max(...values)-Math.min(...values)<.15,label+' has stable initial fit geometry: '+JSON.stringify(frames));}
 }
 async function newProject(page){await clickMenuItem(page,'#newProject');if(await page.locator('#confirmDialog[open]').count())await confirm(page);await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===0);await idle(page);}
 async function blankAndCards(browser,device){
  const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  try{
   await page.goto(url());await ready(page);assert.equal(await page.evaluate(()=>Proj2App.version),'2.10');assert.equal((await snap(page)).state.drawing.pages.length,0);
   assert(await page.locator('#createBlankDrawing').isVisible());await page.locator('#createBlankDrawing').click();await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===1);await idle(page);
   let current=await snap(page);assert(current.state.drawing.pages[0].width>current.state.drawing.pages[0].height,'blank drawing is landscape');assert.equal(current.state.placements.length,0);assert.equal(Object.keys(current.state.cards).length,0);
   await noVibration(page,'blank page');
   const placed=[];for(const [x,y]of [[.2,.3],[.4,.3],[.6,.3],[.8,.3],[.4,.65]])placed.push(await place(page,'GS4',x,y));
   await select(page,placed[0].id);await view(page,'cards');await fillProduct(page,'day-lock','310-50');await fillProduct(page,'closing-elbow','JCK207');
   await owner(page,'day-lock','delivery').selectOption('DT');assert.equal(await owner(page,'day-lock','installer').inputValue(),'DT','delivery automatically initializes installer');
   await owner(page,'day-lock','installer').selectOption('EL');assert.equal(await owner(page,'day-lock','delivery').inputValue(),'DT','manual installer override keeps delivery');assert.equal(await owner(page,'day-lock','installer').inputValue(),'EL');
   await owner(page,'day-lock','delivery').selectOption('GS');assert.equal(await owner(page,'day-lock','installer').inputValue(),'GS','later delivery choice copies its owner');
   await owner(page,'day-lock','delivery').evaluate(select=>select.add(new Option('EGEN','EGEN')));await owner(page,'day-lock','delivery').selectOption('EGEN');assert.equal(await owner(page,'day-lock','installer').inputValue(),'EGEN','custom imported contractor copies into installer DOM');assert.equal((await snap(page)).draft.rows.find(row=>row.id==='day-lock').installer,'EGEN');await owner(page,'day-lock','delivery').selectOption('GS');await owner(page,'day-lock','installer').selectOption('DT');await saveCard(page);
   const shared=(await snap(page)).state;assert.equal(Object.keys(shared.cards).length,1);assert.equal(shared.cards.GS4.rows.find(r=>r.id==='day-lock').product,'310-50');
   // A dirty shared draft must become the private card without overwriting GS4.
   await fillProduct(page,'day-lock','411-50 MA');assert((await snap(page)).dirty);
   await page.locator('#forkCard').click();await page.waitForSelector('#textDialog[open]');const suggested=await page.locator('#textValue').inputValue();assert(suggested!=='GS4'&&suggested!=='GS4-1','suggestion avoids the preexisting GS41 alias');
   await page.locator('#textCancel').click();await page.waitForSelector('#textDialog[open]',{state:'hidden'});current=await snap(page);assert(current.dirty,'cancel preserves unsaved draft');assert.equal(current.draft.rows.find(r=>r.id==='day-lock').product,'411-50 MA');assert.deepEqual(current.state.cards,shared.cards);
   await page.locator('#forkCard').click();await page.waitForSelector('#textDialog[open]');await page.locator('#textValue').fill('GS4-1');await page.locator('#textAccept').click();await page.waitForFunction(()=>document.getElementById('appMessage').dataset.level==='error');await idle(page);current=await snap(page);assert(current.dirty,'invalid own code keeps draft');assert.deepEqual(current.state.cards,shared.cards,'alias collision cannot change shared cards');assert.deepEqual(current.state.placements,shared.placements,'alias collision cannot relink a door');
   await page.locator('#forkCard').click();await page.waitForSelector('#textDialog[open]');await page.locator('#textValue').fill('GS4-A');await page.locator('#textAccept').click();
   await page.waitForFunction(()=>!!Proj2App.snapshot().state.cards['GS4-A']);await idle(page);current=await snap(page);
   assert.equal(current.state.cards.GS4.rows.find(r=>r.id==='day-lock').product,'310-50','shared saved card remains unchanged');assert.equal(current.state.cards['GS4-A'].rows.find(r=>r.id==='day-lock').product,'411-50 MA','private card takes the unsaved draft');
   assert.equal(current.state.placements.find(p=>p.id===placed[0].id).code,'GS4-A');assert.equal(current.state.placements.filter(p=>p.code==='GS4').length,4);
   for(const p of shared.placements){const after=current.state.placements.find(q=>q.id===p.id);for(const key of ['id','page','x','y','rotation','locked','note'])assert.deepEqual(after[key],p[key],'fork preserves geometry/identity '+key);if(p.id!==placed[0].id)assert.deepEqual(after,p,'only selected physical door is relinked');}
   await fillProduct(page,'day-lock','511-50');await saveCard(page);current=await snap(page);assert.equal(current.state.cards.GS4.rows.find(r=>r.id==='day-lock').product,'310-50');assert.equal(current.state.cards['GS4-A'].rows.find(r=>r.id==='day-lock').product,'511-50');assert.equal(current.state.cards['GS4-A'].rows.find(r=>r.id==='day-lock').installer,'DT');
   await view(page,'materials');await page.waitForFunction(()=>Proj2App.snapshot().materials?.rows.some(r=>r.product==='511-50'));const report=(await snap(page)).materials;assert.equal(report.rows.find(r=>r.product==='310-50').quantity,4);assert.equal(report.rows.find(r=>r.product==='511-50').quantity,1);assert.equal(report.rows.find(r=>r.product==='JCK207').quantity,10);
   const before=(await snap(page)).state,portable=await download(page,()=>clickMenuItem(page,'#exportPdf'));const pdf=await PDFDocument.load(portable.bytes);assert(pdf.getPageCount()>=3,'PDF includes blank plan and both private/shared cards');
   await page.locator('#projectFile').setInputFiles(upload(portable.bytes,'private-card-roundtrip.pdf'));await confirm(page);await page.waitForFunction(()=>Proj2App.snapshot().state.cards['GS4-A']?.rows.some(r=>r.product==='511-50'));await idle(page);assert.deepEqual((await snap(page)).state.cards,before.cards);assert.deepEqual((await snap(page)).state.placements,before.placements);
   await page.reload();await ready(page);await idle(page);assert.deepEqual((await snap(page)).state.cards,before.cards);assert.deepEqual((await snap(page)).state.placements,before.placements);
   await overflow(page);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.getItem('qa-other-workspace')),'preserve');
   console.log(device.name+': blank page,5shared GS4→one private card, dirty-draft cancel/fork, owner auto-copy/manualoverride, materials×2 and PDF/reload passed');
  }finally{await ctx.close();}
 }
 async function centered(page,container,children,label){
  const geometry=await page.locator(container).evaluate((node,selector)=>{
   const box=node.getBoundingClientRect(),items=[...node.querySelectorAll(selector)].map(x=>x.getBoundingClientRect()).filter(x=>x.width&&x.height);return{box:{left:box.left,right:box.right},left:Math.min(...items.map(x=>x.left)),right:Math.max(...items.map(x=>x.right))};
  },children);
  assert(Math.abs((geometry.left+geometry.right)-(geometry.box.left+geometry.box.right))<5,label+' centered: '+JSON.stringify(geometry));
 }
 async function textAndLayout(browser,device){
  const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  try{
   await page.goto(url());await ready(page);await settleImport(page,'#drawingFile',await sourcePDF(),'search-three-plans.pdf',3);await noVibration(page,'text drawing');
   assert.equal(await page.locator('#toolHint').isVisible(),false,'long drawing instruction is hidden');assert.equal(await page.locator('.selection-inspector').count(),1);assert.equal(await page.locator('.placements-index').count(),1);
   assert.equal(await page.locator('#openProject').isVisible(),false,'open project moved into compact menu');assert.equal(await page.locator('#saveProject').isVisible(),false,'save project moved into compact menu');
   if(!await page.locator('#pdfSearchInput').isVisible()){
    const menu=page.locator('#pdfSearchInput').locator('xpath=ancestor::details[1]');await menu.locator(':scope > summary').click();
   }
   await page.locator('#pdfSearchInput').fill('GS4');await page.locator('#pdfSearchButton').click();await page.waitForFunction(()=>!document.getElementById('pdfSearchButton').disabled&&document.querySelectorAll('#pdfSearchResults button').length>=3);
   let matches=page.locator('#pdfSearchResults button');assert.equal(await matches.count(),4,'GS4 finds four physical text hits across3 pages, excluding GS40');
   await matches.nth(1).click();await page.waitForFunction(()=>Proj2App.snapshot().page===2);await idle(page);assert(await page.locator('#drawingHost .p2-search-highlight').count(),'rotatedpage search match highlighted');
   await page.locator('#pdfSearchNext').click();await page.waitForFunction(()=>Proj2App.snapshot().page===3);await idle(page);assert(await page.locator('#drawingHost .p2-search-highlight').count());
   await page.locator('#pdfSearchPrev').click();await page.waitForFunction(()=>Proj2App.snapshot().page===2);await idle(page);
   await matches.first().click();await page.waitForFunction(()=>Proj2App.snapshot().page===1);await idle(page);
   await page.locator('#pdfTextSelectButton').click();await page.waitForFunction(()=>Proj2App.snapshot().view.textSelection===true);await page.locator('#drawingHost .p2-text-layer span').filter({hasText:/^GS4$/}).first().waitFor();
   if(device.name==='desktop'){
    const textSpan=page.locator('#drawingHost .p2-text-layer span').filter({hasText:/^GS4$/}).first();await textSpan.scrollIntoViewIfNeeded();const box=await textSpan.boundingBox();await page.evaluate(()=>getSelection().removeAllRanges());await page.mouse.move(box.x+1,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width-1,box.y+box.height/2,{steps:8});await page.mouse.up();assert.equal(await page.evaluate(()=>getSelection().toString()),'GS4','mouse can select actual PDF text');
   }
   const selected=await page.evaluate(()=>{const span=[...document.querySelectorAll('#drawingHost .p2-text-layer span')].find(n=>n.textContent==='GS4');const range=document.createRange();range.selectNodeContents(span);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));return selection.toString();});assert.equal(selected,'GS4');
   await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(url()).origin});await page.evaluate(()=>{window.__copyPrevented=null;const listener=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){window.__copyPrevented=e.defaultPrevented;document.removeEventListener('keydown',listener);}};document.addEventListener('keydown',listener);});await page.keyboard.press('Control+c');assert.equal(await page.evaluate(()=>window.__copyPrevented),false,'text mode preserves nativeCtrlC');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'GS4','native CtrlC copies selected PDF text');await page.locator('#pdfCopyText').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'GS4','copy button uses selected PDF text');
   await page.locator('#pdfSearchSelected').click();await page.waitForFunction(()=>document.getElementById('pdfSearchInput').value==='GS4'&&document.querySelectorAll('#pdfSearchResults button').length===4);
   await page.locator('#pdfTextSelectButton').click();await page.waitForFunction(()=>Proj2App.snapshot().view.textSelection===false);
   if(device.name==='desktop'){
    await centered(page,'.drawing-toolbar','button,details>summary','drawing tools');await centered(page,'.workspace-tabs','button','workspace tabs');await centered(page,'.project-counts',':scope > span','counts');await centered(page,'.view-bar','.page-navigation','page navigation');
    const enabled=await page.locator('body').getAttribute('data-pane-layout');assert.equal(enabled,'desktop');
    const left=page.locator('#resizeLibraryPane'),right=page.locator('#resizeCardPane');assert(await left.isVisible());assert(await right.isVisible());
    const initial=await page.locator('#libraryPane').boundingBox(),split=await left.boundingBox();await page.mouse.move(split.x+split.width/2,split.y+split.height/2);await page.mouse.down();await page.mouse.move(split.x+split.width/2+45,split.y+split.height/2,{steps:8});await page.mouse.up();
    const changed=await page.locator('#libraryPane').boundingBox();assert(changed.width>initial.width+20,'drag widens library');
    const cardBefore=await page.locator('#cardPane').boundingBox(),r=await right.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2-45,r.y+r.height/2,{steps:8});await page.mouse.up();const cardAfter=await page.locator('#cardPane').boundingBox();assert(cardAfter.width>cardBefore.width+20,'drag left widens card pane');
    await left.focus();const width=(await page.locator('#libraryPane').boundingBox()).width;await left.press('ArrowRight');assert((await page.locator('#libraryPane').boundingBox()).width>width,'separator keyboard resize works');
    const saved={left:(await page.locator('#libraryPane').boundingBox()).width,right:(await page.locator('#cardPane').boundingBox()).width};assert(await page.evaluate(()=>!!localStorage.getItem('tillsyno-projektering-layout-v1')));await page.reload();await ready(page);await idle(page);assert(Math.abs((await page.locator('#libraryPane').boundingBox()).width-saved.left)<2);assert(Math.abs((await page.locator('#cardPane').boundingBox()).width-saved.right)<2);await noVibration(page,'resized desktop drawing');
    await page.evaluate(()=>{document.documentElement.dataset.device='tablet';window.dispatchEvent(new Event('resize'));});await page.waitForFunction(()=>document.body.dataset.paneLayout!=='desktop');assert(!await left.isVisible(),'manual tablet mode disables desktop resize');await page.evaluate(()=>{delete document.documentElement.dataset.device;window.dispatchEvent(new Event('resize'));});await page.waitForFunction(()=>document.body.dataset.paneLayout==='desktop');
   }else{
    assert(!await page.locator('#resizeLibraryPane').isVisible());assert(!await page.locator('#resizeCardPane').isVisible());await view(page,'drawing');
    const box=await page.locator('#drawingHost .p2-canvas-scroller').boundingBox(),center={x:box.x+box.width/2,y:box.y+box.height/2},before=(await snap(page)).view.zoom,touch=await ctx.newCDPSession(page),count=(await snap(page)).state.placements.length;
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x-25,y:center.y-10,id:71},{x:center.x+25,y:center.y+10,id:72}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x-45,y:center.y-20,id:71},{x:center.x+45,y:center.y+20,id:72}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();await idle(page);assert((await snap(page)).view.zoom>before*1.15,'native twofinger pinch still zooms');assert.equal((await snap(page)).state.placements.length,count,'pinch creates no stray stamp');
   }
   await overflow(page);
   // Hold a completed search result until after a new project has replaced its
   // source; that old asynchronous result must never reappear in the new UI.
   await newProject(page);assert.equal((await snap(page)).search.matches.length,0);await settleImport(page,'#drawingFile',await sourcePDF(),'replace-search-source.pdf',3);
   await page.evaluate(()=>{const original=Proj2Search;window.__qaSearchHeld=false;window.Proj2Search={...original,create:options=>{const engine=original.create(options);return{...engine,search:async(...args)=>{const result=await engine.search(...args);window.__qaSearchHeld=true;await new Promise(resolve=>setTimeout(resolve,800));return result;}};}};});
   if(!await page.locator('#pdfSearchInput').isVisible())await page.locator('#pdfSearchPanel>summary').click();await page.locator('#pdfSearchInput').fill('GS4');await page.locator('#pdfSearchButton').click();await page.waitForFunction(()=>window.__qaSearchHeld===true);await newProject(page);await page.waitForTimeout(850);assert.equal((await snap(page)).search.query,'');assert.equal((await snap(page)).search.matches.length,0);assert.equal(await page.locator('#pdfSearchResults button').count(),0,'late previous-document hits never reappear');
   await page.locator('#createBlankDrawing').click();await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===1);await idle(page);if(!await page.locator('#pdfSearchInput').isVisible())await page.locator('#pdfSearchPanel>summary').click();await page.locator('#pdfSearchInput').fill('GS4');await page.locator('#pdfSearchButton').click();await page.waitForFunction(()=>document.getElementById('pdfSearchStatus').textContent.includes('saknar sökbar text'));assert.equal(await page.locator('#pdfSearchResults button').count(),0);await overflow(page);assert.deepEqual(errors,[]);
   console.log(device.name+': all-page selectablePDF search/navigation, nativecopy, stablefit, centered desktop controls, adjustable panes/touch pinch, compact menus, stale-result reset and no-text PDF passed');
  }finally{await ctx.close();}
 }
 async function run(browser,device){await blankAndCards(browser,device);await textAndLayout(browser,device);}
}
const body=scenario.toString(),injected=body.slice(body.indexOf('{')+1,body.lastIndexOf('}'));
const source=(base.slice(0,start)+injected+base.slice(end)).replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-10.html');
const child=new Module(fixturePath,module);child.filename=fixturePath;child.paths=module.paths;child._compile(source,fixturePath);
