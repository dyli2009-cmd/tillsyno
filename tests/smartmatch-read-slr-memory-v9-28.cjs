const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../smartmatch-slr-test-module-read-v9-28.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../smartmatch-read-test-v9-28.html'),'utf8');

class TrackingBytes extends Uint8Array{
 constructor(values){super(values);this.sliceCalls=0;}
 slice(...args){this.sliceCalls++;return super.slice(...args);}
}

function load(mobile){
 const window={SmartMatchAppBridge:{getDrawingPerformanceProfile:()=>({mobile})}};
 const document={getElementById:()=>null,querySelectorAll:()=>[],createElement:()=>({})};
 const PDFLib={PDFName:{of:value=>value}};
 new Function('window','document','PDFLib','pdfjsLib',source)(window,document,PDFLib,{});
 return window.SmartMatchSLRTest;
}

const pdf={catalog:{get:()=>null}};
const mobileBytes=new TrackingBytes([37,80,68,70,45,49,46,55]);
const before=[...mobileBytes];
const mobile=load(true);
mobile.initProject(pdf,{},mobileBytes);
assert.equal(mobileBytes.sliceCalls,0,'iPad/mobile must retain the app source view without a full-size init copy');
assert.deepEqual([...mobileBytes],before,'SLR init must not mutate the shared app source bytes');

const desktopBytes=new TrackingBytes([37,80,68,70,45,49,46,55]);
load(false).initProject(pdf,{},desktopBytes);
assert.equal(desktopBytes.sliceCalls,1,'desktop keeps the established defensive source copy');

assert.match(source,/getDocument\(\{data:originalBytes\.slice\(\)\}\)/,
 'a parser that may detach its input must still receive a private temporary copy');
assert.doesNotMatch(source,/originalBytes\.(?:set|fill|copyWithin|reverse|sort)\s*\(/,
 'the retained mobile source view must remain read-only');
assert.match(html,/smartmatch-slr-test-module-read-v9-28\.js\?v=9\.28/);
assert.doesNotMatch(html,/smartmatch-slr-test-module-v36-132\.js\?v=36\.132/);
assert.equal(typeof mobile.saveTo,'function');
assert.equal(typeof mobile.verify,'function');

console.log('PASS TEST 9.28 SLR memory: mobile shares immutable app bytes; desktop copies; parser input remains private; export/verify API preserved.');
