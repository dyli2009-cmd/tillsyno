'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const G=require('../smartmatch-card-changes-v9-100.js'),C=require('../smartmatch-position-changes-v9-100.js');
const w=(text,x,y)=>({text,x,y,w:text.length*5,h:10});
const words=[w('Dörrautomatik',40,100),w('ED100',200,100),w('GS',300,100),w('Slutbleck',40,130),w('ES19',200,130),w('DT',300,130),w('Dörrautomatik',40,200),w('ED100',200,200)];
const source={key:'da-first',label:'Dörrautomatik',value:'ED100',sourceIdentity:'gs:first:da',sourceY:105};
const card={workItems:[source],tableWords:words},size={width:600,height:800};
const a={id:'a',code:'GS4',position:1,checks:{},overrides:{},customItems:[]},b={id:'b',code:'GS4',position:2,overrides:{},customItems:[]};
C.set(a,{...source,source:'base'},{excluded:true,note:'Ska inte monteras',color:'red'});
let result=G.locate(card,C.active(a),words,size);assert.equal(result.marks.length,1);assert.equal(result.unplaced.length,0);
let box=result.marks[0].rect;assert(box.y<100/800&&box.y+box.h>110/800);assert(box.y+box.h<130/800,'the DT strike row is not marked');assert.equal(box.x*600,38);
assert.equal(G.locate(card,C.active(b),words,size).marks.length,0,'shared GS4 card does not inherit another position’s change');
C.restore(a,{...source,source:'base'});assert.equal(G.locate(card,C.active(a),words,size).marks.length,0);
C.set(a,{...source,source:'base'},{excluded:false,note:'Kontrollera placering',color:'blue'});
assert.equal(G.locate(card,C.active(a),words,size).marks[0].change.color,'blue');
assert.equal(G.locate(card,C.active(a),words,size).marks[0].change.excluded,false);
const ambiguous={...card,workItems:[{...source,sourceY:undefined}]};result=G.locate(ambiguous,C.active(a),words,size);assert.equal(result.marks.length,0);assert.equal(result.unplaced.length,1,'ambiguous duplicate products produce a visible notice, no guessed row');
const sideBySide=[...words.slice(0,3),w('Dörrautomatik',360,100),w('ED100',510,100)];assert.equal(G.locate(card,C.active(a),sideBySide,size).marks.length,0);
const scoped={...card,bounds:{x:0,y:0,w:.55,h:1}};assert.equal(G.locate(scoped,C.active(a),sideBySide,size).marks.length,1,'physical card bounds separate cards on one PDF page');
const wrongModel=words.map(word=>word.text==='ED100'?{...word,text:'ED1000'}:word);assert.equal(G.locate(card,C.active(a),wrongModel,size).marks.length,0,'ED100 is not a substring match for ED1000');
assert.equal(G.locate(card,C.active(a),[],size).unplaced.length,1);
assert.equal(G.locate(card,[{...C.active(a)[0],source:'custom'}],words,size).unplaced.length,1,'a manually added product is not marked on a source row');
const joined=[w('Dörrautomatik ED100',40,100)];assert.equal(G.locate(card,C.active(a),joined,size).marks.length,1);
const split=[w('Dörr',40,100),w('automatik',63,100),w('ED',200,100),w('100',212,100)];assert.equal(G.locate(card,C.active(a),split,size).marks.length,1,'split PDF/OCR words still match the same label and model');
const multiline=[w('Dörrautomatik',40,100),w('ED100',200,111)];assert.equal(G.locate({...card,workItems:[{...source,sourceRows:[0,1]}]},C.active(a),multiline,size).marks.length,1);
const region={x:.02,y:.08,w:.6,h:.5},cropped=G.crop(box,region);assert(Math.abs(cropped.x-(box.x-region.x)/region.w)<1e-9);assert(Math.abs(cropped.y-(box.y-region.y)/region.h)<1e-9);
assert.equal(G.crop(box,{x:0,y:.8,w:1,h:.2}),null);

