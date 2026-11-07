'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Style=require('../controlflow-stamp-style-v549.js'),Controls=require('../controlflow-stamp-controls-v551.js');
let checks=0;
const plain=value=>JSON.parse(JSON.stringify(value));
function equal(actual,expected,message){assert.deepEqual(plain(actual),plain(expected),message);checks++;}
function ok(value,message){assert.ok(value,message);checks++;}
function near(actual,expected,message){assert.ok(Math.abs(actual-expected)<1e-7,message);checks++;}
function fixture(mode='revision'){
 const state={items:[],project:{},chosen:[],busy:false,history:[],saved:0};
 const make=(uid,scale=1,arrow=.5)=>({uid,type:mode==='revision'?'automation':'lock',page:1,x:.2,y:.3,labelX:.4,labelY:.45,customerStampScale:scale,customerArrowScale:arrow,positionLocked:true,checks:{'1':{result:'remark',note:'Bevarat utkast'}}});
 state.items=[make('A'),make('B')];state.chosen=['A'];
 const adapter={mode:()=>mode,items:()=>state.items,project:()=>state.project,selected:()=>state.items.filter(item=>state.chosen.includes(item.uid)),busy:()=>state.busy,
  beforeChange:()=>state.history.push(plain({items:state.items,project:state.project})),afterChange:()=>state.saved++};
 return {state,controller:Controls.createController(adapter),make};
}

// Explicit changes apply only to the shared selection and preserve all other data.
const f=fixture(),before=plain(f.state.items),r=f.controller.setPercent(25);
equal([r.changed,r.objects,f.state.saved,f.state.history.length],[true,1,1,1],'one explicit size action is saved and undoable');
equal(f.state.items[0],{...before[0],customerStampScale:.25},'locked selected stamp can shrink without moving or changing checks');
equal(f.state.items[1],before[1],'unselected stamp is untouched');
equal(Style.defaults(f.state.project),{version:1,stampScale:.25,arrowScale:.5},'first explicit size establishes the future style');
const inherited={uid:'new',type:'automation'};Style.inherit(inherited,f.state.project,'revision');
equal([inherited.customerStampScale,inherited.customerArrowScale],[.25,.5],'25% and thin inherit without clamping');
equal(f.state.history[0],{items:before,project:{}},'undo snapshot was taken before any mutation');
f.controller.step(1);near(f.state.items[0].customerStampScale,.3,'plus increases by five percentage points');
f.controller.step(-1);near(f.state.items[0].customerStampScale,.25,'minus decreases by five percentage points');
const savedAtMin=f.state.saved;f.controller.step(-1);equal(f.state.saved,savedAtMin,'repeated minimum does not write an empty change');
equal(f.controller.setPercent(24).invalid,true,'size below25% is rejected');
equal(f.controller.setPercent(301).invalid,true,'size above300% is rejected');
f.state.busy=true;const blocked=plain(f.state.items);f.controller.setPercent(200);equal(f.state.items,blocked,'busy selection cannot be changed');f.state.busy=false;

// Mixed sizes move by the same five points. All-target changes update the project default.
f.state.items[0].customerStampScale=.5;f.state.items[1].customerStampScale=1.5;f.state.chosen=['A','B'];
f.state.project.controlflowStampDefaults={version:1,stampScale:1.25,arrowScale:2};
f.controller.step(-1);equal(f.state.items.map(item=>item.customerStampScale),[.45,1.45],'mixed sizes retain their difference');
near(Style.defaults(f.state.project).stampScale,1.2,'mixed all-target delta adjusts inherited size by five points');
f.controller.setArrow(.5);equal(f.state.items.map(item=>item.customerArrowScale),[.5,.5],'thin can be explicitly chosen for old selected stamps');
equal(Style.defaults(f.state.project).arrowScale,.5,'all-target thin choice updates inherited arrow');
f.controller.setPercent(300);equal(f.state.items.map(item=>item.customerStampScale),[3,3],'old300% maximum remains available');
f.state.items=plain(f.state.history[0].items);f.state.project=plain(f.state.history[0].project);
equal(f.state.items,before,'restoring history recovers original objects');
ok(f.controller.selected().every(item=>f.state.items.includes(item)),'selection resolves current objects after undo');

