'use strict';
// Arithmetic and searchable text only. No images, screenshots or user documents.
const assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-13-data.js');
const M=require('../smartmatch-projektering-v2-14-materials.js');
const lib=require('../vendor/pdf-lib.min.js');
const pdfjs=require('../vendor/pdf.min.js');
pdfjs.GlobalWorkerOptions.workerSrc=require.resolve('../vendor/pdf.worker.min.js');
function fixture(){
 const state=D.createEmpty('Materialprov'),sheet={width:1000,height:1000,rotation:0,view:[0,0,1000,1000],transform:[1,0,0,-1,0,1000]};
 state.drawing={name:'Genererat testunderlag.pdf',pages:[sheet,{...sheet,view:[...sheet.view],transform:[...sheet.transform]}]};
 for(const code of ['GS1','GS2','GS3'])D.addStencil(state,D.defaultStencil(code));
 D.addPlacement(state,{id:'GS1-A',page:1,stencilId:'GS1',x:.2,y:.2});D.addPlacement(state,{id:'GS1-B',page:2,stencilId:'GS1',x:.4,y:.4});
 const card=D.clone(state.cards.GS1);
 for(const [id,product,quantity]of [
  ['day-lock','ST140-50',1],['night-lock',' st140-50 ',2],['day-cylinder-fittings','256',1],
  ['day-cylinder-hinge','8882',1],['day-cylinder-strike','8882',1],['night-cylinder-strike','8882',2],
  ['closing-elbow','JCK207',1],['access-button','JCK207',1],['closing-sensor-hinge','Flatscan',1],
  ['closing-sensor-strike','Flatscan',1],['closing-operator','SW300',1],['closing-closer','TS83',1]
 ])Object.assign(card.rows.find(row=>row.id===id),{product,quantity});
 D.updateCard(state,'GS1',card);
 D.addPlacement(state,{id:'GS2-A',page:1,stencilId:'GS2',x:.6,y:.2});
 const second=D.clone(state.cards.GS2);Object.assign(second.rows.find(row=>row.id==='day-lock'),{product:'ST140-50',quantity:4});D.updateCard(state,'GS2',second);
 D.ensureCard(state,'GS3');const unused=D.clone(state.cards.GS3);unused.rows.find(row=>row.id==='day-lock').product='EXCLUDED UNUSED';D.updateCard(state,'GS3',unused);
 for(const [id,stencilId,model,quantity,x]of [['DA-A','DA','SW300',3,.25],['DS-A','DS','TS83',2,.4],['DFS-A','DFS','DFS modell 7',4,.55],['DA-missing','DA','',1,.7]])D.addPlacement(state,{id,page:2,stencilId,x,y:.7,equipment:{model,quantity}});
 D.addStencil(state,{...D.defaultStencil('CONTACT1'),kind:'symbol',productType:'elbowContact',category:'Armbågskontakter',name:'Armbågskontakt'});
 D.addPlacement(state,{id:'ELBOW-A',page:1,stencilId:'CONTACT1',x:.8,y:.7,equipment:{model:'JCK207',quantity:2}});
 D.addStencil(state,{...D.defaultStencil('DA300'),kind:'symbol',productType:'doorAutomation',category:'Egna automatiker',name:'SW300'});
 D.addPlacement(state,{id:'DA-fallback',page:1,stencilId:'DA300',x:.8,y:.45});
 D.addStencil(state,{...D.defaultStencil('NOTE1'),kind:'symbol',productType:'none',name:'Ingen produkt'});D.addPlacement(state,{id:'NOTE-A',page:1,stencilId:'NOTE1',x:.45,y:.45});
 return state;
}
const find=(report,component,product)=>report.rows.find(row=>row.component===component&&row.product.toLocaleLowerCase('sv')===product.toLocaleLowerCase('sv'));
async function text(bytes){const document=await pdfjs.getDocument({data:bytes.slice(),useSystemFonts:true,disableFontFace:true}).promise;try{const pages=[];for(let i=1;i<=document.numPages;i++)pages.push((await(await document.getPage(i)).getTextContent()).items.map(item=>item.str));return pages;}finally{await document.destroy();}}
(async()=>{
 for(const [minutes,expected]of [[0,'0 min'],[20,'20 min'],[59,'59 min'],[60,'1 tim'],[90,'1 tim 30 min'],[180,'3 tim'],[720,'12 tim'],[7.5,'7,5 min'],[67.5,'1 tim 7,5 min'],[59.999999,'59,999999 min'],[60.000001,'1 tim 0,000001 min'],[999000000000,'16650000000 tim']])assert.equal(M.formatDuration(minutes),expected,'duration preserves hours and remaining minutes: '+minutes);
 for(const minutes of [-1,Infinity,NaN,null,undefined,'90'])assert.throws(()=>M.formatDuration(minutes),/Tiden/);
 for(const code of ['GS1','GS1:1','GS4-A','GS-4','GS-300:1','GS12A','ＧＳ １:２'])assert(M.isGSCardCode(code),'GS family includes '+code);
 for(const code of ['DTS','DTS:1','DGS100','DGS100:1','DBL','WC','HWC','GSM1','GSABC1','GS','GS1:1:2',null,{}])assert.equal(M.isGSCardCode(code),false,'non-GS code excluded: '+String(code));
 const state=fixture(),before=JSON.stringify(state),report=M.build(state);
 assert.equal(JSON.stringify(state),before,'aggregation does not mutate saved data');
 assert.equal(find(report,'Låshus','ST140-50').quantity,10,'day/night and shared card codes combine');
 assert.equal(find(report,'Cylinder','8882').quantity,8,'hinge/strike and day/night cylinders combine');
 assert.equal(find(report,'Cylinderbehör','256').quantity,2);assert.equal(find(report,'Sensorlist','Flatscan').quantity,4);
 assert.equal(find(report,'Armbågskontakt','JCK207').quantity,4,'only card elbow contacts contribute, at two per placement');
 assert.equal(find(report,'Öppnaknapp','JCK207').quantity,2,'ordinary buttons have no elbow multiplier');
 assert.equal(find(report,'Dörrautomatik','SW300').quantity,2,'card automation remains material; standalone DA is excluded');
 assert.equal(find(report,'Dörrstängare','TS83').quantity,2,'card closer remains material; standalone DS is excluded');
 assert(!report.rows.some(row=>['DA','DA300','DFS modell 7','Ingen produkt','EXCLUDED UNUSED'].includes(row.product)));
 assert(report.rows.every(row=>row.sources.every(source=>source.kind==='card')));
 assert.deepEqual(report.unresolved,[]);assert.deepEqual(report.unplacedCards,['GS3']);
 assert.equal(report.totalQuantity,34);assert.equal(report.totalMinutes,0);assert.equal(report.untimedRows,report.rows.length);assert.equal(report.hasEstimates,false);
 assert(report.rows.every(row=>row.timePerUnit===null&&row.timeMinutes===null&&!row.estimated),'unset times remain distinguishable from zero');
 assert.equal(M.sourceText(find(report,'Låshus','ST140-50')),'GS1: 6; GS2: 4');
 const counts=D.placementCounts(state);assert.equal(counts.doorAutomation,5);assert.equal(counts.doorCloser,2);assert.equal(counts.otherProducts,8,'symbol-only totals stay available in the overview');
 const symbols=D.clone(state);D.updateEquipment(symbols,'DA-A',{quantity:12,model:'STANDALONE NOT ORDERED'});D.removePlacements(symbols,['DS-A','DFS-A','ELBOW-A']);
 assert.deepEqual(M.build(symbols).rows,report.rows,'changing or removing any symbol has no material effect');
 assert.notDeepEqual(D.placementCounts(symbols),counts,'overview counts still respond to symbols');

 const lockKey=find(report,'Låshus','ST140-50').key,elbowKey=find(report,'Armbågskontakt','JCK207').key,buttonKey=find(report,'Öppnaknapp','JCK207').key;
 assert.equal(lockKey,M.materialKey('lock','  ＳＴ140-50  '),'keys normalize Unicode, case and whitespace');
 assert.notEqual(elbowKey,buttonKey,'same product in different components has independent labor');
 D.setMaterialTime(state,lockKey,12.5);D.setMaterialTime(state,elbowKey,3.25);D.setMaterialTime(state,buttonKey,0);
 D.setMaterialTime(state,M.materialKey('other','STANDALONE NOT ORDERED'),99999);
 const timed=M.build(state),lock=find(timed,'Låshus','ST140-50'),elbow=find(timed,'Armbågskontakt','JCK207'),button=find(timed,'Öppnaknapp','JCK207');
 assert.equal(lock.timePerUnit,12.5);assert.equal(lock.timeMinutes,125);assert.equal(elbow.timeMinutes,13,'labor uses doubled contact quantities');
 assert.equal(button.estimated,true);assert.equal(button.timePerUnit,0);assert.equal(button.timeMinutes,0,'explicit zero is a completed estimate');
 assert.equal(timed.totalMinutes,138);assert.equal(timed.hasEstimates,true);assert.equal(timed.untimedRows,timed.rows.length-3);
 const scoped=D.clone(state),nonGS=['DTS','DTS:1','DBL:1','WC:1','HWC:1','DGS100:1','GSM1'];
 for(let i=0;i<nonGS.length;i++){
  const code=nonGS[i];if(!scoped.stencils[code])D.addStencil(scoped,D.defaultStencil(code));
  D.addPlacement(scoped,{id:'excluded-'+i,page:1,stencilId:code,x:.1+i*.1,y:.9});
  const card=D.clone(scoped.cards[code]);
  Object.assign(card.rows.find(row=>row.id==='day-lock'),{product:'ST140-50',quantity:9});
  Object.assign(card.rows.find(row=>row.id==='closing-operator'),{product:'NON-GS-'+i,quantity:7});
  D.updateCard(scoped,code,card);D.setMaterialTime(scoped,M.materialKey('operator','NON-GS-'+i),99999);
 }
 D.ensureCard(scoped,'DTS2');
 const scopedBefore=JSON.stringify(scoped),gsOnly=M.build(scoped);
 assert.equal(JSON.stringify(scoped),scopedBefore,'excluding a card does not erase its products, placements, or estimate preferences');
 assert.deepEqual(gsOnly.rows,timed.rows,'DTS and every other non-GS card contribute neither shared nor unique material');
 assert.equal(gsOnly.totalMinutes,138,'non-GS quantities and stored times cannot inflate job time');
 assert.deepEqual(gsOnly.excludedCards,[...nonGS].sort(new Intl.Collator('sv',{numeric:true,sensitivity:'base'}).compare));
 assert.deepEqual(gsOnly.unplacedCards,['GS3'],'placed or unplaced non-GS cards are not reported as unplaced GS cards');
 assert.equal(D.placementCounts(scoped).markings,D.placementCounts(state).markings+nonGS.length,'overview still counts every non-GS card marking');
 const scopeCSV=M.csv(gsOnly);assert(scopeCSV.includes('Underlag (GS, antal)'));assert(!scopeCSV.includes('DTS'));assert(!scopeCSV.includes('NON-GS-'));
 const scopePDF=(await text(await M.pdf(gsOnly))).flat().join(' ');assert(scopePDF.includes('Endast placerade GS-dörrkort.'));
 for(const word of ['DTS','DBL','DGS100','NON-GS-'])assert(!scopePDF.includes(word),'non-GS text excluded from material PDF: '+word);
 const families=D.createEmpty('GS-familjer');families.drawing=D.clone(state.drawing);
 const accepted=['GS1:1','GS2:1','GS4-A','GS-4','GS-300:1','GS12A'];
 for(let i=0;i<accepted.length;i++){
  const code=accepted[i];if(!families.stencils[code])D.addStencil(families,D.defaultStencil(code));
  D.addPlacement(families,{id:'family-'+i,page:1,stencilId:code,x:.1+i*.1,y:.4});
  const card=D.clone(families.cards[code]);card.rows.find(row=>row.id==='day-lock').product='GS FAMILY LOCK';D.updateCard(families,code,card);
 }
 D.setMaterialTime(families,M.materialKey('lock','GS FAMILY LOCK'),2.5);
 const familyReport=M.build(families);assert.equal(familyReport.rows.length,1);assert.equal(familyReport.totalQuantity,accepted.length);assert.equal(familyReport.totalMinutes,accepted.length*2.5);
 assert.equal(familyReport.rows[0].sources.length,accepted.length,'initial, private, older letters and hyphen aliases all retain their GS products');
 assert.deepEqual(familyReport.excludedCards,[]);
 assert.deepEqual(M.build(D.validate(JSON.parse(JSON.stringify(state)))) .rows,timed.rows,'persisted keys retain labor without new material rows');
 const cloned=D.clone(state),copy=D.duplicatePlacements(cloned,['GS1-A'])[0],duplicated=M.build(cloned);
 assert.equal(find(duplicated,'Låshus','ST140-50').quantity,13);assert.equal(find(duplicated,'Armbågskontakt','JCK207').quantity,6);assert.equal(find(duplicated,'Cylinder','8882').quantity,12);
 assert.equal(duplicated.totalMinutes,182,'duplicating a physical door multiplies its shared products and labor');
 D.removePlacements(cloned,[copy.id]);assert.deepEqual(M.build(cloned).rows,timed.rows,'removing a door removes precisely its material and labor');
 const reduced=M.summarize(timed,timed.rows.filter(row=>row.key===lockKey));assert.equal(reduced.totalQuantity,10);assert.equal(reduced.totalMinutes,125);assert.equal(reduced.untimedRows,0);assert.equal(reduced.hasEstimates,true);
 assert.equal(timed.rows.length,report.rows.length,'filtered summary does not mutate the full report');
 D.setMaterialTime(cloned,buttonKey,null);assert.equal(find(M.build(cloned),'Öppnaknapp','JCK207').timePerUnit,null,'clearing an explicit zero restores unset');
 for(const invalid of [-1,Infinity,NaN,'12,5',100001]){const snapshot=JSON.stringify(state);assert.throws(()=>D.setMaterialTime(state,lockKey,invalid));assert.equal(JSON.stringify(state),snapshot,'invalid labor cannot change saved data');}
 for(const row of timed.rows)if(!row.estimated)D.setMaterialTime(cloned,row.key,0);
 D.setMaterialTime(cloned,buttonKey,0);assert.equal(M.build(cloned).untimedRows,0);
 const fractional=M.summarize({projectName:'Decimalprov',rows:[
  {category:'Låshus',component:'Låshus',product:'A',quantity:3,sources:[{kind:'card',code:'GS1',quantity:3}],timePerUnit:.1},
  {category:'Cylinder',component:'Cylinder',product:'B',quantity:1,sources:[{kind:'card',code:'GS1',quantity:1}],timePerUnit:.2}
 ],unresolved:[],unplacedCards:[]});
 assert.equal(fractional.rows[0].timeMinutes,.3);assert.equal(fractional.totalMinutes,.5,'decimal arithmetic avoids floating-point residue');
 const maximum=M.summarize({...fractional,rows:[{...fractional.rows[0],quantity:9990000,timePerUnit:100000}]});
 assert.equal(maximum.totalMinutes,999000000000);assert(Number.isFinite(maximum.totalMinutes));

 const escaped=D.clone(state),card=D.clone(escaped.cards.GS2);card.rows.find(row=>row.id==='day-lock').product=' =HYPERLINK("x");ö';D.updateCard(escaped,'GS2',card);
 const csv=M.csv(M.build(escaped));assert(csv.startsWith('\ufeff'));assert(csv.includes('"\'=HYPERLINK(""x"");ö"'),'CSV neutralizes formulas and quotes separators');
 const timedCSV=M.csv(timed);assert(timedCSV.includes('"Tid/st (min)"'));assert(timedCSV.includes('"12,5";"125";"12,5 min";"2 tim 5 min"'));assert(timedCSV.includes('"3,25";"13"'));assert(timedCSV.includes('"0";"0";"0 min";"0 min"'));assert(timedCSV.includes('"138";"";"2 tim 18 min"'));assert(timedCSV.includes('Delsumma tid:'));
 assert(timedCSV.includes('"Tid/st (timmar och minuter)";"Tid totalt (timmar och minuter)"'));assert(!timedCSV.includes('Tid totalt (h)'),'CSV avoids decimal hours while retaining numeric minutes');
 assert(timedCSV.includes('Tid saknas för '+timed.untimedRows+' produktrader.'));assert(!timedCSV.includes('STANDALONE NOT ORDERED'));
 assert(M.csv(report).includes('Tid ej beräknad.'));assert(M.csv(M.build(cloned)).includes('Total arbetstid:'));
 const bytes=await M.pdf(timed),parsed=await lib.PDFDocument.load(bytes),pages=await text(bytes),native=pages.flat(),joined=native.join(' ');
 assert.equal(parsed.getPageCount(),pages.length);assert.equal(parsed.getPage(0).getWidth(),842,'landscape provides readable material and time columns');
 assert(joined.includes('Armbågskontakter räknas ×2'));assert(joined.includes('Delsumma tid: 2 tim 18 min'));assert(joined.includes('Tid saknas för '+timed.untimedRows+' produktrader.'));
 for(const label of ['Tid/st','Tid totalt'])assert(native.includes(label),'native PDF text includes '+label);
 for(const label of ['Min/st','Min totalt','Tim totalt'])assert(!native.includes(label),'old decimal-hour PDF columns removed: '+label);
 assert(!joined.includes('DFS modell 7'));assert(!joined.includes('produktplaceringar saknar'),'symbol placeholders never leak into order exports');
 const longBase={projectName:'Lång materiallista',revision:1,updatedAt:'2026-10-22T00:00:00Z',rows:[],unresolved:[],unplacedCards:[]};
 for(let i=1;i<=130;i++)longBase.rows.push({key:String(i),category:'Cylinder',component:'Cylinder',product:'FULL-MODEL-'+i+'-'+'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(4),quantity:i,sources:[{kind:'card',code:'GS'+i,quantity:i}],timePerUnit:i%2===0?1.25:null});
 const longReport=M.summarize(longBase),longBytes=await M.pdf(longReport),longPages=await text(longBytes);assert(longPages.length>2,'long material/time lists paginate');
 const allNative=longPages.flat(),compact=allNative.join('').replace(/\s+/g,'');for(const row of longReport.rows)assert(compact.includes(row.product),'PDF preserves complete model '+row.key);
 assert.equal(allNative.filter(value=>value==='127').length,1,'a paginated quantity prints once');
 assert(longPages.every((items,index)=>items.includes('Sida '+(index+1)+' av '+longPages.length)),'every page has correct numbering');
 const empty=M.build(D.createEmpty()),emptyText=(await text(await M.pdf(empty))).flat().join(' ');assert(emptyText.includes('Inga produkter att beställa'));assert(emptyText.includes('Inga produkter att tidsberäkna.'));
 const unsupported={...timed,rows:timed.rows.map((row,index)=>index?row:{...row,product:'😀'})};await assert.rejects(M.pdf(unsupported),/tecken|latinska/);
 assert.throws(()=>M.csv({...timed,totalQuantity:0}),/totalsumma/);assert.throws(()=>M.csv({...timed,totalMinutes:0}),/tidsumma/);assert.throws(()=>M.csv({...timed,rows:timed.rows.map((row,index)=>index?row:{...row,timeMinutes:999})}),/tidsberäkning/);
 const symbolReport=M.summarize({...timed,rows:[{...timed.rows[0],sources:[{kind:'product',code:'DA',quantity:timed.rows[0].quantity}]}]});
 assert.throws(()=>M.csv(symbolReport),/dörrkort/);await assert.rejects(M.pdf(symbolReport),/dörrkort/);
 const nonGSReport=M.summarize({...timed,rows:[{...timed.rows[0],sources:[{kind:'card',code:'DTS',quantity:timed.rows[0].quantity}]}]});
 assert.throws(()=>M.csv(nonGSReport),/GS-dörrkort/);await assert.rejects(M.pdf(nonGSReport),/GS-dörrkort/);
 const manual=D.createEmpty('Manuell SV300-tid');manual.drawing=D.clone(state.drawing);
 for(let index=0;index<4;index++)D.addPlacement(manual,{id:'sv300-'+index,page:1,stencilId:'GS1:1',x:.1+index*.2,y:.5});
 const manualCard=D.clone(manual.cards['GS1:1']);manualCard.rows.find(row=>row.id==='closing-operator').product='SV300';D.updateCard(manual,'GS1:1',manualCard);
 const manualUntimed=M.build(manual),manualKey=manualUntimed.rows[0].key;assert.equal(manualUntimed.rows.length,1);assert.equal(manualUntimed.rows[0].quantity,4);assert.equal(manualUntimed.rows[0].timePerUnit,null,'SV300 has no fixed product time');
 D.setMaterialTime(manual,manualKey,180);const manualReport=M.build(manual);
 assert.equal(manualReport.totalMinutes,720);assert.equal(M.formatDuration(manualReport.rows[0].timePerUnit),'3 tim');assert.equal(M.formatDuration(manualReport.totalMinutes),'12 tim');
 const manualCSV=M.csv(manualReport),manualPDF=(await text(await M.pdf(manualReport))).flat();
 assert(manualCSV.includes('"180";"720";"3 tim";"12 tim"'));assert(manualCSV.includes('Total arbetstid: 12 tim.'));
 assert(manualPDF.includes('3 tim'));assert(manualPDF.includes('12 tim'));assert(manualPDF.includes('Total arbetstid: 12 tim.'));
 D.setMaterialTime(manual,manualKey,90);const mixedReport=M.build(manual);assert.equal(mixedReport.totalMinutes,360);assert(M.csv(mixedReport).includes('"90";"360";"1 tim 30 min";"6 tim"'));assert((await text(await M.pdf(mixedReport))).flat().includes('1 tim 30 min'));
 D.setMaterialTime(manual,manualKey,7.5);assert.equal(M.build(D.validate(JSON.parse(JSON.stringify(manual)))).totalMinutes,30,'legacy half-minute rates survive persistence without rounding');
 const otherProject=D.createEmpty('Annat projekt');otherProject.drawing=D.clone(state.drawing);D.addPlacement(otherProject,{id:'other-sv300',page:1,stencilId:'GS1:1',x:.5,y:.5});const otherCard=D.clone(otherProject.cards['GS1:1']);otherCard.rows.find(row=>row.id==='closing-operator').product='SV300';D.updateCard(otherProject,'GS1:1',otherCard);assert.equal(M.build(otherProject).rows[0].timePerUnit,null,'manual SV300 time does not become a standard in another project');
 console.log('PASS materials2.14: manual SV300 quantities and hours/minutes, mixed durations and precise old rates, no fixed product times, GS-only arithmetic, unset/zero, labeled CSV and searchable/paginated duration PDF.');
})().catch(error=>{console.error(error);process.exitCode=1;});
