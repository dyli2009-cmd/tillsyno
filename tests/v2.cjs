const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const drawing=require('./pdf-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',locale:'sv-SE'});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await context.route('https://cdnjs.cloudflare.com/**',route=>{const file=new URL(route.request().url()).pathname.split('/').pop();return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(process.env.PDFJS_DIR||'/tmp',file))})});
  await context.route('https://dorrservice.test/**',route=>{const file=new URL(route.request().url()).pathname.slice(1)||'index.html';return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(path.join(__dirname,'..',file))})});
  await page.goto('https://dorrservice.test/');assert.equal(await page.locator('#doorCount').textContent(),'0 dörrar');
  await page.locator('#file').setInputFiles({name:'skola.pdf',mimeType:'application/pdf',buffer:drawing()});await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent==='Sida 1 / 2');
  await page.locator('#settingsBtn').tap();
  for(const [id,value] of Object.entries({projectName:'Skola A',facilityNo:'216720-27',projectOrder:'AO-2026',technician:'Anna Andersson',company:'Serviceföretaget',serviceSignature:'AA',inspectionDate:'2026-10-03',projectNextDate:'2027-10-03'}))await page.locator('#'+id).fill(value);
  await page.screenshot({path:path.join(__dirname,'..','v2-project.png')});
  await page.locator('#navDrawing').tap();await page.locator('#mobileAdd').tap();await page.locator('#markers').tap({position:{x:100,y:180}});
  assert.equal(await page.locator('body').getAttribute('data-view'),'drawing');assert((await page.locator('#hint').textContent()).includes('Dra pilpunkten'));
  await page.locator('#markers .marker').last().tap();assert.equal(await page.locator('body').getAttribute('data-view'),'drawing');
  await page.waitForTimeout(950);await page.locator('#markers .marker').last().tap();assert.equal(await page.locator('body').getAttribute('data-view'),'protocol');
  await page.locator('#modelChoice').selectOption('17');
  assert.equal(await page.locator('#doorId').inputValue(),'216720-27-17-001');
  assert.equal(await page.locator('#signature').inputValue(),'AA');
  const sensor=page.locator('[data-check="1.11"]');await sensor.evaluate(el=>el.scrollIntoView({block:'center'}));await sensor.locator('[data-v=remark]').tap();await sensor.locator('.faultText').fill('Säkerhetssensorn fungerar inte.');
  await page.locator('#status').selectOption('fail');await page.locator('#navDrawing').tap();
  await page.locator('#mobileAdd').tap();await page.locator('#markers').tap({position:{x:240,y:260}});assert.equal(await page.locator('body').getAttribute('data-view'),'drawing');await page.locator('#markers .marker').last().tap();await page.locator('#modelChoice').selectOption('38');
  assert.equal(await page.locator('#doorId').inputValue(),'216720-27-38-002');
  await page.locator('#mobileOverview').tap();assert.equal(await page.locator('.doorCard').count(),2);
  for(const size of [{width:320,height:740},{width:390,height:844},{width:430,height:932}]){
   await page.setViewportSize(size);
   for(const view of ['doors','project','protocol']){
    await page.locator('#'+{doors:'mobileOverview',project:'settingsBtn',protocol:'mobileProtocol'}[view]).tap();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'No page horizontal overflow: '+view+' '+size.width);
    const overflow=await page.locator(view==='doors'?'#overviewDialog':view==='project'?'#projectPanel':'#protocolPanel').evaluate(el=>el.scrollWidth>el.clientWidth+1);
    assert.equal(overflow,false,'No horizontal scrolling in '+view);
   }
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#mobileOverview').tap();await page.screenshot({path:path.join(__dirname,'..','v2-doors.png')});
  // Duplicate IDs are rejected and manually chosen IDs remain editable.
  await page.locator('.doorCard').last().locator('button').tap();
  await page.locator('#doorId').fill('216720-27-17-001');await page.locator('#doorId').blur();assert((await page.locator('#idMessage').textContent()).includes('redan'));
  assert.equal(await page.locator('#doorId').inputValue(),'216720-27-38-002');
  await page.locator('#doorId').fill('216720-27-38-010');await page.locator('#doorId').blur();

  // PDF label text stays visibly larger and the arrow point keeps an enlarged touch target.
  assert(markerSource.includes("safeLabel.length>18?11.8:13.4"));
  // Exported drawing labels stay compact: object number + sequence, rectangular marker, no model name.
  // PDF Door label uses larger text while staying compact.
  assert(markerSource.includes("safeLabel.length>18?9.6:10.8"));

  const markerSource=await page.evaluate(()=>createWorkPdf.toString());
  assert(markerSource.includes("const label=[snapshot.project?.facilityNo?.trim(),serial]"));
  assert(markerSource.includes("page.drawRectangle"));
  assert(markerSource.includes("safeLabel.length>18?10.4:11.8"));
  assert(!markerSource.includes("snapshot.project?.facilityNo?.trim(),(d.modelCode||d.model||'').trim(),serial"));

  // Export is a genuine PDF with original vector drawing pages first.
  const downloadPromise=page.waitForEvent('download');await page.locator('#exportBtn').tap();const download=await downloadPromise;
  const workFile=path.join(__dirname,'..','v2-arbetsfil.pdf');await download.saveAs(workFile);const bytes=fs.readFileSync(workFile);
  const info=await page.evaluate(async data=>{
   const raw=new Uint8Array(data),decoded=await inspectWorkPdf(raw),document=await PDFLib.PDFDocument.load(raw),texts=[];
   const visible=await pdfjsLib.getDocument({data:raw.slice()}).promise;
   for(let i=1;i<=visible.numPages;i++){const p=await visible.getPage(i);texts.push((await p.getTextContent()).items.map(t=>t.str).join(' '))}
   await visible.destroy();return {pages:document.getPageCount(),sourcePages:(await PDFLib.PDFDocument.load(decoded.drawingBytes)).getPageCount(),state:decoded.work,texts};
  },Array.from(bytes));
  assert.equal(info.sourcePages,2);assert(info.pages>=5);assert.equal(info.state.doors.length,2);
  assert(info.texts[2].includes('ANMÄRKNINGSÖVERSIKT'));assert(info.texts[2].includes('Säkerhetssensorn fungerar inte.'));assert(!info.texts[2].includes('216720-27-38-010'));
  assert(info.texts.slice(3).join(' ').includes('216720-27-38-010'));assert(info.texts.slice(3).join(' ').includes('Anna Andersson'));assert(info.texts.slice(3).join(' ').includes('AA'));
  // Simulate the next technician: empty local storage, only the exported PDF.
  await page.evaluate(()=>localStorage.clear());await page.reload();assert.equal(await page.locator('#doorCount').textContent(),'0 dörrar');
  await page.locator('#file').setInputFiles({name:'arbetsfil.pdf',mimeType:'application/pdf',buffer:bytes});await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent==='Sida 1 / 2');
  assert(await page.locator('#doorOpenWorkDialog').isVisible());assert((await page.locator('#doorOpenWorkMeta').textContent()).includes('2 dörrar'));await page.locator('#doorOpenContinue').tap();
  await page.locator('#mobileOverview').tap();assert.equal(await page.locator('.doorCard').count(),2);assert((await page.locator('#overviewList').textContent()).includes('Säkerhetssensorn fungerar inte.'));
  await page.locator('#settingsBtn').tap();page.once('dialog',dialog=>dialog.accept());await page.locator('#newServiceBtn').tap();
  assert.equal(await page.locator('#technician').inputValue(),'Anna Andersson');assert.equal(await page.locator('#serviceSignature').inputValue(),'');assert.notEqual(await page.locator('#projectNextDate').inputValue(),'');
  await page.locator('#technician').fill('Bertil Berg');await page.locator('#serviceSignature').fill('BB');
  await page.locator('#mobileOverview').tap();await page.locator('.doorCard').first().locator('button').tap();assert(await page.locator('#previousPanel').isVisible());
  await page.locator('#previousPanel summary').tap();assert((await page.locator('#previousIssues').textContent()).includes('Säkerhetssensorn fungerar inte.'));
  assert.equal(await page.locator('.quickBtns button.active').count(),0);assert.equal(await page.locator('#signature').inputValue(),'BB');
  await page.screenshot({path:path.join(__dirname,'..','v2-protocol.png')});
  // A second export must not accumulate old report pages or old drawing markers.
  const nextBytes=await page.evaluate(async()=>Array.from(await createWorkPdf()));
  const reopened=await page.evaluate(async data=>{const result=await inspectWorkPdf(new Uint8Array(data));return {source:(await PDFLib.PDFDocument.load(result.drawingBytes)).getPageCount(),work:result.work}},nextBytes);
  assert.equal(reopened.source,2);assert.equal(reopened.work.project.technician,'Bertil Berg');assert.equal(reopened.work.doors[0].checks['1.11'].result,'');assert.equal(reopened.work.doors[0].previousIssues[0].n,'1.11');
  // Simplified Door form: shared project data is not duplicated per door.
  assert.equal(await page.locator('#generateId').count(),0);
  for(const id of ['modelCode','model','machineId','ao','nextDate'])assert.equal(await page.locator('#'+id).count(),0,'Removed redundant field: '+id);
  assert.equal(await page.locator('#location').count(),1,'Placement stays in the compact Door form');
  assert.deepEqual(errors,[]);
  console.log('PASS: 320/390/430px portrait layout, models/IDs, shared technician/signature, duplicates, real working PDF export, report order and fields, restoration without storage, next service and clean re-export');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});