'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {read}=require('../smartmatch-read-work-v9-2.js');
const word=(text,x,y,w=text.length*5,h=10,extra={})=>({text,x,y,w,h,...extra});
const headers=(y,dx=0)=>[word('Komponent',5+dx,y,60),word('Övrigt',170+dx,y,40),word('Lev',400+dx,y,18),word('av',422+dx,y,10),word('Mont',450+dx,y,27),word('av',481+dx,y,10),word('Ansl',505+dx,y,24),word('av',533+dx,y,10),word('Funk',556+dx,y,24),word('ansv.',585+dx,y,28),word('Anm',630+dx,y,25)];
const row=(label,value,delivery,installation,y,dx=0)=>[word(label,5+dx,y,Math.min(150,label.length*5)),word(value,170+dx,y,Math.min(210,value.length*5)),word(delivery,403+dx,y,16),word(installation,453+dx,y,16),word('GS',508+dx,y,16),word('GS',558+dx,y,16)];
const title=(text,y,dx=0)=>word(text,5+dx,y,Math.min(150,text.length*5));
const original=[...headers(10),title('Daglåsning',30),...row('1 Låshus','310-50','GS','DT',50),...row('2 Slutbleck','std','DT','DT',70),...row('3 Behör','256','DT','GS',90),...row('4 Trycke','6696','GS','GS',110),...row('5 Nödbeslag','-','GS','GS',130),...row('6 Cylinder in/utsida','Utsida','GS','GS',150),...row('7 Draghandtag','','GS','GS',170),...row('Datum','2026-01-02','GS','GS',190),...row('Beslagskod','GS23','GS','GS',210)];
const base=read({words:original});
assert.deepEqual(base.work,['256','6696','Utsida']);
assert.deepEqual(base.items.map(i=>i.label),['Behör','Trycke','Cylinder in/utsida']);
assert(base.items.every(i=>i.section==='Daglåsning'&&i.responsibility==='GS'));
assert.deepEqual(base.items.map(i=>i.legacyText),['Behör · 256','Trycke · 6696','Cylinder in/utsida · Utsida']);
assert(!base.work.some(t=>/310-50|std|GS23|2026/.test(t)));
assert.deepEqual(read({words:[...original].reverse()}).work,base.work,'PDF item ordering cannot alter row selection');
const scaled=original.map(w=>({...w,x:w.x*.017+23,y:w.y*.017+4,w:w.w*.017,h:w.h*.017}));
assert.deepEqual(read({words:scaled}).work,base.work);
assert.deepEqual(read({words:scaled}).items.map(i=>i.section),base.items.map(i=>i.section));

const groups=[...headers(10),title('DAGLÅSNING',30),...row('1 Låshus','SL 660','GS','GS',50),title('NATTLÅSNING',80),...row('20 Låshus','SL 660','GS','GS',100),title('Övrig utrustning',130),...row('30 Dörrstängare','DC700','DT','GS',150),title('Larm / Passer',180),...row('35 Magnetkontakt','std','GS','GS',200),title('SPECIALBESLAG',230),...row('45 Spanjolett','2356','DT','GS',250)];
const grouped=read({words:groups});
assert.deepEqual(grouped.work,['SL 660','SL 660','DC700','std','2356'],'same product in different sections represents separate installation jobs');
assert.deepEqual(grouped.items.map(i=>i.section),['Daglåsning','Nattlåsning','Övrig utrustning','Larm/Passer','SPECIALBESLAG']);
assert.equal(new Set(grouped.items.map(i=>i.sourceIdentity)).size,5);

const repeated=[title('Daglåsning',1),...headers(20),...row('1 Trycke','6696','GS','GS',45),title('Nattlåsning',90,90),...headers(110,90),...row('20 Låshus','SL660','GS','GS',135,90),title('Övrig utrustning',180,25),...headers(200,25),...row('30 Dörrstängare','DC700','GS','GS',225,25)];
const repeatedResult=read({words:repeated});
assert.deepEqual(repeatedResult.work,['6696','SL660','DC700'],'each repeated header establishes its own geometry');
assert.deepEqual(repeatedResult.items.map(i=>i.tableIndex),[0,1,2]);
assert.deepEqual(repeatedResult.items.map(i=>i.section),['Daglåsning','Nattlåsning','Övrig utrustning']);

const parallel=[...headers(10),...headers(10,700),title('Daglåsning',30),title('Nattlåsning',30,700),...row('1 Trycke','6696','GS','GS',55),...row('20 Låshus','SL660','GS','GS',55,700),...row('2 Cylinder','Utsida','GS','DT',80),...row('21 Slutbleck','std','DT','GS',80,700)];
const parallelResult=read({words:parallel});
assert.deepEqual(parallelResult.work,['6696','SL660','std'],'side-by-side tables retain their separate product and installer columns');
assert.deepEqual(parallelResult.items.map(i=>i.section),['Daglåsning','Nattlåsning','Nattlåsning']);

