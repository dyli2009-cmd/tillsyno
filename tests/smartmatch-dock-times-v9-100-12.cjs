const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const X=require('../smartmatch-project-material-v525.js');
const row={category:'Låshus',component:'Låshus',product:'350',quantity:4,minutes:10,sources:[{code:'G8',label:'Låshus',quantity:4,placements:4}]};
const saved={version:1,source:'projection',rows:[row]};
const positions=Array.from({length:4},(_,i)=>({id:'p'+i,code:'G8',checks:{lock:i<2},items:[{key:'lock',label:'Låshus',value:'350',responsibility:'GS',source:'base',quantity:1,minutes:20,resolvedMinutes:20}]}));
let report=X.overview(saved,positions);
assert.equal(report.total,80);assert.equal(report.done,40);assert.equal(report.left,40);assert.equal(report.unlinked,0);
positions[0].items[0].resolvedMinutes=0;assert.equal(X.overview(saved,positions).total,60);
positions[0].items[0].resolvedMinutes=null;report=X.overview(saved,positions);assert.equal(report.total,60);assert.equal(report.unknown,1);
positions[0].items[0].resolvedMinutes=20;
const pair={version:1,source:'projection',rows:[{...row,quantity:8,timeQuantity:4,timeUnit:'par',sources:[{code:'G8',label:'Låshus',quantity:8,placements:4}]}]};
assert.equal(X.overview(pair,positions).total,80); // four pairs, never eight full pair times
const packageSnapshot={version:1,source:'projection',rows:[{...row,sources:[{code:'G8',quantity:4,placements:4,package:true,requirements:[{label:'Låshus',product:'350'}]}]}]};
assert.equal(X.overview(packageSnapshot,positions).total,40); // preserve explicit package rates
assert.equal(X.overview(saved,[]).total,40);assert.equal(X.overview(saved,[]).unlinked,4);
assert.equal(saved.rows[0].minutes,10); // reports never mutate the embedded PDF snapshot
function element(){return {children:[],dataset:{},style:{},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},setAttribute(){},ownerDocument:{createElement:()=>element()}};}
async function renderer(snapshot,ps){
 const src=fs.readFileSync('smartmatch-read-main-v524.js','utf8'),a=src.indexOf('async function renderTimeReport(){'),b=src.indexOf('\nasync function openTimeReport()',a);
 const el=Object.fromEntries(['timeRows','timeTotal','timeDone','timeLeft','timeProgress','timeUnknown','timeSummaryText'].map(k=>[k,element()]));
 const ctx=vm.createContext({workCompletion:require("../smartmatch-work-completion-v9-100-17.js"),pdf:true,el,smartProjectTimeConfig:{projectionMaterial:snapshot},window:{TillsynoProjectMaterial:X},formatWorkMinutes:String,instances:ps,protocolDef:async()=>({}),effectiveChecks:(p,def)=>def?p.items:[],resolveItemMinutes:item=>({source:'item',minutes:item.minutes})});
 vm.runInContext(src.slice(a,b),ctx);await vm.runInContext('renderTimeReport()',ctx);return el;
}
(async()=>{
 assert.equal((await renderer(saved,positions)).timeTotal.textContent,'80');
 const scan={...saved,source:'scan'};
 assert.equal((await renderer(scan,positions)).timeTotal.textContent,'80');
 const five=[...positions,{...positions[0],id:'p5'}];assert.equal((await renderer(scan,five)).timeTotal.textContent,'100');
 const qty=positions.map(p=>({...p,items:p.items.map(i=>({...i,quantity:2}))}));assert.equal((await renderer(scan,qty)).timeTotal.textContent,'160');
 console.log('PASS: four G8, live card rates, zero/missing times, done/left, pairs, packages, unlinked rows, immutable snapshots, scan quantities and real renderer');
})().catch(e=>{console.error(e);process.exitCode=1});
