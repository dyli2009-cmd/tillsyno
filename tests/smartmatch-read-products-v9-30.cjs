'use strict';
const assert=require('node:assert/strict');
const {read}=require('../smartmatch-read-work-v9-30.js');
const word=(text,x,y,w=text.length*5)=>({text,x,y,w,h:10});
const headers=[word('Komponent',5,10),word('Produkt',170,10),word('Antal',350,10),word('Lev av',400,10),word('Mont av',450,10),word('Ansl av',510,10)];
const rows=[
 word('Daglåsning',5,30),word('Låshus',5,50),word('EL580',170,50),word('2',355,50),word('GS',405,50),word('DT',455,50),
 word('Trycke',5,70),word('6696',170,70),word('1',355,70),word('GS',455,70),
 word('Nattlåsning',5,90),word('Trycke',5,110),word('6696',170,110),word('1',355,110),word('GS',455,110),
 word('Övrig utrustning',5,130),word('Dörrstängare',5,150),word('DC700',170,150),word('2',355,150),
 word('Automatik',5,170),word('ED100',170,170),word('1',355,170),word('GS/DT',455,170),
 word('Sensor',5,190),word('-',170,190),word('GS',455,190)
];
for(const words of [[...headers,...rows],[...headers,...rows].reverse()]){
 const result=read({words});
 assert.deepEqual(result.work,['6696','6696']);
 assert.deepEqual(result.items.map(item=>item.section),['Daglåsning','Nattlåsning']);
 assert.deepEqual(result.products.map(item=>item.value),['EL580','6696','6696','DC700','ED100']);
 assert.deepEqual(result.products.map(item=>item.responsibility),['DT','GS','GS','','GS/DT']);
 assert.deepEqual(result.products.map(item=>item.quantity),['2','1','1','2','1']);
 assert(result.warnings.some(message=>message.includes('saknar montör')));
 assert(result.warnings.some(message=>message.includes('otydligt')));
}
const noInstaller=read({words:[...headers.filter(word=>word.text!=='Mont av'),...rows]});
assert.equal(noInstaller.resolved,false);
assert.equal(noInstaller.items.length,0);
assert(noInstaller.products.some(item=>item.value==='DC700'),'missing installer header must not discard the product');
assert(noInstaller.products.every(item=>!item.responsibility),'supplier GS is never installer GS');
console.log('PASS 9.30 complete product inventory, quantities, sections, DT, unknown/ambiguous owner, empty product and missing installer header');

const simple=read({words:[word('Dörrkort 130C',5,10),word('Dörrautomatik',5,40),word('ED100',170,40),word('Låshus',5,60),word('ASSA',170,60)]});
assert.deepEqual(simple.products.map(row=>row.value),['ED100','ASSA']);assert.deepEqual(simple.work,[]);assert.equal(simple.resolved,false);
console.log('PASS two-column card without installer: retains products for review, creates no guessed GS jobs');
