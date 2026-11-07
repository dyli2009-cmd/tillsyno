/* Avläsning TEST 9.50: own work points retain their section and can be
 * copied to every physical position that uses the same source door card.
 * Bulk done/undone must update base and own points without stale read data
 * restoring a completed base row during recalc. Generated searchable PDF. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),clone=value=>JSON.parse(JSON.stringify(value));
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-50.html`;
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
 const readTestData={schema:1,phase:'full',sourceId:'generated:custom-points-v925',rects:{code:codeRect,table:tableRect},pages:[2],cards,checks,groupMappings,renamedGroupCodes:[],matching:{version:2,hits,pages:[{page:1,count:3,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Own points TEST 9.50'};
 const payload={schema:6,projectId:'project:custom-points-v925',projectRevision:1,timeConfig:{minutes:{handle:10,strike:10,closer:30}},instances:{
  'door-a1':{checks:{'a-base':true,'legacy-point':true},rowStages:{'a-base':'done'},progress:100,overrides:{'a-base':{minutes:17}},customItems:[{id:'legacy-point',label:'Äldre egen punkt',value:'Utan sektion',note:'Ska ligga kvar i legacygruppen',quantity:1,minutes:5}]},
  'door-a2':{checks:{'a-base':true},rowStages:{},progress:100,overrides:{},customItems:[]},
  'door-b':{checks:{'b-base':true},rowStages:{},progress:100,overrides:{},customItems:[]}
 },automationItems:[],readTestData};
 payload.instances['door-a1'].customItems.push(...[['behor-a','Behör','2356'],['behor-b','Behörn','1 2356'],['holder-a','Porthållare','PH1'],['holder-b','Portållare','PH2'],['contact','Magnetkontkt','MK1']].map(([id,label,value])=>({id,label,value,quantity:1,minutes:null,kind:'work'})));
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}
async function openPrepared(page,bytes){
 await page.goto(url());
 await page.locator('#pwFile').setInputFiles({name:'custom-points-v925.pdf',mimeType:'application/pdf',buffer:bytes});
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
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:process.env.SMARTMATCH_DEVICE==='iphone'?{width:390,height:844}:process.env.SMARTMATCH_DEVICE==='ipad'?{width:820,height:1180}:{width:1366,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  try{
   await page.addInitScript(()=>{window.showSaveFilePicker=undefined;});
   await openPrepared(page,await fixture());
   await page.locator('#pwProjectMaterialButton').click();
   const group=name=>page.locator('.pwMaterialGroup').filter({has:page.locator('header strong',{hasText:name})});
   const row=name=>page.locator('.pwProjectMaterialRow').filter({has:page.getByRole('textbox',{name:'Produkt '+name,exact:true})});
   assert.equal(await group('Behör').locator('.pwProjectMaterialRow').count(),2,'one-character category typo groups alongside correct category');
   assert.equal(await group('Dörr-/porthållare').locator('.pwProjectMaterialRow').count(),2);
   assert.equal(await group('Magnetkontakt').locator('.pwProjectMaterialRow').count(),1);
   const bounds=await page.locator('#pwProjectMaterials .pwMaterialGroups').boundingBox();
   if(!process.env.SMARTMATCH_DEVICE){assert(bounds.width<=1001);assert(bounds.x>100);const cards=await page.locator('.pwMaterialGroup').evaluateAll(nodes=>nodes.slice(0,2).map(n=>n.getBoundingClientRect().x));assert.equal(cards[1],cards[0],'groups form one aligned list');}
   await row('PH1').getByRole('textbox',{name:'Produkt PH1',exact:true}).fill('PH1X');
   await row('1 2356').getByRole('textbox',{name:'Produkt 1 2356',exact:true}).fill('2356');
   await row('1 2356').getByRole('textbox',{name:'Minuter per styck 1 2356',exact:true}).fill('7,5');
   await row('2356').getByRole('textbox',{name:'Minuter per styck 2356',exact:true}).fill('5');
   await group('Behör').getByRole('button',{name:'Spara grupp',exact:true}).click();
   assert.match(await group('Behör').locator('[role=status]').innerText(),/olika tider/);
   let materials=await page.evaluate(()=>SmartMatchAppBridge.getProjectMaterials());assert(materials.some(r=>r.name==='1 2356'),'invalid batch does not partly rename');
   await row('2356').getByRole('textbox',{name:'Minuter per styck 2356',exact:true}).fill('7,5');
   await group('Behör').getByRole('button',{name:'Spara grupp',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('input[aria-label="Produkt 1 2356"]'));
   materials=await page.evaluate(()=>SmartMatchAppBridge.getProjectMaterials());assert.equal(materials.find(r=>r.name==='2356').minutes,7.5);assert.equal(materials.find(r=>r.name==='2356').quantity,2);
   assert.equal(await row('PH1').getByRole('textbox',{name:'Produkt PH1',exact:true}).inputValue(),'PH1X','saving group keeps other unsaved group drafts');
   assert(materials.some(r=>r.name==='PH1')&&!materials.some(r=>r.name==='PH1X'),'other groups not saved accidentally');
   await row('PH1').getByRole('combobox',{name:'Kategori PH1',exact:true}).selectOption('Beslag');
   await row('PH1').getByRole('button',{name:'Spara rad',exact:true}).click();
   await page.waitForFunction(()=>!!document.querySelector('input[aria-label="Produkt PH1X"]'));
   assert.equal(await group('Beslag').locator('input[aria-label="Produkt PH1X"]').count(),1);
   assert.equal(await group('Dörr-/porthållare').locator('.pwProjectMaterialRow').count(),1);
   assert(await page.locator('#pwProjectMaterials').evaluate(el=>el.scrollWidth<=el.clientWidth+2));
   await page.screenshot({path:'/tmp/material-groups940-'+(process.env.SMARTMATCH_DEVICE||'desktop')+'.png'});
   await row('MK1').getByRole('textbox',{name:'Minuter per styck MK1',exact:true}).fill('21');
   await row('ST400').getByRole('textbox',{name:'Minuter per styck ST400',exact:true}).fill('12');
   await row('PH2').getByRole('textbox',{name:'Minuter per styck PH2',exact:true}).fill('9');
   await row('PH2').getByRole('button',{name:'Spara rad',exact:true}).scrollIntoViewIfNeeded();
   const scrollBefore=await page.locator('#pwProjectMaterials').evaluate(node=>node.scrollTop);
   await row('PH2').getByRole('button',{name:'Spara rad',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('input[aria-label="Minuter per styck PH2"]').value==='9'&&!document.querySelector('input[aria-label="Minuter per styck PH2"]').closest('form').classList.contains('isDirty'));
   assert(await page.locator('#pwProjectMaterials').isVisible(),'material view stays active');
   const scrollAfter=await page.locator('#pwProjectMaterials').evaluate(node=>node.scrollTop);assert(Math.abs(scrollBefore-scrollAfter)<3,'saving keeps scroll position');
   assert.equal(await row('MK1').getByRole('textbox',{name:'Minuter per styck MK1',exact:true}).inputValue(),'21');
   await page.getByRole('button',{name:'Spara alla',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('.pwProjectMaterialRow.isDirty'));
   materials=await page.evaluate(()=>SmartMatchAppBridge.getProjectMaterials());assert.equal(materials.find(r=>r.name==='MK1').minutes,21);assert.equal(materials.find(r=>r.name==='ST400').minutes,12);
   const draft=await lastDraft(page);assert.equal(draft.timeConfig.productCategories.ph1x,'Beslag');assert.equal(draft.timeConfig.productMinutes['2356'],7.5);
   await page.locator('#pwProjectMaterials [data-close]').click();
   if(await page.locator('#pwShowPositions').isVisible())await page.locator('#pwShowPositions').click();
   await page.locator('#pwAllMarkerShapes').click();await page.locator('#pwSmartActionSelect').selectOption('ellipse');await page.locator('#pwSmartActionSave').click();
   await page.waitForFunction(()=>!document.getElementById('pwSmartActionDialog').open);
   await openPosition(page,'door-a1');
   await page.locator('#pwAddChecklistItem').click();await page.locator('#pwEditLabel').fill('Slutbleck');await page.locator('#pwEditValue').fill('STEP40');await page.locator('#pwEditQuantity').fill('2');await page.locator('#pwEditMinutes').fill('15');await page.locator('#pwEditSave').click();
   await page.waitForFunction(()=>!document.getElementById('pwItemEditor').open);
   const addedMaterials=await page.evaluate(()=>SmartMatchAppBridge.getProjectMaterials());assert.equal(addedMaterials.find(r=>r.name==='STEP40').quantity,2,'new door material appears immediately, once per quantity');
   await page.locator('#pwAddExtraTime').click();await page.locator('#pwEditMinutes').fill('60');await page.locator('#pwEditSave').click();
   await page.waitForFunction(()=>!document.getElementById('pwItemEditor').open);
   const extra=await page.evaluate(()=>SmartMatchAppBridge.getPositions().find(p=>p.id==='door-a1').customItems.find(i=>i.kind==='extra-time'));assert.equal(extra.minutes,60,'60 entered minutes stays one hour');
   assert.equal(await page.locator('#pwCardMaterials').count(),0);assert(await page.locator('#pwAddChecklistItem .smActionIcon').count());await page.screenshot({path:'/tmp/protocol943-'+(process.env.SMARTMATCH_DEVICE||'desktop')+'.png'});await closePosition(page);
   await page.locator('#labDiagnoseOpen').click();const reportBounds=await page.locator('#labDiagnosticDialog .smartReportsList').boundingBox();assert(reportBounds.width<=661);await page.screenshot({path:'/tmp/reports943-'+(process.env.SMARTMATCH_DEVICE||'desktop')+'.png'});await page.locator('#labDiagnosticDialog').evaluate(node=>node.close());
   await page.locator('#smartPdfInspect').click();await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled);
   await page.locator('#smartExportExactReturn').check();await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled);
   const downloading=page.waitForEvent('download');await page.locator('#smartExportBuild').click();const download=await downloading;const exported=fs.readFileSync(await download.path());
   if(!process.env.SMARTMATCH_DEVICE){
    await page.evaluate(()=>{window.showSaveFilePicker=async()=>({name:'portable.pdf',createWritable:async()=>({write:async data=>{window.__diskPdf=data},close:async()=>{}}),getFile:async()=>window.__diskPdf});});
    await page.locator('#smartExportBuild').click();
    await page.waitForFunction(()=>document.getElementById('smartExportStatus').textContent.includes('PDF sparad och kontrollerad:'));
    const disk=Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array(await window.__diskPdf.arrayBuffer()))));assert.deepEqual(disk,exported,'desktop file write contains exact verified PDF');
   }
   const doc=await PDFDocument.load(exported);assert.equal(doc.getPageCount(),5,'three position-specific card pages');assert.equal(doc.catalog.get(PDFName.of('SmartMatch23ExtraPages')).asNumber(),3);const saved=JSON.parse(doc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());
   assert.equal(saved.instances['door-a1'].customItems.find(i=>i.kind==='extra-time').minutes,60);assert.equal(saved.instances['door-a1'].overrides['a-base'].minutes,17,'existing saved minutes unchanged');assert.equal(saved.timeConfig.productMinutes.mk1,21);assert.equal(saved.timeConfig.positionShape,'ellipse');assert(saved.readTestData.groupMappings.GS10ALT,'manual card link embedded');
   const clean=await browser.newContext({viewport:{width:1366,height:900}});await clean.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
   const reopened=await clean.newPage();await openPrepared(reopened,exported);
   assert.equal(await reopened.locator('.pwStampHit[data-hit-shape="ellipse"]').count(),3);
   const reopenedPositions=await positions(reopened);assert.equal(reopenedPositions['door-a2'].code,'GS10ALT');
   await reopened.locator('#pwProjectMaterialButton').click();
   assert.equal(await reopened.getByRole('textbox',{name:'Produkt STEP40',exact:true}).count(),1);const restoredMaterials=await reopened.evaluate(()=>SmartMatchAppBridge.getProjectMaterials());assert.equal(restoredMaterials.find(r=>r.name==='STEP40').quantity,2);
   assert.equal(await reopened.locator('.pwMaterialGroup[data-category="Beslag"] input[aria-label="Produkt PH1X"]').count(),1);
   assert.equal(await reopened.getByRole('textbox',{name:'Minuter per styck 2356',exact:true}).inputValue(),'7.5');assert.equal(await reopened.getByRole('textbox',{name:'Minuter per styck MK1',exact:true}).inputValue(),'21');assert.equal(await reopened.getByRole('textbox',{name:'Minuter per styck ST400',exact:true}).inputValue(),'12');await clean.close();
   assert.deepEqual(errors,[]);console.log('PASS TEST 9.50: material groups and scroll, icons/reports, global marker form, real PDF export and clean-session restore of material settings and manual link');
  }finally{await context.close();}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
