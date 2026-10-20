'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const main=fs.readFileSync('smartmatch-read-test-main-v9-84.js','utf8');
const start=main.indexOf(' const headerCache=new Map()'),end=main.indexOf(' const byCard=new Map();',start);
assert(start>=0&&end>start);
function harness({ios=true,fail=false}={}){
 let pages=0,texts=0,cleanups=0;
 const context=vm.createContext({Map,Math,DRAWING_IS_IOS:ios,pdfjsLib:{Util:{transform:(_vp,item)=>item}},pdf:{getPage:async page=>{pages++;return {
  getViewport:()=>({transform:[1,0,0,1,0,0],width:600,height:800}),
  getTextContent:async()=>{texts++;if(fail){fail=false;throw Error('text failed')}return {items:[{str:'Beslagskod GS10',transform:[1,0,0,10,50,200]},{str:'Beslagskod GS20',transform:[1,0,0,10,350,200]},{str:'Other large page text',transform:[1,0,0,10,20,100]}]};},
  cleanup(){cleanups++;}
 };}}});
 vm.runInContext(main.slice(start,end)+';globalThis.readHeaders=readPageHeaders;',context);
 return {read:context.readHeaders,stats:()=>({pages,texts,cleanups})};
}
(async()=>{
 const h=harness(),first=await h.read(1),second=await h.read(1);
 assert.equal(first,second,'cards on the same PDF page reuse the same header coordinates');
 assert.equal(first.headers.length,2);assert.equal(first.headers[1].x,350);assert.equal(first.headers[1].y,190);
 assert.deepEqual(Object.keys(first.headers[0]).sort(),['x','y'],'cache retains coordinates only');
 assert.deepEqual(h.stats(),{pages:1,texts:1,cleanups:1});
 await h.read(2);assert.deepEqual(h.stats(),{pages:2,texts:2,cleanups:2});
 const failed=harness({fail:true});await assert.rejects(()=>failed.read(1),/text failed/);
 assert.deepEqual(failed.stats(),{pages:1,texts:1,cleanups:1},'failed extraction still releases page data');
 await failed.read(1);assert.deepEqual(failed.stats(),{pages:2,texts:2,cleanups:2},'a failed extraction can be retried');
 const desktop=harness({ios:false});await desktop.read(1);
 assert.equal(desktop.stats().cleanups,0,'desktop viewer rendering can remain active');
 console.log('PASS: one header extraction per page, coordinate-only cache, iOS cleanup on success/failure, retry and desktop rendering safety.');
})().catch(error=>{console.error(error);process.exitCode=1});

