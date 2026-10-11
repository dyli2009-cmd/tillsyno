const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch{playwright=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const {chromium}=playwright;
const lib=require(path.resolve(fs.existsSync('vendor/pdf-lib.min.js')?'vendor/pdf-lib.min.js':'pdf-lib-runtime.cjs'));
const root=process.cwd(),deps=root+'/scratch/browser92';
const aliases={'/project-workspace-smartmatch-test.html':'project-workspace-smartmatch-v36-93.html','/vendor/pdf.min.js':'pdf-runtime.cjs','/vendor/pdf.worker.min.js':'pdf.worker.cjs','/vendor/pdf-lib.min.js':'pdf-lib-runtime.cjs'};
const server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let f=path.join(root,aliases[p]||p);if(!fs.existsSync(f))f=path.join(deps,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return}res.setHeader('Content-Type',/\.(js|cjs)$/.test(f)?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(f))});
(async()=>{
 const input=process.argv[2],card=await lib.PDFDocument.load(fs.readFileSync(input));
 const doc=await lib.PDFDocument.create(),drawing=doc.addPage([595,842]),font=await doc.embedFont(lib.StandardFonts.Helvetica);
 for(const [text,x,y,size]of [['Teknik',70,600,16],['Teknik',280,500,16],['Teknikrum',70,400,16],['STeknik',280,400,16],['SKALA 1:100',70,100,10],['RITAD/KONSTR. AV',70,80,10]])drawing.drawText(text,{x,y,size,font});
 const [cp]=await doc.copyPages(card,[0]);doc.addPage(cp);fs.writeFileSync('/tmp/card93-combined.pdf',await doc.save());
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.SMARTMATCH_CHROMIUM||fs.existsSync('/usr/bin/chromium')?{executablePath:process.env.SMARTMATCH_CHROMIUM||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
 try{
  for(const file of [input,'/tmp/card93-combined.pdf']){
   const page=await browser.newPage({viewport:{width:1300,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'/project-workspace-smartmatch-test.html');await page.locator('#pwFile').setInputFiles(file);
   await page.waitForFunction(()=>window.SmartMatchAppBridge?.getDoorCardIndex?.().TEKNIK?.length&&document.querySelector('#pwState')?.textContent?.includes('SmartMatch TEST v36.93:'),null,{timeout:120000});
   const actual=await page.evaluate(()=>({index:window.SmartMatchAppBridge.getDoorCardIndex(),cards:window.SmartMatchAppBridge.getDoorCardPages(),positions:window.SmartMatchAppBridge.getPositions().map(o=>({code:o.code,page:o.page,id:o.id})),state:document.querySelector('#pwState').textContent}));
   if(file===input){assert.deepEqual(actual.index,{TEKNIK:[1]});assert.equal(actual.positions.length,0);console.log('Actual uploaded card-only PDF: TEKNIK identified.');}
   else{assert.deepEqual(actual.index,{TEKNIK:[2]});assert.deepEqual(actual.cards,[2]);assert.equal(actual.positions.length,2);assert.ok(actual.positions.every(p=>p.code==='TEKNIK'&&p.page===1));
    await page.locator('.pwStampHit').first().click();await page.waitForFunction(()=>document.querySelector('#pwProtocol')?.open);assert.equal(await page.locator('#pwProtocolCode').innerText(),'TEKNIK');assert.match(await page.locator('#pwProtocolPosition').innerText(),/protokollsida 2/);
    console.log('Actual app on supplied card + generated drawing: two exact TEKNIK matches, longer names excluded; click opens original card page 2.');}
   assert.equal(errors.length,0,errors.join('\n'));await page.close();
  }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
