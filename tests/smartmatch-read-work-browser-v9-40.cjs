/* Run the established grouped-work/persistence regression against TEST 9.40.
 * The adapter opens compact review details only when they are closed. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const file=path.resolve(__dirname,'smartmatch-read-work-browser-v9-4.cjs');
let source=fs.readFileSync(file,'utf8');
function replace(before,after){assert(source.includes(before),'fixture adapter anchor missing: '+before);source=source.replaceAll(before,after)}
replace('smartmatch-read-test-v9-4.html','smartmatch-read-test-v9-40.html');
replace("page.locator('#pwFile')","page.locator('#rtMultiFiles')");
replace("assert.equal(await page.locator('#rtReadPhase').inputValue(),'codes')","await page.locator('#rtReadPhase').selectOption('codes')");
replace(" const action=page.locator('#pwReadContinueProducts');assert(await action.isVisible(),'product reading remains available after the first read');\n const pending=await page.evaluate(()=>SmartMatchReadTest.hasPendingProducts());assert.equal((await action.textContent()).trim(),pending?'Fortsätt med produkter':'Läs produkterna igen');", " const pending=await page.evaluate(()=>SmartMatchReadTest.hasPendingProducts());\n if(!pending)await press(page.locator('#pwToolMenuButton'),device);\n const action=page.locator(pending?'#pwReadContinueProducts':'#rtMenuProducts');assert(await action.isVisible(),'explicit product action is available');");
replace("await press(page.locator('#pwReadContinueProducts'),device);await page.waitForSelector('#rtDialog[open]');","await press(page.locator('#pwToolMenuButton'),device);await press(page.locator('#rtMenuProducts'),device);await page.waitForSelector('#rtDialog[open]');");
replace(`  await press(page.locator('.rtResult[data-card-id="'+card.id+'"] [data-adjust-card]'),device);`, `  const reviewMore=page.locator('.rtResult[data-card-id="'+card.id+'"] .rtReviewMore');
  if(!(await reviewMore.evaluate(node=>node.open)))await press(reviewMore.locator('> summary'),device);
  await press(page.locator('.rtResult[data-card-id="'+card.id+'"] [data-adjust-card]'),device);`);
replace("#pwChecklist .rtWorkSection').evaluateAll(nodes=>nodes.map(node=>({heading:node.querySelector('h3.rtWorkSectionTitle')?.textContent,values:[...node.querySelectorAll('label.rtWorkRow span.rtWorkValue')].map(span=>span.textContent)})))", "#pwChecklist .rtWorkSection').evaluateAll(nodes=>nodes.map(node=>({heading:node.querySelector('h3.rtWorkSectionTitle')?.textContent,values:[...node.querySelectorAll('.pwCheckContent small')].map(span=>span.textContent)})))");
replace('#pwChecklist .rtWorkRow span.rtWorkValue','#pwChecklist .pwCheckContent small');
replace('#pwChecklist .rtWorkRow input','#pwChecklist .pwCheckRow input');
replace('.rtWorkSection[data-section-key="daglasning"] .rtWorkRow input','.rtWorkSection[data-section-key="daglasning"] .pwCheckRow input');
replace('.rtWorkSection[data-section-key="nattlasning"] .rtWorkRow input','.rtWorkSection[data-section-key="nattlasning"] .pwCheckRow input');
replace("document.getElementById('pwChecklistMeta').textContent==='1 av 8 klara'","document.getElementById('pwChecklistMeta').textContent==='1 / 8 klara'");
replace("for(const card of Object.values(read.cards)){assert.deepEqual(card.work,values);", "for(const card of Object.values(read.cards)){assert(card.products.some(item=>item.value==='EL999'&&item.responsibility==='DT'),'DT product persists in inventory');assert.deepEqual(card.work,values);");
replace("const data=await projectData(portable);assert.deepEqual(data.readTestData.matching,links);", "const data=await projectData(portable);assert(Object.values(data.readTestData.cards).every(card=>card.products.some(item=>item.value==='EL999')),'inventory survives PDF export');assert.deepEqual(data.readTestData.matching,links);");
replace("await openPosition(reopened,chosenId);await assertGroups(reopened,device,'reopened');", "await openPosition(reopened,chosenId);await assertGroups(reopened,device,'reopened');assert.equal(await reopened.locator('.rtProductInventory').count(),1);assert.match(await reopened.locator('.rtProductInventory').textContent(),/EL999/);");
replace("await page.locator('#rtImageMode').selectOption('text');", "await page.locator('.rtAdvanced').first().evaluate(el=>el.open=true);await page.locator('#rtImageMode').selectOption('text');");
replace("['El-lås','EL999','GS','DT']", "['El-lås','EL999','DT','DT']");
replace("['Ej beställt','EMPTY999','GS','']", "['Ej beställt','EMPTY999','DT','']");
replace("['Extra lås','NO999','GS','DT']", "['Extra lås','NO999','DT','DT']");
replace("['Läsare','DT999','GS','DT']", "['Läsare','DT999','DT','DT']");
replace("['Dörrstängare','DC700','DT','GS']", "['Dörrstängare','DC700','GS','DT']");
replace("assert.deepEqual(card.work,values);", "assert.deepEqual(card.work,values);assert(card.products.some(item=>item.value==='DC700'&&item.delivery==='GS'&&item.installer==='DT'),'GS delivery alone creates DC700 check');");
replace('{x:.04,y:.16,w:.61,h:.64}', '{x:.04,y:.16,w:.48,h:.64}');
replace("async function ready(page){", "async function ready(page){");
replace("await ready(page);", `await ready(page);
 if(device.name==='desktop'){
  await page.waitForFunction(()=>!document.getElementById('pwDrawingDetail').hidden);
  const qa=await page.evaluate(()=>window.__runDrawingQA());
  assert(qa.retained,'desktop retains finished sharp pixels during navigation');
  assert.equal(qa.overviewCalls,0,'desktop zoom reuses page overview instead of rendering whole PDF again');
  assert(qa.finished,'replacement sharp detail commits');assert.deepEqual(qa.before,qa.after);
 }
`);
replace(" return context;", " await context.route('**/smartmatch-read-test-main-v9-40.js*',route=>{const body=fs.readFileSync(path.join(root,'smartmatch-read-test-main-v9-40.js'),'utf8');const end=body.lastIndexOf('})();');return route.fulfill({contentType:'application/javascript',body:body.slice(0,end)+\"window.__runDrawingQA=async()=>{\\n   const originalScale=scale,pg=await pdf.getPage(page),originalRender=pg.render.bind(pg),calls=[];\\n   pg.render=options=>{calls.push({width:options.canvasContext.canvas.width,height:options.canvasContext.canvas.height});return originalRender(options)};\\n   const before={width:el.canvas.width,height:el.canvas.height};\\n   clearDrawingDetail();const retained=!drawingDetailCanvas.hidden&&drawingDetailCanvas.width>0;\\n   scale=originalScale*1.2;await renderDrawing();\\n   const overviewCalls=calls.length;\\n   await renderDrawingDetail();\\n   const finished=!drawingDetailCanvas.hidden;\\n   pg.render=originalRender;scale=originalScale;await renderDrawing();\\n   return {retained,overviewCalls,finished,before,after:{width:el.canvas.width,height:el.canvas.height}};\\n  };\\n\"+body.slice(end)});});\n return context;");

