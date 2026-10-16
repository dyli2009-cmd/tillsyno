/* Browser regression for Avläsning TEST 4: one marked example discovers
 * independent cards sharing a PDF page. The generated fixture has a different
 * arrangement and different identities from the supplied drawing.
 * Optional: REAL_MULTI_CARD_PDF=/absolute/path/to/ritning_och_dorrkort.pdf
 * SMARTMATCH_DEVICE=desktop|iphone|ipad, SMARTMATCH_QA_DIR=/tmp/qa,
 * SMARTMATCH_REGION_FIXTURE=alternate-regions|uploaded-multiple-cards.
 * SMARTMATCH_READ_VERSION=v4|v5 selects the reader (default v4).
 * Uploaded PDFs and exported project files are never stored in the repository.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createHash}=require('node:crypto');
const {PDFDocument,StandardFonts,PDFName,rgb}=require('../vendor/pdf-lib.min.js');
const root=path.resolve(__dirname,'..');
const readVersion=process.env.SMARTMATCH_READ_VERSION||'v4';
assert(['v4','v5'].includes(readVersion),'supported isolated reader version');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const devices=[{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true},{name:'ipad',width:1024,height:1366,touch:true}].filter(d=>!process.env.SMARTMATCH_DEVICE||d.name===process.env.SMARTMATCH_DEVICE);
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
 catch(_){res.writeHead(404);res.end();}
});
function pagesOf(value){
 const pages=[];
 for(const part of value.split(/[,;\s]+/).filter(Boolean)){const [a,b=a]=part.split('-').map(Number);for(let n=a;n<=b;n++)pages.push(n);}
 return [...new Set(pages)].sort((a,b)=>a-b);
}
function countsOf(items){const out={};for(const item of items)out[item.code]=(out[item.code]||0)+1;return out;}
function checkedCount(payload){return Object.values(payload.checks||{}).flatMap(Object.values).filter(Boolean).length;}
function metadata(payload){
 return Object.entries(payload.cards).map(([id,c])=>({id,page:c.page,code:c.code,codeRect:c.codeRect,tableRect:c.tableRect,bounds:c.bounds,work:c.work})).sort((a,b)=>a.id.localeCompare(b.id));
}
async function alternateFixture(){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const plan=pdf.addPage([842,595]);
 plan.drawText('Alternative plan',{x:45,y:550,size:20,font});
 for(const [i,code]of ['271B','482C','271B','STUDIO','915D','271B1','X271B'].entries())
  plan.drawText(code,{x:90+(i%3)*245,y:450-Math.floor(i/3)*125,size:18,font,color:i%2?rgb(.1,.3,.8):rgb(.8,.1,.1)});
 const cards=[
  {code:'271B',heading:'Dörrkort 271B',page:2,term:'ALPHA',values:['Enkeldörr ALPHA','Cylinder ALPHA','Kortläsare ALPHA','Trycke ALPHA','Sensor ALPHA','Motor ALPHA']},
  {code:'482C',heading:'Toalett 482C',page:2,term:'BRAVO',values:['Glasdörr BRAVO','Vred BRAVO','Nyckel BRAVO','D-grepp BRAVO','Rökdetektor BRAVO','Manuell BRAVO']},
  {code:'STUDIO',heading:'Beslagskort STUDIO',page:4,term:'CHARLIE',values:['Parsdörr CHARLIE','Motorlås CHARLIE','Porttelefon CHARLIE','Dörrdrag CHARLIE','Radar CHARLIE','Skjutdörr CHARLIE']},
  {code:'915D',heading:'Dörrkort 915D',page:4,term:'DELTA',values:['Ståldörr DELTA','Cylinder DELTA','PIN DELTA','Handtag DELTA','Dörrkontakt DELTA','Dörrstängare DELTA']}
 ];
 const categories=['DÖRRTYP','LÅS','PASSERSYSTEM','HANDTAG','SENSORER','DÖRRAUTOMATIK'];
 for(const pageNumber of [2,4]){
  if(pageNumber===4){const cover=pdf.addPage([842,595]);cover.drawText('Site instructions',{x:50,y:500,size:20,font});}
  const p=pdf.addPage([842,595]);p.drawText('Dörrkort',{x:36,y:560,size:20,font:bold});
  for(const [column,card]of cards.filter(c=>c.page===pageNumber).entries()){
   const x=48+column*390;
   p.drawRectangle({x:x-8,y:170,width:365,height:328,borderWidth:.7,borderColor:rgb(.5,.5,.5)});
   p.drawRectangle({x:x-3,y:476,width:245,height:27,color:rgb(.1,.3,.6)});
   p.drawText(card.heading,{x:x+5,y:484,size:15,font:bold,color:rgb(1,1,1)});
   for(const [i,label]of categories.entries()){
    p.drawText(label,{x,y:430-i*41,size:9,font:bold});
    p.drawText(card.values[i],{x,y:416-i*41,size:12,font});
   }
   p.drawText('Kontrollerad: ________ Datum: ________',{x,y:178,size:9,font});
  }
 }
 return {name:'alternate-regions',bytes:Buffer.from(await pdf.save()),pages:[2,4],cards,counts:{'271B':2,'482C':1,STUDIO:1,'915D':1},regions:{code:{x:.05,y:.145,w:.30,h:.06},table:{x:.05,y:.26,w:.41,h:.40}}};
}
function realFixture(file){
 return {name:'uploaded-multiple-cards',bytes:fs.readFileSync(file),pages:[2,3],counts:{KLASSRUM1:1,KLASSRUM2:1,GS1:1,GS2:1,GS3:1,WC:1,HWC:1,TEKNIK:1,ELRUM:1,'ENTRÉ':1},allowLegend:true,regions:{code:{x:.065,y:.13,w:.14,h:.05},table:{x:.05,y:.198,w:.275,h:.28}},cards:[
  {code:'KLASSRUM1',page:2,terms:['EI30','Cylinderlås klass 3','rumsbokning']},
  {code:'KLASSRUM2',page:2,terms:['EI30','Cylinderlås klass 3','rumsbokning']},
  {code:'GS1',page:2,terms:['glasparti','tidsstyrd','rörelsedetektor'],absent:['CO2','klass 2']},
  {code:'GS2',page:2,terms:['glasparti','tidsstyrd','CO2'],absent:['rumsbokning','klass 2']},
  {code:'GS3',page:2,terms:['Cylinderlås klass 2','nyckelstyrd'],absent:['CO2','tidsstyrd']},
  {code:'WC',page:2,terms:['utåtgående','upptagetindikering','fuktgivare'],absent:['CO2','PIN-kod']},
  {code:'HWC',page:3,terms:['tillgänglighetsanpassad','nödanrop','svängdörr'],absent:['högsäkerhetsprofil','fallspärr']},
  {code:'TEKNIK',page:3,terms:['högsäkerhetsprofil','temperaturgivare','behörig personal'],absent:['fallspärr','rökdetektor']},
  {code:'ELRUM',page:3,terms:['elbehörig','rökdetektor','fallspärr'],absent:['temperaturgivare','porttelefon']},
  {code:'ENTRÉ',page:3,terms:['Parsdörr','porttelefon','skjutdörrsautomatik'],absent:['temperaturgivare','fuktgivare']}
 ]};
}
async function makeContext(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:!!device.touch,isMobile:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{window.showSaveFilePicker=undefined;});
 return context;
}
async function exercise(browser,device,test){
 const context=await makeContext(browser,device),page=await context.newPage(),errors=[],remote=[];
 const url='http://127.0.0.1:'+server.address().port+'/smartmatch-read-test-'+readVersion+'.html';
 const total=Object.values(test.counts).reduce((sum,n)=>sum+n,0);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(r.url()))remote.push(r.url());});
 async function ready(){await page.waitForFunction(n=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===n&&document.getElementById('pwScanOverlay').hidden,total,{timeout:90000});}
 async function screenshot(suffix){if(process.env.SMARTMATCH_QA_DIR){fs.mkdirSync(process.env.SMARTMATCH_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SMARTMATCH_QA_DIR,device.name+'-'+test.name+'-'+suffix+'.png'),fullPage:true});}}
 async function run(selector){
  await page.locator(selector).click();
  await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:180000}).catch(async e=>{throw Error(e.message+' Status: '+await page.locator('#rtStatus').textContent());});
 }
 try{
  await page.goto(url);
  await page.locator('#pwFile').setInputFiles({name:test.name+'.pdf',mimeType:'application/pdf',buffer:test.bytes});
  await page.waitForSelector('#rtDialog[open]');
  assert.equal(await page.locator('#rtPage').inputValue(),'2','the guide starts with the first example card');
  assert.equal(await page.evaluate(()=>SmartMatchAppBridge.getPdf()),null,'opening the guide does not start matching');
  const cdp=device.touch?await context.newCDPSession(page):null;
  async function mark(kind,r){
   await page.locator('#rt'+kind).click();await page.locator('#rtCanvasBox').scrollIntoViewIfNeeded();
   const box=await page.locator('#rtCanvasBox').boundingBox(),start={x:box.x+box.width*r.x,y:box.y+box.height*r.y},end={x:start.x+box.width*r.w,y:start.y+box.height*r.h};
   if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});await page.mouse.up();}
  }
  await mark('Code',test.regions.code);await mark('Table',test.regions.table);await screenshot('example');
  await run('#rtDiscover');
  assert.deepEqual(pagesOf(await page.locator('#rtPages').inputValue()),test.pages,'the example discovers all card pages, excluding the plan and cover');
  assert.equal(await page.locator('.rtResult').count(),0,'discovery precedes independent work review');
  await run('#rtPreview');
  assert.equal(await page.locator('.rtResult').count(),test.cards.length,'each card gets its own result, including cards sharing a page');
  const read=await page.locator('.rtResult').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.cardId,code:node.querySelector('input').value,work:node.querySelector('textarea').value})));
  assert.equal(new Set(read.map(c=>c.id)).size,test.cards.length,'every card has a stable, distinct identity');
  assert(read.every(c=>c.id),'results expose the card identity');
  assert.deepEqual(read.map(c=>c.code).sort(),test.cards.map(c=>c.code).sort(),'compound room names keep the distinguishing number');
  for(const expected of test.cards){
   const card=read.find(c=>c.code===expected.code),i=read.indexOf(card)+1;
   assert.equal(await page.getByLabel('Beteckning kort '+i,{exact:true}).inputValue(),expected.code);
   assert.equal(await page.getByLabel('Arbetsrader kort '+i,{exact:true}).inputValue(),card.work);
   assert.equal(card.work.split('\n').filter(s=>s.trim()).length,6,'card '+expected.code+' has six category/value tasks');
   for(const term of expected.terms||expected.values)assert(card.work.toUpperCase().includes(term.toUpperCase()),expected.code+' keeps its own '+term);
   for(const term of expected.absent||test.cards.filter(c=>c!==expected).map(c=>c.term).filter(Boolean))assert(!card.work.toUpperCase().includes(term.toUpperCase()),expected.code+' excludes neighboring '+term);
  }
  const rawHits=await page.locator('.rtMatchRow').count();
  assert(rawHits===total||test.allowLegend&&rawHits===total+1,'drawing search finds all expected stamps, with at most the explicitly reviewed legend');
  if(rawHits>total){
   // GS1 also appears in this drawing's explanation key. The user reviews and
   // deselects that example; a code in a legend must not become a physical door.
   const rows=page.locator('.rtMatchRow'),legend=await rows.evaluateAll(nodes=>nodes.map((n,i)=>({i,text:n.textContent})).filter(r=>/GS1/.test(r.text)));
   assert.equal(legend.length,2,'the one extra match is the GS1 legend example');
   const viewed=[];
   for(const candidate of legend){await rows.nth(candidate.i).locator('button').click();await page.waitForSelector('#rtHitRect:not([hidden])');viewed.push({...candidate,top:await page.locator('#rtHitRect').evaluate(el=>parseFloat(el.style.top))});}
   viewed.sort((a,b)=>b.top-a.top);assert(viewed[0].top>70,'the extra GS1 is in the explanation key at the bottom of the plan');
   await rows.nth(viewed[0].i).locator('input[type="checkbox"]').uncheck();
  }
  assert(await page.locator('#rtStart').isDisabled(),'drawing review is required');
  await page.locator('.rtMatchRow button').first().click();await page.waitForSelector('#rtHitRect:not([hidden])');await screenshot('review');
  await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await ready();
  const positions=await page.evaluate(()=>SmartMatchAppBridge.getPositions()),mapping=await page.evaluate(()=>SmartMatchAppBridge.getDoorCardMapping());
  assert.deepEqual(countsOf(positions),test.counts,'the finished project contains precisely the reviewed drawing doors');
  for(const expected of test.cards)assert.equal(mapping[expected.code],expected.page,'code '+expected.code+' links to the correct shared PDF page');
  assert(positions.every(p=>!test.pages.includes(p.page)),'card pages never become drawing positions');
  const payload=await page.evaluate(()=>SmartMatchReadTest.payload());
  assert.deepEqual(payload.pages,test.pages);assert.equal(Object.keys(payload.cards).length,test.cards.length);
  for(const expected of test.cards){
   const card=Object.values(payload.cards).find(c=>c.code===expected.code);
   assert.equal(card.page,expected.page);
   for(const field of ['bounds','codeRect','tableRect']){
    assert(card[field]&&['x','y','w','h'].every(k=>Number.isFinite(card[field][k])),expected.code+' stores '+field);
    assert(card[field].w>0&&card[field].h>0&&card[field].x+card[field].w<=1.001&&card[field].y+card[field].h<=1.001);
   }
   assert(card.bounds.w<.7,'a shared-page card is clipped to its own region');
   const siblings=Object.values(payload.cards).filter(c=>c.page===card.page&&c.code!==card.code);
   for(const sibling of siblings)assert.notDeepEqual(card.tableRect,sibling.tableRect,'cards on one page have separate table regions');
  }
  console.log('PASS '+device.name+' '+test.name+': '+test.cards.length+' independent cards, '+total+' reviewed links');
  const first=positions.find(p=>p.code===test.cards[0].code),other=positions.find(p=>p.code===(test.name==='alternate-regions'?test.cards[0].code:test.cards[1].code)&&p.id!==first.id);
  await page.locator('#pwMarkers [data-position-id="'+first.id+'"]').evaluate(el=>el.click());await page.waitForSelector('#pwProtocol[open]');
  assert.equal(await page.locator('.rtWorkRow input').count(),6,'the clicked marker opens its six work tasks');
  for(const term of test.cards[0].terms||test.cards[0].values)assert((await page.locator('.rtWorkRow').allTextContents()).join(' ').toUpperCase().includes(term.toUpperCase()),'opened work belongs to '+first.code);
  const card=Object.values(payload.cards).find(c=>c.code===first.code),pageDoc=await PDFDocument.load(test.bytes),size=pageDoc.getPage(card.page-1).getSize(),expectedRatio=card.bounds.w*size.width/(card.bounds.h*size.height);
  await page.waitForFunction(({ratio,id})=>{const c=document.getElementById('pwProtocolCanvas');return c?.dataset.readCardId===id&&c.width>10&&Math.abs(c.width/c.height-ratio)<.03;},{ratio:expectedRatio,id:card.id},{timeout:30000});
  if(device.name==='desktop'){
   // Await the button's asynchronous handler so assertions inspect the finished
   // fitted crop, rather than canvas dimensions from the previous render.
   await page.locator('#pwProtocolFit').evaluate(async button=>{await button.onclick();});
   const fit=await page.evaluate(()=>{
    const c=document.getElementById('pwProtocolCanvas'),wrap=document.getElementById('pwProtocolCanvasWrap');
    return {width:parseFloat(c.style.width),height:parseFloat(c.style.height),availableWidth:wrap.clientWidth-20,availableHeight:wrap.clientHeight-20,zoom:document.getElementById('pwProtocolZoomInfo').textContent};
   });
   const target=Math.min(fit.availableWidth/(size.width*card.bounds.w),fit.availableHeight/(size.height*card.bounds.h));
   const fittedScale=fit.width/(size.width*card.bounds.w);
   assert.equal(fit.zoom,Math.round(fittedScale*100)+'%','zoom reflects the completed fitted render');
   if(target>=.4){assert(fit.width<=fit.availableWidth+1,'the fitted card fits the viewport width');assert(fit.height<=fit.availableHeight+1,'the fitted card fits the viewport height');}
   if(target>.4&&target<3)assert(Math.min(Math.abs(fit.width-fit.availableWidth),Math.abs(fit.height-fit.availableHeight))<=1,'Passa fills one viewport axis with the selected card, independently of the original PDF page size');
  }
  await page.locator('.rtWorkRow input').first().check();assert.notEqual(await page.locator('#pwProtocolPercent').textContent(),'0% arbete');
  await page.locator('#pwProtocolClose').click();
  await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(p=>p.id===id)),other.id);await page.waitForSelector('#pwProtocol[open]');
  assert.equal(await page.locator('.rtWorkRow input').first().isChecked(),false,'each physical door keeps independent work status');
  await page.locator('#pwProtocolClose').click();
  const distinct=test.cards.find(c=>c.page===test.cards[0].page&&(c.term&&c.term!==test.cards[0].term||c.absent));
  const distinctPosition=positions.find(p=>p.code===distinct.code);
  await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(p=>p.id===id)),distinctPosition.id);await page.waitForSelector('#pwProtocol[open]');
  const distinctWork=(await page.locator('.rtWorkRow').allTextContents()).join(' ').toUpperCase();
  for(const term of distinct.terms||distinct.values)assert(distinctWork.includes(term.toUpperCase()),'marker '+distinct.code+' opens its own work on the shared page');
  for(const term of distinct.absent||[test.cards[0].term])assert(!distinctWork.includes(term.toUpperCase()),'marker '+distinct.code+' excludes another card’s '+term);
  assert.equal(await page.locator('.rtWorkRow input:checked').count(),0,'a neighboring card also has separate checks');
  await page.locator('#pwProtocolClose').click();
  const saved=await page.evaluate(()=>SmartMatchAppBridge.save());
  assert.equal(checkedCount(saved.readTestData),1);assert(Object.values(saved.instances).every(p=>p.progress===0),'work does not change legacy control answers');
  const expectedMetadata=metadata(saved.readTestData);
  await page.reload();await ready();
  const refreshed=await page.evaluate(()=>SmartMatchReadTest.payload());assert.equal(checkedCount(refreshed),1);assert.deepEqual(metadata(refreshed),expectedMetadata,'refresh retains all per-card clips and work');
  if(device.name==='desktop'){
   await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');
   const pending=page.waitForEvent('download',{timeout:90000});await page.locator('#smartExportBuild').click();const download=await pending,exported=fs.readFileSync(await download.path());
   const doc=await PDFDocument.load(exported),raw=doc.catalog.get(PDFName.of('TillsynoSmartMatchV30Data'));assert(raw?.decodeText,'export embeds the project');
   const data=JSON.parse(raw.decodeText());assert.equal(checkedCount(data.readTestData),1);assert.deepEqual(metadata(data.readTestData),expectedMetadata,'export retains individual card geometry');
   const exportedHash=createHash('sha256').update(exported).digest('hex');
   for(const staleLocal of [false,true]){
    const fresh=await makeContext(browser,device),reopened=await fresh.newPage();
    try{
     await reopened.goto(url);
     if(staleLocal){const stale={...data.readTestData,sourceId:exportedHash,checks:{}};await reopened.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:'tillsyno-read-test-'+readVersion+'-source:'+exportedHash,value:stale});}
     await reopened.locator('#pwFile').setInputFiles({name:'portable.pdf',mimeType:'application/pdf',buffer:exported});
     await reopened.waitForSelector('#rtDialog[open]');assert.equal(await reopened.locator('.rtMatchRow input:checked').count(),total,'the exported PDF restores reviewed links and deselected legend examples');
     await reopened.locator('#rtMatchApproval').check();await reopened.locator('#rtStart').click();
     await reopened.waitForFunction(n=>SmartMatchAppBridge.getPositions().length===n&&document.getElementById('pwScanOverlay').hidden,total,{timeout:90000});
     const restored=await reopened.evaluate(()=>SmartMatchReadTest.payload());assert.equal(checkedCount(restored),1,staleLocal?'embedded work wins over conflicting local data':'work restores in a fresh browser');assert.deepEqual(metadata(restored),expectedMetadata,'card clips restore without local state');
    }finally{await fresh.close();}
   }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'reading and OCR stay on the application origin');
  console.log('PASS '+device.name+' '+test.name+': card-specific canvas, work status, refresh'+(device.name==='desktop'?', portable PDF and fresh restore':''));
 }catch(error){
  console.error('Browser state:',await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,state:document.getElementById('pwState')?.textContent,cards:[...document.querySelectorAll('.rtResult')].map(n=>({id:n.dataset.cardId,code:n.querySelector('input')?.value,hint:n.querySelector('.rtMatchHint')?.textContent,work:n.querySelector('textarea')?.value})),positions:window.SmartMatchAppBridge?.getPositions().map(p=>p.code),dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id)})).catch(()=>null));
  await screenshot('failure').catch(()=>{});throw error;
 }finally{await context.close();}
}
(async()=>{
 let tests=[await alternateFixture()];if(process.env.REAL_MULTI_CARD_PDF)tests.push(realFixture(process.env.REAL_MULTI_CARD_PDF));
 if(process.env.SMARTMATCH_REGION_FIXTURE)tests=tests.filter(test=>test.name===process.env.SMARTMATCH_REGION_FIXTURE);
 assert(tests.length,'the selected fixture exists; uploaded-multiple-cards requires REAL_MULTI_CARD_PDF');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});for(const device of devices)for(const test of tests)await exercise(browser,device,test);}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
