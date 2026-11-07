const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const fixtureHash=require('node:crypto').createHash('sha256').update(Buffer.from([1])).digest('hex');
const fixtures=[
 {uid:'one',id:'D1',page:1,status:'ok',checks:{},x:.2,y:.2},
 {uid:'two',id:'D2',page:2,status:'untested',location:'Entré',machineId:'M123',checks:{'1.11':{result:'remark',note:'Säkerhetssensor trasig'},'1.2':{result:'remark',note:''}},x:.3,y:.3},
 {uid:'three',id:'D3',page:1,status:'action',notes:'Justera dörrstängare',checks:{},x:.4,y:.4},
 {uid:'four',id:'D4',page:1,status:'fail',checks:{},x:.5,y:.5},
 {uid:'five',id:'D5',page:1,status:'untested',checks:{},x:.6,y:.6},
 {uid:'six',id:'D6',page:2,status:'ok',location:'<script>window.injected=true</script>',checks:{'1.1':{result:'remark',note:'<img src=x onerror="window.injected=true">'}},x:.7,y:.7}
];
const pdfStub="window.pdfjsLib={GlobalWorkerOptions:{},getDocument:()=>({promise:Promise.resolve({numPages:2,destroy:async()=>{},getPage:async()=>({getViewport:({scale})=>({width:1000*scale,height:1500*scale}),render:()=>({promise:Promise.resolve(),cancel(){}})})})})};";
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({hash,data})=>{const key='doorservice-drawing-v1:'+hash;if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,doors:data,project:{},logoData:''}))},{hash:fixtureHash,data:fixtures});
  await page.route('https://cdnjs.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:route.request().url().includes('pdf.min.js')?pdfStub:'window.jspdf={};'}));
  await page.route('https://dorrservice.test/**',route=>{const file=new URL(route.request().url()).pathname.slice(1)||'index.html';return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(path.join(__dirname,'..',file))})});
  await page.goto('https://dorrservice.test/');
  await page.locator('#file').setInputFiles({name:'ritning.pdf',mimeType:'application/pdf',buffer:Buffer.from([1])});
  await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent==='Sida 1 / 2');
  await page.locator('#mobileOverview').tap();
  assert.equal(await page.locator('#overviewSummary').textContent(),'4 av 6 dörrar har problem');
  assert.equal(await page.locator('.overviewRow').count(),4);
  assert((await page.locator('[data-uid="two"]').textContent()).includes('Fel markerat, beskrivning saknas'));
  assert((await page.locator('[data-uid="three"]').textContent()).includes('Justera dörrstängare'));
  assert.equal(await page.locator('#overviewList script,#overviewList img').count(),0);
  assert.equal(await page.evaluate(()=>window.injected),undefined);
  // A finger gesture scrolls the list itself, with its close button still accessible.
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:340,y:690}]});
  for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:340,y:690-40*i}]});await page.waitForTimeout(16)}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(250);
  assert(await page.locator('#overviewDialog').evaluate(el=>el.scrollTop>0));
  await page.locator('#closeOverview').tap();await page.locator('#mobileOverview').tap();
  await page.locator('#overviewSearch').fill('säkerhetssensor');
  assert.equal(await page.locator('.overviewRow').count(),1);
  await page.locator('#overviewSearch').fill('finns inte');
  assert((await page.locator('#overviewList').textContent()).includes('Inga dörrar matchar'));
  await page.locator('#overviewSearch').fill('');
  await page.locator('#overviewFilter').selectOption('all');assert.equal(await page.locator('.overviewRow').count(),6);
  await page.locator('#overviewFilter').selectOption('untested');assert.equal(await page.locator('.overviewRow').count(),2);
  await page.locator('#overviewFilter').selectOption('ok');assert.equal(await page.locator('.overviewRow').count(),1);
  await page.locator('#overviewFilter').selectOption('problems');
  await page.locator('[data-uid="two"] [data-field="remediationDate"]').fill('2026-10-03');
  await page.locator('[data-uid="two"] [data-field="remediationSignature"]').fill('AB');
  assert.equal(await page.locator('[data-uid="two"] [data-field="remediationSignature"]').inputValue(),'AB');
  await page.locator('[data-uid="two"] button').tap();
  assert.equal(await page.locator('#overviewDialog').evaluate(el=>el.open),false);
  assert.equal(await page.locator('#formTitle').textContent(),'D2 – Sida 2');
  await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent==='Sida 2 / 2');
  // Fix both recorded faults; the overview should no longer include this door.
  for(const index of [1,10]){
   const row=page.locator('.checkrow').nth(index);await row.evaluate(el=>el.scrollIntoView({block:'center'}));await row.locator('[data-v="ok"]').tap();
  }
  await page.locator('#closeProtocol').tap();await page.locator('#mobileOverview').tap();
  assert.equal(await page.locator('.overviewRow').count(),3);
  assert.equal(await page.locator('[data-uid="two"]').count(),0);
  // Navigation from an overview card switches the PDF page and opens its form.
  await page.locator('#closeOverview').tap();
  await page.locator('#file').setInputFiles({name:'ritning.pdf',mimeType:'application/pdf',buffer:Buffer.from([1])});
  await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent==='Sida 1 / 2');
  await page.locator('#mobileOverview').tap();await page.locator('[data-uid="six"] button').tap();
  await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent==='Sida 2 / 2');
  assert.equal(await page.locator('#formTitle').textContent(),'D6 – Sida 2');
  assert(await page.locator('#protocolPanel').isVisible());
  await page.locator('#closeProtocol').tap();await page.locator('#mobileOverview').tap();
  await page.screenshot({path:path.join(__dirname,'..','overview-preview.png')});
  // Reopening after a reload reflects saved checklist changes, not a separate copy.
  await page.waitForTimeout(300);await page.reload();
  assert.equal(await page.locator('#doorCount').textContent(),'0 dörrar');
  await page.locator('#file').setInputFiles({name:'ritning.pdf',mimeType:'application/pdf',buffer:Buffer.from([1])});
  await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent==='Sida 1 / 2');
  await page.locator('#mobileOverview').tap();
  assert.equal(await page.locator('.overviewRow').count(),3);
  await page.locator('#overviewFilter').selectOption('all');
  assert.equal(await page.locator('[data-uid="two"] [data-field="remediationDate"]').inputValue(),'2026-10-03');
  assert.equal(await page.locator('[data-uid="two"] [data-field="remediationSignature"]').inputValue(),'AB');
  await page.locator('#overviewFilter').selectOption('problems');
  await page.evaluate(()=>{doors.forEach(d=>{d.status='ok';Object.values(d.checks).forEach(check=>check.result='ok')});save()});
  assert.equal(await page.locator('#overviewSummary').textContent(),'0 av 6 dörrar har problem');
  assert(await page.locator('#overviewPdf').isDisabled());
  assert((await page.locator('#overviewList').textContent()).includes('Inga dörrar med registrerade problem'));
  assert.deepEqual(errors,[]);
  console.log('PASS: problem aggregation, missing notes, safe text, native list scrolling, search/filters, protocol navigation, fault resolution and persistence');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
