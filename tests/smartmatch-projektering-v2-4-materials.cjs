'use strict';
// Arithmetic and searchable text only. No images, screenshots or user documents.
const assert=require('node:assert/strict');
const D=require('../smartmatch-projektering-v2-4-data.js');
const M=require('../smartmatch-projektering-v2-4-materials.js');
const lib=require('../vendor/pdf-lib.min.js');
const pdfjs=require('../vendor/pdf.min.js');
pdfjs.GlobalWorkerOptions.workerSrc=require.resolve('../vendor/pdf.worker.min.js');
function fixture(){
 const state=D.createEmpty('Materialprov'),sheet={width:1000,height:1000,rotation:0,view:[0,0,1000,1000],transform:[1,0,0,-1,0,1000]};
 state.drawing={name:'Genererat testunderlag.pdf',pages:[sheet,{...sheet,view:[...sheet.view],transform:[...sheet.transform]}]};
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
 const state=fixture(),before=JSON.stringify(state),report=M.build(state);assert.equal(JSON.stringify(state),before,'aggregation does not mutate saved data');
 assert.equal(find(report,'Låshus','ST140-50').quantity,10,'day/night and shared card codes aggregate by component/model');
 assert.equal(find(report,'Cylinder','8882').quantity,8,'hinge/strike and day/night cylinders combine');
 assert.equal(find(report,'Cylinderbehör','256').quantity,2);assert.equal(find(report,'Sensorlist','Flatscan').quantity,4);
 assert.equal(find(report,'Armbågskontakt','JCK207').quantity,8,'door-card and explicit product elbow contacts both multiply by two');
 assert.equal(find(report,'Öppnaknapp','JCK207').quantity,2,'ordinary opening buttons never inherit the elbow factor');
 assert.equal(find(report,'Dörrautomatik','SW300').quantity,6,'same model on card, DA and named custom product combines');
 assert.equal(find(report,'Dörrstängare','TS83').quantity,4,'same closer model on card and DS combines');
 assert.equal(find(report,'DFS','DFS modell 7').quantity,4);
 assert.equal(report.unresolved.length,1);assert.equal(report.unresolved[0].placementId,'DA-missing');assert.equal(find(report,'Dörrautomatik','Ej vald typ').quantity,1);
 assert.deepEqual(report.unplacedCards,['GS3']);assert(!report.rows.some(row=>row.product==='EXCLUDED UNUSED'));assert(!report.rows.some(row=>row.product==='Ingen produkt'));
 assert.equal(report.totalQuantity,report.rows.reduce((sum,row)=>sum+row.quantity,0));
 const lockSources=find(report,'Låshus','ST140-50').sources;assert.equal(lockSources.filter(source=>source.code==='GS1').reduce((sum,source)=>sum+source.quantity,0),6);
 assert.equal(M.sourceText(find(report,'Låshus','ST140-50')),'GS1: 6; GS2: 4');
 const clone=D.clone(state),copy=D.duplicatePlacements(clone,['GS1-A'])[0],duplicated=M.build(clone);
 assert.equal(find(duplicated,'Låshus','ST140-50').quantity,13);assert.equal(find(duplicated,'Armbågskontakt','JCK207').quantity,10);assert.equal(find(duplicated,'Cylinder','8882').quantity,12);
 D.removePlacements(clone,[copy.id]);assert.deepEqual(M.build(clone).rows,report.rows,'removing a shared door removes exactly its material set');
 D.updateEquipment(clone,'DA-A',{quantity:1,model:' SW300 '});assert.equal(find(M.build(clone),'Dörrautomatik','SW300').quantity,4);
 D.removePlacements(clone,['DS-A']);assert.equal(find(M.build(clone),'Dörrstängare','TS83').quantity,2);
 const escaped=D.clone(state),card=D.clone(escaped.cards.GS2);card.rows.find(row=>row.id==='day-lock').product=' =HYPERLINK("x");ö';D.updateCard(escaped,'GS2',card);
 const csv=M.csv(M.build(escaped));assert(csv.startsWith('\ufeff'));assert(csv.includes('"\'=HYPERLINK(""x"");ö"'),'CSV quotes separators and neutralizes formulas after whitespace');assert(csv.includes('"Armbågskontakt";"JCK207";"8"'));
 const bytes=await M.pdf(report),parsed=await lib.PDFDocument.load(bytes),pages=await text(bytes);assert.equal(parsed.getPageCount(),pages.length);assert(pages.flat().join(' ').includes('Armbågskontakter räknas ×2'));assert(pages.flat().includes('8'),'summed quantity is native PDF text');
 const longReport={projectName:'Lång materiallista',revision:1,updatedAt:'2026-10-22T00:00:00Z',rows:[],totalQuantity:0,unresolved:[],unplacedCards:[]};
 for(let i=1;i<=130;i++){const product='FULL-MODEL-'+i+'-'+'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(4);longReport.rows.push({key:String(i),category:'Cylinder',component:'Cylinder',product,quantity:i,sources:[{kind:'card',code:'GS'+i,quantity:i}]});longReport.totalQuantity+=i;}
 const longBytes=await M.pdf(longReport),longPages=await text(longBytes);assert(longPages.length>2,'long order lists paginate');
 const native=longPages.flat(),compact=native.join('').replace(/\s+/g,'');for(const row of longReport.rows)assert(compact.includes(row.product),'PDF preserves full wrapped model '+row.key);
 assert.equal(native.filter(value=>value==='127').length,1,'a paginated row quantity is printed once');
 assert(longPages.every((items,index)=>items.some(value=>value==='Sida '+(index+1)+' av '+longPages.length)),'every page has a correct page number');
 const empty=M.build(D.createEmpty()),emptyText=(await text(await M.pdf(empty))).flat().join(' ');assert(emptyText.includes('Inga produkter att beställa'));
 const unsupported={...report,rows:report.rows.map((row,index)=>index?row:{...row,product:'😀'})};await assert.rejects(M.pdf(unsupported),/tecken|latinska/);
 assert.throws(()=>M.csv({...report,totalQuantity:0}),/totalsumma/);
 console.log('PASS materials2.4: shared-card quantities, cross-code/day-night aggregation, both elbow factors, product objects, unused cards, source totals, CSV safety and complete searchable multipage PDF.');
})().catch(error=>{console.error(error);process.exitCode=1;});
