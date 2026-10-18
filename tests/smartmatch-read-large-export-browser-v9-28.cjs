/* Large OCR metadata and a real, referenced raster stream. No customer data.
 * LARGE_PDF_MB=251 exercises desktop-sized file load/export/write/readback. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Module=require('node:module'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const PDFLib=require('../vendor/pdf-lib.min.js'),reader=require('../smartmatch-read-project-v9-28.js'),oldReader=require('../smartmatch-read-project-v9-7.js');
const {PDFDocument,PDFName,PDFHexString}=PDFLib;
const fixtureFile=path.resolve(__dirname,'smartmatch-read-open-browser-v9-10.cjs'),fixtureModule=new Module(fixtureFile,module);
fixtureModule.filename=fixtureFile;fixtureModule.paths=Module._nodeModulePaths(__dirname);
let fixtureSource=fs.readFileSync(fixtureFile,'utf8').split('(async()=>{await new Promise(resolve=>server.listen')[0].replace("revision='9-10'","revision='9-25'");
fixtureModule._compile(fixtureSource+'\nmodule.exports={server,contextFor,devices,url,fixture,ready,snapshot,assertNoRead,instrument};',fixtureFile);
const {server,contextFor,devices,url,fixture,snapshot,assertNoRead,instrument}=fixtureModule.exports;
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'smartmatch-large-v921-'));
const size=Number(process.env.LARGE_PDF_MB||24),deviceNames=process.env.SMARTMATCH_DEVICE?[process.env.SMARTMATCH_DEVICE]:['desktop','ipad'];
// The shared 90-second helper is sized for the small generated fixture. This
// regression deliberately embeds megabytes of OCR metadata plus a large raster,
// so opening and restoring it gets the same four-minute budget as its export.
async function ready(page,count=74){await page.waitForFunction(expected=>SmartMatchAppBridge.getPdf()&&SmartMatchAppBridge.getPositions().length===expected&&document.getElementById('pwScanOverlay').hidden,count,{timeout:240000});}
async function inputFile(){
 const small=await fixture(),document=await PDFDocument.load(small.bytes),data=reader.read(document,PDFLib).payload;
 const raw='Dörrstängare, karmöverföring, nattlåsning, öppningsknapp ÅÄÖ åäö 😀\n'.repeat(45000);
 data.readTestData.cards['generated-card:2'].rawTable=raw;
 const encoded=PDFHexString.fromText(JSON.stringify(data));
 assert.throws(()=>oldReader.parse(encoded),/stack|Projektinformationen/i,'the previous reader reproduces the reported verifier failure');
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),encoded);
 const width=4096,height=Math.ceil(size*1024*1024/(width*3)),raster=crypto.randomBytes(width*height*3),page=document.addPage([595,842]),ctx=document.context;
 const image=ctx.register(ctx.stream(raster,{Type:'XObject',Subtype:'Image',Width:width,Height:height,ColorSpace:'DeviceRGB',BitsPerComponent:8}));
 page.node.set(PDFName.of('Resources'),ctx.obj({XObject:{LargeImage:image}}));
 page.node.addContentStream(ctx.register(ctx.stream('q 595 0 0 842 0 0 cm /LargeImage Do Q\n')));
 const bytes=await document.save(),file=path.join(folder,'large-prepared.pdf');fs.writeFileSync(file,bytes);
 assert(bytes.length>=size*1024*1024);return {file,size:bytes.length,raw,payload:data,pages:document.getPageCount()};
}
async function track(page){await page.evaluate(()=>{
 const original=SmartMatchReadExportProgress;window.__exportStages=[];
 window.SmartMatchReadExportProgress={...original,start(options){
  const report=original.start(options),wrapped=async(...args)=>{await report(...args);const state=original.snapshot();__exportStages.push({...state,buttonDisabled:document.getElementById('smartExportBuild').disabled});};
  wrapped.fail=report.fail;return wrapped;
 }};
});}
async function installDisk(page,fail=false){await page.evaluate(fail=>{
 let parts=[],position=0,committed=new File(['unchanged original'],'chosen.pdf',{type:'application/pdf'});
 window.__disk={writes:0,closes:0,aborts:0,bytes:0,failed:fail};
 window.showSaveFilePicker=async()=>({name:'chosen.pdf',async createWritable(){return {
  async seek(value){position=value;},async truncate(size){if(position!==size)throw Error('incorrect write length');},
  async write(blob){__disk.writes++;if(fail&&__disk.writes===2)throw Error('generated disk failure');parts.push(blob);position+=blob.size;__disk.bytes=position;},
  async close(){__disk.closes++;committed=new File(parts,'chosen.pdf',{type:'application/pdf'});parts=[];},
  async abort(){__disk.aborts++;parts=[];}
 };},async getFile(){return committed;}});
},fail);}
async function exercise(browser,name,input){
 const context=await contextFor(browser,devices[name]),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(240000);
 page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>console.error('BROWSER PAGE CRASH during large export'));page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('generated disk failure'))console.error('browser:',message.text().slice(0,400));});
 try{
  await page.goto(url());await instrument(page);await page.locator('#pwFile').setInputFiles(input.file);await ready(page);await assertNoRead(page);
  const before=await snapshot(page);assert.equal(before.read.cards['generated-card:2'].rawTable,input.raw);
  await track(page);await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');
  await page.waitForFunction(()=>!document.getElementById('smartExportBuild').disabled,null,{timeout:240000});
  const progress=await page.evaluate(()=>SmartMatchReadExportProgress.snapshot());assert.equal(progress.percent,100);assert.equal(progress.state,'ready');
  assert.match(await page.locator('#smartExportProgressDetail').innerText(),/ännu inte sparats/);
  const stages=await page.evaluate(()=>__exportStages);assert(stages.some(x=>x.percent===3));assert(stages.some(x=>x.percent===69));assert(stages.some(x=>x.percent===88));assert(stages.some(x=>x.percent===98));
  assert(stages.filter(x=>x.percent<100).every(x=>x.buttonDisabled),'file picker cannot be opened before verification finishes');
  for(let i=1;i<stages.length;i++)assert(stages[i].percent>=stages[i-1].percent,'completed preparation work never goes backwards');
  if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v921-save-'+name+'.png'});
  const event=page.waitForEvent('download');await page.locator('#smartExportBuild').click();const download=await event;
  console.log('Download started',new Date().toISOString(),download.suggestedFilename());const saved=path.join(folder,'saved-'+name+'.pdf');let downloadPath;try{downloadPath=await download.path();}catch(error){console.error('Download failure:',await download.failure(),'page closed:',page.isClosed(),'time:',new Date().toISOString());throw error;}fs.copyFileSync(downloadPath,saved);
  const reopened=await PDFDocument.load(fs.readFileSync(saved)),savedData=reader.read(reopened,PDFLib).payload;
  assert.equal(reopened.getPageCount(),input.pages);assert.equal(savedData.readTestData.cards['generated-card:2'].rawTable,input.raw);
  assert.deepEqual(savedData.readTestData,before.read,'full large OCR text, aliases, checks and deferred cards are embedded');
  const raster=reopened.context.enumerateIndirectObjects().filter(([,o])=>o?.dict?.get(PDFName.of('Subtype'))===PDFName.of('Image'));
  assert(raster.length>0,'the referenced original raster image is retained');assert(fs.statSync(saved).size>=size*1024*1024);
  const freshContext=await contextFor(browser,devices[name]),fresh=await freshContext.newPage();fresh.setDefaultTimeout(240000);try{
   await fresh.goto(url());await instrument(fresh);await fresh.locator('#pwFile').setInputFiles(saved);await ready(fresh);await assertNoRead(fresh);
   const after=await snapshot(fresh);assert.deepEqual({...after.read,sourceId:before.read.sourceId},before.read);assert.deepEqual(after.positions,before.positions);
  }finally{await freshContext.close();}
  if(name==='desktop'){
   await installDisk(page);await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>SmartMatchReadExportProgress.snapshot()?.state==='saved',null,{timeout:240000});
   const disk=await page.evaluate(()=>__disk);assert(disk.writes>1);assert.equal(disk.closes,1);assert.equal(disk.aborts,0);assert.equal(disk.bytes,fs.statSync(saved).size);
   const writing=await page.evaluate(()=>__exportStages.filter(x=>x.mode==='writing'));assert(writing.some(x=>x.percent>2&&x.percent<70));assert(writing.some(x=>x.percent>=72&&x.percent<100));
   assert(writing.filter(x=>x.percent===100).every(x=>x.state==='saved'));
   await installDisk(page,true);await page.locator('#smartExportBuild').click();await page.waitForFunction(()=>SmartMatchReadExportProgress.snapshot()?.state==='error');
   const failed=await page.evaluate(()=>__disk);assert.equal(failed.closes,0);assert.equal(failed.aborts,1);assert(await page.locator('#smartExportBuild').isEnabled(),'verified snapshot can be saved again after a disk failure');
  }
  // Reports belonging to a released dialog must never change a later dialog.
  await page.evaluate(()=>{window.__oldReport=SmartMatchReadExportProgress.start({valid:()=>false});});
  await page.locator('#smartExportClose').click();await page.evaluate(async()=>{await __oldReport(99,'STALE','wrong project');});
  assert.equal(await page.evaluate(()=>SmartMatchReadExportProgress.snapshot()),null);
  assert.deepEqual(errors,[]);
  console.log('PASS '+name+': '+(input.size/1024/1024).toFixed(1)+' MB, '+input.pages+' pages, 74 links, '+input.raw.length+' OCR characters; prepare/verify progress, safe disk states, full metadata/image retention and fresh open without OCR/matching');
 }finally{await context.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{const input=await inputFile();browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});for(const name of deviceNames)await exercise(browser,name,input);}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(folder,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
