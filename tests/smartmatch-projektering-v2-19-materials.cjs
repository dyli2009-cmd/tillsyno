'use strict';
// Real model and catalogue, actual searchable PDF/CSV, no images or user files.
const assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-19-data.js');
const C=require('../smartmatch-projektering-v2-19-catalog.js');
const M=require('../smartmatch-projektering-v2-19-materials.js');
const PDF=require('../vendor/pdf-lib.min.js');
const pdfjs=require('../vendor/pdf.min.js');
pdfjs.GlobalWorkerOptions.workerSrc=require.resolve('../vendor/pdf.worker.min.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const row=(report,product,component)=>report.rows.find(r=>r.product.toLocaleLowerCase('sv')===product.toLocaleLowerCase('sv')&&(!component||r.component===component));
function fixture(){
 const state=D.createEmpty('Tider från produktregistret');
 state.drawing={name:'Materialtest.pdf',pages:[{width:1000,height:1000,rotation:0,view:[0,0,1000,1000],transform:[1,0,0,-1,0,1000]}]};
 function place(code,id,x){if(!Object.values(state.stencils).some(s=>s.code===code))D.addStencil(state,D.defaultStencil(code));const stencil=Object.values(state.stencils).find(s=>s.code===code);D.addPlacement(state,{id,page:1,stencilId:stencil.id,x,y:.2});}
 place('GS1:1','door-1',.1);place('GS1:1','door-2',.3);place('GS2:1','door-3',.5);place('GS3:1','door-4',.7);place('DTS','excluded-door',.9);
 const one=copy(state.cards['GS1:1']);
 for(const [id,product,quantity]of [['day-lock','310-50',1],['night-lock','STEP 350',1],['day-cylinder-fittings','9565T-2',1],['day-cylinder-hinge','1302',1],['closing-elbow','AK',1],['access-button','AK',1],['closing-closer','dc700',1],['day-cylinder-strike','EXISTING OWN CYLINDER',1]])Object.assign(one.rows.find(r=>r.id===id),{product,quantity});
 D.updateCard(state,'GS1:1',one);
 const two=copy(state.cards['GS2:1']);
 for(const [id,product]of [['day-lock','410-50'],['closing-operator','SW300'],['closing-sensor-hinge','Flatscan']])two.rows.find(r=>r.id===id).product=product;
 D.updateCard(state,'GS2:1',two);
 const three=copy(state.cards['GS3:1']);three.rows.find(r=>r.id==='day-lock').product='DVEL';D.updateCard(state,'GS3:1',three);
 const excluded=copy(state.cards.DTS);Object.assign(excluded.rows.find(r=>r.id==='day-lock'),{product:'310-50',quantity:99});D.updateCard(state,'DTS',excluded);
 D.addPlacement(state,{id:'standalone',page:1,stencilId:'DA',x:.2,y:.8});
 return state;
}
async function pdfText(bytes){const doc=await pdfjs.getDocument({data:bytes.slice(),useSystemFonts:true,disableFontFace:true}).promise;try{const lines=[];for(let n=1;n<=doc.numPages;n++)lines.push((await(await doc.getPage(n)).getTextContent()).items.map(i=>i.str).join(' '));return lines;}finally{await doc.destroy();}}
(async()=>{
 const state=fixture(),before=JSON.stringify(state),report=M.build(state);
 assert.equal(JSON.stringify(state),before,'catalogue suggestions do not mutate saved project or explicit overrides');
 assert.deepEqual(state.preferences.materialTimes,{},'defaults are derived, not silently saved as user overrides');
 assert.equal(row(report,'310-50').quantity,2);assert.equal(row(report,'310-50').timePerUnit,6);assert.equal(row(report,'310-50').timeMinutes,12);assert.equal(row(report,'310-50').timeOrigin,'provided');
 assert(row(report,'310-50').timeNote.includes('B18'),'source cell provenance is retained even without a separate product note');
 assert.equal(row(report,'STEP 350').timePerUnit,90);assert.equal(row(report,'STEP 350').timeOrigin,'estimated');assert(row(report,'STEP 350').timeLowMinutes<=90);assert(row(report,'STEP 350').timeHighMinutes>=90);
 assert.equal(row(report,'AK','Armbågskontakt').quantity,4);assert.equal(row(report,'AK','Armbågskontakt').timePerUnit,19.8);assert.equal(row(report,'AK','Armbågskontakt').timeMinutes,79.2,'contacts multiply quantity once, not the supplied unit rate');
 assert.equal(row(report,'AK','Öppnaknapp').quantity,2);assert.equal(row(report,'AK','Öppnaknapp').timeMinutes,39.6,'button uses its physical quantity');
 assert.equal(row(report,'1302').quantity,2);assert.equal(row(report,'1302').timePerUnit,12);assert.equal(row(report,'1302').timeUnit,'sats','double cylinder kit uses one catalogue set rate');
 assert.equal(row(report,'410-50').timePerUnit,90,'source outlier is preserved exactly');assert.equal(row(report,'410-50').timeRequiresReview,true);
 assert.equal(row(report,'9565T-2').timePerUnit,30);assert.equal(row(report,'9565T-2').timeRequiresReview,true);assert(row(report,'9565T-2').timeNote,'package scope is available to UI/export');
 assert.equal(row(report,'dc700').timePerUnit,30,'exact model matching is case-insensitive');
 assert.equal(row(report,'DVEL').timePerUnit,null);assert.equal(row(report,'DVEL').timeOrigin,'missing','own unlisted product remains explicitly untimed');
 assert.equal(row(report,'EXISTING OWN CYLINDER').timeOrigin,'missing');
 assert.equal(report.totalMinutes,814.8);assert.equal(report.untimedRows,2);assert(report.timeProvidedRows>0);assert(report.timeEstimatedRows>0);assert(report.timeReviewRows>=2);assert.equal(report.timeManualRows,0);
 assert.deepEqual(report.excludedCards,['DTS']);assert(report.rows.every(r=>r.sources.every(s=>s.code!=='DTS')),'DTS products cannot affect quantities or default time');
 assert.equal(D.placementCounts(state).doorAutomation,1,'standalone symbol stays counted in overview');

 const extraState=fixture(),extra=copy(extraState.cards['GS1:1']);
 for(const [id,product,quantity]of [['extra-battery','Batteri',3],['extra-preparation','Förberedelse nattlås',2],['extra-power-supply','Transformator',1]])Object.assign(extra.rows.find(r=>r.id===id),{product,quantity});
 D.updateCard(extraState,'GS1:1',extra);
 const extraReport=M.build(extraState),work=row(extraReport,'Förberedelse nattlås');
 assert.equal(row(extraReport,'Batteri').timePerUnit,60);assert.equal(row(extraReport,'Batteri').quantity,6);assert.equal(row(extraReport,'Transformator').timePerUnit,45);
 assert.equal(work.kind,'work');assert.equal(work.quantity,4);assert.equal(work.timePerUnit,60);assert.equal(work.timeMinutes,240);
 assert.equal(extraReport.totalQuantity,report.totalQuantity+12);assert.equal(extraReport.materialQuantity,report.totalQuantity+8,'labor operations do not become orderable physical materials');
 assert.equal(extraReport.workQuantity,4);assert.equal(extraReport.workRows,1);assert.equal(extraReport.totalMinutes,1504.8,'extra hardware and separate labor both contribute their actual unit times');
 const extraCSV=M.csv(extraReport);assert(extraCSV.includes('"Arbetsmoment";'));assert(extraCSV.includes('"ARBETSMOMENT";"";"";"";"4"'));assert(extraCSV.includes('"SUMMA MATERIAL";"";"";"";"30"'));
 const extraPDF=(await pdfText(await M.pdf(extraReport))).join(' ');assert(extraPDF.includes('Arbetsmoment'));assert(extraPDF.includes('Material 30 st'));assert(extraPDF.includes('inte i materialantalet'));
 const invalidWork=copy(extraReport);row(invalidWork,'Förberedelse nattlås').kind='material';assert.throws(()=>M.csv(invalidWork),/arbetsmoment/,'a labor operation cannot be disguised as orderable material');

 const wrongCategoryState=fixture(),wrongCategoryCard=copy(wrongCategoryState.cards['GS1:1']);
 wrongCategoryCard.rows.find(r=>r.id==='closing-arm').product='TS5000 ECline';D.updateCard(wrongCategoryState,'GS1:1',wrongCategoryCard);
 const categoryBefore=JSON.stringify(wrongCategoryState),wrongCategory=M.build(wrongCategoryState),wrong=row(wrongCategory,'TS5000 ECline');
 assert.equal(JSON.stringify(wrongCategoryState),categoryBefore,'legacy misclassified product is preserved rather than silently moved');
 assert.equal(wrong.timePerUnit,null,'time is never borrowed across mismatched component categories');assert(wrong.categoryWarning);assert.equal(wrongCategory.categoryReviewRows,1);assert(M.reviewSummary(wrongCategory).includes('fel produktkategori'));
 for(const explicit of [0,42]){
  D.setMaterialTime(wrongCategoryState,wrong.key,explicit);const changed=M.build(wrongCategoryState),stillWrong=row(changed,'TS5000 ECline');
  assert.equal(stillWrong.timeOrigin,'manual');assert.equal(stillWrong.timePerUnit,explicit);assert(stillWrong.categoryWarning,'own rate cannot resolve a wrong product category');assert(stillWrong.timeNote.includes(stillWrong.categoryWarning));assert.equal(changed.categoryReviewRows,1);assert(M.reviewSummary(changed).includes('fel produktkategori'));
  const warningCSV=M.csv(changed);assert(warningCSV.includes('Fel kategori'));assert(warningCSV.includes(stillWrong.categoryWarning));
 }
 assert((await pdfText(await M.pdf(M.build(wrongCategoryState)))).join(' ').includes('fel produktkategori'),'category warning also survives manual time into PDF');
 const correctedCategory=copy(wrongCategoryState.cards['GS1:1']);correctedCategory.rows.find(r=>r.id==='closing-arm').product='';correctedCategory.rows.find(r=>r.id==='closing-closer').product='TS5000 ECline';D.updateCard(wrongCategoryState,'GS1:1',correctedCategory);
 const corrected=M.build(wrongCategoryState);assert.equal(row(corrected,'TS5000 ECline').categoryWarning,'');assert.equal(row(corrected,'TS5000 ECline').timePerUnit,30,'correct closer component receives its own catalogue suggestion');assert.equal(corrected.categoryReviewRows,0);

 const key=row(report,'310-50').key,elbowKey=row(report,'AK','Armbågskontakt').key,stepKey=row(report,'STEP 350').key;
 D.setMaterialTime(state,key,0);D.setMaterialTime(state,elbowKey,3.25);D.setMaterialTime(state,stepKey,20);
 const manual=M.build(state);
 assert.equal(row(manual,'310-50').timePerUnit,0);assert.equal(row(manual,'310-50').timeOrigin,'manual','explicit zero overrides catalogue');
 assert.equal(row(manual,'AK','Armbågskontakt').timeMinutes,13);assert.equal(row(manual,'AK','Armbågskontakt').timeOrigin,'manual');assert.equal(row(manual,'AK','Öppnaknapp').timePerUnit,19.8,'component-specific override does not overwrite other physical-product row');
 assert.equal(row(manual,'STEP 350').timePerUnit,20);assert.equal(manual.totalMinutes,596.6);assert.equal(manual.timeManualRows,3);
 assert.deepEqual(M.build(D.validate(copy(state))).rows,manual.rows,'saved manual values and catalogue defaults survive validated project roundtrip');
 D.setMaterialTime(state,key,null);assert.equal(row(M.build(state),'310-50').timePerUnit,6,'resetting override restores the catalogue suggestion');
 const outlierKey=row(report,'410-50').key;D.setMaterialTime(state,outlierKey,15);
 assert.equal(row(M.build(state),'410-50').timeOrigin,'manual');assert.equal(row(M.build(state),'410-50').timeRequiresReview,false,'deliberate user rate supersedes a default time-review flag');
 D.setMaterialTime(state,M.materialKey('lock','DVEL'),0);assert.equal(row(M.build(state),'DVEL').timeOrigin,'manual','unlisted product may have a user rate, including zero');

 const original=fixture(),duplicate=D.duplicatePlacements(original,['door-1'])[0],added=M.build(original);
 assert.equal(row(added,'310-50').quantity,3);assert.equal(row(added,'AK','Armbågskontakt').quantity,6);assert.equal(row(added,'AK','Armbågskontakt').timeMinutes,118.8);
 D.removePlacements(original,[duplicate.id]);assert.deepEqual(M.build(original).rows,report.rows,'removing the copied physical door restores exact quantities and times');
 const filtered=M.summarize(report,report.rows.filter(r=>r.timeOrigin==='estimated'));
 assert.equal(filtered.timeEstimatedRows,filtered.rows.length);assert.equal(filtered.timeProvidedRows,0);assert.equal(filtered.timeManualRows,0);assert.equal(filtered.totalMinutes,report.rows.filter(r=>r.timeOrigin==='estimated').reduce((n,r)=>n+r.timeMinutes,0));

 const csv=M.csv(report);assert(csv.startsWith('\ufeff'));assert(csv.includes('Tidskälla'));assert(csv.includes('Din tidsfil'));assert(csv.includes('Uppskattning'));assert(csv.includes('Kontrollera'));assert(csv.includes('19,8'));assert(!csv.includes('DTS'));
 const manualCSV=M.csv(manual);assert(manualCSV.includes('Egen tid'));assert(manualCSV.includes('"0";"0"'));
 const bytes=await M.pdf(report),doc=await PDF.PDFDocument.load(bytes),pages=await pdfText(bytes),text=pages.join(' ');
 assert.equal(doc.getPage(0).getWidth(),842);assert(text.includes('Material och tid'));assert(text.includes('Din tidsfil'));assert(text.includes('Uppskattning'));assert(text.includes('behöver kontroll'));assert(text.includes('410-50'));assert(text.includes('9565T-2'));assert(!text.includes('DTS'));
 assert(text.includes('Endast placerade GS-dörrkort.'));assert(text.includes('Tid saknas för 2 produktrader.'));
 const bad=copy(report);bad.rows[0].timeOrigin='manufacturer-standard';assert.throws(()=>M.csv(bad),/tidskälla/);
 const badCount=copy(report);badCount.timeProvidedRows++;assert.throws(()=>M.csv(badCount),/tidsunderlag/);
 const badSource=copy(report);badSource.rows[0].sources[0].code='DTS';assert.throws(()=>M.csv(badSource),/GS-dörrkort/);
 const oldReport=M.summarize({projectName:'Äldre rapport',rows:[{category:'Låshus',component:'Låshus',product:'Egen',quantity:1,sources:[{kind:'card',code:'GS1:1',quantity:1}],timePerUnit:0}],unresolved:[],unplacedCards:[]});
 assert.equal(oldReport.timeManualRows,1);assert(M.csv(oldReport).includes('Egen tid'),'report helper remains compatible with already supplied manual reports');
 assert(C.getTime('lock','310-50'),'tests use the actual bundled catalogue');
 console.log('PASS materials2.19: catalogue source/estimate defaults, explicit-zero/manual priority and reset, GS-only physical quantity factors, unchanged persisted data, review flags/units, searchable PDF/CSV provenance and rejected invalid exports.');
})().catch(error=>{console.error(error);process.exitCode=1;});
