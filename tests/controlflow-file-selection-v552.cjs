'use strict';
const assert=require('node:assert/strict');
const Style=require('../controlflow-stamp-style-v549.js');
const Selection=require('../security-stamp-selection-v549.js');
const Controls=require('../controlflow-stamp-controls-v551.js');
let checks=0;
const clone=value=>JSON.parse(JSON.stringify(value));
function equal(actual,expected,message){assert.deepEqual(clone(actual),clone(expected),message);checks++;}
function near(actual,expected,message){assert.ok(Math.abs(actual-expected)<1e-7,message);checks++;}
const types=['automation','automation_selfcheck','lock_revision','lock','alarm','access','detector'];

// The rule is physical A3 or larger in either orientation, never screen zoom.
equal(Style.isLargeDrawing({width:595.28,height:841.89}),false,'A4 keeps100%');
equal(Style.isLargeDrawing({width:841.89,height:1190.55}),true,'A3 uses50%');
equal(Style.isLargeDrawing({width:1190.55,height:841.89}),true,'landscape A3 uses50%');
equal(Style.isLargeDrawing({width:1190.55,height:1683.78}),true,'A2 uses50%');
equal(Style.isLargeDrawing({width:841,height:1190}),true,'one-point tolerance accepts rounded A3 exports');
equal(Style.isLargeDrawing({width:839,height:1190}),false,'smaller sheets do not pass the short-side threshold');
equal(Style.isLargeDrawing({width:1600,height:300}),false,'a long narrow strip is not incorrectly classified as A3');
equal(Style.isLargeDrawing({width:Infinity,height:1191}),false,'invalid size has a safe standard');
const documentA={},documentB={};let viewportCalls=0;
const physical=Style.rememberPageSize(documentA,1,{view:[10,20,605.28,861.89],userUnit:2,getViewport(){viewportCalls++;throw new Error('screen viewport must not be read');}});
near(physical.width,1190.56,'crop/view width includes physical UserUnit');near(physical.height,1683.78,'crop/view height includes physical UserUnit');
equal(viewportCalls,0,'physical view coordinates take priority over viewport state');
equal(Style.isLargeDrawing(Style.pageSize(documentA,1)),true,'physical UserUnit is included in A3 classification');
equal(Style.pageSize(documentB,1),null,'page size does not leak to another document');
let requestedScale;
Style.rememberPageSize(documentA,2,{getViewport(options){requestedScale=options.scale;return {width:595.28,height:841.89};}});
equal(requestedScale,1,'fallback explicitly requests unzoomed PDF dimensions');
equal(Style.isLargeDrawing(Style.pageSize(documentA,2)),false,'each page retains its own physical size');
equal(Style.rememberPageSize(null,1,{width:842,height:1191}),null,'invalid document is not cached');