// Legacy missing values and unsupported types must retain their old render profile.
for(const mode of ['security','revision']){
 const type=mode==='security'?'lock':'automation',legacy={type};
 equal([Style.stampScale(legacy,mode),Style.arrowScale(legacy,mode)],mode==='security'?[1,1]:[1.77,3],'legacy missing values stay unchanged in '+mode);
 const brand={type:'fire_panel',customerStampScale:.25,customerArrowScale:.5};
 equal([Style.stampScale(brand,mode),Style.arrowScale(brand,mode)],[.5,1],'unsupported explicit values retain previous clamps in '+mode);
 const fresh={type};Style.inherit(fresh,{},mode);equal([fresh.customerStampScale,fresh.customerArrowScale],[1,1],'new stamps start Normal in '+mode);
 const old={type,customerStampScale:2.4,customerArrowScale:3};Style.inherit(old,{},mode);equal([old.customerStampScale,old.customerArrowScale],[2.4,3],'explicit old settings are never overwritten in '+mode);
}
const detector={type:'detector',detectorBox:{width:.1,height:.1},customerStampScale:.25,customerArrowScale:.5};
equal([Style.stampScale(detector,'security'),Style.arrowScale(detector,'security')],[.5,1],'manual detector boxes keep old helper clamps');
const s=fixture('security');s.state.items.push({...detector,uid:'box'},s.make('fire'));s.state.items.at(-1).type='fire_panel';s.state.chosen=s.state.items.map(item=>item.uid);
const excluded=plain(s.state.items.slice(2));s.controller.setPercent(25);equal(s.state.items.slice(2),excluded,'shared bulk edit excludes Brand and manual detector boxes');

// Exercise the actual mounted handlers without a browser: same panel, same
// selection, immediate redraw, preserved in-progress typing and late mounting.
class Element{
 constructor(document,tag){this.ownerDocument=document;this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.value='';this.disabled=false;}
 set id(value){this._id=value;this.ownerDocument.nodes.set(value,this);}get id(){return this._id;}
 setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
 append(...nodes){nodes.forEach(node=>{node.parentNode=this;this.children.push(node);});}
 insertBefore(node,before){const index=this.children.indexOf(before);node.parentNode=this;if(index<0)this.children.push(node);else this.children.splice(index,0,node);}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 dispatch(type,event={}){(this.listeners[type]||[]).forEach(fn=>fn(event));}
 get valueAsNumber(){return this.value===''?NaN:Number(this.value);}
 reportValidity(){return Number.isFinite(this.valueAsNumber)&&this.valueAsNumber>=Number(this.min)&&this.valueAsNumber<=Number(this.max);}
}
const document={nodes:new Map(),documentElement:{dataset:{controlflowUi:'1',cfStampMode:'revision'}},readyState:'complete',
 createElement(tag){return new Element(this,tag);},getElementById(id){return this.nodes.get(id)||null;}};
