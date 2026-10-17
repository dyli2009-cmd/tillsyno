'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {discover}=require('../smartmatch-read-codes-v9-1.js');
function loadMatcher(file){
 const sandbox={window:{pdfjsLib:{OPS:{paintImageXObject:17}}},setTimeout,
  document:{createElement(){return {width:1,height:1,getContext(){return {fillRect(){}};}};}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox);
 return sandbox.window.SmartMatchReadMatcher;
}
const matcher=loadMatcher('smartmatch-read-match-v9-1.js'),previous=loadMatcher('smartmatch-read-match-v9.js');
const word=(str)=>({str,width:70,height:14,transform:[14,0,0,14,100,350]});
function drawingPdf(events,options={}){
 return {numPages:4,async getPage(page){
  assert([1,3].includes(page),'card pages are not drawing work units');
  if(events)assert(events.some(e=>e.state==='start'&&e.page===page),'current page is reported before reading begins');
  if(options.failPage===page)throw Error('broken page');
  return {getViewport({scale}){return {width:500*scale,height:500*scale,
   convertToViewportRectangle:r=>[r[0]*scale,(500-r[3])*scale,r[2]*scale,(500-r[1])*scale],
   convertToPdfPoint:(x,y)=>[x/scale,500-y/scale]};},
   async getTextContent(){return {items:options.empty?[]:[word('GS23')]};},
   async getAnnotations(){return [];},async getOperatorList(){return {fnArray:[]};},
   render(){return {promise:Promise.resolve()};}};
 }};
}
function matchingOptions(events,overrides={}){
 return {pdf:drawingPdf(events),cardPages:[2,4],codes:['GS23'],codeOnly:true,imageMode:'auto',onDetail:event=>events.push({...event}),...overrides};
}
const rect={x:.05,y:.05,w:.7,h:.1};
function cardsPdf(events){return {numPages:4,async getPage(page){
 assert(events.some(e=>e.state==='start'&&e.page===page),'discovery reports page before awaiting its PDF data');
 return {getViewport(){return {width:595,height:842};},async getTextContent(){return {items:[]};}};
}};}
(async()=>{
 const text=[];const result=await matcher.scan(matchingOptions(text));
 assert.deepEqual(text.map(e=>[e.state,e.page,e.pageIndex,e.done,e.total]),[
  ['start',1,1,0,2],['complete',1,1,1,2],['start',3,2,1,2],['complete',3,2,2,2]]);
 assert(text.every(e=>e.phase==='drawing-text'&&e.unit==='page'&&e.pageCount===2&&e.scope==='drawing-pages'));
 const older=await previous.scan(matchingOptions([],{pdf:drawingPdf(null)}));
 assert.equal(JSON.stringify(result),JSON.stringify(older),'adding progress must not change matched results');
 const indexed=[];await matcher.scan(matchingOptions(indexed,{codeOnly:false,annotationIndex:[1,3].map(page=>({page,subtype:'Stamp',subject:'GS23',rect:[100,300,200,330]}))}));
 assert.deepEqual(indexed.map(e=>[e.state,e.done]),[['start',0],['complete',1],['start',1],['complete',2]],'metadata shortcut completes each actual page');
 const images=[];let ocrCount=0;
 await matcher.scan(matchingOptions(images,{pdf:drawingPdf(images,{empty:true}),imageMode:'full',getWorker:async()=>({async setParameters(){}}),recognize:async()=>{
  const current=images.filter(e=>e.phase==='drawing-image').at(-1);
  assert.equal(current.state,'start');assert.equal(current.done,ocrCount%4,'current unrecognized area never counts as completed');
  ocrCount++;return {data:{words:[]}};
 }}));
 assert.equal(ocrCount,8);
 for(const page of [1,3]){
  const events=images.filter(e=>e.phase==='drawing-image'&&e.page===page);
  assert.equal(events[0].done,0,'new page begins at zero before worker preparation');
  assert(events.every(e=>e.scope==='drawing-page-'+page&&e.total===4&&e.pageCount===2&&e.unit==='area'));
  assert.deepEqual(events.filter(e=>e.state==='complete').map(e=>e.done),[1,2,3,4]);
 }
 const failed=[];await assert.rejects(matcher.scan(matchingOptions(failed,{pdf:drawingPdf(failed,{failPage:3})})),/broken page/);
 assert.equal(failed.at(-1).state,'start');assert.equal(failed.at(-1).page,3);assert.equal(failed.at(-1).done,1);
 const ocrFailed=[];await assert.rejects(matcher.scan(matchingOptions(ocrFailed,{imageMode:'full',getWorker:async()=>({async setParameters(){}}),recognize:async()=>{throw Error('OCR failed');}})),/OCR failed/);
 assert.equal(ocrFailed.at(-1).phase,'drawing-image');assert.equal(ocrFailed.at(-1).state,'start');assert.equal(ocrFailed.at(-1).done,0);
 const cancelled=[];let stop=false;await assert.rejects(matcher.scan(matchingOptions(cancelled,{cancelled:()=>stop,onDetail:e=>{cancelled.push(e);if(e.state==='complete')stop=true;}})),/avbröts/);
 assert.equal(cancelled.length,2,'cancellation stops before reporting a next page');
 const sample=[];await matcher.scan(matchingOptions(sample,{sample:{page:1,code:'GS23',rect:{x:.15,y:.22,w:.25,h:.14}}}));
 assert.equal(sample[0].phase,'sample');assert.equal(sample[0].done,0);assert.equal(sample[1].done,1);
 const cards=[];const found=await discover({pdf:cardsPdf(cards),examplePage:3,codeRect:rect,codeOnly:true,codePages:[1,3,4],readNative:async({pageNumber})=>'GS'+pageNumber,onDetail:e=>cards.push({...e})});
 assert.deepEqual(cards.map(e=>[e.state,e.page,e.pageIndex,e.done,e.total]),[
  ['start',3,1,0,3],['complete',3,1,1,3],['start',1,2,1,3],['complete',1,2,2,3],['start',4,3,2,3],['complete',4,3,3,3]]);
 assert.deepEqual(found.cardPages,[1,3,4]);assert(cards.every(e=>e.scope==='card-pages'&&e.phase==='card-discovery'&&e.pageCount===3));
 const full=[];await discover({pdf:cardsPdf(full),examplePage:3,codeRect:rect,tableRect:{x:.05,y:.2,w:.8,h:.5},readNative:async({pageNumber,kind})=>kind==='code'?'GS'+pageNumber:'Produkt Antal Montage\nCylinder GS\nTrycke GS',onDetail:e=>full.push({...e})});
 assert.deepEqual(full.map(e=>[e.state,e.page,e.pageIndex,e.done]),[
  ['start',3,1,0],['complete',3,1,1],['start',1,2,1],['complete',1,2,2],['start',2,3,2],['complete',2,3,3],['start',4,4,3],['complete',4,4,4]]);
 const cardCancel=[];const abort=new AbortController();await assert.rejects(discover({pdf:cardsPdf(cardCancel),examplePage:3,codeRect:rect,codeOnly:true,signal:abort.signal,readNative:async()=>{abort.abort();return 'GS23';},onDetail:e=>cardCancel.push({...e})}),{name:'AbortError'});
 assert.equal(cardCancel.length,1);assert.equal(cardCancel[0].state,'start','aborted page never reports completion');
 console.log('PASS TEST 9.1 progress details: page-start before PDF work, selected-page totals, metadata/text completion, image area completion after OCR, per-page scopes, failure/cancel, unchanged matching results');
})().catch(error=>{console.error(error);process.exitCode=1;});