class Element{
 constructor(){this.children=[];this.style={setProperty:(key,value)=>this.style[key]=value};this.attributes={};this.dataset={};}
 replaceChildren(){this.children=[];}
 append(...children){this.children.push(...children);}
 setAttribute(key,value){this.attributes[key]=value;}
}
const window={SmartMatchPositionChanges:C},document={createElement:()=>new Element()},dom=vm.createContext({window,document,console});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../smartmatch-card-changes-v9-100.js'),'utf8'),dom);
const layer=new Element(),notice=new Element(),geometry=G.locate(card,C.active(a),words,size);
window.SmartMatchCardChanges.render(layer,notice,geometry,{region,width:180,height:200,position:a});
assert.equal(layer.children.length,1);assert.equal(layer.style.width,'180px');assert.equal(notice.hidden,true);assert.match(layer.children[0].attributes['aria-label'],/bara position 1/);assert.equal(layer.children[0].style['--change-color'],C.COLORS.blue);
const top=layer.children[0].style.top,left=layer.children[0].style.left;
window.SmartMatchCardChanges.render(layer,notice,geometry,{region,width:540,height:600,position:a});
assert.equal(layer.children[0].style.top,top);assert.equal(layer.children[0].style.left,left,'normalized coordinates track zoom at all scales');
window.SmartMatchCardChanges.render(layer,notice,{marks:[],unplaced:C.active(a)},{region,width:180,height:200,position:a});assert.equal(layer.hidden,true);assert.equal(notice.hidden,false);assert.match(notice.children[0].textContent,/Kontrollera placering/);
window.SmartMatchCardChanges.clear(layer,notice);assert.equal(layer.children.length,0);assert.equal(notice.children.length,0);

// Exercise the actual PDF-view lifecycle: changing position during async text
// lookup must never apply the first position's overlay to the second one.
const main=fs.readFileSync(path.join(__dirname,'../smartmatch-read-main-v9-94.js'),'utf8');
const extract=(from,to)=>main.slice(main.indexOf(from),main.indexOf(to,main.indexOf(from)));
async function lifecycle(){
 let release,resolveCalls=0,renders=0,clears=0;
 const pg={getViewport:({scale})=>({width:600*scale,height:800*scale}),cleanup(){},render:()=>({promise:Promise.resolve()})};
 const el={protocol:{open:true},protocolChangeLayer:new Element(),protocolChangeNotice:new Element(),protocolCanvas:new Element(),protocolStage:new Element(),protocolGSLayer:new Element(),protocolMissing:new Element(),protocolZoomInfo:new Element()};
 const state=vm.createContext({window:{devicePixelRatio:2,SmartMatchPositionChanges:C,SmartMatchReadTest:{cardFor:()=>card},SmartMatchCardChanges:{clear(){clears++;},resolve:async()=>{resolveCalls++;await new Promise(r=>release=r);return geometry;},render(){renders++;}}},
  el,pdf:{getPage:async()=>pg},smartExportMemoryPaused:false,protocolRenderVersion:0,protocolRenderTask:null,protocolActivePdfPage:pg,protocolScale:1,protocolCtx:{},DRAWING_IS_MOBILE:true,PROTOCOL_MAX_PIXELS:1800000,DRAWING_MAX_SIDE:3000,selectedId:'a',selectedInstance:()=>state.selectedId==='a'?a:b,protocolDisplayRegion:()=>region,releaseProtocolActivePdfPage(){},console});
 vm.runInContext(extract('function setProtocolPreviewTransform(', 'function clampProtocolScale('),state);
 vm.runInContext(extract('async function renderProtocolPage(', '// v35: tidigare trestegs-kontroller'),state);
 const pending=state.renderProtocolPage(2);while(!release)await new Promise(r=>setImmediate(r));
 state.selectedId='b';await state.renderProtocolPage(2);release();await pending;assert.equal(renders,0);assert(clears>=2);
 state.selectedId='a';const current=state.renderProtocolPage(2);const count=resolveCalls;while(resolveCalls===count)await new Promise(r=>setImmediate(r));release();await current;assert.equal(renders,1);
 state.setProtocolPreviewTransform('scale(1.8)');assert.equal(el.protocolCanvas.style.transform,el.protocolChangeLayer.style.transform);state.setProtocolPreviewTransform('');assert.equal(el.protocolChangeLayer.style.transform,'');
}
lifecycle().then(()=>console.log('PASS precise source row, duplicate safety, split/multiline text, position isolation, cropped/zoomed overlay, colored notice, async position switch and pinch/wheel transform')).catch(error=>{console.error(error);process.exitCode=1;});
