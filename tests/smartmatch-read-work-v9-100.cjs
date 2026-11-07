/* Generated sparse-card regression: explicit dash cells establish geometry,
 * while only real product values with verified GS ownership become work. */
'use strict';
const assert=require('node:assert/strict');
const previous=require('../smartmatch-read-work-v9-99.js');
const {read}=require('../smartmatch-read-work-v9-100.js');
const w=(text,x,y,width=Math.max(4,text.length*5))=>({text,x,y,w:width,h:10});
const owners=()=>[w('Lev av',400,10),w('Mont av',450,10)];
const row=(label,value,y,delivery='',installer='')=>[w(label,5,y),...(value!==null?[w(value,170,y)]:[]),...(delivery?[w(delivery,400,y)]:[]),...(installer?[w(installer,450,y)]:[])];
const sparse=()=>[
 ...owners(),w('Daglåsning',5,30),...row('Låshus','-',50),...row('Slutbleck','-',70),...row('Cylinder','MODEL-S42',90,'GS','GS'),
 w('Nattlåsning',5,120),...row('Låshus natt','-',140),...row('Nattbehör','-',160),
 w('Dörrstängning',5,190),...row('Dörrstängare','-',210),...row('Stängningsarm','-',230),
 w('Larm/Passer',5,260),...row('Magnetkontakt','-',280)
];
const options=words=>({words,text:words.map(word=>word.text).join('\n'),policy:'gs'});
const transformValue=(words,value)=>words.map(word=>word.text==='MODEL-S42'?{...word,text:value,w:Math.max(4,value.length*5)}:word);
const transforms=[
 words=>words,
 words=>words.reverse(),
 words=>words.map(word=>({...word,x:word.x*1.65+41,y:word.y*1.65+77,w:word.w*1.65,h:word.h*1.65})),
 words=>words.flatMap(word=>word.y===10&&word.text.includes(' ')?word.text.split(' ').map((text,index,parts)=>w(text,word.x+parts.slice(0,index).join(' ').length*5+(index?5:0),word.y)):word)
];
for(const transform of transforms){
 const input=transform(sparse()),before=structuredClone(input);
 assert.equal(previous.read(options(input)).resolved,false,'9.99 fails when the table has only one populated model');
 const result=read(options(input));
 assert.equal(result.resolved,true,'explicit dash cells provide column evidence for a sparse card');
 assert.deepEqual(result.work,['MODEL-S42']);assert.equal(result.products.length,1);assert.equal(result.items.length,1);
 assert.equal(result.items[0].label,'Cylinder');assert.equal(result.items[0].section,'Daglåsning');
 assert.equal(result.items[0].installer,'GS');assert.equal(result.items[0].delivery,'GS');
 assert.equal(result.items[0].sourceRow,4);assert.deepEqual(result.items[0].sourceRows,[4]);
 assert.match(result.items[0].sourceIdentity,/^gs:0:4:/);
 assert.deepEqual(input,before,'input text, coordinates and metadata are never changed');
 assert.ok(result.products.every(item=>item.value&&item.value!=='-'),'dash cells do not become inventory');
}

const numeric=read(options(transformValue(sparse(),'5274')));
assert.equal(numeric.resolved,true);assert.deepEqual(numeric.work,['5274']);
assert.equal(numeric.products.length,1);assert.equal(numeric.items[0].label,'Cylinder');

// Delivery or montage chooses a real product once; ambiguous or other owners do not.
for(const [delivery,installer,count]of [['GS','DT',1],['DT','GS',1],['GS','GS',1],['DT','DT',0],['Best/GS','Best/GS',0],['','GS',1]]){
 const input=sparse().map(word=>word.y===90&&word.x===400?{...word,text:delivery}:word.y===90&&word.x===450?{...word,text:installer}:word).filter(word=>word.text);
 const result=read(options(input));assert.equal(result.resolved,true);assert.equal(result.products.length,1);assert.equal(result.items.length,count);assert.equal(result.work.length,count);
 if(installer==='Best/GS')assert.ok(result.warnings.some(warning=>/otydligt/.test(warning)),'ambiguous GS is still reported');
}
const onlyConnection=[...sparse().map(word=>word.y===90&&(word.x===400||word.x===450)?{...word,text:'DT'}:word),w('Ansl av',510,10),w('GS',510,90)];
assert.equal(read(options(onlyConnection)).products.length,1);assert.deepEqual(read(options(onlyConnection)).work,[],'GS in a connection column does not create work');

const allMissing=transformValue(sparse(),'-'),emptyResult=read(options(allMissing));
assert.equal(emptyResult.resolved,true,'a verified table with explicit dash cells can have zero products');
assert.deepEqual(emptyResult.work,[]);assert.deepEqual(emptyResult.items,[]);assert.deepEqual(emptyResult.products,[]);
assert.ok(emptyResult.warnings.some(warning=>/streck|produkt/.test(warning)),'GS dash row is not silently turned into a point');

const twoCopies=sparse().map(word=>word.y===140&&word.x===170?{...word,text:'MODEL-S42',w:45}:word).concat(w('GS',450,140));
assert.equal(previous.read(options(twoCopies)).resolved,false,'two actual models are still below 9.99 minimum');
const duplicated=read(options(twoCopies));assert.deepEqual(duplicated.work,['MODEL-S42','MODEL-S42']);assert.equal(new Set(duplicated.items.map(item=>item.sourceIdentity)).size,2,'equal models on different physical rows keep separate control identities');
assert.deepEqual(duplicated.items.map(item=>item.section),['Daglåsning','Nattlåsning']);