for(const mode of ['security','revision']){
 for(const type of types){
  equal(Style.applies({type},mode),true,'mixed supported type '+type+' participates in '+mode);
  const legacy={type},before=clone(legacy),metrics=Style.metrics(legacy,'D1',mode,(text,size)=>text.length*size*.6);
  equal([metrics.stampScale,metrics.arrowScale],mode==='revision'?[1.77,3]:[1,1],'legacy runtime defaults remain for '+type+' in '+mode);
  near(metrics.size,(['automation','automation_selfcheck'].includes(type)?15.4:10.8)*(mode==='revision'?1.77:1),'legacy font formula remains for '+type+' in '+mode);
  equal(legacy,before,'measuring an old object does not migrate it');
  const large={type},project={};Style.inherit(large,project,mode,Style.pageSize(documentA,1));
  equal([large.customerStampScale,large.customerArrowScale],[.5,1],'new physical large-page stamp uses50%/Normal');
  equal(project,{},'automatic page default is not saved as a user-chosen project override');
  const small={type};Style.inherit(small,{},mode,Style.pageSize(documentA,2));
  equal([small.customerStampScale,small.customerArrowScale],[1,1],'new small-page stamp uses100%/Normal');
  const explicit={type,customerStampScale:2.4,customerArrowScale:.5};Style.inherit(explicit,{},mode,physical);
  equal([explicit.customerStampScale,explicit.customerArrowScale],[2.4,.5],'explicit object size and arrow override automatic defaults');
  const inherited={type};Style.inherit(inherited,{controlflowStampDefaults:{version:1,stampScale:.75,arrowScale:2}},mode,physical);
  equal([inherited.customerStampScale,inherited.customerArrowScale],[.75,2],'explicit project style overrides automatic defaults');
 }
 equal(Style.applies({type:'fire_panel'},mode),false,'Brand remains outside shared geometry');
 equal(Style.applies({type:'detector',detectorBox:{width:.1,height:.1}},mode),false,'manual boxes retain their own geometry');

 // The actual selection model and size controller operate on one shared,
 // file-wide set, including hidden active protocols but excluding inactive ones.
 const objects=types.map((type,index)=>({uid:type,type,page:1+index%3,x:.2,y:.3,labelX:.4,labelY:.45,customerStampScale:1.25,customerArrowScale:.5,positionLocked:false,checks:{a:{result:'',note:'Draft'}}}));
 objects.push({uid:'manual',type:'detector',page:2,detectorBox:{width:.03,height:.02},customerStampScale:1.2});
 objects.push({uid:'brand',type:'fire_panel',page:3,customerStampScale:1.5});
 const before=clone(objects),state={document:{},page:1,items:objects,project:{controlflowStampDefaults:{version:1,stampScale:1.25,arrowScale:.5}},history:[],saved:0};
 const active=new Set(types.filter(type=>type!=='access')),hidden=new Set(['alarm']);
 const model=Selection.createModel({document:()=>state.document,page:()=>state.page,items:()=>state.items,
  eligible:item=>active.has(item.type),visible:item=>!hidden.has(item.type),checks:()=>[['a','Kontroll']],syncStatus(){}});
 const controls=Controls.createController({mode:()=>mode,items:()=>state.items,project:()=>state.project,selected:()=>model.selected(),eligible:()=>model.eligible(),busy:()=>false,
  beforeChange:()=>state.history.push(clone({items:state.items,project:state.project})),afterChange:()=>state.saved++});
 model.all();equal(model.selected().length,7,'all-file selection includes six active arrows plus one manual box');
 state.page=3;equal(model.selected().length,7,'page change preserves whole-file selection');
 const result=controls.setPercent(50);equal(result.selected,6,'all-file size action reports only applicable arrows');
 equal(state.items.filter(item=>active.has(item.type)&&!item.detectorBox).map(item=>item.customerStampScale),[.5,.5,.5,.5,.5,.5],'all active arrow types on all pages resize together');
 equal(state.project.controlflowStampDefaults.stampScale,.5,'all active targets update the inherited project default despite inactive objects');
 equal([state.saved,state.history.length],[1,1],'multi-page size change is one saved undo group');
 for(const id of ['access','manual','brand'])equal(state.items.find(item=>item.uid===id),before.find(item=>item.uid===id),'inactive/manual/Brand object remains unchanged: '+id);
 equal(model.apply('lock').objects,7,'lock action covers the same file selection including manual boxes');
 equal(state.items.filter(item=>active.has(item.type)).every(item=>item.positionLocked),true,'active objects remain selected and lock across all pages');
 controls.setArrow(1);equal(state.items.filter(item=>active.has(item.type)&&!item.detectorBox).map(item=>item.customerArrowScale),[1,1,1,1,1,1],'Normal can explicitly be applied to all selected arrow types');
 model.onlyPage();equal(model.selected().every(item=>item.page===3),true,'page-only action replaces file selection with current page');
 controls.setPercent(75);equal(state.project.controlflowStampDefaults.stampScale,.5,'page-only subset does not overwrite an existing whole-file standard');
 equal(state.items.find(item=>item.uid==='automation').customerStampScale,.5,'page-only change leaves another floor untouched');
 state.document={};equal(model.selected(),[],'opening another file clears the transient selection');
}
console.log('controlflow-file-selection-v552: '+checks+' assertions passed (physical A3 rule, page cache, mixed-mode inheritance, file-wide sizing/locks and explicit page scope).');
