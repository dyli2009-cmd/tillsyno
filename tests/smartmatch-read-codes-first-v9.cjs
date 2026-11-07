/* TEST 9: code-only discovery/matching, a portable pending project, and a later
 * product read that preserves reviewed links. Uses generated PDF documents.
 * SMARTMATCH_DEVICE=desktop|ipad limits viewport coverage.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),artifacts=fs.mkdtempSync(path.join(os.tmpdir(),'smartmatch-codes-first-v9-'));
const devices=[{name:'desktop',width:1366,height:900},{name:'ipad',width:820,height:1180,touch:true}].filter(device=>!process.env.SMARTMATCH_DEVICE||device.name===process.env.SMARTMATCH_DEVICE);
const metadataKeys=['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'].map(PDFName.of);
const codeRect={x:.08,y:.08,w:.78,h:.06},tableRect={x:.06,y:.20,w:.89,h:.35};
const rows=[['Låshus','ASSA EL580','GS','GS'],['Trycke','HOPPE','DT','GS'],['Slutbleck','ASSA 1487','GS','DT'],['Dörrautomatik','ED100','DT','DT']];
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9.html`;
const upload=(bytes,name='generated-project.pdf')=>({name,mimeType:'application/pdf',buffer:bytes});
async function fixture(page){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),plan=doc.addPage([9536,4768]),annotations=[];
 const stamps=[['GS 23',650,3500],['GS 23',6000,1600],['dbl-ds',2000,2700],['DBLb-OPPS',5000,3300]];
 for(const [index,[label,x,y]]of stamps.entries()){
  plan.drawText(label,{x,y,size:70,font,color:rgb(.1,.3,.6)});
  annotations.push(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText(label),Contents:PDFHexString.fromText(''),Rect:[x-2,y-3,x+500,y+110],F:4,NM:PDFHexString.fromText('generated-'+index)})));
 }
 plan.drawText('GS230',{x:1600,y:700,size:70,font});
 plan.node.set(PDFName.of('Annots'),doc.context.obj(annotations));
 const logoData=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=100;canvas.height=50;const ctx=canvas.getContext('2d');ctx.fillStyle='#ddd';ctx.fillRect(0,0,100,50);ctx.fillStyle='#111';ctx.fillText('Unrelated image',4,25);return canvas.toDataURL('image/png').split(',')[1];});
 const logo=await doc.embedPng(Buffer.from(logoData,'base64'));plan.drawImage(logo,{x:7000,y:100,width:1000,height:500});
 for(const code of ['GS23','DBL-DS','DBLB OPPSD','WC2']){
  const card=doc.addPage([595,842]);card.drawText('Beslagskod: '+code,{x:60,y:750,size:20,font});
  const columns=[40,190,350,460];
  for(const [i,label]of ['Komponent','Produkt','Levereras av','Monteras av'].entries())card.drawText(label,{x:columns[i],y:650,size:11,font});
  for(const [row,values]of rows.entries())for(const [col,value]of values.entries())card.drawText(value,{x:columns[col],y:620-row*45,size:12,font});
  card.drawImage(logo,{x:40,y:60,width:500,height:150});
 }
 return Buffer.from(await doc.save());
}
async function contextFor(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__calls={capture:false,pages:{},workers:0,recognize:0,scans:[],work:0,guides:0};
  const record=(page,key)=>{if(!window.__calls.capture)return;const target=window.__calls.pages[page]||={getTextContent:0,getOperatorList:0,getAnnotations:0,render:0};target[key]++;};
  let pdfjs;Object.defineProperty(window,'pdfjsLib',{configurable:true,get:()=>pdfjs,set:value=>{
   pdfjs=new Proxy(value,{get(target,key){if(key!=='getDocument')return Reflect.get(target,key);return(...args)=>{
    const task=target.getDocument(...args);let wrapped;return new Proxy(task,{get(task,key){if(key!=='promise'){const value=task[key];return typeof value==='function'?value.bind(task):value;}
     return wrapped||=(task.promise.then(pdf=>{const pages=new Map();return new Proxy(pdf,{get(pdf,key){if(key!=='getPage'){const value=pdf[key];return typeof value==='function'?value.bind(pdf):value;}return async number=>{
      if(!pages.has(number)){const pg=await pdf.getPage(number);pages.set(number,new Proxy(pg,{get(pg,key){const value=pg[key];if(typeof value!=='function')return value;return(...args)=>{if(['getTextContent','getOperatorList','getAnnotations','render'].includes(key))record(number,key);return value.apply(pg,args);};}}));}return pages.get(number);
     };}});}));
    }});
   };}});
  }});
  let tesseract;Object.defineProperty(window,'Tesseract',{configurable:true,get:()=>tesseract,set:value=>{tesseract=new Proxy(value,{get(target,key){if(key!=='createWorker')return Reflect.get(target,key);return async(...args)=>{window.__calls.workers++;const worker=await target.createWorker(...args);return new Proxy(worker,{get(target,key){const value=target[key];if(typeof value!=='function')return value;return(...args)=>{if(key==='recognize')window.__calls.recognize++;return value.apply(target,args);};}});};}});}});
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:value=>{matcher={...value,scan:options=>{window.__calls.scans.push({imageMode:options.imageMode,codes:options.codes});if(window.__forbidScan)throw Error('Saved links must not be scanned again');return value.scan(options);}};}});
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:value=>{work={...value,read:options=>{window.__calls.work++;return value.read(options);}};}});
  const show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')window.__calls.guides++;return show.call(this);};
 });
 return context;
}
async function setRect(page,kind,rect){for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel(kind+' '+label,{exact:true}).evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);}
async function idle(page){await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:90000});}
async function ready(page,count=3){await page.waitForFunction(count=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===count&&document.getElementById('pwScanOverlay').hidden,count,{timeout:90000});}
const payload=page=>page.evaluate(()=>SmartMatchReadTest.payload());
async function exportProject(page){await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');const downloading=page.waitForEvent('download',{timeout:90000});await page.locator('#smartExportBuild').click();const download=await downloading;return fs.readFileSync(await download.path());}
async function projectData(bytes){const pdf=await PDFDocument.load(bytes),raw=metadataKeys.map(key=>pdf.catalog.get(key)).find(Boolean);assert(raw?.decodeText,'export embeds project state');return JSON.parse(raw.decodeText());}
async function assertPending(page,expectedCards){
 const data=await payload(page),cards=Object.values(data.cards);assert.equal(data.phase,'codes');assert.equal(cards.length,expectedCards);
 for(const card of cards){assert.equal(card.workState,'pending');assert.deepEqual(card.work,[]);assert.equal(card.tableRect,null);assert(!card.rawTable,'table text is not prepared in code-only phase');}
 const positions=await page.evaluate(()=>SmartMatchAppBridge.getPositions());
 for(const position of positions){const state=await page.evaluate(id=>SmartMatchAppBridge.readWorkState(SmartMatchAppBridge.getPositions().find(p=>p.id===id)),position.id);assert.notEqual(state?.percent,100,'unread work must not be complete');}
 const marker=page.locator('#pwMarkers button[data-position-id]').first(),clickedId=await marker.getAttribute('data-position-id');await marker.click();await page.waitForSelector('#pwProtocol[open]');await page.waitForFunction(()=>!!document.getElementById('pwProtocolCanvas')?.dataset.readCardId);
 const opened=await page.locator('#pwProtocolCanvas').getAttribute('data-read-card-id'),position=positions.find(position=>position.id===clickedId),linked=cards.find(card=>card.code===position.code||card.page===position.cardPage);
 assert(linked,'position has its corresponding source card');assert.equal(opened,linked.id,'clicking a drawing position opens its own card');
 assert.equal(await page.locator('.rtWorkRow input').count(),0,'pending products offer no artificial checklist');assert(!/100\s*%/.test(await page.locator('#pwProtocolPercent').textContent()));
 await page.locator('#pwProtocolClose').click();assert(await page.locator('#pwReadContinueProducts').isVisible(),'later product read is available');return data;
}
async function exercise(browser,device,input){
 const context=await contextFor(browser,device),page=await context.newPage(),errors=[],remote=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(request.url()))remote.push(request.url());});
 try{
  await page.goto(url());await page.locator('#pwFile').setInputFiles(upload(input,'code-first-source.pdf'));await page.waitForSelector('#rtDialog[open]');
  assert.equal(await page.locator('#rtReadPhase').inputValue(),'codes','new flow defaults to matching identifiers first');await setRect(page,'Kod',codeRect);
  assert(await page.locator('#rtDiscover').isEnabled(),'only the code crop is needed for discovery');assert(await page.locator('#rtPreview').isEnabled(),'only the code crop is needed for reading');
  await page.evaluate(()=>{window.__calls.capture=true;});await page.locator('#rtDiscover').click();await idle(page);
  assert.equal(await page.locator('#rtDiscoveryResults .rtPageChoice input:checked').count(),4,'one code example finds the four other header locations without reading product tables');
  await page.locator('#rtPreview').click();await idle(page);
  const codes=await page.locator('.rtResult input[aria-label^="Beteckning kort"]').evaluateAll(nodes=>nodes.map(node=>node.value));assert.deepEqual(codes,['GS23','DBLDS','DBLBOPPSD','WC2'],'full free-form identifiers retain every actual letter');
  assert.equal(await page.locator('.rtMatchRow').count(),3,'two GS23 instances and one DBL-DS instance match');assert.match(await page.locator('#rtMatchCount').textContent(),/4 avlästa kort.*3 valda ritningspositioner.*2 kort utan träff/,'the review distinguishes source cards, physical positions, and unmatched cards');
  const labels=await page.locator('.rtMatchRow').allTextContents();assert.equal(labels.filter(text=>text.includes('GS23')).length,2);assert.equal(labels.filter(text=>text.includes('DBLDS')).length,1);assert(!labels.some(text=>text.includes('DBLBOPPSD')),'extra D is never dropped to force a match');
  const calls=await page.evaluate(()=>{window.__calls.capture=false;return structuredClone(window.__calls);});assert.equal(calls.work,0,'matching does not invoke the product responsibility parser');assert.equal(calls.workers,0,'missing plan codes and unrelated images cannot start OCR');assert.equal(calls.recognize,0);assert.equal(calls.scans.length,1);
  for(const counts of Object.values(calls.pages))assert.equal(counts.render,0,'native code matching never renders search canvases');
  await page.screenshot({path:path.join(artifacts,device.name+'-review.png'),fullPage:true});await page.locator('#rtMatchApproval').check();await page.evaluate(()=>{window.__calls.pages={};window.__calls.capture=true;});await page.locator('#rtStart').click();await ready(page);
  const handoff=await page.evaluate(()=>{window.__calls.capture=false;return window.__calls.pages;});for(const counts of Object.values(handoff))assert.equal(counts.getTextContent,0,'the prepared codes/positions do not trigger a second page-text pass on opening the project');
  const pending=await assertPending(page,4),positions=await page.evaluate(()=>SmartMatchAppBridge.getPositions()),ids=positions.map(position=>position.id),matching=structuredClone(pending.matching);
  const exported=await exportProject(page),saved=await projectData(exported);assert.equal(saved.readTestData.phase,'codes');assert(Object.values(saved.readTestData.cards).every(card=>card.workState==='pending'),'unread products remain pending inside the PDF');
  const fresh=await contextFor(browser,device),reopened=await fresh.newPage(),reopenErrors=[];reopened.on('pageerror',error=>reopenErrors.push(error.message));
  try{
   await reopened.goto(url());await reopened.evaluate(()=>{window.__forbidScan=true;});await reopened.locator('#pwFile').setInputFiles(upload(exported,'reviewed-pending-products.pdf'));await ready(reopened);assert.equal(await reopened.evaluate(()=>window.__calls.guides),0,'saved pending project opens directly');assert.equal(await reopened.evaluate(()=>window.__calls.scans.length),0,'opening a reviewed project never scans again');
   const restored=await assertPending(reopened,4);assert.deepEqual(restored.cards,pending.cards);assert.deepEqual(restored.matching,matching);
   await reopened.locator('#pwReadContinueProducts').click();await reopened.waitForSelector('#rtDialog[open]');await setRect(reopened,'Tabell',tableRect);assert(await reopened.locator('#rtPreview').isEnabled());assert(await reopened.locator('#rtStart').isDisabled(),'marking a product region alone does not count as reading it');
   await reopened.locator('#rtCancel').click();await ready(reopened);assert.deepEqual((await payload(reopened)).cards,restored.cards,'cancelling the later read retains all pending source cards');assert.deepEqual((await payload(reopened)).matching,matching,'cancelling the later read retains the reviewed links');
   await reopened.locator('#pwReadContinueProducts').click();await reopened.waitForSelector('#rtDialog[open]');await setRect(reopened,'Tabell',tableRect);assert.equal(await reopened.locator('#rtWorkPolicy').inputValue(),'gs','a deferred first product read defaults to GS installation work');
   await reopened.locator('#rtPreview').click();await idle(reopened);
   const gs=await reopened.getByLabel('Arbetsrader kort 1',{exact:true}).inputValue();assert(gs.includes('EL580'));assert(gs.includes('HOPPE'));assert(!gs.includes('1487'));assert(!gs.includes('ED100'));
   assert.equal(await reopened.evaluate(()=>window.__calls.scans.length),0,'continuing with products does not repeat matching');await reopened.locator('#rtStart').click();await ready(reopened);
   const completed=await payload(reopened);assert(Object.values(completed.cards).every(card=>card.workState!=='pending'),'product read clears the pending state');assert.deepEqual(completed.matching,matching,'product read retains reviewed matches exactly');assert.deepEqual(await reopened.evaluate(()=>SmartMatchAppBridge.getPositions().map(position=>position.id)),ids,'physical drawing links keep their identities');
   await reopened.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),ids[0]);await reopened.waitForSelector('#pwProtocol[open]');assert.equal(await reopened.locator('.rtWorkRow input').count(),2);await reopened.locator('.rtWorkRow input').first().check();await reopened.waitForFunction(()=>document.getElementById('pwProtocolPercent').textContent==='67% arbete');await reopened.locator('#pwProtocolClose').click();
   await reopened.screenshot({path:path.join(artifacts,device.name+'-products.png'),fullPage:true});
   const productExport=await projectData(await exportProject(reopened));assert.deepEqual(productExport.readTestData.matching,matching,'saving products preserves the original links');assert(Object.values(productExport.readTestData.cards).every(card=>card.workState!=='pending'),'the saved PDF retains the completed product read');assert.equal(Object.values(productExport.readTestData.checks||{}).flatMap(Object.values).filter(Boolean).length,1,'the saved PDF retains the later per-door work check');assert.deepEqual(reopenErrors,[]);
  }finally{await fresh.close();}
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'all reader and PDF assets are served locally');console.log('PASS '+device.name+': code-only 4 cards / 3 links, no OCR/products, reviewed pending PDF direct open, deferred GS work without rematching');
 }catch(error){console.error('Browser state:',await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,state:document.getElementById('pwState')?.textContent,calls:window.__calls,cards:[...document.querySelectorAll('.rtResult')].map(node=>node.innerText),dialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id)})).catch(()=>null));throw error;}
 finally{await context.close();}
}
async function legacyFull(browser,input){
 const context=await contextFor(browser,devices[0]),page=await context.newPage();try{
  await page.goto(url());await page.locator('#pwFile').setInputFiles(upload(input));await page.waitForSelector('#rtDialog[open]');await page.locator('#rtReadPhase').selectOption('full');await setRect(page,'Kod',codeRect);assert(await page.locator('#rtPreview').isDisabled(),'the retained full method still requires the table');await setRect(page,'Tabell',tableRect);
  await page.locator('#rtImageMode').selectOption('text');await page.locator('#rtPreview').click();await idle(page);assert((await page.getByLabel('Arbetsrader kort 1',{exact:true}).inputValue()).includes('EL580'));assert.equal(await page.locator('.rtMatchRow').count(),2,'the old full method remains available for one selected card');console.log('PASS retained full card/product reading');
 }finally{await context.close();}
}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
 const creatorContext=await contextFor(browser,{width:1366,height:900}),creator=await creatorContext.newPage();await creator.goto(url());const input=await fixture(creator);await creatorContext.close();for(const device of devices)await exercise(browser,device,input);await legacyFull(browser,input);console.log('QA screenshots: '+artifacts);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
