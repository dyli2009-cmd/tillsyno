// SLR TEST v36.132 - the five-folder button must NOT open a confirmation popup.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-slr-test-module-v36-132.js'),'utf8');
const s=source.indexOf('const bulkReviewCats='),e=source.indexOf(';',s)+1;
const f=source.indexOf('async function slrMarkFiveReviewed(){'),g=source.indexOf('function slrStartEditing(',f);
assert(s>=0&&e>s&&f>=0&&g>f);
const factory=new Function('ctx','let {item,reviewedFolders,window,loadTemplates,slrDocumentAvailable,announce,labelFor,slrDoorDesignation,slrInvalidate,bridge,draw,slrProgress}=ctx;'+source.slice(s,e)+';'+source.slice(f,g)+'return {run:slrMarkFiveReviewed,cats:bulkReviewCats};');
async function run(missing=[],already=false){
 const reviewedFolders={a:{},b:{'CE-skylt':true}},expected=['Riskanalys','Beskrivning av maskin','Loggbok','Tillverkarens försäkran','Egenkontroll'];
 if(already)expected.forEach(cat=>reviewedFolders.a[cat]=true);
 let saves=0,draws=0,confirms=0;const alerts=[];
 const ctx={item:{id:'a'},reviewedFolders,window:{confirm:()=>{confirms++;throw Error('Popup not permitted');}},loadTemplates:async()=>{},slrDocumentAvailable:(obj,cat)=>!missing.includes(cat),announce:(t,err)=>alerts.push({t,err}),labelFor:cat=>cat,slrDoorDesignation:()=> 'DÖRR A',slrInvalidate:()=>{},bridge:{save:()=>saves++,redraw:()=>{}},draw:()=>draws++,slrProgress:()=>71};
 const api=factory(ctx);assert.deepEqual(api.cats,expected);await api.run();return {reviewedFolders,saves,draws,confirms,alerts,expected};
}
(async()=>{
 const x=await run();assert.equal(x.confirms,0);assert.equal(x.saves,1);assert.equal(x.draws,1);
 x.expected.forEach(cat=>assert.equal(x.reviewedFolders.a[cat],true));
 assert.equal(x.reviewedFolders.a['Produktlista'],undefined);assert.equal(x.reviewedFolders.a['CE-skylt'],undefined);assert.equal(x.reviewedFolders.b['CE-skylt'],true);
 const no=await run(['Loggbok']);assert.equal(no.saves,0);assert.equal(no.reviewedFolders.a['Riskanalys'],undefined);assert.equal(no.alerts[0].err,true);
 const again=await run([],true);assert.equal(again.saves,0);assert.equal(again.confirms,0);
 console.log('PASS SLR v36.132: mark five without popup; only current door, no product/CE changes; missing template atomic; idempotent.');
})().catch(e=>{console.error(e);process.exitCode=1});
