/* Browser integration coverage for Ritningsverktygets digital door-card flow.
 *
 * The controller, core, IndexedDB storage, review UI and exporters are the
 * production files.  Only the OCR reader is replaced with a deterministic
 * local fixture so the test can exercise progress/cancellation without
 * downloading OCR models or depending on font rasterisation.
 */
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const {PDFDocument,StandardFonts,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
 ?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'
 :'playwright');

const root=path.resolve(__dirname,'..');
const qa=process.env.DRAWING_DIGITIZER_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'drawing-card-digitizer-'));
let origin='';
const debugStart=Date.now();
function debug(label){if(process.env.DRAWING_DIGITIZER_DEBUG)console.log('[digitizer '+((Date.now()-debugStart)/1000).toFixed(1)+'s] '+label);}

const MIME={
 '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.wasm':'application/wasm','.json':'application/json; charset=utf-8',
 '.svg':'image/svg+xml','.png':'image/png','.pdf':'application/pdf'
};
const server=http.createServer((request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\/+/,''),file=path.resolve(root,pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return;}
 try{response.setHeader('Content-Type',MIME[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});

// The positions deliberately mirror a common Swedish card with four
// sections. Page one has one uncertain product and every page has an explicit
// loose OCR token, so the review UI must resolve both cases before approval.
const readerFixture=String.raw`
(function(root){
 'use strict';
 const state=root.__digitizerReaderQA={calls:[],active:false,slow:false,aborted:0,partialPages:[]};
 function abortError(){const error=Error('Textförberedelsen avbröts.');error.name='AbortError';return error;}
 function wait(ms,signal){return new Promise((resolve,reject)=>{
  const timer=setTimeout(done,ms);function done(){signal?.removeEventListener('abort',cancel);resolve();}
  function cancel(){clearTimeout(timer);signal?.removeEventListener('abort',cancel);state.aborted++;reject(abortError());}
  if(signal?.aborted)return cancel();signal?.addEventListener('abort',cancel,{once:true});
 });}
 function entry(options,page){
  const rect=options.rect,viewport={width:600,height:800,transform:[1,0,0,-1,0,800]},words=[];
  const add=(text,x,y,w=.09,h=.025,confidence=96)=>words.push({text,x:(rect.x+x*rect.w)*viewport.width,y:(rect.y+y*rect.h)*viewport.height,w:w*rect.w*viewport.width,h:h*rect.h*viewport.height,confidence,lowConfidence:confidence<70,source:'ocr',provenance:'ocr'});
  const codes={1:'WC',2:'GS23',3:'G69'};
  add('Beslagskod',.04,.035,.15);add('4.2:',.205,.035,.055);add(codes[page]||('K'+page),.28,.035,.10);
  add('Projekt',.04,.105,.08);add('Skolan',.13,.105,.10);
  add('Benämning',.04,.18,.17);add('Typ',.43,.18,.05);add('/',.49,.18,.015);add('Utförande',.515,.18,.15);add('Antal',.71,.18,.07);add('Monteras',.83,.18,.11);add('av',.95,.18,.03);
  add('OSÄKERT',.04,.235,.13,.025,88);
  add('Daglåsning',.04,.29,.18);add('Låshus',.05,.345,.13);add(page===2?'DL9192':'565',.48,.345,.10);add('1',.75,.345,.025);add('GS',.90,.345,.04);
  add('Nattlåsning',.04,.42,.19);add('Hakregel',.05,.475,.14);add('576',.48,.475,.07);add('1',.75,.475,.025);add('DT',.90,.475,.04);
  add('Övrig',.04,.55,.09);add('utrustning',.14,.55,.16);add(page===3?'Dörrmagnet':'Dörrstängare',.05,.605,.21,.025,page===1?55:96);add(page===3?'830':'DC700',.48,.605,.10);add('1',.75,.605,.025);add('GS',.90,.605,.04);
  add('Larm',.04,.68,.07);add('/',.115,.68,.015);add('Passer',.14,.68,.10);add('Öppningsknapp',.05,.735,.21);add('OPK-1',.48,.735,.10);add('1',.75,.735,.025);add('GS',.90,.735,.04);
  return{page,rect:{...rect},viewport,wordUnits:'viewport',words,ocrWords:words,allWords:words,nativeWords:[],nativeCount:0,status:'read',warnings:[]};
 }
 async function progress(options,value){if(options.onProgress)await options.onProgress(value);}
 async function read(options){
  const page=options.pages[0],call={page,slow:state.slow,started:Date.now(),finished:false};state.calls.push(call);state.active=true;
  try{
   await progress(options,{page,pageIndex:1,pageCount:1,phase:'inspect',percent:5,fraction:.05,tileIndex:0,tileCount:1});
   await wait(state.slow?30000:80,options.signal);
   await progress(options,{page,pageIndex:1,pageCount:1,phase:'render',percent:35,fraction:.35,tileIndex:0,tileCount:1});
   await wait(35,options.signal);
   await progress(options,{page,pageIndex:1,pageCount:1,phase:'ocr',percent:82,fraction:.82,tileIndex:1,tileCount:1});
   await wait(35,options.signal);
   const result=entry(options,page);if(state.partialPages.includes(page)){result.status='partial';result.warnings.push('Ett bildområde kunde inte läsas. Läs kortet igen.');}call.finished=true;
   await progress(options,{page,pageIndex:1,pageCount:1,phase:'complete',percent:100,fraction:1,tileIndex:1,tileCount:1});
   return{pages:[result],summary:{pages:1,ocrPages:1,words:result.words.length,nativeWords:0,lowConfidenceWords:result.words.filter(word=>word.lowConfidence).length}};
  }finally{state.active=false;}
 }
 root.DrawingOcrReader=Object.freeze({read});
})(window);
`;

async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica);
 for(const [index,code] of ['WC','GS23','G69'].entries()){
  const page=document.addPage([600,800]);
  page.drawRectangle({x:20,y:20,width:560,height:760,borderWidth:1,borderColor:rgb(.18,.29,.37)});
  page.drawText('BESLAGSKOD 4.2: '+code,{x:45,y:740,size:17,font});
  page.drawText('DAGLASNING',{x:45,y:570,size:13,font});
  page.drawText('NATTLASNING',{x:45,y:465,size:13,font});
  page.drawText('OVRIG UTRUSTNING',{x:45,y:360,size:13,font});
  page.drawText(index===2?'DORRMAGNET 830  1  GS':'DORRSTANGARE DC700  1  GS',{x:48,y:320,size:13,font});
  page.drawText('LARM / PASSER',{x:45,y:255,size:13,font});
  for(let y=690;y>=190;y-=52)page.drawLine({start:{x:40,y},end:{x:560,y},thickness:.5,color:rgb(.45,.53,.59)});
 }
 document.setTitle('Digitaliseringsprov ÅÄÖ');
 return Buffer.from(await document.save({useObjectStreams:false}));
}

