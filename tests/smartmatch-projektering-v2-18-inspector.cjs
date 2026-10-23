'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-15-data.js'),L=require('../smartmatch-projektering-v2-15-library.js');
class Element extends EventTarget{
 constructor(type=''){super();this.type=type;this.value='';this.checked=false;this.hidden=false;this.dataset={};this.classList={toggle(){}};}
 setAttribute(){} focus(){} select(){} closest(selector){if(selector==='[data-annotation-preset]'&&this.dataset.annotationPreset)return this;if(selector==='[data-remove-arrow]'&&this.dataset.removeArrow)return this;return null;}
}
const nodes=new Map(),html=fs.readFileSync(require.resolve('../smartmatch-projektering-v2-15.html'),'utf8');
for(const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){const node=new Element(/\btype="([^"]+)"/.exec(tag[0])?.[1]||'');const field=/data-annotation-field="([^"]+)"/.exec(tag[0]);if(field)node.dataset.annotationField=field[1];nodes.set(tag[1],node);}
const document={activeElement:null,getElementById:id=>nodes.get(id)||new Element()};
const source=fs.readFileSync(require.resolve('../smartmatch-projektering-v2-15.js'),'utf8');
const fixture=source.slice(0,source.lastIndexOf("  window.addEventListener('tillsyno-authorized'"))+`
 globalThis.fixture={
  init(project){D=globalThis.model;L=globalThis.library;state=project;library=L.createDefault();S={save:async()=>{}};viewer={setSelection(){},setStencil(){},setProject(){},setTool(){},setAnnotationSelection(){}};status=()=>{};message=()=>{};renderAll=()=>renderAnnotationPanel();renderSelection=()=>{};renderTools=()=>{};renderCard=()=>{};bindAnnotations();},
  create:createAnnotation,select:selectAnnotation,arrow:addAnnotationArrow,remove:removeAnnotation,duplicate:duplicateAnnotation,undo:()=>travelHistory(true),redo:()=>travelHistory(false),render:renderAnnotationPanel,saveText:queueAnnotationText,settle:()=>canvasQueue,
  snapshot:()=>({state:clone(state),selectedAnnotation,currentTool,undo:undoStack.length})
 };
})();`;
const context=vm.createContext({model:D,library:L,document,matchMedia:()=>({matches:false}),console,setTimeout,clearTimeout,crypto:globalThis.crypto});vm.runInContext(fixture,context);
function dispatch(where,type,target){const event=new Event(type);Object.defineProperty(event,'target',{value:target});nodes.get(where).dispatchEvent(event);}
(async()=>{
 const project=D.createEmpty();project.drawing={name:'Test.pdf',pages:[{width:600,height:800,rotation:0,view:[0,0,600,800],transform:[1,0,0,-1,0,800]}]};
 const app=context.fixture;app.init(project);await app.create({page:1,x:.5,y:.5});
 assert.equal(app.snapshot().state.annotations.length,1);assert.equal(nodes.get('annotationPanel').hidden,false);assert.equal(app.snapshot().currentTool,'select');
 const input=nodes.get('annotationText');document.activeElement=input;input.value='Kontrollera dörr A';
 const preset=new Element();preset.dataset.annotationPreset='black';dispatch('annotationPanel','click',preset);await app.settle();
 assert.equal(input.value,'Kontrollera dörr A','style refresh preserves focused text edits');
 assert.equal(app.snapshot().state.annotations[0].fill,'#202a25');assert.equal(app.snapshot().state.annotations[0].textColor,'#ffffff');
 document.activeElement=null;dispatch('annotationText','change',input);await app.settle();assert.equal(app.snapshot().state.annotations[0].text,'Kontrollera dörr A');
 const font=nodes.get('annotationFontSize');font.value='22';dispatch('annotationPanel','change',font);await app.settle();assert.equal(app.snapshot().state.annotations[0].fontSize,22);
 const transparent=nodes.get('annotationTransparent');transparent.checked=true;dispatch('annotationTransparent','change',transparent);await app.settle();assert.equal(app.snapshot().state.annotations[0].fill,null);
 const id=app.snapshot().selectedAnnotation;await app.arrow({id,x:.2,y:.8});await app.arrow({id,x:.8,y:.8});assert.equal(app.snapshot().state.annotations[0].arrows.length,2);
 const beforeDelete=JSON.parse(JSON.stringify(app.snapshot().state.annotations));await app.remove();assert.equal(app.snapshot().state.annotations.length,0);assert.equal(nodes.get('annotationPanel').hidden,true);
 await app.undo();assert.deepEqual(JSON.parse(JSON.stringify(app.snapshot().state.annotations)),beforeDelete,'undo restores text, styles and both arrows');
 await app.select(id);await app.duplicate();assert.equal(app.snapshot().state.annotations.length,2);assert.notEqual(app.snapshot().state.annotations[0].arrows[0].id,app.snapshot().state.annotations[1].arrows[0].id);
 await app.select(null);assert.equal(nodes.get('annotationPanel').hidden,true);assert.equal(app.snapshot().selectedAnnotation,null);
 assert.equal(Object.keys(app.snapshot().state.cards).length,0);
 console.log('PASS: actual inspector handlers save text/styles, preserve focused edits, add multiple arrows, duplicate, deselect, delete and undo without creating door cards.');
})().catch(error=>{console.error(error);process.exitCode=1;});
