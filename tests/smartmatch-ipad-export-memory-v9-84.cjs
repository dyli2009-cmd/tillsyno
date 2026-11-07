// TEST 9.84: real PDF build/verify/share roundtrip in Chromium with the iPad profile.
// This does not reproduce the memory limit or file providers of physical Safari.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),crypto=require('node:crypto');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {createCanvas}=require('@napi-rs/canvas');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),clone=value=>JSON.parse(JSON.stringify(value));
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'smartmatch-ipad-export-v9-84-'));let nextInput=0;
const device=process.env.SMARTMATCH_TEST_DEVICE||'ipad';assert(['ipad','iphone'].includes(device),'SMARTMATCH_TEST_DEVICE must be ipad or iphone');
const sourceMb=Number(process.env.SMARTMATCH_TEST_SOURCE_MB||16);
const metadataMb=Number(process.env.SMARTMATCH_TEST_METADATA_MB||4);
assert(Number.isInteger(metadataMb)&&metadataMb>=1&&metadataMb<=16,'SMARTMATCH_TEST_METADATA_MB must be 1..16');
let expectedMetadata='',expectedMetadataHash='',expectedMetadataBytes=0;
function decodeProjectMetadata(doc){
 const object=doc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')),hex=object.asString();
 assert.equal(hex.slice(0,4).toUpperCase(),'FEFF','Project data uses standard UTF16BE hex');
 assert(hex===doc.catalog.get(PDFName.of('TillsynoSmartMatchV30Data')).asString(),'Both established metadata keys preserve identical data');
 const bytes=Buffer.from(hex,'hex');assert.equal(bytes.length%2,0);bytes.swap16();return JSON.parse(bytes.toString('utf16le').slice(1));
}
function assertSharedNavigation(doc){
 const name=PDFName.of,ctx=doc.context,pages=doc.getPages();assert.equal(pages.length,2,'Shared protocols retain both original pages without per-position copies');
 assert.equal(doc.catalog.get(name('SmartMatch21OriginalPages')).asNumber(),2);
 for(const key of ['SmartMatch23ExtraPages','SmartMatch21ExtraPages','SmartMatch18ExtraPages','SmartMatch17ExtraPages'])assert.equal(doc.catalog.get(name(key))?.asNumber?.()||0,0,'No generated pages: '+key);
 assert.equal(doc.catalog.lookup(name('SmartMatch52ReturnButtons')).size(),2,'Two logical card headers share one physical protocol page');
 const links=page=>(page.node.Annots()?.asArray()||[]).map(ref=>ctx.lookup(ref)).filter(item=>item.get(name('Subtype'))?.toString()==='/Link');
 const forward=links(pages[0]);assert.equal(forward.length,3,'Every drawing position retains its protocol link');
 for(const link of forward){const action=ctx.lookup(link.get(name('A'))),dest=ctx.lookup(action.get(name('D')));assert.equal(action.get(name('S')).toString(),'/GoTo');assert.equal(String(dest.get(0)),String(pages[1].ref),'All forward links target the original shared protocol page');}
 const backwards=links(pages[1]);assert.equal(backwards.length,2);
 const named=backwards.filter(link=>ctx.lookup(link.get(name('A'))).get(name('S')).toString()==='/Named');assert.equal(named.length,1,'Shared GS10/alias card uses one viewer-history action');
 assert.equal(ctx.lookup(named[0].get(name('A'))).get(name('N')).toString(),'/GoBack');
 const direct=backwards.filter(link=>ctx.lookup(link.get(name('A'))).get(name('S')).toString()==='/GoTo');assert.equal(direct.length,1,'Single-position GS20 card uses a portable static return');
 const destination=ctx.lookup(ctx.lookup(direct[0].get(name('A'))).get(name('D')));assert.equal(String(destination.get(0)),String(pages[0].ref));assert.equal(destination.get(1).toString(),'/XYZ');assert.equal(destination.get(2).asNumber(),390);assert.equal(destination.get(3).asNumber(),612);
 assert(named[0].lookup(name('Rect')).get(0).asNumber()<direct[0].lookup(name('Rect')).get(0).asNumber(),'Shared GS10 header owns history action; GS20 header owns its direct position');
 const children=node=>{const result=[],seen=new Set();let ref=node.get(name('First'));while(ref){assert(!seen.has(String(ref)),'Outline has no cycle');seen.add(String(ref));const child=ctx.lookup(ref);result.push(child);ref=child.get(name('Next'));}return result;};
 const group=ctx.lookup(doc.catalog.get(name('SmartMatch28OutlineRef'))),codes=children(group);assert.equal(codes.length,3,'Code groups remain distinct even when they share one physical page');
 const expected={GS10:[30,792],GS10ALT:[220,722],GS20:[390,612]};let positions=0;
 for(const codeGroup of codes){const code=codeGroup.get(name('Title')).decodeText().split(' · ')[0];assert(expected[code],'Expected position code '+code);const cardDest=ctx.lookup(codeGroup.get(name('Dest')));assert.equal(String(cardDest.get(0)),String(pages[1].ref));const entries=children(codeGroup);assert.equal(entries.length,1);for(const entry of entries){positions++;const target=ctx.lookup(entry.get(name('Dest')));assert.equal(String(target.get(0)),String(pages[0].ref));assert.equal(target.get(1).toString(),'/XYZ');assert.deepEqual([target.get(2).asNumber(),target.get(3).asNumber()],expected[code]);}}
 assert.equal(positions,3,'All source positions have exact coordinate bookmarks');
}
function metadataDigest(value){return crypto.createHash('sha256').update(value,'utf8').digest('hex');}
function richMetadata(){
 const bytes=Buffer.alloc(metadataMb*1024*1024*3/4);let state=987654321;
 for(let i=0;i<bytes.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;bytes[i]=state&255;}
 const encoded=bytes.toString('base64'),blocks=[];
 for(let offset=0;offset<encoded.length;offset+=65536)blocks.push('Avläst dörrkort '+(offset/65536)+' – Åtgärd behövs: lås, gångjärn och tröskel. 🔑🚪\n'+encoded.slice(offset,offset+65536));
 return blocks.join('\n');
}
assert(Number.isInteger(sourceMb)&&sourceMb>=16&&sourceMb<=128,'SMARTMATCH_TEST_SOURCE_MB must be 16..128');
const browserPath=[process.env.SMARTMATCH_CHROMIUM_PATH,chromium.executablePath(),'/usr/bin/chromium','/tmp/chromium'].find(file=>file&&fs.existsSync(file));
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-84.html`;
const codeRect={x:.04,y:.04,w:.40,h:.06},tableRect={x:.02,y:.12,w:.45,h:.75};

function workItem(key,label,value,section='Daglåsning',sectionKey='daglasning'){
 const text=label+' · '+value;
 return {key,text,legacyText:text,label,value,section,sectionKey,tableIndex:0,sourceRow:2,sourceIdentity:['gs',0,2,sectionKey,label,value].join(':').toLocaleLowerCase('sv-SE'),responsibility:'GS'};
}
function hit(positionId,code,rect,order){
 return {page:1,code,rect,box:{x:rect[0]/595,y:(842-rect[3])/842,w:(rect[2]-rect[0])/595,h:(rect[3]-rect[1])/842},positionId,selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order};
}
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const plan=document.addPage([595,842]);
 plan.drawText('GS10',{x:70,y:680,size:18,font:bold});plan.drawText('GS10ALT',{x:260,y:610,size:18,font:bold});plan.drawText('GS20',{x:430,y:500,size:18,font:bold});
 // Two distinct source cards deliberately share the same physical PDF page.
 const cardsPage=document.addPage([595,842]);
 cardsPage.drawText('Beslagskod: GS10',{x:25,y:780,size:14,font:bold});cardsPage.drawText('Trycke 6696 GS',{x:25,y:740,size:11,font});
 cardsPage.drawText('Beslagskod: GS20',{x:320,y:780,size:14,font:bold});cardsPage.drawText('Slutbleck ST400 GS',{x:320,y:740,size:11,font});
 const a=workItem('a-base','Trycke','6696'),b=workItem('b-base','Slutbleck','ST400');
 const cardA={id:'card-a',page:2,code:'GS10',originalCardCode:'GS10',header:'Beslagskod: GS10',codeRect,tableRect,bounds:{x:.01,y:.03,w:.48,h:.90},rawTable:'Trycke 6696 GS',work:[a.text],workItems:[a],workState:'ready',workPolicy:'gs-install-v3',choices:['GS10'],method:'PDF-text',confidence:100};
 const cardB={id:'card-b',page:2,code:'GS20',originalCardCode:'GS20',header:'Beslagskod: GS20',codeRect:{x:.54,y:.04,w:.40,h:.06},tableRect:{x:.52,y:.12,w:.45,h:.75},bounds:{x:.51,y:.03,w:.48,h:.90},rawTable:'Slutbleck ST400 GS',work:[b.text],workItems:[b],workState:'ready',workPolicy:'gs-install-v3',choices:['GS20'],method:'PDF-text',confidence:100};
 const alias={...clone(cardA),id:'card-a-alias',code:'GS10ALT',originalCardCode:'GS10',sourceCardId:'card-a',drawingLabel:'GS10ALT',manualLink:true};
 const cards={'card-a':cardA,'card-a-alias':alias,'card-b':cardB};
 const hits=[hit('door-a1','GS10',[65,675,125,702],870000),hit('door-a2','GS10ALT',[255,605,350,632],870001),hit('door-b','GS20',[425,495,485,522],870002)];
 const checks={'door-a1':{'a-base':true},'door-a2':{'a-base':true},'door-b':{'b-base':true}};
 const groupMappings={GS10ALT:{code:'GS10ALT',drawingLabel:'GS10ALT',sourceCardId:'card-a',cardPage:2,originalCardCode:'GS10',sourceDrawingCodes:['GS10ALT'],sourceScopes:{GS10ALT:null}}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:custom-points-v925',rects:{code:codeRect,table:tableRect},pages:[2],cards,checks,groupMappings,renamedGroupCodes:[],matching:{version:2,hits,pages:[{page:1,count:3,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Own points TEST 9.55'};
 const payload={schema:6,projectId:'project:custom-points-v925',projectRevision:1,timeConfig:{minutes:{handle:10,strike:10,closer:30}},instances:{
  'door-a1':{checks:{'a-base':true,'legacy-point':true},rowStages:{'a-base':'done'},progress:100,overrides:{'a-base':{minutes:17}},customItems:[{id:'legacy-point',label:'Äldre egen punkt',value:'Utan sektion',note:'Ska ligga kvar i legacygruppen',quantity:1,minutes:5}]},
  'door-a2':{checks:{'a-base':true},rowStages:{},progress:100,overrides:{},customItems:[]},
  'door-b':{checks:{'b-base':true},rowStages:{},progress:100,overrides:{},customItems:[]}
 },automationItems:[],readTestData};
 payload.instances['door-a1'].customItems.push(...[['behor-a','Behör','2356'],['behor-b','Behörn','1 2356'],['holder-a','Porthållare','PH1'],['holder-b','Portållare','PH2'],['contact','Magnetkontkt','MK1']].map(([id,label,value])=>({id,label,value,quantity:1,minutes:null,kind:'work'})));
 payload.timeConfig.projectMaterials=[{name:'SW300',quantity:2}];payload.timeConfig.productMinutes={'2356':10};payload.timeConfig.productCategories={'sw300':'Dörrautomatik','6696':'Behör'};
 payload.instances['door-a1'].customItems.push({id:'extra-90',label:'Extra arbete',value:'',minutes:90,quantity:1,kind:'extra-time'});
 const image=createCanvas(16,16),paint=image.getContext('2d');paint.fillStyle='#1565c0';paint.fillRect(0,0,16,16);const dataUrl=image.toDataURL('image/png');
 payload.drawingNotes=[
  {id:'note-text',type:'text',page:1,x:100,y:500,text:'Åtgärd behövs – dörren stänger ej',fontSize:18,color:'#d32f2f',frame:'round',background:'#ffffff'},
  {id:'note-callout',type:'callout',page:1,x1:120,y1:470,x2:260,y2:550,text:'Kontrollera låset',fontSize:16,color:'#168147'},
  {id:'note-image-a',type:'image',page:1,rect:[350,400,380,430],dataUrl},
  {id:'note-image-b',type:'image',page:1,rect:[390,400,420,430],dataUrl}
 ];
 const unplaced=workItem('unplaced-lock','Låshus','212-50');payload.readTestData.cards['card-c']={...clone(cardB),id:'card-c',code:'GS30',originalCardCode:'GS30',work:[unplaced.text],workItems:[unplaced],rawTable:'Låshus 212-50 GS'};
 expectedMetadata=richMetadata();expectedMetadataHash=metadataDigest(expectedMetadata);expectedMetadataBytes=Buffer.byteLength(expectedMetadata,'utf8');
 payload.readTestData.cards['card-c'].rawTable=expectedMetadata;
 assert(expectedMetadataBytes>=metadataMb*1024*1024,'Fixture contains real embedded project text, not only binary attachment');
 // Efficient fixture construction avoids exercising the browser bug in Node setup.
 const utf16=Buffer.from('\uFEFF'+JSON.stringify(payload),'utf16le');utf16.swap16();const metadata=PDFHexString.of(utf16.toString('hex').toUpperCase());
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),metadata);
 const attachment=new Uint8Array(sourceMb*1024*1024);let state=123456789;for(let i=0;i<attachment.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;attachment[i]=state&255;}await document.attach(attachment,'source-data.bin',{mimeType:'application/octet-stream'});
 return Buffer.from(await document.save());
}
async function openPrepared(page,bytes){
 await page.goto(url());await page.getByLabel('Kod till Avläsning').fill('1234');await page.locator('#smReadCodeGate button').click();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-read-locked'));
 const input=path.join(scratch,'project-'+(++nextInput)+'.pdf');fs.writeFileSync(input,bytes);
 // Playwright rejects in-memory uploads larger than 50 MiB; browser reads a real local file.
 await page.locator('#pwFile').setInputFiles(input);
 await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf?.()&&SmartMatchAppBridge.getPositions().length===3&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
 // Capture the exact portable project payload produced by the ordinary save()
 // path. PDF export embeds this same payload.
 await page.evaluate(()=>{
  window.__draftPayloads=[];
  SmartMatchSession.queueDraft=entry=>{window.__draftPayloads.push(structuredClone(entry.payload));return entry.payload;};
 });
}
async function openPosition(page,id){
 await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);
 await page.waitForSelector('#pwProtocol[open]');
 await page.waitForFunction(()=>!!document.getElementById('pwProtocolCanvas')?.dataset.readCardId);
 if(await page.locator('#pwProtocolShowGS').isVisible())await page.locator('#pwProtocolShowGS').click();
}
async function closePosition(page){
 await page.locator('#pwProtocolClose').click();
 await page.waitForFunction(()=>!document.getElementById('pwProtocol').open);
}
async function positions(page){
 return page.evaluate(()=>Object.fromEntries(SmartMatchAppBridge.getPositions().map(position=>[position.id,structuredClone(position)])));
}
async function lastDraft(page){
 return page.evaluate(()=>structuredClone(window.__draftPayloads.at(-1)));
}

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({...(browserPath?{executablePath:browserPath}:{}),args:['--no-sandbox']});
  const profile=device==='iphone'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:1024,height:1366},hasTouch:true,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'};
  const context=await browser.newContext(profile);
  await context.addInitScript(device=>{Object.defineProperty(navigator,'platform',{value:device==='iphone'?'iPhone':'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{value:5});Object.defineProperty(navigator,'canShare',{value:({files})=>files?.length===1});window.__shared=[];Object.defineProperty(navigator,'share',{configurable:true,value:async({files})=>{window.__shared.push(files[0]);window.__shareGesture=navigator.userActivation.isActive;}});},device);
  await context.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>{window.TillsynoAuth={client:{rpc:async()=>({data:{ok:true}})}};window.TillsynoCurrentAccess={userId:'test-user'};document.documentElement.removeAttribute('data-auth-pending');window.dispatchEvent(new CustomEvent('tillsyno-authorized',{detail:window.TillsynoCurrentAccess}));});"}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);await openPrepared(page,await fixture());
  assert.equal((await page.evaluate(()=>SmartMatchAppBridge.getDrawingPerformanceProfile()))[device],true);
  await page.evaluate(async()=>{
   if(typeof window.SmartMatchReadProjectWriterV984?.create!=='function')throw Error('9.84 metadata writer not loaded');
   window.__metadataProgress=[];window.__largeVendorTextCalls=[];const vendorFromText=PDFLib.PDFHexString.fromText;
   PDFLib.PDFHexString.fromText=function(text){if(String(text).length>=1024*1024){window.__largeVendorTextCalls.push(text.length);throw Error('Large project metadata reached vendor PDFHexString.fromText');}return vendorFromText.call(this,text);};
   const percentNode=document.getElementById('smartExportPercent');new MutationObserver(()=>{const value=parseInt(percentNode.textContent,10);if(value>=57&&value<=62)window.__metadataProgress.push(value);}).observe(percentNode,{childList:true,characterData:true,subtree:true});
   const source=SmartMatchAppBridge.getOriginalPdfBytes();window.__sourceHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source))).join(',');window.__loads=[];window.__slrDoc=false;
   const load=PDFLib.PDFDocument.load;PDFLib.PDFDocument.load=async function(data,...rest){window.__loads.push({size:data.byteLength,sameOriginal:data===source,sameOutput:data===window.__savedOutput});const doc=await load.call(this,data,...rest);if(data===source){const save=doc.save.bind(doc);doc.save=async(...args)=>window.__savedOutput=await save(...args);}return doc;};
   const verify=SmartMatchSLRTest.verify;SmartMatchSLRTest.verify=async(data,expected,doc)=>{window.__slrDoc=doc instanceof PDFLib.PDFDocument;return verify(data,expected,doc);};
   const viewer=SmartMatchAppBridge.getPdf(),cleanup=viewer.cleanup.bind(viewer);window.__cleanup=0;viewer.cleanup=async(...args)=>{window.__cleanup++;return cleanup(...args);};
   window.__pageTextReads={};window.__pageCleanups={};const getPage=viewer.getPage.bind(viewer);
   viewer.getPage=async number=>{const pg=await getPage(number);if(!pg.__exportTestWrapped){pg.__exportTestWrapped=true;const text=pg.getTextContent.bind(pg),release=pg.cleanup.bind(pg);pg.getTextContent=(...args)=>{window.__pageTextReads[number]=(window.__pageTextReads[number]||0)+1;return text(...args);};pg.cleanup=(...args)=>{window.__pageCleanups[number]=(window.__pageCleanups[number]||0)+1;return release(...args);};}return pg;};
  });
  await page.locator('#smartPdfInspect').click();
  assert.equal(await page.locator('#smartExportBuild').innerText(),'Förbered PDF');
  assert.equal(await page.locator('#smartExportExactReturn').count(),0,'Export no longer offers per-position page copies');
  const navigationInfo=await page.locator('.smExportNavigationInfo').innerText();assert.match(navigationInfo,/Originalsidor utan extra protokollsidor/);assert.match(navigationInfo,/PDF-läsarens historik/);assert.match(navigationInfo,/Stödet varierar/);assert.match(navigationInfo,/positionsbokmärkena/);
  assert.equal(await page.evaluate(()=>window.__loads.length),0,'Opening Save must not parse a PDF');
  await page.locator('#smartExportBuild').click();
  await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled&&document.getElementById('smartExportBuild').textContent==='Spara PDF',null,{timeout:120000});
  assert.match(await page.locator('#smartExportProjectProof').innerText(),/^2 sidor · /,'UI confirms verified output page count');
  const stats=await page.evaluate(async()=>({loads:window.__loads,cleanup:window.__cleanup,pageTextReads:window.__pageTextReads,pageCleanups:window.__pageCleanups,slr:window.__slrDoc,metadataProgress:window.__metadataProgress,largeVendorTextCalls:window.__largeVendorTextCalls,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',SmartMatchAppBridge.getOriginalPdfBytes()))).join(','),originalHash:window.__sourceHash,bytes:SmartMatchAppBridge.getOriginalPdfBytes().length}));
  assert(stats.bytes>sourceMb*1024*1024);assert.equal(stats.hash,stats.originalHash,'Original source bytes must never change');assert.equal(stats.loads.filter(x=>x.sameOriginal).length,1,'Build reads original without a copy');assert.equal(stats.loads.filter(x=>x.sameOutput).length,1,'Verify reads serialized output without a copy');assert.equal(stats.loads.filter(x=>x.size>16*1024*1024).length,2,'Exactly two full project parses, including SLR verification');assert(stats.cleanup>=1);assert(stats.slr);assert.equal(stats.pageTextReads[2],1,'Two cards on the same page read physical page text once');assert(stats.pageCleanups[2]>=1,'Export releases source card page text cache');assert.deepEqual(stats.largeVendorTextCalls,[],'Large metadata never reaches vendor fromText');assert(stats.metadataProgress.includes(57)&&stats.metadataProgress.includes(62),'Metadata progress reaches both57 and62');assert(stats.metadataProgress.some(value=>value>57&&value<62),'Metadata encoding yields and reports intermediate progress');
  await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>window.__shared.length===1);await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>window.__shared.length===2);assert(await page.evaluate(()=>window.__shared[0]===window.__shared[1]));assert(await page.evaluate(()=>window.__shareGesture));assert(await page.evaluate(()=>window.__shared[0].size>16*1024*1024));assert.match(await page.locator('#smartExportStatus').innerText(),/Filer, Dropbox eller Google Drive/);
  // Save the same verified file through the download fallback, then reopen it.
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{value:undefined,configurable:true}));
  const downloading=page.waitForEvent('download');await page.locator('#smartExportBuild').click();const download=await downloading,exported=fs.readFileSync(await download.path()),doc=await PDFDocument.load(exported),payload=decodeProjectMetadata(doc);assert.equal(Object.keys(payload.instances).length,3);assert.equal(payload.timeConfig.projectMaterials[0].name,'SW300');assert.equal(payload.drawingNotes.length,4,'All drawing notes remain editable');assert.equal(payload.drawingNotes[0].text,'Åtgärd behövs – dörren stänger ej');assert.equal(doc.catalog.lookup(PDFName.of('SmartMatch106NoteStreams')).size(),4,'All four notes have visible PDF content');assertSharedNavigation(doc);assert(doc.catalog.get(PDFName.of('Names')),'Customer attachment retained');
  const rich=payload.readTestData.cards['card-c'].rawTable;assert(rich===expectedMetadata,'Export preserves exact Swedish/emoji/base64-like project text');assert.equal(Buffer.byteLength(rich,'utf8'),expectedMetadataBytes);assert.equal(metadataDigest(rich),expectedMetadataHash);
  await page.locator('#smartExportClose').click();const oldZoom=await page.locator('#pwZoomInfo').innerText();await page.locator('#pwZoomIn').click();await page.waitForFunction(old=>document.getElementById('pwZoomInfo').textContent!==old,oldZoom);await page.waitForFunction(()=>document.getElementById('pwCanvas').width>0);// Closing during preparation must release the render pause and allow a new export.
  // Cancel while the async metadata encoder is yielding at57..62%, then retry.
  await page.evaluate(()=>{window.__metadataCancelled=false;const percent=document.getElementById('smartExportPercent'),observer=new MutationObserver(()=>{const value=parseInt(percent.textContent,10);if(value>57&&value<62){observer.disconnect();document.getElementById('smartExportClose').click();window.__metadataCancelled=true;}});observer.observe(percent,{childList:true,characterData:true,subtree:true});});
  await page.locator('#smartPdfInspect').click();await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>window.__metadataCancelled&&!document.getElementById('smartExportDialog').open,null,{timeout:120000});
  await page.locator('#smartPdfInspect').click();await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled&&document.getElementById('smartExportBuild').textContent==='Spara PDF',null,{timeout:120000});await page.locator('#smartExportClose').click();
  await page.evaluate(()=>{const load=PDFLib.PDFDocument.load;window.__cancelLoad=false;window.__cancelDone=false;PDFLib.PDFDocument.load=async function(data,...rest){if(data===SmartMatchAppBridge.getOriginalPdfBytes()&&!window.__cancelLoad){window.__cancelLoad=true;await new Promise(resolve=>window.__continueExport=resolve);const doc=await load.call(this,data,...rest);window.__cancelDone=true;return doc;}return load.call(this,data,...rest);};});
  await page.locator('#smartPdfInspect').click();await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>window.__cancelLoad);await page.locator('#smartExportClose').click();await page.evaluate(()=>window.__continueExport());await page.waitForFunction(()=>window.__cancelDone);await page.locator('#smartPdfInspect').click();await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled&&document.getElementById('smartExportBuild').textContent==='Spara PDF',null,{timeout:120000});await page.locator('#smartExportClose').click();
  const other=await context.newPage();other.on('pageerror',error=>errors.push('reopened: '+error.message));await openPrepared(other,exported);assert.equal((await positions(other))['door-a1'].customItems.length,7);
  const reopened=await other.evaluate(async()=>{const value=SmartMatchReadTest.payload().cards['card-c'].rawTable,data=new TextEncoder().encode(value);return {bytes:data.byteLength,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),value=>value.toString(16).padStart(2,'0')).join('')};});assert.equal(reopened.bytes,expectedMetadataBytes);assert.equal(reopened.hash,expectedMetadataHash,'Reopened app retains every metadata byte');
  // Re-export the saved PDF, not the initial source: navigation/page counts must remain stable.
  const reopenedSourceHash=await other.evaluate(async()=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',SmartMatchAppBridge.getOriginalPdfBytes()))).join(','));
  await other.locator('#smartPdfInspect').click();await other.locator('#smartExportBuild').click();await other.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled&&document.getElementById('smartExportBuild').textContent==='Spara PDF',null,{timeout:120000});assert.match(await other.locator('#smartExportProjectProof').innerText(),/^2 sidor · /);
  await other.evaluate(()=>Object.defineProperty(navigator,'share',{value:undefined,configurable:true}));const repeating=other.waitForEvent('download');await other.locator('#smartExportBuild').click();const repeatedDownload=await repeating,repeated=await PDFDocument.load(fs.readFileSync(await repeatedDownload.path()));assertSharedNavigation(repeated);assert.equal(metadataDigest(decodeProjectMetadata(repeated).readTestData.cards['card-c'].rawTable),expectedMetadataHash,'Re-export retains exact large project data');
  assert.equal(await other.evaluate(async()=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',SmartMatchAppBridge.getOriginalPdfBytes()))).join(',')),reopenedSourceHash,'Re-export never changes its input PDF bytes');
  assert.deepEqual(errors,[]);console.log('PASS Chromium '+device+' profile, '+sourceMb+' MiB attachment + '+metadataMb+' MiB rich project JSON, metadata57..62 progress/cancel/retry, no large vendor fromText, exact metadata hash on reopen, explicit Prepare then Save, no full-buffer copies, shared verification parser, cache cleanup, original SHA-256 unchanged, two original pages on export/re-export, shared Named GoBack plus single static GoTo, three position bookmarks, four drawing notes, reused File/share gesture, cancel/retry, download and portable PDF reopen. Physical Safari and execution of Named GoBack remain unverified.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));fs.rmSync(scratch,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});

