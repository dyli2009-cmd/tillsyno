const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=require('../detector-scan-core.js'),{PDFDocument,rgb,StandardFonts}=require('../vendor/pdf-lib.min.js'),pdfjs=require('../vendor/pdf.min.js');
pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
const strong=(text,family,confidence=95)=>({text,family,confidence});
const strict={minVotes:3,minFamilies:2,lead:2};
assert.equal(core.consensusNumber([strong('22','original'),strong('22','normalized'),strong('52','normalized'),strong('52','contrast'),strong('52','strokes'),strong('52','contrast')],strict).code,'52');
assert.equal(core.consensusNumber([strong('22','original'),strong('22','normalized'),strong('52','normalized'),strong('52','contrast')],strict),null);
assert.equal(core.consensusNumber([strong('52','normalized'),strong('52','normalized'),strong('52','normalized')],strict),null);
assert.equal(core.consensusNumber([strong('0052','original'),strong('0052','normalized'),strong('0052','contrast')],strict).code,'0052');
assert.equal(core.consensusNumber([strong('52','original',79),strong('52','normalized',79),strong('52','contrast',79)],strict),null);
const sample={version:1,width:30,height:20,textHeight:10,angle:0,page:1,x:.1,y:.2,code:'3',confirmed:true};
const second={...sample,x:.7,code:'52'};
assert.equal(core.sampleProfiles({detectorSample:sample}).length,1);
assert.deepEqual(core.sampleProfiles({detectorSamples:[sample,second],detectorSample:second}).map(s=>s.code),['3','52']);
assert.equal(core.sampleProfiles({}).length,0);
const bitmap={width:5,height:5,data:new Uint8ClampedArray(100).fill(255)};bitmap.data.set([90,90,90,255],48);
const crisp=core.binaryNumber(bitmap),thick=core.binaryNumber(bitmap,true);
assert.equal(crisp.data[48],0);assert.equal(crisp.data[0],255);assert.equal(thick.data[24],0);assert.equal(thick.data[0],255);assert.equal(bitmap.data[48],90,'Preprocessing must not modify original pixels');
(async()=>{
 const doc=await PDFDocument.create(),page=doc.addPage([600,400]);page.drawRectangle({x:20,y:100,width:30,height:20,borderColor:rgb(0,0,0),borderWidth:.5});
 const pdf=await pdfjs.getDocument({data:await doc.save()}).promise,p=await pdf.getPage(1);
 const pixels=()=>{const data=new Uint8ClampedArray(48*48*4).fill(255);for(let y=8;y<40;y++)for(let x=17;x<27;x++)data.set([0,0,0,255],(y*48+x)*4);return{width:48,height:48,data}};
 let calls=0,closed=0,modes=[],queue=[];
 const sandbox={DetectorScanCore:core,window:{Tesseract:true},Tesseract:{createWorker:async()=>({setParameters:async p=>modes.push(p.tessedit_pageseg_mode),recognize:async()=>({data:queue[calls++]}),terminate:async()=>closed++})},document:{baseURI:'https://test.invalid/',createElement:()=>{const c={width:0,height:0};c.getContext=()=>({fillRect(){},translate(){},rotate(){},drawImage(){},getImageData:pixels,createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}});return c;}},setTimeout,URL};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../detector-scan-vision.js'),'utf8'),sandbox);
 const rendered={pageNumber:1,rotate:0,getViewport:a=>p.getViewport(a),getOperatorList:()=>p.getOperatorList(),getTextContent:()=>p.getTextContent(),render:()=>({promise:Promise.resolve(),cancel(){}})};
 for(const [numbers,expected]of [[['22','22','52','22','52','52','52','52'],'52'],[['22','22','52','22','52','52','22','52'],null]]){
  calls=0;modes=[];queue=numbers.map(text=>({text,confidence:95}));const session=sandbox.window.DetectorVision.createSession(),r=await session.scanPage(rendered,pdfjs,{...sample,confirmed:false},()=>{},{mode:'careful'});session.close();assert.equal(calls,8,'Careful mode must not stop at the first two agreeing misreads');assert.equal(r.hits[0]?.code||null,expected);if(!expected){assert.equal(r.pending.length,1);assert.deepEqual(Array.from(r.pending[0].suggestions).sort(),['22','52']);assert.equal(r.unread,1);}
 }
 calls=0;queue=[];const session=sandbox.window.DetectorVision.createSession(),kept=await session.scanPage({...rendered,getOperatorList:async()=>({fnArray:[],argsArray:[]})},pdfjs,[sample,second],()=>{},{mode:'careful'});session.close();assert.deepEqual(Array.from(kept.hits,h=>h.code).sort(),['3','52']);assert.equal(calls,0,'All confirmed example positions are kept, without OCR guesses');
 calls=0;queue=[];const ignoredSession=sandbox.window.DetectorVision.createSession(),ignored=await ignoredSession.scanPage(rendered,pdfjs,{...sample,confirmed:false},()=>{},{mode:'careful',ignored:[{page:1,x:35/600,y:290/400,width:30/600,height:20/400}]});ignoredSession.close();assert.equal(ignored.hits.length,0);assert.equal(calls,0,'Rejected frames are not read again');
 calls=0;queue=Array(2).fill({text:'6',confidence:95}).concat(Array(2).fill({text:'9',confidence:95}));
 const angles=sandbox.window.DetectorVision.createSession(),ambiguous=await angles.scanPage(rendered,pdfjs,[{...sample,confirmed:false},{...sample,confirmed:false,angle:180}]);angles.close();assert.equal(ambiguous.hits.length,0,'Opposite example orientations must not silently choose 6 or 9');assert.deepEqual(Array.from(ambiguous.pending[0].suggestions).sort(),['6','9']);
 assert.equal(closed,3);
 const mixedDoc=await PDFDocument.create(),font=await mixedDoc.embedFont(StandardFonts.Helvetica),mixedPage=mixedDoc.addPage([600,400]);
 for(const [x,w,h,size,code]of [[20,30,20,12,'3'],[200,100,70,40,'52']]){mixedPage.drawRectangle({x,y:200,width:w,height:h,borderColor:rgb(0,0,0),borderWidth:.5});mixedPage.drawText(code,{x:x+5,y:210,font,size});}
 const mixedPdf=await pdfjs.getDocument({data:await mixedDoc.save()}).promise,mp=await mixedPdf.getPage(1),mock={...rendered,getViewport:a=>mp.getViewport(a),getOperatorList:()=>mp.getOperatorList(),getTextContent:()=>mp.getTextContent()};
 const multi=sandbox.window.DetectorVision.createSession(),single=await multi.scanPage(mock,pdfjs,{...sample,confirmed:false}),both=await multi.scanPage(mock,pdfjs,[{...sample,confirmed:false},{...sample,confirmed:false,width:100,height:70,textHeight:40}]);multi.close();assert.deepEqual(Array.from(single.hits,h=>h.code),['3']);assert.deepEqual(Array.from(both.hits,h=>h.code).sort(),['3','52'],'A new example extends the search without losing the old frame style');await mixedPdf.destroy();await pdf.destroy();console.log('PASS: careful eight-read consensus, independent image preparations, ambiguous review, leading zeroes, contrast repair, multiple examples and legacy profile compatibility.');
})().catch(e=>{console.error(e);process.exitCode=1});
