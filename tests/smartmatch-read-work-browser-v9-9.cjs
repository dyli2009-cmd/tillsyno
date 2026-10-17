/* Reuse the existing GS/column/check fixtures, entering TEST 9.9 through its
 * explicit prepare action and its optional reread tool. Older tests stay fixed. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const file=path.resolve(__dirname,'smartmatch-read-work-browser-v9-4.cjs');let source=fs.readFileSync(file,'utf8');
function replace(before,after){assert(source.includes(before),'fixture adapter anchor missing: '+before);source=source.replaceAll(before,after)}
replace('smartmatch-read-test-v9-4.html','smartmatch-read-test-v9-9.html');
replace("page.locator('#pwFile')","page.locator('#rtMultiFiles')");
replace("assert.equal(await page.locator('#rtReadPhase').inputValue(),'codes')","await page.locator('#rtReadPhase').selectOption('codes')");
replace(" const action=page.locator('#pwReadContinueProducts');assert(await action.isVisible(),'product reading remains available after the first read');\n const pending=await page.evaluate(()=>SmartMatchReadTest.hasPendingProducts());assert.equal((await action.textContent()).trim(),pending?'Fortsätt med produkter':'Läs produkterna igen');", " const pending=await page.evaluate(()=>SmartMatchReadTest.hasPendingProducts());\n if(!pending)await press(page.locator('#pwToolMenuButton'),device);\n const action=page.locator(pending?'#pwReadContinueProducts':'#rtMenuProducts');assert(await action.isVisible(),'explicit product action is available');");
replace("await press(page.locator('#pwReadContinueProducts'),device);await page.waitForSelector('#rtDialog[open]');","await press(page.locator('#pwToolMenuButton'),device);await press(page.locator('#rtMenuProducts'),device);await page.waitForSelector('#rtDialog[open]');");
replace(`  await press(page.locator('.rtResult[data-card-id="'+card.id+'"] [data-adjust-card]'),device);`, `  await press(page.locator('.rtResult[data-card-id="'+card.id+'"] .rtReviewMore > summary'),device);\n  await press(page.locator('.rtResult[data-card-id="'+card.id+'"] [data-adjust-card]'),device);`);
const task=new Module(file,module);task.filename=file;task.paths=Module._nodeModulePaths(path.dirname(file));task._compile(source,file);
