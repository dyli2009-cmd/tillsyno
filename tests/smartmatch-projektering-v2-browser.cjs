'use strict';
// Generated PDFs only. The production page and unchanged license guard execute;
// just the authentication client is replaced for this local browser fixture.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,degrees}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..'),entry='smartmatch-projektering-v2.html';
const devices=[{name:'desktop',width:1440,height:1000},{name:'ipad',width:834,height:1194,touch:true},{name:'iphone',width:390,height:844,touch:true}].filter(d=>!process.env.PROJECTION2_DEVICE||d.name===process.env.PROJECTION2_DEVICE);
const server=http.createServer((req,res)=>{const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.pdf':'application/pdf'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}});
const url=()=>`http://127.0.0.1:${server.address().port}/${entry}`;
const upload=(bytes,name)=>({name,mimeType:name.endsWith('.pdf')?'application/pdf':'application/json',buffer:Buffer.from(bytes)});
async function fixture(){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 const a=pdf.addPage([800,600]);a.drawText('Generated projection test: plan A',{x:35,y:565,size:18,font});
 for(let i=0;i<10;i++){const x=40+(i%5)*150,y=350-Math.floor(i/5)*190;a.drawRectangle({x,y,width:120,height:125,borderWidth:1});a.drawText('Room '+(101+i),{x:x+12,y:y+100,size:10,font});}
 const b=pdf.addPage([600,800]);b.setCropBox(20,30,560,740);b.setRotation(degrees(90));b.drawText('Generated projection test: rotated cropped plan B',{x:45,y:715,size:12,font});b.drawRectangle({x:80,y:200,width:400,height:400,borderWidth:1});
 return Buffer.from(await pdf.save());
}
async function context(browser,device,modules=['smartmatch']){
 const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:!!device.touch,isMobile:!!device.touch,acceptDownloads:true});
 await ctx.route('**/auth/client.js*',route=>route.fulfill({contentType:'application/javascript',body:`window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',email:'projection-generated-test@example.invalid',modules:${JSON.stringify(modules)}}),permitted:(a,m)=>!m||a.modules.includes(m)};`}));
 await ctx.addInitScript(()=>{if(localStorage.getItem('qa-other-workspace')===null)localStorage.setItem('qa-other-workspace','preserve');});return ctx;
}
const snap=page=>page.evaluate(()=>Proj2App.snapshot());
async function persisted(page){return page.evaluate(async()=>{const saved=await Proj2Store.load();return saved?{state:saved.state,bytes:saved.original.length}:null;});}
async function ready(page){await page.waitForFunction(()=>window.Proj2App&&!document.documentElement.hasAttribute('data-auth-pending'));}
async function idle(page){await page.waitForFunction(()=>document.getElementById('drawingHost').getAttribute('aria-busy')!=='true'&&!Proj2App.snapshot().view.rendering);}
async function view(page,name){const tab=page.locator(`button[data-view="${name}"]`);if(await tab.isVisible())await tab.click();}
async function overflow(page){const value=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(value.scroll<=value.width+1,'Page overflow '+JSON.stringify(value));}
async function confirm(page){await page.waitForSelector('#confirmDialog[open]');await page.locator('#confirmAccept').click();await page.waitForSelector('#confirmDialog[open]',{state:'hidden'});}
async function waitCount(page,count){await page.waitForFunction(count=>Proj2App.snapshot().state.placements.length===count,count);await idle(page);}
async function download(page,click){const promise=page.waitForEvent('download');await click();const file=await promise;return {name:file.suggestedFilename(),bytes:fs.readFileSync(await file.path())};}
async function settleImport(page,fileInput,bytes,name,expectedPages){
 await page.locator(fileInput).setInputFiles(upload(bytes,name));
 await page.waitForFunction(expected=>document.getElementById('confirmDialog')?.open||Proj2App.snapshot().state.drawing.pages.length===expected,expectedPages);
 if(await page.locator('#confirmDialog[open]').count()){
  if((await page.locator('#confirmTitle').textContent())==='Öppna ny ritning'){await page.locator('#confirmDiscard').click();await page.waitForFunction(expected=>document.getElementById('confirmDialog').open||Proj2App.snapshot().state.drawing.pages.length===expected,expectedPages);}
  if(await page.locator('#confirmDialog[open]').count())await confirm(page);
 }
 await page.waitForFunction(expected=>Proj2App.snapshot().state.drawing.pages.length===expected,expectedPages);
 await idle(page);
}
async function library(page,code){await view(page,'stencils');await page.locator('#stampSearch').fill(code);return page.locator(`#stampList [data-stencil-id="${code}"]`);}
async function pageBox(page){
 return page.locator('#drawingHost .p2-canvas-page').boundingBox();
}
async function place(page,code,x,y){
 const button=await library(page,code);await button.click();await view(page,'drawing');await page.locator('#toolPlace').click();
 const b=await pageBox(page);assert(b&&b.width>0&&b.height>0,'rendered PDF page has visible dimensions');
 const old=(await snap(page)).state.placements.length;
 if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.touchscreen.tap(b.x+b.width*x,b.y+b.height*y);else await page.mouse.click(b.x+b.width*x,b.y+b.height*y);
 await waitCount(page,old+1);return (await snap(page)).state.placements.at(-1);
}
async function dragPlace(page,code,x,y){
 const button=await library(page,code),transfer=await page.evaluateHandle(()=>new DataTransfer());
 const old=(await snap(page)).state.placements.length;
 try{await button.dispatchEvent('dragstart',{dataTransfer:transfer});await view(page,'drawing');const box=await pageBox(page);await page.locator('#drawingHost .p2-canvas-scroller').dispatchEvent('drop',{dataTransfer:transfer,clientX:box.x+box.width*x,clientY:box.y+box.height*y});await waitCount(page,old+1);return(await snap(page)).state.placements.at(-1);}finally{await transfer.dispose();}
}
async function select(page,id){await view(page,'drawing');await page.locator('#toolSelect').click();const stamp=page.locator(`#drawingHost [data-placement-id="${id}"]`);if(await page.evaluate(()=>navigator.maxTouchPoints>0))await stamp.tap();else await stamp.click();await page.waitForFunction(id=>Proj2App.snapshot().selectedIds.includes(id),id);await idle(page);}
async function saveCard(page){await page.locator('#saveCard').click();await page.waitForFunction(()=>!Proj2App.snapshot().dirty);}
const productButton=(page,id)=>page.locator(`#cardRows [data-action="choose-product"][data-row-id="${id}"]`);

