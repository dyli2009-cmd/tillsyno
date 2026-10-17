/* Color filtering and existing-position geometry for the additional-link tool. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={URL,console,setTimeout,clearTimeout,window:{},document:{currentScript:{src:'http://localhost/smartmatch-read-extra-v9-2.js'},readyState:'complete',getElementById:()=>null}};
context.window.window=context.window;vm.createContext(context);
vm.runInContext(fs.readFileSync('smartmatch-read-match-v9-2.js','utf8'),context);
vm.runInContext(fs.readFileSync('smartmatch-read-extra-v9-2.js','utf8'),context);
const api=context.window.SmartMatchReadExtraV92;
function pixels(...groups){const result=[];for(const [count,color] of groups)for(let n=0;n<count;n++)result.push(...color,255);return {data:new Uint8ClampedArray(result)};}
const red=api.pixelProfile(pixels([200,[255,255,255]],[30,[215,25,30]],[5,[235,120,120]]));
const blue=api.pixelProfile(pixels([200,[255,255,255]],[35,[20,40,205]]));
const darkred=api.pixelProfile(pixels([200,[255,255,255]],[35,[150,10,20]]));
const black=api.pixelProfile(pixels([200,[255,255,255]],[35,[20,20,20]]));
assert.equal(red.kind,'color');assert.equal(blue.kind,'color');assert.equal(black.kind,'black');
assert.equal(api.colorSame(red,blue),false);assert.equal(api.colorSame(red,darkred),true);assert.equal(api.colorSame(red,black),false);assert.equal(api.colorSame(black,black),true);
const yellowBackground=api.pixelProfile(pixels([1000,[255,255,0]],[35,[25,25,25]]));
assert.equal(yellowBackground.kind,'black','bright highlighter background does not become the text ink');
assert.equal(api.pixelProfile(pixels([20,[200,20,20]],[20,[20,20,200]])).kind,'unknown','multiple ink colors require explicit user choice');
assert.equal(api.pixelProfile(pixels([200,[255,255,255]])).kind,'unknown');
assert.equal(api.sameRect([10,10,50,30],[11,11,51,31]),true);
assert.equal(api.sameRect([10,10,50,30],[70,10,100,30]),false);
const matcher=context.window.SmartMatchReadMatcher;
assert.equal(matcher.textHits([{text:'DBL-DS',x:.1,y:.2,w:.2,h:.02}],["DBL"]).length,0);
assert.equal(matcher.textHits([{text:'DBL',x:.1,y:.2,w:.1,h:.02}],["DBL"]).length,1);
console.log('Additional links: ink colors, strict whole labels, and position geometry PASS');
(async()=>{
 let cancelled=false,activeTask=null,cleared=false,recognized=0;
 context.document.createElement=tag=>{assert.equal(tag,'canvas');return {width:0,height:0,getContext:()=>({fillStyle:'',fillRect(){}})};};
 const pg={getViewport:({scale})=>({width:100*scale,height:100*scale,convertToViewportRectangle:r=>r,convertToPdfPoint:(x,y)=>[x,y]}),getTextContent:async()=>({items:[]}),getAnnotations:async()=>[],render(){let reject;const promise=new Promise((_,no)=>{reject=no;});return {promise,cancel(){reject(Error('Rendering cancelled'));}};}};
 await assert.rejects(matcher.scan({pdf:{numPages:1,getPage:async()=>pg},cardPages:[],codes:['DBL'],imageMode:'full',codeOnly:true,getWorker:async()=>({setParameters:async()=>{}}),recognize:async()=>{recognized++;return {data:{words:[]}};},cancelled:()=>cancelled,onRenderTask:task=>{if(task){activeTask=task;setTimeout(()=>{cancelled=true;task.cancel();},0);}else cleared=true;}}),/cancelled|avbröts/);
 assert.ok(activeTask,'image render task is exposed for direct cancellation');assert.equal(cleared,true,'render ownership clears after cancellation');assert.equal(recognized,0,'cancelled crop is not OCR-read');
 console.log('Additional links: cancellable image-render hook PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
