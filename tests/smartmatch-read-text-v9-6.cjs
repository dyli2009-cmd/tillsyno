'use strict';
const assert=require('node:assert/strict');
const {joinNativeContent}=require('../smartmatch-read-text-v9-6.js');
const codes=require('../smartmatch-read-codes-v9-6.js');
const item=(str,x,y=100,extra={})=>({str,transform:[10,0,0,10,x,y],width:str.length*5,height:10,dir:'ltr',fontName:'regular',hasEOL:false,...extra});
let input={items:[item('D',10),item('ö',15,100,{fontName:'fallback'}),item('rrkort Å12',20)]};
const original=JSON.stringify(input),result=joinNativeContent(input);
assert.equal(result.items[0].str,'Dörrkort Å12');assert.equal(result.items.length,1);assert.equal(JSON.stringify(input),original,'source PDF items are not mutated');assert.equal(codes.normalize(result.items[0].str),'Å12');
for(const text of ['Dörrstängare','Karmöverföring','Öppningsknapp','Säkerhetsglas','Ångrum','étiquette','Ventil Ö12']){
 const parts=[...text];let x=0;const items=parts.map(str=>{const value=item(str,x);x+=value.width;return value});
 assert.equal(joinNativeContent({items}).items.map(i=>i.str).join(''),text);
}
assert.equal(joinNativeContent({items:[item('A',0),item('\u030a',5,100,{width:0}),item('12',5)]}).items[0].str,'Å12','decomposed Unicode survives font splitting');
for(const next of [item('B',20),item('B',5,112),item('B',5,100,{height:20}),item('B',5,100,{dir:'rtl'}),item('B',5,100,{transform:[0,10,-10,0,5,100]}),item('B',-1),item('B',3)]){
 assert.equal(joinNativeContent({items:[item('A',0),next]}).items.length,2,'do not merge spaces, rows, columns, orientations or overlapping duplicates');
}
for(const items of [[item('A ',0),item('B',10)],[item('A',0),item(' B',5)],[item('A',0),item(' ',5),item('B',10)],[item('A',0,100,{hasEOL:true}),item('B',5)]])assert.equal(joinNativeContent({items}).items.length,items.length,'explicit PDF spaces and line endings are preserved');
const rotated=[item('D',100,0,{transform:[0,10,-10,0,100,0]}),item('ö',100,5,{transform:[0,10,-10,0,100,5]}),item('rr',100,10,{transform:[0,10,-10,0,100,10]})];
assert.equal(joinNativeContent({items:rotated}).items[0].str,'Dörr');
for(const [raw,expected]of [['D ö rrkort 140C','140C'],['D ö rrkort VC','VC'],['D ö r r k o r t: Valfri Å12','VALFRIÅ12'],['B e s l a g s k o d: DBLB UPPST','DBLBUPPST'],['Dörrkort ÅNG 23','ÅNG23'],['Dörrkort: Säker dörr','SÄKERDÖRR'],['ÖST Å12','ÖSTÅ12'],['STÄD','STÄD'],['STAD','STAD'],['D ö rrkort',''],['Rumsnamn Å12','RUMSNAMNÅ12']])assert.equal(codes.normalize(raw),expected,raw);
assert.notEqual(codes.normalize('STÄD'),codes.normalize('STAD'));assert.notEqual(codes.normalize('ÖST12'),codes.normalize('OST12'));assert.notEqual(codes.normalize('DBLB UPPST'),codes.normalize('DBLB UPPSTD'));
assert.equal(codes.normalize('140C / 150C'),'');assert.deepEqual(codes.candidates('D ö rrkort: 140C / 150C'),['140C','150C']);
console.log('PASS native Swedish/Unicode text rejoins by geometry; spaces, columns, rotation and distinct names are protected; fragmented known headings leave arbitrary full identities');
