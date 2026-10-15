// Browser integration: original vs isolated copy, real PDF.js/PDF-lib and exports.
const {chromium}=require('playwright');
const {PDFDocument,PDFName,PDFString}=require('../vendor/pdf-lib.min.js');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.join(__dirname,'..');
let offlineTestTransport=false;
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 if(offlineTestTransport&&file===path.join(root,'auth/client.js')){
  res.setHeader('Content-Type','application/javascript');
  return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',email:'test@example.invalid',modules:['control']}),permitted:(access,module)=>!module||access.modules.includes(module)};");
 }
 try{
  const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 }catch(error){res.writeHead(404);res.end('Missing');}
});
async function legacyFixture(){
 const doc=await PDFDocument.create(),drawing=doc.addPage([1000,800]),protocol=doc.addPage([600,800]);
 drawing.drawText('Door drawing');
 const form=doc.getForm(),values={'Id nummermaskin':'20221-1-24-2','Beställare':'Bestallare AB','Utförande företag':'Servicebolag AB','Placering/Dörrlittra':'Entre 2','Servicetekniker':'Tekniker Test','kontakt kund':'Bestallarkontakt','telefon kund':'030012345','Datum':'2025-10-15'};
 Object.entries(values).forEach(([name,value],i)=>{const f=form.createTextField(name);f.setText(value);f.addToPage(protocol,{x:30,y:740-i*45,width:500,height:24});});
 const annotation=record=>drawing.node.addAnnot(doc.context.register(doc.context.obj(record)));
 annotation({Type:'Annot',Subtype:'Link',Rect:[40,700,80,740],Border:[0,0,0],A:{S:'GoTo',D:[protocol.ref,PDFName.of('Fit')]}});
 annotation({Type:'Annot',Subtype:'FreeText',IT:'FreeTextCallout',Rect:[700,600,900,650],CL:[150,250,500,610,700,620],Contents:PDFString.of(values['Id nummermaskin']),DA:PDFString.of('/Helv 10 Tf 0 0 1 rg')});
 // A nearby different ID must not steal the link from the distant exact-ID callout.
 annotation({Type:'Annot',Subtype:'FreeText',IT:'FreeTextCallout',Rect:[40,745,100,780],CL:[940,740,80,750],Contents:PDFString.of('20221-2-24-1'),DA:PDFString.of('/Helv 10 Tf 0 0 1 rg')});
 return Buffer.from(await doc.save());
}
async function contextFor(browser,modules=['control'],options={}){
 const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'block',...options});
 // Only test transport is mocked; the actual unmodified guard enforces module access.
 await context.route('**/auth/client.js*',route=>route.fulfill({contentType:'application/javascript',body:`window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',email:'test@example.invalid',modules:${JSON.stringify(modules)}}),permitted:(access,module)=>!module||access.modules.includes(module)};`}));
 await context.addInitScript(()=>{
  const sentinels={'doorservice-all-in-one:sentinel':'ordinary work','doorservice-all-in-one-active-protocols':'["lock_revision"]','doorservice-protocol-size':'2','doorservice-ui-text-level':'0','doorservice-security-overview-size':'0','doorservice-security-customer-preview-size':'0','tillsyno-ui-appearance-v1':'{"theme":"mist","device":"auto"}'};
  if(!localStorage.getItem('test-sentinels-ready')){for(const [key,value] of Object.entries(sentinels))localStorage.setItem(key,value);localStorage.setItem('test-sentinels-ready','1');}
 });
 return context;
}
async function choose(page){
 await page.locator('#allProtocolDialog[open]').waitFor();
 await page.locator('.allProtocolGroup summary').first().click();
 await page.locator('input[value="automation"]').check();
 await page.locator('#allProtocolApply').click();
 assert.equal(await page.locator('#allProtocolDialog').evaluate(e=>e.open),false);
 assert.equal(await page.locator('#secEmpty').isVisible(),true);
}
const snapshot=page=>page.evaluate(()=>JSON.parse(JSON.stringify({items,project,checks:SYSTEMS.automation.checks,pages:pdf.numPages})));
async function openBytes(page,bytes,name='Service DA test.pdf'){
 await page.locator('#securityFile').setInputFiles({name,mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(()=>typeof pdf!=='undefined'&&pdf&&items.length===1).catch(async error=>{console.error('IMPORT STATE',await page.locator('#securityMessage').innerText());throw error;});
 await page.waitForFunction(()=>document.getElementById('secCanvas').width>0);
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const bytes=await legacyFixture(),contexts=[],results=[];
  for(const route of ['/all-in-one.html','/controlflow-revision-test/v1/all-in-one.html']){
   const context=await contextFor(browser,undefined,{viewport:{width:1024,height:850}});contexts.push(context);
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('PAGE ERROR',error.message);});page.on('console',message=>{if(message.type()==='error')console.error('CONSOLE',message.text());});
   await page.goto(base+route);await choose(page);await openBytes(page,bytes);
   const state=await snapshot(page);results.push(state);
   assert.equal(state.items[0].x,.15);assert.equal(state.items[0].y,.6875);
   assert.equal(state.items[0].labelX,.8);assert.equal(state.items[0].labelY,.21875);
   assert.equal(state.items[0].legacyPlacementSource,'bluebeam-callout-id');
   assert.equal(state.project.customer,'Bestallare AB');assert.equal(state.project.company,'Servicebolag AB');
   assert.equal(state.checks.length,18);assert.equal(state.pages,1);
   await page.evaluate(()=>{selected=items[0].uid;showSelected();});
   await page.locator('#secNavProtocol').click();
   await page.locator('.secChoices button[data-v="ok"]').first().click();
   assert.equal(await page.evaluate(()=>items[0].checks['1.1'].result),'ok');
   await page.locator('#secNavProject').click();assert.equal(await page.locator('#secCustomer').inputValue(),'Bestallare AB');
   await page.locator('#secCompany').fill('Testbolag');await page.locator('#secCloseProject').click();
   const downloadPromise=page.waitForEvent('download');await page.locator('#securityExport').click();await page.locator('#secSaveWork').click();
   const download=await downloadPromise,exportBytes=fs.readFileSync(await download.path());
   const inspected=await page.evaluate(async array=>{const found=await inspectSecurityWorkPdf(new Uint8Array(array));return {items:found.work.items,project:found.work.project};},[...exportBytes]);
   assert.equal(inspected.items[0].x,.15);assert.equal(inspected.items[0].y,.6875);
   assert.equal(inspected.project.company,'Testbolag');assert.equal(inspected.items[0].checks['1.1'].result,'ok');
   if(route.includes('revision-test')){
    assert.deepEqual(results[1],results[0],'Imported work, project and checklist must match original exactly');
    const ordinary=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('doorservice-')||key==='tillsyno-ui-appearance-v1')));
    assert.equal(ordinary['doorservice-protocol-size'],'2');assert.equal(ordinary['doorservice-all-in-one:sentinel'],'ordinary work');
    assert.equal(ordinary['doorservice-all-in-one-active-protocols'],'["lock_revision"]');
    assert.equal(Object.keys(ordinary).filter(k=>k.startsWith('doorservice-all-in-one:')).length,1);
    const databases=await page.evaluate(async()=>(await indexedDB.databases()).map(d=>d.name));
    assert(databases.includes('tillsyno-revision-test-offline-work-v1'));assert(!databases.includes('tillsyno-offline-work'));
    assert.equal(await page.locator('[data-ta-version-footer]').count(),1);
    assert((await page.locator('[data-ta-version-footer]').textContent()).includes('TEST v1'));
    await page.reload();await choose(page);await openBytes(page,exportBytes,'arbete.pdf');
    await page.locator('#secOpenContinue').click();assert.equal(await page.evaluate(()=>items[0].checks['1.1'].result),'ok');
    await page.reload();await choose(page);await openBytes(page,exportBytes,'arbete.pdf');
    await page.locator('#secOpenNewService').click();
    assert.equal(await page.evaluate(()=>items[0].checks['1.1'].result),'');
    assert.equal(await page.evaluate(()=>project.company),'Testbolag');assert.equal(await page.evaluate(()=>items[0].x),.15);
   }
   assert.deepEqual(errors,[]);console.log('PASS '+route+': chooser, exact-ID arrow, project fields, 18 checks, PDF round-trip.');
  }
  for(const viewport of [{width:390,height:844},{width:820,height:1180}]){
   const context=await contextFor(browser,undefined,{viewport,hasTouch:true}),page=await context.newPage();
   await page.goto(base+'/controlflow-revision-test/v1/all-in-one.html');
   if(process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});await page.locator('#allProtocolDialog[open]').waitFor();await page.screenshot({path:path.join(process.env.QA_DIR,'revision-picker-'+viewport.width+'.png')});}
   await choose(page);await openBytes(page,bytes);
   if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'revision-drawing-'+viewport.width+'.png')});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false);
   console.log('PASS viewport '+viewport.width+': chooser and PDF usable.');await context.close();
  }
  const deniedContext=await contextFor(browser,['smartmatch']),denied=await deniedContext.newPage();
  await denied.goto(base+'/controlflow-revision-test/v1/all-in-one.html');
  await denied.locator('#tillsynoAccessDenied').waitFor();assert((await denied.locator('#tillsynoAccessDenied').innerText()).includes('behörighet'));
  console.log('PASS control-module authorization rejects SmartMatch-only access.');
  await deniedContext.close();for(const context of contexts)await context.close();
  offlineTestTransport=true;
  const offlineContext=await contextFor(browser,undefined,{serviceWorkers:'allow'}),offline=await offlineContext.newPage();
  await offline.goto(base+'/controlflow-revision-test/v1/all-in-one.html');await choose(offline);await openBytes(offline,bytes);
  await offline.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.includes('/controlflow-revision-test/sw.js'));
  await offline.evaluate(async()=>{const cache=await caches.open('ordinary-cache-preserved');await cache.put('/keep',new Response('keep'));});
  await offlineContext.setOffline(true);await offline.reload();await choose(offline);await openBytes(offline,bytes);
  assert.equal(await offline.evaluate(()=>items[0].x),.15);
  assert.equal(await offline.evaluate(()=>caches.has('ordinary-cache-preserved')),true);
  console.log('PASS scoped service worker: offline reload, PDF import and ordinary cache preserved.');
  await offlineContext.close();
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
