const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../smartmatch-projektering-v517-data.js'),P=require('../smartmatch-projektering-v517-pdf.js'),Lib=require('../smartmatch-projektering-v517-library.js'),PDF=require('../vendor/pdf-lib.min.js');
(async()=>{
 const doc=await PDF.PDFDocument.create();doc.addPage([595,842]);const bytes=await doc.save();
 for(const number of ['HUS-A','Åby 7/Entré','12345678901234567890','Hus A: dörr #2']){
 const state=D.createEmpty();state.drawing={name:'test.pdf',pages:P.metadata(doc)};
 const stencil=D.addObjectStencil(state,number,'45');assert.equal(stencil.objectNumber,number);
 assert.doesNotThrow(()=>Lib.groupFor(Lib.createDefault(),stencil));
 const first=D.addPlacement(state,{stencilId:stencil.id,page:1,x:.3,y:.3});assert.equal(first.code,number+'-45-1');
 D.ensureCard(state,'GS1:1');D.upgradeRestroomStencils(state);
 for(const editableText of [true,false]){
 const opened=await P.inspect(await P.build(state,bytes,{editableText}));assert.equal(opened.state.placements[0].code,first.code);
 assert.equal(D.addPlacement(opened.state,{stencilId:stencil.id,page:1,x:.7,y:.7}).code,number+'-45-2');
 }
 const source=fs.readFileSync('smartmatch-projektering-v514.js','utf8');const start=source.indexOf('  function updateObjectPreview()'),end=source.indexOf('  async function saveObjectTemplate()',start);
 const fields={objectNumber510:{value:number},objectModel510:{value:'45'},objectMarking514:{},objectModelName514:{}};
 const context=vm.createContext({state,Proj2AutomationModels:require('../smartmatch-automation-models-v512.js'),$:id=>fields[id]});vm.runInContext(source.slice(start,end)+';updateObjectPreview()',context);
 assert.equal(fields.objectMarking514.textContent,number+'-45-2');fields.objectModel510.value='11';vm.runInContext('updateObjectPreview()',context);assert.equal(fields.objectMarking514.textContent,number+'-11-1');assert.equal(fields.objectNumber510.value,number);
 }
 assert.throws(()=>D.normalizeCode('Åby 7/Entré'));
 console.log('PASS text object IDs, long numbers, punctuation, library grouping, unrelated GS cards, PDF modes, automatic live preview and next serial');
})().catch(e=>{console.error(e);process.exitCode=1});
