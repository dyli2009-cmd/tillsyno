const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),http=require('node:http'),os=require('node:os');
const {PDFDocument,StandardFonts,rgb}=require('../vendor/pdf-lib.min.js');
const root=path.resolve(__dirname,'..'),old=fs.readFileSync(path.join(root,'smartmatch-slr-test-main-v36-132.js'),'utf8'),current=fs.readFileSync(path.join(root,'smartmatch-slr-test-main-v36-133.js'),'utf8');
function fn(source,name,async=false){const start=source.indexOf((async?'async ':'')+'function '+name+'(');assert(start>=0,name);return source.slice(start,source.indexOf('\n}',start)+2);}
const oldIndex=fn(old,'smartIndexDoorCardsFirst',true),newIndex=fn(current,'smartIndexDoorCardsFirst',true);
assert.equal(current.replace(newIndex,oldIndex).replace("const SMARTMATCH_RELEASE='36.133-SLR-TEST';","const SMARTMATCH_RELEASE='36.132-SLR-TEST';"),old,'every existing function and rule outside the additive hook is byte-identical');
const readerNames=['groupLines','labHeaderRows','smartNormalizeCardLabel','smartRowDoorCode','smartTableCardIdentity','smartFirstCardIdentity'];
const context=vm.createContext({window:{addEventListener(){}},document:{currentScript:{src:'https://example.test/smartmatch-beslagskod-v36-133.js'}},URL,console,isAdministrativeWorkLine:()=>false,isGsWorkLine:()=>false});
vm.runInContext(readerNames.map(name=>fn(current,name)).join('\n'),context);
vm.runInContext(fs.readFileSync(path.join(root,'smartmatch-table-layouts-v36-94.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'smartmatch-beslagskod-v36-133.js'),'utf8'),context);
const profile=context.window.SmartMatchBeslagskodProfile,normalize=context.smartNormalizeCardLabel;
for(const [line,want]of [['Beslagskod: WC','WC'],['Beslagskod: GS10','GS10'],['Beslagskod:GS 10','GS10'],['BESLAGSKOD HVC','HVC'],['Beslagskod: 130C','130C']])assert.equal(profile.parseHeader(line,normalize),want);
for(const line of ['WC','Rumstyp: WC','Nummer: GS-001','Great Security (GS)','Beslagskod:','Beslagskod: GS1 GS2','Beslagskod: WC GS10'])assert.equal(profile.parseHeader(line,normalize),'',line);
for(const fixture of JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/snidaren-card-headers-v36-87.json'))))assert.equal(context.smartFirstCardIdentity({items:fixture.items},842)?.code,fixture.expected,'existing verified card '+fixture.page);
console.log('PASS unchanged readers and 15 previous cards; only the complete Beslagskod header supplies the additional ID');
if(!process.argv[2])process.exit(0);
const input=fs.readFileSync(process.argv[2]),qa=process.env.SMARTMATCH_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'smartmatch-card133-'));
fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,''),file=path.resolve(root,name||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
async function combined(code,cardBytes){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),p=doc.addPage([595,842]);
 p.drawText('Planritning',{x:70,y:780,size:16,font});p.drawText(code,{x:130,y:550,size:14,font});p.drawText('GS001',{x:390,y:350,size:14,font});
 const card=await PDFDocument.load(cardBytes);for(const page of await doc.copyPages(card,[0]))doc.addPage(page);return Buffer.from(await doc.save());
}
async function headerVariant(png){
 const doc=await PDFDocument.load(input),p=doc.getPage(0),image=await doc.embedPng(png);
 p.drawRectangle({x:135,y:1684-123,width:225,height:24,color:rgb(1,1,1)});
 p.drawImage(image,{x:137,y:1684-121,width:220,height:20});return Buffer.from(await doc.save());
}
async function legacyFixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),p=doc.addPage([595,842]);
 p.drawText('Planritning',{x:70,y:800,size:16,font});
 for(const [i,code]of ['WC','140C','GS2'].entries()){
  p.drawText(code,{x:120+i*120,y:560,size:14,font});const card=doc.addPage([595,842]);
  for(const [label,x,y,size]of [['Dorrkort '+code,78,750,18],['Objekt: X',78,723,10],['Komponent',104,700,10],['Produkt',284,700,10],['Dorrautomatik',104,682,10],['ED100',284,682,10]])card.drawText(label,{x,y,size,font});
 }
 return Buffer.from(await doc.save());
}
(async()=>{
 const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
 for(const device of [{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true},{name:'ipad',width:1024,height:1366,touch:true}]){
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:process.env.SMARTMATCH_BROWSER_ARGS?JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS):['--no-sandbox']});
  try{
   const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch}),page=await ctx.newPage(),errors=[],network=[];
   await ctx.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))network.push(r.url());});
   await page.goto('http://127.0.0.1:'+server.address().port+'/smartmatch-slr-test.html');
   await page.evaluate(async()=>{await navigator.serviceWorker.register('sw.js?v=2.4.361');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
   const open=async(bytes,name)=>{await page.locator('#pwFile').setInputFiles({name,mimeType:'application/pdf',buffer:Buffer.from(bytes)});await page.waitForFunction(()=>document.getElementById('pwState')?.textContent.includes('36.133-SLR-TEST:')&&!document.getElementById('pwLoadDialog')?.open,null,{timeout:90000});return page.evaluate(()=>({index:SmartMatchAppBridge.getDoorCardIndex(),cards:SmartMatchAppBridge.getDoorCardPages(),positions:SmartMatchAppBridge.getPositions().map(p=>({code:p.code,page:p.page}))}));};
   const standalone=await open(input,'supplied-card.pdf');assert.deepEqual(standalone.index,{WC:[1]});assert.deepEqual(standalone.cards,[1]);assert.equal(standalone.positions.length,0,'a card alone never invents drawing positions');
   const wc=await open(await combined('WC',input),'wc-plan.pdf');assert.deepEqual(wc.index,{WC:[2]});assert(wc.positions.some(p=>p.code==='WC'&&p.page===1));assert(wc.positions.every(p=>p.page===1));assert(!wc.index.GS001,'footer and responsibility GS do not supply the card ID');
   const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=880;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,880,80);ctx.fillStyle='black';ctx.font='bold 50px Arial';ctx.fillText('Beslagskod: GS10',3,59);return c.toDataURL('image/png').split(',')[1];});
   const gsCard=await headerVariant(Buffer.from(png,'base64')),gs=await open(await combined('GS10',gsCard),'gs10-plan.pdf');
   assert.deepEqual(gs.index,{GS10:[2]},'new image header wins over native Rumstyp WC and footer GS001');assert(gs.positions.some(p=>p.code==='GS10'&&p.page===1));assert(gs.positions.every(p=>p.page===1));
   // The same additional-card reader works offline after its local assets load.
   await ctx.setOffline(true);
   const offline=await open(await combined('WC',input),'wc-offline.pdf');assert.deepEqual(offline.index,{WC:[2]});
   await ctx.setOffline(false);
   await page.evaluate(()=>{const original=window.SmartMatchBeslagskodProfile;window.additionalCardCalls=0;window.SmartMatchBeslagskodProfile={...original,identifyPage(...args){window.additionalCardCalls++;return original.identifyPage(...args);}};});
   const legacy=await open(await legacyFixture(),'previous-formats.pdf');assert.deepEqual(legacy.index,{WC:[2],'140C':[3],GS2:[4]});
   assert.equal(await page.evaluate(()=>window.additionalCardCalls),0,'the added reader never handles already recognized cards');
   for(const code of ['WC','140C','GS2'])assert(legacy.positions.some(p=>p.code===code&&p.page===1),'previous drawing match '+code);
   assert.deepEqual(network,[],'no PDF images or OCR models leave the app origin');
   assert.deepEqual(errors,[]);await page.screenshot({path:path.join(qa,device.name+'.png')});await ctx.close();
   console.log('PASS '+device.name+': real raster header WC, raster GS10 despite native WC/footer GS001, matching to drawing, standalone-card behavior and offline local OCR');
  }finally{await browser.close();}
 }
 }finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
