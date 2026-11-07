/* Avläsning TEST 9.2: real native-PDF reading, GS installation groups,
 * deferred products, portable projects and migration of existing work checks.
 * Generated fixtures only; no customer PDFs or application/auth mutations.
 * SMARTMATCH_DEVICE=desktop|ipad|iphone selects one responsive viewport. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),artifacts=fs.mkdtempSync(path.join(os.tmpdir(),'smartmatch-work-groups-v9-2-'));
const devices=[{name:'desktop',width:1366,height:900},{name:'ipad',width:820,height:1180,touch:true},{name:'iphone',width:390,height:844,touch:true}].filter(device=>!process.env.SMARTMATCH_DEVICE||device.name===process.env.SMARTMATCH_DEVICE);
const codeRect={x:.08,y:.08,w:.78,h:.06},tableRect={x:.04,y:.16,w:.93,h:.64};
const expectedGroups=[['Daglåsning',['6696','std','SL660']],['Nattlåsning',['256','6696']],['Övrig utrustning',['Utsida']],['Larm/Passer',['DC700','MK 240 lång kabel']]];
const values=expectedGroups.flatMap(([,products])=>products),metadataKeys=['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'].map(PDFName.of);
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-2.html`;
const upload=(bytes,name='generated-groups.pdf')=>({name,mimeType:'application/pdf',buffer:bytes});
function oldRowKey(text,index){let hash=2166136261;for(const character of text)hash=Math.imul(hash^character.charCodeAt(0),16777619);return 'read:'+index+':'+(hash>>>0).toString(36);}
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold),plan=document.addPage([1200,600]),annotations=[];
 for(const [index,[label,x,y]]of [['GS 23',150,400],['GS23',700,220],['GS24',450,350]].entries()){
  plan.drawText(label,{x,y,size:24,font});annotations.push(document.context.register(document.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText(label),Rect:[x-2,y-3,x+170,y+32],F:4,NM:PDFHexString.fromText('groups-'+index)})));
 }
 plan.drawText('GS230',{x:100,y:90,size:24,font});plan.node.set(PDFName.of('Annots'),document.context.obj(annotations));
 for(const [cardIndex,code]of ['GS23','GS24'].entries()){
  const card=document.addPage([595,842]);card.drawText('Beslagskod: '+code,{x:60,y:750,size:20,font});
  const text=(value,x,y,size=11,isBold=false)=>card.drawText(value,{x,y,size,font:isBold?bold:font});
  function band(title,y,rows,index){
   // Independent column geometry for each repeated header, including one
   // installation column before its delivery column on the second card.
   const shift=cardIndex?(index%2?18:8):0,swap=cardIndex&&index===2;
   const columns={label:40+shift,product:185+shift,delivery:swap?492:355+shift,installation:swap?390:470+shift};
   for(const [label,column]of [['Komponent','label'],['Övrigt','product'],['Lev av','delivery'],['Mont av','installation']])text(label,columns[column],y,10,true);
   text(title,columns.label,y-22,11,true);
   for(const [rowIndex,row]of rows.entries()){
    const rowY=y-44-rowIndex*24;
    for(const [value,column]of [[row[0],'label'],[row[1],'product'],[row[2],'delivery'],[row[3],'installation']])if(value)text(value,columns[column],rowY);
    if(row[4])text(row[4],columns.product,rowY-12);
   }
  }
  band('DAGLÅSNING',690,[['Trycke','6696','DT','GS'],['Slutbleck','std','GS','GS'],['Låshus','SL660','DT','GS'],['El-lås','EL999','GS','DT']],0);
  band('NATTLÅSNING',540,[['Cylinder','256','GS','GS'],['Trycke','6696','DT','GS'],['Ej beställt','EMPTY999','GS','']],1);
  band('Övrig utrustning',415,[['Cylinder in/utsida','Utsida','GS','GS'],['Extra lås','NO999','GS','DT']],2);
  band('Larm / Passer',310,[['Dörrstängare','DC700','DT','GS'],['Larmkontakt','MK 240','GS','GS','lång kabel'],['Läsare','DT999','GS','DT']],3);
 }
 return Buffer.from(await document.save());
}
async function contextFor(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__calls={workers:0,recognize:0,scans:0,work:0,guides:0};
  window.Tesseract={async createWorker(){window.__calls.workers++;throw Error('Native text fixture must not start OCR');}};
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:value=>{matcher={...value,scan:options=>{window.__calls.scans++;if(window.__forbidScan)throw Error('Saved links must not be scanned again');return value.scan(options);}};}});
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:value=>{work={...value,read:options=>{window.__calls.work++;return value.read(options);}};}});
  const show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')window.__calls.guides++;return show.call(this);};
 });
 return context;
}
async function press(locator,device){if(device.touch)await locator.tap();else await locator.click();}
async function setRect(page,kind,rect){for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel(kind+' '+label,{exact:true}).evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);}
async function idle(page){await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:90000});}
async function ready(page){await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===3&&document.getElementById('pwScanOverlay').hidden,null,{timeout:90000});}
const payload=page=>page.evaluate(()=>SmartMatchReadTest.payload());
const positions=page=>page.evaluate(()=>structuredClone(SmartMatchAppBridge.getPositions()));
async function open(page,bytes,name){await page.goto(url());await page.locator('#pwFile').setInputFiles(upload(bytes,name));}
async function exportProject(page,device){
 await press(page.locator('#smartPdfInspect'),device);await page.waitForSelector('#smartExportDialog[open]');const downloading=page.waitForEvent('download',{timeout:90000});await press(page.locator('#smartExportBuild'),device);const download=await downloading,bytes=fs.readFileSync(await download.path());await press(page.locator('#smartExportClose'),device);return bytes;
}
async function projectData(bytes){const document=await PDFDocument.load(bytes),raw=metadataKeys.map(key=>document.catalog.get(key)).find(Boolean);assert(raw?.decodeText,'project state is embedded');return JSON.parse(raw.decodeText());}
async function openPosition(page,id){await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);await page.waitForSelector('#pwProtocol[open]');await page.waitForFunction(()=>!!document.getElementById('pwProtocolCanvas')?.dataset.readCardId);}
async function workState(page,id){return await page.evaluate(id=>SmartMatchAppBridge.readWorkState(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),id);}
async function assertGroups(page,device,suffix){
 const groups=await page.locator('#pwChecklist .rtWorkSection').evaluateAll(nodes=>nodes.map(node=>({heading:node.querySelector('h3.rtWorkSectionTitle')?.textContent,values:[...node.querySelectorAll('label.rtWorkRow span.rtWorkValue')].map(span=>span.textContent)})));
 assert.deepEqual(groups,expectedGroups.map(([heading,values])=>({heading,values})),'four real heading containers retain only their GS product values');
 const visible=await page.locator('#pwChecklist .rtWorkRow span.rtWorkValue').allTextContents();assert.deepEqual(visible,values);assert(!visible.some(text=>/Trycke|Cylinder|GS|DT|EL999|EMPTY999|NO999|DT999/.test(text)),'responsibility/component labels and non-GS products do not clutter visible checks');
 assert.equal(await page.locator('#pwChecklist .rtWorkRow input').count(),8);
 assert.match(await page.locator('#pwChecklist .rtWorkRow input').first().getAttribute('aria-label'),/Trycke.*6696/,'component metadata remains in accessible names');
 if(device.name==='iphone'&&await page.locator('#pwProtocolShowGS').isVisible())await press(page.locator('#pwProtocolShowGS'),device);
 await page.locator('#pwChecklist .rtWorkSection').first().scrollIntoViewIfNeeded();
 const layout=await page.locator('.pwChecklistPane').evaluate(node=>({scroll:node.scrollWidth,client:node.clientWidth}));assert(layout.scroll<=layout.client+2,'grouped checklist has no horizontal overflow on '+device.name);
 await page.screenshot({path:path.join(artifacts,device.name+'-'+suffix+'.png'),fullPage:true});
}
async function readProducts(page,device){
 const action=page.locator('#pwReadContinueProducts');assert(await action.isVisible(),'product reading remains available after the first read');
 const pending=await page.evaluate(()=>SmartMatchReadTest.hasPendingProducts());assert.equal((await action.textContent()).trim(),pending?'Fortsätt med produkter':'Läs produkterna igen');
 await press(action,device);
 await page.waitForSelector('#rtDialog[open]');await setRect(page,'Tabell',tableRect);await press(page.locator('#rtPreview'),device);await idle(page);
 for(let number=1;number<=2;number++)assert.deepEqual((await page.getByLabel('Arbetsrader kort '+number,{exact:true}).inputValue()).split('\n'),values,'complete product-only read for independently shifted native table columns');
 await press(page.locator('#rtStart'),device);await ready(page);
}
async function legacyPdf(bytes,positionId){
 const document=await PDFDocument.load(bytes),data=await projectData(bytes),read=data.readTestData;
 read.checks={};
 for(const card of Object.values(read.cards)){
  card.workPolicy='gs-install-v1';card.workItems=card.workItems.map(item=>({text:item.legacyText||[item.label,item.value].filter(Boolean).join(' · '),label:item.label,value:item.value,sourceRow:item.sourceRow,responsibility:'GS'}));card.work=card.workItems.map(item=>item.text);
 }
 const card=Object.values(read.cards).find(card=>card.code==='GS23'),key=oldRowKey(card.work[0],0);read.checks[positionId]={[key]:true};
 for(const [id,instance]of Object.entries(data.instances||{}))instance.checks=id===positionId?{[key]:true}:{};
 for(const key of metadataKeys)if(document.catalog.has(key))document.catalog.set(key,PDFHexString.fromText(JSON.stringify(data)));
 return Buffer.from(await document.save());
}
async function exercise(browser,device,input){
 const context=await contextFor(browser,device),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 let portable,chosenId;
 try{
  await open(page,input,'groups-source.pdf');await page.waitForSelector('#rtDialog[open]');assert.equal(await page.locator('#rtReadPhase').inputValue(),'codes');await setRect(page,'Kod',codeRect);await press(page.locator('#rtDiscover'),device);await idle(page);assert.equal(await page.locator('#rtDiscoveryResults .rtPageChoice input:checked').count(),2);
  await press(page.locator('#rtPreview'),device);await idle(page);assert.equal(await page.locator('.rtMatchRow').count(),3);assert.equal(await page.evaluate(()=>window.__calls.work),0,'code-only phase postpones all products');assert.equal(await page.evaluate(()=>window.__calls.workers),0);await page.locator('#rtMatchApproval').check();await press(page.locator('#rtStart'),device);await ready(page);
  const pending=await payload(page),links=pending.matching,ids=(await positions(page)).map(position=>position.id);chosenId=ids[0];assert(Object.values(pending.cards).every(card=>card.workState==='pending'));const pendingPdf=await exportProject(page,device);
  const nextContext=await contextFor(browser,device),next=await nextContext.newPage(),nextErrors=[];next.on('pageerror',error=>nextErrors.push(error.message));
  try{
   await next.goto(url());await next.evaluate(()=>{window.__forbidScan=true;});await next.locator('#pwFile').setInputFiles(upload(pendingPdf,'pending-groups.pdf'));await ready(next);assert.equal(await next.evaluate(()=>window.__calls.guides),0,'pending portable project opens without guide');assert.deepEqual((await payload(next)).matching,links);await readProducts(next,device);
   const read=await payload(next);assert.deepEqual(read.matching,links,'deferred products preserve exact reviewed links');assert.deepEqual((await positions(next)).map(position=>position.id),ids);assert.equal(await next.evaluate(()=>window.__calls.scans),0,'deferred reading does not rescan drawing');assert.equal(await next.evaluate(()=>window.__calls.workers),0,'searchable native tables never start OCR');
   for(const card of Object.values(read.cards)){assert.deepEqual(card.work,values);assert.equal(card.workItems.length,8);assert.equal(new Set(card.workItems.map(item=>item.key)).size,8,'same product in different sections has independent keys');}
   await openPosition(next,chosenId);await assertGroups(next,device,'groups');
   const check=next.locator('#pwChecklist .rtWorkSection[data-section-key="daglasning"] .rtWorkRow input').first();await check.scrollIntoViewIfNeeded();await press(check,device);await next.waitForFunction(()=>document.getElementById('pwChecklistMeta').textContent==='1 av 8 klara');
   assert.equal(await next.locator('#pwChecklist .rtWorkSection[data-section-key="nattlasning"] .rtWorkRow input').nth(1).isChecked(),false,'checking day handle never checks identical night handle');
   const state=await workState(next,chosenId);assert.equal(state.done,1);assert.equal(state.total,8);assert.equal(state.doneMinutes,10,'hidden Trycke label still classifies ten-minute work');assert.equal(state.estimatedMinutes,120,'component metadata retains all known work-time classifications');assert.equal(state.unknownTimeCount,1,'unclassified Larmkontakt remains an unknown estimate');assert(state.percent>0&&state.percent<100);
   for(const otherId of ids.filter(id=>id!==chosenId))assert.equal((await workState(next,otherId)).done,0,'another physical door never inherits the checked source-card product');
   await press(next.locator('#pwProtocolClose'),device);await readProducts(next,device);assert.deepEqual(await workState(next,chosenId),state,'rereading unchanged products retains checks, time and progress');assert.deepEqual((await payload(next)).matching,links);await openPosition(next,chosenId);await assertGroups(next,device,'reread');assert.equal(await next.locator('#pwChecklist .rtWorkRow input:checked').count(),1);await press(next.locator('#pwProtocolClose'),device);
   portable=await exportProject(next,device);const data=await projectData(portable);assert.deepEqual(data.readTestData.matching,links);assert.equal(Object.values(data.readTestData.checks||{}).flatMap(Object.values).filter(Boolean).length,1);assert.deepEqual(nextErrors,[]);
   const reopenContext=await contextFor(browser,device),reopened=await reopenContext.newPage();try{
    await reopened.goto(url());await reopened.evaluate(()=>{window.__forbidScan=true;});await reopened.locator('#pwFile').setInputFiles(upload(portable,'completed-groups.pdf'));await ready(reopened);assert.equal(await reopened.evaluate(()=>window.__calls.guides),0);assert.deepEqual(await workState(reopened,chosenId),state,'portable reopening preserves check/progress/time');await openPosition(reopened,chosenId);await assertGroups(reopened,device,'reopened');assert.equal(await reopened.locator('#pwChecklist .rtWorkRow input:checked').count(),1);assert.equal(await reopened.evaluate(()=>window.__calls.scans),0);
   }finally{await reopenContext.close();}
  }finally{await nextContext.close();}
  assert.deepEqual(errors,[]);console.log('PASS '+device.name+': code-only pending project, eight GS product values in four groups, shifted columns, wrapped cell, separate duplicate-product checks, reread/portable check/progress/time preservation');
 }catch(error){console.error('Groups QA state:',await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,state:document.getElementById('pwState')?.textContent,dialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id),calls:window.__calls})).catch(()=>null));throw error;}
 finally{await context.close();}
 return {portable,chosenId};
}
async function migration(browser,device,portable,chosenId){
 const context=await contextFor(browser,device),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(url());await page.evaluate(()=>{window.__forbidScan=true;});await page.locator('#pwFile').setInputFiles(upload(await legacyPdf(portable,chosenId),'legacy-9-1-checked.pdf'));await ready(page);assert.equal(await page.evaluate(()=>window.__calls.guides),0,'legacy reviewed project opens directly');
  await openPosition(page,chosenId);await assertGroups(page,device,'legacy-migration');assert.equal(await page.locator('#pwChecklist .rtWorkRow input:checked').count(),1,'one legacy check never spreads to equal products in other sections');assert.equal(await page.locator('#pwChecklist .rtWorkSection[data-section-key="daglasning"] .rtWorkRow input').first().isChecked(),true);assert.equal(await page.locator('#pwChecklist .rtWorkSection[data-section-key="nattlasning"] .rtWorkRow input').nth(1).isChecked(),false);
  const state=await workState(page,chosenId);assert.equal(state.done,1);assert.equal(state.doneMinutes,10);assert.equal(state.total,8);await press(page.locator('#pwProtocolClose'),device);await readProducts(page,device);assert.deepEqual(await workState(page,chosenId),state,'legacy row keys remain stable on explicit product reread');assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>window.__calls.scans),0);console.log('PASS old TEST 9.1 row-key migration: labels replaced by values, groups reconstructed, one existing check and its time preserved through reread');
 }finally{await context.close();}
}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const input=await fixture();let result;for(const device of devices)result=await exercise(browser,device,input);if(result)await migration(browser,devices[0],result.portable,result.chosenId);console.log('QA screenshots: '+artifacts);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
