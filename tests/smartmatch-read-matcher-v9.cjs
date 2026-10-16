'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const calls={text:0,adapter:0,annotations:0,operators:0,canvas:0,render:0,worker:0,recognize:0};
const sandbox={window:{pdfjsLib:{OPS:{paintImageXObject:17}}},setTimeout,
 document:{createElement(){calls.canvas++;return {width:1,height:1,getContext(){return {fillRect(){}};}};}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../smartmatch-read-match-v9.js'),'utf8'),sandbox);
const matcher=sandbox.window.SmartMatchReadMatcher;
const native=(str,x=100,y=700)=>({str,width:100,height:14,transform:[14,0,0,14,x,y]});
const stamp=(subject='GS 23',extra={})=>({page:1,id:'4R',subtype:'Stamp',subject,contents:'',rect:[100,700,200,740],...extra});
function fixture({text=[native('GS23')],annotations=[]}={}){
 const drawing={getViewport({scale}){return {width:1000*scale,height:1000*scale,
  convertToViewportRectangle:r=>[r[0]*scale,(1000-r[3])*scale,r[2]*scale,(1000-r[1])*scale],
  convertToPdfPoint:(x,y)=>[x/scale,1000-y/scale]};},
  async getTextContent(){calls.text++;return {items:text};},
  async getAnnotations(){calls.annotations++;return annotations;},
  async getOperatorList(){calls.operators++;return {fnArray:[17]};},
  render(){calls.render++;return {promise:Promise.resolve()};}};
 return {numPages:2,async getPage(page){assert.equal(page,1,'card pages must not be searched');return drawing;}};
}
const reset=()=>{for(const name of Object.keys(calls))calls[name]=0;};
const light=()=>assert.deepEqual({operators:calls.operators,canvas:calls.canvas,render:calls.render,worker:calls.worker,recognize:calls.recognize},
 {operators:0,canvas:0,render:0,worker:0,recognize:0},'code-only automatic mode must never classify, render or OCR the drawing');
async function run(options={}){
 reset();return matcher.scan({pdf:fixture(),cardPages:[2],codes:['GS23'],codeOnly:true,imageMode:'auto',
 getWorker:async()=>{calls.worker++;return {async setParameters(){}};},recognize:async()=>{calls.recognize++;return {data:{words:[]}};},...options});
}
(async()=>{
 const basic=await run();assert.equal(basic.hits.length,1);assert.equal(basic.hits[0].scanSource,'read-tool-v9');light();
 const absent=await run({codes:['MISSING'],pdf:fixture({text:[]})});
 assert.equal(absent.hits.length,0);assert.equal(absent.pages[0].scanMode,'text');light();
 const partialIndex=await run({codes:['GS23','DBLDS'],annotationIndex:[stamp()]});
 assert.equal(partialIndex.hits.length,1,'a missing identifier does not start image scanning');light();
 const compound=await run({codes:['DBLB OPPSD','DBLBOPPS','DBLDS'],pdf:fixture({text:[
  native('DBLb-OPPS',100,700),native('DBLB OPPSD',100,500),native('DBL-DS',100,300),native('DBLBOPPSX',100,100)]})});
 assert.deepEqual(Array.from(compound.hits.map(hit=>hit.code)).sort(),['DBLBOPPS','DBLBOPPSD','DBLDS'].sort());light();
 const notEqual=await run({codes:['DBLB OPPSD'],pdf:fixture({text:[native('DBLb-OPPS')]})});
 assert.equal(notEqual.hits.length,0,'extra D is never silently discarded');light();
 const bounds=await run({codes:['GS23'],pdf:fixture({text:[native('GS230'),native('GS23-A',100,500)]})});
 assert.equal(bounds.hits.length,0,'whole identifier boundaries prevent partial matches');light();
 const sample={page:1,code:'GS23',rect:{x:.09,y:.25,w:.12,h:.07}};
 await run({sample,getTextContent:async()=>{calls.adapter++;return {items:[native('GS 23')]};}});
 assert.equal(calls.adapter,1,'the selected sample and page pass share the supplied text cache');assert.equal(calls.text,0);light();
 await assert.rejects(run({pdf:fixture({text:[]}),sample}),/Sök även i bilder/);light();
 const full=await run({imageMode:'full',pdf:fixture({text:[]}),recognize:async()=>{
  calls.recognize++;return {data:{words:[{text:'GS23',confidence:98,bbox:{x0:300,y0:300,x1:400,y1:320}}]}};
 }});
 assert(full.hits.some(hit=>hit.source==='Bildläst'));assert(calls.render>0&&calls.recognize>0,'explicit full image search remains available');
 await run({codeOnly:false});assert(calls.render>0,'the existing full-flow automatic method stays available');
 console.log('PASS TEST 9 matcher: strict code-only stamp/native search, absent labels do not OCR, compound identifiers, whole ID boundaries, shared sample text, explicit image fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
