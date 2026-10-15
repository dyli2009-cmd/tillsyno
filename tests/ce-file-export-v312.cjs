/* Actual CE renderer, ZIP bytes, and inline UI. NODE_PATH=$CODEX_PRIMARY_RUNTIME_NODE_MODULES node tests/ce-file-export-v312.cjs */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({userId:'ce-export-test',role:'member',modules:['control']}),permitted:()=>true}");}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.pdf')?'application/pdf':'text/html');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:1000},acceptDownloads:true,serviceWorkers:'allow'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/ce-markning.html');
  await page.waitForFunction(()=>window.TillsynoCEFileExport&&window.TillsynoCETest);
  await page.evaluate(()=>{document.getElementById('ceProjectHome').hidden=true;document.getElementById('ceWorkspace').hidden=false;});
  await page.locator('#ceDocumentActions').evaluate(e=>e.open=true);
  await page.locator('#ceExportFiles').click();
  assert.equal(await page.locator('#ceFileExport').isVisible(),true);
  assert.equal(await page.locator('#ceFilesBuild').isDisabled(),true);
  await page.locator('#ceFilesClose').click();
  await page.evaluate(async()=>{
   const api=window.TillsynoCETest;api.reset();
   const templates={},names={};
   for(const [cat,title] of [['Loggbok','LOG BOOK'],['Tillverkarens försäkran','DECLARATION'],['Egenkontroll','SELF CHECK']]){
    const pdf=await PDFLib.PDFDocument.create(),p=pdf.addPage([595,842]),form=pdf.getForm();p.drawText(title,{x:40,y:790,size:18});
    for(const [index,key]of ['Maskin ID','Plats i byggnaden','Kommentar'].entries())form.createTextField(key).addToPage(p,{x:40,y:700-index*70,width:460,height:30});
    if(cat==='Egenkontroll'){form.createCheckBox('10.5.4').addToPage(p,{x:40,y:430,width:20,height:20});form.createTextField('10.5.4 Signatur').addToPage(p,{x:110,y:415,width:210,height:40});}
    templates[cat]=await pdf.save();names[cat]=cat+'.pdf';
   }
   api.restoreAssets({templates,names});await api.loadTemplates();
   const canvas=document.createElement('canvas');canvas.width=240;canvas.height=60;const pen=canvas.getContext('2d');pen.strokeStyle='#3b82c4';pen.lineWidth=3;pen.beginPath();pen.moveTo(8,42);pen.bezierCurveTo(60,5,70,60,110,20);pen.lineTo(185,39);pen.stroke();api.setProjectSignature(canvas.toDataURL());
   const doors=Array.from({length:10},(_,index)=>({id:'door-'+index,objectNo:'57617-14',modelCode:'24',serialNumber:String(index+1),location:'Door '+(index+1),model:'ED100',manufacturer:'Dorma',type:'glass'}));
   const data=api.payload();for(const door of doors)data.answers[door.id]={Loggbok:{fields:{Kommentar:'Log '+door.serialNumber}},'Tillverkarens försäkran':{fields:{Kommentar:'EG '+door.serialNumber}},Egenkontroll:{fields:{Kommentar:'Check '+door.serialNumber,'10.5.4':true}}};
   const meta={projectName:'Testplats',objectNo:'57617-14'};
   window.ceFixture={doors,meta,bridge:{getItems:()=>doors,getProjectMeta:()=>meta,save(){},redraw(){}}};
   window.TillsynoCEFileExport.open(ceFixture.bridge);
  });
  assert.match(await page.locator('#ceFilesCount').innerText(),/30 filer/);
  assert.equal(await page.locator('dialog[open]').count(),0,'new export is inline');
  for(const width of [390,768,1366]){
   await page.setViewportSize({width,height:1000});
   assert(await page.locator('#ceFileExport').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'no horizontal overflow at '+width);
   assert(await page.locator('#ceFilesTypes input').first().evaluate(e=>e.getBoundingClientRect().width)>=20);
  }
  await page.locator('#ceFilesBuild').click();
  await page.waitForFunction(()=>!document.getElementById('ceFilesDownload').disabled);
  const event=page.waitForEvent('download');await page.locator('#ceFilesDownload').click();const downloaded=await event;
  const buffer=fs.readFileSync(await downloaded.path());
  const contents=await page.evaluate(async base64=>{
   const zip=await JSZip.loadAsync(Uint8Array.from(atob(base64),c=>c.charCodeAt(0))),files=[];
   for(const entry of Object.values(zip.files)){
    if(entry.dir)throw Error('Unexpected directory '+entry.name);
    const bytes=await entry.async('uint8array'),doc=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
    const text=(await(await doc.getPage(1)).getTextContent()).items.map(i=>i.str).join(' ');await doc.destroy();
    const pdf=await PDFLib.PDFDocument.load(bytes);if(pdf.getForm().getFields().length)throw Error('Expected same static output as individual save');
    files.push({name:entry.name,text});
   }
   return files;
  },buffer.toString('base64'));
  assert.equal(contents.length,30);
  for(let n=1;n<=10;n++)for(const [prefix,content]of [['Loggbok','Log'],['EG-försäkran','EG'],['Egenkontroll','Check']]){
   const file=contents.find(f=>f.name===prefix+'-57617-14-24-'+n+'.pdf');assert(file,file?.name);assert(file.text.includes('57617-14-24-'+n));assert(file.text.includes(content+' '+n));assert(!file.name.includes('/'));
  }
  await page.locator('#ceFilesNone').click();assert(await page.locator('#ceFilesBuild').isDisabled());
  await page.locator('#ceFilesDoors input').nth(1).check();await page.locator('#ceFilesDoors input').nth(7).check();
  await page.locator('#ceFilesTypes input[value="Tillverkarens försäkran"]').uncheck();await page.locator('#ceFilesTypes input[value="Egenkontroll"]').uncheck();
  await page.locator('#ceFilesBuild').click();await page.waitForFunction(()=>!document.getElementById('ceFilesDownload').disabled);
  assert.match(await page.locator('#ceFilesStatus').innerText(),/2 filer/);
  await page.evaluate(()=>ceFixture.meta.projectName='Changed project');
  await page.locator('#ceFilesDownload').click();assert(await page.locator('#ceFilesDownload').isDisabled());assert.match(await page.locator('#ceFilesStatus').innerText(),/Projektet har ändrats/);
  await page.locator('#ceFilesTypes input[value="Riskanalys"]').check();await page.locator('#ceFilesBuild').click();await page.waitForFunction(()=>document.getElementById('ceFilesStatus').textContent.includes('Kunde inte skapa'));
  assert(await page.locator('#ceFilesDownload').isDisabled());assert.match(await page.locator('#ceFilesStatus').innerText(),/Riskanalys saknas/);
  const checks=await page.evaluate(async()=>{
   const api=TillsynoCETest,{doors,bridge,meta}=ceFixture;
   const expect=async(fn,part)=>{try{await fn();throw Error('Expected rejection '+part);}catch(e){if(!e.message.includes(part))throw e;}};
   api.setProjectSignature('');
   await expect(()=>api.buildFileArchive([doors[0]],['Egenkontroll'],bridge),'Signatur saknas');
   const partial=await api.buildFileArchive([doors[0]],['Loggbok'],bridge);if(partial.files!==1)throw Error('Unrelated signature blocked logbook');
   await expect(()=>api.buildFileArchive([doors[0]],[],bridge),'Välj minst ett dokument');
   await expect(()=>api.buildFileArchive([],['Loggbok'],bridge),'Välj minst en dörr');
   await expect(()=>api.buildFileArchive([doors[0]],['Loggbok'],bridge,()=>{meta.projectName='Mutation';}),'Projektet ändrades');
   doors[1].serialNumber=doors[0].serialNumber;
   const collision=await api.buildFileArchive(doors.slice(0,2),['Loggbok'],bridge),zip=await JSZip.loadAsync(collision.bytes);
   if(Object.keys(zip.files).length!==2||!Object.keys(zip.files).some(name=>name.includes('(2)')))throw Error('Colliding filenames overwrote a door');
   api.payload().answers[doors[0].id].Egenkontroll.fields={};
   await expect(()=>api.buildFolderArchive([doors[0]],bridge),'inte klar');
   return true;
  });assert(checks);
  if(process.env.CE_EXPORT_QA){fs.mkdirSync(process.env.CE_EXPORT_QA,{recursive:true});fs.writeFileSync(path.join(process.env.CE_EXPORT_QA,'selected.zip'),buffer);await page.setViewportSize({width:390,height:1000});await page.locator('#ceFileExport').screenshot({path:path.join(process.env.CE_EXPORT_QA,'phone.png')});}
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await context.setOffline(true);
  assert.equal(await page.evaluate(async()=>{const result=await TillsynoCETest.buildFileArchive([ceFixture.doors[0]],['Loggbok'],ceFixture.bridge);return result.files;}),1);
  await page.reload();await page.waitForFunction(()=>!!window.TillsynoCEFileExport&&!!window.TillsynoCETest?.buildFileArchive);
  await context.setOffline(false);
  assert.deepEqual(errors,[]);
  await context.close();console.log('PASS CE file ZIP: 10×3=30 flat PDFs, door-specific content, subset, missing document/signature, stale project/download, collision protection, unchanged full-package approval, inline responsive UI.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
