/* Portable prepared-PDF opening: no OCR/search, one parse per engine, original
 * byte ownership, canceled/rejected opens and overlapping file choices.
 * All input is synthetic; auth is replaced only in the isolated test browser. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {PDFDocument, StandardFonts, PDFName, PDFHexString} = require('../vendor/pdf-lib.min.js');
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((request, response) => {
  const file = path.resolve(root, decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\//, ''));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); return response.end(); }
  try {
    response.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8'})[path.extname(file)] || 'application/octet-stream');
    response.end(fs.readFileSync(file));
  } catch (_) { response.writeHead(404); response.end(); }
});
async function fixture(code, count) {
  const document = await PDFDocument.create(), font = await document.embedFont(StandardFonts.Helvetica);
  const plan = document.addPage([595,842]), card = document.addPage([595,842]);
  const hits = [];
  for (let index = 0; index < count; index++) {
    const x = 60 + index * 130, y = 640 - index * 90;
    plan.drawText(code, {x,y,size:18,font});
    hits.push({page:1,code,rect:[x,y,x+100,y+25],box:{x:x/595,y:(842-y-25)/842,w:100/595,h:25/842},selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000+index,label:code});
  }
  card.drawText('Beslagskod: ' + code, {x:60,y:750,size:20,font});
  const id = 'generated-card:' + code, codeRect = {x:.08,y:.08,w:.78,h:.06}, tableRect = {x:.08,y:.16,w:.8,h:.25};
  const readTestData = {schema:1,phase:'full',sourceId:'generated:' + code,rects:{code:codeRect,table:tableRect},pages:[2],cards:{[id]:{id,page:2,code,header:'Beslagskod: ' + code,rawTable:'Lås ' + code,work:['Lås ' + code],workState:'ready',workPolicy:'all',codeRect,tableRect,bounds:{x:.06,y:.06,w:.84,h:.38},choices:[code],method:'PDF-text',confidence:100}},checks:{},matching:{version:2,hits,pages:[{page:1,count,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Generated ' + code};
  const payload = {schema:6,projectId:'project:' + code,projectRevision:1,instances:{},automationItems:[],readTestData};
  for (const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])
    document.catalog.set(PDFName.of(key), PDFHexString.fromText(JSON.stringify(payload)));
  return {code,count,bytes:Buffer.from(await document.save())};
}
async function invalidRoot(input,field,value) {
  const document=await PDFDocument.load(input.bytes);
  const payload=JSON.parse(document.catalog.lookup(PDFName.of('TillsynoSmartMatchV36Data')).decodeText());
  payload[field]=value;
  for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])
    document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
  return {...input,bytes:Buffer.from(await document.save())};
}
async function contextFor(browser) {
  const context = await browser.newContext({viewport:{width:1366,height:900},acceptDownloads:true});
  await context.route('**/auth/guard.js*', route => route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-10.html`);
  await page.waitForFunction(() => !!window.SmartMatchReadTest && !!window.SmartMatchSession);
  await page.evaluate(() => {
    window.__restoreCalls = {pdfLib:0,pdfJs:0,arrayBuffer:0,text:0,workers:0,search:0,work:0,destroyed:0};
    const load = PDFLib.PDFDocument.load;
    PDFLib.PDFDocument.load = function(...args) { __restoreCalls.pdfLib++; return load.apply(this,args); };
    const pdfJs = pdfjsLib, getDocument = pdfJs.getDocument;
    window.pdfjsLib = {...pdfJs, getDocument:function(...args) {
      __restoreCalls.pdfJs++;
      const task = getDocument.apply(pdfJs,args);
      task.promise.then(document => {
        const destroy = document.destroy;
        document.destroy = function(...args) { __restoreCalls.destroyed++; return destroy.apply(this,args); };
        const getPage = document.getPage;
        document.getPage = async function(...args) {
          const page = await getPage.apply(this,args);
          if (!page.__restoreInstrumented) {
            page.__restoreInstrumented = true;
            const text = page.getTextContent;
            page.getTextContent = function(...args) { __restoreCalls.text++; return text.apply(this,args); };
          }
          return page;
        };
      });
      return task;
    }};
    const arrayBuffer = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function(...args) { __restoreCalls.arrayBuffer++; return arrayBuffer.apply(this,args); };
    window.Tesseract = {async createWorker() { __restoreCalls.workers++; throw Error('No OCR while restoring a prepared PDF'); }};
    for (const [name,method,counter] of [['SmartMatchReadMatcher','scan','search'],['SmartMatchReadWork','read','work']]) {
      const old = window[name];
      window[name] = {...old,[method]() { __restoreCalls[counter]++; throw Error('No new read while restoring a prepared PDF'); }};
    }
  });
  return {context,page};
}
async function open(page, input, options = {}) {
  return page.evaluate(async ({data,name,options}) => {
    const file = new File([new Uint8Array(data)],name,{type:'application/pdf'});
    try { return {opened:await SmartMatchAppBridge.openReadFile(file,options)}; }
    catch (error) { return {error:error.message}; }
  }, {data:[...input.bytes],name:'prepared-' + input.code + '.pdf',options});
}
async function state(page) {
  return page.evaluate(() => ({
    hasPdf:!!SmartMatchAppBridge.getPdf(),
    project:SmartMatchReadTest.payload(),
    codes:SmartMatchAppBridge.getPositions().map(position=>position.code),
    bytes:[...SmartMatchAppBridge.getOriginalPdfBytes() || []],
    ui:{fileName:document.getElementById('pwFileName').textContent,fileTitle:document.getElementById('pwFileName').title,
      inspectDisabled:document.getElementById('smartPdfInspect').disabled,saveDisabled:document.getElementById('pwSaveProject').disabled,
      emptyHidden:document.getElementById('pwEmpty').hidden,startMode:document.body.classList.contains('pwStartMode')},
    calls:{...__restoreCalls}
  }));
}
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
    const a = await fixture('GS71',2), b = await fixture('GS82',3);
    {
      const {context,page} = await contextFor(browser);
      assert.equal((await open(page,a)).opened,true);
      const before = await state(page);
      assert.deepEqual(before.calls,{pdfLib:1,pdfJs:1,arrayBuffer:1,text:0,workers:0,search:0,work:0,destroyed:0});
      assert(Buffer.from(before.bytes).equals(a.bytes),'export source retains exact original bytes after PDF.js transfer and display preparation');
      assert.deepEqual(before.codes,['GS71','GS71']);
      console.log('PASS prepared PDF: one file read, one PDFLib parse, one PDF.js document; zero text/OCR/search/product reading');
      assert.match((await open(page,{code:'empty',bytes:Buffer.alloc(0)})).error,/tom|0 byte/);
      const raw = await PDFDocument.create(); raw.addPage();
      assert.match((await open(page,{code:'raw',bytes:Buffer.from(await raw.save())})).error,/saknar.*avläsning/);
      const after = await state(page);
      assert.equal(after.hasPdf,true);assert.deepEqual(after.project,before.project);assert.deepEqual(after.codes,before.codes);assert.deepEqual(after.ui,before.ui);assert(Buffer.from(after.bytes).equals(Buffer.from(before.bytes)),'rejected opening retains previous source bytes');
      assert.equal(after.calls.workers,0);assert.equal(after.calls.search,0);assert.equal(after.calls.work,0);
      console.log('PASS empty/raw rejection retains the existing PDF, saved links, read data and original export bytes');
      for(const [field,value] of [['instances',[]],['automationItems',{}]]) {
        assert.match((await open(page,await invalidRoot(b,field,value))).error,/projektinformation|format/i);
        const rejected=await state(page);
        assert.equal(rejected.hasPdf,true);assert.deepEqual(rejected.project,before.project);assert.deepEqual(rejected.codes,before.codes);assert.deepEqual(rejected.ui,before.ui);assert(Buffer.from(rejected.bytes).equals(Buffer.from(before.bytes)),'malformed metadata retains previous source bytes');
      }
      console.log('PASS malformed root metadata with valid card data cannot mix incoming source bytes with an existing project');
      await page.evaluate(() => {
        window.__realSlrInit=SmartMatchSLRTest.initProject;
        SmartMatchSLRTest.initProject=()=>{throw Error('Synthetic project initialization failure');};
      });
      assert.match((await open(page,b)).error,/initialization failure/);
      await page.evaluate(()=>{SmartMatchSLRTest.initProject=__realSlrInit;});
      const failedInit=await state(page);
      assert.equal(failedInit.hasPdf,true);assert.deepEqual(failedInit.project,before.project);assert.deepEqual(failedInit.codes,before.codes);assert.deepEqual(failedInit.ui,before.ui);assert(Buffer.from(failedInit.bytes).equals(Buffer.from(before.bytes)),'failed project initialization retains previous source bytes');
      console.log('PASS failed project initialization before document adoption preserves the complete previous project');
      await context.close();
    }
    {
      const {context,page}=await contextFor(browser);
      assert.equal((await open(page,a)).opened,true);
      const before=await state(page);
      await page.evaluate(()=>{
        const library=pdfjsLib,getDocument=library.getDocument;
        window.pdfjsLib={...library,getDocument:function(...args){
          const task=getDocument.apply(library,args);
          task.promise.then(document=>{
            const getPage=document.getPage;
            document.getPage=async function(...args){
              const page=await getPage.apply(this,args);
              page.render=()=>{throw Error('Synthetic incoming drawing render failure');};
              return page;
            };
          });
          return task;
        }};
      });
      assert.match((await open(page,b)).error,/render failure/);
      const actual=await state(page);
      if(actual.hasPdf){
        assert.deepEqual(actual.codes,before.codes);assert.deepEqual(actual.project,before.project);
        assert(Buffer.from(actual.bytes).equals(Buffer.from(before.bytes)),'render failure retains old source bytes with the old document');
      }else{
        assert.equal(actual.project,null);assert.deepEqual(actual.bytes,[]);assert.deepEqual(actual.codes,[]);
        assert.equal(actual.ui.saveDisabled,true);assert.equal(actual.ui.emptyHidden,false);
      }
      console.log('PASS incoming render failure leaves either the intact old project or a cleared workspace, never mixed PDF/read/export ownership');
      await context.close();
    }
    {
      const {context,page} = await contextFor(browser);
      const canceledOpen=await page.evaluate(async ({data,name}) => {
        const file=new File([new Uint8Array(data)],name,{type:'application/pdf'});
        const ready=await SmartMatchReadTest.beforeAnalyze(file);
        const released=await SmartMatchReadTest.discardPreparedOpen(file);
        return {ready,released};
      },{data:[...a.bytes],name:'discarded-A.pdf'});
      assert.deepEqual(canceledOpen,{ready:true,released:true});
      const canceled = await state(page);
      assert.equal(canceled.hasPdf,false);assert.equal(canceled.project,null);assert.deepEqual(canceled.bytes,[]);
      assert.equal(canceled.calls.pdfJs,1);assert.equal(canceled.calls.destroyed,1,'canceled opening destroys its unused staged document');
      console.log('PASS abandoned prepared-file handoff rolls back candidate read data and releases its staged PDF.js document');
      await context.close();
    }
    {
      const {context,page} = await contextFor(browser);
      await page.evaluate(() => {
        const load=PDFLib.PDFDocument.load;
        let pause=true;
        PDFLib.PDFDocument.load=async function(...args) {
          if(pause) { pause=false; await new Promise(resolve=>{window.__releaseOlderOpen=resolve;}); }
          return load.apply(this,args);
        };
      });
      const older = open(page,a);
      await page.waitForFunction(() => typeof __releaseOlderOpen === 'function');
      assert.equal((await open(page,b)).opened,false,'another file cannot overlap an opening that still owns the project state');
      await page.evaluate(() => __releaseOlderOpen());
      assert.equal((await older).opened,true,'the accepted opening can finish normally');
      const actual = await state(page);
      assert.deepEqual(actual.codes,['GS71','GS71']);assert(Buffer.from(actual.bytes).equals(a.bytes),'accepted first opening owns its source bytes');
      assert.deepEqual(Object.values(actual.project.cards).map(card=>card.code),['GS71']);
      assert.equal(actual.calls.workers,0);assert.equal(actual.calls.search,0);assert.equal(actual.calls.work,0);
      assert.equal(actual.calls.destroyed,0,'the active document remains usable');
      assert.equal((await open(page,b)).opened,true,'the other project can be explicitly opened once the first operation is complete');
      const replacement=await state(page);
      assert.deepEqual(replacement.codes,['GS82','GS82','GS82']);assert(Buffer.from(replacement.bytes).equals(b.bytes),'replacement opening owns its source bytes');
      assert.deepEqual(Object.values(replacement.project.cards).map(card=>card.code),['GS82']);
      console.log('PASS overlapping opens serialize ownership; a later explicit open replaces source bytes and saved card data together');
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
