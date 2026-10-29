const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../smartmatch-projektering-v518-data.js'),T=require('../smartmatch-product-times-v513.js'),M=require('../smartmatch-projektering-v518-materials.js'),P=require('../smartmatch-projektering-v518-pdf.js'),I=require('../tillsyno-project-info-v513.js'),X=require('../tillsyno-projection-times-v513.js'),L=require('../vendor/pdf-lib.min.js');
(async()=>{
 const doc=await L.PDFDocument.create();doc.addPage([595,842]);const original=new Uint8Array(await doc.save());
 const state=D.createEmpty('Fem GS2');state.drawing={name:'prov.pdf',pages:P.metadata(doc)};state.project.details=D.projectDetails({facilityNo:'200154'});
 const card=D.createCard('GS2');card.rows.find(r=>r.id==='day-lock').product='212-50';card.rows.find(r=>r.id==='closing-elbow').product='AK';const dt=card.rows.find(r=>r.id==='night-lock');dt.product='222-50';dt.installer='DT';D.updateCard(state,'GS2',card);D.addStencil(state,D.defaultStencil('GS2'));
 for(let i=0;i<5;i++)D.addPlacement(state,{stencilId:'GS2',page:1,x:.15+i*.17,y:.3});
 const product=D.PRODUCTS.find(p=>p.name==='212-50');state.customProducts=[{...product,timeMinutes:22}];
 const report=M.build(state);assert.equal(report.rows.find(r=>r.product==='212-50').quantity,5);assert.equal(report.rows.find(r=>r.product==='212-50').timeMinutes,110);assert.equal(report.rows.find(r=>r.product==='AK').quantity,10);assert(!report.rows.some(r=>r.product==='222-50'));
 const unplaced=D.createCard('GS3');unplaced.rows.find(r=>r.id==='day-lock').product='310-50';D.updateCard(state,'GS3',unplaced);assert(!M.build(state).rows.some(r=>r.product==='310-50'));
 assert.equal(T.get('lock','Ny mekanisk modell').origin,'estimated');assert.equal(T.get('lock','Ny mekanisk modell',{timeMinutes:null}).minutes,6,'blank new-library time uses category estimate');assert.equal(T.get('lock','Ny mikro').minutes,90);assert.equal(T.get('cylinder','Ny cylinder').minutes,6);
 const bytes=await P.build(state,original),info=I.read(await L.PDFDocument.load(bytes),L),snapshot=info.timeConfig.projectionTimes;
 assert.equal(X.resolve({label:'Låshus',value:'212-50'},snapshot).minutes,22);
 assert.equal(X.resolve({label:'Låshus 212-50 GS GS'},snapshot).minutes,22);
 assert.equal(X.resolve({label:'Låshus',value:'212-500'},snapshot).found,false);
 assert.equal(X.resolve({kind:'extra-time',label:'212-50'},snapshot).found,false);
 assert.equal(X.resolve({value:'AK'},snapshot).minutes,19.8);assert.equal(X.resolve({value:'Visningsnamn',originalProductName:'212-50'},snapshot).minutes,22,'display alias retains source time');
 assert.equal(I.merge(info,{timeConfig:{productMinutes:{AK:25}}}).timeConfig.projectionTimes.entries.length,snapshot.entries.length);
 assert.equal(I.merge(info,{timeConfig:{productMinutes:{AK:25}}}).timeConfig.productMinutes.AK,25);
 const reopened=await P.inspect(bytes);assert.equal(M.build(reopened.state).rows.find(r=>r.product==='212-50').quantity,5);
 for(const name of ['smartmatch-main-v513.js','smartmatch-read-main-v513.js']){
 const source=fs.readFileSync(name,'utf8'),start=source.indexOf('function resolveItemMinutes(item){'),end=source.indexOf('function parseDurationInput(',start),ctx=vm.createContext({window:{TillsynoProjectionTimes:X},smartProjectTimeConfig:info.timeConfig,classifyTimeItem:()=>null,projectProductKey:v=>v,canonicalProjectProduct:v=>v,projectProductName:i=>i.value});
 vm.runInContext(source.slice(start,end),ctx);
 assert.equal(vm.runInContext("resolveItemMinutes({label:'Låshus',value:'212-50',minutes:null}).minutes",ctx),22,name);
 assert.equal(vm.runInContext("resolveItemMinutes({label:'Låshus',value:'212-50',minutes:37}).minutes",ctx),37,'manual wins');
 const a=source.indexOf('async function readEmbeddedProjectState('),b=source.indexOf('\n/*',a),openCtx=vm.createContext({window:{TillsynoProjectInfo:I,SmartMatchReadProjectV97:{read:()=>({present:false,payload:null})},SmartMatchSLRTest:{initProject(){}}},PDFLib:L,bytes:bytes.slice(),decodePdfText:()=>'',smartMakeCleanWorkspaceDrawing:async()=>null,console,Uint8Array});vm.runInContext(source.slice(a,b),openCtx);const result=await vm.runInContext('readEmbeddedProjectState()',openCtx);assert.equal(X.resolve({value:'212-50'},(result.state||result).timeConfig.projectionTimes).minutes,22,'actual PDF importer '+name);
 }
 console.log('PASS five positions, no unplaced/DT counting, AK x2, new-product estimates, PDF time snapshot, both actual SmartMatch importers/resolvers and manual override precedence');
})().catch(e=>{console.error(e);process.exitCode=1});
