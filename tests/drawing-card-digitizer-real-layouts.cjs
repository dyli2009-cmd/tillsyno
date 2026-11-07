'use strict';
const assert=require('node:assert/strict');
const Core=require('../drawing-card-digitizer-core.js');
const Exporter=require('../drawing-card-digitizer-export.js');

// Independently generated OCR observations. These exercise noisy responsibility
// headings, a distant border glyph and dynamic export columns without retaining
// words, confidences or measured coordinates from any customer's drawing.
const syntheticRect={x:0,y:0,w:1,h:1};
const syntheticViewport={width:1200,height:1000};
function syntheticWord(text,x,y,w=text.length*6,confidence=96){
 return {text,x,y,w,h:12,source:'ocr',confidence};
}
const syntheticOcr=[
 syntheticWord('Beslagskod:',45,45,90),syntheticWord('GS77',160,45,40),syntheticWord('|',740,42,2,80),
 syntheticWord('Övrigt',285,120,55),syntheticWord('Lev av',460,120,50),syntheticWord('Mont av',540,120,55),
 syntheticWord('Ansl av',620,120,50),syntheticWord('Funk ansv.',705,120,75),syntheticWord('Anm',815,120,30),
 syntheticWord('Montering klar',900,120,90),syntheticWord('Daglåsning',45,180,85),
 syntheticWord('Behör',90,220,45),syntheticWord('TEST-LOCK',285,220,70),
 ...[460,540,620,705].map(x=>syntheticWord('GS',x,220,20)),
 syntheticWord('Trycke',90,260,50),syntheticWord('TEST-HANDLE',285,260,85),
 ...[460,540,620,705].map(x=>syntheticWord('DT',x,260,20)),
 syntheticWord('Nattlåsning',45,380,90),syntheticWord('Låshus',90,420,50),syntheticWord('-',285,420,8),
 syntheticWord('~~',945,448,32,24),syntheticWord('Övrig utrustning',45,500,125),
 syntheticWord('Dörrstängare',90,550,100),syntheticWord('TEST-CLOSE',285,550,85),
 ...[460,540,620,705].map(x=>syntheticWord('GS',x,550,20)),
 syntheticWord('Larm/Passer',45,740,100),syntheticWord('Magnetkontakt',90,780,105),syntheticWord('TEST-SENSOR',285,780,90)
];
const syntheticTemplate=Core.createTemplateGroup({
 name:'Exempelprojekt ansvarsmatris',page:1,rect:syntheticRect,viewport:syntheticViewport,ocrWords:syntheticOcr
});
assert.equal(syntheticTemplate.layoutProfile,'responsibility-matrix','the generated Övrigt/Lev av/Mont av header selects its own layout profile');
assert.equal(Core.validateTemplate(syntheticTemplate).valid,true,'the generated template must be valid');
assert(syntheticTemplate.reference.detectedColumns.includes('installer'),'Mont av is a detected installer column');
for(const key of ['supplier','connection','functionOwner'])assert(syntheticTemplate.columns.some(column=>column.key===key),key+' is retained as a reviewable source column');
const actualOther=syntheticTemplate.sections.find(section=>section.key==='other-equipment');
assert(actualOther.anchorY>.45,'Övrigt in the column header must not masquerade as Övrig utrustning');

const syntheticCard=Core.createCard({template:syntheticTemplate,page:1,fileName:'synthetic-responsibility-matrix.pdf',rect:syntheticRect,viewport:syntheticViewport,ocrWords:syntheticOcr});
assert.equal(syntheticCard.header.code,'GS77','a distant table-border glyph on the code row is not part of the synthetic code');
const syntheticRows=syntheticCard.sections.flatMap(section=>section.rows||[]);
const behor=syntheticRows.find(row=>/Behör/u.test(row.cells?.designation||'')&&row.cells?.type==='TEST-LOCK');
assert(behor,'the generated Behör product row is preserved');
assert.equal(behor.cells.supplier,'GS');
assert.equal(behor.cells.installer,'GS');
assert.equal(behor.cells.connection,'GS');
assert.equal(behor.cells.functionOwner,'GS');
assert(!syntheticRows.some(row=>/Lev\s*Mont|Montav\s*Anslav/iu.test(Object.values(row.cells||{}).join(' '))),'the responsibility header is fixed structure, never a product row');
assert.equal(Core.validateCard(syntheticCard).valid,true,'the noisy synthetic OCR remains lossless and valid');

