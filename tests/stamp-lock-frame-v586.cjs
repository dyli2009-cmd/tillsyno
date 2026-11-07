// v2.4.586: a locked stamp has no frame on the drawing (owner's decision), in Dörrautomatik / Lås and in
// Säkerhetsservice, at every zoom level. The lock still works: a locked stamp cannot be moved, and the blue
// frame for chosen stamps in Justera / lås stämplar is kept. Phone size. Synthetic drawings only.
const {chromium}=require('playwright'),{PDFDocument,rgb}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});

(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const doc=await PDFDocument.create(),pg=doc.addPage([2384,1684]);pg.drawRectangle({x:100,y:100,width:2100,height:1400,borderColor:rgb(0,0,0),borderWidth:1});
 const b64=Buffer.from(await doc.save()).toString('base64');
 for(const [label,url,type,group] of [['Dörrautomatik','/controlflow-revision/all-in-one.html','automation',0],['Säkerhetsservice','/all-in-one.html','alarm',1]]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
  await page.goto('http://127.0.0.1:'+server.address().port+url);
  await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').nth(group).click();
  await page.locator('input[value="'+type+'"]').check();await page.locator('#allProtocolApply').click();
  await page.evaluate(async b64=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'Test.pdf',{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});},b64);
  await page.evaluate(t=>{for(const [x,y] of [[.3,.4],[.6,.5]])items.push(normalize({uid:'s'+x,type:t,page:1,x,y,positionLocked:true}));save();drawMarkers();},type);
  const frame=()=>page.evaluate(()=>[...document.querySelectorAll('#secStage .securityStampLocked')].map(n=>{const s=getComputedStyle(n);return {style:s.outlineStyle,width:s.outlineWidth}}));
  for(const z of [.5,1,2,4]){
   await page.evaluate(z=>setZoom(z),z);await page.waitForTimeout(400);
   const frames=await frame();assert.ok(frames.length>=2,label+': locked stamps rendered');
   assert.ok(frames.every(f=>f.style==='none'),label+' '+z*100+' %: no frame on a locked stamp '+JSON.stringify(frames));
  }
  await page.evaluate(()=>setZoom(1));
  // The lock still works.
  assert.equal(await page.evaluate(()=>window.SecurityStampSelection.canMove(items[0])),false,label+': a locked stamp cannot be moved');
  assert.equal(await page.evaluate(()=>window.SecurityStampSelection.isLocked(items[0])),true);
  // Chosen stamps keep the blue frame in Justera / lås stämplar, also when they are locked.
  await page.evaluate(()=>window.SecurityStampSelection.start());
  await page.locator('#securityStampSelectAll').click();
  const chosen=await page.evaluate(()=>[...document.querySelectorAll('#secStage .secMarker.securityStampChosen')].map(n=>getComputedStyle(n).outlineStyle));
  assert.ok(chosen.length>=2&&chosen.every(s=>s==='solid'),label+': chosen stamps keep the blue frame '+JSON.stringify(chosen));
  assert.match(await page.locator('#securityStampSelectionCount').textContent(),/2 låsta/,label+': the panel still shows the lock');
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS stamp lock frame v586: no frame on locked stamps at 50–400 % in Dörrautomatik and Säkerhetsservice, lock still prevents moving, chosen stamps keep the blue frame.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
