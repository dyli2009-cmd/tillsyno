'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const copy=value=>JSON.parse(JSON.stringify(value)),key=value=>String(value||'').toUpperCase().replace(/[\s/_.-]+/g,'');
const pdf={numPages:5},saved=[];
const context={URL,navigator:{userAgent:''},crypto:crypto.webcrypto,localStorage:{setItem:(...args)=>saved.push(args)},console,
 document:{currentScript:{src:'http://local/reader.js'}},window:{addEventListener(){},SmartMatchAppBridge:{getPdf:()=>pdf,normalizeCardLabel:key,setStatus(){}}}};
const hooks=`window.__deferred={set(data){active=clone(data);},valid:()=>validDocumentData(active,5),codes:()=>drawingCodes(active)};`;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../smartmatch-read-v9-96.js'),'utf8').replace(' window.SmartMatchReadTest=Object.freeze',hooks+' window.SmartMatchReadTest=Object.freeze'),context);
const api=context.window.SmartMatchReadTest,test=context.window.__deferred;
const codeRect={x:.1,y:.1,w:.4,h:.08},tableRect={x:.1,y:.2,w:.7,h:.6};
const card=(id,page,code)=>({id,page,code,originalCardCode:code,header:'Beslagskod '+code,codeRect,tableRect,work:['Existing product'],workItems:[],workState:'ready',choices:[code]});
const parked=(id,page,code)=>({...card(id,page,code),deferred:true,deferredReasons:['Lämnat till senare av användaren']});
const fixture={schema:2,phase:'full',sourceId:'generated-deferred-sources',rects:{code:codeRect,table:tableRect},pages:[2,3,4,5],cards:{good:card('good',2,'GS1')},deferredCards:{source:parked('source',3,'DBXBHOLDX'),other:parked('other',4,'DX25'),last:parked('last',5,'DX26')},checks:{'existing-position':{'existing-row':true}},matching:{version:2,hits:[{positionId:'existing-position',code:'GS1',page:1,rect:[10,75,20,80],box:{x:.1,y:.2,w:.1,h:.05},selected:true}],review:{version:1,approved:true}}};
function setup(data=fixture){test.set(copy(data));assert(test.valid(),'fixture must be a valid saved project');}
async function unchangedReject(promise,pattern,before){await assert.rejects(promise,pattern);assert.deepEqual(copy(api.payload()),before,'rejected choice cannot partially restore a source or add an alias');}
(async()=>{
 setup();assert.deepEqual(copy(api.getCardNames(3)),['DBXBHOLDX']);assert.deepEqual(copy(api.getCardNames(4)),['DX25']);assert.deepEqual(copy(api.getCardNames(5)),['DX26']);
 const before=copy(api.payload());await unchangedReject(api.ensureManualCard({code:'DBX b-hold',page:3,cardCode:'DX25'}),/ursprunglig/,before);
 const linked=copy(await api.ensureManualCard({code:'DBX b-hold',drawingLabel:'DBX b-hold',page:3,cardCode:'DBX B holdx'})),data=copy(api.payload());
 assert.equal(linked.code,'DBXBHOLD');assert.equal(linked.originalCardCode,'DBXBHOLDX');assert.equal(linked.sourceCardId,'source');assert.equal(linked.page,3);
 assert.equal(data.cards.source.id,'source');assert.deepEqual(data.cards.source.work,fixture.deferredCards.source.work);assert.deepEqual(data.cards.source.codeRect,codeRect);assert.deepEqual(data.cards.source.tableRect,tableRect);
 assert.equal(data.cards.source.deferred,undefined);assert.equal(data.deferredCards.source,undefined);assert.deepEqual(data.deferredCards.other,fixture.deferredCards.other);assert.deepEqual(data.deferredCards.last,fixture.deferredCards.last);
 assert.deepEqual(data.checks,fixture.checks);assert.deepEqual(data.matching,fixture.matching);assert(test.valid());assert(test.codes().includes('DBXBHOLD'),'confirmed literal alias participates in later drawing searches');assert(test.codes().includes('DBXBHOLDX'),'original source remains available');
 assert.deepEqual(copy(api.getCardNames(3)),['DBXBHOLDX'],'drawing alias must not become a second printed card identity');
 const repeat=copy(await api.ensureManualCard({code:'DBX b-hold',page:3,cardCode:'DBX B holdx'}));assert.equal(repeat.id,linked.id);assert.equal(Object.keys(api.payload().cards).length,3,'repeat linking reuses the stable alias');
 api.restoreReadData(JSON.parse(JSON.stringify(data)));assert(test.valid());assert.equal(api.cardFor('DBXBHOLD',3).sourceCardId,'source');assert.deepEqual(copy(api.cardFor('DBXBHOLD',3).work),fixture.deferredCards.source.work);assert.deepEqual(copy(api.payload().checks),fixture.checks);

 const legacy=copy(fixture);delete legacy.deferredCards.source.id;setup(legacy);assert.deepEqual(copy(api.getCardNames(3)),['DBXBHOLDX']);
 const legacyLink=copy(await api.ensureManualCard({code:'DBXBHOLD',page:3,cardCode:'DBXBHOLDX'}));assert.equal(legacyLink.sourceCardId,'source');assert.equal(api.payload().cards.source.id,'source');assert.equal(api.payload().deferredCards.source,undefined);assert.deepEqual(copy(api.payload().cards.source.work),fixture.deferredCards.source.work);assert(test.valid(),'legacy source entry key becomes its existing stable identity');

 setup();const same=copy(await api.ensureManualCard({code:'DX25',page:4,cardCode:'DX25'}));assert.equal(same.id,'other','same-label linking restores the original without fabricating a second source');assert.equal(Object.keys(api.payload().cards).length,2);assert(test.valid());

 const ambiguous=copy(fixture);ambiguous.deferredCards.twin=parked('twin',3,'DBXBHOLDX');setup(ambiguous);await unchangedReject(api.ensureManualCard({code:'DBXBHOLD',page:3,cardCode:'DBXBHOLDX'}),/exakt rätt/,copy(api.payload()));
 const conflict=copy(fixture);conflict.cards.collision=card('collision',4,'DBXBHOLD');delete conflict.deferredCards.other;setup(conflict);await unchangedReject(api.ensureManualCard({code:'DBXBHOLD',page:3,cardCode:'DBXBHOLDX'}),/redan kopplad/,copy(api.payload()));
 const badCode=copy(fixture);badCode.deferredCards.source.cardReadError='Original identifier unread';badCode.deferredCards.source.readErrorKind='code';setup(badCode);await unchangedReject(api.ensureManualCard({code:'DBXBHOLD',page:3,cardCode:'DBXBHOLDX'}),/beteckning behöver rättas/,copy(api.payload()));
 const badGeometry=copy(fixture);badGeometry.deferredCards.source.tableRect=null;setup(badGeometry);await unchangedReject(api.ensureManualCard({code:'DBXBHOLD',page:3,cardCode:'DBXBHOLDX'}),/återställas säkert/,copy(api.payload()));

 const workError=copy(fixture);Object.assign(workError.deferredCards.source,{workReadError:true,proposedWork:['Unverified work'],proposedWorkItems:[]});setup(workError);
 await api.ensureManualCard({code:'DBXBHOLD',page:3,cardCode:'DBXBHOLDX'});const pending=copy(api.payload());assert.equal(pending.cards.source.workReadError,true);assert.deepEqual(pending.cards.source.work,workError.deferredCards.source.work);assert.deepEqual(pending.pendingWorkCards.source.proposedWork,['Unverified work']);assert(api.hasPendingProducts(),'unresolved product work stays explicitly reachable');assert(test.valid());
 const tableError=copy(fixture);Object.assign(tableError.deferredCards.source,{cardReadError:'Table read failed',readErrorKind:'work'});setup(tableError);await api.ensureManualCard({code:'DBXBHOLD',page:3,cardCode:'DBXBHOLDX'});assert.equal(api.payload().cards.source.cardReadError,'Table read failed');assert(api.payload().pendingWorkCards.source);assert(test.valid());
 console.log('PASS deferred manual links: printed names, exact original restoration, reviewed alias persistence, work/check preservation, untouched parked cards, same-label reuse, ambiguity/conflict/error rejection and pending product repair');
})().catch(error=>{console.error(error);process.exitCode=1;});
