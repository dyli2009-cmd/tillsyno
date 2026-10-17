'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../smartmatch-read-test-v9-3.js'),'utf8');
const nodes={rtPages:{value:'2'},rtReadPhase:{value:'codes'}};
const normalize=value=>String(value||'').toUpperCase().replace(/[\s-]/g,'');
const sandbox={URL,console,crypto,structuredClone,localStorage:{setItem(){}},document:{currentScript:{src:'http://localhost/smartmatch-read-test-v9-3.js'},getElementById:id=>nodes[id]},window:{addEventListener(){},SmartMatchAppBridge:{normalizeCardLabel:normalize,getPdf:()=>({numPages:10})}}};
const hooks=`
 window.__areas={
  set(value){if(value.active!==undefined)active=value.active;if(value.previousRead!==undefined)previousRead=value.previousRead;if(value.prepared!==undefined)prepared=value.prepared;if(value.rects!==undefined)rects=value.rects;if(value.pageOverrides!==undefined)pageOverrides=value.pageOverrides;if(value.cardOverrides!==undefined)cardOverrides=value.cardOverrides;if(value.productsOnly!==undefined)productsOnly=value.productsOnly;doc={numPages:10};},
  effectiveRegion,selectedRegions,retainSourceAliases,validDocumentData,validOverrides,prepareReadData
 };
`;
vm.createContext(sandbox);vm.runInContext(source.replace(' window.SmartMatchReadTest=Object.freeze',hooks+' window.SmartMatchReadTest=Object.freeze'),sandbox);
const api=sandbox.window.SmartMatchReadTest,areas=sandbox.window.__areas,clone=value=>JSON.parse(JSON.stringify(value));
const code={x:.05,y:.05,w:.38,h:.06},table={x:.05,y:.2,w:.38,h:.5};
function card(id,label,x=.05){return {id,page:2,code:label,originalCardCode:label,codeRect:{...code,x},tableRect:{...table,x},bounds:{x:x-.01,y:.04,w:.4,h:.7},header:label,work:['Trycke · 6696'],workItems:[{key:'stable-work-key',text:'Trycke · 6696',label:'Trycke',value:'6696'}],workState:'ready',choices:[label]};}
(async()=>{
 const left=card('left','DBL'),right=card('right','WC',.55),data={schema:1,phase:'full',rects:{code,table},pages:[2],cards:{left,right},checks:{position:{'stable-work-key':true}},matching:{version:2,hits:[],review:{version:1,approved:true}}};
 areas.set({active:clone(data),previousRead:clone(data),prepared:{},rects:{code,table},pageOverrides:{},cardOverrides:{left:{table:{...table,y:.22}}},productsOnly:true});
 const regions=clone(areas.selectedRegions());assert.equal(regions.length,2);assert.equal(regions[0].tableRect.y,.22,'explicit first-card table correction takes precedence');assert.equal(regions[1].tableRect.x,.55,'second card retains its own translated table');
 assert.deepEqual(regions[1].codeRect,right.codeRect);assert.deepEqual(clone(areas.effectiveRegion(right,true)).tableRect,right.tableRect);
 areas.set({cardOverrides:{left:{table:{...table,x:.55}}}});assert.throws(()=>areas.selectedRegions(),/utanför kort DBL/,'one-card correction cannot silently read a neighboring card');
 areas.set({cardOverrides:{left:{table:{...table,y:.76,h:.15}}}});assert.equal(areas.selectedRegions()[0].tableRect.y,.76,'explicit local correction can move beyond the old crop without entering the neighboring card');
 areas.set({cardOverrides:{}});
 assert.deepEqual(clone(api.getCardNames(2)),['DBL','WC']);assert.equal(api.getOriginalCardCode(2),'','a multicard page never supplies a guessed source name');
 await assert.rejects(api.ensureManualCard({code:'DBL-1',page:2}),/flera dörrkort/);
 await assert.rejects(api.ensureManualCard({code:'DBL-1',page:2,cardCode:'Missing'}),/ursprunglig beteckning/);
 const before=clone(api.payload()),alias=await api.ensureManualCard({code:'DBL-1',page:2,cardCode:'DBL',drawingLabel:'DBL-1'});
 assert.equal(alias.code,'DBL1');assert.equal(alias.originalCardCode,'DBL');assert.equal(alias.sourceCardId,'left');assert.equal(alias.drawingLabel,'DBL-1');
 assert.deepEqual(clone(api.payload().cards.left),before.cards.left,'the printed source name and normal card are never renamed');assert.deepEqual(clone(api.getCardNames(2)),['DBL','WC'],'aliases do not duplicate source-name choices');
 await assert.rejects(api.ensureManualCard({code:'DBL-1',page:2,cardCode:'WC'}),/annat dörrkort/,'same-page alias conflicts still validate source identity');
 await assert.rejects(api.ensureManualCard({code:'DBL-1',page:3,cardCode:'DBL'}),/redan kopplad/);
 const withAlias=api.payload();areas.set({previousRead:clone(withAlias),active:clone(withAlias),productsOnly:true,cardOverrides:{left:{table:{...table,y:.23}}}});
 assert.equal(areas.selectedRegions().length,2,'source and its aliases read each physical card only once');
 const reread=clone(left);reread.tableRect.y=.23;reread.work=['Trycke · NEW'];reread.workItems=[{key:'stable-work-key',text:'Trycke · NEW',label:'Trycke',value:'NEW'}];
 const combined=clone(areas.retainSourceAliases({left:reread,right:clone(right)})),savedAlias=combined[alias.id];
 assert.equal(savedAlias.code,'DBL1');assert.equal(savedAlias.originalCardCode,'DBL');assert.equal(savedAlias.id,alias.id);assert.equal(savedAlias.tableRect.y,.23);assert.deepEqual(savedAlias.work,reread.work);assert.deepEqual(savedAlias.workItems,reread.workItems);assert.deepEqual(clone(api.payload().checks),before.checks,'work synchronization never changes per-position checks');
 savedAlias.work.push('independent array');assert.equal(combined.left.work.length,1,'source and alias do not share mutable work arrays');
 assert.throws(()=>areas.retainSourceAliases({left:reread,other:card('other','DBL1')}),/sparad ritningsbeteckning/,'a source rescan cannot overwrite an existing alias with another source');
 const valid=clone(withAlias);valid.pageOverrides={2:{code:{...code,y:.08}}};valid.cardOverrides={left:{table:{...table,y:.23}}};assert.equal(areas.validDocumentData(valid,10),true);
 for(const change of [v=>v.pageOverrides={'0':{code}},v=>v.pageOverrides={'11':{code}},v=>v.cardOverrides={missing:{table}},v=>v.cardOverrides={left:{table:{...table,x:.9}}},v=>v.cards[alias.id].sourceCardId='right']){const invalid=clone(valid);change(invalid);assert.equal(areas.validDocumentData(invalid,10),false,'malformed area/source metadata cannot bypass direct-open validation');}
 areas.set({previousRead:{...clone(data),cards:{left:clone(left)}},prepared:{},productsOnly:false,rects:{code,table},pageOverrides:{2:{code:{...code,y:.08}}},cardOverrides:{}});nodes.rtReadPhase.value='codes';const repeatRegions=clone(areas.selectedRegions());assert.equal(repeatRegions[0].id,'left','normal rereading without rediscovery retains the saved physical source ID');assert.equal(repeatRegions[0].codeRect.y,.08);
 const legacy=clone(data);delete legacy.cards.left.originalCardCode;delete legacy.cards.right.originalCardCode;assert.equal(areas.validDocumentData(legacy,10),true,'reviewed older projects remain readable without new optional fields');
 const oldSource=clone(left);delete oldSource.originalCardCode;const legacyAlias={...clone(oldSource),id:'legacy-alias',code:'DBL9',manualLink:true};
 const oldAliasData={...clone(data),cards:{left:clone(oldSource),'legacy-alias':clone(legacyAlias)}};
 areas.prepareReadData(oldAliasData);assert.equal(oldAliasData.cards['legacy-alias'].sourceCardId,'left');assert.equal(oldAliasData.cards['legacy-alias'].originalCardCode,'DBL');assert.equal(oldAliasData.cards['legacy-alias'].code,'DBL9');assert.equal(oldAliasData.cards['legacy-alias'].id,'legacy-alias');assert.deepEqual(oldAliasData.checks,data.checks,'exact legacy metadata migration keeps original controls');
 const ambiguous={...clone(data),cards:{left:clone(oldSource),other:{...clone(oldSource),id:'other',code:'WC'},'legacy-alias':clone(legacyAlias)}};areas.prepareReadData(ambiguous);assert.equal(ambiguous.cards['legacy-alias'].sourceCardId,undefined,'ambiguous old clone is not guessed');
 const editedAlias={...clone(data),cards:{left:clone(oldSource),'legacy-alias':{...clone(legacyAlias),work:['A manual change']}}};areas.prepareReadData(editedAlias);assert.equal(editedAlias.cards['legacy-alias'].sourceCardId,undefined,'manually edited old clone remains independent');
 areas.set({active:{...clone(data),pageOverrides:{3:{code:{...code,y:.11}}}},pageOverrides:{3:{code:{...code,y:.88}}}});const added=await api.ensureManualCard({code:'New3',page:3});assert.equal(added.codeRect.y,.11,'a direct-open project never uses stale module rectangles from another PDF');
 console.log('PASS TEST 9.3 area contracts: independent multicard geometry, neighbor bounds, exact alias source validation, once-per-source product reads, stable IDs/names/work keys, alias synchronization, collision protection and portable metadata validation');
})().catch(error=>{console.error(error);process.exitCode=1;});