replace("  const reviewMore=page.locator", "  await page.locator('.rtResult[data-card-id=\"'+card.id+'\"] .rtCardFold').evaluate(el=>el.open=true);\n  const reviewMore=page.locator");
replace("await page.locator('#rtMatchApproval').check();", `
  assert.equal(await page.locator('dialog:modal').count(),0,'reader is an embedded workspace view');assert.equal(await page.locator('.rtCardFold[open]').count(),0,'read cards start collapsed');
  assert(await page.locator('.rtCompactResult[data-review-state="ready"]').count()>0,'ready cards carry green status');
  if(device.name==='desktop'){
   const splitter=page.locator('.rtSplitter');await splitter.focus();const initial=await splitter.getAttribute('aria-valuenow');await page.keyboard.press('ArrowLeft');assert.notEqual(await splitter.getAttribute('aria-valuenow'),initial,'splitter resizes panes');const sb=await splitter.boundingBox();await page.mouse.move(sb.x+sb.width/2,sb.y+40);await page.mouse.down();await page.mouse.move(sb.x-55,sb.y+40,{steps:5});await page.mouse.up();assert(Number(await splitter.getAttribute('aria-valuenow'))<Number(initial)-3,'pointer drag resizes original');await page.waitForFunction(()=>{const c=document.getElementById('rtCanvas');return c.width>0&&c.getContext('2d').getImageData(5,5,1,1).data[0]>200;});await page.screenshot({path:'/tmp/review936.png'});
  }
  await page.locator('#rtMatchApproval').check();`);
