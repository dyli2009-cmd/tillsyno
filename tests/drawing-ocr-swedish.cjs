/* Real bundled Swedish/English OCR, accent-preserving hidden text, no CDN.
 * This is a legible raster fixture, not a guarantee for every customer scan.
 * Optional QA output directory: DRAWING_OCR_SWEDISH_QA_DIR. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {PDFDocument}=require('../vendor/pdf-lib.min.js'),writer=require('../drawing-ocr-pdf.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const qa=process.env.DRAWING_OCR_SWEDISH_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'drawing-ocr-swedish-'));
const expected=['Övrigt','Dörrstängare','Karmöverföring','Dörrautomatik','Dörrmagnet','Dörrcentral','Återställning','Låshus'];
const codes=['GS23','DC700','6696','DBL'];
const server=http.createServer((request,response)=>{
 const route=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
 if(route==='/qa'){response.setHeader('Content-Type','text/html; charset=utf-8');return response.end('<!doctype html><meta charset="utf-8"><script src="/vendor/pdf.min.js"></script><script src="/vendor/tesseract/tesseract.min.js"></script><script src="/drawing-ocr-image-regions.js"></script><script src="/drawing-ocr-reader.js"></script><canvas id="fixture"></canvas>');}
 const file=path.resolve(root,'.'+route);
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 fs.readFile(file,(error,data)=>{if(error){response.writeHead(404);return response.end();}response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');response.end(data);});
});
const key=value=>String(value).normalize('NFC').toLocaleLowerCase('sv-SE');
function matches(words,word){return words.filter(item=>key(item.text)===key(word));}
async function inspect(page,bytes){
 return page.evaluate(async base64=>{
  const document=await pdfjsLib.getDocument({data:Uint8Array.from(atob(base64),c=>c.charCodeAt(0))}).promise;
  try{
   const pg=await document.getPage(1),viewport=pg.getViewport({scale:1}),canvas=window.document.createElement('canvas');
   canvas.width=viewport.width;canvas.height=viewport.height;
   await pg.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   const pixels=canvas.toDataURL('image/png');canvas.width=canvas.height=1;
   const content=await pg.getTextContent();return{pixels,text:content.items.filter(item=>item.str).map(item=>item.str)};
  }finally{await document.destroy();}
 },Buffer.from(bytes).toString('base64'));
}
async function actualTool(browser,source){
 const context=await browser.newContext({viewport:{width:1366,height:1000}}),page=await context.newPage(),errors=[],remote=[];
 try{
  // Only this isolated test browser substitutes the guard; real authorization
  // and all OCR/model/controller code remain untouched.
  await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  await context.addInitScript(()=>{
   window.__swedishWorkerLanguages=[];let library;
   Object.defineProperty(window,'Tesseract',{configurable:true,get:()=>library,set:value=>{
    library=new Proxy(value,{get(target,key){
     if(key!=='createWorker')return Reflect.get(target,key);
     return(...args)=>{window.__swedishWorkerLanguages.push(args[0]);return target.createWorker(...args);};
    }});
   }});
  });
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(request.url()))remote.push(request.url());});
  await page.goto('http://127.0.0.1:'+server.address().port+'/drawing-tools.html');
  await page.waitForFunction(()=>window.DrawingToolsBridge&&window.DrawingOcrTool);
  await page.locator('#toolFile').setInputFiles({name:'swedish-raster-card.pdf',mimeType:'application/pdf',buffer:Buffer.from(source)});
  await page.waitForFunction(()=>document.body.classList.contains('hasDrawing')&&!document.getElementById('workspace').hasAttribute('aria-busy'));
  await page.evaluate(()=>DrawingOcrTool.setRegion({x:.03,y:.03,w:.94,h:.90},1));
  if(await page.locator('#toolPanel').isHidden())await page.locator('#toolsToggle').click();
  if(await page.locator('#ocrTools').getAttribute('open')===null)await page.locator('#ocrTools > summary').click();
  await page.locator('#ocrRead').click();
  await page.waitForFunction(()=>document.querySelector('#ocrResults [data-ocr-page]')&&!document.getElementById('ocrProgressDialog').open,null,{timeout:120000});
  await page.locator('#ocrResults [data-ocr-page="1"] > summary').click();
  await page.waitForSelector('#ocrResults pre');
  const preview=await page.locator('#ocrResults pre').allTextContents(),languages=await page.evaluate(()=>window.__swedishWorkerLanguages);
  assert.equal(languages.length,1,'the actual tool creates one OCR worker for the selected card');
  assert.deepEqual(languages[0],['swe','eng'],'the actual controller loads Swedish plus English');
  const found=expected.filter(word=>preview.some(text=>key(text).includes(key(word)))),corrections=[];
  if(found.length<7)console.error(JSON.stringify({uiText:await page.locator('#ocrResults').innerText(),status:await page.locator('#ocrStatus').textContent().catch(()=>''),errors,remote,languages}));
  assert(found.length>=7,'actual Ritningsverktyg review keeps accented names: '+JSON.stringify({found,preview}));
  assert(await page.locator('#ocrSave').isDisabled(),'the real tool still requires user review before saving');
  if(!found.includes('Dörrcentral')){
   await page.locator('#ocrResults .ocrUncertain > summary').click();
   const candidates=page.locator('#ocrResults .ocrReviewWord');let corrected=false;
   for(let index=0;index<await candidates.count();index++){
    const row=candidates.nth(index),input=row.locator('input[type="text"]'),before=await input.inputValue();
    if(!/central/i.test(before))continue;
    assert(!(await row.locator('input[type="checkbox"]').isChecked()),'an uncertain spelling must be excluded before review');
    const confidence=await row.locator('small').innerText();assert(Number.parseInt(confidence,10)<70);
    await input.fill('Dörrcentral');assert(await row.locator('input[type="checkbox"]').isChecked(),'a corrected Swedish word can be explicitly included');
    corrections.push({before,after:'Dörrcentral',confidence});corrected=true;
   }
   assert(corrected,'the cropped spelling difference must be available for review rather than silently accepted');
  }
  await page.screenshot({path:path.join(qa,'actual-tool-swedish-review.png'),fullPage:true});
  await page.locator('#ocrReviewApproval').check();
  const downloading=page.waitForEvent('download');await page.locator('#ocrSave').click();const file=await downloading;
  const output=fs.readFileSync(await file.path());fs.writeFileSync(path.join(qa,'actual-tool-swedish-searchable.pdf'),output);
  const original=await inspect(page,source),searchable=await inspect(page,output);
  assert.equal(searchable.pixels,original.pixels,'actual tool export retains the original raster appearance');
  for(const name of expected)assert(searchable.text.some(text=>key(text)===key(name)),'actual exported text preserves the accepted Swedish word '+name);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  return{languages,exactNames:found,corrections,exportedNames:expected};
 }finally{await context.close();}
}
async function run(){
 assert(fs.existsSync(path.join(root,'vendor/tesseract/lang/swe.traineddata.gz')),'The locally bundled Swedish OCR model is required.');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1100,height:1000}}),page=await context.newPage(),errors=[],remote=[],models=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{const url=request.url();if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(url))remote.push(url);if(/\.traineddata/.test(url))models.push(url);});
  await page.goto('http://127.0.0.1:'+server.address().port+'/qa');
  const png=await page.evaluate(()=>{
   const canvas=document.getElementById('fixture');canvas.width=1400;canvas.height=1600;
   const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.fillStyle='#111';ctx.font='bold 40px Arial';ctx.fillText('Beslagskod: GS23',65,95);
   ctx.font='34px Arial';
   const rows=[['Övrigt','Produkt','Mont av','Lev av'],['Dörrstängare','DC700','GS','DT'],['Karmöverföring','6696','GS','GS'],['Dörrautomatik','DBL','GS','DT'],['Dörrmagnet','GS23','GS','GS'],['Dörrcentral','DC700','GS','DT'],['Återställning','6696','GS','GS'],['Låshus','DBL','DT','GS']];
   const xs=[65,605,905,1135],ys=rows.map((_,index)=>180+index*115);
   ctx.strokeStyle='#222';ctx.lineWidth=2;
   for(let index=0;index<rows.length;index++){
    for(let column=0;column<rows[index].length;column++)ctx.fillText(rows[index][column],xs[column],ys[index]+65);
    ctx.beginPath();ctx.moveTo(50,ys[index]);ctx.lineTo(1350,ys[index]);ctx.stroke();
   }
   ctx.beginPath();ctx.moveTo(50,ys.at(-1)+115);ctx.lineTo(1350,ys.at(-1)+115);ctx.stroke();
   for(const x of [50,585,885,1115,1350]){ctx.beginPath();ctx.moveTo(x,ys[0]);ctx.lineTo(x,ys.at(-1)+115);ctx.stroke();}
   ctx.font='32px Arial';ctx.fillText('ÅÄÖ åäö',65,1270);
   ctx.fillText('Originalbilden skall behållas oförändrad.',65,1380);
   return canvas.toDataURL('image/png').split(',')[1];
  });
  const document=await PDFDocument.create(),image=await document.embedPng(Buffer.from(png,'base64'));
  document.addPage([700,800]).drawImage(image,{x:0,y:0,width:700,height:800});
  const source=await document.save({useObjectStreams:false});fs.writeFileSync(path.join(qa,'swedish-raster-card.pdf'),source);
  const sourceBase64=Buffer.from(source).toString('base64');
  const result=await page.evaluate(async({sourceBase64})=>{
   pdfjsLib.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.js';
   const pdf=await pdfjsLib.getDocument({data:Uint8Array.from(atob(sourceBase64),c=>c.charCodeAt(0))}).promise;
   async function read(language){
    const started=performance.now(),worker=await Tesseract.createWorker(language,1,{workerPath:'/vendor/tesseract/worker.min.js',corePath:'/vendor/tesseract/tesseract-core-lstm.wasm.js',langPath:'/vendor/tesseract/lang/',workerBlobURL:false,gzip:true,cacheMethod:'none'});
    try{
     await worker.setParameters({tessedit_pageseg_mode:6,preserve_interword_spaces:'1'});
     const output=await DrawingOcrReader.read({pdf,pages:[1],rect:{x:0,y:0,w:1,h:1},pdfjsLib,getWorker:async()=>worker});
     return{output,elapsedMs:Math.round(performance.now()-started)};
    }finally{await worker.terminate();}
   }
   try{return{english:await read('eng'),swedish:await read(['swe','eng'])};}finally{await pdf.destroy();}
  },{sourceBase64});
  const english=result.english.output.pages[0].words,swedish=result.swedish.output.pages[0].words;
  assert.equal(result.swedish.output.summary.errorPages,0);assert(swedish.length>25);
  const exact=expected.filter(word=>matches(swedish,word).length);
  const confident=expected.filter(word=>matches(swedish,word).some(item=>item.confidence>=70));
  assert(exact.length>=7,'Swedish OCR should retain the real accented product names: '+JSON.stringify({exact,words:swedish.map(word=>word.text)}));
  assert(confident.length>=6,'A sensible majority of Swedish names must be accurately recognized with measured confidence >=70: '+JSON.stringify(confident));
  for(const code of codes)assert(matches(swedish,code).length,'mixed Swedish/English OCR retains identifier '+code);
  const englishExact=expected.filter(word=>matches(english,word).length);
  assert(exact.length>=englishExact.length,'Swedish support should preserve at least as many exact Swedish names as the English baseline');
  const out=await PDFDocument.load(source,{updateMetadata:false});
  const report=await writer.appendToDocument(out,result.swedish.output);assert.equal(report.unsupported.length,0,'PDF font supports all OCR-produced ÅÄÖ/åäö');
  const output=await out.save({updateFieldAppearances:false});fs.writeFileSync(path.join(qa,'swedish-searchable-card.pdf'),output);
  const before=await inspect(page,source),after=await inspect(page,output);
  assert.equal(after.pixels,before.pixels,'adding Swedish searchable text leaves the original raster appearance pixel-identical');
  for(const word of exact)assert(after.text.some(text=>key(text)===key(word)),'native PDF.js extraction preserves '+word);
  for(const code of codes)assert(after.text.some(text=>key(text)===key(code)),'exported native text contains '+code);
  assert(models.some(url=>/\/swe\.traineddata\.gz$/.test(url)),'the Swedish model is fetched from the local project');
  assert(models.some(url=>/\/eng\.traineddata\.gz$/.test(url)),'the English fallback model is also local');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'OCR requires no external scripts/models/API');
  await page.locator('#fixture').screenshot({path:path.join(qa,'swedish-raster-card.png')});
  const actualUi=await actualTool(browser,source);
  const evidence={qa,expected,englishExact,englishText:english.map(word=>word.text).join(' '),swedishExact:exact,swedishConfident:confident,englishMs:result.english.elapsedMs,swedishMs:result.swedish.elapsedMs,swedishNames:swedish.filter(word=>exact.some(name=>key(name)===key(word.text))).map(word=>({text:word.text,confidence:word.confidence})),actualUi,report,models};
  fs.writeFileSync(path.join(qa,'evidence.json'),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
  console.log('PASS real local Swedish+English OCR: accented product names and identifiers, measured confidence, native searchable PDF text and pixel-identical original image');
 }finally{await browser?.close();server.close();}
}
run().catch(error=>{console.error(error);server.close();process.exitCode=1;});
