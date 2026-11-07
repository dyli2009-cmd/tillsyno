'use strict';
/* Runs the actual Security viewport override and the actual revision render,
 * followed by each core's real createItem/normalize and identity/status helpers.
 * PDF page metadata comes from a real A4/A3/A2 PDF; pixel painting and DOM layout
 * are fixtures. No direct call pre-seeds the stamp page-size cache. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const PDFLib=require('pdf-lib'),Style=require('../controlflow-stamp-style-v549.js');
let checks=0;
const plain=value=>JSON.parse(JSON.stringify(value));
function equal(actual,expected,message){assert.deepEqual(plain(actual),plain(expected),message);checks++;}
function ok(value,message){assert.ok(value,message);checks++;}
function functionSource(source,name){
 const match=new RegExp('^(?:async )?function '+name+'\\(','m').exec(source);if(!match)throw new Error('Missing '+name);
 for(let end=source.indexOf('}',match.index);end>=0;end=source.indexOf('}',end+1)){
  const candidate=source.slice(match.index,end+1);try{new vm.Script('('+candidate+')');return candidate;}catch(_){}
 }
 throw new Error('Incomplete '+name);
}
class Element{
 constructor(document,tag='div'){
  this.ownerDocument=document;this.tagName=tag;this.children=[];this.parentNode=null;this.attributes={};this.listeners={};this.dataset={};this.classNames=new Set();
  this.style={setProperty(key,value){this[key]=String(value);}};this.classList={add:(...names)=>names.forEach(n=>this.classNames.add(n)),remove:(...names)=>names.forEach(n=>this.classNames.delete(n)),contains:name=>this.classNames.has(name),toggle:(name,force)=>{const on=force===undefined?!this.classNames.has(name):!!force;if(on)this.classNames.add(name);else this.classNames.delete(name);return on;}};
  this.clientWidth=960;this.clientHeight=700;this.scrollLeft=0;this.scrollTop=0;this.offsetLeft=0;this.offsetTop=0;this.width=1;this.height=1;
 }
 set id(value){this._id=value;this.ownerDocument.nodes.set(value,this);}get id(){return this._id;}
 append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
 before(node){const parent=this.parentNode;if(!parent)return;node.remove();node.parentNode=parent;parent.children.splice(parent.children.indexOf(this),0,node);}
 after(node){const parent=this.parentNode;if(!parent)return;node.remove();node.parentNode=parent;parent.children.splice(parent.children.indexOf(this)+1,0,node);}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
 querySelector(){return null;}getContext(){return {drawImage(){}};}
 getBoundingClientRect(){const width=parseFloat(this.style.width)||this.clientWidth,height=parseFloat(this.style.height)||this.clientHeight,left=parseFloat(this.style.left)||0,top=parseFloat(this.style.top)||0;return {left,top,width,height,right:left+width,bottom:top+height};}
}
class Document{
 constructor(){this.nodes=new Map();this.body=new Element(this);this.head=new Element(this);}
 createElement(tag){return new Element(this,tag);}
 getElementById(id){return this.nodes.get(id)||null;}
}
function pageProxy(page){
 const {width,height}=page.getSize();
 return {view:[0,0,width,height],userUnit:1,rotate:page.getRotation().angle,
  getViewport({scale=1,rotation=this.rotate}){const side=((rotation%360)+360)%180!==0;return {width:(side?height:width)*scale,height:(side?width:height)*scale};},
  render(){return {promise:Promise.resolve(),cancel(){}};}};
}
async function fixture(mode,sourcePdf){
 const document=new Document();
 function add(id,parent=document.body,tag='div'){const node=document.createElement(tag);node.id=id;parent.append(node);return node;}
 const viewer=add('secViewer'),stage=add('secStage',viewer),canvas=add('secCanvas',stage,'canvas'),markers=add('secMarkers',stage);
 for(const id of ['secZoom','secPage','secHint','secCloseDrawing'])add(id);
 const pdf={numPages:sourcePdf.getPageCount(),async getPage(number){return pageProxy(sourcePdf.getPage(number-1));}};
 const sourceFile=mode==='security'?'security.js':'controlflow-revision/security-v335.js';
 const source=fs.readFileSync(path.join(__dirname,'..',sourceFile),'utf8');
 const counters={originalRender:0,draw:0,saves:0,errors:[],incoming:[]};
 const state={document,viewer,canvas,ctx:canvas.getContext('2d'),markers,pdf,page:1,zoom:1,baseScale:1,visualZoom:1,
  items:[],project:{},selected:null,addType:null,pageWidth:1,pageHeight:1,renderVersion:0,renderTask:null,renderQueue:Promise.resolve(),
  drawingRaster:null,drawingNatural:null,zoomFrame:0,pendingZoomGeometry:null,pinch:null,panTouch:null,panMouse:null,
  drawingGestureLocked:false,drawingLockScroll:null,suppressPageSwipeUntil:0,MAX_PIXELS:4000000,MAX_SIDE:4096,
  heavyDrawing:false,HEAVY_MAX_PIXELS:3000000,HEAVY_MAX_SIDE:3072,HEAVY_RENDER_MS:1500,performance,// v2.4.580 sparläge (off for these synthetic pages)
  renderTarget:null,sharpZoom:null,// v2.4.591 skarp zoom (controlflow-sharp-zoom-v591.js is not loaded here)
  
  ALL_IN_ONE:true,DOOR_AUTOMATION_MODELS:[],SYSTEMS:Object.fromEntries(['lock','automation','automation_selfcheck','lock_revision'].map(type=>[type,{label:type,checks:[['a','Kontroll']]}])),
  PDFLib,crypto,devicePixelRatio:1,setTimeout,clearTimeout,requestAnimationFrame:fn=>setTimeout(fn,0),cancelAnimationFrame:clearTimeout,
  ResizeObserver:class{observe(){}},$:id=>document.getElementById(id),drawingRotation:()=>0,updateDrawingRotationButton(){},
  drawMarkers(){counters.draw++;},save(){counters.saves++;},showSelected(){},go(){},
  msg(text,error){if(error)counters.errors.push(text);},render(){counters.originalRender++;throw new Error('Security base renderer must be overridden');},
  async closeSecurityDrawing(){state.pdf=null;return true;},setZoom(){},
  ControlflowStampStyle:{...Style,inherit(item,...args){counters.incoming.push({hasStamp:Object.hasOwn(item,'customerStampScale'),hasArrow:Object.hasOwn(item,'customerArrowScale'),normalizedCheck:item.checks?.a?.result,normalizedLocation:item.location});return Style.inherit(item,...args);}}};
 state.window=state;
 const context=vm.createContext(state);
 const names=['cleanSecurityRemarkText','normalizeSecurityCheckEdits','isDoorAutomationItem','normalizeAutomationIdentity','normalize','allChecks','syncStatus','nextNumber','nextAutomationSerial','automationProposedId','applyAutomationId','securityDrawingLabel','createItem'];
 if(mode==='security')names.push('securityHasDetectorBox','securityDefaultCheckTitle','securityCustomProtocolLabel','showSecurityPageLabel','releaseDrawingMemory');
 else names.push('boundedViewport','showSecurityPageLabel','releaseDrawingMemory','securityZoomAnchor','applySecurityDrawingGeometry','flushSecurityZoomGeometry','previewSecurityZoom','cancelSecurityRaster','setZoom','render');
 vm.runInContext(names.map(name=>functionSource(source,name)).join('\n'),context,{filename:sourceFile});
 if(mode==='security')vm.runInContext(fs.readFileSync(path.join(__dirname,'../security-drawing-view.js'),'utf8'),context,{filename:'security-drawing-view.js'});
 return {state,counters};
}

(async()=>{
 const created=await PDFLib.PDFDocument.create();
 for(const size of [[595.28,841.89],[1190.55,841.89],[1190.55,1683.78]])created.addPage(size);
 const sourcePdf=await PDFLib.PDFDocument.load(await created.save());
 for(const mode of ['security','revision']){
  const {state,counters}=await fixture(mode,sourcePdf),types=mode==='security'?['lock']:['automation','automation_selfcheck','lock_revision'];
  // Same opening/placing sequence as the live regression: A4 first, then A3/A2.
  for(const [page,expected]of [[1,1],[2,.5],[3,.5]]){
   state.page=page;state.zoom=1;await state.render(true);
   for(const type of types){
    const previous=plain(state.items);state.createItem(type,.35,.62);
    equal([state.items.at(-1).customerStampScale,state.items.at(-1).customerArrowScale],[expected,1],mode+': actual render + normalize + createItem on page'+page+' ('+type+')');
    equal(state.items.slice(0,-1),previous,mode+': placing on another page does not resize older objects');
    equal(counters.incoming.at(-1),{hasStamp:false,hasArrow:false,normalizedCheck:'',normalizedLocation:''},mode+': real normalize fills protocol data but does not set a stamp override');
   }
   equal(state.project,{},mode+': automatic size is not mistaken for a chosen project default');
  }
  equal(counters.originalRender,0,'Security calls the runtime override, never its replaced base render');
  ok(Style.isLargeDrawing(Style.pageSize(state.pdf,2)),mode+': A3 size was cached by the actual active renderer');
  state.page=2;await state.render(true);await state.setZoom(3);state.createItem(types[0],.4,.5);
  equal([state.items.at(-1).customerStampScale,state.items.at(-1).customerArrowScale],[.5,1],mode+': zoom cannot change the automatic physical-page default');
  state.project={controlflowStampDefaults:{version:1,stampScale:.75,arrowScale:.5}};state.createItem(types[0],.5,.5);
  equal([state.items.at(-1).customerStampScale,state.items.at(-1).customerArrowScale],[.75,.5],mode+': explicit project style still wins');
  const explicit={uid:'saved',type:types[0],page:2,x:.2,y:.2,customerStampScale:2.4,customerArrowScale:3};state.normalize(explicit);
  equal([explicit.customerStampScale,explicit.customerArrowScale],[2.4,3],mode+': real normalize preserves saved explicit settings');
  const legacy={uid:'legacy',type:types[0],page:2,x:.2,y:.2};state.normalize(legacy);
  equal([Object.hasOwn(legacy,'customerStampScale'),Object.hasOwn(legacy,'customerArrowScale')],[false,false],mode+': reopening legacy data does not apply new-object defaults');
  equal(counters.errors,[],mode+': active renderer completed without swallowed errors');
 }
 console.log('security-drawing-stamp-defaults-v552: '+checks+' assertions passed (actual Security override/revision render, real normalize/createItem, A4/A3/A2, zoom and explicit overrides).');
})().catch(error=>{console.error(error);process.exitCode=1;});
