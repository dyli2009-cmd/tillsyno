// Independent synthetic PDFs; REAL_SERVICE_PDF optionally exercises a private local example.
// Never commit an uploaded customer PDF or its extracted project data into this repository.
const {chromium}=require('playwright');
const {PDFDocument,PDFName,PDFString,degrees}=require('../vendor/pdf-lib.min.js');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.join(__dirname,'..');
const server=http.createServer((req,res)=>{
 const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 if(p===path.join(root,'auth/client.js')){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:window.testModules||['control']}),permitted:(a,m)=>!m||a.modules.includes(m)};");}
 try{res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));}catch(e){res.writeHead(404);res.end();}
});
async function fixture({rotate=0,company='Service A',customer='Customer B',conflict=false}={}){
 const doc=await PDFDocument.create(),drawing=doc.addPage([900,700]);drawing.setRotation(degrees(rotate));drawing.drawText('Unrelated old company logo');
 const note=(page,contents,subject,x,y,width=140)=>page.node.addAnnot(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'FreeText',Rect:[x,y-3,x+width,y+11],Contents:PDFString.of(contents),Subj:PDFString.of(subject),DA:PDFString.of('/Helv 10 Tf 0 0 0 rg')})));
 const overview=doc.addPage([600,840]);overview.drawText('Egenkontroll dorrautomatik',{x:30,y:800,size:12});overview.drawText('Order nr:',{x:425,y:760,size:10});note(overview,'987654,00','Textruta',425,730,80);
 for(let i=1;i<=4;i++){
  const id='543210-9-24-'+i,markerId=i===3?'543210-18-37-3':id;
  drawing.node.addAnnot(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'FreeText',IT:'FreeTextCallout',Rect:[400,480-i*50,620,500-i*50],CL:[100+i*20,200+i*35,380,490-i*50,400,490-i*50],Contents:PDFString.of(markerId),DA:PDFString.of('/Helv 10 Tf 0 0 1 rg')})));
  const p=doc.addPage([600,840]);
  p.drawText('CHECKLISTA REVISION AV DÖRRAUTOMATIK',{x:30,y:800,size:12});
  const labels=[['Datum:',30,760],['datum:',30,720],['Nästa provning datum:',320,720],['ANLÄGGNING:',30,680],['BESTÄLLARE:',320,680],['Anläggningsnummer:',140,680],['Avtalsnummer:',420,680],['Företag:',30,650],['Företag:',320,650],['Kontaktman på objektet:',30,625],['Kontaktperson:',320,625],['Telefonnummer:',30,600],['Telefonnummer:',320,600],['Adress:',30,575],['Adress:',320,575],['Postnummer:',30,550],['Postadress:',140,550],['Postnummer:',320,550],['Postadress:',420,550],['Id nummer maskin:',30,480],['Ao nummer:',420,480]];
  labels.forEach(([s,x,y])=>p.drawText(s,{x,y,size:10}));
  note(p,'1ggr/år','Datum',90,760);note(p,'2025-03-09','Besökdatum',80,710);note(p,'2026-03-09','Nästa Provning datum',350,710);
  note(p,'765432,00','Anläggningsnummer',145,660,100);note(p,'123456,00','Anläggningsnummer',425,660,100);
  note(p,conflict&&i===4?'Conflicting company':company,'Repeated subject',100,650);note(p,customer,'Repeated subject',380,650);
  note(p,'Service contact','Repeated subject',150,625);note(p,'Customer contact','Repeated subject',390,625);
  note(p,'0300123456','TEL NR',140,600,100);note(p,'0701234567','TEL NR',390,600,100);
  note(p,'Service street 1','Adress',90,575);note(p,'Customer street 2','Adress',370,575);
  note(p,'432 50','Postnummer',40,535,60);note(p,'Service city','Postadress',150,535,130);
  note(p,'432 56','Postnummer',330,535,70);note(p,'Customer city','Postadress',430,535,130);
  note(p,id,'IDnummer',35,455);note(p,'Door '+i,'Placering Dörrlittra',250,455);note(p,'-','Ao nummer',440,455,60);
  note(p,'1.11 Historical sensor remark '+i,'Allmän Info',40,90,480);
  p.drawText('2019-10-29',{x:30,y:20,size:9});
 }
 return Buffer.from(await doc.save());
}
async function legacyFixture(){
 const doc=await PDFDocument.create(),drawing=doc.addPage([1000,800]),p=doc.addPage([600,800]);
 const form=doc.getForm();Object.entries({'Id nummermaskin':'20221-1-24-2','Datum':'2025-03-09','Beställare':'Legacy Customer','Utförande företag':'Legacy Service'}).forEach(([name,value],i)=>{const field=form.createTextField(name);field.setText(value);field.addToPage(p,{x:30,y:730-i*40,width:500,height:25});});
 drawing.node.addAnnot(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[40,700,80,740],A:{S:'GoTo',D:[p.ref,PDFName.of('Fit')]}})));
 drawing.node.addAnnot(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'FreeText',IT:'FreeTextCallout',Rect:[700,600,900,650],CL:[150,250,500,610,700,620],Contents:PDFString.of('20221-1-24-2'),DA:PDFString.of('/Helv 10 Tf')})));
 return Buffer.from(await doc.save());
}
async function choose(page){await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').first().click();await page.locator('input[value="automation"]').check();await page.locator('#allProtocolApply').click();}
async function upload(page,buffer,name='Unseen service job.pdf'){
 await page.evaluate(()=>{const input=document.getElementById('securityFile'),original=input.onchange;input.onchange=async e=>{window.importComplete=false;try{return await original(e);}finally{window.importComplete=true;input.onchange=original;}};});
 await page.locator('#securityFile').setInputFiles({name,mimeType:'application/pdf',buffer});await page.waitForFunction(()=>window.importComplete===true);
 assert.equal(await page.locator('#securityMessage').evaluate(e=>e.classList.contains('error')),false,await page.locator('#securityMessage').innerText());
}
async function downloadWork(page){const event=page.waitForEvent('download');await page.locator('#securityExport').click();await page.locator('#secSaveWork').click();return fs.readFileSync(await (await event).path());}
async function state(page){return page.evaluate(()=>JSON.parse(JSON.stringify({items,project,pages:pdf.numPages})));}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'allow',viewport:{width:820,height:1180},hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  await page.addInitScript(()=>{localStorage.setItem('doorservice-all-in-one:sentinel','keep');localStorage.setItem('tillsyno-revision-test-all-in-one:sentinel','keep-v1');});
  const entry=base+'/controlflow-revision-test/v2/all-in-one.html';
  const bytes=await fixture();await page.goto(entry);await choose(page);await upload(page,bytes);
  let s=await state(page);assert.equal(s.pages,1);assert.equal(s.items.length,4);assert.equal(s.items.filter(o=>o.importReview.status==='matched').length,3);assert.equal(s.items.filter(o=>o.importReview.status==='unmatched').length,1);
  for(const [key,value] of Object.entries({company:'Service A',customer:'Customer B',companyContact:'Service contact',contact:'Customer contact',companyPhone:'0300123456',phone:'0701234567',companyAddress:'Service street 1',address:'Customer street 2',companyPostalCode:'432 50',postalCode:'432 56',companyPostalCity:'Service city',postalCity:'Customer city',facilityNo:'765432',agreement:'123456',order:'987654',date:'2025-03-09',nextDate:'2026-03-09'}))assert.equal(s.project[key],value,key);
  assert.equal(s.project.signature,'');assert.equal(s.project.technician,'');assert.deepEqual(s.project.revisionImport.fieldConflicts,[]);
  assert(s.items.every(o=>Object.keys(o.checks).length===18&&Object.values(o.checks).every(c=>c.result==='')));
  assert(s.items.filter(o=>o.importReview.status==='matched').every(o=>o.previousIssues.length===1));
  assert.equal(await page.evaluate(()=>RevisionCalloutProfile.idFromText('2019-10-29')),'');
  await page.locator('#revisionImportNotice button').click();assert((await page.locator('#revisionImportDialog').innerText()).includes('543210-18-37-3'));await page.getByRole('button',{name:'Stäng',exact:true}).click();
  const pendingFile=await downloadWork(page);await page.reload();await choose(page);await upload(page,pendingFile,'Pending work.pdf');await page.locator('#secOpenContinue').click();
  s=await state(page);assert.equal(s.items.filter(o=>o.importReview.status==='unmatched').length,1);assert.equal(s.project.revisionImport.unlinkedProtocols.length,1);
  const before=s.items.find(o=>o.importReview.status==='unmatched');
  await page.locator('#revisionImportNotice button').click();await page.locator('#revisionImportDialog select').selectOption(s.project.revisionImport.unlinkedProtocols[0].key);await page.getByRole('button',{name:'Koppla valt protokoll',exact:true}).click();
  s=await state(page);const linked=s.items.find(o=>o.uid===before.uid);assert.equal(linked.id,'543210-9-24-3');assert.equal(linked.importReview.drawingId,'543210-18-37-3');assert.equal(linked.importReview.status,'manual');
  for(const k of ['x','y','labelX','labelY','page'])assert.equal(linked[k],before[k],k+' must remain fixed');
  await page.evaluate(()=>securitySessionHistory.undo());await page.waitForFunction(()=>items.some(o=>o.importReview?.status==='unmatched'));
  assert((await page.locator('#revisionImportNotice').innerText()).includes('1 behöver'));
  await page.evaluate(()=>securitySessionHistory.redo());assert((await page.locator('#revisionImportNotice').innerText()).includes('Alla ritningspilar'));
  const readyFile=await downloadWork(page);await page.reload();await choose(page);await upload(page,readyFile,'Confirmed work.pdf');await page.locator('#secOpenContinue').click();
  s=await state(page);assert.equal(s.items.filter(o=>o.importReview.status==='manual').length,1);assert.equal(s.project.company,'Service A');
  assert.equal(await page.locator('[data-ta-version-footer]').count(),1);assert((await page.locator('[data-ta-version-footer]').textContent()).includes('TEST v2'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('doorservice-all-in-one:sentinel')),'keep');assert.equal(await page.evaluate(()=>localStorage.getItem('tillsyno-revision-test-all-in-one:sentinel')),'keep-v1');
  console.log('PASS profile v2: generic text/column fields, 3 exact + 1 unresolved, 18 fresh checks, history, manual resolution, undo/redo and work-PDF round-trip.');
  await page.reload();await choose(page);await upload(page,await fixture({rotate:90,company:'Different company',customer:'Different customer'}),'Different filename.pdf');
  s=await state(page);assert.equal(s.project.company,'Different company');assert.equal(s.project.customer,'Different customer');
  assert(Math.abs(s.items[0].x-(200+35)/700)<1e-9);assert(Math.abs(s.items[0].y-(100+20)/900)<1e-9);
  console.log('PASS rotated drawing, different filename/company and exact transformed arrow tip.');
  await page.reload();await choose(page);await upload(page,await fixture({conflict:true}));s=await state(page);assert.equal(s.project.company,'');assert(s.project.revisionImport.fieldConflicts.includes('company'));
  console.log('PASS conflicting project fields are visible and left empty.');
  const old=await legacyFixture();await page.reload();await choose(page);await upload(page,old);s=await state(page);assert.equal(s.items.length,1);assert.equal(s.items[0].x,.15);assert.equal(s.items[0].y,.6875);assert.equal(s.items[0].importReview,undefined);assert.equal(s.project.company,'Legacy Service');
  console.log('PASS active v2 dispatch preserves locked P/GoTo importer and exact arrow placement.');
  if(process.env.REAL_SERVICE_PDF){
   await page.reload();await choose(page);await upload(page,fs.readFileSync(process.env.REAL_SERVICE_PDF),'Private local example.pdf');s=await state(page);
   const summary={pages:s.pages,objects:s.items.length,matched:s.items.filter(o=>o.importReview?.status==='matched').length,pending:s.items.filter(o=>o.importReview?.status==='unmatched').length,projectFields:Object.entries(s.project).filter(([k,v])=>typeof v==='string'&&v).map(([k])=>k)};
   console.log('PRIVATE FILE summary',JSON.stringify(summary));
   if(process.env.REAL_EXPECTED){const expected=JSON.parse(process.env.REAL_EXPECTED);for(const [k,v] of Object.entries(expected.project||{}))assert.equal(s.project[k],v,k);for(const [k,v] of Object.entries(expected.summary||{}))assert.equal(summary[k],v,k);}
   if(process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.QA_DIR,'revision-v2-private-drawing.png')});await page.locator('#revisionImportNotice button').click();await page.screenshot({path:path.join(process.env.QA_DIR,'revision-v2-private-review.png')});await page.getByRole('button',{name:'Stäng',exact:true}).click();}
  }
  await page.setViewportSize({width:390,height:844});await page.reload();await choose(page);await upload(page,bytes);
  await page.locator('#revisionImportNotice button').click();const box=await page.locator('#revisionImportDialog').boundingBox();assert(box.x>=0&&box.x+box.width<=392);await page.getByRole('button',{name:'Stäng',exact:true}).click();
  console.log('PASS phone 390px: review dialog, native select and actions fit viewport.');
  await page.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.includes('/controlflow-revision-test/sw.js'));
  await context.setOffline(true);await page.reload();await choose(page);await upload(page,bytes);s=await state(page);assert.equal(s.items.length,4);assert.equal(s.project.company,'Service A');
  console.log('PASS v2 offline reload and full text-callout import.');
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
