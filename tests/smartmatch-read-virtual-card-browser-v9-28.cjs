/* Avläsning TEST 9.28: an unmatched drawing position can create and link a
 * searchable vector door-card page. Every entered row stays on the generated
 * PDF page, only GS rows become checklist points, and the card, link and
 * per-position completion survive the ordinary draft and exported PDF.
 * Generated searchable PDF only; auth is stubbed inside this browser test. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');

const root=path.resolve(__dirname,'..');
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-28.html`;
const codeRect={x:.06,y:.05,w:.55,h:.07},tableRect={x:.05,y:.15,w:.90,h:.66},bounds={x:.04,y:.04,w:.92,h:.80};

function basePayload(){
 const row={key:'template-row',text:'Trycke · 6696',legacyText:'Trycke · 6696',label:'Trycke',value:'6696',quantity:1,section:'Daglåsning',sectionKey:'daglasning',tableIndex:0,sourceRow:2,sourceIdentity:'gs:0:2:daglasning:trycke:6696',responsibility:'GS'};
 const card={id:'card-template',page:2,code:'GS99',originalCardCode:'GS99',header:'Beslagskod: GS99',codeRect,tableRect,bounds,rawTable:'Trycke 6696 GS',work:[row.text],workItems:[row],workState:'ready',workPolicy:'gs-install-v3',choices:['GS99'],method:'PDF-text',confidence:100};
 const rect=[385,650,445,682],hit={page:1,code:'GS99',rect,box:{x:rect[0]/595,y:(842-rect[3])/842,w:(rect[2]-rect[0])/595,h:(rect[3]-rect[1])/842},positionId:'template-door',selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000};
 const readTestData={schema:1,phase:'full',sourceId:'generated:virtual-card-v926',rects:{code:codeRect,table:tableRect},pages:[2],cards:{'card-template':card},checks:{'template-door':{'template-row':false}},matching:{version:2,hits:[hit],pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Virtual door card TEST 9.28'};
 const missing={id:'missing-door',manual:true,code:'D101',page:1,rect:[65,675,145,708],order:0,sourceKind:'project-code',label:'D101',scanSource:'manual',checks:{},rowStages:{},overrides:{},customItems:[],attentionItems:[],progress:0};
 return {schema:6,projectId:'project:virtual-card-v926',projectRevision:1,sourceName:'virtual-card-v926.pdf',manualPositions:[missing],positionEdits:{},ignoredCodes:[],labManualLinks:{},instances:{
  'missing-door':{checks:{},rowStages:{},progress:0,overrides:{},customItems:[],attentionItems:[]},
  'template-door':{checks:{'template-row':false},rowStages:{},progress:0,overrides:{},customItems:[],attentionItems:[]}
 },automationItems:[],readTestData};
}
async function fixture(payload=basePayload()){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const plan=document.addPage([595,842]);
 plan.drawText('D101',{x:70,y:680,size:18,font:bold});plan.drawText('GS99',{x:390,y:655,size:18,font:bold});plan.drawText('PLANRITNING',{x:230,y:790,size:13,font});
 const existing=document.addPage([595,842]);existing.drawText('Dorrkort GS99',{x:40,y:780,size:17,font:bold});existing.drawText('Beslagskod: GS99',{x:40,y:750,size:14,font:bold});existing.drawText('Trycke 6696 GS',{x:40,y:690,size:11,font});
 const json=JSON.stringify(payload);
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(json));
 return Buffer.from(await document.save());
}
async function contextFor(browser,options={}){
 const context=await browser.newContext({viewport:{width:1440,height:960},locale:'sv-SE',acceptDownloads:true,...options});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  // Creating or reopening a virtual card is a payload operation. It must not
  // silently fall back to OCR simply because the card has no physical page.
  window.Tesseract={async createWorker(){throw Error('Virtual card flow must not start OCR');}};
  // This test inspects the downloaded bytes. Chromium may expose the desktop
  // file picker on localhost, which would open a native picker instead.
  try{Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true})}catch(_){window.showSaveFilePicker=undefined;}
 });
 return context;
}
async function openPrepared(page,bytes,name='virtual-card-v926.pdf'){
 await page.goto(url());
 await page.locator('#pwFile').setInputFiles({name,mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf?.()&&SmartMatchAppBridge.getPositions().length===2&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
}
async function openMissingCardChooser(page){
 const group=page.locator('.pwGroupAccordion[data-code="D101"]');
 const side=page.locator('#pwSide');
 if(!await side.isVisible()){
  const show=page.locator('#pwShowPositions');assert.equal(await show.isVisible(),true,'the collapsed position list exposes its ordinary show button');await show.click();
 }
 await page.locator('.pwDrawingCardGroup > summary').click();
 await group.locator('summary').click();
 assert.match(await group.innerText(),/saknar dörrkort/i,'the fixture starts as one visibly unmatched position');
 await group.locator('.pwUnifiedMore').click();
 await page.getByRole('menuitem',{name:/Koppla dörrkort/i}).click();
 await page.waitForSelector('#labSelectDialog[open]');
 assert.match(await page.locator('#labDialogText').innerText(),/Inget matchande dörrkort/i);
}
async function fillRow(row,{section,label,value,quantity,installer}){
 await row.locator('[data-field="section"]').selectOption({label:section});
 await row.locator('[data-field="label"]').fill(label);
 await row.locator('[data-field="value"]').fill(value);
 await row.locator('[data-field="quantity"]').fill(String(quantity));
 await row.locator('[data-field="installer"]').selectOption(installer);
}
function rowResponsibility(row){return String(row?.installer||row?.responsibility||row?.installedBy||'').toLocaleUpperCase('sv-SE');}
function generatedCards(payload){return Object.values(payload?.readTestData?.cards||{}).filter(card=>card.generated===true);}
async function exportedProject(buffer){
 const document=await PDFDocument.load(buffer,{ignoreEncryption:true,updateMetadata:false});
 const stored=document.catalog.get(PDFName.of('TillsynoSmartMatchV36Data'))||document.catalog.get(PDFName.of('TillsynoSmartMatchV30Data'));
 assert(stored&&typeof stored.decodeText==='function','the exported PDF contains readable SmartMatch project metadata');
 return {document,payload:JSON.parse(stored.decodeText())};
}
async function tabletEditorLayout(page){
 return page.evaluate(()=>{
  const dialog=document.getElementById('pwVirtualCardEditor'),body=dialog.querySelector('.pwVirtualCardBody'),row=dialog.querySelector('.pwVirtualCardRow'),labels=[...row.querySelectorAll(':scope > label')],rect=node=>{const value=node.getBoundingClientRect();return {left:value.left,top:value.top,right:value.right,bottom:value.bottom,width:value.width,height:value.height}};
  const dialogRect=rect(dialog),rowRect=rect(row),labelRects=labels.map(rect),controls=[...dialog.querySelectorAll('button,input,select')].filter(node=>getComputedStyle(node).display!=='none'&&node.getClientRects().length).map(node=>({id:node.id||node.dataset.field||node.dataset.action||node.tagName,height:rect(node).height}));
  return {viewport:innerWidth,dialogRect,rowRect,labelRects,controls,overflow:{dialog:dialog.scrollWidth-dialog.clientWidth,body:body.scrollWidth-body.clientWidth,row:row.scrollWidth-row.clientWidth}};
 });
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await contextFor(browser),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await openPrepared(page,await fixture());
   await page.evaluate(()=>{
    window.__virtualDrafts=[];
    window.__virtualCacheCalls=0;
    SmartMatchSession.queueDraft=entry=>{window.__virtualDrafts.push(structuredClone(entry.payload));return entry.payload;};
    const cache=SmartMatchSession.cachePdf?.bind(SmartMatchSession);
    if(cache)SmartMatchSession.cachePdf=async(...args)=>{window.__virtualCacheCalls++;return cache(...args);};
   });
   await openMissingCardChooser(page);
   const create=page.locator('#labCreateVirtualCard');
   assert.equal(await create.isVisible(),true,'an unmatched position offers a project-local door card');
   await create.click();await page.waitForSelector('#pwVirtualCardEditor[open]');
   assert.equal(await page.locator('#labSelectDialog').getAttribute('open'),null,'the card chooser closes before its editor opens');
   const code=page.locator('#pwVirtualCardCode');assert.equal(await code.inputValue(),'D101','the drawing designation is carried into the new card');
   assert.equal(await code.getAttribute('readonly'),'','the drawing designation stays locked to the selected unmatched group');
   await page.locator('#pwVirtualCardName').fill('Dörrkort D101');
   await page.locator('#pwVirtualCardDescription').fill('Skapat i fält för dörr utan levererat kort');

   let rows=page.locator('#pwVirtualCardRows .pwVirtualCardRow');assert.equal(await rows.count(),1,'the editor starts with one usable row');
   await fillRow(rows.first(),{section:'Övrig utrustning',label:'Dörrstängare',value:'DC700',quantity:2,installer:'GS'});
   await page.locator('#pwVirtualCardAddRow').click();rows=page.locator('#pwVirtualCardRows .pwVirtualCardRow');assert.equal(await rows.count(),2);
   await fillRow(rows.nth(1),{section:'Nattlåsning',label:'Cylinder',value:'C10',quantity:1,installer:'DT'});
   await page.locator('#pwVirtualCardSave').click();
   await page.waitForFunction(()=>!document.getElementById('pwVirtualCardEditor').open&&document.getElementById('pwProtocol').open&&SmartMatchAppBridge.getPdf().numPages===3,null,{timeout:30000});

   const generatedPage=await page.evaluate(async()=>{
    const pdf=SmartMatchAppBridge.getPdf(),content=await (await pdf.getPage(pdf.numPages)).getTextContent();
    return {count:pdf.numPages,text:content.items.map(item=>item.str).join(' '),index:SmartMatchReadTest.getSavedCardIndex(),mapping:SmartMatchAppBridge.getDoorCardMapping(),cardId:document.getElementById('pwProtocolCanvas').dataset.readCardId||''};
   });
   assert.equal(generatedPage.count,3,'saving appends exactly one physical door-card page');
   assert.match(generatedPage.text,/D101/);assert.match(generatedPage.text,/Övrig utrustning/i);assert.match(generatedPage.text,/Dörrstängare/);assert.match(generatedPage.text,/DC700/);assert.match(generatedPage.text,/Nattlåsning/i);assert.match(generatedPage.text,/Cylinder/);assert.match(generatedPage.text,/C10/);assert.match(generatedPage.text,/GS/);assert.match(generatedPage.text,/DT/,'all entered rows are searchable vector text on the generated page');
   assert(generatedPage.index.some(entry=>entry.page===3&&entry.regions.some(region=>region.code==='D101')),'the generated page enters the saved door-card index immediately');
   assert.equal(generatedPage.mapping.D101,3,'the unmatched drawing code is linked to the generated page');
   assert(generatedPage.cardId,'the ordinary card canvas opens the generated source card');
   assert.equal(await page.locator('#pwProtocolMissing').isVisible(),false,'the linked virtual card is not presented as a missing protocol');
   assert.equal(await page.locator('#pwRereadCard').isHidden(),true,'a generated structured card never offers unnecessary OCR rereading');
   const gsRow=page.locator('#pwChecklist .pwCheckRow').filter({hasText:'DC700'});assert.equal(await gsRow.count(),1,'the GS row becomes one checklist point');
   assert.match(await gsRow.innerText(),/Dörrstängare/);assert.match(await gsRow.innerText(),/2/,'the checklist retains the entered quantity');
   assert.equal(await page.locator('#pwChecklist .pwCheckRow').filter({hasText:'C10'}).count(),0,'a DT row stays on the card but never becomes GS work');
   assert.equal(await gsRow.locator('input[type="checkbox"]').isChecked(),false);
   await gsRow.locator('input[type="checkbox"]').check();
   await page.waitForFunction(()=>document.getElementById('pwChecklistMeta').textContent.includes('1 / 1 klara'));

   const saved=await page.evaluate(()=>structuredClone(window.__virtualDrafts.at(-1)));
   assert(saved,'the ordinary save path emits a portable payload after checking the row');
   const cards=generatedCards(saved);assert.equal(cards.length,1,'one generated source card is stored in readTestData');
   const savedCard=cards[0],savedRows=savedCard.workItems||[],documentRows=savedCard.generatedRows||savedCard.rows||savedCard.cardRows||[];
   assert.equal(savedCard.code,'D101');assert.equal(savedCard.page,3);assert.equal(savedCard.method,'Skapat i SmartMatch');assert.equal(savedCard.workState,'ready');
   assert.equal(savedRows.length,1,'only the GS responsibility is stored as actionable work');
   assert(savedRows.some(row=>/DC700/.test(String(row.value||row.text||''))&&rowResponsibility(row)==='GS'));
   assert.equal(savedRows.some(row=>/C10/.test(String(row.value||row.text||''))),false,'the DT row is document text but not actionable GS work');
   assert.equal(documentRows.length,2,'the structured generated card keeps both entered document rows');
   assert(documentRows.some(row=>/C10/.test(String(row.value||row.text||''))&&rowResponsibility(row)==='DT'));
   assert(saved.readTestData.pages.includes(3),'the appended card page is part of the validated read-data page set');
   assert.equal(saved.labManualLinks.D101,3,'the project payload keeps the drawing-to-card page link');
   const checked=Object.entries(saved.instances['missing-door'].checks||{}).filter(([,value])=>value===true);
   assert.equal(checked.length,1,'the physical position stores its independent completed GS row');
   await page.waitForFunction(()=>window.__virtualCacheCalls>0,null,{timeout:10000});
   const sourcePageCount=await page.evaluate(async()=>{
    const copy=SmartMatchAppBridge.getOriginalPdfBytes().slice(),doc=await PDFLib.PDFDocument.load(copy,{ignoreEncryption:true,updateMetadata:false});return doc.getPageCount();
   });
   assert.equal(sourcePageCount,3,'the crash/local cache source bytes contain the appended page as well');
   assert.deepEqual(errors,[]);

   await page.locator('#pwProtocolClose').click();
   await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');
   await page.waitForFunction(()=>document.getElementById('smartExportPercent').textContent.trim()==='100 %'&&!document.getElementById('smartExportBuild').disabled,null,{timeout:120000});
   await page.evaluate(()=>{try{Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined});}catch(_){}const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob?.type==='application/pdf')window.__virtualExportBlob=blob;return create(blob);};});
   await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>window.__virtualExportBlob?.size>0);
   const exported=Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array(await window.__virtualExportBlob.arrayBuffer())))),portable=await exportedProject(exported);
   assert.equal(portable.document.getPageCount(),3,'the verified project export retains the generated PDF page once');
   assert.equal(generatedCards(portable.payload).length,1,'the export embeds the generated source card');
   assert.equal(portable.payload.instances['missing-door'].checks[checked[0][0]],true,'the export embeds its checked GS point');

   await context.close();
   const restoredContext=await contextFor(browser),restoredPage=await restoredContext.newPage(),restoredErrors=[];restoredPage.on('pageerror',error=>restoredErrors.push(error.message));
   try{
    await openPrepared(restoredPage,exported,'virtual-card-v926-restored.pdf');
    const restoredPayload=await restoredPage.evaluate(()=>SmartMatchAppBridge.save());
    assert.equal(generatedCards(restoredPayload).length,1,'the generated card is restored directly from embedded project data');
    assert.equal(restoredPayload.labManualLinks.D101,3,'the card link is restored without rescanning or recreating the card');
    assert.equal(await restoredPage.evaluate(()=>SmartMatchReadTest.getSavedCardIndex().some(entry=>entry.page===3&&entry.regions.some(region=>region.code==='D101'))),true);
    await restoredPage.evaluate(()=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id==='missing-door')));
    await restoredPage.waitForSelector('#pwProtocol[open]');await restoredPage.waitForFunction(()=>!!document.getElementById('pwProtocolCanvas').dataset.readCardId);
    assert.equal(await restoredPage.evaluate(()=>SmartMatchAppBridge.getPdf().numPages),3);
    const restoredGs=restoredPage.locator('#pwChecklist .pwCheckRow').filter({hasText:'DC700'});assert.equal(await restoredGs.count(),1);
    assert.equal(await restoredGs.locator('input[type="checkbox"]').isChecked(),true,'the completed state survives a new browser project open');
    assert.equal(await restoredPage.locator('#pwChecklist .pwCheckRow').filter({hasText:'C10'}).count(),0);
    assert.deepEqual(restoredErrors,[]);
   }finally{await restoredContext.close();}

   const tabletContext=await contextFor(browser,{viewport:{width:820,height:1180},screen:{width:820,height:1180},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'}),tabletPage=await tabletContext.newPage(),tabletErrors=[];tabletPage.on('pageerror',error=>tabletErrors.push(error.message));
   try{
    await openPrepared(tabletPage,await fixture(),'virtual-card-v926-ipad.pdf');await openMissingCardChooser(tabletPage);
    await tabletPage.locator('#labCreateVirtualCard').click();await tabletPage.waitForSelector('#pwVirtualCardEditor[open]');
    const layout=await tabletEditorLayout(tabletPage),[sectionLabel,nameLabel,valueLabel]=layout.labelRects;
    assert(layout.dialogRect.left>=-1&&layout.dialogRect.right<=layout.viewport+1,'the iPad editor stays inside the portrait viewport');
    for(const [area,overflow]of Object.entries(layout.overflow))assert(overflow<=1,'the iPad '+area+' has no horizontal overflow');
    assert(sectionLabel.width>=layout.rowRect.width*.85&&nameLabel.width>=layout.rowRect.width*.85&&valueLabel.width>=layout.rowRect.width*.85,'the three long row fields use full stacked width on iPad portrait');
    assert(nameLabel.top>=sectionLabel.bottom-1&&valueLabel.top>=nameLabel.bottom-1,'the section, name and value fields are vertically stacked');
    assert(layout.controls.length>0&&layout.controls.every(control=>control.height>=43.5),'every visible iPad editor control has at least a 44 px touch target');
    await tabletPage.locator('#pwVirtualCardName').fill('Dörrkort D101 iPad');
    const tabletRow=tabletPage.locator('#pwVirtualCardRows .pwVirtualCardRow').first();
    await fillRow(tabletRow,{section:'Övrig utrustning',label:'Dörrstängare',value:'DC700',quantity:1,installer:'GS'});
    await tabletPage.locator('#pwVirtualCardSave').click();
    await tabletPage.waitForFunction(()=>!document.getElementById('pwVirtualCardEditor').open&&document.getElementById('pwProtocol').open&&SmartMatchAppBridge.getPdf().numPages===3,null,{timeout:30000});
    const tabletGs=tabletPage.locator('#pwChecklist .pwCheckRow').filter({hasText:'DC700'});assert.equal(await tabletGs.count(),1,'the generated GS row opens in the iPad checklist');
    assert.equal(await tabletPage.locator('#pwChecklist .pwCheckRow').filter({hasText:'DC700'}).locator('input[type="checkbox"]').isChecked(),false);
    assert.deepEqual(tabletErrors,[]);
   }finally{await tabletContext.close();}

   const rollbackContext=await contextFor(browser),rollbackPage=await rollbackContext.newPage(),rollbackErrors=[];rollbackPage.on('pageerror',error=>rollbackErrors.push(error.message));
   try{
    await openPrepared(rollbackPage,await fixture(),'virtual-card-v926-rollback.pdf');
    await rollbackPage.evaluate(()=>{
     window.__rollbackCacheCalls=0;
     SmartMatchSession.flushDraft=async()=>true;
     const cache=SmartMatchSession.cachePdf.bind(SmartMatchSession);
     SmartMatchSession.cachePdf=async(...args)=>{window.__rollbackCacheCalls++;if(window.__rollbackCacheCalls===1)return false;return cache(...args);};
    });
    await openMissingCardChooser(rollbackPage);await rollbackPage.locator('#labCreateVirtualCard').click();await rollbackPage.waitForSelector('#pwVirtualCardEditor[open]');
    await rollbackPage.locator('#pwVirtualCardName').fill('Dörrkort D101 rollback');
    await fillRow(rollbackPage.locator('#pwVirtualCardRows .pwVirtualCardRow').first(),{section:'Övrig utrustning',label:'Dörrstängare',value:'DC700',quantity:1,installer:'GS'});
    await rollbackPage.locator('#pwVirtualCardSave').click();
    await rollbackPage.waitForFunction(()=>{
     const error=document.getElementById('pwVirtualCardError'),save=document.getElementById('pwVirtualCardSave');
     return document.getElementById('pwVirtualCardEditor').open&&!error.hidden&&/nya PDF-sidan kunde inte sparas lokalt/i.test(error.textContent||'')&&!save.disabled&&SmartMatchAppBridge.getPdf()?.numPages===2;
    },null,{timeout:90000});
    const rollback=await rollbackPage.evaluate(async()=>{
     const payload=SmartMatchAppBridge.save(),source=await PDFLib.PDFDocument.load(SmartMatchAppBridge.getOriginalPdfBytes().slice(),{ignoreEncryption:true,updateMetadata:false});
     return {pageCount:SmartMatchAppBridge.getPdf().numPages,sourcePageCount:source.getPageCount(),payload,index:SmartMatchReadTest.getSavedCardIndex(),mapping:SmartMatchAppBridge.getDoorCardMapping(),positions:SmartMatchAppBridge.getPositions(),cacheCalls:window.__rollbackCacheCalls,error:document.getElementById('pwVirtualCardError').textContent,dialogOpen:document.getElementById('pwVirtualCardEditor').open};
    });
    assert.equal(rollback.dialogOpen,true,'a failed local PDF cache keeps the editor open with the entered card available to retry');
    assert.match(rollback.error,/nya PDF-sidan kunde inte sparas lokalt/i,'the editor explains why the generated card was rolled back');
    assert.equal(rollback.pageCount,2,'the active PDF rolls back to its original two pages');
    assert.equal(rollback.sourcePageCount,2,'the crash-cache source bytes roll back to the original two-page PDF');
    assert.equal(generatedCards(rollback.payload).length,0,'no generated source card remains after rollback');
    assert.equal(rollback.payload.labManualLinks?.D101,undefined,'no generated manual link remains in the project payload');
    assert.equal(rollback.mapping.D101,undefined,'the live drawing-to-card map is restored to unmatched');
    assert.equal(rollback.index.some(entry=>entry.page===3||entry.regions?.some(region=>region.code==='D101')),false,'the saved card index contains neither the discarded page nor its D101 card');
    const restoredMissing=rollback.positions.find(position=>position.id==='missing-door');
    assert(restoredMissing&&restoredMissing.code==='D101','the original unmatched D101 drawing position survives rollback');
    assert.equal(rollback.positions.length,2,'rollback neither loses nor duplicates drawing positions');
    assert(rollback.cacheCalls>=2,'the first cache rejection triggers a second cache attempt for the restored original PDF');
    assert.deepEqual(rollbackErrors,[]);
   }finally{await rollbackContext.close();}
   console.log('PASS TEST 9.28: unmatched stamp creates and links a searchable vector door-card page; GS-only checklist survives draft/export/restore, the iPad portrait editor stays touch-safe, and a failed PDF cache rolls back page, card and link atomically');
  }catch(error){if(!page.isClosed())await context.close();throw error;}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
