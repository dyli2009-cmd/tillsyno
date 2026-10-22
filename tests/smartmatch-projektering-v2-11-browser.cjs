'use strict';
// Real production page, PDF.js/PDF exports, IndexedDB, and native input.
// No screenshots, generated images, or remote writes.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const fixturePath=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs'),base=fs.readFileSync(fixturePath,'utf8');
const start=base.indexOf('async function run(browser,device,source){'),end=base.indexOf('async function denied(browser){',start);
if(start<0||end<0)throw Error('Shared fixture boundaries changed');
function scenario(){
 async function clickMenuItem(page,id){
  const target=page.locator(id);
  if(!await target.isVisible())await target.locator('xpath=ancestor::details[1]').locator(':scope > summary').click();
  await target.click();
 }
 async function fillProduct(page,rowId,value){
  const input=page.locator('#cardRows input[data-product-input][data-row-id="'+rowId+'"]');
  await input.scrollIntoViewIfNeeded();await input.fill(value);await input.press('Escape');
 }
 const qty=(page,rowId)=>page.locator('#cardRows input[data-row-id="'+rowId+'"][data-field="quantity"]');
 async function report(page){await view(page,'materials');await page.waitForFunction(()=>Proj2App.snapshot().materials);return(await snap(page)).materials;}
 async function rateInput(page,product){
  const key=(await report(page)).rows.find(row=>row.product===product)?.key;assert(key,'material row exists for '+product);
  const rows=page.locator('#materialRows tr');
  const match=rows.filter({has:page.locator('[data-material-time]')});
  const count=await match.count();assert(count>0,'editable time inputs exist');
  const input=page.locator('#materialRows tr').filter({hasText:product}).locator('[data-material-time]');
  assert.equal(await input.count(),1,'exactly one time input for '+product);return{input,key};
 }
 async function setRate(page,product,text,value){
  const {input,key}=await rateInput(page,product);await input.fill(text);await input.press('Tab');
  await page.waitForFunction(({key,value})=>Proj2App.snapshot().state.preferences.materialTimes[key]===value,{key,value});
  await page.waitForFunction(({key,value})=>Proj2App.snapshot().materials.rows.find(row=>row.key===key)?.timePerUnit===value,{key,value});
  return key;
 }
 async function rapidRates(page,device){
  if(device.name!=='desktop')return;
  const first=await rateInput(page,'ED100'),second=await rateInput(page,'8882');
  await page.evaluate(()=>{window.__qaSaveDelay=250;});
  try{
   await first.input.fill('91');await first.input.press('Tab');await page.waitForFunction(()=>window.__qaSaving);
   await second.input.fill('11');await second.input.press('Tab');
   await page.waitForFunction(({first,second})=>Proj2App.snapshot().state.preferences.materialTimes[first]===91&&Proj2App.snapshot().state.preferences.materialTimes[second]===11,{first:first.key,second:second.key},{timeout:3000});
   await idle(page);assert.equal((await snap(page)).materials.totalMinutes,221.5,'two rapid rates both commit and recalculate');
   const operator=await rateInput(page,'ED100');await operator.input.fill('90');
   const button=await page.locator('#materialCsv').boundingBox(),pending=page.waitForEvent('download',{timeout:4000});
   await page.mouse.click(button.x+button.width/2,button.y+button.height/2);
   const downloaded=await pending,bytes=fs.readFileSync(await downloaded.path());
   assert.equal((await snap(page)).state.preferences.materialTimes[first.key],90,'one click on CSV commits focused time before export');
   assert(bytes.toString('utf8').includes('219,5'),'blur-and-export CSV contains freshly saved rate');
  }finally{await page.evaluate(()=>{window.__qaSaveDelay=0;});}
  await setRate(page,'8882','10',10);
  console.log(device.name+': delayed IndexedDB rapid consecutive rate edits and one-click blur/export passed');
 }
 async function failedRate(page,device){
  if(device.name!=='desktop')return;
  const {input,key}=await rateInput(page,'ED100');await page.evaluate(()=>{window.__qaFailSave=true;});
  await input.fill('95');await input.press('Tab');await page.waitForFunction(()=>document.getElementById('appMessage').dataset.level==='error'&&document.getElementById('drawingHost').getAttribute('aria-busy')!=='true');
  assert.equal((await snap(page)).state.preferences.materialTimes[key],90,'failed save preserves active committed rate');assert.equal((await persisted(page)).state.preferences.materialTimes[key],90,'failed save preserves IndexedDB rate');
  if(await input.inputValue()!=='90'){
   assert.equal(await input.getAttribute('aria-invalid'),'true','visible unsaved rate is marked invalid after storage failure');
   const button=await page.locator('#materialCsv').boundingBox(),pending=page.waitForEvent('download',{timeout:500}).catch(()=>null);await page.mouse.click(button.x+button.width/2,button.y+button.height/2);assert.equal(await pending,null,'visible failed edit blocks exporting the older saved rate');
   await input.fill('90');await input.press('Tab');await page.waitForFunction(()=>!document.querySelector('#materialRows [aria-invalid="true"]'));
  }
  await setRate(page,'ED100','95',95);await setRate(page,'ED100','90',90);
  console.log(device.name+': rejected rate save preserves committed project, prevents stale visible export, and retry recovers');
 }
 async function pdfText(page,bytes){
  return page.evaluate(async data=>{
   const pdf=await pdfjsLib.getDocument({data:new Uint8Array(data)}).promise,result=[];
   try{for(let n=1;n<=pdf.numPages;n++)result.push((await(await pdf.getPage(n)).getTextContent()).items.map(item=>item.str).join(' '));return result;}
   finally{await pdf.destroy();}
  },Array.from(bytes));
 }
 async function counts(page,expected){
  const actual=await page.evaluate(()=>({markings:Number(document.getElementById('placementCount').textContent),cards:Number(document.getElementById('cardCount').textContent),doorAutomation:Number(document.getElementById('automationCount').textContent),doorCloser:Number(document.getElementById('closerCount').textContent),otherProducts:Number(document.getElementById('otherProductCount').textContent)}));
  assert.deepEqual(actual,expected);assert.deepEqual(actual,await page.evaluate(()=>Proj2Data.placementCounts(Proj2App.snapshot().state)));
 }
 async function header(page,device){
  if(device.name!=='desktop')return;
  const g=await page.evaluate(()=>{
   const rect=node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,cx:r.x+r.width/2,cy:r.y+r.height/2};};
   const items=[...document.querySelectorAll('.project-counts>span')].map(rect),actions=[document.querySelector('#openDrawing'),document.querySelector('#pdfExportMenu>summary'),document.querySelector('#projectOptions>summary')].map(rect);
   return{bar:rect(document.querySelector('.project-bar')),counts:{left:Math.min(...items.map(i=>i.x)),right:Math.max(...items.map(i=>i.right)),top:Math.min(...items.map(i=>i.y)),bottom:Math.max(...items.map(i=>i.bottom))},actions,tabs:rect(document.querySelector('.workspace-tabs')),width:innerWidth};
  });
  assert(Math.abs((g.counts.left+g.counts.right)/2-g.width/2)<4,'counter group centered across viewport: '+JSON.stringify(g));
  assert(Math.max(...g.actions.map(i=>i.cy))-Math.min(...g.actions.map(i=>i.cy))<2,'file actions share a line');
  assert(Math.abs((g.counts.top+g.counts.bottom)/2-g.actions[0].cy)<3,'counters and file actions share one line: '+JSON.stringify(g));
  assert(g.width-g.actions.at(-1).right<35,'project menu sits at far right');
  assert(g.counts.bottom<=g.tabs.y+1&&g.actions.every(i=>i.bottom<=g.tabs.y+1),'counter/actions row above tabs');
  assert(g.counts.right<=g.actions[0].x-4,'counter group does not overlap file actions');
 }
 async function preview(page,device){
  const before=await snap(page),stored=await persisted(page);
  await page.evaluate(()=>{const api=Proj2PDF;window.__qaPreviewBytes=null;window.Proj2PDF={...api,buildCardPreview:async(...args)=>{const bytes=await api.buildCardPreview(...args);window.__qaPreviewBytes=Array.from(bytes);return bytes;}};});
  const buttons=await page.locator('#previewCard,#newCard,#copyCard,#deleteCard').evaluateAll(nodes=>nodes.map(node=>({id:node.id,parent:node.parentElement.className})));
  assert.equal(buttons.length,4);assert.equal(new Set(buttons.map(button=>button.parent)).size,1,'preview beside card create/copy/delete');
  await page.locator('#previewCard').click();await page.waitForSelector('#cardPreviewDialog[open]');
  await page.waitForFunction(()=>window.__qaPreviewBytes&&document.querySelector('#cardPreviewHost canvas'));
  const bytes=Buffer.from(await page.evaluate(()=>window.__qaPreviewBytes)),pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),1,'single-card preview contains exactly one card');
  const text=(await pdfText(page,bytes)).join(' ');assert(text.includes('QA-PREVIEW-UNSAVED'),'preview contains unsaved draft');
  assert(text.includes('GS4:1'),'preview shows selected private card code');
  assert.equal(await page.evaluate(async data=>await Proj2PDF.inspect(new Uint8Array(data)),Array.from(bytes)),null,'preview has no editable project attachment');
  const zoom=()=>page.locator('#previewZoomLevel').textContent(),initial=await zoom();
  await page.locator('#previewZoomIn').click();await page.waitForFunction(initial=>document.getElementById('previewZoomLevel').textContent!==initial,initial);
  const larger=await zoom();await page.locator('#previewZoomOut').click();await page.waitForFunction(larger=>document.getElementById('previewZoomLevel').textContent!==larger,larger);
  await page.locator('#previewZoomFit').click();await overflow(page);await page.locator('#closeCardPreview').click();await page.waitForSelector('#cardPreviewDialog[open]',{state:'hidden'});
  const after=await snap(page);assert.deepEqual(after.state,before.state,'preview never commits the draft');assert.deepEqual(after.draft,before.draft);assert.deepEqual(after.selectedIds,before.selectedIds);assert.equal(after.activeCode,before.activeCode);assert.equal(after.view.zoom,before.view.zoom,'card zoom does not change drawing zoom');assert.equal(after.dirty,true);assert.deepEqual(await persisted(page),stored,'preview does not change IndexedDB');
  console.log(device.name+': real one-card unsaved PDF preview, zoom/fit/close and no project mutation passed');
 }
 async function touchCheck(page,ctx,device,placement){
  if(!device.touch)return;
  await view(page,'drawing');await page.locator('#zoomFit').click();await idle(page);
  const scroller=await page.locator('#drawingHost .p2-canvas-scroller').boundingBox(),point={x:scroller.x+scroller.width/2,y:scroller.y+scroller.height/2},before=(await snap(page)).view.zoom,cdp=await ctx.newCDPSession(page),count=(await snap(page)).state.placements.length;
  try{
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x-25,y:point.y,id:71},{x:point.x+25,y:point.y,id:72}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-45,y:point.y,id:71},{x:point.x+45,y:point.y,id:72}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(page);assert((await snap(page)).view.zoom>before*1.15,'native two-finger pinch still zooms');
   await page.locator('#zoomFit').click();await idle(page);await select(page,placement.id);assert.equal((await snap(page)).activeCode,placement.code,'touch can reopen private card after zoom');
   await view(page,'drawing');await page.locator('#toolSelect').click();await idle(page);
   const box=await page.locator('#drawingHost [data-placement-id="'+placement.id+'"]').boundingBox(),position=(await snap(page)).state.placements.find(p=>p.id===placement.id),center={x:box.x+box.width/2,y:box.y+box.height/2};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...center,id:73}]});
   for(let n=1;n<=5;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x+n*3,y:center.y+n,id:73}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(({id,x})=>Math.abs(Proj2App.snapshot().state.placements.find(p=>p.id===id).x-x)>.005,{id:placement.id,x:position.x});
   assert.equal((await snap(page)).state.placements.length,count,'pinch and moving existing stamp add no extra stamps');
  }finally{await cdp.detach();}
 }
 async function run(browser,device){
  const ctx=await context(browser,device),page=await ctx.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await ctx.route('**/smartmatch-projektering-v2-store.js*',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,'smartmatch-projektering-v2-store.js'),'utf8')+'\n;(()=>{const api=Proj2Store;window.__qaSaveDelay=0;window.__qaSaving=false;window.Proj2Store={...api,save:async(...args)=>{const delay=window.__qaSaveDelay;if(delay){window.__qaSaving=true;await new Promise(resolve=>setTimeout(resolve,delay));}try{if(window.__qaFailSave){window.__qaFailSave=false;throw Error("Generated QA storage failure");}return await api.save(...args);}finally{window.__qaSaving=false;}}};})();'}));
  try{
   await page.goto(url());await ready(page);assert.equal(await page.evaluate(()=>Proj2App.version),'2.11');await header(page,device);
   await page.locator('#createBlankDrawing').click();await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===1);await idle(page);
   const first=await place(page,'GS4',.25,.30),second=await place(page,'GS4',.60,.30);
   await select(page,first.id);await view(page,'cards');
   for(const [row,product]of [['day-lock','310-50'],['day-cylinder-hinge','8882'],['closing-operator','ED100'],['closing-closer','DC700'],['closing-elbow','JCK207']])await fillProduct(page,row,product);
   await saveCard(page);const shared=(await snap(page)).state;
   await fillProduct(page,'day-lock','411-50 MA');await page.locator('#forkCard').click();await page.waitForSelector('#textDialog[open]');
   assert.equal(await page.locator('#textValue').inputValue(),'GS4:1','first private card uses numeric colon suffix');
   await page.locator('#textCancel').click();assert((await snap(page)).dirty);assert.deepEqual((await snap(page)).state.cards,shared.cards,'cancel private card keeps shared products');
   await page.locator('#forkCard').click();await page.waitForSelector('#textDialog[open]');await page.locator('#textAccept').click();await page.waitForFunction(()=>!!Proj2App.snapshot().state.cards['GS4:1']);
   let current=await snap(page);assert.equal(current.state.cards.GS4.rows.find(row=>row.id==='day-lock').product,'310-50');assert.equal(current.state.cards['GS4:1'].rows.find(row=>row.id==='day-lock').product,'411-50 MA');
   assert.equal(current.state.placements.find(p=>p.id===first.id).code,'GS4:1');assert.deepEqual(current.state.placements.find(p=>p.id===second.id),shared.placements.find(p=>p.id===second.id));
   assert.equal(await page.evaluate(()=>Proj2Data.suggestForkCode(Proj2App.snapshot().state,'GS4')),'GS4:2','numeric private codes advance');
   await qty(page,'day-cylinder-hinge').fill('2');await saveCard(page);
   await page.locator('#cardNote').fill('QA-PREVIEW-UNSAVED');await preview(page,device);await saveCard(page);
   const symbols=[];for(const [code,x]of [['DA',.20],['DA',.35],['DS',.50],['DFS',.65]])symbols.push(await place(page,code,x,.65));
   await counts(page,{markings:6,cards:2,doorAutomation:2,doorCloser:1,otherProducts:1});await header(page,device);
   current=await snap(page);assert.equal(Object.keys(current.state.cards).length,2,'symbols create no door cards');
   let materials=await report(page);assert(materials.rows.every(row=>row.sources.every(source=>source.kind==='card')),'every material comes from a door card');
   assert(!materials.rows.some(row=>['DA','DS','DFS'].includes(row.product)),'standalone symbols excluded from materials');
   for(const [name,amount]of [['310-50',1],['411-50 MA',1],['8882',3],['ED100',2],['DC700',2],['JCK207',4]])assert.equal(materials.rows.find(row=>row.product===name)?.quantity,amount,'card material '+name);
   assert.equal(materials.untimedRows,6);assert.equal(materials.hasEstimates,false);assert(materials.rows.every(row=>row.timePerUnit===null&&row.timeMinutes===null));
   await setRate(page,'ED100','90',90);await setRate(page,'8882','10',10);const zeroKey=await setRate(page,'310-50','0',0);await setRate(page,'411-50 MA','2,5',2.5);await setRate(page,'JCK207','1',1);
   materials=await report(page);assert.equal(materials.totalMinutes,216.5);assert.equal(materials.untimedRows,1);assert.equal(materials.rows.find(row=>row.product==='310-50').estimated,true,'explicit zero is an estimate');
   const totalLabel=await page.locator('#materialTotalTime').textContent();assert(totalLabel.includes('h'),'display includes total hours');assert(Math.abs(Number(totalLabel.replace('h','').trim().replace(',','.'))-216.5/60)<.011,'display hours agree with complete project minute sum');
   const zeroInput=await rateInput(page,'310-50');await zeroInput.input.fill('');await zeroInput.input.press('Tab');await page.waitForFunction(key=>!Object.hasOwn(Proj2App.snapshot().state.preferences.materialTimes,key),zeroKey);materials=await report(page);assert.equal(materials.rows.find(row=>row.product==='310-50').estimated,false,'blank removes explicit zero estimate');assert.equal(materials.untimedRows,2);await setRate(page,'310-50','0',0);
   await rapidRates(page,device);
   await failedRate(page,device);
   for(const invalid of ['-1','Infinity','NaN']){
    const {input,key}=await rateInput(page,'8882');const before=(await snap(page)).state.preferences.materialTimes;await input.fill(invalid);await input.press('Tab');
    await page.waitForFunction(({key})=>document.getElementById('appMessage').dataset.level==='error'||document.querySelector('[data-material-time]')?.validationMessage,{key});
    assert.deepEqual((await snap(page)).state.preferences.materialTimes,before,'invalid time never overwrites a saved rate: '+invalid);
   }
   await setRate(page,'8882','10',10);
   await setRate(page,'DC700','20',20);materials=await report(page);assert.equal(materials.totalMinutes,256.5);assert.equal(materials.untimedRows,0);
   const csv=await download(page,()=>page.locator('#materialCsv').click()),csvText=csv.bytes.toString('utf8');assert(csvText.includes('Tid/st (min)'));assert(csvText.includes('256,5'));assert(!csvText.includes('"DA"')&&!csvText.includes('"DS"')&&!csvText.includes('"DFS"'));
   const materialPdf=await download(page,()=>page.locator('#materialPdf').click()),materialText=(await pdfText(page,materialPdf.bytes)).join(' ');assert(materialText.includes('256,5'));assert(materialText.includes('ED100'));assert(!materialText.includes('PRODUKTOBJEKT'));
   const beforeFiles=(await snap(page)).state,json=await download(page,()=>clickMenuItem(page,'#saveProject')),portable=await download(page,()=>clickMenuItem(page,'#exportPdf'));
   const combined=await PDFDocument.load(portable.bytes);assert.equal(combined.getPageCount(),3,'combined PDF contains one plan and two cards, no symbol equipment pages');
   const combinedText=await pdfText(page,portable.bytes);assert(combinedText[0].includes('DA')&&combinedText[0].includes('DS')&&combinedText[0].includes('DFS'),'symbols remain on drawing PDF');assert(!combinedText.slice(1).some(text=>text.includes('Produktobjekt')),'no appended product-object pages');
   const cards=await download(page,()=>clickMenuItem(page,'#exportCards'));assert.equal((await PDFDocument.load(cards.bytes)).getPageCount(),2,'card-only PDF excludes product-object pages');
   const drawings=await download(page,()=>clickMenuItem(page,'#exportDrawing'));assert.equal((await PDFDocument.load(drawings.bytes)).getPageCount(),1);
   await page.locator('#projectFile').setInputFiles(upload(portable.bytes,'numeric-card-times.pdf'));await confirm(page);await idle(page);current=await snap(page);assert.deepEqual(current.state.cards,beforeFiles.cards);assert.deepEqual(current.state.placements,beforeFiles.placements);assert.deepEqual(current.state.preferences.materialTimes,beforeFiles.preferences.materialTimes);
   await page.locator('#projectFile').setInputFiles(upload(json.bytes,'numeric-card-times.json'));await confirm(page);await idle(page);assert.deepEqual((await snap(page)).state,beforeFiles);
   await page.reload();await ready(page);await idle(page);assert.deepEqual((await snap(page)).state,beforeFiles);assert.equal((await snap(page)).state.preferences.materialTimes[zeroKey],0,'zero estimate survives reload');
   await select(page,first.id);await view(page,'cards');await qty(page,'day-lock').fill('2');await saveCard(page);materials=await report(page);assert.equal(materials.rows.find(row=>row.product==='411-50 MA').quantity,2);assert.equal(materials.totalMinutes,259,'private quantity change updates full labor total');
   await touchCheck(page,ctx,device,{...first,code:'GS4:1'});await overflow(page);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.getItem('qa-other-workspace')),'preserve');
   await clickMenuItem(page,'#newProject');if(await page.locator('#confirmDialog[open]').count())await confirm(page);await page.waitForFunction(()=>Proj2App.snapshot().state.drawing.pages.length===0);
   assert.deepEqual((await snap(page)).state.preferences.materialTimes,{},'new project does not inherit another project labor estimates');
   await page.reload();await ready(page);assert.deepEqual((await snap(page)).state.preferences.materialTimes,{});assert.deepEqual(errors,[]);
   console.log(device.name+': header geometry, numeric private card/cancel, card-only material totals, symbols on plan/counters only, minutes/comma/zero/invalid/quantity math, CSV/PDF/JSON/reload and project-local reset passed');
  }catch(error){console.error(device.name+' 2.11 diagnostic:',await page.evaluate(()=>({message:document.getElementById('appMessage')?.textContent,view:window.Proj2App?.snapshot().view,dirty:window.Proj2App?.snapshot().dirty,materials:window.Proj2App?.snapshot().materials,openDialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id)})).catch(()=>({})));throw error;}
  finally{await ctx.close();}
 }
}
const body=scenario.toString(),injected=body.slice(body.indexOf('{')+1,body.lastIndexOf('}'));
const source=(base.slice(0,start)+injected+base.slice(end)).replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-11.html');
const child=new Module(fixturePath,module);child.filename=fixturePath;child.paths=module.paths;child._compile(source,fixturePath);
