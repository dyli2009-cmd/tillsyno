'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {create,formatDuration}=require('../smartmatch-read-progress-v9-1.js');

function fixture(){
 let time=0,nextId=0;
 const timers=new Map(),cleared=[],updates=[];
 const tracker=create({
  now:()=>time,
  setInterval(callback,delay){assert.equal(delay,1000);const id=++nextId;timers.set(id,callback);return id;},
  clearInterval(id){cleared.push(id);timers.delete(id);},
  onUpdate:value=>updates.push(value)
 });
 return {tracker,timers,cleared,updates,at(value){time=value;},tick(value){time=value;for(const callback of [...timers.values()])callback();}};
}

{
 const {tracker,timers,updates,at,tick}=fixture();
 assert.equal(tracker.snapshot().state,'idle');
 assert.equal(tracker.snapshot().percent,null);
 assert.equal(tracker.update({phase:'ignored'}).phase,'');
 tracker.start('Läser dörrkort');
 assert.equal(timers.size,1);
 tracker.update({phase:'codes',label:'Läser markerade kodfält',page:6,pageIndex:0,pageCount:8,unit:'sidor',done:0,total:8});
 assert.equal(tracker.snapshot().percent,0);
 assert.equal(tracker.snapshot().remainingMs,null);
 at(2000);tracker.update({done:1,page:7});
 assert.equal(tracker.snapshot().remainingMs,null,'one completed page cannot establish a useful estimate');
 at(4000);tracker.update({done:2,page:8});
 const value=tracker.snapshot();
 assert.equal(value.percent,25);
 assert.equal(value.remainingMs,12000,'two observed completed pages provide a phase estimate');
 assert.equal(value.elapsedMs,4000);
 const previousUpdates=updates.length;
 tick(5000);
 assert.equal(updates.length,previousUpdates+1,'elapsed time updates while OCR awaits a promise');
 assert.equal(updates.at(-1).elapsedMs,5000);
 assert.equal(updates.at(-1).remainingMs,15000,'a stalled phase does not count down to a false zero');
 assert.equal(value.elapsedMs,4000,'previous emitted snapshots are not mutated');
 assert(Object.isFrozen(value));
 tracker.finish({state:'done',message:'Koderna är lästa'});
 assert.equal(timers.size,0);
 at(10000);
 assert.equal(tracker.snapshot().elapsedMs,5000,'finish preserves elapsed time');
 assert.equal(tracker.snapshot().percent,25,'finishing never invents total-operation 100%');
 assert.equal(tracker.snapshot().remainingMs,null);
 assert.equal(tracker.snapshot().message,'Koderna är lästa');
 const stoppedUpdates=updates.length;
 tracker.update({phase:'stale',done:8,total:8});
 assert.equal(updates.length,stoppedUpdates,'late worker messages cannot restart or change a finished run');
 assert.equal(tracker.snapshot().phase,'codes');
 tracker.reset();
 assert.equal(tracker.snapshot().state,'idle');
 assert.equal(tracker.snapshot().elapsedMs,0);
 assert.equal(tracker.snapshot().percent,null);
}

{
 const {tracker,at}=fixture();
 tracker.start();
 tracker.update({phase:'drawing-ocr',scope:'page-1',unit:'bildområden',done:0,total:10,page:1,localPercent:0});
 at(1000);tracker.update({localPercent:95});
 assert.equal(tracker.snapshot().percent,0,'internal OCR percentages are never whole-phase progress');
 assert.equal(tracker.snapshot().localPercent,95);
 assert.equal(tracker.snapshot().remainingMs,null,'OCR logger ticks are not completed comparable units');
 at(2000);tracker.update({done:1});
 assert.equal(tracker.snapshot().localPercent,null,'completed units clear stale per-unit OCR progress');
 at(4000);tracker.update({done:2});
 assert.equal(tracker.snapshot().remainingMs,16000);
 at(5000);tracker.update({scope:'page-2',done:0,page:2});
 assert.equal(tracker.snapshot().remainingMs,null,'the next drawing page starts a fresh tile-time sample');
 at(6000);tracker.update({done:1});
 assert.equal(tracker.snapshot().remainingMs,null);
 at(7000);tracker.update({done:2});
 assert.equal(tracker.snapshot().remainingMs,8000);
 tracker.update({total:20});
 assert.equal(tracker.snapshot().remainingMs,null,'a changed amount of work invalidates the old estimate');
 at(8000);tracker.update({done:3});
 at(9000);tracker.update({done:4});
 assert.equal(tracker.snapshot().remainingMs,16000);
 tracker.update({done:0});
 assert.equal(tracker.snapshot().remainingMs,null,'a restarted count cannot reuse prior completed units');
 tracker.update({phase:'linking',label:'Kopplar beteckningar'});
 const next=tracker.snapshot();
 assert.equal(next.elapsedMs,9000,'the operation clock survives phase changes');
 assert.equal(next.page,null);assert.equal(next.pageCount,null);assert.equal(next.unit,'');
 assert.equal(next.percent,null);assert.equal(next.remainingMs,null);assert.equal(next.localPercent,null);
 tracker.finish();
}

