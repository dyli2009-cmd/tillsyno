// Real service-worker test: first install, offline navigation, drawing recovery and PDF export.
const {chromium}=require('playwright');
const {PDFDocument}=require('../vendor/pdf-lib.min.js');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.join(__dirname,'..');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/tillsyno\//,'');
 const file=path.resolve(root,pathname||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.png':'image/png'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch(_){res.writeHead(404);res.end('Missing')}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/tillsyno/';
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
  await page.goto(url);await page.waitForFunction(()=>document.getElementById('tillsynoOfflineStatus')?.dataset.ready==='true');
  await page.locator('a[href^="all-in-one.html"]').click();
  const group=page.locator('.allProtocolGroup').filter({has:page.locator('input[value="lock_revision"]')});
  await group.locator('summary').click();await group.locator('input[value="lock_revision"]').check();
  const pdf=await PDFDocument.create();pdf.addPage([595,842]);const bytes=Buffer.from(await pdf.save());
  const reopenLocalDrawing=async()=>{
   assert.equal(await page.getByRole('button',{name:'Fortsätt med sparad ritning',exact:true}).count(),0);
   const options=page.locator('.allProtocolGroup').filter({has:page.locator('input[value="lock_revision"]')});
   await options.locator('summary').click();await options.locator('input[value="lock_revision"]').check();
   const chooser=page.waitForEvent('filechooser');await page.locator('#allProtocolApply').click();
   await (await chooser).setFiles({name:'offline-test.pdf',mimeType:'application/pdf',buffer:bytes});
  };
  const chooserPromise=page.waitForEvent('filechooser');await page.locator('#allProtocolApply').click();await (await chooserPromise).setFiles({name:'offline-test.pdf',mimeType:'application/pdf',buffer:bytes});
  await page.waitForFunction(()=>typeof pdf!=='undefined'&&pdf&&sourceBytes?.length>0);
  await page.waitForFunction(async()=>!!(await window.TillsynoOfflineWork.recent('doorservice-all-in-one')));
  await page.locator('[data-add="lock_revision"]').click();await page.locator('#secMarkers').click({position:{x:110,y:130}});
  await page.waitForFunction(()=>items.length===1);
  await page.locator('#secNavProtocol').click();await page.locator('.secChoices button[data-v="ok"]').first().click();
  const original=await page.evaluate(()=>({id:items[0].uid,result:items[0].checks['1.1'].result,key:activeKey}));assert.equal(original.result,'ok');
  await context.setOffline(true);
  await page.goto(url+'?source=pwa');assert(await page.locator('.homeBrand').textContent().then(s=>s.includes('Tillsyno')));
  await page.locator('a[href^="all-in-one.html"]').click();
  await reopenLocalDrawing();
  await page.waitForFunction(()=>items.length===1&&!!pdf);
  const restored=await page.evaluate(()=>({id:items[0].uid,result:items[0].checks['1.1'].result,key:activeKey}));assert.deepEqual(restored,original);
  await page.locator('.secMarker').first().dblclick();await page.locator('.secChoices button[data-v="ok"]').nth(1).click();
  await page.locator('#securityExport').click();const download=page.waitForEvent('download');await page.locator('#secSaveWork').click();
  const output=await download;const outputPath=await output.path();assert(fs.statSync(outputPath).size>1000);
  const exported=await PDFDocument.load(fs.readFileSync(outputPath));assert(exported.getPageCount()>=3);
  await page.reload();await reopenLocalDrawing();
  await page.waitForFunction(()=>items.length===1&&items[0].checks['1.2'].result==='ok');
  assert.deepEqual(errors,[]);console.log('PASS: offline cold navigation, versioned cache, mobile drawing recovery, edits after reload and real PDF export');
  await context.close();
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
