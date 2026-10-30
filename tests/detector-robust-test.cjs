const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=require('../detector-scan-core.js'),pdfjs=require('../vendor/pdf.min.js');
const {PDFDocument,StandardFonts,rgb}=require('../vendor/pdf-lib.min.js');
pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
(async()=>{
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),p=doc.addPage([600,400]);
 function label(code,x,y,w,h,size){p.drawRectangle({x,y,width:w,height:h,borderColor:rgb(0,0,0),borderWidth:.4});if(code)p.drawText(code,{x:x+w*.25,y:y+h*.25,font,size});}
 label('3',20,300,30,20,10);label('52',100,280,66,44,24);label('56',200,310,12,8,5);
 label('57',260,300,30,20,1); // Numeric layer exists but fails geometric validation.
 label('',320,300,30,20,10); // Thin outlined digit, erased in the coarse scan.
 label('PSU',380,300,30,20,6);label('9-16',440,300,30,20,6);
 label('',20,200,110,8,10); // Long wall/furniture rectangle must not become detector 1.
 const pdf=await pdfjs.getDocument({data:await doc.save()}).promise,page=await pdf.getPage(1),vp=page.getViewport({scale:1}),profile={version:1,width:30,height:20,textHeight:10,angle:0,nativeRotation:0};
 let calls=0,queue=['57','58','1','1','1'],coarseReads=0,closed=0;
 const image=ink=>{const data=new Uint8ClampedArray(48*48*4).fill(255);if(ink)for(let y=8;y<40;y++)for(let x=17;x<27;x++)data.set([0,0,0,255],(y*48+x)*4);return{width:48,height:48,data};};
 const sandbox={DetectorScanCore:core,window:{Tesseract:true},Tesseract:{createWorker:async()=>({setParameters:async()=>{},recognize:async()=>({data:{text:queue[calls++],confidence:95}}),terminate:async()=>{closed++}})},document:{baseURI:'https://test.invalid/',createElement:()=>{const c={width:0,height:0};c.getContext=()=>({fillRect(){},translate(){},rotate(){},drawImage(source){c.coarse=source.coarse},getImageData(){if(c.coarse)coarseReads++;return image(!c.coarse)}});return c;}},setTimeout,URL};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../detector-scan-vision.js'),'utf8'),sandbox);
 const rendered={pageNumber:1,rotate:0,getViewport:o=>page.getViewport(o),getOperatorList:()=>page.getOperatorList(),getTextContent:()=>page.getTextContent()};
 // The scan image is blank; high-resolution crops contain numeric strokes.
 const create=sandbox.document.createElement;sandbox.document.createElement=()=>{const c=create();c.coarse=false;const ctx=c.getContext();ctx.canvas=c;c.getContext=()=>ctx;return c;};
 rendered.render=opts=>{opts.canvasContext.canvas.coarse=opts.canvasContext.canvas.width>=opts.viewport.width*.9;return{promise:Promise.resolve(),cancel(){}}};
 const session=sandbox.window.DetectorVision.createSession(),result=await session.scanPage(rendered,pdfjs,profile);session.close();
 assert.deepEqual(Array.from(result.hits,h=>h.code).sort(),['3','52','56','57','58']);assert.equal(calls,5,'Uncertain frames get the bounded retry, while long boxes cannot become digit 1');assert(coarseReads>0);assert.equal(closed,1);
 assert.equal(core.similarFrame({left:0,top:0,right:66,bottom:44},profile),false);
 assert.equal(core.similarFrame({left:0,top:0,right:66,bottom:44},profile,1,true),true);
 assert.equal(core.similarFrame({left:0,top:0,right:240,bottom:160},profile,1,true),false);
 const confirmed={...profile,confirmed:true,code:'0052',page:1,x:.5,y:.5};
 assert.equal(core.confirmedSampleHit(confirmed,vp,1).code,'0052');assert.equal(core.confirmedSampleHit(confirmed,vp,2),null);assert.equal(core.confirmedSampleHit({...confirmed,confirmed:false},vp,1),null);
 calls=0;queue=[];const empty={...rendered,getOperatorList:async()=>({fnArray:[],argsArray:[]}),getTextContent:async()=>({items:[],styles:{}})};
 const fallback=sandbox.window.DetectorVision.createSession(),kept=await fallback.scanPage(empty,pdfjs,confirmed);fallback.close();assert.deepEqual(Array.from(kept.hits,h=>h.code),['0052']);assert.equal(calls,0,'User-confirmed location survives even when bulk extraction finds no frame');
 await pdf.destroy();console.log('PASS: larger/smaller frames, incomplete numeric layer, thin strokes missed in overview, confirmed sample retention and letters/ranges exclusion.');
})().catch(e=>{console.error(e);process.exitCode=1});