replace("await openPosition(next,chosenId);await assertGroups(next,device,'groups');", `await openPosition(next,chosenId);await assertGroups(next,device,'groups');
  await press(next.locator('#pwCardViewArea'),device);await next.waitForSelector('.rtCardViewDialog');
  await next.waitForFunction(()=>!document.querySelector('.rtCardViewDialog [data-save]').disabled);
  if(device.name==='desktop'){const box=await next.locator('.rtCardViewBox').boundingBox();await next.mouse.move(box.x+box.width*.1,box.y+box.height*.1);await next.mouse.down();await next.mouse.move(box.x+box.width*.8,box.y+box.height*.85,{steps:6});await next.mouse.up();assert(Number(await next.getByRole('spinbutton',{name:'Bredd %',exact:true}).inputValue())>60,'pointer crop selects an area');await next.screenshot({path:'/tmp/crop936.png'});}
  for(const [label,value]of [['Vänster %','5'],['Överkant %','5'],['Bredd %','90'],['Höjd %','85']])await next.getByRole('spinbutton',{name:label,exact:true}).fill(value);
  await press(next.locator('.rtCardViewDialog [data-save]'),device);await next.waitForSelector('.rtCardViewDialog',{state:'detached'});
  assert.equal(await next.locator('dialog:modal').count(),0,'nested crop never uses modal layer');assert(await next.locator('#pwProtocol').isVisible(),'parent workspace restored after crop');
  const cropped=await next.evaluate(()=>{return SmartMatchReadTest.payload().projectDisplayBounds;});
  assert.deepEqual(cropped,{x:.05,y:.05,w:.9,h:.85},'user crop saved separately');
`);
replace("assert.equal(await reopened.locator('.rtProductInventory').count(),1);", `assert.equal(await reopened.locator('.rtProductInventory').count(),1);
 assert(await reopened.evaluate(()=>SmartMatchReadTest.payload().projectDisplayBounds?.h===.85),'crop persists through reread and PDF export/reopen');
 await press(reopened.locator('#pwCardViewArea'),device);await reopened.waitForSelector('.rtCardViewDialog');await press(reopened.locator('.rtCardViewDialog [data-cancel]'),device);await reopened.waitForSelector('.rtCardViewDialog',{state:'detached'});
 assert(await reopened.evaluate(()=>SmartMatchReadTest.payload().projectDisplayBounds?.h===.85),'cancel preserves crop');
 await press(reopened.locator('#pwCardViewArea'),device);await reopened.waitForSelector('.rtCardViewDialog');await press(reopened.locator('.rtCardViewDialog [data-reset]'),device);await reopened.waitForSelector('.rtCardViewDialog',{state:'detached'});
 assert.deepEqual(await reopened.evaluate(()=>SmartMatchReadTest.payload().projectDisplayBounds),{x:0,y:0,w:1,h:1},'reset restores full original across project');
`);
replace("assert(layout.scroll<=layout.client+2,", "if(layout.scroll>layout.client+2){console.log('overflow',layout,await page.locator('.pwChecklistPane').evaluate(root=>[...root.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>root.getBoundingClientRect().right+2).map(el=>({tag:el.tagName,id:el.id,cls:el.className,w:el.clientWidth,text:el.textContent.slice(0,60)}))));await page.screenshot({path:'/tmp/overflow936.png'});}assert(layout.scroll<=layout.client+2,");
replace("await assertGroups(reopened,device,'reopened');", "await assertGroups(reopened,device,'reopened');{const materials=await reopened.evaluate(()=>SmartMatchAppBridge.getProjectMaterials());assert(materials.some(row=>row.name==='DC700'),'GS delivery enters material list');assert(!materials.some(row=>['EL999','DT999','NO999','EMPTY999'].includes(row.name)),'other installers excluded from GS material list');}");
const task=new Module(file,module);task.filename=file;task.paths=Module._nodeModulePaths(path.dirname(file));task._compile(source,file);
