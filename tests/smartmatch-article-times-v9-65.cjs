'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-read-test-main-v9-65.js'),'utf8');
const context=vm.createContext({console,window:{localStorage:{getItem:()=>null}},smartProjectTimeConfig:{},
 projectProductName:item=>item.value||item.label||'',projectProductKey:s=>s.trim().toLowerCase(),canonicalProjectProduct:s=>s,
 materialIdentity:()=>'',loadMaterialSettings:()=>({}),foldMaterialText:s=>s.toLowerCase(),save:()=>{}});
vm.runInContext(source.slice(source.indexOf('const ARTICLE_TIME_CATALOG='),source.indexOf('function parseDurationInput(')),context);
const run=code=>vm.runInContext(code,context);
const time=(value,extra={})=>{context.item={label:'',value,...extra};return run('resolveItemMinutes(item)');};
assert.equal(run('ARTICLE_TIME_CATALOG.entries.length'),66);
for(const [article,minutes] of [['212-50',6],['222-50',6],['Step40',20],['step 90',20],['Step92',20],['6696',12],['2356',12],['draghandtag',60],['SW300',180],['Flatscan',90],['Batteri',60],['programväljare',30],['DC700',30],['DC700 AC',30],['DC640',60],['G460',120],['310-50 mikro',90],['310-50',6]])assert.equal(time(article).minutes,minutes,article);
for(const article of ['1 DC700','DC700 1','DC700 AC extra','212-650','220-650','DC400','835c-50'])assert.equal(time(article,{label:'Dörrstängare'}).minutes,null,article);
assert.equal(time('DC700',{minutes:45}).minutes,45);
assert.equal(time('DC700',{minutes:0}).minutes,0);
context.smartProjectTimeConfig={productMinutes:{dc700:77}};assert.equal(time('DC700',{minutes:45}).minutes,77);
context.smartProjectTimeConfig={minutes:{automation:480}};assert.equal(time('SW300').minutes,180);assert.equal(time('ED100').minutes,480);
context.smartProjectTimeConfig={};assert.equal(time('ED100').minutes,null);
context.canonicalProjectProduct=s=>s==='1 DC700'?'DC700':s;assert.equal(time('1 DC700').minutes,30);
assert.equal(time('DC700',{kind:'extra-time',minutes:55}).minutes,55);
context.smartProjectTimeConfig=JSON.parse(run('JSON.stringify({articleTimeCatalog:projectArticleTimeCatalog()})'));
assert.equal(time('SW300').minutes,180);assert.equal(context.smartProjectTimeConfig.articleTimeCatalog.entries.find(e=>e.article==='Step40').hours,.33);
context.smartProjectTimeConfig.articleTimeCatalog.entries.find(e=>e.article==='SW300').minutes=181;assert.equal(time('SW300').minutes,181,'saved PDF catalog is authoritative');
assert(source.includes('timeConfig:JSON.parse(JSON.stringify({...smartProjectTimeConfig,articleTimeCatalog:projectArticleTimeCatalog()}))'));
console.log('PASS: 66 catalog articles; minutes, variants, missing times, overrides, aliases and saved catalog');
