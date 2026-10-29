'use strict';
// Exercise the actual workspace/dialog lifecycle and existing DA entry/placement
// handlers. Geometry checks cover pointer dragging and a reduced visual viewport.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
class Events{
 constructor(){this.listeners=new Map();}
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
 dispatchEvent(event){event.target||=this;for(const fn of this.listeners.get(event.type)||[])fn(event);return !event.defaultPrevented;}
}
class E{
 constructor(type,options={}){Object.assign(this,{type,defaultPrevented:false},options);}
 preventDefault(){this.defaultPrevented=true;}
}
class Classes{
 constructor(){this.values=new Set();}
 add(...names){names.forEach(n=>this.values.add(n));}
 remove(...names){names.forEach(n=>this.values.delete(n));}
 contains(name){return this.values.has(name);}
 toggle(name,on=!this.contains(name)){on?this.add(name):this.remove(name);return on;}
}
let document;
class Element extends Events{
 constructor(tag='div'){super();Object.assign(this,{tag,style:{},dataset:{},classList:new Classes(),children:[],isConnected:true,open:false,hidden:false,inert:false,value:'',attributes:{},clientWidth:800,clientHeight:600});}
 appendChild(child){this.children.push(child);return child;}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 remove(){this.isConnected=false;}
 setAttribute(k,v){this.attributes[k]=v;}
 getAttribute(k){return this.attributes[k];}
 hasAttribute(k){return k in this.attributes;}
 querySelector(){return this.children.find(c=>c.tag==='button')||null;}
 querySelectorAll(){return [];}
 matches(selector){return selector.split(',').includes(this.tag);}
 closest(selector){return this.matches(selector)?this:null;}
 contains(node){return node===this||this.children.some(child=>child.contains(node));}
 focus(){document.activeElement=this;}
 getBoundingClientRect(){return {left:parseFloat(this.style.left)||580,top:parseFloat(this.style.top)||76,width:Math.min(360,parseFloat(this.style.maxWidth)||360),height:Math.min(260,parseFloat(this.style.maxHeight)||260)};}
 setPointerCapture(id){this.capture=id;}
 hasPointerCapture(id){return this.capture===id;}
 releasePointerCapture(){this.capture=null;}
}
class Dialog extends Element{
 constructor(){super('dialog');}
 show(){this.open=true;}
 showModal(){throw Error('native modal would block the drawing');}
 close(){this.open=false;this.dispatchEvent(new E('close'));}
}
const elements=new Map(),get=id=>{if(!elements.has(id)){const el=id.endsWith('Dialog')?new Dialog():new Element();el.id=id;elements.set(id,el);}return elements.get(id);};
document=new Events();Object.assign(document,{body:new Element('body'),activeElement:new Element('button'),getElementById:get,createElement:tag=>tag==='dialog'?new Dialog():new Element(tag),querySelectorAll:()=>[]});
const main=new Element('main'),toolbar=new Element('section');document.body.append(main,toolbar);
const viewport=new Events();Object.assign(viewport,{width:1024,height:768,offsetLeft:0,offsetTop:0});
const window=new Events();Object.assign(window,{innerWidth:1024,innerHeight:768,visualViewport:viewport,SmartMatchAppBridge:{getPdf:()=>({numPages:10}),getPage:()=>1,getItems:()=>[],getPositions:()=>[],setStatus(){}}});
const context=vm.createContext({window,document,HTMLDialogElement:Dialog,Event:E,MutationObserver:class{observe(){}},queueMicrotask:()=>{},console});
vm.runInContext(source('smartmatch-compact-workspace-v9-94.js'),context);
const popup=get('pwDALinkDialog');popup.dataset.smFloating='true';const trigger=get('pwDALinkTool'),input=get('pwDAExample');trigger.focus();
vm.runInContext(source('smartmatch-slr-test-da-v36-132.js'),context);
trigger.dispatchEvent(new E('click'));
assert(popup.open);assert.equal(document.activeElement,input);assert.equal(window.SmartMatchCompactWorkspace.activeView(),null);
assert(!document.body.classList.contains('smHasWorkspaceView'));assert(!main.inert&&!toolbar.inert,'drawing and tools remain interactive');assert(!popup.classList.contains('smWorkspaceView'));
input.value='';get('pwDAManual').onclick();assert(popup.open,'invalid input keeps the popup open');assert(get('pwDAFeedback').textContent.includes('Ange hela'));
input.value='200154-28-24-1';get('pwDAManual').onclick();assert(!popup.open);assert(get('pwStage').classList.contains('pwDAManualPlacing'),'existing placement flow still starts');assert(!main.inert);assert.equal(input.value,'200154-28-24-1');
trigger.dispatchEvent(new E('click'));assert(popup.open);assert(!get('pwStage').classList.contains('pwDAManualPlacing'),'reopening cancels the previous placement safely');
const other=get('pwDADoorDialog');other.showModal();assert.equal(window.SmartMatchCompactWorkspace.activeView(),'pwDADoorDialog');assert(main.inert);assert(popup.inert&&popup.classList.contains('smInactiveFloating'));
document.dispatchEvent(new E('keydown',{key:'Escape'}));assert(!other.open&&popup.open);assert(!main.inert&&!popup.inert);assert(!popup.classList.contains('smInactiveFloating'));
document.dispatchEvent(new E('keydown',{key:'Escape'}));assert(!popup.open,'Escape closes the floating tool through its existing cancel handler');
trigger.dispatchEvent(new E('click'));get('pwDALinkClose').onclick();assert(!popup.open,'X keeps its existing close action');
const mainSource=source('smartmatch-read-main-v9-94.js'),start=mainSource.indexOf('function clampFloatingPanel('),end=mainSource.indexOf('if(!DRAWING_IS_MOBILE){',start);assert(start>0&&end>start);vm.runInContext(mainSource.slice(start,end),context);
const handle=new Element('header');context.makeDesktopPanelDraggable(popup,handle);trigger.dispatchEvent(new E('click'));
handle.dispatchEvent(new E('pointerdown',{pointerType:'touch',pointerId:1,clientX:600,clientY:90}));handle.dispatchEvent(new E('pointermove',{pointerId:1,clientX:1200,clientY:1000}));
let box=popup.getBoundingClientRect();assert(box.left+box.width<=1016&&box.top+box.height<=760,'dragging remains within the screen');
handle.dispatchEvent(new E('pointerup',{pointerId:1}));assert.equal(handle.capture,null);
Object.assign(viewport,{width:390,height:300,offsetLeft:0,offsetTop:120});viewport.dispatchEvent(new E('resize'));box=popup.getBoundingClientRect();assert(box.left>=8&&box.top>=128&&box.left+box.width<=382&&box.top+box.height<=412,'keyboard keeps the whole popup in the visible area');
const before=JSON.stringify(popup.style),button=new Element('button');handle.dispatchEvent(new E('pointerdown',{target:button,pointerType:'mouse',button:0,pointerId:2,clientX:100,clientY:100}));handle.dispatchEvent(new E('pointermove',{pointerId:2,clientX:0,clientY:0}));assert.equal(JSON.stringify(popup.style),before,'close/input controls do not start dragging');
console.log('PASS: floating DA entry, editable marking, validation, existing placement flow, X/Escape, workspace coexistence, touch drag and keyboard viewport bounds');