async function waitReady(page){
 await page.waitForFunction(()=>document.body.classList.contains('hasDrawing')&&!document.getElementById('workspace').hasAttribute('aria-busy'));
 await page.waitForFunction(()=>window.DrawingCardDigitizer?.getProject().fingerprint?.startsWith('dcd1-'));
 await page.waitForFunction(()=>document.getElementById('previewCanvas').width>10);
}
async function openFile(page,bytes){
 await page.locator('#toolFile').setInputFiles({name:'digitaliseringsprov.pdf',mimeType:'application/pdf',buffer:bytes});
 await waitReady(page);
}
async function openDigitizer(page){
 if(await page.locator('#toolPanel').isHidden())await page.locator('#toolsToggle').click();
 const section=page.locator('#digitizerTools');if(await section.getAttribute('open')===null)await section.locator(':scope > summary').click();
}
async function markWholeCard(page){
 await openDigitizer(page);await page.locator('#digitizerMarkArea').click();
 const box=await page.locator('#previewCanvas').boundingBox();assert(box&&box.width>100&&box.height>100);
 await page.mouse.move(box.x+box.width*.025,box.y+box.height*.025);await page.mouse.down();
 await page.mouse.move(box.x+box.width*.975,box.y+box.height*.975,{steps:10});await page.mouse.up();
 await page.waitForFunction(()=>!document.getElementById('digitizerAreaRect').hidden);
 await openDigitizer(page);
}
async function waitIdle(page){await page.waitForFunction(()=>!document.getElementById('workspace').hasAttribute('aria-busy'));}
async function clickAll(page,name){
 for(let guard=0;guard<80;guard++){
  const button=page.getByRole('button',{name,exact:true});if(!await button.count())return;
  await button.first().click();
 }
 throw Error('Review action did not converge: '+name);
}
async function resolveAndApprove(page,{editFirst=false}={}){
 if(editFirst){
  const designation=page.locator('#digitizerDigitalSections input[data-field="designation"]').nth(2);
  assert.equal(await designation.inputValue(),'Dörrstängare');
  await designation.fill('Dörrstängare kontrollerad');
 }
 await clickAll(page,'Inte en uppgift');
 await clickAll(page,'Texten är kontrollerad');
 await clickAll(page,'Kontrollerad');
 const approve=page.locator('#digitizerApproveCard');
 assert.equal(await approve.isEnabled(),true,'all explicit review decisions enable approval');
 await approve.click();
}
async function downloadFrom(page,selector){
 const pending=page.waitForEvent('download',{timeout:30000});await page.locator(selector).click();const download=await pending;
 return{name:download.suggestedFilename(),bytes:fs.readFileSync(await download.path())};
}

