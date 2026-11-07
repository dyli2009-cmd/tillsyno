'use strict';
/* Real protocol-picker controllers and core visibility predicates. The small
 * DOM fixture exercises checkbox/change/apply and route handoff; it does not
 * claim browser layout or file-parser coverage. No imported object is rewritten.
 * PROTOCOL_SCOPE_SOURCE_ROOT can point at an earlier source snapshot for red/green verification.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.PROTOCOL_SCOPE_SOURCE_ROOT||path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const TYPES=['automation','automation_selfcheck','lock_revision','detector','alarm','lock','access','fire_panel','fire_detector','fire_door'];
const mixed=()=>TYPES.map((type,index)=>({uid:'qa-'+type,id:'QA-'+(index+1),type,page:1+index%2,status:'untested',checks:{'1.1':{result:'',note:'Bevara utkast '+type}},notes:'Syntetiskt underlag',x:.3,y:.4,labelX:.4,labelY:.3}));
let checks=0;
function equal(actual,expected,message){assert.deepEqual(plain(actual),plain(expected),message);checks++;}
function ok(value,message){assert.ok(value,message);checks++;}
function functionSource(source,name){
 const match=new RegExp('^[ \\t]*function '+name+'\\(','m').exec(source);assert(match,'production helper '+name+' exists');
 for(let end=source.indexOf('}',match.index);end>=0;end=source.indexOf('}',end+1)){
  const text=source.slice(match.index,end+1);try{new vm.Script('('+text+')');return text;}catch(_){}
 }
 throw Error('Cannot read production helper '+name);
}

function fixture(mode,{objects=mixed(),query=''}={}){
 let document;
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.parentNode=null;this.attrs={};this.dataset={};this.listeners=new Map();this.text='';this.checked=false;this.disabled=false;this.hidden=false;this.open=false;}
  set id(value){this.attrs.id=value;}get id(){return this.attrs.id||'';}
  set className(value){this.attrs.class=value;}get className(){return this.attrs.class||'';}
  set value(value){this.attrs.value=String(value);}get value(){return this.attrs.value||'';}
  set type(value){this.attrs.type=value;}get type(){return this.attrs.type||'';}
  set textContent(value){this.text=String(value);this.children=[];}get textContent(){return this.text+this.children.map(n=>n.textContent).join('');}
  append(...children){for(const child of children){child.parentNode=this;this.children.push(child);}}
  setAttribute(name,value){this.attrs[name]=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
  getAttribute(name){return this.attrs[name]??null;}
  toggleAttribute(name,force){const on=force===undefined?!(name in this.attrs):!!force;if(on)this.setAttribute(name,'');else delete this.attrs[name];return on;}
  matches(selector){return selector.split(',').some(part=>{
   let rule=part.trim();if(rule.endsWith(':checked')){if(!this.checked)return false;rule=rule.slice(0,-8);}
   const tag=/^[a-z][\w-]*/i.exec(rule);if(tag){if(this.tagName!==tag[0].toLowerCase())return false;rule=rule.slice(tag[0].length);}
   const pieces=rule.match(/#[\w-]+|\.[\w-]+|\[[^\]]+\]/g)||[];
   if(pieces.join('')!==rule)return false;
   return pieces.every(piece=>{
    if(piece[0]==='#')return this.id===piece.slice(1);
    if(piece[0]==='.')return this.className.split(/\s+/).includes(piece.slice(1));
    const attr=/^\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]$/.exec(piece);if(!attr)return false;
    const value=this.getAttribute(attr[1]);return attr[2]===undefined?value!==null:value===attr[2];
   });
  });}
  descendants(){return this.children.flatMap(child=>[child,...child.descendants()]);}
  querySelectorAll(selector){return this.descendants().filter(node=>selector.split(',').some(part=>{
   const tokens=part.trim().split(/\s+/);if(!node.matches(tokens.pop()))return false;
   let ancestor=node.parentNode;while(tokens.length){const token=tokens.pop();while(ancestor&&!ancestor.matches(token))ancestor=ancestor.parentNode;if(!ancestor)return false;ancestor=ancestor.parentNode;}return true;
  }));}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  closest(selector){for(let node=this;node;node=node.parentNode)if(node.matches(selector))return node;return null;}
  addEventListener(name,callback){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(callback);}
  emit(name,extra={}){const event={target:this,preventDefault(){this.defaultPrevented=true;},...extra};this['on'+name]?.(event);for(const callback of this.listeners.get(name)||[])callback(event);return event;}
  click(){if(!this.disabled)return this.emit('click');}
  showModal(){this.open=true;}close(){this.open=false;}
 }
 document=new Element('document');document.documentElement=new Element('html');document.body=new Element('body');document.append(document.documentElement);document.documentElement.append(document.body);document.documentElement.dataset.appVersion='2.4.556';
 document.getElementById=id=>document.descendants().find(node=>node.id===id)||null;
 const add=(tag,id,parent=document.body,className='')=>{const node=new Element(tag);node.id=id;node.className=className;parent.append(node);return node;};
 const header=add('header','',document.body,'secAppHeader'),brand=add('div','',header,'brand');
 add('strong','headerTitle',brand).textContent='Kontrollflöde';add('span','headerSubtitle',header,'headerSubtitle').textContent='Välj protokoll';
 add('h1','emptyTitle',add('section','secEmpty')).textContent='Välj en ritning';
 const dialog=add('dialog','allProtocolDialog'),apply=add('button','allProtocolApply',dialog),file=add('input','securityFile');
 add('button','allFolderBack',dialog);add('h2','allProtocolTitle',dialog);add('p','allProtocolLead',dialog);
 const groups=[['Dörrautomatik och Lås',['automation','automation_selfcheck','lock_revision']],['Säkerhetsservice',['detector','alarm','lock','access']],['Brand',['fire_panel','fire_detector','fire_door']]];
 const inputs=new Map();
 for(const [title,types]of groups){const group=add('details','',dialog,'allProtocolGroup'),summary=add('summary','',group);add('strong','',summary).textContent=title;
  for(const type of types){const label=add('label','',group),input=add('input','choose-'+type,label);input.type='checkbox';input.value=type;inputs.set(type,input);add('strong','',label).textContent=type;}
 }
 const tools=add('div','',document.body,'allInOneProtocolTools'),buttons=new Map();
 for(const type of TYPES){const button=add('button','add-'+type,tools);button.setAttribute('data-add',type);buttons.set(type,button);}
 const storage=new Map(),timers=[],navigation=[],observers=[];
 const state={document,console,URL,URLSearchParams,items:objects,ALL_IN_ONE:true,
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  location:{href:'https://example.test/tillsyno/'+(mode==='revision'?'controlflow-revision/':'')+'all-in-one.html'+query,search:query,assign:url=>navigation.push(url)},
  setTimeout:callback=>timers.push(callback),matchMedia:()=>({matches:true,addEventListener(){}}),
  MutationObserver:class{constructor(callback){observers.push(callback);}observe(){}},
  drawMarkers(){},showOverview(){},showSelected(){},refreshTop(){}};
 state.window=state;vm.createContext(state);
 const controller=mode==='revision'?'controlflow-revision/all-in-one-v2.js':'all-in-one.js';
 vm.runInContext(read(controller),state,{filename:controller});
 const core=read(mode==='revision'?'controlflow-revision/security-v335.js':'security.js');
 vm.runInContext(['allInOneProtocolActive','visibleItems'].map(name=>functionSource(core,name)).join('\n'),state);
 return {state,document,dialog,apply,file,inputs,buttons,storage,navigation,api:state.AllInOneProtocols,
  boot(){while(timers.length)timers.shift()();},
  refresh(){if(state.AllInOneProtocols.refresh)state.AllInOneProtocols.refresh();dialog.emit('change',{target:inputs.get('lock')});for(const callback of observers)callback();},
  choose(types){for(const [type,input]of inputs)input.checked=types.includes(type);dialog.emit('change',{target:inputs.get(types[0]||'lock')});},
  visibleIds:()=>state.visibleItems().map(object=>object.uid),
  visibleTools:()=>TYPES.filter(type=>!buttons.get(type).hidden),
  key:mode==='revision'?'doorservice-active-protocols':'doorservice-all-in-one-active-protocols'};
}

