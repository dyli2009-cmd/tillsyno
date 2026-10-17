/* Avläsning TEST 9.1: visible, stage-specific progress without changing matches.
 * Generated PDFs only. PDF calls are delayed deterministically; OCR is stubbed
 * here because this suite checks progress/cancellation rather than OCR quality.
 * SMARTMATCH_DEVICE=desktop|ipad|iphone limits responsive coverage.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),artifacts=fs.mkdtempSync(path.join(os.tmpdir(),'smartmatch-read-progress-v9-1-'));
const devices=[{name:'desktop',width:1366,height:900},{name:'ipad',width:820,height:1180,touch:true},{name:'iphone',width:390,height:844,touch:true}].filter(device=>!process.env.SMARTMATCH_DEVICE||device.name===process.env.SMARTMATCH_DEVICE);
const codeRect={x:.08,y:.08,w:.78,h:.06},tableRect={x:.06,y:.20,w:.89,h:.35};
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
const url=entry=>`http://127.0.0.1:${server.address().port}/${entry||'smartmatch-read-test-v9-1.html'}`;
const upload=bytes=>({name:'generated-progress.pdf',mimeType:'application/pdf',buffer:bytes});
async function fixture(count=7){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),plan=doc.addPage([1200,600]),annotations=[];
 for(const [index,[code,x,y]] of [['GS 23',150,400],['GS23',700,220],['DBLb-OPPS',450,350]].entries()){
  plan.drawText(code,{x,y,size:24,font});
  annotations.push(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText(code),Rect:[x-2,y-3,x+170,y+32],F:4,NM:PDFHexString.fromText('progress-'+index)})));
 }
 plan.node.set(PDFName.of('Annots'),doc.context.obj(annotations));
 for(let number=2;number<=count;number++){
  const code=count===2||number===6?'GS23':number===7?'DBLB OPPSD':'GS'+number,card=doc.addPage([595,842]);
  card.drawText('Beslagskod: '+code,{x:60,y:750,size:20,font});
  const columns=[40,190,350,460];
  const values=[['Komponent','Produkt','Levereras av','Monteras av'],['Lashus','EL580','GS','GS'],['Trycke','HOPPE','DT','GS'],['Slutbleck','1487','GS','DT']];
  for(const [row,items] of values.entries())for(const [column,text]of items.entries())card.drawText(text,{x:columns[column],y:650-row*35,size:11,font});
 }
 return Buffer.from(await doc.save());
}
async function contextFor(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__delay=0;window.__calls={workers:0,recognize:0,work:0};window.__ocrMode='normal';window.__late=[];window.__progress=[];
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let pdfjs;Object.defineProperty(window,'pdfjsLib',{configurable:true,get:()=>pdfjs,set:value=>{
   pdfjs=new Proxy(value,{get(target,key){if(key!=='getDocument')return Reflect.get(target,key);return(...args)=>{
    const task=target.getDocument(...args);let promise;return new Proxy(task,{get(task,key){if(key!=='promise'){const value=task[key];return typeof value==='function'?value.bind(task):value;}
     return promise||=(task.promise.then(pdf=>new Proxy(pdf,{get(pdf,key){if(key!=='getPage'){const value=pdf[key];return typeof value==='function'?value.bind(pdf):value;}
      return async number=>{if(window.__delay)await delay(window.__delay);return pdf.getPage(number);};
     }})));
    }});
   };}});
  }});
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:value=>{work={...value,read:options=>{window.__calls.work++;return value.read(options);}};}});
  window.Tesseract={async createWorker(_language,_mode,options){
   window.__calls.workers++;let parameters={};
   return {async setParameters(value){parameters=value;},async terminate(){},async recognize(canvas){
    window.__calls.recognize++;const logger=options.logger;
    if(window.__ocrMode==='fail')throw Error('Avsiktligt OCR-fel i browsertest');
    if(window.__ocrMode==='hang')return new Promise(resolve=>window.__late.push(()=>{logger({status:'recognizing text',progress:.95});resolve({data:{text:'GS23',confidence:98,words:[]}});}));
    for(const progress of [.2,.6,1]){logger({status:'recognizing text',progress});await delay(250);}
    const text=parameters.tessedit_pageseg_mode===7?'GS23':'';
    return {data:{text,confidence:98,words:text?[{text,confidence:98,bbox:{x0:10,y0:10,x1:Math.min(canvas.width-1,100),y1:Math.min(canvas.height-1,30)}}]:[]}};
   }};
  }};
  const observe=()=>{
   const target=document.getElementById('rtDialog');if(!target||target.__observed)return;target.__observed=true;
   let previous='';const record=()=>{
    const get=id=>document.getElementById(id),node=get('rtReadProgress');if(!node)return;
    const state={title:get('rtReadProgressTitle')?.textContent||'',detail:get('rtReadProgressDetail')?.textContent||'',local:get('rtReadProgressLocal')?.textContent||'',percent:get('rtReadProgressPercent')?.textContent||'',time:get('rtReadProgressTime')?.textContent||'',value:get('rtReadProgressMeter')?.getAttribute('value'),max:get('rtReadProgressMeter')?.getAttribute('max'),hidden:node.hidden,status:get('rtStatus')?.textContent||''};
    const key=JSON.stringify(state);if(key!==previous){previous=key;window.__progress.push({...state,at:performance.now()});}
   };
   new MutationObserver(record).observe(target,{subtree:true,childList:true,characterData:true,attributes:true});record();
  };
  new MutationObserver(observe).observe(document,{subtree:true,childList:true});
 });
 return context;
}
async function setRect(page,kind,rect){for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel(kind+' '+label,{exact:true}).evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);}
async function pages(page,value){await page.locator('#rtPages').evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function idle(page){await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:90000});}
async function ready(page,count=2){await page.waitForFunction(count=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===count&&document.getElementById('pwScanOverlay').hidden,count,{timeout:90000});}
const snapshots=page=>page.evaluate(()=>structuredClone(window.__progress));
const snapshot=page=>page.evaluate(()=>{const get=id=>document.getElementById(id);return {title:get('rtReadProgressTitle')?.textContent,detail:get('rtReadProgressDetail')?.textContent,local:get('rtReadProgressLocal')?.textContent,percent:get('rtReadProgressPercent')?.textContent,time:get('rtReadProgressTime')?.textContent,value:get('rtReadProgressMeter')?.getAttribute('value'),hidden:get('rtReadProgress')?.hidden};});
async function clear(page,delay=350){await page.evaluate(delay=>{window.__progress=[];window.__delay=delay;},delay);}
async function open(page,bytes,entry){await page.goto(url(entry));await page.locator('#pwFile').setInputFiles(upload(bytes));await page.waitForSelector('#rtDialog[open]');await setRect(page,'Kod',codeRect);}
async function waitProgress(page,pattern){await page.waitForFunction(source=>{const get=id=>document.getElementById(id),node=get('rtReadProgress'),text=['rtReadProgressTitle','rtReadProgressDetail','rtReadProgressLocal'].map(id=>get(id)?.textContent||'').join(' ');return node&&!node.hidden&&new RegExp(source,'i').test(text);},pattern.source,{timeout:15000});}
async function layout(page,device,label){
 await page.locator('#rtReadProgress').scrollIntoViewIfNeeded();
 const bounds=await page.locator('#rtReadProgress').evaluate(node=>{const box=node.getBoundingClientRect(),dialog=document.getElementById('rtDialog');return {x:box.x,right:box.right,width:box.width,viewport:innerWidth,scroll:dialog.scrollWidth,client:dialog.clientWidth};});
 assert(bounds.x>=-1&&bounds.right<=bounds.viewport+1,'progress fits '+device.name);assert(bounds.scroll<=bounds.client+1,'dialog has no horizontal overflow '+device.name);
 await page.screenshot({path:path.join(artifacts,device.name+'-'+label+'.png'),fullPage:true});
}
function assertProgress(records,kind){
 const visible=records.filter(record=>!record.hidden);assert(visible.length>2,kind+' exposes changing progress');
 assert(visible.some(record=>/\d/.test(record.time)),kind+' exposes elapsed time');
 assert(visible.some(record=>record.value!==null&&Number(record.value)>0&&Number(record.value)<Number(record.max||100)),kind+' advances measured stage work');
 for(const record of visible){if(record.value!==null){assert(Number(record.value)>=0);assert(Number(record.value)<=Number(record.max||100));}}
}
async function nativeFlow(browser,device,input,entry){
 const context=await contextFor(browser,device),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await open(page,input,entry);assert.equal(await page.locator('#rtReadPhase').inputValue(),'codes');await clear(page,420);
  await page.locator('#rtDiscover').click();await waitProgress(page,/kod|dörrkort/);await page.waitForFunction(()=>Number(document.getElementById('rtReadProgressMeter').getAttribute('value'))>0);await layout(page,device,'discovery');await idle(page);
  const discovery=await snapshots(page);assertProgress(discovery,'discovery');assert(discovery.some(record=>/sida\s*6\b/i.test(record.detail+' '+record.title)),'discovery identifies actual PDF page 6');
  assert(discovery.some(record=>/återstår.*(?:beräkn|uppskatt)|(?:beräkn|uppskatt).*återstår|återstående.*(?:beräkn|uppskatt)/i.test(record.time)),'initial ETA explicitly waits for timing evidence');
  assert(discovery.some(record=>/ungefär\s+\d+.*kvar i detta steg/i.test(record.time)),'ETA uses completed work once available');
  await pages(page,'6,7');assert.equal(await page.locator('#rtDiscoveryResults .rtPageChoice').count(),0,'manual pages use the direct code-only route, with no table marked');await clear(page,420);await page.locator('#rtPreview').click();await waitProgress(page,/kod|kort/);await layout(page,device,'codes');await idle(page);
  const codeProgress=await snapshots(page);assertProgress(codeProgress,'code and drawing read');
  assert(codeProgress.some(record=>/sida\s*6\b/i.test(record.detail+' '+record.title)),'manual selection still says actual PDF page 6');
  assert(codeProgress.some(record=>/PDF-sida 6 \(1 av 2 kort\)/i.test(record.detail)),'actual page number and selected-card ordinal are separate');
  assert(codeProgress.some(record=>/kod/i.test(record.title+' '+record.detail)&&/återstående tid beräknas/i.test(record.time)),'a new stage starts without reusing the previous ETA');
  assert(codeProgress.some(record=>/ritning|stämp/i.test(record.title+' '+record.detail)),'drawing is a distinct phase');
  const codes=await page.locator('.rtResult input[aria-label^="Beteckning kort"]').evaluateAll(nodes=>nodes.map(node=>node.value));assert.deepEqual(codes,['GS23','DBLBOPPSD']);assert.equal(await page.locator('.rtMatchRow').count(),2,'strict actual letters retain only the two GS23 links');
  assert.deepEqual(await page.evaluate(()=>window.__calls),{workers:0,recognize:0,work:0},'code-only fast mode reads no products and starts no OCR');
  const frozen=await snapshot(page);await page.waitForTimeout(1200);assert.deepEqual(await snapshot(page),frozen,'completed elapsed time remains frozen');
  await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await ready(page);
  const initial=await page.evaluate(()=>SmartMatchReadTest.payload());assert(Object.values(initial.cards).every(card=>card.workState==='pending'));
  await page.locator('#pwReadContinueProducts').click();await page.waitForSelector('#rtDialog[open]');await setRect(page,'Tabell',tableRect);await clear(page,650);await page.locator('#rtPreview').click();await waitProgress(page,/arbetslista|tabell|produkt/);await layout(page,device,'products');await idle(page);
  const productProgress=await snapshots(page);assertProgress(productProgress,'products');assert(productProgress.some(record=>/sida\s*6\b/i.test(record.detail+' '+record.title)));assert(!productProgress.some(record=>/söker.*ritning|läser ritning|bildläser ritning/i.test(record.title+' '+record.detail)),'deferred products do not repeat drawing search');
  const gs=await page.getByLabel('Arbetsrader kort 1',{exact:true}).inputValue();assert(gs.includes('EL580'));assert(gs.includes('HOPPE'));assert(!gs.includes('1487'),'DT installation remains excluded');
  await page.locator('#rtStart').click();await ready(page);assert.deepEqual((await page.evaluate(()=>SmartMatchReadTest.payload())).matching,initial.matching,'progress leaves saved links unchanged');
  assert.deepEqual(errors,[]);console.log('PASS '+device.name+' '+(entry||'versioned')+': page-aware discovery/codes/products, measured progress/ETA, frozen completion, strict links and GS rule');
 }catch(error){console.error('Progress QA state:',await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,progress:window.__progress,calls:window.__calls})).catch(()=>null));throw error;}
 finally{await context.close();}
}
async function imageFlow(browser,input){
 const device={name:'desktop-ocr',width:1366,height:900},context=await contextFor(browser,device),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await open(page,input);await page.locator('#rtImageMode').selectOption('full');await clear(page,180);await page.locator('#rtPreview').click();await waitProgress(page,/bildläs/);await page.waitForFunction(()=>/20\s*%|60\s*%/.test(document.getElementById('rtReadProgressLocal').textContent));await layout(page,device,'reading');await idle(page);
  const records=await snapshots(page);assertProgress(records,'image read');
  assert(records.some(record=>/kod/i.test(record.title+' '+record.detail)&&/20\s*%|60\s*%/.test(record.local)),'local code OCR progress is visible');
  assert(records.some(record=>/ritning/i.test(record.title+' '+record.detail)&&/\d+\s+av\s+\d+\s+bildområden/i.test(record.detail)),'drawing OCR reports current tile separately from page');
  assert(records.some(record=>/ritning/i.test(record.title+' '+record.detail)&&/sida\s*1\b/i.test(record.detail+' '+record.title)),'drawing tiles remain on PDF page 1');
  assert((await page.evaluate(()=>window.__calls.recognize))>1);assert.equal(await page.locator('.rtMatchRow').count(),2);assert.equal(await page.evaluate(()=>window.__calls.work),0);assert.deepEqual(errors,[]);console.log('PASS local OCR percentage and drawing tile/page progress');
 }catch(error){console.error('OCR progress state:',await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,progress:window.__progress,calls:window.__calls})).catch(()=>null));throw error;}
 finally{await context.close();}
}
async function interruptedFlow(browser,input){
 const context=await contextFor(browser,{width:820,height:1180,touch:true}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await open(page,input);await page.locator('#rtImageMode').selectOption('full');await page.evaluate(()=>{window.__ocrMode='hang';});await page.locator('#rtPreview').click();await waitProgress(page,/bildläs/);
  await page.waitForFunction(()=>window.__late.length>0);const before=await snapshot(page);await page.waitForTimeout(1200);const after=await snapshot(page);assert.notEqual(after.time,before.time,'elapsed time advances while OCR is awaiting data');
  await page.locator('#rtReadProgressCancel').click();await page.waitForFunction(()=>!document.getElementById('rtDialog').open);const cancelled=await snapshot(page);assert(!(await page.locator('#rtReadProgress').isVisible()),'cancelled progress closes with the guide');
  await page.evaluate(()=>window.__late.splice(0).forEach(resolve=>resolve()));await page.waitForTimeout(1200);assert.deepEqual(await snapshot(page),cancelled,'late OCR events cannot restart progress or elapsed time');
  await page.locator('#pwFile').setInputFiles(upload(input));await page.waitForSelector('#rtDialog[open]');await setRect(page,'Kod',codeRect);await page.locator('#rtImageMode').selectOption('full');await page.evaluate(()=>{window.__ocrMode='fail';});await page.locator('#rtPreview').click();await idle(page);
  assert.match(await page.locator('#rtStatus').textContent(),/Avsiktligt OCR-fel/);const failed=await snapshot(page);assert(!/100\s*%/.test(failed.percent),'failed OCR is not shown as complete');await page.waitForTimeout(1100);assert.deepEqual(await snapshot(page),failed,'failed progress clock stops');
  await page.locator('#rtImageMode').selectOption('auto');await clear(page,0);await page.locator('#rtPreview').click();await idle(page);assert.equal(await page.locator('.rtMatchRow').count(),2,'retry after cancellation/failure retains a working fast read');assert.deepEqual(errors,[]);console.log('PASS hung OCR elapsed time, cancellation/late callbacks, explicit failure and retry');
 }finally{await context.close();}
}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const native=await fixture(),small=await fixture(2);
 if(process.env.SMARTMATCH_PROGRESS_CASE!=='images')for(const device of devices)await nativeFlow(browser,device,native,device.name==='iphone'?'smartmatch-read-test.html':undefined);
 if(process.env.SMARTMATCH_PROGRESS_CASE!=='native'){await imageFlow(browser,small);await interruptedFlow(browser,small);}console.log('QA screenshots: '+artifacts);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