// A single missed Swedish heading must not recreate the original post-OCR
// stop. The surrounding responsibility headings are sufficient to derive the
// canonical Typ/Övrigt column and keep the template usable.
const missingOtherWords=[
 ['Lev av',460,100,55,12],['Mont av',535,100,60,12],['Ansl av',610,100,55,12],
 ['Funk ansv.',680,100,75,12],['Behör',120,140,50,12],['5265',260,140,40,12],
 ['GS',470,140,22,12],['GS',545,140,22,12],['GS',620,140,22,12],['GS',690,140,22,12]
].map(([text,x,y,w,h])=>({text,x,y,w,h,source:'ocr',confidence:96}));
const missingOtherTemplate=Core.createTemplateGroup({name:'Ansvarsmatris utan läst Övrigt',page:1,rect:{x:0,y:0,w:1,h:1},viewport:{width:1000,height:800},ocrWords:missingOtherWords});
assert.equal(missingOtherTemplate.layoutProfile,'responsibility-matrix');
assert(missingOtherTemplate.columns.some(column=>column.key==='type'&&column.derived===true),'a missing Övrigt heading gets a derived canonical type column');
assert.equal(Core.validateTemplate(missingOtherTemplate).valid,true,'a missed Övrigt heading does not stop template creation');
const missingOtherCard=Core.createCard({template:missingOtherTemplate,page:1,rect:{x:0,y:0,w:1,h:1},viewport:{width:1000,height:800},ocrWords:missingOtherWords});
assert.equal(Core.validateCard(missingOtherCard).valid,true,'the derived responsibility layout remains a valid card');

const metadataWords=[
 ['Beslagskod',80,70,85,12],['WC',180,70,25,12],
 ['Projektnummer',80,120,100,12],['12345',420,120,45,12],
 ['Datum',80,150,45,12],['2026-10-19',420,150,85,12]
].map(([text,x,y,w,h])=>({text,x,y,w,h,source:'native',confidence:100}));
const metadataTemplate=Core.createTemplateGroup({name:'Metadata',page:1,rect:{x:0,y:0,w:1,h:1},viewport:{width:600,height:800},nativeWords:metadataWords});
assert.notEqual(metadataTemplate.layoutProfile,'simple-list','two metadata rows after Beslagskod are not a product list');
assert.equal(metadataTemplate.reference.validStructure,false,'metadata alone cannot approve a reusable card layout');

const splitCodeWords=[
 ['Dörrkort',80,60,70,12],['GS23',80,84,42,12],
 ['Låshus',80,135,60,12],['EL580',320,135,50,12],
 ['Slutbleck',80,165,75,12],['EA281',320,165,50,12],
 ['Dörrstängare',80,195,105,12],['DC700',320,195,55,12]
].map(([text,x,y,w,h])=>({text,x,y,w,h,source:'native',confidence:100}));
const splitCodeTemplate=Core.createTemplateGroup({name:'Delad dörrkortsrubrik',page:1,rect:{x:0,y:0,w:1,h:1},viewport:{width:600,height:800},nativeWords:splitCodeWords});
assert.equal(splitCodeTemplate.layoutProfile,'simple-list');
const splitCodeCard=Core.createCard({template:splitCodeTemplate,page:1,rect:{x:0,y:0,w:1,h:1},viewport:{width:600,height:800},nativeWords:splitCodeWords});
assert.equal(splitCodeCard.header.code,'GS23','an empty Dörrkort label does not prevent inference from the next code row');

