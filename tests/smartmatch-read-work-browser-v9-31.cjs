/* Run the established grouped-work/persistence regression against TEST 9.31.
 * The adapter opens compact review details only when they are closed. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const file=path.resolve(__dirname,'smartmatch-read-work-browser-v9-4.cjs');
let source=fs.readFileSync(file,'utf8');
function replace(before,after){assert(source.includes(before),'fixture adapter anchor missing: '+before);source=source.replaceAll(before,after)}
replace('smartmatch-read-test-v9-4.html','smartmatch-read-test-v9-31.html');
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
const task=new Module(file,module);task.filename=file;task.paths=Module._nodeModulePaths(path.dirname(file));task._compile(source,file);
