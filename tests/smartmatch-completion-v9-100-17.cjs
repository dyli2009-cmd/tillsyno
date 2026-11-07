const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const W=require('../smartmatch-work-completion-v9-100-17.js'),X=require('../smartmatch-project-material-v525.js');
const source=fs.readFileSync('smartmatch-read-main-v524.js','utf8');
function extract(start,end){const a=source.indexOf(start);assert(a>=0,start);const b=source.indexOf(end,a+start.length);assert(b>a,end);return source.slice(a,b);}
const sensor={key:'sensor',label:'Sensorer',value:'FlatScan',source:'base',responsibility:'GS',quantity:2,minutes:40};
const o={id:'door1',code:'G8',checks:{},rowStages:{},items:[sensor]};
for(const label of ['Armbågskontakter','Armbågskontakt','Sensor','Sensorer','Rökdetektor'])assert(W.split({...sensor,label,value:''}),label);
for(const label of ['Låshus','Slutbleck','Sensor utsida','Rökdetektor insida'])assert(!W.split({...sensor,label,value:''}),label);
assert.equal(W.fraction(o,sensor),0);W.setSide(o,sensor,'outside',true);assert.equal(W.fraction(o,sensor),.5);assert.equal(o.checks.sensor,false);
W.setSide(o,sensor,'inside',true);assert.equal(o.checks.sensor,true);W.setSide(o,sensor,'outside',false);assert.equal(W.fraction(o,sensor),.5);assert.equal(o.checks.sensor,false);
W.setDone(o,sensor,true);assert.deepEqual(W.sides(o,sensor),{outside:true,inside:true});W.setDone(o,sensor,false);assert.equal(W.fraction(o,sensor),0);
const old={checks:{sensor:true}};assert.deepEqual(W.sides(old,sensor),{outside:true,inside:true});W.setSide(old,sensor,'inside',false);assert.equal(W.fraction(old,sensor),.5);
const ctx=vm.createContext({workCompletion:W,window:{},protocolDef:async()=>({checks:[sensor]}),effectiveChecks:o=>o.items,resolveItemMinutes:i=>({minutes:i.minutes}),workQuantity:i=>i.quantity||1,isProjectMaterialItem:()=>true,protocolMap:{G8:2}});
vm.runInContext(extract('async function recalc(o){','function readWorkState'),ctx);
vm.runInContext(extract('async function calculateDoorTime(','async function calculateTimeReport'),ctx);
(async()=>{
 W.setSide(o,sensor,'outside',true);await ctx.recalc(o);assert.equal(o.doneMinutes,40);assert.equal(o.estimatedMinutes,80);assert.equal(o.progress,50);assert(o.workStarted);
 const door=await ctx.calculateDoorTime(o);assert.equal(door.doneMinutes,40);assert.equal(door.doneItemCount,0);assert.equal(door.progress,50);
 const saved=JSON.parse(JSON.stringify(o));assert.equal(W.fraction(saved,sensor),.5);assert.equal(saved.checks.sensor,false);
 // Run the actual exported project payload and reconstruction, not just a mock serializer.
 const persistence=vm.createContext({window:{SmartMatchStampTools:{normalize:()=>[]}},textChecks:[],pdf:{numPages:2},automationItems:[],embeddedState:{},manualPositions:[],positionEdits:{},ignoredCodes:new Set(),labManualLinks:{},smartCheckReadMode:'GS',smartCheckReadTerm:'',smartProjectTimeConfig:{},projectArticleTimeCatalog:()=>[],materialLibraryCatalog:()=>[],appMaterialLibrary:()=>({categories:[]}),projectId:'qa',fileKey:'qa',currentFileName:'test.pdf',drawingNotes:[],projectMeta:{},normalizeProjectMeta:x=>x,projectLogoData:'',smartConfirmedOcr:[],instances:[{...o,overrides:{sensor:{note:'Insida återstår'}}}],stamps:[{code:'G8',page:1,rect:[0,0,10,10],positionId:o.id}],projectStamps:[],isolateAutomationItems:x=>x,pmCounts:()=>{}});
 vm.runInContext(extract('function makeProjectPayload(){','function loadSaved(){'),persistence);
 const payload=JSON.parse(JSON.stringify(persistence.makeProjectPayload()));
 persistence.loadSaved=()=>payload;vm.runInContext(extract('function buildInstances(){','async function recalc(o){'),persistence);persistence.buildInstances();
 assert.equal(W.fraction(persistence.instances[0],sensor),.5);assert.equal(persistence.instances[0].overrides.sensor.note,'Insida återstår');
 const second={...o,id:'door2',checks:{},rowStages:{}};await ctx.recalc(second);assert.equal(second.doneMinutes,0);assert.equal(o.doneMinutes,40);
 const snapshot={version:1,source:'scan',rows:[{category:'Sensorer',component:'Sensorer',product:'FlatScan',quantity:4,minutes:40}]};
 const positions=[o,second].map(p=>({...p,items:p.items.map(i=>({...i,resolvedMinutes:i.minutes,completionFraction:W.fraction(p,i)}))}));
 let report=X.overview(snapshot,positions);assert.equal(report.total,160);assert.equal(report.done,40);assert.equal(report.left,120);assert.equal(report.progress,25);
 const custom={...sensor,source:'custom'};report=X.overview({version:1,source:"scan",rows:[]},[{...o,items:[{...custom,completionFraction:.5,resolvedMinutes:30}]}]);assert.equal(report.total,60);assert.equal(report.done,30);assert.equal(report.extra[0].done,false);
 sensor.minutes=null;await ctx.recalc(o);assert.equal(o.doneMinutes,0);assert.equal(o.progress,50);assert.equal(o.unknownTimeCount,2);
 W.setSide(o,sensor,'inside',true);await ctx.recalc(o);assert.equal(o.progress,100);
 W.setDone(o,sensor,false);await ctx.recalc(o);assert.equal(o.progress,0);assert.equal(W.fraction(o,sensor),0);
 console.log('PASS: sides, legacy completion, reversals, full mark/clear, half time × quantity, unknown time, project report, custom rows, state roundtrip and separate G8 positions');
})().catch(e=>{console.error(e);process.exitCode=1});
