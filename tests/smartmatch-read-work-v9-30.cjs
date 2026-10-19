'use strict';
const assert=require('node:assert/strict');
const {read}=require('../smartmatch-read-work-v9-30.js');

const word=(text,x,y,w=text.length*5,h=10)=>({text,x,y,w,h});
const headers=[
 word('Komponent',5,10,60),
 word('Övrigt',170,10,40),
 word('Lev av',400,10,35),
 word('Mont av',450,10,45),
 word('Ansl av',510,10,35)
];

// Short OCR boxes can put the centre of an owner-only GS observation just
// above the centre of its product row. The raw table still contains the full
// row, and that small baseline difference must not discard the GS job.
const words=[
 ...headers,
 word('Övrig utrustning',5,30,100),
 word('31 Dörrstängare',5,50,105),
 word('DC700',170,50,35),
 word('GS',453,47,15,5),
 word('Larm/Passer',5,70,80),
 word('35 Magnetkontakt',5,90,105),
 word('MK240',170,90,35),
 word('GS',453,87,15,5)
];
const rawTable=[
 'Övrigt  Lev av  Mont av  Ansl av',
 'Övrig utrustning',
 '31 Dörrstängare  DC700  GS  GS',
 'Larm/Passer',
 '35 Magnetkontakt  MK240  GS  GS'
].join('\n');

for(const input of [words,[...words].reverse()]){
 const result=read({words:input,text:rawTable});
 assert.equal(result.resolved,true,'the recognised installation and product columns stay resolved');
 assert.deepEqual(result.work,['DC700','MK240'],'owner-only GS boxes slightly above their product rows remain checklist jobs');
 assert.deepEqual(result.items.map(item=>item.label),['Dörrstängare','Magnetkontakt']);
 assert.deepEqual(result.items.map(item=>item.section),['Övrig utrustning','Larm/Passer']);
 assert(result.items.every(item=>item.responsibility==='GS'));
 assert(!result.warnings.some(text=>/utan produkt/i.test(text)),'valid products are not reported as missing');
}

console.log('PASS TEST 9.30: short owner-only GS boxes above DC700 and magnet product baselines remain structured checklist rows');
