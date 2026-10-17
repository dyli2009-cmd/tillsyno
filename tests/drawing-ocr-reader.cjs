'use strict';
const assert=require('node:assert/strict');
const Reader=require('../drawing-ocr-reader.js');
const Geometry=require('../drawing-ocr-image-regions.js');
const OPS={save:1,restore:2,transform:3,paintImageXObject:4,constructPath:5};
const full={x:0,y:0,w:1,h:1};
const word=(text,x,y,w=60,h=12,confidence=96)=>({text,confidence,bbox:{x0:x,y0:y,x1:x+w,y1:y+h}});
const item=(str,x=100,y=900,width=60)=>({str,width,height:12,transform:[12,0,0,12,x,y]});
const canvasStats={created:[],copies:0};
function createCanvas(width,height){
 const context={fillStyle:null,fillRect(){},drawImage(){canvasStats.copies++;}};
 const canvas={width,height,getContext:()=>context};canvasStats.created.push(canvas);return canvas;
}
function page({native=[],image=true,width=1000,height=1000,rotation=0,operations,renderPending=false}={}){
 const transform=rotation===90?[0,1,1,0,0,0]:[1,0,0,-1,0,height];
 const state={renders:0,cancelled:0,operators:0,text:0};
 return{
  state,
  getViewport:({scale})=>({width:width*scale,height:height*scale,transform:transform.map(value=>value*scale)}),
  getTextContent:async()=>{state.text++;return{items:native};},
  getOperatorList:async()=>{state.operators++;const list=operations||(image?[[OPS.transform,[width,0,0,height,0,0]],[OPS.paintImageXObject,['img',width,height]]]:[[OPS.constructPath,[]]]);return{fnArray:list.map(op=>op[0]),argsArray:list.map(op=>op[1])};},
  render:options=>{state.renders++;assert.equal(options.annotationMode,0);return{promise:renderPending?new Promise(()=>{}):Promise.resolve(),cancel:()=>state.cancelled++};}
 };
}
function pdf(pages){return{numPages:pages.length,getPage:async n=>pages[n-1]};}
const options=(pages,extra={})=>({pdf:pdf(pages),pages:pages.map((_,i)=>i+1),rect:full,pdfjsLib:{OPS},createCanvas,dpi:72,...extra});

