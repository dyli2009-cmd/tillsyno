/* Optional real-school TEST 7 regression. Set SMARTMATCH_SCHOOL_PDF to a local
 * PDF path. Customer files, OCR text and exported PDFs stay outside the repo.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,PDFName}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const input=process.env.SMARTMATCH_SCHOOL_PDF;
if(!input){console.log('SKIP TEST 7 school PDF: set SMARTMATCH_SCHOOL_PDF to a local file');process.exit(0);}
const bytes=fs.readFileSync(input),metadataKeys=['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'].map(PDFName.of);
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v7.html`;
const upload=(buffer,name)=>({name,mimeType:'application/pdf',buffer});
async function contextFor(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;
  window.__readCalls={capture:false,pages:{},workers:0,recognize:0,ocrPages:{}};window.__lastSearchRenderPage=null;
  const record=(page,key)=>{if(!window.__readCalls.capture)return;if(key==='render')window.__lastSearchRenderPage=page;const target=window.__readCalls.pages[page]||={getTextContent:0,getOperatorList:0,getAnnotations:0,render:0};target[key]++;};
  let pdfjs;
  Object.defineProperty(window,'pdfjsLib',{configurable:true,get:()=>pdfjs,set:value=>{
   pdfjs=new Proxy(value,{get(target,key){
    if(key!=='getDocument')return Reflect.get(target,key);
    return (...args)=>{
     const task=target.getDocument(...args);let wrappedPromise;
     return new Proxy(task,{get(task,key){
      if(key!=='promise'){const value=task[key];return typeof value==='function'?value.bind(task):value;}
      return wrappedPromise||=(task.promise.then(pdf=>{
       const pages=new Map();
       return new Proxy(pdf,{get(pdf,key){
        if(key!=='getPage'){const value=pdf[key];return typeof value==='function'?value.bind(pdf):value;}
        return async number=>{
         if(!pages.has(number)){
          const pg=await pdf.getPage(number);
          pages.set(number,new Proxy(pg,{get(pg,key){
           const value=pg[key];if(typeof value!=='function')return value;
           return (...args)=>{if(['getTextContent','getOperatorList','getAnnotations','render'].includes(key))record(number,key);return value.apply(pg,args);};
          }}));
         }
         return pages.get(number);
        };
       }});
      }));
     }});
    };
   }});
  }});
  let tesseract;
  Object.defineProperty(window,'Tesseract',{configurable:true,get:()=>tesseract,set:value=>{
   tesseract=new Proxy(value,{get(target,key){
    if(key!=='createWorker')return Reflect.get(target,key);
    return async(...args)=>{
     if(window.__readCalls.capture)window.__readCalls.workers++;
     const worker=await target.createWorker(...args);
     return new Proxy(worker,{get(target,key){
      const value=target[key];if(typeof value!=='function')return value;
      return (...args)=>{if(key==='recognize'&&window.__readCalls.capture){window.__readCalls.recognize++;const page=window.__lastSearchRenderPage;window.__readCalls.ocrPages[page]=(window.__readCalls.ocrPages[page]||0)+1;}return value.apply(target,args);};
     }});
    };
   }});
  }});
 });
 context.setDefaultTimeout(60000);
 return context;
}
async function setRect(page,kind,rect){
 for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel(kind+' '+label,{exact:true}).evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);
}
async function ready(page){
 await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===40&&document.getElementById('pwScanOverlay').hidden,null,{timeout:120000});
}
async function screenshot(page,suffix){
 if(!process.env.SMARTMATCH_QA_DIR)return;
 fs.mkdirSync(process.env.SMARTMATCH_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SMARTMATCH_QA_DIR,'school-v7-'+suffix+'.png'),fullPage:true});
}
function assertWork(work){
 assert.equal(work.length,3,'only three actual GS installation rows become work');
 assert(work.some(line=>/256/.test(line)),'GS fitting 256 is included');
 assert(work.some(line=>/trycke/i.test(line)&&/6696/.test(line)),'GS handle 6696 is included');
 assert(work.some(line=>/cylinder/i.test(line)&&/utsida/i.test(line)),'GS cylinder side is included');
 assert(!work.some(line=>/310-50|slutbleck|nödbeslag|kantregel|datum|beslagskod/i.test(line)),'DT products, empty products and metadata are excluded');
}
async function exportAndReopen(browser,page,firstId){
 await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');
 const downloading=page.waitForEvent('download',{timeout:120000});await page.locator('#smartExportBuild').click();
 const download=await downloading,exported=fs.readFileSync(await download.path()),pdf=await PDFDocument.load(exported);
 const raw=metadataKeys.map(key=>pdf.catalog.get(key)).find(Boolean);assert(raw?.decodeText,'project state is embedded in the exported PDF');
 const expected=JSON.parse(raw.decodeText()).readTestData;assertWork(Object.values(expected.cards)[0].work);
 assert.equal(Object.values(expected.checks||{}).flatMap(Object.values).filter(Boolean).length,1,'the export contains the completed GS installation');
 const fresh=await contextFor(browser,{width:1366,height:900}),opened=await fresh.newPage();
 try{
  await opened.goto(url());
  await opened.evaluate(()=>{
   window.__guideCalls=0;const show=HTMLDialogElement.prototype.showModal;
   HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')window.__guideCalls++;return show.call(this);};
   window.SmartMatchReadMatcher={...SmartMatchReadMatcher,scan:()=>{throw Error('A saved school project must open without scanning');}};
  });
  await opened.locator('#pwFile').setInputFiles(upload(exported,'reviewed-school-project.pdf'));await ready(opened);
  assert.equal(await opened.evaluate(()=>window.__guideCalls),0,'a fresh browser opens the reviewed school directly');
  const restored=await opened.evaluate(()=>SmartMatchReadTest.payload());assert.deepEqual(restored.cards,expected.cards);
  assert.equal(Object.values(restored.checks||{}).flatMap(Object.values).filter(Boolean).length,1);
  await opened.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),firstId);
  await opened.waitForSelector('#pwProtocol[open]');assert(await opened.getByRole('checkbox',{name:/Klar:.*Trycke.*6696/i}).isChecked(),'the saved GS check remains visible');
  console.log('PASS school TEST 7: portable project export and fresh direct reopening without review or scanning');
 }finally{await fresh.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,context,page;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
  context=await contextFor(browser,{width:1366,height:900});page=await context.newPage();const errors=[],remote=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(request.url()))remote.push(request.url());});
  await page.goto(url());
  await page.locator('#pwFile').setInputFiles(upload(bytes,'school-local-test.pdf'));await page.waitForSelector('#rtDialog[open]',{timeout:90000});
  assert.equal(await page.locator('#rtImageMode').inputValue(),'auto');assert.equal(await page.locator('#rtWorkPolicy').inputValue(),'gs');
  await page.locator('#rtPage').fill('2');await page.locator('#rtPage').dispatchEvent('change');
  await page.waitForFunction(()=>document.getElementById('rtPage').value==='2');
  await setRect(page,'Kod',{x:.056,y:.059,w:.07,h:.015});await setRect(page,'Tabell',{x:.056,y:.10,w:.522,h:.46});
  await page.evaluate(()=>{window.__readCalls={capture:true,pages:{},workers:0,recognize:0,ocrPages:{}};});
  const started=Date.now();await page.locator('#rtDiscover').click();
  await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:180000});
  const discoveryCalls=await page.evaluate(()=>JSON.parse(JSON.stringify(window.__readCalls)));
  assert.equal(await page.locator('#rtPages').inputValue(),'2','only the real card page is proposed');
  assert.equal(await page.locator('#rtDiscoveryResults .rtPageChoice input:checked').count(),1);
  assert(discoveryCalls.recognize>0,'the scanned code and table use real local OCR');
  assert.equal(discoveryCalls.ocrPages['1']||0,0,'card discovery does not OCR the huge drawing');
  await page.locator('#rtPreview').click();await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:180000});
  const calls=await page.evaluate(()=>{window.__readCalls.capture=false;return window.__readCalls;});
  assert.equal(calls.recognize,discoveryCalls.recognize,'preview reuses discovered card OCR instead of reading it again');
  assert.equal(calls.ocrPages['1']||0,0,'stamp matching does not OCR the huge drawing');
  assert.equal(await page.getByLabel('Beteckning kort 1',{exact:true}).inputValue(),'GS23');
  assertWork((await page.getByLabel('Arbetsrader kort 1',{exact:true}).inputValue()).split('\n').filter(Boolean));
  assert.equal(await page.locator('.rtMatchRow').count(),40,'all forty exact annotation stamps are linked');
  await screenshot(page,'review');console.log('PASS school TEST 7: discovery + cached preview '+(Date.now()-started)+' ms; '+JSON.stringify(calls));
  await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await ready(page);
  const data=await page.evaluate(()=>SmartMatchReadTest.payload());assertWork(Object.values(data.cards)[0].work);
  assert.equal(data.matching.pages[0].scanMode,'stamp-index');assert.equal(data.matching.pages[0].imageSkipped,true);
  const positions=await page.evaluate(()=>SmartMatchAppBridge.getPositions());assert(positions.every(position=>position.code==='GS23'&&position.page===1));
  const first=positions[0],second=positions[1];
  await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),first.id);await page.waitForSelector('#pwProtocol[open]');
  assert.equal(await page.locator('.rtWorkRow input').count(),3);
  await page.getByRole('checkbox',{name:/Klar:.*Trycke.*6696/i}).check();
  await page.waitForFunction(id=>SmartMatchAppBridge.getPositions().find(position=>position.id===id).doneMinutes===10,first.id);
  const checked=await page.evaluate(id=>{const position=SmartMatchAppBridge.getPositions().find(position=>position.id===id);return {position,state:SmartMatchAppBridge.readWorkState(position)};},first.id);
  assert.equal(checked.state.done,1);assert.equal(checked.state.total,3);assert.equal(checked.state.doneMinutes,10);assert.equal(checked.state.estimatedMinutes,30);assert.equal(checked.position.progress,checked.state.percent);
  assert.equal(await page.locator('#pwProtocolPercent').textContent(),checked.state.percent+'% arbete','custom work and main progress agree');
  await screenshot(page,'work');await page.locator('#pwProtocolClose').click();
  await page.locator('#pwTimeReport').click();await page.waitForSelector('#pwTimeDialog[open]');
  await page.waitForFunction(()=>document.getElementById('pwTimeDone').textContent.includes('10 min'));
  assert.equal(await page.locator('#pwTimeTotal').textContent(),'20 h','time report includes 40 doors × 30 known GS minutes');
  assert.equal(await page.locator('#pwTimeDone').textContent(),'10 min','GS check feeds the shared time report');
  assert.equal(await page.locator('#pwTimeUnknown').textContent(),'40','fittings without an estimate are reported explicitly');
  await page.locator('#pwTimeClose').click();
  await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),second.id);await page.waitForSelector('#pwProtocol[open]');
  assert.equal(await page.getByRole('checkbox',{name:/Klar:.*Trycke.*6696/i}).isChecked(),false,'another physical door has independent GS checks');await page.locator('#pwProtocolClose').click();
  await exportAndReopen(browser,page,first.id);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'PDF and OCR processing stays on the app origin');
  console.log('PASS school TEST 7: 40 doors, three GS jobs, independent checks and shared progress/time');
 }catch(error){
  if(page){console.error('School state:',await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,state:document.getElementById('pwState')?.textContent,work:[...document.querySelectorAll('.rtResult textarea')].map(node=>node.value),calls:window.__readCalls})).catch(()=>null));await screenshot(page,'failure').catch(()=>{});}throw error;
 }finally{if(context)await context.close();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
