/* Browser checks for the TEST 5 annotation fast path and normal guided flow.
 * SMARTMATCH_SCHOOL_PDF optionally exercises the uploaded school PDF locally.
 * SMARTMATCH_DEVICE=desktop|iphone|ipad limits the UI viewport checks.
 * Customer PDFs and screenshots are never written to the repository.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),files=new Map();
const devices=[{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true},{name:'ipad',width:1024,height:1366,touch:true}].filter(d=>!process.env.SMARTMATCH_DEVICE||d.name===process.env.SMARTMATCH_DEVICE);
const server=http.createServer((req,res)=>{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(route==='/__fast_probe__'){
  res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><meta charset="utf-8"><script src="/vendor/pdf.min.js"></script><script src="/vendor/pdf-lib.min.js"></script><script src="/smartmatch-read-stamps-v5.js"></script><script src="/smartmatch-read-match-v5.js"></script>');
 }
 if(files.has(route)){res.setHeader('Content-Type','application/pdf');return res.end(files.get(route));}
 const file=path.resolve(root,route.replace(/^\//,'')||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
 catch(_){res.writeHead(404);res.end();}
});
const origin=()=>`http://127.0.0.1:${server.address().port}`;

async function generatedFixture(page){
 const image=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=700;canvas.height=140;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,700,140);ctx.fillStyle='#111';ctx.font='bold 100px Arial';ctx.fillText('GS 77',45,110);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),plan=doc.addPage([9536,4768]);
 plan.drawText('Example large drawing',{x:300,y:4500,size:90,font});
 const annotations=[];
 for(const [index,code]of ['GS77','GS 77','GS77','GS771'].entries()){
  const x=600+index*1800,y=3300-index*450;
  plan.drawRectangle({x,y,width:350,height:180,borderWidth:3,borderColor:rgb(.1,.3,.6)});
  plan.drawText(code,{x:x+20,y:y+65,size:60,font,color:rgb(.1,.3,.6)});
  annotations.push(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText(code),Contents:PDFHexString.fromText(''),Rect:[x,y,x+350,y+180],F:4,NM:PDFHexString.fromText('test-stamp-'+index)})));
 }
 plan.node.set(PDFName.of('Annots'),doc.context.obj(annotations));
 const card=doc.addPage([842,595]),heading=await doc.embedPng(Buffer.from(image,'base64'));
 card.drawImage(heading,{x:72,y:510,width:220,height:44});
 for(const [index,text]of ['Las ASSA EL580','Dorrautomatik ED100','Handtag HOPPE'].entries())card.drawText(text,{x:72,y:420-index*28,size:17,font});
 return {name:'generated-indexed-stamps',bytes:Buffer.from(await doc.save()),code:'GS77',count:3,workTerms:['EL580','ED100','HOPPE'],codeRect:{x:.08,y:.06,w:.30,h:.10},tableRect:{x:.08,y:.25,w:.55,h:.18}};
}

async function probe(page,test){
 files.set('/__fast_input__.pdf',test.bytes);
 const report=await page.evaluate(async({code,count})=>{
  pdfjsLib.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.js';
  const bytes=new Uint8Array(await(await fetch('/__fast_input__.pdf')).arrayBuffer()),started=performance.now();
  const libDoc=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false}),annotationIndex=SmartMatchReadStamps.readDocument(libDoc),indexedMs=performance.now()-started;
  const pdf=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
  const counts={getTextContent:0,getOperatorList:0,getAnnotations:0,render:0,ocr:0};
  const wrapped={numPages:pdf.numPages,getPage:async n=>{
   const pg=await pdf.getPage(n);
   return new Proxy(pg,{get(target,key){const value=target[key];if(typeof value!=='function')return value;
    return (...args)=>{if(n===1&&Object.hasOwn(counts,key))counts[key]++;return value.apply(target,args);};
   }});
  }};
  const options={pdf:wrapped,cardPages:[2],codes:[code],annotationIndex,imageMode:'auto',getWorker:async()=>{throw Error('Fast stamp lookup must not start OCR');},recognize:async()=>{counts.ocr++;throw Error('Fast stamp lookup must not OCR');}};
  try{
   const scanStarted=performance.now(),result=await SmartMatchReadMatcher.scan(options),scanMs=performance.now()-scanStarted,firstCounts={...counts};
   const stamp=result.hits[0],sample={page:1,code,rect:stamp.box};
   const sampled=await SmartMatchReadMatcher.scan({...options,sample}),sampleCounts={...counts};
   // Full mode remains available. Stop after the first real rendered tile;
   // this test verifies fallback activation without scanning a huge page.
   let cancelled=false,fullError='';
   try{await SmartMatchReadMatcher.scan({...options,imageMode:'full',getWorker:async()=>({setParameters:async()=>{}}),recognize:async()=>{counts.ocr++;cancelled=true;return {data:{words:[],confidence:100,text:''}};},cancelled:()=>cancelled});}
   catch(error){fullError=error.message;}
   return {indexedMs,scanMs,records:annotationIndex.length,result,firstCounts,sampled,sampleCounts,fullCounts:counts,fullError};
  }finally{await pdf.destroy();}
 },{code:test.code,count:test.count});
 assert.equal(report.result.hits.length,test.count,'metadata finds all exact stamp identities');
 assert.deepEqual(report.firstCounts,{getTextContent:0,getOperatorList:0,getAnnotations:0,render:0,ocr:0},'indexed drawing lookup bypasses text, operator parsing, drawing rendering and OCR');
 assert.equal(report.result.pages[0].scanMode,'stamp-index');assert.equal(report.result.pages[0].imageSkipped,true);
 assert.equal(report.sampled.hits.length,test.count,'a selected indexed example does not duplicate a stamp');
 assert.deepEqual(report.sampleCounts,report.firstCounts,'confirming an indexed example also avoids drawing work');
 assert.match(report.fullError,/avbröts/,'full image search retains cancellation');
 assert.equal(report.fullCounts.render,1,'explicit full search renders its first bounded crop');
 assert.equal(report.fullCounts.ocr,1,'explicit full search starts local image reading');
 assert.equal(report.fullCounts.getTextContent,1,'full mode supplements metadata with text');
 console.log('PASS '+test.name+': '+test.count+' indexed stamps; zero drawing text/operator/render/OCR calls; sample and full fallback ('+Math.round(report.scanMs)+' ms warm scan, '+Math.round(report.indexedMs)+' ms PDF parse/index)');
 return report;
}

async function exercise(browser,device,test){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch}),page=await context.newPage(),errors=[],remote=[],diagnostics=[];
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(['warning','error'].includes(message.type()))diagnostics.push(message.text());});
 page.on('request',request=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(request.url()))remote.push(request.url());});
 const ready=()=>page.waitForFunction(n=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===n&&document.getElementById('pwScanOverlay').hidden,test.count,{timeout:120000});
 async function screenshot(suffix){if(process.env.SMARTMATCH_QA_DIR){fs.mkdirSync(process.env.SMARTMATCH_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SMARTMATCH_QA_DIR,device.name+'-'+test.name+'-'+suffix+'.png'),fullPage:true});}}
 async function setRect(kind,rect){
  for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']]){
   const input=page.getByLabel(kind+' '+label,{exact:true});
   await input.evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);
  }
 }
 try{
  await page.goto(origin()+'/smartmatch-read-test-v5.html');
  await page.evaluate(()=>{
   const original=SmartMatchReadMatcher;
   window.SmartMatchReadMatcher={...original,scan:options=>{window.__fastTestPdf=options.pdf;return original.scan(options);}};
  });
  await page.locator('#pwFile').setInputFiles({name:test.name+'.pdf',mimeType:'application/pdf',buffer:test.bytes});
  await page.waitForSelector('#rtDialog[open]',{timeout:60000});
  assert.equal(await page.locator('#rtImageMode').inputValue(),'auto','the added fast search is the default');
  await setRect('Kod',test.codeRect);await setRect('Tabell',test.tableRect);
  if(test.name==='uploaded-school'){
   await page.locator('#rtDiscover').click();
   await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:180000});
   assert.equal(await page.locator('#rtPages').inputValue(),'2','the example proposes the school card page without the drawing');
   const selected=page.locator('#rtDiscoveryResults .rtPageChoice input:checked');
   assert.equal(await selected.count(),1,'the real school file has one proposed source card');
   assert.match(await selected.locator('..').textContent(),/sida 2/,'the proposed source card belongs to page two');
   console.log('PASS '+device.name+' uploaded-school: example discovery proposes only the page-two card');
  }
  await page.locator('#rtPreview').click();
  await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:180000});
  assert.equal(await page.getByLabel('Beteckning kort 1',{exact:true}).inputValue(),test.code,'local OCR reads the selected raster card header');
  const work=await page.getByLabel('Arbetsrader kort 1',{exact:true}).inputValue();
  for(const term of test.workTerms)assert(work.toUpperCase().includes(term.toUpperCase()),'the selected work table contains '+term);
  assert.equal(await page.locator('.rtMatchRow').count(),test.count,'the guide links all indexed stamps');
  assert(await page.locator('#rtStart').isDisabled(),'positions must still be reviewed');
  await page.evaluate(async()=>{
   const pg=await window.__fastTestPdf.getPage(1),render=pg.render.bind(pg);
   window.__fastPreviewRenders=0;pg.render=options=>{window.__fastPreviewRenders++;return render(options);};
  });
  await page.locator('.rtMatchRow button').first().evaluate(async button=>{await button.onclick();});
  const firstHit=await page.locator('#rtHitRect').getAttribute('style'),firstRenders=await page.evaluate(()=>window.__fastPreviewRenders);
  assert.equal(firstRenders,1,'viewing the first drawing match renders the preview once');
  await page.locator('.rtMatchRow button').nth(1).evaluate(async button=>{await button.onclick();});
  assert.equal(await page.evaluate(()=>window.__fastPreviewRenders),firstRenders,'reviewing another hit on the same page reuses the preview');
  assert.notEqual(await page.locator('#rtHitRect').getAttribute('style'),firstHit,'the next match still moves the highlighted hit');
  await screenshot('fast-review');
  await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await ready();
  const payload=await page.evaluate(()=>SmartMatchReadTest.payload());
  assert.equal(payload.matching.pages[0].scanMode,'stamp-index','the UI used the annotation fast path');
  assert.equal(payload.matching.pages[0].imageSkipped,true,'saved review records how the drawing was searched');
  const positions=await page.evaluate(()=>SmartMatchAppBridge.getPositions());
  assert(positions.every(p=>p.code===test.code&&p.page===1),'all reviewed positions point to the drawing');
  assert.equal((await page.evaluate(()=>SmartMatchAppBridge.getDoorCardMapping()))[test.code],2,'the raster code links to its source card');
  const first=positions[0],second=positions[1];assert(first&&second);
  await page.evaluate(async()=>{
   const pg=await SmartMatchAppBridge.getPdf().getPage(2),render=pg.render.bind(pg);window.__fastCardPainted=false;
   pg.render=options=>{const task=render(options);task.promise.then(()=>{window.__fastCardPainted=true;},()=>{});return task;};
  });
  await page.locator('#pwMarkers [data-position-id="'+first.id+'"]').evaluate(node=>node.click());await page.waitForSelector('#pwProtocol[open]');
  await page.waitForFunction(()=>window.__fastCardPainted&&document.getElementById('pwProtocolCanvas')?.dataset.readCardId,null,{timeout:60000});
  const card=Object.values(payload.cards)[0];
  assert.equal(await page.locator('#pwProtocolCanvas').getAttribute('data-read-card-id'),card.id,'the selected source card is rendered');
  assert(await page.locator('#pwProtocolCanvas').evaluate(canvas=>{
   const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let ink=0;
   for(let offset=0;offset<pixels.length;offset+=4)if(pixels[offset+3]>0&&pixels[offset]+pixels[offset+1]+pixels[offset+2]<650)ink++;
   return ink>10;
  }),'the card crop contains visible drawing and table content');
  const checks=page.locator('.rtWorkRow input');assert(await checks.count()>0,'clicking a stamp opens its work checklist');
  const openedWork=(await page.locator('.rtWorkRow').allTextContents()).join(' ').toUpperCase();for(const term of test.workTerms)assert(openedWork.includes(term.toUpperCase()));
  await checks.first().check();assert.notEqual(await page.locator('#pwProtocolPercent').textContent(),'0% arbete');await screenshot('work');
  await page.locator('#pwProtocolClose').click();
  await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(p=>p.id===id)),second.id);await page.waitForSelector('#pwProtocol[open]');
  assert.equal(await checks.first().isChecked(),false,'different doors retain independent work status');await page.locator('#pwProtocolClose').click();
  await page.evaluate(()=>SmartMatchAppBridge.save());await page.reload();await ready();
  assert.equal(await page.evaluate(()=>Object.values(SmartMatchReadTest.payload().checks).flatMap(Object.values).filter(Boolean).length),1,'the work state and fast links survive refresh');
  assert.equal(await page.locator('#pwMarkers .rtWorkBadge:visible').count(),0,'the removed work badge remains hidden');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'PDF and OCR processing stays on the app origin');
  console.log('PASS '+device.name+' '+test.name+': raster card, '+test.count+' reviewed links, checklist, separate door state and refresh');
 }catch(error){
  console.error('Browser state:',await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,state:document.getElementById('pwState')?.textContent,cards:[...document.querySelectorAll('.rtResult')].map(node=>({code:node.querySelector('input')?.value,work:node.querySelector('textarea')?.value})),positions:window.SmartMatchAppBridge?.getPositions()?.length,dialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id)})).catch(()=>null),'Warnings:',diagnostics.slice(-10));
  await screenshot('failure').catch(()=>{});throw error;
 }finally{await context.close();}
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
  const page=await browser.newPage();await page.goto(origin()+'/__fast_probe__');
  const tests=[await generatedFixture(page)];
  if(process.env.SMARTMATCH_SCHOOL_PDF)tests.push({name:'uploaded-school',bytes:fs.readFileSync(process.env.SMARTMATCH_SCHOOL_PDF),code:'GS23',count:40,workTerms:['310','6696'],codeRect:{x:.056,y:.059,w:.07,h:.015},tableRect:{x:.056,y:.114,w:.522,h:.437}});
  for(const test of tests)await probe(page,test);await page.close();
  for(const device of devices)for(const test of tests)await exercise(browser,device,test);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
