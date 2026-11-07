const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const hash=bytes=>crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const prefix='doorservice-drawing-v1:';
const legacyDoors=[1,2,3,4].map(n=>({uid:'legacy'+n,id:'D'+n,page:1,status:'action',x:n*.2,y:n*.2,notes:'Äldre anmärkning '+n,checks:{}}));
const pdfStub=`window.pdfjsLib={GlobalWorkerOptions:{},getDocument({data}){const value=data[0];return {promise:new Promise((resolve,reject)=>setTimeout(()=>{if(value===0)return reject(new Error('invalid'));resolve({numPages:2,destroy:async()=>{},getPage:async()=>({getViewport:({scale})=>({width:1000*scale,height:1500*scale}),render:()=>({promise:value===8?Promise.reject(new Error('render failed')):Promise.resolve(),cancel(){}})})})},value===3?100:1))}}};`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(data=>{if(!localStorage.getItem('doors')){localStorage.setItem('doors',JSON.stringify(data));localStorage.setItem('project',JSON.stringify({projectName:'Äldre objekt'}))}},legacyDoors);
  await page.route('https://cdnjs.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:route.request().url().includes('pdf.min.js')?pdfStub:'window.jspdf={};'}));
  await page.route('https://dorrservice.test/**',route=>{const file=new URL(route.request().url()).pathname.slice(1)||'index.html';return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(path.join(__dirname,'..',file))})});
  async function upload(name,bytes){await page.locator('#file').setInputFiles({name,mimeType:'application/pdf',buffer:Buffer.from(bytes)});await page.waitForFunction(()=>document.querySelector('#viewerWrap').getAttribute('aria-busy')==='false')}
  async function setProject(value,withLogo=false){await page.locator('#settingsBtn').tap();await page.locator('#projectName').fill(value);if(withLogo){await page.locator('#logoFile').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=','base64')});await page.waitForFunction(()=>document.querySelector('#logoPreview img'))}await page.locator('#settingsBtn').evaluate(el=>el.click())}
  async function addDoor(note){await page.locator('#mobileAdd').tap();await page.locator('#markers').tap({position:{x:100,y:150}});await page.locator('#notes').fill(note);await page.locator('#status').selectOption('action');await page.locator('#closeProtocol').tap()}
  await page.goto('https://dorrservice.test/');
  assert.equal(await page.locator('#doorCount').textContent(),'0 dörrar');assert(await page.locator('#projectName').isDisabled());
  await upload('ritning.pdf',[1]);assert.equal(await page.locator('#doorCount').textContent(),'0 dörrar');
  await setProject('Objekt A',true);await addDoor('Problem enbart på A');
  await page.locator('#mobileOverview').tap();assert.equal(await page.locator('#overviewSummary').textContent(),'1 av 1 dörrar har problem');
  await page.locator('[data-field="remediationDate"]').fill('2026-10-03');await page.locator('[data-field="remediationSignature"]').fill('AB');await page.locator('#overviewSearch').fill('Problem enbart på A');await page.locator('#overviewFilter').selectOption('all');await page.locator('#closeOverview').tap();
  // A different file with the same filename must start entirely empty.
  await upload('ritning.pdf',[2]);assert.equal(await page.locator('#doorCount').textContent(),'0 dörrar');assert.equal(await page.locator('#projectName').inputValue(),'');assert.equal(await page.locator('#logoPreview img').count(),0);
  await page.locator('#mobileOverview').tap();assert.equal(await page.locator('.overviewRow').count(),0);await page.locator('#closeOverview').tap();
  assert.equal(await page.locator('#overviewFilter').inputValue(),'problems');assert.equal(await page.locator('#overviewSearch').inputValue(),'');
  await setProject('Objekt B');await addDoor('Problem enbart på B');
  assert.equal(await page.locator('.marker').textContent(),'D1');
  // Identical contents under a new filename must restore A, not create C.
  await upload('omdopt-A.pdf',[1]);assert.equal(await page.locator('#doorCount').textContent(),'1 dörrar');assert.equal(await page.locator('#projectName').inputValue(),'Objekt A');assert.equal(await page.locator('#logoPreview img').count(),1);
  await page.locator('#mobileOverview').tap();assert((await page.locator('#overviewList').textContent()).includes('Problem enbart på A'));assert(!(await page.locator('#overviewList').textContent()).includes('Problem enbart på B'));
  assert.equal(await page.locator('[data-field="remediationSignature"]').inputValue(),'AB');await page.locator('#closeOverview').tap();
  await page.reload();assert.equal(await page.locator('#doorCount').textContent(),'0 dörrar');assert.equal(await page.locator('.marker').count(),0);
  await upload('ritning.pdf',[2]);assert.equal(await page.locator('#projectName').inputValue(),'Objekt B');
  await page.locator('.marker').tap();await page.locator('#notes').fill('Nytt osparat B');await page.locator('#closeProtocol').tap();
  await upload('ritning.pdf',[2]);await page.locator('.marker').tap();assert.equal(await page.locator('#notes').inputValue(),'Nytt osparat B');await page.locator('#closeProtocol').tap();
  await upload('trasig.pdf',[0]);assert.equal(await page.locator('#doorCount').textContent(),'1 dörrar');assert((await page.locator('#drawingInfo').textContent()).includes('ritning.pdf'));
  // Bad saved data must not replace the active file or be overwritten.
  const damagedKey=prefix+hash([7]);await page.evaluate(key=>localStorage.setItem(key,'{damaged'),damagedKey);
  await upload('skadad-sparning.pdf',[7]);assert.equal(await page.locator('#projectName').inputValue(),'Objekt B');assert.equal(await page.evaluate(key=>localStorage.getItem(key),damagedKey),'{damaged');
  // Only the last of overlapping uploads may become active.
  await page.evaluate(async()=>{
   const change=(name,bytes)=>document.querySelector('#file').onchange({target:{files:[new File([new Uint8Array(bytes)],name,{type:'application/pdf'})],value:''}});
   await Promise.all([change('langsam.pdf',[3]),change('sista.pdf',[4])]);
  });assert((await page.locator('#drawingInfo').textContent()).includes('sista.pdf'));assert.equal(await page.locator('#doorCount').textContent(),'0 dörrar');
  // Legacy work appears only after explicit assignment to an empty drawing.
  await page.locator('#settingsBtn').tap();assert(await page.locator('#restoreLegacy').isEnabled());
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#restoreLegacy').tap();assert.equal(await page.locator('#doorCount').textContent(),'0 dörrar');
  page.once('dialog',dialog=>dialog.accept());await page.locator('#restoreLegacy').tap();assert.equal(await page.locator('#doorCount').textContent(),'4 dörrar');assert.equal(await page.locator('#projectName').inputValue(),'Äldre objekt');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('doors'))),legacyDoors);
  await page.locator('#settingsBtn').evaluate(el=>el.click());await upload('ny-igen.pdf',[5]);assert.equal(await page.locator('#doorCount').textContent(),'0 dörrar');
  await upload('sista.pdf',[4]);assert.equal(await page.locator('#doorCount').textContent(),'4 dörrar');
  // A valid document whose rendering fails must not leave the prior drawing visible.
  await upload('kan-inte-visas.pdf',[8]);assert.equal(await page.locator('#pdfCanvas').evaluate(el=>el.width),0);assert.equal(await page.locator('.marker').count(),0);assert((await page.locator('#appMessage').textContent()).includes('Kunde inte visa sidan'));
  await upload('sista.pdf',[4]);assert.equal(await page.locator('#doorCount').textContent(),'4 dörrar');
  // Switching during a protocol export would mix files; block it until export completes.
  await page.evaluate(()=>{
   window.jspdf={jsPDF:function(){return new Proxy({splitTextToSize:text=>[String(text)]},{get:(object,key)=>object[key]||(()=>{})})}};
   addDrawingPages=()=>new Promise(resolve=>window.finishExport=()=>resolve(true));
   window.pendingExport=document.querySelector('#exportBtn').onclick();
  });assert(await page.locator('#file').isDisabled());
  await page.evaluate(()=>document.querySelector('#file').onchange({target:{files:[new File([new Uint8Array([9])],'under-export.pdf')],value:''}}));
  assert((await page.locator('#drawingInfo').textContent()).includes('sista.pdf'));
  await page.evaluate(async()=>{window.finishExport();await window.pendingExport});assert(await page.locator('#file').isEnabled());
  // Quota failures block a switch rather than losing the current unsaved work.
  await page.locator('.marker').first().tap();await page.locator('#notes').fill('Behåll mig vid lagringsfel');await page.locator('#closeProtocol').tap();
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('quota')}});
  await upload('far-inte-byta.pdf',[6]);assert((await page.locator('#drawingInfo').textContent()).includes('sista.pdf'));assert.equal(await page.locator('#doorCount').textContent(),'4 dörrar');
  assert((await page.locator('#appMessage').textContent()).includes('Kunde inte spara'));await page.locator('.marker').first().tap();assert.equal(await page.locator('#notes').inputValue(),'Behåll mig vid lagringsfel');
  assert.deepEqual(errors,[]);
  console.log('PASS: empty startup, independent PDF contents/names, per-file project/fault/date/signature state, reload, same-file pending edits, invalid/corrupt files, upload race, explicit legacy recovery, quota-safe switching');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
