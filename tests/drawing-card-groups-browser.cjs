/* Generated PDF integration coverage for code-only door-card grouping.
 * Auth substitution is restricted to this local test browser.
 * DRAWING_GROUP_DEVICE=desktop|iphone|ipad limits the device run.
 * DRAWING_GROUP_REAL_OCR=1 uses the bundled offline OCR instead of a crop stub. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {PDFDocument,StandardFonts,PDFName,PDFArray,PDFRawStream,decodePDFRawStream,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),qa=process.env.DRAWING_GROUP_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'drawing-card-groups-'));
const devices=[{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true},{name:'ipad',width:1024,height:1366,touch:true}].filter(x=>!process.env.DRAWING_GROUP_DEVICE||x.name===process.env.DRAWING_GROUP_DEVICE);
const field={x:.08,y:.065,w:.67,h:.065};
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
async function fixture(page,raster=false){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 const codes=['GS23','GS23','GS23','GS24','GS24','WC140C','GS230',null,null];
 for(const [i,code]of codes.entries()){
  const pg=doc.addPage([600,800]);
  if(code){
   if(raster&&i===2){
    const base64=await page.evaluate(()=>{
     const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=110;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1100,110);ctx.fillStyle='#111';ctx.font='48px Arial';ctx.fillText('Beslagskod GS23',20,76);return canvas.toDataURL('image/png').split(',')[1];
    });
    const image=await doc.embedPng(Buffer.from(base64,'base64'));pg.drawImage(image,{x:58,y:704,width:385,height:38.5});
   }else pg.drawText('Beslagskod '+code,{x:60,y:720,size:20,font});
   pg.drawText('DORRLITTERA '+(140+i)+' '+(i%2?'HOGER':'VANSTER'),{x:60,y:650,size:16,font});
   pg.drawText('PLAN '+(i%3+1)+' - VARIANT '+(i+1),{x:60,y:610,size:14,font});
   pg.drawText('Produkt '+(i+1)+' - original body is retained',{x:60,y:460,size:13,font});
   pg.drawRectangle({x:45,y:400,width:500,height:300,borderWidth:.4,borderColor:rgb(.1,.2,.3)});
  }else if(i===7){
   pg.drawText('OVERSIKTSRITNING',{x:60,y:640,size:20,font});
   pg.drawText('GS23 appears elsewhere, outside the marked header',{x:60,y:300,size:16,font});
   pg.drawLine({start:{x:50,y:100},end:{x:540,y:500},thickness:.2,color:rgb(.2,.3,.4)});
  }
  if(i===1){
   const link=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[55,445,480,480],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:require('../vendor/pdf-lib.min.js').PDFString.of('https://example.test/retained-original-page-2')}}));
   pg.node.set(PDFName.of('Annots'),doc.context.obj([link]));
  }
 }
 doc.setTitle('Original door-card groups fixture');
 return Buffer.from(await doc.save({useObjectStreams:false}));
}
async function freeHeadingFixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 const headings=[...Array(7).fill('Beslagskod: DBLB upp SD'),'Beslagskod: DBLB upp ST','WC / 23 + A (höger)','DBLB upp SD','Beslagskod DBLB upp SD','Beslagskod: DBLBupp SD','RUBRIK',null];
 for(const [index,heading]of headings.entries()){
  const pg=doc.addPage([600,800]);
  if(heading){
   const text=index===5?'beslagskod:  dblb upp sd':index===6?'Beslagskod:\nDBLB upp SD':heading;
   pg.drawText(text,{x:60,y:index===6?726:720,size:16,lineHeight:20,font});
   pg.drawText('DORRLITTERA '+(501+index)+' - '+(index%2?'HOGER':'VANSTER'),{x:60,y:650,size:16,font});
   pg.drawText('PLAN '+(index%3+1)+' - UNIQUE BODY '+(index+1),{x:60,y:610,size:14,font});
   pg.drawRectangle({x:50,y:300,width:300+index*5,height:200,borderWidth:.3,borderColor:rgb(.1,.2,.3)});
  }
 }
 doc.setTitle('Free heading text with seven matching door cards');
 return Buffer.from(await doc.save({useObjectStreams:false}));
}
async function contextFor(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(({realOCR})=>{
  window.__cardCalls={capture:false,pages:{},ocr:[],workers:0,terminated:0,textDelay:0,ocrDelay:0,ocrNever:false,ocrConfidence:99};
  if(!realOCR)window.Tesseract={createWorker:async()=>{
   window.__cardCalls.workers++;
   return {setParameters:async()=>{},terminate:async()=>{window.__cardCalls.terminated++;},recognize:async canvas=>{
    const calls=window.__cardCalls;calls.ocr.push({width:canvas.width,height:canvas.height});
    // Tesseract termination can leave an in-flight recognize promise pending.
    // Cancellation must unlock the UI independently of that promise settling.
    if(calls.ocrNever)return new Promise(()=>{});
    if(calls.ocrDelay)await new Promise(resolve=>setTimeout(resolve,calls.ocrDelay));
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let ink=0;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i]<150&&pixels[i+1]<150&&pixels[i+2]<150)ink++;
    const text=ink>30?'Beslagskod GS23':'',confidence=calls.ocrConfidence;
    return {data:{text,confidence,words:text?[{text:'Beslagskod',confidence,bbox:{x0:10,y0:10,x1:200,y1:50}},{text:'GS23',confidence,bbox:{x0:220,y0:10,x1:330,y1:50}}]:[]}};
   }};
  }};
  else{
   let tesseract;
   Object.defineProperty(window,'Tesseract',{configurable:true,get:()=>tesseract,set:value=>{
    tesseract=new Proxy(value,{get(target,key){
     if(key!=='createWorker')return Reflect.get(target,key);
     return async(...args)=>{
      window.__cardCalls.workers++;const worker=await target.createWorker(...args);
      return new Proxy(worker,{get(target,key){
       const value=target[key];if(typeof value!=='function')return value;
       return(...args)=>{if(key==='recognize'){const canvas=args[0];window.__cardCalls.ocr.push({width:canvas.width,height:canvas.height});}return value.apply(target,args);};
      }});
     };
    }});
   }});
  }
  let pdfjs;
  Object.defineProperty(window,'pdfjsLib',{configurable:true,get:()=>pdfjs,set:value=>{
   pdfjs=new Proxy(value,{get(target,key){
    if(key!=='getDocument')return Reflect.get(target,key);
    return(...args)=>{
     const task=target.getDocument(...args);let promise;
     return new Proxy(task,{get(task,key){
      if(key!=='promise'){const value=task[key];return typeof value==='function'?value.bind(task):value;}
      return promise||=task.promise.then(doc=>{
       const pages=new Map();
       return new Proxy(doc,{get(doc,key){
        if(key!=='getPage'){const value=doc[key];return typeof value==='function'?value.bind(doc):value;}
        return async number=>{
         if(!pages.has(number))pages.set(number,new Proxy(await doc.getPage(number),{get(pg,key){
          const value=pg[key];if(typeof value!=='function')return value;
          return(...args)=>{
           const calls=window.__cardCalls;
           if(calls.capture&&['getTextContent','render','getOperatorList'].includes(key)){
            const page=calls.pages[number]||={getTextContent:0,getOperatorList:0,render:0};page[key]++;
            if(key==='getTextContent'&&calls.textDelay)return new Promise(resolve=>setTimeout(resolve,calls.textDelay)).then(()=>value.apply(pg,args));
           }
           return value.apply(pg,args);
          };
         }}));
         return pages.get(number);
        };
       }});
      });
     }});
    };
   }});
  }});
 },{realOCR:process.env.DRAWING_GROUP_REAL_OCR==='1'});
 return context;
}
async function ready(page){await page.waitForFunction(()=>document.body.classList.contains('hasDrawing')&&!document.getElementById('workspace').hasAttribute('aria-busy'));}
async function open(page,bytes){await page.locator('#toolFile').setInputFiles({name:'groups.pdf',mimeType:'application/pdf',buffer:bytes});await ready(page);await page.waitForFunction(()=>document.getElementById('previewCanvas').width>10);}
async function tools(page){if(await page.locator('#toolPanel').isHidden())await page.locator('#toolsToggle').click();const parent=page.locator('#analysisTools');if(await parent.getAttribute('open')===null)await parent.locator(':scope > summary').click();const section=page.locator('#cardGroupTools');if(await section.getAttribute('open')===null)await section.locator('summary').click();}
async function dragField(page,device){
 const rect=await page.locator('#previewCanvas').boundingBox(),start={x:rect.x+rect.width*field.x,y:rect.y+rect.height*field.y},end={x:rect.x+rect.width*(field.x+field.w),y:rect.y+rect.height*(field.y+field.h)};
 if(device.touch){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();}
}
async function download(page){const pending=page.waitForEvent('download');await page.locator('#savePdf').click();await page.locator('#pdfSaveConfirm').click();const file=await pending;return fs.readFileSync(await file.path());}
async function sourceStreams(doc,pageNo){
 const pg=doc.getPage(pageNo),contents=pg.node.Contents(),streams=contents instanceof PDFArray?contents.asArray():[contents];
 return streams.filter(Boolean).map(ref=>{const stream=doc.context.lookup(ref);assert(stream instanceof PDFRawStream);return Buffer.from(decodePDFRawStream(stream).decode()).toString('base64');});
}
async function assertLossless(original,output,indices){
 const src=await PDFDocument.load(original),out=await PDFDocument.load(output);
 assert.equal(out.getPageCount(),indices.length);assert.equal(out.getTitle(),src.getTitle());
 for(const [index,sourceIndex]of indices.entries()){
  assert.deepEqual(await sourceStreams(out,index),await sourceStreams(src,sourceIndex),'page '+(sourceIndex+1)+' original content streams retained');
  assert.deepEqual(out.getPage(index).getSize(),src.getPage(sourceIndex).getSize());
  const sourceAnnots=src.getPage(sourceIndex).node.lookupMaybe(PDFName.of('Annots'),PDFArray);
  if(sourceAnnots)assert.equal(out.getPage(index).node.lookup(PDFName.of('Annots'),PDFArray).size(),sourceAnnots.size(),'retained card annotations stay intact');
 }
}
async function markHeader(page,device){
 await tools(page,'Dubbla dörrkort');await page.locator('#cardMarkHeader').click();await dragField(page,device);
 await page.waitForFunction(()=>!document.getElementById('cardHeaderRect').hidden);
 await tools(page,'Dubbla dörrkort');
 assert((await page.locator('#cardHeaderInfo').textContent()).trim(),'marked header has a visible status');
}
async function capture(page,extra={}){await page.evaluate(extra=>{window.__cardCalls={capture:true,pages:{},ocr:[],workers:0,terminated:0,textDelay:0,ocrDelay:0,ocrNever:false,ocrConfidence:99,...extra};},extra);}
async function scan(page,mode,extra={}){
 await tools(page,'Dubbla dörrkort');await page.locator('#cardReadMode').selectOption(mode);await capture(page,extra);await page.locator('#cardScan').click();
 await page.waitForFunction(()=>!document.getElementById('cardScanDialog').open&&document.querySelector('#cardGroupResults [data-card-key]'),null,{timeout:60000});
 return page.evaluate(()=>{window.__cardCalls.capture=false;return window.__cardCalls;});
}
async function group(page,key){
 const group=page.locator('#cardGroupResults details[data-card-key="'+key+'"]');
 assert.equal(await group.count(),1,'exact group '+key+' exists');
 if(await group.getAttribute('open')===null)await group.locator('summary').click();
 return group;
}
async function assertGroups(page){
 for(const [key,pages]of [['BESLAGSKOD GS23',[1,2,3]],['BESLAGSKOD GS24',[4,5]],['BESLAGSKOD WC140C',[6]],['BESLAGSKOD GS230',[7]]]){
  const section=await group(page,key),rows=await section.locator('[data-card-page]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.cardPage)));
  assert.deepEqual(rows,pages,'only selected-header code determines '+key+' membership');
  assert.equal(await section.locator('input[data-card-remove]:disabled').count(),1,'each group must always retain one card');
 }
 assert.equal(await page.locator('#cardGroupResults [data-card-page="8"], #cardGroupResults [data-card-page="9"]').count(),0,'drawing and blank pages are not extra door cards');
 assert.equal(await page.locator('#pageList .removed').count(),0,'reading and reviewing groups never removes pages automatically');
}
async function assertFreeHeadingFlow(page,device){
 const bytes=await freeHeadingFixture();await open(page,bytes);await markHeader(page,device);
 const calls=await scan(page,'text');
 assert.equal(calls.workers,0,'free heading text is grouped without OCR');
 assert.equal(calls.ocr.length,0);
 const target=await group(page,'BESLAGSKOD: DBLB UPP SD');
 assert.deepEqual(await target.locator('[data-card-page]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.cardPage))),[1,2,3,4,5,6,7],'seven matching multiword headings group despite line breaks, case, spacing and different door bodies');
 assert(await target.locator('[data-card-keep="1"]').isChecked(),'first of seven matching cards is retained by default');
 assert.equal(await target.locator('[data-card-remove]:checked').count(),6,'only the six other cards in this group are removal candidates');
 for(const [key,pageNo]of [['BESLAGSKOD: DBLB UPP ST',8],['WC / 23 + A (HÖGER)',9],['DBLB UPP SD',10],['BESLAGSKOD DBLB UPP SD',11],['BESLAGSKOD: DBLBUPP SD',12],['RUBRIK',13]]){
  const section=await group(page,key);
  assert.deepEqual(await section.locator('[data-card-page]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.cardPage))),[pageNo],'arbitrary heading '+key+' is retained as a distinct singleton');
  assert(await section.locator('[data-card-remove]').isDisabled(),'singleton arbitrary text cannot be removed as an extra');
 }
 assert.equal(await page.locator('#cardGroupResults [data-card-page="14"]').count(),0,'empty field is retained outside the heading groups');
 assert.equal(await page.locator('#pageList .removed').count(),0,'matching arbitrary text alone does not change the PDF');
 await page.screenshot({path:path.join(qa,device.name+'-free-heading-review.png')});
 await page.locator('#cardApply').click();
 await page.waitForFunction(()=>document.querySelectorAll('#pageList .removed').length===6);
 assert.deepEqual(await page.locator('#pageList .removed').allTextContents(),['2','3','4','5','6','7'],'only the six approved matching-heading extras are removed');
 const output=await download(page);await assertLossless(bytes,output,[0,7,8,9,10,11,12,13]);
 fs.writeFileSync(path.join(qa,device.name+'-free-heading-selected.pdf'),output);
 console.log('PASS '+device.name+': seven Beslagskod: DBLB upp SD headings including multiline, arbitrary punctuation/text, distinct word spaces and labels, six reviewed removals and original content retained');
}
async function runDevice(browser,device){
 const context=await contextFor(browser,device),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/drawing-tools.html');
  const bytes=await fixture(page);fs.writeFileSync(path.join(qa,'groups-native.pdf'),bytes);
  await open(page,bytes);await tools(page,'Dubbla dörrkort');
  assert.equal(await page.locator('#cardReadMode').inputValue(),'auto','default mode reads text before selected-region images');
  assert(await page.locator('#cardScan').isDisabled(),'reading requires an explicit marked header field');
  await markHeader(page,device);
  const calls=await scan(page,'text');await assertGroups(page);
  assert.equal(calls.workers,0,'native text mode does not start OCR');assert.deepEqual(calls.ocr,[]);
  assert(Object.keys(calls.pages).length>=8,'all retained PDF pages are inspected for header text');
  assert(Object.values(calls.pages).every(x=>x.getOperatorList===0),'text-only search never inspects image operators');
  assert.equal(await page.locator('#cardGroupResults [data-card-page="6"] input[data-card-remove]').isDisabled(),true,'arbitrary singleton code is never selected for removal');
  const gs23=await group(page,'BESLAGSKOD GS23');await gs23.locator('[data-card-keep="2"]').check();
  assert(await gs23.locator('[data-card-remove="1"]').isChecked(),'old representative becomes an extra when keeper changes');
  assert(await gs23.locator('[data-card-remove="2"]').isDisabled(),'new representative cannot be deleted');
  await gs23.locator('[data-card-remove="3"]').uncheck();
  await gs23.locator('[data-card-preview="3"]').click();
  await page.waitForFunction(()=>document.getElementById('pageInfo').textContent.includes('3')&&document.getElementById('toolPanel').hidden);
  await tools(page,'Dubbla dörrkort');
  assert(!(await page.locator('[data-card-remove="3"]').isChecked()),'preview preserves the decision to keep an individual extra');
  await group(page,'BESLAGSKOD GS24');
  await page.screenshot({path:path.join(qa,device.name+'-review.png')});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'group controls fit the viewport');
  await page.locator('#cardApply').click();
  await page.waitForFunction(()=>document.querySelectorAll('#pageList .removed').length===2);
  const removed=await page.locator('#pageList .removed').allTextContents();assert.deepEqual(removed,['1','5'],'only approved extra pages are removed');
  const exported=await download(page);await assertLossless(bytes,exported,[1,2,3,5,6,7,8]);fs.writeFileSync(path.join(qa,device.name+'-selected.pdf'),exported);
  if(await page.locator('#toolPanel').isVisible())await page.locator('#closeTools').click();
  await page.locator('#undoDrawing').click();assert.equal(await page.locator('#pageList .removed').count(),0,'one undo restores the whole approved batch');
  await page.locator('#redoDrawing').click();assert.equal(await page.locator('#pageList .removed').count(),2,'redo restores the batch');
  await page.locator('#undoDrawing').click();
  await open(page,bytes);await markHeader(page,device);await page.locator('#cardReadMode').selectOption('text');
  await capture(page,{textDelay:120});await page.locator('#cardScan').click();
  await page.waitForFunction(()=>document.getElementById('cardScanDialog').open&&Object.values(window.__cardCalls.pages).some(x=>x.getTextContent>0));
  await page.locator('#cardScanCancel').click();
  await page.waitForFunction(()=>!document.getElementById('cardScanDialog').open&&!document.getElementById('workspace').hasAttribute('aria-busy'));
  assert.equal(await page.locator('#pageList .removed').count(),0,'cancelling reading removes nothing');
  await assertLossless(bytes,await download(page),[0,1,2,3,4,5,6,7,8]);
  const raster=await fixture(page,true);await open(page,raster);await markHeader(page,device);
  const rasterCalls=await scan(page,'auto');await assertGroups(page);
  assert(rasterCalls.workers>0&&rasterCalls.ocr.length>0,'auto mode falls back to OCR for the selected raster header');
  assert(rasterCalls.ocr.every(x=>x.width>0&&x.height>0&&x.height/x.width<.3),'OCR receives only the marked short header crop, never an entire portrait card');
  if(device.name==='desktop'&&process.env.DRAWING_GROUP_REAL_OCR!=='1'){
   await scan(page,'auto',{ocrConfidence:40});await assertGroups(page);
   const lowConfidence=(await group(page,'BESLAGSKOD GS23')).locator('.cardReadWarning');
   assert(await lowConfidence.isVisible(),'nonempty low-confidence OCR is grouped with a visible review advisory');
   assert((await lowConfidence.textContent()).trim(),'low-confidence advisory contains an explanation');
   console.log('PASS desktop: OCR confidence 40 remains in its matching group with a visible review advisory');
   await capture(page,{ocrNever:true});await page.locator('#cardScan').click();
   await page.waitForFunction(()=>document.getElementById('cardScanDialog').open&&window.__cardCalls.ocr.length>0);
   await page.locator('#cardScanCancel').click();
   await page.waitForFunction(()=>!document.getElementById('cardScanDialog').open&&!document.getElementById('workspace').hasAttribute('aria-busy')&&!document.getElementById('workspace').inert&&!document.querySelector('.headerActions').inert,null,{timeout:2000});
   assert(await page.locator('#cardScan').isEnabled(),'cancelling unresolved OCR promptly restores reading controls');
   assert.equal(await page.locator('#pageList .removed').count(),0,'hung OCR cancellation never removes pages');
   assert.equal(await page.locator('#cardGroupResults [data-card-key]').count(),0,'hung OCR cancellation discards partial groups');
   assert(await page.evaluate(()=>window.__cardCalls.terminated>0),'cancel also terminates the OCR worker');
   assert.match(await page.locator('#cardGroupStatus').textContent(),/avbröts/i,'cancelled scan is clearly acknowledged');
   const retry=await scan(page,'text'),retryGroup=await group(page,'BESLAGSKOD GS23');
   assert.deepEqual(await retryGroup.locator('[data-card-page]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.cardPage))),[1,2],'native text rescan succeeds after an OCR promise that never settles');
   assert.equal(retry.ocr.length,0,'text retry does not resume the cancelled OCR task');
   assert.equal(await page.locator('#pageList .removed').count(),0,'retry also leaves page selection unchanged');
   console.log('PASS desktop: never-settling OCR cancels and unlocks within 2 seconds, discards partial results, and permits a native text retry');
  }
  await assertFreeHeadingFlow(page,device);
  assert.deepEqual(errors,[],'no browser runtime errors');
  console.log('PASS '+device.name+': code-only grouping, arbitrary code, mouse/touch selection, representative choice, individual keep, cancellation, undo/redo and lossless PDF export; OCR '+JSON.stringify(rasterCalls.ocr));
 }catch(error){
  await page.screenshot({path:path.join(qa,device.name+'-failure.png')}).catch(()=>{});
  console.error('Browser state:',await page.evaluate(()=>({message:document.getElementById('toolMessage')?.textContent,header:document.getElementById('cardHeaderInfo')?.textContent,status:document.getElementById('cardGroupStatus')?.textContent,errors:window.__cardCalls})).catch(()=>null),errors);
  throw error;
 }finally{await context.close();}
}
(async()=>{
 fs.mkdirSync(qa,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});for(const device of devices)await runDevice(browser,device);console.log('QA files: '+qa);}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
