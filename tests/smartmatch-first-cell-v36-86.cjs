const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('project-workspace-smartmatch-v36-86.js','utf8');
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
assert.equal(fs.readFileSync('project-workspace-smartmatch-v36-86.html','utf8'),fs.readFileSync('project-workspace-smartmatch-test.html','utf8'));
console.log('First-left-cell regression cases passed.');
