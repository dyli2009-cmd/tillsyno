const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {PDFDocument,StandardFonts,rgb}=require('../vendor/pdf-lib.min.js');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}});
async function fixture(kind,png){
 const d=await PDFDocument.create(),font=await d.embedFont(StandardFonts.Helvetica),other=await d.embedFont(StandardFonts.Courier),plan=d.addPage([595,842]);
 if(kind==='split'){
  plan.drawText('W',{x:100,y:500,size:20,font});plan.drawText('C',{x:119,y:500,size:20,font:other});
  plan.drawText('WC',{x:350,y:350,size:20,font});for(const [i,t]of ['WC1','RWC','WCP'].entries())plan.drawText(t,{x:60+i*150,y:150,size:20,font});
 }else{
  const image=await d.embedPng(png);
  plan.drawImage(image,{x:100,y:500,width:100,height:36});plan.drawImage(image,{x:350,y:350,width:100,height:36});
  if(kind==='mixed')plan.drawText('WC',{x:60,y:700,size:20,font});
 }
 const card=d.addPage([595,842]);card.drawText('Dorrkort WC',{x:70,y:750,size:18,font});card.drawText('Lashus ASSA 310-50',{x:70,y:650,size:14,font});card.drawText('Dorrautomatik ED100',{x:70,y:625,size:14,font});
 return Buffer.from(await d.save());
}
(async()=>{
 const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{for(const device of [{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true},{name:'ipad',width:1024,height:1366,touch:true}].filter(d=>!process.env.SMARTMATCH_DEVICE||process.env.SMARTMATCH_DEVICE===d.name)){
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
  try{
   const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:!!device.touch,isMobile:!!device.touch}),page=await ctx.newPage(),errors=[],remote=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(r.url()))remote.push(r.url());});
   await ctx.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
   await page.goto('http://127.0.0.1:'+server.address().port+'/smartmatch-read-test.html');
   const touch=device.touch?await ctx.newCDPSession(page):null;
   async function mark(mode,r){await page.locator('#rt'+mode).click();const b=await page.locator('#rtCanvasBox').boundingBox(),a={x:b.x+b.width*r.x,y:b.y+b.height*r.y},z={x:a.x+b.width*r.w,y:a.y+b.height*r.h};if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[z]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(z.x,z.y,{steps:5});await page.mouse.up();}}
   async function open(bytes,name){await page.locator('#pwFile').setInputFiles({name,mimeType:'application/pdf',buffer:bytes});await page.waitForSelector('#rtDialog[open]');await mark('Code',{x:.1,y:.085,w:.55,h:.04});await mark('Table',{x:.1,y:.21,w:.7,h:.075});}
   async function run(button){await page.locator(button).click();await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:120000});const status=await page.locator('#rtStatus').textContent();assert.match(status,/Sökningen är klar/,status);}
   async function start(count){await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await page.waitForFunction(n=>window.SmartMatchAppBridge?.getPositions().length===n&&document.getElementById('pwScanOverlay').hidden,count,{timeout:90000});}
   await open(await fixture('split'),'split-wc.pdf');await run('#rtPreview');assert.equal(await page.locator('.rtMatchRow').count(),2,'split W + C matches, WC1/RWC/WCP do not');assert(await page.locator('#rtStart').isDisabled());await start(2);
   assert((await page.evaluate(()=>SmartMatchAppBridge.getPositions())).every(p=>p.code==='WC'&&p.scanSource==='read-tool-v2'),'the engine uses the reviewed positions');console.log('PASS '+device.name+' split WC and preview/engine agreement');
   const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=500;c.height=180;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='bold 116px Arial';x.fillText('WC',85,132);return c.toDataURL('image/png').split(',')[1];}),'base64');
   await open(await fixture('raster',png),'image-only-wc.pdf');await run('#rtPreview');assert.equal(await page.locator('.rtMatchRow').count(),2,'image-only page is read before any searchable code exists');
   await mark('Stamp',{x:99/595,y:(842-537)/842,w:103/595,h:39/842});assert(await page.locator('#rtStart').isDisabled());await run('#rtFind');assert.equal(await page.locator('.rtMatchRow').count(),2,'example stamp and image-only matches');
   await page.locator('.rtMatchRow button').first().click();await page.waitForSelector('#rtHitRect:not([hidden])');
   const qa=process.env.SMARTMATCH_QA_DIR;if(qa){fs.mkdirSync(qa,{recursive:true});await page.screenshot({path:path.join(qa,device.name+'-matches.png')});}
   await page.locator('.rtMatchRow input').nth(1).uncheck();assert.match(await page.locator('#rtMatchCount').textContent(),/^1 /);assert(await page.locator('#rtStart').isDisabled());await start(1);
   assert.equal(await page.evaluate(()=>SmartMatchReadTest.payload().matching.hits.filter(h=>h.selected!==false).length),1);
   await page.waitForFunction(()=>sessionStorage.getItem('smartmatch-read-test-active-pdf:v1'));await page.reload();await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden,null,{timeout:45000});
   assert.equal(await page.evaluate(()=>SmartMatchReadTest.payload().matching.hits.filter(h=>h.selected===false).length),1,'rejected hit remains rejected after reopening');
   await page.locator('#rtOpenSettings').click();await page.waitForSelector('#rtDialog[open]');assert.equal(await page.locator('.rtMatchRow').count(),2);await page.locator('#rtCancel').click();assert.equal(await page.evaluate(()=>SmartMatchAppBridge.getPositions().length),1,'cancel keeps reviewed project');
   if(device.name==='desktop'){
    await open(await fixture('mixed',png),'mixed-wc.pdf');await run('#rtPreview');assert.equal(await page.locator('.rtMatchRow').count(),1,'native match is initially available');
    await mark('Stamp',{x:99/595,y:(842-537)/842,w:103/595,h:39/842});await run('#rtFind');assert.equal(await page.locator('.rtMatchRow').count(),3,'example adds raster stamps on mixed native/raster page');await start(3);
   }
   assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'all OCR assets and processing stay on the app origin');console.log('PASS '+device.name+' raster stamps, example selection, reviewed exclusions and reopen');await ctx.close();
  }finally{await browser.close();}
 }}finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
