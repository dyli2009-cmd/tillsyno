/* Generated narrow-selection and saved-error retry regression for Avläsning 9.99.
 * Reuse the complete 9.98 UI fixture; change only the selected right edge,
 * then add saved v4 failure/cancellation/success cases around its real export.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.resolve(__dirname,'smartmatch-read-matrix-browser-v9-98.cjs');
let source=fs.readFileSync(file,'utf8');
function replace(before,after){if(!source.includes(before))throw Error('Missing inherited browser-test anchor: '+before);source=source.replace(before,after);}
replace("'smartmatch-read-v9-98.html'","'smartmatch-read-v9-99.html'");
replace('tableRect={x:.045,y:.16,w:.91,h:.61}','tableRect={x:.045,y:.16,w:.65,h:.61}');
replace("const read=await payload(page);assertProducts(read);", "const read=await payload(page);assertProducts(read);assert(Object.values(read.cards).every(c=>!c.tableWords.some(w=>/^(Ansl av|Funk ansvar|Anm)$/.test(w.text))),'selected products contain only Lev av and Mont av responsibility headings');");
replace("const portable=await exportProject(page);trace('exported');const pdf=", "const portable=await exportProject(page);trace('exported');await retryPending(browser,d,portable,chosen);trace('saved-error retries');const pdf=");
replace("'work/matrix98-'","'work/matrix99-'");
replace('blank-header matrix products → sections/GS ownership', 'narrow two-owner-column products → saved-error retry → sections/GS ownership');

async function retryPending(browser,d,portable,chosen){
 const original=await PDFDocument.load(portable),originalPayload=JSON.parse(original.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());
 const sourceCard=Object.values(originalPayload.readTestData.cards).find(c=>c.code==='240NZ'&&!c.sourceCardId),targetId=sourceCard.id;
 async function pendingFile(invalidArea){
  const pdf=await PDFDocument.load(portable),saved=structuredClone(originalPayload),data=saved.readTestData;
  const owner=data.cards[targetId],manual='Sparad manuell uppgift';
  owner.work.push(manual);owner.workItems.push({text:manual,label:manual,value:'',section:'Manuellt',sectionKey:'manual',key:'retained:legacy'});
  const alias={...structuredClone(owner),id:'matrix-saved-alias',code:'ALT240NZ',sourceCardId:owner.id,originalCardCode:owner.originalCardCode||owner.code,drawingLabel:'ALT 240NZ',manualLink:true};data.cards[alias.id]=alias;
  data.schema=2;
  const pending={...structuredClone(owner),workReadError:true,workPolicy:'gs-install-v4',workState:'ready',deferred:true,deferredReasons:['Produktläsningen behöver rättas'],proposedWork:[],proposedWorkItems:[],workWarnings:['Tabell 1: produktkolumnen Övrigt / Produkt saknas eller kunde inte läsas. Kontrollera markeringen; inga produkter har gissats.','Produktläsningen behöver rättas. Tidigare produkter och avprickningar bevaras.']};
  if(invalidArea)pending.tableRect={...tableRect,y:.24,h:.53};
  data.pendingWorkCards={[targetId]:pending};
  for(const name of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])pdf.catalog.set(PDFName.of(name),PDFHexString.fromText(JSON.stringify(saved)));
  return {bytes:Buffer.from(await pdf.save()),data};
 }
 for(const invalidArea of [true,false]){
  const input=await pendingFile(invalidArea),ctx=await contextFor(browser,d),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  try{
   await page.goto(url());await page.evaluate(()=>window.__forbidScan=true);await page.locator('#pwFile').setInputFiles(upload(input.bytes,'saved-failed-matrix.pdf'));await ready(page);
   const initial=await payload(page);assert(initial.pendingWorkCards[targetId].workReadError,'saved error is retained until explicit reading');
   const matching=structuredClone(initial.matching),checks=structuredClone(initial.checks),other=structuredClone(Object.values(initial.cards).find(c=>c.code==='241NZ'));
   const oldSource=structuredClone(initial.cards[targetId]),oldAlias=structuredClone(initial.cards['matrix-saved-alias']);
   await page.locator('#pwDeferredCards').click();await page.waitForSelector('#rtDialog[open]');
   const panel=page.locator('#rtResults .rtCompactResult[data-card-id="'+targetId+'"]');await panel.locator('.rtCardFold').evaluate(el=>el.open=true);
   const retry=panel.locator('.rtRetryWorkCard');assert.equal(await retry.count(),1,'failed source has one explicit retry');assert(await retry.isEnabled(),'retry is enabled without changing the area');
   const inventoryBefore=await panel.locator('.rtProductInventory table tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)));assert(inventoryBefore.length>1,'saved failed card has a populated product inventory');
   const oldCalls=await page.evaluate(()=>__calls.work);await retry.click();await idle(page);await page.waitForFunction(()=>!document.getElementById('rtLocalRead').disabled||!document.querySelector('.rtRetryWorkCard:disabled'));
   assert((await page.evaluate(()=>__calls.work))>oldCalls,'retry really invokes product parsing');
   if(invalidArea){
    const failedPanel=page.locator('#rtResults .rtCompactResult[data-card-id="'+targetId+'"]');assert(await failedPanel.locator('.rtRetryWorkCard').isVisible(),'unreadable selection keeps error and retry action');assert(await page.locator('#rtStart').isDisabled(),'unresolved retry cannot be saved as ready');
    assert((await failedPanel.innerText()).includes('Produktläsningen behöver rättas'));
    assert.deepEqual(await failedPanel.locator('.rtProductInventory table tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent))),inventoryBefore,'failed retry keeps every previously saved product and responsibility field visible before cancellation');
    await page.locator('#rtCancel').click();await page.waitForSelector('#rtDialog[open]',{state:'detached'}).catch(()=>page.waitForFunction(()=>!document.getElementById('rtDialog')?.open));
    assert.deepEqual(await payload(page),initial,'failed retry then cancel leaves active work and saved pending data unchanged');
   }else{
    assert.equal(await page.locator('#rtResults .rtRetryWorkCard').count(),0,'successful parse removes retry/error state');assert(await page.locator('#rtStart').isEnabled(),'successful retry permits product saving');
    const text=await page.locator('#rtResults').innerText();assert(!text.includes('produktkolumnen Övrigt / Produkt saknas'),'obsolete missing-header warning is cleared by a real successful read');assert(text.includes('Best/GS')||text.includes('otydligt'),'ambiguous responsibility warning remains');
    await page.locator('#rtStart').click();await ready(page);const repaired=await payload(page),owner=repaired.cards[targetId],alias=repaired.cards['matrix-saved-alias'];
    assert.equal(owner.workReadError,false);assert(!repaired.pendingWorkCards[targetId],'successful card leaves pending list');
    assert.deepEqual(owner.work,oldSource.work,'retry keeps all seven old rows plus the existing manual row');assert.deepEqual(owner.workItems.map(item=>item?.key),oldSource.workItems.map(item=>item?.key),'existing control keys remain stable');
    assert.deepEqual(repaired.cards[other.id],other,'unrelated source card is unchanged');assert.deepEqual(repaired.matching,matching);assert.deepEqual(repaired.checks,checks);
    assert.equal(alias.id,oldAlias.id);assert.equal(alias.code,oldAlias.code);assert.equal(alias.sourceCardId,targetId);assert.equal(alias.drawingLabel,oldAlias.drawingLabel);assert.deepEqual(alias.work,owner.work);assert.deepEqual(alias.workItems,owner.workItems);assert.equal(alias.workReadError,false);
    const workState=await page.evaluate(id=>SmartMatchAppBridge.readWorkState(SmartMatchAppBridge.getPositions().find(p=>p.id===id)),chosen);assert.equal(workState.done,1);assert.equal(workState.total,8);
   }
   assert.equal(await page.evaluate(()=>__calls.scan),0,'retry preserves existing drawing positions without matching again');assert.equal(await page.evaluate(()=>__calls.ocr),0);assert.deepEqual(errors,[]);
  }finally{await ctx.close();}
 }
 // A table-only retry cannot consume a separately edited code area in the
 // older correction view: the user must explicitly read that code change.
 if(d.name==='desktop'){
  const input=await pendingFile(false),pdf=await PDFDocument.load(input.bytes),saved=JSON.parse(pdf.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText()),data=saved.readTestData;
  data.cards[targetId]={...structuredClone(data.pendingWorkCards[targetId]),deferred:false,deferredReasons:[]};data.pendingWorkCards={};data.schema=1;
  for(const name of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])pdf.catalog.set(PDFName.of(name),PDFHexString.fromText(JSON.stringify(saved)));
  const ctx=await contextFor(browser,d),page=await ctx.newPage();page.setDefaultTimeout(15000);
  try{
   await page.goto(url());await page.evaluate(()=>window.__forbidScan=true);await page.locator('#pwFile').setInputFiles(upload(Buffer.from(await pdf.save()),'failed-code-area.pdf'));await ready(page);const initial=await payload(page);
   await page.locator('#pwToolMenuButton').click();await page.locator('#rtEditPreparation').click();await page.waitForSelector('#rtDialog[open]');
   const panel=page.locator('#rtResults .rtCompactResult[data-card-id="'+targetId+'"]');await panel.locator('.rtCardFold').evaluate(el=>el.open=true);await panel.locator('[data-adjust-card="'+targetId+'"]').click();
   await page.getByLabel('Kod Vänster',{exact:true}).evaluate(node=>{node.value=String(Number(node.value)+.5);node.dispatchEvent(new Event('change',{bubbles:true}));});
   assert(await page.locator('#rtLocalRead').isEnabled(),'edited code area remains explicitly pending');const before=await page.evaluate(()=>__calls.work);await panel.locator('.rtRetryWorkCard').click();
   assert((await page.locator('#rtStatus').innerText()).includes('Kodområdet har ändrats'));assert.equal(await page.evaluate(()=>__calls.work),before,'table retry does not parse when the code selection was edited');assert(await page.locator('#rtLocalRead').isEnabled(),'table retry does not consume the pending code selection');assert(await page.locator('#rtStart').isDisabled());
   await page.locator('#rtCancel').click();await page.waitForFunction(()=>!document.getElementById('rtDialog')?.open);assert.deepEqual(await payload(page),initial,'cancel preserves active data after a rejected code-area retry');assert.equal(await page.evaluate(()=>__calls.scan),0);
  }finally{await ctx.close();}
 }
}
replace('(async()=>{await new Promise',retryPending.toString()+'\n(async()=>{await new Promise');
const task=new Module(file,module);task.filename=file;task.paths=module.paths;task._compile(source,file);
