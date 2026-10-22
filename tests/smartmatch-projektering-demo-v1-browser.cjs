'use strict';
// Generated example projects only. The real page and unchanged module guard run;
// only the authentication client is substituted for these local browser checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const root = path.resolve(__dirname, '..');
const entry = 'smartmatch-projektering-demo-v1.html';
const key = 'tillsyno-projektering-demo-v1';
const devices = [
  {name:'desktop',width:1366,height:900},
  {name:'ipad',width:834,height:1194,touch:true},
  {name:'iphone',width:390,height:844,touch:true}
].filter(d => !process.env.PROJECTION_DEVICE || d.name === process.env.PROJECTION_DEVICE);
const server = http.createServer((req, res) => {
  const file = path.resolve(root, decodeURIComponent(new URL(req.url, 'http://local').pathname).slice(1));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  try {
    const type = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.pdf':'application/pdf'}[path.extname(file)];
    res.setHeader('Content-Type', type || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch (_) {res.writeHead(404);res.end();}
});
const url = () => `http://127.0.0.1:${server.address().port}/${entry}`;
async function contextFor(browser, device, modules=['smartmatch']) {
  const ctx = await browser.newContext({
    viewport:{width:device.width,height:device.height},hasTouch:!!device.touch,
    isMobile:!!device.touch,acceptDownloads:true
  });
  await ctx.route('**/auth/client.js*', route => route.fulfill({
    contentType:'application/javascript',
    body:`window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',email:'generated-test@example.invalid',modules:${JSON.stringify(modules)}}),permitted:(a,m)=>!m||a.modules.includes(m)};`
  }));
  await ctx.addInitScript(() => { if (localStorage.getItem('qa-unrelated-module') === null) localStorage.setItem('qa-unrelated-module', 'keep-existing-work'); });
  return ctx;
}
const stored = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), key);
async function download(page, action) {
  const waiting = page.waitForEvent('download');
  await action();
  const file = await waiting;
  return {name:file.suggestedFilename(),bytes:fs.readFileSync(await file.path())};
}
async function confirmIfOpen(page) {
  if (await page.locator('#confirmDialog[open]').count()) await page.locator('#confirmAccept').click();
}
async function noOverflow(page) {
  const result = await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(result.scroll <= result.width + 1, 'page must fit the viewport: ' + JSON.stringify(result));
}
const snapshot = page => page.evaluate(() => window.ProjApp.snapshot());
async function view(page, name) {
  const tab = page.locator(`button[data-view="${name}"]`);
  if (await tab.isVisible()) await tab.click();
}
async function selectDoor(page, id) {
  await view(page, 'drawing');
  await page.locator('#doorSelect').selectOption(id);
  await page.waitForFunction(id => ProjApp.snapshot().selectedDoor === id, id);
}
async function saveCard(page) {
  await page.locator('#saveCard').click();
  await page.waitForFunction(() => !ProjApp.snapshot().dirty);
}
const rowProduct = (page, id) => page.locator(`#cardRows [data-action="choose-product"][data-row-id="${id}"]`);
async function changeProjectName(page, name) {
  await page.locator('#projectName').fill(name);
  await page.locator('#projectName').dispatchEvent('change');
  await page.waitForFunction(name => ProjApp.snapshot().project.project.name === name, name);
}
async function importProject(page, bytes, name) {
  await page.locator('#projectFile').setInputFiles({name,mimeType:name.endsWith('.pdf')?'application/pdf':'application/json',buffer:bytes});
  await page.waitForSelector('#confirmDialog[open]');
  await page.locator('#confirmAccept').click();
  await page.waitForSelector('#confirmDialog[open]', {state:'hidden'});
}
async function run(browser, device) {
  const ctx = await contextFor(browser, device);
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  try {
    await page.goto(url());
    await page.waitForSelector('#drawingHost svg');
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-auth-pending'));
    await noOverflow(page);
    assert.equal(await page.locator('#tillsynoAccessDenied').count(), 0);
    const initial = (await snapshot(page)).project;
    assert.equal(initial.doors.length, 50);
    assert.equal(await page.locator('#drawingHost [data-door-id]').count(), 50);
    const sharing = initial.doors.filter(door => door.code === 'GS1');
    assert(sharing.length >= 2, 'the example must demonstrate more than one GS1 door');
    const savedGS2 = initial.cards.GS2;
    const pointerDoor = initial.doors.find(door => door.code === 'GS2');
    const pointerStamp = page.locator(`#drawingHost [data-door-id="${pointerDoor.id}"]`);
    if (device.touch) await pointerStamp.tap(); else await pointerStamp.click();
    await page.waitForFunction(id => ProjApp.snapshot().selectedDoor === id, pointerDoor.id);
    await view(page, 'drawing');
    await page.locator(`#drawingHost [data-door-id="${sharing[0].id}"]`).focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(id => ProjApp.snapshot().selectedDoor === id, sharing[0].id);
    await selectDoor(page, sharing[0].id);
    await view(page, 'card');
    await rowProduct(page, 'day-lock').click();
    await page.waitForSelector('#productDialog[open]');
    assert.equal(await page.locator('#productSearch').evaluate(node => node === document.activeElement), true);
    await page.locator('#productSearch').fill('511-50');
    assert.equal(await page.locator('#productList [data-product-id]').count(), 1);
    await page.locator('#productList [data-product-id="lock-511-50"]').click();
    let state = await snapshot(page);
    assert.equal(state.draft.rows.find(row => row.id === 'day-lock').product, '511-50');
    assert.equal(state.project.cards.GS1.rows.find(row => row.id === 'day-lock').product, initial.cards.GS1.rows.find(row => row.id === 'day-lock').product, 'choosing a product edits the draft until explicit saving');
    await page.locator('#cardRows input[data-row-id="day-lock"][data-field="quantity"]').fill('2');
    await saveCard(page);
    assert.equal((await stored(page)).cards.GS1.rows.find(row => row.id === 'day-lock').quantity, 2);
    await selectDoor(page, sharing[1].id);
    await view(page, 'card');
    assert((await rowProduct(page, 'day-lock').innerText()).includes('511-50'), 'a second physical GS1 door opens the same saved card');
    assert.deepEqual((await snapshot(page)).project.cards.GS2, savedGS2, 'saving GS1 must not alter GS2');

    // Draft cancellation/discard must not overwrite the shared saved card.
    const savedNote = (await snapshot(page)).project.cards.GS1.note;
    await page.locator('#cardNote').fill('Unsaved draft must not become the saved card');
    await view(page, 'drawing');
    await page.locator('#doorSelect').selectOption(sharing[0].id);
    await page.waitForSelector('#confirmDialog[open]');
    await page.locator('#confirmCancel').click();
    state = await snapshot(page);
    assert.equal(state.selectedDoor, sharing[1].id);
    assert.equal(state.dirty, true);
    assert.equal((await stored(page)).cards.GS1.note, savedNote);
    await page.locator('#doorSelect').selectOption(sharing[0].id);
    await page.waitForSelector('#confirmDialog[open]');
    await page.locator('#confirmDiscard').click();
    await page.waitForFunction(id => ProjApp.snapshot().selectedDoor === id, sharing[0].id);
    state = await snapshot(page);
    assert.equal(state.dirty, false);
    assert.equal(state.draft.note, savedNote);

    // Searches are scoped to the equipment row's category.
    await view(page, 'card');
    await rowProduct(page, 'closing-sensor-hinge').click();
    await page.locator('#productSearch').fill('511');
    assert.equal(await page.locator('#productList [data-product-id]').count(), 0);
    await page.locator('#productSearch').fill('Flatscan');
    await page.locator('#productList [data-product-id="sensor-flatscan"]').click();
    await saveCard(page);

    // An own product remains plain text in catalogue and card rendering.
    const customName = 'QA <img src=x onerror=window.__projectionXSS=1>';
    await rowProduct(page, 'day-lock').click();
    await page.locator('#customProductName').fill(customName);
    await page.locator('#addProduct').click();
    await page.waitForSelector('#productDialog[open]', {state:'hidden'});
    assert.equal(await page.locator('#cardRows img').count(), 0);
    assert.equal(await page.evaluate(() => window.__projectionXSS || 0), 0);
    assert.equal((await snapshot(page)).draft.rows.find(row => row.id === 'day-lock').product, customName);
    await saveCard(page);
    await rowProduct(page, 'day-lock').click();
    await page.locator('#productSearch').fill('QA');
    assert.equal(await page.locator('#productList [data-product-id]').count(), 1);
    assert.equal(await page.locator('#productList img').count(), 0);
    await page.locator('#closeProduct').click();

    // The stamp library reaches GS100 and can create and place a small square.
    await view(page, 'library');
    await page.locator('#stampSearch').fill('GS100');
    assert.equal(await page.locator('#stampList [data-code]').count(), 1);
    assert.equal(await page.locator('#stampList [data-code="GS100"]').count(), 1);
    await page.locator('#stampSearch').fill('');
    assert((await page.locator('#stampList [data-code]').count()) >= 106);
    await page.locator('#customCode').fill('qa-42');
    await page.locator('#stampShape').selectOption('square');
    await page.locator('#createStamp').click();
    await page.waitForFunction(() => ProjApp.snapshot().activeCode === 'QA-42');
    assert.equal((await stored(page)).cards['QA-42'].shape, 'square');
    await view(page, 'drawing');
    await page.locator('#applyStamp').click();
    await page.waitForFunction(() => ProjApp.snapshot().project.doors.find(door => door.id === ProjApp.snapshot().selectedDoor).code === 'QA-42');
    state = await snapshot(page);
    assert.equal(state.project.doors.length, 50);
    assert.equal(await page.locator(`#drawingHost [data-door-id="${state.selectedDoor}"]>rect:not(.stamp-touch)`).count(), 1);

    // JSON and PDF downloads must reopen the same saved state.
    const projectFile = await download(page, () => page.locator('#saveProject').click());
    const exported = JSON.parse(projectFile.bytes.toString());
    assert.deepEqual(exported, (await snapshot(page)).project);
    const pdfFile = await download(page, () => page.locator('#exportPdf').click());
    assert.equal(pdfFile.bytes.subarray(0,5).toString(), '%PDF-');
    await changeProjectName(page, 'Temporary name before JSON reopening');
    await importProject(page, projectFile.bytes, 'generated-project.json');
    assert.deepEqual((await snapshot(page)).project, exported);
    await changeProjectName(page, 'Temporary name before PDF reopening');
    await importProject(page, pdfFile.bytes, 'generated-project.pdf');
    assert.deepEqual((await snapshot(page)).project, exported);

    const beforeInvalid = await stored(page);
    const invalid = {...exported, doors:[]};
    await page.locator('#projectFile').setInputFiles({name:'invalid-empty-project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
    await page.waitForFunction(() => document.getElementById('appMessage').dataset.level === 'error');
    assert.equal(await page.locator('#confirmDialog[open]').count(), 0);
    assert.deepEqual(await stored(page), beforeInvalid, 'invalid import cannot replace the persistent project');
    assert.deepEqual((await snapshot(page)).project, beforeInvalid);

    await page.reload();
    await page.waitForFunction(() => !!window.ProjApp);
    assert.deepEqual((await snapshot(page)).project, exported, 'reload must restore shared cards, custom products and stamp assignments');
    await page.locator('#help').click();
    await page.waitForSelector('#helpDialog[open]');
    assert.equal(await page.locator('#helpDialog .guide-steps li').count(), 5);
    await page.locator('#helpDialog button').last().click();
    await page.waitForSelector('#helpDialog[open]', {state:'hidden'});
    await noOverflow(page);
    assert.equal(await page.evaluate(() => localStorage.getItem('qa-unrelated-module')), 'keep-existing-work');
    if (device.name === 'desktop') {
      // Real import/edit controls must preserve responsibility text beyond the
      // quick-pick list, and a failed browser save cannot claim a committed edit.
      const exactOwners = JSON.parse(JSON.stringify(exported));
      exactOwners.cards.GS1.rows.find(row => row.id === 'day-lock').delivery = 'Best/GS';
      await importProject(page, Buffer.from(JSON.stringify(exactOwners)), 'generated-exact-owners.json');
      const gs1Door = exactOwners.doors.find(door => door.code === 'GS1');
      await selectDoor(page, gs1Door.id);
      await view(page, 'card');
      assert.equal(await page.locator('#cardRows select[data-row-id="day-lock"][data-field="delivery"]').inputValue(), 'Best/GS');
      const beforeFailure = (await snapshot(page)).project;
      await page.locator('#cardNote').fill('Retain this draft when browser storage fails');
      await page.evaluate(k => {
        window.__projectionOriginalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(name, value) {
          if (name === k) throw new DOMException('Simulated storage quota failure', 'QuotaExceededError');
          return window.__projectionOriginalSetItem.call(this, name, value);
        };
      }, key);
      await page.locator('#saveCard').click();
      await page.waitForFunction(() => document.getElementById('appMessage').dataset.level === 'error');
      assert.deepEqual((await snapshot(page)).project, beforeFailure, 'failed storage write leaves the committed project intact');
      assert.deepEqual(await stored(page), beforeFailure, 'failed storage write leaves the persistent project intact');
      assert.equal((await snapshot(page)).dirty, true, 'failed save retains the editable draft');
      await page.evaluate(() => {Storage.prototype.setItem = window.__projectionOriginalSetItem;});
      await saveCard(page);
      assert.equal((await stored(page)).cards.GS1.rows.find(row => row.id === 'day-lock').delivery, 'Best/GS');
      assert.equal((await stored(page)).cards.GS1.note, 'Retain this draft when browser storage fails');
    }
    if (process.env.PROJECTION_SCREENSHOTS) {
      fs.mkdirSync(path.join(root, 'work/projektering-qa'), {recursive:true});
      await page.screenshot({path:path.join(root, 'work/projektering-qa', device.name+'.png'),fullPage:true});
    }
    assert.deepEqual(errors, []);
    console.log(device.name + ': shared saved cards, explicit drafts, category lookup, own products/stamps, JSON/PDF reopening, invalid-import protection and responsive guide passed');
  } finally {await ctx.close();}
}
async function denied(browser) {
  const ctx = await contextFor(browser, devices[0], ['control']);
  try {
    const page = await ctx.newPage();
    await page.goto(url());
    await page.waitForSelector('#tillsynoAccessDenied');
    assert((await page.locator('#tillsynoAccessDenied').innerText()).includes('Åtkomst saknas'));
    assert.equal(await page.evaluate(() => !!window.TillsynoCurrentAccess), false);
    console.log('control-only account: SmartMatch access denied by unchanged guard');
  } finally {await ctx.close();}
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try {for (const device of devices) await run(browser, device); await denied(browser);}
  finally {await browser.close();await new Promise(resolve => server.close(resolve));}
})().catch(error => {console.error(error);process.exitCode=1;});
