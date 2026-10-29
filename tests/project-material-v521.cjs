const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../smartmatch-projektering-v519-data.js'),M=require('../smartmatch-projektering-v519-materials.js'),P=require('../smartmatch-projektering-v519-pdf.js'),PDF=require('../vendor/pdf-lib.min.js'),X=require('../smartmatch-project-material-v521.js'),T=require('../tillsyno-projection-times-v513.js');
(async()=>{
 const pdf=await PDF.PDFDocument.create();pdf.addPage([595,842]);const state=D.createEmpty(),card=D.createCard('GS4');
 Object.assign(card.rows.find(r=>r.id==='day-lock'),{product:'212-50',quantity:1});Object.assign(card.rows.find(r=>r.id==='closing-elbow'),{product:'AK'});Object.assign(card.rows.find(r=>r.id==='night-lock'),{product:'222-50',installer:'DT'});
 D.updateCard(state,'GS4',card);D.addStencil(state,D.defaultStencil('GS4'));state.drawing={name:'prov.pdf',pages:P.metadata(pdf)};for(const x of [.3,.7])D.addPlacement(state,{stencilId:'GS4',page:1,x,y:.4});
 const unplaced=D.createCard('GS9');unplaced.rows[0].product='310-50';D.updateCard(state,'GS9',unplaced);
 const bytes=await P.build(state,await pdf.save()),doc=await PDF.PDFDocument.load(bytes),snapshot=X.read(doc,PDF,M);assert.equal(snapshot.rows.length,2);assert.equal(snapshot.rows.find(r=>r.product==='212-50').quantity,2);assert.equal(snapshot.rows.find(r=>r.product==='AK').quantity,4);assert.equal(X.totals(snapshot).total,91.2);assert(!snapshot.rows.some(r=>r.product==='222-50'||r.product==='310-50'));assert.equal(X.read(pdf,PDF,M),null);
 function element(){return {children:[],append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},ownerDocument:{createElement:()=>element()}};}
 for(const file of ['smartmatch-main-v521.js','smartmatch-read-main-v521.js']){
  const source=fs.readFileSync(file,'utf8'),a=source.indexOf('async function renderTimeReport(){'),b=source.indexOf('\nasync function openTimeReport()',a),el={timeRows:element(),timeTotal:element(),timeUnknown:element(),timeSummaryText:element()};
  const context=vm.createContext({pdf:true,el,smartProjectTimeConfig:{projectionMaterial:snapshot},window:{TillsynoProjectMaterial:X,TillsynoProjectionTimes:T},formatWorkMinutes:n=>String(n),instances:[]});vm.runInContext(source.slice(a,b),context);await vm.runInContext('renderTimeReport()',context);assert.equal(el.timeTotal.textContent,'91.2');assert.equal(el.timeRows.children.length,new Set(snapshot.rows.map(r=>r.category)).size);
  context.smartProjectTimeConfig={};context.instances=[{code:'GS4'}];context.protocolDef=async()=>({});context.effectiveChecks=()=>[{label:'Låshus',value:'212-50',responsibility:'GS',quantity:2,minutes:6},{label:'Slutbleck',value:'Saknar PDF-tid',responsibility:'GS'},{label:'Trycke',value:'DT',responsibility:'DT'},{label:'Egen produkt',value:'Extra',source:'custom',responsibility:'GS',minutes:999}];await vm.runInContext('renderTimeReport()',context);assert.equal(el.timeTotal.textContent,'12');assert.equal(el.timeUnknown.textContent,'1');
 }
 const saved={version:1,source:'projection',rows:snapshot.rows};assert.deepEqual(X.validate(JSON.parse(JSON.stringify(saved))),snapshot);
 console.log('PASS actual PDF material only; positioned GS quantity, AK x2 once, DT/unplaced/catalog exclusion, same categories and times in both apps, missing-time fallback and persistence');
})().catch(e=>{console.error(e);process.exitCode=1});
