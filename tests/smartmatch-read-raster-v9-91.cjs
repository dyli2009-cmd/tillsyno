'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
// napi-rs/canvas resets a zero dimension to its default size; browsers retain zero.
const cleared=createCanvas(1,1);cleared.width=0;cleared.height=0;
const isReleased=e=>e.canvas.width===cleared.width&&e.canvas.height===cleared.height;
const context={window:{},document:{createElement:()=>createCanvas(1,1)},setTimeout,clearTimeout,setInterval,clearInterval};
for(const file of ['smartmatch-read-step-v9-88.js','smartmatch-read-match-v9-91.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
let renders=0,ocr=0,cleanup=0,fail=false;const released=[];
const page={getViewport:({scale})=>({width:2000*scale,height:1500*scale,convertToPdfPoint:(x,y)=>[x,y]}),getTextContent:async()=>({items:[]}),getAnnotations:async()=>[],render:()=>{renders++;return {promise:Promise.resolve(),cancel(){}};},cleanup(){cleanup++;}};
const options={pdf:{numPages:1,getPage:async()=>page},cardPages:[],codes:['GS31'],imageMode:'full',getWorker:async()=>({setParameters:async()=>{}}),recognize:async()=>{ocr++;if(fail)throw Error('OCR engine failed');return {data:{words:[]}};},onCanvasRelease:event=>released.push(event)};
(async()=>{
 await context.window.SmartMatchReadMatcher.scan(options);
 assert(ocr>10,'multiple tiles are OCRed');assert.equal(renders,1,'all tiles share one PDF rendering');assert.equal(cleanup,1);
 assert(released.some(e=>e.scope==='drawing-raster'));assert(released.every(isReleased));
 fail=true;await assert.rejects(context.window.SmartMatchReadMatcher.scan(options),/Sida 1: OCR engine failed/);assert.equal(cleanup,2,'page cleaned after failure');assert(released.every(isReleased),'raster and tile released after failure');
 const reader=fs.readFileSync('smartmatch-read-v9-91.js','utf8');assert(reader.includes('images.checked=false'),'manual search defaults to native text');
 console.log('PASS one PDF render for multiple OCR tiles, raster/tile release on success and failure, page-number error context, fast search default');
})().catch(error=>{console.error(error);process.exitCode=1;});
