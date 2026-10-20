'use strict';
// The fixture was extracted independently from the uploaded workbook's A/B
// cells and bold section headings. It contains no project quantities or totals.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/product-catalog-mangdning-v9-79.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'smartmatch-read-test-main-v9-80.js'),'utf8');
const marker='const ARTICLE_TIME_CATALOG=';
const start=source.indexOf(marker);
assert(start>=0,'built-in product catalogue exists');
assert.equal(source.indexOf(marker,start+marker.length),-1,'one built-in catalogue');
const end=source.indexOf(';\n',start);
assert(end>start,'catalogue JSON is terminated');
const catalog=JSON.parse(source.slice(start+marker.length,end));
const identity=article=>String(article).normalize('NFKC').toLocaleLowerCase('sv').replace(/\s+/g,' ').trim();

assert.deepEqual(Object.keys(fixture).sort(),['sourceFile','sheet','sha256','sourceUnit','rows'].sort());
assert.equal(fixture.sourceFile,'mängdning.xlsx');
assert.equal(fixture.sheet,'Blad1');
assert.equal(fixture.sha256,'d00b989d0df7e2a890ddda87bbe5dadf3ff2c1f5390dc603d3eda30327f91d1e');
assert.equal(fixture.sourceUnit,'decimal_hours');
assert.equal(fixture.rows.length,67,'all original product rows, including the duplicate');
const expected=new Map();
for(const row of fixture.rows){
 assert.deepEqual(Object.keys(row).sort(),['row','article','category','hours'].sort(),'fixture contains only catalogue data');
 assert(Number.isInteger(row.row)&&row.row>=15&&row.row<=91);
 assert(row.article&&row.category);
 assert(row.hours===null||typeof row.hours==='number');
 const key=identity(row.article);
 if(expected.has(key)){
  const original=expected.get(key);
  assert.equal(row.hours,original.hours,'duplicate source times agree');
  original.origins.push(row);
 }else expected.set(key,{...row,origins:[row]});
}
assert.equal(expected.size,66,'case-insensitive source product count');
assert.equal([...expected.values()].filter(row=>row.hours!==null).length,65);
const duplicates=[...expected.values()].filter(row=>row.origins.length>1);
assert.equal(duplicates.length,1);
assert.equal(duplicates[0].article,'Dörrtillslutare');
assert.deepEqual(duplicates[0].origins.map(row=>row.row),[85,91]);
assert.deepEqual(duplicates[0].origins.map(row=>row.article),['Dörrtillslutare','dörrtillslutare']);
assert.deepEqual(duplicates[0].origins.map(row=>row.category),['Dörrstängning','Övrigt']);
assert.equal(duplicates[0].hours,1);

assert.equal(catalog.schema,1);
assert.equal(catalog.unit,'minutes');
assert.match(catalog.conversion,/avrundat till hela minuter/,'existing whole-minute import contract is explicit');
assert.equal(catalog.entries.length,66);
const seen=new Set();
for(const actual of catalog.entries){
 const key=identity(actual.article),row=expected.get(key);
 assert(row,'unexpected built-in product: '+actual.article);
 assert(!seen.has(key),'duplicate built-in product: '+actual.article);
 seen.add(key);
 assert.equal(actual.article,row.article,'first source spelling retained');
 assert.equal(actual.category,row.category,'first source category for '+row.article);
 assert.equal(actual.sourceCell,'B'+row.row,'source time cell for '+row.article);
 assert.equal(actual.hours,row.hours,'raw decimal source hours for '+row.article);
 assert.equal(actual.minutes,row.hours===null?null:Math.round(row.hours*60),'whole minutes for '+row.article);
}
assert.equal(seen.size,expected.size,'no source products omitted, including zero-quantity products');
const missing=catalog.entries.filter(row=>row.hours===null);
assert.deepEqual(missing.map(row=>[row.article,row.sourceCell,row.minutes]),[['835c-50','B51',null]],'missing time stays unspecified');
const rounded=catalog.entries.filter(row=>row.hours===0.33);
assert.equal(rounded.length,5,'all five original 0.33-hour factors retained');
assert.deepEqual(rounded.map(row=>row.article),['Step40','Step90','Step92','EA281','AK']);
assert(rounded.every(row=>row.minutes===20),'round only the converted whole-minute value, retaining raw 0.33 hours');
for(const [article,minutes]of [['212-50',6],['256',12],['SW300',180],['Flatscan',90],['Magnetkontakt',30]])
 assert.equal(catalog.entries.find(row=>row.article===article)?.minutes,minutes,article+' hour/minute conversion');
console.log('PASS: Excel source parity for all 67 rows / 66 unique products, 65 known times, source cells/categories/raw hours, duplicate origins, unspecified 835c-50 and explicit whole-minute conversion; fixture excludes project quantities/totals.');

