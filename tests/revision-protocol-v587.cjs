// v2.4.587: Kontrollflöde Dörrautomatik / Lås – the checklist view (Protokoll) on phone, iPad and desktop.
// Small heading with only the protocol name; no file / project / object count row; no × (Till ritningen); no page
// version in the corner; Objektuppgifter closed whenever an object is opened, with a warning while something is missing.
// The checklist itself is unchanged. Synthetic drawings only.
const {chromium}=require('playwright'),{PDFDocument,rgb}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});
const choose=async page=>{await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').first().click();
 for(const type of ['automation','automation_selfcheck'])await page.locator('input[value="'+type+'"]').check();await page.locator('#allProtocolApply').click();};
const visible=(page,selector)=>page.evaluate(s=>[...document.querySelectorAll(s)].some(n=>n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden'),selector);

(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const doc=await PDFDocument.create(),pg=doc.addPage([1190,842]);pg.drawRectangle({x:60,y:60,width:1070,height:720,borderColor:rgb(0,0,0),borderWidth:1});
 const b64=Buffer.from(await doc.save()).toString('base64');
 for(const [label,options] of [['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['ipad',{viewport:{width:820,height:1180},hasTouch:true}],['desktop',{viewport:{width:1440,height:900}}]]){
  const context=await browser.newContext({...options,serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
  await page.goto('http://127.0.0.1:'+server.address().port+'/controlflow-revision/all-in-one.html');await choose(page);
  await page.evaluate(async b64=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'11.pdf',{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});},b64);
  await page.evaluate(()=>{project.projectName='Testprojekt';items.push(normalize({uid:'a',type:'automation',page:1,x:.3,y:.4}),normalize({uid:'b',type:'automation_selfcheck',page:1,x:.6,y:.5}));save();drawMarkers();});
  const openObject=uid=>page.evaluate(uid=>{selected=uid;go('protocol');showSelected();},uid);
  await openObject('a');await page.waitForTimeout(200);
  const view=await page.evaluate(()=>{const h=document.querySelector('.revProtocolHeading'),s=h&&getComputedStyle(h);return {view:document.body.dataset.view,text:h?.textContent,size:s&&parseFloat(s.fontSize),shown:!!h&&h.getClientRects().length>0}});
  assert.equal(view.view,'protocol');assert.equal(view.text,'Checklista revision dörrautomatik');assert.ok(view.shown,label+': heading shown');
  assert.ok(view.size<=14,label+': small heading '+view.size);
  assert.equal(await visible(page,'.secAppHeader .brand'),false,label+': no Dörrautomatik / Lås title');
  assert.equal(await visible(page,'.secAppHeader .headerSubtitle'),false);
  assert.equal(await visible(page,'.objectBar'),false,label+': no file / project / count row');
  assert.equal(await visible(page,'#secCloseProtocol'),false,label+': no ×');
  assert.ok(await visible(page,'#cfProtocolTools'),label+': protocol tools (key) kept');
  assert.equal(await visible(page,'.ta-page-version'),false,label+': no page version');
  // Objektuppgifter first, closed, with a warning; the checklist follows directly.
  const meta=await page.evaluate(()=>{const d=document.querySelector('#secForm details.protocolMetaPanel'),a=d.querySelector('.revMetaAlert'),checks=document.querySelector('#cfProtocolCheckHeader')||document.querySelector('#secChecklist');
   return {open:d.open,alert:!!a&&!a.hidden&&a.getClientRects().length>0,label:a?.getAttribute('aria-label'),gap:checks.getBoundingClientRect().top-d.getBoundingClientRect().bottom,top:d.getBoundingClientRect().top}});
  assert.equal(meta.open,false,label+': Objektuppgifter closed');
  assert.ok(meta.alert,label+': warning while closed');assert.match(meta.label,/Uppgifter saknas: Fyll i objektnummer/);
  assert.ok(meta.gap<40,label+': checklist directly below '+meta.gap);
  assert.ok(meta.top<(label==='phone'?170:140),label+': Objektuppgifter near the top '+meta.top);
  // Open shows the fields and hides the warning; closing shows it again.
  await page.locator('#secForm details.protocolMetaPanel > summary').click();
  assert.ok(await page.locator('#secAutomationModel').isVisible());
  assert.equal(await visible(page,'.revMetaAlert'),false,label+': no warning badge while open');
  await page.locator('#secForm details.protocolMetaPanel > summary').click();
  // The toggle event that shows the warning again comes just after the click.
  await page.waitForFunction(()=>{const a=document.querySelector('.revMetaAlert');return !!a&&a.getClientRects().length>0},null,{timeout:2000});
  // Another object: closed again, its own protocol name.
  await page.locator('#secForm details.protocolMetaPanel > summary').click();
  await openObject('b');await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>document.querySelector('#secForm details.protocolMetaPanel').open),false,label+': closed for the next object');
  assert.equal(await page.locator('.revProtocolHeading').textContent(),'Egenkontroll dörrautomatik');
  // With the details filled in there is no warning.
  await page.evaluate(()=>{project.facilityNo='1234';for(const o of items){o.modelCode='11';o.serialNumber='1'}save();showSelected();});
  await page.waitForTimeout(100);
  assert.equal(await visible(page,'.revMetaAlert'),false,label+': no warning when complete');
  // Back on the drawing the file row is shown again (v2.4.584 layout).
  await page.evaluate(()=>go('drawing'));await page.waitForTimeout(150);
  assert.ok(await visible(page,'.workspaceFileLine'),label+': file name back on the drawing');
  assert.equal(await visible(page,'.revProtocolHeading'),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS revision protocol v587: small protocol heading, no file row, no ×, no page version, Objektuppgifter closed per object with a warning, checklist directly below, drawing view unchanged.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