async function run(browser,device,source){
 const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 const trace=text=>{if(process.env.PROJECTION2_DEBUG)console.log(device.name+': '+text);};
 try{
  await page.goto(url());await ready(page);await overflow(page);trace('boot');
  assert.equal((await snap(page)).state.placements.length,0,'new project has no pre-drawn placements');
  await settleImport(page,'#drawingFile',source,'generated-two-plans.pdf',2);await page.waitForSelector('#drawingHost canvas');trace('own PDF imported');
  let current=await snap(page);assert.equal(current.state.drawing.pages.length,2);assert.equal(current.state.drawing.pages[1].rotation,90);assert.equal(current.state.drawing.name,'generated-two-plans.pdf');
  const first=device.touch?await place(page,'GS65',.35,.35):await dragPlace(page,'GS65',.35,.35),second=await place(page,'GS65',.65,.55);trace('shared GS65 placed');
  assert.equal(Object.keys((await snap(page)).state.cards).filter(c=>c==='GS65').length,1);
  await select(page,first.id);await view(page,'cards');
  await productButton(page,'day-lock').click();await page.locator('#productSearch').fill('511-50');await page.locator('#productList [data-product-id="lock-511-50"]').click();
  current=await snap(page);assert.equal(current.state.cards.GS65.rows.find(r=>r.id==='day-lock').product,'','product edits stay in draft');
  await page.locator('#cardRows input[data-row-id="day-lock"][data-field="quantity"]').fill('2');
  await page.locator('#cardMeta [data-meta="doorType"]').fill('Innerdörr QA');await saveCard(page);trace('shared card saved');
  assert.equal((await persisted(page)).state.cards.GS65.meta.doorType,'Innerdörr QA');
  await select(page,second.id);await view(page,'cards');current=await snap(page);assert.equal(current.draft.rows.find(r=>r.id==='day-lock').product,'511-50');assert.equal(current.draft.meta.doorType,'Innerdörr QA');
  // Explicit cancel/discard protects the saved card while moving between positions.
  await page.locator('#cardNote').fill('discard-this-draft');let another=await library(page,'GS66');await another.click();await page.waitForSelector('#confirmDialog[open]');await page.locator('#confirmCancel').click();assert.equal((await snap(page)).dirty,true);another=await library(page,'GS66');await another.click();await page.waitForSelector('#confirmDialog[open]');await page.locator('#confirmDiscard').click();await page.waitForFunction(()=>!Proj2App.snapshot().dirty);assert.equal((await snap(page)).state.cards.GS65.note,'');trace('draft cancel/discard');
  await view(page,'drawing');await page.locator('#nextPage').click();await page.waitForFunction(()=>Proj2App.snapshot().page===2);await page.waitForSelector('#drawingHost canvas');
  const third=await place(page,'DGS100',.45,.45);assert.equal(third.page,2);trace('second rotated page placed');
  await page.locator('#zoomIn').click();await page.locator('#zoomFit').click();await overflow(page);
  if(device.name==='desktop'){
   const oldZoom=await page.locator('#zoomLevel').textContent(),bounds=await pageBox(page);await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);await page.mouse.wheel(0,-180);await page.waitForFunction(old=>document.getElementById('zoomLevel').textContent!==old,oldZoom);await page.locator('#zoomFit').click();trace('mouse wheel zoom');
   await select(page,third.id);const stampBox=await page.locator(`#drawingHost [data-placement-id="${third.id}"]`).boundingBox(),sheetBox=await pageBox(page),beforeDrag=(await snap(page)).state.placements.find(p=>p.id===third.id);await page.mouse.move(stampBox.x+stampBox.width/2,stampBox.y+stampBox.height/2);await page.mouse.down();await page.mouse.move(stampBox.x+stampBox.width/2+24,stampBox.y+stampBox.height/2-12,{steps:8});await page.mouse.up();await page.waitForFunction(({id,x})=>Math.abs(Proj2App.snapshot().state.placements.find(p=>p.id===id).x-x)>.005,{id:third.id,x:beforeDrag.x});await idle(page);const dragged=(await snap(page)).state.placements.find(p=>p.id===third.id);assert(Math.abs(dragged.x-beforeDrag.x-24/sheetBox.width)<.003,'drag uses real zoomed page X');assert(Math.abs(dragged.y-beforeDrag.y+12/sheetBox.height)<.003,'drag uses real zoomed page Y');trace('real HTML stamp drag persisted');
   await select(page,third.id);if(!await page.locator('#selectionX').isVisible())await page.locator('.selection-inspector>summary').click();await page.locator('#selectionX').fill('52');await page.locator('#selectionY').fill('48');await page.locator('#selectionRotation').fill('30');await page.locator('#applySelection').click();await page.waitForFunction(id=>Math.abs(Proj2App.snapshot().state.placements.find(p=>p.id===id).x-.52)<.001,third.id);
   let position=(await snap(page)).state.placements.find(p=>p.id===third.id);assert.equal(position.rotation,30);
   await page.locator('#duplicateSelection').click();await waitCount(page,4);await page.locator('#undo').click();await waitCount(page,3);await page.locator('#redo').click();await waitCount(page,4);trace('transform duplicate undo redo');
   const duplicate=(await snap(page)).state.placements.find(p=>p.id!==third.id&&p.code==='DGS100');await select(page,duplicate.id);await page.locator('#lockSelection').click();await page.waitForFunction(id=>Proj2App.snapshot().state.placements.find(p=>p.id===id).locked,duplicate.id);
   const locked=await snap(page);await page.locator('#deleteSelection').click();await page.waitForTimeout(100);assert.deepEqual((await snap(page)).state.placements,locked.state.placements,'locked selection cannot be deleted');await page.locator('#lockSelection').click();await page.waitForFunction(id=>!Proj2App.snapshot().state.placements.find(p=>p.id===id).locked,duplicate.id);await page.locator('#deleteSelection').click();await waitCount(page,3);trace('locked deletion protected');
   // Add a reusable custom square stencil and place it.
   await view(page,'stencils');await page.locator('#newStencil').click();await page.waitForSelector('#stencilDialog[open]');await page.locator('#stencilCode').fill('QA42');await page.locator('#stencilName').fill('Egen QA-stämpel');await page.locator('#stencilShape').selectOption('square');await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});
   const own=await place(page,'QA42',.7,.65);assert.equal((await snap(page)).state.stencils[own.stencilId].shape,'square');trace('custom stencil');
   await view(page,'stencils');await page.locator('#editStencil').click();await page.waitForSelector('#stencilDialog[open]');await page.locator('#stencilFill').fill('#88ccaa');await page.locator('#saveStencil').click();await page.waitForSelector('#stencilDialog[open]',{state:'hidden'});assert.equal((await snap(page)).state.stencils[own.stencilId].fill,'#88ccaa');trace('stencil style edit');
   await view(page,'drawing');await page.locator('#prevPage').click();await page.waitForFunction(()=>Proj2App.snapshot().page===1);await select(page,first.id);await view(page,'cards');await page.locator('#copyCard').click();await page.waitForSelector('#textDialog[open]');await page.locator('#textValue').fill('QA66');await page.locator('#textAccept').click();await page.waitForFunction(()=>!!Proj2App.snapshot().state.cards.QA66);assert.equal((await snap(page)).state.cards.QA66.rows.find(row=>row.id==='day-lock').product,'511-50');await page.locator('#newCard').click();await page.waitForSelector('#textDialog[open]');await page.locator('#textValue').fill('QA67');await page.locator('#textAccept').click();await page.waitForFunction(()=>!!Proj2App.snapshot().state.cards.QA67);await page.locator('#deleteCard').click();await confirm(page);await page.waitForFunction(()=>!Proj2App.snapshot().state.cards.QA67);trace('card copy add delete');
   await select(page,first.id);await view(page,'cards');await page.locator('#cardNote').fill('Sparad före byte av ritningsunderlag');const priorPositions=(await snap(page)).state.placements;await page.locator('#drawingFile').setInputFiles(upload(source,'another-source.pdf'));await page.waitForSelector('#confirmDialog[open]');assert((await page.locator('#confirmTitle').textContent()).includes('Spara'));await page.locator('#confirmCancel').click();await idle(page);assert.equal((await snap(page)).dirty,true);assert.deepEqual((await snap(page)).state.placements,priorPositions);await page.locator('#drawingFile').setInputFiles(upload(source,'another-source.pdf'));await page.waitForSelector('#confirmDialog[open]');await page.locator('#confirmAccept').click();await page.waitForFunction(()=>document.getElementById('confirmDialog').open&&document.getElementById('confirmTitle').textContent.includes('Byt'));await page.locator('#confirmCancel').click();await idle(page);assert.equal((await snap(page)).dirty,false);assert.equal((await snap(page)).state.cards.GS65.note,'Sparad före byte av ritningsunderlag');assert.deepEqual((await snap(page)).state.placements,priorPositions);trace('source replacement protects card draft');
   await view(page,'drawing');const beforeQuota=(await snap(page)).state;await page.evaluate(()=>{window.__qaTransaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(stores,mode,...rest){if(mode==='readwrite')throw new DOMException('Generated quota failure','QuotaExceededError');return window.__qaTransaction.call(this,stores,mode,...rest);};});try{await page.locator('#duplicateSelection').click();await page.waitForFunction(()=>document.getElementById('appMessage').dataset.level==='error');await idle(page);assert.deepEqual((await snap(page)).state,beforeQuota,'failed local save cannot replace the active project');assert.deepEqual((await persisted(page)).state,beforeQuota,'failed local save cannot replace committed project');}finally{await page.evaluate(()=>{IDBDatabase.prototype.transaction=window.__qaTransaction;delete window.__qaTransaction;});}trace('storage failure rollback');
  }
  const beforeFiles=(await snap(page)).state;
  const json=await download(page,()=>page.locator('#saveProject').click());assert(json.bytes.length>source.length,'portable project includes its original source');
  const portable=await download(page,()=>page.locator('#exportPdf').click());assert.equal(portable.bytes.subarray(0,5).toString(),'%PDF-');trace('downloads');
  // New empty state followed by PDF reopening restores clean original and cards.
  await page.locator('.project-menu>summary').click();await page.locator('#newProject').click();await confirm(page);await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===0);assert.equal(await page.locator('.project-menu[open]').count(),0,'project menu closes after its action');await settleImport(page,'#projectFile',portable.bytes,'reopen-project.pdf',2);await page.waitForFunction(expected=>JSON.stringify(Proj2App.snapshot().state.placements)===JSON.stringify(expected),beforeFiles.placements);assert.deepEqual((await snap(page)).state.cards,beforeFiles.cards);trace('PDF reopen');
  await page.locator('#projectFile').setInputFiles(upload(json.bytes,'reopen-project.json'));await confirm(page);await idle(page);assert.deepEqual((await snap(page)).state,beforeFiles);trace('JSON reopen');
  await page.reload();await ready(page);await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===2);assert.deepEqual((await snap(page)).state.placements,beforeFiles.placements);assert.deepEqual((await snap(page)).state.cards,beforeFiles.cards);assert.equal((await persisted(page)).bytes,source.length);trace('IDB reload');
  const invalid=Buffer.from('{"format":"TillsynoProjekteringV2","state":{"schema":999},"originalBase64":""}');await page.locator('#projectFile').setInputFiles(upload(invalid,'invalid.json'));await page.waitForFunction(()=>document.getElementById('appMessage').dataset.level==='error');await idle(page);assert.deepEqual((await snap(page)).state.cards,beforeFiles.cards,'invalid import keeps saved cards');assert.deepEqual((await snap(page)).state.placements,beforeFiles.placements,'invalid import keeps existing positions');
  const mismatch=JSON.parse(json.bytes);mismatch.state.drawing.pages[0].width+=1;await page.locator('#projectFile').setInputFiles(upload(Buffer.from(JSON.stringify(mismatch)),'wrong-original-metadata.json'));await page.waitForFunction(()=>document.getElementById('appMessage').textContent.includes('siduppgifter'));await idle(page);assert.deepEqual((await snap(page)).state,beforeFiles,'wrong source geometry cannot replace active state');assert.deepEqual((await persisted(page)).state,beforeFiles,'wrong source geometry cannot replace IndexedDB');
  await page.locator('#help').click();await page.waitForSelector('#helpDialog[open]');await page.locator('#helpDialog form[method="dialog"] button').first().click();await overflow(page);assert.equal(await page.evaluate(()=>localStorage.getItem('qa-other-workspace')),'preserve');
  assert.deepEqual(errors,[]);
  if(process.env.PROJECTION2_SCREENSHOTS){fs.mkdirSync(path.join(root,'work/projektering-v2/qa'),{recursive:true});await page.screenshot({path:path.join(root,'work/projektering-v2/qa',device.name+'.png'),fullPage:true});}
  console.log(device.name+': own multipage PDF, shared cards/drafts, native rotation, transforms/history/locks, custom stencils, portable files and IndexedDB reopen passed');
 }catch(error){console.error(device.name+' diagnostic:',await page.evaluate(()=>({message:document.getElementById('appMessage')?.textContent,view:window.Proj2App?.snapshot().view,selected:window.Proj2App?.snapshot().selectedIds})).catch(()=>({})));throw error;}finally{await ctx.close();}
}
async function denied(browser){const ctx=await context(browser,{width:1000,height:800},['control']);try{const page=await ctx.newPage();await page.goto(url());await page.waitForSelector('#tillsynoAccessDenied');assert.equal(await page.evaluate(()=>!!window.TillsynoCurrentAccess),false);assert.equal(await page.evaluate(()=>!!window.Proj2App),false);console.log('control-only account: unchanged SmartMatch guard denies projection');}finally{await ctx.close();}}
(async()=>{const source=await fixture();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{for(const device of devices)await run(browser,device,source);await denied(browser);}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});

