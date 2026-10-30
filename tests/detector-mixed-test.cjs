// Exercise the real PDF reader and vision orchestration. OCR output/rendering
// are deterministic doubles here; the bundled OCR is also checked in browser QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {PDFDocument,StandardFonts,rgb}=require('../vendor/pdf-lib.min.js');
const pdfjs=require('../vendor/pdf.min.js'),core=require('../detector-scan-test/core.js');
pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
(async()=>{
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),p=doc.addPage([600,400]);
 function label(code,x,size=10){p.drawRectangle({x,y:300,width:30,height:20,borderColor:rgb(0,0,0),borderWidth:.6});if(code)p.drawText(code,{x:x+8,y:303,font,size});}
 label('3',20);label('2',80,22);label('',140);label('PSU',200,6);label('9–16',260,6);
 const pdf=await pdfjs.getDocument({data:await doc.save()}).promise,page=await pdf.getPage(1),profile={version:1,width:30,height:20,textHeight:10,angle:0,reading:'text',nativeRotation:0};
 const vector=await core.scanPage(page,pdfjs);
 assert.deepEqual(core.filterByProfile(vector.hits,profile,page.getViewport({scale:1})).map(h=>h.code),['3','2']);
 let calls=0,closed=0,fail=false;
 const ctx={fillRect(){},translate(){},rotate(){},drawImage(){},getImageData(){return {width:1,height:1,data:new Uint8ClampedArray([255,255,255,255])}}};
 const sandbox={DetectorScanCore:core,window:{Tesseract:true},Tesseract:{createWorker:async()=>({setParameters:async()=>{},recognize:async()=>{calls++;if(fail)throw Error('offline');return{data:{text:'5',confidence:92}}},terminate:async()=>{closed++}})},document:{baseURI:'https://test.invalid/',createElement:()=>({width:0,height:0,getContext:()=>ctx})},setTimeout,URL};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../detector-scan-test/vision.js'),'utf8'),sandbox);
 const rendered={pageNumber:1,rotate:0,getViewport:a=>page.getViewport(a),getOperatorList:()=>page.getOperatorList(),getTextContent:()=>page.getTextContent(),render:()=>({promise:Promise.resolve(),cancel(){}})};
 const session=sandbox.window.DetectorVision.createSession(),result=await session.scanPage(rendered,pdfjs,profile);
 assert.deepEqual(Array.from(result.hits,h=>h.code).sort(),['2','3','5']);assert.equal(result.ocr,1);assert.equal(calls,1,'Only the textless frame goes to OCR; letters/ranges remain excluded');session.close();assert.equal(closed,1);
 fail=true;const offline=sandbox.window.DetectorVision.createSession(),partial=await offline.scanPage(rendered,pdfjs,profile);assert.equal(partial.ocrFailed,true);assert.equal(partial.unread,1);assert.deepEqual(Array.from(partial.hits,h=>h.code),['3','2']);offline.close();
 await pdf.destroy();console.log('PASS: larger digits in matching frames, mixed text/outlined-digit fallback, letters/ranges excluded, OCR failure retains readable results and workers close.');
})().catch(e=>{console.error(e);process.exitCode=1});
