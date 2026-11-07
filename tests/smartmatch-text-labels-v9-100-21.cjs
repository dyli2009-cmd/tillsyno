const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),T=require('../smartmatch-text-checks-v9-100-24.js');
const base={id:'text:manual',name:'LO14',page:1,rect:[20,30,70,54],kind:'label',comment:'Inväntar leverans'};
assert.equal(T.statusSymbol('pending'),'');assert.equal(T.statusSymbol('open'),'×');assert.equal(T.statusSymbol('done'),'✓');assert.equal(T.statusText('pending'),'Ej kontrollerat');
assert.equal(T.normalizeOne(base).color,T.DEFAULT_COLOR);assert.equal(T.normalizeOne(base).status,'pending');assert.equal(T.normalizeOne({...base,color:'#ABCDEF'}).color,'#abcdef');assert.equal(T.normalizeOne({...base,color:'red;display:none'}).color,T.DEFAULT_COLOR);
assert.equal(T.labelInk('#ffffff'),'#000000');assert.equal(T.labelInk('#000000'),'#ffffff');assert.equal(T.labelInk(T.DEFAULT_COLOR),'#000000');
const legacy=T.normalizeOne({...base,kind:undefined,color:undefined,status:'done'});assert.equal(legacy.kind,'region');assert.equal(legacy.status,'done');
const revived=T.normalize(JSON.parse(JSON.stringify([{...base,color:'#b7d9f2',status:'pending'}])));assert.equal(revived[0].kind,'label');assert.equal(revived[0].comment,base.comment);assert.equal(revived[0].color,'#b7d9f2');assert.equal(T.statusSymbol(revived[0].status),'');
const main=fs.readFileSync('smartmatch-read-main-v524.js','utf8'),a=main.indexOf('function readSampleRectangle('),b=main.indexOf('function cancelReadSample(',a),c=vm.createContext({});vm.runInContext(main.slice(a,b),c);
const plain=x=>JSON.parse(JSON.stringify(x)),vp={width:800,height:600,scale:2};
assert.deepEqual(plain(c.readSampleRectangle({x:100,y:100},{x:100,y:100},vp,{width:50,height:24})),{x:.125,y:1/6,w:.125,h:.08});
assert.deepEqual(plain(c.readSampleRectangle({x:799,y:599},null,vp,{width:50,height:24})),{x:.875,y:.92,w:.125,h:.08});
assert.equal(c.readSampleRectangle({x:100,y:100},null,vp),null,'a native-text scan still requires a region');
assert.deepEqual(plain(c.readSampleRectangle({x:300,y:250},{x:100,y:100},vp,{width:50,height:24})),{x:.125,y:1/6,w:.25,h:.25});
assert.equal(c.readSampleRectangle({x:100,y:100},{x:150,y:100},vp),null,'reject a zero-height selection');
console.log('PASS: neutral state without symbol, label/color migration and roundtrip, contrast choice, click/drag placement, zoom, edge clamping and scan-only guard');

// The real viewer route must not capture a label pointer before its click opens the editor.
const route=main.split("\n").find(line=>line.startsWith("el.viewer.addEventListener('pointerdown',e=>{if(e.target.closest"));
let listener,pan=0,tools=0;const routeContext=vm.createContext({el:{viewer:{addEventListener:(name,fn)=>listener=fn}},beginNoteDrag:()=>false,beginBulkDrag:()=>false,beginDrawingTool:()=>{tools++;return false},beginDrawingPan:()=>pan++});
vm.runInContext(route,routeContext);
listener({target:{closest:selector=>selector.includes('.smTextCheckHit')?{}:null}});assert.equal(pan,0);assert.equal(tools,0);
listener({target:{closest:()=>null}});assert.equal(pan,1);assert.equal(tools,1);
console.log('PASS: real viewer pointer route preserves label click and ordinary drawing pan');
