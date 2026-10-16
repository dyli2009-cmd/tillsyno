/* Browser integration for the isolated Avläsning TEST 3 guide.
 * Optional: SMARTMATCH_REAL_PDF=/absolute/path/to/the/supplied/PDF.pdf
 * SMARTMATCH_DEVICE=desktop|iphone|ipad, SMARTMATCH_QA_DIR=/tmp/qa.
 * No uploaded PDF or project data is stored in the repository.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createHash}=require('node:crypto');
const {PDFDocument,StandardFonts,PDFName,rgb}=require('../vendor/pdf-lib.min.js');
const root=path.resolve(__dirname,'..');
const playwright=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const devices=[{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true},{name:'ipad',width:1024,height:1366,touch:true}].filter(d=>!process.env.SMARTMATCH_DEVICE||d.name===process.env.SMARTMATCH_DEVICE);
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
 catch(_){res.writeHead(404);res.end();}
});
function pagesOf(value){
 const pages=[];
 for(const part of value.split(/[,;\s]+/).filter(Boolean)){const [a,b=a]=part.split('-').map(Number);for(let n=a;n<=b;n++)pages.push(n);}
 return [...new Set(pages)].sort((a,b)=>a-b);
}
function countsOf(items){const out={};for(const item of items)out[item.code]=(out[item.code]||0)+1;return out;}
async function alternateFixture(){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 const plan=pdf.addPage([612,792]);
 plan.drawText('Plan A',{x:50,y:750,size:20,font});
 for(const [i,code]of ['271B','271B','482C','271B1','X271B','STUDIO2'].entries())
  plan.drawText(code,{x:90+(i%2)*260,y:600-Math.floor(i/2)*120,size:18,font,color:i%2?rgb(.1,.3,.8):rgb(.8,.1,.1)});
 const card=(heading)=>{
  const p=pdf.addPage([612,792]);p.drawText(heading,{x:72,y:700,size:18,font});
  for(const [i,text]of ['Las ASSA EL580','Dorrautomatik ED100','Handtag HOPPE'].entries())p.drawText(text,{x:72,y:620-i*28,size:16,font});
 };
 card('Toalett 271B');
 const other=pdf.addPage([612,792]);other.drawText('Plan B',{x:50,y:750,size:20,font});other.drawText('STUDIO',{x:300,y:300,size:18,font,color:rgb(.1,.6,.2)});
 card('Dorrkort 482C');
 const cover=pdf.addPage([612,792]);cover.drawText('Introduction',{x:72,y:700,size:18,font});
 card('Beslagskort Studio');
 return {name:'alternate-layout',bytes:Buffer.from(await pdf.save()),pages:[2,4,6],codes:['271B','482C','STUDIO'],counts:{'271B':2,'482C':1,STUDIO:1},regions:{code:{x:.105,y:.085,w:.68,h:.06},table:{x:.105,y:.19,w:.70,h:.13}}};
}
async function makeContext(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:!!device.touch,isMobile:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 // Exercise the file-download fallback without opening the OS save dialog.
 await context.addInitScript(()=>{window.showSaveFilePicker=undefined;});
 return context;
}
async function exercise(browser,device,test){
 const context=await makeContext(browser,device),page=await context.newPage(),errors=[],remote=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(r.url()))remote.push(r.url());});
 const url='http://127.0.0.1:'+server.address().port+'/smartmatch-read-test-v3.html';
 const ready=async n=>{
  await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf()&&document.getElementById('pwScanOverlay').hidden,null,{timeout:90000});
  assert.equal(await page.evaluate(()=>SmartMatchAppBridge.getPositions().length),n,'the finished project contains only the reviewed drawing positions');
 };
 try{
  await page.goto(url);
  await page.locator('#pwFile').setInputFiles({name:test.name+'.pdf',mimeType:'application/pdf',buffer:test.bytes});
  await page.waitForSelector('#rtDialog[open]');
  assert.equal(await page.locator('#rtPage').inputValue(),'2','one example card is selected initially');
  assert.equal(await page.evaluate(()=>SmartMatchAppBridge.getPdf()),null,'opening the guide does not start legacy matching');
  assert.match(await page.locator('#rtGuide').textContent(),/1[\s\S]*2[\s\S]*3/,'guide contains numbered instructions');
  assert((await page.locator('#rtNextHint').textContent()).trim(),'the guide explains the next action');
  if(process.env.SMARTMATCH_QA_DIR){fs.mkdirSync(process.env.SMARTMATCH_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SMARTMATCH_QA_DIR,device.name+'-'+test.name+'-guide.png'),fullPage:true});}
  const cdp=device.touch?await context.newCDPSession(page):null;
  async function mark(kind,r){
   await page.locator('#rt'+kind).click();await page.locator('#rtCanvasBox').scrollIntoViewIfNeeded();
   const box=await page.locator('#rtCanvasBox').boundingBox();
   const start={x:box.x+box.width*r.x,y:box.y+box.height*r.y},end={x:start.x+box.width*r.w,y:start.y+box.height*r.h};
   if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});await page.mouse.up();}
  }
  await mark('Code',test.regions.code);await mark('Table',test.regions.table);
  await page.locator('#rtName').fill('Guide '+test.name);
  async function run(selector){
   await page.locator(selector).click();
   await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:180000}).catch(async err=>{throw Error(err.message+' Status: '+await page.locator('#rtStatus').textContent());});
  }
  await run('#rtDiscover');
  assert.deepEqual(pagesOf(await page.locator('#rtPages').inputValue()),test.pages,'one example discovers cards, excluding drawing and cover pages');
  assert.equal(await page.locator('.rtResult').count(),0,'discovery and table review are separate steps');
  await run('#rtPreview');
  assert.equal(await page.locator('.rtResult').count(),test.pages.length,'every proposed card is read independently');
  for(let i=0;i<test.pages.length;i++){
   const n=test.pages[i];assert.equal(await page.getByLabel('Beteckning sida '+n,{exact:true}).inputValue(),test.codes[i]);
   const work=await page.getByLabel('Arbetsrader sida '+n,{exact:true}).inputValue();
   for(const term of test.workTerms||['ED100','EL580','HOPPE'])assert(work.toUpperCase().includes(term),'card '+n+' includes table value '+term);
   assert.equal(work.split('\n').filter(line=>line.trim()).length,test.workRowCount||3,'the whole table has one work row per original row');
  }
  const total=Object.values(test.counts).reduce((sum,n)=>sum+n,0);
  assert.equal(await page.locator('.rtMatchRow').count(),total,'exact drawing codes match; near misses are excluded');
  console.log('PASS '+device.name+' '+test.name+': card discovery and '+total+' reviewed matches');
  assert(await page.locator('#rtStart').isDisabled(),'review is required before linking physical doors');
  await page.locator('.rtMatchRow button').first().click();
  await page.waitForSelector('#rtHitRect:not([hidden])');
  if(process.env.SMARTMATCH_QA_DIR){fs.mkdirSync(process.env.SMARTMATCH_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SMARTMATCH_QA_DIR,device.name+'-'+test.name+'-review.png'),fullPage:true});}
  await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await ready(total);
  const positions=await page.evaluate(()=>SmartMatchAppBridge.getPositions());
  assert.deepEqual(countsOf(positions),test.counts,'the project uses precisely the reviewed matches');
  const mapping=await page.evaluate(()=>SmartMatchAppBridge.getDoorCardMapping());
  for(let i=0;i<test.codes.length;i++)assert.equal(mapping[test.codes[i]],test.pages[i],'every code links to its own card page');
  assert(positions.every(p=>!test.pages.includes(p.page)),'cards never become drawing positions');
  console.log('PASS '+device.name+' '+test.name+': linked project');
  const same=positions.filter(p=>p.code===test.codes[0]);assert(same.length>=2);
  await page.locator('#pwMarkers [data-position-id="'+same[0].id+'"]').evaluate(el=>el.click());
  await page.waitForSelector('#pwProtocol[open]');
  const checks=page.locator('.rtWorkRow input');assert((await checks.count())>=3,'a drawing marker opens the card work list');
  await checks.first().check();
  assert.match(await page.locator('#pwProtocolPercent').textContent(),/\d+%/);
  assert.notEqual(await page.locator('#pwProtocolPercent').textContent(),'0% arbete');
  await page.locator('#pwProtocolClose').click();
  await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(p=>p.id===id)),same[1].id);
  assert.equal(await checks.first().isChecked(),false,'doors sharing a card have independent work status');
  await page.locator('#pwProtocolClose').click();
  const payload=await page.evaluate(()=>SmartMatchAppBridge.save());
  assert.equal(Object.values(payload.readTestData.checks).flatMap(Object.values).filter(Boolean).length,1);
  assert(Object.values(payload.instances).every(p=>p.progress===0),'read-test work does not modify legacy control answers');
  await page.reload();await ready(total);
  assert.equal(await page.evaluate(()=>Object.values(SmartMatchReadTest.payload().checks).flatMap(Object.values).filter(Boolean).length),1,'work and links survive a refresh');
  console.log('PASS '+device.name+' '+test.name+': separate work status and refresh');
  if(device.name==='desktop'&&test.name==='alternate-layout'){
   await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');
   const pending=page.waitForEvent('download',{timeout:90000});await page.locator('#smartExportBuild').click();
   const download=await pending,exported=fs.readFileSync(await download.path());
   const doc=await PDFDocument.load(exported),raw=doc.catalog.get(PDFName.of('TillsynoSmartMatchV30Data'));
   assert(raw?.decodeText,'saved PDF embeds the project');
   const data=JSON.parse(raw.decodeText());
   assert.deepEqual(data.readTestData.pages,test.pages);
   assert.equal(Object.values(data.readTestData.checks).flatMap(Object.values).filter(Boolean).length,1,'export includes per-door work');
   const exportedHash=createHash('sha256').update(exported).digest('hex');
   for(const staleLocal of [false,true]){
    const fresh=await makeContext(browser,device),reopened=await fresh.newPage();
    try{
     await reopened.goto(url);
     if(staleLocal){
      const stale={...data.readTestData,sourceId:exportedHash,checks:{}};
      await reopened.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:'tillsyno-read-test-v3-source:'+exportedHash,value:stale});
      assert.equal(await reopened.evaluate(key=>Object.values(JSON.parse(localStorage.getItem(key)).checks).length,'tillsyno-read-test-v3-source:'+exportedHash),0,'a conflicting local version exists before opening');
     }
     await reopened.locator('#pwFile').setInputFiles({name:'portable.pdf',mimeType:'application/pdf',buffer:exported});
     await reopened.waitForSelector('#rtDialog[open]');assert.equal(await reopened.locator('.rtMatchRow').count(),total);
     await reopened.locator('#rtMatchApproval').check();await reopened.locator('#rtStart').click();
     await reopened.waitForFunction(n=>SmartMatchAppBridge.getPositions().length===n&&document.getElementById('pwScanOverlay').hidden,total,{timeout:90000});
     assert.equal(await reopened.evaluate(()=>Object.values(SmartMatchReadTest.payload().checks).flatMap(Object.values).filter(Boolean).length),1,staleLocal?'explicit PDF open retains embedded work despite conflicting local data':'exported PDF restores work without local state');
    }finally{await fresh.close();}
   }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'OCR and files remain local to the application origin');
  console.log('PASS '+device.name+' '+test.name+': one example, card discovery, '+total+' exact links, separate door status, refresh'+(device.name==='desktop'&&test.name==='alternate-layout'?', portable PDF':''));
 }catch(error){
  console.error('Browser state:',await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,state:document.getElementById('pwState')?.textContent,positions:window.SmartMatchAppBridge?.getPositions().map(p=>p.code),dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id)})).catch(()=>null));
  if(process.env.SMARTMATCH_QA_DIR)await page.screenshot({path:path.join(process.env.SMARTMATCH_QA_DIR,device.name+'-'+test.name+'-failure.png'),fullPage:true}).catch(()=>{});
  throw error;
 }finally{await context.close();}
}
(async()=>{
 const tests=[await alternateFixture()];
 if(process.env.SMARTMATCH_REAL_PDF)tests.push({name:'uploaded-drawing',bytes:fs.readFileSync(process.env.SMARTMATCH_REAL_PDF),pages:[2,3,4,5,6,7,8],codes:['140C','VC','WC','HWC','130C','KONTOR','TEKNIK'],counts:{'140C':7,VC:3,WC:3,HWC:3,'130C':3,KONTOR:3,TEKNIK:3},workRowCount:9,workTerms:['ED100','EL580','ASSA','EA281','HOPPE','SAKERHETSGLAS','DORMAKABA','TS93','BEA'],regions:{code:{x:.13,y:.116,w:.50,h:.022},table:{x:.13,y:.139,w:.65,h:.191}}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
  for(const device of devices)for(const test of tests)await exercise(browser,device,test);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
