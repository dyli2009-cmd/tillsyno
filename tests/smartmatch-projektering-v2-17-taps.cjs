'use strict';
const assert=require('node:assert/strict');
const {PDFDocument}=require('../vendor/pdf-lib.min.js');
const {harness,Element,pause}=require('./smartmatch-projektering-v2-14-sharpness.cjs');
Element.prototype.closest=function(selector){
  if(selector==='[data-placement-id]'&&this.dataset.placementId)return this;
  if(selector==='[data-resize-handle]'&&this.dataset.resizeHandle)return this;
  if(selector.split(',').includes(this.tagName))return this;
  return this.parent?.closest(selector)||null;
};
function event(type,target,values={}){
  const e=new Event(type,{cancelable:true});
  Object.defineProperty(e,'target',{value:target});
  for(const [key,value] of Object.entries(values))Object.defineProperty(e,key,{value});
  return e;
}
(async()=>{
  const pdf=await PDFDocument.create();pdf.addPage([600,800]);const bytes=await pdf.save();
  for(const nativeTouch of [false,true]){
    const activated=[],moved=[],selected=[];
    const h=harness(2,820,620,{nativeTouch,mouseClickOpens:true,touchTapOpens:false,onActivate:value=>activated.push(value.id),onMove:value=>moved.push(value),onSelect:value=>selected.push(value)});
    try{
      await h.viewer.open(bytes);
      h.viewer.setProject({preferences:{},stencils:{GS1:{kind:'card',shape:'oval'},WC:{kind:'card',shape:'oval'},DA:{kind:'symbol',shape:'square'}},placements:[
        {id:'A',page:1,code:'GS1',stencilId:'GS1',x:.4,y:.4,width:52,height:38,rotation:0,locked:false},
        {id:'B',page:1,code:'WC',stencilId:'WC',x:.6,y:.4,width:52,height:38,rotation:0,locked:false},
        {id:'S',page:1,code:'DA',stencilId:'DA',x:.4,y:.6,width:28,height:28,rotation:0,locked:false}
      ]});
      const scroller=h.get('p2-canvas-scroller'),overlay=h.get('p2-canvas-overlay');
      const targets=Object.fromEntries(['A','B','S'].map(id=>{const node=new Element('g');node.dataset.placementId=id;overlay.append(node);return[id,node];}));
      const blank=new Element('svg');overlay.append(blank);let hit=targets.A;
      h.document.elementFromPoint=()=>hit;
      const pointer=(type,node,pointerType='touch',x=260,y=230,extra={})=>{hit=node;scroller.dispatchEvent(event(type,node,{pointerType,pointerId:1,button:0,clientX:x,clientY:y,shiftKey:false,...extra}));};
      const touch=(type,node,points=[{identifier:1,clientX:260,clientY:230}])=>{hit=node;h.window.dispatchEvent(event(type,node,{changedTouches:points,touches:type==='touchend'?[]:points}));};
      const down=(node,type='touch',extra={})=>nativeTouch&&type==='touch'?touch('touchstart',node):pointer('pointerdown',node,type,260,230,extra);
      const up=(node,type='touch',x=260,y=230,extra={})=>nativeTouch&&type==='touch'?touch('touchend',node,[{identifier:1,clientX:x,clientY:y}]):pointer('pointerup',node,type,x,y,extra);
      const tap=(node,type='touch',extra={})=>{down(node,type,extra);up(node,type,260,230,extra);};
      const reset=()=>{h.viewer.setTool('select');activated.length=0;moved.length=0;selected.length=0;};

      reset();tap(targets.A);
      assert.equal(activated.length,0,'first touch selects without opening');
      assert(selected.some(ids=>ids.includes('A')),'first touch selects the stamp');
      scroller.dispatchEvent(event('click',targets.A));
      assert.equal(activated.length,0,'compatibility click must not open');
      tap(targets.A);assert.deepEqual(activated,['A'],'second touch opens once');

      reset();tap(targets.A);tap(targets.B);assert.equal(activated.length,0,'different stamps do not form a double tap');
      reset();tap(targets.A);await pause(520);tap(targets.A);assert.equal(activated.length,0,'slow taps only select');
      reset();tap(targets.A);tap(blank);tap(targets.A);assert.equal(activated.length,0,'background breaks the pair');
      reset();tap(targets.A);h.window.dispatchEvent(new Event('blur'));tap(targets.A);assert.equal(activated.length,0,'blur cancels the pair');

      for(const type of ['touch','mouse']){
        reset();down(targets.A,type);
        if(nativeTouch&&type==='touch')touch('touchmove',targets.A,[{identifier:1,clientX:290,clientY:245}]);
        else pointer('pointermove',targets.A,type,290,245);
        up(targets.A,type,290,245);
        assert.equal(moved.length,1,'drag moves the stamp');
        assert.equal(activated.length,0,'drag never opens a card');
        if(type==='touch'){tap(targets.A);assert.equal(activated.length,0,'drag breaks the touch pair');}
      }
      reset();down(targets.A);up(targets.A,'touch',275,230);assert.equal(activated.length,0,'release displacement cannot count as a tap without a move event');
      reset();tap(targets.A,'mouse');assert.deepEqual(activated,['A'],'one mouse click opens');
      reset();tap(targets.A,'mouse',{shiftKey:true});assert.equal(activated.length,0,'shift-click remains multi-selection');
      reset();tap(targets.S);tap(targets.S);tap(targets.S,'mouse');assert.equal(activated.length,0,'symbols have no door card');
      reset();scroller.dispatchEvent(event('keydown',targets.A,{key:'Enter',code:'Enter'}));assert.deepEqual(activated,['A'],'keyboard activation remains available');

      reset();tap(targets.A);
      if(nativeTouch){
        touch('touchstart',targets.A,[{identifier:1,clientX:260,clientY:230},{identifier:2,clientX:340,clientY:230}]);
        touch('touchmove',targets.A,[{identifier:1,clientX:240,clientY:230},{identifier:2,clientX:360,clientY:230}]);
        touch('touchend',targets.A,[{identifier:1,clientX:240,clientY:230},{identifier:2,clientX:360,clientY:230}]);
      }else{
        pointer('pointerdown',targets.A,'touch',260,230);pointer('pointerdown',targets.A,'touch',340,230,{pointerId:2});
        pointer('pointermove',targets.A,'touch',360,230,{pointerId:2});
        pointer('pointerup',targets.A,'touch',260,230);pointer('pointerup',targets.A,'touch',360,230,{pointerId:2});
      }
      assert.equal(activated.length,0,'pinch never opens a card');
      tap(targets.A);assert.equal(activated.length,0,'pinch cancels the previous tap');
      assert.deepEqual(h.errors,[]);
    }finally{h.viewer.destroy();}
  }
  console.log('PASS: pointer and native touch paths, single selection/double opening, mouse single click, drag, pinch, cancelled/slow/different taps, symbols, keyboard and compatibility clicks.');
})().catch(error=>{console.error(error);process.exitCode=1;});
