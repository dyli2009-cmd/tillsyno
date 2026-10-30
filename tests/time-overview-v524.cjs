const assert=require('node:assert/strict'),X=require('../smartmatch-project-material-v524.js');
const row={category:'Låshus',component:'Låshus',product:'212-50',quantity:2,minutes:6,sources:[{code:'GS4',rowId:'day-lock',quantity:2,placements:2}]};
const snapshot={version:1,source:'projection',rows:[row,{...row,category:'Armbågskontakt',component:'Armbågskontakt',product:'AK',quantity:4,minutes:19.8,sources:[{code:'GS4',rowId:'',quantity:4,placements:2}]}]};
const positions=[1,2].map(position=>({id:'p'+position,code:'GS4',position,checks:{lock:position===1,ak:position===1,extra:true},items:[{key:'lock',label:'Låshus',value:'212-50 1 GS GS',source:'base'},{key:'ak',label:'Armbågskontakt',value:'AK',quantity:2,source:'base'},...(position===1?[{key:'extra',source:'custom',kind:'extra-time',label:'Krångel',note:'Justering av dörr',minutes:60,quantity:2}]:[])]}));
let report=X.overview(snapshot,positions);assert.equal(report.total,211.2);assert.equal(report.done,165.6);assert.equal(report.extra.length,1);assert.equal(report.extra[0].position,1);assert.equal(report.extra[0].comment,'Justering av dörr');assert.equal(report.unlinked,0);assert.equal(report.progress,78);
assert.equal(X.overview(snapshot,[]).done,0);assert.equal(X.overview(snapshot,[]).unlinked,6);
assert.equal(X.overview({...snapshot,rows:[{...row,minutes:null}]},positions).unknown,2);
assert.equal(X.overview({...snapshot,rows:[{...row,sources:[]}]},positions).rows[0].done,0);
assert.deepEqual(X.validate(JSON.parse(JSON.stringify(X.validate(snapshot)))),X.validate(snapshot));
function element(){return {children:[],dataset:{},style:{},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},setAttribute(){},ownerDocument:{createElement:()=>element()}};}
const root=element();X.render(root,snapshot,String,positions);assert(root.children.filter(e=>e.dataset.group).every(e=>!e.open));
const fs=require('node:fs'),vm=require('node:vm');
(async()=>{for(const file of ['smartmatch-main-v524.js','smartmatch-read-main-v524.js']){
const src=fs.readFileSync(file,'utf8'),a=src.indexOf('async function renderTimeReport(){'),b=src.indexOf('\nasync function openTimeReport()',a),el=Object.fromEntries(['timeRows','timeTotal','timeDone','timeLeft','timeProgress','timeUnknown','timeSummaryText'].map(k=>[k,element()]));
const ctx=vm.createContext({pdf:true,el,smartProjectTimeConfig:{projectionMaterial:snapshot},window:{TillsynoProjectMaterial:X},formatWorkMinutes:String,instances:positions,protocolDef:async()=>({}),effectiveChecks:p=>p.items});vm.runInContext(src.slice(a,b),ctx);await vm.runInContext('renderTimeReport()',ctx);assert.equal(el.timeTotal.textContent,'211.2');assert.equal(el.timeDone.textContent,'165.6');assert.equal(el.timeProgress.textContent,'78%');}
console.log('PASS positions, AK quantities, extra time/comments, unknown and unlinked times, collapsed groups, both app renderers');})().catch(e=>{console.error(e);process.exitCode=1});
