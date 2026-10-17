/* Real-browser regression for reviewed group relinking and removing exactly one
 * drawing position. Generated fixtures only; no customer PDFs or auth changes. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),revision='9-8',metadataKey=PDFName.of('TillsynoSmartMatchV36Data');
const devices={desktop:{viewport:{width:1366,height:900}},ipad:{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2}};
const requested=process.env.SMARTMATCH_DEVICE,deviceNames=requested?[requested]:Object.keys(devices);
const server=http.createServer((request,response)=>{
 const filename=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!filename.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(filename)]||'application/octet-stream');response.end(fs.readFileSync(filename));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v${revision}.html`;
const clone=value=>JSON.parse(JSON.stringify(value));
function positionId(hit){return 'scan:'+hit.code+'@'+hit.page+':'+hit.rect.map(value=>Math.round(value*10)/10).join(',');}
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),pages=Array.from({length:4},()=>document.addPage([595,842]));
 const codeRect={x:.08,y:.08,w:.80,h:.06},tableRect={x:.08,y:.16,w:.80,h:.30},bounds={x:.06,y:.06,w:.86,h:.44},hits=[];
 const positions=[{page:1,x:60,y:670},{page:1,x:240,y:560},{page:1,x:410,y:450},{page:2,x:90,y:650},{page:2,x:280,y:510}];
 for(const [index,point]of positions.entries()){
  const {page,x,y}=point,rect=[x,y,x+100,y+25];pages[page-1].drawText('GS23',{x,y,font,size:18});
  hits.push({page,code:'GS23',rect,box:{x:x/595,y:(842-y-25)/842,w:100/595,h:25/842},selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000+index,label:'GS23'});
 }
 const wc={page:1,code:'WC',rect:[60,300,160,325],box:{x:60/595,y:(842-325)/842,w:100/595,h:25/842},selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870010,label:'WC'};
 pages[0].drawText('WC',{x:60,y:300,font,size:18});hits.push(wc);
 const cards={},checks={},instances={};
 for(const [index,code]of ['GS23','WC'].entries()){
  const page=index+3,work=code==='GS23'?['Lås GS23','Dörrstängare GS23']:['WC-behör WC','Dörrstängare WC'],prefix=code==='GS23'?'old':'new',id='generated-card:'+code;
  pages[page-1].drawText('Beslagskod: '+code,{x:60,y:750,size:20,font});work.forEach((text,row)=>pages[page-1].drawText(text,{x:60,y:670-row*30,size:15,font}));
  cards[id]={id,page,code,originalCardCode:code,header:'Beslagskod: '+code,rawTable:work.join('\n'),work,workItems:work.map((text,row)=>({key:prefix+'-'+row,text,label:text,section:'Övrigt',sectionKey:'ovrigt'})),workState:'ready',workPolicy:'all',codeRect,tableRect,bounds,choices:[code],method:'PDF-text',confidence:100};
 }
 for(const [index,hit]of hits.entries()){
  const id=positionId(hit),prefix=hit.code==='GS23'?'old':'new',own={[prefix+'-0']:index===0,[prefix+'-1']:index===1};checks[id]=own;
  instances[id]={checks:clone(own),rowStages:{['audit-'+index]:'ready'},progress:0,overrides:{[prefix+'-0']:{minutes:11+index,note:'Egen tid '+index}},customItems:[{id:'custom-'+index,label:'Egen kontroll '+index,value:'Unik position '+index,minutes:3+index}]};
 }
 const readTestData={schema:1,phase:'full',sourceId:'generated:group-relink',rects:{code:codeRect,table:tableRect},pages:[3,4],cards,checks,matching:{version:2,hits,pages:[{page:1,count:4,imageSkipped:true},{page:2,count:2,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated group relink'};
 const payload={schema:6,projectId:'project:generated-group-relink',projectRevision:1,instances,automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return {bytes:Buffer.from(await document.save()),payload,hits};
}
async function contextFor(browser,device){
 const context=await browser.newContext({...device,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__calls={scans:0,work:0,workers:0,guides:0};
  window.Tesseract={async createWorker(){__calls.workers++;throw Error('A prepared project must never start OCR');}};
  for(const [name,count]of [['SmartMatchReadMatcher','scans'],['SmartMatchReadWork','work']]){
   let value;Object.defineProperty(window,name,{configurable:true,get:()=>value,set:next=>{value={...next,[count==='scans'?'scan':'read']:()=>{__calls[count]++;throw Error('A prepared project must never rescan');}};}});
  }
  const show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')__calls.guides++;return show.call(this);};
 });
 return context;
}
async function open(page,bytes,count=6){
 await page.locator('#pwFile').setInputFiles({name:'generated-prepared-project.pdf',mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(expected=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===expected&&document.getElementById('pwScanOverlay').hidden,count,{timeout:60000});
 assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});
}
async function positions(page){return page.evaluate(()=>SmartMatchAppBridge.getPositions().map(position=>({...position})));}
async function groupDialog(page,code){
 if(await page.locator('#pwShowPositions').isVisible())await page.locator('#pwShowPositions').click();
 const drawing=page.locator('.pwDrawingCardGroup');if(!await drawing.evaluate(node=>node.open))await drawing.locator(':scope > summary').click();
 const group=page.locator('.pwGroupAccordion').filter({has:page.locator('.pmEditGroup[data-group-code="'+code+'"]')});
 if(!await group.evaluate(node=>node.open))await group.locator(':scope > summary').click();
 await page.locator('.pmEditGroup[data-group-code="'+code+'"]').click();await page.waitForSelector('#pmGroupDialog[open]');
}
async function saveGroup(page,{name,target}){
 await page.locator('#pmGroupCode').fill(name);await page.locator('#pmGroupCard').selectOption(String(target));
 const identity=page.locator('#pmGroupCardIdentity');if(await identity.isVisible()){
  const choices=await identity.locator('option').evaluateAll(nodes=>nodes.map(node=>({value:node.value,text:node.textContent})).filter(node=>node.value));
  if(choices.length===1)await identity.selectOption(choices[0].value);
 }
 await page.locator('#pmGroupSave').click();
}
async function exportPdf(page){
 await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');
 await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled,null,{timeout:60000});
 const downloading=page.waitForEvent('download');await page.locator('#smartExportBuild').click();
 const bytes=fs.readFileSync(await(await downloading).path());assert(bytes.length>1000);await page.locator('#smartExportClose').click();
 const document=await PDFDocument.load(bytes),payload=JSON.parse(document.catalog.lookup(metadataKey).decodeText());return {bytes,payload};
}
function unchangedPositionGeometry(actual,expected){
 assert.deepEqual(actual.map(position=>({id:position.id,page:position.page,rect:position.rect})),expected.map(position=>({id:position.id,page:position.page,rect:position.rect})), 'each door keeps its stable ID and its original drawing geometry');
}
async function assertProtocolHeaderLayout(page,narrow=false){
 const layout=await page.evaluate(()=>{
  const box=selector=>{const rect=document.querySelector(selector).getBoundingClientRect();return {x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,centerY:rect.y+rect.height/2};};
  return {back:box('#pwBack'),close:box('#pwProtocolClose'),identity:box('.pwProtocolIdentity'),remove:box('#pwRemovePosition'),header:box('.pwProtocolHeader'),width:innerWidth};
 });
 assert(Math.abs(layout.close.centerY-layout.back.centerY)<2,'the close X stays on the same header row as the return button');
 assert(Math.abs(layout.close.centerY-layout.identity.centerY)<2,'the close X stays on the same header row as the door identity');
 assert(layout.close.right<=layout.width+1&&layout.close.x>=0,'the close X remains within the viewport');
 if(narrow)assert(layout.remove.y>=Math.max(layout.back.bottom,layout.close.bottom,layout.identity.bottom)-1,'phone delete action occupies its own second row');
 else assert(Math.abs(layout.remove.centerY-layout.back.centerY)<2,'desktop and tablet delete action fits beside the return button');
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const input=await fixture();
  for(const name of deviceNames){
   assert(devices[name],'Unknown SMARTMATCH_DEVICE: '+name);const context=await contextFor(browser,devices[name]),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));await page.goto(url());await open(page,input.bytes);
   const initial=await positions(page),oldGroup=initial.filter(position=>position.code==='GS23');assert.equal(oldGroup.length,5);assert.equal(new Set(initial.map(position=>position.id)).size,6);
   if(process.env.SMARTMATCH_LAYOUT_ONLY){
    await groupDialog(page,'GS23');if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v98-group-'+name+'.png'});await page.locator('#pmGroupCancel').click();
    await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),oldGroup[0].id);await page.waitForSelector('#pwProtocol[open]');await assertProtocolHeaderLayout(page);
    if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v98-protocol-'+name+'.png'});
    if(name==='ipad'){
     await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await assertProtocolHeaderLayout(page,true);
     if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v98-protocol-iphone.png'});
    }
    assert.deepEqual(errors,[]);await context.close();console.log('PASS '+name+': group dialog and protocol header layout; close X remains beside return/identity'+(name==='ipad'?', including a 390px phone viewport':''));continue;
   }
   assert(oldGroup[0].checks['old-0']);assert(!oldGroup[1].checks['old-0']);assert(oldGroup[1].checks['old-1']);
   assert.deepEqual(Object.keys((await page.evaluate(()=>SmartMatchReadTest.payload())).groupMappings||{}),[],'an older prepared PDF migrates without fabricating reviewed relinks');
   console.log('PASS '+name+': TEST 9.7-format project opens in TEST 9.8 with independent checks and no OCR/search/guide');

   if(await page.locator('#pwShowPositions').isVisible())await page.locator('#pwShowPositions').click();
   await page.locator('#pwCurrentPageOnly').click();
   await groupDialog(page,'GS23');assert.match(await page.locator('#pmGroupCount').innerText(),/5/,'bulk dialog includes the two positions on the filtered-out drawing page');
   if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v98-group-'+name+'.png'});
   const beforeCancel=await page.evaluate(()=>SmartMatchReadTest.payload());await page.locator('#pmGroupCode').fill('Cancelled alias');await page.locator('#pmGroupCancel').click();
   assert.deepEqual(await page.evaluate(()=>SmartMatchReadTest.payload()),beforeCancel);unchangedPositionGeometry(await positions(page),initial);

   await groupDialog(page,'GS23');const beforeConflict=await page.evaluate(()=>SmartMatchReadTest.payload());
   await saveGroup(page,{name:'WC',target:3});await page.waitForFunction(()=>document.getElementById('pmGroupStatus').textContent.trim().length>0);
   assert.equal(await page.locator('#pmGroupDialog').evaluate(node=>node.open),true,'a conflicting existing group target remains reviewable');
   assert.match(await page.locator('#pmGroupStatus').innerText(),/annat|redan|konflikt|koppl/i);
   assert.deepEqual(await page.evaluate(()=>SmartMatchReadTest.payload()),beforeConflict,'conflicting relink cannot partially mutate read data');
   assert.deepEqual(await positions(page),initial,'conflicting relink cannot mutate any positions');await page.locator('#pmGroupCancel').click();
   console.log('PASS '+name+': cancel and conflicting group target leave every page and reading unchanged');

   await groupDialog(page,'GS23');await saveGroup(page,{name:'GS23',target:4});await page.waitForSelector('#pmGroupDialog[open]',{state:'detached'});
   const retargeted=await positions(page);unchangedPositionGeometry(retargeted,initial);assert.equal(retargeted.filter(position=>position.code==='GS23').length,5);
   assert.equal(await page.evaluate(()=>SmartMatchAppBridge.getDoorCardMapping().GS23),4,'same group code can be pointed at a different original door card');
   const mapping=await page.evaluate(()=>SmartMatchReadTest.payload());assert.deepEqual(Object.values(mapping.cards).map(card=>card.code),['GS23','WC'],'group mapping keeps both original card names');
   assert.equal(mapping.groupMappings.GS23.originalCardCode,'WC');
   for(const position of retargeted){assert.equal(position.customItems[0].id,initial.find(original=>original.id===position.id).customItems[0].id,'custom work remains attached to each separate door');}
   for(const position of retargeted.filter(position=>position.code==='GS23')){
    assert(!position.checks['new-0']&&!position.checks['new-1'],'an old card completion is never assigned to a different product');
    assert.deepEqual(position.overrides,{},'old product-specific time overrides are not assigned to the new card');
   }
   const unaffected=retargeted.find(position=>position.code==='WC'),oldUnaffected=initial.find(position=>position.id===unaffected.id);assert.deepEqual(unaffected.checks,oldUnaffected.checks);assert.deepEqual(unaffected.overrides,oldUnaffected.overrides);
   console.log('PASS '+name+': same-code relink changes all five doors on both pages, preserving original card names, stable IDs and the unrelated WC position');

   await groupDialog(page,'GS23');await saveGroup(page,{name:'GS23',target:3});await page.waitForSelector('#pmGroupDialog[open]',{state:'detached'});
   const back=await positions(page);unchangedPositionGeometry(back,initial);
   for(const position of back.filter(position=>position.code==='GS23')){
    const original=initial.find(previous=>previous.id===position.id);
    for(const key of ['checks','overrides','rowStages','customItems'])assert.deepEqual(position[key],original[key], 'returning to the old card restores each door\'s own '+key);
    assert.equal(position.estimatedMinutes,original.estimatedMinutes,'returning to the old card restores each door\'s own estimated time');
    assert.equal(position.doneMinutes,original.doneMinutes,'returning to the old card restores each door\'s own completed time');
   }
   await groupDialog(page,'GS23');await saveGroup(page,{name:'GS23',target:4});await page.waitForSelector('#pmGroupDialog[open]',{state:'detached'});
   console.log('PASS '+name+': relinking back restores the separate saved checks, row state and time overrides of all five doors');

   await groupDialog(page,'GS23');await saveGroup(page,{name:'GS 23 NY',target:4});await page.waitForSelector('#pmGroupDialog[open]',{state:'detached'});
   const renamed=await positions(page),group=renamed.filter(position=>position.code!=='WC'),newCode=group[0].code;assert.equal(group.length,5);assert.equal(new Set(group.map(position=>position.code)).size,1);assert.notEqual(newCode,'GS23');
   unchangedPositionGeometry(renamed,initial);assert.equal(await page.evaluate(code=>SmartMatchAppBridge.getDoorCardMapping()[code],newCode),4);
   await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),group[0].id);await page.waitForSelector('#pwProtocol[open]');
   assert.match(await page.locator('#pwProtocolPosition').innerText(),/dörrkort WC/);
   await page.locator('#pwChecklist .rtWorkRow input').first().check();await page.locator('#pwProtocolClose').click();
   const independent=await positions(page);assert(independent.find(position=>position.id===group[0].id).checks['new-0']);assert(!independent.find(position=>position.id===group[1].id).checks['new-0'],'checking one door never checks the other doors in the group');

   const removed=group[2];await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),removed.id);await page.waitForSelector('#pwProtocol[open]');
   await assertProtocolHeaderLayout(page);
   if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v98-protocol-'+name+'.png'});
   await page.locator('#pwRemovePosition').click();await page.waitForSelector('#pwSmartActionDialog[open]');await page.locator('#pwSmartActionSave').click();
   await page.waitForFunction(id=>SmartMatchAppBridge.getPositions().length===5&&!SmartMatchAppBridge.getPositions().some(position=>position.id===id),removed.id);
   assert.equal(await page.locator('#pwProtocol').evaluate(node=>node.open),false,'deleting the opened position closes its obsolete door-card view');
   const final=await positions(page);assert.equal(final.filter(position=>position.code===newCode).length,4);assert.equal(final.filter(position=>position.code==='WC').length,1);
   const read=await page.evaluate(()=>SmartMatchReadTest.payload());assert(read.removedReadPositions.some(position=>position.id===removed.id),'the exact removed geometry is retained for later scans');
   const saved=await exportPdf(page);assert.deepEqual(saved.payload.readTestData,read,'portable PDF includes group mapping, checks and removed-position suppression');
   for(const position of oldGroup){
    const history=saved.payload.positionEdits[position.id].cardWorkHistory['generated-card:GS23'];assert(history,'the former card\'s independent work history is embedded in the portable PDF');
    for(const key of ['checks','overrides','rowStages','progress'])assert.deepEqual(history[key],position[key], 'archived '+key+' remains attached to the original door and original card');
   }
   assert.deepEqual(await page.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});assert.deepEqual(errors,[]);await context.close();

   const fresh=await contextFor(browser,devices[name]),reopened=await fresh.newPage();await reopened.goto(url());await open(reopened,saved.bytes,5);
   const restoredRead=await reopened.evaluate(()=>SmartMatchReadTest.payload());
   assert.deepEqual({...restoredRead,sourceId:read.sourceId},read,'a clean browser restores the complete reviewed state without rescanning (the source hash follows the newly exported PDF bytes)');
   const restored=await positions(reopened);unchangedPositionGeometry(restored,final);for(const position of restored){const previous=final.find(original=>original.id===position.id);for(const key of ['checks','overrides','customItems','rowStages'])assert.deepEqual(position[key],previous[key],key+' stays attached to the same door after portable reopen');}
   assert.equal(await reopened.evaluate(code=>SmartMatchAppBridge.getDoorCardMapping()[code],newCode),4);assert(!restored.some(position=>position.id===removed.id));
   for(const [kind,position]of [['deleted',removed],['already linked',restored.find(position=>position.code===newCode)]]){
    // Feed a later scanner discovery through the same bridge used by reviewed
    // scan results, under a different code. Geometry must take precedence.
    const discovery=await reopened.evaluate(hit=>SmartMatchAppBridge.addManualReadPositions({code:'WC',drawingLabel:'WC',cardPage:4,cardCode:'WC',hits:[{page:hit.page,rect:hit.rect,code:'WC',selected:true}]}),position);
    assert.equal(discovery.added,0,'rediscovering an '+kind+' physical stamp under another code cannot create a new position');assert.equal(discovery.duplicates,1);
    assert.deepEqual(await positions(reopened),restored,'ignored rediscovery must preserve every existing door and its individual work');
   }
   const savedAgain=await exportPdf(reopened);assert.deepEqual(savedAgain.payload.readTestData,restoredRead,'saving after ignored rediscovery keeps the reviewed group and deletion state');
   assert.deepEqual(await reopened.evaluate(()=>__calls),{scans:0,work:0,workers:0,guides:0});await fresh.close();
   const finalContext=await contextFor(browser,devices[name]),finalPage=await finalContext.newPage();await finalPage.goto(url());await open(finalPage,savedAgain.bytes,5);
   unchangedPositionGeometry(await positions(finalPage),restored);assert(!await finalPage.evaluate(id=>SmartMatchAppBridge.getPositions().some(position=>position.id===id),removed.id));await finalContext.close();
   console.log('PASS '+name+': renamed group, independent checks and one-position deletion export/reopen without OCR; later discovery under another code cannot duplicate or resurrect a position');
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