const stacked=[word('Komponent',5,10,60),word('Produkt',170,10,40),word('Levereras',400,10,43),word('av',414,21,10),word('Monteras',455,10,43),word('av',469,21,10),word('Ansluts',515,10,38),word('av',529,21,10),title('Daglåsning',45),...row('Trycke','Modell 700','DT','GS',65),...row('Låshus','Modell 900','GS','DT',90)];
assert.deepEqual(read({words:stacked}).work,['Modell 700']);

const multiline=[...headers(10),title('Övrig utrustning',30),...row('30 Dörrstängare','DC 700','GS','GS',55),word('silver / utan arm',170,67,100),...row('31 Trycke','6696','GS','GS',95),...row('32 Cylinder','Trio','GS','DT',125)];
const multilineResult=read({words:multiline});
assert.deepEqual(multilineResult.work,['DC 700 silver / utan arm','6696'],'continuation in a product cell is retained');
assert.equal(multilineResult.items[0].sourceRows.length,2);
const ownerSecond=[...headers(10),title('Daglåsning',30),word('1 Låshus',5,55,70),word('SL',170,55,10),word('660',170,67,15),word('GS',453,67,16),...row('2 Trycke','6696','GS','GS',100)];
assert.deepEqual(read({words:ownerSecond}).work,['SL 660','6696'],'responsibility on second baseline still reads the complete product');

const splitLabel=read({words:[...headers(10),word('Cylinder',5,40,45),word('in/utsida',90,40,60),word('Utsida',170,40,35),word('GS',453,40,16)]});
assert.deepEqual(splitLabel.work,['Utsida'],'long component labels stay outside the product cell');
assert.equal(splitLabel.items[0].label,'Cylinder in/utsida');

const blankOwner=[...headers(10),...row('Trycke','6696','GS','GS',40),...row('Cylinder','Trio','GS','',53),...row('Dörrstängare','DC700','GS','GS',85)];
assert.deepEqual(read({words:blankOwner}).work,['6696','DC700'],'a distinct row with blank installer never leaks into an adjacent GS job');
const duplicateWords=groups.flatMap(w=>[w,{...w,x:w.x+.1,y:w.y+.1,confidence:95}]);
assert.deepEqual(read({words:duplicateWords}).work,grouped.work,'overlapping OCR/native duplicates do not duplicate rows or product words');

const ambiguous=read({words:[...headers(10),...row('Trycke','6696','GS','GS/DT',40)]});
assert.deepEqual(ambiguous.work,[]);assert(ambiguous.warnings.some(t=>/otydligt/.test(t)));
const supplierOnly=read({words:[...headers(10),...row('Trycke','6696','GS','DT',40)]});assert.deepEqual(supplierOnly.work,[]);
const missingHeader=read({words:original.filter(w=>w.y>10)});assert.deepEqual(missingHeader.work,[]);assert(missingHeader.warnings.some(t=>/Monteras av/.test(t)));
const missingProduct=read({words:[...headers(10).filter(w=>w.text!=='Övrigt'),...row('Trycke','6696','GS','GS',40)]});assert.deepEqual(missingProduct.work,[]);assert(missingProduct.warnings.some(t=>/produktkolumnen/.test(t)));
assert.deepEqual(read({text:'Trycke 6696 GS\nLåshus SL660 GS'}).work,[],'plain text without verified columns is left unresolved');
const productWithoutLabel=read({words:[...headers(10),word('DC700',170,40,30),word('GS',453,40,16)]});assert.deepEqual(productWithoutLabel.work,['DC700'],'a verified GS product cell does not require an invented component label');

// The actual reduced school file's local OCR output stays outside the repo.
const schoolFile='/tmp/drawing-ocr-school-result.json';
if(fs.existsSync(schoolFile)){
 const data=JSON.parse(fs.readFileSync(schoolFile,'utf8')),school=read({words:data.output.pages[0].words});
 assert.deepEqual(school.work,['256','6696','Utsida']);assert(school.items.every(i=>i.section==='Daglåsning'));
 assert(school.items.some(i=>i.label==='Cylinder in/utsida'));console.log('PASS real school OCR output: 3 GS products, Daglåsning group, complete cylinder label, DT products excluded');
}
console.log('PASS TEST 9.2 GS installer columns, product-only values, four sections and arbitrary headings, repeated table geometry, wrapped cells, GS/DT separation, duplicates, empty cells and unresolved column safeguards');