{
 const {tracker,at}=fixture();
 tracker.start();
 // A caller joining an already running count has not timed its first units.
 tracker.update({phase:'text',unit:'sidor',done:10,total:20});
 assert.equal(tracker.snapshot().remainingMs,null);
 at(1000);tracker.update({done:11});
 assert.equal(tracker.snapshot().remainingMs,null);
 at(2000);tracker.update({done:12});
 assert.equal(tracker.snapshot().remainingMs,8000);
 tracker.update({done:20});
 assert.equal(tracker.snapshot().percent,100);
 assert.equal(tracker.snapshot().remainingMs,0,'a completed current phase has no units left');
 tracker.update({phase:'save',label:'Sparar PDF'});
 assert.equal(tracker.snapshot().percent,null,'saving remains indeterminate unless the writer provides real counts');
 assert.equal(tracker.snapshot().elapsedMs,2000);
 tracker.finish();
}

for(const state of ['error','cancelled']){
 const {tracker,timers,at,updates}=fixture();
 tracker.start();tracker.update({phase:'images',done:1,total:6,unit:'bildområden',localPercent:82});
 const staleTimer=[...timers.values()][0];
 at(1200);tracker.finish({state,message:state==='error'?'Filen kunde inte läsas':'Avbruten av användaren'});
 assert.equal(timers.size,0);
 assert.equal(tracker.snapshot().state,state);
 assert(Math.abs(tracker.snapshot().percent-100/6)<1e-10);
 assert.equal(tracker.snapshot().localPercent,null);
 assert.equal(tracker.snapshot().remainingMs,null);
 const count=updates.length;staleTimer();
 assert.equal(updates.length,count,'a queued old interval cannot emit after finish');
 tracker.update({done:6});
 assert.equal(tracker.snapshot().done,1);
 assert.throws(()=>tracker.finish({state:'unsupported'}),RangeError);
 tracker.start('Nytt försök');
 staleTimer();
 assert.equal(timers.size,1,'a new run owns just one timer');
 assert.equal(tracker.snapshot().title,'Nytt försök');
 assert.equal(tracker.snapshot().elapsedMs,0);
 tracker.reset();
 assert.equal(timers.size,0);
}

{
 const {tracker,timers,at}=fixture();
 tracker.start();const oldTimer=[...timers.values()][0];
 at(4000);tracker.start('Ersatt körning');
 assert.equal(timers.size,1,'starting again clears the earlier interval');
 tracker.update({phase:'cards',unit:'kort',done:0,total:4,page:0,pageIndex:0});
 at(5000);tracker.update({done:2});
 assert.equal(tracker.snapshot().remainingMs,1000);
 at(4500);oldTimer();
 assert.equal(tracker.snapshot().elapsedMs,1000,'a backwards clock cannot reduce elapsed time');
 tracker.update({total:0,localPercent:NaN});
 assert.equal(tracker.snapshot().percent,null,'zero total is unknown, not an empty completed job');
 assert.equal(tracker.snapshot().remainingMs,null);
 assert.equal(tracker.snapshot().page,null,'PDF page numbers are one based');
 assert.equal(tracker.snapshot().pageIndex,0,'a list index may be zero based');
 tracker.update({done:-1,total:Infinity});
 assert.equal(tracker.snapshot().done,null);assert.equal(tracker.snapshot().total,null);
 tracker.update({done:6,total:4});
 assert.equal(tracker.snapshot().percent,null,'inconsistent counts never yield a false complete meter');
 assert.equal(tracker.snapshot().remainingMs,null);
 tracker.reset();
}

assert.equal(formatDuration(0),'0 s');
assert.equal(formatDuration(4500),'5 s');
assert.equal(formatDuration(59000),'59 s');
assert.equal(formatDuration(60000),'1 min');
assert.equal(formatDuration(65100),'1 min 5 s');
assert.equal(formatDuration(3661000),'1 tim 1 min');
assert.equal(formatDuration(null),'—');
assert.equal(formatDuration(Infinity),'—');
assert.equal(formatDuration(-1000),'—');

const browser={window:{performance:{now:()=>0},setInterval:()=>1,clearInterval:()=>{}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../smartmatch-read-progress-v9-1.js'),'utf8'),browser);
assert.equal(typeof browser.window.SmartMatchReadProgressV91.create,'function','the same isolated file exposes a browser API');
assert.equal(browser.window.SmartMatchReadProgressV91.formatDuration(1000),'1 s');

console.log('PASS TEST 9.1 progress: phase counts, independent OCR progress, observed-unit estimates, live elapsed time, scope resets, finish/cancel/error cleanup and browser export');
