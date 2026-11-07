// v2.4.590: Historik and the Mall box.
// Historik (Dörrautomatik / Lås and Säkerhetsservice): Starta ny service keeps the finished service (status and remarks,
// the latest 10) in the object's history; a file from before v2.4.590 starts the history with its last service; the
// old panel is replaced by a yellow Historik button next to the key that opens a box with all services, newest first.
// The history survives reopening the drawing (device storage) and, in Dörrautomatik, the work PDF round trip.
// Mall (Dörrautomatik / Lås): no A− / A+, a box smaller than the screen that can be resized, ‹ 1 / 1 › centred, and
// the mouse wheel zooms only the content of the box, also on the protocol pages. Synthetic drawings only.
const {chromium}=require('playwright'),{PDFDocument,rgb}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});
const open=(page,bytes,name)=>page.evaluate(async({b64,name})=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name,{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});},{b64:Buffer.from(bytes).toString('base64'),name});
const shown=(page,selector)=>page.evaluate(s=>[...document.querySelectorAll(s)].some(n=>n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden'),selector);

(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const doc=await PDFDocument.create(),pg=doc.addPage([1190,842]);pg.drawRectangle({x:60,y:60,width:1070,height:720,borderColor:rgb(0,0,0),borderWidth:1});
 const bytes=Buffer.from(await doc.save()),base='http://127.0.0.1:'+server.address().port;
 for(const [label,url,type,group] of [['Dörrautomatik','/controlflow-revision/all-in-one.html','automation',0],['Säkerhetsservice','/all-in-one.html','alarm',1]]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('dialog',d=>d.accept());
  const choose=async()=>{await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').nth(group).click();await page.locator('input[value="'+type+'"]').check();await page.locator('#allProtocolApply').click();};
  await page.goto(base+url);await choose();await open(page,bytes,'Test.pdf');
  // Two objects from a file from before v2.4.590: only the last service in previous*.
  await page.evaluate(t=>{for(const [uid,x] of [['a',.3],['b',.6]]){const o=normalize({uid,type:t,page:1,x,y:.4});o.previousIssues=[{n:'1.2',title:'Gammal punkt',note:'Från gammal fil'}];o.previousStatus='Åtgärd krävs';o.previousServiceDate='2023-11-01';o.previousNotes='';items.push(o);}save();},type);
  // The first new service: the old file's last service becomes the first earlier entry.
  const legacy=await page.evaluate(()=>{const o=items[1],checks=allChecks(o);project.date='2024-11-05';o.checks[checks[0][0]]={result:'remark',note:'Anmärkning 2024'};startNewSecurityService(false);return o.serviceHistory.map(e=>e.date)});
  assert.deepEqual(legacy,['2024-11-05','2023-11-01'],label+': a file from before v2.4.590 keeps its last service');
  // Ten more services: the history keeps the latest 10, newest first, with status and remarks only.
  const history=await page.evaluate(()=>{const o=items[0],checks=allChecks(o);
   for(let year=2025;year<2035;year++){project.date=year+'-11-05';o.checks[checks[0][0]]={result:'remark',note:'Anmärkning '+year};o.checks[checks[1][0]]={result:'ok',note:''};o.notes='Allmänt '+year;startNewSecurityService(false);}
   return o.serviceHistory;});
  assert.equal(history.length,10,label+': the latest 10 services are kept');
  assert.equal(history[0].date,'2034-11-05');assert.equal(history[9].date,'2025-11-05',label+': newest first, older ones dropped');
  assert.deepEqual(Object.keys(history[0]).sort(),['date','issues','notes','status'],label+': status and remarks only');
  assert.equal(history[0].issues.length,1);assert.equal(history[0].issues[0].note,'Anmärkning 2034');
  // The button replaces the panel and opens the box.
  await page.evaluate(()=>{selected='a';go('protocol');showSelected();});await page.waitForTimeout(150);
  assert.equal(await shown(page,'#secPreviousPanel'),false,label+': the old panel is gone');
  assert.ok(await shown(page,'#cfHistoryButton'),label+': Historik button shown');
  const look=await page.evaluate(()=>{const b=document.getElementById('cfHistoryButton'),tools=document.getElementById('cfProtocolTools');return {bg:getComputedStyle(b).backgroundColor,next:b.nextElementSibling===tools,label:b.getAttribute('aria-label')}});
  assert.equal(look.bg,'rgb(255, 217, 112)',label+': yellow');assert.ok(look.next,label+': next to the key');assert.match(look.label,/10 tidigare servicetillfällen/);
  await page.locator('#cfHistoryButton').click();await page.locator('.cfHistoryCard').waitFor();
  const box=await page.evaluate(()=>[...document.querySelectorAll('.cfHistoryEntry h3')].map(h=>h.textContent));
  assert.equal(box.length,10);assert.match(box[0],/^2034-11-05 · .*Senaste$/);
  assert.ok((await page.locator('.cfHistoryCard').textContent()).includes('Anmärkning 2034'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('.cfHistoryCard').count(),0,label+': Escape closes');
  // An object without history has no button.
  await page.evaluate(t=>{items.push(normalize({uid:'c',type:t,page:1,x:.5,y:.7}));save();selected='c';showSelected();},type);
  assert.equal(await shown(page,'#cfHistoryButton'),false,label+': no button without history');
  if(label==='Dörrautomatik'){
   // Dörrautomatik also restores the work from the device when the same drawing is opened again.
   await page.reload();await choose();await open(page,bytes,'Test.pdf');
   if(await page.locator('#secOpenWorkDialog[open]').count())await page.locator('#secOpenContinue').click();
   assert.equal(await page.evaluate(()=>items.find(o=>o.uid==='a')?.serviceHistory?.length),10,label+': history kept on the device');
  }
  // Work PDF round trip, on both pages.
  const [download]=await Promise.all([page.waitForEvent('download'),page.evaluate(()=>exportPdf('work'))]);
  const work=fs.readFileSync(await download.path());
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('doorservice-all-in-one:'))localStorage.removeItem(k)});
  await page.reload();await choose();await open(page,work,'Test.pdf');
  if(await page.locator('#secOpenWorkDialog[open]').count())await page.locator('#secOpenContinue').click();
  const kept=await page.evaluate(()=>items.find(o=>o.uid==='a')?.serviceHistory?.map(e=>e.date));
  assert.equal(kept?.length,10,label+': history in the work PDF');assert.equal(kept[0],'2034-11-05');
  if(label==='Dörrautomatik'){
   // Mall box.
   await page.evaluate(()=>go('drawing'));await page.locator('#securityPreview').click();await page.locator('#secPreviewCanvas').waitFor();await page.waitForTimeout(800);
   assert.equal(await shown(page,'#secPreviewTextSmaller'),false,'no A−');assert.equal(await shown(page,'#secPreviewTextLarger'),false,'no A+');
   const before=await page.evaluate(()=>{const r=document.getElementById('revisionInlineWorkspace').getBoundingClientRect(),c=document.querySelector('#secPreviewDialog .secPreviewControls').getBoundingClientRect(),h=document.querySelector('#secPreviewDialog .secPreviewHead').getBoundingClientRect();
    return {w:r.width,h:r.height,vh:innerHeight,controlsCentre:c.left+c.width/2,headCentre:h.left+h.width/2}});
   assert.ok(before.h<before.vh-20,'a box smaller than the screen '+before.h);
   assert.ok(Math.abs(before.controlsCentre-before.headCentre)<40,'‹ 1 / 1 › centred');
   const grip=await page.locator('#revisionInlineWorkspace .revPreviewResize').boundingBox();
   await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();await page.mouse.move(grip.x-60,grip.y-120,{steps:4});await page.mouse.up();await page.waitForTimeout(300);
   const after=await page.evaluate(()=>{const r=document.getElementById('revisionInlineWorkspace').getBoundingClientRect();return {w:r.width,h:r.height}});
   assert.ok(after.w<before.w-40&&after.h<before.h-80,'the box can be resized '+JSON.stringify([before,after]));
   // Protocol page: the wheel zooms the page in the box, not the app.
   await page.evaluate(()=>{const next=document.getElementById('secPreviewNext');if(!next.disabled)next.click()});await page.waitForTimeout(800);
   const mode=await page.evaluate(()=>previewMode);
   const zoom=await page.evaluate(async()=>{const wrap=document.getElementById('secPreviewWrap'),canvas=document.getElementById('secPreviewCanvas'),r=canvas.getBoundingClientRect(),w0=r.width,vv=window.visualViewport?.scale||1;
    wrap.dispatchEvent(new WheelEvent('wheel',{deltaY:-300,clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true,cancelable:true}));await new Promise(res=>setTimeout(res,300));
    return {ratio:canvas.getBoundingClientRect().width/w0,page:window.visualViewport?.scale||1,before:vv}});
   assert.ok(zoom.ratio>1.3,mode+' page zooms in the box '+zoom.ratio);assert.equal(zoom.page,zoom.before,'the app is not zoomed');
   await page.locator('#secPreviewClose').click();
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS controlflow history and preview v590: 10 services kept newest first (status and remarks), legacy files kept, yellow Historik button with box in Dörrautomatik and Säkerhetsservice, history survives reopening and the work PDF, Mall box without A−/A+, resizable, centred page buttons and zoom inside the box.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