// Exactly three repeated cells and two known sections are enough; the last section may be empty.
const minimum=[...owners(),w('Daglåsning',5,30),...row('Låshus','-',50),...row('Cylinder','MODEL-MIN',70,'GS','GS'),...row('Behör','-',90),w('Larm/Passer',5,120)];
assert.equal(read(options(minimum)).resolved,true);assert.deepEqual(read(options(minimum)).work,['MODEL-MIN']);

function sameAsPrevious(words,label){const input=options(words);assert.deepEqual(read(input),previous.read(input),label);}
// Sparse fallback deliberately rejects fragmented component boxes which could
// instead be a hidden real model before the inferred product boundary.
const splitLabel=sparse().flatMap(word=>word.text==='Magnetkontakt'?[w('Magnet',word.x,word.y,30),w('kontakt',word.x+32,word.y,35)]:word);
sameAsPrevious(splitLabel,'ambiguous component fragments are not silently treated as one label');
const tightLabel=sparse().map(word=>word.y===90&&word.x===5?{...word,w:160}:word);
assert.equal(read(options(tightLabel)).resolved,true,'one tight component box is safe when the real product shares the verified dash column');
assert.deepEqual(read(options(tightLabel)).work,['MODEL-S42']);
const implicitBlank=[...sparse(),w('Implicit blank',5,310,70)];
assert.equal(read(options(implicitBlank)).resolved,true,'a single component box may have a genuinely empty product cell');
assert.deepEqual(read(options(implicitBlank)).work,['MODEL-S42']);assert.equal(read(options(implicitBlank)).products.length,1);
const numericPrefix=[...sparse(),w('6',0,90,3)];
assert.equal(read(options(numericPrefix)).resolved,true,'an optional numeric row index is not a second component/model box');
assert.deepEqual(read(options(numericPrefix)).work,['MODEL-S42']);assert.equal(read(options(numericPrefix)).items[0].label,'Cylinder');

const dense=sparse().map(word=>word.x===170&&word.y===50?{...word,text:'MODEL-A',w:35}:word.x===170&&word.y===70?{...word,text:'MODEL-B',w:35}:word);
assert.equal(previous.read(options(dense)).resolved,true);sameAsPrevious(dense,'existing successful 9.99 profile remains exactly unchanged');
sameAsPrevious([...sparse(),w('Komponent',5,10),w('Produkt',170,10)],'existing headed sparse table remains unchanged');
const all=options(sparse());all.policy='all';assert.deepEqual(read(all),previous.read(all),'explicit all-rows policy remains unchanged');

// Insufficient or conflicting structure must keep the original unresolved result.
sameAsPrevious(sparse().filter(word=>word.text!=='Mont av'),'missing montage heading');
sameAsPrevious(sparse().filter(word=>word.text!=='Lev av'),'missing delivery heading');
sameAsPrevious(sparse().map(word=>word.text==='Lev av'?{...word,x:450}:word.text==='Mont av'?{...word,x:400}:word),'reversed owner headings');
sameAsPrevious([...sparse(),w('Fabrikat',170,10)],'unknown explicit product heading');
sameAsPrevious(sparse().filter(word=>!['Daglåsning','Nattlåsning','Dörrstängning','Larm/Passer'].includes(word.text)),'missing sections');
sameAsPrevious(sparse().filter(word=>!['Nattlåsning','Dörrstängning','Larm/Passer'].includes(word.text)),'only one section');
sameAsPrevious([...owners(),w('Daglåsning',5,30),...row('Cylinder','MODEL-ONLY',50,'GS','GS'),w('Larm/Passer',5,80)],'one populated row without repeated cell evidence');
sameAsPrevious(sparse().filter(word=>word.text!=='-'),'empty locations without explicit placeholder words');
sameAsPrevious([...sparse(),...owners().map(word=>({...word,y:320}))],'repeated matrix');
sameAsPrevious([...sparse(),...owners().map(word=>({...word,x:word.x+400}))],'side by side owner matrices');
sameAsPrevious([...sparse(),w('Mont av',510,10)],'competing montage columns');
sameAsPrevious([...sparse(),...sparse().filter(word=>word.x===170).map(word=>({...word,x:280,text:'ALT',w:15}))],'competing repeated product columns');
// A dash-only column must not hide a real model in an earlier column.
const earlierModel=sparse().map(word=>word.x===170&&word.text==='-'?{...word,x:250}:word);
sameAsPrevious(earlierModel,'dash-column evidence cannot move the product boundary past an actual earlier model');
const commentInsteadOfProduct=sparse().map(word=>word.x===170&&word.text==='-'?{...word,x:250}:word).concat(w('COMMENT',250,90,35));
sameAsPrevious(commentInsteadOfProduct,'a later notes cluster cannot replace the real product column');
for(const width of [160,161]){
 const tightEarlier=earlierModel.map(word=>word.y===90&&word.x===5?{...word,w:width}:word);
 sameAsPrevious(tightEarlier,'raw rows reject a real earlier model even when its component gap is only '+(165-width)+' pixels');
 const tightWithComment=[...tightEarlier,w('COMMENT',250,90,35)];
 sameAsPrevious(tightWithComment,'a tight earlier model must not become a label while a later comment becomes its product');
}

sameAsPrevious([], 'empty words are not a table');
console.log('PASS 9.100: one/zero populated products; explicit dash geometry; exact GS ownership; source rows and duplicated identities; old profiles unchanged; strict rejection');