(async()=>{
 const native=page({native:[item('GS23')],image:false});let ocrCalls=0;
 const nativeResult=await Reader.read(options([native],{recognize:async()=>{ocrCalls++;return{data:{words:[]}};}}));
 assert.equal(nativeResult.pages[0].status,'native');assert.equal(nativeResult.pages[0].nativeCount,1);
 assert.equal(nativeResult.summary.skippedPages,1);assert.equal(ocrCalls,0);assert.equal(native.state.renders,0,'proven native-only pages avoid all rendering/OCR');

 const mixed=page({native:[item('GS23')]});const progress=[];
 const mixedResult=await Reader.read(options([mixed],{recognize:async()=>{ocrCalls++;return{data:{words:[word('GS23',100,90),word('Beslagskod:',100,200,90),word('DBLB',200,200,45),word('UPPST.',255,200,60),word('Mont',400,300,40),word('av',445,300,20),word('GS',400,350,30,12,42),word('DT',700,350,30)]}};},onProgress:value=>progress.push(value)}));
 const read=mixedResult.pages[0];
 assert.equal(mixed.state.renders,1,'the marked region is rendered only once');
 assert.equal(read.words.some(w=>w.text==='GS23'),false,'OCR words already covered by native text do not create duplicate layers');
 assert.deepEqual(read.words.map(w=>w.text),['Beslagskod:','DBLB','UPPST.','Mont','av','GS','DT'],'all labels/table cells are retained without GS/code restrictions');
 assert.equal(read.words.find(w=>w.text==='GS').lowConfidence,true,'uncertain words remain reviewable rather than silently removed');
 assert.equal(read.words.find(w=>w.text==='DT').x,700,'table columns keep their original positions');
 assert.equal(read.wordUnits,'viewport');assert.deepEqual(read.viewport.transform,[1,0,0,-1,0,1000]);
 assert.equal(mixedResult.summary.lowConfidenceWords,1);
 assert.equal(progress.at(0).etaMs,null,'ETA starts unknown');assert.equal(progress.at(-1).percent,100);
 assert.equal(progress.some(p=>p.pageIndex===1&&p.tileIndex===1&&p.etaMs===0),true,'completed chunks inform the estimate');
 assert.equal(progress.every((p,i)=>i===0||p.percent>=progress[i-1].percent),true,'progress never decreases');

 const logo=page({native:[item('WC')],operations:[[OPS.transform,[100,0,0,100,800,0]],[OPS.paintImageXObject,['logo']]]});
 const logoResult=await Reader.read(options([logo],{rect:{x:.05,y:.05,w:.5,h:.5},recognize:()=>{throw Error('OCR must not run');}}));
 assert.equal(logoResult.summary.skippedPages,1,'a raster logo outside the selection does not force OCR');

 const rotated=page({native:[item('WC')],image:false,rotation:90});
 const rotatedResult=await Reader.read(options([rotated],{rect:{x:.8,y:.05,w:.2,h:.2}}));
 assert.equal(rotatedResult.pages[0].nativeCount,1,'quarter-turn viewport geometry selects the correct native label');
 assert.deepEqual(rotatedResult.pages[0].viewport.transform,[0,1,1,0,0,0]);
 const imageRotated=page({rotation:90});
 const imageRotatedResult=await Reader.read(options([imageRotated],{rect:{x:.5,y:.4,w:.4,h:.3},recognize:async()=>({data:{words:[word('GS 23',20,30,40)]}})}));
 assert.equal(imageRotatedResult.pages[0].words[0].x,520);assert.equal(imageRotatedResult.pages[0].words[0].y,430,'OCR maps back to rotated viewport units');

 const tiled=page({width:3000,height:2000});let chunks=0;
 const tiledResult=await Reader.read(options([tiled],{recognize:async()=>{chunks++;return{data:{words:[]}};}}));
 assert.equal(tiled.state.renders,1);assert(chunks>1,'large marked cards use memory-bounded OCR copies');assert.equal(tiledResult.summary.ocrPages,1);
 assert(canvasStats.created.every(c=>c.width===1&&c.height===1),'all working canvases are released after reading');
 const plan=Reader.renderPlan({width:100000,height:50000},full,{});
 assert(plan.width*plan.height<=8000000);assert(plan.width<=8192&&plan.height<=8192);assert(plan.capped);
 const bounded=Reader.tilesFor(8192,5000);
 assert(bounded.every(tile=>tile.w*tile.h<=1200000&&tile.w<=1800&&tile.h<=1800));

 const masked=page();
 const maskResult=await Reader.read(options([masked],{excludeRects:{1:[{x:.15,y:.15,w:.1,h:.1}]},clipRects:{1:{x:0,y:0,w:.5,h:.5}},recognize:async()=>({data:{words:[word('MASKED',140,160,50),word('VISIBLE',100,300,50)]}})}));
 assert.deepEqual(maskResult.pages[0].words.map(w=>w.text),['VISIBLE'],'even a partially masked word is never made searchable');
 assert.deepEqual(maskResult.pages[0].rect,{x:0,y:0,w:.5,h:.5});
 const excludedResult=await Reader.read(options([masked],{rect:{x:.6,y:.6,w:.3,h:.3},clipRects:{1:{x:0,y:0,w:.2,h:.2}}}));
 assert.equal(excludedResult.pages[0].status,'excluded');

 const errorPage=page();
 const errorResult=await Reader.read(options([errorPage],{recognize:async()=>{throw Error('fixture OCR failure');}}));
 assert.equal(errorResult.pages[0].status,'error');assert.equal(errorResult.summary.errorPages,1,'per-page errors are explicit and cannot be mistaken for success');

 const abortController=new AbortController(),hung=page();let terminated=0;
 const hanging=Reader.read(options([hung],{signal:abortController.signal,getWorker:async()=>({recognize:()=>new Promise(()=>{}),terminate:()=>terminated++}),onProgress:p=>{if(p.phase==='ocr')setTimeout(()=>abortController.abort(),5);}}));
 await assert.rejects(hanging,error=>error.name==='AbortError');assert.equal(terminated,1,'aborting a hung recognition terminates its worker');
 const renderAbort=new AbortController(),hungRender=page({renderPending:true});
 const rendering=Reader.read(options([hungRender],{signal:renderAbort.signal,recognize:async()=>({}),onProgress:p=>{if(p.phase==='render')setTimeout(()=>renderAbort.abort(),5);}}));
 await assert.rejects(rendering,error=>error.name==='AbortError');assert(hungRender.state.cancelled>=1,'aborting also cancels a PDF.js render that never completes');

 const tsv='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n5\t1\t1\t1\t1\t1\t10\t20\t30\t12\t88\tWC';
 assert.equal(Reader.tesseractWords({data:{tsv}})[0].text,'WC');
 assert.equal(Reader.tesseractWords({data:{blocks:[{paragraphs:[{lines:[{words:[word('ABC',10,20)]}]}]}]}})[0].text,'ABC');

 const width=200,height=120,pixels=new Uint8ClampedArray(width*height*4);pixels.fill(255);
 function black(x,y){const offset=(y*width+x)*4;pixels[offset]=pixels[offset+1]=pixels[offset+2]=0;}
 for(let x=0;x<width;x++)black(x,60);for(let y=0;y<height;y++)black(120,y);
 for(let y=10;y<25;y++)black(10,y);let stored;
 const gridCanvas={width,height,getContext:()=>({getImageData:()=>({data:pixels,width,height}),putImageData:value=>stored=value})};
 assert(Reader.removeGridLines(gridCanvas)>0);assert(stored);assert.equal(pixels[(60*width+70)*4],255,'long table grid removed from OCR pixels');assert.equal(pixels[(15*width+10)*4],0,'short character stroke retained');

 const uncertain=await Geometry.inspect({getViewport:()=>({width:100,height:100}),getOperatorList:async()=>{throw Error('bad operator list');}},full,{OPS});
 assert.equal(uncertain.hasImages,true,'unknown image geometry keeps the conservative selected-region OCR path');
 console.log('PASS drawing OCR reader: native/mixed/rotated pages, arbitrary table text, bounded single-render tiles, masks/crops, review confidence, progress and cancellation');
})().catch(error=>{console.error(error);process.exitCode=1;});