async function run(){
 fs.mkdirSync(qa,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
 let browser,context;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const external=[],errors=[],failed=[];
  context.on('request',request=>{const url=request.url();if(/^https?:/u.test(url)&&!url.startsWith(origin+'/'))external.push(url);});
  await context.route(/^https:\/\//u,route=>route.abort());
  await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  await context.route('**/drawing-ocr-reader.js*',route=>route.fulfill({contentType:'application/javascript; charset=utf-8',body:readerFixture}));
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('requestfailed',request=>failed.push(request.url()+': '+(request.failure()?.errorText||'')));
  await page.goto(origin+'/drawing-tools.html');await page.waitForFunction(()=>window.DrawingCardDigitizer&&window.DrawingToolsBridge);
  debug('page ready');
  const input=await fixture();fs.writeFileSync(path.join(qa,'digitaliseringsprov.pdf'),input);await openFile(page,input);
  debug('source open');

  await markWholeCard(page);
  assert.match(await page.locator('#digitizerAreaStatus').textContent(),/Område markerat på sida 1/);
  await page.locator('#digitizerTemplateName').fill('Skolans dörrkort');
  await page.evaluate(()=>{__digitizerReaderQA.partialPages=[1];});
  await page.locator('#digitizerCreateTemplate').click();await waitIdle(page);
  assert.equal(await page.evaluate(()=>DrawingCardDigitizer.getProject().template),null,'a partial example read cannot create a reusable template');
  assert.match(await page.locator('#digitizerTemplateStatus').innerText(),/inte färdig/i);
  await page.evaluate(()=>{__digitizerReaderQA.partialPages=[];});
  await page.locator('#digitizerCreateTemplate').click();await waitIdle(page);
  debug('template read');
  await page.waitForFunction(()=>DrawingCardDigitizer.getProject().template?.name==='Skolans dörrkort');
  assert.match(await page.locator('#digitizerTemplatePreview').innerText(),/Kolumner:.*Benämning.*Monteras av/s);
  assert.match(await page.locator('#digitizerTemplatePreview').innerText(),/Daglåsning.*Övrig utrustning/s);
  assert.equal((await page.locator('#digitizerPageList .digitizerPageItem').count()),1,'the example becomes the first reviewable card');

  await page.locator('#digitizerTemplatePreview button').click();await page.locator('#digitizerReviewDialog').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.getElementById('digitizerOriginalCanvas').width>20&&!document.getElementById('digitizerOriginalPage').textContent.includes('laddar'));
  const panes=await page.locator('#digitizerReviewBody > .digitizerReviewPane').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().toJSON()));
  assert.equal(panes.length,2);assert(panes[1].left>panes[0].left,'desktop review shows original and digital card side by side');
  assert.equal(await page.locator('#digitizerCardCode').inputValue(),'WC');
  await page.locator('#digitizerCloseReview').click();
  await page.locator('#digitizerApproveTemplate').click();assert.equal(await page.locator('#digitizerReadCards').isEnabled(),true);
  debug('template reviewed');

  await page.locator('#digitizerPages').fill('1–3');
  await page.locator('#digitizerReadCards').click();
  await page.waitForFunction(()=>document.getElementById('workspace').hasAttribute('aria-busy')&&!document.getElementById('digitizerProgress').hidden);
  assert.equal(await page.locator('#digitizerCancelRead').isEnabled(),true,'the dedicated Cancel button remains enabled while other tools are locked');
  assert.match(await page.locator('#digitizerProgressPage').textContent(),/Sida [23]/);
  await waitIdle(page);await page.waitForFunction(()=>DrawingCardDigitizer.getProject().cards.length===3);
  debug('three cards read');
  assert.equal(await page.locator('#digitizerPageList .digitizerPageItem').count(),3);
  assert.match(await page.locator('#digitizerReadStatus').textContent(),/2 kort lästa och autosparade/);
  assert.deepEqual(await page.evaluate(()=>__digitizerReaderQA.calls.map(call=>call.page)),[1,1,2,3],'partial example is rejected, then the complete example and only two unread cards are retained');

  await page.locator('#digitizerPageList .digitizerPageItem').first().click();await page.locator('#digitizerReviewDialog').waitFor({state:'visible'});
  for(let index=0;index<3;index++)await resolveAndApprove(page,{editFirst:index===0});
  const approved=await page.evaluate(()=>DrawingCardDigitizer.getProject());
  assert.equal(approved.cards.filter(card=>card.review.status==='approved').length,3);
  assert(approved.cards[0].sections.some(section=>section.rows.some(row=>row.cells.designation==='Dörrstängare kontrollerad')),'manual product correction is retained in the canonical card');
  assert.equal(await page.locator('#digitizerExportPdf').isEnabled(),true);
  await page.locator('#digitizerCloseReview').click();
  debug('cards reviewed');

  const jsonDownload=await downloadFrom(page,'#digitizerExportJson'),json=JSON.parse(jsonDownload.bytes.toString('utf8'));
  assert.match(jsonDownload.name,/digitala-dorrkort\.json$/);assert.equal(json.cards.length,3);
  assert(json.cards[0].sections.some(section=>section.rows.some(row=>row.cells.designation==='Dörrstängare kontrollerad')));
  const pdfDownload=await downloadFrom(page,'#digitizerExportPdf');await waitIdle(page);
  debug('exports downloaded');
  assert.match(pdfDownload.name,/digitala-dorrkort\.pdf$/);const exported=await PDFDocument.load(pdfDownload.bytes,{updateMetadata:false});
  assert.equal(exported.getPageCount(),3,'one approved digital card is exported per PDF page');
  fs.writeFileSync(path.join(qa,jsonDownload.name),jsonDownload.bytes);fs.writeFileSync(path.join(qa,pdfDownload.name),pdfDownload.bytes);

  // A hard reload plus reselecting the original PDF proves the project is in
  // IndexedDB rather than only in controller memory.
  await page.reload();await page.waitForFunction(()=>window.DrawingCardDigitizer&&window.DrawingToolsBridge);await openFile(page,input);await openDigitizer(page);
  debug('page reloaded and source reopened');
  await page.waitForFunction(()=>/3 autosparade digitala kort/.test(document.getElementById('digitizerReadStatus').textContent));
  assert.equal(await page.locator('#digitizerPageList .digitizerPageItem').count(),3);
  assert.equal(await page.locator('#digitizerApproveTemplate').isDisabled(),true,'approved template restores without being rebuilt');
  await page.locator('#digitizerPageList .digitizerPageItem').first().click();await page.locator('#digitizerReviewDialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#digitizerDigitalSections input[data-field="designation"]').nth(2).inputValue(),'Dörrstängare kontrollerad','manual review edits restore with the same source PDF');

  // Rereading a single card asks for confirmation. While the deterministic
  // reader is held open, Cancel must remain clickable despite workspace busy.
  await page.evaluate(()=>{__digitizerReaderQA.slow=true;});page.once('dialog',dialog=>dialog.accept());
  await page.locator('#digitizerReadCurrent').click();
  await page.waitForFunction(()=>__digitizerReaderQA.active&&document.getElementById('workspace').hasAttribute('aria-busy'));
  assert.equal(await page.locator('#workspace').evaluate(node=>node.inert),false,'workspace is not inert while its explicit Cancel control is needed');
  assert.equal(await page.locator('#digitizerCancelRead').isEnabled(),true);await page.locator('#digitizerCancelRead').click();
  await waitIdle(page);await page.waitForFunction(()=>/avbröts/i.test(document.getElementById('digitizerReadStatus').textContent));
  const afterCancel=await page.evaluate(()=>DrawingCardDigitizer.getProject());
  assert.equal(afterCancel.cards.length,3);assert.equal(afterCancel.cards[0].review.status,'approved');
  assert(afterCancel.cards[0].sections.some(section=>section.rows.some(row=>row.cells.designation==='Dörrstängare kontrollerad')),'cancel preserves the last autosaved reviewed card');
  assert(await page.evaluate(()=>__digitizerReaderQA.aborted>0),'the AbortSignal reaches the active reader');
  debug('active reread cancelled');

  // A failed/partial reread must not replace a previously reviewed card. The
  // user can try again without losing manual edits or the approved export.
  await page.evaluate(()=>{__digitizerReaderQA.slow=false;__digitizerReaderQA.partialPages=[1];});
  await page.locator('#digitizerPageList .digitizerPageItem').first().click();await page.locator('#digitizerReviewDialog').waitFor({state:'visible'});
  page.once('dialog',dialog=>dialog.accept());await page.locator('#digitizerReadCurrent').click();await waitIdle(page);
  await page.locator('#digitizerReviewDialog').waitFor({state:'visible'});
  const preserved=await page.evaluate(()=>DrawingCardDigitizer.getProject().cards.find(card=>card.source.page===1));
  assert.equal(preserved.source.readStatus,'read');assert.equal(preserved.review.status,'approved');
  assert(preserved.sections.some(section=>section.rows.some(row=>row.cells.designation==='Dörrstängare kontrollerad')),'partial reread preserves manual edits');
  assert.match(await page.locator('#digitizerReadStatus').innerText(),/tidigare granskade kortet behölls/i);
  await page.locator('#digitizerCloseReview').click();
  const partialPdfDownload=await downloadFrom(page,'#digitizerExportPdf');await waitIdle(page);
  const partialExport=await PDFDocument.load(partialPdfDownload.bytes,{updateMetadata:false});
  assert.equal(partialExport.getPageCount(),3,'the last complete approved card remains in the PDF after a partial reread');

  // Private browsing, quota or browser policy can make IndexedDB unavailable.
  // The in-memory fallback is useful for continuing work, but it must be
  // labelled as temporary rather than silently described as autosaved.
  const volatilePage=await context.newPage();
  await volatilePage.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){throw Error('IndexedDB blocked for QA');}}});});
  await volatilePage.goto(origin+'/drawing-tools.html');await volatilePage.waitForFunction(()=>window.DrawingCardDigitizer&&window.DrawingToolsBridge);
  await openFile(volatilePage,input);await openDigitizer(volatilePage);
  assert.equal(await volatilePage.evaluate(()=>DrawingCardDigitizerStorage.getBackend()),'memory');
  const storageWarning=await volatilePage.locator('#digitizerStorageStatus').innerText();
  assert.match(storageWarning,/bara tillfälligt/i);assert.match(storageWarning,/JSON/i);
  assert.equal(await volatilePage.locator('#digitizerStorageStatus').getAttribute('data-backend'),'memory');
  await volatilePage.close();

  await page.screenshot({path:path.join(qa,'digitizer-restored.png'),fullPage:true});
  assert.deepEqual(external,[],'door-card preparation makes no external network request');
  assert.equal(failed.filter(url=>!url.includes('favicon')).length,0,'all required local assets load');
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(entry=>entry.name.includes('/vendor/tesseract/'))),false,'native controller integration never downloads or starts OCR assets in this deterministic run');
  assert.deepEqual(errors,[],'no runtime errors are raised');
  console.log('PASS door-card digitizer browser: UI template, sequential cards, side-by-side edit/review, PDF+JSON, IndexedDB restore, usable Cancel and zero external requests');
  console.log('QA files: '+qa);
 }finally{
  if(context)await context.close();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
 }
}

if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});

