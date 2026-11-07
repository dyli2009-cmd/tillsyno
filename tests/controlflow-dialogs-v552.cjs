'use strict';
/* Production modal controller + actual checklist handlers and history engine.
   Minimal DOM contract tests; browser layout, native focus trapping and physical
   touch behavior remain live-QA checks rather than simulated browser claims. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
let checks=0;
function equal(a,b,message){if(a?.tagName||b?.tagName)assert.equal(a,b,message);else assert.deepEqual(plain(a),plain(b),message);checks++;}
function ok(value,message){assert.ok(value,message);checks++;}
function fn(source,name){
 const match=new RegExp('^[ \\t]*(?:async )?function '+name+'\\(','m').exec(source);assert(match,name);
 for(let end=source.indexOf('}',match.index);end>=0;end=source.indexOf('}',end+1)){
  const text=source.slice(match.index,end+1);try{new vm.Script('('+text+')');return text;}catch(_){}
 }
 throw Error('Cannot extract '+name);
}
function environment(mode){
 let document,state;
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.attrs={};this.dataset={};this.listeners=new Map();this.value='';this.text='';this.style={setProperty:(k,v)=>{this.style[k]=v;}};
   this.classList={contains:n=>this.className.split(/\s+/).includes(n),add:(...n)=>{this.className=[...new Set([...this.className.split(/\s+/),...n])].join(' ');},remove:(...n)=>{this.className=this.className.split(/\s+/).filter(x=>!n.includes(x)).join(' ');},toggle:(n,on)=>{const active=on===undefined?!this.classList.contains(n):on;active?this.classList.add(n):this.classList.remove(n);return active;}};
  }
  set id(v){this.attrs.id=v;}get id(){return this.attrs.id||'';}
  set className(v){this.attrs.class=v;}get className(){return this.attrs.class||'';}
  get isConnected(){return this===document||!!this.parentNode?.isConnected;}
  set hidden(v){v?this.setAttribute('hidden',''):this.removeAttribute('hidden');}get hidden(){return this.hasAttribute('hidden');}
  set textContent(v){this.text=String(v);this.replaceChildren();}get textContent(){return this.text+this.children.map(x=>x.textContent).join('');}
  set innerHTML(v){this.textContent=v;}
  setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}hasAttribute(k){return k in this.attrs;}removeAttribute(k){delete this.attrs[k];}
  append(...nodes){for(let node of nodes){if(typeof node==='string'){const text=new Element('text');text.text=node;node=text;}node.remove();node.parentNode=this;this.children.push(node);}}
  appendChild(node){this.append(node);return node;}
  replaceChildren(...nodes){for(const child of this.children)child.parentNode=null;this.children=[];this.append(...nodes);}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
  before(node){const p=this.parentNode,index=p.children.indexOf(this);node.remove();p.children.splice(index,0,node);node.parentNode=p;}
  matches(selector){return selector.split(',').some(s=>{s=s.trim();if(s.startsWith('#'))return this.id===s.slice(1);if(s.startsWith('.'))return this.classList.contains(s.slice(1));const attr=/^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(s);if(attr)return attr[2]===undefined?this.hasAttribute(attr[1]):this.getAttribute(attr[1])===attr[2]||(attr[1].startsWith('data-')&&this.dataset[attr[1].slice(5)]===attr[2]);return this.tagName.toLowerCase()===s;});}
  closest(selector){for(let n=this;n;n=n.parentNode)if(n.matches(selector))return n;return null;}
  descendants(){return this.children.flatMap(n=>[n,...n.descendants()]);}
  querySelectorAll(selector){return this.descendants().filter(n=>n.matches(selector));}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  addEventListener(type,callback){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(callback);}
  removeEventListener(type,callback){this.listeners.set(type,(this.listeners.get(type)||[]).filter(f=>f!==callback));}
  emit(type,extra={}){const event={type,target:this,preventDefault(){this.defaultPrevented=true;},stopPropagation(){},...extra};this['on'+type]?.(event);for(const callback of [...(this.listeners.get(type)||[])])callback(event);return event;}
  click(){return this.emit('click');}requestSubmit(){return this.emit('submit');}
  focus(){document.activeElement=this;}scrollIntoView(){}
  setPointerCapture(id){this.pointer=id;}hasPointerCapture(id){return this.pointer===id;}releasePointerCapture(){this.pointer=null;}
  getBoundingClientRect(){const width=this.tagName==='DIALOG'?Math.min(520,state.innerWidth-16):44,height=this.tagName==='DIALOG'?Math.min(330,state.visualViewport.height-16):44,left=parseFloat(this.style.left)||0,top=parseFloat(this.style.top)||0;return {left,top,width,height,right:left+width,bottom:top+height};}
  getClientRects(){return this.isConnected&&!this.closest('[hidden]')?[this.getBoundingClientRect()]:[];}
 }
 class Dialog extends Element{constructor(){super('dialog');this.open=false;}show(){this.open=true;state.nativeShows++;}showModal(){this.open=true;state.nativeModals++;}close(){this.open=false;state.nativeCloses++;this.emit('close');}}
 document=new Element('document');document.documentElement=new Element('html');document.body=new Element('body');document.append(document.documentElement);document.documentElement.append(document.body);document.documentElement.dataset={controlflowUi:'1',cfStampMode:mode};
 document.createElement=tag=>tag==='dialog'?new Dialog():new Element(tag);document.createTextNode=text=>{const n=new Element('text');n.text=text;return n;};document.getElementById=id=>document.descendants().find(n=>n.id===id)||null;
 const main=new Element('main');document.body.append(main);
 for(const id of ['secChecklist','secStatus','secEditChecks','secAddCheck','secDelete','secProgress','securityMessage','cfProtocolTools']){const node=new Element(id.includes('Check')||id==='secDelete'||id==='cfProtocolTools'?'button':'div');node.id=id;main.append(node);}
 state={document,HTMLDialogElement:Dialog,console,innerWidth:1000,innerHeight:800,nativeShows:0,nativeModals:0,nativeCloses:0,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},requestAnimationFrame:callback=>callback(),queueMicrotask,
  prompt(){throw Error('Unexpected native prompt');},confirm(){throw Error('Unexpected native confirm');},alert(){throw Error('Unexpected native alert');}};
 const events=new Element('window');state.addEventListener=events.addEventListener.bind(events);state.removeEventListener=events.removeEventListener.bind(events);state.dispatchEvent=event=>events.emit(event.type,event);
 state.visualViewport=new Element('viewport');Object.assign(state.visualViewport,{width:1000,height:800,offsetLeft:0,offsetTop:0});
 state.window=state;vm.createContext(state);vm.runInContext(read('controlflow-dialogs-v552.js'),state);
 if(mode==='revision')vm.runInContext(read('controlflow-revision/revision-inline-v310.js'),state);
 return state;
}
async function dialogContract(mode){
 const s=environment(mode),d=s.document,$=id=>d.getElementById(id),trigger=$('secEditChecks');trigger.focus();
 let pending=s.ControlflowDialogs.edit({title:'Ändra kontrollpunkt 1.1',value:'Befintlig text',allowRemove:true});
 let dialog=$('controlflowAppDialog');ok(dialog.open,'Scoped dialog opens');equal(s.nativeModals,1,'Captured native modal called even after actual revision inline patch');
 equal(dialog.parentNode,d.body,'Modal remains in body, not inline workspace');equal(d.querySelectorAll('#revisionInlineWorkspace').length,0,'No inline workspace is created');
 equal(d.activeElement,$('controlflowAppDialogText'),'Textarea receives focus');equal($('controlflowAppDialogText').value,'Befintlig text','Existing text prefilled');
 const form=dialog.querySelector('form');$('controlflowAppDialogText').value='  ';form.requestSubmit();
 ok(dialog.open,'Blank submission keeps dialog open');equal($('controlflowAppDialogText').getAttribute('aria-invalid'),'true','Blank text identified inline');ok($('controlflowAppDialogError').textContent.length>0,'Visible inline error');
 $('controlflowAppDialogText').value='  Ny text <utan HTML>  ';form.requestSubmit();equal(await pending,{action:'save',value:'Ny text <utan HTML>'},'OK trims safely and returns text');equal(d.activeElement,trigger,'Closing restores focus');equal($('controlflowAppDialog'),null,'Closed dialog removed');
 pending=s.ControlflowDialogs.edit({title:'Egen kontrollpunkt',value:'Utkast'});dialog=$('controlflowAppDialog');dialog.emit('cancel');equal(await pending,null,'Escape/cancel does not commit');
 pending=s.ControlflowDialogs.edit({title:'Ändra kontrollpunkt',value:'Utkast',allowRemove:true});dialog=$('controlflowAppDialog');dialog.querySelector('.cfAppDialogDanger').click();equal(await pending,{action:'remove'},'Explicit remove action is distinct from blank text');
 pending=s.ControlflowDialogs.confirm({title:'Ta bort D1?',description:'D1'});dialog=$('controlflowAppDialog');equal(d.activeElement,dialog.querySelector('.cfAppDialogCancel'),'Destructive confirmation starts on Cancel');dialog.querySelector('form').requestSubmit();equal(await pending,true,'Explicit removal confirmed');
 pending=s.ControlflowDialogs.confirm({title:'Ta bort D1?'});dialog=$('controlflowAppDialog');dialog.querySelector('.cfAppDialogClose').click();equal(await pending,false,'Close does not remove');
 const menu=d.createElement('div');menu.id='testMenu';d.body.append(menu);menu.append(trigger);trigger.focus();pending=s.ControlflowDialogs.edit({title:'Egen punkt'});menu.hidden=true;$('controlflowAppDialog').emit('cancel');await pending;equal(d.activeElement,$('cfProtocolTools'),'Hidden menu trigger falls back to visible tools button');
 pending=s.ControlflowDialogs.edit({title:'Flyttbar'});dialog=$('controlflowAppDialog');const head=dialog.querySelector('.cfAppDialogHead'),start=dialog.getBoundingClientRect();
 head.emit('pointerdown',{button:0,pointerId:1,clientX:300,clientY:250});head.emit('pointermove',{pointerId:1,clientX:400,clientY:290});
 equal([parseFloat(dialog.style.left),parseFloat(dialog.style.top)],[start.left+100,start.top+40],'Title drag moves dialog by pointer delta');
 head.emit('pointercancel',{pointerId:1});const cancelled=[dialog.style.left,dialog.style.top];head.emit('pointermove',{pointerId:1,clientX:700,clientY:600});equal([dialog.style.left,dialog.style.top],cancelled,'Cancelled drag stops moving');
 head.emit('keydown',{key:'ArrowLeft'});equal(parseFloat(dialog.style.left),start.left+90,'Keyboard can move dialog');
 s.visualViewport.height=360;s.visualViewport.emit('resize');ok(parseFloat(dialog.style.top)>=8&&parseFloat(dialog.style.top)+dialog.getBoundingClientRect().height<=352,'Viewport shrink keeps dialog within available height');
 dialog.emit('cancel');await pending;
 const first=s.ControlflowDialogs.edit({title:'Första'}),second=s.ControlflowDialogs.edit({title:'Andra'});equal(await first,null,'New request safely cancels pending dialog');equal(d.querySelectorAll('#controlflowAppDialog').length,1,'Only one dialog at a time');$('controlflowAppDialog').emit('cancel');await second;
 d.documentElement.dataset.cfStampMode='brand';equal(await s.ControlflowDialogs.edit({title:'Utanför'}),null,'Other route does not create scoped modal');equal($('controlflowAppDialog'),null,'Outside scope stays unchanged');
}
function coreFixture(mode){
 const s=environment(mode),source=read(mode==='security'?'security.js':'controlflow-revision/security-v335.js');
 s.$=id=>s.document.getElementById(id);Object.assign(s,{ALL_IN_ONE:true,items:[],selected:null,securityCheckEditUid:null,textNotes:[],drawingExtras:[],project:{projectName:'Oförändrat projekt'},logoData:'',saves:0,
  cleanSecurityRemarkText:text=>text,securityCustomProtocolLabel:()=>'',securityHasDetectorBox:()=>false,drawMarkers(){},showOverview(){},showSelected(){},msg(text){s.message=text;},go(view){s.view=view;}});
 const names=['normalizeSecurityCheckEdits','isDoorAutomationItem','normalizeAutomationIdentity','normalize','allChecks','syncStatus','editSecurityCheck','removeSecurityCheck','allInOneProtocolActive','cur','controlflowDialogApi','nextSecurityCustomCheck','finishControlflowCheckChange','openControlflowCheckEditor','removeControlflowCheck','removeControlflowObject','buildChecklist','updateProgress'];
 if(mode==='security')names.push('securityDefaultCheckTitle');else names.push('openSecurityCheckEditor');
 vm.runInContext(source.slice(source.indexOf('const SYSTEMS='),source.indexOf('const DOOR_AUTOMATION_MODELS='))+'\nconst DOOR_AUTOMATION_MODELS=[];\n'+names.map(n=>fn(source,n)).join('\n'),s);
 vm.runInContext(read('session-history.js'),s);
 for(const id of ['secAddCheck','secDelete'])vm.runInContext(source.split('\n').find(line=>line.startsWith("$('"+id+"').onclick=")),s);
 s.save=()=>{s.saves++;s.RevisionInlineUI?.changed();s.securitySessionHistory.record();};
 s.setup=type=>{
  const o={uid:'test-'+type,type,number:1,id:'D1',page:3,x:.23,y:.62,labelX:.35,labelY:.55,checks:{'1.1':{result:'remark',note:'Bevarad anmärkning'}},customChecks:[{id:'1.99',title:'Egen befintlig'}],checkEdits:{},notes:'Objektnotering',manualFail:false,remediationDate:'2026-11-01',remediationSignature:'QA'};
  s.items=[s.normalize(o)];s.selected=o.uid;s.securityCheckEditUid=o.uid;s.saves=0;
  s.securitySessionHistory=s.ServiceSessionHistory({scope:()=>1,capture:()=>({data:plain({items:s.items,project:s.project}),selected:s.selected}),restore:state=>{s.items=state.data.items;s.project=state.data.project;s.selected=state.selected;},changed(){}});
  s.buildChecklist(o);return o;
 };
 return s;
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
async function coreWorkflow(mode,type){
 const s=coreFixture(mode),$=s.$,o=s.setup(type),before=plain(o),project=plain(s.project);
 // Row resolution uses production data-check-id attributes.
 const findRow=id=>$('secChecklist').querySelectorAll('.secCheck').find(n=>n.dataset.checkId===id);
 let action=findRow('1.1').querySelector('.secEditCheck');action.focus();action.click();
 equal($('controlflowAppDialogText').value,s.allChecks(o).find(([id])=>id==='1.1')[1],mode+': actual Ändra handler opens app editor');
 $('controlflowAppDialogText').value='  ';$('controlflowAppDialog').querySelector('form').requestSubmit();await settle();equal(s.items,[before],'Invalid text leaves all object data untouched');
 $('controlflowAppDialog').querySelector('.cfAppDialogCancel').click();await settle();equal(s.saves,0,'Cancel does not write history or data');
 findRow('1.1').querySelector('.secEditCheck').click();$('controlflowAppDialogText').value='Ändrad kontrollpunkt';$('controlflowAppDialog').querySelector('form').requestSubmit();await settle();
 equal(o.checkEdits['1.1'],'Ändrad kontrollpunkt','Existing edit semantics retained');equal(o.checks['1.1'],{result:'',note:''},'Changed control resets its old assessment as before');equal(o.checks['1.99'],before.checks['1.99'],'Unrelated control is untouched');equal([o.page,o.x,o.y,o.labelX,o.labelY],[before.page,before.x,before.y,before.labelX,before.labelY],'Coordinates unchanged');equal(s.project,project,'Project unchanged');equal(s.saves,1,'One commit for valid edit');
 ok(s.securitySessionHistory.undo(),'Existing session history undoes edit');equal(s.items,[before],'Undo restores exact title, checks and assessment');
 let current=s.cur();s.buildChecklist(current);const next=s.nextSecurityCustomCheck(current);$('secAddCheck').click();$('controlflowAppDialogText').value='Egen ny kontrollpunkt';$('controlflowAppDialog').querySelector('form').requestSubmit();await settle();
 equal(current.customChecks.at(-1),{id:next,title:'Egen ny kontrollpunkt'},'Custom point keeps existing numbering algorithm');equal(next,mode==='revision'?'1.100':'1.'+(s.allChecks(before).filter(([id])=>id!=='1.99').length+1),'Root and revision numbering contracts retained');
 equal(current.checks[next],{result:'',note:''},'New point starts unassessed');ok(s.securitySessionHistory.undo(),'One undo removes newly added point');equal(s.items,[before],'Undo addition restores object');
 current=s.cur();s.buildChecklist(current);findRow('1.1').querySelector('.secRemoveCheck').click();$('controlflowAppDialog').querySelector('.cfAppDialogCancel').click();await settle();equal(s.items,[before],'Cancel remove keeps base point');
 findRow('1.1').querySelector('.secRemoveCheck').click();$('controlflowAppDialog').querySelector('form').requestSubmit();await settle();equal(current.checkEdits['1.1'],null,'Base point removal keeps existing tombstone semantics');ok(!('1.1' in current.checks),'Removed assessment deleted as before');ok(s.securitySessionHistory.undo(),'Removal follows existing undo history');equal(s.items,[before],'Undo restores removed assessment and note');
 current=s.cur();s.buildChecklist(current);findRow('1.99').querySelector('.secEditCheck').click();$('controlflowAppDialog').querySelector('.cfAppDialogDanger').click();await settle();ok(!current.customChecks.some(c=>c.id==='1.99'),'Own point can be removed from editor');ok(s.securitySessionHistory.undo(),'Own point deletion reversible');equal(s.items,[before],'Own point undo restores exact object');
 current=s.cur();const pending=s.openControlflowCheckEditor(current,'1.1','Utkast');s.selected='another-object';$('controlflowAppDialogText').value='Får inte sparas';$('controlflowAppDialog').querySelector('form').requestSubmit();await pending;equal(s.items,[before],'Stale editor cannot mutate a changed selection');s.selected=current.uid;
 $('secDelete').click();$('controlflowAppDialog').querySelector('.cfAppDialogCancel').click();await settle();equal(s.items,[before],'Object delete Cancel is safe');
 $('secDelete').click();$('controlflowAppDialog').querySelector('form').requestSubmit();await settle();equal(s.items,[],'Actual protocol tool removes selected object after confirmation');equal([s.selected,s.view],[null,'drawing'],'Object deletion returns to drawing');ok(s.securitySessionHistory.undo(),'Object deletion uses existing history');equal(s.items,[before],'Undo restores complete object and protocol');
 equal(s.controlflowDialogApi({type:'fire_panel'}),null,'Brand bypasses new dialog integration');s.ALL_IN_ONE=false;equal(s.controlflowDialogApi(current),null,'Standalone service bypasses new dialogs');
}
(async()=>{
 for(const mode of ['security','revision'])await dialogContract(mode);
 for(const[mode,type]of [['security','lock'],['security','detector'],['revision','automation'],['revision','automation_selfcheck'],['revision','lock_revision']])await coreWorkflow(mode,type);
 const revisionHtml=read('controlflow-revision/all-in-one.html'),script=revisionHtml.indexOf('controlflow-dialogs-v552.js'),inline=revisionHtml.indexOf('revision-inline-v310.js');
 ok(script>=0&&script<inline,'Production revision HTML loads modal controller before legacy inline adapter');
 console.log(`controlflow-dialogs-v552: ${checks} assertions passed (actual modal controller, revision inline patch, checklist handlers and session history). Layout and native browser behavior require live review.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
