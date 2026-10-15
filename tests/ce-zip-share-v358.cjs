'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const parts=new URL(req.url,'http://localhost').pathname.split('/'),before=parts[1]==='before',name='/'+parts.slice(2).join('/');
 if(name==='/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({userId:'zip-share-test',role:'member',modules:['control']}),permitted:()=>true}");}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(before&&['/ce-file-export-v312.js','/ce-markning-v1-2-module.js'].includes(name)?execFileSync('git',['show','HEAD:'+name.slice(1)],{cwd:root}):fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}
});
let browser,origin;const errors=[];
async function fixture(route){
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,serviceWorkers:'block'});
 await context.addInitScript(()=>localStorage.setItem('tillsyno-ui-appearance-v1',JSON.stringify({theme:'mist',device:'desktop'})));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/'+route+'/ce-markning.html');
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-ce-starting'));
 await page.evaluate(async()=>{
  document.getElementById('ceProjectHome').hidden=true;document.getElementById('ceWorkspace').hidden=false;document.body.classList.remove('ceProjectPickerOpen');
  const api=TillsynoCETest;api.reset();const templates={},names={};
  for(const {category}of api.getFileExportTypes()){
   const pdf=await PDFLib.PDFDocument.create(),p=pdf.addPage([595,842]);p.drawText('ZIP TEST DOCUMENT',{x:40,y:790,size:18});
   pdf.getForm().createTextField('Maskin ID').addToPage(p,{x:40,y:710,width:450,height:30});pdf.getForm().createTextField('Kommentar').addToPage(p,{x:40,y:650,width:450,height:30});
   templates[category]=await pdf.save();names[category]=category+'.pdf';
  }
  const door={id:'share-door',objectNo:'20-01-54-28',modelCode:'24',serialNumber:'1',sourceText:'20-01-54-28-24-1',location:'Entré',model:'ED100',manufacturer:'Dorma',type:'glass'};
  api.restoreAssets({templates,names,productFiles:{[door.id]:{bytes:templates.Produktlista.slice(),name:'Produktlista.pdf',format:'manual-ce-v7',designation:door.sourceText}}});await api.loadTemplates();
  const canvas=document.createElement('canvas');canvas.width=200;canvas.height=60;const pen=canvas.getContext('2d');pen.beginPath();pen.moveTo(10,40);pen.lineTo(170,20);pen.stroke();api.setProjectSignature(canvas.toDataURL());
  api.payload().answers[door.id]={};
  api.payload().answers[door.id].Loggbok={fields:{Kommentar:'Samma innehåll i sparad och delad ZIP'}};
  api.payload().completedDoors[door.id]=true;
  window.shareFixture={door,meta:{projectName:'ZIP-test',objectNo:door.objectNo},getItems:()=>[door],getProjectMeta:()=>shareFixture.meta,save(){},redraw(){}};
  TillsynoCEFileExport.open(shareFixture);
 });
 for(const input of await page.locator('#ceFilesTypes input').all())await input.uncheck();await page.locator('#ceFilesTypes input[value="Loggbok"]').check();await page.locator('#ceFilesBuild').click();await page.waitForFunction(()=>!document.getElementById('ceFilesShare').disabled);
 return {page,context};
}
async function mock(page,mode){
 await page.evaluate(mode=>{
  window.shareCalls=[];
  Object.defineProperty(navigator,'canShare',{configurable:true,value:mode==='missing-probe'?undefined:()=>{if(mode==='probe-throws')throw new TypeError('ZIP capability rejected');return mode!=='unsupported';}});
  Object.defineProperty(navigator,'share',{configurable:true,value:mode==='missing-share'?undefined:data=>{
   window.shareCalls.push({active:navigator.userActivation.isActive,name:data.files?.[0]?.name,type:data.files?.[0]?.type,size:data.files?.[0]?.size});
   if(mode==='sync-throw')throw new DOMException('Permission denied','NotAllowedError');
   if(mode==='reject')return Promise.reject(new DOMException('Permission denied','NotAllowedError'));
   if(mode==='reject-late')return new Promise((_,reject)=>setTimeout(()=>reject(new DOMException('Permission denied after OS prompt','NotAllowedError')),6000));
   if(mode==='abort')return Promise.reject(new DOMException('User cancelled','AbortError'));
   if(mode==='pending')return new Promise(resolve=>window.finishShare=resolve);
   return Promise.resolve();
  }});
 },mode);
}
async function download(page,selector){const next=page.waitForEvent('download');await page.locator(selector).click();const file=await next;return {name:file.suggestedFilename(),bytes:fs.readFileSync(await file.path())};}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  if(process.env.CE_REPRODUCE_PREVIOUS==='1'){
   const {page,context}=await fixture('before');let count=0;page.on('download',()=>count++);await mock(page,'reject');await page.locator('#ceFilesShare').click();await page.waitForFunction(()=>document.getElementById('ceFilesStatus').textContent.includes('Kunde inte dela ZIP'));
   assert.equal(count,0);assert.equal(await page.locator('#ceFilesDownload').isEnabled(),true);console.log('REPRODUCED previous bug: share capability true, share rejected, completed ZIP exists but no download fallback.');await context.close();
  }
  const {page,context}=await fixture('after'),saved=await download(page,'#ceFilesDownload');let downloadCount=0;page.on('download',()=>downloadCount++);
  for(const mode of ['reject','reject-late','sync-throw','unsupported','probe-throws','missing-share']){
   await mock(page,mode);const fallback=await download(page,'#ceFilesShare');assert.equal(fallback.name,saved.name,mode);assert(fallback.bytes.equals(saved.bytes),mode+' preserves original ZIP bytes');assert.match(await page.locator('#ceFilesStatus').innerText(),/Hämtade filer/);assert.equal(await page.locator('#ceFilesShare').isEnabled(),true);
   const calls=await page.evaluate(()=>shareCalls);if(['reject','reject-late','sync-throw'].includes(mode)){assert.equal(calls.length,1);assert(calls[0].active);}else assert.equal(calls.length,0);
  }
  for(const mode of ['success','missing-probe','abort']){
   await mock(page,mode);const before=downloadCount;await page.locator('#ceFilesShare').click();await page.waitForFunction(()=>!document.getElementById('ceFilesShare').disabled);
   assert.equal(downloadCount,before,mode+' must not download');const calls=await page.evaluate(()=>shareCalls);assert.equal(calls.length,1);assert(calls[0].active);assert.equal(calls[0].name,saved.name);assert.equal(calls[0].type,'application/zip');assert.equal(calls[0].size,saved.bytes.length);
   assert.match(await page.locator('#ceFilesStatus').innerText(),mode==='abort'?/avbröts.*finns kvar/:/lämnad till delningsmenyn/);
  }
  await mock(page,'pending');await page.locator('#ceFilesShare').click();assert(await page.locator('#ceFilesShare').isDisabled());await page.evaluate(()=>document.getElementById('ceFilesShare').onclick());assert.equal(await page.evaluate(()=>shareCalls.length),1);await page.evaluate(()=>finishShare());await page.waitForFunction(()=>!document.getElementById('ceFilesShare').disabled);
  // The full seven-folder package uses the same recovery, through its real button.
  await page.evaluate(()=>TillsynoCETest.openExport(shareFixture));await page.locator('#slrExportBuild').click();await page.waitForFunction(()=>!document.getElementById('slrExportShare').disabled||document.getElementById('slrExportStatus').textContent.includes('Kunde inte skapa ZIP'));
  assert.equal(await page.locator('#slrExportShare').isEnabled(),true,await page.locator('#slrExportStatus').innerText());
  const complete=await download(page,'#slrExportDownload');await mock(page,'reject');const fallback=await download(page,'#slrExportShare');assert.equal(fallback.name,complete.name);assert(fallback.bytes.equals(complete.bytes));assert.match(await page.locator('#slrExportStatus').innerText(),/Hämtade filer/);
  const files=await page.evaluate(async base64=>Object.values((await JSZip.loadAsync(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)))).files).filter(f=>!f.dir).map(f=>f.name),complete.bytes.toString('base64'));assert.equal(files.length,7);
  await mock(page,'abort');const count=downloadCount;await page.locator('#slrExportShare').click();await page.waitForFunction(()=>!document.getElementById('slrExportShare').disabled);assert.equal(downloadCount,count);assert.match(await page.locator('#slrExportStatus').innerText(),/avbröts.*finns kvar/);
  assert.deepEqual(errors,[]);await context.close();console.log('PASS ZIP sharing: actual rendered PDFs, byte-identical fallback ZIPs, rejected/throwing/missing APIs, capability mismatch, cancellation without download, synchronous user activation, duplicate-click guard, successful sharing, and real complete seven-folder package.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
