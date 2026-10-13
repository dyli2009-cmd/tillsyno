// Isolated SLR bulk-approval regression test for v36.131.
// Run with: node tests/slr-bulk-five-v36-131.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-slr-test-module-v36-131.js'),'utf8');
const start=source.indexOf('const bulkReviewCats='),finish=source.indexOf(';',start)+1;
const a=source.indexOf('async function slrMarkFiveReviewed(){'),b=source.indexOf('function slrStartEditing(',a);
assert(start>=0&&finish>start&&a>=0&&b>a);
const script=source.slice(start,finish)+'\n'+source.slice(a,b);
const target=['Riskanalys','Beskrivning av maskin','Loggbok','Tillverkarens försäkran','Egenkontroll'];
async function run({confirm=true,missing=[],already=false}={}){
 const reviewedFolders={first:{},second:{'CE-skylt':true}},item={id:'first'};
 if(already)for(const cat of target)reviewedFolders.first[cat]=true;
 let calls=0,redraws=0,refreshes=0,question='',messages=[];
 const ctx={item,reviewedFolders,window:{confirm:q=>(question=q,confirm)},loadTemplates:async()=>{},
  slrDocumentAvailable:(obj,cat)=>!missing.includes(cat),announce:(t,e)=>messages.push([t,e]),
  labelFor:cat=>cat,slrDoorDesignation:()=> 'DOOR-1',slrInvalidate:()=>{},
  bridge:{save:()=>calls++,redraw:()=>redraws++},draw:()=>refreshes++,slrProgress:()=>71};
 const call=new Function('ctx','const {item,reviewedFolders,window,loadTemplates,slrDocumentAvailable,announce,labelFor,slrDoorDesignation,slrInvalidate,bridge,draw,slrProgress}=ctx;\n'+script+'\nreturn {cats:bulkReviewCats,run:slrMarkFiveReviewed};')(ctx);
 await call.run();
 return {ctx,question,messages,calls,redraws,refreshes,cats:call.cats};
}
(async()=>{
 const yes=await run();
 assert.deepEqual(yes.cats,target);
 assert.deepEqual(target.map(k=>yes.ctx.reviewedFolders.first[k]),[true,true,true,true,true]);
 assert.equal(yes.ctx.reviewedFolders.first['Produktlista'],undefined);
 assert.equal(yes.ctx.reviewedFolders.first['CE-skylt'],undefined);
 assert.equal(yes.ctx.reviewedFolders.second['CE-skylt'],true);
 assert.equal(yes.calls,1);assert.equal(yes.redraws,1);assert.equal(yes.refreshes,1);
 assert(yes.question.includes('DOOR-1'));assert(yes.question.includes('CE-skylt ändras inte'));
 const declined=await run({confirm:false});assert.equal(declined.calls,0);
 assert.equal(declined.ctx.reviewedFolders.first['Riskanalys'],undefined);
 const blocked=await run({missing:['Loggbok']});assert.equal(blocked.calls,0);
 assert.equal(blocked.ctx.reviewedFolders.first['Riskanalys'],undefined);
 assert.equal(blocked.messages[0][1],true);
 const done=await run({already:true});assert.equal(done.calls,0);assert.equal(done.question,'');
 console.log('PASS v36.131: 5 selected folders only; one door; confirmation, cancellation, missing template, already checked; product list and CE plate unaffected.');
})().catch(e=>{console.error(e);process.exitCode=1});
