'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const copy=value=>JSON.parse(JSON.stringify(value));
const normalize=value=>String(value||'').normalize('NFC').toUpperCase().replace(/[\s/_.-]+/g,'');
function load(version){
 const storage=new Map(),window={addEventListener(){},SmartMatchAppBridge:{normalizeCardLabel:normalize,getPdf:()=>({numPages:80})}};
 const context={window,document:{currentScript:{src:'http://local/smartmatch-read-test-v'+version+'.js'},getElementById(){return null;}},URL,crypto:crypto.webcrypto,localStorage:{setItem:(key,value)=>storage.set(key,value)},console};
 vm.runInNewContext(fs.readFileSync(require.resolve('../smartmatch-read-test-v'+version+'.js'),'utf8'),context);
 return window.SmartMatchReadTest;
}
const reader=load('9-9'),oldReader=load('9-8');
const codeRect={x:.1,y:.1,w:.5,h:.1},tableRect={x:.1,y:.3,w:.7,h:.5};
function card(id,page,code,product){return {id,page,code,originalCardCode:code,codeRect,tableRect,header:'Beslagskod: '+code,work:[product],workItems:[{key:'same-row-key',text:product,label:'Lås',value:product}],workState:'ready',workPolicy:'all'};}
function hit(page,code,x,id){return {page,code,rect:[x,100,x+10,110],box:{x:x/500,y:.1,w:.02,h:.01},selected:true,positionId:id};}
const initial={schema:1,phase:'full',sourceId:'partial-fixture',rects:{code:codeRect,table:tableRect},pages:[8,20],cards:{wc:card('wc',8,'WC','WC-produkt'),gs:card('gs',20,'GS23','GS-produkt')},checks:{p1:{'same-row-key':true},p2:{'same-row-key':false}},matching:{version:2,hits:[hit(1,'WC',10,'p1'),hit(2,'GS23',20,'p2')],review:{version:1,approved:true}}};
assert.equal(reader.canOpenSavedProject(initial,80),true,'ordinary TEST 9.8 snapshots still open');
const partial={...copy(initial),schema:2,pages:[8,20,51,52],deferredCards:{
 missing:{...card('missing',51,'','Saved unresolved product'),deferred:true,deferredReasons:['Beteckning saknas']},
 duplicate:{...card('duplicate',52,'GS23','Duplicate-page product'),deferred:true,deferredReasons:['Beteckningen finns på flera kort']}
},pageOverrides:{51:{code:{x:.12,y:.1,w:.5,h:.1}}},cardOverrides:{duplicate:{code:{x:.13,y:.1,w:.5,h:.1}}},removedReadPositions:[{id:'deleted',page:1,code:'WC',rect:[20,100,30,110]}]};
assert.equal(reader.canOpenSavedProject(partial,80),true,'a missing code and duplicate GS23 do not block a reviewed partial project');
assert.equal(oldReader.canOpenSavedProject(partial,80),false,'older readers must reject a new partial snapshot instead of silently dropping deferred cards');
reader.restoreReadData(partial);
assert.deepEqual(copy(reader.payload()),partial,'restoring retains unresolved cards, work, overrides, checks and deletion tombstones');
assert.deepEqual(copy(reader.getAllCardPages()),[8,20,51,52]);
assert.equal(reader.getDeferredCardCount(),2);
assert.equal(reader.isCardPage(51),true,'unresolved door cards remain door-card pages, never drawing-search pages');
assert.equal(reader.identityForPage(51),null,'an unresolved code must not become a guessed identity');
assert.deepEqual(copy(reader.drawingSelection().codes).sort(),['GS23','WC']);
assert.equal(reader.cardFor('GS23',20).id,'gs');
assert.equal(reader.cardFor('GS23',52),null,'duplicate pages do not arbitrarily replace the selected GS23 card');
assert.equal(reader.protocolDef('GS23',20).lines[0].text,'GS-produkt');
assert.deepEqual(copy(reader.payload().checks),initial.checks);
const serialized=JSON.parse(JSON.stringify(reader.payload()));
assert.equal(reader.canOpenSavedProject(serialized,80),true,'the portable JSON round trip remains directly openable');
reader.restoreReadData(serialized);
assert.equal(reader.getDeferredCardCount(),2);
assert.equal(reader.getRemovedReadPositions()[0].id,'deleted');
const onlyDeferred={...copy(partial),cards:{},pages:[51,52],matching:{version:2,hits:[],review:{version:1,approved:true}}};
assert.equal(reader.canOpenSavedProject(onlyDeferred,80),true,'even zero matches can be saved for manual completion without losing the unresolved pages');
reader.restoreReadData(onlyDeferred);
assert.equal(reader.getDeferredCardCount(),2);
assert.deepEqual(copy(reader.drawingSelection().positions),[]);
assert.deepEqual(copy(reader.drawingSelection().codes),[]);
const pendingWork={...copy(initial),schema:2,pendingWorkCards:{wc:{...copy(initial.cards.wc),work:['Uncertain replacement product'],workReadError:true,deferred:true,deferredReasons:['Produktläsningen behöver rättas']}}};
assert.equal(reader.canOpenSavedProject(pendingWork,80),true,'a failed product update can be saved separately from the live reviewed card');
assert.equal(oldReader.canOpenSavedProject(pendingWork,80),false,'older readers must not silently lose the pending product retry');
reader.restoreReadData(pendingWork);
assert.equal(reader.getDeferredCardCount(),1);
assert.equal(reader.hasPendingProducts(),true);
assert.equal(reader.protocolDef('WC',8).lines[0].text,'WC-produkt','an uncertain replacement never empties or overwrites the earlier working checklist');
assert.deepEqual(copy(reader.payload().checks),initial.checks);
assert.equal(reader.payload().pendingWorkCards.wc.work[0],'Uncertain replacement product');
const deferredMapping={...copy(partial),deferredGroupMappings:{OLDGROUP:{code:'OLDGROUP',sourceCardId:'duplicate',cardPage:52,originalCardCode:'GS23',drawingLabel:'Old group'}}};
assert.equal(reader.canOpenSavedProject(deferredMapping,80),true,'a group whose source is deferred remains archived rather than pointing at another card');
reader.restoreReadData(deferredMapping);
assert.equal(reader.cardFor('OLDGROUP',52),null);
assert.deepEqual(copy(reader.payload().deferredGroupMappings),deferredMapping.deferredGroupMappings);
for(const [reason,mutate]of[
 ['deferred page masquerades as drawing page',data=>data.matching.hits.push(hit(51,'WC',30,'bad-page'))],
 ['deferred-only code gets linked',data=>{data.deferredCards.missing.code='DBL';data.matching.hits.push(hit(1,'DBL',30,'bad-code'));}],
 ['active/deferred IDs collide',data=>{data.deferredCards.missing.id='wc';}],
 ['deferred IDs collide',data=>{data.deferredCards.missing.id='duplicate';}],
 ['deferred page missing from page list',data=>{data.pages=data.pages.filter(page=>page!==51);}],
 ['page list names unknown card',data=>{data.pages.push(60);}],
 ['deferred page outside PDF',data=>{data.deferredCards.missing.page=81;data.pages=data.pages.map(page=>page===51?81:page);}],
 ['deferred code is not normalized',data=>{data.deferredCards.missing.code='dbl';}],
 ['deferred area lies outside page',data=>{data.deferredCards.missing.codeRect={x:.9,y:.1,w:.5,h:.1};}],
 ['deferred text is not an array of strings',data=>{data.deferredCards.missing.work=[{}];}],
 ['deferred reasons are not text',data=>{data.deferredCards.missing.deferredReasons=[false];}],
 ['deferred override targets absent card',data=>{data.cardOverrides.unknown={code:codeRect};}],
 ['live duplicate is not silently made unique',data=>{data.cards.gs.code='WC';}],
 ['unapproved partial search',data=>{data.matching.review.approved=false;}]
]){
 const invalid=copy(partial);mutate(invalid);
 assert.equal(reader.canOpenSavedProject(invalid,80),false,reason);
}
for(const [reason,fixture,mutate]of[
 ['partial data cannot masquerade as legacy schema',partial,data=>{data.schema=1;}],
 ['pending work must name a live card',pendingWork,data=>{data.pendingWorkCards.wc.id='unknown';}],
 ['pending work cannot change the source page',pendingWork,data=>{data.pendingWorkCards.wc.page=52;}],
 ['pending work cannot change the source code',pendingWork,data=>{data.pendingWorkCards.wc.code='GS23';}],
 ['pending work must have a readable table area',pendingWork,data=>{data.pendingWorkCards.wc.tableRect=null;}],
 ['pending work must retain string rows',pendingWork,data=>{data.pendingWorkCards.wc.work=[{}];}],
 ['pending work cannot be downgraded to legacy schema',pendingWork,data=>{data.schema=1;}],
 ['deferred group must retain a known source',deferredMapping,data=>{data.deferredGroupMappings.OLDGROUP.sourceCardId='unknown';}],
 ['deferred group cannot claim another source page',deferredMapping,data=>{data.deferredGroupMappings.OLDGROUP.cardPage=8;}],
 ['deferred group and live group cannot share a key',deferredMapping,data=>{data.groupMappings={OLDGROUP:{code:'OLDGROUP',sourceCardId:'wc',cardPage:8,originalCardCode:'WC',drawingLabel:'Old group'}};}]
]){
 const invalid=copy(fixture);mutate(invalid);
 assert.equal(reader.canOpenSavedProject(invalid,80),false,reason);
}
reader.restoreReadData(partial);
const before=JSON.stringify(reader.payload());
assert.throws(()=>reader.updateGroupMapping({oldCode:'GS23',code:'NY',drawingLabel:'NY',cardPage:52,cardCode:'GS23'}),/exakt/,'deferred duplicate cannot be used as an implicit group target');
assert.equal(JSON.stringify(reader.payload()),before,'failed remapping never mutates saved partial work');
console.log('PASS TEST 9.9 partial metadata: unresolved/duplicate cards, deferred-page exclusion, portable round trip, safe failed-product retries, archived group mappings, preserved work/checks/tombstones, legacy compatibility and malformed-state rejection');
