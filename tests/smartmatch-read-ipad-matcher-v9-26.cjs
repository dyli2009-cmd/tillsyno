/* TEST 9.26 iPad image-search contract. A full image search must stay on the
 * explicitly selected drawing page, allocate only bounded tiles, and release
 * every temporary page/canvas/worker through the public hooks. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const calls={pages:[],cleanups:[],renders:[],recognize:0,workers:0,workerRelease:0,pageRelease:[],canvasRelease:[]};
function canvas(){
 const value={width:0,height:0};
 value.getContext=()=>({canvas:value,fillStyle:'#fff',fillRect(){},clearRect(){}});
 return value;
}
const sandbox={
 setTimeout,clearTimeout,
 document:{createElement(name){assert.equal(name,'canvas');return canvas();}},
 window:{pdfjsLib:{OPS:{paintImageXObject:17}}}
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../smartmatch-read-match-v9-26.js'),'utf8'),sandbox);
const matcher=sandbox.window.SmartMatchReadMatcher;

function viewport(scale){
 const width=4000*scale,height=3000*scale;
 return {width,height,
  convertToViewportRectangle(rect){return [rect[0]*scale,(3000-rect[3])*scale,rect[2]*scale,(3000-rect[1])*scale]},
  convertToPdfPoint(x,y){return [x/scale,3000-y/scale]}
 };
}
function pageProxy(page){
 return {
  view:[0,0,4000,3000],
  getViewport({scale}){return viewport(scale)},
  async getTextContent(){
   // Native text confirms the marked sample. The explicit image mode still
   // checks this drawing page for other raster-only copies.
   return {items:[{str:'GS23',width:120,height:22,transform:[22,0,0,22,400,2400]}]};
  },
  async getAnnotations(){return []},
  async getOperatorList(){return {fnArray:[17]}},
  render({canvasContext}){
   calls.renders.push({page,pixels:canvasContext.canvas.width*canvasContext.canvas.height,width:canvasContext.canvas.width,height:canvasContext.canvas.height});
   return {promise:Promise.resolve()};
  },
  cleanup(){calls.cleanups.push(page)}
 };
}
const pdf={numPages:6,async getPage(page){calls.pages.push(page);return pageProxy(page)}};
const worker={async setParameters(){}};
const limits={
 minScale:1.15,maxScale:2.2,baseScale:1.5,maxRasterPixels:12000000,
 tileSize:640,tileStep:560,maxTilePixels:410000,
 sampleMaxPixels:700000,sampleMaxScale:3.5,
 appearanceMaxPixels:90000,appearanceMaxSide:1200,appearanceMaxScale:4
};

(async()=>{
 const result=await matcher.scan({
  pdf,cardPages:[5,6],codes:['GS23'],sample:{page:2,code:'GS23',rect:{x:.08,y:.15,w:.2,h:.12}},
  imageMode:'full',codeOnly:true,pageScope:[2],scanPages:[2],imageLimits:limits,
  async getWorker(){calls.workers++;return worker},
  async recognize(_worker,target){
   assert.equal(_worker,worker);calls.recognize++;
   assert(target.width*target.height<=limits.maxTilePixels,'OCR never receives an oversized tile');
   return {data:{confidence:0,words:[]}};
  },
  onPageRelease(info){calls.pageRelease.push({page:info.page,cleaned:calls.cleanups.filter(value=>value===info.page).length})},
  onCanvasRelease(info){calls.canvasRelease.push({page:info.page,scope:info.scope,width:info.canvas.width,height:info.canvas.height})},
  async onWorkerRelease(value){assert.equal(value,worker);calls.workerRelease++}
 });

 assert.deepEqual(Array.from(result.pages,entry=>entry.page),[2],'the result reports only the explicitly selected drawing page');
 assert(calls.pages.length>=2&&calls.pages.every(page=>page===2),'sample and image passes never open another page');
 assert(calls.renders.length>0&&calls.recognize===calls.renders.length,'every rendered image tile is OCR processed exactly once');
 assert(Math.max(...calls.renders.map(entry=>entry.pixels))<=limits.maxTilePixels,'rendered tile backing stores remain bounded');
 assert.equal(calls.canvasRelease.length,calls.renders.length,'every temporary tile runs the release callback');
 assert(calls.canvasRelease.every(entry=>entry.scope==='drawing-image'&&entry.page===2&&entry.width===0&&entry.height===0),'canvas backing stores are zeroed before the callback returns');
 assert.equal(calls.pageRelease.length,2,'the sample proxy and drawing proxy are both released');
 assert(calls.pageRelease.every(entry=>entry.page===2&&entry.cleaned>0),'PDFPageProxy.cleanup runs before its callback');
 assert.equal(calls.workers,1);assert.equal(calls.workerRelease,1,'the acquired OCR worker is returned exactly once');
 console.log('PASS TEST 9.26 iPad matcher: one-page full image scope, bounded tiles, and deterministic canvas/page/worker release');
})().catch(error=>{console.error(error);process.exitCode=1});