const sectionlessTableWords=[
 ['Beslagskod',70,55,85,12],['G69',170,55,32,12],
 ['Benämning',70,105,85,12],['Typ',300,105,28,12],['Antal',430,105,40,12],['Monteras av',505,105,85,12],
 ['Dörrstängare',70,145,105,12],['DC700',300,145,55,12],['1',440,145,8,12],['GS',535,145,20,12],
 ['Magnet',70,175,55,12],['830',300,175,28,12],['1',440,175,8,12],['GS',535,175,20,12]
].map(([text,x,y,w,h])=>({text,x,y,w,h,source:'native',confidence:100}));
const sectionlessTemplate=Core.createTemplateGroup({name:'Tabell utan avsnittsrubrik',page:1,rect:{x:0,y:0,w:1,h:1},viewport:{width:600,height:800},nativeWords:sectionlessTableWords});
assert.equal(sectionlessTemplate.layoutProfile,'standard-table');
assert.equal(sectionlessTemplate.reference.validStructure,true,'a standard table with data gets a synthetic review section');
const sectionlessCard=Core.createCard({template:sectionlessTemplate,page:1,rect:{x:0,y:0,w:1,h:1},viewport:{width:600,height:800},nativeWords:sectionlessTableWords});
const sectionlessRows=sectionlessCard.sections.flatMap(section=>section.rows||[]);
assert(sectionlessRows.some(row=>row.cells.designation==='Dörrstängare'&&row.cells.type==='DC700'),'sectionless standard-table rows are not left unassigned');

const emptyTableTemplate=Core.createTemplateGroup({name:'Tom tabell',page:1,rect:{x:0,y:0,w:1,h:1},viewport:{width:600,height:800},nativeWords:sectionlessTableWords.slice(0,6)});
assert.equal(emptyTableTemplate.reference.validStructure,false,'a header without any product row is not a usable template');

// Independently generated two-column card with unrelated project branding.
const simpleViewport={width:640,height:900};
const simpleWords=[
 ['Bygghandling Exempelprojekt',40,55,190,13],
 ['Dorrkort',60,110,70,12],['GS88',155,110,40,12],
 ...[['Dorrautomatik','ED100'],['Las','TEST-LOCK'],['Lashus','TEST MAKER'],['Elslutbleck','TEST-STRIKE'],
  ['Handtag','TEST-HANDLE'],['Glas','TEST-GLASS'],['Magnet','TEST-MAGNET'],['Dorrstangare','TEST-CLOSER']]
 .flatMap(([left,right],index)=>[[left,60,160+index*35,left.length*6,12],[right,330,160+index*35,right.length*6,12]])
].map(([text,x,y,w,h])=>({text,x,y,w,h,source:'native',confidence:100}));
const simpleTemplate=Core.createTemplateGroup({name:'Enkelt dörrkort',page:2,rect:{x:0,y:0,w:1,h:1},viewport:simpleViewport,nativeWords:simpleWords});
assert.equal(simpleTemplate.layoutProfile,'simple-list','the generated two-column card selects the simple list profile');
assert.equal(Core.validateTemplate(simpleTemplate).valid,true);
const simpleCard=Core.createCard({template:simpleTemplate,page:2,fileName:'synthetic-simple-card.pdf',rect:{x:0,y:0,w:1,h:1},viewport:simpleViewport,nativeWords:simpleWords});
assert.equal(simpleCard.header.code,'GS88','Dorrkort is an explicit label; ED100 must never become the card code');
const simpleRows=simpleCard.sections.flatMap(section=>section.rows||[]);
assert(simpleRows.some(row=>row.cells.designation==='Dorrautomatik'&&row.cells.type==='ED100'));
assert(simpleRows.some(row=>row.cells.designation==='Lashus'&&row.cells.type==='TEST MAKER'));
assert.equal(Core.validateCard(simpleCard).valid,true);

// The export normalizer is deliberately schema-tolerant. Extra responsibility
// fields must survive into the searchable PDF layout instead of disappearing.
const normalized=Exporter.normalizeCard(syntheticCard,0,syntheticTemplate);
const normalizedBehor=normalized.sections.flatMap(section=>section.rows).find(row=>/Behör/u.test(row.cells.designation||'')&&row.cells.type==='TEST-LOCK');
for(const key of ['supplier','installer','connection','functionOwner']){
 assert.equal(normalizedBehor.cells[key],'GS',key+' survives export normalization');
 assert(normalized.columns.some(column=>column.key===key),key+' has an export column');
}
assert(!normalized.columns.some(column=>column.key==='quantity'),'a capture:false quantity placeholder is not rendered in the PDF');
const layout=Exporter.planCardLayout(normalized);
for(const key of ['supplier','connection','functionOwner'])assert(layout.columns.some(column=>column.key===key),key+' is rendered by the PDF layout');

console.log('PASS synthetic door-card layouts: noisy responsibility matrix, simple list, exact code and dynamic export cells');
