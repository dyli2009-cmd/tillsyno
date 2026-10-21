'use strict';
// Generated PDFs only. Authentication/PIN is stubbed only in this local test.
// Real card-first preparation, two-file import, exact matching, later products,
// independent door checks and portable export/reopening use the application UI.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..'),entry=process.env.SMARTMATCH_ENTRY||'smartmatch-read-v9-98.html';
const devices=[{name:'desktop',width:1366,height:900},{name:'ipad',width:820,height:1180,touch:true},{name:'iphone',width:390,height:844,touch:true}].filter(d=>!process.env.SMARTMATCH_DEVICE||d.name===process.env.SMARTMATCH_DEVICE);
const codeRect={x:.07,y:.07,w:.30,h:.04},tableRect={x:.045,y:.16,w:.91,h:.61};
const groups=[['Daglåsning',['CASE-710','TRIM-22','SUP-111']],['Nattlåsning',['NIGHT-511','TRIM-22']],['Dörrstängning',['AUTO-300']],['Larm/Passer',['MAG-101']]],values=groups.flatMap(([,v])=>v);
const server=http.createServer((req,res)=>{const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}});
const url=()=>`http://127.0.0.1:${server.address().port}/${entry}`;
const upload=(buffer,name)=>({name,mimeType:'application/pdf',buffer});
async function fixture(){
 const plan=await PDFDocument.create(),font=await plan.embedFont(StandardFonts.Helvetica),drawing=plan.addPage([1000,700]);
 const labels=[['240NZ',130,500],['240NZ',650,300],['241NZ',400,500]];
 for(const [index,[code,x,y]]of labels.entries()){drawing.drawText(code,{x,y,size:22,font});drawing.node.addAnnot(plan.context.register(plan.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText(code),Rect:[x-2,y-3,x+110,y+27],F:4,NM:PDFHexString.fromText('matrix-'+index)})));}
 drawing.drawText('240NZ2',{x:100,y:120,size:22,font});drawing.drawText('1240NZ',{x:600,y:120,size:22,font});
 const cards=await PDFDocument.create(),regular=await cards.embedFont(StandardFonts.Helvetica),bold=await cards.embedFont(StandardFonts.HelveticaBold);
 for(const [index,code]of ['240NZ','241NZ'].entries()){
  const card=cards.addPage([595,842]),shift=index?7:0;
  const put=(text,x,y,strong=false,size=9)=>card.drawText(text,{x:x+shift,y,size,font:strong?bold:regular});
  put(code,55,770,true,15);put('Littera',44,746,true);put('-',155,746);
  // The component and value cells above the body are intentionally blank.
  for(const [text,x]of [['Lev av',310],['Mont av',365],['Ansl av',415],['Funk ansvar',465],['Anm',535]])put(text,x,690,true,8);
  let y=664;
  function section(title,rows){put(title,40,y,true,10);y-=22;for(const [label,value,delivery,installer,connection='GS',functional='GS']of rows){for(const [text,x]of [[label,40],[value,155],[delivery,310],[installer,365],[connection,415],[functional,465]])if(text)put(text,x,y);y-=22;}y-=8;}
  section('Daglåsning',[
   ['Låshus','CASE-710','GS','GS'],['Cylinderbehör','TRIM-22','DT','GS'],
   ['Leverantörsdel','SUP-111','GS','DT'],['Cylinder','SHARED-8','Best/GS','Best/GS'],
   ['Trycke','-','GS','GS']
  ]);
  section('Nattlåsning',[['Låshus','NIGHT-511','GS','GS'],['Trycke','TRIM-22','DT','GS']]);
  section('Dörrstängning',[['Dörrautomatik','AUTO-300','GS','GS'],['Sensorlist','SENSE-40','DT','DT']]);
  section('Larm/Passer',[['Magnetkontakt','MAG-101','GS','GS'],['Anslutningsdel','CONNECT-9','DT','DT','GS','GS']]);
  put('Dörrfunktion',40,y,true);put('Datum',420,90);put('2030-01-02',465,90);
 }
 return {drawing:Buffer.from(await plan.save()),cards:Buffer.from(await cards.save())};
}
async function contextFor(browser,d){
 const ctx=await browser.newContext({viewport:{width:d.width,height:d.height},hasTouch:!!d.touch,isMobile:!!d.touch,acceptDownloads:true,userAgent:d.touch?'Mozilla/5.0 ('+(d.name==='ipad'?'iPad':'iPhone')+'; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1':undefined});
 await ctx.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await ctx.route('**/smartmatch-read-access-v9-85.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.documentElement.removeAttribute('data-read-locked');document.getElementById('smReadCodeGate').hidden=true;"}));
 await ctx.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__calls={work:0,ocr:0,scan:0,guides:0};
  window.Tesseract={createWorker(){window.__calls.ocr++;throw Error('Searchable generated matrix must not use OCR');}};
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:value=>{work={...value,read:options=>{window.__calls.work++;return value.read(options);}};}});
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:value=>{matcher={...value,scan:options=>{window.__calls.scan++;if(window.__forbidScan)throw Error('Reviewed portable links must not be rescanned');return value.scan(options);}};}});
  const show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')window.__calls.guides++;return show.call(this);};
 });return ctx;
}
async function markCode(page,ctx,touch){
 await page.locator('#rtCode').click();await page.locator('#rtViewport').scrollIntoViewIfNeeded();
 const b=await page.locator('#rtCanvasBox').evaluate((el,r)=>{const b=el.getBoundingClientRect();return {x:b.x+r.x*b.width,y:b.y+r.y*b.height,w:r.w*b.width,h:r.h*b.height};},codeRect);
 if(touch){const session=await ctx.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x,y:b.y,id:1}]});for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.w*i/8,y:b.y+b.h*i/8,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
 else{await page.mouse.move(b.x,b.y);await page.mouse.down();await page.mouse.move(b.x+b.w,b.y+b.h,{steps:8});await page.mouse.up();}
}
async function setTable(page){for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel('Tabell '+label,{exact:true}).evaluate((node,v)=>{node.value=String(v*100);node.dispatchEvent(new Event('change',{bubbles:true}));},tableRect[axis]);}
async function idle(page){await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:90000});}
async function ready(page){await page.waitForFunction(()=>SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===3&&document.getElementById('pwScanOverlay').hidden,null,{timeout:90000});}
const payload=page=>page.evaluate(()=>SmartMatchReadTest.payload());
const snapshot=page=>page.evaluate(()=>({positions:structuredClone(SmartMatchAppBridge.getPositions()),mapping:structuredClone(SmartMatchAppBridge.getDoorCardMapping()),read:SmartMatchReadTest.payload()}));
async function openPosition(page,id){await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(p=>p.id===id)),id);await page.waitForSelector('#pwProtocol[open]');await page.waitForFunction(()=>document.getElementById('pwProtocolCanvas')?.dataset.readCardId);}
async function exportProject(page){await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>{const b=document.getElementById('smartExportBuild');return !b.disabled&&b.textContent==='Spara PDF'||document.getElementById('smartExportStatus').dataset.level==='warning';},null,{timeout:90000});assert.equal(await page.locator('#smartExportBuild').innerText(),'Spara PDF',await page.locator('#smartExportStatus').innerText());const downloading=page.waitForEvent('download',{timeout:90000});await page.locator('#smartExportBuild').click();const download=await downloading;return fs.readFileSync(await download.path());}
function assertProducts(read){
 const cards=Object.values(read.cards).filter(c=>!c.sourceCardId);assert.equal(cards.length,2);
 for(const card of cards){assert.equal(card.workState,'ready');assert.equal(card.workReadError,false);assert.deepEqual(card.work,values);assert.equal(card.workItems.length,7);assert.equal(new Set(card.workItems.map(i=>i.key)).size,7,'duplicate values in different sections retain separate keys');
  assert(card.products.some(i=>i.value==='SUP-111'&&i.delivery==='GS'&&i.installer==='DT'),'GS delivery remains an approved source of GS work');
  assert(card.products.some(i=>i.value==='SENSE-40'&&i.delivery==='DT'&&i.installer==='DT'),'DT rows remain visible in the inventory');
  assert(card.products.some(i=>i.value==='CONNECT-9'&&i.delivery==='DT'&&i.installer==='DT'),'connection-only GS is inventory, not GS work');
  assert(card.products.some(i=>i.value==='SHARED-8'&&i.installer==='Best/GS'),'ambiguous owner text is preserved');
  assert(!card.work.some(v=>/SHARED|SENSE|CONNECT/.test(v)));assert(card.workWarnings.some(w=>/otydligt/.test(w)),'ambiguous GS responsibility remains an explicit warning');
 }
}
async function run(browser,d,input){
 let ctx=await contextFor(browser,d),page=await ctx.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const trace=s=>{if(process.env.SMARTMATCH_DEBUG)console.log(d.name+': '+s);};
 try{
  await page.goto(url());await page.locator('#rtMultiFiles').setInputFiles([upload(input.drawing,'generated-drawing.pdf'),upload(input.cards,'generated-extra-cards.pdf')]);await page.waitForSelector('#rtDialog[open]');trace('opened');
  assert.equal(await page.locator('#rtReadPhase').inputValue(),'codes');await page.locator('#rtPage').fill('2');await page.locator('#rtPage').dispatchEvent('change');await page.waitForFunction(()=>document.getElementById('rtPage').value==='2'&&document.getElementById('rtCanvas').width>0);
  await markCode(page,ctx,d.touch);await page.waitForFunction(()=>!document.getElementById('rtDiscover').disabled);await page.locator('#rtDiscover').click();await page.waitForFunction(()=>document.querySelector('#rtDiscoveryResults .rtPageChoice')&&!document.getElementById('rtPreview').disabled);trace('discovered');
  assert.equal(await page.locator('#rtDiscoveryResults .rtPageChoice input:checked').count(),2,'separate added PDF contributes both cards');await page.locator('#rtPreview').click();await page.waitForFunction(()=>!document.getElementById('rtMatchApproval').disabled);trace('matched');
  assert.equal(await page.locator('.rtMatchRow').count(),3,'whole card IDs match; longer suffix/prefix drawing labels do not');assert.equal(await page.evaluate(()=>__calls.work),0,'codes-first never reads a product table');await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await ready(page);
  const before=await snapshot(page);assert.deepEqual(before.mapping,{'240NZ':2,'241NZ':3});assert(Object.values(before.read.cards).every(c=>c.workState==='pending'));trace('workspace');
  await page.locator('#pwReadContinueProducts').click();await page.waitForSelector('#rtDialog[open]');await setTable(page);await page.locator('#rtPreview').click();await idle(page);trace('products');
  assert(await page.locator('#rtStart').isEnabled(),await page.locator('#rtStatus').innerText());await page.locator('#rtStart').click();await ready(page);
  const read=await payload(page);assertProducts(read);assert.deepEqual(read.matching,before.read.matching,'later products preserve reviewed drawing links');assert.deepEqual((await snapshot(page)).positions.map(p=>p.id),before.positions.map(p=>p.id));
  const chosen=before.positions.find(p=>p.code==='240NZ').id,other=before.positions.find(p=>p.code==='240NZ'&&p.id!==chosen).id;await openPosition(page,chosen);
  if(d.name==='iphone'&&await page.locator('#pwProtocolShowGS').isVisible())await page.locator('#pwProtocolShowGS').click();
  const visible=await page.locator('#pwChecklist .rtWorkSection').evaluateAll(nodes=>nodes.map(n=>[n.querySelector('h3.rtWorkSectionTitle')?.textContent,[...n.querySelectorAll('.pwCheckContent small')].map(v=>v.textContent)]));assert.deepEqual(visible,groups,'GS product values remain in their correct original sections');
  const checks=page.locator('#pwChecklist .pwCheckRow input');assert.equal(await checks.count(),7);await checks.first().check();await page.waitForFunction(()=>document.getElementById('pwChecklistMeta').textContent==='1 / 7 klara');
  const state=await page.evaluate(id=>SmartMatchAppBridge.readWorkState(SmartMatchAppBridge.getPositions().find(p=>p.id===id)),chosen);assert.equal(state.done,1);assert.equal(state.total,7);assert.equal(await page.evaluate(id=>SmartMatchAppBridge.readWorkState(SmartMatchAppBridge.getPositions().find(p=>p.id===id)).done,other),0,'other physical door keeps its own checks');
  await page.locator('#pwProtocolClose').click();const portable=await exportProject(page);trace('exported');const pdf=await PDFDocument.load(portable),saved=JSON.parse(pdf.catalog.get(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());assertProducts(saved.readTestData);assert.deepEqual(saved.readTestData.matching,read.matching);assert.equal(Object.values(saved.readTestData.checks||{}).flatMap(Object.values).filter(Boolean).length,1);
  await ctx.close();ctx=await contextFor(browser,d);page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.goto(url());await page.evaluate(()=>window.__forbidScan=true);await page.locator('#pwFile').setInputFiles(upload(portable,'saved-matrix.pdf'));await ready(page);trace('reopened');
  const restored=await snapshot(page);assertProducts(restored.read);assert.deepEqual(restored.read.matching,read.matching);assert.deepEqual(restored.mapping,before.mapping);assert.equal(await page.evaluate(()=>__calls.guides),0,'portable project opens without the preparation guide');assert.equal(await page.evaluate(()=>__calls.scan),0,'saved drawing positions never rescan');
  const reopenedState=await page.evaluate(id=>SmartMatchAppBridge.readWorkState(SmartMatchAppBridge.getPositions().find(p=>p.id===id)),chosen);assert.deepEqual(reopenedState,state,'work/check/time state survives a fresh browser session');await openPosition(page,chosen);assert.equal(await page.locator('#pwChecklist .pwCheckRow input:checked').count(),1);assert.equal(await page.evaluate(()=>__calls.ocr),0);assert.deepEqual(errors,[]);
  console.log('PASS '+d.name+': extra card PDF → top-left IDs → exact drawing links → blank-header matrix products → sections/GS ownership → independent checks → portable fresh-session reopen; no OCR');
 }catch(e){console.error('FAIL '+d.name,await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,body:document.body.innerText.slice(-1600),read:SmartMatchReadTest?.payload(),errors:window.__calls})).catch(()=>null));await page.screenshot({path:path.join(root,'work/matrix98-'+d.name+'-failed.png')}).catch(()=>{});throw e;}finally{await ctx.close();}
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const input=await fixture();for(const d of devices)await run(browser,d,input);}finally{await browser?.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
