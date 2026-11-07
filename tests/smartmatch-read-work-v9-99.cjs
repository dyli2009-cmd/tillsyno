'use strict';
const assert=require('node:assert/strict');
const previous=require('../smartmatch-read-work-v9-98.js');
const {read}=require('../smartmatch-read-work-v9-99.js');
const w=(text,x,y,width=Math.max(4,text.length*5))=>({text,x,y,w:width,h:10});
const owners=[w('Lev av',400,10),w('Mont av',450,10)];
const extra=[w('Ansl av',510,10),w('Funk ansvar',570,10),w('Anm',650,10)];
const row=(label,value,y,delivery='',installer='',connection='',note='')=>[
 w(label,5,y),...(value?[w(value,170,y)]:[]),...(delivery?[w(delivery,400,y)]:[]),
 ...(installer?[w(installer,450,y)]:[]),...(connection?[w(connection,510,y)]:[]),...(note?[w(note,650,y)]:[])
];
const matrix=()=>[
 ...owners,w('Daglåsning',5,30),
 ...row('Låshus','MODEL-A',50,'GS','DT'),
 ...row('Cylinder','MODEL-B',70,'DT','GS'),
 ...row('Dörrhandtag','MULTI MODEL-C',90,'Best/GS','Best/GS'),
 ...row('Tätningslist','-',110,'GS','GS'),
 ...row('Skyddsbeslag','',130,'','GS'),
 w('Dörrstängning',5,150),
 ...row('Dörrstängare','MODEL-D',170,'DT','GS'),
 ...row('Montagebeslag','MODEL-B',190,'GS','GS'),
 ...row('Magnet','MODEL-F',210,'GS','EL'),
 ...row('Signalkontakt','MODEL-G',230,'DT','DT')
];
const options=words=>({words,text:words.map(word=>word.text).join('\n'),policy:'gs'});
function unchanged(words,description){const o=options(words);assert.deepEqual(read(o),previous.read(o),description);}

for(const transform of [
 words=>words,
 words=>words.reverse(),
 words=>words.map(word=>({...word,x:word.x*1.7+37,y:word.y*1.7+91,w:word.w*1.7,h:word.h*1.7})),
 words=>words.flatMap(word=>word.y===10&&word.text.includes(' ')?word.text.split(' ').map((text,index,parts)=>w(text,word.x+parts.slice(0,index).join(' ').length*5+(index?5:0),word.y)):word)
]){
 const input=transform(matrix()),before=structuredClone(input),result=read(options(input));
 assert.equal(previous.read(options(input)).resolved,false,'previous profile could not read this owner-only selection');
 assert.equal(result.resolved,true);
 assert.equal(result.profileId,'responsibility-matrix-two-owner-columns-v1');
 assert.equal(result.profileEvidence.responsibilityHeaders,2);
 assert.deepEqual(result.work,['MODEL-A','MODEL-B','MODEL-D','MODEL-B','MODEL-F'],'GS delivery OR montage is retained; both gives one point');
 assert.equal(result.products.length,7,'all populated product rows stay in inventory');
 const find=value=>result.products.find(item=>item.value===value);
 assert.equal(find('MODEL-A').installer,'DT');assert.equal(find('MODEL-A').delivery,'GS');
 assert.equal(find('MODEL-G').installer,'DT');assert.ok(!result.items.some(item=>item.value==='MODEL-G'));
 assert.equal(find('MULTI MODEL-C').installer,'Best/GS');assert.ok(!result.items.some(item=>item.value==='MULTI MODEL-C'));
 assert.ok(result.warnings.some(warning=>/otydligt/.test(warning)));
 assert.equal(find('MODEL-D').section,'Dörrstängning');assert.equal(find('MODEL-A').section,'Daglåsning');
 assert.equal(find('MODEL-B').sourceRow,3);assert.deepEqual(find('MODEL-B').sourceRows,[3]);
 assert.match(find('MODEL-B').sourceIdentity,/^gs:0:3:/);
 const repeated=result.items.filter(item=>item.value==='MODEL-B');assert.equal(new Set(repeated.map(item=>item.sourceIdentity)).size,2,'same value in different sections keeps separate source identities');
 assert.deepEqual(input,before,'no original words, geometry or metadata are changed');
}

