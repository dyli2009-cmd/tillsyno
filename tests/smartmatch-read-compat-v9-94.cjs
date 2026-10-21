'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),copy=value=>JSON.parse(JSON.stringify(value));
const normalize=value=>String(value||'').toUpperCase().replace(/[\s/_.-]+/g,'');
const elements=new Map();
function element(id){
 if(!elements.has(id))elements.set(id,{value:'',checked:false,disabled:false,hidden:false,textContent:'',classList:{toggle(){}},replaceChildren(){},querySelectorAll:()=>[],setAttribute(){},append(){},add(){},scrollIntoView(){}});
 return elements.get(id);
}
element('rtImageMode').value='text';element('rtName').value='Compatibility fixture';
const viewport={width:100,height:100,convertToPdfPoint:(x,y)=>[x,100-y]},pdf={numPages:3,getPage:async number=>({pageNumber:number,getViewport:()=>viewport})};
const tableWords=[{text:'Komponent',x:5,y:10,w:55,h:10},{text:'Produkt',x:170,y:10,w:45,h:10},{text:'Lev av',x:400,y:10,w:35,h:10},{text:'Mont av',x:450,y:10,w:40,h:10},{text:'Dörrstängare',x:5,y:40,w:80,h:10},{text:'DC700',x:170,y:40,w:45,h:10},{text:'GS',x:400,y:40,w:15,h:10},{text:'DT',x:450,y:40,w:15,h:10}];
let discoveryResult=null,discoveryOptions=null,readCalls=[],workCalls=0;
const realWork=require('../smartmatch-read-work-v9-32.js');
const context={URL,navigator:{userAgent:''},console,requestAnimationFrame:()=>{},localStorage:{getItem:()=>null,setItem(){}},Option:function(text,value){this.text=text;this.value=value;},document:{currentScript:{src:'http://local/reader.js'},getElementById:element,querySelectorAll:()=>[]},window:{addEventListener(){},SmartMatchAppBridge:{normalizeCardLabel:normalize,getPdf:()=>pdf,prepareReadGuide(){},setStatus(){}},SmartMatchReadStep:{wait:promise=>promise},SmartMatchReadMatcher:{key:normalize},SmartMatchReadWork:{read(options){workCalls++;return realWork.read(options);}},SmartMatchReadCodes:{discover:async options=>{discoveryOptions=options;return copy(discoveryResult);}}}};
// Keep the real opening, validation, discovery, preview and save transitions.
// Rendering, extraction and scanning are adapters here; their PDF/browser
// behavior is exercised by the appearance and responsive integration suites.
const hooks=`
 const compatibilityGuide=guide;
 makeUI=()=>{ui={open:false,dataset:{},classList:{toggle(){}},querySelectorAll:()=>[],showModal(){this.open=true;},close(){this.open=false;}};};
 render=async()=>{};renderResult=()=>{};renderMatches=()=>{};renderDiscovery=()=>{};
 coordinates=()=>{};setMode=()=>{};refreshAreaControls=()=>{};populateStampCodes=()=>{};
 updateManualControls=()=>{};resetViewportInput=()=>{};guide=()=>{};readDetail=()=>{};
 beginReadProgress=()=>{};endReadProgress=()=>{};status=message=>window.lastMessage=message;
 lock=value=>{busy=value;};remember=()=>{};
 readRegion=async(pg,rect,kind)=>window.readFixture(pg,rect,kind);
 findDrawing=async()=>{pendingMatchCodes.clear();if(!matchRun)matchRun={version:2,hits:[],pages:[{page:1,count:0}],warnings:[]};};
 window.__compat={
  open:(data,extra={})=>beforeAnalyze({}, {forceReview:true,deferredOnly:true,liveReadData:data,...extra}),
  isOpen:()=>!!ui?.open,
  state:()=>({codeOnly:codeOnly(),repairLegacyProducts,multiCardLayout,ready:!!readyAreas(),confirmed,prepared:clone(prepared),checks:clone(preparedChecks),previous:clone(previousRead),active:active?clone(active):null}),
  close:()=>finish(false),defer:setDeferred,preview,
  save(){start();return active?clone(active):null;},
  setupGeometry(rectangles){makeUI();doc=window.SmartMatchAppBridge.getPdf();previousRead=null;active=null;prepared={};preparedChecks={};rects=clone(rectangles);productsOnly=false;repairLegacyProducts=false;multiCardLayout=true;confirmed=false;busy=false;deferredResume=false;discovery=null;matchRun=null;sourceId='generated-multiple-cards';example=2;localDirty.clear();pendingMatchCodes.clear();},
  discover:discoverCards,
  showGuide:compatibilityGuide
 };
`;
context.window.readFixture=async(pg,rect,kind)=>{readCalls.push({page:pg.pageNumber,kind,rect:copy(rect)});return kind==='code'?{ids:[pg.pageNumber===3||rect.x>.4?'GS2':'GS1'],text:pg.pageNumber===3||rect.x>.4?'Beslagskod GS2':'Beslagskod GS1',warnings:[],method:'PDF-text',confidence:100}:{text:'Komponent Produkt Lev av Mont av\nDörrstängare DC700 GS DT',words:tableWords,warnings:[],method:'PDF-text',confidence:100};};
vm.runInNewContext(fs.readFileSync(path.join(root,'smartmatch-read-v9-94.js'),'utf8').replace(' window.SmartMatchReadTest=Object.freeze',hooks+' window.SmartMatchReadTest=Object.freeze'),context);
const api=context.window.__compat,snapshot=()=>copy(api.state()),saveSnapshot=()=>copy(api.save());
const code={x:.1,y:.1,w:.2,h:.08},table={x:.1,y:.2,w:.3,h:.6};
const card=(id,page,name)=>({id,page,code:name,originalCardCode:name,header:'Beslagskod '+name,codeRect:code,tableRect:table,work:['Existing work'],workItems:[],workState:'ready',workPolicy:'gs-install-v4',choices:[name]});
const prior={schema:2,phase:'full',sourceId:'generated-legacy',rects:{code,table},pages:[2,3],cards:{good:card('good',2,'GS1')},deferredCards:{bad:{...card('bad',3,'GS2'),workReadError:true,deferred:true,deferredReasons:['Produktläsningen behöver rättas'],proposedWork:['Unverified proposal'],proposedWorkItems:[]}},checks:{'existing-position':{'existing-row':true}},matching:{version:2,hits:[{positionId:'existing-position',code:'GS1',page:1,box:{x:.1,y:.2,w:.1,h:.05},rect:[10,75,20,80],selected:true}],pages:[{page:1,count:1}],warnings:[],review:{version:1,approved:true}}};
async function opened(promise){
 for(let turn=0;turn<30&&!api.isOpen();turn++)await new Promise(resolve=>setImmediate(resolve));
 if(!api.isOpen()){await promise;throw Error('Expected preparation to open');}
}
(async()=>{
 const pending=api.open(copy(prior));await opened(pending);
 let state=snapshot();assert.equal(state.repairLegacyProducts,true,'legacy deferred product failure activates its correction route');assert.equal(state.codeOnly,false,'product correction remains accessible');assert.equal(state.ready,true,'saved product-table geometry is usable');
 assert.deepEqual(state.checks,prior.checks);assert.deepEqual(state.prepared.good.work,prior.cards.good.work);assert.equal(state.prepared.bad.workReadError,true,'opening must not clear a failed read');
 api.defer('bad',false);readCalls=[];workCalls=0;
 await api.preview();state=snapshot();assert.deepEqual(readCalls.map(read=>read.kind),['code','table'],'legacy repair rereads code and product table');assert.equal(workCalls,1);
 assert.equal(state.prepared.bad.workReadError,false);assert.deepEqual(state.prepared.bad.work,['DC700']);assert.deepEqual(state.prepared.good.work,prior.cards.good.work);assert.deepEqual(state.checks,prior.checks);
 assert.equal(saveSnapshot(),null,'save remains blocked until drawing review is acknowledged');
 element('rtMatchApproval').checked=true;const repaired=saveSnapshot();assert(repaired,context.window.lastMessage);assert.deepEqual(repaired.checks,prior.checks);assert.deepEqual(repaired.cards.good.work,prior.cards.good.work);assert.deepEqual(repaired.matching.hits,prior.matching.hits);assert.equal(repaired.cards.bad.workReadError,false);assert.equal(Object.keys(repaired.deferredCards).length,0);await pending;

 const codeFailure=copy(prior);delete codeFailure.deferredCards.bad.workReadError;codeFailure.deferredCards.bad.cardReadError='Code unread';codeFailure.deferredCards.bad.readErrorKind='code';
 const second=api.open(codeFailure);await opened(second);assert.equal(snapshot().codeOnly,true,'code failure does not enter the legacy product route');api.close();await second;
 const tableFailure=copy(codeFailure);tableFailure.deferredCards.bad.cardReadError='Table unread';tableFailure.deferredCards.bad.readErrorKind='work';
 const third=api.open(tableFailure);await opened(third);assert.equal(snapshot().repairLegacyProducts,true,'legacy table extraction error also retains product correction');api.close();await third;

 // New multiple-card discovery uses the existing table geometry parser but
 // preview extracts only identities, leaving all product work for SmartMatch.
 const rightCode={...code,x:.6},rightTable={...table,x:.6};
 discoveryResult={cards:[{id:'left',page:2,code:'GS1',codeText:'Beslagskod GS1',codeRect:code,tableRect:table,status:'proposed'},{id:'right',page:2,code:'GS2',codeText:'Beslagskod GS2',codeRect:rightCode,tableRect:rightTable,status:'proposed'}],pages:[{page:2,status:'proposed'}],cardPages:[2],unresolvedPages:[]};
 api.setupGeometry({code,table});readCalls=[];workCalls=0;await api.discover();assert.equal(discoveryOptions.codeOnly,false,'table geometry discovery retained for multiple cards');
 await api.preview();state=snapshot();assert.deepEqual(readCalls.map(read=>read.kind),['code','code']);assert.equal(workCalls,0,'geometry discovery must not start product extraction');assert.equal(Object.keys(state.prepared).length,2);assert.deepEqual(state.prepared.right.tableRect,rightTable);assert.notDeepEqual(state.prepared.left.bounds,state.prepared.right.bounds);assert(Object.values(state.prepared).every(item=>item.workState==='pending'&&item.work.length===0));
 element('rtMatchApproval').checked=true;const multiple=saveSnapshot();assert.equal(multiple.phase,'codes');assert.equal(multiple.multiCardLayout,true);assert.equal(Object.keys(multiple.cards).length,2);

 discoveryResult={cards:[],pages:[],cardPages:[],unresolvedPages:[2]};api.setupGeometry({code,table});await api.discover();api.showGuide();assert.equal(element('rtDiscover').hidden,false,'zero-card results leave discovery retry reachable');
 console.log('PASS 9.94 compatibility: legacy product correction, code-only errors, retained work/checks/links and approval, multiple-card geometry with deferred products, zero-card retry');
})().catch(error=>{console.error(error);process.exitCode=1;});
