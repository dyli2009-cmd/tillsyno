const testVersion=process.env.TEST_VERSION||'14';
const {chromium}=require('playwright');
const {PDFDocument,StandardFonts,PDFName,PDFString}=require('pdf-lib');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
(async()=>{
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 const drawing=doc.addPage([500,400]);drawing.drawText('GS 1',{x:100,y:250,size:12,font});drawing.drawText('GS 230v',{x:100,y:200,size:12,font});
 const annotation=doc.context.obj({Type:'Annot',Subtype:'FreeText',Rect:[200,250,235,265],Contents:PDFString.of('GS2')});drawing.node.set(PDFName.of('Annots'),doc.context.obj([doc.context.register(annotation)]));
 const card=doc.addPage([500,400]);card.drawText('GS1',{x:40,y:350,size:18,font});card.drawText('Door card',{x:40,y:300,size:12,font});
 const bytes=Buffer.from(await doc.save());
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1200,height:900},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(120000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://positions.test/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1);let body=fs.readFileSync(path.join(root,name));
   if(name===`project-workspace-smartmatch-v${testVersion}.js`)body=Buffer.from(body.toString().replace(/\}\)\(\);(?=\s*$)/,`window.pmTest={analyze,pmCommit,pmPlace,pmRename,pmRemove,buildPortableProjectPdf,buildInstances,makeProjectPayload,get:()=>({instances,protocolMap,manualPositions,positionEdits})};})();`));
   return route.fulfill({contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html',body});
  });
  await page.goto(`https://positions.test/project-workspace-smartmatch-v${testVersion}.html`);
  await page.evaluate(async data=>{await pmTest.analyze(new File([new Uint8Array(data)],'fixture.pdf',{type:'application/pdf'}))},[...bytes]);
  let state=await page.evaluate(()=>pmTest.get());assert(state.instances.some(o=>o.code==='GS1'),'Plain GS 1 text found');assert(state.instances.some(o=>o.code==='GS2'),'Uncolored annotation found');assert(!state.instances.some(o=>o.code==='GS230V'),'Responsibility voltage is not a position');
  await page.locator('#pmCode').fill('GS 1');await page.locator('#pmAdd').click();
  // Real pointer events exercise tap placement and click suppression.
  const box=await page.locator('#pwCanvas').boundingBox();await page.touchscreen.tap(box.x+80,box.y+80);
  await page.waitForFunction(()=>pmTest.get().manualPositions.length===1);
  await page.evaluate(async()=>{pmTest.pmPlace();await pmTest.pmCommit({x:220,y:170})});
  state=await page.evaluate(()=>pmTest.get());const manual=state.instances.filter(o=>o.manual);assert.equal(manual.length,2);assert.notEqual(manual[0].id,manual[1].id);
  await page.locator('#pmCode').fill('GS 1');await page.locator('#pmCard').fill('2');await page.locator('#pmLink').click();
  assert.equal((await page.evaluate(()=>pmTest.get())).protocolMap.GS1,2);
  await page.evaluate(async id=>{const o=pmTest.get().instances.find(o=>o.id===id);o.checks.kept=true;pmTest.pmPlace(o);await pmTest.pmCommit({x:280,y:180})},manual[0].id);
  const scanned=state.instances.find(o=>!o.manual&&o.code==='GS1');await page.evaluate(async id=>{const o=pmTest.get().instances.find(o=>o.id===id);o.checks.sourceKept=true;pmTest.pmPlace(o);await pmTest.pmCommit({x:300,y:250})},scanned.id);
  page.once('dialog',d=>d.accept());await page.evaluate(async()=>{await pmTest.pmRemove(pmTest.get().instances.find(o=>o.code==='GS2'))});
  page.once('dialog',d=>d.accept('GS 3'));await page.evaluate(async id=>{await pmTest.pmRename(pmTest.get().instances.find(o=>o.id===id))},manual[1].id);
  const before=await page.evaluate(()=>pmTest.makeProjectPayload());const saved=await page.evaluate(async()=>Array.from(await pmTest.buildPortableProjectPdf()));
  await page.evaluate(async data=>{localStorage.clear();await pmTest.analyze(new File([new Uint8Array(data)],'saved.pdf',{type:'application/pdf'}))},saved);
  state=await page.evaluate(()=>pmTest.get());assert.equal(state.instances.filter(o=>o.manual).length,2);assert(!state.instances.some(o=>o.code==='GS2'),'Deleted source annotation stays deleted');assert.equal(state.protocolMap.GS1,2);assert.equal(state.instances.find(o=>o.id===scanned.id).checks.sourceKept,true);assert.deepEqual(state.instances.find(o=>o.id===scanned.id).rect,before.positionEdits[scanned.id].rect);assert.equal(state.instances.find(o=>o.id===manual[0].id).checks.kept,true);assert.deepEqual(state.instances.find(o=>o.id===manual[0].id).rect,before.manualPositions.find(o=>o.id===manual[0].id).rect);assert.equal(state.instances.find(o=>o.id===manual[1].id).code,'GS3');
  if(process.env.SAMPLE_PDF){await page.evaluate(async data=>{localStorage.clear();await pmTest.analyze(new File([new Uint8Array(data)],'sample.pdf',{type:'application/pdf'}))},[...fs.readFileSync(process.env.SAMPLE_PDF)]);state=await page.evaluate(()=>pmTest.get());assert(state.instances.some(o=>o.code==='310A'));assert(state.instances.filter(o=>o.code==='310A').length>1);assert(!state.instances.some(o=>!o.scanSource&&/^\d+$/.test(o.code)&&!state.protocolMap[o.code]),'Unmatched dimensions must not become positions');console.log('SAMPLE',state.instances.length,'positions;',Object.keys(state.protocolMap).length,'linked codes');}
  assert.deepEqual(errors,[]);console.log('PASS: text and uncolored annotation, GS normalization, repeated positions, move, rename, manual link, delete, portable PDF reopen without local storage');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
