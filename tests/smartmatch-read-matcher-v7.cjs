/* Explicit PDF text search must never trigger rendering or OCR, even on a
 * mixed native/image page or while validating a marked example stamp. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const calls={pages:[],text:0,annotations:0,operators:0,canvas:0,render:0,worker:0,recognize:0};
const sandbox={window:{pdfjsLib:{OPS:{paintImageXObject:17}}},setTimeout,
 document:{createElement(){calls.canvas++;return {width:1,height:1,getContext(){return {fillRect(){}};}};}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../smartmatch-read-match-v7.js'),'utf8'),sandbox);
const matcher=sandbox.window.SmartMatchReadMatcher;
const native=(str,x=100,y=700)=>({str,width:70,height:14,transform:[14,0,0,14,x,y]});
const stamp=(subject='GS 23',extra={})=>({page:1,id:'4R',subtype:'Stamp',subject,contents:'',rect:[100,700,190,740],...extra});
function fixture({image=true,text=[native('GS23')],annotations=[]}={}){
 const drawing={getViewport({scale}){return {width:1000*scale,height:1000*scale,
  convertToViewportRectangle:r=>[r[0]*scale,(1000-r[3])*scale,r[2]*scale,(1000-r[1])*scale],
  convertToPdfPoint:(x,y)=>[x/scale,1000-y/scale]};},
  async getTextContent(){calls.text++;return {items:text};},
  async getAnnotations(){calls.annotations++;return annotations;},
  async getOperatorList(){calls.operators++;return {fnArray:image?[17]:[]};},
  render(){calls.render++;return {promise:Promise.resolve()};}};
 return {numPages:2,async getPage(page){calls.pages.push(page);assert.notEqual(page,2,'card pages are excluded from drawing search');return drawing;}};
}
function reset(){for(const key of Object.keys(calls))calls[key]=key==='pages'?[]:0;}
function assertLight(){
 assert.deepEqual({operators:calls.operators,canvas:calls.canvas,render:calls.render,worker:calls.worker,recognize:calls.recognize},
  {operators:0,canvas:0,render:0,worker:0,recognize:0},'text mode performs zero image classification, canvas allocation, rendering or OCR');
}
async function run(options={}){
 reset();return matcher.scan({pdf:fixture(),cardPages:[2],codes:['GS23'],annotationIndex:[],imageMode:'text',
  getWorker:async()=>{calls.worker++;return {async setParameters(){}};},
  recognize:async()=>{calls.recognize++;return {data:{words:[]}};},...options});
}
(async()=>{
 const mixed=await run();
 assert.equal(mixed.version,2);assert.equal(mixed.hits.length,1);assert.equal(mixed.hits[0].code,'GS23');
 assert.equal(mixed.hits[0].scanSource,'read-tool-v7');assert.equal(mixed.hits[0].source,'PDF-text');
 assert.equal(mixed.pages[0].scanMode,'text');assert.equal(mixed.pages[0].imageSkipped,true);
 assert.match(mixed.warnings[0],/bara finns i bilder kontrollerades inte/);
 assert.equal(calls.text,1);assert.equal(calls.annotations,1);assertLight();

 const indexed=await run({pdf:fixture({text:[native('GS23',400,400),native('GS230',100,300)]}),annotationIndex:[stamp()]});
 assert.equal(indexed.hits.length,2,'text mode also reads native positions when every code has indexed stamps');
 assert(indexed.hits.every(hit=>hit.code==='GS23'),'longer native identifiers are not shortened');
 assert.equal(indexed.hits.filter(hit=>hit.source==='PDF-stämpel').length,1);
 assert.equal(indexed.hits.filter(hit=>hit.source==='PDF-text').length,1);assertLight();

 const duplicate=await run({pdf:fixture({text:[],annotations:[stamp()]}),annotationIndex:[stamp()]});
 assert.equal(duplicate.hits.length,1,'metadata from the index and PDF.js deduplicates');assertLight();

 const fallback=await run({pdf:fixture({text:[],annotations:[{id:'5R',subtype:'Stamp',contentsObj:{str:'GS23'},rect:[300,500,390,540]}]})});
 assert.equal(fallback.hits.length,1,'PDF.js annotations work without a local stamp index');assertLight();

 const sampleRect={x:.09,y:.25,w:.12,h:.07};
 const indexedSample=await run({annotationIndex:[stamp()],sample:{page:1,code:'GS23',rect:sampleRect}});
 assert.equal(indexedSample.hits.length,1,'indexed examples deduplicate with native text in the same position');assertLight();
 const nativeSample=await run({sample:{page:1,code:'GS23',rect:sampleRect}});
 assert.equal(nativeSample.hits.length,1,'native examples validate without image reading');assertLight();
 const annotationSample=await run({pdf:fixture({text:[],annotations:[stamp()]}),sample:{page:1,code:'GS23',rect:sampleRect}});
 assert.equal(annotationSample.hits.length,1,'annotation-only examples validate without image reading');assertLight();
 await assert.rejects(run({pdf:fixture({text:[]}),sample:{page:1,code:'GS23',rect:sampleRect}}),/Sök även i bilder/,
  'an image-only example explicitly asks for the image option instead of silently starting OCR');assertLight();

 const noText=await run({pdf:fixture({text:[]})});
 assert.equal(noText.hits.length,0,'strict text search does not invent a hit for an image-only page');
 assert.match(noText.warnings[0],/Sök även i bilder/);assertLight();

 const auto=await run({imageMode:'auto',annotationIndex:[stamp()]});
 assert.equal(auto.pages[0].scanMode,'stamp-index');
 assert.equal(calls.text+calls.annotations+calls.operators+calls.render+calls.worker,0,'existing automatic stamp-first shortcut stays intact');

 const autoMixed=await run({imageMode:'auto'});
 assert.equal(autoMixed.pages[0].scanMode,'text-and-image');
 assert(calls.operators>0&&calls.render>0&&calls.recognize>0,'existing auto mixed-image fallback stays available');

 const full=await run({imageMode:'full',annotationIndex:[stamp()],recognize:async()=>{
  calls.recognize++;return {data:{words:[{text:'GS23',confidence:99,bbox:{x0:300,y0:300,x1:360,y1:320}}]}};
 }});
 assert.equal(full.pages[0].scanMode,'text-and-image');assert.equal(full.pages[0].imageSkipped,false);
 assert(full.hits.some(hit=>hit.source==='Bildläst'),'explicit image search still finds raster-only stamp positions');
 assert(calls.render>0&&calls.worker>0&&calls.recognize>0,'full mode still reads images even when metadata covers every code');

 await assert.rejects(run({cancelled:()=>true}),/avbröts/);
 assert.equal(calls.pages.length+calls.text+calls.annotations+calls.render+calls.worker,0,'cancelled work stops before PDF or image reading');
 console.log('PASS TEST 7 strict PDF text/stamp mode: zero rendering/OCR, indexed and native positions, sample validation, explicit image warning, card exclusion; auto and full image methods preserved');
})().catch(error=>{console.error(error);process.exitCode=1;});