// Full previously supported matrices still use exactly the existing result.
unchanged([...matrix(),...extra],'full 9.98 profile remains byte-equivalent data');
unchanged([...matrix(),w('Komponent',5,10),w('Produkt',170,10)],'existing headed matrix remains unchanged');
const all=options(matrix());all.policy='all';assert.deepEqual(read(all),previous.read(all),'all-rows policy stays unchanged');

// An abbreviated optional function heading is not a new mandatory requirement.
const abbreviated=[...matrix(),...extra.map(word=>word.text==='Funk ansvar'?{...word,text:'Funk ansv.'}:word)];
const fullResult=read(options(abbreviated));assert.equal(fullResult.resolved,true);assert.equal(fullResult.work.length,5);assert.equal(fullResult.profileId,'responsibility-matrix-two-owner-columns-v1');
const connected=read(options([...abbreviated,...row('Anslutningsdel','CONNECTION-ONLY',250,'DT','DT','GS','IGNORE NOTE')]));
assert.ok(connected.products.some(item=>item.value==='CONNECTION-ONLY'));
assert.ok(!connected.items.some(item=>item.value==='CONNECTION-ONLY'),'GS in connection or remarks never selects a product');
assert.ok(connected.products.every(item=>!item.value.includes('IGNORE NOTE')));

// A real card can have an empty final section without losing earlier products.
const endingEmpty=[...owners,w('Daglåsning',5,30),...row('Låshus','ONE',50,'GS','GS'),...row('Behör','TWO',70,'DT','GS'),...row('Cylinder','THREE',90,'GS','DT'),w('Larm/Passer',5,120),...row('Magnetkontakt','-',140,'','')];
assert.equal(read(options(endingEmpty)).resolved,true);assert.deepEqual(read(options(endingEmpty)).work,['ONE','TWO','THREE']);

unchanged(matrix().filter(word=>word.text!=='Mont av'),'missing montage heading stays unresolved');
unchanged(matrix().filter(word=>word.text!=='Lev av'),'missing delivery heading stays unresolved');
unchanged(matrix().map(word=>word.text==='Lev av'?{...word,x:450}:word.text==='Mont av'?{...word,x:400}:word),'reversed headings stay unresolved');
unchanged([...matrix(),w('Fabrikat',170,10)],'unknown or clipped left heading is not replaced');
unchanged(matrix().filter(word=>!['Daglåsning','Dörrstängning'].includes(word.text)),'unknown table without section anchors stays unresolved');
unchanged(matrix().filter(word=>word.text!=='Dörrstängning'),'one known section is insufficient');
unchanged([...owners,w('Daglåsning',5,30),...row('Låshus','ONE',50,'GS','GS'),w('Dörrstängning',5,70),...row('Cylinder','TWO',90,'GS','GS')],'only two populated row pairs stay unresolved');
unchanged([...matrix(),...owners.map(word=>({...word,y:270}))],'repeated vertical matrix stays unresolved');
unchanged([...matrix(),...owners.map(word=>({...word,x:word.x+400}))],'two side-by-side matrices stay unresolved');
unchanged([...matrix(),w('Mont av',500,10)],'competing owner columns stay unresolved');
unchanged([...matrix(),...matrix().filter(word=>word.x===170&&word.text!=='-').map(word=>({...word,text:'EXTRA',x:280,w:25}))],'competing repeated product boundaries stay unresolved');
unchanged([...owners,...row('Rumsnamn','DATA-A',50,'GS','GS'),...row('Projekt','DATA-B',70,'GS','GS'),...row('Datum','DATA-C',90,'GS','GS')],'arbitrary two-column data is not a known door-card matrix');

console.log('PASS 9.99: owner-only selection, optional headings, legacy equivalence, exact GS policy, inventory/sections, stable raw identities, geometry and fail-closed boundaries');
