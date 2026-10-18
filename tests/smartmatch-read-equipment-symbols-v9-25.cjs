/* TEST 9.25: DS/DA uses the prepared PDF stamp index and never starts a full
 * page text read or OCR while the drawing is open. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

class FakeNode{
 constructor(tagName='',fragment=false){this.tagName=String(tagName).toUpperCase();this.isFragment=fragment;this.children=[];this.parentNode=null;this.style={};this.dataset={};this.attributes={};this.id='';this.className='';this.textContent=''}
 appendChild(node){if(node?.isFragment){for(const child of [...node.children])this.appendChild(child);node.children=[];return node}node?.remove?.();this.children.push(node);node.parentNode=this;return node}
 replaceChildren(...nodes){for(const child of this.children)child.parentNode=null;this.children=[];for(const node of nodes)this.appendChild(node)}
 remove(){if(!this.parentNode)return;const index=this.parentNode.children.indexOf(this);if(index>=0)this.parentNode.children.splice(index,1);this.parentNode=null}
 setAttribute(name,value){this.attributes[name]=String(value)}
 get childElementCount(){return this.children.length}
}
function findById(node,id){if(node.id===id)return node;for(const child of node.children||[]){const found=findById(child,id);if(found)return found}return null}
const documentElement=new FakeNode('html'),head=new FakeNode('head'),body=new FakeNode('body');documentElement.appendChild(head);documentElement.appendChild(body);
const stage=new FakeNode('div');stage.id='pwStage';stage.style.width='400px';stage.style.height='200px';
const canvas=new FakeNode('canvas');canvas.id='pwCanvas';canvas.style.width='400px';canvas.style.height='200px';
const pageInfo=new FakeNode('span');pageInfo.id='pwPageInfo';pageInfo.textContent='1 / 4';stage.appendChild(canvas);body.appendChild(stage);body.appendChild(pageInfo);
const document={readyState:'complete',head,body,documentElement,createElement:tag=>new FakeNode(tag),createDocumentFragment:()=>new FakeNode('',true),getElementById:id=>findById(documentElement,id),addEventListener(){}};
class FakeMutationObserver{constructor(callback){this.callback=callback;this.targets=[]}observe(target,options){this.targets.push({target,options})}disconnect(){this.targets=[]}}
function viewport(scale){return {width:200*scale,height:100*scale,convertToViewportPoint:(x,y)=>[x*scale,(100-y)*scale]}}
const pdf={numPages:4,async getPage(page){return {pageNumber:page,getViewport:({scale})=>viewport(scale)}}};
let currentPdf=null,currentPage=1,currentScale=2,index=[],indexProvider=()=>index,textReads=0;
const bridge={getPdf:()=>currentPdf,getPage:()=>currentPage,getScale:()=>currentScale,getReadStampIndex:()=>indexProvider(),readPageText:()=>{textReads++;throw Error('DS/DA must not parse full page text')},getPositions(){throw Error('equipment display must not read GS positions')},getItems(){throw Error('equipment display must not read automation items')}};
const window={document,SmartMatchAppBridge:bridge,SmartMatchReadTest:{isCardPage:page=>page===2},setTimeout,clearTimeout,requestAnimationFrame:callback=>setTimeout(callback,0),cancelAnimationFrame:handle=>clearTimeout(handle),addEventListener(){},removeEventListener(){}};
const sandbox={window,document,MutationObserver:FakeMutationObserver,console,setTimeout,clearTimeout};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../smartmatch-read-equipment-symbols-v9-25.js'),'utf8'),sandbox);
const api=window.SmartMatchEquipmentSymbols;

(async()=>{
 await new Promise(resolve=>setTimeout(resolve,5));assert.equal(api.version,'9.25');
 assert.equal(api.classify('DA'),'DA');assert.equal(api.classify(' ds '),'DS');assert.equal(api.classify({subject:'Dörrautomatik'}),'DA');assert.equal(api.classify({subject:'wc dörrstängare'}),'DS');
 for(const value of ['DS1','DBL-DS','D A','DAGLÅSNING','Dörrbladsläsare',''])assert.equal(api.classify(value),'',value+' is not an equipment stamp type');
 currentPdf=pdf;index=[
  {page:1,subtype:'Stamp',subject:'Dörrautomatik',rect:[10,20,30,30]},
  {page:1,subtype:'Stamp',subject:'wc dörrstängare',rect:[40,30,58,38]},
  {page:1,subtype:'Stamp',subject:'DS',rect:[70,40,80,50]},
  {page:1,subtype:'Stamp',subject:'Dörrbladsläsare',rect:[90,20,110,30]},
  {page:1,subtype:'FreeText',subject:'Dörrstängare',rect:[120,20,140,30]},
  {page:3,subtype:'Stamp',subject:'Dörrstängare',rect:[15,25,25,35]}
 ];
 assert.equal(await api.refresh(),3,'only DS/DA stamp annotations on the active drawing page render');assert.equal(textReads,0,'no full page text extraction occurs');
 const layer=document.getElementById('pwEquipmentSymbols');assert(layer);assert.equal(layer.parentNode,stage);assert.equal(layer.attributes['aria-hidden'],'true');assert.deepEqual(layer.children.map(node=>node.textContent),['DA','DS','DS']);
 assert.equal(layer.children[0].style.left,'40px');assert.equal(layer.children[0].style.top,'150px');assert.match(document.getElementById('smartmatch-equipment-symbols-v9-25-style').textContent,/pointer-events:none!important/);
 assert.equal(await api.refresh(),3);assert.equal(layer.children.length,3,'repeat renders replace instead of accumulating labels');assert.equal(textReads,0);
 currentPage=2;assert.equal(await api.refresh(),0);assert.equal(layer.children.length,0,'door-card pages never receive drawing labels');assert.equal(textReads,0);
 let resolveOld;currentPage=3;indexProvider=()=>new Promise(resolve=>{resolveOld=resolve});const oldRefresh=api.refresh();await Promise.resolve();
 currentPage=4;indexProvider=()=>[{page:4,subtype:'Stamp',subject:'Dörrautomatik',rect:[20,20,30,30]}];assert.equal(await api.refresh(),1);
 resolveOld([{page:3,subtype:'Stamp',subject:'Dörrstängare',rect:[80,20,90,30]}]);assert.equal(await oldRefresh,0);assert.equal(layer.children.length,1);assert.equal(layer.children[0].textContent,'DA','a stale index read cannot overwrite the current page');assert.equal(textReads,0);
 api.destroy();assert.equal(document.getElementById('pwEquipmentSymbols'),null);assert.equal(document.getElementById('smartmatch-equipment-symbols-v9-25-style'),null);
 console.log('PASS TEST 9.25 equipment symbols: prepared stamp index, Swedish DS/DA types, passive/card-safe/stale-safe rendering and zero page-text reads');
})().catch(error=>{console.error(error);process.exitCode=1});
