const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {PDFDocument,StandardFonts}=require('../vendor/pdf-lib.min.js');
const root=path.resolve(__dirname,'..');
async function fixture(title='Dorrkort GS 47'){
 const d=await PDFDocument.create(),f=await d.embedFont(StandardFonts.Helvetica),plan=d.addPage([595,842]);
 plan.drawText('Planritning',{x:60,y:790,size:15,font:f});
 plan.drawText('GS47',{x:125,y:550,size:14,font:f});plan.drawText('GS47',{x:350,y:400,size:14,font:f});
 const card=d.addPage([595,842]);card.drawText(title,{x:70,y:750,size:18,font:f});
 card.drawText('Lashus ASSA 310-50',{x:70,y:650,size:14,font:f});card.drawText('Dorrautomatik ED100',{x:70,y:625,size:14,font:f});
 return Buffer.from(await d.save());
}
async function realFixture(file){
 const d=await PDFDocument.create(),f=await d.embedFont(StandardFonts.Helvetica),plan=d.addPage([595,842]);plan.drawText('Planritning',{x:60,y:790,size:15,font:f});plan.drawText('WC',{x:125,y:550,size:14,font:f});plan.drawText('GS001',{x:350,y:400,size:14,font:f});
 const source=await PDFDocument.load(fs.readFileSync(file));for(const p of await d.copyPages(source,[0]))d.addPage(p);return Buffer.from(await d.save());
}
const server=http.createServer((req,res)=>{const p=path.resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html');if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(p));}catch(_){res.writeHead(404);res.end();}});
(async()=>{
 const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
 for(const device of [{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true},{name:'ipad',width:1024,height:1366,touch:true}].filter(d=>!process.env.SMARTMATCH_DEVICE||d.name===process.env.SMARTMATCH_DEVICE)){
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
  try{
   const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:!!device.touch,isMobile:!!device.touch}),page=await ctx.newPage(),errors=[],remote=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))remote.push(r.url());});
   await ctx.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
   await page.goto('http://127.0.0.1:'+server.address().port+'/smartmatch-read-test.html');
   const open=async(bytes,name)=>{await page.locator('#pwFile').setInputFiles({name,mimeType:'application/pdf',buffer:bytes});await page.waitForSelector('#rtDialog[open]',{timeout:30000});};
   const touchSession=device.touch?await ctx.newCDPSession(page):null;
   const mark=async(kind,r)=>{await page.locator('#rt'+(kind==='code'?'Code':'Table')).click();const b=await page.locator('#rtCanvasBox').boundingBox();const start={x:b.x+r.x*b.width,y:b.y+r.y*b.height},end={x:start.x+r.w*b.width,y:start.y+r.h*b.height};if(touchSession){await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y}]});await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:end.x,y:end.y}]});await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:5});await page.mouse.up();}};
   const scan=async()=>{await page.locator('#rtPreview').click();await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:90000}).catch(async e=>{throw Error(e.message+' STATUS: '+await page.locator('#rtStatus').textContent());});assert(await page.locator('.rtResult').count(),await page.locator('#rtStatus').textContent());};
   const start=async()=>{await page.locator('#rtStart').click();await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().length===2&&!document.getElementById('pwLoadDialog')?.open&&!document.getElementById('pwScanOverlay')?.hidden===false,null,{timeout:90000}).catch(async()=>{await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().length===2&&document.getElementById('pwState').textContent.includes('36.134-READ-TEST'),null,{timeout:90000});});};
   await open(await fixture(),'read-test.pdf');assert.equal(await page.evaluate(()=>SmartMatchAppBridge.getPdf()),null,'no matching scan before the user starts');
   await mark('code',{x:.1,y:.085,w:.55,h:.04});await mark('table',{x:.1,y:.21,w:.7,h:.075});await page.locator('#rtName').fill('My test layout');await scan();
   assert.equal(await page.getByLabel('Beteckning sida 2',{exact:true}).inputValue(),'GS47');
   const rows=await page.getByLabel('Arbetsrader sida 2',{exact:true}).inputValue();assert.match(rows,/ASSA/);assert.match(rows,/ED100/);
   const qa=process.env.SMARTMATCH_QA_DIR;if(qa){fs.mkdirSync(qa,{recursive:true});await page.screenshot({path:path.join(qa,device.name+'-setup.png')});}
   console.log('PASS '+device.name+' setup and table preview');await start();assert.deepEqual(await page.evaluate(()=>SmartMatchAppBridge.getDoorCardIndex()),{GS47:[2]});
   await page.evaluate(()=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions()[0]));
   const checks=page.locator('.rtWorkRow input');assert((await checks.count())>=2);await checks.first().check();
   const saved=await page.evaluate(()=>SmartMatchAppBridge.save());assert(saved.readTestData.checks);assert.deepEqual(Object.values(saved.instances).map(x=>x.checks),[{},{}],'internal work never changes exported legacy checks');assert(Object.values(saved.instances).every(x=>x.progress===0),'internal work does not change PDF progress');
   await page.locator('#pwProtocolClose').click();await page.evaluate(()=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions()[1]));assert.equal(await checks.first().isChecked(),false,'same code, different physical door');await page.locator('#pwProtocolClose').click();
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('tillsyno-read-test-templates:v1')));assert.deepEqual(Object.keys(stored[0]).sort(),['name','rects'],'saved template contains geometry, not example-card text');
   await page.locator('#rtOpenSettings').click();await page.waitForSelector('#rtDialog[open]');await page.locator('#rtCancel').click();assert.equal(await page.evaluate(()=>Object.values(SmartMatchReadTest.payload().checks).flatMap(Object.values).filter(Boolean).length),1,'cancel preserves current work');
   console.log('PASS '+device.name+' matching and internal per-door checks');
   if(device.name==='desktop'){
    await page.waitForFunction(()=>sessionStorage.getItem('smartmatch-read-test-active-pdf:v1'));
    await page.reload();await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPositions().length===2&&document.getElementById('pwScanOverlay').hidden,null,{timeout:30000});
    assert.equal(await page.evaluate(()=>Object.values(SmartMatchReadTest.payload().checks).flatMap(Object.values).filter(Boolean).length),1,'internal checks survive a refresh');
    console.log('PASS refresh preserves work');
    for(const title of ['Beslagskod: GS47','GS47']){await open(await fixture(title),'variant.pdf');await page.locator('#rtTemplate').selectOption('0');await scan();assert.equal(await page.getByLabel('Beteckning sida 2',{exact:true}).inputValue(),'GS47');await page.locator('#rtCancel').click();}
    const multi=await fixture();await page.locator('#rtMultiFiles').setInputFiles([{name:'drawing.pdf',mimeType:'application/pdf',buffer:multi},{name:'cards.pdf',mimeType:'application/pdf',buffer:multi}]);await page.waitForSelector('#rtDialog[open]');assert.equal(await page.locator('#rtPageCount').textContent(),'av 4');await page.locator('#rtCancel').click();console.log('PASS multiple PDF input');
    if(process.env.SMARTMATCH_REAL_CARD){await open(await realFixture(process.env.SMARTMATCH_REAL_CARD),'real-card.pdf');
     await page.locator('.rtCoordinates summary').click();
     for(const [kind,r]of [['Kod',{Vänster:5.7,Överkant:5.95,Bredd:9.3,Höjd:1.3}],['Tabell',{Vänster:5.65,Överkant:10.2,Bredd:52.3,Höjd:45.1}]])for(const [key,value]of Object.entries(r)){const input=page.getByLabel(kind+' '+key,{exact:true});await input.fill(String(value));await input.dispatchEvent('change');}
     console.log('Reading real card');await scan();assert.equal(await page.getByLabel('Beteckning sida 2',{exact:true}).inputValue(),'WC');const raw=await page.locator('.rtResult pre').textContent();assert(raw.length>100,'actual raster table is read');assert(!raw.includes('GS-001'),'footer is outside the selected table');await page.locator('#rtCancel').click();
    }
   }
   assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'OCR stays on the app origin');
   console.log('PASS '+device.name+': user-controlled regions, table reading, GS47 normalization, real stamp matching, per-door internal checks and reusable geometry-only template');await ctx.close();
  }finally{await browser.close();}
 }
 }finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
