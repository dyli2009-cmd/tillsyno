const assert=require('node:assert/strict');
const create=require('../smartmatch-drawing-selection-v9-100-31.js');
const s=create(),button={setAttribute(){}};s.bind(button);
assert.equal(button.hidden,true);
let opened=0,deleted=0,valid=true,cleared=0;
const item=key=>({key,label:key,remove:()=>deleted++,valid:()=>valid,clear:()=>cleared++});
s.select(item('check:1'));assert.equal(button.hidden,false);assert.equal(button.disabled,false);
// iOS click events may both have detail=1; mouse's second click may have detail=2.
for(const type of ['mouse','touch','pen']){
 s.resetTap();const event={detail:1,pointerType:type,clientX:20,clientY:20};
 const previous=opened;
 assert.equal(s.activate('check:1',event,()=>opened++,1000),false);
 assert.equal(opened,previous);
 assert.equal(s.activate('check:1',{...event,detail:type==='mouse'?2:1,clientX:22},()=>opened++,1200),true);
 assert.equal(opened,previous+1);
}
s.resetTap();s.activate('check:1',{detail:1},()=>opened++,2000);
assert.equal(s.activate('check:2',{detail:1},()=>opened++,2100),false,'different objects do not open');
assert.equal(s.activate('check:2',{detail:1},()=>opened++,2700),false,'slow taps do not open');
s.resetTap();s.activate('check:1',{detail:1,clientX:0,clientY:0},()=>opened++,3000);
assert.equal(s.activate('check:1',{detail:1,clientX:50,clientY:0},()=>opened++,3100),false,'movement does not open');
assert.equal(s.activate('check:1',{detail:0},()=>opened++,3200),true,'keyboard opens immediately');
s.select(item('gs:2'));assert.equal(cleared,1);s.clear('note:');assert.equal(s.key,'gs:2');
valid=false;s.refresh();assert.equal(button.hidden,true);assert.equal(s.key,'');
(async()=>{
 await s.remove();assert.equal(deleted,0,'stale document cannot be deleted');
 valid=true;s.select(item('note:3'));await s.remove();assert.equal(deleted,1);
 s.clear();assert.equal(button.hidden,true);
 let resolve;let calls=0;s.select({key:'pending',remove:()=>{calls++;return new Promise(r=>resolve=r)}});
 const promise=s.remove();await s.remove();assert.equal(calls,1,'double press cannot delete twice');resolve();await promise;assert.equal(button.disabled,false);
 console.log('PASS: mouse/touch/pen double activation, keyboard, movement, time/identity guards, selection replacement, stale document and delete reentry');
})().catch(e=>{console.error(e);process.exitCode=1});
