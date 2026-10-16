'use strict';
const assert=require('node:assert/strict');
const {read}=require('../smartmatch-read-work-v7.js');
const word=(text,x,y,w=text.length*5,h=10)=>({text,x,y,w,h});
const headers=y=>[word('Komponent',5,y,60),word('Övrigt',170,y,40),word('Lev',400,y,18),word('av',422,y,10),word('Mont',450,y,27),word('av',481,y,10),word('Ansl',505,y,24),word('av',533,y,10),word('Funk',556,y,24),word('ansv.',585,y,28),word('Anm',630,y,25)];
const row=(label,value,delivery,installation,y,extra=[])=>[word(label,5,y,Math.min(150,label.length*5)),word(value,170,y,Math.min(210,value.length*5)),word(delivery,403,y,16),word(installation,453,y,16),word('GS',508,y,16),word('GS',558,y,16),...extra];

const table=[...headers(10),...row('1 Låshus','310-50','GS','DT',35),...row('2 Slutbleck','std','DT','DT',50),...row('3 Behör','256','DT','GS',65),...row('4 Trycke','6696','GS','GS',80),...row('5 Nödbeslag','-','GS','GS',95),...row('6 Cylinder in/utsida','Utsida','GS','GS',110),...row('7 Draghandtag','','GS','GS',125),...row('Datum','2026-01-02','GS','GS',140),...row('Beslagskod','GS23','GS','GS',155)];
const selected=read({words:table});
assert.equal(selected.mode,'installation-column');
assert.deepEqual(selected.work,['Behör · 256','Trycke · 6696','Cylinder in/utsida · Utsida']);
assert.equal(selected.warnings.length,0);
assert.equal(selected.responsibilityColumn.label,'Mont av');
assert(selected.items.every(item=>item.responsibility==='GS'));
assert(!selected.work.some(line=>line.includes('Låshus')),'GS delivery never overrides DT installation');
assert(selected.work.some(line=>line.includes('Behör')),'DT delivery does not exclude GS installation');

const scaled=table.map(item=>({...item,x:item.x*.017+23,y:item.y*.017+4,w:item.w*.017,h:item.h*.017}));
assert.deepEqual(read({words:scaled}).work,selected.work,'selection does not depend on page units, origin or customer coordinates');
const shuffled=[...table].reverse();
assert.deepEqual(read({words:shuffled}).work,selected.work,'PDF extraction order does not affect row grouping');

const stacked=[word('Komponent',5,10,60),word('Produkt',170,10,40),word('Levereras',400,10,43),word('av',414,21,10),word('Monteras',455,10,43),word('av',469,21,10),word('Ansluts',515,10,38),word('av',529,21,10),...row('Trycke','Modell 700','DT','GS',45),...row('Låshus','Modell 900','GS','DT',65)];
assert.deepEqual(read({words:stacked}).work,['Trycke · Modell 700'],'stacked responsibility headings retain their columns');

const noHeader=read({words:table.filter(item=>item.y>10)});
assert.deepEqual(noHeader.work,['Trycke · 6696','Cylinder in/utsida · Utsida']);
assert.equal(noHeader.mode,'gs-line');
assert(noHeader.warnings.some(line=>line.includes('Monteras av')),'missing heading is visible, rather than guessed');

const plain=read({text:'Beslagskod: GS23\nLittera GS 23\nTrycke 6696 GS\nLåshus 310-50 GS DT\nCylinder Trio GS\nNödbeslag - GS\nLevereras av GS\nGS GS GS\nBehör GS\nTrycke 6696 GS'});
assert.deepEqual(plain.work,['Trycke · 6696','Cylinder · Trio'],'fallback requires standalone GS, actual product, no DT, and no duplicate');
assert.deepEqual(read({text:'GS23\nTrycke 6696\nLåshus 310-50 DT'}).work,[],'neither an ID nor an unassigned product becomes GS work');

const ambiguous=read({words:[...headers(10),...row('Trycke','6696','GS','GS/DT',35)]});
assert.deepEqual(ambiguous.work,[]);
assert(ambiguous.warnings.some(line=>line.includes('otydligt')));

const explicitGeneric=read({text:'UTRUSTNING\nProdukt ABC\nDRIVNING\nMotor DEF\nSIGNALER\nKnapp GHI',policy:'all'});
assert.deepEqual(explicitGeneric.work,['UTRUSTNING · Produkt ABC','DRIVNING · Motor DEF','SIGNALER · Knapp GHI']);
assert.equal(explicitGeneric.mode,'all');
console.log('PASS TEST 7 GS installation columns, mixed roles, crop fallback, scale/order independence, products, exclusions and explicit generic lists');
