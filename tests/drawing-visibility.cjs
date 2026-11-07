// Drawing filters must preserve work data and complete PDF export.
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
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:Number(process.env.TEST_WIDTH)||390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
  await page.goto(url);await page.waitForFunction(()=>document.getElementById('tillsynoOfflineStatus')?.dataset.ready==='true');
  await page.locator('a[href^="all-in-one.html"]').click();
  const group=page.locator('.allProtocolGroup').filter({has:page.locator('input[value="lock_revision"]')});
  await group.locator('summary').click();
  for(const type of ['automation','automation_selfcheck','lock_revision'])await group.locator('input[value="'+type+'"]').check();
  const doc=await PDFDocument.create();doc.addPage([595,842]);const bytes=Buffer.from(await doc.save());
  const chooserPromise=page.waitForEvent('filechooser');await page.locator('#allProtocolApply').click();await (await chooserPromise).setFiles({name:'visibility.pdf',mimeType:'application/pdf',buffer:bytes});
  await page.waitForFunction(()=>!!pdf);
  await page.evaluate(()=>{createItem('automation',.2,.2);createItem('automation_selfcheck',.4,.4);createItem('lock_revision',.6,.6)});
  assert.equal(await page.locator('.secMarker').count(),3);
  const before=await page.evaluate(()=>JSON.stringify({items,project,textNotes}));
  await page.locator('#secToggleOverlays').click();
  const menu=page.locator('#secVisibilityDialog');
  assert.equal(await menu.locator('input').count(),3);
  await menu.locator('input[value="lock_revision"]').uncheck();
  assert.equal(await page.locator('.secMarker').count(),2);
  assert.equal(await page.locator('.secConnector').count(),2);
  assert.equal(await page.locator('.secMarker.lock_revision').count(),0);
  await menu.locator('[data-hide]').click();assert.equal(await page.locator('#secMarkers').isVisible(),false);
  await menu.locator('input[value="lock_revision"]').check();
  assert.equal(await page.locator('#secMarkers').isVisible(),true);assert.equal(await page.locator('.secMarker').count(),1);
  await menu.locator('[data-show]').click();assert.equal(await page.locator('.secMarker').count(),3);
  await menu.locator('input[value="automation"]').uncheck();await menu.locator('[data-done]').click();
  await page.evaluate(()=>drawMarkers());assert.equal(await page.locator('.secMarker').count(),2);
  assert.equal(await page.evaluate(()=>JSON.stringify({items,project,textNotes})),before);
  await page.locator('#secToggleOverlays').click();await menu.locator('[data-hide]').click();await menu.locator('[data-done]').click();
  await page.locator('#securityExport').click();const download=page.waitForEvent('download');await page.locator('#secSaveWork').click();
  const output=await download;const saved=await PDFDocument.load(fs.readFileSync(await output.path()));assert(saved.getPageCount()>=5);
  assert.deepEqual(errors,[]);console.log('PASS: mobile per-protocol markers and arrows, hide/show all, redraw, untouched data and complete PDF export while hidden');
  await context.close();
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