const panel=document.createElement('section');panel.id='securityStampSelectionPanel';const message=document.createElement('p');message.id='securityStampSelectionMessage';panel.append(message);
const events={},root={document,ControlflowStampStyle:Style,addEventListener(type,fn){(events[type]??=[]).push(fn);},dispatch(type){(events[type]||[]).forEach(fn=>fn());}};
const browserFixture=fixture(),state=browserFixture.state;state.items=state.items.slice(0,1);
const context=vm.createContext({window:root,items:state.items,project:state.project,securitySessionHistory:{endGroup(){},record(){state.history.push(plain(state.items));}},save(){state.saved++;},drawMarkers(){root.dispatch('controlflow-stamp-selection-change');}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../controlflow-stamp-controls-v551.js'),'utf8'),context);
equal(document.getElementById('controlflowStampControls'),null,'controls wait for the shared selection API');
root.SecurityStampSelection={selectedObjects:()=>state.items.filter(item=>state.chosen.includes(item.uid)),isActive:()=>true,isBusy:()=>state.busy};root.dispatch('controlflow-stamp-selection-change');
const input=document.getElementById('controlflowStampPercent'),minus=document.getElementById('controlflowStampSmaller'),plus=document.getElementById('controlflowStampLarger');
ok(document.getElementById('controlflowStampControls').parentNode===panel,'size controls mount inside the existing panel');
minus.onclick();near(state.items[0].customerStampScale,.95,'actual minus button changes the selected stamp');equal(input.value,'95','input immediately reflects actual drawing size');
input.value='25';input.dispatch('input');input.dispatch('change');near(state.items[0].customerStampScale,.25,'actual percentage input reaches25%');equal(minus.disabled,true,'minus disables only at the new minimum');
plus.onclick();near(state.items[0].customerStampScale,.3,'actual plus button grows from25%');
input.value='77';input.dispatch('input');root.dispatch('controlflow-stamp-selection-change');equal(input.value,'77','redraw preserves a percentage being typed');
input.dispatch('keydown',{key:'Enter',preventDefault(){}});near(state.items[0].customerStampScale,.77,'Enter applies the typed percentage');
const arrow=document.getElementById('controlflowStampArrow');arrow.value='0.5';arrow.onchange();near(state.items[0].customerArrowScale,.5,'actual arrow control applies thin');
state.busy=true;root.dispatch('controlflow-stamp-selection-change');ok(input.disabled&&minus.disabled&&plus.disabled&&arrow.disabled,'all size controls follow shared busy state');
root.dispatch('controlflow-stamp-selection-change');equal(panel.children.filter(node=>node.id==='controlflowStampControls').length,1,'selection updates never duplicate the control group');
state.busy=false;const manual={uid:'manual',type:'detector',page:2,detectorBox:{width:.04,height:.02},customerStampScale:.7};state.items.push(manual);state.chosen.push('manual');root.dispatch('controlflow-stamp-selection-change');
const scopeNote=document.getElementById('controlflowStampScopeNote');equal(scopeNote.hidden,false,'mixed manual/arrow selection displays the affected subset');
ok(scopeNote.textContent.includes('1 pilstämpel av 2 valda'),'visible subset note gives exact arrow-stamp count');
input.value='50';input.dispatch('change');near(state.items[0].customerStampScale,.5,'mixed selection still resizes its arrow stamp');near(manual.customerStampScale,.7,'mixed selection leaves manual box geometry alone');

// Read and run actual Kundmall functions: a mixed or Brand target retains the
// old minimum and resize behavior instead of promising an unsupported25%.
function functionSource(source,name){
 const match=new RegExp('^function '+name+'\\(','m').exec(source);if(!match)throw new Error(name);
 for(let end=source.indexOf('}',match.index);end>=0;end=source.indexOf('}',end+1)){const candidate=source.slice(match.index,end+1);try{new vm.Script('('+candidate+')');return candidate;}catch(_){}}
 throw new Error('Incomplete function '+name);
}
const customerSource=fs.readFileSync(path.join(__dirname,'../controlflow-revision/customer-stamp-editor-v335.js'),'utf8');
const customer={window:{ControlflowStampStyle:Style},document:{documentElement:{dataset:{controlflowUi:'1',cfStampMode:'revision'}}},busy:false,selected:null,items:[{type:'automation',customerStampScale:.5,customerArrowScale:1}],
 clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),visibleItems(){return customer.items;},scale:item=>Style.stampScale(item,'revision'),closePercent(){},rememberSize(){},commit(){},percent:{valueAsNumber:25,reportValidity:()=>true}};
const customerContext=vm.createContext(customer);vm.runInContext(['sharedStamp','minimumScale','resize','applyPercentSize'].map(name=>functionSource(customerSource,name)).join('\n'),customerContext);
equal(customer.applyPercentSize(),true,'Kundmall accepts25% for supported target');near(customer.items[0].customerStampScale,.25,'Kundmall writes the same saved quarter-size');
customer.resize(.05);near(customer.items[0].customerStampScale,.3,'Kundmall uses five percentage points for supported target');
customer.items=[{type:'fire_panel',customerStampScale:1}];equal(customer.applyPercentSize(),false,'Kundmall refuses25% for unsupported Brand');customer.resize(.05);near(customer.items[0].customerStampScale,1.1,'Brand retains its previous multiplicative resize behavior');
customer.items=[{type:'automation',customerStampScale:1},{type:'fire_panel',customerStampScale:1}];equal(customer.minimumScale(customer.items),.5,'mixed all-target UI uses the supported minimum for every object');equal(customer.applyPercentSize(),false,'mixed all-target cannot silently clamp a promised25%');
customer.document.documentElement.dataset={};customer.items=[{type:'lock',customerStampScale:1}];equal(customer.minimumScale(customer.items),.5,'standalone customer editor keeps its old minimum even if shared style is present');
console.log('controlflow-stamp-controls-v551: '+checks+' assertions passed (shared selection, live handlers, undo state, legacy scope and Kundmall limits).');
