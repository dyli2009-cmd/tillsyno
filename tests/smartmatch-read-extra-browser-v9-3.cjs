/* TEST 9.3: manually add missing plan positions without repeating reviewed
 * matching, losing existing work, or searching generated/card pages.
 * Generated PDFs only; native PDF-text tests forbid creating an OCR worker.
 * SMARTMATCH_DEVICE=desktop|ipad|iphone limits responsive coverage.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,PDFNumber,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),artifacts=fs.mkdtempSync(path.join(os.tmpdir(),'smartmatch-extra-v9-3-'));
const devices=[{name:'desktop',width:1366,height:900},{name:'ipad',width:820,height:1180,touch:true},{name:'iphone',width:390,height:844,touch:true}].filter(device=>!process.env.SMARTMATCH_DEVICE||device.name===process.env.SMARTMATCH_DEVICE);
const codeRect={x:.08,y:.08,w:.78,h:.06},tableRect={x:.06,y:.20,w:.89,h:.35};
const sample={page:1,rect:{x:290/1200,y:215/700,w:110/1200,h:55/700}};
const oldId='scan:GS23@1:65,575,195,610';
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-3.html`;
const upload=(bytes,name='reviewed-extra-positions.pdf')=>({name,mimeType:'application/pdf',buffer:bytes});
function rowKey(text,index){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return 'read:'+index+':'+(h>>>0).toString(36);}
function box(rect,w=1200,h=700){return {x:rect[0]/w,y:(h-rect[3])/h,w:(rect[2]-rect[0])/w,h:(rect[3]-rect[1])/h};}
async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),red=rgb(.85,.08,.08),blue=rgb(.05,.15,.85),green=rgb(.05,.65,.15),plan1=doc.addPage([1200,700]),plan2=doc.addPage([1200,700]);
 doc.setTitle('Original plan metadata must survive');
 plan1.drawText('GS23',{x:70,y:580,size:28,font});
 for(const [label,x,y,color]of [['DBL-1',300,450,red],['DBL-1',760,450,blue],['DBL-DS',300,200,red],['XDBLX',760,200,red]])plan1.drawText(label,{x,y,size:28,font,color});
 plan2.drawText('DBL-1',{x:180,y:470,size:28,font,color:red});plan2.drawText('WC 77',{x:700,y:300,size:28,font,color:green});
 const rows=[['Komponent','Produkt','Levereras av','Monteras av'],['Lashus','SL660','GS','GS'],['Trycke','6696','DT','GS'],['Slutbleck','STD','GS','DT']];
 for(const code of ['GS23','DBL']){
  const card=doc.addPage([595,842]);card.drawText('Beslagskod: '+code,{x:60,y:750,size:20,font});
  for(const [row,values]of rows.entries())for(const [column,text]of values.entries())card.drawText(text,{x:[40,190,350,460][column],y:650-row*35,size:11,font});
 }
 // Older files can contain a generated suffix. It must never become a
 // drawing-page search target, even though it contains the same label.
 doc.addPage([1200,700]).drawText('DBL-1',{x:180,y:470,size:28,font,color:red});
 doc.catalog.set(PDFName.of('SmartMatch21OriginalPages'),PDFNumber.of(4));
 const work=['Lashus · SL660','Trycke · 6696'];
 const cards={old:{id:'old',page:3,code:'GS23',header:'Beslagskod: GS23',rawTable:rows.map(row=>row.join(' ')).join('\n'),work,workItems:work.map((text,index)=>({text,label:['Lashus','Trycke'][index],value:['SL660','6696'][index],section:'Daglasning'})),workState:'ready',workPolicy:'gs-install-v2',codeRect,tableRect,bounds:{x:0,y:0,w:1,h:1},choices:['GS23'],method:'PDF-text',confidence:100},extra:{id:'extra',page:4,code:'DBL',header:'Beslagskod: DBL',rawTable:'',work:[],workItems:[],workState:'pending',codeRect,tableRect:null,bounds:{x:0,y:0,w:1,h:1},choices:['DBL'],method:'PDF-text',confidence:100}};
 const rect=[65,575,195,610],matching={version:2,hits:[{page:1,code:'GS23',rect,box:box(rect),source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000,selected:true,label:'GS23'}],pages:[{page:1,count:1,scanMode:'PDF-text',imageSkipped:true}],warnings:[],review:{version:1,approved:true}};
 const readTestData={schema:1,sourceId:'generated-extra-fixture',phase:'codes',rects:{code:codeRect,table:tableRect},pages:[3,4],cards,checks:{[oldId]:{[rowKey(work[0],0)]:true}},matching,drawingSample:null,name:'Generated reviewed old project',imageMode:'text'};
 const project={schema:6,projectRevision:1,projectId:'extra-position-browser-fixture',instances:{[oldId]:{checks:{[rowKey(work[0],0)]:true},progress:50}},automationItems:[],readTestData};
 doc.catalog.set(PDFName.of('TillsynoSmartMatchV36Data'),PDFHexString.fromText(JSON.stringify(project)));
 return Buffer.from(await doc.save());
}
async function forgottenCard(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),card=doc.addPage([595,842]);
 card.drawText('Projektets egen benamning: NYTT KORT',{x:45,y:750,size:18,font});
 const values=[['Komponent','Produkt','Levereras av','Monteras av'],['Dorrstangare','DC700','DT','GS']];
 for(const [row,items]of values.entries())for(const [column,text]of items.entries())card.drawText(text,{x:[40,190,350,460][column],y:650-row*35,size:11,font});
 return Buffer.from(await doc.save());
}
async function contextFor(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__extraCalls={workers:0,recognize:0,scans:0,pages:[]};window.__extraDelay=0;window.__captureExtra=false;
  window.Tesseract={createWorker(){window.__extraCalls.workers++;throw Error('Native extra-position search must not initialize OCR');}};
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:value=>{matcher={...value,scan(options){window.__extraCalls.scans++;return value.scan(options);}};}});
  let library;Object.defineProperty(window,'pdfjsLib',{configurable:true,get:()=>library,set:value=>{library=new Proxy(value,{get(target,key){if(key!=='getDocument')return Reflect.get(target,key);return(...args)=>{
   const task=target.getDocument(...args);let promise;return new Proxy(task,{get(task,key){if(key!=='promise'){const value=task[key];return typeof value==='function'?value.bind(task):value;}return promise||=(task.promise.then(pdf=>new Proxy(pdf,{get(pdf,key){if(key!=='getPage'){const value=pdf[key];return typeof value==='function'?value.bind(pdf):value;}return async number=>{if(window.__captureExtra){window.__extraCalls.pages.push(number);if(window.__extraDelay)await new Promise(resolve=>setTimeout(resolve,window.__extraDelay));}return pdf.getPage(number);};}})));}});
  };}});}});
 });
 return context;
}
async function ready(page,count=1){await page.waitForFunction(count=>window.SmartMatchReadExtraV93&&window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===count&&document.getElementById('pwScanOverlay').hidden,count,{timeout:90000});}
const state=page=>page.evaluate(()=>({positions:structuredClone(SmartMatchAppBridge.getPositions()),mapping:structuredClone(SmartMatchAppBridge.getDoorCardMapping()),read:SmartMatchReadTest.payload()}));
async function oldWork(page){return page.evaluate(id=>{const p=SmartMatchAppBridge.getPositions().find(p=>p.id===id);return {id:p?.id,checks:structuredClone(p?.checks||{}),readChecks:structuredClone(SmartMatchReadTest.payload().checks[id]||{}),work:structuredClone(SmartMatchReadTest.cardFor('GS23',3)?.work||[])};},oldId);}
async function openExtra(page){
 if(await page.locator('#exDialog[open]').count())return;
 const button=page.locator('#exOpenExtra');if(await button.isVisible())await button.click();else{await page.locator('#pwToolMenuButton').click();await button.click();}
 await page.waitForSelector('#exDialog[open]');
}
async function selectOnCanvas(page,device){
 await page.locator('#exMarkSample').click();await page.waitForFunction(()=>!document.getElementById('exDialog').open);
 const canvas=page.locator('#pwCanvas'),bounds=await canvas.boundingBox();assert(bounds&&bounds.width>1&&bounds.height>1,'a real plan canvas is available');
 const a={x:bounds.x+sample.rect.x*bounds.width,y:bounds.y+sample.rect.y*bounds.height},b={x:a.x+sample.rect.w*bounds.width,y:a.y+sample.rect.h*bounds.height};
 assert(a.x>=0&&b.x<=device.width&&a.y>=0&&b.y<=device.height,'the sample is visible in the plan viewport');
 if(device.touch){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x,y:b.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();}
 await page.waitForSelector('#exDialog[open]');await page.waitForFunction(()=>document.getElementById('exCode').value==='DBL-1');
}
async function search(page){await page.locator('#exSearch').click();await page.waitForFunction(()=>!document.getElementById('exSearch').disabled,null,{timeout:90000});return page.evaluate(()=>SmartMatchReadExtraV93.state());}
async function exportProject(page){await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');const downloading=page.waitForEvent('download',{timeout:90000});await page.locator('#smartExportBuild').click();const download=await downloading;return fs.readFileSync(await download.path());}
async function setRect(page,kind,rect){for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel(kind+' '+label,{exact:true}).evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);}
async function projectData(bytes){const doc=await PDFDocument.load(bytes),raw=doc.catalog.get(PDFName.of('TillsynoSmartMatchV36Data'))||doc.catalog.get(PDFName.of('TillsynoSmartMatchV30Data'));assert(raw?.decodeText,'portable PDF embeds project data');return {doc,data:JSON.parse(raw.decodeText())};}
async function layout(page,device,label){
 const bounds=await page.locator('#exDialog').evaluate(node=>{const b=node.getBoundingClientRect(),checkboxes=[...node.querySelectorAll('input[type="checkbox"]')].map(check=>{const b=check.getBoundingClientRect();return {width:b.width,height:b.height};}),labels=[...node.querySelectorAll('.exCheck,.exHit label')].map(label=>getComputedStyle(label).flexDirection),buttons=[...node.querySelectorAll('button')].filter(button=>getComputedStyle(button).display!=='none').map(button=>button.getBoundingClientRect().height).filter(height=>height>0);return {x:b.x,right:b.right,width:b.width,scroll:node.scrollWidth,client:node.clientWidth,checkboxes,labels,buttons};});
 assert(bounds.x>=-1&&bounds.right<=device.width+1,'extra-links dialog fits '+device.name);assert(bounds.scroll<=bounds.client+1,'extra-links dialog has no horizontal overflow '+device.name);
 if(device.width>600)assert(bounds.width<=781,'extra-links dialog keeps its 780px desktop/tablet width');
 assert(bounds.checkboxes.length>=3&&bounds.checkboxes.every(box=>Math.abs(box.width-22)<1&&Math.abs(box.height-22)<1),'review and color checkboxes keep 22px dimensions');assert(bounds.labels.every(direction=>direction==='row'),'checkbox labels use horizontal rows');assert(bounds.buttons.every(height=>height>=44),'visible buttons keep 44px touch targets');
 await page.locator('#exApply').scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(artifacts,device.name+'-'+label+'.png'),fullPage:true});
}
async function exercise(browser,device,input,append){
 const context=await contextFor(browser,device),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(url());await page.locator('#pwFile').setInputFiles(upload(input));await ready(page);
  assert.equal(await page.locator('#rtDialog[open]').count(),0,'reviewed project opens directly');const before=await oldWork(page);assert(Object.values(before.checks).some(Boolean),'original work really is checked');
  await page.locator('#pwFit').click();await openExtra(page);await page.locator('#exCardPage').selectOption('4');assert.equal(await page.locator('#exCardCode').inputValue(),'DBL');assert.equal(await page.locator('#exCardCode').evaluate(node=>node.readOnly),true);await selectOnCanvas(page,device);assert.match(await page.locator('#exMappingPreview').innerText(),/DBL-1.*→ DBL/);
  assert(await page.locator('#exSameColor').isChecked(),'same-color filtering is explicit and enabled');assert.equal(await page.locator('#exMode').inputValue(),'text');
  await page.evaluate(()=>{window.__captureExtra=true;window.__extraCalls.pages=[];});await search(page);
  assert.equal(await page.locator('#exHits .exHit input[type="checkbox"]').count(),2,'two red DBL positions on drawing pages match; blue, DBL-DS, embedded card and generated suffix do not');
  const hits=await page.evaluate(()=>SmartMatchReadExtraV93.state());assert(hits,'review state is inspectable');await layout(page,device,'strict-color-review');
  if(device.name==='desktop'){
   await page.locator('#exSameColor').uncheck();await search(page);assert.equal(await page.locator('#exHits .exHit input[type="checkbox"]').count(),3,'turning off the explicit color rule also includes the blue exact DBL');
   await page.locator('#exSameColor').check();await search(page);assert.equal(await page.locator('#exHits .exHit input[type="checkbox"]').count(),2);
   await page.locator('#exHits .exHit input[type="checkbox"]').last().uncheck();assert(await page.locator('#exApply').isEnabled(),'individual reviewed hits can be excluded');await page.locator('#exHits .exHit input[type="checkbox"]').last().check();
   await page.locator('#exHits [data-ex-show]').last().click();await page.waitForFunction(()=>!document.getElementById('exDialog').open&&SmartMatchAppBridge.getPage()===2);await page.locator('#exReturnReview').click();await page.waitForSelector('#exDialog[open]');
  }
  await page.locator('#exApply').click();await ready(page,3);assert.deepEqual(await oldWork(page),before,'appending physical positions retains original checks and source work');
  let after=await state(page);const additions=after.positions.filter(p=>p.code==='DBL1');assert.equal(additions.length,2);assert.deepEqual(additions.map(p=>p.page).sort(),[1,2]);assert.equal(after.mapping.DBL1,4);
  assert.equal(after.read.cards.extra.code,'DBL','original source card keeps its name');assert.deepEqual(await page.evaluate(()=>SmartMatchReadTest.getCardNames(4)),['DBL']);for(const position of additions){assert.equal(position.originalCardCode,'DBL');assert.equal(position.drawingLabel,'DBL-1');assert.equal(position.cardPage,4);}for(const position of additions)assert.equal(await page.evaluate(id=>SmartMatchAppBridge.readWorkState(SmartMatchAppBridge.getPositions().find(p=>p.id===id)),position.id).then(state=>state.pending),true,'unread added card products remain pending');
  const calls=await page.evaluate(()=>structuredClone(window.__extraCalls));assert.equal(calls.workers,0);assert.equal(calls.recognize,0);assert.equal(calls.scans,device.name==='desktop'?3:1,'only explicitly requested extra-position searches run');assert(!calls.pages.includes(5),'generated suffix is never read during native search');
  // Repeating the same reviewed operation must not duplicate physical links.
  await openExtra(page);await page.evaluate(sample=>SmartMatchReadExtraV93.setSample(sample),sample);await page.locator('#exCardPage').selectOption('4');await search(page);assert.equal(await page.locator('#exHits .exHit input[type="checkbox"]').count(),0,'previously linked physical positions are excluded from a repeated review');assert(await page.locator('#exApply').isDisabled(),'a duplicate search cannot apply an empty batch');await ready(page,3);assert.deepEqual(await oldWork(page),before);
  // Test the mutation boundary as well as the UI: malformed hit batches and
  // conflicting mappings fail before any positions or card state can change.
  const stable=await state(page);const invalid=await page.evaluate(async()=>{
   const run=async options=>{try{await SmartMatchAppBridge.addManualReadPositions(options);return false;}catch(_){return true;}};
   return Promise.all([
    run({code:'DBL1',cardPage:3,hits:[{page:1,rect:[290,440,370,480]}]}),
    run({code:'DBL1',cardPage:4,hits:[{page:1,rect:[290,440,370,480]},{page:999,rect:[1,1,50,50]}]}),
    run({code:'DBL1',cardPage:4,hits:[{page:1,rect:[-10,1,50,50]}]}),
    run({code:'DBL1',cardPage:4,hits:[{page:1,rect:[1,1,NaN,50]}]})
   ]);
  });assert(invalid.every(Boolean),'invalid or conflicting batches are rejected');assert.deepEqual(await state(page),stable,'failed mutations are atomic');
  // A cancelled slow search never modifies the already reviewed project.
  await openExtra(page);await page.evaluate(sample=>SmartMatchReadExtraV93.setSample(sample),sample);await page.evaluate(()=>{window.__extraDelay=800;});await page.locator('#exSearch').click();await page.waitForSelector('#exCancelScan:not([hidden])');await page.locator('#exCancelScan').click();await page.waitForFunction(()=>!document.getElementById('exSearch').disabled);await page.evaluate(()=>{window.__extraDelay=0;});assert.deepEqual(await state(page),stable,'cancelled search preserves all existing links and checks');
  await page.evaluate(()=>SmartMatchReadExtraV93.close());
  if(device.name==='desktop'){
   await openExtra(page);await page.getByText('Saknas dörrkortet i filen?',{exact:true}).click();await page.locator('#exAppendFile').setInputFiles(upload(append,'forgotten-card.pdf'));await page.waitForFunction(()=>!document.getElementById('exAppendCards').disabled);await page.locator('#exAppendCards').click();await page.waitForFunction(()=>SmartMatchAppBridge.getDoorCardPages().some(p=>p>=5),null,{timeout:90000});await page.waitForFunction(()=>!document.getElementById('exAppendCards').disabled);
   const appended=await page.evaluate(()=>Math.max(...SmartMatchAppBridge.getDoorCardPages()));assert.equal(appended,5,'new card follows original source pages, not an old generated suffix');
   await page.evaluate(()=>SmartMatchReadExtraV93.setSample({page:2,rect:{x:690/1200,y:370/700,w:140/1200,h:55/700}}));await page.waitForFunction(()=>document.getElementById('exCode').value.replace(/\s/g,'')==='WC77');await page.locator('#exCardPage').selectOption(String(appended));assert.equal(await page.locator('#exCardCode').evaluate(node=>node.readOnly),false);await page.locator('#exCardCode').fill('NYTT KORT');await search(page);assert.equal(await page.locator('#exHits .exHit input[type="checkbox"]').count(),1);await page.locator('#exApply').click();await ready(page,4);
   after=await state(page);assert.equal(after.mapping.WC77,5);assert.equal(after.positions.find(p=>p.code==='WC77').page,2);assert.equal(after.positions.find(p=>p.code==='WC77').originalCardCode,'NYTT KORT');assert.deepEqual(await oldWork(page),before,'appending a PDF retains original source indices and checks');
   assert.equal(await page.evaluate(()=>SmartMatchReadTest.cardFor('WC77',5).workState),'pending','manual alias can reference an arbitrary appended card header');
   await page.evaluate(()=>SmartMatchReadExtraV93.close());const linked=await state(page),scanCount=await page.evaluate(()=>window.__extraCalls.scans);
   await page.locator('#pwReadContinueProducts').click();await page.waitForSelector('#rtDialog[open]');await setRect(page,'Tabell',tableRect);await page.locator('#rtImageMode').selectOption('text');await page.locator('#rtPreview').click();await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:90000});
   const readRows=await page.locator('#rtResults textarea').evaluateAll(nodes=>nodes.map(node=>node.value));assert.equal(readRows.length,2,'continuation reads only two pending cards, preserving ready GS23');assert(readRows.some(text=>text.includes('SL660')&&text.includes('6696')&&!text.includes('STD')),'new DBL card yields only GS installation products');assert(readRows.some(text=>text.includes('DC700')),'appended card reads GS installation products despite an unrelated header');
   await page.locator('#rtStart').click();await ready(page,4);assert.deepEqual(await oldWork(page),before,'reading new products retains old checks, labels and work exactly');const productState=await state(page);assert.deepEqual(productState.mapping,linked.mapping);assert.deepEqual(productState.positions.map(p=>[p.id,p.page,p.code,p.rect]),linked.positions.map(p=>[p.id,p.page,p.code,p.rect]),'reading new products preserves every old and manually added physical link');assert.equal(await page.evaluate(()=>window.__extraCalls.scans),scanCount,'pending product continuation runs no drawing search');assert(Object.values(productState.read.cards).every(card=>card.workState==='ready'));
   await page.screenshot({path:path.join(artifacts,device.name+'-continued-products.png'),fullPage:true});
  }
  await page.evaluate(()=>SmartMatchReadExtraV93.close());const expected=await state(page),exported=await exportProject(page),saved=await projectData(exported);assert.equal(saved.doc.getTitle(),'Original plan metadata must survive');assert.equal(saved.data.readTestData.matching.hits.filter(p=>p.selected!==false).length+(saved.data.manualPositions||[]).length,expected.positions.length);assert(Object.values(saved.data.readTestData.checks[oldId]||{}).some(Boolean));
  const fresh=await contextFor(browser,device),reopened=await fresh.newPage();try{
   await reopened.goto(url());await reopened.evaluate(()=>{window.__captureExtra=true;});await reopened.locator('#pwFile').setInputFiles(upload(exported,'portable-added-links.pdf'));await ready(reopened,expected.positions.length);assert.deepEqual(await oldWork(reopened),before,'portable save/reopen retains the original checked work');
   assert.deepEqual((await state(reopened)).positions.map(p=>[p.id,p.page,p.code,p.rect]),expected.positions.map(p=>[p.id,p.page,p.code,p.rect]),'old and added positions keep identity, page and rectangle after reopening');assert.deepEqual((await state(reopened)).mapping,expected.mapping);const reopenedState=await state(reopened);assert.equal(reopenedState.read.cards.extra.code,'DBL');for(const added of reopenedState.positions.filter(p=>p.code==='DBL1')){assert.equal(added.drawingLabel,'DBL-1');assert.equal(added.originalCardCode,'DBL');assert.equal(added.cardPage,4);}assert.deepEqual(await reopened.evaluate(()=>SmartMatchReadTest.getCardNames(4)),['DBL']);assert.equal(await reopened.evaluate(()=>window.__extraCalls.scans),0,'portable reopen requires no rematching');
   const aliasPosition=reopenedState.positions.find(position=>position.code==='DBL1');await reopened.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),aliasPosition.id);await reopened.waitForSelector('#pwProtocol[open]');
   assert.equal(await reopened.locator('#pwProtocolCode').innerText(),'DBL-1');assert.match(await reopened.locator('#pwProtocolCode').getAttribute('title'),/DBL-1 → dörrkort: DBL/);assert.match(await reopened.locator('#pwProtocolPosition').innerText(),/dörrkort DBL/);await reopened.screenshot({path:path.join(artifacts,device.name+'-reopened-alias.png'),fullPage:true});await reopened.locator('#pwProtocolClose').click();
  }finally{await fresh.close();}
  assert.deepEqual(errors,[]);console.log('PASS '+device.name+': real '+(device.touch?'touch':'mouse')+' sample, strict text/color, selected card, additive links, cancellation, invalid-batch atomicity and portable checked-work persistence'+(device.name==='desktop'?', forgotten PDF append, arbitrary alias and pending-only products without rematching':''));
 }catch(error){console.error('Extra links QA state:',await page.evaluate(()=>({status:document.getElementById('pwState')?.textContent,dialog:document.getElementById('exDialog')?.innerText,calls:window.__extraCalls,review:window.SmartMatchReadExtraV93?.state(),dialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id)})).catch(()=>null));throw error;}
 finally{await context.close();}
}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});const input=await fixture(),append=await forgottenCard();for(const device of devices)await exercise(browser,device,input,append);console.log('QA screenshots: '+artifacts);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
