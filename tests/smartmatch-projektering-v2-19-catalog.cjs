'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=path.join(__dirname,'../smartmatch-projektering-v2-19-catalog.js');
const C=require(source);
const masterPath='/workspace/outputs/Produktregister_med_montagetider_master.json';
const categories=new Set(['lock','cylinder-fittings','strike','handle','pull','escape','cable','cylinder','closer','closer-arm','operator','sensor','activation','coordinator','bolt','magnet','reader','controller','battery','hold-open-magnet','door-stop','door-puller','preparation','microswitch','key','program-selector','sliding-sensor','espagnolette','power-supply','hold-open-accessory','opening-radar','reference']);
assert.deepEqual(C.stats,{entries:367,products:362,reference:5,provided:65,estimated:302});
assert.equal(C.products.length,362);assert.equal(C.entries.length,367);assert.equal(C.categories.length,32);
for(const e of C.entries){
 assert(categories.has(e.category),e.category);
 assert(e.name&&e.name.length<=160);
 assert.equal(typeof e.manufacturer,'string');
 assert(Number.isFinite(e.minutes)&&e.minutes>0);
 assert(['provided','estimated'].includes(e.origin));
 assert(['st','sats'].includes(e.unit));
 assert(['product','work','reference'].includes(e.kind));
 assert.equal(C.find(e.category,e.name,{includeReference:true}),e);
 assert.equal(C.getEntry(e.id),e);
 if(e.origin==='estimated'){assert(Number.isFinite(e.lowMinutes)&&Number.isFinite(e.highMinutes));assert(e.lowMinutes<=e.minutes&&e.minutes<=e.highMinutes);}
 else{assert.equal(e.lowMinutes,null);assert.equal(e.highMinutes,null);}
 for(const url of e.sources)assert.equal(new URL(url).protocol,'https:');
 assert(Object.isFrozen(e));assert(Object.isFrozen(e.sources));
}
for(const p of C.products){assert.deepEqual(Object.keys(p).sort(),['category','description','id','name']);assert.equal(p.description,'');assert(Object.isFrozen(p));}
assert(Object.isFrozen(C));assert(Object.isFrozen(C.products));assert(Object.isFrozen(C.entries));
assert.equal(C.getTime('lock','212-50').minutes,6);
assert.equal(C.getTime('lock','410-50').minutes,90);
assert.equal(C.getTime('lock','410-50').origin,'provided');
assert.equal(C.getTime('lock','410-50').requiresReview,true);
assert.equal(C.getTime('cable','ea281').minutes,19.8);
assert.equal(C.getTime('activation','AK').minutes,19.8,'one physicalcontact; no hidden doubling');
assert.equal(C.getTime('lock','M22M').minutes,90,'integratedmicro estimate');
assert.equal(C.getTime('lock','E32M').minutes,90);
assert.equal(C.getTime('closer','BTS80').minutes,120);
assert.equal(C.getTime('closer','RTS85').minutes,120);
assert.equal(C.getTime('closer','ITS96').minutes,120);
for(const name of ['TS73 EMF','TS99','TS5000 E','TS5000 EFS 3-6','TS5000 R'])assert.equal(C.getTime('closer',name).minutes,60);
assert.equal(C.getTime('closer','TS98 XEA').minutes,30,'XEA alone is notfree swing');
assert.equal(C.getTime('cylinder','1302').minutes,12);assert.equal(C.getTime('cylinder','1302').unit,'sats');
assert.equal(C.getTime('cylinder-fittings','9565T-2').minutes,30);assert(C.getTime('cylinder-fittings','9565T-2').note.includes('draghandtag'));
assert.equal(C.getTime('closer-arm','G460').minutes,120);assert.equal(C.getTime('coordinator','G460'),null);
assert.equal(C.getTime('preparation','Förberedelse nattlås').kind,'work');
assert.equal(C.getTime('battery','Batteri').minutes,60);
assert.equal(C.getTime('opening-radar','EAGLE ARTEK').minutes,30);
assert.equal(C.getTime('sensor','EAGLE ARTEK'),null,'radar is notsafetysensor');
assert.equal(C.getTime('lock','  ｅｌ５８０  ').minutes,90,'NFKC+case normalization');
assert.equal(C.getTime('lock','EL 580'),null,'differentmodeltext is notfuzzymerged');
assert.equal(C.getTime('lock','310-50 MA'),null,'mechanicdoesnotmatchunlistedmicrosuffix');
assert.equal(C.getTime('lock','310-50 Mikro').minutes,90);
assert.equal(C.getTime('strike','EL580'),null,'categories arestrict');
assert.equal(C.canonicalName('coordinator','SR 390'),'SR390');
assert.equal(C.getTime('coordinator','SR 390'),C.getTime('coordinator','SR390'),'explicitoldbundledspacingalias');
assert.equal(C.getTime('coordinator','SR  390'),C.getTime('coordinator','SR390'));
assert.equal(C.getTime('coordinator','SR 392'),null,'theknown390aliasdoesnotgeneralize');
assert.equal(C.getTime('closer','SR 390'),null,'theknown390aliasiscategoryscoped');
assert.equal(C.canonicalName('lock','SL 620'),'SL 620','noothermodelspacingisrewritten');
assert.equal(C.getTime('closer-arm','TS5000 ECline'),null,'wrongoldcategorydoesnotborrowdefaulttime');
assert.match(C.getCategoryWarning('closer-arm','TS5000 ECline'),/dörrstängare/);
assert.match(C.getCategoryWarning('closer-arm','TS 5000 ECline'),/kategori/);
assert.equal(C.getCategoryWarning('closer','TS5000 ECline'),'','correctcategoryneedsnowarning');
assert.equal(C.getCategoryWarning('closer-arm','TS5000 E'),'','warningisnotgeneralmodelguessing');
for(const name of ['RCO','Aptus','ARX','Axema']){
 assert.equal(C.getTime('reader',name),null);assert.equal(C.find('reader',name,{includeReference:true}).selectable,false);
}
assert.equal(C.getTime('reference','9605'),null);assert.equal(C.getEntry('unknown'),null);
const starts=C.list({category:'lock',query:'S'});assert(starts.length>10);assert(starts.slice(0,4).every(e=>e.name.toUpperCase().startsWith('S')));
assert.equal(C.list({includeReference:true}).length,367);assert.equal(C.list().length,362);
assert.equal(C.list({category:'reader'}).length,0);assert.equal(C.list({category:'reader',includeReference:true}).length,4);
// Check every generated row against the reviewed master when the input artifact
// is present. This is optional in other checkouts; fixed regressions above remain.
if(fs.existsSync(masterPath)){
 const master=JSON.parse(fs.readFileSync(masterPath,'utf8'));
 for(const p of master.products){const e=C.getEntry(p.id);assert(e,p.model);assert.equal(e.name,p.model);assert.equal(e.manufacturer,p.manufacturer);assert.equal(e.minutes,p.minutes);assert.equal(e.origin,p.time_origin==='Din tidsfil'?'provided':'estimated');assert.equal(e.requiresReview,p.requires_review);assert.equal(e.unit,p.unit);assert.deepEqual(e.sources,p.sources);}
}
// Browser loading has no dependency on the DOM, network, auth, or model module.
const context={window:{},Intl,Map,Set,URL,fetch(){throw Error('Network not allowed');}};
vm.runInNewContext(fs.readFileSync(source,'utf8'),context);
assert.equal(context.window.Proj2Catalog.stats.entries,367);
assert.equal(context.window.Proj2Catalog.getTime('lock','212-50').minutes,6);
assert.equal(context.window.Proj2Catalog.getTime('coordinator','SR 390').name,'SR390');
assert(fs.statSync(source).size<150000,'compact register avoids shippingfull571KBmaster');
console.log('PASS catalog2.19: all367source-backedrecords,362selectabletypes, exactprovided/estimatedtimes, reviewedsubtypes, strictmatching, frozenmetadata, prefixsearch and browser/no-networkload.');
