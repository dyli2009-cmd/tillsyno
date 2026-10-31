const assert=require('node:assert/strict');
const numbering=require('../security-manual-numbering.js');
for(const [code,step,expected]of [
 ['1037',1,'1038'],['1037',-1,'1036'],['u1033',1,'u1034'],['U1033',-1,'U1032'],
 ['U0099',1,'U0100'],['U0100',-1,'U0099'],['999',1,'1000'],['1000',-1,'999'],
 ['Entré 2 / U001',1,'Entré 2 / U002'],['D12-U009',-1,'D12-U008'],['U000',-1,null],
 ['99999999999999999999',1,'100000000000000000000'],['Entré',1,null],['12A',1,null],
 [' U1033 ',1,'U1034']
])assert.equal(numbering.next(code,step),expected,code+' '+step);
assert.equal(numbering.valid('Entré'),false);assert.equal(numbering.valid('U1033'),true);
console.log('PASS: numbering preserves prefixes, zero padding and exact integers; rejects missing digits and negative steps below zero.');