for(const mode of ['security','revision']){
 const imported=mixed(),before=plain(imported),f=fixture(mode,{objects:imported});
 equal(f.api.get(),[],mode+': imported types never activate protocols before an explicit choice');
 equal(f.visibleTools(),[],mode+': no add buttons before a choice');
 equal(f.visibleIds(),[],mode+': controller empty selection is not allow-all');
 f.boot();ok(f.dialog.open,mode+': normal startup opens picker');
 equal(f.api.get(),[],mode+': opening picker does not infer types from imported objects');
 ok(f.apply.disabled,mode+': continue stays disabled with no checkbox');
 f.choose(['alarm','lock']);ok(!f.apply.disabled,mode+': explicit checked choices enable continue');
 equal(f.api.get(),[],mode+': checkbox editing alone does not activate protocols');
 f.apply.click();equal(f.api.get(),['alarm','lock'],mode+': apply commits exactly the checked types');
 ok(!f.dialog.open,mode+': accepted picker closes');
 equal(f.navigation,[],mode+': imported automation does not cause route navigation');
 equal(f.visibleTools(),['alarm','lock'],mode+': tools match only chosen protocols');
 equal(f.visibleIds(),['qa-alarm','qa-lock'],mode+': drawings and overview use the actual production visibility predicate');
 equal(JSON.parse(f.storage.get(f.key)),['alarm','lock'],mode+': stored selection contains only user choices');
 ok(!f.document.getElementById('headerTitle').textContent.includes('Dörrautomatik'),mode+': unrelated imported area is absent from heading');
 equal(imported,before,mode+': applying choices does not edit imported objects');
 imported.forEach((object,index)=>{assert.equal(f.state.items[index],object);checks++;});
 f.refresh();f.refresh();equal(f.api.get(),['alarm','lock'],mode+': repeated refresh never adds source types');
 equal(f.visibleTools(),['alarm','lock'],mode+': repeated refresh keeps unrelated buttons hidden');
 const nextFile=mixed().map(object=>({...object,uid:'next-'+object.uid})),nextBefore=plain(nextFile);f.state.items=nextFile;f.file.emit('change');f.refresh();
 equal(f.api.get(),['alarm','lock'],mode+': explicit choices survive a mixed-file import');
 equal(f.visibleIds(),['next-qa-alarm','next-qa-lock'],mode+': only selected types in the new file are visible');
 equal(nextFile,nextBefore,mode+': file-switch refresh preserves every source item');
 f.state.items=nextFile.filter(object=>object.type==='automation');f.refresh();
 equal(f.api.get(),['alarm','lock'],mode+': a file without chosen types does not replace user scope');
 equal(f.visibleIds(),[],mode+': unselected automation stays hidden even when it is the only imported item');
 equal(f.visibleTools(),['alarm','lock'],mode+': users can still add the explicitly chosen types');
 f.state.items=nextFile;
 f.api.set(['access','access','invalid']);equal(f.api.get(),['access'],mode+': setter replaces selection and ignores unknown/duplicate types');
 equal(f.visibleTools(),['access'],mode+': setter updates tool visibility without source inference');
 equal(f.visibleIds(),['next-qa-access'],mode+': setter updates actual visibility scope');
 const detached=f.api.get();detached.push('automation');equal(f.api.get(),['access'],mode+': getter returns a detached selection');
 f.api.set(TYPES);equal(f.api.get(),TYPES,mode+': explicit full selection remains supported');
 equal(f.visibleTools(),TYPES,mode+': explicitly selected complete toolset is visible');
 equal(f.visibleIds().length,TYPES.length,mode+': full selection includes each supported type');
 f.api.set([]);f.refresh();equal(f.api.get(),[],mode+': explicit empty set stays empty after refresh');
 equal(f.visibleTools(),[],mode+': clearing selection hides all protocol tools');
 equal(f.visibleIds(),[],mode+': clearing selection hides all stored objects without deleting them');
 equal(nextFile,nextBefore,mode+': all selection changes leave source data unchanged');
 vm.runInContext('window.AllInOneProtocols=undefined',f.state);equal(f.visibleIds().length,TYPES.length,mode+': missing-controller initialization fallback is preserved');
 f.state.AllInOneProtocols={get:()=>[]};f.state.ALL_IN_ONE=false;equal(f.visibleIds().length,TYPES.length,mode+': standalone mode retains original visibility');
}

