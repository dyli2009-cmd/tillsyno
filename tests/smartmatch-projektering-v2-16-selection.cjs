'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../smartmatch-projektering-v2-15-data.js'),L=require('../smartmatch-projektering-v2-15-library.js');
const source=fs.readFileSync(require.resolve('../smartmatch-projektering-v2-15.js'),'utf8');
// Exercise the production selection/placement functions with UI and storage adapters.
const fixture=source.slice(0,source.lastIndexOf("  window.addEventListener('tillsyno-authorized'"))+`
  globalThis.fixture={
    init(project){D=globalThis.model;L=globalThis.library;state=project;library=L.createDefault();activeCode=null;draft=null;dirty=false;selected=[];currentStencil='GS1:1';viewer={setSelection(){},setStencil(){},setAnnotationSelection(){}};renderAll=()=>{};setTool=()=>{};openCardView=()=>{};snap=input=>({x:input.x,y:input.y});leaveDraft=async()=>globalThis.allowLeave;commit=async mutate=>mutate(state);},
    choose:chooseStencil,place,
    snapshot:()=>({state,activeCode,draft,currentStencil}),
    activate:setActive
  };
})();`;
const context=vm.createContext({model:D,library:L,allowLeave:true,matchMedia:()=>({matches:false}),document:{},console});
vm.runInContext(fixture,context);
(async()=>{
  const app=context.fixture,state=D.createEmpty();
  state.drawing={name:'Test.pdf',pages:[{width:600,height:800,view:[0,0,600,800],rotation:0,transform:[1,0,0,-1,0,800]}]};
  app.init(state);const original=JSON.stringify(state);
  for(const code of ['GS1:1','GS51:1','DBL:1','WC:1','HWC:1','GS51:1']){
    await app.choose(code);
    assert.equal(app.snapshot().currentStencil,code);
    assert.equal(app.snapshot().activeCode,null);
    assert.equal(app.snapshot().draft,null,'picker must not create an editable phantom card');
    assert.equal(JSON.stringify(state),original,'picker must not mutate project or counts');
  }
  await app.place({stencilId:'GS51:1',page:1,x:.5,y:.5});
  assert.equal(Object.keys(state.cards).length,1);
  assert.equal(state.placements.length,1);
  assert.equal(app.snapshot().activeCode,'GS51:1');
  assert.equal(app.snapshot().draft.code,'GS51:1');
  await app.choose('GS51:1');assert.equal(Object.keys(state.cards).length,1);
  context.allowLeave=false;await app.choose('WC:1');
  assert.equal(app.snapshot().currentStencil,'GS51:1','cancel retains the current card');
  context.allowLeave=true;await app.choose('WC:1');
  assert.equal(app.snapshot().draft,null);assert.equal(Object.keys(state.cards).length,1);
  D.ensureCard(state,'WC:1');await app.choose('WC:1');
  assert.equal(app.snapshot().draft.code,'WC:1','explicitly created cards remain editable');
  for(const code of ['GS1:1','GS51:1','GS100:1','DBL:1','WC:1','HWC:1']){
    const stencil=D.defaultStencil(code);assert(stencil.width/stencil.height<=1.4);
  }
  console.log('PASS: picking does not create cards/drafts, placement creates one card, existing and explicit cards open, cancel preserves selection, all default card stamps are rounder.');
})().catch(error=>{console.error(error);process.exitCode=1;});
