/* Annotation-first search: skip huge drawing work only with complete indexed
 * coverage; keep mixed raster detection, exact IDs and cancellation intact. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const calls={text:0,annotations:0,operators:0,render:0,worker:0,recognize:0};
const ops={paintImageXObject:17},sandbox={window:{pdfjsLib:{OPS:ops}},setTimeout,
 document:{createElement(){return {width:1,height:1,getContext(){return {fillRect(){}};}};}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../smartmatch-read-match-v5.js'),'utf8'),sandbox);
const matcher=sandbox.window.SmartMatchReadMatcher;
function fixture({image=true,text=[],annotations=[],rotation=0}={}){
 const page={getViewport({scale}){return {width:1000*scale,height:1000*scale,
  convertToViewportRectangle:r=>rotation===90?[(1000-r[3])*scale,r[0]*scale,(1000-r[1])*scale,r[2]*scale]:[r[0]*scale,(1000-r[3])*scale,r[2]*scale,(1000-r[1])*scale],
  convertToPdfPoint:(x,y)=>rotation===90?[y/scale,1000-x/scale]:[x/scale,1000-y/scale]};},
  async getTextContent(){calls.text++;return {items:text};},
  async getAnnotations(){calls.annotations++;return annotations;},
  async getOperatorList(){calls.operators++;return {fnArray:image?[17]:[]};},
  render(){calls.render++;return {promise:Promise.resolve()};}};
 return {numPages:2,async getPage(){return page;}};
}
function stamp(subject='GS 23',extra={}){return {page:1,id:'4R',subtype:'Stamp',subject,contents:'',rect:[100,700,190,740],...extra};}
const native=(str,x=300,y=500)=>({str,width:70,height:14,transform:[14,0,0,14,x,y]});
function reset(){for(const key of Object.keys(calls))calls[key]=0;}
async function run(options={}){
 reset();return matcher.scan({pdf:fixture(),cardPages:[2],codes:['GS23'],
  annotationIndex:[stamp()],getWorker:async()=>{calls.worker++;return {async setParameters(){}};},
  recognize:async()=>{calls.recognize++;return {data:{words:[]}};},...options});
}
(async()=>{
 const fast=await run();
 assert.equal(fast.hits.length,1);assert.equal(fast.hits[0].code,'GS23');
 assert.equal(fast.hits[0].source,'PDF-stämpel');assert.equal(fast.hits[0].scanSource,'read-tool-v5');
 assert.equal(fast.version,2,'existing reviewed-position payload remains compatible');
 assert.deepEqual(calls,{text:0,annotations:0,operators:0,render:0,worker:0,recognize:0},'an indexed stamp needs no PDF appearance parsing or image reading');
 assert.equal(fast.pages[0].scanMode,'stamp-index');assert.equal(fast.pages[0].indexedHits,1);
 assert.equal(fast.pages[0].imageSkipped,true);assert.match(fast.warnings[0],/Övrig text och bilder kontrollerades inte/);
 const rotated=await run({pdf:fixture({rotation:90})});
 for(const [actual,expected]of Object.entries({x:.26,y:.1,w:.04,h:.09}))assert(Math.abs(rotated.hits[0].box[actual]-expected)<1e-10,'rotated annotations use the PDF viewport transform');
 assert.deepEqual(Array.from(rotated.hits[0].rect),[100,700,190,740],'PDF coordinates survive rotated drawing positions');
 const multiple=await run({codes:['GS23','GS24'],annotationIndex:[stamp(),stamp('GS24',{id:'5R',rect:[300,700,390,740]})]});
 assert.deepEqual(Array.from(multiple.hits,hit=>hit.code).sort(),['GS23','GS24']);
 assert.equal(calls.text+calls.render+calls.worker,0,'multiple requested codes can all use the fast indexed path');

 const sample=await run({sample:{page:1,code:'GS23',rect:{x:.12,y:.265,w:.04,h:.015}}});
 assert.equal(sample.hits.length,1,'small code example inside the stamp deduplicates with its complete stamp');
 assert.equal(calls.text+calls.render+calls.worker,0,'metadata can confirm the example without reading a huge drawing');
 await assert.rejects(run({sample:{page:1,code:'GS23',rect:{x:.8,y:.8,w:.05,h:.05}}}),/Kunde inte bekräfta/,'an unrelated rectangle cannot validate a stamp elsewhere');

 const labelled=await run({annotationIndex:[stamp('Beslagskod: GS 23')]});
 assert.equal(labelled.hits.length,1,'labelled metadata accepts complete identifiers');
 for(const subject of ['GS230','GS23A','GS23-A','AGS23','GS2','GS 23 / 1']){
  const absent=await run({pdf:fixture({image:false,text:[native('INGEN MATCH')]}),annotationIndex:[stamp(subject)]});
  assert.equal(absent.hits.length,0,'a different complete metadata identifier must not match: '+subject);
  assert.equal(absent.pages[0].imageSkipped,false);
 }
 for(const extra of [{flags:1},{flags:2},{flags:32},{rect:[100,700,100,740]},{rect:[NaN,700,190,740]},{rect:[1200,700,1300,740]},{page:2}]){
  const absent=await run({pdf:fixture({image:false,text:[native('INGEN MATCH')]}),annotationIndex:[stamp('GS23',extra)]});
  assert.equal(absent.hits.length,0,'hidden, malformed, outside-page and card-page metadata does not create drawing positions');
 }
 const comment=await run({pdf:fixture({image:false,text:[native('GS23')]}),annotationIndex:[stamp('GS23',{subtype:'Text'})]});
 assert.equal(comment.pages[0].imageSkipped,false,'a comment is not authoritative indexed stamp coverage');
 assert(calls.text>0,'non-stamp metadata retains native PDF search');

 const partial=await run({codes:['GS23','WC'],pdf:fixture({text:[native('WC')]})});
 assert(partial.hits.some(hit=>hit.code==='WC'),'uncovered IDs still use native text');
 assert(calls.recognize>0,'an uncovered requested code preserves mixed raster fallback even when native text also matches');
 assert.equal(partial.pages[0].imageSkipped,false);assert.equal(partial.pages[0].scanMode,'text-and-image');
 const mixed=await run({annotationIndex:[],pdf:fixture({text:[native('GS23')]})});
 assert(calls.recognize>0,'a native match does not hide image-only labels on the same page');
 assert.equal(mixed.hits.length,1);
 const full=await run({imageMode:'full',pdf:fixture({image:false})});
 assert(calls.recognize>0,'the explicit full option reads drawing images even when every code has indexed stamps');
 assert.equal(full.pages[0].imageSkipped,false);assert.equal(full.warnings.length,0);

 const contradictory=await run({codes:['GS23','GS22'],
  annotationIndex:[stamp('GS23',{contents:'GS22'})],
  pdf:fixture({annotations:[{id:'4R',subtype:'Stamp',contentsObj:{str:'GS22'},rect:[100,700,190,740]}]})});
 assert.equal(contradictory.hits.length,0,'contradictory metadata cannot create two links or reappear through the PDF.js contents fallback');
 assert(calls.recognize>0,'contradictory metadata forces the established image fallback');
 assert.match(contradictory.warnings[0],/motstridiga beteckningar/);
 const conflictAlongsideCoverage=await run({codes:['GS23','GS22'],annotationIndex:[
  stamp('GS23',{contents:'GS22'}),stamp('GS23',{id:'5R',rect:[300,700,390,740]}),stamp('GS22',{id:'6R',rect:[500,700,590,740]})]});
 assert.equal(conflictAlongsideCoverage.hits.length,2,'only unambiguous stamps remain linked');
 assert.equal(conflictAlongsideCoverage.pages[0].imageSkipped,false,'known conflicting stamps prevent the quick exit even if other stamps cover all codes');
 await assert.rejects(run({cancelled:()=>true}),/avbröts/);
 assert.equal(calls.text+calls.annotations+calls.render+calls.worker,0,'a cancelled scan stops before starting PDF or OCR work');

 let cancel=false;
 await assert.rejects(run({imageMode:'full',cancelled:()=>cancel,recognize:async()=>{calls.recognize++;cancel=true;return {data:{words:[]}};}}),/avbröts/);
 assert.equal(calls.recognize,1,'cancellation prevents another image tile');
 console.log('PASS TEST 5 indexed stamp speed path, metadata-confirmed example, full ID boundaries, hidden/invalid/card-page exclusion, partial coverage, mixed raster fallback, explicit full scan and cancellation');
})().catch(error=>{console.error(error);process.exitCode=1;});