{
 const objects=mixed(),before=plain(objects),f=fixture('revision',{objects,query:'?protocols=automation,lock_revision,invalid,automation'});
 equal(f.api.get(),['automation','lock_revision'],'revision URL handoff activates exactly the explicit requested types');
 equal(f.visibleTools(),['automation','lock_revision'],'revision URL scope does not absorb security/fire types from imported data');
 equal([...f.inputs].filter(([,input])=>input.checked).map(([type])=>type),['automation','lock_revision'],'revision checkboxes reflect explicit URL selection');
 f.refresh();equal(f.api.get(),['automation','lock_revision'],'revision URL scope survives refresh');
 equal(objects,before,'revision URL selection does not mutate imported data');
}
{
 const f=fixture('security');f.boot();f.choose(['automation','lock']);f.apply.click();
 equal(f.navigation.length,1,'an explicitly checked automation routes to revision');
 const target=new URL(f.navigation[0]);equal(target.pathname,'/tillsyno/controlflow-revision/all-in-one.html','automation keeps the production revision route');
 equal(target.searchParams.get('protocols'),'automation,lock','route carries only user-selected protocols, not all imported types');
}
async function checkScannerImport(){
 const scanner=read('security-detector-scan.js');
 const start=scanner.indexOf(" const onOpen=$('securityFile').onchange;"),end=scanner.indexOf('\n const closeBefore=',start);
 assert(start>=0&&end>start,'the actual scanner file-open wrapper can be extracted');
 const f=fixture('security',{objects:[]});f.boot();f.choose(['lock']);f.apply.click();
 ok(typeof f.api.refresh==='function','picker exposes presentation-only refresh for import wrappers');
 let finishImport,refreshes=0;
 const setterCalls=[],counters={cancel:0,cache:0,draw:0,overview:0,controls:0,open:0};
 f.state.AllInOneProtocols={get:()=>f.api.get(),set:types=>{setterCalls.push(plain(types));f.api.set(types);},refresh:()=>{refreshes++;f.api.refresh();}};
 f.state.importGate=new Promise(resolve=>{finishImport=resolve;});
 f.state.nextItems=mixed();const before=plain(f.state.nextItems),references=[...f.state.nextItems];
 Object.assign(f.state,{$:id=>f.document.getElementById(id),pdf:null,controls:{hidden:false},launcher:{setAttribute(){}},setupOpen:true,
  cancel:()=>counters.cancel++,cache:()=>counters.cache++,drawMarkers:()=>counters.draw++,showOverview:()=>counters.overview++,
  updateControls:()=>counters.controls++,setStatus:()=>{},readyMessage:()=>'',hiddenDrawingProtocols:new Set(['detector']),
  applyDrawingOverlayVisibility:value=>{f.state.overlaysHidden=value;},testCounters:counters});
 vm.runInContext("$('securityFile').onchange=async function(event){testCounters.open++;await importGate;if(event.target.files?.length){items=nextItems;pdf={numPages:2};}};\n"+scanner.slice(start,end),f.state);
 const event={target:{files:[{name:'synthetic-mixed.pdf'}]}},pending=f.file.onchange(event);
 equal(f.api.get(),['lock'],'pending file import keeps chosen protocols');
 equal(refreshes,0,'wrapper waits for the original async file handler before refreshing');
 finishImport();await pending;
 equal(setterCalls,[],'successful mixed import never calls the user-selection setter');
 equal(refreshes,1,'successful import refreshes the existing selection once');
 equal(f.api.get(),['lock'],'scanner wrapper cannot enable imported automation or detector protocols');
 equal(f.visibleTools(),['lock'],'scanner import keeps unrelated add buttons hidden');
 equal(f.visibleIds(),['qa-lock'],'scanner import keeps unrelated source objects outside active drawing scope');
 equal(f.state.items,before,'scanner import leaves all imported data intact');
 references.forEach((object,index)=>{assert.equal(f.state.items[index],object);checks++;});
 equal(counters,{cancel:1,cache:1,draw:1,overview:1,controls:1,open:1},'import still invokes original loading and visual update hooks');
 equal(f.state.controls.hidden,true,'import closes scanner controls');
 equal(f.state.setupOpen,false,'import resets scanner setup state');
 await f.file.onchange({target:{files:[]}});equal(refreshes,1,'cancelled file chooser does not refresh or change selection');
 equal(f.api.get(),['lock'],'cancelled chooser preserves selected protocols');
 f.api.set(['access']);f.state.nextItems=mixed().map(object=>({...object,uid:'second-'+object.uid}));
 const secondBefore=plain(f.state.nextItems);await f.file.onchange(event);
 equal(f.api.get(),['access'],'a later import preserves the latest explicit user choice');
 equal(setterCalls,[],'later imports still do not call the selection setter');
 equal(f.state.items,secondBefore,'later mixed-file data remains untouched');

 // Choosing the scanner tool itself is an explicit request for detectors.
 vm.runInContext(functionSource(scanner,'enableDetectors'),f.state);f.state.enableDetectors();
 equal(f.api.get(),['access','detector'],'explicit scanner enable adds only detector to existing user choices');
 equal(setterCalls,[['access','detector']],'explicit detector enable uses the setter exactly once');
 equal(f.state.hiddenDrawingProtocols.has('detector'),false,'explicit detector enable reveals its layer');
 equal(f.state.overlaysHidden,false,'explicit detector enable reveals drawing overlays');
 f.state.enableDetectors();equal(setterCalls.length,1,'enabling an already chosen detector protocol is idempotent');
 equal(f.state.items,secondBefore,'explicit scanner enable never rewrites source items');
}
checkScannerImport().then(()=>console.log('protocol-selection-scope-v556: '+checks+' assertions passed (real pickers, async scanner import wrapper, explicit detector enable, user scope, file refresh, setter/getter, tool/object visibility, URL handoff and unchanged source items).')).catch(error=>{console.error(error);process.exitCode=1;});
