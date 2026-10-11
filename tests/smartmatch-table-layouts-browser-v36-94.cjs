// Optional integration test: pass the reference six-page PDF as a local CLI argument.
// The PDF is never committed or sent to an external server.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch{playwright=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const root=path.resolve(__dirname,'..'),deps=path.join(root,'scratch/browser92');
const aliases={'/vendor/pdf.min.js':'pdf-runtime.cjs','/vendor/pdf.worker.min.js':'pdf.worker.cjs','/vendor/pdf-lib.min.js':'pdf-lib-runtime.cjs'};
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let f=path.join(root,aliases[p]||p);
 if(!fs.existsSync(f))f=path.join(root,p);
 if(!fs.existsSync(f))f=path.join(deps,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',/\.(js|cjs)$/.test(f)?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');
 res.end(fs.readFileSync(f));
});

(async()=>{
 assert.ok(process.argv[2],'Usage: node tests/smartmatch-table-layouts-browser-v36-94.cjs <local reference PDF>');
 const lib=require(path.join(root,fs.existsSync(path.join(root,'vendor/pdf-lib.min.js'))?'vendor/pdf-lib.min.js':'pdf-lib-runtime.cjs'));
 const input=await lib.PDFDocument.load(fs.readFileSync(process.argv[2]));assert.equal(input.getPageCount(),6);
 const cards=await lib.PDFDocument.create();for(const page of await cards.copyPages(input,[1,2,3,4,5]))cards.addPage(page);
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'smartmatch-layout94-')),cardFile=path.join(temporary,'cards-only.pdf');
 fs.writeFileSync(cardFile,await cards.save());
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await playwright.chromium.launch({executablePath:process.env.SMARTMATCH_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[];
 async function load(file){
  const page=await browser.newPage({viewport:{width:1300,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/project-workspace-smartmatch-test.html');assert.match(await page.locator('#pwBuildVersion').innerText(),/^TEST v36\.94/);
  await page.locator('#pwFile').setInputFiles(file);
  await page.waitForFunction(()=>document.querySelector('#pwState')?.textContent?.includes('SmartMatch TEST v36.94:')&&document.querySelector('#pwLoadDialog')?.open!==true,null,{timeout:120000});
  return page;
 }
 try{
  const cardPage=await load(cardFile);
  const standalone=await cardPage.evaluate(()=>({index:window.SmartMatchAppBridge.getDoorCardIndex(),positions:window.SmartMatchAppBridge.getPositions().length}));
  assert.deepEqual(standalone.index,{'140C':[1],VC:[2],WC:[3],HWC:[4],'130C':[5]});assert.equal(standalone.positions,0);await cardPage.close();
  console.log('Five supplied cards are identified without any drawing; no drawing positions are invented.');
  const page=await load(process.argv[2]);
  const actual=await page.evaluate(()=>({index:window.SmartMatchAppBridge.getDoorCardIndex(),cards:window.SmartMatchAppBridge.getDoorCardPages(),positions:window.SmartMatchAppBridge.getPositions().map(o=>({code:o.code,page:o.page,id:o.id}))}));
  assert.deepEqual(actual.index,{'140C':[2],VC:[3],WC:[4],HWC:[5],'130C':[6]});assert.deepEqual(actual.cards,[2,3,4,5,6]);assert.equal(actual.positions.length,14);
  const count={};for(const p of actual.positions){assert.equal(p.page,1);count[p.code]=(count[p.code]||0)+1}
  assert.deepEqual(count,{'140C':7,VC:2,WC:1,HWC:2,'130C':2});assert.ok(!actual.index.KONTOR&&!actual.index.TEKNIK);
  assert.equal(new Set(actual.positions.map(p=>p.id)).size,14);assert.equal(await page.locator('.pwStampHit').count(),14);
  for(const [code,pages]of Object.entries(actual.index)){
   const index=actual.positions.findIndex(p=>p.code===code);await page.locator('.pwStampHit').nth(index).click();
   await page.waitForFunction(()=>document.querySelector('#pwProtocol')?.open);
   assert.equal(await page.locator('#pwProtocolCode').innerText(),code);assert.match(await page.locator('#pwProtocolPosition').innerText(),new RegExp('protokollsida '+pages[0]));
   await page.locator('#pwProtocolClose').click();
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('All 14 independent buttons and all five correct original card pages verified. Kontor/Teknik remain unlinked because their cards are absent.');
 }finally{await browser.close();server.close();fs.rmSync(temporary,{recursive:true,force:true})}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
