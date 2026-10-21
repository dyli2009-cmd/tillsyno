'use strict';
const assert=require('node:assert/strict');
const legacy=require('../smartmatch-read-work-v9-32.js');
const {read}=require('../smartmatch-read-work-v9-98.js');
const w=(text,x,y,width=Math.max(4,text.length*5))=>({text,x,y,w:width,h:10});
const headers=[w('Lev av',400,10),w('Mont av',450,10),w('Ansl av',510,10),w('Funk ansvar',570,10),w('Anm',650,10)];
const row=(label,value,y,delivery='',installer='',connection='',note='')=>[
 w(label,5,y),...(value?[w(value,170,y)]:[]),...(delivery?[w(delivery,400,y)]:[]),
 ...(installer?[w(installer,450,y)]:[]),...(connection?[w(connection,510,y)]:[]),...(note?[w(note,650,y)]:[])
];
const matrix=()=>[
 ...headers,w('Daglåsning',5,30),
 ...row('Låshus','MODEL-A',50,'GS','DT'),
 ...row('Cylinder','MODEL-B',70,'DT','GS'),
 ...row('Dörrhandtag','MULTI MODEL-C',90,'DT','Best/GS'),
 ...row('Tätningslist','-',110,'GS','GS'),
 ...row('Skyddsbeslag','',130,'','GS'),
 w('Dörrstängning',5,150),
 ...row('Dörrstängare','MODEL-D',170,'DT','GS','','CHECK REMARK'),
 ...row('Montagebeslag','MODEL-E',190,'DT','GS'),
 ...row('Magnet','MODEL-F',210,'GS','EL'),
 ...row('Signalkontakt','MODEL-G',230,'DT','DT','GS')
];
const normalizedOptions=words=>({words,text:words.map(word=>word.text).join('\n'),policy:'gs'});
function rejected(words,label){
 const opts=normalizedOptions(words);
 assert.deepEqual(read(opts),legacy.read(opts),label+' retains unresolved legacy result');
}

for(const transform of [words=>words,words=>words.reverse(),words=>words.map(word=>({...word,x:word.x*1.7+37,y:word.y*1.7+91,w:word.w*1.7,h:word.h*1.7})),words=>words.flatMap(word=>(word.y===10||word.text==='MULTI MODEL-C')&&word.text.includes(' ')?word.text.split(' ').map((text,index,parts)=>w(text,word.x+parts.slice(0,index).join(' ').length*5+(index?5:0),word.y)):word)]){
 const input=transform(matrix()),snapshot=structuredClone(input),result=read(normalizedOptions(input));
 assert.equal(result.resolved,true,'verified blank headers are resolved');
 assert.deepEqual(result.work,['MODEL-A','MODEL-B','MODEL-D','MODEL-E','MODEL-F'],'existing exact GS delivery or installation policy is retained');
 assert.equal(result.products.length,7,'all populated products remain inventory');
 const product=value=>result.products.find(item=>item.value===value);
 assert.equal(product('MODEL-A').delivery,'GS');assert.equal(product('MODEL-A').installer,'DT');
 assert.equal(product('MODEL-G').installer,'DT');assert.ok(!result.items.some(item=>item.value==='MODEL-G'),'connection GS is not installation');
 assert.equal(product('MULTI MODEL-C').installer,'Best/GS');
 assert.ok(!result.items.some(item=>item.value==='MULTI MODEL-C'),'ambiguous GS ownership is not accepted');
 assert.ok(result.warnings.some(message=>/otyd|tvetyd|bland|ansvar|GS/i.test(message)),'ambiguous responsibility is reported');
 assert.equal(product('MODEL-B').label,'Cylinder');
 assert.equal(product('MODEL-D').label,'Dörrstängare');
 assert.equal(product('MODEL-D').section,'Dörrstängning');
 assert.equal(product('MODEL-B').section,'Daglåsning');
 assert.ok(result.products.every(item=>!item.value.includes('CHECK REMARK')),'remarks stay out of product values');
 assert.ok(result.products.every(item=>item.value&&item.value!=='-'),'empty and dash values are excluded');
 assert.equal(product('MODEL-B').sourceRow,3,'virtual header does not shift real source row');
 assert.deepEqual(product('MODEL-B').sourceRows,[3]);
 assert.match(product('MODEL-B').sourceIdentity,/^gs:0:3:/,'stable source row remains part of identity');
 assert.equal(input.some(word=>word.text==='Produkt'),false,'actual words are not mutated');
 assert.deepEqual(input,snapshot,'profile does not mutate original word data');
}

// A recognized existing heading keeps every legacy result field and ownership rule.
const known=[w('Komponent',5,10),w('Produkt',170,10),...matrix()];
for(const opts of [normalizedOptions(known),{...normalizedOptions(matrix()),policy:'all'}])assert.deepEqual(read(opts),legacy.read(opts));
assert.deepEqual(read(normalizedOptions(known)).work,['MODEL-A','MODEL-B','MODEL-D','MODEL-E','MODEL-F'],'old GS delivery behavior is unchanged');

rejected(matrix().filter(word=>word.text!=='Ansl av'),'clipped connection heading');
rejected(matrix().filter(word=>word.text!=='Mont av'),'missing installation heading');
rejected([...matrix(),w('Fabrikat',170,10)],'unknown explicit product heading');
rejected(matrix().filter(word=>!['Daglåsning','Dörrstängning'].includes(word.text)),'missing section anchors');
rejected(matrix().map(word=>word.text==='Dörrstängning'?{...word,text:'Fristående block'}:word),'only one known section');
rejected([...headers,w('Daglåsning',5,30),...row('Cylinder','MODEL-X',50,'DT','GS'),w('Dörrstängning',5,70),...row('Dörrstängare','MODEL-Y',90,'DT','GS')],'only two populated body rows');
rejected([...matrix(),...headers.map(word=>({...word,y:270}))],'repeated matrix header without a separately verified body');
rejected([...matrix(),...matrix().filter(word=>word.x===170&&word.text!=='-').map(word=>({...word,text:'EXTRA',x:280,w:25}))],'competing repeated product-column boundaries');
rejected([...headers,...row('Rumsnamn','Värde ett',50,'DT','GS'),...row('Projekt','Värde två',70,'DT','GS'),...row('Datum','Värde tre',90,'DT','GS')],'unstructured two-column text');

console.log('PASS 9.98 blank-column profile: exact GS ownership; inventory and sections; stable rows; geometry transforms and fragmented headings; strict rejection; legacy unchanged');
