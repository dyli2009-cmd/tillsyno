const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('project-workspace-smartmatch-v36-87.js','utf8');
function fn(name){const start=source.indexOf('function '+name+'(');const end=source.indexOf('\n}',start)+2;return source.slice(start,end)}
const context=vm.createContext({isAdministrativeWorkLine:()=>false,isGsWorkLine:()=>false,labHeaderRows:t=>t.items.length?[t.items.map(x=>x.text).join(' ')]:[]});
vm.runInContext(['groupLines','smartNormalizeCardLabel','smartRowDoorCode','smartTableCardIdentity','smartFirstCardIdentity'].map(fn).join('\n'),context);
function page(left,right='GS999',third=''){let items=[];function add(text,x,y){items.push({text,x,y,w:text.length*5,h:10})}add(left,30,700);add(right,200,700);if(third)add(third,500,700);for(let i=0;i<3;i++){add(['Låshus','Cylinder','Trycke'][i],30,680-i*20);add('Produkt '+i,200,680-i*20);if(third)add('Artikelnr 123',500,680-i*20)}return {items}}
for(const [raw,want] of [['GC1','GC1'],['GS2','GS2'],['GS 1','GS1'],['WC GS1 1','GS1'],['1','1'],['140 C','140C'],['A-105','A105']]){
 assert.equal(context.smartFirstCardIdentity(page(raw),800)?.code,want,raw);
 assert.equal(context.smartFirstCardIdentity(page(raw,'GS888','GS777'),800)?.code,want,raw+' three columns');
}
assert.equal(context.smartFirstCardIdentity(page('Komponent','GS2'),800),null,'right cell must not supply an ID');
assert.equal(context.smartFirstCardIdentity(page('GS1 GS2','GC3'),800),null,'ambiguous left cell must not use the right cell');
const split=page('GS','GS999');split.items[0].w=10;split.items.push({text:'1',x:45,y:700,w:5,h:10});
assert.equal(context.smartFirstCardIdentity(split,800)?.code,'GS1','split PDF fragments in the left cell');
const project=page('GC1');project.items.push({text:'PROJEKT SNIDAREN',x:30,y:770,w:95,h:10});
assert.equal(context.smartFirstCardIdentity(project,800)?.code,'GC1','project title above table');
assert.equal(fs.readFileSync('project-workspace-smartmatch-v36-87.html','utf8'),fs.readFileSync('project-workspace-smartmatch-test.html','utf8'));
console.log('First-left-cell regression cases passed.');

// Real PDF.js text fragments from all 15 Snidaren ID/metadata headers.
const fixturePath=fs.existsSync('tests/fixtures/snidaren-card-headers-v36-87.json')?'tests/fixtures/snidaren-card-headers-v36-87.json':'snidaren-card-header-fixtures.json';
for(const fixture of JSON.parse(fs.readFileSync(fixturePath,'utf8'))){
 assert.equal(context.smartFirstCardIdentity({items:fixture.items},842)?.code,fixture.expected,'Snidaren page '+fixture.page);
}
function emptyMetadata(left,right){return {items:[
 {text:left,x:70,y:780,w:left.length*5,h:9},
 ...(right?[{text:right,x:205,y:780,w:right.length*5,h:9}]:[]),
 {text:'Littera',x:73,y:765,w:22,h:7},
 {text:'Antal',x:75,y:758,w:17,h:7},
 {text:'Hängning',x:70,y:751,w:29,h:7}
]}}
for(const [raw,want] of [['GC1','GC1'],['GS 1','GS1'],['WC GS1 1','GS1'],['140 C','140C'],['A-105','A105']])
 assert.equal(context.smartFirstCardIdentity(emptyMetadata(raw,'GS999'),842)?.code,want,'empty metadata '+raw);
assert.equal(context.smartFirstCardIdentity(emptyMetadata('Komponent','GS2'),842),null,'no right-cell fallback with empty metadata');
assert.equal(context.smartFirstCardIdentity(emptyMetadata('GS1 GS2','GC3'),842),null,'no ambiguous left-cell fallback with empty metadata');
console.log('All 15 real PDF headers and empty-metadata regression cases passed.');
