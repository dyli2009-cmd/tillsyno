'use strict';
/* Regression for SmartMatch TEST v36.104.
   v36.102 had refreshGsSuggestion(o) -> chooseNearestGS(o), missing linkCardCache,
   which threw before pwDADoorDialog.showModal() on a physical DA marker tap.
   Run: node tests/smartmatch-da-dialog-click-v36-104.cjs
*/
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','smartmatch-da-v36-104-module.js'),'utf8');
const rect=(x,y,w,h)=>[x,y,x+w,y+h];
const da={id:'physical-1',page:3,rect:rect(110,200,18,52),objectNo:'2001-34-28',modelCode:'24',
 serialNumber:'1',model:'Dorma ED100',sourceText:'2001-34-28-24-1',checks:{},slrDocuments:{}};
const gs={id:'gs-1',page:3,rect:rect(170,201,25,27),code:'GS1',position:'1'};
let revisionOpened=0,slrOpened=0;
const bridge={
 getPdf:()=>({numPages:12}),getPage:()=>3,getDrawingLimit:()=>12,
 getItems:()=>[da],getPositions:()=>[gs],getModels:()=>[['24','Dorma ED100']],
 getDoorCardIndex:()=>({GS1:[7]}),getDoorCardMapping:()=>({}),getDoorCardPages:()=>[7],
 groupRows:rows=>rows,readPageText:async p=>p===3
  ?{items:[{text:'DA',x:139,y:210,w:9,transform:[1,0,0,1]}]}
  :{items:[{text:'Dörrautomatik'},{text:'Dorma ED100'}]},
 openRevision:()=>{revisionOpened++},save(){},redraw(){},setStatus(){}
};
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.hidden=false;this.open=false;this.value='';this.style={};
  this.classList={add(){},remove(){},toggle(){},contains(){return false}};}
 appendChild(c){this.children.push(c);return c}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=[...children]}
 get options(){return this.children}
 addEventListener(){}
 querySelectorAll(){return []}
 querySelector(){return null}
 showModal(){this.open=true}
 close(){this.open=false}
}
const elements=new Map(),document={
 getElementById:id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)},
 createElement:tag=>new Element(tag),addEventListener(){},body:new Element('body')
};
const window={SmartMatchAppBridge:bridge};
vm.runInNewContext(source,{window,document,console,Map,Set,Math,Number,String,Array,Object});
const module=window.SmartMatchDALink;
assert.ok(module?.openDoor,'DA module initialized');
module.openDoor(da);
assert.equal(document.getElementById('pwDADoorDialog').open,true,'menu shown on automation click');
assert.equal(document.getElementById('pwDADoorChoices').hidden,false,'revision and SLR choices visible');
assert.equal(typeof document.getElementById('pwDARevision').onclick,'function','revision button wired');
assert.equal(typeof document.getElementById('pwDASLR').onclick,'function','SLR button wired');
document.getElementById('pwDARevision').onclick();
assert.equal(revisionOpened,1,'revision opens when selected from menu');
console.log('PASS v36.104: physical DA 2001-34-28-24-1 opens revision / SLR menu; revision button works.');